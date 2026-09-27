const {dbName} = require('../../../../../bin/apps.js'); // the slot's and line's own test DB (harness.md "Slots")
// U19 claim check K2 — OJS only: OAI lists while a journal of the install has "DOI Versioning" on.
// Found by k2.js (every ListRecords/ListIdentifiers/GetRecord at a K2 journal answered 500): the axis is
// "a journal with DOIs and DOI Versioning on exists on the install" (yes / no). Drives both ends on screen:
//   1. read with the install as found (harness journals with versioning on);
//   2. Settings › Distribution › "DOIs" › "Setup" › "DOI Versioning" "No, …" › "Save" on every journal that has it
//      on (as admin; the harness hU19 smoke and parity journals), read again;
//   3. on K2's own C2: "DOI Prefix" 10.1234, "DOI Versioning" "Yes, …", "Save"; read C1, C2, the site;
//   4. C2 back to "No"; read again.
//   PROBE_FEATURE=U19 PROBE_AGENT=ccK2 node bin/probe.js ojs shared/playwright/checks/U19/K2/versioning.js
//   (needs k2-state-ojs.json from k2.js's seed phase; STEP=read reads only)
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, note, idle, outDir} = require('../../../probe');

const T = 30_000;
const YES = 'Yes, assign a unique DOI to every version of an article.';
const NO = 'No, all versions of an article should have the same DOI.';
const log = (...a) => console.log('[k2v]', ...a);
const psql = (sql) => execFileSync('psql', [dbName('ojs'), '-At', '-F', '|', '-c', sql], {encoding: 'utf8'}).trim();

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    const S = JSON.parse(fs.readFileSync(path.join(outDir(), 'k2-state-ojs.json'), 'utf8'));
    const out = {};
    const {page, close} = await launch(app);
    const vis = await launch(app);
    const versioning = () => psql("select j.journal_id || ':' || j.path from journal_settings s join journals j on j.journal_id=s.journal_id where s.setting_name='doiVersioning' and s.setting_value='1' and exists (select 1 from journal_settings e where e.journal_id=s.journal_id and e.setting_name='enableDois' and e.setting_value='1') order by 1").split('\n').filter(Boolean);
    const read = async (label) => {
        const r = {versioningJournals: versioning()};
        for (const [k, ctx, qs] of [
            ['c1-li', S.C1.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc'],
            ['c1-lr', S.C1.path, 'verb=ListRecords&metadataPrefix=oai_dc'],
            ['c1-get', S.C1.path, `verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:ojs-test.localhost:article/${S.subs.A.id}`],
            ['c2-li', S.C2.path, 'verb=ListIdentifiers&metadataPrefix=oai_dc'],
            ['pk-li', 'publicknowledge', 'verb=ListIdentifiers&metadataPrefix=oai_dc'],
            ['site-li', 'index', 'verb=ListIdentifiers&metadataPrefix=oai_dc'],
            ['c1-identify', S.C1.path, 'verb=Identify'],
            ['c1-listsets', S.C1.path, 'verb=ListSets'],
        ]) {
            const url = app.url(`/index.php/${ctx}/oai?${qs}`);
            const resp = await vis.page.goto(url).catch(() => null);
            await idle(vis.page).catch(() => {});
            const s = await screen(vis.page).catch((e) => ({err: String(e)}));
            const raw = await vis.page.request.get(url);
            const body = await raw.text();
            r[k] = {status: raw.status(), viewStatus: resp && resp.status(), records: (body.match(/<header/g) || []).length, error: (body.match(/<error code="[^"]*">[^<]*/) || [null])[0], bodyStart: raw.status() >= 500 ? body.slice(0, 200) : undefined};
            record(`v-${label}-${k}`, {url: url.replace(app.baseURL, ''), r: r[k], screen: s});
        }
        log(label, JSON.stringify(r));
        return r;
    };
    const setVersioning = async (ctx, yes, label) => {
        await page.goto(app.url(`/index.php/${ctx}/management/settings/distribution`)); await idle(page);
        await page.getByRole('tab', {name: 'DOIs', exact: true}).click(); await idle(page);
        let panel = page.getByRole('tabpanel', {name: 'DOIs', exact: true});
        await panel.getByRole('tab', {name: 'Setup', exact: true}).click(); await idle(page);
        panel = panel.getByRole('tabpanel', {name: 'Setup', exact: true});
        await panel.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
        const s0 = await screen(page); record(`v-${label}-setup-before`, s0); await shot(page, `v-${label}-setup-before`);
        const res = {before: {yes: await panel.getByRole('radio', {name: YES}).isChecked().catch(() => null), prefix: await panel.getByRole('textbox', {name: 'DOI Prefix'}).inputValue().catch(() => null)}};
        if (yes && !res.before.prefix) await panel.getByRole('textbox', {name: 'DOI Prefix'}).fill('10.1234');
        await panel.getByRole('radio', {name: yes ? YES : NO}).check();
        const w = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+$/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await panel.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await w; res.status = r ? r.status() : null;
        await page.locator('[role="status"]').filter({hasText: 'Saved'}).first().waitFor({timeout: 10_000}).catch(() => {});
        res.saved = await page.locator('[role="status"]').filter({hasText: 'Saved'}).count();
        res.at = new Date().toISOString();
        const s1 = await screen(page); record(`v-${label}-setup-after`, s1);
        return res;
    };
    try {
        out.found = await read('1-found');
        if (process.env.STEP !== 'read') {
            await signIn(page, 'admin');
            out.turnedOff = {};
            for (const j of out.found.versioningJournals) {
                const p = j.split(':')[1];
                if (p === S.C2.path) continue;
                out.turnedOff[p] = await setVersioning(p, false, `2-off-${p}`);
            }
            note(`OJS: every OAI list request (ListRecords, ListIdentifiers, GetRecord; each journal and the site-wide address) answered 500 "UNION types text and bigint cannot be matched" while any journal on the install had DOIs and "DOI Versioning" on; ccK2 set "DOI Versioning" to "No" on the harness journals ${Object.keys(out.turnedOff).join(', ')} at ${new Date().toISOString()} (Settings › Distribution › DOIs › Setup, as admin). A later drive that turns versioning on for Rule 20 breaks every OJS OAI list until it is turned off again.`);
            out.afterOff = await read('3-after-off');
            await signIn(page, S.C2.mg, {contextPath: S.C2.path});
            out.c2On = await setVersioning(S.C2.path, true, '4-c2-on');
            out.withC2 = await read('5-c2-on');
            out.c2Off = await setVersioning(S.C2.path, false, '6-c2-off');
            out.afterC2Off = await read('7-c2-off');
        }
    } finally {
        record('v-facts', out);
        await close(); await vis.close();
    }
});
