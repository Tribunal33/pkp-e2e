// U27 A12: the reviewer's "Your review assignment has been changed" email links to an "Unsubscribe"
// page that does not list it, and unsubscribing there does not stop it
// (docs/issues/U27-A12-review-change-email-unsubscribe-ignored.md). On PKP's default dataset:
//
//   walk       (default) the report's Steps: dbarnes changes a reviewer's "Review Due Date"; the
//              reviewer's profile "Notifications" tab; the email's "unsubscribe" link, "Unsubscribe"
//              with every box ticked; dbarnes changes the date again; the reviewer's mailbox
//   neighbour  what the fix must leave alone: the reviewer saves the "Notifications" tab untouched,
//              dbarnes changes the date, the email still arrives
//
//   PROBE_FEATURE=issues-k4 PROBE_AGENT=k4 node bin/probe.js ojs,omp \
//     shared/playwright/checks/issues/review-change-email-unsubscribe-omits-type/walk.js [walk|neighbour]
const {forEachApp, launch, signIn, signOut, record, screen, sql} = require('../../../probe');
const L = require('./lib.js');

const mode = process.argv[2] || 'walk';
const day = (n) => new Date(Date.now() + n * 24 * 3600 * 1000);
const TYPE = 0x1000029; // Notification::NOTIFICATION_TYPE_REVIEW_ASSIGNMENT_UPDATED, for the record only

forEachApp(async (app) => {
    const c = L.CASES[app.name];
    if (!c) return;
    const who = c.edited;
    const to = L.mailOf(who.username);
    const facts = {app: app.name, line: app.line || 'main', mode, submission: c.id, reviewer: who};
    const step = async (name, fn) => {
        try {
            facts[name] = await fn();
        } catch (e) {
            facts[name] = {failed: String(e.stack || e).split('\n').slice(0, 4).join(' | ')};
        }
        console.log(`[${app.name}]`, name, JSON.stringify(facts[name]).slice(0, 900));
    };
    const blocked = () => L.blockedEmails(app, sql, who.username);
    const {page, close} = await launch(app);
    page.on('dialog', (d) => d.accept().catch(() => {}));
    try {
        if (mode === 'walk') {
            const since1 = new Date();
            await signIn(page, 'dbarnes');
            await step('s2-edit', () => L.editReviewDueDate(page, app, c.id, who.name, day(40), 'a12-s2-edit'));
            await step('s3-mail', async () => {
                const m = await L.waitMails(app, to, since1, L.CHANGED);
                return {count: m.hit.length, all: m.all, first: m.hit[0] || null};
            });
            const link = facts['s3-mail'] && facts['s3-mail'].first && facts['s3-mail'].first.unsubscribe;
            await signOut(page);
            await signIn(page, who.username);
            await step('s4-tab', () => L.notificationsTab(page, app, 'a12-s4-tab'));
            facts.s4Offered = Array.isArray(facts['s4-tab'].sentences) && facts['s4-tab'].sentences.includes('Review assignment updated.');
            facts.blockedBefore = blocked();
            await step('s5-page', () => (link ? L.openUnsubscribe(page, link, 'a12-s5-page') : {skipped: 'no unsubscribe link in the email'}));
            facts.s5Offered = (facts['s5-page'].boxes || []).some((b) => /Review assignment updated/.test(b.label));
            await step('s5-unsubscribe', () => (link ? L.pressUnsubscribe(page, 'a12-s5-result') : {skipped: true}));
            facts.blockedAfter = blocked();
            facts.blockedHoldsType = facts.blockedAfter.includes(String(TYPE));
            await signOut(page);
            const since2 = new Date();
            await signIn(page, 'dbarnes');
            await step('s6-edit', () => L.editReviewDueDate(page, app, c.id, who.name, day(50), 'a12-s6-edit'));
            await step('s7-mail', async () => {
                const m = await L.waitMails(app, to, since2, L.CHANGED);
                return {count: m.hit.length, all: m.all, first: m.hit[0] ? {subject: m.hit[0].subject, footer: m.hit[0].footer} : null};
            });
            await signOut(page);
        } else {
            await signIn(page, who.username);
            await step('n1-tab', () => L.notificationsTab(page, app, 'a12-n1-tab'));
            await step('n1-save', async () => {
                const form = page.locator('form#notificationSettingsForm');
                const saved = page.waitForResponse((r) => /saveNotificationSettings|save-notification-settings/i.test(r.url()) && r.request().method() === 'POST', {timeout: 20_000}).catch(() => null);
                await form.getByRole('button', {name: 'Save', exact: true}).click();
                const r = await saved;
                await L.sleep(1000);
                return {http: r ? r.status() : null, notices: (await screen(page)).notices};
            });
            facts.blockedAfterSave = blocked();
            await signOut(page);
            const since = new Date();
            await signIn(page, 'dbarnes');
            await step('n2-edit', () => L.editReviewDueDate(page, app, c.id, who.name, day(45), 'a12-n2-edit'));
            await step('n3-mail', async () => {
                const m = await L.waitMails(app, to, since, L.CHANGED);
                return {count: m.hit.length, all: m.all, first: m.hit[0] ? {subject: m.hit[0].subject, footer: m.hit[0].footer} : null};
            });
            await signOut(page);
        }
    } finally {
        record(`a12-facts-${mode}`, facts);
        await close();
    }
});
