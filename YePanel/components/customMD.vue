<script setup lang="ts">
import { type InputInstance } from "element-plus";
import { type PlusColumn, type FieldValues, PlusForm } from "plus-pro-components";
import { nextTick, ref } from "vue";

export interface FormProps {
  formInline: {
    uin: string;
    id: string;
    keys: string[];
  };
}

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({ uin: "", id: "", keys: [] }),
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
  uin: [{ required: true, message: "请输入机器人uin" }],
  id: [{ required: true, message: "请输入模版id" }],
  keys: [{ required: true, message: "请输入模版key" }],
};

const columns: PlusColumn[] = [
  {
    label: "uin",
    prop: "uin",
    valueType: "input",
    fieldProps: { placeholder: "请输入机器人uin" },
  },
  {
    label: "模版id",
    prop: "id",
    valueType: "input",
    fieldProps: { placeholder: "请输入模版id" },
  },
  {
    label: "模版key",
    prop: "keys",
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
    const keys = newFormInline.value.keys as string[];
    keys.push(inputValue.value);
  }
  inputVisible.value = false;
  inputValue.value = "";
  inputWidth.value = 80;
};

const closeTag = (index: number) => {
  const keys = newFormInline.value.keys as string[];
  keys.splice(index, 1);
};
</script>

<template>
  <section class="dialog-shell">
    <header class="dialog-shell__header">
      <span class="eyebrow">Custom Markdown</span>
      <h3>自定义模版变量</h3>
      <p>为自定义 Markdown 模版维护变量名列表，后续渲染时可按这些 key 做动态映射。</p>
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
      <template #plus-field-keys>
        <div class="tag-editor">
          <el-tag
            v-for="(val, index) in newFormInline.keys"
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
            新增变量
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

.inline-input {
  max-width: 100%;
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
