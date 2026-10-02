// Helpers of walk.js (issue report docs/issues/U64-A10-hidden-platform-id-blocks-site-statistics-save.md).
// Requiring this file runs nothing. Every helper presses what a person presses.
const {idle, sql} = require('../../../probe');
const {openSiteStatistics, rel, pause, T} = require('../journal-geographical-data-opt-out-not-kept/lib');

const flat = (s, n = 400) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

const attempt = async (fn) => {
    try {
        return await fn();
    } catch (e) {
        return {error: flat(e.message, 300)};
    }
};

const tab = (page) => page.locator('#statistics');
const platformBox = (page) => tab(page).locator('input[name="isSiteSushiPlatform"]');
const idBox = (page) => tab(page).locator('input[name="sushiPlatformID"]');
const saveButton = (page) => tab(page).getByRole('button', {name: 'Save', exact: true});

/** The open "Statistics" tab as a person sees it: the "Platform" box, the "Platform ID" box, the errors, "Compress Logs". */
async function readTab(page) {
    const t = tab(page);
    const box = idBox(page);
    const boxes = await box.count();
    const field = t.locator('.pkpFormField').filter({has: page.locator('input[name="sushiPlatformID"]')}).first();
    const goTo = await t
        .locator('button, a')
        .filter({hasText: /^\s*Go to /})
        .evaluateAll((els) =>
            els.map((el) => {
                const r = el.getBoundingClientRect();
                return {
                    text: el.textContent.replace(/\s+/g, ' ').trim(),
                    screenReaderOnly: !!el.closest('.-screenReader') || (r.width <= 1 && r.height <= 1),
                };
            })
        );
    return {
        platformLabel: flat(await platformBox(page).evaluate((i) => (i.closest('label') || i.parentElement).innerText).catch(() => null), 120),
        platformTicked: await platformBox(page).isChecked().catch(() => null),
        idBoxes: boxes,
        idBoxVisible: boxes ? await box.first().isVisible() : false,
        idValue: boxes ? await box.first().inputValue() : null,
        idError: boxes ? flat(await field.locator('.pkpFieldError').first().innerText().catch(() => null), 200) : null,
        fieldLabels: (await t.locator('.pkpFormFieldLabel, legend').allInnerTexts()).map((s) => flat(s, 60)),
        footer: flat(await t.locator('.pkpFormPage__footer').first().innerText().catch(() => null), 300),
        goTo,
        saveDisabled: await saveButton(page).isDisabled().catch(() => null),
        compress: flat(
            await t
                .locator('input[name="compressStatsLogs"]:checked')
                .evaluate((i) => (i.closest('label') || i.parentElement).innerText)
                .catch(() => null),
            80
        ),
    };
}

/** Press "Save" on the tab: the request and its answer (the refusal's own words when it refuses), "Saved", the tab right after. */
async function pressSave(page) {
    const answer = page
        .waitForResponse((r) => /\/index\/api\/v1\/site(\?|$)/.test(r.url()) && r.request().method() === 'POST', {timeout: 10_000})
        .catch(() => null);
    await saveButton(page).click({timeout: 10_000});
    const r = await answer;
    const out = {request: null, status: null, sent: null, answer: null};
    if (r) {
        const post = new URLSearchParams(r.request().postData() || '');
        out.request = `${r.request().headers()['x-http-method-override'] || r.request().method()} ${rel(r.url())}`;
        out.status = r.status();
        out.sent = {
            isSiteSushiPlatform: post.get('isSiteSushiPlatform'),
            sushiPlatformID: post.has('sushiPlatformID') ? post.get('sushiPlatformID') : '(not sent)',
            compressStatsLogs: post.get('compressStatsLogs'),
        };
        if (r.status() >= 400) out.answer = flat(await r.text().catch(() => null), 400);
    }
    out.saved = await tab(page)
        .locator('[role="status"]')
        .filter({hasText: 'Saved'})
        .first()
        .waitFor({timeout: r && r.status() < 400 ? 8000 : 1500})
        .then(() => true, () => false);
    await idle(page);
    await pause(300);
    out.after = await readTab(page);
    return out;
}

/** What the site stores for the three settings the steps touch. */
function stored(app) {
    const rows = sql(
        app,
        "select setting_name, setting_value from site_settings where setting_name in ('isSiteSushiPlatform','sushiPlatformID','compressStatsLogs') order by 1"
    );
    return Object.fromEntries((Array.isArray(rows) ? rows : String(rows).split('\n')).filter(Boolean).map((l) => l.split('|')));
}

module.exports = {flat, attempt, tab, platformBox, idBox, saveButton, readTab, pressSave, stored, openSiteStatistics};
