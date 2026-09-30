#!/usr/bin/env node
/**
 * @file lib/pkp/playwright/reset.js
 *
 * reset:<app> — nuke the test install so the next run performs a cold
 * bootstrap: drop + recreate the test database and wipe the test files dir.
 *
 * This is the ONE place allowed to dispatch on the configured DB driver
 * (PRINCIPLES D8): everything else in the harness goes through
 * app services and stays driver-agnostic. The local fleets choose Postgres for
 * its strictness; nothing here may depend on it.
 *
 * Run from an app root: node lib/pkp/playwright/reset.js
 */
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {loadEnv} = require('./support/env.js');

const appRoot = process.env.PKP_APP_ROOT || process.cwd();
loadEnv(appRoot);

// `reset:<app> -- --dataset [n]`: reload dataset fleet n from PKP's default
// test dataset instead (dataset.js; harness.md "Dataset fleets"). The
// campaign's install below is not touched. Only the flag selects it, never
// PKP_E2E_DATASET, so a stray export cannot turn a suite's reset into one.
{
    const {parseDatasetFlag, resetDataset} = require('./dataset.js');
    const {n} = parseDatasetFlag(process.argv.slice(2));
    if (n) {
        resetDataset(process.env.PKP_APP_NAME, n).then(
            () => process.exit(0),
            (error) => {
                console.error(`reset: dataset: ${error.message}`);
                process.exit(1);
            },
        );
        return;
    }
}

const configFile =
    process.env.PKP_CONFIG_FILE || path.join(appRoot, 'config.test.inc.php');
if (!fs.existsSync(configFile)) {
    console.error(`reset: config file not found: ${configFile}`);
    process.exit(1);
}

const config = parseIni(fs.readFileSync(configFile, 'utf8'));
const db = config.database || {};
const filesDir = (config.files || {}).files_dir;

// Refuse to touch anything that doesn't look like a test install.
if (!/test/.test(db.name || '')) {
    console.error(`reset: database "${db.name}" does not look like a test DB (no "test" in the name) — refusing.`);
    process.exit(1);
}

console.log(`reset: dropping and recreating database ${db.name} (${db.driver})`);
recreateDatabase(db);

if (filesDir && /test/.test(path.basename(filesDir)) && fs.existsSync(filesDir)) {
    console.log(`reset: wiping files dir ${filesDir}`);
    for (const entry of fs.readdirSync(filesDir)) {
        fs.rmSync(path.join(filesDir, entry), {recursive: true, force: true});
    }
} else if (filesDir) {
    console.log(`reset: leaving files dir alone (${filesDir} — name does not contain "test" or missing)`);
}

// The app's own caches are keyed by context id, and the recreated database hands out
// the same ids again: the Laravel store (plugin settings, 24 h) and the compiled
// per-context stylesheets (`<id>-stylesheet-<hash>.css`) would otherwise answer for a
// context that no longer exists (U10 claim check K3, 2026-09-24). This is what the
// admin's "Clear Data Caches" flushes, plus the stylesheets; the compiled templates stay.
const cacheDir = path.join(appRoot, 'cache');
const storeDir = path.resolve(appRoot, (config.cache || {}).path || 'cache/opcache');
if (fs.existsSync(cacheDir)) {
    console.log(`reset: clearing the app's data caches under ${cacheDir}`);
    for (const dir of [storeDir, path.join(cacheDir, '_db')]) {
        if (fs.existsSync(dir)) {
            for (const entry of fs.readdirSync(dir)) {
                fs.rmSync(path.join(dir, entry), {recursive: true, force: true});
            }
        }
    }
    for (const entry of fs.readdirSync(cacheDir)) {
        if (entry.endsWith('.css')) {
            fs.rmSync(path.join(cacheDir, entry), {force: true});
        }
    }
}

console.log('reset: done — next run will cold-bootstrap.');

function recreateDatabase({driver, host, username, password, name}) {
    const env = {...process.env};
    switch (true) {
        case /postgres/.test(driver || ''): {
            if (password) {
                env.PGPASSWORD = password;
            }
            const hostArgs = host ? ['-h', host] : [];
            const userArgs = username ? ['-U', username] : [];
            // --force: with `persistent = On` in the test config (make-test-config.js) the fleet's
            // php -S servers keep a PDO connection open between requests, and a plain dropdb then
            // fails with "database is being accessed by other users" while a probe server is up
            // (sync 2026-09-15). The forced drop terminates those idle backends; the servers reconnect.
            execFileSync('dropdb', ['--force', '--if-exists', ...hostArgs, ...userArgs, name], {stdio: 'inherit', env});
            execFileSync('createdb', [...hostArgs, ...userArgs, name], {stdio: 'inherit', env});
            break;
        }
        case /mysql|mariadb/.test(driver || ''): {
            const args = [];
            if (host) {
                args.push('-h', host);
            }
            if (username) {
                args.push('-u', username);
            }
            if (password) {
                args.push(`-p${password}`);
            }
            args.push('-e', `DROP DATABASE IF EXISTS \`${name}\`; CREATE DATABASE \`${name}\` DEFAULT CHARACTER SET utf8mb4;`);
            execFileSync('mysql', args, {stdio: 'inherit', env});
            break;
        }
        default:
            console.error(`reset: unsupported database driver "${driver}"`);
            process.exit(1);
    }
}

/** Minimal INI parser — enough for the [database]/[files] sections. */
function parseIni(text) {
    const result = {};
    let section = null;
    for (const rawLine of text.split('\n')) {
        const line = rawLine.trim();
        if (!line || line.startsWith(';') || line.startsWith('#')) {
            continue;
        }
        const sectionMatch = line.match(/^\[([^\]]+)\]$/);
        if (sectionMatch) {
            section = sectionMatch[1];
            result[section] ??= {};
            continue;
        }
        const eq = line.indexOf('=');
        if (eq === -1 || !section) {
            continue;
        }
        const key = line.slice(0, eq).trim();
        let value = line.slice(eq + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
        ) {
            value = value.slice(1, -1);
        }
        result[section][key] = value;
    }
    return result;
}
