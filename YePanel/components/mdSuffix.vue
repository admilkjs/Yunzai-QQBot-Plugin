<script setup lang="ts">
import iconify from "iconify";
import { type FieldValues, PlusForm, type PlusColumn } from "plus-pro-components";
import { h, reactive, ref } from "vue";

export interface FormProps {
  formInline: {
    uin: string;
    val: Array<{ key: string; values: string[] }>;
  };
}

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({ uin: "", val: [] }),
});

const newFormInline = ref<FieldValues>(props.formInline);
const ruleFormRef = ref();

function getRef() {
  return ruleFormRef.value.formInstance;
}

defineExpose({ getRef });

const rules = reactive({
  uin: [{ required: true, message: "请输入机器人uin" }],
  default: [{ required: !newFormInline.value.uin, message: "请输入对应参数" }],
});

const columns = ref<PlusColumn[]>([
  {
    label: "uin",
    prop: "uin",
    valueType: "input",
    fieldProps: {
      placeholder: "请输入机器人uin",
    },
  },
  {
    label: "default",
    prop: "default",
  },
]);

const keyInputValue = ref("");
const valueInputValue = ref("");
const keyInputVisible = ref(true);
const valueInputVisible = ref(true);

const closeItem = (key: string) => {
  const list = newFormInline.value.val as Array<{ key: string; values: string[] }>;
  const columnIndex = columns.value.findIndex(item => item.prop === key);
  const dataIndex = list.findIndex(item => item.key === key);

  if (dataIndex > -1) list.splice(dataIndex, 1);
  if (columnIndex > -1) columns.value.splice(columnIndex, 1);

  if (columns.value.length === 2) {
    rules.default[0].required = true;
    delete newFormInline.value.default;
  }
};

const addColumn = (key: string, values: string) => {
  const index = columns.value.findIndex(item => item.prop === key);
  columns.value.splice(index > -1 ? index : columns.value.length - 1, index > -1 ? 1 : 0, {
    label: key,
    prop: key,
    renderField: () =>
      h("div", { class: "suffix-row" }, [
        h("div", { class: "suffix-row__value" }, values.replace(/\r/g, "\\r")),
        h(
          "button",
          {
            class: "suffix-row__close",
            type: "button",
            onClick: () => closeItem(key),
          },
          [h(iconify, { icon: "carbon:close-filled" })]
        ),
      ]),
    renderLabel: value => h("div", { class: "suffix-label" }, value),
  });
};

for (const item of newFormInline.value.val as Array<{ key: string; values: string[] }>) {
  addColumn(item.key, item.values[0]);
}

const handleInputConfirm = (target: "key" | "value") => {
  if (target === "key") {
    if (!keyInputValue.value) return;
    keyInputVisible.value = false;
  }

  if (target === "value") {
    if (!valueInputValue.value) return;
    valueInputVisible.value = false;
  }

  if (!keyInputVisible.value && !valueInputVisible.value) {
    const key = keyInputValue.value;
    const value = valueInputValue.value;
    const list = newFormInline.value.val as Array<{ key: string; values: string[] }>;

    list.push({
      key,
      values: [value],
    });
    addColumn(key, value);

    keyInputValue.value = "";
    valueInputValue.value = "";
    keyInputVisible.value = true;
    valueInputVisible.value = true;

    if (!newFormInline.value.default) {
      newFormInline.value.default = true;
      rules.default[0].required = false;
    }
  }
};
</script>

<template>
  <section class="dialog-shell">
    <header class="dialog-shell__header">
      <span class="eyebrow">Markdown Suffix</span>
      <h3>Markdown 附加值</h3>
      <p>按键值对维护 Markdown 附加参数，适合为不同模板注入固定占位内容。</p>
    </header>

    <PlusForm
      ref="ruleFormRef"
      v-model="newFormInline"
      class="dialog-form"
      label-position="right"
      :columns="columns"
      :rules="rules"
      :row-props="{ gutter: 14 }"
      :has-footer="false"
      labelWidth="96px"
    >
      <template #plus-label-default>
        <div class="pair-field pair-field--label">
          <el-input
            v-if="keyInputVisible"
            v-model="keyInputValue"
            placeholder="参数名"
            @keyup.enter="handleInputConfirm('key')"
            @blur="handleInputConfirm('key')"
          />
          <div v-else class="pair-preview">{{ keyInputValue }}</div>
        </div>
      </template>

      <template #plus-field-default>
        <div class="pair-field">
          <el-input
            v-if="valueInputVisible"
            v-model="valueInputValue"
            placeholder="参数值"
            autosize
            type="textarea"
            @keyup.enter="handleInputConfirm('value')"
            @blur="handleInputConfirm('value')"
          />
          <div v-else class="pair-preview pair-preview--multiline">
            {{ valueInputValue }}
          </div>
        </div>
      </template>
    </PlusForm>
  </section>
</template>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Fira+Code:wght@500&family=Fira+Sans:wght@400;500;600;700&display=swap");

.dialog-shell {
  padding: 6px;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(244, 248, 255, 0.84));
}

.dialog-shell__header {
  margin-bottom: 18px;
  padding: 4px 8px 0;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 12px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.1);
  color: #2b6de4;
  font-family: "Fira Code", monospace;
  font-size: 12px;
}

.dialog-shell__header h3 {
  margin: 12px 0 8px;
  color: #15304e;
  font: 700 24px/1.15 "Fira Sans", sans-serif;
}

.dialog-shell__header p {
  margin: 0;
  color: #60758f;
  line-height: 1.7;
  font-family: "Fira Sans", sans-serif;
}

.pair-field {
  width: 100%;
}

.pair-field--label {
  min-width: 96px;
}

.pair-preview {
  min-height: 42px;
  display: flex;
  align-items: center;
  padding: 0 14px;
  border-radius: 14px;
  border: 1px solid rgba(96, 125, 159, 0.14);
  background: rgba(255, 255, 255, 0.8);
  color: #16314f;
}

.pair-preview--multiline {
  min-height: 84px;
  align-items: flex-start;
  padding: 12px 14px;
  white-space: pre-wrap;
  word-break: break-word;
}

:deep(.suffix-row) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
}

:deep(.suffix-row__value) {
  color: #16314f;
  word-break: break-all;
}

:deep(.suffix-row__close) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 999px;
  background: rgba(249, 115, 22, 0.1);
  color: #c2410c;
  cursor: pointer;
}

:deep(.suffix-label) {
  max-width: 96px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.dialog-form .plus-form) {
  padding: 20px 18px 8px;
  border-radius: 20px;
  border: 1px solid rgba(96, 125, 159, 0.14);
  background: rgba(255, 255, 255, 0.76);
  box-shadow: 0 18px 40px rgba(59, 130, 246, 0.08);
}

:deep(.dialog-form .el-form-item__label) {
  color: #16314f;
  font-weight: 600;
}

:deep(.dialog-form .el-input__wrapper),
:deep(.dialog-form .el-textarea__inner) {
  border-radius: 14px;
}
</style>
