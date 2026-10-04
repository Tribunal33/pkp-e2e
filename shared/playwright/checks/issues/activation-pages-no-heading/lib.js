// Helpers of walk.js (issue report docs/issues/U02-A2-activation-pages-no-heading.md).
// Requiring this file runs nothing.
const {idle} = require('../../../probe');
const {readPaymentPage} = require('../paypal-error-page-no-heading/lib');

const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/**
 * The page as a person sees it: status, tab title, every h1, breadcrumb, the page's text, and the
 * links inside the page's body (outside the header, breadcrumb and footer), text and address.
 */
async function readPage(page, response) {
    const base = await readPaymentPage(page, response);
    const links = await page
        .evaluate(() => {
            const main = document.querySelector('.pkp_structure_main') || document.querySelector('main') || document.body;
            const body = main.querySelector('.page') || main;
            return [...body.querySelectorAll('a')]
                .filter((a) => !a.closest('.cmp_breadcrumbs'))
                .map((a) => ({text: (a.innerText || '').replace(/\s+/g, ' ').trim(), href: a.getAttribute('href')}));
        })
        .catch(() => []);
    const header = await page.locator('.pkp_navigation_user, #navigationUser').first().innerText({timeout: 2000}).catch(() => null);
    return {...base, links: links.map((l) => ({...l, href: l.href && l.href.replace(/^https?:\/\/[^/]+/, '')})), header: flat(header, 200)};
}

/**
 * The newest "Validate Your Account" email to `to` since `since`: subject, sender, and the
 * address of its link (the one that opens /invitation/accept).
 */
async function validationEmail(app, to, since) {
    const m = await app.mail.find({to, since, subject: 'Validate Your Account', timeoutMs: 30_000});
    const full = await app.mail.fullMessage(m.ID);
    const html = full.HTML || '';
    const hrefs = [...html.matchAll(/href=(["'])([^"']+)\1/g)].map((x) => x[2].replace(/&amp;/g, '&'));
    return {
        subject: m.Subject,
        from: m.From && `${m.From.Name} <${m.From.Address}>`,
        link: hrefs.find((h) => /invitation\/accept/.test(h)) || hrefs.find((h) => /activateUser/.test(h)) || null,
    };
}

/** The Login page the browser is on: type the username and its password, press "Login"; where it lands. */
async function loginHere(page, username) {
    await page.locator('input#username').fill(username);
    await page.locator('input#password').fill(username + username);
    await Promise.all([page.waitForLoadState('load'), page.locator('form#login button[type="submit"]').click()]);
    await page.waitForURL((u) => !/\/login\/signIn/.test(u.pathname), {timeout: 30_000}).catch(() => {});
    await idle(page).catch(() => {});
    return {
        signedIn: (await page.locator('form#login').count()) === 0,
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        title: await page.title(),
    };
}

module.exports = {flat, readPage, validationEmail, loginHere};
