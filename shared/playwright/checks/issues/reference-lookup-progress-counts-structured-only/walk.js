// Issue report docs/issues/U42-A6-reference-lookup-progress-counts-structured-only.md (U42 A6): with
// metadata lookup on, the progress box under the References page's "Add" box counts only the
// references that are already structured: it is absent while none is, reads "Processing
// references - 0/2" over a list of five, and "All 2 references successfully processed" while three
// are still waiting.
//
// Takes the report's Steps through the screens on a dataset fleet freshly reset to PKP's default test
// dataset, as the dataset's editor `dbarnes` on `publicknowledge`, on the submission of
// ../citation-author-row-kept-after-close/lib.js SUBMISSION. Names tagged u42r7. The kit builds
// nothing. The one write outside the screens is the Steps' own SQL (steps 9 and 11), which stands in
// for the outside lookup finishing: it writes what IsProcessedJob::handle() writes, processingStatus
// 5 (PROCESSED). Every other database call is a read.
//
// Modes (first argument; each runs alone on a freshly reset dataset):
//   steps (default)  the Steps.
//   nb               what the fix must leave alone (pkp/pkp-lib#12155's intent): references added
//                    while lookup was off, then lookup switched on, show no box and start no refresh;
//                    one of them structured by hand (unfixed: "0/1" and a refresh for good); a
//                    "Reprocess" on another (fixed: a lookup asked for is counted).
//   upg              references as an upgrade from 3.5 leaves them: added while lookup is off, then
//                    their stored processingStatus removed by SQL (no migration writes one, so an
//                    upgraded reference has none and the API gives null); lookup switched on; then one
//                    filled in by hand. The fix must show no box and start no refresh.
//
// Reset first:  npm run fleet-prep -- --feature issues-u42r7 --dataset 7 --reset
// Run (main):   PROBE_FEATURE=issues-u42r7 PROBE_AGENT=u42r7 node bin/probe.js <app|all> shared/playwright/checks/issues/reference-lookup-progress-counts-structured-only/walk.js [steps|nb]
// Fix trial:    PROBE_RUN=fix (steps), nb-in / nb-out (nb), upg-in / upg-out (upg), with fix.diff applied or not.
// Facts: .reports/issues-u42r7/u42r7/a6-facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, screen, shot, record, idle, sql} = require('../../../probe');
const L = require('../citation-author-row-kept-after-close/lib');

const mode = process.argv[2] || 'steps';
const LINES = ['one', 'two', 'three', 'four', 'five'].map((n) => `u42r7 Reference ${n}. Test Press; 2020.`);
const EARLIER = ['one', 'two'].map((n) => `u42r7 Earlier ${n}. Test Press; 2019.`);
const PROCESSED = 5; // CitationProcessingStatus::PROCESSED, what IsProcessedJob::handle() stores

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset)');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const facts = {app: app.name, line: app.line || 'main', mode, run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1200)}`);
        record(`a6-facts${run}`, facts);
    };
    const {page, close} = await launch(app);
    // The page's own GETs, to see whether it refreshes itself.
    const gets = [];
    page.on('request', (r) => {
        if (r.method() === 'GET' && /\/api\/v1\/submissions\/\d+/.test(r.url())) gets.push({t: Date.now(), url: r.url().replace(/^.*\/api\/v1\//, '').split('?')[0]});
    });
    /** One part; a throw is recorded, never fatal (a fix changes the screen). */
    const part = async (key, fn) => {
        try {
            await fn();
        } catch (e) {
            fact(`${key} error`, L.flat(e.message, 500));
            await shot(page, `a6-${key}-error${run}`).catch(() => {});
        }
    };
    /** The progress box as shown: its title and its description, or null. */
    const box = async (refs) => {
        const title = refs.progressTitle().first();
        if (!(await title.isVisible().catch(() => false))) return null;
        const holder = title.locator('xpath=ancestor::div[contains(@class,"align-middle")][1]');
        return {title: L.flat(await title.innerText()), text: L.flat(await holder.innerText().catch(() => null), 400)};
    };
    /** Watch the page for `ms`: how many GETs of the submission/publication it sent by itself. */
    const refreshWatch = async (ms) => {
        const t0 = Date.now();
        await L.sleep(ms);
        const hits = gets.filter((g) => g.t >= t0);
        return {ms, gets: hits.length, paths: [...new Set(hits.map((h) => h.url))]};
    };
    /** Read: each tagged reference's stored processingStatus and isStructured (a read, never a step). */
    const stored = () => {
        const sub = L.SUBMISSION[app.name].id;
        return sql(
            app,
            `select c.raw_citation, coalesce((select setting_value from citation_settings t where t.citation_id = c.citation_id and t.setting_name = 'processingStatus'), '(none)') from citations c join submissions s on s.current_publication_id = c.publication_id where s.submission_id = ${sub} and c.raw_citation like 'u42r7%' order by c.seq`
        ).split('\n').filter(Boolean);
    };
    /** Each row: its text's first line, the badge, whether it shows a title (structured). */
    const rows = async (refs) =>
        refs.rows().evaluateAll((trs) => trs.map((tr) => {
            const c = tr.querySelector('td, th');
            return c ? c.innerText.replace(/\s+/g, ' ').trim().slice(0, 140) : tr.innerText.trim().slice(0, 140);
        }));
    /** The Steps' SQL: the lookups of these references finish, as IsProcessedJob::handle() writes it. */
    const finishLookups = (lines) => {
        const list = lines.map((l) => `'${l.replace(/'/g, "''")}'`).join(', ');
        const q = `UPDATE citation_settings SET setting_value = '${PROCESSED}' WHERE setting_name = 'processingStatus' AND citation_id IN (SELECT citation_id FROM citations WHERE raw_citation IN (${list}))`;
        sql(app, q);
        return q;
    };
    /** Structure a reference by hand in "Edit citation": DOI, Title, one author; "Save". */
    const structure = async (refs, text, {doi, title, given, family}) => {
        const panel = await refs.edit(text);
        await panel.field('DOI').fill(doi);
        await panel.field('Title').fill(title);
        await panel.addAuthor({givenName: given, familyName: family});
        await panel.save();
        await L.afterClose(page);
    };
    const reopen = async () => {
        const {pg} = await L.openPublicationPage(page, app, 'References');
        await L.sleep(1500);
        return pg;
    };

    try {
        await signIn(page, 'dbarnes');

        if (mode === 'steps') {
            let refs;
            await part('s2', async () => fact('s2 lookup on', await L.tickMetadata(page, app, ['lookup'])));
            await part('s3', async () => {
                refs = await reopen();
                fact('s3 box on an empty list', await box(refs));
            });
            await part('s4', async () => {
                await refs.add(LINES);
                await idle(page);
                await L.sleep(1500);
                fact('s4 rows', await rows(refs));
                fact('s4 stored status', stored());
            });
            await part('s5', async () => {
                fact('s5 box after Add', await box(refs));
                record(`a6-s5${run}`, await screen(page));
                await shot(page, `a6-s5${run}`);
                fact('s5 refresh in 22 s', await refreshWatch(22000));
                fact('s5 stored status after 22 s', stored());
            });
            await part('s6', async () => structure(refs, 'u42r7 Reference one', {doi: '10.1234/u42r7.1', title: 'u42r7 Reference one', given: 'Ada', family: 'Lovelace'}));
            await part('s7', async () => structure(refs, 'u42r7 Reference two', {doi: '10.1234/u42r7.2', title: 'u42r7 Reference two', given: 'Charles', family: 'Babbage'}));
            await part('s8', async () => {
                await L.sleep(1000);
                fact('s8 box with two structured', await box(refs));
                fact('s8 rows', await rows(refs));
                record(`a6-s8${run}`, await screen(page));
                await shot(page, `a6-s8${run}`);
                fact('s8 refresh in 22 s', await refreshWatch(22000));
                fact('s8 stored status', stored());
            });
            await part('s9', async () => fact('s9 SQL (two lookups finish)', finishLookups(LINES.slice(0, 2))));
            await part('s10', async () => {
                refs = await reopen();
                fact('s10 box (two finished, three waiting)', await box(refs));
                fact('s10 rows', await rows(refs));
                fact('s10 stored status', stored());
                record(`a6-s10${run}`, await screen(page));
                await shot(page, `a6-s10${run}`);
                fact('s10 refresh in 22 s', await refreshWatch(22000));
            });
            await part('s11', async () => fact('s11 SQL (three finish without a match)', finishLookups(LINES.slice(2))));
            await part('s12', async () => {
                refs = await reopen();
                fact('s12 box (all five finished)', await box(refs));
                fact('s12 rows', await rows(refs));
                fact('s12 stored status', stored());
                record(`a6-s12${run}`, await screen(page));
                await shot(page, `a6-s12${run}`);
            });
        }

        if (mode === 'upg') {
            let refs;
            // The page's own publication fetches: the processingStatus each reference arrives with.
            const seen = [];
            page.on('response', async (r) => {
                if (r.request().method() !== 'GET' || !/\/publications\/\d+$/.test(r.url().split('?')[0])) return;
                const body = await r.json().catch(() => null);
                if (body && Array.isArray(body.citations)) seen.push(body.citations.filter((c) => /u42r7/.test(c.rawCitation || '')).map((c) => c.processingStatus === undefined ? 'absent' : c.processingStatus));
            });
            await part('u1', async () => {
                refs = await reopen();
                await refs.add(EARLIER);
                await idle(page);
                fact('u1 stored status (lookup off)', stored());
            });
            await part('u2', async () => {
                const sub = L.SUBMISSION[app.name].id;
                const q = `DELETE FROM citation_settings WHERE setting_name = 'processingStatus' AND citation_id IN (SELECT c.citation_id FROM citations c JOIN submissions s ON s.current_publication_id = c.publication_id WHERE s.submission_id = ${sub} AND c.raw_citation LIKE 'u42r7%')`;
                sql(app, q);
                fact('u2 SQL (what an upgrade leaves: no stored status)', q);
                fact('u2 stored status', stored());
            });
            await part('u3', async () => fact('u3 lookup on', await L.tickMetadata(page, app, ['lookup'])));
            await part('u4', async () => {
                refs = await reopen();
                fact('u4 processingStatus as the page received it', seen[seen.length - 1] || null);
                fact('u4 box over upgraded references', await box(refs));
                fact('u4 refresh in 22 s', await refreshWatch(22000));
            });
            await part('u5', async () => {
                await structure(refs, 'u42r7 Earlier one', {doi: '10.1234/u42r7.7', title: 'u42r7 Earlier one', given: 'Ada', family: 'Lovelace'});
                await L.sleep(1000);
                fact('u5 box after filling one in by hand', await box(refs));
                fact('u5 refresh in 22 s', await refreshWatch(22000));
                fact('u5 stored status', stored());
                record(`a6-u5${run}`, await screen(page));
            });
        }

        if (mode === 'nb') {
            let refs;
            await part('n1', async () => {
                refs = await reopen();
                fact('n1 lookup off: box on an empty list', await box(refs));
                await refs.add(EARLIER);
                await idle(page);
                fact('n1 stored status (lookup off)', stored());
            });
            await part('n2', async () => fact('n2 lookup on', await L.tickMetadata(page, app, ['lookup'])));
            await part('n3', async () => {
                refs = await reopen();
                fact('n3 box over two references no lookup was asked for', await box(refs));
                fact('n3 rows', await rows(refs));
                fact('n3 refresh in 22 s', await refreshWatch(22000));
            });
            await part('n4', async () => {
                await structure(refs, 'u42r7 Earlier one', {doi: '10.1234/u42r7.8', title: 'u42r7 Earlier one', given: 'Ada', family: 'Lovelace'});
                await L.sleep(1000);
                fact('n4 box after structuring one by hand', await box(refs));
                fact('n4 stored status', stored());
                record(`a6-n4${run}`, await screen(page));
                fact('n4 refresh in 22 s', await refreshWatch(22000));
            });
            await part('n5', async () => {
                await refs.rowAction('u42r7 Earlier two', 'Reprocess');
                const dlg = page.getByRole('dialog').filter({hasText: /reprocess/i}).last();
                if (await dlg.isVisible({timeout: 3000}).catch(() => false)) {
                    fact('n5 reprocess dialog', L.flat(await dlg.innerText(), 300));
                    await dlg.getByRole('button', {name: 'OK', exact: true}).click();
                    await dlg.waitFor({state: 'detached', timeout: 10000}).catch(() => {});
                }
                await idle(page);
                await L.sleep(1500);
                fact('n5 box after "Reprocess" on the other', await box(refs));
                fact('n5 stored status', stored());
                record(`a6-n5${run}`, await screen(page));
            });
        }
    } finally {
        record(`a6-facts${run}`, facts);
        await close();
    }
});
