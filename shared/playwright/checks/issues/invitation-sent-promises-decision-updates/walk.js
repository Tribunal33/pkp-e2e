// Kept walk of issue report docs/issues/U06-A5-invitation-sent-promises-decision-updates.md (U06 A5).
// On PKP's default test dataset, as `rvaca`: Settings > Users & Roles, "Invite to a role" for two
// authors who hold no editorial role (OJS and OPS: Carlo Corino, Catherine Kwantes; OMP: Arthur
// Clark, Alvin Finkel) to "Copyeditor" (OPS: "Moderator"), each "Invitation Sent" dialog read and
// "View All Users" pressed; signed out, the first accepts through the emailed link, the second
// declines; `rvaca` signs in again: the header's "Tasks", `rvaca@mailinator.com`'s mailbox, and
// Users & Roles (the Invitations table, both people's "Roles" under Current Users).
//
// `neighbour` as argument walks only the neighbour check instead: one invitation (OJS and OPS:
// Domatilia Sokoloff; OMP: Bob Barnetson), its "Invitation Sent" text, its Invitations row while
// pending, then the invitee's accept and their closing dialog, and the row after.
//
// Reset first:  npm run fleet-prep -- --feature issues-u06b --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-u06b PROBE_AGENT=u06b node bin/probe.js all shared/playwright/checks/issues/invitation-sent-promises-decision-updates/walk.js [neighbour]
// 3.5:          prefix both with PKP_E2E_LINE=stable-3_5_0 (feature issues-u06b-3_5), PROBE_RUN=r35
// Facts: .reports/<feature>/u06b/walk[-<run>]-<app>.json (neighbour: neighbour[-<run>]-<app>.json)
const {forEachApp, launch, signIn, signOut, record, shot, idle, sql, drainJobs, serverLog} = require('../../../probe');
const H = require('./lib.js');

const neighbour = process.argv.slice(2).includes('neighbour');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** What the database holds for the walk (Evidence only; the steps read the screens). */
function dbRead(app, since, emails) {
    const list = emails.map((e) => `'${e}'`).join(',');
    const q = (query) => {
        try {
            return sql(app, query).split('\n').filter(Boolean);
        } catch (e) {
            return [`ERR ${String(e.message).slice(0, 200)}`];
        }
    };
    return {
        invitations: q(`select invitation_id, coalesce(email, (select email from users u where u.user_id = i.user_id)), status, inviter_id, updated_at from invitations i where type = 'userRoleAssignment' and (email in (${list}) or user_id in (select user_id from users where email in (${list}))) order by invitation_id`),
        inviterNotifications: q(`select notification_id, type, level, date_created from notifications where user_id = (select user_id from users where username = 'rvaca') and date_created >= '${since.toISOString()}' order by notification_id`),
        jobsQueued: q(`select count(*) from jobs`),
    };
}

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, role: c.role, neighbour};
    const log = serverLog(app);
    const mark = log.mark();
    const since = new Date(Date.now() - 2000);
    const name = neighbour ? 'neighbour' : 'walk';
    const save = () => record(name, facts);
    const {page, close} = await launch(app);
    try {
        if (neighbour) {
            const p = c.neighbour;
            await signIn(page, H.INVITER.username);
            facts.sent = await H.sendInvitation(page, app, {email: p.email, role: c.role});
            record('nb-01-invitation-sent', facts.sent.screen);
            delete facts.sent.screen;
            await H.viewAllUsers(page);
            facts.pending = await H.usersAndRoles(page, app, [p]);
            delete facts.pending.screen;
            save();
            const mail = await H.invitationMail(app, p.email, since);
            facts.mail = {subject: mail.subject, from: mail.from};
            await signOut(page);
            const acc = await H.accept(page, app, mail.accept);
            record('nb-02-accept-dialog', acc.after);
            facts.acceptDialog = acc.dialogText;
            await signIn(page, H.INVITER.username);
            facts.after = await H.usersAndRoles(page, app, [p]);
            record('nb-03-users-after', facts.after.screen);
            delete facts.after.screen;
            facts.serverErrors = log.since(mark);
            save();
            return;
        }

        // 1. rvaca, Users & Roles; the header's Tasks before anything is sent
        await signIn(page, H.INVITER.username);
        await page.goto(app.url(`/index.php/${app.contextPath}/${app.line && /3_[34]/.test(app.line) ? '' : 'en/'}dashboard/editorial`));
        await idle(page);
        facts.tasksBefore = await H.tasks(page);
        record('01-tasks-before', facts.tasksBefore.screen);
        delete facts.tasksBefore.screen;
        save();

        // 2-4. the first invitation; 5. the second
        for (const [key, p] of [['accepts', c.accepts], ['declines', c.declines]]) {
            const sent = await H.sendInvitation(page, app, {email: p.email, role: c.role});
            record(`02-invitation-sent-${key}`, sent.screen);
            if (key === 'accepts') await shot(page, '02-invitation-sent');
            delete sent.screen;
            sent.viewAllUsersLandsOn = await H.viewAllUsers(page);
            facts[`sent-${key}`] = sent;
            save();
        }

        // 6. both pending under Invitations
        facts.pending = await H.usersAndRoles(page, app, [c.accepts, c.declines]);
        record('03-users-pending', facts.pending.screen);
        delete facts.pending.screen;
        save();

        // 7. signed out: the first accepts through the emailed link
        const mails = {
            accepts: await H.invitationMail(app, c.accepts.email, since),
            declines: await H.invitationMail(app, c.declines.email, since),
        };
        facts.invitationMails = Object.fromEntries(Object.entries(mails).map(([k, m]) => [k, {subject: m.subject, from: m.from, accept: !!m.accept, decline: !!m.decline}]));
        await signOut(page);
        const acc = await H.accept(page, app, mails.accepts.accept);
        record('04-accept-review', acc.before);
        record('05-accept-dialog', acc.after);
        facts.acceptDialog = acc.dialogText;
        const decisionsAt = new Date(Date.now() - 1000);

        // 8. the second declines
        const dec = await H.decline(page, mails.declines.decline);
        record('06-decline-page', dec.before);
        record('07-decline-after', dec.after);
        facts.decline = {landed: dec.landed, page: H.flat(dec.before.text.main, 600)};
        save();

        // Mail sent by a queued job: let the queue run (the dataset's job runner also runs it on
        // the next requests), then give the mailbox time
        facts.drain = await drainJobs(app).then(() => 'drained').catch((e) => `drainJobs: ${String(e.message).slice(0, 200)}`);
        await sleep(5000);

        // 9. rvaca again: Tasks, the mailbox, Users & Roles
        await signIn(page, H.INVITER.username);
        await page.goto(app.url(`/index.php/${app.contextPath}/${app.line && /3_[34]/.test(app.line) ? '' : 'en/'}dashboard/editorial`));
        await idle(page);
        facts.tasksAfter = await H.tasks(page);
        record('08-tasks-after', facts.tasksAfter.screen);
        delete facts.tasksAfter.screen;
        facts.after = await H.usersAndRoles(page, app, [c.accepts, c.declines]);
        record('09-users-after', facts.after.screen);
        await shot(page, '09-users-after');
        delete facts.after.screen;
        await sleep(5000);
        facts.inviterInbox = await H.inbox(app, H.INVITER.email, decisionsAt);
        // control: the mail this walk sent did arrive (the two invitation emails, read above)
        facts.inviteeInboxes = {
            accepts: await H.inbox(app, c.accepts.email, since),
            declines: await H.inbox(app, c.declines.email, since),
        };
        facts.db = dbRead(app, since, [c.accepts.email, c.declines.email]);
        facts.serverErrors = log.since(mark);
        save();
    } catch (error) {
        facts.error = String(error.stack || error).slice(0, 1500);
        save();
        throw error;
    } finally {
        await close();
    }
});
