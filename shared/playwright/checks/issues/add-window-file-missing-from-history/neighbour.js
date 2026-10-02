// U37 A29 neighbour check (issue report docs/issues/U37-A29-add-window-file-missing-from-history.md): what the
// fix must leave alone. dbarnes at Production of the submission in lib.js WORDS, on PKP's default test dataset:
//   nofile   "Add" with no file ("u37r14 no file"), "Save"; "History": the created line only, no file line
//   rename   "Add" with figure.png ("u37r14 rename"), "Save"; "History"; then "Edit" changing only the name to
//            "u37r14 renamed", "Save"; "History": no second "figure.png uploaded" line (with the fix: exactly one)
//   PROBE_FEATURE=issues-u37r14 PROBE_AGENT=u37r14 node bin/probe.js all shared/playwright/checks/issues/add-window-file-missing-from-history/neighbour.js
//   (PROBE_RUN=fix in front for the walk with the fix applied.)
const {forEachApp, launch, signIn, record} = require('../../../probe');
const L = require('./lib.js');

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main'};
    const step = async (name, fn) => {
        try {
            facts[name] = await fn();
        } catch (e) {
            facts[name] = {failed: String(e.stack || e).split('\n').slice(0, 4).join(' | ')};
        }
        console.log(`[${app.name}]`, name, JSON.stringify(facts[name]).slice(0, 4000));
    };
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        const panel = await L.openPanel(page, app);
        await step('nofile', async () => {
            const added = await L.addItem(page, app, panel, {name: 'u37r14 no file', message: 'No file here.', label: 'nofile'});
            return {...added, history: await L.readHistory(page, panel, 'u37r14 no file', 'nofile')};
        });
        await step('rename', async () => {
            const added = await L.addItem(page, app, panel, {name: 'u37r14 rename', message: 'A file to keep.', file: L.FIRST_FILE, label: 'rename-add'});
            const before = await L.readHistory(page, panel, 'u37r14 rename', 'rename-before');
            const edited = await L.editItem(page, panel, 'u37r14 rename', {rename: 'u37r14 renamed', label: 'rename-edit'});
            const after = await L.readHistory(page, panel, 'u37r14 renamed', 'rename-after');
            const uploaded = (h) => h.entries.filter((e) => e.startsWith(`${L.FIRST_FILE} uploaded by`)).length;
            return {added, before, edited, after, uploadedLines: {before: uploaded(before), after: uploaded(after)}};
        });
    } finally {
        record('neighbour-facts', facts);
        await close();
    }
});
