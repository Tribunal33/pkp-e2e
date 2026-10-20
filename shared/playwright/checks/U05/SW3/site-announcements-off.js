// Put the site-wide "Enable announcements" (Administration › Site Settings › "Announcements") back to
// its reset state, off, and record the state found before and after. A site-wide setting: run it under
// `bin/app-lock.sh exclusive <apps> -- …` as one command (U05 drift sweep 2026-10-20: the sweep's K2
// run left it on).
//
//   PROBE_RUN=off PROBE_FEATURE=U05 PROBE_AGENT=ccSW3 bin/app-lock.sh exclusive ojs,omp,ops -- node bin/probe.js all shared/playwright/checks/U05/SW3/site-announcements-off.js
const {forEachApp, launch, signIn, signOut, record, idle} = require('../../../probe');
const L = require('./lib.js');

forEachApp(async (app) => {
    const {page, close} = await launch(app);
    const out = {app: app.name};
    try {
        await signIn(page, 'admin');
        const open = async () => {
            await page.goto(app.url('/index.php/index/admin/settings'));
            const tab = page.getByRole('tab', {name: 'Announcements', exact: true}).first();
            await tab.waitFor({timeout: 30000});
            await tab.click();
            const box = page.getByRole('checkbox', {name: /Enable announcements/i}).first();
            await box.waitFor({timeout: 15000});
            await idle(page);
            return box;
        };
        let box = await open();
        out.before = await box.isChecked();
        await L.snap(page, `site-announcements-before-${app.name}`, {checked: out.before});
        if (out.before) {
            await box.uncheck();
            const saved = page.waitForResponse((r) => /\/api\/v1\/site/.test(r.url()) && /^(PUT|POST)$/.test(r.request().method()), {timeout: 20000});
            await box.locator('xpath=ancestor::form[1]').getByRole('button', {name: 'Save', exact: true}).click();
            out.saveStatus = (await saved).status();
        }
        box = await open();
        out.after = await box.isChecked();
        await L.snap(page, `site-announcements-after-${app.name}`, {checked: out.after});
        await signOut(page);
    } catch (error) {
        out.error = L.flat(error.stack || error, 600);
    } finally {
        record(`site-announcements-${app.name}`, out);
        console.log(JSON.stringify(out));
        await close();
    }
});
