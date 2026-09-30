<?php

// Nothing below may run over the web: refuse any non-CLI SAPI before the
// first side effect.
if (PHP_SAPI !== 'cli') {
    exit('This script can only be executed from the command-line');
}

/**
 * @file tools/installTest.php (stable-3_3_0 line)
 *
 * Copyright (c) 2026 Simon Fraser University
 * Copyright (c) 2026 John Willinsky
 * Distributed under the GNU GPL v3. For full terms see the file docs/COPYING.
 *
 * @brief Non-interactive schema install for a 3.3 test fleet: the `main`
 * overlay's tools/installTest.php in 3.3's shape (import(), .inc.php
 * bootstrap, the Capsule connection PKPInstall::preInstall() sets up, en_US
 * locales). Every parameter comes from the config file named by
 * PKP_CONFIG_FILE; self-healing:
 * - empty DB → full install;
 * - partial debris (tables but no current version row) → refused with a
 *   hint to reset (3.3's Capsule connection cannot list its tables);
 * - installed DB (current version row present) → no-op, exit 0.
 * Refuses any database whose name does not contain "test".
 * Mounted by `PKP_E2E_LINE=stable-3_3_0 npm run mount` (harness.md "The
 * stable lines"); the same file serves OJS, OMP and OPS.
 */

$configFile = getenv('PKP_CONFIG_FILE') ?: dirname(__DIR__) . '/config.test.inc.php';
if (!is_readable($configFile)) {
    fwrite(STDERR, "installTest: config file not readable: {$configFile}\n");
    exit(1);
}
$tmpConfig = tempnam(sys_get_temp_dir(), 'pkp-test-install-');
file_put_contents(
    $tmpConfig,
    preg_replace('/^(\s*installed\s*=\s*)On\b/mi', '${1}Off', file_get_contents($configFile))
);
register_shutdown_function(function () use ($tmpConfig) {
    @unlink($tmpConfig);
});
putenv("PKP_CONFIG_FILE={$tmpConfig}");

require(dirname(__FILE__) . '/bootstrap.inc.php');

import('lib.pkp.classes.cliTool.InstallTool');

use Illuminate\Database\Capsule\Manager as Capsule;

class TestInstallTool extends InstallTool
{
    public function execute()
    {
        $dbName = (string) Config::getVar('database', 'name');
        if (!$dbName || stripos($dbName, 'test') === false) {
            fwrite(STDERR, "installTest: database \"{$dbName}\" does not look like a test DB (no \"test\" in the name) — refusing.\n");
            exit(1);
        }

        $locale = Config::getVar('i18n', 'locale', 'en_US');
        $installedLocales = array_values(array_filter(array_map(
            'trim',
            explode(',', (string) Config::getVar('i18n', 'installed_locales', $locale))
        )));

        $this->params = [
            'locale' => $locale,
            'additionalLocales' => array_values(array_diff($installedLocales, [$locale])),
            'clientCharset' => 'utf-8',
            'connectionCharset' => 'utf8',
            'filesDir' => Config::getVar('files', 'files_dir'),
            'adminUsername' => 'admin',
            'adminPassword' => 'admin',
            'adminPassword2' => 'admin',
            'adminEmail' => 'admin@mail.test',
            'databaseDriver' => Config::getVar('database', 'driver'),
            'databaseHost' => Config::getVar('database', 'host'),
            'databaseUsername' => Config::getVar('database', 'username'),
            'databasePassword' => Config::getVar('database', 'password', ''),
            'databaseName' => $dbName,
            'oaiRepositoryId' => 'test',
            'enableBeacon' => false,
            'install' => true,
        ];

        // What the stock tools/install.php loads before it installs
        // (InstallTool::readParams()): without the schema service's
        // constants OMP's install fatals on SCHEMA_EMAIL_TEMPLATE.
        AppLocale::requireComponents(LOCALE_COMPONENT_PKP_INSTALLER, LOCALE_COMPONENT_APP_COMMON, LOCALE_COMPONENT_PKP_USER);
        new InstallForm(null);
        import('lib.pkp.classes.services.PKPSchemaService');

        $probeInstaller = new Install($this->params);
        $probeInstaller->preInstall();
        $schemaBuilder = Capsule::schema();

        if ($schemaBuilder->hasTable('versions')) {
            if (Capsule::table('versions')->where('current', 1)->count() > 0) {
                printf("installTest: schema already installed — nothing to do.\n");
                return;
            }
        }

        // Laravel's getAllTables()/dropAllTables() on 3.3's Capsule connection
        // (no `schema` key) see no tables, so debris cannot be dropped here:
        // name it and leave the emptying to reset.js.
        foreach (['versions', 'site', 'users', 'plugin_settings'] as $table) {
            if ($schemaBuilder->hasTable($table)) {
                fwrite(STDERR, "installTest: partial install debris found (table {$table}, no current version row) — empty the database with npm run reset:<app> first.\n");
                exit(1);
            }
        }

        printf("installTest: installing schema into a fresh database…\n");
        $this->install();

        if (!$schemaBuilder->hasTable('versions') || Capsule::table('versions')->where('current', 1)->count() === 0) {
            fwrite(STDERR, "installTest: install did not complete (no current version row).\n");
            exit(1);
        }
    }
}

$tool = new TestInstallTool(isset($argv) ? $argv : []);
$tool->execute();
