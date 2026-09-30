// Issue report U47 OMP2: on a press, a role whose stages do not include
// Production (the Copyeditor, the Funding Coordinator, the Marketing and Sales
// Coordinator) is offered the "Media" page while the monograph is in their
// stage, and pressing a file name there opens a tab holding the refusal
// "The current role does not have access to this operation." instead of the file.
//
// Walks the report's Steps on PKP's default test dataset (a dataset fleet), OMP:
//   precondition  dbarnes adds figure.png (Image, Web resolution) on submission
//                 1's "Media" page (submission 1 is in Copyediting; svogt is
//                 its Copyeditor).
//   1-3  svogt opens submission 1 › "Publication" › the version › "Media".
//   4    svogt presses "figure.png".
// Control: aclark (the author) presses the same name in their own view.
// Neighbour check (fix in and out): svogt still has the version's other pages;
// dbarnes still has "Media" and downloads; gcox (Layout Editor, submission 4 in
// Production) still has "Media"; svogt's typed address of the page is recorded.
//
// Run, on an install freshly loaded from the default dataset:
//   npm run fleet-prep -- --feature issues --dataset --reset
//   PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js omp shared/playwright/checks/issues/press-media-download-refused-outside-production/walk.js
// Only OMP offers "Media" outside Production; on OJS and OPS the script records
// nothing. The fix check: node bin/try-fix.js apply <this folder>/fix.diff omp
// (rebuilds the JavaScript), reset the dataset, walk, then
// node bin/try-fix.js revert omp.
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const SUBMISSION = 1;
const PRODUCTION_SUBMISSION = 4;
const FILE = 'figure.png';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim());

forEachApp(async (app) => {
    if (app.name !== 'omp') {
        record('facts', {app: app.name, skipped: 'the "Media" page is offered only with Production on this app'});
        return;
    }
    const {expect} = require('@playwright/test');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {MediaFileManager, MEDIA_TEXT} = require('../../../pages/MediaFilesPages.js');
    const fx = (f) => path.join(REPO, `apps/${app.name}/playwright/fixtures/files/${f}`);
    const pubId = (id) => Number(sql(app, `SELECT current_publication_id FROM submissions WHERE submission_id = ${id}`).trim());
    const facts = {app: app.name, line: app.line, dataset: app.dataset, submission: SUBMISSION, startedAt: new Date().toISOString()};
    const pub = pubId(SUBMISSION);
    facts.publicationId = pub;
    facts.assignments = flat(sql(app, `SELECT u.username || '=' || ugs.setting_value FROM stage_assignments sa JOIN users u ON u.user_id = sa.user_id
        JOIN user_group_settings ugs ON ugs.user_group_id = sa.user_group_id AND ugs.setting_name = 'name' AND ugs.locale = 'en'
        WHERE sa.submission_id = ${SUBMISSION} ORDER BY 1`));
    facts.stage = flat(sql(app, `SELECT stage_id FROM submissions WHERE submission_id = ${SUBMISSION}`));

    const {page, close} = await launch(app);
    const frame = new WorkflowPage(page, app.contextPath);
    const media = new MediaFileManager(page, frame);
    const snap = async (name) => {
        const s = await screen(page);
        record(name, s);
        return s;
    };
    // The pages the side menu lists under the newest version (opening the group when folded).
    const versionPages = async () => {
        const nodes = frame.versionNodes();
        await expect(nodes.first().or(frame.publicationGroup()).first()).toBeVisible({timeout: 30_000});
        if (!(await nodes.first().isVisible())) {
            await frame.publicationGroup().click();
        }
        return frame.pagesUnderLatestVersion();
    };
    // Press a file name: what the new tab got and what it shows.
    const pressName = async (key, name) => {
        const link = media.nameLink(name);
        await expect(link).toBeVisible({timeout: 30_000});
        const href = await link.getAttribute('href');
        const target = new URL(href, page.url()).href;
        const context = page.context();
        const tabs = [];
        const onPage = (p) => tabs.push(p);
        context.on('page', onPage);
        const answered = context.waitForEvent('response', {
            predicate: (r) => r.url() === target || r.request().redirectedFrom()?.url() === target,
            timeout: 30_000,
        });
        const out = {href: href.replace(app.baseURL, '')};
        try {
            await link.click();
            const r = await answered;
            out.status = r.status();
            out.contentType = (await r.headerValue('content-type')) || null;
            out.disposition = (await r.headerValue('content-disposition')) || null;
            await expect.poll(() => tabs.length, {timeout: 30_000}).toBeGreaterThan(0);
            await sleep(1500);
            const tab = tabs[0];
            out.newTab = true;
            out.tabUrl = tab.url().replace(app.baseURL, '');
            out.tabText = flat(await tab.locator('body').innerText({timeout: 5_000}).catch(() => null));
        } catch (e) {
            out.error = String(e).slice(0, 300);
        } finally {
            context.off('page', onPage);
            for (const t of tabs) await t.close().catch(() => {});
        }
        record(key, out);
        return out;
    };

    try {
        // ---- Precondition, as dbarnes ------------------------------------------
        await signIn(page, 'dbarnes');
        await media.open(SUBMISSION, pub);
        await idle(page);
        await media.addFiles([{file: fx(FILE), name: FILE, mediaType: 'Image', resolution: MEDIA_TEXT.web}]);
        facts.mediaInDb = flat(sql(app, `SELECT sf.submission_file_id || ':' || sf.file_stage FROM submission_files sf WHERE sf.submission_id = ${SUBMISSION} AND sf.file_stage = 23`));
        await signOut(page);

        // ---- 1-3. svogt opens "Media" from the side menu ---------------------------
        await signIn(page, 'svogt');
        await frame.gotoEditorial(SUBMISSION);
        await idle(page);
        facts.svogtPages = await versionPages();
        await snap('03-svogt-menu');
        if (facts.svogtPages.includes(MEDIA_TEXT.pageLabel)) {
            await media.openFromMenu();
            await idle(page);
            const s = await snap('03-svogt-media');
            facts.svogtMedia = {
                names: await media.sortedNames(),
                addMediaFile: await media.addButton().isVisible(),
                batchLinkMedia: await media.batchButton().isVisible(),
                rowMenu: await media.menuButton(FILE).count(),
                url: s.url.replace(app.baseURL, ''),
            };
            // ---- 4. svogt presses the file name --------------------------------------
            facts.step4 = await pressName('04-svogt-press-name', FILE);
        } else {
            // With the page not listed: the address a person could still type.
            await frame.gotoEditorial(SUBMISSION, {menuKey: `publication_${pub}_media`}).catch((e) => (facts.typedError = String(e).slice(0, 200)));
            await idle(page);
            await sleep(1500);
            const s = await snap('03-svogt-typed-media-address');
            facts.svogtTyped = {heading: flat(await frame.heading().innerText().catch(() => null)), text: flat(s.text.dialog).slice(0, 600),
                mediaTable: await page.getByRole('table', {name: MEDIA_TEXT.tableLabel}).count()};
        }
        await signOut(page);

        // ---- Control: the author downloads -----------------------------------------
        await signIn(page, 'aclark');
        await media.openAuthor(SUBMISSION, pub);
        await idle(page);
        await snap('05-aclark-media');
        facts.aclark = await pressName('05-aclark-press-name', FILE);
        await signOut(page);

        // ---- Neighbours: dbarnes keeps "Media" and downloads; gcox in Production keeps "Media"
        await signIn(page, 'dbarnes');
        await frame.gotoEditorial(SUBMISSION);
        await idle(page);
        facts.dbarnesPages = await versionPages();
        await media.openFromMenu();
        await idle(page);
        facts.dbarnes = await pressName('06-dbarnes-press-name', FILE);
        await signOut(page);

        await signIn(page, 'gcox');
        await frame.gotoEditorial(PRODUCTION_SUBMISSION);
        await idle(page);
        facts.gcoxPagesSubmission4 = await versionPages();
        await snap('07-gcox-menu');
        await signOut(page);
    } catch (e) {
        facts.error = String(e.stack || e).slice(0, 1500);
        await snap('zz-failed').catch(() => {});
    } finally {
        record('facts', facts);
        await close();
    }
});
