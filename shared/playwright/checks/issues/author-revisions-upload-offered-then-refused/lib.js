// Helpers of walk.js (U36 A7: the Author's "Upload" above "Revisions Uploaded" on a round that asks
// for no revisions; docs/issues/U36-A7-author-revisions-upload-offered-then-refused.md).
// Requiring this file runs nothing. The upload wizard's helpers are
// ../change-file-keeps-first-upload/lib.js's, the row and window helpers
// ../author-update-file-details-offered-then-refused/lib.js's.
const {idle, sql, settled} = require('../../../probe');
const W = require('../change-file-keeps-first-upload/lib.js');
const L = require('../author-update-file-details-offered-then-refused/lib.js');

const LIST = 'Revisions Uploaded';
const REFUSAL = 'You are not allowed to add and edit these files.';

/** The table named "Revisions Uploaded". */
const listTable = (page) => page.getByRole('table', {name: LIST, exact: true});

/**
 * Collect, from now on, the review rounds every submission answer of the page carries (id, stage,
 * statusId, status), newest last: what the screen's buttons are decided from.
 */
function watchRounds(page) {
    const seen = [];
    page.on('response', async (r) => {
        if (!/\/api\/v1\/(_?submissions)\/\d+(\?|$)/.test(r.url()) || r.request().method() !== 'GET') return;
        const body = await r.json().catch(() => null);
        if (body && Array.isArray(body.reviewRounds)) {
            seen.push(body.reviewRounds.map((x) => ({id: x.id, stageId: x.stageId, round: x.round, statusId: x.statusId, status: x.status})));
        }
    });
    return {last: () => (seen.length ? seen[seen.length - 1] : null)};
}

/** The submission's review rounds as stored: id, stage, round, stored status. */
function storedRounds(app, submissionId) {
    const rows = sql(app, `select review_round_id, stage_id, round, status from review_rounds where submission_id = ${Number(submissionId)} order by 1`);
    return rows ? rows.split('\n').map((l) => { const [id, stageId, round, status] = l.split('|').map(Number); return {id, stageId, round, status}; }) : [];
}

/**
 * Open the submission's workflow from the dashboard's address ("My Submissions" for an author),
 * on the review round `round` ({id, stageId}) when given, else where the workflow opens.
 */
async function openWorkflow(page, app, id, {author = false, round = null} = {}) {
    await page.goto('about:blank');
    await W.openWorkflow(page, app, id, round ? `workflow_${round.stageId}_${round.id}` : undefined, author ? 'mySubmissions' : 'editorial');
    await page.locator('[data-cy="sidemodal-header"]').first().waitFor({timeout: 60_000});
    await listTable(page).first().waitFor({state: 'visible', timeout: 60_000});
    await idle(page);
}

/** What the round's page offers for uploading: the "Upload revisions" button, "Upload" above the list, the list's rows. */
async function offers(page) {
    return {
        uploadRevisions: await page.getByRole('button', {name: /^Upload revisions$/i}).first().isVisible().catch(() => false),
        upload: await W.uploadButton(page, LIST).first().isVisible().catch(() => false),
        rows: await W.listRows(page, LIST).catch((e) => `threw ${L.flat(e.message, 120)}`),
    };
}

/**
 * Press `button` and say what opened: the upload wizard on its step 1 (`kind: 'wizard'`) or a
 * window with the refusal (`kind: 'refused'`), with the window's title, text and buttons and the
 * legacy requests the press sent.
 */
async function press(page, button) {
    const requests = [];
    const onResponse = async (r) => {
        if (!/\$\$\$call\$\$\$/.test(r.url())) return;
        requests.push({method: r.request().method(), url: r.url().replace(/^https?:\/\/[^/]+/, '').replace(/csrfToken=[^&]*/, 'csrfToken=…').slice(0, 260), status: r.status(), body: L.flat(await r.text().catch(() => null), 260)});
    };
    page.on('response', onResponse);
    await button.first().click();
    const box = page.locator('.pkp_controller_fileUpload');
    const refusal = page.getByText(REFUSAL);
    await box.or(refusal).first().waitFor({state: 'attached', timeout: W.T}).catch(() => {});
    await idle(page);
    const win = L.topWindow(page);
    await settled(page, win);
    const kind = (await refusal.count()) ? 'refused' : (await box.count()) ? 'wizard' : 'other';
    const out = {
        kind,
        title: L.flat(await win.locator('h1, h2').first().innerText().catch(() => null), 80),
        text: L.flat(await win.innerText().catch(() => null), 400),
        buttons: (await win.locator('button:visible, a.cancelButton:visible').allInnerTexts()).map((x) => L.flat(x, 40)).filter(Boolean),
        requests,
    };
    page.off('response', onResponse);
    return out;
}

/** The "Upload revisions" button under the round. */
const uploadRevisionsButton = (page) => page.getByRole('button', {name: /^Upload revisions$/i});

/** Press `button`, then take `file` through the upload window: the component, the file, "Continue", "Continue", "Complete". */
async function uploadThrough(page, button, component, file) {
    await button.first().click();
    await W.uploadBox(page).waitFor({state: 'attached', timeout: W.T});
    await idle(page);
    await W.wizard(page).locator('select[id^="genreId"]').selectOption({label: component});
    const uploaded = await W.pick(page, file);
    const done = await W.finish(page);
    return {uploaded: uploaded && (uploaded.id || uploaded.submissionFileId || uploaded), ...done};
}

/** On "My Submissions", press the header's "Tasks" and return the button's text and what the panel lists. */
async function tasks(page, app) {
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/mySubmissions`));
    await idle(page);
    const button = page.getByRole('button', {name: /^Tasks/}).first();
    const header = L.flat(await button.innerText().catch(() => null), 30);
    await button.click();
    await idle(page);
    const panel = L.topWindow(page);
    await settled(page, panel);
    return {header, panel: L.flat(await panel.innerText().catch(() => null), 500)};
}

module.exports = {uploadRevisionsButton, uploadThrough, tasks, LIST, REFUSAL, watchRounds, storedRounds, openWorkflow, offers, press, uploadButton: (page) => W.uploadButton(page, LIST), listTable};
