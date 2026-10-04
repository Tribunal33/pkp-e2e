// Helpers of walk.js (issue report docs/issues/U05-OPS3-ops-task-link-workflow-stage-not-specified.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {signIn, signOut, screen, idle} = require('../../../probe');
const A8 = require('../section-editors-not-assigned-second-journal/lib.js');
const A7 = require('../editorial-submitter-no-acknowledgement/lib.js');

const {T, sleep, flat, L} = A8;

/** Per-app dataset facts: the section (OMP series) the author's submission lands in, its tab, the author. */
const WORDS = {
    ojs: {tab: 'Sections', add: 'Create Section', section: 'Articles', author: 'ccorino'},
    omp: {tab: 'Series', add: 'Add Series', section: 'Library & Information Studies', author: 'aclark'},
    ops: {tab: 'Sections', add: 'Create Section', section: 'Preprints', author: 'ccorino'},
};

/**
 * As `user`: Settings › Journal (Press, Server) › Sections (Series), "Edit" on the
 * submission's section, untick every "Assign … as …" box, "Save".
 * Returns {before: [{label, checked}], status}.
 */
async function clearSectionAssignments(page, app, user = 'dbarnes') {
    const {SectionsTab} = require('../../../pages/SectionsPages.js');
    const w = WORDS[app.name];
    await signIn(page, user);
    const tab = new SectionsTab(page, app.contextPath, {tab: w.tab, addLabel: w.add, locale: L(app).replace('/', '')});
    await tab.goto();
    const win = await tab.openEdit(w.section);
    const boxes = win.assignmentBoxes();
    const before = await boxes.evaluateAll((els) => els.map((e) => ({
        label: ((e.closest('label') || {}).innerText || e.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim(),
        checked: e.checked,
    })));
    for (let i = 0; i < before.length; i++) {
        if (before[i].checked) await boxes.nth(i).uncheck();
    }
    const r = await win.saveAndClose();
    await idle(page).catch(() => {});
    const rows = flat(await tab.grid().innerText().catch(() => null), 600);
    await signOut(page);
    return {before, status: r.status(), rows};
}

/** The author submits `title` through the wizard; returns {id, problems, screen}. */
async function authorSubmits(page, app, title) {
    return A7.submitAs(page, app, WORDS[app.name].author, title);
}

/**
 * As `user` (signed in): the dashboard, the "Tasks" bell, the row carrying `title`;
 * press its sentence. Records the markRead answer and every top-level navigation
 * (address, status, Location) until the browser settles.
 */
async function openTask(page, app, title) {
    const {TasksPanel} = require('../../../pages/NotificationsPages.js');
    await page.goto(app.url(`/index.php/${app.contextPath}${L(app)}/dashboard/editorial`));
    await idle(page);
    const panel = new TasksPanel(page);
    const out = {};
    out.countBefore = await panel.count().catch((e) => `error: ${e.message.split('\n')[0]}`);
    await panel.open();
    out.rowsBefore = await panel.rowTexts();
    const row = panel.row(title).first();
    out.rowUnreadBefore = await row.locator('div.task.unread').count();
    out.linkHref = await panel.link(row).getAttribute('href').catch(() => null);
    const chain = [];
    const onResponse = (res) => {
        const req = res.request();
        if (req.isNavigationRequest() && req.frame() === page.mainFrame()) {
            chain.push({url: res.url(), status: res.status(), location: res.headers().location || null});
        }
    };
    page.on('response', onResponse);
    const markRead = page.waitForResponse((res) => /markRead/.test(res.url()), {timeout: T}).catch(() => null);
    const startUrl = page.url();
    await panel.openTask(row);
    const mr = await markRead;
    if (mr) {
        out.markRead = {url: mr.url(), status: mr.status(), body: await mr.text().then((t) => flat(t, 400)).catch(() => null)};
    }
    await page.waitForURL((u) => u.toString() !== startUrl, {timeout: T}).catch(() => {});
    await page.waitForLoadState('load').catch(() => {});
    await idle(page).catch(() => {});
    await sleep(1500);
    await idle(page).catch(() => {});
    page.off('response', onResponse);
    out.chain = chain;
    out.landedUrl = page.url();
    out.landedTitle = await page.title();
    const s = await screen(page);
    out.landedText = flat((s.text && (s.text.dialog || s.text.main)) || '', 600);
    out.workflowDialog = flat(s.text && s.text.dialog, 300);
    return {out, screen: s};
}

/** As the signed-in user: the bell's number on the dashboard and whether the row now reads as read. */
async function taskAfter(page, app, title) {
    const {TasksPanel} = require('../../../pages/NotificationsPages.js');
    await page.goto(app.url(`/index.php/${app.contextPath}${L(app)}/dashboard/editorial`));
    await idle(page);
    const panel = new TasksPanel(page);
    const countAfter = await panel.count().catch((e) => `error: ${e.message.split('\n')[0]}`);
    await panel.open();
    const row = panel.row(title).first();
    const unreadAfter = await row.locator('div.task.unread').count();
    await panel.close().catch(() => {});
    return {countAfter, unreadAfter};
}

module.exports = {T, sleep, flat, L, WORDS, clearSectionAssignments, authorSubmits, openTask, taskAfter, signIn, signOut};
