// Issue report walk: docs/issues/U51-A10-purchase-active-subscription-takes-access-away.md
// (spec U51 register A10). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// OJS only: the manager `rvaca` sets the journal up and gives the reader
// `ccorino` an active individual and an active institutional subscription;
// ccorino presses "Purchase" beside each and saves; then the manager's lists,
// the manager records the individual payment on the subscription's "Edit"
// window, and the reader looks again.
// The Steps themselves are in ./steps.js (shared with the A25 walk).
//
// Arguments (after the script):
//   (none)      the Steps (1-24).
//   neighbour   the fix check: after steps 1-12, "Renew" on the individual
//               row and "Purchase New Subscription" under the institutional
//               table, which the fix must leave as they are.
//
// Reset the fleet before each walk (the walk changes the dataset):
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset --apps ojs
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/purchase-active-subscription-takes-access-away/walk.js [neighbour]
//   (PKP_E2E_LINE=stable-3_5_0 … PROBE_RUN=r35 in front for 3.5)
const {forEachApp} = require('../../../probe');
const {walk} = require('./steps');

const MODE = process.argv[2] || 'steps';
if (!['steps', 'neighbour'].includes(MODE)) throw new Error(`unknown mode ${MODE}`);
const PARTS = {steps: ['setup', 'individual', 'institutional', 'manager', 'record'], neighbour: ['setup', 'neighbour']}[MODE];

forEachApp((app) => walk(app, PARTS, `a10-${MODE}`));
