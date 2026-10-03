// U39 A9 + A12: a library file's name pressed starts a download, and two seconds later the page
// handles the download's answer: it asks for the whole list again, which closes a row's strip
// opened meanwhile (A12), and the timer's callback fails in the page's script when the list was
// drawn again before it ran, by a second download or a save (A9). The Steps, on PKP's default
// test dataset, signed in as `dbarnes`, Settings › Workflow › "Publisher Library" ("Press
// Library", "Preprint Server Library"):
//   pre  "Add a file" twice: "u39c guide" and "u39c contract", "Other", a small file each
//   c0   control: press "u39c guide", hands off for 3.5 s
//   1-3  press "u39c guide", 1 s later its row's arrow; the strip read at once and 3 s later
//   4-5  press "u39c guide", 0.8 s later "u39c contract"; 4 s hands off
//   6    press "u39c guide", then the arrow of "u39c contract", "Edit", "OK" (machine pace)
// `nb` as the argument runs the neighbour check alone (for a fix trial): the name link is
// disabled right after a press and ready again after two seconds, a second press inside that
// time downloads nothing more, and a save ("Edit", a new name, "OK") still draws the list again
// with the new name.
// The kit builds nothing; the files are added through the screen.
//
// Reset first: PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run:         PROBE_FEATURE=<feature> PROBE_AGENT=<id> [PROBE_RUN=<r>] node bin/probe.js all shared/playwright/checks/issues/library-download-redraws-list/walk.js [nb]
const {forEachApp, launch, signIn, record, screen, shot} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.argv[2] || 'walk';
const GUIDE = 'u39c guide';
const CONTRACT = 'u39c contract';

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line, mode: MODE};
    const fact = (k, v) => { facts[k] = v; console.log('[walk]', app.name, k, JSON.stringify(v).slice(0, 1500)); };
    const {page, close} = await launch(app);
    const w = L.watch(page);
    const step = async (name, fn) => {
        try { fact(name, await fn()); } catch (e) { fact(name, {error: L.flat(e.message, 300), ...w.since(name)}); }
    };
    try {
        await signIn(page, 'dbarnes');
        let list;
        await step('pre-files', async () => {
            w.mark('pre-files');
            list = await L.openPublisherLibrary(page, app);
            await L.addFile(list, GUIDE, 'Other');
            await L.addFile(list, CONTRACT, 'Other');
            await L.settle(page, 1_000);
            return {listed: (await list.groupNameLinks('Other').allInnerTexts()).map((t) => L.flat(t)), ...w.since('pre-files')};
        });

        if (MODE === 'walk') {
            await step('c0-press-wait', async () => {
                w.mark('c0-press-wait');
                await list.nameLink(GUIDE).click();
                await L.settle(page, 3_500);
                return w.since('c0-press-wait');
            });

            await step('s1-3-strip', async () => {
                w.mark('s1-3-strip');
                await list.nameLink(GUIDE).click();
                await L.sleep(1_000);
                await list.arrow(GUIDE).first().click();
                const arrowAt = Date.now() - w.t0;
                await L.sleep(300);
                const atOnce = {ms: Date.now() - w.t0, ...(await L.stripRead(list, GUIDE))};
                await shot(page, 'strip-open');
                await L.sleep(3_000);
                const later = {ms: Date.now() - w.t0, ...(await L.stripRead(list, GUIDE))};
                await shot(page, 'strip-later');
                record('screen-strip-later', await screen(page));
                return {arrowPressedAtMs: arrowAt, atOnce, later, ...w.since('s1-3-strip')};
            });
            await L.settle(page, 1_000);

            await step('s4-5-two-downloads', async () => {
                w.mark('s4-5-two-downloads');
                await list.nameLink(GUIDE).click();
                await L.sleep(800);
                await list.nameLink(CONTRACT).click();
                const secondAt = Date.now() - w.t0;
                await L.settle(page, 4_000);
                return {secondPressAtMs: secondAt, ...w.since('s4-5-two-downloads')};
            });
            await L.settle(page, 1_000);

            await step('s6-edit-ok', async () => {
                w.mark('s6-edit-ok');
                await list.nameLink(GUIDE).click();
                const win = await list.openEdit(CONTRACT);
                await win.okButton().click();
                const okAt = Date.now() - w.t0;
                await win.expectClosed().catch(() => {});
                await L.settle(page, 3_500);
                return {okPressedAtMs: okAt, insideTwoSeconds: okAt < 2_000,
                    listed: (await list.groupNameLinks('Other').allInnerTexts()).map((t) => L.flat(t)), ...w.since('s6-edit-ok')};
            });
        } else {
            await step('nb1-link-guard', async () => {
                w.mark('nb1-link-guard');
                await list.nameLink(GUIDE).click();
                await L.sleep(300);
                const at300 = await L.linkRead(list, GUIDE);
                await list.nameLink(GUIDE).click().catch(() => {});   // a second press inside the two seconds
                await L.sleep(2_500);
                const at2800 = await L.linkRead(list, GUIDE);
                await L.settle(page, 1_000);
                return {at300, at2800, ...w.since('nb1-link-guard')};
            });
            await step('nb2-save-redraws', async () => {
                w.mark('nb2-save-redraws');
                const win = await list.openEdit(CONTRACT);
                await win.nameBox().fill(`${CONTRACT} 2`);
                await win.ok();
                await L.settle(page, 1_500);
                return {listed: (await list.groupNameLinks('Other').allInnerTexts()).map((t) => L.flat(t)), ...w.since('nb2-save-redraws')};
            });
            await step('nb3-download-after-save', async () => {
                w.mark('nb3-download-after-save');
                await list.nameLink(`${CONTRACT} 2`).click();
                await L.settle(page, 3_000);
                return {link: await L.linkRead(list, `${CONTRACT} 2`), ...w.since('nb3-download-after-save')};
            });
        }
    } finally {
        facts.errors = w.errors;
        record(MODE === 'walk' ? 'facts' : `facts-${MODE}`, facts);
        await close();
    }
});
