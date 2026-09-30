#!/usr/bin/env bash
# Fix trial for docs/issues/U63-OJS4-OJS7-pubmed-doaj-export-fails-site-unreachable.md (U63 OJS4, OJS7).
# Run under the slot's exclusive main-code lock:
#   flock -x .reports/issues/main-code.lock bash shared/playwright/checks/issues/pubmed-doaj-export-fails-site-unreachable/trial.sh
# Applies fix.diff to OJS, resets dataset fleet 3, walks the Steps with the
# fix (PROBE_RUN=fix), reverts (in a trap, so it reverts on failure too),
# resets again and walks the neighbour check (NEIGHBOUR_ONLY=1) without the
# fix, then prints try-fix status.
set -u
cd "$(dirname "$0")/../../../../.."
D=shared/playwright/checks/issues/pubmed-doaj-export-fails-site-unreachable
FEATURE=${FEATURE:-issues-ir3}
DS=${DS:-3}
reverted=0
revert() {
    if [ $reverted = 0 ]; then
        if ! node bin/try-fix.js revert ojs; then
            # patch -R leaves the files the diff created behind, empty, so try-fix's
            # before-check fails (friction 2026-09-30): delete those, and drop the
            # marker once every file the diff touched is back to its recorded hash.
            (cd checkouts/ojs && python3 -c '
import json, os, hashlib
m = json.load(open(".pkp-e2e-fix.json"))
bad = []
for f in m["files"]:
    if m["before"][f] is None:
        if os.path.exists(f):
            if os.path.getsize(f) == 0: os.remove(f)
            else: bad.append(f)
    elif hashlib.sha256(open(f, "rb").read()).hexdigest() != m["before"][f]:
        bad.append(f)
print("try-fix fallback: not restored:", bad) if bad else os.remove(".pkp-e2e-fix.json")
')
        fi
        # The directories the diff's new files created.
        [ -d checkouts/ojs/dtd/pubmed ] && find checkouts/ojs/dtd/pubmed -depth -type d -empty -delete
        reverted=1
    fi
}
trap revert EXIT
node bin/try-fix.js apply $D/fix.diff ojs || exit 1
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -3
PROBE_RUN=fix PROBE_FEATURE=$FEATURE PROBE_AGENT=u63ojs4 node bin/probe.js ojs $D/walk.js 2>&1 | cut -c1-700
revert
npm run fleet-prep -- --feature $FEATURE --dataset $DS --reset 2>&1 | tail -3
NEIGHBOUR_ONLY=1 PROBE_RUN=nofix PROBE_FEATURE=$FEATURE PROBE_AGENT=u63ojs4 node bin/probe.js ojs $D/walk.js 2>&1 | cut -c1-700
node bin/try-fix.js status
git -C checkouts/ojs status --porcelain
ls checkouts/ojs/dtd
