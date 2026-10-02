// U37 A8 walk (issue report docs/issues/U37-A8-author-discussion-with-file-edit-refused.md).
// On PKP's default test dataset for main, per app (lib.js WORDS: OJS 4, OMP 1, OPS 1):
//   author   the Author signs in, opens the submission from "My Submissions", "Tasks & Discussions" ›
//            "Add": a name, David Buskins ticked, a message, "Attach Files" › "Upload File" › the file
//            › "Attach Files", "Save"; then the row's "More Actions" › "Edit", the name changed, "Save";
//            when refused: the window's notice and errors, "Save" greyed or not, then the file's
//            "Remove" in the same window and "Save" again (greyed or not), "Cancel"
//   editor   (control) dbarnes (the editor, manager-level) opens the same stage and renames the same discussion through "Edit";
//            its window read: the file still on the first message
//   remove   (the way round, and the fix's neighbour: the path the fix must leave alone) the Author,
//            in a fresh "Edit": the file's "Remove", the name changed, "Save"; its window read
//   PROBE_FEATURE=issues-u37r3 PROBE_AGENT=u37r3 node bin/probe.js all shared/playwright/checks/issues/author-discussion-with-file-edit-refused/walk.js
//   (PROBE_RUN=fix in front for the walk with the fix applied.)
// On stable-3_5_0 (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u37r3-3_5 in front) the stage
// has the older discussions grid: the Author's "Add discussion" with David Buskins ticked, a subject, a
// message and "Upload File" (the upload wizard: a component, the file, "Continue", "Continue",
// "Complete"), "OK"; then the row's "Edit", the subject changed, "OK"; the grid and the query window read.
const {forEachApp, launch, signIn, record} = require('../../../probe');
const {WORDS, helpers, Q, addQuery35} = require('./lib.js');

forEachApp(async (app) => {
    const w = WORDS[app.name];
    const facts = {app: app.name, line: app.line || 'main', words: w};
    const step = async (name, fn) => {
        try {
            facts[name] = await fn();
        } catch (e) {
            facts[name] = {failed: String(e.stack || e).split('\n').slice(0, 4).join(' | ')};
        }
        console.log(`[${app.name}]`, name, JSON.stringify(facts[name]).slice(0, 4000));
    };
    const {page, close} = await launch(app);
    const h = helpers(app, page);
    const name = 'Author question u37r3';
    let current = name;
    try {
        if (facts.line !== 'main') {
            await step('author35', async () => {
                await signIn(page, w.author);
                const where = {id: w.id, byMenu: app.name === 'ops'};
                await Q.authorWorkflow35(page, app, where);
                const added = await addQuery35(page, app, {participantName: 'David Buskins', subject: name, message: 'Please see the attached file.', file: w.file});
                await Q.authorWorkflow35(page, app, where);
                const rows = await Q.gridRows(page);
                const before = await Q.readQuery35(page, name, 'r35-item');
                await Q.authorWorkflow35(page, app, where);
                const edited = await Q.editQuery35(page, name, {name: `${name} renamed`}, 'r35-rename');
                await Q.authorWorkflow35(page, app, where);
                const rowsAfter = await Q.gridRows(page);
                const after = await Q.readQuery35(page, `${name} renamed`, 'r35-rename-item').catch((e) => ({failed: String(e).slice(0, 200)}));
                return {added, rows, before, edited, rowsAfter, after};
            });
            return;
        }
        await step('author', async () => {
            await signIn(page, w.author);
            await h.open(w, true);
            await h.snap('author-panel');
            const added = await h.add({name, participant: w.participant, message: 'Please see the attached file.', file: w.file, label: 'author-add'});
            await h.open(w, true);
            const rows = await h.rows();
            const item = await h.readItem(name, 'author-item');
            await h.open(w, true);
            const {w: win, items, files} = await h.openEdit(name);
            await h.snap('author-edit');
            await win.locator('input[name="title"]').fill(`${name} renamed`);
            const saved = await h.save(win, 'author-rename');
            const out = {added, rows, item, menu: items, editFiles: files, saved};
            if (saved.closed) {
                current = `${name} renamed`;
                await h.open(w, true);
                out.after = await h.readItem(current, 'author-rename-item');
                return out;
            }
            const rm = win.getByRole('button', {name: /Remove/}).first();
            out.removeShown = await rm.count();
            if (out.removeShown) {
                await rm.click();
                await page.waitForTimeout(500);
                out.saveDisabledAfterRemove = await win.getByRole('button', {name: 'Save', exact: true}).isDisabled().catch(() => null);
                await h.snap('author-after-remove');
            }
            await h.cancel(win);
            return out;
        });

        await step('editor', async () => {
            await signIn(page, w.editor);
            await h.open(w, false);
            const {w: win, files} = await h.openEdit(current);
            await win.locator('input[name="title"]').fill(`${name} editor`);
            const saved = await h.save(win, 'editor-rename');
            if (!saved.closed) { await h.cancel(win); return {files, saved}; }
            current = `${name} editor`;
            await h.open(w, false);
            return {files, saved, after: await h.readItem(current, 'editor-rename-item')};
        });

        await step('remove', async () => {
            await signIn(page, w.author);
            await h.open(w, true);
            const {w: win, files} = await h.openEdit(current);
            const rm = win.getByRole('button', {name: /Remove/}).first();
            const removeShown = await rm.count();
            if (removeShown) { await rm.click(); await page.waitForTimeout(500); }
            await win.locator('input[name="title"]').fill(`${name} removed`);
            const saved = await h.save(win, 'author-remove-rename');
            if (!saved.closed) { await h.cancel(win); return {files, removeShown, saved}; }
            current = `${name} removed`;
            await h.open(w, true);
            return {files, removeShown, saved, after: await h.readItem(current, 'author-remove-item')};
        });
    } finally {
        record('facts', facts);
        await close();
    }
});
