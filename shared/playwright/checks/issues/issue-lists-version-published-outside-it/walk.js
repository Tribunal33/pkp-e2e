// Issue report docs/issues/U50-A17-A18-issue-lists-version-published-outside-it.md
// (U50 A17, A18): an issue keeps listing an article whose newer version was
// published outside it, under the newer title, and "Remove" on it unpublishes
// the version the issue holds. Takes the report's Steps on PKP's default test
// dataset (OJS alone has issues), journal `publicknowledge`, as its own users:
//   1-5   dbarnes publishes submission 1's version 1.1 with "Don't Assign To
//         An Issue" (3.5: the version moved to "Vol. 2 No. 1 (2015)",
//         scheduled, and that issue published)
//   6-7   signed out: "Current" (Vol. 1 No. 2 (2014); 3.5: that issue by
//         its address, since step 5 made Vol. 2 No. 1 current) and the listed link
//   8-10  dbarnes: "Back Issues" › "Items", "Edit" › "Table of Contents",
//         "Remove" › "OK"; then the issue's page, version 1's page, the
//         article's "Versions" and the workflow's status
// Neighbour (`neighbour` as the argument; fix in and out): the dataset's
// other article in the issue, submission 17, is untouched by the steps and
// must stay listed; submission 1's version 1.1 published INTO the issue
// ("Assign To Current/Back Issue") must stay listed under its title, and
// "Remove" on it must take the article out of the issue.
// Reset first: npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/issue-lists-version-published-outside-it/walk.js [neighbour]
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const L = require('./lib');

const NEIGHBOUR = process.argv.includes('neighbour');
const NEW_TITLE = 'The Signalling Theory Dividends Version 2';
const OLD_TITLE = 'Signalling Theory Dividends';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return; // issues are a journal's
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet');
    const line = app.line || 'main';
    const facts = {line, neighbour: NEIGHBOUR};
    // 3.5 publishes another issue in steps 3-5, so Vol. 1 No. 2 is read from "Archives" by its address.
    const ISSUE_TAIL = line === 'stable-3_5_0' ? 'issue/view/1' : 'issue/current';
    const log = (k, v) => console.log(`[fact] ${k}: ${JSON.stringify(v)}`);
    try {
        // Steps 1-5.
        {
            const {page, close} = await launch(app);
            try {
                await signIn(page, 'dbarnes');
                facts.before = await L.backIssueItems(page, app).then((x) => x.items);
                facts.versionNodes = (await L.openNewestVersion(page, app, 1)).versionNodes;
                if (line === 'stable-3_5_0') {
                    const S35 = require('./lib35');
                    facts.publish = await S35.publishInOtherIssue(page, app, 1);
                } else {
                    facts.publish = await L.publishShown(page, app, NEIGHBOUR ? 'Assign To Current/Back Issue' : "Don't Assign To An Issue", 'step4');
                }
                log('publish', facts.publish);
            } finally {
                await close();
            }
        }
        // Steps 6-7, signed out.
        {
            const {page, close} = await launch(app);
            try {
                facts.current = await L.readIssuePage(page, app, ISSUE_TAIL);
                record('step6-current', await screen(page));
                await shot(page, 'step6-current').catch(() => {});
                log('current', facts.current);
                const link = facts.current.links.find((l) => l.text.includes('Signalling'));
                if (link) {
                    facts.listedPage = await L.readArticlePage(page, app, link.href);
                    record('step7-listed-page', await screen(page));
                    await shot(page, 'step7-listed-page').catch(() => {});
                    log('listedPage', facts.listedPage);
                }
                facts.v1Before = await L.readArticlePage(page, app, `/index.php/${app.contextPath}/article/view/1/version/1`);
                log('v1Before', {status: facts.v1Before.status, heading: facts.v1Before.heading, issuePart: facts.v1Before.issuePart});
            } finally {
                await close();
            }
        }
        // Steps 8-10.
        {
            const {page, close} = await launch(app);
            try {
                await signIn(page, 'dbarnes');
                const toc = await L.openToc(page, app);
                facts.items = toc.items;
                facts.tocBefore = toc.outline;
                record('step9-toc', await screen(page));
                await shot(page, 'step9-toc').catch(() => {});
                log('toc', {items: facts.items, outline: facts.tocBefore});
                const title = facts.tocBefore.find((t) => /Signalling/.test(t));
                if (title) {
                    facts.remove = await L.removeFromToc(page, toc.win, title);
                    record('step10-after-remove', await screen(page));
                    await shot(page, 'step10-after-remove').catch(() => {});
                    log('remove', facts.remove);
                }
                const again = await L.openToc(page, app);
                facts.itemsAfter = again.items;
                facts.tocReopened = again.outline;
                log('reopened', {items: facts.itemsAfter, outline: facts.tocReopened});
                facts.workflowAfter = await L.workflowStatus(page, app, 1);
                record('step10-workflow', await screen(page));
                log('workflowAfter', facts.workflowAfter);
            } finally {
                await close();
            }
        }
        // After "Remove", signed out.
        {
            const {page, close} = await launch(app);
            try {
                facts.currentAfter = await L.readIssuePage(page, app, ISSUE_TAIL);
                record('after-current', await screen(page));
                log('currentAfter', facts.currentAfter.outline);
                facts.v1After = await L.readArticlePage(page, app, `/index.php/${app.contextPath}/article/view/1/version/1`);
                log('v1After', {status: facts.v1After.status, tab: facts.v1After.tab});
                facts.articleAfter = await L.readArticlePage(page, app, `/index.php/${app.contextPath}/article/view/1`);
                record('after-article', await screen(page));
                log('articleAfter', facts.articleAfter);
            } finally {
                await close();
            }
        }
    } finally {
        record(NEIGHBOUR ? 'neighbour' : 'facts', facts);
    }
});
