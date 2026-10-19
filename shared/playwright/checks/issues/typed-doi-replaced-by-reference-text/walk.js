// Issue report docs/issues/U42-A25-typed-doi-replaced-by-reference-text.md (U42 A25): with references metadata
// lookup on, a DOI an editor types in "Edit citation" and saves before the lookup's first step has run is
// replaced by the DOI written in the reference's text when that step runs, without a word. Takes the report's
// Steps on PKP's default test dataset (lookup off there):
//   pre   [queues] job_runner = Off in the install's config (the fleet's config.test.ds<n>.inc.php)
//   1-2   dbarnes, Settings > Workflow > "Metadata": tick "Enable references structuring and metadata lookup", Save
//   3-5   OJS 4 / OMP 3 / OPS 1, "Publication" ("Preprint") > "References": Add a reference whose text holds a DOI
//   6-7   its "Edit": type another DOI, Save; the row on the same page and after a reload
//   8     the site's jobs: php lib/pkp/tools/jobs.php run (what a cron entry runs)
//   9-10  reload: the row's DOI link and the "DOI" box of "Edit"
// NB=1 runs the neighbour check alone (for the fix in and out), after its own reset:
//   a  job_runner = On (the dataset's default): "Add", then "Edit" at once: the "DOI" box
//   b  job_runner = Off: two references added; on "e" a hand save that types a title and leaves "DOI" empty,
//      then the jobs: the text's DOI still fills it; on "f" the jobs first, then a typed DOI, the jobs again
//      (it stays), then "Reprocess all references" > OK and the jobs (the text's DOI comes back, as the
//      question warns)
// OLD=1 runs the upgraded-reference check alone (for the fix in and out): a reference stored as stable-3_5_0's
//   CitationDAO::insertObject() stores one (a citations row, no citation_settings row, so no processingStatus),
//   written by SQL into the submission's current publication, as an install upgraded from 3.5 holds it; then,
//   with lookup on, its "Edit": a DOI typed, Save (the request's status, the row, the stored status and DOI)
// Each part records its state and goes on rather than throwing. Database reads (processingStatus) are
// evidence, never steps. On stable-3_5_0 the "Metadata" screen has no lookup box: the walk records that and stops.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> [PROBE_RUN=<run>] [NB=1] node bin/probe.js <app|all> \
//        shared/playwright/checks/issues/typed-doi-replaced-by-reference-text/walk.js
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');
const L = require('./lib');

const SUBMISSION = {ojs: 4, omp: 3, ops: 1};
const RUN = process.env.PROBE_RUN || 'main';
const NB = !!process.env.NB;
const OLD = !!process.env.OLD;

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const id = SUBMISSION[app.name];
    const facts = {app: app.name, line: app.line || 'main', run: RUN, nb: NB, submission: id};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact ${RUN} ${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
        record(`${OLD ? 'old' : NB ? 'nb' : 'walk'}-facts`, facts);
    };
    const stored = (needle) =>
        sql(app, `select c.citation_id, (select setting_value from citation_settings s where s.citation_id = c.citation_id and setting_name = 'processingStatus') as status, (select setting_value from citation_settings s where s.citation_id = c.citation_id and setting_name = 'doi') as doi from citations c where c.raw_citation like '%${needle}%'`);
    const {page, close} = await launch(app);
    const snap = async (name) => {
        record(`${NB ? 'nb' : 'walk'}-${name}`, await screen(page).catch((e) => ({error: e.message})));
        await shot(page, `${NB ? 'nb' : 'walk'}-${name}`).catch(() => {});
    };
    const part = async (key, fn) => {
        try {
            await fn();
        } catch (e) {
            fact(`${key} ERROR`, L.flat(e.stack || e.message, 900));
            await snap(`${key}-error`);
        }
    };
    const reopen = async () => {
        await L.gotoWorkflow(page, app, id);
        return L.openEntry(page, 'References');
    };
    try {
        await signIn(page, 'dbarnes', {contextPath: app.contextPath});
        await idle(page).catch(() => {});

        if (OLD) {
            const pub = sql(app, `select current_publication_id from submissions where submission_id = ${id}`);
            const seq = sql(app, `select coalesce(max(seq), 0) + 1 from citations where publication_id = ${pub}`);
            sql(app, `insert into citations (publication_id, raw_citation, seq) values (${pub}, 'Knuth D. h19z-old The art of computer programming. 1968. https://doi.org/10.1234/h19z.old', ${seq})`);
            fact('old-stored-inserted', stored('h19z.old'));
            fact('old-setting', await L.enableLookup(page, app));
            await part('old-edit', async () => {
                await reopen();
                fact('old-row-before', await L.readRow(page, 'h19z-old'));
                await L.openEditCitation(page, 'h19z-old');
                fact('old-doiBox', await L.editField(page, 'DOI').inputValue());
                await L.editField(page, 'DOI').fill('10.5678/h19z.old-typed');
                fact('old-save', await L.saveEditCitation(page));
                await L.closeEditCitation(page);
                fact('old-stored-afterSave', stored('h19z.old'));
                await reopen();
                fact('old-row-afterReload', await L.readRow(page, 'h19z-old'));
                await snap('old-after-reload');
            });
            fact('old-verdict', {saveStatus: facts['old-save']?.status ?? null, stored: facts['old-stored-afterSave'] ?? null});
            return;
        }

        if (!NB) {
            const needle = 'h19z On computable';
            const TEXT = 'Turing A. h19z On computable numbers. 1936. https://doi.org/10.1234/h19z.text';
            const TYPED = '10.5678/h19z.typed';
            fact('pre-job_runner', L.setJobRunner(app, false));
            const setting = await L.enableLookup(page, app);
            fact('step2-setting', setting);
            await snap('step2-settings');
            if (setting.absent) return;
            await part('steps3-5', async () => {
                await L.gotoWorkflow(page, app, id);
                fact('step4-heading', await L.openEntry(page, 'References'));
                fact('step5-add', await L.addReference(page, TEXT, needle));
                fact('step5-row', await L.readRow(page, needle));
                fact('step5-stored', stored('h19z.text'));
                await snap('step5-added');
            });
            await part('steps6-7', async () => {
                await L.openEditCitation(page, needle);
                fact('step6-doiBox', await L.editField(page, 'DOI').inputValue());
                await L.editField(page, 'DOI').fill(TYPED);
                await snap('step7-typed');
                fact('step7-save', await L.saveEditCitation(page));
                fact('step7-row-samePage', await L.readRow(page, needle));
                fact('step7-notices', await L.notices(page));
                fact('step7-stored', stored('h19z.text'));
                await reopen();
                fact('step7-row-afterReload', await L.readRow(page, needle));
                await snap('step7-after-reload');
            });
            await part('step8', async () => {
                fact('step8-jobs', L.flat(L.runSiteJobs(app), 1500));
                fact('step8-stored', stored('h19z.text'));
            });
            await part('steps9-10', async () => {
                await reopen();
                fact('step10-row', await L.readRow(page, needle));
                await snap('step10-row');
                fact('step10-editBoxes', await L.readEditBoxes(page, needle));
                fact('step10-notices', await L.notices(page));
            });
            const row = facts['step10-row'] || {};
            const doiLinks = (row.links || []).filter((l) => /doi\.org/.test(l));
            fact('verdict', {
                typedShownAfterSave: (facts['step7-row-afterReload']?.links || []).some((l) => l.startsWith(TYPED)),
                rowDoiAfterJobs: doiLinks,
                editDoiAfterJobs: facts['step10-editBoxes']?.DOI ?? null,
                typedKept: (facts['step10-editBoxes']?.DOI ?? null) === TYPED,
                replacedByText: (facts['step10-editBoxes']?.DOI ?? null) === '10.1234/h19z.text',
            });
            return;
        }

        // ---------------------------------------------------------------- NB
        const setting = await L.enableLookup(page, app);
        fact('nb-setting', setting);
        if (setting.absent) return;
        await part('nb-a', async () => {
            fact('nb-a-job_runner', L.setJobRunner(app, true));
            await reopen();
            await L.addReference(page, 'Hopper G. h19z-d The education of a computer. 1952. https://doi.org/10.1234/h19z.d', 'h19z-d');
            fact('nb-a-stored', stored('h19z.d'));
            fact('nb-a-editBoxesAtOnce', await L.readEditBoxes(page, 'h19z-d'));
        });
        fact('nb-b-job_runner', L.setJobRunner(app, false));
        await part('nb-b-e', async () => {
            await reopen();
            await L.addReference(
                page,
                'Shannon C. h19z-e A mathematical theory of communication. 1948. https://doi.org/10.1234/h19z.e\nBoole G. h19z-f The laws of thought. 1854. https://doi.org/10.1234/h19z.f',
                'h19z-f'
            );
            fact('nb-e-stored-added', stored('h19z.e'));
            await L.openEditCitation(page, 'h19z-e');
            fact('nb-e-doiBox', await L.editField(page, 'DOI').inputValue());
            await L.editField(page, 'Title').fill('h19z E title typed');
            fact('nb-e-save', await L.saveEditCitation(page));
            fact('nb-e-row-afterSave', await L.readRow(page, 'h19z-e'));
            fact('nb-e-stored-afterSave', stored('h19z.e'));
            fact('nb-jobs-1', L.flat(L.runSiteJobs(app), 800));
            await reopen();
            fact('nb-e-row-afterJobs', await L.readRow(page, 'h19z-e'));
            fact('nb-e-editBoxes-afterJobs', await L.readEditBoxes(page, 'h19z-e'));
            fact('nb-e-stored-afterJobs', stored('h19z.e'));
        });
        await part('nb-b-f', async () => {
            fact('nb-f-stored-before', stored('h19z.f'));
            await L.openEditCitation(page, 'h19z-f');
            fact('nb-f-doiBox', await L.editField(page, 'DOI').inputValue());
            await L.editField(page, 'DOI').fill('10.5678/h19z.f-typed');
            fact('nb-f-save', await L.saveEditCitation(page));
            fact('nb-jobs-2', L.flat(L.runSiteJobs(app), 800));
            await reopen();
            fact('nb-f-editBoxes-afterJobs', await L.readEditBoxes(page, 'h19z-f'));
            fact('nb-f-stored-afterJobs', stored('h19z.f'));
            await L.wf(page).getByRole('button', {name: 'Reprocess all references', exact: true}).click();
            const dlg = page.locator('[role="dialog"]').filter({hasText: "You'll need to re-enter your manual changes"}).first();
            await dlg.waitFor({state: 'visible', timeout: L.T});
            fact('nb-f-reprocessQuestion', L.flat(await dlg.innerText()));
            await dlg.getByRole('button', {name: 'OK', exact: true}).click();
            await dlg.waitFor({state: 'hidden', timeout: L.T}).catch(() => {});
            await L.sleep(1500);
            await idle(page);
            fact('nb-f-stored-afterReprocess', stored('h19z.f'));
            fact('nb-jobs-3', L.flat(L.runSiteJobs(app), 800));
            await reopen();
            fact('nb-f-row-afterReprocessJobs', await L.readRow(page, 'h19z-f'));
            fact('nb-f-editBoxes-afterReprocessJobs', await L.readEditBoxes(page, 'h19z-f'));
            fact('nb-f-stored-afterReprocessJobs', stored('h19z.f'));
            await snap('nb-f-after-reprocess');
        });
        fact('nb-verdict', {
            runnerOnBoxShowsText: facts['nb-a-editBoxesAtOnce']?.DOI ?? null,
            emptyDoiFilledFromText: facts['nb-e-editBoxes-afterJobs']?.DOI ?? null,
            typedAfterStep1Kept: facts['nb-f-editBoxes-afterJobs']?.DOI ?? null,
            afterReprocess: facts['nb-f-editBoxes-afterReprocessJobs']?.DOI ?? null,
        });
    } finally {
        if (!process.env.KEEP_RUNNER) L.setJobRunner(app, true);
        await close();
    }
});
