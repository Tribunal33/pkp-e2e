// Kept walk for docs/issues/U63-OJS5-tool-settings-required-note-without-required-field.md
// (spec U63 register OJS5). The Steps (each tool's Settings foot note and
// labels, then "Save" with the form empty) are taken by the walk beside the
// other OJS5 report, which records them together with that report's Cancel
// steps; this file runs it, so both reports keep a walk in their folder.
// Reset first:  flock -s .reports/issues/main-code.lock npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
// Run (main):   flock -s .reports/issues/main-code.lock env PROBE_FEATURE=issues-ir1 PROBE_AGENT=u63ojs5 node bin/probe.js ojs shared/playwright/checks/issues/tool-settings-required-note-without-required-field/walk.js
// Facts: walk-facts[-<run>]-ojs.json, keys "<tool>: settings as opened" (footNote, labels, asterisks)
// and "<tool>: control Save empty". Fix trial: ../tool-settings-cancel-does-nothing/trial.sh (RUNS=fixnote).
require('../tool-settings-cancel-does-nothing/walk.js');
