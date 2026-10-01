// Issue report docs/issues/U61-A7-admin-page-french-site-management-raw-key.md (U61 A7):
// a site administrator who reads Administration in French on a press or a
// preprint server sees "##admin.siteManagement.description##" under
// "Gestion du site", where a journal shows the French line.
// Steps, on PKP's default test dataset:
//   1. Sign in as admin.
//   2. Open Administration at /index.php/index/en/admin.
//   3. User menu ("admin") > "Change Language" > "français".
//   4. Read the "Gestion du site" panel (heading, line, buttons) and the
//      other panels.
// The English page, read at step 2, is the control; OJS is the journal
// control. The script changes nothing in the data (the admin's language
// choice lives in the session).
// Run on a freshly reset dataset fleet:
//   PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/admin-page-french-site-management-raw-key/walk.js
const {forEachApp, launch, signIn, screen, record, idle, rawKeys} = require('../../../probe');

const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

async function readPanels(page) {
    return page.locator('.actionPanel').evaluateAll((els) => els.map((el) => ({
        heading: (el.querySelector('h2')?.innerText || '').trim(),
        text: (el.querySelector('.actionPanel__text p')?.innerText || '').replace(/\s+/g, ' ').trim(),
        buttons: [...el.querySelectorAll('.actionPanel__actions a, .actionPanel__actions button')]
            .map((b) => b.innerText.replace(/\s+/g, ' ').trim()),
    })));
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (PKP default test dataset)');
    const facts = {app: app.name, line: app.line || 'main'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 1200)}`);
    };
    const {page, close} = await launch(app);
    try {
        // 1. Sign in as admin
        await signIn(page, 'admin');
        await idle(page);
        // 2. Administration, by its address (sign-in lands the admin on the
        // journal's/press's/server's reader pages)
        await page.goto(app.url('/index.php/index/en/admin'));
        await idle(page);
        await page.locator('.actionPanel').first().waitFor({timeout: 20_000});
        record('en-2-administration', await screen(page));
        fact('en page', {url: page.url().replace(/^https?:\/\/[^/]+/, ''), panels: (await readPanels(page)).slice(0, 1)});

        // 3. User menu > "français"
        await page.locator('[data-cy="app-user-nav"] button').first().click();
        const fr = page.getByRole('link', {name: 'français', exact: true});
        fact('language menu', await page.locator('[data-cy="app-user-nav"] nav').first().innerText().then((t) => flat(t)));
        await fr.click();
        await page.waitForLoadState('domcontentloaded');
        await idle(page);
        await page.locator('.actionPanel').first().waitFor({timeout: 20_000});

        // 4. The panels in French
        record('fr-4-administration', await screen(page));
        fact('fr page', {url: page.url().replace(/^https?:\/\/[^/]+/, ''), title: await page.title(),
            heading: flat(await page.locator('h1').first().innerText())});
        fact('fr panels', await readPanels(page));
        fact('fr rawKeys', await rawKeys(page));
    } finally {
        record('facts', facts);
        await close();
    }
});
