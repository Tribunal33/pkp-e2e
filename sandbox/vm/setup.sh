#!/bin/bash
# setup.sh — the plugin sandbox's one-time root setup on the VM (harness.md
# "The plugin sandbox"). Idempotent: re-run it after changing anything
# under sandbox/ (pod.sh, the egress helper, the rule, the images). It
# refuses to run while a sandbox pod is up.
#
#   sudo bash sandbox/vm/setup.sh [--no-build]
#
# What it makes:
#   - the sandbox user e2e-plugin: no login (sshd, cron and at refuse it),
#     no credentials, its own subuid range; its home is a 20 GB filesystem
#     of its own (a loop file), so a plugin cannot fill the machine's disk,
#     and root-owned except where Podman writes, so nothing it leaves there
#     starts again. Its systemd session runs only during a review (the
#     dispatcher starts it at `pod up` and stops it at `pod down`), never
#     before the egress rule, and within a memory, task and CPU cap;
#   - /srv/plugin-sandbox: in/ (the bot writes, the sandbox reads),
#     bin/pod.sh, allowed.hosts, images.lock — root-owned where it matters.
#     What the pod writes back stays in the sandbox user's home (out/),
#     which the bot reads only through the socket;
#   - /usr/local/sbin/plugin-egress and the nft table plugin_sandbox, loaded
#     at boot by plugin-sandbox-firewall.service and never taken down by
#     it; the kernel's drops logged to /var/log/plugin-egress.log (readable
#     by the bot), nothing else reaching that file but the helper's lines;
#   - the socket /run/plugin-sandbox.sock (the bot's group, mode 0660) and
#     its root dispatcher: through it the bot runs plugin-egress as root
#     and pod.sh as e2e-plugin, nothing else. Not sudo: the bot's unit sets
#     NoNewPrivileges, which closes sudo to every bot session;
#   - the images, built or pulled by digest as e2e-plugin, their ids in
#     images.lock for `pod up` to check. The egress rule is lifted for the
#     build alone;
#   - for the bot's unit: UMask=0027 and PrivateTmp=yes, effective at its
#     next restart (`systemctl restart claude-threads`, when no session
#     is working: it ends them all).
set -euo pipefail

[[ $(id -u) == 0 ]] || { echo "setup.sh: run as root" >&2; exit 1; }
HERE=$(cd "$(dirname "$0")" && pwd)
SANDBOX=$(dirname "$HERE")
BOT=${BOT:-e2e}
SBX=e2e-plugin
SBX_HOME=/var/lib/$SBX
SBX_DISK=/var/lib/$SBX.img
ROOT=/srv/plugin-sandbox
BUILD=1
[[ ${1:-} == --no-build ]] && BUILD=0
DB_IMAGE=$(sed -n 's/^DB_IMAGE=\([^ ]*\).*/\1/p' "$SANDBOX/pod.sh")
MAIL_IMAGE=$(sed -n 's/^MAIL_IMAGE=\([^ ]*\).*/\1/p' "$SANDBOX/pod.sh")
[[ $DB_IMAGE == *@sha256:* && $MAIL_IMAGE == *@sha256:* ]] || { echo "setup.sh: pod.sh's images are not pinned by digest" >&2; exit 1; }

id "$BOT" > /dev/null || { echo "setup.sh: the bot user $BOT does not exist" >&2; exit 1; }

echo "== packages"
DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends podman crun passt uidmap catatonit nftables e2fsprogs > /dev/null

echo "== the sandbox user"
if ! id "$SBX" > /dev/null 2>&1; then
    useradd --create-home --home-dir "$SBX_HOME" --shell /usr/sbin/nologin --user-group "$SBX"
fi
# useradd gives the user a subuid range of its own; the egress rule reads
# whatever range it got from /etc/subuid, never an assumed one.
grep -q "^$SBX:" /etc/subuid || usermod --add-subuids 300000-365535 "$SBX"
grep -q "^$SBX:" /etc/subgid || usermod --add-subgids 300000-365535 "$SBX"
SBX_UID=$(id -u "$SBX")
SUBUIDS=$(awk -F: -v u="$SBX" '$1 == u {printf "%d-%d", $2, $2 + $3 - 1; exit}' /etc/subuid)
[[ $SUBUIDS =~ ^[0-9]+-[0-9]+$ ]] || { echo "setup.sh: no subuid range for $SBX" >&2; exit 1; }

as_sbx() {
    (cd / && runuser -u "$SBX" -- env HOME="$SBX_HOME" XDG_RUNTIME_DIR="/run/user/$SBX_UID" \
        DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$SBX_UID/bus" "$@")
}
# The same switch as the dispatcher's: the session exists only while
# needed, and starts with an empty ~/.config (Podman wants it the user's,
# so nothing the user leaves there, a unit or a containers.conf, may last).
fresh_config() {
    rm -rf --one-file-system "$SBX_HOME/.config"
    install -d -o "$SBX" -g "$SBX" -m 700 "$SBX_HOME/.config"
}
session_start() {
    fresh_config
    touch "/var/lib/systemd/linger/$SBX"
    systemctl start "user@$SBX_UID.service"
}
session_stop() {
    rm -f "/var/lib/systemd/linger/$SBX"
    systemctl stop "user@$SBX_UID.service" "user-runtime-dir@$SBX_UID.service" 2> /dev/null || true
    mountpoint -q "$SBX_HOME" && fresh_config
}
loginctl disable-linger "$SBX" 2> /dev/null || true

if systemctl is-active -q "user@$SBX_UID.service" && as_sbx podman pod exists sbx 2> /dev/null; then
    echo "setup.sh: a sandbox pod is up; down it first (plugin-sandbox.js down <review>)" >&2
    exit 1
fi
session_stop

echo "== the sandbox user's disk and home"
if ! mountpoint -q "$SBX_HOME"; then
    [[ -e $SBX_DISK ]] || { truncate -s 20G "$SBX_DISK" && mkfs.ext4 -q -F -m 0 -L "$SBX" "$SBX_DISK"; }
    chmod 600 "$SBX_DISK"
    # What the old home held (images, work copies) is not carried over:
    # the images are rebuilt below.
    find "$SBX_HOME" -mindepth 1 -delete
    grep -q "^$SBX_DISK " /etc/fstab || echo "$SBX_DISK $SBX_HOME ext4 loop,nodev,nosuid 0 2" >> /etc/fstab
    systemctl daemon-reload
    mount "$SBX_HOME"
    BUILD=1
fi
# Root's, readable by the user: it writes only where Podman, the work
# copies and the pod's output live, and in ~/.config, emptied around each
# session. No ~/.ssh or ~/.local/share/systemd of its own can appear.
chown root:"$SBX" "$SBX_HOME"
chmod 750 "$SBX_HOME"
install -d -o root -g root -m 755 "$SBX_HOME/.local" "$SBX_HOME/.local/share" "$SBX_HOME/.local/share/systemd"
install -d -o "$SBX" -g "$SBX" -m 700 "$SBX_HOME/.local/share/containers" "$SBX_HOME/out"
fresh_config
install -d -o "$SBX" -g "$SBX" -m 755 "$SBX_HOME/work"
# The bot's home stays closed to everyone else (it holds every credential).
chmod 750 "$(getent passwd "$BOT" | cut -d: -f6)"

echo "== no way in: ssh, cron, at"
printf '%s\n' "# The plugin sandbox's user never logs in (pkp-e2e sandbox/vm/setup.sh)." "DenyUsers $SBX" > /etc/ssh/sshd_config.d/60-plugin-sandbox.conf
sshd -t
systemctl reload ssh 2> /dev/null || systemctl reload sshd
for deny in /etc/cron.deny /etc/at.deny; do
    grep -qx "$SBX" "$deny" 2> /dev/null || echo "$SBX" >> "$deny"
done

echo "== /srv/plugin-sandbox"
install -d -o root -g root -m 755 "$ROOT" "$ROOT/bin" "$ROOT/images"
install -d -o "$BOT" -g "$SBX" -m 2750 "$ROOT/in"
rm -rf "$ROOT/out"
install -o root -g root -m 755 "$SANDBOX/pod.sh" "$ROOT/bin/pod.sh"
[[ -e $ROOT/allowed.hosts ]] || install -o root -g root -m 644 /dev/null "$ROOT/allowed.hosts"
rm -rf "$ROOT/images"/*
cp -r "$SANDBOX/images/." "$ROOT/images/"
chmod -R a+rX "$ROOT/images"

echo "== egress rule, helper and log"
install -o root -g root -m 755 "$HERE/plugin-egress" /usr/local/sbin/plugin-egress
install -d -m 755 /etc/plugin-sandbox
sed "s/@SANDBOX_UIDS@/$SBX_UID, $SUBUIDS/" "$HERE/nft.conf" > /etc/plugin-sandbox/nft.conf.tmp
nft -c -f /etc/plugin-sandbox/nft.conf.tmp
chmod 644 /etc/plugin-sandbox/nft.conf.tmp
mv /etc/plugin-sandbox/nft.conf.tmp /etc/plugin-sandbox/nft.conf
[[ -e /var/log/plugin-egress.log ]] || install -o syslog -g "$BOT" -m 640 /dev/null /var/log/plugin-egress.log
# Only the kernel's own log (imklog) can carry a drop: no process, in the
# pod or out of it, writes a line into this file through syslog.
cat > /etc/rsyslog.d/30-plugin-egress.conf << 'EOF'
# The plugin sandbox's egress drops (sandbox/vm/nft.conf), in a file the bot reads.
if $inputname == "imklog" and $msg contains "plugin-egress: drop " then {
    action(type="omfile" file="/var/log/plugin-egress.log")
    stop
}
EOF
rsyslogd -N1 > /dev/null 2>&1 || { echo "setup.sh: the rsyslog rule does not parse" >&2; exit 1; }
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
# No ExecStop: stopping or restarting the unit never takes the rule down.
# nft.conf replaces the table in one transaction, so a reload is atomic.
cat > /etc/systemd/system/plugin-sandbox-firewall.service << 'EOF'
[Unit]
Description=Plugin sandbox egress rule (pkp-e2e sandbox/vm/nft.conf)
After=network-pre.target ufw.service
Wants=network-pre.target

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/sbin/nft -f /etc/plugin-sandbox/nft.conf
ExecReload=/usr/sbin/nft -f /etc/plugin-sandbox/nft.conf

[Install]
WantedBy=multi-user.target
EOF
# The sandbox user's session never starts before the rule or without its
# disk, never reaches the host's resolver (a name lookup there would leave
# as another user), and has a ceiling of its own. It keeps the system
# bus: it moves the pod's processes into its own scopes through it.
install -d -m 755 "/etc/systemd/system/user@$SBX_UID.service.d" "/etc/systemd/system/user-$SBX_UID.slice.d"
printf '%s\n' \
    '# pkp-e2e sandbox/vm/setup.sh' \
    '[Unit]' \
    'Requires=plugin-sandbox-firewall.service' \
    'After=plugin-sandbox-firewall.service' \
    "RequiresMountsFor=$SBX_HOME" \
    '' \
    '[Service]' \
    'InaccessiblePaths=-/run/systemd/resolve/io.systemd.Resolve' \
    > "/etc/systemd/system/user@$SBX_UID.service.d/50-plugin-sandbox.conf"
printf '%s\n' \
    '# pkp-e2e sandbox/vm/setup.sh: the whole pod, builds included' \
    '[Slice]' \
    'MemoryMax=6G' \
    'TasksMax=4096' \
    'CPUQuota=400%' \
    > "/etc/systemd/system/user-$SBX_UID.slice.d/50-plugin-sandbox.conf"
systemctl daemon-reload
systemctl enable plugin-sandbox-firewall.service > /dev/null 2>&1

echo "== the bot's door: socket and dispatcher"
install -o root -g root -m 755 "$HERE/plugin-sandbox-dispatch" /usr/local/sbin/plugin-sandbox-dispatch
printf '%s\n' \
    '[Unit]' \
    'Description=Plugin sandbox requests from the bot (pkp-e2e sandbox/vm/plugin-sandbox-dispatch)' \
    '' \
    '[Socket]' \
    'ListenStream=/run/plugin-sandbox.sock' \
    'SocketUser=root' \
    "SocketGroup=$BOT" \
    'SocketMode=0660' \
    'Accept=yes' \
    'MaxConnections=8' \
    '' \
    '[Install]' \
    'WantedBy=sockets.target' > /etc/systemd/system/plugin-sandbox.socket
printf '%s\n' \
    '[Unit]' \
    'Description=Plugin sandbox request (pkp-e2e sandbox/vm/plugin-sandbox-dispatch)' \
    '' \
    '[Service]' \
    'ExecStart=/usr/local/sbin/plugin-sandbox-dispatch' \
    'StandardInput=socket' \
    'StandardOutput=socket' \
    'StandardError=journal' \
    '# The bot never needs the dispatcher near a home; the pod it starts' \
    '# never needs the host resolver or the system bus.' \
    'InaccessiblePaths=/home /root -/run/systemd/resolve/io.systemd.Resolve -/run/dbus/system_bus_socket' \
    'ProtectSystem=full' \
    'RuntimeMaxSec=1800' > /etc/systemd/system/plugin-sandbox@.service
systemctl daemon-reload
systemctl enable plugin-sandbox.socket > /dev/null 2>&1
systemctl restart plugin-sandbox.socket
# The sudoers grant the socket replaced: sudo is closed to the bot.
rm -f /etc/sudoers.d/plugin-sandbox
# The bot's new files readable by its own group at most, and its /tmp its
# own, so a review's working files are no one else's (effective at the
# bot's next restart).
if [[ -e /etc/systemd/system/claude-threads.service ]]; then
    install -d -m 755 /etc/systemd/system/claude-threads.service.d
    printf '%s\n' '[Service]' 'UMask=0027' > /etc/systemd/system/claude-threads.service.d/umask.conf
    printf '%s\n' '[Service]' 'PrivateTmp=yes' > /etc/systemd/system/claude-threads.service.d/private-tmp.conf
    systemctl daemon-reload
fi

systemctl restart plugin-sandbox-firewall.service
if ((BUILD)); then
    echo "== images (egress lifted for the build)"
    session_start
    nft delete table inet plugin_sandbox 2> /dev/null || true
    trap 'systemctl restart plugin-sandbox-firewall.service; session_stop' EXIT
    as_sbx podman build -q -t localhost/plugin-sandbox-php "$ROOT/images/php" > /dev/null
    as_sbx podman build -q -t localhost/plugin-sandbox-dns "$ROOT/images/dns" > /dev/null
    as_sbx podman pull -q "$DB_IMAGE" > /dev/null
    as_sbx podman pull -q "$MAIL_IMAGE" > /dev/null
    as_sbx podman image prune -f > /dev/null
    for image in localhost/plugin-sandbox-php localhost/plugin-sandbox-dns "$DB_IMAGE" "$MAIL_IMAGE"; do
        echo "$image $(as_sbx podman image inspect --format '{{.Id}}' "$image")"
    done > "$ROOT/images.lock.tmp"
    install -o root -g root -m 644 "$ROOT/images.lock.tmp" "$ROOT/images.lock"
    rm -f "$ROOT/images.lock.tmp"
    systemctl restart plugin-sandbox-firewall.service
    session_stop
    trap - EXIT
fi
[[ -s $ROOT/images.lock ]] || { echo "setup.sh: no images.lock: run without --no-build" >&2; exit 1; }

echo "== self-test: the sandbox user and its subuids reach nothing"
# The user itself, the first subuid (container uid 1), the app's (uid 33).
for uid in "$SBX_UID" "${SUBUIDS%-*}" $((${SUBUIDS%-*} + 32)); do
    if timeout 5 setpriv --reuid="$uid" --regid="$uid" --clear-groups bash -c 'exec 3<>/dev/tcp/1.1.1.1/443' 2> /dev/null; then
        echo "setup.sh: uid $uid reached 1.1.1.1:443 — the egress rule does not hold" >&2
        exit 1
    fi
    echo "uid $uid: dropped"
done
echo "== done"
nft list chain inet plugin_sandbox sandbox | sed -n "/ct state/,/drop$/p"
cat "$ROOT/images.lock"
