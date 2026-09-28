<?php

/**
 * @file classes/testing/SubmissionScenarioBuilder.php
 *
 * Copyright (c) 2026 Simon Fraser University
 * Copyright (c) 2026 John Willinsky
 * Distributed under the GNU GPL v3. For full terms see the file docs/COPYING.
 *
 * @class SubmissionScenarioBuilder
 *
 * @brief OMP submission scenario overlays: `series` (path) + `seriesPosition`
 * on the publication (both optional — monographs need no series), and the
 * per-round `stage: internal|external` key on reviewRounds. `galleys` is
 * rejected: a press has publication formats, not galleys; `publicationFormats`
 * (U47) is their counterpart here. Of the publication-page keys (U13) the
 * "Catalog Entry" page's `categories` (U16), `datePublished` (U17) and
 * `urlPath` (U70) are taken, and (U69) the "Title & Abstract" page's
 * `subtitle` and `plainLanguageSummary` and the "Metadata" page's
 * `keywords`. A format (U69) may be `physical`, remote (`urlRemote`), sold
 * (`price`) and carry the "Metadata" tab's catalog data. `featured[]` / `newRelease[]` (U70): the
 * Catalog page's boxes, pressed after the publish.
 * `enableChapterPublicationDates` and `chapters[]` (U72): the "Marketing" ›
 * "Publication Dates" choice and the Chapters page's chapters, built on the
 * version before any publish. `audience` and `representatives[]` (U74): the
 * "Marketing" › "Audience" and "Representatives" pages, and per format its
 * "Metadata" tab's `salesRights[]` and `markets[]`, built with them after
 * the formats (a market names the book's representatives).
 */

namespace APP\testing;

use APP\controllers\grid\catalogEntry\form\MarketForm;
use APP\controllers\grid\catalogEntry\form\PublicationFormatForm;
use APP\controllers\grid\catalogEntry\form\RepresentativeForm;
use APP\controllers\grid\catalogEntry\form\SalesRightsForm;
use APP\controllers\grid\catalogEntry\PublicationFormatGridHandler;
use APP\controllers\grid\users\chapter\form\ChapterForm;
use APP\controllers\grid\files\proof\form\ApprovedProofForm;
use APP\core\Application;
use APP\facades\Repo;
use PKP\context\Context;
use PKP\core\JSONMessage;
use PKP\core\Registry;
use PKP\notification\Notification;
use PKP\security\authorization\AuthorizationDecisionManager;
use PKP\submissionFile\SubmissionFile;
use PKP\user\User;
use PKP\security\Role;
use PKP\testing\ApiCall;
use PKP\testing\FormPost;
use PKP\testing\PKPSubmissionScenarioBuilder;
use PKP\testing\Spec;
use PKP\testing\SpecException;

class SubmissionScenarioBuilder extends PKPSubmissionScenarioBuilder
{
    /** Per publicationFormats[] entry, its parsed salesRights[] and markets[] (U74), built in seedVersionOverlay. */
    private array $formatTradePlans = [];

    /**
     * `workType` ('monograph' | 'editedVolume', default monograph) — the OMP
     * start form always posts a work type (the Monograph radio arrives
     * preselected and the field is required), so every wizard-created
     * submission stores one; a direct repository add leaves it null, a state
     * no UI path produces (parity fix, U21).
     */
    protected function parseSubmissionOverlay(Context $context, Spec $root): array
    {
        $workType = (string) $root->get('workType', 'monograph');
        return match ($workType) {
            'monograph' => ['workType' => \APP\submission\Submission::WORK_TYPE_AUTHORED_WORK],
            'editedVolume' => ['workType' => \APP\submission\Submission::WORK_TYPE_EDITED_VOLUME],
            default => throw new SpecException('workType', 'workType must be "monograph" or "editedVolume"'),
        };
    }

    protected function parsePublicationOverlay(Context $context, Spec $root): array
    {
        $props = [];
        $seriesPath = $root->get('series');
        if ($seriesPath !== null) {
            $seriesId = BootstrapSeeder::findSeriesId($context, (string) $seriesPath);
            if (!$seriesId) {
                throw new SpecException('series', "Unknown series path \"{$seriesPath}\" in context \"{$context->getPath()}\"");
            }
            $props['seriesId'] = $seriesId;
        }
        $seriesPosition = $root->get('seriesPosition');
        if ($seriesPosition !== null) {
            $props['seriesPosition'] = (string) $seriesPosition;
        }
        return $props;
    }

    /** A press has publication formats, not galleys: the key is refused, never dropped (PRINCIPLES D4). */
    protected function assertGalleysSupported(Spec $root): void
    {
        throw new SpecException('galleys', 'OMP has publication formats, not galleys — galleys cannot be seeded on this app (no "Galleys" page exists)');
    }

    /**
     * Read publicationFormats[] (U47): each {name*, file?}, a publication
     * format on the current publication, ready for readers. Parse-phase: no
     * writes. The page's refusals are the seed's: the page is on the
     * workflow, so a draft refuses the key; `name` is the "Add publication
     * format" window's required "Name", a string (the submission's
     * language) or a locale map over the languages the box offers (the
     * press's submission metadata languages) that fills the submission's
     * one; `file` a fixture basename, the format row's "Change File";
     * `genre` (U64, needs `file`) the upload wizard's component for it.
     *
     * @return array<int, array{path: string, name: array<string, string>, fixture: ?array}>
     */
    protected function parsePublicationFormats(Context $context, Spec $root, string $submissionLocale, bool $submitted): array
    {
        if (!$root->has('publicationFormats')) {
            return [];
        }
        if (!$submitted) {
            throw new SpecException('publicationFormats', 'The "Publication Formats" page is on the workflow, which a draft does not have: publicationFormats needs submitted: true');
        }
        $offeredLocales = array_unique(array_merge([$submissionLocale], (array) $context->getSupportedSubmissionMetadataLocales()));
        $plans = [];
        foreach ($root->childList('publicationFormats') as $spec) {
            $name = $spec->require('name');
            if (is_string($name)) {
                $name = [$submissionLocale => $name];
            }
            if (!is_array($name) || array_is_list($name)) {
                throw new SpecException("{$spec->path}.name", 'name is the "Name" box: a string or a locale map');
            }
            foreach ($name as $nameLocale => $value) {
                if (!in_array($nameLocale, $offeredLocales, true)) {
                    throw new SpecException("{$spec->path}.name", "The \"Name\" box offers no language \"{$nameLocale}\": " . implode(', ', $offeredLocales));
                }
                if (!is_string($value)) {
                    throw new SpecException("{$spec->path}.name", 'Each "Name" value is a string');
                }
            }
            if (trim((string) ($name[$submissionLocale] ?? '')) === '') {
                throw new SpecException("{$spec->path}.name", "\"Name\" is required in the submission's language ({$submissionLocale})");
            }
            // `genre` (U64): the upload wizard's component for the file, by
            // the name its list shows ("Book Manuscript"), as galleys[].genre
            // (U13); absent, the first the list offers ("Appendix", a
            // supplementary component, whose downloads count as
            // "Supplementary File" and not as the book's "File Views").
            if ($spec->has('genre') && !$spec->has('file')) {
                throw new SpecException("{$spec->path}.genre", 'genre is the component of the format\'s file: it needs file');
            }
            // `physical` (U69): the "Edit" tab's "Physical format" box.
            $physical = $spec->get('physical', false);
            if (!is_bool($physical)) {
                throw new SpecException("{$spec->path}.physical", 'physical is the "Physical format" box: a boolean');
            }
            // `urlRemote` (U69): "This format will be available at a
            // separate website." ticked and "URL of remotely-hosted
            // content" typed. A remote format holds no files (its row
            // offers no "Change File"), so it takes no file, genre or price.
            $urlRemote = null;
            if ($spec->has('urlRemote')) {
                $urlRemote = $spec->get('urlRemote');
                if (!is_string($urlRemote) || trim($urlRemote) === '') {
                    throw new SpecException("{$spec->path}.urlRemote", 'urlRemote is the "URL of remotely-hosted content" box: a non-empty string');
                }
                foreach (['file', 'genre', 'price'] as $key) {
                    if ($spec->has($key)) {
                        throw new SpecException("{$spec->path}.{$key}", "{$key} does not apply to a remote format (urlRemote): its row offers no \"Change File\", so it holds no file");
                    }
                }
            }
            // `price` (U69): the file row's "Set Terms", "Direct Sales" with
            // the price typed, instead of "Open Access". Checked by the
            // window's own form at execute (ApprovedProofForm's pattern).
            $price = null;
            if ($spec->has('price')) {
                $price = $spec->get('price');
                if (is_int($price)) {
                    $price = (string) $price;
                }
                if (!$spec->has('file')) {
                    throw new SpecException("{$spec->path}.price", 'price is the "Direct Sales" terms of the format\'s file: it needs file');
                }
                if (!is_string($price) || trim($price) === '') {
                    throw new SpecException("{$spec->path}.price", 'price is the "Price" box of "Set Terms for Downloading": a string as typed ("25", "25.00") or a whole number');
                }
            }
            $plans[] = [
                'path' => $spec->path,
                'name' => $name,
                'fixture' => $spec->has('file') ? $this->resolveFixture((string) $spec->get('file'), "{$spec->path}.file") : null,
                'genreId' => $spec->has('genre') ? $this->resolveUploadGenreId($context, $spec) : null,
                'physical' => $physical,
                'urlRemote' => $urlRemote,
                'price' => $price,
            ] + $this->parseFormatCatalogData($context, $spec) + $this->parseFormatTrade($spec);
        }
        // The sales rights and markets are built with the Marketing pages
        // (seedVersionOverlay), after the book's representatives, which a
        // market names.
        $this->formatTradePlans = array_map(fn (array $plan) => ['salesRights' => $plan['salesRights'], 'markets' => $plan['markets']], $plans);
        return $plans;
    }

    /**
     * An ONIX list's code by the label the screen's list shows ("Canada
     * (CA)"); a label the list does not offer (unknown, or excluded as the
     * window excludes it) is a 400 listing what it offers.
     */
    private function onixCode(string $list, mixed $label, string $specPath, string $box, array $exclude = []): string
    {
        $onix = \PKP\db\DAORegistry::getDAO('ONIXCodelistItemDAO'); /** @var \APP\codelist\ONIXCodelistItemDAO $onix */
        $offered = $onix->getCodes($list, $exclude);
        $code = is_string($label) ? array_search($label, $offered, true) : false;
        if ($code === false) {
            throw new SpecException($specPath, "The \"{$box}\" list offers no " . json_encode($label) . ' here; it offers: ' . implode(', ', $offered));
        }
        return (string) $code;
    }

    /** An optional ONIX list's code by its label, or $default (the window's arrival choice, '' for its empty one) when the key is absent. */
    private function optionalOnixCode(Spec $spec, string $key, string $list, string $box, string $default = ''): string
    {
        return $spec->has($key) ? $this->onixCode($list, $spec->get($key), "{$spec->path}.{$key}", $box) : $default;
    }

    /** An optional free-text box: a string, or a whole number, as typed ('' when absent). */
    private function optionalText(Spec $spec, string $key, string $box): string
    {
        $value = $spec->get($key, '');
        if (is_int($value) || is_float($value)) {
            $value = (string) $value;
        }
        if (!is_string($value)) {
            throw new SpecException("{$spec->path}.{$key}", "{$key} is the \"{$box}\" box: a string as typed");
        }
        return $value;
    }

    /**
     * The countries and regions of a sales-rights or market window (U74):
     * `countriesIncluded`, `countriesExcluded`, `regionsIncluded`,
     * `regionsExcluded`, each a list of the labels its multiple-choice list
     * shows ("Canada (CA)", "World (WORLD)"), posted as the codes.
     *
     * @return array<string, string[]> the window's field name → codes
     */
    private function parseTerritory(Spec $spec): array
    {
        $fields = [];
        foreach (['countriesIncluded' => ['91', 'Countries: Included'], 'countriesExcluded' => ['91', 'Countries: Excluded'], 'regionsIncluded' => ['49', 'Regions: Included'], 'regionsExcluded' => ['49', 'Regions: Excluded']] as $key => [$list, $box]) {
            $labels = $spec->get($key, []);
            if (!is_array($labels) || !array_is_list($labels)) {
                throw new SpecException("{$spec->path}.{$key}", "{$key} is the \"{$box}\" list: a list of the labels it shows");
            }
            if (count(array_unique($labels, SORT_REGULAR)) !== count($labels)) {
                throw new SpecException("{$spec->path}.{$key}", "{$key} names an entry twice; the list chooses each once");
            }
            $fields[$key] = array_map(fn ($label, $i) => $this->onixCode($list, $label, "{$spec->path}.{$key}.{$i}", $box), $labels, array_keys($labels));
        }
        return $fields;
    }

    /**
     * A format's trade data (U74), the "Metadata" tab's two lists:
     * - `salesRights[]` {type*, restOfWorld?, countries and regions}:
     *   "Add Sales Rights", "Sales Rights Type" by its label (each type
     *   once per format, as the list offers it), "Rest of World?" ticked
     *   with `true`, the territory lists (parseTerritory), "OK";
     * - `markets[]` {date*, dateFormat?, dateRole?, agent?, supplier?,
     *   countries and regions, price*, currency?, priceType?, taxRate?,
     *   taxType?, discount?}: "Add Market", the lists by their labels,
     *   left where the window arrives without the key ("YYYYMMDD (H)",
     *   "Publication date (01)", "Canadian Dollar (CAD)", the others on
     *   their empty choice), `agent` and `supplier` the name of one of the
     *   book's representatives of that type (checked against
     *   representatives[] in parseVersionOverlay), "OK".
     * The windows' own checks (a second "Rest of World?", an empty "Date"
     * or "Price") run at execute. Parse phase: no writes.
     *
     * @return array{salesRights: array, markets: array}
     */
    private function parseFormatTrade(Spec $spec): array
    {
        $salesRights = [];
        foreach ($spec->childList('salesRights') as $rightsSpec) {
            $restOfWorld = $rightsSpec->get('restOfWorld', false);
            if (!is_bool($restOfWorld)) {
                throw new SpecException("{$rightsSpec->path}.restOfWorld", 'restOfWorld is the "Rest of World?" box: a boolean');
            }
            $salesRights[] = [
                'path' => $rightsSpec->path,
                'type' => $this->onixCode('46', $rightsSpec->require('type'), "{$rightsSpec->path}.type", 'Sales Rights Type', array_column($salesRights, 'type')),
                'restOfWorld' => $restOfWorld,
            ] + $this->parseTerritory($rightsSpec);
        }

        $markets = [];
        foreach ($spec->childList('markets') as $marketSpec) {
            $typed = [];
            foreach (['date' => 'Date', 'price' => 'Price'] as $key => $box) {
                $value = $marketSpec->require($key);
                if (is_int($value) || is_float($value)) {
                    $value = (string) $value;
                }
                if (!is_string($value) || trim($value) === '') {
                    throw new SpecException("{$marketSpec->path}.{$key}", "{$key} is the market window's required \"{$box}\" box: a non-empty string as typed");
                }
                $typed[$key] = $value;
            }
            $representatives = [];
            foreach (['agent' => 'Agent', 'supplier' => 'Supplier'] as $key => $box) {
                $name = $marketSpec->get($key);
                if ($name !== null && (!is_string($name) || trim($name) === '')) {
                    throw new SpecException("{$marketSpec->path}.{$key}", "{$key} is the \"{$box}\" list's choice: the name of one of the book's representatives[] of that type");
                }
                $representatives[$key] = $name;
            }
            $markets[] = [
                'path' => $marketSpec->path,
                'date' => $typed['date'],
                'dateFormat' => $this->optionalOnixCode($marketSpec, 'dateFormat', '55', 'Date Format', '20'),
                'dateRole' => $this->optionalOnixCode($marketSpec, 'dateRole', '163', 'Role', '01'),
                'agent' => $representatives['agent'],
                'supplier' => $representatives['supplier'],
                'price' => $typed['price'],
                'currencyCode' => $this->optionalOnixCode($marketSpec, 'currency', '96', 'Price', 'CAD'),
                'priceTypeCode' => $this->optionalOnixCode($marketSpec, 'priceType', '58', 'Price Type'),
                'taxRateCode' => $this->optionalOnixCode($marketSpec, 'taxRate', '62', 'Taxation Rate'),
                'taxTypeCode' => $this->optionalOnixCode($marketSpec, 'taxType', '171', 'Taxation Type'),
                'discount' => $this->optionalText($marketSpec, 'discount', 'Discount percentage, if applicable'),
            ] + $this->parseTerritory($marketSpec);
        }
        return ['salesRights' => $salesRights, 'markets' => $markets];
    }

    /**
     * A format's catalog data (U69), the format window's "Metadata" tab:
     * - `identificationCodes[]` {type*, value*}: "Product Identification" ›
     *   "Add Code", "ONIX Code Type" by the label its list shows ("ISBN-13
     *   (15)") and "Code Value"; the list offers each type once per format
     *   and no "DOI (06)" while the press assigns DOIs;
     * - `publicationDates[]` {role*, date*, dateFormat?}: "Publication
     *   Dates" › "Add publication date", "Role" and "Date Format" by their
     *   list labels ("Publication date (01)"; the format left on the one
     *   the window preselects), "Date" as typed; each role once per format;
     * - `metadata` {productComposition*, height?, width?, thickness?,
     *   weight?}: the tab's fields and "Save", "Product Composition" by its
     *   label (required by the tab), the sizes in the preselected units
     *   (mm, gr), every other field as the tab shows it.
     * The windows' own checks (a date's length for its format) run at
     * execute. Parse phase: no writes.
     *
     * @return array{codes: array, dates: array, metadata: ?array}
     */
    private function parseFormatCatalogData(Context $context, Spec $spec): array
    {
        $resolve = fn (string $list, mixed $label, string $specPath, string $box, array $exclude = []): string => $this->onixCode($list, $label, $specPath, $box, $exclude);

        $codes = [];
        foreach ($spec->has('identificationCodes') ? $spec->childList('identificationCodes') : [] as $codeSpec) {
            $exclude = array_column($codes, 'code');
            if ($context->areDoisEnabled()) {
                $exclude[] = '06';
            }
            $value = $codeSpec->require('value');
            if (!is_string($value) || trim($value) === '') {
                throw new SpecException("{$codeSpec->path}.value", 'value is the "Code Value" box: a non-empty string');
            }
            $codes[] = ['code' => $resolve('5', $codeSpec->require('type'), "{$codeSpec->path}.type", 'ONIX Code Type', $exclude), 'value' => $value, 'path' => $codeSpec->path];
        }

        $dates = [];
        foreach ($spec->has('publicationDates') ? $spec->childList('publicationDates') : [] as $dateSpec) {
            $date = $dateSpec->require('date');
            if (!is_string($date) || trim($date) === '') {
                throw new SpecException("{$dateSpec->path}.date", 'date is the "Date" box: a non-empty string, as typed (20240305)');
            }
            $dates[] = [
                'role' => $resolve('163', $dateSpec->require('role'), "{$dateSpec->path}.role", 'Role', array_column($dates, 'role')),
                // The window preselects the list's "20" on a new date.
                'dateFormat' => $dateSpec->has('dateFormat') ? $resolve('55', $dateSpec->get('dateFormat'), "{$dateSpec->path}.dateFormat", 'Date Format') : '20',
                'date' => $date,
                'path' => $dateSpec->path,
            ];
        }

        $metadata = null;
        if (($metaSpec = $spec->child('metadata')) !== null) {
            $metadata = ['productCompositionCode' => $resolve('2', $metaSpec->require('productComposition'), "{$metaSpec->path}.productComposition", 'Product Composition'), 'path' => $metaSpec->path];
            foreach (['height', 'width', 'thickness', 'weight'] as $key) {
                $value = $metaSpec->get($key, '');
                if (is_int($value)) {
                    $value = (string) $value;
                }
                if (!is_string($value)) {
                    throw new SpecException("{$metaSpec->path}.{$key}", "{$key} is a free-text box of \"Physical Dimensions\": a string or a whole number");
                }
                $metadata[$key] = $value;
            }
        }
        return ['codes' => $codes, 'dates' => $dates, 'metadata' => $metadata];
    }

    /**
     * Build each parsed format the way the "Publication Formats" page does,
     * acting as the editor (admin), before a publish:
     * 1. "Add publication format", "Name" typed, the "Publication Format"
     *    list left on its preselected "Digital (on physical carrier) (DA)",
     *    every other box empty, "OK": the window's PublicationFormatForm::
     *    execute (the format row, its "created" Activity Log line);
     * 2. for a `file`, the format row's "Change File": the upload wizard at
     *    the proof stage on the format, the component its list offers first
     *    (uploadThroughWizard, as galleys[] uploads), then the file row's
     *    "Set Terms", "Open Access", "Save": ApprovedProofForm::execute
     *    (salesType openAccess, directSalesPrice 0). The file's own
     *    "Awaiting Approval" is left as it is, as the reader chain leaves it;
     *    With `price` the terms are "Direct Sales" and the price typed
     *    (U69, the form's own checks via FormPost). A `urlRemote` format
     *    is saved with "This format will be available at a separate
     *    website." ticked and gets no file; `physical` ticks "Physical
     *    format"; the catalog data is the "Metadata" tab's
     *    (seedFormatCatalogData), right after the format's "OK";
     * 3. the format row's "Awaiting Approval" › "OK": the grid's own
     *    PublicationFormatGridHandler::setApproved (the public-identifier
     *    assignment, isApproved, the Activity Log line, the tombstone).
     *
     * @return array<int, array{id: int, name: string, submissionFileId: ?int}>
     */
    protected function seedPublicationFormats(Context $context, int $submissionId, array $plans, User $editor): array
    {
        $previousActingUser = Registry::get('user');
        Registry::set('user', $editor);
        try {
            $seeded = [];
            foreach ($plans as $plan) {
                $submission = Repo::submission()->get($submissionId);
                $publication = Repo::publication()->get($submission->getData('currentPublicationId'));

                $form = new PublicationFormatForm($submission, null, $publication);
                $form->setData('name', $plan['name']);
                $form->setData('entryKey', 'DA');
                $form->setData('isPhysicalFormat', $plan['physical'] ? 'on' : null);
                $form->setData('isbn10', '');
                $form->setData('isbn13', '');
                $form->setData('remoteURL', $plan['urlRemote'] ?? '');
                $form->setData('urlPath', '');
                $formatId = (int) $form->execute();

                // The format's "Edit" › "Metadata" tab (U69): each code and
                // date window's "OK", then the tab's "Save".
                $this->seedFormatCatalogData($submission, $publication, $formatId, $plan);

                $submissionFileId = null;
                if ($plan['fixture'] !== null) {
                    $submissionFileId = $this->uploadThroughWizard(
                        $context,
                        $submissionId,
                        $editor,
                        $plan['fixture'],
                        SubmissionFile::SUBMISSION_FILE_PROOF,
                        Application::ASSOC_TYPE_REPRESENTATION,
                        $formatId,
                        $plan['genreId'] ?? $this->defaultGalleyGenreId($context)
                    );
                    $terms = new ApprovedProofForm($submission, Application::getRepresentationDAO()->getById($formatId), $submissionFileId);
                    if ($plan['price'] !== null) {
                        // "Direct Sales" with the price typed (U69), the
                        // window's own readInputData, price check and save.
                        FormPost::run($terms, [
                            'submissionFileId' => (string) $submissionFileId,
                            'submissionId' => (string) $submissionId,
                            'representationId' => (string) $formatId,
                            'publicationId' => (string) $publication->getId(),
                            'salesType' => 'directSales',
                            'price' => $plan['price'],
                        ], "{$plan['path']}.price", 'The "Set Terms for Downloading" window would refuse this');
                    } else {
                        $terms->setData('salesType', 'openAccess');
                        $terms->setData('price', '');
                        $terms->execute();
                    }
                }

                // The "Format Approval" window as the link opens it, then its
                // "OK" with the boxes it ticks (a public-identifier plugin's
                // "Assign" box, ticked by default, where one is enabled).
                // (The seeding request is an API call, whose template manager
                // lacks the page's `currentContext`, which the plugins'
                // window sections read.)
                \APP\template\TemplateManager::getManager(Application::get()->getRequest())->assign('currentContext', $context);
                $window = $this->runFormatGridAction($submission, $publication, $formatId, 'setApproved', ['newApprovedState' => '1'], $plan['path'], 'The format\'s "Awaiting Approval" window did not open');
                $ticked = $this->tickedBoxes((string) $window->getContent());
                $this->runFormatGridAction($submission, $publication, $formatId, 'setApproved', ['newApprovedState' => '1', 'confirmed' => '1'] + $ticked, $plan['path'], 'The format\'s "Awaiting Approval" › "OK" was refused');
                $this->assertPubIdsAssigned($context, $formatId, $ticked, $plan['path']);

                $seeded[] = [
                    'id' => $formatId,
                    'name' => (string) $plan['name'][$submission->getData('locale')],
                    'submissionFileId' => $submissionFileId,
                ];
            }
            return $seeded;
        } finally {
            Registry::set('user', $previousActingUser);
        }
    }

    /**
     * The format window's "Metadata" tab (U69), run as its windows post:
     * each "Add Code" window's "OK" (IdentificationCodeForm), each "Add
     * publication date" window's "OK" (PublicationDateForm), then the tab's
     * "Save" (PublicationFormatMetadataForm) with every field it shows at
     * its shown value, the given ones typed. The forms' own checks run
     * (FormPost); the handlers' success toasts do not.
     */
    private function seedFormatCatalogData(\APP\submission\Submission $submission, \APP\publication\Publication $publication, int $formatId, array $plan): void
    {
        $ids = [
            'submissionId' => (string) $submission->getId(),
            'publicationId' => (string) $publication->getId(),
            'representationId' => (string) $formatId,
        ];
        foreach ($plan['codes'] as $code) {
            FormPost::run(
                new \APP\controllers\grid\catalogEntry\form\IdentificationCodeForm($submission, $publication, null),
                $ids + ['identificationCodeId' => '', 'value' => $code['value'], 'code' => $code['code']],
                $code['path'],
                'The code window would refuse this'
            );
        }
        foreach ($plan['dates'] as $date) {
            FormPost::run(
                new \APP\controllers\grid\catalogEntry\form\PublicationDateForm($submission, $publication, null),
                $ids + ['publicationDateId' => '', 'date' => $date['date'], 'dateFormat' => $date['dateFormat'], 'role' => $date['role']],
                $date['path'],
                'The publication date window would refuse this'
            );
        }
        if ($plan['metadata'] !== null) {
            $format = Application::getRepresentationDAO()->getById($formatId);
            $meta = $plan['metadata'];
            FormPost::run(
                new \APP\controllers\grid\catalogEntry\form\PublicationFormatMetadataForm($submission, $publication, $format),
                $ids + [
                    'productCompositionCode' => $meta['productCompositionCode'],
                    'productFormDetailCode' => '',
                    'productAvailabilityCode' => '20',
                    'imprint' => '',
                    'frontMatter' => '',
                    'backMatter' => '',
                    'returnableIndicatorCode' => 'Y',
                    'height' => $meta['height'],
                    'heightUnitCode' => 'mm',
                    'width' => $meta['width'],
                    'widthUnitCode' => 'mm',
                    'thickness' => $meta['thickness'],
                    'thicknessUnitCode' => 'mm',
                    'weight' => $meta['weight'],
                    'weightUnitCode' => 'gr',
                    'countryManufactureCode' => 'CA',
                ],
                $meta['path'],
                'The format window\'s "Metadata" tab would refuse this'
            );
        }
    }

    /**
     * Each seeded format's "Not Available" › "OK", after the publish (or at
     * the end of an unpublished build): the grid's own
     * PublicationFormatGridHandler::setAvailable (isAvailable, the Activity
     * Log line, the tombstone removed).
     */
    protected function makePublicationFormatsAvailable(Context $context, int $submissionId, array $seeded, User $editor): void
    {
        $previousActingUser = Registry::get('user');
        Registry::set('user', $editor);
        try {
            $submission = Repo::submission()->get($submissionId);
            foreach ($seeded as $i => $format) {
                $publication = Repo::publication()->get($submission->getData('currentPublicationId'));
                $this->runFormatGridAction($submission, $publication, $format['id'], 'setAvailable', ['newAvailableState' => '1'], "publicationFormats.{$i}", 'The format\'s "Not Available" › "OK" was refused');
            }
        } finally {
            Registry::set('user', $previousActingUser);
        }
    }

    /**
     * Run one action of the publication format grid on a format, the
     * handler's own code, with the request variables the screen's link
     * posts. The authorized objects its policies would have set are set
     * directly; the variables stand in the running request for the call
     * (none of them is a key of the seed's body, which the request reads
     * first).
     */
    private function runFormatGridAction(\APP\submission\Submission $submission, \APP\publication\Publication $publication, int $formatId, string $action, array $vars, string $specPath, string $refusal): JSONMessage
    {
        $request = Application::get()->getRequest();
        $format = Application::getRepresentationDAO()->getById($formatId);
        $handler = new PublicationFormatGridHandler();
        $manager = new AuthorizationDecisionManager();
        $manager->_authorizedContext[Application::ASSOC_TYPE_SUBMISSION] = $submission;
        $manager->_authorizedContext[Application::ASSOC_TYPE_PUBLICATION] = $publication;
        $manager->_authorizedContext[Application::ASSOC_TYPE_REPRESENTATION] = $format;
        $handler->_authorizationDecisionManager = $manager;
        $handler->setSubmission($submission);
        $handler->setPublication($publication);
        $previousVars = $request->_requestVars;
        $request->_requestVars = array_merge($request->getUserVars(), $vars, [
            'representationId' => (string) $formatId,
            'submissionId' => (string) $submission->getId(),
            'publicationId' => (string) $publication->getId(),
        ]);
        try {
            $answer = $handler->$action([], $request);
        } finally {
            $request->_requestVars = $previousVars;
        }
        if (!$answer instanceof JSONMessage || !$answer->getStatus()) {
            throw new SpecException($specPath, $refusal);
        }
        return $answer;
    }

    /**
     * Each public identifier the "Format Approval" window's ticked "Assign"
     * boxes asked for must be stored. The seeding request is an API call on
     * the site, so a public-identifier plugin can be registered there
     * without the storage hooks a press page request gives it; a box the
     * seed ticked but could not honour is a 400, never a silently missing
     * identifier (PRINCIPLES D4).
     */
    private function assertPubIdsAssigned(Context $context, int $formatId, array $ticked, string $specPath): void
    {
        if ($ticked === []) {
            return;
        }
        $format = Application::getRepresentationDAO()->getById($formatId);
        foreach (\PKP\plugins\PluginRegistry::loadCategory('pubIds', true, $context->getId()) as $plugin) {
            if (isset($ticked[$plugin->getAssignFormFieldName()]) && !$format->getStoredPubId($plugin->getPubIdType())) {
                throw new SpecException($specPath, "The \"Format Approval\" window ticks \"{$plugin->getAssignFormFieldName()}\" ({$plugin->getDisplayName()} is enabled for publication formats in \"{$context->getPath()}\"), and the seed cannot store that identifier; build this format on screen");
            }
        }
    }

    /** The ticked checkboxes of a grid window's HTML, as its form posts them (name → value). */
    private function tickedBoxes(string $html): array
    {
        $ticked = [];
        preg_match_all('/<input\b[^>]*>/i', $html, $inputs);
        foreach ($inputs[0] as $input) {
            if (preg_match('/type="checkbox"/i', $input) && preg_match('/\schecked\b/i', $input) && !preg_match('/\sdisabled\b/i', $input) && preg_match('/name="([^"]+)"/', $input, $name)) {
                $ticked[$name[1]] = preg_match('/value="([^"]*)"/', $input, $value) ? $value[1] : 'on';
            }
        }
        return $ticked;
    }

    /**
     * The publication-page display values (U13) are built and parity-checked
     * on a journal and a preprint server. A press keeps its categories, cover
     * and URL Path on the "Catalog Entry" page; its "Categories" field is
     * parity-checked (U16: the page's "Save" is the same PUT to the
     * publication, the core's third page), so `categories` is accepted, and
     * so is its "Date Published" box (U17, `datePublished`, the same PUT),
     * its "URL Path" (U70) and, on the shared lib/pkp pages, "Subtitle",
     * "Plain Language Summary" and "Keywords" (U69, driven equal).
     * The rest have no parity drive on a press and are refused, never
     * dropped (PRINCIPLES D4).
     */
    protected function assertPublicationPagesSupported(string $specKey): void
    {
        if (in_array($specKey, self::OMP_PUBLICATION_PAGE_KEYS, true)) {
            return;
        }
        throw new SpecException($specKey, "\"{$specKey}\" is not built for OMP yet: the press's publication pages (\"Catalog Entry\" and its siblings) have no parity check for it; only " . implode(', ', self::OMP_PUBLICATION_PAGE_KEYS) . ' are built');
    }

    /**
     * The publication-page keys a press takes: the "Catalog Entry" page's
     * `categories` (U16), `datePublished` (U17), `urlPath` (U70), and
     * (U69) the "Title & Abstract" page's `subtitle` and
     * `plainLanguageSummary` and the "Metadata" page's `keywords`, the same
     * lib/pkp pages and PUT as on a journal.
     */
    public const OMP_PUBLICATION_PAGE_KEYS = ['categories', 'datePublished', 'urlPath', 'subtitle', 'plainLanguageSummary', 'keywords'];

    /** The Catalog page's lists a flag lives in, by the place word of `featured[]` / `newRelease[]`. */
    private const CATALOG_PLACES = ['catalog', 'category', 'series'];

    /**
     * `featured[]` and `newRelease[]` (U70): the Catalog page's "Featured"
     * and "New release" boxes of this book, each entry one box pressed in
     * a list, in the order given: `{in: 'catalog'}` with no filter,
     * `{in: 'category', path}` with that category chosen under "Filters",
     * `{in: 'series', path}` with that series chosen. A `featured[]` entry
     * may add `position` (1 = first): "Order Features", the book moved to
     * that place among the list's featured books, "Save Order". The page
     * lists published books only, so both keys need `published: true`
     * (and a publication date not after today); a category or series
     * filter lists the book only once it is placed there, so the path must
     * be among `categories` or be `series`. The page cannot hold a book in
     * two categories' (or two series') lists of one kind (the box's lookup
     * matches the kind alone, spec A4), so a second one is a 400, as is the
     * same list twice. Parse phase: no writes.
     */
    protected function parsePublishOverlay(Context $context, Spec $root): array
    {
        $plan = ['featured' => [], 'newRelease' => []];
        foreach (array_keys($plan) as $key) {
            if (!$root->has($key)) {
                continue;
            }
            if (!$root->get('published', false)) {
                throw new SpecException($key, 'The Catalog page lists published books only: ' . $key . ' needs published: true');
            }
            $seen = [];
            foreach ($root->childList($key) as $spec) {
                $in = $spec->require('in');
                if (!in_array($in, self::CATALOG_PLACES, true)) {
                    throw new SpecException("{$spec->path}.in", 'in must be one of: ' . implode(', ', self::CATALOG_PLACES));
                }
                $assocType = Application::ASSOC_TYPE_PRESS;
                $assocId = (int) $context->getId();
                if ($in === 'catalog') {
                    if ($spec->has('path')) {
                        throw new SpecException("{$spec->path}.path", 'The whole catalog takes no path');
                    }
                } else {
                    $path = $spec->require('path');
                    if ($in === 'category') {
                        $assocType = Application::ASSOC_TYPE_CATEGORY;
                        if (!in_array($path, (array) $root->get('categories', []), true)) {
                            throw new SpecException("{$spec->path}.path", "The \"{$path}\" filter lists the book only once it is in that category: name it in categories");
                        }
                        $category = Repo::category()->getCollector()->filterByContextIds([$context->getId()])->getMany()
                            ->first(fn ($category) => $category->getPath() === $path);
                        $assocId = $category ? (int) $category->getId() : throw new SpecException("{$spec->path}.path", "No category \"{$path}\" in \"{$context->getPath()}\"");
                    } else {
                        $assocType = Application::ASSOC_TYPE_SERIES;
                        if ($path !== $root->get('series')) {
                            throw new SpecException("{$spec->path}.path", "The \"{$path}\" filter lists the book only once it is in that series: give it as series");
                        }
                        $assocId = (int) BootstrapSeeder::findSeriesId($context, (string) $path);
                    }
                    if (isset($seen[$in])) {
                        throw new SpecException($spec->path, "The Catalog page cannot keep one book in two {$in} lists of one kind: pressing the box in a second {$in} takes it out of the first (spec A4)");
                    }
                }
                $seen[$in] = true;
                $position = null;
                if ($spec->has('position')) {
                    if ($key !== 'featured') {
                        throw new SpecException("{$spec->path}.position", '"Order Features" orders the featured books only');
                    }
                    $position = $spec->get('position');
                    if (!is_int($position) || $position < 1) {
                        throw new SpecException("{$spec->path}.position", 'position is a place among the list\'s featured books, a whole number from 1');
                    }
                }
                $plan[$key][] = ['specPath' => $spec->path, 'assocType' => $assocType, 'assocId' => $assocId, 'position' => $position];
            }
        }
        return $plan;
    }

    /**
     * The Catalog page's boxes (U70), after the publish, acting as the
     * press manager on the page: each press of a box is the item's own
     * post, `saveDisplayFlags` with the book's stored featured and new
     * release lists plus the pressed one (`seq: 1`, as the box posts it),
     * through BackendSubmissionsController::saveDisplayFlags itself (which
     * deletes and re-inserts the book's rows and resequences each list).
     * A `position` is then "Order Features", the book moved, "Save Order":
     * the panel numbers the list's featured books from 0 in the order the
     * page shows them (the published books of that list, featured first by
     * their stored order) and posts `saveFeaturedOrder`, through the
     * controller's own action.
     */
    protected function afterPublish(Context $context, int $submissionId, array $overlayPlan): void
    {
        if (($overlayPlan['featured'] ?? []) === [] && ($overlayPlan['newRelease'] ?? []) === []) {
            return;
        }
        $submission = Repo::submission()->get($submissionId);
        if ((int) $submission->getData('status') !== \APP\submission\Submission::STATUS_PUBLISHED) {
            throw new SpecException(($overlayPlan['featured'] ?? []) !== [] ? 'featured' : 'newRelease', 'The book was scheduled, not published (its "Date Published" lies after today), and the Catalog page lists published books only');
        }
        $featureDao = \PKP\db\DAORegistry::getDAO('FeatureDAO'); /** @var \APP\press\FeatureDAO $featureDao */
        $newReleaseDao = \PKP\db\DAORegistry::getDAO('NewReleaseDAO'); /** @var \APP\press\NewReleaseDAO $newReleaseDao */
        $controller = new \APP\API\v1\_submissions\BackendSubmissionsController();
        $post = function (string $action, array $body, string $specPath) use ($controller): void {
            $request = \PKP\testing\ApiCall::request(\Illuminate\Http\Request::class, 'POST', $body, [], $specPath, 'The Catalog page\'s post would be refused');
            $response = $controller->$action($request);
            if ($response->getStatusCode() >= 300) {
                throw new SpecException($specPath, "The Catalog page's {$action} was refused (HTTP {$response->getStatusCode()}): " . json_encode($response->getData(true)));
            }
        };
        foreach (['featured', 'newRelease'] as $key) {
            foreach ($overlayPlan[$key] ?? [] as $place) {
                $flags = [
                    'featured' => $featureDao->getFeaturedAll($submissionId),
                    'newRelease' => $newReleaseDao->getNewReleaseAll($submissionId),
                ];
                $flags[$key][] = ['assoc_type' => $place['assocType'], 'assoc_id' => $place['assocId'], 'seq' => 1];
                $post('saveDisplayFlags', ['submissionId' => $submissionId] + $flags, $place['specPath']);
                if ($place['position'] === null) {
                    continue;
                }
                // The list as the page shows it (CatalogListPanel's
                // getParams: published, featured first; one page of 30),
                // then the featured ones in that order, as
                // setItemOrderSequence collects them (a feature of the
                // list's kind).
                $collector = Repo::submission()->getCollector()
                    ->filterByContextIds([$context->getId()])
                    ->filterByStatus([\APP\submission\Submission::STATUS_PUBLISHED])
                    ->orderByFeatured()
                    ->limit(30);
                if ($place['assocType'] === Application::ASSOC_TYPE_CATEGORY) {
                    $collector->filterByCategoryIds([$place['assocId']]);
                } elseif ($place['assocType'] === Application::ASSOC_TYPE_SERIES) {
                    $collector->filterBySeriesIds([$place['assocId']]);
                }
                $ordered = [];
                foreach ($collector->getIds() as $id) {
                    foreach ($featureDao->getFeaturedAll((int) $id) as $feature) {
                        if ($feature['assoc_type'] === $place['assocType']) {
                            $ordered[] = (int) $id;
                            break;
                        }
                    }
                }
                if ($place['position'] > count($ordered)) {
                    throw new SpecException("{$place['specPath']}.position", 'The list has ' . count($ordered) . ' featured book(s): position ' . $place['position'] . ' is past its end');
                }
                $ordered = array_values(array_diff($ordered, [$submissionId]));
                array_splice($ordered, $place['position'] - 1, 0, [$submissionId]);
                $post('saveFeaturedOrder', [
                    'assocType' => $place['assocType'],
                    'assocId' => $place['assocId'],
                    'featured' => array_map(fn (int $id, int $seq) => ['id' => $id, 'seq' => $seq], $ordered, array_keys($ordered)),
                ], "{$place['specPath']}.position");
            }
        }
    }

    /**
     * `enableChapterPublicationDates` and `chapters[]` (U72). The first is
     * the editorial view's "Marketing" › "Publication Dates" choice
     * (`true` "Each chapter may have its own publication date.", `false`
     * "All chapters will use the publication date of the monograph."), a
     * workflow page, so it needs `submitted: true`. Each `chapters[]` entry
     * is one "Add Chapter" window: `title*`, `subtitle`, `abstract` (a
     * string or a locale map over the window's languages), `pages`,
     * `datePublished` (`YYYY-MM-DD`; the box shows only with
     * `enableChapterPublicationDates: true`), `licenseUrl` (the box shows
     * on an Edited Volume only), `page` (the "Chapter Page" box), `authors`
     * (the "Add Contributor" boxes: the submitter's username or a
     * contributor's email, in the Contributors-list order the window lists
     * them) and `files` (the "Files" boxes: `files.N` for a root `files[]`
     * entry, `publicationFormats.N` for a format's proof file; one chapter
     * at most per file, as the window offers a held file to no other
     * chapter). Parse phase: no writes; the title rule is the form's own,
     * judged at execute.
     */
    protected function parseVersionOverlay(Context $context, Spec $root, array $refs): array
    {
        $plan = ['enableChapterPublicationDates' => null, 'chapters' => []] + $this->parseMarketing($root, $refs['submitted']);
        if ($root->has('enableChapterPublicationDates')) {
            $value = $root->get('enableChapterPublicationDates');
            if (!is_bool($value)) {
                throw new SpecException('enableChapterPublicationDates', 'enableChapterPublicationDates is the "Publication Dates" choice: true ("Each chapter may have its own publication date.") or false ("All chapters will use the publication date of the monograph.")');
            }
            if (!$refs['submitted']) {
                throw new SpecException('enableChapterPublicationDates', '"Marketing" › "Publication Dates" is on the workflow\'s editorial view, which a draft does not have: it needs submitted: true');
            }
            $plan['enableChapterPublicationDates'] = $value;
        }
        $editedVolume = $root->get('workType', 'monograph') === 'editedVolume';
        $formLocales = array_keys($context->getSupportedFormLocaleNames());
        $heldFiles = [];
        foreach ($root->childList('chapters') as $spec) {
            $localized = function (string $key, bool $required) use ($spec, $formLocales): ?array {
                $value = $required ? $spec->require($key) : $spec->get($key);
                if ($value === null) {
                    return null;
                }
                if (is_string($value)) {
                    return [null => $value];
                }
                if (!is_array($value) || array_is_list($value)) {
                    throw new SpecException("{$spec->path}.{$key}", "{$key} is a string or a locale map");
                }
                foreach ($value as $locale => $text) {
                    if (!in_array($locale, $formLocales, true)) {
                        throw new SpecException("{$spec->path}.{$key}", "The chapter window has no \"{$locale}\" box: " . implode(', ', $formLocales));
                    }
                    if (!is_string($text)) {
                        throw new SpecException("{$spec->path}.{$key}", "Each {$key} value is a string");
                    }
                }
                return $value;
            };
            $chapter = [
                'path' => $spec->path,
                'title' => $localized('title', true),
                'subtitle' => $localized('subtitle', false),
                'abstract' => $localized('abstract', false),
                'pages' => $spec->get('pages'),
                'datePublished' => $spec->get('datePublished'),
                'licenseUrl' => $spec->get('licenseUrl'),
                'page' => $spec->get('page', false),
                'authors' => $spec->get('authors', []),
                'files' => [],
            ];
            foreach (['pages', 'licenseUrl'] as $key) {
                if ($chapter[$key] !== null && !is_string($chapter[$key])) {
                    throw new SpecException("{$spec->path}.{$key}", "{$key} is the box's text, a string");
                }
            }
            if ($chapter['datePublished'] !== null) {
                if ($plan['enableChapterPublicationDates'] !== true) {
                    throw new SpecException("{$spec->path}.datePublished", 'The chapter window shows "Date Published" only while the book\'s "Publication Dates" reads "Each chapter may have its own publication date.": give enableChapterPublicationDates: true');
                }
                $date = $chapter['datePublished'];
                if (!is_string($date) || !preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $date, $m) || !checkdate((int) $m[2], (int) $m[3], (int) $m[1])) {
                    throw new SpecException("{$spec->path}.datePublished", 'datePublished is a calendar day written YYYY-MM-DD, as the date picker fills the box');
                }
            }
            if ($chapter['licenseUrl'] !== null && !$editedVolume) {
                throw new SpecException("{$spec->path}.licenseUrl", 'The chapter window shows "License URL" on an Edited Volume only: give workType: "editedVolume"');
            }
            if (!is_bool($chapter['page'])) {
                throw new SpecException("{$spec->path}.page", 'page is the "Chapter Page" box, a boolean');
            }
            if (!is_array($chapter['authors']) || !array_is_list($chapter['authors']) || array_filter($chapter['authors'], fn ($a) => !is_string($a) || $a === '') !== []) {
                throw new SpecException("{$spec->path}.authors", 'authors is a list of the submitter\'s username or contributors\' emails');
            }
            if (count(array_unique($chapter['authors'])) !== count($chapter['authors'])) {
                throw new SpecException("{$spec->path}.authors", 'authors names a contributor twice; the window ticks each box once');
            }
            foreach ($chapter['authors'] as $i => $author) {
                if ($author !== $refs['submitter'] && !in_array($author, $refs['contributorEmails'], true)) {
                    throw new SpecException("{$spec->path}.authors.{$i}", "\"{$author}\" is neither the submitter ({$refs['submitter']}) nor the email of a contributors[] entry");
                }
            }
            $files = $spec->get('files', []);
            if (!is_array($files) || !array_is_list($files)) {
                throw new SpecException("{$spec->path}.files", 'files is a list of "files.N" or "publicationFormats.N"');
            }
            foreach ($files as $i => $ref) {
                if (!is_string($ref) || !preg_match('/^(files|publicationFormats)\.(\d+)$/', $ref, $m)) {
                    throw new SpecException("{$spec->path}.files.{$i}", 'Each file is "files.N" (a root files[] entry) or "publicationFormats.N" (that format\'s proof file)');
                }
                $index = (int) $m[2];
                $exists = $m[1] === 'files' ? $index < $refs['fileCount'] : ($refs['formatFiles'][$index] ?? false);
                if (!$exists) {
                    throw new SpecException("{$spec->path}.files.{$i}", "No file at \"{$ref}\" in this request" . ($m[1] === 'publicationFormats' ? ' (a format needs file)' : ''));
                }
                if (isset($heldFiles[$ref])) {
                    throw new SpecException("{$spec->path}.files.{$i}", "\"{$ref}\" belongs to {$heldFiles[$ref]} already; the chapter window offers a file another chapter holds to no one");
                }
                $heldFiles[$ref] = $spec->path;
                $chapter['files'][] = [$m[1], $index];
            }
            $plan['chapters'][] = $chapter;
        }
        if ($plan['enableChapterPublicationDates'] === null && $plan['chapters'] === [] && $plan['audience'] === null && $plan['representatives'] === [] && $plan['formatTrade'] === []) {
            return [];
        }
        return $plan;
    }

    /**
     * The book's "Marketing" pages (U74), which belong to the book, not to
     * a version:
     * - `audience` {audience?, rangeQualifier?, rangeFrom?, rangeTo?,
     *   rangeExact?}: "Marketing" › "Audience", each list by the label it
     *   shows ("Children (02)", "US school grade range (11)",
     *   "Kindergarten (K)"), at least one; "Save";
     * - `representatives[]` {type*, role*, name*, idType?, idValue?,
     *   phone?, email?, website?}: "Marketing" › "Representatives" ›
     *   "Add Representative": `type` 'agent' or 'supplier' ("Representative
     *   Type"), `role` by the label of that type's list, `idType` by its
     *   label (the window arrives on "GLN (06)"), the boxes as typed; an
     *   "Email Address" or "Website" the box refuses is a 400; "OK".
     * Also checks each format's markets[] `agent` and `supplier` against
     * them: the window lists the book's representatives of that type by
     * name. Parse phase: no writes.
     *
     * @return array{audience: ?array, representatives: array, formatTrade: array}
     */
    private function parseMarketing(Spec $root, bool $submitted): array
    {
        $draftRefusal = fn (string $key) => new SpecException($key, "\"Marketing\" is on the workflow's editorial view, which a draft does not have: {$key} needs submitted: true");

        $audience = null;
        if (($spec = $root->child('audience')) !== null) {
            if (!$submitted) {
                throw $draftRefusal('audience');
            }
            $lists = [
                'audience' => ['28', 'Audience'],
                'audienceRangeQualifier' => ['30', 'Audience Range Qualifier'],
                'audienceRangeFrom' => ['77', 'Audience Range (from)'],
                'audienceRangeTo' => ['77', 'Audience Range (to)'],
                'audienceRangeExact' => ['77', 'Audience Range (exact)'],
            ];
            $keys = ['audience' => 'audience', 'rangeQualifier' => 'audienceRangeQualifier', 'rangeFrom' => 'audienceRangeFrom', 'rangeTo' => 'audienceRangeTo', 'rangeExact' => 'audienceRangeExact'];
            $audience = [];
            foreach ($keys as $key => $field) {
                // The page posts every list; one never chosen is posted empty.
                $audience[$field] = $this->optionalOnixCode($spec, $key, $lists[$field][0], $lists[$field][1]);
            }
            if (array_filter($audience) === []) {
                throw new SpecException('audience', 'audience names at least one of its lists: audience, rangeQualifier, rangeFrom, rangeTo, rangeExact');
            }
        }

        $representatives = [];
        foreach ($root->childList('representatives') as $spec) {
            if (!$submitted) {
                throw $draftRefusal('representatives');
            }
            $type = $spec->require('type');
            if (!in_array($type, ['agent', 'supplier'], true)) {
                throw new SpecException("{$spec->path}.type", 'type is the "Representative Type" radio: "agent" or "supplier"');
            }
            $name = $spec->require('name');
            if (!is_string($name) || trim($name) === '') {
                throw new SpecException("{$spec->path}.name", 'name is the required "Name" box: a non-empty string');
            }
            $entry = [
                'path' => $spec->path,
                'type' => $type,
                'role' => $this->onixCode($type === 'agent' ? '69' : '93', $spec->require('role'), "{$spec->path}.role", 'Role'),
                'name' => $name,
                'idType' => $this->optionalOnixCode($spec, 'idType', '92', 'Representative ID Type (GLN is recommended)', '06'),
                'idValue' => $this->optionalText($spec, 'idValue', 'Representative ID'),
                'phone' => $this->optionalText($spec, 'phone', 'Phone'),
                'email' => $this->optionalText($spec, 'email', 'Email Address'),
                'website' => $this->optionalText($spec, 'website', 'Website'),
            ];
            if ($entry['email'] !== '' && filter_var($entry['email'], FILTER_VALIDATE_EMAIL) === false) {
                throw new SpecException("{$spec->path}.email", 'The "Email Address" box refuses text that is not an email address');
            }
            if ($entry['website'] !== '' && !preg_match('~^(https?|ftp)://[^\s/?.#][^\s]*$~i', $entry['website'])) {
                throw new SpecException("{$spec->path}.website", 'The "Website" box refuses text that is not a web address (http://, https:// or ftp://)');
            }
            $representatives[] = $entry;
        }

        foreach ($this->formatTradePlans as $trade) {
            foreach ($trade['markets'] as $market) {
                foreach (['agent', 'supplier'] as $type) {
                    if ($market[$type] === null) {
                        continue;
                    }
                    $named = array_filter($representatives, fn (array $r) => $r['type'] === $type && $r['name'] === $market[$type]);
                    if (count($named) !== 1) {
                        $offered = array_column(array_filter($representatives, fn (array $r) => $r['type'] === $type), 'name');
                        throw new SpecException("{$market['path']}.{$type}", "The \"" . ucfirst($type) . '" list ' . (count($named) > 1 ? 'shows ' . json_encode($market[$type]) . ' twice; give the representatives distinct names' : 'offers no ' . json_encode($market[$type]) . '; it offers the book\'s representatives[] of that type: ' . json_encode(array_values($offered))));
                    }
                }
            }
        }
        $formatTrade = array_filter($this->formatTradePlans, fn (array $trade) => $trade['salesRights'] !== [] || $trade['markets'] !== []);

        return ['audience' => $audience, 'representatives' => $representatives, 'formatTrade' => $formatTrade];
    }

    /**
     * Build `enableChapterPublicationDates` and `chapters[]` (U72), acting as
     * the editor (admin), before any publish:
     * 1. "Marketing" › "Publication Dates", the choice, "Save": the page's
     *    PUT submissions/{id} (`enableChapterPublicationDates=true|false`)
     *    through PKPSubmissionController::edit itself (ApiCall);
     * 2. per chapter, the Chapters page's "Add Chapter", the boxes, "Save":
     *    ChapterForm run as ChapterGridHandler::updateChapter runs it on
     *    the window's POST (FormPost: readInputData, the form's title rule,
     *    execute: the chapter at the list's end, its author links in the
     *    order the ticked boxes are posted, its file links). Each
     *    multilingual box carries every language the window offers, an
     *    untyped one empty; "Date Published" and "License URL" are posted
     *    only where the window shows them, empty unless given. Not run: the
     *    handler's "Your changes have been saved." toast.
     */
    protected function seedVersionOverlay(Context $context, int $submissionId, array $plan, User $editor, array $built): array
    {
        $previousActingUser = Registry::get('user');
        Registry::set('user', $editor);
        try {
            $response = $this->seedMarketing($submissionId, $plan, $built['publicationFormats']);

            if ($plan['enableChapterPublicationDates'] !== null) {
                $controller = ApiCall::controller(\APP\API\v1\submissions\SubmissionController::class, [
                    Application::ASSOC_TYPE_SUBMISSION => Repo::submission()->get($submissionId),
                    Application::ASSOC_TYPE_USER_ROLES => [Role::ROLE_ID_SITE_ADMIN, Role::ROLE_ID_MANAGER],
                ]);
                $request = ApiCall::request(
                    \Illuminate\Http\Request::class,
                    'PUT',
                    ['enableChapterPublicationDates' => $plan['enableChapterPublicationDates'] ? 'true' : 'false'],
                    ['submissionId' => $submissionId],
                    'enableChapterPublicationDates',
                    'The "Publication Dates" "Save" would be refused'
                );
                ApiCall::answer($controller->edit($request), 'enableChapterPublicationDates', 'The "Publication Dates" "Save" was refused');
            }

            $seeded = [];
            foreach ($plan['chapters'] as $chapter) {
                $submission = Repo::submission()->get($submissionId);
                $publication = Repo::publication()->get((int) $submission->getData('currentPublicationId'));
                $form = new ChapterForm($submission, $publication, null);
                // The window's language boxes: the press's form languages (the
                // page request's Locale::getSupportedFormLocales()).
                $formLocales = array_keys($context->getSupportedFormLocaleNames());
                $boxes = function (?array $value, bool $rich = false) use ($formLocales, $submission): array {
                    $value ??= [];
                    if (array_key_exists('', $value)) {
                        $value = [$submission->getData('locale') => $value['']];
                    }
                    $posted = [];
                    foreach ($formLocales as $locale) {
                        $text = (string) ($value[$locale] ?? '');
                        // The rich-text box posts typed text as a paragraph.
                        $posted[$locale] = $rich && $text !== '' && !str_starts_with(ltrim($text), '<') ? "<p>{$text}</p>" : $text;
                    }
                    return $posted;
                };

                // The "Add Contributor" boxes: this version's contributors
                // in their list order; the ticked ones are posted in it.
                $authors = Repo::author()->getCollector()->filterByPublicationIds([$publication->getId()])->getMany();
                $byEmail = [];
                $windowOrder = [];
                foreach ($authors as $author) {
                    $windowOrder[] = (int) $author->getId();
                    $byEmail[$author->getEmail()] ??= (int) $author->getId();
                }
                $ticked = [];
                foreach ($chapter['authors'] as $i => $name) {
                    $email = $name === $built['submitter']->getUsername() ? $built['submitter']->getEmail() : $name;
                    if (!isset($byEmail[$email])) {
                        throw new SpecException("{$chapter['path']}.authors.{$i}", "The version has no contributor \"{$name}\" (a submitter who does not submit as an Author has no entry)");
                    }
                    $ticked[] = $byEmail[$email];
                }
                $posted = array_values(array_filter($windowOrder, fn (int $id) => in_array($id, $ticked, true)));
                if ($posted !== $ticked) {
                    throw new SpecException("{$chapter['path']}.authors", 'The window lists the contributors in the Contributors-list order and saves the ticked ones in it: name them in that order (the chapter\'s "Order" is a screen action)');
                }

                $fileIds = [];
                foreach ($chapter['files'] as [$list, $index]) {
                    $fileIds[] = (string) ($list === 'files' ? $built['files'][$index]['submissionFileId'] : $built['publicationFormats'][$index]['submissionFileId']);
                }

                $vars = [
                    'submissionId' => (string) $submissionId,
                    'publicationId' => (string) $publication->getId(),
                    'chapterId' => '',
                    'title' => $boxes($chapter['title']),
                    'subtitle' => $boxes($chapter['subtitle']),
                    'abstract' => $boxes($chapter['abstract'], true),
                    'pages' => (string) ($chapter['pages'] ?? ''),
                ];
                if ($submission->getEnableChapterPublicationDates()) {
                    $vars['datePublished'] = (string) ($chapter['datePublished'] ?? '');
                }
                if ($submission->getData('workType') === \APP\submission\Submission::WORK_TYPE_EDITED_VOLUME) {
                    $vars['licenseUrl'] = (string) ($chapter['licenseUrl'] ?? '');
                }
                if ($chapter['page']) {
                    $vars['isPageEnabled'] = '1';
                }
                if ($ticked !== []) {
                    $vars['authors'] = array_map('strval', $ticked);
                }
                if ($fileIds !== []) {
                    $vars['files'] = $fileIds;
                }
                FormPost::run($form, $vars, $chapter['path'], 'The chapter window\'s "Save" would be refused');
                $seeded[] = [
                    'id' => (int) $form->getChapter()->getId(),
                    'title' => (string) $form->getChapter()->getLocalizedTitle(),
                ];
            }
            return $response + ($plan['chapters'] === [] ? [] : ['chapters' => $seeded]);
        } finally {
            Registry::set('user', $previousActingUser);
        }
    }

    /**
     * Build the "Marketing" pages and the formats' trade lists (U74),
     * acting as the editor (admin), after the formats and before any
     * publish:
     * 1. "Audience" › "Save": the page's PUT submissions/{id} with its five
     *    lists, an unchosen one empty, through PKPSubmissionController::
     *    edit itself (ApiCall);
     * 2. per representative, "Add Representative", the window's fields,
     *    "OK": RepresentativeForm as RepresentativesGridHandler::
     *    updateRepresentative runs it (FormPost: its role check, execute);
     * 3. per format, in the "Metadata" tab, each "Add Sales Rights" › "OK"
     *    (SalesRightsForm: its one "Rest of World?" check) and each "Add
     *    Market" › "OK" (MarketForm: "Date" and "Price" required), the
     *    agent and supplier chosen by name among the book's
     *    representatives as the window lists them.
     * Not run: the handlers' "added" toasts.
     *
     * @param array<int, array{id: int}> $formats the seeded publicationFormats[], in order
     */
    private function seedMarketing(int $submissionId, array $plan, array $formats): array
    {
        if ($plan['audience'] !== null) {
            $controller = ApiCall::controller(\APP\API\v1\submissions\SubmissionController::class, [
                Application::ASSOC_TYPE_SUBMISSION => Repo::submission()->get($submissionId),
                Application::ASSOC_TYPE_USER_ROLES => [Role::ROLE_ID_SITE_ADMIN, Role::ROLE_ID_MANAGER],
            ]);
            $request = ApiCall::request(\Illuminate\Http\Request::class, 'PUT', $plan['audience'], ['submissionId' => $submissionId], 'audience', 'The "Audience" "Save" would be refused');
            ApiCall::answer($controller->edit($request), 'audience', 'The "Audience" "Save" was refused');
        }

        $seededRepresentatives = [];
        foreach ($plan['representatives'] as $entry) {
            $submission = Repo::submission()->get($submissionId);
            $id = FormPost::run(new RepresentativeForm($submission, null), [
                'representativeId' => '',
                'isSupplier' => $entry['type'] === 'supplier' ? '1' : '0',
                'agentRole' => $entry['type'] === 'agent' ? $entry['role'] : '',
                'supplierRole' => $entry['type'] === 'supplier' ? $entry['role'] : '',
                'name' => $entry['name'],
                'representativeIdType' => $entry['idType'],
                'representativeIdValue' => $entry['idValue'],
                'phone' => $entry['phone'],
                'email' => $entry['email'],
                'url' => $entry['website'],
            ], $entry['path'], 'The representative window would refuse this');
            $seededRepresentatives[] = ['id' => (int) $id, 'name' => $entry['name'], 'type' => $entry['type']];
        }

        $representativeDao = \PKP\db\DAORegistry::getDAO('RepresentativeDAO'); /** @var \APP\monograph\RepresentativeDAO $representativeDao */
        foreach ($plan['formatTrade'] as $index => $trade) {
            $submission = Repo::submission()->get($submissionId);
            $publication = Repo::publication()->get((int) $submission->getData('currentPublicationId'));
            $ids = [
                'submissionId' => (string) $submissionId,
                'publicationId' => (string) $publication->getId(),
                'representationId' => (string) $formats[$index]['id'],
            ];
            foreach ($trade['salesRights'] as $rights) {
                $vars = $ids + ['salesRightsId' => '', 'type' => $rights['type']] + array_filter(array_intersect_key($rights, array_flip(['countriesIncluded', 'countriesExcluded', 'regionsIncluded', 'regionsExcluded'])));
                if ($rights['restOfWorld']) {
                    $vars['ROWSetting'] = 'on';
                }
                FormPost::run(new SalesRightsForm($submission, $publication, null), $vars, $rights['path'], 'The sales-rights window would refuse this');
            }
            $listed = [
                'agent' => $this->representativeIdsByName($representativeDao->getAgentsByMonographId($submissionId)),
                'supplier' => $this->representativeIdsByName($representativeDao->getSuppliersByMonographId($submissionId)),
            ];
            foreach ($trade['markets'] as $market) {
                FormPost::run(new MarketForm($submission, $publication, null), $ids + [
                    'marketId' => '',
                    'date' => $market['date'],
                    'dateFormat' => $market['dateFormat'],
                    'dateRole' => $market['dateRole'],
                    'agentId' => $market['agent'] === null ? '' : (string) $listed['agent'][$market['agent']],
                    'supplierId' => $market['supplier'] === null ? '' : (string) $listed['supplier'][$market['supplier']],
                    'price' => $market['price'],
                    'currencyCode' => $market['currencyCode'],
                    'priceTypeCode' => $market['priceTypeCode'],
                    'taxRateCode' => $market['taxRateCode'],
                    'taxTypeCode' => $market['taxTypeCode'],
                    'discount' => $market['discount'],
                ] + array_filter(array_intersect_key($market, array_flip(['countriesIncluded', 'countriesExcluded', 'regionsIncluded', 'regionsExcluded']))), $market['path'], 'The market window would refuse this');
            }
        }

        return $plan['representatives'] === [] ? [] : ['representatives' => $seededRepresentatives];
    }

    /** The Agent or Supplier list of the market window: name → representative id. */
    private function representativeIdsByName(\PKP\db\DAOResultFactory $result): array
    {
        $byName = [];
        while ($representative = $result->next()) {
            $byName[$representative->getName()] ??= (int) $representative->getId();
        }
        return $byName;
    }

    /**
     * OMP's ManageFileApiHandler::getUpdateNotifications adds the internal
     * review's "revisions pending" notice to the lib/pkp one (U36).
     */
    protected function fileMetadataNoticeTypes(): array
    {
        return [
            Notification::NOTIFICATION_TYPE_PENDING_EXTERNAL_REVISIONS,
            Notification::NOTIFICATION_TYPE_PENDING_INTERNAL_REVISIONS,
        ];
    }

    protected function reviewStageIdForRound(Spec $roundSpec): int
    {
        $stage = (string) $roundSpec->get('stage', 'external');
        return match ($stage) {
            'internal' => WORKFLOW_STAGE_ID_INTERNAL_REVIEW,
            'external' => WORKFLOW_STAGE_ID_EXTERNAL_REVIEW,
            default => throw new SpecException("{$roundSpec->path}.stage", 'Review round stage must be "internal" or "external"'),
        };
    }
}
