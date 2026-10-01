// Issue report docs/issues/U52-A11-merged-payer-breaks-payments.md (U52 A11):
// after an article's fee is recorded "Paid" and the author's account is merged
// into another, the journal's list of payments, the submission's workflow and
// its publishing fail. Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, freshly reset), OJS only (the one
// app with the surface):
//   preconditions, as rvaca: Settings › Distribution › "Payments" ("Enable",
//   USD, "Manual Fee Payment", instructions, "Save"); "Payments" ›
//   "Payment Types" › "Article Processing Charge" 50, "Save".
//   1. open submission 6; 2. "Payments" › "Paid" › "Save";
//   3. "Payments" › "Payments" tab (before);
//   4. Users & Roles › dphillips's "…" › "Merge user";
//   5. ccorino's row › "Merge into this User" › "OK";
//   6. "Payments" › "Payments" tab; 7. open submission 6; 8. its "Payments";
//   9. "Schedule For Publication" › an issue › "Confirm".
// On 3.5 (PKP_E2E_LINE=stable-3_5_0) the steps are the same; "Schedule For
// Publication" opens the publish window at once (no "Review Publishing
// Details" step) and the side menu's key carries no version.
// Also reads (for Evidence) completed_payments before and after.
// Run: PROBE_FEATURE=issues-w42 PROBE_AGENT=w42 node bin/probe.js ojs shared/playwright/checks/issues/merged-payer-breaks-payments/walk.js
//      (reset first: npm run fleet-prep -- --feature issues-w42 --dataset 2 --reset;
//       on 3.5 put PKP_E2E_LINE=stable-3_5_0 in front of both, with --feature issues-w42-3_5 and PROBE_RUN=r35)
const {forEachApp, launch, signIn, screen, record, shot, idle, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const LEGACY = process.env.PKP_E2E_LINE === 'stable-3_5_0';
const SID = 6;
const SOURCE = 'dphillips';
const TARGET = 'ccorino';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    if (app.name !== 'ojs') return;
    const {UsersListPage, MergeUserWindow} = require('../../../pages/UsersManagementPages.js');
    const {PaymentSettingsTab, JournalPaymentsPage} = require('../../../pages/PaymentsPages.js');
    const ctx = app.contextPath;
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 1200)}`);
    };
    const db = () => sql(app, `select cp.completed_payment_id, cp.payment_type, cp.assoc_id, cp.amount, cp.currency_code_alpha, coalesce(u.username, 'NULL') from completed_payments cp left join users u on u.user_id = cp.user_id order by 1`).split('\n').filter(Boolean);
    const pubId = sql(app, `select current_publication_id from submissions where submission_id = ${SID}`);
    const ctxUrl = (p) => app.url(`/index.php/${ctx}/en${p}`);

    const {page, close} = await launch(app);
    const responses = [];
    page.on('response', (r) => {
        if (r.status() >= 500) responses.push({status: r.status(), url: r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 200)});
    });

    // The "Payments" page's "Payments" tab: the list's answer and what it shows after 8 s.
    const paymentsList = async (label) => {
        const pp = new JournalPaymentsPage(page, ctx);
        await pp.goto();
        const answer = page.waitForResponse((r) => /payments-grid\/fetch-grid/.test(r.url()), {timeout: T}).catch(() => null);
        await pp.tab('Payments').click();
        const r = await answer;
        await sleep(8000);
        const s = await screen(page);
        record(label, s);
        await shot(page, label);
        const grid = pp.panel('Payments');
        return {
            fetchGrid: r ? r.status() : 'no request',
            panelText: flat(await grid.innerText().catch(() => null), 500),
            rows: (await grid.locator('tr.gridRow').allInnerTexts().catch(() => [])).map((x) => flat(x, 200)),
        };
    };

    // Open the workflow; return what it shows.
    const openWorkflow = async (label) => {
        const errs = responses.length;
        await page.goto(ctxUrl(`/dashboard/editorial?workflowSubmissionId=${SID}`));
        await idle(page);
        await sleep(3000);
        await idle(page);
        const s = await screen(page);
        record(label, s);
        await shot(page, label);
        const dialogs = await page.locator('[role="dialog"]:visible').evaluateAll((els) => els.map((d) => d.innerText.replace(/\s+/g, ' ').trim().slice(0, 300))).catch(() => []);
        // An "Error" window over the workflow is answered with its "OK", as a person would.
        const err = page.getByRole('dialog').filter({has: page.getByRole('heading', {name: 'Error', exact: true})});
        let errorOk = false;
        if (await err.count()) {
            await err.getByRole('button', {name: 'OK', exact: true}).click();
            await err.waitFor({state: 'hidden', timeout: T}).catch(() => {});
            await sleep(600);
            errorOk = true;
        }
        return {dialogs, errorOk, notices: s.notices, newServerErrors: responses.slice(errs)};
    };

    const payBtn = () => page.locator('.pkpWorkflow__submissionPayments > button, .pkpWorkflow__submissionPayments button').filter({hasText: /^\s*Payments\s*$/}).first();
    const payContent = () => page.locator('.pkpWorkflow__submissionPayments .pkpDropdown__content');
    const readMenu = async (label) => {
        const errs = responses.length;
        if (!(await payBtn().count())) return {button: false};
        if (!(await payContent().isVisible().catch(() => false))) await payBtn().click();
        await payContent().waitFor({timeout: 10000}).catch(() => {});
        await page.locator('.pkpWorkflow__submissionPayments input[type=radio]').first().waitFor({timeout: 10000}).catch(() => {});
        await idle(page);
        await sleep(500);
        await shot(page, label);
        const m = await payContent().evaluate((el) => ({
            text: el.innerText.replace(/\s+/g, ' ').trim(),
            radios: [...el.querySelectorAll('input[type=radio]')].map((r) => `${((r.closest('label') || r.parentElement).innerText || '').trim()}${r.checked ? '*' : ''}`),
        })).catch((e) => ({err: e.message.slice(0, 200)}));
        return {...m, newServerErrors: responses.slice(errs)};
    };
    const saveMenu = async (option) => {
        await readMenu('2-menu-open');
        await payContent().getByRole('radio', {name: option, exact: true}).check({force: true});
        const answer = page.waitForResponse((r) => /\/_submissions\/\d+\/payment(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
        await payContent().getByRole('button', {name: 'Save', exact: true}).click();
        const r = await answer;
        const saved = await payContent().locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
        return {status: r.status(), saved};
    };

    // Schedule For Publication: the window and, when it opens, "Confirm".
    const tryPublish = async (label) => {
        const errs = responses.length;
        const out0 = {};
        // The side menu's "Title & Abstract" under "Publication" (3.5's menu key carries no version).
        const key = LEGACY ? 'publication_titleAbstract' : `publication_${pubId}_titleAbstract`;
        await page.goto(ctxUrl(`/dashboard/editorial?workflowSubmissionId=${SID}&workflowMenuKey=${key}`));
        await idle(page);
        await sleep(2000);
        const err = page.getByRole('dialog').filter({has: page.getByRole('heading', {name: 'Error', exact: true})});
        if (await err.count()) {
            out0.errorWindow = flat(await err.innerText(), 300);
            await err.getByRole('button', {name: 'OK', exact: true}).click();
            await sleep(800);
        }
        const btn = page.getByRole('button', {name: 'Schedule For Publication', exact: true}).last();
        const out = {...out0, button: await btn.count()};
        if (!out.button) {
            record(`${label}-no-button`, await screen(page));
            return {...out, newServerErrors: responses.slice(errs)};
        }
        const modalAnswer = page.waitForResponse((r) => /modals\/publish\/publish\/publish/.test(r.url()), {timeout: T}).catch(() => null);
        await btn.click();
        const ma = await modalAnswer;
        out.publishWindowAnswer = ma ? ma.status() : 'no request';
        await idle(page);
        await sleep(2500);
        const panel = page.locator('[role="dialog"]:visible').last();
        out.windowText = flat(await panel.innerText().catch(() => null), 700);
        await shot(page, `${label}-window`);
        record(`${label}-window`, await screen(page));
        // 3.5: the first window asks for the issue ("Select an issue to schedule for
        // publication"); its "Save" then opens the publish window.
        const issueSelect = panel.locator('select[name="issueId"]');
        if (LEGACY && /Select an issue to schedule/.test(out.windowText || '')) {
            const v = await issueSelect.locator('option').filter({hasText: 'Vol. 1 No. 2'}).first().getAttribute('value').catch(() => null);
            if (v) await issueSelect.selectOption(v);
            out.issueChosen = v;
            const ans = page.waitForResponse((r) => /publish/.test(r.url()), {timeout: T}).catch(() => null);
            await panel.getByRole('button', {name: 'Save', exact: true}).click();
            const a = await ans;
            out.saveAnswer = a ? {status: a.status(), url: a.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 160)} : 'no request';
            await idle(page);
            await sleep(2500);
            const s = await screen(page);
            record(`${label}-after-save`, s);
            await shot(page, `${label}-after-save`);
            out.afterSave = {
                dialogs: await page.locator('[role="dialog"]:visible').evaluateAll((els) => els.map((d) => d.innerText.replace(/\s+/g, ' ').trim().slice(0, 300))).catch(() => []),
                notices: s.notices,
            };
            return {...out, newServerErrors: responses.slice(errs)};
        }
        // The required choices ("Publication Stage", "Revision Significance"), as a person makes them.
        const stage = panel.getByRole('combobox', {name: /^Publication Stage/});
        if (await stage.count()) await stage.selectOption({label: 'Version of Record (VoR)'});
        const significance = panel.getByRole('combobox', {name: /^Revision Significance/});
        if (await significance.count()) await significance.selectOption({label: 'Major Revision'});
        const issueRadio = panel.getByRole('radio', {name: 'Assign To Current/Back Issue', exact: true});
        if (await issueRadio.count()) {
            await issueRadio.check().catch(() => {});
            const sel = panel.locator('select[name="issueId"]');
            await sel.locator('option').filter({hasText: 'Vol. 1 No. 2'}).first().waitFor({state: 'attached', timeout: 15000}).catch(() => {});
            const v = await sel.locator('option').filter({hasText: 'Vol. 1 No. 2'}).first().getAttribute('value').catch(() => null);
            out.issueChosen = v;
            if (v) await sel.selectOption(v);
        }
        const confirm = panel.getByRole('button', {name: 'Confirm', exact: true});
        if (await confirm.count()) {
            const ans = page.waitForResponse((r) => /publish/.test(r.url()), {timeout: T}).catch(() => null);
            await confirm.click();
            const a = await ans;
            out.confirmAnswer = a ? {status: a.status(), url: a.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 160)} : 'no request';
            await idle(page);
            await sleep(2500);
            const s = await screen(page);
            record(`${label}-after-confirm`, s);
            await shot(page, `${label}-after-confirm`);
            out.afterConfirm = {
                dialogs: await page.locator('[role="dialog"]:visible').evaluateAll((els) => els.map((d) => d.innerText.replace(/\s+/g, ' ').trim().slice(0, 300))).catch(() => []),
                notices: s.notices,
            };
        }
        return {...out, newServerErrors: responses.slice(errs)};
    };

    try {
        fact('db at start', db());
        await signIn(page, 'rvaca');

        // Preconditions: payments on, APC 50.
        const settings = new PaymentSettingsTab(page, ctx);
        await settings.goto();
        await settings.enableBox().check();
        await settings.currencySelect().selectOption('USD');
        await settings.pluginSelect().selectOption('ManualPayment');
        await settings.instructionsBox().waitFor({timeout: T});
        await settings.instructionsBox().fill('Pay by bank transfer.');
        await settings.save();
        const pp = new JournalPaymentsPage(page, ctx);
        await pp.goto();
        const types = await pp.showPaymentTypes();
        await types.type('Article Processing Charge', '50');
        await types.form().getByRole('button', {name: 'Save', exact: true}).click();
        await types.savedNotice().first().waitFor({timeout: T}).catch(() => {});
        await idle(page);

        // 1–2
        fact('1 workflow before', await openWorkflow('1-workflow-before'));
        fact('2 paid', await saveMenu('Paid'));
        // 3 (control: steps 6–9's reads before the merge)
        fact('3 list before merge', await paymentsList('3-list-before'));
        fact('3b menu before merge', await (async () => { await openWorkflow('3b-workflow-before'); return readMenu('3b-menu-before'); })());
        fact('db after paid', db());

        // 4–5
        const list = new UsersListPage(page, ctx);
        await list.goto();
        await list.chooseAction(list.row(`${SOURCE}@mailinator.com`), 'Merge user');
        const merge = new MergeUserWindow(page);
        await merge.expectOpen();
        await merge.mergeInto(`${TARGET}@mailinator.com`);
        const confirmText = LEGACY ? flat(await merge.confirmDialog.innerText()) : await merge.confirmText();
        const answer = await merge.confirm();
        await sleep(3000);
        fact('5 merge', {confirmText, status: answer.status(), mergeWindowStillOpen: await merge.dialog.isVisible()});
        fact('db after merge', db());
        fact('db merged account', sql(app, `select count(*) from users where username = '${SOURCE}'`));

        // 6–9
        fact('6 list after merge', await paymentsList('6-list-after'));
        fact('7 workflow after merge', await openWorkflow('7-workflow-after'));
        fact('8 menu after merge', await readMenu('8-menu-after'));
        fact('9 publish after merge', await tryPublish('9-publish-after'));
    } finally {
        fact('server errors', responses);
        record('facts', facts);
        await close();
    }
});
