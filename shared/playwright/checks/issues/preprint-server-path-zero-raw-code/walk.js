// Issue report docs/issues/U59-OPS1-preprint-server-path-zero-raw-code.md (U59 OPS1): the
// report's Steps to reproduce, walked through the screens on PKP's default test datasets (a
// dataset fleet, harness.md "Dataset fleets"). The script builds nothing.
//   (default)  as `admin`, Hosted Journals › "Create Journal", the form filled with the path "0",
//              "Save"; then the `publicknowledge` row's "Edit", "Path" replaced with "0", "Save".
//              OPS is the finding, OJS and OMP the controls.
//   neighbour  (the fix's check): "Create Journal" with the path "publicknowledge", "Save", then
//              with "a b", "Save": the two other path refusals, which the fix must leave alone.
//   reach      "Create Journal" filled as in the steps with "Path" left empty, "Save"; then "00"
//              typed in "Path", "Save": what an empty path and a path of two zeros show.
//
// Run (main):   npm run fleet-prep -- --feature issues-u59j --dataset 2 --reset   (before each mode)
//               PROBE_FEATURE=issues-u59j PROBE_AGENT=u59j node bin/probe.js all shared/playwright/checks/issues/preprint-server-path-zero-raw-code/walk.js [neighbour|reach]
// 3.5: the same with PKP_E2E_LINE=stable-3_5_0, feature issues-u59j-3_5, PROBE_RUN=r35.
// Facts: .reports/<feature>/u59j/ops1-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record} = require('../../../probe');
const L = require('./lib');

const MODE = process.argv[2] || 'steps';

forEachApp(async (app) => {
    const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
    const W = L.WORDS[app.name];
    const fact = (k, v) => {
        record('ops1-facts', {[k]: v}, {merge: true});
        console.log('[ops1]', app.name, k, JSON.stringify(v).slice(0, 900));
    };
    const snap = async (page, name) => {
        record(name, await screen(page));
        await shot(page, name).catch(() => {});
    };
    const {page} = await launch(app);
    const hosted = new HostedJournalsPage(page, W);

    // 1–3: sign in as admin, Hosted Journals, "Create Journal".
    await signIn(page, 'admin');
    await hosted.goto();
    const win = await hosted.openCreate();

    if (MODE === 'neighbour') {
        await L.fillCreate(win, W.noun, app.contextPath);
        const taken = await L.saveAndRead(page, win.form);
        fact('nb-path-in-use', {...L.pathFacts(taken), paths: L.paths(app)});
        await snap(page, 'ops1-nb-in-use');
        if ((await win.form.count()) > 0) {
            await win.type(win.path, 'a b');
            const shape = await L.saveAndRead(page, win.form);
            fact('nb-path-shape', {...L.pathFacts(shape), paths: L.paths(app)});
            await snap(page, 'ops1-nb-shape');
        } else {
            fact('nb-path-shape', {skipped: 'the window left at the first save'});
        }
        return;
    }

    if (MODE === 'reach') {
        await L.fillCreate(win, W.noun, '');
        const empty = await L.saveAndRead(page, win.form);
        fact('reach-empty', {...L.pathFacts(empty), paths: L.paths(app)});
        await snap(page, 'ops1-reach-empty');
        if ((await win.form.count()) > 0) {
            await win.type(win.path, '00');
            const zeros = await L.saveAndRead(page, win.form);
            fact('reach-00', {...L.pathFacts(zeros), paths: L.paths(app)});
            await snap(page, 'ops1-reach-00');
        } else {
            fact('reach-00', {skipped: 'the window left at the first save'});
        }
        return;
    }

    // 4: the form filled, "0" in "Path".  5: "Save".
    await L.fillCreate(win, W.noun, '0');
    const created = await L.saveAndRead(page, win.form);
    await snap(page, 'ops1-step5');
    fact('step5-create', {...L.pathFacts(created), paths: L.paths(app)});

    // 6: Hosted Journals reloaded, the arrow of publicknowledge, "Edit".  7: "Path" → "0", "Save".
    await hosted.goto();
    const edit = await hosted.openEdit(app.contextPath);
    fact('step6-opened', {path: await edit.path.inputValue(), country: await edit.countryChosen()});
    await edit.type(edit.path, '0');
    const edited = await L.saveAndRead(page, edit.form);
    await snap(page, 'ops1-step7');
    fact('step7-edit', {...L.pathFacts(edited), paths: L.paths(app)});
    await hosted.goto().catch(() => {});
    await signOut(page).catch(() => {});
});
