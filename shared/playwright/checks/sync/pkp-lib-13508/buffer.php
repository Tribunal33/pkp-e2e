<?php
// Helper of walk.js (PR review pkp/pkp-lib#13507, ojs#5928 / ops#1447): the issue's third expectation, "libxml's
// error buffer is cleared before each export". In ONE PHP process (as a queue worker running several deposit
// jobs), the Crossref export plugin's exportXML() is called for each given work in turn, each with its own
// $outputErrors array, as CrossrefExportPlugin::exportAndDeposit() calls it; prints one JSON line with, per call,
// the work id and the messages it got back (empty for a file that passes the schema). Run it with the invalid work
// first: without the clear the valid work after it inherits the invalid one's errors.
// The schema is fetched through the fleet's [proxy] (the Crossref stand-in, crossref-stub.js), so run it with the
// stand-in up and PHP_INI_SCAN_DIR set as for the server.
// Writes nothing. Usage: PKP_CONFIG_FILE=<fleet config> php buffer.php <app root> <contextPath> <submissionId>...
$root = $argv[1];
define('INDEX_FILE_LOCATION', $root . '/index.php');
chdir($root);
require $root . '/lib/pkp/classes/cliTool/CommandLineTool.php';

use APP\core\Application;
use APP\facades\Repo;
use PKP\plugins\PluginRegistry;

class BufferRead extends \PKP\cliTool\CommandLineTool
{
    public function execute()
    {
        $args = $this->argv;
        $path = array_shift($args);
        $context = Application::getContextDAO()->getByPath($path);
        PluginRegistry::loadCategory('generic', true, $context->getId());
        PluginRegistry::loadCategory('importexport', true, $context->getId());
        $export = PluginRegistry::getPlugin('importexport', 'CrossrefExportPlugin');
        $out = ['app' => Application::get()->getName(), 'calls' => []];
        foreach ($args as $id) {
            $submission = Repo::submission()->get((int) $id);
            $errors = [];
            $export->exportXML([$submission], $export->getSubmissionFilter(), $context, null, $errors);
            $out['calls'][] = ['submissionId' => (int) $id, 'errors' => array_values(array_unique(array_map(fn ($e) => trim($e->message), $errors ?? [])))];
        }
        echo json_encode($out, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), "\n";
    }
}

(new BufferRead(array_merge([$argv[0]], array_slice($argv, 2))))->execute();
