// Neighbour check for docs/issues/U35-A6-assign-editor-message-no-editor-task.md:
// walk.js's steps with the stage's plain "Discussion (…)" message instead of
// "Assign Editor". The new editor must get only the discussion's task, with
// the fix in and out.
// Run: PROBE_FEATURE=issues-w34 PROBE_AGENT=w34 node bin/probe.js all shared/playwright/checks/issues/assign-editor-message-no-editor-task/neighbour.js
//      (after a fresh reset of the dataset fleet, as for walk.js)
process.env.A6_WALK = 'neighbour';
require('./walk.js');
