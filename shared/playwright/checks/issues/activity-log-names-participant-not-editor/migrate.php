<?php
// Runs fix.diff's upgrade migration on one install, as `php tools/upgrade.php
// upgrade` would once it is registered in the app's dbscripts/xml/upgrade.xml.
// Usage (with fix.diff applied): [PKP_CONFIG_FILE=<config file>] php migrate.php <app root>
$root = realpath($argv[1] ?? '.');
require $root . '/tools/bootstrap.php';
$installer = (new ReflectionClass(\PKP\install\Installer::class))->newInstanceWithoutConstructor();
(new \PKP\migration\upgrade\v3_6_0\IXXXXX_EventLogParticipantName($installer, []))->up();
echo "migrated\n";
