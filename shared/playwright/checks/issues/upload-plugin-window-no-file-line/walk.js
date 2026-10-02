// U62 A2 issue walk: the "Upload A New Plugin" window's opening line.
// Steps: docs/issues/U62-A2-upload-plugin-window-no-file-line.md (Steps to reproduce).
//
//   PROBE_FEATURE=issues-g4 PROBE_AGENT=g4 node bin/probe.js all \
//     shared/playwright/checks/issues/upload-plugin-window-no-file-line/walk.js
//
// G4_MODE=walk (default): the Steps ("Upload A New Plugin", then the "Upgrade Plugin" control).
// G4_MODE=nb: the neighbour alone, "Upgrade" on "Web Feed Plugin", whose window must keep its own
// line and not take the upload one.
// Both windows are closed with "Cancel": nothing is uploaded.
const {forEachApp, launch, signIn, screen, shot, record} = require('../../../probe');

const MODE = process.env.G4_MODE || 'walk';
const UPLOAD_LINE = 'This form allows you to upload and install a new plugin. Please ensure the plugin is compressed as a .tar.gz file.';
const UPGRADE_LINE = 'This form allows you to upgrade a plugin. Please ensure the plugin is compressed as a .tar.gz file.';

forEachApp(async (app) => {
    const {WebsitePluginsPage} = require('../../../pages/PluginsPages');
    const facts = {app: app.name, mode: MODE, run: process.env.PROBE_RUN || null};
    const {page, close} = await launch(app);
    const read = async (win, label) => {
        const o = {};
        try {
            o.formText = await win.formText();
            o.paragraphs = (await win.form.locator('.section > p, fieldset > p, p').allInnerTexts()).map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
            o.hasUploadLine = o.formText.includes(UPLOAD_LINE);
            o.hasUpgradeLine = o.formText.includes(UPGRADE_LINE);
            o.dialog = (await screen(page)).text.dialog;
            await shot(page, `a2-${label}`);
            await win.cancelLink.click();
            await win.dialog.waitFor({state: 'detached', timeout: 15_000});
            o.closedByCancel = true;
        } catch (e) {
            o.error = e.message.split('\n')[0];
        }
        await page.evaluate(() => new Promise((r) => setTimeout(r, 600)));
        return o;
    };
    try {
        await signIn(page, 'admin');
        const site = new WebsitePluginsPage(page, app.contextPath);
        await site.goto();
        if (MODE === 'walk') {
            facts.upload = await read(await site.list.openUpload(), 'upload');
        }
        facts.upgrade = await read(await site.list.openUpgrade('webfeedplugin'), 'upgrade-webfeed');
    } finally {
        record(`a2-${MODE}`, facts);
        await close();
    }
});
