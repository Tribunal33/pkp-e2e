// Helpers of walk.js (issue report docs/issues/U69-A15-omp-french-book-page-raw-keys.md,
// joined by U16 A15 and U68 A8). Requiring this file runs nothing. Every helper
// presses what a person presses or opens an address.
const {idle, rawKeys} = require('../../../probe');
const B = require('../custom-block-delete-fails-postgresql/lib');

const T = 30_000;
const flat = (s) => (s == null ? null : String(s).replace(/\s+/g, ' ').trim());

/**
 * Settings › Website › "Appearance" › "Setup": tick "Browse Block" under
 * "Sidebar" and the two home-page boxes ("Featured Books", "New Releases"),
 * leaving a box already ticked as it is; "Save". Returns what was ticked and
 * whether "Saved" showed.
 */
async function setUpHome(page, app) {
    const boxes = await B.openSidebarList(app, page, app.contextPath);
    const browse = boxes.find((b) => /Browse Block/.test(b.label));
    if (!browse) throw new Error(`no "Browse Block" under "Sidebar": ${JSON.stringify(boxes.map((b) => b.label))}`);
    const form = page.locator('form').filter({has: page.locator('input[name="sidebar"]')}).first();
    const ticked = [];
    const tick = async (locator, label) => {
        if (!(await locator.isChecked())) {
            await locator.check();
            ticked.push(label);
        }
    };
    await tick(form.locator(`input[name="sidebar"][value="${browse.value}"]`), 'Browse Block');
    await tick(form.locator('input[name="displayFeaturedBooks"]').first(), 'Display featured books on the home page');
    await tick(form.locator('input[name="displayNewReleases"]').first(), 'Display new releases on the home page');
    if (!ticked.length) return {ticked, saved: null};
    await form.getByRole('button', {name: 'Save', exact: true}).click();
    const saved = await page.locator('[role="status"]:has-text("Saved")').first().waitFor({timeout: T})
        .then(() => true).catch(() => false);
    return {ticked, saved};
}

/**
 * Content › "Catalog" (`manageCatalog`): press the book's "Featured" and "New
 * release" boxes when they are empty. Returns each box's name after the press
 * and the answers of the saves.
 */
async function featureBook(page, app, title) {
    await page.goto(app.url(`/index.php/${app.contextPath}/en/manageCatalog`));
    await idle(page);
    const row = page.locator('.listPanel__item--catalog').filter({hasText: title}).first();
    await row.waitFor({timeout: T});
    const out = {};
    for (const [k, off, any] of [
        ['featured', /monograph is not featured/, /monograph is (not )?featured/],
        ['newRelease', /monograph is not a new release/, /monograph is (not )?a new release/],
    ]) {
        const empty = row.getByRole('button', {name: off});
        if (await empty.count()) {
            const saved = page.waitForResponse((r) => /saveDisplayFlags/.test(r.url()), {timeout: T});
            await empty.click();
            out[`${k}Status`] = (await saved).status();
            await idle(page);
        }
        const box = row.getByRole('button', {name: any});
        out[k] = await box.evaluate((el) => el.getAttribute('aria-label') || el.innerText).catch(() => null);
    }
    return out;
}

/** The frontend page as a reader reads it: heading, count, list headings, the Browse block, raw codes. */
async function readPublic(page) {
    await idle(page);
    const text = (sel) => page.locator(sel).evaluateAll((els) => els
        .filter((e) => e.offsetWidth || e.offsetHeight || e.getClientRects().length)
        .map((e) => e.innerText.replace(/\s+/g, ' ').trim()).filter(Boolean));
    return {
        url: page.url().replace(/^https?:\/\/[^/]+/, ''),
        title: await page.title(),
        h1: await text('.pkp_structure_main h1'),
        trail: await text('.cmp_breadcrumbs'),
        count: await text('.monograph_count'),
        headings: await text('.pkp_structure_main h2'),
        paragraphs: (await text('.pkp_structure_main p')).slice(0, 6),
        nav: await text('#navigationPrimary > li > a'),
        block: await text('.pkp_block.block_browse'),
        blockHeading: await text('.pkp_block.block_browse .title'),
        rawKeys: await rawKeys(page),
    };
}

/** The Browse block's links (text and address). */
async function blockLinks(page) {
    return page.locator('.pkp_block.block_browse a').evaluateAll((els) => els.map((a) => ({
        text: a.innerText.replace(/\s+/g, ' ').trim(), href: a.getAttribute('href'),
    })));
}

/**
 * page.goto with one more try after a net:: error: on the test servers the first
 * category page a `php -S` process serves can end it (php-src GH-20469, a PHP
 * engine segfault; ci-triage "A `php -S` worker segfault") on a checkout without
 * pkp/pkp-lib#12915 (`main` before 2026-10-05; the stable lines), and the harness
 * restarts it within seconds. Returns how many tries it took.
 */
async function gotoRetry(page, address) {
    try {
        await page.goto(address);
        return 1;
    } catch (err) {
        if (!/net::ERR/.test(String(err && err.message))) throw err;
        await page.waitForTimeout(4000);
        await page.goto(address);
        return 2;
    }
}

module.exports = {T, flat, setUpHome, featureBook, readPublic, blockLinks, gotoRetry};
