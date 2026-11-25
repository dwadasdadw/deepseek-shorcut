import { basekit, FieldCode, FieldComponent, FieldType } from '@lark-base-open/faas-sdk';

const DEEPSEEK_HOST = 'api.deepseek.com';
const DEEPSEEK_URL = `https://${DEEPSEEK_HOST}/chat/completions`;
const DEFAULT_MODEL = 'deepseek-flash';
const DEFAULT_THINKING_MODE = 'disabled';
const DEFAULT_REASONING_EFFORT = 'high';
const REASONING_EFFORT_OPTIONS = [
  { label: '低', value: 'low' },
  { label: '高', value: 'high' },
  { label: '最高', value: 'max' },
];

type Completion = {
  choices?: Array<{
    finish_reason?: string;
    message?: { content?: unknown };
  }>;
};

function selectValue(selection: unknown): unknown {
  if (selection && typeof selection === 'object' && 'value' in selection) {
    return selection.value;
  }
  return selection;
}

basekit.addDomainList([DEEPSEEK_HOST]);

basekit.addField({
  formItems: [
    {
      key: 'prompt',
      label: '提示词',
      component: FieldComponent.Input,
      props: {
        type: 'textarea',
        placeholder: '例如：请将以下内容总结为一句话',
      },
      validator: { required: true },
      tooltips: [{ type: 'text', content: '点击提示词右侧的「引用字段」，插入当前记录的字段内容。' }],
    },
    {
      key: 'apiKey',
      label: 'DeepSeek API Key',
      component: FieldComponent.Input,
      props: { placeholder: '填写 DeepSeek 开放平台生成的 API Key' },
      validator: { required: true },
    },
    {
      key: 'model',
      label: '模型名',
      component: FieldComponent.Input,
      props: {
        placeholder: `填写 DeepSeek 模型 ID，留空使用 ${DEFAULT_MODEL}`,
      },
    },
    {
      key: 'thinkingMode',
      label: '思考模式',
      component: FieldComponent.SingleSelect,
      props: {
        options: [
          { label: '关闭', value: 'disabled' },
          { label: '开启', value: 'enabled' },
        ],
        defaultValue: DEFAULT_THINKING_MODE,
      },
    },
    {
      key: 'reasoningEffort',
      label: '思考强度',
      component: FieldComponent.SingleSelect,
      props: {
        options: REASONING_EFFORT_OPTIONS,
        defaultValue: DEFAULT_REASONING_EFFORT,
      },
      tooltips: [{ type: 'text', content: '开启思考模式时生效，默认选高。' }],
    },
  ],
  resultType: { type: FieldType.Text },
  execute: async (params, context) => {
    const apiKey = typeof params.apiKey === 'string' ? params.apiKey.trim() : '';
    const prompt = typeof params.prompt === 'string' ? params.prompt : '';
    if (!/^[\x21-\x7e]+$/.test(apiKey) || !prompt.trim()) {
      return { code: FieldCode.ConfigError };
    }

    // 旧版模型下拉框的已保存值可能仍是 { label, value }。
    const modelInput = selectValue(params.model) ?? '';
    if (typeof modelInput !== 'string') {
      return { code: FieldCode.ConfigError };
    }
    const model = modelInput.trim() || DEFAULT_MODEL;

    const thinkingMode = selectValue(params.thinkingMode) ?? DEFAULT_THINKING_MODE;
    if (thinkingMode !== 'enabled' && thinkingMode !== 'disabled') {
      return { code: FieldCode.ConfigError };
    }
    const thinkingEnabled = thinkingMode === 'enabled';
    const reasoningEffort = selectValue(params.reasoningEffort) ?? DEFAULT_REASONING_EFFORT;
    if (thinkingEnabled && !REASONING_EFFORT_OPTIONS.some(option => option.value === reasoningEffort)) {
      return { code: FieldCode.ConfigError };
    }

    try {
      const response = await context.fetch(DEEPSEEK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        redirect: 'error',
        timeout: thinkingEnabled ? 180_000 : 50_000,
        body: JSON.stringify({
          model,
          thinking: { type: thinkingMode },
          reasoning_effort: thinkingEnabled ? reasoningEffort : undefined,
          stream: false,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        switch (response.status) {
          case 400:
          case 413:
          case 422:
            return { code: FieldCode.InvalidArgument };
          case 401:
          case 403:
            return { code: FieldCode.AuthorizationError };
          case 402:
            return { code: FieldCode.PayError };
          case 429:
            return { code: FieldCode.RateLimit };
          default:
            return { code: FieldCode.Error };
        }
      }

      const completion: Completion | null = await response.json();
      const choice = completion?.choices?.[0];
      const text = choice?.message?.content;
      if (choice?.finish_reason !== 'stop' || typeof text !== 'string' || !text.trim()) {
        return { code: FieldCode.Error };
      }
      return { code: FieldCode.Success, data: text };
    } catch {
      return { code: FieldCode.Error };
    }
  },
});

export default basekit;
