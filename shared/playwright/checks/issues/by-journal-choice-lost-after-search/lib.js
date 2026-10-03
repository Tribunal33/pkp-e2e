// Helpers of walk.js (U15 OJS2: on the site-wide Search page, "By Journal" limits the first
// page only and never shows as chosen). Requiring this file runs nothing.
const fs = require('fs');
const path = require('path');
const {idle} = require('../../../probe');

const T = 30_000;
const REPO = path.resolve(__dirname, '../../../../..');
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u ? String(u).replace(/^https?:\/\/[^/]+/, '') : u);

/**
 * The precondition an administrator sets in config.inc.php: `[interface] items_per_page`.
 * Returns the value before and after.
 */
function setItemsPerPage(app, n) {
    const file = path.resolve(REPO, app.configFile);
    const text = fs.readFileSync(file, 'utf8');
    const m = /^items_per_page\s*=\s*(\S+)/m.exec(text);
    if (!m) throw new Error(`no items_per_page line in ${app.configFile}`);
    fs.writeFileSync(file, text.replace(/^items_per_page\s*=.*$/m, `items_per_page = ${n}`));
    return {before: m[1], after: String(n)};
}

/** The site-wide Search page, by its address (no link leads there). */
async function openSiteSearch(app, page) {
    const r = await page.goto(app.url('/index.php/index/search'));
    await idle(page).catch(() => {});
    return {status: r ? r.status() : null, url: rel(page.url())};
}

/** The "By Journal" select (3.5: "Journal"): its label, options and the option shown. */
async function readJournalSelect(page) {
    const sel = page.locator('select[name="searchContext"], select[name="searchJournal"]').first();
    if (!(await sel.count())) return {present: false};
    const id = await sel.getAttribute('id');
    return {
        present: true,
        name: await sel.getAttribute('name'),
        label: flat(await page.locator(`label[for="${id}"]`).first().innerText().catch(() => null), 80),
        options: (await sel.locator('option').allInnerTexts()).map((t) => t.trim()),
        shown: await sel.evaluate((s) => (s.selectedIndex < 0 ? null : s.options[s.selectedIndex].text.trim())),
    };
}

/** What the page shows below the form: each result's title and journal, the count line, the page links. */
async function readResults(page) {
    const items = await page.locator('.page_search ul.search_results > li').evaluateAll((lis) => lis.map((li) => {
        const t = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
        const a = li.querySelector('h3 a, .title a, a');
        return {title: t(a), href: a ? a.getAttribute('href').replace(/^https?:\/\/[^/]+/, '') : null, text: t(li).slice(0, 300)};
    }));
    const pag = page.locator('.page_search .cmp_pagination').first();
    const pagination = (await pag.count()) ? flat(await pag.innerText(), 200) : null;
    const links = (await pag.count())
        ? await pag.locator('a').evaluateAll((as) => as.map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href').replace(/^https?:\/\/[^/]+/, '')})))
        : [];
    const notice = flat(await page.locator('.page_search .cmp_notification').first().innerText({timeout: 1000}).catch(() => null), 200);
    return {url: rel(page.url()), items, pagination, links, notice, journalSelect: await readJournalSelect(page)};
}

/** On the open Search page: the box as `query`, `journal` chosen (or the blank entry), "Search" pressed. */
async function searchWith(page, {query = '', journal = null}) {
    const form = page.locator('.page_search form').filter({has: page.locator('input[name="query"]')}).first();
    await form.locator('input[name="query"]').fill(query);
    const sel = form.locator('select[name="searchContext"], select[name="searchJournal"]').first();
    if (journal) await sel.selectOption({label: journal});
    const chosenBefore = await readJournalSelect(page);
    await Promise.all([page.waitForEvent('load', {timeout: T}), form.locator('button[type="submit"]').first().click()]);
    await idle(page).catch(() => {});
    return {query, journal, shownBeforeSearch: chosenBefore.shown, ...(await readResults(page))};
}

/** Press the page link whose text is `label` ("2") under the results. */
async function pressPageLink(page, label) {
    const a = page.locator('.page_search .cmp_pagination a').filter({hasText: new RegExp(`^\\s*${label}\\s*$`)}).first();
    const href = rel(await a.getAttribute('href'));
    await Promise.all([page.waitForEvent('load', {timeout: T}), a.click()]);
    await idle(page).catch(() => {});
    return {pressed: label, linkHref: href, ...(await readResults(page))};
}

/**
 * On the open Native XML Plugin page {OJS}: "Export Issues", tick the issue by its name
 * ("Vol. 1 No. 2 (2014)"), "Export Issues", "Download Exported File". Returns {name, text}.
 */
async function exportIssue(page, issueName) {
    const {NativeXmlPage} = require('../../../pages/ImportExportPages.js');
    const tool = new NativeXmlPage(page, 'publicknowledge', {exportTab: 'Export Articles', exportButton: 'Export Articles', importResults: 'Import Results'});
    await tool.openIssuesTab();
    const rows = await tool.issues.rows().allInnerTexts();
    await tool.issues.box(issueName).check();
    const panel = await tool.issues.pressExport(tool);
    return {rows: rows.map((r) => flat(r, 120)), ...(await tool.download(panel))};
}

module.exports = {T, flat, rel, exportIssue, setItemsPerPage, openSiteSearch, readJournalSelect, readResults, searchWith, pressPageLink};

/**
 * The administrator's command-line index rebuild, `php tools/rebuildSearchIndex.php` and then
 * `php lib/pkp/tools/jobs.php run` for the jobs it queues: the one way an imported article
 * reaches the search index on main (docs/issues/U15-A3-published-edits-never-reach-search.md).
 */
function rebuildIndex(app) {
    const {execFileSync} = require('child_process');
    const run = (args) => {
        try {
            const out = execFileSync('php', args, {cwd: path.resolve(REPO, app.root), env: {...process.env, PKP_CONFIG_FILE: path.resolve(REPO, app.configFile)}, encoding: 'utf8', timeout: 300_000});
            return {command: `php ${args.join(' ')}`, output: flat(out, 300)};
        } catch (e) {
            return {command: `php ${args.join(' ')}`, error: flat(`${e.stdout || ''} ${e.stderr || ''} ${e.message}`, 600)};
        }
    };
    return [run(['tools/rebuildSearchIndex.php']), run(['lib/pkp/tools/jobs.php', 'run'])];
}
module.exports.rebuildIndex = rebuildIndex;
