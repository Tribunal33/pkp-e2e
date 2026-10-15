// U36 claim check H15 (housekeeping 2026-10-15): does a window that holds a submission file's details
// ask "The data on this form has changed. Do you wish to continue without saving?" when it is left
// with a change typed and not saved? On PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"), context `publicknowledge`, signed in as `dbarnes`. The kit builds nothing.
//
// PHASE=edit (OJS submission 4, OMP submission 3, "Submission Files"): "More Actions" › "Update File
//   Details" ("Edit" on 3.5) › "Edit a file", three ways: nothing changed then the header "Close"
//   (control); the name changed then "Close" (a question is answered "Cancel" first, then "Close"
//   again and "OK"); the name changed then the window's "Cancel"; the name changed then the page
//   reloaded with the window open (the browser's leave-page question); the name changed then a
//   click beside the window, on the shaded page (the backdrop). After each: the list at once,
//   after a reload, the database, and the window reopened.
// PHASE=wizard (the same lists): "Upload", a component, a small file, "Continue" to "2. Review
//   Details", then: nothing changed and "Cancel" (control); the name changed and "Cancel"; the name
//   changed and the header "Close" (a question answered "Cancel" first, then "OK").
//   OPS (no file lists): the same three on preprint 1's galley "PDF" › "Change File"; and the
//   workflow read for the absence of "Submission Files".
// PHASE=formats (OMP book 4, "Publication Formats"): a format "EPUB u36h15" added once ("Add
//   publication format", the name, "OK"; the book's own "PDF" is remotely hosted), a file added
//   through its "Change File"; then the file row's "Edit" ("Edit Metadata" tab) and the format's "Edit"
//   window, each nothing changed + "Close" (control) and the first box changed + "Close".
//
// Run (main):  bin/app-lock.sh shared <app> -- env PHASE=<phase> PROBE_RUN=r1 PROBE_FEATURE=issues-cc36a PKP_E2E_DATASET=6 PROBE_AGENT=cc36a node bin/probe.js <app> shared/playwright/checks/U36/H15/h15.js
// Run (3.5):   PKP_E2E_LINE=stable-3_5_0 PHASE=<phase> PROBE_RUN=s1 PROBE_FEATURE=issues-cc36a-3_5 PKP_E2E_DATASET=6 PROBE_AGENT=cc36a node bin/probe.js <app> …/h15.js
// Facts: .reports/<feature>/cc36a/u36h15-<phase>-facts-<run>-<app>.json; snapshots u36h15-<phase>-NN-*.
const fs = require('fs');
const os = require('os');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, idle, sql, note} = require('../../../probe');
const W = require('../../issues/change-file-keeps-first-upload/lib.js');
const A = require('../../issues/author-update-file-details-offered-then-refused/lib.js');

const PHASE = process.env.PHASE || 'edit';
const RUN = process.env.PROBE_RUN || 'r0';
const T = 30_000;
const QUESTION = 'The data on this form has changed. Do you wish to continue without saving?';
const NAME_LABEL = 'Name the file (e.g., Manuscript; Table 1)';
const LIST = 'Submission Files';
const CASES = {
    ojs: {id: 4, file: 'Computer Skill Requirements for New and Existing Teachers: Implications for Policy and Practice.pdf', component: 'Article Text'},
    omp: {id: 3, file: 'chapter1.pdf', component: 'Book Manuscript'},
};
// Book 4's own format "PDF" is remotely hosted (no files): the check adds a format of its own once.
const BOOK = {id: 4, title: 'How Canadians Communicate: Contexts of Canadian Popular Culture', format: 'EPUB u36h15'};
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function smallFile(name) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'u36h15-'));
    const p = path.join(dir, name);
    fs.writeFileSync(p, `u36h15 ${name}\n`);
    return {path: p, name};
}
function pdfFile(name) {
    const src = path.join(__dirname, '..', '..', '..', '..', '..', 'apps', 'ojs', 'playwright', 'fixtures', 'files', 'article.pdf');
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'u36h15-'));
    const p = path.join(dir, name);
    fs.copyFileSync(src, p);
    return {path: p, name};
}

forEachApp(async (app) => {
    const stable = app.line === 'stable-3_5_0';
    const facts = {app: app.name, line: app.line || 'main', phase: PHASE, run: RUN, reads: []};
    const {page, close} = await launch(app);
    // Every browser question is recorded; each is answered from `answers` (default "OK"/accept).
    const asked = [];
    const answers = [];
    page.on('dialog', (d) => {
        const answer = d.type() === 'beforeunload' ? 'accept' : answers.shift() || 'accept';
        asked.push({type: d.type(), message: flat(d.message(), 200), answer});
        (answer === 'accept' ? d.accept() : d.dismiss()).catch(() => {});
    });
    let n = 0;
    const snap = async (name) => {
        const id = `u36h15-${PHASE}-${String(++n).padStart(2, '0')}-${name}`;
        const s = await screen(page).catch((e) => ({url: page.url(), error: flat(e.message)}));
        record(id, s);
        await shot(page, id).catch(() => {});
        return {id, notices: s.notices};
    };
    // The innermost window holding `inner`: a legacy window opens inside the workflow's own dialog,
    // so the last match in document order is the window itself, never the workflow around it.
    const windowWith = (inner) => page.getByRole('dialog').filter({has: inner}).last();
    const headerClose = (win) => win.getByRole('button', {name: 'Close', exact: true}).first();
    /** Press `control`; return the questions asked within 2 s and whether `win` is still open. */
    const press = async (control, win) => {
        const before = asked.length;
        await control.click();
        await sleep(2000);
        await idle(page);
        return {asked: asked.slice(before), windowOpenAfter: await win.isVisible().catch(() => false)};
    };
    /** Type " h15" at the end of a text box, then Tab out of it (a legacy form notices a change on blur). */
    const change = async (box) => {
        const before = await box.inputValue();
        await box.click();
        await box.press('End');
        await box.pressSequentially(' h15', {delay: 15});
        await box.press('Tab'); // leaves the box as a person does (a click outside would hit the window's backdrop)
        await sleep(400);
        return {before, typed: await box.inputValue()};
    };
    /** The window left by `how` ('close' | 'cancel'): a question answered "Cancel" first, "OK" the second time. */
    const leave = async (win, how, cancelControl) => {
        const control = how === 'close' ? headerClose(win) : how === 'backdrop' ? {click: () => page.mouse.click(5, 450)} : cancelControl;
        answers.length = 0;
        answers.push('dismiss');
        const first = await press(control, win);
        const out = {first};
        if (first.asked.length) {
            out.afterDismiss = await snap(`${how}-after-dismiss`);
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
        await sleep(700); // the closed window's slot (patterns.md pitfall 4)
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
            return await fn();
        } catch (e) {
            const out = {threw: flat(e.stack || e.message, 700)};
            await snap(`${key}-threw`).catch(() => {});
            return out;
        }
    };
    const push = (o) => {
        facts.reads.push(o);
        console.log(`[h15 ${app.name} ${facts.line} ${PHASE}] ${JSON.stringify(o).slice(0, 2500)}`);
    };
    const storedName = (id) => sql(app, `select coalesce((select setting_value from submission_file_settings where submission_file_id=${Number(id)} and setting_name='name' and locale='en'),'')`);

    try {
        await signIn(page, 'dbarnes');
        const c = CASES[app.name];

        // ------------------------------------------------------------------ "Edit a file"
        if (PHASE === 'edit') {
            if (!c) {
                await step('ops-workflow', async () => {
                    await W.openWorkflow(page, app, 1);
                    const s = await snap('ops-workflow');
                    push({kind: 'ops-absence', snapshot: s.id, submissionFilesTables: await page.getByRole('table', {name: LIST, exact: true}).count(), moreActions: await page.getByRole('button', {name: 'More Actions'}).count()});
                });
                return;
            }
            const entry = stable ? 'Edit' : 'Update File Details';
            const fileId = Number(sql(app, `select sf.submission_file_id from submission_files sf join submission_file_settings s on s.submission_file_id=sf.submission_file_id and s.setting_name='name' and s.locale='en' where sf.submission_id=${c.id} and sf.file_stage=2 and s.setting_value='${c.file.replace(/'/g, "''")}' order by 1 limit 1`));
            facts.file = {id: fileId, name: c.file};
            for (const mode of (process.env.MODES || 'control-close,changed-close,changed-cancel,changed-reload,changed-backdrop').split(',')) {
                const o = {kind: 'edit-a-file', mode, entry};
                o.threw = (await step(mode, async () => {
                    await W.openWorkflow(page, app, c.id);
                    o.listBefore = await W.listRows(page, LIST);
                    const opened = await A.openEdit(page, LIST, c.file, entry);
                    o.opened = opened.offered ? {title: opened.window && opened.window.title, nameBox: opened.window && opened.window.nameBox, buttons: opened.window && opened.window.buttons} : opened;
                    const win = windowWith(page.locator('input[type="text"]:visible'));
                    o.windowTitle = flat(await win.locator('h1').first().innerText().catch(() => null), 80);
                    o.snapOpen = (await snap(`${mode}-open`)).id;
                    const box = win.getByRole('textbox', {name: NAME_LABEL}).first();
                    const nameBox = (await box.count()) ? box : win.locator('input[name^="name["], form input[type="text"]').first();
                    if (mode !== 'control-close') o.change = await change(nameBox);
                    o.snapTyped = (await snap(`${mode}-typed`)).id;
                    const cancel = win.getByRole('button', {name: 'Cancel', exact: true}).or(win.getByRole('link', {name: 'Cancel', exact: true})).last();
                    if (mode === 'changed-reload') o.askedAtReloadWithWindowOpen = await reloadAsked(); // the page left with the window open
                    else o.leave = await leave(win, mode.split('-')[1], cancel);
                    const after = await snap(`${mode}-after`);
                    o.snapAfter = after.id;
                    o.noticesAfter = after.notices;
                    o.listAtOnce = await W.listRows(page, LIST).catch((e) => `FAILED ${flat(e.message, 200)}`);
                    o.storedAtOnce = storedName(fileId);
                    o.askedAtReload = await reloadAsked();
                    o.listAfterReload = await W.listRows(page, LIST).catch((e) => `FAILED ${flat(e.message, 200)}`);
                    o.snapReload = (await snap(`${mode}-reload`)).id;
                    const again = await A.openEdit(page, LIST, c.file, entry);
                    o.reopenedNameBox = again.window && again.window.nameBox;
                    o.snapReopen = (await snap(`${mode}-reopen`)).id;
                    const w2 = windowWith(page.locator('input[type="text"]:visible'));
                    o.reopenClose = await press(headerClose(w2), w2);
                    await sleep(700);
                    o.storedAfter = storedName(fileId);
                }) || {}).threw;
                push(o);
            }
        }

        // ------------------------------------------------------------------ the upload wizard, step 2
        if (PHASE === 'wizard') {
            for (const mode of ['control-cancel', 'changed-cancel', 'changed-close']) {
                const fname = `u36h15-${RUN}-${mode}.txt`;
                const o = {kind: c ? 'wizard' : 'galley-wizard', mode, file: fname};
                let galleys = null;
                o.threw = (await step(mode, async () => {
                    if (c) {
                        await W.openWorkflow(page, app, c.id);
                        o.listBefore = await W.listRows(page, LIST);
                        await W.uploadButton(page, LIST).click();
                    } else {
                        const {openGalleys} = require('../../issues/listing-offers-galley-without-file/lib');
                        galleys = await openGalleys(page, app, 1);
                        o.galleyBefore = sql(app, `select g.submission_file_id, (select setting_value from submission_file_settings s where s.submission_file_id=g.submission_file_id and s.setting_name='name' and s.locale='en'), sf.file_id from publication_galleys g join publications p on p.publication_id=g.publication_id join submission_files sf on sf.submission_file_id=g.submission_file_id where p.submission_id=1 and g.label='PDF'`);
                        await galleys.openMenu('PDF');
                        await galleys.choose('Change File');
                    }
                    await W.uploadBox(page).waitFor({state: 'attached', timeout: T});
                    await idle(page);
                    const wiz = W.wizard(page);
                    o.title = flat(await wiz.locator('h1, h2').first().innerText().catch(() => null), 80);
                    if (c) await wiz.locator('select[id^="genreId"]').selectOption({label: c.component});
                    const up = await W.pick(page, c ? smallFile(fname) : pdfFile(fname.replace(/\.txt$/, '.pdf')));
                    o.uploadedId = up && (up.id || up.submissionFileId) || null;
                    await wiz.getByRole('button', {name: 'Continue', exact: true}).click();
                    await wiz.getByRole('tab', {name: '2. Review Details', exact: true}).and(page.locator('[aria-selected="true"]')).waitFor({timeout: T});
                    await idle(page);
                    const panel = wiz.getByRole('tabpanel', {name: '2. Review Details'});
                    // main labels the box with the field's name; 3.5's legacy box is named after its language ("English")
                    const box = panel.getByRole('textbox', {name: NAME_LABEL}).or(panel.locator('input[name="name[en]"], input[name="name[en_US]"]')).first();
                    await box.waitFor({timeout: T});
                    await sleep(500);
                    o.snapStep2 = (await snap(`${mode}-step2`)).id;
                    o.formsInStep2 = await panel.locator('form').count();
                    if (mode !== 'control-cancel') o.change = await change(box);
                    o.snapTyped = (await snap(`${mode}-typed`)).id;
                    o.leave = await leave(wiz, mode.endsWith('close') ? 'close' : 'cancel', wiz.getByRole('link', {name: 'Cancel', exact: true}));
                    const after = await snap(`${mode}-after`);
                    o.snapAfter = after.id;
                    o.noticesAfter = after.notices;
                    if (c) o.listAtOnce = await W.listRows(page, LIST).catch((e) => `FAILED ${flat(e.message, 200)}`);
                    o.askedAtReload = await reloadAsked();
                    if (c) o.listAfterReload = await W.listRows(page, LIST).catch((e) => `FAILED ${flat(e.message, 200)}`);
                    o.snapReload = (await snap(`${mode}-reload`)).id;
                    o.stored = c
                        ? sql(app, `select sf.submission_file_id, coalesce((select setting_value from submission_file_settings s where s.submission_file_id=sf.submission_file_id and s.setting_name='name' and s.locale='en'),'') from submission_files sf where sf.submission_id=${c.id} and sf.submission_file_id in (select submission_file_id from submission_file_settings where setting_name='name' and setting_value like 'u36h15-${RUN}-${mode}%') order by 1`)
                        : sql(app, `select g.submission_file_id, (select setting_value from submission_file_settings s where s.submission_file_id=g.submission_file_id and s.setting_name='name' and s.locale='en'), sf.file_id from publication_galleys g join publications p on p.publication_id=g.publication_id join submission_files sf on sf.submission_file_id=g.submission_file_id where p.submission_id=1 and g.label='PDF'`);
                }) || {}).threw;
                push(o);
            }
        }

        // ------------------------------------------------------------------ OMP publication formats
        if (PHASE === 'formats') {
            if (app.name !== 'omp') return;
            const {openFormats} = require('../../issues/galley-format-moves-in-list-when-saved/lib');
            const pubId = () => sql(app, `select current_publication_id from submissions where submission_id=${BOOK.id}`).trim();
            const fileName = `u36h15-${RUN}.pdf`;
            let formats = await openFormats(page, app, BOOK.id, pubId());
            const FL = require('../../issues/format-change-file-only-adds/lib');
            if (!(await formats.formatRow(BOOK.format).count())) {
                const F = require('../../issues/format-controls-offered-then-refused/lib');
                facts.formatAdded = await step('add-format', () => F.addFormat(page, formats, BOOK.format));
            }
            const existing = await formats.fileRow(BOOK.format, fileName).count();
            if (!existing) facts.added = await step('add-file', () => FL.changeFile(page, formats, BOOK.format, pdfFile(fileName)));
            const fileId = () => sql(app, `select sf.submission_file_id from submission_files sf join submission_file_settings s on s.submission_file_id=sf.submission_file_id and s.setting_name='name' and s.setting_value='${fileName}' where sf.submission_id=${BOOK.id} order by 1 desc limit 1`);
            const formatName = () => sql(app, `select string_agg(s.locale || '=' || s.setting_value, ' / ') from publication_format_settings s join publication_formats f on f.publication_format_id=s.publication_format_id where f.publication_id=${pubId()} and s.setting_name='name'`);
            for (const kind of ['proof-file', 'format']) {
                for (const mode of ['control-close', 'changed-close']) {
                    const o = {kind, mode, file: fileName};
                    o.threw = (await step(`${kind}-${mode}`, async () => {
                        formats = await openFormats(page, app, BOOK.id, pubId());
                        const row = kind === 'format' ? formats.formatRow(BOOK.format) : formats.fileRow(BOOK.format, fileName);
                        const firstTab = kind === 'format' ? /edit-format-tab|editFormatTab/ : /edit-metadata-tab|editMetadataTab|edit-metadata/;
                        const answered = page.waitForResponse((r) => firstTab.test(r.url()), {timeout: T}).catch(() => null);
                        await formats.pressRowEntry(row, 'Edit');
                        await answered;
                        const win = windowWith(page.locator('[role="tabpanel"] input[type="text"]:visible'));
                        await win.locator('form').first().waitFor({timeout: T}).catch(() => {});
                        await win.locator('[role="tabpanel"] input[type="text"]:visible').first().waitFor({timeout: T});
                        await idle(page);
                        await sleep(800);
                        o.title = flat(await win.locator('h1, h2').first().innerText().catch(() => null), 80);
                        o.tabs = (await win.locator('[role="tab"]').allInnerTexts()).map((x) => flat(x, 40));
                        o.formsInWindow = await win.locator('form').count();
                        o.snapOpen = (await snap(`${kind}-${mode}-open`)).id;
                        const box = win.locator('[role="tabpanel"]').first().locator('input[type="text"]:visible').first();
                        o.box = {name: await box.getAttribute('name'), label: await box.evaluate((e) => (e.labels && e.labels[0] ? e.labels[0].innerText : e.getAttribute('aria-label') || '')).then((x) => flat(x, 80))};
                        if (mode === 'changed-close') o.change = await change(box);
                        o.snapTyped = (await snap(`${kind}-${mode}-typed`)).id;
                        o.leave = await leave(win, 'close');
                        const after = await snap(`${kind}-${mode}-after`);
                        o.snapAfter = after.id;
                        o.noticesAfter = after.notices;
                        o.storedAtOnce = kind === 'format' ? formatName() : storedName(fileId());
                        o.askedAtReload = await reloadAsked();
                        formats = await openFormats(page, app, BOOK.id, pubId());
                        o.fileRowsAfterReload = await formats.fileRows(BOOK.format).allInnerTexts().then((a) => a.map((x) => flat(x, 120)));
                        o.formatLabelAfterReload = flat(await formats.formatLabel(BOOK.format).innerText().catch(() => null), 120);
                        o.snapReload = (await snap(`${kind}-${mode}-reload`)).id;
                        o.storedAfter = kind === 'format' ? formatName() : storedName(fileId());
                    }) || {}).threw;
                    push(o);
                }
            }
        }
    } catch (e) {
        facts.error = flat(e.stack || e.message, 900);
        await snap('error').catch(() => {});
    } finally {
        facts.asked = asked;
        record(`u36h15-${PHASE}-facts`, facts);
        await close();
    }
});
