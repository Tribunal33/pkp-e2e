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
 * @brief The press's usage visits (U64): the lines carry `chapterId` and
 * `seriesId` (LogUsageEvent on OMP), both null on a book page, a
 * publication format's file and the press's home page. The book page is
 * catalog/book, a format's file catalog/download; `fileViews` counts one
 * entry per `publicationFormats[]` entry. Chapter and series pages are not
 * seeded (no Statistics page shows them).
 */

namespace APP\testing;

use PKP\testing\PKPUsageStatsSeeder;

class UsageStatsSeeder extends PKPUsageStatsSeeder
{
    protected function appFields(): array
    {
        return ['chapterId' => null, 'seriesId' => null];
    }

    protected function workPage(): array
    {
        return ['catalog', 'book'];
    }
}
