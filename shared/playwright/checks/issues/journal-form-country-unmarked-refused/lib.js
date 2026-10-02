// Helpers for walk.js (U59 A1, U07 A11). Requiring this file runs nothing.
const {sql} = require('../../../probe');

const T = 30_000;
const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** Per-app screen words. */
const WORDS = {
    ojs: {noun: 'Journal', hosted: 'Hosted Journals', table: 'Journals', create: 'Create Journal'},
    omp: {noun: 'Press', hosted: 'Hosted Presses', table: 'Presses', create: 'Create Press'},
    ops: {noun: 'Server', hosted: 'Hosted Servers', table: 'Servers', create: 'Create Server'},
};

/**
 * Whether each control's field carries the form's Required mark (the red
 * "*", `.pkpFormFieldLabel__required`): `{label: true|false|null}`, null when
 * the control is not on the form.
 *
 * @param {import('@playwright/test').Locator} form
 * @param {Record<string, string>} controls label → CSS selector of a control in the field
 */
async function requiredMarks(form, controls) {
    const out = {};
    for (const [label, selector] of Object.entries(controls)) {
        const control = form.locator(selector).first();
        if (!(await control.count())) {
            out[label] = null;
            continue;
        }
        out[label] = await control.evaluate((el) => {
            const field = el.closest('.pkpFormField') || el.closest('fieldset');
            return !!(field && field.querySelector('.pkpFormFieldLabel__required'));
        });
    }
    return out;
}

/**
 * Press a form's "Save" and return what followed: the contexts saves the
 * browser sent and their statuses, the error line and every field's reason.
 * Never throws: a save the browser itself refuses sends nothing.
 *
 * @param {import('@playwright/test').Page} page
 * @param {import('@playwright/test').Locator} form
 */
async function saveAndRead(page, form) {
    const sent = [];
    const onResponse = (r) => {
        if (r.request().method() === 'POST' && /\/api\/v1\/contexts(\/\d+)?(\?|$)/.test(r.url())) {
            const q = r.request();
            const body = q.postData() || '';
            const m = /(?:^|&)country=([^&]*)/.exec(body);
            sent.push({
                status: r.status(),
                url: r.url().replace(/^https?:\/\/[^/]+/, ''),
                method: q.method(),
                override: q.headers()['x-http-method-override'] || null,
                contentType: q.headers()['content-type'] || null,
                country: m ? decodeURIComponent(m[1]) : /"country"/.test(body) ? body.match(/"country":(null|"[^"]*")/)?.[0] : '(absent)',
            });
        }
    };
    page.on('response', onResponse);
    try {
        await form.getByRole('button', {name: 'Save', exact: true}).click();
        // A refusal draws its reasons; an accepted save shows "Saved" or leaves the page.
        await Promise.race([
            form.locator('.pkpFieldError').first().waitFor({state: 'visible', timeout: T}),
            form.locator('[role="status"]', {hasText: 'Saved'}).waitFor({state: 'visible', timeout: T}),
            page.waitForURL(/\/admin\/wizard\/\d+/, {timeout: T, waitUntil: 'commit'}),
        ]).catch(() => {});
        await page.waitForTimeout(300);
    } finally {
        page.off('response', onResponse);
    }
    const alive = (await form.count()) > 0;
    return {
        sent,
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        errorLine: alive ? flat(await form.locator('.pkpFormErrors').innerText().catch(() => null)) : null,
        fieldErrors: alive
            ? await form.locator('.pkpFieldError').evaluateAll((els) =>
                  Object.fromEntries(els.map((e) => [e.id, (e.textContent || '').replace(/\s+/g, ' ').trim()]))
              )
            : null,
        saved: alive ? await form.locator('[role="status"]', {hasText: 'Saved'}).isVisible().catch(() => false) : null,
    };
}

/** The context's stored country and "enabled" read from the fleet's database ('' when no row). */
function stored(app, path) {
    const {table, id, settings} = app.contextTables;
    const out = sql(
        app,
        `SELECT c.enabled, (SELECT s.setting_value FROM ${settings} s WHERE s.${id} = c.${id} AND s.setting_name = 'country') FROM ${table} c WHERE c.path = '${path}'`
    );
    const rows = out ? out.split('\n') : [];
    const [enabled, country] = (rows[0] || '|').split('|');
    return {exists: rows.length > 0, enabled, country: country || ''};
}

/**
 * The Editing precondition, as a developer takes it: signed in as `admin`
 * on Hosted Journals, the browser console sends the request "Create
 * Journal" sends, without `country` (the admin's session and its CSRF
 * token). Returns the answer's status and the new journal's id.
 *
 * @param {import('@playwright/test').Page} page on Hosted Journals, signed in as admin
 * @param {string} name
 * @param {string} path
 */
async function createWithoutCountry(page, name, path) {
    return page.evaluate(
        async ({name, path}) => {
            const r = await fetch('/index.php/index/api/v1/contexts', {
                method: 'POST',
                headers: {'Content-Type': 'application/json', 'X-Csrf-Token': pkp.currentUser.csrfToken},
                body: JSON.stringify({
                    name: {en: name},
                    acronym: {en: 'U59A'},
                    contactName: 'u59a Contact',
                    contactEmail: 'u59a@mailinator.com',
                    urlPath: path,
                    primaryLocale: 'en',
                    supportedLocales: ['en'],
                    enabled: true,
                }),
            });
            const body = await r.json().catch(() => null);
            return {status: r.status, id: body && body.id, country: body ? body.country ?? null : null, errors: r.ok ? null : body};
        },
        {name, path}
    );
}

module.exports = {T, flat, WORDS, requiredMarks, saveAndRead, stored, createWithoutCountry};
