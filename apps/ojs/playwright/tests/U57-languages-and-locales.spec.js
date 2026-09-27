// @ts-check
/**
 * @file playwright/tests/U57-languages-and-locales.spec.js
 *
 * Languages & locales — OJS suite, parallel part: scenarios 4–9 (all
 * common). Scenarios 1–3 change the site's own language list and live in
 * `serial/U57-languages-and-locales.spec.js`.
 * Spec: docs/specs/U57-languages-and-locales.md
 *
 * Deliberately NOT covered (register IDs from the spec's Findings register —
 * a 🐞 is never asserted as the contract, a ❓ is parked, not a gap): A2 ❓,
 * A4 ❓, A6 🐞, A7 🐞, A8 🐞 (OMP OPS), A9 ❓, A12 ❓, A13 ❓ (the serial file's
 * scenario 1). Passed through with their own
 * claim left unasserted: A3 🐞 (S8 reads the language "français" lands in,
 * not whether it is the site's home or the page the reader was on), A5 🐞
 * (S5 does not read the page's script errors), A11 ❓ (S6's second visitor
 * sends plain "en", footnote s). A6 is an app race between two French
 * form-language installs at once (ci-triage "Two contexts adding French at
 * the same moment"): a 500 on the "Forms"/"Submissions" tick or on the
 * French seed here is that race, not this suite's defect. The spec's
 * Coverage section records everything else left out.
 *
 * Seeding (footnote s): every scenario runs on its own scratch journal from
 * `POST scenarios/context` (`context.supportedLocales` for "UI", the
 * primary language alone under "Forms" and "Submissions" by default,
 * `sidebar: ['languagetoggleblockplugin']` for the block) with throwaway
 * accounts (`users[]`, the username twice as password, `<username>@mail.test`);
 * scenario 9 reads `publicknowledge` as seeded, read-only. Every signed-in
 * actor is opened through `asUser`; a visitor is a browser context with an
 * empty storage state (patterns.md parallel lesson 8) whose language is its
 * own: the test browser sends "en-US" (footnote s), a visitor who must ask
 * for another sends it as `Accept-Language` and `locale`. No site setting
 * changes here, so the suite runs in the parallel project.
 *
 * S5 and S7 run one after the other (a serial describe): each ticks French
 * as a form or submission language, which installs the French default email
 * data, and two such installs at once answer 500 (register A6).
 */
const {test: base, expect} = require('../support/fixtures.js');
const {StartSubmissionPage} = require('../pages/SubmissionWizardPage.js');
const {LoginPage} = require('../../../../shared/playwright/pages/LoginPage.js');
const {SettingsPages} = require('../../../../shared/playwright/pages/ContextIdentityPages.js');
const {
    JournalLanguagesTab,
    LanguageBlock,
    LanguageMenu,
    noticeDuring,
} = require('../../../../shared/playwright/pages/LanguagesPages.js');

const SEEDED = 'publicknowledge';
const SAVED = 'Locale settings saved.';
const SUBMISSION_SAVED = 'Submission locales updated.';
const REFUSED = 'The language setting could not be saved. All options need to be enabled.';
const LEAVE = 'The data on this form has changed. Do you wish to continue without saving?';
const NONE_SELECTED = 'At least one locale needs to be selected.';
const REQUIRED = 'This field is required.';
const CHANGE_LANGUAGE = 'Change Language';
const CHANGE_LANGUAGE_FR = 'Changer la langue';
const EDIT_PROFILE = 'Edit Profile';
const ABOUT_EN = 'About the Journal';
const ABOUT_FR = 'À propos de cette revue';
const PRIVACY_FR_HEADING = 'Déclaration de confidentialité';
/** The opening words of the application's default privacy statements (locale/{en,fr_CA}/default.po). */
const PRIVACY_EN_TEXT = 'The names and email addresses entered in this journal site will be used exclusively';
const PRIVACY_FR_TEXT = 'Les noms et courriels saisis dans le site de cette revue seront utilisés';
const OUR_POLICY = 'Notre politique.';
const HALF_DONE = '1/2 languages completed';

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u57s${scenario}ojw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

/** A throwaway account for `createContext`'s `users[]`. */
function person(username, givenName, familyName, roles) {
    return {username, givenName, familyName, roles};
}

/** The roster password rule for throwaway accounts. */
const password = (username) => `${username}${username}`;

/** A signed-in page for an actor (a fresh `asUser` context). */
async function signedIn(asUser, username) {
    return (await asUser(username)).newPage();
}

/** Escape a string for a RegExp. */
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** A journal's address with a path after it (no language). */
const journal = (tag, path = '') => `/index.php/${tag}${path}`;

/** A page address that must end the URL: the journal's `path`, optionally after a language. */
function at(tag, {locale = null, path = ''} = {}) {
    const lang = locale ? `/${locale}` : '';
    const tail = path === '' ? '(/index)?/?' : esc(path);
    return new RegExp(`/index\\.php/${esc(tag)}${esc(lang)}${tail}$`);
}

/** The page's `<html lang>`. */
async function pageLang(page) {
    return page.evaluate(() => document.documentElement.getAttribute('lang'));
}

/** A public page's heading (the theme's main `h1`). */
const mainHeading = (page) => page.locator('.pkp_structure_main h1').first();

/** The language buttons of a Vue settings form (U07's SettingsForm). */
const formLanguageButtons = (form) => form.form.locator('.pkpFormLocales button');
const formLanguageButton = (form, label) => formLanguageButtons(form).filter({hasText: new RegExp(`^\\s*${label}\\s*$`)});

/** The lines of the initials menu as `[text, ticked]` pairs, headings as `[text, 'heading']`. */
const menuLines = (items) => items.map((i) => [i.text, i.heading ? 'heading' : i.ticked]);

/** Visitors: browser contexts with no session and a language of their own. */
const test = base.extend({
    newVisitor: async ({browser, baseURL}, use) => {
        const made = [];
        await use(async ({language = null} = {}) => {
            const options = {baseURL, storageState: {cookies: [], origins: []}, reducedMotion: 'reduce'};
            if (language) {
                Object.assign(options, {locale: language, extraHTTPHeaders: {'Accept-Language': language}});
            }
            const context = await browser.newContext(options);
            made.push(context);
            return context.newPage();
        });
        for (const context of made) {
            await context.close().catch(() => {});
        }
    },
});

test.describe('languages and locales', () => {
    test('S4: a second interface language', async ({asUser, ojsApi, newVisitor}, testInfo) => {
        test.slow();
        const tag = makeTag(4, testInfo);
        const manager = `${tag}mg`;
        await ojsApi.createContext({
            tag,
            context: {supportedLocales: ['en']},
            sidebar: ['languagetoggleblockplugin'],
            users: [person(manager, 'Mona', 'Manager', ['manager'])],
        });
        const mp = await signedIn(asUser, manager);
        const vp = await newVisitor();
        const block = new LanguageBlock(vp);
        const tab = new JournalLanguagesTab(mp, tag);
        const menu = new LanguageMenu(mp);

        // One interface language: no block, no language in the address, a
        // French address forwards to the bare one, no "Change Language"
        // (Rules 17d, 19, 20).
        await vp.goto(journal(tag));
        await expect(block.pageHeader).toBeVisible();
        await expect(vp).toHaveURL(at(tag));
        await expect(block.block).toHaveCount(0);
        await vp.goto(journal(tag, '/fr_CA/about'));
        await expect(vp).toHaveURL(at(tag, {path: '/about'}));
        await expect(mainHeading(vp)).toHaveText(ABOUT_EN);
        await tab.goto();
        let items = await menu.read();
        expect(items.map((i) => i.text), 'the menu offers "Edit Profile"').toContain(EDIT_PROFILE);
        expect(items.filter((i) => i.heading).map((i) => i.text)).not.toContain(CHANGE_LANGUAGE);

        // French ticked under "UI" (Rules 7, 9).
        const ui = await noticeDuring(mp, SAVED, () => tab.pressWebsite('fr_CA', 'uiLocale'));
        expect(ui.response.status()).toBe(200);
        expect(ui.alerts).toEqual([]);
        await expect(tab.website.cell('fr_CA', 'uiLocale')).toBeChecked();

        // The visitor's pages: the home page forwards to "en", the block
        // lists both languages (Rules 17a, 19) — the positive control of the
        // block's absence above, read the same way.
        await vp.goto(journal(tag));
        await expect(vp).toHaveURL(at(tag, {locale: 'en'}));
        await expect(block.heading).toHaveText('Language');
        expect(await block.linkNames()).toEqual(['English', 'français']);

        // No French texts yet: French headings, the English statement (Rules 8a, 21).
        await vp.goto(journal(tag, '/en/about/privacy'));
        await expect(vp).toHaveURL(at(tag, {locale: 'en', path: '/about/privacy'}));
        await vp.goto(journal(tag, '/fr_CA/about/privacy'));
        await expect(mainHeading(vp)).toHaveText(PRIVACY_FR_HEADING);
        expect(await pageLang(vp)).toMatch(/^fr/);
        await expect(vp.locator('.pkp_structure_main')).toContainText(PRIVACY_EN_TEXT);
        await expect(vp.locator('.pkp_structure_main')).not.toContainText(PRIVACY_FR_TEXT);

        // "Change Language" on the reloaded page, "Setup" and its side tab
        // "Languages" pressed, the address ending "#languages" (Fields;
        // Rules 17, 20, 20a).
        await tab.goto();
        await tab.pressLanguagesSideTab();
        await expect(mp).toHaveURL(new RegExp(`/index\\.php/${tag}/en/management/settings/website#languages$`));
        items = await menu.read();
        expect(menuLines(items).slice(0, 3)).toEqual([
            [CHANGE_LANGUAGE, 'heading'],
            ['English', true],
            ['français', false],
        ]);

        // Chosen on a Settings side tab: Website reopens in French on its
        // first tab, "Appearance" › "Theme" (Fields; Rules 20, 20a).
        await menu.choose('français', 'fr_CA');
        await expect(mp).toHaveURL(new RegExp(`/index\\.php/${tag}/fr_CA/management/settings/website`));
        expect(await pageLang(mp)).toMatch(/^fr/);
        await expect(mp.locator('#appearance-button').first()).toHaveAttribute('aria-selected', 'true');
        await expect(mp.locator('#setup-button').first()).toHaveAttribute('aria-selected', 'false');
        await expect(mp.locator('#theme-button:visible').first()).toHaveAttribute('aria-selected', 'true');
        items = await menu.read();
        expect(menuLines(items).slice(0, 3)).toEqual([
            [CHANGE_LANGUAGE_FR, 'heading'],
            ['English', false],
            ['français', true],
        ]);

        // Chosen on the Dashboard: it reopens in English (Rule 20).
        await mp.goto(journal(tag, '/dashboard'));
        await expect(mp).toHaveURL(new RegExp(`/index\\.php/${tag}/fr_CA/dashboard`));
        await expect(menu.initialsButton).toBeVisible();
        expect(await pageLang(mp)).toMatch(/^fr/);
        await menu.choose('English', 'en');
        await expect(mp).toHaveURL(new RegExp(`/index\\.php/${tag}/en/dashboard`));
        expect(await pageLang(mp)).toMatch(/^en/);

        // French unticked: the visitor's French page opens in English with
        // no language in its address and no block; no "Change Language"
        // (Rules 9, 17d).
        await tab.goto();
        const off = await noticeDuring(mp, SAVED, () => tab.pressWebsite('fr_CA', 'uiLocale'));
        expect(off.response.status()).toBe(200);
        await expect(tab.website.cell('fr_CA', 'uiLocale')).not.toBeChecked();
        await vp.goto(journal(tag, '/fr_CA/about/privacy'));
        await expect(vp).toHaveURL(at(tag, {path: '/about/privacy'}));
        await expect(block.pageHeader).toBeVisible();
        expect(await pageLang(vp)).toMatch(/^en/);
        await expect(vp.locator('.pkp_structure_main')).toContainText(PRIVACY_EN_TEXT);
        await expect(block.block).toHaveCount(0);
        await mp.reload();
        items = await menu.read();
        expect(items.map((i) => i.text)).toContain(EDIT_PROFILE);
        expect(items.filter((i) => i.heading).map((i) => i.text)).not.toContain(CHANGE_LANGUAGE);

        // Control: "Forms" stayed unticked; "Privacy Statement" has no
        // "French" button (Rule 10).
        await tab.goto();
        await expect(tab.website.cell('en', 'formLocale')).toBeChecked();
        await expect(tab.website.cell('fr_CA', 'formLocale')).not.toBeChecked();
        const privacy = await tab.pressSetupSideTab('privacy');
        await expect(privacy.control('privacy-privacyStatement-control')).toBeAttached();
        await expect(formLanguageButtons(privacy)).toHaveCount(0);
    });

    test.describe('the French form-language installs, one at a time', () => {
        // Register A6: two French installs of the default email data at once answer 500.
        test.describe.configure({mode: 'serial'});

        test('S5: a second form language', async ({asUser, ojsApi}, testInfo) => {
            test.slow();
            const tag = makeTag(5, testInfo);
            const manager = `${tag}mg`;
            await ojsApi.createContext({
                tag,
                context: {supportedLocales: ['en']},
                users: [person(manager, 'Mona', 'Manager', ['manager'])],
            });
            const mp = await signedIn(asUser, manager);
            const tab = new JournalLanguagesTab(mp, tag);
            const menu = new LanguageMenu(mp);
            const FR_BOX = 'privacy-privacyStatement-control-fr_CA';

            // One form language: no language buttons (Rule 10).
            await tab.settings.goto('website');
            let privacy = await tab.pressSetupSideTab('privacy');
            await expect(privacy.control('privacy-privacyStatement-control-en')).toBeAttached();
            await expect(formLanguageButtons(privacy)).toHaveCount(0);

            // French ticked under "Forms" alone (Rules 7, 10; A5 not read).
            await tab.openTab();
            const forms = await noticeDuring(mp, SAVED, () => tab.pressWebsite('fr_CA', 'formLocale'));
            expect(forms.response.status(), 'the "Forms" tick answers 200 (a 500 here is register A6)').toBe(200);
            await expect(tab.website.cell('fr_CA', 'formLocale')).toBeChecked();
            await expect(tab.website.cell('fr_CA', 'uiLocale')).not.toBeChecked();

            // The other side tabs, without a reload: a "French" button, the
            // French box empty and "1/2 languages completed" under each box
            // (Rule 10b).
            privacy = await tab.pressSetupSideTab('privacy');
            await expect(formLanguageButton(privacy, 'French')).toBeVisible();
            await formLanguageButton(privacy, 'French').click();
            await expect(privacy.richBody(FR_BOX)).toBeVisible();
            await expect.poll(() => privacy.richContent('privacy-privacyStatement-control-en')).toContain(PRIVACY_EN_TEXT);
            expect(await privacy.richContent(FR_BOX)).toBe('');
            await expect(privacy.form.getByText(HALF_DONE, {exact: true})).toHaveCount(2);

            // After a reload: the French default statement (Rules 10a, 10b).
            privacy = await tab.reloadedSetupSideTab('privacy');
            await formLanguageButton(privacy, 'French').click();
            await expect.poll(() => privacy.richContent(FR_BOX)).toContain(PRIVACY_FR_TEXT);

            // A text of the journal's own.
            await privacy.typeRich(FR_BOX, OUR_POLICY);
            await privacy.save();

            // "Forms" unticked and ticked again: the text stays (Rule 10a).
            await tab.openTab();
            const untick = await noticeDuring(mp, SAVED, () => tab.pressWebsite('fr_CA', 'formLocale'));
            expect(untick.response.status()).toBe(200);
            await expect(tab.website.cell('fr_CA', 'formLocale')).not.toBeChecked();
            const retick = await noticeDuring(mp, SAVED, () => tab.pressWebsite('fr_CA', 'formLocale'));
            expect(retick.response.status(), 'the "Forms" tick answers 200 (a 500 here is register A6)').toBe(200);
            await expect(tab.website.cell('fr_CA', 'formLocale')).toBeChecked();
            await tab.settings.goto('website');
            privacy = await tab.pressSetupSideTab('privacy');
            await formLanguageButton(privacy, 'French').click();
            await expect.poll(() => privacy.richContent(FR_BOX)).toBe(`<p>${OUR_POLICY}</p>`);

            // "Submissions" ticked: French (Canada) added, "Metadata" ticked
            // with it, the text still ours (Rules 14, 15a).
            await tab.openTab();
            const win = await tab.openAddRemove();
            await win.box('fr_CA').check();
            const added = await noticeDuring(mp, SUBMISSION_SAVED, () => win.save());
            expect(added.status()).toBe(200);
            await expect(tab.submission.row('fr_CA')).toBeVisible();
            const sub = await noticeDuring(mp, SAVED, () => tab.pressSubmission('fr_CA', 'submissionLocale'));
            expect(sub.response.status(), 'the "Submissions" tick answers 200 (a 500 here is register A6)').toBe(200);
            await expect(tab.submission.cell('fr_CA', 'submissionLocale')).toBeChecked();
            await expect(tab.submission.cell('fr_CA', 'submissionMetadataLocale')).toBeChecked();
            await tab.settings.goto('website');
            privacy = await tab.pressSetupSideTab('privacy');
            await formLanguageButton(privacy, 'French').click();
            await expect.poll(() => privacy.richContent(FR_BOX)).toBe(`<p>${OUR_POLICY}</p>`);

            // Control: no "Change Language", French being a form language only (Rules 9, 10, 20).
            const items = await menu.read();
            expect(items.map((i) => i.text)).toContain(EDIT_PROFILE);
            expect(items.filter((i) => i.heading).map((i) => i.text)).not.toContain(CHANGE_LANGUAGE);
        });

        test('S7: submission languages', async ({asUser, ojsApi}, testInfo) => {
            test.slow();
            const tag = makeTag(7, testInfo);
            const manager = `${tag}mg`;
            const author = `${tag}au`;
            await ojsApi.createContext({
                tag,
                context: {supportedLocales: ['en']},
                users: [person(manager, 'Mona', 'Manager', ['manager']), person(author, 'Ada', 'Author', ['author'])],
            });
            const mp = await signedIn(asUser, manager);
            const tab = new JournalLanguagesTab(mp, tag);

            // The window (Fields; Rule 14).
            await tab.goto();
            expect(await tab.submission.codes()).toEqual(['en']);
            let win = await tab.openAddRemove();
            await expect(win.group).toBeVisible();
            expect(await win.text()).toContain('Available Locales Select submission and metadata languages.');
            await expect(win.boxByLabel('[ fr_CA ] French (Canada)')).toBeVisible();
            expect(await win.boxes.count(), 'one box per language of the world').toBeGreaterThan(500);
            await expect(win.box('en')).toBeChecked();
            await expect(win.box('fr_CA')).not.toBeChecked();
            await expect(win.saveButton).toBeVisible();
            await expect(win.cancelButton).toBeVisible();

            // Left unsaved: the leave question, "OK", the list as it was (Fields).
            await win.box('fr_CA').check();
            await win.box('fr_CA').blur();
            expect(await win.closeAnswering('accept')).toBe(LEAVE);
            await expect(win.form).toBeHidden();
            expect(await tab.submission.codes()).toEqual(['en']);

            // Nothing ticked: refused at the top right, the window stays (Fields).
            win = await tab.openAddRemove();
            await win.box('en').uncheck();
            await noticeDuring(mp, NONE_SELECTED, () => win.pressSave());
            await expect(win.form).toBeVisible();
            await win.box('en').check();

            // French (Canada) added, both boxes unticked (Rule 14).
            await win.box('fr_CA').check();
            const added = await noticeDuring(mp, SUBMISSION_SAVED, () => win.save());
            expect(added.status()).toBe(200);
            expect(await tab.submission.codes()).toEqual(expect.arrayContaining(['en', 'fr_CA']));
            await expect(tab.submission.row('fr_CA')).toContainText('French (Canada)/français (Canada)');
            await expect(tab.submission.cell('fr_CA', 'submissionLocale')).not.toBeChecked();
            await expect(tab.submission.cell('fr_CA', 'submissionMetadataLocale')).not.toBeChecked();

            // "Submissions" ticked: "Metadata" with it (Rule 15a).
            const sub = await noticeDuring(mp, SAVED, () => tab.pressSubmission('fr_CA', 'submissionLocale'));
            expect(sub.response.status(), 'the "Submissions" tick answers 200 (a 500 here is register A6)').toBe(200);
            await expect(tab.submission.cell('fr_CA', 'submissionLocale')).toBeChecked();
            await expect(tab.submission.cell('fr_CA', 'submissionMetadataLocale')).toBeChecked();

            // The Author's submission: the wizard asks the language (Rule 15).
            const ap = await signedIn(asUser, author);
            const start = new StartSubmissionPage(ap, tag);
            await start.goto();
            await expect(start.beginButton()).toBeVisible();
            await expect(start.fieldLegend('Submission Language')).toBeVisible();

            // The columns together (Rules 15a, 15b).
            await tab.pressSubmission('fr_CA', 'submissionMetadataLocale');
            await expect(tab.submission.cell('fr_CA', 'submissionMetadataLocale')).not.toBeChecked();
            await expect(tab.submission.cell('fr_CA', 'submissionLocale')).not.toBeChecked();
            await tab.pressSubmission('fr_CA', 'submissionLocale');
            await expect(tab.submission.cell('fr_CA', 'submissionLocale')).toBeChecked();
            await expect(tab.submission.cell('fr_CA', 'submissionMetadataLocale')).toBeChecked();
            await tab.pressSubmission('fr_CA', 'submissionLocale');
            await expect(tab.submission.cell('fr_CA', 'submissionLocale')).not.toBeChecked();
            await expect(tab.submission.cell('fr_CA', 'submissionMetadataLocale')).toBeChecked();

            // The "Default" row keeps its boxes (Rule 15c).
            for (const column of ['submissionLocale', 'submissionMetadataLocale']) {
                const refused = await tab.pressSubmission('en', column);
                expect(refused.alerts, `the Default's "${column}" untick is refused`).toEqual([REFUSED]);
                await expect(tab.submission.cell('en', column)).toBeChecked();
            }

            // Another "Default": both its boxes ticked (Rule 16).
            await tab.pressSubmission('fr_CA', 'defaultSubmissionLocale');
            await expect(tab.submission.cell('fr_CA', 'defaultSubmissionLocale')).toBeChecked();
            await expect(tab.submission.cell('en', 'defaultSubmissionLocale')).not.toBeChecked();
            await expect(tab.submission.cell('fr_CA', 'submissionLocale')).toBeChecked();
            await expect(tab.submission.cell('fr_CA', 'submissionMetadataLocale')).toBeChecked();

            // The "Default" language removed: English the Default again (Rule 14).
            win = await tab.openAddRemove();
            await win.box('fr_CA').uncheck();
            const removed = await noticeDuring(mp, SUBMISSION_SAVED, () => win.save());
            expect(removed.status()).toBe(200);
            await expect(tab.submission.row('fr_CA')).toHaveCount(0);
            expect(await tab.submission.codes()).toEqual(['en']);
            await expect(tab.submission.cell('en', 'defaultSubmissionLocale')).toBeChecked();
            await expect(tab.submission.cell('en', 'submissionLocale')).toBeChecked();
            await expect(tab.submission.cell('en', 'submissionMetadataLocale')).toBeChecked();

            // Control: the wizard asks no language (Rules 15, 16).
            await start.goto();
            await expect(start.beginButton()).toBeVisible();
            await expect(start.fieldLegend('Submission Language')).toHaveCount(0);
        });
    });

    test('S6: another primary language for the journal', async ({asUser, ojsApi, newVisitor}, testInfo) => {
        test.slow();
        const tag = makeTag(6, testInfo);
        const manager = `${tag}mg`;
        await ojsApi.createContext({
            tag,
            context: {supportedLocales: ['en']},
            users: [person(manager, 'Mona', 'Manager', ['manager'])],
        });
        const mp = await signedIn(asUser, manager);
        const tab = new JournalLanguagesTab(mp, tag);
        try {
            // French made primary: no question, French ticked under "UI" and
            // "Forms" (Rule 11).
            await tab.goto();
            await expect(tab.website.cell('fr_CA', 'uiLocale')).not.toBeChecked();
            await expect(tab.website.cell('fr_CA', 'formLocale')).not.toBeChecked();
            const primary = await noticeDuring(mp, SAVED, () => tab.pressWebsite('fr_CA', 'contextPrimary'));
            expect(primary.response.status()).toBe(200);
            expect(primary.alerts, 'no question').toEqual([]);
            await expect(mp.getByRole('dialog')).toHaveCount(0);
            await expect(tab.website.cell('fr_CA', 'contextPrimary')).toBeChecked();
            await expect(tab.website.cell('fr_CA', 'uiLocale')).toBeChecked();
            await expect(tab.website.cell('fr_CA', 'formLocale')).toBeChecked();

            // The primary language's boxes: refused with the alert, still ticked (Rule 12).
            for (const column of ['uiLocale', 'formLocale']) {
                const refused = await tab.pressWebsite('fr_CA', column);
                expect(refused.alerts, `the "${column}" untick is refused`).toEqual([REFUSED]);
                await expect(tab.website.cell('fr_CA', column)).toBeChecked();
            }
            await tab.goto();
            await expect(tab.website.cell('fr_CA', 'uiLocale')).toBeChecked();
            await expect(tab.website.cell('fr_CA', 'formLocale')).toBeChecked();

            // No default texts: the French "Privacy Statement" box is empty (Rule 11).
            await tab.settings.goto('website');
            const privacy = await tab.pressSetupSideTab('privacy');
            const frBox = 'privacy-privacyStatement-control-fr_CA';
            await expect.poll(async () => ((await privacy.richContent(frBox)) || '').replace(/<[^>]+>|&nbsp;|\s/g, '')).toBe('');
            await formLanguageButton(privacy, 'English').click();
            await expect.poll(() => privacy.richContent('privacy-privacyStatement-control-en')).toContain(PRIVACY_EN_TEXT);

            // Required in French: the Masthead's "Save" refused under the
            // French "Journal title" (Rule 11; U07 Rule 11).
            const masthead = await tab.settings.openJournalTab('Masthead');
            await expect(masthead.control('masthead-name-control-fr_CA')).toHaveValue('');
            await masthead.saveButton.click();
            await expect(masthead.fieldError('masthead-name-control-fr_CA')).toHaveText(REQUIRED);

            // The first visitor, preferring German, reads French (Rules 11, 18).
            const german = await newVisitor({language: 'de'});
            await german.goto(journal(tag));
            await expect(german).toHaveURL(at(tag, {locale: 'fr_CA'}));
            expect(await pageLang(german)).toMatch(/^fr/);

            // Control: the second visitor, asking for "en", reads English (Rule 18; A11).
            const english = await newVisitor({language: 'en'});
            await english.goto(journal(tag));
            await expect(english).toHaveURL(at(tag, {locale: 'en'}));
            expect(await pageLang(english)).toMatch(/^en/);
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

    test('S8: switching with the "Language" block', async ({asUser, ojsApi, newVisitor}, testInfo) => {
        test.slow();
        const tag = makeTag(8, testInfo);
        const manager = `${tag}mg`;
        const reader = `${tag}rd`;
        await ojsApi.createContext({
            tag,
            context: {supportedLocales: ['en', 'fr_CA']},
            sidebar: ['languagetoggleblockplugin'],
            users: [person(manager, 'Mona', 'Manager', ['manager']), person(reader, 'Rita', 'Reader', ['reader'])],
        });
        const vp = await newVisitor();
        const block = new LanguageBlock(vp);

        // The block: both links, nothing marks the one being read; the same
        // on "About the Journal" (Fields; Rules 17a, 19).
        await vp.goto(journal(tag));
        await expect(vp).toHaveURL(at(tag, {locale: 'en'}));
        await expect(block.heading).toHaveText('Language');
        expect(await block.linkNames()).toEqual(['English', 'français']);
        await expect(block.items).toHaveCount(2);
        const looks = await block.entryLooks();
        expect(looks[0], 'the two entries look alike').toBe(looks[1]);
        await vp.goto(journal(tag, '/en/about'));
        await expect(mainHeading(vp)).toHaveText(ABOUT_EN);
        await expect(block.heading).toHaveText('Language');
        expect(await block.linkNames()).toEqual(['English', 'français']);

        // "français" chosen: French from then on (A3: where it lands is not
        // read, only its language); the journal's home, bare, opens in
        // French with the block headed "Langue" (Fields; Rules 17a, 18, 19).
        await Promise.all([vp.waitForURL(/\/fr_CA(\/|$)/, {timeout: 30_000}), block.link('français').click()]);
        await expect(block.pageHeader).toBeVisible();
        expect(await pageLang(vp)).toMatch(/^fr/);
        await vp.goto(journal(tag));
        await expect(vp).toHaveURL(at(tag, {locale: 'fr_CA'}));
        expect(await pageLang(vp)).toMatch(/^fr/);
        await expect(block.heading).toHaveText('Langue');

        // The texts the journal was created with: the French privacy statement (Rule 8a).
        await vp.goto(journal(tag, '/about/privacy'));
        await expect(vp).toHaveURL(at(tag, {locale: 'fr_CA', path: '/about/privacy'}));
        await expect(mainHeading(vp)).toHaveText(PRIVACY_FR_HEADING);
        await expect(vp.locator('.pkp_structure_main')).toContainText(PRIVACY_FR_TEXT);

        // Signed in through the page's own Login link: the home page in
        // French, no initials menu; Profile's menu reads "Changer la
        // langue", the tick beside "français" (Fields; Rules 18, 20).
        await vp.goto(journal(tag));
        const loginLink = vp.locator('#navigationUser a[href*="/login"]').first();
        await expect(loginLink).toBeVisible();
        await loginLink.click();
        await expect(vp).toHaveURL(new RegExp(`/index\\.php/${tag}/fr_CA/login`));
        await new LoginPage(vp).signIn(reader, password(reader));
        await expect(vp).toHaveURL(at(tag, {locale: 'fr_CA'}));
        await expect(block.pageHeader).toBeVisible();
        expect(await pageLang(vp)).toMatch(/^fr/);
        await expect(vp.locator('#navigationUser')).toContainText(reader);
        await expect(vp.locator('[data-cy="app-user-nav"]')).toHaveCount(0);
        await vp.goto(journal(tag, '/user/profile'));
        await expect(vp).toHaveURL(new RegExp(`/index\\.php/${tag}/fr_CA/user/profile`));
        const readerMenu = new LanguageMenu(vp);
        const items = await readerMenu.read();
        expect(menuLines(items).slice(0, 3)).toEqual([
            [CHANGE_LANGUAGE_FR, 'heading'],
            ['English', false],
            ['français', true],
        ]);

        // Signed out: the journal's home still in French (Rule 18).
        const signOut = vp.locator('a[href*="/login/signOut"]').first();
        await readerMenu.openUserMenu();
        await expect(signOut).toBeVisible();
        await signOut.click();
        await vp.waitForURL((url) => !url.pathname.includes('/user/profile'), {timeout: 30_000});
        await vp.goto(journal(tag));
        await expect(vp).toHaveURL(at(tag, {locale: 'fr_CA'}));
        expect(await pageLang(vp)).toMatch(/^fr/);
        await expect(vp.locator('#navigationUser')).not.toContainText(reader);

        // Control: the Journal Manager's own browser reads English, and
        // "Privacy Statement" has no "French" button (Rules 8a, 18).
        const mp = await signedIn(asUser, manager);
        const settings = new SettingsPages(mp, tag);
        const privacy = await settings.openWebsiteSetupTab('privacy');
        await expect(mp).toHaveURL(new RegExp(`/index\\.php/${tag}/en/management/settings/website`));
        expect(await pageLang(mp)).toMatch(/^en/);
        await expect(privacy.control('privacy-privacyStatement-control-en')).toBeAttached();
        await expect(formLanguageButtons(privacy)).toHaveCount(0);
    });

    test('S9: addresses with a language', async ({newVisitor}) => {
        const vp = await newVisitor();
        const block = new LanguageBlock(vp);

        // No language in the address: forwarded to "en", no block (Rule 17a;
        // Settings bullet 1).
        await vp.goto(journal(SEEDED, '/about'));
        await expect(vp).toHaveURL(at(SEEDED, {locale: 'en', path: '/about'}));
        await expect(mainHeading(vp)).toHaveText(ABOUT_EN);
        expect(await pageLang(vp)).toMatch(/^en/);
        await expect(block.block).toHaveCount(0);

        // French in the address switches the visit (Rules 17b, 18).
        await vp.goto(journal(SEEDED, '/fr_CA/about'));
        await expect(mainHeading(vp)).toHaveText(ABOUT_FR);
        expect(await pageLang(vp)).toMatch(/^fr/);
        await vp.goto(journal(SEEDED, '/about'));
        await expect(vp).toHaveURL(at(SEEDED, {locale: 'fr_CA', path: '/about'}));
        await expect(mainHeading(vp)).toHaveText(ABOUT_FR);

        // A language the journal does not offer (Rule 17c).
        await vp.goto(journal(SEEDED, '/de/about'));
        await expect(vp).toHaveURL(at(SEEDED, {locale: 'fr_CA', path: '/about'}));

        // No language code: "404 Not Found" (Rule 17c).
        await vp.goto(journal(SEEDED, '/xx/about'));
        await expect(vp.getByRole('heading', {level: 1})).toHaveText('404 Not Found');

        // Control: "en" in the address reads English over the remembered French (Rule 18).
        await vp.goto(journal(SEEDED, '/en/about'));
        await expect(vp).toHaveURL(at(SEEDED, {locale: 'en', path: '/about'}));
        await expect(mainHeading(vp)).toHaveText(ABOUT_EN);
        expect(await pageLang(vp)).toMatch(/^en/);
    });
});
