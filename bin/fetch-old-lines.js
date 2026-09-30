#!/usr/bin/env node
/**
 * @file bin/fetch-old-lines.js
 *
 * Fetch pkp's 3.4 and 3.3 release branches into the main checkouts as
 * read-only refs, for the version reads of an issue report (REPORT.md "Affects"):
 *
 *   npm run fetch-old-lines [-- ojs omp]
 *
 * Per app: the app checkout's `upstream` remote and the `origin` of its
 * lib/pkp and lib/ui-library submodules are single-branch (main
 * only), so each branch is fetched with an explicit refspec into
 * refs/remotes/<remote>/<branch>. Read them with
 * `git show upstream/stable-3_4_0:<path>` (app) or
 * `git show origin/stable-3_4_0:<path>` (lib/pkp). Nothing is checked
 * out; the working trees stay as they are. A branch a repo does not have
 * is reported and skipped.
 */
const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');
const {APPS, resolveApp} = require('./apps.js');

// 3.5 is not here: it has checkouts of its own (checkouts/stable-3_5_0).
const BRANCHES = ['stable-3_4_0', 'stable-3_3_0'];

function fetchInto(dir, remote) {
    if (!fs.existsSync(path.join(dir, '.git'))) return;
    for (const branch of BRANCHES) {
        const r = spawnSync('git', ['fetch', '--quiet', remote, `+refs/heads/${branch}:refs/remotes/${remote}/${branch}`], {cwd: dir, encoding: 'utf8'});
        const where = path.relative(process.cwd(), dir) || '.';
        if (r.status === 0) console.log(`  ${where}: ${remote}/${branch}`);
        else console.log(`  ${where}: ${branch} skipped (${(r.stderr || '').trim().split('\n').pop()})`);
    }
}

const apps = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(APPS);
for (const name of apps) {
    const {root} = resolveApp(name);
    console.log(name);
    fetchInto(root, 'upstream');
    fetchInto(path.join(root, 'lib', 'pkp'), 'origin');
    fetchInto(path.join(root, 'lib', 'ui-library'), 'origin');
}
