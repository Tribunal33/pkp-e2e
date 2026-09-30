// Issue report walk: docs/issues/U51-A14-restrict-only-pdf-html-galley-refused.md
// (spec U51 register A14). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// OJS only: the editor `dbarnes` makes the journal require subscriptions,
// turns payments on with "Manual Fee Payment", ticks "Only Restrict Access
// to PDF version of issues and articles" with no fee, sets "Vol. 1 No. 2
// (2014)" to "Subscription", gives it an issue galley "HTML" and gives
// submission 17 a galley "HTML" (unpublish, add, publish); then a signed-out
// visitor reads the article page's and the issue page's links and presses
// each, then the reader `ccorino` (no subscription) does the same. The
// Steps are in ./steps.js (shared with the A18 walk).
//
// Arguments (after the script):
//   (none)      the Steps.
//   neighbour   the fix check: the same, with the box unticked again before
//               the visitor; "HTML" must stay locked and refused.
//   no-galley   the fix check for the issue half: steps 1-5, then a
//               signed-out visitor opens issue/download/1 (no galley id);
//               it must lead to Login, not a server error.
//
// Reset the fleet before each walk (the walk changes the dataset):
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset --apps ojs
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/restrict-only-pdf-html-galley-refused/walk.js [neighbour|no-galley]
//   (PKP_E2E_LINE=stable-3_5_0 … PROBE_RUN=r35 in front for 3.5)
const {forEachApp} = require('../../../probe');
const {walk} = require('./steps');

const MODE = process.argv[2] || 'steps';
if (!['steps', 'neighbour', 'no-galley'].includes(MODE)) throw new Error(`unknown mode ${MODE}`);
const BASE = ['subscription', 'payments', 'issue', 'issue-html', 'article-html'];
const PARTS = {steps: [...BASE, 'visitor', 'reader'], neighbour: [...BASE, 'untick', 'visitor'], 'no-galley': ['subscription', 'payments', 'issue', 'no-galley']}[MODE];

forEachApp((app) => walk(app, PARTS, `a14-${MODE}`));
