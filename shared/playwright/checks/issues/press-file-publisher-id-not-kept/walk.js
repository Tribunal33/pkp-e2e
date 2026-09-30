// Kept walk for docs/issues/U44-OMP5-press-file-publisher-id-not-kept.md and
// docs/issues/U44-OMP5-press-file-publisher-id-box-gone-after-refusal.md (spec U44 register OMP5).
// Takes the reports' Steps on a fresh load of PKP's default test dataset (OMP), through the screens:
//   Setup, as `rvaca`: Settings › Workflow › "Submission" › "Metadata": tick "Enable for Files"; "Save".
//   A, as `dbarnes`: submission 14, Publication › "Publication Formats", "PDF" › "chapter1.pdf" › "Edit" ›
//     "Identifiers": type u44r9-file1, "Save"; reopen the tab.
//   B: on the reopened tab type 12345, "Save"; read the tab.
// PHASE=neighbour (on a fresh load) takes what the fixes must leave alone and what the first fix brings:
//   rvaca ticks "Enable for Publication Formats" and "Enable for Files"; dbarnes saves u44r9-fmt1 on the format
//   "PDF"'s own tab and reopens it; saves u44r9-file1 on "chapter1.pdf", then the same value on "chapter2.pdf"
//   (a duplicate the tab's own rule refuses once a file's value is kept); then rvaca unticks "Enable for Files"
//   and dbarnes reopens "chapter1.pdf"'s "Edit" (no "Identifiers" tab expected).
// The "Publication Formats" page is opened at the address its side-menu entry puts in the address bar
// (…/dashboard/editorial?workflowSubmissionId=14&workflowMenuKey=publication_<version>_publicationFormats on
// main, …publication_publicationFormats on 3.5). After each save the script reads submission_file_settings
// (read only) to show what was stored. Records every screen with screen(); prints one line per step.
// Run (main): PROBE_FEATURE=issues-r9 PROBE_AGENT=r9 node bin/probe.js omp shared/playwright/checks/issues/press-file-publisher-id-not-kept/walk.js
//   3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r9-3_5 PROBE_AGENT=r9 node bin/probe.js omp …
//   PHASE=neighbour in front for the neighbour checks.
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');

const T = 30_000;
const SID = 14;
const FORMAT = 'PDF';
const FILE1 = 'chapter1.pdf';
const FILE2 = 'chapter2.pdf';
const PHASE = process.env.PHASE || 'walk';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 3000) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const vis = '[role="dialog"]:visible';
const topWin = (page) => page.locator(vis).last();
const wf = (page) => page.locator(vis).first();

forEachApp(async (app) => {
    const facts = {line: app.line || 'main', phase: PHASE};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    if (app.name !== 'omp') { fact('surface', 'no Publisher ID for files on this app'); record(`w-${PHASE}-facts`, facts); return; }
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
    const stored = () => sql(app, "select sf.submission_file_id || ':' || coalesce((select setting_value from submission_file_settings n where n.submission_file_id = sf.submission_file_id and n.setting_name = 'name' and n.locale = 'en'), '') || '=' || s.setting_value from submission_file_settings s join submission_files sf on sf.submission_file_id = s.submission_file_id where s.setting_name = 'pub-id::publisher-id' order by 1").split('\n').filter(Boolean);

    // ---- Settings › Workflow › "Submission" › "Metadata": the "Publisher ID" group
    async function setPublisherIdBoxes(states, name) {
        await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/workflow`));
        await idle(page);
        await page.locator('#metadata-button').first().click();
        const form = page.locator('form').filter({has: page.getByRole('checkbox', {name: 'Enable keyword metadata', exact: true})});
        const group = form.getByRole('group', {name: 'Publisher ID'});
        await group.waitFor({state: 'visible', timeout: T});
        await idle(page);
        for (const [label, want] of Object.entries(states)) {
            const box = group.getByRole('checkbox', {name: label, exact: true});
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

    // ---- The workflow's "Publication Formats" page and its legacy windows
    const pubId = () => Number(sql(app, `select current_publication_id from submissions where submission_id = ${SID}`));
    async function openFormats(name) {
        const key = isMain ? `publication_${pubId()}_publicationFormats` : 'publication_publicationFormats';
        await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${SID}&workflowMenuKey=${key}`));
        await idle(page);
        await wf(page).waitFor({timeout: T}).catch(() => {});
        await wf(page).locator('a.pkp_linkaction_downloadFile').first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        await sleep(400);
        if (name) await snap(name);
    }
    /** The row's arrow, then its "Edit"; waits for the window's tabs. `kind`: 'file' (by file name) | 'format'. */
    async function openEdit(kind, text, name) {
        const panel = wf(page);
        const row = kind === 'file'
            ? panel.locator('tr.gridRow').filter({has: page.locator('a.pkp_linkaction_downloadFile')}).filter({hasText: text}).first()
            : panel.locator('tr.gridRow').filter({has: page.locator('.onix_code')}).filter({hasText: text}).first();
        await row.waitFor({timeout: T});
        const id = await row.getAttribute('id');
        await row.locator('a.show_extras').first().click();
        await sleep(500);
        const ctl = page.locator(`[id="${id}-control-row"]`);
        const links = await ctl.locator('a').evaluateAll((els) => els.filter((e) => e.getClientRects().length).map((e) => e.innerText.trim()).filter(Boolean)).catch(() => []);
        const a = ctl.getByRole('link', {name: 'Edit', exact: true}).first();
        if (!(await a.count())) { await snap(name, {rowLinks: links}); return {rowLinks: links, missing: 'Edit'}; }
        await a.click();
        await page.waitForFunction(() => { const d = [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length); return d.length >= 2 && d.pop().querySelector('form, [role=tab]'); }, null, {timeout: T}).catch(() => {});
        await idle(page);
        await sleep(500);
        const tabs = (await topWin(page).locator('[role=tab]').allInnerTexts().catch(() => [])).map((x) => x.trim());
        const title = await topWin(page).locator('h1, .pkp_modal_panel > .header, .ui-dialog-title').first().innerText().catch(() => null);
        const out = {rowLinks: links, tabs, title: flat(title, 200)};
        await snap(name, {edit: out});
        return out;
    }
    const idForm = () => topWin(page).locator('#publicIdentifiersForm').first();
    async function readTab() {
        const f = idForm();
        if (!(await f.count())) return {formPresent: false};
        const out = await f.evaluate((el) => {
            const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
            const box = el.querySelector('input[name="publisherId"]');
            const label = box && box.id ? el.querySelector(`label[for="${box.id}"]`) : null;
            return {
                formPresent: true,
                text: t(el),
                publisherIdBox: box ? {value: box.value, visible: box.getClientRects().length > 0, label: t(label)} : null,
                buttons: [...el.querySelectorAll('button')].filter((b) => b.getClientRects().length).map(t),
                links: [...el.querySelectorAll('a')].filter((a) => a.getClientRects().length).map(t).filter(Boolean),
            };
        });
        return out;
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
    /** Type into "Publisher ID" and press "Save"; the save's answer, whether the window closed, the tab after. */
    async function saveTab(value, name) {
        const f = idForm();
        const n0 = await page.locator(vis).count();
        await f.locator('input[name="publisherId"]').fill(value);
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
        out.stored = stored();
        await snap(name, {save: out});
        return out;
    }
    async function closeTopWin() {
        const c = topWin(page).getByRole('button', {name: /^Close/}).first();
        if (await c.count()) await c.click().catch(() => {});
        await idle(page);
        await sleep(800);
    }

    try {
        if (PHASE === 'walk') {
            // Setup: rvaca ticks "Enable for Files".
            await signIn(page, 'rvaca');
            fact('setup: Enable for Files', await setPublisherIdBoxes({'Enable for Files': true}, nm('setup-settings')));
            await signOut(page);
            // A. 4-7
            await signIn(page, 'dbarnes');
            await openFormats(nm('step5-formats'));
            fact('step6: Edit chapter1.pdf', await openEdit('file', FILE1, nm('step6-edit')));
            fact('step7: Identifiers', await openIdTab(nm('step7-identifiers')));
            // 8
            fact('step8: Save u44r9-file1', await saveTab('u44r9-file1', nm('step8-save')));
            // 9
            await openFormats();
            fact('step9: Edit again', await openEdit('file', FILE1, nm('step9-edit')));
            fact('step9: Identifiers reopened', await openIdTab(nm('step9-identifiers')));
            // B. 10
            fact('step10: Save 12345', await saveTab('12345', nm('step10-refused')));
        } else {
            await signIn(page, 'rvaca');
            fact('n-setup: formats and files on', await setPublisherIdBoxes({'Enable for Publication Formats': true, 'Enable for Files': true}, nm('setup-settings')));
            await signOut(page);
            await signIn(page, 'dbarnes');
            // The format's own tab, which already keeps its value.
            await openFormats(nm('formats'));
            fact('n1: format Edit', await openEdit('format', FORMAT, nm('format-edit')));
            fact('n1: format Identifiers', await openIdTab(nm('format-identifiers')));
            fact('n1: format Save u44r9-fmt1', await saveTab('u44r9-fmt1', nm('format-save')));
            await openFormats();
            await openEdit('format', FORMAT, nm('format-edit-again'));
            fact('n1: format reopened', await openIdTab(nm('format-reopened')));
            fact('n1b: format Save 12345', await saveTab('12345', nm('format-refused')));
            await closeTopWin();
            // A file's value, then the same value on another file.
            await openFormats();
            await openEdit('file', FILE1, nm('file1-edit'));
            await openIdTab(nm('file1-identifiers'));
            fact('n2: file1 Save u44r9-file1', await saveTab('u44r9-file1', nm('file1-save')));
            await openFormats();
            await openEdit('file', FILE2, nm('file2-edit'));
            await openIdTab(nm('file2-identifiers'));
            fact('n2: file2 Save the same u44r9-file1', await saveTab('u44r9-file1', nm('file2-duplicate')));
            await signOut(page);
            // "Enable for Files" unticked: the file's window without the tab.
            await signIn(page, 'rvaca');
            fact('n3: Enable for Files off', await setPublisherIdBoxes({'Enable for Files': false}, nm('files-off-settings')));
            await signOut(page);
            await signIn(page, 'dbarnes');
            await openFormats();
            fact('n3: file1 Edit with files off', await openEdit('file', FILE1, nm('file1-edit-off')));
        }
    } catch (e) {
        fact('error', String(e.message || e).slice(0, 600));
        await snap(nm('error')).catch(() => {});
    } finally {
        record(`w-${PHASE}-facts`, facts);
        await close();
    }
});
