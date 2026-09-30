#!/usr/bin/env node
/**
 * @file bin/try-fix.js
 *
 * Try a proposed fix on this slot's app checkouts, then take it out again
 * (REPORT.md "Proposed fix": a fix applied and checked against the steps):
 *
 *   node bin/try-fix.js apply <fix.diff> [ojs] [omp] [ops]
 *   node bin/try-fix.js revert [ojs] [omp] [ops]
 *   node bin/try-fix.js status
 *
 * (default apps: every app with <APP>_ROOT set; PKP_E2E_LINE selects a
 * stable line's checkouts, as for every harness command).
 *
 * The diff is a unified diff whose paths are relative to the app root, with
 * the usual a/ b/ prefixes: `a/lib/pkp/classes/…`, `a/lib/ui-library/src/…`,
 * `a/classes/…`. It is applied with GNU patch, since lib/pkp and
 * lib/ui-library are submodules a superproject `git apply` cannot reach.
 * A diff that touches lib/ui-library/ or js/ rebuilds the app's JavaScript
 * (`npm run build`, the line's Node) on apply and on revert.
 *
 * The checkouts stay read-only in every other sense: a fix is applied only
 * for the length of a walk, a marker (.pkp-e2e-fix.json in the app root)
 * records it, `mount` and `fetch-apps` refuse to run while one is there,
 * and `revert` restores the files exactly (checked against the recorded
 * hashes). Every fleet of the slot serves the patched code while it is
 * applied, so apply a fix only when no other run in this slot needs the
 * unpatched code, and one fix at a time.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const {execFileSync} = require('child_process');
const {resolveApp, resolveLine, configuredApps, RUNTIMES_DIR} = require('./apps.js');

const MARKER = '.pkp-e2e-fix.json';
const sha = (file) =>
    fs.existsSync(file) ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null;

function touchedFiles(diffText) {
    const files = new Set();
    for (const line of diffText.split('\n')) {
        const m = line.match(/^(?:---|\+\+\+) (?:[ab]\/)?(\S+)/);
        if (m && m[1] !== '/dev/null') {
            files.add(m[1]);
        }
    }
    return [...files];
}

function needsBuild(files) {
    return files.some((f) => f.startsWith('lib/ui-library/') || f.startsWith('js/'));
}

function build(app) {
    const line = resolveLine();
    const env = {...process.env};
    if (line && line.node) {
        // The line's Node, as fetch-apps uses it for the JS build.
        const nodeBin = path.join(RUNTIMES_DIR, `node-v${line.node}-linux-x64`, 'bin');
        if (fs.existsSync(nodeBin)) {
            env.PATH = `${nodeBin}:${env.PATH}`;
        }
    }
    console.log(`try-fix: ${app.name}: npm run build …`);
    execFileSync('npm', ['run', 'build'], {cwd: app.root, stdio: ['ignore', 'ignore', 'inherit'], env});
}

function apply(diffPath, apps) {
    const diffAbs = path.resolve(diffPath);
    const diffText = fs.readFileSync(diffAbs, 'utf8');
    const files = touchedFiles(diffText);
    if (!files.length) {
        throw new Error(`${diffPath}: no file paths found (a unified diff relative to the app root is expected)`);
    }
    for (const name of apps) {
        const app = resolveApp(name);
        const marker = path.join(app.root, MARKER);
        if (fs.existsSync(marker)) {
            throw new Error(`${name}: a fix is already applied (${marker}); revert it first`);
        }
        const before = Object.fromEntries(files.map((f) => [f, sha(path.join(app.root, f))]));
        // Dry run first, so a diff that does not fit leaves nothing half applied.
        execFileSync('patch', ['-p1', '--dry-run', '--forward', '-s', '-d', app.root, '-i', diffAbs], {stdio: 'inherit'});
        execFileSync('patch', ['-p1', '--forward', '-s', '--no-backup-if-mismatch', '-d', app.root, '-i', diffAbs], {stdio: 'inherit'});
        const after = Object.fromEntries(files.map((f) => [f, sha(path.join(app.root, f))]));
        fs.writeFileSync(marker, JSON.stringify({diff: diffAbs, files, before, after, line: app.line || 'main', appliedAt: new Date().toISOString()}, null, 2));
        if (needsBuild(files)) {
            build(app);
        }
        console.log(`try-fix: ${name}${app.line ? ` (${app.line})` : ''}: applied ${path.basename(diffAbs)} to ${files.join(', ')}`);
    }
}

function revert(apps) {
    for (const name of apps) {
        const app = resolveApp(name);
        const marker = path.join(app.root, MARKER);
        if (!fs.existsSync(marker)) {
            console.log(`try-fix: ${name}: no fix applied`);
            continue;
        }
        const rec = JSON.parse(fs.readFileSync(marker, 'utf8'));
        for (const f of rec.files) {
            if (sha(path.join(app.root, f)) !== rec.after[f]) {
                throw new Error(`${name}: ${f} changed since the fix was applied; restore it by hand (git checkout in its repo) and delete ${marker}`);
            }
        }
        execFileSync('patch', ['-p1', '-R', '-s', '--no-backup-if-mismatch', '-d', app.root, '-i', rec.diff], {stdio: 'inherit'});
        for (const f of rec.files) {
            if (sha(path.join(app.root, f)) !== rec.before[f]) {
                throw new Error(`${name}: ${f} does not match its state before the fix; check it by hand`);
            }
        }
        fs.unlinkSync(marker);
        if (needsBuild(rec.files)) {
            build(app);
        }
        console.log(`try-fix: ${name}${app.line ? ` (${app.line})` : ''}: reverted ${path.basename(rec.diff)}`);
    }
}

function status(apps) {
    for (const name of apps) {
        const app = resolveApp(name);
        const marker = path.join(app.root, MARKER);
        if (fs.existsSync(marker)) {
            const rec = JSON.parse(fs.readFileSync(marker, 'utf8'));
            console.log(`${name}${app.line ? ` (${app.line})` : ''}: ${rec.diff} applied ${rec.appliedAt}`);
        } else {
            console.log(`${name}${app.line ? ` (${app.line})` : ''}: clean`);
        }
    }
}

/** Throws when a fix is applied in the app's checkout (for mount and fetch-apps). */
function assertNoFix(root, what) {
    const marker = path.join(root, MARKER);
    if (fs.existsSync(marker)) {
        const rec = JSON.parse(fs.readFileSync(marker, 'utf8'));
        console.error(`${what}: a fix is applied in ${root} (${rec.diff}); run \`node bin/try-fix.js revert\` first`);
        process.exit(1);
    }
}

module.exports = {assertNoFix, MARKER};

if (require.main === module) {
    const [cmd, ...rest] = process.argv.slice(2);
    try {
        if (cmd === 'apply' && rest[0]) {
            const [diff, ...apps] = rest;
            apply(diff, apps.length ? apps : configuredApps());
        } else if (cmd === 'revert') {
            revert(rest.length ? rest : configuredApps());
        } else if (cmd === 'status') {
            status(rest.length ? rest : configuredApps());
        } else {
            console.error('usage: node bin/try-fix.js apply <fix.diff> [apps…] | revert [apps…] | status [apps…]');
            process.exit(2);
        }
    } catch (e) {
        console.error(`try-fix: ${e.message}`);
        process.exit(1);
    }
}
