// Issue report walk: docs/issues/U19-A19-oai-deleted-section-set-lists-nothing.md
// (spec U19 register A19). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// OJS and OPS (OMP's series sets are another code path): its `dbarnes`,
// `publicknowledge`, OJS submission 5 "Genetic transformation of forest trees"
// and its issue "Vol. 1 No. 2 (2014)", OPS submission 1 "The influence of
// lactation …". The one section the steps delete is created on screen, named
// "Commentary u19w17"; the kit builds nothing. Step numbers are the report's:
//   1  dbarnes: Settings › Journal (Server) › Sections › "Create Section":
//      "Commentary u19w17", abbreviation "COM" (OPS: URL path "commentary-u19w17") › "Save"
//   2  dbarnes: the submission › "Publication Settings" (OPS "Preprint entry"):
//      OJS "Assign To Current/Back Issue" + "Vol. 1 No. 2 (2014)"; "Section"
//      "Commentary u19w17" › "Save" (3.5: OJS's page is "Issue", with the
//      section only; the issue is chosen in the window step 3 opens)
//   3  "Publish" (OPS "Post") and its confirmation
//   4  "Unpublish" (OPS "Unpost") and its confirmation
//   5  "Section" back to "Articles" (OPS "Preprints") › "Save"
//   6  Settings › Sections › "Commentary u19w17" › "Delete" › "OK"
//   7  signed out: ListSets
//   8  signed out: ListIdentifiers oai_dc (no set; control)
//   9  signed out: ListIdentifiers oai_dc set=publicknowledge:COM
//   10 signed out: the same at the site-wide address /index.php/index/oai
//   n1 (neighbour, after the steps) set=publicknowledge:NOPE, a set that never
//      existed, and set=publicknowledge:ART (OJS) / :PRE (OPS), a live section
// Each OAI read records the browser view (screen()) and the raw answer's
// headers; beside it (Evidence only) the stored tombstone rows.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w17 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-w17 PROBE_AGENT=w17 ONLY=ojs,ops node bin/probe.js all shared/playwright/checks/issues/oai-deleted-section-set-lists-nothing/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w17-3_5 PROBE_AGENT=w17 ONLY=ojs,ops node bin/probe.js all <this file>
// Facts: .reports/<feature>/w17/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');

const T = 30_000;
const TITLE = 'Commentary u19w17';
const ABBREV = 'COM';
const ISSUE = 'Vol. 1 No. 2 (2014)';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();

/** The OAI answer as data: error, headers, sets. */
function parseOai(body) {
    const records = [];
    const re = /<header( status="deleted")?>([\s\S]*?)<\/header>/g;
    let m;
    while ((m = re.exec(body))) {
        const inner = m[2];
        records.push({
            identifier: (inner.match(/<identifier>([^<]+)<\/identifier>/) || [])[1] || null,
            deleted: !!m[1],
            setSpecs: [...inner.matchAll(/<setSpec>([^<]+)<\/setSpec>/g)].map((x) => x[1]),
        });
    }
    const sets = [...body.matchAll(/<set>\s*<setSpec>([^<]*)<\/setSpec>\s*<setName>([^<]*)<\/setName>/g)].map((x) => `${x[1]} "${x[2]}"`);
    return {error: (body.match(/<error code="([^"]+)">([^<]*)<\/error>/) || [null]).slice(1).join(': ') || null, records, sets};
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    if (app.name === 'omp') return;
    const ojs = app.name === 'ojs';
    const line = app.line || 'main';
    const legacy = line !== 'main';
    const ctx = app.contextPath;
    const loc = ['stable-3_4_0', 'stable-3_3_0'].includes(line) ? '' : '/en';
    const id = ojs ? 5 : 1;
    const home = ojs ? 'Articles' : 'Preprints';
    const liveAbbrev = ojs ? 'ART' : 'PRE';
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`); };
    fact('fleet', {line, dataset: app.dataset, port: app.port, run: process.env.PROBE_RUN || null});
    let n = 0;
    const rec = async (page, label) => {
        const name = `${String(++n).padStart(2, '0')}-${label}`;
        try { record(name, await screen(page)); } catch (e) { record(name, {error: String(e).slice(0, 300), url: page.url()}); }
    };
    const tombs = () => (sql(app, "select t.oai_identifier||' set_spec='||t.set_spec||' set_name='||t.set_name||' objects='||coalesce((select string_agg(o.assoc_type||':'||o.assoc_id, ',' order by o.assoc_type) from data_object_tombstone_oai_set_objects o where o.tombstone_id=t.tombstone_id),'') from data_object_tombstones t order by t.tombstone_id") || '').trim().split('\n').filter(Boolean);

    // Signed out: a browser types the OAI address; the raw answer comes from the same context.
    const oai = async (label, where, q) => {
        const {page, close} = await launch(app);
        try {
            const rel = `/index.php/${where}/oai?${q}`;
            await page.goto(app.url(rel));
            await pause(200);
            await rec(page, `oai-${label}`);
            const res = await page.request.get(app.url(rel));
            const body = await res.text();
            record(`${String(n).padStart(2, '0')}-oai-${label}-raw`, {address: rel, body: body.slice(0, 6000)});
            const o = parseOai(body);
            return {address: rel, status: res.status(), error: o.error, sets: o.sets.length ? o.sets : undefined,
                records: o.records.map((r) => `${r.identifier.replace(/^oai:[^:]+:/, '')}${r.deleted ? ' (deleted)' : ''} [${r.setSpecs.join(', ')}]`)};
        } finally { await close(); }
    };

    // ---- Settings › Sections ----
    const sectionsTab = (page) => {
        const {SectionsTab} = require('../../../pages/SectionsPages.js');
        return new SectionsTab(page, ctx, {locale: loc.replace('/', '')});
    };

    // ---- the workflow ----
    // main: the workflow's right-hand controls; 3.5: the version's own bar above the form.
    const control = async (page, name) => {
        const r = page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name}).filter({visible: true});
        return (await r.count()) ? r.first() : page.getByRole('button', {name}).filter({visible: true}).last();
    };
    const status = async (page) => flat(await page.locator('[data-cy="workflow-controls-left"]').innerText().catch(() => ''));
    const openEntry = async (page) => {
        await page.goto(app.url(`/index.php/${ctx}${loc}/dashboard/editorial?workflowSubmissionId=${id}`));
        await idle(page); await pause(1500);
        const ta = page.getByRole('link', {name: 'Title & Abstract', exact: true}).first();
        if (!(await ta.isVisible().catch(() => false))) await page.getByRole('link', {name: /^(Publication|Preprint)$/}).first().click();
        await ta.waitFor({timeout: T});
        const entry = ojs ? (legacy ? 'Issue' : 'Publication Settings') : 'Preprint entry';
        await page.getByRole('link', {name: entry, exact: true}).first().click();
        await page.locator('select[name="sectionId"]').waitFor({timeout: T});
        await idle(page); await pause(800);
    };
    const form = (page) => page.locator('form').filter({has: page.locator('select[name="sectionId"]')});
    const saveForm = async (page) => {
        const sent = page.waitForResponse((r) => /\/api\/v1\/submissions\/\d+\/publications\/\d+(\?|$)/.test(r.url()) && ['PUT', 'POST'].includes(r.request().method()), {timeout: T});
        await form(page).getByRole('button', {name: 'Save', exact: true}).click();
        const r = await sent;
        await idle(page); await pause(500);
        return r;
    };
    const publish = async (page) => {
        const button = await control(page, /^(Schedule For Publication|Publish|Post)$/);
        await button.waitFor({timeout: T});
        const out = {pressed: flat(await button.innerText())};
        await button.click();
        const panel = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
        const panelConfirm = panel.getByRole('button', {name: 'Confirm', exact: true});
        const confirm = page.getByRole('dialog')
            .filter({hasText: /requirements have been met|Are you sure you want to/})
            .filter({has: page.getByRole('button', {name: /^(Publish|Post|Schedule For Publication)$/})})
            .filter({hasNot: page.locator('[data-cy="active-modal"]')}).last();
        // 3.5: an article with no issue opens the issue window first.
        const issueWin = page.getByRole('dialog').filter({hasText: 'Select an issue to schedule for publication'}).last();
        await panelConfirm.or(confirm).or(issueWin).first().waitFor({timeout: T});
        await pause(500);
        if (await issueWin.isVisible().catch(() => false)) {
            await rec(page, 'publish-issue-window');
            await issueWin.locator('select option', {hasText: ISSUE}).first().waitFor({state: 'attached', timeout: T});
            await issueWin.locator('select').first().selectOption({label: ISSUE});
            out.issue = ISSUE;
            await issueWin.getByRole('button', {name: 'Save', exact: true}).click();
            await confirm.waitFor({timeout: T});
        }
        if (await panelConfirm.isVisible().catch(() => false)) {
            await rec(page, 'publish-panel');
            const stage = panel.locator('select[name="versionStage"]');
            if ((await stage.isVisible().catch(() => false)) && !(await stage.inputValue())) await stage.selectOption('VoR');
            const minor = panel.locator('select[name="versionIsMinor"]');
            if ((await minor.isVisible().catch(() => false)) && !(await minor.inputValue())) await minor.selectOption('false');
            await panelConfirm.click();
            await confirm.waitFor({timeout: T});
        }
        await rec(page, 'publish-confirm');
        out.question = flat(await confirm.innerText()).slice(0, 200);
        const done = page.waitForResponse((r) => /\/publish(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
        await confirm.getByRole('button', {name: /^(Publish|Post|Schedule For Publication)$/}).last().click();
        out.answer = (await done).status();
        await idle(page); await pause(800);
        out.status = await status(page);
        await rec(page, 'published');
        return out;
    };
    const unpublish = async (page) => {
        const button = await control(page, /^(Unpublish|Unpost)$/);
        await button.waitFor({timeout: T});
        const word = flat(await button.innerText());
        await button.click();
        const dialog = page.getByRole('dialog').filter({has: page.getByRole('button', {name: word, exact: true})}).last();
        await dialog.waitFor({timeout: T});
        await rec(page, 'unpublish-confirm');
        const question = flat(await dialog.innerText()).slice(0, 200);
        const done = page.waitForResponse((r) => /\/unpublish(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
        await dialog.getByRole('button', {name: word, exact: true}).last().click();
        const r = await done;
        await idle(page); await pause(800);
        await rec(page, 'unpublished');
        return {pressed: word, question, answer: r.status(), status: await status(page)};
    };

    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');

        // Step 1: create the section.
        {
            const tab = sectionsTab(page);
            await tab.goto();
            const win = await tab.openAdd();
            await win.type('title[en]', TITLE);
            await win.type('abbrev[en]', ABBREV);
            // OPS asks for a "Section URL Path" too.
            if (await win.box('path').isVisible().catch(() => false)) await win.type('path', 'commentary-u19w17');
            await rec(page, 'section-filled');
            const r = await win.saveAndClose();
            await pause(500);
            await rec(page, 'section-created');
            fact('step 1 create section', {answer: r.status(), rows: await tab.titleCells().allInnerTexts()});
        }

        // Step 2: the submission into the section (OJS: into the back issue).
        await openEntry(page);
        {
            const f = form(page);
            if (ojs && !legacy) {
                await f.getByRole('radio', {name: 'Assign To Current/Back Issue'}).check();
                const issueSel = f.locator('select[name="issueId"]');
                await issueSel.waitFor({timeout: T});
                await issueSel.selectOption({label: ISSUE});
            }
            await f.locator('select[name="sectionId"]').selectOption({label: TITLE});
            await rec(page, 'entry-filled');
            const r = await saveForm(page);
            await rec(page, 'entry-saved');
            fact('step 2 save section', {answer: r.status(), section: flat(await f.locator('select[name="sectionId"] option:checked').innerText())});
        }

        // Step 3: publish; step 4: unpublish.
        fact('step 3 publish', await publish(page));
        fact('step 4 unpublish', await unpublish(page));
        fact('tombstones after step 4', tombs());

        // Step 5: back to the journal's own section.
        await openEntry(page);
        {
            const f = form(page);
            await f.locator('select[name="sectionId"]').selectOption({label: home});
            const r = await saveForm(page);
            await rec(page, 'entry-back');
            fact('step 5 save section', {answer: r.status(), section: flat(await f.locator('select[name="sectionId"] option:checked').innerText())});
        }

        // Step 6: delete the emptied section.
        {
            const tab = sectionsTab(page);
            await tab.goto();
            const win = await tab.openDelete(TITLE);
            const question = flat(await win.question().innerText());
            const r = await tab.confirm(win);
            await pause(500);
            await rec(page, 'section-deleted');
            fact('step 6 delete section', {question, answer: r.status(), body: (await r.text()).slice(0, 300), rows: await tab.titleCells().allInnerTexts()});
        }
        await signOut(page);
    } finally { await close(); }

    fact('tombstones after step 6', tombs());
    fact('sections after step 6', (sql(app, `select s.section_id||' '||coalesce((select setting_value from section_settings where section_id=s.section_id and setting_name='abbrev' and locale='en'),'') from sections s order by 1`) || '').trim().split('\n'));

    // Steps 7–10: signed out, the OAI addresses.
    fact('step 7 ListSets', await oai('07-listsets', ctx, 'verb=ListSets'));
    fact('step 8 ListIdentifiers (no set)', await oai('08-all', ctx, 'verb=ListIdentifiers&metadataPrefix=oai_dc'));
    fact('step 9 set=COM', await oai('09-set', ctx, `verb=ListIdentifiers&metadataPrefix=oai_dc&set=${ctx}:${ABBREV}`));
    fact('step 10 site-wide set=COM', await oai('10-site-set', 'index', `verb=ListIdentifiers&metadataPrefix=oai_dc&set=${ctx}:${ABBREV}`));
    fact('step 9b ListRecords set=COM', await oai('09b-records', ctx, `verb=ListRecords&metadataPrefix=oai_dc&set=${ctx}:${ABBREV}`));

    // Neighbour: a set that never existed stays empty; a live section keeps its records.
    fact('n1 set=NOPE', await oai('n1-nope', ctx, `verb=ListIdentifiers&metadataPrefix=oai_dc&set=${ctx}:NOPE`));
    fact(`n1 set=${liveAbbrev}`, await oai('n1-live', ctx, `verb=ListIdentifiers&metadataPrefix=oai_dc&set=${ctx}:${liveAbbrev}`));
    fact('n1 set=journal', await oai('n1-journal', ctx, `verb=ListIdentifiers&metadataPrefix=oai_dc&set=${ctx}`));
    record('walk-facts', facts);
});
