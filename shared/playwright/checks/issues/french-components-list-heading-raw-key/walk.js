// Issue report docs/issues/U58-A9-french-components-list-heading-raw-key.md (U58 A9): in French (Canada)
// a press's and a preprint server's Settings › Workflow › "Submission" › Components list is headed by a
// code; on a preprint server seven components are also named by codes (the part that joins
// docs/issues/U57-A8-french-default-texts-stored-as-codes.md).
//
// Takes the report's Steps through the screens on a dataset fleet freshly reset to PKP's default
// test dataset, as the dataset's manager `rvaca` on `publicknowledge`, all three apps (the journal
// is the control):
//   1. rvaca signs in
//   2. the initials menu > "Change Language" > "français"
//   3. Settings > Workflow, top tab "Soumission", side tab "Components": the side tab's name, the
//      list's heading, every row's name
//   4. OPS: the second row's arrow > "Edit": the window's French and English "Name"; "Cancel"
//   5. the list's third header link ("Restore Defaults") > "OK": the rows again
// Nothing is created; step 5 rewrites the default components as the screen does.
//
// Modes (MODE=):
//   walk (default)  the Steps above, in French.
//   nb              what the heading fix must leave alone: steps 1 and 3 in English (no step 2).
//
// Reset first:  npm run fleet-prep -- --feature <feature> --dataset <n> --reset
// Run (main):   PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/french-components-list-heading-raw-key/walk.js
// Run (3.5):    PKP_E2E_LINE=stable-3_5_0 in front of both, the 3.5 fleet's feature, PROBE_RUN=r35.
// Fix trials:   PROBE_RUN=fix (walk) and nb-in / nb-out (MODE=nb) with fix-omp.diff / fix-ops.diff in
//               or out; PROBE_RUN=fix57 (walk) with the U57 A8 report's fix.diff applied.
// Records each screen and the facts (facts-<mode>); asserts nothing.
const {forEachApp, launch, signIn, screen, shot, record, idle, rawKeys, sql} = require('../../../probe');
const {changeLanguage} = require('../custom-block-stuck-with-unusable-name/lib');

const T = 30_000;
const MODE = process.env.MODE || 'walk';
const flat = (s, n = 600) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, n);
const keysOnly = (list) => [...new Set((list || []).map((k) => String(k).replace(/ @ .*$/, '')))];

forEachApp(async (app) => {
    if (!app.dataset) throw new Error('walk.js runs on a dataset fleet (fleet-prep --dataset n --reset)');
    const lang = MODE === 'nb' ? 'en' : 'fr_CA';
    const facts = {mode: MODE, lang, line: app.line || 'main', run: process.env.PROBE_RUN || null};
    const fact = (k, v) => {
        facts[k] = v;
        console.log(`[${app.name} ${MODE}] ${k}: ${flat(JSON.stringify(v), 3000)}`);
    };
    const {page, close} = await launch(app);
    /** One step; a throw is recorded, never fatal (a fix or an older line changes the screen). */
    const step = async (name, fn) => {
        try {
            return await fn();
        } catch (e) {
            await shot(page, `${name}-error`).catch(() => {});
            return {error: flat(e.message, 2000)};
        }
    };
    const grid = page.locator('#components [id^="component-grid-settings-genre"]').first();
    /** The list as the screen shows it: the side tab, the heading, the header links and the names. */
    const readList = async () => {
        await grid.locator('tbody tr.gridRow').first().waitFor({timeout: T});
        await idle(page);
        return {
            sideTab: flat(await page.locator('#components-button').innerText()),
            heading: flat(await grid.locator('.header').getByRole('heading').first().innerText().catch(() => null)),
            headerLinks: (await grid.locator('.header ul.actions a:visible').allInnerTexts()).map((x) => flat(x, 80)),
            names: await grid.locator('tbody tr.gridRow td:first-child').evaluateAll((tds) => tds.map((td) => {
                const c = td.cloneNode(true);
                c.querySelectorAll('a.show_extras, script').forEach((a) => a.remove());
                return c.textContent.replace(/\s+/g, ' ').trim();
            })),
            rawKeys: keysOnly(await rawKeys(page, {scope: '#components'})),
        };
    };
    try {
        // Step 1.
        await signIn(page, 'rvaca');
        await page.goto(app.url(`/index.php/${app.contextPath}/en/dashboard/editorial`));
        await idle(page);
        // Step 2.
        if (lang === 'fr_CA') {
            fact('s2-language', await step('s2', async () => {
                await changeLanguage(page, 'français', 'fr_CA');
                return {url: page.url().replace(/^https?:\/\/[^/]+/, ''), htmlLang: await page.locator('html').getAttribute('lang')};
            }));
        }
        // Step 3.
        fact('s3-page', await step('s3a', async () => {
            await page.goto(app.url(`/index.php/${app.contextPath}/${lang}/management/settings/workflow`));
            await idle(page);
            await page.locator('#submission-button').click();
            await page.locator('#components-button').click();
            await idle(page);
            return {
                title: await page.title(),
                h1: flat(await page.locator('main h1').first().innerText().catch(() => null), 120),
                topTab: flat(await page.locator('#submission-button').innerText()),
                sideTabs: (await page.locator('#submission [role="tablist"]').first().getByRole('tab').allInnerTexts()).map((x) => flat(x, 80)),
                url: page.url().replace(/^https?:\/\/[^/]+/, ''),
            };
        }));
        fact('s3-list', await step('s3b', readList));
        record(`s3-${lang}-components`, await screen(page));
        await shot(page, `s3-${lang}-components`);
        if (MODE === 'nb') return;
        fact('page-raw-keys-outside-list', await step('s3c', async () => {
            const inList = new Set(facts['s3-list']?.rawKeys || []);
            return keysOnly(await rawKeys(page)).filter((k) => !inList.has(k));
        }));
        // Step 4 (OPS): the second row's "Edit" window.
        if (app.name === 'ops') {
            fact('s4-edit', await step('s4', async () => {
                const row = grid.locator('tbody tr.gridRow').nth(1);
                await row.locator('a.show_extras').click();
                const controls = row.locator('xpath=following-sibling::tr[1]');
                const edit = controls.locator('a[id*="editGenre"]').first();
                await edit.waitFor({timeout: T});
                const editLabel = flat(await edit.innerText());
                await edit.click();
                const form = page.locator('form#genreForm');
                await form.locator('input[name="name[en]"]').waitFor({timeout: T});
                await idle(page);
                const out = {
                    editLabel,
                    windowHeading: flat(await page.getByRole('dialog').filter({has: form}).getByRole('heading').first().innerText().catch(() => null)),
                    nameFr: await form.locator('input[name="name[fr_CA]"]').inputValue().catch(() => null),
                    nameEn: await form.locator('input[name="name[en]"]').inputValue(),
                    rawKeys: keysOnly(await rawKeys(page, {scope: 'form#genreForm'})),
                };
                record(`s4-${lang}-edit`, await screen(page));
                await shot(page, `s4-${lang}-edit`);
                const cancel = form.locator('a.cancelButton, a[id^="cancelFormButton"]').first();
                out.cancelLabel = flat(await cancel.innerText().catch(() => null));
                await cancel.click();
                await form.waitFor({state: 'detached', timeout: T}).catch(() => {});
                await idle(page);
                await page.waitForTimeout(600); // the closed window's slot (pastCloseWindow)
                return out;
            }));
        }
        // Step 5: "Restore Defaults" > "OK".
        fact('s5-restore', await step('s5', async () => {
            const link = grid.locator('.header ul.actions a:visible').last();
            const label = flat(await link.innerText());
            await link.click();
            const dialog = page.getByRole('dialog').filter({has: page.getByRole('button', {name: 'OK', exact: true})}).last();
            await dialog.waitFor({timeout: T});
            const question = flat(await dialog.innerText(), 400);
            const answered = page.waitForResponse((r) => r.request().method() === 'POST' && /restore-genres/.test(r.url()), {timeout: T});
            await dialog.getByRole('button', {name: 'OK', exact: true}).click();
            const response = await answered;
            await idle(page);
            await page.waitForTimeout(600);
            return {label, question, status: response.status()};
        }));
        fact('s5-list', await step('s5b', readList));
        record(`s5-${lang}-components`, await screen(page));
        await shot(page, `s5-${lang}-components`);
        // Evidence only: the stored French names after step 5.
        fact('db-fr-names', await step('db', async () => sql(app,
            "select g.entry_key || '=' || gs.setting_value from genres g join genre_settings gs on gs.genre_id = g.genre_id " +
            "where gs.setting_name = 'name' and gs.locale = 'fr_CA' and g.enabled = 1 order by g.seq")));
    } finally {
        record(`facts-${MODE}`, facts);
        await close();
    }
});
