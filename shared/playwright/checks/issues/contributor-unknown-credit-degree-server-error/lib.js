// Helpers of walk.js here (U41 A29). Requiring this file runs nothing.
const path = require('path');
const {execFileSync} = require('child_process');
const {sql} = require('../../../probe');

const CREDIT = 'https://credit.niso.org/contributor-roles/';
/** A CRediT role's identifier from its slug ("conceptualization", "data-curation", "software"). */
const role = (slug) => `${CREDIT}${slug}/`;

/** The stored contributor id of `given` on the submission's latest publication. */
function authorId(app, submissionId, given) {
    const q = `select a.author_id from authors a join publications p on p.publication_id = a.publication_id
        join author_settings s on s.author_id = a.author_id and s.setting_name = 'givenName' and s.locale = 'en'
        where p.submission_id = ${Number(submissionId)} and s.setting_value = '${given.replace(/'/g, "''")}'
        order by p.publication_id desc limit 1`;
    const v = sql(app, q.replace(/\s+/g, ' '));
    return v ? Number(v) : null;
}

/** What the database holds for the contributor: English given name, type, CRediT roles (slug and degree). */
function stored(app, id) {
    const given = sql(app, `select setting_value from author_settings where author_id = ${id} and setting_name = 'givenName' and locale = 'en'`);
    const hasType = sql(app, `select count(*) from information_schema.columns where table_name = 'authors' and column_name = 'contributor_type'`) !== '0';
    const type = hasType ? sql(app, `select contributor_type from authors where author_id = ${id}`) : null;
    const hasCredit = sql(app, `select to_regclass('credit_contributor_roles') is not null`) === 't';
    const credit = hasCredit
        ? sql(
              app,
              `select replace(replace(r.credit_role_identifier, '${CREDIT}', ''), '/', '') || ' ' || coalesce(c.credit_degree::text, '-') from credit_contributor_roles c join credit_roles r on r.credit_role_id = c.credit_role_id where c.contributor_id = ${id} order by r.credit_role_id`,
          )
              .split('\n')
              .filter(Boolean)
        : null;
    return {given, type, credit};
}

/** Run seam.php: the API handler's validate() and, when it passes, edit(), on contributor `id`. */
function seam(app, id, params) {
    const REPO = path.resolve(__dirname, '../../../../..');
    const root = path.resolve(REPO, app.root);
    let out;
    try {
        out = execFileSync('php', [path.join(__dirname, 'seam.php'), String(id), JSON.stringify(params)], {
            cwd: root,
            env: {...process.env, PKP_CONFIG_FILE: path.resolve(REPO, app.configFile)},
            encoding: 'utf8',
            timeout: 120_000,
        });
    } catch (e) {
        return {failed: `${e.stdout || ''}${e.stderr || ''}`.slice(0, 1500)};
    }
    const line = out.trim().split('\n').filter((l) => l.startsWith('{')).pop();
    try {
        return JSON.parse(line);
    } catch {
        return {raw: out.slice(0, 1500)};
    }
}

/** The options of a select as shown, in order. */
const optionTexts = (sel) => sel.evaluate((el) => [...el.options].map((o) => o.innerText.trim()));

/**
 * Set `api_key_secret` in the dataset fleet's config (the dataset leaves it empty, so no API key can
 * be made); the reset rewrites the config, so call it after each reset. A team install sets it in
 * config.inc.php.
 */
function setApiKeySecret(app, secret = 'hkk4-api-key-secret-for-testing') {
    const fs = require('fs');
    const REPO = path.resolve(__dirname, '../../../../..');
    const file = path.resolve(REPO, app.configFile);
    const before = fs.readFileSync(file, 'utf8');
    const after = before.replace(/^api_key_secret\s*=.*$/m, `api_key_secret = "${secret}"`);
    fs.writeFileSync(file, after);
    return (after.match(/^api_key_secret\s*=.*$/m) || [])[0];
}

/** One REST API call with curl, as a developer would send it: Bearer token, JSON body. */
function curl(method, url, token, body = null) {
    const args = ['-s', '-o', '-', '-w', '\n%{http_code}', '-X', method, '-H', `Authorization: Bearer ${token}`, '-H', 'Accept: application/json'];
    if (body) args.push('-H', 'Content-Type: application/json', '--data-binary', JSON.stringify(body));
    args.push(url);
    const out = execFileSync('curl', args, {encoding: 'utf8', timeout: 60_000});
    const i = out.lastIndexOf('\n');
    const text = out.slice(0, i);
    let json = null;
    try {
        json = JSON.parse(text);
    } catch {}
    return {status: Number(out.slice(i + 1)), json, text: json ? null : text.slice(0, 600)};
}

/** The contributor's affiliations as stored (id and English name). */
function storedAffiliations(app, id) {
    return sql(
        app,
        `select a.author_affiliation_id || ' ' || coalesce((select setting_value from author_affiliation_settings s where s.author_affiliation_id = a.author_affiliation_id and s.setting_name = 'name' and s.locale = 'en'), coalesce(a.ror, '-')) from author_affiliations a where a.author_id = ${id} order by 1`,
    )
        .split('\n')
        .filter(Boolean);
}

/** The contributor's family name and email as stored. */
function storedPerson(app, id) {
    return {
        family: sql(app, `select setting_value from author_settings where author_id = ${id} and setting_name = 'familyName' and locale = 'en'`),
        email: sql(app, `select email from authors where author_id = ${id}`),
    };
}

module.exports = {CREDIT, role, authorId, stored, seam, optionTexts, setApiKeySecret, curl, storedAffiliations, storedPerson};
