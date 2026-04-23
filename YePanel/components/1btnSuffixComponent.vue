<script setup lang="ts">
import { type InputInstance } from "element-plus";
import { type FieldValues, PlusForm, type PlusColumn } from "plus-pro-components";
import { nextTick, ref } from "vue";

export interface FormProps {
  formInline: {
    type: string;
    data: string;
    text: string;
    style?: number;
    clicked_text?: string;
    send?: boolean;
    permission?: string[];
    show?: {
      type: string;
      data: string | number;
    };
  };
}

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({
    type: "",
    data: "",
    text: "",
    style: 0,
    clicked_text: "",
    send: false,
    permission: [],
    show: {
      type: "",
      data: "",
    },
  }),
});

const newFormInline = ref<FieldValues>(props.formInline);
const ruleFormRef = ref();
const inputVisible = ref(false);
const inputValue = ref("");
const inputWidth = ref(80);
const inputRef = ref<InputInstance>();

function getRef() {
  return ruleFormRef.value.formInstance;
}

defineExpose({ getRef });

const rules = {
  type: [{ required: true, message: "请选择按钮类型" }],
  data: [{ required: true, message: "请输入按钮数据" }],
  text: [{ required: true, message: "请输入按钮文本" }],
};

const columns: PlusColumn[] = [
  {
    label: "text",
    prop: "text",
    valueType: "input",
    fieldProps: { placeholder: "请输入按钮文本" },
  },
  {
    label: "type",
    prop: "type",
    valueType: "select",
    options: [
      { label: "input", value: "input" },
      { label: "callback", value: "callback" },
      { label: "link", value: "link" },
    ],
    fieldProps: { placeholder: "请选择按钮类型" },
  },
  {
    label: "data",
    prop: "data",
    valueType: "input",
    fieldProps: { placeholder: "请输入按钮数据" },
  },
  {
    label: "style",
    prop: "style",
    valueType: "select",
    options: [
      { label: "灰色线条灰色字体", value: 0 },
      { label: "蓝色线条蓝色字体", value: 1 },
      { label: "灰色线条红色字体", value: 3 },
      { label: "蓝色背景白色字体", value: 4 },
    ],
    fieldProps: { placeholder: "请选择按钮样式" },
  },
  {
    label: "clicked_text",
    prop: "clicked_text",
    valueType: "input",
    fieldProps: { placeholder: "请输入点击后的按钮文本" },
  },
  {
    label: "send",
    prop: "send",
    valueType: "switch",
    fieldProps: {
      activeValue: true,
      inactiveValue: false,
    },
    width: "100px",
  },
  {
    label: "permission",
    prop: "permission",
  },
  {
    label: "show.type",
    prop: "show.type",
    valueType: "select",
    options: [{ label: "random", value: "random" }],
    fieldProps: { placeholder: "设置显示条件类型" },
  },
  {
    label: "show.data",
    prop: "show.data",
    valueType: "input",
    fieldProps: { placeholder: "设置显示条件数据" },
  },
];

const showInput = () => {
  inputVisible.value = true;
  nextTick(() => inputRef.value?.input?.focus());
};

const handleInput = () => {
  inputWidth.value = Math.max(inputValue.value.length * 11, 80);
};

const handleInputConfirm = () => {
  if (inputValue.value) {
    const permissions = newFormInline.value.permission as string[];
    permissions.push(inputValue.value);
  }
  inputVisible.value = false;
  inputValue.value = "";
  inputWidth.value = 80;
};

const closeTag = (index: number) => {
  const permissions = newFormInline.value.permission as string[];
  permissions.splice(index, 1);
};
</script>

<template>
  <section class="dialog-shell">
    <header class="dialog-shell__header">
      <span class="eyebrow">Button Blueprint</span>
      <h3>按钮模板配置</h3>
      <p>定义按钮行为、文案、样式和显示条件，用于拼出更细粒度的交互按钮。</p>
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
      labelWidth="104px"
    >
      <template #plus-field-permission>
        <div class="tag-editor">
          <el-tag
            v-for="(val, index) in newFormInline.permission"
            :key="`${val}-${index}`"
            class="editor-tag"
            closable
            @close="closeTag(index)"
          >
            {{ val }}
          </el-tag>
          <el-input
            v-if="inputVisible"
            ref="inputRef"
            v-model="inputValue"
            :style="{ width: `${inputWidth}px` }"
            class="inline-input"
            size="small"
            @keyup.enter="handleInputConfirm"
            @blur="handleInputConfirm"
            @input="handleInput"
          />
          <el-button v-else class="add-button" size="small" @click="showInput">
            新增权限
          </el-button>
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

.tag-editor {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.editor-tag {
  min-height: 34px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.84);
  border: 1px solid rgba(59, 130, 246, 0.14);
}

.add-button {
  min-height: 36px;
  border-radius: 999px;
  padding: 0 14px;
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
:deep(.dialog-form .el-select__wrapper) {
  min-height: 42px;
  border-radius: 14px;
}
</style>
