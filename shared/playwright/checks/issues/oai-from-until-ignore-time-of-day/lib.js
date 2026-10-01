// Helpers of walk.js (issue reports docs/issues/U19-A2-oai-from-until-ignore-time-of-day.md and
// docs/issues/U19-A3-oai-impossible-date-accepted.md). Requiring this file runs nothing.
const {screen, shot} = require('../../../probe');
const {oai} = require('../oai-own-address-loses-deleted-records/lib');

const flat = (s, n = 300) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** A datestamp "YYYY-MM-DDThh:mm:ssZ" moved by `seconds`. */
const shift = (stamp, seconds) => new Date(Date.parse(stamp) + seconds * 1000).toISOString().replace(/\.\d+Z$/, 'Z');
/** The day "YYYY-MM-DD" of a datestamp, moved by `days`. */
const dayOf = (stamp, days = 0) => new Date(Date.parse(stamp) + days * 86_400_000).toISOString().slice(0, 10);

/**
 * One OAI address opened in the browser (when `page` is given: the status and what the page
 * shows) and read as a harvester reads it (the error or the record headers).
 */
async function ask(page, app, name, ctx, params) {
    const out = {step: name, ...(await oai(app, ctx, params))};
    out.count = out.headers.length;
    out.deleted = out.headers.filter((h) => h.startsWith('DELETED ')).length;
    if (page) {
        const r = await page.goto(app.url(out.address), {waitUntil: 'load'}).catch((e) => ({error: e.message}));
        out.pageStatus = r && r.status ? r.status() : null;
        const s = await screen(page).catch(() => null);
        out.shown = s ? flat(s.text.main || (await page.locator('body').innerText().catch(() => '')), 400) : null;
        await shot(page, name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()).catch(() => {});
    }
    return out;
}

/** The line a walk prints per address. */
const line = (app, r) =>
    `[fact] ${app.name} ${r.step.padEnd(34)} ${r.status}${r.pageStatus != null ? `/${r.pageStatus}` : ''} records ${r.count}` +
    `${r.deleted ? ` (deleted ${r.deleted})` : ''}${r.error ? ` error "${r.error}"` : ''} | ${r.address.replace(/^.*\?/, '')}`;

module.exports = {flat, shift, dayOf, ask, line};
