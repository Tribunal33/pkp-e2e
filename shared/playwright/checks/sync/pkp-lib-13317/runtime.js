const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// Kept check for pkp/pkp-lib#13317 (issue #13274), the runtime half: a new submission copies the
// submitting user's profile affiliation into their contributor record verbatim, never as a ROR
// link derived from an exact name match, and fills the submission locale from the user's
// default-locale text when the profile has no value there. Run (OJS; the code is shared lib/pkp):
//   PROBE_FEATURE=sync PROBE_AGENT=pr13274 ONLY=ojs node bin/probe.js ojs shared/playwright/checks/sync/pkp-lib-13317/runtime.js
// Records `runtime-<app>.json`: per seeded submission, the submitter's author_affiliations row(s)
// with their name settings. Expected at the PR ref: one row per author, `ror` null, name en =
// the profile text, and for the fr_CA submission the same text under fr_CA too. Before the PR
// (pkp-lib `40df36903d`): the en submission's row carries the planted ROR and no name.
const {execFileSync} = require('child_process');
const {forEachApp, record, tag} = require('../../../probe');


function psql(app, sql) {
    return execFileSync('psql', ['-h', '127.0.0.1', '-U', 'e2e', `${dbName(app.name)}`, '-Atqc', sql], {
        env: {...process.env, PGPASSWORD: 'e2e'},
        encoding: 'utf8',
    }).trim();
}

forEachApp(async (app) => {
    const scratch = tag('rt13274');
    const author = `${scratch}au`;
    const affiliation = `Probe Registry University ${scratch}`;
    // A syntactically valid id (0 + six chars + two digits) unique to this run, never a real record.
    const PLANTED_ROR = `https://ror.org/0${scratch.replace(/[^a-z0-9]/g, '').slice(-6)}12`;
    await app.api.createContext({
        tag: scratch,
        context: {supportedLocales: ['en', 'fr_CA'], supportedSubmissionLocales: ['en', 'fr_CA']},
        users: [{username: author, roles: ['author']}],
    });
    const userId = psql(app, `select user_id from users where username='${author}'`);
    // The profile affiliation, English only, and a cached registry record with exactly that name.
    psql(app, `insert into user_settings (user_id, locale, setting_name, setting_value) values (${userId}, 'en', 'affiliation', '${affiliation}')`);
    const rorId = psql(app, `insert into rors (ror, display_locale, is_active, search_phrase) values ('${PLANTED_ROR}', 'en', 1, '${affiliation}') returning ror_id`);
    psql(app, `insert into ror_settings (ror_id, locale, setting_name, setting_value) values (${rorId}, 'en', 'name', '${affiliation}')`);

    const out = {planted: {userId, affiliation, ror: PLANTED_ROR}, submissions: {}};
    for (const locale of ['en', 'fr_CA']) {
        const sub = await app.api.createSubmission({
            tag: `${scratch}${locale === 'en' ? 'e' : 'f'}`,
            context: scratch, submitter: author, locale, submitted: false,
        });
        const submissionId = sub.submissionId || sub.id || (sub.submission && sub.submission.id);
        const rows = psql(app, `select json_agg(json_build_object('authorId', a.author_id, 'affiliationId', aa.author_affiliation_id, 'ror', aa.ror, 'names', (select json_object_agg(s.locale, s.setting_value) from author_affiliation_settings s where s.author_affiliation_id=aa.author_affiliation_id and s.setting_name='name'))) from authors a join publications p on p.publication_id=a.publication_id left join author_affiliations aa on aa.author_id=a.author_id where p.submission_id=${submissionId}`);
        out.submissions[locale] = {submissionId, affiliations: JSON.parse(rows || 'null')};
        console.log(`[${app.name}] submission ${submissionId} (${locale}):`, rows);
    }
    record(`runtime-${app.name}`, out);
});
