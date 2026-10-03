// Helpers of walk.js (U15 OMP1, OPS3: the command-line index rebuild given one journal's,
// press's or server's path). Requiring this file runs nothing.
const path = require('path');
const {spawnSync} = require('child_process');
const {idle} = require('../../../probe');

const T = 30_000;
const REPO = path.resolve(__dirname, '../../../../..');
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u ? String(u).replace(/^https?:\/\/[^/]+/, '') : u);

/** The word searched per app and the published item it finds in the default dataset. */
const WORD = {
    ojs: {word: 'Signalling', title: 'Signalling Theory Dividends'},
    omp: {word: 'Bomb', title: 'Bomb Canada and Other Unkind Remarks in the American Media'},
    ops: {word: 'Hansen', title: 'Hansen & Pinto: Reason Reclaimed'},
};

/**
 * One command a system administrator types in the application's directory, under the
 * install's own config. Returns the command as typed, its exit code and its output.
 */
function cli(app, args) {
    const r = spawnSync('php', args, {
        cwd: path.resolve(REPO, app.root),
        env: {...process.env, PKP_CONFIG_FILE: path.resolve(REPO, app.configFile)},
        encoding: 'utf8',
        timeout: 300_000,
    });
    const strip = (s) => String(s || '').split(path.resolve(REPO, app.root)).join(`<${app.name}>`).trim();
    return {command: `php ${args.join(' ')}`, exit: r.status, stdout: strip(r.stdout).slice(0, 2000), stderr: strip(r.stderr).slice(0, 2000)};
}

/** `php lib/pkp/tools/jobs.php total`: the queue's "We have N queued jobs" line and N. */
function queued(app) {
    const r = cli(app, ['lib/pkp/tools/jobs.php', 'total']);
    const m = /We have (\d+) queued jobs?/.exec(r.stdout);
    return {...r, count: m ? Number(m[1]) : null};
}

/**
 * As a visitor: the context's Search page, the word typed into its search box and submitted.
 * Returns whether the item's title is listed, the result titles and the page's found/none line.
 */
async function search(app, page, contextPath, {word, title}) {
    await page.goto(app.url(`/index.php/${contextPath}/search`));
    await idle(page).catch(() => {});
    const box = page.locator('.page_search input[name="query"]').first();
    await box.fill(word);
    // Enter in the box submits the page's search form, as its "Search" button does.
    await Promise.all([page.waitForURL(/[?&]query=/, {timeout: T}), box.press('Enter')]);
    await idle(page).catch(() => {});
    const main = await page.locator('.page_search').first().innerText().catch(() => '');
    const titles = await page.locator('.page_search .obj_article_summary .title, .page_search .obj_monograph_summary .title, .page_search .obj_preprint_summary .title')
        .allInnerTexts().catch(() => []);
    const line = (main.split('\n').map((s) => s.trim()).find((s) => /No Results|No titles were found|titles? (was|were) found|Found \d+ items|Found one item/i.test(s))) || null;
    return {url: rel(page.url()), word, listed: main.includes(title), titles: titles.map((t) => flat(t, 120)), line};
}

module.exports = {T, flat, rel, WORD, cli, queued, search};
