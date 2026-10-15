<?php
// Read-only helper of h15.js (U45 claim check H15): what an "Export DOIs" or a deposit of the given works would
// carry, read with the agency's own export plugin and XML validation off (the test installs answer "Export DOIs"
// with 400: the schema fetch goes to the dead [proxy]). OJS and OPS. Prints one JSON line:
// - mode: the context's stored "DOI Versioning", ticked DOI kinds, agency;
// - depositable: what "Deposit All" would take now (doi\DAO::getAllDepositableSubmissionIds()), each DOI with the
//   object that carries it (publication / galley / review) and its status;
// - exportable: the given works getExportableDOIsSubmissionIds() accepts ("Export DOIs" refuses the others);
// - works[id]:
//   versions: each version, its DOI and status, its galleys' DOIs;
//   reviews (OJS): each review assignment of the work: reviewer, DOI, status, counted as read, public, cancelled;
//   reviewExportable (OJS): the reviews getExportableDOIsPeerReviewIds() hands "Export DOIs"' second file and the
//     DepositSubmission job;
//   crossref: the work's Crossref XML (the plugin's submission filter, validation off): the DOIs of its records in
//     order, each record's <titles> block as written, the record count;
//   crossrefReviews (OJS): the peer-review Crossref XML for reviewExportable: the DOIs it carries;
//   datacite (OJS, DataCite configured): per object DatacitePlugin::exportSubmissions() hands the export (the work
//     while "Articles" is ticked, then the current version's galleys with a DOI): the <identifier> written and
//     the titles, or the exception.
// With --raw, each Crossref read also carries the XML's <body>. Writes nothing.
// Usage: PKP_CONFIG_FILE=<fleet config> php xml-read.php <app root> <contextPath> [--raw] <submissionId>...
$root = $argv[1];
define('INDEX_FILE_LOCATION', $root . '/index.php');
chdir($root);
require $root . '/lib/pkp/classes/cliTool/CommandLineTool.php';

use APP\core\Application;
use APP\facades\Repo;
use Illuminate\Support\Facades\DB;
use PKP\plugins\PluginRegistry;

class H15XmlRead extends \PKP\cliTool\CommandLineTool
{
    /** With --raw, each Crossref read also carries the XML's <body> as written. */
    protected bool $raw = false;

    public function execute()
    {
        $args = $this->argv;
        $path = array_shift($args);
        $this->raw = in_array('--raw', $args);
        $ids = array_map('intval', array_values(array_filter($args, fn ($a) => !str_starts_with($a, '--'))));
        $appName = Application::get()->getName();
        $context = Application::getContextDAO()->getByPath($path);
        $ctxId = $context->getId();
        PluginRegistry::loadCategory('generic', true, $ctxId);
        PluginRegistry::loadCategory('importexport', true, $ctxId);
        $versioning = (bool) $context->getData('doiVersioning');
        $kinds = $context->getData('enabledDoiTypes') ?? [];
        $agency = $context->getConfiguredDoiAgency();
        $out = ['app' => $appName, 'contextId' => $ctxId, 'mode' => ['doiVersioning' => $versioning, 'kinds' => $kinds,
            'agency' => $context->getData('registrationAgency'), 'configured' => $agency ? get_class($agency) : null]];

        try {
            $out['depositable'] = collect(app(\APP\doi\DAO::class)->getAllDepositableSubmissionIds($context))
                ->map(fn ($r) => ['submissionId' => $r->submission_id === null ? null : (int) $r->submission_id] + $this->carrier((int) $r->doi_id))
                ->sortBy('doiId')->values()->all();
        } catch (\Throwable $e) {
            $out['depositable'] = ['error' => get_class($e) . ': ' . substr($e->getMessage(), 0, 400)];
        }
        $all = Repo::publication()->getExportableDOIsSubmissionIds($ctxId, $versioning);
        $out['exportable'] = array_values(array_intersect($ids, $all));

        foreach ($ids as $id) {
            $submission = Repo::submission()->get($id);
            if (!$submission) {
                $out['works'][$id] = null;
                continue;
            }
            $w = ['currentPublicationId' => $submission->getData('currentPublicationId'), 'versions' => []];
            foreach ($submission->getData('publications') as $p) {
                $galleys = [];
                foreach ($p->getData('galleys') ?? [] as $g) {
                    $galleys[] = ['galley' => $g->getId(), 'label' => $g->getLabel()] + $this->doiOf($g->getData('doiId'));
                }
                $w['versions'][] = ['id' => $p->getId(), 'version' => $p->getData('versionStage') . ' ' . $p->getData('versionMajor') . '.' . $p->getData('versionMinor'),
                    'published' => $p->getData('status') == 3, 'title' => $p->getData('title'), 'subtitle' => $p->getData('subtitle')] + $this->doiOf($p->getData('doiId')) + ['galleys' => $galleys];
            }
            if ($appName === 'ojs2') {
                $w['reviews'] = collect(DB::select('SELECT ra.review_id, u.username, ra.doi_id, ra.date_completed IS NOT NULL AS completed,
                    (ra.date_considered IS NOT NULL OR ra.date_acknowledged IS NOT NULL) AS read, ra.is_review_publicly_visible AS public,
                    ra.cancelled, ra.declined FROM review_assignments ra JOIN users u ON u.user_id = ra.reviewer_id WHERE ra.submission_id = ? ORDER BY 1', [$id]))
                    ->map(fn ($r) => ['reviewId' => (int) $r->review_id, 'reviewer' => $r->username, 'completed' => (bool) $r->completed, 'read' => (bool) $r->read,
                        'public' => (bool) $r->public, 'cancelled' => (bool) $r->cancelled, 'declined' => (bool) $r->declined] + $this->doiOf($r->doi_id))->all();
                $w['reviewExportable'] = Repo::reviewAssignment()->getExportableDOIsPeerReviewIds($ctxId, $versioning, [$id]);
            }
            $class = $agency ? strtolower(get_class($agency)) : '';
            if (str_contains($class, 'crossref')) {
                $w['crossref'] = $this->crossref($context, $agency, [$submission], 'submission');
                if ($appName === 'ojs2' && $w['reviewExportable']) {
                    $reviews = array_map(fn ($rid) => Repo::reviewAssignment()->get($rid), $w['reviewExportable']);
                    $w['crossrefReviews'] = $this->crossref($context, $agency, $reviews, 'peerReview');
                }
            } elseif (str_contains($class, 'datacite')) {
                $w['datacite'] = $this->datacite($context, $agency, $submission, $kinds);
            }
            $out['works'][$id] = $w;
        }
        echo json_encode($out), "\n";
    }

    protected function doiOf($doiId): array
    {
        if (!$doiId) {
            return ['doiId' => null, 'doi' => null, 'status' => null];
        }
        $d = DB::table('dois')->where('doi_id', $doiId)->first(['doi', 'status']);
        return ['doiId' => (int) $doiId, 'doi' => $d?->doi, 'status' => $d ? (int) $d->status : 'missing'];
    }

    /** Which object carries a DOI row. */
    protected function carrier(int $doiId): array
    {
        $what = [];
        foreach (DB::table('publications')->where('doi_id', $doiId)->get(['publication_id', 'submission_id']) as $r) {
            $what[] = "publication {$r->publication_id} (work {$r->submission_id})";
        }
        foreach (DB::table('review_assignments')->where('doi_id', $doiId)->get(['review_id']) as $r) {
            $what[] = "review {$r->review_id}";
        }
        if (DB::getSchemaBuilder()->hasTable('publication_galleys')) {
            foreach (DB::table('publication_galleys')->where('doi_id', $doiId)->get(['galley_id']) as $r) {
                $what[] = "galley {$r->galley_id}";
            }
        }
        return ['doiId' => $doiId, 'carriers' => $what] + array_diff_key($this->doiOf($doiId), ['doiId' => 1]);
    }

    protected function exportPlugin($agency)
    {
        // OPS and DataCite: the agency's _getExportPlugin(); OJS's Crossref plugin holds it in a property only.
        if (method_exists($agency, '_getExportPlugin')) {
            $m = new \ReflectionMethod($agency, '_getExportPlugin');
            $m->setAccessible(true);
            return $m->invoke($agency);
        }
        $plugin = PluginRegistry::getPlugin('importexport', str_contains(strtolower(get_class($agency)), 'datacite') ? 'DataciteExportPlugin' : 'CrossrefExportPlugin');
        if (!$plugin) {
            $p = new \ReflectionProperty($agency, '_exportPlugin');
            $p->setAccessible(true);
            $plugin = $p->getValue($agency);
        }
        return $plugin;
    }

    /** The agency's Crossref XML for the objects, validation off: DOIs in order, the <titles> blocks, records. */
    protected function crossref($context, $agency, array $objects, string $kind): array
    {
        try {
            $plugin = $this->exportPlugin($agency);
            $filter = $kind === 'peerReview' ? $plugin->getPeerReviewFilter() : $plugin->getSubmissionFilter();
            $errs = [];
            $xml = $plugin->exportXML($objects, $filter, $context, true, $errs);
            preg_match_all('#<doi>([^<]*)</doi>#', $xml, $dois);
            preg_match_all('#<titles>.*?</titles>#s', $xml, $titles);
            preg_match_all('#<(journal_article|posted_content|peer_review)\b#', $xml, $records);
            preg_match_all('#<resource[^>]*>([^<]*)</resource>#', $xml, $resources);
            return ['dois' => $dois[1], 'titles' => array_map(fn ($t) => preg_replace('/\s+/', ' ', $t), $titles[0]),
                'records' => $records[1], 'resources' => array_map(fn ($u) => preg_replace('#^https?://[^/]+#', '', html_entity_decode($u)), $resources[1]), 'bytes' => strlen($xml), 'libxmlErrors' => count($errs ?? [])] + ($this->raw && preg_match('#<body>.*</body>#s', $xml, $b) ? ['body' => preg_replace('/\s+/', ' ', $b[0])] : []);
        } catch (\Throwable $e) {
            return ['exception' => get_class($e) . ': ' . substr($e->getMessage(), 0, 400), 'at' => basename($e->getFile()) . ':' . $e->getLine()];
        }
    }

    /** DatacitePlugin::exportSubmissions()' objects, each exported with validation off: identifier and titles, or the exception. */
    protected function datacite($context, $agency, $submission, array $kinds): array
    {
        $plugin = $this->exportPlugin($agency);
        $items = [];
        if (in_array('publication', $kinds)) {
            $items[] = ['article ' . $submission->getId(), $submission];
        }
        if (in_array('representation', $kinds)) {
            foreach ($submission->getCurrentPublication()->getData('galleys') as $galley) {
                if ($galley->getDoi()) {
                    $items[] = ['galley ' . $galley->getId(), $galley];
                }
            }
        }
        $filterOf = new \ReflectionMethod($plugin, '_getFilterFromObject');
        $filterOf->setAccessible(true);
        $res = [];
        foreach ($items as [$label, $object]) {
            try {
                $errs = [];
                $xml = $plugin->exportXML($object, $filterOf->invoke($plugin, $object), $context, true, $errs);
                preg_match_all('#<identifier[^>]*>([^<]*)</identifier>#', $xml, $idents);
                preg_match('#<titles>.*?</titles>#s', $xml, $titles);
                preg_match_all('#<identifier\b[^>]*/>#', $xml, $empty);
                $res[] = ['object' => $label, 'identifier' => $idents[1], 'emptyIdentifier' => $empty[0], 'titles' => preg_replace('/\s+/', ' ', $titles[0] ?? ''), 'bytes' => strlen($xml)]
                    + ($this->raw ? ['xml' => preg_replace('/\s+/', ' ', substr($xml, 0, 1500))] : []);
            } catch (\Throwable $e) {
                $res[] = ['object' => $label, 'exception' => get_class($e) . ': ' . substr($e->getMessage(), 0, 400), 'at' => basename($e->getFile()) . ':' . $e->getLine()];
            }
        }
        return ['objects' => $res];
    }
}

$tool = new H15XmlRead(array_merge([$argv[0]], array_slice($argv, 2)));
$tool->execute();
