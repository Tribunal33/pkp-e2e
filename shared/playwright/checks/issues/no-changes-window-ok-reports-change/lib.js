// Helpers of the U35 A12 walk (issue report
// docs/issues/U35-A12-no-changes-window-ok-reports-change.md). Runs nothing when required.
// The panel, its row menus and the stored rows come from the neighbouring A1 walk's helpers; the
// windows from the suite's page objects.
const {idle, screen, record, sql} = require('../../../probe');
const A1 = require('../section-editor-edit-assignment-saves-nothing/lib.js');

const T = 30_000;
const NO_CHANGES = 'No changes can be made to this participant';

/**
 * Per app, on PKP's default test dataset: a submission, and the manager-level role Daniel Barnes
 * holds there. `assign` is true where the dataset does not assign him (the preprint server), so the
 * steps assign him first.
 */
exports.CASES = {
    ojs: {submissionId: 4, name: 'Daniel Barnes', role: 'Journal editor', assign: false},
    omp: {submissionId: 4, name: 'Daniel Barnes', role: 'Press editor', assign: false},
    ops: {submissionId: 1, name: 'Daniel Barnes', role: 'Preprint Server manager', assign: true},
};

exports.NO_CHANGES = NO_CHANGES;
exports.openWorkflow = A1.openWorkflow;
exports.rowLines = A1.rowLines;
exports.stored = A1.stored;

/** "Assign", the role, "Search", the person, "OK" (the boxes left as the window sets them). */
exports.assign = async function assign(page, app, {submissionId, name, role}) {
    const {ParticipantsPanel} = require('../../../pages/StageParticipantsPages.js');
    await exports.openWorkflow(page, app, submissionId);
    const panel = new ParticipantsPanel(page, app.contextPath);
    const win = await panel.openAssign();
    await idle(page);
    await win.chooseRole(role);
    await win.search();
    await win.choosePerson(name);
    await win.ok();
    return (await screen(page)).notices;
};

function editWindow(page) {
    return page.getByRole('dialog', {name: 'Edit Assignment', exact: true});
}

/**
 * Row menu > "Edit" on a page landed afresh: the window's text, its boxes and its buttons (each
 * with whether it can be pressed). Leaves the window open and returns it.
 */
exports.openEdit = async function openEdit(page, app, {submissionId, name, label}) {
    await exports.openWorkflow(page, app, submissionId);
    const out = {row: await exports.rowLines(page, name)};
    const row = page.locator('[data-cy="workflow-secondary-items"] li').filter({has: page.getByText(name, {exact: true})}).first();
    await row.locator('button[aria-haspopup="menu"]').click();
    await page.getByRole('menuitem').first().waitFor({timeout: T});
    out.offered = (await page.getByRole('menuitem').allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim());
    await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
    const win = editWindow(page);
    // The form's "Cancel" is there in every variant of the window.
    await win.getByRole('link', {name: 'Cancel', exact: true}).waitFor({timeout: T});
    await idle(page);
    out.text = (await win.locator('form').innerText()).replace(/\n\s*\n+/g, '\n').trim();
    out.saysNoChanges = out.text.includes(NO_CHANGES);
    out.boxes = {};
    for (const box of ['recommendOnly', 'canChangeMetadata']) {
        const input = win.locator(`input[name="${box}"]`);
        if (await input.count()) {
            out.boxes[box] = await input.isChecked();
        }
    }
    out.buttons = await win.locator('form .formButtons').locator('a, button').evaluateAll((els) =>
        els.map((el) => ({label: el.textContent.replace(/\s+/g, ' ').trim(), disabled: !!el.disabled}))
    );
    record(`${label}-window`, await screen(page));
    return {out, win};
};

/**
 * Press the open window's "OK" when it can be pressed: the save's answer, the notices shown and
 * whether the window closed. With "OK" absent or disabled it presses "Cancel" and says so.
 */
exports.pressOk = async function pressOk(page, win, label) {
    const out = {};
    const ok = win.getByRole('button', {name: 'OK', exact: true});
    out.okOffered = (await ok.count()) > 0 && (await ok.isEnabled());
    if (!out.okOffered) {
        await win.getByRole('link', {name: 'Cancel', exact: true}).click();
        await win.waitFor({state: 'detached', timeout: T});
        await page.waitForTimeout(2_000);
        out.notices = (await screen(page)).notices;
        return out;
    }
    const answered = page.waitForResponse((r) => r.url().includes('save-participant'), {timeout: T});
    await ok.click();
    const response = await answered;
    const body = await response.text().catch(() => '');
    let json = null;
    try {
        json = JSON.parse(body);
    } catch (e) {
        // not JSON: keep the head of the body
    }
    out.save = {
        status: response.status(),
        jsonStatus: json ? json.status : null,
        event: json && json.event ? json.event.name || json.event : null,
        contentIsForm: json ? /<form/.test(String(json.content || '')) : null,
        head: json ? null : body.slice(0, 300),
    };
    await page.waitForTimeout(2_000);
    await idle(page);
    const shown = await screen(page);
    record(`${label}-after-ok`, shown);
    out.notices = shown.notices;
    out.windowClosed = (await win.count()) === 0;
    return out;
};

/** How many Activity Log entries the submission holds (the save writes one per "OK"). */
exports.logEntries = function logEntries(app, submissionId) {
    return Number(sql(app, `select count(*) from event_log where assoc_type = 1048585 and assoc_id = ${Number(submissionId)}`).trim());
};
