const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// Kept check for pkp/pkp-lib#13317 (issue #13274), the upgrade half. The fleets never upgrade, so
// the rewritten I7135 migration is driven directly: eight submissions by one author give eight
// author rows, `migrate-driver.php` plants the issue's eight legacy cases on them (comment
// https://github.com/pkp/pkp-lib/issues/13274#issuecomment-5524949158) and calls
// migrateAffiliations() with the cache marked complete, then again marked failed. Run (OJS):
//   PROBE_FEATURE=sync PROBE_AGENT=pr13274 ONLY=ojs node bin/probe.js ojs shared/playwright/checks/sync/pkp-lib-13317/migration.js
// Records `migration-<app>-{complete,failed}.json`; `expected` on each case is the issue's table.
const {execFileSync} = require('child_process');
const path = require('path');
const fs = require('fs');
const {forEachApp, record, tag} = require('../../../probe');

const IN_CACHE = 'https://ror.org/0cached12';
const NOT_IN_CACHE = 'https://ror.org/0typo0099';

function psql(app, sql) {
    return execFileSync('psql', ['-h', '127.0.0.1', '-U', 'e2e', `${dbName(app.name)}`, '-Atqc', sql], {
        env: {...process.env, PGPASSWORD: 'e2e'}, encoding: 'utf8',
    }).trim();
}

forEachApp(async (app) => {
    const scratch = tag('mig13274');
    const author = `${scratch}au`;
    await app.api.createContext({tag: scratch, users: [{username: author, roles: ['author']}]});
    const authorIds = [];
    for (let i = 0; i < 8; i++) {
        const sub = await app.api.createSubmission({tag: `${scratch}s${i}`, context: scratch, submitter: author, submitted: false});
        const submissionId = sub.submissionId || sub.id || (sub.submission && sub.submission.id);
        authorIds.push(Number(psql(app, `select a.author_id from authors a join publications p on p.publication_id=a.publication_id where p.submission_id=${submissionId} order by a.author_id limit 1`)));
    }
    const text = {en: `Legacy University ${scratch}`};
    const cases = [
        {authorId: authorIds[0], affiliation: text, rorId: null, expected: {rows: 1, ror: null, name: true}},
        {authorId: authorIds[1], affiliation: text, rorId: IN_CACHE, expected: {rows: 1, ror: IN_CACHE, name: false}},
        {authorId: authorIds[2], affiliation: null, rorId: IN_CACHE, expected: {rows: 1, ror: IN_CACHE, name: false}},
        {authorId: authorIds[3], affiliation: text, rorId: NOT_IN_CACHE, expected: {complete: {rows: 1, ror: null, name: true}, failed: {rows: 1, ror: NOT_IN_CACHE, name: true}}},
        {authorId: authorIds[4], affiliation: null, rorId: NOT_IN_CACHE, expected: {complete: {rows: 0}, failed: {rows: 1, ror: NOT_IN_CACHE, name: false}}},
        {authorId: authorIds[5], affiliation: text, rorId: 'not a ror', expected: {rows: 1, ror: null, name: true}},
        {authorId: authorIds[6], affiliation: null, rorId: 'https://ror.org/046ak2485-bb', expected: {rows: 0}},
        {authorId: authorIds[7], affiliation: text, rorId: '0cached12/', expected: {rows: 1, ror: IN_CACHE, name: false, note: 'bare id with trailing slash, normalised'}},
    ];
    for (const complete of [true, false]) {
        const caseFile = path.join(process.cwd(), '.reports', 'sync', 'pr13274-cases.json');
        fs.mkdirSync(path.dirname(caseFile), {recursive: true});
        fs.writeFileSync(caseFile, JSON.stringify({complete, cases, cache: [IN_CACHE]}));
        const out = execFileSync('php', [path.resolve(__dirname, 'migrate-driver.php'), caseFile], {
            cwd: path.resolve(app.root),
            env: {...process.env, PKP_CONFIG_FILE: path.resolve(app.root, 'config.test.inc.php')},
            encoding: 'utf8',
        });
        const parsed = JSON.parse(out);
        for (const r of parsed.results) {
            const exp = r.case.expected.complete || r.case.expected.failed ? r.case.expected[complete ? 'complete' : 'failed'] : r.case.expected;
            r.verdict = r.rows.length === exp.rows
                && (exp.rows === 0 || (r.rows[0].ror === exp.ror && (Object.keys(r.rows[0].names).length > 0) === exp.name))
                ? 'as expected' : 'MISMATCH';
            console.log(`[${app.name}] cache ${complete ? 'complete' : 'failed'} author ${r.case.authorId} rorId=${JSON.stringify(r.case.rorId)} name=${r.case.affiliation ? 'yes' : 'no'} → ${JSON.stringify(r.rows)} · ${r.verdict}`);
        }
        record(`migration-${app.name}-${complete ? 'complete' : 'failed'}`, parsed);
    }
});
