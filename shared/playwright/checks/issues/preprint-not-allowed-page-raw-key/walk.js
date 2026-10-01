// Walk of U21 OPS7 (issue report docs/issues/U21-OPS7-preprint-not-allowed-page-raw-key.md):
// "Authors must be registered": as dbarnes, untick "Allow user self-registration" on "Author"; a
// newcomer registers and opens "New Submission". "All sections closed": as dbarnes, tick "Inactive"
// on every section but the last active one (which cannot be deactivated) and restrict that one to
// editorial roles; ccorino opens "New Submission". Control: the same on a journal (OJS).
// Neighbour (with the fix in): before anything is closed, ccorino opens "New Submission" and gets
// the start form. On PKP's default test dataset, fleet reset first.
//   PROBE_FEATURE=issues-ir34 PROBE_AGENT=ir34 ONLY=ojs,ops node bin/probe.js all shared/playwright/checks/issues/preprint-not-allowed-page-raw-key/walk.js
const {forEachApp, launch, signIn, signOut, record} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const w = H.WORDS[app.name];
    if (!w) return; // a press has no section at intake and three self-registering author roles: not walked
    const facts = {app: app.name, line: app.line || 'main'};
    const visitor = `u21ir34visitor${app.name}`;
    const {page, close} = await launch(app);
    try {
        // neighbour: an author of the server still reaches the start form
        await signIn(page, w.author);
        const open = await H.openStart(page, app);
        record('ops7-0-author-start-form', open.screen);
        facts.neighbour = {heading: open.heading, startForm: open.startForm, rawKeys: open.rawKeys};
        await signOut(page);

        // authors must be registered
        await signIn(page, 'dbarnes');
        facts.selfRegistration = await H.turnOffSelfRegistration(page, app, 'Author');
        await signOut(page);
        facts.registered = await H.register(page, app, {givenName: 'U21ir34', familyName: 'Visitor', username: visitor});
        const refused = await H.openStart(page, app);
        record('ops7-1-not-registered', refused.screen);
        facts.notRegistered = {status: refused.status, heading: refused.heading, main: refused.main, rawKeys: refused.rawKeys, startForm: refused.startForm};
        await signOut(page);

        // all sections closed
        await signIn(page, 'dbarnes');
        facts.closed = await H.closeSections(page, app, w);
        await signOut(page);
        await signIn(page, w.author);
        const closed = await H.openStart(page, app);
        record('ops7-2-sections-closed', closed.screen);
        facts.sectionsClosed = {status: closed.status, heading: closed.heading, main: closed.main, rawKeys: closed.rawKeys, startForm: closed.startForm};
        await signOut(page);

        const raw = (x) => (x.rawKeys || []).map((k) => k.key || k.text || JSON.stringify(k));
        facts.observed = {
            notRegisteredRaw: raw(facts.notRegistered),
            sectionsClosedRaw: raw(facts.sectionsClosed),
            reproduced: /##submission\.wizard\./.test(facts.notRegistered.main + facts.sectionsClosed.main),
            neighbourStartForm: facts.neighbour.startForm > 0,
        };
    } finally {
        record('ops7-facts', facts);
        console.log(JSON.stringify(facts));
        await close();
    }
});
