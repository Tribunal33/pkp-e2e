// Helpers for walk.js (U13 OJS3). Requiring this file runs nothing.
const {screen, idle, loc, shot} = require('../../../probe');
const {flat} = require('../publication-facts-panel-never-shown/lib');

/**
 * An article page read for its Publication Facts panel: the page's
 * language, the plugin's `section.pflPlugin` and `<publication-facts-label>`
 * with what its shadow root renders (collapsed, then expanded), the label
 * file the page preloads, every plugin file the browser asked for with its
 * status, and the console lines the plugin's script wrote.
 */
async function readPanel(page, app, pathAfterIndex, label, origin) {
    const files = [];
    const consoleLines = [];
    const onResponse = (res) => {
        if (/\/plugins\/generic\/pflPlugin\//.test(res.url())) files.push({path: res.url().replace(/^https?:\/\/[^/]+/, ''), status: res.status()});
    };
    const onConsole = (msg) => {
        if (/PFL|pfl/.test(msg.text())) consoleLines.push({type: msg.type(), text: flat(msg.text(), 300)});
    };
    page.on('response', onResponse);
    page.on('console', onConsole);
    const address = `/index.php/${app.contextPath}${pathAfterIndex}`;
    const response = await page.goto(`${origin || app.baseURL}${address}`);
    await idle(page);
    await page.waitForTimeout(1500); // the labels arrive by a fetch after DOMContentLoaded
    const name = label.replace(/\W+/g, '-');
    const el = page.locator('publication-facts-label');
    const readShadow = () =>
        el.first().evaluate((node) => {
            const root = node.shadowRoot;
            const body = root && root.querySelector('.publication-facts-label');
            const box = node.getBoundingClientRect();
            return {
                shadowChildren: root ? root.childElementCount : null,
                text: body ? body.innerText : '',
                button: root && root.querySelector('#pfl-buttonText') ? root.querySelector('#pfl-buttonText').innerText : null,
                width: Math.round(box.width),
                height: Math.round(box.height),
            };
        });
    const out = {
        label,
        path: pathAfterIndex,
        status: response ? response.status() : null,
        htmlLang: await page.locator('html').getAttribute('lang'),
        title: flat(await page.locator('h1').first().innerText().catch(() => null), 200),
        pflSection: await page.locator('section.pflPlugin').count(),
        pflElement: await el.count(),
        preload: await page.locator('link[rel="preload"][href*="pflPlugin/pfl/locale/"]').first().getAttribute('href').catch(() => null),
    };
    if (out.preload) out.preload = out.preload.replace(/^https?:\/\/[^/]+/, '');
    if (out.pflElement) {
        out.panel = await readShadow();
        out.panel.text = flat(out.panel.text, 600);
        await loc(page, `${label}: the Publication Facts panel`, el);
        const toggle = page.locator('publication-facts-label #pfl-button-open-facts');
        if (await toggle.count()) {
            await toggle.click();
            await page.waitForTimeout(800);
            out.expanded = flat((await readShadow()).text, 1500);
        }
    }
    await shot(page, name).catch(() => {});
    const s = await screen(page);
    out.sideColumnEnd = flat((s.text.main || s.text.body || '').slice(-400), 400);
    page.off('response', onResponse);
    page.off('console', onConsole);
    out.files = files;
    out.console = consoleLines;
    return out;
}

module.exports = {readPanel};
