// Issue report on U23 A5 (a third click on a sorted column header switches the sort off, but the
// page's address keeps `sortColumn`/`sortDirection`, so a reload or a shared address brings the sort
// back): the report's Steps to reproduce, walked on PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"). The kit builds nothing.
//
// Default mode, the Steps (OJS, OMP, OPS):
//   1 sign in as dbarnes   2 side menu "Active submissions"   3 click "ID"   4 click "ID"
//   5 click "ID"   6 reload the page
// `reach` as the argument (runs alone): the same three clicks and a reload on the author's
//   My Submissions (ccorino on OJS and OPS, afinkel on OMP) and on the reviewer's list (jjanssen,
//   OJS and OMP; a preprint server has no review).
// `neighbour` as the argument (the fix in and out; runs alone): as dbarnes on "Active submissions",
//   click "Days" (descending), then "ID" (a new column, descending), reload (the ID sort must come
//   back), then search "the" (typed, Enter) and click "ID" twice (ascending, then off): the view and the
//   phrase must stay in the address while only the sort leaves it.
// Each step records the address's query, the headers' aria-sort, the row IDs shown and the
// ordering the list request asked for, never throwing.
//
// Reset first:  npm run fleet-prep -- --feature issues-u23r2 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u23r2 PROBE_AGENT=u23r2 node bin/probe.js all shared/playwright/checks/issues/dashboard-unsort-keeps-sort-in-address/walk.js [reach|neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u23r2-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u23r2-3_5 PROBE_AGENT=u23r2 node bin/probe.js all shared/playwright/checks/issues/dashboard-unsort-keeps-sort-in-address/walk.js
// The fix:      node bin/try-fix.js apply shared/playwright/checks/issues/dashboard-unsort-keeps-sort-in-address/fix.diff <app>
// Facts: .reports/<feature>/u23r2/a5-<mode>-<app>.json (PROBE_RUN adds its tag)
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');

const ARGS = process.argv.slice(2);
const MODE = ARGS.includes('neighbour') ? 'neighbour' : ARGS.includes('reach') ? 'reach' : 'steps';
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const safe = (p) => p.catch((e) => ({error: flat(e.message, 300)}));

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset)');
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, mode: MODE, steps: {}};
    const {page, close} = await launch(app);
    const listRequests = [];
    page.on('request', (r) => {
        if (r.method() === 'GET' && /\/api\/v1\/_submissions(\/(assigned|reviewerAssignments))?\?/.test(r.url())) {
            listRequests.push(r.url());
        }
    });
    const query = () => {
        const u = new URL(page.url());
        return Object.fromEntries(u.searchParams.entries());
    };
    const headers = async () =>
        safe(page.getByRole('columnheader').evaluateAll((els) =>
            els.map((e) => ({name: e.innerText.replace(/\s+/g, ' ').trim(), ariaSort: e.getAttribute('aria-sort')}))));
    const rowIds = async () =>
        safe(page.locator('table tbody tr').evaluateAll((rows) =>
            rows.map((r) => (r.querySelector('td, th') ? r.querySelector('td, th').innerText.trim() : '')).slice(0, 40)));
    const ordering = (url) => {
        if (!url) return null;
        const u = new URL(url);
        return {path: u.pathname.replace(/.*\/api\/v1\//, ''), orderBy: u.searchParams.get('orderBy'), orderDirection: u.searchParams.get('orderDirection')};
    };
    const fact = async (k, extra = {}) => {
        await safe(idle(page));
        const v = {query: query(), headers: await headers(), rowIds: await rowIds(), lastListRequest: ordering(listRequests[listRequests.length - 1]), ...extra};
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
        return v;
    };
    // Press a column's sort button and wait out the list's reload.
    const clickSort = async (k, column) => {
        const before = listRequests.length;
        const r = await safe(page.getByRole('columnheader', {name: new RegExp(`^${column}\\b`, 'i')}).getByRole('button').first().click());
        for (let i = 0; i < 50 && listRequests.length === before; i++) await page.waitForTimeout(100);
        return fact(k, {click: r && r.error ? r : 'ok', listReloaded: listRequests.length > before});
    };
    const reload = async (k) => {
        await safe(page.reload());
        await safe(page.getByRole('heading', {level: 1}).waitFor({timeout: 30_000}));
        await page.waitForTimeout(500);
        return fact(k, {heading: await safe(page.getByRole('heading', {level: 1}).innerText())});
    };
    const sideNav = () => page.locator('#app-nav');
    // Sign in on the context's own login page; where it does not land on the list, open the list by its address.
    const signInTo = async (user, list) => {
        await signIn(page, user, {contextPath: app.contextPath});
        await safe(idle(page));
        facts[`landing ${user}`] = page.url();
        if (!page.url().includes(`/dashboard/${list}`)) {
            await safe(page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/${list}`)));
        }
        await safe(page.getByRole('heading', {level: 1}).waitFor({timeout: 30_000}));
        await safe(idle(page));
    };
    const openView = async (name, hrefPart) => {
        const link = sideNav().locator(`a[href*="${hrefPart}"]`).filter({has: page.getByText(name, {exact: true})}).first();
        if (!(await link.isVisible().catch(() => false))) {
            facts.sideNav = await safe(sideNav().innerText().then((t) => flat(t, 800)));
        }
        const r = await safe(link.click());
        await safe(page.getByRole('heading', {level: 1, name: new RegExp(`^${name}`)}).waitFor({timeout: 30_000}));
        return r;
    };
    // The three clicks on "ID" and a reload, on whichever list is open.
    const threeClicksAndReload = async (prefix) => {
        await clickSort(`${prefix}click ID (1)`, 'ID');
        await clickSort(`${prefix}click ID (2)`, 'ID');
        await clickSort(`${prefix}click ID (3)`, 'ID');
        record(`a5-${MODE}-${prefix.replace(/\W+/g, '') || 'list'}-after-third`, await screen(page));
        await reload(`${prefix}reload`);
    };

    try {
        if (MODE === 'steps' || MODE === 'neighbour') {
            await signInTo('dbarnes', 'editorial');
            await fact('1 signed in', {heading: await safe(page.getByRole('heading', {level: 1}).innerText())});
            const r = await openView('Active submissions', 'dashboard/editorial');
            await fact('2 Active submissions', {open: r && r.error ? r : 'ok', heading: await safe(page.getByRole('heading', {level: 1}).innerText())});
            record(`a5-${MODE}-active`, await screen(page));
        }
        if (MODE === 'steps') {
            await clickSort('3 click ID', 'ID');
            await clickSort('4 click ID again', 'ID');
            await clickSort('5 click ID a third time', 'ID');
            record('a5-steps-after-third-click', await screen(page));
            await reload('6 reload');
            record('a5-steps-after-reload', await screen(page));
        } else if (MODE === 'neighbour') {
            await clickSort('nb1 click Days', 'Days');
            await clickSort('nb2 click ID', 'ID');
            await reload('nb3 reload');
            const box = page.locator('#app-main').getByRole('searchbox').first();
            const typed = await safe(box.fill('the').then(() => box.press('Enter')));
            await page.waitForTimeout(1500);
            await fact('nb4 search phrase "the"', {typed: typed && typed.error ? typed : 'ok'});
            await clickSort('nb5 click ID (ascending)', 'ID');
            await clickSort('nb6 click ID (off)', 'ID');
            record('a5-neighbour-end', await screen(page));
        } else {
            const author = app.name === 'omp' ? 'afinkel' : 'ccorino';
            await signInTo(author, 'mySubmissions');
            await fact(`r1 ${author} signed in`, {heading: await safe(page.getByRole('heading', {level: 1}).innerText())});
            await threeClicksAndReload('my submissions: ');
            if (app.name !== 'ops') {
                await signInTo('jjanssen', 'reviewAssignments');
                await fact('r2 jjanssen signed in', {heading: await safe(page.getByRole('heading', {level: 1}).innerText())});
                await threeClicksAndReload('review assignments: ');
            }
        }
    } catch (e) {
        facts.error = flat(e.stack || e.message, 800);
    } finally {
        facts.listRequests = listRequests.map(ordering);
        record(`a5-${MODE}`, facts);
        await close();
    }
});
