// Helpers of walk.js (issue report docs/issues/U63-OJS4-OJS7-pubmed-doaj-export-needs-outside-sites.md).
// Requiring this file runs nothing. The DOAJ page helpers come from the sibling DOAJ issue walk's lib.js.
const fs = require('fs');
const path = require('path');
const {idle} = require('../../../probe');
const doaj = require('../doaj-deposit-takes-other-journals-articles/lib');

const {T, sleep, flat, rel} = doaj;
const REPO = path.resolve(__dirname, '../../../../..');

/** The fleet's server log and a reader of the error lines written after a given size. */
function serverLog(app) {
    const file = path.resolve(REPO, 'apps', app.name, 'playwright', '.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const size = () => (fs.existsSync(file) ? fs.statSync(file).size : 0);
    const since = (from) => {
        if (!fs.existsSync(file)) return [`no log at ${path.relative(REPO, file)}`];
        return fs.readFileSync(file).subarray(from).toString('utf8').split('\n')
            .filter((l) => /error|exception|warning|failed/i.test(l) && !/\[(200|30\d)\]/.test(l))
            .map((l) => flat(l, 400)).slice(0, 10);
    };
    return {size, since};
}

/** Tools › Import/Export › "PubMed XML Export Plugin", on the named tab ("Export Articles" or "Export Issues"). */
async function openPubMed(page, app, tab) {
    const r = await page.goto(app.url(`/index.php/${app.contextPath}/en/management/importexport/plugin/PubMedExportPlugin`));
    await idle(page).catch(() => {});
    await page.locator('#exportTabs > ul').getByRole('tab', {name: tab, exact: true}).click();
    await idle(page).catch(() => {});
    if (tab === 'Export Articles') await page.locator('#exportSubmissions-tab .listPanel__item').first().waitFor({timeout: T});
    else await page.locator('#exportIssues-tab tr.gridRow').first().waitFor({timeout: T});
    await sleep(500);
    return r ? r.status() : null;
}

/** On "Export Articles": tick the article of that title; returns the ticked box's value (the submission ID). */
async function tickPubMedArticle(page, title) {
    const label = page.locator('#exportSubmissions-tab .listPanel__item label').filter({hasText: title}).first();
    const box = label.locator('input[type=checkbox]');
    await box.check();
    return box.getAttribute('value');
}

/** On "Export Issues": tick the issue of that name; returns the row's text. */
async function tickPubMedIssue(page, name) {
    const row = page.locator('#exportIssues-tab tr.gridRow').filter({hasText: name}).first();
    await row.locator('input[type=checkbox]').check();
    return flat(await row.innerText(), 120);
}

const pubMedButton = (page, tab) => (tab === 'Export Articles'
    ? page.locator('#exportSubmissions-tab').getByRole('button', {name: 'Export Articles', exact: true})
    : page.locator('#exportIssuesXmlForm').getByRole('button', {name: 'Export Issues', exact: true}));

/** On the DOAJ "Articles" tab: tick the row of a submission ID. */
async function tickDoajArticle(page, id) {
    const row = page.locator('#submissionsListGridContainer tbody tr.gridRow')
        .filter({has: page.locator('td:nth-child(2)', {hasText: new RegExp(`^\\s*${id}\\s*$`)})}).first();
    await row.locator('input[type=checkbox]').first().check({timeout: T});
    return flat(await row.innerText(), 200);
}

const doajValidationBox = (page) => page.locator('form#exportSubmissionXmlForm input[name="validation"]');
const doajExportButton = (page) => page.locator('form#exportSubmissionXmlForm button[name="export"]');

/**
 * Press an export button whose form posts to `op`: returns the request's answer, the download (saved to
 * `saveTo`) or the page it left for (its "Validation errors:" lines and the file text under "Invalid XML:"),
 * and the server log's error lines.
 */
async function pressExport(page, app, button, op, saveTo) {
    const log = serverLog(app);
    const from = log.size();
    const started = Date.now();
    const answered = page.waitForResponse((r) => r.request().method() === 'POST' && r.url().includes(op), {timeout: 180_000});
    const downloaded = page.waitForEvent('download', {timeout: 180_000}).catch(() => null);
    await button.click();
    const res = await answered;
    const headers = res.headers();
    const out = {
        request: `POST ${rel(res.url())}`, status: res.status(), seconds: Math.round((Date.now() - started) / 100) / 10,
        contentType: headers['content-type'] || null, disposition: headers['content-disposition'] || null,
    };
    if (/attachment/.test(out.disposition || '')) {
        const dl = await downloaded;
        await dl.saveAs(saveTo);
        const xml = fs.readFileSync(saveTo, 'utf8');
        out.download = {name: dl.suggestedFilename(), saved: path.relative(REPO, saveTo), bytes: xml.length, head: flat(xml, 300)};
    } else {
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        await sleep(500);
        out.download = null;
        out.url = rel(page.url());
        out.heading = flat(await page.locator('h2').first().innerText().catch(() => null), 100);
        out.errors = (await page.locator('body > p').allInnerTexts().catch(() => [])).map((t) => flat(t, 300)).filter(Boolean);
        out.invalidXmlHeading = flat(await page.locator('h3').first().innerText().catch(() => null), 100);
        const text = await page.locator('pre').first().innerText().catch(() => null);
        if (text) {
            fs.writeFileSync(saveTo, text);
            out.fileText = {saved: path.relative(REPO, saveTo), bytes: text.length, head: flat(text, 300)};
        }
    }
    await sleep(1500);
    out.log = log.since(from);
    return out;
}

module.exports = {T, sleep, flat, serverLog, openPubMed, tickPubMedArticle, tickPubMedIssue, pubMedButton, openDoaj: doaj.openDoaj, tickDoajArticle, doajValidationBox, doajExportButton, pressExport};
