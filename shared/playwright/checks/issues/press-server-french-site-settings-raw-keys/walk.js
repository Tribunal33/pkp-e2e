// Issue report docs/issues/U60-A2-press-server-french-site-settings-raw-keys.md (U60 A2): in French
// (Canada) a press's Site Settings shows "##manager.setup.information##" as the "Information" side
// tab, and a press's and a preprint server's "Courriels en lot" tab shows
// "##admin.settings.enableBulkEmails.description##" as its description. Takes the report's Steps on
// PKP's default test dataset, all three apps (a journal is the control):
//   Precondition: a second journal (press, server) "u60a Journal" ("u60a Press", "u60a Server"),
//   path u60a, created by admin on Administration > "Hosted Journals" > "Create Journal", because
//   Site Settings shows "Settings" and "Information" only on a site hosting two or more.
//   1. Sign in as admin.
//   2. Administration > "Site Settings" (/index.php/index/en/admin/settings).
//   3. User menu ("admin") > "Change Language" > "French" ("français" on some pages).
//   4. "Paramètres du site" > "Configuration du site": the side tabs.
//   5. The side tab "Courriels en lot": its description.
// Changes the data only by the second context (reset the fleet before each walk).
// NB=1 runs the neighbour check alone: every "Configuration du site" side tab, its label, its form's
// text and the codes in it, in English and in French, which the fix must leave as they are apart from
// the two texts above.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/press-server-french-site-settings-raw-keys/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, signIn, screen, record, idle, rawKeys} = require('../../../probe');
const {createContext, WORDS} = require('../all-dates-error-nothing-published/lib');

const T = 30_000;
const flat = (t, n = 600) => (t == null ? null : String(t).replace(/\s+/g, ' ').trim().slice(0, n));

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const nb = !!process.env.NB;
    const facts = {app: app.name, line: app.line || 'main', mode: nb ? 'neighbour' : 'steps'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 3000)}`);
    };
    const keys = async (page, scope) => {
        const all = await rawKeys(page, scope ? {scope} : undefined).catch((e) => `rawKeys failed: ${e.message}`);
        return Array.isArray(all) ? [...new Set(all.map((k) => (typeof k === 'string' ? k : k.key)))] : all;
    };
    // The "Site Setup" side tabs: id and label.
    const sideTabs = (page) => page.locator('#setup [role="tab"]').evaluateAll((els) => els.map((e) => ({
        id: (e.id || '').replace(/-button$/, ''), label: e.textContent.replace(/\s+/g, ' ').trim(),
    })));
    const openSideTab = async (page, id) => {
        await page.locator(`#${id}-button`).first().click();
        await idle(page);
        const panel = page.locator(`#${id}`).first();
        await panel.locator('form, .pkpListPanel, .pkp_controllers_grid, table').first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        return panel;
    };
    const {page, close} = await launch(app);
    try {
        // 1
        await signIn(page, 'admin');
        await idle(page);
        // Precondition: the second context, on screen
        const noun = WORDS[app.name].noun;
        fact('precondition', {context: `u60a ${noun}`, saveStatus: await createContext(page, app,
            {name: `u60a ${noun}`, initials: 'u60a', path: 'u60a', email: 'u60a@mailinator.com'})});
        if (nb) {
            for (const lang of ['en', 'fr_CA']) {
                await page.goto(app.url(`/index.php/index/${lang}/admin/settings`));
                await idle(page);
                await page.locator('#setup [role="tab"]').first().waitFor({timeout: T});
                const tabs = await sideTabs(page);
                const out = [];
                for (const t of tabs) {
                    const panel = await openSideTab(page, t.id);
                    out.push({...t, text: flat(await panel.innerText().catch(() => null), 1200), codes: await keys(page, `#${t.id}`)});
                }
                record(`nb-${lang}-settings`, await screen(page));
                fact(`nb ${lang} side tabs`, out);
            }
            return;
        }
        // 2
        await page.goto(app.url('/index.php/index/en/admin/settings'));
        await idle(page);
        await page.locator('#setup [role="tab"]').first().waitFor({timeout: T});
        record('en-2-site-settings', await screen(page));
        fact('2 page', {url: page.url().replace(/^https?:\/\/[^/]+/, ''), h1: flat(await page.locator('h1').first().innerText()),
            sideTabs: await sideTabs(page)});
        // 3
        await page.locator('[data-cy="app-user-nav"] button').first().click();
        const menu = page.locator('[data-cy="app-user-nav"] nav').first();
        await menu.waitFor({state: 'visible', timeout: T});
        fact('3 language menu', flat(await menu.innerText().catch(() => null)));
        await menu.getByRole('link', {name: /French|français/i}).first().click();
        await page.waitForURL(/\/fr_CA(\/|$|\?|#)/, {timeout: T});
        await idle(page);
        await page.locator('#setup [role="tab"]').first().waitFor({timeout: T});
        fact('3 page', {url: page.url().replace(/^https?:\/\/[^/]+/, ''), htmlLang: await page.locator('html').getAttribute('lang'),
            h1: flat(await page.locator('h1').first().innerText()), topTabs: (await page.locator('[role="tablist"]').first()
                .locator('[role="tab"]').allTextContents()).map((t) => flat(t))});
        // 4
        record('fr-4-site-setup', await screen(page));
        fact('4 side tabs', await sideTabs(page));
        fact('4 codes in the tab list', await keys(page, '#setup [role="tablist"]'));
        // 5
        const panel = await openSideTab(page, 'bulkEmails');
        record('fr-5-bulk-emails', await screen(page));
        fact('5 tab', flat(await page.locator('#bulkEmails-button').first().innerText().catch(() => null)));
        fact('5 panel', flat(await panel.innerText().catch(() => null), 1500));
        fact('5 codes', await keys(page, '#bulkEmails'));
    } finally {
        record(`${nb ? 'nb' : 'steps'}-facts`, facts);
        await close();
    }
});
