<?php

/**
 * @file classes/testing/PKPSubmissionScenarioBuilder.php
 *
 * Copyright (c) 2026 Simon Fraser University
 * Copyright (c) 2026 John Willinsky
 * Distributed under the GNU GPL v3. For full terms see the file docs/COPYING.
 *
 * @class PKPSubmissionScenarioBuilder
 *
 * @brief POST /api/v1/_test/scenarios/submission — walk a submission to a
 * declared end-state through the SAME services the wizard and workflow
 * screens use (PRINCIPLES D3): Repo::submission()->add()/submit() (real
 * SubmissionSubmitted event → stage-1 discussion, AssignEditors, tasks),
 * Repo::decision()->add() (real DecisionType::runAdditionalActions — a
 * sendExternalReview decision creates review round 1 itself),
 * EditorAction::addReviewer and ReviewerAction::confirmReview for reviewer
 * states. Tests never script the journey to their starting point.
 *
 * Step-2 core schema: tag*, context* (urlPath), submitter* (username), title,
 * abstract, locale, submitted (explicit false = wizard-resumable draft),
 * decisions[] (real decision names, app-resolved), reviewRounds[] with
 * reviewers[] {username, status: invited|accepted|declined|completed,
 * reviewForm, recommendation, comments, dateCompleted}, published.
 * Overlays: OJS section/issue; OMP series/seriesPosition + per-round stage
 * internal|external; OPS section (reviewRounds REJECTED — no review stage).
 * Richer keys return per feature, each with a parity entry.
 *
 * Feature passthroughs so far (each with a parity-ledger entry):
 * - reviewers[].status 'completed' (+ 'recommendation', 'comments') — U30:
 *   the reviewer wizard's own step forms run under the reviewer's identity
 *   (PKPReviewerReviewStep1Form → Step2Form → Step3Form::execute), so the
 *   assignment, the submission comment, the editors' REVIEWER_COMMENT
 *   notifications + REVIEW_COMPLETE email-log rows, the task deletion and
 *   the reviewReady event-log row are the app's own. 'accepted' keeps the
 *   bare confirmReview (step stays 1 — a documented deviation the U28
 *   suites walk from).
 * - participants[] {username*, role*, recommendOnly?, canChangeMetadata?} —
 *   non-submitter stage assignments (U21: an assigned Section Editor opening
 *   another author's draft), the same Repo::stageAssignment()->build() row
 *   the workflow's Assign Participant form writes. recommendOnly and
 *   canChangeMetadata (U35) are that window's "Assignment privileges" and
 *   "Permissions" boxes, defaulting to the user group's own recommendOnly /
 *   permitMetadataEdit as the window pre-ticks them; recommendOnly is
 *   refused on a role below sub-editor level and canChangeMetadata false on
 *   a manager-level role, as the window offers neither. The assignment
 *   email and notification the UI flow sends are deliberately absent
 *   (seed-side, Mail::fake anyway).
 * - author {orcid*, orcidIsVerified?} — ORCID iD fixture state on the
 *   submitter's contributor record (U4): a connected iD is only reachable
 *   through ORCID's own OAuth sign-in, which can never complete in the test
 *   env (outbound HTTP fails fast at the dead-port `[proxy]` in
 *   config.test.inc.php, and the sandbox ORCID credentials are dummies), so
 *   the unauthenticated/verified field states are seeded directly: the same
 *   author_settings rows the emailed link's landing stores
 *   (VerifyIdentityWithOrcid::setIdentityData), a verified iD carrying the
 *   live access token, scope, refresh token and expiry too
 *   (UserSeeder::orcidOAuthData; parity ledger 2026-09-13).
 * - reviewRounds[].reviewers[].reviewForm "<title>" — attaches the context's
 *   ACTIVE review form of that exact title to the assignment (U28), the
 *   same Repo::reviewAssignment()->edit(['reviewFormId']) the reviewer
 *   row's "Edit" window runs (EditReviewForm::execute; the window offers
 *   active forms only). A missing or inactive title is a 400 naming the
 *   active titles.
 * - reviewerSuggestions[] {givenName*, familyName?, email*, affiliation?,
 *   suggestionReason?} — the wizard's "Reviewer Suggestions" step entries
 *   (U31): the same ReviewerSuggestion::create() the step's "Add Reviewer
 *   Suggestion" window runs through POST submissions/{id}/reviewers/
 *   suggestions (ReviewerSuggestionController::add), validated with that
 *   request's own rules (AddReviewerSuggestion::rules + the multilingual
 *   rule) and created before submit(), as the wizard adds them (the API
 *   refuses add/edit/delete on a complete submission). The step exists
 *   only while the context's reviewerSuggestionEnabled is on, so a seed on
 *   a context with it off is a 400; OPS (no API mount, no step) refuses
 *   the key.
 * - userComments[] {user*, text*, approved? (default false), reports[]
 *   {user*, note*}} — reader comments on the published publication and
 *   their reports (U14): the same UserComment::query()->create() the
 *   comments API's POST runs (UserCommentController::submit), the same
 *   Repo::userComment()->addReport() its POST {id}/reports runs, and the
 *   controller's own notifyModerators() fan-out after each (one
 *   NOTIFICATION_LEVEL_TASK row per manager and site admin of the context:
 *   USER_COMMENT_POSTED on the comment, USER_COMMENT_REPORTED on the
 *   report), invoked on the controller by reflection so the moderator
 *   roster and the notification rows are the app's own, never mirrored.
 *   `approved: true` is the moderator's PUT {id}/setApproval written the
 *   way that action writes it (isApproved, approvedAt now, approvedByUserId
 *   the acting moderator — the seeding admin, a manager of every scratch
 *   context). The key needs `published: true` (the comment box exists on a
 *   published landing page only and the API refuses a publication that is
 *   not the current one); a report needs an approved comment (only the
 *   writer sees a pending or hidden one, so the "…" menu offers "Report"
 *   on approved comments alone) and a reporter other than the writer
 *   (one's own comment offers no "Report"). Text and note go through the
 *   form requests' PKPString::stripUnsafeHtml, as posted text does.
 * - galleys[] {label*, locale?, file | urlRemote} — galleys on the
 *   submission's current publication (U33), OJS and OPS only (OMP has
 *   publication formats, so the key is a 400 there): the same
 *   Repo::galley()->add() the "Galleys" page's "Add galley" › "Create New
 *   Galley" window runs (ArticleGalleyForm / PreprintGalleyForm::execute),
 *   followed by the grid handler's own notice recompute (updateGalley:
 *   NotificationManager::updateNotification of the app's galley notice
 *   types on a submission at Copyediting or Production), then, for `file`,
 *   the upload wizard "Upload a File Ready for Publication" step for step:
 *   the file service's add() into the submission's directory, a new
 *   SubmissionFile at SUBMISSION_FILE_PROOF hung on the galley
 *   (ASSOC_TYPE_REPRESENTATION, the app's submission-file repository links
 *   galley.submissionFileId), and the "Review Details" step's save
 *   (SubmissionFilesMetadataForm::execute + PKPManageFileApiHandler::
 *   saveMetadata's author-notification update and MetadataChanged event).
 *   `file` is a basename under apps/<app>/playwright/fixtures/files/,
 *   which bin/mount.js copies to classes/testing/fixtures/ in the checkout;
 *   the genre is the first the wizard's list offers (the context's first
 *   non-dependent genre, "Article Text"). `urlRemote` seeds the window's
 *   "Remotely hosted content" galley with no file (the wizard cancelled).
 * - files[] {file*, genre?, uploader?, note?} and reviewRounds[].files[]
 *   {file*, genre?} — submission files (U36), OJS and OMP only (a preprint
 *   server shows no workflow file list, so OPS refuses both). A root entry
 *   is a file on the Submission stage's "Submission Files" list. Uploaded
 *   by the submitter (the default), it is the submission wizard's "Files"
 *   panel upload, before the submit and as the submitter: the step for step
 *   of POST submissions/{id}/files (PKPSubmissionFileController::add:
 *   the file service's add, Repo::submissionFile()->validate and ->add at
 *   SUBMISSION_FILE_SUBMISSION, the name the uploaded file's own) and the
 *   panel's component choice (PUT submissions/{id}/files/{fileId}
 *   {genreId}: validate, ->edit). Uploaded by anyone else (a manager, the
 *   site admin, or a sub-editor or assistant seeded in participants[]), it
 *   is the workflow's "Upload" on "Submission Files" after the submit,
 *   acting as that user: the upload wizard's step 1
 *   (SubmissionFilesUploadForm::execute) and step 2
 *   (PKPManageFileApiHandler::saveMetadata), as galleys[] runs them. `note`
 *   is the file's "More Information" › "Notes" › "Add Note", posted by the
 *   acting editor (admin): NewFileNoteForm::execute and the handler's own
 *   notePosted event-log row (FileInformationCenterHandler::_logEvent). A
 *   round entry is the "Files for Review" list's "Upload/Select Files" ›
 *   "Upload Review File", acting as the editor, into the round before its
 *   reviewers are added, then that window's "OK" with the uploaded rows
 *   ticked (ManageReviewFilesForm::execute, which marks them viewable),
 *   and every seeded reviewer of the round is granted the round's
 *   files the way the Add Reviewer form's file list (all ticked by
 *   default, LimitReviewFilesGridHandler::isDataElementSelected) grants
 *   them (ReviewerForm::execute → ReviewFilesDAO::grant). `file` is a
 *   fixture basename, as for galleys[]; `genre` the name of one of the
 *   components the upload lists offer (enabled, not dependent), default
 *   the first main-work one ("Article Text", "Book Manuscript").
 * - tasks[] {title*, creator*, participants*, type?, stage?, owner?,
 *   dateDue?, started?, message?} — discussions and tasks on a stage's
 *   "Tasks & Discussions" panel (U37), each the panel's "Add" › "Save" by
 *   its creator, after everything else: the window's JSON body through
 *   the AddTask request's own rules and EditorialTaskController::addTask
 *   itself (ApiCall), then, for a started task, ::startTask ("Begin Task
 *   Upon Saving"). A past dateDue (the window refuses one, A10) is the one
 *   lifted rule: it stands for a due date passed since the save.
 * - libraryFiles[] {name*, type*, description?, file?} — the submission's
 *   Submission Library (U39): each the workflow header's "Library" ›
 *   "Add a file" window, its upload and its "OK", acting as the editor
 *   (admin), after everything but tasks[] (LibraryFileSeeder:
 *   TemporaryFileManager::handleUpload, then the submissionDocuments
 *   NewLibraryFileForm's execute). `type` is a label of the window's
 *   "Type" list, `file` a fixture basename (default the app's PDF
 *   fixture); the window has no "Public Access" box, so that key is a
 *   400. A draft has no workflow, so the key needs submitted: true.
 * - citationsRaw (string, or a list of lines) — the wizard's "Details"
 *   step References box (U42; PKPCitationsForm's FieldTextarea, saved
 *   by the step's PUT submissions/{id}/publications/{id} with the rest of
 *   the step): the same Repo::publication()->edit() that PUT runs
 *   (PKPSubmissionController::editPublication), whose DAO update rebuilds
 *   the version's citation rows from the text (Repo::citation()->
 *   importCitations: one row per line, trimmed, doubled spaces shrunk,
 *   blank lines skipped, and with the context's citationsMetadataLookup
 *   on the lookup job chain queued per row), before the submit and as the
 *   submitter. A list is joined with newlines, one line per entry.
 * - dataCitations[] {title*, relationshipType*, identifierType?,
 *   identifier?, repository?, year?, authors? [{givenName?, familyName?,
 *   orcid?}], url?} — the Data Citations table's "Add Data Citation" ›
 *   "Save" (U42; DataCitationEditForm), in the wizard's "Data" section or
 *   on the workflow's "Data" page alike: the panel's body through
 *   PKPDataCitationController::add itself (ApiCall: convertStringsToSchema,
 *   Repo::dataCitation()->validate, DataCitation::create, whose saving hook
 *   strips an identifier to its bare form), before the submit and in list
 *   order. The panel posts every box, an empty one as null; its refusals
 *   (a missing title or relationship type, a value outside the schema's
 *   lists, an identifier invalid for its type, a year not four digits, a
 *   bad address) are the seed's 400s.
 * - mediaFiles[] {file*, genre?, resolution?, name?, pair?} — the current
 *   publication's "Media" page (U47), all three apps, acting as the editor
 *   (admin), after the galleys and before a publish: each card's
 *   temporaryFiles upload, one "Upload Files" (MediaFilesController::add),
 *   "Edit Metadata" › "Save" per `name` (::edit) and, with any `pair`, one
 *   "Batch Link Media" › "Link Media" (::linkMany), each through the
 *   action's own form request (ApiCall). `genre` a dependent component the
 *   window lists (default "Image"), `resolution` web | high_resolution
 *   (the latter for a "File Variants" component only), `pair` a label two
 *   entries share, one of each resolution, of one component. A draft
 *   refuses the key.
 * - publicationFormats[] {name*, file?} — OMP only (a journal and a
 *   preprint server have galleys, so the key is a 400 there; galleys[] is
 *   their counterpart): a publication format on the current publication,
 *   ready for readers, as the "Publication Formats" page builds one
 *   (U47). The OMP overlay (APP\testing\SubmissionScenarioBuilder) owns
 *   it; this core refuses the key and runs the overlay's two steps: the
 *   format with its file before a publish, and its availability after.
 * - subtitle, plainLanguageSummary, keywords / subjects / disciplines /
 *   supportingAgencies, coverImage {file*, altText?}, categories (paths),
 *   urlPath, OJS articleNumber — the version's own display values (U13),
 *   typed on the workflow's publication pages by the editor after the
 *   submit and before any publish: "Title & Abstract", "Metadata" and
 *   "Publication Settings" (OPS "Preprint entry"), each a PUT
 *   submissions/{id}/publications/{id}. The seed saves each page whose
 *   fields it sets, in the shape that page posts them, through
 *   PKPSubmissionController::editPublication itself (ApiCall:
 *   convertStringsToSchema, Repo::publication()->validate — the URL Path
 *   rules among them — then ->edit, which moves the cover image's
 *   temporary file into the context's public files, and the
 *   MetadataChanged event), acting as the editor (admin), whose cover
 *   upload is the image box's POST temporaryFiles (handleUpload). The keys
 *   do not read the context's Metadata items or its "Article Number"
 *   setting, as the landing pages do not. OMP takes `categories` (U16)
 *   and `datePublished` (U17) alone, saved as the press's "Catalog Entry"
 *   page saves them (the same PUT, its "Categories" and "Date Published"
 *   fields), and refuses the rest (not parity-checked there).
 * - datePublished "YYYY-MM-DD" (U17) — the date box of the same page
 *   (OJS "Publication Date" on "Publication Settings", OPS "Date Posted"
 *   on "Preprint entry", OMP "Date Published" on "Catalog Entry"), saved
 *   in that page's PUT with its other fields. A later publish keeps it:
 *   each app's Repository::setStatusOnPublish stamps today only on an
 *   empty date, and on OMP and OPS a date after today schedules the
 *   version instead of publishing it.
 * - galleys[].urlPath and galleys[].genre (U13): the "Create New Galley"
 *   window's "URL Path" (ArticleGalleyForm / PreprintGalleyForm's own
 *   checks: the pattern, not a number, not a URL Path another galley of
 *   the version has) and the upload wizard's component, one of those its
 *   list offers (enabled, not dependent, so "Image" is refused). Neither
 *   exists for a remotely hosted galley, whose window hides "URL Path" and
 *   opens no wizard.
 * - jats {file?, makePublic?} — OJS only (the JATS API and the "JATS XML"
 *   publication page exist on a journal alone, so the key is a 400 on a
 *   press and a preprint server): the current publication's "JATS XML"
 *   page (U48), acting as the editor (admin), after the media files and
 *   before a publish. The OJS overlay (APP\testing\SubmissionScenarioBuilder)
 *   owns it; this core refuses the key and runs the overlay's step.
 *
 * - contributors[] {givenName*, familyName?, email*, country?} (U72): people
 *   with no account on the version's Contributors list, each the wizard's
 *   "Contributors" step "Add Contributor" › "Save" (a person, the "Author"
 *   box of "Contributor Roles" ticked, "Country" default CA) as the
 *   submitter before the submit: the panel's body through
 *   PKPSubmissionController::addContributor itself (ApiCall), which
 *   appends each after the list's last entry. The three apps alike.
 * - The app's version keys (parseVersionOverlay / seedVersionOverlay, OMP's
 *   enableChapterPublicationDates and chapters[], U72), built on the
 *   version after the formats and JATS and before any publish.
 *
 * - usage[] (U64): reader visits of past days to the published version,
 *   each entry {daysAgo | date, abstractViews?, fileViews?, jatsViews? (OJS),
 *   country?, region?, city?}; fileViews counts one entry per galleys[]
 *   (publicationFormats[] on OMP) entry, in order. Written as the usage
 *   event listener's log lines and turned into figures by the app's own
 *   usage statistics jobs, last in the build (PKPUsageStatsSeeder; the
 *   app's UsageStatsSeeder owns the app's line fields and OJS jatsViews).
 *
 * The workflow start stage comes from each app's submission schema default —
 * never hard-coded here (a hard-coded initial stage once made every seeded
 * OPS submission invisible; PRINCIPLES D5).
 */

namespace PKP\testing;

use APP\core\Application;
use APP\facades\Repo;
use PKP\author\contributorRole\ContributorRole;
use PKP\author\contributorRole\ContributorRoleIdentifier;
use PKP\author\contributorRole\ContributorType;
use PKP\context\Context;
use PKP\controllers\grid\users\reviewer\form\traits\HasReviewDueDate;
use PKP\core\Core;
use PKP\core\Registry;
use PKP\db\DAORegistry;
use PKP\core\PKPString;
use PKP\file\FileManager;
use PKP\notification\Notification;
use PKP\observers\events\MetadataChanged;
use PKP\security\Role;
use PKP\stageAssignment\StageAssignment;
use PKP\submission\action\EditorAction;
use PKP\submission\reviewAssignment\ReviewAssignment;
use PKP\submission\reviewer\ReviewerAction;
use PKP\submission\reviewRound\ReviewRound;
use PKP\submission\reviewer\suggestion\ReviewerSuggestion;
use PKP\submissionFile\SubmissionFile;
use PKP\validation\MultilingualInput;
use PKP\validation\ValidatorFactory;
use PKP\testing\Spec;
use PKP\testing\SpecException;
use PKP\user\User;
use PKP\userComment\UserComment;
use PKP\userGroup\UserGroup;

abstract class PKPSubmissionScenarioBuilder
{
    use HasReviewDueDate;

    public const REVIEWER_STATUSES = ['invited', 'accepted', 'declined', 'completed'];

    /** Default "For author and editor" text of a completed seeded review. */
    public const DEFAULT_REVIEW_COMMENTS = 'Seeded review comments for {tag}.';

    /** Defaults of the two required boxes a reviewer suggestion may leave to the seed. */
    public const DEFAULT_SUGGESTION_AFFILIATION = 'Seeded affiliation for {tag}';
    public const DEFAULT_SUGGESTION_REASON = 'Seeded suggestion reason for {tag}.';

    /**
     * Read the app's section/series overlay keys off the root spec and return
     * the publication props they seed (e.g. ['sectionId' => …] OJS/OPS,
     * ['seriesId' => …, 'seriesPosition' => …] OMP). Parse-phase: no writes.
     */
    abstract protected function parsePublicationOverlay(Context $context, Spec $root): array;

    /**
     * App keys stored on the submission record itself at creation (OMP:
     * `workType` — the start form always posts one, so a wizard-created
     * submission never carries the bare column/schema state a direct
     * repository add leaves). Parse-phase: no writes.
     */
    protected function parseSubmissionOverlay(Context $context, Spec $root): array
    {
        return [];
    }

    /** The review stage a round spec seeds into (OMP reads its per-round overlay). */
    protected function reviewStageIdForRound(Spec $roundSpec): int
    {
        return WORKFLOW_STAGE_ID_EXTERNAL_REVIEW;
    }

    /** OPS overrides to reject review seeding outright. */
    protected function assertReviewRoundsSupported(Spec $root): void
    {
    }

    /** OPS overrides to reject reviewer suggestions (no API mount, no wizard step). */
    protected function assertReviewerSuggestionsSupported(Spec $root): void
    {
    }

    /** OMP overrides to reject galleys (a press has publication formats, no "Galleys" page). */
    protected function assertGalleysSupported(Spec $root): void
    {
    }

    /**
     * The version's display values of the publication pages (U13): the
     * keys, in the order they are read. `articleNumber` is read only when
     * the app's publication schema has it (a journal). `datePublished`
     * (U17) is the same page's date box.
     */
    public const PUBLICATION_PAGE_KEYS = ['subtitle', 'plainLanguageSummary', 'keywords', 'subjects', 'disciplines', 'supportingAgencies', 'coverImage', 'categories', 'urlPath', 'articleNumber', 'datePublished'];

    /** The "Metadata" page's term lists (FieldControlledVocab), by publication property. */
    public const PUBLICATION_TERM_LISTS = ['keywords', 'subjects', 'disciplines', 'supportingAgencies'];

    /** OMP overrides to refuse the publication-page keys its "Catalog Entry" path has no parity check for (all but `categories`). */
    protected function assertPublicationPagesSupported(string $specKey): void
    {
    }

    /** OPS overrides to reject submission files (no workflow file list on a preprint server). */
    protected function assertFilesSupported(string $specKey): void
    {
    }

    /**
     * Read publicationFormats[] (OMP overrides). A journal and a preprint
     * server have galleys, not publication formats, so the key is refused,
     * never dropped (PRINCIPLES D4). Parse-phase: no writes.
     */
    protected function parsePublicationFormats(Context $context, Spec $root, string $submissionLocale, bool $submitted): array
    {
        if ($root->has('publicationFormats')) {
            throw new SpecException('publicationFormats', 'This app has galleys, not publication formats (no "Publication Formats" page exists): use galleys');
        }
        return [];
    }

    /**
     * The OMP overlay's first step, before a publish: each format with its
     * file, terms and approval. Returns the response entries.
     */
    protected function seedPublicationFormats(Context $context, int $submissionId, array $plans, User $editor): array
    {
        return [];
    }

    /** The OMP overlay's second step, after a publish: each seeded format made available. */
    protected function makePublicationFormatsAvailable(Context $context, int $submissionId, array $seeded, User $editor): void
    {
    }

    /**
     * Read `jats` (the OJS overlay overrides: the journal's "JATS XML"
     * publication page, U48). A press and a preprint server have no such
     * page (the JATS API is mounted by OJS alone), so the key is refused,
     * never dropped (PRINCIPLES D4). Parse-phase: no writes.
     */
    protected function parseJats(Context $context, Spec $root, bool $submitted): ?array
    {
        if ($root->has('jats')) {
            throw new SpecException('jats', 'This app has no "JATS XML" publication page (a journal alone has one)');
        }
        return null;
    }

    /**
     * The OJS overlay's "JATS XML" page step on the current publication,
     * after the media files and before a publish. Returns the response
     * entry.
     */
    protected function seedJats(Context $context, int $submissionId, array $plan, User $editor): ?array
    {
        return null;
    }

    /**
     * The notice types the upload wizard's "Review Details" save recomputes
     * for the authors (PKPManageFileApiHandler::getUpdateNotifications; OMP's
     * ManageFileApiHandler adds the internal-review one).
     */
    protected function fileMetadataNoticeTypes(): array
    {
        return [Notification::NOTIFICATION_TYPE_PENDING_EXTERNAL_REVISIONS];
    }

    /**
     * The notice types the app's galley grid recomputes after a galley is
     * saved (ArticleGalleyGridHandler::updateGalley passes the lib/pkp pair;
     * OPS's PreprintGalleyGridHandler passes "awaiting representations"
     * alone, since a preprint server never raises "assign a production user").
     */
    protected function galleyNoticeTypes(): array
    {
        return [
            Notification::NOTIFICATION_TYPE_ASSIGN_PRODUCTIONUSER,
            Notification::NOTIFICATION_TYPE_AWAITING_REPRESENTATIONS,
        ];
    }

    /** App hook before publish (OJS: issue assignment). Overlay parse happens here too. */
    protected function beforePublish(Context $context, \PKP\submission\PKPSubmission $submission, \PKP\publication\PKPPublication $publication, array $overlayPlan): void
    {
    }

    /**
     * App hook after publish (OJS: the issue's "Table of Contents" tab's
     * "Open Access" box, U51), with the publish overlay's plan.
     */
    protected function afterPublish(Context $context, int $submissionId, array $overlayPlan): void
    {
    }

    /** Parse app publish-overlay keys (OJS: issue, accessStatus). */
    protected function parsePublishOverlay(Context $context, Spec $root): array
    {
        return [];
    }

    /**
     * Parse the app's keys built on the finished version before any publish
     * (OMP: `enableChapterPublicationDates` and `chapters[]`, U72). $refs
     * carries what they may point at: `submitted`, `submitter` (username),
     * `contributorEmails`, `fileCount` (root `files[]` entries) and
     * `formatFiles` (per `publicationFormats[]` entry, whether it has a
     * file). Parse-phase: no writes. A key an app does not read stays
     * unconsumed, so it is a 400 there.
     */
    protected function parseVersionOverlay(Context $context, Spec $root, array $refs): array
    {
        return [];
    }

    /**
     * Build the parsed version keys, after the formats and JATS and before
     * any publish (publishing fills chapter licenses and mints chapter
     * DOIs). $built holds `files` (the root `files[]` entries as seeded,
     * in order), `publicationFormats` (as seeded) and `submitter`. Returns
     * the response fields it adds.
     */
    protected function seedVersionOverlay(Context $context, int $submissionId, array $plan, User $editor, array $built): array
    {
        return [];
    }

    public function build(array $data): array
    {
        $root = new Spec($data);

        // ---- Parse phase: read everything; unknown keys 400 before writes.
        $tag = (string) $root->require('tag');
        $contextPath = (string) $root->require('context');
        $context = Application::getContextDAO()->getByPath($contextPath);
        if (!$context) {
            throw new SpecException('context', "Unknown context urlPath \"{$contextPath}\"");
        }
        $locale = (string) $root->get('locale', $context->getPrimaryLocale());

        $submitterUsername = (string) $root->require('submitter');
        $submitter = Repo::user()->getByUsername($submitterUsername, true);
        if (!$submitter) {
            throw new SpecException('submitter', "Unknown submitter username \"{$submitterUsername}\"");
        }

        $title = $root->localized('title', $locale, "Submission {$tag}");
        // Default the abstract: the wizard requires one on abstract-requiring
        // sections, so a real completed submission always has it (parity
        // spot-check defect 3).
        $abstract = $root->localized('abstract', $locale, "Seeded abstract for {$tag}.");
        $submitted = (bool) $root->get('submitted', true);
        $published = (bool) $root->get('published', false);
        $publicationProps = $this->parsePublicationOverlay($context, $root);
        $submissionProps = $this->parseSubmissionOverlay($context, $root);

        $decisionNames = (array) $root->get('decisions', []);
        $decisionTypes = [];
        foreach ($decisionNames as $i => $name) {
            $decisionTypes[] = [$name, $this->resolveDecisionType((string) $name, "decisions.{$i}")];
        }

        if ($root->has('reviewRounds')) {
            $this->assertReviewRoundsSupported($root);
        }
        $roundPlans = [];
        foreach ($root->childList('reviewRounds') as $roundSpec) {
            $reviewers = [];
            foreach ($roundSpec->childList('reviewers') as $reviewerSpec) {
                $username = (string) $reviewerSpec->require('username');
                $status = (string) $reviewerSpec->get('status', 'invited');
                if (!in_array($status, self::REVIEWER_STATUSES)) {
                    throw new SpecException("{$reviewerSpec->path}.status", 'Reviewer status must be one of: ' . implode(', ', self::REVIEWER_STATUSES));
                }
                $reviewer = Repo::user()->getByUsername($username, true);
                if (!$reviewer) {
                    throw new SpecException("{$reviewerSpec->path}.username", "Unknown reviewer username \"{$username}\"");
                }
                $reviewFormId = $reviewerSpec->has('reviewForm')
                    ? $this->resolveActiveReviewFormId($context, (string) $reviewerSpec->get('reviewForm'), "{$reviewerSpec->path}.reviewForm")
                    : null;
                // Step-3 inputs of a completed review: the "Recommendation"
                // list (OJS only — a press's step 3 has no such field) and
                // the "For author and editor" box. Meaningless on any other
                // status, so a 400 rather than a silently dropped key.
                foreach (['recommendation', 'comments', 'dateCompleted'] as $step3Key) {
                    if ($reviewerSpec->has($step3Key) && $status !== 'completed') {
                        throw new SpecException("{$reviewerSpec->path}.{$step3Key}", "\"{$step3Key}\" applies to status \"completed\" only");
                    }
                }
                $recommendationId = null;
                if ($status === 'completed' && method_exists(Application::get(), 'hasCustomizableReviewerRecommendation') && Application::get()->hasCustomizableReviewerRecommendation()) { // the method is not on stable-3_5_0
                    $recommendationId = $this->resolveRecommendationId($context, (string) $reviewerSpec->get('recommendation', 'accept'), "{$reviewerSpec->path}.recommendation");
                } elseif ($reviewerSpec->has('recommendation')) {
                    throw new SpecException("{$reviewerSpec->path}.recommendation", 'This app\'s reviewer wizard has no "Recommendation" field');
                }
                // Step 3's box is a TinyMCE editor, which posts a paragraph
                // ("<p>…</p>") for plain typed text: wrap a bare string the
                // same way; a string that already carries markup is kept.
                $comments = null;
                if ($status === 'completed') {
                    $comments = (string) $reviewerSpec->get('comments', str_replace('{tag}', $tag, self::DEFAULT_REVIEW_COMMENTS));
                    if ($comments !== '' && !str_starts_with(ltrim($comments), '<')) {
                        $comments = "<p>{$comments}</p>";
                    }
                }
                $reviewers[] = [
                    'user' => $reviewer,
                    'status' => $status,
                    'reviewFormId' => $reviewFormId,
                    'recommendationId' => $recommendationId,
                    'comments' => $comments,
                    'dateCompleted' => $status === 'completed' ? $this->parseDateCompleted($reviewerSpec) : null,
                ];
            }
            $roundFiles = [];
            if ($roundSpec->has('files')) {
                $this->assertFilesSupported("{$roundSpec->path}.files");
                foreach ($roundSpec->childList('files') as $fileSpec) {
                    $roundFiles[] = [
                        'fixture' => $this->resolveFixture((string) $fileSpec->require('file'), "{$fileSpec->path}.file"),
                        'genreId' => $this->resolveUploadGenreId($context, $fileSpec),
                    ];
                }
            }
            $roundPlans[] = [
                'stageId' => $this->reviewStageIdForRound($roundSpec),
                'reviewers' => $reviewers,
                'files' => $roundFiles,
            ];
        }

        $participantPlans = [];
        if ($root->has('participants')) {
            $userSeeder = new UserSeeder();
            foreach ($root->childList('participants') as $participantSpec) {
                $username = (string) $participantSpec->require('username');
                $roleKey = (string) $participantSpec->require('role');
                $participant = Repo::user()->getByUsername($username, true);
                if (!$participant) {
                    throw new SpecException("{$participantSpec->path}.username", "Unknown participant username \"{$username}\"");
                }
                $userGroup = $userSeeder->resolveUserGroup($context, $roleKey, "{$participantSpec->path}.role");
                // The "Assign Participant" window's two boxes (U35). Each
                // starts from the role's own setting (the window's script
                // pre-ticks them from the Roles screen), so an absent key
                // keeps that default. "Assignment privileges" (recommend
                // only) is offered for manager- and sub-editor-level roles
                // alone (AddParticipantForm::initialize); "Permissions" for
                // every role but a manager-level one, whose assignment
                // always carries the permission (AddParticipantForm::execute
                // forces it). A value the window cannot post is a 400.
                $recommendOnly = (bool) $userGroup->recommendOnly;
                if ($participantSpec->has('recommendOnly')) {
                    $value = $participantSpec->get('recommendOnly');
                    if (!is_bool($value)) {
                        throw new SpecException("{$participantSpec->path}.recommendOnly", 'recommendOnly must be a boolean (the "Assignment privileges" box)');
                    }
                    if ($value && !in_array((int) $userGroup->roleId, [Role::ROLE_ID_MANAGER, Role::ROLE_ID_SUB_EDITOR], true)) {
                        throw new SpecException("{$participantSpec->path}.recommendOnly", "The \"Assign Participant\" window offers \"Assignment privileges\" for editor roles only, not for \"{$roleKey}\"");
                    }
                    $recommendOnly = $value;
                }
                $canChangeMetadata = (bool) $userGroup->permitMetadataEdit;
                if ($participantSpec->has('canChangeMetadata')) {
                    $value = $participantSpec->get('canChangeMetadata');
                    if (!is_bool($value)) {
                        throw new SpecException("{$participantSpec->path}.canChangeMetadata", 'canChangeMetadata must be a boolean (the "Permissions" box)');
                    }
                    if (!$value && (int) $userGroup->roleId === Role::ROLE_ID_MANAGER) {
                        throw new SpecException("{$participantSpec->path}.canChangeMetadata", "An assignment in the manager-level role \"{$roleKey}\" always carries the metadata permission (the window offers no \"Permissions\" box for it)");
                    }
                    $canChangeMetadata = $value;
                }
                $participantPlans[] = [
                    'user' => $participant,
                    'userGroup' => $userGroup,
                    'recommendOnly' => $recommendOnly,
                    'canChangeMetadata' => $canChangeMetadata,
                ];
            }
        }

        $authorPlan = null;
        if (($authorSpec = $root->child('author')) !== null) {
            $authorPlan = [
                'orcid' => (string) $authorSpec->require('orcid'),
                'orcidIsVerified' => (bool) $authorSpec->get('orcidIsVerified', false),
            ];
        }

        $suggestionPlans = [];
        if ($root->has('reviewerSuggestions')) {
            $this->assertReviewerSuggestionsSupported($root);
            $suggestionPlans = $this->parseReviewerSuggestions($context, $root, $tag);
        }

        $publishOverlayPlan = $this->parsePublishOverlay($context, $root);
        $commentPlans = $this->parseUserComments($root, $published);
        $galleyPlans = $this->parseGalleys($context, $root, $locale);
        $filePlans = $this->parseFiles($context, $root, $submitter, $submitted, $participantPlans);
        $taskPlans = $this->parseTasks($root, $submitted, $tag);
        $citationsRaw = $this->parseCitationsRaw($root);
        $dataCitationPlans = $this->parseDataCitations($root);
        $mediaFilePlans = $this->parseMediaFiles($context, $root, $submitted, $locale);
        $formatPlans = $this->parsePublicationFormats($context, $root, $locale, $submitted);
        $publicationPagesPlan = $this->parsePublicationPages($context, $root, $locale, $submitted);
        $jatsPlan = $this->parseJats($context, $root, $submitted);
        $libraryFilePlans = LibraryFileSeeder::parse($root, false);
        $contributorPlans = $this->parseContributors($root);
        $versionOverlayPlan = $this->parseVersionOverlay($context, $root, [
            'submitted' => $submitted,
            'submitter' => $submitterUsername,
            'contributorEmails' => array_column($contributorPlans, 'email'),
            'fileCount' => count($filePlans),
            'formatFiles' => array_map(fn (array $plan) => $plan['fixture'] !== null, $formatPlans),
        ]);
        // usage[] (U64): reader visits of past days, after the galleys and
        // formats it counts (one fileViews count per entry, in order).
        $usageSeeder = new \APP\testing\UsageStatsSeeder($context);
        $usagePlans = $usageSeeder->parseWorkUsage($root, $published, array_merge(
            array_map(fn (array $plan) => $plan['path'] !== null, $galleyPlans),
            array_map(fn (array $plan) => $plan['fixture'] !== null, $formatPlans)
        ));
        if ($libraryFilePlans !== [] && !$submitted) {
            throw new SpecException('libraryFiles', 'A draft has no workflow and no "Library" button: libraryFiles needs submitted: true');
        }
        $root->assertConsumed();

        if ($published && !$submitted) {
            throw new SpecException('published', 'published: true requires a submitted submission');
        }

        // ---- Execute phase.
        $request = Application::get()->getRequest();

        // The seeding request is site-wide, but the services and listeners the
        // build invokes (notification managers, mailables) read
        // $request->getContext(). Force the router's context to the
        // submission's context for the duration of the build.
        $restoreRouterContext = ContextFactory::forceRequestContext($context);
        try {
            return $this->execute($root, $context, $locale, $tag, $submitter, $title, $abstract, $submitted, $published, $submissionProps, $publicationProps, $decisionTypes, $roundPlans, $publishOverlayPlan, $authorPlan, $participantPlans, $suggestionPlans, $commentPlans, $galleyPlans, $filePlans, $taskPlans, $libraryFilePlans, $citationsRaw, $dataCitationPlans, $mediaFilePlans, $formatPlans, $publicationPagesPlan, $jatsPlan, $usageSeeder, $usagePlans, $contributorPlans, $versionOverlayPlan);
        } finally {
            $restoreRouterContext();
        }
    }

    private function execute(
        Spec $root,
        Context $context,
        string $locale,
        string $tag,
        User $submitter,
        array $title,
        ?array $abstract,
        bool $submitted,
        bool $published,
        array $submissionProps,
        array $publicationProps,
        array $decisionTypes,
        array $roundPlans,
        array $publishOverlayPlan,
        ?array $authorPlan = null,
        array $participantPlans = [],
        array $suggestionPlans = [],
        array $commentPlans = [],
        array $galleyPlans = [],
        array $filePlans = [],
        array $taskPlans = [],
        array $libraryFilePlans = [],
        ?string $citationsRaw = null,
        array $dataCitationPlans = [],
        array $mediaFilePlans = [],
        array $formatPlans = [],
        ?array $publicationPagesPlan = null,
        ?array $jatsPlan = null,
        ?PKPUsageStatsSeeder $usageSeeder = null,
        array $usagePlans = [],
        array $contributorPlans = [],
        array $versionOverlayPlan = []
    ): array {
        $request = Application::get()->getRequest();
        $seededSuggestions = [];
        $seededComments = [];
        $seededGalleys = [];
        $seededFiles = [];
        $seededTasks = [];
        $seededLibraryFiles = [];
        $seededDataCitations = [];
        $seededMediaFiles = [];
        $seededFormats = [];
        $seededJats = null;
        $seededContributors = [];
        $versionOverlayResponse = [];

        // Create + (maybe) submit as the submitter — wizard parity.
        $previousActingUser = Registry::get('user');
        Registry::set('user', $submitter);
        try {
            $submitAsUserGroup = $this->resolveSubmitAsUserGroup($context, $submitter);

            $submissionParams = array_merge(
                ['contextId' => $context->getId(), 'locale' => $locale],
                $submissionProps
            );
            $submission = Repo::submission()->newDataObject($submissionParams);
            $publication = Repo::publication()->newDataObject($publicationProps);
            $submissionId = Repo::submission()->add($submission, $publication, $context);
            $submission = Repo::submission()->get($submissionId);
            $publication = Repo::publication()->get($submission->getData('currentPublicationId'));

            Repo::stageAssignment()->build(
                $submission->getId(),
                $submitAsUserGroup->id,
                $submitter->getId(),
                $submitAsUserGroup->recommendOnly,
                $submission->getData('submissionProgress') ? true : $submitAsUserGroup->permitMetadataEdit
            );

            if ((int) $submitAsUserGroup->roleId === Role::ROLE_ID_AUTHOR) {
                $author = Repo::author()->newAuthorFromUser($submitter, $submission, $context);
                $author->setData('publicationId', $publication->getId());
                // Contributor types and roles are absent on the stable-3_5_0 line.
                if (class_exists(ContributorType::class)) {
                    $author->setData('contributorType', ContributorType::PERSON->getName());
                    $author->setContributorRoles(
                        ContributorRole::query()
                            ->withContextId($context->getId())
                            ->withIdentifier(ContributorRoleIdentifier::AUTHOR->getName())
                            ->limit(1)
                            ->get()
                            ->all()
                    );
                }
                $authorId = Repo::author()->add($author);
                Repo::publication()->edit($publication, ['primaryContactId' => $authorId]);

                if ($authorPlan !== null) {
                    // The author_settings rows the OAuth verify landing
                    // stores (orcid, orcidIsVerified, and for a verified iD
                    // the access token, scope, refresh token and expiry),
                    // written through the real author repository.
                    Repo::author()->edit(
                        Repo::author()->get($authorId),
                        UserSeeder::orcidOAuthData($context, $authorPlan['orcid'], $authorPlan['orcidIsVerified'], $tag)
                    );
                    $authorPlan = null;
                }
            }

            if ($authorPlan !== null) {
                throw new SpecException('author', 'author requires the submitter to submit as an Author (no contributor record was created)');
            }

            $publicationEdits = ['title' => $title];
            if ($abstract !== null) {
                $publicationEdits['abstract'] = $abstract;
            }
            // The "Details" step's References box goes out in the same PUT
            // as the title and abstract (U42).
            if ($citationsRaw !== null) {
                $publicationEdits['citationsRaw'] = $citationsRaw;
            }
            // Re-fetch: editing through the pre-primaryContact object would
            // write its stale data back and erase primaryContactId (parity
            // spot-check defect 1).
            $publication = Repo::publication()->get($publication->getId());
            Repo::publication()->edit($publication, $publicationEdits);

            // The wizard's "Contributors" step: "Add Contributor" › "Save"
            // per entry, in list order, as the submitter (U72).
            if ($contributorPlans !== []) {
                $seededContributors = $this->seedContributors($context, $submissionId, $contributorPlans, $submitAsUserGroup);
            }

            // The wizard's "Reviewer Suggestions" step, while the submission
            // is still incomplete: the same ReviewerSuggestion::create() the
            // step's window runs (ReviewerSuggestionController::add), with
            // the request's own suggestingUserId (the acting author) and
            // submissionId merged in as prepareForValidation does.
            foreach ($suggestionPlans as $plan) {
                $suggestion = ReviewerSuggestion::create(array_merge($plan, [
                    'submissionId' => $submissionId,
                    'suggestingUserId' => $submitter->getId(),
                ]));
                $suggestion->refresh();
                $seededSuggestions[] = [
                    'id' => (int) $suggestion->getKey(),
                    'email' => $suggestion->email,
                ];
            }

            // The wizard's "Data" section: "Add Data Citation" › "Save" per
            // entry, in list order (U42).
            if ($dataCitationPlans !== []) {
                $seededDataCitations = $this->seedDataCitations(
                    Repo::submission()->get($submissionId),
                    Repo::publication()->get($publication->getId()),
                    $dataCitationPlans
                );
            }

            // The wizard's "Files" panel, as the submitter, before submit.
            foreach ($filePlans as $i => $plan) {
                if ($plan['byWizard']) {
                    $filePlans[$i]['submissionFileId'] = $this->uploadThroughSubmissionWizard($context, $submissionId, $submitter, $plan['fixture'], $plan['genreId']);
                }
            }

            if ($submitted) {
                $submission = Repo::submission()->get($submissionId);
                Repo::submission()->submit($submission, $context);

                // The real submit endpoint's tail: create the unpublished-state
                // notifications (APPROVE_SUBMISSION and its app delegates) the
                // workflow's approval UI runs on (parity spot-check defect 2).
                $notificationManagerClass = '\APP\notification\NotificationManager';
                $notificationManager = new $notificationManagerClass();
                $notificationManager->updateNotification(
                    $request,
                    [\PKP\notification\Notification::NOTIFICATION_TYPE_APPROVE_SUBMISSION],
                    null,
                    \PKP\core\PKPApplication::ASSOC_TYPE_SUBMISSION,
                    $submissionId
                );
            }
        } finally {
            Registry::set('user', $previousActingUser);
        }

        // Non-submitter participants: the same stage-assignment row the
        // workflow's Assign Participant form writes (its two boxes, which
        // start from the role's recommendOnly / permitMetadataEdit; no
        // email or notification — recorded parity deviation).
        foreach ($participantPlans as $plan) {
            Repo::stageAssignment()->build(
                $submissionId,
                $plan['userGroup']->id,
                $plan['user']->getId(),
                $plan['recommendOnly'],
                $plan['canChangeMetadata']
            );
        }

        // "Submission Files" › "Upload" by the team, after the submit and
        // before any decision (the Submission stage's list), then each
        // file's "More Information" › "Add Note", by the acting editor.
        $editor = $this->actingEditor();
        foreach ($filePlans as $i => $plan) {
            if (!$plan['byWizard']) {
                $filePlans[$i]['submissionFileId'] = $this->uploadThroughWizard(
                    $context,
                    $submissionId,
                    $plan['uploader'],
                    $plan['fixture'],
                    SubmissionFile::SUBMISSION_FILE_SUBMISSION,
                    null,
                    null,
                    $plan['genreId']
                );
            }
        }
        foreach ($filePlans as $plan) {
            if ($plan['note'] !== null) {
                $this->addFileNote($plan['submissionFileId'], $plan['note'], $editor);
            }
            $seededFiles[] = [
                'submissionFileId' => $plan['submissionFileId'],
                'file' => $plan['fixture']['file'],
                'fileStage' => SubmissionFile::SUBMISSION_FILE_SUBMISSION,
                'reviewRoundId' => null,
                'uploader' => $plan['uploader']->getUsername(),
            ];
        }

        // Decisions + review rounds, acting as the editor (admin).
        $reviewRoundDao = DAORegistry::getDAO('ReviewRoundDAO'); /** @var \PKP\submission\reviewRound\ReviewRoundDAO $reviewRoundDao */
        $roundIndex = 0;
        $seededAssignments = [];

        $previousActingUser = Registry::get('user');
        Registry::set('user', $editor);
        try {
            foreach ($decisionTypes as [$name, $decisionType]) {
                $submission = Repo::submission()->get($submissionId);
                $decision = Repo::decision()->newDataObject();
                $decision->setData('decision', $decisionType->getDecision());
                $decision->setData('submissionId', $submissionId);
                $decision->setData('editorId', $editor->getId());
                $decision->setData('stageId', $decisionType->getStageId());
                if (in_array($decisionType->getStageId(), [WORKFLOW_STAGE_ID_INTERNAL_REVIEW, WORKFLOW_STAGE_ID_EXTERNAL_REVIEW])) {
                    $lastRound = $reviewRoundDao->getLastReviewRoundBySubmissionId($submissionId, $decisionType->getStageId());
                    if ($lastRound) {
                        $decision->setData('reviewRoundId', $lastRound->getId());
                    }
                }
                Repo::decision()->add($decision);

                // A decision that promotes into a review stage creates that
                // round — seed the next declared round spec into it.
                $newStageId = $decisionType->getNewStageId(Repo::submission()->get($submissionId), null);
                if (in_array($newStageId, [WORKFLOW_STAGE_ID_INTERNAL_REVIEW, WORKFLOW_STAGE_ID_EXTERNAL_REVIEW]) && $roundIndex < count($roundPlans)) {
                    $round = $reviewRoundDao->getLastReviewRoundBySubmissionId($submissionId, $newStageId);
                    if ($round) {
                        $seededFiles = array_merge($seededFiles, $this->seedRoundFiles($context, $submissionId, $round, $roundPlans[$roundIndex]['files'], $editor));
                        $seededAssignments = array_merge(
                            $seededAssignments,
                            $this->seedRoundReviewers($context, $submissionId, $round, $roundPlans[$roundIndex]['reviewers'])
                        );
                        $roundIndex++;
                    }
                }
            }

            // Remaining declared rounds (no decision created them): build the
            // round with the same shape the real decision path produces —
            // mirrored from DecisionType::createReviewRound (DecisionType.php
            // ~511-541): PENDING_REVIEWERS status, the latest UNPUBLISHED
            // publication id (getLatestUnPublishedPublicationId, ~556-562),
            // and the REVIEW_ROUND_STATUS notification row the workflow's
            // round header runs on.
            while ($roundIndex < count($roundPlans)) {
                $plan = $roundPlans[$roundIndex];
                $submission = Repo::submission()->get($submissionId);
                $lastRound = $reviewRoundDao->getLastReviewRoundBySubmissionId($submissionId, $plan['stageId']);
                $roundNumber = $lastRound ? $lastRound->getRound() + 1 : 1;
                $publicationId = $submission->getData('publications')
                    ->filter(fn ($publication) => $publication->getData('status') !== \PKP\publication\PKPPublication::STATUS_PUBLISHED)
                    ->reduce(fn ($a, $b) => $a && $a->getId() > $b->getId() ? $a : $b)
                    ?->getId();
                $round = $reviewRoundDao->build(
                    $submissionId,
                    $publicationId,
                    $plan['stageId'],
                    $roundNumber,
                    ReviewRound::REVIEW_ROUND_STATUS_PENDING_REVIEWERS
                );
                $notificationCount = Notification::withAssoc(Application::ASSOC_TYPE_REVIEW_ROUND, $round->getId())
                    ->withType(Notification::NOTIFICATION_TYPE_REVIEW_ROUND_STATUS)
                    ->withContextId($submission->getData('contextId'))
                    ->count();
                if ($notificationCount == 0) {
                    $notificationMgr = new \APP\notification\NotificationManager();
                    $notificationMgr->createNotification(
                        null,
                        Notification::NOTIFICATION_TYPE_REVIEW_ROUND_STATUS,
                        $submission->getData('contextId'),
                        Application::ASSOC_TYPE_REVIEW_ROUND,
                        $round->getId()
                    );
                }
                $seededFiles = array_merge($seededFiles, $this->seedRoundFiles($context, $submissionId, $round, $plan['files'], $editor));
                $seededAssignments = array_merge(
                    $seededAssignments,
                    $this->seedRoundReviewers($context, $submissionId, $round, $plan['reviewers'])
                );
                $roundIndex++;
            }

            // The publication pages' display values (U13), typed by the
            // editor before the galleys and the publish.
            if ($publicationPagesPlan !== null) {
                $this->seedPublicationPages($submissionId, $publicationPagesPlan, $editor);
            }

            // Galleys on the current publication, added the way the "Galleys"
            // page adds them, before a publish: an editor builds the galleys
            // and then publishes, so a published seed carries them published.
            if ($galleyPlans !== []) {
                $seededGalleys = $this->seedGalleys($context, $submissionId, $galleyPlans, $editor);
            }

            // Media files on the current publication, added on its "Media"
            // page before a publish, as the galleys are (U47).
            if ($mediaFilePlans !== []) {
                $seededMediaFiles = $this->seedMediaFiles($submissionId, $mediaFilePlans, $editor);
            }

            // Publication formats (OMP), built on the "Publication Formats"
            // page after the media files and before a publish (U47).
            if ($formatPlans !== []) {
                $seededFormats = $this->seedPublicationFormats($context, $submissionId, $formatPlans, $editor);
            }

            // The "JATS XML" page (OJS), after the media files and before a
            // publish: a published version offers no "Upload" (U48).
            if ($jatsPlan !== null) {
                $seededJats = $this->seedJats($context, $submissionId, $jatsPlan, $editor);
            }

            // The app's version keys (OMP chapters, U72), on the version as
            // built, before a publish.
            if ($versionOverlayPlan !== []) {
                $versionOverlayResponse = $this->seedVersionOverlay($context, $submissionId, $versionOverlayPlan, $editor, [
                    'files' => array_values(array_filter($seededFiles, fn (array $file) => $file['reviewRoundId'] === null)),
                    'publicationFormats' => $seededFormats,
                    'submitter' => $submitter,
                ]);
            }

            if ($published) {
                $submission = Repo::submission()->get($submissionId);
                $publication = Repo::publication()->get($submission->getData('currentPublicationId'));
                $this->beforePublish($context, $submission, $publication, $publishOverlayPlan);
                $publication = Repo::publication()->get($publication->getId());

                // The real publish endpoint validates before publishing
                // (PKPSubmissionController::publishPublication ~1413-1424):
                // a seed the UI would refuse must fail loudly, not publish
                // an impossible state.
                $primaryLocale = $submission->getData('locale');
                $allowedLocales = $context->getData('supportedSubmissionLocales');
                $errors = Repo::publication()->validatePublish($publication, $submission, (array) $allowedLocales, $primaryLocale);
                if (!empty($errors)) {
                    throw new SpecException('published', 'The publish endpoint would refuse this publication: ' . json_encode($errors));
                }

                // Mirrored from PKPSubmissionController::publishPublication:
                // publish without status stamping, then re-derive submission
                // status/current publication off a fresh fetch. The
                // controller's sweep of author stage assignments to
                // canChangeMetadata = 0 was removed upstream by
                // pkp/pkp-lib#13109 (lib/pkp 18f402e585, in every app since
                // 2026-09-08), so the seed no longer mirrors it: an Author's
                // permission survives a seeded publish exactly as it survives
                // a screen publish.
                Repo::publication()->publish($publication, false);

                $submission = Repo::submission()->get($submission->getId());
                Repo::submission()->updateStatus($submission);
                Repo::submission()->updateCurrentPublication($submission);
                $this->afterPublish($context, $submissionId, $publishOverlayPlan);
            }

            // Each format's "Not Available" › OK, after the publish, as the
            // page is used (U47).
            if ($seededFormats !== []) {
                $this->makePublicationFormatsAvailable($context, $submissionId, $seededFormats, $editor);
            }

            if ($commentPlans !== []) {
                $submission = Repo::submission()->get($submissionId);
                $seededComments = $this->seedUserComments(
                    $context,
                    (int) $submission->getData('currentPublicationId'),
                    $commentPlans,
                    $editor
                );
            }
        } finally {
            Registry::set('user', $previousActingUser);
        }

        // The workflow header's "Library" › "Submission Library" › "Add a
        // file" › "OK", acting as the editor (admin), on the submission as
        // built.
        foreach ($libraryFilePlans as $plan) {
            $seededLibraryFiles[] = LibraryFileSeeder::add($context, $plan, $submissionId, $editor);
        }

        // Discussions and tasks, last: each is the stage panel's "Add" ›
        // "Save" by its creator on the submission as built.
        if ($taskPlans !== []) {
            $seededTasks = $this->seedTasks(Repo::submission()->get($submissionId), $taskPlans);
        }

        // Reader visits of past days (U64), last: the published version as
        // built, its galleys' or formats' files, through the app's own
        // usage statistics jobs (PKPUsageStatsSeeder).
        if ($usagePlans !== []) {
            $usageSeeder->addWorkUsage($usagePlans, Repo::submission()->get($submissionId), array_merge($seededGalleys, $seededFormats));
            $usageSeeder->load();
        }

        // ---- Response.
        $submission = Repo::submission()->get($submissionId);
        $rounds = [];
        $roundsIterator = $reviewRoundDao->getBySubmissionId($submissionId);
        while ($round = $roundsIterator->next()) {
            $rounds[] = ['id' => $round->getId(), 'round' => $round->getRound(), 'stageId' => $round->getStageId()];
        }

        return [
            'tag' => $tag,
            'submissionId' => $submissionId,
            'publicationId' => $submission->getData('currentPublicationId'),
            'stageId' => $submission->getData('stageId'),
            'status' => $submission->getData('status'),
            'submissionProgress' => $submission->getData('submissionProgress'),
            'reviewRounds' => $rounds,
            'reviewAssignments' => $seededAssignments,
            'reviewerSuggestions' => $seededSuggestions,
            'userComments' => $seededComments,
            'galleys' => $seededGalleys,
            'files' => $seededFiles,
            'tasks' => $seededTasks,
            'libraryFiles' => $seededLibraryFiles,
            'dataCitations' => $seededDataCitations,
            'mediaFiles' => $seededMediaFiles,
            'publicationFormats' => $seededFormats,
            'jats' => $seededJats,
            'contributors' => $seededContributors,
        ] + $versionOverlayResponse;
    }

    /**
     * Read contributors[] (U72): each `{givenName*, familyName?, email*,
     * country?}`, a person with no account on the version's Contributors
     * list, added after the submitter's own entry. The values themselves
     * are judged by the contributor API's own validation at execute (an
     * invalid address or country is its 400). Parse-phase: no writes.
     *
     * @return array<int, array{path: string, givenName: string, familyName: ?string, email: string, country: string}>
     */
    protected function parseContributors(Spec $root): array
    {
        $plans = [];
        foreach ($root->childList('contributors') as $spec) {
            $text = function (string $key, bool $required) use ($spec): ?string {
                $value = $required ? $spec->require($key) : $spec->get($key);
                if ($value !== null && (!is_string($value) || trim($value) === '')) {
                    throw new SpecException("{$spec->path}.{$key}", "{$key} is the contributor window's box as typed: a non-empty string");
                }
                return $value;
            };
            $plans[] = [
                'path' => $spec->path,
                'givenName' => $text('givenName', true),
                'familyName' => $text('familyName', false),
                'email' => $text('email', true),
                // "Country" is required on the window; the default is the
                // one the suites pick (ContributorPages "Canada").
                'country' => $text('country', false) ?? 'CA',
            ];
        }
        return $plans;
    }

    /**
     * The wizard's "Contributors" step, "Add Contributor", a person with
     * "Given Name", "Family Name", "Email", "Country" and the "Author" box
     * of "Contributor Roles" ticked, "Save", as the submitter, before the
     * submit: the panel's body (form-encoded on screen, its emptied boxes
     * arriving as null) through PKPSubmissionController::addContributor
     * itself (ApiCall: convertStringsToSchema, Repo::author()->validate,
     * ->add, which appends it after the list's last entry). The panel's
     * multilingual boxes carry every language it offers (the press's
     * submission metadata languages and the submission's own), the typed
     * value under the submission's.
     *
     * @return array<int, array{id: int, email: string}>
     */
    protected function seedContributors(Context $context, int $submissionId, array $plans, UserGroup $submitAsUserGroup): array
    {
        if (!class_exists(ContributorRole::class)) {
            throw new SpecException('contributors', 'contributors is built for the contributor window of upstream main (contributor types and roles), which this line lacks');
        }
        $submission = Repo::submission()->get($submissionId);
        $publicationId = (int) $submission->getData('currentPublicationId');
        $submissionLocale = $submission->getData('locale');
        $locales = array_keys($context->getSupportedSubmissionMetadataLocaleNames() + $submission->getPublicationLanguageNames());
        $multilingual = fn (?string $value) => array_combine($locales, array_map(fn (string $locale) => $locale === $submissionLocale ? $value : null, $locales));
        $authorRole = ContributorRole::query()
            ->withContextId($context->getId())
            ->withIdentifier(ContributorRoleIdentifier::AUTHOR->getName())
            ->limit(1)
            ->get()
            ->first();
        $seeded = [];
        foreach ($plans as $plan) {
            $controller = ApiCall::controller(
                \APP\API\v1\submissions\SubmissionController::class,
                [
                    Application::ASSOC_TYPE_SUBMISSION => Repo::submission()->get($submissionId),
                    Application::ASSOC_TYPE_USER_ROLES => [(int) $submitAsUserGroup->roleId],
                ]
            );
            $request = ApiCall::request(
                \Illuminate\Http\Request::class,
                'POST',
                [
                    'contributorType' => ContributorType::PERSON->getName(),
                    'givenName' => $multilingual($plan['givenName']),
                    'familyName' => $multilingual($plan['familyName']),
                    'preferredPublicName' => $multilingual(null),
                    'organizationName' => $multilingual(null),
                    'email' => $plan['email'],
                    'country' => $plan['country'],
                    'rorId' => null,
                    'url' => null,
                    'biography' => $multilingual(null),
                    'affiliations' => null,
                    'contributorRoles' => $authorRole ? [(string) $authorRole->id] : null,
                    'creditRoles' => null,
                    'includeInBrowse' => 'true',
                ],
                ['submissionId' => $submissionId, 'publicationId' => $publicationId],
                $plan['path'],
                'The contributor window\'s "Save" would be refused'
            );
            $answer = ApiCall::answer($controller->addContributor($request), $plan['path'], 'The contributor window\'s "Save" was refused');
            $seeded[] = ['id' => (int) $answer['id'], 'email' => $plan['email']];
        }
        return $seeded;
    }

    /**
     * Read citationsRaw (U42): the wizard's References box text, a string
     * or a list of lines joined with newlines. Parse-phase: no writes.
     */
    protected function parseCitationsRaw(Spec $root): ?string
    {
        if (!$root->has('citationsRaw')) {
            return null;
        }
        $value = $root->get('citationsRaw');
        // A blank line in a list arrives as null (the request's
        // ConvertEmptyStringsToNull middleware), so null is a blank line.
        if (is_array($value) && array_is_list($value) && array_filter($value, fn ($line) => !is_string($line) && $line !== null) === []) {
            return implode("\n", array_map(fn ($line) => (string) $line, $value));
        }
        if (!is_string($value)) {
            throw new SpecException('citationsRaw', 'citationsRaw must be the References box text (a string, one reference per line) or a list of lines');
        }
        return $value;
    }

    /**
     * Read dataCitations[] (U42): each entry the "Add Data Citation"
     * panel's boxes, posted the way the panel posts them (every box, an
     * empty one as null, the year as typed). The values themselves are
     * judged by the controller's own validation at execute. Parse-phase:
     * no writes.
     *
     * @return array<int, array{path: string, body: array}>
     */
    protected function parseDataCitations(Spec $root): array
    {
        $plans = [];
        foreach ($root->childList('dataCitations') as $spec) {
            $text = function (string $key, bool $required = false) use ($spec): ?string {
                $value = $required ? $spec->require($key) : $spec->get($key);
                if ($value !== null && (!is_string($value) || $value === '')) {
                    throw new SpecException("{$spec->path}.{$key}", "{$spec->path}.{$key} must be a non-empty string");
                }
                return $value;
            };
            $body = [
                'title' => $text('title', true),
                'identifierType' => $text('identifierType'),
                'identifier' => $text('identifier'),
                'relationshipType' => $text('relationshipType', true),
                'repository' => $text('repository'),
                'year' => null,
                'authors' => null,
                'url' => $text('url'),
            ];
            if ($spec->has('year')) {
                $year = $spec->get('year');
                if (!is_int($year)) {
                    throw new SpecException("{$spec->path}.year", "{$spec->path}.year must be a whole number (the \"Year\" box)");
                }
                $body['year'] = (string) $year;
            }
            $authorSpecs = $spec->childList('authors');
            if ($authorSpecs !== []) {
                $body['authors'] = [];
                foreach ($authorSpecs as $authorSpec) {
                    $row = [];
                    foreach (['givenName', 'familyName', 'orcid'] as $key) {
                        $value = $authorSpec->get($key);
                        if ($value !== null && !is_string($value)) {
                            throw new SpecException("{$authorSpec->path}.{$key}", "{$authorSpec->path}.{$key} must be a string");
                        }
                        $row[$key] = $value === '' ? null : $value;
                    }
                    $body['authors'][] = $row;
                }
            }
            $plans[] = ['path' => $spec->path, 'body' => $body];
        }
        return $plans;
    }

    /**
     * The "Add Data Citation" panel's "Save" per plan (U42): its body through
     * PKPDataCitationController::add itself, the publication the policy
     * would have authorized set directly (ApiCall). A refusal is the
     * panel's own and becomes a 400 naming the entry.
     *
     * @return array<int, array{id: int, title: string}>
     */
    protected function seedDataCitations(\APP\submission\Submission $submission, \APP\publication\Publication $publication, array $plans): array
    {
        $controller = ApiCall::controller(
            \PKP\API\v1\dataCitations\PKPDataCitationController::class,
            [Application::ASSOC_TYPE_SUBMISSION => $submission, Application::ASSOC_TYPE_PUBLICATION => $publication]
        );
        $seeded = [];
        foreach ($plans as $plan) {
            $request = ApiCall::request(
                \Illuminate\Http\Request::class,
                'POST',
                $plan['body'],
                ['submissionId' => $submission->getId(), 'publicationId' => $publication->getId()],
                $plan['path'],
                'The "Add Data Citation" panel\'s "Save" would be refused'
            );
            $saved = ApiCall::answer($controller->add($request), $plan['path'], 'The "Add Data Citation" panel\'s "Save" was refused');
            $seeded[] = ['id' => (int) $saved['id'], 'title' => (string) $saved['title']];
        }
        return $seeded;
    }

    /**
     * Read the publication-page keys (U13): the version's display values
     * the editor types on "Title & Abstract" (subtitle, plainLanguageSummary),
     * "Metadata" (the term lists, OJS articleNumber) and "Publication
     * Settings" / "Preprint entry" (categories, coverImage, urlPath), each
     * turned into the field the form posts: a one-line rich text as typed,
     * the summary's rich text box as the paragraph it posts, a term list as
     * `{locale: [{name}]}` chips, the categories as their ids, the cover as
     * `{locale: {temporaryFileId, altText}}` once uploaded. The workflow's
     * publication pages exist once the submission is submitted. The values
     * themselves (the URL Path's pattern and uniqueness, the locales) are
     * judged by the controller's own validation at execute. Parse-phase:
     * no writes.
     *
     * @return ?array{specKey: string, body: array, coverImage: ?array{fixture: array, altText: string, locale: string}}
     */
    protected function parsePublicationPages(Context $context, Spec $root, string $locale, bool $submitted): ?array
    {
        $schema = app()->get('schema')->get(\PKP\services\PKPSchemaService::SCHEMA_PUBLICATION);
        $keys = array_values(array_filter(
            self::PUBLICATION_PAGE_KEYS,
            fn (string $key) => $root->has($key) && ($key !== 'articleNumber' || isset($schema->properties->{$key}))
        ));
        if ($keys === []) {
            return null;
        }
        foreach ($keys as $key) {
            $this->assertPublicationPagesSupported($key);
        }
        if (!$submitted) {
            throw new SpecException($keys[0], "\"{$keys[0]}\" is typed on the workflow's publication pages, which a draft does not have: it needs submitted: true");
        }
        $localizedText = function (string $key) use ($root, $locale): array {
            $value = $root->get($key);
            $map = is_array($value) ? $value : [$locale => $value];
            if ($map === [] || array_is_list($map)) {
                throw new SpecException($key, "{$key} must be a string or a locale map of strings");
            }
            foreach ($map as $mapLocale => $text) {
                if (!is_string($text) || trim($text) === '') {
                    throw new SpecException("{$key}.{$mapLocale}", "{$key}.{$mapLocale} must be a non-empty string");
                }
            }
            return $map;
        };

        $body = [];
        if ($root->has('subtitle')) {
            // "Subtitle" is a one-line rich text: it posts the text as typed.
            $body['subtitle'] = $localizedText('subtitle');
        }
        if ($root->has('plainLanguageSummary')) {
            // "Plain Language Summary" is a rich text box (TinyMCE), which
            // posts typed text as a paragraph; markup given is kept.
            $body['plainLanguageSummary'] = array_map(
                fn (string $text) => str_starts_with(ltrim($text), '<') ? $text : "<p>{$text}</p>",
                $localizedText('plainLanguageSummary')
            );
        }
        foreach (self::PUBLICATION_TERM_LISTS as $key) {
            if (!$root->has($key)) {
                continue;
            }
            $value = $root->get($key);
            $map = is_array($value) && !array_is_list($value) ? $value : [$locale => $value];
            foreach ($map as $mapLocale => $terms) {
                if (!is_array($terms) || !array_is_list($terms) || array_filter($terms, fn ($term) => !is_string($term) || trim($term) === '') !== []) {
                    throw new SpecException("{$key}", "{$key} must be a list of terms (non-empty strings), or a locale map of such lists");
                }
                // One chip per term, posted as {name}.
                $body[$key][$mapLocale] = array_map(fn (string $term) => ['name' => $term], $terms);
            }
        }
        if ($root->has('articleNumber') && isset($schema->properties->articleNumber)) {
            $value = $root->get('articleNumber');
            if (!is_string($value) || trim($value) === '') {
                throw new SpecException('articleNumber', 'articleNumber must be a non-empty string (the "Article Number" box)');
            }
            $body['articleNumber'] = $value;
        }
        if ($root->has('categories')) {
            $paths = $root->get('categories');
            if (!is_array($paths) || !array_is_list($paths) || array_filter($paths, fn ($path) => !is_string($path)) !== []) {
                throw new SpecException('categories', 'categories must be a list of category paths');
            }
            $byPath = [];
            foreach (Repo::category()->getCollector()->filterByContextIds([$context->getId()])->getMany() as $category) {
                $byPath[$category->getPath()] = (int) $category->getId();
            }
            $ids = [];
            foreach ($paths as $i => $path) {
                $ids[] = $byPath[$path] ?? throw new SpecException("categories.{$i}", "No category \"{$path}\" in \"{$context->getPath()}\" (the \"Categories\" list offers: " . implode(', ', array_keys($byPath)) . ')');
            }
            if (count(array_unique($ids)) !== count($ids)) {
                throw new SpecException('categories', 'categories names a category twice; the list selects each once');
            }
            $body['categoryIds'] = $ids;
        }
        if ($root->has('urlPath')) {
            $value = $root->get('urlPath');
            if (!is_string($value) || $value === '') {
                throw new SpecException('urlPath', 'urlPath must be a non-empty string (the "URL Path" box)');
            }
            $body['urlPath'] = $value;
        }
        if ($root->has('datePublished')) {
            // The page's date box (OJS "Publication Date", OMP "Date
            // Published", OPS "Date Posted"): a text box the schema reads
            // as date_format:Y-m-d. Kept by the publish, which stamps today
            // only on an empty box (each app's setStatusOnPublish).
            $value = $root->get('datePublished');
            $parsed = is_string($value) ? \DateTime::createFromFormat('!Y-m-d', $value) : false;
            if (!$parsed || $parsed->format('Y-m-d') !== $value) {
                throw new SpecException('datePublished', 'datePublished must be a date as YYYY-MM-DD (the publication page\'s date box)');
            }
            $body['datePublished'] = $value;
        }
        $coverImage = null;
        if (($coverSpec = $root->child('coverImage')) !== null) {
            $fixture = $this->resolveFixture((string) $coverSpec->require('file'), 'coverImage.file');
            $mimeType = PKPString::mime_content_type($fixture['path'], pathinfo($fixture['file'], PATHINFO_EXTENSION));
            if (!(new \APP\file\PublicFileManager())->getImageExtension($mimeType)) {
                throw new SpecException('coverImage.file', "The \"Cover Image\" box takes an image; \"{$fixture['file']}\" is {$mimeType}");
            }
            $altText = $coverSpec->get('altText', '');
            if (!is_string($altText)) {
                throw new SpecException('coverImage.altText', 'coverImage.altText must be a string (the box under the image)');
            }
            $coverImage = ['fixture' => $fixture, 'altText' => $altText, 'locale' => $locale];
        }
        return ['specKey' => $keys[0], 'body' => $body, 'coverImage' => $coverImage];
    }

    /**
     * The publication pages' "Save" (U13), acting as the editor on the
     * current (unpublished) version, one page after the other as the
     * editor goes down the side menu: "Title & Abstract", "Metadata",
     * "Publication Settings" ("Preprint entry"), each page's fields in its
     * own PUT (the handler logs one "metadata updated" line per save), a
     * page whose fields the seed does not set left unsaved. The cover
     * image is uploaded first (the image box's POST temporaryFiles). Each
     * body goes through PKPSubmissionController::editPublication itself
     * (ApiCall; the policies' submission and the editor's roles set
     * directly). A refusal is the page's own and becomes a 400 naming the
     * first key.
     */
    protected function seedPublicationPages(int $submissionId, array $plan, User $editor): void
    {
        $submission = Repo::submission()->get($submissionId);
        $publicationId = (int) $submission->getData('currentPublicationId');
        $body = $plan['body'];
        if ($plan['coverImage'] !== null) {
            $temporaryFile = LibraryFileSeeder::upload($plan['coverImage']['fixture'], $editor);
            $body['coverImage'] = [$plan['coverImage']['locale'] => [
                'temporaryFileId' => (int) $temporaryFile->getId(),
                'altText' => $plan['coverImage']['altText'],
            ]];
        }
        $pages = [
            ['subtitle', 'plainLanguageSummary'],
            array_merge(self::PUBLICATION_TERM_LISTS, ['articleNumber']),
            ['categoryIds', 'coverImage', 'urlPath', 'datePublished'],
        ];
        foreach ($pages as $fields) {
            $pageBody = array_intersect_key($body, array_flip($fields));
            if ($pageBody === []) {
                continue;
            }
            $controller = ApiCall::controller(
                \APP\API\v1\submissions\SubmissionController::class,
                [
                    Application::ASSOC_TYPE_SUBMISSION => Repo::submission()->get($submissionId),
                    Application::ASSOC_TYPE_USER_ROLES => [Role::ROLE_ID_SITE_ADMIN, Role::ROLE_ID_MANAGER],
                ]
            );
            $request = ApiCall::request(
                \Illuminate\Http\Request::class,
                'PUT',
                $pageBody,
                ['submissionId' => $submissionId, 'publicationId' => $publicationId],
                $plan['specKey'],
                'The publication page\'s "Save" would be refused'
            );
            $response = $controller->editPublication($request);
            if ($response->getStatusCode() >= 300) {
                // Name the refused field by its spec key.
                $errors = $response->getData(true);
                $field = explode('.', (string) array_key_first((array) $errors))[0];
                $specKey = ['categoryIds' => 'categories'][$field] ?? (array_key_exists($field, $body) ? $field : $plan['specKey']);
                throw new SpecException($specKey, "The publication page's \"Save\" was refused (HTTP {$response->getStatusCode()}): " . json_encode($errors));
            }
        }
    }

    /**
     * Read galleys[] (U33): each entry a galley on the submission's current
     * publication, as the "Galleys" page's "Create New Galley" window and
     * the upload wizard it opens create one. Parse-phase: no writes. The
     * window's refusals are the seed's: a label is required, the language
     * must be one the window's list offers (the context's submission
     * locales and the submission's own), and the entry names exactly one
     * of `file` (a basename under apps/<app>/playwright/fixtures/files/,
     * mounted at classes/testing/fixtures/) or `urlRemote`.
     *
     * @return array<int, array{label: string, locale: string, file: ?string, path: ?string, urlRemote: ?string, urlPath: ?string, genreId: ?int}>
     */
    protected function parseGalleys(Context $context, Spec $root, string $submissionLocale): array
    {
        if (!$root->has('galleys')) {
            return [];
        }
        $this->assertGalleysSupported($root);
        $offeredLocales = array_unique(array_merge([$submissionLocale], (array) $context->getSupportedSubmissionLocales()));
        $plans = [];
        foreach ($root->childList('galleys') as $spec) {
            $label = $spec->require('label');
            if (!is_string($label) || trim($label) === '') {
                throw new SpecException("{$spec->path}.label", 'label must be a non-empty string (the "Create New Galley" window requires a label)');
            }
            $locale = (string) $spec->get('locale', $submissionLocale);
            if (!in_array($locale, $offeredLocales, true)) {
                throw new SpecException("{$spec->path}.locale", 'locale must be one the "Create New Galley" window\'s language list offers: ' . implode(', ', $offeredLocales));
            }
            $hasFile = $spec->has('file');
            $hasRemote = $spec->has('urlRemote');
            if ($hasFile === $hasRemote) {
                throw new SpecException($spec->path, 'A galley names exactly one of "file" (a fixture basename) or "urlRemote"');
            }
            $file = null;
            $path = null;
            $urlRemote = null;
            $genreId = null;
            if ($hasFile) {
                ['file' => $file, 'path' => $path] = $this->resolveFixture((string) $spec->get('file'), "{$spec->path}.file");
                // The wizard's component (U13): one its list offers; absent,
                // the first it lists, as before.
                $genreId = $spec->has('genre') ? $this->resolveUploadGenreId($context, $spec) : null;
            } else {
                $urlRemote = (string) $spec->get('urlRemote');
                if (trim($urlRemote) === '') {
                    throw new SpecException("{$spec->path}.urlRemote", 'urlRemote must be a non-empty string');
                }
                foreach (['urlPath' => 'the window hides "URL Path" once "This galley will be available at a separate website." is ticked', 'genre' => 'a remotely hosted galley opens no upload wizard, so it has no component'] as $key => $why) {
                    if ($spec->has($key)) {
                        throw new SpecException("{$spec->path}.{$key}", "{$key} does not apply to a urlRemote galley: {$why}");
                    }
                }
            }
            // "URL Path" (U13), refused as the window refuses it
            // (ArticleGalleyForm / PreprintGalleyForm: the pattern check,
            // then validate()'s number and duplicate checks against the
            // version's galleys, here the ones listed before it).
            $urlPath = null;
            if ($spec->has('urlPath')) {
                $urlPath = $spec->get('urlPath');
                if (!is_string($urlPath) || $urlPath === '') {
                    throw new SpecException("{$spec->path}.urlPath", 'urlPath must be a non-empty string (the "URL Path" box)');
                }
                if (!preg_match('/^[a-zA-Z0-9]+([\\.\\-_][a-zA-Z0-9]+)*$/', $urlPath)) {
                    throw new SpecException("{$spec->path}.urlPath", 'This may only contain letters, numbers, dashes, underscores and periods.');
                }
                if (ctype_digit($urlPath)) {
                    throw new SpecException("{$spec->path}.urlPath", 'The URL path can not be a number.');
                }
                if (in_array($urlPath, array_column($plans, 'urlPath'), true)) {
                    throw new SpecException("{$spec->path}.urlPath", 'The URL path has already been used and can not be used again.');
                }
            }
            $plans[] = ['label' => $label, 'locale' => $locale, 'file' => $file, 'path' => $path, 'urlRemote' => $urlRemote, 'urlPath' => $urlPath, 'genreId' => $genreId];
        }
        return $plans;
    }

    /**
     * Seed the parsed galleys the way the "Galleys" page does, acting as
     * the editor: ArticleGalleyForm / PreprintGalleyForm::execute
     * (Repo::galley()->add), the grid handler's updateGalley notice
     * recompute, then for a file the wizard's SubmissionFilesUploadForm::
     * execute (file service add + Repo::submissionFile()->add at the proof
     * stage on the galley; the app repository links the galley's
     * submissionFileId) and the "Review Details" save
     * (SubmissionFilesMetadataForm::execute → Repo::submissionFile()->edit,
     * PKPManageFileApiHandler::saveMetadata's author-notification update and
     * MetadataChanged event).
     *
     * @return array<int, array{id: int, label: string, submissionFileId: ?int}>
     */
    protected function seedGalleys(Context $context, int $submissionId, array $plans, User $editor): array
    {
        $request = Application::get()->getRequest();
        $seeded = [];
        foreach ($plans as $plan) {
            $submission = Repo::submission()->get($submissionId);
            $publication = Repo::publication()->get($submission->getData('currentPublicationId'));

            // "Create New Galley" › Save (ArticleGalleyForm::execute).
            $galleyId = Repo::galley()->add(Repo::galley()->newDataObject([
                'publicationId' => $publication->getId(),
                'label' => $plan['label'],
                'locale' => $plan['locale'],
                'urlPath' => $plan['urlPath'],
                'urlRemote' => $plan['urlRemote'],
            ]));

            // ArticleGalleyGridHandler::updateGalley's tail.
            if (in_array((int) $submission->getData('stageId'), [WORKFLOW_STAGE_ID_EDITING, WORKFLOW_STAGE_ID_PRODUCTION], true)) {
                $notificationMgr = new \APP\notification\NotificationManager();
                $notificationMgr->updateNotification(
                    $request,
                    $this->galleyNoticeTypes(),
                    null,
                    Application::ASSOC_TYPE_SUBMISSION,
                    $submissionId
                );
            }

            $submissionFileId = null;
            if ($plan['path'] !== null) {
                // "Upload a File Ready for Publication": the upload wizard.
                $submissionFileId = $this->uploadThroughWizard(
                    $context,
                    $submissionId,
                    $editor,
                    ['file' => $plan['file'], 'path' => $plan['path']],
                    SubmissionFile::SUBMISSION_FILE_PROOF,
                    Application::ASSOC_TYPE_REPRESENTATION,
                    $galleyId,
                    $plan['genreId'] ?? $this->defaultGalleyGenreId($context)
                );
            }

            $seeded[] = [
                'id' => $galleyId,
                'label' => $plan['label'],
                'submissionFileId' => $submissionFileId,
            ];
        }

        // "Order" › "Save Order" with the galleys in the plan's order: the
        // grid's saveSequence (OrderGridItemsFeature::saveSequence, the op the
        // Vue galley list's "Save Order" posts too) gives each galley the
        // first one's sequence (0, as "Create New Galley" leaves every galley)
        // plus its position, through setDataElementSequence's
        // Repo::galley()->edit. Without it every galley sits at 0 and the list
        // (ordered by seq alone) comes back in whatever order the database
        // returns the tie, which a reload can change (fix list B, flake-s26).
        if (count($seeded) > 1) {
            foreach ($seeded as $position => $row) {
                if ($position > 0) {
                    Repo::galley()->edit(Repo::galley()->get($row['id']), ['seq' => $position]);
                }
            }
        }
        return $seeded;
    }

    /**
     * A fixture basename under apps/<app>/playwright/fixtures/files/, which
     * bin/mount.js copies to classes/testing/fixtures/ in the checkout.
     *
     * @return array{file: string, path: string}
     */
    protected function resolveFixture(string $file, string $specKey): array
    {
        $fixtureDir = Core::getBaseDir() . '/classes/testing/fixtures';
        if ($file === '' || $file !== basename($file)) {
            throw new SpecException($specKey, 'file is a basename under apps/<app>/playwright/fixtures/files/, no directory part');
        }
        $path = "{$fixtureDir}/{$file}";
        if (!is_file($path)) {
            throw new SpecException($specKey, "No fixture \"{$file}\" under {$fixtureDir} (bin/mount.js copies apps/<app>/playwright/fixtures/files/ there; re-run npm run mount)");
        }
        return ['file' => $file, 'path' => $path];
    }

    /**
     * The upload wizard (FileUploadWizardHandler), acting as the uploader:
     * step 1 "Upload File" (SubmissionFilesUploadForm::execute: the file
     * service's add into the submission's directory, a new SubmissionFile
     * named after the uploaded file, of the chosen component, on the list's
     * file stage and assoc — a review round is the wizard's reviewRoundId)
     * and step 2 "Review Details" › Continue
     * (PKPManageFileApiHandler::saveMetadata: SubmissionFilesMetadataForm::
     * execute → Repo::submissionFile()->edit with the name and the empty
     * artwork and supplementary boxes, the authors' notice recompute and the
     * MetadataChanged event; its "revisions requested" clean-up needs a
     * review round the handler never authorizes, so it never runs). Step 3
     * writes nothing.
     *
     * @param array{file: string, path: string} $fixture
     */
    protected function uploadThroughWizard(Context $context, int $submissionId, User $uploader, array $fixture, int $fileStage, ?int $assocType, ?int $assocId, int $genreId): int
    {
        $request = Application::get()->getRequest();
        $previousActingUser = Registry::get('user');
        Registry::set('user', $uploader);
        try {
            $submission = Repo::submission()->get($submissionId);
            $fileManager = new FileManager();
            $extension = $fileManager->parseFileExtension($fixture['file']);
            $submissionDir = Repo::submissionFile()->getSubmissionDir($context->getId(), $submissionId);
            $fileId = app()->get('file')->add($fixture['path'], $submissionDir . '/' . uniqid() . '.' . $extension);

            $submissionFile = Repo::submissionFile()->dao->newDataObject();
            $submissionFile->setData('fileId', $fileId);
            $submissionFile->setData('fileStage', $fileStage);
            $submissionFile->setData('name', $fixture['file'], $submission->getData('locale'));
            $submissionFile->setData('submissionId', $submissionId);
            $submissionFile->setData('uploaderUserId', $uploader->getId());
            $submissionFile->setData('assocType', $assocType);
            $submissionFile->setData('assocId', $assocId);
            $submissionFile->setData('genreId', $genreId);
            $submissionFileId = Repo::submissionFile()->add($submissionFile);

            $submissionFile = Repo::submissionFile()->get($submissionFileId);
            Repo::submissionFile()->edit($submissionFile, [
                'name' => [$submission->getData('locale') => $fixture['file']],
                'caption' => null,
                'credit' => null,
                'copyrightOwner' => null,
                'terms' => null,
                'subject' => null,
                'creator' => null,
                'description' => null,
                'publisher' => null,
                'sponsor' => null,
                'source' => null,
                'language' => null,
                'dateCreated' => null,
            ]);
            $submitterAssignments = StageAssignment::withSubmissionIds([$submissionId])
                ->withRoleIds([Role::ROLE_ID_AUTHOR])
                ->get();
            $notificationMgr = new \APP\notification\NotificationManager();
            $notificationMgr->updateNotification(
                $request,
                $this->fileMetadataNoticeTypes(),
                $submitterAssignments->pluck('user_id')->all(),
                Application::ASSOC_TYPE_SUBMISSION,
                $submissionId
            );
            event(new MetadataChanged(Repo::submission()->get($submissionId)));
            return $submissionFileId;
        } finally {
            Registry::set('user', $previousActingUser);
        }
    }

    /**
     * The submission wizard's "Files" panel, acting as the submitter (the
     * caller's acting user): the upload is POST submissions/{id}/files
     * (PKPSubmissionFileController::add, step for step: the file service's
     * add, the name the uploaded file's own, the lone-genre default, the
     * repository's validate against the context's submission metadata
     * locales, then add), and the panel's component choice is PUT
     * submissions/{id}/files/{fileId} {genreId}
     * (PKPSubmissionFileController::edit: validate, then edit).
     *
     * @param array{file: string, path: string} $fixture
     */
    protected function uploadThroughSubmissionWizard(Context $context, int $submissionId, User $submitter, array $fixture, int $genreId): int
    {
        $submission = Repo::submission()->get($submissionId);
        $submissionLocale = $submission->getData('locale');
        $allowedLocales = $context->getSupportedSubmissionMetadataLocales();

        $fileManager = new FileManager();
        $extension = $fileManager->parseFileExtension($fixture['file']);
        $submissionDir = Repo::submissionFile()->getSubmissionDir($context->getId(), $submissionId);
        $fileId = app()->get('file')->add($fixture['path'], $submissionDir . '/' . uniqid() . '.' . $extension);

        $params = [
            'fileStage' => SubmissionFile::SUBMISSION_FILE_SUBMISSION,
            'fileId' => $fileId,
            'submissionId' => $submissionId,
            'uploaderUserId' => (int) $submitter->getId(),
            'name' => [$submissionLocale => $fixture['file']],
        ];
        $genreDao = DAORegistry::getDAO('GenreDAO'); /** @var \PKP\submission\GenreDAO $genreDao */
        $genres = $genreDao->getEnabledByContextId($context->getId());
        [$firstGenre, $secondGenre] = [$genres->next(), $genres->next()];
        if ($firstGenre && !$secondGenre) {
            $params['genreId'] = $firstGenre->getId();
        }
        $errors = Repo::submissionFile()->validate(null, $params, $allowedLocales, $submissionLocale);
        if (!empty($errors)) {
            app()->get('file')->delete($fileId);
            throw new SpecException('files', 'The "Files" panel\'s upload would be refused: ' . json_encode($errors));
        }
        $submissionFileId = Repo::submissionFile()->add(Repo::submissionFile()->newDataObject($params));

        if ((int) ($params['genreId'] ?? 0) !== $genreId) {
            $submissionFile = Repo::submissionFile()->get($submissionFileId);
            $edit = ['genreId' => $genreId];
            $errors = Repo::submissionFile()->validate($submissionFile, $edit, $allowedLocales, $submissionLocale);
            if (!empty($errors)) {
                throw new SpecException('files', 'The "Files" panel\'s component choice would be refused: ' . json_encode($errors));
            }
            Repo::submissionFile()->edit($submissionFile, $edit);
        }
        return $submissionFileId;
    }

    /**
     * Upload the parsed round files into the round, acting as the editor,
     * the way "Files for Review" › "Upload/Select Files" › "Upload Review
     * File" does: the upload wizard on the stage's review-file stage with
     * the round as its assoc (the submission-file DAO writes the
     * review_round_files row), then the window's "OK" over the ticked rows.
     *
     * @return array<int, array{submissionFileId: int, file: string, fileStage: int, reviewRoundId: int, uploader: string}>
     */
    protected function seedRoundFiles(Context $context, int $submissionId, ReviewRound $round, array $plans, User $editor): array
    {
        $fileStage = (int) $round->getStageId() === WORKFLOW_STAGE_ID_INTERNAL_REVIEW
            ? SubmissionFile::SUBMISSION_FILE_INTERNAL_REVIEW_FILE
            : SubmissionFile::SUBMISSION_FILE_REVIEW_FILE;
        $seeded = [];
        foreach ($plans as $plan) {
            $submissionFileId = $this->uploadThroughWizard(
                $context,
                $submissionId,
                $editor,
                $plan['fixture'],
                $fileStage,
                Application::ASSOC_TYPE_REVIEW_ROUND,
                $round->getId(),
                $plan['genreId']
            );
            $seeded[] = [
                'submissionFileId' => $submissionFileId,
                'file' => $plan['fixture']['file'],
                'fileStage' => $fileStage,
                'reviewRoundId' => (int) $round->getId(),
                'uploader' => $editor->getUsername(),
            ];
        }
        if ($seeded !== []) {
            // The window's "OK" with every uploaded row ticked (an upload
            // lands unticked, so the user ticks it): ManageReviewFilesForm::
            // execute over the grid's rows, the round's review files, which
            // marks each viewable (a Repo edit and its fileEdited rows).
            $roundFiles = Repo::submissionFile()
                ->getCollector()
                ->filterBySubmissionIds([$submissionId])
                ->filterByReviewRoundIds([$round->getId()])
                ->filterByFileStages([$fileStage])
                ->getMany();
            $stageSubmissionFiles = [];
            foreach ($roundFiles as $roundFile) {
                $stageSubmissionFiles[$roundFile->getId()] = ['submissionFile' => $roundFile];
            }
            $previousActingUser = Registry::get('user');
            Registry::set('user', $editor);
            try {
                $form = new \PKP\controllers\grid\files\review\form\ManageReviewFilesForm($submissionId, $round->getStageId(), $round->getId());
                $form->setData('selectedFiles', array_keys($stageSubmissionFiles));
                $form->execute($stageSubmissionFiles);
            } finally {
                Registry::set('user', $previousActingUser);
            }
        }
        return $seeded;
    }

    /**
     * "More Information" › "Notes" › "Add Note" on a file, acting as the
     * writer: FileInformationCenterHandler::saveNote's NewFileNoteForm::
     * execute (the note row, the textarea's text as typed) and its
     * notePosted event-log row (the handler's own _logEvent). Not mirrored:
     * the "Note posted." toast for the acting user.
     */
    protected function addFileNote(int $submissionFileId, string $text, User $writer): void
    {
        $request = Application::get()->getRequest();
        $previousActingUser = Registry::get('user');
        Registry::set('user', $writer);
        try {
            $form = new \PKP\controllers\informationCenter\form\NewFileNoteForm($submissionFileId);
            $form->setData('newNote', $text);
            $form->execute();
            $handler = new \PKP\controllers\informationCenter\FileInformationCenterHandler();
            $handler->_logEvent(
                $request,
                Repo::submissionFile()->get($submissionFileId),
                \PKP\log\event\EventLogEntry::SUBMISSION_LOG_NOTE_POSTED,
                Application::ASSOC_TYPE_SUBMISSION_FILE
            );
        } finally {
            Registry::set('user', $previousActingUser);
        }
    }

    /**
     * Read files[] (U36): files on the "Submission Files" list. Parse-phase:
     * no writes. The screens' reach is the seed's: a file uploaded by the
     * submitter is the wizard's (so allowed on a draft); anyone else uploads
     * through the workflow, which exists only once the submission is
     * submitted, and must be someone the "Upload" is offered to there (the
     * site admin, a manager of the context, or a sub-editor or assistant
     * assigned in this request's participants[]). A note needs the
     * workflow's "More Information", so a submitted submission.
     *
     * @param array<int, array{user: User, userGroup: UserGroup}> $participantPlans
     * @return array<int, array{fixture: array, genreId: int, uploader: User, byWizard: bool, note: ?string, submissionFileId: ?int}>
     */
    protected function parseFiles(Context $context, Spec $root, User $submitter, bool $submitted, array $participantPlans): array
    {
        if (!$root->has('files')) {
            return [];
        }
        $this->assertFilesSupported('files');
        $plans = [];
        foreach ($root->childList('files') as $spec) {
            $fixture = $this->resolveFixture((string) $spec->require('file'), "{$spec->path}.file");
            $genreId = $this->resolveUploadGenreId($context, $spec);
            $uploader = $submitter;
            if ($spec->has('uploader')) {
                $username = (string) $spec->get('uploader');
                $uploader = Repo::user()->getByUsername($username, true);
                if (!$uploader) {
                    throw new SpecException("{$spec->path}.uploader", "Unknown uploader username \"{$username}\"");
                }
            }
            $byWizard = $uploader->getId() === $submitter->getId();
            if (!$byWizard) {
                if (!$submitted) {
                    throw new SpecException("{$spec->path}.uploader", 'Only the submitter uploads to a draft (the wizard\'s "Files" panel); anyone else uploads on the workflow, which a draft does not have');
                }
                if (!$this->mayUploadOnWorkflow($context, $uploader, $participantPlans)) {
                    throw new SpecException("{$spec->path}.uploader", "\"{$uploader->getUsername()}\" is offered no \"Upload\" on \"Submission Files\": the uploader must be the submitter, the site admin, a manager of the context, or a sub-editor or assistant assigned in participants[]");
                }
            }
            $note = null;
            if ($spec->has('note')) {
                $note = $spec->get('note');
                if (!is_string($note) || trim($note) === '') {
                    throw new SpecException("{$spec->path}.note", 'note must be a non-empty string (the "Add Note" box\'s text)');
                }
                if (!$submitted) {
                    throw new SpecException("{$spec->path}.note", 'A note is added in the workflow\'s "More Information" window, which a draft does not have');
                }
            }
            $plans[] = [
                'fixture' => $fixture,
                'genreId' => $genreId,
                'uploader' => $uploader,
                'byWizard' => $byWizard,
                'note' => $note,
                'submissionFileId' => null,
            ];
        }
        return $plans;
    }

    /** Whether the workflow's "Submission Files" list offers this user "Upload". */
    protected function mayUploadOnWorkflow(Context $context, User $user, array $participantPlans): bool
    {
        if ($user->hasRole([Role::ROLE_ID_SITE_ADMIN], \PKP\core\PKPApplication::SITE_CONTEXT_ID)
            || $user->hasRole([Role::ROLE_ID_MANAGER], $context->getId())) {
            return true;
        }
        foreach ($participantPlans as $plan) {
            if ($plan['user']->getId() === $user->getId()
                && in_array((int) $plan['userGroup']->roleId, [Role::ROLE_ID_MANAGER, Role::ROLE_ID_SUB_EDITOR, Role::ROLE_ID_ASSISTANT], true)) {
                return true;
            }
        }
        return false;
    }

    /**
     * An entry's `genre`: the name (any locale) of one of the components the
     * upload lists offer — the context's enabled, non-dependent genres, the
     * list of the upload wizard's "Article Component" and of the submission
     * wizard's "What kind of file is this?" (GenreDAO::
     * getByDependenceAndContextId(false)); absent, the first main-work one. A
     * dependent component is offered only by the "Upload a Dependent File"
     * wizard, so it is refused.
     */
    protected function resolveUploadGenreId(Context $context, Spec $spec): int
    {
        $genreDao = DAORegistry::getDAO('GenreDAO'); /** @var \PKP\submission\GenreDAO $genreDao */
        if (!$spec->has('genre')) {
            // The first main-work component (neither dependent nor
            // supplementary: "Article Text", "Book Manuscript"), the first
            // button the wizard's "Files" panel offers; else the first the
            // upload lists offer.
            $genres = $genreDao->getByDependenceAndContextId(false, $context->getId());
            while ($genre = $genres->next()) {
                if (!$genre->getSupplementary()) {
                    return (int) $genre->getId();
                }
            }
            return $this->defaultGalleyGenreId($context);
        }
        $name = (string) $spec->get('genre');
        $genres = $genreDao->getByDependenceAndContextId(false, $context->getId());
        $names = [];
        while ($genre = $genres->next()) {
            if (in_array($name, (array) $genre->getName(null), true)) {
                return (int) $genre->getId();
            }
            $names[] = $genre->getLocalizedName();
        }
        throw new SpecException("{$spec->path}.genre", "No component \"{$name}\" among those the upload lists offer in \"{$context->getPath()}\": " . implode(', ', array_map(fn ($n) => "\"{$n}\"", $names)));
    }

    /**
     * The genre the upload wizard's list offers first: the context's
     * non-dependent genres in their sequence (SubmissionFilesUploadForm::
     * _retrieveGenreList → GenreDAO::getByDependenceAndContextId(false)).
     */
    protected function defaultGalleyGenreId(Context $context): int
    {
        $genreDao = DAORegistry::getDAO('GenreDAO'); /** @var \PKP\submission\GenreDAO $genreDao */
        $genre = $genreDao->getByDependenceAndContextId(false, $context->getId())->next();
        if (!$genre) {
            throw new SpecException('galleys', 'The context has no non-dependent genre for the upload wizard to offer');
        }
        return (int) $genre->getId();
    }

    /**
     * Read mediaFiles[] (U47): media files on the current publication's
     * "Media" page, each {file*, genre?, resolution?, name?, pair?}.
     * Parse-phase: no writes. The page's refusals are the seed's:
     * - the page is on the workflow, so a draft refuses the key;
     * - `genre` is a name (any locale) of a component the "Upload Media
     *   File" window's "What kind of media is this?" lists: every component
     *   of the context marked as a dependent file (the page's genres API
     *   list, GenreController::getMany → GenreDAO::getByContextId, filtered
     *   on `dependent` by the page's store); absent, "Image" (the
     *   installed IMAGE component), which the list must then offer;
     * - `resolution` is `web` (the list's start, "Web resolution") or
     *   `high_resolution` ("High resolution"), the latter only for a
     *   component with "File Variants" ticked (the list is greyed out on
     *   "Web resolution" for any other);
     * - `name` is the "Edit Metadata" window's "Name of the file", a
     *   non-empty string (the window refuses an empty one);
     * - `pair` is a label shared by exactly two entries, one `web` and one
     *   `high_resolution` of the same component: the "Batch Link Media"
     *   window's row for the web file set to the other (the window pairs
     *   only files of one component with "File Variants" ticked).
     *
     * @return array<int, array{path: string, fixture: array, genreId: int, genreName: string, resolution: string, name: ?string, pair: ?string, category: int}>
     */
    protected function parseMediaFiles(Context $context, Spec $root, bool $submitted, string $submissionLocale): array
    {
        if (!$root->has('mediaFiles')) {
            return [];
        }
        if (!$submitted) {
            throw new SpecException('mediaFiles', 'The "Media" page is on the workflow, which a draft does not have: mediaFiles needs submitted: true');
        }
        $genreDao = DAORegistry::getDAO('GenreDAO'); /** @var \PKP\submission\GenreDAO $genreDao */
        $offered = [];
        $genres = $genreDao->getByContextId($context->getId());
        while ($genre = $genres->next()) {
            if ($genre->getDependent()) {
                $offered[] = $genre;
            }
        }
        $offeredNames = implode(', ', array_map(fn ($g) => '"' . $g->getLocalizedName() . '"', $offered)) ?: '(none: no component is marked as a dependent file)';
        $plans = [];
        foreach ($root->childList('mediaFiles') as $spec) {
            $fixture = $this->resolveFixture((string) $spec->require('file'), "{$spec->path}.file");
            $genre = null;
            if ($spec->has('genre')) {
                $genreName = (string) $spec->get('genre');
                foreach ($offered as $candidate) {
                    if (in_array($genreName, (array) $candidate->getName(null), true)) {
                        $genre = $candidate;
                        break;
                    }
                }
                if (!$genre) {
                    throw new SpecException("{$spec->path}.genre", "\"What kind of media is this?\" offers no \"{$genreName}\" in \"{$context->getPath()}\": {$offeredNames}");
                }
            } else {
                foreach ($offered as $candidate) {
                    if ($candidate->getKey() === 'IMAGE') {
                        $genre = $candidate;
                        break;
                    }
                }
                if (!$genre) {
                    throw new SpecException("{$spec->path}.genre", "\"What kind of media is this?\" offers no \"Image\" (the default) in \"{$context->getPath()}\"; name one of: {$offeredNames}");
                }
            }
            $resolution = $spec->get('resolution', \PKP\submissionFile\enums\MediaVariantType::WEB->value);
            if (!is_string($resolution) || !\PKP\submissionFile\enums\MediaVariantType::tryFrom($resolution)) {
                throw new SpecException("{$spec->path}.resolution", 'resolution is "web" ("Web resolution") or "high_resolution" ("High resolution")');
            }
            if ($resolution !== \PKP\submissionFile\enums\MediaVariantType::WEB->value && !$genre->getSupportsFileVariants()) {
                throw new SpecException("{$spec->path}.resolution", "\"File resolution type\" is greyed out on \"Web resolution\" for \"{$genre->getLocalizedName()}\", whose \"File Variants\" box is unticked");
            }
            $name = null;
            if ($spec->has('name')) {
                $name = $spec->get('name');
                if (!is_string($name) || trim($name) === '') {
                    throw new SpecException("{$spec->path}.name", 'name must be a non-empty string ("Name of the file" is required)');
                }
            }
            $pair = null;
            if ($spec->has('pair')) {
                $pair = $spec->get('pair');
                if (!is_string($pair) || $pair === '') {
                    throw new SpecException("{$spec->path}.pair", 'pair is a label shared by the two entries to link');
                }
            }
            $plans[] = [
                'path' => $spec->path,
                'fixture' => $fixture,
                'genreId' => (int) $genre->getId(),
                'genreName' => (string) $genre->getLocalizedName(),
                'supportsFileVariants' => $genre->getSupportsFileVariants(),
                'category' => (int) $genre->getCategory(),
                'resolution' => $resolution,
                'name' => $name,
                'pair' => $pair,
            ];
        }
        $byPair = [];
        foreach ($plans as $i => $plan) {
            if ($plan['pair'] !== null) {
                $byPair[$plan['pair']][] = $i;
            }
        }
        foreach ($byPair as $label => $indexes) {
            $members = array_map(fn ($i) => $plans[$i], $indexes);
            $resolutions = array_column($members, 'resolution');
            sort($resolutions);
            if (count($indexes) !== 2 || $resolutions !== ['high_resolution', 'web']) {
                throw new SpecException("{$members[0]['path']}.pair", "pair \"{$label}\" needs exactly two entries, one \"web\" and one \"high_resolution\" (a file has at most one counterpart, of the other resolution)");
            }
            if ($members[0]['genreId'] !== $members[1]['genreId']) {
                throw new SpecException("{$members[0]['path']}.pair", "pair \"{$label}\" joins two components; \"Batch Link Media\" pairs files of one component only");
            }
        }
        return $plans;
    }

    /**
     * Seed the parsed media files the way the "Media" page adds them,
     * acting as the editor (admin), through MediaFilesController's own
     * actions and form requests (ApiCall; the controller standing as the
     * route's API controller, which the requests read the authorized
     * objects through):
     * 1. each card's upload: POST temporaryFiles (TemporaryFileManager::
     *    handleUpload, LibraryFileSeeder::upload), whose answer the window
     *    keeps;
     * 2. "Upload Files": one POST mediaFiles with every card, each the
     *    upload's answer plus temporaryFileId, genreId and variantType
     *    (AddMediaFiles, MediaFilesController::add: the file service's add,
     *    Repo::submissionFile()->validate and ->add at SUBMISSION_FILE_MEDIA
     *    on the publication, named after the uploaded file);
     * 3. per `name`, the row's "Edit Metadata" › "Save": PUT
     *    mediaFiles/{id} with the window's fields, the name and the
     *    component's empty "File Metadata" fields (EditMediaFile,
     *    MediaFilesController::edit);
     * 4. with any `pair`, "Batch Link Media" › "Link Media": one POST
     *    mediaFiles/link with a row per web-resolution file of a component
     *    with "File Variants" ticked, the paired ones set to their
     *    high-resolution counterpart and the rest to null, as the window
     *    posts them (LinkManyMediaFiles, MediaFilesController::linkMany →
     *    VariantGroup::link, which copies the shared details from the web
     *    file).
     *
     * @return array<int, array{submissionFileId: int, file: string, name: string, genre: string, resolution: string, variantGroupId: ?int}>
     */
    protected function seedMediaFiles(int $submissionId, array $plans, User $editor): array
    {
        $previousActingUser = Registry::get('user');
        Registry::set('user', $editor);
        try {
            $submission = Repo::submission()->get($submissionId);
            $publication = Repo::publication()->get($submission->getData('currentPublicationId'));
            $routeParams = ['submissionId' => $submissionId, 'publicationId' => $publication->getId()];
            $authorized = [Application::ASSOC_TYPE_SUBMISSION => $submission, Application::ASSOC_TYPE_PUBLICATION => $publication];
            $controllerClass = \PKP\API\v1\submissions\MediaFilesController::class;

            // 1 and 2: the cards' uploads, then "Upload Files".
            $cards = [];
            foreach ($plans as $plan) {
                $temporaryFile = LibraryFileSeeder::upload($plan['fixture'], $editor);
                $cards[] = [
                    'id' => (int) $temporaryFile->getId(),
                    'name' => (string) $temporaryFile->getData('originalFileName'),
                    'mimetype' => (string) $temporaryFile->getData('filetype'),
                    'documentType' => app()->get('file')->getDocumentType($temporaryFile->getData('filetype')),
                    'temporaryFileId' => (int) $temporaryFile->getId(),
                    'genreId' => $plan['genreId'],
                    'variantType' => $plan['resolution'],
                ];
            }
            $controller = ApiCall::controller($controllerClass, $authorized);
            $added = ApiCall::asRouteController($controller, function () use ($controller, $cards, $routeParams) {
                $request = ApiCall::request(\PKP\API\v1\submissions\formRequests\AddMediaFiles::class, 'POST', ['files' => $cards], $routeParams, 'mediaFiles', 'The "Upload Media File" window\'s "Upload Files" would be refused');
                return ApiCall::answer($controller->add($request), 'mediaFiles', 'The "Upload Media File" window\'s "Upload Files" was refused');
            });
            $fileIds = array_map(fn (array $file) => (int) $file['id'], $added);

            // 3: "Edit Metadata" › "Save" per named entry.
            foreach ($plans as $i => $plan) {
                if ($plan['name'] === null) {
                    continue;
                }
                $submissionFile = Repo::submissionFile()->get($fileIds[$i]);
                // The window posts its every field: "Name of the file", and
                // the component's "File Metadata" fields, empty on a new file
                // (Artwork: four plain boxes; Supplementary Content: eight,
                // six of them multilingual).
                $submissionLocale = $submission->getData('locale');
                $body = ['name' => [$submissionLocale => $plan['name']]];
                if ($plan['category'] === \PKP\submission\Genre::GENRE_CATEGORY_ARTWORK) {
                    $body += ['caption' => '', 'credit' => '', 'copyrightOwner' => '', 'terms' => ''];
                } elseif ($plan['category'] === \PKP\submission\Genre::GENRE_CATEGORY_SUPPLEMENTARY) {
                    foreach (['description', 'creator', 'publisher', 'source', 'subject', 'sponsor'] as $field) {
                        $body[$field] = [$submissionLocale => ''];
                    }
                    $body += ['dateCreated' => '', 'language' => ''];
                }
                $controller = ApiCall::controller($controllerClass, $authorized + [Application::ASSOC_TYPE_SUBMISSION_FILE => $submissionFile]);
                ApiCall::asRouteController($controller, function () use ($controller, $body, $routeParams, $submissionFile, $plan) {
                    $request = ApiCall::request(\PKP\API\v1\submissions\formRequests\EditMediaFile::class, 'PUT', $body, $routeParams + ['submissionFileId' => $submissionFile->getId()], "{$plan['path']}.name", 'The "Edit Metadata" window\'s "Save" would be refused');
                    return ApiCall::answer($controller->edit($request), "{$plan['path']}.name", 'The "Edit Metadata" window\'s "Save" was refused');
                });
            }

            // 4: "Batch Link Media" › "Link Media".
            $pairs = [];
            foreach ($plans as $i => $plan) {
                if ($plan['pair'] !== null) {
                    $pairs[$plan['pair']][$plan['resolution']] = $fileIds[$i];
                }
            }
            if ($pairs !== []) {
                $partnerOf = [];
                foreach ($pairs as $pair) {
                    $partnerOf[$pair['web']] = $pair['high_resolution'];
                }
                $links = [];
                foreach ($plans as $i => $plan) {
                    if ($plan['resolution'] === \PKP\submissionFile\enums\MediaVariantType::WEB->value && $plan['supportsFileVariants']) {
                        $links[] = ['primarySubmissionFileId' => $fileIds[$i], 'secondarySubmissionFileId' => $partnerOf[$fileIds[$i]] ?? null];
                    }
                }
                $controller = ApiCall::controller($controllerClass, $authorized);
                ApiCall::asRouteController($controller, function () use ($controller, $links, $routeParams) {
                    $request = ApiCall::request(\PKP\API\v1\submissions\formRequests\LinkManyMediaFiles::class, 'POST', ['links' => $links], $routeParams, 'mediaFiles', 'The "Batch Link Media" window\'s "Link Media" would be refused');
                    return ApiCall::answer($controller->linkMany($request), 'mediaFiles', 'The "Batch Link Media" window\'s "Link Media" was refused');
                });
            }

            $seeded = [];
            foreach ($plans as $i => $plan) {
                $submissionFile = Repo::submissionFile()->get($fileIds[$i]);
                $seeded[] = [
                    'submissionFileId' => $fileIds[$i],
                    'file' => $plan['fixture']['file'],
                    'name' => (string) $submissionFile->getData('name', $submission->getData('locale')),
                    'genre' => $plan['genreName'],
                    'resolution' => $plan['resolution'],
                    'variantGroupId' => $submissionFile->getData('variantGroupId') ? (int) $submissionFile->getData('variantGroupId') : null,
                ];
            }
            return $seeded;
        } finally {
            Registry::set('user', $previousActingUser);
        }
    }

    /**
     * Read userComments[] (U14): each entry a reader's comment on the
     * published publication, optionally approved and reported. Parse-phase:
     * no writes. The refusals follow the screens: no comment without a
     * published publication (the box exists on a published landing page
     * only, and AddComment refuses a publication that is not the
     * submission's current one), no report on a comment that is not
     * approved (nobody but the writer sees a pending or hidden comment, so
     * the "…" menu offers "Report" on approved comments alone), no report
     * by the writer (their own menu offers "Delete Comment" and no
     * "Report"). Text and note are stripped as the form requests strip the
     * posted values (AddComment::validated, AddReport::validated).
     *
     * @return array<int, array{user: User, text: string, approved: bool, reports: array<int, array{user: User, note: string}>}>
     */
    protected function parseUserComments(Spec $root, bool $published): array
    {
        if (!$root->has('userComments')) {
            return [];
        }
        if (!$published) {
            throw new SpecException('userComments', 'userComments needs published: true — the comment box exists on a published item\'s landing page only, and the comments API refuses a publication that is not the submission\'s current published version');
        }
        $plans = [];
        foreach ($root->childList('userComments') as $spec) {
            $username = (string) $spec->require('user');
            $user = Repo::user()->getByUsername($username, true);
            if (!$user) {
                throw new SpecException("{$spec->path}.user", "Unknown username \"{$username}\"");
            }
            $text = $spec->require('text');
            if (!is_string($text) || trim($text) === '') {
                throw new SpecException("{$spec->path}.text", 'text must be a non-empty string (the box\'s "Submit" posts its text; the API refuses an empty one)');
            }
            $approved = $spec->get('approved', false);
            if (!is_bool($approved)) {
                throw new SpecException("{$spec->path}.approved", 'approved must be a boolean (true: approved on the Comments page, false: pending)');
            }
            $reports = [];
            foreach ($spec->childList('reports') as $reportSpec) {
                if (!$approved) {
                    throw new SpecException("{$spec->path}.reports", 'reports need approved: true — nobody but the writer sees a pending or hidden comment on the landing page, so the "…" menu offers "Report" on approved comments alone');
                }
                $reporterName = (string) $reportSpec->require('user');
                $reporter = Repo::user()->getByUsername($reporterName, true);
                if (!$reporter) {
                    throw new SpecException("{$reportSpec->path}.user", "Unknown username \"{$reporterName}\"");
                }
                if ($reporter->getId() === $user->getId()) {
                    throw new SpecException("{$reportSpec->path}.user", 'a comment\'s own writer is offered no "Report" (their menu holds "Delete Comment" alone), so a self-report cannot be seeded');
                }
                $note = $reportSpec->require('note');
                if (!is_string($note) || trim($note) === '') {
                    throw new SpecException("{$reportSpec->path}.note", 'note must be a non-empty string (the "Report Comment" dialog\'s reason box; the API refuses an empty one)');
                }
                $reports[] = ['user' => $reporter, 'note' => PKPString::stripUnsafeHtml($note)];
            }
            $plans[] = [
                'user' => $user,
                'text' => PKPString::stripUnsafeHtml($text),
                'approved' => $approved,
                'reports' => $reports,
            ];
        }
        return $plans;
    }

    /**
     * Write the parsed comments the way the comments API writes them
     * (UserCommentController): the comment through UserComment::create()
     * with the writer as its user (submit), the approval as setApproval
     * writes it (isApproved, approvedAt now, approvedByUserId the acting
     * moderator), each report through Repo::userComment()->addReport()
     * (submitReport), and after the comment and after each report the
     * controller's own notifyModerators() — the task row per manager and
     * site admin of the context that the Tasks panel lists — invoked by
     * reflection so the roster query and the createNotification call are
     * the controller's, not a copy. The request's context is already forced
     * to the submission's (build()), which is what Repo::userComment() and
     * notifyModerators() read.
     *
     * @return array<int, array{id: int, user: string, approved: bool, reports: int[]}>
     */
    protected function seedUserComments(Context $context, int $publicationId, array $plans, User $moderator): array
    {
        $controller = new \PKP\API\v1\comments\UserCommentController();
        $notifyModerators = new \ReflectionMethod($controller, 'notifyModerators');
        $seeded = [];
        foreach ($plans as $plan) {
            $comment = UserComment::query()->create([
                'userId' => $plan['user']->getId(),
                'contextId' => $context->getId(),
                'publicationId' => $publicationId,
                'commentText' => $plan['text'],
                'isApproved' => false,
            ]);
            $notifyModerators->invoke($controller, $comment->id, Application::ASSOC_TYPE_COMMENT, Notification::NOTIFICATION_TYPE_USER_COMMENT_POSTED);

            if ($plan['approved']) {
                $comment->isApproved = true;
                $comment->approvedAt = now();
                $comment->approvedByUserId = $moderator->getId();
                $comment->save();
            }

            $reportIds = [];
            foreach ($plan['reports'] as $report) {
                $reportId = Repo::userComment()->addReport($comment, $report['user'], $report['note']);
                $notifyModerators->invoke($controller, $reportId, Application::ASSOC_TYPE_COMMENT_REPORT, Notification::NOTIFICATION_TYPE_USER_COMMENT_REPORTED);
                $reportIds[] = $reportId;
            }

            $seeded[] = [
                'id' => (int) $comment->id,
                'user' => $plan['user']->getUsername(),
                'approved' => $plan['approved'],
                'reports' => $reportIds,
            ];
        }
        return $seeded;
    }

    /**
     * Read reviewerSuggestions[] and validate each entry with the rules the
     * wizard's "Add Reviewer Suggestion" window is validated with
     * (AddReviewerSuggestion::rules, minus the two DB-exists rules that hold
     * by construction here): givenName required, familyName optional, email
     * required and valid, affiliation and the reason required (defaulted by
     * the seed the way the abstract is), every multilingual box a locale
     * map over the context's form locales with the primary locale present.
     * The API's per-submission unique email is checked within the list —
     * the submission does not exist yet, so nothing else can clash.
     * Parse-phase: no writes.
     *
     * @return array<int, array<string, mixed>> the create() payloads, minus submissionId / suggestingUserId
     */
    protected function parseReviewerSuggestions(Context $context, Spec $root, string $tag): array
    {
        if (!$context->getData('reviewerSuggestionEnabled')) {
            throw new SpecException('reviewerSuggestions', 'The wizard offers the "Reviewer Suggestions" step only while the context\'s "Reviewer Suggestion at Submission" setting is on: seed the context with review.reviewerSuggestionEnabled: true');
        }
        $primaryLocale = $context->getPrimaryLocale();
        // AddReviewerSuggestion::allowedLocales: the form locales plus the site's primary locale.
        $allowedLocales = (array) $context->getSupportedFormLocales();
        $sitePrimaryLocale = Application::get()->getRequest()->getSite()->getPrimaryLocale();
        if (!in_array($sitePrimaryLocale, $allowedLocales)) {
            $allowedLocales[] = $sitePrimaryLocale;
        }
        $rules = [
            'givenName' => ['required', 'array', new MultilingualInput($primaryLocale, $allowedLocales, true)],
            'familyName' => ['sometimes', 'array', new MultilingualInput($primaryLocale, $allowedLocales, false)],
            'email' => ['required', 'email'],
            'affiliation' => ['required', 'array', new MultilingualInput($primaryLocale, $allowedLocales, true)],
            'suggestionReason' => ['required', 'array', new MultilingualInput($primaryLocale, $allowedLocales, true)],
        ];

        $plans = [];
        $emails = [];
        foreach ($root->childList('reviewerSuggestions') as $spec) {
            $plan = [
                'givenName' => $spec->localized('givenName', $primaryLocale),
                'email' => (string) $spec->require('email'),
                'affiliation' => $spec->localized('affiliation', $primaryLocale, str_replace('{tag}', $tag, self::DEFAULT_SUGGESTION_AFFILIATION)),
                'suggestionReason' => $spec->localized('suggestionReason', $primaryLocale, str_replace('{tag}', $tag, self::DEFAULT_SUGGESTION_REASON)),
            ];
            if ($plan['givenName'] === null) {
                throw new SpecException("{$spec->path}.givenName", "Missing required spec key \"{$spec->path}.givenName\"");
            }
            if ($spec->has('familyName')) {
                $plan['familyName'] = $spec->localized('familyName', $primaryLocale);
            }
            // The reason box is a rich-text editor, which posts a paragraph
            // ("<p>…</p>") for plain typed text: wrap a bare string the same
            // way; a string that already carries markup is kept.
            foreach ($plan['suggestionReason'] as $reasonLocale => $reason) {
                $reason = (string) $reason;
                if ($reason !== '' && !str_starts_with(ltrim($reason), '<')) {
                    $plan['suggestionReason'][$reasonLocale] = "<p>{$reason}</p>";
                }
            }
            // The window's "Save" is refused with the same messages.
            $validator = ValidatorFactory::make($plan, $rules);
            if ($validator->fails()) {
                $messages = [];
                foreach ($validator->errors()->toArray() as $field => $fieldMessages) {
                    $messages[] = "{$field}: " . implode(' ', $fieldMessages);
                }
                throw new SpecException($spec->path, 'The "Add Reviewer Suggestion" window would refuse this entry: ' . implode('; ', $messages));
            }
            if (in_array($plan['email'], $emails, true)) {
                throw new SpecException("{$spec->path}.email", "Two suggestions on one submission cannot share the email address \"{$plan['email']}\" (the window refuses the second)");
            }
            $emails[] = $plan['email'];
            // The multilingual validated() drops empty locale values.
            foreach (['givenName', 'familyName', 'affiliation', 'suggestionReason'] as $multilingualKey) {
                if (isset($plan[$multilingualKey])) {
                    $plan[$multilingualKey] = array_filter($plan[$multilingualKey]);
                }
            }
            $plans[] = $plan;
        }
        return $plans;
    }

    /**
     * The wizard's submit-as resolution (PKPSubmissionController::add parity):
     * the user's author/manager group, authors preferred; fall back to
     * enrolling in the context's default author group.
     */
    protected function resolveSubmitAsUserGroup(Context $context, User $submitter): UserGroup
    {
        $submitterUserGroups = UserGroup::withContextIds($context->getId())
            ->withRoleIds([Role::ROLE_ID_MANAGER, Role::ROLE_ID_AUTHOR])
            ->whereHas('userUserGroups', function ($query) use ($submitter) {
                $query->withUserId($submitter->getId())->withActive();
            })
            ->get();

        if ($submitterUserGroups->count()) {
            return $submitterUserGroups
                ->sort(fn (UserGroup $a, UserGroup $b) => ((int) $a->roleId) === Role::ROLE_ID_AUTHOR ? -1 : 1)
                ->first();
        }

        $submitAsUserGroup = UserGroup::withContextIds($context->getId())
            ->withRoleIds(Role::ROLE_ID_AUTHOR)
            ->first();
        if (!$submitAsUserGroup) {
            throw new SpecException('submitter', 'This context has no author user group to submit as');
        }
        Repo::userGroup()->assignUserToGroup($submitter->getId(), $submitAsUserGroup->id);
        return $submitAsUserGroup;
    }

    /**
     * Assign + confirm/decline reviewers on a round through the real editor
     * and reviewer actions.
     *
     * @param array{user: User, status: string}[] $reviewers
     */
    protected function seedRoundReviewers(Context $context, int $submissionId, \PKP\submission\reviewRound\ReviewRound $round, array $reviewers): array
    {
        $request = Application::get()->getRequest();
        $editorAction = new EditorAction();
        $reviewerAction = new ReviewerAction();
        $seeded = [];

        // addReviewer() reads the Add Reviewer form's skipEmail user var; the
        // form's "do not send email" path is the parity-correct one for
        // seeding (scenario-side mail is dropped regardless — Mail::fake).
        // Deviation from the mail-sending path is recorded in the parity
        // ledger (no REVIEW_REQUEST email log row on seeded assignments).
        app('request')->merge(['skipEmail' => 1]);

        // Due dates at Add Reviewer form parity: the app's own
        // HasReviewDueDate trait (review due = today + numWeeksPerReview,
        // response due = today + numWeeksPerResponse, each from its OWN
        // interval with the trait's 4/3-week fallbacks), formatted as the
        // datepicker's Y-m-d altField submits them (parity fix 2026-08-02 —
        // the builder used to seed review due = today + response + review).
        [$reviewDueTimestamp, $responseDueTimestamp] = $this->getDueDates($context);
        $reviewDueDate = date('Y-m-d', $reviewDueTimestamp);
        $responseDueDate = date('Y-m-d', $responseDueTimestamp);

        // The Add Reviewer form always submits a review method: the context's
        // defaultReviewMode with a double-anonymous fallback
        // (ReviewerForm::initData ~206-210; schema default 2). Passing null
        // here would let the review_assignments column default (anonymous)
        // win — a state no UI path produces (parity fix 2026-08-23).
        $reviewMethod = (int) $context->getData('defaultReviewMode');
        if (!$reviewMethod) {
            $reviewMethod = ReviewAssignment::SUBMISSION_REVIEW_METHOD_DOUBLEANONYMOUS;
        }

        // The section/series default review form, exactly as the Add Reviewer
        // form resolves it (ReviewerForm::initData ~212-221) and validates it
        // on save (ReviewerForm::execute ~366-369).
        $submission = Repo::submission()->get($submissionId);
        $sectionId = $submission->getCurrentPublication()->getData(Application::getSectionIdPropName());
        $section = $sectionId ? Repo::section()->get($sectionId, $context->getId()) : null;
        $reviewFormId = $section ? (int) $section->getReviewFormId() : 0;
        $reviewFormDao = DAORegistry::getDAO('ReviewFormDAO'); /** @var \PKP\reviewForm\ReviewFormDAO $reviewFormDao */
        $reviewForm = $reviewFormDao->getById($reviewFormId, Application::getContextAssocType(), $context->getId());

        // The round's files the Add Reviewer form lists (ReviewerForm::
        // execute: the review-file stage of the round's stage).
        $roundFiles = Repo::submissionFile()
            ->getCollector()
            ->filterBySubmissionIds([$submissionId])
            ->filterByReviewRoundIds([$round->getId()])
            ->filterByFileStages([(int) $round->getStageId() === WORKFLOW_STAGE_ID_INTERNAL_REVIEW ? SubmissionFile::SUBMISSION_FILE_INTERNAL_REVIEW_FILE : SubmissionFile::SUBMISSION_FILE_REVIEW_FILE])
            ->getMany();
        $reviewFilesDao = DAORegistry::getDAO('ReviewFilesDAO'); /** @var \PKP\submission\ReviewFilesDAO $reviewFilesDao */

        foreach ($reviewers as $plan) {
            $reviewer = $plan['user'];
            $submission = Repo::submission()->get($submissionId);
            $editorAction->addReviewer(
                $request,
                $submission,
                $reviewer->getId(),
                $round,
                $reviewDueDate,
                $responseDueDate,
                $reviewMethod,
                // pass explicitly: the seeding request is site-wide, so the
                // service must not fall back to $request->getContext()
                (bool) $context->getData('defaultReviewPublicVisibility')
            );
            $assignment = Repo::reviewAssignment()->getCollector()
                ->filterByReviewRoundIds([$round->getId()])
                ->filterByReviewerIds([$reviewer->getId()])
                ->getMany()
                ->first();
            if (!$assignment) {
                throw new SpecException('reviewRounds', "Review assignment for \"{$reviewer->getUsername()}\" was not created");
            }
            // The Add Reviewer form's post-add stamp, mirrored from
            // ReviewerForm::execute ~371-375: notification date, the
            // section's default review form, and considered = NEW.
            Repo::reviewAssignment()->edit($assignment, [
                'dateNotified' => \PKP\core\Core::getCurrentDate(),
                'reviewFormId' => $reviewForm ? $reviewFormId : null,
                'considered' => ReviewAssignment::REVIEW_ASSIGNMENT_NEW,
            ]);

            // The form's file list (the round's review files, every box
            // ticked by default): ReviewerForm::execute grants each. A
            // round seeded without files has none, so nothing is granted.
            foreach ($roundFiles as $roundFile) {
                $reviewFilesDao->grant($assignment->getId(), $roundFile->getId());
            }

            if ($plan['reviewFormId'] !== null) {
                // The reviewer row's "Edit" window (EditReviewForm::execute
                // ~207-215): the assignment's review-form id, valid while
                // the review is not completed. Dates and method are the
                // form's own values here, so the window would send no
                // "assignment changed" notification or email either.
                $assignment = Repo::reviewAssignment()->get($assignment->getId());
                Repo::reviewAssignment()->edit($assignment, ['reviewFormId' => $plan['reviewFormId']]);
            }

            if ($plan['status'] !== 'invited') {
                $assignment = Repo::reviewAssignment()->get($assignment->getId());
                $previousActingUser = Registry::get('user');
                Registry::set('user', $reviewer);
                try {
                    if ($plan['status'] === 'completed') {
                        // "Accept Review, Continue to Step #2" IS the step-1
                        // form (PKPReviewerHandler::saveStep → Step1Form::
                        // execute: competing-interests declaration when the
                        // context asks, step → 2, confirmReview(false)), then
                        // step 2 and step 3's "Submit Review".
                        $this->runReviewerStep($request, $submission, $assignment, 1);
                        $this->completeReview($request, $submission, $assignment, $plan['comments'], $plan['recommendationId']);
                        if ($plan['dateCompleted'] !== null) {
                            $this->backdateCompletedReview($assignment->getId(), $plan['dateCompleted']);
                        }
                    } else {
                        // accepted / declined: the bare ReviewerAction call,
                        // as before. A seeded acceptance therefore leaves
                        // step = 1 (the UI's accept moves it to 2 and, when
                        // the context asks, declares competing interests);
                        // the U28 suites walk the wizard from step 1 on it,
                        // so this stays a documented deviation
                        // (parity-ledger 2026-09-06).
                        $reviewerAction->confirmReview($request, $assignment, $submission, $plan['status'] === 'declined');
                    }
                } finally {
                    Registry::set('user', $previousActingUser);
                }
            }

            $assignment = Repo::reviewAssignment()->get($assignment->getId());
            $seeded[] = [
                'id' => $assignment->getId(),
                'reviewerId' => $reviewer->getId(),
                'username' => $reviewer->getUsername(),
                'status' => $plan['status'],
                'reviewRoundId' => $round->getId(),
            ];
        }
        return $seeded;
    }

    /**
     * Run one reviewer-wizard step form's execute() on the assignment, the
     * way PKPReviewerHandler::saveStep does after validate(). The form reads
     * the CURRENT assignment row, so callers re-fetch after each step.
     *
     * @param array<string, mixed> $data the step's posted fields (setData)
     */
    protected function runReviewerStep(\PKP\core\PKPRequest $request, \APP\submission\Submission $submission, ReviewAssignment $assignment, int $step, array $data = []): void
    {
        $formClass = "\\PKP\\submission\\reviewer\\form\\PKPReviewerReviewStep{$step}Form";
        $form = new $formClass($request, $submission, $assignment);
        foreach ($data as $key => $value) {
            $form->setData($key, $value);
        }
        $form->execute();
    }

    /**
     * "Continue to Step #3" then "Submit Review" + "OK": the step-2 and
     * step-3 forms (PKPReviewerReviewStep3Form::execute — review comment,
     * dateCompleted + recommendation, editors' REVIEWER_COMMENT notifications
     * and REVIEW_COMPLETE mail log, task removal, reviewReady event log).
     * The step-3 validator refuses a submit that leaves a required
     * review-form question unanswered; the seed refuses the same.
     */
    protected function completeReview(\PKP\core\PKPRequest $request, \APP\submission\Submission $submission, ReviewAssignment $assignment, string $comments, ?int $recommendationId): void
    {
        $assignment = Repo::reviewAssignment()->get($assignment->getId());
        if ($assignment->getReviewFormId()) {
            $reviewFormElementDao = DAORegistry::getDAO('ReviewFormElementDAO'); /** @var \PKP\reviewForm\ReviewFormElementDAO $reviewFormElementDao */
            if ($reviewFormElementDao->getRequiredReviewFormElementIds($assignment->getReviewFormId())) {
                throw new SpecException('reviewRounds', "A completed review cannot be seeded on a review form with required questions (the wizard refuses the submit); use a form without required items or complete the review on screen");
            }
        }
        $this->runReviewerStep($request, $submission, $assignment, 2);
        $assignment = Repo::reviewAssignment()->get($assignment->getId());
        $this->runReviewerStep($request, $submission, $assignment, 3, [
            'reviewFormResponses' => null,
            'comments' => $comments,
            'commentsPrivate' => '',
            'reviewerRecommendationId' => $recommendationId,
        ]);
    }

    /**
     * `reviewers[].dateCompleted` (U07): the day a `completed` review was
     * submitted, `YYYY-MM-DD`, today or earlier. Parse phase: no writes.
     */
    protected function parseDateCompleted(Spec $reviewerSpec): ?string
    {
        $value = $reviewerSpec->get('dateCompleted');
        if ($value === null) {
            return null;
        }
        $parsed = is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)
            ? \DateTime::createFromFormat('!Y-m-d', $value)
            : false;
        if (!$parsed || $parsed->format('Y-m-d') !== $value) {
            throw new SpecException("{$reviewerSpec->path}.dateCompleted", 'dateCompleted must be a date written YYYY-MM-DD');
        }
        if ($value > \Carbon\Carbon::today()->toDateString()) {
            throw new SpecException("{$reviewerSpec->path}.dateCompleted", 'dateCompleted must not be after today');
        }
        return $value;
    }

    /**
     * Move a review the wizard has just completed back to the given day
     * (D9: no screen or service completes a review on another day than
     * today). The wizard's own completion runs first; then every date the
     * assignment carries (assigned, notified, confirmed, completed, due,
     * response due, and any other set one) is shifted by the same number
     * of days, so the assignment keeps the wizard's own intervals and reads
     * as a review requested, accepted and submitted around that day. Written
     * through the review-assignment repository's edit, the app's own write.
     * The submission, its round, the event log and the notifications keep
     * today's dates.
     */
    protected function backdateCompletedReview(int $reviewAssignmentId, string $day): void
    {
        $assignment = Repo::reviewAssignment()->get($reviewAssignmentId);
        $completed = \Carbon\Carbon::parse($assignment->getDateCompleted());
        $days = (int) round($completed->copy()->startOfDay()->diffInDays(\Carbon\Carbon::parse($day)->startOfDay(), false));
        if ($days === 0) {
            return;
        }
        $shifted = [];
        foreach ($assignment->_data as $key => $value) {
            if (str_starts_with($key, 'date') && is_string($value) && $value !== '') {
                $shifted[$key] = \Carbon\Carbon::parse($value)->addDays($days)->format('Y-m-d H:i:s');
            }
        }
        Repo::reviewAssignment()->edit($assignment, $shifted);
    }

    /**
     * Resolve a recommendation name (the tail of the app's default
     * recommendation translation key: accept, pendingRevisions, resubmitHere,
     * resubmitElsewhere, decline, seeComments) against the context's ACTIVE
     * recommendations — the ones step 3's "Recommendation" list offers.
     */
    protected function resolveRecommendationId(Context $context, string $name, string $specKey): int
    {
        $prefix = 'reviewer.article.decision.';
        $recommendations = \PKP\submission\reviewer\recommendation\ReviewerRecommendation::query()
            ->withContextId($context->getId())
            ->withActive()
            ->get();
        $names = [];
        foreach ($recommendations as $recommendation) {
            $key = (string) $recommendation->getAttribute(\PKP\submission\reviewer\recommendation\ReviewerRecommendation::DEFAULT_RECOMMENDATION_TRANSLATION_KEY);
            if ($key === $prefix . $name) {
                return (int) $recommendation->getAttribute('reviewerRecommendationId');
            }
            if (str_starts_with($key, $prefix)) {
                $names[] = substr($key, strlen($prefix));
            }
        }
        $available = $names ? implode(', ', $names) : '(none)';
        throw new SpecException($specKey, "Unknown recommendation \"{$name}\". Active recommendations in context \"{$context->getPath()}\": {$available}");
    }

    /**
     * Resolve a review form title against the context's ACTIVE forms — the
     * ones the reviewer row's "Edit" window lists (EditReviewForm::fetch,
     * ReviewFormDAO::getActiveByAssocId). Matches any locale's title.
     */
    protected function resolveActiveReviewFormId(Context $context, string $title, string $specKey): int
    {
        $reviewFormDao = DAORegistry::getDAO('ReviewFormDAO'); /** @var \PKP\reviewForm\ReviewFormDAO $reviewFormDao */
        $forms = $reviewFormDao->getActiveByAssocId(Application::getContextAssocType(), $context->getId())->toArray();
        $titles = [];
        foreach ($forms as $form) {
            $formTitles = (array) $form->getTitle(null);
            if (in_array($title, $formTitles, true)) {
                return (int) $form->getId();
            }
            $titles[] = $form->getLocalizedTitle();
        }
        $available = $titles ? implode(', ', array_map(fn ($t) => "\"{$t}\"", $titles)) : '(none)';
        throw new SpecException($specKey, "No active review form titled \"{$title}\" in context \"{$context->getPath()}\". Active forms: {$available}");
    }

    /** Resolve a decision name against the app's own decision types. */
    protected function resolveDecisionType(string $name, string $specKey): \PKP\decision\DecisionType
    {
        $types = Repo::decision()->getDecisionTypes();
        foreach ($types as $type) {
            if (lcfirst(class_basename($type)) === $name) {
                return $type;
            }
        }
        $available = $types
            ->map(fn ($type) => lcfirst(class_basename($type)))
            ->sort()
            ->values()
            ->join(', ');
        throw new SpecException($specKey, "Unknown decision \"{$name}\". This app's decisions: {$available}");
    }

    /** The editor decisions are attributed to: the installer's admin. */
    /** The default first message of a seeded discussion or task. */
    public const DEFAULT_TASK_MESSAGE = 'Seeded message for {tag}.';

    /**
     * Read tasks[] (U37): each entry a discussion or task on one stage's
     * "Tasks & Discussions" panel, as its "Add" window saves it. Parse
     * phase: shapes and usernames only; the window's own refusals (Rule 8:
     * participants assigned to the stage, the creator among them unless
     * manager-level, two for a discussion, one owner for a task, the
     * anonymity rules) are the controller's validation, run at execute.
     *
     * @return array<int, array<string, mixed>>
     */
    protected function parseTasks(Spec $root, bool $submitted, string $tag): array
    {
        if (!$root->has('tasks')) {
            return [];
        }
        if (!$submitted) {
            throw new SpecException('tasks', 'A draft has no workflow and no "Tasks & Discussions" panel: tasks needs submitted: true');
        }
        $resolveUser = function (string $username, string $specKey): User {
            $user = Repo::user()->getByUsername($username, true);
            if (!$user) {
                throw new SpecException($specKey, "Unknown username \"{$username}\"");
            }
            return $user;
        };
        $plans = [];
        foreach ($root->childList('tasks') as $spec) {
            $type = (string) $spec->get('type', 'discussion');
            if (!in_array($type, ['discussion', 'task'], true)) {
                throw new SpecException("{$spec->path}.type", 'type must be "discussion" or "task" (the "Enter task information" box)');
            }
            $isTask = $type === 'task';
            $title = (string) $spec->require('title');
            $stageId = $spec->has('stage') ? ApiCall::stageId((string) $spec->get('stage'), "{$spec->path}.stage") : null;
            $creator = $resolveUser((string) $spec->require('creator'), "{$spec->path}.creator");
            $usernames = $spec->require('participants');
            if (!is_array($usernames) || !array_is_list($usernames)) {
                throw new SpecException("{$spec->path}.participants", 'participants must be a list of usernames (the ticked "Participants" boxes)');
            }
            $participants = [];
            foreach ($usernames as $i => $username) {
                $participants[] = $resolveUser((string) $username, "{$spec->path}.participants.{$i}");
            }
            foreach (['owner', 'dateDue', 'started'] as $taskKey) {
                if (!$isTask && $spec->has($taskKey)) {
                    throw new SpecException("{$spec->path}.{$taskKey}", "\"{$taskKey}\" belongs to a task (type: \"task\"); a discussion has no task information");
                }
            }
            $owner = null;
            $dateDue = null;
            $started = false;
            if ($isTask) {
                $owner = $resolveUser((string) $spec->require('owner'), "{$spec->path}.owner");
                $dateDue = (string) $spec->require('dateDue');
                $parsed = \DateTime::createFromFormat('!Y-m-d', $dateDue);
                if (!$parsed || $parsed->format('Y-m-d') !== $dateDue) {
                    throw new SpecException("{$spec->path}.dateDue", 'dateDue must be a date as YYYY-MM-DD');
                }
                $started = $spec->get('started', true);
                if (!is_bool($started)) {
                    throw new SpecException("{$spec->path}.started", 'started must be a boolean ("Begin Task Upon Saving" or "Create Task (Do Not Start)")');
                }
            }
            // The message box is a rich-text editor, which posts a paragraph
            // ("<p>…</p>") for plain typed text: wrap a bare string the same
            // way; a string that already carries markup is kept.
            $message = (string) $spec->get('message', str_replace('{tag}', $tag, self::DEFAULT_TASK_MESSAGE));
            if ($message !== '' && !str_starts_with(ltrim($message), '<')) {
                $message = "<p>{$message}</p>";
            }
            $plans[] = [
                'path' => $spec->path,
                'type' => $type,
                'title' => $title,
                'stageId' => $stageId,
                'creator' => $creator,
                'participants' => $participants,
                'owner' => $owner,
                'dateDue' => $dateDue,
                'started' => $started,
                'message' => $message,
            ];
        }
        return $plans;
    }

    /**
     * Save each parsed item the way the panel's "Add" window saves it, as
     * its creator: the window's JSON body (type, title, stageId, dateDue,
     * participants with the owner's isResponsible, the message as
     * `description`, no files) run through the AddTask request's own
     * rules and handed to EditorialTaskController::addTask itself (the
     * task, its participants, the head note, the "created" History entry,
     * then notifyParticipants: one "Discussion added." Tasks row and one
     * email, faked, with its email-log row, per participant and the
     * creator, and on Copyediting and Production the stage notices'
     * update). A task with started true is then "Begin Task Upon Saving"'s
     * second call, EditorialTaskController::startTask, as the creator.
     *
     * One deliberate difference: the window refuses a due date before
     * today (A10), so a past dateDue stands for a task whose due date has
     * passed since it was saved; the seed lifts that one rule
     * (`after_or_equal:today`) and nothing else, and every other row of
     * the item is stamped at the seed's time (parity ledger 2026-09-23).
     *
     * @return array<int, array{id: int, title: string, type: string, stage: string}>
     */
    protected function seedTasks(\APP\submission\Submission $submission, array $plans): array
    {
        $appStages = Application::getApplicationStages();
        $currentStageId = (int) $submission->getData('stageId');
        $reached = array_values(array_filter($appStages, fn (int $stageId) => $stageId <= $currentStageId));
        $seeded = [];
        foreach ($plans as $plan) {
            $stageId = $plan['stageId'] ?? (in_array($currentStageId, $appStages, true) ? $currentStageId : end($reached));
            if (!in_array($stageId, $reached, true)) {
                throw new SpecException("{$plan['path']}.stage", 'The submission has not reached the ' . ApiCall::stageWord($stageId) . ' stage, so its panel is not on screen yet (stages reached: ' . implode(', ', array_map(fn (int $id) => ApiCall::stageWord($id), $reached)) . ')');
            }
            $isTask = $plan['type'] === 'task';
            $participants = [];
            foreach ($plan['participants'] as $user) {
                $participant = ['userId' => $user->getId()];
                if ($isTask) {
                    $participant['isResponsible'] = $user->getId() === $plan['owner']->getId();
                }
                $participants[] = $participant;
            }
            if ($isTask && !in_array($plan['owner']->getId(), array_column($participants, 'userId'), true)) {
                throw new SpecException("{$plan['path']}.owner", 'The owner list offers only the people ticked under "Participants": the owner must be one of participants');
            }
            $body = [
                'type' => $isTask ? \PKP\editorialTask\enums\EditorialTaskType::TASK->value : \PKP\editorialTask\enums\EditorialTaskType::DISCUSSION->value,
                'title' => $plan['title'],
                'stageId' => $stageId,
                'participants' => $participants,
                'description' => $plan['message'],
                'submissionFileIds' => [],
            ];
            if ($isTask) {
                $body['dateDue'] = $plan['dateDue'];
            }
            $pastDue = $isTask && $plan['dateDue'] < date('Y-m-d');

            $previousActingUser = Registry::get('user');
            Registry::set('user', $plan['creator']);
            try {
                $request = ApiCall::request(
                    \PKP\API\v1\submissions\tasks\formRequests\AddTask::class,
                    'POST',
                    $body,
                    ['submissionId' => $submission->getId()],
                    $plan['path'],
                    'The "Add" window\'s "Save" would be refused',
                    $pastDue ? fn (array $rules) => array_merge($rules, [
                        'dateDue' => array_values(array_filter($rules['dateDue'], fn ($rule) => $rule !== 'after_or_equal:today')),
                    ]) : null
                );
                $controller = ApiCall::controller(
                    \PKP\API\v1\submissions\tasks\EditorialTaskController::class,
                    [Application::ASSOC_TYPE_SUBMISSION => $submission]
                );
                $task = ApiCall::answer($controller->addTask($request), $plan['path'], 'The "Add" window\'s "Save" failed');
                if ($isTask && $plan['started']) {
                    $startRequest = ApiCall::request(
                        \Illuminate\Http\Request::class,
                        'PUT',
                        [],
                        ['submissionId' => $submission->getId(), 'taskId' => $task['id']],
                        $plan['path'],
                        ''
                    );
                    ApiCall::answer($controller->startTask($startRequest), "{$plan['path']}.started", '"Begin Task Upon Saving" could not start the task');
                }
            } finally {
                Registry::set('user', $previousActingUser);
            }
            $seeded[] = [
                'id' => (int) $task['id'],
                'title' => $plan['title'],
                'type' => $plan['type'],
                'stage' => ApiCall::stageWord($stageId),
            ];
        }
        return $seeded;
    }

    protected function actingEditor(): User
    {
        $admin = Repo::user()->getByUsername('admin', true);
        if (!$admin) {
            throw new SpecException('context', 'No admin user found — is the test install bootstrapped?');
        }
        return $admin;
    }
}
