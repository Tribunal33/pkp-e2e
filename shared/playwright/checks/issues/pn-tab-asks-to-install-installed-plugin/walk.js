// Walk of U67 A3 (issue report docs/issues/U67-A3-pn-tab-asks-to-install-installed-plugin.md): with
// the PKP|PN plugin (release 4.0.1.0) installed, rvaca opens Settings › Distribution › "Archiving" ›
// "PKP Preservation Network (PN)" while the plugin is disabled in the journal, then again once it is
// enabled. OJS only (a press and a preprint server have no "Archiving" tab). On PKP's default test
// dataset, fleet reset first; lib.js says how the plugin is put in place without adding files to the app.
//   PROBE_FEATURE=issues-u67b PROBE_AGENT=u67b node bin/probe.js ojs shared/playwright/checks/issues/pn-tab-asks-to-install-installed-plugin/walk.js
// Neighbour (WALK_MODE=nb, alone): no plugin installed, plain server; the same tab as rvaca, to compare
// with the fix in and out (the tab must keep asking for the plugin to be installed, with no box).
const {forEachApp, launch, signIn, signOut, screen, record, note} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.env.WALK_MODE || 'steps';

forEachApp(async (app) => {
    if (app.name !== 'ojs') {
        record('surface', {app: app.name, note: 'no Archiving tab in this app'});
        return;
    }
    const facts = {app: app.name, line: app.line ? app.line.name || app.line : 'main', mode: MODE};
    try {
        if (MODE === 'nb') {
            facts.server = H.serveWithPln(app, false);
            facts.state = H.plnState(app, 'inspect');
        } else {
            // Precondition: the site administrator has installed the plugin (left disabled).
            facts.server = H.serveWithPln(app, true);
            facts.install = H.installPln(app);
            facts.afterInstall = H.plnState(app, 'inspect');
        }
        const {page, close} = await launch(app);
        try {
            // 1
            await signIn(page, 'rvaca');
            // (2: the Plugins tab cannot list a plugin kept outside plugins/generic; see lib.js)
            // 3
            facts.s3 = await H.step(() => H.readPnTab(page, app));
            record(MODE === 'nb' ? 'nb-pn-tab' : 's3-pn-tab-disabled', facts.s3.ok ? facts.s3.value.screen : facts.s3);

            if (MODE !== 'nb') {
                // 4 (the journal's "Enable" for the plugin, as LazyLoadPlugin::setEnabled writes it)
                facts.afterEnable = H.plnState(app, 'enable');
                // 5
                facts.s5 = await H.step(() => H.readPnTab(page, app));
                record('s5-pn-tab-enabled', facts.s5.ok ? facts.s5.value.screen : facts.s5);
            }
            await signOut(page);
        } finally {
            await close();
        }
    } finally {
        if (MODE !== 'nb') {
            facts.serverAfter = H.serveWithPln(app, false);
        }
    }
    const view = (s) => (s && s.ok ? {askToInstall: s.value.askToInstall, box: s.value.box, buttons: s.value.buttons} : s);
    facts.summary = {s3: view(facts.s3), s5: view(facts.s5)};
    for (const k of ['s3', 's5']) if (facts[k] && facts[k].ok) delete facts[k].value.screen;
    note(`u67b ${facts.line} ${MODE}: ${JSON.stringify(facts.summary)}`);
    record('facts', facts);
});
