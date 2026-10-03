// Issue report docs/issues/U15-OMP1-OPS3-search-rebuild-by-path-empties-other-contexts.md
// (U15 OMP1, OPS3): the report's Steps to reproduce, walked on PKP's default test dataset (a
// dataset fleet, harness.md "Dataset fleets"). The command line is the system administrator's
// screen: each command runs in the application's directory under the install's own config.
// The kit builds nothing: the second context is made through the screens.
//
// Default mode (OJS, OMP, OPS):
//   0. `admin` › Administration › Hosted Journals (Presses, Servers) › "Create Journal" (…):
//      "u15i Second", path `u15i`.
//   1. A visitor searches `publicknowledge` for the word (lib.js WORD).
//   2. php lib/pkp/tools/jobs.php total
//   3. php tools/rebuildSearchIndex.php u15i
//   4. php lib/pkp/tools/jobs.php total
//   5. The visitor searches again.
//   6. php lib/pkp/tools/jobs.php work --stop-when-empty
//   7. The visitor searches again.
// `nb` as the argument (the neighbour; the fix in and out; no second context): the visitor's
//   search, then `rebuildSearchIndex.php` with no path, the queue, the search, the queue run, the
//   search; then the same with `publicknowledge` as the path.
// Each step records what it finds rather than throwing, so the same script reads the fix.
//
// Reset first:  npm run fleet-prep -- --feature issues-u15i --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-u15i PROBE_AGENT=u15i node bin/probe.js all shared/playwright/checks/issues/search-rebuild-by-path-empties-other-contexts/walk.js [nb]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u15i-3_5 --dataset 1 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u15i-3_5 PROBE_AGENT=u15i node bin/probe.js all shared/playwright/checks/issues/search-rebuild-by-path-empties-other-contexts/walk.js
// Facts: .reports/<feature>/u15i/facts[-nb][-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record} = require('../../../probe');
const {flat, WORD, cli, queued, search} = require('./lib');
const {createContext} = require('../all-dates-error-nothing-published/lib');

const MODE = process.argv.includes('nb') ? 'nb' : 'steps';
const SECOND = 'u15i';

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line, mode: MODE, steps: []};
    const step = (name, data) => { facts.steps.push({step: name, ...data}); return data; };
    const w = WORD[app.name];
    const {page, close} = await launch(app);
    const visitorSearch = async (name) => {
        const r = step(name, await search(app, page, app.contextPath, w).catch((e) => ({error: flat(e.message, 300)})));
        record(`${MODE === 'nb' ? 'nb-' : ''}${name}`, await screen(page));
        return r;
    };
    try {
        if (MODE === 'steps') {
            await signIn(page, 'admin');
            const status = await createContext(page, app, {name: 'u15i Second', initials: 'U15I', path: SECOND, email: 'u15i@mailinator.com'})
                .catch((e) => `error ${flat(e.message, 300)}`);
            step('0 create second context', {status, url: page.url()});
            await shot(page, 'second-context');
            await signOut(page);
            await visitorSearch('1-search-before');
            step('2 queue before', queued(app));
            step('3 rebuild', cli(app, ['tools/rebuildSearchIndex.php', SECOND]));
            step('4 queue after rebuild', queued(app));
            await visitorSearch('5-search-after-rebuild');
            step('6 run queue', cli(app, ['lib/pkp/tools/jobs.php', 'work', '--stop-when-empty']));
            step('6 queue after run', queued(app));
            await visitorSearch('7-search-after-queue');
        } else {
            await visitorSearch('nb-0-search-before');
            for (const target of [null, app.contextPath]) {
                const label = target ? `path ${target}` : 'no path';
                step(`nb queue before (${label})`, queued(app));
                step(`nb rebuild (${label})`, cli(app, ['tools/rebuildSearchIndex.php', ...(target ? [target] : [])]));
                step(`nb queue after rebuild (${label})`, queued(app));
                await visitorSearch(`nb-search-after-rebuild-${target ? 'path' : 'all'}`);
                step(`nb run queue (${label})`, cli(app, ['lib/pkp/tools/jobs.php', 'work', '--stop-when-empty']));
                await visitorSearch(`nb-search-after-queue-${target ? 'path' : 'all'}`);
            }
        }
    } catch (e) {
        facts.error = flat(e.stack, 1200);
    } finally {
        record(MODE === 'nb' ? 'facts-nb' : 'facts', facts);
        await close();
    }
    const brief = facts.steps.map((s) => `${s.step}: ${s.count != null ? `queued ${s.count}` : s.listed != null ? `listed ${s.listed} | ${s.line}` : s.command ? `${s.command} exit ${s.exit} ${flat(s.stdout, 160)} ${flat(s.stderr, 200)}` : flat(JSON.stringify(s), 200)}`);
    console.log(`[${app.name}] ${MODE}\n  ${brief.join('\n  ')}${facts.error ? `\n  ERROR ${facts.error}` : ''}`);
});
