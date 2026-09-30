/**
 * @file shared/playwright/checks/harness/dataset/dataset.js
 *
 * The dataset fleets' smoke walk (harness.md "Dataset fleets",
 * docs/process/dataset.md): per app, sign in as the dataset's `dbarnes`
 * (the editor; password the username twice), record the dashboard, then
 * open one submission (the first in review, else the first in progress)
 * and record its workflow; then `admin` (password `admin`) on
 * Administration. With the argument `scratch` it also proves the
 * `_test` API beside the dataset (main and 3.5): a scratch context with a
 * manager of its own, who signs in. That adds a context to the dataset, so
 * reset the fleet afterwards when reporters use it.
 *
 *   npm run fleet-prep -- --feature issues --dataset --reset
 *   PROBE_FEATURE=issues PROBE_AGENT=dataset node bin/probe.js all shared/playwright/checks/harness/dataset/dataset.js [scratch]
 *   (3.5: PKP_E2E_LINE=stable-3_5_0 on fleet-prep, feature issues-3_5; bin/probe.js reads the line from fleet.json)
 */
const {forEachApp, launch, signIn, signOut, screen, record, shot, idle, sql, tag} = require('../../../probe');

const withScratch = process.argv.slice(2).includes('scratch');

forEachApp(async (app) => {
    if (!app.dataset) {
        throw new Error(`${app.name}: not a dataset fleet — prepare one with fleet-prep --dataset and run with its PROBE_FEATURE`);
    }
    const ctx = app.contextPath;
    // The Vue dashboard from 3.5 on; 3.4 and 3.3 list submissions at /submissions and open one at /workflow/access.
    const modern = app.line === 'main' || app.line === 'stable-3_5_0';
    const locale = modern ? '/en' : '';
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes', {contextPath: ctx});
        await idle(page);
        record('landing', await screen(page));

        await page.goto(app.url(modern ? `/index.php/${ctx}${locale}/dashboard/editorial` : `/index.php/${ctx}/submissions`));
        await idle(page);
        const dashboard = await screen(page);
        record('dashboard', dashboard);
        await shot(page, 'dashboard');

        const [id, stage] = sql(
            app,
            'SELECT submission_id, stage_id FROM submissions WHERE status = 1 ORDER BY (stage_id = 3) DESC, submission_id LIMIT 1',
        ).split('|');
        const title = sql(
            app,
            `SELECT setting_value FROM publication_settings ps JOIN submissions s ON s.current_publication_id = ps.publication_id
             WHERE s.submission_id = ${id} AND ps.setting_name = 'title' ORDER BY (ps.locale = s.locale) DESC LIMIT 1`,
        );
        await page.goto(
            app.url(modern ? `/index.php/${ctx}${locale}/dashboard/editorial?workflowSubmissionId=${id}` : `/index.php/${ctx}/workflow/access/${id}`),
        );
        await idle(page);
        await page.getByText(title.replace(/<[^>]+>/g, '').slice(0, 40)).first().waitFor({timeout: 15_000});
        const workflow = await screen(page);
        record('submission', {id: Number(id), stage: Number(stage), title, screen: workflow});
        await shot(page, 'submission');
        await signOut(page);

        // The site administrator: `admin`/`admin` on every dataset.
        await signIn(page, 'admin');
        await page.goto(app.url('/index.php/index/admin'));
        await idle(page);
        const admin = await screen(page);
        record('admin', admin);
        await signOut(page);

        let scratch = null;
        if (withScratch) {
            if (!app.testApi) {
                scratch = {skipped: `no _test API on ${app.line}`};
            } else {
                const path = tag('ds');
                await app.api.createContext({tag: path, users: [{username: `${path}mgr`, roles: ['manager']}]});
                await signIn(page, `${path}mgr`, {password: `${path}mgr${path}mgr`, contextPath: path});
                await idle(page);
                scratch = {path, manager: `${path}mgr`, landing: (await screen(page)).url};
                await signOut(page);
            }
            record('scratch', scratch);
        }
        console.log(
            `[dataset] ${app.name} on ${app.line} (dataset fleet ${app.dataset}, ${app.baseURL}): dbarnes → "${dashboard.title}"; ` +
                `submission ${id} "${title.slice(0, 50)}" open; admin → "${admin.title}"${scratch ? `; scratch ${JSON.stringify(scratch)}` : ''}`,
        );
    } finally {
        await close();
    }
});
