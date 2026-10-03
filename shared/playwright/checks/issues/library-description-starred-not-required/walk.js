// U39 A3: "Description" carries the required-field star in "Add a file" and "Edit" of both
// libraries, yet a file with an empty description saves. The report's Steps, on PKP's default
// test dataset:
//   1-2   `dbarnes`, Settings › Workflow › "Publisher Library" ("Press Library", "Preprint Server Library")
//   3-5   "Add a file": the labels; "u39d no description", "Other", a file, "Description" empty, "OK"
//   6-7   its "Edit": "Description" read back; "u39d renamed", "Description" empty, "OK"
//   8-10  submission SUB[app]'s workflow, "Library", and 3-7 there ("u39d submission …")
//   control: "OK" with "Name" empty is refused with "This field is required."
// `nb` as the argument runs the neighbour check alone (for a fix trial): in the Publisher Library,
// "Name" left empty with a description typed is still refused under "Name"; then named, the file
// saves and its "Edit" reads the typed description back; "Name", "Type" and "File" keep their stars.
// The kit builds nothing; every file is added through the screens.
//
// Reset first: PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:         PROBE_FEATURE=<feature> PROBE_AGENT=<id> [PROBE_RUN=<r>] node bin/probe.js all shared/playwright/checks/issues/library-description-starred-not-required/walk.js [nb]
const fs = require('fs');
const {forEachApp, launch, signIn, record, screen, outFile} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.argv[2] || 'walk';
/** A submission in the Submission stage of each app's dataset. */
const SUB = {ojs: 4, omp: 3, ops: 1};

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line, mode: MODE, submission: SUB[app.name]};
    const fact = (k, v) => { facts[k] = v; console.log('[walk]', app.name, k, JSON.stringify(v).slice(0, 1500)); };
    const {page, close} = await launch(app);
    const dw = L.watchDialogs(page);
    const net = L.watchSaves(page);
    const step = async (name, fn) => {
        try { fact(name, await fn()); } catch (e) { fact(name, {error: L.flat(e.message, 300)}); }
    };
    const file = outFile('u39d-notes.txt');
    fs.writeFileSync(file, 'u39d notes\n');
    let list;
    let win;
    /** Steps 3-7 in the open list: add without a description, then edit without one. */
    const addAndEdit = async (p, addName, editName) => {
        await step(`${p}3-add-open`, async () => { win = await list.openAdd(); return L.formRead(page); });
        record(`screen-${p}3`, await screen(page));
        await step(`${p}4-filled`, async () => {
            await win.nameBox().fill(addName);
            await win.chooseType('Other');
            await win.upload(file);
            return L.formRead(page);
        });
        await step(`${p}5-ok`, () => L.okRead(page, win, net, `${p}5`, {screen}));
        await step(`${p}5-listed`, () => L.listed(list, 'Other'));
        await step(`${p}6-edit-open`, async () => { win = await list.openEdit(addName); return L.formRead(page); });
        record(`screen-${p}6`, await screen(page));
        await step(`${p}7-renamed`, async () => { await win.nameBox().fill(editName); return L.formRead(page); });
        await step(`${p}7-ok`, () => L.okRead(page, win, net, `${p}7`, {screen}));
        await step(`${p}7-listed`, () => L.listed(list, 'Other'));
        // the saved description, as the next "Edit" reads it back
        await step(`${p}7-readback`, async () => {
            win = await list.openEdit(editName);
            const r = await L.formRead(page);
            await win.cancel();
            return r;
        });
    };
    try {
        await signIn(page, 'dbarnes');
        if (MODE === 'walk') {
            await step('p2-library', async () => { list = await L.openPublisherLibrary(page, app); return L.listed(list, 'Other'); });
            // control: an empty "Name" is refused by its own check
            await step('c1-empty-name', async () => {
                win = await list.openAdd();
                await win.chooseType('Other');
                return L.okRead(page, win, net, 'c1');
            });
            await step('c1-cancel', async () => { await win.cancel(); return L.windowOpen(page); });
            await addAndEdit('p', 'u39d no description', 'u39d renamed');

            await step('s8-submission-library', async () => { list = await L.openSubmissionLibrary(page, app, SUB[app.name]); return L.listed(list, 'Other'); });
            await addAndEdit('s', 'u39d submission no description', 'u39d submission renamed');
        } else {
            // Neighbour: what a fix must leave alone.
            await step('nb-library', async () => { list = await L.openPublisherLibrary(page, app); return L.listed(list, 'Other'); });
            await step('nb-open', async () => { win = await list.openAdd(); return L.formRead(page); });
            await step('nb-no-name', async () => {
                await win.chooseType('Other');
                await win.descriptionBox().fill('u39d described');
                await win.upload(file);
                return L.okRead(page, win, net, 'nb-no-name');
            });
            await step('nb-named-ok', async () => {
                await win.nameBox().fill('u39d described');
                return L.okRead(page, win, net, 'nb-named', {screen});
            });
            await step('nb-listed', () => L.listed(list, 'Other'));
            await step('nb-readback', async () => {
                win = await list.openEdit('u39d described');
                const r = await L.formRead(page);
                await win.cancel();
                return r;
            });
        }
    } finally {
        facts.dialogs = dw.dialogs;
        facts.calls = net.calls;
        record(MODE === 'walk' ? 'facts' : `facts-${MODE}`, facts);
        await close();
    }
});
