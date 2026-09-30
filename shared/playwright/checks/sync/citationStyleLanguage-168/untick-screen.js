// Kept check for pkp/citationStyleLanguage#168, the finding through the screens: manager.maya opens Settings ›
// Website › Plugins › Installed Plugins › "Citation Style Language" › Settings, unticks "Translator" under the
// translator setting, saves, re-opens the settings, and reads which Translator boxes are ticked. Run after
// csl-defaults.js `seed` (same env). Expected with the PR: ticked again after the save (the finding).
const {forEachApp, launch, signIn, record, shot, idle} = require('../../../probe');

forEachApp(async (app) => {
    const {page} = await launch(app);
    await signIn(page, 'manager.maya');
    const open = async () => {
        await page.goto(app.url(`/index.php/${app.contextPath}/management/settings/website`));
        await idle(page);
        await page.getByRole('tab', {name: 'Plugins'}).click();
        await idle(page);
        const row = page.locator('tr', {hasText: 'Citation Style Language'}).first();
        await row.locator('a.show_extras').click();
        await row.locator('xpath=following-sibling::tr[1]').getByRole('link', {name: 'Settings'}).click();
        await page.locator('#citationStyleLanguageSettingsForm, form[id*="citationStyleLanguage"]').first().waitFor();
        await idle(page);
    };
    const translatorBoxes = () => page.locator('input[name="groupTranslator[]"]');
    const read = async () => page.$$eval('input[name="groupTranslator[]"]', (els) => els.map((e) => ({value: e.value, label: (document.querySelector(`label[for="${e.id}"]`) || e.closest('label') || e.parentElement)?.textContent.trim(), checked: e.checked})));
    await open();
    const before = await read();
    const translator = translatorBoxes().nth(before.findIndex((b) => b.label === 'Translator'));
    if (before.some((b) => b.label === 'Translator')) await translator.uncheck();
    const beforeSave = await read();
    await shot(page, 'untick-before-save');
    await page.locator('form[id*="citationStyleLanguage"] button[type="submit"], form[id*="citationStyleLanguage"] button:has-text("Save")').first().click();
    await idle(page);
    await page.waitForTimeout(1500);
    await open();
    const after = await read();
    await shot(page, 'untick-reopened');
    record('untick-screen', {before, beforeSave, after, count: await translatorBoxes().count()});
    console.log(`[csl168] ${app.name} screen: opened ${JSON.stringify(before.filter((b) => b.checked).map((b) => b.label))} → unticked ${JSON.stringify(beforeSave.filter((b) => b.checked).map((b) => b.label))} → saved, re-opened ${JSON.stringify(after.filter((b) => b.checked).map((b) => b.label))}`);
});
