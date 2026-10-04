// Helpers of walk.js here (U72 A3): a book's chapter windows, a format's "Select Files" and the
// book's page, on OMP. Requiring this file runs nothing. Every helper presses what a person presses
// or reads what the screen shows; `stored()` reads the database for Evidence only. Page objects are
// required inside the functions (probe kit rule). The version helpers are the U44 A5 walk's.
const {expect} = require('@playwright/test');
const {idle, sql} = require('../../../probe');
const {T, flat, snap, openPublicationPage} = require('../publisher-id-on-tab-never-removed/lib');
const {newVersion, publishNewest} = require('../new-version-galley-publisher-id-refused/lib');

const OMP_CHAPTERS = '../../../../../apps/omp/playwright/pages/ChapterPages.js';
const OMP_FORMATS = '../../../../../apps/omp/playwright/pages/PublicationFormatPages.js';

/**
 * 3.5 shows one version's pages at a time: pick version `n` (1 = the first) from the publication
 * page's version menu. main opens a version's page by its address, so this is 3.5 only.
 */
async function pickVersion35(page, n) {
    const button = page.getByRole('button', {name: /^(All Versions|Version)/}).first();
    await expect(button).toBeVisible({timeout: T});
    await button.click();
    const item = page.getByRole('menuitem').filter({hasText: new RegExp(`(^|\\D)${n}(\\D|$)`)}).first();
    await item.click();
    await idle(page);
}

/** Open a version's "Chapters" page (3.5: version `n35` picked first). */
async function openChapters(page, app, sid, pubId, n35 = null) {
    if (app.line === 'stable-3_5_0' && n35) {
        const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
        const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication', publicationHeading: 'Publication'}});
        await frame.gotoEditorial(sid);
        await frame.expectVersionLoaded().catch(() => {});
        await frame.menuLink('Title & Abstract').first().click();
        await idle(page);
        await pickVersion35(page, n35);
        await frame.menuLink('Chapters').first().click();
        await frame.expectPageHeading('Chapters');
        await idle(page);
    } else {
        await openPublicationPage(page, app, sid, pubId, 'Chapters');
    }
    const {ChapterList} = require(OMP_CHAPTERS);
    const list = new ChapterList(page);
    await list.expectLoaded();
    return list;
}

/**
 * Press a chapter's title on the open Chapters page and read its "Files" list:
 * [{label, checked, fileId}] in screen order (fileId is the box's value, for Evidence). "Cancel".
 */
async function readChapterFiles(page, list, title, name) {
    const win = await list.openEdit(title);
    await idle(page);
    const boxes = win.form().locator('input[type="checkbox"][name="files[]"]');
    const files = await boxes.evaluateAll((bs) =>
        bs.map((b) => ({label: ((b.closest('label') || b.parentElement).innerText || '').trim(), checked: b.checked, fileId: Number(b.value)}))
    );
    const filesHeading = await win.form().getByText(/^\s*Files\s*$/).count();
    await snap(page, name);
    await win.cancel();
    return {filesSection: filesHeading > 0, files};
}

/**
 * A version's "Publication Formats": `format` › "Select Files", tick `fileName` in the list, "OK";
 * then the new row's "Awaiting Approval" › "OK" and "Set Terms" › "Open Access" › "Save".
 */
async function addProofFromList(page, app, sid, pubId, format, fileName) {
    await openPublicationPage(page, app, sid, pubId, 'Publication Formats');
    const {PublicationFormatsPage, TermsWindow, SALES} = require(OMP_FORMATS);
    const pf = new PublicationFormatsPage(page, app.contextPath);
    await pf.expectLoaded();
    const out = {};
    out.rowsBefore = await pf.fileRows(format).evaluateAll((rs) => rs.map((r) => (r.innerText || '').replace(/\s+/g, ' ').trim()));
    const {SelectFilesWindow} = require(OMP_FORMATS);
    await pf.rowLink(pf.formatRow(format), 'Select Files').click();
    const select = new SelectFilesWindow(page);
    await expect(select.allStagesBox()).toBeVisible({timeout: T});
    await idle(page);
    out.listOnArrival = await select.form().locator('tbody tr').evaluateAll((rs) => rs.map((r) => (r.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean));
    // The list opens on the Production Ready Files, which this book has none of: show every stage.
    await select.allStagesBox().check();
    await expect(select.fileRows().first()).toBeVisible({timeout: T});
    await idle(page);
    out.listAllStages = await select.form().locator('tbody tr').evaluateAll((rs) => rs.map((r) => (r.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean));
    await snap(page, 's7-select-files');
    const box = select.fileBox(fileName).first();
    out.ticked = await box.getAttribute('value');
    await box.check();
    await select.ok();
    await idle(page);
    const fresh = pf.fileRow(format, fileName).filter({has: page.locator('a', {hasText: /^\s*Awaiting Approval\s*$/})});
    await expect(fresh).toHaveCount(1, {timeout: T});
    await (await pf.openStatus(fresh, 'Awaiting Approval', 'Approve Proof')).ok();
    await idle(page);
    const approved = pf.fileRow(format, fileName).filter({has: page.locator('a', {hasText: /^\s*Set Terms\s*$/})});
    await expect(approved).toHaveCount(1, {timeout: T});
    await pf.rowLink(approved, 'Set Terms').click();
    const terms = new TermsWindow(page);
    await terms.expectOpen();
    await terms.choose(SALES.openAccess);
    await terms.save();
    await idle(page);
    out.rowsAfter = await pf.fileRows(format).evaluateAll((rs) => rs.map((r) => (r.innerText || '').replace(/\s+/g, ' ').trim()));
    await snap(page, 's8-format-rows');
    return out;
}

/**
 * The book's page as a visitor (`version` an earlier version's id, or null for the current one):
 * each chapter's title and the file links under it, and the book-level download links.
 */
async function readBookPage(page, app, sid, version = null, name = 'book-page') {
    const path = version ? `/index.php/${app.contextPath}/catalog/book/${sid}/version/${version}` : `/index.php/${app.contextPath}/catalog/book/${sid}`;
    const r = await page.goto(app.url(path));
    await idle(page);
    const chapters = await page.locator('.obj_monograph_full .item.chapters > ul > li').evaluateAll((lis) =>
        lis.map((li) => ({
            title: (li.querySelector('.title')?.childNodes[0]?.textContent || '').trim(),
            links: [...li.querySelectorAll('.files a')].map((a) => ({text: (a.innerText || '').replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')})),
        }))
    );
    const bookFiles = await page.locator('.obj_monograph_full .item.files a').evaluateAll((as) =>
        as.map((a) => ({text: (a.innerText || '').replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')}))
    );
    const notice = flat(await page.locator('.cmp_notification').first().innerText().catch(() => null), 200);
    await snap(page, name);
    return {status: r?.status(), path, notice, chapters, bookFiles};
}

/** Approve the format file `row` ("Awaiting Approval" › "OK") and give it "Open Access" ("Set Terms" › "Save"). */
async function approveOpenAccess(page, pf, format, fileName, row) {
    const {TermsWindow, SALES} = require(OMP_FORMATS);
    await (await pf.openStatus(row, 'Awaiting Approval', 'Approve Proof')).ok();
    await idle(page);
    const approved = pf.fileRow(format, fileName).filter({has: page.locator('a', {hasText: /^\s*Set Terms\s*$/})});
    await expect(approved).toHaveCount(1, {timeout: T});
    await pf.rowLink(approved, 'Set Terms').click();
    const terms = new TermsWindow(page);
    await terms.expectOpen();
    await terms.choose(SALES.openAccess);
    await terms.save();
    await idle(page);
}

/**
 * A version's "Publication Formats": `format` › "Change File", the upload wizard walked with
 * `filePath` as a "Book Manuscript", then approved and "Open Access". Returns the wizard's title and
 * the format's rows.
 */
async function uploadProof(page, app, sid, pubId, format, filePath) {
    await openPublicationPage(page, app, sid, pubId, 'Publication Formats');
    const {PublicationFormatsPage} = require(OMP_FORMATS);
    const pf = new PublicationFormatsPage(page, app.contextPath);
    await pf.expectLoaded();
    const out = {};
    out.rowsBefore = await pf.fileRows(format).evaluateAll((rs) => rs.map((r) => (r.innerText || '').replace(/\s+/g, ' ').trim()));
    out.wizardTitle = await pf.uploadWithChangeFile(format, filePath, 'Book Manuscript');
    await idle(page);
    const name = filePath.split('/').pop();
    const fresh = pf.fileRow(format, name).filter({has: page.locator('a', {hasText: /^\s*Awaiting Approval\s*$/})});
    await expect(fresh).toHaveCount(1, {timeout: T});
    await approveOpenAccess(page, pf, format, name, fresh);
    out.rowsAfter = await pf.fileRows(format).evaluateAll((rs) => rs.map((r) => (r.innerText || '').replace(/\s+/g, ' ').trim()));
    await snap(page, 'w-format-rows');
    return out;
}

/**
 * Press a chapter's title, set the "Files" box whose value is `fileId` (or the first box labelled
 * `label` that is in the state `from`) to `tick`, "Save". Returns the boxes before the change.
 */
async function setChapterFile(page, list, title, {fileId = null, label = null, from = null}, tick, name) {
    const win = await list.openEdit(title);
    await idle(page);
    const boxes = win.form().locator('input[type="checkbox"][name="files[]"]');
    const before = await boxes.evaluateAll((bs) =>
        bs.map((b) => ({label: ((b.closest('label') || b.parentElement).innerText || '').trim(), checked: b.checked, fileId: Number(b.value)}))
    );
    let target = null;
    if (fileId !== null) target = before.find((b) => b.fileId === fileId);
    else target = before.find((b) => b.label === label && (from === null || b.checked === from));
    if (!target) {
        await win.cancel();
        return {before, changed: null};
    }
    const box = win.form().locator(`input[type="checkbox"][name="files[]"][value="${target.fileId}"]`);
    if (tick) await box.check();
    else await box.uncheck();
    await snap(page, name);
    await win.save();
    return {before, changed: {...target, now: tick}};
}

/**
 * main: "Create New Version" with "Version Source" chosen by its label ("Version of Record 1.0") and
 * "Minor Revision". Returns the window's lists, the answer's status and the new id.
 */
async function newVersionFrom(page, app, sid, sourceLabel) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication', publicationHeading: 'Publication'}});
    await frame.gotoEditorial(sid);
    await frame.expectVersionLoaded().catch(() => {});
    await idle(page);
    const item = await frame.revealPublicationEntry('Create New Version');
    await item.click();
    const dialog = page.getByRole('dialog').filter({has: page.locator('select[name="versionSource"]')}).last();
    await expect(dialog.locator('select[name="versionSource"]')).toBeVisible({timeout: T});
    const out = {};
    out.sources = await dialog.locator('select[name="versionSource"] option').allInnerTexts();
    await dialog.locator('select[name="versionSource"]').selectOption({label: sourceLabel});
    await dialog.locator('select[name="versionIsMinor"]').selectOption({label: 'Minor Revision'});
    const created = page.waitForResponse((r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
    await dialog.getByRole('button', {name: 'Confirm', exact: true}).click();
    const r = await created;
    out.status = r.status();
    if (r.ok()) {
        const j = await r.json();
        out.id = j.id;
        out.version = `${j.versionStage} ${j.versionMajor}.${j.versionMinor}`;
    }
    await expect(dialog).toHaveCount(0, {timeout: T});
    return out;
}

/** A visitor opens a format file's own page by its address; returns the status and the page's heading. */
async function openFilePage(page, app, path) {
    const r = await page.goto(app.url(path));
    await idle(page);
    return {path, status: r?.status(), heading: flat(await page.locator('h1').first().innerText().catch(() => null), 200)};
}

/** Evidence only: the book's files that name a chapter, with that chapter's version. */
function stored(app, sid) {
    return sql(
        app,
        `select sf.submission_file_id, sf.file_stage, coalesce(sf.assoc_type::text, '-'), coalesce(sf.assoc_id::text, '-'),
                s.setting_value as chapter, c.publication_id as chapter_version,
                (select setting_value from submission_file_settings n where n.submission_file_id = sf.submission_file_id and n.setting_name = 'name' and n.locale = 'en')
         from submission_files sf join submission_file_settings s on s.submission_file_id = sf.submission_file_id and s.setting_name = 'chapterId'
         left join submission_chapters c on c.chapter_id::text = s.setting_value
         where sf.submission_id = ${Number(sid)} order by 1`
    )
        .split('\n')
        .filter(Boolean);
}

module.exports = {flat, newVersion, newVersionFrom, publishNewest, openChapters, readChapterFiles, addProofFromList, uploadProof, setChapterFile, readBookPage, openFilePage, stored};
