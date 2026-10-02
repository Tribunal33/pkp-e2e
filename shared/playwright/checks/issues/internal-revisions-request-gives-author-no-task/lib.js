// Helpers of walk.js (U71 OMP1: no task for the author after "Request Revisions" on Internal
// Review; docs/issues/U71-OMP1-internal-revisions-request-gives-author-no-task.md).
// Requiring this file runs nothing. The workflow opener and the upload helpers are
// ../author-revisions-upload-offered-then-refused/lib.js's and
// ../author-update-file-details-offered-then-refused/lib.js's.
const {idle, sql, settled} = require('../../../probe');
const L = require('../author-update-file-details-offered-then-refused/lib.js');
const W = require('../change-file-keeps-first-upload/lib.js');

const T = 60_000;

/** The workflow window (the page's first dialog). */
const workflow = (page) => page.locator('[role="dialog"]').first();

/** A decision button of the open workflow, by its label. */
const decisionButton = (page, label) => page.getByRole('button', {name: label, exact: true});

/** As an editor, open the submission's workflow from the dashboard's address and wait for `button`. Returns the stage the window names. */
async function openEditorial(page, app, id, button = 'Request Revisions') {
    await page.goto('about:blank');
    await W.openWorkflow(page, app, id);
    await page.locator('[data-cy="sidemodal-header"]').first().waitFor({timeout: T});
    await decisionButton(page, button).first().waitFor({state: 'visible', timeout: T});
    await idle(page);
    return {
        header: L.flat(await page.locator('[data-cy="sidemodal-header"]').first().innerText().catch(() => null), 200),
        buttons: (await page.locator('[data-cy="workflow-actions-items"] button:visible, [data-cy="workflow-action-items"] button:visible').allInnerTexts().catch(() => [])).map((x) => L.flat(x, 40)),
    };
}

/**
 * Take the decision wizard that is open (or opens after an entry window's "Next") to "Record
 * Decision" and wait for its closing panel. Returns the entry window's text (null when the
 * decision opened its wizard at once), the wizard's step headings and the decision request's
 * status.
 */
async function recordDecision(page, label) {
    const out = {entry: null, steps: [], request: null};
    const onResponse = (r) => {
        if (/\/decisions(\?|$)/.test(r.url()) && r.request().method() === 'POST') out.request = {status: r.status()};
    };
    page.on('response', onResponse);
    await decisionButton(page, label).first().click();
    const entry = page.getByRole('dialog').filter({hasText: 'Require New Review Round'});
    const heading = page.locator('h1').filter({hasText: label});
    await entry.or(heading).first().waitFor({timeout: T});
    if (await entry.count()) {
        out.entry = L.flat(await entry.first().innerText(), 300);
        await entry.getByRole('button', {name: 'Next'}).click();
    }
    await heading.first().waitFor({timeout: T});
    const done = page.getByText('View Submission Summary');
    for (let i = 0; i < 8 && !(await done.count()); i++) {
        await idle(page);
        if (await page.getByText('Email Templates').count()) {
            // the letter's body arrives after the step shows
            await page.locator('.composer__loadingTemplateMask').waitFor({state: 'hidden', timeout: 30_000}).catch(() => {});
            await settled(page, page.frameLocator('iframe.tox-edit-area__iframe').last().locator('body'));
        }
        out.steps.push(L.flat(await page.locator('h1').first().innerText().catch(() => null), 120));
        const record = page.getByRole('button', {name: /^Record (Editorial )?Decision$/});
        if (await record.count()) {
            await record.first().click();
            await done.first().waitFor({timeout: T});
            break;
        }
        await page.getByRole('button', {name: 'Continue', exact: true}).click();
        await L.sleep(400);
    }
    await idle(page);
    out.closing = L.flat(await L.topWindow(page).innerText().catch(() => null), 300);
    page.off('response', onResponse);
    return out;
}

/**
 * As the signed-in author: "My Submissions", the row of submission `id`, then the header's
 * "Tasks": the button's text, what the panel lists and where its links lead.
 */
async function authorSees(page, app, id) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/mySubmissions`));
    await idle(page);
    const row = page.locator('tr').filter({has: page.getByRole('cell', {name: String(id), exact: true})}).first();
    const out = {row: L.flat(await row.innerText().catch(() => null), 300)};
    const button = page.getByRole('button', {name: /^Tasks/}).first();
    out.header = L.flat(await button.innerText().catch(() => null), 30);
    await button.click();
    await idle(page);
    const panel = L.topWindow(page);
    await panel.getByRole('table').first().waitFor({state: 'visible', timeout: 20_000}).catch(() => {});
    await settled(page, panel);
    out.panel = L.flat(await panel.innerText().catch(() => null), 500);
    out.links = await panel.locator('table a[href]').evaluateAll((as) => as.map((a) => ({text: a.innerText.replace(/\s+/g, ' ').trim().slice(0, 120), href: a.getAttribute('href').replace(/^https?:\/\/[^/]+/, '')})).filter((a) => a.text)).catch(() => []);
    return out;
}

/** The task and notice records the author holds on the submission, as stored: id, type (hex), level. */
function stored(app, username, id) {
    const rows = sql(app, `select n.notification_id, n.type, n.level from notifications n join users u on u.user_id = n.user_id
        where u.username = '${username}' and n.assoc_type = 1048585 and n.assoc_id = ${Number(id)} order by 1`);
    return rows ? rows.split('\n').map((l) => { const [nid, type, level] = l.split('|').map(Number); return {id: nid, type: `0x${type.toString(16)}`, level}; }) : [];
}

/** The submission's decisions as stored, oldest first: decision, stage, round. */
function decisions(app, id) {
    const rows = sql(app, `select decision, stage_id, round from edit_decisions where submission_id = ${Number(id)} order by edit_decision_id`);
    return rows ? rows.split('\n').map((l) => { const [decision, stageId, round] = l.split('|').map(Number); return {decision, stageId, round}; }) : [];
}

module.exports = {T, workflow, decisionButton, openEditorial, recordDecision, authorSees, stored, decisions};
