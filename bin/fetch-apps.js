#!/usr/bin/env node
/**
 * @file bin/fetch-apps.js
 *
 * Provision self-contained app checkouts under checkouts/<app> so the
 * campaign never drives a development checkout:
 *
 *   node bin/fetch-apps.js [ojs] [omp] [ops] [--rebuild] [--update] [--line <line>] [--reference <clone>]
 *   (default: all apps, the `main` line)
 *
 * --line stable-3_5_0 (or PKP_E2E_LINE) provisions the same thing for a
 * stable branch beside the `main` checkouts (bin/apps.js LINES, harness.md
 * "The fleets"): checkouts/<line>/<app> on that branch, ports shifted, DBs
 * suffixed, its own files dirs. A slot clone (PKP_E2E_SLOT in .env,
 * harness.md "Slots") gets its slot's ports, DB names, Mailpit and API key
 * baked into .env.playwright and config.test.inc.php the same way;
 * --reference <another pkp-e2e clone> borrows that clone's checkouts'
 * objects for the first clone (then --dissociate), so a new slot does not
 * download full history again. A stable branch whose lib/pkp predates
 * PKP_CONFIG_FILE gets the one-line Config.php change as a working-tree
 * edit, re-applied after every --update.
 *
 * Per app: clone pkp/<app> `main` with FULL history (the campaign's minimal
 * main-repo changes are merged there; the jardakotesovec fork lags —
 * history matters for archaeology when chasing a defect) with the remote
 * NAMED `upstream` and its push URL disabled immediately; add the
 * jardakotesovec fork as `origin` and make it the push default — so a bare
 * `git push` can only ever reach the fork, and pkp remotes reject every
 * push. Submodule push URLs are disabled too. Then: composer install
 * (lib/pkp + plugin vendors), npm ci + UI build, write .env.playwright,
 * create the <app>_test Postgres DB and generate config.test.inc.php.
 *
 * Idempotent: done steps are skipped (--rebuild forces composer/npm/build).
 * An existing checkout's tree is left alone; to move it to the current
 * upstream main, pass --update (fetch + checkout + submodules).
 * Afterwards point .env at checkouts/<app> and run `npm run mount`.
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const {execFileSync, spawnSync} = require('child_process');
const {APPS, REPO_ROOT, resolveLine, resolveSlot, dbName} = require('./apps.js');

const FORK_OWNER = 'jardakotesovec';
const UPSTREAM_OWNER = 'pkp';
// Not a URL on purpose: any `git push` at a disabled remote fails loudly.
const DISABLED_PUSH_URL = 'DISABLED-push-to-pkp-remotes-is-forbidden';

const args = process.argv.slice(2);
const rebuild = args.includes('--rebuild');
const update = args.includes('--update');
let lineName = process.env.PKP_E2E_LINE;
let referenceClone = null;
const requested = [];
for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--rebuild' || a === '--update') continue;
    if (a === '--reference' || a.startsWith('--reference=')) {
        referenceClone = path.resolve(a === '--reference' ? args[++i] : a.slice('--reference='.length));
        continue;
    }
    if (a === '--line' || a.startsWith('--line=')) {
        lineName = a === '--line' ? args[++i] : a.slice('--line='.length);
        continue;
    }
    requested.push(a);
}
const line = resolveLine(lineName);
const slot = resolveSlot();
const BRANCH = line ? line.branch : 'main';
const PORT_SHIFT = slot.portShift + (line ? line.portShift : 0);

const MAIN_CHECKOUTS = path.join(REPO_ROOT, 'checkouts');
const CHECKOUTS = line ? path.join(MAIN_CHECKOUTS, line.name) : MAIN_CHECKOUTS;
const FILES_ROOT = path.join(CHECKOUTS, 'files');
const names = requested.length ? requested : Object.keys(APPS);
for (const name of names) {
    if (!APPS[name]) {
        console.error(`Unknown app "${name}" — one of: ${Object.keys(APPS).join(', ')}`);
        process.exit(1);
    }
}

// The line's Config.php edit: the same line `main` carries.
const CONFIG_FILE_BEFORE = "define('CONFIG_FILE', \\PKP\\core\\Core::getBaseDir() . '/config.inc.php');";
const CONFIG_FILE_AFTER = "define('CONFIG_FILE', getenv('PKP_CONFIG_FILE') ?: \\PKP\\core\\Core::getBaseDir() . '/config.inc.php');";

const run = (cwd, cmd, args, opts = {}) => {
    console.log(`  $ ${cmd} ${args.join(' ')}`);
    return execFileSync(cmd, args, {cwd, stdio: 'inherit', ...opts});
};

function fetchApp(name) {
    const dir = path.join(CHECKOUTS, name);
    console.log(`== ${name} → ${dir}`);

    const fresh = !fs.existsSync(path.join(dir, '.git'));
    if (fresh) {
        fs.mkdirSync(CHECKOUTS, {recursive: true});
        // Clone from pkp (the fork lags), but NAME the remote `upstream` and
        // disable its push URL before anything else happens in the checkout.
        // A line borrows the main checkout's objects for the clone, then
        // stands alone (--dissociate).
        // --reference names another clone whose checkout of the same line
        // lends its objects.
        const mainCheckout = path.join(MAIN_CHECKOUTS, name);
        const reference = referenceClone
            ? path.join(referenceClone, 'checkouts', ...(line ? [line.name] : []), name)
            : line ? mainCheckout : null;
        run(CHECKOUTS, 'git', [
            'clone', '--branch', BRANCH, '--origin', 'upstream',
            ...(reference ? ['--reference-if-able', reference, '--dissociate'] : []),
            `https://github.com/${UPSTREAM_OWNER}/${name}.git`, name,
        ]);
    } else {
        console.log(`  clone: exists, skipping (--update moves it to current upstream ${BRANCH})`);
    }
    run(dir, 'git', ['remote', 'set-url', '--push', 'upstream', DISABLED_PUSH_URL]);

    // The fork is `origin` and the push default: a bare `git push` can only
    // ever reach the fork, and pkp rejects pushes via the disabled URL.
    const remotes = execFileSync('git', ['remote'], {cwd: dir, encoding: 'utf8'});
    if (!remotes.split('\n').includes('origin')) {
        run(dir, 'git', [
            'remote', 'add', 'origin',
            `https://github.com/${FORK_OWNER}/${name}.git`,
        ]);
    }
    run(dir, 'git', ['config', 'remote.pushDefault', 'origin']);

    // The UI bundle (js/build.js) is built from lib/ui-library; an --update
    // that moves the tree or that submodule must rebuild it, or the checkout
    // runs new PHP against a stale bundle (U43 A13 reappeared that way,
    // 2026-09-04).
    const uiRev = () => {
        try {
            return execFileSync('git', ['rev-parse', 'HEAD:lib/ui-library'], {cwd: dir, stdio: ['ignore', 'pipe', 'ignore']}).toString().trim();
        } catch { return ''; }
    };
    const uiBefore = fresh ? '' : uiRev();
    const configPhp = path.join(dir, 'lib', 'pkp', 'classes', 'config', 'Config.php');
    if (!fresh && update) {
        if (line && fs.existsSync(configPhp)) {
            // Drop the line's Config.php edit so the pointer can move; re-applied below.
            run(path.join(dir, 'lib', 'pkp'), 'git', ['checkout', '--', 'classes/config/Config.php']);
        }
        run(dir, 'git', ['fetch', 'upstream', BRANCH]);
        run(dir, 'git', ['checkout', '-B', BRANCH, 'FETCH_HEAD']);
    }
    run(dir, 'git', ['submodule', 'update', '--init', '--recursive']);
    if (line && !fs.readFileSync(configPhp, 'utf8').includes('PKP_CONFIG_FILE')) {
        const source = fs.readFileSync(configPhp, 'utf8');
        if (!source.includes(CONFIG_FILE_BEFORE)) {
            console.error(`  ${configPhp}: no CONFIG_FILE define in the expected shape — the harness cannot select its test config on this branch`);
            process.exit(1);
        }
        fs.writeFileSync(configPhp, source.replace(CONFIG_FILE_BEFORE, CONFIG_FILE_AFTER));
        console.log(`  lib/pkp on ${BRANCH} predates PKP_CONFIG_FILE: Config.php edited in the working tree`);
    }
    const uiMoved = !fresh && update && uiRev() !== uiBefore;
    if (uiMoved) console.log('  lib/ui-library moved: the UI bundle will be rebuilt');

    // Submodule origins point at pkp remotes (.gitmodules) — disable pushes.
    run(dir, 'git', [
        'submodule', 'foreach', '--recursive',
        `git remote set-url --push origin ${DISABLED_PUSH_URL}`,
    ]);

    // PHP dependencies — same set CI installs (run-app.yml).
    const vendorAutoload = path.join(dir, 'lib', 'pkp', 'lib', 'vendor', 'autoload.php');
    if (rebuild || !fs.existsSync(vendorAutoload)) {
        run(dir, 'composer', [
            '--no-ansi', '--no-interaction', '--no-progress',
            '--working-dir=lib/pkp', 'install', '--no-dev', '--optimize-autoloader',
        ]);
    } else {
        console.log('  composer lib/pkp: vendor present, skipping (--rebuild forces)');
    }
    for (const plugin of ['plugins/generic/citationStyleLanguage', 'plugins/paymethod/paypal']) {
        const pluginDir = path.join(dir, plugin);
        if (
            fs.existsSync(path.join(pluginDir, 'composer.json')) &&
            (rebuild || !fs.existsSync(path.join(pluginDir, 'lib', 'vendor', 'autoload.php')))
        ) {
            run(dir, 'composer', [
                '--no-ansi', '--no-interaction', '--no-progress',
                `--working-dir=${plugin}`, 'install', '--no-dev', '--optimize-autoloader',
            ]);
        }
    }

    // UI build.
    if (rebuild || uiMoved || !fs.existsSync(path.join(dir, 'node_modules'))) {
        run(dir, 'npm', ['ci']);
    } else {
        console.log('  npm ci: node_modules present, skipping (--rebuild forces)');
    }
    if (rebuild || uiMoved || !fs.existsSync(path.join(dir, 'js', 'build.js'))) {
        run(dir, 'npm', ['run', 'build']);
    } else {
        console.log('  UI build: js/build.js present, skipping (--rebuild forces; --update rebuilds when lib/ui-library moved)');
    }

    // Runtime wiring: env file, files dir, test DB, test config.
    const envFile = path.join(dir, '.env.playwright');
    if (!fs.existsSync(envFile)) {
        fs.writeFileSync(envFile, [
            `# Generated by bin/fetch-apps.js for the self-contained ${name} checkout.`,
            `PKP_CONFIG_FILE=${path.join(dir, 'config.test.inc.php')}`,
            `TEST_API_KEY=${slot.apiKey}`,
            `PLAYWRIGHT_BASE_PORT=${APPS[name].basePort + PORT_SHIFT}`,
            `MAILPIT_URL=${slot.mailpitUrl}`,
            '',
        ].join('\n'));
        console.log(`  wrote ${envFile}`);
    }

    // The "-test" suffix matters: reset.js only wipes a files dir whose
    // basename contains "test".
    const filesDir = path.join(FILES_ROOT, `${name}-test`);
    fs.mkdirSync(filesDir, {recursive: true});

    const db = dbName(name, line);
    const dbUser = process.env.TEST_DB_USERNAME || os.userInfo().username;
    const exists = spawnSync('psql', [
        '-XtAc', `SELECT 1 FROM pg_database WHERE datname = '${db}'`, 'postgres',
    ], {encoding: 'utf8'});
    if (exists.status !== 0) {
        console.error(`  psql failed — is Postgres running? ${exists.stderr}`);
        process.exit(1);
    }
    if (exists.stdout.trim() !== '1') {
        run(dir, 'createdb', [db]);
    }

    const configFile = path.join(dir, 'config.test.inc.php');
    if (!fs.existsSync(configFile)) {
        const generated = spawnSync('node', [
            path.join(REPO_ROOT, 'shared', 'playwright', 'make-test-config.js'),
        ], {
            encoding: 'utf8',
            env: {
                ...process.env,
                PKP_APP_ROOT: dir,
                PLAYWRIGHT_BASE_PORT: String(APPS[name].basePort + PORT_SHIFT),
                TEST_DB_NAME: db,
                TEST_SMTP_PORT: String(slot.smtpPort),
                TEST_DB_USERNAME: dbUser,
                TEST_DB_PASSWORD: process.env.TEST_DB_PASSWORD || dbUser,
                TEST_FILES_DIR: filesDir,
            },
        });
        if (generated.status !== 0) {
            console.error(generated.stderr);
            process.exit(1);
        }
        fs.writeFileSync(configFile, generated.stdout);
        console.log(`  wrote ${configFile}`);
    }

    console.log(line
        ? `${name}: ready — PKP_E2E_LINE=${line.name} npm run mount`
        : `${name}: ready — set ${name.toUpperCase()}_ROOT=${dir} in .env, then npm run mount`);
}

names.forEach(fetchApp);
