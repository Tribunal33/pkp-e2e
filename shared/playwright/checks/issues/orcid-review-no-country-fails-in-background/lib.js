// Helpers of the kept walk of docs/issues/U04-OJS1-orcid-review-no-country-fails-in-background.md (spec U04, register OJS1).
// Requiring this file runs nothing. The screens: Settings › Journal › "Masthead" ("Country"), Settings ›
// Users & Roles › "ORCID" ("City"), and Administration › "View Failed Jobs" with a row's "Details". The ORCID
// tab, the reviewer's authorized iD and the job reads come from ../send-review-to-orcid-confirms-in-silence/lib.js,
// the Reviewers row from ../reviewer-response-erases-reminder-history/lib.js, the jobs pages from
// ../doaj-deposit-takes-other-journals-articles/lib.js.
const path = require('path');
const {idle, sql} = require('../../../probe');
const A1 = require('../send-review-to-orcid-confirms-in-silence/lib.js');
const DOAJ = require('../doaj-deposit-takes-other-journals-articles/lib.js');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Settings › Journal › "Masthead": the "Country" select's value and the label shown. */
async function mastheadCountry(page, app) {
    const {SettingsPages} = require(path.join(__dirname, '../../../pages/ContextIdentityPages.js'));
    const form = await new SettingsPages(page, app.contextPath).openJournalTab('Masthead');
    const select = form.control('masthead-country-control');
    await select.waitFor({timeout: T});
    return {
        value: await select.inputValue(),
        label: flat(await select.evaluate((s) => (s.selectedOptions[0] ? s.selectedOptions[0].textContent : null))),
    };
}

/** Settings › Journal › "Masthead": pick `label` in "Country", "Save"; the save's answer and the reasons shown. */
async function setMastheadCountry(page, app, label) {
    const {SettingsPages} = require(path.join(__dirname, '../../../pages/ContextIdentityPages.js'));
    const form = await new SettingsPages(page, app.contextPath).openJournalTab('Masthead');
    await form.control('masthead-country-control').selectOption({label});
    const saved = page.waitForResponse((r) => r.request().method() === 'PUT' && /\/api\/v1\/contexts\/\d+/.test(r.url()), {timeout: T}).catch(() => null);
    await form.saveButton.click();
    const r = await saved;
    await idle(page);
    const errors = (await form.form.locator('.pkpFieldError').allInnerTexts().catch(() => [])).map((t) => flat(t, 160)).filter(Boolean);
    return {status: r ? r.status() : null, errors, country: (await mastheadCountry(page, app)).value};
}

/** Settings › Users & Roles › "ORCID": "City" set to `city` ('' empties it), "Save"; what the tab then holds. */
async function setOrcidCity(page, app, city) {
    const {OrcidSettingsTab} = require(path.join(__dirname, '../../../../../apps', app.name, 'playwright/pages/OrcidPages.js'));
    const tab = new OrcidSettingsTab(page, app.contextPath);
    await tab.goto();
    const box = tab.panel.locator('input[name="orcidCity"]');
    await box.waitFor({timeout: T});
    await box.fill(city);
    await tab.save();
    await idle(page);
    await tab.goto();
    return {city: await tab.panel.locator('input[name="orcidCity"]').inputValue()};
}

/**
 * What a person does to let the job runner work the queue: load a page, a few times, past the job's
 * 5 s retry delay (BaseJob: 3 tries). Stops once no ORCID review job is left in `jobs`.
 */
async function letQueueRun(page, app, {loads = 7, gap = 4500} = {}) {
    const seen = [];
    for (let i = 0; i < loads; i++) {
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`)).catch(() => {});
        await idle(page).catch(() => {});
        await sleep(gap);
        const q = A1.orcidJobs(app);
        seen.push({load: i + 1, queued: q.queued.length, failed: q.failed.length});
        if (!q.queued.length && i >= 1) break;
    }
    return seen;
}

/**
 * Administration › "View Failed Jobs" as the signed-in administrator: the rows, and each listed
 * DepositOrcidReview row's "Details" › "Exception" first line (rows whose id is in `skip` are left out).
 */
async function failedJobs(page, app, skip = []) {
    const list = await DOAJ.readJobsPage(page, app, 'failedJobs');
    const details = [];
    for (const href of list.details) {
        const id = (href.match(/failedJobDetails\/(\d+)/) || [])[1];
        if (skip.includes(id)) continue;
        const rows = await DOAJ.readJobDetails(page, href).catch(() => []);
        const get = (name) => (rows.find((r) => r[0] === name) || [])[1];
        const job = (String(get('Payload') || '').match(/"displayName":\s*"([^"]+)"/) || [])[1] || null;
        details.push({id, job: job && job.replace(/\\\\/g, '\\'), exception: flat((String(get('Exception') || '').match(/"message":\s*"((?:[^"\\]|\\.)*)"/) || [null, String(get('Exception') || '').split('\n')[0]])[1], 300)});
    }
    return {rows: list.rows.map((r) => flat(r, 200)), details};
}

/**
 * The precondition only ORCID's sign-in creates, as A1's ORCID_SQL writes it, preceded by a delete of the
 * same six settings: a user upgraded from 3.3 holds an empty `orcid` row already, and the app's own write
 * (HasOrcid::setVerifiedOrcidOAuthData() through the user's settings) replaces a row rather than adding one.
 */
const ORCID_DELETE = (username) => `delete from user_settings where locale = '' and setting_name in ('orcid', 'orcidIsVerified', 'orcidAccessToken', 'orcidAccessScope', 'orcidRefreshToken', 'orcidAccessExpiresOn') and user_id = (select user_id from users where username = '${username}')`;

function authorizeOrcid(app, username, scope) {
    const query = `${ORCID_DELETE(username)};\n${A1.ORCID_SQL(username, scope)}`;
    sql(app, query);
    return {sql: query, stored: sql(app, `select s.setting_name, s.setting_value from user_settings s join users u using (user_id) where u.username = '${username}' and s.setting_name like 'orcid%' order by 1`).split('\n')};
}

/**
 * What the failure needs of the reviewer: a verified iD, the one setting the Reviewers row reads to offer
 * "Send Review To ORCID" (`reviewerHasOrcid` ← `orcidIsVerified`, lib/pkp Schema map). The job throws at the
 * country check before it reads the reviewer, so no token is needed. Plain SQL, no PostgreSQL-only syntax.
 */
const VERIFIED_SQL = (username) => `delete from user_settings where locale = '' and setting_name in ('orcid', 'orcidIsVerified') and user_id = (select user_id from users where username = '${username}');
insert into user_settings (user_id, locale, setting_name, setting_value) select user_id, '', 'orcid', 'https://sandbox.orcid.org/0000-0002-1825-0097' from users where username = '${username}';
insert into user_settings (user_id, locale, setting_name, setting_value) select user_id, '', 'orcidIsVerified', '1' from users where username = '${username}';`;

function verifyOrcid(app, username) {
    const query = VERIFIED_SQL(username);
    sql(app, query);
    return {sql: query, stored: sql(app, `select s.setting_name, s.setting_value from user_settings s join users u using (user_id) where u.username = '${username}' and s.setting_name like 'orcid%' order by 1`).split('\n')};
}

/** The developer's shortcut to the upgraded state on the `main` dataset: the journal's `country` row deleted. */
const NO_COUNTRY_SQL = "delete from journal_settings where setting_name = 'country' and journal_id = (select journal_id from journals where path = 'publicknowledge');";

function dropCountry(app) {
    sql(app, NO_COUNTRY_SQL);
    return {sql: NO_COUNTRY_SQL, left: sql(app, "select count(*) from journal_settings where setting_name = 'country'").trim()};
}

/** The failed_jobs ids (evidence: which rows a step added). */
function failedIds(app) {
    return sql(app, 'select id from failed_jobs order by id').split('\n').filter(Boolean);
}

module.exports = {T, sleep, flat, ORCID_DELETE, authorizeOrcid, VERIFIED_SQL, verifyOrcid, NO_COUNTRY_SQL, dropCountry, mastheadCountry, setMastheadCountry, setOrcidCity, letQueueRun, failedJobs, failedIds};
