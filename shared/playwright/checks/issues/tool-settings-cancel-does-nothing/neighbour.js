// Neighbour check for the two U63 OJS5 reports, walked with each fix.diff in
// and with neither (trial.sh):
//   docs/issues/U63-OJS5-tool-settings-cancel-does-nothing.md (this folder's fix.diff)
//   docs/issues/U63-OJS5-tool-settings-required-note-without-required-field.md
//     (../tool-settings-required-note-without-required-field/fix.diff)
// What the fixes must leave alone, as `rvaca` on the default dataset:
//   a. "Save" on both tool Settings forms still stores a value: "Your changes
//      have been saved.", and a reload shows it.
//   b. A plugin settings form that opens in a modal keeps its "Cancel", which
//      still closes the modal: Settings › Website › Plugins › "Web Feed Plugin"
//      › "Settings" (it also keeps its own foot note; neither fix touches it).
//   c. A form with a required field keeps the note and the asterisk:
//      the user's Profile › "Contact" tab ("Email", "Country" required).
// Run: flock -s .reports/issues/main-code.lock env PROBE_FEATURE=issues-ir1 PROBE_AGENT=u63ojs5 PROBE_RUN=<fixcancel|fixnote|nofix> node bin/probe.js ojs shared/playwright/checks/issues/tool-settings-cancel-does-nothing/neighbour.js
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
const {sleep, flat, readGrid, openWebsitePlugins, rowLoc} = require('../../U62/K1/grid');

const T = 30_000;
const TOOLS = [
    {key: 'pubmed', name: 'PubMed XML Export Plugin', form: '#pubmedSettingsForm', field: 'nlmTitle', value: 'u63ojs5 NLM'},
    {key: 'doaj', name: 'DOAJ Export Plugin', form: '#doajSettingsForm', field: 'automaticRegistration'},
];

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    const cu = (p) => app.url(`/index.php/${app.contextPath}/en${p}`);
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name) => { const s = await screen(page); record(`nb-${String(++n).padStart(2, '0')}-${name}`, s); return s; };
    const foot = (sel) => page.locator(sel).first().evaluate((f) => ({
        note: (f.querySelector('.formRequired') || {}).innerText || null,
        cancel: !!f.querySelector('a.cancelButton'),
        asterisks: [...f.querySelectorAll('.req')].filter((e) => e.offsetParent !== null).length,
        buttons: [...f.querySelectorAll('button, a.cancelButton')].filter((e) => e.offsetParent !== null).map((b) => b.innerText.trim()),
    })).catch((e) => ({error: flat(e.message, 120)}));

    try {
        await signIn(page, 'rvaca');
        // a. Save still stores a value.
        for (const t of TOOLS) {
            await page.goto(cu('/management/tools')); await idle(page);
            await Promise.all([page.waitForURL(/importexport\/plugin/, {timeout: T}), page.getByRole('link', {name: t.name, exact: true}).first().click()]);
            await idle(page);
            const f = page.locator(t.form).first();
            await f.waitFor({timeout: T});
            const input = f.locator(`[name="${t.field}"]`);
            if (t.value) await input.fill(t.value); else await input.check();
            await f.getByRole('button', {name: 'Save', exact: true}).click();
            await idle(page).catch(() => {}); await sleep(500);
            const s = await snap(`${t.key}-saved`);
            await page.reload(); await idle(page);
            await page.locator(t.form).first().waitFor({timeout: T});
            const back = t.value ? await page.locator(t.form).first().locator(`[name="${t.field}"]`).inputValue() : await page.locator(t.form).first().locator(`[name="${t.field}"]`).isChecked();
            fact(`a. ${t.key}: Save`, {notices: s.notices, afterReload: back, form: await foot(t.form)});
        }
        // b. Web Feed Plugin settings modal: Cancel closes it.
        await openWebsitePlugins(page, app, app.contextPath);
        const g = await readGrid(page);
        let row = null;
        for (const c of (g.cats || [])) for (const r of c.rows) if (r.name === 'Web Feed Plugin') row = r;
        if (!row) fact('b. Web Feed', 'no row');
        else {
            const r = rowLoc(page, row.id);
            await r.locator('a.show_extras').first().click(); await sleep(400);
            const link = r.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Settings', exact: true}).first();
            if (!(await link.count())) fact('b. Web Feed', {enabled: row.checked, settingsLink: false});
            else {
                await link.click();
                const dlg = page.locator('[role="dialog"]:visible').last();
                await dlg.locator('form').first().waitFor({timeout: T});
                await sleep(400);
                const form = await foot('[role="dialog"]:visible form');
                await snap('webfeed-modal');
                await dlg.locator('a.cancelButton').first().click();
                await sleep(1500);
                fact('b. Web Feed settings modal', {form, openAfterCancel: await page.locator('[role="dialog"]:visible form').count()});
            }
        }
        // c. Profile › Contact: the note with required fields.
        await page.goto(cu('/user/profile')); await idle(page);
        const tab = page.getByRole('tab', {name: 'Contact', exact: true}).first();
        if (await tab.count()) { await tab.click(); await idle(page); }
        await page.locator('#contactForm').first().waitFor({timeout: T}).catch(() => {});
        await sleep(300);
        await snap('profile-contact');
        fact('c. Profile › Contact', await foot('#contactForm'));
        await signOut(page);
    } finally {
        record('neighbour-facts', facts);
        await close();
    }
});
