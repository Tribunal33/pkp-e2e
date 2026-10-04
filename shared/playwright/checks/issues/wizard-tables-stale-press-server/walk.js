// U42 A10 with U43 A4: on a press or a preprint server the submission wizard's Data Citations table,
// its Funders table and its Review step stay stale after a save until the page is reloaded; a journal
// updates at once. Walks the report's Steps on PKP's default test dataset (OJS the control).
//
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js all \
//     shared/playwright/checks/issues/wizard-tables-stale-press-server/walk.js [steps|neighbour]
//
// `steps` (default): the Steps. `neighbour`: what a fix must leave alone, the press's and the server's
// own wizard wiring (OMP: a chapter added in the wizard reaches Review; OPS: a galley added in the
// wizard reaches Review). `severity` (OMP or OPS): both sections at "Require", a manuscript uploaded,
// each entry added twice, "Review" and "Submit" read, a delete after a reload, then "Submit".
// Each mode starts from a freshly loaded dataset.
const {forEachApp, launch, signIn, signOut, screen, shot, record} = require('../../../probe');
const L = require('./lib');

const {W, flat} = L;
const MODE = process.argv[2] || 'steps';
const TITLE = {steps: 'u42r2 Stale wizard tables', severity: 'u42r2 Required and re-added'}[MODE] || 'u42r2 Neighbour';

forEachApp(async (app) => {
    if (MODE === 'neighbour' && app.name === 'ojs') return; // the fix does not reach OJS
    const facts = {app: app.name, line: app.line, mode: MODE, steps: []};
    const key = `u42r2-${MODE}`;
    const {page, close} = await launch(app);
    const api = L.watchApi(page);
    let n = 0;
    const snap = async (name, extra) => {
        n += 1;
        const nm = `${key}-${String(n).padStart(2, '0')}-${name}`;
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: flat(e.message, 300)}; }
        record(nm, {...s, facts: extra});
        await shot(page, nm).catch(() => {});
    };
    /** One step: its outcome recorded, an error kept rather than thrown. */
    const step = async (name, fn) => {
        const t0 = Date.now();
        const o = {step: name};
        try { Object.assign(o, (await fn()) || {}); } catch (e) { o.error = flat(e.message, 400); }
        o.api = api.since(t0).filter((x) => !/\/(notifications|stats|_test)/.test(x.path));
        facts.steps.push(o);
        record(key, facts);
        return o;
    };
    try {
        if (MODE === 'steps') {
            await step('1 manager asks for data citations', async () => {
                await signIn(page, 'rvaca');
                const status = await L.askForDataCitations(page, app);
                await snap('settings-metadata', {status});
                await signOut(page);
                return {status};
            });
        }
        if (MODE === 'severity') {
            await step('S1 manager requires data citations and funders', async () => {
                await signIn(page, 'rvaca');
                const status = await L.requireBoth(page, app);
                await snap('settings-require', {status});
                await signOut(page);
                return {status};
            });
        }
        await step(`2-3 ${L.AUTHOR[app.name]} begins a submission`, async () => {
            await signIn(page, L.AUTHOR[app.name]);
            const id = await W.startSubmission(app, page, TITLE);
            facts.submissionId = id;
            return {id, rail: (await page.locator('.pkpSteps__step__label').allInnerTexts()).map((x) => flat(x, 60))};
        });

        if (MODE === 'steps') {
            await step('4 Continue to Details', async () => {
                const at = await W.continueUntil(page, 'Details');
                const s = await L.sections(page);
                await snap('details-before', {at, sections: s});
                return {at, sections: s.map((x) => x.heading), tables: await L.settle(page)};
            });
            await step('5 add "Ocean temperature records"', async () => {
                const status = await L.addDataCitation(page, 'Ocean temperature records');
                const tables = await L.settle(page);
                await snap('after-add-1', {status, tables});
                return {status, tables};
            });
            await step('6 add "Coastal salinity series"', async () => {
                const status = await L.addDataCitation(page, 'Coastal salinity series');
                const tables = await L.settle(page);
                await snap('after-add-2', {status, tables});
                return {status, tables};
            });
            await step('7 add funder "Test Foundation"', async () => {
                const r = await L.addFunder(page, 'Test Foundation');
                const tables = await L.settle(page);
                await snap('after-funder', {...r, tables});
                return {...r, tables};
            });
            await step('8 Continue to Review', async () => {
                const at = await W.continueUntil(page, 'Review');
                const review = await L.reviewItems(page, ['Data Citations', 'Funders']);
                await snap('review-before-reload', {at, review});
                return {at, review};
            });
            await step('9 reload, back to Details', async () => {
                const asked = await W.reloadWizard(page);
                const landed = await W.curText(page); // the wizard reopens on its first step
                const at = await W.goToStep(page, 'Details');
                const tables = await L.settle(page);
                await snap('details-after-reload', {asked, landed, at, tables});
                return {asked, landed, at, tables};
            });
            await step('10 edit to "Ocean temperature records 2020"', async () => {
                const r = await L.editDataCitation(page, 'Ocean temperature records', 'Ocean temperature records 2020');
                const tables = await L.settle(page);
                await snap('after-edit', {...r, tables});
                return {...r, tables};
            });
            await step('11 Continue to Review', async () => {
                const at = await W.continueUntil(page, 'Review');
                const review = await L.reviewItems(page, ['Data Citations', 'Funders']);
                await snap('review-after-edit', {at, review});
                return {at, review};
            });
            await step('12 reload, Continue to Review', async () => {
                const asked = await W.reloadWizard(page);
                await W.goToStep(page, 'Review');
                const review = await L.reviewItems(page, ['Data Citations', 'Funders']);
                await snap('review-after-second-reload', {asked, review});
                return {asked, review};
            });
        } else if (MODE === 'severity') {
            const ror = L.watchRor(page);
            const sid = () => facts.submissionId;
            await step('S2 upload the manuscript, Continue to Details', async () => {
                await W.uploadFile(app, page);
                const at = await W.continueUntil(page, 'Details');
                return {at};
            });
            await step('S3 add "Ocean temperature records", then add it again', async () => {
                const first = await L.addDataCitation(page, 'Ocean temperature records');
                const t1 = await L.settle(page);
                const second = await L.addDataCitation(page, 'Ocean temperature records');
                const t2 = await L.settle(page);
                await snap('re-added-data-citation', {first, t1, second, t2});
                return {first, t1, second, t2, stored: L.stored(app, sid())};
            });
            await step('S4 add funder "Test Foundation", then add it again', async () => {
                const first = await L.addFunder(page, 'Test Foundation');
                const t1 = await L.settle(page);
                const second = await L.addFunder(page, 'Test Foundation');
                const t2 = await L.settle(page);
                await snap('re-added-funder', {first, t1, second, t2, ror});
                return {first, t1, second, t2, ror: ror.slice(), stored: L.stored(app, sid())};
            });
            const readReview = async (name) => {
                const at = await W.goToStep(page, 'Review');
                await page.locator('.submissionWizard__loadingReview').waitFor({state: 'hidden', timeout: 20_000}).catch(() => {});
                await L.sleep(3000);
                const review = await L.reviewItems(page, ['Data Citations', 'Funders']);
                const warnings = await page.locator('.submissionWizard__dataCitationsEmptyWarning:visible, .submissionWizard__fundersEmptyWarning:visible, .submissionWizard__review_errors:visible').allInnerTexts();
                const submitDisabled = await W.footer(page).getByRole('button', {name: 'Submit', exact: true}).isDisabled().catch(() => null);
                await snap(name, {at, review, warnings, submitDisabled});
                return {at, review, warnings: warnings.map((x) => flat(x, 200)), submitDisabled};
            };
            await step('S5 Continue to Review', () => readReview('review-required'));
            await step('S6 reload, Continue to Details', async () => {
                await W.reloadWizard(page);
                const at = await W.goToStep(page, 'Details');
                return {at, tables: await L.settle(page)};
            });
            await step('S7 delete one "Ocean temperature records"', async () => {
                const r = await L.deleteDataCitation(page, 'Ocean temperature records');
                const tables = await L.settle(page);
                await snap('after-delete', {...r, tables});
                return {...r, tables, stored: L.stored(app, sid())};
            });
            await step('S8 Continue to Review', () => readReview('review-after-delete'));
            await step('S9 Submit', async () => {
                const submit = W.footer(page).getByRole('button', {name: 'Submit', exact: true});
                if (await submit.isDisabled().catch(() => true)) return {submitted: false, reason: 'Submit disabled'};
                await submit.click();
                const d = page.getByRole('dialog').filter({hasText: /will be submitted to|Are you sure you want to (complete|submit)/});
                await d.waitFor({timeout: L.T});
                const question = flat(await d.innerText().catch(() => null), 300);
                await d.getByRole('button', {name: 'Submit', exact: true}).click();
                const complete = await page.getByRole('heading', {name: 'Submission complete'}).waitFor({timeout: 45_000}).then(() => true).catch(() => false);
                await snap('submitted', {question, complete});
                return {question, complete, stored: L.stored(app, sid()), ror: ror.slice()};
            });
        } else if (app.name === 'omp') {
            await step('N1 Continue to Details, add a chapter', async () => {
                await W.continueUntil(page, 'Details');
                const r = await L.addChapter(page, 'u42r2 Chapter one');
                await snap('chapter-added', r);
                return r;
            });
            await step('N2 Continue to Review', async () => {
                const at = await W.continueUntil(page, 'Review');
                // review-chapters.tpl carries no item heading: read the lines after "Chapters"
                const main = await page.locator('main').innerText().catch(() => '');
                const i = main.indexOf('\nChapters\n');
                const chapters = i < 0 ? null : flat(main.slice(i, main.indexOf('\nContributors\n', i)), 300);
                await snap('review-chapters', {at, chapters});
                return {at, chapters};
            });
        } else if (app.name === 'ops') {
            await step('N1 add a remote galley on Upload Files', async () => {
                const r = await L.addRemoteGalley(page, 'u42r2 Remote', 'https://example.org/u42r2.pdf');
                await snap('galley-added', r);
                return r;
            });
            await step('N2 Continue to Review', async () => {
                const at = await W.continueUntil(page, 'Review');
                const files = await page.locator('.submissionWizard__reviewPanel:visible').first().innerText().catch(() => null);
                await snap('review-files', {at, files: flat(files, 600)});
                return {at, files: flat(files, 600)};
            });
        }
    } finally {
        record(key, facts);
        await close();
    }
});
