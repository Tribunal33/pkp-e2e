<?php
/**
 * Run the subscription expiry reminder task as if it were a given day, the way a unit test
 * would with Carbon::setTestNow(). Only code that reads the day through Carbon (the fix in
 * fix.diff) follows the moved day; today's code reads date() and runs for the real day.
 *
 * Usage, in the OJS root: php <path>/seam.php 2026-10-16 [2026-11-01 ...]
 */
define('APP_ROOT', getcwd());
require_once APP_ROOT . '/tools/bootstrap.php';

class RunExpiryReminderOn extends \PKP\cliTool\CommandLineTool
{
    public function execute()
    {
        foreach ($this->argv as $date) {
            \Carbon\Carbon::setTestNow(\Carbon\Carbon::parse($date . ' 00:05:00'));
            $ok = (new \APP\tasks\SubscriptionExpiryReminder())->execute();
            echo $date . ' ' . ($ok ? 'done' : 'failed') . "\n";
        }
        \Carbon\Carbon::setTestNow();
    }
}

(new RunExpiryReminderOn($argv ?? []))->execute();
