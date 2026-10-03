// U39 A11 (joined to U08 A18's report, item-window-refused-save-closes-unasked): after "OK" in a
// library's "Add a file" window with no file uploaded, the refused window closes on its close button
// without asking, and the page is left without the leave question. Each "OK" also records the
// refusal's page notice and how long it stays on screen (U39 A2's "no message" premise; the notice
// shows at the top right for about four and a half seconds). The report's library Steps 9–13, on
// PKP's default test dataset:
//   9      `dbarnes`, Settings › Workflow › "Publisher Library" ("Press Library", "Preprint Server Library")
//   10-11  "Add a file", "u39b guide", "Other", no file chosen, "OK"
//   12     the window's close button; the list under "Other"
//          then submission 1's workflow, "Library", and 10-12 there
//   13     the library tab again, 10-11, then the dashboard's address typed
//   controls: "OK" with every box empty (the boxes' own refusals); before any "OK" the close button
//   asks; after the refused "OK", "Name" changed and the close button asks again.
// `nb` as the argument runs the neighbour check alone (for a fix trial): with a file uploaded,
// "OK" closes the window with no message left and the row lists; a "Name"-less "OK" still shows
// the box's own refusal and sends nothing.
// PACE_MS=4000 in front walks at a person's pace (four seconds before each action); unset, at once.
// The kit builds nothing; the neighbour adds the file "u39b ok" through the screen.
//
// Reset first: PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:         PROBE_FEATURE=<feature> PROBE_AGENT=<id> [PROBE_RUN=<r>] node bin/probe.js all shared/playwright/checks/issues/library-add-file-refused-closes-unasked/walk.js [nb]
const fs = require('fs');
const {forEachApp, launch, signIn, record, screen, outFile} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.argv[2] || 'walk';
const SUBMISSION = 1;

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line, mode: MODE};
    const fact = (k, v) => { facts[k] = v; console.log('[walk]', app.name, k, JSON.stringify(v).slice(0, 1500)); };
    const {page, close} = await launch(app);
    const dw = L.watchDialogs(page);
    const net = L.watchSaves(page);
    // A picture of the window as it stands (the viewport, where a page notice is drawn).
    const shoot = (name) => page.screenshot({path: outFile(`${name}.png`)});
    const step = async (name, fn) => {
        await L.pause();
        try { fact(name, await fn()); } catch (e) { fact(name, {error: L.flat(e.message, 300)}); }
    };
    try {
        await signIn(page, 'dbarnes');
        let list;
        let win;

        if (MODE === 'walk') {
            await step('s2-library', async () => { list = await L.openPublisherLibrary(page, app); return L.listed(list, 'Other'); });
            // control: the boxes' own refusals, nothing sent
            await step('c0-empty-ok', async () => { win = await L.fillAdd(list, null, null); return L.pressOk(page, win, net, 'c0'); });
            await step('c0-cancel', async () => { await win.cancel(); return L.windowOpen(page); });
            // control: before any "OK" the close button asks
            await step('c1-filled', async () => { win = await L.fillAdd(list, 'u39b guide', 'Other'); return L.messagesRead(page); });
            await step('c1-close', () => L.closeButton(page, win, dw, 'c1'));

            await step('s3-filled', async () => { win = await L.fillAdd(list, 'u39b guide', 'Other'); return L.messagesRead(page); });
            await step('s4-ok', () => L.pressOk(page, win, net, 's4', shoot));
            record('screen-s4', await screen(page));
            await step('s5-close', () => L.closeButton(page, win, dw, 's5'));
            await step('s6-listed', () => L.listed(list, 'Other'));

            // control: after the refused "OK", a changed box brings the question back
            await step('c2-filled', async () => { win = await L.fillAdd(list, 'u39b guide', 'Other'); return L.messagesRead(page); });
            await step('c2-ok', () => L.pressOk(page, win, net, 'c2'));
            await step('c2-rename', async () => { await win.nameBox().fill('u39b guide 2'); await win.nameBox().blur(); return L.messagesRead(page); });
            await step('c2-close', () => L.closeButton(page, win, dw, 'c2'));

            await step('s7-submission-library', async () => { list = await L.openSubmissionLibrary(page, app, SUBMISSION); return L.listed(list, 'Other'); });
            await step('s8-filled', async () => { win = await L.fillAdd(list, 'u39b guide', 'Other'); return L.messagesRead(page); });
            await step('s8-ok', () => L.pressOk(page, win, net, 's8', shoot));
            await step('s9-close', () => L.closeButton(page, win, dw, 's9'));
            await step('s9-listed', () => L.listed(list, 'Other'));
            // leaving the page after a refused "OK" (the Publisher Library's window)
            await step('s10-library', async () => { list = await L.openPublisherLibrary(page, app); win = await L.fillAdd(list, 'u39b guide', 'Other'); return L.messagesRead(page); });
            await step('s10-ok', () => L.pressOk(page, win, net, 's10'));
            await step('s11-leave', () => L.leavePage(page, app, dw, 's11'));
        } else {
            // Neighbour: what a fix must leave alone.
            const file = outFile('u39b-upload.txt');
            fs.writeFileSync(file, 'u39b neighbour file\n');
            await step('nb-library', async () => { list = await L.openPublisherLibrary(page, app); return L.listed(list, 'Other'); });
            await step('nb-empty-ok', async () => { win = await L.fillAdd(list, null, null); return L.pressOk(page, win, net, 'nb-empty'); });
            await step('nb-empty-cancel', async () => { await win.cancel(); return L.windowOpen(page); });
            await step('nb-filled', async () => { win = await L.fillAdd(list, 'u39b ok', 'Other'); await win.upload(file); return L.messagesRead(page); });
            await step('nb-ok', () => L.pressOk(page, win, net, 'nb-ok'));
            await step('nb-closed', async () => ({windowOpen: await L.windowOpen(page), asked: dw.dialogs.filter((d) => d.type === 'confirm')}));
            await step('nb-listed', () => L.listed(list, 'Other'));
            await step('nb-leave', () => L.leavePage(page, app, dw, 'nb-leave'));
        }
    } finally {
        facts.dialogs = dw.dialogs;
        facts.calls = net.calls;
        record(MODE === 'walk' ? 'facts' : `facts-${MODE}`, facts);
        await close();
    }
});
