// Helpers of the kept walk of docs/issues/U04-A1-send-review-to-orcid-confirms-in-silence.md (spec U04, register A1).
// Requiring this file runs nothing. The screens: Settings › Users & Roles › "ORCID" and the workflow's
// "Reviewers" row menu; the row helpers come from ../reviewer-response-erases-reminder-history/lib.js.
const path = require('path');
const {idle, sql} = require('../../../probe');
const K = require('../reviewer-response-erases-reminder-history/lib.js');

/** Per app, on PKP's default test dataset: the reviewer given an iD and the submission where their review is complete. */
const CASES = {
    // `scoped`: a second reviewer of the same completed review, for the neighbour's permission-request case
    ojs: {user: 'jjanssen', name: 'Julie Janssen', completed: 13, scoped: {user: 'amccrae', name: 'Aisla McCrae'}},
    omp: {user: 'phudson', name: 'Paul Hudson', completed: 12},
};

/**
 * Settings › Users & Roles › "ORCID": tick "Enable ORCID functionality", pick the "ORCID API",
 * fill the two credentials (placeholders: ORCID is unreachable from the test install) and,
 * when given, "City"; "Save".
 */
async function enableOrcid(page, app, {api, city}) {
    const {OrcidSettingsTab} = require(path.join(__dirname, '../../../../../apps', app.name, 'playwright/pages/OrcidPages.js'));
    const tab = new OrcidSettingsTab(page, app.contextPath);
    await tab.goto();
    if (!(await tab.enableCheckbox.isChecked())) await tab.enableCheckbox.check();
    await tab.apiSelect.waitFor({timeout: K.T});
    await tab.apiSelect.selectOption({label: api});
    await tab.clientIdInput.fill('APP-TEST');
    await tab.clientSecretInput.fill('test-secret');
    if (city) await tab.panel.locator('input[name="orcidCity"]').fill(city);
    await tab.save();
    await idle(page);
    return {enabled: await tab.enableCheckbox.isChecked(), api: await tab.apiSelect.inputValue(), city: city || null};
}

/**
 * The precondition only ORCID's own sign-in creates: the reviewer's authorized iD, as
 * AuthorizeUserData::getOrcidOAuthAccessData() builds it and HasOrcid::setVerifiedOrcidOAuthData()
 * stores it. The scope is the one OrcidManager asks for under the context's API:
 * ORCID_API_SCOPE_PUBLIC ('/authenticate') or ORCID_API_SCOPE_MEMBER ('/activities/update').
 */
const ORCID_SQL = (username, scope) => `insert into user_settings (user_id, locale, setting_name, setting_value)
select u.user_id, '', s.name, s.value from users u, (values
  ('orcid', 'https://sandbox.orcid.org/0000-0002-1825-0097'),
  ('orcidIsVerified', '1'),
  ('orcidAccessToken', 'an-access-token-from-orcid'),
  ('orcidAccessScope', '${scope}'),
  ('orcidRefreshToken', 'a-refresh-token-from-orcid'),
  ('orcidAccessExpiresOn', '2046-10-03 12:00:00')
) as s(name, value) where u.username = '${username}'`;

function authorizeOrcid(app, username, scope) {
    const query = ORCID_SQL(username, scope);
    sql(app, query);
    return {sql: query, stored: sql(app, `select s.setting_name, s.setting_value from user_settings s join users u using (user_id) where u.username = '${username}' and s.setting_name like 'orcid%' order by 1`).split('\n')};
}

/**
 * The ORCID review jobs in the queue (`jobs`: name, attempts) and in `failed_jobs` (name, the
 * exception's first line), for the record: what "OK" dispatched and what the job runner made of it.
 */
function orcidJobs(app) {
    const name = "substring(payload from '\"displayName\":\"([^\"]+)\"')";
    const rows = (q) => sql(app, q).split('\n').filter(Boolean);
    return {
        queued: rows(`select ${name}, attempts from jobs where payload like '%Orcid%' order by id`),
        failed: rows(`select ${name}, substr(split_part(exception, chr(10), 1), 1, 160) from failed_jobs where payload like '%Orcid%' order by id`),
    };
}

/** The Mailpit subjects sent to the user since `since`. */
async function mailSubjects(app, username, since) {
    const to = sql(app, `select email from users where username = '${username}'`).trim();
    const found = await app.mail._search({to, since});
    return {to, subjects: (found.messages || []).map((m) => m.Subject)};
}

/** The context's stored ORCID settings and country (what DepositOrcidReview::handle() reads). */
function orcidSettings(app) {
    const {table, id, settings} = app.contextTables;
    return sql(app, `select s.setting_name, s.setting_value from ${settings} s join ${table} c on c.${id} = s.${id} where c.path = '${app.contextPath}' and (s.setting_name like 'orcid%' and s.setting_name not like 'orcidClient%' or s.setting_name = 'country') order by 1`).split('\n');
}

module.exports = {CASES, enableOrcid, ORCID_SQL, authorizeOrcid, orcidJobs, mailSubjects, orcidSettings};
