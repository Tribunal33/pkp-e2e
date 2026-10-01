<?php

// U35 OJS1: runs the fix's upgrade migration on the install named by PKP_CONFIG_FILE, as the
// upgrade would (dbscripts/xml/upgrade.xml names it), so that the repair of the stored email text
// shows on an install already made. `down` as the first argument runs its down().
//
//   cd <ojs root> && PKP_CONFIG_FILE=<config> php <this file> [down]

require(getcwd() . '/tools/bootstrap.php');

// A migration only keeps the installer it is given; building one without its constructor skips the plugin loading a CLI run has no request for.
$installer = (new ReflectionClass(\PKP\install\Installer::class))->newInstanceWithoutConstructor();
$m = new \APP\migration\upgrade\v3_6_0\EditorAssignEmailSendForReview($installer, []);
(($argv[1] ?? '') === 'down') ? $m->down() : $m->up();
echo "migration run\n";
