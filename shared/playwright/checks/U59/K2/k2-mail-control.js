// U59 claim check K2, positive control for the td14 mail read (k2.js "mail" phase): a screen action that
// does send an email (the site's "Forgot your password?" for a scratch account) must show up in the same
// Mailpit read, so an empty read after the Hosted Journals actions means "no email", not "wrong catcher".
//   PROBE_FEATURE=U59 PROBE_AGENT=ccK2 node bin/probe.js all shared/playwright/checks/U59/K2/k2-mail-control.js
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, record, idle, outDir} = require('../../../probe');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
forEachApp(async (app) => {
    const S = JSON.parse(fs.readFileSync(path.join(outDir(), `k2-state-${app.name}.json`), 'utf8'));
    const since = new Date(Date.now() - 1000).toISOString();
    const {page, close} = await launch(app);
    try {
        await page.goto(app.url('/index.php/index/en/login/lostPassword')); await idle(page);
        await page.locator('input[name="email"]').fill(`${S.t}emgr@mail.test`);
        await page.getByRole('button', {name: /Reset password/i}).click(); await idle(page).catch(() => {});
        await sleep(3000);
        const res = await app.mail._get('/api/v1/messages', {limit: '50'});
        const got = (res.messages || []).filter((m) => new Date(m.Created) >= new Date(since)).map((m) => ({subject: m.Subject, to: (m.To || []).map((x) => x.Address)}));
        record('k2-mail-control', {mailpit: app.mailpitUrl, since, got});
        console.log(app.name, app.mailpitUrl, JSON.stringify(got));
    } finally { await close(); }
});
