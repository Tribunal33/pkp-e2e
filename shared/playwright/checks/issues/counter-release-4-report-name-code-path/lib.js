// Helpers of walk.js (issue report docs/issues/U64-OJS6-counter-release-4-report-name-code-path.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses; the night
// the Steps wait out is `nextDay()` of ../download-issues-stops-at-30/lib.js.
const crypto = require('crypto');
const {idle} = require('../../../probe');
const {flat, rel} = require('../download-issues-stops-at-30/lib');

const T = 30_000;

const attempt = async (fn) => {
    try {
        return await fn();
    } catch (e) {
        return {error: flat(e.message, 300)};
    }
};

/**
 * The reader's visit: the journal's home, "Current", the article's title, then its "PDF" link,
 * which opens the reader page that loads the file. With `userAgent`, the reader's browser is a
 * fresh window that names itself so (stable-3_5_0 counts "HeadlessChrome" as a robot and drops
 * its visits). Returns the pages passed and the file request's status.
 */
async function readPdf(page, app, title, {userAgent} = {}) {
    const context = userAgent ? await page.context().browser().newContext({userAgent}) : null;
    const reader = context ? await context.newPage() : page;
    const out = {};
    try {
        await reader.goto(app.url(`/index.php/${app.contextPath}`));
        await idle(reader).catch(() => {});
        await reader.getByRole('link', {name: 'Current', exact: true}).first().click();
        await idle(reader).catch(() => {});
        out.issue = {url: rel(reader.url()), heading: flat(await reader.locator('h1').first().innerText().catch(() => null), 120)};
        await reader.locator('.obj_article_summary a, main a', {hasText: title}).first().click();
        await idle(reader).catch(() => {});
        out.article = {url: rel(reader.url()), galleys: (await reader.locator('a.obj_galley_link').allInnerTexts()).map((s) => flat(s, 40))};
        const file = reader.waitForResponse((r) => /\/article\/download\//.test(r.url()), {timeout: T}).catch(() => null);
        await reader.locator('a.obj_galley_link', {hasText: /^\s*PDF\s*$/}).first().click();
        const r = await file;
        out.file = r ? {url: rel(r.url()), status: r.status(), type: r.headers()['content-type'] || null} : null;
        await idle(reader).catch(() => {});
        out.viewPage = {url: rel(reader.url()), title: await reader.title()};
    } finally {
        if (context) await context.close();
    }
    return out;
}

/**
 * A downloaded COUNTER Release 4 file: the `<Report>` element's opening tag and its attributes,
 * the performance counts, and a hash of the file with the attributes that change per download
 * (ID, Created) and the Name masked, so two walks' files compare apart from the Name.
 */
function readReport(file) {
    const tag = (file.text.match(/<Report\b[^>]*>/) || [null])[0];
    const attrs = {};
    for (const m of (tag || '').matchAll(/([\w:]+)="([^"]*)"/g)) attrs[m[1]] = m[2];
    const rest = file.text.replace(/<Report\b[^>]*>/, (t) => t.replace(/\b(ID|Created|Name)="[^"]*"/g, '$1=""'));
    return {
        name: file.name,
        bytes: file.text.length,
        reportTag: tag,
        attrs,
        reportItems: (file.text.match(/<ReportItems>/g) || []).length,
        itemNames: [...file.text.matchAll(/<ItemName>([^<]*)<\/ItemName>/g)].map((m) => m[1]).slice(0, 5),
        instances: [...file.text.matchAll(/<MetricType>([^<]*)<\/MetricType>\s*<Count>([^<]*)<\/Count>/g)].map((m) => `${m[1]}=${m[2]}`),
        restHash: crypto.createHash('sha1').update(rest).digest('hex').slice(0, 12),
        start: flat(file.text, 700),
    };
}

/** The "COUNTER Reports" page as it stands: heading, release line, and each report line with its year links. */
async function readCounterPage(r4) {
    return {
        heading: flat(await r4.heading.innerText().catch(() => null), 80),
        release: flat(await r4.release.innerText().catch(() => null), 80),
        lines: await r4.items.evaluateAll((lis) => lis.map((li) => ({text: li.textContent.replace(/\s+/g, ' ').trim(), links: [...li.querySelectorAll('a')].map((a) => ({year: a.textContent.trim(), href: a.getAttribute('href').replace(/^https?:\/\/[^/]+/, '')}))}))).catch(() => []),
    };
}

/**
 * A report address typed in the browser, which either saves a file or shows a page: the file
 * (`readReport()`) when one arrives, else where the browser ended up.
 */
async function typeReportAddress(page, url) {
    const fs = require('fs');
    const arrived = page.waitForEvent('download', {timeout: 8000}).catch(() => null);
    const nav = await page.goto(url).then((r) => ({status: r ? r.status() : null})).catch((e) => ({navError: flat(e.message, 120)}));
    const d = await arrived;
    const out = {address: rel(url), ...nav, file: null};
    if (d) out.file = readReport({name: d.suggestedFilename(), text: fs.readFileSync(await d.path(), 'utf8')});
    await idle(page).catch(() => {});
    out.pageAfter = {url: rel(page.url()), heading: flat(await page.locator('main h1').first().innerText().catch(() => null), 80)};
    return out;
}

module.exports = {T, attempt, readPdf, readReport, readCounterPage, typeReportAddress};
