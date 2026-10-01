// U35 A1 neighbour check (issue report docs/issues/U35-A1-section-editor-edit-assignment-saves-nothing.md):
// what the fix must leave refused. As dbuskins, the row menus of his own row and of a manager-level
// row (OJS: Daniel Barnes, Journal editor) offer no "Edit"; and the server's own per-row answer,
// read at the legacy participants grid's address (it draws an "Edit" link only on a row the server
// would let this user save), names no "Edit" on those two rows with the fix in or out. Then rvaca
// (a manager) ticks "Assignment privileges" on dbuskins's row, and the same two reads are taken
// again: a recommending editor is offered no "Edit" on another section editor's row either.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/section-editor-edit-assignment-saves-nothing/neighbour.js
const {forEachApp, launch, signIn, signOut, record} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', submissionId: c.submissionId, menus: {}};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbuskins');
        await H.openWorkflow(page, app, c.submissionId);
        for (const name of [c.own, c.manager, c.author, c.editor].filter(Boolean)) {
            facts.menus[name] = await H.menuLabels(page, name);
        }
        facts.sectionEditorGrid = await H.legacyGridEditLinks(page, app, c);
        await signOut(page);
        await signIn(page, 'rvaca');
        facts.managerGrid = await H.legacyGridEditLinks(page, app, c);
        // A manager limits dbuskins to recommending ("Assignment privileges" on his row) ...
        facts.limit = await H.editBox(page, app, {submissionId: c.submissionId, name: c.own, box: 'recommendOnly', label: 'n-limit'});
        await signOut(page);
        // ... after which the panel offers him no "Edit" on another section editor's row, and
        // neither may the server.
        await signIn(page, 'dbuskins');
        await H.openWorkflow(page, app, c.submissionId);
        facts.recommendingMenus = {};
        for (const name of [c.own, c.manager, c.author, c.editor].filter(Boolean)) {
            facts.recommendingMenus[name] = await H.menuLabels(page, name);
        }
        facts.recommendingGrid = await H.legacyGridEditLinks(page, app, c);
        await signOut(page);
    } finally {
        record('neighbour', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
