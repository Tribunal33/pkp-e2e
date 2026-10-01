// Helpers of the U35 A1 walk and its neighbour check (issue report
// docs/issues/U35-A1-section-editor-edit-assignment-saves-nothing.md). Runs nothing when required.
const {idle, screen, record, sql} = require('../../../probe');

/** The submission each app's steps open, its Author and, where the dataset assigns one, a second editor. */
exports.CASES = {
    ojs: {submissionId: 4, stageId: 1, author: 'Craig Montgomerie', editor: 'Stephanie Berardo', manager: 'Daniel Barnes', own: 'David Buskins'},
    omp: {submissionId: 1, stageId: 4, author: 'Arthur Clark', editor: null, manager: null, own: 'David Buskins'},
    ops: {submissionId: 1, stageId: 5, author: 'Carlo Corino', editor: 'Stephanie Berardo', manager: null, own: 'David Buskins'},
};

const PANEL = '[data-cy="workflow-secondary-items"]';

/** Open the submission's workflow from the editorial dashboard's address and wait for "Participants". */
exports.openWorkflow = async function openWorkflow(page, app, submissionId) {
    // Leave the page first: a goto that changes only the query of the page already open reloads nothing.
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${submissionId}`));
    await page.locator(`${PANEL} h3`).filter({hasText: /^\s*Participants\s*$/i}).waitFor({timeout: 60_000});
    await idle(page);
};

function row(page, name) {
    return page.locator(`${PANEL} li`).filter({has: page.getByText(name, {exact: true})});
}

/** A row's lines as shown (name, role, the recommend-only line when set). */
exports.rowLines = async function rowLines(page, name) {
    const text = await row(page, name).first().innerText();
    return text.split('\n').map((s) => s.trim()).filter((s) => s && !/More Actions$/.test(s));
};

/** The labels a row's "More Actions" menu offers; leaves the menu open. */
async function openMenu(page, name) {
    await row(page, name).first().locator('button[aria-haspopup="menu"]').click();
    await page.getByRole('menuitem').first().waitFor({timeout: 30_000});
    return (await page.getByRole('menuitem').allTextContents()).map((t) => t.replace(/\s+/g, ' ').trim());
}

/** A row's menu labels, the menu closed again by its own button. */
exports.menuLabels = async function menuLabels(page, name) {
    const labels = await openMenu(page, name);
    await row(page, name).first().locator('button[aria-haspopup="menu"]').click();
    await page.getByRole('menuitem').first().waitFor({state: 'detached', timeout: 30_000});
    return labels;
};

function editWindow(page) {
    return page.getByRole('dialog', {name: 'Edit Assignment', exact: true});
}

async function openEdit(page, name) {
    const offered = await openMenu(page, name);
    if (!offered.includes('Edit')) {
        return {offered, win: null};
    }
    await page.getByRole('menuitem', {name: 'Edit', exact: true}).click();
    const win = editWindow(page);
    await win.getByRole('button', {name: 'OK', exact: true}).waitFor({timeout: 30_000});
    await idle(page);
    return {offered, win};
}

/** The window's boxes as {name: checked}, absent boxes left out. */
async function boxes(win) {
    const out = {};
    for (const name of ['recommendOnly', 'canChangeMetadata']) {
        const box = win.locator(`input[name="${name}"]`);
        if (await box.count()) {
            out[name] = await box.isChecked();
        }
    }
    return out;
}

/**
 * Row menu > "Edit", change one box, "OK"; then what the screen shows, the save's answer, and the
 * state "Edit" shows on a page landed afresh. `box` is `canChangeMetadata` ("Permissions") or
 * `recommendOnly` ("Assignment privileges").
 */
exports.editBox = async function editBox(page, app, {submissionId, name, box, label}) {
    const out = {name, box};
    await exports.openWorkflow(page, app, submissionId);
    out.rowBefore = await exports.rowLines(page, name);
    const {offered, win} = await openEdit(page, name);
    out.offered = offered;
    if (!win) {
        return out;
    }
    out.windowText = (await win.locator('form').innerText()).replace(/\n\s*\n+/g, '\n').trim();
    out.before = await boxes(win);
    record(`${label}-1-window`, await screen(page));
    await win.locator(`input[name="${box}"]`).setChecked(!out.before[box]);
    out.posted = !out.before[box];
    const answered = page.waitForResponse((r) => r.url().includes('save-participant'), {timeout: 30_000});
    await win.getByRole('button', {name: 'OK', exact: true}).click();
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
    record(`${label}-2-after-ok`, shown);
    out.notices = shown.notices;
    out.windowStillOpen = (await win.count()) > 0 && (await win.getByRole('button', {name: 'OK', exact: true}).isVisible());
    if (out.windowStillOpen) {
        out.afterOk = await boxes(win);
        out.windowTextAfterOk = (await win.locator('form').innerText()).replace(/\n\s*\n+/g, '\n').trim();
        await win.getByRole('link', {name: 'Cancel', exact: true}).click();
        await win.waitFor({state: 'detached', timeout: 30_000});
    }
    // A page landed afresh: the row and what "Edit" shows now.
    await exports.openWorkflow(page, app, submissionId);
    out.rowAfter = await exports.rowLines(page, name);
    const again = await openEdit(page, name);
    out.reopened = await boxes(again.win);
    record(`${label}-3-reopened`, await screen(page));
    await again.win.getByRole('link', {name: 'Cancel', exact: true}).click();
    await again.win.waitFor({state: 'detached', timeout: 30_000});
    out.saved = out.reopened[box] === out.posted;
    return out;
};

/** The submission's assignments as stored: username|role id|recommend_only|can_change_metadata. */
exports.stored = function stored(app, submissionId) {
    return sql(
        app,
        `select u.username, ug.role_id, sa.recommend_only, sa.can_change_metadata from stage_assignments sa join users u on u.user_id = sa.user_id join user_groups ug on ug.user_group_id = sa.user_group_id where sa.submission_id = ${Number(submissionId)} order by sa.stage_assignment_id`
    ).split('\n');
};

/**
 * The server's own answer per row, read at the legacy participants grid's address (no screen opens
 * it on main; a typed address): the usernames' rows that carry an "Edit" link.
 */
exports.legacyGridEditLinks = async function legacyGridEditLinks(page, app, {submissionId, stageId}) {
    const url = app.url(
        `/index.php/${app.contextPath}/$$$call$$$/grid/users/stage-participant/stage-participant-grid/fetch-grid?submissionId=${submissionId}&stageId=${stageId}`
    );
    const response = await page.goto(url);
    const body = await response.text();
    let content = '';
    try {
        content = String(JSON.parse(body).content || '');
    } catch (e) {
        return {status: response.status(), head: body.slice(0, 300)};
    }
    const rows = await page.evaluate((html) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return [...doc.querySelectorAll('tr.gridRow')].map((tr) => {
            const next = tr.nextElementSibling;
            const links = [...tr.querySelectorAll('a'), ...(next && !next.classList.contains('gridRow') ? next.querySelectorAll('a') : [])];
            return {
                row: tr.innerText || tr.textContent.replace(/\s+/g, ' ').trim(),
                actions: links.map((a) => a.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean),
            };
        });
    }, content);
    return {status: response.status(), rows: rows.map((r) => ({row: r.row.replace(/\s+/g, ' ').trim(), actions: r.actions}))};
};
