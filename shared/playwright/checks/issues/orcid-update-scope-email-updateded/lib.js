// Helpers of walk.js here (issue report docs/issues/U04-A21-orcid-update-scope-email-updateded.md).
// Requiring this file runs nothing. Copied from the U04 A14, U06 OPS1 and U49 OJS4 walks so that
// this folder stands alone.
const path = require('path');
const {idle, screen, shot, sql} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
/** The locale segment of a context address: none on 3.4 and 3.3. */
const L = (app) => (app.line && /3_[34]/.test(app.line) ? '' : '/en');

/** Per app: the dataset submission whose contributor holds the iD, and their address. */
const SUBJECT = {
    ojs: {sid: 5, email: 'ddiouf@mailinator.com', name: 'Diaga Diouf'},
    ops: {sid: 1, email: 'ccorino@mailinator.com', name: 'Carlo Corino'},
};

/**
 * The precondition only ORCID's sign-in creates: a contributor verified while the context
 * used the public API. Written as PKP\orcid\actions\VerifyIdentityWithOrcid::setIdentityData()
 * and saveIdentityData() store it (author_settings, locale '', the scope ORCID grants the
 * public API, OrcidManager::ORCID_API_SCOPE_PUBLIC "/authenticate", the expiry in
 * Carbon::toDateTimeString()'s shape about 20 years ahead). Portable SQL.
 */
function seedPublicVerifiedOrcid(app, submissionId, email) {
    const statement = `INSERT INTO author_settings (author_id, locale, setting_name, setting_value)
SELECT a.author_id, '', v.setting_name, v.setting_value
FROM authors a
JOIN submissions s ON s.current_publication_id = a.publication_id
CROSS JOIN (
  SELECT 'orcid' AS setting_name, 'https://sandbox.orcid.org/0000-0002-1825-0097' AS setting_value
  UNION ALL SELECT 'orcidIsVerified', '1'
  UNION ALL SELECT 'orcidAccessToken', '00000000-1111-2222-3333-444444444444'
  UNION ALL SELECT 'orcidAccessScope', '/authenticate'
  UNION ALL SELECT 'orcidRefreshToken', '55555555-6666-7777-8888-999999999999'
  UNION ALL SELECT 'orcidAccessExpiresOn', '2046-10-01 00:00:00'
) v
WHERE s.submission_id = ${submissionId}
  AND a.email = '${email}';`;
    const result = sql(app, statement);
    return {statement, result, rows: orcidRows(app, submissionId, email)};
}

/** The contributor's ORCID settings on the submission's current publication, as lines. */
function orcidRows(app, submissionId, email) {
    return sql(app, `select s.setting_name, s.setting_value from authors a join author_settings s on s.author_id=a.author_id where a.email='${email}' and a.publication_id=(select current_publication_id from submissions where submission_id=${submissionId}) and s.setting_name like 'orcid%' order by 1`).split('\n');
}

/**
 * Publish (OJS: into "Vol. 1 No. 2 (2014)") or post (OPS) the submission through the
 * workflow, as the signed-in editor. Records each screen; returns what happened, never throws.
 */
async function publishOnScreen(page, app, submissionId, rec) {
    const out = {};
    const backIssue = /Vol\. 1 No\. 2 \(2014\)/;
    const answered = [];
    const onResp = (r) => { if (/\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET') answered.push({status: r.status(), url: r.url().replace(/^https?:\/\/[^/]+/, '')}); };
    page.on('response', onResp);
    try {
        await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${submissionId}`));
        await idle(page);
        if (app.name === 'ojs' && app.line !== 'stable-3_5_0') {
            const {PublicationScreen} = require(path.join(app.suiteDir, 'pages', 'PublicationMetadataPages.js'));
            const pub = new PublicationScreen(page, app.contextPath);
            await pub.openEntry('Title & Abstract');
            await idle(page);
            await pub.publish({backIssueLabel: backIssue});
        } else if (app.name === 'ops' && app.line !== 'stable-3_5_0') {
            const {postPreprint} = require(path.join(app.suiteDir, 'pages', 'PublicationPages.js'));
            await postPreprint(page);
        } else {
            // stable-3_5_0: the publication page's header button, then (OJS, no issue yet)
            // "Select an issue …" with its Issue select and "Save", then the confirmation's button.
            const tabs = page.getByRole('link', {name: 'Title & Abstract', exact: true});
            await tabs.first().waitFor({state: 'visible', timeout: T}).catch(() => {});
            if (await tabs.first().isVisible().catch(() => false)) await tabs.first().click();
            await idle(page);
            const label = app.name === 'ops' ? 'Post' : 'Schedule For Publication';
            const button = page.getByRole('button', {name: label, exact: true}).first();
            await button.waitFor({state: 'visible', timeout: T});
            await button.click();
            await sleep(1500);
            await idle(page);
            const issueSelect = page.locator('select[name="issueId"]').last();
            if (await issueSelect.isVisible().catch(() => false)) {
                rec('35-select-issue', await screen(page));
                const opt = issueSelect.locator('option').filter({hasText: backIssue});
                await issueSelect.selectOption((await opt.first().getAttribute('value')) || '');
                const form = page.locator('form').filter({has: issueSelect}).last();
                await form.getByRole('button', {name: 'Save', exact: true}).click();
                await sleep(2000);
                await idle(page);
            }
            const confirmLabel = app.name === 'ops' ? 'Post' : 'Publish';
            const dlg = page.getByRole('dialog').filter({has: page.getByRole('button', {name: confirmLabel, exact: true})}).last();
            await dlg.waitFor({state: 'visible', timeout: T});
            await sleep(800);
            out.window = flat(await dlg.innerText().catch(() => null), 400);
            rec('35-confirm', await screen(page));
            await dlg.getByRole('button', {name: confirmLabel, exact: true}).last().click();
            await page.getByRole('button', {name: app.name === 'ops' ? 'Unpost' : 'Unpublish', exact: true}).first().waitFor({timeout: T}).catch(() => {});
        }
    } catch (e) {
        out.error = flat(e.message, 500);
    } finally {
        page.off('response', onResp);
    }
    await idle(page).catch(() => {});
    await sleep(1000);
    out.publishAnswers = answered;
    const after = await screen(page);
    rec('03-published', after);
    await shot(page, (rec.prefix || '') + '03-published').catch(() => {});
    out.status = flat((after.text && after.text.main) || '', 200);
    return out;
}

/**
 * Wait for the fleet's own message to `to` with `subject`, loading the front page between
 * reads so the job runner (on web requests in the dataset's config) runs the queued jobs.
 */
async function awaitMail(page, app, {to, subject, since, rounds = 18}) {
    for (let i = 0; i < rounds; i++) {
        const m = await app.fleetMail.find({to, subject, since, timeoutMs: 2000}).catch(() => null);
        if (m) return m;
        await page.goto(app.url(`/index.php/${app.contextPath}`)).catch(() => {});
        await sleep(3000);
    }
    return null;
}


/** The Manage Emails page object (required inside forEachApp's fn). */
function manageEmails(page, app) {
    const {ManageEmailsPage} = require('../../../pages/EmailsPages.js');
    return new ManageEmailsPage(page, `${app.contextPath}${L(app)}`);
}

/**
 * Settings › Workflow › "Emails" › "Add and edit templates": lands on the Manage Emails page through
 * the tab's link (as a person would), falling back to the page's address when the link is not found.
 */
async function openManageEmails(page, app) {
    const m = manageEmails(page, app);
    await page.goto(app.url(`/index.php/${app.contextPath}${L(app)}/management/settings/workflow#emails`));
    await idle(page).catch(() => {});
    const tab = page.locator('#emails-button');
    if (await tab.count()) await tab.first().click().catch(() => {});
    const link = page.getByRole('link', {name: /Add and edit templates/});
    let via = 'link';
    if (await link.first().isVisible({timeout: 5000}).catch(() => false)) {
        await link.first().click();
        await m.waitForList();
    } else {
        via = 'address';
        await m.goto();
    }
    return {m, via};
}


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


module.exports = {T, sleep, flat, L, SUBJECT, seedPublicVerifiedOrcid, orcidRows, publishOnScreen, awaitMail, manageEmails, openManageEmails, setOrcidMember};
