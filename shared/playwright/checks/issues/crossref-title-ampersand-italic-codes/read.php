<?php
// Read-only helper of walk.js (issue report docs/issues/U45-A30-crossref-title-ampersand-italic-codes.md).
// "Export DOIs" downloads the file the Crossref plugin builds for the ticked works. The test installs cannot
// reach crossref.org (the server's HTTP goes to a dead proxy), so there the export stops at the schema check;
// this builds the same file with the plugin's own exportXML() and its submission filter, validation off, and
// prints one JSON line: per work, what the current version stores in "Prefix", "Title" and "Subtitle", and the
// whole Crossref XML. Writes nothing. OJS and OPS, `main` and stable-3_5_0.
// Usage: PKP_CONFIG_FILE=<the install's config> php read.php <app root> <contextPath> <submissionId>...
$root = $argv[1];
define('INDEX_FILE_LOCATION', $root . '/index.php');
chdir($root);
require $root . '/lib/pkp/classes/cliTool/CommandLineTool.php';

use APP\core\Application;
use APP\facades\Repo;
use PKP\plugins\PluginRegistry;

class A30CrossrefRead extends \PKP\cliTool\CommandLineTool
{
    public function execute()
    {
        $args = $this->argv;
        $path = array_shift($args);
        $context = Application::getContextDAO()->getByPath($path);
        PluginRegistry::loadCategory('generic', true, $context->getId());
        PluginRegistry::loadCategory('importexport', true, $context->getId());
        $plugin = PluginRegistry::getPlugin('importexport', 'CrossrefExportPlugin');
        $out = ['app' => Application::get()->getName(), 'agency' => $context->getData('registrationAgency'), 'works' => []];
        foreach (array_map('intval', $args) as $id) {
            $submission = Repo::submission()->get($id);
            $publication = $submission->getCurrentPublication();
            $work = ['stored' => [
                'prefix' => $publication->getData('prefix', 'en'),
                'title' => $publication->getData('title', 'en'),
                'subtitle' => $publication->getData('subtitle', 'en'),
            ], 'doi' => $publication->getDoi()];
            try {
                $errors = [];
                $xml = $plugin->exportXML([$submission], $plugin->getSubmissionFilter(), $context, true, $errors);
                preg_match_all('#<titles>.*?</titles>#s', $xml, $titles);
                $work['titles'] = array_map(fn ($t) => preg_replace('/\s+/', ' ', $t), $titles[0]);
                $work['xml'] = $xml;
            } catch (\Throwable $e) {
                $work['exception'] = get_class($e) . ': ' . substr($e->getMessage(), 0, 400) . ' at ' . basename($e->getFile()) . ':' . $e->getLine();
            }
            $out['works'][$id] = $work;
        }
        echo json_encode($out), "\n";
    }
}

$tool = new A30CrossrefRead(array_merge([$argv[0]], array_slice($argv, 2)));
$tool->execute();
