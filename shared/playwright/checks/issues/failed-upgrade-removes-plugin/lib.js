// Helpers for the U62 A3 and A5 walks (issue reports U62-A3-… and U62-A5-…). Requiring this file
// runs nothing.
//
// The packages are built with shared/playwright/support/pluginPackages.js (product `u62g3test`,
// "U62g3 Test Plugin"); the failing 1.0.1.0 adds, to the package that module writes, an
// `upgrade.xml` whose one step is a migration altering a table no install has, so the upgrade's
// database step fails as a real release's migration would on an install it does not fit.
// Every walk on `main` writes the app checkout's own plugins/generic/u62g3test: the caller holds
// the session's app lock and calls `removeOurFolders()` before releasing it.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {idle, screen, shot, record} = require('../../../probe');
const PKG = require('../../../support/pluginPackages');

const PRODUCT = 'u62g3test';
const DISPLAY = 'U62g3 Test Plugin';
const {className: CLASS, id: ROW_ID} = PKG.pluginNames(PRODUCT);
const T = 30_000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const flat = (t, n = 400) => (t == null ? t : String(t).replace(/\s+/g, ' ').trim().slice(0, n));

/** `upgrade.xml` and the migration of the failing 1.0.1.0. */
function failingUpgradeFiles(version) {
    const migration = `${CLASS}UpgradeMigration`;
    return {
        'upgrade.xml': `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE install SYSTEM "../../../lib/pkp/dtd/install.dtd">
<install version="${version}">
	<migration class="APP\\plugins\\generic\\${PRODUCT}\\${migration}" />
</install>
`,
        [`${migration}.php`]: `<?php
namespace APP\\plugins\\generic\\${PRODUCT};

use Illuminate\\Database\\Migrations\\Migration;
use Illuminate\\Database\\Schema\\Blueprint;
use Illuminate\\Support\\Facades\\Schema;

class ${migration} extends Migration
{
    public function up(): void
    {
        // A table this version expects and the install does not have.
        Schema::table('${PRODUCT}_items', function (Blueprint $table) {
            $table->string('note')->nullable();
        });
    }

    public function down(): void
    {
    }
}
`,
    };
}

/**
 * The three packages, built into `<outDir>/pkg`: {v100, v101, v101fail} (absolute paths).
 *
 * @param {string} outDir the probe's output folder
 */
function buildPackages(outDir) {
    const dir = path.join(outDir, 'pkg');
    fs.mkdirSync(dir, {recursive: true});
    const spec = (version) => ({product: PRODUCT, version, displayName: DISPLAY, description: `U62g3 scratch plugin, version ${version}.`});
    const v100 = PKG.buildPlugin(dir, spec('1.0.0.0'));
    const v101 = PKG.buildPlugin(dir, spec('1.0.1.0'));
    // The failing one: the module's 1.0.1.0 tree, plus upgrade.xml and the migration, packed again.
    const src = path.join(dir, `src-${PRODUCT}-1.0.1.0`);
    const failSrc = path.join(dir, `src-${PRODUCT}-1.0.1.0-failing`);
    fs.rmSync(failSrc, {recursive: true, force: true});
    fs.cpSync(src, failSrc, {recursive: true});
    for (const [rel, body] of Object.entries(failingUpgradeFiles('1.0.1.0'))) fs.writeFileSync(path.join(failSrc, PRODUCT, rel), body);
    const v101fail = path.join(dir, `${PRODUCT}-1.0.1.0-failing.tar.gz`);
    execFileSync('tar', ['--format', 'ustar', '-czf', v101fail, '-C', failSrc, PRODUCT], {env: {...process.env, COPYFILE_DISABLE: '1'}});
    return {v100, v101, v101fail};
}

/** Our plugin folders under the app root (and lib/pkp) that exist now. */
const ourFolders = (app) => PKG.pluginFolders(path.resolve(app.root), [PRODUCT]);
/** Remove them; returns what was removed. */
const removeOurFolders = (app) => PKG.removePluginFolders(path.resolve(app.root), [PRODUCT]);
/** The version.xml release of the folder on disk, or null. */
function folderRelease(app) {
    const f = path.join(path.resolve(app.root), 'plugins', 'generic', PRODUCT, 'version.xml');
    if (!fs.existsSync(f)) return null;
    const m = fs.readFileSync(f, 'utf8').match(/<release>([^<]+)<\/release>/);
    return m ? m[1] : '?';
}

/** Our row on the list as data: present, name, box, the row's text (its description names the version). */
async function rowFacts(list) {
    const row = list.row(ROW_ID);
    if (!(await row.count())) return {present: false};
    return {
        present: true,
        name: flat(await list.rowName(ROW_ID).innerText().catch(() => null), 80),
        ticked: await list.box(ROW_ID).isChecked().catch(() => null),
        text: flat(await row.innerText().catch(() => null), 200),
    };
}

/**
 * Open a context's Settings › Website › "Plugins" (the page object's own goto); returns it.
 * Required inside forEachApp's function (page objects read PKP_APP_ROOT).
 */
async function openWebsitePlugins(page, contextPath) {
    const {WebsitePluginsPage} = require('../../../pages/PluginsPages.js');
    const w = new WebsitePluginsPage(page, contextPath);
    await w.goto();
    return w;
}

/**
 * One "Upload A New Plugin" (`via` 'upload') or row "Upgrade" (`via` 'upgrade') with `file`, "Save":
 * the save's status and answer, the fresh notices, our row after. Never throws: a step the state does
 * not allow (no row to upgrade) is recorded as such.
 */
async function sendPackage(page, list, via, file) {
    const P = require('../../../pages/PluginsPages.js');
    const o = {via, file: path.basename(file)};
    try {
        await P.markNotices(page);
        const win = via === 'upload' ? await list.openUpload() : await list.openUpgrade(ROW_ID);
        o.windowText = flat(await win.formText().catch(() => null), 300);
        await win.chooseFile(file);
        const resp = await win.save();
        o.status = resp.status();
        o.answer = flat(await resp.text().catch(() => null), 300);
        await win.dialog.waitFor({state: 'detached', timeout: T}).catch(() => {});
        await P.pastModalCloseWindow(page);
    } catch (e) {
        o.error = flat(e.message, 300);
    }
    o.notices = await freshNotices(page);
    await idle(page).catch(() => {});
    await sleep(500);
    o.rowAfter = await rowFacts(list);
    return o;
}

/** The notices shown since the last markNotices, as text (waits up to 10 s for the first). */
async function freshNotices(page, ms = 10_000) {
    const sel = '.app__notifications .pkpNotification:not([data-seen])';
    const end = Date.now() + ms;
    while (Date.now() < end && !(await page.locator(sel).count())) await sleep(150);
    await sleep(300);
    return page.locator(sel).evaluateAll((els) => els.map((e) => e.innerText.replace(/\s+/g, ' ').replace(/\s*×?\s*Close\s*$/, '').trim())).catch(() => []);
}

/** Tick our row's box; the box after and the notices. */
async function tick(page, list) {
    const P = require('../../../pages/PluginsPages.js');
    const o = {};
    try {
        await P.markNotices(page);
        const resp = await list.tick(ROW_ID);
        o.status = resp.status();
    } catch (e) {
        o.error = flat(e.message, 300);
    }
    o.notices = await freshNotices(page, 5000);
    o.rowAfter = await rowFacts(list);
    return o;
}

/** `screen()` and a PNG under one name. */
async function snap(page, name) {
    record(name, await screen(page));
    await shot(page, name).catch(() => {});
}

module.exports = {PRODUCT, DISPLAY, CLASS, ROW_ID, T, sleep, flat, buildPackages, ourFolders, removeOurFolders, folderRelease, rowFacts, openWebsitePlugins, sendPackage, freshNotices, tick, snap};
