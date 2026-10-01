// Helpers for the U62 OJS1 walks: press the "Default Theme" box on Settings › Website › "Plugins".
const {screen, idle} = require('../../../probe');

const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (t, n = 400) => (t == null ? t : String(t).replace(/\s+/g, ' ').trim().slice(0, n));

/** Settings › Website › "Plugins", press the "Default Theme" box, answer "OK" in any window; returns what showed. */
async function pressThemeBox(page, app) {
    await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/website`));
    await idle(page);
    await page.locator('#plugins-button').first().click();
    await idle(page);
    const row = page.locator('tr.gridRow[id$="-row-defaultthemeplugin"]').first();
    await row.waitFor({timeout: T});
    const box = row.locator('input[type=checkbox]').first();
    const o = {category: flat(await row.locator('xpath=ancestor::tbody[1]/tr[1]').innerText().catch(() => null), 60), label: flat(await row.locator('td .label').first().innerText().catch(() => null), 60), before: await box.isChecked()};
    await box.click({noWaitAfter: true});
    await sleep(700);
    const dlg = page.locator('[role="dialog"]:visible').last();
    if (await dlg.count()) {
        o.window = flat(await dlg.innerText().catch(() => ''), 300);
        await dlg.getByRole('button', {name: 'OK', exact: true}).first().click();
    }
    await idle(page).catch(() => {});
    await sleep(800);
    o.screen = await screen(page);
    o.notices = o.screen.notices;
    o.after = await box.isChecked().catch(() => null);
    return o;
}

module.exports = {T, sleep, flat, pressThemeBox};
