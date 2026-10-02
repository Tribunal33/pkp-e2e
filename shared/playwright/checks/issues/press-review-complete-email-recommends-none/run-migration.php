<?php

// U28 OMP2: runs the fix's upgrade migration on the install named by PKP_CONFIG_FILE, as the
// upgrade would (dbscripts/xml/upgrade.xml names it), so that the stored default text of the
// "Review complete" email on an install already made is the fixed one.
//
//   cd <omp root> && PKP_CONFIG_FILE=<config> php <this file>

require(getcwd() . '/tools/bootstrap.php');

// A migration only keeps the installer it is given; building one without its constructor skips the plugin loading a CLI run has no request for.
$installer = (new ReflectionClass(\PKP\install\Installer::class))->newInstanceWithoutConstructor();
$m = new \APP\migration\upgrade\v3_6_0\ReviewCompleteEmailNoRecommendation($installer, []);
$m->up();
echo "migration run\n";
