// Helpers for the "Future Issues" order (U50 A8), shared by walk.js and neighbour.js. Requiring this
// file runs nothing. "Create Issue" with "Title" unticked is the A5/A6 walk's helper.
const {screen, record, shot} = require('../../../probe');
const {flat, createIssue} = require('../issue-big-volume-or-lettered-year/lib');

/** Record the screen and a full-page picture under `name`. */
async function snap(page, name) {
    record(name, await screen(page));
    await shot(page, name).catch(() => {});
}

/** Issues › the named tab ("Future Issues" or "Back Issues"): the issue names, in order. */
async function issueList(page, contextPath, tab, label) {
    const {IssuesAdmin} = require('../../../pages/IssuesPages.js');
    const issues = new IssuesAdmin(page, contextPath);
    await issues.goto(tab);
    await issues.showTab(tab);
    const names = (await issues.names(tab).allInnerTexts()).map(flat);
    if (label) await snap(page, label);
    return names;
}

/** "Create Issue" for each {volume, number, year} in turn ("Title" unticked); each save's outcome. */
async function createIssues(page, contextPath, specs, label) {
    const out = [];
    for (const [i, s] of specs.entries()) {
        const r = await createIssue(page, contextPath, s, `${label}-${i + 1}`);
        out.push({...s, status: r.status, windowOpen: r.windowOpen, fieldErrors: r.fieldErrors, notices: r.notices});
    }
    return out;
}

module.exports = {flat, snap, issueList, createIssues};
