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
 * (U47) is their counterpart here. Of the publication-page keys (U13) only
 * `categories` is taken, the "Catalog Entry" page's "Categories" (U16).
 */

namespace APP\testing;

use APP\controllers\grid\catalogEntry\form\PublicationFormatForm;
use APP\controllers\grid\catalogEntry\PublicationFormatGridHandler;
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
use PKP\testing\PKPSubmissionScenarioBuilder;
use PKP\testing\Spec;
use PKP\testing\SpecException;

class SubmissionScenarioBuilder extends PKPSubmissionScenarioBuilder
{
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
            $plans[] = [
                'path' => $spec->path,
                'name' => $name,
                'fixture' => $spec->has('file') ? $this->resolveFixture((string) $spec->get('file'), "{$spec->path}.file") : null,
                'genreId' => $spec->has('genre') ? $this->resolveUploadGenreId($context, $spec) : null,
            ];
        }
        return $plans;
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
                $form->setData('isPhysicalFormat', null);
                $form->setData('isbn10', '');
                $form->setData('isbn13', '');
                $form->setData('remoteURL', '');
                $form->setData('urlPath', '');
                $formatId = (int) $form->execute();

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
                    $terms->setData('salesType', 'openAccess');
                    $terms->setData('price', '');
                    $terms->execute();
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
     * so is its "Date Published" box (U17, `datePublished`, the same PUT).
     * The rest have no parity drive on a press and are refused, never
     * dropped (PRINCIPLES D4).
     */
    protected function assertPublicationPagesSupported(string $specKey): void
    {
        if (in_array($specKey, ['categories', 'datePublished'], true)) {
            return;
        }
        throw new SpecException($specKey, "\"{$specKey}\" is not built for OMP yet: the press's publication pages (\"Catalog Entry\" and its siblings) have no parity check for it; only \"categories\" and \"datePublished\" are built");
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
