// Issue report walk: docs/issues/U19-A7-oai-section-save-drops-peer-reviewed.md
// (spec U19 register A7). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"),
// OJS only (the section's "Identify items …" words are OJS's): its `admin`
// and `publicknowledge`. Everything else is created on screen, names tagged
// u19w10; the kit builds nothing. Step numbers are the report's:
//   1  admin: Administration › Hosted Journals › "Create Journal", path u19w10
//   2  admin: "u19w10 Tidal Patterns" through the submission wizard in u19w10
//   3  admin: Title & Abstract › "Schedule For Publication" › "Don't Assign To
//      An Issue" › "Confirm" › "Publish" (3.5: "Accept and Skip Review", an
//      issue "Vol. 1 No. 1 (2026)" picked, then "Publish Issue")
//   4  signed out: GetRecord oai_dc of the new article
//   5  admin: Settings › Journal › Sections › "Articles" › "Edit" › "Save", nothing changed
//   6  signed out: the same GetRecord
//   control: publicknowledge's article 1, whose "Articles" was saved when the dataset was built
// Each OAI read records the browser view (screen()) and the raw answer's
// dc:type elements; beside it (Evidence only) the section's stored
// identifyType rows.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w10 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-w10 PROBE_AGENT=w10 node bin/probe.js ojs shared/playwright/checks/issues/oai-section-save-drops-peer-reviewed/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w10-3_5 PROBE_AGENT=w10 node bin/probe.js ojs <this file>
// Neighbour:    neighbour.js beside this file, after this walk on the same fleet.
// Facts: .reports/<feature>/w10/facts[-<run>]-ojs.json
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');

const T = 30_000;
const TAG = 'u19w10';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const REPO = path.resolve(__dirname, '../../../../..');
const PDF = path.join(REPO, 'apps/ojs/playwright/fixtures/files/article.pdf');

/** The dc:type elements of an oai_dc answer, with their language. */
function dcTypes(body) {
    return [...body.matchAll(/<dc:type(?:\s+xml:lang="([^"]*)")?\s*>([^<]*)<\/dc:type>/g)].map((m) => (m[1] ? `${m[2]} [${m[1]}]` : m[2]));
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    if (app.name !== 'ojs') throw new Error('walk.js is OJS only');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`); };
    const line = app.line || 'main';
    const loc = '/en';
    const repoId = (fs.readFileSync(path.resolve(REPO, app.configFile), 'utf8').match(/^repository_id\s*=\s*"?([^"\n]+)"?/m) || [])[1];
    fact('fleet', {line, dataset: app.dataset, port: app.port, run: process.env.PROBE_RUN || null, repoId});
    let n = 0;
    const rec = async (page, label) => {
        const name = `${String(++n).padStart(2, '0')}-${label}`;
        try { record(name, await screen(page)); } catch (e) { record(name, {error: String(e).slice(0, 300), url: page.url()}); }
    };
    const stored = (ctxPath) => (sql(app, `select ss.locale||'=['||ss.setting_value||']' from section_settings ss join sections s on s.section_id=ss.section_id join journals j on j.journal_id=s.journal_id join section_settings t on t.section_id=s.section_id and t.setting_name='title' and t.locale='en' where j.path='${ctxPath}' and t.setting_value='Articles' and ss.setting_name='identifyType' order by 1`) || '').trim().split('\n').filter(Boolean);

    // A signed-out browser types the OAI address; the raw answer comes from the same context.
    const getRecord = async (label, ctxPath, id) => {
        const {page, close} = await launch(app);
        try {
            const rel = `/index.php/${ctxPath}/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:${repoId}:article/${id}`;
            const r = await page.goto(app.url(rel));
            await pause(200);
            await rec(page, `oai-${label}`);
            const shown = flat(await page.locator('body').innerText().catch(() => ''));
            const body = await (await page.request.get(app.url(rel))).text();
            record(`${String(n).padStart(2, '0')}-oai-${label}-raw`, {address: rel, body: body.slice(0, 8000)});
            return {
                address: rel,
                status: r ? r.status() : null,
                error: (body.match(/<error code="([^"]+)">([^<]*)<\/error>/) || [null]).slice(1).join(': ') || null,
                dcType: dcTypes(body),
                shownResourceType: (shown.match(/Resource Type\s*(.*?)\s*(Resource Format|Resource Identifier|Source|Language|Relation|Rights|$)/) || [])[1] || null,
                storedIdentifyType: stored(ctxPath),
            };
        } finally { await close(); }
    };

    // ---- helpers copied from the U19 A1 walk (oai-journal-deleted-records-first-journal/walk.js) ----
    const openWorkflow = async (page, ctx, id) => {
        await page.goto(app.url(`/index.php/${ctx}${loc}/dashboard/editorial?workflowSubmissionId=${id}`));
        await idle(page); await pause(1000);
        await rec(page, `workflow-${ctx}-${id}`);
    };
    const openTitleAbstract = async (page, ctx, id) => {
        await openWorkflow(page, ctx, id);
        const link = page.getByRole('link', {name: 'Title & Abstract', exact: true}).first();
        if (!(await link.isVisible().catch(() => false))) {
            await page.getByRole('link', {name: /^(Publication|Preprint)$/}).first().click().catch(() => {});
        }
        await link.click();
        await page.locator('h2', {hasText: 'Title & Abstract'}).first().waitFor({timeout: T});
        await idle(page); await pause(1000);
    };
    // 3.5 publishes only past review: "Accept and Skip Review", then "Record Decision".
    const acceptSkipReview = async (page, ctx, id) => {
        await openWorkflow(page, ctx, id);
        const stage = page.getByRole('link', {name: 'Submission', exact: true}).first();
        if (await stage.isVisible().catch(() => false)) { await stage.click(); await idle(page); }
        await page.getByRole('button', {name: 'Accept and Skip Review', exact: true}).click();
        await page.waitForURL(/decision/, {timeout: T, waitUntil: 'commit'});
        await idle(page);
        const recordButton = page.getByRole('button', {name: 'Record Decision', exact: true});
        const cont = page.getByRole('button', {name: 'Continue', exact: true});
        for (let i = 0; i < 6; i++) {
            await pause(1500); await idle(page);
            if (await recordButton.isVisible().catch(() => false)) break;
            await cont.last().click();
        }
        await rec(page, 'decision-page');
        const done = page.waitForResponse((r) => /\/decisions(\?|$)/.test(r.url()) && r.request().method() === 'POST', {timeout: T});
        await recordButton.click();
        const r = await done;
        await idle(page); await pause(1000);
        await rec(page, 'decision-recorded');
        return {status: r.status()};
    };
    const right = (page) => page.locator('[data-cy="workflow-controls-right"]');
    const status = async (page) => flat(await page.locator('[data-cy="workflow-controls-left"]').innerText().catch(() => ''));
    const publish = async (page) => {
        const button = right(page).getByRole('button', {name: /^(Schedule For Publication|Publish)$/});
        await button.first().waitFor({timeout: T});
        const label = flat(await button.first().innerText());
        await button.first().click();
        const panel = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
        const confirm = page.getByRole('dialog')
            .filter({hasText: /requirements have been met|Are you sure you want to/})
            .filter({has: page.getByRole('button', {name: /^(Publish|Schedule For Publication)$/})}).last();
        const panelConfirm = panel.getByRole('button', {name: 'Confirm', exact: true});
        const issueWin = page.getByRole('dialog').filter({hasText: 'Select an issue to schedule for publication'}).last();
        await panelConfirm.or(confirm).or(issueWin).first().waitFor({timeout: T}).catch(async (e) => { await rec(page, 'publish-stuck'); throw e; });
        await pause(500);
        const out = {pressed: label};
        if (await issueWin.isVisible().catch(() => false)) {
            await rec(page, 'publish-issue-window');
            const select = issueWin.locator('select').first();
            await issueWin.locator('select option', {hasText: 'Vol. 1 No. 1 (2026)'}).first().waitFor({state: 'attached', timeout: T});
            out.issue = 'Vol. 1 No. 1 (2026)';
            await select.selectOption({label: out.issue});
            await issueWin.getByRole('button', {name: 'Save', exact: true}).click();
            await confirm.waitFor({timeout: T});
        }
        if (await panelConfirm.isVisible().catch(() => false)) {
            await rec(page, 'publish-panel');
            const stage = panel.locator('select[name="versionStage"]');
            if ((await stage.isVisible().catch(() => false)) && !(await stage.inputValue())) await stage.selectOption('VoR');
            const minor = panel.locator('select[name="versionIsMinor"]');
            if ((await minor.isVisible().catch(() => false)) && !(await minor.inputValue())) await minor.selectOption('false');
            const noIssue = panel.getByRole('radio', {name: "Don't Assign To An Issue"});
            if (await noIssue.isVisible().catch(() => false)) { await noIssue.check(); out.noIssue = true; }
            await panelConfirm.click();
            await confirm.waitFor({timeout: T});
        }
        await rec(page, 'publish-confirm');
        out.question = flat(await confirm.innerText()).slice(0, 200);
        const done = page.waitForResponse((r) => /\/publish(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
        await confirm.getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).last().click();
        const r = await done;
        out.answer = r.status();
        await idle(page); await pause(500);
        out.status = await status(page);
        await rec(page, 'published');
        return out;
    };
    // ---- end of copied helpers ----

    const ctx = TAG;
    let submissionId = null;

    // Step 1: admin creates the second journal, public.
    {
        const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'admin');
            await page.goto(app.url(`/index.php/index${loc}/admin/contexts`));
            await idle(page);
            const hosted = new HostedJournalsPage(page, {hosted: 'Hosted Journals', table: 'Journals', create: 'Create Journal'});
            const win = await hosted.openCreate();
            await win.type(win.title('en'), `${TAG} Harbour Journal`);
            if (await win.initials('en').count()) await win.type(win.initials('en'), 'HJ');
            await win.type(win.contactName, 'Harbour Contact');
            await win.type(win.contactEmail, 'harbour.contact@mailinator.com');
            await win.country.selectOption({label: 'Canada'});
            await win.type(win.path, ctx);
            await win.setBox(win.languageBox('en'), true);
            if (await win.primaryChoice('en').count()) await win.primaryChoice('en').check();
            const publicBox = page.getByRole('checkbox', {name: /appear publicly on the site/});
            const onCreate = (await publicBox.count()) > 0;
            if (onCreate) await win.setBox(publicBox.first(), true);
            await rec(page, 'create-filled');
            const r = await win.pressSave();
            await page.waitForLoadState('load').catch(() => {});
            await idle(page); await pause(500);
            await rec(page, 'create-saved');
            fact('step 1 create', {status: r.status(), publicBoxOnCreate: onCreate});
            if (!onCreate) {
                const {HostedContextEditWindow} = require('../../../pages/OaiPages.js');
                const edit = new HostedContextEditWindow(page, {hostedLabel: 'Hosted Journals'});
                await edit.open(ctx);
                await edit.publicBox.check();
                const s = await edit.save();
                fact('step 1 enable publicly', {status: s.status()});
            }
            await signOut(page);
        } finally { await close(); }
    }
    fact('new journal Articles stored identifyType (before any save)', stored(ctx));

    // Step 2: admin submits "u19w10 Tidal Patterns" (copied from the U19 A1 walk, OJS branch).
    {
        const {waitForEditorReady, editorIdOf} = require('../../../support/richtext.js');
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'admin');
            await page.goto(app.url(`/index.php/${ctx}/submission`));
            await idle(page);
            await rec(page, 'start');
            const iframe = page.locator('iframe.tox-edit-area__iframe').first();
            await waitForEditorReady(page, await editorIdOf(iframe));
            const body = iframe.contentFrame().locator('body');
            await body.click();
            await body.fill(`${TAG} Tidal Patterns`);
            for (const box of await page.getByRole('checkbox').all()) {
                if ((await box.isVisible()) && !(await box.isChecked())) await box.check();
            }
            await page.getByRole('button', {name: 'Begin Submission'}).click();
            await page.waitForURL(/[?&]id=\d+/, {waitUntil: 'commit', timeout: 45_000});
            submissionId = Number(new URL(page.url()).searchParams.get('id'));
            await idle(page);
            let genreName = null;
            const uploadFile = async () => {
                await page.locator('.submissionFilesListPanel input[type="file"]').setInputFiles(PDF);
                const genre = page.locator('.listPanel--submissionFiles__setGenre').getByRole('button').first();
                await genre.waitFor({timeout: T});
                genreName = flat(await genre.innerText());
                await genre.click();
                await page.locator('.listPanel--submissionFiles__itemGenre').filter({hasText: genreName}).first().waitFor({timeout: T});
                await rec(page, 'wizard-files');
            };
            const current = page.locator('.pkpSteps__step__label--current');
            const cont = page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true});
            for (let i = 0; i < 8; i++) {
                const step = flat(await current.innerText().catch(() => ''));
                if (/Review$/.test(step) && !/Suggestions/.test(step)) break;
                if (/Upload Files$/.test(step) && !genreName) await uploadFile();
                if (/Details$/.test(step)) {
                    const abs = page.locator('iframe[id^="titleAbstract-abstract-control-en"]').first();
                    if (await abs.count()) {
                        await waitForEditorReady(page, 'titleAbstract-abstract-control-en');
                        const b = page.frameLocator('#titleAbstract-abstract-control-en_ifr').locator('body');
                        await b.click();
                        await b.fill('Tides follow the moon.');
                    }
                }
                await cont.click();
                await page.waitForFunction((prev) => {
                    const el = document.querySelector('.pkpSteps__step__label--current');
                    return el && el.textContent.replace(/\s+/g, ' ').trim() !== prev;
                }, step, {timeout: T}).catch(() => {});
                await idle(page);
            }
            await pause(1000);
            for (const box of await page.getByRole('checkbox').all()) {
                if ((await box.isVisible()) && !(await box.isChecked())) await box.check();
            }
            await rec(page, 'wizard-review');
            await page.locator('.submissionWizard__footer').getByRole('button', {name: 'Submit', exact: true}).click();
            const dialog = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Submit', exact: true})}).last();
            await dialog.waitFor({timeout: T});
            await dialog.getByRole('button', {name: 'Submit', exact: true}).click();
            await page.getByRole('heading', {name: 'Submission complete'}).waitFor({timeout: 45_000});
            await rec(page, 'wizard-complete');
            fact('step 2 submitted', {submissionId, genre: genreName});

            // OJS 3.5 publishes only into an issue: Issues › "Create Issue" first.
            const issueFirst = line !== 'main';
            let issues = null;
            if (issueFirst) {
                const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
                issues = new IssuesAdmin(page, ctx);
                await issues.goto('Future Issues');
                const {form} = await issues.openCreate();
                await form.volumeBox().fill('1');
                await form.numberBox().fill('1');
                await form.yearBox().fill('2026');
                await form.setShowBoxes({Title: false});
                const saved = await form.save();
                fact('step 2a issue', {status: saved.status()});
                fact('step 2b accept and skip review', await acceptSkipReview(page, ctx, submissionId));
            }

            // Step 3: publish.
            await openTitleAbstract(page, ctx, submissionId);
            fact('step 3 publish', await publish(page));
            if (issueFirst) {
                await issues.goto('Future Issues');
                const win = await issues.openPublish('Vol. 1 No. 1 (2026)');
                await win.ok();
                fact('step 3a publish issue', {issue: 'Vol. 1 No. 1 (2026)'});
            }
            await signOut(page);
        } finally { await close(); }
    }

    // Step 4: signed out, the record.
    fact('step 4 record', await getRecord('s4', ctx, submissionId));

    // Step 5: admin opens the new journal's "Articles" section and saves it unchanged.
    {
        const {SectionsTab} = require('../../../pages/SectionsPages.js');
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'admin');
            const tab = new SectionsTab(page, ctx, {locale: 'en'});
            await tab.goto();
            await rec(page, 'sections');
            const win = await tab.openEdit('Articles');
            const boxes = {
                identifyTypeEn: await win.box('identifyType[en]').inputValue(),
                willNotBeReviewed: await win.checkbox('Will not be peer-reviewed').isChecked().catch(() => null),
            };
            await rec(page, 'section-window');
            const r = await win.saveAndClose();
            await idle(page);
            await rec(page, 'section-saved');
            fact('step 5 save unchanged', {status: r.status(), boxes, storedAfter: stored(ctx)});
            await signOut(page);
        } finally { await close(); }
    }

    // Step 6: signed out, the record again.
    fact('step 6 record', await getRecord('s6', ctx, submissionId));

    // Control: publicknowledge's article 1, its "Articles" saved when the dataset was built.
    fact('control publicknowledge article 1', await getRecord('control', app.contextPath, 1));

    record('facts', facts);
});
