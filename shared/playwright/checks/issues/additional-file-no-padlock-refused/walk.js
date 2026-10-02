// Issue report docs/issues/U51-A18-additional-file-no-padlock-refused.md (U51 A18) {OJS}: the
// report's Steps to reproduce, walked through the screens on PKP's default test dataset (a dataset
// fleet, harness.md "Dataset fleets"). The kit builds nothing. Helpers:
// ../issue-contents-lock-galleys-reader-can-open/lib.js.
//
// Preconditions, as dbarnes:
//   C1 Settings › Distribution › "Access": "The journal will require subscriptions…", "Save"
//   C2 Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Edit" › "Access": "Subscription", "Save"
//   P1 submission 5 "Genetic transformation of forest trees": Publication › "Galleys" › "Add
//      galley" "PDF" ("Article Text", u51sb5-article.pdf) and "Data" ("Data Set", u51sb5-data.csv)
//   P2 "Schedule For Publication" into the issue, "Publish" [3.5: Publication › "Issue" first]
// Steps:
//   1-2 signed out, "Archives" › the issue › the article: the "PDF" and "Data" links
//   3 press "Data" (then "PDF", control)   4 as ccorino (no subscription): press "Data"
// Neighbour (the fix must leave it): dbarnes reads the article: "Data" with its file icon, opens.
//
// Reset first:  npm run fleet-prep -- --feature issues-sb5 --dataset 6 --reset
// Run (main):   PROBE_FEATURE=issues-sb5 PROBE_AGENT=sb5 node bin/probe.js ojs shared/playwright/checks/issues/additional-file-no-padlock-refused/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-sb5-3_5 --dataset 6 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-sb5-3_5 PROBE_AGENT=sb5 node bin/probe.js ojs shared/playwright/checks/issues/additional-file-no-padlock-refused/walk.js
// Facts: .reports/<feature>/sb5/a18-facts[-<run>]-ojs.json (PROBE_NAME=<name> renames it)
const {forEachApp, launch, signIn, signOut, record, screen} = require('../../../probe');
const L = require('../issue-contents-lock-galleys-reader-can-open/lib');

const ARTICLE = 'Genetic transformation';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return console.log(`[walk] ${app.name}: no subscriptions; not walked`);
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const f = {app: app.name, line: app.line || 'main'};
    const fact = (k, v) => {
        f[k] = v;
        console.log(`[fact] ojs ${k}: ${L.flat(JSON.stringify(v), 1600)}`);
    };
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    const brief = (links) => L.named(links).map((l) => `${l.where} | ${l.text} | class restricted: ${l.padlockClass} | ${l.iconName}${l.screenReader ? ` | sr "${l.screenReader}"` : ''}`);
    const landing = (r) => ({url: r.url, title: r.title, heading: r.heading, notice: r.notice, message: r.message, viewer: r.viewer, download: r.download || null, navigations: r.navigations});
    try {
        await signIn(page, 'dbarnes');
        fact('C1 access', await L.requireSubscriptions(page));
        fact('C2 issue access', await L.restrictIssue(page));
        fact('P1 PDF galley', await L.addGalley(page, app, 5, {label: 'PDF', component: 'Article Text', file: L.PDF('u51sb5-article.pdf')}));
        fact('P1 Data galley', await L.addGalley(page, app, 5, {label: 'Data', component: 'Data Set', file: L.CSV('u51sb5-data.csv')}));
        fact('P2 publish 5', await L.publishIntoIssue(page, app, 5));
        await signOut(page);

        await L.openArticle(page, app, ARTICLE);
        fact('visitor 2 links', brief(await L.readLinks(page)));
        record('a18-article-visitor', await screen(page));
        await L.snap(page, 'a18-article-visitor');
        fact('visitor 3 Data', landing(await L.press(page, 'Additional Files', 'Data')));
        await L.snap(page, 'a18-visitor-data');
        await L.openArticle(page, app, ARTICLE);
        fact('visitor 3 PDF (control)', landing(await L.press(page, 'article page', 'PDF')));

        await signIn(page, 'ccorino');
        await L.openArticle(page, app, ARTICLE);
        fact('ccorino 4 links', brief(await L.readLinks(page)));
        fact('ccorino 4 Data', landing(await L.press(page, 'Additional Files', 'Data')));
        await L.snap(page, 'a18-ccorino-data');

        // Neighbour: dbarnes may open the file: it keeps its file icon and opens.
        await signIn(page, 'dbarnes');
        await L.openArticle(page, app, ARTICLE);
        fact('neighbour dbarnes links', brief(await L.readLinks(page)));
        await L.snap(page, 'a18-article-dbarnes');
        fact('neighbour dbarnes Data', landing(await L.press(page, 'Additional Files', 'Data')));
    } catch (e) {
        f.error = String(e.stack || e.message).slice(0, 900);
        console.log(`[fact] ojs FAILED: ${f.error}`);
        await L.snap(page, 'a18-failed');
    } finally {
        record(process.env.PROBE_NAME || 'a18-facts', f);
        await close();
    }
});
