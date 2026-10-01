// Issue report docs/issues/U45-OPS4-minor-version-new-galley-dois.md (U45 OPS4):
// on a preprint server with "DOI Versioning" "Yes", a version made with
// "Minor Revision" keeps the preprint's DOI but its galley starts without one
// and gets a new DOI when the version is posted. Takes the report's Steps on
// PKP's default test dataset (a dataset fleet), as `dbarnes`:
//   OPS preprint 2 (the finding), OJS submission 17 and OMP book 14 (the control).
//   1. sign in as dbarnes
//   2. Settings › Distribution › "DOIs" › "Setup": prefix 10.1234, tick the galley
//      (format) kind, "DOI Versioning" "Yes", "Save"
//   3. "DOIs": tick the work, "Bulk Actions" › "Assign DOIs", confirm
//   4. expand its row
//   5. workflow: "Create New Version", "Revision Significance" "Minor Revision", "Confirm"
//   6. "Post" / "Publish" the new version
//   7. "DOIs": expand its row (and "View all" when offered)
// WALK=readers (OPS): the walk, plus version 1.1's "Galleys" page and the DOIs
// page before the post; after it, the preprint page, its galley and the
// earlier version's page signed out; then "Edit" on the DOIs page with the
// earlier galley's DOI typed into "PDF", "Save".
// WALK=neighbour (fix in and out): the same with "Major Revision" at step 5:
// the new version's work and galley start without a DOI and get new ones.
// On stable-3_5_0: steps 1-4, then "Create New Version" is read (3.5 has no
// "Revision Significance") and cancelled.
//
// Reset first:  npm run fleet-prep -- --feature issues-ir2 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-ir2 PROBE_AGENT=ir7 node bin/probe.js all shared/playwright/checks/issues/minor-version-new-galley-dois/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-ir2-3_5 --dataset 2 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-ir2-3_5 PROBE_AGENT=ir7 node bin/probe.js ops shared/playwright/checks/issues/minor-version-new-galley-dois/walk.js
const {forEachApp, launch, signIn, screen, record, sql, idle} = require('../../../probe');
const {APP, storedDois, createVersion, publishLatest, readDoiRow, readVersionsWindow} = require('./lib');

const T = 30_000;
const MODE = process.env.WALK || 'walk';
const PREFIX = '10.1234';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const {expect} = require('@playwright/test');
    const {DoiSettings, DoisPage, recordNotices} = require('../../../pages/DoisPages.js');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const a = APP[app.name];
    const stable35 = app.line === 'stable-3_5_0';
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `${MODE === 'walk' ? '' : `${MODE}-`}${s}${run}-${app.name}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, submission: a.sid};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 1200)}`);
    };

    const {page, close} = await launch(app);
    await recordNotices(page);
    const settings = new DoiSettings(page, app.contextPath);
    const dois = new DoisPage(page, app.contextPath);
    const frame = new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: a.group}});
    const readRow = async (step) => {
        await dois.goto();
        const row = await readDoiRow(page, dois, a.sid);
        row.viewAll = await readVersionsWindow(page, dois, a.sid);
        fact(`${step} row`, row);
        record(name(`${step}-dois`), await screen(page));
        return row;
    };

    try {
        // 1
        await signIn(page, 'dbarnes');
        fact('0 stored', storedDois(sql, app, a.sid));

        // 2
        await settings.goto('Setup');
        if ((await settings.prefixBox().inputValue()) !== PREFIX) await settings.prefixBox().fill(PREFIX);
        await settings.kindBox(a.kind).check();
        const versioning = settings.versioningRadio('Yes');
        fact('2 versioning offered', await versioning.count());
        if (await versioning.count()) await versioning.check();
        const saved = await settings.pressSave(settings.setup);
        await expect(settings.savedStatus(settings.setup)).toBeVisible({timeout: T});
        fact('2 save', {status: saved.status(), kinds: await settings.kinds()});
        record(name('2-setup'), await screen(page));

        // 3
        await dois.goto();
        const assigned = await dois.runBulk('Assign DOIs', [a.sid]);
        fact('3 assign', {status: assigned.status(), notices: await page.evaluate(() => [.../** @type {any} */ (window).__doiNotices || []])});

        // 4
        const before = await readRow('4');
        fact('4 stored', storedDois(sql, app, a.sid));

        // 5
        await frame.gotoEditorial(a.sid);
        await frame.expectVersionLoaded().catch(() => {});
        if (stable35) {
            await frame.menuLink('Title & Abstract').first().click().catch(() => {});
            await idle(page);
            const button = page.getByRole('button', {name: 'Create New Version', exact: true}).first();
            const offered = await button.isVisible({timeout: 5_000}).catch(() => false);
            const out = {offered};
            if (offered) {
                await button.click();
                const w = page.getByRole('dialog').last();
                await w.waitFor({state: 'visible', timeout: T});
                await idle(page);
                const s = await screen(page);
                record(name('5-create-window'), s);
                out.window = String(s.text?.dialog || '').replace(/\s+/g, ' ').slice(0, 600);
                out.significance = await w.getByText('Revision Significance').count();
                out.selects = await w.locator('select').count();
                await w.getByRole('button', {name: /^(Cancel|No)$/}).first().click().catch(() => {});
            }
            fact('5 create (3.5)', out);
            return;
        }
        const significance = MODE === 'neighbour' ? 'Major Revision' : 'Minor Revision';
        const created = await createVersion(page, frame, significance);
        fact('5 create', created);
        record(name('5-created'), await screen(page));
        fact('5 stored', storedDois(sql, app, a.sid));
        if (MODE === 'readers') {
            // Before the post: version 1.1's "Galleys" page in the workflow, and the DOIs page.
            await frame.gotoEditorial(a.sid);
            await frame.expectVersionLoaded().catch(() => {});
            const galleys = frame.menuLink('Galleys');
            if (!(await galleys.last().isVisible().catch(() => false))) await frame.latestVersionNode().click().catch(() => {});
            await galleys.last().click().catch(() => {});
            await idle(page);
            await page.waitForTimeout(1000);
            const g = await screen(page);
            record(name('r5-galleys-page'), g);
            fact('r5 galleys page', String(g.text?.dialog || g.text?.main || '').replace(/\s+/g, ' ').slice(-700));
            await readRow('r5');
        }

        // 6
        await frame.gotoEditorial(a.sid);
        await frame.expectVersionLoaded().catch(() => {});
        const ojsScreen = app.name === 'ojs' ? new (require("../../../../../apps/ojs/playwright/pages/PublishSchedulePages.js").PublishScreen)(page, app.contextPath) : null;
        fact('6 publish', await publishLatest(page, frame, a.post, ojsScreen));
        record(name('6-posted'), await screen(page));
        const after = storedDois(sql, app, a.sid);
        fact('6 stored', after);

        // 7
        const row8 = await readRow('7');
        const pick = (r, t) => (r.rows.find((x) => x.type === t) || {}).doi;
        fact('verdict', {
            work: {before: pick(before, a.work), after: pick(row8, a.work)},
            file: {before: pick(before, a.fileRow), after: pick(row8, a.fileRow)},
            fileShared: pick(before, a.fileRow) === pick(row8, a.fileRow),
            workShared: pick(before, a.work) === pick(row8, a.work),
        });

        if (MODE === 'readers' && app.name === 'ops') {
            // Readers, signed out: the preprint page, its galley, the earlier version's page.
            const reader = await launch(app);
            const r = reader.page;
            const found = (t) => [...new Set(String(t).match(/10\.1234\/[a-z0-9]+/g) || [])];
            try {
                const out = {};
                await r.goto(app.url(`/index.php/${app.contextPath}/preprint/view/${a.sid}`));
                await idle(r);
                record(name('r8-preprint-page'), await screen(r));
                out.current = {dois: found(await r.content())};
                const galleyHref = await r.locator('a.obj_galley_link').first().getAttribute('href').catch(() => null);
                const versionLinks = await r.locator('a[href*="/version/"]').evaluateAll((as) => as.map((x) => ({text: x.textContent.trim(), href: x.getAttribute('href')})));
                out.versionLinks = versionLinks.map((v) => ({...v, href: v.href.replace(/^https?:\/\/[^/]+/, '')}));
                if (galleyHref) {
                    await r.goto(galleyHref);
                    await idle(r);
                    record(name('r8-galley-page'), await screen(r));
                    out.galley = {url: r.url().replace(/^https?:\/\/[^/]+/, ''), dois: found(await r.content())};
                }
                if (versionLinks.length) {
                    await r.goto(versionLinks[0].href);
                    await idle(r);
                    record(name('r8-older-page'), await screen(r));
                    out.older = {url: r.url().replace(/^https?:\/\/[^/]+/, ''), dois: found(await r.content())};
                    const og = await r.locator('a.obj_galley_link').first().getAttribute('href').catch(() => null);
                    if (og) {
                        await r.goto(og);
                        await idle(r);
                        out.olderGalley = {url: r.url().replace(/^https?:\/\/[^/]+/, ''), dois: found(await r.content())};
                    }
                }
                fact('r8 readers', out);
            } finally {
                await reader.close();
            }

            // The way round: "Edit", type the earlier galley's DOI into "PDF", "Save".
            const oldDoi = pick(before, a.fileRow);
            const row = dois.row(a.sid);
            await dois.expand(row, a.sid);
            await dois.startEditing(row);
            await dois.doiBox(row, a.fileRow).fill(oldDoi);
            const answers = [];
            const listener = (x) => {
                if (/\/api\/v1\/dois/.test(x.url()) && x.request().method() !== 'GET') answers.push({status: x.status(), url: x.url().replace(/^https?:\/\/[^/]+/, '')});
            };
            page.on('response', listener);
            await dois.editButton(row).click();
            await page.waitForTimeout(3000);
            page.off('response', listener);
            const failed = dois.failedDialog();
            const failedText = (await failed.count()) ? (await failed.innerText()).replace(/\s+/g, ' ').trim() : null;
            record(name('r9-edit'), await screen(page));
            fact('r9 edit', {
                typed: oldDoi,
                answers,
                failedDialog: failedText,
                notices: await page.evaluate(() => [.../** @type {any} */ (window).__doiNotices || []]),
                box: await dois.doiBox(row, a.fileRow).inputValue().catch(() => null),
                stored: storedDois(sql, app, a.sid),
            });
        }
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
