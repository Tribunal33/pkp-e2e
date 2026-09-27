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
 * @brief The preprint server's usage visits (U64): the lines carry no app
 * fields (LogUsageEvent on OPS); the preprint's page is preprint/view, a
 * galley's file preprint/download.
 */

namespace APP\testing;

use PKP\testing\PKPUsageStatsSeeder;

class UsageStatsSeeder extends PKPUsageStatsSeeder
{
    protected function appFields(): array
    {
        return [];
    }

    protected function workPage(): array
    {
        return ['preprint', 'view'];
    }
}
