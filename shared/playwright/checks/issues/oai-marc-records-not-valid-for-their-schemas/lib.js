// Helpers of the walks on a journal's MARC records (issue reports
// docs/issues/U19-A12-oai-marc-records-not-valid-for-their-schemas.md and
// docs/issues/U19-A15-oai-marc-008-date-percent-signs.md). Requiring this file runs nothing.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {screen, shot, outDir} = require('../../../probe');
const {readOai, parseMarc} = require('../../../pages/OaiPages.js');

const flat = (s, n = 600) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

/** The two formats: the address of the schema each record names, and its root element. */
const FORMATS = {
    marcxml: {schema: 'https://www.loc.gov/standards/marcxml/schema/MARC21slim.xsd', file: 'MARC21slim.xsd', root: 'record'},
    oai_marc: {schema: 'http://www.openarchives.org/OAI/1.1/oai_marc.xsd', file: 'oai_marc.xsd', root: 'oai_marc'},
};

/** The schema file of a format, fetched once into the run folder from the address the record names. */
async function schemaFile(prefix) {
    const f = FORMATS[prefix];
    const file = path.join(outDir(), f.file);
    if (!fs.existsSync(file)) {
        const r = await fetch(f.schema, {redirect: 'follow'});
        if (!r.ok) throw new Error(`${f.schema} answered ${r.status}`);
        fs.writeFileSync(file, await r.text());
    }
    return file;
}

/**
 * One record in one format: the GetRecord address opened in the browser (what the page shows)
 * and read as a harvester reads it (the element inside <metadata>, as sent).
 */
async function getRecord(page, app, ctx, prefix, identifier, name) {
    const params = `verb=GetRecord&metadataPrefix=${prefix}&identifier=${identifier}`;
    const address = `/index.php/${ctx}/oai?${params}`;
    const r = await page.goto(app.url(address), {waitUntil: 'load'});
    const s = await screen(page).catch(() => null);
    await shot(page, name).catch(() => {});
    const a = await readOai(app.baseURL, ctx, params);
    const xml = a.records && a.records[0] ? a.records[0].metadata : null;
    return {
        address,
        pageStatus: r ? r.status() : null,
        shown: s ? s.text.main || '' : null,
        status: a.status,
        error: a.error ? `${a.error.code}: ${a.error.message}` : null,
        xml,
        fields: xml ? parseMarc(xml) : [],
    };
}

/**
 * `xmllint --noout --schema <schema> <record>` as libxml2 answers it, plus the record's fields
 * as a MARC reader takes them (by element name, field number and subfield code).
 */
function check(xml, prefix, schema) {
    const out = execFileSync('php', [path.join(__dirname, 'validate.php'), schema, prefix], {input: xml, encoding: 'utf8'});
    return JSON.parse(out);
}

/** The values of one field number in a list from check() ([[tag, [[code, value]]]]) as "c=value" strings. */
const strict = (fields, tag) => fields.filter((f) => f[0] === tag).map((f) => f[1].map((s) => `${s[0]}=${s[1]}`).join(' | '));

/** The same from parseMarc(), which reads either spelling of the markup. */
const loose = (fields, tag) => fields.filter((f) => f.tag === tag).map((f) => f.subfields.map((s) => `${s.code}=${flat(s.value)}`).join(' | '));

/**
 * The install with another `[general] time_zone`, which no screen offers: the site
 * administrator writes it in config.inc.php. The fleet's own config is not edited; this starts a
 * second `php -S` for the same checkout and database (base port + 73) with a copy of the
 * fleet's config that differs in that value (and in the port of base_url and allowed_hosts).
 * Returns the app bag pointed at that server, and a stop().
 */
async function startZoneServer(app, zone) {
    const {spawn} = require('child_process');
    const port = app.basePort + 73;
    const origin = `http://127.0.0.1:${port}`;
    const source = fs.readFileSync(app.configFile, 'utf8');
    if (!/^time_zone = .*$/m.test(source)) throw new Error('the config holds no time_zone line');
    const config = source
        .split(app.baseURL).join(origin)
        .replace(/^allowed_hosts = .*$/m, `allowed_hosts = "[\\"127.0.0.1\\",\\"127.0.0.1:${port}\\"]"`)
        .replace(/^time_zone = .*$/m, `time_zone = "${zone}"`);
    const configFile = path.join(outDir(), `config.zone-${app.line}-${app.name}.inc.php`);
    fs.writeFileSync(configFile, config);
    const logFile = path.join(outDir(), `server-zone-${app.line}-${app.name}.log`);
    const child = spawn('php', ['-d', 'max_execution_time=120', '-S', `127.0.0.1:${port}`, '-t', app.root], {
        cwd: app.root,
        env: {...process.env, PKP_CONFIG_FILE: configFile},
        stdio: ['ignore', fs.openSync(logFile, 'a'), fs.openSync(logFile, 'a')],
        detached: true,
    });
    const stop = () => {
        try {
            process.kill(-child.pid);
        } catch (e) {
            child.kill();
        }
    };
    let up = false;
    for (let i = 0; i < 50 && !up; i++) {
        try {
            up = (await fetch(`${origin}/README.md`)).ok;
        } catch (e) {
            /* not up yet */
        }
        if (!up) await new Promise((r) => setTimeout(r, 200));
    }
    if (!up) {
        stop();
        throw new Error(`no answer on ${origin}`);
    }
    return {app: {...app, baseURL: origin, url: (p) => `${origin}${p}`}, stop};
}

module.exports = {flat, FORMATS, schemaFile, getRecord, check, strict, loose, startZoneServer};
