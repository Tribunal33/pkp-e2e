// U37 A4 neighbour check (docs/issues/U37-A4-find-template-discussion-task-error.md): run with
// the fix in and out. As rvaca, Settings › Workflow › "Tasks and Discussions" › Production › "Add
// template": a task template "u37r1 task template". Then as dbarnes, the walk's "Add" window
// (OJS 5, OMP 4, OPS 1, Production) and "Find Template": words without "task"/"discussion"
// ("Galleys" or "Assign", "editor", "u37r1"), which the fix must leave as they are, then "task",
// "discussion" and "discussion editor", which with the fix must split the two kinds.
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=u37r1 PROBE_RUN=<fix|nofix> node bin/probe.js all shared/playwright/checks/issues/find-template-discussion-task-error/neighbour.js
const {forEachApp, launch, signIn, signOut, record} = require('../../../probe');
const L = require('./lib.js');

forEachApp(async (app) => {
    const NAME = 'u37r1 task template';
    const facts = {app: app.name, line: app.line || 'main', searches: []};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        facts.settingsProduction = await L.addTaskTemplate(app, page, NAME);
        await signOut(page);
        await signIn(page, 'dbarnes');
        const win = await L.openAddWindow(app, page);
        facts.listBefore = await win.templateNames();
        for (const phrase of [L.WORDS[app.name].control, 'editor', 'u37r1', 'task', 'discussion', 'discussion editor']) {
            const r = await L.search(page, win, phrase);
            delete r.screen;
            facts.searches.push(r);
        }
        await signOut(page);
    } catch (e) {
        facts.failed = String(e.stack || e).split('\n').slice(0, 4).join(' | ');
    } finally {
        record('neighbour', facts);
        console.log(`[${app.name}]`, JSON.stringify(facts));
        await close();
    }
});
