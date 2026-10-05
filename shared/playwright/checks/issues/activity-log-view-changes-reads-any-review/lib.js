// Helpers of walk.js here (U38 A11: the Activity Log's "View changes" serves any edited review by
// its log-entry number, whatever submission or journal it belongs to;
// docs/issues/U38-A11-activity-log-view-changes-reads-any-review.md).
// Requiring this file runs nothing. The screen helpers drive the workflow's "Reviewers" table, the
// "Review Details" and stacked "Modify Review" windows, and the header's "Activity Log", reusing the
// U27 A30/A31 walk's helpers. probeViewReviewChange() issues the grid request the "View changes"
// button itself sends (same op, same URL), pointed at another submission's entry, in the signed-in
// user's own session (patterns.md "Probe kit": page.request carries the context's cookies).
const M = require('../modify-review-offered-then-refused/lib.js');
const {idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/**
 * Per app, on PKP's default test dataset (docs/process/dataset.md):
 *  edit:       the submission whose completed review the editor edits (creates the entry);
 *  accessible: a submission the Section/Series editor `minoue` is assigned to, but `edit` is not;
 *  author/assistant: dataset users with no editorial role, for the role control.
 */
const CASES = {
    ojs: {
        edit: {id: 10, title: 'Condensing Water Availability Models', reviewer: 'Aisla McCrae'},
        accessible: {id: 19, title: 'Finocchiaro: Arguments About Arguments'},
        subEditor: 'minoue',
        assistant: 'svogt',   // Copyeditor
        author: 'zwoods',     // Author of submission 19
        editor: 'dbarnes',
    },
    omp: {
        edit: {id: 16, title: "A Designer's Log: Case Studies in Instructional Design", reviewer: 'Adela Gallego'},
        accessible: {id: 6, title: 'The Information Literacy'},
        subEditor: 'minoue',  // Series editor on submission 6
        assistant: 'svogt',   // Copyeditor
        author: 'mpower',     // Author of submission 16
        editor: 'dbarnes',
    },
};

const COMMENT = 'u38x4 edited by the editor.';

/** Edit submission `id`'s completed review's "For author and editor" comment, through the screens.
 *  Returns what the save answered and whether the edit window closed. */
async function editReviewComment(page, app, c) {
    const out = {};
    await M.openWorkflow(page, app, c.id);
    const opened = await M.openDetailsFromReadReview(page, c.reviewer);
    out.readReview = opened;
    if (!opened) return out;
    const mod = await M.openModify(page);
    out.modifyOffered = !!mod.window;
    await M.enterReview(page, COMMENT, app.name === 'ojs' ? 'Accept Submission' : null);
    out.save = await M.pressSave(page);
    await M.leaveWindows(page).catch(() => {});
    await idle(page);
    return out;
}

/** Open the header's "Activity Log", expand the "…Comments." review-change line, and read its
 *  "View changes" link's address and the window it opens. Returns {href, submissionId, logEntryId, window}. */
async function readViewChanges(page, needle = 'Comments') {
    const out = {};
    await page.getByRole('button', {name: 'Activity Log', exact: true}).first().click();
    const log = page.getByRole('dialog', {name: 'Activity Log & Notes', exact: true});
    await log.waitFor({timeout: T});
    const rows = log.locator('tbody tr.gridRow');
    await rows.first().waitFor({timeout: T});
    await idle(page);
    const line = rows.filter({hasText: 'modified in this review'}).filter({hasText: needle}).first();
    await line.waitFor({timeout: T});
    out.line = flat(await line.innerText(), 300);
    await line.locator('a.show_extras').click();
    const strip = line.locator('xpath=following-sibling::tr[1]');
    const link = strip.getByRole('link', {name: 'View changes', exact: true});
    await link.waitFor({timeout: T});
    out.href = await link.getAttribute('href') || await link.evaluate((a) => a.getAttribute('data-url') || a.href);
    // The AjaxModal link's target is in the onclick/data attributes for a legacy grid link.
    if (!out.href || /^#/.test(out.href) || !/logEntryId/.test(out.href)) {
        out.href = await link.evaluate((a) => {
            const m = (a.getAttribute('onclick') || '') + ' ' + a.outerHTML;
            const hit = m.match(/https?:\/\/[^"'\\\s]*view-review-change[^"'\\\s]*/);
            return hit ? hit[0].replace(/&amp;/g, '&') : null;
        });
    }
    const u = out.href ? new URL(out.href, page.url()) : null;
    out.submissionId = u && u.searchParams.get('submissionId');
    out.logEntryId = u && u.searchParams.get('logEntryId');
    // open the window, read it
    const before = await page.getByRole('dialog').count();
    await link.click();
    await page.waitForFunction((b) => document.querySelectorAll('[role="dialog"]').length > b, before, {timeout: T}).catch(() => {});
    const win = page.getByRole('dialog').last();
    await win.getByText(/Comments|Competing|Recommendation|Form/).first().waitFor({timeout: T}).catch(() => {});
    await idle(page);
    out.window = flat(await win.innerText(), 1200);
    await win.getByRole('button', {name: /^Close/}).first().click().catch(() => {});
    await sleep(500);
    await log.getByRole('button', {name: 'Close', exact: true}).first().click().catch(() => {});
    await log.waitFor({state: 'hidden', timeout: T}).catch(() => {});
    return out;
}

/** Issue the "View changes" grid request (the href's op and component), overriding its query
 *  parameters, in the page's current session. Returns {url, status, isReviewHtml, snippet}. */
async function probeViewReviewChange(page, app, hrefTemplate, {submissionId, logEntryId}) {
    const u = new URL(hrefTemplate, app.baseURL);
    if (submissionId != null) u.searchParams.set('submissionId', String(submissionId));
    if (logEntryId != null) u.searchParams.set('logEntryId', String(logEntryId));
    const res = await page.request.get(u.toString(), {headers: {'X-Requested-With': 'XMLHttpRequest'}});
    const status = res.status();
    let body = '';
    try { body = await res.text(); } catch { /* empty */ }
    let content = body;
    try { const j = JSON.parse(body); content = (j && (j.content || j.message)) || body; } catch { /* not json */ }
    return {
        url: u.toString().replace(app.baseURL, ''),
        status,
        isReviewHtml: /Updated Comments|Previous Comments|Updated Reviewer Recommendation|Updated Form Responses|Updated Competing Interests/.test(content),
        hasEditedText: content.includes(COMMENT),
        snippet: flat(content, 500),
    };
}

module.exports = {T, sleep, flat, CASES, COMMENT, editReviewComment, readViewChanges, probeViewReviewChange};
