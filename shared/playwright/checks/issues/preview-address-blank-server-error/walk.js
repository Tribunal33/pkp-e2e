// Issue report walk: docs/issues/U09-A7-preview-address-blank-server-error.md
// (spec U09 register A7). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"):
// on OJS and OMP the manager `rvaca` first ticks "Static Pages Plugin" on
// Settings › Website › "Plugins" (the dataset leaves it off; OPS has no such
// plugin); then the section editor `dbuskins`, a signed-out visitor, and
// (control) `rvaca` each type the custom page preview address
// /index.php/publicknowledge/navigationMenu/preview and, on OJS and OMP, the
// static page preview address /index.php/publicknowledge/pages/preview.
// Records every screen with screen(), each address's status, final address,
// heading and body length, and the fleet's server log lines. The kit builds
// nothing. Step numbers are the report's.
//
// `neighbour` as the script's argument walks the neighbour check for the fix
// instead (run with the fix in and out): `rvaca` adds the Custom Page
// "About u09a7" (path u09a7-page) on Settings › Website › Navigation and, on
// OJS and OMP, the static page "Static u09a7" (path u09a7-static), pressing
// each window's "Preview" before "Save"; then a signed-out visitor and
// `dbuskins` open both saved pages, and `admin` types the preview address.
// All of it must keep working with the fix in.
//
// `session` as the argument walks the expired-session case instead: `rvaca`
// opens the Custom Page window (and, on OJS and OMP, after ticking "Static
// Pages Plugin", the static page window), presses "Preview" once signed in,
// then signs out in a second tab of the same browser, reloads the open
// preview tab, and presses "Preview" again. Records the preview request's
// status, whether a tab opened and what it showed, and the server log lines.
//
// Run (main, then stable-3_5_0); reset the fleet first, the walk changes the
// dataset:
//   npm run fleet-prep -- --feature issues-ir2 --dataset 2 --reset
//   PROBE_FEATURE=issues-ir2 PROBE_AGENT=u09a7 node bin/probe.js all shared/playwright/checks/issues/preview-address-blank-server-error/walk.js [neighbour]
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir2-3_5 --dataset 2 --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir2-3_5 PROBE_AGENT=u09a7 node bin/probe.js all shared/playwright/checks/issues/preview-address-blank-server-error/walk.js
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle, loc} = require('../../../probe');

const T = 20_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const NEIGHBOUR = process.argv.includes('neighbour');
const SESSION = process.argv.includes('session');
const hasStatic = (app) => app.name !== 'ops';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const facts = {line: app.line || 'main', part: SESSION ? 'session' : NEIGHBOUR ? 'neighbour' : 'steps'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const logFile = path.join(__dirname, '../../../../../apps', app.name, 'playwright/.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logSince = (from) => {
        try {
            return fs.readFileSync(logFile).slice(from).toString('utf8').split('\n')
                .filter((l) => /\b(500|Fatal|Uncaught|Error|Exception|permitted)\b/.test(l)).map((l) => l.slice(0, 400)).slice(0, 8);
        } catch { return []; }
    };
    const ctx = app.contextPath;
    const u = (p) => app.url(`/index.php/${ctx}${p}`);

    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name, extra = {}) => { const s = await screen(page); record(`${String(++n).padStart(2, '0')}-${name}${SESSION ? '-ss' : NEIGHBOUR ? '-nb' : ''}`, {...s, ...extra}); return s; };

    /** Type an address; what came back. */
    const typeAddress = async (p, name) => {
        const from = logSize();
        let status = null; let err = null;
        const resp = await page.goto(u(p)).catch((e) => { err = flat(e.message, 200); return null; });
        if (resp) status = resp.status();
        await idle(page).catch(() => {});
        const out = await page.evaluate(() => ({
            url: location.pathname + location.search,
            title: document.title,
            h1: [...document.querySelectorAll('h1')].map((h) => h.innerText.replace(/\s+/g, ' ').trim()),
            bodyLength: document.body ? document.body.innerHTML.length : 0,
            text: document.body ? document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 300) : '',
        })).catch((e) => ({error: String(e.message || e)}));
        out.status = status; out.gotoError = err;
        out.redirectedFrom = resp && resp.request().redirectedFrom() ? resp.request().redirectedFrom().url().replace(app.baseURL, '') : null;
        await pause(300);
        out.log = logSince(from);
        await snap(name, {address: out});
        fact(name, out);
        return out;
    };

    // Settings › Website › "Plugins": tick a plugin's box
    const tickPlugin = async (id) => {
        await page.goto(u('/en/management/settings/website'));
        await idle(page);
        await page.locator('#plugins-button').first().click();
        await idle(page);
        const row = page.locator(`tr.gridRow[id$="-row-${id}"]`).first();
        await row.waitFor({timeout: T});
        await pause(500);
        const box = row.getByRole('checkbox').first();
        await loc(page, `Plugins: the ${id} row's Enabled box`, box);
        if (await box.isChecked()) return {already: true};
        const w = page.waitForResponse((r) => /plugin-grid\/enable/.test(r.url()), {timeout: T}).catch(() => null);
        await box.click();
        const r = await w;
        await pause(800); await idle(page);
        const s = await snap(`plugin-${id}-ticked`);
        return {status: r ? r.status() : null, checked: await box.isChecked(), notices: s.notices};
    };

    try {
        if (SESSION) {
            /** Press the window's "Preview": the request's status, the new tab (if any) as data; the tab is kept open. */
            const pressPreview = async (win, re) => {
                const from = logSize();
                const out = {};
                const btn = win.getByRole('button', {name: 'Preview', exact: true}).or(win.getByRole('link', {name: 'Preview', exact: true})).first();
                const resp = page.waitForResponse((r) => re.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
                const [popup] = await Promise.all([
                    page.context().waitForEvent('page', {timeout: 8000}).catch(() => null),
                    btn.click(),
                ]);
                const r = await resp;
                out.request = r ? {status: r.status(), url: r.url().replace(app.baseURL, '')} : null;
                out.newTab = !!popup;
                if (popup) {
                    await popup.waitForLoadState('load').catch(() => {});
                    await pause(1500);
                    out.tab = await popup.evaluate(() => ({url: location.href, title: document.title, h1: [...document.querySelectorAll('h1')].map((h) => h.innerText.trim()), text: document.body ? document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 200) : ''})).catch((e) => ({error: String(e.message || e)}));
                }
                await pause(300);
                out.windowStillOpen = await win.isVisible().catch(() => false);
                out.log = logSince(from);
                return {out, popup};
            };
            const reloadTab = async (popup) => {
                const from = logSize();
                const resp = await popup.reload().catch(() => null);
                await pause(1000);
                const tab = await popup.evaluate(() => ({url: location.href, title: document.title, text: document.body ? document.body.innerText.replace(/\s+/g, ' ').trim().slice(0, 200) : ''})).catch((e) => ({error: String(e.message || e)}));
                return {status: resp ? resp.status() : null, tab, log: logSince(from)};
            };
            const signOutElsewhere = async () => {
                const other = await page.context().newPage();
                await other.goto(app.url('/index.php/index/login/signOut')).catch(() => {});
                await pause(800);
                await other.close();
            };
            const cases = [['custom', /navigationMenu\/preview/]];
            if (hasStatic(app)) cases.push(['static', /pages\/preview/]);
            for (const [kind, re] of cases) {
                await signIn(page, 'rvaca');
                await idle(page);
                let win;
                if (kind === 'custom') {
                    await page.goto(u('/en/management/settings/website#setup/navigationMenus'));
                    await idle(page);
                    await page.locator('table[id^="component-grid-navigationmenus-navigationmenuitemsgrid-"]').first().waitFor({timeout: T});
                    await pause(400);
                    await page.getByRole('link', {name: 'Add item', exact: true}).click();
                    win = page.locator('[role="dialog"]:visible').filter({has: page.locator('form#navigationMenuItemsForm')}).first();
                    await win.locator('select[name="menuItemType"]').waitFor({timeout: T});
                    await idle(page); await pause(600);
                    await win.locator('input[name="title[en]"]').fill('About u09a7');
                    await win.locator('select[name="menuItemType"]').selectOption({label: 'Custom Page'});
                    await pause(400);
                    await win.locator('input[name="path"]').fill('u09a7-page');
                } else {
                    fact('ss-static-enabled', await tickPlugin('staticpagesplugin'));
                    await page.goto(u('/en/management/settings/website'));
                    await idle(page);
                    await page.getByRole('tab', {name: 'Static Pages', exact: true}).first().click();
                    await idle(page); await pause(800);
                    await page.getByRole('link', {name: 'Add Static Page'}).click();
                    win = page.locator('[role="dialog"]:visible').filter({has: page.locator('textarea[name^="content"]')}).last();
                    await win.locator('input[name="path"]').waitFor({timeout: T});
                    await idle(page); await pause(800);
                    await win.locator('input[name="path"]').fill('u09a7-static');
                    await win.locator('input[name="title[en]"]').fill('Static u09a7');
                }
                const taId = await win.locator('textarea[name="content[en]"]').first().getAttribute('id');
                await page.waitForFunction((x) => window.tinymce && window.tinymce.get(x) && window.tinymce.get(x).initialized, taId, {timeout: T}).catch(() => {});
                await pause(400);
                await page.frameLocator(`[id="${taId}_ifr"]`).locator('body').click();
                await page.keyboard.type(`Text u09a7 (${kind}).`);
                await win.locator('input[name="path"]').click();
                await pause(400);
                const first = await pressPreview(win, re);
                fact(`ss-${kind}-preview-signed-in`, first.out);
                await signOutElsewhere();
                if (first.popup) {
                    fact(`ss-${kind}-reload-open-preview`, await reloadTab(first.popup));
                    await first.popup.close().catch(() => {});
                }
                const second = await pressPreview(win, re);
                fact(`ss-${kind}-preview-after-sign-out`, second.out);
                await snap(`ss-${kind}-after-second-preview`, {second: second.out});
                if (second.popup) await second.popup.close().catch(() => {});
            }
        } else if (!NEIGHBOUR) {
            // Precondition: "Static Pages Plugin" on (OJS, OMP)
            if (hasStatic(app)) {
                await signIn(page, 'rvaca');
                fact('pre-static-pages-enabled', await tickPlugin('staticpagesplugin'));
                await signOut(page);
            }
            // 1-3: dbuskins
            await signIn(page, 'dbuskins');
            await idle(page);
            await typeAddress('/navigationMenu/preview', 'step2-dbuskins-navigationMenu-preview');
            if (hasStatic(app)) await typeAddress('/pages/preview', 'step3-dbuskins-pages-preview');
            // 4-6: signed out
            await signOut(page);
            await typeAddress('/navigationMenu/preview', 'step5-signedout-navigationMenu-preview');
            if (hasStatic(app)) await typeAddress('/pages/preview', 'step6-signedout-pages-preview');
            // control: rvaca
            await signIn(page, 'rvaca');
            await idle(page);
            await typeAddress('/navigationMenu/preview', 'control-rvaca-navigationMenu-preview');
            if (hasStatic(app)) await typeAddress('/pages/preview', 'control-rvaca-pages-preview');
            await signOut(page);
        } else {
            await signIn(page, 'rvaca');
            await idle(page);
            // the Custom Page window's "Preview", then "Save"
            await page.goto(u('/en/management/settings/website#setup/navigationMenus'));
            await idle(page);
            await page.locator('table[id^="component-grid-navigationmenus-navigationmenuitemsgrid-"]').first().waitFor({timeout: T});
            await pause(400);
            await page.getByRole('link', {name: 'Add item', exact: true}).click();
            const win = page.locator('[role="dialog"]:visible').filter({has: page.locator('form#navigationMenuItemsForm')}).first();
            await win.locator('select[name="menuItemType"]').waitFor({timeout: T});
            await idle(page); await pause(600);
            await win.locator('input[name="title[en]"]').fill('About u09a7');
            await win.locator('select[name="menuItemType"]').selectOption({label: 'Custom Page'});
            await pause(400);
            await win.locator('input[name="path"]').fill('u09a7-page');
            fact('nb-custom-preview', await previewAndSave(page, win, 'content', 'Custom page text u09a7.', /update-navigation-menu-item/, snap, loc));
            await snap('nb-custom-saved');
            if (hasStatic(app)) {
                fact('nb-static-enabled', await tickPlugin('staticpagesplugin'));
                await page.goto(u('/en/management/settings/website'));
                await idle(page);
                await page.getByRole('tab', {name: 'Static Pages', exact: true}).first().click();
                await idle(page); await pause(800);
                await page.getByRole('link', {name: 'Add Static Page'}).click();
                const sw = page.locator('[role="dialog"]:visible').filter({has: page.locator('textarea[name^="content"]')}).last();
                await sw.locator('input[name="path"]').waitFor({timeout: T});
                await idle(page); await pause(800);
                await sw.locator('input[name="path"]').fill('u09a7-static');
                await sw.locator('input[name="title[en]"]').fill('Static u09a7');
                fact('nb-static-preview', await previewAndSave(page, sw, 'content', 'Static page text u09a7.', /staticPages|static-page/i, snap, loc));
                await snap('nb-static-saved');
            }
            // a signed-out visitor, then dbuskins, open the saved pages
            await signOut(page);
            await typeAddress('/u09a7-page', 'nb-signedout-custom-page');
            if (hasStatic(app)) await typeAddress('/u09a7-static', 'nb-signedout-static-page');
            await signIn(page, 'dbuskins');
            await idle(page);
            await typeAddress('/u09a7-page', 'nb-dbuskins-custom-page');
            if (hasStatic(app)) await typeAddress('/u09a7-static', 'nb-dbuskins-static-page');
            // the site administrator's typed preview
            await signIn(page, 'admin');
            await idle(page);
            await typeAddress('/navigationMenu/preview', 'nb-admin-navigationMenu-preview');
            if (hasStatic(app)) await typeAddress('/pages/preview', 'nb-admin-pages-preview');
            await signOut(page);
        }
    } finally {
        record(`facts${SESSION ? '-ss' : NEIGHBOUR ? '-nb' : ''}`, facts);
        await close();
    }
});

/** Type into the window's English content box, press "Preview" (a new tab), then "Save". */
async function previewAndSave(page, win, field, text, saveRe, snap, loc) {
    const out = {};
    const taId = await win.locator(`textarea[name="${field}[en]"]`).first().getAttribute('id');
    await page.waitForFunction((x) => window.tinymce && window.tinymce.get(x) && window.tinymce.get(x).initialized, taId, {timeout: T}).catch(() => {});
    await pause(400);
    await page.frameLocator(`[id="${taId}_ifr"]`).locator('body').click();
    await page.keyboard.type(text);
    await win.locator('input[name="path"]').click();
    await pause(500);
    const btn = win.getByRole('button', {name: 'Preview', exact: true}).or(win.getByRole('link', {name: 'Preview', exact: true})).first();
    await loc(page, 'the window\'s "Preview"', btn);
    const [popup] = await Promise.all([
        page.context().waitForEvent('page', {timeout: 10_000}).catch(() => null),
        btn.click().catch((e) => { out.clickError = flat(e.message, 200); }),
    ]);
    out.newTab = !!popup;
    if (popup) {
        await popup.waitForLoadState('load').catch(() => {});
        await pause(2500);
        out.preview = await popup.evaluate(() => ({
            h1: [...document.querySelectorAll('h1')].map((h) => h.innerText.replace(/\s+/g, ' ').trim()),
            text: (document.querySelector('.page') || document.body || {innerText: ''}).innerText.replace(/\s+/g, ' ').trim().slice(0, 200),
            bodyLength: document.body ? document.body.innerHTML.length : 0,
        })).catch((e) => ({error: String(e.message || e)}));
        await popup.close();
    }
    const w = page.waitForResponse((r) => saveRe.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
    await win.getByRole('button', {name: 'Save', exact: true}).first().click();
    const r = await w;
    out.save = r ? {status: r.status(), url: r.url().replace(/^https?:\/\/[^/]+/, '').replace(/csrfToken=[^&]+/, 'csrfToken=…')} : null;
    await pause(1200); await idle(page);
    out.windowOpen = await win.isVisible().catch(() => false);
    return out;
}
