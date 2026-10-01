// Reach check for docs/issues/U62-OJS1-home-page-blank-theme-switched-off.md:
// with the theme in use switched off, does Settings › Website › "Appearance" ›
// "Theme" › "Save" fail too? Steps: sign in as `rvaca`; untick "Default Theme"
// under "Theme Plugins" and press "OK"; open Settings › Website › "Appearance" ›
// "Theme"; press "Save". Records the theme list, the save request's status and
// the server log lines; then ticks "Default Theme" again. The kit builds nothing.
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/home-page-blank-theme-switched-off/theme-save.js
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const {sleep, flat, pressThemeBox} = require('./lib');

const REPO = path.resolve(__dirname, '../../../../..');
function tail(file) {
    let from = 0; try { from = fs.statSync(file).size; } catch {}
    return () => { try { return fs.readFileSync(file).slice(from).toString('utf8').split('\n').filter((l) => /PHP|Error|Exception|\[5\d\d\]/.test(l) && !/Accepted|Closing/.test(l)).map((l) => l.replace(/^\[[^\]]+\] /, '').slice(0, 400)).slice(0, 8); } catch { return []; } };
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('theme-save.js drives a dataset fleet');
    const serverLog = path.join(REPO, 'apps', app.name, 'playwright', '.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        const off = await pressThemeBox(page, app);
        fact('untick', {notices: off.notices, after: off.after});
        await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/website`));
        await idle(page);
        await page.locator('#appearance-button').first().click(); await idle(page);
        await page.locator('#theme-button').first().click(); await idle(page);
        await sleep(600);
        const panel = page.locator('#theme').first();
        fact('themeTab', {selects: await panel.locator('select').evaluateAll((ss) => ss.map((s) => ({name: s.name, value: s.value, options: [...s.options].map((x) => `${x.text.trim()}=${x.value}`)}))).catch(() => []), text: flat(await panel.innerText().catch(() => ''), 300)});
        const sl = tail(serverLog);
        const saves = [];
        const onResp = (r) => { if (/\/theme(\?|$)/.test(r.url()) && r.request().method() !== 'GET') saves.push(r.text().then((b) => ({method: r.request().method(), override: r.request().headers()['x-http-method-override'] || null, url: r.url().replace(app.baseURL, ''), status: r.status(), body: flat(b, 300)})).catch(() => ({status: r.status()}))); };
        page.on('response', onResp);
        await panel.getByRole('button', {name: 'Save', exact: true}).first().click();
        await idle(page).catch(() => {});
        await sleep(1500);
        page.off('response', onResp);
        const s = await screen(page);
        record('01-theme-save', {...s, saves: await Promise.all(saves)});
        await shot(page, '01-theme-save');
        fact('save', {requests: await Promise.all(saves), notices: s.notices, panelText: flat(await panel.innerText().catch(() => ''), 300), serverLog: sl()});
        const on = await pressThemeBox(page, app);
        fact('retick', {notices: on.notices, after: on.after});
    } finally {
        record('theme-save-facts', facts);
        await close();
    }
});
