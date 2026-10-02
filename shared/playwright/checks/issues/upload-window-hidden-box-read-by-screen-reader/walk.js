// Issue reports docs/issues/U36-A9-upload-window-hidden-box-read-by-screen-reader.md and
// docs/issues/U36-A9-upload-window-drop-downs-unnamed.md (U36 A9, two causes on one screen): step 1 of
// the upload window as a screen reader gets it, read through the accessibility snapshot. Walked
// through the screens on PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// context `publicknowledge`. The kit builds nothing.
//
// MODE=walk (default):
//   1. sign in as dbarnes
//   2. OJS submission 4, OMP submission 3: open the workflow (it opens on Submission)
//      OPS preprint 1: Publication › "Galleys", "Add galley", label "u36k PDF", "Save"
//   3. OJS, OMP: "Upload" above "Submission Files"; the upload window opens on "1. Upload File"
//   4. before anything is chosen: the window's accessibility snapshot, each drop-down's label and
//      accessible name, the upload box on screen and in the tree
//   5. choose the component ("Article Text", OMP "Book Manuscript", OPS "Preprint Text"); the same read
// MODE=nb, the neighbours alone (with each fix in and out), from step 3's window:
//   a. each drop-down's label activated (a click on it); where the focus lands
//   b. OJS, OMP: choose the dataset's own file under "If you are uploading a revision…": the box
//      shows; back to "This is not a revision of an existing file": the box goes again
//   c. choose the component: the box shows; a mouse click on "Upload File" opens one file picker; the
//      file goes up under the chosen component and the box names it with "Change File"
//   d. "Continue": "2. Review Details" opens
// MODE=at (without the fix), from step 3's window, nothing chosen: the hidden "Upload File" button
//   pressed without a pointer (the button's own click(), what a screen reader's "press" or the
//   console's `document.querySelector('.pkp_uploader_button').click()` does), a file given to the
//   picker; what the upload answers, what the window then shows and what the database holds; then
//   a file given to the tree's other entry, plupload's file input ("Choose File")
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=issues-u36k PROBE_AGENT=u36k node bin/probe.js all shared/playwright/checks/issues/upload-window-hidden-box-read-by-screen-reader/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u36k-3_5 PROBE_AGENT=u36k node bin/probe.js all <this file>
// Facts: .reports/<feature>/u36k/a9-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');
const A14 = require('../change-file-keeps-first-upload/lib');
const KB = require('../upload-file-out-of-keyboard-reach/lib');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';
const SUBMISSION = {ojs: 4, omp: 3, ops: 1};
const COMPONENT = {ojs: 'Article Text', omp: 'Book Manuscript', ops: 'Preprint Text'};

forEachApp(async (app) => {
    const name = `a9-${MODE}`;
    const fact = (k, v) => { record(name, {[k]: v}, {merge: true}); console.log('[a9]', app.name, MODE, k, JSON.stringify(v).slice(0, 1500)); };
    const step = async (k, fn) => {
        try { return await fn(); } catch (e) {
            fact(`${k}-FAILED`, String(e.stack || e).split('\n').slice(0, 5).join(' | '));
            return null;
        }
    };
    const id = SUBMISSION[app.name];
    const {page} = await launch(app);
    fact('line', app.line || 'main');

    await signIn(page, 'dbarnes');                                                                  // 1
    const opened = await step('open-wizard', async () => {
        if (app.name === 'ops') {
            await L.addGalley(page, app, id, 'u36k PDF');                                           // 2
        } else {
            await A14.openWorkflow(page, app, id);                                                  // 2
            await A14.listRows(page, 'Submission Files');
            await A14.uploadButton(page, 'Submission Files').click();                               // 3
        }
        await L.wizardReady(page);
        return true;
    });
    if (!opened) { await shot(page, `${name}-not-opened`).catch(() => {}); return; }                // nothing to read without the window
    const w = A14.wizard(page);
    const genre = w.locator('select[id^="genreId"]');
    const revise = w.locator('select[id^="revisedFileId"]');
    fact('window', L.flat(await page.getByRole('dialog').last().innerText().catch(() => null), 500));

    if (MODE === 'walk') {
        fact('step4-before-choice', await step('step4', () => L.readStepOne(page)));                // 4
        record(`${name}-step4-screen`, await screen(page));
        await shot(page, `${name}-step4-before-choice`);
        await step('choose', () => genre.selectOption({label: COMPONENT[app.name]}));               // 5
        await idle(page);
        fact('step5-component-chosen', await step('step5', () => L.readStepOne(page)));
        await shot(page, `${name}-step5-component-chosen`);
        return;
    }

    if (MODE === 'at') {
        const stored = () => ({submissionFiles: Number(sql(app, 'select count(*) from submission_files')), files: Number(sql(app, 'select count(*) from files')), temporaryFiles: Number(sql(app, 'select count(*) from temporary_files'))});
        const answer = async (r) => { const t = r ? await r.text().catch(() => '') : ''; return {status: r ? r.status() : null, refusalInAnswer: /Missing or invalid component/.test(t), uploadedFile: /"uploadedFile"/.test(t), start: L.flat(t, 120)}; };
        const upload = () => page.waitForResponse((r) => /upload-file|uploadFile/.test(r.url()) && r.request().method() === 'POST', {timeout: 30_000}).catch(() => null);
        fact('at-stored-before', stored());
        fact('at-before', await step('at-before', async () => { const r = await L.readStepOne(page); return {box: r.box, inTree: r.inTree}; }));
        // the refusal notice, read right after an answer and again once its six seconds are over
        const notice = async () => {
            const t = page.getByText('Missing or invalid component').first();
            const shown = await t.waitFor({state: 'visible', timeout: 5_000}).then(() => true).catch(() => false);
            const out = {shown, where: shown ? L.flat(await t.evaluate((e) => (e.closest('[id^="pkp_notification_"]') || e.parentElement).outerHTML), 400) : null,
                live: shown ? await t.evaluate((e) => { const l = e.closest('[aria-live], [role="alert"], [role="status"]'); return l ? l.outerHTML.slice(0, 120) : null; }) : null};
            if (shown) { await shot(page, `${name}-notice`); out.goneAfter8s = await t.waitFor({state: 'hidden', timeout: 8_000}).then(() => true).catch(() => false); }
            return out;
        };
        // the hidden "Upload File" button, pressed without a pointer
        fact('at-upload', await step('at-upload', async () => {
            const answered = upload();
            const choosers = [];
            page.on('filechooser', (fc) => choosers.push(fc));
            await A14.uploadBox(page).locator('.pkp_uploader_button').evaluate((b) => b.click());
            for (let i = 0; i < 20 && !choosers.length; i++) await KB.sleep(150);
            if (!choosers.length) return {pickersOpened: 0};
            await choosers[0].setFiles(L.scratchFile());
            const out = await answer(await answered);
            return Object.assign({pickersOpened: choosers.length}, out, {notice: await notice()});
        }));
        await idle(page);
        fact('at-after', await step('at-after', async () => { const r = await L.readStepOne(page); return {box: r.box, inTree: r.inTree, aria: r.aria}; }));
        fact('at-window', L.flat(await page.getByRole('dialog').last().innerText().catch(() => null), 700));
        fact('at-refusal-on-screen', await page.getByText('Missing or invalid component').count());
        fact('at-stored-after', stored());
        record(`${name}-screen`, await screen(page));
        await shot(page, `${name}-after`);
        // the tree's other entry, plupload's own file input ("Choose File"), given a file
        fact('at-choose-file', await step('at-choose-file', async () => {
            await L.wizardReady(page);
            const answered = upload();
            await w.locator('.moxie-shim input[type=file]').first().setInputFiles(L.scratchFile());
            const out = await answer(await answered);
            await idle(page);
            return Object.assign(out, {notice: await notice(), stored: stored()});
        }));
        return;
    }

    // MODE=nb
    const boxState = async () => { const r = await L.readStepOne(page); return {box: r.box, inTree: r.inTree}; };
    fact('a-labels', await step('a-labels', async () => {
        const out = [];
        for (const s of (await L.readStepOne(page)).selects) {
            await page.evaluate(() => document.activeElement && document.activeElement.blur());
            // the label's own activation, as a click on it gives: a tied label hands the focus to its drop-down
            await w.locator(`select[id="${s.id}"]`).locator('xpath=ancestor::div[contains(@class,"section")][1]/label').first().evaluate((l) => l.click());
            out.push({select: s.id, label: s.label, labelFor: s.labelFor, accessibleName: s.accessibleName, focusAfterLabelClick: await page.evaluate(() => (document.activeElement && document.activeElement.id) || null)});
        }
        return out;
    }));
    fact('b-open', await step('b-open', boxState));
    if (await revise.count()) {
        await step('b-revise', () => revise.selectOption({index: 1}));
        await idle(page);
        fact('b-revise-chosen', await step('b-revise-chosen', async () => Object.assign(await boxState(), {componentDisabled: await genre.isDisabled(), component: await genre.evaluate((e) => e.options[e.selectedIndex].text.trim())})));
        await step('b-back', () => revise.selectOption({index: 0}));
        await idle(page);
        fact('b-revise-cleared', await step('b-revise-cleared', boxState));
    }
    await step('c-choose', () => genre.selectOption({label: COMPONENT[app.name]}));
    await idle(page);
    fact('c-component-chosen', await step('c-component-chosen', boxState));
    fact('c-upload', await step('c-upload', async () => {
        const answered = page.waitForResponse((r) => /upload-file|uploadFile/.test(r.url()) && r.request().method() === 'POST', {timeout: 60_000}).catch(() => null);
        const picked = await KB.chooseWith(page, () => A14.uploadBox(page).locator('.pkp_uploader_button').click(), L.scratchFile(), KB.WIZARD);
        const r = picked.pickersOpened ? await answered : null;
        const body = r ? await r.json().catch(() => null) : null;
        return Object.assign(picked, {status: r ? r.status() : null, uploaded: body && body.uploadedFile ? {name: body.uploadedFile.name, genreId: body.uploadedFile.genreId} : L.flat(JSON.stringify(body), 200), changeFile: await A14.uploadBox(page).getByRole('button', {name: 'Change File', exact: true}).isVisible().catch(() => false)});
    }));
    await shot(page, `${name}-c-uploaded`);
    fact('d-continue', await step('d-continue', async () => {
        await page.getByRole('dialog').filter({has: page.getByRole('tab', {name: '2. Review Details', exact: true})}).last().getByRole('button', {name: 'Continue', exact: true}).click();
        await page.getByRole('tab', {name: '2. Review Details', exact: true}).and(page.locator('[aria-selected="true"]')).last().waitFor({timeout: A14.T});
        await idle(page);
        return L.flat(await page.getByRole('dialog').last().innerText().catch(() => null), 300);
    }));
});
