// Issue report docs/issues/U13-OPS7-OPS8-ops-french-preprint-raw-keys.md (U13 OPS7, OPS8):
// a reader who switches a preprint server to French sees raw codes on a
// preprint's page (the keywords label) and in the PDF reader's browser tab.
// Steps, on PKP's default test dataset, signed out:
//   1-2. Open the server's home page in French, /index.php/publicknowledge/fr_CA
//        (the dataset shows no language menu: its sidebar holds no blocks).
//   3. Open "The Facets Of Job Satisfaction: …" (preprint 2) under
//      "Dernière(s) prépublication(s)".
//   4. Read the keywords line.
//   5. Press "PDF (anglais)".
//   6. Read the browser tab's title.
// Control on the same server: the same page and PDF reader in English.
// Control on a journal (OJS): its French article page and PDF reader for
// "Signalling Theory Dividends" (submission 1), the twin templates.
// Run on a freshly reset dataset fleet:
//   PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/ops-french-preprint-raw-keys/walk.js
const {forEachApp, launch, screen, record, idle, rawKeys} = require('../../../probe');

const T = 20_000;
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const TARGET = {
    ops: {title: 'The Facets Of Job Satisfaction', list: 'Preprints'},
    ojs: {title: 'Signalling Theory Dividends', list: 'Current Issue'},
};

forEachApp(async (app) => {
    const target = TARGET[app.name];
    if (!target) return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (PKP default test dataset)');
    const facts = {app: app.name, line: app.line || 'main'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 600)}`);
    };

    const {page, close} = await launch(app);
    try {
        for (const lang of ['fr', 'en']) {
            // 1-2. The home page in the language's own address (the dataset's
            // sidebar holds no language menu, so a reader reaches French by it)
            await page.goto(app.url(`/index.php/${app.contextPath}/${lang === 'fr' ? 'fr_CA' : 'en'}`));
            await idle(page);
            fact(`${lang} home`, {url: page.url().replace(/^https?:\/\/[^/]+/, ''), lang: await page.getAttribute('html', 'lang'),
                languageMenu: await page.getByRole('link', {name: /Français|English/}).count()});
            record(`${lang}-1-home`, await screen(page));

            // 3. Open the preprint (article) from the home page's list
            const link = page.getByRole('link', {name: new RegExp(target.title)}).first();
            await link.waitFor({timeout: T});
            await link.click();
            await idle(page);
            const s = await screen(page);
            record(`${lang}-3-landing`, s);
            // 4. The keywords line
            const kw = page.locator('section.item.keywords').first();
            fact(`${lang} landing`, {url: page.url().replace(/^https?:\/\/[^/]+/, ''), tab: await page.title(),
                keywords: (await kw.count()) ? flat(await kw.innerText()) : null, rawKeys: await rawKeys(page)});

            // 5. "PDF"
            const pdf = page.locator('a.obj_galley_link').filter({hasText: 'PDF'}).first();
            await pdf.click();
            await page.waitForLoadState('domcontentloaded');
            await idle(page);
            // 6. The browser tab
            record(`${lang}-5-pdf-reader`, await screen(page));
            fact(`${lang} pdf reader`, {url: page.url().replace(/^https?:\/\/[^/]+/, ''), tab: flat(await page.title()),
                rawKeys: await rawKeys(page)});
        }
    } finally {
        record('facts', facts);
        await close();
    }
});
