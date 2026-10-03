// Issue report U04 A8: every failure on the "ORCID Authorization" page tells a press's or a
// preprint server's contributor to contact "the journal manager". The walk is shared with
// U04 A2 (same page, same steps): it lives beside that report's fix and runs from here too.
//
// Reset:  npm run fleet-prep -- --feature issues-u04r2 --dataset 2 --reset
// Run:    PROBE_FEATURE=issues-u04r2 PROBE_AGENT=u04r2 [MODE=nb] [PROBE_RUN=…] \
//           node bin/probe.js all shared/playwright/checks/issues/orcid-failure-page-says-journal-manager/walk.js
// Steps 9 and 11 of the facts (`S9 denial landing`, `S11 used link`) carry the closing line.
require('../orcid-denied-page-raw-placeholder/walk.js');
