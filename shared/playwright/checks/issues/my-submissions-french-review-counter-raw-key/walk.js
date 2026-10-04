// Issue report docs/issues/U22-A6-my-submissions-french-review-counter-raw-key.md (its fix.diff),
// and the "…" half of docs/issues/U53-A11-users-tab-french-raw-keys.md: in French (Canada) the
// author's "My Submissions" shows "##dashboard.reviewUpdateCounts##" in a submission-under-review
// row's Editorial Activity cell (OJS, OMP), and the "…" button above the list is named
// "##common.moreActions##" (all three apps). Takes the report's Steps on PKP's default test dataset:
//   1. the author signs in (OJS jnovak, submission 10; OMP mpower, submission 16; OPS ccorino,
//      submission 1, which has no review, so only the "…" button applies there)
//   2. the row's Editorial Activity cell in English
//   3. the initials menu > "Change Language" > "français"
//   4. the same row's "Activité éditoriale" cell
//   5. the name of the "…" button above the list, and its menu
// Changes nothing. NB=1 runs the neighbour check alone: steps 1, 2 and 5 in English, which the fix
// must leave as they are, plus the French list's other activity cells (step 4 of the other rows).
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/my-submissions-french-review-counter-raw-key/walk.js
//      (PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 in front for 3.5; PROBE_RUN=fix|nb-in|nb-out for the fix trial)
const {forEachApp, launch, signIn, signOut, screen, record, idle, rawKeys} = require('../../../probe');
const {changeLanguage} = require('../custom-block-stuck-with-unusable-name/lib');
const {T, flat, AUTHOR, openMySubmissions, rowFacts, allRows, moreActionsFacts} = require('./lib');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const nb = !!process.env.NB;
    const who = AUTHOR[app.name];
    const facts = {app: app.name, line: app.line || 'main', mode: nb ? 'neighbour' : 'steps', author: who.username, submission: who.id};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 2500)}`);
    };
    const {page, close} = await launch(app);
    try {
        // 1
        await signIn(page, who.username);
        await openMySubmissions(app, page, 'en');
        record('en-1-my-submissions', await screen(page));
        // 2
        fact('2 row (en)', await rowFacts(page, who.title));
        // 5 in English (the control)
        fact('5 "…" button (en)', await moreActionsFacts(page));
        if (nb) {
            // the French list's other rows: their activity cells must read as before
            await changeLanguage(page, 'français', 'fr_CA');
            await openMySubmissions(app, page, 'fr_CA');
            fact('nb rows (fr_CA)', await allRows(page));
            await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/mySubmissions`));
            await openMySubmissions(app, page, 'en');
            fact('nb rows (en)', await allRows(page));
        } else {
            // 3
            await changeLanguage(page, 'français', 'fr_CA');
            fact('3 language', {url: page.url().replace(/^https?:\/\/[^/]+/, ''), htmlLang: await page.locator('html').getAttribute('lang')});
            await openMySubmissions(app, page, 'fr_CA');
            record('fr_CA-4-my-submissions', await screen(page));
            // 4
            fact('4 row (fr_CA)', await rowFacts(page, who.title));
            // 5
            fact('5 "…" button (fr_CA)', await moreActionsFacts(page));
            const keys = await rawKeys(page, {scope: 'main'}).catch((e) => `rawKeys failed: ${e.message}`);
            fact('raw keys (main)', Array.isArray(keys) ? [...new Set(keys.map(String))] : keys);
        }
        await page.goto('about:blank');
        await signOut(page).catch(() => {});
    } finally {
        record(`${nb ? 'nb' : 'steps'}-facts`, facts);
        await close();
    }
});
