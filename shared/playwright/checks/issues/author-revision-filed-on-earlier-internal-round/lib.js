// Helpers of walk.js (U71 OMP8: while External Review asks for revisions, the author's "Upload" on
// the earlier internal round files the revision there;
// docs/issues/U71-OMP8-author-revision-filed-on-earlier-internal-round.md).
// Requiring this file runs nothing. The decision and table helpers are
// ../internal-round-revised-files-not-carried/lib.js's, the "Upload" press
// ../author-revisions-upload-offered-then-refused/lib.js's, the upload window's
// ../change-file-keeps-first-upload/lib.js's.
const fs = require('fs');
const os = require('os');
const path = require('path');
const {idle, sql} = require('../../../probe');
const W = require('../change-file-keeps-first-upload/lib.js');

/** A small PDF under `name` in a temp folder: {path, name}. */
function revisionFile(name) {
    const src = path.join(__dirname, '..', '..', '..', '..', '..', 'apps', 'ojs', 'playwright', 'fixtures', 'files', 'article.pdf');
    const p = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'u71d-')), name);
    fs.copyFileSync(src, p);
    return {path: p, name};
}

/** The open workflow's heading ("Workflow: Internal Review (Round 1)"). */
const workflowHeading = async (page) => {
    const h = page.locator('[role="dialog"]:visible').first().getByRole('heading', {name: /^Workflow:/}).first();
    return W.flat(await h.innerText().catch(() => null), 120);
};

/**
 * In the open workflow's side menu, press the round entry `round` under the stage entry `stage`
 * ("Internal Review" > "Review Round 1"). Returns the entry pressed and the heading that follows;
 * {pressed: null} when the menu has no such entry.
 */
async function chooseRound(page, stage, round) {
    const pressed = await page.evaluate(({stage, round}) => {
        const vis = (e) => e.getClientRects().length > 0;
        const root = [...document.querySelectorAll('[role=dialog]')].filter(vis)[0] || document.body;
        const own = (e) => e.innerText.replace(/\s+/g, ' ').trim();
        const entries = [...root.querySelectorAll('nav a, nav button, [data-cy="workflow-secondary-items"] a, [role="navigation"] a, [role="navigation"] button, .p-panelmenu a, .p-panelmenu button')].filter(vis);
        const at = entries.findIndex((e) => own(e) === stage);
        if (at < 0) return {pressed: null, entries: entries.map(own).slice(0, 40)};
        const re = new RegExp(`^(Review )?Round ${round}$`);
        const hit = entries.slice(at + 1).find((e) => re.test(own(e)));
        if (!hit) return {pressed: null, entries: entries.map(own).slice(0, 40)};
        hit.setAttribute('data-u71d-round', '1');
        return {pressed: own(hit), entries: entries.map(own).slice(0, 40)};
    }, {stage, round});
    if (pressed.pressed) {
        await page.locator('[data-u71d-round="1"]').first().click();
        await idle(page);
        await page.waitForTimeout(500);
        await idle(page);
    }
    return {...pressed, heading: await workflowHeading(page)};
}

/** With the upload window open on step 1: the component, the file, "Continue", "Continue", "Complete". */
async function throughUpload(page, component, file) {
    await W.uploadBox(page).waitFor({state: 'attached', timeout: W.T});
    await idle(page);
    await W.wizard(page).locator('select[id^="genreId"]').selectOption({label: component});
    const uploaded = await W.pick(page, file);
    const done = await W.finish(page);
    return {uploaded: uploaded && (uploaded.id || uploaded.submissionFileId || uploaded), ...done};
}

/** The submission's decisions as stored: id, round id, stage, decision, oldest first. */
function decisions(app, submissionId) {
    const rows = sql(app, `select edit_decision_id, coalesce(review_round_id::text, ''), stage_id, decision from edit_decisions where submission_id = ${Number(submissionId)} order by date_decided, 1`);
    return rows ? rows.split('\n').map((l) => { const [id, roundId, stageId, decision] = l.split('|'); return {id: Number(id), roundId, stageId: Number(stageId), decision: Number(decision)}; }) : [];
}

/** The notifications made since notification `after`: id, the user's name, type, what it hangs on. */
function notificationsSince(app, after) {
    const rows = sql(app, `select n.notification_id, coalesce(u.username, ''), n.type, n.assoc_type, n.assoc_id from notifications n left join users u on u.user_id = n.user_id where n.notification_id > ${Number(after)} order by 1`);
    return rows ? rows.split('\n') : [];
}
const lastNotificationId = (app) => Number(sql(app, 'select coalesce(max(notification_id), 0) from notifications'));

module.exports = {revisionFile, workflowHeading, chooseRound, throughUpload, decisions, notificationsSince, lastNotificationId};
