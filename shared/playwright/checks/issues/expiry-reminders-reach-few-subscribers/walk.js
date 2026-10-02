// Issue walk U51 A8: "Subscription Expiry Reminders" run once a month, and each run reaches
// only the subscriptions ending on one day. The steps are the A27 walk's with a second
// subscription (dbuskins, ending 14 days after dbarnes's) and the schedule list
// (`php lib/pkp/tools/scheduler.php list`). On main and 3.5 the task stops first (A27), so
// this walk runs with A27's fix applied (../expiry-reminder-task-stops-with-error/fix.diff).
//
// Run: node bin/try-fix.js apply shared/playwright/checks/issues/expiry-reminder-task-stops-with-error/fix.diff ojs
//      PROBE_FEATURE=issues-sb1 PROBE_AGENT=sb1 node bin/probe.js ojs \
//        shared/playwright/checks/issues/expiry-reminders-reach-few-subscribers/walk.js
//      node bin/try-fix.js revert shared/playwright/checks/issues/expiry-reminder-task-stops-with-error/fix.diff ojs
// The fix trial applies trial-with-a27.diff (A27's fix and this one's) instead.
process.argv.push('extra');
require('../expiry-reminder-task-stops-with-error/walk.js');
