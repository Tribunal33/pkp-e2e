// U35 A4, what a refused "OK" does to a message (issue report
// docs/issues/U35-A4-assign-participant-ok-assigns-nobody-no-reason.md). As dbarnes on the walk's
// submission: "Assign", choose the first predefined message, type a text into "Message", choose
// nobody and press "OK"; then read the predefined-message list and the "Message" box.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/assign-participant-ok-assigns-nobody-no-reason/message.js
const {forEachApp, launch, signIn, signOut, record, idle} = require('../../../probe');
const H = require('./lib.js');

const TYPED = 'u35r10 a message typed before OK';

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', submissionId: c.id, typed: TYPED};
    const {page, close} = await launch(app);
    const chosenTemplate = (win) => win.templateSelect().evaluate((s) => s.options[s.selectedIndex].text.trim());
    try {
        await signIn(page, 'dbarnes');
        const panel = await H.openWorkflow(page, app, c.id);
        const win = await panel.openAssign();
        await idle(page);
        facts.templates = await win.templateOptions();
        const label = facts.templates.find((t) => t);
        await win.chooseTemplate(label);
        facts.templateText = H.flat(await win.messageText(), 200);
        await win.typeMessage(TYPED);
        facts.before = {template: await chosenTemplate(win), message: await win.messageText()};
        facts.ok = await H.pressOk(page, win, 'm1-nobody');
        delete facts.ok.window.text;
        facts.after = {template: await chosenTemplate(win), message: H.flat(await win.messageText(), 200)};
        facts.stored = H.stored(app, c.id);
        await signOut(page);
    } finally {
        record('message', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
