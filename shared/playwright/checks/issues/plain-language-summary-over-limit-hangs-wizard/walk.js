// Issue report walk: docs/issues/U21-A16-plain-language-summary-over-limit-hangs-wizard.md
// (spec U21 register A16). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"):
// `rvaca` turns the plain language summary on and gives the first section a
// 10-word limit, `ccorino` starts a submission and types a 20-word summary on
// "Details". The kit builds nothing; every change is made on screen. OJS and
// OPS (a press's series carry no word limit). Reset the fleet before each walk.
//
//   PHASE=all (default)  setup (Steps 1-5), the walk (6-14), then the neighbour
//   ABSTRACT=1           with PHASE=all: an abstract is typed beside the summary in step 10
//                        and read again after the reload (Impact, "Lost")
//   PHASE=neighbour      setup, then only the neighbour: `dbarnes` on a submitted
//                        submission of the same section, Publication › "Title &
//                        Abstract", a 20-word summary, "Save": must stay refused
//                        with and without fix.diff
//
// Run (main, then stable-3_5_0):
//   npm run fleet-prep -- --feature issues-w31 --dataset 4 --reset
//   PROBE_FEATURE=issues-w31 PROBE_AGENT=w31 node bin/probe.js all shared/playwright/checks/issues/plain-language-summary-over-limit-hangs-wizard/walk.js
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-w31-3_5 --dataset 4 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w31-3_5 PROBE_AGENT=w31 node bin/probe.js all <this file>
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');

const T = 30_000;
const PHASE = process.env.PHASE || 'all';
const RUN = process.env.PROBE_RUN || 'main';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const endAnchored = (name) => new RegExp(`${esc(name)}\\s*$`);
const TWENTY = 'one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty';
const PLS_WIZARD = 'titleAbstract-plainLanguageSummary-control-en';
const ABS_WIZARD = 'titleAbstract-abstract-control-en';
const ABSTRACT = !!process.env.ABSTRACT;

forEachApp(async (app) => {
    if (app.name === 'omp') { record('skipped', {why: 'a press series has no word limit'}); return; }
    const isOPS = app.name === 'ops';
    const ctx = app.contextPath;
    const SECTION = isOPS ? 'Preprints' : 'Articles';
    const NEIGHBOUR_ID = isOPS ? 1 : 4; // submitted, unpublished, in SECTION (dataset.md)
    const facts = {app: app.name, line: app.line, run: RUN};
    const save = () => record('facts', facts);

    const {page, close} = await launch(app);
    const traffic = [];
    const errs = [];
    page.on('response', async (r) => {
        const u = r.url();
        if (!/\/api\/v1\//.test(u)) return;
        const m = r.request().method();
        if (m === 'GET') return;
        traffic.push({at: Date.now(), op: r.request().headers()['x-http-method-override'] || m,
            url: u.replace(/^https?:\/\/[^/]+/, '').split('?')[0], status: r.status(), body: flat(await r.text().catch(() => null), 500)});
    });
    page.on('pageerror', (e) => errs.push({at: Date.now(), text: flat(e.message, 300)}));
    page.on('console', (m) => { if (m.type() === 'error') errs.push({at: Date.now(), console: true, text: flat(m.text(), 300)}); });
    page.on('dialog', async (d) => { if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {}); });
    let n = 0;
    async function snap(name) {
        const s = await screen(page).catch((e) => ({url: page.url(), error: flat(e.message), text: {}}));
        const id = `${String(++n).padStart(2, '0')}-${name}`;
        record(id, s);
        await shot(page, id).catch(() => {});
        return s;
    }

    try {
        // ------------------------------------------------------------ Steps 1-5: setup as the manager
        await signIn(page, 'rvaca');
        const {WorkflowSubmissionSettings} = require('../../../pages/SubmissionIntakePages.js');
        const wf = new WorkflowSubmissionSettings(page, ctx);
        await wf.goto('Metadata');
        await snap('settings-metadata');
        const box = wf.metadata.box('Enable plain language summary metadata');
        facts.plsOffered = (await box.count()) > 0;
        if (!facts.plsOffered) { save(); return; } // 3.5: no plain language summary at all
        await box.check();
        await wf.metadata.choice('Enable plain language summary metadata', 'Ask the author to provide a plain language summary during submission.').check();
        const metaSave = page.waitForResponse((r) => r.request().method() !== 'GET' && /\/contexts\/\d+/.test(r.url()), {timeout: T});
        await wf.metadata.saveButton.click();
        facts.metadataSave = (await metaSave).status();
        await snap('settings-metadata-saved');

        const {SectionsTab} = require('../../../pages/SectionsPages.js');
        const tab = new SectionsTab(page, ctx);
        await tab.goto();
        const win = await tab.openEdit(SECTION);
        await win.type('wordCount', '10');
        await snap('section-edit-word-count');
        facts.sectionSave = (await win.saveAndClose()).status();
        await signOut(page);

        if (PHASE === 'all') {
            // -------------------------------------------------------- Steps 6-14: the author
            await signIn(page, 'ccorino');
            await page.goto(app.url(`/index.php/${ctx}/en/submission`));
            await page.getByRole('button', {name: 'Begin Submission'}).waitFor({timeout: T});
            await idle(page);
            const titleId = 'startSubmission-title-control';
            await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), titleId, {timeout: T});
            await page.frameLocator(`#${titleId}_ifr`).locator('body').click();
            await page.keyboard.type('u21w31 Plain language summary over the limit');
            const sectionRadio = page.getByRole('radio', {name: SECTION, exact: true});
            if (await sectionRadio.count()) await sectionRadio.check();
            const english = page.getByRole('radio', {name: 'English', exact: true});
            if (await english.count()) await english.check();
            await page.getByRole('checkbox', {name: 'Yes, my submission meets all of these requirements.'}).check();
            await page.getByRole('checkbox', {name: /I agree to have my data collected and stored/}).check();
            await snap('start-form');
            await page.getByRole('button', {name: 'Begin Submission'}).click();
            await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45_000});
            await page.locator('.pkpSteps').waitFor({timeout: T});
            await idle(page);
            facts.wizardUrl = page.url();

            const footer = page.locator('.submissionWizard__footer');
            const cur = page.locator('.pkpSteps__step__label--current');
            const curText = async () => flat(await cur.innerText().catch(() => ''), 80);
            const lastSaved = async () => flat(await page.locator('.submissionWizard__lastSaved').innerText().catch(() => null), 120);
            async function nextStep() {
                const labels = (await page.locator('.pkpSteps__step__label').allInnerTexts()).map((x) => flat(x));
                const c = await curText();
                const k = labels.findIndex((l) => l === c);
                return labels[k + 1].replace(/^\d+\s*/, '');
            }
            async function pressContinue() {
                const next = await nextStep();
                await footer.getByRole('button', {name: 'Continue', exact: true}).click();
                await cur.filter({hasText: endAnchored(next)}).waitFor({timeout: 10_000}).catch(() => {});
                await idle(page);
                return next;
            }
            facts.path = [await curText()];
            for (let i = 0; i < 6 && !/Details\s*$/.test(await curText()); i++) facts.path.push(await pressContinue());
            await page.locator(`#${PLS_WIZARD}_ifr`).waitFor({timeout: T});
            await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), PLS_WIZARD, {timeout: T});
            await page.frameLocator(`#${PLS_WIZARD}_ifr`).locator('body').click();
            await page.keyboard.type(TWENTY);
            if (ABSTRACT) { // ABSTRACT=1: an abstract typed in the same visit (is it lost with the summary?)
                await page.frameLocator(`#${ABS_WIZARD}_ifr`).locator('body').click();
                await page.keyboard.type('u21w31 a short abstract');
            }
            await sleep(500);
            facts.wordCounts = ((await page.locator('main').innerText().catch(() => '')).match(/Word Count[^\n]*/g) || []);
            await snap('details-summary-typed');

            // Step 11: Continue
            const t0 = Date.now();
            const saved = page.waitForResponse((r) => /\/publications\/\d+$/.test(r.url().split('?')[0]) && r.request().method() !== 'GET', {timeout: 20_000}).catch(() => null);
            facts.path.push(await pressContinue());
            const res = await saved;
            facts.save = res ? {status: res.status(), body: flat(await res.text().catch(() => null), 400)} : null;
            await sleep(1500);
            const errDialog = page.getByRole('dialog').filter({hasText: /An unexpected error has occurred|Error/});
            facts.errorDialog = (await errDialog.isVisible().catch(() => false)) ? flat(await errDialog.innerText().catch(() => null), 300) : null;
            facts.footerAfterSave = await lastSaved();
            await snap('after-continue');
            // Step 12: OK
            if (facts.errorDialog) {
                await errDialog.getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
                await sleep(6000);
                facts.footerAfterOk = await lastSaved();
                await snap('after-ok');
            }
            // Step 13: Continue to Review
            for (let i = 0; i < 6 && !/Review\s*$/.test(await curText()); i++) {
                const c = await curText();
                if (/For Readers\s*$/.test(c)) {
                    const r = page.getByRole('radio', {name: 'This preprint has not been published elsewhere.', exact: true});
                    if (await r.count()) await r.check();
                }
                facts.path.push(await pressContinue());
            }
            await sleep(8000);
            const rv = await snap('review');
            const main = rv.text && rv.text.main || '';
            facts.reviewChecking = /Checking your submission/.test(main);
            facts.reviewPlsLines = main.split('\n').map((x) => x.trim()).filter((x, i, a) => /Plain Language Summary/i.test(x) || /Plain Language Summary/i.test(a[i - 1] || '')).slice(0, 6);
            facts.reviewTooLong = (main.match(/The plain language summary is too long[^\n]*/) || [null])[0];
            facts.reviewShowsSummary = main.includes('seventeen eighteen');
            facts.submitDisabled = await footer.getByRole('button', {name: 'Submit', exact: true}).isDisabled().catch(() => null);
            facts.footerOnReview = await lastSaved();
            facts.writes = traffic.filter((x) => x.at >= t0).map(({op, url, status, body}) => ({op, url, status, body}));
            facts.errors = errs.filter((x) => x.at >= t0).map((x) => ({...x, afterMs: x.at - t0}));
            save();
            // Step 14: reload, Details
            await page.reload();
            await page.locator('.pkpSteps').waitFor({timeout: T});
            await idle(page);
            await sleep(1500);
            const unsaved = page.getByRole('dialog').filter({hasText: /Unsaved Changes/});
            facts.unsavedDialog = (await unsaved.isVisible().catch(() => false)) ? flat(await unsaved.innerText().catch(() => null), 400) : null;
            await snap('reload');
            if (facts.unsavedDialog) { await unsaved.getByRole('button', {name: /No, discard/}).click().catch(() => {}); await sleep(1000); }
            for (let i = 0; i < 6 && !/Details\s*$/.test(await curText()); i++) {
                if (await page.locator('button.pkpSteps__step__label').filter({hasText: endAnchored('Details')}).count()) {
                    await page.locator('button.pkpSteps__step__label').filter({hasText: endAnchored('Details')}).first().click();
                    await sleep(800);
                } else facts.path.push(await pressContinue());
            }
            await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), PLS_WIZARD, {timeout: T}).catch(() => {});
            if (ABSTRACT) facts.abstractAfterReload = flat(await page.evaluate((i) => window.tinymce.get(i).getContent({format: 'text'}), ABS_WIZARD).catch(() => null), 300);
            facts.summaryAfterReload = flat(await page.evaluate((i) => window.tinymce.get(i).getContent({format: 'text'}), PLS_WIZARD).catch(() => null), 300);
            await snap('details-after-reload');
            save();
            await signOut(page);
        }

        // ------------------------------------------------------------ neighbour: a submitted submission keeps the limit
        await signIn(page, 'dbarnes');
        const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
        const wp = new WorkflowPage(page, ctx);
        await wp.gotoEditorial(NEIGHBOUR_ID);
        await (await wp.revealPublicationEntry('Title & Abstract')).click();
        const dlg = page.getByRole('dialog').first();
        await dlg.waitFor({timeout: T});
        const plsIfr = page.locator('iframe[id^="titleAbstract-plainLanguageSummary-control-en"]');
        await plsIfr.first().waitFor({timeout: T});
        const plsId = (await plsIfr.first().getAttribute('id')).replace(/_ifr$/, '');
        await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), plsId, {timeout: T});
        await idle(page);
        await page.frameLocator(`#${plsId}_ifr`).locator('body').click();
        await page.keyboard.type(TWENTY);
        const t1 = Date.now();
        const nSave = page.waitForResponse((r) => /\/publications\/\d+$/.test(r.url().split('?')[0]) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await dlg.getByRole('button', {name: 'Save', exact: true}).click();
        const nr = await nSave;
        await sleep(1500);
        facts.neighbour = {
            submissionId: NEIGHBOUR_ID,
            status: nr ? nr.status() : null,
            body: nr ? flat(await nr.text().catch(() => null), 400) : null,
            fieldErrors: await page.locator('.pkpFieldError:visible').allInnerTexts().catch(() => []),
            errors: errs.filter((x) => x.at >= t1),
        };
        await snap('neighbour-title-abstract-saved');
        save();
    } finally {
        save();
        await close();
    }
});
