// Issue report docs/issues/U53-A11-users-tab-french-raw-keys.md, joined by U30 A9: in French
// (Canada) the review stage's "Author Response" table names each row's "…" button and its last
// column "##common.moreActions##" for a screen reader. Takes the report's "Author Response" Steps
// on PKP's default test dataset, OJS only (a press shows no table, spec U30 OMP1; a preprint
// server has no review; stable-3_5_0 has no table):
//   1-2  lkumiega, "français", submission 13 from "Mes soumissions": the "Author Response" card
//   3    the card's button, a response typed, "Lise Kumiega" ticked, the window's submit button
//   4-5  dbarnes, "français", submission 13: the table's columns and the row button's name
//   6    the row's "…" menu
// Every code inside the workflow window is listed (rawKeys) at steps 2, 5 and 6, for the record.
// Run, on an install freshly loaded from the default dataset (it saves one response):
//   npm run fleet-prep -- --feature <feature> --dataset <n> --reset
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/users-tab-french-raw-keys/author-response.js
const {forEachApp, launch, signIn, screen, record, idle, rawKeys} = require('../../../probe');
const {changeLanguage} = require('../custom-block-stuck-with-unusable-name/lib');
const {T, flat, openAuthorResponse, authorResponseTable, authorResponseTableFacts} = require('./lib');

const CASES = {ojs: {id: 13, author: 'lkumiega', authorName: 'Lise Kumiega'}};

forEachApp(async (app) => {
    const c = CASES[app.name];
    if (!c) { console.log(`[u30a9 ${app.name}] no "Author Response" table on this app: nothing to walk`); return; }
    if (!app.dataset) throw new Error('author-response.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const facts = {app: app.name, line: app.line || 'main', submission: c.id};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 2500)}`);
    };
    const keys = async () => {
        const k = await rawKeys(page, {scope: '[role="dialog"]'}).catch((e) => `rawKeys failed: ${e.message}`);
        return Array.isArray(k) ? [...new Set(k.map((x) => x.split(' @ ')[0]))] : k;
    };
    const step = async (key, fn) => {
        try { fact(key, await fn()); } catch (e) { fact(key, {threw: flat(e.message, 400)}); }
    };
    const {page, close} = await launch(app);
    try {
        // 1-2 the author, in French
        await signIn(page, c.author);
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/mySubmissions`));
        await idle(page);
        await changeLanguage(page, 'français', 'fr_CA');
        await step('2 author card', async () => {
            const shown = await openAuthorResponse(app, page, c.id, 'fr_CA', {author: true});
            const card = page.getByRole('heading', {name: /authorResponse##|Author Response/}).first().locator('xpath=ancestor::div[1]');
            return {shown, card: shown ? flat(await card.innerText().catch(() => null), 300) : null, keys: await keys()};
        });
        record('u30a9-author-card-fr', await screen(page));
        // 3 the response, in French
        await step('3 respond', async () => {
            const dialog = page.getByRole('dialog').first();
            await dialog.getByRole('button', {name: /authorReviewResponse\.submit##|Submit Response/}).first().click();
            const w = page.getByRole('dialog', {name: /submitYourResponse##|Submit Your Response/});
            await w.waitFor({timeout: T});
            await w.locator('iframe').first().waitFor({timeout: T});
            await idle(page);
            const before = {title: flat(await w.locator('h1, h2').first().innerText().catch(() => null), 120), keys: [...new Set(((await rawKeys(page, {scope: '[role="dialog"]:last-of-type'})) || []).map((x) => x.split(' @ ')[0]))]};
            const body = w.frameLocator('iframe').first().locator('body');
            await body.click();
            await body.pressSequentially('u30f réponse aux évaluations.');
            await w.getByRole('checkbox', {name: new RegExp(c.authorName)}).first().check();
            await idle(page);
            const answered = page.waitForResponse((r) => /\/authorResponse\/?(\?|$)/.test(r.url()) && r.request().method() === 'POST', {timeout: 15_000}).then((r) => r.status()).catch(() => null);
            await w.getByRole('button', {name: /authorReviewResponse\.submit##|Submit Response/}).click();
            const status = await answered;
            await w.waitFor({state: 'hidden', timeout: T}).catch(() => {});
            await idle(page);
            return {before, post: status};
        });
        // 4-5 the editor, in French
        await signIn(page, 'dbarnes');
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
        await idle(page);
        await changeLanguage(page, 'français', 'fr_CA');
        await step('5 editor table', async () => {
            const shown = await openAuthorResponse(app, page, c.id, 'fr_CA');
            return {shown, ...(await authorResponseTableFacts(page)), keys: await keys()};
        });
        record('u30a9-editor-table-fr', await screen(page));
        // 6 the row's "…" menu
        await step('6 row menu', async () => {
            const b = authorResponseTable(page).locator('tbody tr').filter({hasText: c.authorName}).first().getByRole('button').last();
            await b.click();
            const menu = page.getByRole('menu').last();
            await menu.waitFor({timeout: 10_000});
            const out = {
                button: await b.getAttribute('aria-label'),
                entries: (await menu.getByRole('menuitem').allInnerTexts()).map((x) => flat(x, 60)),
                keys: await keys(),
            };
            await page.keyboard.press('Escape');
            return out;
        });
        record('u30a9-editor-menu-fr', await screen(page));
        // the same table in English, for comparison
        await step('5 editor table en', async () => {
            const shown = await openAuthorResponse(app, page, c.id, 'en');
            return {shown, ...(await authorResponseTableFacts(page)), keys: await keys()};
        });
    } finally {
        record('u30a9-facts', facts);
        await close();
    }
});
