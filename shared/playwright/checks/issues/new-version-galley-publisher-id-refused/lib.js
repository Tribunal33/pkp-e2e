// Helpers of walk.js here (issue report docs/issues/U44-A5-new-version-galley-publisher-id-refused.md).
// Requiring this file runs nothing. The tab and settings helpers are the A2 walk's
// (../publisher-id-on-tab-never-removed/lib.js), the version helpers the U45 walks'; these wrap them
// for main and stable-3_5_0. `stored()` reads the database for Evidence only.
const {sql, idle} = require('../../../probe');
const {createVersion, publishLatest} = require('../minor-version-new-galley-dois/lib');
const {createVersion35, publish35} = require('../major-version-earlier-doi-stays-registered/lib');

function workflow(page, app) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    return new WorkflowPage(page, app.contextPath, {labels: {publicationGroup: 'Publication', publicationHeading: app.name === 'ops' ? 'Preprint' : 'Publication'}});
}

/** "Publish" / "Post" the submission's newest version, confirming in the window. Returns the answer. */
async function publishNewest(page, app, sid, label) {
    const frame = workflow(page, app);
    await frame.gotoEditorial(sid);
    await frame.expectVersionLoaded().catch(() => {});
    await idle(page);
    if (app.line === 'stable-3_5_0') {
        // 3.5 opens a submission in Production on its files; the header's button is on the publication's pages.
        await frame.menuLink('Title & Abstract').first().click();
        await idle(page);
        return publish35(page, label);
    }
    const ojsScreen = app.name === 'ojs' ? new (require('../../../../../apps/ojs/playwright/pages/PublishSchedulePages.js').PublishScreen)(page, app.contextPath) : null;
    return {status: await publishLatest(page, frame, label, ojsScreen)};
}

/** "Create New Version" ("Minor Revision"; 3.5: the header's button, "Yes"). Returns the answer, with the new id. */
async function newVersion(page, app, sid) {
    const frame = workflow(page, app);
    await frame.gotoEditorial(sid);
    await frame.expectVersionLoaded().catch(() => {});
    await idle(page);
    const out = app.line === 'stable-3_5_0' ? await createVersion35(page, frame) : await createVersion(page, frame, 'Minor Revision');
    if (!out.id) out.id = Number(sql(app, `select max(publication_id) from publications where submission_id = ${Number(sid)}`).trim());
    return out;
}

/** Evidence only: every stored publisher ID of the submission's galleys (chapters), by version. */
function stored(app, kind, sid) {
    const t = kind === 'chapter' ? ['submission_chapter_settings', 'submission_chapters', 'chapter_id'] : ['publication_galley_settings', 'publication_galleys', 'galley_id'];
    return sql(
        app,
        `select p.publication_id, x.${t[2]}, s.setting_value from ${t[0]} s join ${t[1]} x on x.${t[2]} = s.${t[2]}
         join publications p on p.publication_id = x.publication_id
         where s.setting_name = 'pub-id::publisher-id' and p.submission_id = ${Number(sid)} order by 1, 2`
    )
        .split('\n')
        .filter(Boolean);
}

module.exports = {workflow, publishNewest, newVersion, stored};
