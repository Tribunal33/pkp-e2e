// Helpers of walk.js (issue report docs/issues/U60-A4-site-save-stores-empty-contact-email.md).
// Requiring this file runs nothing. The screens are driven as a person drives them; the one
// direct request is the Site Settings page's own save, sent from the page's console in the
// Site Administrator's session (the report's step 4).
const {idle, sql} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');

const attempt = async (fn) => {
    try {
        return await fn();
    } catch (e) {
        return {error: flat(e.message, 300)};
    }
};

/** Administration › Site Settings › "Site Setup" › the side tab `sub` ("settings", "info"), freshly loaded. */
async function openSiteTab(page, app, sub) {
    await page.goto(app.url('/index.php/index/en/admin/settings'));
    await idle(page);
    await page.locator('#setup-button').first().click().catch(() => {});
    await page.locator(`#${sub}-button`).click({timeout: T});
    await page.locator(`#${sub}`).getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
    await idle(page);
    return true;
}

/** The open side tab's text boxes as a person sees them: each box's name and value, and the errors under them. */
async function readTab(page, sub) {
    const t = page.locator(`#${sub}`);
    return {
        boxes: await t.locator('input[type="text"], input:not([type])').evaluateAll((els) =>
            els.filter((e) => e.offsetParent !== null).map((e) => ({name: e.name || e.id, value: e.value}))
        ),
        errors: (await t.locator('.pkpFormFieldError, .pkpFieldError').allInnerTexts()).map((s) => flat(s, 200)).filter(Boolean),
        footer: flat(await t.locator('.pkpFormPage__footer').first().innerText().catch(() => null), 300),
    };
}

/** Press the side tab's "Save": the request it sent (or none), its answer, "Saved", the tab after. */
async function pressSave(page, sub) {
    const answer = page
        .waitForResponse((r) => /\/api\/v1\/site(\?|$)/.test(r.url()) && ['POST', 'PUT'].includes(r.request().method()), {timeout: 6000})
        .catch(() => null);
    await page.locator(`#${sub}`).getByRole('button', {name: 'Save', exact: true}).click({timeout: T});
    const r = await answer;
    const out = {request: null, status: null};
    if (r) {
        out.request = `${r.request().headers()['x-http-method-override'] || r.request().method()} ${rel(r.url())}`;
        out.status = r.status();
        if (r.status() >= 400) out.answer = flat(await r.text().catch(() => null), 400);
    }
    out.saved = await page
        .locator(`#${sub}`)
        .locator('[role="status"]')
        .filter({hasText: 'Saved'})
        .first()
        .waitFor({timeout: r && r.status() < 400 ? 8000 : 1500})
        .then(() => true, () => false);
    await idle(page);
    await pause(300);
    out.after = await readTab(page, sub);
    return out;
}

/**
 * Step 4: the page's own save, sent from its console in the signed-in session, with `body` as JSON.
 * Returns the address it went to, the status and the answer.
 */
async function consoleSave(page, body) {
    return page.evaluate(async (b) => {
        const base = (window.pkp && pkp.context && pkp.context.apiBaseUrl) || null;
        const url = (base || '/index.php/index/api/v1/') + 'site';
        const r = await fetch(url, {
            method: 'PUT',
            headers: {'Content-Type': 'application/json', 'X-Csrf-Token': pkp.currentUser.csrfToken},
            body: JSON.stringify(b),
        });
        const text = await r.text();
        let answer = text;
        try {
            const j = JSON.parse(text);
            answer = r.status >= 400 ? j : {title: j.title, contactName: j.contactName, contactEmail: j.contactEmail};
        } catch (e) {
            answer = text.slice(0, 400);
        }
        return {apiBaseUrl: base, url: url.replace(/^https?:\/\/[^/]+/, ''), status: r.status, answer};
    }, body);
}

/** What the site stores for its three required settings. */
function stored(app) {
    const rows = sql(
        app,
        "select setting_name || '[' || locale || ']', setting_value from site_settings where setting_name in ('title','contactName','contactEmail') order by 1"
    );
    return Object.fromEntries((Array.isArray(rows) ? rows : String(rows).split('\n')).filter(Boolean).map((l) => l.split('|')));
}

/** Signed out, on the context's Login page: "Forgot your password?", the address, "Reset Password". */
async function requestReset(page, app, email) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/login`));
    await idle(page);
    await page.getByRole('link', {name: 'Forgot your password?'}).click({timeout: T});
    await page.locator('input#email').waitFor({timeout: T});
    await page.locator('input#email').fill(email);
    const answer = page.waitForResponse((r) => /\/login\/requestResetPassword/.test(r.url()), {timeout: T}).catch(() => null);
    await Promise.all([page.waitForLoadState('load').catch(() => {}), page.getByRole('button', {name: 'Reset Password'}).click()]);
    const r = await answer;
    await idle(page).catch(() => {});
    return {
        request: r ? `${r.request().method()} ${rel(r.url())}` : null,
        status: r ? r.status() : null,
        page: flat(await page.locator('body').innerText().catch(() => ''), 500),
    };
}

module.exports = {T, pause, flat, rel, attempt, openSiteTab, readTab, pressSave, consoleSave, stored, requestReset};
