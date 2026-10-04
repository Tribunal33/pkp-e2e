// U05 A2: an email's "Unsubscribe" page switches back on the emails the person had switched off on
// Profile › "Notifications" (docs/issues/U05-A2-unsubscribe-page-reenables-emails.md). On PKP's
// default test dataset, per app an author whose profile already holds emails switched off:
//
//   walk       (default) the report's Steps: the author's tab (the dataset's emails off); dbarnes
//              adds a discussion with the author; the author's "unsubscribe" link; every box but
//              "Discussion added." unticked, "Unsubscribe"; the author's tab again
//   neighbour  what the fix must leave alone: the same link, "Unsubscribe" with every box ticked as
//              the page opens, then the tab: every email switched off
//
//   PROBE_FEATURE=issues-u05d PROBE_AGENT=u05d node bin/probe.js all \
//     shared/playwright/checks/issues/unsubscribe-page-reenables-emails/walk.js [walk|neighbour]
const {forEachApp, launch, signIn, signOut, record, sql} = require('../../../probe');
const L = require('./lib.js');

const mode = process.argv[2] || 'walk';

forEachApp(async (app) => {
    const c = L.CASES[app.name];
    if (!c) return;
    const to = L.U.mailOf(c.author);
    const facts = {app: app.name, line: app.line || 'main', mode, author: c.author, submission: c.where.id};
    const step = async (name, fn) => {
        try {
            facts[name] = await fn();
        } catch (e) {
            facts[name] = {failed: String(e.stack || e).split('\n').slice(0, 4).join(' | ')};
        }
        console.log(`[${app.name}]`, name, JSON.stringify(facts[name]).slice(0, 900));
    };
    const blocked = () => L.U.blockedEmails(app, sql, c.author);
    const {page, close} = await launch(app);
    page.on('dialog', (d) => d.accept().catch(() => {}));
    try {
        // 1. The author's tab as the dataset holds it.
        await signIn(page, c.author);
        await step('s1-tab', () => L.emailBoxes(page, app, `a2-${mode}-s1-tab`));
        facts.s1Off = Object.entries(facts['s1-tab'] || {}).filter(([, v]) => v.checked).map(([k]) => k);
        facts.blockedBefore = blocked();
        await signOut(page);

        // 2. dbarnes opens a discussion with the author.
        const since = new Date();
        await signIn(page, 'dbarnes');
        await step('s2-discussion', () => L.D.addDiscussion(page, app, c.where, {
            name: `u05d unsubscribe ${mode}`, participant: c.author, participantName: c.authorName,
            message: 'u05d: a discussion with the author, for its unsubscribe link.', label: `a2-${mode}-s2`,
        }));
        await signOut(page);

        // 3. The author's email and its "unsubscribe" link, opened signed out as from a mail program.
        await step('s3-mail', async () => {
            const m = await L.unsubscribeMail(app, to, since);
            return {subject: m.mail && m.mail.subject, footer: m.mail && m.mail.footer, link: m.mail && m.mail.unsubscribe, subjects: m.subjects};
        });
        const link = facts['s3-mail'] && facts['s3-mail'].link;
        if (!link) throw new Error('no email with an unsubscribe link reached the author');

        // 4. The page: every box ticked?
        await step('s4-page', () => L.U.openUnsubscribe(page, link, `a2-${mode}-s4-page`));
        const boxes = (facts['s4-page'] && facts['s4-page'].boxes) || [];
        facts.s4AllTicked = boxes.length > 0 && boxes.every((b) => b.checked);
        facts.s4OffShownTicked = c.off.map((n) => ({name: n, checked: (boxes.find((b) => b.name === n) || {}).checked}));

        // 5. walk: keep only "Discussion added." ticked; neighbour: every box as it opened. "Unsubscribe".
        if (mode === 'walk') await step('s5-untick', () => L.untickAllBut(page, [L.KEEP], `a2-${mode}-s5-boxes`));
        await step('s5-result', () => L.U.pressUnsubscribe(page, `a2-${mode}-s5-result`));
        facts.blockedAfter = blocked();

        // 6. The author's tab again.
        await signIn(page, c.author);
        await step('s6-tab', () => L.emailBoxes(page, app, `a2-${mode}-s6-tab`));
        const tab = facts['s6-tab'] || {};
        facts.s6Off = Object.entries(tab).filter(([, v]) => v.checked).map(([k]) => k);
        facts.s6DiscussionOff = !!(tab[L.KEEP] && tab[L.KEEP].checked);
        facts.s6EarlierOffKept = c.off.map((n) => ({name: n, row: tab[n] && tab[n].row, checked: tab[n] && tab[n].checked}));
        facts.s6EverythingOff = Object.values(tab).length > 0 && Object.values(tab).every((v) => v.checked);
        await signOut(page);
    } finally {
        record(`a2-facts-${mode}`, facts);
        await close();
    }
});
