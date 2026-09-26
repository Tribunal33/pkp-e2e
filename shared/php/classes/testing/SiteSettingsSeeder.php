<?php

/**
 * @file classes/testing/SiteSettingsSeeder.php
 *
 * Copyright (c) 2026 Simon Fraser University
 * Copyright (c) 2026 John Willinsky
 * Distributed under the GNU GPL v3. For full terms see the file docs/COPYING.
 *
 * @class SiteSettingsSeeder
 *
 * @brief POST /api/v1/_test/site — the site's own settings (U60), the one
 * `site` record every context, worker and fleet run shares. Each key is a
 * field of Administration › Site Settings, saved the way that tab's "Save"
 * saves it: PUT index/api/v1/site → PKPSiteController::edit, whose request
 * turns every empty string into null, then PKPSiteService::validate and
 * ::edit (SiteDAO::updateObject deletes the row of a locale whose value is
 * null). App-neutral: the site schema and service are lib/pkp's alone.
 *
 * Keys (at least one; any other key is a 400):
 * - title — "Site Setup" › "Settings" › "Site Name": a locale map, or a bare
 *   string for the site's primary locale. The map is the whole field: every
 *   site locale it does not name is emptied, as the tab's other language box
 *   left empty is, and an empty string (or null) empties that locale. So
 *   `title: ""` is the install state (no `title` row at all), the state the
 *   tab itself cannot return to: its "Save" refuses an empty Site Name,
 *   while the service's validate does not check the site's own required
 *   fields (U60 A4) and stores it.
 *
 * The site row is read under a row lock (as the `bulkEmails` context key
 * does), because PKPSiteService::edit writes back the whole record it read:
 * a parallel `bulkEmails` seed's id would otherwise be written out. The lock
 * does not make a suite that sets the Site Name safe to run beside one that
 * reads it: that is the serial project's job (PRINCIPLES A7, A9).
 */

namespace PKP\testing;

use APP\core\Application;
use Illuminate\Support\Facades\DB;
use PKP\db\DAORegistry;

class SiteSettingsSeeder
{
    /**
     * @return array{title: object} the stored Site Name, locale → text
     *   (`{}` when empty)
     */
    public function seed(array $data): array
    {
        $root = new Spec($data);
        if ($data === []) {
            throw new SpecException('', 'Nothing to set: name at least one site key (title)');
        }

        // Parse phase: no writes.
        DB::table('site')->lockForUpdate()->first();
        $siteDao = DAORegistry::getDAO('SiteDAO'); /** @var \PKP\site\SiteDAO $siteDao */
        $site = $siteDao->getSite();
        $locales = $site->getSupportedLocales();
        $primaryLocale = $site->getPrimaryLocale();

        $params = [];
        if ($root->has('title')) {
            $params['title'] = $this->parseLocaleMap($root, 'title', $locales, $primaryLocale);
        }
        $root->assertConsumed();

        // Execute phase: the tab's save.
        $siteService = app()->get('site'); /** @var \PKP\services\PKPSiteService $siteService */
        $errors = $siteService->validate($params, $locales, $primaryLocale);
        if (!empty($errors)) {
            $key = (string) array_key_first($errors);
            throw new SpecException(explode('.', $key)[0], 'The site\'s save would refuse this: ' . json_encode($errors));
        }
        $site = $siteService->edit($site, $params, Application::get()->getRequest());

        return ['title' => (object) array_filter((array) $site->getData('title'), fn ($v) => $v !== null && $v !== '')];
    }

    /**
     * A multilingual site field as the tab posts it: every site locale,
     * the named ones with their text, the others empty (null).
     *
     * @param string[] $locales the site's supported locales
     *
     * @return array<string, ?string>
     */
    protected function parseLocaleMap(Spec $root, string $key, array $locales, string $primaryLocale): array
    {
        $value = $root->get($key);
        if ($value === null || is_string($value)) {
            $value = [$primaryLocale => $value];
        }
        if (!is_array($value) || array_is_list($value)) {
            throw new SpecException($key, "{$key} must be a string (the primary locale's box) or a locale map such as {\"en\": \"…\"}");
        }
        $map = array_fill_keys($locales, null);
        foreach ($value as $locale => $text) {
            if (!in_array($locale, $locales, true)) {
                throw new SpecException("{$key}.{$locale}", "The site has no \"{$locale}\" box (its locales: " . implode(', ', $locales) . ')');
            }
            if ($text !== null && !is_string($text)) {
                throw new SpecException("{$key}.{$locale}", "{$key}.{$locale} must be a string (\"\" or null empties it)");
            }
            $map[$locale] = ($text === null || $text === '') ? null : $text;
        }
        return $map;
    }
}
