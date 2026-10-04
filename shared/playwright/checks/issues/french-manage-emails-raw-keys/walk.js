// Issue report docs/issues/U56-A11-french-manage-emails-raw-keys.md (its fix-<app>.diff): in French
// (Canada) "Gérer les courriels" names and describes some emails by `##key##` codes, and a preprint
// server's Moderator filter button under "Envoyé par" / "Envoyé à" is a code. Takes the report's
// Steps on PKP's default test dataset, all three apps:
//   1. rvaca (the context's manager) signs in
//   2. the initials menu > "Change Language" > "français"
//   3. "Paramètres" > "Flux des travaux" > the "Courriels" tab > the link to the email templates
//   4. the list: every row's name and description, the codes among them
//   5. the filter buttons under "Envoyé par" and "Envoyé à"
// Changes nothing. NB=1 runs the neighbour check alone: steps 3 to 5 in English, which the fix must
// leave as they are.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/french-manage-emails-raw-keys/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, signIn, signOut, screen, record, idle, rawKeys} = require('../../../probe');
const {changeLanguage} = require('../custom-block-stuck-with-unusable-name/lib');
const {T, flat, openManageEmails, listFacts} = require('./lib');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const nb = !!process.env.NB;
    const lang = nb ? 'en' : 'fr_CA';
    const facts = {app: app.name, line: app.line || 'main', mode: nb ? 'neighbour (en)' : 'steps (fr_CA)'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 3000)}`);
    };
    const {page, close} = await launch(app);
    try {
        // 1
        await signIn(page, 'rvaca');
        await idle(page);
        // 2
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
        await idle(page);
        if (!nb) {
            await changeLanguage(page, 'français', 'fr_CA');
            fact('2 language', {url: page.url().replace(/^https?:\/\/[^/]+/, ''), htmlLang: await page.locator('html').getAttribute('lang')});
        }
        // 3
        const via = await openManageEmails(app, page, lang);
        fact('3 page', {via, url: page.url().replace(/^https?:\/\/[^/]+/, ''), title: await page.title(),
            h1: flat(await page.locator('main h1').first().innerText().catch(() => null))});
        record(`${lang}-3-manage-emails`, await screen(page));
        // 4, 5
        const list = await listFacts(page);
        fact('4 rows', list.rows.length);
        fact('4 rows with a code', list.rows.filter((r) => /##/.test(`${r.name} ${r.description}`)));
        fact('4 first rows', list.rows.slice(0, 14));
        fact('4 edit button names with a code', list.rows.filter((r) => /##/.test(r.editName || '')).map((r) => r.editName));
        fact('4 all rows', list.rows.map((r) => `${r.name} | ${r.description}`));
        fact('5 filters', list.sidebar);
        const keys = await rawKeys(page, {scope: 'main'}).catch((e) => `rawKeys failed: ${e.message}`);
        fact('4-5 raw keys (page)', Array.isArray(keys)
            ? [...new Set(keys.map((k) => (typeof k === 'string' ? k : `${k.key}${k.where ? ` @${k.where}` : ''}`)))]
            : keys);
        await page.goto('about:blank');
        await signOut(page).catch(() => {});
    } finally {
        record(`${lang}-facts`, facts);
        await close();
    }
});
