// Issue report walk: docs/issues/U51-A18-additional-file-no-padlock.md
// (spec U51 register A18). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// OJS only: the editor `dbarnes` makes the journal require subscriptions,
// sets "Vol. 1 No. 2 (2014)" to "Subscription" and gives submission 17 a
// galley "Data" (a text file as "Data Set", listed under "Additional
// Files"; unpublish, add, publish); then a signed-out visitor reads the
// article page's links and presses "Data" and "PDF", then the reader
// `ccorino` (no subscription) does the same. The Steps are in the
// A14 walk's module (../restrict-only-pdf-html-galley-refused/steps.js).
//
// Arguments (after the script):
//   (none)      the Steps.
//   neighbour   the fix check: the same, with the issue set back to "Open
//               Access" before the visitor; "Data" must keep its file icon.
//
// Reset the fleet before each walk (the walk changes the dataset):
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset --apps ojs
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/additional-file-no-padlock/walk.js [neighbour]
//   (PKP_E2E_LINE=stable-3_5_0 … PROBE_RUN=r35 in front for 3.5)
const {forEachApp} = require('../../../probe');
const {walk} = require('../restrict-only-pdf-html-galley-refused/steps');

const MODE = process.argv[2] || 'steps';
if (!['steps', 'neighbour'].includes(MODE)) throw new Error(`unknown mode ${MODE}`);
const BASE = ['subscription', 'issue', 'article-data'];
const PARTS = {steps: [...BASE, 'visitor', 'reader'], neighbour: [...BASE, 'open-issue', 'visitor']}[MODE];

forEachApp((app) => walk(app, PARTS, `a18-${MODE}`));
