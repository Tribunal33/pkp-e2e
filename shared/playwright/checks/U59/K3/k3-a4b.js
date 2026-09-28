// U59 claim check K3, follow-up to k3.js `a4` (register A4): on a fresh scratch journal's Settings
// Wizard, after a "Path" change saved on the "Journal" tab, (1) what the "Journal" tab's status line shows
// over time for a second save, once the path save's own "Saved" has gone; (2) the legacy grids loaded
// with the page: "Users" › "Add User" and "Plugins" › "Installed Plugins" (a plugin's "Enabled" box).
// Then the same after a reload. Run after k3.js `seed` (it reads the tag from k3-state-<app>.json):
//   PROBE_FEATURE=U59 PROBE_AGENT=ccK3 node bin/probe.js all shared/playwright/checks/U59/K3/k3-a4b.js
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, idle, outDir} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = 30_000;

forEachApp(async (app) => {
    const S = JSON.parse(fs.readFileSync(path.join(outDir(), `k3-state-${app.name}.json`), 'utf8'));
    const t = S.t;
    const p = `${t}q${Date.now().toString(36).slice(-4)}`;
    const r = await app.api.createContext({tag: p, context: {name: `${t} Pathwiz2`, acronym: 'K3Q', country: 'CA', contactName: 'K3 Contact Q', contactEmail: `${t}qc@mail.test`}});
    const id = r.contextId || r.id;
    const out = {id, path: p};
    const {page, close} = await launch(app);
    const traffic = [];
    page.on('response', (x) => { const u = x.url(); if (x.request().method() !== 'GET' || /\$\$\$call\$\$\$/.test(u)) traffic.push({status: x.status(), method: x.request().method(), url: u.replace(app.baseURL, '').slice(0, 160)}); });
    const since = (m) => traffic.slice(m).map((x) => `${x.status} ${x.method} ${x.url}`);
    const snap = async (name) => { const s = await screen(page); record(name, s); await shot(page, name).catch(() => {}); };
    const notices = () => page.locator('.pkpNotification, [role="alert"], .app__notifications').evaluateAll((es) => es.filter((e) => e.offsetParent).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []);
    const jForm = () => page.locator('[role="tabpanel"]#context form').first();
    // status line samples: [ms after click, text]
    const timeline = async (form, ms = 8000) => {
        const start = Date.now(); const seen = [];
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        while (Date.now() - start < ms) {
            const st = (await form.locator('[role="status"]').evaluateAll((es) => es.map((e) => e.innerText.trim()).filter(Boolean)).catch(() => [])).join(' / ');
            if (!seen.length || seen[seen.length - 1][1] !== st) seen.push([Date.now() - start, st]);
            await sleep(100);
        }
        return seen;
    };
    const grids = async (label) => {
        const o = {};
        let m;
        await page.locator('#plugins-button').first().click(); await idle(page); await sleep(800);
        const box = page.locator('#pluginGridContainer input[type="checkbox"]:not([disabled])').first();
        o.pluginBoxes = await page.locator('#pluginGridContainer input[type="checkbox"]:not([disabled])').count();
        if (o.pluginBoxes) {
            o.boxLabel = await box.evaluate((b) => (b.closest('tr') || b).innerText.replace(/\s+/g, ' ').trim().slice(0, 80));
            o.before = await box.isChecked();
            m = traffic.length;
            await box.click();
            await sleep(2500); await idle(page).catch(() => {});
            o.toggle = {traffic: since(m), notices: await notices(), checkedNow: await box.isChecked(), dialog: (await page.locator('[role="dialog"]:visible').last().innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 200)};
            await snap(`q-${label}-plugin-toggle`);
            // a confirm window (disabling a plugin asks) is answered OK; then the box is put back
            const ok = page.locator('[role="dialog"]:visible').last().getByRole('button', {name: /^(OK|Yes)$/}).first();
            if (await ok.count()) { m = traffic.length; await ok.click(); await sleep(2000); o.toggle.afterOk = {traffic: since(m), notices: await notices()}; }
        }
        await page.locator('#users-button').first().click(); await idle(page); await sleep(800);
        m = traffic.length;
        await page.locator('[role="tabpanel"]#users').getByRole('link', {name: 'Add User', exact: true}).click();
        await sleep(2500); await idle(page).catch(() => {});
        o.addUser = {traffic: since(m), dialog: await page.locator('[role="dialog"]:visible').count(), notices: await notices(), dialogText: (await page.locator('[role="dialog"]:visible').last().innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 200)};
        await snap(`q-${label}-add-user`);
        const closeBtn = page.locator('[role="dialog"]:visible').last().getByRole('button', {name: /^(Close|Cancel|OK)$/}).first();
        if (await closeBtn.count()) await closeBtn.click().catch(() => {});
        else await page.locator('[role="dialog"]:visible').last().getByRole('link', {name: /^(Close|Cancel)$/}).first().click().catch(() => {});
        await sleep(800);
        return o;
    };
    try {
        await signIn(page, 'admin'); await idle(page);
        await page.goto(app.url(`/index.php/index/en/admin/wizard/${id}`)); await idle(page);
        await page.locator('#context-button').first().click(); await sleep(700);
        await jForm().locator('[id^="context-urlPath-control"]').first().fill(`${p}n`);
        out.pathSave = await timeline(jForm(), 6000);
        await sleep(4000);
        await jForm().locator('[id^="context-acronym-control"]').first().fill('K3Q2');
        let m = traffic.length;
        out.secondSave = await timeline(jForm(), 8000);
        out.secondSaveTraffic = since(m);
        out.secondSaveNotices = await notices();
        await snap('q-journal-second-save');
        out.gridsAfterPath = await grids('a');
        await page.goto(app.url(`/index.php/index/en/admin/wizard/${id}`)); await idle(page);
        out.gridsAfterReload = await grids('b');
        // put the plugin box back as it was
        if (out.gridsAfterReload.pluginBoxes && out.gridsAfterReload.toggle && out.gridsAfterReload.toggle.checkedNow !== out.gridsAfterReload.before) {
            await page.goto(app.url(`/index.php/index/en/admin/wizard/${id}#plugins`)); await idle(page); await sleep(1500);
            const box = page.locator('#pluginGridContainer input[type="checkbox"]:not([disabled])').first();
            m = traffic.length; await box.click(); await sleep(2000);
            const ok = page.locator('[role="dialog"]:visible').last().getByRole('button', {name: /^(OK|Yes)$/}).first();
            if (await ok.count()) { await ok.click(); await sleep(2000); }
            out.putBack = {traffic: since(m), checked: await box.isChecked()};
        }
    } catch (e) {
        out.error = String(e.message).slice(0, 400);
        await snap('q-error').catch(() => {});
    } finally {
        record('k3-a4b', out);
        console.log(app.name, JSON.stringify(out).slice(0, 3000));
        await close();
    }
});
