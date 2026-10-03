// Kept walk for docs/issues/U27-A37-resend-request-log-raw-submission-placeholder.md (spec U27, register A37).
// On PKP's default test dataset (a dataset fleet), journal and press: a reviewer declines a request,
// dbarnes resends it from the row's "More Actions" and reads the workflow's "Activity Log". Run:
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=k5 node bin/probe.js ojs,omp \
//     shared/playwright/checks/issues/resend-request-log-raw-submission-placeholder/walk.js
// (`all` works too: a preprint server has no review and is skipped.)
// WALK_MODE=neighbour runs only the neighbour check for a fix trial: the Activity Log of a submission
// whose dataset entries already print the number ("…for submission 7…") reads the same with the
// fix in and out. Helpers: ../reviewer-response-erases-reminder-history/lib.js.
const {forEachApp, launch, signIn, signOut, record, note} = require('../../../probe');
const K = require('../reviewer-response-erases-reminder-history/lib.js');

const MODE = process.env.WALK_MODE || 'steps';
const NEIGHBOUR = {ojs: 7, omp: 12};

forEachApp(async (app) => {
    const c = K.CASES[app.name];
    if (!c) return; // a preprint server has no review
    const id = c.pending;
    const who = c.declines;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, submission: id, reviewer: who.user};
    const step = async (key, fn) => {
        try {
            facts[key] = await fn();
        } catch (e) {
            facts[key] = {error: K.flat(e.message, 400)};
            note(`U27 A37 walk (${app.name}, ${MODE}): step ${key} failed: ${K.flat(e.message, 200)}`);
        }
        return facts[key];
    };
    const {page} = await launch(app);

    if (MODE === 'neighbour') {
        await signIn(page, 'dbarnes');
        await step('n1-activity', async () => {
            await K.openWorkflow(page, app, NEIGHBOUR[app.name]);
            return (await K.activityLog(page, 'nb-activity-log')).filter((r) => /submission/i.test(r)).slice(0, 12);
        });
        record('a37-neighbour', facts);
        return;
    }

    await signIn(page, who.user);
    await step('s1-decline', () => K.reviewerDecline(page, app, id));
    await signOut(page);
    await signIn(page, 'dbarnes');
    await step('s2-row', async () => K.rowText(await K.openWorkflow(page, app, id), who.name));
    await step('s3-resend', async () => K.resend(page, await K.openWorkflow(page, app, id), who.name));
    await step('s4-activity', async () => {
        await K.openWorkflow(page, app, id);
        return (await K.activityLog(page, 's4-activity-log')).slice(0, 6);
    });
    record('a37-summary', facts);
});
