// Helpers of the U38 A3/A9/A10 walk (issue report
// docs/issues/U38-A3-A9-A10-activity-log-close-drops-typed-note.md). Runs nothing when required.
// The window's own helpers (open the workflow, "Activity Log", "Notes", "Add Note", "History",
// "Close") are the U36 A10 / U38 A2 walk's, re-exported here.
const {idle, screen, record, shot, sql} = require('../../../probe');
const N = require('../add-note-empty-box-posts-empty-note/lib.js');

exports.N = N;
exports.flat = N.flat;
exports.CASES = N.CASES;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
exports.sleep = sleep;

/**
 * The browser's own questions (the form's confirm() and the page-leave beforeunload), recorded
 * and answered as `d.answer` says: confirm 'accept' ("OK") or 'dismiss' ("Cancel");
 * beforeunload is always accepted ("Leave"), so a navigation goes on.
 */
exports.dialogs = function dialogs(page) {
    const d = {list: [], answer: 'dismiss'};
    page.on('dialog', async (q) => {
        const accept = q.type() === 'beforeunload' ? true : d.answer === 'accept';
        d.list.push({type: q.type(), message: q.message(), answer: accept ? 'OK/Leave' : 'Cancel'});
        if (accept) await q.accept().catch(() => {}); else await q.dismiss().catch(() => {});
    });
    d.since = (n) => d.list.slice(n);
    return d;
};

/** The "Activity Log & Notes" window, when open. */
const logWindow = (page) => page.getByRole('dialog').filter({has: page.locator('.pkp_controllers_informationCenter')}).last();
exports.logWindow = logWindow;

/** What is on screen: the window open or not, its selected tab, the box's text, the notes listed. */
exports.state = async function state(page) {
    const win = logWindow(page);
    const open = await win.isVisible().catch(() => false);
    if (!open) {
        return {windowOpen: false};
    }
    const selected = await win.locator('.pkp_controllers_informationCenter > ul > li[aria-selected="true"]').first().innerText().catch(() => null);
    const box = await win.locator('#newNoteForm textarea[name="newNote"]:visible').inputValue().catch(() => null);
    const notes = await win.locator('#informationCenterNotes .note:visible').count().catch(() => null);
    return {windowOpen: true, selected: selected ? selected.trim() : null, box, notesListed: notes};
};

/**
 * One step: `fn` runs with confirm() answered `answer`; returns the questions the browser asked
 * and the screen 1.5 s on (with `settle`, 2.5 s more: a closed form's page-leave handler lingers
 * about half a second). Records the screen under `label`.
 */
exports.act = async function act(page, d, label, fn, {answer = 'dismiss', settle = false} = {}) {
    const n0 = d.list.length;
    d.answer = answer;
    let threw = null;
    try { await fn(); } catch (e) { threw = N.flat(e.message, 300); }
    await sleep(1500);
    await idle(page).catch(() => {});
    if (settle) await sleep(2500);
    d.answer = 'dismiss';
    const out = {asked: d.since(n0), ...(await exports.state(page))};
    if (threw) out.threw = threw;
    const s = await screen(page).catch(() => ({}));
    record(label, {...s, step: out});
    await shot(page, label).catch(() => {});
    return out;
};

/** The window's own "Close" (the side window's header button). */
exports.pressClose = async function pressClose(page) {
    await logWindow(page).getByRole('button', {name: 'Close', exact: true}).first().click();
};

/** A tab of the window ("History", "Notes"), pressed; nothing awaited past the press. */
exports.pressTab = async function pressTab(page, name) {
    await logWindow(page).getByRole('tab', {name, exact: true}).first().click();
};

/** Type into "Add Note"'s box and leave it (the form notices the change when the box loses focus). */
exports.typeNote = async function typeNote(page, text) {
    const box = page.locator('#newNoteForm textarea[name="newNote"]:visible');
    await box.click();
    await box.pressSequentially(text, {delay: 10});
};

/** The submission's notes as stored: id|contents. */
exports.storedNotes = function storedNotes(app, submissionId) {
    return sql(app, `select note_id, contents from notes where assoc_type = 1048585 and assoc_id = ${Number(submissionId)} order by note_id`).split('\n').filter(Boolean);
};
