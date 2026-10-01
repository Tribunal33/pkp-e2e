// Neighbour check for docs/issues/U19-A24-oai-driver-set-complete-list-offers-resume.md:
// the fix selects the DRIVER set in the query, so the set must keep exactly the
// records the plugin marks "driver" in the journal's whole list, in each access
// setup the plugin knows. Walked with the fix in and out; both must list the
// same members, and with the fix only parts followed by more records carry a
// live token. Under serve.js (oai_max_records = 1, see walk.js) it reads lists of
// several parts, following each live token.
// OJS only, on a freshly reset dataset fleet, through the screens as `dbarnes`:
//   N1  Settings › Website › Plugins › tick "DRIVER"          (1, 17 open, with galleys)
//   N2  submission 17 › "Unpublish" while DRIVER is on       (its deleted record is marked)
//   N3  Settings › Distribution › Access › "The journal will require subscriptions …" › Save
//       (the dataset's issue is open access, so nothing changes)
//   N4  Users & Roles › "Site Access Options" › "Users must be registered and log in to
//       view open access content." › Save
//       (live articles leave the set; the marked deleted record stays)
// After each: signed out, ListRecords set=driver and the whole list.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w20 --dataset 1 --reset
// Run:          PROBE_RUN=n-fix|n-nofix PROBE_FEATURE=issues-w20 PROBE_AGENT=w20 node bin/probe.js ojs shared/playwright/checks/issues/oai-driver-set-complete-list-offers-resume/neighbour.js
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
const SUB_MODE = 'The journal will require subscriptions to access some or all of its contents.';
const RESTRICT = 'Users must be registered and log in to view open access content.';

function parseOai(body) {
    const records = [];
    const re = /<header( status="deleted")?>([\s\S]*?)<\/header>/g;
    let m;
    while ((m = re.exec(body))) {
        const inner = m[2];
        const id = ((inner.match(/<identifier>([^<]+)<\/identifier>/) || [])[1] || '').replace(/^oai:[^:]+:/, '');
        const sets = [...inner.matchAll(/<setSpec>([^<]+)<\/setSpec>/g)].map((x) => x[1]);
        records.push({id: `${id}${m[1] ? ' (deleted)' : ''}`, driver: sets.includes('driver')});
    }
    return {
        error: (body.match(/<error code="([^"]+)">/) || [])[1] || null,
        records,
        token: (body.match(/<resumptionToken[^>]*>([^<]+)<\/resumptionToken>/) || [])[1] || null,
    };
}

forEachApp(async (app) => {
    if (!app.dataset || app.name !== 'ojs') return;
    const ctx = app.contextPath;
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v)}`); };

    const read = async (label) => {
        const {page, close} = await launch(app);
        try {
            // The whole list, following live tokens (several parts under a lowered oai_max_records); token: the parts' live tokens.
            const get = async (q) => {
                const out = {error: null, records: [], token: null, parts: 0};
                let next = q;
                while (next && out.parts < 10) {
                    const part = parseOai(await (await page.request.get(app.url(`/index.php/${ctx}/oai?${next}`))).text());
                    out.parts++;
                    if (part.error) { out.error = out.records.length ? `${part.error} after ${out.records.length}` : part.error; break; }
                    out.records.push(...part.records);
                    if (part.token) out.token = (out.token ? out.token + ',' : '') + `part${out.parts}`;
                    next = part.token ? `verb=${q.match(/verb=(\w+)/)[1]}&resumptionToken=${part.token}` : null;
                }
                return out;
            };
            const set = await get('verb=ListRecords&metadataPrefix=oai_dc&set=driver');
            const ids = await get('verb=ListIdentifiers&metadataPrefix=oai_dc&set=driver');
            const all = await get('verb=ListRecords&metadataPrefix=oai_dc');
            const marked = all.records.filter((r) => r.driver).map((r) => r.id);
            const sizes = {set: set.parts, all: all.parts};
            const listed = set.records.map((r) => r.id);
            fact(label, {
                setListRecords: set.error ? [...listed, set.error] : listed, setToken: set.token,
                setListIdentifiers: ids.error ? [...ids.records.map((r) => r.id), ids.error] : ids.records.map((r) => r.id), idsToken: ids.token,
                wholeList: all.records.map((r) => `${r.id}${r.driver ? ' [driver]' : ''}`), wholeToken: all.token,
                setEqualsMarked: JSON.stringify(set.error ? [] : listed) === JSON.stringify(marked), parts: sizes,
            });
        } finally { await close(); }
    };
    const asEditor = async (label, fn) => {
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'dbarnes');
            await fn(page);
            record(label, await screen(page));
            await signOut(page);
        } finally { await close(); }
    };
    const access = async (page, where, tab, fn) => {
        await page.goto(app.url(`/index.php/${ctx}/management/settings/${where}`));
        await idle(page);
        await page.getByRole('tab', {name: tab, exact: true}).click();
        const panel = page.getByRole('tabpanel', {name: tab, exact: true});
        await panel.getByRole('button', {name: 'Save', exact: true}).waitFor({timeout: T});
        await pause(300);
        await fn(panel);
        const answer = page.waitForResponse((r) => /\/api\/v1\/contexts\/\d+/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
        await panel.getByRole('button', {name: 'Save', exact: true}).click();
        fact(`saved (${(await answer).status()})`, true);
        await pause(300);
    };

    await asEditor('N1-driver-ticked', async (page) => {
        const {WebsitePluginsPage} = require('../../../pages/PluginsPages.js');
        const plugins = new WebsitePluginsPage(page, ctx);
        await plugins.goto();
        await plugins.list.tick('driverplugin');
    });
    await read('N1 DRIVER on');

    await asEditor('N2-unpublished-17', async (page) => {
        await page.goto(app.url(`/index.php/${ctx}/en/dashboard/editorial?workflowSubmissionId=17`));
        await idle(page); await pause(1000);
        const link = page.getByRole('link', {name: 'Title & Abstract', exact: true}).first();
        if (!(await link.isVisible().catch(() => false))) await page.getByRole('link', {name: 'Publication', exact: true}).first().click().catch(() => {});
        await link.click();
        await page.locator('h2', {hasText: 'Title & Abstract'}).first().waitFor({timeout: T});
        await idle(page); await pause(1000);
        await page.locator('[data-cy="workflow-controls-right"]').getByRole('button', {name: 'Unpublish', exact: true}).first().click();
        const dialog = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'Unpublish', exact: true})}).last();
        const done = page.waitForResponse((r) => /\/unpublish(\?|$)/.test(r.url()) && r.request().method() !== 'GET', {timeout: T});
        await dialog.getByRole('button', {name: 'Unpublish', exact: true}).last().click();
        await done;
        await idle(page); await pause(500);
    });
    await read('N2 17 unpublished with DRIVER on');

    await asEditor('N3-subscription-mode', (page) => access(page, 'distribution', 'Access', (panel) => panel.getByRole('radio', {name: SUB_MODE, exact: true}).check()));
    await read('N3 subscription journal, open issue');

    await asEditor('N4-restricted', (page) => access(page, 'access', 'Site Access Options', (panel) => panel.getByRole('checkbox', {name: RESTRICT, exact: true}).check()));
    await read('N4 open content needs sign-in');

    record('facts', facts);
});
