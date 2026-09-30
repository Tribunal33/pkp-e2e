// Neighbour check for the fix of docs/issues/U19-A18-oai-datestamp-never-moves-after-publication.md:
// what the fix must leave alone, read signed out on a freshly reset default dataset, nothing changed.
//   - the whole list: the same records (ListIdentifiers, no dates)
//   - the date filters still filter: `from` tomorrow and `until` yesterday answer noRecordsMatch,
//     `from` today lists everything (the dataset was built today)
//   - an item nobody touched: its datestamp is the later of the item's and its version's last change
//     (OMP "Bomb Canada …", format 2; OPS "The Facets Of Job Satisfaction …", preprint 2)
//   - OPS: a preprint whose second version was posted after its submission's stamp (submission 3)
//   - Identify's earliestDatestamp
// Run with the fix in and out (trial.sh):
//   PROBE_RUN=<fix|nofix> PROBE_FEATURE=issues-w05 PROBE_AGENT=w05 node bin/probe.js omp,ops … neighbour.js
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, record, sql} = require('../../../probe');

const REPO = path.resolve(__dirname, '../../../../..');
const ymd = (d) => d.toISOString().slice(0, 10);
const DAY = 86400_000;
const UNTOUCHED = {omp: {submission: 5, kind: 'publicationFormat', object: 2}, ops: {submission: 2, kind: 'preprint', object: 2}, ojs: {submission: 1, kind: 'article', object: 1}};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only');
    const repoId = (fs.readFileSync(path.resolve(REPO, app.configFile), 'utf8').match(/^repository_id\s*=\s*"?([^"\n]+)"?/m) || [])[1];
    const u = UNTOUCHED[app.name];
    const facts = {run: process.env.PROBE_RUN || null, today: ymd(new Date())};
    const {page, close} = await launch(app);
    const read = async (label, query) => {
        const r = await page.goto(app.url(`/index.php/${app.contextPath}/oai?${query}`));
        // The browser shows the XML through the stylesheet: read the XML itself at the address it landed on.
        const xml = await (await page.request.get(page.url())).text();
        facts[label] = {
            query, status: r ? r.status() : null,
            headers: (xml.match(/<header[ >]/g) || []).length,
            deleted: (xml.match(/status="deleted"/g) || []).length,
            error: (xml.match(/<error code="([^"]+)"/) || [])[1] || null,
            datestamp: (xml.match(/<datestamp>([^<]*)/) || [])[1] || null,
            earliest: (xml.match(/<earliestDatestamp>([^<]*)/) || [])[1] || null,
        };
        console.log(`[${app.name}] ${label}: ${JSON.stringify(facts[label])}`);
    };
    try {
        const li = 'verb=ListIdentifiers&metadataPrefix=oai_dc';
        await read('list', li);
        await read('from-today', `${li}&from=${ymd(new Date())}`);
        await read('from-tomorrow', `${li}&from=${ymd(new Date(Date.now() + DAY))}`);
        await read('until-yesterday', `${li}&until=${ymd(new Date(Date.now() - DAY))}`);
        await read('untouched', `verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:${repoId}:${u.kind}/${u.object}`);
        facts.untouchedDb = sql(app, `select 'submission '||s.last_modified||' | publication '||p.last_modified from submissions s join publications p on p.publication_id=s.current_publication_id where s.submission_id=${u.submission}`);
        if (app.name === 'ops') {
            // "Computer Skill Requirements …" (submission 3): its second version was posted after the submission's last stamp.
            await read('new-version', `verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:${repoId}:preprint/3`);
            facts.newVersionDb = sql(app, `select 'submission '||s.last_modified||' | publication '||p.last_modified from submissions s join publications p on p.publication_id=s.current_publication_id where s.submission_id=3`);
        }
        await read('identify', 'verb=Identify');
    } finally {
        record('neighbour', facts);
        await close();
    }
});
