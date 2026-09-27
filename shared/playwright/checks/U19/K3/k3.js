const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U19 claim check, chunk K3: what a record shows.
// Spec: docs/specs/U19-oai-pmh.md — Fields "The Dublin Core record" and "The MARC records" (148–195), Rules 11–12
// (332–343), Rule 19 (388–394), Settings bullets 11–14 (500–522), register A6–A8 (696–727), A12 (758–765), OMP1
// (766–776), OMP4 (794–801), OPS2–OPS3 (818–836); footnotes d, f, g, j, t, u, q4, q13, q14, q19, f-a6, f-a7, f-a8,
// f-a12, f-omp1, f-omp4, f-ops2, f-ops3.
//
//   PROBE_FEATURE=U19 PROBE_AGENT=ccK3 node bin/probe.js <ojs|omp|ops|all> shared/playwright/checks/U19/K3/k3.js
//   PHASES=seed,base,settings,prep,read,... (default: all, in the order of ALL below). State in k3-state-<app>.json
//   under the output folder, so a phase re-runs alone; delete it (or RESEED=1) for a fresh seed.
//   Phases:
//     seed      the scratch context and its items (API)
//     base      the records BEFORE the context texts are typed (Publisher / ISSN / Press Publisher Name absent end)
//     settings  on screen as the manager: sections ("Will not be peer-reviewed", "Identify items…"), Masthead
//               (Country, Publisher / Press Publisher Name, ISSNs), Metadata settings ("Enable article number
//               metadata", both ends read on the version's Metadata page)
//     prep      on screen: the main item's second contributor, Coverage / Rights / Source / Type, Pages,
//               copyright holder and license, then published (OJS into Vol. 1 No. 2; OJS D with no issue)
//     read      every item's GetRecord in oai_dc (raw XML and the browser view), oai_marc and marcxml (OJS),
//               ListRecords; q4's schema check with xmllint
//     lang      Rule 19 / q19: publicknowledge's plain address in a fresh browser; the scratch context in fr_CA
//     version   OJS: a second version of C (MARC 251 / 500 / 780) published on screen
//     a7        OJS: "Peer-reviewed Article" on a section the window never saved, one created on screen with "Will not
//               be peer-reviewed" ticked, and the first again after an unchanged save (journal K)
//     ids       identifiers besides the article DOI: OJS a Publisher ID (journal K); OMP / OPS DOIs set up on screen, OMP a
//               format's identification code and sales rights; each on a new item G published on screen
//     fmtmeta   OMP: G's format window "Metadata" tab: an ISBN-13 code and a sales right, then G's record
//     more      H with a French galley (OJS, OPS; OJS an unverified ORCID); OJS C's newer unpublished version; OMP/OPS a
//               second version of E (Relation); OPS W's page for the typed section words
//     nomode    OJS Rule 11a: "OJS will not be used to publish the journal's contents online." saved, read, restored
//     omp1      OMP: a format made "Not Available" on screen, the press's list read, then made available again
//     empty     OMP4 / OPS2: an item published with its abstract emptied on screen; the lists read; then unpublished
// Scratch contexts per app (tag prefix u19k3), users mg (manager), se (section editor / moderator), au (author),
// rd (reader), OJS/OMP ed (editor). publicknowledge is only read (signed out).
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {request: pwRequest, chromium} = require('@playwright/test');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, note, idle, tag, outDir} = require('../../../probe');

const T = 30_000;
const ALL = ['seed', 'base', 'settings', 'prep', 'read', 'lang', 'version', 'a7', 'ids', 'fmtmeta', 'more', 'nomode', 'omp1', 'empty'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const T0 = Date.now();
const log = (...a) => console.log(`[k3 +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const statePath = (app) => path.join(outDir(), `k3-state-${app.name}.json`);
const db = (app, sql) => { try { return execFileSync('psql', [`${dbName(app.name)}`, '-Atc', sql]).toString().trim(); } catch (e) { return `ERR ${flat(e.message, 200)}`; } };
const REPO = path.resolve(__dirname, '../../../../..');

// ---------------------------------------------------------------------------
// The raw XML as data
const unesc = (s) => String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
const dcRows = (xml) => {
    const x = String(xml || '');
    const m = x.match(/<oai_dc:dc[\s\S]*?<\/oai_dc:dc>/);
    if (!m) return null;
    return [...m[0].matchAll(/<dc:([a-zA-Z]+)((?:\s[^>]*)?)>([\s\S]*?)<\/dc:\1>/g)].map((e) => {
        const lang = (e[2].match(/xml:lang="([^"]*)"/) || [])[1] || null;
        return {el: e[1], lang, v: unesc(e[3].trim())};
    });
};
const marcFields = (xml) => {
    const x = String(xml || '');
    const out = [];
    // oai_marc: <fixfield id="008">…</fixfield>, <varfield id="245" i1="0" i2="0"><subfield label="a">…</subfield>
    // marcxml: <controlfield tag="008">…, <datafield tag="245" ind1="0" ind2="0"><subfield code="a">…</subfield>
    for (const e of x.matchAll(/<(fixfield|controlfield)\s([^>]*)>([\s\S]*?)<\/\1>/g)) out.push({el: e[1], attrs: e[2].trim(), v: unesc(e[3].trim())});
    for (const e of x.matchAll(/<(varfield|datafield|dataField)\s([^>]*)>([\s\S]*?)<\/\1>/g)) {
        out.push({el: e[1], attrs: e[2].trim(), subs: [...e[3].matchAll(/<subfield\s([^>]*)>([\s\S]*?)<\/subfield>/g)].map((s) => `${s[1].trim()}=${unesc(s[2].trim())}`)});
    }
    return out;
};
const errOf = (xml) => (String(xml || '').match(/<error code="([^"]*)">([^<]*)<\/error>/) || []).slice(1);

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const S = !process.env.RESEED && fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 1));
    const fact = (k, v) => { record('k3-facts', {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 2500)); };
    const J = (ctx, l) => `${app.baseURL}/index.php/${ctx}${l ? '/' + l : ''}`;
    const oaiUrl = (ctx, q, l) => `${J(ctx, l)}/oai${q ? '?' + q : ''}`;
    const CTX = isOJS ? 'Journal' : isOMP ? 'Press' : 'Server';
    const REPO_ID = `${app.name}-test.localhost`;
    const PDF = isOPS ? 'preprint.pdf' : 'article.pdf';

    // ------------------------------------------------------------------ seed
    if (on('seed') && (!S.C || Object.values(S.s || {}).some((x) => x.error))) {
        const t = S.t || tag('u19k3');
        S.t = t;
        const k = t;
        const users = [
            {username: `${k}mg`, roles: ['manager'], givenName: 'Mia', familyName: 'Manager'},
            {username: `${k}se`, roles: ['sectionEditor'], givenName: 'Sam', familyName: 'Section'},
            {username: `${k}au`, roles: ['author'], givenName: 'Ann', familyName: 'Tidewell', affiliation: 'K3 Tide Institute', orcid: 'https://orcid.org/0000-0002-1825-0097', orcidIsVerified: true},
            {username: `${k}rd`, roles: ['reader'], givenName: 'Rob', familyName: 'Reader'},
        ];
        if (!isOPS) users.push({username: `${k}ed`, roles: ['editor'], givenName: 'Eve', familyName: 'Editor'});
        const spec = {
            tag: k, users,
            context: {name: {en: `K3 ${CTX} ${t}`, fr_CA: `K3 Revue ${t}`}, acronym: 'KTHREE', supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA'],
                supportedSubmissionLocales: ['en', 'fr_CA'], contactName: 'K3 Principal', contactEmail: `k3principal${t}@mail.test`},
            metadata: {keywords: 'request', subjects: 'enable', disciplines: 'enable', agencies: 'enable', coverage: 'enable', rights: 'enable', source: 'enable', type: 'enable'},
        };
        if (isOJS) {
            spec.sections = [{abbrev: {en: 'ART', fr_CA: 'ARTF'}, title: {en: 'Articles', fr_CA: 'Articles FR'}}, {abbrev: 'NPR', title: 'K3 Not Reviewed'}, {abbrev: 'TYP', title: 'K3 Typed'}];
            spec.issues = [{volume: 1, number: 2, year: 2026, published: true}];
            Object.assign(spec, {enableDois: true, doiPrefix: '10.9876', doiVersioning: false, enabledDoiTypes: ['publication', 'issue', 'representation'], doiCreationTime: 'publication'});
        }
        if (isOPS) spec.sections = [{abbrev: {en: 'PRE', fr_CA: 'PREF'}, title: {en: 'Preprints', fr_CA: 'Prépublications'}}, {abbrev: 'WP', title: 'K3 Working', path: 'k3working'}, {abbrev: 'NAB', title: 'K3 NoAbstract', path: 'k3noabstract', abstractsNotRequired: true}];
        const r = S.C ? {path: S.C.path, contextId: S.C.id, issues: S.C.issues} : await app.api.createContext(spec);
        S.C = S.C || {path: r.path || k, id: r.contextId, issues: r.issues || null, u: {mg: `${k}mg`, se: `${k}se`, au: `${k}au`, rd: `${k}rd`, ed: isOPS ? null : `${k}ed`}};
        save();
        log('context', JSON.stringify(S.C));
        const C = S.C;
        const sub = async (key, s) => {
            const K = key.toUpperCase();
            if (S.s && S.s[K] && !S.s[K].error) return S.s[K];
            try {
                const x = await app.api.createSubmission({tag: `${t}${key}`, context: C.path, submitter: C.u.au, ...s});
                const o = {id: x.submissionId, pub: x.publicationId, galleys: x.galleys || null, formats: (x.publicationFormats || []).map((f) => f.id), status: x.status};
                log('seed', key, JSON.stringify(o));
                return o;
            } catch (e) { log('seed FAILED', key, String(e.message).slice(0, 900)); return {error: String(e.message).slice(0, 900)}; }
        };
        const rich = {title: {en: `K3 Tides ${t}`, fr_CA: `K3 Marées ${t}`}, abstract: {en: '<p>The <strong>moon</strong> pulls the <em>tides</em>.</p>', fr_CA: '<p>La <strong>lune</strong> tire les marées.</p>'}};
        const terms = {subtitle: {en: 'A moon study', fr_CA: 'Une étude lunaire'}, keywords: {en: ['tides', 'moon']}, subjects: {en: ['Oceanography']}, disciplines: {en: ['Geophysics']}, supportingAgencies: {en: ['K3 Tide Fund']}};
        const orc = {author: {orcid: 'https://orcid.org/0000-0002-1825-0097', orcidIsVerified: true}};
        S.s = S.s || {};
        if (isOJS) {
            const prod = {files: [{file: PDF}], decisions: ['skipExternalReview', 'sendToProduction'], galleys: [{label: 'PDF', file: PDF}]};
            // A: the q13/q14 item (published on screen into Vol. 1 No. 2 after the prep)
            S.s.A = await sub('a', {...prod, ...rich, ...terms, ...orc, articleNumber: 'e0142'}); save();
            // B: one contributor, Pages typed on screen next to an Article Number; "K3 Not Reviewed" section; into the issue on screen
            S.s.B = await sub('b', {...prod, title: `K3 Beta ${t}`, abstract: 'Beta abstract.', section: 'NPR', articleNumber: 'e0555'}); save();
            // C: published at once, no issue, no pages (A8's first end); "K3 Typed" section
            S.s.C = await sub('c', {title: `K3 Gamma ${t}`, abstract: 'Gamma abstract.', section: 'TYP', published: true, galleys: [{label: 'PDF', file: PDF}]}); save();
            // D: no issue, Pages "15-20" typed on screen (A8's second end)
            S.s.D = await sub('d', {...prod, title: `K3 Delta ${t}`, abstract: 'Delta abstract.'}); save();
            // E: published into the issue at once, the baseline read before the journal texts are typed
            S.s.E = await sub('e', {title: `K3 Epsilon ${t}`, abstract: 'Epsilon abstract.', published: true, issue: {volume: 1, number: 2, year: 2026}, galleys: [{label: 'PDF', file: PDF}]}); save();
        } else if (isOMP) {
            const prod = {files: [{file: PDF}], decisions: ['skipExternalReview', 'sendToProduction']};
            // A: the q13 book, one format; subtitle / terms / coverage typed on screen, published on screen
            S.s.A = await sub('a', {...prod, ...rich, ...orc, publicationFormats: [{name: 'PDF', file: PDF}]}); save();
            // E: published at once with one format (baseline before "Press Publisher Name")
            S.s.E = await sub('e', {...prod, title: `K3 Epsilon ${t}`, abstract: 'Epsilon abstract.', publicationFormats: [{name: 'EPUB', file: PDF}], published: true}); save();
            // N: published with no format (OMP1: no record)
            S.s.N = await sub('n', {...prod, title: `K3 Noformat ${t}`, abstract: 'Noformat abstract.', published: true}); save();
            // F: published with two formats (OMP1: one made "Not Available" on screen)
            S.s.F = await sub('f', {...prod, title: `K3 Twoformats ${t}`, abstract: 'Two formats abstract.', publicationFormats: [{name: 'PDF', file: PDF}, {name: 'HTML', file: PDF}], published: true}); save();
            // Z: OMP4, the abstract emptied on screen, then published on screen
            S.s.Z = await sub('z', {...prod, title: `K3 Noabstract ${t}`, abstract: 'To be emptied.', publicationFormats: [{name: 'PDF', file: PDF}]}); save();
        } else {
            // A: the q13 preprint; coverage etc. typed on screen, posted on screen
            S.s.A = await sub('a', {...rich, ...terms, ...orc, galleys: [{label: 'PDF', file: PDF}]}); save();
            // E: posted at once (baseline)
            S.s.E = await sub('e', {title: `K3 Epsilon ${t}`, abstract: 'Epsilon abstract.', published: true, galleys: [{label: 'PDF', file: PDF}]}); save();
            // W: posted in "K3 Working", whose "Identify items posted in this section as a(n)" is typed on screen (OPS3)
            S.s.W = await sub('w', {title: `K3 Working ${t}`, abstract: 'Working abstract.', section: 'WP', published: true, galleys: [{label: 'PDF', file: PDF}]}); save();
            // Z: OPS2, abstract emptied on screen, then posted
            S.s.Z = await sub('z', {title: `K3 Noabstract ${t}`, abstract: 'To be emptied.', section: 'NAB', galleys: [{label: 'PDF', file: PDF}]}); save();
        }
        fact('seed', S);
    }
    if (!S.C) { log('no seed; run PHASES=seed first'); return; }
    if (PHASES.length === 1 && PHASES[0] === 'seed') return;
    const C = S.C;
    const U = C.u;
    const s = S.s;
    const idOf = (it) => (isOJS ? `oai:${REPO_ID}:article/${it.id}` : isOPS ? `oai:${REPO_ID}:preprint/${it.id}` : `oai:${REPO_ID}:publicationFormat/${it.formats[0]}`);
    const anon = await pwRequest.newContext();
    // A raw answer as a harvester sends it (signed out, redirects followed), saved as raw-<name>-<app>.xml.
    const raw = async (name, url) => {
        // a fresh client per request: the app keeps the last language segment in a "currentLocale" cookie and sends the
        // plain address there on the next request, so a shared cookie jar would read later records in that language
        const rc = await pwRequest.newContext();
        let r;
        try { r = await rc.get(url, {failOnStatusCode: false, timeout: 60_000}); } catch (e) { await rc.dispose(); return {name, url: url.replace(app.baseURL, ''), err: flat(e.message, 200)}; }
        const body = await r.text();
        await rc.dispose();
        fs.writeFileSync(path.join(outDir(), `raw-${name}-${app.name}.xml`), body);
        const out = {name, url: url.replace(app.baseURL, ''), status: r.status(), final: r.url().replace(app.baseURL, ''), error: errOf(body), records: (body.match(/<record>/g) || []).length,
            identifiers: [...body.matchAll(/<identifier>([^<]*)<\/identifier>/g)].map((m) => m[1]), setSpecs: [...body.matchAll(/<setSpec>([^<]*)<\/setSpec>/g)].map((m) => m[1]),
            token: (body.match(/<resumptionToken([^>]*)>([^<]*)</) || []).slice(1)};
        if (/<oai_dc:dc/.test(body)) out.dc = dcRows(body);
        if (/<(fixfield|controlfield|varfield|datafield)/.test(body)) out.marc = marcFields(body);
        if (r.status() >= 500) out.body = flat(body, 300);
        return out;
    };
    const get = (name, it, prefix = 'oai_dc', l) => raw(name, oaiUrl(C.path, `verb=GetRecord&metadataPrefix=${prefix}&identifier=${encodeURIComponent(idOf(it))}`, l));

    const {page, context, close} = await launch(app);
    page.on('dialog', (d) => { log('[browser dialog]', d.type(), flat(d.message(), 160)); d.accept().catch(() => {}); });
    const snap = async (name, extra = {}, {png = false} = {}) => {
        const sc = await screen(page);
        record(name, {...sc, ...extra});
        if (png) await shot(page, name);
        return sc;
    };
    const as = async (user, ctx = C.path) => { await signIn(page, user, {contextPath: ctx}); await idle(page).catch(() => {}); };
    const out_ = async () => { await signOut(page).catch(() => {}); };
    const go = async (url) => {
        const r = await page.goto(url.startsWith('http') ? url : app.url(url), {waitUntil: 'load'}).catch((e) => ({err: flat(e.message, 200)}));
        await idle(page).catch(() => {});
        return r && r.status ? r.status() : r;
    };
    // The browser view of an OAI answer (the app's XSLT page), recorded.
    const view = async (name, url, {png = false} = {}) => {
        const st = await go(url);
        const sc = await snap(name, {status: st}, {png});
        return {status: st, url: page.url().replace(app.baseURL, ''), text: flat(sc.text.main, 6000)};
    };
    const FORM = (sel) => {
        const f = typeof sel === 'string' ? document.querySelector(sel) : sel;
        if (!f) return null;
        const t = (x) => (x || '').replace(/\s+/g, ' ').trim();
        const vis = (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
        const labelOf = (e) => {
            let l = e.id ? document.querySelector(`label[for="${CSS.escape(e.id)}"]`) : null;
            if (!l) l = e.closest('label');
            return l ? t(l.innerText).slice(0, 120) : null;
        };
        return [...f.querySelectorAll('input, select, textarea')].filter((e) => e.type !== 'hidden').map((e) => {
            const o = {name: e.name || e.id, type: e.type, visible: vis(e), disabled: e.disabled || undefined, label: labelOf(e)};
            if (e.type === 'checkbox' || e.type === 'radio') o.checked = e.checked;
            else if (e.tagName === 'SELECT') o.selected = e.options[e.selectedIndex] ? t(e.options[e.selectedIndex].text) : null;
            else o.value = (e.value || '').slice(0, 200);
            if (e.tagName === 'TEXTAREA' && window.tinymce && window.tinymce.get(e.id)) o.rich = t(window.tinymce.get(e.id).getContent()).slice(0, 300);
            return o;
        });
    };
    const fields = async (sel = 'body') => page.evaluate(FORM, sel).catch(() => null);
    const vis = '[role="dialog"]:visible';
    const wf = () => page.locator(vis).first();
    const wfUrl = (sid, key) => app.url(`/index.php/${C.path}/dashboard/editorial?workflowSubmissionId=${sid}${key ? `&workflowMenuKey=${key}` : ''}`);
    // A publication page ("Title & Abstract", "Metadata", "Publication Settings", "Permissions & Disclosure", "Contributors", …)
    async function openEntry(it, name) {
        await page.goto(wfUrl(it.id, `publication_${it.pub}_titleAbstract`)); await idle(page); await sleep(800);
        if (name !== 'Title & Abstract') {
            const l = page.getByRole('link', {name, exact: true}).last();
            await l.waitFor({state: 'visible', timeout: T});
            await l.click();
            await idle(page); await sleep(800);
        }
        const t0 = Date.now();
        while (Date.now() - t0 < 20_000 && !(await wf().getByRole('button', {name: /^(Save|Add Contributor)$/}).count())) await sleep(250);
        await idle(page); await sleep(300);
    }
    async function pressSave() {
        const button = wf().getByRole('button', {name: 'Save', exact: true}).last();
        const r = page.waitForResponse((x) => /\/publications\/\d+/.test(x.url()) && ['POST', 'PUT'].includes(x.request().method()), {timeout: T}).catch(() => null);
        await button.click();
        const resp = await r;
        await page.locator('[role="status"]:has-text("Saved")').first().waitFor({state: 'visible', timeout: 15_000}).catch(() => {});
        await sleep(400);
        let body = null;
        if (resp && resp.status() >= 400) { try { body = await resp.text(); } catch (e) { /* none */ } }
        return {status: resp ? resp.status() : null, body: body ? body.slice(0, 600) : undefined, errors: await page.locator('.pkpFieldError').allInnerTexts().catch(() => [])};
    }
    const fillVersion = async (scope) => {
        for (const [sel, val] of [['select[name="versionStage"]', 'VoR'], ['select[name="versionIsMinor"]', 'false']]) {
            const el = scope.locator(sel);
            if (await el.isVisible().catch(() => false)) { if (!(await el.inputValue().catch(() => ''))) await el.selectOption(val).catch(() => {}); }
        }
    };
    // Publish (OJS: "Schedule For Publication" › panel › "Publish"; OMP: "Publish" › "Schedule For Publication" window; OPS: "Post").
    async function publishNow(it, name, {backIssue} = {}) {
        const o = {};
        await openEntry(it, 'Title & Abstract');
        const waitPublish = () => page.waitForResponse((r) => /\/publications\/\d+\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        if (isOJS) {
            const button = page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: /^(Schedule For Publication|Publish)$/});
            await button.waitFor({state: 'visible', timeout: T});
            await sleep(800);
            await button.click();
            const panel = page.locator('[data-cy="active-modal"]').filter({hasText: 'Review Publishing Details'}).last();
            const confirm = page.getByRole('dialog').filter({hasText: 'Are you sure you want to publish this?'});
            const which = () => Promise.race([panel.locator('select[name="versionStage"]').waitFor({state: 'visible', timeout: 15_000}).then(() => 'panel'),
                confirm.waitFor({state: 'visible', timeout: 15_000}).then(() => 'confirm')]).catch(() => null);
            let opened = await which();
            if (!opened) { await button.click({timeout: 5_000}).catch(() => {}); opened = await which(); }
            o.opened = opened;
            if (opened === 'panel') {
                await fillVersion(panel);
                const dontAssign = panel.getByRole('radio', {name: "Don't Assign To An Issue"});
                if (await dontAssign.waitFor({state: 'visible', timeout: 5_000}).then(() => true).catch(() => false)) {
                    await panel.locator('input[name="assignment"]:checked').waitFor({state: 'attached', timeout: T}).catch(() => {});
                    if (backIssue) {
                        await panel.getByRole('radio', {name: 'Assign To Current/Back Issue'}).check();
                        const sel = panel.locator('select[name="issueId"]');
                        await sel.waitFor({state: 'visible', timeout: T});
                        const opt = sel.locator('option').filter({hasText: backIssue});
                        await opt.first().waitFor({state: 'attached', timeout: T});
                        await sel.selectOption((await opt.first().getAttribute('value')) || '');
                    } else await dontAssign.check();
                }
                o.panel = flat(await panel.innerText().catch(() => ''), 1500);
                await snap(`${name}-panel`);
                await panel.getByRole('button', {name: 'Confirm', exact: true}).click();
                await confirm.waitFor({state: 'visible', timeout: T});
            }
            o.confirm = flat(await confirm.innerText().catch(() => ''), 600);
            const done = waitPublish();
            await confirm.getByRole('button', {name: 'Publish', exact: true}).click();
            const r = await done;
            o.status = r ? r.status() : null;
            await page.getByRole('button', {name: 'Unpublish', exact: true}).waitFor({state: 'visible', timeout: T}).catch(() => {});
        } else if (isOMP) {
            await page.getByRole('button', {name: 'Publish', exact: true}).first().click();
            const modal = page.getByRole('dialog', {name: /Schedule For Publication/});
            await modal.waitFor({state: 'visible', timeout: T});
            await idle(page); await sleep(500);
            await fillVersion(modal);
            o.panel = flat(await modal.innerText().catch(() => ''), 1500);
            await snap(`${name}-panel`);
            const done = waitPublish();
            await modal.getByRole('button', {name: 'Publish', exact: true}).click();
            const r = await done;
            o.status = r ? r.status() : null;
            await page.getByRole('button', {name: 'Unpublish', exact: true}).waitFor({state: 'visible', timeout: T}).catch(() => {});
        } else {
            const post = page.getByRole('button', {name: 'Post', exact: true});
            await post.first().waitFor({state: 'visible', timeout: T});
            await sleep(800);
            await post.first().click();
            const last = page.getByRole('dialog').filter({hasText: /Are you sure you want to post this|problems|cannot/i}).last();
            await last.waitFor({state: 'visible', timeout: T});
            await idle(page); await sleep(500);
            await fillVersion(last);
            o.confirm = flat(await last.innerText().catch(() => ''), 900);
            await snap(`${name}-panel`);
            const go2 = last.getByRole('button', {name: 'Post', exact: true});
            o.offered = await go2.count();
            if (o.offered) {
                const done = waitPublish();
                await go2.last().click();
                const r = await done;
                o.status = r ? r.status() : null;
                await page.getByRole('button', {name: 'Unpost', exact: true}).waitFor({state: 'visible', timeout: T}).catch(() => {});
            }
        }
        await idle(page);
        await snap(name, {publish: o});
        log('publish', name, JSON.stringify(o).slice(0, 400));
        return o;
    }
    // Unpublish (OJS / OMP "Unpublish", OPS "Unpost") from a publication page.
    async function unpublish(it, name) {
        await openEntry(it, 'Title & Abstract');
        const b = page.getByRole('button', {name: isOPS ? 'Unpost' : 'Unpublish', exact: true}).first();
        await b.waitFor({state: 'visible', timeout: T});
        await b.click();
        const d = page.getByRole('dialog').filter({has: page.getByRole('button', {name: isOPS ? 'Unpost' : 'Unpublish', exact: true})}).last();
        await d.waitFor({state: 'visible', timeout: T});
        const txt = flat(await d.innerText().catch(() => ''), 400);
        const w = page.waitForResponse((r) => /\/unpublish/.test(r.url()), {timeout: T}).catch(() => null);
        await d.getByRole('button', {name: isOPS ? 'Unpost' : 'Unpublish', exact: true}).last().click();
        const r = await w;
        await idle(page); await sleep(800);
        await snap(name);
        return {dialog: txt, status: r ? r.status() : null};
    }
    // Rich text (TinyMCE) replace.
    async function setRich(idPrefix, html) {
        const iframe = page.locator(`iframe[id^="${idPrefix}"]`).first();
        if (!(await iframe.count())) return {found: false};
        const id = (await iframe.getAttribute('id')).replace(/_ifr$/, '');
        await page.waitForFunction((i) => !!(window.tinymce && window.tinymce.get(i) && window.tinymce.get(i).initialized), id, {timeout: T}).catch(() => {});
        await page.frameLocator(`#${id}_ifr`).locator('body').click();
        await page.keyboard.press('ControlOrMeta+A');
        await page.keyboard.press('Delete');
        if (html) await page.keyboard.type(html);
        await sleep(400);
        return {found: true, id, after: await page.evaluate((i) => window.tinymce.get(i).getContent(), id).catch(() => null)};
    }
    // A chip list (keywords, subjects, …): type each term and Enter.
    async function chips(control, terms) {
        const box = page.locator(`#${control}`);
        if (!(await box.count())) return {found: false};
        for (const x of terms) { await box.click(); await box.pressSequentially(x, {delay: 15}); await box.press('Enter'); await sleep(300); }
        return {found: true};
    }
    // Settings (legacy grids and Vue tabs)
    const settingsUrl = (area) => app.url(`/index.php/${C.path}/management/settings/${area}`);
    async function tab(area, name) {
        await go(settingsUrl(area));
        const tb = page.getByRole('tab', {name, exact: true}).first();
        await tb.waitFor({state: 'visible', timeout: T}).catch(() => {});
        await tb.click().catch(() => {});
        await idle(page); await sleep(800);
    }
    async function formSave(scope) {
        const r = page.waitForResponse((x) => /\/api\/v1\/(contexts|_payments|site)/.test(x.url()) && ['POST', 'PUT'].includes(x.request().method()), {timeout: T}).catch(() => null);
        await scope.getByRole('button', {name: 'Save', exact: true}).first().click();
        const resp = await r;
        await sleep(800);
        let body = null;
        if (resp && resp.status() >= 400) { try { body = flat(await resp.text(), 500); } catch (e) { /* none */ } }
        return {status: resp ? resp.status() : null, body, errors: await scope.locator('.pkpFieldError, .pkpFormPage__errors').allInnerTexts().catch(() => [])};
    }
    const GRIDSEL = isOMP ? '#seriesGridContainer' : '#sectionsGridContainer';
    const SFORM = isOMP ? 'form#seriesForm' : 'form#sectionForm';
    const sform = () => page.locator(SFORM).first();
    async function openSections() {
        await go(settingsUrl('context'));
        await page.getByRole('tab', {name: isOMP ? 'Series' : 'Sections', exact: true}).first().click();
        await idle(page);
        await page.locator(GRIDSEL).locator('tr.gridRow').first().waitFor({timeout: T});
        await sleep(400);
    }
    async function openSection(title) {
        const row = page.locator(GRIDSEL).locator('tr.gridRow').filter({hasText: title}).first();
        const tog = row.locator('a.show_extras');
        if (await tog.count()) { await tog.first().click(); await sleep(400); }
        const id = await row.getAttribute('id');
        await page.locator(`tr#${id} + tr`).getByRole('link', {name: 'Edit', exact: true}).first().click();
        await sform().locator('input[name^="title"]').first().waitFor({timeout: T});
        await idle(page); await sleep(800);
    }
    async function sectionSave(name) {
        const w = page.waitForResponse((r) => r.request().method() === 'POST' && /(update|save)-?(section|series)/i.test(r.url()), {timeout: T}).catch(() => null);
        await sform().getByRole('button', {name: 'Save', exact: true}).click();
        const r = await w;
        await sleep(1200); await idle(page).catch(() => {});
        const open = await sform().isVisible().catch(() => false);
        await snap(name, {post: r ? r.status() : null, windowOpen: open});
        return {post: r ? r.status() : null, windowOpen: open, errors: open ? await sform().locator('label.error, .pkp_form_error').allInnerTexts().catch(() => []) : []};
    }
    async function sectionEdit(title, name, fn) {
        await openSections();
        await openSection(title);
        const before = await fields(SFORM);
        await fn();
        const saved = await sectionSave(`${name}-saved`);
        if (saved.windowOpen) await sform().getByRole('link', {name: 'Cancel', exact: true}).first().click().catch(() => {});
        await page.reload(); await idle(page);
        await openSections();
        const grid = flat(await page.locator(GRIDSEL).innerText().catch(() => ''), 800);
        await openSection(title);
        const after = await fields(SFORM);
        await snap(`${name}-reopened`, {form: after});
        await sform().getByRole('link', {name: 'Cancel', exact: true}).first().click().catch(() => {});
        await sleep(600);
        const pick = (f) => (f || []).filter((x) => /abbrev|identifyType|metaReviewed|title\[/.test(x.name)).map((x) => [x.name, x.checked ?? x.value, x.label]);
        return {before: pick(before), saved, grid, after: pick(after)};
    }
    try {
        // ============================================================== base: the records before the context texts are typed
        if (on('base')) {
            const o = {};
            const pubd = isOJS ? ['C', 'E'] : isOMP ? ['E', 'F'] : ['E', 'W'];
            for (const k of pubd) {
                o[`get${k}`] = await get(`b-get-${k}`, s[k]);
                if (isOJS) { o[`marc${k}`] = await get(`b-marc-${k}`, s[k], 'oai_marc'); o[`marcxml${k}`] = await get(`b-marcxml-${k}`, s[k], 'marcxml'); }
            }
            o.list = await raw('b-list', oaiUrl(C.path, 'verb=ListRecords&metadataPrefix=oai_dc'));
            o.sets = await raw('b-sets', oaiUrl(C.path, 'verb=ListSets'));
            o.view = await view('b-view-E', oaiUrl(C.path, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(idOf(s.E))}`), {png: true});
            fact('base', o);
        }

        // ============================================================== settings: sections, masthead, metadata settings, license (manager)
        if (on('settings')) {
            const o = {};
            await as(U.mg);
            if (!isOMP) {
                o.first = await sectionEdit(isOJS ? 'Articles' : 'Preprints', 'st-01-first-section', async () => {
                    await sform().locator('input[name="abbrev[en]"]').fill(isOJS ? 'ART' : 'PRE');
                    const fr = sform().locator('input[name="abbrev[fr_CA]"]');
                    if (await fr.count()) await fr.fill(isOJS ? 'ARTF' : 'PREF');
                });
                if (isOJS) {
                    o.npr = await sectionEdit('K3 Not Reviewed', 'st-02-npr', async () => { await sform().locator('input[name="metaReviewed"]').check(); });
                    await loc(page, 'Section window: "Will not be peer-reviewed" input[name="metaReviewed"]', sform().locator('input[name="metaReviewed"]'));
                }
                o.typ = await sectionEdit(isOJS ? 'K3 Typed' : 'K3 Working', 'st-03-identify', async () => {
                    await sform().locator('input[name="identifyType[en]"]').fill(isOJS ? 'K3 Research Note' : 'Working Paper');
                    const fr = sform().locator('input[name="identifyType[fr_CA]"]');
                    if (await fr.count()) await fr.fill(isOJS ? 'Note de recherche K3' : 'Document de travail');
                });
            }
            // Masthead: the texts (publisher, ISSNs) and the required Country
            await tab('context', 'Masthead');
            o.mastheadBefore = await fields('body');
            await snap('st-04-masthead-before', {}, {png: true});
            const mform = page.locator('form').filter({has: page.locator('select[name="country"]')}).first();
            await mform.locator('select[name="country"]').selectOption({label: 'Canada'}).catch((e) => { o.countryErr = flat(e.message, 200); });
            const pubBox = mform.locator(isOJS ? 'input[name="publisherInstitution"]' : 'input[name^="publisher"]').first();
            o.publisherBox = await pubBox.count();
            if (o.publisherBox) await pubBox.fill(isOMP ? 'K3 Press Publisher' : 'K3 Publisher Inc.');
            if (isOJS) {
                await mform.locator('input[name="onlineIssn"]').fill('0378-5955').catch((e) => { o.issnErr = flat(e.message, 200); });
                await mform.locator('input[name="printIssn"]').fill('2049-3630').catch((e) => { o.issnErr2 = flat(e.message, 200); });
            }
            o.mastheadSave = await formSave(mform);
            await snap('st-05-masthead-saved', {save: o.mastheadSave});
            await page.reload(); await idle(page);
            await tab('context', 'Masthead');
            o.mastheadAfter = (await fields('body')).filter((x) => /publisher|Issn|country|name-|acronym/i.test(x.name));
            await snap('st-06-masthead-reopened', {form: o.mastheadAfter});
            // License: holder "Author", CC Attribution 4.0
            await go(settingsUrl('distribution'));
            await page.locator('#license-button').click().catch(() => {});
            const anchor = page.getByRole('radio', {name: 'CC Attribution 4.0', exact: true});
            await anchor.waitFor({state: 'visible', timeout: T}).catch(() => {});
            await page.getByRole('radio', {name: 'Author', exact: true}).check().catch((e) => { o.holderErr = flat(e.message, 200); });
            await anchor.check().catch(() => {});
            o.licenseSave = await formSave(page.locator('form').filter({has: anchor}).first());
            await snap('st-07-license-saved', {save: o.licenseSave});
            // Metadata settings: "Enable article number metadata" (OJS); the version's Metadata page before and after
            if (isOJS) {
                await openEntry(s.A, 'Metadata');
                o.mdBefore = (await fields('body')).filter((x) => x.visible).map((x) => [x.name, x.label, x.value]);
                await snap('st-08-metadata-page-before', {}, {png: true});
                await go(settingsUrl('workflow'));
                await page.locator('#metadata-button').click().catch(() => {});
                const box = page.getByRole('checkbox', {name: 'Enable article number metadata'});
                await box.waitFor({state: 'visible', timeout: T}).catch(() => {});
                o.anBoxBefore = await box.isChecked().catch(() => null);
                await snap('st-09-metadata-settings-before');
                await box.check();
                o.anSave = await formSave(page.locator('form').filter({has: box}).first());
                await openEntry(s.A, 'Metadata');
                o.mdAfter = (await fields('body')).filter((x) => x.visible).map((x) => [x.name, x.label, x.value]);
                await snap('st-10-metadata-page-after', {}, {png: true});
                await loc(page, 'Metadata page: "Article Number" input[name="articleNumber"]', page.locator('input[name="articleNumber"]'));
            }
            fact('settings', o);
            // the section editor / moderator on the sections tab (a control for the manager-only screen)
            await as(U.se);
            const st = await go(settingsUrl('context'));
            o.seSections = {status: st, url: page.url().replace(app.baseURL, '')};
            await snap('st-11-se-settings-context');
            fact('settingsSe', o.seSections);
        }
        // ============================================================== prep: the main item typed on screen, then published
        // A field of another language sits behind the form's language bar ("French").
        async function fillAny(scope, sel, value) {
            const el = scope.locator(sel).first();
            if (!(await el.count())) return 0;
            if (!(await el.isVisible().catch(() => false))) {
                const b = scope.locator('.pkpFormLocales').getByRole('button', {name: /French|Fran/}).first();
                if (await b.count()) { await b.click().catch(() => {}); await sleep(400); }
            }
            if (!(await el.isVisible().catch(() => false))) return -1;
            await el.fill(value);
            return 1;
        }
        async function addContributor(it, name, {ror = true} = {}) {
            const o = {};
            await openEntry(it, 'Contributors');
            await page.locator('.listPanel--contributor, [class*="contributor"]').first().waitFor({timeout: T}).catch(() => {});
            await wf().getByRole('button', {name: 'Add Contributor', exact: true}).first().click();
            const d = page.getByRole('dialog').filter({has: page.locator('input[name="givenName-en"]')}).last();
            await d.waitFor({state: 'visible', timeout: T});
            await idle(page); await sleep(600);
            o.fieldsOpen = (await fields(await d.elementHandle())).filter((x) => x.visible).map((x) => [x.name, x.label]);
            await d.locator('input[name="givenName-en"]').fill('Bo');
            await d.locator('input[name="familyName-en"]').fill('Second');
            o.french = [await fillAny(d, 'input[name="givenName-fr_CA"]', 'Beau'), await fillAny(d, 'input[name="familyName-fr_CA"]', 'Deuxième')];
            const en = d.locator('.pkpFormLocales').getByRole('button', {name: /English/}).first();
            if (await en.count()) await en.click().catch(() => {});
            await d.locator('input[name="email"]').fill(`k3second${S.t}@mail.test`);
            await d.locator('select[name="country"]').selectOption({label: 'Canada'}).catch(() => {});
            const url = d.locator('input[name="url"]');
            if (await url.count()) await url.fill('https://example.org/bo-second');
            const author = d.getByRole('checkbox', {name: 'Author', exact: true});
            if ((await author.count()) && !(await author.isChecked())) await author.check().catch(() => {});
            if (ror) {
                const field = d.locator('#contributor-affiliations');
                const search = field.locator('input.pkpAutosuggest__input').first();
                if (await search.count()) {
                    await search.click();
                    await search.pressSequentially('University of Oxford', {delay: 20});
                    const items = field.locator('li.autosuggest__results-item');
                    await sleep(2500);
                    o.suggestions = (await items.allInnerTexts().catch(() => [])).map((x) => flat(x, 120)).slice(0, 8);
                    const pick = items.filter({hasText: /ror\.org|University of Oxford/}).nth(o.suggestions.length > 1 ? 1 : 0);
                    await pick.click().catch((e) => { o.pickErr = flat(e.message, 200); });
                    await sleep(500);
                    const add = field.getByRole('button', {name: 'Add', exact: true});
                    if (await add.count()) await add.click().catch(() => {});
                    await sleep(1500);
                    // the install cannot reach the registry: "An unexpected error has occurred." (U41 A5); OK, then a typed one
                    const err = page.getByRole('dialog').filter({hasText: 'An unexpected error has occurred'}).last();
                    if (await err.isVisible().catch(() => false)) {
                        o.rorError = flat(await err.innerText().catch(() => ''), 200);
                        await err.getByRole('button', {name: 'OK', exact: true}).click().catch(() => {});
                        await sleep(600);
                    }
                    const search2 = field.locator('input.pkpAutosuggest__input').first();
                    await search2.click().catch(() => {});
                    await search2.pressSequentially('K3 Typed Institute', {delay: 15}).catch(() => {});
                    await sleep(1500);
                    await field.locator('li.autosuggest__results-item').filter({hasText: 'K3 Typed Institute'}).first().click().catch((e) => { o.typedErr = flat(e.message, 150); });
                    await sleep(400);
                    if (await add.count()) await add.click().catch(() => {});
                    await sleep(800);
                    o.affRows = await field.locator('tbody tr').allInnerTexts().catch(() => []);
                } else o.noAffField = true;
            }
            await snap(`${name}-typed`, {}, {png: true});
            const saved = page.waitForResponse((r) => r.url().includes('/contributors') && r.request().method() === 'POST', {timeout: T}).catch(() => null);
            await d.getByRole('button', {name: 'Save', exact: true}).click();
            const r = await saved;
            o.status = r ? r.status() : null;
            await d.waitFor({state: 'detached', timeout: T}).catch(() => {});
            await idle(page);
            o.rows = await page.locator('.listPanel--contributor li.listPanel__item, [class*="listPanel__item"]').allInnerTexts().catch(() => []);
            await snap(`${name}-saved`);
            return o;
        }
        async function metadataType(it, name) {
            const o = {};
            await openEntry(it, 'Metadata');
            o.fields = (await fields('body')).filter((x) => x.visible).map((x) => [x.name, x.label]);
            for (const [n, v] of [['coverage-en', 'Pacific'], ['coverage-fr_CA', 'Pacifique'], ['rights-en', 'K3 Rights words'], ['source-en', 'K3 Source words'], ['type-en', 'K3 Dataset type']]) {
                o[n] = await fillAny(page, `input[name="${n}"]`, v);
            }
            if (isOMP) {
                for (const [c, terms] of [['metadata-keywords-control-en', ['tides', 'moon']], ['metadata-subjects-control-en', ['Oceanography']], ['metadata-disciplines-control-en', ['Geophysics']], ['metadata-supportingAgencies-control-en', ['K3 Tide Fund']]]) o[c] = await chips(c, terms);
            }
            await snap(`${name}-typed`, {}, {png: true});
            o.save = await pressSave();
            await page.reload(); await idle(page); await sleep(1500);
            await openEntry(it, 'Metadata');
            o.after = (await fields('body')).filter((x) => x.visible && /coverage|rights|source|type|keyword|subject|disciplin|agenc|articleNumber/i.test(x.name)).map((x) => [x.name, x.value]);
            await snap(`${name}-reopened`);
            return o;
        }
        async function pagesType(it, name, value, {issue} = {}) {
            const o = {};
            await openEntry(it, 'Publication Settings');
            // the page refuses a save with no issue choice ("Issue Assignment *")
            const radio = page.getByRole('radio', {name: issue ? 'Assign To Current/Back Issue' : "Don't Assign To An Issue", exact: true}).first();
            if (await radio.isVisible().catch(() => false)) {
                await radio.check();
                if (issue) {
                    const sel = page.locator('select[name="issueId"]').first();
                    await sel.waitFor({state: 'visible', timeout: T}).catch(() => {});
                    const opt = sel.locator('option').filter({hasText: issue}).first();
                    await opt.waitFor({state: 'attached', timeout: T}).catch(() => {});
                    await sel.selectOption((await opt.getAttribute('value').catch(() => '')) || '').catch(() => {});
                }
            }
            const box = page.locator('input[name="pages"]').first();
            o.box = await box.count();
            if (o.box) { await box.fill(value); await box.press('Tab').catch(() => {}); }
            o.save = await pressSave();
            await snap(name, {save: o.save});
            await loc(page, 'Publication Settings: "Pages" input[name="pages"]', box);
            return o;
        }
        if (on('prep')) {
            const o = S.prep || {};
            await as(U.mg);
            if (isOMP && !o.subtitle) {
                await openEntry(s.A, 'Title & Abstract');
                o.taFields = (await fields('body')).filter((x) => x.visible).map((x) => [x.name, x.label]);
                const en = page.locator('input[name="subtitle-en"]');
                o.subtitle = {en: await en.count()};
                if (o.subtitle.en) await en.fill('A moon study');
                o.subtitle.fr = await fillAny(page, 'input[name="subtitle-fr_CA"]', 'Une étude lunaire');
                o.subtitle.save = await pressSave();
                await snap('p-00-omp-subtitle', {save: o.subtitle.save});
            }
            if (!o.contrib) { o.contrib = await addContributor(s.A, 'p-01-contributor'); }
            S.prep = o; save();
            if (!o.meta) { o.meta = await metadataType(s.A, 'p-02-metadata'); }
            S.prep = o; save();
            if (isOJS) {
                // Pages need the issue choice on the same page: typed after the first publish refused them, so each is
                // unpublished, typed and published again
                for (const [k, iss, n] of [['B', /Vol\. 1 No\. 2/, '03'], ['D', null, '04']]) {
                    if (o[`pages${k}ok`]) continue;
                    if (o[`pub${k}`] && !o[`unpub${k}`]) { o[`unpub${k}`] = await unpublish(s[k], `p-${n}-unpublish-${k}`); S.prep = o; save(); }
                    o[`pages${k}`] = await pagesType(s[k], `p-${n}-pages-${k}`, '15-20', {issue: iss});
                    o[`pages${k}ok`] = o[`pages${k}`].save.status === 200;
                    S.prep = o; save();
                    if (o[`unpub${k}`] && o[`pages${k}ok`]) { o[`repub${k}`] = await publishNow(s[k], `p-${n}-republish-${k}`, {backIssue: iss}); S.prep = o; save(); }
                }
                if (!o.pubA) { o.pubA = await publishNow(s.A, 'p-05-publish-A', {backIssue: /Vol\. 1 No\. 2/}); S.prep = o; save(); }
                if (!o.pubB) { o.pubB = await publishNow(s.B, 'p-06-publish-B', {backIssue: /Vol\. 1 No\. 2/}); S.prep = o; save(); }
                if (!o.pubD) { o.pubD = await publishNow(s.D, 'p-07-publish-D'); S.prep = o; save(); }
            } else if (!o.pubA) { o.pubA = await publishNow(s.A, 'p-05-publish-A'); S.prep = o; save(); }
            // OMP: the subtitle is a rich-text box (no input): typed after an unpublish, then published again
            if (isOMP && !o.subtitleRich) {
                if (o.pubA && !o.unpubA) { o.unpubA = await unpublish(s.A, 'p-06-unpublish-A'); S.prep = o; save(); }
                await openEntry(s.A, 'Title & Abstract');
                o.subtitleRich = {en: await setRich('titleAbstract-subtitle-control-en', 'A moon study')};
                const b = page.locator('.pkpFormLocales').getByRole('button', {name: /French|Fran/}).first();
                if (await b.count()) { await b.click().catch(() => {}); await sleep(600); }
                o.subtitleRich.fr = await setRich('titleAbstract-subtitle-control-fr_CA', 'Une étude lunaire');
                o.subtitleRich.save = await pressSave();
                await snap('p-07-omp-subtitle-rich', {save: o.subtitleRich.save}, {png: true});
                S.prep = o; save();
                if (o.unpubA) { o.repubA = await publishNow(s.A, 'p-08-republish-A'); S.prep = o; save(); }
            }
            fact('prep', o);
            o.db = db(app, isOJS ? `select p.submission_id, p.issue_id, p.status, p.date_published, (select setting_value from publication_settings where publication_id=p.publication_id and setting_name='pages' limit 1), (select string_agg(setting_name||'='||setting_value, ';') from publication_settings where publication_id=p.publication_id and setting_name in ('articleNumber','coverage')) from publications p where p.submission_id in (${[s.A, s.B, s.C, s.D, s.E].map((x) => x.id).join(',')}) order by 1`
                : `select submission_id, status, date_published from publications where submission_id=${s.A.id}`);
            fact('prepDb', o.db);
        }
        // ============================================================== read: every record, the browser view, the MARC schema check
        if (on('read')) {
            const o = {};
            const items = isOJS ? ['A', 'B', 'C', 'D', 'E'] : isOMP ? ['A', 'E', 'F'] : ['A', 'E', 'W'];
            for (const k of items) {
                o[`dc${k}`] = await get(`r-dc-${k}`, s[k]);
                if (isOJS) { o[`marc${k}`] = await get(`r-marc-${k}`, s[k], 'oai_marc'); o[`marcxml${k}`] = await get(`r-marcxml-${k}`, s[k], 'marcxml'); }
            }
            if (isOMP) o.dcA2 = await raw('r-dc-A2', oaiUrl(C.path, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(`oai:${REPO_ID}:publicationFormat/${s.F.formats[1]}`)}`));
            o.list = await raw('r-list', oaiUrl(C.path, 'verb=ListRecords&metadataPrefix=oai_dc'));
            o.ids = await raw('r-ids', oaiUrl(C.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc'));
            o.sets = await raw('r-sets', oaiUrl(C.path, 'verb=ListSets'));
            if (!isOJS) { o.marcxmlA = await get('r-marcxml-A', s.A, 'marcxml'); o.marcA = await get('r-marc-A', s.A, 'oai_marc'); }
            // the browser view of the main record, and of the MARC ones (OJS)
            o.viewA = await view('r-view-dc-A', oaiUrl(C.path, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(idOf(s.A))}`), {png: true});
            if (isOJS) {
                o.viewMarcA = await view('r-view-marc-A', oaiUrl(C.path, `verb=GetRecord&metadataPrefix=oai_marc&identifier=${encodeURIComponent(idOf(s.A))}`), {png: true});
                o.viewMarcxmlA = await view('r-view-marcxml-A', oaiUrl(C.path, `verb=GetRecord&metadataPrefix=marcxml&identifier=${encodeURIComponent(idOf(s.A))}`));
                // q4: the marcxml record against the schema it names
                const xsd = path.join(outDir(), 'MARC21slim.xsd');
                // loc.gov answers a Cloudflare challenge to curl and to a headless browser: the Wayback Machine's raw copy is the fallback
                for (const u of ['https://www.loc.gov/standards/marcxml/schema/MARC21slim.xsd', 'https://web.archive.org/web/2024id_/https://www.loc.gov/standards/marcxml/schema/MARC21slim.xsd']) {
                    if (fs.existsSync(xsd) && fs.readFileSync(xsd, 'utf8').includes('xsd:schema')) break;
                    try { execFileSync('curl', ['-sL', '-m', '60', '-o', xsd, u]); o.xsdFrom = u; } catch (e) { o.xsdErr = flat(e.message, 200); }
                }
                for (const k of ['A', 'C']) {
                    const f = path.join(outDir(), `r-marcxml-${k}-${app.name}.record.xml`);
                    const body = fs.readFileSync(path.join(outDir(), `raw-r-marcxml-${k}-${app.name}.xml`), 'utf8');
                    const rec = (body.match(/<record\s+xmlns="http:\/\/www\.loc\.gov\/MARC21\/slim"[\s\S]*?<\/record>/) || [])[0];
                    if (!rec) { o[`xsd${k}`] = {noRecord: true}; continue; }
                    fs.writeFileSync(f, `<?xml version="1.0" encoding="UTF-8"?>\n${rec}\n`);
                    let res;
                    try { res = execFileSync('xmllint', ['--noout', '--schema', xsd, f], {stdio: ['ignore', 'pipe', 'pipe']}).toString(); o[`xsd${k}`] = {valid: true, out: flat(res, 500)}; } catch (e) { o[`xsd${k}`] = {valid: false, out: String(e.stderr || e.message).split('\n').filter(Boolean).slice(0, 20)}; }
                }
            }
            fact('read', o);
        }

        // ============================================================== lang: Rule 19 / q19
        if (on('lang')) {
            const o = {};
            // publicknowledge, signed out, in a fresh browser: the plain address, the French one
            const b = await chromium.launch();
            const ctx2 = await b.newContext({baseURL: app.baseURL});
            const p2 = await ctx2.newPage();
            const chain = [];
            p2.on('response', (r) => { try { if (r.request().isNavigationRequest() && r.frame() === p2.mainFrame()) chain.push({url: r.url().replace(app.baseURL, ''), status: r.status(), location: r.headers().location || null}); } catch (e) { /* none */ } });
            await p2.goto(`${app.baseURL}/index.php/publicknowledge/oai?verb=Identify`, {waitUntil: 'load'}).catch(() => {});
            o.pkIdentify = {chain, final: p2.url().replace(app.baseURL, ''), text: flat(await p2.locator('body').innerText().catch(() => ''), 1200)};
            await p2.screenshot({path: path.join(outDir(), `l-01-pk-identify-${app.name}.png`), fullPage: true}).catch(() => {});
            chain.length = 0;
            await p2.goto(`${app.baseURL}/index.php/publicknowledge/fr_CA/oai?verb=ListSets`, {waitUntil: 'load'}).catch(() => {});
            o.pkSetsFr = {chain: [...chain], final: p2.url().replace(app.baseURL, ''), text: flat(await p2.locator('body').innerText().catch(() => ''), 1500)};
            await b.close();
            o.pkRaw302 = await (async () => { const rc = await pwRequest.newContext(); const r = await rc.get(`${app.baseURL}/index.php/publicknowledge/oai?verb=Identify`, {maxRedirects: 0, failOnStatusCode: false}); const x = {status: r.status(), location: r.headers().location || null}; await rc.dispose(); return x; })();
            o.pkIdentifyRaw = await raw('l-pk-identify', `${app.baseURL}/index.php/publicknowledge/oai?verb=Identify`);
            o.pkIdentifyBase = (fs.readFileSync(path.join(outDir(), `raw-l-pk-identify-${app.name}.xml`), 'utf8').match(/<baseURL>([^<]*)</) || [])[1];
            o.pkSetsFrRaw = await raw('l-pk-sets-fr', `${app.baseURL}/index.php/publicknowledge/fr_CA/oai?verb=ListSets`);
            o.pkSetsFrNames = (fs.readFileSync(path.join(outDir(), `raw-l-pk-sets-fr-${app.name}.xml`), 'utf8').match(/<setName>[^<]*<\/setName>/g) || []).slice(0, 12);
            // the scratch context: Identify, ListSets and the main record in each language
            for (const l of ['en', 'fr_CA']) {
                const id = await raw(`l-identify-${l}`, oaiUrl(C.path, 'verb=Identify', l));
                o[`identify_${l}`] = {status: id.status, name: (fs.readFileSync(path.join(outDir(), `raw-l-identify-${l}-${app.name}.xml`), 'utf8').match(/<repositoryName>([^<]*)</) || [])[1]};
                const st = await raw(`l-sets-${l}`, oaiUrl(C.path, 'verb=ListSets', l));
                o[`sets_${l}`] = {status: st.status, sets: [...fs.readFileSync(path.join(outDir(), `raw-l-sets-${l}-${app.name}.xml`), 'utf8').matchAll(/<setSpec>([^<]*)<\/setSpec>\s*<setName>([^<]*)<\/setName>/g)].map((m) => `${m[1]} = ${m[2]}`)};
                const g = await get(`l-dc-A-${l}`, s.A, 'oai_dc', l);
                o[`dcA_${l}`] = {status: g.status, setSpecs: g.setSpecs, types: (g.dc || []).filter((x) => x.el === 'type'), titles: (g.dc || []).filter((x) => x.el === 'title')};
                o[`view_${l}`] = await view(`l-view-dc-A-${l}`, oaiUrl(C.path, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(idOf(s.A))}`, l), {png: l === 'fr_CA'});
            }
            // OJS: the MARC records of C (versions) in French: 251 and 780 $i
            if (isOJS) for (const pf of ['oai_marc', 'marcxml']) {
                const g = await get(`l-${pf}-C-fr_CA`, s.C, pf, 'fr_CA');
                o[`${pf}C_fr`] = (g.marc || []).filter((r) => /"251"|"780"/.test(r.attrs)).map((r) => r.subs);
            }
            // the plain address of the two-language scratch context (one hop to /en/)
            const jar = await pwRequest.newContext();
            const r0 = await jar.get(oaiUrl(C.path, 'verb=Identify'), {maxRedirects: 0, failOnStatusCode: false});
            o.plain302 = {status: r0.status(), location: (r0.headers().location || '').replace(app.baseURL, '')};
            // the same client after one request at the French address
            await jar.get(oaiUrl(C.path, 'verb=Identify', 'fr_CA'), {failOnStatusCode: false});
            const r1 = await jar.get(oaiUrl(C.path, 'verb=Identify'), {maxRedirects: 0, failOnStatusCode: false});
            o.plain302AfterFr = {status: r1.status(), location: (r1.headers().location || '').replace(app.baseURL, ''), cookies: (await jar.storageState()).cookies.map((c) => `${c.name}=${c.value}`)};
            await jar.dispose();
            fact('lang', o);
        }
        // ============================================================== version: a second version of C (OJS), MARC 251 / 500 / 780
        if (on('version') && isOJS) {
            const o = S.ver || {};
            await as(U.mg);
            if (!o.created) {
                await openEntry(s.C, 'Title & Abstract');
                const link = page.getByRole('link', {name: 'Create New Version', exact: true}).or(page.getByRole('button', {name: 'Create New Version', exact: true})).first();
                await link.waitFor({state: 'visible', timeout: T});
                await sleep(1500);
                await link.click();
                const w = page.getByRole('dialog').filter({has: page.locator('select[name="versionStage"]')}).last();
                await w.locator('select[name="versionStage"]').waitFor({state: 'visible', timeout: T});
                await idle(page); await sleep(800);
                o.window = (await fields(await w.elementHandle())).filter((x) => x.visible).map((x) => [x.name, x.label, x.value ?? x.selected]);
                await w.locator('select[name="versionStage"]').selectOption('VoR').catch(() => {});
                await w.locator('select[name="versionIsMinor"]').selectOption('true').catch(() => {});
                await snap('v-01-new-version-window', {}, {png: true});
                const r = page.waitForResponse((x) => /\/publications\/\d+\/version/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
                await w.getByRole('button', {name: 'Confirm', exact: true}).click();
                const resp = await r;
                o.status = resp ? resp.status() : null;
                try { o.newPub = (await resp.json()).id; } catch (e) { /* none */ }
                await idle(page); await sleep(1000);
                o.created = !!o.newPub;
                S.ver = o; save();
            }
            const it2 = {id: s.C.id, pub: o.newPub};
            if (!o.summary) {
                // "Summary of Changes": wherever the new version's pages offer it
                await openEntry(it2, 'Title & Abstract');
                o.taFields = (await fields('body')).filter((x) => x.visible).map((x) => [x.name, x.label]);
                await snap('v-02-new-version-title-abstract');
                o.summary = {offered: o.taFields.filter((x) => /summary|change/i.test(`${x[0]} ${x[1]}`))};
                S.ver = o; save();
            }
            if (!o.pub) { o.pub = await publishNow(it2, 'v-03-publish-version'); S.ver = o; save(); }
            if (!o.major) {
                await openEntry(it2, 'Title & Abstract');
                const link = page.getByRole('link', {name: 'Create New Version', exact: true}).or(page.getByRole('button', {name: 'Create New Version', exact: true})).first();
                await link.waitFor({state: 'visible', timeout: T});
                await sleep(1500);
                await link.click();
                const w = page.getByRole('dialog').filter({has: page.locator('select[name="versionStage"]')}).last();
                await w.locator('select[name="versionStage"]').waitFor({state: 'visible', timeout: T});
                await idle(page); await sleep(800);
                await w.locator('select[name="versionStage"]').selectOption('VoR').catch(() => {});
                await w.locator('select[name="versionIsMinor"]').selectOption('false').catch(() => {});
                const r = page.waitForResponse((x) => /\/publications\/\d+\/version/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
                await w.getByRole('button', {name: 'Confirm', exact: true}).click();
                const resp = await r;
                try { o.majorPub = (await resp.json()).id; } catch (e) { /* none */ }
                await idle(page); await sleep(1000);
                o.major = !!o.majorPub;
                S.ver = o; save();
            }
            const it3 = {id: s.C.id, pub: o.majorPub};
            if (!o.summaryTyped) {
                await openEntry(it3, 'Publication Settings');
                const ifr = page.locator('iframe[id*="summaryOfChanges"]').first();
                o.summaryIframe = await ifr.getAttribute('id').catch(() => null);
                if (o.summaryIframe) o.summaryRich = await setRich(o.summaryIframe.replace(/-en_ifr$|_ifr$/, ''), 'K3 corrected the tide table.');
                const na = page.getByRole('radio', {name: "Don't Assign To An Issue", exact: true}).first();
                if (await na.isVisible().catch(() => false)) await na.check();
                o.summarySave = await pressSave();
                await snap('v-04-summary-saved', {save: o.summarySave}, {png: true});
                o.summaryTyped = o.summarySave.status === 200;
                S.ver = o; save();
            }
            if (o.summaryTyped && !o.pub3) { o.pub3 = await publishNow(it3, 'v-05-publish-major'); S.ver = o; save(); }
            o.marc = await get('v-marc-C', s.C, 'oai_marc');
            o.marcxml = await get('v-marcxml-C', s.C, 'marcxml');
            o.dc = await get('v-dc-C', s.C);
            o.list = await raw('v-list', oaiUrl(C.path, 'verb=ListRecords&metadataPrefix=oai_dc'));
            fact('version', o);
        }

        // ============================================================== a7: "Peer-reviewed Article" and the section window (OJS)
        // Journal K: its own "Articles" section as the app creates it (never saved in the window), article X published there;
        // a section created on screen with "Will not be peer-reviewed" ticked and the box empty, article Y published there;
        // then "Articles" opened and saved unchanged, X read again.
        if (on('a7') && isOJS) {
            const o = S.a7 || {};
            if (!o.K) {
                const k = `${S.t}k`.slice(0, 30);
                const r = await app.api.createContext({tag: k, context: {name: {en: `K3 Journal K ${S.t}`, fr_CA: `K3 Revue K ${S.t}`}, acronym: 'KTHREEK', supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA']},
                    users: [{username: `${k}mg`, roles: ['manager'], givenName: 'Kim', familyName: 'Manager'}, {username: `${k}au`, roles: ['author'], givenName: 'Kai', familyName: 'Author'}]});
                o.K = {path: r.path || k, mg: `${k}mg`, au: `${k}au`};
                const x = await app.api.createSubmission({tag: `${k}x`, context: o.K.path, submitter: o.K.au, title: `K3 Kx ${S.t}`, published: true, galleys: [{label: 'PDF', file: PDF}]});
                o.X = {id: x.submissionId, pub: x.publicationId};
                S.a7 = o; save();
            }
            const K = o.K;
            const getK = (name, id, l) => raw(name, `${J(K.path, l)}/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(`oai:${REPO_ID}:article/${id}`)}`);
            const types = (g) => (g.dc || []).filter((x) => x.el === 'type').map((x) => `${x.lang || '-'}:${x.v}`);
            o.xEn = types(await getK('a7-x-en', o.X.id));
            o.xFr = types(await getK('a7-x-fr', o.X.id, 'fr_CA'));
            o.xSetsFr = (await raw('a7-sets-fr', `${J(K.path, 'fr_CA')}/oai?verb=ListSets`)).setSpecs;
            o.dbX = db(app, `select ss.locale, quote_nullable(ss.setting_value) from section_settings ss join sections s on s.section_id=ss.section_id where s.journal_id=(select journal_id from journals where path='${K.path}') and ss.setting_name in ('identifyType')`);
            await as(K.mg, K.path);
            const kUrl = app.url(`/index.php/${K.path}/management/settings/context`);
            const openK = async () => {
                await go(kUrl);
                await page.getByRole('tab', {name: 'Sections', exact: true}).first().click();
                await idle(page);
                await page.locator(GRIDSEL).locator('tr.gridRow').first().waitFor({timeout: T});
                await sleep(400);
            };
            if (!o.created) {
                await openK();
                await page.locator(GRIDSEL).getByRole('link', {name: /Create Section/}).first().click();
                await sform().locator('input[name^="title"]').first().waitFor({timeout: T});
                await idle(page); await sleep(800);
                o.createForm = (await fields(SFORM)).filter((x) => /identifyType|metaReviewed|abbrev|title/.test(x.name)).map((x) => [x.name, x.checked ?? x.value, x.label]);
                await sform().locator('input[name="title[en]"]').fill('K3 Fresh');
                await sform().locator('input[name="abbrev[en]"]').fill('FRS');
                await sform().locator('input[name="metaReviewed"]').check();
                await snap('a7-01-create-section', {}, {png: true});
                o.createSave = await sectionSave('a7-02-create-section-saved');
                o.created = o.createSave.post === 200;
                S.a7 = o; save();
            }
            if (!o.Y) {
                const y = await app.api.createSubmission({tag: `${K.path}y`.slice(0, 32), context: K.path, submitter: K.au, title: `K3 Ky ${S.t}`, section: 'FRS', published: true, galleys: [{label: 'PDF', file: PDF}]});
                o.Y = {id: y.submissionId, pub: y.publicationId};
                S.a7 = o; save();
            }
            o.yEn = types(await getK('a7-y-en', o.Y.id));
            o.yView = await view('a7-view-y', `${J(K.path)}/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(`oai:${REPO_ID}:article/${o.Y.id}`)}`);
            if (!o.resaved) {
                await openK();
                await openSection('Articles');
                o.articlesForm = (await fields(SFORM)).filter((x) => /identifyType|metaReviewed|abbrev/.test(x.name)).map((x) => [x.name, x.checked ?? x.value]);
                o.resave = await sectionSave('a7-03-articles-saved-unchanged');
                o.resaved = true;
                S.a7 = o; save();
            }
            o.dbAfter = db(app, `select s.section_id, ss.locale, quote_nullable(ss.setting_value) from section_settings ss join sections s on s.section_id=ss.section_id where s.journal_id=(select journal_id from journals where path='${K.path}') and ss.setting_name in ('identifyType') order by 1,2`);
            o.xEnAfter = types(await getK('a7-x-en-after', o.X.id));
            o.xFrAfter = types(await getK('a7-x-fr-after', o.X.id, 'fr_CA'));
            fact('a7', o);
        }

        // ============================================================== ids: the identifiers a record carries besides the DOI of
        // a journal article: OJS a Publisher ID (journal K); OMP / OPS DOIs set up on screen, OMP a format's identification
        // code and sales rights; each on a new item published on screen after the set-up.
        if (on('ids')) {
            const o = S.ids || {};
            if (!o.G) {
                const ctxPath = isOJS ? S.a7.K.path : C.path;
                const submitter = isOJS ? S.a7.K.au : U.au;
                const spec = {tag: `${S.t}g`.slice(0, 32), context: ctxPath, submitter, title: `K3 Gid ${S.t}`, abstract: 'Gid abstract.'};
                if (isOJS) Object.assign(spec, {files: [{file: PDF}], decisions: ['skipExternalReview', 'sendToProduction'], galleys: [{label: 'PDF', file: PDF}]});
                if (isOMP) Object.assign(spec, {files: [{file: PDF}], decisions: ['skipExternalReview', 'sendToProduction'], publicationFormats: [{name: 'PDF', file: PDF}]});
                if (isOPS) Object.assign(spec, {galleys: [{label: 'PDF', file: PDF}]});
                const x = await app.api.createSubmission(spec);
                o.G = {id: x.submissionId, pub: x.publicationId, formats: (x.publicationFormats || []).map((f) => f.id), ctx: ctxPath};
                S.ids = o; save();
            }
            const G = o.G;
            if (isOJS) {
                await as(S.a7.K.mg, G.ctx);
                if (!o.pidOn) {
                    await go(app.url(`/index.php/${G.ctx}/management/settings/workflow`));
                    await page.locator('#metadata-button').click().catch(() => {});
                    const box = page.getByRole('checkbox', {name: 'Enable for Publications'});
                    await box.waitFor({state: 'visible', timeout: T});
                    await box.check();
                    o.pidSave = await formSave(page.locator('form').filter({has: box}).first());
                    o.pidOn = o.pidSave.status === 200;
                    S.ids = o; save();
                }
                if (!o.pidTyped) {
                    const wfK = (key) => app.url(`/index.php/${G.ctx}/dashboard/editorial?workflowSubmissionId=${G.id}&workflowMenuKey=publication_${G.pub}_${key}`);
                    await page.goto(wfK('titleAbstract')); await idle(page); await sleep(800);
                    await page.getByRole('link', {name: 'Metadata', exact: true}).last().click();
                    await idle(page); await sleep(1200);
                    const pid = page.getByLabel('Publisher ID', {exact: true}).first();
                    o.pidBox = await pid.count();
                    if (o.pidBox) await pid.fill('K3-PID-0001');
                    o.pidTypedSave = await pressSave();
                    await snap('i-01-publisher-id', {save: o.pidTypedSave});
                    o.pidTyped = o.pidTypedSave.status === 200;
                    S.ids = o; save();
                }
                const saveC = {path: C.path};
                if (!o.pub) {
                    // publish on journal K (no issues): through the same helper, with the workflow address of K
                    C.path = G.ctx;
                    o.pub = await publishNow(G, 'i-02-publish-G').catch((e) => ({err: flat(e.message, 200)}));
                    C.path = saveC.path;
                    S.ids = o; save();
                }
                o.dc = await raw('i-dc-G', `${J(G.ctx)}/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(`oai:${REPO_ID}:article/${G.id}`)}`);
                fact('ids', o);
            } else {
                await as(U.mg);
                if (!o.doiOn) {
                    await tab('distribution', 'DOIs');
                    o.doiFieldsBefore = (await fields('body')).filter((x) => x.visible).map((x) => [x.name, x.label, x.checked ?? x.value ?? x.selected]);
                    await snap('i-01-dois-before', {}, {png: true});
                    const en = page.getByRole('checkbox', {name: /Allow Digital Object Identifiers/}).first();
                    if (await en.count() && !(await en.isChecked())) { await en.check(); await sleep(800); }
                    await page.locator('input[name="doiPrefix"]').first().fill(isOMP ? '10.9877' : '10.9878').catch((e) => { o.prefixErr = flat(e.message, 150); });
                    const types = isOMP ? [/^Monographs?$/, /Publication formats?/i] : [/^Preprints?$/];
                    for (const t of types) { const b = page.getByRole('checkbox', {name: t}).first(); if (await b.count()) await b.check().catch(() => {}); }
                    const sel = page.locator('select[name="doiCreationTime"]').first();
                    if (await sel.count()) await sel.selectOption({label: 'Upon publication'}).catch(() => {});
                    o.doiFieldsSet = (await fields('body')).filter((x) => x.visible).map((x) => [x.name, x.label, x.checked ?? x.value ?? x.selected]);
                    o.doiSave = await formSave(page.locator('form').filter({has: page.locator('input[name="doiPrefix"]')}).first());
                    await snap('i-02-dois-saved', {save: o.doiSave}, {png: true});
                    o.doiOn = o.doiSave.status === 200;
                    S.ids = o; save();
                }
                if (isOMP && !o.formatExplored) {
                    await openEntry(G, 'Title & Abstract');
                    await page.getByRole('link', {name: 'Publication Formats', exact: true}).last().click().catch(() => {});
                    await idle(page); await sleep(1500);
                    const row = page.locator('tr').filter({hasText: 'PDF'}).first();
                    o.formatRow = flat(await row.innerText().catch(() => ''), 300);
                    const tog = row.locator('a.show_extras');
                    if (await tog.count()) { await tog.first().click(); await sleep(500); }
                    const id = await row.getAttribute('id').catch(() => null);
                    o.rowActions = id ? await page.locator(`tr#${id} + tr`).locator('a, button').allInnerTexts().catch(() => []) : [];
                    const edit = id ? page.locator(`tr#${id} + tr`).getByRole('link', {name: 'Edit', exact: true}).first() : null;
                    if (edit && (await edit.count())) {
                        await edit.click();
                        await sleep(2000); await idle(page);
                        const d = page.getByRole('dialog').last();
                        o.formatWindow = flat(await d.innerText().catch(() => ''), 1500);
                        o.formatTabs = await d.getByRole('tab').allInnerTexts().catch(() => []);
                        await snap('i-03-format-window', {}, {png: true});
                        // identification code
                        const codes = d.getByRole('tab', {name: /Identification Code/}).first();
                        if (await codes.count()) {
                            await codes.click(); await sleep(1500); await idle(page);
                            const add = d.getByRole('link', {name: /Add Code/}).first();
                            if (await add.count()) {
                                await add.click(); await sleep(1500); await idle(page);
                                const f2 = page.locator('form#addIdentificationCodeForm, form[id*="dentificationCode"]').last();
                                o.codeForm = (await fields(await f2.elementHandle().catch(() => null) || 'body') || []).filter((x) => x.visible).map((x) => [x.name, x.label]);
                                await f2.locator('select[name="code"]').selectOption({label: 'ISBN-13'}).catch((e) => { o.codeSelErr = flat(e.message, 150); });
                                await f2.locator('input[name="value"]').fill('9780306406157').catch((e) => { o.codeValErr = flat(e.message, 150); });
                                await f2.getByRole('button', {name: 'Save', exact: true}).click().catch((e) => { o.codeSaveErr = flat(e.message, 150); });
                                await sleep(1500); await idle(page);
                                o.codeRows = flat(await d.innerText().catch(() => ''), 800);
                            }
                        }
                        const rights = d.getByRole('tab', {name: /Sales Rights/}).first();
                        if (await rights.count()) {
                            await rights.click(); await sleep(1500); await idle(page);
                            const add = d.getByRole('link', {name: /Add Sales Rights/}).first();
                            if (await add.count()) {
                                await add.click(); await sleep(1500); await idle(page);
                                const f3 = page.locator('form[id*="alesRights"]').last();
                                o.rightsForm = (await fields(await f3.elementHandle().catch(() => null) || 'body') || []).filter((x) => x.visible).map((x) => [x.name, x.label, x.selected ?? x.value]);
                                const typeSel = f3.locator('select[name="type"]');
                                if (await typeSel.count()) await typeSel.selectOption({index: 1}).catch(() => {});
                                const row = f3.getByRole('checkbox', {name: /ROW|Rest of the World/}).first();
                                if (await row.count()) await row.check().catch(() => {});
                                await snap('i-04-sales-rights-form', {}, {png: true});
                                await f3.getByRole('button', {name: 'Save', exact: true}).click().catch((e) => { o.rightsSaveErr = flat(e.message, 150); });
                                await sleep(1500); await idle(page);
                                o.rightsRows = flat(await d.innerText().catch(() => ''), 800);
                            }
                        }
                        await snap('i-05-format-window-after', {}, {png: true});
                        await d.getByRole('button', {name: /Close/}).first().click().catch(() => {});
                        await sleep(800);
                    }
                    o.formatExplored = true;
                    S.ids = o; save();
                }
                if (!o.pub) { o.pub = await publishNow(G, 'i-06-publish-G'); S.ids = o; save(); }
                const gid = isOMP ? `oai:${REPO_ID}:publicationFormat/${G.formats[0]}` : `oai:${REPO_ID}:preprint/${G.id}`;
                o.dc = await raw('i-dc-G', oaiUrl(C.path, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(gid)}`));
                o.db = db(app, `select setting_name, setting_value from publication_settings where publication_id=${G.pub} and setting_name like 'pub-id%'`);
                fact('ids', o);
            }
        }

        // ============================================================== fmtmeta: OMP, the format window's "Metadata" tab
        // (identification code, sales rights) on book G, then its record
        if (on('fmtmeta') && isOMP) {
            const o = S.fmt || {};
            const G = S.ids.G;
            await as(U.mg);
            const openFormat = async () => {
                await openEntry(G, 'Title & Abstract');
                await page.getByRole('link', {name: 'Publication Formats', exact: true}).last().click().catch(() => {});
                await idle(page); await sleep(1500);
                const row = page.locator('tr.gridRow').filter({hasText: 'PDF'}).first();
                const tog = row.locator('a.show_extras');
                if (await tog.count()) { await tog.first().click(); await sleep(500); }
                const id = await row.getAttribute('id');
                await page.locator(`tr#${id} + tr`).getByRole('link', {name: 'Edit', exact: true}).first().click();
                await sleep(2000); await idle(page);
                const d = page.getByRole('dialog').last();
                await d.getByRole('tab', {name: 'Metadata', exact: true}).first().click().catch(() => {});
                await sleep(2000); await idle(page);
                return d;
            };
            const d = await openFormat();
            o.metaTab = flat(await d.innerText().catch(() => ''), 2500);
            o.metaFields = (await fields(await d.elementHandle()) || []).filter((x) => x.visible).map((x) => [x.name, x.label, x.checked ?? x.value ?? x.selected]);
            o.metaLinks = await d.locator('a:visible').allInnerTexts().catch(() => []);
            await snap('f-01-format-metadata-tab', {}, {png: true});
            // Product Identification › "Add Code": ISBN-13
            const sub = async (linkName, label, fill) => {
                const r = {};
                await d.getByRole('link', {name: linkName, exact: true}).first().click();
                await sleep(2000); await idle(page);
                const w = page.getByRole('dialog').last();
                r.window = flat(await w.innerText().catch(() => ''), 600);
                r.fields = (await fields(await w.elementHandle()) || []).filter((x) => x.visible).map((x) => [x.name, x.label, x.selected ?? x.value ?? x.checked]).slice(0, 30);
                await fill(w, r);
                await snap(`${label}-typed`, {}, {png: true});
                const resp = page.waitForResponse((x) => x.request().method() === 'POST' && /update|save/i.test(x.url()), {timeout: T}).catch(() => null);
                await w.getByRole('button', {name: /^(OK|Save)$/}).last().click().catch((e) => { r.saveErr = flat(e.message, 150); });
                const rr = await resp;
                r.post = rr ? {status: rr.status(), url: rr.url().replace(app.baseURL, '').slice(0, 140)} : null;
                await sleep(1500); await idle(page);
                r.after = flat(await d.innerText().catch(() => ''), 700);
                return r;
            };
            if (!o.code) {
                o.code = await sub('Add Code', 'f-02-code', async (w) => {
                    await w.locator('select[name="code"]').selectOption({label: 'ISBN-13 (15)'}).catch(async () => { await w.locator('select[name="code"]').selectOption({index: 1}).catch(() => {}); });
                    await w.locator('input[name="value"]').fill('9780306406157').catch(() => {});
                });
                S.fmt = o; save();
            }
            if (!o.rights) {
                o.rights = await sub('Add Sales Rights', 'f-03-rights', async (w, r) => {
                    const t = w.locator('select[name="type"]');
                    if (await t.count()) { await t.selectOption({index: 1}).catch(() => {}); r.type = await t.locator('option:checked').innerText().catch(() => null); }
                    const row = w.getByRole('checkbox').filter({hasText: /Rest of World|ROW/}).first().or(w.locator('input[name="ROWSetting"]')).first();
                    if (await row.count()) await row.check().catch(() => {});
                });
                S.fmt = o; save();
            }
            await snap('f-04-format-metadata-after', {}, {png: true});
            const gid = `oai:${REPO_ID}:publicationFormat/${G.formats[0]}`;
            o.dc = await raw('f-dc-G', oaiUrl(C.path, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(gid)}`));
            fact('fmtmeta', o);
            S.fmt = o; save();
        }

        // ============================================================== more: the remaining ends
        //   OJS / OPS: item H published with a French galley (and, OJS, an unverified ORCID iD): Language, MARC $0
        //   OJS: C given a newer, unpublished version with another title (Rule 11: the current published version)
        //   OMP / OPS: E given a second (major) version, published: Relation's previous version
        //   OPS: the posted preprint W's page, looked over for the typed "Working Paper" (OPS3)
        if (on('more')) {
            const o = S.more || {};
            if (!isOMP && !o.H) {
                const x = await app.api.createSubmission({tag: `${S.t}h`.slice(0, 32), context: C.path, submitter: U.au, title: `K3 Eta ${S.t}`, abstract: 'Eta abstract.', published: true,
                    galleys: [{label: 'PDF', file: PDF}, {label: 'PDF FR', file: PDF, locale: 'fr_CA'}], ...(isOJS ? {author: {orcid: 'https://orcid.org/0000-0002-1694-233X', orcidIsVerified: false}} : {})});
                o.H = {id: x.submissionId, pub: x.publicationId, galleys: x.galleys};
                S.more = o; save();
            }
            if (!isOMP) {
                o.dcH = await get('m-dc-H', o.H);
                o.langH = (o.dcH.dc || []).filter((r) => r.el === 'language').map((r) => r.v);
                if (isOJS) { o.marcH = await get('m-marc-H', o.H, 'oai_marc'); o.marcH100 = (o.marcH.marc || []).filter((r) => /"100"|"720"|"546"/.test(r.attrs)); }
                o.dbH = db(app, `select g.locale from publication_galleys g where g.publication_id=${o.H.pub}`);
            }
            await as(U.mg);
            if (isOJS && !o.draftVer) {
                await openEntry({id: s.C.id, pub: S.ver.majorPub}, 'Title & Abstract');
                const link = page.getByRole('link', {name: 'Create New Version', exact: true}).or(page.getByRole('button', {name: 'Create New Version', exact: true})).first();
                await link.waitFor({state: 'visible', timeout: T});
                await sleep(1500);
                await link.click();
                const w = page.getByRole('dialog').filter({has: page.locator('select[name="versionStage"]')}).last();
                await w.locator('select[name="versionStage"]').waitFor({state: 'visible', timeout: T});
                await idle(page); await sleep(800);
                await w.locator('select[name="versionStage"]').selectOption('VoR').catch(() => {});
                await w.locator('select[name="versionIsMinor"]').selectOption('false').catch(() => {});
                const r = page.waitForResponse((x) => /\/publications\/\d+\/version/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
                await w.getByRole('button', {name: 'Confirm', exact: true}).click();
                const resp = await r;
                try { o.draftPub = (await resp.json()).id; } catch (e) { /* none */ }
                await idle(page); await sleep(1000);
                await openEntry({id: s.C.id, pub: o.draftPub}, 'Title & Abstract');
                o.draftTitle = await setRich('titleAbstract-title-control-en', 'K3 Gamma unpublished draft title');
                o.draftSave = await pressSave();
                await snap('m-01-draft-version-saved', {save: o.draftSave});
                o.draftVer = true;
                S.more = o; save();
            }
            if (isOJS) {
                o.dcC = await get('m-dc-C', s.C);
                o.titleC = (o.dcC.dc || []).filter((r) => r.el === 'title').map((r) => r.v);
                o.marcC = await get('m-marc-C', s.C, 'oai_marc');
                o.c251 = (o.marcC.marc || []).filter((r) => /"251"|"245"/.test(r.attrs)).map((r) => r.subs);
            }
            if (!isOJS && !o.ver2) {
                await openEntry(s.E, 'Title & Abstract');
                const link = page.getByRole('link', {name: 'Create New Version', exact: true}).or(page.getByRole('button', {name: 'Create New Version', exact: true})).first();
                await link.waitFor({state: 'visible', timeout: T});
                await sleep(1500);
                await link.click();
                const w = page.getByRole('dialog').filter({has: page.locator('select[name="versionStage"]')}).last();
                await w.locator('select[name="versionStage"]').waitFor({state: 'visible', timeout: T}).catch(() => {});
                await idle(page); await sleep(800);
                o.ver2Window = (await fields(await w.elementHandle().catch(() => null) || 'body') || []).filter((x) => x.visible).map((x) => [x.name, x.label, x.value ?? x.selected]).slice(0, 12);
                const st = w.locator('select[name="versionStage"]');
                if (await st.count()) await st.selectOption({index: 1}).catch(() => {});
                await w.locator('select[name="versionIsMinor"]').selectOption('false').catch(() => {});
                await snap('m-02-new-version-window', {}, {png: true});
                const r = page.waitForResponse((x) => /\/publications\/\d+\/version/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
                await w.getByRole('button', {name: 'Confirm', exact: true}).click().catch(() => {});
                const resp = await r;
                try { o.ver2Pub = (await resp.json()).id; } catch (e) { o.ver2Err = resp ? resp.status() : 'no response'; }
                await idle(page); await sleep(1000);
                o.ver2 = !!o.ver2Pub;
                S.more = o; save();
                if (o.ver2) { o.ver2Publish = await publishNow({id: s.E.id, pub: o.ver2Pub}, 'm-03-publish-version'); S.more = o; save(); }
            }
            if (!isOJS) {
                o.dcE = await get('m-dc-E', s.E);
                o.relE = (o.dcE.dc || []).filter((r) => /relation|identifier/.test(r.el)).map((r) => `${r.el}: ${r.v}`);
                o.dbE = db(app, `select publication_id, status, version_stage, version_major, version_minor from publications where submission_id=${s.E.id} order by 1`);
            }
            // OMP: a Version of Record 2.0 of F (two formats), published: which formats the press lists, and F's Relation
            if (isOMP && !o.ver3) {
                await openEntry(s.F, 'Title & Abstract');
                const link = page.getByRole('link', {name: 'Create New Version', exact: true}).or(page.getByRole('button', {name: 'Create New Version', exact: true})).first();
                await link.waitFor({state: 'visible', timeout: T});
                await sleep(1500);
                await link.click();
                const w = page.getByRole('dialog').filter({has: page.locator('select[name="versionStage"]')}).last();
                await w.locator('select[name="versionStage"]').waitFor({state: 'visible', timeout: T});
                await idle(page); await sleep(800);
                await w.locator('select[name="versionStage"]').selectOption('VoR').catch(() => {});
                await w.locator('select[name="versionIsMinor"]').selectOption('false').catch(() => {});
                const r = page.waitForResponse((x) => /\/publications\/\d+\/version/.test(x.url()) && x.request().method() === 'POST', {timeout: T}).catch(() => null);
                await w.getByRole('button', {name: 'Confirm', exact: true}).click();
                const resp = await r;
                try { o.ver3Pub = (await resp.json()).id; } catch (e) { /* none */ }
                await idle(page); await sleep(1000);
                o.ver3 = !!o.ver3Pub;
                S.more = o; save();
                if (o.ver3) { o.ver3Publish = await publishNow({id: s.F.id, pub: o.ver3Pub}, 'm-05-publish-F-v2'); S.more = o; save(); }
            }
            if (isOMP) {
                o.idsAfterF = (await raw('m-ids-omp', oaiUrl(C.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc'))).identifiers;
                o.dbF = db(app, `select f.publication_format_id, f.publication_id, p.version_stage, p.version_major, p.status, (select current_publication_id from submissions where submission_id=${s.F.id}) from publication_formats f join publications p on p.publication_id=f.publication_id where p.submission_id=${s.F.id} order by 1`);
                const fmts = o.dbF.split('\n').map((l) => l.split('|')).filter((x) => x[1] === String(o.ver3Pub)).map((x) => x[0]);
                for (const fid of fmts) {
                    const g = await raw(`m-dc-F2-${fid}`, oaiUrl(C.path, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(`oai:${REPO_ID}:publicationFormat/${fid}`)}`));
                    o[`relF2_${fid}`] = {status: g.status, error: g.error, rel: (g.dc || []).filter((r) => /relation/.test(r.el)).map((r) => r.v)};
                }
                const g1 = await raw('m-dc-F1', oaiUrl(C.path, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(`oai:${REPO_ID}:publicationFormat/${s.F.formats[0]}`)}`));
                o.relF1 = {status: g1.status, error: g1.error, rel: (g1.dc || []).filter((r) => /relation/.test(r.el)).map((r) => r.v)};
            }
            if (isOPS) {
                await out_();
                const st = await go(`/index.php/${C.path}/preprint/view/${s.W.id}`);
                const sc = await snap('m-04-preprint-W-page', {status: st}, {png: true});
                o.wPage = {status: st, hasWords: /Working Paper/.test(sc.text.main || ''), section: flat((sc.text.main || '').match(/K3 Working[^\n]*/g), 200)};
                const html = await page.content();
                o.wPageHtml = /Working Paper/.test(html);
            }
            fact('more', o);
        }

        // ============================================================== nomode: Rule 11a (OJS)
        if (on('nomode') && isOJS) {
            const o = {};
            await as(U.mg);
            const setMode = async (label, name) => {
                await tab('distribution', 'Access');
                const radio = page.getByRole('radio', {name: label, exact: true});
                await radio.waitFor({state: 'visible', timeout: T});
                await radio.check();
                const res = await formSave(page.locator('form').filter({has: radio}).first());
                await snap(name, {save: res});
                return res;
            };
            o.saveNone = await setMode("OJS will not be used to publish the journal's contents online.", 'n-01-mode-none-saved');
            o.dcA = await get('n-dc-A', s.A);
            o.marcA = await get('n-marc-A', s.A, 'oai_marc');
            o.marcxmlA = await get('n-marcxml-A', s.A, 'marcxml');
            o.viewA = await view('n-view-dc-A', oaiUrl(C.path, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(idOf(s.A))}`));
            o.saveOpen = await setMode('The journal will provide open access to its contents.', 'n-02-mode-open-saved');
            o.dcA2 = await get('n-dc-A-restored', s.A);
            fact('nomode', o);
        }

        // ============================================================== omp1: a format made "Not Available" on screen (OMP)
        if (on('omp1') && isOMP) {
            const o = {};
            o.idsBefore = await raw('o-ids-before', oaiUrl(C.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc'));
            await as(U.mg);
            await openEntry(s.F, 'Title & Abstract');
            const l = page.getByRole('link', {name: 'Publication Formats', exact: true}).last();
            await l.click().catch(() => {});
            await idle(page); await sleep(1500);
            await snap('o-01-formats', {}, {png: true});
            const row = page.locator('tr').filter({hasText: 'HTML'}).first();
            o.rowBefore = flat(await row.innerText().catch(() => ''), 300);
            const avail = row.getByRole('button', {name: /^Available$/}).or(row.getByRole('link', {name: /^Available$/})).first();
            o.availOffered = await avail.count();
            if (o.availOffered) {
                await avail.click();
                const d = page.getByRole('dialog').last();
                await d.waitFor({state: 'visible', timeout: T}).catch(() => {});
                o.dialog = flat(await d.innerText().catch(() => ''), 400);
                await d.getByRole('button', {name: /^(OK|Yes)$/}).first().click().catch(() => {});
                await idle(page); await sleep(1500);
                o.rowAfter = flat(await row.innerText().catch(() => ''), 300);
                await snap('o-02-formats-not-available');
            }
            o.idsAfter = await raw('o-ids-after', oaiUrl(C.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc'));
            o.getAfter = await raw('o-get-after', oaiUrl(C.path, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(`oai:${REPO_ID}:publicationFormat/${s.F.formats[1]}`)}`));
            // made available again
            const na = row.getByRole('button', {name: /^Not Available$/}).or(row.getByRole('link', {name: /^Not Available$/})).first();
            if (await na.count()) {
                await na.click();
                const d = page.getByRole('dialog').last();
                await d.waitFor({state: 'visible', timeout: T}).catch(() => {});
                await d.getByRole('button', {name: /^(OK|Yes)$/}).first().click().catch(() => {});
                await idle(page); await sleep(1500);
                o.rowRestored = flat(await row.innerText().catch(() => ''), 300);
            }
            o.idsRestored = await raw('o-ids-restored', oaiUrl(C.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc'));
            fact('omp1', o);
        }

        // ============================================================== empty: OMP4 / OPS2, published with the abstract emptied
        if (on('empty') && !isOJS) {
            const o = S.empty || {};
            await as(U.mg);
            if (!o.emptied) {
                await openEntry(s.Z, 'Title & Abstract');
                o.rich = await setRich('titleAbstract-abstract-control-en', '');
                await snap('e-01-abstract-emptied', {}, {png: true});
                o.save = await pressSave();
                await page.reload(); await idle(page); await sleep(1200);
                await openEntry(s.Z, 'Title & Abstract');
                o.reopened = await page.evaluate(() => { const e = window.tinymce && window.tinymce.get('titleAbstract-abstract-control-en'); return e ? e.getContent() : null; }).catch(() => null);
                await snap('e-02-abstract-reopened');
                o.emptied = true; S.empty = o; save();
            }
            if (!o.pub) { o.pub = await publishNow(s.Z, 'e-03-publish-Z'); S.empty = o; save(); }
            o.dbAbstract = db(app, `select locale, coalesce(setting_value,'<null>') from publication_settings where publication_id=${s.Z.pub} and setting_name='abstract'`);
            o.list = await raw('e-list', oaiUrl(C.path, 'verb=ListRecords&metadataPrefix=oai_dc'));
            o.ids = await raw('e-ids', oaiUrl(C.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc'));
            const zid = isOMP ? `oai:${REPO_ID}:publicationFormat/${s.Z.formats[0]}` : `oai:${REPO_ID}:preprint/${s.Z.id}`;
            o.get = await raw('e-get', oaiUrl(C.path, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(zid)}`));
            o.site = await raw('e-site-list', `${app.baseURL}/index.php/index/oai?verb=ListRecords&metadataPrefix=oai_dc`);
            o.siteSet = await raw('e-site-list-set', `${app.baseURL}/index.php/index/oai?verb=ListRecords&metadataPrefix=oai_dc&set=${C.path}`);
            o.view = await view('e-view-list', oaiUrl(C.path, 'verb=ListRecords&metadataPrefix=oai_dc'), {png: true});
            fact('empty', o);
            // restore: unpublish, so the install's lists answer again for the other checkers
            if (!process.env.KEEP_EMPTY) {
                o.unpub = await unpublish(s.Z, 'e-04-unpublished');
                o.listAfter = await raw('e-list-after', oaiUrl(C.path, 'verb=ListRecords&metadataPrefix=oai_dc'));
                o.siteAfter = await raw('e-site-list-after', `${app.baseURL}/index.php/index/oai?verb=ListRecords&metadataPrefix=oai_dc&set=${C.path}`);
                fact('emptyRestore', {unpub: o.unpub, listAfter: o.listAfter.status, siteAfter: o.siteAfter.status});
            }
        }
    } finally {
        await anon.dispose().catch(() => {});
        await close();
    }
});
