<?php
/**
 * Evidence beside the screens (never a step), OJS only: the <citation_list> the Crossref
 * export would put in a deposit for submission <id>'s current publication, built by the
 * plugin's own ArticleCrossrefXmlFilter::appendCitationListNode(). The DOIs page's
 * "Export DOIs" cannot run on a test install (the Crossref schema is fetched from
 * crossref.org), so this runs the one method that writes the references. Read only.
 *
 * Usage (from the app root, PKP_CONFIG_FILE set to the install's config):
 *   php <this file> <submissionId>
 */

define('INDEX_FILE_LOCATION', getcwd() . '/index.php');
require getcwd() . '/lib/pkp/classes/cliTool/CommandLineTool.php';

use APP\core\Application;
use APP\facades\Repo;
use APP\plugins\generic\crossref\CrossrefExportDeployment;
use APP\plugins\generic\crossref\CrossrefExportPlugin;
use APP\plugins\generic\crossref\CrossrefPlugin;
use PKP\db\DAORegistry;

class CitationListRead extends \PKP\cliTool\CommandLineTool
{
    public function execute()
    {
        $submissionId = (int) ($this->argv[0] ?? 0);
        $submission = Repo::submission()->get($submissionId);
        if (!$submission) {
            echo "no submission {$submissionId}\n";
            return;
        }
        $publication = Repo::publication()->get($submission->getData('currentPublicationId'));
        $context = Application::getContextDAO()->getById($submission->getData('contextId'));
        $plugin = new CrossrefPlugin();
        $exportPlugin = new CrossrefExportPlugin($plugin);
        $deployment = new CrossrefExportDeployment($context, $exportPlugin);
        $filterDao = DAORegistry::getDAO('FilterDAO');
        $filters = $filterDao->getObjectsByGroup('article=>crossref-xml');
        $filter = array_shift($filters);
        $filter->setDeployment($deployment);
        $doc = new DOMDocument('1.0', 'utf-8');
        $doc->formatOutput = true;
        $article = $doc->createElementNS($deployment->getNamespace(), 'journal_article');
        $doc->appendChild($article);
        $filter->appendCitationListNode($doc, $article, $publication);
        echo $doc->saveXML($article), "\n";
    }
}

$tool = new CitationListRead($argv ?? []);
$tool->execute();
