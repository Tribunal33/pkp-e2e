// @ts-check
/**
 * @file playwright/tests/U67-archiving-preservation.spec.js
 *
 * Archiving & preservation — OJS suite, one test per canonical scenario:
 * S1–S3, the journal's own ({OJS}, the spec's title badge), and S4, the
 * {OMP OPS} absence, whose journal-side control this suite runs (a CI job
 * installs one app, so the OMP and OPS suites cannot read a journal), as
 * the U69 OJS suite does for that spec's absence scenario.
 * Spec: docs/specs/U67-archiving-preservation.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register;
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap; the
 * spec's Coverage section is the record of everything else left out):
 * - A1 🐞: no "Copyright Notice" or "License Terms" is saved; S1 reads
 *   only that a new journal has no "Copyright" row.
 * - A2 🐞: the "Rights" row's text is never asserted, in English (S1) or
 *   French (S2); S1 reads that the table holds no row beyond "Rights"
 *   after its four others.
 * - A3 🐞: no PN plugin exists on the test installs.
 * - A4 ❓: S3 opens "Closed Shore"'s two addresses signed out and follows
 *   its site-list link, and records where each landed as a test
 *   annotation, never as an assertion.
 *
 * Seeding: scenario endpoints only, as footnote s says; publicknowledge and
 * the seeded roster are only read. Every scenario runs on its own scratch
 * journals, their paths the test's unique tag (plus a letter), with
 * throwaway accounts (the username twice as password). Issues come from
 * `issues[]` with `published: true` (published today, the year the entry
 * names), the saved boxes from `enableLockss` / `enableClockss` (S2–S4; S1
 * saves them on screen, which is its behaviour under test), the Masthead
 * values from `publisherInstitution` / `onlineIssn` / `printIssn`, French
 * from `context.supportedLocales`, the closed journals from
 * `restrictSiteAccess` and `context.enabled: false`.
 *
 * Actors: every signed-in actor gets its own `asUser` context (no default
 * user in this file, patterns.md "Fixture selection"); the visitor is a
 * browser context with an empty storage state (parallel lesson 8), and the
 * French read a second one, since a `/fr_CA/` visit switches the session's
 * language. The site's lists are the whole install's, other runs' journals
 * included, so a journal's line is found by its address and read for its
 * name. The "no email" read is bounded by a password reset the visitor
 * asks for a spare account of the journal (PRINCIPLES A8), and the Tasks
 * count is read on a freshly loaded page before and after.
 *
 * Every absence is read settled and paired with a positive control taken
 * the same way (M4, M6): a plain-text year link beside the link read by
 * the same role query, a missing row beside the rows present, the list
 * that lacks a journal beside the list that holds it, the PN side tab's
 * nothing-to-press beside the LOCKSS side tab's boxes and "Save". Waits
 * are web-first (A5). Everything here runs in the parallel `ojs` project:
 * nothing changes a shared setting (the site's lists are only read for the
 * test's own journals).
 */
const {test: base, expect} = require('../support/fixtures.js');
const {
    ARCHIVING_TEXT: A,
    flat,
    ArchivingSettings,
    ManifestPage,
    SiteManifestList,
    expectJournalHome,
    expectLoginLanding,
} = require('../../../../shared/playwright/pages/ArchivingPages.js');
const {TasksPanel} = require('../../../../shared/playwright/pages/NotificationsPages.js');
const {LostPasswordPage} = require('../pages/LoginSessionsPages.js');

const CONTACT = 'tide.contact@example.org';
const RESET_SUBJECT = 'Password Reset Confirmation';
/** The footer's one link (the OJS logo), by its image's text, in English and in French. */
const FOOTER_EN = 'More information about the publishing system, Platform and Workflow by OJS/PKP.';
const FOOTER_FR = 'À propos de ce système de publication, plateforme et processus par OJS/PKP.';

/** Signed-out pages: browser contexts with no session at all (parallel lesson 8), closed at teardown. */
const test = base.extend({
    newVisitor: async ({browser, baseURL}, use) => {
        const contexts = [];
        await use(async () => {
            const context = await browser.newContext({
                baseURL,
                storageState: {cookies: [], origins: []},
                reducedMotion: 'reduce',
            });
            contexts.push(context);
            return context.newPage();
        });
        await Promise.all(contexts.map((c) => c.close().catch(() => {})));
    },
});

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u67${scenario}ojw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account for `createContext`'s `users[]`. */
function user(username, givenName, familyName, roles) {
    return {username, givenName, familyName, email: `${username}@mail.test`, roles};
}

/** A signed-in actor's page (its own `asUser` context). */
async function actorPage(asUser, username) {
    return (await asUser(username)).newPage();
}

/** The "Journal URL" row's link: its text and address, both the journal's home page address. */
async function expectJournalUrl(manifest, contextPath, {locale = ''} = {}) {
    const link = manifest.rowValue('Journal URL').getByRole('link');
    await expect(link).toHaveCount(1);
    const end = new RegExp(`/index\\.php/${contextPath}${locale ? `/${locale}` : ''}$`);
    await expect(link).toHaveText(end);
    await expect(link).toHaveAttribute('href', end);
}

/** Record where a signed-out address landed, without asserting it (A4 ❓). */
function recordLanding(page, what) {
    test.info().annotations.push({type: 'A4 reading (not asserted)', description: `${what} → ${page.url()}`});
}

test.describe('Archiving & preservation', () => {
    test('S1: "LOCKSS" and "CLOCKSS" turned on, then "LOCKSS" turned off', async ({asUser, newVisitor, ojsApi, pkpMail}, testInfo) => {
        test.slow();
        const tag = makeTag('s1', testInfo);
        const manager = `${tag}mg`;
        const spare = `${tag}sp`;
        await ojsApi.createContext({
            tag,
            context: {name: 'Tide Records', contactName: 'Tide Contact', contactEmail: CONTACT},
            users: [user(manager, 'Mona', 'Manager', ['manager']), user(spare, 'Sam', 'Spare', ['reader'])],
            issues: [{volume: 1, number: 1, year: 2020, published: true}],
        });
        const mp = await actorPage(asUser, manager);
        const visitor = await newVisitor();
        const settings = new ArchivingSettings(mp, tag);
        const tasks = new TasksPanel(mp);
        const lockss = new ManifestPage(visitor, tag, 'lockss');
        const clockss = new ManifestPage(visitor, tag, 'clockss');
        const siteLockss = new SiteManifestList(visitor, 'lockss');
        const siteClockss = new SiteManifestList(visitor, 'clockss');

        // The "Archiving" tab: the Tasks count noted; Settings › Distribution,
        // headed "Distribution Settings", "Archiving" opens on the PN side tab,
        // which reads its heading and text and offers nothing to press, not
        // even "Save" (Rules 1, 2; Fields, the "Archiving" tab).
        await settings.open();
        await expect(tasks.bell()).toBeVisible();
        const tasksAtStart = await tasks.count();
        await expect(settings.heading()).toBeVisible();
        expect(await settings.sideTabNames()).toEqual([A.pnTab, A.lockssTab]);
        await expect(settings.sideTab(A.pnTab)).toHaveAttribute('aria-selected', 'true');
        await expect(settings.pnHeading()).toHaveText(A.pnTab);
        await expect(settings.pnDescription()).toHaveText(A.pnText);
        expect(flat(await settings.pnPanel().innerText())).toBe(`${A.pnTab} ${A.pnText}`);
        await expect(settings.pressables(settings.pnPanel())).toHaveCount(0);
        await expect(settings.pnPanel().getByRole('button', {name: A.save})).toHaveCount(0);

        // "LOCKSS and CLOCKSS": under "LOCKSS" the unticked LOCKSS box, under
        // "CLOCKSS" the unticked CLOCKSS box, "Save" below them; the control
        // for the PN tab's nothing-to-press, read by the same role queries.
        await settings.openLockssSideTab();
        await expect(settings.legends()).toHaveText([/^\s*LOCKSS\s*$/, /^\s*CLOCKSS\s*$/]);
        await expect(settings.box('lockss')).not.toBeChecked();
        await expect(settings.box('clockss')).not.toBeChecked();
        await expect(settings.saveButton()).toBeVisible();
        await expect(settings.lockssPanel().getByRole('checkbox')).toHaveCount(2);
        await expect(settings.lockssPanel().getByRole('button', {name: A.save})).toHaveCount(1);
        const saveBox = await settings.saveButton().boundingBox();
        const clockssBox = await settings.box('clockss').boundingBox();
        expect(saveBox && clockssBox && saveBox.y > clockssBox.y, '"Save" sits below the boxes').toBe(true);

        // The addresses while unticked: the journal's home page, with no
        // message, for the signed-out visitor (Rule 5; Settings bullets 1, 2).
        await lockss.goto();
        await expectJournalHome(visitor, tag);
        await clockss.goto();
        await expectJournalHome(visitor, tag);

        // "Publisher Manifest" before the save: a new browser tab on the home
        // page, the Settings page left as it was; ticked and not saved, the
        // same (Rules 3, 4, 5).
        const settingsAddress = mp.url();
        let popup = await settings.pressManifestLink('lockss');
        await expectJournalHome(popup, tag);
        await popup.close();
        expect(mp.url()).toBe(settingsAddress);
        await expect(settings.lockssPanel()).toBeVisible();
        await expect(settings.box('lockss')).not.toBeChecked();
        await settings.box('lockss').check();
        popup = await settings.pressManifestLink('lockss');
        await expectJournalHome(popup, tag);
        await popup.close();
        expect(mp.url()).toBe(settingsAddress);
        await expect(settings.box('lockss')).toBeChecked();

        // "LOCKSS" saved: "Saved" beside the button; "Publisher Manifest" now
        // opens the journal's LOCKSS page in the new tab (Rules 3, 4).
        expect(await settings.save()).toBe(200);
        popup = await settings.pressManifestLink('lockss');
        const popupPage = new ManifestPage(popup, tag, 'lockss');
        await expect(popup).toHaveURL(new RegExp(`/index\\.php/${tag}/gateway/lockss$`));
        await expect(popupPage.root()).toBeVisible();
        await popupPage.expectYear(2020);
        await popup.close();
        expect(mp.url()).toBe(settingsAddress);

        // The LOCKSS page, signed out: the tab title, inside the journal's
        // header and footer, no title of its own; the year links first, both
        // plain text; "Archive of Published Issues: 2020" over the one issue,
        // a link to its page (Rules 6–9; Fields, the LOCKSS page).
        const answer = await lockss.goto();
        expect(answer && answer.status()).toBe(200);
        await expect(lockss.root()).toBeVisible();
        await expect(visitor).toHaveTitle(/^LOCKSS Publisher Manifest\W+Tide Records$/);
        await expect(lockss.banner().getByRole('link', {name: 'Tide Records', exact: true})).toBeVisible();
        await expect(lockss.footer()).toBeAttached();
        await expect(lockss.main().locator('.page.lockss')).toHaveCount(1);
        await expect(lockss.main().getByRole('heading', {level: 1})).toHaveCount(0);
        await expect(lockss.main().getByRole('heading', {level: 3})).not.toHaveCount(0);
        await expect(lockss.main().getByRole('heading').first()).toHaveText(`${A.archiveHeading}: 2020`);
        await expect(lockss.firstPart()).toHaveText(A.yearLinks);
        await expect(lockss.yearLinks()).toHaveText(A.yearLinks);
        await expect(lockss.yearPlain('previous')).toHaveCount(1);
        await expect(lockss.yearPlain('next')).toHaveCount(1);
        await expect(lockss.yearLinks().getByRole('link')).toHaveCount(0);
        await lockss.expectYear(2020);
        await expect(lockss.issueItems()).toHaveCount(1);
        await expect(lockss.issueLinks()).toHaveText(['Vol. 1 No. 1 (2020)']);
        await expect(lockss.issueLinks().first()).toHaveAttribute('href', new RegExp(`/index\\.php/${tag}/issue/view/\\d+$`));

        // "Front Matter" and "Metadata": the line and three links; the table's
        // rows "Journal URL", "Title", "Language(s)", "Publisher Email", in
        // that order, then nothing but "Rights" (its text is A2's, not read);
        // no "Publisher", "Description", "ISSN" or "Copyright" row (Rule 10;
        // Fields, the page's table; Settings bullets 5–7).
        await expect(lockss.sectionHeading(A.frontMatter)).toHaveCount(1);
        await expect(lockss.sectionIntro(A.frontMatter)).toHaveText(A.frontMatterIntro);
        await expect(lockss.frontMatterLinks()).toHaveText(A.frontMatterLinks);
        await expect(lockss.sectionHeading(A.metadata)).toHaveCount(1);
        await expect(lockss.sectionIntro(A.metadata)).toHaveText(A.metadataIntro);
        const labels = await lockss.rowLabels();
        expect(labels.slice(0, 4)).toEqual(['Journal URL', 'Title', 'Language(s)', 'Publisher Email']);
        expect(labels.slice(4).filter((l) => l !== 'Rights')).toEqual([]);
        for (const absent of ['Publisher', 'Description', 'ISSN', 'Copyright']) {
            await expect(lockss.row(absent), `no "${absent}" row`).toHaveCount(0);
        }
        await expect(lockss.row('Title')).toHaveCount(1);
        await expectJournalUrl(lockss, tag);
        await expect(lockss.rowValue('Title')).toHaveText('Tide Records');
        expect(await lockss.rowLines('Language(s)')).toEqual(['English (en)']);
        const mailLink = lockss.rowValue('Publisher Email').getByRole('link');
        await expect(mailLink).toHaveText(CONTACT);
        expect(decodeURIComponent((await mailLink.getAttribute('href')) || '')).toBe(`mailto:${CONTACT}`);
        const lockssRows = await lockss.rows();

        // The closing lines: the LOCKSS logo linking to lockss.org and its
        // line, then the PKP logo linking to pkp.sfu.ca and its line, below
        // the table (Fields, the page's table).
        await expect(lockss.lockssLogo()).toHaveAttribute('href', A.lockssHref);
        await expect(lockss.closingLine(A.closing.lockss)).toHaveCount(1);
        await expect(lockss.pkpLogo()).toHaveAttribute('href', A.pkpHref);
        await expect(lockss.closingLine(A.pkpLine)).toHaveCount(1);
        const lockssText = await lockss.text();
        const at = (s) => lockssText.indexOf(s);
        expect(at(A.metadataIntro)).toBeGreaterThan(at(A.frontMatterIntro));
        expect(at(A.closing.lockss)).toBeGreaterThan(at(A.metadataIntro));
        expect(at(A.pkpLine)).toBeGreaterThan(at(A.closing.lockss));

        // The issue link opens the issue's page; "Submission Guidelines" opens
        // the journal's "Submissions" page (Rule 9; Fields, "Front Matter").
        await lockss.issueLinks().first().click();
        await expect(visitor).toHaveURL(new RegExp(`/index\\.php/${tag}/issue/view/\\d+$`));
        await expect(visitor.getByRole('heading', {level: 1})).toHaveText(/^\s*Vol\. 1 No\. 1 \(2020\)\s*$/);
        await lockss.goto();
        await lockss.frontMatterLinks().filter({hasText: 'Submission Guidelines'}).click();
        await expect(visitor).toHaveURL(new RegExp(`/index\\.php/${tag}/about/submissions$`));
        await expect(visitor.getByRole('heading', {level: 1})).toHaveText(/^\s*Submissions\s*$/);

        // The site's lists: the LOCKSS list holds "Tide Records", which opens
        // the journal's LOCKSS page; the CLOCKSS list does not hold it, read
        // by the same locator (Rule 13; Settings bullet 1).
        await siteLockss.goto();
        await expect(siteLockss.journalLink(tag)).toHaveText(['Tide Records']);
        await siteClockss.goto();
        await expect(siteClockss.links()).not.toHaveCount(0);
        await expect(siteClockss.journalLink(tag)).toHaveCount(0);
        await siteLockss.goto();
        await siteLockss.journalLink(tag).click();
        await expect(visitor).toHaveURL(new RegExp(`/index\\.php/${tag}/gateway/lockss$`));
        await lockss.expectYear(2020);

        // "CLOCKSS" still unticked: its address still opens the home page (Rule 5).
        await clockss.goto();
        await expectJournalHome(visitor, tag);

        // "CLOCKSS" saved too (Rule 3).
        await expect(settings.box('clockss')).not.toBeChecked();
        expect(await settings.setAndSave('clockss', true)).toBe(200);

        // The CLOCKSS page: its tab title; the year links, heading, issue,
        // "Front Matter" and table as on the LOCKSS page; no LOCKSS logo (the
        // PKP logo read the same way); its own closing line, then the PKP
        // logo and line. The CLOCKSS list now holds "Tide Records" (Rules 12,
        // 13; Settings bullet 2).
        await clockss.goto();
        await expect(clockss.root()).toBeVisible();
        await expect(visitor).toHaveTitle(/^CLOCKSS Publisher Manifest\W+Tide Records$/);
        await expect(clockss.yearLinks()).toHaveText(A.yearLinks);
        await expect(clockss.yearLinks().getByRole('link')).toHaveCount(0);
        await clockss.expectYear(2020);
        await expect(clockss.issueLinks()).toHaveText(['Vol. 1 No. 1 (2020)']);
        await expect(clockss.sectionIntro(A.frontMatter)).toHaveText(A.frontMatterIntro);
        await expect(clockss.frontMatterLinks()).toHaveText(A.frontMatterLinks);
        await expect(clockss.sectionIntro(A.metadata)).toHaveText(A.metadataIntro);
        expect(await clockss.rows()).toEqual(lockssRows);
        await expect(clockss.pkpLogo()).toHaveAttribute('href', A.pkpHref);
        await expect(clockss.lockssLogo()).toHaveCount(0);
        await expect(clockss.root().locator('img[alt="LOCKSS"]')).toHaveCount(0);
        await expect(clockss.closingLine(A.closing.clockss)).toHaveCount(1);
        await expect(clockss.closingLine(A.closing.lockss)).toHaveCount(0);
        await expect(clockss.closingLine(A.pkpLine)).toHaveCount(1);
        const clockssText = await clockss.text();
        expect(clockssText.indexOf(A.pkpLine)).toBeGreaterThan(clockssText.indexOf(A.closing.clockss));
        expect(clockssText.indexOf(A.closing.clockss)).toBeGreaterThan(clockssText.indexOf(A.metadataIntro));
        await siteClockss.goto();
        await expect(siteClockss.journalLink(tag)).toHaveText(['Tide Records']);

        // Nothing sent: no email to the Journal Manager or the principal
        // contact from the two saves, bounded by a password reset the visitor
        // asks for the journal's spare account; the Tasks count is the one
        // noted at the start, on a freshly loaded page (Side effects).
        const reset = new LostPasswordPage(visitor);
        await reset.gotoContext(tag);
        await reset.request(`${spare}@mail.test`);
        const afterControl = {to: `${spare}@mail.test`, subject: RESET_SUBJECT};
        await pkpMail.expectNone({to: `${manager}@mail.test`, afterControl});
        await pkpMail.expectNone({to: CONTACT, contains: tag, afterControl});
        await settings.open();
        await tasks.expectCount(tasksAtStart);

        // "LOCKSS" unticked again: "Saved"; the LOCKSS address opens the home
        // page again, with no message; the LOCKSS list no longer holds the
        // journal, while the CLOCKSS list, read the same way, still does
        // (Rules 5, 13; Settings bullet 1).
        await settings.openLockssSideTab();
        await expect(settings.box('lockss')).toBeChecked();
        await expect(settings.box('clockss')).toBeChecked();
        expect(await settings.setAndSave('lockss', false)).toBe(200);
        await lockss.goto();
        await expectJournalHome(visitor, tag);
        await siteLockss.goto();
        await expect(siteLockss.journalLink(tag)).toHaveCount(0);
        await siteClockss.goto();
        await expect(siteClockss.journalLink(tag)).toHaveText(['Tide Records']);

        // Control: the CLOCKSS page still shows (Rule 5; Fields, "LOCKSS and CLOCKSS").
        await clockss.goto();
        await expect(clockss.root()).toBeVisible();
        await expect(visitor).toHaveTitle(/^CLOCKSS Publisher Manifest\W+Tide Records$/);
        await clockss.expectYear(2020);
    });

    test('S2: A journal with issues in several years and two languages', async ({newVisitor, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s2', testInfo);
        const empty = `${tag}e`;
        await ojsApi.createContext({
            tag,
            context: {name: 'Coastal Years', supportedLocales: ['en', 'fr_CA']},
            publisherInstitution: 'Coastal House',
            onlineIssn: '0378-5955',
            printIssn: '2049-3630',
            enableLockss: true,
            issues: [
                {volume: 1, number: 1, year: 2011, published: true},
                {volume: 2, number: 1, year: 2014, published: true},
                {volume: 3, number: 1, year: 2015, published: true},
                {volume: 4, number: 1, year: 2016, published: true},
                {volume: 4, number: 2, year: 2016, published: true},
            ],
        });
        await ojsApi.createContext({tag: empty, context: {name: 'Empty Shelf'}, enableLockss: true});
        const visitor = await newVisitor();
        const page = new ManifestPage(visitor, tag, 'lockss');

        // The newest year: 2016, the year the issues carry, not the year they
        // were published (today), over its two issues and no other; "<<
        // Previous" plain text, "Next >>" a link (Rules 7–9).
        await page.goto();
        await expect(page.root()).toBeVisible();
        await page.expectYear(2016);
        await expect(page.issueLinks()).toHaveCount(2);
        expect(await page.issueNames()).toEqual(['Vol. 4 No. 1 (2016)', 'Vol. 4 No. 2 (2016)']);
        await expect(page.yearPlain('previous')).toHaveCount(1);
        await expect(page.yearLink('previous')).toHaveCount(0);
        await expect(page.yearLink('next')).toHaveCount(1);
        await expect(page.yearPlain('next')).toHaveCount(0);

        // "Next >>" to the oldest year: 2015, 2014, 2011, where "Next >>" is
        // plain text and "<< Previous" a link (Rule 8).
        for (const [year, issue] of [
            [2015, 'Vol. 3 No. 1 (2015)'],
            [2014, 'Vol. 2 No. 1 (2014)'],
            [2011, 'Vol. 1 No. 1 (2011)'],
        ]) {
            await page.yearLink('next').click();
            await page.expectYear(year);
            await expect(page.issueLinks()).toHaveText([issue]);
        }
        await expect(page.yearPlain('next')).toHaveCount(1);
        await expect(page.yearLink('next')).toHaveCount(0);
        await expect(page.yearLink('previous')).toHaveCount(1);
        await expect(page.yearPlain('previous')).toHaveCount(0);

        // "<< Previous" back: 2014, then 2015 (Rule 8).
        await page.yearLink('previous').click();
        await page.expectYear(2014);
        await page.yearLink('previous').click();
        await page.expectYear(2015);
        await expect(page.issueLinks()).toHaveText(['Vol. 3 No. 1 (2015)']);

        // A year in the address: 2015 shows 2015; 2013, with no published
        // issue, the default 2016; "2015abc" 2015 (Rule 7).
        await page.goto({year: 2015});
        await page.expectYear(2015);
        await page.goto({year: 2013});
        await page.expectYear(2016);
        await page.goto({year: '2015abc'});
        await page.expectYear(2015);

        // The optional rows: "Publisher" "Coastal House", "ISSN" the online
        // "0378-5955", one ISSN row (Fields, the page's table; Settings bullet 5).
        await page.goto();
        await page.expectYear(2016);
        await expect(page.rowValue('Publisher')).toHaveText('Coastal House');
        await expect(page.row('ISSN')).toHaveCount(1);
        await expect(page.rowValue('ISSN')).toHaveText('0378-5955');
        const englishLabels = await page.rowLabels();

        // Two languages: "English (en)" and French's name with "(fr_CA)", on
        // two lines; "Journal URL" ends in "/en" (Fields, the page's table;
        // Settings bullet 8).
        const langs = await page.rowLines('Language(s)');
        expect(langs).toHaveLength(2);
        expect(langs[0]).toBe('English (en)');
        expect(langs[1]).toMatch(/^\S.* \(fr_CA\)$/);
        await expectJournalUrl(page, tag, {locale: 'en'});
        await expect(page.banner().getByRole('link', {name: 'Search', exact: true})).toBeVisible();
        await expect(page.footer().getByRole('link', {name: FOOTER_EN, exact: true})).toBeVisible();

        // Read in French (a fresh visitor: a /fr_CA/ visit switches the
        // session's language): the page's own words and the tab title stay
        // English, the journal's header and footer turn French; "Language(s)" reads
        // "anglais (en)" and "français (fr_CA)", "Journal URL" ends in
        // "/fr_CA" (Rule 11). The "Rights" text is A2's, not read.
        const frVisitor = await newVisitor();
        const fr = new ManifestPage(frVisitor, tag, 'lockss');
        await fr.goto({locale: 'fr_CA'});
        await expect(fr.root()).toBeVisible();
        await expect(frVisitor).toHaveTitle(/^LOCKSS Publisher Manifest\W+Coastal Years$/);
        await fr.expectYear(2016);
        await expect(fr.yearLinks()).toHaveText(A.yearLinks);
        await expect(fr.sectionIntro(A.frontMatter)).toHaveText(A.frontMatterIntro);
        await expect(fr.frontMatterLinks()).toHaveText(A.frontMatterLinks);
        await expect(fr.sectionIntro(A.metadata)).toHaveText(A.metadataIntro);
        expect(await fr.rowLabels()).toEqual(englishLabels);
        await expect(fr.closingLine(A.closing.lockss)).toHaveCount(1);
        await expect(fr.closingLine(A.pkpLine)).toHaveCount(1);
        await expect(fr.banner().getByRole('link', {name: 'Rechercher', exact: true})).toBeVisible();
        await expect(fr.banner().getByRole('link', {name: 'Search', exact: true})).toHaveCount(0);
        await expect(fr.footer().getByRole('link', {name: FOOTER_FR, exact: true})).toBeVisible();
        await expect(fr.footer().getByRole('link', {name: FOOTER_EN, exact: true})).toHaveCount(0);
        expect(await fr.rowLines('Language(s)')).toEqual(['anglais (en)', 'français (fr_CA)']);
        await expectJournalUrl(fr, tag, {locale: 'fr_CA'});

        // Nothing published: "Empty Shelf"'s heading has no year, the list
        // under it is empty, both year links plain text (Rule 8a); the
        // positive control is the heading and the plain-text spans, read on
        // the same page.
        const shelf = new ManifestPage(visitor, empty, 'lockss');
        await shelf.goto();
        await expect(shelf.root()).toBeVisible();
        await shelf.expectYear('');
        await expect(shelf.archiveHeading()).toHaveText(/^\s*Archive of Published Issues:\s*$/);
        await expect(shelf.archiveHeading().locator('xpath=following-sibling::ul[1]')).toHaveCount(1);
        await expect(shelf.issueItems()).toHaveCount(0);
        await expect(shelf.yearPlain('previous')).toHaveCount(1);
        await expect(shelf.yearPlain('next')).toHaveCount(1);
        await expect(shelf.yearLinks().getByRole('link')).toHaveCount(0);

        // Control: "Empty Shelf"'s table has no "Publisher" and no "ISSN" row,
        // beside its "Title" row read the same way (Rule 10; Settings bullet 5).
        await expect(shelf.row('Title')).toHaveCount(1);
        await expect(shelf.rowValue('Title')).toHaveText('Empty Shelf');
        await expect(shelf.row('Publisher')).toHaveCount(0);
        await expect(shelf.row('ISSN')).toHaveCount(0);
    });

    test('S3: Journals closed to signed-out visitors', async ({asUser, newVisitor, ojsApi}, testInfo) => {
        test.slow();
        const tag = makeTag('s3', testInfo);
        const closed = `${tag}c`;
        const hidden = `${tag}h`;
        const open = `${tag}o`;
        const both = {enableLockss: true, enableClockss: true, issues: [{volume: 1, number: 1, year: 2020, published: true}]};
        await ojsApi.createContext({
            tag: closed,
            context: {name: 'Closed Shore'},
            restrictSiteAccess: true,
            users: [user(`${closed}rd`, 'Rita', 'Reader', ['reader'])],
            ...both,
        });
        await ojsApi.createContext({
            tag: hidden,
            context: {name: 'Hidden Bay', enabled: false},
            users: [user(`${hidden}mg`, 'Mona', 'Manager', ['manager'])],
            ...both,
        });
        await ojsApi.createContext({tag: open, context: {name: 'Open Coast'}, ...both});
        const visitor = await newVisitor();
        const siteLockss = new SiteManifestList(visitor, 'lockss');
        const siteClockss = new SiteManifestList(visitor, 'clockss');

        // Sign-in required, signed out: where the two addresses land is A4's
        // open question; the test opens them and records the landing only.
        for (const network of /** @type {const} */ (['lockss', 'clockss'])) {
            await new ManifestPage(visitor, closed, network).goto();
            recordLanding(visitor, `"Closed Shore" gateway/${network}, signed out`);
        }

        // The Reader of "Closed Shore", signed in, reads both pages, each
        // headed "Archive of Published Issues: 2020" (Actors row 4).
        const rp = await actorPage(asUser, `${closed}rd`);
        for (const network of /** @type {const} */ (['lockss', 'clockss'])) {
            const page = new ManifestPage(rp, closed, network);
            await page.goto();
            await expect(page.root()).toBeVisible();
            await expect(rp).toHaveTitle(new RegExp(`^${network.toUpperCase()} Publisher Manifest\\W+Closed Shore$`));
            await page.expectYear(2020);
        }

        // The site's list holds "Closed Shore" (Rule 13; Settings bullet 3);
        // where its link leads a signed-out visitor is A4's, recorded only.
        await siteLockss.goto();
        await expect(siteLockss.journalLink(closed)).toHaveText(['Closed Shore']);
        await siteLockss.journalLink(closed).click();
        await visitor.waitForLoadState('domcontentloaded');
        recordLanding(visitor, '"Closed Shore" site-list link, signed out');

        // Not enabled publicly, signed out: each address opens "Hidden Bay"'s
        // Login page; neither site list holds "Hidden Bay", while each holds
        // "Open Coast", read the same way (Rules 13, 14; Settings bullet 4).
        for (const network of /** @type {const} */ (['lockss', 'clockss'])) {
            await new ManifestPage(visitor, hidden, network).goto();
            await expectLoginLanding(visitor, hidden);
        }
        for (const list of [siteLockss, siteClockss]) {
            await list.goto();
            await expect(list.journalLink(open)).toHaveText(['Open Coast']);
            await expect(list.journalLink(hidden)).toHaveCount(0);
        }

        // The Journal Manager of "Hidden Bay", signed in, reads both pages,
        // each headed "Archive of Published Issues: 2020" (Actors row 4).
        const mp = await actorPage(asUser, `${hidden}mg`);
        for (const network of /** @type {const} */ (['lockss', 'clockss'])) {
            const page = new ManifestPage(mp, hidden, network);
            await page.goto();
            await expect(page.root()).toBeVisible();
            await expect(mp).toHaveTitle(new RegExp(`^${network.toUpperCase()} Publisher Manifest\\W+Hidden Bay$`));
            await page.expectYear(2020);
        }

        // Control: signed out, "Open Coast"'s LOCKSS page shows, headed
        // "Archive of Published Issues: 2020", and the LOCKSS list holds it
        // (read above; its link opens the page) (Rules 6, 13).
        const openPage = new ManifestPage(visitor, open, 'lockss');
        await openPage.goto();
        await expect(openPage.root()).toBeVisible();
        await expect(visitor).toHaveTitle(/^LOCKSS Publisher Manifest\W+Open Coast$/);
        await openPage.expectYear(2020);
        await siteLockss.goto();
        await siteLockss.journalLink(open).click();
        await expect(visitor).toHaveURL(new RegExp(`/index\\.php/${open}/gateway/lockss$`));
        await openPage.expectYear(2020);
    });

    test('S4: the absence on a press or a preprint server, its journal-side control', async ({asUser, newVisitor, ojsApi}, testInfo) => {
        const tag = makeTag('s4', testInfo);
        const ticked = `${tag}l`;
        await ojsApi.createContext({tag, users: [user(`${tag}mg`, 'Mona', 'Manager', ['manager'])]});
        await ojsApi.createContext({tag: ticked, context: {name: `U67 ticked ${ticked}`}, enableLockss: true});
        const mp = await actorPage(asUser, `${tag}mg`);
        const visitor = await newVisitor();

        // The Journal Manager's Settings › Distribution holds the top tab
        // "Archiving", and it opens (Rule 1).
        const settings = new ArchivingSettings(mp, tag);
        await settings.open();
        expect(await settings.topTabNames()).toContain(A.archivingTab);
        await expect(settings.archivingTab()).toHaveCount(1);
        await expect(settings.archivingPanel()).toBeVisible();

        // The journal's LOCKSS address opens its home page (Rule 5).
        await new ManifestPage(visitor, tag, 'lockss').goto();
        await expectJournalHome(visitor, tag);

        // The OJS install's site LOCKSS list shows "Archive of Published
        // Issues", holding the ticked journal this test seeded (Rule 13).
        const site = new SiteManifestList(visitor, 'lockss');
        await site.goto();
        await expect(visitor).toHaveURL(/\/index\.php\/index(\/en)?\/gateway\/lockss$/);
        await expect(site.heading()).toHaveCount(1);
        await expect(site.journalLink(ticked)).toHaveText([`U67 ticked ${ticked}`]);
        await expect(site.journalLink(tag)).toHaveCount(0);
    });
});
