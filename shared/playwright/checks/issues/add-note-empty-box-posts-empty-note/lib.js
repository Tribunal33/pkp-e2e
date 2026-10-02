// Helpers of the U36 A10 / U38 A2 walk (issue report
// docs/issues/U36-A10-add-note-empty-box-posts-empty-note.md). Runs nothing when required.
const {idle, screen, record, shot, sql} = require('../../../probe');

const flat = (s, n = 400) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
exports.flat = flat;

/** Per app: the submission the steps open, the list its file sits in and the row's text. */
exports.CASES = {
    ojs: {submissionId: 4, row: 'Computer Skill Requirements'},
    omp: {submissionId: 3, row: 'chapter1.pdf'},
    ops: {submissionId: 1, row: 'PDF', galleys: true},
};

/** The workflow window (itself a dialog over the dashboard). */
const workflow = (page) => page.getByRole('dialog').filter({has: page.locator('[data-cy="sidemodal-header"]')}).first();
exports.workflow = workflow;

/** The window on top (a legacy side window over the workflow). */
const top = (page) => page.locator('[role="dialog"]:visible').last();

/** Open a submission's workflow from the dashboard's address. */
exports.openWorkflow = async function openWorkflow(page, app, submissionId) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${Number(submissionId)}`));
    await workflow(page).locator('[data-cy="sidemodal-header"]').waitFor({timeout: 60_000});
    await page.waitForFunction(() => !/Loading|Refreshing data/.test((document.querySelector('[data-cy="sidemodal-header"]') || {}).innerText || ''), null, {timeout: 20_000}).catch(() => {});
    await idle(page);
};

/** A preprint's "Galleys" in the workflow's side menu. Returns how it was reached. */
exports.openGalleys = async function openGalleys(page) {
    const wf = workflow(page);
    const item = wf.locator('nav a, nav button, [data-cy="workflow-side-nav"] a, [data-cy="workflow-side-nav"] button, a, button').filter({hasText: /^\s*Galleys\s*$/}).first();
    await item.waitFor({timeout: 30_000});
    await item.click();
    await wf.locator('tbody tr').filter({hasText: 'PDF'}).first().waitFor({timeout: 30_000});
    await idle(page);
    return 'side menu';
};

/** The file row's menu > "More Information"; returns the window's title. */
exports.openMoreInformation = async function openMoreInformation(page, rowText) {
    const wf = workflow(page);
    const row = wf.locator('tbody tr').filter({hasText: rowText}).first();
    await row.waitFor({timeout: 30_000});
    let button = row.locator('button[aria-haspopup="menu"]');
    if (!(await button.count())) {
        button = row.getByRole('button');
    }
    await button.last().click();
    const item = page.getByRole('menuitem', {name: 'More Information', exact: true}).first();
    await item.waitFor({timeout: 15_000});
    await item.click();
    const win = page.getByRole('dialog').filter({hasText: /Information Center/}).last();
    await win.waitFor({timeout: 30_000});
    await idle(page);
    return flat(await win.getByRole('heading', {level: 1}).first().innerText().catch(() => ''));
};

/** The header's "Activity Log"; returns the window's title. */
exports.openActivityLog = async function openActivityLog(page) {
    await workflow(page).getByRole('button', {name: /Activity Log/}).first().click();
    const win = page.getByRole('dialog').filter({hasText: /Activity Log & Notes/}).last();
    await win.waitFor({timeout: 30_000});
    await idle(page);
    return flat(await win.getByRole('heading', {level: 1}).first().innerText().catch(() => ''));
};

/** Open a tab of the window on top. */
async function openTab(page, name) {
    const win = top(page);
    await win.getByRole('tab', {name, exact: true}).first().click();
    await idle(page);
}

/** "Notes" as shown: the notes of the list (writer, date, text, height, "Delete"), the empty line, the box and what sits at it. */
async function readNotes(page) {
    return page.evaluate(() => {
        const vis = (e) => e.getClientRects().length > 0;
        const root = document.querySelector('#informationCenterNotes');
        if (!root) {
            return {absent: true};
        }
        const list = root.querySelector(':scope > .pkp_notes_list') || root.querySelector('.pkp_notes_list');
        const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const form = root.querySelector('#newNoteForm');
        const box = form && form.querySelector('textarea[name="newNote"]');
        return {
            notes: [...list.querySelectorAll('.note')].map((n) => ({
                writer: txt(n.querySelector('.user')),
                date: txt(n.querySelector('.date')),
                text: txt(n.querySelector('.message')),
                textHeight: Math.round((n.querySelector('.message') || n).getBoundingClientRect().height),
                del: [...n.querySelectorAll('button')].filter(vis).map((b) => b.innerText.trim()),
            })),
            emptyLine: txt([...list.querySelectorAll('.no_notes')].filter(vis)[0]),
            box: box ? {value: box.value, classes: box.className.trim(), required: box.required} : null,
            atBox: form ? [...form.querySelectorAll('label.error, .error, .pkp_form_error')].filter((e) => vis(e) && e !== box).map(txt).filter(Boolean) : [],
            button: form ? [...form.querySelectorAll('button')].filter(vis).map((b) => b.innerText.trim()) : [],
        };
    });
}
exports.readNotes = readNotes;

/** "Notes" opened and read. */
exports.openNotes = async function openNotes(page) {
    await openTab(page, 'Notes');
    await page.locator('#newNoteForm textarea[name="newNote"]').waitFor({timeout: 30_000});
    await idle(page);
    return readNotes(page);
};

/**
 * Type `text` (nothing for an empty box) and press "Add Note". Returns whether a save was sent and
 * its answer, the page notices that followed, and "Notes" as shown afterwards.
 */
exports.addNote = async function addNote(page, text, label) {
    const box = page.locator('#newNoteForm textarea[name="newNote"]');
    if (text) {
        await box.fill(text);
    }
    const sent = page.waitForResponse((r) => r.url().includes('save-note'), {timeout: 6_000}).catch(() => null);
    await page.locator('#newNoteForm').getByRole('button', {name: 'Add Note', exact: true}).click();
    const response = await sent;
    let answer = null;
    if (response) {
        const body = await response.text().catch(() => '');
        let json = null;
        try { json = JSON.parse(body); } catch (e) { /* not JSON */ }
        answer = {status: response.status(), jsonStatus: json ? json.status : null, events: json && json.events ? json.events.map((e) => e.name) : null, posted: flat(response.request().postData(), 200).replace(/csrfToken=[^&]+/, 'csrfToken=…')};
    }
    await page.waitForTimeout(1_500);
    await idle(page);
    const shown = await screen(page);
    record(label, shown);
    await shot(page, label).catch(() => {});
    return {sent: !!response, answer, notices: shown.notices, notes: await readNotes(page)};
};

/** "History" opened: its lines as {date, user, event}, newest first. */
exports.openHistory = async function openHistory(page, label) {
    await openTab(page, 'History');
    const win = top(page);
    await win.locator('tr.gridRow, tbody.empty:visible').first().waitFor({timeout: 30_000}).catch(() => {});
    await idle(page);
    const lines = await win.locator('tbody tr.gridRow').evaluateAll((rows) =>
        rows.filter((tr) => tr.getClientRects().length).map((tr) => {
            const cells = [...tr.querySelectorAll('td')].map((td) => {
                const c = td.cloneNode(true);
                c.querySelectorAll('script, a.show_extras').forEach((x) => x.remove());
                return c.textContent.replace(/\s+/g, ' ').trim();
            });
            return {date: cells[0], user: cells[1], event: cells[2]};
        })
    );
    if (label) {
        record(label, await screen(page));
    }
    return lines;
};

/** The first note's "Delete", then the question's "OK". Returns the question and "Notes" afterwards. */
exports.deleteFirstNote = async function deleteFirstNote(page, label) {
    await page.locator('#informationCenterNotes .note').first().getByRole('button', {name: 'Delete', exact: true}).click();
    const ask = page.getByRole('dialog').filter({hasText: 'Are you sure you wish to delete this note?'}).last();
    await ask.waitFor({timeout: 15_000});
    const question = flat(await ask.innerText());
    const gone = page.waitForResponse((r) => r.url().includes('delete-note'), {timeout: 15_000}).catch(() => null);
    await ask.getByRole('button', {name: 'OK', exact: true}).click();
    const response = await gone;
    await page.waitForTimeout(1_500);
    await idle(page);
    const shown = await screen(page);
    record(label, shown);
    return {question, status: response ? response.status() : null, notices: shown.notices, notes: await readNotes(page)};
};

/** Close the window on top with its own "Close". */
exports.closeTop = async function closeTop(page) {
    const win = top(page);
    await win.getByRole('button', {name: 'Close', exact: true}).first().click();
    await page.waitForTimeout(1_000);
    await idle(page);
};

/** The notes as stored: note id|assoc type|assoc id|writer|contents ("<empty>" for no text). */
exports.storedNotes = function storedNotes(app) {
    return sql(
        app,
        `select n.note_id, n.assoc_type, n.assoc_id, u.username, case when coalesce(n.contents, '') = '' then '<empty>' else n.contents end from notes n left join users u on u.user_id = n.user_id order by n.note_id`
    ).split('\n').filter(Boolean);
};

/** The "Posted new note." log entries as stored: log id|assoc type|assoc id|username. */
exports.storedLog = function storedLog(app) {
    return sql(
        app,
        `select e.log_id, e.assoc_type, e.assoc_id, u.username from event_log e left join users u on u.user_id = e.user_id where e.message = 'informationCenter.history.notePosted' order by e.log_id`
    ).split('\n').filter(Boolean);
};
