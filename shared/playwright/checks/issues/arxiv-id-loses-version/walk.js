// Kept walk for docs/issues/U42-A12-arxiv-id-loses-version.md (spec U42, register A12).
// On PKP's default test dataset (a dataset fleet), as dbarnes, through the screens only:
//   Setup: Settings › Workflow › "Metadata": "Enable references structuring and metadata lookup" and
//   "Enable data citation metadata" ("Ask the author…") ticked and saved.
//   Editing a reference: OJS 4, OMP 3, OPS 1 › References: a reference added holding "arXiv:2101.12345v2"; its
//   "Edit citation" "Arxiv" box read, then typed as "arxiv:2101.12345v2", "https://arxiv.org/abs/2101.12345v2"
//   and "2101.12345v2", each saved and read back on a reopened panel.
//   Adding a data citation: › Data: ARXIV "https://arxiv.org/abs/1234.12345v2" saved and its row read;
//   ARXIV "3456.34567v4" (refused on main), then "4567.45678" in the same panel (the control).
// WALK_MODE=neighbour runs only the neighbour check for the fix trial (fix in and out): what the fix must leave
// alone — a malformed "Arxiv" value still refused, an unversioned prefixed ID still stored bare, malformed
// ARXIV identifiers still refused in a data citation, an old-style ID and a DOI unchanged — plus an old-style
// versioned ID ("hep-th/9901001v1"), which the fix also lets through; an uppercase "V4" stays refused, and type
// "URI" with the versioned arXiv address (a way round) is kept whole.
// Run (reset the fleet first: npm run fleet-prep -- --feature <feature> --dataset <n> --reset):
//   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/arxiv-id-loses-version/walk.js
const {forEachApp, launch, signIn, signOut, screen, shot, record, note, serverLog} = require('../../../probe');
const K = require('./lib.js');

const MODE = process.env.WALK_MODE || 'steps';
const SUBMISSION = {ojs: 4, omp: 3, ops: 1};

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, submission: SUBMISSION[app.name]};
    const log = serverLog(app);
    const from = log.mark();
    const {page} = await launch(app);
    let n = 0;
    const snap = async (name) => {
        const id = `a12-${MODE}-${String(++n).padStart(2, '0')}-${name}`;
        record(id, await screen(page).catch((e) => ({url: page.url(), error: K.flat(e.message)})));
        await shot(page, id).catch(() => {});
    };
    const step = async (key, fn) => {
        try { facts[key] = await fn(); } catch (e) {
            facts[key] = {threw: K.flat(e.message, 400)};
            note(`U42 A12 walk (${app.name}, ${MODE}): step ${key} threw: ${K.flat(e.message, 200)}`);
            await snap(`${key}-threw`).catch(() => {});
            await K.closeEditCitation(page).catch(() => {});
        }
        console.log(`[a12 ${app.name} ${facts.line} ${MODE}] ${key}`, JSON.stringify(facts[key]).slice(0, 1500));
        return facts[key];
    };
    const save = () => record(`a12-facts-${MODE}`, facts);

    await signIn(page, 'dbarnes');
    await step('settings', async () => K.enableLookupAndDataCitations(page, app));
    await snap('settings-saved');

    const openRefs = async () => {
        await K.gotoWorkflow(page, app, SUBMISSION[app.name]);
        return K.openEntry(page, 'References');
    };
    const openData = async () => {
        await K.gotoWorkflow(page, app, SUBMISSION[app.name]);
        const h = await K.openEntry(page, 'Data');
        await page.locator('table[aria-label="Data Citations"]:visible').first().waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
        return h;
    };
    const dataCase = async (title, identifierType, identifier) => {
        const {panel, saved} = await K.addDataCitation(page, {title, identifierType, identifier, relationship: K.SUPPORTING});
        const out = {typed: identifier, type: identifierType, saved};
        if (!saved.closed) { await snap(`dc-refused-${title.replace(/\W+/g, '-')}`); await K.closeDataCitation(page, panel); }
        out.row = ((await K.dcRows(page)) || []).find((r) => r.includes(title)) || null;
        return out;
    };

    if (MODE === 'steps') {
        // Editing a reference.
        await step('references', async () => ({heading: await openRefs()}));
        const raw = 'Doe J. Attention in study groups. arXiv:2101.12345v2';
        await step('add', async () => K.addReference(page, raw));
        await snap('reference-added');
        const rowText = 'Doe J. Attention in study groups';
        await step('afterLookup', async () => {
            await K.openEditCitation(page, rowText);
            const r = await K.readArxiv(page);
            await snap('edit-citation-arrive');
            await K.closeEditCitation(page);
            return r;
        });
        await step('prefixed', async () => K.arxivRoundTrip(page, rowText, 'arxiv:2101.12345v2'));
        await step('address', async () => K.arxivRoundTrip(page, rowText, 'https://arxiv.org/abs/2101.12345v2'));
        await step('bare', async () => K.arxivRoundTrip(page, rowText, '2101.12345v2'));
        await step('panelLast', async () => {
            await K.openEditCitation(page, rowText);
            const r = await K.readArxiv(page);
            await snap('edit-citation-last');
            await K.closeEditCitation(page);
            return r;
        });
        save();

        // Adding a data citation.
        await step('data', async () => ({heading: await openData()}));
        await step('dcAddress', async () => dataCase('u42r5 dataset by address', 'ARXIV', 'https://arxiv.org/abs/1234.12345v2'));
        await snap('dc-address-saved');
        await step('dcBare', async () => {
            const {panel, saved} = await K.addDataCitation(page, {title: 'u42r5 dataset bare', identifierType: 'ARXIV', identifier: '3456.34567v4', relationship: K.SUPPORTING});
            const out = {typed: '3456.34567v4', saved};
            await snap('dc-bare-versioned');
            if (!saved.closed) {
                await panel.getByRole('textbox', {name: 'Identifier', exact: true}).fill('4567.45678');
                out.control = {typed: '4567.45678', saved: await K.saveDataCitation(page, panel)};
                if (!out.control.saved.closed) await K.closeDataCitation(page, panel);
            }
            out.rows = await K.dcRows(page);
            return out;
        });
        await snap('dc-rows');
    } else if (MODE === 'neighbour') {
        await step('references', async () => ({heading: await openRefs()}));
        const raw = 'Roe K. Unrelated paper on teaching, 2019.';
        await step('add', async () => K.addReference(page, raw));
        const rowText = 'Roe K. Unrelated paper';
        await step('nbMalformed', async () => K.arxivRoundTrip(page, rowText, 'xyz'));
        await step('nbPrefixedUnversioned', async () => K.arxivRoundTrip(page, rowText, 'arxiv:2101.12345'));
        await step('nbAddressUnversioned', async () => K.arxivRoundTrip(page, rowText, 'https://arxiv.org/abs/2101.12345'));
        save();
        await step('data', async () => ({heading: await openData()}));
        await step('nbDcBadVersion', async () => dataCase('u42r5 nb bad version', 'ARXIV', '3456.34567vx'));
        await step('nbDcText', async () => dataCase('u42r5 nb text', 'ARXIV', 'not-an-arxiv-id'));
        await step('nbDcPrefixedUnversioned', async () => dataCase('u42r5 nb prefixed', 'ARXIV', 'arxiv:2345.23456'));
        await step('nbDcOldStyle', async () => dataCase('u42r5 nb old style', 'ARXIV', 'hep-th/9901001'));
        await step('nbDcDoi', async () => dataCase('u42r5 nb doi', 'DOI', 'https://doi.org/10.1234/abcd'));
        await step('nbDcUpperVersion', async () => dataCase('u42r5 nb upper version', 'ARXIV', '3456.34567V4'));
        await step('nbDcUriVersioned', async () => dataCase('u42r5 nb uri versioned', 'URI', 'https://arxiv.org/abs/1234.12345v2'));
        await step('coversOldStyleVersioned', async () => dataCase('u42r5 nb old style versioned', 'ARXIV', 'hep-th/9901001v1'));
        await step('rows', async () => K.dcRows(page));
        await snap('nb-dc-rows');
    }
    facts.serverLog = log.since(from);
    save();
    await signOut(page).catch(() => {});
});
