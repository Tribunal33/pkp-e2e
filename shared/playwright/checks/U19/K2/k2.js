const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U19 claim check, chunk K2 — OAI-PMH lists, dates and refusals
// (docs/specs/U19-oai-pmh.md: Fields "Errors" 231–248; Rules 3–9 261–326; Rules 13–15 344–361; register
// A1–A4 649–687, OMP3 786–793, OPS1 808–817). Chunk plan: .reports/U19/claimcheck-chunks.md.
//
//   PROBE_FEATURE=U19 PROBE_AGENT=ccK2 node bin/probe.js all shared/playwright/checks/U19/K2/k2.js
//   PHASES=seed,lists,… narrows (state in .reports/U19/ccK2/k2-state-<app>.json; the seed runs once per state
//   file: delete it to drive a later build afresh). Mutating phases run once per state (flags in the state).
//   Phase order: seed bulk lists sets errors dates paging unpub reissue issue section datestamp jats sweep.
//   The full run outlasts the Bash tool's 600 s cap: run it detached (patterns.md "Probe kit").
//
// Every context is a scratch one from `POST scenarios/context` (tag prefix u19k2); publicknowledge and the
// seeded users are only read. Per app:
//   C1  sections ART "Articles", "É D" "Études Diverses", OLD "Old Section" (OMP: two series added on screen,
//       Settings › Press › "Series"); OJS issues Vol. 1 No. 1 (2026) published, Vol. 2 No. 1 (2027) unpublished,
//       Vol. 3 No. 1 (2026) published. Manager mg, author au. Items, seeded one after another:
//       A (published), X (published; unpublished and published again on screen), ED (published in "É D"),
//       Q (OJS: published in Vol. 3; its issue edited on screen), I (OJS: published in Vol. 1; the issue
//       unpublished on screen), W (published in OLD; unpublished, moved, OLD deleted on screen),
//       B (submitted, in the workflow), C (OJS: scheduled in Vol. 2), D (declined).
//       OMP: A in series 1 with two formats, N in no series, F0 with no format, V with two formats (one taken out
//       of availability on screen), X with one format.
//   C2  a second context with one published item E.
//   C3  paging: OJS 510 published articles, OMP 11 books x 10 formats, OPS 105 posted preprints.
//   C4  OJS: subscription journal, JATS plugin on, one article in a subscription issue (the JATS error row).
// Every OAI answer is opened in a signed-out browser (the "browser view", recorded with screen()) and read
// raw through the same browser context's request API. Database reads (psql SELECT) are evidence only.
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const T = 30_000;
const ALL = ['seed', 'bulk', 'lists', 'sets', 'errors', 'dates', 'paging', 'unpub', 'reissue', 'issue', 'section', 'datestamp', 'jats', 'sweep'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const log = (...a) => console.log('[k2]', ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const statePath = (app) => path.join(outDir(), `k2-state-${app.name}.json`);
const day = (offset = 0) => new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
const REPO_ID = {ojs: 'ojs-test.localhost', omp: 'omp-test.localhost', ops: 'ops-test.localhost'};
const KIND = {ojs: 'article', omp: 'publicationFormat', ops: 'preprint'};

function psql(app, sql) {
    try {
        return execFileSync('psql', [`${dbName(app)}`, '-At', '-F', '|', '-c', sql], {encoding: 'utf8'}).trim();
    } catch (e) {
        return `psql error: ${flat(e.message, 200)}`;
    }
}

// ---------------------------------------------------------------- the OAI answer, parsed
function attrs(s) {
    const o = {};
    for (const m of String(s || '').matchAll(/(\w+)="([^"]*)"/g)) o[m[1]] = m[2];
    return o;
}
function parseOai(xml) {
    const g = (re, s = xml) => { const r = String(s).match(re); return r ? r[1] : null; };
    const out = {};
    out.responseDate = g(/<responseDate>([^<]*)<\/responseDate>/);
    const req = xml.match(/<request([^>]*)>([^<]*)<\/request>/);
    out.request = req ? {attrs: attrs(req[1]), url: req[2]} : null;
    out.errors = [...xml.matchAll(/<error code="([^"]*)">([^<]*)<\/error>/g)].map((e) => ({code: e[1], message: e[2]}));
    out.verb = g(/<(Identify|ListRecords|ListIdentifiers|ListSets|ListMetadataFormats|GetRecord)>/);
    out.records = [...xml.matchAll(/<header( status="deleted")?>([\s\S]*?)<\/header>([\s\S]*?)(?=<header|<\/ListRecords>|<\/ListIdentifiers>|<\/GetRecord>|<resumptionToken|$)/g)].map((h) => ({
        id: g(/<identifier>([^<]*)</, h[2]),
        datestamp: g(/<datestamp>([^<]*)</, h[2]),
        sets: [...h[2].matchAll(/<setSpec>([^<]*)</g)].map((x) => x[1]),
        deleted: !!h[1],
        metadata: /<metadata>/.test(h[3]),
        title: g(/<dc:title[^>]*>([^<]*)</, h[3]),
    }));
    out.sets = [...xml.matchAll(/<set>\s*<setSpec>([^<]*)<\/setSpec>\s*<setName>([^<]*)<\/setName>/g)].map((x) => ({spec: x[1], name: x[2]}));
    const tok = xml.match(/<resumptionToken([^>]*?)(?:\/>|>([^<]*)<\/resumptionToken>)/);
    out.token = tok ? {attrs: attrs(tok[1]), value: tok[2] || ''} : null;
    return out;
}
const brief = (p) => ({status: p.status, verb: p.verb, errors: p.errors, request: p.request, count: p.records.length,
    records: p.records.slice(0, 40).map((r) => `${r.deleted ? 'DELETED ' : ''}${r.id} ${r.datestamp} [${r.sets.join(',')}]${r.metadata ? ' md' : ''}${r.title ? ` "${flat(r.title, 60)}"` : ''}`),
    sets: p.sets.length > 40 ? {count: p.sets.length, first: p.sets.slice(0, 10), last: p.sets.slice(-5)} : p.sets, token: p.token, responseDate: p.responseDate});

forEachApp(async (app) => {
    const A = app.name;
    const isOJS = A === 'ojs', isOMP = A === 'omp', isOPS = A === 'ops';
    const S = fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 2));
    const fact = (k, v) => { record('k2-facts', {[k]: v}, {merge: true}); log(`[${A} ${k}]`, JSON.stringify(v).slice(0, 2500)); };
    const q = (sql) => psql(A, sql);
    const myCrashes = [];

    // ------------------------------------------------------------ seed (no browser)
    if (on('seed') && !S.t) {
        const t = tag('u19k2');
        S.t = t; save();
        const U = (k) => `${t}${k}`;
        const mk = async (key, extra) => {
            const spec = {tag: U(key), context: {name: `K2 ${key.toUpperCase()} ${t}`}, users: [{username: U(`${key}mg`), roles: ['manager']}, {username: U(`${key}au`), roles: ['author']}], ...extra};
            const r = await app.api.createContext(spec);
            return {id: r.contextId, path: r.path || U(key), mg: U(`${key}mg`), au: U(`${key}au`), name: spec.context.name};
        };
        const sections = [{abbrev: isOPS ? 'PRE' : 'ART', title: isOPS ? 'Preprints' : 'Articles'}, {abbrev: 'É D', title: 'Études Diverses'}, {abbrev: 'OLD', title: 'Old Section'}];
        S.C1 = await mk('c1', isOMP ? {} : {sections, ...(isOJS ? {issues: [{volume: 1, number: 1, year: 2026, published: true}, {volume: 2, number: 1, year: 2027}, {volume: 3, number: 1, year: 2026, published: true}]} : {})});
        S.C2 = await mk('c2', {});
        save();
        fact('contexts', {C1: S.C1, C2: S.C2});
        S.subs = {}; S.times = {};
        const first = isOPS ? 'PRE' : 'ART';
        const sub = async (C, key, extra) => {
            const before = new Date().toISOString();
            try {
                const r = await app.api.createSubmission({context: C.path, submitter: C.au, tag: `${t}${key.toLowerCase()}`, title: `K2 ${key} ${t}`, ...extra});
                S.subs[key] = {id: r.submissionId, pub: r.publicationId, ctx: C.path, title: `K2 ${key} ${t}`, status: r.status, formats: r.publicationFormats};
            } catch (e) {
                S.subs[key] = {error: flat(e.message, 600)};
            }
            S.times[key] = {before, after: new Date().toISOString()};
            save();
            await sleep(1100); // one datestamp second apart
        };
        if (isOMP) {
            // OMP series: added on screen after the seed (phase "series" inside seed below)
            const {page, close} = await launch(app);
            try {
                await signIn(page, S.C1.mg, {contextPath: S.C1.path});
                S.series = [];
                for (const [title, p] of [['Series One', 'ser1'], ['Série Deux', 'ser2']]) {
                    await page.goto(app.url(`/index.php/${S.C1.path}/en/management/settings/context`));
                    await idle(page);
                    const tab = page.getByRole('tab', {name: 'Series', exact: true}).first();
                    await tab.waitFor({timeout: T}); await tab.click(); await idle(page);
                    const grid = page.locator('#seriesGridContainer');
                    await grid.getByRole('link', {name: /Add Series/}).click();
                    const form = page.locator('form#seriesForm');
                    await form.locator('input[name^="title"]').first().waitFor({timeout: T});
                    await idle(page); await sleep(500);
                    await form.locator('input[name^="title"]').first().fill(title);
                    await form.locator('input[name="path"]').fill(p);
                    await form.getByRole('button', {name: 'Save'}).click();
                    await form.waitFor({state: 'hidden', timeout: T}).catch(() => {});
                    await idle(page); await sleep(800);
                    S.series.push({title, path: p});
                }
                const s = await screen(page); record('s-00-series-added', s); await shot(page, 's-00-series-added');
            } finally { await close(); }
            S.seriesRows = q(`select s.series_id, s.path from series s where s.press_id=${S.C1.id} order by 1`);
            save();
            await sub(S.C1, 'A', {published: true, series: 'ser1', publicationFormats: [{name: 'PDF'}, {name: 'EPUB'}]});
            await sub(S.C1, 'X', {published: true, series: 'ser1', publicationFormats: [{name: 'PDF'}]});
            await sub(S.C1, 'ED', {published: true, series: 'ser2', publicationFormats: [{name: 'PDF'}]});
            await sub(S.C1, 'N', {published: true, publicationFormats: [{name: 'PDF'}]});
            await sub(S.C1, 'F0', {published: true});
            await sub(S.C1, 'V', {published: true, publicationFormats: [{name: 'PDF'}, {name: 'EPUB'}]});
            await sub(S.C1, 'B', {});
            await sub(S.C1, 'D', {decisions: ['initialDecline']});
            await sub(S.C2, 'E', {published: true, publicationFormats: [{name: 'PDF'}]});
        } else {
            await sub(S.C1, 'A', {published: true, section: first});
            await sub(S.C1, 'X', {published: true, section: first});
            await sub(S.C1, 'ED', {published: true, section: 'É D'});
            if (isOJS) await sub(S.C1, 'Q', {published: true, section: first, issue: {volume: 3, number: 1, year: 2026}});
            if (isOJS) await sub(S.C1, 'I', {published: true, section: first, issue: {volume: 1, number: 1, year: 2026}});
            await sub(S.C1, 'W', {published: true, section: 'OLD'});
            await sub(S.C1, 'B', {section: first});
            if (isOJS) await sub(S.C1, 'C', {published: true, section: first, issue: {volume: 2, number: 1, year: 2027}});
            await sub(S.C1, 'D', {section: first, decisions: [isOPS ? 'decline' : 'initialDecline']});
            await sub(S.C2, 'E', {published: true});
        }
        fact('subs', S.subs);
        fact('seed-db', isOMP
            ? q(`select s.submission_id, s.status, p.publication_id, p.status, p.series_id, pf.publication_format_id, pf.is_available, pf.is_approved from submissions s join publications p on p.publication_id=s.current_publication_id left join publication_formats pf on pf.publication_id=p.publication_id where s.context_id in (${S.C1.id},${S.C2.id}) order by 1, pf.publication_format_id`)
            : q(`select s.submission_id, s.status, p.publication_id, p.status, p.section_id, ${isOJS ? 'p.issue_id' : 'null'}, s.last_modified, p.last_modified, p.date_published from submissions s join publications p on p.publication_id=s.current_publication_id where s.context_id in (${S.C1.id},${S.C2.id}) order by 1`));
        save();
    }
    if (!S.t) { log('no state; run the seed phase'); return; }
    if (on('seed') && S.subs && S.subs.D && S.subs.D.error && isOPS) {
        const r = await app.api.createSubmission({context: S.C1.path, submitter: S.C1.au, tag: `${S.t}d`, title: `K2 D ${S.t}`, section: 'PRE', decisions: ['decline']});
        S.subs.D = {id: r.submissionId, pub: r.publicationId, ctx: S.C1.path, title: `K2 D ${S.t}`, status: r.status};
        save(); fact('subs-D', S.subs.D);
    }
    const t = S.t;

    // ------------------------------------------------------------ bulk seeds: paging (C3) and the JATS journal (C4)
    if (on('bulk') && !S.C3) {
        const U = (k) => `${t}${k}`;
        const r = await app.api.createContext({tag: U('c3'), context: {name: `K2 C3 ${t}`}, users: [{username: U('c3au'), roles: ['author']}]});
        S.C3 = {id: r.contextId, path: r.path || U('c3'), au: U('c3au')};
        save();
        const n = isOJS ? 510 : isOMP ? 11 : 105;
        const jobs = [...Array(n).keys()];
        let done = 0, failed = 0;
        const worker = async () => {
            while (jobs.length) {
                const i = jobs.shift();
                const spec = {context: S.C3.path, submitter: S.C3.au, tag: `${t}p${i}`, title: `K2 Paging ${i} ${t}`, published: true};
                if (isOMP) spec.publicationFormats = [...Array(10).keys()].map((k) => ({name: `F${k}`}));
                try { await app.api.createSubmission(spec); done++; } catch (e) { failed++; if (failed < 3) log('bulk fail', flat(e.message, 300)); }
            }
        };
        const t0 = Date.now();
        await Promise.all([worker(), worker(), worker(), worker()]);
        S.C3.seeded = {n, done, failed, seconds: Math.round((Date.now() - t0) / 1000)};
        if (isOJS) {
            const j = await app.api.createContext({tag: U('c4'), context: {name: `K2 C4 ${t}`}, publishingMode: 'subscription',
                issues: [{volume: 1, number: 1, year: 2026, published: true}],
                plugins: {oaimetadataformatplugin_jats: {enabled: true}},
                users: [{username: U('c4au'), roles: ['author']}]});
            S.C4 = {id: j.contextId, path: j.path || U('c4'), au: U('c4au')};
            const s1 = await app.api.createSubmission({context: S.C4.path, submitter: S.C4.au, tag: `${t}j1`, title: `K2 JATS Sub ${t}`, published: true, issue: {volume: 1, number: 1, year: 2026}});
            const s2 = await app.api.createSubmission({context: S.C4.path, submitter: S.C4.au, tag: `${t}j2`, title: `K2 JATS NoIssue ${t}`, published: true});
            S.C4.subs = {inIssue: s1.submissionId, noIssue: s2.submissionId};
        }
        save();
        fact('bulk', {C3: S.C3, C4: S.C4 || null});
    }

    // ------------------------------------------------------------ browsers
    const vis = await launch(app); // a signed-out harvester
    const V = vis.page;
    const staff = await launch(app);
    const page = staff.page;
    const dialogs = [];
    page.on('dialog', async (d) => {
        dialogs.push({type: d.type(), message: d.message(), url: page.url()});
        if (d.type() === 'beforeunload') await d.accept().catch(() => {}); else await d.dismiss().catch(() => {});
    });
    const cu = (ctx, qs) => app.url(`/index.php/${ctx || 'index'}/oai${qs ? `?${qs}` : ''}`);
    const id = (key) => `oai:${REPO_ID[A]}:${KIND[A]}/${key}`;
    // one OAI request: the browser view (screen) + the raw XML
    async function oai(label, ctx, qs, {view = true} = {}) {
        const url = cu(ctx, qs);
        let viewStatus = null, s = null;
        if (view) {
            const resp = await V.goto(url).catch((e) => ({err: flat(e.message, 200)}));
            viewStatus = resp && typeof resp.status === 'function' ? resp.status() : resp && resp.err;
            await idle(V).catch(() => {});
            try { s = await screen(V); } catch (e) { s = {url: V.url(), screenError: flat(e.message, 300)}; }
        }
        const r = await V.request.get(url).catch((e) => null);
        const body = r ? await r.text() : '';
        const p = parseOai(body);
        p.status = r ? r.status() : null;
        p.viewStatus = viewStatus;
        if (p.status >= 500) { myCrashes.push({label, url: url.replace(app.baseURL, ''), status: p.status, body: flat(body, 300)}); p.body = flat(body, 600); }
        if (view) record(label, {url: url.replace(app.baseURL, ''), viewStatus, parsed: brief(p), pageText: s && s.text ? flat(s.text.main, 6000) : null, screen: s});
        return p;
    }
    const ids = (p) => p.records.map((r) => `${r.deleted ? 'D:' : ''}${r.id.replace(/^.*[:/]/, '')}`);
    const mine = (p, extraIds = []) => {
        const want = new Set([...Object.values(S.subs || {}).filter((x) => x.id).map((x) => String(x.id)), ...extraIds.map(String)]);
        return p.records.filter((r) => want.has(r.id.replace(/^.*\//, '')));
    };
    const fmtIds = () => (isOMP ? q(`select pf.publication_format_id, p.submission_id from publication_formats pf join publications p on p.publication_id=pf.publication_id join submissions s on s.submission_id=p.submission_id where s.context_id in (${S.C1.id},${S.C2.id}) order by 1`) : null);
    async function sect(name, fn) {
        log(`--- ${name}`);
        try { await fn(); } catch (e) {
            fact(`${name}-error`, flat(e.stack || e.message, 1500));
            try { record(`err-${name}`, await screen(page)); await shot(page, `err-${name}`); } catch (x) { /* none */ }
        }
    }
    const C1 = S.C1.path, C2 = S.C2.path;
    let who = null;

    try {
        // ======================================================== Rule 3 (what a context lists), 7d, Rule 6 order, 3a/3b
        if (on('lists')) await sect('lists', async () => {
            const out = {};
            const li = await oai('l-01-c1-listidentifiers', C1, 'verb=ListIdentifiers&metadataPrefix=oai_dc');
            const lr = await oai('l-02-c1-listrecords', C1, 'verb=ListRecords&metadataPrefix=oai_dc');
            out.c1Identifiers = ids(li); out.c1Records = ids(lr);
            out.c1RecordDetail = brief(lr).records;
            out.c2Records = ids(await oai('l-03-c2-listrecords', C2, 'verb=ListRecords&metadataPrefix=oai_dc'));
            out.subs = Object.fromEntries(Object.entries(S.subs).map(([k, v]) => [k, v.id]));
            if (isOMP) out.formats = fmtIds();
            if (isOMP) out.formatsDb = q(`select pf.publication_format_id, p.submission_id, pf.is_available, pf.is_approved, p.series_id from publication_formats pf join publications p on p.publication_id=pf.publication_id join submissions s on s.submission_id=p.submission_id where s.context_id in (${S.C1.id},${S.C2.id}) order by 1`);
            // site-wide: C1's and C2's items in the whole list (ListIdentifiers, all parts)
            let p = await oai('l-04-site-listidentifiers', null, 'verb=ListIdentifiers&metadataPrefix=oai_dc');
            const all = [...p.records]; let guard = 0;
            while (p.token && p.token.value && guard++ < 10) { p = await oai(`l-04-site-listidentifiers-${guard}`, null, `verb=ListIdentifiers&resumptionToken=${p.token.value}`, {view: false}); all.push(...p.records); }
            const siteMine = mine({records: all}, isOMP ? (fmtIds() || '').split('\n').map((l) => l.split('|')[0]) : []);
            out.site = {total: all.length, mine: siteMine.map((r) => `${r.deleted ? 'D:' : ''}${r.id} ${r.datestamp} [${r.sets}]`)};
            // order: position of each context's block in the site list (Rule 6 "journal by journal")
            const ctxOf = (r) => (r.sets[0] || '').split(':')[0];
            const blocks = []; for (const r of all) { const c = `${r.deleted ? 'D:' : ''}${ctxOf(r)}`; if (!blocks.length || blocks[blocks.length - 1].c !== c) blocks.push({c, n: 1}); else blocks[blocks.length - 1].n++; }
            out.siteBlocks = {count: blocks.length, head: blocks.slice(0, 8), tail: blocks.slice(-8), deletedPositions: all.map((r, i) => (r.deleted ? i : null)).filter((x) => x !== null)};
            out.siteOrderIds = all.filter((r) => !r.deleted).map((r) => +r.id.replace(/^.*\//, ''));
            out.siteOrderSorted = out.siteOrderIds.every((v, i, a) => i === 0 || a[i - 1] <= v);
            out.c1OrderSorted = lr.records.map((r) => +r.id.replace(/^.*\//, '')).every((v, i, a) => i === 0 || a[i - 1] <= v);
            out.db = isOMP ? null : q(`select s.submission_id, s.status, p.status, ${isOJS ? 'p.issue_id' : 'p.date_published'}, p.section_id from submissions s join publications p on p.publication_id=s.current_publication_id where s.context_id=${S.C1.id} order by 1`);
            fact('lists', out);
        });

        // ======================================================== Rules 7–8 (sets; asking for a set), OMP3
        if (on('sets')) await sect('sets', async () => {
            const out = {};
            const ls = await oai('t-01-c1-listsets', C1, 'verb=ListSets');
            out.c1Sets = ls.sets;
            const lr = await oai('t-02-c1-listrecords', C1, 'verb=ListRecords&metadataPrefix=oai_dc', {view: false});
            out.headerSets = lr.records.map((r) => `${r.id.replace(/^.*\//, '')}: ${r.sets.join(' | ')}`);
            const setQs = isOMP
                ? [['press', C1], ['ser1', `${C1}:ser1`], ['ser2', `${C1}:ser2`], ['nosuchseries', `${C1}:nosuchseries`], ['otherpress', `${C2}`], ['nosuchpress', 'nosuchpress'], ['pkseries', 'publicknowledge:monographs']]
                : [['journal', C1], ['first', `${C1}:${isOPS ? 'PRE' : 'ART'}`], ['ED', `${C1}:ED`], ['ÉD-raw', `${C1}:%C3%89D`], ['other', `${C2}:${isOPS ? 'PRE' : 'ART'}`], ['otherjournal', C2], ['nosuchset', 'nosuchset'], ['nosuchsection', `${C1}:NOPE`], ['pk', 'publicknowledge']];
            out.bySet = {};
            for (const [k, v] of setQs) {
                const p = await oai(`t-03-set-${k.replace(/[^a-z0-9]/gi, '')}`, C1, `verb=ListRecords&metadataPrefix=oai_dc&set=${v}`);
                out.bySet[k] = {set: v, status: p.status, errors: p.errors, ids: ids(p), ctxs: [...new Set(p.records.map((r) => (r.sets[0] || '').split(':')[0]))]};
            }
            // the same at the site-wide address
            out.siteBySet = {};
            for (const [k, v] of setQs) {
                const p = await oai(`t-04-site-set-${k.replace(/[^a-z0-9]/gi, '')}`, null, `verb=ListIdentifiers&metadataPrefix=oai_dc&set=${v}`, {view: k === 'nosuchpress' || k === 'nosuchset'});
                out.siteBySet[k] = {set: v, status: p.status, errors: p.errors, count: p.records.length, ctxs: [...new Set(p.records.map((r) => (r.sets[0] || '').split(':')[0]))].slice(0, 12), total: p.token && p.token.attrs.completeListSize};
            }
            out.sectionsDb = isOMP ? q(`select series_id, path from series where press_id=${S.C1.id}`) : q(`select s.section_id, ss.setting_name, ss.locale, ss.setting_value from sections s join section_settings ss on ss.section_id=s.section_id where s.${isOJS ? 'journal_id' : 'server_id'}=${S.C1.id} and ss.setting_name in ('abbrev','title') order by 1,2,3`);
            fact('sets', out);
        });

        // ======================================================== Errors table, Rule 14, Rule 15 (one record), Rule 2 request echo
        if (on('errors')) await sect('errors', async () => {
            const out = {};
            const aId = S.subs.A.id;
            const recId = isOMP ? (q(`select min(pf.publication_format_id) from publication_formats pf join publications p on p.publication_id=pf.publication_id where p.submission_id=${aId}`)) : aId;
            const eId = isOMP ? (q(`select min(pf.publication_format_id) from publication_formats pf join publications p on p.publication_id=pf.publication_id where p.submission_id=${S.subs.E.id}`)) : S.subs.E.id;
            S.recA = recId; S.recE = eId; save();
            const cases = [
                ['e01-noverb', ''],
                ['e02-identify-lower', 'verb=identify'],
                ['e03-badverb', 'verb=Foo'],
                ['e04-missing-prefix', 'verb=ListRecords'],
                ['e05-missing-identifier', 'verb=GetRecord&metadataPrefix=oai_dc'],
                ['e06-twice-prefix', 'verb=ListRecords&metadataPrefix=oai_dc&metadataPrefix=oai_dc'],
                ['e07-twice-set', `verb=ListRecords&metadataPrefix=oai_dc&set=${C1}&set=${C1}`],
                ['e08-illegal-arg', 'verb=Identify&foo=bar'],
                ['e09-illegal-set-on-identify', `verb=Identify&set=${C1}`],
                ['e10-token-plus-arg', 'verb=ListRecords&metadataPrefix=oai_dc&resumptionToken=abc'],
                ['e11-listsets-token-plus-prefix', 'verb=ListSets&resumptionToken=abc&metadataPrefix=oai_dc'],
                ['e12-token-abc', 'verb=ListRecords&resumptionToken=abc'],
                ['e13-listsets-token-abc', 'verb=ListSets&resumptionToken=abc'],
                ['e14-id-bad-shape', 'verb=GetRecord&metadataPrefix=oai_dc&identifier=foo'],
                ['e15-id-abc', `verb=GetRecord&metadataPrefix=oai_dc&identifier=${id('abc')}`],
                ['e16-id-other-repo', `verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:other.example:${KIND[A]}/${recId}`],
                ['e17-id-tail', `verb=GetRecord&metadataPrefix=oai_dc&identifier=${id(`${recId}abc`)}`],
                ['e18-id-none', `verb=GetRecord&metadataPrefix=oai_dc&identifier=${id(99999999)}`],
                ['e19-lmf-id-none', `verb=ListMetadataFormats&identifier=${id(99999999)}`],
                ['e20-prefix-foo-lr', 'verb=ListRecords&metadataPrefix=foo'],
                ['e21-prefix-foo-li', 'verb=ListIdentifiers&metadataPrefix=foo'],
                ['e22-prefix-foo-gr', `verb=GetRecord&metadataPrefix=foo&identifier=${id(recId)}`],
                ['e23-prefix-jats', `verb=ListRecords&metadataPrefix=jats`],
                ['e24-norecords', 'verb=ListRecords&metadataPrefix=oai_dc&set=nosuchset'],
                ['e25-from-bad', 'verb=ListRecords&metadataPrefix=oai_dc&from=26-09-2026'],
                ['e26-until-bad', 'verb=ListRecords&metadataPrefix=oai_dc&until=2026/09/26'],
                ['e27-from-after-until', `verb=ListRecords&metadataPrefix=oai_dc&from=${day(1)}&until=${day(0)}`],
                ['e28-granularity', `verb=ListRecords&metadataPrefix=oai_dc&from=${day(0)}&until=${day(0)}T23:59:59Z`],
                ['e29-empty-verb', 'verb='],
                ['e30-empty-from', 'verb=ListRecords&metadataPrefix=oai_dc&from='],
                ['e31-identify-after', 'verb=Identify'],
                ['e32-getrecord-ok', `verb=GetRecord&metadataPrefix=oai_dc&identifier=${id(recId)}`],
                ['e33-getrecord-other-ctx', `verb=GetRecord&metadataPrefix=oai_dc&identifier=${id(eId)}`],
                ['e34-lmf-other-ctx', `verb=ListMetadataFormats&identifier=${id(eId)}`],
                ['e35-getrecord-unpublished-B', `verb=GetRecord&metadataPrefix=oai_dc&identifier=${id(isOMP ? 99999998 : S.subs.B.id)}`],
            ];
            out.cases = {};
            for (const [k, qs] of cases) {
                const p = await oai(`e-${k}`, C1, qs);
                out.cases[k] = {qs, status: p.status, verb: p.verb, errors: p.errors, requestAttrs: p.request && p.request.attrs, count: p.records.length, first: p.records[0] ? `${p.records[0].id} ${p.records[0].deleted ? 'deleted' : ''}` : null};
            }
            // Rule 15 at the site-wide address
            out.site = {};
            for (const [k, qs] of [['c1', `verb=GetRecord&metadataPrefix=oai_dc&identifier=${id(recId)}`], ['c2', `verb=GetRecord&metadataPrefix=oai_dc&identifier=${id(eId)}`], ['none', `verb=GetRecord&metadataPrefix=oai_dc&identifier=${id(99999999)}`]]) {
                const p = await oai(`e-site-${k}`, null, qs);
                out.site[k] = {status: p.status, errors: p.errors, first: p.records[0] ? `${p.records[0].id} [${p.records[0].sets}] md=${p.records[0].metadata}` : null};
            }
            // the page of one refusal and of the next request (Rule 14): read on screen
            fact('errors', out);
        });

        // ======================================================== Rule 9 dates, A2, A3, OPS1
        if (on('dates')) await sect('dates', async () => {
            const out = {};
            const d0 = day(0), dp = day(1), dm = day(-1);
            const cases = [
                ['d00-none', ''],
                ['d01-from-today', `from=${d0}`], ['d02-from-tomorrow', `from=${dp}`],
                ['d03-until-yesterday', `until=${dm}`], ['d04-until-today', `until=${d0}`],
                ['d05-from-today-2359', `from=${d0}T23:59:59Z`], ['d06-until-today-0000', `until=${d0}T00:00:00Z`],
                ['d07-from-1301', 'from=2026-13-01'], ['d08-from-0230', 'from=2026-02-30'],
                ['d09-until-1301', 'until=2026-13-01'], ['d10-until-0230', 'until=2026-02-30'], ['d11-until-0302', 'until=2026-03-02'],
                ['d12-from-after-until', `from=${dp}&until=${d0}`], ['d13-mixed', `from=${d0}&until=${d0}T23:59:59Z`],
                ['d14-from-ddmmyyyy', 'from=26-09-2026'], ['d15-from-and-until-today', `from=${d0}&until=${d0}`],
                ['d16-from-2500', `from=${d0}T25:00:00Z`], ['d17-until-2099', 'until=2099-12-31'], ['d18-from-1900', 'from=1900-01-01'],
                ['d19-from-0931', 'from=2026-09-31'], ['d20-until-0931', 'until=2026-09-31'], ['d21-until-0900', 'until=2026-09-00'], ['d22-from-0900', 'from=2026-09-00'],
            ];
            out.now = new Date().toISOString();
            out.cases = {};
            for (const [k, extra] of cases) {
                const qs = `verb=ListRecords&metadataPrefix=oai_dc${extra ? `&${extra}` : ''}`;
                const p = await oai(`d-${k}`, C1, qs);
                out.cases[k] = {extra, status: p.status, errors: p.errors, count: p.records.length, ids: ids(p), datestamps: [...new Set(p.records.map((r) => r.datestamp.slice(0, 10)))]};
            }
            // ListIdentifiers with until (OPS1's other request)
            for (const [k, extra] of [['li-until-today', `until=${d0}`], ['li-from-today', `from=${d0}`]]) {
                const p = await oai(`d-${k}`, C1, `verb=ListIdentifiers&metadataPrefix=oai_dc&${extra}`);
                out.cases[k] = {extra, status: p.status, errors: p.errors, count: p.records.length, body: p.body};
            }
            // the site-wide address with until
            const p = await oai('d-site-until-today', null, `verb=ListIdentifiers&metadataPrefix=oai_dc&until=${d0}`);
            out.cases['site-until-today'] = {status: p.status, errors: p.errors, count: p.records.length, body: p.body};
            out.datestamps = isOMP ? null : q(`select s.submission_id, s.last_modified, p.last_modified from submissions s join publications p on p.publication_id=s.current_publication_id where s.context_id=${S.C1.id} order by 1`);
            fact('dates', out);
        });

        // ======================================================== Rule 13 paging, A4
        if (on('paging')) await sect('paging', async () => {
            const out = {};
            const C3 = S.C3 && S.C3.path;
            // raw walk: ListRecords (100) and ListIdentifiers (500) at C3, ListSets (100) site-wide
            const walk = async (label, ctx, first) => {
                const parts = [];
                let p = await oai(`${label}-0`, ctx, first, {view: false});
                parts.push({n: p.records.length || p.sets.length, token: p.token, responseDate: p.responseDate, errors: p.errors});
                let i = 0;
                while (p.token && p.token.value && i++ < 12) {
                    const verb = first.match(/verb=(\w+)/)[1];
                    p = await oai(`${label}-${i}`, ctx, `verb=${verb}&resumptionToken=${p.token.value}`, {view: false});
                    parts.push({n: p.records.length || p.sets.length, token: p.token, errors: p.errors});
                }
                return parts;
            };
            out.lr = await walk('p-lr', C3, 'verb=ListRecords&metadataPrefix=oai_dc');
            out.li = await walk('p-li', C3, 'verb=ListIdentifiers&metadataPrefix=oai_dc');
            out.ls = await walk('p-ls', null, 'verb=ListSets');
            out.c1Short = (await oai('p-c1-short', C1, 'verb=ListRecords&metadataPrefix=oai_dc', {view: false})).token;
            // a token used twice; a token from C3 at C1's address
            const p0 = await oai('p-reuse-0', C3, 'verb=ListRecords&metadataPrefix=oai_dc', {view: false});
            if (p0.token && p0.token.value) {
                const a1 = await oai('p-reuse-1', C3, `verb=ListRecords&resumptionToken=${p0.token.value}`, {view: false});
                const a2 = await oai('p-reuse-2', C3, `verb=ListRecords&resumptionToken=${p0.token.value}`, {view: false});
                const a3 = await oai('p-reuse-c1', C1, `verb=ListRecords&resumptionToken=${p0.token.value}`, {view: false});
                out.reuse = {first: {n: a1.records.length, e: a1.errors, head: a1.records[0] && a1.records[0].id}, again: {n: a2.records.length, e: a2.errors, head: a2.records[0] && a2.records[0].id}, atC1: {n: a3.records.length, e: a3.errors, ctxs: [...new Set(a3.records.map((r) => (r.sets[0] || '').split(':')[0]))]}};
                out.tokenDb = q(`select token, expire, record_offset from oai_resumption_tokens where token='${p0.token.value}'`);
            }
            // the browser: page through C3's ListRecords with "Resume"
            out.browser = [];
            await V.goto(cu(C3, 'verb=ListRecords&metadataPrefix=oai_dc')); await idle(V);
            for (let i = 0; i < 12; i++) {
                const s = await screen(V);
                const txt = s.text.main || '';
                const part = {url: V.url().replace(app.baseURL, ''), more: /There are more results\./.test(txt), records: (txt.match(/OAI Record: /g) || []).length,
                    completeListSize: (txt.match(/completeListSize\s+(\d+)/) || [])[1] || null, cursor: (txt.match(/cursor\s+(\d+)/) || [])[1] || null,
                    resumeHref: await V.getByRole('link', {name: 'Resume', exact: true}).first().getAttribute('href').catch(() => null)};
                out.browser.push(part);
                record(`p-browser-${i}`, {part, screen: s});
                if (i === 0) await loc(V, 'OAI browser view: "Resume" link', V.getByRole('link', {name: 'Resume', exact: true}));
                if (!part.resumeHref) break;
                const w = V.waitForNavigation({timeout: T}).catch(() => null);
                await V.getByRole('link', {name: 'Resume', exact: true}).first().click();
                await w; await idle(V);
                if (/badResumptionToken|invalid or has expired/.test(await V.locator('body').innerText().catch(() => ''))) {
                    const e = await screen(V);
                    out.browserEnd = {url: V.url().replace(app.baseURL, ''), text: flat(e.text.main, 600)};
                    record('p-browser-end', e); await shot(V, 'p-browser-end');
                    break;
                }
            }
            fact('paging', out);
        });

        // ======================================================== Rule 4 (deleted records), A1, Rule 15 (a deleted one), 4a
        const readX = async (label, extraIds = []) => {
            const r = {};
            const rid = isOMP ? S.xFormats : [S.subs.X.id];
            const lr = await oai(`${label}-c1-lr`, C1, 'verb=ListRecords&metadataPrefix=oai_dc');
            const li = await oai(`${label}-c1-li`, C1, 'verb=ListIdentifiers&metadataPrefix=oai_dc', {view: false});
            r.c1Lr = ids(lr); r.c1Li = ids(li);
            r.c1Deleted = lr.records.filter((x) => x.deleted).map((x) => `${x.id} ${x.datestamp} [${x.sets}] md=${x.metadata}`);
            r.c1GetX = {};
            for (const x of rid) {
                const g = await oai(`${label}-c1-get-${x}`, C1, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${id(x)}`);
                r.c1GetX[x] = {errors: g.errors, rec: g.records[0] ? `${g.records[0].deleted ? 'DELETED ' : ''}${g.records[0].id} ${g.records[0].datestamp} [${g.records[0].sets}] md=${g.records[0].metadata}` : null};
                const gs = await oai(`${label}-site-get-${x}`, null, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${id(x)}`);
                r.siteGetX = r.siteGetX || {};
                r.siteGetX[x] = {errors: gs.errors, rec: gs.records[0] ? `${gs.records[0].deleted ? 'DELETED ' : ''}${gs.records[0].id} ${gs.records[0].datestamp} [${gs.records[0].sets}] md=${gs.records[0].metadata}` : null};
            }
            // the whole site list, the context's items in it
            let p = await oai(`${label}-site-li`, null, 'verb=ListIdentifiers&metadataPrefix=oai_dc', {view: false});
            const all = [...p.records]; let g = 0;
            while (p.token && p.token.value && g++ < 10) { p = await oai(`${label}-site-li-${g}`, null, `verb=ListIdentifiers&resumptionToken=${p.token.value}`, {view: false}); all.push(...p.records); }
            const want = new Set([...rid.map(String), ...extraIds.map(String)]);
            r.site = all.filter((x) => want.has(x.id.replace(/^.*\//, ''))).map((x) => `${x.deleted ? 'DELETED ' : ''}${x.id} ${x.datestamp} [${x.sets}] pos=${all.indexOf(x)}/${all.length}`);
            r.siteDeletedCtxs = [...new Set(all.filter((x) => x.deleted).map((x) => (x.sets[0] || '').split(':')[0]))];
            // with a set naming the context, at the site-wide address
            const ss = await oai(`${label}-site-set`, null, `verb=ListIdentifiers&metadataPrefix=oai_dc&set=${C1}`, {view: false});
            r.siteSetC1 = ids(ss);
            r.tombstones = q(`select t.tombstone_id, t.data_object_id, t.set_spec, t.set_name, t.oai_identifier, t.date_deleted, (select string_agg(assoc_type||':'||assoc_id, ',') from data_object_tombstone_oai_set_objects o where o.tombstone_id=t.tombstone_id) from data_object_tombstones t where t.set_spec like '${C1}%' order by 1`);
            return r;
        };
        const wfUrl = (ctx, sid, pub, key = 'titleAbstract') => app.url(`/index.php/${ctx}/dashboard/editorial?workflowSubmissionId=${sid}&workflowMenuKey=publication_${pub}_${key}`);
        const wf = () => page.locator('[role="dialog"]:visible').first();
        async function asMgr(C) {
            if (who === C.mg) return;
            await signIn(page, C.mg, {contextPath: C.path});
            who = C.mg;
        }
        async function controls() {
            return wf().locator('[data-cy="workflow-controls-right"] button, [data-cy="workflow-controls-left"] button').evaluateAll((els) => els.map((e) => ({text: e.textContent.replace(/\s+/g, ' ').trim(), disabled: e.disabled}))).catch(() => []);
        }
        async function unpublishOnScreen(sub, name) {
            const o = {};
            await page.goto(wfUrl(sub.ctx, sub.id, sub.pub)); await idle(page);
            const btn = page.getByRole('button', {name: isOPS ? 'Unpost' : 'Unpublish', exact: true}).first();
            await btn.waitFor({state: 'visible', timeout: T});
            const s0 = await screen(page); record(`${name}-before`, s0); await shot(page, `${name}-before`);
            o.controlsBefore = await controls();
            await btn.click();
            const dlg = page.getByRole('dialog').filter({hasText: isOPS ? "Are you sure you don't want this to be posted?" : "Are you sure you don't want this to be published?"}).last();
            await dlg.waitFor({state: 'visible', timeout: T});
            o.confirm = flat(await dlg.innerText().catch(() => null), 400);
            const done = page.waitForResponse((r) => r.url().includes('/unpublish') && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
            o.at = new Date().toISOString();
            await dlg.getByRole('button', {name: isOPS ? 'Unpost' : 'Unpublish', exact: true}).last().click();
            const r = await done;
            o.status = r ? r.status() : null;
            await dlg.waitFor({state: 'detached', timeout: T}).catch(() => {});
            await idle(page); await sleep(800);
            const s1 = await screen(page); record(`${name}-after`, s1); await shot(page, `${name}-after`);
            o.controlsAfter = await controls();
            o.statusLine = flat((s1.text.dialog || '').split('\n').find((l) => /Status|Unpublished|Unposted|Published|Posted/i.test(l)), 200);
            // after a reload
            await page.reload(); await idle(page); await sleep(800);
            o.controlsReload = await controls();
            return o;
        }
        async function publishOnScreen(sub, name) {
            const o = {};
            await page.goto(wfUrl(sub.ctx, sub.id, sub.pub)); await idle(page);
            const pb = page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: isOPS ? /^(Post|Post the preprint)$/ : /^(Schedule For Publication|Publish)$/}).first();
            await pb.waitFor({state: 'visible', timeout: T});
            o.button = flat(await pb.innerText(), 60);
            await pb.click(); await idle(page); await sleep(600);
            const panel = page.locator('[role="dialog"]:visible').last();
            const stage = panel.locator('select[name="versionStage"]');
            if (await stage.isVisible().catch(() => false)) { if (!(await stage.inputValue().catch(() => ''))) await stage.selectOption('VoR').catch(() => {}); }
            const minor = panel.locator('select[name="versionIsMinor"]');
            if (await minor.isVisible().catch(() => false)) { if (!(await minor.inputValue().catch(() => ''))) await minor.selectOption('false').catch(() => {}); }
            const dont = panel.getByRole('radio', {name: "Don't Assign To An Issue"});
            if (await dont.isVisible().catch(() => false)) { await panel.locator('input[name="assignment"]:checked').first().waitFor({timeout: 10_000}).catch(() => {}); await dont.check(); }
            o.panel = flat(await panel.innerText().catch(() => null), 600);
            const confirmBtn = panel.getByRole('button', {name: /^(Confirm|Publish|Post)$/}).last();
            const done = page.waitForResponse((r) => /\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await confirmBtn.click(); await sleep(800);
            const conf = page.getByRole('dialog').filter({hasText: /Are you sure you want to (publish|post) this\?/}).last();
            if (await conf.isVisible().catch(() => false)) {
                o.confirm = flat(await conf.innerText().catch(() => null), 300);
                await conf.getByRole('button', {name: /^(Publish|Post)$/}).last().click();
            }
            o.at = new Date().toISOString();
            const r = await done;
            o.status = r ? r.status() : null;
            await idle(page); await sleep(1200);
            const s = await screen(page); record(`${name}`, s); await shot(page, `${name}`);
            o.controls = await controls();
            return o;
        }

        if (on('unpub') && !S.unpubDone) await sect('unpub', async () => {
            const out = {};
            if (isOMP) S.xFormats = (q(`select pf.publication_format_id from publication_formats pf where pf.publication_id=${S.subs.X.pub} order by 1`) || '').split('\n').filter(Boolean);
            save();
            out.before = await readX('u-01-before');
            await asMgr(S.C1);
            out.unpublish = await unpublishOnScreen(S.subs.X, 'u-02-unpublish-x');
            await sleep(1500);
            out.after = await readX('u-03-after-unpublish');
            out.db = q(`select submission_id, status, last_modified from submissions where submission_id=${S.subs.X.id}`);
            // "Delete" among the workflow's controls, after the unpublish (the article deleted, Rule 4)
            out.deleteOffered = (out.unpublish.controlsReload || []).filter((c) => /Delete/i.test(c.text));
            S.unpubDone = true; S.unpubAt = out.unpublish.at; save();
            fact('unpub', out);
        });
        if (on('reissue') && S.unpubDone && !S.republishDone) await sect('reissue', async () => {
            const out = {};
            await asMgr(S.C1);
            out.publish = await publishOnScreen(S.subs.X, 'r-01-republish-x');
            await sleep(1500);
            out.after = await readX('r-02-after-republish');
            S.republishDone = true; save();
            // OMP 4a: one format of V out of availability ("Available" → "Not Available" on the Publication Formats page)
            if (isOMP) {
                const vf = (q(`select publication_format_id from publication_formats where publication_id=${S.subs.V.pub} order by 1`) || '').split('\n').filter(Boolean);
                S.vFormats = vf; save();
                await page.goto(wfUrl(S.C1.path, S.subs.V.id, S.subs.V.pub, 'publicationFormats')); await idle(page); await sleep(800);
                const s0 = await screen(page); record('r-03-formats-before', s0); await shot(page, 'r-03-formats-before');
                const row = wf().locator('tr').filter({hasText: 'EPUB'}).filter({has: page.locator('.onix_code')}).first();
                const avail = row.getByRole('link', {name: /^Available$/}).first();
                await loc(page, 'Publication Formats: the EPUB row "Available" link', avail);
                out.vRow = flat(await row.innerText().catch(() => null), 300);
                if (await avail.count()) {
                    await avail.click(); await idle(page); await sleep(700);
                    const top = page.locator('[role="dialog"]:visible').last();
                    out.vConfirm = flat(await top.innerText().catch(() => null), 300);
                    await top.getByRole('button', {name: /^(OK|Yes)$/}).first().click().catch(() => {});
                    await idle(page); await sleep(1200);
                    out.vAt = new Date().toISOString();
                }
                out.vRowAfter = flat(await row.innerText().catch(() => null), 300);
                const s1 = await screen(page); record('r-04-formats-after', s1); await shot(page, 'r-04-formats-after');
                const save0 = S.xFormats; S.xFormats = vf;
                out.v = await readX('r-05-v-after-unavailable');
                S.xFormats = save0;
                out.vDb = q(`select publication_format_id, is_available from publication_formats where publication_id=${S.subs.V.pub}`);
            }
            fact('reissue', out);
        });

        // ======================================================== OJS: Unpublish Issue (Rule 4)
        if (on('issue') && isOJS && !S.issueDone) await sect('issue', async () => {
            const out = {};
            const I = S.subs.I;
            const read = async (label) => {
                const g = await oai(`${label}-site-get`, null, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${id(I.id)}`);
                const c = await oai(`${label}-c1-get`, C1, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${id(I.id)}`, {view: false});
                const l = await oai(`${label}-c1-li`, C1, 'verb=ListIdentifiers&metadataPrefix=oai_dc', {view: false});
                return {site: {errors: g.errors, rec: g.records[0] && `${g.records[0].deleted ? 'DELETED ' : ''}${g.records[0].id} ${g.records[0].datestamp} [${g.records[0].sets}] md=${g.records[0].metadata}`},
                    c1: {errors: c.errors, rec: c.records[0] && `${c.records[0].deleted ? 'DELETED ' : ''}${c.records[0].id}`}, c1List: ids(l)};
            };
            out.before = await read('i-01-before');
            await asMgr(S.C1);
            await page.goto(app.url(`/index.php/${C1}/manageIssues`)); await idle(page);
            await page.getByRole('tab', {name: 'Back Issues', exact: true}).click(); await idle(page);
            const panel = page.getByRole('tabpanel', {name: 'Back Issues'});
            await panel.locator('table').first().waitFor({timeout: T}); await idle(page); await sleep(400);
            const row = panel.locator('tr.gridRow').filter({hasText: 'Vol. 1 No. 1 (2026)'}).first();
            await row.waitFor({timeout: T});
            await row.locator('a.show_extras').click();
            const ctl = row.locator('xpath=following-sibling::tr[1]');
            const s0 = await screen(page); record('i-02-back-issues', s0); await shot(page, 'i-02-back-issues');
            await ctl.getByRole('link', {name: 'Unpublish Issue', exact: true}).click();
            const d = page.locator('[role="dialog"]:visible').last();
            await d.waitFor({timeout: T}); await idle(page);
            out.confirm = flat(await d.innerText().catch(() => null), 400);
            const w = page.waitForResponse((r) => r.request().method() === 'POST' && /unpublish-issue|unpublishIssue/i.test(r.url()), {timeout: T}).catch(() => null);
            await d.getByRole('button', {name: 'OK', exact: true}).click();
            const r = await w;
            out.status = r ? r.status() : null; out.at = new Date().toISOString();
            await idle(page); await sleep(1500);
            const s1 = await screen(page); record('i-03-after-unpublish-issue', s1);
            out.after = await read('i-04-after');
            out.db = q(`select s.submission_id, s.status, p.status, p.issue_id from submissions s join publications p on p.publication_id=s.current_publication_id where s.submission_id=${I.id}`);
            out.tomb = q(`select tombstone_id, set_spec, date_deleted from data_object_tombstones where data_object_id=${I.id}`);
            S.issueDone = true; save();
            fact('issue', out);
        });

        // ======================================================== 7c: a section with a deleted record, then deleted
        if (on('section') && !isOMP && !S.sectionDone) await sect('section', async () => {
            const out = {};
            const W = S.subs.W;
            await asMgr(S.C1);
            out.unpublish = await unpublishOnScreen(W, 'c-01-unpublish-w');
            // move W to the first section on its "Publication Settings" (OJS) / "Preprint entry" (OPS) page
            const key = isOJS ? 'issue' : 'preprintEntry';
            await page.goto(wfUrl(C1, W.id, W.pub, key)); await idle(page); await sleep(1000);
            const sel = page.locator('select[name="sectionId"]').first();
            await sel.waitFor({state: 'visible', timeout: T});
            const s0 = await screen(page); record('c-02-section-page', s0); await shot(page, 'c-02-section-page');
            await loc(page, 'Publication settings: the Section select', sel);
            const opts = await sel.locator('option').evaluateAll((els) => els.map((o) => ({v: o.value, t: o.textContent.trim()})));
            out.options = opts;
            const target = opts.find((o) => /Articles|Preprints/.test(o.t));
            await sel.selectOption(target.v);
            const sw = page.waitForResponse((r) => /\/publications\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await wf().getByRole('button', {name: 'Save', exact: true}).last().click();
            const sr = await sw; out.moveSave = sr ? sr.status() : null;
            await idle(page); await sleep(800);
            // delete OLD on Settings › Journal/Server › "Sections"
            await page.goto(app.url(`/index.php/${C1}/management/settings/context`)); await idle(page);
            await page.getByRole('tab', {name: 'Sections', exact: true}).first().click(); await idle(page);
            const grid = page.locator('#sectionsGridContainer');
            const row = grid.locator('tr.gridRow').filter({hasText: 'Old Section'}).first();
            await row.waitFor({timeout: T});
            await row.locator('a.show_extras').click();
            const ctl = row.locator('xpath=following-sibling::tr[1]');
            const s1 = await screen(page); record('c-03-sections', s1); await shot(page, 'c-03-sections');
            await ctl.getByRole('link', {name: 'Delete', exact: true}).click();
            const d = page.locator('[role="dialog"]:visible').last();
            await d.waitFor({timeout: T}); await idle(page);
            out.deleteConfirm = flat(await d.innerText().catch(() => null), 300);
            const dw = page.waitForResponse((r) => r.request().method() === 'POST' && /delete-section|deleteSection/i.test(r.url()), {timeout: T}).catch(() => null);
            await d.getByRole('button', {name: 'OK', exact: true}).click();
            const dr = await dw; out.deleteStatus = dr ? dr.status() : null;
            out.deleteBody = dr ? flat(await dr.text().catch(() => null), 300) : null;
            await idle(page); await sleep(1000);
            const s2 = await screen(page); record('c-04-sections-after', s2); await shot(page, 'c-04-sections-after');
            out.sectionsDb = q(`select s.section_id, ss.setting_value from sections s join section_settings ss on ss.section_id=s.section_id and ss.setting_name='abbrev' where s.${isOJS ? 'journal_id' : 'server_id'}=${S.C1.id} order by 1`);
            const ls = await oai('c-05-c1-listsets', C1, 'verb=ListSets');
            const lss = await oai('c-06-site-listsets-c1', null, 'verb=ListSets', {view: false});
            out.c1Sets = ls.sets;
            out.tombs = q(`select tombstone_id, set_spec, set_name from data_object_tombstones where data_object_id=${W.id}`);
            const lrOld = await oai('c-07-site-set-old', null, `verb=ListIdentifiers&metadataPrefix=oai_dc&set=${C1}:OLD`);
            out.siteSetOld = {errors: lrOld.errors, ids: ids(lrOld)};
            const lrOldC1 = await oai('c-08-c1-set-old', C1, `verb=ListIdentifiers&metadataPrefix=oai_dc&set=${C1}:OLD`);
            out.c1SetOld = {errors: lrOldC1.errors, ids: ids(lrOldC1)};
            S.sectionDone = true; save();
            fact('section', out);
        });

        // ======================================================== Rule 5 datestamps (issue edit on OJS)
        if (on('datestamp') && !S.datestampDone) await sect('datestamp', async () => {
            const out = {};
            const recs = async (label) => {
                const p = await oai(label, C1, 'verb=ListIdentifiers&metadataPrefix=oai_dc', {view: false});
                return Object.fromEntries(p.records.map((r) => [r.id.replace(/^.*\//, ''), `${r.deleted ? 'D ' : ''}${r.datestamp}`]));
            };
            out.times = S.times;
            out.before = await recs('ds-01-before');
            out.dbBefore = isOMP ? q(`select s.submission_id, s.last_modified from submissions s where s.context_id=${S.C1.id} order by 1`) : q(`select s.submission_id, s.last_modified, p.last_modified, i.last_modified from submissions s join publications p on p.publication_id=s.current_publication_id left join issues i on i.issue_id=p.issue_id where s.context_id=${S.C1.id} order by 1`);
            // the site-wide datestamps of the C1 deleted records
            if (isOJS) {
                await asMgr(S.C1);
                await sleep(2000);
                await page.goto(app.url(`/index.php/${C1}/manageIssues`)); await idle(page);
                await page.getByRole('tab', {name: 'Back Issues', exact: true}).click(); await idle(page);
                const panel = page.getByRole('tabpanel', {name: 'Back Issues'});
                await panel.locator('table').first().waitFor({timeout: T}); await idle(page);
                await panel.getByRole('link', {name: 'Vol. 3 No. 1 (2026)', exact: true}).click();
                const dlg = page.getByRole('dialog', {name: /^Issue Management/});
                await dlg.waitFor({timeout: T}); await idle(page);
                await dlg.getByRole('tab', {name: 'Issue Data', exact: true}).click(); await idle(page); await sleep(600);
                const f = dlg.locator('form#issueForm');
                await f.locator('input[name=number]').waitFor({timeout: T});
                const s0 = await screen(page); record('ds-02-issue-data', s0); await shot(page, 'ds-02-issue-data');
                await f.locator('input[name=number]').fill('7');
                const w = page.waitForResponse((r) => r.request().method() === 'POST' && /update-issue|updateIssue/i.test(r.url()), {timeout: T}).catch(() => null);
                await f.getByRole('button', {name: 'Save', exact: true}).click();
                const r = await w; out.issueSave = r ? r.status() : null; out.issueSavedAt = new Date().toISOString();
                await idle(page); await sleep(1000);
                const s1 = await screen(page); record('ds-03-issue-saved', s1);
                out.after = await recs('ds-04-after-issue-edit');
                out.dbAfter = q(`select s.submission_id, s.last_modified, p.last_modified, i.last_modified from submissions s join publications p on p.publication_id=s.current_publication_id left join issues i on i.issue_id=p.issue_id where s.submission_id=${S.subs.Q.id}`);
            } else {
                out.after = out.before;
            }
            S.datestampDone = true; save();
            fact('datestamp', out);
        });

        // ======================================================== the JATS error row (OJS) and its controls
        if (on('jats')) await sect('jats', async () => {
            const out = {};
            if (isOJS && S.C4) {
                for (const [k, sid] of Object.entries(S.C4.subs)) {
                    const p = await oai(`j-get-${k}`, S.C4.path, `verb=GetRecord&metadataPrefix=jats&identifier=${id(sid)}`);
                    out[k] = {status: p.status, errors: p.errors, count: p.records.length};
                }
                const lr = await oai('j-listrecords', S.C4.path, 'verb=ListRecords&metadataPrefix=jats');
                out.list = {status: p0(lr), errors: lr.errors, count: lr.records.length};
            }
            const c = await oai('j-control-c1', C1, `verb=GetRecord&metadataPrefix=jats&identifier=${id(S.recA || S.subs.A.id)}`);
            out.control = {status: c.status, errors: c.errors};
            fact('jats', out);
            function p0(x) { return x.status; }
        });

        // ======================================================== sweep: the tombstone set filter and dates; publicknowledge read-only
        if (on('sweep')) await sect('sweep', async () => {
            const out = {};
            const first = isOPS ? 'PRE' : isOMP ? null : 'ART';
            // publicknowledge's own deleted records, read at its own and at C1's address
            out.pkTombs = q(`select tombstone_id, data_object_id, set_spec, date_deleted from data_object_tombstones t where exists (select 1 from data_object_tombstone_oai_set_objects o where o.tombstone_id=t.tombstone_id and o.assoc_type=${isOJS ? 256 : isOMP ? 512 : 256} and o.assoc_id=1) order by 1`);
            const pk = await oai('w-01-pk-li', 'publicknowledge', 'verb=ListIdentifiers&metadataPrefix=oai_dc');
            out.pkList = {errors: pk.errors, ids: ids(pk)};
            const c1 = await oai('w-02-c1-li', C1, 'verb=ListIdentifiers&metadataPrefix=oai_dc');
            out.c1List = {errors: c1.errors, ids: ids(c1), deletedIds: c1.records.filter((r) => r.deleted).map((r) => `${r.id} [${r.sets}]`)};
            const c2 = await oai('w-03-c2-li', C2, 'verb=ListIdentifiers&metadataPrefix=oai_dc');
            out.c2List = {errors: c2.errors, deletedIds: c2.records.filter((r) => r.deleted).map((r) => `${r.id} [${r.sets}]`)};
            // GetRecord of a publicknowledge deleted record at C1's address
            const pkT = (out.pkTombs || '').split('\n').filter(Boolean)[0];
            if (pkT) {
                const pkId = pkT.split('|')[1];
                const g = await oai('w-04-c1-get-pk-deleted', C1, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${id(pkId)}`);
                out.c1GetPkDeleted = {errors: g.errors, rec: g.records[0] && `${g.records[0].deleted ? 'DELETED ' : ''}${g.records[0].id} [${g.records[0].sets}]`};
                const g2 = await oai('w-05-pk-get-pk-deleted', 'publicknowledge', `verb=GetRecord&metadataPrefix=oai_dc&identifier=${id(pkId)}`, {view: false});
                out.pkGetPkDeleted = {errors: g2.errors, rec: g2.records[0] && `${g2.records[0].deleted ? 'DELETED ' : ''}${g2.records[0].id}`};
            }
            // a set plus a date far ahead: deleted records whose set_spec equals the set
            if (first) {
                for (const [k, ctx, set] of [['pk', 'publicknowledge', `publicknowledge:${first}`], ['site-pk', null, `publicknowledge:${first}`], ['c1', C1, `${C1}:${first}`], ['site-c1', null, `${C1}:${first}`]]) {
                    const p = await oai(`w-06-set-future-${k}`, ctx, `verb=ListIdentifiers&metadataPrefix=oai_dc&set=${set}&from=2030-01-01`);
                    out[`setFuture-${k}`] = {errors: p.errors, ids: ids(p)};
                }
            }
            // OPS1's column: the site-wide ListRecords with a from only (control) — and Identify's earliest datestamp untouched
            fact('sweep', out);
        });
    } finally {
        record('k2-crashes-own', myCrashes);
        record('k2-dialogs', dialogs);
        save();
        await vis.close();
        await staff.close();
    }
});
