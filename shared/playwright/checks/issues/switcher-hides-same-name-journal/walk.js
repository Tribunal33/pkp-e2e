// U08 A21 walk (issue report docs/issues/U08-A21-switcher-hides-same-name-journal.md).
// On PKP's default test dataset: the Site Administrator creates a second journal (press,
// server) carrying the dataset journal's own name and gives an author of the dataset the Author
// role there; then the journals switcher (the sitemap icon in the dark header bar) is opened by
// the administrator on the dataset journal's Dashboard and on Administration (the control), and
// by the author on each journal's "My Submissions".
//   PROBE_FEATURE=issues-u08n PROBE_AGENT=u08n node bin/probe.js all shared/playwright/checks/issues/switcher-hides-same-name-journal/walk.js
// Neighbour check for the fix (SWITCHER_MODE=neighbour; runs alone, fix in and out): a journal
// with a different name only; the administrator's list on each journal must hold the other one
// and never the current one, and an author enrolled in one journal only gets no icon.
const {forEachApp, launch, signIn, signOut, screen, record} = require('../../../probe');
const H = require('./lib.js');

const MODE = process.env.SWITCHER_MODE === 'neighbour' ? 'neighbour' : 'steps';

forEachApp(async (app) => {
    const w = H.WORDS[app.name];
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, steps: {}};
    const {page, close} = await launch(app);
    const dash = (ctx) => `/index.php/${ctx}/en/dashboard/editorial`;
    const mine = (ctx) => `/index.php/${ctx}/en/submissions`;
    try {
        await signIn(page, 'admin');
        if (MODE === 'steps') {
            // 2. a second context carrying the dataset context's own name
            facts.steps.create = await H.createContext(page, app, {name: w.datasetName, initials: 'U08N', path: 'u08n', email: 'u08n@mailinator.com'})
                .catch((e) => ({error: H.flat(e.message)}));
            record('01-created', await screen(page));
            // 3. the dataset's author gets the Author role there
            facts.steps.role = await H.giveRole(page, app, {username: w.author, role: 'Author'})
                .catch((e) => ({error: H.flat(e.message)}));
            record('02-role', await screen(page));
            // 4. admin on the dataset context's Dashboard
            facts.adminOnDataset = await H.readSwitcher(page, app, dash(app.contextPath));
            record('03-admin-dataset-switcher', await screen(page));
            // 5. control: admin on Administration (no current context)
            facts.adminOnAdministration = await H.readSwitcher(page, app, '/index.php/index/en/admin');
            record('04-admin-administration-switcher', await screen(page));
            await signOut(page);
            // 6-7. the author on each context's "My Submissions"
            await signIn(page, w.author);
            facts.authorOnDataset = await H.readSwitcher(page, app, mine(app.contextPath));
            record('05-author-dataset-switcher', await screen(page));
            facts.authorOnNew = await H.readSwitcher(page, app, mine('u08n'));
            record('06-author-new-switcher', await screen(page));
            await signOut(page);
            facts.observed = {
                adminOnDataset: facts.adminOnDataset.present ? facts.adminOnDataset.items.map((i) => `${i.name} -> ${i.href}`) : 'no icon',
                adminOnAdministration: facts.adminOnAdministration.present ? facts.adminOnAdministration.items.map((i) => `${i.name} -> ${i.href}`) : 'no icon',
                authorOnDataset: facts.authorOnDataset.present ? facts.authorOnDataset.items.map((i) => `${i.name} -> ${i.href}`) : 'no icon',
                authorOnNew: facts.authorOnNew.present ? facts.authorOnNew.items.map((i) => `${i.name} -> ${i.href}`) : 'no icon',
            };
        } else {
            // neighbour: a context with a different name, nobody enrolled
            facts.steps.create = await H.createContext(page, app, {name: 'u08n Neighbour', initials: 'U08NB', path: 'u08nnb', email: 'u08nnb@mailinator.com'})
                .catch((e) => ({error: H.flat(e.message)}));
            facts.adminOnDataset = await H.readSwitcher(page, app, dash(app.contextPath));
            record('nb-01-admin-dataset-switcher', await screen(page));
            facts.adminOnNeighbour = await H.readSwitcher(page, app, dash('u08nnb'));
            record('nb-02-admin-neighbour-switcher', await screen(page));
            await signOut(page);
            await signIn(page, w.loneAuthor);
            facts.loneAuthorOnDataset = await H.readSwitcher(page, app, mine(app.contextPath));
            record('nb-03-lone-author-switcher', await screen(page));
            await signOut(page);
            const list = (r) => (r.present ? r.items.map((i) => `${i.name} -> ${i.href}`) : 'no icon');
            facts.observed = {
                adminOnDataset: list(facts.adminOnDataset),
                adminOnNeighbour: list(facts.adminOnNeighbour),
                loneAuthorOnDataset: list(facts.loneAuthorOnDataset),
            };
        }
    } finally {
        record(MODE === 'steps' ? 'facts' : 'nb-facts', facts);
        console.log(JSON.stringify({app: app.name, steps: facts.steps, observed: facts.observed}, null, 1));
        await close();
    }
});
