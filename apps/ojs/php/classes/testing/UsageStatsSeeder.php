<?php

/**
 * @file classes/testing/UsageStatsSeeder.php
 *
 * Copyright (c) 2026 Simon Fraser University
 * Copyright (c) 2026 John Willinsky
 * Distributed under the GNU GPL v3. For full terms see the file docs/COPYING.
 *
 * @class UsageStatsSeeder
 *
 * @brief The journal's usage visits (U64): the lines carry `issueId` and
 * `issueGalleyId` (LogUsageEvent on OJS); an article's page and galley
 * visits name the article's issue (ArticleHandler passes it); a work's
 * `usage[]` entry adds `jatsViews` (the "JATS XML" download,
 * PKPJatsController::download), and the context scenario's
 * `issues[].usage[]` the issue's table of contents (`views`,
 * IssueHandler::view) and its galleys' files (`galleyDownloads`, one count
 * per `issues[].galleys[]` entry, IssueHandler::download).
 */

namespace APP\testing;

use APP\core\Application;
use APP\facades\Repo;
use PKP\core\PKPApplication;
use PKP\testing\PKPUsageStatsSeeder;
use PKP\testing\Spec;
use PKP\testing\SpecException;

class UsageStatsSeeder extends PKPUsageStatsSeeder
{
    protected function appFields(): array
    {
        return ['issueId' => null, 'issueGalleyId' => null];
    }

    protected function workPage(): array
    {
        return ['article', 'view'];
    }

    public function workCountKeys(): array
    {
        return ['abstractViews', 'jatsViews'];
    }

    protected function workFields(\APP\publication\Publication $publication, int $assocType): array
    {
        return ['issueId' => $publication->getData('issueId') ? (int) $publication->getData('issueId') : null];
    }

    /**
     * `jatsViews`: the published version's "JATS XML" downloads, the
     * landing page's link, there only while the JATS is public
     * (PKPJatsController::publicDownload refuses a reader otherwise). The
     * download records a view only when the JATS it serves has a body
     * (an uploaded JATS file, or one the JATS Template Plugin builds from
     * a galley's text); metadata-only JATS is not counted, so the key is
     * refused there, as is a version with no public JATS at all.
     */
    protected function addAppWorkUsage(array $plan, \APP\submission\Submission $submission, \APP\publication\Publication $publication): void
    {
        $count = $plan['counts']['jatsViews'] ?? 0;
        if ($count === 0) {
            return;
        }
        if (!$publication->getData('jatsPublicVisibility')) {
            throw new SpecException("{$plan['path']}.jatsViews", 'The version\'s JATS XML is not public (jats.makePublic: true, the "JATS XML" page\'s "Make available with publication"), so the landing page has no "JATS XML" link and its download refuses a reader');
        }
        $content = Repo::jats()->getPublicJatsContent($publication->getId(), $submission->getId());
        $dom = new \DOMDocument();
        if (!$content || !@$dom->loadXML($content) || $dom->getElementsByTagName('body')->length === 0) {
            throw new SpecException("{$plan['path']}.jatsViews", 'The version\'s public JATS XML has no body (none uploaded with jats.file and made public, and none the JATS Template Plugin builds from a galley), and PKPJatsController::download counts no such download');
        }
        $request = Application::get()->getRequest();
        $url = $request->getDispatcher()->url($request, PKPApplication::ROUTE_API, $this->context->getPath(), "submissions/{$submission->getId()}/publications/{$publication->getId()}/jats/download");
        $this->visits($count, $plan['day'], Application::ASSOC_TYPE_JATS, $url, ['submissionId' => $submission->getId()], $plan['geo']);
    }

    /**
     * An issue's `usage[]` (the context scenario's `issues[]` entry): each
     * entry `{daysAgo | date, views?, galleyDownloads?}`. The listener
     * records visits to a published issue only. Parse phase.
     */
    public static function parseIssueUsage(Spec $issueSpec, bool $published, int $galleyCount): array
    {
        if (!$issueSpec->has('usage')) {
            return [];
        }
        $plans = self::parse($issueSpec, 'usage', ['views'], ['galleyDownloads']);
        if (!$published) {
            throw new SpecException("{$issueSpec->path}.usage", 'The usage event listener records visits to a published issue only: usage needs published: true on the issue');
        }
        foreach ($plans as $plan) {
            foreach (array_keys($plan['lists']['galleyDownloads'] ?? []) as $i) {
                if ($i >= $galleyCount) {
                    throw new SpecException("{$plan['path']}.galleyDownloads.{$i}", "galleyDownloads has one count per galleys[] entry of the issue; there is no entry {$i}");
                }
            }
        }
        return $plans;
    }

    /** @param int[] $galleyIds the issue's seeded galleys, in order */
    public function addIssueUsage(array $plans, int $issueId, array $galleyIds): void
    {
        $viewUrl = $this->pageUrl('issue', 'view', [$issueId]);
        foreach ($plans as $plan) {
            $this->visits($plan['counts']['views'] ?? 0, $plan['day'], Application::ASSOC_TYPE_ISSUE, $viewUrl, [], [null, null, null], ['issueId' => $issueId]);
            foreach ($plan['lists']['galleyDownloads'] ?? [] as $i => $count) {
                $galleyId = $galleyIds[$i];
                $this->visits($count, $plan['day'], Application::ASSOC_TYPE_ISSUE_GALLEY, $this->pageUrl('issue', 'download', [$issueId, $galleyId]), [], [null, null, null], ['issueId' => $issueId, 'issueGalleyId' => $galleyId]);
            }
        }
    }
}
