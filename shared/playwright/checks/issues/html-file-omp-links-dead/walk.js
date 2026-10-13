// Issue report docs/issues/U69-A16-earlier-url-path-server-error.md, which U69 A25 joined:
// a book's HTML file holding a link written "omp://monograph/{id}" is served as stored: none
// of its "omp://" links is rewritten to an address (pressing one does nothing), its embedded
// figure does not load and its "{$pressTitle}" placeholder stays raw; the server logs the
// plugin's TypeError. Takes the report's "An HTML book file's links" steps on PKP's
// default test dataset (a dataset fleet, harness.md "Dataset fleets"), on its press
// `publicknowledge` and its published books 5 and 14. The dataset has no HTML book file, so
// the walk adds one on screen (u69h13n-links.html beside this file). The kit builds nothing.
//
//   1. dbarnes: book 5's workflow by its address, "Publication Formats"
//   2. "Add publication format", the name "HTML u69h13n", "OK"
//   3. the format's "Change File": the first component ("Appendix"), u69h13n-links.html,
//      "Continue"; under "Dependent Files" its upload link, "Image", u69h13n-figure.png,
//      "Continue", "Continue", "Complete"; then "Continue", "Complete"
//   4. the file's "Set Terms": "Open Access", "Save"
//   5. the format's "Awaiting Approval": "OK"
//   6. the format's "Not Available": "OK"; sign out
//   7. Catalog, "Bomb Canada and Other Unkind Remarks in the American Media"
//   8. press "HTML u69h13n"
//   9. read each link's address in the file, the figure (loaded or not) and the
//      "{$pressTitle}" placeholder line
//  10. press "the other book"
//
// MODE=steps takes steps 1-10 alone; MODE=nb the control and neighbour check alone (the
// same steps with a second format, "HTML u69h13n press", holding u69h13n-press.html, whose
// only link is "omp://press", then its link pressed); MODE=all (the default) both.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js omp shared/playwright/checks/issues/html-file-omp-links-dead/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<feature>-3_5 PROBE_AGENT=<agent> node bin/probe.js omp shared/playwright/checks/issues/html-file-omp-links-dead/walk.js
const path = require('path');
const {forEachApp, launch, signIn, signOut, record, serverLog} = require('../../../probe');
const {addFreeFormatFile, followFileLink} = require('./lib');

const BOOK = 5;
const TITLE = 'Bomb Canada and Other Unkind Remarks in the American Media';
const MODE = process.env.MODE || 'all';

forEachApp(async (app) => {
    if (app.name !== 'omp') return; // book files exist only on a press
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${JSON.stringify(v).slice(0, 2000)}`);
    };
    const log = serverLog(app);
    const {page, close} = await launch(app);
    /** Steps 1-10 for one file: add it as dbarnes, then read and press as a visitor. */
    const walkFile = async (key, formatName, fileName, pressId, dependentFile = null) => {
        let from = log.mark();
        await signIn(page, 'dbarnes');
        fact(
            `${key} 1-6 adding`,
            await addFreeFormatFile(page, app, {
                submissionId: BOOK,
                formatName,
                file: path.join(__dirname, fileName),
                fileName,
                dependent: dependentFile ? {file: path.join(__dirname, dependentFile)} : null,
            }),
        );
        fact(`${key} 1-6 server log`, log.since(from));
        await signOut(page);
        from = log.mark();
        fact(
            `${key} 7-10`,
            await followFileLink(page, app, {
                bookTitle: TITLE,
                formatName,
                pressId,
                label: key,
            }),
        );
        fact(`${key} 7-10 server log`, log.since(from));
    };
    try {
        if (MODE === 'all' || MODE === 'steps') await walkFile('steps', 'HTML u69h13n', 'u69h13n-links.html', 'book', 'u69h13n-figure.png');
        if (MODE === 'all' || MODE === 'nb') await walkFile('nb', 'HTML u69h13n press', 'u69h13n-press.html', 'press');
    } finally {
        record('facts', facts);
        await close();
    }
});
