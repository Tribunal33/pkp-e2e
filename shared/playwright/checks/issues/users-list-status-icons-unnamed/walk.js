// Issue walk: U53 A12 — the ORCID icon and the red "disabled" icon after a
// name in Settings › Users & Roles › "Current Users" have no name for a
// screen reader.
// Report: docs/issues/U53-A12-users-list-status-icons-unnamed.md
//
// Preconditions (PKP's default test dataset): dbuskins has a connected ORCID
// iD (SQL standing in for ORCID's OAuth answer, lib.js connectOrcid()).
// Steps:
//   1. sign in as rvaca; 2. Settings › Users & Roles;
//   3. row "Minoti Inoue": "…" › "Disable User", reason "u53r4", "OK";
//   4. read the "Name" cells of "David Buskins" and "Minoti Inoue" in the
//      accessibility tree (control: "Daniel Barnes").
//
// Modes (first argument):
//   walk (default)  the precondition and the steps above
//   nb              neighbour check, read-only, after a walk: every row's
//                   Name cell (accessible name and visible text), the icons
//                   still drawn, the rows without icons unchanged, the
//                   other columns' headings, in English and French
//
//   PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js <ojs|omp|ops|all> \
//     shared/playwright/checks/issues/users-list-status-icons-unnamed/walk.js [walk|nb]
const {forEachApp, launch, signIn, signOut, screen, shot, record, idle, sql} = require('../../../probe');
const {connectOrcid} = require('./lib');

const MODE = process.argv[2] || 'walk';
const T = 30_000;
const flat = (s) => (s || '').replace(/\s+/g, ' ').trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log('[a12]', new Date().toISOString().slice(11, 19), ...a);

async function openAccess(page, app, locale = 'en') {
    await page.goto(app.url(`/index.php/${app.contextPath}/${locale}/management/settings/access`));
    await idle(page);
    await page.getByRole('table').last().getByRole('rowgroup').last().getByRole('row').first().waitFor({timeout: T});
    await idle(page);
}

/** The "Current Users" table (the Invitations table sits above it). */
function currentUsers(page) {
    return page.getByRole('table').last();
}

function userRow(page, name) {
    return currentUsers(page).getByRole('rowgroup').last().getByRole('row').filter({hasText: name}).first();
}

/** What a screen reader gets from a row's Name cell, and what is drawn. */
async function readNameCell(row) {
    const cell = row.getByRole('cell').first();
    return {
        aria: await cell.ariaSnapshot().catch((e) => `ERR ${e.message}`),
        text: flat(await cell.innerText()),
        icons: await cell.locator('.pkpIcon--inline').evaluateAll((els) =>
            els.map((el) => {
                const r = el.getBoundingClientRect();
                return {
                    cls: el.className,
                    w: Math.round(r.width),
                    h: Math.round(r.height),
                    ariaHidden: el.getAttribute('aria-hidden'),
                    ariaLabel: el.getAttribute('aria-label'),
                    role: el.getAttribute('role'),
                };
            })
        ),
        srOnly: await cell.locator('.sr-only').allInnerTexts(),
    };
}

forEachApp(async (app) => {
    const {page, close} = await launch(app);
    const R = {mode: MODE, app: app.name};
    try {
        if (MODE === 'walk') {
            R.precondition = connectOrcid(app, 'dbuskins');
            R.preconditionRows = sql(app, `SELECT setting_name, setting_value FROM user_settings WHERE setting_name LIKE 'orcid%' AND user_id = (SELECT user_id FROM users WHERE username = 'dbuskins') ORDER BY 1`);
            // Steps 1, 2.
            log(app.name, 'sign in as rvaca');
            await signIn(page, 'rvaca');
            await openAccess(page, app);
            record('a12-step2-access', await screen(page));
            R.before = {
                buskins: await readNameCell(userRow(page, 'David Buskins')),
                inoue: await readNameCell(userRow(page, 'Minoti Inoue')),
            };
            // Step 3.
            const row = userRow(page, 'Minoti Inoue');
            await row.getByRole('cell').last().getByRole('button').first().click();
            await page.getByRole('menuitem', {name: 'Disable User', exact: true}).click();
            const form = page.locator('#userDisableForm');
            await form.waitFor({timeout: T});
            await idle(page);
            R.disableWindow = flat(await page.getByRole('dialog').last().innerText()).slice(0, 400);
            await form.locator('textarea[name="disableReason"]').fill('u53r4');
            await form.getByRole('button', {name: 'OK', exact: true}).click();
            await form.waitFor({state: 'detached', timeout: T});
            await idle(page);
            await sleep(800);
            R.disabledInDb = sql(app, `SELECT username, disabled, disabled_reason FROM users WHERE username = 'minoue'`);
            // Step 4.
            R.step4 = {
                buskins: await readNameCell(userRow(page, 'David Buskins')),
                inoue: await readNameCell(userRow(page, 'Minoti Inoue')),
                control: await readNameCell(userRow(page, 'Daniel Barnes')),
            };
            record('a12-step4-access', await screen(page));
            await shot(page, 'a12-step4-access');
            await signOut(page);
        } else if (MODE === 'nb') {
            await signIn(page, 'rvaca');
            for (const locale of ['en', 'fr_CA']) {
                await openAccess(page, app, locale);
                const o = (R[locale] = {});
                const rows = currentUsers(page).getByRole('rowgroup').last().getByRole('row');
                const n = await rows.count();
                o.rows = [];
                for (let i = 0; i < n; i++) {
                    const c = await readNameCell(rows.nth(i));
                    o.rows.push({aria: c.aria, text: c.text, icons: c.icons.length, drawn: c.icons.every((x) => x.w > 0 && x.h > 0)});
                }
                o.headings = await currentUsers(page)
                    .getByRole('columnheader')
                    .evaluateAll((ths) => ths.map((th) => th.innerText.replace(/\s+/g, ' ').trim()));
                o.invitations = flat(await page.getByRole('table').first().innerText()).slice(0, 400);
                record(`a12-nb-${locale}`, await screen(page));
                await shot(page, `a12-nb-${locale}`);
            }
            await signOut(page);
        } else {
            throw new Error(`unknown mode ${MODE}`);
        }
    } catch (e) {
        R.error = e.message;
        log(app.name, 'ERROR', e.message);
        await shot(page, `a12-${MODE}-error`).catch(() => {});
    } finally {
        record(`a12-${MODE}`, R);
        log(app.name, JSON.stringify(R.step4 || R.error || '').slice(0, 1500));
        await close();
    }
});
