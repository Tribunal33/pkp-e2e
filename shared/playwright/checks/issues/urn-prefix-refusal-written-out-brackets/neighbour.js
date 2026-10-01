// Neighbour check for docs/issues/U44-A10-urn-prefix-refusal-written-out-brackets.md: what the fix must leave alone.
// The same window's other refusals and its save, each read in the same three places as the walk:
//   an empty "URN Prefix" ("This field is required."), a resolver address that is not a full web address
//   ("Please enter a valid URL."), "Articles" ("Monographs") unticked, which the server refuses ("Please choose the
//   objects URNs should be assigned to."), and a well-formed prefix urn:nbn:de:0000- that saves.
// Run with the fix in and out, each time on a fresh load of the default dataset, as `rvaca`.
// Run: PROBE_FEATURE=issues-r27 PROBE_AGENT=r27 node bin/probe.js all shared/playwright/checks/issues/urn-prefix-refusal-written-out-brackets/neighbour.js
const {forEachApp, launch, signIn, signOut, record} = require('../../../probe');
const L = require('./lib');

forEachApp(async (app) => {
    const facts = {line: app.line || 'main'};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1200)}`); };
    if (!['ojs', 'omp'].includes(app.name)) { fact('surface', 'no URN plugin on this app'); record('n-facts', facts); return; }
    const {page, close} = await launch(app);
    try {
        await signIn(page, 'rvaca');
        const cases = [
            ['empty prefix', {prefix: ''}],
            ['resolver not a full address', {prefix: 'urn:nbn:de:0000-', resolver: 'https://nbn-resolving'}],
            ['no kind ticked (refused by the server)', {prefix: 'urn:nbn:de:0000-', noKind: true}],
            ['well-formed prefix', {prefix: 'urn:nbn:de:0000-'}],
        ];
        let n = 0;
        for (const [label, opts] of cases) {
            const tag = `n-${String(++n).padStart(2, '0')}`;
            await L.openUrnSettings(page, app, `${tag}-urn-settings`);
            await L.fillWindow(page, app, opts);
            fact(label, await L.save(page, `${tag}-save`));
            await L.closeWindow(page);
        }
        await signOut(page);
    } finally {
        record('n-facts', facts);
        await close();
    }
});
