// U62 K2: builds the scratch plugin packages the chunk uploads, into <outDir>/pkg-<app>/.
// Only the plugins built here are ever installed, upgraded, failed or deleted; the shipped Web Feed
// plugin is only packed (read) for refusals that the code turns away before any file is copied.
//
//   u62k2test    a generic plugin, versions 1.0.0.0, 1.0.1.0 and 1.0.2.0 (the last with an upgrade.xml
//                whose one step aborts: Installer::abort, so the upgrade's own installation step fails)
//   u62k2on      a generic plugin whose getEnabled() answers true ("arrives switched on"), packed with
//                its files at the archive's root, no folder
//   webFeed      the app's own plugins/generic/webFeed folder, unchanged (same version as installed)
//   nover        a folder with no version.xml
//   badtype      a folder whose version.xml names the type "core.u62k2bad" (not a plugin)
//   plain.txt    a plain text file; fake.tar.gz the same text under an archive's name
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');

const versionXml = (product, release, cls, type = 'plugins.generic') => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE version SYSTEM "../../../lib/pkp/dtd/pluginVersion.dtd">
<version>
	<application>${product}</application>
	<type>${type}</type>
	<release>${release}</release>
	<date>2026-09-27</date>
	<lazy-load>1</lazy-load>
	<class>${cls}</class>
</version>
`;

const pluginPhp = (product, cls, display, description, extra = '') => `<?php
namespace APP\\plugins\\generic\\${product};

use PKP\\plugins\\GenericPlugin;

class ${cls} extends GenericPlugin
{
    public function register($category, $path, $mainContextId = null): bool
    {
        return parent::register($category, $path, $mainContextId);
    }

    public function getDisplayName()
    {
        return '${display}';
    }

    public function getDescription()
    {
        return '${description}';
    }
${extra}}
`;

const indexPhp = (product, cls) => `<?php
require_once __DIR__ . '/${cls}.php';
return new \\APP\\plugins\\generic\\${product}\\${cls}();
`;

function writeTree(root, files) {
    for (const [rel, body] of Object.entries(files)) {
        const f = path.join(root, rel);
        fs.mkdirSync(path.dirname(f), {recursive: true});
        fs.writeFileSync(f, body);
    }
}

/** tar -czf out -C dir entries…, without macOS metadata. */
function tgz(out, dir, entries) {
    execFileSync('tar', ['--format', 'ustar', '-czf', out, '-C', dir, ...entries], {env: {...process.env, COPYFILE_DISABLE: '1'}});
    return out;
}

function testPlugin(root, release, {failUpgrade = false} = {}) {
    const product = 'u62k2test';
    const cls = 'U62k2testPlugin';
    const files = {
        [`${product}/version.xml`]: versionXml(product, release, cls),
        [`${product}/${cls}.php`]: pluginPhp(product, cls, 'U62 K2 Test Plugin', `Scratch plugin of the U62 K2 claim check, version ${release}.`),
        [`${product}/index.php`]: indexPhp(product, cls),
    };
    if (failUpgrade) {
        files[`${product}/upgrade.xml`] = `<?xml version="1.0" encoding="UTF-8"?>
<install version="${release}">
	<code function="abort" message="U62 K2 upgrade step failed on purpose" />
</install>
`;
    }
    writeTree(root, files);
}

/** Build every package for one app; returns {name: absolute path}. */
function build(outDir, appName, appRoot) {
    const base = path.join(outDir, `pkg-${appName}`);
    fs.rmSync(base, {recursive: true, force: true});
    fs.mkdirSync(base, {recursive: true});
    const P = {};
    for (const [key, rel, opt] of [['test100', '1.0.0.0', {}], ['test101', '1.0.1.0', {}], ['test102fail', '1.0.2.0', {failUpgrade: true}]]) {
        const src = path.join(base, `src-${key}`);
        testPlugin(src, rel, opt);
        P[key] = tgz(path.join(base, `u62k2test-${rel}${opt.failUpgrade ? '-failing' : ''}.tar.gz`), src, ['u62k2test']);
    }
    // u62k2on: files at the archive root, no folder; switched on by its own code
    {
        const src = path.join(base, 'src-on');
        const product = 'u62k2on';
        const cls = 'U62k2onPlugin';
        writeTree(src, {
            'version.xml': versionXml(product, '1.0.0.0', cls),
            [`${cls}.php`]: pluginPhp(product, cls, 'U62 K2 Always On Plugin', 'Scratch plugin of the U62 K2 claim check that reports itself enabled.', `
    public function getEnabled($contextId = null)
    {
        return true;
    }
`),
            'index.php': indexPhp(product, cls),
        });
        P.onroot = tgz(path.join(base, 'u62k2on-root.tar.gz'), src, ['version.xml', `${cls}.php`, 'index.php']);
    }
    // the shipped Web Feed plugin, unchanged
    P.webfeed = tgz(path.join(base, 'webFeed.tar.gz'), path.join(appRoot, 'plugins', 'generic'), ['webFeed']);
    // a folder with no version.xml
    {
        const src = path.join(base, 'src-nover');
        writeTree(src, {'u62k2nover/README.txt': 'No version.xml here.\n', 'u62k2nover/index.php': '<?php\n'});
        P.nover = tgz(path.join(base, 'u62k2nover.tar.gz'), src, ['u62k2nover']);
    }
    // a version.xml whose type is not a plugin
    {
        const src = path.join(base, 'src-badtype');
        writeTree(src, {'u62k2bad/version.xml': versionXml('u62k2bad', '1.0.0.0', 'U62k2badPlugin', 'core.u62k2bad')});
        P.badtype = tgz(path.join(base, 'u62k2bad.tar.gz'), src, ['u62k2bad']);
    }
    P.plain = path.join(base, 'u62k2plain.txt');
    fs.writeFileSync(P.plain, 'This is a plain text file, not a plugin archive.\n');
    P.fake = path.join(base, 'u62k2fake.tar.gz');
    fs.writeFileSync(P.fake, 'This is a plain text file named like an archive.\n');
    return P;
}

module.exports = {build};
