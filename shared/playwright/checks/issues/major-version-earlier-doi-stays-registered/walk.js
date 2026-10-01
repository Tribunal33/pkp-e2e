// Issue report docs/issues/U45-A17-major-version-earlier-doi-stays-registered.md (U45 A17):
// with "DOI Versioning" "Yes", publishing a new major version (2.0) leaves the
// earlier version's registered DOI "Registered" instead of "Needs Sync". Takes the
// report's Steps on PKP's default test dataset (a dataset fleet), as `dbarnes`,
// on OJS submission 17, OMP book 14 and OPS preprint 2:
//   1. sign in as dbarnes
//   2. Settings › Distribution › "DOIs" › "Setup": prefix 10.1234, "DOI Versioning" "Yes", "Save"
//   3. "DOIs": tick the work, "Bulk Actions" › "Assign DOIs", confirm
//   4. tick it, "Bulk Actions" › "Mark DOIs Registered", confirm; expand its row
//   5. workflow: "Create New Version", "Revision Significance" "Major Revision", "Confirm"
//   6. "Publish" / "Post" version 2.0
//   7. "DOIs": expand its row, "View all"
// WALK=neighbour (fix in and out) goes on after step 7:
//   8. tick the work, "Mark DOIs Registered" again
//   9. "Create New Version", "Minor Revision", "Confirm" (2.1), publish it
//  10. "DOIs": "View all": 2.0/2.1's DOI "Needs Sync", 1.0's untouched ("Registered")
// On stable-3_5_0 (OPS only: OJS and OMP 3.5 offer no "DOI Versioning"): steps 1-4,
// "Create New Version" ("Yes"; no "Revision Significance"), "Post", step 7.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir2 --dataset 2 --reset
// Run (main):   WALK=neighbour PROBE_FEATURE=issues-ir2 PROBE_AGENT=ir11 node bin/probe.js all shared/playwright/checks/issues/major-version-earlier-doi-stays-registered/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir2-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir2-3_5 PROBE_AGENT=ir11 node bin/probe.js ops shared/playwright/checks/issues/major-version-earlier-doi-stays-registered/walk.js
const {forEachApp, launch, signIn, screen, record, sql} = require('../../../probe');
const {APP, createVersion, publishLatest, readDoiRow, readVersionsWindow} = require('../minor-version-new-galley-dois/lib');
const {storedStatuses, createVersion35, publish35} = require('./lib');

const T = 30_000;
const MODE = process.env.WALK || 'walk';
const PREFIX = '10.1234';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const stable35 = app.line === 'stable-3_5_0';
    if (stable35 && app.name !== 'ops') {
        console.log(`[fact] ${app.name} skipped: 3.5 offers "DOI Versioning" on a preprint server only`);
        return;
    }
    const {expect} = require('@playwright/test');
    const {DoiSettings, DoisPage, recordNotices} = require('../../../pages/DoisPages.js');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const a = APP[app.name];
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const fixTag = process.env.FIX ? `-fix` : '';
    const name = (s) => `${s}${run}${fixTag}-${app.name}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, fix: !!process.env.FIX, submission: a.sid};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1500)}`);
    };

    const {page, close} = await launch(app);
    await recordNotices(page);
    const settings = new DoiSettings(page, app.contextPath);
    const dois = new DoisPage(page, app.contextPath);
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: a.group}});
    const notices = () => page.evaluate(() => [.../** @type {any} */ (window).__doiNotices || []]);
    const readRow = async (step) => {
        await dois.goto();
        const row = await readDoiRow(page, dois, a.sid);
        row.viewAll = await readVersionsWindow(page, dois, a.sid);
        fact(`${step} row`, row);
        record(name(`${step}-dois`), await screen(page));
        fact(`${step} stored`, storedStatuses(sql, app, a.sid));
        return row;
    };
    const publish = async () => {
        await frame.gotoEditorial(a.sid);
        await frame.expectVersionLoaded().catch(() => {});
        if (stable35) return publish35(page, a.post);
        const ojsScreen = app.name === 'ojs' ? new (require('../../../../../apps/ojs/playwright/pages/PublishSchedulePages.js').PublishScreen)(page, app.contextPath) : null;
        return publishLatest(page, frame, a.post, ojsScreen);
    };

    try {
        // 1
        await signIn(page, 'dbarnes');
        fact('0 stored', storedStatuses(sql, app, a.sid));

        // 2
        await settings.goto('Setup');
        if ((await settings.prefixBox().inputValue()) !== PREFIX) await settings.prefixBox().fill(PREFIX);
        const versioning = settings.versioningRadio('Yes');
        fact('2 versioning offered', await versioning.count());
        await versioning.check();
        const saved = await settings.pressSave(settings.setup);
        await expect(settings.savedStatus(settings.setup)).toBeVisible({timeout: T});
        fact('2 save', {status: saved.status(), kinds: await settings.kinds()});
        record(name('2-setup'), await screen(page));

        // 3
        await dois.goto();
        const assigned = await dois.runBulk('Assign DOIs', [a.sid]);
        fact('3 assign', {status: assigned.status(), notices: await notices()});

        // 4
        await dois.goto();
        const marked = await dois.runBulk('Mark DOIs Registered', [a.sid]);
        fact('4 mark registered', {status: marked.status(), notices: await notices()});
        await readRow('4');

        // 5
        await frame.gotoEditorial(a.sid);
        await frame.expectVersionLoaded().catch(() => {});
        fact('5 create', stable35 ? await createVersion35(page, frame) : await createVersion(page, frame, 'Major Revision'));
        record(name('5-created'), await screen(page));

        // 6
        fact('6 publish', await publish());
        record(name('6-published'), await screen(page));

        // 7
        const after = await readRow('7');
        const stored = storedStatuses(sql, app, a.sid);
        fact('verdict', {
            first: stored[0],
            newest: stored[stored.length - 1],
            firstNeedsSync: stored[0].doiStatus === 'Needs Sync',
            windowBlocks: (after.viewAll || []).map((b) => ({heading: b.heading, badges: b.rows.map((r) => `${r.type}: ${r.doi} ${r.badge}`)})),
        });

        if (MODE === 'neighbour' && !stable35) {
            // 8
            await dois.goto();
            const again = await dois.runBulk('Mark DOIs Registered', [a.sid]);
            fact('8 mark registered', {status: again.status(), notices: await notices()});
            fact('8 stored', storedStatuses(sql, app, a.sid));

            // 9
            await frame.gotoEditorial(a.sid);
            await frame.expectVersionLoaded().catch(() => {});
            fact('9 create', await createVersion(page, frame, 'Minor Revision'));
            fact('9 publish', await publish());

            // 10
            await readRow('10');
            const s = storedStatuses(sql, app, a.sid);
            fact('neighbour verdict', {
                v1: s[0].doiStatus,
                family: s.slice(1).map((p) => `${p.version} ${p.doi} ${p.doiStatus}`),
                firstUntouched: s[0].doiStatus === 'Registered',
                familyNeedsSync: s.slice(1).every((p) => p.doiStatus === 'Needs Sync'),
            });
        }
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
