const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U19 claim check K5, follow-up (OJS): DRIVER ticked again on D on screen; D's set=driver answer (its list size and
// resumption token, followed); the site-wide address and the driver set; the deleted records of DU (unpublished with
// DRIVER on, a member) and DN (in no issue, unpublished with DRIVER on: A11) at both addresses; and a second read of
// the one-run facts of k5.js (21a per level, the article "Open Access" box, the lapsed open access date, the ticked
// "Ignore uploaded JATS XML documents" body).
//   PROBE_FEATURE=U19 PROBE_AGENT=ccK5 node bin/probe.js ojs shared/playwright/checks/U19/K5/followup.js
//   (needs k5-state-ojs.json from k5.js)
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, screen, shot, record, idle, outDir} = require('../../../probe');

const T = 30_000;
const REPO = 'oai:ojs-test.localhost:article/';
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const S = JSON.parse(fs.readFileSync(path.join(outDir(), 'k5-state-ojs.json'), 'utf8'));
    const o = {};
    const {page, close} = await launch(app);
    const vis = await launch(app);
    const cu = (ctx, qs) => app.url(`/index.php/${ctx || 'index'}/oai?${qs}`);
    // raw read, following one language hop, the whole answer's headers, error, list size and token
    const raw = async (rc, url) => {
        const r = await rc.get(url, {failOnStatusCode: false});
        const x = await r.text();
        return {status: r.status(), errors: [...x.matchAll(/<error code="([^"]*)">([^<]*)</g)].map((e) => `${e[1]}: ${e[2]}`),
            headers: [...x.matchAll(/<header( status="deleted")?>([\s\S]*?)<\/header>/g)].map((h) => `${h[1] ? 'DELETED ' : ''}${(h[2].match(/<identifier>([^<]*)/) || [])[1]} [${[...h[2].matchAll(/<setSpec>([^<]*)/g)].map((m) => m[1]).join(',')}]`),
            size: (x.match(/completeListSize="(\d+)"/) || [])[1], cursor: (x.match(/cursor="(\d+)"/) || [])[1], token: (x.match(/<resumptionToken[^>]*>([^<]+)</) || [])[1] || null,
            sets: [...x.matchAll(/<setSpec>([^<]*)<\/setSpec>\s*<setName>([^<]*)</g)].map((m) => `${m[1]}=${m[2]}`), md: x};
    };
    const walk = async (ctx, qs, keep) => {
        const out = {parts: [], own: []};
        let url = cu(ctx, qs);
        for (let i = 0; i < 20 && url; i++) {
            const p = await raw(vis.page.request, url);
            out.parts.push({status: p.status, n: p.headers.length, size: p.size, cursor: p.cursor, token: !!p.token, errors: p.errors});
            out.own.push(...p.headers.filter(keep));
            url = p.token ? cu(ctx, `verb=${qs.match(/verb=(\w+)/)[1]}&resumptionToken=${p.token}`) : null;
        }
        return out;
    };
    const mine = (h) => h.includes(S.t) || Object.values(S).some((c) => c && c.items && Object.values(c.items).some((it) => h.includes(`${REPO}${it.id} `)));
    try {
        const D = S.D;
        // DRIVER ticked again on screen (k5.js a11 left it unticked)
        await signIn(page, D.u.mg, {contextPath: D.path}); await idle(page);
        await page.goto(app.url(`/index.php/${D.path}/management/settings/website`)); await idle(page);
        await page.locator('#plugins-button').first().click(); await idle(page);
        await page.locator('#pluginGridContainer tr.gridRow').first().waitFor({timeout: T}); await sleep(500);
        const box = page.locator('#pluginGridContainer tr.gridRow').filter({hasText: 'DRIVER'}).first().getByRole('checkbox').first();
        if (!(await box.isChecked())) {
            const w = page.waitForResponse((r) => /plugin-grid\/enable/.test(r.url()), {timeout: T}).catch(() => null);
            await box.click(); o.retick = ((await w) || {status: () => null}).status(); await sleep(800);
        }
        record('f-01-driver-ticked', await screen(page)); await shot(page, 'f-01-driver-ticked');
        // D's own driver set: one part, its size, and the token followed
        const d1 = await raw(vis.page.request, cu(D.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc&set=driver'));
        o.dDriver = {status: d1.status, headers: d1.headers, size: d1.size, cursor: d1.cursor, token: !!d1.token};
        if (d1.token) { const d2 = await raw(vis.page.request, cu(D.path, `verb=ListIdentifiers&resumptionToken=${d1.token}`)); o.dDriverNext = {status: d2.status, errors: d2.errors, headers: d2.headers, size: d2.size}; }
        const dAll = await raw(vis.page.request, cu(D.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc'));
        o.dAll = {headers: dAll.headers, size: dAll.size, token: !!dAll.token};
        const view = await vis.page.goto(cu(D.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc&set=driver')); await idle(vis.page).catch(() => {});
        const vs = await screen(vis.page); record('f-02-driver-set-view', {...vs, status: view && view.status()});
        o.dView = flat(vs.text && vs.text.main, 2500);
        o.dViewResume = await vis.page.getByRole('link', {name: 'Resume', exact: true}).count();
        // the deleted records of DU and DN at D's address (GetRecord) and site-wide
        for (const k of ['DU', 'DN']) {
            const g = await raw(vis.page.request, cu(D.path, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(REPO + D.items[k].id)}`));
            const gs = await raw(vis.page.request, cu(null, `verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(REPO + D.items[k].id)}`));
            o[`get${k}`] = {journal: {status: g.status, errors: g.errors, headers: g.headers}, site: {status: gs.status, errors: gs.errors, headers: gs.headers}};
        }
        // the site-wide address: ListSets, set=driver, and the chunk's own deleted records
        const ss = await walk(null, 'verb=ListSets', (h) => false);
        const sets = [];
        { let url = cu(null, 'verb=ListSets'); for (let i = 0; i < 20 && url; i++) { const p = await raw(vis.page.request, url); sets.push(...p.sets.filter((s) => s.startsWith('driver') || s.includes(S.t))); url = p.token ? cu(null, `verb=ListSets&resumptionToken=${p.token}`) : null; } }
        o.siteSets = {parts: ss.parts.length, own: sets};
        o.siteDriver = await walk(null, 'verb=ListIdentifiers&metadataPrefix=oai_dc&set=driver', mine);
        o.siteAllOwnD = (await walk(null, 'verb=ListIdentifiers&metadataPrefix=oai_dc', (h) => h.includes(`${S.t}d:`))).own;
        o.dbTombs = require('child_process').execFileSync('psql', [dbName('ojs'), '-At', '-c', `select t.tombstone_id||':'||t.data_object_id||':'||coalesce(s.setting_name||'='||s.setting_value,'-') from data_object_tombstones t left join data_object_tombstone_settings s using (tombstone_id) where t.data_object_id in (${D.items.DU.id},${D.items.DN.id}) order by 1`], {encoding: 'utf8'}).trim();
        // second read of k5.js's one-run facts
        const Sj = S.S;
        const jr = async (rc, it) => { const p = await raw(rc, cu(Sj.path, `verb=GetRecord&metadataPrefix=jats&identifier=${encodeURIComponent(REPO + Sj.items[it].id)}`)); return {status: p.status, errors: p.errors, n: p.headers.length, emails: [...p.md.matchAll(/<email[^>]*>([^<]*)</g)].map((m) => m[1]).length}; };
        o.again = {anon: {}, driverS: (await raw(vis.page.request, cu(Sj.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc&set=driver'))).headers};
        for (const it of ['SA', 'SO', 'SE']) o.again.anon[it] = await jr(vis.page.request, it);
        for (const lv of ['rd', 'se', 'mg']) {
            await signIn(page, Sj.u[lv], {contextPath: Sj.path}); await idle(page);
            o.again[lv] = await jr(page.request, 'SA');
            const v = await page.goto(cu(Sj.path, `verb=GetRecord&metadataPrefix=jats&identifier=${encodeURIComponent(REPO + Sj.items.SA.id)}`)); await idle(page).catch(() => {});
            const s = await screen(page); record(`f-03-SA-${lv}-view`, {...s, status: v && v.status()});
            o.again[`${lv}View`] = flat(s.text && s.text.main, 300);
        }
        fs.writeFileSync(path.join(outDir(), 'raw-f-SA-mg-ojs.xml'), (await raw(page.request, cu(Sj.path, `verb=GetRecord&metadataPrefix=jats&identifier=${encodeURIComponent(REPO + Sj.items.SA.id)}`))).md);
    } finally {
        record('f-facts', o);
        console.log(JSON.stringify(o, null, 0).slice(0, 8000));
        await close(); await vis.close();
    }
});
