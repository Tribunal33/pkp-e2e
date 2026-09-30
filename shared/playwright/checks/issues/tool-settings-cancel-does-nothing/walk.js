// Kept walk for docs/issues/U63-OJS5-tool-settings-cancel-does-nothing.md
// (spec U63 register OJS5). Takes the report's Steps through the screens on
// a fresh load of PKP's default test dataset (a dataset fleet, harness.md
// "Dataset fleets"), as `rvaca` (Journal manager) in `publicknowledge`:
//   PubMed: Tools › "PubMed XML Export Plugin" › "Settings": the foot note and
//     the labels; type into "NLM Title Abbreviation"; press "Export Articles"
//     (the browser asks; its "Cancel" stays); the form's "Cancel"; "Export
//     Articles" again (nothing asks); "Settings" again; reload.
//   DOAJ: Tools › "DOAJ Export Plugin" › "Settings": the same, typing into
//     "DOAJ API Key" and ticking the automatic deposit box, with "Articles"
//     as the other tab.
//   Control: "Save" on both forms left empty (no field is required).
// Only OJS has either tool (PubMed from 3.5 on); an app or line without a
// tool records that and skips it. The kit builds nothing.
// Records every screen with screen(); no assertions. Facts: walk-facts[-<run>]-ojs.json
// Reset first:  flock -s .reports/issues/main-code.lock npm run fleet-prep -- --feature issues-ir1 --dataset 1 --reset
// Run (main):   flock -s .reports/issues/main-code.lock env PROBE_FEATURE=issues-ir1 PROBE_AGENT=u63ojs5 node bin/probe.js ojs shared/playwright/checks/issues/tool-settings-cancel-does-nothing/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir1-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir1-3_5 PROBE_AGENT=u63ojs5 node bin/probe.js ojs shared/playwright/checks/issues/tool-settings-cancel-does-nothing/walk.js
// Fix trial:    trial.sh beside this file.
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (t, n = 400) => (t == null ? t : String(t).replace(/\s+/g, ' ').trim().slice(0, n));

const TOOLS = [
    {key: 'pubmed', name: 'PubMed XML Export Plugin', form: '#pubmedSettingsForm', text: {name: 'nlmTitle', value: 'u63ojs5 NLM'}, other: 'Export Articles'},
    {key: 'doaj', name: 'DOAJ Export Plugin', form: '#doajSettingsForm', text: {name: 'apiKey', value: 'u63ojs5key'}, box: 'automaticRegistration', other: /^(Articles|Publications)$/},
];

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const old = ['stable-3_4_0', 'stable-3_3_0'].includes(app.line);
    const cu = (p) => app.url(`/index.php/${app.contextPath}${old ? '' : '/en'}${p}`);
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, context: app.contextPath});

    const {page, close} = await launch(app);
    const dialogs = [];
    let answer = 'accept'; // 'dismiss' takes the browser question's "Cancel" (stay on Settings)
    page.on('dialog', async (d) => { dialogs.push(`${d.type()}: ${d.message()} -> ${d.type() === 'beforeunload' ? 'accept' : answer}`); if (answer === 'dismiss' && d.type() !== 'beforeunload') await d.dismiss().catch(() => {}); else await d.accept().catch(() => {}); });
    const traffic = [];
    page.on('request', (r) => { if (r.resourceType() !== 'image' && r.resourceType() !== 'stylesheet' && r.resourceType() !== 'font') traffic.push(`${r.method()} ${r.url().replace(/^https?:\/\/[^/]+/, '').replace(/\?.*$/, '')}`); });
    let n = 0;
    const snap = async (name) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}`, s); return s; };

    async function openTool(tool) {
        await page.goto(cu('/management/tools'));
        await idle(page);
        const link = page.getByRole('link', {name: tool.name, exact: true}).first();
        if (!(await link.count())) return false;
        await Promise.all([page.waitForURL(/importexport\/plugin/, {timeout: T}), link.click()]);
        await idle(page);
        await page.locator(tool.form).first().waitFor({timeout: T});
        await pause(300);
        return true;
    }
    async function readForm(tool) {
        const f = page.locator(tool.form).first();
        return f.evaluate((form, t) => {
            const txt = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
            const vis = (el) => !!(el && el.offsetParent !== null);
            const tabs = [...document.querySelectorAll('[role="tab"]')].filter(vis).map((x) => `${txt(x)}${x.getAttribute('aria-selected') === 'true' ? '*' : ''}`);
            const input = form.querySelector(`[name="${t.text.name}"]`);
            const box = t.box ? form.querySelector(`[name="${t.box}"]`) : null;
            return {
                tabs,
                labels: [...form.querySelectorAll('label')].filter(vis).map(txt),
                asterisks: [...form.querySelectorAll('.req, label')].filter((el) => vis(el) && /\*/.test(el.textContent)).map(txt),
                requiredAttrs: [...form.querySelectorAll('[required], [aria-required="true"]')].map((el) => el.name),
                buttons: [...form.querySelectorAll('button, a.cancelButton, input[type=submit]')].filter(vis).map((b) => txt(b) || b.value),
                footNote: txt(form.querySelector('.formRequired')),
                text: input ? input.value : null,
                box: box ? box.checked : null,
            };
        }, tool);
    }

    try {
        await signIn(page, 'rvaca');
        for (const tool of TOOLS) {
            const k = tool.key;
            if (!(await openTool(tool))) { fact(`${k}: tool`, `no "${tool.name}" on Tools › Import/Export`); await snap(`${k}-no-tool`); continue; }
            // Steps 2-3 / 7-8: the Settings tab, its labels and foot note.
            await snap(`${k}-settings-open`);
            fact(`${k}: settings as opened`, await readForm(tool));
            // Step 4 / 9: type (and tick).
            const f = page.locator(tool.form).first();
            await f.locator(`[name="${tool.text.name}"]`).fill(tool.text.value);
            if (tool.box) await f.locator(`[name="${tool.box}"]`).check();
            await f.locator(`[name="${tool.text.name}"]`).blur();
            fact(`${k}: after typing`, await readForm(tool));
            const otherTab = page.getByRole('tab', {name: tool.other}).first();
            const settingsTab = page.getByRole('tab', {name: 'Settings', exact: true}).first();
            // Step: the other tab before "Cancel": the browser asks; its "Cancel" stays on Settings.
            dialogs.length = 0; answer = 'dismiss';
            await otherTab.click();
            await pause(1000);
            answer = 'accept';
            fact(`${k}: other tab before Cancel`, {dialogs: [...dialogs], form: await readForm(tool)});
            // Step 5 / 10: "Cancel".
            const cancel = f.locator('a.cancelButton').first();
            fact(`${k}: cancel control`, {count: await cancel.count(), text: flat(await cancel.innerText().catch(() => null)), href: await cancel.getAttribute('href').catch(() => null)});
            traffic.length = 0; dialogs.length = 0;
            const urlBefore = page.url();
            if (await cancel.count()) await cancel.click(); // no "Cancel" (as with fix.diff): the step is skipped, the rest walked
            await idle(page).catch(() => {});
            await pause(1500);
            fact(`${k}: after Cancel`, {form: await readForm(tool), urlSame: page.url() === urlBefore, url: page.url().replace(/^https?:\/\/[^/]+/, ''), requests: [...traffic], dialogs: [...dialogs], formStillShown: await f.isVisible()});
            await snap(`${k}-after-cancel`);
            // Step: the other tab after "Cancel", then back to Settings.
            dialogs.length = 0;
            await otherTab.click();
            await idle(page).catch(() => {});
            await pause(1000);
            const otherSelected = await otherTab.getAttribute('aria-selected').catch(() => null);
            await snap(`${k}-other-tab-after-cancel`);
            await settingsTab.click();
            await idle(page).catch(() => {});
            await pause(500);
            fact(`${k}: other tab after Cancel, then Settings`, {dialogs: [...dialogs], otherTabOpened: otherSelected === 'true', form: await readForm(tool)});
            // Step 6 / 11: reload.
            dialogs.length = 0;
            await page.reload();
            await idle(page);
            await page.locator(tool.form).first().waitFor({timeout: T});
            await pause(300);
            fact(`${k}: after reload`, {form: await readForm(tool), dialogs: [...dialogs]});
            await snap(`${k}-after-reload`);
        }
        // Control: "Save" on each form left empty.
        for (const tool of TOOLS) {
            const k = tool.key;
            if (!(await openTool(tool))) continue;
            const f = page.locator(tool.form).first();
            await f.locator(`[name="${tool.text.name}"]`).fill('');
            if (tool.box) await f.locator(`[name="${tool.box}"]`).uncheck();
            const resp = page.waitForResponse((r) => /verb=save|manage/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
            await f.getByRole('button', {name: 'Save', exact: true}).click();
            const r = await resp;
            await idle(page).catch(() => {});
            const s = await snap(`${k}-control-save-empty`);
            fact(`${k}: control Save empty`, {status: r ? r.status() : null, notices: s.notices, formErrors: flat(await f.locator('.error, .pkp_form_error, label.error').allInnerTexts().catch(() => []).then((a) => a.join(' | ')))});
        }
        await signOut(page);
    } finally {
        record('walk-facts', facts);
        await close();
    }
});
