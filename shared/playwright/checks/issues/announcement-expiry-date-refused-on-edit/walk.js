// Issue report walk: docs/issues/U12-A3-announcement-expiry-date-refused-on-edit.md
// (spec U12 register A3). Takes the report's Steps through the screens on a
// dataset fleet (PKP's default test dataset, harness.md "Dataset fleets"),
// signed in as the dataset's journal manager `rvaca` on `publicknowledge`.
// The kit builds nothing: announcements are turned on, "Date (Short)" is
// changed and the announcements are added on screen. The "west of the
// install's time zone" steps run first, in a second browser context on New
// York time (the install runs on UTC); the "Date (Short)" steps then run in
// the kit's browser (UTC). Records every screen with screen().
//
// Modes (U12R3_MODE): `walk` (default) takes the Steps; `neighbour` alone
// checks what a fix must leave as it is: the page's install time zone
// (`pkp.context.timeZone`), an announcement without an expiry date opening
// with an empty box and saving, and a date typed in another shape still
// refused. An empty or legacy `time_zone` in config.inc.php cannot be set on
// screen and is not walked. Reset the fleet before each run: the walk adds
// announcements and changes settings.
//
// Run (main, then stable-3_5_0):
//   npm run fleet-prep -- --feature issues --dataset --reset
//   PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/announcement-expiry-date-refused-on-edit/walk.js
//   PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-3_5 --dataset --reset
//   PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-3_5 PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/announcement-expiry-date-refused-on-edit/walk.js
//   U12R3_MODE=neighbour PROBE_RUN=nb PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/announcement-expiry-date-refused-on-edit/walk.js
const {forEachApp, launch, signIn, screen, record, sql} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.U12R3_MODE || 'walk';
const EXPIRY = '2027-03-31';
const WEST = 'America/New_York';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js drives a dataset fleet (fleet-prep --dataset); this fleet is the campaign\'s');
    const prefix = MODE === 'neighbour' ? 'nb' : 'walk';
    const facts = {mode: MODE, app: app.name, context: app.contextPath};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 700)}`); };
    const {page, close} = await launch(app);
    let n = 0;
    const snap = async (p, name) => record(`${prefix}-${String(++n).padStart(2, '0')}-${name}`, await screen(p));
    const step = async (k, fn) => {
        try { const v = await fn(); fact(k, v); return v; } catch (e) { fact(k, {error: L.flat(e.message, 500)}); return null; }
    };
    let ny = null;
    try {
        if (MODE === 'walk') {
            // ---- In a browser west of the install's time zone (default "Date (Short)").
            ny = await page.context().browser().newContext({baseURL: app.baseURL, viewport: {width: 1280, height: 900}, timezoneId: WEST, reducedMotion: 'reduce'});
            const west = await ny.newPage();
            const westFailures = [];
            ny.on('response', (r) => { if (r.status() >= 500) westFailures.push(`${r.status()} ${r.request().method()} ${r.url()}`); });
            west.on('pageerror', (e) => westFailures.push(`pageerror: ${L.flat(e.message, 300)}`));
            facts['west.failures'] = westFailures;
            fact('west.browserZone', await west.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone));
            await signIn(west, 'rvaca');
            await step('west.2-enable', () => L.enableAnnouncements(app, west));
            await step('west.7-open', () => L.openAnnouncementsFromMenu(app, west));
            await step('west.7-add', () => L.addAnnouncement(west, {title: 'u12r3 Workshop', expiry: EXPIRY}));
            fact('west.7-stored', L.storedExpiry(sql, app, 'u12r3 Workshop'));
            const e1 = await L.openEdit(west, 'u12r3 Workshop');
            fact('west.8-box', e1.shows);
            await snap(west, 'west-edit-first');
            await step('west.9-save', () => L.saveEdit(west, e1.dialog));
            await snap(west, 'west-after-save');
            fact('west.9-stored', L.storedExpiry(sql, app, 'u12r3 Workshop'));
            const e2 = await L.openEdit(west, 'u12r3 Workshop');
            fact('west.10-box', e2.shows);
            await snap(west, 'west-edit-second');
            await L.closePanel(west, e2.dialog);

            // ---- "Date (Short)" set to another format (the kit's browser, UTC).
            fact('utc.browserZone', await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone));
            await signIn(page, 'rvaca');
            await step('utc.2-enable', () => L.enableAnnouncements(app, page));
            await step('utc.3-shortDate', () => L.setShortDate(app, page, 'd-m-Y'));
            await snap(page, 'date-time-saved');
            await step('utc.4-open', () => L.openAnnouncementsFromMenu(app, page));
            await step('utc.4-add', () => L.addAnnouncement(page, {title: 'u12r3 Call for papers', expiry: EXPIRY}));
            fact('utc.4-stored', L.storedExpiry(sql, app, 'u12r3 Call for papers'));
            const e3 = await L.openEdit(page, 'u12r3 Call for papers');
            fact('utc.5-box', e3.shows);
            await snap(page, 'edit-opened');
            const s6 = await step('utc.6-save', () => L.saveEdit(page, e3.dialog));
            await snap(page, 'after-unchanged-save');
            fact('utc.6-stored', L.storedExpiry(sql, app, 'u12r3 Call for papers'));
            if (s6 && s6.panelOpen) {
                await e3.box.fill(EXPIRY);
                await step('utc.control-retyped-save', () => L.saveEdit(page, e3.dialog));
                await snap(page, 'after-retyped-save');
                fact('utc.control-stored', L.storedExpiry(sql, app, 'u12r3 Call for papers'));
            } else {
                fact('utc.control-retyped-save', 'not taken: the unchanged save was not refused');
            }
        } else {
            // ---- Neighbour: what a fix must leave as it is ("Date (Short)" d-m-Y, UTC).
            await signIn(page, 'rvaca');
            await step('nb.enable', () => L.enableAnnouncements(app, page));
            await step('nb.shortDate', () => L.setShortDate(app, page, 'd-m-Y'));
            await step('nb.open', () => L.openAnnouncementsFromMenu(app, page));
            fact('nb.pageTimeZone', await page.evaluate(() => (typeof pkp === 'undefined' ? null : pkp.context.timeZone)));
            await step('nb.add-none', () => L.addAnnouncement(page, {title: 'u12r3 No expiry'}));
            const a = await L.openEdit(page, 'u12r3 No expiry');
            fact('nb.none-box', a.shows);
            await snap(page, 'none-edit');
            await step('nb.none-save', () => L.saveEdit(page, a.dialog));
            fact('nb.none-stored', L.storedExpiry(sql, app, 'u12r3 No expiry'));
            await step('nb.add-typed', () => L.addAnnouncement(page, {title: 'u12r3 Typed short', expiry: EXPIRY}));
            const b = await L.openEdit(page, 'u12r3 Typed short');
            fact('nb.typed-box', b.shows);
            await b.box.fill('31-03-2027');
            const s = await step('nb.typed-save', () => L.saveEdit(page, b.dialog));
            await snap(page, 'typed-short-save');
            fact('nb.typed-stored', L.storedExpiry(sql, app, 'u12r3 Typed short'));
            if (s && s.panelOpen) await L.closePanel(page, b.dialog);
        }
    } finally {
        record(`${prefix}-facts`, facts);
        if (ny) await ny.close().catch(() => {});
        await close();
    }
});
