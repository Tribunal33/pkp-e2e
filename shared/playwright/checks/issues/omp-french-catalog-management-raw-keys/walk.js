// Issue report docs/issues/U69-A15-omp-french-book-page-raw-keys.md (its fix.diff), the part
// from spec U70 A7 and A15: in French (Canada) a press's Catalog page (Content > Catalog) and a
// version's "Catalog Entry" page show codes for OMP texts that have no French (Canada) text.
// Takes that group of the report's Steps on PKP's default test dataset (OMP):
//   34. dbarnes signs in; the initials menu > "Change Language" > "français"
//   35. Content > "Catalogue": the tab, the list heading, the column headings, a row's links,
//       the boxes' screen-reader names
//   36. "From Bricks to Brains": the first ("Featured") box; the button that appears
//   37. that button: the notice and the button's new label; "Annuler"
//   38. "Filtres": the groups' headings; the series group's "Psychology" (book 14's series):
//       the column headings
//   39. "Nouvelle entrée de catalogue": the panel's box label; the panel closed
//   40. submission 4 > "Publication" > "Catalogue": the descriptions
// Step 36 changes book 14's "Featured" flag: reset the dataset fleet first. NB=1 runs the neighbour check alone: the same steps in
// English, which the fix must leave as they are.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/omp-french-catalog-management-raw-keys/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, signIn, screen, record, idle, rawKeys} = require('../../../probe');
const {changeLanguage} = require('../custom-block-stuck-with-unusable-name/lib');
const {flat} = require('../omp-french-book-page-raw-keys/lib');

const T = 30_000;
const BOOK = 'From Bricks to Brains';
const SERIES = 'Psychology';
const ENTRY_SUBMISSION = 4;

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const nb = !!process.env.NB;
    const lang = nb ? 'en' : 'fr_CA';
    const L = nb
        ? {entry: 'Catalog Entry', cancel: 'Cancel', filters: 'Filters', add: 'Add Entry', save: 'Save', pub: 'Publication'}
        : {entry: 'Catalogue', cancel: 'Annuler', filters: 'Filtres', add: 'Nouvelle entrée de catalogue', save: 'Enregistrer', pub: 'Publication'};
    const facts = {app: app.name, line: app.line || 'main', mode: nb ? 'neighbour (en)' : 'steps (fr_CA)'};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 2000)}`);
    };
    const keys = async (page, scope) => {
        const all = await rawKeys(page, scope ? {scope} : undefined).catch((e) => `rawKeys failed: ${e.message}`);
        return Array.isArray(all) ? all : all;
    };
    const {page, close} = await launch(app);
    const step = async (n) => {
        await idle(page);
        record(`${lang}-${n}`, await screen(page));
    };
    try {
        // 34
        await signIn(page, 'dbarnes');
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
        await idle(page);
        if (!nb) {
            await changeLanguage(page, 'français', 'fr_CA');
            fact('34 language', {url: page.url().replace(/^https?:\/\/[^/]+/, ''), htmlLang: await page.locator('html').getAttribute('lang')});
        }
        // 35: the side menu's entry to the Catalog page
        const nav = page.locator('nav a').filter({hasText: new RegExp(`^\\s*${nb ? 'Catalog' : 'Catalogue'}\\s*$`)}).first();
        if (await nav.count()) {
            if (!(await nav.isVisible())) {
                // main: the entry sits in the collapsed "Content" group (in French a code, U08)
                const group = page.locator('nav#app-nav').getByText(/^\s*(Content|Contenu|##navigation\.content##)\s*$/).first();
                fact('35 group', flat(await group.innerText().catch(() => 'not found')));
                await group.click();
                await nav.waitFor({state: 'visible', timeout: T});
            }
            await nav.click();
            fact('35 via', 'side menu');
        } else {
            await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/manageCatalog`));
            fact('35 via', 'address (no side menu entry found)');
        }
        const panel = page.locator('.listPanel--catalog').first();
        await panel.waitFor({timeout: T});
        const row = page.locator('.listPanel__item--catalog').filter({hasText: BOOK}).first();
        await row.waitFor({timeout: T});
        await step(35);
        const read = async () => ({
            h1: flat(await page.locator('h1').first().innerText().catch(() => null)),
            tabs: (await page.getByRole('tab').allInnerTexts().catch(() => [])).map((t) => flat(t)),
            listHeading: flat(await panel.locator('h2').first().innerText().catch(() => null)),
            headerButtons: (await panel.locator('.pkpHeader').first().getByRole('button').allInnerTexts()).map((t) => flat(t)).filter(Boolean),
            columns: (await panel.locator('.listPanel--catalog__heading').allInnerTexts()).map((t) => flat(t)),
            notice: flat(await panel.locator('.pkpNotification, [role="status"], .notification').first().innerText().catch(() => null)),
        });
        fact('35 page', await read());
        fact('35 row links', (await row.getByRole('link').allInnerTexts()).map((t) => flat(t)));
        const boxNames = async () => row.locator('.listPanel__item--catalog__select').evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').trim()));
        fact('35 box names', await boxNames());
        fact('35 raw keys', await keys(page));
        // 36: the first box ("Featured")
        const flagged = page.waitForResponse((r) => /saveDisplayFlags/.test(r.url()), {timeout: T});
        await row.locator('.listPanel__item--catalog__select--first').click();
        fact('36 save', (await flagged).status());
        await idle(page);
        const order = panel.locator('.listPanel--catalog__orderToggle').first();
        await order.waitFor({timeout: T}).catch(() => {});
        fact('36 box names', await boxNames());
        fact('36 order button', flat(await order.innerText().catch(() => 'not shown')));
        await step(36);
        // 37
        if (await order.count()) {
            await order.click();
            await idle(page);
            await step(37);
            fact('37 page', await read());
            fact('37 order button', flat(await order.innerText().catch(() => null)));
            fact('37 raw keys', await keys(page));
            await panel.locator('.pkpHeader').first().getByRole('button', {name: L.cancel, exact: true}).click();
            await idle(page);
        }
        // 38: "Filtres", then the series group's "Psychology"
        await panel.locator('.pkpHeader').first().getByRole('button', {name: L.filters}).click();
        await idle(page);
        const sidebar = panel.locator('.listPanel__sidebar').first();
        await sidebar.waitFor({timeout: T});
        fact('38 filter groups', (await sidebar.locator('h3, h4').allInnerTexts()).map((t) => flat(t)));
        const pick = async (name) => {
            const listed = page.waitForResponse((r) => /\/_submissions\?/.test(r.url()) && r.request().method() === 'GET', {timeout: T}).catch(() => null);
            await sidebar.getByRole('button', {name, exact: true}).first().click();
            await listed;
            await idle(page);
        };
        await pick(SERIES);
        await step(38);
        fact('38 page', await read());
        fact('38 raw keys', await keys(page));
        // 39: "Add Entry"
        await panel.locator('.pkpHeader').first().getByRole('button', {name: L.add, exact: true}).click();
        const dialog = page.getByRole('dialog').first();
        await dialog.waitFor({timeout: T});
        await idle(page);
        await step(39);
        fact('39 panel', flat(await dialog.innerText(), 600));
        fact('39 raw keys', await keys(page, '[role="dialog"]'));
        await page.keyboard.press('Escape');
        await dialog.waitFor({state: 'hidden', timeout: T}).catch(() => {});
        // 40: submission 4's "Catalog Entry" page
        const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
        const wf = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: L.pub}});
        await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/dashboard/editorial?workflowSubmissionId=${ENTRY_SUBMISSION}`));
        await page.getByRole('dialog').first().waitFor({timeout: T});
        await idle(page);
        const entry = await wf.revealPublicationEntry(L.entry);
        await entry.click();
        const urlPath = page.locator('input[name="urlPath"]');
        await urlPath.waitFor({timeout: T});
        await idle(page);
        await page.waitForTimeout(500);
        await step(40);
        const form = page.locator('form').filter({has: urlPath}).first();
        fact('40 headings', (await page.getByRole('dialog').first().getByRole('heading').allInnerTexts()).map((t) => flat(t)).filter(Boolean).slice(0, 8));
        fact('40 legends', (await form.locator('legend, .pkpFormGroup__heading, h2, h3').allInnerTexts()).map((t) => flat(t)).filter(Boolean));
        fact('40 seriesPosition', flat(await form.locator('.pkpFormField').filter({has: page.locator('input[name="seriesPosition"]')}).first().innerText().catch(() => null)));
        fact('40 raw keys (form)', await keys(page, '[role="dialog"] form'));
    } finally {
        await close();
    }
    record(`${lang}-facts`, facts);
});
