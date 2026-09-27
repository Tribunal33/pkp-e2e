const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U11 claim check, chunk K2 — ordering ("Order" / "Save Order" / "Cancel",
// a new highlight's position), scope (journal vs site), the site's
// Highlights tab (Administration › Site Settings › Site Setup › Highlights)
// and when it exists, the site's home page, "live at once", the deletion
// cascade and side effects; register A1 (spec lines 59–65, 99–109,
// 124–150, 244–252). All three apps. docs/process/briefs/claim-check.md.
//
// Phases (PHASES=a,b,… re-runs named ones; scratch state is scratch.json in
// the agent's output folder):
//   onejournal  BEFORE any scratch context exists: admin's Site Settings
//               side tabs (Rule 12, one-journal end), the site address
//               signed out (Rule 13, one-journal end), the site highlights
//               API from the browser session (control).
//   seed        one scratch context per app: manager "mgr", section editor
//               "sec", reader "rdr" (Rule 12's "two or more" end from here on).
//   sitetab     admin: Site Settings › Site Setup side tabs with two
//               journals; the site's Highlights tab; add three site
//               highlights; the site home page signed out (Rule 13); the
//               journal's home page as a scope control (Rule 1); "Order" on
//               the site's list.
//   order       manager on the scratch journal: three highlights, "Order",
//               the buttons, "Add Highlight" disabled, the arrows and their
//               screen-reader names, first-up / last-down no-op, "Cancel"
//               (A1), reload, "Save Order", the home page's order (Rule 9);
//               a fourth highlight's position (Rule 7 tail); sweep.
//   live        manager adds a highlight; the same instant, a signed-out
//               page and a reader see it (Rule 14); Mailpit and the
//               header's tasks and notifications before and after (Side
//               effects, note m).
//   scope       the scratch journal's list and home page never show the
//               site's or publicknowledge's highlights and vice versa
//               (Rule 1); the API filter from the browser session.
//   cascade     admin deletes a second scratch journal that holds a highlight
//               with an image: the stored file before and after; the site
//               list unchanged (Side effects, note m/g).
//   siterefused admin presses "Save" in the site's "Add Highlight" window and
//               the screen is read three seconds later (what a refused site
//               save shows).
//   cleanup     delete the site highlights this chunk added (leave the site
//               list as found).
//
//   PROBE_FEATURE=U11 PROBE_AGENT=ccK2 node bin/probe.js all shared/playwright/checks/U11/K2/k2.js
//
// No assertions: every screen is recorded with screen()/shot(); the console
// log carries the facts the report cites.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} =
    require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const SCRATCH_FILE = path.join(outDir(), 'scratch.json');
const scratchAll = fs.existsSync(SCRATCH_FILE) ? JSON.parse(fs.readFileSync(SCRATCH_FILE, 'utf8')) : {};
const ONLY = process.env.PHASES ? process.env.PHASES.split(',') : null;
const phase = (name) => !ONLY || ONLY.includes(name);
const saveScratch = () => fs.writeFileSync(SCRATCH_FILE, JSON.stringify(scratchAll, null, 2));
const log = (...a) => console.log(...a);
const flat = (s, n = 1500) => (s || '').replace(/\n+/g, ' | ').slice(0, n);

async function sect(name, fn) { try { await fn(); } catch (e) { log(`[${name} FAILED]`, String(e).split('\n')[0]); } }
async function snap(page, name, extra) {
    let s; try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
    if (extra) Object.assign(s, extra);
    record(name, s); await shot(page, name).catch(() => {}); return s;
}
/** The side tabs (role=tab) visible on the page, by accessible name. */
const tabNames = (page) => page.getByRole('tab').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => e.innerText.trim().replace(/\s+/g, ' '))).catch(() => []);
const allTabNames = (page) => page.getByRole('tab').evaluateAll((els) => els.map((e) => ({name: e.innerText.trim().replace(/\s+/g, ' '), visible: e.offsetParent !== null, id: e.id}))).catch(() => []);
/** Read a JSON API address through the browser's own session (what the panel itself fetches). */
async function apiGet(page, url) {
    return page.evaluate(async (u) => {
        const r = await fetch(u, {credentials: 'same-origin', headers: {Accept: 'application/json'}});
        let body = null; try { body = await r.json(); } catch { body = await r.text().catch(() => null); }
        return {status: r.status, body};
    }, url);
}
const highlightsPanel = (page) => page.locator('.listPanel').filter({has: page.getByRole('button', {name: 'Add Highlight'})}).first();
const panelRows = (page) => highlightsPanel(page).locator('.listPanel__item').evaluateAll((els) => els.map((e) => ({
    text: e.innerText.trim().replace(/\s+/g, ' '),
    buttons: [...e.querySelectorAll('button')].map((b) => ({name: b.getAttribute('aria-label') || b.innerText.trim(), disabled: b.disabled})),
}))).catch(() => []);
const headerButtons = (page) => highlightsPanel(page).locator('.listPanel__header button').evaluateAll((els) => els.map((b) => ({name: b.innerText.trim() || b.getAttribute('aria-label'), disabled: b.disabled, visible: b.offsetParent !== null}))).catch(() => []);
const carouselTitles = (page) => page.locator('.highlights .swiper-slide-title').evaluateAll((els) => els.map((e) => e.innerText.trim())).catch(() => []);

async function phasesSite(app) {
    const scratch = (scratchAll[app.name] = scratchAll[app.name] || {});
    const ctxPath = app.contextPath; // publicknowledge
    const siteSettings = app.url('/index.php/index/admin/settings');
    const siteHome = app.url('/index.php/index');

    // ---------------------------------------------------------------------
    if (phase('onejournal')) {
        const {page, close} = await launch(app);
        try {
            log(`\n== ${app.name} onejournal ==`);
            // the API count of contexts, through a signed-in admin session
            await signIn(page, 'admin');
            await page.goto(siteSettings); await idle(page);
            const s = await snap(page, 'onejournal-site-settings');
            const tabs = await allTabNames(page);
            log('site settings tabs:', JSON.stringify(tabs));
            record('onejournal-site-settings-tabs', tabs);
            const ctxs = await apiGet(page, app.url('/index.php/index/api/v1/contexts?count=100'));
            log('contexts:', ctxs.status, JSON.stringify((ctxs.body && ctxs.body.items || []).map((c) => c.urlPath)));
            record('onejournal-contexts', ctxs);
            // the site tab's address typed directly
            await page.goto(app.url('/index.php/index/admin/settings#highlights')).catch(() => {});
            await idle(page);
            await snap(page, 'onejournal-site-settings-hash-highlights');
            log('hash highlights: tabs visible', JSON.stringify(await tabNames(page)));
            // the site highlights list address through the browser session
            const api = await apiGet(page, app.url('/index.php/index/api/v1/highlights?count=100'));
            log('site highlights API (admin):', api.status, flat(JSON.stringify(api.body), 300));
            record('onejournal-site-highlights-api', api);
            await signOut(page);
            // signed out: the site address
            await page.goto(siteHome); await idle(page);
            const h = await snap(page, 'onejournal-site-home-signedout');
            log('site address landed on:', h.url, '| title:', h.title);
            const journalHome = app.url(`/index.php/${ctxPath}`);
            await page.goto(journalHome); await idle(page);
            const jh = await snap(page, 'onejournal-journal-home-signedout');
            log('journal home:', jh.url, '| highlights block count:', await page.locator('.highlights').count());
        } finally { await close(); }
    }

    // ---------------------------------------------------------------------
    if (phase('seed')) {
        log(`\n== ${app.name} seed ==`);
        for (const k of Object.keys(scratch)) delete scratch[k]; // a re-seed starts the app's scratch state over
        const t = tag('u11k2');
        const spec = {
            tag: t,
            context: {name: `K2 ${app.name} ${t}`, supportedLocales: ['en', 'fr_CA']},
            users: [
                {username: `${t}mgr`, roles: ['manager'], givenName: 'Kay', familyName: 'Manager'},
                {username: `${t}sec`, roles: ['sectionEditor'], givenName: 'Sam', familyName: 'Section'},
                {username: `${t}rdr`, roles: ['reader'], givenName: 'Rae', familyName: 'Reader'},
            ],
        };
        const created = await app.api.createContext(spec);
        scratch.tag = t; scratch.path = created.path; scratch.contextId = created.contextId; scratch.users = created.users;
        saveScratch();
        log('scratch context:', JSON.stringify({tag: t, path: created.path, contextId: created.contextId}));
    }
}

// ---------------------------------------------------------------------------
// Shared helpers for the panel (journal or site scope)

/** Open the Highlights side tab of a Website settings page (journal) or the Site Setup tab (site). */
async function openHighlightsTab(page, url) {
    await page.goto(url); await idle(page);
    // #setup-button exists twice (the outer "Site Setup"/"Setup" tab and Appearance's inner "Setup"); the outer comes first.
    const setup = page.locator('#setup-button').first();
    if ((await setup.count()) && !String(await setup.getAttribute('aria-selected')).includes('true')) { await setup.click(); }
    const tab = page.getByRole('tab', {name: 'Highlights', exact: true});
    if ((await tab.count()) === 0) return false;
    await tab.click(); await idle(page);
    await highlightsPanel(page).waitFor({state: 'visible', timeout: 15000}).catch(() => {});
    return true;
}

/** The "Add Highlight" / "Edit Highlight" window's fields, read by label. */
const dlgFields = (dlg) => dlg.locator('.pkpFormField').evaluateAll((els) => els.map((e) => ({
    label: (e.querySelector('.pkpFormFieldLabel') || e.querySelector('label') || {innerText: ''}).innerText.trim().replace(/\s+/g, ' '),
    kind: e.className.replace(/\s+/g, ' '),
}))).catch(() => []);

/** Type into a FieldRichText (a TinyMCE iframe) inside the dialog: `highlight-<name>-control-<locale>`. */
async function typeRich(page, dlg, fieldName, text, locale = 'en') {
    const iframe = dlg.locator(`.pkpFormField:has(#highlight-${fieldName}-control-${locale}) iframe`).first();
    await iframe.waitFor({state: 'attached', timeout: 15000});
    const body = iframe.contentFrame().locator('body');
    await body.waitFor({state: 'visible', timeout: 15000});
    await body.click(); await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A'); await page.keyboard.press('Delete');
    await body.pressSequentially(text);
    return 'iframe';
}

/**
 * Add a highlight through the screen: "Add Highlight" › Title, URL, Button
 * Label (and a PNG when `image` is given) › Save. Returns what happened.
 */
async function addHighlight(page, {title, url, urlText, image, snapName}) {
    const out = {title};
    await highlightsPanel(page).getByRole('button', {name: 'Add Highlight'}).click();
    const dlg = page.getByRole('dialog', {name: /Add Highlight/}).first();
    await dlg.waitFor({state: 'visible', timeout: 15000});
    await idle(page);
    await dlg.getByRole('textbox', {name: /^URL/}).waitFor({state: 'visible', timeout: 15000});
    out.fields = await dlgFields(dlg);
    out.titleEditor = await typeRich(page, dlg, 'title', title);
    await dlg.getByRole('textbox', {name: /^URL/}).fill(url);
    await dlg.getByRole('textbox', {name: /^Button Label/}).fill(urlText);
    if (image) {
        const input = dlg.locator('input[type="file"]').first();
        await input.setInputFiles(image);
        await dlg.locator('.pkpFormField--uploadImage__preview, img[src^="blob:"], img[src*="temporaryFiles"], .pkpFormField--uploadImage__thumbnail').first().waitFor({state: 'visible', timeout: 20000}).catch(() => {});
        await dlg.getByRole('textbox', {name: /Alternate text/}).fill(`alt ${title}`).catch(() => {});
        await idle(page);
    }
    if (snapName) await snap(page, snapName);
    const saved = page.waitForResponse((r) => /\/api\/v1\/highlights/.test(r.url()) && r.request().method() === 'POST', {timeout: 30000}).catch(() => null);
    await dlg.getByRole('button', {name: 'Save', exact: true}).click();
    const resp = await saved;
    out.save = resp ? {status: resp.status(), body: await resp.json().catch(() => null)} : null;
    try { await dlg.waitFor({state: 'hidden', timeout: 15000}); out.closed = true; } catch { out.closed = false; out.dialogText = flat(await dlg.innerText().catch(() => ''), 800); }
    await idle(page);
    return out;
}

/** Delete a highlight row by title through "Delete" › "Yes". */
async function deleteHighlight(page, title) {
    const row = highlightsPanel(page).locator('.listPanel__item').filter({hasText: title}).first();
    await row.getByRole('button', {name: 'Delete'}).click();
    const dlg = page.getByRole('dialog').filter({hasText: /Delete Highlight/}).first();
    await dlg.waitFor({state: 'visible', timeout: 10000});
    const text = flat(await dlg.innerText().catch(() => ''), 400);
    const gone = page.waitForResponse((r) => /\/api\/v1\/highlights\/\d+/.test(r.url()) && (r.request().method() === 'DELETE' || r.request().headers()['x-http-method-override'] === 'DELETE'), {timeout: 20000}).catch(() => null);
    await dlg.getByRole('button', {name: 'Yes'}).click();
    const resp = await gone;
    await idle(page);
    return {text, status: resp ? resp.status() : null};
}

/** The header's tasks and notifications counters, as the signed-in user sees them. */
async function headerCounts(page) {
    return page.evaluate(() => {
        const q = (sel) => [...document.querySelectorAll(sel)].map((e) => e.innerText.trim().replace(/\s+/g, ' ')).filter(Boolean);
        return {
            tasks: q('.app__headerAction--tasks, [class*="tasks"] .pkpBadge, .app__tasksCount, .app__headerActionTasks'),
            notifications: q('.app__notifications .pkpBadge, .app__notificationsCount'),
            headerButtons: [...document.querySelectorAll('header button, .app__header button')].map((b) => (b.getAttribute('aria-label') || b.innerText).trim().replace(/\s+/g, ' ')).filter(Boolean),
        };
    }).catch(() => null);
}

async function phasesSiteTab(app) {
    const scratch = scratchAll[app.name] || {};
    const siteSettings = app.url('/index.php/index/admin/settings');
    const siteHome = app.url('/index.php/index');
    const T = scratch.tag;

    // ---------------------------------------------------------------------
    if (phase('sitetab')) {
        const {page, close} = await launch(app);
        try {
            log(`\n== ${app.name} sitetab ==`);
            await signIn(page, 'admin');
            await page.goto(siteSettings); await idle(page);
            await snap(page, 'sitetab-site-settings');
            log('site settings tabs (2 journals):', JSON.stringify(await allTabNames(page)));
            const ctxs = await apiGet(page, app.url('/index.php/index/api/v1/contexts?count=100'));
            log('contexts:', JSON.stringify((ctxs.body && ctxs.body.items || []).map((c) => c.urlPath)));
            const found = await openHighlightsTab(page, siteSettings);
            log('site Highlights tab found:', found, '| url', page.url());
            const s = await snap(page, 'sitetab-highlights');
            log('panel header buttons:', JSON.stringify(await headerButtons(page)), '| rows:', JSON.stringify(await panelRows(page)));
            log('panel text:', flat(await highlightsPanel(page).innerText().catch(() => ''), 600));
            await loc(page, 'the site Highlights side tab', page.getByRole('tab', {name: 'Highlights', exact: true}));
            await loc(page, 'the highlights list panel', highlightsPanel(page));
            // the list request the panel sends (from the run record), and the same address from the session
            const api = await apiGet(page, app.url('/index.php/index/api/v1/highlights?count=100'));
            log('site highlights API (admin, 2 journals):', api.status, flat(JSON.stringify(api.body), 300));
            record('sitetab-site-highlights-api', api);
            // add three site highlights through the screen (records what a refused save shows)
            const titles = [`Site one ${T}`, `Site two ${T}`, `Site three ${T}`];
            let siteAddOk = true;
            for (const [i, t] of titles.entries()) {
                const r = await addHighlight(page, {title: t, url: `https://example.org/site${i + 1}`, urlText: `Go ${i + 1}`, snapName: i === 0 ? 'sitetab-add-dialog' : null});
                log(`add ${t}:`, JSON.stringify({save: r.save && r.save.status, body: r.save && r.save.body, closed: r.closed, fields: r.fields.map((f) => f.label)}));
                if (i === 0) record('sitetab-add-first', r);
                if (!r.closed) {
                    siteAddOk = false;
                    const s2 = await snap(page, 'sitetab-add-refused');
                    log('after the refused save: dialogs', s2.aria.dialogs.length, '| last dialog text:', flat(s2.text.dialog, 500));
                    // close whatever is on top (an error dialog, then the window)
                    for (let k = 0; k < 3; k++) {
                        const top = page.locator('[role="dialog"]:visible').last();
                        if (!(await top.count())) break;
                        const btn = top.getByRole('button', {name: /^(OK|Close|Cancel)$/}).last();
                        if (!(await btn.count())) break;
                        const n = await btn.innerText().catch(() => '');
                        await btn.click().catch(() => {}); await idle(page);
                        log(`closed a dialog with "${n}"; dialogs open:`, await page.locator('[role="dialog"]:visible').count());
                    }
                    break;
                }
            }
            scratch.siteTitles = siteAddOk ? titles : []; saveScratch();
            await snap(page, 'sitetab-highlights-after-adds');
            log('rows after the adds:', JSON.stringify((await panelRows(page)).map((r) => r.text)));
            // ordering on the site's list (the same panel, driven on both screens; on an empty list when no add succeeded)
            await highlightsPanel(page).getByRole('button', {name: 'Order', exact: true}).click(); await idle(page);
            await snap(page, 'sitetab-ordering');
            log('ordering header buttons:', JSON.stringify(await headerButtons(page)));
            log('ordering rows:', JSON.stringify(await panelRows(page)));
            if (siteAddOk) { await page.getByRole('button', {name: `Increase position of ${titles[2]}`}).click(); await idle(page); log('after 3rd up once:', JSON.stringify((await panelRows(page)).map((r) => r.text))); }
            const put = page.waitForResponse((r) => /highlights\/order/.test(r.url()), {timeout: 20000}).catch(() => null);
            await highlightsPanel(page).getByRole('button', {name: 'Save Order', exact: true}).click();
            const putResp = await put; await idle(page);
            log('Save Order response:', putResp ? putResp.status() : null, putResp ? putResp.request().method() : '', putResp ? JSON.stringify(putResp.request().headers()['x-http-method-override'] || '') : '');
            const s3 = await snap(page, 'sitetab-after-save-order');
            log('after Save Order: dialogs', s3.aria.dialogs.length, '| dialog text:', flat(s3.text.dialog, 400), '| header buttons:', JSON.stringify(await headerButtons(page)));
            for (let k = 0; k < 2; k++) { const top = page.locator('[role="dialog"]:visible').last(); if (!(await top.count())) break; await top.getByRole('button', {name: /^(OK|Close|Cancel)$/}).last().click().catch(() => {}); await idle(page); }
            if (await highlightsPanel(page).getByRole('button', {name: 'Cancel', exact: true}).isVisible().catch(() => false)) { await highlightsPanel(page).getByRole('button', {name: 'Cancel', exact: true}).click(); await idle(page); }
            scratch.siteOrder = (await panelRows(page)).map((r) => r.text); saveScratch();
            // leave the tab with the Add window open and something typed (the way-out sweep)
            await highlightsPanel(page).getByRole('button', {name: 'Add Highlight'}).click();
            const dlg = page.getByRole('dialog', {name: /Add Highlight/}).first();
            await dlg.waitFor({state: 'visible', timeout: 15000}); await idle(page);
            await dlg.getByRole('textbox', {name: /^URL/}).fill('https://example.org/unsaved');
            page.once('dialog', (d) => { log('browser dialog on the way out:', d.type(), d.message()); d.dismiss().catch(() => {}); });
            await page.getByRole('tab', {name: 'Languages', exact: true}).first().click().catch((e) => log('tab click while window open:', String(e).split('\n')[0]));
            await idle(page);
            await snap(page, 'sitetab-wayout-tab-switch');
            log('after tab switch with window open: dialogs open', await page.locator('[role="dialog"]:visible').count(), '| url', page.url());
            // close the window if still open
            const closeBtn = dlg.getByRole('button', {name: /^(Close|Cancel)$/}).first();
            if (await dlg.isVisible().catch(() => false)) {
                await closeBtn.click().catch(() => {});
                await idle(page);
                log('after Close: dialogs open', await page.locator('[role="dialog"]:visible').count());
                const confirm = page.getByRole('dialog').filter({hasText: /unsaved|Are you sure/i}).first();
                if (await confirm.isVisible().catch(() => false)) { log('close confirm:', flat(await confirm.innerText(), 300)); await snap(page, 'sitetab-wayout-close-confirm'); await confirm.getByRole('button').last().click().catch(() => {}); }
            }
            // navigate away with the window open again (a full navigation)
            await highlightsPanel(page).getByRole('button', {name: 'Add Highlight'}).click().catch(() => {});
            await page.getByRole('dialog', {name: /Add Highlight/}).first().getByRole('textbox', {name: /^URL/}).fill('https://example.org/unsaved2').catch(() => {});
            page.once('dialog', (d) => { log('browser dialog on navigation away:', d.type(), d.message()); d.dismiss().catch(() => {}); });
            await page.goto(siteHome); await idle(page);
            log('navigated away to', page.url());
            await signOut(page);
            // Rule 13: the site's home page signed out
            await page.goto(siteHome); await idle(page);
            const h = await snap(page, 'sitetab-site-home-signedout');
            log('site home (signed out):', h.url, '| title', h.title, '| carousel titles', JSON.stringify(await carouselTitles(page)));
            const order = await page.evaluate(() => {
                const top = document.querySelector('.pkp_structure_main, main, #main') || document.body;
                return [...top.children].map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join('.')}`).slice(0, 12);
            });
            log('site home main children:', JSON.stringify(order));
            log('journal list on site home:', JSON.stringify(await page.locator('.journals .media-heading, .journals h3, .presses h3, .servers h3, .obj_journal .title, .obj_press .title, .obj_server .title').allInnerTexts().catch(() => [])));
            await loc(page, 'the site home carousel', page.locator('.highlights'));
            // Rule 1 controls: publicknowledge home and the scratch journal's home
            await page.goto(app.url(`/index.php/${app.contextPath}`)); await idle(page);
            await snap(page, 'sitetab-publicknowledge-home');
            log('publicknowledge carousel titles:', JSON.stringify(await carouselTitles(page)), '| blocks', await page.locator('.highlights').count());
            await page.goto(app.url(`/index.php/${scratch.path}`)); await idle(page);
            await snap(page, 'sitetab-scratch-home');
            log('scratch journal carousel titles:', JSON.stringify(await carouselTitles(page)), '| blocks', await page.locator('.highlights').count());
        } finally { await close(); }
    }
}

// ---------------------------------------------------------------------------
// Journal scope: ordering, live at once, side effects, scope, the image file,
// the deletion cascade.

const {execSync} = require('child_process');
const PNG = path.join(REPO, 'apps/ojs/playwright/fixtures/files/profile-image-400.png');
const listHighlightFiles = (app) => {
    try { return execSync(`find ${path.join(app.root, 'public')} -path '*highlights*' -type f`, {encoding: 'utf8'}).trim().split('\n').filter(Boolean).map((f) => path.relative(app.root, f)); } catch { return []; }
};
const psql = (app, sql) => { try { return execSync(`psql ${dbName(app.name)} -At -c "${sql.replace(/"/g, '\\"')}"`, {encoding: 'utf8'}).trim(); } catch (e) { return `psql failed: ${String(e.message).split('\n')[0]}`; } };
const logLines = (app) => { try { return execSync(`cat ${path.join(REPO, 'checkouts/files', `${app.name}-test`, 'logs')}/*.log 2>/dev/null | wc -l`, {encoding: 'utf8'}).trim(); } catch { return '?'; } };

async function openJournalHighlights(page, app, ctxPath) {
    return openHighlightsTab(page, app.url(`/index.php/${ctxPath}/management/settings/website`));
}

/** The order of rows as the panel's own list request returns it (the request the panel sends after Save Order / Delete). */
async function panelListReplay(page, app, ctxPath) {
    const r = await apiGet(page, app.url(`/index.php/${ctxPath}/api/v1/highlights?count=100`));
    return {status: r.status, items: (r.body && r.body.items || []).map((i) => ({id: i.id, seq: i.sequence, title: (i.title && (i.title.en || Object.values(i.title)[0])) || '', contextId: i.contextId}))};
}

async function phasesJournal(app) {
    const scratch = scratchAll[app.name] || {};
    const T = scratch.tag; const P = scratch.path;
    const mgr = `${T}mgr`; const sec = `${T}sec`; const rdr = `${T}rdr`;
    const journalHome = app.url(`/index.php/${P}`);
    const mailBefore = async () => app.mail.messageCount().catch((e) => `mail? ${String(e.message).slice(0, 80)}`);

    // ---------------------------------------------------------------------
    if (phase('order')) {
        const {page, close} = await launch(app);
        try {
            log(`\n== ${app.name} order ==`);
            await signIn(page, mgr, {contextPath: P});
            const found = await openJournalHighlights(page, app, P);
            log('journal Highlights tab found:', found, '| tabs', JSON.stringify(await tabNames(page)));
            const s0 = await snap(page, 'order-empty-list');
            log('empty list header buttons:', JSON.stringify(await headerButtons(page)), '| panel text:', flat(await highlightsPanel(page).innerText().catch(() => ''), 300));
            // ordering mode on an empty list (the other end of "three highlights")
            await highlightsPanel(page).getByRole('button', {name: 'Order', exact: true}).click(); await idle(page);
            await snap(page, 'order-empty-ordering');
            log('empty ordering header buttons:', JSON.stringify(await headerButtons(page)));
            const put0 = page.waitForResponse((r) => /highlights\/order/.test(r.url()), {timeout: 20000}).catch(() => null);
            await highlightsPanel(page).getByRole('button', {name: 'Save Order', exact: true}).click();
            const put0r = await put0; await idle(page);
            const se = await snap(page, 'order-empty-save-order');
            log('empty Save Order:', put0r ? put0r.status() : null, '| body:', put0r ? flat(await put0r.text().catch(() => ''), 200) : '', '| dialogs', se.aria.dialogs.length, '| dialog text:', flat(se.text.dialog, 300));
            for (let k = 0; k < 2; k++) { const top = page.locator('[role="dialog"]:visible').last(); if (!(await top.count())) break; await top.getByRole('button', {name: /^(OK|Close|Cancel)$/}).last().click().catch(() => {}); await idle(page); }
            log('header buttons after the error is closed:', JSON.stringify(await headerButtons(page)));
            if (await highlightsPanel(page).getByRole('button', {name: 'Cancel', exact: true}).isVisible().catch(() => false)) { await highlightsPanel(page).getByRole('button', {name: 'Cancel', exact: true}).click(); await idle(page); }
            // three highlights
            const titles = [`Alpha ${T}`, `Bravo ${T}`, `Charlie ${T}`];
            for (const [i, t] of titles.entries()) {
                const r = await addHighlight(page, {title: t, url: `https://example.org/${i + 1}`, urlText: `Read ${i + 1}`, snapName: i === 0 ? 'order-add-dialog' : null});
                log(`add ${t}:`, JSON.stringify({save: r.save && r.save.status, closed: r.closed, fields: r.fields.map((f) => f.label)}));
                if (i === 0) record('order-add-first', r);
            }
            scratch.titles = titles; saveScratch();
            await snap(page, 'order-three');
            log('rows:', JSON.stringify((await panelRows(page)).map((r) => r.text)));
            log('list replay:', JSON.stringify(await panelListReplay(page, app, P)));
            // one row: ordering mode with a single row (the arrows on one row)
            // (driven on the site list when it has rows; here the three-row default)
            await highlightsPanel(page).getByRole('button', {name: 'Order', exact: true}).click(); await idle(page);
            const s1 = await snap(page, 'order-ordering');
            log('ordering header buttons:', JSON.stringify(await headerButtons(page)));
            log('ordering rows:', JSON.stringify(await panelRows(page)));
            log('drag handle visible?', await page.locator('.orderer__dragDrop:visible').count(), '| arrows:', await page.locator('.orderer__up:visible').count(), await page.locator('.orderer__down:visible').count());
            await loc(page, 'the Save Order button', highlightsPanel(page).getByRole('button', {name: 'Save Order', exact: true}));
            await loc(page, 'the ordering Cancel button', highlightsPanel(page).getByRole('button', {name: 'Cancel', exact: true}));
            await loc(page, 'the first row up arrow', page.getByRole('button', {name: `Increase position of ${titles[0]}`}));
            // first row up: nothing; last row down: nothing
            await page.getByRole('button', {name: `Increase position of ${titles[0]}`}).click(); await idle(page);
            log('after first-row up:', JSON.stringify((await panelRows(page)).map((r) => r.text)));
            await page.getByRole('button', {name: `Decrease position of ${titles[2]}`}).click(); await idle(page);
            log('after last-row down:', JSON.stringify((await panelRows(page)).map((r) => r.text)));
            // third row up once, then Cancel (A1)
            await page.getByRole('button', {name: `Increase position of ${titles[2]}`}).click(); await idle(page);
            log('after third-row up once:', JSON.stringify((await panelRows(page)).map((r) => r.text)));
            await snap(page, 'order-moved-before-cancel');
            await highlightsPanel(page).getByRole('button', {name: 'Cancel', exact: true}).click(); await idle(page);
            const sc = await snap(page, 'order-after-cancel');
            log('after Cancel: header buttons', JSON.stringify(await headerButtons(page)), '| rows', JSON.stringify((await panelRows(page)).map((r) => r.text)), '| status text:', flat(await page.locator('[role="status"]').allInnerTexts().then((a) => a.join(' / ')).catch(() => ''), 200));
            const replayAfterCancel = await panelListReplay(page, app, P);
            log('list replay after Cancel (saved order):', JSON.stringify(replayAfterCancel.items.map((i) => `${i.seq}:${i.title}`)));
            // the home page after Cancel
            const p2 = await page.context().newPage();
            await p2.goto(journalHome); await idle(p2);
            log('home after Cancel (same session):', JSON.stringify(await carouselTitles(p2)));
            await p2.close();
            // reload the tab
            await openJournalHighlights(page, app, P);
            await snap(page, 'order-after-reload');
            log('after reload:', JSON.stringify((await panelRows(page)).map((r) => r.text)));
            // Order, third to the top, Save Order
            await highlightsPanel(page).getByRole('button', {name: 'Order', exact: true}).click(); await idle(page);
            await page.getByRole('button', {name: `Increase position of ${titles[2]}`}).click(); await idle(page);
            await page.getByRole('button', {name: `Increase position of ${titles[2]}`}).click(); await idle(page);
            log('third moved to top:', JSON.stringify((await panelRows(page)).map((r) => r.text)));
            const put = page.waitForResponse((r) => /highlights\/order/.test(r.url()), {timeout: 20000}).catch(() => null);
            await highlightsPanel(page).getByRole('button', {name: 'Save Order', exact: true}).click();
            const putResp = await put; await idle(page);
            log('Save Order:', putResp ? putResp.status() : null, '| override', putResp ? (putResp.request().headers()['x-http-method-override'] || putResp.request().method()) : '');
            const ss = await snap(page, 'order-after-save');
            log('after Save Order: header buttons', JSON.stringify(await headerButtons(page)), '| rows', JSON.stringify((await panelRows(page)).map((r) => r.text)), '| status text:', flat(await page.locator('[role="status"]').allInnerTexts().then((a) => a.join(' / ')).catch(() => ''), 200));
            log('list replay after save:', JSON.stringify((await panelListReplay(page, app, P)).items.map((i) => `${i.seq}:${i.title}`)));
            // the home page follows
            const p3 = await page.context().newPage();
            await p3.goto(journalHome); await idle(p3);
            record('order-home-after-save', await screen(p3)); await shot(p3, 'order-home-after-save');
            log('home after Save Order:', JSON.stringify(await carouselTitles(p3)));
            await p3.close();
            // a fourth highlight lands last (Rule 7 tail)
            const r4 = await addHighlight(page, {title: `Delta ${T}`, url: 'https://example.org/4', urlText: 'Read 4'});
            log('add Delta:', r4.save && r4.save.status, r4.closed, '| rows', JSON.stringify((await panelRows(page)).map((r) => r.text)));
            log('list replay with Delta:', JSON.stringify((await panelListReplay(page, app, P)).items.map((i) => `${i.seq}:${i.title}`)));
            await snap(page, 'order-four');
            // a fourth row moved up then the list left with the ordering unsaved, via a tab switch (the way-out sweep)
            await highlightsPanel(page).getByRole('button', {name: 'Order', exact: true}).click(); await idle(page);
            await page.getByRole('button', {name: `Increase position of Delta ${T}`}).click(); await idle(page);
            page.once('dialog', (d) => { log('browser dialog on tab switch in ordering mode:', d.type(), d.message()); d.dismiss().catch(() => {}); });
            await page.getByRole('tab', {name: 'Announcements', exact: true}).first().click().catch((e) => log('tab switch failed:', String(e).split('\n')[0]));
            await idle(page);
            await snap(page, 'order-wayout-tab-switch');
            await page.getByRole('tab', {name: 'Highlights', exact: true}).click(); await idle(page);
            log('back on Highlights after the switch: header buttons', JSON.stringify(await headerButtons(page)), '| rows', JSON.stringify((await panelRows(page)).map((r) => r.text)));
            log('list replay after the switch:', JSON.stringify((await panelListReplay(page, app, P)).items.map((i) => `${i.seq}:${i.title}`)));
            if (await highlightsPanel(page).getByRole('button', {name: 'Cancel', exact: true}).isVisible().catch(() => false)) { await highlightsPanel(page).getByRole('button', {name: 'Cancel', exact: true}).click(); await idle(page); }
            // ordering mode left by a full navigation with a move unsaved
            await highlightsPanel(page).getByRole('button', {name: 'Order', exact: true}).click(); await idle(page);
            await page.getByRole('button', {name: `Increase position of Delta ${T}`}).click(); await idle(page);
            page.once('dialog', (d) => { log('browser dialog on navigation in ordering mode:', d.type(), d.message()); d.dismiss().catch(() => {}); });
            await page.goto(journalHome); await idle(page);
            log('navigated away in ordering mode; home order:', JSON.stringify(await carouselTitles(page)));
        } finally { await close(); }
    }

    // ---------------------------------------------------------------------
    if (phase('live')) {
        const {page, close} = await launch(app);
        const {page: outside, close: closeOutside} = await launch(app); // a signed-out visitor
        try {
            log(`\n== ${app.name} live ==`);
            const m0 = await mailBefore(); const l0 = logLines(app);
            await signIn(page, mgr, {contextPath: P});
            await page.goto(app.url(`/index.php/${P}/dashboard/editorial`)).catch(() => {}); await idle(page);
            const hc0 = await headerCounts(page);
            log('manager header before:', JSON.stringify(hc0), '| mail', m0, '| log lines', l0);
            await openJournalHighlights(page, app, P);
            const r = await addHighlight(page, {title: `Echo ${T}`, url: 'https://example.org/echo', urlText: 'Read Echo'});
            log('add Echo:', r.save && r.save.status, r.closed);
            // the same instant: a signed-out visitor
            await outside.goto(journalHome); await idle(outside);
            record('live-home-signedout', await screen(outside)); await shot(outside, 'live-home-signedout');
            log('signed-out home right after the save:', JSON.stringify(await carouselTitles(outside)));
            // edit it
            const row = highlightsPanel(page).locator('.listPanel__item').filter({hasText: `Echo ${T}`}).first();
            await row.getByRole('button', {name: 'Edit'}).click();
            const dlg = page.getByRole('dialog', {name: /Edit Highlight/}).first();
            await dlg.waitFor({state: 'visible', timeout: 15000}); await idle(page);
            await dlg.getByRole('textbox', {name: /^Button Label/}).waitFor({state: 'visible', timeout: 15000});
            await snap(page, 'live-edit-dialog');
            log('edit window fields:', JSON.stringify((await dlgFields(dlg)).map((f) => f.label)), '| buttons:', JSON.stringify(await dlg.getByRole('button').allInnerTexts().catch(() => [])));
            await dlg.getByRole('textbox', {name: /^Button Label/}).fill('Read Echo edited');
            const putE = page.waitForResponse((rr) => /api\/v1\/highlights\/\d+/.test(rr.url()) && rr.request().method() === 'POST', {timeout: 20000}).catch(() => null);
            await dlg.getByRole('button', {name: 'Save', exact: true}).click();
            const pe = await putE; await idle(page);
            log('edit save:', pe ? pe.status() : null, pe ? (pe.request().headers()['x-http-method-override'] || '') : '');
            await dlg.waitFor({state: 'hidden', timeout: 15000}).catch(() => log('edit window still open'));
            await outside.goto(journalHome); await idle(outside);
            log('signed-out home after the edit, buttons:', JSON.stringify(await outside.locator('.highlights .swiper-slide-button').allInnerTexts().catch(() => [])));
            // reader and section editor see the same
            for (const [who, u] of [['reader', rdr], ['section editor', sec]]) {
                await signIn(outside, u, {contextPath: P});
                await outside.goto(journalHome); await idle(outside);
                record(`live-home-${who.replace(' ', '-')}`, await screen(outside));
                log(`${who} home:`, JSON.stringify(await carouselTitles(outside)));
            }
            await signOut(outside);
            // reorder and delete, then the side effects
            await highlightsPanel(page).getByRole('button', {name: 'Order', exact: true}).click(); await idle(page);
            await page.getByRole('button', {name: `Increase position of Echo ${T}`}).click(); await idle(page);
            await highlightsPanel(page).getByRole('button', {name: 'Save Order', exact: true}).click(); await idle(page);
            const d = await deleteHighlight(page, `Echo ${T}`);
            log('delete Echo:', JSON.stringify(d));
            await snap(page, 'live-after-delete');
            await outside.goto(journalHome); await idle(outside);
            log('signed-out home after the delete:', JSON.stringify(await carouselTitles(outside)));
            await page.goto(app.url(`/index.php/${P}/dashboard/editorial`)).catch(() => {}); await idle(page);
            const hc1 = await headerCounts(page);
            await page.locator('button:has-text("Tasks")').first().click().catch(() => {}); await idle(page);
            const st = await snap(page, 'live-tasks-window');
            log('manager header after:', JSON.stringify(hc1), '| tasks window:', flat(st.text.dialog, 300), '| mail', await mailBefore(), '(before', m0, ') | log lines', logLines(app), '(before', l0, ')');
            const n = await page.locator('.app__notifications, [class*="notification"]').first().innerText().catch(() => null);
            log('notifications area:', flat(n, 200));
        } finally { await close(); await closeOutside(); }
    }

    // ---------------------------------------------------------------------
    if (phase('scope')) {
        const {page, close} = await launch(app);
        try {
            log(`\n== ${app.name} scope ==`);
            // a second scratch journal B with its own highlight (also the cascade's subject)
            if (!scratch.b) {
                const tb = tag('u11k2b');
                const created = await app.api.createContext({tag: tb, context: {name: `K2 B ${app.name} ${tb}`}, users: [{username: `${tb}mgr`, roles: ['manager'], givenName: 'Bea', familyName: 'ManagerB'}]});
                scratch.b = {tag: tb, path: created.path, contextId: created.contextId}; saveScratch();
                log('scratch B:', JSON.stringify(scratch.b));
            }
            const B = scratch.b;
            await signIn(page, `${B.tag}mgr`, {contextPath: B.path});
            await openJournalHighlights(page, app, B.path);
            await snap(page, 'scope-b-empty');
            log('B list before:', JSON.stringify((await panelRows(page)).map((r) => r.text)));
            const filesBefore = listHighlightFiles(app);
            const r = await addHighlight(page, {title: `Bravo-B ${B.tag}`, url: 'https://example.org/b', urlText: 'Read B', image: PNG, snapName: 'scope-b-add-with-image'});
            log('add B with image:', r.save && r.save.status, r.closed, '| image in response:', JSON.stringify(r.save && r.save.body && r.save.body.image));
            record('scope-b-add', r);
            scratch.bHighlight = r.save && r.save.body && r.save.body.id; saveScratch();
            const filesAfter = listHighlightFiles(app);
            log('highlight files before:', JSON.stringify(filesBefore), '| after:', JSON.stringify(filesAfter));
            await snap(page, 'scope-b-list');
            log('B list:', JSON.stringify((await panelRows(page)).map((r) => r.text)), '| replay', JSON.stringify(await panelListReplay(page, app, B.path)));
            // B's home: image element
            await page.goto(app.url(`/index.php/${B.path}`)); await idle(page);
            await snap(page, 'scope-b-home');
            const img = await page.locator('.highlights img').evaluateAll((els) => els.map((e) => ({src: e.getAttribute('src'), alt: e.getAttribute('alt'), loaded: e.complete && e.naturalWidth > 0}))).catch(() => []);
            log('B home carousel:', JSON.stringify(await carouselTitles(page)), '| img', JSON.stringify(img));
            // A's list and home never show B's; publicknowledge's home shows neither
            await signIn(page, mgr, {contextPath: P});
            await openJournalHighlights(page, app, P);
            await snap(page, 'scope-a-list');
            log('A list:', JSON.stringify((await panelRows(page)).map((r) => r.text)), '| replay', JSON.stringify((await panelListReplay(page, app, P)).items.map((i) => `${i.contextId}:${i.title}`)));
            await page.goto(journalHome); await idle(page);
            log('A home:', JSON.stringify(await carouselTitles(page)));
            await signOut(page);
            await page.goto(app.url(`/index.php/${app.contextPath}`)); await idle(page);
            await snap(page, 'scope-publicknowledge-home');
            log('publicknowledge home carousel blocks:', await page.locator('.highlights').count(), JSON.stringify(await carouselTitles(page)));
            await page.goto(app.url('/index.php/index')); await idle(page);
            await snap(page, 'scope-site-home');
            log('site home carousel blocks:', await page.locator('.highlights').count(), '| url', page.url());
            // the manager typing the site settings address (control for the site tab's audience)
            await signIn(page, mgr, {contextPath: P});
            await page.goto(app.url('/index.php/index/admin/settings')); await idle(page);
            const sm = await snap(page, 'scope-manager-site-settings');
            log('manager at the site settings address:', sm.url, '|', flat(sm.text.main, 200));
        } finally { await close(); }
    }

    // ---------------------------------------------------------------------
    if (phase('image')) {
        const {page, close} = await launch(app);
        try {
            log(`\n== ${app.name} image ==`);
            await signIn(page, mgr, {contextPath: P});
            await openJournalHighlights(page, app, P);
            const f0 = listHighlightFiles(app);
            const r = await addHighlight(page, {title: `Foxtrot ${T}`, url: 'https://example.org/f', urlText: 'Read F', image: PNG});
            log('add Foxtrot with image:', r.save && r.save.status, r.closed, '| image:', JSON.stringify(r.save && r.save.body && r.save.body.image));
            const f1 = listHighlightFiles(app);
            log('files before:', JSON.stringify(f0), '| after add:', JSON.stringify(f1));
            const row = () => highlightsPanel(page).locator('.listPanel__item').filter({hasText: `Foxtrot ${T}`}).first();
            // replace the image on an edit
            await row().getByRole('button', {name: 'Edit'}).click();
            let dlg = page.getByRole('dialog', {name: /Edit Highlight/}).first();
            await dlg.waitFor({state: 'visible', timeout: 15000}); await idle(page);
            await dlg.getByRole('textbox', {name: /^Button Label/}).waitFor({state: 'visible', timeout: 15000});
            await snap(page, 'image-edit-with-image');
            log('edit window image controls:', JSON.stringify(await dlg.locator('.pkpFormField--uploadImage button, .pkpFormField--uploadImage input').evaluateAll((els) => els.map((e) => e.innerText.trim() || e.type)).catch(() => [])));
            await dlg.locator('input[type="file"]').first().setInputFiles(path.join(REPO, 'apps/ops/playwright/fixtures/files/profile-image-400.png'));
            await idle(page); await page.waitForTimeout(1500);
            await snap(page, 'image-edit-replaced-preview');
            await dlg.getByRole('button', {name: 'Save', exact: true}).click(); await idle(page);
            await dlg.waitFor({state: 'hidden', timeout: 15000}).catch(() => log('edit window still open after replace'));
            const f2 = listHighlightFiles(app);
            log('files after replace:', JSON.stringify(f2), '| replay image:', JSON.stringify((await apiGet(page, app.url(`/index.php/${P}/api/v1/highlights?count=100`))).body.items.filter((i) => /Foxtrot/.test(JSON.stringify(i.title))).map((i) => i.image)));
            // remove the image on an edit
            await row().getByRole('button', {name: 'Edit'}).click();
            dlg = page.getByRole('dialog', {name: /Edit Highlight/}).first();
            await dlg.waitFor({state: 'visible', timeout: 15000}); await idle(page);
            await dlg.getByRole('textbox', {name: /^Button Label/}).waitFor({state: 'visible', timeout: 15000});
            const remove = dlg.getByRole('button', {name: 'Remove', exact: true});
            log('Remove present:', await remove.count());
            await remove.first().click(); await idle(page);
            await snap(page, 'image-edit-removed');
            log('after Remove, image controls:', JSON.stringify(await dlg.locator('.pkpFormField--uploadImage button').allInnerTexts().catch(() => [])));
            await dlg.getByRole('button', {name: 'Save', exact: true}).click(); await idle(page);
            await dlg.waitFor({state: 'hidden', timeout: 15000}).catch(() => log('edit window still open after remove'));
            const f3 = listHighlightFiles(app);
            log('files after remove:', JSON.stringify(f3));
            // an image again, then delete the highlight
            await row().getByRole('button', {name: 'Edit'}).click();
            dlg = page.getByRole('dialog', {name: /Edit Highlight/}).first();
            await dlg.waitFor({state: 'visible', timeout: 15000}); await idle(page);
            await dlg.getByRole('textbox', {name: /^Button Label/}).waitFor({state: 'visible', timeout: 15000});
            await dlg.locator('input[type="file"]').first().setInputFiles(PNG); await idle(page); await page.waitForTimeout(1500);
            await dlg.getByRole('button', {name: 'Save', exact: true}).click(); await idle(page);
            await dlg.waitFor({state: 'hidden', timeout: 15000}).catch(() => {});
            const f4 = listHighlightFiles(app);
            log('files after re-add:', JSON.stringify(f4));
            const d = await deleteHighlight(page, `Foxtrot ${T}`);
            log('delete Foxtrot:', JSON.stringify(d), '| files after delete:', JSON.stringify(listHighlightFiles(app)));
        } finally { await close(); }
    }

    // ---------------------------------------------------------------------
    if (phase('cascade')) {
        const {page, close} = await launch(app);
        try {
            log(`\n== ${app.name} cascade ==`);
            const B = scratch.b;
            const f0 = listHighlightFiles(app);
            const rows0 = psql(app, `select context_id, count(*) from highlights group by context_id order by context_id`);
            log('before: files', JSON.stringify(f0), '| highlights per context:', rows0.replace(/\n/g, '; '));
            await signIn(page, 'admin');
            await page.goto(app.url('/index.php/index/admin/contexts')); await idle(page);
            await snap(page, 'cascade-hosted-list');
            const row = page.locator('tr.gridRow').filter({hasText: `K2 B ${app.name}`}).first();
            log('B row found:', await row.count());
            await row.locator('a.show_extras').click(); await idle(page);
            const controls = row.locator('xpath=following-sibling::tr[1]');
            log('row controls:', JSON.stringify(await controls.getByRole('link').allInnerTexts().catch(() => [])));
            await controls.getByRole('link', {name: /Remove|Delete/}).first().click();
            const confirm = page.locator('[role="dialog"]:visible, [data-cy="dialog"]:visible').last();
            await confirm.waitFor({state: 'visible', timeout: 10000});
            const ct = flat(await confirm.innerText().catch(() => ''), 400);
            log('confirm dialog:', ct, '| buttons:', JSON.stringify(await confirm.getByRole('button').allInnerTexts().catch(() => [])));
            await snap(page, 'cascade-confirm');
            await confirm.getByRole('button', {name: /^(OK|Yes|Confirm)$/}).first().click(); await idle(page);
            await page.waitForTimeout(3000); await idle(page);
            await snap(page, 'cascade-after-delete');
            log('hosted rows after:', JSON.stringify(await page.locator('tr.gridRow').allInnerTexts().then((a) => a.map((t) => flat(t, 80))).catch(() => [])));
            const f1 = listHighlightFiles(app);
            const rows1 = psql(app, `select context_id, count(*) from highlights group by context_id order by context_id`);
            log('after: files', JSON.stringify(f1), '| highlights per context:', rows1.replace(/\n/g, '; '));
            // B's home is gone; A's list intact
            await page.goto(app.url(`/index.php/${B.path}`)); await idle(page);
            log('B home after delete:', page.url(), '|', flat(await page.locator('body').innerText().catch(() => ''), 120));
            await signIn(page, mgr, {contextPath: P});
            await openJournalHighlights(page, app, P);
            log('A list after B deleted:', JSON.stringify((await panelRows(page)).map((r) => r.text)));
            scratch.bDeleted = true; saveScratch();
        } finally { await close(); }
    }

    // ---------------------------------------------------------------------
    if (phase('siterefused')) {
        // what the admin sees after "Save" in the site's "Add Highlight" window, read three seconds later
        const {page, close} = await launch(app);
        try {
            log(`\n== ${app.name} siterefused ==`);
            await signIn(page, 'admin');
            await openHighlightsTab(page, app.url('/index.php/index/admin/settings'));
            await highlightsPanel(page).getByRole('button', {name: 'Add Highlight'}).click();
            const dlg = page.getByRole('dialog', {name: /Add Highlight/}).first();
            await dlg.waitFor({state: 'visible', timeout: 15000}); await idle(page);
            await dlg.getByRole('textbox', {name: /^URL/}).waitFor({state: 'visible', timeout: 15000});
            await typeRich(page, dlg, 'title', `Site refused ${Date.now()}`);
            await dlg.getByRole('textbox', {name: /^URL/}).fill('https://example.org/site');
            await dlg.getByRole('textbox', {name: /^Button Label/}).fill('Go');
            await dlg.getByRole('button', {name: 'Save', exact: true}).click();
            await page.waitForTimeout(3000); await idle(page);
            const s = await snap(page, 'siterefused-3s-after-save');
            log('3 s after Save: dialogs', s.aria.dialogs.length, '| texts:', JSON.stringify(s.aria.dialogs.map((d) => d.split('\n').filter((l) => /dialog|Error|heading|status|alert/.test(l)).slice(0, 6))));
            log('visible error-ish text:', JSON.stringify(await page.locator('.pkpFormPage__errors, .pkpFieldError, [role="alert"], .modal__content, .pkpDialog').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => e.innerText.trim().replace(/\s+/g, ' ').slice(0, 200))).catch(() => [])));
            log('Save button disabled?', await dlg.getByRole('button', {name: 'Save', exact: true}).isDisabled().catch(() => null), '| form status:', JSON.stringify(await dlg.locator('[role="status"]').allInnerTexts().catch(() => [])));
            for (let k = 0; k < 3; k++) { const top = page.locator('[role="dialog"]:visible').last(); if (!(await top.count())) break; const b = top.getByRole('button', {name: /^(OK|Close|Cancel)$/}).last(); if (!(await b.count())) break; log('closing with', await b.innerText()); await b.click().catch(() => {}); await idle(page); }
        } finally { await close(); }
    }

    // ---------------------------------------------------------------------
    if (phase('cleanup')) {
        const {page, close} = await launch(app);
        try {
            log(`\n== ${app.name} cleanup ==`);
            if ((scratch.siteTitles || []).length) {
                await signIn(page, 'admin');
                await openHighlightsTab(page, app.url('/index.php/index/admin/settings'));
                for (const t of scratch.siteTitles) { log('delete site', t, JSON.stringify(await deleteHighlight(page, t).catch((e) => String(e).slice(0, 100)))); }
                log('site list after cleanup:', JSON.stringify((await panelRows(page)).map((r) => r.text)));
            } else {
                log('no site highlight was added (the site save was refused); nothing to remove');
            }
            log('site highlights in the database:', psql(app, 'select count(*) from highlights where context_id is null'));
        } finally { await close(); }
    }
}

// The phases run in this order, one app at a time (a second forEachApp in
// the same process would run concurrently with the first).
forEachApp(async (app) => {
    await phasesSite(app);
    await phasesSiteTab(app);
    await phasesJournal(app);
});
