#!/bin/bash
# pod.sh — the plugin sandbox's pod, run as the sandbox user (harness.md
# "The plugin sandbox"). The bot reaches it only through the socket
# /run/plugin-sandbox.sock, whose root dispatcher runs it as e2e-plugin
# (sandbox/vm/plugin-sandbox-dispatch; bin/plugin-sandbox.js is the
# client); sandbox/vm/setup.sh installs it root-owned. One pod at a time,
# machine-wide.
#
#   up <review>               copy in/<review> to the work dir, start the pod
#   php <review> <args>…      run php inside the app container
#   snapshot <review> <label> file tree hashes and the watched tables → out/
#   logs <review>             DNS, request and PHP error logs → out/
#   down <review>             logs, then remove the pod and the work dir
#   purge <review>            remove out/<review> (after the report is written)
#   status
#
# The pod: app (PHP 8.3, uid 33, every capability dropped), db (Postgres
# with the staged dataset dump), mail (Mailpit), dns (logs every lookup,
# answers none). Ports on the host's loopback: 13000 the app, 13025
# Mailpit's web view. Nothing in the pod reaches past the host's egress
# rule unless `plugin-egress allow` opened it.
set -euo pipefail

ROOT=/srv/plugin-sandbox
IN=$ROOT/in
OUT=$ROOT/out
HOME=$(getent passwd "$(id -un)" | cut -d: -f6)
WORK=$HOME/work
POD=sbx
APP_PORT=13000
MAIL_PORT=13025
PHP_IMAGE=localhost/plugin-sandbox-php
DNS_IMAGE=localhost/plugin-sandbox-dns
DB_IMAGE=docker.io/library/postgres:18
MAIL_IMAGE=docker.io/axllent/mailpit:latest
export HOME XDG_RUNTIME_DIR=/run/user/$(id -u)
export DBUS_SESSION_BUS_ADDRESS=unix:path=$XDG_RUNTIME_DIR/bus
cd "$HOME"
umask 022

die() { echo "pod.sh: $*" >&2; exit 1; }
review_id() {
    [[ ${1:-} =~ ^[a-z0-9][a-z0-9-]{0,62}$ ]] || die "a review id is lowercase letters, digits and dashes"
    echo "$1"
}
COMMON=(--pod "$POD" --cap-drop=all --security-opt=no-new-privileges)

# The watched tables: who may do what, what the site and the journals are
# set to, which plugins hold settings, what runs in the background.
WATCHED=(users user_settings user_groups user_group_settings user_user_groups
    plugin_settings site site_settings journals journal_settings versions
    email_templates email_templates_settings navigation_menu_items
    navigation_menu_item_settings access_keys jobs failed_jobs)

up() {
    local id=$1 dir=$WORK/$1
    [[ -d $IN/$id/app && -f $IN/$id/db.sql ]] || die "nothing staged for $id in $IN"
    podman pod exists "$POD" && die "a sandbox pod is already up (pod.sh status; down it first)"
    [[ -e $dir ]] && podman unshare rm -rf "$dir"
    mkdir -p "$WORK" "$OUT/$id"
    cp -r --preserve=mode,timestamps "$IN/$id" "$dir"
    mkdir -p "$dir/log" "$dir/pgdata" "$dir/files" "$dir/gallery"
    podman unshare chown -R 33:33 "$dir/app" "$dir/files" "$dir/log"
    podman unshare chown -R 999:999 "$dir/pgdata"

    local hosts=()
    if [[ -s $ROOT/allowed.hosts ]]; then
        while read -r addr name; do hosts+=(--add-host "$name:$addr"); done < "$ROOT/allowed.hosts"
    fi
    podman pod create --name "$POD" \
        --publish "127.0.0.1:$APP_PORT:8080" --publish "127.0.0.1:$MAIL_PORT:8025" \
        --dns 127.0.0.1 --sysctl net.ipv4.ip_unprivileged_port_start=0 \
        "${hosts[@]}" > /dev/null

    podman run -d --name "$POD-dns" "${COMMON[@]}" --read-only "$DNS_IMAGE" > /dev/null
    podman run -d --name "$POD-mail" "${COMMON[@]}" --user 1000:1000 "$MAIL_IMAGE" > /dev/null
    podman run -d --name "$POD-db" "${COMMON[@]}" --user 999:999 \
        -e POSTGRES_USER=ojs-ci -e POSTGRES_PASSWORD=ojs-ci -e POSTGRES_DB=ojs-ci \
        -e PGDATA=/var/lib/postgresql/data/pg \
        -v "$dir/pgdata:/var/lib/postgresql/data" \
        -v "$dir/db.sql:/docker-entrypoint-initdb.d/load.sql:ro" \
        --tmpfs /var/run/postgresql:rw,mode=1777 \
        "$DB_IMAGE" > /dev/null
    local n=0
    until podman exec "$POD-db" pg_isready -q -h 127.0.0.1 -U ojs-ci 2> /dev/null; do
        n=$((n + 1))
        ((n < 180)) || die "the database did not come up (podman logs $POD-db)"
        sleep 1
    done

    podman run -d --name "$POD-app" "${COMMON[@]}" --user 33:33 --stop-timeout 2 \
        --read-only --tmpfs /tmp \
        --memory 2g --pids-limit 512 \
        -v "$dir/app:/sandbox/app" -v "$dir/files:/sandbox/files" \
        -v "$dir/gallery:/sandbox/gallery:ro" -v "$dir/log:/sandbox/log" \
        "$PHP_IMAGE" > /dev/null

    # The dataset may lag the checkout: the app's own upgrade brings it level.
    local db code
    db=$(podman exec "$POD-db" psql -U ojs-ci -tAc \
        "SELECT major||'.'||minor||'.'||revision||'.'||build FROM versions WHERE current = 1 AND product_type = 'core'")
    code=$(sed -n 's:.*<release>\(.*\)</release>.*:\1:p' "$IN/$id/app/dbscripts/xml/version.xml" | head -1)
    if [[ $db != "$code" ]]; then
        echo "pod.sh: the dataset is $db, the app $code: running the app's upgrade"
        podman exec -w /sandbox/app "$POD-app" php tools/upgrade.php upgrade > "$OUT/$id/upgrade.log" 2>&1 ||
            die "the upgrade failed: $OUT/$id/upgrade.log"
    fi
    n=0
    until podman exec "$POD-app" php -r 'exit(@file_get_contents("http://127.0.0.1:8080/index.php") === false ? 1 : 0);' 2> /dev/null; do
        n=$((n + 1))
        ((n < 60)) || die "the app does not answer (pod.sh logs $id)"
        sleep 1
    done
    echo "up: app http://127.0.0.1:$APP_PORT, Mailpit http://127.0.0.1:$MAIL_PORT, dataset $db → $code"
}

snapshot() {
    local id=$1 label=$2 dir=$WORK/$1
    [[ $label =~ ^[a-z0-9-]{1,40}$ ]] || die "a snapshot label is lowercase letters, digits and dashes"
    podman pod exists "$POD" || die "no pod is up"
    local to=$OUT/$id/snapshots/$label
    mkdir -p "$to"
    podman unshare sh -c "cd '$dir' && find app files -type f -not -path 'app/cache/*' -print0 | sort -z | xargs -0 sha256sum" > "$to/tree.txt"
    podman exec "$POD-db" psql -U ojs-ci -tA -F $'\t' -c \
        "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' ORDER BY 1, 2" > "$to/schema.tsv"
    podman exec "$POD-db" psql -U ojs-ci -tA -F $'\t' -c \
        "SELECT c.relname, (xpath('/row/n/text()', query_to_xml('SELECT count(*) AS n FROM public.' || quote_ident(c.relname), false, true, '')))[1]::text
         FROM pg_class c JOIN pg_namespace s ON s.oid = c.relnamespace WHERE s.nspname = 'public' AND c.relkind = 'r' ORDER BY 1" > "$to/counts.tsv"
    local table
    for table in "${WATCHED[@]}"; do
        podman exec "$POD-db" psql -U ojs-ci -tAc "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table'" | grep -q 1 || continue
        podman exec "$POD-db" psql -U ojs-ci -c "\\copy (SELECT * FROM public.$table ORDER BY 1) TO STDOUT WITH (FORMAT csv, HEADER)" > "$to/$table.csv"
    done
    echo "snapshot $label → $to"
}

logs() {
    local id=$1 dir=$WORK/$1
    mkdir -p "$OUT/$id"
    podman logs --timestamps "$POD-dns" > "$OUT/$id/dns.log" 2>&1 || true
    podman logs "$POD-app" > "$OUT/$id/requests.log" 2>&1 || true
    podman logs "$POD-db" > "$OUT/$id/db.log" 2>&1 || true
    podman unshare cat "$dir/log/php-error.log" > "$OUT/$id/php-error.log" 2> /dev/null || : > "$OUT/$id/php-error.log"
    echo "logs → $OUT/$id"
}

down() {
    local id=$1
    if podman pod exists "$POD"; then
        logs "$id" > /dev/null
        podman pod rm -f "$POD" > /dev/null
    fi
    [[ -e $WORK/$id ]] && podman unshare rm -rf "$WORK/$id"
    echo "down: pod and work dir of $id removed (out/$id kept)"
}

cmd=${1:-}
shift || true
case "$cmd" in
up) up "$(review_id "${1:-}")" ;;
php)
    id=$(review_id "${1:-}")
    shift
    podman exec -w /sandbox/app "$POD-app" php "$@"
    ;;
snapshot) snapshot "$(review_id "${1:-}")" "${2:-}" ;;
logs) logs "$(review_id "${1:-}")" ;;
down) down "$(review_id "${1:-}")" ;;
purge)
    id=$(review_id "${1:-}")
    rm -rf "${OUT:?}/$id"
    echo "purge: out/$id removed"
    ;;
status)
    podman pod ps
    podman ps -a --pod --format '{{.Names}}\t{{.Status}}\t{{.Image}}'
    ;;
*) die "usage: pod.sh up|php|snapshot|logs|down|purge <review> … | status" ;;
esac
