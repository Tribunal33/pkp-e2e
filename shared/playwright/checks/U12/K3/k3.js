const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
/**
 * U12 claim check, chunk K3: the "Announcement Types" tab, the site's
 * Announcements tab and the deletion cascades. Every screen is recorded
 * with the kit's screen() before it is read.
 *
 *   PROBE_FEATURE=U12 PROBE_AGENT=ccK3 node bin/probe.js all shared/playwright/checks/U12/K3/k3.js
 *   PHASES=types,site ONLY=ojs … narrows the run; the seed phase runs only
 *   without a state file (k3-state-<app>.json in the output folder) or with RESEED=1.
 *
 * Phases:
 *   seed     two scratch contexts per app: A (types "Conference", "Event";
 *            announcements "Call for papers" + "Second call" of Conference,
 *            "Kept one" of Event, "Untyped" with none; en + fr_CA form
 *            locales; announcements on, 5 on the home page) and B (the
 *            journal-deletion cascade: one type, two announcements)
 *   types    the manager on A: the table, "Add Announcement Type" (empty
 *            refused, French-only refused, "Cancel", a save), the row's
 *            arrow › "Edit" (edited toast) and "Remove" (the dialog, Cancel,
 *            OK, the toast, the announcements gone with it, the public site),
 *            leaving with an unsaved edit, the panel's "Announcement Type"
 *            buttons, the type printed nowhere, the empty table
 *   levels   the tab as the editor (manager-level), admin, and a section
 *            editor / author at the address (refused)
 *   site     admin on Administration › Site Settings › Announcements: the
 *            three side tabs, "You must enable announcements." and its link,
 *            the settings saved (both ends), the panel's "Add Announcement"
 *            (A4), search, the types table (add, edit, remove), the site's
 *            public pages; the site restored as found (announcements off)
 *   cascade  admin removes B on Administration › Hosted Journals; B's
 *            announcements, types and image before and after
 */
const fs = require('fs');
const path = require('path');
const {execSync} = require('child_process');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} =
    require('../../../probe');

const ALL_PHASES = ['seed', 'levels', 'types', 'site', 'cascade'];
const PHASES = process.env.PHASES ? process.env.PHASES.split(',') : ALL_PHASES;
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k3]', ...a);
const stateFile = (app) => path.join(outDir(), `k3-state-${app.name}.json`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const T = 20_000;
const REPO = path.resolve(__dirname, '..', '..', '..', '..', '..');
const DENIED = /does not have access to this operation/i;
const flat = (s, n = 400) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
const ctxUrl = (app, ctxPath, p = '') => app.url(`/index.php/${ctxPath}${p}`);
const dialog = (page) => page.locator('[role="dialog"]:visible').last();
const psql = (app, sql) => { try { return execSync(`psql ${dbName(app.name)} -At -c "${sql.replace(/"/g, '\\"')}"`, {encoding: 'utf8'}).trim(); } catch (e) { return `psql failed: ${String(e.message).split('\n')[0]}`; } };
const PNG = path.join(REPO, 'apps/ojs/playwright/fixtures/files/profile-image-400.png');
const publicDir = (app, id) => path.join(REPO, 'checkouts', app.name, 'public', {ojs: 'journals', omp: 'presses', ops: 'contexts'}[app.name], String(id));
const listDir = (dir) => { try { return execSync(`find ${dir} -type f | sed "s|${dir}/||"`, {encoding: 'utf8'}).trim().split('\n').filter(Boolean); } catch { return []; } };

async function snap(page, name, extra = {}) {
    const s = await screen(page);
    record(name, {...s, ...extra});
    await shot(page, name).catch(() => {});
    return s;
}

/** Collect every visible notification text for a few seconds after an action. */
async function toasts(page, ms = 3500) {
    const seen = new Set();
    const end = Date.now() + ms;
    while (Date.now() < end) {
        const t = await page.locator('.pkp_notification, [class*="notification"], [class*="Notification"], [role="alert"], [role="status"], .ui-pnotify, [class*="toast"]').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []);
        t.forEach((x) => seen.add(x));
        await sleep(250);
    }
    return [...seen];
}

async function openBackend(page, url) {
    const resp = await page.goto(url).catch(() => null);
    await idle(page);
    const body = await page.locator('body').innerText().catch(() => '');
    return {url: page.url(), httpStatus: resp ? resp.status() : null, denied: DENIED.test(body), loginForm: (await page.locator('form#login, input[name="username"]').count()) > 0, h1: await page.locator('main h1, h1').allInnerTexts().then((a) => a.map((s) => s.trim())).catch(() => []), tabs: await page.getByRole('tab').allInnerTexts().then((a) => a.map((s) => s.trim())).catch(() => []), bodyHead: body.slice(0, 300)};
}

// ---------------------------------------------------------------- the types grid
const grid = (page) => page.locator('#announcementTypes:visible, [id^="component-grid-announcements-announcementtypegrid"]:visible').first();

async function typesState(page) {
    const g = grid(page);
    if (!(await g.count().catch(() => 0))) return {present: false};
    return {
        present: true,
        visible: await g.isVisible().catch(() => false),
        text: flat(await g.innerText().catch(() => ''), 600),
        heading: await g.locator('h4, .pkp_controllers_grid h4, [class*=grid] h4, h3').allInnerTexts().then((a) => a.map((s) => s.trim())).catch(() => []),
        columns: await g.locator('th').allInnerTexts().then((a) => a.map((s) => s.trim())).catch(() => []),
        links: await g.locator('a').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []),
        rows: await g.locator('tr.gridRow').evaluateAll((els) => els.map((e) => ({text: e.innerText.replace(/\s+/g, ' ').trim(), hasArrow: !!e.querySelector('a.show_extras, a.hide_extras')}))).catch(() => []),
        empty: await g.locator('.empty, td.empty, .gridRow--empty, tr td[colspan]').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []),
    };
}

async function openTypesTab(page, app, ctxPath, {site = false} = {}) {
    if (!site) {
        await page.goto(ctxUrl(app, ctxPath, '/management/settings/announcements'));
        await idle(page);
        await page.getByRole('tab', {name: 'Announcement Types', exact: true}).click();
    }
    await idle(page); await sleep(400);
    await grid(page).locator('tr.gridRow, td').first().waitFor({timeout: 10_000}).catch(() => {});
    return typesState(page);
}

async function dialogState(page) {
    const d = dialog(page);
    if (!(await d.count().catch(() => 0))) return {open: false};
    return {
        open: true,
        title: await d.locator('h1, h2, h3, .modal-title, [class*=title]').first().innerText().then((s) => s.trim()).catch(() => null),
        text: flat(await d.innerText().catch(() => ''), 800),
        textboxes: await d.locator('input[type="text"], textarea').evaluateAll((els) => els.map((e) => ({name: e.name, id: e.id, value: e.value, visible: e.offsetParent !== null, maxlength: e.getAttribute('maxlength'), required: e.required || e.getAttribute('aria-required')}))).catch(() => []),
        buttons: await d.locator('button, input[type=submit], a.pkp_button, a[role=button]').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => ({tag: e.tagName, text: e.innerText.replace(/\s+/g, ' ').trim() || e.value || e.getAttribute('aria-label'), disabled: e.disabled}))).catch(() => []),
        links: await d.locator('a').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []),
        errors: await d.locator('.error, .pkp_form_error, [class*=error], .formError, .pkpFieldError').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []),
        labels: await d.locator('label').allInnerTexts().then((a) => a.map((s) => s.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []),
    };
}

/** Press the grid's add link; returns the window's state. */
async function openAddType(page) {
    const add = grid(page).getByRole('link', {name: /Add Announcement Type/}).first();
    await loc(page, 'Announcement Types: "Add Announcement Type" (a link above the table)', add);
    await add.click();
    await dialog(page).waitFor({timeout: T});
    await idle(page); await sleep(400);
    await dialog(page).locator('input[type="text"]').first().waitFor({timeout: T}).catch(() => {});
    return dialogState(page);
}

const nameBox = (page, locale = 'en') => dialog(page).locator(`input[name="name[${locale}]"]`).first();

/** Press "Save" in the type window; returns the window after and the toasts. */
async function saveType(page) {
    const d = dialog(page);
    const waiter = page.waitForResponse((r) => r.request().method() !== 'GET' && /announcement-type|announcementType/i.test(r.url()), {timeout: T}).catch(() => null);
    await d.getByRole('button', {name: 'Save', exact: true}).click();
    const resp = await waiter;
    const t = await toasts(page);
    await idle(page);
    return {response: resp ? {status: resp.status(), url: resp.url().replace(/^https?:\/\/[^/]+/, '')} : null, toasts: t, dialog: await dialogState(page)};
}

async function rowControls(page, rowText) {
    const row = grid(page).locator('tr.gridRow').filter({hasText: rowText}).first();
    await row.locator('a.show_extras').click();
    await idle(page); await sleep(300);
    const controls = row.locator('xpath=following-sibling::tr[1]');
    return {row, controls, links: await controls.locator('a').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => ({text: e.innerText.replace(/\s+/g, ' ').trim(), href: e.getAttribute('href')}))).catch(() => [])};
}

// ---------------------------------------------------------------- the announcements list panel
async function listState(page) {
    const panel = page.locator('.listPanel:visible').first();
    if (!(await panel.count().catch(() => 0))) return {present: false};
    const data = await panel.evaluate((root) => {
        const btn = (b) => ({tag: b.tagName, name: (b.getAttribute('aria-label') || b.innerText).replace(/\s+/g, ' ').trim(), href: b.getAttribute('href'), disabled: b.disabled || b.getAttribute('aria-disabled') === 'true'});
        const search = root.querySelector('input[type="search"], .pkpSearch input');
        return {
            title: root.querySelector('.pkpHeader__title, .listPanel__title')?.innerText.trim() ?? null,
            headerButtons: [...root.querySelectorAll('.pkpHeader__actions button, .listPanel__header button')].map(btn),
            search: search ? {value: search.value, ariaLabel: search.getAttribute('aria-label')} : null,
            empty: root.querySelector('.listPanel__empty')?.innerText.trim() ?? null,
            rows: [...root.querySelectorAll('.listPanel__item')].map((li) => ({title: li.querySelector('.listPanel__itemTitle')?.innerText.trim() ?? null, text: li.innerText.replace(/\s+/g, ' ').trim(), buttons: [...li.querySelectorAll('button, a')].map(btn)})),
            pagination: root.querySelector('.pkpPagination') ? root.querySelector('.pkpPagination').innerText.replace(/\s+/g, ' ').trim() : null,
        };
    }).catch((e) => ({error: String(e.message || e)}));
    return {present: true, ...data};
}

async function publicRead(page, app, ctxPath, name, {viewId} = {}) {
    const out = {};
    const targets = {list: '/announcement', home: ''};
    if (viewId) targets.view = `/announcement/view/${viewId}`;
    for (const [key, p] of Object.entries(targets)) {
        const url = ctxPath === null ? app.url(`/index.php/index${p}`) : ctxUrl(app, ctxPath, p);
        const resp = await page.goto(url).catch(() => null);
        await idle(page).catch(() => {});
        const body = await page.locator('body').innerText().catch(() => '');
        out[key] = {url: page.url(), status: resp ? resp.status() : null, title: await page.title(), is404: /404 Not Found/i.test(body), h1: await page.locator('h1').allInnerTexts().then((a) => a.map((s) => s.trim())).catch(() => []), primaryNav: await page.locator('#navigationPrimary, .pkp_navigation_primary').first().innerText().then((t) => t.replace(/\n+/g, ' | ').trim()).catch(() => null), bodyText: flat(body, 1500)};
        await snap(page, `${name}-${key}`, out[key]);
    }
    return out;
}

async function as(page, user, ctxPath) {
    await signIn(page, user, ctxPath ? {contextPath: ctxPath} : {});
    await idle(page);
}

// ---------------------------------------------------------------- the site's tab
const siteSettingsUrl = (app) => app.url('/index.php/index/admin/settings');
const sitePanel = (page) => page.locator('#announcements, [role="tabpanel"]:visible').first();

async function openSiteAnnouncementsTab(page, app) {
    await page.goto(siteSettingsUrl(app)); await idle(page);
    const tab = page.locator('#announcements-button').or(page.getByRole('tab', {name: 'Announcements', exact: true})).first();
    const present = (await tab.count()) > 0;
    if (present) { await tab.click(); await idle(page); await sleep(400); }
    return {present, topTabs: await page.getByRole('tab').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => e.innerText.trim())).catch(() => [])};
}

async function siteSideTabs(page) {
    return page.locator('#announcements [role="tab"]').evaluateAll((els) => els.map((e) => ({name: e.innerText.trim(), id: e.id, selected: e.getAttribute('aria-selected'), visible: e.offsetParent !== null}))).catch(() => []);
}

async function clickSideTab(page, name) {
    await page.locator('#announcements [role="tab"]').filter({hasText: new RegExp(`^\\s*${name}\\s*$`)}).first().click();
    await idle(page); await sleep(400);
}

const siteForm = (page) => page.locator('#announcements [role="tabpanel"]:visible').filter({has: page.getByRole('checkbox', {name: 'Enable announcements'})}).first();
const siteEnableBox = (page) => siteForm(page).getByRole('checkbox', {name: 'Enable announcements'});

async function siteFormState(page) {
    const f = siteForm(page);
    if (!(await f.count().catch(() => 0))) return {present: false};
    return {
        present: true,
        text: flat(await f.innerText().catch(() => ''), 800),
        checked: await siteEnableBox(page).isChecked().catch(() => null),
        fields: await f.locator('.pkpFormField').evaluateAll((els) => els.map((e) => ({label: e.querySelector('label, .pkpFormFieldLabel')?.innerText.replace(/\s+/g, ' ').trim() ?? null, visible: e.offsetParent !== null, value: e.querySelector('input')?.value ?? null, error: e.querySelector('.pkpFieldError')?.innerText.trim() ?? null}))).catch(() => []),
        buttons: await f.locator('button').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => ({text: e.innerText.trim(), disabled: e.disabled}))).catch(() => []),
        status: await f.locator('[role="status"]').allInnerTexts().then((a) => a.map((s) => s.trim()).filter(Boolean)).catch(() => []),
        errors: await f.locator('.pkpFormPage__status, .pkpForm__errors').allInnerTexts().then((a) => a.map((s) => s.trim()).filter(Boolean)).catch(() => []),
    };
}

async function siteSave(page) {
    const f = siteForm(page);
    await f.getByRole('button', {name: 'Save', exact: true}).click();
    await f.locator('[role="status"]:has-text("Saved"), .pkpForm__errors, .pkpFormPage__status').first().waitFor({timeout: T}).catch(() => {});
    await idle(page); await sleep(500);
    return siteFormState(page);
}

async function richBody(page, root, labelRe) {
    const field = root.locator('.pkpFormField').filter({hasText: labelRe}).first();
    if (!(await field.count().catch(() => 0))) return null;
    return field.frameLocator('iframe').locator('body');
}

async function setRich(page, root, labelRe, text) {
    const body = await richBody(page, root, labelRe);
    if (!body) return false;
    await body.waitFor({timeout: T});
    await body.click();
    await body.fill(text);
    return true;
}

// ===========================================================================

forEachApp(async (app) => {
    let s = fs.existsSync(stateFile(app)) && !process.env.RESEED ? JSON.parse(fs.readFileSync(stateFile(app), 'utf8')) : null;
    const save = () => fs.writeFileSync(stateFile(app), JSON.stringify(s, null, 2));

    // ---- seed ----
    if (!s || on('seed') && process.env.RESEED) {
        const tA = tag('u12k3a'), tB = tag('u12k3b');
        const A = await app.api.createContext({
            tag: tA, context: {name: `U12 K3 A ${tA}`, acronym: 'U12K3A', supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']},
            users: [{username: `${tA}mgr`, roles: ['manager']}, ...(app.name === 'ops' ? [] : [{username: `${tA}ed`, roles: ['editor']}]), {username: `${tA}se`, roles: ['sectionEditor']}, {username: `${tA}au`, roles: ['author']}],
            enableAnnouncements: true, numAnnouncementsHomepage: 5,
            announcementTypes: [{name: 'Conference'}, {name: 'Event'}],
            announcements: [
                {title: 'Call for papers', descriptionShort: '<p>Short of the call</p>', description: '<p>Full text of the call</p>', type: 'Conference'},
                {title: 'Second call', type: 'Conference'},
                {title: 'Kept one', type: 'Event'},
                {title: 'Untyped'},
            ],
        });
        const B = await app.api.createContext({
            tag: tB, context: {name: `U12 K3 B ${tB}`, acronym: 'U12K3B'},
            users: [{username: `${tB}mgr`, roles: ['manager']}],
            enableAnnouncements: true, numAnnouncementsHomepage: 2,
            announcementTypes: [{name: 'Cascade type'}],
            announcements: [{title: 'Cascade one', type: 'Cascade type'}, {title: 'Cascade two'}],
        });
        s = {A: {tag: tA, id: A.contextId, path: A.path, types: A.announcementTypes, announcements: A.announcements, mgr: `${tA}mgr`, ed: app.name === 'ops' ? null : `${tA}ed`, se: `${tA}se`, au: `${tA}au`},
              B: {tag: tB, id: B.contextId, path: B.path, types: B.announcementTypes, announcements: B.announcements, mgr: `${tB}mgr`}};
        save();
        note(`K3 ${app.name}: scratch A ${s.A.path} (id ${s.A.id}, types ${JSON.stringify(s.A.types)}, announcements ${JSON.stringify(s.A.announcements)}); B ${s.B.path} (id ${s.B.id}) for the journal-deletion cascade`);
        log('seeded', JSON.stringify(s));
    }
    const A = s.A, B = s.B;
    const annId = (ctx, title) => (ctx.announcements.find((a) => (a.title?.en || a.title) === title) || {}).id;

    // ---- types: the manager on A ----
    if (on('types')) {
        const {page, close} = await launch(app);
        try {
            log(`\n== ${app.name} types ==`);
            await as(page, A.mgr, A.path);
            const tasksBefore = flat(await page.locator('a:has-text("Tasks"), [class*=tasks]').first().innerText().catch(() => ''), 40);
            // 10: the tab and the table as seeded
            const t0 = await openTypesTab(page, app, A.path);
            await loc(page, 'Announcement Types tab', page.getByRole('tab', {name: 'Announcement Types', exact: true}));
            await loc(page, 'Announcement Types: the grid', grid(page));
            await loc(page, 'Announcement Types: a row', grid(page).locator('tr.gridRow').first());
            await snap(page, '10-types-tab', {types: t0, pageTabs: await page.getByRole('tab').allInnerTexts().catch(() => []), tasksBefore});
            log('types as seeded:', JSON.stringify(t0));

            // 11: "Add Announcement Type" opened: the window
            const w = await openAddType(page);
            await loc(page, 'Add Announcement Type: the "Name" box (English)', nameBox(page));
            await snap(page, '11-add-type-window', {window: w});
            log('add window:', JSON.stringify(w));
            // the French twin: focus the English box and read again
            await nameBox(page).click().catch(() => {});
            await sleep(400);
            const wFocused = await dialogState(page);
            await snap(page, '12-add-type-window-focused', {window: wFocused, frBox: {count: await nameBox(page, 'fr_CA').count(), visible: await nameBox(page, 'fr_CA').isVisible().catch(() => false)}});

            // 13: empty Save
            const r13 = await saveType(page);
            await snap(page, '13-add-type-empty-save', r13);
            log('empty save:', JSON.stringify(r13));

            // 14: French only
            if (await nameBox(page, 'fr_CA').count()) {
                await nameBox(page).click().catch(() => {});
                await nameBox(page, 'fr_CA').fill('Atelier').catch((e) => log('fr fill:', e.message.split('\n')[0]));
                await nameBox(page).fill('');
                const r14 = await saveType(page);
                await snap(page, '14-add-type-french-only', r14);
                log('french only:', JSON.stringify(r14));
            }

            // 15: Cancel
            const cancel = dialog(page).getByRole('button', {name: /^Cancel$/}).or(dialog(page).getByRole('link', {name: /^Cancel$/})).first();
            await loc(page, 'Add Announcement Type: "Cancel"', cancel);
            await cancel.click().catch((e) => log('cancel:', e.message.split('\n')[0]));
            await idle(page); await sleep(500);
            await snap(page, '15-add-type-cancelled', {dialog: await dialogState(page), types: await typesState(page)});

            // 16: a real add, "Workshop" in English (and French "Atelier")
            await openAddType(page);
            await nameBox(page).click().catch(() => {});
            await nameBox(page).fill('Workshop');
            if (await nameBox(page, 'fr_CA').count()) await nameBox(page, 'fr_CA').fill('Atelier').catch(() => {});
            const r16 = await saveType(page);
            await sleep(800); await idle(page);
            await snap(page, '16-add-type-saved', {...r16, types: await typesState(page)});
            log('add saved:', JSON.stringify(r16), 'rows', JSON.stringify((await typesState(page)).rows));

            // 17: the row's arrow › Edit
            const rc = await rowControls(page, 'Workshop');
            await loc(page, 'Announcement Types: a row\'s arrow', rc.row.locator('a.show_extras, a.hide_extras').first());
            await loc(page, 'Announcement Types: a row\'s "Edit"', rc.controls.getByRole('link', {name: 'Edit', exact: true}));
            await loc(page, 'Announcement Types: a row\'s "Remove"', rc.controls.getByRole('link', {name: 'Remove', exact: true}));
            await snap(page, '17-type-row-controls', {links: rc.links});
            await rc.controls.getByRole('link', {name: 'Edit', exact: true}).click();
            await dialog(page).waitFor({timeout: T}); await idle(page); await sleep(400);
            await dialog(page).locator('input[type="text"]').first().waitFor({timeout: T}).catch(() => {});
            const wEdit = await dialogState(page);
            await snap(page, '18-edit-type-window', {window: wEdit});
            await nameBox(page).click().catch(() => {});
            await nameBox(page).fill('Workshop 2');
            const r19 = await saveType(page);
            await sleep(800); await idle(page);
            await snap(page, '19-edit-type-saved', {...r19, types: await typesState(page)});
            log('edit saved:', JSON.stringify(r19), 'rows without reload', JSON.stringify((await typesState(page)).rows));
            // the table after the edit: without a reload the row may keep the old name; then a reload
            await sleep(3000);
            record('19b-edit-type-rows-3s-later', {rows: (await typesState(page)).rows});
            const tReload = await openTypesTab(page, app, A.path);
            await snap(page, '19c-edit-type-after-reload', {types: tReload});
            log('rows after reload', JSON.stringify(tReload.rows));

            // 20: leave the tab with an unsaved edit open: switch the page tab, then navigate away
            const rc2 = await rowControls(page, 'Workshop 2');
            await rc2.controls.getByRole('link', {name: 'Edit', exact: true}).click();
            await dialog(page).waitFor({timeout: T}); await idle(page); await sleep(400);
            await nameBox(page).click().catch(() => {});
            await nameBox(page).fill('Workshop 3 unsaved');
            const dialogs = [];
            page.on('dialog', async (d) => { dialogs.push({type: d.type(), message: d.message()}); await d.dismiss().catch(() => {}); });
            await page.getByRole('tab', {name: 'Announcements', exact: true}).first().click({timeout: 5000}).catch((e) => log('tab click with window open:', e.message.split('\n')[0]));
            await sleep(600);
            await snap(page, '20-leave-with-unsaved-edit-tab', {dialog: await dialogState(page), browserDialogs: dialogs, selectedTab: await page.getByRole('tab', {selected: true}).allInnerTexts().catch(() => [])});
            await page.goto(ctxUrl(app, A.path, '/management/settings/website')).catch(() => {});
            await idle(page); await sleep(400);
            await snap(page, '21-leave-with-unsaved-edit-page', {browserDialogs: dialogs, url: page.url()});
            const tAfterLeave = await openTypesTab(page, app, A.path);
            await snap(page, '22-types-after-unsaved-leave', {types: tAfterLeave});

            // 23: the panel's "Announcement Type" buttons (Rule 13 "Once a type exists the panel offers")
            await page.getByRole('tab', {name: 'Announcements', exact: true}).first().click(); await idle(page); await sleep(300);
            await page.locator('.listPanel:visible').first().getByRole('button', {name: 'Add Announcement', exact: true}).click();
            await dialog(page).waitFor({timeout: T}); await idle(page); await sleep(500);
            const typeField = dialog(page).locator('.pkpFormField').filter({hasText: /Announcement Type/}).first();
            await snap(page, '23-panel-type-buttons', {typeField: {present: (await typeField.count()) > 0, text: flat(await typeField.innerText().catch(() => ''), 300), radios: await typeField.locator('input[type=radio]').evaluateAll((els) => els.map((e) => ({value: e.value, checked: e.checked, label: e.labels?.[0]?.innerText.trim()}))).catch(() => [])}});
            await dialog(page).getByRole('button', {name: /^Cancel$/}).first().click().catch(() => {});
            await idle(page); await sleep(300);

            // 30: the type printed nowhere: the list, the announcement's page, the home page (A5)
            const callId = annId(A, 'Call for papers');
            await signOut(page).catch(() => {});
            const pub = await publicRead(page, app, A.path, '30-public-before-remove', {viewId: callId});
            const printed = Object.fromEntries(Object.entries(pub).map(([k, v]) => [k, {conferencePrinted: /Conference/.test(v.bodyText), eventPrinted: /\bEvent\b/.test(v.bodyText), callPresent: /Call for papers/.test(v.bodyText)}]));
            record('31-type-printed', printed);
            log('type printed:', JSON.stringify(printed));

            // 40: Remove "Conference": the dialog, Cancel, then OK
            await as(page, A.mgr, A.path);
            await openTypesTab(page, app, A.path);
            const listBefore = await (async () => { await page.getByRole('tab', {name: 'Announcements', exact: true}).first().click(); await idle(page); await sleep(300); const l = await listState(page); await page.getByRole('tab', {name: 'Announcement Types', exact: true}).click(); await idle(page); await sleep(300); return l; })();
            record('40-list-before-remove', listBefore);
            const rc3 = await rowControls(page, 'Conference');
            await rc3.controls.getByRole('link', {name: 'Remove', exact: true}).click();
            const confirm = page.locator('[role="dialog"]:visible, [data-cy="dialog"]:visible').last();
            await confirm.waitFor({state: 'visible', timeout: T});
            await sleep(300);
            const confirmState = {text: flat(await confirm.innerText().catch(() => ''), 500), title: await confirm.locator('h1, h2, h3, [class*=title]').first().innerText().then((s) => s.trim()).catch(() => null), buttons: await confirm.locator('button, a[role=button], a.pkp_button').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => e.innerText.replace(/\s+/g, ' ').trim())).catch(() => [])};
            await loc(page, 'Remove type: the confirmation dialog', confirm);
            await snap(page, '41-remove-type-dialog', {confirm: confirmState});
            log('remove dialog:', JSON.stringify(confirmState));
            await confirm.getByRole('button', {name: /^Cancel$/}).first().click().catch((e) => log('cancel remove:', e.message.split('\n')[0]));
            await idle(page); await sleep(500);
            await snap(page, '42-remove-type-cancelled', {types: await typesState(page), dialog: await dialogState(page)});
            // the arrow again (the controls close on cancel?) then OK
            const rowC = grid(page).locator('tr.gridRow').filter({hasText: 'Conference'}).first();
            const controlsC = rowC.locator('xpath=following-sibling::tr[1]');
            if (!(await controlsC.getByRole('link', {name: 'Remove', exact: true}).isVisible().catch(() => false))) { await rowC.locator('a.show_extras').click().catch(() => {}); await sleep(300); }
            await controlsC.getByRole('link', {name: 'Remove', exact: true}).click();
            const confirm2 = page.locator('[role="dialog"]:visible, [data-cy="dialog"]:visible').last();
            await confirm2.waitFor({state: 'visible', timeout: T});
            const w43 = page.waitForResponse((r) => r.request().method() !== 'GET' && /announcement-type|announcementType|delete/i.test(r.url()), {timeout: T}).catch(() => null);
            await confirm2.getByRole('button', {name: /^(OK|Yes|Confirm)$/}).first().click();
            const resp43 = await w43;
            const toast43 = await toasts(page);
            await idle(page); await sleep(500);
            await snap(page, '43-remove-type-ok', {response: resp43 ? {status: resp43.status(), url: resp43.url().replace(/^https?:\/\/[^/]+/, '')} : null, toasts: toast43, types: await typesState(page)});
            log('remove ok:', JSON.stringify({toasts: toast43, rows: (await typesState(page)).rows}));
            // the Announcements tab after the removal, without and with a reload
            await page.getByRole('tab', {name: 'Announcements', exact: true}).first().click(); await idle(page); await sleep(400);
            await snap(page, '44-list-after-remove-noreload', {list: await listState(page)});
            await page.reload(); await idle(page); await sleep(400);
            await snap(page, '45-list-after-remove-reload', {list: await listState(page)});
            log('list after remove (reload):', JSON.stringify((await listState(page)).rows?.map((r) => r.title)));
            const tasksAfter = flat(await page.locator('a:has-text("Tasks"), [class*=tasks]').first().innerText().catch(() => ''), 40);
            record('46-tasks', {tasksBefore, tasksAfter});

            // 47: the public site after the removal
            await signOut(page).catch(() => {});
            const pubAfter = await publicRead(page, app, A.path, '47-public-after-remove', {viewId: callId});
            record('48-public-after-remove-summary', Object.fromEntries(Object.entries(pubAfter).map(([k, v]) => [k, {status: v.status, is404: v.is404, callPresent: /Call for papers/.test(v.bodyText), secondCallPresent: /Second call/.test(v.bodyText), keptPresent: /Kept one/.test(v.bodyText), untypedPresent: /Untyped/.test(v.bodyText)}])));

            // 50: remove the rest to reach the empty table; "Untyped" survives
            await as(page, A.mgr, A.path);
            await openTypesTab(page, app, A.path);
            for (const name of ['Event', 'Workshop 2']) {
                const rcX = await rowControls(page, name);
                await rcX.controls.getByRole('link', {name: 'Remove', exact: true}).click();
                const c = page.locator('[role="dialog"]:visible, [data-cy="dialog"]:visible').last();
                await c.waitFor({state: 'visible', timeout: T});
                await c.getByRole('button', {name: /^(OK|Yes|Confirm)$/}).first().click();
                await toasts(page, 1500); await idle(page); await sleep(400);
            }
            await snap(page, '50-types-empty', {types: await typesState(page)});
            log('types empty:', JSON.stringify(await typesState(page)));
            await page.getByRole('tab', {name: 'Announcements', exact: true}).first().click(); await idle(page); await sleep(400);
            await page.reload(); await idle(page); await sleep(400);
            await snap(page, '51-list-after-all-types-removed', {list: await listState(page)});
            // the panel with no type: "Announcement Type" field absent?
            await page.locator('.listPanel:visible').first().getByRole('button', {name: 'Add Announcement', exact: true}).click();
            await dialog(page).waitFor({timeout: T}); await idle(page); await sleep(500);
            const typeField2 = dialog(page).locator('.pkpFormField').filter({hasText: /Announcement Type/}).first();
            await snap(page, '52-panel-no-types', {typeFieldPresent: (await typeField2.count()) > 0, labels: await dialog(page).locator('.pkpFormField label, .pkpFormFieldLabel').allInnerTexts().then((a) => a.map((x) => x.replace(/\s+/g, ' ').trim())).catch(() => [])});
            await dialog(page).getByRole('button', {name: /^Cancel$/}).first().click().catch(() => {});
            await signOut(page).catch(() => {});
        } finally { await close(); }
    }

    // ---- levels: the tab per permission level ----
    if (on('levels')) {
        const {page, close} = await launch(app);
        try {
            log(`\n== ${app.name} levels ==`);
            for (const [key, user] of [['editor', A.ed], ['admin', 'admin'], ['sectioneditor', A.se], ['author', A.au]].filter(([, u]) => u)) {
                await as(page, user, A.path);
                const res = await openBackend(page, ctxUrl(app, A.path, '/management/settings/announcements#announcementTypes'));
                let types = {present: false};
                if (!res.denied && !res.loginForm) {
                    await page.getByRole('tab', {name: 'Announcement Types', exact: true}).click().catch(() => {});
                    await idle(page); await sleep(400);
                    types = await typesState(page);
                }
                await snap(page, `60-level-${key}`, {res, types, addLink: types.present ? await grid(page).getByRole('link', {name: /Add Announcement Type/}).count() : 0});
                log(key, ':', res.denied ? 'DENIED' : res.loginForm ? 'LOGIN' : `tab, rows ${JSON.stringify(types.rows)}, links ${JSON.stringify(types.links)}`);
                await signOut(page).catch(() => {});
            }
        } finally { await close(); }
    }

    // ---- site: Administration › Site Settings › Announcements ----
    if (on('site')) {
        const {page, close} = await launch(app);
        try {
            log(`\n== ${app.name} site ==`);
            const before = {settings: psql(app, "select setting_name, setting_value from site_settings where setting_name in ('enableAnnouncements','announcementsIntroduction','numAnnouncementsHomepage') order by 1"), announcements: psql(app, 'select count(*) from announcements where assoc_id is null'), types: psql(app, 'select count(*) from announcement_types where context_id is null')};
            record('70-site-state-before', before);
            log('site before:', JSON.stringify(before));
            // the manager: refused (control)
            await as(page, A.mgr, A.path);
            const mgrSite = await openBackend(page, siteSettingsUrl(app));
            await snap(page, '71-site-as-manager', mgrSite);
            // the site's public pages with the box unticked
            await signOut(page).catch(() => {});
            await publicRead(page, app, null, '72-site-public-off');

            await as(page, 'admin');
            const top = await openSiteAnnouncementsTab(page, app);
            const side0 = await siteSideTabs(page);
            await loc(page, 'Site Settings: the "Announcements" tab', page.locator('#announcements-button').or(page.getByRole('tab', {name: 'Announcements', exact: true})).first());
            await snap(page, '73-site-tab-landed', {top, sideTabs: side0, form: await siteFormState(page), panelText: flat(await sitePanel(page).innerText().catch(() => ''), 800)});
            log('site side tabs:', JSON.stringify(side0));
            // the "Announcements" and "Announcement Types" side tabs while unticked
            for (const name of ['Announcements', 'Announcement Types']) {
                await clickSideTab(page, name);
                const panelVisible = page.locator('#announcements [role="tabpanel"]:visible').first();
                const links = await panelVisible.locator('a').evaluateAll((els) => els.map((e) => ({text: e.innerText.trim(), href: e.getAttribute('href')}))).catch(() => []);
                await snap(page, `74-site-${name.replace(/\s+/g, '-').toLowerCase()}-unticked`, {text: flat(await panelVisible.innerText().catch(() => ''), 400), links, list: await listState(page), types: await typesState(page)});
                log(name, 'unticked:', flat(await panelVisible.innerText().catch(() => ''), 120), JSON.stringify(links));
            }
            // press the "enable announcements" link: where does it land?
            const enableLink = page.locator('#announcements [role="tabpanel"]:visible a').filter({hasText: /enable announcements/i}).first();
            if (await enableLink.count()) {
                await enableLink.click(); await idle(page); await sleep(500);
                await snap(page, '75-site-enable-link-pressed', {url: page.url(), sideTabs: await siteSideTabs(page), form: await siteFormState(page)});
            }
            // the settings side tab: tick and read the fields (both ends)
            await clickSideTab(page, 'Settings');
            const f0 = await siteFormState(page);
            await snap(page, '76-site-settings-unticked', {form: f0});
            await siteEnableBox(page).check();
            await sleep(400);
            const f1 = await siteFormState(page);
            await snap(page, '77-site-settings-ticked-unsaved', {form: f1});
            // leave the form with the unsaved tick: switch side tab and top tab
            const browserDialogs = [];
            page.on('dialog', async (d) => { browserDialogs.push({type: d.type(), message: d.message()}); await d.dismiss().catch(() => {}); });
            await clickSideTab(page, 'Announcements');
            await snap(page, '78-site-unsaved-tick-side-switch', {text: flat(await page.locator('#announcements [role="tabpanel"]:visible').first().innerText().catch(() => ''), 300), browserDialogs, dialog: await dialogState(page)});
            await clickSideTab(page, 'Settings');
            await snap(page, '79-site-unsaved-tick-back', {form: await siteFormState(page), browserDialogs});
            // fill the introduction and the number, Save
            await setRich(page, siteForm(page), /Introduction|Additional Information/i, 'Site intro K3');
            const num = siteForm(page).locator('.pkpFormField').filter({hasText: /Display on Homepage/}).locator('input').first();
            await num.fill('2').catch((e) => log('num fill:', e.message.split('\n')[0]));
            const saved = await siteSave(page);
            await snap(page, '80-site-settings-saved', {form: saved});
            log('site saved:', JSON.stringify(saved.status), saved.errors);
            // the other two side tabs without a reload
            for (const name of ['Announcements', 'Announcement Types']) {
                await clickSideTab(page, name);
                const pv = page.locator('#announcements [role="tabpanel"]:visible').first();
                await snap(page, `81-site-${name.replace(/\s+/g, '-').toLowerCase()}-after-save-noreload`, {text: flat(await pv.innerText().catch(() => ''), 300), list: await listState(page), types: await typesState(page)});
            }
            // after a reload
            await openSiteAnnouncementsTab(page, app);
            await snap(page, '82-site-tab-after-reload', {sideTabs: await siteSideTabs(page), form: await siteFormState(page)});
            await clickSideTab(page, 'Announcements');
            const l82 = await listState(page);
            await loc(page, 'Site Announcements side tab: the list panel', page.locator('.listPanel:visible').first());
            await snap(page, '83-site-announcements-panel', {list: l82});
            log('site panel:', JSON.stringify(l82));
            // A4: "Add Announcement" › "Site news" › Save
            const apiCalls = [];
            page.on('response', (r) => { if (/api\/v1\/announcements/.test(r.url())) apiCalls.push({method: r.request().method(), url: r.url().replace(/^https?:\/\/[^/]+/, ''), status: r.status()}); });
            const addBtn = page.locator('.listPanel:visible').first().getByRole('button', {name: 'Add Announcement', exact: true});
            if (await addBtn.count()) {
                await addBtn.click();
                await dialog(page).waitFor({timeout: T}); await idle(page); await sleep(500);
                const d = dialog(page);
                const wSite = await dialogState(page);
                const langs = await d.locator('.pkpFormLocales, [class*=locale] button, .pkpFormLocales__locale').allInnerTexts().then((a) => a.map((x) => x.trim()).filter(Boolean)).catch(() => []);
                await snap(page, '84-site-add-window', {window: wSite, formLabels: await d.locator('.pkpFormField label, .pkpFormFieldLabel').allInnerTexts().then((a) => a.map((x) => x.replace(/\s+/g, ' ').trim())).catch(() => []), langs, typeField: flat(await d.locator('.pkpFormField').filter({hasText: /Announcement Type/}).first().innerText().catch(() => ''), 200)});
                const titleInput = d.locator('.pkpFormField').filter({hasText: /^\s*Title/}).locator('input').first();
                await titleInput.waitFor({timeout: T});
                await titleInput.fill('Site news');
                await d.getByRole('button', {name: 'Save', exact: true}).click();
                await sleep(2500); await idle(page);
                const still = await page.locator('[role="dialog"]:visible').count();
                await snap(page, '85-site-add-saved', {dialogStillOpen: still > 0, dialog: await dialogState(page), errorSummary: await d.locator('.pkpForm__errors').innerText().catch(() => null), fieldErrors: await d.locator('.pkpFieldError').allInnerTexts().catch(() => []), toasts: await toasts(page, 1500), apiCalls: [...apiCalls], list: await listState(page)});
                log('site add:', JSON.stringify({still, apiCalls}));
                if (still) { await d.getByRole('button', {name: /^Cancel$/}).first().click().catch(() => {}); await sleep(300); }
                // the list's search
                const search = page.locator('.listPanel:visible').first().locator('input[type="search"]').first();
                if (await search.count()) {
                    await search.fill('news'); await search.press('Enter'); await sleep(2000); await idle(page);
                    await snap(page, '86-site-search', {apiCalls: [...apiCalls], list: await listState(page), toasts: await toasts(page, 1000)});
                    await search.fill(''); await search.press('Enter'); await sleep(1000);
                }
                await openSiteAnnouncementsTab(page, app);
                await clickSideTab(page, 'Announcements');
                const l87 = await listState(page);
                await snap(page, '87-site-list-after-reload', {list: l87, dbSiteAnnouncements: psql(app, 'select announcement_id from announcements where assoc_id is null')});
                log('site list after reload:', JSON.stringify(l87.rows?.map((r) => r.title)));
                const panelS = page.locator('.listPanel:visible').first();
                // edit the site announcement
                const rowSN = panelS.locator('.listPanel__item').filter({hasText: 'Site news'}).first();
                if (await rowSN.count()) {
                    const viewHref = await rowSN.getByRole('link', {name: /^View/}).first().getAttribute('href').catch(() => null);
                    await rowSN.getByRole('button', {name: /^Edit/}).first().click();
                    await dialog(page).waitFor({timeout: T}); await idle(page); await sleep(500);
                    const dE = dialog(page);
                    const tIn = dE.locator('.pkpFormField').filter({hasText: /^\s*Title/}).locator('input').first();
                    await tIn.waitFor({timeout: T});
                    await tIn.fill('Site news 2');
                    await dE.getByRole('button', {name: 'Save', exact: true}).click();
                    await sleep(2500); await idle(page);
                    await snap(page, '87b-site-edit-saved', {viewHref, dialogStillOpen: (await page.locator('[role="dialog"]:visible').count()) > 0, fieldErrors: await dE.locator('.pkpFieldError').allInnerTexts().catch(() => []), apiCalls: [...apiCalls], list: await listState(page)});
                    if (await page.locator('[role="dialog"]:visible').count()) await dE.getByRole('button', {name: /^Cancel$/}).first().click().catch(() => {});
                    s.siteViewHref = viewHref; save();
                }
                // a second one with "Send an email…" ticked: the mail catcher and a journal user's notifications
                const mailBefore = await app.mail.messageCount().catch(() => null);
                await panelS.getByRole('button', {name: 'Add Announcement', exact: true}).click();
                await dialog(page).waitFor({timeout: T}); await idle(page); await sleep(500);
                const dM = dialog(page);
                const tM = dM.locator('.pkpFormField').filter({hasText: /^\s*Title/}).locator('input').first();
                await tM.waitFor({timeout: T}); await tM.fill('Site mail');
                await dM.getByRole('checkbox', {name: /Send an email/}).check().catch((e) => log('email box:', e.message.split('\n')[0]));
                await dM.getByRole('button', {name: 'Save', exact: true}).click();
                await sleep(2500); await idle(page);
                const stillM = (await page.locator('[role="dialog"]:visible').count()) > 0;
                if (stillM) await dM.getByRole('button', {name: /^Cancel$/}).first().click().catch(() => {});
                await sleep(4000);
                const mailAfter = await app.mail.messageCount().catch(() => null);
                const mailHits = {manager: await app.mail.count({to: `${A.mgr}@mail.test`, subject: /announcement|Site mail/i}).catch((e) => String(e.message)), admin: await app.mail.count({to: 'admin@mail.test', subject: /announcement|Site mail/i}).catch((e) => String(e.message))};
                await snap(page, '87c-site-add-with-email', {dialogStillOpen: stillM, mailBefore, mailAfter, mailHits, apiCalls: [...apiCalls], list: await listState(page), jobs: psql(app, 'select count(*) from jobs')});
                log('site add with email:', JSON.stringify({stillM, mailBefore, mailAfter, mailHits}));
                // the site's public pages while the box is ticked and site announcements exist
                await signOut(page).catch(() => {});
                const viewId = (s.siteViewHref || '').match(/view\/(\d+)/)?.[1];
                const pubSite = await publicRead(page, app, null, '93-site-public-on', viewId ? {viewId} : {});
                record('93b-site-public-on-summary', Object.fromEntries(Object.entries(pubSite).map(([k, v]) => [k, {status: v.status, is404: v.is404, siteNewsShown: /Site news/.test(v.bodyText), siteMailShown: /Site mail/.test(v.bodyText), introShown: /Site intro K3/.test(v.bodyText), nav: v.primaryNav}])));
                // the journal's public pages (the site's announcements are not the journal's)
                const pubA = await publicRead(page, app, A.path, '93d-journal-public-while-site-on');
                record('93e-journal-public-while-site-on-summary', Object.fromEntries(Object.entries(pubA).map(([k, v]) => [k, {siteNewsShown: /Site news|Site mail/.test(v.bodyText)}])));
                // delete both site announcements (drives "Delete"; restores the site's list)
                await as(page, 'admin');
                await openSiteAnnouncementsTab(page, app);
                await clickSideTab(page, 'Announcements');
                for (const title of ['Site news 2', 'Site news', 'Site mail']) {
                    const rowD = page.locator('.listPanel:visible').first().locator('.listPanel__item').filter({hasText: title}).first();
                    if (!(await rowD.count())) continue;
                    await rowD.getByRole('button', {name: /^Delete/}).first().click();
                    const cd = page.locator('[role="dialog"]:visible').last();
                    await cd.waitFor({timeout: T}); await sleep(300);
                    const cdText = flat(await cd.innerText().catch(() => ''), 300);
                    const cdButtons = await cd.getByRole('button').allInnerTexts().catch(() => []);
                    await cd.getByRole('button', {name: /^(Delete|OK|Yes|Confirm)$/}).first().click();
                    await sleep(2000); await idle(page);
                    await snap(page, `87d-site-delete-${title.replace(/\s+/g, '-').toLowerCase()}`, {confirmText: cdText, cdButtons, apiCalls: [...apiCalls], list: await listState(page)});
                }
                record('87e-site-list-after-deletes', {list: await listState(page), db: psql(app, 'select announcement_id from announcements where assoc_id is null')});
                await clickSideTab(page, 'Announcement Types');
            }
            // the site's types table: add, edit, remove "Site type"
            await clickSideTab(page, 'Announcement Types');
            await grid(page).locator('tr.gridRow, td').first().waitFor({timeout: 10_000}).catch(() => {});
            await snap(page, '88-site-types-table', {types: await typesState(page)});
            const wt = await openAddType(page);
            await nameBox(page).click().catch(() => {});
            await snap(page, '89-site-add-type-window', {window: await dialogState(page), frBox: await nameBox(page, 'fr_CA').count(), boxes: await dialog(page).locator('input[type=text]').evaluateAll((els) => els.map((e) => e.name))});
            await nameBox(page).fill('Site type');
            const r90 = await saveType(page);
            await sleep(800); await idle(page);
            await snap(page, '90-site-add-type-saved', {...r90, types: await typesState(page)});
            log('site type add:', JSON.stringify(r90));
            if ((await typesState(page)).rows.some((r) => /Site type/.test(r.text))) {
                const rcS = await rowControls(page, 'Site type');
                await rcS.controls.getByRole('link', {name: 'Edit', exact: true}).click();
                await dialog(page).waitFor({timeout: T}); await idle(page); await sleep(400);
                await nameBox(page).click().catch(() => {});
                await nameBox(page).fill('Site type 2');
                const r91 = await saveType(page);
                await sleep(800); await idle(page);
                await snap(page, '91-site-edit-type-saved', {...r91, types: await typesState(page)});
                await openSiteAnnouncementsTab(page, app); await clickSideTab(page, 'Announcement Types');
                await grid(page).locator('tr.gridRow, td').first().waitFor({timeout: 10_000}).catch(() => {});
                record('91b-site-types-after-reload', {types: await typesState(page)});
                const rcS2 = await rowControls(page, 'Site type 2');
                await rcS2.controls.getByRole('link', {name: 'Remove', exact: true}).click();
                const c = page.locator('[role="dialog"]:visible, [data-cy="dialog"]:visible').last();
                await c.waitFor({state: 'visible', timeout: T});
                const cText = flat(await c.innerText().catch(() => ''), 300);
                await c.getByRole('button', {name: /^(OK|Yes|Confirm)$/}).first().click();
                const t92 = await toasts(page); await idle(page); await sleep(400);
                await snap(page, '92-site-remove-type', {confirmText: cText, toasts: t92, types: await typesState(page)});
            }
            // restore: box off, intro and number cleared
            await openSiteAnnouncementsTab(page, app);
            await clickSideTab(page, 'Settings');
            await setRich(page, siteForm(page), /Introduction|Additional Information/i, '');
            await siteForm(page).locator('.pkpFormField').filter({hasText: /Display on Homepage/}).locator('input').first().fill('').catch(() => {});
            await siteEnableBox(page).uncheck();
            const restored = await siteSave(page);
            await snap(page, '94-site-restored', {form: restored, db: psql(app, "select setting_name, setting_value from site_settings where setting_name in ('enableAnnouncements','announcementsIntroduction','numAnnouncementsHomepage') order by 1"), siteAnnouncements: psql(app, 'select count(*) from announcements where assoc_id is null'), siteTypes: psql(app, 'select count(*) from announcement_types where context_id is null')});
            log('site restored:', JSON.stringify(restored.status), psql(app, "select setting_name, setting_value from site_settings where setting_name in ('enableAnnouncements','announcementsIntroduction','numAnnouncementsHomepage') order by 1"));
            await signOut(page).catch(() => {});
            await publicRead(page, app, null, '95-site-public-restored');
        } finally { await close(); }
    }

    // ---- cascade: delete B on Hosted Journals ----
    if (on('cascade')) {
        const {page, close} = await launch(app);
        try {
            log(`\n== ${app.name} cascade ==`);
            // give one of B's announcements an image through the panel
            await as(page, B.mgr, B.path);
            await page.goto(ctxUrl(app, B.path, '/management/settings/announcements')); await idle(page); await sleep(400);
            const row = page.locator('.listPanel:visible .listPanel__item').filter({hasText: 'Cascade one'}).first();
            await row.getByRole('button', {name: /^Edit/}).first().click();
            await dialog(page).waitFor({timeout: T}); await idle(page); await sleep(500);
            const d = dialog(page);
            const fileInput = d.locator('input[type="file"]').first();
            let imageOut = {inputCount: await fileInput.count()};
            if (imageOut.inputCount) {
                await fileInput.setInputFiles(PNG);
                await d.locator('.pkpFormField--uploadImage__preview, img[src^="blob:"], img[src*="temporaryFiles"], .pkpFormField--uploadImage__thumbnail, img[alt]').first().waitFor({state: 'visible', timeout: T}).catch(() => {});
                await d.getByRole('textbox', {name: /Alternate text/}).fill('cascade alt').catch(() => {});
                await sleep(800);
                await d.getByRole('button', {name: 'Save', exact: true}).click();
                await sleep(2500); await idle(page);
                imageOut.dialogStillOpen = (await page.locator('[role="dialog"]:visible').count()) > 0;
                imageOut.errors = await d.locator('.pkpFieldError').allInnerTexts().catch(() => []);
                if (imageOut.dialogStillOpen) await d.getByRole('button', {name: /^Cancel$/}).first().click().catch(() => {});
            }
            const filesBefore = listDir(publicDir(app, B.id));
            const dbBefore = {announcements: psql(app, `select announcement_id from announcements where assoc_id=${B.id} order by 1`), types: psql(app, `select type_id from announcement_types where context_id=${B.id} order by 1`), imageSetting: psql(app, `select count(*) from announcement_settings s join announcements a on a.announcement_id=s.announcement_id where a.assoc_id=${B.id} and s.setting_name='image'`)};
            await snap(page, '100-cascade-before', {imageOut, filesBefore, dbBefore, publicDir: publicDir(app, B.id)});
            log('cascade before:', JSON.stringify({imageOut, filesBefore, dbBefore}));
            const cascadeOneId = annId(B, 'Cascade one');
            await signOut(page).catch(() => {});
            const pubB = await publicRead(page, app, B.path, '101-cascade-public-before', {viewId: cascadeOneId});
            record('101b-cascade-public-before-summary', Object.fromEntries(Object.entries(pubB).map(([k, v]) => [k, {status: v.status, is404: v.is404, oneShown: /Cascade one/.test(v.bodyText), imageShown: false}])));
            const imgOnView = await page.goto(ctxUrl(app, B.path, `/announcement/view/${cascadeOneId}`)).then(async () => page.locator('img[alt="cascade alt"], .announcement img, main img, img[src*="announcement"]').evaluateAll((els) => els.map((e) => ({src: e.getAttribute('src'), alt: e.getAttribute('alt')})))).catch(() => []);
            record('101c-cascade-image-on-view', imgOnView);

            await as(page, 'admin');
            await page.goto(app.url('/index.php/index/admin/contexts')); await idle(page); await sleep(400);
            await snap(page, '102-hosted-list');
            const hrow = page.locator('tr.gridRow').filter({hasText: `U12 K3 B ${B.tag}`}).first();
            log('B row found:', await hrow.count());
            await hrow.locator('a.show_extras').click(); await idle(page); await sleep(300);
            const controls = hrow.locator('xpath=following-sibling::tr[1]');
            const hlinks = await controls.getByRole('link').allInnerTexts().catch(() => []);
            await controls.getByRole('link', {name: /Remove|Delete/}).first().click();
            const confirm = page.locator('[role="dialog"]:visible, [data-cy="dialog"]:visible').last();
            await confirm.waitFor({state: 'visible', timeout: T});
            const ct = flat(await confirm.innerText().catch(() => ''), 400);
            await snap(page, '103-hosted-remove-dialog', {rowLinks: hlinks, confirmText: ct, buttons: await confirm.getByRole('button').allInnerTexts().catch(() => [])});
            await confirm.getByRole('button', {name: /^(OK|Yes|Confirm)$/}).first().click(); await idle(page);
            await sleep(3000); await idle(page);
            const dbAfter = {announcements: psql(app, `select announcement_id from announcements where assoc_id=${B.id} order by 1`), types: psql(app, `select type_id from announcement_types where context_id=${B.id} order by 1`), settingsLeft: psql(app, `select count(*) from announcement_settings where announcement_id in (${(B.announcements.map((a) => a.id).join(',')) || 0})`), otherContextsAnnouncements: psql(app, `select count(*) from announcements where assoc_id=${A.id}`)};
            const filesAfter = listDir(publicDir(app, B.id));
            await snap(page, '104-hosted-after-remove', {dbAfter, filesAfter, dirExists: fs.existsSync(publicDir(app, B.id)), hostedRows: await page.locator('tr.gridRow').allInnerTexts().then((a) => a.map((t) => flat(t, 80))).catch(() => [])});
            log('cascade after:', JSON.stringify({dbAfter, filesAfter}));
            await signOut(page).catch(() => {});
            await publicRead(page, app, B.path, '105-cascade-public-after', {viewId: cascadeOneId});
        } finally { await close(); }
    }
});
