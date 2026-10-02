<?php
// Fix trial for fix-signature.diff: run the proposed migration's up() on an install already at
// the current version (tools/upgrade.php would skip it). With the diff applied, from the app root:
//   php ../path/to/run-migration.php $PWD   (PKP_CONFIG_FILE names the install's config, if not config.inc.php)
require $argv[1] . '/tools/bootstrap.php';

class RunMig extends \PKP\cliTool\CommandLineTool
{
    public function execute()
    {
        $class = \APP\migration\upgrade\v3_5_0\I00000_PostedAckContextSignature::class;
        $m = (new \ReflectionClass($class))->newInstanceWithoutConstructor();
        $m->up();
        echo "migration up: ok\n";
    }
}
(new RunMig(['run-migration.php']))->execute();
