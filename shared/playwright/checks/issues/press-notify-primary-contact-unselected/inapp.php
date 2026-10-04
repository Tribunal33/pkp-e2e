<?php
// Runs one step inside an app checkout's code, under the install's own config
// (PKP_CONFIG_FILE). Used by walk.js MODE=neighbour; run from the app root:
//   php <this file> migrate   the proposed I6272_AddCopySubmissionAckPrimaryContactSetting::up() (needs the fix applied)
define('INDEX_FILE_LOCATION', getcwd() . '/index.php');
require getcwd() . '/lib/pkp/classes/cliTool/CommandLineTool.php';

$step = $argv[1] ?? '';
if ($step === 'migrate') {
    $class = 'PKP\migration\upgrade\v3_6_0\I6272_AddCopySubmissionAckPrimaryContactSetting';
    $migration = (new ReflectionClass($class))->newInstanceWithoutConstructor();
    $migration->up();
    echo "migrate: ran {$class}::up()\n";
} else {
    fwrite(STDERR, "usage: php inapp.php migrate\n");
    exit(2);
}
