// Kept walk for docs/issues/U44-A5-new-version-galley-publisher-id-refused.md (spec U44 register A5).
// Takes the report's Steps on a fresh load of PKP's default test dataset, through the screens:
//   Setup, as `rvaca`: Settings › Workflow › "Submission" › "Metadata": under "Publisher ID" tick the
//     galleys box (OJS, OPS) or the chapters and publication formats boxes (OMP); "Save".
//   As `dbarnes`: on each item of the published version (OJS submission 17's galley "PDF"; OPS
//     submission 2's galley "PDF"; OMP submission 14's format "PDF" and chapter "Chapter 1: …"):
//     "Edit" › "Identifiers", type u44r22-<g|f|c>1, "Save". Then "Create New Version" (keep the window's
//     choices, "Confirm"; 3.5: the button beside "Unpublish", "Yes"). On the new version's copy of each
//     item: "Identifiers", "Save" unchanged; then u44r22-<g|f|c>2, "Save"; reopen.
// PHASE=neighbour (on a fresh load) takes what the fix must leave alone: u44r22-<g|f|c>1 saved on the
//   same items of the published version, then the same value typed on another submission's item
//   (OJS submission 1's "PDF Version 2", OPS submission 1's "PDF", OMP submission 5's format "PDF" and
//   chapter "Prologue"): refused, with the fix and without it.
// The workflow pages are opened at the address their side-menu entry puts in the address bar
// (…/dashboard/editorial?workflowSubmissionId=<n>&workflowMenuKey=publication_<version>_<page> on main,
// …publication_<page> on 3.5, where the page shows the newest version). After each save the script reads
// the item kind's settings table (read only) to show what was stored. Records every screen with screen().
// Run (main): PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/new-version-galley-publisher-id-refused/walk.js
//   3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front (a stable-3_5_0 dataset fleet's feature).
//   PHASE=neighbour in front for the neighbour check.
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const PHASE = process.env.PHASE || 'walk';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 3000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const vis = '[role="dialog"]:visible';
const topWin = (page) => page.locator(vis).last();
const wf = (page) => page.locator(vis).first();

// Per app: the submission, its items, and the other submission's items for the neighbour check.
const CONF = {
    ojs: {sid: 17, boxes: {galley: true}, items: [{kind: 'galley', page: 'galleys', row: 'PDF', value: 'u44r22-g'}],
        other: {sid: 1, items: [{kind: 'galley', page: 'galleys', row: 'PDF Version 2'}]}},
    ops: {sid: 2, boxes: {galley: true}, items: [{kind: 'galley', page: 'galleys', row: 'PDF', value: 'u44r22-g'}],
        other: {sid: 1, items: [{kind: 'galley', page: 'galleys', row: 'PDF'}]}},
    omp: {sid: 14, boxes: {chapter: true, representation: true}, items: [
        {kind: 'format', page: 'publicationFormats', row: 'PDF', value: 'u44r22-f'},
        {kind: 'chapter', page: 'chapters', row: 'Chapter 1: Mind Control', value: 'u44r22-c'},
    ], other: {sid: 5, items: [
        {kind: 'format', page: 'publicationFormats', row: 'PDF'},
        {kind: 'chapter', page: 'chapters', row: 'Prologue'},
    ]}},
};
const TABLES = {
    galley: "select s.galley_id || ':' || g.publication_id || '=' || s.setting_value from publication_galley_settings s join publication_galleys g using (galley_id) where s.setting_name = 'pub-id::publisher-id' order by 1",
    chapter: "select s.chapter_id || ':' || c.publication_id || '=' || s.setting_value from submission_chapter_settings s join submission_chapters c using (chapter_id) where s.setting_name = 'pub-id::publisher-id' order by 1",
    format: "select s.publication_format_id || ':' || f.publication_id || '=' || s.setting_value from publication_format_settings s join publication_formats f using (publication_format_id) where s.setting_name = 'pub-id::publisher-id' order by 1",
};

forEachApp(async (app) => {
    const conf = CONF[app.name];
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
    const pubId = (sid) => Number(sql(app, `select max(publication_id) from publications where submission_id = ${sid}`));

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

    // ---- The workflow's Publication pages and their legacy windows
    async function openPage(sid, key, name) {
        const menuKey = isMain ? `publication_${pubId(sid)}_${key}` : `publication_${key}`;
        await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${sid}&workflowMenuKey=${menuKey}`));
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
    /** Open the item's edit window: a galley's "More Actions" › "Edit"; a format's row arrow › "Edit"; a chapter's title. */
    async function openEdit(sid, item, name) {
        await openPage(sid, item.page);
        const panel = wf(page);
        const out = {sid, publication: pubId(sid)};
        if (item.kind === 'chapter') {
            const link = panel.locator('tr.gridRow a').filter({hasText: item.row}).first();
            await link.waitFor({timeout: T});
            await link.click();
        } else if (item.kind === 'galley' && !(await panel.locator('tr.gridRow').filter({hasText: item.row}).count())) {
            // main: the Galleys page's own table; the row's "More Actions" › "Edit" opens the edit window.
            const row = panel.locator('tbody tr').filter({has: page.getByText(item.row, {exact: true})}).first();
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
            const errs = [...el.querySelectorAll('.error, label.error, .pkp_form_error, [id$="-error"]')].map(t).filter(Boolean);
            return {
                formPresent: true,
                text: t(el).slice(0, 900),
                publisherIdBox: box ? {value: box.value, visible: box.getClientRects().length > 0} : null,
                errors: [...new Set(errs)],
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
    /** Type into "Publisher ID" (value null: leave the box as it is) and press "Save". */
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
        if ((await page.locator(vis).count()) < 2) return;
        const c = topWin(page).getByRole('button', {name: /^Close/}).first();
        if (await c.count()) await c.click().catch(() => {});
        await idle(page);
        await sleep(800);
    }
    /** "Create New Version" in the side menu (main: the version window, keeping its choices, "Confirm"; 3.5: the button beside "Unpublish", "Yes"). */
    async function createNewVersion(sid, name) {
        await openPage(sid, 'titleAbstract');
        const out = {before: pubId(sid)};
        const w = page.waitForResponse((r) => /\/publications\/\d+\/version/.test(r.url()) && r.request().method() === 'POST', {timeout: T}).catch(() => null);
        if (isMain) {
            const d = wf(page);
            await d.getByRole('link', {name: 'Create New Version', exact: true}).or(d.getByRole('button', {name: 'Create New Version', exact: true})).first().click();
            const win = page.getByRole('dialog').filter({has: page.locator('select[name="versionStage"]')}).last();
            await win.locator('select[name="versionStage"]').waitFor({state: 'visible', timeout: T});
            await idle(page);
            await sleep(1500);
            const stage = win.locator('select[name="versionStage"]');
            out.stageOffered = await stage.evaluate((el) => (el.options[el.selectedIndex] || {}).text || '').catch(() => null);
            if (!(await stage.inputValue())) {
                const first = await stage.evaluate((el) => [...el.options].map((o) => o.value).find(Boolean));
                await stage.selectOption(first);
                out.stageChosen = first;
            }
            const minor = win.locator('select[name="versionIsMinor"]');
            if (await minor.isVisible().catch(() => false)) {
                out.minorOffered = await minor.evaluate((el) => (el.options[el.selectedIndex] || {}).text || '');
                if (!(await minor.inputValue())) { await minor.selectOption('true').catch(() => minor.selectOption('false')); out.minorChosen = await minor.inputValue(); }
            }
            await snap(`${name}-window`);
            await win.getByRole('button', {name: 'Confirm', exact: true}).click();
        } else {
            await wf(page).getByRole('button', {name: 'Create New Version', exact: true}).click();
            const confirm = page.getByRole('dialog').filter({hasText: 'Create New Version'}).last();
            await confirm.getByRole('button', {name: 'Yes', exact: true}).waitFor({state: 'visible', timeout: T});
            await snap(`${name}-window`);
            await confirm.getByRole('button', {name: 'Yes', exact: true}).click();
        }
        const r = await w;
        out.status = r ? r.status() : null;
        await idle(page);
        await sleep(1200);
        out.after = pubId(sid);
        out.sideMenu = flat(await wf(page).locator('nav').first().innerText().catch(() => ''), 600);
        await snap(`${name}-done`, {version: out});
        return out;
    }
    async function reopen(sid, item, label) {
        await openEdit(sid, item, nm(`${label}-edit`));
        return openIdTab(nm(`${label}-identifiers`));
    }

    try {
        await signIn(page, 'rvaca');
        fact('setup: Publisher ID boxes', await setPublisherIdBoxes(conf.boxes, nm('setup-settings')));
        await signOut(page);
        await signIn(page, 'dbarnes');
        // Steps 2-5: the published version's items get their publisher IDs.
        for (const item of conf.items) {
            const k = item.kind;
            fact(`${k} step4: Edit`, await openEdit(conf.sid, item, nm(`${k}-step4-edit`)));
            fact(`${k} step4: Identifiers`, await openIdTab(nm(`${k}-step4-identifiers`)));
            fact(`${k} step5: Save ${item.value}1`, await saveTab(k, `${item.value}1`, nm(`${k}-step5-save`)));
            await closeTopWin();
        }
        if (PHASE === 'walk') {
            // Step 6
            fact('step6: Create New Version', await createNewVersion(conf.sid, nm('step6-version')));
            // Steps 7-9 on the new version's copies
            for (const item of conf.items) {
                const k = item.kind;
                fact(`${k} step7: the copy's Identifiers`, await reopen(conf.sid, item, `${k}-step7`));
                const s8 = await saveTab(k, null, nm(`${k}-step8-save-unchanged`));
                fact(`${k} step8: Save unchanged`, s8);
                // With the fix in, step 8 closes the window: reopen it for the way round.
                if (s8.windowClosed) await reopen(conf.sid, item, `${k}-step8-reopen`);
                fact(`${k} step9: Save ${item.value}2`, await saveTab(k, `${item.value}2`, nm(`${k}-step9-save-new`)));
                fact(`${k} step9: reopened`, await reopen(conf.sid, item, `${k}-step9-reopen`));
                await closeTopWin();
            }
        } else {
            // Neighbour: another submission's item may not take the same value.
            for (const [i, item] of conf.other.items.entries()) {
                const k = item.kind;
                const value = `${conf.items.find((x) => x.kind === k).value}1`;
                fact(`${k} n1: other submission ${conf.other.sid}`, await reopen(conf.other.sid, item, `${k}-n1`));
                fact(`${k} n1: Save ${value} (must be refused)`, await saveTab(k, value, nm(`${k}-n1-save`)));
                await closeTopWin();
                void i;
            }
        }
    } catch (e) {
        fact('error', String(e.message || e).slice(0, 600));
        await snap(nm('error')).catch(() => {});
    } finally {
        record(`w-${PHASE}-facts`, facts);
        await close();
    }
});
