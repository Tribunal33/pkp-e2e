#!/usr/bin/env bash
# bin/app-lock.sh <shared|exclusive> <apps, comma separated> -- <command…>
# Holds one lock per named app checkout of this slot for as long as the command runs;
# the lock goes when the command exits, however it exits.
#   shared     a walk or drive that changes no code (any number at once)
#   exclusive  a fix trial: try-fix apply … walks … revert, as ONE command
# Each app has a gate of its own: a caller takes the gates of its apps (always in the order
# ojs, omp, ops), then its locks, then lets the gates go. So a waiting fix trial is not
# overtaken by walks on the same app that ask after it (first come, first served per app),
# and a walk on an app nobody waits for is not held behind another app's queue.
set -euo pipefail
mode=${1:-}; apps=${2:-}; shift 2 || true
# A space-separated app list ("exclusive ojs omp -- …") would run "omp" as the command: refuse it.
case "$mode" in shared|exclusive) ;; *) echo "usage: bin/app-lock.sh <shared|exclusive> <apps, comma separated> -- <command…>" >&2; exit 2;; esac
[ "${1:-}" = "--" ] || { echo "app-lock: expected -- after the comma-separated apps, got '${1:-}' (usage: bin/app-lock.sh <shared|exclusive> ojs,omp,ops -- <command…>)" >&2; exit 2; }
shift
root=$(cd "$(dirname "$0")/.." && pwd)
# Each line's checkouts have locks of their own (PKP_E2E_LINE, as the harness reads it), so a
# stable-line walk never queues behind a fix trial on the main checkouts.
dir=${APPLOCK_DIR:-$root/.reports/locks}
case "${PKP_E2E_LINE:-main}" in main|"") ;; *) dir=$dir/$PKP_E2E_LINE;; esac
mkdir -p "$dir"
flag=-s; [ "$mode" = exclusive ] && flag=-x
echo "[applock] $mode $apps: asked $(date +%T)" >&2
# Each wait runs in the background so a signal reaches this script while it waits, and the
# trap ends the waiting flock with it: a killed caller leaves no flock queued on a gate.
waiter=
trap '[ -n "$waiter" ] && kill "$waiter" 2>/dev/null; exit 143' TERM INT HUP
take() { flock "$@" & waiter=$!; wait "$waiter"; waiter=; }
gates=(); fds=()
for a in ojs omp ops; do
  case ",$apps," in *",$a,"*) exec {g}>>"$dir/$a.gate"; take -x "$g"; gates+=("$g");; esac
done
for a in ojs omp ops; do
  case ",$apps," in *",$a,"*) exec {fd}>>"$dir/$a.lock"; take $flag "$fd"; fds+=("$fd");; esac
done
for g in "${gates[@]}"; do flock -u "$g"; eval "exec $g>&-"; done
trap - TERM INT HUP
echo "[applock] $mode $apps: holds $(date +%T)" >&2
# The command runs without the lock descriptors, so a server it starts cannot keep a lock.
( for fd in "${fds[@]}"; do eval "exec $fd>&-"; done; exec "$@" ) && rc=0 || rc=$?
exit $rc
