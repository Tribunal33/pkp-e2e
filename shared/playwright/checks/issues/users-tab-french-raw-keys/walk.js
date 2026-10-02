// Issue report docs/issues/U53-A11-users-tab-french-raw-keys.md (its fix.diff): in French (Canada)
// Settings > Users & Roles > "Users" prints codes for its search box, the Invitations heading,
// button and columns and the "Start Date" column. Takes the report's Steps on PKP's default
// test dataset, all three apps:
//   1. rvaca (the context's manager) signs in
//   2. the initials menu > "Change Language" > "français"
//   3-4. "Paramètres" > "Utilisateurs-trices et rôles": the search box, the Invitations heading,
//        button and columns, the users list's columns
//   5. the first row's "…" > "Désactiver": the window's title and text; the window is closed
//   6. the Invitations button: the page it opens (left without sending)
// Changes nothing. NB=1 runs the neighbour check alone: steps 3 to 6 in English, which the fix
// must leave as they are (the French labels already translated are read in the steps' mode).
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/users-tab-french-raw-keys/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, signIn, signOut, screen, record, idle, rawKeys} = require('../../../probe');
const {changeLanguage} = require('../custom-block-stuck-with-unusable-name/lib');
const {T, flat, openUsersTab, usersTabFacts} = require('./lib');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const nb = !!process.env.NB;
    const lang = nb ? 'en' : 'fr_CA';
    const facts = {app: app.name, line: app.line || 'main', mode: nb ? 'neighbour (en)' : 'steps (fr_CA)'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 2500)}`);
    };
    const keys = async (page, scope) => {
        const all = await rawKeys(page, {scope}).catch((e) => `rawKeys failed: ${e.message}`);
        return Array.isArray(all) ? [...new Set(all.map((k) => (typeof k === 'string' ? k : `${k.key}${k.where ? ` @${k.where}` : ''}`)))] : all;
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
        await openUsersTab(app, page, lang);
        fact('3 heading and tabs', {h1: flat(await page.locator('main h1').first().innerText().catch(() => null)),
            tabs: (await page.getByRole('tab').allInnerTexts().catch(() => [])).map((t) => flat(t))});
        record(`${lang}-3-users-tab`, await screen(page));
        // 4
        fact('4 users tab', await usersTabFacts(page));
        fact('4 raw keys (Users tab)', await keys(page, '#users'));

        // 5: the first row's "…" > "Désactiver" (Disable)
        const row = page.locator('#users table').last().locator('tbody tr').first();
        fact('5 row', flat(await row.innerText().catch(() => null), 200));
        const menuButton = row.getByRole('button').last();
        fact('5 menu button name', flat(await menuButton.getAttribute('aria-label').catch(() => null)) || flat(await menuButton.innerText().catch(() => null)));
        await menuButton.click();
        await page.getByRole('menuitem').first().waitFor({timeout: T});
        fact('5 menu', (await page.getByRole('menuitem').allInnerTexts()).map((t) => flat(t)));
        await page.getByRole('menuitem', {name: /^(Disable|Désactiver)/}).first().click();
        const dialog = page.getByRole('dialog').last();
        await dialog.waitFor({timeout: T});
        await dialog.locator('textarea, button').first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        record(`${lang}-5-disable-window`, await screen(page));
        fact('5 window', {heading: flat(await dialog.locator('h1, h2, h3').first().textContent().catch(() => null)),
            text: flat(await dialog.innerText().catch(() => null), 600)});
        fact('5 raw keys (window)', await keys(page, '[role="dialog"]'));
        await page.keyboard.press('Escape');
        await dialog.waitFor({state: 'hidden', timeout: 5000}).catch(() => {});
        await page.evaluate(() => new Promise((r) => setTimeout(r, 600)));

        // 6: the Invitations button
        await openUsersTab(app, page, lang);
        const invite = page.locator('#users button').filter({hasText: /inviteToRole|Invite to a role|Inviter/i}).first();
        fact('6 button', flat(await invite.innerText().catch(() => null)));
        await invite.click();
        await page.waitForURL(/invitation\/create/, {timeout: T}).catch(() => {});
        await idle(page);
        await page.locator('main h1, main h2').first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        record(`${lang}-6-invitation-page`, await screen(page));
        fact('6 page', {url: page.url().replace(/^https?:\/\/[^/]+/, ''), title: await page.title(),
            text: flat(await page.locator('main').innerText().catch(() => null), 1500)});
        fact('6 raw keys (page)', await keys(page, 'main'));
        await page.goto('about:blank');
        await signOut(page).catch(() => {});
    } finally {
        record(`${lang}-facts`, facts);
        await close();
    }
});
