// Neighbour check of fix.diff (issue report docs/issues/U63-OJS6-doaj-search-matches-letter-case.md,
// U63 OJS6), walked with the fix in and out on a dataset fleet freshly reset to PKP's default test
// dataset. What the fix must leave alone, and the twin list it must also reach:
//   A. Articles list (as dbarnes): "Article Title" "mwandenga" (an author's name in the title
//      field) and "zzz" find nothing; "Article Title" "ANTIMICROBIAL" finds article 17 only;
//      "Authors" "SIGNALLING" (a title word in the authors field) finds nothing.
//   B. Settings › Distribution › DOIs › Setup: "DOI Versioning" "Yes", Save; the DOAJ tool's
//      "Publications" list: "Article Title" "signalling" and "Signalling", "Authors" "karbasizaed".
// OMP and OPS have no DOAJ tool: skipped.
//   npm run fleet-prep -- --feature issues-ir20 --dataset 2 --reset
//   PROBE_FEATURE=issues-ir20 PROBE_AGENT=ir20 PROBE_RUN=n-out node bin/probe.js ojs shared/playwright/checks/issues/doaj-search-matches-letter-case/neighbour.js
const {forEachApp, launch, signIn, screen, record} = require('../../../probe');
const doajLib = require('../doaj-deposit-takes-other-journals-articles/lib.js');
const {flat, searchList} = require('./lib.js');

forEachApp(async (app) => {
    if (app.name !== 'ojs') {
        console.log(`[doaj] ${app.name}: no DOAJ tool, no surface; skipped`);
        return;
    }
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet (fleet-prep --dataset)');
    const ctx = app.contextPath;
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 1500)}`);
    };
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        // A
        await doajLib.openDoaj(page, app, ctx, 'Articles');
        for (const [field, text] of [['Article Title', 'mwandenga'], ['Article Title', 'zzz'], ['Article Title', 'ANTIMICROBIAL'], ['Authors', 'SIGNALLING']]) {
            fact(`A ${field} "${text}"`, await searchList(page, field, text));
        }
        record('neighbour-A', await screen(page));
        // B
        fact('B versioning Yes', await doajLib.versioningYes(page, app, ctx));
        await doajLib.openDoaj(page, app, ctx, 'Publications');
        fact('B list', await doajLib.readList(page));
        for (const [field, text] of [['Article Title', 'signalling'], ['Article Title', 'Signalling'], ['Authors', 'karbasizaed']]) {
            fact(`B ${field} "${text}"`, await searchList(page, field, text));
        }
        record('neighbour-B', await screen(page));
    } finally {
        record('neighbour-facts', facts);
        await close();
    }
});
