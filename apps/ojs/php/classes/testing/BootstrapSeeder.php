<?php

/**
 * @file classes/testing/BootstrapSeeder.php
 *
 * Copyright (c) 2026 Simon Fraser University
 * Copyright (c) 2026 John Willinsky
 * Distributed under the GNU GPL v3. For full terms see the file docs/COPYING.
 *
 * @class BootstrapSeeder
 *
 * @brief OJS base seed: sections (by abbrev) and the issues overlay.
 */

namespace APP\testing;

use APP\controllers\grid\issues\form\IssueAccessForm;
use APP\controllers\grid\issues\form\IssueGalleyForm;
use APP\core\Application;
use APP\facades\Repo;
use PKP\context\Context;
use PKP\core\Core;
use PKP\core\PKPString;
use PKP\core\Registry;
use PKP\db\DAORegistry;
use APP\file\PublicFileManager;
use PKP\plugins\Hook;
use PKP\testing\ContextFactory;
use PKP\testing\FormPost;
use PKP\testing\LibraryFileSeeder;
use PKP\testing\PKPBootstrapSeeder;
use PKP\testing\Spec;
use PKP\testing\SpecException;

class BootstrapSeeder extends PKPBootstrapSeeder
{
    protected function structureKey(): string
    {
        return 'sections';
    }

    protected function parseStructure(Spec $spec): array
    {
        return [
            'abbrev' => (string) $spec->require('abbrev'),
            'title' => $spec->get('title'),
            'policy' => $spec->get('policy'),
            'wordCount' => $spec->get('wordCount'),
            'abstractsNotRequired' => (bool) $spec->get('abstractsNotRequired', false),
            'identifyType' => $spec->get('identifyType'),
            'hideTitle' => self::parseHideTitle($spec),
        ];
    }

    /**
     * A section's `hideTitle` (U50): the section form's "Omit the title of
     * this section from issues' table of contents." box (SectionForm saves
     * it as 1 / 0; the column defaults to 0, the box unticked). Null when
     * the key is absent; a non-boolean is a 400.
     */
    public static function parseHideTitle(Spec $spec): ?bool
    {
        if (!$spec->has('hideTitle')) {
            return null;
        }
        $value = $spec->get('hideTitle');
        if (!is_bool($value)) {
            throw new SpecException("{$spec->path}.hideTitle", 'hideTitle must be a boolean (true: the section form\'s "Omit the title of this section from issues\' table of contents." ticked)');
        }
        return $value;
    }

    protected function addStructure(Context $context, array $plan, int $sequence): int
    {
        return self::addSection($context, $plan, $sequence);
    }

    protected function resolveStructureId(Context $context, string $identifier): ?int
    {
        return self::findSectionId($context, $identifier);
    }

    public static function addSection(Context $context, array $plan, int $sequence): int
    {
        $locale = $context->getPrimaryLocale();
        $localize = fn ($value, $default = null) => is_array($value) ? $value : [$locale => $value ?? $default];

        // The Context::add hook already created the default "Articles"
        // section; the FIRST declared section renames/updates it (as a journal
        // manager would) instead of seeding a same-abbrev duplicate.
        if ($sequence === 1) {
            $existing = Repo::section()->getCollector()
                ->filterByContextIds([$context->getId()])
                ->getMany();
            if ($existing->count() === 1) {
                $params = [
                    'title' => $localize($plan['title'], $plan['abbrev']),
                    'abbrev' => $localize($plan['abbrev']),
                    'abstractsNotRequired' => $plan['abstractsNotRequired'] ?? false,
                ];
                if (($plan['policy'] ?? null) !== null) {
                    $params['policy'] = $localize($plan['policy']);
                }
                if (($plan['wordCount'] ?? null) !== null) {
                    $params['wordCount'] = (int) $plan['wordCount'];
                }
                if (($plan['identifyType'] ?? null) !== null) {
                    $params['identifyType'] = $localize($plan['identifyType']);
                }
                if (($plan['hideTitle'] ?? null) !== null) {
                    $params['hideTitle'] = $plan['hideTitle'];
                }
                $defaultSection = $existing->first();
                Repo::section()->edit($defaultSection, $params);
                return $defaultSection->getId();
            }
        }

        $section = Repo::section()->newDataObject();
        $section->setData('contextId', $context->getId());
        $section->setData('sequence', $sequence);
        $section->setData('editorRestricted', false);
        $section->setData('metaIndexed', true);
        $section->setData('metaReviewed', true);
        $section->setData('abstractsNotRequired', $plan['abstractsNotRequired'] ?? false);
        foreach ($localize($plan['title'], $plan['abbrev']) as $l => $value) {
            $section->setData('title', $value, $l);
        }
        foreach ($localize($plan['abbrev']) as $l => $value) {
            $section->setData('abbrev', $value, $l);
        }
        if (($plan['policy'] ?? null) !== null) {
            foreach ($localize($plan['policy']) as $l => $value) {
                $section->setData('policy', $value, $l);
            }
        }
        if (($plan['wordCount'] ?? null) !== null) {
            $section->setData('wordCount', (int) $plan['wordCount']);
        }
        if (($plan['identifyType'] ?? null) !== null) {
            foreach ($localize($plan['identifyType']) as $l => $value) {
                $section->setData('identifyType', $value, $l);
            }
        }
        if (($plan['hideTitle'] ?? null) !== null) {
            $section->setData('hideTitle', $plan['hideTitle']);
        }
        return Repo::section()->add($section);
    }

    /** Match a section by abbrev (any locale), case-insensitively. */
    public static function findSectionId(Context $context, string $identifier): ?int
    {
        $sections = Repo::section()->getCollector()
            ->filterByContextIds([$context->getId()])
            ->getMany();
        foreach ($sections as $section) {
            $abbrevs = (array) ($section->getData('abbrev') ?? []);
            foreach ($abbrevs as $abbrev) {
                if (strcasecmp((string) $abbrev, $identifier) === 0) {
                    return $section->getId();
                }
            }
        }
        return null;
    }

    protected function parseOverlay(Spec $root): array
    {
        return ['issues' => self::parseIssues($root)];
    }

    protected function executeOverlay(Context $context, array $overlayPlan): void
    {
        self::addIssues($context, $overlayPlan['issues'] ?? []);
    }

    /**
     * The `issues[]` list, shared by the bootstrap payload and the context
     * scenario (U08): {volume*, number*, year*, published?}; the context
     * scenario ($withCover) also reads coverImage (U13), datePublished and
     * galleys[] (U50), the galleys' locale checked against $formLocales,
     * and accessStatus / openAccessDate (U51), the issue's "Access" tab,
     * which exists only when $accessTab (the journal requires
     * subscriptions). Parse phase only; an unknown key in an entry is left
     * unconsumed, so it 400s.
     *
     * @return array<int, array{volume: int, number: string, year: int, published: bool}>
     */
    public static function parseIssues(Spec $root, bool $withCover = false, ?array $formLocales = null, bool $accessTab = false): array
    {
        $issues = [];
        foreach ($root->childList('issues') as $spec) {
            $published = $spec->get('published', false);
            if (!is_bool($published)) {
                throw new SpecException("{$spec->path}.published", 'published must be a boolean');
            }
            $whole = function (string $key) use ($spec): int {
                $value = $spec->require($key);
                if (!is_int($value) && !(is_string($value) && ctype_digit($value))) {
                    throw new SpecException("{$spec->path}.{$key}", "{$key} must be a whole number");
                }
                return (int) $value;
            };
            $number = $spec->require('number');
            if (!is_int($number) && !is_string($number)) {
                throw new SpecException("{$spec->path}.number", 'number must be a string or a whole number');
            }
            // `coverImage` {file*, altText?} (U13, the context scenario
            // only): the "Create Issue" form's "Cover image" upload, and the
            // alt text its "Edit" › "Issue Data" tab shows beside a stored
            // cover (the create form has no alt-text box).
            $coverImage = null;
            if ($withCover && ($coverSpec = $spec->child('coverImage')) !== null) {
                $fixture = LibraryFileSeeder::resolveFixture((string) $coverSpec->require('file'), "{$spec->path}.coverImage.file");
                $mimeType = PKPString::mime_content_type($fixture['path'], pathinfo($fixture['file'], PATHINFO_EXTENSION));
                if (!(new PublicFileManager())->getImageExtension($mimeType)) {
                    // IssueForm::validate's refusal (editor.issues.invalidCoverImageFormat).
                    throw new SpecException("{$spec->path}.coverImage.file", "The issue's cover image must be an image (gif, jpg, png, webp); \"{$fixture['file']}\" is {$mimeType}");
                }
                $altText = $coverSpec->get('altText');
                if ($altText !== null && (!is_string($altText) || $altText === '')) {
                    throw new SpecException("{$spec->path}.coverImage.altText", 'altText must be a non-empty string (the "Issue Data" tab\'s alt-text box)');
                }
                $coverImage = ['fixture' => $fixture, 'altText' => $altText];
            }
            // `datePublished` (U50, the context scenario only): the form's
            // "Date Published" box, typed as its date picker fills it
            // (YYYY-MM-DD; IssueForm::validate's date_format:Y-m-d). Kept by
            // "Publish Issue", which stamps today only on an empty box.
            $datePublished = null;
            if ($withCover && $spec->has('datePublished')) {
                $datePublished = $spec->get('datePublished');
                $parsed = is_string($datePublished) ? \DateTime::createFromFormat('!Y-m-d', $datePublished) : false;
                if (!$parsed || $parsed->format('Y-m-d') !== $datePublished) {
                    throw new SpecException("{$spec->path}.datePublished", 'datePublished must be a date as YYYY-MM-DD (the "Date Published" box)');
                }
            }
            // `galleys[]` (U50, the context scenario only): the "Issue
            // Galleys" tab's "Create Issue Galley" window, each {label*,
            // file*, locale?}; refused here as its form refuses them.
            $galleys = [];
            if ($withCover) {
                $primaryLocale = $formLocales[0] ?? null;
                foreach ($spec->childList('galleys') as $galleySpec) {
                    $label = $galleySpec->require('label');
                    if (!is_string($label) || trim($label) === '') {
                        throw new SpecException("{$galleySpec->path}.label", 'label must be a non-empty string (the window\'s required "Galley Label")');
                    }
                    $locale = $galleySpec->get('locale');
                    if ($locale !== null && (!is_string($locale) || !in_array($locale, (array) $formLocales, true))) {
                        throw new SpecException("{$galleySpec->path}.locale", 'locale must be one of the journal\'s form languages (' . implode(', ', (array) $formLocales) . '); the window refuses any other "Language"');
                    }
                    $galleys[] = [
                        'label' => $label,
                        'locale' => $locale,
                        'fixture' => LibraryFileSeeder::resolveFixture((string) $galleySpec->require('file'), "{$galleySpec->path}.file"),
                    ];
                }
            }
            // `accessStatus` / `openAccessDate` (U51, the context scenario
            // only): the issue's "Access" tab, "Access status" (`open`
            // "Open access", `subscription` "Subscription") and "Open access
            // date" (YYYY-MM-DD, the date picker's posted value; a past date
            // is accepted, as the box accepts it). The tab is offered only on
            // a journal that requires subscriptions.
            $access = null;
            if ($withCover && ($spec->has('accessStatus') || $spec->has('openAccessDate'))) {
                $key = $spec->has('accessStatus') ? 'accessStatus' : 'openAccessDate';
                if (!$accessTab) {
                    throw new SpecException("{$spec->path}.{$key}", 'The issue\'s "Access" tab shows only on a journal that requires subscriptions: give publishingMode: subscription in the same request');
                }
                $statuses = ['open' => \APP\issue\Issue::ISSUE_ACCESS_OPEN, 'subscription' => \APP\issue\Issue::ISSUE_ACCESS_SUBSCRIPTION];
                $status = $spec->get('accessStatus');
                if ($status !== null && (!is_string($status) || !isset($statuses[$status]))) {
                    throw new SpecException("{$spec->path}.accessStatus", 'accessStatus must be open ("Open access") or subscription ("Subscription"), the "Access status" list');
                }
                $openAccessDate = $spec->get('openAccessDate');
                if ($openAccessDate !== null) {
                    $parsed = is_string($openAccessDate) ? \DateTime::createFromFormat('!Y-m-d', $openAccessDate) : false;
                    if (!$parsed || $parsed->format('Y-m-d') !== $openAccessDate) {
                        throw new SpecException("{$spec->path}.openAccessDate", 'openAccessDate must be a date as YYYY-MM-DD (the "Open access date" box)');
                    }
                }
                $access = ['accessStatus' => $status === null ? null : $statuses[$status], 'openAccessDate' => $openAccessDate];
            }
            // `usage[]` (U64, the context scenario only): reader visits of
            // past days to the published issue's table of contents and its
            // galleys' files (UsageStatsSeeder::parseIssueUsage).
            $usage = $withCover ? UsageStatsSeeder::parseIssueUsage($spec, $published, count($galleys)) : [];
            $issues[] = [
                'volume' => $whole('volume'),
                'number' => (string) $number,
                'year' => $whole('year'),
                'published' => $published,
                'coverImage' => $coverImage,
                'datePublished' => $datePublished,
                'galleys' => $galleys,
                'access' => $access,
                'usage' => $usage,
            ];
        }
        return $issues;
    }

    /**
     * Create (and publish) the parsed issues in order: Issues › Future
     * Issues › "Create Issue" › "Save" with volume, number and year and the
     * "Title" show-box unticked (no title), then, for `published`, the
     * row's "Publish Issue" › "OK" with "Send an email about this to all
     * registered users." unticked. Returns one row per issue for the
     * scenario response.
     *
     * $asTheForm (the context scenario, U08 parity drive 2026-09-24) adds
     * the two writes the form's save makes that the base seed never made:
     * an empty "Title" and "Description" row in each of the journal's form
     * locales (the form posts both boxes empty) and the form's closing
     * Repo::issue()->edit, which stamps last_modified on an issue left
     * unpublished. The bootstrap keeps its rows as they were (PRINCIPLES
     * "Bootstrap data policy"); neither difference shows on any screen.
     *
     * @return array<int, array{id: int, volume: int, number: string, year: int, published: bool}>
     */
    public static function addIssues(Context $context, array $plans, bool $asTheForm = false): array
    {
        $created = [];
        foreach ($plans as $plan) {
            $issue = Repo::issue()->newDataObject();
            $issue->setData('journalId', $context->getId());
            $issue->setData('volume', $plan['volume']);
            $issue->setData('number', $plan['number']);
            $issue->setData('year', $plan['year']);
            $issue->setData('showVolume', true);
            $issue->setData('showNumber', true);
            $issue->setData('showYear', true);
            // Access status as the Create Issue form derives it from the
            // journal's publishing mode (IssueForm::execute ~246-258):
            // subscription/none → ISSUE_ACCESS_SUBSCRIPTION, open (and the
            // seed's unset default) → ISSUE_ACCESS_OPEN.
            $issue->setData('accessStatus', match ((int) $context->getData('publishingMode')) {
                \APP\journal\Journal::PUBLISHING_MODE_SUBSCRIPTION,
                \APP\journal\Journal::PUBLISHING_MODE_NONE => \APP\issue\Issue::ISSUE_ACCESS_SUBSCRIPTION,
                default => \APP\issue\Issue::ISSUE_ACCESS_OPEN,
            });
            $issue->setData('published', false);
            if (!empty($plan['datePublished'])) {
                // IssueForm::execute: setDatePublished from the typed box.
                $issue->setData('datePublished', $plan['datePublished']);
            }
            if ($asTheForm) {
                // IssueForm::execute: setTitle / setDescription from the
                // form's per-locale boxes, posted empty ("Title" unticked).
                foreach ($context->getSupportedFormLocales() ?: [$context->getPrimaryLocale()] as $locale) {
                    $issue->setData('title', '', $locale);
                    $issue->setData('description', '', $locale);
                }
            }
            Repo::issue()->add($issue);
            if (!empty($plan['coverImage'])) {
                // The form's "Cover image" (U13): its upload box's
                // upload-file (a temporary file of the acting manager, the
                // seeding admin), then IssueForm::execute ~287-300: the file
                // copied into the journal's public files as
                // cover_issue_{id}_{locale}{ext} under the manager's
                // interface language (the primary locale), set, saved.
                $admin = Repo::user()->getByUsername('admin', true);
                $temporaryFile = LibraryFileSeeder::upload($plan['coverImage']['fixture'], $admin);
                $publicFileManager = new PublicFileManager();
                $locale = $context->getPrimaryLocale();
                $fileName = 'cover_issue_' . $issue->getId() . '_' . $locale . $publicFileManager->getImageExtension($temporaryFile->getFileType());
                $publicFileManager->copyContextFile($context->getId(), $temporaryFile->getFilePath(), $fileName);
                $issue->setCoverImage($fileName, $locale);
                Repo::issue()->edit($issue, []);
            }
            if ($asTheForm) {
                // The form's closing save (IssueForm::execute ~306).
                Repo::issue()->edit($issue, []);
            }
            if (!empty($plan['coverImage']['altText'])) {
                // The issue's "Edit" › "Issue Data" › the alt-text box ›
                // "Save": the same form's execute over unchanged fields,
                // which sets the alt text under the manager's language.
                $issue = Repo::issue()->get($issue->getId());
                $issue->setCoverImageAltText($plan['coverImage']['altText'], $context->getPrimaryLocale());
                Repo::issue()->edit($issue, []);
            }

            $galleys = [];
            foreach ($plan['galleys'] ?? [] as $galleyPlan) {
                $galleys[] = self::addIssueGalley($context, $issue, $galleyPlan);
            }

            if ($plan['published']) {
                // The publish flow, mirrored from
                // IssueGridHandler::publishIssue (~544-633): DOI creation
                // (internally a no-op unless the journal enables issue DOIs
                // — a fresh journal enables publication DOIs only), published
                // flag + datePublished, the delayed-open-access branch (U51),
                // the publish hook, current-issue update, stale-DOI marking.
                // Its scheduled-publication sweep (nothing is assigned to a
                // new issue) and its notification batch (the dialog's email
                // box, seeded unticked) don't apply here.
                Repo::issue()->createDoi($issue);
                $issue->setData('published', true);
                if (!$issue->getData('datePublished')) {
                    $issue->setData('datePublished', Core::getCurrentDate());
                }
                // IssueGridHandler::publishIssue ~581-596, verbatim: on a
                // journal that requires subscriptions with "Delayed Open
                // Access" set, the issue becomes "Subscription" with the
                // open access date that many months from today.
                if ($context->getData('publishingMode') == \APP\journal\Journal::PUBLISHING_MODE_SUBSCRIPTION && ($delayDuration = $context->getData('delayedOpenAccessDuration'))) {
                    $delayYears = (int) floor($delayDuration / 12);
                    $delayMonths = (int) fmod($delayDuration, 12);
                    $curYear = date('Y');
                    $curMonth = date('n');
                    $curDay = date('j');
                    $delayOpenAccessYear = $curYear + $delayYears + (int) floor(($curMonth + $delayMonths) / 12);
                    $delayOpenAccessMonth = (int) fmod($curMonth + $delayMonths, 12);
                    $issue->setAccessStatus(\APP\issue\Issue::ISSUE_ACCESS_SUBSCRIPTION);
                    $issue->setOpenAccessDate(date('Y-m-d H:i:s', mktime(0, 0, 0, $delayOpenAccessMonth, $curDay, $delayOpenAccessYear)));
                }
                Hook::call('IssueGridHandler::publishIssue', [&$issue]);
                Repo::issue()->updateCurrent($context->getId(), $issue);
                Repo::doi()->issueUpdated($issue);
            }
            if (!empty($plan['access'])) {
                self::saveIssueAccess($context, (int) $issue->getId(), $plan['access']);
            }
            $created[] = [
                'id' => (int) $issue->getId(),
                'volume' => $plan['volume'],
                'number' => $plan['number'],
                'year' => $plan['year'],
                'published' => $plan['published'],
            ] + ($galleys ? ['galleys' => $galleys] : []);
        }
        return $created;
    }

    /**
     * The issue's "Access" tab › "Save" (U51), after the issue is created
     * and published: IssueGridHandler::updateAccess, the grid's own
     * IssueAccessForm run on the POST (FormPost). The tab arrives with the
     * issue's stored status and date, so what the seed does not name is
     * posted as the tab shows it. Saved after "Publish Issue", so it wins
     * over "Delayed Open Access", as a manager editing the tab afterwards.
     */
    public static function saveIssueAccess(Context $context, int $issueId, array $plan): void
    {
        $restoreContext = ContextFactory::forceRequestContext($context);
        try {
            $issue = Repo::issue()->get($issueId);
            $shownDate = $issue->getOpenAccessDate() ? substr((string) $issue->getOpenAccessDate(), 0, 10) : '';
            FormPost::run(new IssueAccessForm($issue), [
                'accessStatus' => (string) ($plan['accessStatus'] ?? $issue->getAccessStatus()),
                'openAccessDate' => $plan['openAccessDate'] ?? $shownDate,
            ], 'issues', 'The issue\'s "Access" tab would refuse this');
        } finally {
            $restoreContext();
        }
    }

    /**
     * One issue galley (U50): the issue's "Issue Galleys" tab › "Create
     * Issue Galley", its upload area's request (IssueGalleyGridHandler::
     * upload: TemporaryFileManager::handleUpload for the acting manager,
     * the seeding admin) and "Save" (IssueGalleyGridHandler::update: the
     * grid's own IssueGalleyForm, its data set as readInputData reads the
     * POST, then execute(): IssueFileManager::fromTemporaryFile, the
     * issue_galleys row at the end of the list, the form's execute hook).
     * The form's refusals were the parse phase's; its POST and CSRF checks
     * and the grid's refresh event are not run.
     *
     * @return array{id: int, label: string, locale: string, fileId: int}
     */
    public static function addIssueGalley(Context $context, \APP\issue\Issue $issue, array $plan): array
    {
        $admin = Repo::user()->getByUsername('admin', true);
        $restoreContext = ContextFactory::forceRequestContext($context);
        $previousActingUser = Registry::get('user');
        Registry::set('user', $admin);
        try {
            $temporaryFile = LibraryFileSeeder::upload($plan['fixture'], $admin);
            $request = Application::get()->getRequest();
            $form = new IssueGalleyForm($request, $issue);
            $form->setData('label', $plan['label']);
            // The "Language" list arrives on the forms' language, the
            // journal's primary locale for the seeding manager.
            $form->setData('galleyLocale', $plan['locale'] ?? $context->getPrimaryLocale());
            $form->setData('temporaryFileId', (string) $temporaryFile->getId());
            $form->setData('urlPath', '');
            $galleyId = (int) $form->execute();
        } finally {
            Registry::set('user', $previousActingUser);
            $restoreContext();
        }
        $issueGalleyDao = DAORegistry::getDAO('IssueGalleyDAO'); /** @var \APP\issue\IssueGalleyDAO $issueGalleyDao */
        $galley = $issueGalleyDao->getById($galleyId);
        return [
            'id' => $galleyId,
            'label' => (string) $galley->getLabel(),
            'locale' => (string) $galley->getLocale(),
            'fileId' => (int) $galley->getFileId(),
        ];
    }
}
