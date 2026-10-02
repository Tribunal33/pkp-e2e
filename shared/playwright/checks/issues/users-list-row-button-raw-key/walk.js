// Issue walk: U53 A5 — the "…" button at the end of every row of Settings ›
// Users & Roles › "Current Users" is named by a raw locale code.
// Report: docs/issues/U53-A5-users-list-row-button-raw-key.md
//
// Steps (from PKP's default test dataset, nothing added):
//   1. sign in as rvaca; 2. Settings › Users & Roles;
//   3. read the name of the "…" button on the row "Daniel Barnes" (and count
//      the rows whose button carries the same name);
//   4. press it, read the menu, close it;
//   5. the same page in French (/fr_CA/…), read the same button's name.
//
// Modes (first argument):
//   walk (default)  the steps above
//   nb              neighbour check, read-only: what the fix must leave alone
//                   (the list's hidden "More Actions" column heading, every
//                   other button name on the tab, the Invitations rows'
//                   "…" buttons, the row menus' items), English and French
//
//   PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js <ojs|omp|ops|all> \
//     shared/playwright/checks/issues/users-list-row-button-raw-key/walk.js [walk|nb]
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, rawKeys} = require('../../../probe');

const MODE = process.argv[2] || 'walk';
const T = 30_000;
const flat = (s) => (s || '').replace(/\s+/g, ' ').trim();
const log = (...a) => console.log('[a5]', new Date().toISOString().slice(11, 19), ...a);

async function openAccess(page, app, locale) {
    await page.goto(app.url(`/index.php/${app.contextPath}/${locale}/management/settings/access`));
    await idle(page);
    await page.getByRole('table').last().getByRole('rowgroup').last().getByRole('row').first().waitFor({timeout: T});
    await idle(page);
}

/** The "Current Users" table: the table whose heading counts users. */
function currentUsers(page) {
    return page.getByRole('table').last();
}

/** A row's "…" button, found by place (last cell), not by name. */
function rowButton(row) {
    return row.getByRole('cell').last().getByRole('button').first();
}

async function buttonName(btn) {
    return {
        ariaLabel: await btn.getAttribute('aria-label'),
        snapshot: await btn.ariaSnapshot().catch((e) => `ERR ${e.message}`),
    };
}

async function readRows(page) {
    const rows = currentUsers(page).getByRole('rowgroup').last().getByRole('row');
    const n = await rows.count();
    const out = [];
    for (let i = 0; i < n; i++) {
        const r = rows.nth(i);
        const name = flat(await r.getByRole('cell').first().innerText());
        const b = rowButton(r);
        out.push({name, button: (await b.count()) ? await b.getAttribute('aria-label') : null});
    }
    return out;
}

async function menuOf(page, row) {
    const b = rowButton(row);
    await b.click();
    const items = page.getByRole('menuitem');
    await items.first().waitFor({timeout: T});
    const labels = (await items.allInnerTexts()).map(flat);
    await b.click();
    await page.getByRole('menuitem').first().waitFor({state: 'detached', timeout: T}).catch(() => {});
    return labels;
}

/** Every button on the Users tab outside the users list's rows, by name. */
async function otherButtons(page) {
    const panel = page.locator('[role="tabpanel"]:visible').first();
    return panel.evaluate((root) => {
        const out = [];
        for (const b of root.querySelectorAll('button')) {
            const inUserRow = !!b.closest('tbody tr') && b.closest('table') === [...root.querySelectorAll('table')].pop();
            if (inUserRow) continue;
            out.push((b.getAttribute('aria-label') || b.innerText || '').replace(/\s+/g, ' ').trim());
        }
        return out;
    });
}

async function hiddenHeadings(page) {
    return currentUsers(page).getByRole('columnheader').evaluateAll((ths) =>
        ths.map((th) => th.innerText.replace(/\s+/g, ' ').trim())
    );
}

forEachApp(async (app) => {
    const {page, close} = await launch(app);
    const R = {mode: MODE, app: app.name};
    try {
        log(app.name, MODE, 'sign in as rvaca');
        await signIn(page, 'rvaca');

        if (MODE === 'walk') {
            // Step 2.
            await openAccess(page, app, 'en');
            const s2 = await screen(page);
            record('a5-step2-access', s2);
            await shot(page, 'a5-step2-access');
            // Step 3.
            const row = currentUsers(page).getByRole('rowgroup').last().getByRole('row').filter({hasText: 'Daniel Barnes'}).first();
            R.step3 = await buttonName(rowButton(row));
            const rows = await readRows(page);
            R.rowCount = rows.length;
            R.buttonNames = [...new Set(rows.map((r) => r.button))];
            R.rowsWithThatName = rows.filter((r) => r.button === R.step3.ariaLabel).length;
            R.rawKeysEn = await rawKeys(page).catch((e) => `ERR ${e.message}`);
            // Step 4.
            R.step4Menu = await menuOf(page, row);
            // Step 5.
            await openAccess(page, app, 'fr_CA');
            record('a5-step5-access-fr', await screen(page));
            await shot(page, 'a5-step5-access-fr');
            const rowFr = currentUsers(page).getByRole('rowgroup').last().getByRole('row').filter({hasText: 'Daniel Barnes'}).first();
            R.step5 = await buttonName(rowButton(rowFr));
            const rowsFr = await readRows(page);
            R.buttonNamesFr = [...new Set(rowsFr.map((r) => r.button))];
            R.rawKeysFr = await rawKeys(page).catch((e) => `ERR ${e.message}`);
        } else if (MODE === 'nb') {
            for (const locale of ['en', 'fr_CA']) {
                await openAccess(page, app, locale);
                const o = (R[locale] = {});
                o.headings = await hiddenHeadings(page);
                o.otherButtons = await otherButtons(page);
                const inv = page.getByRole('table').first().getByRole('rowgroup').last().getByRole('row');
                o.invitationRows = await inv.count();
                const rows = currentUsers(page).getByRole('rowgroup').last().getByRole('row');
                o.menus = {};
                for (const who of ['Daniel Barnes', 'Ramiro Vaca', 'admin admin']) {
                    const r = rows.filter({hasText: who}).first();
                    o.menus[who] = (await r.count()) ? await menuOf(page, r) : null;
                }
                record(`a5-nb-${locale}`, await screen(page));
            }
        } else {
            throw new Error(`unknown mode ${MODE}`);
        }
        await signOut(page);
    } catch (e) {
        R.error = e.message;
        log(app.name, 'ERROR', e.message);
        await shot(page, `a5-${MODE}-error`).catch(() => {});
    } finally {
        record(`a5-${MODE}`, R);
        log(app.name, JSON.stringify(R).slice(0, 1500));
        await close();
    }
});
