// Neighbour checks for the fix of docs/issues/U45-A22-bulk-actions-menu-stays-open.md
// (U45 A22): the other menus built on ui-library's `Dropdown` must behave
// the same with fix.diff in and out. Runs on a dataset fleet, as the
// dataset's `dbarnes`; saves nothing.
//
//   c. every app: the user menu (top right) opens on a press, stays open
//      while Tab moves the focus into it, and closes after a press on the
//      page's heading
//   d. OPS: preprint 1's "Relations" menu (workflow, "Title & Abstract") holds a form; choosing "This
//      preprint has been published elsewhere." and pressing the DOI box
//      that then shows keeps the menu open; "Relations" again closes it
//
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=ir16 [PROBE_RUN=fix] node bin/probe.js all shared/playwright/checks/issues/bulk-actions-menu-stays-open/neighbours.js
// Facts: .reports/<feature>/ir16/neighbour-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');
const {menuState} = require('./lib.js');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('neighbours.js runs on a dataset fleet (fleet-prep --dataset)');
    const {DoisPage} = require('../../../pages/DoisPages.js');
    const {expect} = require('@playwright/test');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 1600)}`);
    };

    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        const dois = new DoisPage(page, app.contextPath);
        await dois.goto();

        // c. the user menu
        const userButton = page.locator('[data-cy="app-user-nav"] > button');
        await userButton.click();
        await sleep(300);
        const c = {opened: await menuState(page)};
        await page.keyboard.press('Tab');
        await sleep(1300);
        c.afterTab = await menuState(page);
        await page.locator('h1').first().click();
        await sleep(1300);
        c.afterPressElsewhere = await menuState(page);
        fact('neighbour c: the user menu', c);

        // d. OPS: the "Relations" form menu
        if (app.name === 'ops') {
            await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=1`));
            await idle(page);
            // the menu sits on the publication views, not on the stage view the workflow opens with
            await page.getByRole('dialog').last().getByText('Title & Abstract', {exact: true}).first().click();
            await idle(page);
            const relation = page.locator('.pkpWorkflow__publicationRelation');
            await expect(relation.locator('> button')).toBeVisible({timeout: T});
            await relation.locator('> button').click();
            const content = relation.locator('.pkpDropdown__content');
            await expect(content).toBeVisible({timeout: T});
            const d = {button: flat(await relation.locator('> button').innerText()), form: flat(await content.innerText(), 300)};
            await content.getByText('This preprint has been published elsewhere.', {exact: true}).first().click();
            await sleep(1300);
            d.afterRadio = await menuState(page);
            const box = content.locator('input[type="text"], input[type="url"]').first();
            await box.click();
            await sleep(1300);
            d.afterDoiBox = await menuState(page);
            record(`neighbour-relations${run}`, await screen(page));
            await relation.locator('> button').click();
            await sleep(300);
            d.pressedAgain = await menuState(page);
            fact('neighbour d: the Relations form menu', d);
        }
    } finally {
        record(`neighbour-facts${run}`, facts);
        await close();
    }
});
