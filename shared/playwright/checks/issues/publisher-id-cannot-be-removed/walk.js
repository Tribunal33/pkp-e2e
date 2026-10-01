// Walk for docs/issues/U44-A2-publisher-id-cannot-be-removed.md (spec U44 register A2).
// Takes the report's Steps on a fresh load of PKP's default test dataset, through the screens:
//   Setup, as `rvaca`: Settings › Workflow › "Submission" › "Metadata": under "Publisher ID" tick
//     galleys (OJS, OPS) or chapters and publication formats (OMP); "Save".
//   As `dbarnes`, on each item (OJS submission 1 version 2's galley "PDF Version 2"; OPS submission 1's
//     galley "PDF"; OMP submission 4's chapter "Introduction: Contexts of Popular Culture" and format
//     "PDF"): "Edit" › "Identifiers", type u44r21-<item>, "Save"; reopen; empty the box, "Save"; reopen.
// PHASE=controls (on a fresh load) takes the control cases the fix must leave alone, on the galley (OJS, OPS) and the
//   chapter (OMP): a value saved and reopened; digits alone still refused; a changed value kept; and (OJS,
//   OMP) with the URN plugin on for galleys or chapters, the tab without the "Publisher ID" box (publisher
//   IDs switched off for that kind of item) saved, then publisher IDs switched on again: the value kept.
// The workflow pages are opened at the address their side-menu entry puts in the address bar
// (…/dashboard/editorial?workflowSubmissionId=<n>&workflowMenuKey=publication_<version>_<page> on main,
// …publication_<page> on 3.5, where the page shows the newest version). After each save the script reads
// the item's settings table (read only) to show what was stored. Records every screen with screen().
// Run (main): PROBE_FEATURE=issues-r21 PROBE_AGENT=r21 node bin/probe.js all shared/playwright/checks/issues/publisher-id-cannot-be-removed/walk.js
//   3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r21-3_5 PROBE_AGENT=r21 node bin/probe.js all …
//   PHASE=controls in front for the control checks.
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const PHASE = process.env.PHASE || 'walk';
const PREFIX = 'urn:nbn:de:0000-';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 3000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const vis = '[role="dialog"]:visible';
const topWin = (page) => page.locator(vis).last();
const wf = (page) => page.locator(vis).first();

// Per app: the submission, the items and where their settings live.
const ITEMS = {
    ojs: {sid: 1, items: [{kind: 'galley', page: 'galleys', row: 'PDF Version 2', value: 'u44r21-galley', box: 'galley', urnBox: 'enableRepresentationURN'}]},
    ops: {sid: 1, items: [{kind: 'galley', page: 'galleys', row: 'PDF', value: 'u44r21-galley', box: 'galley'}]},
    omp: {sid: 4, items: [
        {kind: 'chapter', page: 'chapters', row: 'Introduction: Contexts of Popular Culture', value: 'u44r21-chapter', box: 'chapter', urnBox: 'enableChapterURN'},
        {kind: 'format', page: 'publicationFormats', row: 'u44r21 EPUB', create: 'u44r21 EPUB', value: 'u44r21-format', box: 'representation'},
    ]},
};
const TABLES = {
    galley: "select s.galley_id || '=' || coalesce(s.setting_value, '(null)') from publication_galley_settings s where s.setting_name = 'pub-id::publisher-id' order by 1",
    chapter: "select s.chapter_id || '=' || coalesce(s.setting_value, '(null)') from submission_chapter_settings s where s.setting_name = 'pub-id::publisher-id' order by 1",
    format: "select s.publication_format_id || '=' || coalesce(s.setting_value, '(null)') from publication_format_settings s where s.setting_name = 'pub-id::publisher-id' order by 1",
};

forEachApp(async (app) => {
    const conf = ITEMS[app.name];
    const facts = {line: app.line || 'main', phase: PHASE};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const isMain = !app.line || app.line === 'main';
    const {page, close} = await launch(app);
    let n = 0;
    const nm = (x) => `w-${PHASE === 'walk' ? '' : 'n-'}${String(++n).padStart(2, '0')}-${x}`;
    const snap = async (name, extra = {}) => {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
        Object.assign(s, extra);
        record(name, s);
        await shot(page, name).catch(() => {});
        return s;
    };
    const stored = (kind) => sql(app, TABLES[kind]).split('\n').filter(Boolean);

    // ---- Settings › Workflow › "Submission" › "Metadata": the "Publisher ID" group
    async function setPublisherIdBoxes(states, name) {
        await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/workflow`));
        await idle(page);
        await page.locator('#metadata-button').first().click();
        const group = page.getByRole('group', {name: 'Publisher ID'});
        await group.waitFor({state: 'visible', timeout: T});
        const form = page.locator('form').filter({has: group});
        await idle(page);
        for (const [value, want] of Object.entries(states)) {
            const box = group.locator(`input[type=checkbox][value="${value}"]`);
            if (want) await box.check(); else await box.uncheck();
        }
        const w = page.waitForResponse((r) => /\/api\/v1\/contexts\//.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await w;
        const saved = await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 10_000}).then(() => true).catch(() => false);
        const boxes = await group.getByRole('checkbox').evaluateAll((els) => els.map((el) => ({label: ((el.closest('label') || {}).textContent || '').replace(/\s+/g, ' ').trim(), checked: el.checked})));
        const out = {status: r ? r.status() : null, saved, boxes};
        await snap(name, {settings: out});
        return out;
    }

    // ---- Settings › Website › Plugins: "URN" ticked, its settings window filled (control cases only)
    async function setUpUrn(urnBox, name) {
        const out = {};
        await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/website`));
        await idle(page);
        await page.locator('#plugins-button').click();
        const row = page.locator('#pluginGridContainer tr.gridRow[id$="-row-urnpubidplugin"]');
        await row.waitFor({timeout: T});
        await idle(page);
        const box = row.getByRole('checkbox').first();
        if (!(await box.isChecked())) {
            const w = page.waitForResponse((r) => /settings-plugin-grid\/enable/.test(r.url()), {timeout: T}).catch(() => null);
            await box.click();
            const r = await w;
            out.enableStatus = r ? r.status() : null;
            await idle(page);
            await sleep(800);
        }
        await row.locator('a.show_extras').first().click();
        await sleep(400);
        await page.locator('#pluginGridContainer tr[id$="-row-urnpubidplugin"] + tr').getByRole('link', {name: 'Settings', exact: true}).first().click();
        const f = page.locator('#urnSettingsForm');
        await f.locator('input[name="urnPrefix"]').waitFor({state: 'visible', timeout: T});
        await idle(page);
        await sleep(400);
        for (const b of ['enablePublicationURN', urnBox]) {
            const c = f.locator(`input[type=checkbox][name="${b}"]`);
            if (!(await c.isChecked())) await c.click();
        }
        await f.locator('input[name="urnPrefix"]').fill(PREFIX);
        await f.locator('input[type=radio][name="urnSuffix"][value="customId"]').check();
        await f.locator('select[name="urnNamespace"]').selectOption('urn:nbn:de');
        await f.locator('input[name="urnResolver"]').fill('https://nbn-resolving.de/');
        const w = page.waitForResponse((r) => r.request().method() === 'POST' && /manage/.test(r.url()), {timeout: T}).catch(() => null);
        await f.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await w;
        out.saveStatus = r ? r.status() : null;
        await f.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
        await idle(page);
        out.windowClosed = !(await f.isVisible().catch(() => false));
        await snap(name, {urn: out});
        return out;
    }

    // ---- The workflow's Publication pages and their legacy windows
    const pubId = () => Number(sql(app, `select max(publication_id) from publications where submission_id = ${conf.sid}`));
    async function openPage(key, name) {
        const menuKey = isMain ? `publication_${pubId()}_${key}` : `publication_${key}`;
        await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${conf.sid}&workflowMenuKey=${menuKey}`));
        await idle(page);
        await wf(page).waitFor({timeout: T}).catch(() => {});
        await wf(page).locator('tbody tr').first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        await sleep(500);
        if (name) await snap(name);
    }
    async function waitWindow() {
        await page.waitForFunction(() => { const d = [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length); return d.length >= 2 && d.pop().querySelector('form, [role=tab]'); }, null, {timeout: T}).catch(() => {});
        await idle(page);
        await sleep(500);
    }
    /** Open the item's edit window: a galley's or format's row arrow › "Edit"; a chapter's title. */
    async function openEdit(item, name) {
        await openPage(item.page);
        const panel = wf(page);
        let out = {};
        if (item.kind === 'chapter') {
            const link = panel.locator('tr.gridRow a').filter({hasText: item.row}).first();
            await link.waitFor({timeout: T});
            await link.click();
        } else if (item.kind === 'galley' && !(await panel.locator('tr.gridRow').filter({hasText: item.row}).count())) {
            // main: the Galleys page's own table; the row's "More Actions" › "Edit" opens the edit window.
            const row = panel.locator('tbody tr').filter({hasText: item.row}).first();
            await row.waitFor({timeout: T});
            await row.getByRole('button', {name: 'More Actions'}).click();
            await sleep(300);
            out.rowLinks = (await page.getByRole('menuitem').allInnerTexts().catch(() => [])).map((x) => x.trim());
            await page.getByRole('menuitem', {name: 'Edit', exact: true}).first().click();
        } else {
            const rows = item.kind === 'format'
                ? panel.locator('tr.gridRow').filter({has: page.locator('.onix_code')})
                : panel.locator('tr.gridRow');
            const row = rows.filter({hasText: item.row}).first();
            await row.waitFor({timeout: T});
            const id = await row.getAttribute('id');
            await row.locator('a.show_extras').first().click();
            await sleep(500);
            const ctl = page.locator(`[id="${id}-control-row"]`);
            out.rowLinks = await ctl.locator('a').evaluateAll((els) => els.filter((e) => e.getClientRects().length).map((e) => e.innerText.trim()).filter(Boolean)).catch(() => []);
            const a = ctl.getByRole('link', {name: 'Edit', exact: true}).first();
            if (!(await a.count())) { await snap(name, {edit: out}); return {...out, missing: 'Edit'}; }
            await a.click();
        }
        await waitWindow();
        out.tabs = (await topWin(page).locator('[role=tab]').allInnerTexts().catch(() => [])).map((x) => x.trim());
        await snap(name, {edit: out});
        return out;
    }
    const idForm = () => topWin(page).locator('#publicIdentifiersForm').first();
    async function readTab() {
        const f = idForm();
        if (!(await f.count())) return {formPresent: false};
        return f.evaluate((el) => {
            const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
            const box = el.querySelector('input[name="publisherId"]');
            return {
                formPresent: true,
                text: t(el).slice(0, 600),
                publisherIdBox: box ? {value: box.value, visible: box.getClientRects().length > 0} : null,
                urnArea: /URN/.test(t(el) || ''),
            };
        });
    }
    async function openIdTab(name) {
        const t = topWin(page).getByRole('tab', {name: 'Identifiers', exact: true});
        if (!(await t.count())) { await snap(name, {idTab: 'absent'}); return {absent: true}; }
        await t.click();
        await idle(page);
        await idForm().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        await sleep(300);
        const out = await readTab();
        await snap(name, {idTab: out});
        return out;
    }
    /** Type into "Publisher ID" (unless value is null: the box is not there) and press "Save". */
    async function saveTab(kind, value, name) {
        const f = idForm();
        const n0 = await page.locator(vis).count();
        if (value !== null) await f.locator('input[name="publisherId"]').fill(value);
        const w = page.waitForResponse((r) => /update-identifiers|updateIdentifiers/i.test(r.url()), {timeout: T}).catch(() => null);
        await f.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await w;
        let body = null;
        try { body = r ? await r.json() : null; } catch { body = null; }
        await idle(page);
        await sleep(900);
        await idle(page);
        const n1 = await page.locator(vis).count();
        const out = {
            status: r ? r.status() : null,
            answer: body ? {status: body.status, event: body.event ? flat(JSON.stringify(body.event), 200) : undefined, content: body.content ? '(form html)' : undefined} : null,
            windowClosed: n1 < n0,
        };
        if (!out.windowClosed) out.tab = await readTab();
        out.stored = stored(kind);
        await snap(name, {save: out});
        return out;
    }
    async function closeTopWin() {
        const c = topWin(page).getByRole('button', {name: /^Close/}).first();
        if (await c.count()) await c.click().catch(() => {});
        await idle(page);
        await sleep(800);
    }
    /** "Add publication format": a Name, the window's default format type, "OK" (the dataset's "PDF" is remotely hosted, so it has no "Identifiers" tab). */
    async function addFormat(item, name) {
        await openPage(item.page);
        await wf(page).getByText('Add publication format', {exact: true}).first().click();
        const f = page.locator('#addPublicationFormatForm');
        await f.locator('input[name="name[en]"]').waitFor({state: 'visible', timeout: T});
        await idle(page);
        await sleep(400);
        await f.locator('input[name="name[en]"]').fill(item.create);
        const entryKey = await f.locator('select[name="entryKey"]').evaluate((el) => el.options[el.selectedIndex] ? el.options[el.selectedIndex].text : null).catch(() => null);
        const w = page.waitForResponse((r) => /update-format|updateFormat/i.test(r.url()), {timeout: T}).catch(() => null);
        await f.getByRole('button', {name: 'OK', exact: true}).click();
        const r = await w;
        await idle(page);
        await sleep(1200);
        const out = {status: r ? r.status() : null, entryKey};
        await snap(name, {add: out});
        return out;
    }
    async function reopen(item, label) {
        await openEdit(item, nm(`${label}-edit`));
        return openIdTab(nm(`${label}-identifiers`));
    }

    try {
        const boxesOn = Object.fromEntries(conf.items.map((i) => [i.box, true]));
        if (PHASE === 'walk') {
            // Setup 1-3
            await signIn(page, 'rvaca');
            fact('setup: Publisher ID boxes', await setPublisherIdBoxes(boxesOn, nm('setup-settings')));
            await signOut(page);
            // 4
            await signIn(page, 'dbarnes');
            for (const item of conf.items) {
                const k = item.kind;
                if (item.create) fact(`${k} step5: Add publication format`, await addFormat(item, nm(`${k}-step5-add`)));
                // 5-6
                fact(`${k} step6: Edit`, await openEdit(item, nm(`${k}-step6-edit`)));
                fact(`${k} step6: Identifiers`, await openIdTab(nm(`${k}-step6-identifiers`)));
                // 7
                fact(`${k} step7: Save ${item.value}`, await saveTab(k, item.value, nm(`${k}-step7-save`)));
                // 8
                fact(`${k} step8: reopened`, await reopen(item, `${k}-step8`));
                // 9
                fact(`${k} step9: Save emptied`, await saveTab(k, '', nm(`${k}-step9-save-empty`)));
                // 10
                fact(`${k} step10: reopened`, await reopen(item, `${k}-step10`));
                await closeTopWin();
            }
        } else {
            const item = conf.items[0];
            const k = item.kind;
            await signIn(page, 'rvaca');
            fact('n-setup: Publisher ID on', await setPublisherIdBoxes({[item.box]: true}, nm('setup-settings')));
            if (item.urnBox) fact('n-setup: URN plugin', await setUpUrn(item.urnBox, nm('setup-urn')));
            await signOut(page);
            await signIn(page, 'dbarnes');
            await openEdit(item, nm('n1-edit'));
            await openIdTab(nm('n1-identifiers'));
            fact('n1: Save u44r21-keep', await saveTab(k, 'u44r21-keep', nm('n1-save')));
            fact('n1: reopened', await reopen(item, 'n1-reopen'));
            fact('n2: Save 12345 (refused by the tab\'s rule)', await saveTab(k, '12345', nm('n2-refused')));
            await closeTopWin();
            if (item.urnBox) {
                await signOut(page);
                await signIn(page, 'rvaca');
                fact('n3: Publisher ID off', await setPublisherIdBoxes({[item.box]: false}, nm('n3-off')));
                await signOut(page);
                await signIn(page, 'dbarnes');
                fact('n3: tab without the box', await reopen(item, 'n3-no-box'));
                fact('n3: Save (URN area only)', await saveTab(k, null, nm('n3-save')));
                await signOut(page);
                await signIn(page, 'rvaca');
                fact('n3: Publisher ID on again', await setPublisherIdBoxes({[item.box]: true}, nm('n3-on')));
                await signOut(page);
                await signIn(page, 'dbarnes');
                fact('n3: reopened with the box', await reopen(item, 'n3-reopen'));
            } else {
                await reopen(item, 'n4-open');
            }
            fact('n4: Save u44r21-new', await saveTab(k, 'u44r21-new', nm('n4-save')));
            fact('n4: reopened', await reopen(item, 'n4-reopen'));
            await closeTopWin();
        }
    } catch (e) {
        fact('error', String(e.message || e).slice(0, 600));
        await snap(nm('error')).catch(() => {});
    } finally {
        record(`w-${PHASE}-facts`, facts);
        await close();
    }
});
