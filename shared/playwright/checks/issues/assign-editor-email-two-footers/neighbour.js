// Neighbour check for docs/issues/U35-A15-assign-editor-email-two-footers.md:
// walk.js's steps on the Review stage's "Assign Editor" (OJS submission 7, OMP 16).
// Its email must end with the discussion footer alone, with the fix in and out.
// Run: ONLY=ojs,omp PROBE_FEATURE=issues-w39 PROBE_AGENT=w39 node bin/probe.js all shared/playwright/checks/issues/assign-editor-email-two-footers/neighbour.js
//      (after a fresh reset of the dataset fleet, as for walk.js)
process.env.A15_WALK = 'neighbour';
require('./walk.js');
