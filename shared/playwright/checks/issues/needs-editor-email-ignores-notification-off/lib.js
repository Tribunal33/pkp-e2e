// Helpers of walk.js (issue report docs/issues/U05-A10-needs-editor-email-ignores-notification-off.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {idle, record, screen, shot} = require('../../../probe');
const U21 = require('../section-editors-not-assigned-second-journal/lib.js');

const {T, sleep, flat, L} = U21;

/** Per-app screen words: the author, the section the author submits to, the row's sentence. */
const WORDS = {
    ojs: {author: 'ccorino', section: 'Articles', tab: 'Sections', row: 'A new article has been submitted to which an editor needs to be assigned.'},
    omp: {author: 'aclark', section: null, tab: 'Series', row: 'A new monograph has been submitted to which an editor needs to be assigned.'},
    ops: {author: 'ccorino', section: 'Preprints', tab: 'Sections', row: 'A new preprint has been submitted to which a moderator needs to be assigned.'},
};

const SETTING = 'notificationEditorAssignmentRequired';

/**
 * Settings › Journal (Server) › "Sections", the section's "Edit": untick every box under
 * "Editorial Assignments" that is ticked, "Save". Returns the boxes as found and the row after.
 * OMP has nothing to do (the author leaves "Series" at "None"): returns null.
 */
async function unassignSectionEditors(page, app) {
    const w = WORDS[app.name];
    if (!w.section) return null;
    const {SectionsTab} = require('../../../pages/SectionsPages.js');
    const tab = new SectionsTab(page, app.contextPath, {tab: w.tab, locale: L(app).replace('/', '')});
    await tab.goto();
    const win = await tab.openEdit(w.section);
    const boxes = win.assignmentBoxes();
    const before = [];
    for (let i = 0; i < await boxes.count(); i++) {
        const b = boxes.nth(i);
        const label = flat(await b.evaluate((e) => (e.closest('label') || {}).innerText || e.getAttribute('aria-label') || ''), 120);
        const checked = await b.isChecked();
        before.push({label, checked});
        if (checked) await b.uncheck();
    }
    const r = await win.saveAndClose();
    await idle(page).catch(() => {});
    return {before, saveStatus: r.status(), editorsCell: flat(await tab.editorsCell(w.section).innerText().catch(() => null), 200)};
}

/**
 * Profile › "Notifications": set the "needs an editor" row's two boxes ({allow, noEmail}; a box
 * left undefined is not touched), record the row before "Save", "Save", then reload the tab and
 * record the row again. Returns {beforeSave, toast, afterReload}.
 */
async function setNeedsEditorRow(page, app, {allow, noEmail}, label) {
    const {ProfilePage} = require('../../../pages/ProfilePage.js');
    const profile = new ProfilePage(page, app.contextPath);
    await profile.goto('notifications');
    const pair = profile.notificationPair(SETTING);
    const state = async () => ({
        row: flat(await profile.notificationRow(WORDS[app.name].row).innerText().catch(() => null), 300),
        allow: await pair.allow.isChecked(),
        noEmail: await pair.email.isChecked(),
        noEmailDisabled: await pair.email.isDisabled(),
    });
    if (noEmail !== undefined) await pair.email.setChecked(noEmail);
    if (allow !== undefined) await pair.allow.setChecked(allow);
    const beforeSave = await state();
    await profile.save();
    const toast = flat(await profile.toast.innerText({timeout: 5000}).catch(() => null), 200);
    record(`${label}-saved`, await screen(page));
    await profile.goto('notifications');
    const afterReload = await state();
    await shot(page, `${label}-after-reload`).catch(() => {});
    return {beforeSave, toast, afterReload};
}

/** The signed-in person's "Tasks" window (the bell, on the editorial dashboard): the rows naming `title`. */
async function tasksFor(page, app, title, label) {
    const {TasksPanel} = require('../../../pages/NotificationsPages.js');
    await page.goto(app.url(`/index.php/${app.contextPath}${L(app)}/dashboard/editorial`));
    await idle(page).catch(() => {});
    const tasks = new TasksPanel(page);
    const bell = flat(await tasks.bell().innerText().catch(() => null), 40);
    await tasks.open();
    await sleep(500);
    const rows = await tasks.rowTexts().catch(() => []);
    record(label, await screen(page));
    await tasks.close().catch(() => {});
    return {bell, rowsForTitle: rows.filter((r) => r.includes(title)), rowCount: rows.length};
}

/** Every message to `to` whose text holds `marker`: [{subject}]; waits up to `wait` ms for the first. */
async function mailFor(app, to, marker, wait = 0) {
    return U21.mailFor(app, to, marker, {wait});
}

/** The author's submission through the wizard: "New Submission", title, section, every step, "Submit". */
async function submit(page, app, title) {
    const w = WORDS[app.name];
    const id = await U21.beginSubmission(page, app, app.contextPath, {title, section: w.section});
    const problems = await U21.completeSubmission(page, app, app.contextPath, id, {series: null});
    return {id, problems};
}

module.exports = {T, sleep, flat, WORDS, SETTING, unassignSectionEditors, setNeedsEditorRow, tasksFor, mailFor, submit};
