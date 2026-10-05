// Issue report docs/issues/U42-A22-reference-author-orcid-any-link.md (U42 A22): a reference
// author's "ORCID iD" takes any text, and the References page links the author's ORCID icon to it.
//
// Takes the report's Steps through the screens on a dataset fleet freshly reset to PKP's default
// test dataset (`main`), on `publicknowledge`, on the submission of lib.js SUBMISSION: `dbarnes`
// turns metadata lookup on (and, on OJS and OMP, lets the author edit the publication); the author
// adds a reference with a DOI, a title and an author whose ORCID iD is an off-site address; `dbarnes` expands the row
// and presses the ORCID icon. Names tagged sxx5. The kit builds nothing; database reads are reads.
// Requests to example.com are answered by the browser context itself (no outside traffic).
//
// Modes (first argument; each runs alone on a freshly reset dataset):
//   steps (default)  the Steps (revision 1: the reference added by dbarnes before lookup is turned on).
//   reach            the same box as `dbarnes`, typed as a `javascript:` address: stored? linked?
//                    does pressing the icon run it?
//   nb               what a fix must leave alone: a full ORCID address, a sandbox one and an empty
//                    box are accepted and linked (orcid.org addresses only).
//
// Reset first:  npm run fleet-prep -- --feature issues-x5 --dataset 7 --reset
// Run (main):   PROBE_FEATURE=issues-x5 PROBE_AGENT=x5 node bin/probe.js <app|all> shared/playwright/checks/issues/reference-author-orcid-any-link/walk.js [steps|reach|nb]
// 3.5:          PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-x5-3_5 … (3.5 has no structured References page: the walk records what it finds)
// Fix trial:    PROBE_RUN=fix (steps), nb-in / nb-out (nb), with fix.diff applied or not.
// Facts: .reports/issues-x5/x5/a22-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, loc} = require('../../../probe');
const L = require('./lib');

const mode = process.argv[2] || 'steps';
const RAW = 'Lovelace A. sxx5 Notes on the analytical engine. 1843.';
const NEEDLE = 'sxx5';
const TITLE = 'sxx5 Notes on the analytical engine';
const OFFSITE = 'https://example.com/sxx5-not-an-orcid';
const SCRIPTED = 'javascript:alert(document.domain)';

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const S = L.SUBMISSION[app.name];
    const facts = {app: app.name, line: app.line || 'main', mode, run: process.env.PROBE_RUN || null, submission: S};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1200)}`);
    };
    const {page, close} = await launch(app);
    const ctx = page.context();
    await ctx.route('https://example.com/**', (r) => r.fulfill({status: 200, contentType: 'text/html', body: '<html><head><title>off-site page</title></head><body>off-site page</body></html>'}));
    const dialogs = [];
    const watchDialogs = (p, where) =>
        p.on('dialog', async (d) => {
            dialogs.push({where, type: d.type(), message: d.message()});
            await d.dismiss().catch(() => {});
        });
    watchDialogs(page, 'the page');
    ctx.on('page', (p) => watchDialogs(p, 'new tab'));
    /** One part; a throw is recorded, never fatal (a fix changes the screen). */
    const part = async (key, fn) => {
        try {
            await fn();
        } catch (e) {
            fact(`${key} error`, L.flat(e.message, 500));
            await shot(page, `a22-${key}-error`).catch(() => {});
        }
    };

    /** Add the reference, open its "Edit", fill title and author rows, "Save"; return what the save did. */
    const addAndEdit = async (refs, authors, key) => {
        await refs.add(RAW);
        return editRow(refs, authors, key);
    };
    /** Open the row's "Edit", fill DOI, title and author rows, "Save"; return what the save did. */
    const editRow = async (refs, authors, key) => {
        const panel = await refs.edit(NEEDLE);
        // a DOI, a title and an author: the three a row needs to count as structured (Citation::isStructured())
        await panel.field('DOI').fill('10.1234/sxx5');
        await panel.field('Title').fill(TITLE);
        for (const a of authors) await panel.addAuthor(a);
        await loc(page, 'Edit citation: the ORCID iD box', panel.authorsField().locator('input[name="orcid"]').first());
        fact(`${key} author rows before Save`, await L.authorRows(panel.authorsField()));
        const saved = await L.saveAndRead(page, panel);
        fact(`${key} save`, saved);
        if (saved.panelOpen) {
            record(`a22-${key}-refused`, await screen(page));
            await shot(page, `a22-${key}-refused`);
            await panel.close().catch(() => {});
            await L.afterClose(page);
        }
        fact(`${key} stored`, L.storedCitation(app, NEEDLE));
        return saved;
    };

    /** As the signed-in user: References, expand the row, read its ORCID links. */
    const viewRow = async (key) => {
        const {refs} = await L.openReferences(page, app);
        if ((await refs.row(NEEDLE).count()) === 0) {
            fact(`${key} row`, 'no row');
            return {refs, links: []};
        }
        await L.expandRow(page, refs, NEEDLE);
        const links = await L.orcidLinks(refs, NEEDLE);
        fact(`${key} row text`, L.flat(await refs.row(NEEDLE).first().innerText(), 300));
        fact(`${key} ORCID links`, links);
        record(`a22-${key}`, await screen(page));
        await shot(page, `a22-${key}`);
        return {refs, links};
    };

    /** Press the row's first ORCID icon; return the new tab's address and title, and any dialog. */
    const pressIcon = async (refs, key) => {
        const from = dialogs.length;
        const opened = ctx.waitForEvent('page', {timeout: 8000}).catch(() => null);
        await refs.row(NEEDLE).locator('a:has(.sr-only)').first().click();
        const tab = await opened;
        let out = {newTab: false};
        if (tab) {
            await tab.waitForLoadState('domcontentloaded', {timeout: 8000}).catch(() => {});
            await L.sleep(1500);
            out = {newTab: true, url: tab.url(), title: await tab.title().catch(() => null), opener: await tab.evaluate(() => (window.opener ? 'set' : 'null')).catch((e) => `unreadable: ${L.flat(e.message, 80)}`)};
            await tab.close().catch(() => {});
        }
        await L.sleep(1000);
        out.dialogs = dialogs.slice(from);
        out.openerUrl = page.url();
        fact(`${key} icon pressed`, out);
        return out;
    };

    try {
        if (mode === 'steps' && app.line === 'stable-3_5_0') {
            // 3.5: steps 1-2 as the author and as dbarnes; record what "References" offers (no
            // structured references, so no author table is expected).
            for (const who of [S.author, 'dbarnes']) {
                await part(`r35 ${who}`, async () => {
                    await signIn(page, who);
                    const wf = L.workflow(page, app);
                    if (who === 'dbarnes') await wf.gotoEditorial(S.id);
                    else await wf.gotoAuthor(S.id);
                    await idle(page);
                    const entry = wf.dialog().getByRole('link', {name: 'References', exact: true}).or(wf.dialog().getByRole('button', {name: 'References', exact: true}));
                    fact(`r35 ${who} References entries`, await entry.count());
                    if (await entry.count()) {
                        await entry.first().click();
                        await idle(page);
                        await L.sleep(800);
                    }
                    fact(`r35 ${who} on References`, {
                        heading: L.flat(await wf.dialog().locator('h1, h2').allInnerTexts().catch(() => []).then((a) => a.join(' | ')), 300),
                        textboxes: (await wf.dialog().getByRole('textbox').count()),
                        orcidBoxes: await page.locator('input[name="orcid"]').count(),
                        structuredTable: await page.locator('table[aria-label="Structured References"]').count(),
                        authorInformation: await page.getByText('Author Information', {exact: true}).count(),
                    });
                    record(`a22-r35-${who}`, await screen(page));
                    await shot(page, `a22-r35-${who}`);
                });
            }
        } else if (mode === 'steps') {
            // Revision 1: dbarnes adds the reference while lookup is still off (no lookup job is
            // queued for it), then turns lookup on; the walk is the same with or without network.
            await part('pre', async () => {
                await signIn(page, 'dbarnes');
                if (app.name !== 'ops') fact('pre author may edit the publication', await L.allowMetadataEdit(page, app, S.authorName, 'Author'));
                const {refs} = await L.openReferences(page, app);
                await refs.add(RAW);
                fact('pre reference added, citation jobs queued', L.citationJobs(app));
                fact('pre lookup on', await L.tickMetadata(page, app, ['lookup']));
                fact('pre after lookup on, citation jobs queued', L.citationJobs(app));
            });
            await part('s1-6', async () => {
                await signIn(page, S.author);
                // 1-2. My Submissions › the submission › References
                const {refs} = await L.openReferences(page, app, {author: true});
                fact('s2 author on References', {url: page.url()});
                // 3-6
                await editRow(refs, [{givenName: 'Ada', familyName: 'Lovelace', orcid: OFFSITE}], 's6');
                fact('s6 citation jobs queued', L.citationJobs(app));
            });
            await part('s7-9', async () => {
                await signOut(page);
                await signIn(page, 'dbarnes');
                const {refs, links} = await viewRow('s8');
                if (links.length) await pressIcon(refs, 's9');
                fact('s9 citation jobs queued', L.citationJobs(app));
                fact('s9 stored', L.storedCitation(app, NEEDLE));
            });
        } else if (mode === 'reach') {
            await part('pre', async () => {
                await signIn(page, 'dbarnes');
                fact('pre lookup on', await L.tickMetadata(page, app, ['lookup']));
            });
            await part('R', async () => {
                const {refs} = await L.openReferences(page, app);
                await addAndEdit(refs, [{givenName: 'Ada', familyName: 'Lovelace', orcid: SCRIPTED}], 'R save');
                const {refs: r2, links} = await viewRow('R view');
                if (links.length) await pressIcon(r2, 'R icon');
            });
        } else if (mode === 'nb') {
            await part('pre', async () => {
                await signIn(page, 'dbarnes');
                fact('pre lookup on', await L.tickMetadata(page, app, ['lookup']));
            });
            await part('nb', async () => {
                const {refs} = await L.openReferences(page, app);
                await addAndEdit(
                    refs,
                    [
                        {givenName: 'Ada', familyName: 'Lovelace', orcid: 'https://orcid.org/0000-0002-1825-0097'},
                        {givenName: 'Charles', familyName: 'Babbage', orcid: 'https://sandbox.orcid.org/0000-0002-1825-0097'},
                        {givenName: 'Mary', familyName: 'Somerville', orcid: ''},
                    ],
                    'nb'
                );
                await viewRow('nb view');
            });
        } else {
            throw new Error(`unknown mode ${mode}`);
        }
    } finally {
        fact('dialogs', dialogs);
        record(`a22-facts`, facts);
        await close();
    }
});
