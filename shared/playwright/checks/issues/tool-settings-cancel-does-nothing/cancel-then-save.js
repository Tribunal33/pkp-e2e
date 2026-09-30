// Kept walk for the "Cancel, then Save" steps of
// docs/issues/U63-OJS5-tool-settings-cancel-does-nothing.md (spec U63 OJS5):
// does a "Save" after "Cancel" store the change "Cancel" was meant to drop?
// PKP's default test dataset, OJS, as `rvaca` in `publicknowledge`; the kit
// builds nothing.
//   PubMed: type "u63ojs5 NLM" into "NLM Title Abbreviation"; the form's
//     "Cancel"; "Export Articles" (does the browser ask?); "Settings";
//     "Save"; reload; read the saved value.
//   DOAJ: tick "OJS will deposit articles automatically to DOAJ. …"; the
//     form's "Cancel"; "Articles" (does the browser ask?); "Settings"; type
//     "u63ojs5key" into "DOAJ API Key"; "Articles" (does the browser ask
//     now? its "Cancel" stays); "Save"; reload; read the key and the box.
// Reset first:  flock -s .reports/issues/main-code.lock npm run fleet-prep -- --feature issues-ir4 --dataset 4 --reset
// Run (main):   flock -s .reports/issues/main-code.lock env PROBE_FEATURE=issues-ir4 PROBE_AGENT=u63ojs5 node bin/probe.js ojs shared/playwright/checks/issues/tool-settings-cancel-does-nothing/cancel-then-save.js
// Facts: .reports/<feature>/u63ojs5/cancel-then-save-facts[-<run>]-ojs.json
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('cancel-then-save.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {line: app.line || 'main', dataset: app.dataset};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v)}`); };
    const {page, close} = await launch(app);
    const dialogs = [];
    page.on('dialog', async (d) => { dialogs.push(d.message()); await d.dismiss().catch(() => {}); });
    let n = 0;
    const snap = async (name) => { const s = await screen(page); record(`cs-${String(++n).padStart(2, '0')}-${name}`, s); return s; };
    async function openTool(name, formSel) {
        await page.goto(app.url(`/index.php/${app.contextPath}/en/management/tools`));
        await idle(page);
        await Promise.all([page.waitForURL(/importexport\/plugin/, {timeout: T}), page.getByRole('link', {name, exact: true}).first().click()]);
        await idle(page);
        const f = page.locator(formSel).first();
        await f.waitFor({timeout: T});
        await pause(300);
        return f;
    }
    async function tab(name) {
        dialogs.length = 0;
        await page.getByRole('tab', {name, exact: true}).first().click();
        await idle(page).catch(() => {});
        await pause(800);
        return [...dialogs];
    }
    async function save(f) {
        await f.getByRole('button', {name: 'Save', exact: true}).click();
        await idle(page).catch(() => {});
        await pause(800);
        return (await snap('saved')).notices;
    }
    try {
        await signIn(page, 'rvaca', {contextPath: app.contextPath});
        // PubMed.
        let f = await openTool('PubMed XML Export Plugin', '#pubmedSettingsForm');
        await f.locator('[name="nlmTitle"]').fill('u63ojs5 NLM');
        await f.locator('a.cancelButton').first().click();
        await pause(1000);
        fact('pubmed: after Cancel', await f.locator('[name="nlmTitle"]').inputValue());
        fact('pubmed: "Export Articles" after Cancel asks', await tab('Export Articles'));
        await tab('Settings');
        fact('pubmed: Save', await save(f));
        await page.reload(); await idle(page);
        f = page.locator('#pubmedSettingsForm').first(); await f.waitFor({timeout: T});
        fact('pubmed: saved value after reload', await f.locator('[name="nlmTitle"]').inputValue());
        await snap('pubmed-after-reload');
        // DOAJ.
        f = await openTool('DOAJ Export Plugin', '#doajSettingsForm');
        await f.locator('[name="automaticRegistration"]').check();
        await f.locator('a.cancelButton').first().click();
        await pause(1000);
        fact('doaj: box after Cancel', await f.locator('[name="automaticRegistration"]').isChecked());
        fact('doaj: "Articles" after Cancel asks', await tab('Articles'));
        await tab('Settings');
        await f.locator('[name="apiKey"]').fill('u63ojs5key');
        await f.locator('[name="apiKey"]').blur();
        fact('doaj: "Articles" after typing the key asks', await tab('Articles'));
        fact('doaj: Save', await save(f));
        await page.reload(); await idle(page);
        f = page.locator('#doajSettingsForm').first(); await f.waitFor({timeout: T});
        fact('doaj: saved after reload', {apiKey: await f.locator('[name="apiKey"]').inputValue(), automaticRegistration: await f.locator('[name="automaticRegistration"]').isChecked()});
        await snap('doaj-after-reload');
    } finally {
        record('cancel-then-save-facts', facts);
        await close();
    }
});
