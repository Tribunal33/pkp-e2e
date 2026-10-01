// @ts-check
/**
 * @file playwright/tests/serial/U51-subscriptions.spec.js
 *
 * Subscriptions & open access control — OJS suite, the serial part:
 * scenario 12, the open-access email. Scenarios 1–11 and 13–15 are in
 * ../U51-subscriptions.spec.js, whose header lists what the suite
 * deliberately does not cover.
 * Spec: docs/specs/U51-subscriptions.md
 *
 * Why serial: the open-access email comes from a scheduled task
 * (`APP\tasks\OpenAccessNotification`) that scans every journal, and the
 * mail it queues goes out only when the background jobs run; runJobs()
 * drains the SHARED queue, so both belong in the serial project only
 * (patterns.md parallel lesson 7; PRINCIPLES A9). The task is run by hand
 * the way footnote s0 names it.
 *
 * Seeding: a scratch journal with throwaway accounts (the username twice as
 * password), as footnote s0 says: `publishingMode: 'subscription'`, the
 * subscription contact, three `issues[]` published with `openAccessDate`
 * today and `accessStatus: 'open'`, and scratch articles `published` into
 * them (`accessStatus: 'open'` for "Storm Surges"). The journal's principal
 * contact is named, so the email's sender is the test's own. The visitor is
 * the fixture's own page, which carries no session (patterns.md lesson 8).
 * The control (no email names the other two issues) is read after the
 * email to the same recipient arrived (A8).
 */
const {execFileSync} = require('child_process');
const {test, expect} = require('../../support/fixtures.js');
const {runJobs} = require('../../../../../shared/playwright/support/jobs.js');
const {recordBrowserDialogs} = require('../../../../../shared/playwright/pages/SubmissionFilesPages.js');
const {ArticleLandingPage, GalleyReaderPage} = require('../../../../../shared/playwright/pages/ArticleLandingPages.js');
const {IssuesAdmin, IssueReader, notice} = require('../../../../../shared/playwright/pages/IssuesPages.js');
const {
    SUBSCRIPTIONS_TEXT: TEXT,
    GLYPH,
    PaymentsPage,
    galleyLink,
    expectLocked,
    expectUnlocked,
} = require('../../../../../shared/playwright/pages/SubscriptionsPages.js');

const PDF = [{label: 'PDF', file: 'article.pdf'}];
const UNSUBSCRIBE_LINK = /\/notification\/unsubscribe\?validate=[^&]+&id=\d+$/;

/** Unique per-run tag: single alphanumeric token, feature + scenario + worker. */
function makeTag(scenario, testInfo) {
    return `u51${scenario}ojw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account's address (users.md: `<username>@mail.test`). */
const mailOf = (username) => `${username}@mail.test`;

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: mailOf(username), roles};
}

/** A scratch journal's name as the scenario API gives it. */
const journalName = (tag) => `Scratch context ${tag}`;

/** Today as the pages write it (UTC, the config's zone). */
const today = () => new Date().toISOString().slice(0, 10);
// The days the open-access task also runs a simulated 31st (or 29th, 30th)
// of the month before, which lands on today: the 1st of the month after a
// 30-day month, and 1 March. The email then goes out twice (A29).
const sentTwiceToday = () => {
    const d = new Date();
    return d.getUTCDate() === 1 && [3, 5, 7, 10, 12].includes(d.getUTCMonth() + 1);
};

/**
 * Run one of the site's scheduled tasks by hand in the app's root, as
 * footnote s0 names it (the fleets run no task on their own).
 */
function runScheduledTask(name) {
    return execFileSync('php', ['lib/pkp/tools/scheduler.php', 'test', `--name=${name}`], {
        cwd: process.env.PKP_APP_ROOT,
        env: process.env,
        encoding: 'utf8',
        timeout: 120_000,
    });
}

test.describe('subscriptions (serial)', () => {
    test('S12: open access by date, by switch and by article; the open-access email', async ({page, asUser, ojsApi, pkpMail}, testInfo) => {
        test.setTimeout(360_000);
        const tag = makeTag('s12', testInfo);
        const manager = `${tag}mg`;
        const author = `${tag}au`;
        const readerUser = `${tag}rd`;
        const office = mailOf(`${tag}pc`);
        const journal = journalName(tag);
        const byDate = {volume: 1, number: 1, year: 2026};
        const bySwitch = {volume: 1, number: 2, year: 2026};
        const byArticle = {volume: 1, number: 3, year: 2026};
        const context = await ojsApi.createContext({
            tag,
            context: {contactName: 'Journal Office', contactEmail: office},
            publishingMode: 'subscription',
            subscriptionName: 'Subscriptions Desk',
            subscriptionEmail: 'desk@mail.test',
            subscriptionMailingAddress: '1 Harbour Road',
            users: [
                user(manager, 'Mona', 'Manager', ['manager']),
                user(author, 'Ada', 'Author', ['author']),
                user(readerUser, 'Rhea', 'Reader', ['reader']),
            ],
            issues: [
                {...byDate, published: true, openAccessDate: today()},
                {...bySwitch, published: true, accessStatus: 'open'},
                {...byArticle, published: true},
            ],
        });
        const issueId = context.issues.find((i) => i.number == 1).id;
        const seed = (key, title, key2, extra = {}) =>
            ojsApi.createSubmission({tag: `${tag}${key}`, context: tag, submitter: author, title, published: true, issue: key2, galleys: PDF, ...extra});
        await seed('a', 'Tidal Patterns', byDate);
        await seed('b', 'Coastal Winds', bySwitch);
        await seed('c', 'Storm Surges', byArticle, {accessStatus: 'open'});
        await seed('d', 'Harbour Walls', byArticle);
        const reader = new IssueReader(page, tag);
        const landing = new ArticleLandingPage(page, tag);
        const pdf = () => galleyLink(landing.sideColumn(), 'PDF');

        /** Open an article from "Archives" through its issue. */
        const openArticle = async (issueName, title) => {
            await reader.gotoHome();
            await reader.pressHeader('Archives');
            await reader.summary(issueName).locator('a.title').click();
            await expect(reader.heading()).toHaveText(issueName);
            await reader.articleLink(title).click();
            await expect(landing.title()).toHaveText(title);
        };
        /** Press "PDF": the PDF reader opens. */
        const opens = async () => {
            await pdf().click();
            await expect(page).toHaveURL(/\/article\/view\/\d+\/\d+$/);
            await new GalleyReaderPage(page).expectLoaded();
        };

        // By date: no padlock, the PDF opens (Rule 9).
        await openArticle('Vol. 1 No. 1 (2026)', 'Tidal Patterns');
        await expectUnlocked(pdf(), GLYPH.pdf);
        await opens();

        // The issue's "Access" tab still reads "Subscription" with today's
        // date (Rule 9).
        const mg = await (await asUser(manager)).newPage();
        recordBrowserDialogs(mg);
        const issues = new IssuesAdmin(mg, tag);
        await issues.goto('Back Issues');
        const win = await issues.openManagement('Back Issues', 'Vol. 1 No. 1 (2026)');
        const form = await win.openAccess();
        await expect(form.locator('select#accessStatus option:checked')).toHaveText('Subscription');
        await expect(form.locator('input[name="openAccessDate-removed"]')).toHaveValue(today());
        await win.close();

        // By switch: "Coastal Winds" opens (Rule 7).
        await openArticle('Vol. 1 No. 2 (2026)', 'Coastal Winds');
        await opens();

        // By article: "Storm Surges" opens, "Harbour Walls" is locked (Rule 7).
        await openArticle('Vol. 1 No. 3 (2026)', 'Storm Surges');
        await opens();
        await openArticle('Vol. 1 No. 3 (2026)', 'Harbour Walls');
        await expectLocked(pdf());

        // The box: ticked and saved (Settings bullet 11).
        const payments = new PaymentsPage(mg, tag);
        await payments.gotoTab('Subscription Policies');
        const policies = payments.policies();
        await expect(policies.openAccessBox()).not.toBeChecked();
        await policies.openAccessBox().check();
        const saved = await policies.save();
        expect(saved.ok()).toBe(true);
        await expect(notice(mg, TEXT.saved).first()).toBeVisible();

        // The open-access email, to the Reader and to the Journal Manager:
        // from the principal contact, the subject, the issue's name as a
        // link to its page, the unsubscribe footer (Side effects).
        runScheduledTask('APP\\tasks\\OpenAccessNotification');
        runJobs();
        const subject = `Free to read: Vol. 1 No. 1 (2026) of ${journal} is now open access`;
        for (const to of [mailOf(readerUser), mailOf(manager)]) {
            const mail = await pkpMail.find({to, subject, timeoutMs: 60_000});
            expect(mail.Subject).toBe(subject);
            expect(mail.From).toMatchObject({Name: 'Journal Office', Address: office});
            const full = await pkpMail.fullMessage(mail.ID);
            const issueLink = pkpMail.extractLink(full.HTML, /^\s*Vol\. 1 No\. 1 \(2026\)\s*$/);
            expect(issueLink).toMatch(new RegExp(`/index\\.php/${tag}/issue/view/${issueId}$`));
            expect(pkpMail.extractLink(full.HTML, /^unsubscribe$/i)).toMatch(UNSUBSCRIBE_LINK);

            // Control: no email names the issue switched to "Open access" or
            // the one with an "Open Access" article (Side effects).
            expect(await pkpMail.count({to, contains: 'Vol. 1 No. 2 (2026)'})).toBe(0);
            expect(await pkpMail.count({to, contains: 'Vol. 1 No. 3 (2026)'})).toBe(0);
            if (!sentTwiceToday()) expect(await pkpMail.count({to, subject: 'Free to read'})).toBe(1);
        }
    });
});
