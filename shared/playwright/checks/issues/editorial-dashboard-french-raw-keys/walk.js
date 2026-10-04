// U23 A12 issue walk: with the interface in French (Canada), the editorial "Submissions" dashboard
// shows raw codes: the "…" button above the list (##common.moreActions##), the screen reader's
// "Loaded" (##common.loaded##), an accepted reviewer's indicator and its popover's headline
// (##dashboard.reviewAssignment.statusAccepted.title##) and, on a press, the Filters panel's
// "Assigned To Editor" field (##editor.submissions.assignedTo##). Reports:
//   docs/issues/U53-A11-users-tab-french-raw-keys.md (common.moreActions, common.loaded),
//   docs/issues/U22-A6-my-submissions-french-review-counter-raw-key.md (the indicator),
//   docs/issues/U69-A15-omp-french-book-page-raw-keys.md (the press's field, OMP's own French texts).
// On PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"), `publicknowledge`,
// which offers English and French (Canada). The kit builds nothing.
//
// MODE=walk (default), the Steps:
//   1-2 (OJS submission 12, OMP 17; a preprint server has no review) phudson signs in, "Respond to
//       request" on the row under "Action Required by me", "Accept Review, Continue to Step #2";
//   3 dbarnes signs in; 4 initials menu > "Change Language" > "français"; 5 "Soumissions actives"
//   in the side menu, and what the screen reader hears once the list has loaded; 6 the "…" button
//   above the list and its menu; 7 the submission's "Activité éditoriale" cell and the accepted
//   reviewer's indicator's popover; 8 "Filtres" and the panel's fields; 9 the list's search box,
//   the submission's ID and Enter, and what the screen reader hears; then every code on the page.
// MODE=nb, the neighbour alone (with a fix in and out), changes nothing, no step throws: dbarnes in
//   English (steps 5 to 8 on a submission with completed reviews, OJS 10, OMP 16, OPS none), then
//   the same in French: the texts the fix must leave as they are.
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset [--apps ojs]
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/editorial-dashboard-french-raw-keys/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front, with the 3.5 fleet's feature.
// Facts: .reports/<feature>/<id>/a12-facts-<mode>[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, rawKeys} = require('../../../probe');
const {changeLanguage} = require('../custom-block-stuck-with-unusable-name/lib');
const H = require('../accepted-review-row-due-date-clock-time/lib.js');
const L = require('../reviewer-own-round-listed-under-previous-reviews/lib.js');
const D = require('./lib.js');

const MODE = process.env.MODE || 'walk';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const c = D.REVIEW[app.name] || null;
    const o = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    const step = async (key, fn) => {
        try { o[key] = await fn(); } catch (e) { o[key] = {threw: D.flat(e.message, 400)}; }
        console.log(`[a12 ${app.name} ${MODE}] ${key}`, JSON.stringify(o[key]).slice(0, 2500));
        record(`a12-${MODE}-${key}`, await screen(page).catch(() => ({url: page.url()})));
        await shot(page, `a12-${MODE}-${key}`).catch(() => {});
        return o[key];
    };
    // Steps 5 to 8 (and 9) in the language the page is in, on submission `id`.
    const readDashboard = async (lang, id, search) => {
        await step(`${lang}-5-active`, () => D.openActive(page));
        await step(`${lang}-6-more-actions`, () => D.moreActions(page));
        if (id) {
            await step(`${lang}-7-row`, async () => {
                const row = await D.rowOf(page, id);
                if (!row.listed) return row;
                row.popovers = [];
                for (let n = 0; n < row.indicators.length; n++) row.popovers.push(await D.openIndicator(page, row.index, n));
                return row;
            });
        }
        await step(`${lang}-8-filters`, () => D.filtersPanel(page));
        if (search) await step(`${lang}-9-search`, () => D.searchList(page, search));
        await step(`${lang}-codes`, async () => [...new Set(((await rawKeys(page)) || []).map(String))]);
    };
    try {
        if (MODE === 'nb') {
            await step('nb-sign-in', async () => {
                await signIn(page, 'dbarnes');
                await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
                await idle(page);
                return {opened: page.url().replace(/^https?:\/\/[^/]+/, '')};
            });
            await readDashboard('en', c && c.completed, null);
            await step('nb-language', async () => { await changeLanguage(page, 'français', 'fr_CA'); return {url: page.url().replace(/^https?:\/\/[^/]+/, '')}; });
            await readDashboard('fr_CA', c && c.completed, null);
        } else {
            if (c) {
                await step('1-reviewer-list', async () => {
                    await signIn(page, c.reviewer);
                    return H.openRow(page, app, 'reviewer-action-required', c.id);
                });
                await step('2-accept', async () => ({...(await H.respond(page, c.id, 'Respond to request')), ...(await L.acceptReview(page))}));
                await page.goto('about:blank');
                await signOut(page).catch(() => {});
            }
            await step('3-sign-in', async () => {
                await signIn(page, 'dbarnes');
                await idle(page);
                const landed = page.url().replace(/^https?:\/\/[^/]+/, '');
                await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
                await idle(page);
                return {landed, opened: page.url().replace(/^https?:\/\/[^/]+/, '')};
            });
            await step('4-language', async () => {
                await changeLanguage(page, 'français', 'fr_CA');
                return {url: page.url().replace(/^https?:\/\/[^/]+/, ''), htmlLang: await page.locator('html').getAttribute('lang')};
            });
            await readDashboard('fr_CA', c && c.id, c ? c.id : 1);
            // the control: the same page in English
            await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
            await idle(page);
            await readDashboard('en', c && c.id, c ? c.id : 1);
        }
    } finally {
        record(`a12-facts-${MODE}`, o);
        await idle(page).catch(() => {});
        await close();
    }
});
