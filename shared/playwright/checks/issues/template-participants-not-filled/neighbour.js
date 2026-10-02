// U37 A5 neighbour check (docs/issues/U37-A5-template-says-it-fills-participants.md): the fix
// changes three English texts in lib/pkp's submission.po and nothing else. As dbarnes on the
// default dataset, with the fix in and out: the "Add" window and Settings › Workflow › "Tasks and
// Discussions" show no raw locale key; the other texts read from the same file (the panel's line,
// the window's "Details" hint, the "Participants" hint) are unchanged; and the installed template
// still fills "Name" and the message and leaves "Participants" as it was.
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=u37r10 PROBE_RUN=<fix|nofix> node bin/probe.js all shared/playwright/checks/issues/template-participants-not-filled/neighbour.js
const {forEachApp, launch, signIn, signOut, rawKeys, record} = require('../../../probe');
const L = require('./lib.js');

forEachApp(async (app) => {
    const c = L.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'dbarnes');
        const {panel, win} = await L.openAddWindow(app, page);
        facts.panelLine = L.flat(await panel.root().innerText()).match(/Use this space to start[^.]*\./)?.[0] || null;
        const dialogText = L.flat(await win.root.innerText());
        facts.detailsHint = (dialogText.match(/Details (.*?) Templates to get you started!/) || [])[1] || null;
        facts.participantsHint = (dialogText.match(/Participants (.*?) Daniel Barnes/) || [])[1] || null;
        facts.templateLine = (await L.templateButtonText(win, c.installed)).replace(/^DISCUSSION - [^)]*\)\s*/i, '');
        facts.rawKeysAddWindow = await rawKeys(page);
        facts.installed = await L.pressTemplate(page, win, c.installed);
        const {line} = await L.settingsLine(app, page);
        facts.settingsLine = line;
        facts.rawKeysSettings = await rawKeys(page);
        await signOut(page);
    } catch (e) {
        facts.failed = String(e.stack || e).split('\n').slice(0, 4).join(' | ');
    } finally {
        record('neighbour', facts);
        console.log(`[${app.name}]`, JSON.stringify(facts));
        await close();
    }
});
