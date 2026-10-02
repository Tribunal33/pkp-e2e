// Helpers of walk.js (issue report docs/issues/U64-A4-journal-geographical-data-opt-out-not-kept.md).
// Requiring this file runs nothing. Every helper presses what a person presses.
const fs = require('fs');
const {idle} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const rel = (u) => String(u || '').replace(/^https?:\/\/[^/]+/, '');
const GEO = {
    none: 'Do not collect any geographical data',
    country: "Collect the visitor's country",
    region: "Collect the visitor's country and region",
    city: "Collect the visitor's country, region and city",
};

/** Press a settings page's "Statistics" tab and wait for its form. False when the page has no such tab. */
async function showStatistics(page) {
    const button = page.locator('#statistics-button');
    if (!(await button.count())) return false;
    await button.click();
    await page.locator('#statistics').getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
    await idle(page);
    return true;
}

/** The "Geographical Statistics" radios of the open "Statistics" tab: every option's label, the chosen one's label. */
async function readGeo(page) {
    const radios = await page
        .locator('#statistics input[name="enableGeoUsageStats"]')
        .evaluateAll((rs) => rs.map((r) => ({value: r.value, checked: r.checked, label: (r.closest('label') || r.parentElement).innerText.trim()})));
    const chosen = radios.find((r) => r.checked);
    return {shown: radios.length > 0, options: radios.map((r) => r.label), chosen: chosen ? chosen.label : null};
}

/** Choose a "Geographical Statistics" option on the open tab and press "Save": the request, "Saved", the radios right after. */
async function saveGeo(page, label, urlRe) {
    const panel = page.locator('#statistics');
    await panel.getByLabel(label, {exact: true}).check();
    const answer = page.waitForResponse((r) => urlRe.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
    await panel.getByRole('button', {name: 'Save', exact: true}).click();
    const r = await answer;
    const saved = await panel.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 8000}).then(() => true, () => false);
    await pause(300);
    return {chose: label, request: `${r.request().method()} ${rel(r.url())}`, status: r.status(), saved, after: await readGeo(page)};
}

/** Administration › Site Settings › "Site Setup" › "Statistics", freshly loaded. */
async function openSiteStatistics(page, app) {
    await page.goto(app.url('/index.php/index/en/admin/settings'));
    await idle(page);
    await page.locator('#setup-button').first().click().catch(() => {});
    return showStatistics(page);
}

/** A context's Settings › Distribution › "Statistics", freshly loaded. False when the tab is not there. */
async function openContextStatistics(page, app, contextPath) {
    await page.goto(app.url(`/index.php/${contextPath}/en/management/settings/distribution`));
    await idle(page);
    return showStatistics(page);
}

/**
 * Statistics › "Articles" ("Monographs", "Preprints") › "Download Report": the window's buttons, and, when
 * "Download Geographic" is offered, the name and the header line of the file it gives.
 */
async function geoReport(page, app, contextPath) {
    await page.goto(app.url(`/index.php/${contextPath}/en/stats/publications/publications`));
    await idle(page);
    await page.getByRole('button', {name: 'Download Report', exact: true}).click();
    const win = page.getByRole('dialog').filter({has: page.locator('.pkpStats__reportAction')}).last();
    await win.waitFor({state: 'visible', timeout: T});
    await idle(page);
    const buttons = (await win.locator('.pkpStats__reportAction button').allInnerTexts()).map((s) => s.trim());
    const geo = win.getByRole('button', {name: 'Download Geographic', exact: true});
    const out = {buttons, geographic: (await geo.count()) > 0, file: null, header: null};
    if (out.geographic) {
        const got = page.waitForEvent('download', {timeout: T}).catch(() => null);
        await geo.click();
        const dl = await got;
        if (dl) {
            out.file = dl.suggestedFilename().replace(/\d{6,}/g, '…');
            const p = await dl.path().catch(() => null);
            if (p) out.header = fs.readFileSync(p, 'utf8').replace(/^﻿/, '').split('\n').filter(Boolean).slice(-1)[0];
        }
    }
    return out;
}

/** Record every server error and page script error the page meets. */
function watchFailures(page) {
    const failures = [];
    page.on('response', (r) => r.status() >= 500 && failures.push(`${r.status()} ${rel(r.url())}`));
    page.on('pageerror', (e) => failures.push(`pageerror ${String(e).slice(0, 200)}`));
    return failures;
}

module.exports = {T, pause, rel, GEO, showStatistics, readGeo, saveGeo, openSiteStatistics, openContextStatistics, geoReport, watchFailures};
