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
 * - enableGeoUsageStats, enableInstitutionUsageStats, isSushiApiPublic (U64)
 *   — "Site Setup" › "Statistics": "Geographical Statistics" (the radio's
 *   value: disabled, country, country+region, country+region+city),
 *   "Institutional Statistics" › "Enable institutional statistics" (a
 *   boolean) and "Public API" (true "Make the COUNTER SUSHI statistics
 *   publicly available", false "Restrict access …"). The tab's "Save" posts
 *   its seven fields at once; the key saves the named ones alone, and the
 *   others keep their stored values. The install values are disabled,
 *   false and true.
 * - counterR5StartDate (U64) — no screen sets it: the site setting the
 *   3.4.0 upgrade from 3.3 writes (I8508_ConvertCurrentLogFile, the upgrade
 *   day, or the day before when yesterday's log was converted) and a fresh
 *   install lacks. PKPStatsSushiService::getEarliestDate reads it in place
 *   of the installation date of 3.4.0, so it sets the first month "Counter
 *   R5" and the SUSHI API offer (the month after it, or after the context's
 *   first publication if later), and the first day the usage loader
 *   accepts a log file of (isDateValid). A `YYYY-MM-DD` calendar date from
 *   2001-01-01 to today (the upgrade never writes a later day, and a later
 *   one would make the loader refuse today's file); "" or null removes the
 *   row, the install state. Saved through the same service call as the
 *   other keys: the stored row is the upgrade's (locale '', the date).
 * - isSiteSushiPlatform, sushiPlatformID (U64) — "Site Setup" ›
 *   "Statistics" › "Sushi Protocol": the "Platform" box ("Use the site as
 *   the platform for all journals.", a boolean) and the "Platform ID" text
 *   box (a string, or "" / null for none: no row). The tab posts both
 *   fields on every "Save", the hidden "Platform ID" included, so naming
 *   one sends the other's stored value beside it, as the tab's box shows
 *   it. The service's validate then refuses what the tab's "Save" refuses:
 *   "Platform" ticked with no ID, and an ID other than 1–17 letters,
 *   digits, "_", "." and "/" (ticked or not). The install values are
 *   false and null (a `0` row and no ID row).
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
     * The "Statistics" tab's fields the key sets (U64): the radio values,
     * or 'boolean' for a box or a true/false radio pair.
     */
    public const STATISTICS_KEYS = [
        'enableGeoUsageStats' => ['disabled', 'country', 'country+region', 'country+region+city'],
        'enableInstitutionUsageStats' => 'boolean',
        'isSushiApiPublic' => 'boolean',
    ];

    /**
     * The "Sushi Protocol" pair (U64): "Platform" and "Platform ID", which
     * the tab always posts together.
     */
    public const PLATFORM_KEYS = ['isSiteSushiPlatform', 'sushiPlatformID'];

    /** The earliest `counterR5StartDate` the key takes (as `usage[]`'s days). */
    public const COUNTER_R5_START_MIN = '2001-01-01';

    /**
     * @return array the stored Site Name as `title`, locale → text (`{}`
     *   when empty), and each "Statistics" key the request named with its
     *   stored value, and `counterR5StartDate` (the stored date, null
     *   when absent) when named; both `isSiteSushiPlatform` and
     *   `sushiPlatformID` (null when absent) when either is named
     */
    public function seed(array $data): array
    {
        $root = new Spec($data);
        if ($data === []) {
            throw new SpecException('', 'Nothing to set: name at least one site key (' . implode(', ', array_merge(['title'], array_keys(self::STATISTICS_KEYS), self::PLATFORM_KEYS, ['counterR5StartDate'])) . ')');
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
        foreach (self::STATISTICS_KEYS as $key => $choices) {
            if ($root->has($key)) {
                $value = $root->get($key);
                if ($choices === 'boolean' ? !is_bool($value) : !in_array($value, $choices, true)) {
                    throw new SpecException($key, $choices === 'boolean'
                        ? "{$key} must be true or false (the \"Statistics\" tab's box or radio pair)"
                        : "{$key} must be one of the \"Geographical Statistics\" radios' values: " . implode(', ', $choices));
                }
                $params[$key] = $value;
            }
        }
        if ($root->has('counterR5StartDate')) {
            $params['counterR5StartDate'] = $this->parseCounterR5StartDate($root->get('counterR5StartDate'));
        }
        $platform = $root->has('isSiteSushiPlatform') || $root->has('sushiPlatformID');
        if ($platform) {
            $params += $this->parsePlatform($root, $site);
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

        $response = ['title' => (object) array_filter((array) $site->getData('title'), fn ($v) => $v !== null && $v !== '')];
        foreach (array_keys(self::STATISTICS_KEYS) as $key) {
            if (array_key_exists($key, $params)) {
                $response[$key] = $site->getData($key);
            }
        }
        if (array_key_exists('counterR5StartDate', $params)) {
            $response['counterR5StartDate'] = $site->getData('counterR5StartDate');
        }
        if ($platform) {
            $response['isSiteSushiPlatform'] = (bool) $site->getData('isSiteSushiPlatform');
            $response['sushiPlatformID'] = $site->getData('sushiPlatformID');
        }
        return $response;
    }

    /**
     * "Platform" and "Platform ID" as the tab posts them: both, the one the
     * request leaves out at its stored value ("" / null for no ID, as
     * PKPSiteController::edit turns the tab's empty box into null). The ID's
     * shape and the ticked-needs-an-ID rule are the service's validate's.
     */
    protected function parsePlatform(Spec $root, \PKP\site\Site $site): array
    {
        $isPlatform = $root->has('isSiteSushiPlatform')
            ? $root->get('isSiteSushiPlatform')
            : (bool) $site->getData('isSiteSushiPlatform');
        if (!is_bool($isPlatform)) {
            throw new SpecException('isSiteSushiPlatform', 'isSiteSushiPlatform must be true or false (the "Platform" box)');
        }
        $id = $root->has('sushiPlatformID')
            ? $root->get('sushiPlatformID')
            : $site->getData('sushiPlatformID');
        if ($id !== null && !is_string($id)) {
            throw new SpecException('sushiPlatformID', 'sushiPlatformID must be a string (the "Platform ID" box), or "" / null for none');
        }
        return ['isSiteSushiPlatform' => $isPlatform, 'sushiPlatformID' => $id === '' ? null : $id];
    }

    /**
     * `counterR5StartDate`: a real `YYYY-MM-DD` day from 2001-01-01 to
     * today, or null for no row (the install state; "" is the same).
     */
    protected function parseCounterR5StartDate(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        $today = date('Y-m-d');
        if (!is_string($value)
            || !preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $value, $m)
            || !checkdate((int) $m[2], (int) $m[3], (int) $m[1])) {
            throw new SpecException('counterR5StartDate', 'counterR5StartDate must be a YYYY-MM-DD date (the day the upgrade to 3.4 ran), or "" / null for none (the install state)');
        }
        if ($value < self::COUNTER_R5_START_MIN || $value > $today) {
            throw new SpecException('counterR5StartDate', 'counterR5StartDate must lie from ' . self::COUNTER_R5_START_MIN . " to today ({$today}): the upgrade writes its own day, and a later day would make the usage loader refuse today's log file");
        }
        return $value;
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
