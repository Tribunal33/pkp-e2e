// Issue report docs/issues/U44-A10-urn-prefix-refusal-written-out-brackets.md (U44 A10): in the URN plugin's
// settings window, a "URN Prefix" not shaped "urn:…:" is refused, but the message under the box reads
// `…"urn:"&lt;NID&gt;":"&lt;NSS&gt;.` while the list at the top reads `<NID>`. Takes the report's Steps on
// PKP's default test dataset (a dataset fleet), as `dbarnes`, on OJS and OMP (OPS has no URN plugin):
//   1-4  sign in; Settings › Website › "Plugins": "URN" enabled; the row's arrow, "Settings"
//   5    "Articles" ("Monographs") ticked
//   6    prefix `nbn:de:0000-`, namespace, resolver
//   7    "Save": the message under "URN Prefix", the list at the top (text and markup), any notice
//   8    prefix `urn:nbn:de:0000-`, "Save": the window closes; every notice shown at the top right
// WALK=neighbour runs alone (fix in and out): signed out, "Register" with every box filled and the two
// passwords different; the list at the top (another form that includes common/formErrors.tpl).
//
// Reset first:  npm run fleet-prep -- --feature issues-u44m --dataset 4 --reset
// Run (main):   PROBE_FEATURE=issues-u44m PROBE_AGENT=u44m node bin/probe.js all shared/playwright/checks/issues/urn-prefix-refusal-written-out-brackets/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 npm run fleet-prep -- --feature issues-u44m-3_5 --dataset 4 --reset
//               PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-u44m-3_5 PROBE_AGENT=u44m node bin/probe.js all shared/playwright/checks/issues/urn-prefix-refusal-written-out-brackets/walk.js
const {forEachApp, launch, signIn, screen, record, idle} = require('../../../probe');

const MODE = process.env.WALK || 'walk';
const KIND = {ojs: 'Articles', omp: 'Monographs'};

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const run = process.env.PROBE_RUN ? `-${process.env.PROBE_RUN}` : '';
    const name = (s) => `${s}${run}-${app.name}`;
    const facts = {app: app.name, line: app.line || 'main', mode: MODE, steps: {}};
    const fact = (k, v) => {
        facts.steps[k] = v;
        console.log(`[fact] ${app.name} ${k}: ${JSON.stringify(v).slice(0, 2000)}`);
    };
    if (MODE !== 'neighbour' && !KIND[app.name]) {
        console.log(`[fact] ${app.name} skipped: no URN plugin`);
        return;
    }

    const {page, close} = await launch(app);
    const step = async (label, action) => {
        try {
            const out = await action();
            fact(label, out === undefined ? 'done' : out);
        } catch (e) {
            fact(`${label} threw`, String(e.message).split('\n')[0]);
        }
        await idle(page);
    };
    // The notices at the top right that are on screen now (text and markup).
    const notices = () =>
        page
            .locator('.app__notifications .pkpNotification')
            .evaluateAll((els) => els.map((e) => ({text: e.innerText.trim(), html: e.innerHTML.replace(/\s+/g, ' ').slice(0, 400)})));
    // The top list's items, as shown and as markup.
    const topList = (form) =>
        form.locator('#formErrors li').evaluateAll((els) => els.map((e) => ({text: e.innerText.trim(), html: e.innerHTML.trim()})));

    try {
        if (MODE === 'neighbour') {
            await step('n1 open Register', async () => {
                await page.goto(app.url(`/index.php/${app.contextPath}/user/register`));
                return page.url();
            });
            await step('n2 fill, passwords differ', async () => {
                await page.locator('input[name="givenName"]').fill('U44m');
                await page.locator('input[name="familyName"]').fill('Neighbour');
                await page.locator('input[name="affiliation"]').fill('u44m');
                await page.locator('select[name="country"]').selectOption('CA');
                await page.locator('input[name="email"]').fill('u44m.neighbour@mailinator.com');
                await page.locator('input[name="username"]').fill('u44mneighbour');
                await page.locator('input[name="password"]').fill('u44mu44mA1');
                await page.locator('input[name="password2"]').fill('u44mu44mB2');
            });
            await step('n3 Register', async () => {
                const answered = page.waitForResponse((r) => r.request().method() === 'POST' && /\/user\/register/.test(r.url()), {timeout: 30_000});
                await page.locator('form#register button[type="submit"]').click();
                const r = await answered;
                await page.waitForLoadState('load');
                return {status: r.status(), list: await topList(page)};
            });
            record(name('neighbour'), await screen(page));
            return;
        }

        const {UrnPluginSettings} = require('../../../pages/IdentifiersPages.js');
        const plugins = new UrnPluginSettings(page, app.contextPath);
        let sent = 0;
        page.on('request', (r) => {
            if (r.method() === 'POST' && /\/manage\b|verb=save/.test(r.url())) sent += 1;
        });

        await step('1 sign in', () => signIn(page, 'dbarnes'));
        await step('2 plugins', () => plugins.openPlugins());
        const wasEnabled = await plugins.enabledBox().isChecked();
        await step('3 enable URN', async () => {
            if (!wasEnabled) await plugins.setEnabled(true);
            return {wasEnabled};
        });
        await step('4 open settings', () => plugins.openSettings());
        await step('5 kind ticked', () => plugins.setKind(KIND[app.name], true));
        await step('6 prefix, namespace, resolver', async () => {
            await plugins.prefixBox().fill('nbn:de:0000-');
            await plugins.namespaceSelect().selectOption('urn:nbn:de');
            await plugins.resolverBox().fill('https://nbn-resolving.de/');
        });
        await step('7 save', async () => {
            const from = sent;
            try {
                await plugins.saveRefusedByServer();
            } catch (e) {
                return {refused: false, sent: sent - from, error: String(e.message).split('\n')[0], windowOpen: (await plugins.form().count()) > 0};
            }
            const under = await plugins
                .fieldError('urnPrefix')
                .evaluateAll((els) => els.map((e) => ({text: e.innerText.trim(), html: e.innerHTML.replace(/\s+/g, ' ').trim()})));
            return {refused: true, sent: sent - from, under, top: await topList(plugins.form()), notices: await notices()};
        });
        record(name('7-refused'), await screen(page));
        await step('8 prefix put right, save', async () => {
            const from = sent;
            await plugins.prefixBox().fill('urn:nbn:de:0000-');
            const answered = page.waitForResponse((r) => r.request().method() === 'POST' && /\/manage\b/.test(r.url()), {timeout: 30_000});
            await plugins.form().getByRole('button', {name: 'Save', exact: true}).click();
            const r = await answered;
            await plugins.form().waitFor({state: 'detached', timeout: 30_000}).catch(() => null);
            // The notices arrive with the window's close; wait for the save's own before reading them all.
            await page
                .locator('.app__notifications .pkpNotification')
                .filter({hasText: 'Your changes have been saved.'})
                .first()
                .waitFor({state: 'visible', timeout: 30_000})
                .catch(() => null);
            await idle(page);
            return {status: r.status(), sent: sent - from, windowOpen: (await plugins.form().count()) > 0, notices: await notices()};
        });
        record(name('8-saved'), await screen(page));
    } finally {
        record(name('facts'), facts);
        await close();
    }
});
