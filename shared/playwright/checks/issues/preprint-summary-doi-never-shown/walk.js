// Issue report docs/issues/U13-OPS6-preprint-summary-doi-never-shown.md (U13 OPS6):
// the preprint summary on a preprint server's lists ("Latest preprints" on
// the home page, "Archives") never shows the preprint's DOI, although the
// preprint's own page does. Takes the report's Steps through the screens on
// OPS, on a dataset fleet freshly reset to PKP's default test dataset, as
// `dbarnes` (Preprint Server manager of `publicknowledge`):
//   2.   Settings › Distribution › DOIs › Setup: "DOI Prefix" 10.1234, Save
//   3-4. DOIs page: tick preprint 2 "The Facets Of Job Satisfaction: A
//        Nine-Nation Comparative Study Of Construct Equivalence", Bulk
//        Actions › "Assign DOIs"
//   5.   the preprint's page: its "DOI:" line (the control)
//   6.   "Archives": preprint 2's summary (the finding)
// Extra read: the home page's "Latest preprints", the same summary; it
// lists the ten latest, and on the dataset (every preprint posted the same
// day) which ten is not fixed, so preprint 2 may not be among them.
// Neighbours, read on the same lists: preprint 15 "Yam diseases and its
// management in Nigeria", which has no DOI,
// must show no "DOI:" line with or without the fix, and the preprint's own
// page keeps its single "DOI:" line.
// Run (reset the fleet first):
//   npm run fleet-prep -- --feature issues-ir7 --dataset 2 --reset
//   PROBE_FEATURE=issues-ir7 PROBE_AGENT=ir7 node bin/probe.js ops shared/playwright/checks/issues/preprint-summary-doi-never-shown/walk.js
// On 3.5: PKP_E2E_LINE=stable-3_5_0 in front of both, feature issues-ir7-3_5.
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');

const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

forEachApp(async (app) => {
    if (app.name !== 'ops') return; // the DOI line exists in OPS's preprint summary only
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const {DoiSettings, DoisPage, recordNotices} = require('../../../pages/DoisPages.js');
    const ctx = app.contextPath;
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 1500)}`);
    };

    // One preprint's summary on a list page: its text, whether it carries a
    // DOI line, and that line's link.
    const summary = async (page, id) => {
        const box = page.locator('.obj_preprint_summary').filter({has: page.locator(`[id="preprint-${id}"]`)});
        const n = await box.count();
        if (n === 0) return {listed: false};
        const first = box.first();
        const doi = first.locator('.doi');
        return {
            listed: true,
            count: n,
            text: flat(await first.innerText()),
            doiLine: (await doi.count()) ? flat(await doi.first().innerText()) : null,
            doiHref: (await doi.locator('a').count()) ? await doi.locator('a').first().getAttribute('href') : null,
        };
    };

    const {page, close} = await launch(app);
    try {
        await recordNotices(page);
        fact('0 dois before', sql(app, 'select count(*) from dois'));

        // 1. sign in
        await signIn(page, 'dbarnes');

        // 2. DOI prefix
        const settings = new DoiSettings(page, ctx);
        await settings.goto('Setup');
        fact('2 kinds', await settings.kinds());
        fact('2 prefix before', await settings.prefixBox().inputValue());
        await settings.prefixBox().fill('10.1234');
        const saved = await settings.save(settings.setup);
        record('02-setup-saved', await screen(page));
        fact('2 setup save', {status: saved.status()});

        // 3-4. Assign DOIs on preprint 2
        const dois = new DoisPage(page, ctx);
        await dois.goto();
        const row = dois.row(2);
        await row.waitFor({timeout: 30_000});
        fact('3 row', flat(await dois.rowLink(row).innerText()));
        const assigned = await dois.runBulk('Assign DOIs', [2]);
        await dois.expand(row, 2);
        record('04-assigned', await screen(page));
        fact('4 assigned', {status: assigned.status(), expanded: flat(await dois.expanded(row).innerText(), 400)});
        fact('4 dois rows', sql(app, 'select d.doi, p.submission_id, p.publication_id from dois d join publications p on p.doi_id = d.doi_id').split('\n'));

        // 5. the preprint's own page (signed out, as a reader)
        await signOut(page);
        await page.goto(app.url(`/index.php/${ctx}/preprint/view/2`));
        await idle(page);
        record('05-preprint-page', await screen(page));
        const landingDoi = page.locator('.item.doi');
        fact('5 preprint page DOI', {count: await landingDoi.count(), text: (await landingDoi.count()) ? flat(await landingDoi.first().innerText()) : null});

        // 6. Archives
        await page.getByRole('link', {name: 'Archives', exact: true}).first().click();
        await idle(page);
        record('06-archives', await screen(page));
        fact('6 archives url', page.url().replace(/^https?:\/\/[^/]+/, ''));
        fact('6 archives preprint 2', await summary(page, 2));
        fact('6 archives preprint 15 (no DOI)', await summary(page, 15));
        fact('6 archives DOI lines', await page.locator('.obj_preprint_summary .doi').count());
        // extra: home page, "Latest preprints"
        await page.goto(app.url(`/index.php/${ctx}`));
        await idle(page);
        record('07-home', await screen(page));
        fact('x home preprint 2', await summary(page, 2));
        fact('x home preprint 15 (no DOI)', await summary(page, 15));
        fact('x home DOI lines', await page.locator('.obj_preprint_summary .doi').count());

    } finally {
        record('facts', facts);
        await close();
    }
});
