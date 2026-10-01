// Helpers for walk.js (U13 OJS5). Requiring this file runs nothing.
const fs = require('fs');
const path = require('path');
const {screen, idle, loc, shot} = require('../../../probe');

const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/**
 * A public page of the journal (an article's, the home page): its status,
 * the Publication Facts panel (the plugin's `section.pflPlugin` and its
 * `<publication-facts-label>`, with the text it renders, shadow root
 * included), whether the page carries the plugin's script and label
 * preload, and which plugin files the browser fetched.
 */
async function readPublicPage(page, app, pathAfterIndex, label, origin = null) {
    const fetched = [];
    const onRequest = (req) => {
        if (/\/plugins\/generic\/pflPlugin\//.test(req.url())) fetched.push(req.url().replace(/^https?:\/\/[^/]+/, ''));
    };
    page.on('request', onRequest);
    const address = `/index.php/${app.contextPath}${pathAfterIndex}`;
    const response = await page.goto(origin ? `${origin}${address}` : app.url(address));
    await idle(page);
    await page.waitForTimeout(1500); // the panel's labels arrive by a fetch after DOMContentLoaded
    page.off('request', onRequest);
    const out = {
        label,
        path: pathAfterIndex,
        origin: origin || app.baseURL,
        status: response ? response.status() : null,
        title: flat(await page.locator('h1').first().innerText().catch(() => null), 200),
        pflSection: await page.locator('section.pflPlugin').count(),
        pflElement: await page.locator('publication-facts-label').count(),
        pflScriptTag: await page.locator('script[src*="pflPlugin/pfl/js/pfl.js"]').count(),
        pflLocalePreload: await page.locator('link[rel="preload"][href*="pflPlugin/pfl/locale/"]').count(),
        pflFetched: fetched,
    };
    if (out.pflElement) {
        out.panelText = flat(
            await page.locator('publication-facts-label').first().evaluate((el) => {
                const root = el.shadowRoot || el;
                const body = root.querySelector('.publication-facts-label') || root.querySelector('div, section, table');
                return body ? body.innerText : el.innerText;
            }),
            1200,
        );
        await loc(page, `${label}: the Publication Facts panel`, page.locator('publication-facts-label'));
        // Expand the box (its toggle sits in the element's open shadow root) and read its rows.
        const toggle = page.locator('publication-facts-label #pfl-button-open-facts');
        if (await toggle.count()) {
            await toggle.click();
            await page.waitForTimeout(800);
            out.expanded = await toggle.getAttribute('aria-expanded');
            out.panelTextExpanded = flat(
                await page.locator('publication-facts-label').first().evaluate((el) => {
                    const root = el.shadowRoot || el;
                    const body = root.querySelector('.publication-facts-label') || root.querySelector('div, section, table');
                    return body ? body.innerText : el.innerText;
                }),
                1500,
            );
            await shot(page, `${label.replace(/\W+/g, '-')}-expanded`).catch(() => {});
        }
    }
    out.publicationFactsTextOnPage = await page.getByText('Publication Facts', {exact: true}).count();
    const s = await screen(page);
    out.sideColumnEnd = flat((s.text.main || s.text.body || '').slice(-500), 500);
    return out;
}

/** The fleet server's log, to read what a walk adds. */
function serverLogPath(app) {
    return path.join(app.suiteDir, '.server-logs', `server-${app.port}-ds${app.dataset}.log`);
}
function logMark(app) {
    const p = serverLogPath(app);
    return fs.existsSync(p) ? fs.statSync(p).size : 0;
}
/** The plugin's failures logged since `mark`, each with its first error line. */
function logSince(app, mark) {
    const p = serverLogPath(app);
    if (!fs.existsSync(p)) return {path: p, missing: true, failures: []};
    const fd = fs.openSync(p, 'r');
    const size = fs.statSync(p).size;
    const buf = Buffer.alloc(Math.max(0, size - mark));
    fs.readSync(fd, buf, 0, buf.length, mark);
    fs.closeSync(fd);
    const lines = buf.toString('utf8').split('\n');
    const failures = [];
    lines.forEach((l, i) => {
        if (/PflPlugin.*failed to handle the hook|failed to handle the hook.*PflPlugin/i.test(l)) {
            const next = lines.slice(i + 1, i + 4).find((n) => /Error|Exception/.test(n)) || '';
            failures.push({line: l.slice(0, 300), error: next.slice(0, 400)});
        }
    });
    const other = lines.filter((l) => /PHP (Fatal|Warning)|Uncaught/i.test(l)).map((l) => l.slice(0, 400));
    return {path: path.relative(process.cwd(), p), failures, other};
}

/**
 * The comparison figures stand-in. The panel's "other journals" figures
 * come from https://pkp.sfu.ca/ojs/pflStatistics.json, which the test
 * installs cannot reach (their [proxy] is a dead port), so the plugin's
 * side-column hook fails there at that fetch on every version. This
 * starts a second `php -S` for the same checkout and database (base port
 * + 70) with a copy of the fleet's config whose Laravel cache path is a
 * folder in the run folder, holding the entry PflPlugin::getStatistics()
 * would have stored: `Cache::remember('pflStats-<journalId>', 86400, …)`
 * keeps `json_decode(<answer>, true)`, written in Laravel's FileStore
 * shape (10-digit expiry, then serialize()). `answer` is the service's
 * own answer, fetched by hand (the date is in walk.js). Returns the
 * server's origin and a stop().
 */
async function startStatsStandIn(app, outDir, answer, journalId = 1) {
    const {spawn, execFileSync} = require('child_process');
    const port = app.basePort + 70;
    const origin = `http://127.0.0.1:${port}`;
    const cacheDir = path.join(outDir, `pfl-cache-${app.line}`);
    fs.rmSync(cacheDir, {recursive: true, force: true});
    fs.mkdirSync(cacheDir, {recursive: true});
    const php =
        '$k = $argv[1]; $h = sha1($k); $d = $argv[2] . "/" . substr($h, 0, 2) . "/" . substr($h, 2, 2);' +
        '@mkdir($d, 0777, true); file_put_contents("$d/$h", (time() + 86400) . serialize(json_decode($argv[3], true)));' +
        'echo "$d/$h";';
    const entry = execFileSync('php', ['-r', php, `pflStats-${journalId}`, cacheDir, JSON.stringify(answer)]).toString();
    const config = fs
        .readFileSync(app.configFile, 'utf8')
        .split(app.baseURL).join(origin)
        .replace(/^allowed_hosts = .*$/m, `allowed_hosts = "[\\"127.0.0.1\\",\\"127.0.0.1:${port}\\"]"`)
        .replace(/^session_cookie_name = (.*)$/m, 'session_cookie_name = $1PFL')
        .replace(/^(\[cache\][\s\S]*?^)path = .*$/m, `$1path = ${cacheDir}`);
    const configFile = path.join(outDir, `config.pflstats-${app.line}.inc.php`);
    fs.writeFileSync(configFile, config);
    const logFile = path.join(outDir, `server-pflstats-${app.line}.log`);
    const child = spawn('php', ['-S', `127.0.0.1:${port}`, '-t', app.root], {
        env: {...process.env, PKP_CONFIG_FILE: configFile},
        stdio: ['ignore', fs.openSync(logFile, 'a'), fs.openSync(logFile, 'a')],
        detached: true,
    });
    for (let i = 0; i < 50; i++) {
        try {
            const r = await fetch(`${origin}/README.md`);
            if (r.ok) break;
        } catch (e) {
            /* not up yet */
        }
        await new Promise((r) => setTimeout(r, 200));
    }
    return {
        origin,
        entry: path.relative(process.cwd(), entry),
        configFile: path.relative(process.cwd(), configFile),
        logFile: path.relative(process.cwd(), logFile),
        stop: () => {
            try {
                process.kill(-child.pid);
            } catch (e) {
                child.kill();
            }
        },
    };
}

/** The plugin's failures in the stand-in server's own log. */
function standInLog(logFile) {
    if (!fs.existsSync(logFile)) return {failures: []};
    const lines = fs.readFileSync(logFile, 'utf8').split('\n');
    const failures = [];
    lines.forEach((l, i) => {
        if (/PflPlugin.*failed to handle the hook/i.test(l)) failures.push({line: l.slice(0, 300), error: (lines[i + 1] || '').slice(0, 400)});
    });
    return {failures, other: lines.filter((l) => /PHP (Fatal|Warning)|Uncaught/i.test(l)).map((l) => l.slice(0, 400))};
}

module.exports = {flat, readPublicPage, logMark, logSince, startStatsStandIn, standInLog};
