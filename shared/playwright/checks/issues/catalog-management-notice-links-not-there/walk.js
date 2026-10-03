// U70 A2 {OMP}: a published book's Production stage shows the "Catalog Management" notice,
// "... using the links just above.", with no links above it, and shows it to the Author too.
// The Steps of docs/issues/U70-A2-catalog-management-notice-links-not-there.md, on PKP's default
// test dataset. Spec: docs/specs/U70-catalog-management.md, register A2.
// Only OMP has the notice (and a catalog); on OJS and OPS the script does nothing.
//
// Run (reset the dataset fleet first; it changes nothing, so a reset is only hygiene):
//   PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js omp \
//     shared/playwright/checks/issues/catalog-management-notice-links-not-there/walk.js
// MODE=neighbour runs the control alone (what a fix must leave alone): the editor `dbarnes` still
// gets both catalog notices, "Catalog Management" on book 14 and "Awaiting approval." on book 4.
// Records the screens; asserts nothing.
const {forEachApp, launch, signIn, signOut, record, shot, screen, idle} = require('../../../probe');
const L = require('./lib');

const MODE = process.env.MODE || 'walk';
const BOOK = {id: 14, title: 'From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots', author: 'mdawson'};
const UNPUBLISHED = {id: 4, title: 'How Canadians Communicate: Contexts of Canadian Popular Culture', author: 'bbeaty'};

forEachApp(async (app) => {
    if (app.name !== 'omp') return;
    const {page, close} = await launch(app);
    const facts = {mode: MODE, line: app.line};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[${MODE}] ${k}:`, JSON.stringify(v).slice(0, 1500));
    };
    try {
        if (MODE === 'walk') {
            // Steps 1-4: the editor; step 5.
            await signIn(page, 'dbarnes');
            fact('s4-editor-book14', await L.readProduction(page, app, BOOK.id, {label: 's4-editor-14'}));
            await shot(page, 's4-editor-14-production');
            await signOut(page);
            // Steps 6-8: the author.
            await signIn(page, BOOK.author);
            fact('s8-author-book14', await L.readProduction(page, app, BOOK.id, {author: true, label: 's8-author-14'}));
            await shot(page, 's8-author-14-production');
            // Step 9: the Catalog page's address; step 10.
            await page.goto(app.url(`/index.php/${app.contextPath}/en/manageCatalog`));
            await idle(page);
            const s10 = await screen(page);
            record('s9-author-catalog', s10);
            fact('s9-author-catalog', {title: await page.title(), text: L.flat(s10.text && s10.text.main, 300)});
            await signOut(page);
            // Steps 11-13: the other catalog notice, before publishing, in the author's view.
            await signIn(page, UNPUBLISHED.author);
            fact('s13-author-book4', await L.readProduction(page, app, UNPUBLISHED.id, {author: true, label: 's13-author-4'}));
            await shot(page, 's13-author-4-production');
            await signOut(page);
        } else {
            await signIn(page, 'dbarnes');
            fact('n1-editor-book14', await L.readProduction(page, app, BOOK.id, {label: 'n1-editor-14'}));
            fact('n2-editor-book4', await L.readProduction(page, app, UNPUBLISHED.id, {label: 'n2-editor-4'}));
            await shot(page, 'n2-editor-4-production');
            await signOut(page);
        }
    } catch (e) {
        fact('error', L.flat(e.message, 600));
        await shot(page, `${MODE}-error`).catch(() => {});
    } finally {
        record(`a2-${MODE}`, facts);
        await close();
    }
});
