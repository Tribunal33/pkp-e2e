// Helpers for walk.js (issue report U34-OPS2-preprint-server-initials-placeholder-raw-key). Runs nothing when required.
const {idle} = require('../../../probe');

/** Each app's submission for the decision step, by the default dataset (docs/process/dataset.md). */
const CASES = {
    ojs: {id: 4, title: 'Computer Skill Requirements for New and Existing Teachers'},
    omp: {id: 10, title: 'Lost Tracks: Buffalo National Park, 1909-1939'},
    ops: {id: 1, title: 'The influence of lactation on the quantity and quality of cashmere production'},
};

/** The decline mailable's name on the Emails page. */
const DECLINE_EMAIL = {ojs: 'Submission Declined (Pre-Review)', omp: 'Submission Declined (Pre-Review)', ops: 'Submission Declined'};

const flat = (s, n = 300) => String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);

/** Press `button` (an "Insert Content" toolbar button) and read the window it opens: every row's value and description. */
async function readInsertContent(page, button) {
    await button.waitFor({state: 'visible', timeout: 30_000});
    await button.click();
    const win = page.getByRole('dialog', {name: 'Insert Content'}).last();
    await win.locator('li').first().waitFor({state: 'visible', timeout: 30_000});
    await idle(page);
    const rows = await win.locator('li').evaluateAll((items) =>
        items.map((li) => ({
            value: ((li.querySelector('.insertContent__item__value') || {}).textContent || '').trim(),
            description: ((li.querySelector('.insertContent__item__description') || {}).textContent || '').trim(),
        }))
    );
    return {win, rows};
}

/** The rows that read as a raw locale key, and the initials row (found by its description or its raw key). */
function summarize(rows) {
    const raw = rows.filter((r) => /##[\w.]+##/.test(r.description));
    const initials = rows.find((r) => /initials|contextAcronym/i.test(r.description)) || null;
    return {count: rows.length, initials, raw};
}

/** Close the top "Insert Content" window with Escape. */
async function closeInsert(page, win) {
    await page.keyboard.press('Escape');
    await win.waitFor({state: 'hidden', timeout: 10_000}).catch(() => {});
}

module.exports = {CASES, DECLINE_EMAIL, flat, readInsertContent, summarize, closeInsert};
