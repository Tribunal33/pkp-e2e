// Issue report docs/issues/U41-A1-book-page-long-credits-dangling-comma.md (U41 A1, OMP only): the
// report's Steps to reproduce, walked through the screens on PKP's default test dataset (a dataset
// fleet, harness.md "Dataset fleets"). The kit builds nothing.
//
// Steps (default mode):
//   1-2  dbarnes opens submission 7 "Accessible Elements: …" (Copyediting, five contributors)
//   3    "Preview" in the workflow header: the book page's credits (".item.authors")
//   Control: the published book 14 "From Bricks to Brains" (three contributors), its catalog page.
// MODE=neighbour (the neighbour check for fix.diff): on submission 7's Publication › "Contributors",
//   "Add Contributor" "Ana u41a Person" with role "Author" and no affiliation, "Save"; then "Preview": the new name
//   must stand bare (no comma), the five others keep theirs; book 14's page as in the control.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-u41a --dataset 5 --reset
// Run (main):   PROBE_FEATURE=issues-u41a PROBE_AGENT=u41a node bin/probe.js omp shared/playwright/checks/issues/book-page-long-credits-dangling-comma/walk.js
// Neighbour:    MODE=neighbour PROBE_RUN=nb-out PROBE_FEATURE=issues-u41a PROBE_AGENT=u41a node bin/probe.js omp …/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u41a-3_5 PROBE_AGENT=u41a node bin/probe.js omp …/walk.js
// Facts: .reports/<feature>/u41a/book[-<run>]-omp.json, screens NN-<name>[-<run>]-omp.json
const {forEachApp, launch, signIn, screen, shot, record, idle} = require('../../../probe');
const C = require('../one-role-journal-contributor-save-fails/lib.js');

const MODE = process.env.MODE || 'steps';
const T = 30_000;
const flat = (s, n = 900) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);

/** The book page's credits block: its text and markup. */
async function credits(page) {
    const block = page.locator('.item.authors').first();
    if (!(await block.count())) return {present: false, url: page.url()};
    return {present: true, url: page.url().replace(/^https?:\/\/[^/]+/, ''), text: flat(await block.innerText()),
        html: flat(await block.innerHTML(), 2500)};
}

forEachApp(async (app) => {
    if (app.name !== 'omp') { console.log(`[${app.name}] no book page: OMP only`); return; }
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset)');
    const facts = {mode: MODE, line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1200)}`); };
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name) => {
        const s = await screen(page).catch((e) => ({error: flat(e.message, 200)}));
        record(`${String(++n).padStart(2, '0')}-${name}`, s);
        await shot(page, `${String(n).padStart(2, '0')}-${name}`).catch(() => {});
        return s;
    };
    const step = async (name, fn) => {
        try { return await fn(); } catch (e) { fact(`${name}.FAILED`, flat(e.stack || e)); await snap(`${name}-FAILED`); return null; }
    };
    const loc = app.line && /3_[34]/.test(app.line) ? '' : '/en';

    try {
        await signIn(page, 'dbarnes');
        if (MODE === 'neighbour') {
            await C.openWorkflowContributors(page, app, 7, 7);
            const r = await step('nb-add', () => C.saveContributor(page, {
                fill: {givenName: 'Ana u41a', familyName: 'Person', email: 'u41a@mailinator.com', country: 'Canada'}, roles: {'Author': true}}));
            fact('nbAdd', r && {status: r.request && r.request.status, closed: !r.after6s.open, errors: r.after6s.fieldErrors});
            await C.closeForm(page);
            fact('nbRows', await C.contributorRows(page));
        }

        // 1-3: submission 7's workflow, "Preview" in its header
        await page.goto(app.url(`/index.php/${app.contextPath}${loc}/dashboard/editorial?workflowSubmissionId=7`));
        await idle(page).catch(() => {});
        const preview = page.locator('[role="dialog"]:visible').first().getByRole('button', {name: 'Preview', exact: true}).first();
        await step('preview-wait', () => preview.waitFor({timeout: T}));
        await snap(MODE === 'neighbour' ? 'nb-workflow' : 'workflow');
        fact('previewOffered', await preview.isVisible().catch(() => false));
        await step('preview', async () => {
            await preview.click();
            await page.waitForURL(/\/catalog\/book\//, {timeout: T});
            await idle(page).catch(() => {});
        });
        fact('previewCredits', await credits(page));
        await snap(MODE === 'neighbour' ? 'nb-book-preview' : 'book-preview');

        // control: the published book 14, fewer than five contributors
        await page.goto(app.url(`/index.php/${app.contextPath}${loc}/catalog/book/14`));
        await idle(page).catch(() => {});
        fact('controlCredits', await credits(page));
        await snap(MODE === 'neighbour' ? 'nb-book-14' : 'book-14');
    } finally {
        record('book', facts);
        await close();
    }
});
