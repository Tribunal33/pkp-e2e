// Issue report walk: docs/issues/U36-A11-save-without-component-server-error.md
// (spec U36 register A11). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// on its own context `publicknowledge`, as its own author account. The kit
// builds nothing; the steps create one new submission through the screens.
//
// Steps (OJS; OMP in brackets):
//   1  sign in as amwandenga (aclark)
//   2  "Make a Submission" at /index.php/publicknowledge/en/submission (the
//      dataset's authors land on the home page; a "New Submission" button is
//      pressed when the landing page has one)
//   3  title "u36r7 component", every checklist box, the first submission
//      type offered, "Begin Submission"
//   4  the wizard opens on "Upload Files" ("Continue" until it is current,
//      where an older line starts elsewhere)
//   5  "Add File", u36r7-notes.md
//   6  "Other" on its row: "Edit u36r7-notes.md"
//   7  "Save" with no component chosen            <- the fault
//   8  control: "Research Instrument" ("Prospectus"), "Save"
// NEIGHBOUR=1 adds the paths a fix must leave alone (walked with the fix in
// and out):
//   N1 "Add File", u36r7-article.pdf, then the row's "Article Text" ("Book
//      Manuscript") link: the row shows it as a badge
//   N2 that row's "Edit", "Research Instrument" ("Prospectus"), "Save"
//   N3 the draft reloaded: both rows keep their components
// Each save's request is recorded (method override, body sent, status, the
// first 300 characters of a 2xx or 4xx answer) with the lines the server log gained.
//
// Reset first:  npm run fleet-prep -- --feature issues-r7 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-r7 PROBE_AGENT=r7 node bin/probe.js all shared/playwright/checks/issues/save-without-component-server-error/walk.js
//               (NEIGHBOUR=1 in front for the neighbour paths)
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-r7-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r7-3_5 PROBE_AGENT=r7 node bin/probe.js all <this file>
// OPS has no such panel (its "Upload Files" step is the galley list).
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, idle, outFile} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const NEIGHBOUR = !!process.env.NEIGHBOUR;

const AUTHOR = {ojs: 'amwandenga', omp: 'aclark'};
const MAIN_GENRE = {ojs: 'Article Text', omp: 'Book Manuscript'};
const OTHER_GENRE = {ojs: 'Research Instrument', omp: 'Prospectus'};

forEachApp(async (app) => {
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    if (!AUTHOR[app.name]) { fact('skipped', 'no submission files panel on this app'); record('facts', facts); return; }
    const ctx = app.contextPath;
    const logFile = path.resolve(__dirname, `../../../../../apps/${app.name}/playwright/.server-logs/server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch (e) { return 0; } };
    const logSince = (from) => {
        try {
            const buf = fs.readFileSync(logFile);
            return buf.subarray(from).toString('utf8').split('\n')
                .filter((l) => /error|exception|violat|fatal|SQLSTATE/i.test(l)).map((l) => l.slice(0, 600)).slice(0, 8);
        } catch (e) { return [`(log unreadable: ${e.message})`]; }
    };

    const {page, close} = await launch(app);
    let n = 0;
    async function snap(name, extra) {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
        if (extra) Object.assign(s, extra);
        record(`${String(++n).padStart(2, '0')}-${name}`, s);
        await shot(page, `${String(n).padStart(2, '0')}-${name}`).catch(() => {});
        return s;
    }
    // Every save of a submission file the page sends, with what came back.
    const saves = [];
    page.on('response', async (r) => {
        const u = r.url();
        const req = r.request();
        if (req.method() !== 'POST' || !/\/api\/v1\/submissions\/\d+\/files\/\d+/.test(u)) return;
        // A server error's body is not kept, only its size: the answer text is not what the steps check.
        let body = null;
        try { body = r.status() >= 500 ? `(${(await r.body()).length} bytes)` : flat(await r.text(), 300); } catch (e) { body = `(unreadable: ${String(e.message).slice(0, 80)})`; }
        saves.push({at: Date.now(), url: rel(u), override: req.headers()['x-http-method-override'] || null,
            sent: flat(req.postData(), 300), status: r.status(), body});
    });
    const savesSince = (t0) => saves.filter((x) => x.at >= t0).map(({at, ...x}) => x);

    const panel = () => page.locator('.submissionFilesListPanel').first();
    const rowsRead = () => panel().locator('.listPanel__item--submissionFile').evaluateAll((els) => els.map((r) => (r.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 300))).catch(() => []);
    const row = (name) => panel().locator('.listPanel__item--submissionFile').filter({hasText: name}).first();
    const editWin = (name) => page.getByRole('dialog', {name: new RegExp(`^Edit ${name.replace(/\./g, '\\.')}`)});
    const winRead = async (name) => {
        const w = editWin(name);
        if (!(await w.isVisible().catch(() => false))) return {open: false};
        return {
            open: true,
            text: flat(await w.innerText().catch(() => ''), 600),
            fieldErrors: await w.locator('.pkpFieldError, .pkpFormFieldError, [class*="FieldError"]').evaluateAll((els) => els.map((e) => (e.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []),
            checked: await w.locator('input[type=radio]:checked').evaluateAll((els) => els.map((e) => e.closest('label')?.innerText?.trim() || e.value)).catch(() => []),
        };
    };
    const current = () => page.locator('.pkpSteps__step__label--current').first().innerText().then((t) => flat(t, 60)).catch(() => '');
    async function toUploadStep() {
        for (let i = 0; i < 4 && !/Upload Files/.test(await current()); i++) {
            await page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true}).click();
            await idle(page); await pause(500);
        }
        await panel().waitFor({timeout: T});
        await idle(page);
    }
    async function addFile(name, content) {
        const dir = outFile('files');
        fs.mkdirSync(dir, {recursive: true});
        const fp = path.join(dir, name);
        fs.writeFileSync(fp, content);
        const [chooser] = await Promise.all([page.waitForEvent('filechooser', {timeout: T}), panel().getByRole('button', {name: 'Add File', exact: true}).click()]);
        await chooser.setFiles(fp);
        await row(name).locator('.listPanel__item--submissionFile__link').or(row(name).getByText('What kind of file is this?')).first().waitFor({timeout: 60_000});
        await idle(page); await pause(400);
    }
    async function pressSave(name, label) {
        const t0 = Date.now();
        const from = logSize();
        await editWin(name).getByRole('button', {name: 'Save', exact: true}).click();
        await idle(page); await pause(1500);
        const s = await snap(label);
        const res = {requests: savesSince(t0), notices: s.notices || null, window: await winRead(name), rows: await rowsRead(), serverLog: logSince(from)};
        fact(label, res);
        return res;
    }

    try {
        // 1
        await signIn(page, AUTHOR[app.name]);
        await idle(page);
        // 2
        const newSub = page.getByRole('link', {name: /^(Start A )?New Submission$/}).or(page.getByRole('button', {name: /^(Start A )?New Submission$/})).first();
        await newSub.waitFor({timeout: 10_000}).catch(() => {});
        fact('1 landing', {url: rel(page.url()), button: await newSub.innerText().then((t) => flat(t, 60)).catch(() => null)});
        if (await newSub.isVisible().catch(() => false)) await newSub.click();
        else { fact('2 note', 'no "New Submission" on the landing page; opened /submission'); await page.goto(app.url(`/index.php/${ctx}/en/submission`)); }
        await page.getByRole('button', {name: 'Begin Submission'}).waitFor({timeout: T});
        await idle(page);
        // 3
        const {waitForEditorReady} = require('../../../support/richtext.js');
        const tid = 'startSubmission-title-control';
        await page.locator(`#${tid}_ifr`).waitFor({state: 'visible', timeout: T});
        await waitForEditorReady(page, tid);
        await page.frameLocator(`#${tid}_ifr`).locator('body').click();
        await page.keyboard.type('u36r7 component');
        for (const box of await page.locator('main input[type=checkbox]:visible').all()) if (!(await box.isChecked())) await box.check();
        const radios = await page.locator('main input[type=radio]').evaluateAll((els) => els.map((e) => ({name: e.name, checked: e.checked})));
        for (const g of [...new Set(radios.map((r) => r.name))]) if (!radios.some((r) => r.name === g && r.checked)) await page.locator(`main input[type=radio][name="${g}"]`).first().check();
        await snap('start-filled');
        await page.getByRole('button', {name: 'Begin Submission'}).click();
        await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45_000});
        const subId = Number(new URL(page.url()).searchParams.get('id'));
        fact('3 draft', subId);
        await page.locator('.pkpSteps').waitFor({timeout: T}); await idle(page);
        // 4
        await toUploadStep();
        fact('4 step', await current());
        await snap('upload-files-step');
        // 5
        const NOTES = 'u36r7-notes.md';
        await addFile(NOTES, '# u36r7 notes\n\nA file whose component is left unchosen.\n');
        fact('5 rows', await rowsRead());
        await snap('file-added');
        // 6
        await row(NOTES).getByRole('button', {name: 'Other', exact: true}).click();
        await editWin(NOTES).waitFor({timeout: T});
        await idle(page); await pause(500);
        const w6 = await winRead(NOTES);
        w6.radios = await editWin(NOTES).getByRole('radio').evaluateAll((els) => els.map((e) => e.closest('label')?.innerText?.trim() || e.value)).catch(() => []);
        fact('6 edit window', w6);
        await snap('edit-window');
        // 7
        const r7 = await pressSave(NOTES, '7 save with no component');
        // 8 (control)
        if (r7.window.open) {
            await editWin(NOTES).getByRole('radio', {name: OTHER_GENRE[app.name], exact: true}).check();
            await pressSave(NOTES, `8 save with ${OTHER_GENRE[app.name]}`);
        } else fact('8 note', 'the edit window closed at step 7; control not taken');

        if (NEIGHBOUR) {
            // N1
            const ART = 'u36r7-article.pdf';
            await addFile(ART, '%PDF-1.4\n% u36r7 article\n');
            const t0 = Date.now();
            await row(ART).getByRole('button', {name: MAIN_GENRE[app.name], exact: true}).click();
            await idle(page); await pause(1500);
            fact(`N1 row link ${MAIN_GENRE[app.name]}`, {requests: savesSince(t0), rows: await rowsRead()});
            await snap('n1-row-link');
            // N2
            await row(ART).getByRole('button', {name: /^Edit/}).first().click();
            await editWin(ART).waitFor({timeout: T});
            await idle(page); await pause(500);
            fact('N2 edit window', await winRead(ART));
            await editWin(ART).getByRole('radio', {name: OTHER_GENRE[app.name], exact: true}).check();
            await pressSave(ART, `N2 change to ${OTHER_GENRE[app.name]}`);
        }

        // what was stored: the draft reopened
        await page.reload(); await idle(page);
        await toUploadStep();
        await pause(800);
        fact('reopened rows', await rowsRead());
        await snap('reopened');
    } catch (err) {
        fact('ERROR', String(err.stack || err).slice(0, 1200));
        await snap('ERROR').catch(() => {});
        throw err;
    } finally {
        record('facts', facts);
        await close();
        fs.rmSync(outFile('files'), {recursive: true, force: true});
    }
});
