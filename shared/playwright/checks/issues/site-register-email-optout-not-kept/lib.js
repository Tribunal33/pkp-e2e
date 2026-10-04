// Helpers of walk.js (issue report docs/issues/U02-A3-site-register-email-optout-not-kept.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {idle} = require('../../../probe');
const R = require('../press-site-register-consent-raw-codes/lib.js');

/** The "Yes, I would like to be notified of new publications and announcements." box. */
function emailConsent(page) {
    return page.locator('form#register input[name="emailConsent"]');
}

/** The journal-level page's own privacy box (null-safe: the caller ticks only when present). */
function contextPageConsent(page) {
    return page.locator('form#register input[name="privacyConsent"]');
}

/**
 * Profile › "Notifications" on a context, read as data: per heading ("Public Announcements", …)
 * each row's title and its two boxes ("Enable these types of notifications." and
 * "Do not send me an email for these types of notifications.").
 */
async function readNotifications(page, app, contextPath) {
    const loc = app.line && /3_[34]/.test(app.line) ? '' : '/en';
    await page.goto(app.url(`/index.php/${contextPath}${loc}/user/profile`));
    await idle(page).catch(() => {});
    await page.locator('#profileTabs a[name="notificationSettings"]').click();
    const form = page.locator('form#notificationSettingsForm');
    await form.waitFor({state: 'visible', timeout: 30_000});
    await idle(page).catch(() => {});
    return form.evaluate((f) => {
        const out = [];
        let cat = null;
        for (const el of f.querySelectorAll('h4, input[type="checkbox"]')) {
            if (el.tagName === 'H4') {
                cat = {heading: el.innerText.trim(), rows: []};
                out.push(cat);
                continue;
            }
            if (!cat) continue;
            const label = (el.closest('label') || f.querySelector(`label[for="${el.id}"]`) || {}).innerText || '';
            const section = el.closest('.section, fieldset');
            const title = section ? ((section.querySelector('label.label, legend, .label') || {}).innerText || '').trim() : '';
            cat.rows.push({id: el.id, title, label: label.trim(), checked: el.checked});
        }
        return out;
    });
}

/** The "Public Announcements" block's "Do not send me an email…" boxes, id → ticked. */
function publicEmailBoxes(categories) {
    const pub = (categories || []).find((c) => /Public Announcements/i.test(c.heading));
    if (!pub) return {heading: null};
    const boxes = {};
    for (const r of pub.rows) if (/^email/.test(r.id)) boxes[r.id] = r.checked;
    return {heading: pub.heading, boxes};
}

module.exports = {...R, emailConsent, contextPageConsent, readNotifications, publicEmailBoxes};
