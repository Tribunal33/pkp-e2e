// Issue report docs/issues/U69-A16-earlier-url-path-server-error.md (U69 A16):
// a book's address with a URL Path that is not its current version's (an
// earlier version's, or an unpublished newer version's) answers a server
// error instead of forwarding to the current address. Takes the report's
// Steps on PKP's default test dataset. OMP:
//   dbarnes creates a new version of submission 14, saves URL Path
//   "u69r2-first" on its "Catalog Entry" and publishes it; creates another,
//   saves "u69r2-second"; a visitor opens …/catalog/book/u69r2-second;
//   dbarnes publishes; the visitor opens …/catalog/book/u69r2-first.
// Then the controls and the neighbour checks a fix must leave as they are
// (the current URL Path, the number address, an older version under the
// old URL Path, an unknown URL Path, another book's number), and one more
// version with the URL Path cleared, for the forward's other branch (the
// book has no current URL Path: the number address).
// OJS (the same fault's other instance, U50 A14; nothing created): a visitor
// opens …/issue/view/1/999, an issue's address with a galley it lacks.
// Reset the dataset fleet first; the walk changes submission 14.
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/earlier-url-path-server-error/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, idle, sql, note} = require('../../../probe');
const {workflowFrame, createNewVersion, publishShownVersion} = require('../older-version-tab-current-title/lib');
const {saveUrlPath, visit} = require('./lib');

const SID = 14;
const FIRST = 'u69r2-first';
const SECOND = 'u69r2-second';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    if (app.name === 'ops') {
        note('r2 walk: ops skipped, PreprintHandler forwards with a list');
        return;
    }
    if (app.name === 'ojs') {
        // The same fault's other instance (U50 A14): an issue's address with
        // a galley the issue does not have, signed out. Nothing is created.
        const {page, close} = await launch(app);
        const issue = (rest) => `/index.php/${app.contextPath}/issue/view/${rest}`;
        const facts = {app: app.name, line: app.line || 'main'};
        try {
            facts.unknownGalley = await visit(page, app, 'ojs-issue-unknown-galley', issue('1/999'));
            facts.cIssue = await visit(page, app, 'ojs-control-issue', issue(1));
            facts.nUnknownIssue = await visit(page, app, 'ojs-n-unknown-issue', issue(999));
        } finally {
            record('facts', facts);
            await close();
        }
        return;
    }
    const ctx = app.contextPath;
    const book = (rest) => `/index.php/${ctx}/catalog/book/${rest}`;
    const pubs = () => sql(app, `select publication_id, status, coalesce(url_path, '') from publications where submission_id = ${SID} order by publication_id`).split('\n');
    const facts = {app: app.name, line: app.line || 'main', submission: SID, before: pubs()};
    console.log(`[fact] publications before: ${JSON.stringify(facts.before)}`);
    const v1 = Number(facts.before[0].split('|')[0]);

    const editor = await launch(app);
    const reader = await launch(app);
    const e = editor.page;
    const r = reader.page;
    try {
        // 1-2. dbarnes opens submission 14's workflow.
        await signIn(e, 'dbarnes');
        const frame = workflowFrame(e, app);
        await frame.gotoEditorial(SID);
        await idle(e);
        record('step2-workflow', await screen(e));

        // 3-5. A new version with URL Path "u69r2-first", published.
        facts.version2 = await createNewVersion(e, app);
        console.log(`[fact] version 2: ${JSON.stringify(facts.version2)}`);
        facts.path2 = await saveUrlPath(e, app, SID, facts.version2.id, FIRST, 'step4-url-path-first');
        console.log(`[fact] path 2: ${JSON.stringify(facts.path2)}`);
        facts.publish2 = await publishShownVersion(e);
        console.log(`[fact] publish 2: ${JSON.stringify(facts.publish2)}`);
        facts.c0First = await visit(r, app, 'control0-first-while-current', book(FIRST));

        // 6-7. Another version with URL Path "u69r2-second", not yet published.
        if (app.line !== 'stable-3_5_0') await frame.gotoEditorial(SID);
        facts.version3 = await createNewVersion(e, app);
        console.log(`[fact] version 3: ${JSON.stringify(facts.version3)}`);
        facts.path3 = await saveUrlPath(e, app, SID, facts.version3.id, SECOND, 'step7-url-path-second');
        console.log(`[fact] path 3: ${JSON.stringify(facts.path3)}`);

        // 8. A visitor opens the unpublished version's URL Path.
        facts.s8 = await visit(r, app, 'step8-second-unpublished', book(SECOND));
        // the same as the editor who made it
        facts.s8Editor = await visit(e, app, 'step8-second-unpublished-editor', book(SECOND));

        // 9. dbarnes publishes it.
        await frame.gotoEditorial(SID, app.line === 'stable-3_5_0' ? {} : {menuKey: `publication_${facts.version3.id}_catalogEntry`});
        await idle(e);
        facts.publish3 = await publishShownVersion(e);
        console.log(`[fact] publish 3: ${JSON.stringify(facts.publish3)}`);
        facts.afterStep9 = pubs();

        // 10. The visitor opens the earlier URL Path.
        facts.s10 = await visit(r, app, 'step10-first-earlier', book(FIRST));

        // Controls and neighbours.
        facts.cCurrent = await visit(r, app, 'control-current-path', book(SECOND));
        facts.cNumber = await visit(r, app, 'control-number', book(SID));
        facts.nOlderUnderOld = await visit(r, app, 'n1-older-version-under-old-path', book(`${FIRST}/version/${facts.version2.id}`));
        facts.nOlderUnderNumber = await visit(r, app, 'n2-older-version-under-number', book(`${SID}/version/${v1}`));
        facts.nUnknown = await visit(r, app, 'n3-unknown-path', book('u69r2-nosuch'));
        facts.nOtherBook = await visit(r, app, 'n4-other-book-number', book(5));

        // The forward's other branch: the current version has no URL Path.
        await frame.gotoEditorial(SID);
        facts.version4 = await createNewVersion(e, app);
        facts.path4 = await saveUrlPath(e, app, SID, facts.version4.id, '', 'extra-url-path-cleared');
        console.log(`[fact] path 4: ${JSON.stringify(facts.path4)}`);
        facts.publish4 = await publishShownVersion(e);
        facts.afterCleared = pubs();
        facts.xSecond = await visit(r, app, 'extra-second-after-cleared', book(SECOND));
        facts.xNumber = await visit(r, app, 'extra-number-after-cleared', book(SID));
        await signOut(e).catch(() => {});
    } finally {
        record('facts', facts);
        await editor.close();
        await reader.close();
    }
});
