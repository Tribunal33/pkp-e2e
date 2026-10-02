// U36 A2 issue walk: the Author's "More Actions" menu offers "Update File Details" on a file an
// editor uploaded, and the window refuses them. On PKP's default test dataset (a dataset fleet,
// harness.md "Dataset fleets"), journal or press `publicknowledge`. The kit builds nothing.
// A preprint server has no workflow file lists: not walked.
//
// MODE=walk (default), OJS submission 4 (author cmontgomerie) and OMP submission 3 (bbarnetson):
//   1 sign in as dbarnes; 2 open the submission; 3 "Upload" above "Submission Files", the component
//   "Article Text" (OMP "Book Manuscript"), u36e-notes.txt, "Continue", "Continue", "Complete";
//   4 sign in as the author; 5 open the submission from "My Submissions"; 6 "More Actions" on the
//   row u36e-notes.txt; 7 "Update File Details". Control: the same entry on the author's own file.
// MODE=nb, the neighbour alone (with a fix in and out): the author's own row still offers the
//   entry, the window opens and saves a new name; dbarnes is still offered the entry on the
//   author's file and the window opens for him.
// On 3.5 the entry is named "Edit". The "Revisions Uploaded" side of the entry is walked by
// ../author-refused-on-editors-revision-file/walk.js.
//
// Reset first:  npm run fleet-prep -- --feature issues-u36e --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u36e PROBE_AGENT=u36e node bin/probe.js ojs,omp shared/playwright/checks/issues/author-update-file-details-offered-then-refused/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u36e-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u36e-3_5 PROBE_AGENT=u36e node bin/probe.js ojs,omp shared/playwright/checks/issues/author-update-file-details-offered-then-refused/walk.js
// Facts: .reports/<feature>/u36e/a2-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.env.MODE || 'walk';
const FILE = 'u36e-notes.txt';
const ENTRY = process.env.PKP_E2E_LINE === 'stable-3_5_0' ? 'Edit' : 'Update File Details'; // 3.5 names the entry "Edit"
const CASES = {
    ojs: {id: 4, author: 'cmontgomerie', own: 'Computer Skill Requirements', component: 'Article Text'},
    omp: {id: 3, author: 'bbarnetson', own: 'chapter1.pdf', component: 'Book Manuscript'},
};

forEachApp(async (app) => {
    const c = CASES[app.name];
    if (!c) { console.log(`[a2 ${app.name}] no workflow file lists: not walked`); return; }
    const o = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (name) => {
        const s = await screen(page).catch((e) => ({url: page.url(), error: L.flat(e.message)}));
        const id = `a2-${MODE}-${String(++n).padStart(2, '0')}-${name}`;
        record(id, s);
        await shot(page, id).catch(() => {});
        return s;
    };
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) { o[key] = {threw: L.flat(e.message, 400)}; await snap(`${key}-threw`).catch(() => {}); }
        console.log(`[a2 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 1500));
        return o[key];
    };
    // "Update File Details" on a row, recorded, and the window closed again.
    const edit = async (key, list, name) => {
        const r = await step(key, () => L.openEdit(page, list, name, ENTRY));
        await snap(key);
        if (r && r.offered) await L.closeTop(page).catch(() => {});
        return r;
    };
    try {
        if (MODE === 'walk') {
            const list = 'Submission Files';
            await signIn(page, 'dbarnes');                                                        // 1
            await L.openWorkflow(page, app, c.id);                                                // 2
            await step('editorListBefore', () => L.listRows(page, list));
            await step('editorUpload', () => L.editorUpload(page, list, c.component, L.smallFile(FILE))); // 3
            await step('editorListAfter', () => L.listRows(page, list));
            await signIn(page, c.author);                                                         // 4
            await L.openWorkflow(page, app, c.id, {author: true});                                // 5
            await step('authorList', () => L.listRows(page, list));
            await step('authorMenuOnEditorsFile', () => L.rowMenu(page, list, FILE));             // 6
            await step('authorMenuOnOwnFile', () => L.rowMenu(page, list, c.own));
            await snap('author-list');
            await edit('authorEditEditorsFile', list, FILE);                                      // 7
            await edit('authorEditOwnFile', list, c.own);                                         // control
            o.stored = L.stored(app, c.id);
        } else if (MODE === 'nb') {
            const list = 'Submission Files';
            await signIn(page, c.author);
            await L.openWorkflow(page, app, c.id, {author: true});
            await step('authorMenuOnOwnFile', () => L.rowMenu(page, list, c.own));
            await step('authorEditOwnFile', () => L.openEdit(page, list, c.own, ENTRY));
            await snap('author-own-window');
            if (o.authorEditOwnFile && o.authorEditOwnFile.window && o.authorEditOwnFile.window.nameBox != null) {
                await step('authorRename', () => L.rename(page, 'u36e Manuscript'));
            }
            await step('authorListAfter', () => L.listRows(page, list));
            await signIn(page, 'dbarnes');
            await L.openWorkflow(page, app, c.id);
            await step('editorMenuOnAuthorsFile', () => L.rowMenu(page, list, 'u36e Manuscript'));
            await edit('editorEditAuthorsFile', list, 'u36e Manuscript');
            o.stored = L.stored(app, c.id);
        }
    } catch (e) {
        o.error = L.flat(e.stack || e.message, 800);
        await snap('error').catch(() => {});
    } finally {
        record(`a2-facts-${MODE}`, o);
        console.log(`[a2 ${app.name} ${MODE}] facts`, JSON.stringify(o).slice(0, 6000));
        await close();
    }
});
