// Kept walk for docs/issues/U28-A10-reviewer-link-blank-page-signed-in-as-another.md (spec U28,
// register A10). On PKP's default test dataset (a dataset fleet), journal and press: dbarnes turns
// "One-click Reviewer Access" on and asks a reviewer to review a submission; the request email's
// link is then pasted into a browser signed in as dbarnes, into one signed in as the submission's
// author, and (control) into one that is not signed in. Run:
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js all \
//     shared/playwright/checks/issues/reviewer-link-blank-page-signed-in-as-another/walk.js
// WALK_MODE=neighbour runs only the neighbour check for a fix trial: another reviewer's own link,
// opened signed in as that reviewer and then signed out, opens the review wizard both times.
const {forEachApp, launch, signIn, record, note} = require('../../../probe');
const A9 = require('../reviewer-link-dead-after-second-request/lib.js');
const L = require('./lib.js');

const MODE = process.env.WALK_MODE || 'steps';

/** Per app, on the default dataset: the submission's author is the "somebody else". */
const AUTHOR = {ojs: 'dsokoloff', omp: 'afinkel'};

forEachApp(async (app) => {
    const c = A9.CASES[app.name];
    if (!c) return; // a preprint server has no review
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    /** One step, recorded; a failure is recorded, never thrown, so the walk goes on. */
    const step = async (key, fn) => {
        try {
            facts[key] = await fn();
        } catch (e) {
            facts[key] = {error: L.flat(e.message, 400)};
            note(`U28 A10 walk (${app.name}): step ${key} failed: ${L.flat(e.message, 200)}`);
        }
        return facts[key];
    };
    const ed = await launch(app);
    const page = ed.page;
    await signIn(page, 'dbarnes');
    await step('s1-setting', () => A9.enableOneClick(page, app));

    if (MODE === 'neighbour') {
        const r = c.reminded;
        const since = new Date();
        await step('n1-add', async () => A9.addReviewer(page, await A9.openWorkflow(page, app, c.b), r.name));
        const mail = await step('n1-mail', () => A9.waitMail(app, A9.mailOf(r.username), since, A9.REQUEST));
        if (mail.link) {
            const own = await launch(app);
            await signIn(own.page, r.username);
            await step('n2-own-link-signed-in', () => L.openSignedIn(own.page, app, 'n2-own-link-signed-in', mail.link));
            await own.close();
            await step('n3-own-link-signed-out', () => A9.openSignedOut(app, 'n3-own-link-signed-out', mail.link));
        }
        facts.invitations = A9.accessInvitations(app, r.username);
        record('summary', facts);
        return;
    }

    const r = c.reviewer;
    const since = new Date();
    await step('s2-add', async () => A9.addReviewer(page, await A9.openWorkflow(page, app, c.a), r.name));
    const mail = await step('s3-mail', async () => {
        const m = await A9.waitMail(app, A9.mailOf(r.username), since, A9.REQUEST);
        return {...m, link: m.link, shown: A9.masked(m.link)};
    });
    if (mail.link) {
        await step('s4-as-editor', () => L.openSignedIn(page, app, 's4-as-editor', mail.link));
        await step('s4-editor-still', () => L.whoAmI(page, app));
        await step('s4-sign-out-and-continue', () => L.signOutAndContinue(page, app, 's4-sign-out-and-continue', mail.link));
        const au = await launch(app);
        await signIn(au.page, AUTHOR[app.name]);
        await step('s5-as-author', () => L.openSignedIn(au.page, app, 's5-as-author', mail.link));
        await step('s5-author-still', () => L.whoAmI(au.page, app));
        await step('s5-sign-out-and-continue', () => L.signOutAndContinue(au.page, app, 's5-sign-out-and-continue', mail.link));
        await au.close();
        await step('s6-signed-out', () => A9.openSignedOut(app, 's6-signed-out', mail.link));
        facts['s3-mail'] = {subject: mail.subject, at: mail.at, link: A9.masked(mail.link)};
    }
    facts.invitations = A9.accessInvitations(app, r.username);
    record('summary', facts);
});
