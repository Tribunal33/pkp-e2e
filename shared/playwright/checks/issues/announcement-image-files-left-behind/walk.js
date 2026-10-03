// Issue report walk: docs/issues/U12-A12-announcement-image-files-left-behind.md
// (spec U12 register A12). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"):
// signed in as the dataset's manager `rvaca` on `publicknowledge`; the kit
// builds nothing, announcements are turned on and the announcements are made
// on screen. No screen shows the public files folder, so the walk lists it
// after each step (`public/journals|presses|contexts/<id>/announcements/`
// under the install's public files directory). Fact keys carry the report's
// step numbers. Reset the fleet before each walk. Helpers come from
// ../refused-image-deletes-announcement/lib.js (U12 A2's walk).
//
// MODE=walk (default) the Steps (a GIF replaces the PNG, then the delete),
//                     then the Control ("Remove" then "Save").
// MODE=neighbour      the fix's neighbour: a same-type replacement (a PNG
//                     over a PNG) keeps the new file, a title-only edit
//                     keeps the file, and "Remove" then "Save" still
//                     deletes it.
// MODE=site           the site's announcements: as `admin`, a second
//                     journal (press, server) created on screen so the
//                     Site Settings show the "Announcements" tab; then
//                     the same add, replacement by a GIF and delete there,
//                     the site's folder (`public/site/announcements/`)
//                     listed after each.
//
// Run (main, then stable-3_5_0):
//   npm run fleet-prep -- --feature issues --dataset --reset
//   PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/announcement-image-files-left-behind/walk.js
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-3_5 --dataset --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-3_5 PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/announcement-image-files-left-behind/walk.js
const {forEachApp, launch, signIn, screen, shot, record, sql, serverLog} = require('../../../probe');
const L = require('../refused-image-deletes-announcement/lib.js');

const MODE = process.env.MODE || 'walk';

const ctxLib = () => require('../all-dates-error-nothing-published/lib.js');

forEachApp(async (app) => {
    if (MODE === 'site') return siteWalk(app);
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset n --reset)');
    const facts = {mode: MODE, line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 500)}`); };
    const key = `a12-${MODE}`;
    const contextId = Number(sql(app, `SELECT ${app.contextTables.id} FROM ${app.contextTables.table} WHERE path = '${app.contextPath}'`));
    const folder = L.announcementsFolder(app, contextId);
    fact('folder', folder);
    const log = serverLog(app);
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name) => record(`${key}-${String(++n).padStart(2, '0')}-${name}`, await screen(page));
    const step = async (label, fn) => {
        const from = log.mark();
        let v;
        try { v = await fn(); fact(label, v); } catch (e) { fact(label, {threw: String(e.message || e).split('\n')[0]}); }
        const lines = log.since(from).filter((l) => !/Unable/.test(l) && !/PluginGallery|plugins\.xml/.test(l)).map((l) => l.slice(0, 300));
        if (lines.length) fact(`${label} server log`, lines);
        return v;
    };
    const ls = (label, id) => fact(`${label} folder`, L.listFolder(folder, id).files);
    const editImage = async (title, picture) => {
        const dialog = await L.openEdit(page, title);
        const remove = await L.removeImage(page, dialog);
        const upload = await L.uploadImage(page, dialog, picture);
        return {remove, upload, save: await L.pressSave(page, dialog)};
    };
    try {
        await step('1 sign in as rvaca', async () => { await signIn(page, 'rvaca'); return true; });
        await step('2 Enable announcements', () => L.enableAnnouncements(app, page));
        await step('3 Announcements from the side menu', () => L.openAnnouncementsFromMenu(app, page));
        const a = await step('4 Add Announcement "u12r2 Spring notice" with photo.png', () =>
            L.addAnnouncement(page, {title: 'u12r2 Spring notice', picture: L.PICTURES.png}));
        const id = a && a.id;
        ls('4', id);
        await snap('after-add');

        if (MODE === 'walk') {
            await step('5 Edit, Remove, Upload File photo.gif, Save', () => editImage('u12r2 Spring notice', L.PICTURES.gif));
            ls('5', id);
            fact('5 stored', L.storedImage(app, sql, id));
            await snap('after-gif');
            // 5a: the announcement's public page, and its picture's address.
            let src = null;
            await step('5a the announcement\'s page and its picture', async () => {
                const v = await L.visit(app, page, `/index.php/${app.contextPath}/announcement/view/${id}`);
                const imgs = await page.locator('.obj_announcement_full img, main img, .pkp_structure_main img').evaluateAll((els) => els.map((i) => ({src: i.getAttribute('src'), alt: i.getAttribute('alt'), loaded: i.complete && i.naturalWidth > 0})));
                const mine = imgs.find((i) => /announcements\//.test(i.src || ''));
                src = mine ? mine.src : null;
                return {...v, picture: mine ? {...mine, src: L.rel(mine.src)} : null};
            });
            await L.reloadAnnouncements(app, page);
            await step('6 Delete, Yes', () => L.deleteAnnouncement(page, 'u12r2 Spring notice'));
            await snap('after-delete');
            await shot(page, `${key}-after-delete`);
            ls('6', id);
            fact('6 stored', L.storedImage(app, sql, id));
            // 6a: the picture's address after the delete, opened as a visitor would.
            if (src) {
                await step('6a the picture\'s address after the delete', async () => {
                    const res = await page.goto(src.startsWith('http') ? src : app.url(src));
                    return {address: L.rel(src), status: res && res.status(), type: res && res.headers()['content-type']};
                });
            }
            await L.reloadAnnouncements(app, page);
            // Control: "Remove" then "Save" deletes the file.
            const c = await step('C1 Add Announcement "u12r2 Autumn notice" with photo.png', () =>
                L.addAnnouncement(page, {title: 'u12r2 Autumn notice', picture: L.PICTURES.png}));
            const cid = c && c.id;
            ls('C1', cid);
            await step('C2 Edit, Remove, Save', async () => {
                const dialog = await L.openEdit(page, 'u12r2 Autumn notice');
                return {remove: await L.removeImage(page, dialog), save: await L.pressSave(page, dialog)};
            });
            ls('C2', cid);
            fact('C whole folder', L.listFolder(folder).files);
        } else {
            await step('N1 Edit, Remove, Upload File photo.png (same type), Save', () => editImage('u12r2 Spring notice', L.PICTURES.png));
            ls('N1', id);
            fact('N1 stored', L.storedImage(app, sql, id));
            await step('N1 the announcement\'s address', () => L.visit(app, page, `/index.php/${app.contextPath}/announcement/view/${id}`));
            const img = await page.locator('main img, .pkp_structure_main img').evaluateAll((els) => els.map((i) => ({src: (i.getAttribute('src') || '').replace(/^https?:\/\/[^/]+/, ''), alt: i.getAttribute('alt'), loaded: i.complete && i.naturalWidth > 0}))).catch(() => []);
            fact('N1 page images', img);
            await L.reloadAnnouncements(app, page);
            await step('N2 Edit, Title to "u12r2 Spring notice (updated)", Save', async () => {
                const dialog = await L.openEdit(page, 'u12r2 Spring notice');
                await dialog.locator('input[name="title-en"]').fill('u12r2 Spring notice (updated)');
                return L.pressSave(page, dialog);
            });
            ls('N2', id);
            fact('N2 stored', L.storedImage(app, sql, id));
            await step('N3 Edit, Remove, Save', async () => {
                const dialog = await L.openEdit(page, 'u12r2 Spring notice (updated)');
                return {remove: await L.removeImage(page, dialog), save: await L.pressSave(page, dialog)};
            });
            ls('N3', id);
            fact('N3 stored', L.storedImage(app, sql, id));
            await snap('neighbour-end');
        }
    } finally {
        record(`${key}-facts`, facts);
        await close();
    }
});

/** MODE=site: the same add, replacement and delete on the site's announcements. */
async function siteWalk(app) {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset n --reset)');
    const facts = {mode: MODE, line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 500)}`); };
    const key = 'a12-site';
    const folder = L.announcementsFolder(app, 'site');
    fact('folder', folder);
    const log = serverLog(app);
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name) => record(`${key}-${String(++n).padStart(2, '0')}-${name}`, await screen(page));
    const step = async (label, fn) => {
        const from = log.mark();
        let v;
        try { v = await fn(); fact(label, v); } catch (e) { fact(label, {threw: String(e.message || e).split('\n')[0]}); }
        const lines = log.since(from).filter((l) => !/Unable/.test(l) && !/PluginGallery|plugins\.xml/.test(l)).map((l) => l.slice(0, 300));
        if (lines.length) fact(`${label} server log`, lines);
        return v;
    };
    const ls = (label, id) => fact(`${label} folder`, L.listFolder(folder, id).files);
    L.useSiteScope(true);
    try {
        await step('S1 sign in as admin', async () => { await signIn(page, 'admin'); return true; });
        await step('S2 Create a second context "u12r2 Second"', () => ctxLib().createContext(page, app,
            {name: 'u12r2 Second', initials: 'U12R2', path: 'u12r2second', email: 'u12r2second@mailinator.com'}));
        const {enableSiteAnnouncements} = require('../edited-announcement-type-keeps-old-name/lib.js');
        await step('S3 Site Settings › Announcements › Settings: Enable announcements', () => enableSiteAnnouncements(app, page));
        await step('S4 the Announcements side tab', () => L.openSiteAnnouncements(app, page));
        const a = await step('S4 Add Announcement "u12r2 Site notice" with photo.png', () =>
            L.addAnnouncement(page, {title: 'u12r2 Site notice', picture: L.PICTURES.png}));
        const id = a && a.id;
        ls('S4', id);
        fact('S4 stored', L.storedImage(app, sql, id));
        await snap('site-after-add');
        await step('S5 Edit, Remove, Upload File photo.gif, Save', async () => {
            const dialog = await L.openEdit(page, 'u12r2 Site notice');
            const remove = await L.removeImage(page, dialog);
            const upload = await L.uploadImage(page, dialog, L.PICTURES.gif);
            return {remove, upload, save: await L.pressSave(page, dialog)};
        });
        fact('S5 rows after reload', await L.reloadAnnouncements(app, page));
        ls('S5', id);
        fact('S5 stored', L.storedImage(app, sql, id));
        await step('S6 Delete, Yes', () => L.deleteAnnouncement(page, 'u12r2 Site notice'));
        fact('S6 rows after reload', await L.reloadAnnouncements(app, page));
        await snap('site-after-delete');
        ls('S6', id);
        fact('S6 stored', L.storedImage(app, sql, id));
        fact('S whole folder', L.listFolder(folder).files);
    } finally {
        L.useSiteScope(false);
        record(`${key}-facts`, facts);
        await close();
    }
}
