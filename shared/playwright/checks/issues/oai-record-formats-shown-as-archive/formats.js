// Reads one rendered ListMetadataFormats page (lib/pkp/xml/oai2.xsl in the
// browser): the paragraph above the "Metadata Format" blocks, the links in
// it, the blocks' prefixes, an "OAI Error(s)" block, and the raw answer's
// <request> element (the same address, read without the stylesheet).
async function readFormats(page) {
    const text = await page.locator('body').innerText();
    const intro = page.locator('p', {hasText: 'This is a list of metadata formats'});
    const introCount = await intro.count();
    const introLinks = introCount
        ? await intro.first().locator('a').evaluateAll((as) => as.map((a) => ({text: a.textContent.trim(), href: a.getAttribute('href')})))
        : [];
    const raw = await (await page.request.get(page.url())).text();
    const requestEl = (raw.match(/<request[^>]*>[^<]*<\/request>/) || [null])[0];
    return {
        url: page.url(),
        title: await page.title(),
        intro: introCount ? (await intro.first().innerText()).trim() : null,
        introLinks,
        prefixes: (text.match(/^metadataPrefix\s*\t?\s*([^\n]+)$/gm) || []).map((s) => s.replace(/^metadataPrefix\s*/, '').trim()),
        error: /OAI Error\(s\)/.test(text) ? text.slice(text.indexOf('OAI Error(s)'), text.indexOf('OAI Error(s)') + 200) : null,
        requestElement: requestEl,
    };
}

module.exports = {readFormats};
