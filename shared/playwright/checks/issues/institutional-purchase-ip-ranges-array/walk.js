// Issue report walk: docs/issues/U51-A25-institutional-purchase-ip-ranges-array.md
// (spec U51 register A25). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// OJS only: the manager `rvaca` sets the journal up, with the institution
// "Harbour Library u51w3" (two IP ranges) and the reader `ccorino`'s active
// institutional subscription; ccorino presses "Purchase" beside it, reads
// "IP ranges", presses "Continue", types the ranges again and presses
// "Continue". The Steps are in the A10 walk's module
// (../purchase-active-subscription-takes-access-away/steps.js): its
// institutional setup ("setup-inst") and its institutional part. Its step
// numbers are A10's; this report's steps 1-7 are that setup, 8 "My
// Subscriptions", 9-11 its steps 17-19.
//
// Arguments (after the script):
//   (none)      the Steps.
//   domain      the Steps with an institution that has no IP ranges and a
//               subscription with the domain "example.edu"; step 11 clears
//               "IP ranges" instead of typing them.
//   neighbour   the fix check (the A10 walk's): after A10's setup, "Renew" and "Purchase New Subscription"
//               under the institutional table (an empty "IP ranges", typed
//               ranges accepted), which the fix must leave as it is.
//
// Reset the fleet before each walk (the walk changes the dataset):
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset --apps ojs
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/institutional-purchase-ip-ranges-array/walk.js [neighbour]
//   (PKP_E2E_LINE=stable-3_5_0 … PROBE_RUN=r35 in front for 3.5)
const {forEachApp} = require('../../../probe');
const {walk} = require('../purchase-active-subscription-takes-access-away/steps');

const MODE = process.argv[2] || 'steps';
if (!['steps', 'domain', 'neighbour'].includes(MODE)) throw new Error(`unknown mode ${MODE}`);
const PARTS = {steps: ['setup-inst', 'institutional'], domain: ['setup-inst', 'domain-only', 'institutional'], neighbour: ['setup', 'neighbour']}[MODE];

forEachApp((app) => walk(app, PARTS, `a25-${MODE}`));
