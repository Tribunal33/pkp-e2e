// Neighbour check for docs/issues/U13-OJS8-publication-facts-start-date-typo-saved-as-other-date.md,
// walked with the fix in and out (trial.sh). On PKP's default test dataset:
//   A. the Publication Facts "Start Date", the paths the fix must leave alone:
//      a full date typed from the keyboard saves as typed, an emptied box
//      saves no date, and a date set without a key press (as a mouse paste
//      does) is what the save sends;
//   B. another window with a date box, the same cause: `dbarnes` opens
//      submission 12, "Review", the "Julie Janssen" reviewer row's
//      More Actions › "Edit", types "2026-11-31" in "Review Due Date" and
//      presses "OK" (the email Julie Janssen is sent is read from Mailpit);
//      then types "2026-11-30" and presses "OK".
// The stored values are read after each "OK". OJS only (part A is OJS's).
//
// Reset first:  npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset --apps ojs
// Run:          PROBE_RUN=nb PROBE_FEATURE=issues-ir1 PROBE_AGENT=u13ojs8 node bin/probe.js ojs shared/playwright/checks/issues/publication-facts-start-date-typo-saved-as-other-date/neighbour.js
const {forEachApp, launch, signIn, screen, shot, record, sql, idle} = require('../../../probe');
const {openPflRow, enablePfl, readPflSettings} = require('../publication-facts-settings-warn-missing-funding-plugin/lib');
const {pressPflOk, reopenPflSettings} = require('../publication-facts-settings-refused-ok-loses-changes/lib');
const {readStartDate, typeDate, setDateWithoutKeys, storedStartDate, pause} = require('./lib');

const T = 30_000;

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null});
    const {page, close} = await launch(app);
    const failures = [];
    page.on('response', (r) => { if (r.status() >= 500) failures.push(`${r.status()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`); });
    page.on('pageerror', (e) => failures.push(`pageerror ${String(e.message).slice(0, 200)}`));
    try {
        await signIn(page, 'dbarnes');

        // A. Publication Facts "Start Date".
        const row = await openPflRow(page, app);
        fact('A-enable', await enablePfl(page, row));
        await readPflSettings(page, row, 'nA-window');
        fact('A1-typed', await typeDate(page, '2026-03-15'));
        const a1 = await pressPflOk(page);
        fact('A1-ok', {...a1, notices: (await screen(page)).notices || null, stored: storedStartDate(app)});
        await reopenPflSettings(page, row);
        fact('A1-reopened', await readStartDate(page));
        fact('A2-emptied', await typeDate(page, ''));
        const a2 = await pressPflOk(page);
        fact('A2-ok', {...a2, notices: (await screen(page)).notices || null, stored: storedStartDate(app)});
        await reopenPflSettings(page, row);
        fact('A3-set-without-keys', await setDateWithoutKeys(page, '2026-03-20'));
        const a3 = await pressPflOk(page);
        fact('A3-ok', {...a3, notices: (await screen(page)).notices || null, stored: storedStartDate(app)});

        // B. Submission 12, Review, "Julie Janssen" › Edit › "Review Due Date".
        const [rr, stage] = sql(app, `select review_round_id, stage_id from review_rounds where submission_id = 12 order by round desc limit 1`).split('|');
        const due = () => sql(app, `select ra.date_due::date from review_assignments ra join users u on u.user_id = ra.reviewer_id where ra.submission_id = 12 and u.username = 'jjanssen'`);
        fact('B0-stored', due());
        await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=12&workflowMenuKey=workflow_${stage}_${rr}`)); await idle(page);
        const rrow = page.getByRole('table', {name: 'Reviewers', exact: true}).getByRole('row').filter({hasText: 'Julie Janssen'}).first();
        await rrow.waitFor({timeout: T}); await idle(page);
        const edit = page.getByRole('dialog').filter({has: page.locator('form#editReviewForm')}).last();
        const openEdit = async () => {
            await pause(700);
            await rrow.getByRole('button', {name: /More Actions/}).first().click();
            await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
            await edit.locator('form#editReviewForm').waitFor({timeout: T}); await idle(page); await pause(500);
        };
        const typeDue = async (v) => {
            const b = edit.locator('input[name="reviewDueDate-removed"]');
            await b.click(); await page.keyboard.press('Control+A'); await page.keyboard.press('Delete');
            await page.keyboard.type(v, {delay: 60}); await page.keyboard.press('Tab'); await pause(300);
            return {shown: await b.inputValue(), posted: await edit.locator('input[type=hidden][name="reviewDueDate"]').inputValue()};
        };
        const pressOk = async (n) => {
            const saved = page.waitForResponse((r) => /editReview|edit-review|updateReview|update-review/.test(r.url()) && r.request().method() === 'POST', {timeout: 8000}).catch(() => null);
            await edit.getByRole('button', {name: 'OK', exact: true}).first().click();
            const r = await saved; await idle(page); await pause(1000);
            const open = await edit.locator('form#editReviewForm').isVisible().catch(() => false);
            const s = await screen(page); record(`${n}`, s); await shot(page, n);
            return {request: r ? r.status() : null, windowOpen: open, notices: s.notices || null,
                errors: open ? (await edit.locator('label.error, .error').allInnerTexts()).map((x) => x.trim()).filter(Boolean) : null, stored: due()};
        };
        const to = 'jjanssen@mailinator.com';
        const t0 = Date.now() - 2000;
        await openEdit();
        fact('B1-typed', await typeDue('2026-11-31'));
        fact('B1-ok', await pressOk('nB1-ok'));
        // The email Julie Janssen is sent when the due date changes (Mailpit is
        // shared by the slot's fleets: only messages after t0 count).
        let mail = null;
        for (let i = 0; i < 20 && !mail; i++) {
            const res = await app.mail._search({to});
            const m = (res.messages || []).find((x) => Date.parse(x.Created) >= t0);
            if (m) {
                const full = await app.mail.fullMessage(m.ID);
                const text = String(full.Text || '').replace(/\s+/g, ' ');
                const grab = (label) => { const i2 = text.indexOf(label); return i2 < 0 ? null : text.slice(i2, i2 + label.length + 24).trim(); };
                mail = {subject: m.Subject, created: m.Created, submitBy: grab('Submit Review By:'), acceptBy: grab('Accept or Decline By:')};
            } else {
                await pause(1000);
                if (i === 5) await page.reload().then(() => idle(page)).catch(() => {}); // a web request runs the queued job
            }
        }
        fact('B1-mail', mail);
        if (!(await edit.locator('form#editReviewForm').isVisible().catch(() => false))) await openEdit();
        fact('B2-typed', await typeDue('2026-11-30'));
        fact('B2-ok', await pressOk('nB2-ok'));
    } finally {
        fact('failures', failures);
        record('facts', facts);
        await close();
    }
});
