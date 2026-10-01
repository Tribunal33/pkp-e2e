// Issue report walk: docs/issues/U19-OMP3-oai-press-unknown-set-lists-other-records.md
// (spec U19 register OMP3). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"):
// its `admin`, its context `publicknowledge` and the books (articles,
// preprints) it already publishes. The one thing the steps create, a second
// press (journal, server) `u19w21`, is created on screen; the kit builds
// nothing. OJS and OPS take the same steps as the app-level control. Step
// numbers are the report's:
//   1  admin: Administration › Hosted Presses › "Create Press" "u19w21 Second
//      Press", path u19w21, English, enabled publicly › "Save"
//   2  signed out: publicknowledge ListIdentifiers set=publicknowledge:psy
//      (OJS :ART, OPS :PRE; control)
//   3  … set=publicknowledge:nosuchseries
//   4  … set=nosuchpress
//   5  … set=u19w21
//   6  u19w21's address: set=publicknowledge, then set=publicknowledge:psy
//   7  site-wide: set=nosuchpress, then set=publicknowledge:nosuchseries
//   8  site-wide: set=u19w21 (control)
//   n  neighbour (what a fix must leave alone): no set at publicknowledge's
//      and the site-wide address, set=publicknowledge, a live but empty
//      series (OMP :his), and ListRecords for step 3
// Each OAI read records the browser view (screen()) and the raw answer's
// error and headers.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w21 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-w21 PROBE_AGENT=w21 node bin/probe.js all shared/playwright/checks/issues/oai-press-unknown-set-lists-other-records/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w21-3_5 PROBE_AGENT=w21 node bin/probe.js all <this file>
// Facts: .reports/<feature>/w21/facts[-<run>]-<app>.json (record 'facts')
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');

const TAG = 'u19w21';
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const LABELS = {
    ojs: {hosted: 'Hosted Journals', table: 'Journals', create: 'Create Journal', name: `${TAG} Second Journal`, series: 'ART', empty: null},
    omp: {hosted: 'Hosted Presses', table: 'Presses', create: 'Create Press', name: `${TAG} Second Press`, series: 'psy', empty: 'his'},
    ops: {hosted: 'Hosted Servers', table: 'Servers', create: 'Create Server', name: `${TAG} Second Server`, series: 'PRE', empty: null},
};

function parseOai(body) {
    const records = [];
    const re = /<header( status="deleted")?>([\s\S]*?)<\/header>/g;
    let m;
    while ((m = re.exec(body))) {
        const inner = m[2];
        records.push({
            identifier: (inner.match(/<identifier>([^<]+)<\/identifier>/) || [])[1] || null,
            deleted: !!m[1],
            setSpecs: [...inner.matchAll(/<setSpec>([^<]+)<\/setSpec>/g)].map((x) => x[1]),
        });
    }
    return {error: (body.match(/<error code="([^"]+)">([^<]*)<\/error>/) || [null]).slice(1).join(': ') || null, records};
}

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const L = LABELS[app.name];
    const line = app.line || 'main';
    const loc = line === 'main' || line === 'stable-3_5_0' ? '/en' : '';
    const pk = app.contextPath;
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1200)}`); };
    fact('fleet', {line, dataset: app.dataset, port: app.port, run: process.env.PROBE_RUN || null});
    let n = 0;
    const rec = async (page, label) => {
        const name = `${String(++n).padStart(2, '0')}-${label}`;
        try { record(name, await screen(page)); } catch (e) { record(name, {error: String(e).slice(0, 300), url: page.url()}); }
    };

    // Step 1: admin creates the second context, enabled publicly.
    {
        const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'admin');
            await page.goto(app.url(`/index.php/index${loc}/admin/contexts`));
            await idle(page);
            const hosted = new HostedJournalsPage(page, L);
            const win = await hosted.openCreate();
            await win.type(win.title('en'), L.name);
            if (await win.initials('en').count()) await win.type(win.initials('en'), 'SP');
            await win.type(win.contactName, 'Second Contact');
            await win.type(win.contactEmail, 'second.contact@mailinator.com');
            await win.country.selectOption({label: 'Canada'});
            await win.type(win.path, TAG);
            await win.setBox(win.languageBox('en'), true);
            if (await win.primaryChoice('en').count()) await win.primaryChoice('en').check();
            const publicBox = page.getByRole('checkbox', {name: /appear publicly on the site/});
            const onCreate = (await publicBox.count()) > 0;
            if (onCreate) await win.setBox(publicBox.first(), true);
            await rec(page, 'create-filled');
            const r = await win.pressSave();
            await page.waitForLoadState('load').catch(() => {});
            await idle(page); await pause(500);
            await rec(page, 'create-saved');
            fact('step 1 create', {status: r.status(), publicBoxOnCreate: onCreate});
            if (!onCreate) {
                const {HostedContextEditWindow} = require('../../../pages/OaiPages.js');
                const edit = new HostedContextEditWindow(page, {hostedLabel: L.hosted});
                await edit.open(TAG);
                await edit.publicBox.check();
                await rec(page, 'edit-public');
                const s = await edit.save();
                fact('step 1 enable publicly', {status: s.status()});
            }
            await signOut(page);
        } finally { await close(); }
    }

    // Signed out: a browser types the OAI address; the raw answer is read beside it.
    const oai = async (label, where, q) => {
        const {page, close} = await launch(app);
        try {
            const rel = `/index.php/${where}/oai?${q}`;
            await page.goto(app.url(rel));
            await pause(200);
            await rec(page, `oai-${label}`);
            const res = await page.request.get(app.url(rel));
            const body = await res.text();
            record(`${String(n).padStart(2, '0')}-oai-${label}-raw`, {address: rel, status: res.status(), body: body.slice(0, 5000)});
            const o = parseOai(body);
            return {address: rel, status: res.status(), error: o.error,
                records: o.records.map((x) => `${x.identifier.replace(/^oai:[^:]+:/, '')}${x.deleted ? ' (deleted)' : ''} [${x.setSpecs.join(', ')}]`)};
        } finally { await close(); }
    };
    const LI = (set) => `verb=ListIdentifiers&metadataPrefix=oai_dc${set ? `&set=${set}` : ''}`;

    fact(`step 2 ${pk} set=${pk}:${L.series}`, await oai('s2', pk, LI(`${pk}:${L.series}`)));
    fact(`step 3 ${pk} set=${pk}:nosuchseries`, await oai('s3', pk, LI(`${pk}:nosuchseries`)));
    fact(`step 4 ${pk} set=nosuchpress`, await oai('s4', pk, LI('nosuchpress')));
    fact(`step 5 ${pk} set=${TAG}`, await oai('s5', pk, LI(TAG)));
    fact(`step 6a ${TAG} set=${pk}`, await oai('s6a', TAG, LI(pk)));
    fact(`step 6b ${TAG} set=${pk}:${L.series}`, await oai('s6b', TAG, LI(`${pk}:${L.series}`)));
    fact('step 7a index set=nosuchpress', await oai('s7a', 'index', LI('nosuchpress')));
    fact(`step 7b index set=${pk}:nosuchseries`, await oai('s7b', 'index', LI(`${pk}:nosuchseries`)));
    fact(`step 8 index set=${TAG}`, await oai('s8', 'index', LI(TAG)));

    // Neighbour: what a fix must leave alone.
    fact(`n1 ${pk} no set`, await oai('n1', pk, LI(null)));
    fact('n2 index no set', await oai('n2', 'index', LI(null)));
    fact(`n3 ${pk} set=${pk}`, await oai('n3', pk, LI(pk)));
    fact(`n4 index set=${pk}`, await oai('n4', 'index', LI(pk)));
    if (L.empty) fact(`n5 ${pk} set=${pk}:${L.empty}`, await oai('n5', pk, LI(`${pk}:${L.empty}`)));
    fact(`n6 ${pk} ListRecords set=${pk}:nosuchseries`, await oai('n6', pk, `verb=ListRecords&metadataPrefix=oai_dc&set=${pk}:nosuchseries`));
    fact(`n7 ${TAG} no set`, await oai('n7', TAG, LI(null)));
    record('facts', facts);
});
