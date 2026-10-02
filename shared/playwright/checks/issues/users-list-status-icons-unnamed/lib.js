// Helpers for the users-list-status-icons-unnamed walk. Requiring this file
// runs nothing.
const {sql} = require('../../../probe');

/**
 * The precondition only ORCID's service creates: a user with a connected,
 * verified ORCID iD. Writes the user_settings rows
 * PKP\orcid\actions\VerifyIdentityWithOrcid::setIdentityData() writes after
 * ORCID's OAuth answer (orcid as the full URI, orcidIsVerified, the token,
 * scope, refresh token and expiry), nothing else.
 *
 * @param {object} app the probe bag
 * @param {string} username a dataset user
 * @param {string} [orcid] the iD's full URI (ORCID's own test iD by default)
 * @returns {string} the SQL that was run, for the record
 */
function connectOrcid(app, username, orcid = 'https://orcid.org/0000-0002-1825-0097') {
    const rows = [
        ['orcid', orcid],
        ['orcidIsVerified', '1'],
        ['orcidAccessToken', 'u53r4-access-token'],
        ['orcidAccessScope', '/activities/update'],
        ['orcidRefreshToken', 'u53r4-refresh-token'],
        ['orcidAccessExpiresOn', '2046-10-02 00:00:00'],
    ];
    const q =
        `INSERT INTO user_settings (user_id, locale, setting_name, setting_value) ` +
        `SELECT u.user_id, '', v.name, v.value FROM users u, (VALUES ` +
        rows.map(([n, v]) => `('${n}', '${v}')`).join(', ') +
        `) AS v(name, value) WHERE u.username = '${username}';`;
    sql(app, `DELETE FROM user_settings WHERE setting_name LIKE 'orcid%' AND user_id = (SELECT user_id FROM users WHERE username = '${username}');`);
    sql(app, q);
    return q;
}

module.exports = {connectOrcid};
