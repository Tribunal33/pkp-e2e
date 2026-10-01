// Helpers of the two walks on the browser view of the OAI-PMH answers (issue reports
// docs/issues/U19-A4-oai-browser-last-part-says-more-results.md and
// docs/issues/U19-A5-oai-browser-record-formats-shown-as-archive.md). Requiring this file runs
// nothing.
const fs = require('fs');
const path = require('path');

const T = 30_000;
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/**
 * The install with `[oai] oai_max_records` set, which no screen offers: the site administrator
 * writes it in config.inc.php. The fleet's own config is not edited; this starts a second
 * `php -S` for the same checkout and database (base port + 72) with a copy of the fleet's
 * config that differs in that value (and in the port of base_url and allowed_hosts). Returns
 * the server's origin and a stop().
 */
async function startPagedServer(app, outDir, maxRecords) {
    const {spawn} = require('child_process');
    const port = app.basePort + 72;
    const origin = `http://127.0.0.1:${port}`;
    const source = fs.readFileSync(app.configFile, 'utf8');
    if (!/^oai_max_records = .*$/m.test(source)) throw new Error('the config holds no oai_max_records line');
    const config = source
        .split(app.baseURL).join(origin)
        .replace(/^allowed_hosts = .*$/m, `allowed_hosts = "[\\"127.0.0.1\\",\\"127.0.0.1:${port}\\"]"`)
        .replace(/^oai_max_records = .*$/m, `oai_max_records = ${maxRecords}`);
    const configFile = path.join(outDir, `config.oaipaged-${app.line}-${app.name}.inc.php`);
    fs.writeFileSync(configFile, config);
    const logFile = path.join(outDir, `server-oaipaged-${app.line}-${app.name}.log`);
    const child = spawn('php', ['-d', 'max_execution_time=120', '-S', `127.0.0.1:${port}`, '-t', app.root], {
        cwd: app.root,
        env: {...process.env, PKP_CONFIG_FILE: configFile},
        stdio: ['ignore', fs.openSync(logFile, 'a'), fs.openSync(logFile, 'a')],
        detached: true,
    });
    let up = false;
    for (let i = 0; i < 50 && !up; i++) {
        try {
            up = (await fetch(`${origin}/README.md`)).ok;
        } catch (e) {
            /* not up yet */
        }
        if (!up) await new Promise((r) => setTimeout(r, 200));
    }
    const stop = () => {
        try {
            process.kill(-child.pid);
        } catch (e) {
            child.kill();
        }
    };
    if (!up) {
        stop();
        throw new Error(`no answer on ${origin}`);
    }
    return {origin, configFile: path.relative(process.cwd(), configFile), stop};
}

/**
 * The OAI page on screen, as data: the address, the status when `response` is the navigation's,
 * the raw XML read beside it (the browser shows the HTML the stylesheet built), and the parts of
 * the page the two reports quote.
 */
async function readView(page, response = null) {
    const raw = await page.request.get(page.url(), {timeout: T});
    const xml = await raw.text();
    const token = xml.match(/<resumptionToken([^>]*?)(?:\/>|>([^<]*)<\/resumptionToken>)/);
    const error = xml.match(/<error code="([^"]*)">([\s\S]*?)<\/error>/);
    const paragraphs = (await page.locator('body > p, body p.error').allInnerTexts()).map((t) => flat(t));
    const resume = page.getByRole('link', {name: 'Resume', exact: true});
    const tokenTable = page.locator('table.values').filter({hasText: 'resumptionToken:'});
    return {
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        status: response ? response.status() : null,
        rawStatus: raw.status(),
        request: (xml.match(/<request[^>]*>[^<]*<\/request>/) || [null])[0],
        error: error ? `${error[1]}: ${flat(error[2])}` : null,
        records: [...xml.matchAll(/<identifier>([^<]*)<\/identifier>/g)].map((m) => m[1]),
        sets: [...xml.matchAll(/<setSpec>([^<]*)<\/setSpec>/g)].map((m) => m[1]),
        tokenXml: token ? flat(token[0]) : null,
        tokenValue: token ? (token[2] || '').trim() : null,
        moreResults: await page.getByText('There are more results.', {exact: true}).count(),
        noMoreResults: await page.getByText('There are no more results.', {exact: true}).count(),
        tokenTable: (await tokenTable.count()) ? flat(await tokenTable.first().innerText()) : null,
        resumeLinks: await resume.count(),
        resumeHref: (await resume.count()) ? await resume.first().getAttribute('href') : null,
        errorShown: (await page.locator('p.error').count()) ? flat(await page.locator('p.error').first().innerText()) : null,
        formatsSentence: paragraphs.find((p) => /^This is a list of metadata formats/.test(p)) || null,
    };
}

/** Open an address in the browser and read it. */
async function openView(page, url) {
    const response = await page.goto(url, {waitUntil: 'load'});
    await page.getByRole('heading', {level: 1, name: 'OAI 2.0 Request Results', exact: true}).waitFor({timeout: T});
    return readView(page, response);
}

/** Press a link of the page (the first by that name in `scope`) and read the page it opens. */
async function pressLink(page, name, scope = null) {
    const link = (scope || page).getByRole('link', {name, exact: true}).first();
    const [response] = await Promise.all([page.waitForNavigation({waitUntil: 'load', timeout: T}), link.click()]);
    await page.getByRole('heading', {level: 1, name: 'OAI 2.0 Request Results', exact: true}).waitFor({timeout: T});
    return readView(page, response);
}

module.exports = {T, flat, startPagedServer, readView, openView, pressLink};
