// Issue report walk: docs/issues/U19-A1-oai-journal-deleted-records-first-journal.md
// (spec U19 register A1). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"):
// its `admin` and its first context `publicknowledge`. Everything else is
// created on screen, names tagged u19w04; the kit builds nothing. Step
// numbers are the report's:
//   1    admin: Administration › Hosted … › "Create …" path `u19w04`, English,
//        "Enable this … to appear publicly on the site" ticked (on the create
//        form, or through the row's "Edit" when the form lacks the box)
//   2    admin: "u19w04 Tidal Patterns" through the submission wizard in `u19w04`
//        (OMP: then a "PDF" publication format, approved and available;
//        3.5: "Accept and Skip Review", and on OJS an issue to publish into)
//   3    admin: the workflow's Title & Abstract › publish ("Schedule For
//        Publication" / "Publish" / "Post"; OJS 3.5: then "Publish Issue")
//   4    signed out: u19w04 ListIdentifiers (the live record)
//   5    admin: "Unpublish" ("Unpost")
//   6    signed out: u19w04 ListIdentifiers, GetRecord of its identifier, the
//        site-wide list with set=u19w04 and without a set
//   7    admin: publicknowledge's published item (OJS 17, OMP 14, OPS 2) › "Unpublish"
//   8    signed out: publicknowledge's list (control); u19w04 ListIdentifiers,
//        GetRecord of the first context's deleted identifier, Identify, ListSets
// OPS is the app-level control (its OAIDAO joins the server's own id).
// Each OAI read records the browser view (screen()) and the raw answer's
// status, error, headers (identifier, deleted, datestamp, setSpecs) and
// earliestDatestamp.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w04 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-w04 PROBE_AGENT=w04 node bin/probe.js all shared/playwright/checks/issues/oai-journal-deleted-records-first-journal/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w04-3_5 PROBE_AGENT=w04 node bin/probe.js all shared/playwright/checks/issues/oai-journal-deleted-records-first-journal/walk.js
// Facts: .reports/<feature>/w04/facts[-<run>]-<app>.json
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');

const T = 30_000;
const TAG = 'u19w04';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PDF = path.join(__dirname, '../../../../../apps/ojs/playwright/fixtures/files/article.pdf');
const LABELS = {
    ojs: {hosted: 'Hosted Journals', table: 'Journals', create: 'Create Journal', name: 'u19w04 Harbour Journal', firstItem: 17},
    omp: {hosted: 'Hosted Presses', table: 'Presses', create: 'Create Press', name: 'u19w04 Harbour Press', firstItem: 14},
    ops: {hosted: 'Hosted Servers', table: 'Servers', create: 'Create Server', name: 'u19w04 Harbour Server', firstItem: 2},
};

/** The OAI answer as data: error, headers, earliestDatestamp, set specs. */
function parseOai(body) {
    const records = [];
    const re = /<header( status="deleted")?>([\s\S]*?)<\/header>/g;
    let m;
    while ((m = re.exec(body))) {
        const inner = m[2];
        records.push({
            identifier: (inner.match(/<identifier>([^<]+)<\/identifier>/) || [])[1] || null,
            deleted: !!m[1],
            datestamp: (inner.match(/<datestamp>([^<]+)<\/datestamp>/) || [])[1] || null,
            setSpecs: [...inner.matchAll(/<setSpec>([^<]+)<\/setSpec>/g)].map((x) => x[1]),
        });
    }
    return {
        error: (body.match(/<error code="([^"]+)">([^<]*)<\/error>/) || [null]).slice(1).join(': ') || null,
        records,
        earliestDatestamp: (body.match(/<earliestDatestamp>([^<]+)<\/earliestDatestamp>/) || [])[1] || null,
        setSpecs: [...body.matchAll(/<set>\s*<setSpec>([^<]+)<\/setSpec>/g)].map((x) => x[1]),
    };
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`); };
    const L = LABELS[app.name];
    const line = app.line || 'main';
    const loc = line === 'main' || line === 'stable-3_5_0' ? '/en' : '';
    fact('fleet', {line, dataset: app.dataset, port: app.port, run: process.env.PROBE_RUN || null});
    let n = 0;
    const rec = async (page, label) => {
        try { record(`${String(++n).padStart(2, '0')}-${label}`, await screen(page)); } catch (e) { record(`${String(++n).padStart(2, '0')}-${label}`, {error: String(e).slice(0, 300), url: page.url()}); }
    };

    // A signed-out browser types the OAI address; the raw answer comes from the same context.
    const oai = async (page, label, rel) => {
        const r = await page.goto(app.url(rel)).catch((e) => ({error: String(e).slice(0, 200)}));
        await pause(200);
        await rec(page, `oai-${label}`);
        const raw = await page.request.get(app.url(rel));
        const body = await raw.text();
        const out = {address: rel, status: r && r.status ? r.status() : r, rawStatus: raw.status(), ...parseOai(body)};
        record(`${String(n).padStart(2, '0')}-oai-${label}-raw`, {address: rel, status: raw.status(), body: body.slice(0, 6000)});
        return out;
    };
    const brief = (o) => ({status: o.rawStatus, error: o.error, records: o.records.map((x) => `${x.deleted ? 'DELETED ' : ''}${x.identifier} ${x.datestamp} [${x.setSpecs.join(',')}]`), earliestDatestamp: o.earliestDatestamp || undefined, sets: o.setSpecs.length ? o.setSpecs : undefined});

    // OPS 3.5 answers "Title & Abstract" for a server made on Hosted Servers
    // with an "Error" window (a server error on the form's request); its "OK"
    // leaves the page's publishing controls usable.
    const dismissError = async (page) => {
        const error = page.getByRole('dialog').filter({hasText: /^\s*Error/}).filter({has: page.getByRole('button', {name: 'OK', exact: true})});
        if (await error.first().isVisible().catch(() => false)) {
            await rec(page, 'title-abstract-error');
            facts.titleAbstractError = flat(await error.first().innerText()).slice(0, 400);
            await error.first().getByRole('button', {name: 'OK', exact: true}).click();
            await idle(page);
        }
    };
    const openWorkflow = async (page, ctx, id) => {
        await page.goto(app.url(`/index.php/${ctx}${loc}/dashboard/editorial?workflowSubmissionId=${id}`));
        await idle(page); await pause(1000);
        await rec(page, `workflow-${ctx}-${id}`);
        await dismissError(page);
    };
    // The workflow's "Title & Abstract" page of a submission.
    const openTitleAbstract = async (page, ctx, id) => {
        await openWorkflow(page, ctx, id);
        const link = page.getByRole('link', {name: 'Title & Abstract', exact: true}).first();
        if (!(await link.isVisible().catch(() => false))) {
            await page.getByRole('link', {name: /^(Publication|Preprint)$/}).first().click().catch(() => {});
        }
        await link.click();
        await page.locator('h2', {hasText: 'Title & Abstract'}).first().waitFor({timeout: T});
        await idle(page); await pause(1000);
        await dismissError(page);
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
        const stageAction = page.getByRole('button', {name: 'Post the preprint', exact: true});
        if (await stageAction.isVisible().catch(() => false)) await stageAction.click();
        const button = right(page).getByRole('button', {name: /^(Schedule For Publication|Publish|Post)$/});
        await button.first().waitFor({timeout: T});
        const label = flat(await button.first().innerText());
        await button.first().click();
        const panel = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
        const confirm = page.getByRole('dialog')
            .filter({hasText: /requirements have been met|Are you sure you want to/})
            .filter({has: page.getByRole('button', {name: /^(Publish|Post|Schedule For Publication)$/})}).last();
        // The side modal's wrapper reads hidden (patterns.md pitfall 5): wait on its button.
        const panelConfirm = panel.getByRole('button', {name: 'Confirm', exact: true});
        // OJS 3.5: "Select an issue to schedule for publication" (no publishing without an issue).
        const issueWin = page.getByRole('dialog').filter({hasText: 'Select an issue to schedule for publication'}).last();
        await panelConfirm.or(confirm).or(issueWin).first().waitFor({timeout: T}).catch(async (e) => { await rec(page, 'publish-stuck'); throw e; });
        await pause(500);
        const out = {pressed: label};
        if (await issueWin.isVisible().catch(() => false)) {
            await rec(page, 'publish-issue-window');
            const select = issueWin.locator('select').first();
            await issueWin.locator('select option', {hasText: 'Vol. 1 No. 1 (2026)'}).first().waitFor({state: 'attached', timeout: T}).catch(async (e) => { await rec(page, 'issue-window-empty'); throw e; });
            out.issue = 'Vol. 1 No. 1 (2026)';
            await select.selectOption({label: out.issue});
            await issueWin.getByRole('button', {name: 'Save', exact: true}).click();
            // The issue saved, the window gives way to the confirmation.
            await confirm.waitFor({timeout: T}).catch(async (e) => { await rec(page, 'issue-saved-stuck'); throw e; });
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
        await confirm.getByRole('button', {name: /^(Publish|Post|Schedule For Publication)$/}).last().click();
        const r = await done;
        out.answer = r.status();
        await idle(page); await pause(500);
        out.status = await status(page);
        await rec(page, 'published');
        return out;
    };
    const unpublish = async (page) => {
        const button = right(page).getByRole('button', {name: /^(Unpublish|Unpost)$/});
        await button.first().waitFor({timeout: T});
        const label = flat(await button.first().innerText());
        await button.first().click();
        const dialog = page.getByRole('dialog').filter({has: page.getByRole('button', {name: label, exact: true})}).last();
        await dialog.waitFor({timeout: T});
        await rec(page, 'unpublish-confirm');
        const question = flat(await dialog.innerText()).slice(0, 200);
        const done = page.waitForResponse((r) => /\/unpublish(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
        await dialog.getByRole('button', {name: label, exact: true}).last().click();
        const r = await done;
        await idle(page); await pause(500);
        await rec(page, 'unpublished');
        return {pressed: label, question, answer: r.status(), status: await status(page)};
    };

    const ctx = TAG;
    const own = (q) => `/index.php/${ctx}/oai?${q}`;
    const site = (q) => `/index.php/index/oai?${q}`;
    const pk = (q) => `/index.php/${app.contextPath}/oai?${q}`;
    const LI = 'verb=ListIdentifiers&metadataPrefix=oai_dc';
    let submissionId = null;

    // Step 1: admin creates the second context, enabled publicly.
    {
        const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'admin');
            await page.goto(app.url(`/index.php/index${loc}/admin/contexts`));
            await idle(page);
            const hosted = new HostedJournalsPage(page, L);
            const win = await hosted.openCreate();
            await win.type(win.title('en'), L.name);
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
            fact('step 1 create', {status: r.status(), publicBoxOnCreate: onCreate, url: page.url().replace(/^https?:\/\/[^/]+/, '')});
            if (!onCreate) {
                const {HostedContextEditWindow} = require('../../../pages/OaiPages.js');
                const edit = new HostedContextEditWindow(page, {hostedLabel: L.hosted});
                await edit.open(ctx);
                await edit.publicBox.check();
                await rec(page, 'edit-public');
                const s = await edit.save();
                fact('step 1 enable publicly', {status: s.status(), label: await edit.publicBoxLabel().catch(() => null)});
            }
            await signOut(page);
        } finally { await close(); }
    }

    // Step 2: admin submits "u19w04 Tidal Patterns" in the new context.
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
                if (app.name === 'ops') {
                    // A preprint server's Upload Files step adds a galley: "Add File", its
                    // "Galley Label", then the upload wizard's "Preprint Text".
                    const {addGalleyFile} = require(path.join(__dirname, '../../../../../apps/ops/playwright/pages/SubmissionWizardPages.js'));
                    await addGalleyFile(page, {label: 'PDF', file: PDF});
                    genreName = 'Preprint Text (galley "PDF")';
                } else {
                    await page.locator('.submissionFilesListPanel input[type="file"]').setInputFiles(PDF);
                    const genre = page.locator('.listPanel--submissionFiles__setGenre').getByRole('button').first();
                    await genre.waitFor({timeout: T});
                    genreName = flat(await genre.innerText());
                    await genre.click();
                    await page.locator('.listPanel--submissionFiles__itemGenre').filter({hasText: genreName}).first().waitFor({timeout: T});
                }
                await rec(page, 'wizard-files');
            };
            const current = page.locator('.pkpSteps__step__label--current');
            const cont = page.locator('.submissionWizard__footer').getByRole('button', {name: 'Continue', exact: true});
            for (let i = 0; i < 8; i++) {
                const step = flat(await current.innerText().catch(() => ''));
                if (/Review$/.test(step) && !/Suggestions/.test(step)) break;
                // The Upload Files step comes first on main and second on 3.5.
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
                const relation = page.getByRole('radio', {name: 'This preprint has not been published elsewhere.'});
                if (await relation.isVisible().catch(() => false)) await relation.check();
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
            const submit = page.locator('.submissionWizard__footer').getByRole('button', {name: 'Submit', exact: true});
            await submit.click();
            const dialog = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Submit', exact: true})}).last();
            await dialog.waitFor({timeout: T});
            await dialog.getByRole('button', {name: 'Submit', exact: true}).click();
            await page.getByRole('heading', {name: 'Submission complete'}).waitFor({timeout: 45_000});
            await rec(page, 'wizard-complete');
            fact('step 2 submitted', {submissionId, genre: genreName});

            if (app.name === 'omp') {
                // The book needs a publication format, approved and available.
                const {PublicationFormatsPage} = require(path.join(__dirname, '../../../../../apps/omp/playwright/pages/PublicationFormatPages.js'));
                await page.goto(app.url(`/index.php/${ctx}${loc}/dashboard/editorial?workflowSubmissionId=${submissionId}`));
                await idle(page);
                const formats = new PublicationFormatsPage(page, ctx);
                await formats.frame.expectOpen(submissionId);
                const direct = page.getByRole('link', {name: 'Publication Formats', exact: true}).first();
                if (line === 'main') await formats.openFromMenu();
                else { await direct.click(); await formats.expectLoaded(); }
                const win = await formats.openAdd();
                await win.typeName('PDF');
                await win.ok();
                const row = formats.formatRow('PDF');
                await row.waitFor({timeout: T});
                await rec(page, 'format-added');
                const approve = await formats.openStatus(row, 'Awaiting Approval', 'Format Approval');
                await approve.ok();
                const avail = await formats.openStatus(formats.formatRow('PDF'), 'Not Available', 'Format Availability');
                await avail.ok();
                await idle(page);
                await rec(page, 'format-available');
                fact('step 2 format', {row: flat(await formats.formatRow('PDF').innerText())});
            }

            // OJS 3.5 publishes only into an issue: Issues › "Create Issue" first.
            const issueFirst = app.name === 'ojs' && line !== 'main';
            let issues = null;
            if (issueFirst) {
                const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
                issues = new IssuesAdmin(page, ctx);
                await issues.goto('Future Issues');
                const {form} = await issues.openCreate();
                await form.volumeBox().fill('1');
                await form.numberBox().fill('1');
                await form.yearBox().fill('2026');
                await rec(page, 'issue-create');
                await form.setShowBoxes({Title: false});
                const saved = await form.save();
                fact('step 2a issue', {status: saved.status()});
            }

            if (app.name !== 'ops' && line !== 'main') fact('step 2b accept and skip review', await acceptSkipReview(page, ctx, submissionId));

            // Step 3: publish.
            await openTitleAbstract(page, ctx, submissionId);
            fact('step 3 publish', await publish(page));
            if (issueFirst) {
                await issues.goto('Future Issues');
                const name = 'Vol. 1 No. 1 (2026)';
                const win = await issues.openPublish(name);
                await rec(page, 'issue-publish');
                await win.ok();
                fact('step 3a publish issue', {issue: name});
            }
            await signOut(page);
        } finally { await close(); }
    }

    // Step 4: signed out, the live record.
    let ownId = null;
    {
        const {page, close} = await launch(app);
        try {
            const o = await oai(page, 's4-own-list', own(LI));
            fact('step 4 own list', brief(o));
            ownId = (o.records.find((r) => !r.deleted) || {}).identifier || null;
        } finally { await close(); }
    }

    // Step 5: unpublish.
    {
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'admin');
            await openTitleAbstract(page, ctx, submissionId);
            fact('step 5 unpublish', await unpublish(page));
            await signOut(page);
        } finally { await close(); }
    }

    // Step 6: signed out, its own deleted record.
    {
        const {page, close} = await launch(app);
        try {
            fact('step 6 own list', brief(await oai(page, 's6-own-list', own(LI))));
            if (ownId) fact('step 6 own getrecord', brief(await oai(page, 's6-own-getrecord', own(`verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(ownId)}`))));
            fact('step 6 site set', brief(await oai(page, 's6-site-set', site(`${LI}&set=${ctx}`))));
            fact('step 6 site list (control)', brief(await oai(page, 's6-site-list', site(LI))));
        } finally { await close(); }
    }

    // Step 7: the first context's published item, unpublished.
    {
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'admin');
            await openTitleAbstract(page, app.contextPath, L.firstItem);
            fact('step 7 unpublish first', {submissionId: L.firstItem, ...(await unpublish(page))});
            await signOut(page);
        } finally { await close(); }
    }

    // Step 8: signed out, the new context's address again.
    {
        const {page, close} = await launch(app);
        try {
            const pkList = await oai(page, 's8-first-list', pk(LI));
            fact('step 8 first context list (control)', brief(pkList));
            const firstDeleted = (pkList.records.find((r) => r.deleted) || {}).identifier || null;
            fact('step 8 own list', brief(await oai(page, 's8-own-list', own(LI))));
            if (firstDeleted) fact('step 8 own getrecord of first', brief(await oai(page, 's8-own-getrecord-first', own(`verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(firstDeleted)}`))));
            fact('step 8 own identify', brief(await oai(page, 's8-own-identify', own('verb=Identify'))));
            fact('step 8 own listsets', brief(await oai(page, 's8-own-listsets', own('verb=ListSets'))));
        } finally { record('facts', facts); await close(); }
    }
});
