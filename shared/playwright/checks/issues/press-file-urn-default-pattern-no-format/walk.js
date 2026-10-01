// Kept walk for docs/issues/U44-OMP6-press-file-urn-default-pattern-no-format.md (spec U44 register OMP6).
// Takes the report's Steps on a fresh load of PKP's default test dataset (OMP), through the screens:
//   1-4, as `rvaca`: Settings › Website › "Plugins": tick "URN"; its "Settings": tick "Publication Formats" and
//        "Files", prefix urn:nbn:de:0000-, "Use default patterns." (its lines are read), namespace urn:nbn:de,
//        resolver https://nbn-resolving.de/, "Save".
//   5-8, as `dbarnes`: submission 14, Publication › "Publication Formats": "PDF" › "Edit" › "Identifiers" (the
//        format's preview); "chapter1.pdf" › "Edit" › "Identifiers" (the file's preview); "Save" with the assign
//        box as offered; the file's tab reopened (the URN now assigned).
// PHASE=neighbour (on a fresh load) reads what the fix must leave alone and the same root under own patterns:
//   rvaca ticks all four "Press Content" boxes with default patterns; dbarnes reads the previews of the chapter
//   "Chapter 1: Mind Control…", the format "PDF" and the file "chapter1.pdf"; rvaca switches to "Use the pattern
//   entered below…" with the window's own patterns (%p.%m, %p.%m.c%c, %p.%m.%f, %p.%m.%f.%s); dbarnes reads the
//   three previews again. Nothing is saved on a tab. Run it with the fix in and out.
// The workflow pages are opened at the address their side-menu entry puts in the address bar
// (…workflowMenuKey=publication_<version>_publicationFormats on main, …publication_publicationFormats on 3.5).
// After the save the script reads submission_file_settings (read only) to show what was stored.
// Run (main): PROBE_FEATURE=issues-r33 PROBE_AGENT=r33 node bin/probe.js omp shared/playwright/checks/issues/press-file-urn-default-pattern-no-format/walk.js
//   3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r33-3_5 PROBE_AGENT=r33 node bin/probe.js omp …
//   PHASE=neighbour in front for the neighbour check.
const {forEachApp, launch, signIn, signOut, record, idle, sql} = require('../../../probe');
const L = require('../urn-check-number-wrong-digit/lib');
const A8 = require('../urn-suffix-pattern-refusal-text-code/lib');

const {T, PREFIX, sleep, flat, wf, isMain, snap, openIdTab, openChapterWindow, closeTopWin, topWin} = L;
const SID = 14;
const FORMAT = 'PDF';
const FILE = 'chapter1.pdf';
const CHAPTER = 'Chapter 1: Mind Control';
const PHASE = process.env.PHASE || 'walk';
const PATTERNS = {urnPublicationSuffixPattern: '%p.%m', urnChapterSuffixPattern: '%p.%m.c%c', urnRepresentationSuffixPattern: '%p.%m.%f', urnSubmissionFileSuffixPattern: '%p.%m.%f.%s'};

forEachApp(async (app) => {
    const facts = {line: app.line || 'main', phase: PHASE};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`); };
    if (app.name !== 'omp') { fact('surface', 'no publication formats or format files on this app'); record(`w-${PHASE}-facts`, facts); return; }
    const {page, close} = await launch(app);
    let n = 0;
    const nm = (x) => `w-${PHASE === 'walk' ? '' : 'n-'}${String(++n).padStart(2, '0')}-${x}`;
    const pid = () => Number(sql(app, `select current_publication_id from submissions where submission_id = ${SID}`));
    const ids = () => ({
        format: sql(app, `select pf.publication_format_id from publication_formats pf join publication_format_settings s on s.publication_format_id = pf.publication_format_id and s.setting_name = 'name' and s.locale = 'en' where pf.publication_id = ${pid()} and s.setting_value = '${FORMAT}'`),
        file: sql(app, `select sf.submission_file_id || ' (assoc ' || sf.assoc_type || ':' || sf.assoc_id || ')' from submission_files sf join submission_file_settings s on s.submission_file_id = sf.submission_file_id and s.setting_name = 'name' and s.locale = 'en' where sf.submission_id = ${SID} and sf.file_stage = 10 and s.setting_value = '${FILE}'`),
    });
    const stored = () => sql(app, "select submission_file_id || '=' || setting_value from submission_file_settings where setting_name = 'pub-id::other::urn' order by 1").split('\n').filter(Boolean);

    /** Steps 2-4: Settings on the URN row, tick `kinds`, prefix, the suffix choice (and patterns), namespace, resolver, "Save". */
    async function configure(name, {kinds, suffix, patterns}) {
        const out = {};
        out.open = await A8.openUrnSettings(page, app, `${name}-open`);
        const f = A8.form(page);
        for (const k of ['enablePublicationURN', 'enableChapterURN', 'enableRepresentationURN', 'enableSubmissionFileURN']) {
            const c = f.locator(`input[type=checkbox][name="${k}"]`);
            if ((await c.count()) && (await c.isChecked()) !== kinds.includes(k)) await c.click();
        }
        await f.locator('input[name="urnPrefix"]').fill(PREFIX);
        await f.locator(`input[type=radio][name="urnSuffix"][value="${suffix}"]`).check();
        await sleep(300);
        out.defaultPatternLines = flat(await f.locator('input#urnSuffixDefault').locator('xpath=ancestor::*[contains(@class,"section")][1]').innerText().catch(() => null), 600);
        if (patterns) for (const [box, v] of Object.entries(patterns)) await f.locator(`input[name="${box}"]`).fill(v);
        await f.locator('select[name="urnNamespace"]').selectOption('urn:nbn:de');
        await f.locator('input[name="urnResolver"]').fill('https://nbn-resolving.de/');
        await snap(page, `${name}-filled`);
        const w = page.waitForResponse((r) => r.request().method() === 'POST' && /manage/.test(r.url()), {timeout: T}).catch(() => null);
        await f.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await w;
        out.saveStatus = r ? r.status() : null;
        await f.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
        await idle(page);
        await sleep(600);
        out.windowClosed = !(await f.isVisible().catch(() => false));
        await snap(page, `${name}-saved`, {setup: out});
        return out;
    }

    async function openFormats(name) {
        const key = isMain(app) ? `publication_${pid()}_publicationFormats` : 'publication_publicationFormats';
        await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${SID}&workflowMenuKey=${key}`));
        await idle(page);
        await wf(page).locator('a.pkp_linkaction_downloadFile').first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        await sleep(400);
        if (name) await snap(page, name);
    }
    /** A row's arrow, then its "Edit"; waits for the window's tabs. `kind`: 'file' (by file name) | 'format'. */
    async function openEdit(kind, text, name) {
        const panel = wf(page);
        const row = kind === 'file'
            ? panel.locator('tr.gridRow').filter({has: page.locator('a.pkp_linkaction_downloadFile')}).filter({hasText: text}).first()
            : panel.locator('tr.gridRow').filter({has: page.locator('.onix_code')}).filter({hasText: text}).first();
        await row.waitFor({timeout: T});
        const id = await row.getAttribute('id');
        await row.locator('a.show_extras').first().click();
        await sleep(500);
        await page.locator(`[id="${id}-control-row"]`).getByRole('link', {name: 'Edit', exact: true}).first().click();
        await page.waitForFunction(() => { const d = [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length); return d.length >= 2 && d.pop().querySelector('[role=tab]'); }, null, {timeout: T}).catch(() => {});
        await idle(page);
        await sleep(500);
        const tabs = (await topWin(page).locator('[role=tab]').allInnerTexts().catch(() => [])).map((x) => x.trim());
        await snap(page, name, {tabs});
        return {tabs};
    }
    /** The URN area's first line: the preview (or the assigned URN). */
    const urnOf = (tab) => (tab && tab.paragraphs ? tab.paragraphs[0] : null);
    async function saveIdTab(name) {
        const f = topWin(page).locator('#publicIdentifiersForm').first();
        const box = f.locator('input[type=checkbox][name="assignURN"]');
        const out = {assignBox: (await box.count()) ? {checked: await box.isChecked(), label: flat(await f.locator('label[for^="assignURN"]').first().innerText().catch(() => null), 300)} : null};
        const n0 = await page.locator('[role="dialog"]:visible').count();
        const w = page.waitForResponse((r) => /update-identifiers|updateIdentifiers/i.test(r.url()), {timeout: T}).catch(() => null);
        await f.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await w;
        out.status = r ? r.status() : null;
        await idle(page);
        await sleep(900);
        out.windowClosed = (await page.locator('[role="dialog"]:visible').count()) < n0;
        out.stored = stored();
        await snap(page, name, {save: out});
        return out;
    }
    /** The previews of the chapter, the format and the file, each window closed after its read. */
    async function readThree(tag) {
        const out = {};
        await openChapterWindow(page, app, SID, pid(), CHAPTER, nm(`${tag}-chapter-edit`));
        out.chapter = urnOf(await openIdTab(page, nm(`${tag}-chapter-identifiers`)));
        await closeTopWin(page);
        await openFormats();
        await openEdit('format', FORMAT, nm(`${tag}-format-edit`));
        out.format = urnOf(await openIdTab(page, nm(`${tag}-format-identifiers`)));
        await closeTopWin(page);
        await openFormats();
        await openEdit('file', FILE, nm(`${tag}-file-edit`));
        out.file = urnOf(await openIdTab(page, nm(`${tag}-file-identifiers`)));
        await closeTopWin(page);
        return out;
    }

    try {
        fact('ids (read only)', ids());
        if (PHASE === 'walk') {
            // 1-4
            await signIn(page, 'rvaca');
            fact('step2-4: URN settings', await configure(nm('step2-4-urn-settings'), {kinds: ['enableRepresentationURN', 'enableSubmissionFileURN'], suffix: 'default'}));
            await signOut(page);
            // 5-6
            await signIn(page, 'dbarnes');
            await openFormats(nm('step6-formats'));
            await openEdit('format', FORMAT, nm('step6-format-edit'));
            const fmt = await openIdTab(page, nm('step6-format-identifiers'));
            fact('step6: format PDF preview', {urn: urnOf(fmt), area: fmt.urnArea});
            await closeTopWin(page);
            // 7
            await openFormats();
            await openEdit('file', FILE, nm('step7-file-edit'));
            const file = await openIdTab(page, nm('step7-file-identifiers'));
            fact('step7: file chapter1.pdf preview', {urn: urnOf(file), area: file.urnArea});
            // 8
            fact('step8: Save', await saveIdTab(nm('step8-save')));
            await openFormats();
            await openEdit('file', FILE, nm('step8-file-edit-again'));
            const again = await openIdTab(page, nm('step8-file-identifiers-again'));
            fact('step8: file tab reopened', {urn: urnOf(again), area: again.urnArea});
        } else {
            await signIn(page, 'rvaca');
            fact('n-setup: all four, default patterns', await configure(nm('setup-default'), {kinds: ['enablePublicationURN', 'enableChapterURN', 'enableRepresentationURN', 'enableSubmissionFileURN'], suffix: 'default'}));
            await signOut(page);
            await signIn(page, 'dbarnes');
            fact('n1: default patterns: chapter, format, file previews', await readThree('default'));
            await signOut(page);
            await signIn(page, 'rvaca');
            fact('n-setup: own patterns', await configure(nm('setup-pattern'), {kinds: ['enablePublicationURN', 'enableChapterURN', 'enableRepresentationURN', 'enableSubmissionFileURN'], suffix: 'pattern', patterns: PATTERNS}));
            await signOut(page);
            await signIn(page, 'dbarnes');
            fact('n2: own patterns: chapter, format, file previews', await readThree('pattern'));
            fact('n: stored file URNs', stored());
        }
    } catch (e) {
        fact('error', String(e.message || e).slice(0, 600));
        await snap(page, nm('error')).catch(() => {});
    } finally {
        record(`w-${PHASE}-facts`, facts);
        await close();
    }
});
