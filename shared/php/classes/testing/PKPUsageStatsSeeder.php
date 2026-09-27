<?php

/**
 * @file classes/testing/PKPUsageStatsSeeder.php
 *
 * Copyright (c) 2026 Simon Fraser University
 * Copyright (c) 2026 John Willinsky
 * Distributed under the GNU GPL v3. For full terms see the file docs/COPYING.
 *
 * @class PKPUsageStatsSeeder
 *
 * @brief Reader visits of past days, turned into figures by the app's own
 * usage statistics jobs (U64): the `usage[]` keys of the context scenario
 * (the context's home page), the submission scenario (the published
 * work's page, its galley or publication format files, OJS its JATS XML)
 * and the OJS context scenario's `issues[].usage[]` (the issue's table of
 * contents and its issue galleys).
 *
 * A real visit is a line the usage event listener
 * (PKP\observers\listeners\LogUsageEvent) appends to the day's log file;
 * once a day the "Usage statistics file loader task" hands each finished
 * day's file to the job chain its app's UsageStatsLoader::getFileJobs
 * returns (validate each line, drop robots and double clicks, count unique
 * visitors, compile the metrics_* tables, archive the file), then to
 * CompileMonthlyMetrics. This seeder writes the lines in the listener's
 * shape, one per visit, and runs that same job chain on them at once,
 * inside the seeding transaction. Three deliberate deviations (parity
 * ledger, U64 harness):
 *
 * - The file holds one test's visits, where a real day's file holds the
 *   whole site's, and every compile job first deletes the figures of the
 *   day its file name ends in (all contexts). So the load id ends in
 *   `_20000101.log`, a day no figures can have (the key refuses days
 *   before 2001-01-01), and parallel seeds add up instead of wiping each
 *   other. Its `seed_` prefix keeps it out of the month-reprocessing tool,
 *   which picks `usage_events_{month}` files.
 * - The loader refuses a file of a day before the installation's COUNTER
 *   start (isDateValid) and, while daily figures are not kept, a file of
 *   a month before last whose figures exist (isMonthValid). The key does
 *   not: every figure a test reads lies before a fresh install.
 * - CompileMonthlyMetrics rebuilds the geographical and COUNTER monthly
 *   tables of each month the file touched (site-wide, from the daily
 *   rows), then drops the daily rows of a month before last unless
 *   "Track daily and monthly statistics" is chosen. The seeder runs the
 *   rebuild and keeps the daily rows, so a second seed in that month
 *   rebuilds from every seed's rows (no page reads the daily rows the app
 *   would have dropped: U64 Settings bullet 3). The rebuild runs under the
 *   site row lock (as `bulkEmails` and `POST site`), so parallel seeds
 *   rebuild one after another.
 *
 * Every visit comes from a visitor of its own (an address of its own,
 * hashed as the listener hashes it, and a desktop Chrome user agent), so
 * no visit is a double click and the unique counts equal the totals. A
 * visit has no institution. The geographical fields are the ones the
 * listener would record at the context's level (Rule 4): a deeper one is
 * refused. Visit times fall on the named day from 00:00:00 on, one second
 * apart.
 *
 * App overlays (APP\testing\UsageStatsSeeder): the line's app fields, the
 * page names of a work's page, and on OJS the issue and JATS visits.
 */

namespace PKP\testing;

use APP\core\Application;
use APP\statistics\StatisticsHelper;
use Illuminate\Support\Facades\DB;
use PKP\config\Config;
use PKP\context\Context;
use PKP\core\PKPApplication;
use PKP\core\Registry;
use PKP\db\DAORegistry;
use PKP\file\FileManager;
use PKP\submission\Genre;
use PKP\task\FileLoader;

abstract class PKPUsageStatsSeeder
{
    /** The most visits one count may name (one log line each). */
    public const MAX_VISITS = 5000;

    /** The day the load id names: no figures can have it (see the class comment). */
    public const LOAD_DAY = '20000101';

    /** A desktop browser, not on the app's robot list. */
    public const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.7922.34 Safari/537.36';

    /** @var array<int, array> the log lines, in order */
    protected array $lines = [];

    /** @var array<string, int> visits per day, for the visit times */
    protected array $perDay = [];

    /** @var array<string, true> months (Ym) of the work visits, for the monthly rebuild */
    protected array $months = [];

    protected string $salt;

    public function __construct(protected Context $context)
    {
        $this->salt = bin2hex(random_bytes(16));
    }

    /** The app's own line fields, all null (OJS issueId, issueGalleyId; OMP chapterId, seriesId). */
    abstract protected function appFields(): array;

    /** A work's page on the reader side: [page, view op] (OJS article/view, OMP catalog/book, OPS preprint/view). */
    abstract protected function workPage(): array;

    /** The count keys of a work's `usage[]` entry (OJS adds jatsViews). */
    public function workCountKeys(): array
    {
        return ['abstractViews'];
    }

    // ---- Parse phase: no writes.

    /**
     * Read a `usage[]` list: each entry names its day (`daysAgo`, a whole
     * number from 1, or `date`, YYYY-MM-DD, exactly one) and the visits of
     * that day as whole numbers (`$countKeys`) or lists of whole numbers
     * (`$listKeys`, one count per galley or format, in order). With
     * `$geoLevel` (a work's entries), the optional `country`, `region` and
     * `city` are read and checked against that level.
     *
     * @param string[] $countKeys
     * @param string[] $listKeys
     * @param string|false|null $geoLevel false: no geographical keys (they stay unread, a 400); null or 'disabled': refused with the reason
     *
     * @return list<array{path: string, day: string, counts: array<string, int>, lists: array<string, int[]>, geo: array{0: ?string, 1: ?string, 2: ?string}}>
     */
    public static function parse(Spec $root, string $key, array $countKeys, array $listKeys = [], string|false|null $geoLevel = false): array
    {
        $plans = [];
        foreach ($root->childList($key) as $entry) {
            $counts = [];
            foreach ($countKeys as $countKey) {
                if ($entry->has($countKey)) {
                    $counts[$countKey] = self::parseCount($entry->get($countKey), "{$entry->path}.{$countKey}");
                }
            }
            $lists = [];
            foreach ($listKeys as $listKey) {
                if ($entry->has($listKey)) {
                    $value = $entry->get($listKey);
                    if (!is_array($value) || !array_is_list($value)) {
                        throw new SpecException("{$entry->path}.{$listKey}", "{$listKey} must be a list of whole numbers, one per entry of the list it counts, in order");
                    }
                    $lists[$listKey] = array_map(fn ($v, $i) => self::parseCount($v, "{$entry->path}.{$listKey}.{$i}"), $value, array_keys($value));
                }
            }
            $day = self::parseDay($entry);
            $geo = $geoLevel === false ? [null, null, null] : self::parseGeo($entry, $geoLevel);
            // An unknown key (jatsViews off a journal, a place off a work) is
            // named before the entry's emptiness.
            $entry->assertConsumed();
            if (array_sum($counts) + array_sum(array_map('array_sum', $lists)) === 0) {
                throw new SpecException($entry->path, 'A usage entry names at least one visit (' . implode(', ', array_merge($countKeys, $listKeys)) . ')');
            }
            $plans[] = [
                'path' => $entry->path,
                'day' => $day,
                'counts' => $counts,
                'lists' => $lists,
                'geo' => $geo,
            ];
        }
        return $plans;
    }

    /** `daysAgo` (1 = yesterday) or `date` (YYYY-MM-DD), exactly one: a finished day from 2001-01-01. */
    public static function parseDay(Spec $entry): string
    {
        $hasDaysAgo = $entry->has('daysAgo');
        if ($hasDaysAgo === $entry->has('date')) {
            throw new SpecException($entry->path, 'A usage entry names its day by exactly one of daysAgo (1 = yesterday) or date (YYYY-MM-DD)');
        }
        $today = date('Y-m-d');
        if ($hasDaysAgo) {
            $daysAgo = $entry->get('daysAgo');
            if (!is_int($daysAgo) || $daysAgo < 1) {
                throw new SpecException("{$entry->path}.daysAgo", 'daysAgo must be a whole number from 1 (yesterday): the day\'s visits become figures the next day, so today has none');
            }
            $day = date('Y-m-d', strtotime("{$today} -{$daysAgo} days"));
        } else {
            $day = $entry->get('date');
            $parsed = is_string($day) ? \DateTime::createFromFormat('!Y-m-d', $day) : false;
            if (!$parsed || $parsed->format('Y-m-d') !== $day) {
                throw new SpecException("{$entry->path}.date", 'date must be a date as YYYY-MM-DD');
            }
            if ($day >= $today) {
                throw new SpecException("{$entry->path}.date", "date must be before today ({$today}): the day's visits become figures the next day");
            }
        }
        if ($day < StatisticsHelper::STATISTICS_EARLIEST_DATE) {
            throw new SpecException($entry->path, 'The statistics start on ' . StatisticsHelper::STATISTICS_EARLIEST_DATE . "; {$day} is earlier");
        }
        return $day;
    }

    public static function parseCount(mixed $value, string $specKey): int
    {
        if (!is_int($value) || $value < 0 || $value > self::MAX_VISITS) {
            throw new SpecException($specKey, 'A count of visits is a whole number from 0 to ' . self::MAX_VISITS);
        }
        return $value;
    }

    /**
     * `country` (a two-letter ISO code, CA), `region` (the subdivision part
     * of an ISO 3166-2 code, up to three letters or digits, BC) and `city`
     * (a name), as the listener records them at the context's level: a
     * region needs the country, a city the region, and a part deeper than
     * the level is refused, as the listener would not record it.
     *
     * @return array{0: ?string, 1: ?string, 2: ?string}
     */
    public static function parseGeo(Spec $entry, ?string $level): array
    {
        $country = $entry->get('country');
        $region = $entry->get('region');
        $city = $entry->get('city');
        if ($country === null && $region === null && $city === null) {
            return [null, null, null];
        }
        $depths = [StatisticsHelper::STATISTICS_SETTING_COUNTRY => 1, StatisticsHelper::STATISTICS_SETTING_REGION => 2, StatisticsHelper::STATISTICS_SETTING_CITY => 3];
        $depth = $depths[$level] ?? 0;
        if ($depth === 0) {
            throw new SpecException("{$entry->path}.country", 'The context collects no geographical data (the site\'s "Geographical Statistics" is "Do not collect any geographical data"; set it first through POST site enableGeoUsageStats), so a visit records no place');
        }
        if (!is_string($country) || !preg_match('/^[A-Z]{2}$/', $country)) {
            throw new SpecException("{$entry->path}.country", 'country must be a two-letter ISO country code in capitals (CA); region and city need it');
        }
        if ($region !== null) {
            if (!is_string($region) || !preg_match('/^[A-Za-z0-9]{1,3}$/', $region)) {
                throw new SpecException("{$entry->path}.region", 'region must be the subdivision part of an ISO 3166-2 code, up to three letters or digits (BC for CA-BC)');
            }
            if ($depth < 2) {
                throw new SpecException("{$entry->path}.region", "The context collects the country alone ({$level}), so a visit records no region");
            }
        }
        if ($city !== null) {
            if (!is_string($city) || trim($city) === '' || $region === null) {
                throw new SpecException("{$entry->path}.city", 'city must be a non-empty name, with region beside it');
            }
            if ($depth < 3) {
                throw new SpecException("{$entry->path}.city", "The context collects no city ({$level})");
            }
        }
        return [$country, $region, $city];
    }

    /** The level the listener records at for this context (Context::getEnableGeoUsageStats). */
    public static function geoLevel(Context $context): ?string
    {
        return $context->getEnableGeoUsageStats(Application::get()->getRequest()->getSite());
    }

    /**
     * Read a work's `usage[]` (the submission scenario): `abstractViews`
     * (the work's page), `fileViews` (one count per galley or publication
     * format of the same request, in order), the app's other count keys,
     * and the place. The listener records visits of a published version
     * only, and a download needs a file.
     *
     * @param bool[] $representationHasFile one per galleys[] / publicationFormats[] entry
     */
    public function parseWorkUsage(Spec $root, bool $published, array $representationHasFile): array
    {
        if (!$root->has('usage')) {
            return [];
        }
        $plans = self::parse($root, 'usage', $this->workCountKeys(), ['fileViews'], self::geoLevel($this->context));
        if (!$published) {
            throw new SpecException('usage', 'The usage event listener records visits to a published version only: usage needs published: true');
        }
        foreach ($plans as $plan) {
            foreach ($plan['lists']['fileViews'] ?? [] as $i => $count) {
                if (!array_key_exists($i, $representationHasFile)) {
                    throw new SpecException("{$plan['path']}.fileViews.{$i}", 'fileViews has one count per galleys[] (publicationFormats[] on a press) entry of the same request; there is no entry ' . $i);
                }
                if ($count > 0 && !$representationHasFile[$i]) {
                    throw new SpecException("{$plan['path']}.fileViews.{$i}", 'That galley or format has no file (a remote galley, a format without file), so it has no download to count');
                }
            }
        }
        return $plans;
    }

    // ---- Execute phase.

    /**
     * The work visits of a published submission: its page, its galleys'
     * or formats' files (by the file's type and component, as the
     * download handlers classify them), then the app's own (OJS JATS).
     *
     * @param array<int, array{id: int, submissionFileId: ?int}> $representations the seeded galleys or formats, in order
     */
    public function addWorkUsage(array $plans, \APP\submission\Submission $submission, array $representations): void
    {
        if ($plans === []) {
            return;
        }
        $publication = $submission->getCurrentPublication();
        if ((int) $publication->getData('status') !== \PKP\publication\PKPPublication::STATUS_PUBLISHED) {
            throw new SpecException('usage', 'The version is not published (an issue not yet published schedules it), and the listener records visits to a published version only');
        }
        [$page, $viewOp] = $this->workPage();
        $viewUrl = $this->pageUrl($page, $viewOp, [$submission->getId()]);
        $files = [];
        foreach ($representations as $i => $representation) {
            if (!$representation['submissionFileId']) {
                continue;
            }
            $submissionFile = \APP\facades\Repo::submissionFile()->get($representation['submissionFileId']);
            $genreDao = DAORegistry::getDAO('GenreDAO'); /** @var \PKP\submission\GenreDAO $genreDao */
            $genre = $genreDao->getById($submissionFile->getData('genreId'));
            // The download handlers' own test (ArticleHandler, PreprintHandler,
            // CatalogBookHandler::download).
            $assocType = ($genre->getCategory() != Genre::GENRE_CATEGORY_DOCUMENT || $genre->getSupplementary() || $genre->getDependent())
                ? Application::ASSOC_TYPE_SUBMISSION_FILE_COUNTER_OTHER
                : Application::ASSOC_TYPE_SUBMISSION_FILE;
            $files[$i] = [
                'assocType' => $assocType,
                'url' => $this->pageUrl($page, 'download', [$submission->getId(), $representation['id'], $submissionFile->getId()]),
                'ids' => [
                    'submissionId' => $submission->getId(),
                    'representationId' => $representation['id'],
                    'submissionFileId' => $submissionFile->getId(),
                    'fileType' => StatisticsHelper::getDocumentType((string) $submissionFile->getData('mimetype')),
                ],
            ];
        }
        foreach ($plans as $plan) {
            $this->months[substr(str_replace('-', '', $plan['day']), 0, 6)] = true;
            $this->visits($plan['counts']['abstractViews'] ?? 0, $plan['day'], Application::ASSOC_TYPE_SUBMISSION, $viewUrl, ['submissionId' => $submission->getId()], $plan['geo'], $this->workFields($publication, Application::ASSOC_TYPE_SUBMISSION));
            foreach ($plan['lists']['fileViews'] ?? [] as $i => $count) {
                if ($count > 0) {
                    $file = $files[$i];
                    $this->visits($count, $plan['day'], $file['assocType'], $file['url'], $file['ids'], $plan['geo'], $this->workFields($publication, $file['assocType']));
                }
            }
            $this->addAppWorkUsage($plan, $submission, $publication);
        }
    }

    /** The app's own line fields of a work visit (OJS: the article's issue). */
    protected function workFields(\APP\publication\Publication $publication, int $assocType): array
    {
        return [];
    }

    /** The app's own work visits of one entry (OJS: JATS XML). */
    protected function addAppWorkUsage(array $plan, \APP\submission\Submission $submission, \APP\publication\Publication $publication): void
    {
    }

    /** The context's home page visits (the context scenario's `usage[]`, `views`). */
    public function addContextUsage(array $plans): void
    {
        $url = $this->pageUrl('index', '', []);
        foreach ($plans as $plan) {
            $this->visits($plan['counts']['views'] ?? 0, $plan['day'], Application::getContextAssocType(), $url, [], [null, null, null]);
        }
    }

    /**
     * Append $count visits of one visitor each, in the listener's line
     * shape (LogUsageEvent::prepareUsageEvent).
     *
     * @param array{0: ?string, 1: ?string, 2: ?string} $geo
     */
    protected function visits(int $count, string $day, int $assocType, string $canonicalUrl, array $ids, array $geo, array $appFields = []): void
    {
        for ($n = 0; $n < $count; $n++) {
            $second = $this->perDay[$day] = ($this->perDay[$day] ?? -1) + 1;
            if ($second >= 86400) {
                throw new SpecException('usage', "More than 86400 visits on {$day} in one request");
            }
            $this->lines[] = array_merge([
                'time' => sprintf('%s %02d:%02d:%02d', $day, intdiv($second, 3600), intdiv($second, 60) % 60, $second % 60),
                'ip' => StatisticsHelper::hashIp('10.' . implode('.', [(count($this->lines) >> 16) & 255, (count($this->lines) >> 8) & 255, count($this->lines) & 255]), $this->salt),
                'userAgent' => self::USER_AGENT,
                'canonicalUrl' => $canonicalUrl,
                'assocType' => $assocType,
                'contextId' => $this->context->getId(),
                'submissionId' => $ids['submissionId'] ?? null,
                'representationId' => $ids['representationId'] ?? null,
                'submissionFileId' => $ids['submissionFileId'] ?? null,
                'fileType' => $ids['fileType'] ?? null,
                'country' => $geo[0],
                'region' => $geo[1],
                'city' => $geo[2],
                'institutionIds' => [],
                'version' => Registry::get('appVersion'),
            ], $this->appFields(), $appFields);
        }
    }

    /**
     * A reader-side page address as the usage event records it: no locale
     * segment, and the config's base_url in place of the requesting
     * server's (UsageEvent::getRouterCanonicalUrl).
     */
    protected function pageUrl(string $page, string $op, array $args): string
    {
        $request = Application::get()->getRequest();
        $url = $request->getDispatcher()->url($request, PKPApplication::ROUTE_PAGE, $this->context->getPath(), $page, $op === '' ? null : $op, $args, urlLocaleForPage: '');
        $configBaseUrl = Config::getVar('general', 'base_url');
        $requestBaseUrl = $request->getBaseUrl();
        if ($requestBaseUrl !== $configBaseUrl && $configBaseUrl) {
            $url = str_replace($requestBaseUrl, $configBaseUrl, $url);
        }
        return $url;
    }

    /**
     * Write the lines to a log file in the loader's dispatch folder and run
     * the app's job chain on it (UsageStatsLoader::getFileJobs, each job's
     * handle() in order), then the monthly rebuild of every month a work
     * visit fell in. Returns the number of visits.
     */
    public function load(): int
    {
        if ($this->lines === []) {
            return 0;
        }
        DB::table('site')->lockForUpdate()->first();

        $dir = StatisticsHelper::getUsageStatsDirPath();
        $fileManager = new FileManager();
        foreach ([FileLoader::FILE_LOADER_PATH_DISPATCH, FileLoader::FILE_LOADER_PATH_ARCHIVE] as $folder) {
            if (!is_dir("{$dir}/{$folder}") && !$fileManager->mkdirtree("{$dir}/{$folder}")) {
                throw new \Exception("Could not create {$dir}/{$folder}");
            }
        }
        $loadId = 'seed_' . bin2hex(random_bytes(6)) . '_usage_events_' . self::LOAD_DAY . '.log';
        $dispatchPath = "{$dir}/" . FileLoader::FILE_LOADER_PATH_DISPATCH . "/{$loadId}";
        file_put_contents($dispatchPath, implode('', array_map(fn (array $line) => json_encode($line) . PHP_EOL, $this->lines)));

        // The task's own job list, without constructing the task (its
        // constructor opens an execution log and stages the day's files).
        $loader = (new \ReflectionClass(\APP\tasks\UsageStatsLoader::class))->newInstanceWithoutConstructor();
        $getFileJobs = new \ReflectionMethod($loader, 'getFileJobs');
        $jobs = $getFileJobs->invoke($loader, $loadId, Application::get()->getRequest()->getSite());
        try {
            foreach ($jobs as $job) {
                $job->handle();
            }
        } catch (\Throwable $e) {
            foreach ([FileLoader::FILE_LOADER_PATH_DISPATCH, FileLoader::FILE_LOADER_PATH_ARCHIVE, FileLoader::FILE_LOADER_PATH_REJECT] as $folder) {
                @unlink("{$dir}/{$folder}/{$loadId}");
                @unlink("{$dir}/{$folder}/{$loadId}.gz");
            }
            throw $e;
        }

        // CompileMonthlyMetrics::handle without its daily-row deletion.
        foreach (array_keys($this->months) as $month) {
            foreach (['geoStats', 'sushiStats'] as $service) {
                app()->get($service)->deleteMonthlyMetrics((string) $month);
                app()->get($service)->addMonthlyMetrics((string) $month);
            }
        }

        $count = count($this->lines);
        $this->lines = [];
        $this->perDay = [];
        $this->months = [];
        return $count;
    }
}
