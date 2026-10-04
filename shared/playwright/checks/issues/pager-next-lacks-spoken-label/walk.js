// U23 A10 issue walk (docs/issues/U23-A10-pager-next-lacks-spoken-label.md): the pager under a
// long list gives "Previous" and each page number a spoken name ("Go to Previous", "Go to
// Page 2") and "Next" none, so a screen reader announces plain "Next". On PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"), `publicknowledge`. The editorial
// dashboard pages at 30 and the dataset holds 18 to 20 submissions, so the walk reads the same
// pager under Settings › Users & Roles › "Users" (25 a page: OJS 39 users, OMP 38, OPS 25 + 1).
// The kit builds nothing; on OPS the steps register one account (`u23r3reader`) on screen.
//
// MODE=walk (default): (OPS: register u23r3reader, signed out) 1 sign in as rvaca; 2 Users &
//   Roles › Users; 3 read the pager's names on page 1; 4 press "Next", read them on page 2.
// MODE=nb, the neighbour alone (with a fix in and out), every step recorded, none throwing:
//   page 2, "Previous" still takes the list back to page 1, "Next" is disabled on the last page
//   and enabled on the first, the visible texts stay "Previous", "1", "2", "Next", and the other
//   buttons' names do not change.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/pager-next-lacks-spoken-label/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/a10-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle} = require('../../../probe');
const H = require('./lib.js');
const {registerReader} = require('../login-from-journal-not-public-forgets-page/lib.js');

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    const o = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) { o[key] = {threw: H.flat(e.message, 400)}; }
        console.log(`[a10 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 2000));
        record(`a10-${MODE}-${key}`, await screen(page).catch(() => ({url: page.url()})));
        await shot(page, `a10-${MODE}-${key}`).catch(() => {});
        return o[key];
    };
    try {
        if (app.name === 'ops') {                                                          // precondition
            await step('register', () => registerReader(page, app, {givenName: 'Ursula', familyName: 'Pager', username: 'u23r3reader'}));
            await signOut(page).catch(() => {});
        }
        await step('users', async () => {                                                  // 1, 2
            await signIn(page, 'rvaca');
            return H.openUsers(page, app);
        });
        if (MODE === 'nb') {
            await step('page1', () => H.pagerFacts(page));
            await step('next', () => H.pressPager(page, 'Next'));
            await step('page2', () => H.pagerFacts(page));
            await step('previous', () => H.pressPager(page, 'Previous'));
            await step('back', () => H.pagerFacts(page));
        } else {
            await step('page1', () => H.pagerFacts(page));                                 // 3
            await step('next', () => H.pressPager(page, 'Next'));                          // 4
            await step('page2', () => H.pagerFacts(page));
        }
    } finally {
        record(`a10-facts-${MODE}`, o);
        await idle(page).catch(() => {});
        await close();
    }
});
