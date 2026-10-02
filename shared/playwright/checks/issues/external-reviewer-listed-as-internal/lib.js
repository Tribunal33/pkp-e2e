// Helpers of walk.js here (issue report docs/issues/U37-OMP1-external-reviewer-listed-as-internal.md).
// Requiring this file runs nothing. The dataset facts the steps use, the participant lines of an
// "Add"/"Edit" window, the reviewer's own "Review Tasks & Discussions" panel, and the 3.5
// "Discussions" grid's "Add discussion" form (read, then cancelled).
const {idle} = require('../../../probe');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 300) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** PKP's default test dataset, OMP (docs/process/dataset.md); menu keys are workflow_{stage}_{round id}. */
const OMP = {
    external: {id: 16, menuKey: 'workflow_3_18', reviewer: 'agallego', reviewerName: 'Adela Gallego'},
    internal: {id: 12, menuKey: 'workflow_2_12', reviewer: 'phudson', reviewerName: 'Paul Hudson'},
    editor: 'dbarnes',
    panel: 'Review Tasks & Discussions',
};

/** Every participant line of an open "Add"/"Edit" window, once `username`'s line is there. */
async function participantLines(win, username) {
    await win.participantLabel(username).first().waitFor({timeout: 30000});
    await sleep(300);
    return (await win.participants()).map((p) => p.label);
}

/** The line of `username` among `lines` ("{full name} ({username}) … {roles} …"). */
const lineOf = (lines, username) => (lines || []).find((l) => l.includes(`(${username})`)) || null;

/** On the review form: press "Add" in the visible "Review Tasks & Discussions" panel. */
async function openReviewerAdd(page) {
    const T = require('../../../pages/TasksDiscussionsPages.js');
    const panel = page.locator('[data-cy="discussion-manager"]:visible').filter({has: page.locator('h3', {hasText: OMP.panel})}).first();
    await panel.waitFor({timeout: 30000});
    await panel.locator('button').filter({hasText: /^\s*Add\s*$/}).first().click();
    const win = new T.ItemWindow(page);
    await win.expectReady();
    return win;
}

// 3.5: the stage's legacy "Discussions" grid.
const grid = (page) => page.locator('[id^="component-grid-queries-queriesgrid"]').first();

/** 3.5: open the workflow at the round, "Add discussion", read every participant box, "Cancel". */
async function readAddDiscussion35(page, app, s) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${s.id}&workflowMenuKey=${s.menuKey}`));
    await idle(page);
    await grid(page).waitFor({timeout: 30000});
    await idle(page);
    await grid(page).getByText(/Add discussion/i).first().click();
    const form = page.locator('form#queryForm').last();
    await form.waitFor({timeout: 30000});
    await idle(page);
    const lines = await form.locator('label').filter({has: page.locator('input[type="checkbox"]')})
        .evaluateAll((ls) => ls.map((l) => l.innerText.replace(/\s+/g, ' ').trim()));
    return {form, lines};
}

module.exports = {OMP, sleep, flat, participantLines, lineOf, openReviewerAdd, grid, readAddDiscussion35};
