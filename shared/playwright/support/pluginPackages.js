// @ts-check
/**
 * @file shared/playwright/support/pluginPackages.js
 *
 * Plugin packages a U62 "Plugins management" test uploads through "Upload A
 * New Plugin" and a row's "Upgrade" (docs/specs/U62-plugins-management.md,
 * footnote sc), built at run time into a folder of the test's own. Ported
 * from the claim check's package builder
 * (shared/playwright/checks/U62/K2/pkg.js); tests never import the kit.
 *
 * Only a package built here is ever installed, upgraded or deleted. Every
 * plugin carries a product name of the test's own (a run tag in it), so a
 * rerun on the same database never meets a version record an earlier run
 * left (spec A5: the installation keeps a plugin's recorded version).
 *
 * The code is the same for the three apps: a plugin lives in the app's
 * `APP\plugins\<category>\<product>` namespace on every app, and the app's
 * installer copies an accepted package to `plugins/<category>/<product>`
 * under the app root, which `removePluginFolders` clears in a suite's
 * teardown.
 */
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');

/** The class each category's plugin extends, and its namespace segment. */
const CATEGORIES = {
    generic: {base: 'PKP\\plugins\\GenericPlugin', type: 'plugins.generic'},
    blocks: {base: 'PKP\\plugins\\BlockPlugin', type: 'plugins.blocks'},
};

function versionXml({product, version, className, type}) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE version SYSTEM "../../../lib/pkp/dtd/pluginVersion.dtd">
<version>
	<application>${product}</application>
	<type>${type}</type>
	<release>${version}</release>
	<date>2026-09-27</date>
	<lazy-load>1</lazy-load>
	<class>${className}</class>
</version>
`;
}

function pluginPhp({product, className, category, displayName, description, enabled}) {
    const {base} = CATEGORIES[category];
    const on = enabled
        ? `
    public function getEnabled($contextId = null)
    {
        return true;
    }
`
        : '';
    return `<?php
namespace APP\\plugins\\${category}\\${product};

use ${base};

class ${className} extends ${base.split('\\').pop()}
{
    public function register($category, $path, $mainContextId = null): bool
    {
        return parent::register($category, $path, $mainContextId);
    }

    public function getDisplayName()
    {
        return '${displayName}';
    }

    public function getDescription()
    {
        return '${description}';
    }
${on}}
`;
}

function indexPhp({product, className, category}) {
    return `<?php
require_once __DIR__ . '/${className}.php';
return new \\APP\\plugins\\${category}\\${product}\\${className}();
`;
}

function writeTree(root, files) {
    for (const [rel, body] of Object.entries(files)) {
        const file = path.join(root, rel);
        fs.mkdirSync(path.dirname(file), {recursive: true});
        fs.writeFileSync(file, body);
    }
}

/** `tar -czf out -C dir entries…`, without macOS metadata files. */
function tgz(out, dir, entries) {
    execFileSync('tar', ['--format', 'ustar', '-czf', out, '-C', dir, ...entries], {
        env: {...process.env, COPYFILE_DISABLE: '1'},
    });
    return out;
}

/**
 * A plugin's names from its product name: the class (`U62testk3f9qaPlugin`)
 * and the row id the Plugins list gives it (the class name in lower case).
 *
 * @param {string} product lower-case letters and digits
 */
function pluginNames(product) {
    const className = `${product.charAt(0).toUpperCase()}${product.slice(1)}Plugin`;
    return {product, className, id: className.toLowerCase()};
}

/**
 * Build one plugin package and return its path.
 *
 * @param {string} outDir the test's own folder
 * @param {{
 *   product: string,
 *   version: string,
 *   displayName: string,
 *   description?: string,
 *   category?: 'generic'|'blocks',
 *   enabled?: boolean,
 *   atRoot?: boolean,
 * }} spec `enabled`: the plugin answers "on" by its own code (it arrives
 *   switched on); `atRoot`: the files sit at the archive's root, no folder
 */
function buildPlugin(outDir, spec) {
    const {product, version, displayName, category = 'generic', enabled = false, atRoot = false} = spec;
    const description = spec.description || `A scratch plugin of the U62 tests, version ${version}.`;
    const {className} = pluginNames(product);
    const {type} = CATEGORIES[category];
    const src = path.join(outDir, `src-${product}-${version}${atRoot ? '-root' : ''}`);
    fs.rmSync(src, {recursive: true, force: true});
    const prefix = atRoot ? '' : `${product}/`;
    writeTree(src, {
        [`${prefix}version.xml`]: versionXml({product, version, className, type}),
        [`${prefix}${className}.php`]: pluginPhp({product, className, category, displayName, description, enabled}),
        [`${prefix}index.php`]: indexPhp({product, className, category}),
    });
    const entries = atRoot ? ['version.xml', `${className}.php`, 'index.php'] : [product];
    return tgz(path.join(outDir, `${product}-${version}${atRoot ? '-root' : ''}.tar.gz`), src, entries);
}

/**
 * An archive holding one folder with no "version.xml".
 *
 * @param {string} outDir
 * @param {string} folder
 */
function buildNoVersion(outDir, folder) {
    const src = path.join(outDir, `src-${folder}`);
    fs.rmSync(src, {recursive: true, force: true});
    writeTree(src, {[`${folder}/README.txt`]: 'No version.xml here.\n', [`${folder}/index.php`]: '<?php\n'});
    return tgz(path.join(outDir, `${folder}.tar.gz`), src, [folder]);
}

/**
 * An archive whose "version.xml" names no plugin (its type is not
 * `plugins.<category>`).
 *
 * @param {string} outDir
 * @param {string} folder
 */
function buildNotAPlugin(outDir, folder) {
    const src = path.join(outDir, `src-${folder}`);
    fs.rmSync(src, {recursive: true, force: true});
    const {className} = pluginNames(folder);
    writeTree(src, {[`${folder}/version.xml`]: versionXml({product: folder, version: '1.0.0.0', className, type: `core.${folder}`})});
    return tgz(path.join(outDir, `${folder}.tar.gz`), src, [folder]);
}

/**
 * The plugin folders a package of these products would have created under
 * the app root (`plugins/<category>/<product>`, and the same under
 * `lib/pkp`) that are there now.
 *
 * @param {string} appRoot
 * @param {string[]} products
 */
function pluginFolders(appRoot, products) {
    const found = [];
    for (const base of [appRoot, path.join(appRoot, 'lib', 'pkp')]) {
        for (const category of Object.keys(CATEGORIES)) {
            for (const product of products) {
                const dir = path.join(base, 'plugins', category, product);
                if (fs.existsSync(dir)) {
                    found.push(dir);
                }
            }
        }
    }
    return found;
}

/**
 * Remove every folder `pluginFolders` finds; returns what was removed.
 *
 * @param {string} appRoot
 * @param {string[]} products
 */
function removePluginFolders(appRoot, products) {
    const found = pluginFolders(appRoot, products);
    for (const dir of found) {
        fs.rmSync(dir, {recursive: true, force: true});
    }
    return found;
}

module.exports = {pluginNames, buildPlugin, buildNoVersion, buildNotAPlugin, pluginFolders, removePluginFolders};
