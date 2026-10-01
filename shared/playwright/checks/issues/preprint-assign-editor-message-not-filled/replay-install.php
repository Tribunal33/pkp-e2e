<?php

// U35 OPS2: replays the install step that reads registry/taskTemplates.xml, for every context of the
// install named by PKP_CONFIG_FILE, so that a changed registry row shows on an install already made.
// It is the call the "Install Locale" form makes (InstallLanguageForm::execute()), for the site's locales:
// a template found by its key keeps its row and takes the texts the registry now names.
//
//   cd <app root> && PKP_CONFIG_FILE=<config> php <this file>

use PKP\facades\Repo;

require(getcwd() . '/tools/bootstrap.php');

$site = \PKP\db\DAORegistry::getDAO('SiteDAO')->getSite();
$ok = Repo::editorialTask()->installTaskTemplates(addedLocales: $site->getSupportedLocales());
echo $ok ? "task templates installed\n" : "nothing installed\n";
