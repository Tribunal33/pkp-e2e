// Kept walk for docs/issues/U44-OMP2-book-page-format-urn-labelled-code-unlinked.md (spec U44 register OMP2).
// Takes the report's Steps on a fresh load of PKP's default test dataset (OMP), through the screens:
//   1-4, as `rvaca`: Settings › Website › "Plugins": tick "URN"; its "Settings": tick "Publication Formats",
//        prefix urn:nbn:de:0000-, default patterns, namespace urn:nbn:de, resolver https://nbn-resolving.de/, "Save".
//   5-7, as `dbarnes`: submission 14, Publication › "Publication Formats", "PDF" › "Edit" › "Identifiers":
//        the ticked "Assign the URN … to this publication format", "Save".
//   8-9, signed out: the book page of submission 14; reads every identifier block under the format.
// PHASE=neighbour (on a fresh load, after the walk or on its own) reads, signed out, the book page of
// submission 5, whose "PDF" format has no URN: what the fix must leave alone. Run it with the fix in and out.
// The "Publication Formats" page is opened at the address its side-menu entry puts in the address bar
// (…workflowMenuKey=publication_<version>_publicationFormats on main, …publication_publicationFormats on 3.5).
// After the save the script reads publication_format_settings (read only) to show what was stored.
// Run (main): PROBE_FEATURE=issues-r31 PROBE_AGENT=r31 node bin/probe.js omp shared/playwright/checks/issues/book-page-format-urn-labelled-code-unlinked/walk.js
//   3.5: PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r31-3_5 PROBE_AGENT=r31 node bin/probe.js omp …
//   PHASE=neighbour in front for the neighbour check.
const {forEachApp, launch, signIn, signOut, record, idle, sql} = require('../../../probe');
const L = require('../urn-check-number-wrong-digit/lib');

const {T, sleep, flat, wf, isMain, snap, configureUrn, openIdTab, topWin} = L;
const SID = 14;
const NEIGHBOUR_SID = 5;
const FORMAT = 'PDF';
const PHASE = process.env.PHASE || 'walk';

forEachApp(async (app) => {
    const facts = {line: app.line || 'main', phase: PHASE};
    const fact = (k, v) => { facts[k] = v; console.log(`[${app.name}] ${k}: ${JSON.stringify(v).slice(0, 1200)}`); };
    if (app.name !== 'omp') { fact('surface', 'no publication formats on this app'); record(`w-${PHASE}-facts`, facts); return; }
    const {page, close} = await launch(app);
    let n = 0;
    const nm = (x) => `w-${PHASE === 'walk' ? '' : 'n-'}${String(++n).padStart(2, '0')}-${x}`;
    const stored = () => sql(app, "select publication_format_id || '=' || setting_value from publication_format_settings where setting_name = 'pub-id::other::urn' order by 1").split('\n').filter(Boolean);

    async function openFormats(name) {
        const pid = Number(sql(app, `select current_publication_id from submissions where submission_id = ${SID}`));
        const key = isMain(app) ? `publication_${pid}_publicationFormats` : 'publication_publicationFormats';
        await page.goto(app.url(`/index.php/${app.contextPath}/dashboard/editorial?workflowSubmissionId=${SID}&workflowMenuKey=${key}`));
        await idle(page);
        await wf(page).locator('tr.gridRow').filter({has: page.locator('.onix_code')}).first().waitFor({timeout: T}).catch(() => {});
        await idle(page);
        await sleep(400);
        await snap(page, name);
    }
    /** The format row's arrow, then its "Edit"; waits for the window's tabs. */
    async function openFormatEdit(name) {
        const row = wf(page).locator('tr.gridRow').filter({has: page.locator('.onix_code')}).filter({hasText: FORMAT}).first();
        await row.waitFor({timeout: T});
        const id = await row.getAttribute('id');
        await row.locator('a.show_extras').first().click();
        await sleep(500);
        await page.locator(`[id="${id}-control-row"]`).getByRole('link', {name: 'Edit', exact: true}).first().click();
        await page.waitForFunction(() => { const d = [...document.querySelectorAll('[role=dialog]')].filter((e) => e.getClientRects().length); return d.length >= 2 && d.pop().querySelector('[role=tab]'); }, null, {timeout: T}).catch(() => {});
        await idle(page);
        await sleep(500);
        const tabs = (await topWin(page).locator('[role=tab]').allInnerTexts().catch(() => [])).map((x) => x.trim());
        await snap(page, name, {tabs});
        return {tabs};
    }
    /** "Save" on the "Identifiers" tab with the assign box as it is offered. */
    async function saveIdTab(name) {
        const f = topWin(page).locator('#publicIdentifiersForm').first();
        const box = f.locator('input[type=checkbox][name="assignURN"]');
        const out = {assignBox: (await box.count()) ? {checked: await box.isChecked(), label: flat(await f.locator('label[for^="assignURN"]').first().innerText().catch(() => null), 300)} : null};
        const n0 = await page.locator('[role="dialog"]:visible').count();
        const w = page.waitForResponse((r) => /update-identifiers|updateIdentifiers/i.test(r.url()), {timeout: T}).catch(() => null);
        await f.getByRole('button', {name: 'Save', exact: true}).click();
        const r = await w;
        out.status = r ? r.status() : null;
        await idle(page);
        await sleep(900);
        out.windowClosed = (await page.locator('[role="dialog"]:visible').count()) < n0;
        out.stored = stored();
        await snap(page, name, {save: out});
        return out;
    }
    /** The book page, signed out: every identifier block under the publication formats, as shown. */
    async function readBookPage(sid, name) {
        await page.goto(app.url(`/index.php/${app.contextPath}/en/catalog/book/${sid}`));
        await idle(page);
        const out = await page.evaluate(() => {
            const t = (e) => (e ? e.innerText.replace(/\s+/g, ' ').trim() : null);
            const main = document.querySelector('.obj_monograph_full');
            const formats = [...document.querySelectorAll('.obj_monograph_full .item.publication_format')];
            return {
                title: t(document.querySelector('.obj_monograph_full h1')),
                detailsText: t(document.querySelector('.obj_monograph_full .entry_details')),
                formatBlocks: formats.map((f) => ({
                    text: t(f),
                    pubIds: [...f.querySelectorAll('.sub_item.pubid')].map((s) => {
                        const a = s.querySelector('.value a');
                        return {label: t(s.querySelector('.label')), value: t(s.querySelector('.value')), link: a ? {text: t(a), href: a.getAttribute('href')} : null};
                    }),
                })),
                pageHasOtherUrn: !!main && main.innerText.includes('other::urn'),
                resolverLinks: [...document.querySelectorAll('a[href*="nbn-resolving"]')].map((a) => ({text: t(a), href: a.getAttribute('href')})),
                dcIdentifierUrn: (document.querySelector('meta[name="DC.Identifier.URN"]') || {}).content || null,
            };
        });
        await snap(page, name, {book: out});
        return out;
    }

    try {
        if (PHASE === 'walk') {
            // 1-4
            await signIn(page, 'rvaca');
            fact('step2-4: URN settings', await configureUrn(page, app, nm('step2-4-urn-settings'), {kinds: ['enableRepresentationURN'], suffix: 'default', checkNo: false}));
            await signOut(page);
            // 5-7
            await signIn(page, 'dbarnes');
            await openFormats(nm('step6-formats'));
            fact('step6: Edit PDF', await openFormatEdit(nm('step6-edit')));
            fact('step7: Identifiers', await openIdTab(page, nm('step7-identifiers')));
            fact('step7: Save', await saveIdTab(nm('step7-save')));
            await signOut(page);
            // 8-9
            fact('step8-9: book page 14', await readBookPage(SID, nm('step8-book-page')));
        } else {
            fact('neighbour: stored URNs', stored());
            fact('neighbour: book page 5 (format without URN)', await readBookPage(NEIGHBOUR_SID, nm('book-page-5')));
            fact('neighbour: book page 14', await readBookPage(SID, nm('book-page-14')));
        }
    } catch (e) {
        fact('error', String(e.message || e).slice(0, 600));
        await snap(page, nm('error')).catch(() => {});
    } finally {
        record(`w-${PHASE}-facts`, facts);
        await close();
    }
});
