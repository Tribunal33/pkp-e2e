// Helpers of walk.js (U10 A16: a settings upload box shows a warning sign and no message when the
// server refuses the upload). Requiring this file runs nothing.
const {idle} = require('../../../probe');
const B = require('../refused-upload-locks-box/lib');

const {T, sleep, tidy} = B;

/** Settings › Website › "Appearance" › "Setup" on `origin` (a second server of the same install). */
async function openSetup(page, app, origin) {
    const lang = /3_[34]/.test(app.line || '') ? '' : '/en';
    await page.goto(`${origin}/index.php/${app.contextPath}${lang}/management/settings/website`);
    await idle(page);
    await page.locator('[id="appearance-button"]').first().click();
    const side = page.locator('[id="appearance-setup-button"]').first();
    await side.waitFor({timeout: T});
    await side.click();
    await idle(page);
}

/** The "Logo" box of the Setup form (English). */
const logoBox = (page) => B.box(page, 'appearanceSetup', 'pageHeaderLogoImage', 'en');

/**
 * "Upload File" with `file`, then what the box shows once the upload settled: whether a request was
 * sent to temporaryFiles, its answer, the box's error lines (each with its text), the form's foot
 * and its screen-reader error list, and B.boxState's view.
 */
async function uploadAndRead(page, b, file) {
    let sent = null;
    const onReq = (q) => { if (/\/temporaryFiles/.test(q.url()) && q.method() === 'POST') sent = q; };
    page.on('request', onReq);
    const answered = page.waitForResponse((r) => /\/temporaryFiles/.test(r.url()) && r.request().method() === 'POST', {timeout: 60_000});
    answered.catch(() => null);
    await b.button.waitFor({timeout: T});
    const [chooser] = await Promise.all([page.waitForEvent('filechooser', {timeout: T}), b.button.click()]);
    await chooser.setFiles(file);
    const t0 = Date.now();
    let r = null;
    while (Date.now() - t0 < 60_000) {
        r = await Promise.race([answered, sleep(250).then(() => null)]).catch(() => null);
        if (r) break;
        if (!sent && Date.now() - t0 > 4000) break; // refused in the browser: nothing is sent
    }
    page.off('request', onReq);
    await sleep(1500);
    await idle(page);
    const body = r ? tidy(await r.text().catch(() => null)) : null;
    const errorLines = await b.field.locator('.pkpFieldError__message').evaluateAll((els) => els.map((e) => ({
        text: e.innerText.replace(/\s+/g, ' ').trim(),
        hasIcon: !!e.querySelector('svg, .pkpIcon, [class*="icon"]'),
        visible: !!(e.offsetWidth || e.offsetHeight),
    }))).catch(() => []);
    const a11y = await b.form.locator('.pkpFormErrors li').allTextContents().catch(() => []);
    return {
        sent: !!sent,
        status: r ? r.status() : null,
        body: body && body.slice(0, 300),
        errorLines,
        footA11y: a11y.map(tidy),
        state: await B.boxState(page, b),
    };
}

module.exports = {T, sleep, tidy, openSetup, logoBox, uploadAndRead};
