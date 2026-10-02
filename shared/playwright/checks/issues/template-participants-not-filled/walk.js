// U37 A5 walk (docs/issues/U37-A5-template-says-it-fills-participants.md): as dbarnes on the
// default dataset, the submission's stage (OJS 3 and OMP 7 at Copyediting, OPS 1 at Production) ›
// "Tasks & Discussions" › "Add": "Participants" before, the line under the installed discussion
// template, and the form after pressing it; then Settings › Workflow › "Tasks and Discussions"
// (its line), a template limited to the Copyeditor (OPS: Moderator) added there, and the form
// after pressing that one. Each press records the screen's own fromTemplate answer.
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=u37r10 node bin/probe.js all shared/playwright/checks/issues/template-participants-not-filled/walk.js
const {forEachApp, launch, signIn, signOut, screen, record} = require('../../../probe');
const L = require('./lib.js');

const LIMITED = 'Copyedit check u37r10';

forEachApp(async (app) => {
    const c = L.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', submission: c.id};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');

        // Part 1: the installed template
        let {win} = await L.openAddWindow(app, page);
        facts.before = await L.formState(win);
        facts.installedButton = await L.templateButtonText(win, c.installed);
        record('add-window', await screen(page));
        facts.installed = await L.pressTemplate(page, win, c.installed);
        record('after-installed', await screen(page));

        // Part 2: a template limited to a role
        const {tab, line} = await L.settingsLine(app, page);
        facts.settingsLine = line;
        facts.stageTemplates = await L.addLimitedTemplate(page, tab, c.stage, LIMITED, c.role, 'Please check the copyedit.');
        record('settings-after-add', await screen(page));
        ({win} = await L.openAddWindow(app, page));
        facts.before2 = await L.formState(win);
        facts.limitedButton = await L.templateButtonText(win, LIMITED);
        facts.limited = await L.pressTemplate(page, win, LIMITED);
        record('after-limited', await screen(page));
        await signOut(page);
    } catch (e) {
        facts.failed = String(e.stack || e).split('\n').slice(0, 4).join(' | ');
    } finally {
        record('walk', facts);
        console.log(`[${app.name}]`, JSON.stringify(facts));
        await close();
    }
});
