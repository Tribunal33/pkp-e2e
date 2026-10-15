<?php
/**
 * Kept check of the PR review of pkp/pkp-lib#13537: gives every publication of a submission the
 * references native.sh exports (one per line on stdin), stored the way the publication's References box
 * stores them (`importCitations()`), so the native export carries them in `<citations>`.
 * Run from the app root:
 *   PKP_CONFIG_FILE=$PWD/<fleet config> php <this file> <submission id> < references.txt
 */
define('INDEX_FILE_LOCATION', getcwd() . '/index.php');
require getcwd() . '/lib/pkp/classes/cliTool/CommandLineTool.php';

use APP\facades\Repo;

class CiteSubmission extends \PKP\cliTool\CommandLineTool
{
    public function execute(): void
    {
        $raw = stream_get_contents(STDIN);
        $submission = Repo::submission()->get((int) $this->argv[0]);
        foreach ($submission->getData('publications') as $publication) {
            Repo::citation()->importCitations($publication, $raw);
            echo "publication {$publication->getId()}: " . Repo::citation()->getByPublicationIds([$publication->getId()])->count() . " references\n";
        }
    }
}

(new CiteSubmission($argv ?? []))->execute();
