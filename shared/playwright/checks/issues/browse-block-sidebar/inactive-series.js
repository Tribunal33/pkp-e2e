// Issue report docs/issues/U16-OMP4-press-browse-block-empty-box.md, its "Inactive series" steps
// (spec U68 A11): on a press whose every series is inactive, the placed "Browse" block still shows
// the line "Series" with nothing under it. PKP's default test dataset (a dataset fleet), OMP only:
// a journal's and a server's block have no series line. The kit builds nothing.
//   1  `rvaca` places "Browse Block" under "Sidebar" (Appearance › Setup), "Save"
//   2  signed out: the home page's block (every series active)
//   3  `rvaca`: Settings › Press › "Series", each row's "Inactive" box, "Confirm" › "OK"
//   4  signed out: the home page's block
// MODE=nb is the neighbour check for a fix trial, alone: steps 1, 3 for "History" only, 4 (the
// "Series" line keeps the four active series and leaves out "History").
//
// Reset first:  npm run fleet-prep -- --feature issues-u68d --dataset 4 --apps omp --reset
// Run (main):   PROBE_FEATURE=issues-u68d PROBE_AGENT=u68d node bin/probe.js omp shared/playwright/checks/issues/browse-block-sidebar/inactive-series.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u68d-3_5 --dataset 4 --apps omp --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u68d-3_5 PROBE_AGENT=u68d node bin/probe.js omp shared/playwright/checks/issues/browse-block-sidebar/inactive-series.js
// Facts: .reports/<feature>/u68d/series-walk[-<run>]-omp.json (series-nb… in MODE=nb)
const {forEachApp, launch, signIn, signOut, screen, shot, record} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';
const KEY = MODE === 'nb' ? 'series-nb' : 'series-walk';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('inactive-series.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'omp') {
        console.log(`[${KEY}] ${app.name}: no series line in its "Browse" block; skipped`);
        return;
    }
    const {SectionsTab} = require('../../../pages/SectionsPages.js');
    const home = app.url(`/index.php/${app.contextPath}/en`);
    const fact = (k, v) => { record(KEY, {[k]: v}, {merge: true}); console.log(`[${KEY}]`, app.name, k, JSON.stringify(v).slice(0, 1500)); };
    const snap = async (page, name) => { record(`${KEY}-${name}`, await screen(page)); await shot(page, `${KEY}-${name}`).catch(() => {}); };
    const step = async (k, fn) => { try { fact(k, await fn()); } catch (e) { fact(k, {error: L.flat(e.message, 400)}); } };
    const {page} = await launch(app);
    const errs = L.scriptErrors(page);
    const readHome = async () => {
        const retried = await L.openPublic(page, home);
        const block = await L.readBlock(page);
        // The "Series" line as drawn: its text and how many links its list holds.
        const series = await page.locator('.pkp_structure_sidebar .block_browse nav > ul > li.has_submenu').evaluateAll((lis) => lis.map((li) => ({
            line: (li.firstChild && li.firstChild.textContent || '').replace(/\s+/g, ' ').trim(),
            links: [...li.querySelectorAll(':scope > ul > li > a')].map((a) => a.textContent.replace(/\s+/g, ' ').trim()),
            emptyList: !!li.querySelector(':scope > ul') && !li.querySelector(':scope > ul > li'),
            height: Math.round(li.getBoundingClientRect().height),
        }))).catch((e) => ({error: L.flat(e.message, 200)}));
        return {retried, text: block.text, lines: block.lines, submenus: series, aria: block.aria, height: block.height};
    };

    await signIn(page, 'rvaca');                                                     // 1
    await step('1-place', () => L.placeBrowse(app, page));
    await signOut(page);

    if (MODE !== 'nb') {
        await step('2-home-before', readHome);                                       // 2
        await snap(page, '2-home-before');
    }

    await signIn(page, 'rvaca');                                                     // 3
    const tab = new SectionsTab(page, app.contextPath, {tab: 'Series', addLabel: 'Add Series', formId: 'seriesForm', locale: 'en'});
    await step('3-series-list', async () => {
        await tab.goto();
        const rows = (await tab.titleCells().allInnerTexts()).map((t) => L.flat(t));
        const ticked = [];
        for (const r of rows) ticked.push(await tab.inactiveBox(r).isChecked());
        return {rows, inactive: ticked};
    });
    const rows = (await tab.titleCells().allInnerTexts().catch(() => [])).map((t) => L.flat(t));
    const targets = MODE === 'nb' ? ['History'] : rows;
    for (const title of targets) {
        await step(`3-inactive-${title}`, async () => {
            const win = await tab.pressInactive(title);
            const question = L.flat(await win.question().innerText());
            const r = await tab.confirm(win);
            return {question, status: r.status(), ticked: await tab.inactiveBox(title).isChecked()};
        });
    }
    await step('3-series-after', async () => {
        await tab.reload();
        const out = [];
        for (const r of (await tab.titleCells().allInnerTexts()).map((t) => L.flat(t))) out.push(`${r}${(await tab.inactiveBox(r).isChecked()) ? ' [inactive]' : ''}`);
        return out;
    });
    await snap(page, '3-series-after');
    await signOut(page);

    await step('4-home', readHome);                                                  // 4
    await snap(page, '4-home');
    fact('script-errors', errs);
});
