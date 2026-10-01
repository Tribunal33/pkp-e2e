// Neighbour check for docs/issues/U13-OJS5-publication-facts-panel-never-shown.md:
// the fix must leave the plugin's settings window (whose form address the fix
// rewrites) and its "Start Date" exclusion as they are. Through the screens, on
// the default dataset: `dbarnes` ticks "Publication Facts Label plugin", opens
// its "Settings", types a society, an address and "Start Date" 2099-01-01,
// presses "OK", reopens the window; then, signed out, opens submission 1's
// article page, which must show no panel (submitted before the start date).
// Walked with the fix in and out (trial.sh). OJS only.
// Run: PROBE_FEATURE=issues-ir1 PROBE_AGENT=u13ojs5 node bin/probe.js ojs <this file>
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const REPO = path.resolve(__dirname, '../../../../..');

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] nb-${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const logFile = path.join(REPO, 'apps', app.name, 'playwright', '.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logSince = (from) => {
        try {
            return fs.readFileSync(logFile).slice(from).toString('utf8').split('\n')
                .filter((l) => /PHP|Error|Exception|Plugin |SQLSTATE|cURL/.test(l) && !/Accepted|Closing/.test(l))
                .map((l) => l.replace(/^\[[^\]]+\] /, '').slice(0, 300)).slice(0, 8);
        } catch { return []; }
    };
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        const openPlugins = async () => {
            await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/website`)); await idle(page);
            await page.getByRole('tab', {name: 'Plugins', exact: true}).first().click(); await idle(page);
            const row = page.locator('tr.gridRow[id$="-row-pflplugin"]').first();
            await row.waitFor({state: 'visible', timeout: T});
            return row;
        };
        let row = await openPlugins();
        const box = row.locator('input[type=checkbox]');
        if (!(await box.isChecked())) { await box.click(); await idle(page); await pause(500); }
        fact('enabled', await box.isChecked());

        const openSettings = async () => {
            // The row's first "Settings" (screen-reader text) opens the row's actions; the second is the plugin's.
            await row.locator('a.show_extras').click();
            const link = row.locator('xpath=following-sibling::tr[1]').locator('a').filter({hasText: /^\s*Settings\s*$/}).first();
            await link.waitFor({state: 'visible', timeout: T});
            await link.click();
            const form = page.locator('form#pflPluginSettingsForm');
            await form.waitFor({state: 'visible', timeout: T}); await idle(page); await pause(500);
            return form;
        };
        let form = await openSettings();
        const action = await form.getAttribute('action');
        await form.locator('input[name="academicSociety"]').fill('u13ojs5 Society');
        await form.locator('input[name="academicSocietyUrl"]').fill('https://example.org/u13ojs5');
        const ds = form.locator('input.datepicker[id^="dateStart"]'); // the visible box; the saved value is the hidden name="dateStart"
        await ds.click({force: true}); await ds.pressSequentially('2099-01-01');
        await ds.evaluate((el) => el.blur()); await pause(300);
        record('nb-01-settings-filled', await screen(page)); await shot(page, 'nb-01-settings-filled');
        const saved = page.waitForResponse((r) => /verb=settings/.test(r.url()) && /save=/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        await form.getByRole('button', {name: 'OK', exact: true}).click();
        const sr = await saved; await idle(page); await pause(800);
        await page.locator('form#pflPluginSettingsForm').waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
        const s1 = await screen(page); record('nb-02-settings-saved', s1); await shot(page, 'nb-02-settings-saved');
        fact('save', {formAction: action ? action.replace(/^https?:\/\/[^/]+/, '') : null, status: sr ? sr.status() : null,
            postedTo: sr ? sr.url().replace(/^https?:\/\/[^/]+/, '') : null, notices: s1.notices || null,
            windowStillOpen: await page.locator('form#pflPluginSettingsForm').isVisible().catch(() => false)});

        row = await openPlugins();
        form = await openSettings();
        fact('reopened', {academicSociety: await form.locator('input[name="academicSociety"]').inputValue(),
            academicSocietyUrl: await form.locator('input[name="academicSocietyUrl"]').inputValue(),
            dateStart: await form.locator('input.datepicker[id^="dateStart"]').inputValue()});
        await signOut(page);

        const from = logSize();
        const r = await page.goto(app.url(`/index.php/${app.contextPath}/article/view/1`)); await idle(page); await pause(1500);
        record('nb-03-article-1', await screen(page)); await shot(page, 'nb-03-article-1');
        fact('article-1', {status: r ? r.status() : null, panel: await page.locator('publication-facts-label').count(),
            pflScriptTag: await page.locator('script[src*="pflPlugin/pfl/js/pfl.js"]').count(),
            authorListId: await page.locator('ul#author-list').count(), serverLog: logSince(from)});
    } finally {
        record('nb-facts', facts);
        await close();
    }
});
