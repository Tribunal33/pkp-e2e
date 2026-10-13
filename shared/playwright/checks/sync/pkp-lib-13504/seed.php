<?php
/**
 * Kept check of the PR review of pkp/pkp-lib#13504 (issue pkp/pkp-lib#13503), 2026-10-13: the
 * state the issue's migration leaves behind. With the context's metadata lookup off (as PKP's
 * default dataset arrives), every publication of the context gets three references the way an
 * import with `citation-metadata-lookup` off stores them (`importCitations($publication, $raw, false)`):
 * NOT_PROCESSED, the DOI taken from the text. The references of the oldest submission's
 * publications then lose their status setting, like references stored before the lookup existed.
 * Prints JSON: per publication its submission and reference IDs. Run from the app root:
 *   PKP_CONFIG_FILE=$PWD/<fleet config> php <this file>
 */
define('INDEX_FILE_LOCATION', getcwd() . '/index.php');
require getcwd() . '/lib/pkp/classes/cliTool/CommandLineTool.php';

use APP\core\Application;
use APP\facades\Repo;
use Illuminate\Support\Facades\DB;

class SeedCitations extends \PKP\cliTool\CommandLineTool
{
    public function execute(): void
    {
        $context = Application::getContextDAO()->getAll()->next();
        if ($context->getData('citationsMetadataLookup')) {
            echo "Error: lookup is on in {$context->getPath()}; seed with it off.\n";
            exit(1);
        }
        $rows = DB::table('publications AS p')
            ->join('submissions AS s', 's.submission_id', '=', 'p.submission_id')
            ->where('s.context_id', $context->getId())
            ->orderBy('p.publication_id')
            ->get(['p.publication_id', 'p.submission_id']);
        $out = ['context' => $context->getPath(), 'contextId' => $context->getId(), 'publications' => []];
        foreach ($rows as $row) {
            $publication = Repo::publication()->get($row->publication_id);
            $p = $row->publication_id;
            $raw = "pr13504 Alpha, A. Study {$p}a. Journal of Tests. 2020;1:1-2. https://doi.org/10.1234/pr13504.{$p}\n"
                . "pr13504 Beta, B. Study {$p}b. Test Press; 2021.\n"
                . "pr13504 Gamma, G. Study {$p}c. Journal of Tests. 2022;3:5-6.";
            Repo::citation()->importCitations($publication, $raw, false);
            $out['publications'][$p] = [
                'submission' => $row->submission_id,
                'citations' => DB::table('citations')->where('publication_id', $p)->orderBy('seq')->pluck('citation_id')->all(),
            ];
        }
        $oldest = $rows->min('submission_id');
        $noStatus = DB::table('citations AS c')->join('publications AS p', 'p.publication_id', '=', 'c.publication_id')
            ->where('p.submission_id', $oldest)->pluck('c.citation_id')->all();
        DB::table('citation_settings')->whereIn('citation_id', $noStatus)->where('setting_name', 'processingStatus')->delete();
        $out['noStatusSubmission'] = $oldest;
        $out['noStatusCitations'] = $noStatus;
        echo json_encode($out, JSON_PRETTY_PRINT) . "\n";
    }
}

(new SeedCitations($argv ?? []))->execute();
