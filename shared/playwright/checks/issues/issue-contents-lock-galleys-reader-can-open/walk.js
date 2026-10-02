// Issue report docs/issues/U51-A7-issue-contents-lock-galleys-reader-can-open.md (U51 A7) {OJS}:
// the report's Steps to reproduce, walked through the screens on PKP's default test dataset (a
// dataset fleet, harness.md "Dataset fleets"). The kit builds nothing.
//
// Preconditions, as dbarnes:
//   C1 Settings › Distribution › "Access": "The journal will require subscriptions…", "Save"
//   C2 Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Edit" › "Access": "Subscription", "Save"
//   C3 the same issue › "Issue Galleys" › "Create Issue Galley": "PDF", u51sb5-issue.pdf, "Save"
//   P1 Settings › Distribution › "Payments": "Enable", USD, "Manual Fee Payment", instructions, "Save"
//   P2 "Payments" › "Subscription Policies": "Name", "Email address", "Mailing Address" (required), "Partial expiry", "Save"
//   P3 "Subscription Types" › "Create New Subscription Type": "Online Year u51sb5", 40 USD, 12, Online
//   P4 "Individual Subscriptions" › "Create New Subscription": ccorino, that type, Active,
//      2025-01-01 to 2025-12-31
//   P5 the issue › "Issue Data": "Date Published" 2025-06-01, "Save"
// Steps (each of dbarnes, dbuskins, mfritz, amwandenga, ccorino):
//   1 "Archives" › the issue: the links   2 press "Signalling Theory Dividends"'s "PDF", then the
//   "Full Issue" "PDF"; dbarnes also reads the article's own page (control).
// Neighbour (the fix must leave it): zwoods (Reader, no subscription) and the signed-out visitor:
//   every link locked and refused.
//
// Reset first:  npm run fleet-prep -- --feature issues-sb5 --dataset 6 --reset
// Run (main):   PROBE_FEATURE=issues-sb5 PROBE_AGENT=sb5 node bin/probe.js ojs shared/playwright/checks/issues/issue-contents-lock-galleys-reader-can-open/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-sb5-3_5 --dataset 6 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-sb5-3_5 PROBE_AGENT=sb5 node bin/probe.js ojs shared/playwright/checks/issues/issue-contents-lock-galleys-reader-can-open/walk.js
// Facts: .reports/<feature>/sb5/a7-facts[-<run>]-ojs.json (PROBE_NAME=<name> renames it)
const {forEachApp, launch, signIn, signOut, record, screen, sql} = require('../../../probe');
const L = require('./lib');

const ARTICLE = 'Signalling Theory Dividends';
const OTHER = 'Antimicrobial';

forEachApp(async (app) => {
    if (app.name !== 'ojs') return console.log(`[walk] ${app.name}: no subscriptions; not walked`);
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const f = {app: app.name, line: app.line || 'main'};
    const fact = (k, v) => {
        f[k] = v;
        console.log(`[fact] ojs ${k}: ${L.flat(JSON.stringify(v), 1600)}`);
    };
    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    const brief = (links) => L.named(links).map((l) => `${l.where} | ${l.text} | ${l.iconName}${l.screenReader ? ` | sr "${l.screenReader}"` : ''}`);
    const walkAs = async (who) => {
        await L.openIssue(page, app);
        fact(`${who} 1 issue links`, brief(await L.readLinks(page)));
        record(`a7-issue-${who}`, await screen(page));
        await L.snap(page, `a7-issue-${who}`);
        const a = await L.press(page, ARTICLE, 'PDF');
        fact(`${who} 2 article PDF`, {url: a.url, title: a.title, viewer: a.viewer, heading: a.heading, notice: a.notice});
        await L.openIssue(page, app);
        const o = await L.press(page, OTHER, 'PDF');
        fact(`${who} 2 other article PDF`, {url: o.url, title: o.title, viewer: o.viewer, heading: o.heading, notice: o.notice});
        await L.openIssue(page, app);
        const i = await L.press(page, 'Full Issue', 'PDF');
        fact(`${who} 2 Full Issue PDF`, {url: i.url, title: i.title, viewer: i.viewer, heading: i.heading, notice: i.notice});
    };
    try {
        await signIn(page, 'dbarnes');
        fact('C1 access', await L.requireSubscriptions(page));
        fact('C2 issue access', await L.restrictIssue(page));
        fact('C3 issue galley', await L.createIssueGalley(page, {label: 'PDF', file: L.PDF('u51sb5-issue.pdf')}));
        fact('P1 payments', await L.setUpPayments(page, app));
        fact('P2 partial expiry', await L.setExpiry(page, app, 'Partial expiry'));
        fact('P3 type', await L.createType(page, app, {name: 'Online Year u51sb5', cost: 40}));
        fact('P4 subscription', await L.createSubscription(page, app, {username: 'ccorino', userId: Number(sql(app, "select user_id from users where username = 'ccorino'")), type: 'Online Year u51sb5', start: '2025-01-01', end: '2025-12-31'}));
        fact('P5 issue date', await L.setIssueDate(page, '2025-06-01'));

        await walkAs('dbarnes');
        await L.openArticle(page, app, ARTICLE);
        fact('dbarnes 3 article page links', brief(await L.readLinks(page)));
        await L.snap(page, 'a7-article-dbarnes');
        for (const who of ['dbuskins', 'mfritz', 'amwandenga', 'ccorino']) {
            await signIn(page, who);
            await walkAs(who);
        }

        // Neighbour: a reader without a subscription and the visitor stay locked out.
        await signIn(page, 'zwoods');
        await walkAs('zwoods');
        await signOut(page);
        await walkAs('visitor');
    } catch (e) {
        f.error = String(e.stack || e.message).slice(0, 900);
        console.log(`[fact] ojs FAILED: ${f.error}`);
        await L.snap(page, 'a7-failed');
    } finally {
        record(process.env.PROBE_NAME || 'a7-facts', f);
        await close();
    }
});
