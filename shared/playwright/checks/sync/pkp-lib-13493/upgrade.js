// PR review check — pkp/pkp-lib#13283 on `main`: pkp-lib#13493 + ojs#5920, omp#2503, ops#1444, the
// part only an upgrade runs: PKP\migration\upgrade\v3_5_0\I13283_RestoreDegradedOrcidFunctionality,
// which the app PRs name twice in dbscripts/xml/upgrade.xml (the block for installs older than 3.5,
// `3.1.0.0`–`3.4.9.9`, and the `3.5.0.0`–`3.5.0.99` block). The suites install `main` afresh and
// never reach it: this check loads PKP's default dataset of an older branch, once per case, plants
// rows before the upgrade, runs `php tools/upgrade.php upgrade` with the checkout's code under the
// fleet's config and records what the tool says and what the install then holds. Drives a dataset
// fleet (it reloads the database), one source branch per run:
//
//   npm run fetch-datasets -- --line stable-3_4_0 --line stable-3_3_0
//   PKP_E2E_DATASET_BRANCH=stable-3_5_0 npm run fleet-prep -- --feature pr13493c --dataset 3 --reset
//   PKP_E2E_DATASET_BRANCH=stable-3_5_0 PROBE_FEATURE=pr13493c PROBE_AGENT=<id> node bin/probe.js all \
//     shared/playwright/checks/sync/pkp-lib-13493/upgrade.js
//
// The fleet-prep line runs once: it writes the fleet's config from the 3.5 dataset's config.inc.php
// (the nearest to what `main` reads: `locale = en`, an `app_key`) and starts the server. The check
// loads the dump of PKP_E2E_DATASET_BRANCH itself, so `stable-3_4_0` and `stable-3_3_0` are the
// second line alone with that variable changed, under the same config (the result names the config
// file's source). CASES=a,b narrows the cases. The cases:
//
//   from stable-3_5_0 (the `3.5.0.0`–`3.5.0.99` block)
//   - `as-shipped`: nothing planted; after the upgrade the same press and mail as `old-shape` below,
//     here from the default template.
//   - `old-shape`: the default bodies of the three ORCID keys (en, fr_CA) put back to what pkp-lib
//     held before the change reached that branch (OLD_AT, read with `git show` from locale/*/emails.po),
//     plus, for each key, a template customized by the context as the Emails screen stores one: an
//     `email_templates` row (key, context, no alternate_to) with `email_templates_settings` rows
//     name, subject and body per locale (EntityDAO::insert of the edited default template). The
//     customized bodies hold {$authorName}, {$principalContactSignature} and a sentence of their own
//     (sentence()). After the upgrade the migration is run a second time as the issue words it
//     (`php lib/pkp/tools/migration.php "\PKP\…\I13283_RestoreDegradedOrcidFunctionality" up`) and the
//     rows are compared; then, through the screens as `dbarnes`: Settings › Users & Roles › "ORCID"
//     ("Public Sandbox", Client ID APP-TEST, Client Secret test-secret), "Request verification" on
//     the first contributor without an iD of the first unpublished submission, and the mail that
//     goes out.
//   - `config-line`: `[orcidProfilePlugin]` `orcid_redirect_base_url = "https://old.example.org/"`
//     appended to the fleet's config before the upgrade (taken out again after the case).
//   - `config-line-and-setting`: that line, plus a `site_settings` row `orcidCustomRedirectBaseUrl`
//     = https://new.example.org/ already there before the upgrade.
//   from stable-3_4_0 (the pre-3.5 block; ORCID was the ORCID Profile plugin there)
//   - `as-shipped`, `config-line`, and
//   - `orcid-plugin-customized`: the plugin's settings for the context, the rows the 3.5 migration
//     I9771_OrcidMigration::movePluginSettings() reads (plugin_settings, `orcidprofileplugin`:
//     enabled, orcidProfileAPIPath, orcidClientId, orcidClientSecret), and a customized
//     "ORCID_COLLECT_AUTHOR_ID" template whose bodies are the dump's own default bodies with the
//     sentence appended; after the upgrade the press and the mail. Skipped where the dump holds no
//     such default (OMP 3.4 shipped no plugin).
//   from stable-3_3_0: `as-shipped`.
//
// Facts go to result-<pkp-lib sha>-<branch>-<app>.json: per case the tool's exit code and last
// line, the version before and after, and for every default and customized body of the three keys
// the `{$…}` variables it carries (before the upgrade, after it, after the second run), the
// `site_settings` rows named orcid*, and the mail. The tool's whole output goes to
// upgrade-<sha>-<branch>-<case>-<app>.log, the second run's to second-run-…log with the rows
// before and after it beside (rows-…txt). No assertions. At a commit where upgrade.xml does not name
// the migration and the class file does not exist, the second run records what the tool says and
// the check goes on.
const {execFileSync, spawnSync} = require('child_process');
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, idle, shot, record, outFile} = require('../../../probe');

process.env.PKP_E2E_DATASET_BRANCH = process.env.PKP_E2E_DATASET_BRANCH || 'stable-3_5_0';
const BRANCH = process.env.PKP_E2E_DATASET_BRANCH;
const {datasetFleet, loadDump, dropStaleUsageLogs, campaignCredentials, contextTables, query} = require('../../../dataset');

const MIGRATION = '\\PKP\\migration\\upgrade\\v3_5_0\\I13283_RestoreDegradedOrcidFunctionality';
const MIGRATION_FILE = 'lib/pkp/classes/migration/upgrade/v3_5_0/I13283_RestoreDegradedOrcidFunctionality.php';
const KEYS = ['ORCID_COLLECT_AUTHOR_ID', 'ORCID_REQUEST_AUTHOR_AUTHORIZATION', 'ORCID_REQUEST_UPDATE_SCOPE'];
const PO_KEYS = {
    ORCID_COLLECT_AUTHOR_ID: 'emails.orcidCollectAuthorId.body',
    ORCID_REQUEST_AUTHOR_AUTHORIZATION: 'emails.orcidRequestAuthorAuthorization.body',
    ORCID_REQUEST_UPDATE_SCOPE: 'emails.orcidRequestUpdateScope.body',
};
const WATCHED = ['authorName', 'recipientName', 'principalContactSignature', 'contextSignature', 'submissionTitle'];
const OLD_AT = 'c069fcb30d^'; // pkp-lib stable-3_5_0 before "pkp/pkp-lib#13155 ORCID Emails - Author name and article title missing" (2026-10-01)
const CONFIG_MARK = '; pkp-lib-13493 upgrade.js';
const CONFIG_LINES = `\n${CONFIG_MARK}\n[orcidProfilePlugin]\norcid_redirect_base_url = "https://old.example.org/"\n`;
const OLD_URL = 'https://old.example.org/';
const NEW_URL = 'https://new.example.org/';
const CUSTOM_SUBJECT = {en: 'Customized ORCID request', fr_CA: 'Demande ORCID personnalisée'};
const sentence = (key, locale) =>
    locale === 'fr_CA' ? `Cette phrase a été écrite par la rédaction elle-même (${key}).` : `This sentence was written by the editors themselves (${key}).`;
const customBody = (key, locale) =>
    `<p>${locale === 'fr_CA' ? 'Bonjour' : 'Dear'} {$authorName},</p><p>${sentence(key, locale)}</p>` +
    '<p><a href="{$authorOrcidUrl}">Register or connect your ORCID iD</a></p>' +
    '<p><a href="{$orcidAboutUrl}">More information about ORCID at {$contextName}</a></p><p>{$principalContactSignature}</p>';

const CASES = {
    'stable-3_5_0': [
        {name: 'as-shipped', mail: true},
        {name: 'old-shape', oldShape: true, customized: 'own', secondRun: true, mail: true},
        {name: 'config-line', configLine: true},
        {name: 'config-line-and-setting', configLine: true, setting: NEW_URL},
    ],
    'stable-3_4_0': [{name: 'as-shipped'}, {name: 'config-line', configLine: true}, {name: 'orcid-plugin-customized', plugin: true, customized: 'default-plus', mail: true}],
    'stable-3_3_0': [{name: 'as-shipped'}],
}[BRANCH];
const only = (process.env.CASES || '').split(',').filter(Boolean);

const q = (text) => `$pr13493$${text}$pr13493$`; // dollar-quoted SQL literal: the bodies hold quotes
const last = (output) => (output.trim().split('\n').pop() || '').slice(0, 300);
const flat = (text) => String(text || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/** One msgstr of a .po file, its quoted lines joined. */
function poString(text, key) {
    const lines = text.split('\n');
    const at = lines.indexOf(`msgid "${key}"`);
    if (at === -1) return null;
    let out = '';
    for (let i = at + 1; i < lines.length; i++) {
        const m = lines[i].match(/^(?:msgstr )?(".*")\s*$/);
        if (!m) break;
        out += JSON.parse(m[1]);
    }
    return out;
}

/** locale/<locale>/emails.po of pkp-lib at OLD_AT, from the checkout's own clone, else the 3.5 line's. */
function oldPo(root, appName, locale) {
    for (const repo of [path.join(root, 'lib/pkp'), path.resolve(root, '..', 'stable-3_5_0', appName, 'lib/pkp')]) {
        const run = spawnSync('git', ['-C', repo, 'show', `${OLD_AT}:locale/${locale}/emails.po`], {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
        if (run.status === 0) return run.stdout;
    }
    return null;
}

function bodyFacts(row) {
    const [length, md5, variables] = row;
    const vars = (variables || '').split(',').filter(Boolean);
    const out = {length: Number(length), md5, variables: vars};
    for (const name of WATCHED) out[name] = vars.includes(name);
    return out;
}

const VARS_OF = (column) => `coalesce(length(${column}), 0), md5(coalesce(${column}, '')), (SELECT string_agg(DISTINCT m[1], ',' ORDER BY m[1]) FROM regexp_matches(coalesce(${column}, ''), '\\{\\$(\\w+)\\}', 'g') m)`;

/** What the install holds for the three keys: default bodies, customized bodies, the site's ORCID settings. */
function holds(fleet) {
    const out = {defaults: {}, customized: {}, siteSettings: {}};
    const keys = KEYS.map((key) => `'${key}'`).join(', ');
    for (const [key, locale, ...rest] of query(fleet, `SELECT email_key, locale, ${VARS_OF('body')} FROM email_templates_default_data WHERE email_key IN (${keys}) AND locale IN ('en', 'en_US', 'fr_CA') ORDER BY 1, 2`)) {
        out.defaults[`${key} ${locale}`] = bodyFacts(rest);
    }
    const rows = query(
        fleet,
        `SELECT t.email_key, s.locale, t.context_id, ${VARS_OF('s.setting_value')}, ${KEYS.map((key) => `(strpos(coalesce(s.setting_value, ''), ${q(sentence(key, 'en'))}) > 0 OR strpos(coalesce(s.setting_value, ''), ${q(sentence(key, 'fr_CA'))}) > 0)`).join(' OR ')} ` +
            `FROM email_templates t JOIN email_templates_settings s ON s.email_id = t.email_id WHERE t.email_key IN (${keys}) AND s.setting_name = 'body' ORDER BY 1, 2`,
    );
    for (const [key, locale, contextId, length, md5, variables, kept] of rows) {
        out.customized[`${key} ${locale}`] = {contextId: Number(contextId), ...bodyFacts([length, md5, variables]), sentenceKept: kept === 't'};
    }
    for (const [name, locale, value] of query(fleet, "SELECT setting_name, locale, coalesce(setting_value, '<null>') FROM site_settings WHERE setting_name ILIKE 'orcid%' ORDER BY 1, 2")) {
        const text = /secret/i.test(name) && value ? '<set>' : value; // never a secret in a file
        out.siteSettings[name] = out.siteSettings[name] === undefined ? text : [].concat(out.siteSettings[name], text);
    }
    out.orcidCustomRedirectBaseUrl = out.siteSettings.orcidCustomRedirectBaseUrl === undefined ? 'no row' : out.siteSettings.orcidCustomRedirectBaseUrl;
    return out;
}

/** The three keys' rows as text, with and without their generated ids. */
function rowsDump(fleet, {ids}) {
    const keys = KEYS.map((key) => `'${key}'`).join(', ');
    const copy = (sql) => execFileSync('psql', ['-X', '-d', fleet.db, '-c', `COPY (${sql}) TO STDOUT`], {encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
    const id = (column) => (ids ? `${column}, ` : '');
    return (
        `-- email_templates_default_data\n${copy(`SELECT ${id('email_templates_default_data_id')}email_key, locale, name, subject, body FROM email_templates_default_data WHERE email_key IN (${keys}) ORDER BY email_key, locale`)}` +
        `-- email_templates\n${copy(`SELECT ${id('email_id')}email_key, context_id, alternate_to FROM email_templates WHERE email_key IN (${keys}) ORDER BY email_key, context_id`)}` +
        `-- email_templates_settings\n${copy(`SELECT ${id('s.email_template_setting_id')}t.email_key, s.locale, s.setting_name, s.setting_value FROM email_templates t JOIN email_templates_settings s ON s.email_id = t.email_id WHERE t.email_key IN (${keys}) ORDER BY t.email_key, s.locale, s.setting_name`)}` +
        `-- site_settings\n${copy("SELECT setting_name, locale, setting_value FROM site_settings WHERE setting_name = 'orcidCustomRedirectBaseUrl' ORDER BY 1, 2")}`
    );
}

/** A customized template of the context, stored as EntityDAO::insert stores an edited default one. */
function plantCustomized(fleet, contextId, key, mode) {
    const emailId = query(fleet, `INSERT INTO email_templates (email_key, context_id, alternate_to) VALUES ('${key}', ${contextId}, NULL) RETURNING email_id`)[0][0];
    const locales = query(fleet, `SELECT locale FROM email_templates_default_data WHERE email_key = '${key}' AND locale IN ('en', 'fr_CA') ORDER BY 1`).map((row) => row[0]);
    for (const locale of locales) {
        const from = `FROM email_templates_default_data WHERE email_key = '${key}' AND locale = '${locale}'`;
        const subject = mode === 'own' ? q(CUSTOM_SUBJECT[locale]) : 'subject';
        const body = mode === 'own' ? q(customBody(key, locale)) : `body || ${q(`<p>${sentence(key, locale)}</p>`)}`;
        query(fleet, `INSERT INTO email_templates_settings (email_id, locale, setting_name, setting_value) SELECT ${emailId}, '${locale}', 'name', name ${from}`);
        query(fleet, `INSERT INTO email_templates_settings (email_id, locale, setting_name, setting_value) SELECT ${emailId}, '${locale}', 'subject', ${subject} ${from}`);
        query(fleet, `INSERT INTO email_templates_settings (email_id, locale, setting_name, setting_value) SELECT ${emailId}, '${locale}', 'body', ${body} ${from}`);
    }
    return {emailId: Number(emailId), locales};
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('this check drives a dataset fleet: fleet-prep --dataset (see the header)');
    if (!CASES) throw new Error(`no cases for PKP_E2E_DATASET_BRANCH=${BRANCH} (stable-3_5_0, stable-3_4_0 or stable-3_3_0)`);
    const pages = require(path.join(app.suiteDir || process.env.PKP_SUITE_DIR, 'pages', 'OrcidPages.js'));
    const fleet = datasetFleet(app.name, app.dataset);
    const root = path.resolve(fleet.root);
    const env = {...process.env, PKP_CONFIG_FILE: path.resolve(fleet.configFile)};
    const sha = execFileSync('git', ['-C', path.join(root, 'lib/pkp'), 'rev-parse', '--short=10', 'HEAD'], {encoding: 'utf8'}).trim();
    const upgradeXml = fs.readFileSync(path.join(root, 'dbscripts/xml/upgrade.xml'), 'utf8');
    const resultName = `result-${sha}-${BRANCH}`;
    const R = {
        app: app.name,
        pkpLib: sha,
        branch: BRANCH,
        dataset: fleet.source.replace(/^.*checkouts\//, 'checkouts/'),
        configFrom: (fs.readFileSync(fleet.configFile, 'utf8').match(/^; Generated by \S+ from (\S+)/) || [])[1] || '?',
        upgradeXmlNamesMigration: (upgradeXml.match(/I13283_RestoreDegradedOrcidFunctionality/g) || []).length,
        migrationClassFile: fs.existsSync(path.join(root, MIGRATION_FILE)),
        cases: [],
    };
    // a narrowed run (CASES=…) keeps the other cases an earlier run of this commit and branch recorded
    try {
        const earlier = JSON.parse(fs.readFileSync(outFile(`${resultName}.json`), 'utf8'));
        if (only.length && earlier.pkpLib === sha) R.cases = earlier.cases.filter((x) => !only.includes(x.case));
    } catch {
        // no earlier result
    }
    // a config line an interrupted run left behind
    const config = fs.readFileSync(fleet.configFile, 'utf8').split(`\n${CONFIG_MARK}`)[0];
    fs.writeFileSync(fleet.configFile, config);
    const version = () => (query(fleet, "SELECT major || '.' || minor || '.' || revision || '.' || build FROM versions WHERE current = 1 AND product_type = 'core'")[0] || ['?'])[0];

    for (const c of CASES.filter((x) => !only.length || only.includes(x.name))) {
        const facts = {case: c.name};
        const tagged = `${sha}-${BRANCH}-${c.name}`;
        try {
            // the branch's database and files afresh
            loadDump(fleet, campaignCredentials(fleet));
            fs.rmSync(fleet.filesDir, {recursive: true, force: true});
            fs.cpSync(path.join(fleet.source, 'files'), fleet.filesDir, {recursive: true});
            // The 3.4 pre-flight check (an upgrade from 3.3) refuses the dataset's own usage event log:
            // one dated before yesterday "must be processed or removed", a newer one names the
            // dataset's host, not the fleet's ("The base_url in config.inc.php should be the same as
            // in URLs in the usage stats log file."). The log is not under test: both go.
            const logs = path.join(fleet.filesDir, 'usageStats', 'usageEventLogs');
            const removed = dropStaleUsageLogs(fleet);
            if (BRANCH === 'stable-3_3_0' && fs.existsSync(logs)) {
                for (const file of fs.readdirSync(logs).filter((name) => /^usage_events_\d{8}\.log$/.test(name))) {
                    fs.rmSync(path.join(logs, file));
                    removed.push(file);
                }
            }
            if (removed.length) facts.usageLogsRemoved = removed;
            fs.rmSync(fleet.cacheDir, {recursive: true, force: true});
            fs.mkdirSync(fleet.cacheDir, {recursive: true});
            const tables = contextTables(fleet); // OPS 3.3 keeps its servers in `journals`
            const contextId = query(fleet, `SELECT ${tables.id} FROM ${tables.table} ORDER BY 1 LIMIT 1`)[0][0];
            facts.versionLoaded = version();
            facts.dumpHolds = holds(fleet);

            if (c.plugin && !facts.dumpHolds.defaults['ORCID_COLLECT_AUTHOR_ID en']) {
                facts.skipped = 'the dump holds no ORCID_COLLECT_AUTHOR_ID default: no ORCID Profile plugin in this app on this branch';
                console.log(`[${app.name}] pkp-lib ${sha} ${BRANCH} ${c.name}: skipped, ${facts.skipped}`);
                R.cases.push(facts);
                continue;
            }
            facts.planted = {};
            if (c.oldShape) {
                facts.planted.oldBodies = {};
                for (const locale of ['en', 'fr_CA']) {
                    const po = oldPo(root, app.name, locale);
                    for (const key of KEYS) {
                        const body = po ? poString(po, PO_KEYS[key]) : null;
                        if (!body) {
                            facts.planted.oldBodies[`${key} ${locale}`] = po ? `no string at ${OLD_AT}: row left as the dump has it` : `git show ${OLD_AT} failed: row left as the dump has it`;
                            continue;
                        }
                        const updated = query(fleet, `UPDATE email_templates_default_data SET body = ${q(body)} WHERE email_key = '${key}' AND locale = '${locale}' RETURNING 'set'`).filter((row) => row[0] === 'set').length; // psql prints the command tag as a row too
                        facts.planted.oldBodies[`${key} ${locale}`] = `${updated} row set from pkp-lib ${OLD_AT} locale/${locale}/emails.po`;
                    }
                }
            }
            if (c.customized) {
                facts.planted.customized = {};
                for (const key of c.customized === 'own' ? KEYS : ['ORCID_COLLECT_AUTHOR_ID']) {
                    facts.planted.customized[key] = plantCustomized(fleet, contextId, key, c.customized);
                }
            }
            if (c.plugin) {
                const rows = [['enabled', '1', 'bool'], ['orcidProfileAPIPath', 'https://pub.sandbox.orcid.org/', 'string'], ['orcidClientId', 'APP-TEST', 'string'], ['orcidClientSecret', 'test-secret', 'string']];
                for (const [name, value, type] of rows) {
                    query(fleet, `INSERT INTO plugin_settings (plugin_name, context_id, setting_name, setting_value, setting_type) VALUES ('orcidprofileplugin', ${contextId}, '${name}', '${value}', '${type}')`);
                }
                facts.planted.pluginSettings = rows.map(([name]) => name);
            }
            if (c.setting) {
                // the dump may hold the row already, empty (the 3.5 branch has the field since 2026-10-02)
                const set = query(fleet, `UPDATE site_settings SET setting_value = '${c.setting}' WHERE setting_name = 'orcidCustomRedirectBaseUrl' RETURNING 'set'`).filter((row) => row[0] === 'set').length;
                if (!set) query(fleet, `INSERT INTO site_settings (setting_name, locale, setting_value) VALUES ('orcidCustomRedirectBaseUrl', '', '${c.setting}')`);
                facts.planted.siteSetting = `${c.setting} (${set ? "the dump's own row, which was empty, set" : 'a row added'})`;
            }
            if (c.configLine) {
                fs.writeFileSync(fleet.configFile, config + CONFIG_LINES);
                facts.planted.configLine = `[orcidProfilePlugin] orcid_redirect_base_url = "${OLD_URL}"`;
            }
            facts.beforeUpgrade = holds(fleet);

            const run = spawnSync('php', ['tools/upgrade.php', 'upgrade'], {cwd: root, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024});
            const output = `${run.stdout || ''}${run.stderr || ''}`;
            fs.writeFileSync(outFile(`upgrade-${tagged}.log`), output);
            facts.exit = run.status;
            facts.said = ((output.match(/^(ERROR: Upgrade failed: .*|Successfully upgraded to version .*)$/m) || [])[1] || last(output)).slice(0, 300);
            facts.ranMigration = (output.match(/I13283_RestoreDegradedOrcidFunctionality/g) || []).length; // times the tool's log names it
            facts.versionAfter = version();
            facts.afterUpgrade = holds(fleet);

            if (run.status === 0 && c.secondRun) {
                // the issue's own command, a second time
                const before = {ids: rowsDump(fleet, {ids: true}), content: rowsDump(fleet, {ids: false})};
                const again = spawnSync('php', ['lib/pkp/tools/migration.php', MIGRATION, 'up'], {cwd: root, env, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 300_000});
                const said = `${again.stdout || ''}${again.stderr || ''}`;
                fs.writeFileSync(outFile(`second-run-${tagged}.log`), said);
                const after = {ids: rowsDump(fleet, {ids: true}), content: rowsDump(fleet, {ids: false})};
                fs.writeFileSync(outFile(`rows-before-second-run-${tagged}.txt`), before.ids);
                fs.writeFileSync(outFile(`rows-after-second-run-${tagged}.txt`), after.ids);
                facts.secondRun = {
                    command: `php lib/pkp/tools/migration.php "${MIGRATION}" up`,
                    classFileExists: R.migrationClassFile,
                    exit: again.status,
                    said: last(said) || '(no output)',
                    contentChanged: before.content !== after.content, // key, locale, name, subject, body; the settings; the site row
                    generatedIdsChanged: before.ids !== after.ids, // the wholesale re-install deletes and inserts the default rows
                    holds: holds(fleet),
                };
            }

            if (run.status === 0 && c.mail) {
                // through the screens: ORCID on for the context, "Request verification" on a contributor without an iD
                const {page, close} = await launch(app);
                const mail = (facts.mail = {});
                try {
                    const pick = query(
                        fleet,
                        "SELECT s.submission_id, a.email, (SELECT setting_value FROM author_settings x WHERE x.author_id = a.author_id AND x.setting_name = 'givenName' AND x.locale = 'en'), " +
                            "(SELECT setting_value FROM author_settings x WHERE x.author_id = a.author_id AND x.setting_name = 'familyName' AND x.locale = 'en'), " +
                            "(SELECT setting_value FROM publication_settings t WHERE t.publication_id = p.publication_id AND t.setting_name = 'title' AND t.locale = 'en') " +
                            'FROM submissions s JOIN publications p ON p.publication_id = s.current_publication_id JOIN authors a ON a.publication_id = p.publication_id ' +
                            "WHERE s.status = 1 AND p.status = 1 AND NOT EXISTS (SELECT 1 FROM author_settings o WHERE o.author_id = a.author_id AND o.setting_name = 'orcid' AND coalesce(o.setting_value, '') <> '') " +
                            'ORDER BY s.submission_id, a.seq LIMIT 1',
                    )[0];
                    const [submissionId, email, givenName, familyName, title] = pick;
                    Object.assign(mail, {submissionId: Number(submissionId), contributor: `${givenName} ${familyName}`, to: email, submissionTitle: title});
                    const signature = (query(fleet, `SELECT replace(replace(setting_value, E'\\n', ' '), E'\\t', ' ') FROM ${tables.settings} WHERE ${tables.id} = ${contextId} AND setting_name = 'emailSignature' LIMIT 1`)[0] || [''])[0];
                    mail.contextSignatureSetting = signature;

                    await signIn(page, 'dbarnes', {contextPath: app.contextPath});
                    const settings = new pages.OrcidSettingsTab(page, app.contextPath);
                    await settings.goto();
                    await idle(page);
                    if (!(await settings.enableCheckbox.isChecked())) await settings.enableCheckbox.check();
                    await settings.apiSelect.selectOption({label: 'Public Sandbox'});
                    await settings.clientIdInput.fill('APP-TEST');
                    await settings.clientSecretInput.fill('test-secret');
                    await settings.save();
                    await shot(page, `orcid-settings-${tagged}`);
                    mail.orcidTurnedOn = true;

                    await page.goto(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${submissionId}`);
                    await page.locator('[data-cy="active-modal"]').first().waitFor({state: 'attached', timeout: 30_000});
                    await idle(page);
                    await pages.openContributors(page);
                    // (the page object's openContributorEditor() waits on one given-name box; the dataset's
                    // context has two languages, so two)
                    await page.locator('.listPanel__item').filter({hasText: mail.contributor}).getByRole('button', {name: 'Edit', exact: true}).click();
                    const modal = pages.contributorEditorModal(page);
                    await modal.locator('[id^="contributor-givenName-control"]').first().waitFor({state: 'visible', timeout: 30_000});
                    const field = pages.orcidField(modal);
                    const since = new Date();
                    await pages.requestVerification(page, field);
                    mail.fieldSaysAfterThePress = flat(await field.innerText());
                    await shot(page, `request-verification-${tagged}`);

                    // the dataset's job runner sends on web requests: keep asking while Mailpit is read
                    let found = null;
                    for (let attempt = 0; attempt < 6 && !found; attempt++) {
                        await page.request.get(`/index.php/${app.contextPath}/en/about`).catch(() => {});
                        found = await app.fleetMail.find({to: email, since, timeoutMs: 5_000}).catch(() => null);
                    }
                    mail.readThrough = 'app.fleetMail (names this fleet)';
                    if (!found) {
                        found = await app.mail.find({to: email, since, timeoutMs: 5_000}).catch(() => null);
                        mail.readThrough = 'app.mail (no message naming this fleet)';
                    }
                    if (!found) {
                        mail.found = false;
                    } else {
                        const full = await app.mail.fullMessage(found.ID);
                        const html = full.HTML || '';
                        const text = full.Text || '';
                        fs.writeFileSync(outFile(`mail-${tagged}.txt`), `Subject: ${full.Subject}\nTo: ${(full.To || []).map((x) => x.Address).join(', ')}\n\n--- text ---\n${text}\n\n--- html ---\n${html}\n`);
                        Object.assign(mail, {
                            found: true,
                            subject: full.Subject,
                            text,
                            html,
                            placeholdersLeft: [...new Set(`${html}\n${text}`.match(/\{\$\w+\}/g) || [])],
                            nameAppears: flat(html).includes(mail.contributor) || text.includes(mail.contributor),
                            submissionTitleAppears: flat(html).includes(title) || flat(text).includes(title),
                            signatureAppears: flat(signature) ? flat(html).includes(flat(signature)) || flat(text).includes(flat(signature)) : 'the context has no emailSignature',
                            customizedTemplateSent: `${html}\n${text}`.includes(sentence('ORCID_COLLECT_AUTHOR_ID', 'en')) || full.Subject === CUSTOM_SUBJECT.en,
                            whichTemplate: KEYS.filter((key) => `${html}\n${text}`.includes(sentence(key, 'en'))),
                        });
                    }
                } catch (error) {
                    mail.pageError = String(error.message).replace(/\u001b\[[0-9;]*m/g, '').split('\n').filter((line) => line.trim()).slice(0, 8).join(' | ');
                    await shot(page, `mail-step-error-${tagged}`).catch(() => {});
                } finally {
                    await close();
                }
            }
        } catch (error) {
            facts.error = String(error.message).split('\n').slice(0, 3).join(' | ');
        } finally {
            if (c.configLine) fs.writeFileSync(fleet.configFile, config);
        }
        const after = facts.secondRun ? facts.secondRun.holds : facts.afterUpgrade;
        const brief = (set) => Object.entries(set || {}).map(([name, b]) => `${name.replace(/^ORCID_/, '')}[${WATCHED.filter((v) => b[v]).join(',') || (b.length ? 'none' : 'empty')}]`).join(' ');
        console.log(
            `[${app.name}] pkp-lib ${sha} ${BRANCH} ${c.name}: exit ${facts.exit} · ${facts.said || facts.error} · ${facts.versionLoaded} → ${facts.versionAfter}` +
                (after ? ` · defaults ${brief(after.defaults)} · customized ${brief(after.customized) || 'none'} · orcidCustomRedirectBaseUrl ${JSON.stringify(after.orcidCustomRedirectBaseUrl)}` : '') +
                (facts.secondRun ? ` · second run exit ${facts.secondRun.exit}, content changed ${facts.secondRun.contentChanged}` : '') +
                (facts.mail ? ` · mail ${facts.mail.found ? `"${facts.mail.subject}" left ${JSON.stringify(facts.mail.placeholdersLeft)}` : facts.mail.pageError || 'none found'}` : ''),
        );
        R.cases.push(facts);
    }
    record(resultName, R);
});
