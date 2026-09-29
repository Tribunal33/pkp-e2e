const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U19 claim check, chunk I29 (housekeeping incidentals 2026-09-29): incidentals row 30.
// Spec: docs/specs/U19-oai-pmh.md — Rule 4b (300–305), scenario 4 "Nothing to list" (844–850), Coverage "Register
// carries it" A1 (1157–1163), register A1 (1260–1276), footnotes n, q8, f-a1, d, s.
//
// The claim: on OMP a fresh press with nothing published lists the install's first press's (`publicknowledge`'s)
// deleted format records instead of "noRecordsMatch" (the OMP tombstone query's `when(isset($pressId), fn ($q, $pressId))`
// joins press 1), as Rule 4b states for OJS only.
//
//   RUN=1 PROBE_FEATURE=U19 PROBE_AGENT=ccI29 node bin/probe.js omp shared/playwright/checks/U19/I29/i29.js
//   RUN=2 … (a second, independent run: its own scratch contexts, its own `publicknowledge` item, its own facts file)
//   ojs: the control reads alone (no `publicknowledge` item); ops: the full cycle (the unaffected end).
//   PHASES=seed,before,mark,read,restore,after (default: all). State in i29-state-r<RUN>-<app>.json.
//
// Phases:
//   seed     (API) a scratch context "Empty Shelf <tag>" with nothing, and "Sea Letters <tag>" with one published item;
//            OMP / OPS: one published scratch item in `publicknowledge` (submitter author.alex, as the U73 suite does)
//   before   the control: `publicknowledge` holds no deleted record (DB read); Empty Shelf's lists, Identify, ListSets
//   mark     OMP: manager.maya on `publicknowledge`'s Publication Formats page sets the scratch book's format
//            "Not Available" (a deleted record in press 1); OPS: "Unpost" on the scratch preprint
//   read     Empty Shelf and Sea Letters: ListRecords / ListIdentifiers / GetRecord of every listed identifier /
//            Identify / ListSets / `set` of the context; `publicknowledge`'s own list; the site-wide address with
//            `set=publicknowledge` and `set=<Empty Shelf>`; browser views
//   restore  OMP: "Unpublish" the scratch book (its only format is unavailable, so no deleted record is left);
//            OPS: "Post" the preprint again (its deleted record goes). `publicknowledge` is left with no deleted record.
//   after    the control again
// No assertions: the script records, the reader judges.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {request: pwRequest} = require('@playwright/test');
const {forEachApp, launch, signIn, signOut, screen, shot, record, loc, idle, tag, outDir} = require('../../../probe');

const T = 30_000;
const RUN = process.env.RUN || '1';
const ALL = ['seed', 'before', 'mark', 'read', 'restore', 'after'];
const PHASES = (process.env.PHASES || ALL.join(',')).split(',');
const on = (p) => PHASES.includes(p);
const T0 = Date.now();
const log = (...a) => console.log(`[i29 r${RUN} +${Math.round((Date.now() - T0) / 1000)}s]`, ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const statePath = (app) => path.join(outDir(), `i29-state-r${RUN}-${app.name}.json`);
const db = (app, sql) => { try { return execFileSync('psql', [`${dbName(app.name)}`, '-Atc', sql]).toString().trim(); } catch (e) { return `ERR ${flat(e.message, 200)}`; } };
const errOf = (xml) => (String(xml || '').match(/<error code="([^"]*)">([^<]*)<\/error>/) || []).slice(1);
const PK = 'publicknowledge';

forEachApp(async (app) => {
    const isOJS = app.name === 'ojs';
    const isOMP = app.name === 'omp';
    const isOPS = app.name === 'ops';
    const S = fs.existsSync(statePath(app)) ? JSON.parse(fs.readFileSync(statePath(app), 'utf8')) : {};
    const save = () => fs.writeFileSync(statePath(app), JSON.stringify(S, null, 1));
    const fact = (k, v) => { record(`i29-facts-r${RUN}`, {[k]: v}, {merge: true}); log(`[${app.name} ${k}]`, JSON.stringify(v).slice(0, 3000)); };
    const oaiUrl = (ctx, q) => `${app.baseURL}/index.php/${ctx}/oai${q ? '?' + q : ''}`;
    const siteUrl = (q) => `${app.baseURL}/index.php/index/oai${q ? '?' + q : ''}`;
    const PDF = isOPS ? 'preprint.pdf' : 'article.pdf';
    const pkId = Number(db(app, `select ${isOJS ? 'journal_id from journals' : isOMP ? 'press_id from presses' : 'server_id from servers'} where path='${PK}'`));
    const CTX_ASSOC = isOJS ? 256 : isOMP ? 512 : 256; // ASSOC_TYPE_JOURNAL / _PRESS / _SERVER
    const pkTombs = () => db(app, `select t.tombstone_id||'|'||t.data_object_id||'|'||t.set_spec||'|'||t.oai_identifier||'|'||t.date_deleted from data_object_tombstones t where exists (select 1 from data_object_tombstone_oai_set_objects o where o.tombstone_id=t.tombstone_id and o.assoc_type=${CTX_ASSOC} and o.assoc_id=${pkId}) order by 1`).split('\n').filter(Boolean);
    const allTombs = () => Number(db(app, 'select count(*) from data_object_tombstones'));

    // A raw answer as a harvester sends it (signed out, a fresh client, redirects followed), saved as raw-<name>-<app>.xml.
    const raw = async (name, url) => {
        const rc = await pwRequest.newContext();
        let r;
        try { r = await rc.get(url, {failOnStatusCode: false, timeout: 60_000}); } catch (e) { await rc.dispose(); return {name, err: flat(e.message, 200)}; }
        const body = await r.text();
        await rc.dispose();
        fs.writeFileSync(path.join(outDir(), `raw-r${RUN}-${name}-${app.name}.xml`), body);
        const out = {url: url.replace(app.baseURL, ''), status: r.status(), final: r.url().replace(app.baseURL, ''), error: errOf(body),
            records: (body.match(/<record>/g) || []).length,
            headers: [...body.matchAll(/<header( status="deleted")?>\s*<identifier>([^<]*)<\/identifier>\s*<datestamp>([^<]*)<\/datestamp>([\s\S]*?)<\/header>/g)]
                .map((m) => ({id: m[2], deleted: !!m[1], datestamp: m[3], sets: [...m[4].matchAll(/<setSpec>([^<]*)<\/setSpec>/g)].map((x) => x[1])})),
            responseDate: (body.match(/<responseDate>([^<]*)</) || [])[1] || null,
            earliest: (body.match(/<earliestDatestamp>([^<]*)</) || [])[1] || null,
            repositoryName: (body.match(/<repositoryName>([^<]*)</) || [])[1] || null,
            sets: [...body.matchAll(/<set>\s*<setSpec>([^<]*)<\/setSpec>\s*<setName>([^<]*)<\/setName>/g)].map((m) => `${m[1]} = ${m[2]}`),
            hasMetadata: /<metadata>/.test(body)};
        if (r.status() >= 500) out.body = flat(body, 400);
        return out;
    };

    // ------------------------------------------------------------------ seed
    if (on('seed') && !S.E) {
        const t = tag('u19i29');
        S.t = t;
        const mg = {username: `${t}mg`, roles: ['manager'], givenName: 'Mia', familyName: 'Manager'};
        const au = {username: `${t}au`, roles: ['author'], givenName: 'Ada', familyName: 'Author'};
        const e = await app.api.createContext({tag: `${t}e`, context: {name: `Empty Shelf ${t}`}, users: [{...mg, username: `${t}emg`}]});
        S.E = {path: e.path || `${t}e`, id: e.contextId};
        const s = await app.api.createContext({tag: `${t}s`, context: {name: `Sea Letters ${t}`}, users: [{...mg, username: `${t}smg`}, {...au, username: `${t}sau`}]});
        S.S = {path: s.path || `${t}s`, id: s.contextId};
        const item = (extra) => (isOMP
            ? {files: [{file: PDF}], decisions: ['skipExternalReview', 'sendToProduction'], publicationFormats: [{name: 'PDF', file: PDF}], published: true, ...extra}
            : isOPS ? {galleys: [{label: 'PDF', file: PDF}], published: true, ...extra}
                : {galleys: [{label: 'PDF', file: PDF}], published: true, ...extra});
        const tidal = await app.api.createSubmission({tag: `${t}st`, context: S.S.path, submitter: `${t}sau`, title: `Tidal Patterns ${t}`, abstract: 'Tides follow the moon.', ...item({})});
        S.tidal = {id: tidal.submissionId, pub: tidal.publicationId, formats: (tidal.publicationFormats || []).map((f) => f.id)};
        if (!isOJS) {
            // the one `publicknowledge` item: a scratch-titled book / preprint, the U73 suite's way (author.alex)
            const p = await app.api.createSubmission({tag: `${t}pk`, context: PK, submitter: 'author.alex', title: `U19 I29 PK item ${t}`, abstract: 'A scratch item for the I29 claim check.', ...item({})});
            S.P = {id: p.submissionId, pub: p.publicationId, formats: (p.publicationFormats || []).map((f) => f.id)};
        }
        save();
        fact('seed', {t, E: S.E, S: S.S, tidal: S.tidal, P: S.P || null, pkId});
    }
    if (!S.E) { log('no seed'); return; }

    const listsAt = async (label, ctx) => {
        const o = {};
        o.listRecords = await raw(`${label}-listrecords`, oaiUrl(ctx, 'verb=ListRecords&metadataPrefix=oai_dc'));
        o.listIdentifiers = await raw(`${label}-listidentifiers`, oaiUrl(ctx, 'verb=ListIdentifiers&metadataPrefix=oai_dc'));
        o.identify = await raw(`${label}-identify`, oaiUrl(ctx, 'verb=Identify'));
        o.identify.earliestMinusResponse_s = o.identify.earliest && o.identify.responseDate ? (Date.parse(o.identify.earliest) - Date.parse(o.identify.responseDate)) / 1000 : null;
        o.listSets = await raw(`${label}-listsets`, oaiUrl(ctx, 'verb=ListSets'));
        o.setSelf = await raw(`${label}-set-self`, oaiUrl(ctx, `verb=ListRecords&metadataPrefix=oai_dc&set=${ctx}`));
        return o;
    };

    // ------------------------------------------------------------------ before (control: publicknowledge holds none)
    if (on('before')) {
        const o = {pkTombs: pkTombs(), allTombs: allTombs()};
        o.E = await listsAt('before-E', S.E.path);
        fact('before', o);
    }

    const {page, close} = await launch(app);
    page.on('dialog', (d) => { log('[browser dialog]', d.type(), flat(d.message(), 160)); d.accept().catch(() => {}); });
    const snap = async (name, extra = {}, {png = false} = {}) => {
        const sc = await screen(page);
        record(`r${RUN}-${name}`, {...sc, ...extra});
        if (png) await shot(page, `r${RUN}-${name}`);
        return sc;
    };
    const view = async (name, url, {png = false} = {}) => {
        const r = await page.goto(url, {waitUntil: 'load'}).catch((e) => ({err: flat(e.message, 200)}));
        await idle(page).catch(() => {});
        const sc = await snap(name, {status: r && r.status ? r.status() : r}, {png});
        return {status: r && r.status ? r.status() : r, url: page.url().replace(app.baseURL, ''), text: flat(sc.text.main, 3000)};
    };
    const wfUrl = (sid, pub) => app.url(`/index.php/${PK}/dashboard/editorial?workflowSubmissionId=${sid}&workflowMenuKey=publication_${pub}_titleAbstract`);
    const openPub = async (name) => {
        await page.goto(wfUrl(S.P.id, S.P.pub)); await idle(page); await sleep(800);
        if (name) {
            const l = page.getByRole('link', {name, exact: true}).last();
            await l.waitFor({state: 'visible', timeout: T});
            await l.click();
            await idle(page); await sleep(1500);
        }
    };

    try {
        if (on('before')) fact('beforeView', await view('before-E-view-listrecords', oaiUrl(S.E.path, 'verb=ListRecords&metadataPrefix=oai_dc'), {png: true}));
        // ------------------------------------------------------------------ mark: a deleted record in publicknowledge
        if (on('mark') && !isOJS && !S.marked) {
            const o = {pkTombsBefore: pkTombs()};
            await signIn(page, 'manager.maya', {contextPath: PK});
            await idle(page).catch(() => {});
            if (isOMP) {
                await openPub('Publication Formats');
                await snap('m-01-formats', {}, {png: true});
                const row = page.locator('tr').filter({hasText: 'PDF'}).first();
                o.rowBefore = flat(await row.innerText().catch(() => ''), 300);
                const avail = row.getByRole('button', {name: /^Available$/}).or(row.getByRole('link', {name: /^Available$/})).first();
                await loc(page, 'OMP Publication Formats: the row\'s "Available" availability control', avail);
                o.availOffered = await avail.count();
                if (o.availOffered) {
                    await avail.click();
                    const d = page.getByRole('dialog').last();
                    await d.waitFor({state: 'visible', timeout: T}).catch(() => {});
                    o.dialog = flat(await d.innerText().catch(() => ''), 400);
                    await snap('m-02-availability-dialog');
                    await d.getByRole('button', {name: /^(OK|Yes)$/}).first().click().catch(() => {});
                    await idle(page); await sleep(1500);
                    o.rowAfter = flat(await row.innerText().catch(() => ''), 300);
                    await snap('m-03-formats-not-available', {}, {png: true});
                    await page.reload(); await idle(page); await sleep(800);
                    await openPub('Publication Formats');
                    o.rowAfterReload = flat(await page.locator('tr').filter({hasText: 'PDF'}).first().innerText().catch(() => ''), 300);
                    await snap('m-04-formats-reloaded');
                }
            } else {
                await openPub(null);
                const b = page.getByRole('button', {name: 'Unpost', exact: true}).first();
                await b.waitFor({state: 'visible', timeout: T});
                await snap('m-01-preprint', {}, {png: true});
                await b.click();
                const d = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Unpost', exact: true})}).last();
                await d.waitFor({state: 'visible', timeout: T});
                o.dialog = flat(await d.innerText().catch(() => ''), 400);
                await snap('m-02-unpost-dialog');
                const w = page.waitForResponse((r) => /\/unpublish/.test(r.url()), {timeout: T}).catch(() => null);
                await d.getByRole('button', {name: 'Unpost', exact: true}).last().click();
                const r = await w;
                o.unpostStatus = r ? r.status() : null;
                await idle(page); await sleep(1000);
                await snap('m-03-unposted');
            }
            o.pkTombsAfter = pkTombs();
            S.marked = o.pkTombsAfter.length > 0;
            save();
            fact('mark', o);
            await signOut(page).catch(() => {});
        }

        // ------------------------------------------------------------------ read (publicknowledge holds a deleted record)
        if (on('read') && !isOJS) {
            const o = {pkTombs: pkTombs()};
            o.E = await listsAt('read-E', S.E.path);
            o.S = await listsAt('read-S', S.S.path);
            // GetRecord at Empty Shelf of every identifier it listed, and of the pk item's own identifiers
            const ids = new Set(o.E.listIdentifiers.headers.map((h) => h.id));
            const pkIds = o.pkTombs.map((x) => x.split('|')[3]);
            pkIds.forEach((i) => ids.add(i));
            o.E.get = {};
            for (const id of ids) o.E.get[id] = await raw(`read-E-get-${id.split('/').pop()}`, oaiUrl(S.E.path, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(id)}`));
            o.pk = await raw('read-pk-listidentifiers', oaiUrl(PK, 'verb=ListIdentifiers&metadataPrefix=oai_dc'));
            o.pk.headers = o.pk.headers.filter((h) => h.deleted || pkIds.includes(h.id));
            o.siteSetPk = await raw('read-site-set-pk', siteUrl(`verb=ListIdentifiers&metadataPrefix=oai_dc&set=${PK}`));
            o.siteSetPk.headers = o.siteSetPk.headers.filter((h) => h.deleted);
            o.siteSetE = await raw('read-site-set-E', siteUrl(`verb=ListIdentifiers&metadataPrefix=oai_dc&set=${S.E.path}`));
            o.siteAllDeleted = (await raw('read-site-all', siteUrl('verb=ListIdentifiers&metadataPrefix=oai_dc'))).headers.filter((h) => h.deleted && pkIds.includes(h.id));
            // the browser views (signed out)
            o.viewList = await view('read-E-view-listrecords', oaiUrl(S.E.path, 'verb=ListRecords&metadataPrefix=oai_dc'), {png: true});
            if (pkIds[0]) o.viewGet = await view('read-E-view-getrecord', oaiUrl(S.E.path, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(pkIds[0])}`));
            o.viewIdentify = await view('read-E-view-identify', oaiUrl(S.E.path, 'verb=Identify'));
            // the "Records" link of the listed record's setSpec row, pressed
            const recLink = page.getByRole('link', {name: 'Records', exact: true});
            o.viewGetRecordsLinks = await recLink.count().catch(() => null);
            fact('read', o);
        }

        // ------------------------------------------------------------------ restore: publicknowledge left with no deleted record
        if (on('restore') && !isOJS && S.marked && !S.restored) {
            const o = {pkTombsBefore: pkTombs()};
            await signIn(page, 'manager.maya', {contextPath: PK});
            await idle(page).catch(() => {});
            await openPub(null);
            if (isOMP) {
                const b = page.getByRole('button', {name: 'Unpublish', exact: true}).first();
                await b.waitFor({state: 'visible', timeout: T});
                await b.click();
                const d = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Unpublish', exact: true})}).last();
                await d.waitFor({state: 'visible', timeout: T});
                o.dialog = flat(await d.innerText().catch(() => ''), 400);
                const w = page.waitForResponse((r) => /\/unpublish/.test(r.url()), {timeout: T}).catch(() => null);
                await d.getByRole('button', {name: 'Unpublish', exact: true}).last().click();
                const r = await w;
                o.status = r ? r.status() : null;
                await idle(page); await sleep(1000);
                await snap('x-01-unpublished');
            } else {
                const post = page.getByRole('button', {name: 'Post', exact: true});
                await post.first().waitFor({state: 'visible', timeout: T});
                await sleep(800);
                await post.first().click();
                const last = page.getByRole('dialog').filter({hasText: /Are you sure you want to post this|problems|cannot/i}).last();
                await last.waitFor({state: 'visible', timeout: T});
                await idle(page); await sleep(500);
                for (const [sel, val] of [['select[name="versionStage"]', 'VoR'], ['select[name="versionIsMinor"]', 'false']]) {
                    const el = last.locator(sel);
                    if (await el.isVisible().catch(() => false)) { if (!(await el.inputValue().catch(() => ''))) await el.selectOption(val).catch(() => {}); }
                }
                o.dialog = flat(await last.innerText().catch(() => ''), 600);
                await snap('x-01-post-dialog');
                const w = page.waitForResponse((r) => /\/publish/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
                await last.getByRole('button', {name: 'Post', exact: true}).last().click();
                const r = await w;
                o.status = r ? r.status() : null;
                await idle(page); await sleep(1000);
                await snap('x-02-posted');
            }
            o.pkTombsAfter = pkTombs();
            o.pkStatus = db(app, `select status from submissions where submission_id=${S.P.id}`);
            S.restored = o.pkTombsAfter.length === 0;
            save();
            fact('restore', o);
            await signOut(page).catch(() => {});
        }

        // ------------------------------------------------------------------ after (control again)
        if (on('after') && !isOJS) {
            const o = {pkTombs: pkTombs(), allTombs: allTombs()};
            o.E = await listsAt('after-E', S.E.path);
            fact('after', o);
        }
    } finally {
        await close();
    }
});
