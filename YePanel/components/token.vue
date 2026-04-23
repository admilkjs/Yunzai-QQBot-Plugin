<script setup lang="ts">
import { type PlusColumn, type FieldValues, PlusForm } from "plus-pro-components";
import { ref } from "vue";

export interface FormProps {
  formInline: {
    uin: string;
    appid: string;
    token: string;
    appSecret: string;
    isGroup: number;
    isPrivate: number;
  };
}

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({
    uin: "",
    appid: "",
    token: "",
    appSecret: "",
    isGroup: 0,
    isPrivate: 0,
  }),
});

const newFormInline = ref<FieldValues>(props.formInline);
const ruleFormRef = ref();

function getRef() {
  return ruleFormRef.value.formInstance;
}

defineExpose({ getRef });

const rules = {
  uin: [{ required: true, message: "请输入机器人uin" }],
  appid: [{ required: true, message: "请输入机器人appid" }],
  token: [{ required: true, message: "请输入机器人token" }],
  appSecret: [{ required: true, message: "请输入机器人appSecret" }],
};

const columns: PlusColumn[] = [
  {
    label: "uin",
    prop: "uin",
    valueType: "input",
    fieldProps: {
      placeholder: "请输入机器人uin",
    },
  },
  {
    label: "appid",
    prop: "appid",
    valueType: "input",
    fieldProps: {
      placeholder: "请输入机器人appid",
    },
  },
  {
    label: "token",
    prop: "token",
    valueType: "input",
    fieldProps: {
      placeholder: "请输入机器人token",
    },
  },
  {
    label: "appSecret",
    prop: "appSecret",
    valueType: "input",
    fieldProps: {
      placeholder: "请输入机器人appSecret",
    },
  },
  {
    label: "群Bot",
    prop: "isGroup",
    valueType: "switch",
    fieldProps: {
      activeValue: 1,
      inactiveValue: 0,
    },
  },
  {
    label: "频道私域",
    prop: "isPrivate",
    valueType: "switch",
    fieldProps: {
      activeValue: 1,
      inactiveValue: 0,
    },
  },
];
</script>

<template>
  <section class="dialog-shell">
    <header class="dialog-shell__header">
      <span class="eyebrow">Token Config</span>
      <h3>机器人鉴权</h3>
      <p>填写 QQBot 的连接凭据与运行形态，保存后会写回主面板配置。</p>
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

:deep(.dialog-form .el-input__wrapper),
:deep(.dialog-form .el-select__wrapper),
:deep(.dialog-form .el-input-number) {
  min-height: 42px;
  border-radius: 14px;
}

:deep(.dialog-form .el-switch) {
  min-height: 32px;
}
</style>
