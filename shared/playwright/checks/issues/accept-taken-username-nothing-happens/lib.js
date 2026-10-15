// Helpers of walk.js here (issue report docs/issues/U06-A13-accept-taken-username-nothing-happens.md).
// Requiring this file runs nothing. The manager's "Invite to a role" send, the email's accept link
// and the wizard's first step come from the U06 A4 walk's helpers; these take the newcomer's own
// steps of the accept wizard and read what its page shows after each press.
const {idle} = require('../../../probe');
const A4 = require('../newcomer-not-signed-in-after-accepting/lib.js');

const T = 30_000;

/** The newcomers the steps invite (names tagged h15j) and the username both choose. */
const ADA = {email: 'ada.h15j@mailinator.com', givenName: 'Ada', familyName: 'Lark', password: 'adah15jadah15j'};
const BEN = {email: 'ben.h15j@mailinator.com', givenName: 'Ben', familyName: 'Lark', password: 'larkh15jlarkh15j'};
const SHARED_USERNAME = 'larkh15j';
const BEN_SECOND_USERNAME = 'benlarkh15j';
/** The neighbour's newcomer: a free username, accepted alone. */
const CY = {email: 'cy.h15j@mailinator.com', givenName: 'Cy', familyName: 'Lark', username: 'cylarkh15j', password: 'cylarkh15jcylarkh15j'};

const flat = (s, n = 400) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const acceptButton = (page) => page.getByRole('button', {name: /^Accept And Continue to/});
const saveAndContinue = (page) => page.getByRole('button', {name: 'Save and continue', exact: true});

/** "Create … account" (username, password, privacy consent) and "Enter details" (Canada), to the review step. */
async function toReview(page, {username, password}) {
    const met = [];
    await page.getByLabel(/^Username/).fill(username);
    await page.getByLabel(/^Password/).fill(password);
    await page.getByRole('checkbox').first().check();
    await saveAndContinue(page).click();
    await page.getByRole('heading', {name: /Enter details/}).waitFor({timeout: T});
    await idle(page);
    met.push(await A4.stepHeading(page));
    await page.getByLabel(/^Country/).first().selectOption({label: 'Canada'});
    await saveAndContinue(page).click();
    await acceptButton(page).waitFor({timeout: T});
    await idle(page);
    met.push(await A4.stepHeading(page));
    return met;
}

/** The finalize answers the page receives, collected from now on; `stop()` returns them. */
function finalizeTrail(page) {
    const answers = [];
    const on = async (r) => {
        if (!/\/invitations\/\d+\/key\/[^/]+\/finalize/.test(r.url())) return;
        let body = null;
        try {
            body = flat(await r.text(), 600);
        } catch {
            body = null;
        }
        answers.push({status: r.status(), body});
    };
    page.on('response', on);
    return {
        answers,
        stop: () => {
            page.off('response', on);
            return answers.slice();
        },
    };
}

/** What the accept page shows now: step, notices, field errors, dialogs, the buttons, the Username box. */
async function pageState(page) {
    const main = page.locator('main');
    const username = page.getByLabel(/^Username/);
    const usernameVisible = await username.isVisible().catch(() => false);
    return {
        step: await A4.stepHeading(page),
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        notices: await main
            .locator('[role="alert"], [role="status"], .pkpNotification')
            .evaluateAll((l) => l.map((n) => n.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)),
        fieldErrors: await main
            .locator('.pkpFormFieldError, .pkpFormField__error, [id$="-error"], .text-negative')
            .evaluateAll((l) => l.filter((n) => !n.closest('button') && n.offsetParent !== null).map((n) => n.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean)),
        dialogs: (await page.getByRole('dialog').allInnerTexts().catch(() => [])).map((t) => flat(t, 300)),
        acceptButtonVisible: await acceptButton(page).isVisible().catch(() => false),
        buttons: (await main.getByRole('button').allInnerTexts().catch(() => [])).map((t) => flat(t, 60)).filter(Boolean),
        usernameBox: usernameVisible ? await username.inputValue().catch(() => null) : null,
        rawKeys: [...new Set(((await main.innerText().catch(() => '')) || '').match(/##[A-Za-z0-9_.]+##/g) || [])],
    };
}

/** Press "Accept And Continue to …" when it is there; wait for the answer and the page to settle. */
async function pressAccept(page) {
    const trail = finalizeTrail(page);
    const label = await acceptButton(page).innerText().catch(() => null);
    if (!label) return {pressed: false, finalize: trail.stop(), state: await pageState(page)};
    await acceptButton(page).click();
    await page.waitForResponse((r) => /\/finalize/.test(r.url()), {timeout: T}).catch(() => null);
    await idle(page);
    await page.waitForTimeout(1500);
    const state = await pageState(page);
    await page.waitForTimeout(3500);
    const after5s = await pageState(page);
    return {pressed: true, label: flat(label, 80), finalize: trail.stop(), state, after5s};
}

/** Press "Back" until the Username box shows (at most `max` presses); returns the presses taken. */
async function backToUsername(page, max = 3) {
    let presses = 0;
    const back = page.locator('main').getByRole('button', {name: 'Back', exact: true}).last();
    while (presses < max && !(await page.getByLabel(/^Username/).isVisible().catch(() => false))) {
        if (!(await back.isVisible().catch(() => false))) break;
        await back.click();
        await idle(page);
        presses++;
    }
    return presses;
}

module.exports = {ADA, BEN, CY, SHARED_USERNAME, BEN_SECOND_USERNAME, flat, acceptButton, saveAndContinue, toReview, pageState, pressAccept, backToUsername};
