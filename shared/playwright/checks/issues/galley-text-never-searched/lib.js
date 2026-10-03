// Helpers of walk.js (U15 A11: the text of a galley or publication format is never
// searched). Requiring this file runs nothing.
const path = require('path');
const {idle, screen, record, shot, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u == null ? u : String(u).replace(/^https?:\/\/[^/]+/, ''));

/** The galley files beside this script. */
const FILES = {
    steps: path.join(__dirname, 'u15a-galley.html'),
    other: path.join(__dirname, 'u15a-galley-other.html'),
};

/** Per app: the item that is published, the one left unpublished (neighbour), the control word, the item address. */
const ITEMS = {
    ojs: {publish: 5, other: 6, control: 'Genetic', item: 'article/view'},
    omp: {publish: 4, other: 7, control: 'Canadians', item: 'catalog/book'},
    ops: {publish: 1, other: 4, control: 'lactation', item: 'preprint/view'},
};

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

/**
 * The editor adds an "HTML" galley (OJS, OPS) or an "HTML" publication format with the file,
 * open access and available (OMP) to the item's newest version. Returns what the list showed.
 */
async function addHtmlRepresentation(page, app, submissionId, file) {
    if (app.name === 'omp') {
        const {addFormatWithFile} = require('../book-epub-announced-as-html/lib');
        // "Publication" › "Publication Formats" (the U20 helper waits for a row; a book may have none).
        const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
        const {PublicationFormatsPage} = require(path.join(app.suiteDir, 'pages', 'PublicationFormatPages.js'));
        const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication'}});
        await frame.gotoEditorial(submissionId);
        await idle(page);
        const link = frame.menuLink('Publication Formats');
        if (!(await link.last().isVisible().catch(() => false))) await frame.latestVersionNode().click();
        await link.last().waitFor({state: 'visible', timeout: T});
        await link.last().click();
        const formats = new PublicationFormatsPage(page, app.contextPath);
        await formats.grid().waitFor({state: 'visible', timeout: T});
        await idle(page);
        return addFormatWithFile(page, app, formats, 'HTML', file);
    }
    // Publication menu › the newest version › "Galleys" › "Add galley" (the U13 OJS9 helper, with
    // the page heading a preprint server uses: "Preprint: Galleys").
    const {expect} = require('@playwright/test');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {GalleyManager} = require('../../../pages/GalleysPages.js');
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: app.name === 'ops' ? 'Preprint' : 'Publication'}});
    await frame.gotoEditorial(submissionId);
    await frame.expectVersionLoaded().catch(() => {});
    await idle(page);
    const galleysLink = frame.menuLink('Galleys');
    if (app.line !== 'stable-3_5_0') {
        await expect(frame.latestVersionNode()).toBeVisible({timeout: T});
        if (!(await galleysLink.last().isVisible().catch(() => false))) await frame.latestVersionNode().click();
    }
    await expect(galleysLink.last()).toBeVisible({timeout: T});
    await galleysLink.last().click();
    const galleys = new GalleyManager(page, frame);
    await galleys.expectLoaded();
    const before = await galleys.labels();
    await galleys.addGalley({label: 'HTML', component: app.name === 'ops' ? 'Preprint Text' : 'Article Text', file, name: path.basename(file)});
    await idle(page);
    const after = await galleys.labels();
    await snap(page, `galleys-${submissionId}`);
    return {before, after};
}

/**
 * Wait until the install's queue is empty. The dataset's own config runs queued jobs at the
 * end of web requests (job_runner = On), as a team install does, so a visitor's page load is
 * what runs them; this loads the home page until `jobs` holds nothing (max ~60 s).
 */
async function waitForQueue(app, page) {
    const reads = [];
    for (let i = 0; i < 20; i++) {
        const n = Number(String(await sql(app, 'select count(*) from jobs')).trim());
        reads.push(n);
        if (n === 0) return {emptyAfter: i, reads};
        await page.goto(app.url(`/index.php/${app.contextPath}`));
        await idle(page).catch(() => {});
        await sleep(2000);
    }
    return {emptyAfter: null, reads};
}

/**
 * As a visitor: the home page, the header's "Search" link, the words in the search box,
 * "Search". Returns the page's address, its "No Results" notice, and the items it lists.
 */
async function searchAsVisitor(page, app, words, name) {
    await page.goto(app.url(`/index.php/${app.contextPath}`));
    await idle(page).catch(() => {});
    // The header's "Search" link (the theme also carries a hidden copy for small screens).
    await page.locator('a:visible').filter({hasText: /^\s*Search\s*$/}).first().click();
    await idle(page).catch(() => {});
    const box = page.locator('input[name="query"]:visible').first();
    await box.waitFor({state: 'visible', timeout: T});
    await box.fill(words);
    await page.locator('button[type="submit"]:visible').filter({hasText: /^\s*Search\s*$/}).first().click();
    await page.waitForLoadState('load').catch(() => {});
    await idle(page).catch(() => {});
    const s = await snap(page, name);
    const itemPath = ITEMS[app.name].item;
    const listed = await page.evaluate((itemPath) => {
        const seen = new Map();
        for (const a of document.querySelectorAll('a[href]')) {
            const m = a.getAttribute('href').match(new RegExp(`/${itemPath}/(\\d+)(?:[/?#]|$)`));
            const t = (a.textContent || '').replace(/\s+/g, ' ').trim();
            if (m && t && !seen.has(m[1])) seen.set(m[1], t);
        }
        return [...seen].map(([id, title]) => ({id: Number(id), title}));
    }, itemPath);
    const body = s.text ? (s.text.main || s.text.body || '') : '';
    return {
        words,
        url: rel(page.url()),
        noResults: /No Results|No titles were found/.test(body),
        notice: flat((body.match(/(No Results|No titles were found[^\n]*|\d+ Titles|One title was found[^\n]*|\d+ titles were found[^\n]*|\d+ - \d+ of \d+ items)/) || [])[0], 200),
        listed,
    };
}

/** What the index holds for a submission: one row per version and language, with the body's length. */
async function indexRows(app, submissionId) {
    if (app.line === 'stable-3_5_0') {
        // 3.5 keeps a keyword index: the object types (128 = galley file) that hold either word.
        const k = await sql(app, `select so.type, so.assoc_id, kl.keyword_text from submission_search_objects so join submission_search_object_keywords ok on ok.object_id = so.object_id join submission_search_keyword_list kl on kl.keyword_id = ok.keyword_id where so.submission_id = ${Number(submissionId)} and kl.keyword_text in ('zanthorpe', 'merriwake') order by 1, 2`);
        return String(k).trim().split('\n').filter(Boolean);
    }
    const out = await sql(app, `select publication_id, locale, length(title), length(body), position('zanthorpe' in lower(body)) > 0, position('merriwake' in lower(body)) > 0 from submissions_fulltext where submission_id = ${Number(submissionId)} order by publication_id, locale`);
    return String(out).trim().split('\n').filter(Boolean);
}

/** The representation rows of a submission's versions and the assoc ids of their files. */
async function representationRows(app, submissionId) {
    const q = app.name === 'omp'
        ? `select p.publication_id, p.status, pf.publication_format_id, sf.submission_file_id, sf.assoc_id, f.mimetype from publications p join publication_formats pf on pf.publication_id = p.publication_id left join submission_files sf on sf.assoc_type = 521 and sf.assoc_id = pf.publication_format_id left join files f on f.file_id = sf.file_id where p.submission_id = ${Number(submissionId)} order by 1, 3, 4`
        : `select p.publication_id, p.status, g.galley_id, sf.submission_file_id, sf.assoc_id, f.mimetype from publications p join publication_galleys g on g.publication_id = p.publication_id left join submission_files sf on sf.submission_file_id = g.submission_file_id left join files f on f.file_id = sf.file_id where p.submission_id = ${Number(submissionId)} order by 1, 3, 4`;
    return String(await sql(app, q)).trim().split('\n').filter(Boolean);
}

module.exports = {T, sleep, flat, rel, FILES, ITEMS, snap, addHtmlRepresentation, waitForQueue, searchAsVisitor, indexRows, representationRows};
