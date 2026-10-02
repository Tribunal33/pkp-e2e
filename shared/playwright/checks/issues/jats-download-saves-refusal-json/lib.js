// Helpers of walk.js (U48 A11: "Download" on an uploaded JATS file saves a refusal as
// "download-file.json" for a role without Production access). Requiring this file runs nothing.
// The workflow by address is the sibling walk's (change-file-keeps-first-upload).
const fs = require('fs');
const os = require('os');
const path = require('path');
const {idle, sql} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const FILE = 'u48r9-jats.xml';

/** A small JATS XML file named u48r9-jats.xml in a temp folder: {path, name, text}. */
function theFile() {
    const text = '<?xml version="1.0" encoding="UTF-8"?>\n'
        + '<article xmlns:xlink="http://www.w3.org/1999/xlink" article-type="research-article" dtd-version="1.2">\n'
        + '  <front>\n    <article-meta>\n      <title-group>\n'
        + '        <article-title>u48r9 uploaded JATS</article-title>\n'
        + '      </title-group>\n    </article-meta>\n  </front>\n</article>\n';
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'u48r9-'));
    const p = path.join(dir, FILE);
    fs.writeFileSync(p, text);
    return {path: p, name: FILE, text};
}

/** The current publication's id of a submission (the version the workflow opens on). */
function currentPublicationId(app, submissionId) {
    const out = sql(app, `select current_publication_id from submissions where submission_id = ${Number(submissionId)}`);
    return Number(String(out).split('\n')[0].trim());
}

/** The workflow dialog. */
const workflow = (page) => page.getByRole('dialog').filter({has: page.locator('[data-cy="sidemodal-header"]')}).first();

/**
 * The side menu's "JATS XML" under the newest version: unfolds the version when its pages are
 * hidden. Returns how it got there; falls back to nothing (the caller records it).
 */
async function chooseJats(page) {
    const dlg = workflow(page);
    await dlg.waitFor({state: 'visible', timeout: 60_000});
    await idle(page);
    let link = dlg.getByRole('link', {name: 'JATS XML', exact: true}).first();
    if (!(await link.isVisible().catch(() => false))) {
        const nodes = dlg.getByRole('link', {name: /^(Unassigned version|Version of Record|Author Original|All Versions)\b/});
        if (await nodes.count()) { await nodes.last().click(); await idle(page); }
        link = dlg.getByRole('link', {name: 'JATS XML', exact: true}).first();
    }
    const menu = flat(await dlg.locator('nav, [role="navigation"]').first().innerText().catch(() => null), 800);
    if (!(await link.isVisible().catch(() => false))) return {offered: false, menu};
    await link.click();
    await page.locator('.jatsPanel .filePanel__ready').first().waitFor({state: 'visible', timeout: T});
    await idle(page);
    return {offered: true, ...(await readJats(page))};
}

/** What the JATS page shows: heading, the heading row's buttons, the XML's start, the line under it. */
async function readJats(page) {
    const panel = page.locator('.jatsPanel').first();
    await panel.locator('.filePanel__ready').first().waitFor({state: 'visible', timeout: T});
    const buttons = await panel.locator('.filePanel__header button').evaluateAll((bs) =>
        bs.filter((b) => b.getClientRects().length).map((b) => (b.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean));
    const box = await panel.getByText('Make available with publication', {exact: true}).isVisible().catch(() => false);
    return {
        heading: flat(await workflow(page).locator('.pkp-modal-scroll-container h2').first().innerText().catch(() => null), 120),
        buttons,
        makeAvailableBox: box,
        xml: flat(await panel.locator('.filePanel__fileContent').innerText().catch(() => null), 300),
        line: flat(await panel.locator('.filePanel__defaultContentFooter, .filePanel__fileContentFooter').first().innerText().catch(() => null), 200),
    };
}

/** "Upload" on the JATS page with `file`: the upload's status and the page afterwards. */
async function upload(page, file) {
    const panel = page.locator('.jatsPanel').first();
    const chooser = page.waitForEvent('filechooser', {timeout: T});
    await panel.locator('.filePanel__header').getByRole('button', {name: 'Upload', exact: true}).click();
    const answer = page.waitForResponse((r) => /\/jats(\?|$)/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
    await (await chooser).setFiles(file.path);
    const r = await answer;
    await panel.locator('.filePanel__fileContentFooter').first().waitFor({state: 'visible', timeout: T});
    await idle(page);
    return {status: r.status(), page: await readJats(page)};
}

/**
 * Press "Download" on the JATS page: the file the browser saves ({name, size, text}) and the
 * answer of the request it sent, if any (status, content type, the URL's path and query keys).
 */
async function download(page) {
    const panel = page.locator('.jatsPanel').first();
    const answers = [];
    const onResponse = (r) => {
        if (/download-file|downloadFile/.test(r.url())) {
            const u = new URL(r.url());
            answers.push({status: r.status(), contentType: r.headers()['content-type'] || null,
                disposition: r.headers()['content-disposition'] || null,
                path: u.pathname.replace(/^.*\/index\.php/, '/index.php'), query: [...u.searchParams.keys()],
                stageId: u.searchParams.get('stageId')});
        }
    };
    page.on('response', onResponse);
    try {
        const got = page.waitForEvent('download', {timeout: T});
        await panel.locator('.filePanel__header').getByRole('button', {name: 'Download', exact: true}).click();
        const d = await got;
        const p = await d.path().catch(() => null);
        const text = p ? fs.readFileSync(p, 'utf8') : '';
        await sleep(1_000);
        await idle(page);
        return {name: d.suggestedFilename(), size: text.length, text: flat(text, 400), raw: text, requests: answers.slice()};
    } finally {
        page.off('response', onResponse);
    }
}

/** Press "More Information": the window's title and text after it settles; the window is closed. */
async function moreInformation(page) {
    const panel = page.locator('.jatsPanel').first();
    await panel.locator('.filePanel__header').getByRole('button', {name: 'More Information', exact: true}).click();
    const win = page.getByRole('dialog').filter({hasText: /Information Center/}).last();
    await win.waitFor({state: 'visible', timeout: T});
    await idle(page);
    await sleep(2_000);
    const out = {
        title: flat(await win.locator('h1, h2').first().innerText().catch(() => null), 200),
        text: flat(await win.innerText().catch(() => null), 400),
    };
    const closeBtn = win.getByRole('button', {name: /^Close/}).first();
    if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
    await sleep(1_000);
    await idle(page);
    return out;
}

module.exports = {T, flat, sleep, FILE, theFile, currentPublicationId, workflow, chooseJats, readJats, upload, download, moreInformation};
