// U37 A24 issue walk: a Copyeditor or Layout Editor's "Attach Files" ›
// "Workflow Files" › "Select submission stage" list, stage by stage.
//
// Runs on a dataset fleet (PKP's default test dataset, docs/process/dataset.md):
//   PROBE_FEATURE=<dataset feature> PROBE_AGENT=<id> node bin/probe.js ojs|omp \
//     shared/playwright/checks/issues/assistant-workflow-files-empty-stages/walk.js
// Reset the fleet first (part C saves a discussion). No assertions: each
// step is recorded with screen(); facts-<app>.json holds the reads.
//
// Steps:
//  A. mfritz (Copyeditor) on the Copyediting submission: "Add" › "Attach
//     Files" › "Attach Workflow Files"; every option of "Select submission
//     stage" read (label, disabled, colour); each option chosen as a person
//     would (the list's own selection, which refuses a disabled option, and
//     the keyboard), and what shows between the list and "Back" read.
//  B. gcox (Layout Editor) on the Production submission, the same.
//  C. The register footnote's path: mfritz saves a discussion, opens it,
//     "Add New Message" › "Attach Files" › "Attach Workflow Files", the same
//     reads.
//  Control: dbarnes (Editor) on the Copyediting submission, the same reads.
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');

const flat = (s) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim());

/** Per-app dataset facts (docs/process/dataset.md, `main`). */
const W = {
    ojs: {ce: {id: 3, key: 'workflow_4', title: 'Copyediting Tasks & Discussions'}, pr: {id: 5, key: 'workflow_5', title: 'Production Tasks & Discussions'}},
    omp: {ce: {id: 7, key: 'workflow_4', title: 'Copyediting Tasks & Discussions'}, pr: {id: 4, key: 'workflow_5', title: 'Production Tasks & Discussions'}},
};

/** The "Workflow Files" window's list, read and tried stage by stage. */
async function readStages(page, label) {
    const wf = page.getByRole('dialog', {name: 'Workflow Files', exact: true}).last();
    const sel = wf.getByRole('combobox', {name: 'Select submission stage'});
    await sel.waitFor({timeout: 30_000});
    const out = {
        initialValue: await sel.inputValue(),
        options: await sel.locator('option').evaluateAll((os) =>
            os.map((o) => ({label: o.textContent.trim(), value: o.value, disabled: o.disabled, color: getComputedStyle(o).color}))
        ),
        initialText: flat(await wf.innerText()),
        perStage: {},
    };
    record(`${label}-01-list`, await screen(page));
    await shot(page, `${label}-01-list`);
    for (const o of out.options) {
        const r = {};
        // The list's own selection: Playwright refuses a disabled option as the browser does.
        r.choose = await sel.selectOption({label: o.label}, {timeout: 3000}).then(() => 'chosen').catch((e) => flat(e.message).slice(0, 80));
        await idle(page);
        await page.waitForTimeout(800);
        r.valueAfter = await sel.inputValue();
        r.headings = (await wf.getByRole('heading').allInnerTexts()).map(flat);
        r.fileBoxes = await wf.getByRole('checkbox').count();
        r.noItems = await wf.getByText('No Items', {exact: true}).count();
        r.text = flat(await wf.innerText());
        out.perStage[o.label] = r;
        record(`${label}-02-${o.label.replace(/\W+/g, '-').toLowerCase()}`, await screen(page));
    }
    // The keyboard: from the last option, ArrowUp walks the list as a person's keys do.
    await sel.focus();
    const keys = [];
    for (let i = 0; i < out.options.length; i++) {
        await page.keyboard.press('ArrowUp');
        keys.push(await sel.inputValue());
    }
    out.keyboardArrowUpValues = keys;
    return out;
}

async function openWorkflowFilesFrom(page, box) {
    await box.getByRole('button', {name: 'Attach Files'}).last().click();
    const attach = page.getByRole('dialog', {name: 'Attach Files', exact: true}).last();
    await attach.getByRole('button', {name: 'Attach Workflow Files', exact: true}).click();
    await idle(page);
}

forEachApp(async (app) => {
    const {TasksDiscussionsPanel} = require('../../../pages/TasksDiscussionsPages.js');
    const w = W[app.name];
    if (!w) return;
    const facts = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    try {
        const add = async (user, s, label) => {
            await signIn(page, user);
            const panel = new TasksDiscussionsPanel(page, app.contextPath, {title: s.title});
            await panel.gotoEditorial(s.id, s.key);
            const win = await panel.openAdd();
            await openWorkflowFilesFrom(page, win.group('Discussion'));
            const r = await readStages(page, label);
            return {panel, win, r};
        };

        // A. Copyeditor, "Add" window.
        let {r} = await add('mfritz', w.ce, 'a-copyeditor-add');
        facts.copyeditorAdd = r;
        await signOut(page);

        // B. Layout Editor, "Add" window.
        ({r} = await add('gcox', w.pr, 'b-layout-editor-add'));
        facts.layoutEditorAdd = r;
        await signOut(page);

        // C. The footnote's path: a reply box of a saved discussion.
        await signIn(page, 'mfritz');
        const panel = new TasksDiscussionsPanel(page, app.contextPath, {title: w.ce.title});
        await panel.gotoEditorial(w.ce.id, w.ce.key);
        const win = await panel.openAdd();
        await win.nameField().fill('Copyedit notes u37r12');
        await win.tick('dbarnes');
        await win.typeMessage('Notes on the copyedit.');
        const answer = await win.saveAndAnswer();
        facts.discussionSave = answer.status();
        await idle(page);
        await panel.reland();
        const dw = await panel.openItem('Copyedit notes u37r12');
        await dw.addNewMessage();
        await openWorkflowFilesFrom(page, dw.root);
        facts.copyeditorReply = await readStages(page, 'c-copyeditor-reply');
        await signOut(page);

        // Control: the Editor.
        ({r} = await add('dbarnes', w.ce, 'd-editor-add'));
        facts.editorAdd = r;
    } finally {
        record('facts', facts);
        await close();
    }
});
