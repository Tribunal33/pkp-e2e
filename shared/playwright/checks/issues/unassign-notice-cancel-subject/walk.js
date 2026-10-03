// Kept walk of two issue reports on PKP's default test dataset (OJS submission 20, OMP 18):
//   docs/issues/U27-A26-unassign-notice-cancel-subject.md (steps 1-5: "Unassign Reviewer" and
//     the subject of the notice the reviewer receives), and
//   docs/issues/U27-OMP3-press-reviewer-notices-journal-placeholder.md (steps 1-8: the same
//     notice's last words, then "Cancel Review Round" and its "Review Cancel" notice).
// PHASE=nb runs the "Cancel Reviewer" group alone, on a freshly loaded dataset: "Log Response"
// (accepted) on Rajek Sharif's row, "Cancel Reviewer", his mailbox (the press report's steps 9-12;
// for the A26 fix, Cancel Reviewer run as a control), then "Reinstate Reviewer" as a control.
//
//   PROBE_FEATURE=issues-k8 PROBE_AGENT=k8 node bin/probe.js all shared/playwright/checks/issues/unassign-notice-cancel-subject/walk.js
//   PHASE=nb PROBE_RUN=nb-out PROBE_FEATURE=issues-k8 PROBE_AGENT=k8 node bin/probe.js all …/walk.js
const {forEachApp, launch, signIn, screen, record, idle, serverLog} = require('../../../probe');
const L = require('./lib.js');

const PHASE = process.env.PHASE || 'steps';

forEachApp(async (app) => {
    const c = L.CASES[app.name];
    if (!c) return;
    const facts = {app: app.name, line: app.line, phase: PHASE, submission: c.id};
    const log = serverLog(app);
    const from = log.mark();
    const {page, close} = await launch(app);
    const step = async (name, fn) => {
        try {
            facts[name] = await fn();
        } catch (e) {
            facts[name] = {error: L.flat(String(e.stack || e), 600)};
        }
        console.log(`[${app.name} ${name}]`, JSON.stringify(facts[name]).slice(0, 900));
    };
    try {
        // 1-2. Sign in as dbarnes, open the submission.
        await signIn(page, 'dbarnes');
        await L.openWorkflow(page, app, c.id);
        record(`k8-${PHASE}-workflow`, await screen(page));

        if (PHASE === 'steps') {
            // 3-4. "Unassign Reviewer" on Lisset Von's row, message as it comes.
            await step('unassign', async () => {
                const menu = await L.rowAction(page, L.UNASSIGN.name, 'Unassign Reviewer');
                const win = await L.readWindow(page, 'unassignReviewerForm');
                record('k8-steps-unassign-window', await screen(page));
                const since = new Date();
                const notices = await L.submitWindow(page, 'unassignReviewerForm', 'Unassign Reviewer');
                // 5. The reviewer's newest email.
                const mail = await L.readMail(page, app, L.UNASSIGN.username, since);
                return {menu, window: win, notices, mail};
            });
            // 6-7. "Cancel Review Round", the two pages as they come, "Record Decision".
            await step('cancelRound', async () => {
                await L.openWorkflow(page, app, c.id);
                const button = page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Cancel Review Round', exact: true}).first();
                await button.click();
                await page.waitForURL(/decision\/record/, {timeout: L.T});
                const pages = [];
                for (let n = 1; n < 5; n++) {
                    const p = await L.readDecisionPage(page);
                    pages.push(p);
                    record(`k8-steps-cancelround-p${n}`, await screen(page));
                    const rec = page.getByRole('button', {name: 'Record Decision', exact: true});
                    if (await rec.isVisible().catch(() => false)) break;
                    await page.getByRole('button', {name: 'Continue', exact: true}).first().click();
                    await idle(page);
                }
                const since = new Date();
                await page.getByRole('button', {name: 'Record Decision', exact: true}).click();
                await idle(page);
                await page.locator('[role="dialog"]:visible').first().waitFor({timeout: L.T}).catch(() => {});
                await L.sleep(1000);
                const after = await screen(page);
                record('k8-steps-cancelround-recorded', after);
                // 8. The notified reviewer's newest email.
                const mail = await L.readMail(page, app, L.NOTIFIED.username, since, {subject: /cancel/i});
                return {pages, recorded: L.flat(after.text.dialog || after.text.main, 400), mail};
            });
        } else {
            // N1. "Log Response": accepted, on Rajek Sharif's row.
            await step('logResponse', async () => {
                const menu = await L.rowAction(page, L.NOTIFIED.name, 'Log Response');
                const box = page.getByRole('dialog').filter({hasText: 'Record the response on behalf of the reviewer'});
                await box.waitFor({timeout: L.T});
                await box.getByRole('radio', {name: 'Reviewer has accepted the invitation to review'}).check();
                await box.getByRole('button', {name: 'Log Response', exact: true}).click();
                await box.waitFor({state: 'hidden', timeout: L.T}).catch(() => {});
                await L.openWorkflow(page, app, c.id);
                return {menu, row: L.flat(await L.reviewerRow(page, L.NOTIFIED.name).innerText(), 300)};
            });
            // N2-N3. "Cancel Reviewer", message as it comes; the reviewer's newest email.
            await step('cancelReviewer', async () => {
                const menu = await L.rowAction(page, L.NOTIFIED.name, 'Cancel Reviewer');
                // main opens form#cancelReviewForm; 3.5 opens its one form#unassignReviewerForm, labelled "Cancel Reviewer"
                await page.locator('form#cancelReviewForm, form#unassignReviewerForm').first().waitFor({timeout: L.T});
                const formId = (await page.locator('form#cancelReviewForm').count()) ? 'cancelReviewForm' : 'unassignReviewerForm';
                const win = await L.readWindow(page, formId);
                const since = new Date();
                const notices = await L.submitWindow(page, formId, 'Cancel Reviewer');
                const mail = await L.readMail(page, app, L.NOTIFIED.username, since);
                return {menu, window: win, notices, mail};
            });
            // N4. "Reinstate Reviewer"; the reviewer's newest email.
            await step('reinstate', async () => {
                await L.openWorkflow(page, app, c.id);
                const menu = await L.rowAction(page, L.NOTIFIED.name, 'Reinstate Reviewer');
                const win = await L.readWindow(page, 'reinstateReviewerForm');
                const since = new Date();
                const notices = await L.submitWindow(page, 'reinstateReviewerForm', 'Reinstate Reviewer');
                const mail = await L.readMail(page, app, L.NOTIFIED.username, since, {marker: 'review', subject: /still review/i});
                return {menu, window: win, notices, mail};
            });
        }
    } finally {
        facts.serverLog = log.since(from);
        record(`k8-${PHASE}-facts`, facts);
        await close();
    }
});
