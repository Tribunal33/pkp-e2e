// U36 A30 (docs/issues/U36-A30-edit-a-file-close-drops-name-unasked.md): "Edit a file" closed with its
// header "Close", a click beside it or a reload, with a changed name and no "Save", asks nothing and
// drops the name; 3.5 asked "The data on this form has changed. Do you wish to continue without
// saving?". On PKP's default test dataset (a dataset fleet), context `publicknowledge`, as `dbarnes`.
// The kit builds nothing: OMP's format "EPUB hkk30" and its file "hkk30.pdf" are added on screen.
//
// MODE=walk (the report's Steps): OJS submission 4, OMP submission 3, "Submission Files" › the file's
//   "More Actions" › "Update File Details" ("Edit" on 3.5) › "Edit a file": the name changed, then
//   (a) the header "Close" (a question is answered "Cancel" first, then "Close" again and "OK"),
//   (b) a click on the shaded page beside the window, (c) the page reloaded with the window open.
//   After each: the list at once, after a reload, the stored name, the window reopened.
//   OMP also: book 4 › "Publication Formats", the format "EPUB hkk30" added, a file added through its
//   "Change File", then the file row's "Edit" ("Edit a file", tab "Edit Metadata"): the name changed
//   and "Close"; and the format's own "Edit" window (control): the name changed and "Close".
//   OPS: preprint 1's workflow read for the absence of "Submission Files".
// MODE=nb (the fix's neighbour check, alone): on the same lists, (d) nothing changed and "Close",
//   (e) the name changed and "Save" (stored; then a reload), (f) the name changed and "Cancel",
//   (g) the upload wizard's step 2 ("2. Review Details") name changed and the header "Close".
//   Each records the questions asked and whether the window stayed open; nothing throws past a step.
// MODE=summary (the fix's revision-file check, OJS alone): submission 13's author `lkumiega` uploads a
//   revision through "Upload revisions" with "Fixed Figure 2." typed in "Summary of Changes (Amendment
//   Notice)"; then `dbarnes` opens that file's "Update File Details" on "Revisions Uploaded", changes
//   nothing, waits for the summary's editor to load and presses "Close" (a question answered "Cancel").
//
// Run (main):  bin/app-lock.sh shared <app> -- env MODE=walk PROBE_RUN=main PROBE_FEATURE=issues-k7 PKP_E2E_DATASET=1 PROBE_AGENT=k30 node bin/probe.js <app> shared/playwright/checks/issues/edit-a-file-close-drops-name-unasked/walk.js
// Run (3.5):   PKP_E2E_LINE=stable-3_5_0 MODE=walk PROBE_RUN=r35 PROBE_FEATURE=issues-k7-3_5 PKP_E2E_DATASET=1 PROBE_AGENT=k30 node bin/probe.js <app> …/walk.js
// Facts: .reports/<feature>/k30/k30-<mode>-facts-<run>-<app>.json; snapshots k30-<mode>-NN-*.
const fs = require('fs');
const os = require('os');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');
const W = require('../change-file-keeps-first-upload/lib.js');
const A = require('../author-update-file-details-offered-then-refused/lib.js');

const MODE = process.env.MODE || 'walk';
const RUN = process.env.PROBE_RUN || 'r0';
const T = 30_000;
const TAG = ' hkk30';
const NAME_LABEL = 'Name the file (e.g., Manuscript; Table 1)';
const LIST = 'Submission Files';
const CASES = {
    ojs: {id: 4, file: 'Computer Skill Requirements for New and Existing Teachers: Implications for Policy and Practice.pdf', component: 'Article Text'},
    omp: {id: 3, file: 'chapter1.pdf', component: 'Book Manuscript'},
};
const BOOK = {id: 4, format: 'EPUB hkk30', file: 'hkk30.pdf'};
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function tmpFile(name, pdf) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'k30-'));
    const p = path.join(dir, name);
    if (pdf) fs.copyFileSync(path.join(__dirname, '..', '..', '..', '..', '..', 'apps', 'ojs', 'playwright', 'fixtures', 'files', 'article.pdf'), p);
    else fs.writeFileSync(p, `k30 ${name}\n`);
    return {path: p, name};
}

forEachApp(async (app) => {
    const stable = app.line === 'stable-3_5_0';
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, run: RUN, reads: []};
    const {page, close} = await launch(app);
    const asked = [];
    const answers = [];
    page.on('dialog', (d) => {
        const answer = d.type() === 'beforeunload' ? 'accept' : answers.shift() || 'accept';
        asked.push({type: d.type(), message: flat(d.message(), 200), answer});
        (answer === 'accept' ? d.accept() : d.dismiss()).catch(() => {});
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(flat(e.message, 300)));
    page.on('response', (r) => { if (r.status() >= 500) errors.push(`${r.status()} ${r.url().replace(/^https?:\/\/[^/]+/, '').slice(0, 160)}`); });
    let n = 0;
    const snap = async (name) => {
        const id = `k30-${MODE}-${String(++n).padStart(2, '0')}-${name}`;
        const s = await screen(page).catch((e) => ({url: page.url(), error: flat(e.message)}));
        record(id, s);
        await shot(page, id).catch(() => {});
        return {id, notices: s.notices};
    };
    const windowWith = (inner) => page.getByRole('dialog').filter({has: inner}).last();
    const headerClose = (win) => win.getByRole('button', {name: 'Close', exact: true}).first();
    const press = async (control, win) => {
        const before = asked.length;
        await control.click();
        await sleep(2000);
        await idle(page);
        return {asked: asked.slice(before), windowOpenAfter: await win.isVisible().catch(() => false)};
    };
    const change = async (box) => {
        const before = await box.inputValue();
        await box.click();
        await box.press('End');
        await box.pressSequentially(TAG, {delay: 15});
        await box.press('Tab');
        await sleep(400);
        return {before, typed: await box.inputValue()};
    };
    /** Leave `win` by `how`: a question answered "Cancel" first (window and typed name read), then the same control and "OK". */
    const leave = async (win, how, other, box) => {
        const control = how === 'close' ? headerClose(win) : how === 'backdrop' ? {click: () => page.mouse.click(5, 450)} : other;
        answers.length = 0;
        answers.push('dismiss');
        const first = await press(control, win);
        const out = {first};
        if (first.asked.length) {
            out.afterDismiss = (await snap(`${how}-after-dismiss`)).id;
            if (box) out.nameAfterDismiss = await box.inputValue().catch(() => null);
            if (first.windowOpenAfter) {
                answers.length = 0;
                answers.push('accept');
                out.second = await press(control, win);
            }
        } else answers.length = 0;
        if (await win.isVisible().catch(() => false)) {
            out.leftOpen = true;
            await headerClose(win).click().catch(() => {});
            await sleep(1500);
        }
        await sleep(700);
        return out;
    };
    const reloadAsked = async () => {
        const before = asked.length;
        await page.reload();
        await idle(page);
        await sleep(1000);
        return asked.slice(before);
    };
    const step = async (key, fn) => {
        try {
            await fn();
            return null;
        } catch (e) {
            await snap(`${key}-threw`).catch(() => {});
            return flat(e.stack || e.message, 700);
        }
    };
    const push = (o) => {
        o.errors = errors.splice(0);
        facts.reads.push(o);
        console.log(`[k30 ${app.name} ${facts.line} ${MODE}] ${JSON.stringify(o).slice(0, 2500)}`);
    };
    const storedName = (id) => sql(app, `select coalesce((select setting_value from submission_file_settings where submission_file_id=${Number(id)} and setting_name='name' and locale='en'),'')`);

    try {
        if (MODE === 'summary') {
            if (app.name !== 'ojs') return;
            const K = require('../revision-summary-markup-runs-on-insert-content/lib.js');
            const R = 'Revisions Uploaded';
            const o = {kind: 'revision-summary', mode: 'control-close'};
            o.threw = await step('summary', async () => {
                await signIn(page, 'lkumiega');
                await K.openAuthor(page, app, 13, {author: true});
                const up = await K.uploadWithSummary(page, 'Article Text', tmpFile('hkk30-revision.txt', false), 'Fixed Figure 2.', 'type');
                o.upload = {label: up.label, editorHtml: up.editorHtml, saveStatus: up.saveStatus};
                o.stored = K.storedSummaries(app, 13);
                await signOut(page);
                await signIn(page, 'dbarnes');
                await W.openWorkflow(page, app, 13);
                o.rows = await W.listRows(page, R);
                const opened = await A.openEdit(page, R, 'hkk30-revision.txt', 'Update File Details');
                o.opened = opened.offered ? {title: opened.window && opened.window.title, buttons: opened.window && opened.window.buttons} : opened;
                const win = windowWith(page.locator('iframe[id*="summaryOfChanges"]'));
                const body = win.frameLocator('iframe[id*="summaryOfChanges"]').first().locator('body');
                await body.waitFor({state: 'visible', timeout: T});
                await sleep(2500); // the editor loaded and settled, nothing typed
                o.editorHtmlOnOpen = await body.evaluate((b) => b.innerHTML).catch(() => null);
                o.snapOpen = (await snap('summary-open')).id;
                o.leave = await leave(win, 'close');
                o.snapAfter = (await snap('summary-after')).id;
                o.storedAfter = K.storedSummaries(app, 13);
            });
            push(o);
            return;
        }
        await signIn(page, 'dbarnes');
        const c = CASES[app.name];
        if (!c) {
            if (MODE !== 'walk') return;
            const o = {kind: 'ops-absence'};
            o.threw = await step('ops-workflow', async () => {
                await W.openWorkflow(page, app, 1);
                o.snapshot = (await snap('ops-workflow')).id;
                o.submissionFilesTables = await page.getByRole('table', {name: LIST, exact: true}).count();
                o.updateFileDetails = await page.getByRole('menuitem', {name: 'Update File Details'}).count();
            });
            push(o);
            return;
        }

        // ------------------------------------------------------------ "Edit a file" on "Submission Files"
        const entry = stable ? 'Edit' : 'Update File Details';
        const fileId = Number(sql(app, `select sf.submission_file_id from submission_files sf join submission_file_settings s on s.submission_file_id=sf.submission_file_id and s.setting_name='name' and s.locale='en' where sf.submission_id=${c.id} and sf.file_stage=2 and s.setting_value='${c.file.replace(/'/g, "''")}' order by 1 limit 1`));
        facts.file = {id: fileId, name: c.file};
        const modes = MODE === 'walk' ? ['changed-close', 'changed-backdrop', 'changed-reload'] : ['control-close', 'changed-save', 'changed-cancel'];
        for (const mode of modes) {
            const o = {kind: 'edit-a-file', mode, entry};
            o.threw = await step(mode, async () => {
                await W.openWorkflow(page, app, c.id);
                o.listBefore = await W.listRows(page, LIST);
                const name = storedName(fileId);
                const opened = await A.openEdit(page, LIST, name, entry);
                o.opened = opened.offered ? {title: opened.window && opened.window.title, nameBox: opened.window && opened.window.nameBox, buttons: opened.window && opened.window.buttons} : opened;
                const win = windowWith(page.locator('input[type="text"]:visible'));
                const b = win.getByRole('textbox', {name: NAME_LABEL}).first();
                const box = (await b.count()) ? b : win.locator('input[name^="name["], form input[type="text"]').first();
                if (mode !== 'control-close') o.change = await change(box);
                o.snapTyped = (await snap(`${mode}-typed`)).id;
                if (mode === 'changed-reload') o.askedAtReloadWithWindowOpen = await reloadAsked();
                else if (mode === 'changed-save') {
                    const before = asked.length;
                    const answered = page.waitForResponse((r) => r.request().method() === 'POST' && /save-metadata|saveMetadata/.test(r.url()), {timeout: T}).catch(() => null);
                    await win.getByRole('button', {name: 'Save', exact: true}).click();
                    const r = await answered;
                    o.save = r ? {status: r.status()} : null;
                    await sleep(2000);
                    await idle(page);
                    o.askedAtSave = asked.slice(before);
                    o.windowOpenAfterSave = await win.isVisible().catch(() => false);
                } else {
                    const how = mode.split('-')[1];
                    const cancel = win.getByRole('button', {name: 'Cancel', exact: true}).or(win.getByRole('link', {name: 'Cancel', exact: true})).last();
                    o.leave = await leave(win, how, cancel, box);
                }
                o.snapAfter = (await snap(`${mode}-after`)).id;
                o.listAtOnce = await W.listRows(page, LIST).catch((e) => `FAILED ${flat(e.message, 200)}`);
                o.storedAtOnce = storedName(fileId);
                o.askedAtReload = await reloadAsked();
                o.listAfterReload = await W.listRows(page, LIST).catch((e) => `FAILED ${flat(e.message, 200)}`);
                const again = await A.openEdit(page, LIST, storedName(fileId), entry);
                o.reopenedNameBox = again.window && again.window.nameBox;
                const w2 = windowWith(page.locator('input[type="text"]:visible'));
                o.reopenClose = await press(headerClose(w2), w2);
                await sleep(700);
                if (mode === 'changed-save') {
                    // put the dataset's name back through the same window, so the next mode starts from it
                    await A.openEdit(page, LIST, storedName(fileId), entry);
                    o.restore = await A.rename(page, c.file);
                    o.storedRestored = storedName(fileId);
                }
            });
            push(o);
        }

        // ------------------------------------------------------------ the upload wizard's step 2 (neighbour)
        if (MODE === 'nb') {
            const o = {kind: 'wizard-step2', mode: 'changed-close'};
            const fname = `hkk30-${RUN}.txt`;
            o.threw = await step('wizard', async () => {
                await W.openWorkflow(page, app, c.id);
                await W.uploadButton(page, LIST).click();
                await W.uploadBox(page).waitFor({state: 'attached', timeout: T});
                await idle(page);
                const wiz = W.wizard(page);
                await wiz.locator('select[id^="genreId"]').selectOption({label: c.component});
                await W.pick(page, tmpFile(fname, false));
                await wiz.getByRole('button', {name: 'Continue', exact: true}).click();
                await wiz.getByRole('tab', {name: '2. Review Details', exact: true}).and(page.locator('[aria-selected="true"]')).waitFor({timeout: T});
                await idle(page);
                const panel = wiz.getByRole('tabpanel', {name: '2. Review Details'});
                const box = panel.getByRole('textbox', {name: NAME_LABEL}).or(panel.locator('input[name="name[en]"]')).first();
                await box.waitFor({timeout: T});
                await sleep(500);
                o.change = await change(box);
                o.snapTyped = (await snap('wizard-typed')).id;
                o.leave = await leave(wiz, 'close');
                o.snapAfter = (await snap('wizard-after')).id;
                o.listAtOnce = await W.listRows(page, LIST).catch((e) => `FAILED ${flat(e.message, 200)}`);
            });
            push(o);
        }

        // ------------------------------------------------------------ OMP: a publication format's file
        if (app.name === 'omp') {
            const {openFormats} = require('../galley-format-moves-in-list-when-saved/lib');
            const FL = require('../format-change-file-only-adds/lib');
            const F = require('../format-controls-offered-then-refused/lib');
            const pubId = () => sql(app, `select current_publication_id from submissions where submission_id=${BOOK.id}`).trim();
            let formats = await openFormats(page, app, BOOK.id, pubId());
            if (!(await formats.formatRow(BOOK.format).count())) facts.formatAdded = await step('add-format', async () => { facts.formatRow = await F.addFormat(page, formats, BOOK.format); });
            if (!(await formats.fileRow(BOOK.format, BOOK.file).count())) facts.fileAdded = await step('add-file', async () => { facts.changeFile = await FL.changeFile(page, formats, BOOK.format, tmpFile(BOOK.file, true)); });
            const fileId = () => sql(app, `select sf.submission_file_id from submission_files sf join submission_file_settings s on s.submission_file_id=sf.submission_file_id and s.setting_name='name' and s.setting_value like '${BOOK.file}%' where sf.submission_id=${BOOK.id} order by 1 desc limit 1`);
            const formatName = () => sql(app, `select string_agg(s.locale || '=' || s.setting_value, ' / ') from publication_format_settings s join publication_formats f on f.publication_format_id=s.publication_format_id where f.publication_id=${pubId()} and s.setting_name='name'`);
            const runs = MODE === 'walk' ? [['proof-file', 'changed-close'], ['format', 'changed-close']] : [['proof-file', 'control-close']];
            for (const [kind, mode] of runs) {
                const o = {kind, mode};
                o.threw = await step(`${kind}-${mode}`, async () => {
                    formats = await openFormats(page, app, BOOK.id, pubId());
                    const row = kind === 'format' ? formats.formatRow(BOOK.format) : formats.fileRow(BOOK.format, BOOK.file);
                    const firstTab = kind === 'format' ? /edit-format-tab|editFormatTab/ : /edit-metadata-tab|editMetadataTab|edit-metadata/;
                    const answered = page.waitForResponse((r) => firstTab.test(r.url()), {timeout: T}).catch(() => null);
                    await formats.pressRowEntry(row, 'Edit');
                    await answered;
                    const win = windowWith(page.locator('[role="tabpanel"] input[type="text"]:visible'));
                    await win.locator('[role="tabpanel"] input[type="text"]:visible').first().waitFor({timeout: T});
                    await idle(page);
                    await sleep(800);
                    o.title = flat(await win.locator('h1, h2').first().innerText().catch(() => null), 80);
                    o.tabs = (await win.locator('[role="tab"]').allInnerTexts()).map((x) => flat(x, 40));
                    const box = win.locator('[role="tabpanel"]').first().locator('input[type="text"]:visible').first();
                    o.box = flat(await box.evaluate((e) => (e.labels && e.labels[0] ? e.labels[0].innerText : e.getAttribute('aria-label') || '')).catch(() => null), 80);
                    if (mode === 'changed-close') o.change = await change(box);
                    o.snapTyped = (await snap(`${kind}-${mode}-typed`)).id;
                    o.leave = await leave(win, 'close', null, box);
                    o.snapAfter = (await snap(`${kind}-${mode}-after`)).id;
                    o.storedAtOnce = kind === 'format' ? formatName() : storedName(fileId());
                    o.askedAtReload = await reloadAsked();
                    formats = await openFormats(page, app, BOOK.id, pubId());
                    o.fileRowsAfterReload = await formats.fileRows(BOOK.format).allInnerTexts().then((a) => a.map((x) => flat(x, 120)));
                    o.formatLabelAfterReload = flat(await formats.formatLabel(BOOK.format).innerText().catch(() => null), 120);
                    o.storedAfter = kind === 'format' ? formatName() : storedName(fileId());
                });
                push(o);
            }
        }
    } catch (e) {
        facts.error = flat(e.stack || e.message, 900);
        await snap('error').catch(() => {});
    } finally {
        facts.asked = asked;
        facts.errorsLeft = errors;
        record(`k30-${MODE}-facts`, facts);
        await close();
    }
});
