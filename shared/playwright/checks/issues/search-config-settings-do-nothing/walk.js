// U15 A9: the configuration file's [search] section lists "min_word_length"
// and "results_per_keyword", which main no longer reads. This walk shows the
// first one ignored: a word shorter than min_word_length is still found.
// One app is enough (OJS): OMP and OPS run the same pkp-lib search code on
// each line. The walk restores the configuration file when it ends.
//   1. As a visitor, open the journal's Search page and search for
//      "Antimicrobial" (13 letters, in the title of the published article
//      "Antimicrobial, heavy metal resistance and plasmid profile ...").
//   2. As the administrator, set `min_word_length = 50` in the [search]
//      section of config.inc.php.
//   3. As a visitor, search for "Antimicrobial" again.
//   PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js ojs shared/playwright/checks/issues/search-config-settings-do-nothing/walk.js
const {forEachApp, launch, screen, record} = require('../../../probe');
const {searchWith} = require('../by-journal-choice-lost-after-search/lib');
const {setConfigValue} = require('./lib');

const WORD = 'Antimicrobial';

forEachApp(async (app) => {
    const facts = {app: app.name, line: app.line || 'main', word: WORD};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v)}`);
    };
    const short = (r) => ({url: r.url, titles: r.items.map((i) => (i.title || '').slice(0, 60)), notice: r.notice});
    const {page, close} = await launch(app);
    let cfg = null;
    try {
        const search = async (tagName) => {
            await page.goto(app.url(`/index.php/${app.contextPath}/search`));
            const r = await searchWith(page, {query: WORD});
            record(tagName, await screen(page));
            return short(r);
        };
        fact('1 default config', await search('1-search-default'));
        cfg = setConfigValue(app, 'search', 'min_word_length', 50);
        fact('2 config set', {key: 'min_word_length', before: cfg.before, after: '50'});
        fact('3 min_word_length 50', await search('3-search-min-50'));
    } finally {
        if (cfg) cfg.restore();
        await close();
    }
    record('facts', facts);
});
