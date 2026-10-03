// Helpers of walk.js (U65 OMP2: the press's "Days to First Editorial Decision" information text
// speaks of "your journal"; docs/issues/U65-OMP2-press-days-to-decision-text-your-journal.md).
// Requiring this file runs nothing. The icon readers are ../information-icons-out-of-keyboard-reach/lib.js's.
const {idle} = require('../../../probe');
const {icons} = require('../information-icons-out-of-keyboard-reach/lib');

const T = 60_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Statistics › "Editorial Activity" opened from its address in `locale` (`en`, `fr_CA`), as the
 * signed-in user; waits for the page's tables. Returns the response status and the row names.
 */
async function openEditorial(page, app, locale = 'en') {
    const seg = app.line === 'stable-3_4_0' || app.line === 'stable-3_3_0' ? '' : `/${locale}`;
    await page.goto('about:blank');
    const r = await page.goto(app.url(`/index.php/${app.contextPath}${seg}/stats/editorial/editorial`));
    await idle(page).catch(() => {});
    await page.locator('table').first().waitFor({state: 'visible', timeout: T}).catch(() => {});
    await idle(page).catch(() => {});
    await sleep(800);
    const rows = await page.locator('table tbody tr td:first-child').allInnerTexts().catch(() => []);
    return {status: r ? r.status() : null, rows: rows.map((t) => t.replace(/\s+/g, ' ').trim())};
}

/**
 * Every visible information icon of the page: its screen-reader label and the text that shows when
 * the pointer rests on it, whole (`[{label, text}]`), in page order.
 */
async function readIcons(page) {
    const list = await icons(page);
    const out = [];
    for (let i = 0; i < list.length; i++) {
        const icon = page.locator('.tooltipButton:visible').nth(i);
        await icon.scrollIntoViewIfNeeded().catch(() => {});
        await icon.hover();
        await sleep(500);
        const text = await page.evaluate(() => {
            const p = [...document.querySelectorAll('.v-popper__popper.v-popper--theme-pkp-tooltip')]
                .filter((e) => e.classList.contains('v-popper__popper--shown') && (e.offsetWidth || e.offsetHeight));
            const e = p.pop();
            return e ? (e.innerText || '').replace(/\s+/g, ' ').trim() : null;
        });
        await page.mouse.move(2, 2);
        await sleep(400);
        out.push({label: list[i].label, text});
    }
    return out;
}

module.exports = {openEditorial, readIcons};
