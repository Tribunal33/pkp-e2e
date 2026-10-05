// Issue report docs/issues/U48-A22-subscription-jats-xml-served-to-refused-visitors.md (U48 A22)
// {OJS}: the report's Steps to reproduce, walked through the screens on PKP's default test
// dataset (a dataset fleet, harness.md "Dataset fleets"). The kit builds nothing; what the steps
// create is named "sxx2".
//
// WALK=steps (default), as dbarnes:
//   1 sign in   2 Settings › Distribution › "Access": subscriptions, "Save"
//   3 Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Edit" › "Access": "Subscription", "Save"
//   4 submission 5 › Publication › "Galleys" › "Add galley": "HTML", sxx2-article.html
//   5 Publication › "JATS XML": tick "Make available with publication", "Confirm"
//     [3.5: no such box; its absence is recorded]
//   6 "Schedule For Publication" into "Vol. 1 No. 2 (2014)", "Publish"
//   7-9 signed out: "Archives" › the issue › the article; press "HTML"; press "JATS XML"
//   10 as ccorino (Reader, no subscription), staying signed in: the article as in 7, then 8 and 9
//   Each refused reader also opens the JATS link's address directly (the address the article
//   page carried for dbarnes), so a fix that hides the link is checked at the address too.
// WALK=nb, the neighbour check of the fix (runs alone, on a fresh reset): with the journal open,
//   4-6, then the signed-out visitor downloads "JATS XML" (must stay); then "Payments" set up,
//   subscriptions, the issue restricted, a subscription type and an active individual
//   subscription for zwoods (Payments: USD, Manual Fee Payment; type "Online Year sxx2", individual,
//   online, 40 USD, 12 months; Active, 2026-01-01 to 2027-12-31); zwoods (subscriber), ddiouf (the article's author) and dbarnes each
//   press "HTML" and "JATS XML" (both must stay open).
//
// Reset first:  npm run fleet-prep -- --feature issues-x2 --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-x2 PROBE_AGENT=x2 node bin/probe.js ojs shared/playwright/checks/issues/subscription-jats-xml-served-to-refused-visitors/walk.js
// Neighbour:    WALK=nb PROBE_RUN=nb-in|nb-out (same command, after a reset)
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-x2-3_5 --dataset 4 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-x2-3_5 PROBE_AGENT=x2 node bin/probe.js ojs shared/playwright/checks/issues/subscription-jats-xml-served-to-refused-visitors/walk.js
// Facts: .reports/<feature>/x2/a22-<mode>[-<run>]-ojs.json
'use strict';
const {forEachApp, launch, signIn, signOut, record, screen, shot, sql} = require('../../../probe');
const L = require('./lib');
const O = require('../oai-jats-list-refused-for-one-subscription-article/lib');
const N = require('../non-pdf-galley-shown-open-refused/lib');
const S = require('../issue-contents-lock-galleys-reader-can-open/lib');
const J = require('../published-jats-xml-stays-old-after-edit/lib');

const MODE = process.env.WALK || 'steps';
const SID = 5;
const ISSUE = 'Vol. 1 No. 2 (2014)';
const TITLE = 'Genetic transformation of forest trees';
const TYPE = 'Online Year sxx2';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return console.log(`[walk] ${app.name}: no "JATS XML" link and no subscriptions; not walked`);
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const old = app.line === 'stable-3_5_0';
    const f = {mode: MODE, app: app.name, line: app.line || 'main'};
    const fact = (k, v) => {
        f[k] = v;
        console.log(`[fact] ojs ${k}: ${L.flat(JSON.stringify(v), 1500)}`);
    };
    const step = async (k, fn) => {
        try {
            fact(k, await fn());
        } catch (e) {
            fact(k, {error: L.flat(e.message, 500)});
        }
    };
    const pid = Number(sql(app, `select current_publication_id from submissions where submission_id = ${SID}`));
    f.publicationId = pid;
    const address = `/index.php/${app.contextPath}/api/v1/submissions/${SID}/publications/${pid}/jats/download`;
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);

    const prepare = async () => {
        await step('4 galley', () => N.addArticleGalley(page, app, SID, {label: 'HTML', file: L.HTML()}));
        await step('5 JATS XML page', async () => {
            const jp = await J.openJats(page, app, SID, pid);
            const box = await jp.makePublicBox().count();
            const out = {buttons: await jp.buttonLabels(), box: box > 0, line: L.flat(await jp.line().innerText().catch(() => null), 200)};
            if (box) out.save = await J.tickMakeAvailable(jp);
            if (box) out.ticked = await jp.makePublicBox().isChecked();
            await shot(page, `a22-${MODE}-jats-page`).catch(() => {});
            return out;
        });
        await step('6 publish', () => N.publishIntoIssue(page, app, SID));
    };
    // Steps 7-9 for one reader (signed in already, or signed out): the article page, "HTML", "JATS XML".
    const readAs = async (who) => {
        await step(`${who} 7 article page`, async () => {
            const at = await L.openArticle(page, app, ISSUE, TITLE);
            const links = await L.articleLinks(page);
            record(`a22-${MODE}-article-${who}`, await screen(page));
            await shot(page, `a22-${MODE}-article-${who}`).catch(() => {});
            return {...at, links};
        });
        await step(`${who} 8 HTML`, () => L.press(page, app, 'HTML'));
        await step(`${who} 9 JATS XML`, async () => {
            await L.openArticle(page, app, ISSUE, TITLE);
            return L.press(page, app, 'JATS XML');
        });
        await step(`${who} 9 address`, () => L.openAddress(page, app, address));
    };

    try {
        await signIn(page, 'dbarnes');
        if (MODE === 'steps') {
            await step('2 subscriptions', () => O.requireSubscriptions(page));
            await step('3 issue access', () => O.restrictIssue(page, ISSUE));
            await prepare();
            await step('dbarnes control: article page', async () => {
                await L.openArticle(page, app, ISSUE, TITLE);
                return {links: await L.articleLinks(page)};
            });
            await signOut(page);
            await readAs('visitor');
            await signIn(page, 'ccorino');
            await readAs('ccorino');
            await signOut(page);
        } else {
            await prepare();
            await signOut(page);
            await readAs('nb-open-visitor');
            await signIn(page, 'dbarnes');
            await step('nb payments', () => S.setUpPayments(page, app));
            await step('nb 2 subscriptions', () => O.requireSubscriptions(page));
            await step('nb 3 issue access', () => O.restrictIssue(page, ISSUE));
            await step('nb type', () => S.createType(page, app, {name: TYPE, cost: 40}));
            await step('nb subscription zwoods', () =>
                S.createSubscription(page, app, {username: 'zwoods', userId: Number(sql(app, "select user_id from users where username = 'zwoods'")), type: TYPE, start: '2026-01-01', end: '2027-12-31'})
            );
            await readAs('nb-dbarnes');
            for (const who of ['zwoods', 'ddiouf']) {
                await signIn(page, who);
                await readAs(`nb-${who}`);
            }
            await signOut(page);
        }
    } catch (e) {
        f.error = L.flat(e.stack || e.message, 900);
        console.log(`[fact] ojs FAILED: ${f.error}`);
    } finally {
        record(`a22-${MODE}`, f);
        await close();
    }
});
