#!/bin/bash
# setup.sh — the plugin sandbox's one-time root setup on the VM (harness.md
# "The plugin sandbox"). Idempotent: re-run it after changing anything
# under sandbox/ (pod.sh, the egress helper, the rule, the images).
#
#   sudo bash sandbox/vm/setup.sh [--no-build]
#
# What it makes:
#   - the sandbox user e2e-plugin: no login, no credentials, its own subuid
#     range and lingering systemd session (rootless Podman needs both);
#   - /srv/plugin-sandbox: in/ (the bot writes, the sandbox reads), out/
#     (the reverse), bin/pod.sh, allowed.hosts — root-owned where it matters;
#   - /usr/local/sbin/plugin-egress and the nft table plugin_sandbox, loaded
#     at boot by plugin-sandbox-firewall.service; drops logged to
#     /var/log/plugin-egress.log (readable by the bot);
#   - sudoers: the bot runs plugin-egress as root and pod.sh as e2e-plugin,
#     nothing else;
#   - the images, built as e2e-plugin. The egress rule is lifted for the
#     build alone, and only when no sandbox pod is up.
set -euo pipefail

[[ $(id -u) == 0 ]] || { echo "setup.sh: run as root" >&2; exit 1; }
HERE=$(cd "$(dirname "$0")" && pwd)
SANDBOX=$(dirname "$HERE")
BOT=${BOT:-e2e}
SBX=e2e-plugin
SBX_HOME=/var/lib/$SBX
ROOT=/srv/plugin-sandbox
BUILD=1
[[ ${1:-} == --no-build ]] && BUILD=0

id "$BOT" > /dev/null || { echo "setup.sh: the bot user $BOT does not exist" >&2; exit 1; }

echo "== packages"
DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends podman crun passt uidmap catatonit nftables > /dev/null

echo "== the sandbox user"
if ! id "$SBX" > /dev/null 2>&1; then
    useradd --create-home --home-dir "$SBX_HOME" --shell /usr/sbin/nologin --user-group "$SBX"
fi
grep -q "^$SBX:" /etc/subuid || usermod --add-subuids 200000-265535 "$SBX"
grep -q "^$SBX:" /etc/subgid || usermod --add-subgids 200000-265535 "$SBX"
chmod 750 "$SBX_HOME"
loginctl enable-linger "$SBX"
systemctl start "user@$(id -u "$SBX").service"
# The bot's home stays closed to everyone else (it holds every credential).
chmod 750 "$(getent passwd "$BOT" | cut -d: -f6)"

echo "== /srv/plugin-sandbox"
install -d -o root -g root -m 755 "$ROOT" "$ROOT/bin" "$ROOT/images"
install -d -o "$BOT" -g "$SBX" -m 2750 "$ROOT/in"
install -d -o "$SBX" -g "$BOT" -m 2750 "$ROOT/out"
install -o root -g root -m 755 "$SANDBOX/pod.sh" "$ROOT/bin/pod.sh"
[[ -e $ROOT/allowed.hosts ]] || install -o root -g root -m 644 /dev/null "$ROOT/allowed.hosts"
rm -rf "$ROOT/images"/*
cp -r "$SANDBOX/images/." "$ROOT/images/"
chmod -R a+rX "$ROOT/images"

echo "== egress rule, helper and log"
install -o root -g root -m 755 "$HERE/plugin-egress" /usr/local/sbin/plugin-egress
install -d -m 755 /etc/plugin-sandbox
install -o root -g root -m 644 "$HERE/nft.conf" /etc/plugin-sandbox/nft.conf
[[ -e /var/log/plugin-egress.log ]] || install -o syslog -g "$BOT" -m 640 /dev/null /var/log/plugin-egress.log
cat > /etc/rsyslog.d/30-plugin-egress.conf << 'EOF'
# The plugin sandbox's egress drops (sandbox/vm/nft.conf), in a file the bot reads.
:msg, contains, "plugin-egress: " -/var/log/plugin-egress.log
& stop
EOF
cat > /etc/logrotate.d/plugin-egress << EOF
/var/log/plugin-egress.log {
    weekly
    rotate 8
    compress
    delaycompress
    missingok
    notifempty
    create 0640 syslog $BOT
    postrotate
        /usr/lib/rsyslog/rsyslog-rotate
    endscript
}
EOF
systemctl restart rsyslog
cat > /etc/systemd/system/plugin-sandbox-firewall.service << 'EOF'
[Unit]
Description=Plugin sandbox egress rule (pkp-e2e sandbox/vm/nft.conf)
After=network-pre.target ufw.service
Wants=network-pre.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/sbin/nft -f /etc/plugin-sandbox/nft.conf
ExecStop=/usr/sbin/nft delete table inet plugin_sandbox

[Install]
WantedBy=multi-user.target
EOF
systemctl daemon-reload
systemctl enable plugin-sandbox-firewall.service > /dev/null 2>&1

echo "== sudoers"
cat > /etc/sudoers.d/plugin-sandbox.tmp << EOF
# The plugin sandbox (pkp-e2e sandbox/vm/setup.sh): the bot may open hosts
# for a review and drive the sandbox pod, nothing else.
$BOT ALL=(root) NOPASSWD: /usr/local/sbin/plugin-egress
$BOT ALL=($SBX) NOPASSWD: $ROOT/bin/pod.sh
EOF
visudo -cf /etc/sudoers.d/plugin-sandbox.tmp > /dev/null
chmod 440 /etc/sudoers.d/plugin-sandbox.tmp
mv /etc/sudoers.d/plugin-sandbox.tmp /etc/sudoers.d/plugin-sandbox

as_sbx() {
    local uid
    uid=$(id -u "$SBX")
    (cd "$SBX_HOME" && sudo -u "$SBX" env HOME="$SBX_HOME" XDG_RUNTIME_DIR="/run/user/$uid" \
        DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$uid/bus" "$@")
}

if ((BUILD)); then
    echo "== images (egress lifted for the build)"
    if as_sbx podman pod exists sbx 2> /dev/null; then
        echo "setup.sh: a sandbox pod is up; down it first, or re-run with --no-build" >&2
        exit 1
    fi
    nft delete table inet plugin_sandbox 2> /dev/null || true
    trap 'systemctl restart plugin-sandbox-firewall.service' EXIT
    as_sbx podman build -q -t localhost/plugin-sandbox-php "$ROOT/images/php"
    as_sbx podman build -q -t localhost/plugin-sandbox-dns "$ROOT/images/dns"
    as_sbx podman pull -q docker.io/library/postgres:18 > /dev/null
    as_sbx podman pull -q docker.io/axllent/mailpit:latest > /dev/null
    as_sbx podman image prune -f > /dev/null
fi

systemctl restart plugin-sandbox-firewall.service
trap - EXIT
echo "== done"
nft list chain inet plugin_sandbox sandbox | sed -n "/ct state/,/drop$/p"
as_sbx podman images --format '{{.Repository}}:{{.Tag}}  {{.Size}}'
