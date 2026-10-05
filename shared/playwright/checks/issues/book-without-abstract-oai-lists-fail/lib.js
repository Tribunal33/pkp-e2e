// OAI and "Title & Abstract" helpers, first written for the walk of U19 OMP4 (retired 2026-10-05, its walk
// deleted; git keeps it) and required by other kept checks.
// Requiring this file runs nothing. Every helper drives a screen a person uses, or reads an
// OAI address as a harvester does.
const fs = require('fs');
const path = require('path');
const {idle, screen} = require('../../../probe');
const {readOai} = require('../../../pages/OaiPages.js');
const {workflowFrame} = require('../older-version-tab-current-title/lib');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const ABSTRACT = 'titleAbstract-abstract-control-en';

/**
 * On an open workflow: Publication › "Title & Abstract", the "Abstract" box emptied
 * (select all, Delete) and, when `text` is given, typed; then "Save". Returns what the
 * box held before and after, and the save's status.
 */
async function setAbstract(page, app, text) {
    const frame = workflowFrame(page, app);
    const entry = app.line === 'stable-3_5_0'
        ? frame.menuLink('Title & Abstract').last()
        : await frame.revealPublicationEntry('Title & Abstract');
    await entry.click();
    await idle(page);
    await page.waitForFunction((id) => !!window.tinymce?.get(id)?.initialized, ABSTRACT, {timeout: T});
    const read = () => page.evaluate((id) => window.tinymce.get(id).getContent({format: 'text'}).trim(), ABSTRACT);
    const before = await read();
    await page.evaluate((id) => window.tinymce.get(id).focus(), ABSTRACT);
    await page.keyboard.press('ControlOrMeta+A'); // Meta on macOS
    await page.keyboard.press('Delete');
    if (text) await page.keyboard.type(text, {delay: 10});
    await sleep(500);
    const after = await read();
    const saved = page
        .waitForResponse((r) => /\/submissions\/\d+\/publications\/\d+$/.test(new URL(r.url()).pathname) && r.request().method() !== 'GET', {timeout: T})
        .catch(() => null);
    await page.locator('[data-cy="workflow-primary-items"]').getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    const status = await page.locator('.pkpFormPage__status', {hasText: 'Saved'}).waitFor({state: 'visible', timeout: T}).then(() => 'Saved').catch(() => null);
    await idle(page);
    return {before: flat(before, 80), after, save: r ? r.status() : null, shown: status};
}

/** One OAI address read as a harvester (no session): status, records, and what each record holds. */
async function oai(app, ctx, params) {
    const a = await readOai(app.baseURL, ctx, params);
    const records = [...a.body.matchAll(/<record>([\s\S]*?)<\/record>/g)].map((m) => {
        const x = m[1];
        const all = (tag) => [...x.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'g'))].map((t) => flat(t[1], 70));
        return {
            identifier: all('identifier')[0],
            deleted: /<header status="deleted">/.test(x),
            title: all('dc:title')[0],
            descriptions: all('dc:description'),
            elements: (x.match(/<dc:[a-z]+/g) || []).length,
            // everything but the datestamp, to compare two reads of one record
            body: x.replace(/<datestamp>[^<]*<\/datestamp>/, '').replace(/\s+/g, ' '),
        };
    });
    const error = a.body.match(/<error code="([^"]+)">([^<]*)<\/error>/);
    return {
        address: `/index.php/${ctx}/oai?${params}`,
        status: a.status,
        length: a.body.length,
        error: error ? `${error[1]}: ${error[2]}` : null,
        identifiers: [...a.body.matchAll(/<identifier>([^<]+)<\/identifier>/g)].map((m) => m[1]),
        records,
    };
}

/** The same address opened in the browser: the status and what the page shows. */
async function view(page, app, ctx, params) {
    const response = await page.goto(app.url(`/index.php/${ctx}/oai?${params}`), {waitUntil: 'load'}).catch((e) => ({error: e.message}));
    const s = await screen(page).catch(() => null);
    const body = await page.locator('body').innerText().catch(() => '');
    return {shownStatus: response && response.status ? response.status() : null, shownTitle: s ? s.title : null, shown: flat(body, 200)};
}

/** The fleet server's log lines written since `offset` that name a PHP failure. */
function serverLog(app) {
    const file = path.join(__dirname, '../../../../../apps', app.name, 'playwright/.server-logs');
    const name = fs.existsSync(file) ? fs.readdirSync(file).find((f) => f.startsWith(`server-${app.port}`)) : null;
    const full = name ? path.join(file, name) : null;
    const size = () => (full && fs.existsSync(full) ? fs.statSync(full).size : 0);
    const start = size();
    return {
        file: name,
        since() {
            if (!full) return [];
            const fd = fs.openSync(full, 'r');
            const buf = Buffer.alloc(Math.max(0, size() - start));
            fs.readSync(fd, buf, 0, buf.length, start);
            fs.closeSync(fd);
            return [...new Set(buf.toString('utf8').split('\n').filter((l) => /Uncaught|Fatal|TypeError/.test(l)).map((l) => flat(l.replace(/^\[[^\]]*\]\s*/, ''), 500)))];
        },
    };
}

module.exports = {T, sleep, flat, setAbstract, oai, view, serverLog};
