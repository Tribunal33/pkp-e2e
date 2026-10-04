// Helpers of walk.js here (U72 A8): the press's license, the book's work type, a chapter window's
// "License URL" and its sentence. Requiring this file runs nothing. Every helper presses what a
// person presses or reads what the screen shows; `stored()` reads the database for Evidence only.
// Page objects are required inside the functions (probe kit rule).
const {idle, sql} = require('../../../probe');
const {flat} = require('../publisher-id-on-tab-never-removed/lib');
const {openChapters} = require('../chapter-date-published-shows-today/lib');

const T = 30_000;
const OMP_CHAPTERS = '../../../../../apps/omp/playwright/pages/ChapterPages.js';

/** Settings › Distribution › "License": the `label` radio selected, "Save". Returns the save's status. */
async function setPressLicense(page, app, label) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/distribution`));
    await idle(page);
    await page.locator('#license-button').click();
    const form = page.locator('#license');
    const save = form.getByRole('button', {name: 'Save', exact: true});
    await save.waitFor({timeout: T});
    await idle(page);
    await form.getByRole('radio', {name: label, exact: true}).check();
    const answer = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await save.click();
    const r = await answer;
    await idle(page);
    return {label, status: r ? r.status() : null};
}

/** Book `sid`'s workflow: the header's work-type button read, then `label` chosen from it (when given). */
async function chooseWorkType(page, app, sid, label) {
    const {ChaptersPage} = require(OMP_CHAPTERS);
    const cp = new ChaptersPage(page, app.contextPath);
    await cp.frame.gotoEditorial(sid);
    await idle(page);
    const before = (await cp.workTypeButton().innerText()).trim();
    if (label) await cp.chooseWorkType(label);
    await idle(page);
    return {before, after: (await cp.workTypeButton().innerText()).trim()};
}

/** The open chapter window's "License URL": the box (null when absent), the sentence above it and its link. */
async function readLicense(win) {
    const box = win.licenseUrlBox();
    if (!(await box.count())) return {licenseUrlField: false};
    return {
        licenseUrlField: true,
        box: await box.inputValue(),
        sentence: await box.evaluate((input) => {
            let el = input.parentElement;
            while (el && el.tagName !== 'FORM' && !el.querySelector('.pkpFormField__description')) el = el.parentElement;
            const d = el && el.tagName !== 'FORM' ? el.querySelector('.pkpFormField__description') : null;
            const t = d ? d.innerText.replace(/\s+/g, ' ').trim() : '';
            return t || null;
        }),
        sentenceLink: await win.form().locator('.pkpFormField__description a').first().getAttribute('href').catch(() => null),
        anySentenceInWindow: flat(await win.form().getByText(/The license will be set automatically/).allInnerTexts().then((a) => a.join(' | ')), 300) || null,
    };
}

/** Press the chapter's title, read "License URL", record the screen. Returns {win, license}. */
async function openAndRead(page, list, title, name, snap) {
    const win = await list.openEdit(title);
    await idle(page);
    const license = await readLicense(win);
    await snap(page, name);
    return {win, license};
}

/** The chapter's stored licenseUrl (NULL or the address), for Evidence; the newest chapter of that title. */
function stored(app, title) {
    const t = title.replace(/'/g, "''");
    return flat(sql(app, `select c.publication_id || ':' || coalesce((select setting_value from submission_chapter_settings
        where chapter_id = c.chapter_id and setting_name = 'licenseUrl'), 'NULL') from submission_chapters c
        where c.chapter_id in (select chapter_id from submission_chapter_settings where setting_name = 'title' and setting_value = '${t}')
        order by c.chapter_id`)) || 'no row';
}

/** The version's status, licenseUrl and chapterLicenseUrl, for Evidence. */
function storedPublication(app, pubId) {
    return flat(sql(app, `select p.status || ' license=' || coalesce((select setting_value from publication_settings where publication_id = p.publication_id
        and setting_name = 'licenseUrl' limit 1), 'NULL') || ' chapterLicense=' || coalesce((select setting_value from publication_settings
        where publication_id = p.publication_id and setting_name = 'chapterLicenseUrl' limit 1), 'NULL') from publications p where p.publication_id = ${pubId}`));
}

module.exports = {setPressLicense, chooseWorkType, openChapters, readLicense, openAndRead, stored, storedPublication};
