<?php

/**
 * @file classes/testing/TaskRunScenarioBuilder.php
 *
 * Copyright (c) 2026 Simon Fraser University
 * Copyright (c) 2026 John Willinsky
 * Distributed under the GNU GPL v3. For full terms see the file docs/COPYING.
 *
 * @class TaskRunScenarioBuilder
 *
 * @brief POST /api/v1/_test/scenarios/task — one run of a routine
 * ("scheduled") task that ends in error (U61): its log file under
 * {files_dir}/scheduledTaskLogs and its report email, sent for real to the
 * site's principal contact, so it lands in Mailpit.
 *
 * The task is lib/pkp's PKP\task\UpdateIPGeoDB ("Update DB-IP city lite
 * database"), registered for all three apps by PKPScheduler. On a test
 * install it always ends in error at its first step: its download from
 * db-ip.com goes through the dead local proxy of the test config (the egress
 * rule, harness.md), so it writes nothing but its log. The run is the
 * scheduler's own closure body, `(new UpdateIPGeoDB())->execute()`, as
 * `php lib/pkp/tools/scheduler.php test --name='PKP\task\UpdateIPGeoDB'` runs
 * it, with the request routed the way that command line tool routes it (a
 * PageRouter, CommandLineTool's constructor): the report's log link is a page
 * URL, which the API router of this request cannot build.
 *
 * App-neutral: the task and ScheduledTaskHelper are lib/pkp's alone. No mail
 * fake and no transaction: the email is the state, and the task writes no
 * database row.
 */

namespace PKP\testing;

use APP\core\Application;
use APP\core\PageRouter;
use PKP\scheduledTask\ScheduledTask;
use PKP\task\UpdateIPGeoDB;

class TaskRunScenarioBuilder
{
    public const RESULTS = ['error'];

    /**
     * @return array{result: string, task: string, name: string,
     *   processId: string, logFile: string} `processId` is in the report
     *   email's subject ("{name} - {processId} - Error"), `logFile` the
     *   `file` parameter of its log link
     */
    public function build(array $data): array
    {
        $root = new Spec($data);
        $result = $root->require('result');
        if (!in_array($result, self::RESULTS, true)) {
            throw new SpecException('result', 'result must be one of: ' . implode(', ', self::RESULTS) . ' (a run that ends well sends no report under the default scheduled_tasks_report_error_only)');
        }
        $root->assertConsumed();

        $request = Application::get()->getRequest();
        $apiRouter = $request->getRouter();
        $pageRouter = new PageRouter();
        $pageRouter->setApplication(Application::get());
        $request->setRouter($pageRouter);
        try {
            $task = new UpdateIPGeoDB();
            $succeeded = $task->execute();
        } finally {
            $request->setRouter($apiRouter);
        }
        if ($succeeded) {
            throw new \RuntimeException('UpdateIPGeoDB ended well: this server reached db-ip.com (the test config\'s dead proxy is missing)');
        }

        $logFile = (new \ReflectionProperty(ScheduledTask::class, 'executionLogFile'))->getValue($task);
        return [
            'result' => $result,
            'task' => UpdateIPGeoDB::class,
            'name' => $task->getName(),
            'processId' => $task->getProcessId(),
            'logFile' => basename($logFile),
        ];
    }
}
