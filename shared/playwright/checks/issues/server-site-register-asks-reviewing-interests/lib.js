// Helpers of walk.js (issue report docs/issues/U02-OPS1-server-site-register-asks-reviewing-interests.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {idle} = require('../../../probe');
const R = require('../site-register-email-optout-not-kept/lib.js');
const {openRoles, readRoles} = require('../closed-journal-listed-on-roles-tab/lib.js');

/** The site-wide page's "If you requested to be a reviewer…" box (absent on a context's page). */
function siteInterestsBox(page) {
    return page.locator('form#register .reviewer_nocontext_interests input[name="interests"]');
}

/**
 * The Register page as a person reads it: each context's block and its boxes, the site-wide
 * interests prompt and its box, and the context page's own reviewer fieldset.
 */
async function readRegister(page) {
    return page.evaluate(() => {
        const visible = (el) => !!el && el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
        const t = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
        const blocks = [...document.querySelectorAll('form#register li.context')].map((li) => ({
            name: t(li.querySelector('.name')),
            boxes: [...li.querySelectorAll('fieldset.roles label')].map(t),
            reviewerInputs: li.querySelectorAll('input[name^="reviewerGroup"]').length,
        }));
        const nc = document.querySelector('form#register .reviewer_nocontext_interests');
        const fs = document.querySelector('form#register fieldset.reviewer');
        return {
            blocks,
            siteInterests: nc ? {prompt: t(nc.querySelector('.label')), box: !!nc.querySelector('input[name="interests"]'), visible: visible(nc)} : null,
            contextReviewerFieldset: fs ? {text: t(fs), visible: visible(fs)} : null,
            interestsInputs: document.querySelectorAll('form#register input[name="interests"]').length,
            reviewerGroupInputs: document.querySelectorAll('form#register input[name^="reviewerGroup"]').length,
        };
    });
}

/** Profile › "Roles" on a context: the tab's text, and the "Reviewing interests" field with its chips. */
async function readRolesInterests(page, contextPath) {
    await openRoles(page, contextPath);
    const roles = await readRoles(page);
    const interests = await page.evaluate(() => {
        const area = document.querySelector('#userGroups');
        if (!area) return {area: false};
        const field = area.querySelector('#interests');
        const section = field ? field.closest('.section') : null;
        return {
            area: true,
            field: !!field,
            label: section ? (section.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 200) : null,
            chips: [...area.querySelectorAll('.tagit-label')].map((c) => c.innerText.trim()),
            mentionsInterests: /Reviewing interests/i.test(area.innerText),
        };
    });
    return {interests, rolesText: roles.text};
}

/**
 * Settings › "Users & Roles" as a manager (signed in): search the user, open the row's menu,
 * choose "Edit", and read the page it opens for "Reviewing interests" and the given words.
 */
async function readManagerEdit(page, app, search, words = []) {
    const {UsersListPage} = require('../../../pages/UsersManagementPages.js');
    const list = new UsersListPage(page, app.contextPath);
    await list.goto();
    await list.search(search);
    await idle(page).catch(() => {});
    const row = list.row(search);
    const rows = await row.count();
    if (!rows) return {rows};
    await list.chooseAction(row.first(), 'Edit');
    await page.waitForURL(/settings\/user\/\d+/, {timeout: 30_000}).catch(() => {});
    await idle(page).catch(() => {});
    await page.getByText(search).first().waitFor({timeout: 30_000}).catch(() => {});
    const more = page.getByRole('button', {name: 'View more details'});
    const moreShown = (await more.count()) > 0;
    if (moreShown) {
        await more.first().click();
        await idle(page).catch(() => {});
    }
    const text =await page.locator('main').first().innerText().catch(() => '');
    const at = text.search(/Reviewing interests/i);
    return {
        rows,
        landed: R.rel(page.url()),
        moreDetails: moreShown,
        mentionsInterests: at >= 0,
        aroundInterests: at >= 0 ? text.slice(at, at + 120).replace(/\s+/g, ' ') : null,
        words: Object.fromEntries(words.map((w) => [w, text.includes(w)])),
    };
}

module.exports = {...R, siteInterestsBox, readRegister, readRolesInterests, readManagerEdit, openRoles};
