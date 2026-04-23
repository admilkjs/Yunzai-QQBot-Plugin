<script setup lang="ts">
import { ElInput } from "element-plus";
import { type PlusColumn, type FieldValues, PlusForm } from "plus-pro-components";
import { h, ref } from "vue";

export interface FormProps {
  formInline: {
    uin: string;
    id: string;
  };
}

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({ uin: "", id: "" }),
});

const newFormInline = ref<FieldValues>(props.formInline);
const ruleFormRef = ref();

function getRef() {
  return ruleFormRef.value.formInstance;
}

defineExpose({ getRef });

const rules = {
  uin: [{ required: true, message: "请输入机器人uin" }],
  id: [{ required: true, message: "请输入模版id" }],
};

const columns: PlusColumn[] = [
  {
    label: "uin",
    prop: "uin",
    valueType: "input",
    fieldProps: {
      placeholder: "请输入机器人uin",
    },
    renderLabel: value => (newFormInline.value.uin === "template" ? "通用模版" : value),
    renderField: (_, onChange) =>
      h(ElInput, {
        onChange,
        disabled: newFormInline.value.uin === "template",
        placeholder: newFormInline.value.uin === "template" ? "template" : "请输入机器人uin",
      }),
  },
  {
    label: "模版id",
    prop: "id",
    valueType: "input",
    fieldProps: {
      placeholder: "请输入模版id",
    },
    renderLabel: value => (newFormInline.value.uin === "template" ? "模版参数" : value),
  },
];
</script>

<template>
  <section class="dialog-shell">
    <header class="dialog-shell__header">
      <span class="eyebrow">Markdown Template</span>
      <h3>Markdown 模版映射</h3>
      <p>支持设置全局通用模版，也可以按机器人单独覆盖，适合做不同账号的内容分发策略。</p>
    </header>

    <PlusForm
      ref="ruleFormRef"
      v-model="newFormInline"
      class="dialog-form"
      :columns="columns"
      label-position="right"
      :rules="rules"
      :row-props="{ gutter: 14 }"
      :has-footer="false"
      labelWidth="96px"
    />
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

:deep(.dialog-form .el-input__wrapper) {
  min-height: 42px;
  border-radius: 14px;
}
</style>
