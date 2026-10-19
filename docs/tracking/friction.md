# Friction — what made an agent's task harder than it needed to be

What cost a screen-driving agent calls, time or retries that a better
brief, doc, kit, seed or fixture would have saved; that agent appends a row
at the end of its task. The housekeeping session folds the rows and
deletes them under MAINTENANCE "The housekeeping session".

One line per entry, appended at the end, in this shape:

`YYYY-MM-DD · U<nn>, sync or issues · <role and agent id> · <what cost you calls, time or retries> · <what would have helped>`

Facts only, the same quarantine as everywhere else (nothing
security-shaped, no credentials).

## Entries
2026-10-19 · issues · issue reporter h19v (U26 A13, A14) · the revision-upload and Tasks-panel helpers live only in issue folders whose lib.js files require each other in a chain (deleted-revision-no-task-back → four sibling libs), so a standalone kept script meant reading five libs to copy three helpers; a shared walk then waited 20 min on the app lock behind other reporters' trials · an "Upload revisions" (component, file, Continue, Continue, Complete) and a "read the header Tasks panel" helper in a page object (ReviewStagePages.js), so issue walks import them instead of copying
2026-10-19 · issues · issue reporter h19y (U42 A24) · the neighbour walk with the fix out (nb-out) can only run after the revert, so it took its own shared-lock turn and waited 34 min on ojs behind two other reporters' exclusive trials queued in between, longer than the whole trial · let a trial script run its nb-out walks inside the same exclusive hold right after the trap's revert (or bin/try-fix.js offer a revert-then-continue step), so the neighbour pair is one lock turn
2026-10-19 · issues · issue reporter h19x (U40 OJS1) · the fix trial waited 33 min on the ojs,omp lock behind another reporter's exclusive trial, and a generic "what does the publish button open" read missed OJS 3.5's window ("Select an issue to schedule for publication", Issue + Save, no Cancel), whose text came only from the screen record · a line in patterns.md (or a PublicationScreen method) naming what the publish button opens on each app and line (main OJS panel "Review Publishing Details", OMP/OPS window naming the assigned stage, OJS 3.5 issue window), so a cross-line read needs no guess
2026-10-19 · issues · issue reporter h19z (U42 A25) · the dataset fleet runs `job_runner = On` (jobs at the end of each request), so a race with a queued citation job never shows on it; the walk had to set `job_runner = Off` in config.test.ds<n>.inc.php itself after each reset and run `jobs.php run` against that config, and the main walks on omp/ops waited 30 min on the app lock behind two exclusive trials · a `fleet-prep --dataset n --config queues.job_runner=Off` option (kept across the reset) and a kit `runSiteJobs(app)` beside `drainJobs` (which needs the _test API) would have saved writing both
2026-10-19 · issues · issue reporter h19w (U40 A22) · the first walk typed into a freshly mounted TinyMCE box at 10 ms a key, finishing before TinyMCE's loading cover (throbber, 500 ms after mount, takes focus), so the report claimed a window of "seconds"; a revision round and a timing walk were needed to find it is half a second · a line in patterns.md (TinyMCE notes): a walk about typing into a box that is still loading types at a human pace (`keyboard.type(…, {delay: 60})`) and times its keys against the 500 ms cover
