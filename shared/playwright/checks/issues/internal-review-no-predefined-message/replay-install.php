<?php
// U35 OMP1, trying fix-omp.diff: a registry/taskTemplates.xml change shows only on a press created
// after it, so this replays the install step a press's creation runs
// (PKPContextController::add() calls Repo::editorialTask()->installTaskTemplates($context)) on the
// default dataset's press. Run from the OMP root, under the install's config:
//   PKP_CONFIG_FILE=<config> php <this file>
require(getcwd() . '/tools/bootstrap.php');

$context = \APP\core\Application::getContextDAO()->getByPath('publicknowledge');
$done = \APP\facades\Repo::editorialTask()->installTaskTemplates($context);
echo 'installTaskTemplates: ' . var_export($done, true) . "\n";
