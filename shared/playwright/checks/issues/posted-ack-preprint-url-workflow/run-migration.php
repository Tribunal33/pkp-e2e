<?php
// Fix trial for fix.diff: run the amended migration's up() on an install already at the
// current version (tools/upgrade.php would skip it). With the diff applied, from the app root:
//   PKP_CONFIG_FILE=<the install's config> php <path to>/run-migration.php $PWD
require $argv[1] . '/tools/bootstrap.php';

class RunMig extends \PKP\cliTool\CommandLineTool
{
    public function execute()
    {
        $class = \APP\migration\upgrade\v3_5_0\I13128_FixEmailUrlLinks::class;
        $m = (new \ReflectionClass($class))->newInstanceWithoutConstructor();
        $m->up();
        echo "migration up: ok\n";
    }
}
(new RunMig(['run-migration.php']))->execute();
