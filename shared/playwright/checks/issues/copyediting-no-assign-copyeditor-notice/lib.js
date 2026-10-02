// Helpers of walk.js (U71 OMP10 with U32 A6: no "Assign a copyeditor…" notice on Copyediting after
// "Accept and Skip Review" or a press's internal "Accept Submission";
// docs/issues/U71-OMP10-copyediting-no-assign-copyeditor-notice.md). Requiring this file runs nothing.
// The workflow and decision helpers are the U71 OMP2 walk's own.
const {idle, sql} = require('../../../probe');
const R = require('../internal-round-revised-files-not-carried/lib.js');

// Notification::NOTIFICATION_TYPE_ASSIGN_COPYEDITOR, _AWAITING_COPYEDITS, _ASSIGN_PRODUCTIONUSER, _AWAITING_REPRESENTATIONS
const TYPES = {16777251: 'ASSIGN_COPYEDITOR', 16777252: 'AWAITING_COPYEDITS', 16777254: 'ASSIGN_PRODUCTIONUSER', 16777255: 'AWAITING_REPRESENTATIONS'};

/** What the open workflow shows: its stage bubble and headings, and every framed notice box ({title, text}). */
async function workflowNotices(page) {
    await idle(page);
    await page.waitForTimeout(1200); // the box is fetched by its own request after the page lands
    await idle(page);
    return page.evaluate(() => {
        const vis = (e) => e.getClientRects().length > 0;
        const txt = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
        const root = [...document.querySelectorAll('[role=dialog]')].filter(vis)[0] || document.body;
        const boxes = [...root.querySelectorAll('h3')].filter(vis)
            .filter((h) => h.parentElement && /border/.test(h.parentElement.className) && h.parentElement.querySelector('p'))
            .map((h) => ({title: txt(h), text: txt(h.parentElement.querySelector('p'))}));
        const lines = txt(root).match(/Assign a copyeditor using the Assign link in the Participants list\.|Awaiting Copyedits\./g) || [];
        return {
            headings: [...root.querySelectorAll('h1,h2,h3')].filter(vis).map(txt).filter(Boolean).slice(0, 14),
            boxes,
            lines,
            draftFiles: !!([...root.querySelectorAll('table')].filter(vis).find((t) => /Draft Files/.test(t.getAttribute('aria-label') || txt(t.querySelector('caption')) || ''))),
        };
    });
}

/** The stored editing and production notices of a submission (evidence beside the screen, never a step). */
function storedNotices(app, submissionId) {
    const rows = sql(app, `select n.type, u.username from notifications n join users u on u.user_id = n.user_id
        where n.assoc_type = 1048585 and n.assoc_id = ${Number(submissionId)} and n.type in (${Object.keys(TYPES).join(',')}) order by 1, 2`);
    return rows ? rows.split('\n').map((l) => { const [t, u] = l.split('|'); return `${TYPES[t]}:${u}`; }) : [];
}

/** The submission's stage as stored (1 Submission, 2 Internal Review, 3 Review, 4 Copyediting, 5 Production). */
const stageOf = (app, submissionId) => Number(sql(app, `select stage_id from submissions where submission_id = ${Number(submissionId)}`));

/** The decision buttons the open workflow offers. */
async function offered(page) {
    return (await R.roundState(page)).buttons;
}

/** Press the decision `name` (a RegExp picks the first offered button it matches) and take its pages to "Record Decision". */
async function decide(page, name) {
    let label = name;
    if (name instanceof RegExp) {
        label = ((await offered(page)) || []).find((b) => name.test(b));
        if (!label) return {absent: true, offered: await offered(page)};
    }
    const pressed = await R.pressDecision(page, label);
    if (!pressed.onWizard) return {label, ...pressed};
    const w = await R.throughWizard(page);
    return {label, pages: w.pages.map((p) => p.h1), requests: w.requests, done: w.done};
}

module.exports = {TYPES, workflowNotices, storedNotices, stageOf, offered, decide, openWorkflow: R.openWorkflow, flat: R.flat};
