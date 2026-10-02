// U62 A10 issue walk: "Upload A New Plugin" with a file that is not a plugin package.
// Steps: docs/issues/U62-A10-upload-plugin-not-archive-server-message.md (Steps to reproduce).
//
//   PROBE_FEATURE=issues-g4 PROBE_AGENT=g4 node bin/probe.js all \
//     shared/playwright/checks/issues/upload-plugin-not-archive-server-message/walk.js
//
// G4_MODE=walk (default): the Steps (a plain text file, then the same file named ".tar.gz").
// G4_MODE=nb: the neighbour alone, an archive whose folder has no "version.xml", which must keep
// its own refusal ("The uploaded plugin archive does not contain a folder …").
// Nothing here installs a plugin: every file is refused before anything is copied under plugins/.
const fs = require('fs');
const {execFileSync} = require('child_process');
const {forEachApp, launch, signIn, screen, shot, record, outFile, serverLog} = require('../../../probe');

const MODE = process.env.G4_MODE || 'walk';
const flat = (s) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim());

forEachApp(async (app) => {
    const {WebsitePluginsPage, markNotices, notices} = require('../../../pages/PluginsPages');
    const {buildNoVersion} = require('../../../support/pluginPackages');
    const dir = outFile(`a10-files-${MODE}`);
    fs.mkdirSync(dir, {recursive: true});
    const txt = `${dir}/u62g4-notes.txt`;
    const fake = `${dir}/u62g4-notes.tar.gz`;
    fs.writeFileSync(txt, 'Notes for the editorial team.\nNot a plugin.\n');
    fs.copyFileSync(txt, fake);
    const nover = buildNoVersion(dir, 'u62g4nover');

    const gitStatus = () => execFileSync('git', ['-C', app.root, 'status', '--short', '--', 'plugins', 'lib/pkp/plugins'], {encoding: 'utf8'}).trim();
    const facts = {app: app.name, mode: MODE, run: process.env.PROBE_RUN || null, pluginsBefore: gitStatus(), uploads: []};
    const log = serverLog(app);

    const {page, close} = await launch(app);
    try {
        await signIn(page, 'admin');
        const site = new WebsitePluginsPage(page, app.contextPath);
        await site.goto();
        facts.listUrl = page.url();

        const upload = async (label, file) => {
            const o = {label, file: file.split('/').pop()};
            const from = log.mark();
            try {
                const win = await site.list.openUpload();
                await win.chooseFile(file);
                o.buttonAfterChoose = (await win.changeButton.isVisible()) ? 'Change File' : 'Upload File';
                await markNotices(page);
                const res = await win.save();
                o.saveStatus = res.status();
                o.saveBody = flat(await res.text().catch(() => null)).slice(0, 400);
                const fresh = notices(page, undefined, {fresh: true});
                await fresh.first().waitFor({timeout: 15_000}).catch(() => {});
                o.notices = (await fresh.allInnerTexts()).map(flat);
                o.windowOpen = (await win.dialog.count()) > 0;
                const s = await screen(page);
                o.screenNotices = s.notices;
                await shot(page, `a10-${label}`);
                if (o.windowOpen) {
                    await win.cancelLink.click().catch(() => {});
                }
            } catch (e) {
                o.error = flat(e.message).slice(0, 400);
                await shot(page, `a10-${label}-error`).catch(() => {});
            }
            o.serverLog = log.since(from);
            facts.uploads.push(o);
            await page.evaluate(() => new Promise((r) => setTimeout(r, 600)));
            await site.goto();
        };

        if (MODE === 'walk') {
            await upload('txt', txt);
            await upload('fake-targz', fake);
        } else {
            await upload('nover', nover);
        }
    } finally {
        facts.pluginsAfter = gitStatus();
        record(`a10-${MODE}`, facts);
        await close();
    }
});
