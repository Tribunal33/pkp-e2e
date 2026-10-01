// Neighbour check for docs/issues/U54-OPS1-open-content-login-box-not-kept.md,
// OPS only, run with the fix applied: a signed-in Reader with no tie to the
// preprint still opens its PDF while the box is ticked. On PKP's default test
// dataset (a dataset fleet, reset first):
//   1. `dbarnes` ticks "Users must be registered and log in to view open access
//      content." on Settings › Users & Roles › "Site Access Options", "Save"
//   2. `ccorino` (Author, Reader; author of preprint 1 only) opens preprint 2
//      and presses "PDF": the viewer opens and the file answers 200
//   3. signed out, preprint 2's "PDF" leads to the Login page
// Run: PROBE_FEATURE=issues-w52 PROBE_AGENT=w52 PROBE_RUN=fixin node bin/probe.js ops shared/playwright/checks/issues/open-content-login-box-not-kept/neighbour.js
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

forEachApp(async (app) => {
    if (app.name !== 'ops') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet');
    const u = (p) => app.url(`/index.php/${app.contextPath}/en${p}`);
    const rel = (s) => s.replace(/^https?:\/\/[^/]+/, '');
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 700)}`);
    };
    const box = (page) => page.locator('input[name="restrictPreprintAccess"]').first();
    const pressPdf = async (page, name) => {
        const downloads = [];
        const onResp = (r) => {
            if (/\/preprint\/download\//.test(r.url())) downloads.push({url: rel(r.url()), status: r.status(), type: r.headers()['content-type'] || null});
        };
        page.context().on('response', onResp);
        await page.goto(u('/preprint/view/2'));
        await idle(page);
        const link = page.locator('a.obj_galley_link').filter({hasText: /PDF/}).first();
        await Promise.all([page.waitForLoadState('load').catch(() => {}), link.click()]);
        await idle(page);
        await sleep(2500);
        page.context().off('response', onResp);
        record(name, await screen(page));
        return {landed: rel(page.url()), title: await page.title(), downloads};
    };

    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        await page.goto(u('/management/settings/access'));
        await idle(page);
        await page.locator('[id="access-button"]').first().click();
        await idle(page);
        await box(page).waitFor({state: 'attached', timeout: 20_000});
        await box(page).check({force: true});
        await page.locator('form').filter({has: box(page)}).first().getByRole('button', {name: 'Save', exact: true}).click();
        await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 10_000}).catch(() => {});
        await idle(page);
        fact('1 stored', sql(app, "select coalesce(max(setting_value), '<no row>') from server_settings where setting_name='restrictPreprintAccess'"));
        await signIn(page, 'ccorino');
        fact('2 ccorino roles', sql(app, "select string_agg(distinct ug.role_id::text, ',') from user_user_groups uug join user_groups ug on ug.user_group_id=uug.user_group_id join users us on us.user_id=uug.user_id where us.username='ccorino'"));
        fact('2 ccorino on preprint 2', sql(app, "select count(*) from stage_assignments sa join users us on us.user_id=sa.user_id where us.username='ccorino' and sa.submission_id=2"));
        fact('2 PDF as ccorino', await pressPdf(page, 'n2-pdf-ccorino'));
        await signOut(page);
        fact('3 PDF signed out', await pressPdf(page, 'n3-pdf-signed-out'));
    } finally {
        record('neighbour-facts', facts);
        await close();
    }
});
