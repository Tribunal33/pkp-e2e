// U37 A2 and A21 walk (docs/issues/U37-A2-discussion-window-placeholder-subtitle.md, docs/issues/U37-A21-error-list-calls-message-box-undefined.md), on PKP's default dataset:
// as dbarnes, the Production stage of OJS 5 / OMP 4 / OPS 1 › "Production Tasks & Discussions" ›
// "Add": the header (A2); "Save" untouched: the error list (A21); a discussion saved, then
// "More Actions" › "Edit": the header again, the message emptied, "Save", the list again; the
// discussion's own window, "Add New Message": that box's label; as rvaca,
// Settings › Workflow › "Tasks and Discussions" › Production "Add template", "Save": the list.
// Neighbours: the panel's own description (A2), "Go to Name" and the list with only
// the message box empty.
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=u37r9 node bin/probe.js all shared/playwright/checks/issues/discussion-window-placeholder-and-unnamed-message/walk.js
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');
const L = require('./lib.js');

const NAME = 'u37r9 discussion';

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main'};
    const {page, close} = await launch(app);
    try {
        const {ItemWindow, TaskTemplatesTab, TemplateWindow} = require('../../../pages/TasksDiscussionsPages.js');
        facts.refusals = [];
        page.on('response', async (r) => {
            if (/\/tasks(\/\d+)?$/.test(new URL(r.url()).pathname) && r.status() >= 400) {
                const entry = {status: r.status(), sent: r.request().postData()};
                facts.refusals.push(entry);
                entry.body = await r.text().catch(() => null);
            }
        });
        await signIn(page, 'dbarnes');
        let panel = await L.openPanel(app, page);
        facts.panelDescription = L.flat(await panel.root().locator('p').first().innerText().catch(() => null));

        // Adding
        let win = await panel.openAdd();
        facts.addHeader = await L.header(win.root);
        facts.addMessageLabel = await L.messageLabel(win.root);
        record('add-window', await screen(page));
        await win.saveButton().click();
        await idle(page);
        facts.addEmptySave = await L.errorList(win.root);
        record('add-refused', await screen(page));

        // Neighbour: the name typed, the message box still empty -> the message box's line alone.
        await win.nameField().fill(NAME);
        await win.saveButton().click({timeout: 5_000}).catch(() => null);
        await idle(page);
        facts.addMessageOnlyMissing = await L.errorList(win.root);

        // Save a discussion to edit
        await win.typeMessage('u37r9 message');
        await win.tick(L.SECOND[app.name]);
        const answer = await win.saveAndAnswer();
        facts.saveStatus = answer.status();
        await idle(page);
        // A press or a preprint server answers the save with an "Error" window (U37 A1); the item is stored.
        const ok = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'OK', exact: true})}).last();
        if (await ok.isVisible().catch(() => false)) {
            facts.saveErrorWindow = L.flat(await ok.innerText());
            await ok.getByRole('button', {name: 'OK', exact: true}).click();
        }
        await page.waitForTimeout(1_000);
        panel = await L.openPanel(app, page);

        // Editing
        win = await panel.openEdit(NAME);
        facts.editHeader = await L.header(win.root);
        record('edit-window', await screen(page));
        await L.emptyMessage(page, win.root);
        await win.nameField().click();
        await win.saveButton().click();
        await idle(page);
        facts.editEmptyMessageSave = await L.errorList(win.root);
        record('edit-refused', await screen(page));

        // The discussion's own window: "Add New Message" and its box's label (shares the "Add"/"Edit" box's options).
        panel = await L.openPanel(app, page);
        const dw = await panel.openItem(NAME);
        await dw.addNewMessage();
        const replyId = await dw.replyEditorId();
        const replyLabel = dw.root.locator(`label[for="${replyId}"]`);
        facts.replyLabel = (await replyLabel.count()) ? L.flat(await replyLabel.innerText()) : null;
        record('reply-box', await screen(page));
        await signOut(page);

        // Template window
        await signIn(page, 'rvaca');
        const tab = new TaskTemplatesTab(page, app.contextPath);
        await tab.goto();
        facts.templatePageDescription = L.flat(await page.getByText(/^Templates for tasks and discussions|^Use this/).first().innerText().catch(() => null));
        const tw = await tab.openAdd('Production Stage');
        facts.templateHeader = await L.header(tw.root);
        facts.templateMessageLabel = await L.messageLabel(tw.root);
        await tw.saveButton().click();
        await idle(page);
        facts.templateEmptySave = await L.errorList(tw.root);
        record('template-refused', await screen(page));
        await signOut(page);
    } catch (e) {
        facts.failed = String(e.stack || e).split('\n').slice(0, 4).join(' | ');
    } finally {
        const lists = [facts.addEmptySave, facts.editEmptyMessageSave, facts.templateEmptySave];
        facts.verdict = {
            A2_placeholder: [facts.addHeader, facts.editHeader].map((h) => (h || []).some((l) => /Open for What\?/.test(l))),
            A21_undefined: lists.map((l) => !!(l && l.buttons && l.buttons.some((b) => /Go to undefined/.test(b)))),
        };
        record('walk', facts);
        console.log(`[${app.name}]`, JSON.stringify(facts, null, 1));
        await close();
    }
});
