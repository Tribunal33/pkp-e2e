// @ts-check
/**
 * @file playwright/tests/U57-languages-and-locales.spec.js
 *
 * Languages & locales — OPS suite, the parallel half: scenarios 4–9 (all
 * common), in OPS vocabulary: a preprint server, its Preprint Server
 * Manager, "About the Server", Settings › Server › "Masthead" with its
 * "Server Title". Scenarios 1–3 change the site's own language list and
 * live in `serial/U57-languages-and-locales.spec.js`.
 * Spec: docs/specs/U57-languages-and-locales.md
 *
 * Deliberately NOT covered (register IDs; a 🐞 is never asserted as the
 * contract, a ❓ is parked, not a gap): A1 🐞, A2 ❓, A3 🐞, A4 ❓, A5 🐞,
 * A6 🐞, A7 🐞, A8 🐞, A9 ❓, A10 ❓, A11 ❓, A12 ❓, A13 ❓ (the serial file's
 * scenario 1), and U07 OPS3 🐞. Where a test passes
 * through one it leaves the finding's own claim unasserted either way: S5
 * ticks "Forms" without reading the page's script errors (A5), and reads
 * the French "Privacy Statement" box a "Forms" tick fills as filled, not
 * its words, which on a preprint server are an internal name (OPS3); S8
 * reads the French "Privacy Statement" page as French and not the English
 * statement, not the statement's words (OPS3); S6's visitors send plain
 * "de" and "en", never "en-US" (A11); S8 reads the page "français" opens
 * as French and leaves where it lands unread (A3).
 * The spec's Coverage section records everything else left out.
 *
 * Seeding (footnote s): each of scenarios 4–8 runs on its own scratch
 * preprint server from `POST scenarios/context` with throwaway `users[]`
 * (the username twice as password, `<username>@mail.test`), its languages
 * set with `context.supportedLocales` (English alone for 4–7, English and
 * French (Canada) for 8), `supportedFormLocales` left out (the primary
 * language alone under "Forms"), and "Language Toggle Block" placed with
 * `sidebar` (4 and 8). Scenario 7 adds an Author; scenario 8 a Reader, who
 * starts as a signed-out visitor and signs in on the page. Scenario 9 reads
 * `publicknowledge` read-only as a signed-out visitor. Every signed-in
 * actor is opened through `asUser` (no default user, patterns.md "Fixture
 * selection"); a visitor is a browser context with an empty storage state
 * (parallel lesson 8); a visitor whose first language matters sends it as
 * `Accept-Language` (footnote s; the test browser's own "en-US" reads
 * English on every English-primary server). The notices at the top right
 * are read only by each scenario's own throwaway manager (parallel lesson
 * 2). Adding French under "Forms" on scratch servers of parallel tests can
 * race (A6, ci-triage "Two contexts adding French at the same moment"):
 * a red 500 there is that race, reported, never retried away.
 *
 * S5 and S7 run one after the other (a serial describe): each ticks French
 * as a form or submission language, which installs the French default email
 * data, and two such installs at once answer 500 (register A6).
 */
const {test: base, expect} = require('../support/fixtures.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {SettingsPages} = require('../../../../shared/playwright/pages/ContextIdentityPages.js');
const {
    JournalLanguagesTab,
    LanguageBlock,
    LanguageMenu,
    noticeDuring,
} = require('../../../../shared/playwright/pages/LanguagesPages.js');
const {startUrl, startFormLegend} = require('../pages/SubmissionWizardPages.js');

const T = 30_000;
const SEEDED = 'publicknowledge';

// ---- the words ----------------------------------------------------------------------
const SAVED = 'Locale settings saved.';
const SUB_UPDATED = 'Submission locales updated.';
const NOT_SAVED_ALERT = 'The language setting could not be saved. All options need to be enabled.';
const ONE_NEEDED = 'At least one locale needs to be selected.';
const FORM_CHANGED = 'The data on this form has changed. Do you wish to continue without saving?';
const REQUIRED = 'This field is required.';
const EN_PRIVACY =
    'The names and email addresses entered in this server site will be used exclusively for the stated purposes of this server and will not be made available for any other purpose or to any other party.';
const PRIVACY_FR = 'Déclaration de confidentialité';
const ABOUT_EN = 'About the Server';
const ABOUT_FR = 'À propos du serveur';
const PRIVACY_BOX = 'privacy-privacyStatement-control';

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u57s${scenario}opw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account of the scratch server, named by the tag. */
function person(tag, key, givenName, familyName, roles) {
    return {username: `${tag}${key}`, givenName, familyName, email: `${tag}${key}@mail.test`, roles};
}

/** A signed-in page for an actor (a fresh `asUser` context). */
async function signedIn(asUser, username) {
    return (await asUser(username)).newPage();
}

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** An address ending in `/index.php/{ctx}[/{locale}]{rest}` (a home page may end in `/index`). */
function addressRe(ctx, locale, rest = '') {
    const seg = locale ? `/${locale}` : '';
    return rest ? new RegExp(`/index\\.php/${esc(ctx)}${seg}${esc(rest)}$`) : new RegExp(`/index\\.php/${esc(ctx)}${seg}(/index)?/?$`);
}

/** Visitors: browser contexts with no session, optionally preferring a language. */
const test = base.extend({
    newVisitor: async ({browser, baseURL}, use) => {
        const made = [];
        await use(async ({acceptLanguage} = {}) => {
            const options = {baseURL, storageState: {cookies: [], origins: []}, reducedMotion: 'reduce'};
            if (acceptLanguage) {
                options.locale = acceptLanguage;
                options.extraHTTPHeaders = {'Accept-Language': acceptLanguage};
            }
            const context = await browser.newContext(options);
            made.push(context);
            return context.newPage();
        });
        for (const context of made) {
            await context.close();
        }
    },
});

/** The language of the page as the document states it ("en", "fr-CA"). */
function html(page) {
    return page.locator('html');
}

/** A public page's heading. */
function heading(page) {
    return page.locator('.pkp_structure_main h1').first();
}

/** Press a box of "Website Languages" that saves: 200 and "Locale settings saved.". */
async function pressWebsite(tab, code, column) {
    await noticeDuring(tab.page, SAVED, async () => {
        const {response, alerts} = await tab.pressWebsite(code, column);
        expect(alerts, 'no alert').toEqual([]);
        expect(response.status()).toBe(200);
    });
}

/** Press a box or radio of "Submission Languages" that saves: 200 and "Locale settings saved.". */
async function pressSubmission(tab, code, column) {
    await noticeDuring(tab.page, SAVED, async () => {
        const {response, alerts} = await tab.pressSubmission(code, column);
        expect(alerts, 'no alert').toEqual([]);
        expect(response.status()).toBe(200);
    });
}

/** The "French" language button of a Vue settings form. */
function frenchButton(form) {
    return form.form.locator('.pkpFormLocales button').filter({hasText: /^\s*French\s*$/});
}

/** Text of an HTML value without tags. */
const plain = (value) => (value || '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

test.describe('languages and locales', () => {
    test('S4: a second interface language', async ({asUser, opsApi, newVisitor}, testInfo) => {
        test.slow();
        const tag = makeTag(4, testInfo);
        const manager = person(tag, 'mg', 'Mona', 'Manager', ['manager']);
        await opsApi.createContext({tag, context: {supportedLocales: ['en']}, sidebar: ['languagetoggleblockplugin'], users: [manager]});
        const mp = await signedIn(asUser, manager.username);
        const vp = await newVisitor();
        const tab = new JournalLanguagesTab(mp, tag);
        const menu = new LanguageMenu(mp);
        const block = new LanguageBlock(vp);

        // One interface language: no block, no language in the address (Rules 17d, 19).
        await vp.goto(`/index.php/${tag}`);
        await expect(block.pageHeader).toBeVisible();
        await expect(vp).toHaveURL(addressRe(tag, ''));
        await expect(block.block).toHaveCount(0);
        await vp.goto(`/index.php/${tag}/fr_CA/about`);
        await expect(vp).toHaveURL(addressRe(tag, '', '/about'));
        await expect(heading(vp)).toHaveText(ABOUT_EN);
        // …and no "Change Language" for the manager (Rule 20); "Edit Profile" is the control.
        await tab.goto();
        let lines = (await menu.read()).map((i) => i.text);
        expect(lines).toContain('Edit Profile');
        expect(lines).not.toContain('Change Language');

        // French ticked under "UI" (Rules 7, 9).
        await expect(tab.website.cell('fr_CA', 'uiLocale')).not.toBeChecked();
        await pressWebsite(tab, 'fr_CA', 'uiLocale');
        await expect(tab.website.cell('fr_CA', 'uiLocale')).toBeChecked();

        // The visitor's pages (Rules 17a, 19).
        await vp.goto(`/index.php/${tag}`);
        await expect(vp).toHaveURL(addressRe(tag, 'en'));
        await expect(block.heading).toHaveText('Language');
        expect(await block.linkNames()).toEqual(['English', 'français']);

        // No French texts yet: French headings, the English statement (Rules 8a, 21).
        await vp.goto(`/index.php/${tag}/en/about/privacy`);
        await expect(vp.locator('.pkp_structure_main')).toContainText(EN_PRIVACY);
        await vp.goto(`/index.php/${tag}/fr_CA/about/privacy`);
        await expect(html(vp)).toHaveAttribute('lang', 'fr-CA');
        await expect(heading(vp)).toHaveText(PRIVACY_FR);
        await expect(vp.locator('.pkp_structure_main')).toContainText(EN_PRIVACY);

        // "Change Language" on the reloaded page, "Setup" and its side tab
        // "Languages" pressed, the address ending "#languages" (Fields;
        // Rules 17, 20, 20a).
        await tab.goto();
        await tab.pressLanguagesSideTab();
        await expect(mp).toHaveURL(new RegExp(`/index\\.php/${tag}/en/management/settings/website#languages$`));
        expect((await menu.read()).slice(0, 3)).toEqual([
            {text: 'Change Language', ticked: null, heading: true},
            {text: 'English', ticked: true, heading: false},
            {text: 'français', ticked: false, heading: false},
        ]);

        // Chosen on a Settings side tab: Settings › Website reopens in French
        // on "Appearance" › "Theme" (Rule 20).
        await menu.choose('français', 'fr_CA');
        await expect(mp).toHaveURL(new RegExp(`/index\\.php/${tag}/fr_CA/management/settings/website`));
        await expect(html(mp)).toHaveAttribute('lang', 'fr-CA');
        await expect(mp.locator('#appearance-button').first()).toHaveAttribute('aria-selected', 'true', {timeout: T});
        await expect(mp.getByRole('tabpanel', {name: 'Apparence', exact: true}).getByRole('tab', {selected: true})).toHaveText(/^\s*Thème\s*$/);
        await expect(mp.locator('#languageGridContainer')).toBeHidden();
        expect((await menu.read()).slice(0, 3)).toEqual([
            {text: 'Changer la langue', ticked: null, heading: true},
            {text: 'English', ticked: false, heading: false},
            {text: 'français', ticked: true, heading: false},
        ]);

        // Chosen on the Dashboard (Rule 20).
        await mp.goto(`/index.php/${tag}/dashboard/editorial`);
        await expect(mp).toHaveURL(new RegExp(`/index\\.php/${tag}/fr_CA/dashboard/editorial`));
        await expect(html(mp)).toHaveAttribute('lang', 'fr-CA');
        await menu.choose('English', 'en');
        await expect(mp).toHaveURL(new RegExp(`/index\\.php/${tag}/en/dashboard/editorial`));
        await expect(html(mp)).toHaveAttribute('lang', 'en');
        expect((await menu.read())[0]).toEqual({text: 'Change Language', ticked: null, heading: true});

        // French unticked (Rules 9, 17d).
        await tab.goto();
        await pressWebsite(tab, 'fr_CA', 'uiLocale');
        await expect(tab.website.cell('fr_CA', 'uiLocale')).not.toBeChecked();
        await vp.goto(`/index.php/${tag}/fr_CA/about/privacy`);
        await expect(vp).toHaveURL(addressRe(tag, '', '/about/privacy'));
        await expect(html(vp)).toHaveAttribute('lang', 'en');
        await expect(heading(vp)).toHaveText('Privacy Statement');
        await expect(block.block).toHaveCount(0);
        await tab.goto();
        lines = (await menu.read()).map((i) => i.text);
        expect(lines).toContain('Edit Profile');
        expect(lines).not.toContain('Change Language');

        // Control: "Forms" stayed unticked, and "Privacy Statement" has no "French" (Rule 10).
        await expect(tab.website.cell('fr_CA', 'formLocale')).not.toBeChecked();
        await expect(tab.website.cell('en', 'formLocale')).toBeChecked();
        const privacy = await tab.pressSetupSideTab('privacy');
        await expect(privacy.saveButton).toBeVisible();
        await expect(privacy.form.locator('.pkpFormLocales button')).toHaveCount(0);
    });

    test.describe('the French form-language installs, one at a time', () => {
        // Register A6: two French installs of the default email data at once answer 500.
        test.describe.configure({mode: 'serial'});

        test('S5: a second form language', async ({asUser, opsApi}, testInfo) => {
            test.slow();
            const tag = makeTag(5, testInfo);
            const manager = person(tag, 'mg', 'Mona', 'Manager', ['manager']);
            await opsApi.createContext({tag, context: {supportedLocales: ['en']}, users: [manager]});
            const mp = await signedIn(asUser, manager.username);
            const tab = new JournalLanguagesTab(mp, tag);

            // One form language: no language buttons (Rule 10).
            let privacy = await tab.reloadedSetupSideTab('privacy');
            await expect(privacy.saveButton).toBeVisible();
            await expect(privacy.form.locator('.pkpFormLocales button')).toHaveCount(0);

            // French ticked under "Forms" alone (Rules 7, 10).
            await tab.goto();
            await pressWebsite(tab, 'fr_CA', 'formLocale');
            await expect(tab.website.cell('fr_CA', 'formLocale')).toBeChecked();
            await expect(tab.website.cell('fr_CA', 'uiLocale')).not.toBeChecked();

            // The other side tabs, without a reload (Rule 10b): "Privacy
            // Statement" has a "French" button, the French box is empty and
            // "1/2 languages completed" shows under each box. After a reload
            // the box is filled (Rules 10a, 10b), on a preprint server with an
            // internal name (U07 OPS3), whose words this suite does not read.
            privacy = await tab.pressSetupSideTab('privacy');
            await expect(frenchButton(privacy)).toHaveCount(1);
            await frenchButton(privacy).click();
            await expect(privacy.richBody(`${PRIVACY_BOX}-fr_CA`)).toBeVisible();
            await expect.poll(async () => plain(await privacy.richContent(`${PRIVACY_BOX}-en`))).toContain(EN_PRIVACY);
            expect(await privacy.richContent(`${PRIVACY_BOX}-fr_CA`)).toBe('');
            await expect(privacy.form.getByText('1/2 languages completed', {exact: true})).toHaveCount(2);
            privacy = await tab.reloadedSetupSideTab('privacy');
            await frenchButton(privacy).click();
            await expect(privacy.richBody(`${PRIVACY_BOX}-fr_CA`)).toBeVisible();
            expect(plain(await privacy.richContent(`${PRIVACY_BOX}-fr_CA`)), 'the French box is filled').not.toBe('');

            // A text of the server's own.
            await privacy.typeRich(`${PRIVACY_BOX}-fr_CA`, 'Notre politique.');
            await privacy.save();

            // "Forms" unticked and ticked again: the French text stays (Rule 10a).
            await tab.goto();
            await pressWebsite(tab, 'fr_CA', 'formLocale');
            await expect(tab.website.cell('fr_CA', 'formLocale')).not.toBeChecked();
            await pressWebsite(tab, 'fr_CA', 'formLocale');
            await expect(tab.website.cell('fr_CA', 'formLocale')).toBeChecked();
            privacy = await tab.reloadedSetupSideTab('privacy');
            await frenchButton(privacy).click();
            expect(plain(await privacy.richContent(`${PRIVACY_BOX}-fr_CA`))).toBe('Notre politique.');

            // "Submissions" ticked (Rules 14, 15a).
            await tab.goto();
            const win = await tab.openAddRemove();
            await win.box('fr_CA').check();
            await noticeDuring(mp, SUB_UPDATED, () => win.save());
            await expect(tab.submission.row('fr_CA')).toContainText('French (Canada)/français (Canada)');
            await expect(tab.submission.cell('fr_CA', 'submissionMetadataLocale')).not.toBeChecked();
            await pressSubmission(tab, 'fr_CA', 'submissionLocale');
            await expect(tab.submission.cell('fr_CA', 'submissionLocale')).toBeChecked();
            await expect(tab.submission.cell('fr_CA', 'submissionMetadataLocale')).toBeChecked();
            privacy = await tab.reloadedSetupSideTab('privacy');
            await frenchButton(privacy).click();
            expect(plain(await privacy.richContent(`${PRIVACY_BOX}-fr_CA`))).toBe('Notre politique.');

            // Control: no "Change Language", French being a form language only (Rules 9, 10, 20).
            const lines = (await new LanguageMenu(mp).read()).map((i) => i.text);
            expect(lines).toContain('Edit Profile');
            expect(lines).not.toContain('Change Language');
        });

        test('S7: submission languages', async ({asUser, opsApi}, testInfo) => {
            test.slow();
            const tag = makeTag(7, testInfo);
            const manager = person(tag, 'mg', 'Mona', 'Manager', ['manager']);
            const author = person(tag, 'au', 'Anna', 'Author', ['author']);
            await opsApi.createContext({tag, context: {supportedLocales: ['en']}, users: [manager, author]});
            const mp = await signedIn(asUser, manager.username);
            const ap = await signedIn(asUser, author.username);
            const tab = new JournalLanguagesTab(mp, tag);

            // The window (Fields; Rule 14).
            await tab.goto();
            expect(await tab.submission.codes()).toEqual(['en']);
            let win = await tab.openAddRemove();
            await expect(win.group).toBeVisible();
            await expect(win.group).toContainText('Select submission and metadata languages.');
            expect(await win.boxes.count(), 'one box per language of the world').toBeGreaterThan(300);
            await expect(win.boxByLabel('[ fr_CA ] French (Canada)')).toBeVisible();
            await expect(win.box('en')).toBeChecked();
            await expect(win.box('fr_CA')).not.toBeChecked();
            await expect(win.saveButton).toBeVisible();
            await expect(win.cancelButton).toBeVisible();

            // Left unsaved: the question, "OK", nothing saved (Fields).
            await win.box('fr_CA').check();
            await win.box('fr_CA').blur();
            expect(await win.closeAnswering('accept')).toBe(FORM_CHANGED);
            await expect(win.form).toBeHidden({timeout: T});
            expect(await tab.submission.codes()).toEqual(['en']);

            // Nothing ticked: refused, the window stays open (Fields).
            win = await tab.openAddRemove();
            await expect(win.box('fr_CA')).not.toBeChecked();
            await win.box('en').uncheck();
            await noticeDuring(mp, ONE_NEEDED, () => win.saveButton.click());
            await expect(win.form).toBeVisible();
            await win.box('en').check();

            // French (Canada) added (Rule 14).
            await win.box('fr_CA').check();
            await noticeDuring(mp, SUB_UPDATED, () => win.save());
            expect((await tab.submission.codes()).sort()).toEqual(['en', 'fr_CA']);
            await expect(tab.submission.row('fr_CA')).toContainText('French (Canada)/français (Canada)');
            await expect(tab.submission.cell('fr_CA', 'submissionLocale')).not.toBeChecked();
            await expect(tab.submission.cell('fr_CA', 'submissionMetadataLocale')).not.toBeChecked();

            // "Submissions" ticked: "Metadata" with it (Rule 15a).
            await pressSubmission(tab, 'fr_CA', 'submissionLocale');
            await expect(tab.submission.cell('fr_CA', 'submissionLocale')).toBeChecked();
            await expect(tab.submission.cell('fr_CA', 'submissionMetadataLocale')).toBeChecked();

            // The Author's submission: the wizard asks for the language (Rule 15).
            await ap.goto(startUrl(tag));
            await expect(ap.getByRole('heading', {name: /Make a Submission/}).first()).toBeVisible({timeout: T});
            await expect(startFormLegend(ap, 'Submission Language')).toBeVisible();
            await expect(ap.locator('input[name="locale"]')).toHaveCount(2);

            // The columns together (Rules 15a, 15b).
            await pressSubmission(tab, 'fr_CA', 'submissionMetadataLocale');
            await expect(tab.submission.cell('fr_CA', 'submissionMetadataLocale')).not.toBeChecked();
            await expect(tab.submission.cell('fr_CA', 'submissionLocale')).not.toBeChecked();
            await pressSubmission(tab, 'fr_CA', 'submissionLocale');
            await expect(tab.submission.cell('fr_CA', 'submissionLocale')).toBeChecked();
            await expect(tab.submission.cell('fr_CA', 'submissionMetadataLocale')).toBeChecked();
            await pressSubmission(tab, 'fr_CA', 'submissionLocale');
            await expect(tab.submission.cell('fr_CA', 'submissionLocale')).not.toBeChecked();
            await expect(tab.submission.cell('fr_CA', 'submissionMetadataLocale')).toBeChecked();

            // The "Default" row's boxes cannot be unticked (Rule 15c).
            for (const column of ['submissionLocale', 'submissionMetadataLocale']) {
                const {alerts} = await tab.pressSubmission('en', column);
                expect(alerts).toEqual([NOT_SAVED_ALERT]);
                await expect(tab.submission.cell('en', column)).toBeChecked();
            }

            // Another "Default" (Rule 16).
            await pressSubmission(tab, 'fr_CA', 'defaultSubmissionLocale');
            await expect(tab.submission.cell('fr_CA', 'defaultSubmissionLocale')).toBeChecked();
            await expect(tab.submission.cell('en', 'defaultSubmissionLocale')).not.toBeChecked();
            await expect(tab.submission.cell('fr_CA', 'submissionLocale')).toBeChecked();
            await expect(tab.submission.cell('fr_CA', 'submissionMetadataLocale')).toBeChecked();

            // The "Default" language removed: English the "Default" again (Rule 14).
            win = await tab.openAddRemove();
            await win.box('fr_CA').uncheck();
            await noticeDuring(mp, SUB_UPDATED, () => win.save());
            await expect(tab.submission.row('fr_CA')).toHaveCount(0);
            expect(await tab.submission.codes()).toEqual(['en']);
            await expect(tab.submission.cell('en', 'defaultSubmissionLocale')).toBeChecked();
            await expect(tab.submission.cell('en', 'submissionLocale')).toBeChecked();
            await expect(tab.submission.cell('en', 'submissionMetadataLocale')).toBeChecked();

            // Control: no "Submission Language" with one submission language (Rules 15, 16).
            await ap.goto(startUrl(tag));
            await expect(ap.getByRole('heading', {name: /Make a Submission/}).first()).toBeVisible({timeout: T});
            await expect(ap.locator('iframe[id^="startSubmission-title-control"]')).toBeVisible();
            await expect(startFormLegend(ap, 'Submission Language')).toHaveCount(0);
            await expect(ap.locator('input[name="locale"]')).toHaveCount(0);
        });
    });

    test('S6: another primary language for the server', async ({asUser, opsApi, newVisitor}, testInfo) => {
        test.slow();
        const tag = makeTag(6, testInfo);
        const manager = person(tag, 'mg', 'Mona', 'Manager', ['manager']);
        await opsApi.createContext({tag, context: {supportedLocales: ['en']}, users: [manager]});
        const mp = await signedIn(asUser, manager.username);
        const tab = new JournalLanguagesTab(mp, tag);
        try {
            // French made primary, with no question (Rule 11).
            await tab.goto();
            await pressWebsite(tab, 'fr_CA', 'contextPrimary');
            await expect(tab.website.cell('fr_CA', 'contextPrimary')).toBeChecked();
            await expect(tab.website.cell('fr_CA', 'uiLocale')).toBeChecked();
            await expect(tab.website.cell('fr_CA', 'formLocale')).toBeChecked();

            // The primary language's boxes (Rule 12).
            for (const column of ['uiLocale', 'formLocale']) {
                const {alerts} = await tab.pressWebsite('fr_CA', column);
                expect(alerts).toEqual([NOT_SAVED_ALERT]);
                await expect(tab.website.cell('fr_CA', column)).toBeChecked();
            }

            // From here the manager's browser ("en-US", A11) would read the now
            // French-primary server in French: the addresses name English.
            const tabEn = new JournalLanguagesTab(mp, tag, {locale: 'en'});
            await tabEn.goto();
            await expect(tabEn.website.cell('fr_CA', 'uiLocale')).toBeChecked();
            await expect(tabEn.website.cell('fr_CA', 'formLocale')).toBeChecked();

            // No default texts: the French box, now the primary one, is empty (Rule 11).
            const privacy = await tabEn.pressSetupSideTab('privacy');
            await expect(privacy.richBody(`${PRIVACY_BOX}-fr_CA`)).toBeVisible();
            expect(plain(await privacy.richContent(`${PRIVACY_BOX}-fr_CA`))).toBe('');

            // Required in French: "Server Title" (Rule 11; U07 Rule 11).
            const masthead = await new SettingsPages(mp, tag, {locale: 'en'}).openJournalTab('Masthead');
            await masthead.saveButton.click();
            await expect(masthead.fieldError('masthead-name-control-fr_CA')).toHaveText(REQUIRED, {timeout: T});
            await expect(masthead.control('masthead-name-control-fr_CA')).toHaveValue('');

            // The first visitor (German, which the server does not offer): French (Rules 11, 18).
            const v1 = await newVisitor({acceptLanguage: 'de'});
            await v1.goto(`/index.php/${tag}`);
            await expect(v1).toHaveURL(addressRe(tag, 'fr_CA'));
            await expect(html(v1)).toHaveAttribute('lang', 'fr-CA');

            // Control: the second visitor ("en"): English (Rule 18; Settings bullet 5).
            const v2 = await newVisitor({acceptLanguage: 'en'});
            await v2.goto(`/index.php/${tag}`);
            await expect(v2).toHaveURL(addressRe(tag, 'en'));
            await expect(html(v2)).toHaveAttribute('lang', 'en');
        } finally {
            // Put English back as the primary language: a context left
            // French-primary with no French name shows an empty name in the
            // site's lists other suites read (the Site Settings "Bulk Emails" boxes).
            await tab.goto();
            if (!(await tab.website.cell('en', 'contextPrimary').isChecked())) {
                const back = await tab.pressWebsite('en', 'contextPrimary');
                expect(back.response.status(), 'English primary again').toBe(200);
            }
            await expect(tab.website.cell('en', 'contextPrimary')).toBeChecked();
        }
    });

    test('S8: switching with the "Language" block', async ({asUser, opsApi, newVisitor}, testInfo) => {
        test.slow();
        const tag = makeTag(8, testInfo);
        const manager = person(tag, 'mg', 'Mona', 'Manager', ['manager']);
        const reader = person(tag, 'rd', 'Rhea', 'Reader', ['reader']);
        await opsApi.createContext({
            tag,
            context: {supportedLocales: ['en', 'fr_CA']},
            sidebar: ['languagetoggleblockplugin'],
            users: [manager, reader],
        });
        const vp = await newVisitor();
        const block = new LanguageBlock(vp);

        // The block: both entries links, neither marked (Fields; Rules 17a, 19).
        await vp.goto(`/index.php/${tag}`);
        await expect(vp).toHaveURL(addressRe(tag, 'en'));
        await expect(block.heading).toHaveText('Language');
        expect(await block.linkNames()).toEqual(['English', 'français']);
        await expect(block.items).toHaveCount(2);
        const [englishLook, frenchLook] = await block.entryLooks();
        expect(englishLook, 'nothing marks the language being read').toBe(frenchLook);
        await vp.goto(`/index.php/${tag}/en/about`);
        await expect(heading(vp)).toHaveText(ABOUT_EN);
        expect(await block.linkNames()).toEqual(['English', 'français']);

        // "français" chosen on "About the Server": the page it opens reads in
        // French (where it lands is A3's, not read); then the server's home
        // by its own address (Fields; Rules 17a, 18, 19).
        await block.link('français').click();
        await expect(html(vp)).toHaveAttribute('lang', 'fr-CA', {timeout: T});
        await vp.goto(`/index.php/${tag}`);
        await expect(vp).toHaveURL(addressRe(tag, 'fr_CA'));
        await expect(html(vp)).toHaveAttribute('lang', 'fr-CA');
        await expect(block.heading).toHaveText('Langue');

        // The texts the server was created with (Rule 8a): French, not the
        // English statement (their words are OPS3's, not read here).
        await vp.goto(`/index.php/${tag}/about/privacy`);
        await expect(vp).toHaveURL(addressRe(tag, 'fr_CA', '/about/privacy'));
        await expect(heading(vp)).toHaveText(PRIVACY_FR);
        await expect(vp.locator('.pkp_structure_main')).not.toContainText(EN_PRIVACY);

        // Signed in: the server's home, French, no initials menu; Profile's
        // menu in French with the tick beside "français" (Fields; Rules 18, 20).
        await vp.goto(`/index.php/${tag}/login`);
        await expect(vp).toHaveURL(addressRe(tag, 'fr_CA', '/login'));
        await new LoginPage(vp).signIn(reader.username, `${reader.username}${reader.username}`);
        await expect(vp).toHaveURL(addressRe(tag, 'fr_CA'), {timeout: T});
        await expect(html(vp)).toHaveAttribute('lang', 'fr-CA');
        await expect(vp.locator('#navigationUser')).toContainText(reader.username);
        await expect(vp.locator('[data-cy="app-user-nav"]')).toHaveCount(0);
        await vp.goto(`/index.php/${tag}/user/profile`);
        await expect(vp).toHaveURL(new RegExp(`/index\\.php/${tag}/fr_CA/user/profile`));
        const menu = new LanguageMenu(vp);
        expect((await menu.read()).slice(0, 3)).toEqual([
            {text: 'Changer la langue', ticked: null, heading: true},
            {text: 'English', ticked: false, heading: false},
            {text: 'français', ticked: true, heading: false},
        ]);

        // Signed out: still French (Rule 18).
        await menu.openUserMenu();
        await menu.userMenu.locator('a[href*="/login/signOut"]').click();
        await vp.waitForURL((url) => !url.pathname.includes('/user/profile'), {timeout: T, waitUntil: 'commit'});
        await vp.goto(`/index.php/${tag}`);
        await expect(vp).toHaveURL(addressRe(tag, 'fr_CA'));
        await expect(html(vp)).toHaveAttribute('lang', 'fr-CA');
        await expect(block.heading).toHaveText('Langue');
        await expect(vp.locator('#navigationUser')).not.toContainText(reader.username);

        // Control: the manager's own browser reads English, and "Privacy
        // Statement" has no "French", French not being a form language (Rules 8a, 18).
        const mp = await signedIn(asUser, manager.username);
        const privacy = await new SettingsPages(mp, tag).openWebsiteSetupTab('privacy');
        await expect(html(mp)).toHaveAttribute('lang', 'en');
        await expect(privacy.saveButton).toBeVisible();
        await expect(privacy.form.locator('.pkpFormLocales button')).toHaveCount(0);
    });

    test('S9: addresses with a language', async ({newVisitor}) => {
        const vp = await newVisitor();
        const block = new LanguageBlock(vp);

        // No language in the address: English, no block (Rule 17a; Settings bullet 1).
        await vp.goto(`/index.php/${SEEDED}/about`);
        await expect(vp).toHaveURL(addressRe(SEEDED, 'en', '/about'));
        await expect(heading(vp)).toHaveText(ABOUT_EN);
        await expect(html(vp)).toHaveAttribute('lang', 'en');
        await expect(block.pageHeader).toBeVisible();
        await expect(block.block).toHaveCount(0);

        // French in the address, then kept (Rules 17b, 18).
        await vp.goto(`/index.php/${SEEDED}/fr_CA/about`);
        await expect(heading(vp)).toHaveText(ABOUT_FR);
        await expect(html(vp)).toHaveAttribute('lang', 'fr-CA');
        await vp.goto(`/index.php/${SEEDED}/about`);
        await expect(vp).toHaveURL(addressRe(SEEDED, 'fr_CA', '/about'));
        await expect(heading(vp)).toHaveText(ABOUT_FR);

        // A language the server does not offer (Rule 17c).
        await vp.goto(`/index.php/${SEEDED}/de/about`);
        await expect(vp).toHaveURL(addressRe(SEEDED, 'fr_CA', '/about'));
        await expect(heading(vp)).toHaveText(ABOUT_FR);

        // No language code (Rule 17c).
        await vp.goto(`/index.php/${SEEDED}/xx/about`);
        await expect(vp.getByRole('heading', {name: '404 Not Found'})).toBeVisible();

        // Control: "en" in the address wins over the remembered French (Rule 18).
        await vp.goto(`/index.php/${SEEDED}/en/about`);
        await expect(vp).toHaveURL(addressRe(SEEDED, 'en', '/about'));
        await expect(heading(vp)).toHaveText(ABOUT_EN);
        await expect(html(vp)).toHaveAttribute('lang', 'en');
    });
});
