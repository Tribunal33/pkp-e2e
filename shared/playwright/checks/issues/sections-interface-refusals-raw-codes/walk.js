// Issue report docs/issues/U17-A9-sections-interface-refusals-raw-codes.md (U17 A9) {OJS}:
// the sections interface's two refusals answer a message code, not a sentence. Latent: no screen calls
// the interface, so the steps type its addresses into a browser signed in as admin, as a person would.
//
//   pre (as admin): Administration › Hosted Journals › "Create Journal" "u17c Second Journal", path <tag>
//   then, as admin, each address typed into the browser (the report's step numbers in brackets):
//   publicknowledge/api/v1/sections (its two sections, recorded)   <tag>/api/v1/sections [1: its "Articles" id]
//   publicknowledge/api/v1/sections/1 [control: 200]                publicknowledge/api/v1/sections/999 [2]
//   publicknowledge/api/v1/sections/<id read in step 1> [3]
//
// `neighbour` as the argument runs alone and creates nothing: admin's step 3 must stay 200 with the section,
// and an Author (ccorino) asking for section 999 must stay refused by role, with its own text.
// OMP and OPS have no sections interface (spec U17 A5): the script reads their address once and records it.
// The kit builds nothing.
//
// Reset first:  npm run fleet-prep -- --feature issues-u17c --dataset 3 --reset
// Run (main):   PROBE_FEATURE=issues-u17c PROBE_AGENT=u17c node bin/probe.js all shared/playwright/checks/issues/sections-interface-refusals-raw-codes/walk.js [neighbour]
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u17c-3_5 --dataset 3 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u17c-3_5 PROBE_AGENT=u17c node bin/probe.js all shared/playwright/checks/issues/sections-interface-refusals-raw-codes/walk.js
const {forEachApp, launch, signIn, screen, record, tag, serverLog} = require('../../../probe');
const {createJournal} = require('../doaj-deposit-takes-other-journals-articles/lib');

const neighbour = process.argv.slice(2).includes('neighbour');
const flat = (s, n = 1500) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim().slice(0, n));

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet only (fleet-prep --dataset)');
    const facts = {app: app.name, line: app.line || 'main', dataset: app.dataset, neighbour};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[fact] ${k}: ${flat(JSON.stringify(v), 1200)}`);
    };
    let n = 0;
    const log = serverLog(app);
    const from = log.mark();

    const {page, close} = await launch(app);
    // Open an address in the signed-in browser and keep what it answered.
    const open = async (label, path) => {
        let status = null, body = null, error = null;
        try {
            const r = await page.goto(app.url(path));
            status = r ? r.status() : null;
            body = r ? await r.text() : null;
        } catch (e) {
            error = flat(e.message, 300);
        }
        const name = `${neighbour ? 'nb' : 'w'}-${String(++n).padStart(2, '0')}-${label}`;
        record(name, await screen(page).catch((e) => ({error: e.message})));
        return {path, status, body: body && body.length > 20000 ? `${body.slice(0, 20000)}…` : body, error};
    };
    const json = (s) => {
        try {
            return JSON.parse(s);
        } catch (e) {
            return null;
        }
    };

    try {
        if (app.name !== 'ojs') {
            // No sections interface on a press or a preprint server (U17 A5): the address, once.
            await signIn(page, 'admin');
            fact('no interface', await open('no-interface', '/index.php/publicknowledge/api/v1/sections/999'));
            return;
        }
        await signIn(page, 'admin');
        if (neighbour) {
            fact('nb admin section 1', await open('admin-section-1', '/index.php/publicknowledge/api/v1/sections/1'));
            await signIn(page, 'ccorino');
            fact('nb author section 999', await open('author-section-999', '/index.php/publicknowledge/api/v1/sections/999'));
            return;
        }
        const t = tag('');
        facts.tag = t;
        fact('pre create journal', {
            status: await createJournal(page, app, {name: `u17c Second Journal`, initials: 'U17C', path: t, email: `${t}@mailinator.com`}).catch((e) => `error: ${flat(e.message, 300)}`),
        });
        const s1 = await open('pk-list', '/index.php/publicknowledge/api/v1/sections');
        const list1 = json(s1.body);
        fact('1 publicknowledge list', {status: s1.status, items: list1 && list1.items ? list1.items.map((i) => [i.id, i.title && i.title.en]) : s1.body});
        const s2 = await open('second-list', `/index.php/${t}/api/v1/sections`);
        const list2 = json(s2.body);
        const otherId = list2 && list2.items && list2.items[0] ? list2.items[0].id : null;
        fact('2 second journal list', {status: s2.status, items: list2 && list2.items ? list2.items.map((i) => [i.id, i.title && i.title.en]) : s2.body});
        const s3 = await open('pk-section-1', '/index.php/publicknowledge/api/v1/sections/1');
        fact('3 section 1', {status: s3.status, id: (json(s3.body) || {}).id, title: ((json(s3.body) || {}).title || {}).en});
        fact('4 section 999', await open('pk-section-999', '/index.php/publicknowledge/api/v1/sections/999'));
        fact('5 other journal section', otherId ? await open('pk-section-other', `/index.php/publicknowledge/api/v1/sections/${otherId}`) : 'no id from step 2');
    } finally {
        fact('server log', log.since(from));
        record(`${neighbour ? 'nb' : 'w'}-facts`, facts);
        await close();
    }
});
