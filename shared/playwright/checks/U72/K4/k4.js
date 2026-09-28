// U72 "Chapters & work type" claim check, chunk K4: the work-type control,
// the "Publication Dates" page, Rule 1 (two work types), Rule 11 (chapter
// publication dates), Rule 13 (changing the work type), Settings 1-2.
// OMP drives the screens; OJS and OPS get the read-only absence controls
// (phase X).
//
// Run (all phases, or K4_PHASE=W,T,... for some):
//   PROBE_FEATURE=U72 PROBE_AGENT=ccK4 node bin/probe.js omp shared/playwright/checks/U72/K4/k4.js
//   PROBE_FEATURE=U72 PROBE_AGENT=ccK4 K4_PHASE=X node bin/probe.js all shared/playwright/checks/U72/K4/k4.js
// Phases (each seeds its own scratch press, tag prefix u72k4):
//   W  the wizard: "Submission Type" on the start screen, the "Submitting a ..." line, the Details step's Chapters (Rule 1)
//   T  the work-type control and Rule 13 (td16), Settings 2, the chapter window's "License URL", Permissions & Disclosure
//   R  roles on the control (fn-d): an assigned Layout Editor, an assigned Series editor without the metadata permission, the Author
//   D  "Publication Dates" (Rule 11, Settings 1, td5, td12): a new book, the dates round trip, the Layout Editor's save
//   L  the Layout Editor's refused save on "Publication Dates": the page-wide notice
//   V  the choice across two versions (td12 second half)
//   P  who the book's page credits (Preview), licenses written at publishing on a Monograph (Rule 1 list)
//   X  OJS / OPS controls: no work-type control, no "Marketing" group, no "Submission Type"
// Outputs: .reports/U72/ccK4/ (snapshots <name>-<app>.json, shots, facts-<app>.json).
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, settled, tag} = require('../../../probe');

const PHASES = (process.env.K4_PHASE || 'W,T,R,D,L,V,P,X').split(',').map((s) => s.trim().toUpperCase());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = 30_000;

async function post(app, route, body) {
    const r = await fetch(app.url(`/index.php/index/api/v1/_test/${route}`), {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'X-Test-Key': app.testApiKey},
        body: JSON.stringify(body),
    });
    const json = await r.json().catch(() => null);
    return {status: r.status, json};
}
async function must(app, route, body) {
    const r = await post(app, route, body);
    if (r.status !== 200) throw new Error(`${route} ${r.status} ${JSON.stringify(r.json).slice(0, 600)}`);
    return r.json;
}

forEachApp(async (app) => {
    const facts = {};
    const fact = (k, v) => { facts[k] = v; record('facts', {[k]: v}, {merge: true}); console.log(`[k4] ${k}: ${JSON.stringify(v).slice(0, 300)}`); };
    const {page, close} = await launch(app);
    const snap = async (name) => { const s = await screen(page); record(name, s); await shot(page, name); return s; };
    const guard = async (label, fn) => {
        try { return await fn(); } catch (e) { fact(`ERROR ${label}`, String(e.stack || e).slice(0, 800)); return null; }
    };
    const apiLog = [];
    page.on('response', (r) => {
        const u = r.url();
        if (/\/api\/v1\//.test(u) && !/_test\//.test(u)) apiLog.push({m: r.request().method(), o: r.request().headers()['x-http-method-override'] || null, s: r.status(), u: u.replace(/^.*\/index\.php/, '')});
    });
    const apiSince = (n) => apiLog.slice(n);
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({type: d.type(), message: d.message()});
        if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });

    // ---------------------------------------------------------------- seeding
    const press = async (p, extraUsers = []) => must(app, 'scenarios/context', {
        tag: p,
        context: {name: {en: `K4 ${p}`}},
        users: [
            {username: `${p}mg`, roles: ['manager']},
            {username: `${p}au`, roles: ['author']},
            {username: `${p}se`, roles: ['sectionEditor']},
            {username: `${p}le`, roles: ['layoutEditor']},
            ...extraUsers,
        ],
    });
    const book = (p, n, extra = {}) => must(app, 'scenarios/submission', {
        tag: `${p}b${n}`, context: p, submitter: `${p}au`, title: `K4 book ${n} ${p}`, ...extra,
    });

    // ---------------------------------------------------------------- workflow helpers
    const wf = () => page.getByRole('dialog').filter({has: page.locator('[data-cy="sidemodal-header"]')}).first();
    const header = () => wf().locator('[data-cy="sidemodal-header"]');
    const editorialUrl = (p, id, key) => app.url(`/index.php/${p}/dashboard/editorial?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);
    const authorUrl = (p, id, key) => app.url(`/index.php/${p}/dashboard/mySubmissions?workflowSubmissionId=${id}${key ? `&workflowMenuKey=${key}` : ''}`);
    const openWf = async (url) => {
        await page.goto(url);
        await idle(page);
        await header().waitFor({timeout: T}).catch(() => {});
        await idle(page);
    };
    const headerButtons = async () => (await header().getByRole('button').allInnerTexts().catch(() => [])).map((s) => s.trim()).filter(Boolean);
    const workTypeButton = () => header().getByRole('button', {name: /^(Monograph|Edited Volume)$/});
    const workTypeLabel = async () => (await workTypeButton().first().innerText().catch(() => null))?.trim() ?? null;
    const menuGroups = async () => wf().getByRole('navigation').evaluate((nav) => [...nav.querySelectorAll('a, button')].map((a) => a.innerText.trim()).filter(Boolean)).catch(() => null);
    const heading = async () => (await wf().locator('h2').first().textContent().catch(() => null))?.trim() ?? null;
    const menuItemsOpen = async () => page.getByRole('menuitem').allInnerTexts().catch(() => []);
    const chooseWorkType = async (label) => {
        const n = apiLog.length;
        const d0 = dialogs.length;
        await workTypeButton().first().click();
        await page.getByRole('menuitem').first().waitFor({timeout: T});
        const items = (await menuItemsOpen()).map((s) => s.trim());
        await page.getByRole('menuitem', {name: label, exact: true}).click();
        await sleep(400);
        await idle(page);
        await sleep(300);
        const errorDlg = page.getByRole('dialog').filter({hasNot: page.locator('[data-cy="sidemodal-header"]')});
        const extra = [];
        for (const d of await errorDlg.all()) {
            if (await d.isVisible().catch(() => false)) extra.push((await d.innerText().catch(() => '')).trim());
        }
        return {items, labelAfter: await workTypeLabel(), api: apiSince(n), browserDialogs: dialogs.slice(d0), otherDialogs: extra};
    };
    const dismissErrorDialog = async () => {
        const ok = page.getByRole('dialog').filter({hasText: 'Error'}).getByRole('button', {name: 'OK', exact: true});
        if (await ok.count()) { await ok.first().click().catch(() => {}); await sleep(600); }
    };

    // ---------------------------------------------------------------- chapter window helpers (legacy grid + legacy modal)
    const chapterGrid = () => page.locator('[id^="component-grid-users-chapter-chaptergrid"]').first();
    const chapterRows = async () => page.locator('[id^="component-grid-users-chapter-chaptergrid"] tr.gridRow').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim())).catch(() => null);
    const chapterForm = () => page.locator('form#editChapterForm');
    const openChapter = async (title) => {
        await chapterGrid().waitFor({timeout: T});
        await chapterGrid().getByRole('link', {name: title, exact: true}).first().click();
        await chapterForm().waitFor({timeout: T});
        await settled(page, chapterForm().locator('input[name^="title"]').first());
        await idle(page);
    };
    const readChapterForm = async () => chapterForm().evaluate((f) => {
        const sections = [...f.querySelectorAll('.section, fieldset')].map((s) => {
            const lab = s.querySelector('label, legend, .label');
            return lab ? lab.innerText.trim() : null;
        }).filter(Boolean);
        const val = (sel) => { const e = f.querySelector(sel); return e ? e.value : null; };
        const dp = f.querySelector('input[id^="datePublished"]:not([type=hidden])');
        const lic = f.querySelector('input[id^="licenseUrl"]');
        const licDesc = lic ? (lic.closest('.section, fieldset')?.querySelector('.pkpFormField__description')?.innerText.trim() ?? null) : null;
        return {
            sections: [...new Set(sections)],
            text: f.innerText.replace(/\s+\n/g, '\n').slice(0, 3000),
            datePublishedShown: !!dp,
            datePublishedVisible: dp ? dp.offsetParent !== null : null,
            datePublishedValue: dp ? dp.value : null,
            datePublishedAlt: val('input[id$="-altField"]'),
            licenseShown: !!lic,
            licenseValue: lic ? lic.value : null,
            licenseDescription: licDesc,
            pageBox: (f.querySelector('input[name="isPageEnabled"]') || {}).checked ?? null,
            authors: [...f.querySelectorAll('input[name="authors[]"]')].map((b) => ({label: b.closest('label, li')?.innerText.trim(), checked: b.checked})),
            files: [...f.querySelectorAll('input[name="files[]"]')].map((b) => ({label: b.closest('label, li')?.innerText.trim(), checked: b.checked})),
        };
    });
    const chapterModal = () => page.getByRole('dialog').filter({has: chapterForm()}).first();
    const chapterModalTitle = async () => (await chapterModal().locator('.header, h2, .pkp_modal_title').first().innerText().catch(() => null))?.trim() ?? null;
    const saveChapter = async () => {
        const n = apiLog.length;
        const resp = page.waitForResponse((r) => /update-?chapter/i.test(r.url()), {timeout: T}).catch(() => null);
        await chapterForm().getByRole('button', {name: 'Save', exact: true}).click();
        const r = await resp;
        await sleep(500);
        await idle(page);
        const notice = await page.locator('.pkp_notification, [role="status"], .pkpNotification').allInnerTexts().catch(() => []);
        return {status: r ? r.status() : null, notice: notice.map((s) => s.trim()).filter(Boolean), formStillOpen: await chapterForm().isVisible().catch(() => false), api: apiSince(n)};
    };
    const cancelChapter = async () => {
        const c = chapterForm().getByRole('link', {name: 'Cancel', exact: true});
        if (await c.count()) await c.first().click(); else await chapterModal().getByRole('button', {name: /Close/}).first().click();
        await chapterForm().waitFor({state: 'detached', timeout: T}).catch(() => {});
        await sleep(600);
    };
    const typeDate = async (value) => {
        const d = chapterForm().locator('input[id^="datePublished"]:not([type=hidden])').first();
        await d.click();
        await d.press('ControlOrMeta+a');
        await d.press('Delete');
        if (value) await d.pressSequentially(value, {delay: 40});
        await page.keyboard.press('Tab').catch(() => {});
        await sleep(300);
        await page.locator('#ui-datepicker-div').evaluate((e) => { e.style.display = 'none'; }).catch(() => {});
    };

    // ---------------------------------------------------------------- Publication Dates helpers
    const pdRadios = async () => wf().locator('input[type=radio][name="enableChapterPublicationDates"]').evaluateAll((els) => els.map((e) => ({value: e.value, checked: e.checked, label: e.closest('label')?.innerText.trim()}))).catch(() => null);
    const pdSave = async () => {
        const n = apiLog.length;
        const btn = wf().getByRole('button', {name: 'Save', exact: true});
        const enabled = await btn.isEnabled().catch(() => null);
        await btn.click();
        await sleep(600);
        await idle(page);
        await sleep(400);
        const status = await wf().locator('.pkpFormPage__status, [role="status"]').allInnerTexts().catch(() => []);
        const errors = await wf().locator('.pkpFormPage__footer, .pkpFormPage__status, .pkpFormPage__errors, .pkpFieldError').allInnerTexts().catch(() => []);
        return {enabledBeforeClick: enabled, status: status.map((s) => s.trim()).filter(Boolean), footer: errors.map((s) => s.trim()).filter(Boolean), api: apiSince(n)};
    };
    const pdChoose = async (label) => { await wf().getByRole('radio', {name: label, exact: true}).check(); await sleep(200); };
    const ALL = 'All chapters will use the publication date of the monograph.';
    const EACH = 'Each chapter may have its own publication date.';

    if (PHASES.includes('S')) {
        // ------------------------------------------------------------ S: discovery
        const p = tag('u72k4');
        await press(p);
        const b = await book(p, 1, {contributors: [{givenName: 'Ben', familyName: 'Tide', email: `ben${p}@mail.test`}], chapters: [{title: 'Tides', authors: [`${p}au`, `ben${p}@mail.test`]}]});
        fact('S.book', b);
        await signIn(page, `${p}mg`);
        await openWf(editorialUrl(p, b.submissionId, `publication_${b.publicationId}_chapters`));
        fact('S.header', await headerButtons());
        fact('S.menu', await menuGroups());
        fact('S.heading', await heading());
        await snap('s-chapters');
        fact('S.rows', await chapterRows());
        await guard('S open chapter', async () => {
            await openChapter('Tides');
            fact('S.modalTitle', await chapterModalTitle());
            fact('S.form', await readChapterForm());
            await snap('s-chapter-window');
        });
    }

    const REPO = path.join(__dirname, '../../../../..');
    const PROD = ['skipExternalReview', 'sendToProduction'];
    const chaptersKey = (pubId) => `publication_${pubId}_chapters`;
    const openChaptersPage = async (p, id, pubId) => {
        await openWf(editorialUrl(p, id, chaptersKey(pubId)));
        await chapterGrid().waitFor({timeout: T}).catch(() => {});
        await idle(page);
    };
    const openPD = async (p, id) => {
        await openWf(editorialUrl(p, id, 'marketing_publicationDates'));
        await wf().locator('input[type=radio][name="enableChapterPublicationDates"]').first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
    };
    const pdFormText = async () => (await wf().locator('form').first().innerText().catch(() => null));
    const chapterRead = async (title, name) => {
        await openChapter(title);
        const f = await readChapterForm();
        f.modalTitle = await page.getByRole('dialog').filter({has: chapterForm()}).locator('h1').first().textContent().catch(() => null);
        if (name) await snap(name);
        await cancelChapter();
        return f;
    };
    const closeMenuIfOpen = async () => {
        if (await page.getByRole('menuitem').count()) { await workTypeButton().first().click().catch(() => {}); await sleep(300); }
    };
    const licenseKey = (pubId) => `publication_${pubId}_license`;
    const permFields = async () => wf().locator('.pkpFormField, fieldset').evaluateAll((els) => els.map((e) => {
        const l = e.querySelector('.pkpFormFieldLabel, legend');
        const i = e.querySelector('input, select, textarea');
        return {label: l ? l.textContent.replace(/\s+/g, ' ').trim() : null, value: i ? i.value : null, desc: (e.querySelector('.pkpFormField__description') || {}).textContent?.trim() ?? null, visible: e.offsetParent !== null};
    })).catch(() => null);
    const openPerm = async (p, id, pubId) => {
        await openWf(editorialUrl(p, id, licenseKey(pubId)));
        await settled(page, wf().locator('.pkpFormPage__footer, .pkpFormPage__buttons').first());
        await idle(page);
    };

    if (app.name === 'omp' && PHASES.includes('W')) {
        // ------------------------------------------------------------ W: the wizard (Rule 1, lines 110-121)
        const p = tag('u72k4w');
        await press(p);
        const SW = require(path.join(REPO, 'apps/omp/playwright/pages/SubmissionWizardPages.js'));
        await signIn(page, `${p}au`);
        await guard('W start', async () => {
            await page.goto(app.url(`/index.php/${p}/submission`));
            await idle(page);
            await page.getByRole('heading', {name: /Make a Submission/}).first().waitFor({timeout: T});
            await snap('w-start');
            fact('W.start.radios', await page.getByRole('radio').evaluateAll((els) => els.map((e) => ({name: e.name, value: e.value, checked: e.checked, label: e.closest('label')?.innerText.trim()}))));
            fact('W.start.legends', (await page.locator('legend, .pkpFormFieldLabel').allTextContents()).map((s) => s.replace(/\s+/g, ' ').trim()));
            fact('W.start.typeDescription', await page.locator('fieldset').filter({hasText: 'Submission Type'}).locator('.pkpFormField__description').first().textContent().catch(() => null));
            await loc(page, 'start: "Submission Type" Monograph radio', page.getByRole('radio', {name: /^Monograph: Authors are associated/}));
            await loc(page, 'start: "Submission Type" Edited Volume radio', page.getByRole('radio', {name: /^Edited Volume: Authors are associated/}));
            await SW.beginSubmission(page, {title: `K4 wizard EV ${p}`, workType: /^Edited Volume: Authors are associated/});
            await idle(page);
            fact('W.ev.line', (await SW.submittingToLine(page).innerText()).trim());
            await snap('w-wizard-ev');
            await loc(page, 'wizard: the "Submitting an Edited Volume." line', SW.submittingToLine(page));
            await SW.continueTo(page, SW.STEPS.details);
            await idle(page);
            fact('W.ev.details.headings', (await page.locator('.submissionWizard h2, .submissionWizard h3, .pkpFormGroup legend, .pkp_controllers_grid .header h4').allTextContents()).map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean));
            fact('W.ev.details.chapterGrid', await chapterGrid().count());
            await snap('w-details-ev');
        });
        await guard('W change to Monograph', async () => {
            const modal = await SW.openChangeSettings(page);
            await idle(page);
            await snap('w-change-settings');
            fact('W.change.radios', await modal.getByRole('radio').evaluateAll((els) => els.map((e) => ({value: e.value, checked: e.checked, label: e.closest('label')?.innerText.trim()}))));
            await modal.getByRole('radio', {name: /^Monograph: Authors are associated/}).check();
            const n = apiLog.length;
            await modal.getByRole('button', {name: 'Save', exact: true}).click();
            await sleep(800);
            await idle(page);
            fact('W.change.api', apiSince(n));
            fact('W.mono.line', (await SW.submittingToLine(page).innerText().catch(() => null))?.trim());
            await page.reload();
            await idle(page);
            fact('W.mono.lineAfterReload', (await SW.submittingToLine(page).innerText().catch(() => null))?.trim());
            await snap('w-wizard-mono');
            await SW.continueTo(page, SW.STEPS.details);
            await idle(page);
            fact('W.mono.details.chapterGrid', await chapterGrid().count());
            await snap('w-details-mono');
        });
        // A draft with a chapter: the type change never adds or removes chapters (line 114), in the wizard.
        await guard('W draft with chapter', async () => {
            const d = await book(p, 2, {submitted: false, workType: 'editedVolume', chapters: [{title: 'Tides', authors: [`${p}au`]}]});
            await page.goto(app.url(`/index.php/${p}/submission?id=${d.submissionId}`));
            await idle(page);
            fact('W.draft.line', (await SW.submittingToLine(page).innerText().catch(() => null))?.trim());
            await SW.continueTo(page, SW.STEPS.details);
            await idle(page);
            fact('W.draft.ev.rows', await chapterRows());
            const modal = await SW.openChangeSettings(page);
            await modal.getByRole('radio', {name: /^Monograph: Authors are associated/}).check();
            await modal.getByRole('button', {name: 'Save', exact: true}).click();
            await sleep(800);
            await idle(page);
            await page.reload();
            await idle(page);
            fact('W.draft.lineAfter', (await SW.submittingToLine(page).innerText().catch(() => null))?.trim());
            await SW.continueTo(page, SW.STEPS.details);
            await idle(page);
            fact('W.draft.mono.rows', await chapterRows());
            await snap('w-draft-details-mono');
        });
    }

    if (app.name === 'omp' && PHASES.includes('T')) {
        // ------------------------------------------------------------ T: the control and Rule 13 (td16), Settings 2
        const p = tag('u72k4t');
        await press(p);
        const ben = `ben${p}@mail.test`;
        const b = await book(p, 1, {
            contributors: [{givenName: 'Ben', familyName: 'Tide', email: ben}],
            files: [{file: 'article.pdf', genre: 'Chapter Manuscript'}],
            chapters: [{title: 'Tides', subtitle: 'Low water', pages: '1-24', authors: [`${p}au`, ben], files: ['files.0']}],
        });
        fact('T.book', {id: b.submissionId, pub: b.publicationId});
        await signIn(page, `${p}mg`);
        await openChaptersPage(p, b.submissionId, b.publicationId);
        fact('T.mono.header', await headerButtons());
        fact('T.mono.label', await workTypeLabel());
        fact('T.mono.rows', await chapterRows());
        await snap('t-header-mono');
        await loc(page, 'workflow header: the work-type control', workTypeButton());
        await guard('T menu open', async () => {
            await workTypeButton().first().click();
            await page.getByRole('menuitem').first().waitFor({timeout: T});
            fact('T.menu.items', (await menuItemsOpen()).map((s) => s.trim()));
            await snap('t-menu-open');
            await loc(page, 'work-type menu: "Edited Volume" item', page.getByRole('menuitem', {name: 'Edited Volume', exact: true}));
            await loc(page, 'work-type menu: "Monograph" item', page.getByRole('menuitem', {name: 'Monograph', exact: true}));
            await closeMenuIfOpen();
        });
        await guard('T chapter mono', async () => fact('T.mono.chapter', await chapterRead('Tides', 't-chapter-mono')));
        await guard('T perm mono', async () => {
            await openPerm(p, b.submissionId, b.publicationId);
            fact('T.mono.perm', await permFields());
            await snap('t-perm-mono');
        });
        await guard('T choose EV', async () => {
            await openChaptersPage(p, b.submissionId, b.publicationId);
            fact('T.toEV', await chooseWorkType('Edited Volume'));
            await snap('t-after-ev');
            fact('T.ev.rowsSamePage', await chapterRows());
            await openChaptersPage(p, b.submissionId, b.publicationId);
            fact('T.ev.labelAfterReload', await workTypeLabel());
            fact('T.ev.rows', await chapterRows());
        });
        await guard('T chapter EV', async () => {
            const f = await chapterRead('Tides', 't-chapter-ev');
            fact('T.ev.chapter', f);
            await openChapter('Tides');
            await chapterForm().locator('input[id^="licenseUrl"]').fill('https://example.org/own-license');
            fact('T.ev.saveLicense', await saveChapter());
            if (await chapterForm().isVisible().catch(() => false)) await cancelChapter();
            fact('T.ev.chapterAfterSave', await chapterRead('Tides'));
        });
        await guard('T perm EV', async () => {
            await openPerm(p, b.submissionId, b.publicationId);
            fact('T.ev.perm', await permFields());
            await snap('t-perm-ev');
        });
        await guard('T back to Monograph', async () => {
            await openChaptersPage(p, b.submissionId, b.publicationId);
            fact('T.toMono', await chooseWorkType('Monograph'));
            await openChaptersPage(p, b.submissionId, b.publicationId);
            fact('T.mono2.label', await workTypeLabel());
            fact('T.mono2.rows', await chapterRows());
            fact('T.mono2.chapter', await chapterRead('Tides', 't-chapter-mono2'));
        });
        await guard('T EV again', async () => {
            fact('T.toEV2', await chooseWorkType('Edited Volume'));
            await openChaptersPage(p, b.submissionId, b.publicationId);
            fact('T.ev2.chapter', await chapterRead('Tides', 't-chapter-ev2'));
        });
        await guard('T same entry', async () => {
            fact('T.sameEV', await chooseWorkType('Edited Volume'));
            await openChaptersPage(p, b.submissionId, b.publicationId);
            fact('T.sameEV.labelAfterReload', await workTypeLabel());
            fact('T.sameEV.rows', await chapterRows());
            await snap('t-same-entry');
        });
        await guard('T unsaved chapter window close', async () => {
            await openChapter('Tides');
            await chapterForm().locator('input[id^="licenseUrl"]').fill('https://example.org/unsaved');
            await chapterForm().locator('input[id^="licenseUrl"]').blur();
            const d0 = dialogs.length;
            await page.getByRole('dialog').filter({has: chapterForm()}).getByRole('button', {name: 'Close', exact: true}).first().click();
            await sleep(800);
            fact('T.unsavedClose.browserDialogs', dialogs.slice(d0));
            fact('T.unsavedClose.formOpen', await chapterForm().isVisible().catch(() => false));
            if (await chapterForm().isVisible().catch(() => false)) await cancelChapter();
            fact('T.unsavedClose.chapterAfter', await chapterRead('Tides'));
        });
    }

    if (app.name === 'omp' && PHASES.includes('R')) {
        // ------------------------------------------------------------ R: the control for other roles (fn-d)
        const p = tag('u72k4r');
        await press(p);
        const b = await book(p, 1, {
            decisions: PROD,
            chapters: [{title: 'Tides', authors: [`${p}au`]}],
            participants: [{username: `${p}le`, role: 'layoutEditor'}, {username: `${p}se`, role: 'sectionEditor', canChangeMetadata: false}],
        });
        for (const [who, key] of [['le', 'layoutEditor'], ['se', 'seriesEditorNoMetadata']]) {
            await guard(`R ${key}`, async () => {
                await signIn(page, `${p}${who}`);
                await openChaptersPage(p, b.submissionId, b.publicationId);
                fact(`R.${key}.header`, await headerButtons());
                fact(`R.${key}.label`, await workTypeLabel());
                fact(`R.${key}.menu`, await menuGroups());
                fact(`R.${key}.chapterRows`, await chapterRows());
                await snap(`r-${who}-header`);
                const target = (await workTypeLabel()) === 'Edited Volume' ? 'Monograph' : 'Edited Volume';
                fact(`R.${key}.choose`, {target, ...(await chooseWorkType(target))});
                await snap(`r-${who}-after-choice`);
                await dismissErrorDialog();
                await openChaptersPage(p, b.submissionId, b.publicationId);
                fact(`R.${key}.labelAfterReload`, await workTypeLabel());
            });
        }
        await guard('R author', async () => {
            await signIn(page, `${p}au`);
            await openWf(authorUrl(p, b.submissionId));
            fact('R.author.header', await headerButtons());
            fact('R.author.menu', await menuGroups());
            await snap('r-au-view');
            await openWf(authorUrl(p, b.submissionId, 'marketing_publicationDates'));
            fact('R.author.pdKey.heading', await heading());
            fact('R.author.pdKey.url', page.url());
            await snap('r-au-pd-key');
            const resp = await page.goto(editorialUrl(p, b.submissionId, 'marketing_publicationDates'));
            await idle(page);
            await sleep(500);
            fact('R.author.editorialUrl', {status: resp && resp.status(), url: page.url(), heading: await heading()});
            await snap('r-au-editorial-url');
        });
        await guard('R manager reads after', async () => {
            await signIn(page, `${p}mg`);
            await openChaptersPage(p, b.submissionId, b.publicationId);
            fact('R.manager.labelAfterOthers', await workTypeLabel());
        });
    }

    if (app.name === 'omp' && PHASES.includes('D')) {
        // ------------------------------------------------------------ D: "Publication Dates" (Rule 11, Settings 1, td5, td12)
        const p = tag('u72k4d');
        await press(p);
        const b = await book(p, 1, {
            decisions: PROD,
            chapters: [{title: 'Tides', authors: [`${p}au`]}, {title: 'Currents', authors: [`${p}au`]}],
            participants: [{username: `${p}le`, role: 'layoutEditor'}, {username: `${p}se`, role: 'sectionEditor'}],
        });
        await signIn(page, `${p}mg`);
        await guard('D new book page', async () => {
            await openPD(p, b.submissionId);
            fact('D.new.heading', await heading());
            fact('D.new.radios', await pdRadios());
            fact('D.new.formText', await pdFormText());
            fact('D.new.saveEnabled', await wf().getByRole('button', {name: 'Save', exact: true}).isEnabled().catch(() => null));
            await snap('d-new');
            await loc(page, 'Publication Dates: "Each chapter…" radio', wf().getByRole('radio', {name: EACH, exact: true}));
            await loc(page, 'Publication Dates: "All chapters…" radio', wf().getByRole('radio', {name: ALL, exact: true}));
            await loc(page, 'Publication Dates: Save', wf().getByRole('button', {name: 'Save', exact: true}));
        });
        await guard('D new book chapter', async () => {
            await openChaptersPage(p, b.submissionId, b.publicationId);
            fact('D.new.chapterTides', await chapterRead('Tides', 'd-chapter-new'));
        });
        await guard('D save EACH', async () => {
            await openPD(p, b.submissionId);
            await pdChoose(EACH);
            fact('D.each.save', await pdSave());
            fact('D.each.radiosSamePage', await pdRadios());
            await snap('d-each-saved');
            await openPD(p, b.submissionId);
            fact('D.each.radiosAfterReload', await pdRadios());
        });
        await guard('D chapter EACH date', async () => {
            await openChaptersPage(p, b.submissionId, b.publicationId);
            fact('D.each.chapterTides', await chapterRead('Tides', 'd-chapter-each'));
            fact('D.each.chapterCurrents', await chapterRead('Currents'));
            await openChapter('Tides');
            await typeDate('2024-05-01');
            fact('D.each.typed', {alt: await chapterForm().locator('input[id$="-altField"]').inputValue().catch(() => null), shown: await chapterForm().locator('input[id^="datePublished"]:not([type=hidden])').inputValue().catch(() => null)});
            fact('D.each.saveDate', await saveChapter());
            if (await chapterForm().isVisible().catch(() => false)) await cancelChapter();
            fact('D.each.chapterTidesAfterSave', await chapterRead('Tides'));
            await openChaptersPage(p, b.submissionId, b.publicationId);
            fact('D.each.chapterTidesAfterReload', await chapterRead('Tides'));
        });
        await guard('D save ALL', async () => {
            await openPD(p, b.submissionId);
            await pdChoose(ALL);
            fact('D.all.save', await pdSave());
            await openPD(p, b.submissionId);
            fact('D.all.radiosAfterReload', await pdRadios());
            await openChaptersPage(p, b.submissionId, b.publicationId);
            fact('D.all.chapterTides', await chapterRead('Tides', 'd-chapter-all'));
        });
        await guard('D save EACH back', async () => {
            await openPD(p, b.submissionId);
            await pdChoose(EACH);
            fact('D.each2.save', await pdSave());
            await openChaptersPage(p, b.submissionId, b.publicationId);
            fact('D.each2.chapterTides', await chapterRead('Tides', 'd-chapter-each2'));
        });
        await guard('D unsaved leave', async () => {
            await openPD(p, b.submissionId);
            await pdChoose(ALL);
            const d0 = dialogs.length;
            await wf().getByRole('navigation').getByRole('link', {name: 'Audience', exact: true}).click();
            await sleep(800);
            await idle(page);
            fact('D.leave.browserDialogs', dialogs.slice(d0));
            fact('D.leave.headingAfter', await heading());
            const others = [];
            for (const d of await page.getByRole('dialog').filter({hasNot: page.locator('[data-cy="sidemodal-header"]')}).all()) if (await d.isVisible().catch(() => false)) others.push((await d.innerText()).trim());
            fact('D.leave.otherDialogs', others);
            await snap('d-leave-audience');
            await wf().getByRole('navigation').getByRole('link', {name: 'Publication Dates', exact: true}).click();
            await sleep(600);
            await idle(page);
            fact('D.leave.radiosBackInApp', await pdRadios());
            await openPD(p, b.submissionId);
            fact('D.leave.radiosAfterReload', await pdRadios());
        });
        await guard('D layout editor', async () => {
            await signIn(page, `${p}le`);
            const n = apiLog.length;
            await openPD(p, b.submissionId);
            fact('D.le.load', apiSince(n));
            fact('D.le.menu', await menuGroups());
            fact('D.le.heading', await heading());
            fact('D.le.radios', await pdRadios());
            fact('D.le.saveEnabled', await wf().getByRole('button', {name: 'Save', exact: true}).isEnabled().catch(() => null));
            await snap('d-le');
            await pdChoose(ALL);
            fact('D.le.save', await pdSave());
            await snap('d-le-after-save');
            await openPD(p, b.submissionId);
            fact('D.le.radiosAfterReload', await pdRadios());
        });
        await guard('D series editor', async () => {
            await signIn(page, `${p}se`);
            await openPD(p, b.submissionId);
            fact('D.se.radios', await pdRadios());
            await pdChoose(ALL);
            fact('D.se.save', await pdSave());
            await snap('d-se-after-save');
            await openPD(p, b.submissionId);
            fact('D.se.radiosAfterReload', await pdRadios());
        });
        await guard('D manager final', async () => {
            await signIn(page, `${p}mg`);
            await openPD(p, b.submissionId);
            fact('D.mg.radiosFinal', await pdRadios());
        });
    }

    if (app.name === 'omp' && PHASES.includes('L')) {
        // ------------------------------------------------------------ L: the Layout Editor's refused save, the page-wide notice (td5)
        const p = tag('u72k4l');
        await press(p);
        const b = await book(p, 1, {decisions: PROD, chapters: [{title: 'Tides', authors: [`${p}au`]}], participants: [{username: `${p}le`, role: 'layoutEditor'}]});
        await signIn(page, `${p}le`);
        await guard('L layout editor save', async () => {
            await openPD(p, b.submissionId);
            fact('L.le.radiosBefore', await pdRadios());
            await pdChoose(EACH);
            const n = apiLog.length;
            const resp = page.waitForResponse((r) => /\/api\/v1\/submissions\/\d+$/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
            await wf().getByRole('button', {name: 'Save', exact: true}).click();
            const r = await resp;
            fact('L.le.saveStatus', r && r.status());
            fact('L.le.saveBody', r ? (await r.text().catch(() => '')).slice(0, 300) : null);
            const toast = page.locator('.app__notifications, [role="alert"], .pkpNotification, [class*="otification"]');
            await toast.filter({hasText: /\S/}).first().waitFor({timeout: 5000}).catch(() => {});
            fact('L.le.notices', (await toast.allInnerTexts().catch(() => [])).map((s) => s.trim()).filter(Boolean));
            fact('L.le.statusInForm', (await wf().locator('.pkpFormPage__status, [role="status"]').allInnerTexts()).map((s) => s.trim()).filter(Boolean));
            await snap('l-le-after-save');
            fact('L.le.api', apiSince(n));
            fact('L.le.radiosSamePage', await pdRadios());
            await openPD(p, b.submissionId);
            fact('L.le.radiosAfterReload', await pdRadios());
        });
    }

    if (app.name === 'omp' && PHASES.includes('V')) {
        // ------------------------------------------------------------ V: the choice across two versions (td12)
        const p = tag('u72k4v');
        await press(p);
        const b = await book(p, 1, {
            published: true,
            enableChapterPublicationDates: true,
            chapters: [{title: 'Tides', authors: [`${p}au`], datePublished: '2024-05-01'}],
        });
        await signIn(page, `${p}mg`);
        let newId = null;
        await guard('V new version', async () => {
            const {WorkflowPage} = require(path.join(REPO, 'shared/playwright/pages/WorkflowPage.js'));
            const W = new WorkflowPage(page, p);
            await openWf(editorialUrl(p, b.submissionId));
            const item = await W.revealPublicationEntry('Create New Version');
            await W.expectVersionLoaded();
            await item.click();
            const dlg = page.getByRole('dialog', {name: 'Create New Version'});
            await dlg.getByRole('button', {name: 'Confirm', exact: true}).waitFor({timeout: T});
            await idle(page);
            const created = page.waitForResponse((r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
            await dlg.getByRole('button', {name: 'Confirm', exact: true}).click();
            newId = (await (await created).json()).id;
            fact('V.newPublicationId', newId);
            await idle(page);
        });
        await guard('V reads', async () => {
            await openPD(p, b.submissionId);
            fact('V.pd.radios', await pdRadios());
            await snap('v-pd');
            await openChaptersPage(p, b.submissionId, newId);
            fact('V.v2.chapter', await chapterRead('Tides', 'v-v2-chapter'));
            await openChaptersPage(p, b.submissionId, b.publicationId);
            fact('V.v1.chapter', await chapterRead('Tides'));
            await openPD(p, b.submissionId);
            await pdChoose(ALL);
            fact('V.all.save', await pdSave());
            await openChaptersPage(p, b.submissionId, newId);
            fact('V.all.v2.chapter', await chapterRead('Tides', 'v-v2-chapter-all'));
            await openChaptersPage(p, b.submissionId, b.publicationId);
            fact('V.all.v1.chapter', await chapterRead('Tides'));
        });
    }

    if (app.name === 'omp' && PHASES.includes('P')) {
        // ------------------------------------------------------------ P: the book page's credit; licenses at publishing by type
        const p = tag('u72k4p');
        await press(p);
        const ben = `ben${p}@mail.test`;
        const b = await book(p, 1, {
            decisions: PROD, workType: 'editedVolume',
            contributors: [{givenName: 'Ben', familyName: 'Tide', email: ben}],
            chapters: [{title: 'Tides', authors: [`${p}au`, ben]}],
        });
        await signIn(page, `${p}mg`);
        const preview = async (name) => {
            await openWf(editorialUrl(p, b.submissionId));
            await header().getByRole('button', {name: 'Preview', exact: true}).click();
            await page.waitForURL(/catalog\/book|preview/, {timeout: T}).catch(() => {});
            await idle(page);
            const authors = await page.locator('.item.authors').first().innerText().catch(() => null);
            await snap(name);
            return {url: page.url(), authors};
        };
        await guard('P preview EV no editors', async () => fact('P.ev.noEditors', await preview('p-preview-ev')));
        await guard('P Ben as volume editor', async () => {
            const {ContributorsScreen} = require(path.join(REPO, 'apps/omp/playwright/pages/ContributorPages.js'));
            await openWf(editorialUrl(p, b.submissionId, `publication_${b.publicationId}_contributors`));
            const cs = new ContributorsScreen(page);
            const dlg = await cs.openRowEdit('Ben Tide');
            await idle(page);
            fact('P.roleBoxes', await dlg.getByRole('checkbox').evaluateAll((els) => els.map((e) => ({label: e.closest('label')?.innerText.trim(), checked: e.checked}))));
            const box = dlg.getByRole('checkbox', {name: /editor/i}).first();
            fact('P.editorBoxLabel', await box.evaluate((e) => e.closest('label')?.innerText.trim()).catch(() => null));
            await box.check();
            await cs.savePanel(dlg);
            await idle(page);
            fact('P.contributorRows', await cs.rows().allInnerTexts().catch(() => null));
        });
        await guard('P preview EV with editor', async () => fact('P.ev.withEditor', await preview('p-preview-ev-editor')));
        await guard('P to Monograph', async () => {
            await openWf(editorialUrl(p, b.submissionId));
            fact('P.toMono', await chooseWorkType('Monograph'));
            fact('P.mono.withEditor', await preview('p-preview-mono'));
        });
        // Licenses at publishing (Rule 1's list, line 116-117): a Monograph and an Edited Volume, each with a
        // version "License URL" typed on Permissions & Disclosure, published on screen.
        for (const [n, wt] of [[2, 'monograph'], [3, 'editedVolume']]) {
            await guard(`P publish ${wt}`, async () => {
                const bk = await book(p, n, {decisions: PROD, workType: wt, chapters: [{title: 'Tides', authors: [`${p}au`]}]});
                await openPerm(p, bk.submissionId, bk.publicationId);
                const fieldsBefore = await permFields();
                fact(`P.${wt}.permBefore`, fieldsBefore);
                const lic = wf().locator('.pkpFormField').filter({has: page.locator('.pkpFormFieldLabel').filter({hasText: /^\s*License URL\s*$/})}).locator('input').first();
                await lic.fill('https://creativecommons.org/licenses/by/4.0/');
                await wf().getByRole('button', {name: 'Save', exact: true}).click();
                await wf().locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: T}).catch(() => {});
                await idle(page);
                await openWf(editorialUrl(p, bk.submissionId, `publication_${bk.publicationId}_titleAbstract`));
                await wf().getByRole('button', {name: 'Publish', exact: true}).click();
                const modal = page.getByRole('dialog', {name: /Schedule For Publication|Publish/});
                await modal.waitFor({timeout: T});
                await idle(page);
                fact(`P.${wt}.publishDialog`, (await modal.innerText()).slice(0, 800));
                const pubResp = page.waitForResponse((r) => r.url().includes('/publish'), {timeout: T}).catch(() => null);
                await modal.getByRole('button', {name: 'Publish', exact: true}).click();
                const pr = await pubResp;
                fact(`P.${wt}.publishStatus`, pr && pr.status());
                await idle(page);
                await openPerm(p, bk.submissionId, bk.publicationId);
                fact(`P.${wt}.permAfterPublish`, await permFields());
                await openChaptersPage(p, bk.submissionId, bk.publicationId);
                if (wt === 'monograph') {
                    fact('P.monograph.toEV', await chooseWorkType('Edited Volume'));
                    await openChaptersPage(p, bk.submissionId, bk.publicationId);
                }
                fact(`P.${wt}.chapterAfterPublish`, await chapterRead('Tides', `p-${wt}-chapter-after-publish`));
            });
        }
    }

    if (PHASES.includes('X')) {
        // ------------------------------------------------------------ X: controls on every app (OMP the positive one)
        const p = tag('u72k4x');
        await must(app, 'scenarios/context', {tag: p, context: {name: {en: `K4 ${p}`}}, users: [{username: `${p}mg`, roles: ['manager']}, {username: `${p}au`, roles: ['author']}]});
        const s = await must(app, 'scenarios/submission', {tag: `${p}s1`, context: p, submitter: `${p}au`, title: `K4 control ${p}`});
        await signIn(page, `${p}mg`);
        await guard('X header', async () => {
            await openWf(editorialUrl(p, s.submissionId));
            fact('X.header', await headerButtons());
            fact('X.menu', await menuGroups());
            fact('X.workTypeControl', await workTypeButton().count());
            await snap('x-header');
        });
        await guard('X marketing key', async () => {
            await openWf(editorialUrl(p, s.submissionId, 'marketing_publicationDates'));
            fact('X.pdKey.heading', await heading());
            fact('X.pdKey.radios', await pdRadios());
            await snap('x-pd-key');
        });
        await guard('X start page', async () => {
            await signIn(page, `${p}au`);
            await page.goto(app.url(`/index.php/${p}/submission`));
            await idle(page);
            fact('X.start.legends', (await page.locator('legend, .pkpFormFieldLabel').allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim()));
            fact('X.start.radios', await page.getByRole('radio').evaluateAll((els) => els.map((e) => e.closest('label')?.innerText.trim())));
            await snap('x-start');
        });
    }

    await close();
});
