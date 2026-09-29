<?php

/**
 * @file classes/testing/ContextScenarioBuilder.php
 *
 * Copyright (c) 2026 Simon Fraser University
 * Copyright (c) 2026 John Willinsky
 * Distributed under the GNU GPL v3. For full terms see the file docs/COPYING.
 *
 * @class ContextScenarioBuilder
 *
 * @brief OJS scratch-journal scenario (a fresh journal gets its default
 * "Articles" section from the Context::add hook; user section assignments
 * resolve by abbrev; the issues[] overlay, U08; the subscription keys,
 * U51; the LOCKSS and CLOCKSS boxes, U67).
 */

namespace APP\testing;

use PKP\context\Context;
use PKP\testing\PKPContextScenarioBuilder;
use PKP\testing\Spec;
use PKP\testing\SpecException;

class ContextScenarioBuilder extends PKPContextScenarioBuilder
{
    protected function structureKey(): string
    {
        return 'sections';
    }

    protected function resolveStructureId(Context $context, string $identifier): ?int
    {
        return BootstrapSeeder::findSectionId($context, $identifier);
    }

    /** Same field roster as BootstrapSeeder::parseStructure (kept in step). */
    protected function parseStructure(Spec $spec): array
    {
        return [
            'abbrev' => (string) $spec->require('abbrev'),
            'title' => $spec->get('title'),
            'policy' => $spec->get('policy'),
            'wordCount' => $spec->get('wordCount'),
            'abstractsNotRequired' => (bool) $spec->get('abstractsNotRequired', false),
            'identifyType' => $spec->get('identifyType'),
            'hideTitle' => BootstrapSeeder::parseHideTitle($spec),
        ];
    }

    protected function addStructure(Context $context, array $plan, int $sequence): int
    {
        return BootstrapSeeder::addSection($context, $plan, $sequence);
    }

    /**
     * The shared passthroughs, plus the journal's Settings › Distribution ›
     * "Archiving" › "LOCKSS and CLOCKSS" boxes (U67; ArchivingLockssForm, an
     * OJS form over the lib/pkp context schema's nullable booleans
     * `enableLockss` and `enableClockss`, no default: a new journal has no
     * row, both boxes unticked). The form's "Save" is one PUT to
     * `contexts/{id}` carrying both boxes, which PKPContextController::edit
     * validates and saves through the context service, the call
     * saveFormSettings makes. Each key writes its row alone. The schema
     * carries both fields on every app, but only a journal has the form, so
     * the keys are read here, in the OJS overlay: a press or preprint server
     * leaves them unconsumed and answers 400 (D4, D5).
     */
    protected function parseIntakeSettings(Spec $root, string $primaryLocale): array
    {
        $parsed = parent::parseIntakeSettings($root, $primaryLocale);
        foreach (['enableLockss' => 'LOCKSS', 'enableClockss' => 'CLOCKSS'] as $key => $label) {
            if (!$root->has($key)) {
                continue;
            }
            $value = $root->get($key);
            if (!is_bool($value)) {
                throw new SpecException($key, "{$key} must be a boolean (true: the \"{$label}\" box \"Enable {$label} to store and distribute journal content…\" ticked, false: unticked)");
            }
            $parsed['settings'][$key] = $value;
            $parsed['specKeys'][$key] = $key;
        }
        return $parsed;
    }

    /**
     * `issues[]` (U08): the bootstrap payload's issues list, same shape,
     * plus `coverImage` (U13), `datePublished`, `galleys[]` (U50) and
     * `usage[]` (U64, UsageStatsSeeder::parseIssueUsage); the
     * galleys' "Language" is checked against the new journal's form
     * languages (primary first); `accessStatus` / `openAccessDate` (U51)
     * need the journal to require subscriptions. And the subscription keys
     * (U51, SubscriptionSeeder): `payments`, the "Subscription Policies"
     * passthroughs, `subscriptionTypes[]`, `subscriptions[]`; a
     * subscription's `institution` names an entry of the core's
     * `institutions[]` (U66, PKP\testing\InstitutionSeeder).
     */
    protected function parseOverlay(Spec $root): array
    {
        $primaryLocale = (string) ($this->contextParams['primaryLocale'] ?? 'en');
        $formLocales = array_values(array_unique(array_merge([$primaryLocale], (array) ($this->contextParams['supportedFormLocales'] ?? []))));
        $accessTab = ($this->formSettingsPlan['publishingMode'] ?? null) === \APP\journal\Journal::PUBLISHING_MODE_SUBSCRIPTION;
        return [
            'issues' => BootstrapSeeder::parseIssues($root, withCover: true, formLocales: $formLocales, accessTab: $accessTab),
            'subscriptions' => SubscriptionSeeder::parse($root, $primaryLocale, array_merge(['admin'], array_column((array) $root->get('users', []), 'username')), array_keys($this->institutionPlans)),
        ];
    }

    /**
     * The subscription screens first (settings, types, then subscriptions,
     * after users[] so a subscriber exists and after the core's
     * institutions[] so an institutional one finds its institution), then
     * the bootstrap's own issue path; the response lists what was created.
     */
    protected function executeOverlay(Context $context, array $overlayPlan): array
    {
        $response = [];
        if (!empty($overlayPlan['subscriptions'])) {
            $response = SubscriptionSeeder::execute($context, $overlayPlan['subscriptions'], $this->institutionIds);
            $context = \APP\core\Application::getContextDAO()->getById($context->getId());
        }
        $issues = BootstrapSeeder::addIssues($context, $overlayPlan['issues'] ?? [], asTheForm: true);
        // Each issue's reader visits (U64), loaded with the context's own at
        // the end of the build.
        foreach ($overlayPlan['issues'] ?? [] as $i => $plan) {
            if ($plan['usage'] !== []) {
                $this->usageSeeder->addIssueUsage($plan['usage'], $issues[$i]['id'], array_column($issues[$i]['galleys'] ?? [], 'id'));
            }
        }
        return $response + ['issues' => $issues];
    }
}
