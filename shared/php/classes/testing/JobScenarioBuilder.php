<?php

/**
 * @file classes/testing/JobScenarioBuilder.php
 *
 * Copyright (c) 2026 Simon Fraser University
 * Copyright (c) 2026 John Willinsky
 * Distributed under the GNU GPL v3. For full terms see the file docs/COPYING.
 *
 * @class JobScenarioBuilder
 *
 * @brief POST /api/v1/_test/scenarios/job — one job of the test's own on
 * Administration's Jobs or Failed Jobs page (U61). The job is lib/pkp's own
 * queue smoke-test job, PKP\jobs\testJobs\TestJobFailure, on its own queue
 * (Job::TESTING_QUEUE, "queuedTestJob"), which the ordinary drain (`jobs.php
 * run`, support/jobs.js runJobs) never runs, and whose handle() always throws
 * on its one try. The two states are the two steps of the app's own smoke
 * test, `php lib/pkp/tools/jobs.php test --only=failed` then `jobs.php run
 * --test`:
 *
 * - state 'queued' — dispatch() it, as `jobs.php test --only=failed` does: a
 *   `jobs` row, Attempts 0, listed on the Jobs page.
 * - state 'failed' — dispatch it, then run that one job through the app's
 *   queue worker as `jobs.php run --test` does (PKPQueueProvider::
 *   runJobInQueue → Worker::runNextJob → Worker::process): the job is
 *   reserved (DatabaseQueue::marshalJob, the step pop() takes), fired, and
 *   failed for good by the worker, and PKPQueueProvider's Queue::failing
 *   listener stores the `failed_jobs` row the Failed Jobs page lists.
 *
 * One deliberate deviation (parity ledger): the CLI pops the queue's OLDEST
 * job, and the testing queue may already hold another test's job (a
 * `queued` seed, or a failed job put back by "Try Again" or "Requeue All
 * Failed Jobs"), so the builder reserves its own job by id instead. The
 * reserve, the run and the failure are the app's own.
 *
 * App-neutral: the queue and its tools are lib/pkp's alone. Not run inside
 * the builder transaction: the database queue is configured `after_commit`,
 * so a job dispatched inside a transaction is not inserted until it commits.
 */

namespace PKP\testing;

use Illuminate\Contracts\Bus\Dispatcher;
use Illuminate\Queue\DatabaseQueue;
use Illuminate\Queue\Events\JobQueued;
use Illuminate\Queue\Jobs\DatabaseJobRecord;
use Illuminate\Support\Facades\DB;
use PKP\job\models\Job as PKPJobModel;
use PKP\jobs\testJobs\TestJobFailure;

class JobScenarioBuilder
{
    public const STATES = ['queued', 'failed'];

    /**
     * @return array{state: string, id: int, uuid: string, queue: string,
     *   connection: string, displayName: string} `id` is the number the
     *   page's "ID" column shows: the `jobs` row's for 'queued', the
     *   `failed_jobs` row's for 'failed' (the Details page's address ends in
     *   it)
     */
    public function build(array $data): array
    {
        $root = new Spec($data);
        $state = $root->require('state');
        if (!in_array($state, self::STATES, true)) {
            throw new SpecException('state', 'state must be one of: ' . implode(', ', self::STATES));
        }
        $root->assertConsumed();

        $job = new TestJobFailure();
        $queued = null;
        app('events')->listen(JobQueued::class, function (JobQueued $event) use ($job, &$queued) {
            if ($event->job === $job) {
                $queued = $event;
            }
        });
        // What `jobs.php test` does: the Bus dispatcher pushes it onto its
        // connection and queue (the job's constructor names both).
        app(Dispatcher::class)->dispatch($job);
        if (!$queued) {
            throw new \RuntimeException('The test job was not queued');
        }
        $id = (int) $queued->id;
        $uuid = (string) (json_decode($queued->payload, true)['uuid'] ?? '');
        $connection = (string) $queued->connectionName;
        $queueName = (string) $job->queue;
        $displayName = (string) (json_decode($queued->payload, true)['displayName'] ?? '');

        if ($state === 'queued') {
            return compact('state', 'id', 'uuid') + ['queue' => $queueName, 'connection' => $connection, 'displayName' => $displayName];
        }

        try {
            $failedId = $this->runToFailure($connection, $queueName, $id, $uuid);
        } catch (\Throwable $e) {
            // Failure hygiene: never leave the job behind half-run.
            DB::table('jobs')->where('id', $id)->delete();
            throw $e;
        }
        return ['state' => $state, 'id' => $failedId, 'uuid' => $uuid, 'queue' => $queueName, 'connection' => $connection, 'displayName' => $displayName];
    }

    /**
     * Run the one job through the app's worker, as `jobs.php run --test`
     * runs the testing queue's next job, and return its `failed_jobs` id.
     */
    protected function runToFailure(string $connection, string $queueName, int $id, string $uuid): int
    {
        $queue = app('queue')->connection($connection);
        if (!$queue instanceof DatabaseQueue) {
            throw new \RuntimeException('The queue connection "' . $connection . '" is not the database queue');
        }

        // DatabaseQueue::pop() without its oldest-first pick: the row locked
        // and reserved by the queue's own marshalJob (attempts + 1).
        $marshal = \Closure::bind(fn (string $q, DatabaseJobRecord $record) => $this->marshalJob($q, $record), $queue, DatabaseQueue::class);
        $databaseJob = DB::transaction(function () use ($marshal, $queueName, $id) {
            $record = DB::table('jobs')->where('id', $id)->whereNull('reserved_at')->lockForUpdate()->first();
            if (!$record) {
                throw new \RuntimeException("The test job {$id} was taken by another worker");
            }
            return $marshal($queueName, new DatabaseJobRecord((object) $record));
        });

        // PKPQueueProvider::runJobInQueue's worker set-up, then the step
        // Worker::runNextJob takes for the popped job.
        $worker = app()->get('queue.worker'); /** @var \Illuminate\Queue\Worker $worker */
        $worker->setCache(app()->get('cache.store'));
        try {
            $worker->process($connection, $databaseJob, app('pkpJobQueue')->getWorkerOptions());
        } catch (\Exception $e) {
            // TestJobFailure::handle()'s own exception, rethrown by the
            // worker after it failed the job (runNextJob reports it).
            if ($e->getMessage() !== 'Test failure job') {
                throw $e;
            }
        }

        $failed = DB::table('failed_jobs')
            ->where('queue', $queueName)
            ->where('payload', 'like', '%"uuid":"' . $uuid . '"%')
            ->first();
        if (!$failed || DB::table('jobs')->where('id', $id)->exists()) {
            throw new \RuntimeException("The test job {$id} did not fail for good (" . ($failed ? 'still queued' : 'no failed_jobs row') . ')');
        }
        return (int) $failed->id;
    }

    /**
     * The testing queue: GET _test/jobs leaves its jobs out of the count a
     * runJobs() drain waits on, because the drain (`jobs.php run`) never
     * runs them.
     */
    public static function testingQueue(): string
    {
        return PKPJobModel::TESTING_QUEUE;
    }
}
