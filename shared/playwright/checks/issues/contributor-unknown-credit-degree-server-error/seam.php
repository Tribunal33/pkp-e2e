<?php
/**
 * Code check of issue report U41 A29 (walk.js runs it): the two calls the REST API's contributor
 * edit (PKPSubmissionController::editContributor()) makes, in its order, on a stored contributor:
 * Repo::author()->validate() and, only when it returns no error, Repo::author()->edit(). No HTTP
 * request is made; the params are the ones a program's request body would carry.
 *
 * Usage, in the app root, with PKP_CONFIG_FILE set to the install's config:
 *   php <path>/seam.php <authorId> '<params as JSON>'
 * Prints one JSON line: {creditRolesTable, errors, edited, exception}.
 */
define('APP_ROOT', getcwd());
require_once APP_ROOT . '/tools/bootstrap.php';

use APP\facades\Repo;
use Illuminate\Support\Facades\Schema;

class A29Seam extends \PKP\cliTool\CommandLineTool
{
    public function execute()
    {
        $out = ['creditRolesTable' => Schema::hasTable('credit_contributor_roles')];
        $authorId = (int) ($this->argv[0] ?? 0);
        $params = json_decode($this->argv[1] ?? '{}', true) ?: [];
        $author = Repo::author()->get($authorId);
        if (!$author) {
            echo json_encode($out + ['error' => "no author {$authorId}"]) . "\n";
            return;
        }
        $publication = Repo::publication()->get($author->getData('publicationId'));
        $submission = Repo::submission()->get($publication->getData('submissionId'));
        $context = app()->get('context')->get($submission->getData('contextId'));
        $params['id'] = $author->getId();

        $out['errors'] = Repo::author()->validate($author, $params, $submission, $context);
        $out['edited'] = false;
        $out['exception'] = null;
        if (empty($out['errors'])) {
            try {
                Repo::author()->edit($author, $params);
                $out['edited'] = true;
            } catch (\Throwable $e) {
                $out['exception'] = get_class($e) . ': ' . substr(strtok($e->getMessage(), "\n"), 0, 300);
            }
        }
        echo json_encode($out) . "\n";
    }
}

(new A29Seam($argv ?? []))->execute();
