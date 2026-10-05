<?php
/**
 * Kept check for pkp/omp#2487 (issue pkp/pkp-lib#12593, PR review round 2, 2026-10-02): drives
 * I12593_DiscussionInternalReviewTemplate::up() on the fresh install's tables as a press upgraded from
 * 3.5 meets it: I12593_EmailToTaskTemplates has given every press its four "Discussion (…)" templates
 * from the 3.5 email data (description "Please enter your message."), none for Internal Review. Inside a
 * transaction that is rolled back, the driver deletes every DISCUSSION_NOTIFICATION_INTERNAL_REVIEW row,
 * runs the migration, and prints, for the press given, the Review and Internal Review templates' title
 * and description per locale, beside the fresh install's, as JSON. Run from the OMP root:
 *   PKP_CONFIG_FILE=$PWD/config.test.inc.php php <this file> <press path>
 */
define('INDEX_FILE_LOCATION', getcwd() . '/index.php');
require getcwd() . '/lib/pkp/classes/cliTool/CommandLineTool.php';

use APP\migration\upgrade\v3_6_0\I12593_DiscussionInternalReviewTemplate;
use Illuminate\Support\Facades\DB;

class MigrateInternalReviewDriver extends \PKP\cliTool\CommandLineTool
{
    protected function read(int $contextId): array
    {
        $out = [];
        $rows = DB::table('edit_task_templates')->where('context_id', $contextId)
            ->whereIn('key', ['DISCUSSION_NOTIFICATION_REVIEW', 'DISCUSSION_NOTIFICATION_INTERNAL_REVIEW'])
            ->get();
        foreach ($rows as $row) {
            $settings = DB::table('edit_task_template_settings')->where('edit_task_template_id', $row->edit_task_template_id)->get();
            $out[$row->key] = ['stageId' => $row->stage_id, 'type' => $row->type, 'include' => $row->include, 'restrict' => $row->restrict_to_user_groups];
            foreach ($settings as $s) {
                $out[$row->key][$s->setting_name][$s->locale] = $s->setting_value;
            }
        }
        return $out;
    }

    public function execute(): void
    {
        $contextId = DB::table('presses')->where('path', $this->argv[0])->value('press_id');
        $result = ['press' => $this->argv[0], 'pressId' => $contextId, 'freshInstall' => $this->read($contextId)];
        DB::beginTransaction();
        try {
            $result['deleted'] = DB::table('edit_task_templates')->where('key', 'DISCUSSION_NOTIFICATION_INTERNAL_REVIEW')->delete();
            (new ReflectionClass(I12593_DiscussionInternalReviewTemplate::class))->newInstanceWithoutConstructor()->up();
            $result['inserted'] = DB::table('edit_task_templates')->where('key', 'DISCUSSION_NOTIFICATION_INTERNAL_REVIEW')->count();
            $result['presses'] = DB::table('presses')->count();
            $result['afterUpgrade'] = $this->read($contextId);
        } catch (\Throwable $e) {
            $result['error'] = get_class($e) . ': ' . $e->getMessage();
        } finally {
            DB::rollBack();
        }
        echo json_encode($result, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE), "\n";
    }
}

$tool = new MigrateInternalReviewDriver($argv ?? []);
$tool->execute();
