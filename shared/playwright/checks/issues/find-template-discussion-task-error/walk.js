// U37 A4 walk (docs/issues/U37-A4-find-template-discussion-task-error.md): as dbarnes on the
// default dataset, the submission's Production stage (OJS 5, OMP 4, OPS 1) › "Production Tasks &
// Discussions" › "Add" › "Find Template": "discussion", the full name "Discussion (Production)",
// "task", then a control word ("Galleys"; OPS "Assign"). Each search's requests, list and any
// "Error" window are recorded.
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=u37r1 node bin/probe.js all shared/playwright/checks/issues/find-template-discussion-task-error/walk.js
const {forEachApp, launch, signIn, signOut, screen, record} = require('../../../probe');
const L = require('./lib.js');

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', searches: []};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        const win = await L.openAddWindow(app, page);
        const before = await win.templateNames();
        facts.listBefore = before;
        record('add-window', await screen(page));
        for (const phrase of ['discussion', 'Discussion (Production)', 'task', L.WORDS[app.name].control]) {
            const r = await L.search(page, win, phrase);
            record(`search-${phrase.replace(/\W+/g, '-').toLowerCase()}`, r.screen);
            delete r.screen;
            facts.searches.push(r);
        }
        await signOut(page);
    } catch (e) {
        facts.failed = String(e.stack || e).split('\n').slice(0, 4).join(' | ');
    } finally {
        record('walk', facts);
        console.log(`[${app.name}]`, JSON.stringify(facts));
        await close();
    }
});
