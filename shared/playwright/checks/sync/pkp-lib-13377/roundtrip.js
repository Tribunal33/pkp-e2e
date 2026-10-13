// Kept verification probe for pkp/pkp-lib#13377 (issue pkp/pkp-lib#13277): the Native XML export and import now carry
// a publication's plainLanguageSummary, dataAvailability and fundingStatement (three localized nodes after
// <abstract>, in PKPPublicationNativeXmlFilter::addMetadata(), NativeXmlPKPPublicationFilter's localized fields and
// pkp-native.xsd). Run:
//   PROBE_FEATURE=sync PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/sync/pkp-lib-13377/roundtrip.js
// Per app, two scratch contexts A and B (one manager in both, an author in A; the three metadata items at "request"
// in both):
//   seed    in A: "Tern data notes" with the three statements PUT through the publication API (rich HTML: <p>,
//           <strong>, &, a link), "Gull control notes" without them                                  (seed-*)
//   export  manager: A's Native XML Plugin › export tab, both ticked, "Download Exported File" → export.xml;
//           the three elements read out of it; the file validated with DOMDocument::schemaValidate against the
//           app's native.xsd (validate-after) and against pkp-native.xsd at the pointer before the PR
//           (validate-before, the old schema read with `git show fab29cfeca:…`)                  (export, validate-*)
//   import  B's "Import" with export.xml; B's two submissions read through the API: the three fields of each
//           compared with A's                                                                            (import, readback)
//   foreign with ALSO_IMPORT=<an earlier output folder>, that run's export-<app>.xml imported into B too  (foreign-import)
// Outputs: .reports/<PROBE_FEATURE>/<PROBE_AGENT>/. No assertions: the session judges. Before the PR (lib/pkp at
// fab29cfeca) the file holds none of the three elements and B's copy reads them empty; after it, the three travel
// and read the same in B, and the control carries none.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, record, idle, tag, outDir} = require('../../../probe');
const {NativeXmlPage} = require('../../../pages/ImportExportPages');

const log = (...a) => console.log('[13377]', ...a);
const FIELDS = ['plainLanguageSummary', 'dataAvailability', 'fundingStatement'];
const VALUES = {
    plainLanguageSummary: '<p>Terns <strong>nest</strong> on shingle &amp; sand.</p>',
    dataAvailability: '<p>Counts are at <a href="https://example.org/data?x=1&amp;y=2">the archive</a> &amp; on request.</p>',
    fundingStatement: '<p>Funded by the Coastal Trust (grant <em>CT-7</em>).</p>',
};
const TERN = 'Tern data notes';
const GULL = 'Gull control notes';
const NATIVE = {
    ojs: {exportTab: 'Export Articles', exportButton: 'Export Articles', importResults: 'Import Results'},
    omp: {exportTab: 'Export', exportButton: 'Export Submissions', importResults: 'Results'},
    ops: {exportTab: 'Export Preprints', exportButton: 'Export Preprints', importResults: 'Import Results'},
};
const BEFORE = process.env.BEFORE_REF || 'fab29cfeca';

async function sessionApi(page, method, url, data) {
    return page.evaluate(async ({method, url, data}) => {
        const token = window.pkp?.currentUser?.csrfToken || null;
        const res = await fetch(url, {
            method,
            headers: {'Content-Type': 'application/json', 'X-Csrf-Token': token || ''},
            body: data === undefined ? undefined : JSON.stringify(data),
            credentials: 'same-origin',
        });
        const text = await res.text();
        let body = null;
        try { body = JSON.parse(text); } catch (e) { body = text.slice(0, 800); }
        return {status: res.status, body};
    }, {method, url, data});
}

/** DOMDocument::schemaValidate of `file` against `xsd`, run from the app's checkout; returns {valid, errors}. */
function validate(root, file, xsd) {
    const php = `libxml_use_internal_errors(true); $d = new DOMDocument(); $d->load($argv[1]);
        $ok = $d->schemaValidate($argv[2]);
        echo json_encode(['valid' => $ok, 'errors' => array_map(fn ($e) => trim($e->message) . ' (line ' . $e->line . ')', libxml_get_errors())]);`;
    try {
        return JSON.parse(execFileSync('php', ['-r', php, file, xsd], {cwd: root, encoding: 'utf8'}));
    } catch (e) {
        return {valid: null, errors: [String(e.message).slice(0, 300)]};
    }
}

/** The text of each <name locale="…"> element per submission title in a Native XML file (entities decoded). */
function readNodes(xml) {
    const decode = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&');
    const out = {};
    for (const pub of xml.split(/<publication[\s>]/).slice(1)) {
        const title = (pub.match(/<title locale="[^"]*">([^<]*)</) || [])[1] || '?';
        out[title] = {};
        for (const f of FIELDS) {
            out[title][f] = [...pub.matchAll(new RegExp(`<${f} locale="([^"]*)">([^<]*)</${f}>`, 'g'))].map((m) => ({locale: m[1], text: decode(m[2])}));
        }
    }
    return out;
}

forEachApp(async (app) => {
    const s = tag('i13377');
    const a = `${s}a`;
    const b = `${s}b`;
    const mgr = `${s}mg`;
    const au = `${s}au`;
    const metadata = {plainLanguageSummary: 'request', dataAvailability: 'request', fundingStatement: 'request'};
    const ctxA = await app.api.createContext({
        tag: a, context: {path: a, name: `Scratch ${a}`}, metadata,
        users: [{username: mgr, roles: ['manager']}, {username: au, roles: ['author']}],
    });
    const ctxB = await app.api.createContext({tag: b, context: {path: b, name: `Scratch ${b}`}, metadata, users: [{username: mgr, roles: ['manager']}]});
    record('seed-contexts', {a: ctxA, b: ctxB});
    const tern = await app.api.createSubmission({tag: `${a}tn`, context: a, submitter: au, title: TERN, submitted: true});
    const gull = await app.api.createSubmission({tag: `${a}gl`, context: a, submitter: au, title: GULL, submitted: true});
    record('seed-submissions', {tern, gull});
    const apiOf = (ctx) => (p) => app.url(`/index.php/${ctx}/api/v1/${p}`);

    const {page, close} = await launch(app);
    try {
        await signIn(page, mgr, {contextPath: a});
        await page.goto(app.url(`/index.php/${a}/dashboard/editorial`));
        await idle(page);
        const data = Object.fromEntries(FIELDS.map((f) => [f, {en: VALUES[f]}]));
        const put = await sessionApi(page, 'PUT', apiOf(a)(`submissions/${tern.submissionId}/publications/${tern.publicationId}`), data);
        const stored = Object.fromEntries(FIELDS.map((f) => [f, put.body?.[f]]));
        record('seed-put', {status: put.status, stored, error: put.status >= 400 ? put.body : undefined});
        log(app.name, 'PUT', put.status, JSON.stringify(stored).slice(0, 300));

        // export
        const nativeA = new NativeXmlPage(page, a, NATIVE[app.name]);
        await nativeA.goto();
        await nativeA.openExportTab();
        await nativeA.list.box(TERN).check();
        await nativeA.list.box(GULL).check();
        const results = await nativeA.list.pressExport(nativeA);
        const file = await nativeA.download(results);
        const exportPath = path.join(outDir(), `export-${app.name}.xml`);
        fs.writeFileSync(exportPath, file.text);
        const nodes = readNodes(file.text);
        record('export', {name: file.name, bytes: file.text.length, nodes});
        log(app.name, 'export', file.name, JSON.stringify(nodes).slice(0, 400));

        // validate against the app's schema now, and against the pkp-native.xsd before the PR
        const after = validate(app.root, exportPath, path.join(app.root, 'plugins/importexport/native/native.xsd'));
        record('validate-after', after);
        // The app's schema tree (its native.xsd imports ONIX on a press), with pkp-native.xsd from before the PR.
        const oldDir = path.join(outDir(), `before-xsd-${app.name}`);
        const xsdOnly = (src) => fs.statSync(src).isDirectory() || src.endsWith('.xsd');
        fs.cpSync(path.join(app.root, 'plugins/importexport'), path.join(oldDir, 'plugins/importexport'), {recursive: true, filter: xsdOnly});
        fs.cpSync(path.join(app.root, 'lib/pkp/xml'), path.join(oldDir, 'lib/pkp/xml'), {recursive: true, filter: xsdOnly});
        fs.mkdirSync(path.join(oldDir, 'lib/pkp/plugins/importexport/native'), {recursive: true});
        fs.writeFileSync(path.join(oldDir, 'lib/pkp/plugins/importexport/native/pkp-native.xsd'),
            execFileSync('git', ['show', `${BEFORE}:plugins/importexport/native/pkp-native.xsd`], {cwd: path.join(app.root, 'lib/pkp'), encoding: 'utf8'}));
        const before = validate(app.root, exportPath, path.join(oldDir, 'plugins/importexport/native/native.xsd'));
        record('validate-before', before);
        log(app.name, 'valid now', after.valid, after.errors.slice(0, 2).join(' | '), '· valid on the old xsd', before.valid, before.errors.slice(0, 2).join(' | '));

        // import into B
        const nativeB = new NativeXmlPage(page, b, NATIVE[app.name]);
        await nativeB.goto();
        await nativeB.upload(exportPath);
        const imported = await nativeB.pressImport();
        const importText = (await imported.innerText()).replace(/\s+/g, ' ').trim();
        record('import', {text: importText.slice(0, 2000)});
        log(app.name, 'import', importText.slice(0, 300));

        // read back
        await page.goto(app.url(`/index.php/${b}/dashboard/editorial`));
        await idle(page);
        const list = await sessionApi(page, 'GET', apiOf(b)('submissions?count=20'));
        const readback = {};
        for (const item of list.body?.items || []) {
            const pub = await sessionApi(page, 'GET', apiOf(b)(`submissions/${item.id}/publications/${item.currentPublicationId}`));
            const title = pub.body?.title?.en || pub.body?.fullTitle?.en || String(item.id);
            readback[title] = Object.fromEntries(FIELDS.map((f) => [f, pub.body?.[f]]));
            readback[title].matchesSource = title === TERN
                ? FIELDS.every((f) => (pub.body?.[f]?.en || '') === (stored[f]?.en || ''))
                : FIELDS.every((f) => !Object.values(pub.body?.[f] || {}).some(Boolean));
        }
        record('readback', {status: list.status, readback});
        log(app.name, 'readback', JSON.stringify(readback).slice(0, 600));

        // foreign: a file from another run (ALSO_IMPORT=<dir>, its export-<app>.xml), e.g. the after-PR file on the
        // before-PR checkout, imported into B
        if (process.env.ALSO_IMPORT) {
            const foreign = path.resolve(process.env.ALSO_IMPORT, `export-${app.name}.xml`);
            await nativeB.goto();
            await nativeB.upload(foreign);
            const res = await nativeB.pressImport();
            const text = (await res.innerText()).replace(/\s+/g, ' ').trim();
            record('foreign-import', {file: foreign, text: text.slice(0, 2000)});
            log(app.name, 'foreign import', text.slice(0, 400));
        }
    } finally {
        await close();
    }
});
