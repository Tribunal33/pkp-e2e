// Reads one rendered OAI answer page (lib/pkp/xml/oai2.xsl in the browser):
// the "There are more results." line, the paging table, the "Resume" link,
// the records and sets shown, and an "OAI Error(s)" block.
async function readPart(page) {
    const text = await page.locator('body').innerText();
    const cell = (key) => {
        const m = text.match(new RegExp(`^${key}\\s*\\t?\\s*(.*)$`, 'm'));
        return m ? m[1].trim() : null;
    };
    const resume = page.getByRole('link', {name: 'Resume', exact: true});
    const resumeCount = await resume.count();
    const tokenCell = cell('resumptionToken:');
    const token = tokenCell === null ? null : tokenCell.replace(/\s*Resume$/, '').trim();
    const errorBlock = /OAI Error\(s\)/.test(text)
        ? (text.match(/(badResumptionToken|badArgument|noRecordsMatch)[^\n]*\n?[^\n]*/) || [text.slice(0, 300)])[0]
        : null;
    return {
        url: page.url(),
        title: await page.title(),
        moreResults: text.includes('There are more results.'),
        completeListSize: cell('completeListSize'),
        cursor: cell('cursor'),
        expirationDate: cell('expirationDate'),
        tokenRow: tokenCell !== null,
        token,
        resume: resumeCount > 0,
        resumeHref: resumeCount ? await resume.first().getAttribute('href') : null,
        records: (text.match(/OAI Record: [^\n]+/g) || []).map((s) => s.replace('OAI Record: ', '')),
        headers: (text.match(/OAI Record Header/g) || []).length,
        sets: (text.match(/^setSpec\s*\t?\s*[^\n]+/gm) || []).length,
        error: errorBlock,
    };
}

module.exports = {readPart};
