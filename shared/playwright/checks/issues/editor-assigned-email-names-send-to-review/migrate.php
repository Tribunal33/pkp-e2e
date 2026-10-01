<?php
// Runs fix.diff's upgrade migration on one OJS install, as `php tools/upgrade.php
// upgrade` does once it is registered in dbscripts/xml/upgrade.xml (fix.diff
// registers it in the 3.6.0.0 block). Usage, with fix.diff applied:
//   PKP_CONFIG_FILE=<config file> php migrate.php <ojs root>
$root = realpath($argv[1] ?? '.');
require $root . '/tools/bootstrap.php';
$installer = (new ReflectionClass(\PKP\install\Installer::class))->newInstanceWithoutConstructor();
(new \APP\migration\upgrade\v3_6_0\EditorAssignSendForReview($installer, []))->up();
echo "migrated\n";
