// Issue report U47 A6 (with U48 A20): every media file "Upload Files" adds,
// and every "Upload" on "JATS XML", writes a PHP warning to the server's log
// ("foreach() argument must be of type array|object, string given in
// …/lib/pkp/classes/core/PKPBaseController.php"), though the screen shows the
// file added normally.
//
// Walks the report's Steps on PKP's default test dataset (a dataset fleet):
//   1-5  dbarnes › the Production submission › "Media" › "Add Media File" ›
//        figure.png, Image, Web resolution › "Upload Files" (main only: the
//        "Media" page exists there alone).
//   6-7  OJS: dbarnes › submission 5 › "JATS XML" › "Upload" › article.xml
//        (main and 3.5).
// Neighbour check (fix in and out): "Edit Metadata" on the added media file,
// name "u47r34 figure" › "Save" (a locale map posted) is saved and shows after a
// reload; a second JATS "Upload" (a revision, main only) is accepted. Each step records
// the PHP lines the server logged for it.
//
// Run, on an install freshly loaded from the default dataset:
//   npm run fleet-prep -- --feature issues --dataset --reset
//   PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/media-jats-upload-php-warning-in-log/walk.js
// 3.5 (JATS only): the same two commands with PKP_E2E_LINE=stable-3_5_0 in front.
// The fix check: node bin/try-fix.js apply <this folder>/fix.diff ojs omp ops,
// reset the dataset, walk, then node bin/try-fix.js revert ojs omp ops.
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const SUBMISSION = {ojs: 5, omp: 4, ops: 1};
const WEB = 'figure.png';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim());

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const {MediaFileManager, MEDIA_TEXT} = require('../../../pages/MediaFilesPages.js');
    const {JatsPage} = require('../../../pages/JatsBodyTextPages.js');
    const line = app.line || 'main';
    const submissionId = SUBMISSION[app.name];
    const fx = (f) => path.join(REPO, `apps/${app.name}/playwright/fixtures/files/${f}`);
    const labels = app.name === 'ops' ? {publicationGroup: 'Preprint'} : {};
    const facts = {app: app.name, line, dataset: app.dataset, submission: submissionId, startedAt: new Date().toISOString()};
    const pubId = Number(sql(app, `SELECT current_publication_id FROM submissions WHERE submission_id = ${submissionId}`).trim());
    facts.publicationId = pubId;
    const mediaRows = () => flat(sql(app, `SELECT sf.submission_file_id || ':' || coalesce(sfs.setting_value, '?') || ':' || coalesce(sfs.locale, '?') FROM submission_files sf
        LEFT JOIN submission_file_settings sfs ON sfs.submission_file_id = sf.submission_file_id AND sfs.setting_name = 'name'
        WHERE sf.submission_id = ${submissionId} AND sf.file_stage = 23 ORDER BY 1`));

    // The PHP lines the fleet's server logged since `from`.
    const logFile = path.join(REPO, 'apps', app.name, 'playwright', '.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    const logSize = () => { try { return fs.statSync(logFile).size; } catch { return 0; } };
    const logSince = (from) => {
        try {
            return fs.readFileSync(logFile).slice(from).toString('utf8').split('\n')
                .filter((l) => /PHP |\[5\d\d\]|\/mediaFiles|\/jats/.test(l) && !/Accepted|Closing/.test(l))
                .map((l) => l.replace(/^\[[^\]]+\] /, '').replace(REPO, '').slice(0, 300)).slice(0, 20);
        } catch { return [`(no log at ${logFile})`]; }
    };
    facts.logFile = path.relative(REPO, logFile);

    const {page, close} = await launch(app);
    const frame = new WorkflowPage(page, app.contextPath, {labels});
    const snap = async (name) => {
        const s = await screen(page);
        record(name, s);
        return s;
    };
    try {
        await signIn(page, 'dbarnes');

        // ---- 1-5. "Media" › "Add Media File" › "Upload Files" (main only) ------
        if (line === 'main') {
            const media = new MediaFileManager(page, frame);
            await media.open(submissionId, pubId);
            await idle(page);
            facts.mediaBefore = mediaRows();
            const win = await media.openUpload();
            await win.chooseFiles([fx(WEB)]);
            await win.expectUploaded(WEB);
            await win.chooseMediaType(WEB, 'Image');
            await win.chooseResolution(WEB, MEDIA_TEXT.web);
            await sleep(1000);
            const from = logSize();
            const r = await win.submit();
            await sleep(1500);
            facts.addMedia = {
                request: {method: r.request().method(), url: r.url().replace(app.baseURL, ''), status: r.status(),
                    posted: (r.request().postData() || '').slice(0, 400)},
                serverLog: logSince(from),
            };
            await idle(page);
            const s = await snap('05-media-added');
            facts.addMedia.names = await media.sortedNames();
            facts.addMedia.listText = flat(s.text.dialog || s.text.main).slice(0, 600);
            facts.addMedia.mediaInDb = mediaRows();

            // Neighbour: "Edit Metadata" posts the name as a locale map.
            const meta = await media.openMetadata(WEB);
            await meta.nameBox().fill('u47r34 figure');
            const fromEdit = logSize();
            const answered = page.waitForResponse((x) => /\/mediaFiles\//.test(x.url()) && x.request().method() !== 'GET', {timeout: 30_000});
            await meta.submitButton().click();
            const er = await answered.catch(() => null);
            await idle(page);
            await sleep(1500);
            await media.open(submissionId, pubId);
            await idle(page);
            await snap('08-media-renamed-reloaded');
            facts.neighbourEditMetadata = {
                request: er && {method: er.request().method(), override: er.request().headers()['x-http-method-override'] || null,
                    status: er.status(), posted: (er.request().postData() || '').slice(0, 300)},
                namesAfterReload: await media.sortedNames(),
                mediaInDb: mediaRows(),
                serverLog: logSince(fromEdit),
            };
        }

        // ---- 6-7. "JATS XML" › "Upload" (OJS) -----------------------------------
        if (app.name === 'ojs') {
            const jats = new JatsPage(page, frame);
            if (line === 'main') {
                await jats.open(submissionId, pubId);
            } else {
                // 3.5's side menu has no version level: the page's key is `publication_jats`.
                await frame.gotoEditorial(submissionId, {menuKey: 'publication_jats'});
                await jats.expectLoaded();
            }
            await idle(page);
            const upload = async (key) => {
                const from = logSize();
                const r = await jats.upload(fx('article.xml'));
                await sleep(1500);
                await idle(page);
                const s = await snap(key);
                return {
                    request: {method: r.request().method(), url: r.url().replace(app.baseURL, ''), status: r.status()},
                    notices: s.notices,
                    line: flat(await jats.line().innerText().catch(() => null)),
                    xmlStart: flat(await jats.xmlText().catch(() => '')).slice(0, 120),
                    serverLog: logSince(from),
                };
            };
            facts.jatsUpload = await upload('07-jats-uploaded');
            // Neighbour: a second "Upload" revises the same file (main; 3.5 offers
            // only "Delete" once a file exists).
            if (line === 'main') {
                facts.neighbourJatsRevision = await upload('09-jats-revised');
            }
            facts.jatsInDb = flat(sql(app, `SELECT submission_file_id || ':' || file_stage FROM submission_files WHERE submission_id = ${submissionId} AND file_stage = 21 ORDER BY 1`));
        }
        await signOut(page);
    } catch (e) {
        facts.error = String(e.stack || e).slice(0, 1500);
        await snap('zz-failed').catch(() => {});
    } finally {
        record('facts', facts);
        await close();
    }
});
