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
#   read <review> <file>      print a file under out/<review> (never through a symlink)
#   list <review> <dir>       the plain files in a folder under out/<review>
#   purge <review>            remove out/<review> (after the report is written)
#   status
#
# The pod: app (PHP 8.3, uid 33, every capability dropped), db (Postgres
# with the staged dataset dump, the app's role no superuser), mail
# (Mailpit), dns (logs every lookup, answers none). Ports on the host's
# loopback: 19000 the app, 19025 Mailpit's web view. Nothing in the pod
# reaches past the host's egress rule unless `plugin-egress allow` opened
# it. Whatever the pod wrote is read from inside a container, or on the
# host without following a symlink, with a size cap and a time limit.
set -euo pipefail

ROOT=/srv/plugin-sandbox
IN=$ROOT/in
HOME=$(getent passwd "$(id -un)" | cut -d: -f6)
WORK=$HOME/work
OUT=$HOME/out
POD=sbx
APP_PORT=19000
MAIL_PORT=19025
# Pinned by digest; setup.sh records the image ids it built or pulled in
# $ROOT/images.lock, and `up` refuses an image that is not that one.
PHP_IMAGE=localhost/plugin-sandbox-php
DNS_IMAGE=localhost/plugin-sandbox-dns
DB_IMAGE=docker.io/library/postgres@sha256:74935e72241653ca55e0414067e6d8763aceb8a810eb51b452253ec3dcfc4336 # postgres:18
MAIL_IMAGE=docker.io/axllent/mailpit@sha256:94f6b70c1436defae6799d9ac7ff0eeff9540465b842026d5cdb018f1c0234ea # mailpit:latest, 2026-10-12
export HOME XDG_RUNTIME_DIR=/run/user/$(id -u)
export DBUS_SESSION_BUS_ADDRESS=unix:path=$XDG_RUNTIME_DIR/bus
cd "$HOME"
umask 022

die() { echo "pod.sh: $*" >&2; exit 1; }
review_id() {
    [[ ${1:-} =~ ^[a-z0-9][a-z0-9-]{0,62}$ ]] || die "a review id is lowercase letters, digits and dashes"
    echo "$1"
}
# A path under out/<review>: plain names, no `..`.
out_path() {
    [[ ${2:-} =~ ^[A-Za-z0-9_.-]+(/[A-Za-z0-9_.-]+)*$ && /${2}/ != */../* && /${2}/ != */./* ]] || die "not a path under out/$1: ${2:-}"
    echo "$OUT/$1/$2"
}
# Container output stays in podman's own size-capped files, never in the
# system journal or syslog.
COMMON=(--pod "$POD" --pull=never --cap-drop=all --security-opt=no-new-privileges
    --log-driver k8s-file --log-opt max-size=10mb)

# The watched tables: who may do what, what the site and the journals are
# set to, which plugins hold settings, what runs in the background.
WATCHED=(users user_settings user_groups user_group_settings user_user_groups
    plugin_settings site site_settings journals journal_settings versions
    email_templates email_templates_settings navigation_menu_items
    navigation_menu_item_settings access_keys jobs failed_jobs)

up() {
    local id=$1 dir=$WORK/$1
    [[ -L $IN/$id ]] && die "in/$id is a symlink"
    [[ -d $IN/$id/app && -f $IN/$id/db.sql ]] || die "nothing staged for $id in $IN"
    podman pod exists "$POD" && die "a sandbox pod is already up (pod.sh status; down it first)"
    local name want
    while read -r name want; do
        [[ $(podman image inspect --format '{{.Id}}' "$name" 2> /dev/null) == "$want" ]] ||
            die "the image $name is not the one setup.sh recorded ($ROOT/images.lock): re-run setup.sh"
    done < "$ROOT/images.lock"
    [[ -e $dir ]] && podman unshare rm -rf "$dir"
    mkdir -p "$WORK" "$OUT/$id"
    cp -r "$IN/$id" "$dir"
    # Every mount source is a folder or file the copy made, never a link.
    [[ -z $(find "$dir" -mindepth 1 -maxdepth 1 -type l) ]] || die "in/$id holds a symlink at its top: refused"
    mkdir -p "$dir/log" "$dir/pgdata" "$dir/files" "$dir/gallery"
    chmod -R a+rX "$dir/gallery"
    chmod 644 "$dir/db.sql"
    podman unshare chown -R 33:33 "$dir/app" "$dir/files" "$dir/log"
    podman unshare chown -R 999:999 "$dir/pgdata"
    # The app's role owns its database and nothing else: no superuser, so
    # no COPY … TO PROGRAM. The superuser's password is never written down.
    cat > "$dir/initdb.sh" << 'EOF'
psql -v ON_ERROR_STOP=1 -U postgres -c "CREATE ROLE \"ojs-ci\" LOGIN PASSWORD 'ojs-ci'" -c "CREATE DATABASE \"ojs-ci\" OWNER \"ojs-ci\""
psql -v ON_ERROR_STOP=1 -q -U ojs-ci -d ojs-ci -f /sandbox-db/db.sql > /dev/null
EOF
    chmod 644 "$dir/initdb.sh"

    local hosts=()
    if [[ -s $ROOT/allowed.hosts ]]; then
        while read -r addr name; do hosts+=(--add-host "$name:$addr"); done < "$ROOT/allowed.hosts"
    fi
    podman pod create --name "$POD" \
        --publish "127.0.0.1:$APP_PORT:8080" --publish "127.0.0.1:$MAIL_PORT:8025" \
        --dns 127.0.0.1 --sysctl net.ipv4.ip_unprivileged_port_start=0 \
        "${hosts[@]}" > /dev/null

    podman run -d --name "$POD-dns" "${COMMON[@]}" --read-only --memory 64m --pids-limit 32 "$DNS_IMAGE" > /dev/null
    podman run -d --name "$POD-mail" "${COMMON[@]}" --user 1000:1000 --memory 256m --pids-limit 64 "$MAIL_IMAGE" > /dev/null
    podman run -d --name "$POD-db" "${COMMON[@]}" --user 999:999 --memory 1g --pids-limit 256 \
        -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD="$(head -c 24 /dev/urandom | od -An -tx1 | tr -d ' \n')" \
        -e PGDATA=/var/lib/postgresql/data/pg \
        -v "$dir/pgdata:/var/lib/postgresql/data" \
        -v "$dir/db.sql:/sandbox-db/db.sql:ro" \
        -v "$dir/initdb.sh:/docker-entrypoint-initdb.d/load.sh:ro" \
        --tmpfs /var/run/postgresql:rw,mode=1777 \
        "$DB_IMAGE" > /dev/null
    local n=0
    # Over TCP, as the app connects: the init's own server listens on the
    # socket alone, so this answers only once the dump is loaded.
    until podman exec -e PGPASSWORD=ojs-ci "$POD-db" psql -h 127.0.0.1 -U ojs-ci -d ojs-ci -tAc 'SELECT 1' > /dev/null 2>&1; do
        n=$((n + 1))
        ((n < 180)) || die "the database did not come up (podman logs $POD-db)"
        sleep 1
    done

    podman run -d --name "$POD-app" "${COMMON[@]}" --user 33:33 --stop-timeout 2 \
        --read-only --tmpfs /tmp:size=512m \
        --memory 2g --pids-limit 512 \
        -v "$dir/app:/sandbox/app" -v "$dir/files:/sandbox/files" \
        -v "$dir/gallery:/sandbox/gallery:ro" -v "$dir/log:/sandbox/log" \
        "$PHP_IMAGE" > /dev/null

    # The dataset may lag the checkout: the app's own upgrade brings it level.
    local db code
    db=$(psql_app -tAc "SELECT major||'.'||minor||'.'||revision||'.'||build FROM versions WHERE current = 1 AND product_type = 'core'")
    code=$(sed -n 's:.*<release>\(.*\)</release>.*:\1:p' "$IN/$id/app/dbscripts/xml/version.xml" | head -1)
    if [[ $db != "$code" ]]; then
        echo "pod.sh: the dataset is $db, the app $code: running the app's upgrade"
        timeout 900 podman exec -w /sandbox/app "$POD-app" php tools/upgrade.php upgrade > "$OUT/$id/upgrade.log" 2>&1 ||
            die "the upgrade failed: out/$id/upgrade.log (plugin-sandbox.js show $id upgrade.log)"
    fi
    n=0
    until podman exec "$POD-app" php -r 'exit(@file_get_contents("http://127.0.0.1:8080/index.php") === false ? 1 : 0);' 2> /dev/null; do
        n=$((n + 1))
        ((n < 60)) || die "the app does not answer (pod.sh logs $id)"
        sleep 1
    done
    echo "up: app http://127.0.0.1:$APP_PORT, Mailpit http://127.0.0.1:$MAIL_PORT, dataset $db → $code"
}

# psql as the app's own role, never the superuser: a table the plugin
# replaced with a view runs its functions with the reader's rights.
psql_app() { timeout 300 podman exec "$POD-db" psql -U ojs-ci -d ojs-ci "$@"; }

snapshot() {
    local id=$1 label=$2
    [[ $label =~ ^[a-z0-9-]{1,40}$ ]] || die "a snapshot label is lowercase letters, digits and dashes"
    podman pod exists "$POD" || die "no pod is up"
    local to=$OUT/$id/snapshots/$label rc=0
    mkdir -p "$to"
    # Hashed inside the app container, so a link the plugin planted
    # resolves in the container's own view, never the host's.
    timeout 600 podman exec -w /sandbox "$POD-app" sh -c \
        "find app files -type f -not -path 'app/cache/*' -print0 | sort -z | xargs -0 -r sha256sum" \
        > "$to/tree.txt" 2> "$to/tree-errors.txt" || rc=$?
    ((rc == 0 || rc == 123)) || die "hashing the app's files failed (exit $rc)"
    psql_app -tA -F $'\t' -c \
        "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' ORDER BY 1, 2" > "$to/schema.tsv"
    psql_app -tA -F $'\t' -c \
        "SELECT c.relname, (xpath('/row/n/text()', query_to_xml('SELECT count(*) AS n FROM public.' || quote_ident(c.relname), false, true, '')))[1]::text
         FROM pg_class c JOIN pg_namespace s ON s.oid = c.relnamespace WHERE s.nspname = 'public' AND c.relkind = 'r' ORDER BY 1" > "$to/counts.tsv"
    local table
    for table in "${WATCHED[@]}"; do
        psql_app -tAc "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table'" | grep -q 1 || continue
        psql_app -c "\\copy (SELECT * FROM public.$table ORDER BY 1) TO STDOUT WITH (FORMAT csv, HEADER)" > "$to/$table.csv"
    done
    echo "snapshot $label → out/$id/snapshots/$label"
}

logs() {
    local id=$1 dir=$WORK/$1
    mkdir -p "$OUT/$id"
    timeout 60 podman logs --timestamps "$POD-dns" > "$OUT/$id/dns.log" 2>&1 || true
    timeout 60 podman logs "$POD-app" > "$OUT/$id/requests.log" 2>&1 || true
    timeout 60 podman logs "$POD-db" > "$OUT/$id/db.log" 2>&1 || true
    # The plugin can replace its log with a link or a pipe: read it without
    # following a link, without waiting on a pipe, at most 10 MB.
    timeout 30 podman unshare dd if="$dir/log/php-error.log" of="$OUT/$id/php-error.log" \
        iflag=nofollow,nonblock,count_bytes count=10M bs=1M status=none 2> /dev/null ||
        echo "pod.sh: no php-error.log, or not a plain file (not followed)" > "$OUT/$id/php-error.log"
    echo "logs → out/$id (plugin-sandbox.js show $id dns.log|requests.log|php-error.log|db.log)"
}

down() {
    local id=$1
    if podman pod exists "$POD"; then
        logs "$id" > /dev/null || true
        timeout 120 podman pod rm -f -t 2 "$POD" > /dev/null
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
    timeout 1200 podman exec -w /sandbox/app "$POD-app" php "$@"
    ;;
snapshot) snapshot "$(review_id "${1:-}")" "${2:-}" ;;
logs) logs "$(review_id "${1:-}")" ;;
down) down "$(review_id "${1:-}")" ;;
read)
    id=$(review_id "${1:-}")
    file=$(out_path "$id" "${2:-}")
    [[ -e $file || -L $file ]] || { echo "pod.sh: missing: out/$id/$2" >&2; exit 4; }
    timeout 30 dd if="$file" iflag=nofollow,nonblock,count_bytes count=20M bs=1M status=none
    ;;
list)
    id=$(review_id "${1:-}")
    folder=$(out_path "$id" "${2:-}")
    [[ -d $folder && ! -L $folder ]] || { echo "pod.sh: missing: out/$id/$2" >&2; exit 4; }
    find "$folder" -mindepth 1 -maxdepth 1 -type f -printf '%f\n' | sort
    ;;
purge)
    id=$(review_id "${1:-}")
    rm -rf "${OUT:?}/$id"
    echo "purge: out/$id removed"
    ;;
status)
    podman pod ps
    podman ps -a --pod --format '{{.Names}}\t{{.Status}}\t{{.Image}}'
    ;;
*) die "usage: pod.sh up|php|snapshot|logs|down|read|list|purge <review> … | status" ;;
esac
