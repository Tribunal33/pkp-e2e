// U63 claim check I01 (housekeeping hk01): shared helpers of i01.js and its row modules.
// The kit is the only source of browsers and records; nothing here asserts.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {screen, shot, record, idle, sql, outFile} = require('../../../probe');

const T = 30_000;
const REPO = path.resolve(__dirname, '../../../../..');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => (u ? String(u).replace(/^https?:\/\/[^/]+/, '') : u);
const RUN = process.env.PROBE_RUN || 'r0';

/** One bag per app and run: state, facts, snapshots, the probe server's log, SQL reads. */
function makeCtx(app, page) {
    const statePath = outFile('i01-state.json');
    const S = fs.existsSync(statePath) && process.env.RESEED !== '1' ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath, JSON.stringify(S, null, 1));
    const T0 = Date.now();
    const log = (...a) => console.log(`[u63i01 ${RUN} ${app.name} +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
    const fact = (k, v) => { record('i01-facts', {[k]: v}, {merge: true}); log(k, flat(JSON.stringify(v), 2500)); };
    let n = 0;
    const snap = async (name, extra = {}) => {
        const label = `i01-${String(++n).padStart(3, '0')}-${name}`;
        const s = await screen(page).catch((e) => ({url: page.url(), screenError: flat(e.message, 300)}));
        record(label, {...s, ...extra});
        await shot(page, label).catch(() => {});
        return {...s, label};
    };
    const logFile = path.join(REPO, 'apps', app.name, 'playwright', '.server-logs', `server-${app.port}-probe.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    /** The probe server's PHP lines since `from` (warnings, errors, 5xx). */
    const logSince = (from, re = /PHP |Fatal|Exception|\[5\d\d\]/) => {
        try {
            return fs.readFileSync(logFile).slice(from).toString('utf8').split('\n').filter((l) => re.test(l))
                .map((l) => l.replace(/^\[[^\]]+\] /, '').slice(0, 400)).slice(0, 25);
        } catch (e) { return [`(no log: ${flat(e.message, 100)})`]; }
    };
    const q = (s) => { try { return sql(app, s).split('\n').filter(Boolean); } catch (e) { return [`sql error: ${flat(e.message, 300)}`]; } };
    const cli = (args, timeout = 300_000) => {
        try { return flat(execFileSync('php', args, {cwd: path.resolve(REPO, app.root), env: {...process.env, PKP_CONFIG_FILE: app.configFile}, encoding: 'utf8', timeout, maxBuffer: 32 * 1024 * 1024}), 3000); } catch (e) { return `ERR ${flat(`${e.stdout || ''} ${e.stderr || ''} ${e.message}`, 2500)}`; }
    };
    const cu = (ctx, p = '') => app.url(`/index.php/${ctx}${p}`);
    const go = async (u) => { let st = null; try { const r = await page.goto(u); st = r && r.status(); } catch (e) { st = flat(e.message, 120); } await idle(page).catch(() => {}); return st; };
    return {app, page, S, save, log, fact, snap, logSize, logSince, logFile, q, cli, cu, go, RUN};
}

/** The tool's jQuery UI tab names, in order, "*" on the open one. */
async function toolTabs(page) {
    return page.locator('#importExportTabs > ul > li, #exportTabs > ul > li').evaluateAll((ls) => ls.map((l) => `${l.textContent.replace(/\s+/g, ' ').trim()}${l.getAttribute('aria-selected') === 'true' ? '*' : ''}`)).catch(() => []);
}

/** The open tab's panel text. */
async function panelText(page, n = 3000) {
    return flat(await page.locator('#importExportTabs > [role="tabpanel"]:visible, #exportTabs > [role="tabpanel"]:visible').first().innerText().catch(() => null), n);
}

/** Side menu "Tools", then a tool's name on "Import/Export" (the address typed when the menu lacks "Tools"). */
async function openTool(c, ctxPath, toolName) {
    const {page} = c;
    await c.go(c.cu(ctxPath, '/en/submissions'));
    const tools = page.getByRole('navigation', {name: 'Site Navigation'}).getByRole('link', {name: 'Tools', exact: true});
    let typed = false;
    if (await tools.count()) await Promise.all([page.waitForURL(/management\/tools/, {timeout: T}), tools.first().click()]);
    else { typed = true; await c.go(c.cu(ctxPath, '/en/management/tools')); }
    await idle(page).catch(() => {});
    const link = page.getByRole('link', {name: toolName, exact: true}).first();
    await link.waitFor({timeout: T});
    await Promise.all([page.waitForURL(/importexport\/plugin/, {timeout: T}), link.click()]);
    await idle(page).catch(() => {});
    await page.locator('#importExportTabs [role="tab"], #exportTabs [role="tab"]').first().waitFor({timeout: T}).catch(() => {});
    await sleep(400);
    return {typed};
}

/** Upload a file into the tool's "Import" box and press the import button; returns the answer and the results text. */
async function importFile(c, file, buttonName) {
    const {page} = c;
    const idBox = page.locator('#importXmlForm #temporaryFileId');
    const before = (await idBox.count()) ? await idBox.inputValue().catch(() => '') : '';
    const up = page.waitForResponse((r) => r.url().includes('uploadImportXML'), {timeout: T}).catch(() => null);
    await page.locator('#importXmlForm input[type=file]').first().setInputFiles(file);
    const u = await up;
    await page.waitForFunction((old) => { const v = (document.querySelector('#importXmlForm #temporaryFileId') || {}).value; return v && v !== old; }, before, {timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    const tabsBefore = (await toolTabs(page)).length;
    const from = c.logSize();
    const answered = page.waitForResponse((r) => /\/import\?/.test(r.url()) && r.request().method() === 'GET', {timeout: 120_000}).catch(() => null);
    await page.locator('#importXmlForm').getByRole('button', {name: buttonName, exact: true}).click();
    const r = await answered;
    for (let i = 0; i < 40 && (await toolTabs(page)).length === tabsBefore; i++) await sleep(300);
    await idle(page).catch(() => {});
    let text = '';
    for (let i = 0; i < 40; i++) { text = await panelText(page); if (text && text.length > 10) break; await sleep(500); }
    return {upload: u ? u.status() : null, request: r ? `${r.status()} ${rel(r.url()).replace(/temporaryFileId=\d+/, 'temporaryFileId=…').slice(0, 160)}` : 'none', status: r ? r.status() : null,
        tabs: await toolTabs(page), resultsText: text, phpLog: c.logSince(from)};
}

module.exports = {T, REPO, RUN, sleep, flat, rel, makeCtx, toolTabs, panelText, openTool, importFile};
