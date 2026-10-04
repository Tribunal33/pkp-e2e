// Helpers of walk.js (issue report docs/issues/U67-A3-pn-tab-asks-to-install-installed-plugin.md).
// Requiring this file runs nothing.
//
// The walk needs the PKP|PN plugin installed, which no test install carries and the walk may not add
// to the app's own folders. So the plugin's release (pkp/pln tag v4_0_1-0, the Plugin Gallery's
// release for OJS 3.5) is cloned into .reports/issues/pln-v4_0_1-0, the dataset fleet's server is
// restarted with rig/prepend.php prepended (an autoloader for APP\plugins\generic\pln), the install
// is the installer's own lib/pkp/tools/installPluginVersion.php, and enabling or disabling it for the
// journal is rig/state.php (what LazyLoadPlugin::setEnabled() writes). The Settings pages are then
// read through the screens.
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {REPO_ROOT} = require('../../../../../bin/apps.js');
const {idle, screen} = require('../../../probe');

const RIG = path.join(__dirname, 'rig');
const PREPEND = path.join(RIG, 'prepend.php');
const PLN_TAG = 'v4_0_1-0';
const PLN_DIR = path.join(REPO_ROOT, '.reports', 'issues', `pln-${PLN_TAG}`);
const INI_DIR = path.join(REPO_ROOT, '.reports', 'issues', 'pln-rig-php.d');

const flat = (s) => (s == null ? s : String(s).replace(/\s+/g, ' ').trim());

/** Run a step and record its outcome instead of throwing (a fix may change what the screen offers). */
async function step(fn) {
    try {
        return {ok: true, value: await fn()};
    } catch (e) {
        return {ok: false, error: flat(e.message).slice(0, 400)};
    }
}

/** The plugin's release, cloned once outside the app checkout. */
function ensurePln() {
    if (!fs.existsSync(path.join(PLN_DIR, 'PlnPlugin.php'))) {
        execFileSync('git', ['clone', '-q', '--depth', '1', '--branch', PLN_TAG, 'https://github.com/pkp/pln.git', PLN_DIR], {stdio: 'inherit'});
    }
    return PLN_DIR;
}

/**
 * Restart the dataset fleet's server, with the plugin's autoloader prepended (`withPln`) or plain.
 * The server serves the same checkout, config and database either way.
 */
function serveWithPln(app, withPln) {
    const env = {...process.env};
    if (withPln) {
        ensurePln();
        fs.mkdirSync(INI_DIR, {recursive: true});
        fs.writeFileSync(path.join(INI_DIR, 'pln-rig.ini'), `auto_prepend_file="${PREPEND}"\n`);
        env.PHP_INI_SCAN_DIR = `:${INI_DIR}`;
    } else {
        delete env.PHP_INI_SCAN_DIR;
    }
    const args = (action) => ['bin/probe-servers.js', `--${action}`, '--app', app.name, '--dataset', String(app.dataset)];
    const out = [];
    out.push(execFileSync('node', args('stop'), {cwd: REPO_ROOT, env, encoding: 'utf8'}));
    out.push(execFileSync('node', args('start'), {cwd: REPO_ROOT, env, encoding: 'utf8'}));
    return flat(out.join(' '));
}

function php(app, args) {
    return execFileSync('php', ['-d', `auto_prepend_file=${PREPEND}`, ...args], {
        cwd: app.root,
        env: {...process.env, PKP_CONFIG_FILE: path.resolve(REPO_ROOT, app.configFile)},
        encoding: 'utf8',
        timeout: 120_000,
    });
}

/** The site administrator's install of the plugin, as the installer does it (versions row, install migration). */
function installPln(app) {
    ensurePln();
    return flat(php(app, ['lib/pkp/tools/installPluginVersion.php', path.join(PLN_DIR, 'version.xml')]));
}

/** Enable or disable the plugin for "publicknowledge" (or only `inspect`); returns what the registry holds then. */
function plnState(app, action) {
    const out = php(app, [path.join(RIG, 'state.php'), action]);
    const line = out.trim().split('\n').pop();
    try {
        return JSON.parse(line);
    } catch {
        return {raw: flat(out).slice(0, 600)};
    }
}

/** Settings › Distribution › "Archiving" › "PKP Preservation Network (PN)": what the panel shows and offers. */
async function readPnTab(page, app) {
    const {ArchivingSettings} = require('../../../pages/ArchivingPages.js');
    const s = new ArchivingSettings(page, app.contextPath);
    await s.open();
    await idle(page);
    const panel = s.pnPanel();
    const box = panel.getByRole('checkbox');
    const boxes = await box.count();
    return {
        url: page.url(),
        sideTabs: await s.sideTabNames(),
        text: flat(await panel.innerText()),
        askToInstall: /ask your administrator to install the PKP\|PN Plugin/.test(await panel.innerText()),
        box: boxes ? {count: boxes, label: flat(await panel.locator('label').first().innerText()), checked: await box.first().isChecked()} : null,
        buttons: (await panel.getByRole('button').allInnerTexts()).map(flat),
        screen: await screen(page),
    };
}

module.exports = {flat, step, ensurePln, serveWithPln, installPln, plnState, readPnTab, PLN_TAG};
