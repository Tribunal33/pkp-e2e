// Kept walk of issue report docs/issues/U53-A14-masthead-change-error-no-email.md (U53 A14, U06 OMP1).
// As `rvaca` on PKP's default test dataset: Settings > Users & Roles, David Buskins' "Edit", the
// held role's masthead select changed and confirmed, the page reloaded; then "Invite to a role",
// minoue@mailinator.com searched, Minoti Inoue's held role's select changed and confirmed. Each
// time: the confirmation, the masthead request's answer, an "Error" dialog, the value kept, the
// user's mailbox. OJS is the control.
//
// `neighbour` as argument walks only the neighbour check instead: on David Buskins' "Edit", the
// select changed and "Cancel" pressed (no request, no email, the value back).
// `emails` as argument walks only the Manage Emails path (spec U56 OMP1), OMP only: Settings >
// Workflow > Emails, "User Role Masthead Visibility Update Notification", "Edit": the template's
// GET and its answer, whether "Edit Template" opens with the subject, a spinner left up.
//
// Reset first:  npm run fleet-prep -- --feature issues-r6 --dataset 1 --reset
// Run (main):   PROBE_FEATURE=issues-r6 PROBE_AGENT=r6 node bin/probe.js all shared/playwright/checks/issues/masthead-change-error-no-email/walk.js [neighbour]
// 3.5:          prefix both with PKP_E2E_LINE=stable-3_5_0 (feature issues-r6-3_5), PROBE_RUN=r35
const {forEachApp, launch, signIn, screen, shot, record, idle, serverLog} = require('../../../probe');
const H = require('./lib.js');

const neighbour = process.argv.slice(2).includes('neighbour');
const emailsMode = process.argv.slice(2).includes('emails');

forEachApp(async (app) => {
    const role = H.ROLE[app.name];
    const facts = {
        app: app.name,
        line: app.line || 'main',
        dataset: app.dataset,
        role,
    };
    const log = serverLog(app);
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        if (emailsMode) {
            const from = log.mark();
            facts.emails = await H.openMastheadEmail(page, app);
            facts.emails.serverLog = log.since(from);
            record('01-emails-edit', await screen(page));
            await shot(page, '01-emails-edit');
            record('emails', facts);
            return;
        }
        if (neighbour) {
            await H.openEdit(page, app, H.EDITED.email);
            const since = new Date();
            facts.cancel = await H.changeMasthead(page, role, 'Cancel');
            facts.cancel.mail = await H.mailSince(app, H.EDITED.email, since);
            record('01-nb-cancel', await screen(page));
            record('neighbour', facts);
            return;
        }

        // Users list > David Buskins > "Edit": the held role's select changed and confirmed
        await H.openEdit(page, app, H.EDITED.email);
        record('01-edit-page', await screen(page));
        let since = new Date();
        let from = log.mark();
        facts.edit = await H.changeMasthead(page, role, 'Confirm');
        facts.edit.serverLog = log.since(from);
        await shot(page, '02-edit-after-confirm');
        record('02-edit-after-confirm', await screen(page));
        await page.reload();
        await page.getByRole('heading', {name: /STEP 1 - Enter details/}).waitFor({timeout: 30_000});
        await idle(page);
        facts.edit.afterReload = await H.mastheadValue(page, role);
        record('03-edit-after-reload', await screen(page));
        facts.edit.mail = await H.mailSince(app, H.EDITED.email, since);

        // "Invite to a role" > minoue@mailinator.com: the held role's select changed and confirmed
        await H.openSearch(page, app, H.SEARCHED.email);
        record('04-search-details', await screen(page));
        since = new Date();
        from = log.mark();
        facts.search = await H.changeMasthead(page, role, 'Confirm');
        facts.search.serverLog = log.since(from);
        await shot(page, '05-search-after-confirm');
        record('05-search-after-confirm', await screen(page));
        facts.search.mail = await H.mailSince(app, H.SEARCHED.email, since);
        // the change as the users list's "Edit" shows it afterwards
        await H.openEdit(page, app, H.SEARCHED.email);
        facts.search.afterOnEdit = await H.mastheadValue(page, role);
        record('walk', facts);
    } catch (error) {
        facts.error = String(error.stack || error).slice(0, 1500);
        record(emailsMode ? 'emails' : neighbour ? 'neighbour' : 'walk', facts);
        throw error;
    } finally {
        await close();
    }
});
