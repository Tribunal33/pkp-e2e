// Helpers of walk.js here (issue report docs/issues/U37-A8-author-discussion-with-file-edit-refused.md).
// Requiring this file runs nothing. The Tasks & Discussions panel of main's workflow (the Vue
// DiscussionManager): open it as an Author or an editor, add a discussion with an uploaded file,
// open "Edit", save, read a refusal and an item's window. Adapted from the U37 claim-check
// helpers (shared/playwright/checks/U37/K6, Ks30), which export nothing.
const path = require('path');
const {screen, shot, record, idle} = require('../../../probe');

const flat = (s, n = 1500) => (s || '').replace(/\s*\n+\s*/g, ' | ').slice(0, n);

/** Per app, on PKP's default test dataset for main (docs/process/dataset.md). */
const WORDS = {
    ojs: {id: 4, key: 'workflow_1', author: 'cmontgomerie', participant: 'dbuskins', editor: 'dbarnes', file: 'notes.md'},
    omp: {id: 1, key: 'workflow_4', author: 'aclark', participant: 'dbuskins', editor: 'dbarnes', file: 'notes.md'},
    ops: {id: 1, key: 'workflow_5', author: 'ccorino', participant: 'dbuskins', editor: 'dbarnes', file: 'not-an-image.txt'},
};

const fixturePath = (app, f) => path.resolve(__dirname, `../../../../../apps/${app.name}/playwright/fixtures/files/${f}`);

function helpers(app, page) {
    const h = {};
    const L = (...a) => console.log(`[${app.name}]`, ...a);
    h.L = L;
    h.answers = [];
    page.on('response', async (r) => {
        if (!/\/api\/v1\/.*tasks|temporaryFiles/.test(r.url())) return;
        const req = r.request();
        const e = {t: Date.now(), method: `${req.method()}${req.headers()['x-http-method-override'] ? '→' + req.headers()['x-http-method-override'] : ''}`, url: r.url().replace(/^.*\/api\/v1/, ''), status: r.status()};
        if (r.status() >= 400) e.body = await r.text().catch(() => null);
        if (/tasks(\/\d+)?$/.test(r.url()) && !/^GET/.test(e.method)) e.sent = req.postData() ? req.postData().slice(0, 800) : null;
        h.answers.push(e);
    });
    h.since = (t0) => h.answers.filter((a) => a.t >= t0 && !/^GET/.test(a.method)).map((a) => `${a.method} ${a.url} ${a.status}${a.body ? ' ' + a.body.slice(0, 400) : ''}${a.sent ? ' sent ' + a.sent : ''}`);
    h.snap = async (name) => { const s = await screen(page); record(name, s); await shot(page, name).catch(() => {}); return s; };
    h.panel = () => page.locator('[data-cy="discussion-manager"]:visible').first();
    h.top = () => page.locator('[role="dialog"]:visible').last();
    h.win = () => page.getByRole('dialog').filter({has: page.locator('input[name="title"]')}).last();

    /** The workflow, as an Author ("My Submissions") or an editor, on the stage of `w.key`. */
    h.open = async (w, asAuthor) => {
        const base = `/index.php/${app.contextPath}/en/dashboard/${asAuthor ? 'mySubmissions' : 'editorial'}?workflowSubmissionId=${w.id}`;
        await page.goto(app.url(`${base}&workflowMenuKey=${w.key}`));
        await idle(page);
        if (app.name === 'ops' && asAuthor && !(await h.panel().count())) {
            await page.getByRole('link', {name: 'Production Tasks & Discussions'}).first().click().catch(() => L('no author link'));
            await idle(page);
        }
        await h.panel().getByRole('button', {name: 'Add', exact: true}).first().waitFor({timeout: 30000}).catch(() => L('no Add button'));
        await page.waitForFunction(() => { const p = [...document.querySelectorAll('[data-cy="discussion-manager"]')].find((e) => e.getClientRects().length); return p && !/Loading/.test(p.innerText); }, null, {timeout: 15000}).catch(() => {});
        await idle(page);
    };
    h.editorReady = () => page.waitForFunction(() => window.tinymce && window.tinymce.get().some((e) => e.initialized && e.getContainer() && e.getContainer().offsetParent !== null), null, {timeout: 20000}).catch(() => L('tinymce not initialized'));
    h.typeMsg = async (w, text) => {
        await h.editorReady();
        await w.frameLocator('iframe').last().locator('body').click();
        await page.keyboard.type(text);
    };
    h.tick = async (w, username) => {
        const b = w.locator('label', {hasText: `(${username})`}).locator('input[name="participants"]');
        if (!(await b.count())) { L('no box for', username); return false; }
        await b.first().setChecked(true);
        return true;
    };
    h.row = (name) => h.panel().locator('tbody tr').filter({has: page.getByRole('button', {name, exact: true})}).first();
    h.rows = () => h.panel().locator('tbody tr').evaluateAll((trs) => trs.map((tr) => tr.innerText.replace(/\s+/g, ' ').trim().slice(0, 200)).filter(Boolean)).catch(() => []);
    /** "Attach Files" › "Upload File" › the file › "Attach Files", in window w. */
    h.attachUpload = async (w, file) => {
        await w.getByRole('button', {name: 'Attach Files'}).last().click();
        await idle(page); await page.waitForTimeout(400);
        const sources = await h.top().getByRole('button').allInnerTexts().catch(() => []);
        await h.top().getByRole('button', {name: 'Upload File', exact: true}).first().click();
        await idle(page); await page.waitForTimeout(400);
        await page.locator('input[type="file"]').last().setInputFiles(fixturePath(app, file));
        await h.top().getByRole('button', {name: /Remove/}).first().waitFor({timeout: 20000}).catch(() => L('upload shows no Remove'));
        await idle(page);
        await h.top().getByRole('button', {name: 'Attach Files', exact: true}).last().click();
        await idle(page); await page.waitForTimeout(500);
        return {sources: sources.map((s) => s.trim()).filter(Boolean)};
    };
    /** Press "Save" in window w; the answer, whether the window closed, what it shows when not. */
    h.save = async (w, label) => {
        const t0 = Date.now();
        await w.getByRole('button', {name: 'Save', exact: true}).click();
        await page.waitForResponse((r) => /\/tasks(\/\d+)?$/.test(r.url()) && r.request().method() !== 'GET', {timeout: 15000}).catch(() => null);
        await idle(page);
        await page.waitForTimeout(600);
        if (h.answers.some((a) => a.t >= t0 && !/^GET/.test(a.method) && a.status < 300)) await w.waitFor({state: 'hidden', timeout: 6000}).catch(() => {});
        const closed = !(await w.isVisible().catch(() => false));
        const res = {label, closed, answers: h.since(t0)};
        if (!closed) {
            const s = await h.snap(`${label}-refused`);
            res.notices = s.notices;
            res.read = await w.evaluate((d) => ({
                fieldErrors: [...d.querySelectorAll('.pkpFieldError, .pkpFormField__error')].filter((e) => e.getClientRects().length && e.innerText.trim()).map((e) => e.innerText.trim()),
                errorTexts: [...d.querySelectorAll('[class*="rror"]')].map((e) => ({text: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 200), shown: e.getClientRects().length > 0 && !/screenReader/.test(e.className + ' ' + ((e.closest('.-screenReader') || {}).className || ''))})).filter((x) => x.text),
                goTo: [...d.querySelectorAll('button, a')].map((b) => b.textContent.trim().replace(/\s+/g, ' ')).filter((t) => /^Go to/.test(t)),
            }));
            res.saveDisabled = await w.getByRole('button', {name: 'Save', exact: true}).isDisabled().catch(() => null);
        }
        L('save', label, JSON.stringify(res));
        return res;
    };
    h.cancel = async (w) => {
        if (!(await w.isVisible().catch(() => false))) return;
        await w.getByRole('button', {name: 'Cancel', exact: true}).click().catch(() => {});
        const warn = page.getByRole('dialog', {name: 'Warning'});
        await warn.waitFor({timeout: 1500}).then(() => warn.getByRole('button', {name: 'Yes', exact: true}).click()).catch(() => {});
        await w.waitFor({state: 'hidden', timeout: 10000}).catch(() => L('window did not close on Cancel'));
        await idle(page);
        await page.waitForTimeout(700);
    };
    /** "Add": name, participant, message, an uploaded file, "Save". */
    h.add = async ({name, participant, message, file, label}) => {
        await h.panel().getByRole('button', {name: 'Add', exact: true}).first().click();
        const w = h.win();
        await w.waitFor({timeout: 30000});
        await w.locator('input[name="participants"]').first().waitFor({timeout: 30000}).catch(() => L('add: no participant boxes'));
        await idle(page);
        await w.locator('input[name="title"]').fill(name);
        const ticked = await h.tick(w, participant);
        await h.typeMsg(w, message);
        const up = await h.attachUpload(w, file);
        await h.snap(`${label}-filled`);
        const r = await h.save(w, label);
        if (!r.closed) await h.cancel(w);
        return {...r, ticked, upload: up};
    };
    /** The row's "More Actions" › "Edit"; the window once its fields and editor are there. */
    h.openEdit = async (name) => {
        await h.row(name).getByRole('button', {name: /More Actions/}).click();
        await page.getByRole('menuitem').first().waitFor({timeout: 10000}).catch(() => {});
        const items = (await page.getByRole('menuitem').allInnerTexts()).map((x) => x.trim());
        await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
        const w = h.win();
        await w.waitFor({timeout: 30000});
        await w.locator('input[name="participants"]').first().waitFor({timeout: 30000}).catch(() => L('edit: no participant boxes'));
        await idle(page);
        await h.editorReady();
        await page.waitForTimeout(600);
        const files = await w.evaluate((d) => d.innerText.match(/Attach Files[\s\S]{0,300}/)?.[0]?.replace(/\s*\n+\s*/g, ' | ') || null);
        return {w, items, files};
    };
    /** The row's "More Actions" › "Add Task Details": a due date and the owner, "Save". */
    h.addTaskDetails = async (name, {due, owner, label}) => {
        await h.row(name).getByRole('button', {name: /More Actions/}).click();
        await page.getByRole('menuitem').first().waitFor({timeout: 10000}).catch(() => {});
        await page.getByRole('menuitem', {name: 'Add Task Details', exact: true}).click();
        const w = h.win();
        await w.waitFor({timeout: 30000});
        await w.locator('input[name="participants"]').first().waitFor({timeout: 30000}).catch(() => L('task details: no participant boxes'));
        await idle(page);
        await h.editorReady();
        await page.waitForTimeout(600);
        const ticked = await w.getByRole('checkbox', {name: 'Enter task information'}).isChecked().catch(() => null);
        await w.locator('input[name="dateDue"]').fill(due);
        await w.locator('label', {hasText: `(${owner})`}).locator('input[name="taskInfoAssignee"]').first().check();
        await h.snap(`${label}-filled`);
        const r = await h.save(w, label);
        if (!r.closed) await h.cancel(w);
        return {...r, ticked};
    };
    /** Press the item's name and read its window: the messages and the files they carry. */
    h.readItem = async (name, label) => {
        await h.row(name).getByRole('button', {name, exact: true}).first().click();
        const w = page.getByRole('dialog', {name, exact: true}).last();
        await w.waitFor({timeout: 30000});
        await page.waitForFunction(() => { const d = [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length).pop(); return d && /Message from/.test(d.innerText) && !/Loading/.test(d.innerText); }, null, {timeout: 30000}).catch(() => L('window text never settled'));
        await idle(page); await page.waitForTimeout(600);
        await h.snap(label);
        const r = await w.evaluate((d) => ({
            messages: d.innerText.split('Message from').slice(1).map((m) => m.replace(/\s*\n+\s*/g, ' | ').slice(0, 300)),
            files: [...d.querySelectorAll('a[href*="download"], a[href*="file"]')].map((a) => a.innerText.trim()).filter(Boolean),
        }));
        await w.getByRole('button', {name: 'Close', exact: true}).last().click({timeout: 5000}).catch(() => {});
        await page.waitForTimeout(700);
        return r;
    };
    return h;
}

// ---------------------------------------------------------------------------------------------
// 3.5: the stage's discussions grid (legacy). The grid, its row "Edit" and the query window are the
// U37 A9 walk's (../participant-message-edit-adds-message/lib.js); this adds "Add discussion" with
// a file uploaded through the form's "Upload File" wizard.
const Q = require('../participant-message-edit-adds-message/lib.js');

/** "Add discussion": the participant ticked, subject, message, "Upload File" (wizard), "OK". */
async function addQuery35(page, app, {participantName, subject, message, file}) {
    const top = () => page.locator('[role="dialog"]:visible').last();
    const grid = page.locator('[id^="component-grid-queries-queriesgrid"]').first();
    await grid.getByText(/Add discussion/i).first().click();
    const form = page.locator('form#queryForm').last();
    await form.waitFor({timeout: 30000});
    await idle(page);
    await form.locator('label', {hasText: participantName}).locator('input[type="checkbox"]').first().check();
    await form.locator('input[name="subject"]').fill(subject);
    const id = await form.locator('textarea[name="comment"]').getAttribute('id');
    await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: 30000});
    await page.frameLocator(`#${id}_ifr`).locator('body').click();
    await page.keyboard.type(message);
    // The upload wizard: a component, the file, "Continue", "Continue", "Complete".
    await form.locator('a', {hasText: 'Upload File'}).click();
    const wiz = top();
    const genre = wiz.locator('select[name="genreId"]');
    await genre.waitFor({timeout: 30000});
    await idle(page);
    const options = await genre.locator('option').allInnerTexts();
    const pick = options.map((o) => o.trim()).find((o) => o === 'Other') || options.map((o) => o.trim()).filter((o) => !/^Select/.test(o))[0];
    await genre.selectOption({label: pick});
    await page.locator('input[type="file"]').last().setInputFiles(fixturePath(app, file));
    await wiz.getByText(/File added|Change File|Remove|100%/).first().waitFor({timeout: 20000}).catch(() => {});
    await page.waitForTimeout(1500);
    await wiz.getByRole('button', {name: 'Continue', exact: true}).click();
    await idle(page); await page.waitForTimeout(1500);
    const step2 = flat(await wiz.innerText().catch(() => ''), 600);
    await wiz.getByRole('button', {name: 'Continue', exact: true}).click();
    await idle(page); await page.waitForTimeout(1500);
    const step3 = flat(await wiz.innerText().catch(() => ''), 600);
    await wiz.getByRole('button', {name: 'Complete', exact: true}).click();
    await idle(page); await page.waitForTimeout(2000);
    const filesInForm = flat(await form.locator('[id^="component-grid-files-query"]').first().innerText().catch(() => null), 300);
    record('r35-add-filled', await screen(page));
    const resp = page.waitForResponse((r) => /update-?query/i.test(r.url()), {timeout: 30000}).catch(() => null);
    await form.getByRole('button', {name: /^(Save|OK)$/}).last().click();
    const r = await resp;
    await page.waitForTimeout(1500);
    await idle(page);
    return {genre: pick, step2, step3, filesInForm, status: r ? r.status() : null};
}

module.exports = {WORDS, flat, helpers, Q, addQuery35};
