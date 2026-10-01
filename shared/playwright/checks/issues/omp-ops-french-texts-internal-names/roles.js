// Issue report walk, part 2: docs/issues/U57-A8-omp-ops-french-texts-internal-names.md
// Steps 7–9 of the report (role and file-type names) on PKP's default test
// dataset (a dataset fleet). OPS shows the fault; OJS and OMP are the
// control. The one thing the steps create, a second server (journal,
// press) `u57w24`, is created on screen; the kit builds nothing.
//   7  admin: {context}/fr_CA/management/settings/access › "Rôles"
//   8  admin: {context}/fr_CA/management/settings/workflow › "Soumission" › Components
//   9  admin: Administration › Hosted Servers › "Create Server" "u57w24 Serveur",
//      path u57w24, English and French, English primary › "Save"; then steps 7
//      and 8 on u57w24
// Each list records screen() and rawKeys().
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w24 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-w24 PROBE_AGENT=w24 node bin/probe.js all shared/playwright/checks/issues/omp-ops-french-texts-internal-names/roles.js
// Facts: .reports/<feature>/w24/roles-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, record, idle, rawKeys} = require('../../../probe');

const TAG = 'u57w24';
const LABELS = {
    ojs: {hosted: 'Hosted Journals', table: 'Journals', create: 'Create Journal', name: `${TAG} Revue`},
    omp: {hosted: 'Hosted Presses', table: 'Presses', create: 'Create Press', name: `${TAG} Presse`},
    ops: {hosted: 'Hosted Servers', table: 'Servers', create: 'Create Server', name: `${TAG} Serveur`},
};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('roles.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const L = LABELS[app.name];
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`); };
    let n = 20;
    const rec = async (page, label) => {
        const name = `${String(++n).padStart(2, '0')}-${label}`;
        try { const s = await screen(page); record(name, s); return s; } catch (e) { record(name, {error: String(e).slice(0, 300)}); return null; }
    };
    const tabList = async (page, ctx, label, path, tabs) => {
        await page.goto(app.url(`/index.php/${ctx}/fr_CA/management/settings/${path}`));
        await idle(page);
        for (const t of tabs) {
            await page.locator(`#${t}-button`).filter({visible: true}).first().click();
            await idle(page);
        }
        const panel = page.locator(`#${tabs[tabs.length - 1]}`).first();
        await panel.locator('.pkp_controllers_grid, table').first().waitFor({timeout: 20000}).catch(() => {});
        await idle(page);
        await rec(page, label);
        const text = (await panel.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
        return {address: page.url(), rawKeys: (await rawKeys(page, {scope: `#${tabs[tabs.length - 1]}`})) || [], text: text.slice(0, 900)};
    };

    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');
        fact('step 7 fr roles', await tabList(page, app.contextPath, 's7-fr-roles', 'access', ['roles']));
        fact('step 8 fr components', await tabList(page, app.contextPath, 's8-fr-components', 'workflow', ['submission', 'components']));

        // Step 9: a new context with English and French, created on screen.
        const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
        await page.goto(app.url('/index.php/index/en/admin/contexts'));
        await idle(page);
        const hosted = new HostedJournalsPage(page, L);
        const win = await hosted.openCreate();
        await win.type(win.title('en'), L.name);
        if (await win.initials('en').count()) await win.type(win.initials('en'), 'UW');
        await win.type(win.contactName, 'Contact u57w24');
        await win.type(win.contactEmail, 'u57w24@mailinator.com');
        await win.country.selectOption({label: 'Canada'});
        await win.type(win.path, TAG);
        await win.setBox(win.languageBox('en'), true);
        await win.setBox(win.languageBox('fr_CA'), true);
        if (await win.primaryChoice('en').count()) await win.primaryChoice('en').check();
        await rec(page, 's9-create-filled');
        const r = await win.pressSave();
        await page.waitForLoadState('load').catch(() => {});
        await idle(page);
        await rec(page, 's9-created');
        fact('step 9 create', {status: r.status()});
        fact('step 9a new fr roles', await tabList(page, TAG, 's9-new-fr-roles', 'access', ['roles']));
        fact('step 9b new fr components', await tabList(page, TAG, 's9-new-fr-components', 'workflow', ['submission', 'components']));
        await signOut(page);
    } finally {
        await close();
    }
    record('roles-facts', facts);
});
