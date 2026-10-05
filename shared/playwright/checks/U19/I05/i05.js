// U19 claim check, housekeeping chunk I05 (hk05, 2026-10-05): incidentals R045 (and R046, not driven: MySQL).
// Spec: docs/specs/U19-oai-pmh.md — Rules 7b, 7d, 8 (sets), register A1, footnotes j, n, q10, f-a1.
// Question (R045): does a press's set (`set=<press>`, at the press's address and the site-wide one) leave out the
// deleted record of a book in a series while listing the deleted record of a book in no series?
// OJS and OPS are the controls: an article / preprint in a section, unpublished, read with `set=<context>`.
//
//   PROBE_RUN=r1 PROBE_FEATURE=U19 PROBE_AGENT=ccI05 node bin/probe.js all shared/playwright/checks/U19/I05/i05.js
//
// Per app, a scratch context of its own (tag prefix u19i05): manager mg, author au. OMP: series `ser`, book S in
// it and book N in no series, both published with a PDF format. OJS/OPS: one item in the first section.
// Harvester reads (no session, a fresh request context) before and after the manager's "Unpublish" ("Unpost") on
// the workflow screen; the browser view of the press's set list is recorded signed out. The workflow screen is
// left once with a typed, unsaved title (the dialogs on the way out). publicknowledge is only read.
// No assertions: the script records, the reader judges. Facts: .reports/U19/ccI05/facts[-<run>]-<app>.json
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, idle, tag} = require('../../../probe');
const L = require('../../issues/oai-own-address-loses-deleted-records/lib');

const LIST = 'verb=ListRecords&metadataPrefix=oai_dc';
const IDS = 'verb=ListIdentifiers&metadataPrefix=oai_dc';
const NOUN = {ojs: 'Journal', omp: 'Press', ops: 'Server'};

forEachApp(async (app) => {
    const isOMP = app.name === 'omp', isOPS = app.name === 'ops';
    const f = {app: app.name, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        f[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${L.flat(JSON.stringify(v), 1200)}`);
    };
    let n = 0;
    const snap = async (page, name) => {
        const label = `${String(++n).padStart(2, '0')}-${name}`;
        const s = await screen(page);
        record(label, s);
        await shot(page, label).catch(() => {});
        return {snap: label, url: s.url, notices: s.notices};
    };
    // own records only: the site-wide list carries every context's
    const mine = (r, path) => ({...r, headers: (r.headers || []).filter((h) => h.includes(`[${path}`) || h.includes(`, ${path}`))});

    const k = tag('u19i05');
    const users = [
        {username: `${k}mg`, roles: ['manager'], givenName: 'Mia', familyName: 'Manager'},
        {username: `${k}au`, roles: ['author'], givenName: 'Ada', familyName: 'Author'},
    ];
    const spec = {tag: k, users, context: {name: `I05 ${NOUN[app.name]} ${k}`, acronym: 'IFIVE', contactName: 'I05 Contact', contactEmail: `${k}@mail.test`}};
    if (isOMP) spec.series = [{path: 'ser', title: 'I05 Series'}];
    else spec.sections = [{abbrev: isOPS ? 'PRE' : 'ART', title: isOPS ? 'Preprints' : 'Articles'}];
    const C = await app.api.createContext(spec);
    const P = C.path || k;
    fact('context', {path: P, id: C.contextId, series: isOMP ? 'ser' : null});

    const items = {};
    const fmt = isOMP ? {publicationFormats: [{name: 'PDF', file: 'article.pdf'}]} : {galleys: [{label: 'PDF', file: isOPS ? 'preprint.pdf' : 'article.pdf'}]};
    const seeds = isOMP ? {S: {title: `I05 In Series ${k}`, series: 'ser'}, N: {title: `I05 No Series ${k}`}} : {S: {title: `I05 In Section ${k}`}};
    for (const [key, s] of Object.entries(seeds)) {
        const x = await app.api.createSubmission({tag: `${k}${key.toLowerCase()}`, context: P, submitter: `${k}au`, published: true, abstract: 'An abstract.', ...fmt, ...s});
        items[key] = {id: x.submissionId, pub: x.publicationId, title: s.title};
    }
    fact('items', items);

    const reads = async (when) => {
        fact(`${when}: own ListSets`, await L.oai(app, P, 'verb=ListSets'));
        fact(`${when}: own ListIdentifiers`, await L.oai(app, P, IDS));
        fact(`${when}: own ListIdentifiers set=${P}`, await L.oai(app, P, `${IDS}&set=${P}`));
        fact(`${when}: own ListRecords set=${P}`, await L.oai(app, P, `${LIST}&set=${P}`));
        const sub = isOMP ? `${P}:ser` : `${P}:${isOPS ? 'PRE' : 'ART'}`;
        fact(`${when}: own ListIdentifiers set=${sub}`, await L.oai(app, P, `${IDS}&set=${encodeURIComponent(sub)}`));
        fact(`${when}: site-wide ListIdentifiers (own rows)`, mine(await L.oai(app, 'index', IDS), P));
        fact(`${when}: site-wide ListIdentifiers set=${P}`, await L.oai(app, 'index', `${IDS}&set=${P}`));
        fact(`${when}: site-wide ListRecords set=${P}`, await L.oai(app, 'index', `${LIST}&set=${P}`));
        fact(`${when}: site-wide ListIdentifiers set=${sub}`, await L.oai(app, 'index', `${IDS}&set=${encodeURIComponent(sub)}`));
        fact(`${when}: publicknowledge ListIdentifiers (read only)`, await L.oai(app, 'publicknowledge', IDS));
    };
    await reads('before');
    const before = f[`before: site-wide ListIdentifiers (own rows)`].headers.map((h) => h.split(' ')[0]);

    const {page, close} = await launch(app);
    page.setDefaultTimeout(L.T);
    try {
        await signIn(page, `${k}mg`);
        for (const [key, it] of Object.entries(items)) {
            await page.goto(app.url(`/index.php/${P}/en/dashboard/editorial?workflowSubmissionId=${it.id}`));
            await idle(page).catch(() => {});
            const s1 = await snap(page, `workflow-${key}-before-unpublish`);
            const u = await L.unpublish(page, app, P, it.id);
            const s2 = await snap(page, `workflow-${key}-after-unpublish`);
            fact(`unpublish ${key}`, {...u, before: s1.snap, after: s2.snap, notices: s2.notices});
        }
        await loc(page, 'workflow header Publish button after unpublish', page.getByRole('dialog').getByRole('button', {name: isOPS ? 'Post' : 'Publish', exact: true}));

        // leave the workflow once with a typed, unsaved title
        const it = items.S;
        await page.goto(app.url(`/index.php/${P}/en/dashboard/editorial?workflowSubmissionId=${it.id}&workflowMenuKey=publication_${it.pub}_titleAbstract`));
        await idle(page).catch(() => {});
        const dialogs = [];
        page.on('dialog', async (d) => { dialogs.push({type: d.type(), message: d.message()}); await d.accept().catch(() => {}); });
        const title = page.getByRole('dialog').getByRole('textbox', {name: 'Prefix', exact: true}).first();
        await loc(page, 'Title & Abstract: "Prefix" box', title);
        let typed = false;
        try {
            await title.waitFor({timeout: 15_000});
            await title.click();
            await page.keyboard.press('End');
            await page.keyboard.type('Unsaved');
            typed = true;
        } catch (e) { typed = `no title box: ${L.flat(e.message, 150)}`; }
        const s3 = await snap(page, 'workflow-S-title-typed');
        await page.goto(app.url(`/index.php/${P}/oai?${IDS}&set=${P}`)).catch((e) => dialogs.push({goto: L.flat(e.message, 200)}));
        await L.sleep(1500);
        fact('leave workflow with typed title', {typed, snap: s3.snap, dialogs, landed: page.url()});
        await signOut(page).catch(() => {});

        await reads('after');
        // GetRecord of every identifier the context listed before
        const gets = [];
        for (const id of before) gets.push(await L.oai(app, P, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(id)}`));
        fact('after: own GetRecord of each identifier', gets);
        const site = [];
        for (const id of before) site.push(await L.oai(app, 'index', `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(id)}`));
        fact('after: site-wide GetRecord of each identifier', site);
        fact('after: own Identify', await L.oai(app, P, 'verb=Identify'));

        // browser view, signed out: the press's set list at both addresses
        for (const [name, ctx] of [['own', P], ['site', 'index']]) {
            const r = await page.goto(app.url(`/index.php/${ctx}/oai?${IDS}&set=${P}`));
            await idle(page).catch(() => {});
            const s = await snap(page, `browser-${name}-set-context`);
            fact(`after: browser view ${name} set=${P}`, {status: r ? r.status() : null, snap: s.snap});
        }
        const r2 = await page.goto(app.url(`/index.php/index/oai?${IDS}`));
        await idle(page).catch(() => {});
        fact('after: browser view site-wide unfiltered', {status: r2 ? r2.status() : null, snap: (await snap(page, 'browser-site-unfiltered')).snap});
    } catch (e) {
        f.error = String(e.stack || e.message).slice(0, 800);
        console.log(`[i05] ${app.name} ERROR ${f.error}`);
    } finally {
        record('facts', f);
        await close();
    }
});
