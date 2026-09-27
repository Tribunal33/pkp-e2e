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
 * @brief OMP scratch-press scenario (note: OMP's Context::add hook creates NO
 * default series; user series assignments resolve by path). `series[]`
 * (U70): each entry {path*, title?, description?} is Settings › Press ›
 * "Series" › "Add Series" › "Save", run through the window's own
 * SeriesForm::execute.
 */

namespace APP\testing;

use APP\controllers\grid\settings\series\form\SeriesForm;
use APP\core\Application;
use APP\facades\Repo;
use PKP\context\Context;
use PKP\testing\ContextFactory;
use PKP\testing\PKPContextScenarioBuilder;
use PKP\testing\Spec;
use PKP\testing\SpecException;

class ContextScenarioBuilder extends PKPContextScenarioBuilder
{
    /** The series window's "Path" pattern (SeriesForm's FormValidatorRegExp). */
    public const SERIES_PATH_REGEX = '/^[a-zA-Z0-9\/._-]+$/';

    /** Paths already declared in this request's series[] (parse phase). */
    private array $seriesPaths = [];

    protected function structureKey(): string
    {
        return 'series';
    }

    protected function resolveStructureId(Context $context, string $identifier): ?int
    {
        return BootstrapSeeder::findSeriesId($context, $identifier);
    }

    /**
     * One `series[]` entry (U70), read as the "Add Series" window refuses
     * it: `path` required, the window's pattern (letters, digits, "/", ".",
     * "_", "-"), at most 32 characters (the box's maxlength), not used twice
     * in the list (a scratch press has no other series); `title` a string
     * (the primary locale) or a locale map over the press's form
     * languages, default the path, required in the primary locale;
     * `description` the same shape, typed into the rich-text box. Parse
     * phase: no writes.
     */
    protected function parseStructure(Spec $spec): array
    {
        $primaryLocale = (string) ($this->contextParams['primaryLocale'] ?? 'en');
        $formLocales = array_values(array_unique(array_merge([$primaryLocale], (array) ($this->contextParams['supportedFormLocales'] ?? []))));

        $path = $spec->require('path');
        if (!is_string($path) || !preg_match(self::SERIES_PATH_REGEX, $path)) {
            throw new SpecException("{$spec->path}.path", 'The series path must consist of only letters and numbers. (the "Add Series" window\'s refusal: letters, digits, "/", ".", "_" and "-")');
        }
        if (strlen($path) > 32) {
            throw new SpecException("{$spec->path}.path", 'The "Path" box takes at most 32 characters');
        }
        if (isset($this->seriesPaths[$path])) {
            throw new SpecException("{$spec->path}.path", 'The series path already exists. Please enter a unique path.');
        }
        $this->seriesPaths[$path] = true;

        $localized = function (string $key, ?string $default) use ($spec, $primaryLocale, $formLocales): ?array {
            $map = $spec->localized($key, $primaryLocale, $default);
            if ($map === null) {
                return null;
            }
            foreach ($map as $locale => $value) {
                if (!is_string($value)) {
                    throw new SpecException("{$spec->path}.{$key}", "A series {$key} is a string or a locale map of strings");
                }
                if (!in_array($locale, $formLocales, true)) {
                    throw new SpecException("{$spec->path}.{$key}", "The {$key} carries \"{$locale}\", which is not among the press's form locales (" . implode(', ', $formLocales) . ')');
                }
            }
            return $map;
        };
        $title = $localized('title', $path);
        if (trim($title[$primaryLocale] ?? '') === '') {
            throw new SpecException("{$spec->path}.title", "The title needs a value in the primary locale \"{$primaryLocale}\" (the window's \"Title\" is required)");
        }
        $description = $localized('description', null);

        return [
            'specPath' => $spec->path,
            'path' => $path,
            'title' => $title,
            'description' => $description,
        ];
    }

    /**
     * "Add Series", the boxes filled, "Save": the window's own
     * SeriesForm::execute (the series row, its settings, the category
     * links and the sub-editors, none), with what the form posts: every
     * text box in every form language, empty where not typed; the
     * description as the rich-text box posts typed text (a paragraph);
     * the unticked boxes absent; "Order of monographs" on the choice the
     * list arrives on (its first, "Title (A-Z)"). The handler's trivial
     * "saved" toast is not mirrored.
     */
    protected function addStructure(Context $context, array $plan, int $sequence): int
    {
        $formLocales = (array) $context->getSupportedFormLocales();
        $posted = fn (?array $typed) => array_merge(array_fill_keys($formLocales, ''), $typed ?? []);
        $restore = ContextFactory::forceRequestContext($context);
        try {
            $request = Application::get()->getRequest();
            if (Repo::section()->getByPath($plan['path'], $context->getId())) {
                throw new SpecException("{$plan['specPath']}.path", 'The series path already exists. Please enter a unique path.');
            }
            $form = new SeriesForm($request);
            $form->initData();
            $sortOptions = array_keys(Repo::submission()->getSortSelectOptions());
            $form->setData('title', $posted($plan['title']));
            $form->setData('prefix', $posted(null));
            $form->setData('subtitle', $posted(null));
            $form->setData('description', $posted($plan['description'] === null ? null : array_map(
                fn (string $text) => ($text === '' || str_starts_with(ltrim($text), '<')) ? $text : "<p>{$text}</p>",
                $plan['description']
            )));
            $form->setData('path', $plan['path']);
            $form->setData('onlineIssn', '');
            $form->setData('printIssn', '');
            $form->setData('sortOption', $sortOptions[0]);
            $form->setData('temporaryFileId', '');
            $form->execute();
            return (int) $form->getSeriesId();
        } finally {
            $restore();
        }
    }
}
