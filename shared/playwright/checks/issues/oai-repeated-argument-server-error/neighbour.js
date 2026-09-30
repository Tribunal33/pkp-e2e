// Neighbour check for fix.diff (docs/issues/U19-A16-oai-repeated-argument-server-error.md):
// the requests the fix must leave as they were, walked with the fix in and
// out. Same dataset fleet, no sign-in, nothing changed in the data.
//   a. set once, with metadataPrefix        b. ListIdentifiers from a date
//   c. ListMetadataFormats                  d. ListSets
//   e. metadataPrefix missing (badArgument "Missing metadataPrefix parameter")
//   f. an unknown argument, twice (badArgument "foo is an illegal parameter")
//   g. an unknown verb (badVerb "Illegal OAI verb")
//   h. resumptionToken beside metadataPrefix ("metadataPrefix is an illegal parameter")
//   i. resumptionToken twice (the exclusive argument, repeated)
// Run: PROBE_RUN=<fix-neighbour|nofix-neighbour> PROBE_FEATURE=issues-w03 PROBE_AGENT=w03 node bin/probe.js all shared/playwright/checks/issues/oai-repeated-argument-server-error/neighbour.js
const {forEachApp, launch} = require('../../../probe');
const {reader} = require('./oai');

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('neighbour.js runs on a dataset fleet only (fleet-prep --dataset n)');
    const {page, close} = await launch(app);
    const {fact, open, save} = reader(app, page);
    fact('fleet', {line: app.line || 'main', dataset: app.dataset, run: process.env.PROBE_RUN || null});
    const ctx = app.contextPath;
    const oai = `${ctx}/oai?verb=`;
    try {
        await open('a-set-once', `${oai}ListRecords&metadataPrefix=oai_dc&set=${ctx}`);
        await open('b-listidentifiers-from', `${oai}ListIdentifiers&metadataPrefix=oai_dc&from=2000-01-01`);
        await open('c-listmetadataformats', `${oai}ListMetadataFormats`);
        await open('d-listsets', `${oai}ListSets`);
        await open('e-metadataprefix-missing', `${oai}ListRecords`);
        await open('f-unknown-argument-twice', `${oai}Identify&foo=1&foo=2`);
        await open('g-unknown-verb', `${oai}identify`);
        await open('h-token-beside-prefix', `${oai}ListRecords&resumptionToken=abc&metadataPrefix=oai_dc`);
        await open('i-token-twice', `${oai}ListRecords&resumptionToken=abc&resumptionToken=abc`);
    } finally {
        save();
        await close();
    }
});
