// U10 claim check, housekeeping chunk I05 (hk05, 2026-10-05): three sightings.
//   block  R049: Settings › Website › "Appearance" › "Setup" › "Sidebar" with a custom block
//          named "News 2026 & Events" (and a control block "Plain Notes"): the box labels,
//          the arrows' screen-reader names, the up arrow pressed, the unsaved leave, the
//          block ticked and saved (same page, reload), the visitor's sidebar; the Site
//          Administrator's read of the same tab (Rule 23; A3; notes s, f-a3, td26)
//   a3     A3's other sentences: a click on a Sidebar row's drag handle; the masthead arrows' names
//   dt     R154: Settings › Website › "Date & Time": a discussion message (drawn in the
//          browser) beside a library file's "Date uploaded" (drawn on the server), English
//          and French (Canada) on the default formats, then "Date & Time (Short)" "Custom"
//          `jS M Y H:i` saved and the two read again (Fields "Date & Time"; Rule 33; A8;
//          note j, f-a8)
//   thumb  X1: "Setup" thumbnail and logo uploaded, saved, then "Remove" and "Save": each
//          file's public address, signed out, and the file on disk, before and after
//          (Side effects bullet 2; note d)
// Seeds per app (scratch, tag prefix u10i05): one journal/press/server, en + fr_CA (UI and
// Forms), the Custom Block Manager on, a manager, a manager-level editor and an author, one
// submission with one discussion, one Publisher Library file.
// Run (each run seeds its own context):
//   PROBE_RUN=r1 PROBE_FEATURE=U10 PROBE_AGENT=ccI05 node bin/probe.js all shared/playwright/checks/U10/I05/i05.js
//   PHASES=block,a3,a3b,dt,a8,thumb (default all; a3b reads the site's Settings as admin)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const {forEachApp, launch, signIn, screen, shot, record, loc, idle, tag, sql} = require('../../../probe');
const CB = require('../../issues/custom-block-stuck-with-unusable-name/lib');
const A9 = require('../../issues/date-short-empty-custom-strips-editorial-dates/lib');

const PHASES = (process.env.PHASES || 'block,a3,a3b,dt,a8,thumb').split(',');
const on = (p) => PHASES.includes(p);
const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (t, n = 400) => String(t ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const AMP = 'News 2026 & Events';
const PLAIN = 'Plain Notes';
const DISC = 'I05 time check';
const LIBFILE = 'u10i05 lib file';

// ---- a small PNG -------------------------------------------------------------
const crcT = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (type, data) => { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); };
const png = (w, h, [r, g, b]) => {
    const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
    const raw = Buffer.alloc((w * 3 + 1) * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * (w * 3 + 1) + 1 + x * 3; raw[o] = r; raw[o + 1] = g; raw[o + 2] = b; }
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
};
const FILES = {
    thumb: {name: 'i05-thumb.png', mimeType: 'image/png', buffer: png(100, 100, [120, 30, 160])},
    logo: {name: 'i05-logo.png', mimeType: 'image/png', buffer: png(200, 60, [200, 30, 30])},
};

forEachApp(async (app) => {
    const ops = app.name === 'ops';
    const facts = {};
    const fact = (k, v) => { facts[k] = v; record('i05-facts', {[k]: v}, {merge: true}); console.log('[i05]', app.name, k, JSON.stringify(v).slice(0, 1200)); };

    // ---- seed ------------------------------------------------------------------
    const t = tag('u10i05');
    const u = (s) => `${t}${s}`;
    const C = await app.api.createContext({
        tag: t,
        context: {name: `U10 I05 ${t}`, acronym: 'I05', primaryLocale: 'en', supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']},
        users: [
            {username: u('mg'), roles: ['manager'], givenName: 'Mona', familyName: 'Manager'},
            {username: u('ed'), roles: [ops ? 'manager' : 'editor'], givenName: 'Eddie', familyName: 'Chief'},
            {username: u('au'), roles: ['author'], givenName: 'Ava', familyName: 'Author'},
        ],
        plugins: {customblockmanagerplugin: {enabled: true}, developedbyblockplugin: {enabled: true}},
        libraryFiles: [{name: LIBFILE, type: 'Other'}],
    });
    const ctx = C.path;
    const S = await app.api.createSubmission({
        tag: `${t}s`, context: ctx, submitter: u('au'), title: `I05 S ${t}`,
        participants: [{username: u('ed'), role: ops ? 'manager' : 'editor'}],
        tasks: [{title: DISC, creator: u('mg'), participants: [u('mg'), u('ed')], message: 'I05 first message'}],
    });
    const key = ops ? 'workflow_5' : 'workflow_1';
    fact('seed', {ctx, contextId: C.contextId, submissionId: S.submissionId, tasks: (S.tasks || []).map((x) => x.id), library: (C.libraryFiles || []).map((f) => f.fileName)});
    const cApp = {...app, contextPath: ctx};
    const ctxUrl = (p, locale = 'en') => app.url(`/index.php/${ctx}/${locale}${p}`);

    const M = await launch(app);
    const V = await launch(app);
    const page = M.page;
    const vis = V.page;
    const dialogs = [];
    page.on('dialog', (d) => { dialogs.push({type: d.type(), message: d.message(), url: page.url().replace(/^https?:\/\/[^/]+/, '')}); d.accept().catch(() => {}); });
    const snap = async (p, name, extra) => { const s = await screen(p).catch((e) => ({error: String(e.message || e)})); record(name, extra ? {...s, extra} : s); await shot(p, name).catch(() => {}); return s; };
    const step = async (name, fn) => {
        console.log('[i05]', app.name, '== step', name);
        try { return await fn(); } catch (e) {
            fact(`ERROR-${name}`, flat(e.stack || e, 900));
            await shot(page, `i05-error-${name}`).catch(() => {});
            return null;
        }
    };

    // ---- Settings › Website › Appearance › Setup -----------------------------------
    const openSetup = async () => {
        await page.goto(ctxUrl('/management/settings/website'));
        await idle(page);
        await page.locator('#appearance-button').first().click();
        await idle(page);
        await page.locator('#appearance').getByRole('tab', {name: 'Setup', exact: true}).first().click();
        await page.locator('#appearance-setup input[name="sidebar"]').first().waitFor({state: 'attached', timeout: T});
        await idle(page); await sleep(600);
    };
    const setupForm = () => page.locator('#appearance-setup form').first();
    const sidebarFieldset = () => page.locator('#appearance-setup fieldset').filter({has: page.locator('input[name="sidebar"]')}).last();
    const sidebarRows = () => page.locator('#appearance-setup label.pkpFormField--options__option').filter({has: page.locator('input[name="sidebar"]')}).evaluateAll((ls) => ls.map((l) => {
        const box = l.querySelector('input[name="sidebar"]');
        const lab = l.querySelector('.pkpFormField--options__optionLabel');
        const up = l.querySelector('.orderer__up .-screenReader');
        const down = l.querySelector('.orderer__down .-screenReader');
        return {
            value: box ? box.value : null, checked: box ? box.checked : null,
            labelText: lab ? lab.textContent.trim() : null, labelHTML: lab ? lab.innerHTML.trim() : null,
            upText: up ? up.textContent.trim() : null, upHTML: up ? up.innerHTML.trim() : null,
            downText: down ? down.textContent.trim() : null,
        };
    }));
    const sidebarAria = () => sidebarFieldset().ariaSnapshot({timeout: 5000}).catch((e) => `ERR ${flat(e.message, 200)}`);
    const saveSetup = async () => {
        const w = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await setupForm().getByRole('button', {name: 'Save', exact: true}).last().click();
        const r = await w;
        const saved = await setupForm().locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 8000}).then(() => true).catch(() => false);
        await idle(page); await sleep(500);
        const errors = await setupForm().locator('.pkpFieldError').allInnerTexts().catch(() => []);
        return {status: r ? r.status() : null, override: r ? r.request().headers()['x-http-method-override'] || null : null, saved, errors: errors.map((e) => flat(e, 300))};
    };
    const pubSidebar = async (label) => {
        const r = await vis.goto(ctxUrl(''));
        await idle(vis).catch(() => {});
        const blocks = await vis.locator('.pkp_structure_sidebar .pkp_block').evaluateAll((els) => els.map((b) => ({cls: b.className, title: (b.querySelector('.title, h2, h3') || {}).textContent?.trim() || null, text: b.innerText.replace(/\s+/g, ' ').trim().slice(0, 200)})));
        await snap(vis, label, {status: r ? r.status() : null, blocks});
        return {status: r ? r.status() : null, blocks};
    };

    // =========================== block (R049) =======================================
    if (on('block')) {
        await step('block-add', async () => {
            await signIn(page, u('mg'), {contextPath: ctx});
            await CB.openPlugins(cApp, page);
            const rows0 = await CB.openManager(page);
            const a = await CB.addBlock(page, AMP, 'Dates and events');
            const b = await CB.addBlock(page, PLAIN, 'Plain content');
            await snap(page, 'i05-block-manager', {rows: b.rows});
            fact('block-add', {before: rows0, amp: a.status, plain: b.status, rows: b.rows});
        });
        await step('block-setup-read', async () => {
            await openSetup();
            const s = await snap(page, 'i05-block-setup');
            const rows = await sidebarRows();
            const aria = await sidebarAria();
            await loc(page, 'Setup › Sidebar: the "&" custom block\'s up arrow', page.getByRole('button', {name: /^Increase position of news2026/}));
            await loc(page, 'Setup › Sidebar: the plain custom block\'s up arrow', page.getByRole('button', {name: /^Increase position of plain/i}));
            await loc(page, 'Setup › Sidebar: a plugin block\'s up arrow', page.getByRole('button', {name: 'Increase position of Web Feed Plugin', exact: true}));
            await loc(page, 'Setup › Sidebar: the "&" block\'s box by role', page.getByRole('checkbox', {name: /news2026/}));
            fact('block-setup-read', {rows, aria, crashFreeText: flat(s.text && s.text.main, 200)});
        });
        await step('block-arrow-and-leave', async () => {
            const before = (await sidebarRows()).map((r) => r.value);
            const ampRow = (await sidebarRows()).find((r) => /news2026/.test(r.value || ''));
            const up = page.locator('#appearance-setup label.pkpFormField--options__option').filter({has: page.locator(`input[name="sidebar"][value="${ampRow.value}"]`)}).locator('.orderer__up');
            await up.click();
            await sleep(500); await idle(page);
            const afterUp = (await sidebarRows()).map((r) => r.value);
            await snap(page, 'i05-block-after-up', {before, afterUp});
            const d0 = dialogs.length;
            await page.locator('#appearance').getByRole('tab', {name: 'Theme', exact: true}).first().click();
            await idle(page); await sleep(800);
            const onTheme = await snap(page, 'i05-block-left-to-theme');
            await page.locator('#appearance').getByRole('tab', {name: 'Setup', exact: true}).first().click();
            await idle(page); await sleep(600);
            const backOnSetup = (await sidebarRows()).map((r) => r.value);
            await page.reload(); await idle(page); await sleep(800);
            const afterReloadDialogs = dialogs.slice(d0);
            await openSetup();
            const reloaded = (await sidebarRows()).map((r) => r.value);
            fact('block-arrow-and-leave', {before, afterUp, backOnSetup, reloaded, dialogs: afterReloadDialogs, themeNotices: onTheme.notices || null});
        });
        await step('block-tick-save', async () => {
            // both custom blocks ticked: the "&" one is refused (U09 18b, A13); then the plain one alone
            const rows = await sidebarRows();
            const amp = rows.find((r) => /news2026/.test(r.value || ''));
            const plain = rows.find((r) => /plain/i.test(r.value || ''));
            for (const r of [amp, plain]) await page.locator(`#appearance-setup input[name="sidebar"][value="${r.value}"]`).first().check();
            const saveBoth = await saveSetup();
            const samePage = await sidebarRows();
            await snap(page, 'i05-block-saved-both', {saveBoth});
            await openSetup();
            const reloadedBoth = (await sidebarRows()).filter((r) => r.checked).map((r) => r.value);
            await page.locator(`#appearance-setup input[name="sidebar"][value="${plain.value}"]`).first().check();
            const savePlain = await saveSetup();
            await snap(page, 'i05-block-saved-plain', {savePlain});
            await openSetup();
            const reloaded = await sidebarRows();
            const reloadedAria = await sidebarAria();
            await snap(page, 'i05-block-saved-reload');
            const pub = await pubSidebar('i05-block-public');
            const stored = sql(app, `select setting_value from ${app.contextTables.settings} where ${app.contextTables.id} = ${C.contextId} and setting_name = 'sidebar'`);
            fact('block-tick-save', {saveBoth, samePageChecked: samePage.filter((r) => r.checked).map((r) => r.value), reloadedBoth, savePlain, reloaded, reloadedAria, pub, stored: flat(stored, 600)});
        });
        await step('block-admin', async () => {
            await signIn(page, 'admin');
            const r = await page.goto(ctxUrl('/management/settings/website'));
            await idle(page);
            let rows = null; let aria = null;
            if (await page.locator('#appearance-button').count()) {
                await openSetup();
                rows = await sidebarRows();
                aria = await sidebarAria();
            }
            const s = await snap(page, 'i05-block-admin');
            fact('block-admin', {status: r ? r.status() : null, title: await page.title(), rows, aria, text: rows ? null : flat(s.text && s.text.main, 300)});
        });
    }

    // =========================== a3 (A3, beside R049) ================================
    // A3's other sentences: a click (no drag) on a Sidebar row's handle; the masthead arrows' names
    if (on('a3')) {
        await step('a3-handle-and-masthead', async () => {
            await signIn(page, u('mg'), {contextPath: ctx});
            await openSetup();
            const rowOf = (v) => page.locator('#appearance-setup label.pkpFormField--options__option').filter({has: page.locator(`input[name="sidebar"][value="${v}"]`)});
            const before = (await sidebarRows()).find((r) => r.value === 'WebFeedBlockPlugin');
            await rowOf('WebFeedBlockPlugin').locator('.orderer__dragDrop').click();
            await sleep(500);
            const afterHandle = (await sidebarRows()).find((r) => r.value === 'WebFeedBlockPlugin');
            await rowOf('WebFeedBlockPlugin').locator('.orderer__dragDrop').click();
            await sleep(500);
            const afterSecond = (await sidebarRows()).find((r) => r.value === 'WebFeedBlockPlugin');
            await snap(page, 'i05-a3-handle');
            await page.locator('#appearance').getByRole('tab', {name: 'Editorial Masthead', exact: true}).first().click();
            await idle(page); await sleep(800);
            await snap(page, 'i05-a3-masthead');
            const roles = page.locator('[role="tabpanel"]#appearance-masthead fieldset.pkpFormField--options').filter({has: page.locator('[id^="appearanceMasthead-mastheadUserGroupIds"]')}).last();
            const aria = await roles.ariaSnapshot({timeout: 5000}).catch((e) => `ERR ${flat(e.message, 200)}`);
            fact('a3-handle-and-masthead', {before: before && before.checked, afterHandle: afterHandle && afterHandle.checked, afterSecond: afterSecond && afterSecond.checked, mastheadAria: flat(aria, 1500)});
        });
    }

    if (on('a3b')) {
        // A3: a click on a role's name in "Editorial Masthead" (unsaved; reload after), and the
        // site-wide "Sidebar" list read as the Site Administrator (read only, nothing pressed)
        await step('a3b-role-click-and-site', async () => {
            await signIn(page, u('mg'), {contextPath: ctx});
            await page.goto(ctxUrl('/management/settings/website'));
            await idle(page);
            await page.locator('#appearance-button').first().click();
            await idle(page);
            await page.locator('#appearance').getByRole('tab', {name: 'Editorial Masthead', exact: true}).first().click();
            await idle(page); await sleep(800);
            const roles = page.locator('[role="tabpanel"]#appearance-masthead fieldset.pkpFormField--options').filter({has: page.locator('[id^="appearanceMasthead-mastheadUserGroupIds"]')}).last();
            const order = () => roles.locator('label.pkpFormField--options__option .pkpFormField--options__optionLabel').allInnerTexts();
            const before = await order();
            await roles.locator('label.pkpFormField--options__option').last().locator('.pkpFormField--options__optionLabel').first().click();   // the last role: OPS lists two
            await sleep(500);
            const after = await order();
            await snap(page, 'i05-a3b-role-click');
            await signIn(page, 'admin');
            await page.goto(app.url('/index.php/index/en/admin/settings'));
            await idle(page);
            await page.locator('#appearance-button').first().click();
            await idle(page);
            await page.locator('#appearance').getByRole('tab', {name: 'Setup', exact: true}).first().click();
            await page.locator('input[name="sidebar"]').first().waitFor({state: 'attached', timeout: T});
            await idle(page); await sleep(600);
            await snap(page, 'i05-a3b-site-setup');
            const siteAria = await page.locator('fieldset').filter({has: page.locator('input[name="sidebar"]')}).last().ariaSnapshot({timeout: 5000}).catch((e) => `ERR ${flat(e.message, 200)}`);
            fact('a3b-role-click-and-site', {before: before.slice(0, 5), after: after.slice(0, 5), siteAria: flat(siteAria, 1500)});
        });
    }

    // =========================== dt (R154) ==========================================
    const readMessage = async (locale, label) => {
        await page.goto(app.url(`/index.php/${ctx}/${locale}/dashboard/editorial?workflowSubmissionId=${S.submissionId}&workflowMenuKey=${key}`));
        await idle(page);
        const panel = page.locator('[data-cy="discussion-manager"]:visible').first();
        await panel.waitFor({timeout: T});
        await page.waitForFunction(() => { const p = [...document.querySelectorAll('[data-cy="discussion-manager"]')].find((e) => e.getClientRects().length); return p && !/Loading|Chargement/.test(p.innerText); }, null, {timeout: 20000}).catch(() => {});
        await idle(page);
        await panel.locator('button').filter({has: page.locator('span[id^="discussion_name_"]', {hasText: DISC})}).first().click();
        const dlg = page.getByRole('dialog', {name: DISC, exact: true}).last();
        await dlg.waitFor({timeout: T});
        await dlg.locator('li p').first().waitFor({timeout: T});
        await idle(page); await sleep(600);
        await snap(page, label);
        const heads = await dlg.locator('li').evaluateAll((lis) => lis.map((li) => { const p = li.querySelector('p'); return p ? p.textContent.replace(/\s+/g, ' ').trim() : null; }).filter(Boolean));
        await dlg.getByRole('button', {name: /^(Close|Fermer)/}).first().click().catch(() => {});
        await sleep(600);
        return heads;
    };
    const readLibrary = async (locale, label) => {
        await page.goto(ctxUrl('/management/settings/workflow', locale));
        await idle(page);
        await page.locator('#library-button').first().click();
        const row = page.locator('#libraryGridDiv tr.gridRow').filter({hasText: LIBFILE}).first();
        await row.waitFor({timeout: T});
        await idle(page);
        await row.locator('a.show_extras').first().click();
        await sleep(400);
        const strip = row.locator('xpath=following-sibling::tr[1]');
        await strip.locator('a').first().click();
        const val = page.locator('[role="dialog"]:visible td.value').first();
        await val.waitFor({timeout: T});
        await idle(page); await sleep(600);
        await snap(page, label);
        const pairs = await page.locator('[role="dialog"]:visible tr').filter({has: page.locator('td.label')}).evaluateAll((trs) => trs.map((tr) => [tr.querySelector('td.label').textContent.trim(), (tr.querySelector('td.value') || {}).textContent?.replace(/\s+/g, ' ').trim()]));
        await page.locator('[role="dialog"]:visible').last().getByRole('button', {name: /^(Close|Fermer)/}).first().click().catch(() => {});
        await sleep(600);
        return pairs;
    };
    const stored = () => sql(app, `select setting_name, locale, coalesce(setting_value, '<null>') from ${app.contextTables.settings} where ${app.contextTables.id} = ${C.contextId} and setting_name in ('timeFormat','dateFormatShort','datetimeFormatShort') order by 1, 2`).split('\n');
    if (on('dt')) {
        await step('dt-default', async () => {
            await signIn(page, u('mg'), {contextPath: ctx});
            const form = await A9.openDateTime(page, cApp);
            await snap(page, 'i05-dt-tab-default');
            const labels = {time: await readChoicesAll(form, 'timeFormat'), dtShort: await readChoicesAll(form, 'datetimeFormatShort')};
            const msgEn = await readMessage('en', 'i05-dt-msg-en-default');
            const libEn = await readLibrary('en', 'i05-dt-lib-en-default');
            const msgFr = await readMessage('fr_CA', 'i05-dt-msg-fr-default');
            const libFr = await readLibrary('fr_CA', 'i05-dt-lib-fr-default');
            fact('dt-default', {labels, msgEn, libEn, msgFr, libFr, stored: stored()});
        });
        await step('dt-custom-jS', async () => {
            let form = await A9.openDateTime(page, cApp);
            await A9.chooseCustom(form, 'datetimeFormatShort', 'jS M Y H:i');
            const save = await form.pressSave();
            const body = new URLSearchParams(save.request().postData() || '');
            await idle(page); await sleep(500);
            const savedMark = await form.savedStatus.isVisible().catch(() => false);
            const samePage = await A9.shortGroups(form);
            await snap(page, 'i05-dt-custom-saved');
            form = await A9.openDateTime(page, cApp);
            const reloaded = await A9.shortGroups(form);
            await snap(page, 'i05-dt-custom-reload');
            const msgEn = await readMessage('en', 'i05-dt-msg-en-custom');
            const libEn = await readLibrary('en', 'i05-dt-lib-en-custom');
            fact('dt-custom-jS', {status: save.status(), savedMark, sent: body.get('datetimeFormatShort[en]'), samePage, reloaded, msgEn, libEn, stored: stored()});
        });
        await step('dt-leave-unsaved', async () => {
            const form = await A9.openDateTime(page, cApp);
            await A9.choose(form, 'timeFormat', 0);
            const d0 = dialogs.length;
            await page.goto(ctxUrl('/management/settings/workflow'));
            await idle(page);
            fact('dt-leave-unsaved', {dialogs: dialogs.slice(d0), url: page.url().replace(/^https?:\/\/[^/]+/, '')});
        });
    }

    if (on('a8')) {
        // A8 (Fields "Time"), the third "Time" choice saved; with "Date & Time (Short)" back on its
        // ready choice first, so the combined group follows (Rule 32); English and French reads
        await step('a8-third-time', async () => {
            await signIn(page, u('mg'), {contextPath: ctx});
            let form = await A9.openDateTime(page, cApp);
            await A9.choose(form, 'datetimeFormatShort', 0);
            await A9.choose(form, 'timeFormat', 2);
            const shown = await readChoicesAll(form, 'timeFormat');
            const save = await form.pressSave();
            const body = new URLSearchParams(save.request().postData() || '');
            await idle(page); await sleep(500);
            form = await A9.openDateTime(page, cApp);
            await snap(page, 'i05-a8-tab-reload');
            const reloaded = {time: await readChoicesAll(form, 'timeFormat'), dtShort: await readChoicesAll(form, 'datetimeFormatShort')};
            const msgEn = await readMessage('en', 'i05-a8-msg-en');
            const libEn = await readLibrary('en', 'i05-a8-lib-en');
            fact('a8-third-time', {shown: shown.en, status: save.status(), sent: {timeFormat: body.get('timeFormat[en]'), datetimeFormatShort: body.get('datetimeFormatShort[en]')}, reloaded, msgEn, libEn, stored: stored()});
        });
    }

    // =========================== thumb (X1) =========================================
    const field = `${app.name === 'ojs' ? 'journal' : app.name === 'omp' ? 'press' : 'server'}Thumbnail`;
    const dirWord = app.name === 'ojs' ? 'journals' : app.name === 'omp' ? 'presses' : 'contexts';
    const boxState = async (f) => page.locator(`[id="appearanceSetup-${f}-control-en"]`).locator('xpath=ancestor::div[contains(@class,"pkpFormField")][1]').evaluate((root) => {
        const vis = (e) => e && e.offsetParent !== null;
        const img = root.querySelector('img');
        return {
            text: root.innerText.replace(/\s+/g, ' ').trim().slice(0, 300),
            buttons: [...root.querySelectorAll('button')].filter(vis).map((b) => b.innerText.trim() || b.getAttribute('aria-label')).filter(Boolean),
            img: img ? (img.getAttribute('src') || '').replace(/^https?:\/\/[^/]+/, '') : null,
        };
    }).catch((e) => ({error: flat(e.message, 200)}));
    const upload = async (f, file) => {
        const w = page.waitForResponse((r) => /temporaryFiles/.test(r.url()), {timeout: 10000}).catch(() => null);
        await page.locator(`[id="appearanceSetup-${f}-hiddenFileId-en"]`).setInputFiles(file);
        const r = await w;
        await sleep(1200); await idle(page);
        return {status: r ? r.status() : null, box: await boxState(f)};
    };
    const storedFile = (f) => {
        const v = sql(app, `select coalesce(setting_value, '<null>') from ${app.contextTables.settings} where ${app.contextTables.id} = ${C.contextId} and setting_name = '${f}' and locale = 'en'`).trim();
        let up = null;
        try { up = JSON.parse(v).uploadName; } catch { up = null; }
        return {raw: flat(v, 300), uploadName: up};
    };
    const probeFile = async (uploadName) => {
        const rel = `/public/${dirWord}/${C.contextId}/${uploadName}`;
        const r = await vis.request.get(app.url(rel)).catch((e) => ({err: String(e.message)}));
        const disk = path.resolve(app.root, 'public', dirWord, String(C.contextId), uploadName);
        return {address: rel, status: r.status ? r.status() : r.err, type: r.headers ? r.headers()['content-type'] : null, onDisk: fs.existsSync(disk)};
    };
    if (on('thumb')) {
        await step('thumb-upload-save', async () => {
            await signIn(page, u('mg'), {contextPath: ctx});
            await openSetup();
            const th = await upload(field, FILES.thumb);
            const lg = await upload('pageHeaderLogoImage', FILES.logo);
            const save = await saveSetup();
            await snap(page, 'i05-thumb-saved', {save});
            const sThumb = storedFile(field); const sLogo = storedFile('pageHeaderLogoImage');
            fact('thumb-upload-save', {th, lg, save, sThumb, sLogo, thumbFile: sThumb.uploadName ? await probeFile(sThumb.uploadName) : null, logoFile: sLogo.uploadName ? await probeFile(sLogo.uploadName) : null});
        });
        await step('thumb-remove-save', async () => {
            const sThumb = storedFile(field); const sLogo = storedFile('pageHeaderLogoImage');
            await openSetup();
            const pressRemove = async (f) => {
                const fld = page.locator(`[id="appearanceSetup-${f}-control-en"]`).locator('xpath=ancestor::div[contains(@class,"pkpFormField")][1]');
                await fld.getByRole('button', {name: 'Remove', exact: true}).first().click();
                await sleep(600);
                return boxState(f);
            };
            const thRemoved = await pressRemove(field);
            const lgRemoved = await pressRemove('pageHeaderLogoImage');
            const save = await saveSetup();
            const samePage = {thumb: await boxState(field), logo: await boxState('pageHeaderLogoImage')};
            await snap(page, 'i05-thumb-removed-saved', {save});
            const thumbFileSame = await probeFile(sThumb.uploadName);
            const logoFileSame = await probeFile(sLogo.uploadName);
            await openSetup();
            const reloaded = {thumb: await boxState(field), logo: await boxState('pageHeaderLogoImage')};
            await snap(page, 'i05-thumb-removed-reload');
            const fresh = await launch(app);
            const r2 = await fresh.page.request.get(app.url(`/public/${dirWord}/${C.contextId}/${sThumb.uploadName}`)).catch(() => null);
            await fresh.close();
            fact('thumb-remove-save', {thRemoved, lgRemoved, save, samePage, reloaded, storedThumb: storedFile(field), storedLogo: storedFile('pageHeaderLogoImage'),
                thumbFile: thumbFileSame, logoFile: logoFileSame, thumbFreshBrowser: r2 ? r2.status() : null,
                thumbFileAfterReload: await probeFile(sThumb.uploadName), logoFileAfterReload: await probeFile(sLogo.uploadName)});
        });
    }
    fact('dialogs', dialogs);
});

/** A group's choices for every form language shown: label, value, chosen. */
async function readChoicesAll(form, fieldName) {
    const out = {};
    for (const locale of ['en', 'fr_CA']) {
        out[locale] = await form.form.locator(`input[type="radio"][name="${fieldName}-${locale}"]`).evaluateAll((radios) => radios.map((r) => {
            const label = r.closest('label');
            const c = label ? label.cloneNode(true) : null;
            if (c) c.querySelectorAll('input').forEach((n) => n.remove());
            return {label: c ? c.textContent.replace(/\s+/g, ' ').trim() : null, value: r.value, checked: r.checked};
        })).catch((e) => ({error: String(e.message).slice(0, 200)}));
    }
    return out;
}
