/**
 * @file shared/playwright/dataset.js
 *
 * Dataset fleets (harness.md "Dataset fleets", docs/process/dataset.md): an
 * install loaded from PKP's default test dataset (github.com/pkp/datasets,
 * fetched by `npm run fetch-datasets` into checkouts/datasets/), which every
 * PKP developer's and test install holds, beside the campaign's own install
 * and seed. Opt-in: `PKP_E2E_DATASET=<n>` (1–9, set by `--dataset [n]` on
 * fleet-prep and reset:<app>, and by bin/probe.js from a dataset fleet's
 * fleet.json) selects dataset fleet n of the app on the slot and line in
 * play. Nothing here touches the campaign fleet: its own DB, files dir,
 * public dir, config file, Laravel cache dir and port.
 *
 *   port      basePort + 60 + n            (8061 for OJS on main, 9061 on 3.5)
 *   database  <campaign db>_ds<n>          (ojs_test_ds1, ojs_test_3_5_ds1)
 *   files     <checkouts>[/<line>]/files/<app>-test-ds<n>
 *   public    <app root>/public-ds<n>      (relative in the config: served by php -S)
 *   config    <app root>/config.test.ds<n>.inc.php, from the dataset's own config.inc.php
 *   cache     <app root>/cache/opcache-ds<n>
 *
 * The one DB dispatch lives here beside reset.js's: the dumps are
 * PostgreSQL ones (the `pgsql` datasets), and the fleets run PostgreSQL.
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const {spawnSync, execFileSync} = require('child_process');
const {REPO_ROOT, resolveApp, resolveLine, resolveSlot} = require('../../bin/apps.js');
const {readEnvFile} = require('./support/env.js');
const {patchIni} = require('./ini.js');

const DATASETS_DIR = path.join(REPO_ROOT, 'checkouts', 'datasets');
const DATASET_PORT_OFFSET = 60; // + n: clear of the workers (+0…+19), the probe (+50) and the validation variant (+90)
const PRODUCTS = {ojs: 'ojs2', omp: 'omp', ops: 'ops'};

/** The dataset fleet number PKP_E2E_DATASET selects (1–9), or null for the campaign fleet. */
function datasetNumber(value = process.env.PKP_E2E_DATASET) {
    if (value === undefined || value === '' || value === '0' || value === 'off') {
        return null;
    }
    const n = Number(value);
    if (!Number.isInteger(n) || n < 1 || n > 9) {
        throw new Error(`PKP_E2E_DATASET="${value}" is not a dataset fleet number (1–9)`);
    }
    return n;
}

/**
 * Parse `--dataset [n]` out of an argv list. Returns {n, rest}: n is null
 * when the flag is absent, 1 for a bare `--dataset`.
 */
function parseDatasetFlag(argv) {
    const rest = [];
    let n = null;
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i];
        if (arg === '--dataset') {
            n = /^[1-9]$/.test(argv[i + 1] || '') ? Number(argv[++i]) : 1;
        } else if (arg.startsWith('--dataset=')) {
            n = datasetNumber(arg.slice('--dataset='.length));
        } else {
            rest.push(arg);
        }
    }
    return {n, rest};
}

/** Minimal INI reader (sections of key = value), quotes stripped. */
function parseIni(text) {
    const result = {};
    let section = null;
    for (const raw of text.split('\n')) {
        const line = raw.trim();
        if (!line || line.startsWith(';') || line.startsWith('#')) continue;
        const sectionMatch = line.match(/^\[([^\]]+)\]$/);
        if (sectionMatch) {
            section = sectionMatch[1];
            result[section] ??= {};
            continue;
        }
        const eq = line.indexOf('=');
        if (eq === -1 || !section) continue;
        let value = line.slice(eq + 1).trim();
        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
        }
        result[section][line.slice(0, eq).trim()] = value;
    }
    return result;
}

/**
 * Everything about dataset fleet n of an app on this slot and line.
 *
 * @param {string} name ojs | omp | ops
 * @param {number} n 1–9
 */
function datasetFleet(name, n) {
    const app = resolveApp(name);
    const line = resolveLine();
    const env = readEnvFile(app.root);
    const basePort = parseInt(env.PLAYWRIGHT_BASE_PORT || String(app.basePort), 10);
    const port = basePort + DATASET_PORT_OFFSET + n;
    // PKP_E2E_DATASET_BRANCH loads another branch's dataset (pkp's own
    // loaddb.sh DATA_BRANCH): an older one exercises the app's upgrade.
    const branch = process.env.PKP_E2E_DATASET_BRANCH || (line ? line.branch : 'main');
    const campaignConfigFile = env.PKP_CONFIG_FILE || path.join(app.root, 'config.test.inc.php');
    return {
        name,
        n,
        line: app.line,
        branch,
        root: app.root,
        basePort,
        port,
        baseURL: `http://127.0.0.1:${port}`,
        db: `${app.db}_ds${n}`,
        campaignDb: app.db,
        campaignConfigFile,
        configFile: path.join(app.root, `config.test.ds${n}.inc.php`),
        filesDir: path.join(path.dirname(app.root), 'files', `${name}-test-ds${n}`),
        publicDir: `public-ds${n}`,
        cacheDir: path.join(app.root, 'cache', `opcache-ds${n}`),
        source: path.join(DATASETS_DIR, name, branch, 'pgsql'),
        smtpPort: resolveSlot().smtpPort,
        testApiKey: process.env.TEST_API_KEY || env.TEST_API_KEY || '',
    };
}

/** The campaign fleet's database connection ([database] of its config): the dataset fleet uses the same role. */
function campaignCredentials(fleet) {
    return parseIni(fs.readFileSync(fleet.campaignConfigFile, 'utf8')).database || {};
}

/** The dataset fleet's config: the dataset's own config.inc.php with the harness's mechanics patched in. */
function writeConfig(fleet) {
    const source = path.join(fleet.source, 'config.inc.php');
    let text = fs.readFileSync(source, 'utf8');
    const campaign = campaignCredentials(fleet);
    const cookie = `${fleet.db.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}SID`;
    const patches = {
        general: {
            installed: 'On',
            base_url: `"${fleet.baseURL}"`,
            // Only the loopback host drives a fleet (harness.md); a cookie of
            // its own, since every fleet shares the host 127.0.0.1.
            allowed_hosts: `"[\\"127.0.0.1\\",\\"127.0.0.1:${fleet.port}\\"]"`,
            session_cookie_name: cookie,
        },
        database: {
            host: campaign.host || '127.0.0.1',
            username: campaign.username,
            password: campaign.password,
            name: fleet.db,
        },
        files: {
            files_dir: fleet.filesDir,
            public_files_dir: fleet.publicDir,
        },
        cache: {
            path: fleet.cacheDir,
        },
        email: {
            default: 'smtp',
            smtp: 'On',
            smtp_server: '127.0.0.1',
            smtp_port: String(fleet.smtpPort), // this slot's Mailpit
        },
        proxy: {
            // The egress rule (harness.md "config.test.inc.php"): server-side
            // outbound HTTP fails fast at a dead local port.
            http_proxy: '"http://127.0.0.1:9"',
            https_proxy: '"http://127.0.0.1:9"',
        },
    };
    // patchIni only writes into sections the file has.
    for (const section of Object.keys(patches)) {
        if (!new RegExp(`^\\[${section}\\]`, 'm').test(text)) {
            text = `${text.replace(/\n?$/, '\n')}\n[${section}]\n`;
        }
    }
    const out =
        `; Generated by shared/playwright/dataset.js from ${path.relative(REPO_ROOT, source)} — do not edit;\n` +
        '; `npm run reset:<app> -- --dataset` regenerates it.\n' +
        patchIni(text, patches);
    fs.writeFileSync(fleet.configFile, out);
    return {campaign};
}

/** psql against the fleet's database: rows as arrays of strings. */
function query(fleet, sql, {db = fleet.db} = {}) {
    const out = execFileSync('psql', ['-X', '-d', db, '-tA', '-F', '\t', '-c', sql], {encoding: 'utf8'});
    return out
        .split('\n')
        .filter((row) => row !== '')
        .map((row) => row.split('\t'));
}

/**
 * Load database.sql through a filter: the dump is a `--clean` one (its first
 * statements drop what an existing database holds, which fail on an empty
 * one) and names its owner `<app>-ci`, a role no fleet has; both go, and
 * everything else runs in one transaction with ON_ERROR_STOP, so a load
 * either lands whole or fails naming the statement.
 */
function loadDump(fleet, {host, username, password}) {
    const dump = path.join(fleet.source, 'database.sql');
    const env = {...process.env, ...(password ? {PGPASSWORD: password} : {})};
    const conn = [...(host ? ['-h', host] : []), ...(username ? ['-U', username] : [])];
    const counts = {cleanDropped: 0, ownerDropped: 0};
    const clean = /^(ALTER TABLE (ONLY )?\S+ (DROP CONSTRAINT \S+|ALTER COLUMN \S+ DROP DEFAULT)|DROP (INDEX|SEQUENCE|TABLE|TRIGGER|FUNCTION|VIEW|TYPE|EXTENSION|SCHEMA) (IF EXISTS )?\S+);$/;
    let created = false;
    let inCopy = false;
    const kept = [];
    for (const line of fs.readFileSync(dump, 'utf8').split('\n')) {
        if (inCopy) {
            if (line === '\\.') inCopy = false;
        } else if (/^COPY .* FROM stdin;$/.test(line)) {
            inCopy = true;
        } else if (!created && clean.test(line)) {
            counts.cleanDropped++;
            continue;
        } else if (/^ALTER .* OWNER TO .*;$/.test(line)) {
            counts.ownerDropped++;
            continue;
        } else if (/^CREATE /.test(line)) {
            created = true;
        }
        kept.push(line);
    }
    dropDatabase(fleet.db, {host, username, password});
    execFileSync('createdb', [...conn, fleet.db], {stdio: 'inherit', env});
    const result = spawnSync('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '--single-transaction', ...conn, '-d', fleet.db, '-f', '-'], {
        env,
        input: kept.join('\n'),
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
    });
    if (result.status !== 0) {
        throw new Error(
            `psql stopped the load of ${path.relative(REPO_ROOT, dump)} (exit ${result.status}), nothing kept:\n${(result.stderr || String(result.error || '')).trim()}`,
        );
    }
    return counts;
}

/**
 * dropdb --force, retried: right after a load the autovacuum launcher can
 * hold the fresh database, and a non-superuser's forced drop may not
 * terminate it ("permission denied to terminate process"); it is gone
 * within a second or two.
 */
function dropDatabase(db, {host, username, password} = {}) {
    const env = {...process.env, ...(password ? {PGPASSWORD: password} : {})};
    const conn = [...(host ? ['-h', host] : []), ...(username ? ['-U', username] : [])];
    for (let attempt = 1; ; attempt++) {
        const result = spawnSync('dropdb', ['--force', '--if-exists', ...conn, db], {env, encoding: 'utf8'});
        if (result.status === 0) {
            return;
        }
        if (attempt >= 10) {
            throw new Error(`dropdb ${db} failed: ${(result.stderr || '').trim()}`);
        }
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1000);
    }
}

function emptyDir(dir) {
    fs.mkdirSync(dir, {recursive: true});
    for (const entry of fs.readdirSync(dir)) {
        fs.rmSync(path.join(dir, entry), {recursive: true, force: true});
    }
}

function copyInto(from, to) {
    emptyDir(to);
    if (fs.existsSync(from)) {
        fs.cpSync(from, to, {recursive: true});
    }
}

/** The code's release (dbscripts/xml/version.xml) and the loaded database's current version. */
function versions(fleet) {
    const xml = fs.readFileSync(path.join(fleet.root, 'dbscripts', 'xml', 'version.xml'), 'utf8');
    const code = (xml.match(/<release>([^<]+)<\/release>/) || [])[1] || '?';
    const product = PRODUCTS[fleet.name];
    const row = query(
        fleet,
        `SELECT major || '.' || minor || '.' || revision || '.' || build FROM versions WHERE current = 1 AND product_type = 'core' AND product = '${product}'`,
    )[0];
    return {code, db: row ? row[0] : '?'};
}

function compareVersions(a, b) {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const d = (pa[i] || 0) - (pb[i] || 0);
        if (d) return d;
    }
    return 0;
}

/**
 * Tables and columns a fresh install of the checkout's tip has and the
 * dataset lacks (or the reverse), read against the campaign's own install
 * when it is installed: a schema change merged without a version bump,
 * which the upgrade tool does not run. Informational; null when there is
 * no campaign install to compare with.
 */
function schemaDiff(fleet) {
    const columns = (db) =>
        new Set(
            query(
                fleet,
                "SELECT table_name || '.' || column_name FROM information_schema.columns WHERE table_schema = 'public'",
                {db},
            ).map((row) => row[0]),
        );
    let tip;
    try {
        tip = columns(fleet.campaignDb);
    } catch {
        return null;
    }
    if (!tip.has('versions.major')) {
        return null;
    }
    const dataset = columns(fleet.db);
    return {
        missing: [...tip].filter((c) => !dataset.has(c)).sort(),
        extra: [...dataset].filter((c) => !tip.has(c)).sort(),
    };
}

function runUpgrade(fleet) {
    const result = spawnSync('php', ['tools/upgrade.php', 'upgrade'], {
        cwd: fleet.root,
        env: {...process.env, PKP_CONFIG_FILE: fleet.configFile},
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
    });
    const log = path.join(REPO_ROOT, '.reports', 'datasets', `upgrade-${fleet.line}-${fleet.name}-ds${fleet.n}.log`);
    fs.mkdirSync(path.dirname(log), {recursive: true});
    fs.writeFileSync(log, `${result.stdout || ''}${result.stderr || ''}`);
    return {code: result.status, log};
}

/**
 * The context tables of a loaded dataset: journals, presses or servers
 * (OPS 3.3 still keeps its servers in `journals`).
 */
function contextTables(fleet, {db = fleet.db} = {}) {
    const tables = {
        ojs: {table: 'journals', settings: 'journal_settings', id: 'journal_id'},
        omp: {table: 'presses', settings: 'press_settings', id: 'press_id'},
        ops: {table: 'servers', settings: 'server_settings', id: 'server_id'},
    }[fleet.name];
    const exists = query(fleet, `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${tables.table}'`, {db});
    return exists.length ? tables : {table: 'journals', settings: 'journal_settings', id: 'journal_id'};
}

/** The context(s), user and submission counts of the loaded dataset: one line for the output. */
function summary(fleet) {
    const {table, settings, id} = contextTables(fleet);
    const contexts = query(
        fleet,
        `SELECT c.path, (SELECT setting_value FROM ${settings} s WHERE s.${id} = c.${id} AND s.setting_name = 'name' AND s.locale IN ('en', 'en_US') LIMIT 1) FROM ${table} c ORDER BY c.${id}`,
    ).map(([p, n]) => ({path: p, name: n}));
    const users = Number(query(fleet, 'SELECT count(*) FROM users')[0][0]);
    const submissions = Number(query(fleet, 'SELECT count(*) FROM submissions')[0][0]);
    return {contexts, users, submissions};
}

/**
 * Reset dataset fleet n of an app: config, database, files, public files,
 * caches, then the upgrade when the dataset's schema version lags the
 * checkout. Logs as it goes; throws with the reason when a step fails.
 *
 * @returns {Promise<object>} what fleet-prep records
 */
async function resetDataset(name, n, {log = console.log} = {}) {
    const fleet = datasetFleet(name, n);
    const where = `${name} dataset fleet ${n} (${fleet.line}, ${fleet.baseURL}, db ${fleet.db})`;
    if (!fs.existsSync(path.join(fleet.source, 'database.sql'))) {
        const hint = fleet.line === 'main' || fleet.line === 'stable-3_5_0' ? 'npm run fetch-datasets' : `npm run fetch-datasets -- --line ${fleet.line}`;
        throw new Error(`no ${fleet.branch} dataset for ${name} at ${path.relative(REPO_ROOT, fleet.source)} — ${hint}`);
    }
    if (!/test/.test(fleet.db)) {
        throw new Error(`database "${fleet.db}" does not look like a test DB — refusing`);
    }
    const head = (() => {
        try {
            return execFileSync('git', ['log', '-1', '--format=%h %cI'], {cwd: DATASETS_DIR, encoding: 'utf8'}).trim();
        } catch {
            return '?';
        }
    })();
    log(`dataset: ${where} ← ${path.relative(REPO_ROOT, fleet.source)} (pkp/datasets ${head})`);
    const {campaign} = writeConfig(fleet);
    if (campaign.driver && !/postgres/.test(campaign.driver)) {
        throw new Error(`the fleet's driver is "${campaign.driver}": the dataset fleets load the pgsql dumps only`);
    }
    log(`dataset: config ${path.relative(REPO_ROOT, fleet.configFile)} (the dataset's config.inc.php, harness keys patched)`);

    const started = Date.now();
    const counts = loadDump(fleet, campaign);
    log(
        `dataset: loaded database.sql into ${fleet.db} in ${((Date.now() - started) / 1000).toFixed(1)} s ` +
            `(${counts.cleanDropped} --clean drops and ${counts.ownerDropped} OWNER TO "${name}-ci" lines left out)`,
    );

    copyInto(path.join(fleet.source, 'files'), fleet.filesDir);
    copyInto(path.join(fleet.source, 'public'), path.join(fleet.root, fleet.publicDir));
    log(`dataset: files → ${path.relative(REPO_ROOT, fleet.filesDir)}, public → ${path.relative(REPO_ROOT, path.join(fleet.root, fleet.publicDir))}`);

    // Caches: this fleet's own Laravel store, the stylesheets compiled for its
    // base URL (named <context>-<name>-<crc32(base url)>.css on 3.5 and main),
    // and the legacy file caches pkp's own loadfiles.sh clears (cache/*.php).
    emptyDir(fleet.cacheDir);
    const crc = zlib.crc32 ? String(zlib.crc32(fleet.baseURL)) : null;
    const cacheRoot = path.join(fleet.root, 'cache');
    for (const entry of fs.readdirSync(cacheRoot)) {
        if ((crc && entry.endsWith(`-${crc}.css`)) || /^fc-.*\.php$/.test(entry)) {
            fs.rmSync(path.join(cacheRoot, entry), {force: true});
        }
    }

    let {code, db} = versions(fleet);
    const entry = {
        dataset: n,
        datasetsCommit: head,
        source: path.relative(REPO_ROOT, fleet.source),
        db: fleet.db,
        configFile: path.relative(REPO_ROOT, fleet.configFile),
        versionLoaded: db,
        versionCode: code,
        upgraded: false,
    };
    if (compareVersions(db, code) < 0) {
        log(`dataset: the dataset's schema is ${db}, the checkout is ${code}: running the app's upgrade (php tools/upgrade.php upgrade)`);
        const upgrade = runUpgrade(fleet);
        entry.upgradeLog = path.relative(REPO_ROOT, upgrade.log);
        if (upgrade.code !== 0) {
            throw new Error(`the upgrade from ${db} to ${code} failed (exit ${upgrade.code}) — see ${entry.upgradeLog}`);
        }
        ({db} = versions(fleet));
        entry.upgraded = true;
        entry.versionAfterUpgrade = db;
        log(`dataset: upgraded to ${db} (log ${entry.upgradeLog})`);
    } else if (compareVersions(db, code) > 0) {
        log(`dataset: WARNING the dataset's schema ${db} is newer than the checkout's ${code} — update the checkout (npm run fetch-apps -- --update)`);
    } else {
        log(`dataset: schema version ${db} matches the checkout: no upgrade needed`);
    }
    const diff = schemaDiff(fleet);
    if (diff) {
        entry.schemaDiff = {missingInDataset: diff.missing, extraInDataset: diff.extra};
        if (diff.missing.length || diff.extra.length) {
            log(
                `dataset: NOTE columns differ from the campaign's fresh install of the tip (${fleet.campaignDb}): ` +
                    `${diff.missing.length} missing in the dataset [${diff.missing.slice(0, 8).join(', ')}${diff.missing.length > 8 ? ', …' : ''}], ` +
                    `${diff.extra.length} only in the dataset [${diff.extra.slice(0, 8).join(', ')}${diff.extra.length > 8 ? ', …' : ''}] ` +
                    '(a change merged without a version bump, or a campaign install older than the checkout)',
            );
        } else {
            log(`dataset: columns match the campaign's install of the tip (${fleet.campaignDb})`);
        }
    }
    const facts = summary(fleet);
    entry.contexts = facts.contexts;
    log(
        `dataset: ready — ${facts.contexts.map((c) => `${c.path} "${c.name}"`).join(', ')}; ${facts.users} users, ${facts.submissions} submissions`,
    );
    return entry;
}

module.exports = {
    DATASETS_DIR,
    DATASET_PORT_OFFSET,
    datasetNumber,
    parseDatasetFlag,
    datasetFleet,
    resetDataset,
    loadDump,
    dropDatabase,
    campaignCredentials,
    contextTables,
    query,
};
