<?php
/**
 * Kept check for pkp/crossref-ojs#108 (Crossref Cited-by, dev-team#316). Plants
 * or forgets the Cited-by cache entry the API reads before it calls Crossref
 * (CrossrefCitedByController::getCitations(), key "crossref-citedBy-<id>", one
 * day), so the article page can show citations without real Crossref
 * credentials. `cited-by.js` runs it from the app root with the test config:
 *   PKP_CONFIG_FILE=$PWD/config.test.inc.php php <this file> put <submissionId> <json file>
 *   PKP_CONFIG_FILE=$PWD/config.test.inc.php php <this file> forget <submissionId>
 */
define('INDEX_FILE_LOCATION', getcwd() . '/index.php');
require getcwd() . '/lib/pkp/classes/cliTool/CommandLineTool.php';

use Illuminate\Support\Facades\Cache;

class CitedByCacheDriver extends \PKP\cliTool\CommandLineTool
{
    public function execute(): void
    {
        [$action, $submissionId] = $this->argv;
        $key = "crossref-citedBy-{$submissionId}";
        if ($action === 'put') {
            Cache::put($key, json_decode(file_get_contents($this->argv[2]), true), 60 * 60 * 24);
        } else {
            Cache::forget($key);
        }
        echo json_encode(['key' => $key, 'action' => $action, 'has' => Cache::has($key)]) . "\n";
    }
}

(new CitedByCacheDriver($argv ?? []))->execute();
