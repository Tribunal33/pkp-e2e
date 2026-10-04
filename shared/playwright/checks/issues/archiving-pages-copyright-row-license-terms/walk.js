// Walk of U58 OJS1 with U67 A1 (issue report
// docs/issues/U58-OJS1-archiving-pages-copyright-row-license-terms.md): as rvaca, switch on
// LOCKSS and CLOCKSS, save "License Terms" and read the journal's LOCKSS and CLOCKSS pages' "Metadata"
// table; save a "Copyright Notice" and read them again; empty "License Terms" and read them again.
// OJS only (a press and a preprint server have no such pages). On PKP's default test dataset, fleet
// reset first.
//   PROBE_FEATURE=issues-u58d PROBE_AGENT=u58d node bin/probe.js ojs shared/playwright/checks/issues/archiving-pages-copyright-row-license-terms/walk.js
// Neighbour (WALK_MODE=nb, alone): steps 1-3 only, then every row of both pages' "Metadata" table
// and the site's two lists, to compare with the fix in and out.
const {forEachApp, launch, signIn, signOut, screen, record, note} = require('../../../probe');
const H = require('./lib.js');

const LICENSE = 'u58d License Terms: CC BY 4.0.';
const NOTICE = 'u58d Copyright Notice: authors keep the copyright.';
const MODE = process.env.WALK_MODE || 'steps';

forEachApp(async (app) => {
    if (app.name !== 'ojs') {
        record('surface', await H.noSurface(app));
        return;
    }
    const facts = {app: app.name, line: app.line || 'main', mode: MODE};
    const {page, close} = await launch(app);
    try {
        // 1-3
        await signIn(page, 'rvaca');
        facts.archiving = await H.switchOnLockssClockss(page, app);
        record('s3-archiving-saved', await screen(page));

        if (MODE === 'nb') {
            facts.pages = await H.readBoth(page, app, 'nb');
            facts.siteLists = await H.readSiteLists(page);
            record('nb-facts', facts);
            return;
        }

        // 4-5
        facts.license = await H.step(() => H.setLicenseTerms(page, app, LICENSE));
        record('s4-license-saved', await screen(page));
        facts.afterLicense = await H.readBoth(page, app, 's5');
        record('s5-lockss', await screen(page));

        // 6-7
        facts.notice = await H.step(() => H.setCopyrightNotice(page, app, NOTICE));
        record('s6-notice-saved', await screen(page));
        facts.afterNotice = await H.readBoth(page, app, 's7');
        record('s7-lockss', await screen(page));

        // 8-9
        facts.licenseEmptied = await H.step(() => H.setLicenseTerms(page, app, ''));
        record('s8-license-emptied', await screen(page));
        facts.afterEmptied = await H.readBoth(page, app, 's9');
        record('s9-lockss', await screen(page));

        const sum = (r) => ({
            lockss: r.lockss.copyright,
            clockss: r.clockss.copyright,
            noticeOnPage: r.lockss.noticeOnPage || r.clockss.noticeOnPage,
        });
        facts.summary = {s5: sum(facts.afterLicense), s7: sum(facts.afterNotice), s9: sum(facts.afterEmptied)};
        note(`u58d ${facts.line} ${MODE}: ${JSON.stringify(facts.summary)}`);
        record('facts', facts);
        await signOut(page);
    } finally {
        await close();
    }
});
