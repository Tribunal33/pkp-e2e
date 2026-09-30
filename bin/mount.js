#!/usr/bin/env node
/**
 * @file bin/mount.js
 *
 * Copy the PHP overlays into app checkouts:
 *
 *   node bin/mount.js [ojs] [omp] [ops]     (default: every app with <APP>_ROOT set)
 *
 * Per app: copies apps/<app>/php/** to the app root, shared/php/** to
 * lib/pkp/ and apps/<app>/playwright/fixtures/files/** to
 * classes/testing/fixtures/ (a line whose LINES entry says
 * `overlays: 'install'`, 3.4 and 3.3, gets shared/php-lines/<line>/** at the
 * app root instead: the install tool and the user tool, harness.md "The
 * stable lines"), keeps the copies out of git via
 * .git/info/exclude, and writes a
 * manifest (.pkp-e2e-mount.json) of what it wrote. Guard rails:
 *  - refuses to overwrite a mounted file that was hand-edited in the app
 *    checkout (edits belong in this repo — re-run after fixing);
 *  - verifies the checkout carries the one prerequisite main-repo change
 *    (Config.php honouring PKP_CONFIG_FILE).
 * `node bin/unmount.js` reverses everything the manifest records.
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const {REPO_ROOT, resolveApp, resolveLine, configuredApps} = require('./apps.js');

const EXCLUDE_BEGIN = '# >>> pkp-e2e mount (managed block — do not edit)';
const EXCLUDE_END = '# <<< pkp-e2e mount';

const sha = (file) =>
    crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

/** Collect [repoFile, appRelativeTarget] pairs for one app. */
function overlayFiles(appName) {
    const pairs = [];
    const walk = (dir, base, prefix) => {
        for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                walk(full, base, prefix);
            } else {
                pairs.push([full, path.join(prefix, path.relative(base, full))]);
            }
        }
    };
    const line = resolveLine();
    if (line && line.overlays === 'install') {
        const linePhp = path.join(REPO_ROOT, 'shared', 'php-lines', line.name);
        walk(linePhp, linePhp, '');
        return pairs;
    }
    const appPhp = path.join(REPO_ROOT, 'apps', appName, 'php');
    const sharedPhp = path.join(REPO_ROOT, 'shared', 'php');
    const fixtures = path.join(REPO_ROOT, 'apps', appName, 'playwright', 'fixtures', 'files');
    walk(appPhp, appPhp, '');
    walk(sharedPhp, sharedPhp, path.join('lib', 'pkp'));
    // The suite's fixture files, so a builder can store one the way an
    // upload does (the submission `galleys[].file` key reads them from
    // classes/testing/fixtures/ in the checkout).
    if (fs.existsSync(fixtures)) {
        walk(fixtures, fixtures, path.join('classes', 'testing', 'fixtures'));
    }
    return pairs;
}

function ensureExcludes(appRoot, lines) {
    const excludeFile = path.join(appRoot, '.git', 'info', 'exclude');
    if (!fs.existsSync(path.dirname(excludeFile))) {
        return; // not a git checkout (e.g. CI tarball) — nothing to hide
    }
    let content = fs.existsSync(excludeFile)
        ? fs.readFileSync(excludeFile, 'utf8')
        : '';
    const block = [EXCLUDE_BEGIN, ...lines, EXCLUDE_END].join('\n');
    // The markers hold regex metacharacters (the parentheses): escaped, so
    // the block is replaced in place. Unescaped, it never matched and every
    // mount appended another copy (138 in slot 0's OJS by 2026-09-30); all
    // copies go, one block stays.
    const escape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`\\n?${escape(EXCLUDE_BEGIN)}[\\s\\S]*?${escape(EXCLUDE_END)}\\n?`, 'g');
    content = `${content.replace(re, '\n').replace(/\n*$/, '\n')}${block}\n`;
    fs.writeFileSync(excludeFile, content);
}

function mount(appName) {
    const app = resolveApp(appName);
    // 3.3 keeps the class in Config.inc.php.
    const configDir = path.join(app.root, 'lib', 'pkp', 'classes', 'config');
    const configPhp = ['Config.php', 'Config.inc.php']
        .map((file) => path.join(configDir, file))
        .find((file) => fs.existsSync(file));
    if (!configPhp || !fs.readFileSync(configPhp, 'utf8').includes('PKP_CONFIG_FILE')) {
        console.error(
            `${appName}: lib/pkp/classes/config/Config.php does not honour the ` +
                `PKP_CONFIG_FILE env var — the checkout is missing the minimal ` +
                `main-repo change (merged to pkp-lib main 2026-08 — update the checkout).`
        );
        process.exit(1);
    }

    const manifestFile = path.join(app.root, '.pkp-e2e-mount.json');
    const previous = fs.existsSync(manifestFile)
        ? JSON.parse(fs.readFileSync(manifestFile, 'utf8'))
        : {};

    const pairs = overlayFiles(appName);
    const manifest = {};
    for (const [source, rel] of pairs) {
        const target = path.join(app.root, rel);
        const sourceHash = sha(source);
        if (fs.existsSync(target)) {
            const targetHash = sha(target);
            const known = previous[rel] || sourceHash; // pre-extraction tracked copies count as known
            if (targetHash !== known && targetHash !== sourceHash) {
                console.error(
                    `${appName}: ${rel} was modified in the app checkout — ` +
                        `edits belong in pkp-e2e. Port the change here, delete ` +
                        `the copy (rm "${target}"), then re-mount.`
                );
                process.exit(1);
            }
        }
        fs.mkdirSync(path.dirname(target), {recursive: true});
        fs.copyFileSync(source, target);
        manifest[rel] = sourceHash;
    }
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');

    ensureExcludes(app.root, [
        ...new Set(
            Object.keys(manifest).map((rel) => '/' + rel.split(path.sep).join('/'))
        ),
        '/.pkp-e2e-mount.json',
        '/config.test.inc.php',
        // The validation variant's config and the dataset fleets' configs
        // and public dirs (harness.md "Dataset fleets").
        '/config.test.*.inc.php',
        '/public-ds*/',
        '/.env.playwright',
    ]);
    console.log(`${appName}: mounted ${Object.keys(manifest).length} files into ${app.root}`);
}

const requested = process.argv.slice(2);
const names = requested.length ? requested : configuredApps();
if (!names.length) {
    console.error('mount: no apps requested and no <APP>_ROOT set in .env');
    process.exit(1);
}
names.forEach(mount);
