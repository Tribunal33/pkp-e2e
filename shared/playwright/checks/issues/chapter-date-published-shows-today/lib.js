// Helpers of walk.js here (U72 A4, joined to docs/issues/U50-A4-refused-save-date-published-today.md):
// a chapter's "Date Published" window on OMP. Requiring this file runs nothing. Every helper
// presses what a person presses or reads what the screen shows; `stored()` reads the database for
// Evidence only. Page objects are required inside the functions (probe kit rule).
const {idle, sql} = require('../../../probe');
const {snap, flat, openPublicationPage} = require('../publisher-id-on-tab-never-removed/lib');

const OMP_CHAPTERS = '../../../../../apps/omp/playwright/pages/ChapterPages.js';

/** Open book `sid`, "Marketing" › "Publication Dates", select `option` and press "Save". */
async function setPublicationDates(page, app, sid, option) {
    const {ChaptersPage} = require(OMP_CHAPTERS);
    const cp = new ChaptersPage(page, app.contextPath);
    await cp.frame.gotoEditorial(sid);
    await idle(page);
    await cp.openPublicationDates();
    await cp.savePublicationDates(option);
    await idle(page);
    await snap(page, 's3-publication-dates-saved');
    return {checked: await cp.publicationDatesRadio(option).isChecked()};
}

/** "Publication" › "Chapters" of book `sid`, version `pubId`; the chapter list. */
async function openChapters(page, app, sid, pubId) {
    await openPublicationPage(page, app, sid, pubId, 'Chapters');
    const {ChapterList} = require(OMP_CHAPTERS);
    const list = new ChapterList(page);
    await list.expectLoaded();
    return list;
}

/** What "Date Published" shows (the visible box) and what "Save" would post (its hidden field). */
async function readDate(win) {
    const box = win.datePublishedBox();
    if (!(await box.count())) return {box: null, posted: null};
    const hidden = win.form().locator('input[type="hidden"][id^="datePublished"][id$="-altField"]');
    return {
        box: await box.inputValue(),
        posted: (await hidden.count()) ? await hidden.first().inputValue() : null,
    };
}

/** Press the chapter's title, read "Date Published", record the screen. Returns {win, date}. */
async function openAndRead(page, list, title, name) {
    const win = await list.openEdit(title);
    await idle(page);
    const date = await readDate(win);
    await snap(page, name);
    return {win, date};
}

/** The chapter's stored datePublished (NULL, '' or the date), for Evidence. */
function stored(app, title) {
    const t = title.replace(/'/g, "''");
    return flat(sql(app, `select coalesce('[' || s.setting_value || ']', 'NULL') from submission_chapter_settings s
        where s.setting_name = 'datePublished' and s.chapter_id in (select chapter_id from submission_chapter_settings
        where setting_name = 'title' and setting_value = '${t}')`)) || 'no row';
}

module.exports = {setPublicationDates, openChapters, readDate, openAndRead, stored};
