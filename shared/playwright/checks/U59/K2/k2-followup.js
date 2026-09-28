// U59 claim check K2, follow-up to k2.js (needs its state, k2-state-<app>.json):
//  - Rule 15: the removed journal's accounts on their own Profile (does any role in the removed journal remain?)
//  - Rule 12 sweep: while ordering, what the other controls of the page do ("Create Journal", a row's arrow)
//  - Rule 8 sweep: the "Edit" window's "Path" box prefix and every field's description, read from the DOM
//   PROBE_FEATURE=U59 PROBE_AGENT=ccK2 node bin/probe.js all shared/playwright/checks/U59/K2/k2-followup.js
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, idle, outDir} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

forEachApp(async (app) => {
    const S = JSON.parse(fs.readFileSync(path.join(outDir(), `k2-state-${app.name}.json`), 'utf8'));
    const t = S.t;
    const out = {};
    const {page, close} = await launch(app);
    const snap = async (name) => { const s = await screen(page); record(name, s); await shot(page, name).catch(() => {}); return s; };
    try {
        // Rule 15: Profile › Roles of the author-only account and of the account with roles in two journals
        for (const u of [`${t}rau`, `${t}both`]) {
            await signIn(page, u); await idle(page).catch(() => {});
            await page.goto(app.url('/index.php/index/en/user/profile')); await idle(page);
            const tab = page.getByRole('tab', {name: /^Roles$/}).or(page.getByRole('link', {name: /^Roles$/})).first();
            if (await tab.count()) { await tab.click().catch(() => {}); await sleep(800); await idle(page); }
            const s = await snap(`f-01-profile-roles-${u.endsWith('rau') ? 'rau' : 'both'}`);
            out[u.endsWith('rau') ? 'rauRoles' : 'bothRoles'] = {url: page.url(), text: flat(s.text.main, 1500),
                ticked: await page.locator('input[type="checkbox"]:checked').evaluateAll((es) => es.map((e) => (e.closest('label') || e.parentElement).innerText.replace(/\s+/g, ' ').trim())).catch(() => [])};
        }
        // Rule 12 sweep: the other controls while ordering
        await signIn(page, 'admin'); await idle(page).catch(() => {});
        await page.goto(app.url('/index.php/index/en/admin/contexts')); await idle(page);
        await page.getByRole('link', {name: 'Order', exact: true}).first().click(); await sleep(600);
        out.ordering = await page.evaluate(() => {
            const a = [...document.querySelectorAll('a.pkp_linkaction_createContext, a.pkp_linkaction_orderItems')];
            return a.map((x) => ({text: x.innerText.trim(), disabled: x.getAttribute('disabled'), cls: x.className, visible: x.offsetParent !== null}));
        });
        const n0 = await page.locator('[role="dialog"]:visible').count();
        await page.locator('a.pkp_linkaction_createContext').first().click().catch((e) => (out.createClickErr = flat(e.message, 200)));
        await sleep(1500); await idle(page).catch(() => {});
        out.createWhileOrdering = {dialogsBefore: n0, dialogsAfter: await page.locator('[role="dialog"]:visible').count()};
        await snap('f-02-create-pressed-while-ordering');
        if (out.createWhileOrdering.dialogsAfter > n0) {
            await page.locator('[role="dialog"]:visible').last().getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
            await sleep(800);
        }
        await page.getByRole('link', {name: 'Cancel ordering'}).or(page.getByRole('button', {name: 'Cancel ordering'})).first().click().catch(() => {});
        await sleep(600);
        // Rule 8 sweep: the "Path" box prefix and every field description in the "Edit" window (scratch journal E, read only)
        await page.goto(app.url('/index.php/index/en/admin/contexts')); await idle(page);
        const row = page.locator('tr.gridRow').filter({hasText: S.E.name}).first();
        await row.locator('a.show_extras').click(); await sleep(400);
        await row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Edit', exact: true}).click();
        const dlg = page.locator('[role="dialog"]:visible').filter({has: page.locator('form[action*="/api/v1/contexts"]')}).last();
        await dlg.locator('[id^="context-urlPath-control"]').first().waitFor({timeout: 30_000}); await idle(page);
        out.pathBox = await dlg.locator('[id^="context-urlPath-control"]').first().evaluate((i) => {
            const field = i.closest('.pkpFormField');
            return {fieldText: field ? field.innerText.replace(/\s+/g, ' ').trim() : null, describedBy: i.getAttribute('aria-describedby')};
        });
        await dlg.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
        await sleep(600);
    } finally {
        record('k2-followup', out);
        await close();
    }
});
