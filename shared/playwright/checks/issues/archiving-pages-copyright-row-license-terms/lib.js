// Helpers of walk.js (issue report docs/issues/U58-OJS1-archiving-pages-copyright-row-license-terms.md).
// Requiring this file runs nothing. Every helper drives the screens a person uses.
const {idle, screen, record, launch} = require('../../../probe');
const {setLicenseTerms} = require('../book-page-license-link-no-address/lib.js');
const {setCopyrightNotice} = require('../copyright-agreed-log-raw-placeholder/lib.js');

const flat = (s) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim());

/** Run a step and record its outcome instead of throwing (a fix may change what the screen offers). */
async function step(fn) {
    try {
        return {ok: true, value: await fn()};
    } catch (e) {
        return {ok: false, error: flat(e.message).slice(0, 400)};
    }
}

/** Settings › Distribution › "Archiving" › "LOCKSS and CLOCKSS": tick both boxes, "Save". */
async function switchOnLockssClockss(page, app) {
    const {ArchivingSettings} = require('../../../pages/ArchivingPages.js');
    const s = new ArchivingSettings(page, app.contextPath);
    await s.open();
    await s.openLockssSideTab();
    await s.box('lockss').setChecked(true);
    await s.box('clockss').setChecked(true);
    const status = await s.save();
    return {status, lockss: await s.box('lockss').isChecked(), clockss: await s.box('clockss').isChecked()};
}

/** One manifest page: its "Metadata" rows, the "Copyright" row (present, value), and whether the notice text shows anywhere. */
async function readManifest(page, app, network, name) {
    const {ManifestPage} = require('../../../pages/ArchivingPages.js');
    const m = new ManifestPage(page, app.contextPath, network);
    const resp = await m.goto();
    await idle(page);
    const rows = await m.rows();
    const row = rows.find((r) => r[0] === 'Copyright');
    const text = flat(await m.root().innerText());
    if (name) record(`${name}-${network}`, await screen(page));
    return {
        status: resp ? resp.status() : null,
        url: page.url(),
        labels: rows.map((r) => r[0]),
        rows,
        copyright: row ? {present: true, value: row[1] || ''} : {present: false},
        noticeOnPage: /u58d Copyright Notice/.test(text),
        licenseOnPage: /u58d License Terms/.test(text),
    };
}

/** The LOCKSS page, then the CLOCKSS page. */
async function readBoth(page, app, name) {
    return {lockss: await readManifest(page, app, 'lockss', name), clockss: await readManifest(page, app, 'clockss', name)};
}

/** The site's LOCKSS and CLOCKSS lists: each list's links. */
async function readSiteLists(page) {
    const {SiteManifestList} = require('../../../pages/ArchivingPages.js');
    const out = {};
    for (const network of ['lockss', 'clockss']) {
        const l = new SiteManifestList(page, network);
        await l.goto();
        await idle(page);
        out[network] = (await l.links().allInnerTexts()).map(flat);
    }
    return out;
}

/** A press or a preprint server: where the journal's LOCKSS address lands (no such page there). */
async function noSurface(app) {
    const {page, close} = await launch(app, {record: false});
    try {
        const r = await page.goto(app.url(`/index.php/${app.contextPath}/gateway/lockss`));
        return {app: app.name, status: r ? r.status() : null, url: page.url()};
    } finally {
        await close();
    }
}

module.exports = {flat, step, switchOnLockssClockss, readManifest, readBoth, readSiteLists, noSurface, setLicenseTerms, setCopyrightNotice};
