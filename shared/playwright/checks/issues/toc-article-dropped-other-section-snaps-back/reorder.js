// Second check for docs/issues/U50-A10-toc-article-dropped-other-section-snaps-back.md (U50 A10):
// reorders inside one section of "Vol. 1 No. 2 (2014)"'s "Order", with the order stored for the
// issue's articles (`publications.seq` of each current publication) read before and after each "Done".
//   setup  dbarnes publishes submissions 5 ("Genetic transformation of forest trees") and 6
//          ("Investigating the Shared Background…"), both in "Articles", and 9 ("Hansen & Pinto",
//          "Reviews") into the issue: "Articles" holds four articles, "Reviews" one
//   A      "Order": "The Signalling Theory Dividends" dragged below "Antimicrobial…"; "Done"
//   B      "Order": the last article of "Articles" dragged to the top; "Done"
//   C      "Order": the last article of "Articles" dragged above the second; "Done"
//   D      "Order": the top article of "Articles" dragged below the second, then "Hansen & Pinto"
//          dragged up past the "Reviews" heading; "Done"
// After each round the tab is reopened and read, as is the issue's page at the end.
// Reset first: npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run: PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/toc-article-dropped-other-section-snaps-back/reorder.js
const {forEachApp, launch, signIn, record, idle, sql} = require('../../../probe');
const L = require('./lib');

const ISSUE_ID = 1;

async function stored(app) {
    const rows = await sql(app, `select p.submission_id, p.section_id, coalesce(p.seq::text, 'NULL')
        from publications p join submissions s on s.current_publication_id = p.publication_id
        where p.issue_id = ${ISSUE_ID} order by p.section_id, p.seq, p.submission_id`);
    return (Array.isArray(rows) ? rows : String(rows).split('\n')).filter(Boolean).map((l) => {
        const [sub, sec, seq] = String(l).split('|');
        return `section ${sec}: submission ${sub} seq ${seq}`;
    });
}

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('reorder.js runs on a dataset fleet');
    const facts = {line: app.line || 'main', rounds: []};
    const log = (k, v) => console.log(`[fact] ${k}: ${JSON.stringify(v)}`);
    const {page, close} = await launch(app);
    try {
        const posts = L.watchSaveSequence(page);
        await signIn(page, 'dbarnes');
        for (const id of [5, 6, 9]) {
            facts[`publish${id}`] = (await L.publishIntoIssue(page, app, id, L.ISSUE, `setup${id}`)).publish;
        }
        log('setup', {publish5: facts.publish5, publish6: facts.publish6, publish9: facts.publish9});

        const blocks = async (win) => {
            const b = await L.tocBlocks(win);
            return Object.fromEntries(b.map((x) => [x.rows.find((r) => r.startsWith('# ')) || x.block, x.rows.filter((r) => !r.startsWith('# '))]));
        };
        const SIG = 'The Signalling Theory Dividends';
        const ANTI = 'Antimicrobial, heavy metal resistance and plasmid profile of coliforms isolated from nosocomial infections in a hospital in Isfahan, Iran';
        const arts = (b) => b['# Articles'];
        const rounds = [
            {name: 'A', drags: () => [[SIG, ANTI, 'below']]},
            {name: 'B', drags: (b) => [[arts(b)[arts(b).length - 1], arts(b)[0], 'above']]},
            {name: 'C', drags: (b) => [[arts(b)[arts(b).length - 1], arts(b)[1], 'above']]},
            {name: 'D', drags: (b) => [
                [arts(b)[0], arts(b)[1], 'below'],
                [b['# Reviews'][0], arts(b)[arts(b).length - 1], 'above'],
            ]},
        ];
        for (const round of rounds) {
            const out = {name: round.name};
            const toc = await L.openToc(page, app);
            out.before = await blocks(toc.win);
            out.storedBefore = await stored(app);
            const ordering = toc.win.tocOrdering();
            await ordering.start();
            out.drags = [];
            for (const [moving, target, where] of round.drags(out.before)) {
                // Titles are read live, since an earlier drag of the round moved rows.
                await toc.win.dragArticle(moving, target, where);
                await L.sleep(500);
                out.drags.push({moving, target, where, onScreen: await toc.win.tocOutline()});
            }
            await L.snap(page, `round${round.name}-dropped`);
            const n = posts.length;
            const r = await ordering.done();
            out.done = r ? r.status() : null;
            out.posted = posts.slice(n);
            out.afterDone = await toc.win.tocOutline();
            await toc.win.close();
            out.storedAfter = await stored(app);
            const again = await L.openToc(page, app);
            out.reopened = await blocks(again.win);
            await L.snap(page, `round${round.name}-reopened`);
            await again.win.close();
            facts.rounds.push(out);
            log(`round ${round.name}`, out);
        }
        facts.issuePage = (await L.readIssuePage(page, app, 'issue/current')).outline;
        await L.snap(page, 'issue-page');
        log('issuePage', facts.issuePage);
    } finally {
        record('reorder', facts);
        await close();
    }
});
