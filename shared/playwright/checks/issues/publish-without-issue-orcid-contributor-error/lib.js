// Helpers of the walk for issue report U49 OJS4 (publishing an article with no issue whose
// contributor holds a verified ORCID iD). Requiring this file runs nothing.
const path = require('path');
const {idle, screen, shot, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/**
 * Settings › Users & Roles › "ORCID": tick "Enable ORCID functionality", "ORCID API"
 * "Member Sandbox", a Client ID and Secret, "Save". Returns what the tab showed and the save.
 */
async function setOrcidMember(page, app, {apiType = 'memberSandbox'} = {}, rec = {}) {
    await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/access`));
    await idle(page);
    const tab = page.getByRole('tab', {name: 'ORCID', exact: true});
    await tab.click();
    const box = page.getByRole('checkbox', {name: 'Enable ORCID functionality'});
    await box.waitFor({state: 'visible', timeout: T});
    if (!(await box.isChecked())) await box.check();
    const api = page.locator('select[name="orcidApiType"]');
    await api.waitFor({state: 'visible', timeout: T});
    await api.selectOption(apiType);
    await page.locator('input[name="orcidClientId"]').fill('APP-0000000000000000');
    await page.locator('input[name="orcidClientSecret"]').fill('00000000-0000-0000-0000-000000000000');
    const out = {apiChoice: flat(await api.locator('option:checked').innerText().catch(() => null), 60)};
    const saved = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await page.locator('[id="orcidSettings"]').getByRole('button', {name: 'Save', exact: true}).click();
    const r = await saved;
    out.save = r ? r.status() : null;
    out.savedStatus = await page.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: 10_000}).then(() => true).catch(() => false);
    out.screen = await screen(page);
    await shot(page, (rec.prefix || '') + 'orcid-settings').catch(() => {});
    out.stored = sql(app, `select setting_name, setting_value from ${app.contextTables.settings} where setting_name in ('orcidEnabled','orcidApiType','orcidClientId') order by 1`);
    return out;
}

/**
 * The precondition only ORCID's sign-in creates: the contributor's verified iD and access
 * token, written as PKP\orcid\actions\VerifyIdentityWithOrcid::setIdentityData() and
 * saveIdentityData() store them (author_settings, locale '', the token's expiry as
 * Carbon::toDateTimeString(), here a fixed date about 20 years ahead as ORCID grants). Returns the SQL and the rows it left.
 */
function seedVerifiedOrcid(app, submissionId, email) {
    // Portable (PostgreSQL, MySQL, MariaDB): the expiry is a fixed date of the shape the
    // integration writes (ORCID's tokens last about 20 years).
    const statement = `INSERT INTO author_settings (author_id, locale, setting_name, setting_value)
SELECT a.author_id, '', v.setting_name, v.setting_value
FROM authors a
JOIN submissions s ON s.current_publication_id = a.publication_id
CROSS JOIN (
  SELECT 'orcid' AS setting_name, 'https://sandbox.orcid.org/0000-0002-1825-0097' AS setting_value
  UNION ALL SELECT 'orcidIsVerified', '1'
  UNION ALL SELECT 'orcidAccessToken', '00000000-1111-2222-3333-444444444444'
  UNION ALL SELECT 'orcidAccessScope', '/activities/update'
  UNION ALL SELECT 'orcidRefreshToken', '55555555-6666-7777-8888-999999999999'
  UNION ALL SELECT 'orcidAccessExpiresOn', '2046-10-01 00:00:00'
) v
WHERE s.submission_id = ${submissionId}
  AND a.email = '${email}';`;
    const result = sql(app, statement);
    const rows = sql(app, `select a.author_id, s.setting_name, s.setting_value from authors a join author_settings s on s.author_id=a.author_id where a.email='${email}' and a.publication_id=(select current_publication_id from submissions where submission_id=${submissionId}) and s.setting_name like 'orcid%' order by 2`);
    return {statement, result, rows: rows.split('\n')};
}

/** Jobs and failed jobs above the given ids, by display name. */
function jobsSince(app, {jobs = 0, failed = 0} = {}) {
    return {
        jobs: sql(app, `select id, substring(payload from '"displayName":"([^"]+)"') from jobs where id > ${jobs} order by id`),
        failed: sql(app, `select id, substring(payload from '"displayName":"([^"]+)"'), left(exception, 160) from failed_jobs where id > ${failed} order by id`),
    };
}
function jobMarks(app) {
    return {
        jobs: Number(sql(app, 'select coalesce(max(id),0) from jobs')) || 0,
        failed: Number(sql(app, 'select coalesce(max(id),0) from failed_jobs')) || 0,
    };
}

/**
 * From the submission's Publication › "Title & Abstract": the publish button, the "Review
 * Publishing Details" panel with `choice` ("Don't Assign To An Issue" or "Assign To
 * Current/Back Issue" plus `issue`), "Confirm", then the window's "Publish". Records what
 * each screen shows; never throws on the publish's outcome. On 3.5 (no such panel) it
 * records what the publish button opens instead.
 */
async function publishFromWorkflow(page, app, submissionId, {choice, issue} = {}, rec) {
    const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
    const pub = new PublicationScreen(page, app.contextPath);
    const out = {};
    await pub.gotoWorkflow(submissionId);
    await idle(page);
    await pub.openEntry('Title & Abstract');
    await idle(page);
    await sleep(800);
    out.before = flat(await pub.leftControls().innerText().catch(() => null), 120);
    out.button = flat(await pub.publishButton().first().innerText().catch(() => null), 60);
    if (app.line === 'stable-3_5_0') {
        await pub.publishButton().first().click();
        const dlg = page.getByRole('dialog').last();
        await dlg.waitFor({state: 'visible', timeout: T}).catch(() => {});
        await idle(page);
        await sleep(1500);
        out.opened = await screen(page);
        out.buttons = (await page.getByRole('dialog').last().getByRole('button').allInnerTexts().catch(() => [])).map((t) => flat(t, 60));
        rec('35-publish-opens', out.opened);
        await shot(page, (rec.prefix || '') + '35-publish-opens').catch(() => {});
        return out;
    }
    const panel = await pub.openPublishPanel();
    await pub.fillVersionDetails(panel);
    await pub.awaitAssignmentPreselected(panel);
    out.choices = (await panel.getByRole('radio').evaluateAll((els) => els.map((e) => (e.closest('label') || e.parentElement).innerText))).map((t) => flat(t, 80));
    await panel.getByRole('radio', {name: choice}).check();
    if (issue) await pub.selectIssueOption(panel, issue);
    await sleep(500);
    rec('02-panel', await screen(page));
    await shot(page, (rec.prefix || '') + '02-panel').catch(() => {});
    await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
    const confirm = page.getByRole('dialog').filter({hasText: /Are you sure you want to/}).last();
    await confirm.waitFor({state: 'visible', timeout: T});
    out.question = flat(await confirm.innerText(), 400);
    rec('03-window', await screen(page));
    const answered = page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
    await confirm.getByRole('button', {name: /^(Publish|Schedule For Publication)$/}).last().click();
    const r = await answered;
    out.publish = r ? {status: r.status(), body: flat(await r.text().catch(() => null), 600)} : null;
    await page.getByRole('button', {name: 'Unpublish', exact: true}).first().waitFor({timeout: 15_000}).catch(() => {});
    await idle(page);
    await sleep(1500);
    const after = await screen(page);
    rec('04-after-publish', after);
    await shot(page, (rec.prefix || '') + '04-after-publish').catch(() => {});
    out.notices = after.notices;
    out.windowStillOpen = await confirm.isVisible().catch(() => false);
    out.status = flat(await pub.leftControls().innerText().catch(() => null), 120);
    out.rightControls = (await pub.rightControls().getByRole('button').allInnerTexts().catch(() => [])).map((t) => flat(t, 40));
    return out;
}

/** The submission's workflow opened afresh: the version's status readout and controls. */
async function reread(page, app, submissionId, rec) {
    const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
    const pub = new PublicationScreen(page, app.contextPath);
    await pub.gotoWorkflow(submissionId);
    await idle(page);
    await pub.openEntry('Title & Abstract').catch(() => {});
    await idle(page);
    await sleep(800);
    rec('05-reloaded', await screen(page));
    await shot(page, (rec.prefix || '') + '05-reloaded').catch(() => {});
    return {
        status: flat(await pub.leftControls().innerText().catch(() => null), 120),
        rightControls: (await pub.rightControls().getByRole('button').allInnerTexts().catch(() => [])).map((t) => flat(t, 40)),
    };
}

module.exports = {T, sleep, flat, setOrcidMember, seedVerifiedOrcid, jobsSince, jobMarks, publishFromWorkflow, reread};
