// Helpers for the users import's password handling (U63 A4, A15, A16) {OJS OMP} on a dataset fleet: the users
// files the two reports' Steps give in full, a sign-in that reports refusal instead of throwing, and the slot's
// Mailpit read by recipient and time. The screens themselves (the tool, "Import Users", the users list) are the
// sibling users-import-unreadable-file-empty-results/lib.js helpers. Requiring this file runs nothing.
const fs = require('fs');
const {signIn, signOut, idle, outFile, sql} = require('../../../probe');

const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

// ------------------------------------------------------------------------------------------------ the files
/** The Reader user group block; 3.5's schema also wants <show_title> (gone on main). */
const groups = (line) => `  <user_groups>
    <user_group>
      <role_id>1048576</role_id>
      <context_id>1</context_id>
      <is_default>true</is_default>
${line === 'stable-3_5_0' ? '      <show_title>true</show_title>\n' : ''}      <permit_self_registration>true</permit_self_registration>
      <permit_metadata_edit>false</permit_metadata_edit>
      <name locale="en">Reader</name>
      <abbrev locale="en">Read</abbrev>
      <stage_assignments></stage_assignments>
      <masthead>false</masthead>
    </user_group>
  </user_groups>
`;
/** One <user> with a Reader role; `password` is the whole <password> element. */
const user = (username, given, family, password) => `    <user>
      <givenname locale="en">${given}</givenname>
      <familyname locale="en">${family}</familyname>
      <email>${username}@mailinator.com</email>
      <username>${username}</username>
      ${password}
      <date_registered>2026-01-15 10:00:00</date_registered>
      <user_user_group>
        <user_group_ref>Reader</user_group_ref>
        <masthead>false</masthead>
      </user_user_group>
    </user>
`;
const file = (line, ...users) => `<?xml version="1.0" encoding="UTF-8"?>
<PKPUsers xmlns="http://pkp.sfu.ca" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://pkp.sfu.ca pkp-users.xsd">
${groups(line)}  <users>
${users.join('')}  </users>
</PKPUsers>
`;
const plain = (v) => `<password><value>${v}</value></password>`;
const hashed = (v) => `<password encryption="sha1"><value>${v}</value></password>`;

/** The Steps' files, their text exactly. Hashes: sha1('jjanssen' . 'jjanssenjjanssen') (a 3.x install's
 *  stored form), bcrypt cost 12 of 'u63ir5newu63ir5new' (this installation's), bcrypt cost 10 of
 *  'u63ir5tenu63ir5ten' (PHP's default before 8.4). */
const files = (line) => ({
    'u63ir5-short.xml': file(line, user('u63ir5short', 'Sam', 'Short', plain('abc')), user('u63ir5empty', 'Emma', 'Empty', plain(''))),
    'u63ir5-fixed.xml': file(line, user('u63ir5short', 'Sam', 'Short', plain('u63ir5shortpass'))),
    'u63ir5-existing.xml': file(line, user('jjanssen', 'Julie', 'Janssen', hashed('2ac1751ea5fd8a154b780c09da24ccff3f04bbe1'))),
    'u63ir5-new.xml': file(line, user('u63ir5new', 'Nora', 'New', hashed('$2y$12$.51wKGk6L430Nc5Z7h/aiuZVHvr70xCsP5yunx6GqjYGpXbE/uEua'))),
    'u63ir5-ten.xml': file(line, user('u63ir5ten', 'Tom', 'Ten', hashed('$2y$10$J2LMIZ8ZlFutmhGS4hEWmer5V7El9jvLTiShqKPchxA5cXzgwepO2'))),
});
/** Write a file of the Steps for the line (`app.line`, null on main) into the run folder; returns its path. */
function writeFile(name, line = null) {
    const f = outFile(name);
    fs.writeFileSync(f, files(line)[name]);
    return f;
}

// ------------------------------------------------------------------------------------------------ sign-in
/** The login form with a given password; returns {ok, landed, error} instead of throwing on refusal. */
async function trySignIn(page, username, password) {
    try {
        await signIn(page, username, {password});
        await page.waitForLoadState('domcontentloaded').catch(() => {});
        await idle(page).catch(() => {});
        const landed = new URL(page.url()).pathname;
        await signOut(page).catch(() => {});
        return {ok: true, landed};
    } catch (e) {
        const error = flat(await page.locator('.pkp_form_error, [role="alert"], .cmp_notification').first().innerText().catch(() => null), 200);
        return {ok: false, landed: new URL(page.url()).pathname, error};
    }
}

// ------------------------------------------------------------------------------------------------ mail
/** Messages to `to` that Mailpit received since `since` (a Date): subject, sender and the text's first line. */
async function mailSince(app, to, since) {
    const res = await app.mail._search({to});
    const msgs = (res.messages || []).filter((m) => new Date(m.Created) >= since);
    const out = [];
    for (const m of msgs) {
        const full = await app.mail.fullMessage(m.ID).catch(() => ({}));
        out.push({subject: m.Subject, from: (m.From || {}).Address, created: m.Created, text: flat(full.Text, 300)});
    }
    return out;
}

// ------------------------------------------------------------------------------------------------ evidence
/** Whether the stored password is a bcrypt hash (and its cost), and the must-change flag, of the named accounts (Evidence only). */
function stored(app, usernames) {
    try {
        const list = usernames.map((u) => `'${u}'`).join(',');
        return sql(app, `select username || ' bcrypt=' || case when password like '$2y$%' then substr(password,5,2) else 'no' end || ' must_change=' || coalesce(must_change_password::text,'null') from users where username in (${list}) order by username`).split('\n').filter(Boolean);
    } catch (e) { return [`sql error: ${flat(e.message, 200)}`]; }
}

module.exports = {flat, files, writeFile, trySignIn, mailSince, stored};
