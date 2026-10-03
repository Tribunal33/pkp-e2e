// Helpers for walk.js (U70 A5). Requiring this file runs nothing.
const {idle, screen, shot, sql} = require('../../../probe');
const A8 = require('../add-entry-save-publishes-unchosen-book/lib.js');

/** What the "Add Entry" panel shows after a press: open?, marks at the box, the footer's error line, "Save" enabled?, tags. */
async function panelState(page, panel) {
    await A8.sleep(1200);
    await idle(page);
    const s = await screen(page);
    const open = await panel.root().isVisible().catch(() => false);
    if (!open) return {panelOpen: false, notices: s.notices};
    const root = panel.root();
    return {
        panelOpen: true,
        notices: s.notices,
        fieldErrors: (await root.locator('.pkpFieldError').allInnerTexts().catch(() => [])).map((t) => A8.flat(t, 300)).filter(Boolean),
        footerErrors: (await root.locator('.pkpFormErrors').allInnerTexts().catch(() => [])).map((t) => A8.flat(t, 300)),
        boxInvalid: await panel.findBox().getAttribute('aria-invalid').catch(() => null),
        saveDisabled: await panel.saveButton().isDisabled().catch(() => null),
        tags: await A8.chosenTags(panel),
        dialogText: A8.flat(s.text && s.text.dialog, 600),
    };
}

/**
 * The precondition only ORCID creates: the contributor's ORCID iD after the author verified it
 * and the access token was later removed (expired or revoked). Written as
 * PKP\orcid\actions\VerifyIdentityWithOrcid::setIdentityData() stores the iD (`orcid`,
 * `orcidIsVerified`, author_settings, locale ''), without the four token fields that
 * PKP\orcid\OrcidManager::removeOrcidAccessToken() clears. Returns the SQL and the rows it left.
 */
function seedUnverifiedOrcid(app, submissionId, email) {
    const statement = `INSERT INTO author_settings (author_id, locale, setting_name, setting_value)
SELECT a.author_id, '', v.setting_name, v.setting_value
FROM authors a
JOIN submissions s ON s.current_publication_id = a.publication_id
CROSS JOIN (
  SELECT 'orcid' AS setting_name, 'https://sandbox.orcid.org/0000-0002-1825-0097' AS setting_value
  UNION ALL SELECT 'orcidIsVerified', '1'
) v
WHERE s.submission_id = ${Number(submissionId)}
  AND a.email = '${email}';`;
    const result = sql(app, statement);
    const rows = sql(
        app,
        `select a.author_id, s.setting_name, s.setting_value from authors a join author_settings s on s.author_id = a.author_id ` +
            `where a.email = '${email}' and a.publication_id = (select current_publication_id from submissions where submission_id = ${Number(submissionId)}) ` +
            `and s.setting_name like 'orcid%' order by 2`
    );
    return {statement, result, rows: rows.split('\n')};
}

/** Book `id`'s current version as stored: id|status (3 = published). */
function currentVersion(app, id) {
    return sql(app, `select p.publication_id, p.status from submissions s join publications p on p.publication_id = s.current_publication_id where s.submission_id = ${Number(id)}`);
}

/**
 * The control: book `id`'s workflow › "Title & Abstract", the header's "Publish", and what its
 * "Schedule For Publication" window says (never presses the window's "Publish").
 */
async function workflowPublishWindow(page, app, id, label) {
    const {WorkflowPage} = require('../../../pages/WorkflowPage.js');
    const wf = new WorkflowPage(page, app.contextPath);
    await wf.gotoEditorial(id);
    await idle(page);
    const entry = await wf.revealPublicationEntry('Title & Abstract');
    await entry.click();
    await idle(page);
    const controls = page.locator('[data-cy="workflow-controls-right"]');
    await controls.getByRole('button', {name: 'Publish', exact: true}).click();
    const dialog = page.getByRole('dialog', {name: /Schedule For Publication/});
    await dialog.waitFor({state: 'visible', timeout: A8.T});
    await idle(page);
    await A8.sleep(1000);
    const s = await screen(page);
    await shot(page, label);
    return {
        text: A8.flat(await dialog.innerText(), 800),
        buttons: (await dialog.getByRole('button').allInnerTexts()).map((t) => A8.flat(t, 60)),
        screen: s.text && A8.flat(s.text.dialog, 800),
    };
}

module.exports = {panelState, seedUnverifiedOrcid, currentVersion, workflowPublishWindow};
