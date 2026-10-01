// Helpers of the U35 A14 and A7 walks (issue reports
// docs/issues/U35-A14-activity-log-names-participant-not-editor.md and
// docs/issues/U35-A7-edit-assignment-logged-as-assignment.md). Runs nothing when required.
// The "Participants" panel's helpers are the U35 A1 and A3 walks' own.
const {idle, screen, record, sql} = require('../../../probe');
const A1 = require('../section-editor-edit-assignment-saves-nothing/lib.js');
const A3 = require('../typed-participant-message-not-sent/lib.js');

/** Per app: the submission the steps open, its Author, the role and person the steps assign, and a submission whose log already holds an assignment line. */
exports.CASES = {
    ojs: {submissionId: 4, author: 'Craig Montgomerie', role: 'Section editor', person: 'Minoti Inoue', actor: 'Daniel Barnes', stored: 3},
    omp: {submissionId: 1, author: 'Arthur Clark', role: 'Series editor', person: 'Minoti Inoue', actor: 'Daniel Barnes', stored: 1},
    ops: {submissionId: 1, author: 'Carlo Corino', role: 'Moderator', person: 'Minoti Inoue', actor: 'Daniel Barnes', stored: 1},
};

exports.openWorkflow = A1.openWorkflow;
exports.editBox = A1.editBox;
exports.rowLines = A1.rowLines;

const PANEL = '[data-cy="workflow-secondary-items"]';

/** "Assign": choose the role, "Search", choose the person, leave the message alone, "OK". */
exports.assign = async function assign(page, {role, person, label}) {
    const win = await A3.openAssign(page);
    const listed = await A3.chooseRoleAndPerson(page, win, role, person);
    if (!listed) {
        return {listed};
    }
    const pressed = await A3.press(page, win, 'OK', /save-participant/, label);
    return {listed, status: pressed.status, windowOpen: pressed.windowOpen, notices: pressed.notices};
};

/** Row menu > "Remove", then the "Remove Participant" dialog's "OK". */
exports.remove = async function remove(page, name, label) {
    const row = page.locator(`${PANEL} li`).filter({has: page.getByText(name, {exact: true})}).first();
    await row.locator('button[aria-haspopup="menu"]').click();
    await page.getByRole('menuitem', {name: 'Remove', exact: true}).click();
    const dialog = page.getByRole('dialog', {name: 'Remove Participant', exact: true});
    await dialog.getByRole('button', {name: 'OK', exact: true}).waitFor({timeout: 30_000});
    const text = (await dialog.innerText()).replace(/\s+/g, ' ').trim();
    const answered = page.waitForResponse((r) => r.url().includes('delete-participant'), {timeout: 30_000});
    await dialog.getByRole('button', {name: 'OK', exact: true}).click();
    const response = await answered;
    await dialog.waitFor({state: 'detached', timeout: 30_000});
    await page.waitForTimeout(1_500);
    await idle(page);
    const shown = await screen(page);
    record(label, shown);
    return {dialog: text, status: response.status(), notices: shown.notices, stillListed: (await row.count()) > 0};
};

/** Press "Activity Log" and read "History": every line as {date, user, event}, newest first; then "Close". */
exports.history = async function history(page, label) {
    const fetched = page.waitForResponse((r) => r.url().includes('submission-event-log-grid/fetch-grid'), {timeout: 30_000});
    await page.locator('[role="dialog"]:visible').first().getByRole('button', {name: /Activity Log/}).first().click();
    await fetched;
    const win = page.getByRole('dialog', {name: 'Activity Log & Notes', exact: true});
    await win.locator('tbody tr.gridRow').first().waitFor({timeout: 30_000});
    await idle(page);
    const headers = (await win.locator('thead th').allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const lines = await win.locator('tbody tr.gridRow').evaluateAll((rows) =>
        rows.map((tr) => {
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
    await win.getByRole('button', {name: 'Close', exact: true}).first().click();
    await win.waitFor({state: 'detached', timeout: 30_000});
    return {headers, lines};
};

/** The submission's participant log entries as stored: log id|event type|acting username|setting names. */
exports.storedEntries = function storedEntries(app, submissionId) {
    return sql(
        app,
        `select e.log_id, e.event_type, u.username, e.message, (select string_agg(distinct s.setting_name, ',' order by s.setting_name) from event_log_settings s where s.log_id = e.log_id) from event_log e left join users u on u.user_id = e.user_id where e.assoc_type = 1048585 and e.assoc_id = ${Number(submissionId)} and e.event_type in (268435459, 268435460) order by e.log_id`
    ).split('\n').filter(Boolean);
};

/**
 * The statement the A14 fix's upgrade migration would run, for the neighbour check with the fix in:
 * the participant's name of the stored "assigned" and "removed" entries moves from `userFullName`
 * to `participantName`.
 */
exports.repairStoredEntries = function repairStoredEntries(app) {
    return sql(
        app,
        `update event_log_settings set setting_name = 'participantName' where setting_name = 'userFullName' and log_id in (select log_id from event_log where event_type in (268435459, 268435460))`
    );
};

/** Row menu > "Edit", then "OK" with no box touched; the notices that follow. */
exports.editNoChange = async function editNoChange(page, app, {submissionId, name, label}) {
    await exports.openWorkflow(page, app, submissionId);
    const row = page.locator(`${PANEL} li`).filter({has: page.getByText(name, {exact: true})}).first();
    await row.locator('button[aria-haspopup="menu"]').click();
    await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
    const win = page.getByRole('dialog', {name: 'Edit Assignment', exact: true});
    await win.getByRole('button', {name: 'OK', exact: true}).waitFor({timeout: 30_000});
    await idle(page);
    const answered = page.waitForResponse((r) => r.url().includes('save-participant'), {timeout: 30_000});
    await win.getByRole('button', {name: 'OK', exact: true}).click();
    const response = await answered;
    await page.waitForTimeout(2_000);
    await idle(page);
    const shown = await screen(page);
    record(label, shown);
    return {status: response.status(), notices: shown.notices};
};

/**
 * "History" as the server draws it in another language: the user switches language at the
 * language toggle's address, the log's grid is read at its own address (the one the "Activity Log"
 * window fetches), and the language is switched back. Lines as {user, event}, newest first.
 */
exports.historyIn = async function historyIn(page, app, submissionId, locale) {
    const base = `/index.php/${app.contextPath}`;
    await page.goto(app.url(`${base}/en/user/setLocale/${locale}`));
    const response = await page.goto(app.url(`${base}/$$$call$$$/grid/event-log/submission-event-log-grid/fetch-grid?submissionId=${Number(submissionId)}`));
    const body = await response.text();
    let lines;
    try {
        const content = String(JSON.parse(body).content || '');
        lines = await page.evaluate((html) => {
            const doc = new DOMParser().parseFromString(html, 'text/html');
            return [...doc.querySelectorAll('tr.gridRow')].map((tr) => {
                const cells = [...tr.querySelectorAll('td')].map((td) => {
                    const c = td.cloneNode(true);
                    c.querySelectorAll('script, a.show_extras').forEach((x) => x.remove());
                    return c.textContent.replace(/\s+/g, ' ').trim();
                });
                return {user: cells[1], event: cells[2]};
            });
        }, content);
    } catch (e) {
        lines = {status: response.status(), head: body.slice(0, 300)};
    }
    await page.goto(app.url(`${base}/${locale}/user/setLocale/en`));
    return lines;
};
