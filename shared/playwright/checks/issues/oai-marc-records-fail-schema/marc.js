// Reads an OAI MARC record the way a harvester checks it: the raw answer of a
// GetRecord address, the <record> (marcxml) or <oai_marc> (oai_marc) element
// cut out of it, validated with `xmllint --schema` against the schema the
// record names, and its fields as plain data (tag, indicators, subfield code,
// text; either spelling read) so two runs can be compared value by value.
// The schemas are fetched once into the run folder: MARC21slim.xsd from the
// Wayback Machine (loc.gov answers a browser challenge to scripts), oai_marc.xsd
// from openarchives.org.
const fs = require('fs');
const {execFileSync} = require('child_process');
const {outDir} = require('../../../probe');
const path = require('path');

const SCHEMAS = {
    marcxml: {file: 'MARC21slim.xsd', url: 'https://web.archive.org/web/2024id_/https://www.loc.gov/standards/marcxml/schema/MARC21slim.xsd', element: /<record\s+xmlns="http:\/\/www\.loc\.gov\/MARC21\/slim"[\s\S]*?<\/record>/},
    oai_marc: {file: 'oai_marc.xsd', url: 'http://www.openarchives.org/OAI/1.1/oai_marc.xsd', element: /<oai_marc[\s>][\s\S]*?<\/oai_marc>/},
};

async function schemaFile(request, prefix) {
    const s = SCHEMAS[prefix];
    const file = path.join(outDir(), s.file);
    if (!fs.existsSync(file)) {
        const body = await (await request.get(s.url)).text();
        if (!/<(xsd:)?schema/.test(body)) throw new Error(`${s.url} did not answer a schema`);
        fs.writeFileSync(file, body);
    }
    return file;
}

function validate(xsd, file) {
    let stderr = '';
    try {
        execFileSync('xmllint', ['--noout', '--schema', xsd, file], {stdio: ['ignore', 'pipe', 'pipe']});
    } catch (e) {
        stderr = String(e.stderr || '');
    }
    return stderr.split('\n').filter((l) => /error/.test(l)).map((l) => l.replace(/^.*?\.xml:/, 'line ').trim());
}

function fields(xml) {
    const out = [];
    const re = /<(controlfield|datafield|dataField|fixfield|varfield)\b([^>]*)>([\s\S]*?)<\/\1>/g;
    let m;
    while ((m = re.exec(xml))) {
        const attr = (n) => ((m[2].match(new RegExp(`\\b${n}="([^"]*)"`)) || [])[1]);
        const f = {tag: attr('tag') || attr('id'), ind1: attr('ind1') ?? attr('i1') ?? null, ind2: attr('ind2') ?? attr('i2') ?? null};
        if (/<subfield/.test(m[3])) {
            f.subfields = [...m[3].matchAll(/<subfield\b([^>]*)>([^<]*)<\/subfield>/g)].map((s) => {
                const code = (s[1].match(/\b(?:code|label)="([^"]*)"/) || [])[1];
                return [code ? code.replace(/^\$/, '') : null, s[2]];
            });
        } else {
            f.text = m[3];
        }
        out.push(f);
    }
    return out;
}

// GetRecord `identifier` in `prefix`, signed out, through `page`'s request context.
async function readMarc(page, app, prefix, identifier, name) {
    const address = `/index.php/${app.contextPath}/oai?verb=GetRecord&metadataPrefix=${prefix}&identifier=${identifier}`;
    const res = await page.request.get(app.url(address));
    const raw = await res.text();
    const out = {address, status: res.status(), error: (raw.match(/<error code="[^"]+">[^<]*<\/error>/) || [null])[0]};
    const el = (raw.match(SCHEMAS[prefix].element) || [null])[0];
    if (!el) return out;
    const xmlFile = path.join(outDir(), `${name}.xml`);
    fs.writeFileSync(xmlFile, `<?xml version="1.0" encoding="UTF-8"?>\n${el}\n`);
    const xsd = await schemaFile(page.request, prefix);
    out.errors = validate(xsd, xmlFile);
    out.valid = out.errors.length === 0;
    // xmllint stops checking the fields that follow an element the schema does
    // not expect (`dataField`): a copy with that one name corrected shows them.
    if (out.errors.some((e) => /dataField': This element is not expected/.test(e))) {
        const copy = xmlFile.replace(/\.xml$/, '-datafield-corrected.xml');
        fs.writeFileSync(copy, fs.readFileSync(xmlFile, 'utf8').replace(/dataField/g, 'datafield'));
        out.errorsAfterDataField = validate(xsd, copy);
    }
    out.fields = fields(el);
    out.element = el;
    return out;
}

module.exports = {readMarc, fields};
