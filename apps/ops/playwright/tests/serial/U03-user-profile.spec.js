// @ts-check
/**
 * @file playwright/tests/serial/U03-user-profile.spec.js
 *
 * User profile — OPS suite, serial part: scenario 13 (common), the one
 * scenario that changes a site-wide setting. Scenarios 1–12 are in
 * tests/U03-user-profile.spec.js.
 * Spec: docs/specs/U03-user-profile.md
 *
 * Serial project (PRINCIPLES A7, A9): the Site Administrator ticks
 * Administration › Site Settings › Site Setup › Security, "Check passwords
 * against compromised password databases", a setting every worker, fleet
 * page and scratch server shares. The test puts the box back unticked
 * whatever the outcome: the scenario's own control unticks it on the
 * screen, and a `finally` sends the site's own save with the install's
 * security values (`putSite`, `SITE_INSTALL.security`) whenever the box may
 * still be ticked. The serial U60 suite ticks the same box (its "A leaked
 * password, with the check ticked" block, `@solo`); both run in the serial
 * chain, one at a time.
 *
 * The ticked check asks Have I Been Pwned over the network: the installs
 * carry no local list (seed-facts; spec footnote s, note g), so this test
 * needs the network, which the VM and CI have. `qwerty123456` is the leaked
 * password the fleets refuse; its mismatching repeat is `qwerty654321`.
 *
 * Not asserted here, by register ID: A7, A11 (the spec's Coverage section
 * records the rest); the control's successful save leaves the boxes filled
 * (A11), which is not read.
 *
 * Seeding (footnote s): a scratch preprint server from `POST
 * scenarios/context` with a throwaway Author whose short password is given
 * (the boxes cut input at 32 characters, A7). The Author signs in through
 * the real Login form in a fresh context (a password change may end the
 * session); the Site Administrator `admin` is opened through `asUser`.
 */
const {test, expect} = require('../../support/fixtures.js');
const {LoginPage} = require('../../../../../shared/playwright/pages/LoginPage.js');
const {ProfilePage, SAVED_MESSAGE} = require('../../../../../shared/playwright/pages/ProfilePage.js');
const {SiteSettingsPage, SITE_INSTALL, putSite} = require('../../../../../shared/playwright/pages/SiteSettingsPages.js');

const LEAKED = 'This password has appeared in data leaks. Please choose a different, strong password.';
const LEAKED_PASSWORD = 'qwerty123456';
const LEAKED_REPEAT_MISMATCH = 'qwerty654321';
const PASSWORDS_MISMATCH = 'The passwords do not match.';
const ERRORS_HEADING = 'Errors occurred processing this form';

/** Unique per-run tag: single alphanumeric token, feature + scenario + app + worker. */
function makeTag(scenario, testInfo) {
    return `u03${scenario}opsw${testInfo.parallelIndex}${Math.random().toString(36).slice(2, 8)}`;
}

test.describe('user profile (serial)', () => {
    test('S13: a leaked password refused on the Password tab', async ({browser, baseURL, opsApi, asUser}, testInfo) => {
        test.slow();
        const tag = makeTag('s13', testInfo);
        const username = `${tag}au`;
        const current = `pw${tag}`;
        await opsApi.createContext({
            tag,
            users: [{username, givenName: 'Lee', familyName: 'Leaked', roles: ['author'], password: current}],
        });

        // The Author, in a fresh context through the real Login form.
        const authorContext = await browser.newContext({baseURL, storageState: {cookies: [], origins: []}});
        const authorPage = await authorContext.newPage();
        // The Site Administrator, in a second browser.
        const adminPage = await (await asUser('admin')).newPage();
        const site = new SiteSettingsPage(adminPage);
        let ticked = false;
        try {
            await authorPage.goto(`/index.php/${tag}/login`);
            await new LoginPage(authorPage).signIn(username, current);
            const profile = new ProfilePage(authorPage, tag);
            await profile.goto('password');

            // The given: the box ticked on Site Settings › Site Setup ›
            // Security (it starts unticked on the fleets, seed-facts).
            await site.goto();
            let form = await site.security();
            await expect(form.compromisedCheck).not.toBeChecked();
            ticked = true;
            await form.compromisedCheck.check();
            await form.save();
            await expect(form.compromisedCheck).toBeChecked();

            // A leaked password typed twice: the notice with the data-leaks
            // sentence, the same sentence under "New password" in place of
            // the hint, and the three boxes emptied (Rule 10a).
            await profile.fillPasswords({current, next: LEAKED_PASSWORD});
            await profile.save();
            await expect(profile.passwordErrorNotice()).toContainText(ERRORS_HEADING);
            await expect(profile.passwordErrorNotice()).toContainText(LEAKED);
            await expect(profile.newPasswordSubLabel()).toHaveText(LEAKED);
            await expect(profile.currentPassword()).toHaveValue('');
            await expect(profile.newPassword()).toHaveValue('');
            await expect(profile.repeatPassword()).toHaveValue('');

            // The leaked password with a different repeat: "The passwords do
            // not match." in the notice and under "New password", with no
            // sentence about data leaks; the leak check reports only once no
            // other new-password check fails (Rule 10a; the sentence shown
            // just above is the control).
            await profile.fillPasswords({current, next: LEAKED_PASSWORD, repeat: LEAKED_REPEAT_MISMATCH});
            await profile.save();
            await expect(profile.passwordErrorNotice()).toContainText(PASSWORDS_MISMATCH);
            await expect(profile.newPasswordSubLabel()).toHaveText(PASSWORDS_MISMATCH);
            await expect(profile.passwordErrorNotice()).not.toContainText(LEAKED);
            await expect(profile.form('password')).not.toContainText(LEAKED);

            // Control: the Site Administrator unticks the box on the same
            // screen and saves; the leaked password typed twice now goes
            // through (Settings, "Site password policy").
            await site.goto();
            form = await site.security();
            await expect(form.compromisedCheck).toBeChecked();
            await form.compromisedCheck.uncheck();
            await form.save();
            await expect(form.compromisedCheck).not.toBeChecked();
            ticked = false;
            await profile.fillPasswords({current, next: LEAKED_PASSWORD});
            await profile.save();
            await expect(profile.toast).toContainText(SAVED_MESSAGE);
            await expect(profile.form('password')).not.toContainText(LEAKED);
        } finally {
            if (ticked) {
                await putSite(adminPage, SITE_INSTALL.security);
            }
            await authorContext.close();
        }
    });
});
