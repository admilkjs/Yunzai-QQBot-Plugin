<template>
  <section class="dialog-shell">
    <header class="dialog-shell__header">
      <span class="eyebrow">Button Matrix</span>
      <h3>按钮附加值</h3>
      <p>配置每一行按钮的排列位置与模板组合，用于扩展消息卡片中的自定义交互。</p>
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
      <template #plus-field-values>
        <div class="tag-editor">
          <button
            v-for="(val, key) in newFormInline.values"
            :key="`${val.type}-${val.text}-${key}`"
            class="button-chip"
            type="button"
            @click="showDialog('修改', key)"
          >
            <span class="button-chip__type">{{ val.type }}</span>
            <span class="button-chip__text">{{ val.text }}</span>
            <span class="button-chip__close" @click.stop="closeTag(key)">×</span>
          </button>
          <el-button class="add-button" size="small" @click="showDialog('增加')">
            新增按钮
          </el-button>
        </div>
      </template>
    </PlusForm>
  </section>
</template>

<script setup lang="ts">
import { type FieldValues, PlusForm, type PlusColumn } from "plus-pro-components";
import { h, ref } from "vue";
import component from "1btnSuffixComponent.vue";
import addDialog from "@addDialog";

type ButtonForm = {
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

export interface FormProps {
  formInline: {
    uin: string;
    position: string | number;
    values: ButtonForm[];
  };
}

const props = withDefaults(defineProps<FormProps>(), {
  formInline: () => ({ uin: "", position: "", values: [] }),
});

const newFormInline = ref<FieldValues>(props.formInline);
const ruleFormRef = ref();
const componentFormRef = ref();

function getRef() {
  return ruleFormRef.value.formInstance;
}

defineExpose({ getRef });

const rules = {
  uin: [{ required: true, message: "请输入机器人uin" }],
  position: [{ required: true, message: "请选择位置" }],
  values: [{ required: true, message: "请输入按钮模版" }],
};

const columns: PlusColumn[] = [
  {
    label: "uin",
    prop: "uin",
    valueType: "input",
    fieldProps: { placeholder: "请输入机器人uin" },
  },
  {
    label: "位置",
    prop: "position",
    valueType: "select",
    options: Array.from({ length: 5 }, (_, index) => ({
      label: `第${index + 1}行`,
      value: index + 1,
    })),
    fieldProps: { placeholder: "请选择位置" },
  },
  {
    label: "按钮模版",
    prop: "values",
  },
];

const showDialog = (title: string, index?: number) => {
  const dialogProps: { formInline: ButtonForm } = {
    formInline: {
      type: "input",
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
    },
  };

  if (index !== undefined && newFormInline.value.values[index]) {
    dialogProps.formInline = {
      ...newFormInline.value.values[index],
      permission: [...(newFormInline.value.values[index].permission || [])],
      show: { ...(newFormInline.value.values[index].show || { type: "", data: "" }) },
      send: !!newFormInline.value.values[index].send,
    };
  }

  addDialog({
    width: window.innerWidth < 992 ? "90%" : window.innerWidth <= 1200 ? "50%" : "30%",
    title: `${title}按钮`,
    contentRenderer: () => h(component, { ref: componentFormRef }),
    props: dialogProps,
    closeCallBack: ({ options, args }) => {
      const { formInline } = options.props as { formInline: ButtonForm };
      if (args?.command !== "sure") return;
      const list = newFormInline.value.values as ButtonForm[];
      if (index !== undefined) {
        list.splice(index, 1, formInline);
      } else {
        list.push(formInline);
      }
    },
    beforeSure: (done, { options }) => {
      const formRef = componentFormRef.value.getRef(options);
      formRef.validate((valid: boolean) => {
        if (valid) done();
      });
    },
    draggable: true,
    closeOnClickModal: false,
  });
};

const closeTag = (index: number) => {
  const list = newFormInline.value.values as ButtonForm[];
  list.splice(index, 1);
};
</script>

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
}

.button-chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 38px;
  padding: 0 12px;
  border-radius: 999px;
  border: 1px solid rgba(59, 130, 246, 0.14);
  background: rgba(255, 255, 255, 0.84);
  color: #16314f;
  cursor: pointer;
}

.button-chip__type {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
  font-size: 12px;
  font-family: "Fira Code", monospace;
}

.button-chip__text {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.button-chip__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 999px;
  background: rgba(249, 115, 22, 0.12);
  color: #c2410c;
  font-weight: 700;
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
