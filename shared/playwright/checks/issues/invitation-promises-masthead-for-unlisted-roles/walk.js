// Kept walk of issue report docs/issues/U06-A11-invitation-promises-masthead-for-unlisted-roles.md
// (U06 A11). On PKP's default test dataset: as a visitor About > "Editorial Masthead"; as `rvaca`,
// Settings > Users & Roles, "Invite to a role" for David Buskins (`dbuskins`, Section editor /
// Series editor / Moderator, listed on the masthead) offering "Author" with "Appear on the
// masthead"; the email read; signed out, the emailed accept link and "Accept And Continue to …";
// the masthead page again; then a second invitation to him offering "Reader", and its email.
//
// `neighbour` as argument walks only the neighbour check instead: Carlo Corino (OMP: Arthur
// Clark), who holds Author and Reader with no masthead choice, invited to "Editorial Board
// Member" with "Appear on the masthead"; the email read.
//
// Reset first:  npm run fleet-prep -- --feature issues-u06g --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-u06g PROBE_AGENT=u06g node bin/probe.js all shared/playwright/checks/issues/invitation-promises-masthead-for-unlisted-roles/walk.js [neighbour]
// 3.5:          prefix both with PKP_E2E_LINE=stable-3_5_0 (feature issues-u06g-3_5), PROBE_RUN=r35
// Facts: .reports/<feature>/u06g/walk[-<run>]-<app>.json (neighbour: neighbour[-<run>]-<app>.json)
const {forEachApp, launch, signIn, signOut, record, serverLog} = require('../../../probe');
const H = require('./lib.js');
const A5 = require('../invitation-sent-promises-decision-updates/lib.js');

const neighbour = process.argv.slice(2).includes('neighbour');

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, neighbour};
    const log = serverLog(app);
    const mark = log.mark();
    const name = neighbour ? 'neighbour' : 'walk';
    const save = () => record(name, facts);
    const strip = (o, key) => {
        record(key, {details: o.details, compose: o.compose});
        delete o.details;
        delete o.compose;
        return o;
    };
    const {page, close} = await launch(app);
    try {
        if (neighbour) {
            const p = c.neighbour;
            await signIn(page, H.INVITER);
            const since = new Date(Date.now() - 2000);
            facts.invite = strip(await H.invite(page, app, {email: p.email, role: 'Editorial Board Member'}), 'nb-01-invite');
            facts.email = await H.invitationEmail(app, p.email, since);
            save();
            return;
        }
        const p = c.invitee;
        // 1. visitor: the masthead page
        facts.mastheadBefore = await H.mastheadPage(page, app);
        record('01-masthead-before', facts.mastheadBefore.screen);
        delete facts.mastheadBefore.screen;
        save();
        // 2-4. rvaca invites him to Author, "Appear on the masthead"
        await signIn(page, H.INVITER);
        let since = new Date(Date.now() - 2000);
        facts.invite1 = strip(await H.invite(page, app, {email: p.email, role: 'Author'}), '02-invite-author');
        save();
        // 5. the email
        facts.email1 = await H.invitationEmail(app, p.email, since);
        save();
        // 6. signed out, the accept link
        await signOut(page);
        if (facts.email1.accept) {
            const acc = await A5.accept(page, app, facts.email1.accept);
            record('03-accept', {before: acc.before, after: acc.after});
            facts.accepted = acc.dialogText;
            save();
        }
        // 7. the masthead page again
        facts.mastheadAfter = await H.mastheadPage(page, app);
        record('04-masthead-after', facts.mastheadAfter.screen);
        delete facts.mastheadAfter.screen;
        save();
        // 8-9. a second invitation, offering Reader
        await signIn(page, H.INVITER);
        since = new Date(Date.now() - 2000);
        facts.invite2 = strip(await H.invite(page, app, {email: p.email, role: 'Reader'}), '05-invite-reader');
        facts.email2 = await H.invitationEmail(app, p.email, since);
        save();
    } finally {
        facts.serverLog = log.since(mark);
        save();
        await close();
    }
});
