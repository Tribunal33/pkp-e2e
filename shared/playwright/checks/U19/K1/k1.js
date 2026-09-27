const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U19 claim check, chunk K1: the protocol's face.
// Spec: docs/specs/U19-oai-pmh.md — Purpose (10–29), Actors & permissions (30–49), Fields: the two addresses, the six
// requests, the browser view, Identify, a record's header, the formats (50–147), Rules 1–2 (251–260), Rule 10 (327–331),
// register A5 (688–695), OMP5 (802–807); footnotes a, b, c, d, e, h, j, m, o, p, q1, q2, q3, q12, q17 (last step), f-a5, f-omp5.
//
//   PROBE_FEATURE=U19 PROBE_AGENT=ccK1 node bin/probe.js <ojs|omp|ops|all> shared/playwright/checks/U19/K1/k1.js
//   PHASES=seed,face,... (default: all, in the order below). State in k1-state-<app>.json under the output folder, so a
//   phase re-runs alone; delete it (or RESEED=1) for a fresh seed.
//   Phases: seed · face (the browser view and the raw XML of every request on A, signed out; the links pressed; Rule 2's
//   refusals and the form POST; Identify on E, T and in French) · site (the site-wide address: paging, a press's series
//   sets, versions; OMP5's unknown path on each app) · access (q1: A signed in; R restricted; N not enabled; the Dashboard
//   ID) · settings (Distribution › Access "Enable OAI" per role, the tab left unsaved; the Plugins list per role, q2) ·
//   jats (q3 on OJS; q12's formats with and without an identifier, JATS on and off; marcxml on OMP and OPS) · links (Rule 1:
//   the public pages' links) · deleted (T's one record unpublished on screen: Identify's earliest datestamp; the deleted
//   header in the view) · driver (OJS D: the header's second setSpec).
//
// Scratch contexts per app (tag prefix u19k1), each with a manager (mg), editor (ed, OJS/OMP), section editor (se),
// author (au) and reader (rd):
//   A  main: en + fr_CA names, its own principal contact; one published item (OMP: two publication formats).
//   E  empty: nothing published (Identify's earliest datestamp at the "no record" end).
//   T  one published item, unpublished on screen in the deleted phase (a journal whose only record is deleted).
//   R  restrictSiteAccess on, one published item; OJS/OMP editor with "Permit changes to Settings" off.
//   N  created not enabled publicly, one published item.
//   D  OJS: the DRIVER plugin on, one published article.
// publicknowledge is not touched. No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {request: pwRequest} = require('@playwright/test');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const T = 30_000;
const ALL = ['seed', 'face', 'site', 'access', 'settings', 'press', 'jats', 'links', 'deleted', 'driver', 'unknownfmt', 'withhold'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const T0 = Date.now();
const log = (...a) => console.log(`[k1 +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const statePath = (app) => path.join(outDir(), `k1-state-${app.name}.json`);
const db = (app, sql) => { try { return execFileSync('psql', [`${dbName(app.name)}`, '-Atc', sql]).toString().trim(); } catch (e) { return `ERR ${flat(e.message, 200)}`; } };

// ---------------------------------------------------------------------------
// The raw XML as data (regex; the answers are small and regular)
const grab = (x, tg) => [...String(x).matchAll(new RegExp(`<${tg}(?:\\s[^>]*)?>([\\s\\S]*?)</${tg}>`, 'g'))].map((m) => m[1].trim());
const parseXml = (xml) => {
    const x = String(xml || '');
    const req = (x.match(/<request([^>]*)>([^<]*)<\/request>/) || []);
    const headers = [...x.matchAll(/<header( status="deleted")?>([\s\S]*?)<\/header>/g)].map((m) => ({deleted: !!m[1], identifier: grab(m[2], 'identifier')[0], datestamp: grab(m[2], 'datestamp')[0], setSpec: grab(m[2], 'setSpec')}));
    const token = x.match(/<resumptionToken([^>]*)>([^<]*)<\/resumptionToken>/);
    return {
        responseDate: grab(x, 'responseDate')[0],
        request: {attrs: (req[1] || '').trim(), text: req[2]},
        error: (x.match(/<error code="([^"]*)">([^<]*)<\/error>/) || []).slice(1),
        identify: /<Identify>/.test(x) ? {
            repositoryName: grab(x, 'repositoryName')[0], baseURL: grab(x, 'baseURL')[0], protocolVersion: grab(x, 'protocolVersion')[0],
            adminEmail: grab(x, 'adminEmail'), earliestDatestamp: grab(x, 'earliestDatestamp')[0], deletedRecord: grab(x, 'deletedRecord')[0],
            granularity: grab(x, 'granularity')[0], compression: grab(x, 'compression'), scheme: grab(x, 'scheme')[0],
            repositoryIdentifier: grab(x, 'repositoryIdentifier')[0], delimiter: grab(x, 'delimiter')[0], sampleIdentifier: grab(x, 'sampleIdentifier')[0],
            toolkit: {title: grab(x, 'title')[0], version: grab(x, 'version')[0], URL: grab(x, 'URL')[0]},
        } : undefined,
        formats: [...x.matchAll(/<metadataFormat>([\s\S]*?)<\/metadataFormat>/g)].map((m) => ({prefix: grab(m[1], 'metadataPrefix')[0], schema: grab(m[1], 'schema')[0], ns: grab(m[1], 'metadataNamespace')[0]})),
        sets: [...x.matchAll(/<set>([\s\S]*?)<\/set>/g)].map((m) => ({spec: grab(m[1], 'setSpec')[0], name: grab(m[1], 'setName')[0]})),
        records: (x.match(/<record>/g) || []).length,
        headers,
        token: token ? {attrs: token[1].trim(), value: token[2]} : null,
        titles: grab(x, 'dc:title'),
    };
};

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const S = !process.env.RESEED && fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 1));
    const fact = (k, v) => { record('k1-facts', {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 3000)); };
    const J = (ctx) => `${app.baseURL}/index.php/${ctx}`;
    const oaiUrl = (ctx, q) => `${J(ctx)}/oai${q ? '?' + q : ''}`;
    const CTX = isOJS ? 'Journal' : isOMP ? 'Press' : 'Server';

    // ------------------------------------------------------------------ seed
    if (on('seed') && !S.A) {
        const t = tag('u19k1');
        S.t = t;
        const roleUsers = (k) => {
            const u = [{username: `${k}mg`, roles: ['manager']}, {username: `${k}se`, roles: ['sectionEditor']}, {username: `${k}au`, roles: ['author']}, {username: `${k}rd`, roles: ['reader']}];
            if (!isOPS) u.push({username: `${k}ed`, roles: ['editor']});
            return u;
        };
        const pub = async (ctxPath, k, title) => {
            const spec = {tag: `${k}s`, context: ctxPath, submitter: `${k}au`, title, published: true};
            if (isOMP) spec.publicationFormats = [{name: 'PDF'}, {name: 'EPUB'}];
            const r = await app.api.createSubmission(spec);
            return {id: r.submissionId, pub: r.publicationId, formats: (r.publicationFormats || []).map((f) => f.id)};
        };
        const mk = async (key, extra = {}, withPub = true) => {
            const k = `${t}${key.toLowerCase()}`.slice(0, 30);
            const spec = {tag: k, users: roleUsers(k), ...extra};
            spec.context = {name: `K1 ${CTX} ${key} ${t}`, ...(extra.context || {})};
            const C = await app.api.createContext(spec);
            const o = {path: C.path || k, id: C.contextId, k, u: {mg: `${k}mg`, se: `${k}se`, au: `${k}au`, rd: `${k}rd`, ed: isOPS ? null : `${k}ed`}};
            if (withPub) o.sub = await pub(o.path, k, `K1 ${key} Item ${t}`);
            log(`seeded ${key}`, JSON.stringify(o));
            return o;
        };
        S.A = await mk('A', {context: {name: {en: `K1 ${CTX} A ${t}`, fr_CA: `K1 Revue A ${t}`}, supportedLocales: ['en', 'fr_CA'], contactName: 'K1 Principal', contactEmail: `k1principal${t}@mail.test`}});
        save();
        S.E = await mk('E', {}, false); save();
        S.T = await mk('T'); save();
        S.R = await mk('R', {restrictSiteAccess: true, ...(isOPS ? {} : {roles: {editor: {permitSettings: false}}})}); save();
        S.N = await mk('N', {context: {enabled: false}}); save();
        if (isOJS) { S.D = await mk('D', {plugins: {driverplugin: {enabled: true}}}); save(); }
        fact('seed', S);
    }
    if (!S.A) { log('no seed; run PHASES=seed first'); return; }

    const {page, context, close} = await launch(app);
    const anon = await pwRequest.newContext();
    const snap = async (name, extra = {}, {png = false} = {}) => {
        const s = await screen(page);
        record(name, {...s, ...extra});
        if (png) await shot(page, name);
        return s;
    };
    const as = async (user, ctx) => { await signIn(page, user, ctx ? {contextPath: ctx} : {}); await idle(page).catch(() => {}); };
    const out = async () => { await signOut(page).catch(() => {}); };
    // A raw answer, as a harvester (signed out) or through the page's own cookies.
    const raw = async (url, {as: who = 'anon', method = 'GET', form} = {}) => {
        const rc = who === 'anon' ? anon : context.request;
        const opts = {maxRedirects: 0, failOnStatusCode: false};
        if (form) opts.form = form;
        let r = method === 'POST' ? await rc.post(url, opts) : await rc.get(url, opts);
        const location = r.headers().location || null;
        let hop = null;
        // a multilingual context adds its locale segment with a 302 to the same OAI address: follow that one hop
        if (r.status() === 302 && location && /\/oai(\?|$)/.test(location)) {
            hop = {status: 302, location: location.replace(app.baseURL, '')};
            r = method === 'POST' ? await rc.post(location, opts) : await rc.get(location, opts);
        }
        const body = await r.text();
        return {status: r.status(), ct: r.headers()['content-type'], hop, location: r.headers().location || null, stylesheet: (body.match(/<\?xml-stylesheet[^>]*\?>/) || [null])[0], parsed: parseXml(body), body};
    };
    // The browser view (the XSLT page), recorded.
    const view = async (url, name, extra = {}) => {
        const resp = await page.goto(url, {waitUntil: 'load'}).catch((e) => ({err: flat(e.message, 200)}));
        const s = await snap(name, {status: resp && resp.status ? resp.status() : resp, ...extra});
        return {status: resp && resp.status ? resp.status() : null, url: page.url(), title: s.title, text: s.text.main};
    };
    const links = async () => page.locator('a').evaluateAll((as) => as.map((a) => ({text: a.innerText.trim(), href: a.getAttribute('href')})));

    try {
        // ============================================================== face
        if (on('face')) {
            const A = S.A.path;
            const o = {};
            const idf = isOJS ? `oai:ojs-test.localhost:article/${S.A.sub.id}` : isOPS ? `oai:ops-test.localhost:preprint/${S.A.sub.id}` : `oai:omp-test.localhost:publicationFormat/${S.A.sub.formats[0]}`;
            o.identifier = idf;
            const Q = {
                identify: 'verb=Identify', sets: 'verb=ListSets', formats: 'verb=ListMetadataFormats', formatsId: `verb=ListMetadataFormats&identifier=${encodeURIComponent(idf)}`,
                ids: 'verb=ListIdentifiers&metadataPrefix=oai_dc', recs: 'verb=ListRecords&metadataPrefix=oai_dc', get: `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(idf)}`,
                badVerb: 'verb=identify', noVerb: '', badArg: 'verb=Identify&foo=bar', lowerArg: 'verb=ListRecords&metadataprefix=oai_dc', missing: 'verb=ListRecords',
                getMissingId: 'verb=GetRecord&metadataPrefix=oai_dc', repeated: 'verb=ListRecords&metadataPrefix=oai_dc&metadataPrefix=oai_dc',
                idsOpt: `verb=ListIdentifiers&metadataPrefix=oai_dc&from=2000-01-01&until=2100-01-01&set=${A}`, recsOpt: `verb=ListRecords&metadataPrefix=oai_dc&from=2000-01-01&until=2100-01-01&set=${A}`,
                setsOptBadToken: 'verb=ListSets&resumptionToken=nosuchtoken', formatsExtra: 'verb=ListMetadataFormats&metadataPrefix=oai_dc', identifyExtra: 'verb=Identify&identifier=x',
                getExtra: `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(idf)}&set=${A}`, noSuchPrefix: 'verb=ListRecords&metadataPrefix=nosuch',
                noSuchId: `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(idf + '999')}`,
            };
            o.raw = {};
            for (const [k, q] of Object.entries(Q)) {
                const r = await raw(oaiUrl(A, q));
                o.raw[k] = {q, status: r.status, hop: r.hop, ct: r.ct, stylesheet: r.stylesheet, ...r.parsed};
                fs.writeFileSync(path.join(outDir(), `raw-${k}-${app.name}.xml`), r.body);
            }
            // the form sent to the address (Rule 2)
            const post = await raw(oaiUrl(A), {method: 'POST', form: {verb: 'ListRecords', metadataPrefix: 'oai_dc'}});
            o.raw.postForm = {status: post.status, ...post.parsed};
            fs.writeFileSync(path.join(outDir(), `raw-postForm-${app.name}.xml`), post.body);
            const postBad = await raw(oaiUrl(A), {method: 'POST', form: {verb: 'Identify', foo: 'bar'}});
            o.raw.postFormBad = {status: postBad.status, ...postBad.parsed};
            fact('face-raw', Object.fromEntries(Object.entries(o.raw).map(([k, v]) => [k, {status: v.status, hop: v.hop, ct: v.ct, request: v.request, error: v.error, identify: v.identify, formats: v.formats, sets: v.sets, records: v.records, headers: v.headers, token: v.token}])));

            // the browser view, signed out, top to bottom, and each link pressed
            o.view = {};
            for (const k of ['identify', 'sets', 'formats', 'formatsId', 'ids', 'recs', 'get', 'badVerb', 'badArg', 'noSuchPrefix']) {
                const v = await view(oaiUrl(A, Q[k]), `v-${k}`, {}, {});
                o.view[k] = {status: v.status, title: v.title, text: flat(v.text, 3000), links: await links()};
                if (['identify', 'recs', 'badVerb'].includes(k)) await shot(page, `v-${k}`);
            }
            // the quick links pressed (top), from the Identify page
            o.pressed = {};
            for (const ln of ['Identify', 'ListRecords', 'ListSets', 'ListMetadataFormats', 'ListIdentifiers']) {
                await page.goto(oaiUrl(A, Q.sets)); await idle(page).catch(() => {});
                const l = page.getByRole('link', {name: ln, exact: true}).first();
                if (ln === 'Identify') await loc(page, 'OAI browser view: the quick link "Identify" (first of two)', page.getByRole('link', {name: ln, exact: true}));
                await l.click(); await page.waitForLoadState('load'); await idle(page).catch(() => {});
                const s = await snap(`v-press-${ln}`);
                o.pressed[ln] = {url: page.url().replace(app.baseURL, ''), head: flat(s.text.main, 400)};
            }
            // on a record: "oai_dc", "formats" (A5), each setSpec's "Identifiers" and "Records"
            for (const ln of ['oai_dc', 'formats', 'Identifiers', 'Records']) {
                await page.goto(oaiUrl(A, Q.recs)); await idle(page).catch(() => {});
                const l = page.getByRole('link', {name: ln, exact: true}).first();
                if (!(await l.count())) { o.pressed[`record:${ln}`] = {missing: true, text: flat((await snap(`v-rec-${ln}-missing`)).text.main, 300)}; continue; }
                if (ln === 'formats') await loc(page, 'OAI browser view: a record header\'s "formats" link', page.getByRole('link', {name: 'formats', exact: true}));
                const href = await l.getAttribute('href').catch(() => null);
                await l.click(); await page.waitForLoadState('load'); await idle(page).catch(() => {});
                const s = await snap(`v-rec-${ln}`, {}, {png: ln === 'formats'});
                o.pressed[`record:${ln}`] = {href, url: page.url().replace(app.baseURL, ''), text: flat(s.text.main, 1500), links: ln === 'formats' ? await links() : undefined};
            }
            // the ListMetadataFormats page's metadataPrefix link and schema link
            await page.goto(oaiUrl(A, Q.formats)); await idle(page).catch(() => {});
            const pl = page.getByRole('link', {name: 'oai_dc', exact: true}).first();
            o.pressed.formatsLinks = await links();
            await pl.click(); await page.waitForLoadState('load'); await idle(page).catch(() => {});
            o.pressed['formats:oai_dc'] = {url: page.url().replace(app.baseURL, ''), head: flat((await snap('v-formats-prefix')).text.main, 300)};
            // Identify in French (the request's language), and on E (no record)
            o.french = {};
            for (const [k, u] of [['frSegment', `${J(A)}/fr_CA/oai?verb=Identify`], ['frParam', oaiUrl(A, 'verb=Identify&locale=fr_CA')]]) {
                const r = await raw(u);
                o.french[k] = {status: r.status, name: r.parsed.identify && r.parsed.identify.repositoryName, baseURL: r.parsed.identify && r.parsed.identify.baseURL, error: r.parsed.error};
            }
            // the site's language switched through the page's own language menu, then the OAI address in the same browser
            await page.goto(`${J(A)}`); await idle(page).catch(() => {});
            const fr = page.getByRole('link', {name: /Français/}).first();
            o.french.langLink = await fr.count();
            if (o.french.langLink) {
                await fr.click(); await idle(page).catch(() => {});
                const r = await raw(oaiUrl(A, 'verb=Identify'), {as: 'page'});
                o.french.afterSwitch = {name: r.parsed.identify && r.parsed.identify.repositoryName};
                const v = await view(oaiUrl(A, 'verb=Identify'), 'v-identify-after-french');
                o.french.afterSwitchView = flat(v.text, 300);
                await page.goto(`${J(A)}/user/setLocale/en`).catch(() => {});
            }
            const t1 = new Date().toISOString();
            const e = await raw(oaiUrl(S.E.path, 'verb=Identify'));
            const t2 = new Date().toISOString();
            o.emptyIdentify = {before: t1, after: t2, earliest: e.parsed.identify?.earliestDatestamp, responseDate: e.parsed.responseDate, status: e.status};
            await view(oaiUrl(S.E.path, 'verb=Identify'), 'v-identify-E');
            // the principal contact against Admin Email, and the published item's datestamp source
            o.db = {
                contact: db(app, `select setting_name||'='||setting_value from ${isOJS ? 'journal_settings' : isOMP ? 'press_settings' : 'server_settings'} where ${isOJS ? 'journal_id' : isOMP ? 'press_id' : 'server_id'}=${S.A.id} and setting_name in ('contactEmail','contactName','name') order by 1`),
                submission: db(app, `select s.submission_id||' '||s.last_modified from submissions s where s.submission_id=${S.A.sub.id}`),
                section: isOMP ? null : db(app, `select s.section_id||' '||coalesce((select setting_value from section_settings where section_id=s.section_id and setting_name='abbrev' limit 1),'') from sections s where s.${isOJS ? 'journal_id' : 'server_id'}=${S.A.id}`),
                version: db(app, `select setting_value from site_settings where setting_name='x' union all select major||'.'||minor||'.'||revision||'.'||build from versions where current=1 and product_type='core'`),
            };
            fact('face', {identifier: idf, view: o.view, pressed: o.pressed, french: o.french, emptyIdentify: o.emptyIdentify, db: o.db});
        }

        // ============================================================== site
        if (on('site')) {
            const o = {};
            for (const [k, q] of [['identify', 'verb=Identify'], ['recs', 'verb=ListRecords&metadataPrefix=oai_dc'], ['ids', 'verb=ListIdentifiers&metadataPrefix=oai_dc'], ['sets', 'verb=ListSets']]) {
                const r = await raw(oaiUrl('index', q));
                const p = r.parsed;
                o[k] = {status: r.status, records: p.records, headers: p.headers.length, token: p.token, sets: p.sets.length, identify: p.identify, error: p.error,
                    ownHeaders: p.headers.filter((h) => h.setSpec.some((s) => s.startsWith(S.t))), colonSets: [...new Set(p.headers.flatMap((h) => h.setSpec).filter((s) => s.includes(':')))].slice(0, 8),
                    versions: p.headers.filter((h) => /\/version\//.test(h.identifier || '')).slice(0, 5)};
                fs.writeFileSync(path.join(outDir(), `raw-site-${k}-${app.name}.xml`), r.body);
            }
            // follow the ListIdentifiers token pages until a series set or a version identifier shows (read only)
            let tok = o.ids.token && o.ids.token.value; let pages = 1;
            o.more = {series: o.ids.colonSets, versions: o.ids.versions};
            while (tok && pages < 30 && (isOMP ? true : isOJS ? o.more.versions.length === 0 : false)) {
                const r = await raw(oaiUrl('index', `verb=ListIdentifiers&resumptionToken=${encodeURIComponent(tok)}`));
                const p = r.parsed; pages++;
                o.more.series = [...new Set([...o.more.series, ...p.headers.flatMap((h) => h.setSpec).filter((s) => s.includes(':'))])].slice(0, 10);
                o.more.versions = [...o.more.versions, ...p.headers.filter((h) => /\/version\//.test(h.identifier || ''))].slice(0, 5);
                tok = p.token && p.token.value;
                if (isOMP && o.more.series.length >= 3) break;
            }
            o.more.pages = pages;
            // the view of a list with more to come, and its "Resume" pressed
            const v = await view(oaiUrl('index', 'verb=ListRecords&metadataPrefix=oai_dc'), 'v-site-recs');
            await shot(page, 'v-site-recs');
            o.viewTail = flat(v.text.slice(-1500), 1500);
            const resume = page.getByRole('link', {name: 'Resume', exact: true}).first();
            o.resumeCount = await resume.count();
            if (o.resumeCount) {
                await loc(page, 'OAI browser view: "Resume" on a list with more to come', page.getByRole('link', {name: 'Resume', exact: true}));
                const href = await resume.getAttribute('href');
                await resume.click(); await page.waitForLoadState('load'); await idle(page).catch(() => {});
                const s = await snap('v-site-resume');
                o.resumed = {href, url: page.url().replace(app.baseURL, ''), head: flat(s.text.main, 600), records: (s.text.main.match(/OAI Record: /g) || []).length};
            }
            // OMP5: an address with no such context, on each app
            for (const p of ['nosuchjournal', `${S.t}nosuch`]) {
                const r = await raw(oaiUrl(p, 'verb=Identify'));
                o[`unknown-${p === 'nosuchjournal' ? 'a' : 'b'}`] = {status: r.status, ct: r.ct, identify: r.parsed.identify, head: r.parsed.identify ? null : flat(r.body, 300)};
                const r2 = await raw(oaiUrl(p, 'verb=ListIdentifiers&metadataPrefix=oai_dc'));
                o[`unknown-${p === 'nosuchjournal' ? 'a' : 'b'}-ids`] = {status: r2.status, headers: r2.parsed.headers.length, token: r2.parsed.token, error: r2.parsed.error};
            }
            await view(oaiUrl('nosuchjournal', 'verb=Identify'), 'v-unknown-context', {}, {});
            await shot(page, 'v-unknown-context');
            fact('site', o);
        }

        // ============================================================== access (q1)
        if (on('access')) {
            const o = {};
            const read = async (ctx, who, name) => {
                const url = oaiUrl(ctx, 'verb=ListRecords&metadataPrefix=oai_dc');
                const r = who === 'anon' ? await raw(url) : await raw(url, {as: 'page'});
                const v = await view(url, name);
                return {raw: {status: r.status, location: r.location, records: r.parsed.records, ids: r.parsed.headers.map((h) => h.identifier), error: r.parsed.error, responseDate: r.parsed.responseDate},
                    view: {url: v.url.replace(app.baseURL, ''), title: v.title, head: flat(v.text, 200)}};
            };
            // A: signed out, then each level signed in, the same address in the same browser
            await out();
            o.A = {anon: await read(S.A.path, 'anon', 'acc-A-anon')};
            for (const lv of ['mg', 'rd', 'se']) {
                await as(S.A.u[lv], S.A.path);
                o.A[lv] = await read(S.A.path, 'page', `acc-A-${lv}`);
            }
            // the same answer for everyone: compare the bodies without the responseDate
            const bodies = {};
            for (const lv of ['anon', 'mg']) {
                if (lv === 'anon') await out(); else await as(S.A.u.mg, S.A.path);
                const r = await raw(oaiUrl(S.A.path, 'verb=ListRecords&metadataPrefix=oai_dc'), {as: lv === 'anon' ? 'anon' : 'page'});
                bodies[lv] = r.body.replace(/<responseDate>[^<]*<\/responseDate>/, '');
            }
            o.A.sameBody = bodies.anon === bodies.mg;
            // the Dashboard's ID for the item
            await as(S.A.u.mg, S.A.path);
            await page.goto(`${J(S.A.path)}/dashboard/editorial?currentViewId=published`).catch(() => {}); await idle(page).catch(() => {});
            const ds = await snap('acc-A-dashboard-published');
            o.A.dashboard = flat(ds.text.main, 800);
            // R (restricted) and N (not enabled): signed out, manager, reader
            for (const key of ['R', 'N']) {
                const C = S[key];
                o[key] = {};
                await out();
                o[key].anon = await read(C.path, 'anon', `acc-${key}-anon`);
                for (const lv of ['mg', 'rd']) {
                    await as(C.u[lv], key === 'N' ? undefined : C.path);
                    o[key][lv] = await read(C.path, 'page', `acc-${key}-${lv}`);
                }
                await as('admin');
                o[key].admin = await read(C.path, 'page', `acc-${key}-admin`);
                await out();
            }
            fact('access', o);
        }

        // ============================================================== settings (Enable OAI per role; the Plugins list, q2)
        if (on('settings')) {
            const o = {};
            const accessTab = async (ctx, name) => {
                let st = null;
                try { const r = await page.goto(`${J(ctx)}/management/settings/distribution`); st = r && r.status(); } catch (e) { st = flat(e.message, 100); }
                await idle(page).catch(() => {});
                const tab = page.locator('#access-button').first();
                const r = {status: st, url: page.url().replace(app.baseURL, ''), accessTab: await tab.count(), tabs: await page.getByRole('tab').allInnerTexts().then((a) => a.map((x) => x.trim())).catch(() => [])};
                if (r.accessTab) {
                    await tab.click(); await idle(page).catch(() => {});
                    const radios = page.locator('input[name="enableOai"]');
                    await radios.first().waitFor({timeout: 8000}).catch(() => {});
                    r.enableOai = await radios.evaluateAll((rs) => rs.map((x) => ({value: x.value, checked: x.checked, label: (x.closest('label') || {}).innerText?.trim()})));
                    r.fieldText = flat(await page.locator('fieldset, .pkpFormField').filter({has: page.locator('input[name="enableOai"]')}).last().innerText().catch(() => null), 600);
                }
                const s = await snap(name, {access: r});
                r.text = flat(s.text.main, 300);
                return r;
            };
            const pluginsTab = async (ctx, name) => {
                let st = null;
                try { const r = await page.goto(`${J(ctx)}/management/settings/website`); st = r && r.status(); } catch (e) { st = flat(e.message, 100); }
                await idle(page).catch(() => {});
                const tab = page.locator('#plugins-button').first();
                if (!(await tab.count())) { const s = await snap(name, {status: st}); return {status: st, noTab: true, url: page.url().replace(app.baseURL, ''), text: flat(s.text.main, 300)}; }
                await tab.click(); await idle(page).catch(() => {});
                await page.locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
                await sleep(500);
                const rows = await page.locator('#pluginGridContainer tbody').evaluateAll((tbs) => tbs.map((tb) => {
                    const cat = tb.id.replace(/^.*-category-/, '').replace(/-.*$/, '');
                    const head = tb.querySelector('tr.category, tr[class*=category]');
                    return {cat, head: head ? head.innerText.replace(/\s+/g, ' ').trim() : null,
                        rows: [...tb.querySelectorAll('tr.gridRow')].map((tr) => { const b = tr.querySelector('input[type=checkbox]'); return {id: tr.id.replace(/^.*-row-/, ''), name: tr.innerText.replace(/\s+/g, ' ').trim().slice(0, 120), box: b ? {checked: b.checked, disabled: b.disabled} : null}; })};
                }).filter((c) => c.rows.length));
                const pick = rows.filter((c) => /oaiMetadataFormats|metadata|generic/i.test(c.cat)).map((c) => ({cat: c.cat, head: c.head, rows: c.cat.match(/oaiMetadata/i) ? c.rows : c.rows.filter((r) => /dc11|driver|dublin/i.test(r.id + r.name))}));
                await snap(name, {status: st, rows: pick}, {png: true});
                return {status: st, cats: pick, catNames: rows.map((c) => `${c.cat}:${c.head}`)};
            };
            const levels = ['mg', 'ed', 'se', 'au', 'rd'].filter((lv) => S.A.u[lv]);
            o.access = {}; o.plugins = {};
            for (const lv of levels) {
                await as(S.A.u[lv], S.A.path);
                o.access[lv] = await accessTab(S.A.path, `set-access-${lv}`);
                o.plugins[lv] = await pluginsTab(S.A.path, `set-plugins-${lv}`);
            }
            await as('admin');
            o.access.admin = await accessTab(S.A.path, 'set-access-admin');
            o.plugins.admin = await pluginsTab(S.A.path, 'set-plugins-admin');
            // R: the editor whose role lost "Permit changes to Settings"
            if (S.R.u.ed) { await as(S.R.u.ed, S.R.path); o.access.edNoPermit = await accessTab(S.R.path, 'set-access-ed-nopermit'); o.plugins.edNoPermit = await pluginsTab(S.R.path, 'set-plugins-ed-nopermit'); }
            // the Access tab left with "Disable" chosen and unsaved (OJS, OPS)
            if (!isOMP) {
                await page.goto(`${J(S.A.path)}/management/settings/distribution`); await idle(page).catch(() => {});
                await page.locator('#access-button').first().click(); await idle(page).catch(() => {});
                const dis = page.locator('input[name="enableOai"][value="false"]');
                await dis.waitFor({timeout: T});
                await loc(page, 'Distribution › Access: "Enable OAI" › "Disable" radio', dis);
                await dis.check();
                const dialogs = [];
                const dl = (d) => { dialogs.push({type: d.type(), msg: d.message()}); d.accept().catch(() => {}); };
                page.on('dialog', dl);
                // another tab of the same page, then a link out of the page
                const other = page.getByRole('tab').filter({hasNotText: /Access/}).first();
                o.leave = {otherTab: flat(await other.innerText().catch(() => null), 60)};
                await other.click().catch(() => {}); await sleep(600);
                o.leave.afterTab = {dialogs: [...dialogs], url: page.url().replace(app.baseURL, '')};
                await page.locator('#access-button').first().click().catch(() => {}); await sleep(400);
                o.leave.radioAfterTab = await page.locator('input[name="enableOai"]').evaluateAll((rs) => rs.map((x) => `${x.value}:${x.checked}`)).catch(() => null);
                await page.goto(`${J(S.A.path)}/management/settings/website`).catch((e) => { o.leave.gotoErr = flat(e.message, 100); });
                await sleep(800);
                o.leave.afterGoto = {dialogs: [...dialogs], url: page.url().replace(app.baseURL, '')};
                page.off('dialog', dl);
                o.leave.stored = db(app, `select coalesce(max(setting_value),'<no row>') from ${isOJS ? 'journal_settings' : 'server_settings'} where ${isOJS ? 'journal_id' : 'server_id'}=${S.A.id} and setting_name='enableOai'`);
                const back = await accessTab(S.A.path, 'set-access-after-leave');
                o.leave.reopened = back.enableOai;
            }
            fact('settings', o);
        }

        // ============================================================== press: the always-on boxes pressed as the manager (q2)
        if (on('press')) {
            const o = {};
            await as(S.A.u.mg, S.A.path);
            await page.goto(`${J(S.A.path)}/management/settings/website`); await idle(page).catch(() => {});
            await page.locator('#plugins-button').first().click(); await idle(page).catch(() => {});
            await page.locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
            await sleep(500);
            for (const name of ['DC Metadata Format', 'MARC Metadata Format', 'MARC21 Metadata Format', 'Dublin Core 1.1 metadata']) {
                const row = page.locator('#pluginGridContainer tr.gridRow').filter({hasText: name}).first();
                if (!(await row.count())) { o[name] = 'no row'; continue; }
                const box = row.getByRole('checkbox').first();
                await loc(page, `Website › Plugins: the "${name}" row's box`, box);
                const reqs = [];
                const lis = (r) => { if (/plugin-grid|\$\$\$call/.test(r.url())) reqs.push(r.url().replace(app.baseURL, '')); };
                page.on('request', lis);
                const before = {checked: await box.isChecked(), disabled: await box.isDisabled()};
                const click = await box.click({timeout: 3000}).then(() => 'clicked').catch((e) => `no click: ${flat(e.message.split('\n')[0], 160)}`);
                const force = await box.click({force: true, timeout: 3000}).then(() => 'forced').catch((e) => `no force: ${flat(e.message.split('\n')[0], 160)}`);
                await sleep(1000);
                const dlg = await page.locator('[role="dialog"]:visible').count();
                page.off('request', lis);
                o[name] = {before, click, force, after: await box.isChecked(), requests: reqs, dialog: dlg};
            }
            await snap('press-boxes', {press: o}, {png: true});
            fact('press', o);
        }

        // ============================================================== jats (q3 on OJS) and formats (q12)
        if (on('jats')) {
            const o = {};
            const idf = isOJS ? `oai:ojs-test.localhost:article/${S.A.sub.id}` : isOPS ? `oai:ops-test.localhost:preprint/${S.A.sub.id}` : `oai:omp-test.localhost:publicationFormat/${S.A.sub.formats[0]}`;
            const lmf = async (label) => {
                const a = await raw(oaiUrl(S.A.path, 'verb=ListMetadataFormats'));
                const b = await raw(oaiUrl(S.A.path, `verb=ListMetadataFormats&identifier=${encodeURIComponent(idf)}`));
                const c = await raw(oaiUrl(S.A.path, `verb=ListMetadataFormats&identifier=${encodeURIComponent(idf.replace(/\d+$/, '99999'))}`));
                return {label, plain: a.parsed.formats, withId: b.parsed.formats, withIdErr: b.parsed.error, unknownId: {formats: c.parsed.formats, error: c.parsed.error}};
            };
            o.before = await lmf('before');
            // formats not offered: marcxml / jats / oai_marc in each list request
            o.notOffered = {};
            for (const pfx of ['marcxml', 'oai_marc', 'jats']) {
                o.notOffered[pfx] = {};
                for (const [k, q] of [['recs', `verb=ListRecords&metadataPrefix=${pfx}`], ['ids', `verb=ListIdentifiers&metadataPrefix=${pfx}`], ['get', `verb=GetRecord&metadataPrefix=${pfx}&identifier=${encodeURIComponent(idf)}`]]) {
                    const r = await raw(oaiUrl(S.A.path, q));
                    o.notOffered[pfx][k] = {status: r.status, error: r.parsed.error, records: r.parsed.records, headers: r.parsed.headers.length};
                }
            }
            if (!isOJS) await view(oaiUrl(S.A.path, 'verb=ListRecords&metadataPrefix=marcxml'), 'j-marcxml-refused');
            if (isOJS) {
                // q3: the manager ticks "JATS Metadata Format"
                await as(S.A.u.mg, S.A.path);
                const openPlugins = async () => {
                    await page.goto(`${J(S.A.path)}/management/settings/website`); await idle(page).catch(() => {});
                    await page.locator('#plugins-button').first().click(); await idle(page).catch(() => {});
                    await page.locator('tr.gridRow').first().waitFor({timeout: T}).catch(() => {});
                    await sleep(500);
                };
                const row = () => page.locator('#pluginGridContainer tr.gridRow').filter({hasText: 'JATS Metadata Format'}).first();
                const setJats = async (want, name) => {
                    await openPlugins();
                    const box = row().getByRole('checkbox').first();
                    await loc(page, 'Website › Plugins: the "JATS Metadata Format" row\'s box', box);
                    const was = await box.isChecked();
                    const w = page.waitForResponse((r) => /plugin-grid\/(enable|disable)/.test(r.url()), {timeout: T}).catch(() => null);
                    await box.click({noWaitAfter: true}); await sleep(800);
                    let ask = null;
                    const dlg = page.locator('[role="dialog"]:visible').last();
                    if (await dlg.count()) { ask = flat(await dlg.innerText().catch(() => ''), 300); const ok = dlg.getByRole('button', {name: /^(OK|Yes)$/}).first(); if (await ok.count()) await ok.click(); }
                    const r = await w; await sleep(900); await idle(page).catch(() => {});
                    const toast = (await page.locator('.pkp_notification, .pkpNotification, .ui-pnotify-text').allInnerTexts().catch(() => [])).map((x) => flat(x, 200)).filter(Boolean);
                    const s = await snap(name, {}, {png: true});
                    return {was, ask, status: r && r.status(), now: await box.isChecked().catch(() => null), toast};
                };
                const actions = async (name) => {
                    const exp = row().locator('a.show_extras').first();
                    if (await exp.count()) { await exp.click(); await sleep(500); }
                    const acts = await page.locator('#pluginGridContainer tr.row_controls:visible').first().getByRole('link').allInnerTexts().then((a) => a.map((x) => x.trim())).catch(() => []);
                    await snap(name);
                    return acts;
                };
                const win = () => page.locator('[role="dialog"]:visible').last();
                const winState = async () => win().evaluate((root) => {
                    const t = (el) => (el ? el.innerText.replace(/\s+/g, ' ').trim() : null);
                    return {all: t(root), headings: [...root.querySelectorAll('h1,h2,h3,legend,.label')].map(t).filter(Boolean),
                        boxes: [...root.querySelectorAll('input[type=checkbox]')].map((i) => ({name: i.name, checked: i.checked, label: t(root.querySelector(`label[for="${i.id}"]`) || i.closest('label'))})),
                        buttons: [...root.querySelectorAll('button, a.cancelButton, a[role=button], input[type=submit]')].map((b) => t(b) || b.value).filter(Boolean)};
                }).catch((e) => ({err: flat(e.message, 200)}));
                const openSettings = async (name) => {
                    await openPlugins();
                    await actions(`${name}-row`);
                    const st = page.locator('#pluginGridContainer tr.row_controls:visible').first().getByRole('link', {name: 'Settings', exact: true}).first();
                    await loc(page, 'Website › Plugins: the expanded "JATS Metadata Format" row\'s "Settings" action', st);
                    await st.click();
                    await win().locator('input[name="forceJatsTemplate"]').waitFor({timeout: T}).catch(() => {});
                    await idle(page).catch(() => {}); await sleep(400);
                    const s = await snap(name, {}, {png: true});
                    return {...(await winState()), dialogText: flat(s.text.dialog, 800)};
                };
                o.tickOn = await setJats(true, 'j-01-tick-on');
                o.actionsOn = await actions('j-02-row-actions-on');
                o.lmfOn = await lmf('jats on');
                o.win1 = await openSettings('j-03-window');
                // tick the box, OK
                await win().locator('input[name="forceJatsTemplate"]').check();
                const w = page.waitForResponse((r) => r.request().method() === 'POST' && /manage/.test(r.url()), {timeout: T}).catch(() => null);
                await win().getByRole('button', {name: 'OK', exact: true}).click();
                const r = await w; await sleep(1000); await idle(page).catch(() => {});
                o.ok = {status: r && r.status(), toast: (await page.locator('.pkp_notification, .pkpNotification, .ui-pnotify-text').allInnerTexts().catch(() => [])).map((x) => flat(x, 200)).filter(Boolean), open: await page.locator('[role="dialog"]:visible').count()};
                await snap('j-04-after-ok');
                o.stored1 = db(app, `select setting_name||'='||setting_value||' '||setting_type from plugin_settings where plugin_name='oaimetadataformatplugin_jats' and context_id=${S.A.id} order by 1`);
                o.win2 = await openSettings('j-05-window-reopened');
                // untick, Cancel
                await win().locator('input[name="forceJatsTemplate"]').uncheck();
                const dialogs = []; const dl = (d) => { dialogs.push({type: d.type(), msg: d.message()}); d.accept().catch(() => {}); };
                page.on('dialog', dl);
                const cancel = win().getByRole('link', {name: 'Cancel', exact: true}).or(win().getByRole('button', {name: 'Cancel', exact: true})).first();
                await cancel.click(); await sleep(900);
                const conf = page.locator('[role="dialog"]:visible').filter({hasText: /unsaved|sure|discard|leave/i}).last();
                o.cancel = {nativeDialogs: dialogs, confirm: (await conf.count()) ? flat(await conf.innerText(), 300) : null, stillOpen: await page.locator('[role="dialog"]:visible').count()};
                if (o.cancel.confirm) { const ok = conf.getByRole('button', {name: /^(OK|Yes|Leave|Discard)/}).first(); if (await ok.count()) await ok.click(); await sleep(700); }
                page.off('dialog', dl);
                await snap('j-06-after-cancel');
                o.stored2 = db(app, `select setting_name||'='||setting_value||' '||setting_type from plugin_settings where plugin_name='oaimetadataformatplugin_jats' and context_id=${S.A.id} order by 1`);
                await page.reload(); await idle(page).catch(() => {});
                o.win3 = await openSettings('j-07-window-after-cancel');
                await win().getByRole('link', {name: 'Cancel', exact: true}).or(win().getByRole('button', {name: 'Cancel', exact: true})).first().click().catch(() => {}); await sleep(800);
                // the JATS record in the browser view (the format listed while on)
                await view(oaiUrl(S.A.path, 'verb=ListMetadataFormats'), 'j-08-formats-jats-on', {}, {});
                await view(oaiUrl(S.A.path, `verb=ListMetadataFormats&identifier=${encodeURIComponent(idf)}`), 'j-09-formats-id-jats-on');
                o.jatsRecsOn = await raw(oaiUrl(S.A.path, 'verb=ListIdentifiers&metadataPrefix=jats')).then((x) => ({status: x.status, headers: x.parsed.headers.length, error: x.parsed.error}));
                // untick the plugin: its actions
                o.tickOff = await setJats(false, 'j-10-tick-off');
                o.actionsOff = await actions('j-11-row-actions-off');
                o.lmfOff = await lmf('jats off again');
                o.stored3 = db(app, `select setting_name||'='||setting_value||' '||setting_type from plugin_settings where plugin_name='oaimetadataformatplugin_jats' and context_id=${S.A.id} order by 1`);
            }
            fact('jats', o);
        }

        // ============================================================== links (Rule 1): no public page links to the address
        if (on('links')) {
            const o = {};
            await out();
            const sub = S.A.sub.id;
            const pages = [['home', J(S.A.path)], ['about', `${J(S.A.path)}/about`], ['contact', `${J(S.A.path)}/about/contact`], ['submissions', `${J(S.A.path)}/about/submissions`],
                ['item', isOMP ? `${J(S.A.path)}/catalog/book/${sub}` : isOPS ? `${J(S.A.path)}/preprint/view/${sub}` : `${J(S.A.path)}/article/view/${sub}`],
                ['archive', isOMP ? `${J(S.A.path)}/catalog` : isOPS ? `${J(S.A.path)}/preprints` : `${J(S.A.path)}/issue/archive`], ['search', `${J(S.A.path)}/search`], ['site', `${app.baseURL}/index.php/index`]];
            for (const [k, u] of pages) {
                const r = await page.goto(u).catch(() => null); await idle(page).catch(() => {});
                const hits = await page.evaluate(() => [...document.querySelectorAll('a[href], link[href], meta[content]')].map((e) => e.getAttribute('href') || e.getAttribute('content')).filter((h) => /\/oai\b|verb=/i.test(h || '')));
                const s = await snap(`l-${k}`);
                o[k] = {status: r && r.status(), url: page.url().replace(app.baseURL, ''), oaiRefs: hits, title: s.title};
            }
            // signed in as the manager: the side menu and a settings page
            await as(S.A.u.mg, S.A.path);
            for (const [k, u] of [['dashboard', `${J(S.A.path)}/dashboard/editorial`], ['distribution', `${J(S.A.path)}/management/settings/distribution`], ['website', `${J(S.A.path)}/management/settings/website`]]) {
                await page.goto(u).catch(() => null); await idle(page).catch(() => {});
                const hits = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map((e) => e.getAttribute('href')).filter((h) => /\/oai\b|verb=/i.test(h || '')));
                await snap(`l-mgr-${k}`);
                o[`mgr-${k}`] = {oaiRefs: hits};
            }
            fact('links', o);
        }

        // ============================================================== deleted: T's only record unpublished on screen
        if (on('deleted')) {
            const o = {};
            const C = S.T;
            o.before = await raw(oaiUrl(C.path, 'verb=Identify')).then((r) => ({earliest: r.parsed.identify?.earliestDatestamp}));
            o.headersBefore = (await raw(oaiUrl(C.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc'))).parsed.headers;
            if (!S.T.unpublished) {
                await as(C.u.mg, C.path);
                await page.goto(`${J(C.path)}/dashboard/editorial?workflowSubmissionId=${C.sub.id}`); await idle(page).catch(() => {});
                const UNPUB = isOPS ? 'Unpost' : 'Unpublish';
                const wf = page.locator('[role="dialog"]').first();
                const b = wf.getByRole('button', {name: UNPUB, exact: true}).first();
                await b.waitFor({timeout: T}).catch(() => {});
                o.button = await b.count();
                await snap('d-01-workflow');
                if (o.button) {
                    await b.click();
                    const conf = page.locator('[role="dialog"]').filter({hasText: /unpublish|unpost|Are you sure/i}).last();
                    await conf.waitFor({timeout: T}).catch(() => {});
                    o.confirm = flat(await conf.innerText().catch(() => ''), 300);
                    const w = page.waitForResponse((r) => /unpublish/.test(r.url()), {timeout: T}).catch(() => null);
                    await conf.getByRole('button', {name: new RegExp(`^(${UNPUB}|OK|Yes)$`)}).last().click();
                    const r = await w; o.unpublishStatus = r && r.status();
                    await idle(page).catch(() => {});
                    await snap('d-02-after-unpublish');
                    S.T.unpublished = new Date().toISOString(); save();
                }
            }
            o.unpublishedAt = S.T.unpublished;
            await sleep(1500);
            const t1 = new Date().toISOString();
            const r = await raw(oaiUrl(C.path, 'verb=Identify'));
            o.after = {earliest: r.parsed.identify?.earliestDatestamp, requestAt: t1, responseDate: r.parsed.responseDate};
            const l = await raw(oaiUrl(C.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc'));
            o.headersAfter = l.parsed.headers;
            o.tombstone = db(app, `select tombstone_id||' '||date_deleted||' '||set_spec||' '||oai_identifier from data_object_tombstones where data_object_id=${isOMP ? (C.sub.formats[0] || 0) : C.sub.id}`);
            const v = await view(oaiUrl(C.path, 'verb=ListRecords&metadataPrefix=oai_dc'), 'd-03-view-deleted', {}, {});
            await shot(page, 'd-03-view-deleted');
            o.view = flat(v.text, 1200);
            const vi = await view(oaiUrl(C.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc'), 'd-04-view-deleted-ids');
            o.viewIds = flat(vi.text, 800);
            fact('deleted', o);
        }

        // ============================================================== withhold (OJS, OPS): the manager saves "Disable", then "Enable" (Purpose)
        if (on('withhold') && !isOMP) {
            const o = {};
            const count = async () => { const r = await raw(oaiUrl(S.A.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc')); return {status: r.status, own: r.parsed.headers.filter((h) => h.setSpec.some((x) => x.startsWith(S.A.path))).map((h) => h.identifier), error: r.parsed.error}; };
            o.before = await count();
            await as(S.A.u.mg, S.A.path);
            for (const val of ['false', 'true']) {
                await page.goto(`${J(S.A.path)}/management/settings/distribution`); await idle(page).catch(() => {});
                await page.locator('#access-button').first().click(); await idle(page).catch(() => {});
                const radio = page.locator(`input[name="enableOai"][value="${val}"]`);
                await radio.waitFor({timeout: T});
                await radio.check();
                const form = radio.locator('xpath=ancestor::form[1]');
                const w = page.waitForResponse((r) => /\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await form.getByRole('button', {name: 'Save', exact: true}).click();
                const r = await w;
                await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 8000}).catch(() => {});
                await snap(`w-saved-${val}`);
                o[`save-${val}`] = {status: r && r.status(), after: await count()};
            }
            fact('withhold', o);
        }

        // ============================================================== unknownfmt (OJS): a record in a format the view does not know
        if (on('unknownfmt') && isOJS) {
            const o = {};
            for (const pfx of ['marcxml', 'oai_marc']) {
                const v = await view(oaiUrl(S.A.path, `verb=GetRecord&metadataPrefix=${pfx}&identifier=${encodeURIComponent(`oai:ojs-test.localhost:article/${S.A.sub.id}`)}`), `u-${pfx}`);
                const t = v.text || ''; const i = t.indexOf('Request was of type');
                o[pfx] = {status: v.status, text: flat(t.slice(i, i + 700), 700)};
            }
            fact('unknownfmt', o);
        }

        // ============================================================== driver (OJS): the header's second setSpec
        if (on('driver') && isOJS && S.D) {
            const o = {};
            const r = await raw(oaiUrl(S.D.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc'));
            o.headers = r.parsed.headers;
            o.sets = (await raw(oaiUrl(S.D.path, 'verb=ListSets'))).parsed.sets;
            const v = await view(oaiUrl(S.D.path, 'verb=ListRecords&metadataPrefix=oai_dc'), 'dr-01-view', {}, {});
            o.view = flat(v.text, 900);
            o.links = (await links()).filter((l) => /Identifiers|Records/.test(l.text));
            fact('driver', o);
        }
    } finally {
        await anon.dispose().catch(() => {});
        await close();
    }
});
