// Issue report docs/issues/U51-A30-article-without-issue-galleys-open-to-all.md (U51 A30): the
// report's Steps to reproduce, walked through the screens on PKP's default test dataset (a
// dataset fleet, harness.md "Dataset fleets"), journal `publicknowledge`, as the dataset's users.
// The kit builds nothing; OJS alone has the surface (issues and subscriptions are a journal's).
//
//   1-2  dbarnes adds a "PDF" galley to submission 5 (Production) and publishes it with
//        "Don't Assign To An Issue"
//   3-5  "Users must be registered and log in to view open access content." ticked; signed out,
//        article 17 (in "Vol. 1 No. 2 (2014)", the control) and article 5: press "PDF"
//   6-10 the box unticked, "Publishing Mode" on subscriptions, the issue's "Access status"
//        "Subscription"; signed out, articles 17 and 5: the link's padlock, press "PDF"
//   11   ccorino (Reader, no subscription): articles 17 and 5
// Neighbour (`neighbour` as the argument; with the fix in and out): steps 1-2, then on the open
//   journal a signed-out visitor presses article 5's "PDF" (must stay open); then subscriptions,
//   payments, a type and an "Active" subscription for ccorino: ccorino and dbarnes press it (must
//   stay open).
// Way round (`wayround`): steps 1-2 and 7-8, then "Unpublish",
//   "Schedule For Publication" into "Vol. 1 No. 2 (2014)"; signed out and ccorino press article 5's "PDF".
// On stable-3_5_0 the publish window asks for an issue: the script records it and walks the
// control article (17) only.
//
// Reset first:  npm run fleet-prep -- --feature issues-x3 --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-x3 PROBE_AGENT=x3 node bin/probe.js ojs shared/playwright/checks/issues/article-without-issue-galleys-open-to-all/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-x3-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-x3-3_5 PROBE_AGENT=x3 node bin/probe.js ojs shared/playwright/checks/issues/article-without-issue-galleys-open-to-all/walk.js
// Facts: .reports/<feature>/x3/a30-walk[-<run>]-ojs.json, a30-neighbour[-<run>]-ojs.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, sql} = require('../../../probe');
const L = require('./lib');

const NEIGHBOUR = process.argv.includes('neighbour');
const WAYROUND = process.argv.includes('wayround'); // an article already published with no issue, moved into the restricted issue
const WINDOW_ONLY = process.argv.includes('publish-window'); // 3.5: steps 1-2's windows alone
const ARTICLE = 5;
const CONTROL = 17;

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const on35 = app.line === 'stable-3_5_0';
    const facts = {line: app.line, dataset: app.dataset, neighbour: NEIGHBOUR, steps: {}, presses: []};
    const step = (k, v) => {
        facts.steps[k] = v;
        console.log(`${k}: ${JSON.stringify(v).slice(0, 300)}`);
    };
    const press = async (who, id, label) => {
        const r = await L.pressPdf(page, app, id);
        facts.presses.push({label, who, ...r});
        console.log(`[${label}] ${L.line(who, r)}`);
        await shot(page, `a30-${label}-${who.replace(/\W/g, '')}-${id}`).catch(() => {});
        return r;
    };
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    try {
        await signIn(page, 'dbarnes');
        if (!on35) {
            step('1 add galley', await L.addPdfGalley(page, app, ARTICLE, 'sxx3-forest-trees.pdf'));
            step('2 publish without issue', await L.publishWithoutIssue(page, app, ARTICLE));
            step('2 stored', sql(app, `select p.status, coalesce(p.issue_id::text,'none'), p.access_status from publications p join submissions s on s.current_publication_id = p.publication_id where s.submission_id = ${ARTICLE}`));
        } else {
            step('1-2 publish window (3.5)', await L.publishWithoutIssue(page, app, ARTICLE));
            if (WINDOW_ONLY) return;
        }
        const ids = on35 ? [CONTROL] : [CONTROL, ARTICLE];

        if (WAYROUND) {
            step('w1 subscriptions', await L.requireSubscriptions(page));
            step('w2 issue access', await L.restrictIssue(page));
            step('w3 move into issue', await L.moveIntoIssue(page, app, ARTICLE, L.ISSUE));
            step('w3 stored', sql(app, `select p.status, coalesce(p.issue_id::text,'none') from publications p join submissions s on s.current_publication_id = p.publication_id where s.submission_id = ${ARTICLE}`));
            await signOut(page);
            await press('(signed out)', ARTICLE, 'wayround');
            await signIn(page, 'ccorino');
            await press('ccorino', ARTICLE, 'wayround');
            return;
        }
        if (NEIGHBOUR) {
            await signOut(page);
            await press('(signed out)', ARTICLE, 'nb-open-journal');
            await signIn(page, 'dbarnes');
            step('n1 subscriptions', await L.requireSubscriptions(page));
            step('n2 issue access', await L.restrictIssue(page));
            const userId = Number(sql(app, "select user_id from users where username = 'ccorino'"));
            step('n3 subscriber', await L.subscribe(page, app, 'ccorino', userId));
            await press('dbarnes', ARTICLE, 'nb-editor');
            await signIn(page, 'ccorino');
            for (const id of [CONTROL, ARTICLE]) await press('ccorino', id, 'nb-subscriber');
            await signOut(page);
            await press('(signed out)', ARTICLE, 'nb-subscription-signed-out');
            return;
        }

        // Registered readers only.
        step('3 registered only', await L.setRegisteredOnly(page, app, true));
        await signOut(page);
        for (const id of ids) await press('(signed out)', id, 'registered');

        // Subscriptions.
        await signIn(page, 'dbarnes');
        step('6 box unticked', await L.setRegisteredOnly(page, app, false));
        step('7 subscriptions', await L.requireSubscriptions(page));
        step('8 issue access', await L.restrictIssue(page));
        await signOut(page);
        for (const id of ids) {
            const r = await press('(signed out)', id, 'subscription');
            if (id === ARTICLE || on35) record(`a30-subscription-landing-${id}`, await screen(page));
        }
        await signIn(page, 'ccorino');
        for (const id of ids) await press('ccorino', id, 'subscription');
    } finally {
        record(NEIGHBOUR ? 'a30-neighbour' : WAYROUND ? 'a30-wayround' : WINDOW_ONLY ? 'a30-publish-window' : 'a30-walk', facts);
        await close();
    }
});
