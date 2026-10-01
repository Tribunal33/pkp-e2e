// Shared steps for the two U35 A10 issue reports (walk.js beside this file and
// ../role-limited-discussion-template-fails/walk.js): Settings › Workflow ›
// "Tasks and Discussions" and the Participants panel's "Notify" window, driven
// on a dataset fleet (PKP's default test dataset) as its own users.
const {launch, signIn, signOut, screen, record, shot, idle, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

// The submission at Production in each app's dataset, its author account, and a
// non-manager participant without the Author role.
const CASE = {
    ojs: {sid: 5, author: 'ddiouf', authorName: 'Diaga Diouf', other: 'dbuskins', otherName: 'David Buskins', otherRole: 'Section editor'},
    omp: {sid: 4, author: 'bbeaty', authorName: 'Bart Beaty', other: 'gcox', otherName: 'Graham Cox', otherRole: 'Layout Editor'},
    ops: {sid: 1, author: 'ccorino', authorName: 'Carlo Corino', other: 'dbuskins', otherName: 'David Buskins', otherRole: 'Moderator'},
};
const DEFAULT_TPL = 'Discussion (Production)';

function helpers(app, page) {
    const c = CASE[app.name];
    const cu = (p) => app.url(`/index.php/${app.contextPath}/en${p}`);
    const facts = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${flat(JSON.stringify(v), 900)}`);
    };
    const answers = [];
    page.on('response', async (r) => {
        const u = r.url();
        if (!/fetchTemplateBody|fetch-template-body|sendNotification|send-notification|editTaskTemplates/i.test(u)) return;
        let body = '';
        try { body = await r.text(); } catch (e) { body = '(no body)'; }
        answers.push({t: Date.now(), method: r.request().method(), url: u.replace(/^https?:\/\/[^/]+/, ''), status: r.status(), body: flat(body, 300)});
    });
    const answersSince = (t0) => answers.filter((a) => a.t >= t0).map(({t, ...a}) => a);
    const snap = async (name, extra) => {
        let s;
        try { s = await screen(page); } catch (e) { s = {url: page.url(), error: String(e.message).slice(0, 200)}; }
        if (extra) Object.assign(s, extra);
        record(name, s);
        await shot(page, name).catch(() => {});
        return s;
    };

    const openWorkflowSettings = async () => {
        await page.goto(cu('/management/settings/workflow'));
        await idle(page);
        await page.getByRole('tab', {name: /Tasks and Discussions/}).first().click();
        await idle(page);
        await page.getByRole('row', {name: /^Production Stage/}).first().waitFor({timeout: T});
    };
    const templateWin = () => page.getByRole('dialog').filter({has: page.locator('input[name="title"]')}).last();

    // Settings › Workflow › "Tasks and Discussions" › "Production Stage" › "Add template"
    const addTemplate = async (name, body) => {
        await openWorkflowSettings();
        await page.getByRole('row', {name: /^Production Stage/}).first().getByRole('button', {name: 'Add template'}).click();
        const w = templateWin();
        await w.getByRole('textbox', {name: /^Name/}).first().waitFor({timeout: T});
        await idle(page); await sleep(500);
        await w.getByRole('textbox', {name: /^Name/}).first().fill(name);
        await w.frameLocator('iframe').first().locator('body').click();
        await page.keyboard.type(body);
        await sleep(300);
        await snap('a-template-form');
        const t0 = Date.now();
        await w.getByRole('button', {name: 'Save', exact: true}).click();
        await w.waitFor({state: 'hidden', timeout: T}).catch(() => {});
        await idle(page); await sleep(500);
        await snap('a-template-saved');
        fact('template saved', {answers: answersSince(t0), open: await w.isVisible().catch(() => false)});
    };

    // Settings › … › the template's "More Actions" › "Edit" › "Limit access to specific roles" › the role › "Save"
    const limitTemplate = async (name, ...roleList) => {
        await openWorkflowSettings();
        const row = page.getByRole('row').filter({hasText: name}).first();
        await row.getByRole('button', {name: /More Actions/}).click();
        await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
        const w = templateWin();
        await w.waitFor({timeout: T}); await idle(page); await sleep(800);
        await w.getByRole('radio', {name: 'Limit access to specific roles'}).check();
        await sleep(300);
        const roles = await w.locator('input[type=checkbox]:visible').evaluateAll((els) => els.map((e) => (e.labels && e.labels[0] ? e.labels[0].innerText : '').trim()));
        for (const role of roleList) await w.getByRole('checkbox', {name: role, exact: true}).check();
        await snap('b-template-limit-form', {roles});
        const t0 = Date.now();
        await w.getByRole('button', {name: 'Save', exact: true}).click();
        await w.waitFor({state: 'hidden', timeout: T}).catch(() => {});
        await idle(page); await sleep(500);
        await snap('b-template-limited');
        fact('template limited', {roles, answers: answersSince(t0), open: await w.isVisible().catch(() => false)});
    };

    const wf = () => page.locator('[role="dialog"]:visible').first();
    const openSubmission = async (label) => {
        await page.goto(cu(`/dashboard/editorial?workflowSubmissionId=${c.sid}&workflowMenuKey=workflow_5`));
        await idle(page);
        await wf().waitFor({timeout: T});
        await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, {timeout: 15000}).catch(() => {});
        await idle(page);
        await wf().getByRole('heading', {name: 'Participants'}).first().waitFor({timeout: T}).catch(() => {});
        return snap(label);
    };
    const notifyWin = () => page.getByRole('dialog').filter({has: page.locator('form select[name="template"]')}).last();
    const openNotify = async (who, label) => {
        await wf().getByRole('button', {name: `${who} More Actions`, exact: true}).first().click();
        await page.getByRole('menuitem', {name: 'Notify', exact: true}).click();
        const w = notifyWin();
        await w.waitFor({timeout: T});
        await w.locator('textarea[name="message"]').waitFor({state: 'attached', timeout: T});
        await idle(page); await sleep(500);
        const options = await w.locator('select[name="template"] option').evaluateAll((els) => els.map((o) => o.text.trim()));
        await snap(label, {options});
        return {w, options};
    };
    const message = async (w) => {
        const id = await w.locator('textarea[name="message"]').getAttribute('id');
        return page.evaluate((i) => (window.tinymce && window.tinymce.get(i) ? window.tinymce.get(i).getContent({format: 'text'}) : null), id);
    };
    const choose = async (w, tplName, label) => {
        const value = await w.locator('select[name="template"] option').evaluateAll((els, n) => (els.find((o) => o.text.trim() === n) || {}).value, tplName);
        const t0 = Date.now();
        await w.locator('select[name="template"]').selectOption(value);
        await idle(page); await sleep(1500);
        const out = {template: tplName, value, message: await message(w), answers: answersSince(t0)};
        await snap(label, out);
        fact(label, out);
        return out;
    };
    const typeAndSend = async (w, text, label) => {
        const id = await w.locator('textarea[name="message"]').getAttribute('id');
        if (!flat(await message(w))) {
            await page.frameLocator(`#${id}_ifr`).locator('body').click();
            await page.keyboard.type(text);
            await sleep(300);
        }
        const before = await message(w);
        const t0 = Date.now();
        await w.locator('form').getByRole('button', {name: 'Notify', exact: true}).click();
        await w.waitFor({state: 'detached', timeout: 10000}).catch(() => {});
        await idle(page); await sleep(1500);
        const s = await snap(label);
        const out = {sentMessage: before, open: await w.isVisible().catch(() => false), notices: s.notices || null, answers: answersSince(t0)};
        fact(label, out);
        if (out.open) await w.getByRole('button', {name: /^Close/}).first().click().catch(() => {});
        return out;
    };
    // The stage's "Production Tasks & Discussions" rows, read from the reopened page.
    const discussions = async (label) => {
        await openSubmission(label);
        const rows = await wf().locator('[data-cy="discussion-manager"] tbody tr').evaluateAll((els) => els.map((tr) => tr.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)).catch(() => []);
        fact(`${label} rows`, rows);
        return rows;
    };
    const mailTo = async (username, subject) => {
        await sleep(1500);
        const res = await app.mail._search({to: `${username}@mailinator.com`}).catch(() => ({messages: []}));
        const hits = (res.messages || []).filter((m) => (m.Subject || '') === subject && new Date(m.Created) > new Date(facts.startedAt));
        return hits.map((m) => ({subject: m.Subject, from: m.From && m.From.Address, created: m.Created}));
    };
    // For Evidence: the stage's discussions in the database, with their first note.
    const tasks = () => sql(app, `select t.edit_task_id, t.title, (select count(*) from notes n where n.assoc_type=1048586 and n.assoc_id=t.edit_task_id) from edit_tasks t where t.assoc_id=${c.sid} and t.stage_id=5 order by 1`).split('\n').filter(Boolean);

    return {c, cu, facts, fact, snap, addTemplate, limitTemplate, openSubmission, openNotify, choose, typeAndSend, discussions, mailTo, tasks, notifyWin};
}

async function session(app) {
    const s = await launch(app);
    return s;
}

module.exports = {CASE, DEFAULT_TPL, helpers, session, signIn, signOut, record, idle, sleep, flat};
