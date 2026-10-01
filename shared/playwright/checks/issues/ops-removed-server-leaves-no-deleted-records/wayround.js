// Way round for docs/issues/U19-OPS4-ops-removed-server-leaves-no-deleted-records.md
// (spec U19 register OPS4), OPS, without the fix, on PKP's default test dataset:
//   w1  admin: Administration › "Hosted Servers" › publicknowledge › "Edit":
//       untick "… appear publicly on the site" › "Save" › "Close"
//   w2  signed out: site-wide ListIdentifiers oai_dc
//   w3  admin: the same row › "Remove" › "OK"
//   w4  signed out: site-wide ListIdentifiers oai_dc again
// Expected: w2 and w4 list the 17 posted preprints as deleted records.
//
// Reset first:  PATH=/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH npm run fleet-prep -- --feature issues-w23 --dataset 2 --reset
// Run:          PROBE_RUN=way PROBE_FEATURE=issues-w23 PROBE_AGENT=w23 node bin/probe.js ops shared/playwright/checks/issues/ops-removed-server-leaves-no-deleted-records/wayround.js
const {forEachApp, launch, signIn, signOut, screen, record, idle} = require('../../../probe');

const T = 30_000;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('wayround.js runs on a dataset fleet only');
    if (app.name !== 'ops') return;
    const facts = {};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 900)}`); };
    const list = async (label) => {
        const {page, close} = await launch(app);
        try {
            const rel = '/index.php/index/oai?verb=ListIdentifiers&metadataPrefix=oai_dc';
            await page.goto(app.url(rel));
            record(label, await screen(page));
            const body = await (await page.request.get(app.url(rel))).text();
            const err = body.match(/<error code="([^"]+)">([^<]*)<\/error>/);
            return {error: err ? `${err[1]}: ${err[2]}` : null,
                headers: (body.match(/<header[ >]/g) || []).length,
                deleted: (body.match(/<header status="deleted">/g) || []).length};
        } finally { await close(); }
    };
    const hosted = async (page) => {
        await page.goto(app.url('/index.php/index/en/admin/contexts'));
        const row = page.locator('#contextGridContainer tbody tr.gridRow').filter({has: page.locator('td:nth-child(2)', {hasText: /^\s*publicknowledge\s*$/})});
        await row.waitFor({timeout: T});
        await idle(page);
        await row.locator('a.show_extras').click();
        return row.locator('xpath=following-sibling::tr[1]');
    };
    {
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'admin');
            let controls = await hosted(page);
            await controls.getByRole('link', {name: 'Edit', exact: true}).click();
            const dialog = page.getByRole('dialog').filter({has: page.getByRole('heading', {name: 'Edit', exact: true})});
            const box = dialog.getByRole('checkbox', {name: /appear publicly on the site/});
            await box.waitFor({timeout: T});
            await box.uncheck();
            const saved = page.waitForResponse((r) => r.request().method() === 'POST' && /\/api\/v1\/contexts\/\d+/.test(r.url()), {timeout: T});
            await dialog.getByRole('button', {name: 'Save', exact: true}).click();
            fact('w1 save', {status: (await saved).status()});
            await idle(page); await pause(1500);
            record('w1-saved', await screen(page));
            await signOut(page).catch(() => {});
        } finally { await close(); }
    }
    fact('w2 list', await list('w2-list'));
    {
        const {page, close} = await launch(app);
        try {
            await signIn(page, 'admin');
            const controls = await hosted(page);
            await controls.getByRole('link', {name: 'Remove', exact: true}).click();
            const dialog = page.getByRole('dialog', {name: 'Confirm', exact: true});
            await dialog.waitFor({timeout: T});
            const done = page.waitForResponse((r) => r.request().method() === 'POST' && /delete-context/.test(r.url()), {timeout: 120_000});
            await dialog.getByRole('button', {name: 'OK', exact: true}).click();
            fact('w3 delete-context', {status: (await done).status()});
            await signOut(page).catch(() => {});
        } finally { await close(); }
    }
    fact('w4 list', await list('w4-list'));
    record('wayround-facts', facts);
});
