// Neighbour check for docs/issues/U19-A22-oai-fails-when-a-journal-versions-dois.md
// (spec U19 register A22), walked with fix.diff in and out (trial.sh).
// The fix only reorders the query's branches; it must not change which
// records a journal lists. On PKP's default test dataset (OJS `main`):
//   - `admin` turns "DOI Versioning" on for `publicknowledge` itself ("DOI
//     Prefix" 10.1234, "Yes, …", Save), so its records now come from the
//     per-version branch; signed out: ListIdentifiers, the same with
//     `set=publicknowledge:ART` and with `from=2020-01-01`, GetRecord of
//     article/1, Identify
//   - back to "No, …", Save; the same reads again
// Expected with the fix: both passes list the same identifiers and sets
// (articles 1 and 17, plain identifiers) and GetRecord gives the same title.
// Without the fix the first pass answers 500.
// OJS only (no per-version records on OMP or OPS). Records every screen with screen().
// Run: PROBE_FEATURE=issues-w02 PROBE_AGENT=w02 PROBE_RUN=<fix|nofix> node bin/probe.js ojs shared/playwright/checks/issues/oai-fails-when-a-journal-versions-dois/neighbour.js
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    if (app.name !== 'ojs') return;
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only');
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1200)}`); };
    const pk = (q) => `/index.php/${app.contextPath}/oai?${q}`;
    let n = 0;

    const setVersioning = async (yes) => {
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'admin');
            await page.goto(app.url(`/index.php/${app.contextPath}/en/management/settings/distribution`));
            await idle(page);
            await page.getByRole('tab', {name: 'DOIs', exact: true}).click();
            await idle(page);
            const dois = page.getByRole('tabpanel', {name: 'DOIs', exact: true});
            await dois.getByRole('tab', {name: 'Setup', exact: true}).click();
            await idle(page);
            const setup = dois.getByRole('tabpanel', {name: 'Setup', exact: true});
            await setup.getByRole('button', {name: 'Save', exact: true}).first().waitFor({timeout: T});
            if (yes) await setup.getByLabel('DOI Prefix').first().fill('10.1234');
            await setup.getByRole('radio', {name: yes ? /^Yes, assign a unique DOI/ : /^No, all versions/}).check();
            const w = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T}).catch(() => null);
            await setup.getByRole('button', {name: 'Save', exact: true}).first().click();
            const r = await w;
            await idle(page); await pause(300);
            record(`nb-${String(++n).padStart(2, '0')}-doi-setup-${yes ? 'yes' : 'no'}`, await screen(page));
            await signOut(page);
            return r ? r.status() : null;
        } finally { await close(); }
    };

    const reads = async (label) => {
        const {page, close} = await launch(app);
        const out = {};
        try {
            const q = {
                ListIdentifiers: pk('verb=ListIdentifiers&metadataPrefix=oai_dc'),
                ListIdentifiersSet: pk('verb=ListIdentifiers&metadataPrefix=oai_dc&set=publicknowledge:ART'),
                ListIdentifiersFrom: pk('verb=ListIdentifiers&metadataPrefix=oai_dc&from=2020-01-01'),
                GetRecord: pk('verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:ojs2.localhost:article/1'),
                Identify: pk('verb=Identify'),
            };
            for (const [k, rel] of Object.entries(q)) {
                const r = await page.goto(app.url(rel)).catch(() => null);
                const raw = await page.request.get(app.url(rel)).catch(() => null);
                const body = raw ? await raw.text() : '';
                out[k] = {
                    status: r ? r.status() : null,
                    identifiers: (body.match(/<identifier>[^<]+<\/identifier>/g) || []).map((x) => x.replace(/<\/?identifier>/g, '')),
                    sets: [...new Set((body.match(/<setSpec>[^<]+<\/setSpec>/g) || []).map((x) => x.replace(/<\/?setSpec>/g, '')))],
                    title: (body.match(/<dc:title[^>]*>([^<]+)<\/dc:title>/) || [null, null])[1],
                    error: (body.match(/<error code="[^"]+">[^<]*<\/error>/) || [null])[0],
                };
            }
            record(`nb-reads-${label}`, out);
        } finally { await close(); }
        return out;
    };

    fact('publicknowledge Yes saved', await setVersioning(true));
    const on = await reads('versioning-on');
    fact('reads, versioning on', on);
    fact('publicknowledge No saved', await setVersioning(false));
    const off = await reads('versioning-off');
    fact('reads, versioning off', off);
    const same = Object.fromEntries(Object.keys(on).map((k) => [k,
        on[k].status === off[k].status &&
        JSON.stringify(on[k].identifiers) === JSON.stringify(off[k].identifiers) &&
        JSON.stringify(on[k].sets) === JSON.stringify(off[k].sets) &&
        on[k].title === off[k].title]));
    fact('on equals off', same);
    record('nb-facts', facts);
});
