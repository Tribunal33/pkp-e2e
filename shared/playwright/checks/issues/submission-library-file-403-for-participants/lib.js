// Helpers of walk.js here (issue report
// docs/issues/U39-A1-submission-library-file-403-for-participants.md). Requiring this file runs
// nothing. Every helper drives the workflow's "Library" window, the Settings › Workflow library
// tab, the "Participants" panel or a decision's email page as a person does.
const fs = require('fs');
const path = require('path');
const {idle, screen, record} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

const SUBGRID = '[id^="component-grid-files-submissiondocuments-submissiondocumentsfilesgrid"]';
const PUBGRID = '[id^="component-grid-settings-library-libraryfileadmingrid"]';
const PUBTAB = {ojs: 'Publisher Library', omp: 'Press Library', ops: 'Preprint Server Library'};
const PARTICIPANTS = '[data-cy="workflow-secondary-items"]';

/**
 * Per app, on PKP's default test dataset (docs/process/dataset.md): a submission in Production, the
 * manager-level user who adds the file, the assigned people the report says are refused (the first
 * one also adds a file of their own), and the assigned people who download (the control).
 */
const CASES = {
    ojs: {
        id: 5,
        editor: 'dbarnes',
        refused: [
            {user: 'mfritz', name: 'Maria Fritz', role: 'Copyeditor'},
            {user: 'gcox', name: 'Graham Cox', role: 'Layout Editor'},
        ],
        controls: [
            {user: 'ddiouf', role: 'Author', author: true},
            {user: 'dbuskins', role: 'Section editor'},
        ],
    },
    omp: {
        id: 4,
        editor: 'dbarnes',
        refused: [
            {user: 'mfritz', name: 'Maria Fritz', role: 'Copyeditor'},
            {user: 'gcox', name: 'Graham Cox', role: 'Layout Editor'},
        ],
        controls: [{user: 'bbeaty', role: 'Author', author: true}],
    },
    ops: {
        id: 1,
        editor: 'dbarnes',
        refused: [
            {user: 'dbuskins', name: 'David Buskins', role: 'Moderator', composer: true},
            {user: 'ccorino', name: 'Carlo Corino', role: 'Author', author: true},
        ],
        controls: [],
    },
};

/** Any PDF: the app's own test fixture. */
function pdfOf(app) {
    const dir = path.join(app.root, 'classes/testing/fixtures');
    for (const f of ['article.pdf', 'preprint.pdf', 'replacement.pdf']) {
        if (fs.existsSync(path.join(dir, f))) return path.join(dir, f);
    }
    throw new Error(`no PDF fixture under ${dir}`);
}

/** The workflow header (the workflow page is a side window over the dashboard). */
const header = (page) => page.locator('[data-cy="sidemodal-header"]').first();

/** Open a submission's workflow from the dashboard's address ("My Submissions" for an author). */
async function openWorkflow(page, app, id, {author = false} = {}) {
    const view = author ? 'mySubmissions' : 'editorial';
    // Leave the page first: a goto that changes only the query of the page already open reloads nothing.
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/${view}?workflowSubmissionId=${id}`));
    const open = await header(page)
        .waitFor({timeout: 60_000})
        .then(() => true)
        .catch(() => false);
    await idle(page);
    if (open) {
        await header(page)
            .getByRole('button')
            .first()
            .waitFor({timeout: 10_000})
            .catch(() => {});
    }
    await sleep(400);
    const buttons = (await header(page).getByRole('button').allInnerTexts().catch(() => [])).map((s) => flat(s)).filter(Boolean);
    return {open, buttons};
}

const libraryWindow = (page) => page.getByRole('dialog', {name: 'Submission Library'});

/** Press the header's "Library"; returns the Submission Library list (null when the header has no "Library"). */
async function openLibrary(page) {
    const button = page.getByRole('button', {name: 'Library', exact: true});
    if (!(await button.count())) return null;
    await button.click();
    await libraryWindow(page).waitFor({timeout: T});
    const grid = libraryWindow(page).locator(SUBGRID).first();
    await grid.waitFor({timeout: T});
    await idle(page);
    await sleep(300);
    return grid;
}

/** A library list as data: its top links, and per type the file names (▸ marks a row with the "Edit"/"Delete" arrow). */
async function readList(grid) {
    return grid.evaluate((g) => {
        const clean = (s) => (s || '').split('$(function')[0].replace(/\s+/g, ' ').trim();
        const vis = (e) => !!(e && (e.offsetParent || e.getClientRects().length));
        const actions = [...g.querySelectorAll(':scope > .header a, :scope > .header button')].filter(vis).map((a) => clean(a.innerText));
        const groups = {};
        for (const tb of g.querySelectorAll('tbody.category_grid_body')) {
            const trs = [...tb.querySelectorAll(':scope > tr.gridRow')];
            const rows = trs
                .slice(1)
                .map((tr) => {
                    const a = tr.querySelector('.gridCellContainer a');
                    return a ? `${clean(a.innerText)}${tr.querySelector('a.show_extras, a.hide_extras') ? ' ▸' : ''}` : null;
                })
                .filter(Boolean);
            if (rows.length) groups[clean(trs[0] ? trs[0].innerText : '')] = rows;
        }
        return {actions, groups};
    });
}

/** The links a row's arrow opens ("Edit", "Delete"). */
async function rowLinks(page, grid, name) {
    const row = grid
        .locator('tr.gridRow')
        .filter({has: page.getByRole('link', {name, exact: true})})
        .first();
    const toggle = row.locator('a.show_extras').first();
    if (!(await toggle.count())) return [];
    await toggle.click();
    await sleep(400);
    const links = (await row.locator('xpath=following-sibling::tr[1]').locator('a:visible').allInnerTexts()).map((s) => s.trim()).filter(Boolean);
    await row
        .locator('a.hide_extras')
        .first()
        .click()
        .catch(() => {});
    await sleep(300);
    return links;
}

/** "Add a file" on a library list: name, type, the upload, "OK". True when the window closed. */
async function addFile(page, grid, {name, type, file}) {
    await grid.getByRole('link', {name: 'Add a file', exact: true}).first().click();
    const form = page
        .locator('form')
        .filter({has: page.locator('input[name^="libraryFileName"]')})
        .last();
    await form.waitFor({timeout: T});
    await idle(page);
    await sleep(300);
    await form.locator('input[name^="libraryFileName"]').first().fill(name);
    await form.locator('select[name="fileType"]').selectOption({label: type});
    await form.locator('input[type="file"]').first().setInputFiles(file);
    await page.waitForFunction(() => [...document.querySelectorAll('form input[name="temporaryFileId"]')].some((i) => i.value), null, {timeout: T});
    await idle(page);
    await form.getByRole('button', {name: 'OK', exact: true}).click();
    const closed = await form
        .waitFor({state: 'detached', timeout: T})
        .then(() => true)
        .catch(() => false);
    await idle(page);
    await sleep(500);
    return closed;
}

/**
 * Press a link that should download, and say what happened: {kind: 'download', name, stayed} when a
 * file came (in place or in a new tab), {kind: 'navigated' | 'popup', url, text} when the page (or a
 * new tab) showed something instead, {kind: 'none'}. `responses` lists the library download answers.
 */
async function press(page, link, label) {
    const context = page.context();
    const before = page.url();
    const responses = [];
    const onResponse = (r) => {
        if (/download-library-file|downloadLibraryFile/.test(r.url())) {
            responses.push({
                url: r.url().replace(/^.*\/index\.php/, ''),
                status: r.status(),
                type: r.headers()['content-type'] || null,
                disposition: r.headers()['content-disposition'] || null,
            });
        }
    };
    context.on('response', onResponse);
    const dl = page
        .waitForEvent('download', {timeout: 20_000})
        .then((d) => ({d}))
        .catch(() => null);
    const nav = page
        .waitForEvent('framenavigated', {timeout: 20_000})
        .then((f) => (f === page.mainFrame() ? {nav: f.url()} : null))
        .catch(() => null);
    const pop = context
        .waitForEvent('page', {timeout: 20_000})
        .then((p) => ({p}))
        .catch(() => null);
    await link.click();
    let out;
    const first = await Promise.race([
        dl,
        nav.then(async (n) => {
            if (!n) return null;
            await sleep(1500);
            return n;
        }),
        pop,
    ]);
    if (first && first.d) {
        out = {kind: 'download', where: 'page', name: first.d.suggestedFilename(), stayed: page.url() === before};
    } else if (first && first.p) {
        const tab = first.p;
        const second = await Promise.race([
            tab
                .waitForEvent('download', {timeout: 8_000})
                .then((d) => ({d}))
                .catch(() => null),
            tab
                .waitForLoadState('domcontentloaded', {timeout: 8_000})
                .then(() => sleep(1500))
                .then(() => null)
                .catch(() => null),
        ]);
        if (second && second.d) {
            out = {kind: 'download', where: 'new tab', name: second.d.suggestedFilename(), stayed: page.url() === before};
        } else {
            const text = await tab
                .locator('body')
                .innerText({timeout: 5_000})
                .catch(() => null);
            out = {kind: 'popup', url: tab.url().replace(/^.*\/index\.php/, ''), text: flat(text), stayed: page.url() === before};
        }
        await tab.close().catch(() => {});
    } else {
        const late = await Promise.race([dl, sleep(3_000).then(() => null)]);
        if (late && late.d) {
            out = {kind: 'download', where: 'page', name: late.d.suggestedFilename(), stayed: page.url() === before};
        } else {
            await page.waitForLoadState('domcontentloaded').catch(() => {});
            const text = await page
                .locator('body')
                .innerText()
                .catch(() => null);
            out = {kind: page.url() === before ? 'none' : 'navigated', url: page.url().replace(/^.*\/index\.php/, ''), text: flat(text)};
        }
    }
    context.off('response', onResponse);
    out.responses = responses;
    if (out.kind === 'navigated') record(label, await screen(page));
    // The list's download link finishes on a two-second timer; wait it out before the next action.
    if (out.kind === 'download' && out.where === 'page') await sleep(2_100);
    return out;
}

/** Settings › Workflow › the library tab; returns its list. */
async function openPublisherLibrary(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/workflow`));
    await idle(page);
    await page.getByRole('tab', {name: PUBTAB[app.name], exact: true}).click();
    const grid = page.locator(PUBGRID).first();
    await grid.waitFor({timeout: T});
    await idle(page);
    await sleep(300);
    return grid;
}

/** In an open "Submission Library" window: "View Document Library"; returns that window. */
async function openViewDocumentLibrary(page, grid) {
    await grid.getByRole('link', {name: 'View Document Library', exact: true}).click();
    const win = page.getByRole('dialog', {name: 'View Document Library'});
    await win.waitFor({timeout: T});
    await idle(page);
    await sleep(500);
    return win;
}

/** The workflow's "Participants": row menu › "Remove" › "OK" on the person named. */
async function removeParticipant(page, name) {
    const row = page
        .locator(`${PARTICIPANTS} li`)
        .filter({has: page.getByText(name, {exact: true})})
        .first();
    if (!(await row.count())) return {listed: false};
    await row.locator('button[aria-haspopup="menu"]').click();
    await page.getByRole('menuitem', {name: 'Remove', exact: true}).click();
    const dialog = page.getByRole('dialog', {name: 'Remove Participant', exact: true});
    await dialog.getByRole('button', {name: 'OK', exact: true}).waitFor({timeout: T});
    const answered = page.waitForResponse((r) => r.url().includes('delete-participant'), {timeout: T});
    await dialog.getByRole('button', {name: 'OK', exact: true}).click();
    const response = await answered;
    await dialog.waitFor({state: 'detached', timeout: T}).catch(() => {});
    await sleep(1_500);
    await idle(page);
    return {listed: true, status: response.status(), stillListed: (await row.count()) > 0};
}

/**
 * From an open workflow: press "Decline Submission", and on its email page "Attach Files" ›
 * "Attach Library Files". Returns the "Library Files" window, or what stopped the way there.
 */
async function openDeclineLibraryFiles(page) {
    const decline = page.getByRole('button', {name: /^Decline Submission$/}).first();
    if (!(await decline.count())) return {stopped: 'no "Decline Submission" button'};
    await decline.click();
    await page.waitForURL(/decision/, {timeout: T}).catch(() => {});
    await idle(page);
    const attach = page
        .locator('.tox-tbtn:visible')
        .filter({hasText: /^Attach Files$/})
        .first();
    const ready = await attach
        .waitFor({timeout: T})
        .then(() => true)
        .catch(() => false);
    if (!ready) return {stopped: 'no "Attach Files" button', url: page.url().replace(/^.*\/index\.php/, '')};
    await page
        .locator('.composer__loadingTemplateMask')
        .waitFor({state: 'detached', timeout: T})
        .catch(() => {});
    await idle(page);
    await attach.click();
    const attachWindow = page.getByRole('dialog', {name: 'Attach Files', exact: true}).last();
    await attachWindow.waitFor({timeout: T});
    await idle(page);
    await attachWindow.getByRole('button', {name: 'Attach Library Files', exact: true}).first().click();
    const win = page.getByRole('dialog', {name: 'Library Files', exact: true}).last();
    await win.waitFor({timeout: T});
    await win
        .locator('.selectSubmissionFileListItem, :text("No items found.")')
        .first()
        .waitFor({timeout: 20_000})
        .catch(() => {});
    await idle(page);
    const items = await win.locator('.selectSubmissionFileListItem').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s*\n+\s*/g, ' | ').trim()));
    return {win, items, url: page.url().replace(/^.*\/index\.php/, '')};
}

module.exports = {
    T,
    sleep,
    flat,
    CASES,
    pdfOf,
    header,
    openWorkflow,
    libraryWindow,
    openLibrary,
    readList,
    rowLinks,
    addFile,
    press,
    openPublisherLibrary,
    openViewDocumentLibrary,
    removeParticipant,
    openDeclineLibraryFiles,
};
