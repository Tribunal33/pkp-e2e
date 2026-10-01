// Helpers of walk.js and neighbour.js here (issue report
// docs/issues/U35-A4-assign-participant-ok-assigns-nobody-no-reason.md). Requiring this file runs
// nothing. Every helper drives the workflow's "Participants" panel and its "Assign Participant"
// window as a person does.
const {idle, screen, record, sql} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Per app, on PKP's default test dataset (docs/process/dataset.md): a submission Minoti Inoue is not assigned to. */
const CASES = {
    ojs: {id: 4, role: 'Section editor', person: 'Minoti Inoue', otherRole: 'Author', author: 'Craig Montgomerie'},
    omp: {id: 3, role: 'Series editor', person: 'Minoti Inoue', otherRole: 'Author', author: 'Bob Barnetson'},
    ops: {id: 1, role: 'Moderator', person: 'Minoti Inoue', otherRole: 'Author', author: 'Carlo Corino'},
};

/** Open the submission's workflow from the editorial dashboard's address; returns the Participants panel. */
async function openWorkflow(page, app, id) {
    const {ParticipantsPanel} = require('../../../pages/StageParticipantsPages.js');
    const panel = new ParticipantsPanel(page, app.contextPath);
    // Leave the page first: a goto that changes only the query of the page already open reloads nothing.
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${id}`));
    await panel.heading().waitFor({timeout: 60_000});
    await idle(page);
    return panel;
}

/** What the "Assign Participant" window shows now: the role chosen, the people listed, the one chosen, any message. */
async function windowState(page, win) {
    const out = {open: await win.roleSelect().isVisible().catch(() => false)};
    if (!out.open) return out;
    out.role = await win.selectedRole();
    out.people = await win.peopleNames();
    out.chosen = await win
        .people()
        .evaluateAll((rows) =>
            rows
                .filter((tr) => tr.querySelector('input[name="userId"]').checked)
                .map((tr) => (tr.querySelectorAll('td')[1]?.textContent || '').replace(/\s+/g, ' ').trim())
        );
    // every element a legacy form marks as an error or a message, with its text
    out.messages = await win.root
        .locator('.error:visible, label.error:visible, .pkp_form_error:visible, .pkp_notification:visible, [role="alert"]:visible, #formErrors')
        .evaluateAll((els) => els.map((e) => (e.innerText || '').replace(/\s+/g, ' ').trim()).filter(Boolean));
    out.text = flat(await win.root.locator('form#addParticipantForm').innerText(), 4000);
    return out;
}

/**
 * Press the window's "OK" and read: what the form posted (role and person), the save's answer, the
 * notices, and the window as shown two seconds later.
 */
async function pressOk(page, win, label) {
    const out = {};
    const asked = page.waitForRequest((r) => r.url().includes('save-participant'), {timeout: T});
    const answered = page.waitForResponse((r) => r.url().includes('save-participant'), {timeout: T});
    await win.root.getByRole('button', {name: 'OK', exact: true}).click();
    const post = new URLSearchParams((await asked).postData() || '');
    out.posted = {userGroupId: post.get('userGroupId'), userId: post.get('userId'), userIdSelected: post.get('userIdSelected')};
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
        head: json ? null : flat(body, 300),
    };
    await page.waitForTimeout(2_000);
    await idle(page);
    const shown = await screen(page);
    record(`${label}-after-ok`, shown);
    out.notices = (shown.notices || []).map((n) => flat(n.text || n));
    out.window = await windowState(page, win);
    return out;
}

/** The submission's assignments as stored: username|role name id. */
function stored(app, id) {
    return sql(
        app,
        `select u.username, sa.user_group_id from stage_assignments sa join users u on u.user_id = sa.user_id where sa.submission_id = ${Number(id)} order by sa.stage_assignment_id`
    )
        .split('\n')
        .filter(Boolean);
}

/** The option values of the window's role list, by label (to read what a post named). */
async function roleIds(win) {
    return win.roleSelect().evaluate((s) => Object.fromEntries([...s.options].map((o) => [o.text.trim(), o.value])));
}

module.exports = {T, flat, CASES, openWorkflow, windowState, pressOk, stored, roleIds};
