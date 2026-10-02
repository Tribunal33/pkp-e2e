// Helpers of walk.js here (issue report docs/issues/U44-OJS3-OMP5-issue-and-press-file-publisher-id-never-kept.md).
// Requiring this file runs nothing. Every helper presses what a person presses, or reads what the
// screen shows; `stored()` reads the database for Evidence only. Page objects are required inside
// the functions (probe kit rule). The settings step comes from the U44 OJS1 walk's lib.
const {idle, screen, record, shot, serverLog, sql} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const OMP_PAGES = '../../../../../apps/omp/playwright/pages/PublicationFormatPages.js';

async function snap(page, name) {
    record(name, await screen(page));
    await shot(page, name).catch(() => {});
}

/** Settings › Workflow › Submission › "Metadata": tick the "Publisher ID" boxes named, "Save". */
async function enablePublisherIds(page, app, labels) {
    return require('../new-issue-galley-publisher-id-server-error/lib').enablePublisherIds(page, app, labels);
}

/** What an open "Identifiers" tab shows: the box (or its absence), the URN area, the refusal, "Save". */
async function readTab(win) {
    const form = win.form();
    const box = form.locator('input[name="publisherId"]');
    const boxCount = await box.count();
    return {
        tabs: await win.tabNames().catch(() => null),
        publisherIdBox: boxCount ? {value: await box.inputValue(), label: flat(await form.locator('label').filter({hasText: 'Publisher ID'}).first().innerText().catch(() => null))} : null,
        formErrors: flat(await form.locator('#formErrors, .pkp_form_error, .notifyFormError').allInnerTexts().then((a) => a.join(' | ')).catch(() => ''), 600),
        formText: flat(await form.innerText().catch(() => ''), 900),
        saveButton: await win.saveButton().count(),
    };
}

/**
 * Type `value` in the open tab's "Publisher ID" (when the box is there) and press "Save". Reads the
 * answer, the server log's error lines written since, whether the window closed, and, when it stayed
 * open, the tab as it re-rendered. Never throws on what the screen does.
 */
async function typeAndSave(page, app, win, value, name) {
    const log = serverLog(app);
    const from = log.mark();
    await screen(page); // clears the notices seen so far
    const box = win.form().locator('input[name="publisherId"]');
    const hadBox = (await box.count()) > 0;
    if (hadBox && value != null) await box.fill(value);
    const answered = page.waitForResponse((r) => /update-identifiers/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
    await win.saveButton().click();
    const r = await answered;
    let text = '';
    try { text = await r.text(); } catch (e) { text = ''; }
    let json = null;
    try { json = JSON.parse(text); } catch (e) { json = null; }
    await idle(page).catch(() => {});
    await sleep(1000); // a legacy window's close; bounded, read once
    const open = (await win.dialog.count()) > 0 && (await win.dialog.isVisible().catch(() => false));
    const tab = open ? await readTab(win) : null;
    const s = await screen(page);
    record(`${name}-after-save`, s);
    await shot(page, `${name}-after-save`).catch(() => {});
    return {
        typed: hadBox ? value : `(no box; ${value} not typed)`,
        url: r.url().replace(/^https?:\/\/[^/]+/, ''),
        status: r.status(),
        json_status: json ? json.status : null,
        json_event: json && json.event ? json.event : null,
        serverLog: log.since(from).map((l) => flat(l, 400)),
        windowOpen: open,
        tab,
        notices: s.notices,
    };
}

/** OJS: Issues › "Future Issues" (or "Back Issues") › the issue's arrow › "Edit" › "Identifiers". */
async function openIssueTab(page, app, identification, {back = false} = {}, name) {
    const {IssuesPage} = require('../../../pages/IdentifiersPages.js');
    const issues = new IssuesPage(page, app.contextPath);
    await issues.open({back});
    const win = await issues.openIdentifiers(identification);
    await idle(page);
    if (name) await snap(page, name);
    return win;
}

/** OMP: the workflow of `submissionId` › Publication › "Publication Formats". */
async function openFormats(page, app, submissionId, publicationId) {
    const {PublicationFormatsPage} = require(OMP_PAGES);
    const formats = new PublicationFormatsPage(page, app.contextPath);
    const key = app.line === 'stable-3_5_0' ? 'publication_publicationFormats' : `publication_${publicationId}_publicationFormats`;
    await formats.frame.gotoEditorial(submissionId, {menuKey: key});
    try {
        await formats.expectLoaded();
    } catch (e) {
        // a key the line does not know opens the stage view: take the side menu's link
        await formats.frame.dialog().getByRole('link', {name: 'Publication Formats', exact: true}).first().click();
        await formats.expectLoaded();
    }
    await idle(page);
    return formats;
}

/** OMP: a format's file row › arrow › "Edit" ("Edit a file") › "Identifiers". */
async function openFileTab(page, formats, format, fileName, name) {
    const {LegacyIdentifiersWindow} = require('../../../pages/IdentifiersPages.js');
    await formats.pressRowEntry(formats.fileRow(format, fileName), 'Edit');
    const dialog = page.getByRole('dialog').filter({has: page.getByRole('tab', {name: 'Identifiers', exact: true})}).last();
    const win = new LegacyIdentifiersWindow(page, dialog);
    await win.tab('Identifiers').waitFor({timeout: T});
    const title = flat(await dialog.locator('h1, h2, .pkp_modal_title, [class*="header"]').first().innerText().catch(() => null), 120);
    await win.openIdentifiersTab();
    await idle(page);
    if (name) await snap(page, name);
    return {win, title};
}

/** Close an open legacy window with its "Close" (answering any "data has changed" confirm with OK). */
async function closeWindow(page, win) {
    if (!((await win.dialog.count()) > 0)) return;
    const onDialog = (d) => d.accept().catch(() => {});
    page.on('dialog', onDialog);
    try {
        await win.close();
    } finally {
        page.off('dialog', onDialog);
    }
}

/** Evidence only: the stored publisher-id rows of an issue or a submission file. */
function stored(app, kind, id) {
    if (kind === 'issue') return sql(app, `select issue_id, setting_value from issue_settings where setting_name = 'pub-id::publisher-id' and issue_id = ${Number(id)}`);
    return sql(app, `select submission_file_id, setting_value from submission_file_settings where setting_name = 'pub-id::publisher-id' and submission_file_id = ${Number(id)}`);
}

/** OMP: the book page's file links (`/catalog/view/…`), and what the one named `fileName` opens. */
async function bookPageFile(page, app, submissionId, fileName, name) {
    await page.goto(app.url(`/index.php/${app.contextPath}/catalog/book/${submissionId}`));
    await idle(page);
    await snap(page, name);
    const links = await page.locator(`a[href*="/catalog/view/${submissionId}/"]`).evaluateAll((as) =>
        as.map((a) => ({text: (a.textContent || '').replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')}))
    );
    const target = links.find((l) => l.text.includes(fileName.replace(/\.pdf$/, ''))) || links[0] || null;
    let opened = null;
    if (target) {
        const resp = await page.goto(target.href);
        await idle(page).catch(() => {});
        opened = {status: resp ? resp.status() : null, url: page.url().replace(/^https?:\/\/[^/]+/, ''), title: await page.title(), text: flat(await page.locator('body').innerText().catch(() => ''), 300)};
        await snap(page, `${name}-opened`);
    }
    return {links: links.map((l) => ({...l, href: l.href && l.href.replace(/^https?:\/\/[^/]+/, '')})), target: target && target.href.replace(/^https?:\/\/[^/]+/, ''), opened};
}

module.exports = {T, flat, sleep, snap, enablePublisherIds, readTab, typeAndSave, openIssueTab, openFormats, openFileTab, closeWindow, stored, bookPageFile};
