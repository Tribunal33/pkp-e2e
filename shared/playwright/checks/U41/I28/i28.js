// U41 claim check, chunk I28 (housekeeping 2026-09-28): incidentals row L56.
// Row: on a context with French under "Forms" but not among the submission languages, the "Add Contributor"
// window's "Save" is refused with no message and the window stays under "Saving" (the API answers 400
// "This language is not accepted." for the organization name). Spec: docs/specs/U41-contributors-and-affiliations.md,
// Fields & validation (preamble, lines 54-68) and footnote c.
//
//   PROBE_FEATURE=U41 PROBE_AGENT=ccI28 RUN=r1 node bin/probe.js all shared/playwright/checks/U41/I28/i28.js
//   PROBE_FEATURE=U41 PROBE_AGENT=ccI28 RUN=r2 node bin/probe.js all shared/playwright/checks/U41/I28/i28.js
//
// Each run seeds its own scratch contexts (tag prefix u41i28), so a later build re-runs it as is:
//   A  "Forms" English + French (Canada), submission languages English only (the row's context);
//   B  the control: French (Canada) also a submission language.
// Users per context: <t>mg manager, <t>se section editor (assigned), <t>au author (submitter).
// Submissions: A.s submitted, A.d a draft (the wizard's Contributors step), B.s submitted.
// Legs (facts file i28-<RUN>-facts-<app>.json, one key per leg):
//   A.mg.person / A.mg.org / A.mg.anon   manager, workflow "Add Contributor", each type, "Save";
//                                        then the stuck window left with "Close" (dialogs on the way out),
//                                        the list read on the page and after a reload.
//   A.mg.edit                            manager, the submitter's own row "Edit", Country picked (A16), "Save".
// After a refused save: "Jump to next error" and the first "Go to …" pressed (the focus recorded), a visible box
// edited (does Save come back?), then the window left with "Close".
//   A.se.person                          the assigned section editor (sub-editor level), Person.
//   A.au.wizard                          the author on the draft's wizard "Contributors" step, Person.
//   A.au.workflow (OPS only)             the author on their own submitted preprint's workflow Contributors, Person.
//   B.mg.person / B.mg.org               the control context, Person and Organization.
// No assertions: the script records, the reader judges.
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, note, idle, tag} = require('../../../probe');

const RUN = process.env.RUN || 'r1';
const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

forEachApp(async (app) => {
    const log = (...a) => console.log(`[i28 ${RUN} ${app.name}]`, ...a);
    const fact = (k, v) => { record(`i28-${RUN}-facts`, {[k]: v}, {merge: true}); log(k, JSON.stringify(v).slice(0, 1500)); };
    const cu = (ctx, p = '') => app.url(`/index.php/${ctx}/en${p}`);

    // ------------------------------------------------------------------ seed
    const mk = async (suffix, submissionLocales) => {
        const t = tag(`u41i28${suffix}`);
        const users = [
            {username: `${t}mg`, roles: ['manager'], givenName: 'Mona', familyName: 'Manager'},
            {username: `${t}se`, roles: ['sectionEditor'], givenName: 'Sid', familyName: 'Subeditor'},
            {username: `${t}au`, roles: ['author'], givenName: 'Alma', familyName: 'Author'},
        ];
        const ctx = await app.api.createContext({tag: t, users, context: {
            name: `U41 I28 ${suffix} ${t}`, contactName: 'Paula Principal', contactEmail: `principal${t}@mail.test`,
            supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA'], supportedSubmissionLocales: submissionLocales}});
        const s = await app.api.createSubmission({tag: `${t}s`, context: t, submitter: `${t}au`, title: `I28 ${suffix} submitted`,
            participants: [{username: `${t}se`, role: 'sectionEditor'}]});
        const out = {path: ctx.path || t, mg: `${t}mg`, se: `${t}se`, au: `${t}au`, s: {id: s.submissionId, pub: s.publicationId}};
        if (suffix === 'a') {
            const d = await app.api.createSubmission({tag: `${t}d`, context: t, submitter: `${t}au`, title: `I28 ${suffix} draft`, submitted: false});
            out.d = {id: d.submissionId, pub: d.publicationId};
        }
        return out;
    };
    const A = await mk('a', ['en']);
    const B = await mk('b', ['en', 'fr_CA']);
    fact('seed', {A, B});

    const {page, close} = await launch(app);
    // our own traffic log of the contributors API: request body and the answer's body
    const traffic = [];
    page.on('response', async (r) => {
        const u = r.url();
        if (!/\/contributors(\/\d+)?(\?|$)/.test(u)) return;
        const req = r.request();
        if (req.method() === 'GET') return;
        let body = null;
        try { body = (await r.text()).slice(0, 1500); } catch (e) { body = `unread: ${e.message}`; }
        traffic.push({t: Date.now(), method: req.method(), override: req.headers()['x-http-method-override'] || null,
            url: u.replace(/^https?:\/\/[^/]+/, ''), status: r.status(), sent: (req.postData() || '').slice(0, 2500), body});
    });
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push({t: Date.now(), msg: flat(e.message, 300)}));
    const consoleErr = [];
    page.on('console', (m) => { if (m.type() === 'error') consoleErr.push({t: Date.now(), msg: flat(m.text(), 300)}); });
    const browserDialogs = [];
    page.on('dialog', async (d) => { browserDialogs.push({t: Date.now(), type: d.type(), msg: d.message()}); await d.accept().catch(() => {}); });
    const since = (arr, t0) => arr.filter((x) => x.t >= t0).map(({t, ...x}) => x);

    const snap = async (name, extra = {}) => {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 200)}; }
        record(`i28-${RUN}-${name}`, {...s, ...extra});
        await shot(page, `i28-${RUN}-${name}`).catch(() => {});
        return s;
    };
    const panel = () => page.locator('.listPanel--contributor').first();
    const rows = async () => (await panel().locator('li.listPanel__item').allInnerTexts().catch(() => [])).map((x) => flat(x, 160));
    const formDialog = () => page.getByRole('dialog', {name: /^(Add Contributor|Edit)$/});
    const as = async (u, ctx) => { await signIn(page, u, {contextPath: ctx}); await idle(page).catch(() => {}); };

    async function openWorkflowContributors(ctx, sub) {
        await page.goto(cu(ctx, `/dashboard/editorial?workflowSubmissionId=${sub.id}&workflowMenuKey=publication_${sub.pub}_contributors`));
        await idle(page).catch(() => {});
        await panel().waitFor({timeout: 15000}).catch(() => {});
        if (!(await panel().isVisible().catch(() => false))) {
            const link = page.locator('[role="dialog"]:visible').first().getByRole('link', {name: 'Contributors', exact: true});
            if (await link.count()) { await link.last().click(); await idle(page).catch(() => {}); }
            await panel().waitFor({timeout: T});
        }
        await idle(page).catch(() => {});
        await sleep(500);
    }
    async function openWizardContributors(ctx, sub) {
        await page.goto(cu(ctx, `/submission?id=${sub.id}`));
        await idle(page).catch(() => {});
        for (let i = 0; i < 5 && !(await panel().isVisible().catch(() => false)); i++) {
            const cont = page.getByRole('button', {name: 'Continue', exact: true});
            if (!(await cont.count())) break;
            await cont.first().click(); await idle(page).catch(() => {}); await sleep(800);
        }
        await panel().waitFor({timeout: T});
        await idle(page).catch(() => {});
    }
    /** The open form as data: every control's name, the language toggles, the foot. */
    async function formInfo() {
        const d = formDialog();
        if (!(await d.count())) return {open: false};
        return d.last().evaluate((root) => {
            const vis = (e) => e.getClientRects().length > 0;
            return {
                open: true,
                controls: [...root.querySelectorAll('input, select, textarea')].filter(vis).map((i) => i.name || i.id).filter(Boolean),
                localeButtons: [...root.querySelectorAll('.pkpFormLocales button, [class*="ocale"] button')].filter(vis).map((b) => b.innerText.trim()).filter(Boolean),
                fieldErrors: [...root.querySelectorAll('.pkpFieldError')].filter(vis).map((e) => e.innerText.trim()),
                foot: [...root.querySelectorAll('.pkpFormPage__footer, .pkpFormPage__status, [role="status"], [role="alert"]')].filter(vis).map((e) => e.innerText.replace(/\s+/g, ' ').trim()),
                buttons: [...root.querySelectorAll('button')].filter(vis).map((b) => ({t: (b.innerText || b.getAttribute('aria-label') || '').trim(), disabled: b.disabled})).filter((b) => b.t).slice(0, 40),
            };
        });
    }

    /** One add (or edit) leg: fill by type, Save, read after 10 s, then leave with Close, then the list and a reload. */
    async function leg(name, {open, type = 'Person', edit = null, reopen}) {
        const t0 = Date.now();
        const r = {};
        await open();
        r.rowsBefore = await rows();
        await snap(`${name}-list`);
        if (edit) {
            await panel().locator('li.listPanel__item').filter({hasText: edit}).getByRole('button', {name: 'Edit', exact: true}).click();
        } else {
            await panel().getByRole('button', {name: 'Add Contributor', exact: true}).click();
        }
        const d = formDialog().last();
        await d.waitFor({timeout: T});
        await idle(page).catch(() => {});
        await sleep(500);
        r.formOpened = await formInfo();
        await snap(`${name}-form`);
        const stamp = `${Date.now()}`.slice(-6);
        if (edit) {
            // the seeded submitter's row arrives without a Country (register A16): pick one so the save reaches the server
            await d.locator('select[name="country"]').selectOption({label: 'Canada'});
            r.formFilled = await formInfo();
        } else {
            if (type !== 'Person') await d.getByRole('radio', {name: type, exact: true}).check();
            await sleep(300);
            if (type === 'Person') {
                await d.locator('input[name="givenName-en"]').fill(`Pat${stamp}`);
                await d.locator('input[name="familyName-en"]').fill('Person');
            }
            if (type === 'Organization or group') await d.locator('input[name="organizationName-en"]').fill(`Org${stamp}`);
            await d.locator('input[name="email"]').fill(`i28${stamp}@mail.test`);
            await d.locator('select[name="country"]').selectOption({label: 'Canada'});
            const author = d.getByRole('checkbox', {name: 'Author', exact: true});
            if (await author.count() && !(await author.isChecked())) await author.check();
            r.formFilled = await formInfo();
        }
        const tSave = Date.now();
        await d.getByRole('button', {name: 'Save', exact: true}).click();
        await sleep(1500);
        r.afterSave1500 = await formInfo();
        await sleep(8500);
        r.afterSave10s = await formInfo();
        r.traffic = since(traffic, tSave);
        await snap(`${name}-after-save`, {traffic: r.traffic});
        r.stillOpen = (await formDialog().count()) > 0;
        if (r.stillOpen) {
            // the foot's "Jump to next error": where does it take the focus?
            const jump = formDialog().last().getByText('Jump to next error');
            if (await jump.count()) {
                await jump.first().click().catch((e) => { r.jumpErr = flat(e.message, 200); });
                await sleep(800);
                r.jump = await page.evaluate(() => { const a = document.activeElement; return a ? {tag: a.tagName, name: a.getAttribute('name'), id: a.id, text: (a.innerText || '').trim().slice(0, 80)} : null; });
                r.afterJump = await formInfo();
                await snap(`${name}-after-jump`);
            }
            // the foot's per-error "Go to …" buttons: where does the first take the focus?
            const goTo = formDialog().last().getByRole('button', {name: /^Go to /});
            r.goToButtons = (await goTo.allInnerTexts().catch(() => [])).map((x) => flat(x, 160));
            if (r.goToButtons.length) {
                await goTo.first().click().catch((e) => { r.goToErr = flat(e.message, 200); });
                await sleep(800);
                r.goTo = await page.evaluate(() => { const a = document.activeElement; return a ? {tag: a.tagName, name: a.getAttribute('name'), id: a.id, text: (a.innerText || '').trim().slice(0, 80)} : null; });
            }
            // a visible field edited after the refusal: does Save come back?
            if (!edit) {
                const boxName = type === 'Organization or group' ? 'organizationName-en' : type === 'Anonymous' ? 'email' : 'givenName-en';
                const box = formDialog().last().locator(`input[name="${boxName}"]`);
                await box.fill(`${await box.inputValue()}x`).catch((e) => { r.editVisibleErr = flat(e.message, 200); });
                await box.press('Tab').catch(() => {});
                await sleep(1000);
                r.afterEditVisible = await formInfo();
                await snap(`${name}-after-edit-visible`);
            }
            // leave the stuck window with its own Close (the way out; any dialog on the way is recorded)
            const tClose = Date.now();
            await formDialog().last().getByRole('button', {name: 'Close', exact: true}).first().click().catch((e) => { r.closeErr = flat(e.message, 200); });
            await sleep(1500);
            r.afterClose = {formStillOpen: (await formDialog().count()) > 0,
                dialogs: (await page.locator('[role="dialog"]:visible, [role="alertdialog"]:visible').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim().slice(0, 300)))),
                browserDialogs: since(browserDialogs, tClose)};
            await snap(`${name}-after-close`);
        }
        await sleep(600);
        r.rowsSamePage = await rows();
        await snap(`${name}-list-after`);
        await reopen();
        r.rowsAfterReload = await rows();
        await snap(`${name}-list-reload`);
        r.pageErrors = since(pageErrors, t0);
        r.consoleErrors = since(consoleErr, t0);
        r.browserDialogs = since(browserDialogs, t0);
        fact(name, r);
        return r;
    }

    const wfA = () => openWorkflowContributors(A.path, A.s);
    const wfB = () => openWorkflowContributors(B.path, B.s);
    const step = async (name, fn) => { try { await fn(); } catch (e) { fact(`${name}.FAILED`, flat(e.stack || e, 900)); await snap(`${name}-FAILED`).catch(() => {}); } };

    try {
        await as(A.mg, A.path);
        await step('A.mg.person', () => leg('A.mg.person', {open: wfA, reopen: wfA}));
        await step('A.mg.org', () => leg('A.mg.org', {open: wfA, reopen: wfA, type: 'Organization or group'}));
        await step('A.mg.anon', () => leg('A.mg.anon', {open: wfA, reopen: wfA, type: 'Anonymous'}));
        await step('A.mg.edit', () => leg('A.mg.edit', {open: wfA, reopen: wfA, edit: 'Alma'}));
        await signOut(page).catch(() => {});

        await as(A.se, A.path);
        await step('A.se.person', () => leg('A.se.person', {open: wfA, reopen: wfA}));
        await signOut(page).catch(() => {});

        await as(A.au, A.path);
        if (app.name === 'ops') {
            // OPS1: the submitting author edits their own preprint's contributors in the workflow too
            const auWf = async () => {
                await page.goto(cu(A.path, `/dashboard/mySubmissions?workflowSubmissionId=${A.s.id}&workflowMenuKey=publication_${A.s.pub}_contributors`));
                await idle(page).catch(() => {});
                await panel().waitFor({timeout: 15000}).catch(() => {});
                if (!(await panel().isVisible().catch(() => false))) {
                    const link = page.locator('[role="dialog"]:visible').first().getByRole('link', {name: 'Contributors', exact: true});
                    if (await link.count()) { await link.last().click(); await idle(page).catch(() => {}); }
                    await panel().waitFor({timeout: T});
                }
                await idle(page).catch(() => {});
            };
            await step('A.au.workflow', () => leg('A.au.workflow', {open: auWf, reopen: auWf}));
        }
        const wiz = () => openWizardContributors(A.path, A.d);
        await step('A.au.wizard', () => leg('A.au.wizard', {open: wiz, reopen: wiz}));
        await signOut(page).catch(() => {});

        await as(B.mg, B.path);
        await step('B.mg.person', () => leg('B.mg.person', {open: wfB, reopen: wfB}));
        await step('B.mg.org', () => leg('B.mg.org', {open: wfB, reopen: wfB, type: 'Organization or group'}));
        await signOut(page).catch(() => {});
    } finally {
        await close();
    }
    if (RUN === 'r1') {
        note(`ccI28 [${app.name}]: the contributors page opens at dashboard/editorial?workflowSubmissionId={id}&workflowMenuKey=publication_{publicationId}_contributors (the seed's publicationId); the Add/Edit form is getByRole('dialog', {name: /^(Add Contributor|Edit)$/}); its controls are named givenName-{locale}, organizationName-{locale}, email, country; the author's wizard reaches the step by pressing "Continue" until .listPanel--contributor shows.`);
    }
});
