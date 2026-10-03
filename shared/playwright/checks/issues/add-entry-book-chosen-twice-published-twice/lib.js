// Helpers for walk.js (U70 A9). Requiring this file runs nothing.
// The "Add Entry" helpers are the U70 A8 walk's own; the workflow and "Activity Log" ones the U35 A14 walk's.
const {screen, record, sql, idle} = require('../../../probe');
const A8 = require('../add-entry-save-publishes-unchosen-book/lib.js');
const LOG = require('../activity-log-names-participant-not-editor/lib.js');

/** Type a word, wait for the suggestions, click `title` when offered; returns what was offered and the tags after. */
async function chooseIfOffered(panel, word, title) {
    const typed = await A8.typeAndWait(panel, word);
    const offered = typed.suggestions.includes(title);
    if (offered) {
        await panel.option(title).click();
        await A8.sleep(800);
    }
    return {...typed, offered, tags: await A8.chosenTags(panel)};
}

/** The book's workflow: the version labels it shows, then "Activity Log" › "History" lines naming publication. */
async function workflowReadout(page, app, submissionId, label) {
    // A published book's workflow opens on its publication, without the "Participants" panel.
    await page.goto('about:blank');
    await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial?workflowSubmissionId=${Number(submissionId)}`));
    await page.getByRole('button', {name: 'Activity Log'}).first().waitFor({timeout: 60_000});
    await idle(page);
    await A8.sleep(1000);
    const s = await screen(page);
    record(`${label}-workflow`, s);
    const text = [s.text && s.text.dialog, s.text && s.text.main].filter(Boolean).join('\n');
    const versions = [...new Set(text.match(/Version of Record[^\n]*|\bVersion \d[^\n]*/g) || [])];
    const history = await LOG.history(page, `${label}-activity-log`).catch((e) => ({error: A8.flat(e.message)}));
    const published = (history.lines || []).filter((l) => /published/i.test(l.event)).map((l) => l.event);
    return {versions, published};
}

/** Book `id`'s publications as stored: id|status|version|date published (3.5 keeps one `version` column). */
function publications(app, id) {
    const version = app.line && app.line !== 'main' ? 'version' : "version_stage || ' ' || version_major || '.' || version_minor";
    return sql(app, `select publication_id, status, ${version}, date_published from publications where submission_id = ${Number(id)} order by 1`);
}

/** Book `id`'s "published" event-log lines as stored. */
function publishEvents(app, id) {
    return sql(app, `select log_id, message from event_log where assoc_type = 1048585 and assoc_id = ${Number(id)} and message like 'publication.event.%' order by 1`);
}

module.exports = {chooseIfOffered, workflowReadout, publications, publishEvents};
