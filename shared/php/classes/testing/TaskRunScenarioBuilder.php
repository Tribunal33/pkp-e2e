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
 * ("scheduled") task. Two tasks, chosen by `task`:
 *
 * - `updateIPGeoDB` (the default; U61): lib/pkp's PKP\task\UpdateIPGeoDB
 *   ("Update DB-IP city lite database"), with `result: 'error'`, its only
 *   outcome on a test install: its log file under
 *   {files_dir}/scheduledTaskLogs and its report email, sent for real to
 *   the site's principal contact, so it lands in Mailpit. On a test
 *   install it always ends in error at its first step: its download from
 *   db-ip.com goes through the dead local proxy of the test config (the
 *   egress rule, harness.md), so it writes nothing but its log. The run is
 *   the scheduler's own closure body, `(new UpdateIPGeoDB())->execute()`,
 *   as `php lib/pkp/tools/scheduler.php test
 *   --name='PKP\task\UpdateIPGeoDB'` runs it.
 * - `statisticsReport` (U65), with `context` (a path): lib/pkp's
 *   PKP\task\StatisticsReport ("Editorial Report Notification", the
 *   monthly editorial statistics email) for that one context, and the
 *   jobs it queues for it run. The task's own execute() runs unchanged,
 *   over every context of the install, with the Bus dispatcher faked for
 *   the call, so its one Bus::batch() is captured instead of queued; the
 *   batch's jobs that belong to the named context (StatisticsReportNotify:
 *   the Tasks entries; StatisticsReportMail: the emails, sent for real)
 *   are then dispatched as the task dispatches them, one real batch on the
 *   default queue, and each is run by the app's queue worker, reserved by
 *   id as JobScenarioBuilder reserves its job. The other contexts' jobs are
 *   dropped, so no other context's editors are notified or emailed. The
 *   recipients, the date range (the previous calendar month), the figures
 *   and the attachment are all the task's and the jobs' own.
 *
 * Both runs are made with the request routed the way that command line
 * tool routes it (a PageRouter, CommandLineTool's constructor): the
 * report's log link and the editorial email's links are page URLs, which
 * the API router of this request cannot build.
 *
 * App-neutral: the tasks, the jobs and ScheduledTaskHelper are lib/pkp's
 * alone. No mail fake and no transaction: the email is the state, and the
 * queue inserts a batch only outside a transaction.
 */

namespace PKP\testing;

use APP\core\Application;
use APP\core\PageRouter;
use APP\facades\Repo;
use Illuminate\Bus\PendingBatch;
use Illuminate\Queue\DatabaseQueue;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\DB;
use PKP\jobs\notifications\StatisticsReportMail;
use PKP\jobs\notifications\StatisticsReportNotify;
use PKP\notification\managerDelegate\EditorialReportNotificationManager;
use PKP\scheduledTask\ScheduledTask;
use PKP\task\StatisticsReport;
use PKP\task\UpdateIPGeoDB;

class TaskRunScenarioBuilder
{
    public const TASKS = ['updateIPGeoDB', 'statisticsReport'];

    public const RESULTS = ['error'];

    /** How long a job another worker's drain took may take to finish. */
    public const TAKEN_JOB_WAIT_SECONDS = 120;

    public function build(array $data): array
    {
        $root = new Spec($data);
        $task = $root->get('task', 'updateIPGeoDB');
        if (!is_string($task) || !in_array($task, self::TASKS, true)) {
            throw new SpecException('task', 'task must be one of: ' . implode(', ', self::TASKS));
        }
        return $task === 'statisticsReport'
            ? $this->statisticsReport($root)
            : $this->updateIPGeoDB($root);
    }

    /**
     * @return array{result: string, task: string, name: string,
     *   processId: string, logFile: string} `processId` is in the report
     *   email's subject ("{name} - {processId} - Error"), `logFile` the
     *   `file` parameter of its log link
     */
    protected function updateIPGeoDB(Spec $root): array
    {
        $result = $root->require('result');
        if (!in_array($result, self::RESULTS, true)) {
            throw new SpecException('result', 'result must be one of: ' . implode(', ', self::RESULTS) . ' (a run that ends well sends no report under the default scheduled_tasks_report_error_only)');
        }
        $root->assertConsumed();

        $task = new UpdateIPGeoDB();
        $succeeded = $this->asCommandLine(fn () => $task->execute());
        if ($succeeded) {
            throw new \RuntimeException('UpdateIPGeoDB ended well: this server reached db-ip.com (the test config\'s dead proxy is missing)');
        }

        return [
            'result' => $result,
            'task' => UpdateIPGeoDB::class,
            'name' => $task->getName(),
            'processId' => $task->getProcessId(),
            'logFile' => $this->logFile($task),
        ];
    }

    /**
     * @return array{task: string, name: string, context: string,
     *   contextId: int, dateStart: string, dateEnd: string, notified:
     *   string[], mailed: string[], jobs: int, batch: ?string, processId:
     *   string, logFile: string} `notified` the usernames the Tasks entry
     *   went to, `mailed` those the email went to, as the task chose them;
     *   `dateStart` and `dateEnd` the range the task passes to the figures
     *   (the first days of the previous and of this month)
     */
    protected function statisticsReport(Spec $root): array
    {
        $path = $root->require('context');
        if (!is_string($path)) {
            throw new SpecException('context', 'context must be a context path');
        }
        $root->assertConsumed();
        $context = Application::getContextDAO()->getByPath($path);
        if (!$context) {
            throw new SpecException('context', "Unknown context path \"{$path}\"");
        }
        $contextId = (int) $context->getId();

        return $this->asCommandLine(function () use ($contextId, $path) {
            // The task, unchanged, with its Bus::batch() captured.
            $realBus = Bus::getFacadeRoot();
            $fake = Bus::fake();
            try {
                $task = new StatisticsReport();
                $succeeded = $task->execute();
            } finally {
                Bus::swap($realBus);
            }
            if (!$succeeded) {
                throw new \RuntimeException('StatisticsReport ended in error; its log: ' . $this->logFile($task));
            }

            $jobs = [];
            foreach ($fake->dispatchedBatches() as $pendingBatch) { /** @var PendingBatch $pendingBatch */
                foreach ($pendingBatch->jobs as $job) {
                    if ($this->jobContextId($job) === $contextId) {
                        $jobs[] = $job;
                    }
                }
            }

            $notified = [];
            $mailed = [];
            foreach ($jobs as $job) {
                $userIds = (new \ReflectionProperty($job, 'userIds'))->getValue($job);
                foreach ($userIds as $userId) {
                    $username = Repo::user()->get((int) $userId, true)?->getUsername();
                    if ($job instanceof StatisticsReportMail) {
                        $mailed[] = $username;
                    } else {
                        $notified[] = $username;
                    }
                }
            }

            $batchId = $jobs !== [] ? $this->runBatch($jobs) : null;

            $dateStart = new \DateTimeImmutable('first day of previous month midnight');
            $dateEnd = new \DateTimeImmutable('first day of this month midnight');
            sort($notified);
            sort($mailed);
            return [
                'task' => StatisticsReport::class,
                'name' => $task->getName(),
                'context' => $path,
                'contextId' => $contextId,
                'dateStart' => $dateStart->format('Y-m-d'),
                'dateEnd' => $dateEnd->format('Y-m-d'),
                'notified' => $notified,
                'mailed' => $mailed,
                'jobs' => count($jobs),
                'batch' => $batchId,
                'processId' => $task->getProcessId(),
                'logFile' => $this->logFile($task),
            ];
        });
    }

    /** The context a StatisticsReport job works for. */
    protected function jobContextId(object $job): ?int
    {
        if ($job instanceof StatisticsReportMail) {
            return (int) (new \ReflectionProperty($job, 'contextId'))->getValue($job);
        }
        if ($job instanceof StatisticsReportNotify) {
            $manager = (new \ReflectionProperty($job, 'notificationManager'))->getValue($job);
            $context = (new \ReflectionProperty(EditorialReportNotificationManager::class, '_context'))->getValue($manager);
            return (int) $context->getId();
        }
        return null;
    }

    /**
     * Dispatch the jobs as the task does (one Bus::batch on the jobs' own
     * connection and the default queue), then run each through the app's
     * queue worker, in order. A job another worker's drain reserved first
     * is waited for. A job that fails, or is put back for another try, is
     * a failed build: its rows are removed and the error is thrown.
     *
     * @return string the batch's id (its `job_batches` row)
     */
    protected function runBatch(array $jobs): string
    {
        $batch = Bus::batch($jobs)->dispatch();
        $connection = (string) ($jobs[0]->connection ?? config('queue.default'));
        $queue = app('queue')->connection($connection);
        if (!$queue instanceof DatabaseQueue) {
            throw new \RuntimeException('The queue connection "' . $connection . '" is not the database queue');
        }
        $rows = DB::table('jobs')->where('payload', 'like', '%' . $batch->id . '%')->orderBy('id')->get(['id', 'queue']);
        if (count($rows) !== count($jobs)) {
            throw new \RuntimeException('The batch ' . $batch->id . ' queued ' . count($rows) . ' of ' . count($jobs) . ' jobs');
        }
        try {
            foreach ($rows as $row) {
                $databaseJob = JobScenarioBuilder::reserve($queue, (string) $row->queue, (int) $row->id);
                if ($databaseJob) {
                    try {
                        JobScenarioBuilder::process($connection, $databaseJob);
                    } catch (\Throwable $e) {
                        throw new \RuntimeException("Job {$row->id} of batch {$batch->id} failed: " . $e->getMessage(), 0, $e);
                    }
                    if (DB::table('jobs')->where('id', $row->id)->exists()) {
                        throw new \RuntimeException("Job {$row->id} of batch {$batch->id} did not finish");
                    }
                } else {
                    $deadline = time() + self::TAKEN_JOB_WAIT_SECONDS;
                    while (DB::table('jobs')->where('id', $row->id)->exists()) {
                        if (time() > $deadline) {
                            throw new \RuntimeException("Job {$row->id} of batch {$batch->id}, taken by another worker, did not finish");
                        }
                        usleep(250000);
                    }
                }
            }
            $failed = DB::table('job_batches')->where('id', $batch->id)->value('failed_jobs');
            if ((int) $failed > 0) {
                throw new \RuntimeException("Batch {$batch->id} has {$failed} failed job(s): see Administration › Failed Jobs");
            }
            return $batch->id;
        } catch (\Throwable $e) {
            // Failure hygiene: no half-run job left on the queue.
            DB::table('jobs')->where('payload', 'like', '%' . $batch->id . '%')->delete();
            throw $e;
        }
    }

    /**
     * Run a task the way `php lib/pkp/tools/scheduler.php` routes it: a
     * PageRouter on the request (CommandLineTool's constructor), so its
     * page links can be built.
     */
    protected function asCommandLine(callable $run): mixed
    {
        $request = Application::get()->getRequest();
        $apiRouter = $request->getRouter();
        $pageRouter = new PageRouter();
        $pageRouter->setApplication(Application::get());
        $request->setRouter($pageRouter);
        try {
            return $run();
        } finally {
            $request->setRouter($apiRouter);
        }
    }

    protected function logFile(ScheduledTask $task): string
    {
        return basename((new \ReflectionProperty(ScheduledTask::class, 'executionLogFile'))->getValue($task));
    }
}
