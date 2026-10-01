// The same fault on another field, and the fix's reach (docs/issues/U21-A12-confirmation-off-shows-no-option.md).
// Settings › Distribution › "DOIs" › "Registration": the "Registration Agency"
// select, whose "None" option stands for "not set" like "Do not send an email."
// does. The dataset leaves the agency unset (an empty row), and the select only
// shows once a registration agency plugin is enabled, so as `rvaca`:
//   1  Settings › Website › "Plugins": tick "Crossref Manager Plugin" (OJS, OPS;
//      OMP ships no registration agency plugin, so it is skipped)
//   2  Settings › Distribution › "DOIs" › "Registration": read the select
//   3  press "Save" without choosing anything: the request's registrationAgency,
//      its answer and the stored row; reload and read the select again
// Run with the fix in and out:
// Reset first:  npm run fleet-prep -- --feature issues-w39 --dataset 4 --reset
// Run:          PROBE_FEATURE=issues-w39 PROBE_AGENT=w39 [PROBE_RUN=fix] node bin/probe.js all shared/playwright/checks/issues/confirmation-off-shows-no-option/reach.js
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 2000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('reach.js runs on a dataset fleet only (fleet-prep --dataset n)');
    if (app.name === 'omp') { console.log('[omp] no registration agency plugin; skipped'); return; }
    const loc = ['main', 'stable-3_5_0'].includes(app.line || 'main') ? '/en' : '';
    const facts = {line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${flat(JSON.stringify(v), 1500)}`); };
    let n = 0;
    const rec = async (page, label) => {
        const name = `reach-${String(++n).padStart(2, '0')}-${label}`;
        try { const s = await screen(page); record(name, s); await shot(page, name).catch(() => {}); return s; }
        catch (e) { record(name, {error: String(e).slice(0, 300), url: page.url()}); return null; }
    };
    const {page, close} = await launch(app);
    const errors = [];
    page.on('pageerror', (e) => errors.push(flat(e.message, 300)));
    page.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/TinyMCE/.test(m.text())) errors.push(`${m.type()}: ${flat(m.text(), 300)}`); });
    page.setDefaultTimeout(T);

    const storedAgency = () => sql(app, `select 'rows:' || count(*) || ' value:"' || coalesce(max(setting_value), '(none)') || '"' from ${app.contextTables.settings} where setting_name = 'registrationAgency'`);
    const readSelect = async () => {
        await page.goto('about:blank');
        await page.goto(app.url(`/index.php/${app.contextPath}${loc}/management/settings/distribution#dois`));
        await idle(page);
        const top = page.getByRole('tab', {name: 'DOIs', exact: true});
        if ((await top.getAttribute('aria-selected')) !== 'true') await top.click();
        const dois = page.getByRole('tabpanel', {name: 'DOIs', exact: true});
        const side = dois.getByRole('tab', {name: 'Registration', exact: true});
        if ((await side.getAttribute('aria-selected')) !== 'true') await side.click();
        const panel = dois.getByRole('tabpanel', {name: 'Registration', exact: true});
        const select = panel.locator('select[name="registrationAgency"]');
        await select.waitFor({timeout: T});
        await idle(page);
        const state = await select.evaluate((s) => ({
            selectedIndex: s.selectedIndex,
            shown: s.selectedIndex >= 0 ? s.options[s.selectedIndex].text.trim() : '',
            options: [...s.options].map((o) => o.text.trim()),
        }));
        return {panel, select, state};
    };

    try {
        await signIn(page, 'rvaca');
        // Step 1
        await page.goto(app.url(`/index.php/${app.contextPath}${loc}/management/settings/website`));
        await idle(page);
        await page.locator('#plugins-button').click();
        await page.locator('#pluginGridContainer tr.gridRow').first().waitFor({timeout: T});
        await idle(page);
        const row = page.locator('#pluginGridContainer tr.gridRow[id$="-row-crossrefplugin"]');
        const box = row.getByRole('checkbox').first();
        const before = await box.isChecked();
        if (!before) {
            const w = page.waitForResponse((r) => /settings-plugin-grid\/enable/.test(r.url()), {timeout: T}).catch(() => null);
            await box.click();
            const r = await w;
            await idle(page);
            await sleep(800);
            fact('step 1 enable Crossref', {before, status: r ? r.status() : null, after: await box.isChecked()});
        } else fact('step 1 enable Crossref', {before});
        await rec(page, 's1-plugins');
        fact('step 1 stored agency', storedAgency());
        // Step 2
        const {panel, state} = await readSelect();
        await rec(page, 's2-registration');
        fact('step 2 Registration Agency', state);
        // Step 3
        const w = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+\/registrationAgency/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await panel.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await w;
        const sent = r ? new URLSearchParams(r.request().postData() || '') : null;
        await idle(page);
        await rec(page, 's3-saved');
        const saved = {status: r ? r.status() : null, sent: sent ? (sent.has('registrationAgency') ? `"${sent.get('registrationAgency')}"` : '(absent)') : null, stored: storedAgency()};
        const again = await readSelect();
        await rec(page, 's3-reloaded');
        fact('step 3 Save from the empty box', {...saved, afterReload: again.state});
        await signOut(page);
    } finally {
        fact('page errors and console', errors);
        record('reach-facts', facts);
        await close();
    }
});
