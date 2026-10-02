// U54 OPS1 walk (issue report docs/issues/U54-OPS1-ops-open-access-sign-in-box-not-kept.md).
// On PKP's default test dataset (OJS and OMP are the control: the same steps on their own box):
//   A. the steps: signed out, open the published item (OPS preprint 2, OJS article 17, OMP book 5)
//      and press its PDF link; sign in as dbarnes, Settings > Users & Roles > "Site Access Options",
//      tick "Users must be registered and log in to view open access content." under "View … Content",
//      "Save"; reload and read the box; sign out and open the item's PDF again, then its download link.
//   N. the neighbour checks: N1 a signed-in reader (OJS, OPS ckwantes; OMP aclark) opens the PDF with
//      the box ticked; N2 dbarnes unticks the box and saves, and a signed-out visitor opens the PDF.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/ops-open-access-sign-in-box-not-kept/walk.js
const {forEachApp, launch, signIn, signOut, record, screen, idle} = require('../../../probe');
const H = require('./lib.js');

forEachApp(async (app) => {
    const c = H.CASES[app.name];
    const facts = {app: app.name, line: app.line || 'main', setting: c.setting, item: c.item};
    const {page, close} = await launch(app);
    try {
        facts.storedBefore = H.stored(app, c.setting);

        // A. the steps
        facts.before = await H.openFile(page, app);
        record('01-signed-out-file-before', await screen(page));

        await signIn(page, 'dbarnes');
        let tab = await H.accessTab(page, app);
        facts.boxBefore = await H.boxState(tab, app);
        facts.save = await H.tickAndSave(page, tab, app, true);
        record('02-ticked-saved', await screen(page));
        await tab.reload();
        facts.boxAfterReload = await H.boxState(tab, app);
        record('03-reloaded', await screen(page));
        facts.storedAfter = H.stored(app, c.setting);

        await signOut(page);
        facts.after = await H.openFile(page, app);
        record('04-signed-out-file-after', await screen(page));

        // N1. a signed-in reader, the box as the steps left it
        await signIn(page, c.reader);
        facts.n1Reader = await H.openFile(page, app);
        record('05-reader-file', await screen(page));
        await signOut(page);

        // N2. the box unticked again, a signed-out visitor
        await signIn(page, 'dbarnes');
        tab = await H.accessTab(page, app);
        facts.n2BoxBefore = await H.boxState(tab, app);
        facts.n2Save = await H.tickAndSave(page, tab, app, false);
        facts.n2StoredAfter = H.stored(app, c.setting);
        await signOut(page);
        facts.n2Visitor = await H.openFile(page, app);
        record('06-signed-out-file-unticked', await screen(page));
    } finally {
        record('facts', facts);
        await close();
    }
});
