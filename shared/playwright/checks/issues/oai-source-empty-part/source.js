// Reads the Dublin Core "Source" of OAI records: the rendered page's
// "Source" rows (lib/pkp/xml/oai2.xsl, one "Dublin Core Metadata (oai_dc)"
// table per record) and, from the raw answer of the same address, each
// record's <dc:source> elements with their xml:lang.
async function readSources(page) {
    const rendered = await page.evaluate(() => [...document.querySelectorAll('table.dcdata')].map((t) => {
        const rows = [...t.querySelectorAll('tr')].map((tr) => [...tr.querySelectorAll('td')].map((td) => td.textContent));
        const pick = (key) => rows.filter((r) => r[0] === key).map((r) => r[1]);
        return {title: pick('Title'), source: pick('Source')};
    }));
    const raw = await (await page.request.get(page.url())).text();
    const records = raw.split('<record>').slice(1).map((rec) => ({
        identifier: ((rec.match(/<identifier>([^<]+)<\/identifier>/) || [])[1]) || null,
        source: [...rec.matchAll(/<dc:source(?: xml:lang="([^"]*)")?>([^<]*)<\/dc:source>/g)].map((m) => ({lang: m[1] || null, value: m[2]})),
    }));
    const error = /<error code="([^"]+)"/.exec(raw);
    return {url: page.url(), rendered, records, error: error ? error[1] : null};
}

module.exports = {readSources};
