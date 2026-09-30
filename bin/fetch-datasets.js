#!/usr/bin/env node
/**
 * @file bin/fetch-datasets.js
 *
 * Provision PKP's default test dataset (https://github.com/pkp/datasets, the
 * install every PKP developer and CI run starts from) into the gitignored
 * checkouts/datasets/, for the dataset fleets (docs/process/dataset.md,
 * harness.md "Dataset fleets"):
 *
 *   npm run fetch-datasets [-- --update] [-- --line stable-3_4_0 [--line stable-3_3_0]]
 *
 * The repository is large (every app, branch, DBMS and old release since
 * 3.1), so the clone is shallow and sparse: `--depth 1 --filter=blob:none`,
 * and only `<app>/<branch>/pgsql/` (the test installs run PostgreSQL) for
 * ojs, omp and ops on `main` and `stable-3_5_0`, plus `tools/` (pkp's own
 * load scripts, kept for reference). `--line stable-3_4_0` / `--line
 * stable-3_3_0` add the on-request old lines (harness.md "The stable
 * lines"); the set of branches is kept across runs, so a later plain
 * `--update` keeps them. `--update` moves the clone to the current tip of
 * the datasets' `main` (pkp's CI regenerates the `main` dataset from the
 * app tips). Prints the size on disk at the end.
 */
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {APPS, LINES, REPO_ROOT} = require('./apps.js');

const DATASETS_DIR = path.join(REPO_ROOT, 'checkouts', 'datasets');
const REMOTE = 'https://github.com/pkp/datasets.git';
const DEFAULT_BRANCHES = ['main', 'stable-3_5_0'];
const USAGE = 'usage: node bin/fetch-datasets.js [--update] [--line <stable-3_4_0|stable-3_3_0|stable-3_5_0>]…';

const args = process.argv.slice(2);
const update = args.includes('--update');
const extra = [];
for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--update') continue;
    if (arg === '--line' || arg.startsWith('--line=')) {
        const name = arg === '--line' ? args[++i] : arg.slice('--line='.length);
        if (!LINES[name]) {
            console.error(`fetch-datasets: unknown line "${name}" — one of ${Object.keys(LINES).join(', ')}\n${USAGE}`);
            process.exit(1);
        }
        extra.push(LINES[name].branch);
        continue;
    }
    console.error(`fetch-datasets: unknown argument "${arg}"\n${USAGE}`);
    process.exit(1);
}

const run = (cmd, cmdArgs, opts = {}) => {
    console.log(`  $ ${cmd} ${cmdArgs.join(' ')}`);
    return execFileSync(cmd, cmdArgs, {cwd: DATASETS_DIR, stdio: 'inherit', ...opts});
};
const read = (cmd, cmdArgs) => execFileSync(cmd, cmdArgs, {cwd: DATASETS_DIR, encoding: 'utf8'}).trim();

/** The branches the current sparse set already holds (so --update keeps an old line fetched earlier). */
function currentBranches() {
    try {
        return read('git', ['sparse-checkout', 'list'])
            .split('\n')
            .map((pattern) => pattern.match(/^\/?(?:ojs|omp|ops)\/([^/]+)\/pgsql\/?$/))
            .filter(Boolean)
            .map((match) => match[1]);
    } catch {
        return [];
    }
}

const fresh = !fs.existsSync(path.join(DATASETS_DIR, '.git'));
if (fresh) {
    fs.mkdirSync(path.dirname(DATASETS_DIR), {recursive: true});
    console.log(`== pkp/datasets → ${path.relative(REPO_ROOT, DATASETS_DIR)} (shallow, sparse)`);
    execFileSync(
        'git',
        ['clone', '--depth', '1', '--filter=blob:none', '--no-checkout', '--sparse', REMOTE, DATASETS_DIR],
        {stdio: 'inherit'},
    );
    // Nobody pushes to pkp from here (the checkouts' rule, harness.md "The fleets").
    run('git', ['remote', 'set-url', '--push', 'origin', 'DISABLED-push-to-pkp-remotes-is-forbidden']);
}

const branches = [...new Set([...DEFAULT_BRANCHES, ...currentBranches(), ...extra])];
const patterns = ['/tools/'];
for (const app of Object.keys(APPS)) {
    for (const branch of branches) {
        patterns.push(`/${app}/${branch}/pgsql/`);
    }
}
run('git', ['sparse-checkout', 'set', '--no-cone', ...patterns]);

if (fresh) {
    run('git', ['checkout', 'main']);
} else if (update) {
    run('git', ['fetch', '--depth', '1', 'origin', 'main']);
    run('git', ['reset', '--hard', 'FETCH_HEAD']);
    // Drop the objects the previous tip held: the clone stays one commit deep.
    run('git', ['reflog', 'expire', '--expire=now', '--all']);
    run('git', ['gc', '--prune=now', '--quiet']);
} else {
    // A widened sparse set (a new --line) checks out its files here.
    run('git', ['checkout', 'main']);
    console.log('  clone: exists (--update moves it to the current datasets main)');
}

const head = read('git', ['log', '-1', '--format=%h %cI %s']);
console.log(`fetch-datasets: at ${head}`);
for (const app of Object.keys(APPS)) {
    for (const branch of branches) {
        const dump = path.join(DATASETS_DIR, app, branch, 'pgsql', 'database.sql');
        const state = fs.existsSync(dump) ? `${(fs.statSync(dump).size / 1024 / 1024).toFixed(1)} MB dump` : 'MISSING (no pgsql dataset for this branch upstream)';
        console.log(`fetch-datasets:   ${app}/${branch}/pgsql: ${state}`);
    }
}
const size = execFileSync('du', ['-sh', DATASETS_DIR], {encoding: 'utf8'}).split('\t')[0];
const gitSize = execFileSync('du', ['-sh', path.join(DATASETS_DIR, '.git')], {encoding: 'utf8'}).split('\t')[0];
console.log(`fetch-datasets: ${path.relative(REPO_ROOT, DATASETS_DIR)} takes ${size} on disk (.git ${gitSize})`);
