<?php
/**
 * Kept check of the PR review of pkp/pkp-lib#13537 (issue pkp/pkp-lib#13536), 2026-10-15: references
 * stored without their identifiers, as an import or migration before the PR leaves them, for
 * `citationLookup.php extract` to find. In the first context, on the two lowest publications that are
 * not the walk's (argv[1], the submission of paths.js), three references each through
 * `importCitations($publication, $raw, false)`; their identifier settings are then deleted (the head
 * extracts at insert, the base only the DOI with the lookup off). The first publication's references
 * stay NOT_PROCESSED (0), the second's lose their status (references from before the lookup). The
 * first publication gets two controls `extract` must leave alone: one reference set PROCESSED (5) and
 * one QUEUED (-2), both without identifiers. Prints JSON: per publication its reference IDs.
 * Run from the app root:
 *   PKP_CONFIG_FILE=$PWD/<fleet config> php <this file> <walk submission id>
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
        $walkSubmission = (int) ($this->argv[0] ?? 0);
        $context = Application::getContextDAO()->getAll()->next();
        $rows = DB::table('publications AS p')
            ->join('submissions AS s', 's.submission_id', '=', 'p.submission_id')
            ->where('s.context_id', $context->getId())
            ->where('p.submission_id', '<>', $walkSubmission)
            ->orderBy('p.publication_id')
            ->limit(2)
            ->get(['p.publication_id', 'p.submission_id']);
        $out = ['context' => $context->getPath(), 'contextId' => $context->getId(), 'publications' => []];
        foreach ($rows as $i => $row) {
            $publication = Repo::publication()->get($row->publication_id);
            $p = $row->publication_id;
            $raw = "pr13537s Mu, M. Study {$p}m. Journal of Tests. 2020;1:1-2. https://doi.org/10.1234/pr13537s.{$p} https://example.org/m{$p}\n"
                . "pr13537s Nu, N. Study {$p}n. Preprint. 2021. arXiv:2103.0{$p}001\n"
                . "pr13537s Xi, X. Study {$p}x. Test Press; 2021.";
            if ($i === 0) {
                $raw .= "\npr13537s Omicron, O. Study {$p}o. 2019. https://doi.org/10.1234/pr13537s.o{$p}"
                    . "\npr13537s Pi, P. Study {$p}p. 2018. https://doi.org/10.1234/pr13537s.p{$p}";
            }
            Repo::citation()->importCitations($publication, $raw, false);
            $ids = DB::table('citations')->where('publication_id', $p)->where('raw_citation', 'like', 'pr13537s %')->orderBy('seq')->pluck('citation_id')->all();
            DB::table('citation_settings')->whereIn('citation_id', $ids)->whereIn('setting_name', ['doi', 'arxiv', 'handle', 'url', 'urn'])->delete();
            if ($i === 0) {
                [$processed, $queued] = array_slice($ids, 3, 2);
                DB::table('citation_settings')->where('citation_id', $processed)->where('setting_name', 'processingStatus')->update(['setting_value' => '5']);
                DB::table('citation_settings')->where('citation_id', $queued)->where('setting_name', 'processingStatus')->update(['setting_value' => '-2']);
            } else {
                DB::table('citation_settings')->whereIn('citation_id', $ids)->where('setting_name', 'processingStatus')->delete();
            }
            $out['publications'][$p] = ['submission' => $row->submission_id, 'citations' => $ids];
        }
        echo json_encode($out, JSON_PRETTY_PRINT) . "\n";
    }
}

(new SeedCitations($argv ?? []))->execute();
