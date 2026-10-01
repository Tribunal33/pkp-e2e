// Helpers of the U35 A3 / OMP1 walk (issue report
// docs/issues/U35-A3-OMP1-typed-participant-message-not-sent.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses:
// the workflow's "Participants" panel, its "Notify" and "Assign Participant" windows,
// the stage's discussions panel and the "Activity Log".
const {screen, shot, record, idle} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n || 400));

/** Per-app dataset facts the steps use (docs/process/dataset.md). */
const WORDS = {
    ojs: {
        id: 4, stage: 'workflow_1', stageName: 'Submission', control: 'Discussion (Submission)',
        notify: 'David Buskins', notifyMail: 'dbuskins@mailinator.com',
        role: 'Section editor', assign: 'Minoti Inoue', assignMail: 'minoue@mailinator.com',
        neighbour: {id: 8, stage: 'workflow_1', role: 'Section editor', assign: 'Minoti Inoue'},
    },
    omp: {
        id: 9, stage: 'workflow_1', stageName: 'Submission', control: 'Discussion (Submission)',
        notify: 'David Buskins', notifyMail: 'dbuskins@mailinator.com',
        role: 'Series editor', assign: 'Minoti Inoue', assignMail: 'minoue@mailinator.com',
        neighbour: {id: 6, stage: null, role: 'Series editor', assign: 'Stephanie Berardo'},
        internal: {stage: null, stageName: 'Internal Review', assign: 'Stephanie Berardo', assignMail: 'sberardo@mailinator.com'},
    },
    ops: {
        id: 1, stage: 'workflow_5', stageName: 'Production', control: 'Discussion (Production)',
        notify: 'David Buskins', notifyMail: 'dbuskins@mailinator.com',
        role: 'Moderator', assign: 'Minoti Inoue', assignMail: 'minoue@mailinator.com',
        neighbour: {id: 1, stage: 'workflow_5', role: 'Preprint Server manager', assign: 'Ramiro Vaca'},
    },
};

const wf = (page) => page.locator('[role="dialog"]:visible').first();
const column = (page) => page.locator('[data-cy="workflow-secondary-items"]');
const notifyWin = (page) =>
    page
        .getByRole('dialog')
        .filter({has: page.locator('form select[name="template"]')})
        .filter({hasNot: page.locator('select[name="filterUserGroupId"]')})
        .last();
const assignWin = (page) => page.getByRole('dialog').filter({has: page.locator('select[name="filterUserGroupId"]')}).last();

/** Open the submission's workflow on a stage by its address and wait for "Participants". */
async function openWorkflow(page, app, id, stageKey) {
    // No stage key: the submission opens on its current stage (a press's Internal Review round).
    const key = stageKey ? `&workflowMenuKey=${stageKey}` : '';
    await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${id}${key}`));
    await idle(page);
    await column(page).waitFor({timeout: 30000});
    await idle(page);
}

/** The "Participants" rows as lines ([initials, name, role, …]). */
function participants(page) {
    return column(page)
        .locator('li')
        .filter({has: page.locator('button')})
        .evaluateAll((items) => items.map((li) => li.innerText.split('\n').map((s) => s.trim()).filter((s) => s && !/More Actions$/.test(s)).join(' | ')));
}

/** The stage's discussions panel: its heading and rows as text. */
function discussions(page) {
    return page.evaluate(() => {
        const vis = (e) => e.getClientRects().length > 0;
        const dlg = [...document.querySelectorAll('[role=dialog]')].filter(vis)[0] || document.body;
        const h = [...dlg.querySelectorAll('h1,h2,h3,h4')].filter(vis).find((x) => /Discussions/i.test(x.innerText.trim()));
        if (!h) return null;
        let box = h.parentElement;
        for (let i = 0; i < 4 && box && !box.querySelector('table'); i++) box = box.parentElement;
        const rows = box
            ? [...box.querySelectorAll('tbody tr')]
                .filter(vis)
                .map((tr) => tr.innerText.replace(/\s+/g, ' ').trim())
                .filter((t) => t && !/^(Yet to begin|In progress|Closed|No Items)$/.test(t))
            : [];
        return {heading: h.innerText.trim(), rows};
    });
}

async function waitEditor(page, win) {
    const ta = win.locator('textarea[name="message"]');
    await ta.waitFor({state: 'attached', timeout: 30000});
    const id = await ta.getAttribute('id');
    await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: 30000});
    return id;
}

/** Row menu › "Notify": the window, once its "Message" box is ready. */
async function openNotify(page, name) {
    await wf(page).getByRole('button', {name: `${name} More Actions`, exact: true}).first().click();
    await page.getByRole('menuitem', {name: 'Notify', exact: true}).click();
    const win = notifyWin(page);
    await win.getByRole('button', {name: 'Notify', exact: true}).waitFor({timeout: 30000});
    await idle(page);
    await waitEditor(page, win);
    return win;
}

/** "Assign": the window, once its role list and people are there. */
async function openAssign(page) {
    await column(page).getByRole('button', {name: 'Assign', exact: true}).click();
    const win = assignWin(page);
    await win.locator('select[name="filterUserGroupId"]').waitFor({timeout: 30000});
    await idle(page);
    await win.locator('input[name="userId"], #userSelectGridContainer tr').first().waitFor({timeout: 20000}).catch(() => {});
    await idle(page);
    return win;
}

/** In "Assign Participant": choose the role, press "Search", choose the person. Returns whether the person was listed. */
async function chooseRoleAndPerson(page, win, role, person) {
    await win.locator('select[name="filterUserGroupId"]').selectOption({label: role});
    await idle(page);
    const resp = page.waitForResponse((r) => /fetchGrid|fetch-grid/i.test(r.url()), {timeout: 15000}).catch(() => null);
    await win.getByRole('button', {name: 'Search', exact: true}).click();
    await resp;
    await idle(page);
    await sleep(400);
    const radio = win.getByRole('row').filter({hasText: person}).locator('input[name="userId"]');
    if (!(await radio.count())) return false;
    await radio.first().check();
    await idle(page);
    await sleep(400);
    return true;
}

/** The entries of the window's predefined-message list, the blank one included. */
async function templateOptions(win) {
    return (await win.locator('select[name="template"] option').allTextContents()).map((t) => t.trim());
}

/** Choose an entry of the predefined-message list by its label ('' is the blank entry); returns the request's answer. */
async function chooseTemplate(page, win, label) {
    const fetched = page.waitForResponse((r) => /fetch-?template-?body/i.test(r.url()), {timeout: 15000}).catch(() => null);
    if (label === '') await win.locator('select[name="template"]').selectOption('');
    else await win.locator('select[name="template"]').selectOption({label});
    const r = await fetched;
    await idle(page);
    await sleep(800);
    return r ? {status: r.status(), body: flat(await r.text().catch(() => ''), 300)} : {status: null};
}

async function readMessage(page, win) {
    const id = await win.locator('textarea[name="message"]').getAttribute('id', {timeout: 3000}).catch(() => null);
    if (!id) return null;
    return page.evaluate((i) => (window.tinymce && window.tinymce.get(i) ? window.tinymce.get(i).getContent({format: 'text'}) : null), id);
}

/** Type into the window's "Message" box. */
async function typeMessage(page, win, text) {
    const id = await waitEditor(page, win);
    await page.frameLocator(`#${id}_ifr`).locator('body').click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('Delete');
    await page.keyboard.type(text);
    await sleep(300);
}

/**
 * Press the window's button ("Notify" or "OK") and read what follows: the request's status and the start
 * of its answer, whether the window is still open, the page notices, the screen.
 */
async function press(page, win, button, urlPattern, name) {
    const resp = page.waitForResponse((r) => urlPattern.test(r.url()), {timeout: 30000}).catch(() => null);
    await win.locator('form').getByRole('button', {name: button, exact: true}).last().click();
    const r = await resp;
    const out = {status: r ? r.status() : null, request: r ? r.url().replace(/^.*index\.php/, '').replace(/\?.*$/, '') : null};
    if (r) out.answer = flat(await r.text().catch(() => ''), 300);
    await win.waitFor({state: 'detached', timeout: 6000}).catch(() => {});
    await sleep(1500);
    await idle(page);
    out.windowOpen = await win.isVisible().catch(() => false);
    if (out.windowOpen) {
        out.message = flat(await readMessage(page, win), 200);
        out.template = await win.locator('select[name="template"]').evaluate((el) => (el.selectedOptions[0] ? el.selectedOptions[0].text.trim() : null)).catch(() => null);
        out.windowText = flat(await win.innerText().catch(() => ''), 600);
    }
    const s = await screen(page).catch((e) => ({error: String(e.message).slice(0, 200)}));
    out.notices = s.notices;
    record(name, {...s, pressed: out});
    await shot(page, name).catch(() => {});
    return out;
}

/** The "Activity Log" window's first rows as text, then closed. */
async function activityLog(page, rows = 12) {
    const btn = wf(page).getByRole('button', {name: /Activity Log/}).first();
    if (!(await btn.count())) return null;
    await btn.click();
    const dlg = page.locator('[role="dialog"]:visible').last();
    await dlg.locator('table tbody tr td').first().waitFor({timeout: 30000}).catch(() => {});
    await idle(page);
    const out = await dlg.locator('table tbody tr').evaluateAll(
        (trs, n) =>
            trs
                .map((tr) => {
                    const c = tr.cloneNode(true);
                    c.querySelectorAll('script, a, button').forEach((x) => x.remove());
                    return c.textContent.replace(/\s+/g, ' ').trim();
                })
                .filter(Boolean)
                .slice(0, n),
        rows
    );
    await dlg.getByRole('button', {name: /^Close/}).first().click().catch(() => {});
    await sleep(500);
    return out;
}

/**
 * Messages to `to` holding `marker`: [{subject, from, start}]. Polls until one arrives or `ms` passes,
 * loading the context's home page between reads (the dataset runs queued jobs on web requests).
 */
async function waitMail(page, app, to, marker, ms) {
    const end = Date.now() + ms;
    for (;;) {
        const r = await app.mail._search({to, contains: marker}).catch(() => ({messages: []}));
        const found = (r.messages || []).map((m) => ({subject: m.Subject, from: m.From && m.From.Address, start: flat(m.Snippet, 200)}));
        if (found.length || Date.now() > end) return found;
        await page.goto(app.url(`/index.php/${app.contextPath}`)).catch(() => {});
        await idle(page).catch(() => {});
        await sleep(1500);
    }
}

module.exports = {
    WORDS, sleep, flat, wf, column, notifyWin, assignWin, openWorkflow, participants, discussions, openNotify, openAssign,
    chooseRoleAndPerson, templateOptions, chooseTemplate, readMessage, typeMessage, press, activityLog, waitMail,
};
