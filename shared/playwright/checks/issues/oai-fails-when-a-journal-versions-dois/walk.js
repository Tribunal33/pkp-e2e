// Issue report walk: docs/issues/U19-A22-oai-fails-when-a-journal-versions-dois.md
// (spec U19 register A22). Takes the report's Steps through the screens on
// PKP's default test dataset (a dataset fleet, harness.md "Dataset fleets"):
// its context `publicknowledge` and its `admin`. The steps create a second
// context on screen (Administration › Hosted …› "Create …", path `versions`);
// the kit builds nothing.
//   1–2  signed out: publicknowledge's OAI Identify and ListRecords (before)
//   3    admin: "Create Journal" ("Create Press", "Create Server"), path `versions`
//   4    admin: `versions` Settings › Distribution › DOIs › Setup: "DOI Prefix"
//        10.1234, "DOI Versioning" at "Yes, …", Save
//   5    signed out: Identify, ListRecords, ListIdentifiers, GetRecord,
//        ListMetadataFormats (with the identifier) at publicknowledge, the
//        site-wide Identify; ListSets as the control
//   6    admin: "DOI Versioning" back at "No, …", Save
//   7    signed out: the addresses of step 5 again
// Each OAI read records status, body length, the first bytes and the server
// log lines the request wrote. All three apps: OMP and OPS have the same
// "DOI Versioning" control, so they are the app-level control.
// On stable-3_5_0 (no "DOI Versioning" control) steps 3–4 cannot be taken:
// the walk reads publicknowledge's DOIs Setup tab and steps 1–2 only. OPS 3.5
// has the control, so there the walk takes every step.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w02 --dataset 2 --reset
// Run (main):   PROBE_FEATURE=issues-w02 PROBE_AGENT=w02 node bin/probe.js all shared/playwright/checks/issues/oai-fails-when-a-journal-versions-dois/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-w02-3_5 PROBE_AGENT=w02 node bin/probe.js all shared/playwright/checks/issues/oai-fails-when-a-journal-versions-dois/walk.js
// Facts: .reports/<feature>/w02/facts[-<run>]-<app>.json
const fs = require('fs');
const path = require('path');
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const LABELS = {
    ojs: {hosted: 'Hosted Journals', table: 'Journals', create: 'Create Journal', name: 'Versions Journal'},
    omp: {hosted: 'Hosted Presses', table: 'Presses', create: 'Create Press', name: 'Versions Press'},
    ops: {hosted: 'Hosted Servers', table: 'Servers', create: 'Create Server', name: 'Versions Server'},
};

function serverLog(app) {
    const f = path.join(__dirname, '../../../../../apps', app.name, 'playwright/.server-logs', `server-${app.port}-ds${app.dataset}.log`);
    return {
        size: () => (fs.existsSync(f) ? fs.statSync(f).size : 0),
        since(off) {
            if (!fs.existsSync(f)) return [];
            const buf = fs.readFileSync(f).subarray(off).toString('utf8');
            return buf.split('\n').filter((l) => /PHP|SQLSTATE|Exception|\] \[?500\]?|: 500/.test(l)).map((l) => l.slice(0, 400)).slice(0, 6);
        },
    };
}

forEachApp(async (app) => {
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1200)}`); };
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const onMain = !app.line || app.line === 'main';
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, port: app.port, run: process.env.PROBE_RUN || null});
    const L = LABELS[app.name];
    const log = serverLog(app);
    const pk = (q) => `/index.php/${app.contextPath}/oai?${q}`;
    let n = 0;

    // A signed-out browser types an OAI address and reads the answer.
    const oaiRead = async (page, label, rel) => {
        const off = log.size();
        const r = await page.goto(app.url(rel)).catch((e) => ({error: String(e).slice(0, 200)}));
        await pause(200);
        const out = {address: rel};
        if (r && r.error) { out.error = r.error; return out; }
        out.status = r ? r.status() : null;
        // The browser renders the XML through the answer's stylesheet; the raw
        // answer, as a harvester reads it, comes from the same signed-out context.
        const raw = await page.request.get(app.url(rel)).catch(() => null);
        const body = raw ? await raw.text().catch(() => '') : '';
        out.rawStatus = raw ? raw.status() : null;
        out.bodyLength = body.length;
        out.head = flat(body).slice(0, 160);
        out.error = (body.match(/<error code="[^"]+">[^<]*<\/error>/) || [null])[0];
        out.identifiers = (body.match(/<identifier>[^<]+<\/identifier>/g) || []).length;
        out.log = log.since(off);
        record(`${String(++n).padStart(2, '0')}-oai-${label}`, out);
        return out;
    };
    const oaiSet = async (page, stepLabel, identifier) => {
        const res = {};
        res.Identify = await oaiRead(page, `${stepLabel}-identify`, pk('verb=Identify'));
        res.ListRecords = await oaiRead(page, `${stepLabel}-listrecords`, pk('verb=ListRecords&metadataPrefix=oai_dc'));
        res.ListIdentifiers = await oaiRead(page, `${stepLabel}-listidentifiers`, pk('verb=ListIdentifiers&metadataPrefix=oai_dc'));
        if (identifier) {
            res.GetRecord = await oaiRead(page, `${stepLabel}-getrecord`, pk(`verb=GetRecord&metadataPrefix=oai_dc&identifier=${encodeURIComponent(identifier)}`));
            res.ListMetadataFormats = await oaiRead(page, `${stepLabel}-listmetadataformats`, pk(`verb=ListMetadataFormats&identifier=${encodeURIComponent(identifier)}`));
        }
        res.siteIdentify = await oaiRead(page, `${stepLabel}-site-identify`, '/index.php/index/oai?verb=Identify');
        res.ListSets = await oaiRead(page, `${stepLabel}-listsets`, pk('verb=ListSets'));
        return res;
    };
    const brief = (res) => Object.fromEntries(Object.entries(res).map(([k, v]) => [k, `${v.status} ${v.bodyLength}b${v.error ? ` ${v.error}` : ''}${v.identifiers ? ` ids=${v.identifiers}` : ''}${v.log && v.log.length ? ` log: ${v.log[0].slice(0, 220)}` : ''}`]));

    // Settings › Distribution › DOIs › Setup of a context, as admin.
    const openDoiSetup = async (page, ctxPath) => {
        const loc = onMain || app.line === 'stable-3_5_0' ? '/en' : '';
        await page.goto(app.url(`/index.php/${ctxPath}${loc}/management/settings/distribution`));
        await idle(page);
        await page.getByRole('tab', {name: 'DOIs', exact: true}).click();
        await idle(page);
        const dois = page.getByRole('tabpanel', {name: 'DOIs', exact: true});
        const setupTab = dois.getByRole('tab', {name: 'Setup', exact: true});
        if (await setupTab.count()) { await setupTab.click(); await idle(page); }
        const setup = (await setupTab.count()) ? dois.getByRole('tabpanel', {name: 'Setup', exact: true}) : dois;
        await setup.getByRole('button', {name: 'Save', exact: true}).first().waitFor({timeout: T});
        return setup;
    };
    const saveDoiSetup = async (page, setup) => {
        const w = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
        await setup.getByRole('button', {name: 'Save', exact: true}).first().click();
        const r = await w;
        await idle(page); await pause(300);
        const s = await screen(page);
        record(`${String(++n).padStart(2, '0')}-doi-setup-saved`, s);
        return {status: r ? r.status() : null, notices: s.notices || null, errors: flat(await setup.locator('.pkpFieldError').allInnerTexts().then((a) => a.join(' | ')).catch(() => ''))};
    };

    // Steps 1–2: signed out, before.
    let ident = null;
    {
        const {page, close} = await launch(app);
        try {
            const i = await oaiRead(page, 's1-identify', pk('verb=Identify'));
            const lr = await oaiRead(page, 's2-listrecords', pk('verb=ListRecords&metadataPrefix=oai_dc'));
            const raw = await page.request.get(app.url(pk('verb=ListIdentifiers&metadataPrefix=oai_dc')));
            const m = (await raw.text()).match(/<identifier>(oai:[^<]+)<\/identifier>/);
            ident = m ? m[1] : null;
            fact('steps 1-2 before', {Identify: `${i.status} ${i.bodyLength}b ${i.head.slice(0, 80)}`, ListRecords: `${lr.status} ids=${lr.identifiers}`, firstIdentifier: ident});
        } finally { await close(); }
    }
    if (!onMain) {
        // 3.5: steps 3–4 need the "DOI Versioning" control; read whether the DOIs Setup tab has it.
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'admin');
            const setup = await openDoiSetup(page, app.contextPath);
            record(`${String(++n).padStart(2, '0')}-doi-setup-publicknowledge`, await screen(page));
            const yesRadio = await setup.getByRole('radio', {name: /^Yes, assign a unique DOI/}).count();
            fact('3.5 DOIs Setup', {
                doiVersioningLabel: await setup.getByText('DOI Versioning', {exact: true}).count(),
                yesRadio,
                labels: (await setup.locator('legend, label').allInnerTexts()).map(flat).filter(Boolean).slice(0, 30),
            });
            await signOut(page);
            // No control: steps 3–7 cannot be taken on this app and line.
            if (!yesRadio) { record('facts', facts); return; }
        } finally { await close(); }
    }

    // Steps 3–4: admin creates the second context and turns "DOI Versioning" on there.
    {
        const {HostedJournalsPage} = require('../../../pages/HostedJournalsPages.js');
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'admin');
            await page.goto(app.url('/index.php/index/en/admin/contexts'));
            await idle(page);
            const hosted = new HostedJournalsPage(page, L);
            const win = await hosted.openCreate();
            await win.type(win.title('en'), L.name);
            await win.type(win.initials('en'), 'VJ');
            await win.type(win.contactName, 'Versions Contact');
            await win.type(win.contactEmail, 'versions.contact@mailinator.com');
            await win.country.selectOption({label: 'Canada'});
            await win.type(win.path, 'versions');
            await win.setBox(win.languageBox('en'), true);
            if (await win.primaryChoice('en').count()) await win.primaryChoice('en').check();
            record(`${String(++n).padStart(2, '0')}-create-filled`, await screen(page));
            const r = await win.pressSave();
            await page.waitForLoadState('load').catch(() => {});
            await idle(page); await pause(500);
            record(`${String(++n).padStart(2, '0')}-create-saved`, await screen(page));
            fact('step 3 create', {status: r.status(), url: page.url().replace(/^https?:\/\/[^/]+/, ''), errors: await win.errorMap().catch(() => null)});

            const setup = await openDoiSetup(page, 'versions');
            record(`${String(++n).padStart(2, '0')}-doi-setup-versions`, await screen(page));
            const yes = setup.getByRole('radio', {name: /^Yes, assign a unique DOI to every version/});
            fact('step 4 form', {
                enableDois: await setup.getByRole('checkbox').first().isChecked().catch(() => null),
                yesRadio: await yes.count(),
                noChecked: await setup.getByRole('radio', {name: /^No, all versions/}).isChecked().catch(() => null),
            });
            await setup.getByLabel('DOI Prefix').first().fill('10.1234');
            await yes.check();
            fact('step 4 save', await saveDoiSetup(page, setup));
            await signOut(page);
        } finally { await close(); }
    }

    // Step 5: signed out, after.
    {
        const {page, close} = await launch(app);
        try { fact('step 5 after Yes', brief(await oaiSet(page, 's5', ident))); } finally { await close(); }
    }

    // Step 6: back to "No".
    {
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'admin');
            const setup = await openDoiSetup(page, 'versions');
            await setup.getByRole('radio', {name: /^No, all versions/}).check();
            fact('step 6 save No', await saveDoiSetup(page, setup));
            await signOut(page);
        } finally { await close(); }
    }

    // Step 7: signed out, again.
    {
        const {page, close} = await launch(app);
        try { fact('step 7 after No', brief(await oaiSet(page, 's7', ident))); } finally { record('facts', facts); await close(); }
    }
});
