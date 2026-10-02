// Issue reports on the sidebar's "Browse" block (U16 A10, A20, OMP2, OMP3,
// OMP4), walked through the screens on PKP's default test dataset (a dataset
// fleet, harness.md "Dataset fleets"). The kit builds nothing.
// Fact keys carry the step numbers of .reports/issues/c5/steps.md:
//   1     signed out: About › "About the …": the breadcrumb's last step (A20 before)
//   2–3   `rvaca` ticks "Browse Block" on "Plugins", places it under "Sidebar", "Save"
//   4     signed out: the home page's block (OMP2 the list, OMP3 the title)
//   5     About again: the breadcrumb's last step (A20)
//   6     "Computer Science" from the block: its page, the marked link, the breadcrumb
//   7–8   {OJS OPS} `rvaca` deletes "Applied Science" and "Social Sciences"; home page (A10)
//   9–10  {OMP} `rvaca` unticks the block's three "Settings" boxes; home page (OMP4)
// MODE=nb is the neighbour check for a fix trial, alone: steps 2–3, then the
// home page and "Computer Science"'s page with the categories kept, and on a
// press "Series" unticked alone (the block keeps "New Releases" and
// "Categories").
//
// Reset first:  npm run fleet-prep -- --feature issues-c5 --dataset 5 --reset
// Run (main):   PROBE_FEATURE=issues-c5 PROBE_AGENT=c5 node bin/probe.js all shared/playwright/checks/issues/browse-block-sidebar/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-c5-3_5 --dataset 5 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-c5-3_5 PROBE_AGENT=c5 node bin/probe.js all shared/playwright/checks/issues/browse-block-sidebar/walk.js
// Facts: .reports/<feature>/c5/browse-walk[-<run>]-<app>.json (browse-nb… in MODE=nb)
const {forEachApp, launch, signIn, signOut, screen, shot, record} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';
const KEY = MODE === 'nb' ? 'browse-nb' : 'browse-walk';

forEachApp(async (app) => {
    const ctx = app.contextPath;
    const home = app.url(`/index.php/${ctx}/en`);
    const about = app.url(`/index.php/${ctx}/en/about`);
    const catalog = app.name === 'ops' ? 'preprints' : 'catalog';
    const fact = (k, v) => { record(KEY, {[k]: v}, {merge: true}); console.log(`[${KEY}]`, app.name, k, JSON.stringify(v).slice(0, 1200)); };
    const snap = async (page, name) => { record(`${KEY}-${name}`, await screen(page)); await shot(page, `${KEY}-${name}`).catch(() => {}); };
    const step = async (k, fn) => { try { fact(k, await fn()); } catch (e) { fact(k, {error: L.flat(e.message, 400)}); } };
    const {page} = await launch(app);
    const errs = L.scriptErrors(page);

    if (MODE !== 'nb') {
        await step('1-about-before', async () => ({retried: await L.openPublic(page, about), crumb: await L.breadcrumbLast(page), block: await L.readBlock(page)}));
    }
    await signIn(page, 'rvaca');                                                     // 2
    await step('2-enable', () => L.enableBrowse(app, page));
    await step('3-place', () => L.placeBrowse(app, page));                           // 3
    await signOut(page);

    await step('4-home', async () => ({retried: await L.openPublic(page, home), block: await L.readBlock(page), headings: await L.sidebarHeadings(page)}));
    await snap(page, '4-home');
    if (MODE !== 'nb') {
        await step('5-about', async () => ({retried: await L.openPublic(page, about), crumb: await L.breadcrumbLast(page)}));
        await snap(page, '5-about');
    }
    await step('6-category', async () => {
        // From the page just read (About, or the home page in MODE=nb), press the block's link.
        const target = app.url(`/index.php/${ctx}/en/${catalog}/category/comp-sci`);
        let retried = null;
        try {
            await Promise.all([page.waitForURL(/category\/comp-sci/, {timeout: L.T}),
                page.locator('.pkp_structure_sidebar .block_browse').getByRole('link', {name: 'Computer Science', exact: true}).click()]);
            await page.waitForLoadState('load');
        } catch (e) { retried = L.flat(e.message, 120); }
        if (retried || !(await page.locator('.pkp_structure_sidebar').count())) retried = (await L.openPublic(page, target)) || retried || 'reopened';
        await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
        const block = await L.readBlock(page);
        return {url: page.url().replace(/^https?:\/\/[^/]+/, ''), heading: L.flat(await page.locator('h1').first().innerText().catch(() => null)), retried,
            marked: (block.links || []).filter((l) => l.bar).map((l) => `${l.name} (${l.bar})`), crumb: await L.breadcrumbLast(page)};
    });
    await snap(page, '6-category');

    if (MODE === 'nb') {
        if (app.name === 'omp') {
            await signIn(page, 'rvaca');
            await step('nb-omp-series-off', () => L.setBrowseBoxes(app, page, {'New releases': true, 'Categories': true, 'Series': false}));
            await signOut(page);
            await step('nb-omp-home', async () => ({retried: await L.openPublic(page, home), block: await L.readBlock(page)}));
            await snap(page, 'nb-omp-home');
        }
    } else if (app.name === 'omp') {
        await signIn(page, 'rvaca');                                                 // 9
        await step('9-boxes-off', () => L.setBrowseBoxes(app, page, {'New releases': false, 'Categories': false, 'Series': false}));
        await signOut(page);
        await step('10-home', async () => ({retried: await L.openPublic(page, home), block: await L.readBlock(page), headings: await L.sidebarHeadings(page)}));
        await snap(page, '10-home');
    } else {
        await signIn(page, 'rvaca');                                                 // 7
        // The top-level categories of the dataset (OPS's 3.5 dataset holds other ones).
        const tops = app.name === 'ops' && app.line === 'stable-3_5_0' ? ['Biology', 'History', 'Mathematics', 'Social sciences'] : ['Applied Science', 'Social Sciences'];
        for (const name of tops) await step(`7-delete-${name}`, () => L.deleteCategory(app, page, name));
        await signOut(page);
        await step('8-home', async () => ({retried: await L.openPublic(page, home), block: await L.readBlock(page), headings: await L.sidebarHeadings(page)}));
        await snap(page, '8-home');
    }
    fact('script-errors', errs);
});
