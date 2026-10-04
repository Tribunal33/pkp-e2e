// Issue report on U11 A3: the Highlights list prints a highlight's title with its web codes
// (`<b>Special</b> issue`, `Books &amp; ideas`), while the home page's slide and the "Delete
// Highlight" sentence show it as typed. Takes the report's Steps on PKP's default test dataset (a
// dataset fleet, harness.md "Dataset fleets"). The kit builds nothing: every highlight is made
// through the screens, as `rvaca`, the context's manager.
//
// Default mode, the Steps (OJS, OMP, OPS):
//   3-7  "Add Highlight": "Special issue u11b", "Special" made bold through "Formatting" › "Bold"
//   8    "Add Highlight": "Books & ideas u11b"
//   9    "Order": the arrows' screen-reader names; "Cancel"
//   10   "Delete" on the first row: the dialog's sentence; "No"
//   11   the home page's slides
// `neighbour` as the argument (the fix in and out; runs alone, on a fresh dataset): a title whose
//   angle brackets are typed as text ("a <b> c u11b"), which must stay text in the row; and a
//   plain title, which must read as before. Each step records what it finds, never throwing.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u11b --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u11b PROBE_AGENT=u11b node bin/probe.js all shared/playwright/checks/issues/highlights-list-title-html-codes/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u11b-3_5 PROBE_AGENT=u11b node bin/probe.js all shared/playwright/checks/issues/highlights-list-title-html-codes/walk.js
// The fix:      node bin/try-fix.js apply shared/playwright/checks/issues/highlights-list-title-html-codes/fix.diff ojs omp ops
// Facts: .reports/<feature>/u11b/a3-facts-<mode>-<app>.json (PROBE_RUN adds its tag)
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');

const MODE = process.argv.slice(2).includes('neighbour') ? 'neighbour' : 'steps';
const T = 30_000;

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, mode: MODE, steps: {}};
    const {page, close} = await launch(app);
    const step = async (name, fn) => {
        try {
            facts.steps[name] = await fn();
        } catch (e) {
            facts.steps[name] = {error: e.message.split('\n')[0]};
        }
        record(`a3-${MODE}-${name}`, await screen(page).catch((e) => ({error: e.message})));
        await shot(page, `a3-${MODE}-${name}`).catch(() => {});
    };
    const panel = () => page.locator('.highlightsListPanel');
    const rowTitles = async () =>
        panel().locator('.listPanel__itemTitle').evaluateAll((els) =>
            els.map((e) => ({text: e.innerText.trim(), html: e.innerHTML.trim()})));

    const openTab = async () => {
        await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/website`));
        const setupTab = page.locator('#setup-button').first();
        await setupTab.waitFor({timeout: T});
        if ((await setupTab.getAttribute('aria-selected')) !== 'true') {
            await setupTab.click();
        }
        await page.locator('#setup').first().getByRole('tab', {name: 'Highlights', exact: true}).click();
        await panel().waitFor({timeout: T});
        await idle(page);
    };

    // "Add Highlight", the title typed into the one-line rich-text box; `bold` names the word made
    // bold by selecting it and pressing "Formatting" › "Bold".
    const add = async ({title, bold, url}) => {
        await panel().getByRole('button', {name: 'Add Highlight', exact: true}).click();
        const dialog = page.getByRole('dialog', {name: 'Add Highlight'});
        await dialog.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
        const titleField = dialog.locator('.pkpFormField').filter({has: page.locator('#highlight-title-control-en_ifr')});
        const body = titleField.locator('iframe').first().contentFrame().locator('body');
        await body.click();
        await body.pressSequentially(title);
        const out = {typed: title};
        if (bold) {
            // Select the word: caret to the line's start, then Shift+Right over its letters.
            await page.keyboard.press('Home');
            for (let i = 0; i < bold.length; i++) {
                await page.keyboard.press('Shift+ArrowRight');
            }
            const formatting = titleField.getByRole('button', {name: 'Formatting'});
            out.formattingButton = await formatting.count();
            await formatting.click();
            // The pop-up toolbar opens in TinyMCE's sink at the page's end, outside the box (the
            // "Description" box's own toolbar carries a "Bold" too).
            const popup = page.locator('.tox-tinymce-aux');
            const boldButton = popup.getByRole('button', {name: 'Bold', exact: true});
            await boldButton.waitFor({timeout: T});
            out.formattingMenu = await popup.locator('button').evaluateAll((els) =>
                els.filter((e) => e.offsetParent).map((e) => e.getAttribute('aria-label')));
            await boldButton.click();
        }
        out.boxHtml = await body.innerHTML();
        await dialog.locator('#highlight-url-control').fill(url);
        await dialog.locator('#highlight-urlText-control-en').fill('Read more');
        const saved = page.waitForResponse((r) => /\/api\/v1\/highlights$/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
        await dialog.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await saved;
        out.saveStatus = r.status();
        out.storedTitle = (await r.json().catch(() => ({}))).title;
        await dialog.waitFor({state: 'hidden', timeout: T}).catch(() => {});
        await idle(page);
        out.rows = await rowTitles();
        return out;
    };

    try {
        await step('signin', async () => {
            await signIn(page, 'rvaca');
            await openTab();
            return {rows: await rowTitles()};
        });

        if (MODE === 'steps') {
            await step('add-bold', () => add({title: 'Special issue u11b', bold: 'Special', url: 'https://example.org/u11b'}));
            await step('add-amp', () => add({title: 'Books & ideas u11b', url: 'https://example.org/u11b2'}));
            await step('order', async () => {
                await panel().getByRole('button', {name: 'Order', exact: true}).click();
                await panel().locator('.orderer__up').first().waitFor({timeout: T});
                const names = await panel().locator('.orderer__up, .orderer__down').evaluateAll((els) =>
                    els.map((e) => e.querySelector('.-screenReader').textContent.trim()));
                const aria = await page.getByRole('button', {name: /^Increase position of /}).evaluateAll((els) =>
                    els.map((e) => e.textContent.trim()));
                await panel().getByRole('button', {name: 'Cancel', exact: true}).click();
                return {names, aria};
            });
            await step('delete-dialog', async () => {
                const row = panel().locator('.listPanel__item').filter({hasText: 'issue u11b'});
                await row.getByRole('button', {name: 'Delete', exact: true}).click();
                const dlg = page.getByRole('dialog').filter({hasText: 'Delete Highlight'});
                await dlg.waitFor({timeout: T});
                const msg = dlg.getByText(/Are you sure you want to delete/);
                const out = {text: (await msg.innerText()).trim(), html: (await msg.innerHTML()).trim()};
                await dlg.getByRole('button', {name: 'No', exact: true}).click();
                await dlg.waitFor({state: 'hidden', timeout: T}).catch(() => {});
                out.rowsAfter = await rowTitles();
                return out;
            });
            await step('home', async () => {
                await page.goto(app.url(`/index.php/${app.contextPath}`));
                await idle(page);
                return page.locator('.swiper-slide-title').evaluateAll((els) =>
                    els.map((e) => ({text: e.textContent.trim(), html: e.innerHTML.trim()})));
            });
        } else {
            await step('nb-typed-brackets', () => add({title: 'a <b> c u11b', url: 'https://example.org/u11bn'}));
            await step('nb-plain', () => add({title: 'Plain title u11b', url: 'https://example.org/u11bp'}));
            await step('nb-reload', async () => {
                await openTab();
                const rows = await rowTitles();
                await panel().getByRole('button', {name: 'Order', exact: true}).click();
                await panel().locator('.orderer__up').first().waitFor({timeout: T});
                const names = await panel().locator('.orderer__up').evaluateAll((els) =>
                    els.map((e) => e.querySelector('.-screenReader').textContent.trim()));
                await panel().getByRole('button', {name: 'Cancel', exact: true}).click();
                return {rows, names};
            });
        }
    } finally {
        record(`a3-facts-${MODE}`, facts);
        await close();
    }
});
