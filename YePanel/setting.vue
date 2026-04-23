<script setup lang="ts">
import { computed, h, ref } from "vue";
import {
  type FieldValues,
  PlusForm,
  PlusFormGroupRow,
} from "plus-pro-components";
import markdown from "markdown.vue";
import customMD from "customMD.vue";
import mdSuffix from "mdSuffix.vue";
import filterLog from "filterLog.vue";
import btnSuffix from "btnSuffix.vue";
import token from "token.vue";
import addDialog from "@addDialog";
import message from "@message";
import { clone } from "@pureadmin/utils";

defineOptions({
  name: "setting",
});

const props = defineProps({
  // method, url, param, axiosConfig
  request: Function,
});

// 表单绑定值
const state = ref({
  permission: "",
  toQRCode: "",
  toCallback: false,
  toBotUpload: false,
  imageUploadProvider: "bot",
  hideGuildRecall: false,
  toQQUin: false,
  toImg: false,
  sendButton: false,
  callStats: false,
  userStats: false,
  simplifiedSdkLog: false,
  markdownImgScale: false,
  sep: "",
  bot: {
    sandbox: false,
    maxRetry: 0,
    timeout: 0,
  },
  dauDB: "level",
  markdown: {},
  customMD: {},
  mdSuffix: {},
  filterLog: {},
  btnSuffix: {},
  token: [],
});

const getData = () => {
  props
    .request("post", `/get-setting-data`)
    .then((res) => res.data)
    .then((data) => {
      for (const key in data) {
        state.value[key] = data[key];
      }
      state.value.token = [];
      for (const i of data.token as string[]) {
        const [uin, appid, token, appSecret, isGroup, isPrivate] = i.split(":");
        state.value.token.push({
          uin,
          appid,
          token,
          appSecret,
          isGroup: Number(isGroup),
          isPrivate: Number(isPrivate),
        });
      }
      for (const key in state.value.btnSuffix) {
        state.value.btnSuffix[key].values.forEach((i: any) => {
          for (const k of ["input", "callback", "link"]) {
            if (i[k]) {
              i.type = k;
              i.data = i[k];
              break;
            }
          }
        });
      }
    });
};

getData();

// 表单校验规则
const rules = {
  permission: [
    {
      required: true,
      message: "请选择权限",
    },
  ],
  dauDB: [
    {
      required: true,
      message: "请选择dau数据库",
    },
  ],
};

const fieldProps = {
  activeValue: true,
  inactiveValue: false,
};

const imageUploadOptions = [
  {
    label: "Bot",
    value: "bot",
  },
  {
    label: "ChatGLM",
    value: "chatglm",
  },
  {
    label: "Ukaka",
    value: "ukaka",
  },
  {
    label: "星野",
    value: "xingye",
  },
];

const uploadProviderLabelMap = {
  bot: "Bot 图链",
  chatglm: "ChatGLM 图床",
  ukaka: "Ukaka 图床",
  xingye: "星野图床",
};

const activeUploadLabel = computed(
  () => uploadProviderLabelMap[state.value.imageUploadProvider] || "Bot 图链"
);

const dashboardStats = computed(() => [
  {
    label: "Token 账号",
    value: state.value.token.length,
    desc: "当前已接入的 QQBot 账号数",
  },
  {
    label: "上传渠道",
    value: activeUploadLabel.value,
    desc: state.value.toBotUpload ? "markdown 图片已开启上传" : "markdown 图片上传已关闭",
  },
  {
    label: "Markdown 配置",
    value: Object.keys(state.value.markdown || {}).length,
    desc: "全局与分 Bot 模版总数",
  },
  {
    label: "扩展开关",
    value: [
      state.value.toCallback,
      state.value.toImg,
      state.value.callStats,
      state.value.userStats,
    ].filter(Boolean).length,
    desc: "按钮回调、转图、统计等已开启项",
  },
]);

const group: PlusFormGroupRow[] = [
  {
    title: "基础设置",
    columns: [
      {
        label: "权限",
        prop: "permission",
        valueType: "radio",
        options: [
          {
            label: "master",
            value: "master",
          },
          {
            label: "owner",
            value: "owner",
          },
          {
            label: "admin",
            value: "admin",
          },
          {
            label: "all",
            value: "all",
          },
        ],
        colProps: {
          span: 12,
          xs: 23,
        },
      },
      {
        label: "dau数据库",
        prop: "dauDB",
        valueType: "radio",
        tooltip: "重启后生效",
        options: [
          {
            label: "level",
            value: "level",
          },
          {
            label: "redis",
            value: "redis",
          },
          {
            label: "关闭",
            value: false,
          },
        ],
        colProps: {
          span: 12,
          xs: 23,
        },
      },
      {
        label: "md图片缩放",
        prop: "markdownImgScale",
        valueType: "input-number",
        fieldProps: {
          precision: 1,
          step: 0.1,
        },
        colProps: {
          span: 12,
          xs: 23,
        },
      },
      {
        label: "ID分隔符",
        prop: "sep",
        valueType: "input",
        tooltip: "重启后生效",
        colProps: {
          span: 11,
          xs: 23,
        },
        fieldProps: {
          placeholder: "可为空",
        },
      },
      {
        label: "链接正则",
        prop: "toQRCode",
        valueType: "input",
        tooltip: "发送url需要备案,匹配url转换二维码",
        fieldProps: {
          placeholder: "请输入正则或为空关闭",
        },
        colProps: {
          span: 23,
          xs: 23,
        },
      },
    ],
  },
  {
    title: "扩展功能",
    columns: [
      {
        label: "按钮回调",
        prop: "toCallback",
        valueType: "switch",
        fieldProps,
        colProps: {
          span: 6,
          xs: 12,
        },
      },
      {
        label: "上传图片",
        prop: "toBotUpload",
        valueType: "switch",
        tooltip: "开启后按下方渠道上传 markdown 图片",
        fieldProps,
        colProps: {
          span: 6,
          xs: 12,
        },
      },
      {
        label: "上传渠道",
        prop: "imageUploadProvider",
        valueType: "radio",
        tooltip: "Bot 为原始方案，也支持 ChatGLM、Ukaka、星野图床",
        options: imageUploadOptions,
        colProps: {
          span: 12,
          xs: 23,
        },
      },
      {
        label: "隐藏频道撤回",
        prop: "hideGuildRecall",
        valueType: "switch",
        fieldProps,
        colProps: {
          span: 6,
          xs: 12,
        },
      },
      {
        label: "真实QQ",
        prop: "toQQUin",
        valueType: "switch",
        tooltip: "配合ws-plugin的绑定",
        fieldProps,
        colProps: {
          span: 6,
          xs: 12,
        },
      },
      {
        label: "转发消息转图",
        prop: "toImg",
        valueType: "switch",
        fieldProps,
        colProps: {
          span: 6,
          xs: 12,
        },
      },
      {
        label: "发送按钮",
        prop: "sendButton",
        valueType: "switch",
        tooltip: "没有自定义按钮权限请关闭此项",
        fieldProps,
        colProps: {
          span: 6,
          xs: 12,
        },
      },
      {
        label: "调用统计",
        prop: "callStats",
        valueType: "switch",
        fieldProps,
        colProps: {
          span: 6,
          xs: 12,
        },
      },
      {
        label: "用户统计",
        prop: "userStats",
        valueType: "switch",
        fieldProps,
        colProps: {
          span: 6,
          xs: 12,
        },
      },
    ],
  },
  {
    title: "高阶功能",
    columns: [
      {
        label: "markdown",
        prop: "markdown",
        tooltip: "是否开启全局md",
        colProps: {
          span: 11,
          xs: 23,
        },
      },
      {
        label: "md模版",
        prop: "customMD",
        colProps: {
          span: 12,
          xs: 23,
        },
      },
      {
        label: "md附加值",
        prop: "mdSuffix",
        colProps: {
          span: 11,
          xs: 23,
        },
      },
      {
        label: "按钮附加值",
        prop: "btnSuffix",
        colProps: {
          span: 12,
          xs: 23,
        },
      },
    ],
  },
  {
    title: "日志相关",
    columns: [
      {
        label: "缩短日志",
        prop: "simplifiedSdkLog",
        valueType: "switch",
        fieldProps,
        tooltip: "缩短sdk的日志",
        width: 500,
        colProps: {
          span: 6,
        },
      },
      {
        label: "过滤日志",
        prop: "filterLog",
        colProps: {
          span: 18,
          xs: 23,
        },
      },
    ],
  },
  {
    title: "sdk相关",
    columns: [
      {
        label: "沙盒模式",
        prop: "bot.sandbox",
        valueType: "switch",
        tooltip: "重启后生效",
        fieldProps,
        colProps: {
          span: 6,
          xs: 23,
        },
      },
      {
        label: "最大重连次数",
        prop: "bot.maxRetry",
        valueType: "input-number",
        tooltip: "为0则无限重连",
        colProps: {
          span: 8,
          xs: 23,
        },
      },
      {
        label: "请求超时时间",
        prop: "bot.timeout",
        valueType: "input-number",
        tooltip: "重启后生效",
        colProps: {
          span: 8,
          xs: 23,
        },
      },
    ],
  },
  {
    title: "核心功能",
    columns: [
      {
        label: "token",
        prop: "token",
        tooltip: "重启后生效",
        colProps: {
          span: 23,
          xs: 23,
        },
      },
    ],
  },
];

const submitLoading = ref(false);
const handleSubmit = (values: FieldValues) => {
  submitLoading.value = true;
  const data = clone(values, true) as any;
  data.token = data.token.map(
    (i) =>
      `${i.uin}:${i.appid}:${i.token}:${i.appSecret}:${i.isGroup}:${i.isPrivate}`
  );
  for (const key in data.btnSuffix) {
    data.btnSuffix[key].values.forEach((i: any) => {
      for (const type of ["input", "callback", "link"]) {
        if (i.type === type) {
          i[type] = i.data;
          delete i.type;
          delete i.data;
          for (const val in i) {
            const v = i[val];
            if ((Array.isArray(v) && !v.length) || !v) {
              delete i[val];
            }
          }
          if (!i.show?.type || !i.show.data) {
            delete i.show;
          }
          break;
        }
      }
    });
  }
  props
    .request("post", `/set-setting-data`, {
      data: { data },
    })
    .then((res) => {
      if (res.success) {
        message("保存成功~ Ciallo～(∠・ω< )⌒☆", {
          customClass: "el",
          type: "success",
        });
      } else {
        message("保存失败: " + res.message, {
          customClass: "el",
          type: "error",
        });
      }
      submitLoading.value = false;
    });
};
const handleSubmitError = (err: any) => {};

const closeTag = (tag: string) => {
  const [key, value] = tag.split(":");
  delete state.value[key][value];
};

const closeTokenTag = (tag: string) => {
  const keys = state.value.token as Array<TokenFormProps["formInline"]>;
  const index = keys.findIndex((item) => item.uin == tag);
  if (index > -1) {
    keys.splice(index, 1);
  }
};

const initData = {
  markdown: {
    uin: "",
    id: "",
  },
  customMD: {
    uin: "",
    id: "",
    keys: [],
  },
  mdSuffix: {
    uin: "",
    val: [],
  },
  btnSuffix: {
    uin: "",
    position: 1,
    values: [],
  },
  filterLog: {
    uin: "",
    val: [],
  },
  token: {
    uin: "",
    token: "",
    appid: "",
    appSecret: "",
    isGroup: 0,
    isPrivate: 0,
  },
};

const getFormInline = (key: string | null, name: string) => {
  const formInline = clone(initData[name], true);
  if (key && state.value[name][key]) {
    switch (name) {
      case "markdown":
        formInline.uin = key;
        formInline.id = state.value.markdown[key];
        break;
      case "customMD":
        formInline.uin = key;
        formInline.id = state.value.customMD[key].custom_template_id;
        formInline.keys = state.value.customMD[key].keys;
        break;
      case "mdSuffix":
        formInline.uin = key;
        formInline.val = state.value.mdSuffix[key];
        break;
      case "btnSuffix":
        formInline.position = state.value.btnSuffix[key].position;
        formInline.values = state.value.btnSuffix[key].values;
        formInline.uin = key;
        break;
      case "filterLog":
        formInline.uin = key;
        formInline.val = state.value.filterLog[key];
        break;
      case "token":
        formInline.uin = state.value.token[key].uin;
        formInline.token = state.value.token[key].token;
        formInline.appid = state.value.token[key].appid;
        formInline.appSecret = state.value.token[key].appSecret;
        formInline.isGroup = state.value.token[key].isGroup;
        formInline.isPrivate = state.value.token[key].isPrivate;
        break;
      default:
        break;
    }
  }
  return formInline;
};

const closeCallBack = ({ options, args }, key: string | null, name: string) => {
  const { formInline } = options.props;
  if (args?.command === "sure") {
    if (name === "token") {
      key = key ?? "-1";
    } else {
      if (!key || key === formInline.uin) {
        key = formInline.uin;
      } else {
        delete state.value[name][key];
        key = formInline.uin;
      }
    }
    switch (name) {
      case "markdown":
        state.value.markdown[key] = formInline.id;
        break;
      case "customMD":
        state.value.customMD[key] = {
          custom_template_id: formInline.id,
          keys: formInline.keys,
        };
        break;
      case "mdSuffix":
        state.value.mdSuffix[key] = formInline.val;
        break;
      case "btnSuffix":
        state.value.btnSuffix[key] = {
          position: formInline.position,
          values: formInline.values,
        };
        break;
      case "filterLog":
        state.value.filterLog[key] = formInline.val;
        break;
      case "token":
        const token = state.value.token as Array<TokenFormProps["formInline"]>;
        if (Number(key) > -1) {
          token[key] = formInline;
        } else {
          token.push(formInline);
        }
        break;
      default:
        break;
    }
  }
};

const formRef = ref();
const showDialog = (title: string, key: string | null, content: any) => {
  addDialog({
    width:
      window.innerWidth < 992
        ? "90%"
        : window.innerWidth <= 1200
          ? "50%"
          : "25%",
    title,
    contentRenderer: () => h(content, { ref: formRef }),
    props: {
      formInline: getFormInline(key, content.__name),
    },
    closeCallBack: ({ options, args }) =>
      closeCallBack({ options, args }, key, content.__name),
    beforeSure: (done, { options, index }) => {
      const FormRef = formRef.value.getRef();
      FormRef.validate((valid: boolean) => {
        if (valid) {
          done();
        }
      });
    },
    draggable: true,
  });
};
</script>

<template>
  <div class="settings-page">
    <div class="settings-glow settings-glow-left" />
    <div class="settings-glow settings-glow-right" />

    <el-row justify="center">
      <el-col :xl="18" :lg="20" :md="22" :sm="24" :xs="24">
        <section class="hero-panel">
          <div class="hero-copy">
            <span class="eyebrow">QQBot Plugin Console</span>
            <h1>设置中心</h1>
            <p>
              面向消息转发、Markdown、统计与图床上传的一体化控制台。
              当前图片上传渠道为
              <strong>{{ activeUploadLabel }}</strong>
              ，你可以在下方快速切换并保存。
            </p>
          </div>
          <div class="hero-badge">
            <span class="hero-badge-label">运行模式</span>
            <strong>{{ state.bot.sandbox ? "Sandbox" : "Production" }}</strong>
          </div>
        </section>

        <section class="stats-grid">
          <article
            v-for="item in dashboardStats"
            :key="item.label"
            class="stat-card"
          >
            <span class="stat-label">{{ item.label }}</span>
            <strong class="stat-value">{{ item.value }}</strong>
            <p class="stat-desc">{{ item.desc }}</p>
          </article>
        </section>

        <section class="form-shell">
          <div class="form-shell__header">
            <div>
              <span class="eyebrow">Visual Control</span>
              <h2>参数配置</h2>
            </div>
            <div class="status-pills">
              <span class="status-pill">
                图片上传 {{ state.toBotUpload ? "已启用" : "已关闭" }}
              </span>
              <span class="status-pill accent">
                {{ activeUploadLabel }}
              </span>
            </div>
          </div>

          <PlusForm
            v-model="state"
            class="settings-form"
            :rules="rules"
            :group="group"
            label-position="right"
            resetText="重置"
            submitText="保存"
            footerAlign="center"
            labelWidth="120px"
            :submitLoading="submitLoading"
            @submit="handleSubmit"
            @submit-error="handleSubmitError"
            @reset="getData"
          >
            <template #plus-field-markdown>
              <div class="tag-field">
                <el-tag
                  v-for="(val, key) in state.markdown"
                  :key="key"
                  class="config-tag cursor-pointer"
                  :closable="key !== 'template'"
                  @close="closeTag('markdown:' + key)"
                  @click="showDialog('修改Markdown模版', String(key), markdown)"
                >
                  {{ key }}
                </el-tag>
                <el-button
                  class="button-new-tag"
                  size="small"
                  @click="showDialog('增加Markdown模版', null, markdown)"
                >
                  新增
                </el-button>
              </div>
            </template>
            <template #plus-field-customMD>
              <div class="tag-field">
                <el-tag
                  v-for="(val, key) in state.customMD"
                  :key="key"
                  class="config-tag cursor-pointer"
                  closable
                  @close="closeTag('customMD:' + key)"
                  @click="showDialog('修改自定义Markdown模版', key, customMD)"
                >
                  {{ key }}
                </el-tag>
                <el-button
                  class="button-new-tag"
                  size="small"
                  @click="showDialog('增加自定义Markdown模版', null, customMD)"
                >
                  新增
                </el-button>
              </div>
            </template>
            <template #plus-field-mdSuffix>
              <div class="tag-field">
                <el-tag
                  v-for="(val, key) in state.mdSuffix"
                  :key="key"
                  class="config-tag cursor-pointer"
                  closable
                  @close="closeTag('mdSuffix:' + key)"
                  @click="showDialog('修改Markdown附加值', key, mdSuffix)"
                >
                  {{ key }}
                </el-tag>
                <el-button
                  class="button-new-tag"
                  size="small"
                  @click="showDialog('增加Markdown附加值', null, mdSuffix)"
                >
                  新增
                </el-button>
              </div>
            </template>
            <template #plus-field-btnSuffix>
              <div class="tag-field">
                <el-tag
                  v-for="(val, key) in state.btnSuffix"
                  :key="key"
                  class="config-tag cursor-pointer"
                  closable
                  @close="closeTag('btnSuffix:' + key)"
                  @click="showDialog('修改按钮附加值', key, btnSuffix)"
                >
                  {{ key }}
                </el-tag>
                <el-button
                  class="button-new-tag"
                  size="small"
                  @click="showDialog('增加按钮附加值', null, btnSuffix)"
                >
                  新增
                </el-button>
              </div>
            </template>
            <template #plus-field-filterLog>
              <div class="tag-field">
                <el-tag
                  v-for="(val, key) in state.filterLog"
                  :key="key"
                  class="config-tag cursor-pointer"
                  closable
                  @close="closeTag('filterLog:' + key)"
                  @click="showDialog('修改过滤日志', key, filterLog)"
                >
                  {{ key }}
                </el-tag>
                <el-button
                  class="button-new-tag"
                  size="small"
                  @click="showDialog('增加过滤日志', null, filterLog)"
                >
                  新增
                </el-button>
              </div>
            </template>
            <template #plus-field-token>
              <div class="tag-field">
                <el-tag
                  v-for="(val, index) in state.token"
                  :key="val.uin"
                  class="config-tag cursor-pointer"
                  closable
                  @close="closeTokenTag(val.uin)"
                  @click="showDialog('修改Token', String(index), token)"
                >
                  {{ val.uin }}
                </el-tag>
                <el-button
                  class="button-new-tag"
                  size="small"
                  @click="showDialog('增加Token', null, token)"
                >
                  新增
                </el-button>
              </div>
            </template>
          </PlusForm>
        </section>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Fira+Code:wght@500;600&family=Fira+Sans:wght@400;500;600;700&display=swap");

:global(body) {
  font-family: "Fira Sans", sans-serif;
}

.settings-page {
  --page-bg: #f3f7fd;
  --panel-bg: rgba(255, 255, 255, 0.68);
  --panel-border: rgba(255, 255, 255, 0.52);
  --panel-shadow: 0 28px 60px rgba(59, 130, 246, 0.12);
  --text-main: #16314f;
  --text-soft: #57718f;
  --line-soft: rgba(109, 146, 191, 0.18);
  --accent-blue: #3b82f6;
  --accent-orange: #f97316;
  min-height: 100%;
  padding: 28px 18px 40px;
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.18), transparent 32%),
    radial-gradient(circle at right 20%, rgba(249, 115, 22, 0.14), transparent 24%),
    linear-gradient(180deg, #f8fbff 0%, var(--page-bg) 100%);
  position: relative;
  overflow: hidden;
}

.settings-glow {
  position: absolute;
  width: 320px;
  height: 320px;
  border-radius: 50%;
  filter: blur(30px);
  opacity: 0.55;
  pointer-events: none;
}

.settings-glow-left {
  top: -120px;
  left: -100px;
  background: rgba(59, 130, 246, 0.18);
}

.settings-glow-right {
  top: 180px;
  right: -120px;
  background: rgba(249, 115, 22, 0.16);
}

.hero-panel,
.form-shell,
.stat-card {
  position: relative;
  border: 1px solid var(--panel-border);
  background: var(--panel-bg);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  box-shadow: var(--panel-shadow);
}

.hero-panel {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 28px 30px;
  border-radius: 28px;
  margin-bottom: 22px;
}

.hero-copy {
  max-width: 680px;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0 14px;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.18);
  color: var(--accent-blue);
  font-family: "Fira Code", monospace;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-copy h1,
.form-shell__header h2 {
  margin: 14px 0 10px;
  color: var(--text-main);
  font-size: clamp(30px, 4vw, 40px);
  line-height: 1.1;
}

.form-shell__header h2 {
  font-size: 24px;
}

.hero-copy p,
.stat-desc {
  margin: 0;
  max-width: 62ch;
  color: var(--text-soft);
  font-size: 15px;
  line-height: 1.7;
}

.hero-badge {
  min-width: 180px;
  align-self: flex-start;
  padding: 18px 20px;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.9), rgba(96, 165, 250, 0.72));
  color: #fff;
  box-shadow: 0 18px 38px rgba(59, 130, 246, 0.24);
}

.hero-badge-label {
  display: block;
  margin-bottom: 8px;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.9;
}

.hero-badge strong {
  font-family: "Fira Code", monospace;
  font-size: 20px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 22px;
}

.stat-card {
  padding: 20px;
  border-radius: 22px;
}

.stat-label {
  display: block;
  margin-bottom: 10px;
  color: var(--text-soft);
  font-size: 13px;
}

.stat-value {
  display: block;
  margin-bottom: 8px;
  color: var(--text-main);
  font-family: "Fira Code", monospace;
  font-size: 24px;
  line-height: 1.2;
}

.form-shell {
  border-radius: 30px;
  padding: 24px;
}

.form-shell__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.status-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.status-pill {
  min-height: 40px;
  padding: 0 14px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(59, 130, 246, 0.12);
  background: rgba(255, 255, 255, 0.72);
  color: var(--text-main);
  font-size: 13px;
}

.status-pill.accent {
  background: rgba(249, 115, 22, 0.1);
  border-color: rgba(249, 115, 22, 0.18);
  color: #b45309;
}

.tag-field {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.config-tag {
  min-height: 34px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid rgba(59, 130, 246, 0.14);
  background: rgba(255, 255, 255, 0.78);
  color: var(--text-main);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.config-tag:hover {
  transform: translateY(-1px);
  border-color: rgba(59, 130, 246, 0.26);
  box-shadow: 0 10px 18px rgba(59, 130, 246, 0.12);
}

.button-new-tag {
  min-height: 36px;
  padding: 0 16px;
  border-radius: 999px;
}

.cursor-pointer {
  cursor: pointer;
}

:deep(.settings-form .plus-form-group) {
  margin-bottom: 18px;
  border-radius: 24px;
  border: 1px solid var(--line-soft);
  background: rgba(255, 255, 255, 0.45);
  padding: 10px 14px 4px;
}

:deep(.settings-form .plus-form-group__title) {
  color: var(--text-main);
  font-weight: 700;
  font-size: 18px;
}

:deep(.settings-form .el-form-item__label) {
  color: var(--text-main);
  font-weight: 600;
}

:deep(.settings-form .el-input__wrapper),
:deep(.settings-form .el-textarea__inner),
:deep(.settings-form .el-input-number),
:deep(.settings-form .el-select__wrapper) {
  border-radius: 16px;
}

:deep(.settings-form .el-switch) {
  min-height: 32px;
}

:deep(.settings-form .plus-form__footer) {
  padding-top: 18px;
}

:deep(.settings-form .plus-form__footer .el-button) {
  min-width: 120px;
  min-height: 44px;
  border-radius: 999px;
}

:deep(.settings-form .plus-form__footer .el-button--primary) {
  background: linear-gradient(135deg, var(--accent-blue), #60a5fa);
  border-color: transparent;
  box-shadow: 0 14px 26px rgba(59, 130, 246, 0.2);
}

:deep(.settings-form .el-radio-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 14px;
}

:deep(.settings-form .el-radio) {
  margin-right: 0;
}

@media (max-width: 1024px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hero-panel,
  .form-shell__header {
    flex-direction: column;
  }
}

@media (max-width: 768px) {
  .settings-page {
    padding: 18px 12px 28px;
  }

  .hero-panel,
  .form-shell {
    padding: 20px 16px;
    border-radius: 24px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .config-tag,
  :deep(.settings-form .plus-form__footer .el-button--primary) {
    transition: none;
  }
}
</style>
