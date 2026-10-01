// Neighbour check for docs/issues/U09-A11-static-page-refusal-repeated-after-save.md
// (U09 A11), walked with the fix in and out. A window built with the same
// older form code that keeps itself on a refusal instead of redisplaying, in
// all three apps: Settings › Website › "Setup" › "Navigation", "Add item", a
// "Custom Page" item. The fix must leave it as it is:
//   n1.  Path `u09ir12 item` refused (the refusal's notice at once)
//   n2.  Path `u09ir12-item` saved (the "added" notice only)
//   n3.  a second item saved with no refusal before it (its "added" notice only, both ways)
// A window that redisplays with its own message box, which the fix must leave alone:
//   p1.  Profile › "Password", a wrong "Current password", refused (the box in the form shows it, no notice at the top right)
// The kit builds nothing.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir12 --dataset 2 --reset
// Run:          PROBE_FEATURE=issues-ir12 PROBE_AGENT=ir12 [PROBE_RUN=fix] node bin/probe.js all shared/playwright/checks/issues/static-page-refusal-repeated-after-save/neighbour.js
// Facts: .reports/<feature>/ir12/neighbour-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, record, idle} = require('../../../probe');
const L = require('./lib');

const {T} = L;
L.idle = idle;

forEachApp(async (app) => {
    const {NavigationTab} = require('../../../pages/NavigationChromePages.js');
    const fact = (k, v) => { record('neighbour-facts', {[k]: v}, {merge: true}); console.log('[neighbour]', app.name, k, JSON.stringify(v).slice(0, 900)); };
    const {page} = await launch(app);
    const errs = L.scriptErrors(page);
    const fetches = L.watchFetches(page);
    page.on('dialog', async (d) => { await d.accept(); });

    await signIn(page, 'dbarnes');
    const tab = new NavigationTab(page, app.contextPath);
    await tab.goto();

    let win = await tab.addItem();                                                   // n1
    await win.chooseType('Custom Page');
    await win.titleInput('en').fill('u09ir12 item');
    await win.pathInput.fill('u09ir12 item');
    const n1 = await L.noticesAfter(page, fetches, () => win.save());
    fact('n1-refused', {...n1, result: {status: n1.result.status, ok: n1.result.body && n1.result.body.status}, open: await win.form.isVisible()});
    await win.pathInput.fill('u09ir12-item');                                        // n2
    const n2 = await L.noticesAfter(page, fetches, async () => {
        const r = await win.save();
        await win.form.waitFor({state: 'hidden', timeout: T}).catch(() => {});
        return {status: r.status};
    });
    fact('n2-saved', {...n2, open: await win.form.isVisible().catch(() => false)});

    win = await tab.addItem();                                                       // n3
    await win.chooseType('Custom Page');
    await win.titleInput('en').fill('u09ir12 item two');
    await win.pathInput.fill('u09ir12-item-two');
    const n3 = await L.noticesAfter(page, fetches, async () => {
        const r = await win.save();
        await win.form.waitFor({state: 'hidden', timeout: T}).catch(() => {});
        return {status: r.status};
    });
    fact('n3-saved', {...n3, open: await win.form.isVisible().catch(() => false)});

    // Profile › "Password"
    await page.goto(app.url(`/index.php/${app.contextPath}/en/user/profile`));
    await L.idle(page);
    await page.getByRole('tab', {name: 'Password'}).or(page.getByRole('link', {name: 'Password', exact: true})).first().click();
    const pw = page.locator('form#changePasswordForm');
    await pw.waitFor({timeout: T});
    await L.idle(page);
    await pw.locator('input[name="oldPassword"]').fill('u09ir12wrong');
    await pw.locator('input[name="password"]').fill('u09ir12newpass');
    await pw.locator('input[name="password2"]').fill('u09ir12newpass');
    const p1 = await L.noticesAfter(page, fetches, async () => {
        const answered = page.waitForResponse((r) => /save-password/.test(r.url()), {timeout: T});
        await pw.getByRole('button', {name: 'Save', exact: true}).click();
        return {status: (await answered).status()};
    });
    const box = page.locator('form#changePasswordForm #changePasswordFormNotification');
    fact('p1-refused', {...p1, box: await box.innerText().then((t) => t.replace(/\s+/g, ' ').trim()).catch(() => null), errors: await page.locator('form#changePasswordForm').locator('label.error, .error').evaluateAll((els) => [...new Set(els.map((e) => e.innerText.trim()).filter(Boolean))]).catch(() => null)});
    fact('scriptErrors-all', errs);
});
