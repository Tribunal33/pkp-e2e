// Issue report walk: docs/issues/U12-A2-refused-image-deletes-announcement.md
// (spec U12 register A2). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"):
// signed in as the dataset's manager `rvaca` on `publicknowledge`; the kit
// builds nothing, announcements are turned on and the announcement is made
// on screen. Fact keys carry the report's step numbers. The public files
// folder is listed after each save (no screen shows it). Reset the fleet
// before each walk: the walk turns announcements on and adds one.
//
// MODE=walk (default) the Steps, then the Control ("Add Announcement" with
//                     the same picture).
// MODE=neighbour      the fix's neighbour: an edit that changes only the
//                     title and keeps the picture, and an edit with a GIF
//                     that replaces the PNG; both must save as before.
//
// Run (main, then stable-3_5_0):
//   npm run fleet-prep -- --feature issues --dataset --reset
//   PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/refused-image-deletes-announcement/walk.js
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-3_5 --dataset --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-3_5 PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/refused-image-deletes-announcement/walk.js
const {forEachApp, launch, signIn, screen, shot, record, sql, serverLog} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset n --reset)');
    const facts = {mode: MODE, line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 500)}`); };
    const key = `a2-${MODE}`;
    const contextId = Number(sql(app, `SELECT ${app.contextTables.id} FROM ${app.contextTables.table} WHERE path = '${app.contextPath}'`));
    const folder = L.announcementsFolder(app, contextId);
    const log = serverLog(app);
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name) => record(`${key}-${String(++n).padStart(2, '0')}-${name}`, await screen(page));
    const step = async (label, fn) => {
        const from = log.mark();
        try { fact(label, await fn()); } catch (e) { fact(label, {threw: String(e.message || e).split('\n')[0]}); }
        const lines = log.since(from).filter((l) => !/Unable/.test(l) && !/PluginGallery|plugins\.xml/.test(l)).map((l) => l.slice(0, 300));
        if (lines.length) fact(`${label} server log`, lines);
    };
    try {
        await step('1 sign in as rvaca', async () => { await signIn(page, 'rvaca'); return true; });
        await step('2 Enable announcements', () => L.enableAnnouncements(app, page));
        await step('3 Announcements from the side menu', () => L.openAnnouncementsFromMenu(app, page));
        await snap('announcements-empty');
        await step('4 Add Announcement "u12r2 Spring notice" with photo.png', () =>
            L.addAnnouncement(page, {title: 'u12r2 Spring notice', picture: L.PICTURES.png}));
        const id = facts['4 Add Announcement "u12r2 Spring notice" with photo.png'].id;
        fact('4 folder', L.listFolder(folder, id));
        fact('4 stored', L.storedImage(app, sql, id));
        await snap('after-add');

        if (MODE === 'walk') {
            let dialog;
            await step('5 Edit, Remove, Upload File photo.jpeg', async () => {
                dialog = await L.openEdit(page, 'u12r2 Spring notice');
                return {remove: await L.removeImage(page, dialog), upload: await L.uploadImage(page, dialog, L.PICTURES.jpeg)};
            });
            await snap('edit-jpeg-chosen');
            await step('6 Save', () => L.pressSave(page, dialog));
            await snap('after-save-refused');
            await shot(page, `${key}-after-save-refused`);
            fact('6 rows before reload', await L.rowTitles(page));
            fact('6 folder', L.listFolder(folder, id));
            fact('6 stored', L.storedImage(app, sql, id));
            await step('7 close the panel, reload Announcements', async () => ({closed: await L.closeDialog(page, dialog), rows: await L.reloadAnnouncements(app, page)}));
            await snap('after-reload');
            await shot(page, `${key}-after-reload`);
            await step('7 open the announcement\'s address', () => L.visit(app, page, `/index.php/${app.contextPath}/announcement/view/${id}`));
            await snap('announcement-address');
            fact('7 folder', L.listFolder(folder, id));
            // Control: the same picture on "Add Announcement".
            await L.reloadAnnouncements(app, page);
            await step('C Add Announcement "u12r2 Summer notice" with photo.jpeg', () =>
                L.addAnnouncement(page, {title: 'u12r2 Summer notice', picture: L.PICTURES.jpeg}));
            await snap('control-add-refused');
            fact('C rows after reload', await L.reloadAnnouncements(app, page));
            fact('C folder (whole)', L.listFolder(folder));
        } else {
            let dialog;
            await step('N1 Edit, Title to "u12r2 Spring notice (updated)", Save', async () => {
                dialog = await L.openEdit(page, 'u12r2 Spring notice');
                await dialog.locator('input[name="title-en"]').fill('u12r2 Spring notice (updated)');
                return L.pressSave(page, dialog);
            });
            fact('N1 rows after reload', await L.reloadAnnouncements(app, page));
            fact('N1 folder', L.listFolder(folder, id));
            fact('N1 stored', L.storedImage(app, sql, id));
            await step('N2 Edit, Remove, Upload File photo.gif, Save', async () => {
                dialog = await L.openEdit(page, 'u12r2 Spring notice (updated)');
                const remove = await L.removeImage(page, dialog);
                const upload = await L.uploadImage(page, dialog, L.PICTURES.gif);
                return {remove, upload, save: await L.pressSave(page, dialog)};
            });
            fact('N2 rows after reload', await L.reloadAnnouncements(app, page));
            await snap('neighbour-after-gif');
            fact('N2 folder', L.listFolder(folder, id));
            fact('N2 stored', L.storedImage(app, sql, id));
            await step('N2 the announcement\'s address', () => L.visit(app, page, `/index.php/${app.contextPath}/announcement/view/${id}`));
        }
    } finally {
        record(`${key}-facts`, facts);
        await close();
    }
});
