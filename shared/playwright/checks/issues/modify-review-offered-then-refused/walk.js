// U27 A30 and A31 issue walk (docs/issues/U27-A30-A31-modify-review-offered-then-refused.md): the
// Review Details window offers "Modify Review" where its "Save Changes" is refused, on a declined
// request (A30) and to a Funding coordinator (A31). On PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"), journal or press `publicknowledge`. The kit builds nothing. A
// preprint server has no review: not walked. Every step is recorded and none throws, so the same
// script reads the state a fix brings (the button disabled or gone) and the 3.5 screens.
//
// MODE=walk (default):
//   A30, OJS submission 12 / OMP 17: jjanssen declines; dbarnes opens the workflow, reads Julie
//   Janssen's row, "More Actions" > "Review Details", the footer; "Modify Review" > "Modify Review";
//   types the review ({OJS} picks "Accept Submission"); "Save Changes"; leaves both windows; the row.
//   A31, OJS submission 7 / OMP 16: admin gives svogt "Funding coordinator" (Administration > Hosted
//   Journals/Presses > Settings wizard > Users > Edit User); dbarnes assigns Sarah Vogt as Funding
//   coordinator; svogt opens the workflow, "Read Review" on Paul Hudson's / Adela Gallego's row, the
//   footer; "Modify Review" > "Modify Review"; types; "Save Changes"; "OK"; leaves both windows;
//   then opens the same review's window from the dashboard's review indicator, the footer.
// MODE=nb, the neighbours alone (with a fix in and out):
//   dbarnes on the submitted review (OJS 7 / OMP 16): the footer, "Modify Review" opens the window;
//   {OJS} dbuskins, the assigned Section editor, the same; dbarnes from the dashboard's review
//   indicator, the footer; admin gives gcox "Production editor", dbarnes assigns Graham Cox as
//   Production editor on OJS 5 / OMP 4 (Production), gcox opens the review round and "Review
//   Details" on Paul Hudson's / Al Zacharia's row, the footer; jjanssen declines OJS 12 / OMP 17,
//   dbarnes "Resend Review Request", then "Review Details": the footer, and the save goes through.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/modify-review-offered-then-refused/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/a30a31-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.env.MODE || 'walk';
const TAG = 'u27k9';

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    if (!c) { console.log(`[a30a31 ${app.name}] no review: not walked`); return; }
    const o = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) { o[key] = {threw: H.flat(e.message, 500)}; }
        console.log(`[a30a31 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 1500));
        record(`a30a31-${MODE}-${key}`, await screen(page).catch(() => ({url: page.url()})));
        await shot(page, `a30a31-${MODE}-${key}`).catch(() => {});
        record(`a30a31-facts-${MODE}`, o);
        return o[key];
    };
    /** The window reached, then "Modify Review" and a save of `text`; each part recorded, none thrown. */
    const modifyAndSave = async (prefix, text, recommendation, {okError = false} = {}) => {
        const f = await H.footer(page);
        const out = {footer: f};
        if (f.states['Modify Review'] !== 'enabled') return out;
        out.modify = await H.openModify(page);
        record(`a30a31-${MODE}-${prefix}-window`, await screen(page));
        await shot(page, `a30a31-${MODE}-${prefix}-window`).catch(() => {});
        out.entered = await H.enterReview(page, text, recommendation);
        out.save = await H.pressSave(page);
        record(`a30a31-${MODE}-${prefix}-saved`, await screen(page));
        await shot(page, `a30a31-${MODE}-${prefix}-saved`).catch(() => {});
        if (okError) out.errorOk = await H.okDialog(page, 'Error');
        return out;
    };
    try {
        if (MODE === 'nb') {
            await step('nbEditor', async () => {
                await signIn(page, 'dbarnes');
                await H.openWorkflow(page, app, c.submitted.id);
                const opened = await H.openDetailsFromReadReview(page, c.submitted.name);
                const f = opened ? await H.footer(page) : null;
                const m = f && f.states['Modify Review'] === 'enabled' ? await H.openModify(page) : null;
                await H.leaveWindows(page);
                return {opened, footer: f, windowOpened: !!m, buttons: m && m.buttons};
            });
            if (c.submitted.sectionEditor) {
                await step('nbSectionEditor', async () => {
                    await signIn(page, c.submitted.sectionEditor);
                    await H.openWorkflow(page, app, c.submitted.id);
                    const opened = await H.openDetailsFromReadReview(page, c.submitted.name);
                    const f = opened ? await H.footer(page) : null;
                    await H.leaveWindows(page);
                    return {opened, footer: f};
                });
            }
            await step('nbDashboard', async () => {
                await signIn(page, 'dbarnes');
                const via = await H.openDetailsFromDashboard(page, app, c.submitted.title, c.submitted.name);
                const f = await H.footer(page);
                await H.leaveWindows(page);
                return {via, footer: f};
            });
            await step('nbProductionRole', async () => {
                await signIn(page, 'admin');
                const R = require('../manager-level-role-save-ticks-every-stage/lib.js');
                await R.giveRoleAsAdmin(page, app, {username: 'gcox', role: 'Production editor'});
                return {given: 'Production editor'};
            });
            await step('nbProductionAssign', async () => {
                await signIn(page, 'dbarnes');
                const R = require('../manager-level-role-save-ticks-every-stage/lib.js');
                return R.assignAs(page, app, c.production.id, {role: 'Production editor', personName: 'Graham Cox'});
            });
            await step('nbProduction', async () => {
                await signIn(page, 'gcox');
                await H.openWorkflow(page, app, c.production.id).catch(() => null);
                const round = await H.openRound(page, c.production.roundLink, c.production.nth);
                if (!round.opened) return {round};
                const row = await H.readRow(page, c.production.name);
                const opened = await H.openDetailsFromMenu(page, c.production.name);
                const f = opened ? await H.footer(page) : null;
                await H.leaveWindows(page);
                return {round, row, opened, footer: f};
            });
            await step('nbDecline', async () => {
                await signIn(page, c.declined.user);
                const D = require('../unanswered-reviewer-row-response-due-line/lib.js');
                return D.decline(page, app, c.declined.id);
            });
            await step('nbResent', async () => {
                await signIn(page, 'dbarnes');
                const D = require('../unanswered-reviewer-row-response-due-line/lib.js');
                const modal = await H.openWorkflow(page, app, c.declined.id);
                const resent = await D.resend(page, modal, c.declined.name, D.day(14), D.day(42));
                await H.openWorkflow(page, app, c.declined.id);
                const row = await H.readRow(page, c.declined.name);
                const opened = await H.openDetailsFromMenu(page, c.declined.name);
                const saved = opened ? await modifyAndSave('nbResent', `${TAG} resent then recorded`, c.recommendation) : null;
                await H.leaveWindows(page);
                return {resent: {http: resent.http, notice: resent.notice}, row, opened, ...saved, stored: H.stored(app, c.declined.id, c.declined.user, TAG)};
            });
            await step('nbResentAfter', async () => {
                await H.openWorkflow(page, app, c.declined.id);
                return {row: await H.readRow(page, c.declined.name)};
            });
        } else {
            // A30: a declined request
            await step('a30Decline', async () => {                                     // 1-2
                await signIn(page, c.declined.user);
                const D = require('../unanswered-reviewer-row-response-due-line/lib.js');
                return D.decline(page, app, c.declined.id);
            });
            await step('a30Row', async () => {                                         // 3-5
                await signIn(page, 'dbarnes');
                await H.openWorkflow(page, app, c.declined.id);
                return {row: await H.readRow(page, c.declined.name)};
            });
            await step('a30Details', async () => {                                     // 5-8
                const opened = await H.openDetailsFromMenu(page, c.declined.name);
                if (!opened) return {opened};
                return {opened, ...(await modifyAndSave('a30', `${TAG} review recorded for the reviewer`, c.recommendation))};
            });
            await step('a30After', async () => {
                const left = await H.leaveWindows(page);
                await H.openWorkflow(page, app, c.declined.id);
                return {left, row: await H.readRow(page, c.declined.name), stored: H.stored(app, c.declined.id, c.declined.user, TAG)};
            });

            // A31: an assistant-level participant
            await step('a31Role', async () => {                                        // 1
                await signIn(page, 'admin');
                const R = require('../manager-level-role-save-ticks-every-stage/lib.js');
                await R.giveRoleAsAdmin(page, app, {username: 'svogt', role: 'Funding coordinator'});
                return {given: 'Funding coordinator'};
            });
            await step('a31Assign', async () => {                                      // 2-4
                await signIn(page, 'dbarnes');
                const R = require('../manager-level-role-save-ticks-every-stage/lib.js');
                return R.assignAs(page, app, c.submitted.id, {role: 'Funding coordinator', personName: 'Sarah Vogt'});
            });
            await step('a31Row', async () => {                                         // 5-7
                await signIn(page, 'svogt');
                await H.openWorkflow(page, app, c.submitted.id);
                return {row: await H.readRow(page, c.submitted.name)};
            });
            await step('a31Details', async () => {                                     // 7-10
                const opened = await H.openDetailsFromReadReview(page, c.submitted.name);
                if (!opened) return {opened};
                return {opened, ...(await modifyAndSave('a31', `${TAG} assistant edit`, null, {okError: true}))};
            });
            await step('a31After', async () => {
                const left = await H.leaveWindows(page);
                await H.openWorkflow(page, app, c.submitted.id);
                return {left, row: await H.readRow(page, c.submitted.name), stored: H.stored(app, c.submitted.id, c.submitted.user, TAG)};
            });
            await step('a31Dashboard', async () => {                                   // the same window from the dashboard
                const via = await H.openDetailsFromDashboard(page, app, c.submitted.title, c.submitted.name);
                const f = await H.footer(page);
                await H.leaveWindows(page);
                return {via, footer: f};
            });
        }
    } finally {
        record(`a30a31-facts-${MODE}`, o);
        await close();
    }
});
