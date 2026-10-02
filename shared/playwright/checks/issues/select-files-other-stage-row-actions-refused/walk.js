// U36 A19 walk (issue report docs/issues/U36-A19-select-files-other-stage-row-actions-refused.md).
// On PKP's default test dataset: dbarnes opens a Copyediting submission (OJS 3, OMP 7), presses
// "Upload/Select Files" above "Draft Files", ticks "Show files from all accessible workflow
// stages." and, on the file listed under "Submission", presses "More Information", "Edit",
// "Delete" (then "OK") and the file's name. OPS has no such window and is skipped.
// MODE=neighbour: what a fix must leave alone. The same file is ticked and copied onto "Draft
// Files" with "OK"; in the window opened again, the copy under "Copyediting" (the list's own
// stage) opens "More Information" and "Edit", downloads by its name, and "Delete" removes it.
// MODE=editsave: for a walk with a fix in. "Edit" on the file under "Submission", "Save" with the
// name unchanged, then "More Information" and the name on the row the save redraws.
// MODE=name: step 8 alone (the name of the file under "Submission"), for a walk with a fix in,
// where step 7 deletes the file before its name can be pressed.
//
//   npm run fleet-prep -- --feature issues-u36g --dataset 1 --reset
//   PROBE_FEATURE=issues-u36g PROBE_AGENT=u36g node bin/probe.js all shared/playwright/checks/issues/select-files-other-stage-row-actions-refused/walk.js
//   (MODE=neighbour in front for the neighbour check; PKP_E2E_LINE=stable-3_5_0 and the line's fleet for 3.5)
const {forEachApp, launch, signIn, signOut, screen, record} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    if (!c) { console.log(`${app.name}: no "Upload/Select Files" window (no Copyediting or Review stage), skipped`); return; }
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, submissionId: c.submissionId};
    const {page, close} = await launch(app);
    const answers = H.watchActions(page);
    const step = async (key, fn) => {
        try { facts[key] = await fn(); } catch (e) { facts[key] = {threw: H.flat(e.message, 1500)}; record(`${MODE}-${key}-threw`, await screen(page).catch(() => ({}))); }
        return facts[key];
    };
    // The four presses on one row of the window; each closes what it opened. The name is pressed
    // last on another stage's file (the press may leave the page), and before "Delete" on the copy.
    const presses = async (row, tag, {nameLast}) => {
        const out = {};
        out.controls = await H.rowControls(page, row);
        out.moreInformation = await H.press(page, row, 'More Information', answers, {wait: 10_000});
        record(`${tag}-1-more-information`, await screen(page));
        out.moreInformation.closed = await H.closeTop(page);
        out.edit = await H.press(page, row, 'Edit', answers);
        record(`${tag}-2-edit`, await screen(page));
        out.edit.closed = await H.closeTop(page);
        const del = async () => {
            await H.rowControls(page, row);
            out.delete = await H.press(page, row, 'Delete', answers, {wait: 10_000, confirm: true});
            record(`${tag}-3-delete`, await screen(page));
            out.delete.closed = await H.closeTop(page);
            out.delete.window = await H.selectOnTop(page) ? (await H.readSelect(page)).rows : null;
        };
        const name = async () => {
            if (!(await H.selectOnTop(page))) {
                // the question could not be closed: the page is loaded again and the window reopened
                await H.openCopyediting(page, app, c.submissionId);
                await H.openSelect(page, 'Draft Files');
                await H.tickAllStages(page);
                out.reopened = true;
            }
            out.name = await H.pressName(page, row, answers);
            record(`${tag}-4-name`, await screen(page));
        };
        // the download link redraws the grid, which folds the row's controls away
        if (nameLast) { await del(); await name(); } else { await name(); await del(); }
        return out;
    };
    try {
        facts.storedBefore = H.stored(app, c.submissionId);
        // 1–2
        await signIn(page, 'dbarnes');
        await H.openCopyediting(page, app, c.submissionId);
        facts.draftFilesBefore = await H.listRows(page, 'Draft Files');
        // 3–4
        await step('window', async () => { await H.openSelect(page, 'Draft Files'); return await H.readSelect(page); });
        await step('allStages', async () => { await H.tickAllStages(page); return await H.readSelect(page); });
        record(`${MODE}-0-all-stages`, await screen(page));
        if (MODE === 'neighbour') {
            // the copy: tick the Submission file, "OK", open the window again
            await step('copy', async () => {
                const ticked = await H.tick(page, H.fileRow(page, c.file, c.group));
                await H.ok(page);
                return {ticked, draftFiles: await H.listRows(page, 'Draft Files')};
            });
            await step('windowAgain', async () => { await H.openSelect(page, 'Draft Files'); return await H.readSelect(page); });
            await step('ownStage', () => presses(H.fileRow(page, c.file, c.own), 'nb', {nameLast: false}));
        } else if (MODE === 'editsave') {
            // with a fix in: "Edit", "Save" with the name as it is, then the redrawn row's links
            await step('editSave', async () => {
                const row = H.fileRow(page, c.file, c.group);
                const out = {controls: await H.rowControls(page, row)};
                out.edit = await H.press(page, row, 'Edit', answers);
                const from = answers.length;
                await page.getByRole('dialog').last().getByRole('button', {name: 'Save', exact: true}).click();
                await H.sleep(3_000);
                out.afterSave = {selectOnTop: await H.selectOnTop(page), window: (await H.readSelect(page)).rows, answers: answers.slice(from)};
                record('editsave-1-saved', await screen(page));
                out.controlsAgain = await H.rowControls(page, row);
                out.moreInformation = await H.press(page, row, 'More Information', answers, {wait: 5_000});
                out.moreInformation.closed = await H.closeTop(page);
                out.name = await H.pressName(page, row, answers);
                return out;
            });
        } else if (MODE === 'name') {
            // the name alone, for a walk in which "Delete" has removed the file before its name is pressed
            await step('otherStageName', () => H.pressName(page, H.fileRow(page, c.file, c.group), answers));
            record('name-4-name', await screen(page));
        } else {
            // 5–8
            await step('otherStage', () => presses(H.fileRow(page, c.file, c.group), 'walk', {nameLast: true}));
        }
        facts.storedAfter = H.stored(app, c.submissionId);
        await signOut(page).catch(() => {});
    } finally {
        record(`facts-${MODE}`, facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
