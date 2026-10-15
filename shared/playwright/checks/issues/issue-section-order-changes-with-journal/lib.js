// Helpers of walk.js (U50 A21). Requiring this file runs nothing. Every helper drives the
// screens a person uses; `stored()` only reads the database for the Evidence.
const {expect} = require('@playwright/test');
const {screen, record, shot, idle, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u ? String(u).replace(/^https?:\/\/[^/]+/, '') : u);
const controls = (page) => page.locator('[data-cy="workflow-controls-right"]');
const esc = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const whole = (t) => new RegExp(`^\\s*${esc(t)}\\s*$`);

const ISSUE = 'Vol. 1 No. 2 (2014)';
const SECTION = {title: 'Essays hkk20', abbrev: 'ESh20'};
/** The two Production submissions the steps publish into the issue, and their sections. */
const ITEMS = [
    {id: 5, section: 'Reviews'},
    {id: 6, section: SECTION.title},
];

const v35 = (app) => app.line === 'stable-3_5_0';

async function snap(page, name) {
    let s;
    try {
        s = await screen(page);
    } catch (e) {
        s = {url: page.url(), error: flat(e.message, 200)};
    }
    record(name, s);
    await shot(page, name).catch(() => {});
    return s;
}

/** Settings › Journal › "Sections". */
async function openSections(page, app) {
    const {SectionsTab} = require('../../../pages/SectionsPages.js');
    const tab = new SectionsTab(page, app.contextPath, {locale: 'en'});
    await tab.goto();
    return tab;
}

/** The "Sections" list's titles, in screen order. */
async function sectionTitles(tab) {
    return (await tab.titleCells().allInnerTexts()).map((t) => flat(t));
}

/** "Create Section": Title, Abbreviation, "Save". */
async function createSection(page, app) {
    const tab = await openSections(page, app);
    const win = await tab.openAdd();
    await win.type('title[en]', SECTION.title);
    await win.type('abbrev[en]', SECTION.abbrev);
    const status = (await win.saveAndClose()).status();
    await idle(page).catch(() => {});
    await sleep(800);
    return {status, list: await sectionTitles(tab)};
}

/**
 * "Order" on the "Sections" list, each [from, to] drag putting `from` right above `to`,
 * then "Done".
 */
async function orderSections(page, app, drags) {
    const tab = await openSections(page, app);
    const before = await sectionTitles(tab);
    await tab.startOrdering();
    for (const [from, to] of drags) {
        await tab.drag(from, to);
        await sleep(600);
    }
    const dropped = await sectionTitles(tab);
    const status = (await tab.done()).status();
    await sleep(800);
    await tab.reload();
    return {before, dropped, status, after: await sectionTitles(tab)};
}

/** Open a submission's workflow from the editorial dashboard address. */
async function openWorkflow(page, app, id) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    await idle(page).catch(() => {});
    await page.getByRole('dialog').getByRole('navigation').getByRole('link', {name: 'Publication'}).first().waitFor({timeout: T});
    await sleep(1200);
}

/** The version's page holding "Section" (main: "Publication Settings"; 3.5: "Issue"). */
async function openEntryPage(page, app) {
    const entry = v35(app) ? 'Issue' : 'Publication Settings';
    const link = page.getByRole('dialog').getByRole('navigation').getByRole('link', {name: entry, exact: true}).last();
    if (!(await link.isVisible().catch(() => false))) {
        await page.getByRole('dialog').getByRole('navigation').getByRole('link', {name: 'Publication'}).first().click();
        await sleep(500);
    }
    await link.click();
    await expect(page.getByRole('heading', {name: `Publication: ${entry}`})).toBeVisible({timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    await sleep(800);
}

/**
 * On the open page: the issue (3.5: through "Assign to Issue" first; main: "Issue Assignment"
 * on the page), then "Section" chosen by its title, and "Save".
 */
async function setSection(page, app, sectionTitle, label) {
    const out = {};
    if (v35(app)) {
        const assignButton = page.getByRole('button', {name: /^(Assign to Issue|Change Issue)$/}).first();
        if (await assignButton.isVisible().catch(() => false)) {
            await assignButton.click();
            const dialog = page.getByRole('dialog').filter({has: page.locator('select[name="issueId"]')}).last();
            const select = dialog.locator('select[name="issueId"]');
            await expect(select).toBeVisible({timeout: T});
            const value = await select.locator('option').filter({hasText: ISSUE}).first().getAttribute('value');
            await select.selectOption(value || '');
            const saved = page.waitForResponse((r) => /\/publications\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: T});
            await dialog.getByRole('button', {name: /^(Save|Assign|OK)$/}).last().click();
            out.issueSave = (await saved).status();
            await idle(page).catch(() => {});
            await sleep(1000);
        }
    }
    // main: "Issue Assignment" is required on the page: "Assign To Current/Back Issue" and the issue.
    const assign = page.getByRole('radio', {name: 'Assign To Current/Back Issue', exact: true});
    if (await assign.isVisible().catch(() => false)) {
        await assign.check();
        const issueSelect = page.locator('select[name="issueId"]:visible').first();
        await expect(issueSelect).toBeVisible({timeout: T});
        const value = await issueSelect.locator('option').filter({hasText: ISSUE}).first().getAttribute('value');
        await issueSelect.selectOption(value || '');
        out.issue = ISSUE;
    }
    const select = page.locator('select[name="sectionId"]:visible').first();
    await expect(select).toBeVisible({timeout: T});
    out.options = (await select.locator('option').allInnerTexts()).map((t) => flat(t));
    await select.selectOption({label: sectionTitle});
    await snap(page, `${label}-entry`);
    const saved = page.waitForResponse((r) => /\/publications\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST', {timeout: T});
    await page.getByRole('button', {name: 'Save', exact: true}).last().click();
    out.save = (await saved).status();
    await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    return out;
}

/**
 * The header's "Publish", then each window until the publish call answers: the details
 * (main: Version of Record, "Assign To Current/Back Issue" with the issue), "Confirm",
 * then the question's "Publish".
 */
async function publish(page, app, label) {
    const published = page.waitForResponse((r) => /\/publish$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: 90_000});
    let done = false;
    published.then(() => { done = true; }, () => { done = true; });
    const header = controls(page).getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).first();
    await header.waitFor({state: 'visible', timeout: T});
    const out = {button: flat(await header.innerText(), 60), windows: []};
    await header.click();
    for (let i = 0; i < 6 && !done; i++) {
        const dlg = page.getByRole('dialog').last();
        const btn = dlg.getByRole('button', {name: /^(Confirm|Publish|Schedule For Publication)$/}).last();
        const shown = await btn.waitFor({state: 'visible', timeout: 15_000}).then(() => true).catch(() => false);
        if (done) break;
        if (!shown) continue;
        await sleep(1200);
        const stage = dlg.locator('select[name="versionStage"]');
        if (await stage.isVisible().catch(() => false)) {
            await stage.selectOption('VoR').catch(() => {});
            const minor = dlg.locator('select[name="versionIsMinor"]');
            if (await minor.isVisible().catch(() => false)) await minor.selectOption('false').catch(() => {});
        }
        const assign = dlg.getByRole('radio', {name: 'Assign To Current/Back Issue', exact: true});
        if (await assign.isVisible().catch(() => false)) {
            if (!(await assign.isChecked().catch(() => false))) await assign.check();
            const select = dlg.locator('select[name="issueId"]');
            await expect(select).toBeVisible({timeout: T});
            const value = await select.locator('option').filter({hasText: ISSUE}).first().getAttribute('value');
            await select.selectOption(value || '');
            await sleep(400);
        }
        out.windows.push(flat(await dlg.innerText().catch(() => null), 500));
        await shot(page, `${label}-publish-${i}`).catch(() => {});
        await btn.click();
        await sleep(1500);
    }
    const r = await published;
    out.publish = r.status();
    await controls(page).getByRole('button', {name: /^(Unpublish|Unschedule)$/}).first().waitFor({timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    await sleep(800);
    return out;
}

/** Issues › "Back Issues" › the issue's "Edit" › "Table of Contents". */
async function openToc(page, app) {
    const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
    const admin = new IssuesAdmin(page, app.contextPath);
    await admin.goto('Back Issues');
    const win = await admin.openManagement('Back Issues', ISSUE);
    await win.openTab('Table of Contents');
    return win;
}

/** The headings of the tab's list, in order. */
async function tocSections(win) {
    return (await win.tocOutline()).filter((l) => l.startsWith('# ')).map((l) => l.slice(2));
}

/** A section's heading row on the tab. */
function headingRow(win, title) {
    return win.tocGrid().locator('tr.gridRow:not(.has_extras)').filter({hasText: whole(title)});
}

/** Drag a row below another: pressed, moved in steps, released just below the target. */
async function dragRowBelow(page, moving, target) {
    await moving.scrollIntoViewIfNeeded();
    const from = await moving.boundingBox();
    const to = await target.boundingBox();
    if (!from || !to) throw new Error('dragRowBelow: a row has no box');
    const x = from.x + 40;
    await page.mouse.move(x, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(x, from.y + from.height / 2 + 6, {steps: 4});
    await page.mouse.move(x, to.y + to.height - 4, {steps: 20});
    await page.mouse.move(x, to.y + to.height + 8, {steps: 6});
    await page.mouse.up();
}

/** The last visible row of the tab's list (the last section's last article). */
function lastRow(win) {
    return win.tocGrid().locator('tr.gridRow:visible').last();
}

/**
 * On the open tab: "Order"; when `heading` is given, that section's heading dropped below
 * the last row of the list (a person's drag of a section to the end); "Done". With no
 * heading, "Done" with nothing moved. Returns the list as dropped and after the save.
 */
async function orderToc(page, win, heading) {
    const ordering = win.tocOrdering();
    const before = await tocSections(win);
    await ordering.start();
    if (heading) {
        await dragRowBelow(page, headingRow(win, heading), lastRow(win));
        await sleep(800);
    }
    const dropped = await tocSections(win);
    const status = (await ordering.done()).status();
    await sleep(800);
    return {before, dropped, status, after: await tocSections(win)};
}

/** The issue's page as a reader sees it (Archives › the issue): its section headings. */
async function readIssuePage(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}/issue/archive`));
    await idle(page).catch(() => {});
    const link = page.locator('.obj_issue_summary a.title').filter({hasText: ISSUE}).first();
    await link.click();
    await idle(page).catch(() => {});
    const sections = await page.locator('.obj_issue_toc .sections .section').evaluateAll((els) =>
        els.map((s) => {
            const h = s.querySelector('h2, h3');
            return {
                heading: h ? h.textContent.replace(/\s+/g, ' ').trim() : null,
                titles: [...s.querySelectorAll('.obj_article_summary .title')].map((t) => t.textContent.replace(/\s+/g, ' ').trim()),
            };
        })
    );
    return {url: rel(page.url()), sections, headings: sections.map((s) => s.heading)};
}

/** What the database holds (Evidence only): the journal's places and the issue's own. */
function stored(app) {
    const issueId = sql(app, `select i.issue_id from issues i where i.volume=1 and i.number='2' and i.year=2014`);
    const title = `(select setting_value from section_settings ss where ss.section_id=s.section_id and ss.setting_name='title' and ss.locale='en')`;
    return {
        journal: sql(app, `select ${title}, s.seq from sections s order by s.seq, s.section_id`).split('\n'),
        issue: sql(app, `select ${title}, o.seq from custom_section_orders o join sections s on s.section_id=o.section_id where o.issue_id=${issueId} order by o.seq`).split('\n').filter(Boolean),
    };
}

module.exports = {
    T, sleep, flat, rel, ISSUE, SECTION, ITEMS, v35, snap,
    openSections, sectionTitles, createSection, orderSections,
    openWorkflow, openEntryPage, setSection, publish,
    openToc, tocSections, orderToc, readIssuePage, stored,
};
