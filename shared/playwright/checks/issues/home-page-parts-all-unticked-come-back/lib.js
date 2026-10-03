// Helpers of walk.js (U10 OJS5: every "Journal Content Organization" box unticked and saved, the default comes back).
// Requiring this file runs nothing. The tick-and-save helper is U13 A4's (listing-offers-galley-without-file/lib.js).
const {idle, sql} = require('../../../probe');
const {setContentOrganization} = require('../listing-offers-galley-without-file/lib');

const BOXES = [
    "Include the current issue's table of contents",
    'Include recent most published articles',
    'Include a listing of categories',
];
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Settings › Website › "Appearance" › "Theme" opened afresh: the group's boxes, which are ticked, and whether the group is there at all. */
async function readTab(page, app) {
    const {WebsiteSettings} = require('../../../pages/AppearancePages.js');
    const site = new WebsiteSettings(page, app.contextPath);
    await site.goto();
    const form = await site.open('theme');
    const present = (await form.form.locator('input[name="journalContentOrganization"]').count()) > 0;
    return {groupPresent: present, ticked: present ? await form.chosen('journalContentOrganization') : null};
}

/** Tick exactly `on` (labels) among the three boxes, untick the rest, press "Save"; the save's status and the form's status line. */
async function chooseAndSave(page, app, on) {
    const want = Object.fromEntries(BOXES.map((b) => [b, on.includes(b)]));
    const out = await setContentOrganization(page, app, want);
    const status = flat(await page.locator('.pkpFormPage__status').first().innerText().catch(() => null));
    return {...out, statusLine: status};
}

/** The journal's home page as a visitor reads it: its level-2 headings, the current issue's title, the latest articles' count. */
async function homePage(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}`));
    await idle(page);
    const main = page.locator('.page_index_journal');
    const currentIssue = page.locator('section.current_issue');
    return {
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        headings: (await main.locator('h2').allInnerTexts()).map((t) => flat(t)),
        currentIssue: (await currentIssue.count()) ? flat(await currentIssue.locator('.current_issue_title').innerText().catch(() => ''), 120) : null,
        latestArticles: await main.locator('.obj_article_summary').count(),
        categories: await page.locator('.category_header, .categories').count(),
    };
}

/** The stored theme option, read from the database (evidence only): the row or "(no row)". */
async function storedOption(app) {
    const rows = await sql(app, "select setting_value, setting_type from plugin_settings where plugin_name = 'defaultthemeplugin' and setting_name = 'journalContentOrganization' order by context_id");
    return rows && String(rows).trim() ? String(rows).trim() : '(no row)';
}

module.exports = {BOXES, readTab, chooseAndSave, homePage, storedOption};
