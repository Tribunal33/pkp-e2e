<?php
// PR review of pkp/ojs#5935 (pkp-lib#13519, U45 OJS2): the DataCite records "Export DOIs" would carry for an issue
// and an article, built with the DataCite export plugin's own exportXML() and validation off (the fleets answer
// the export with the schema 400: the XSD fetch goes to the dead [proxy]), then checked against DataCite's kernel-4
// schema from a local copy. Run after walk.js steps 1-6 (DataCite on, "Issues" ticked, both DOIs assigned).
// Prints one JSON line: per object, the exception or the record's identifier, its funding references count,
// schemaValid and the first libxml errors; with --xml, each record's XML. With --funder, the article is given one
// funder with a grant inside a transaction that is rolled back (the dataset has none), so its record shows the
// funding references the PR's guard must leave alone. Writes nothing.
// Local schema: metadata.xsd and include/*.xsd of https://schema.datacite.org/meta/kernel-4/ in one directory.
// Usage: PKP_CONFIG_FILE=<fleet config> php schema-read.php <app root> <contextPath> <xsd dir> <issueId> <submissionId> [--xml] [--funder]
$root = $argv[1];
define('INDEX_FILE_LOCATION', $root . '/index.php');
chdir($root);
require $root . '/lib/pkp/classes/cliTool/CommandLineTool.php';

use APP\core\Application;
use APP\facades\Repo;
use Illuminate\Support\Facades\DB;
use PKP\plugins\PluginRegistry;

class Ojs5935SchemaRead extends \PKP\cliTool\CommandLineTool
{
    public function execute()
    {
        [$path, $xsdDir, $issueId, $submissionId] = array_slice($this->argv, 0, 4);
        $withXml = in_array('--xml', $this->argv);
        $withFunder = in_array('--funder', $this->argv);
        if ($withFunder) {
            DB::beginTransaction();
            $funderId = DB::table('funders')->insertGetId(['submission_id' => (int) $submissionId, 'ror' => null, 'seq' => 0], 'funder_id');
            DB::table('funder_settings')->insert([
                ['funder_id' => $funderId, 'locale' => 'en', 'setting_name' => 'name', 'setting_value' => 'Review Test Foundation'],
                ['funder_id' => $funderId, 'locale' => '', 'setting_name' => 'grants', 'setting_value' => json_encode([['grantNumber' => 'G-5935']])],
            ]);
        }
        $context = Application::getContextDAO()->getByPath($path);
        PluginRegistry::loadCategory('generic', true, $context->getId());
        PluginRegistry::loadCategory('importexport', true, $context->getId());
        $agency = $context->getConfiguredDoiAgency();
        $m = new \ReflectionMethod($agency, '_getExportPlugin');
        $m->setAccessible(true);
        $plugin = $m->invoke($agency);
        $objects = [
            'issue ' . $issueId => [Repo::issue()->get((int) $issueId), $plugin->getIssueFilter()],
            'article ' . $submissionId => [Repo::submission()->get((int) $submissionId), $plugin->getSubmissionFilter()],
        ];
        $out = ['agency' => get_class($agency), 'funderAdded' => $withFunder, 'objects' => []];
        foreach ($objects as $label => [$object, $filter]) {
            try {
                $errs = [];
                $xml = $plugin->exportXML($object, $filter, $context, true, $errs);
                $dom = new DOMDocument();
                $dom->loadXML($xml);
                libxml_use_internal_errors(true);
                libxml_clear_errors();
                $valid = $dom->schemaValidate($xsdDir . '/metadata.xsd');
                $schemaErrors = array_map(fn ($e) => trim($e->message) . ' (line ' . $e->line . ')', array_slice(libxml_get_errors(), 0, 5));
                preg_match('#<identifier[^>]*>([^<]*)</identifier>#', $xml, $ident);
                preg_match('#<resourceType\b[^>]*>[^<]*</resourceType>#', $xml, $type);
                $out['objects'][$label] = ['identifier' => $ident[1] ?? null, 'resourceType' => $type[0] ?? null,
                    'fundingReferences' => substr_count($xml, '<fundingReference>'), 'bytes' => strlen($xml),
                    'schemaValid' => $valid, 'schemaErrors' => $schemaErrors] + ($withXml ? ['xml' => $xml] : []);
            } catch (\Throwable $e) {
                $out['objects'][$label] = ['exception' => get_class($e) . ': ' . substr($e->getMessage(), 0, 400), 'at' => basename($e->getFile()) . ':' . $e->getLine()];
            }
        }
        if ($withFunder) {
            DB::rollBack();
        }
        echo json_encode($out, JSON_UNESCAPED_SLASHES), "\n";
    }
}

$tool = new Ojs5935SchemaRead(array_merge([$argv[0]], array_slice($argv, 2)));
$tool->execute();
