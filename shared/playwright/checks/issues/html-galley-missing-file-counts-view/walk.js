// Issue report docs/issues/U64-OJS2-html-galley-missing-file-counts-view.md (U64 OJS2): one view
// of an HTML galley whose file names a style sheet and a picture that were never uploaded counts
// three times on Statistics › "Articles", because each missing file's address answers the
// galley's own file and records another view of it. Takes the report's Steps on PKP's default
// test dataset (OJS only: a press answers those addresses 404, a preprint server's HTML galley
// downloads instead of showing):
//   dbarnes adds an "HTML" galley (article.html, beside this script) to submission 1's
//   unpublished version 1.1 and publishes that version; signed out, the article's page › "HTML";
//   the next day's "Usage statistics file loader task"; dbarnes's Statistics › "Articles" and
//   its "Download Files".
// The night between the visit and the Statistics page is the one step a walk cannot take: it
// moves today's usage log one day back into the loader's stage folder and runs the app's own
// task and job queue (nextDay() in lib.js, as the Steps say).
// MODE=nb (run alone, after its own reset) is the neighbour check a fix must leave as it is:
// the same galley with figure.png uploaded as a dependent file; the picture answers 200
// image/png and draws, the galley's own file answers 200, and the "PDF" galley still opens.
// Reset the dataset fleet first; the walk changes the dataset.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/html-galley-missing-file-counts-view/walk.js
//      (MODE=nb for the neighbour check; PROBE_RUN=<r> keeps a run's records apart)
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, shot, record, usageLog, serverLog, sql, outFile} = require('../../../probe');
const {sleep, flat, READER_UA, addHtmlGalleyWithDependent, watchFiles, openGalley, slimLines, readArticlesStats,
    addGalleyToLatestVersion, publishLatestVersion, nextDay} = require('./lib');

const MODE = process.env.MODE || 'walk';
const SUBMISSION = 1;
const URL_PATH = 'mwandenga';
const TITLE = 'Signalling Theory Dividends';
const FILE = path.join(__dirname, 'article.html');
const FIGURE = path.join(__dirname, 'figure.png');
const fact = (k, v) => console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 2500)}`);

async function step(facts, name, fn) {
    try {
        return await fn();
    } catch (e) {
        facts[`ERR ${name}`] = flat(e && e.message, 500);
        fact(`ERR ${name}`, facts[`ERR ${name}`]);
        return null;
    }
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name !== 'ojs') {
        fact(app.name, 'no HTML galley shown in a frame here (see the report); skipped');
        return;
    }
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, submission: SUBMISSION};
    const contextId = Number(sql(app, "select journal_id from journals where path = 'publicknowledge'"));
    try {
        // Steps 1-4: dbarnes adds the "HTML" galley to version 1.1 and publishes it.
        {
            const {page, close} = await launch(app);
            try {
                await signIn(page, 'dbarnes');
                facts.galleys = await step(facts, 'add galley', () => (MODE === 'nb'
                    ? addHtmlGalleyWithDependent(page, app, SUBMISSION, {file: FILE, name: 'article.html', dependent: FIGURE})
                    : addGalleyToLatestVersion(page, app, SUBMISSION, {label: 'HTML', component: 'Article Text', file: FILE, name: 'article.html'})));
                fact('galleys', facts.galleys);
                const pub = await step(facts, 'publish', () => publishLatestVersion(page, app, SUBMISSION));
                facts.publish = pub && {button: pub.button, publish: pub.publish};
                fact('publish', facts.publish);
                await signOut(page);
            } finally {
                await close();
            }
        }
        facts.htmlGalley = sql(app, `select g.galley_id, g.submission_file_id, sf.file_id from publication_galleys g join publications p on p.publication_id = g.publication_id
            join submission_files sf on sf.submission_file_id = g.submission_file_id where p.submission_id = ${SUBMISSION} and g.label = 'HTML'`);
        fact('html galley (galley | submission file | file)', facts.htmlGalley);

        // Step 5, signed out, in an ordinary browser: the article's page, "HTML".
        const ulog = usageLog(app, {contextId});
        const slog = serverLog(app);
        const uFrom = ulog.mark();
        const sFrom = slog.mark();
        {
            const {page, close} = await launch(app);
            try {
                await page.context().setExtraHTTPHeaders({'User-Agent': READER_UA});
                const files = watchFiles(page);
                facts.html = await step(facts, 'open HTML', () => openGalley(page, app, URL_PATH, 'HTML'));
                facts.htmlRequests = files.clear();
                fact('html galley page', facts.html);
                fact('html requests', facts.htmlRequests);
                record('step5-html-galley', await screen(page));
                await shot(page, 'step5-html-galley').catch(() => {});
                if (MODE === 'nb') {
                    // The neighbour: the "PDF" galley ("PDF Version 2" in the dataset) still opens its viewer and its file.
                    facts.pdf = await step(facts, 'open PDF', () => openGalley(page, app, URL_PATH, /^\s*PDF\b/));
                    await sleep(3000);
                    facts.pdfRequests = files.clear();
                    fact('pdf requests', facts.pdfRequests);
                    record('nb-pdf-galley', await screen(page).catch(() => null));
                }
            } finally {
                await close();
            }
        }
        await sleep(1000);
        facts.usageLines = slimLines(ulog.since(uFrom)).filter((e) => Number(e.submissionId) === SUBMISSION);
        facts.fileLines = facts.usageLines.filter((e) => e.submissionFileId);
        fact('usage lines (files)', facts.fileLines);
        facts.serverErrors = slog.since(sFrom).slice(0, 20);
        fact('server errors', facts.serverErrors);
        if (MODE === 'nb') return;

        // Step 6: the next day's "Usage statistics file loader task" (see the header).
        facts.nextDay = await step(facts, 'next day', () => nextDay(app));
        fact('next day', facts.nextDay && {files: facts.nextDay.files, lines: facts.nextDay.lines, loader: facts.nextDay.loader, loaderError: facts.nextDay.loaderError, jobs: facts.nextDay.jobs});
        facts.metrics = sql(app, `select assoc_type, file_type, representation_id, submission_file_id, to_char(date, 'YYYY-MM-DD'), metric from metrics_submission
            where submission_id = ${SUBMISSION} and submission_file_id is not null order by representation_id`);
        fact('metrics_submission (file rows of submission 1)', facts.metrics);
        facts.counter = sql(app, `select to_char(date, 'YYYY-MM-DD'), metric_investigations, metric_investigations_unique, metric_requests, metric_requests_unique
            from metrics_counter_submission_daily where submission_id = ${SUBMISSION} order by date`);
        fact('metrics_counter_submission_daily (submission 1: investigations, unique, requests, unique)', facts.counter);

        // Steps 7-8: dbarnes, Statistics › "Articles", then "Download Files".
        {
            const {page, close} = await launch(app);
            try {
                await signIn(page, 'dbarnes');
                facts.stats = await step(facts, 'stats', () => readArticlesStats(page, app, TITLE, outFile('download-files.csv')));
                fact('stats', facts.stats);
            } finally {
                await close();
            }
        }
    } finally {
        record(MODE === 'nb' ? 'nb' : 'walk', facts);
    }
});
