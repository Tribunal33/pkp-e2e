// U09 A7: a preview's address typed by anyone below manager level, or by a
// signed-out visitor. The report's Steps, on the default dataset.
// Run: PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/typed-preview-address-blank-page/walk.js
const {forEachApp, launch, signIn, signOut, record, shot} = require('../../../probe');
const {hasStaticPages, AUTHOR, typeAddress, enableStaticPages} = require('./lib');

forEachApp(async (app) => {
    const {page, close} = await launch(app);
    const facts = {app: app.name, line: app.line};
    try {
        const addresses = ['/navigationMenu/preview', ...(hasStaticPages(app) ? ['/pages/preview'] : [])];
        const tryAll = async (who) => {
            const out = {};
            for (const a of addresses) {
                out[a] = await typeAddress(app, page, a, `${who}${a.replace(/\//g, '-')}`);
                await shot(page, `${who}${a.replace(/\//g, '-')}`).catch(() => {});
            }
            return out;
        };

        // Precondition {OJS OMP}: the manager turns on "Static Pages Plugin".
        if (hasStaticPages(app)) {
            await signIn(page, 'rvaca');
            facts.precondition = await enableStaticPages(app, page);
            await signOut(page);
        }

        // Steps 1-3: the section editor (series editor, moderator).
        await signIn(page, 'dbuskins');
        facts.dbuskins = await tryAll('dbuskins');
        await signOut(page);

        // Step 4: an author.
        await signIn(page, AUTHOR[app.name]);
        facts.author = {user: AUTHOR[app.name], ...(await tryAll('author'))};
        await signOut(page);

        // Step 5: a visitor, signed out.
        facts.visitor = await tryAll('visitor');

        // Control: the manager at the same addresses.
        await signIn(page, 'rvaca');
        facts.rvaca = await tryAll('rvaca');
        await signOut(page);
    } finally {
        record('facts', facts);
        console.log(JSON.stringify(facts, null, 1));
        await close();
    }
});
