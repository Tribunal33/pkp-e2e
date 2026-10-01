<?php
// Runs one step inside an app checkout's code, under the install's own config
// (PKP_CONFIG_FILE). Used by upgraded.js and fieldconfig.js; run from the app root:
//   php <this file> repair        the proposed RemoveEmptySubmissionAcknowledgementSetting::up()
//   php <this file> fieldconfig   the proposed FieldConfigTest assertions, through FormComponent::getFieldConfig()
define('INDEX_FILE_LOCATION', getcwd() . '/index.php');
require getcwd() . '/lib/pkp/classes/cliTool/CommandLineTool.php';

use PKP\components\forms\FieldOptions;
use PKP\components\forms\FieldRadioInput;
use PKP\components\forms\FieldSelect;
use PKP\components\forms\FormComponent;

$step = $argv[1] ?? '';
if ($step === 'repair') {
    $class = 'PKP\migration\upgrade\v3_6_0\RemoveEmptySubmissionAcknowledgementSetting';
    $migration = (new ReflectionClass($class))->newInstanceWithoutConstructor();
    $migration->up();
    echo "repair: ran {$class}::up()\n";
} elseif ($step === 'fieldconfig') {
    $form = new FormComponent('testForm', 'PUT', 'http://example.com', [['key' => 'en', 'label' => 'English']]);
    $options = [['value' => 'allAuthors', 'label' => 'All authors'], ['value' => null, 'label' => 'Off']];
    $checks = [
        'radio with a null option, no value' => [$form->getFieldConfig(new FieldOptions('ack', ['type' => 'radio', 'options' => $options]))['value'], null],
        'radio with a null option, value null' => [$form->getFieldConfig(new FieldOptions('ack', ['type' => 'radio', 'options' => $options, 'value' => null]))['value'], null],
        'select with a null option' => [$form->getFieldConfig(new FieldSelect('agency', ['options' => $options]))['value'], null],
        'radio input with a null option' => [$form->getFieldConfig(new FieldRadioInput('choice', ['options' => $options]))['value'], null],
        'select without a null option' => [$form->getFieldConfig(new FieldSelect('plain', ['options' => [['value' => 'a', 'label' => 'A']]]))['value'], ''],
        'radio without a null option' => [$form->getFieldConfig(new FieldOptions('r', ['type' => 'radio', 'options' => [['value' => true, 'label' => 'On']]]))['value'], ''],
    ];
    $failed = 0;
    foreach ($checks as $name => [$got, $want]) {
        $ok = $got === $want;
        $failed += $ok ? 0 : 1;
        echo ($ok ? 'ok   ' : 'FAIL ') . $name . ': ' . var_export($got, true) . "\n";
    }
    exit($failed ? 1 : 0);
} else {
    fwrite(STDERR, "usage: php inapp.php repair|fieldconfig\n");
    exit(2);
}
