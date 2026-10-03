// U39 A5: with the configuration file's `strict = On`, "OK" in a Submission Library file's
// "Delete" dialog ends in a server error. The Steps, on PKP's default test dataset, signed in as
// `dbarnes`, on OJS submission 4 / OMP submission 8 / OPS submission 1:
//   1-3  the workflow, "Library" (the "Submission Library" window)
//   4    "Add a file": "u39f contract", "Other", a small file, "OK"
//   5-6  the row's arrow, "Delete", "OK"; what follows is read for ten seconds
// Control: Settings › Workflow › "Publisher Library" ("Press Library", "Preprint Server Library"),
// "u39f guide" added and deleted the same way.
// `nb` as the argument runs the neighbour check alone (for a fix trial): the Publisher Library
// delete (the sibling list the fix leaves alone), the dashboard's sidebar search for a word, and
// (OJS, OMP) `jjanssen`'s step 3 "Reviewer Files" list after accepting the review.
// The kit builds nothing. The script does not touch the configuration: the walker sets
// `strict = On` in the fleet's config file after the reset (the reset writes it Off) and puts it
// back afterwards; the facts record the value each run read.
//
// Reset first: PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Strict on:   sed -i '' 's/^strict = Off$/strict = On/' <app root>/config.test.ds<n>.inc.php   (and back to Off after)
// Run:         PROBE_FEATURE=<feature> PROBE_AGENT=<id> [PROBE_RUN=<r>] node bin/probe.js all shared/playwright/checks/issues/library-delete-strict-mode-error/walk.js [nb]
const fs = require('fs');
const {forEachApp, launch, signIn, signOut, record, screen, shot} = require('../../../probe');
const L = require('./lib.js');

const MODE = process.argv[2] || 'walk';
const SUBMISSION = {ojs: 4, omp: 8, ops: 1};
const REVIEW = {ojs: 12, omp: 17};             // jjanssen, not yet responded
const SEARCH = {ojs: 'cashmere', omp: 'Canada', ops: 'cashmere'};
const CONTRACT = 'u39f contract';
const GUIDE = 'u39f guide';

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line, mode: MODE};
    const fact = (k, v) => { facts[k] = v; console.log('[walk]', app.name, k, JSON.stringify(v).slice(0, 1500)); };
    const cfg = app.configFile && fs.existsSync(app.configFile) ? fs.readFileSync(app.configFile, 'utf8') : '';
    fact('strict', (cfg.match(/^strict\s*=\s*(\S+)/m) || [])[1] || null);
    const {page, close} = await launch(app);
    const dialogs = L.watchDialogs(page);
    const net = L.watchCalls(page, /delete-file|fetch-grid|_submissions|reviewer-review-attachments-grid/);
    const step = async (name, fn) => {
        net.step = name; dialogs.step = name;
        try { fact(name, {...(await fn()), calls: net.since(name).filter((c) => c.status >= 400 || /delete-file|_submissions\?|searchPhrase|reviewer-review-attachments-grid/.test(c.url))}); }
        catch (e) { fact(name, {error: L.flat(e.message, 300), calls: net.since(name)}); }
    };
    try {
        await signIn(page, 'dbarnes');
        if (MODE === 'walk') {
            let list;
            await step('s1-4-add', async () => {
                list = await L.openSubmissionLibrary(page, app, SUBMISSION[app.name]);
                await L.addFile(list, CONTRACT, 'Other');
                await L.sleep(500);
                return {listed: (await list.groupNameLinks('Other').allInnerTexts()).map((t) => L.flat(t))};
            });
            await step('s5-6-delete', async () => {
                const out = await L.deleteRead(page, app, list, CONTRACT, 'Other', dialogs);
                await shot(page, 'after-delete');
                record('screen-after-delete', await screen(page));
                return out;
            });
            await step('c1-publisher-library-delete', async () => {
                const pl = await L.openPublisherLibrary(page, app);
                await L.addFile(pl, GUIDE, 'Other');
                return L.deleteRead(page, app, pl, GUIDE, 'Other', dialogs);
            });
        } else {
            await step('nb1-publisher-library-delete', async () => {
                const pl = await L.openPublisherLibrary(page, app);
                await L.addFile(pl, GUIDE, 'Other');
                return L.deleteRead(page, app, pl, GUIDE, 'Other', dialogs);
            });
            await step('nb2-dashboard-search', async () => L.dashboardSearch(page, app, SEARCH[app.name]));
            if (REVIEW[app.name]) {
                await signOut(page);
                await signIn(page, 'jjanssen');
                await step('nb3-reviewer-step3', async () => L.reviewerStep3Read(page, app, REVIEW[app.name]));
                await shot(page, 'reviewer-step3');
            }
        }
    } finally {
        facts.dialogs = dialogs.dialogs;
        record(MODE === 'walk' ? 'facts' : `facts-${MODE}`, facts);
        await close();
    }
});
