<template>
  <div class="status-page">
    <section class="hero-panel">
      <div>
        <span class="eyebrow">Health Check</span>
        <h1>连接状态与健康检查</h1>
        <p>集中查看每个 QQBot 的连接状态、最近心跳、重连次数与最后错误，支持面板内手动重连。</p>
      </div>
      <el-button type="primary" class="refresh-btn" :loading="loading" @click="getData">
        刷新状态
      </el-button>
    </section>

    <section class="summary-grid">
      <article class="summary-card">
        <span>总 Bot 数</span>
        <strong>{{ summary.total }}</strong>
      </article>
      <article class="summary-card ok">
        <span>已连接</span>
        <strong>{{ summary.connected }}</strong>
      </article>
      <article class="summary-card warn">
        <span>重连中</span>
        <strong>{{ summary.reconnecting }}</strong>
      </article>
      <article class="summary-card danger">
        <span>断开/异常</span>
        <strong>{{ summary.disconnected + summary.error }}</strong>
      </article>
    </section>

    <section v-if="bots.length" class="bot-grid">
      <article v-for="bot in bots" :key="bot.uin" class="bot-card">
        <header class="bot-card__header">
          <div class="bot-meta">
            <el-avatar :src="bot.avatar" :size="64" />
            <div>
              <h2>{{ bot.nickname || bot.uin }}</h2>
              <p>{{ bot.uin }}</p>
            </div>
          </div>
          <div class="bot-actions">
            <el-tag :type="statusTagType(bot.status)">{{ bot.statusLabel }}</el-tag>
            <el-button
              size="small"
              :loading="reconnectingUin === bot.uin"
              @click="reconnect(bot.uin)"
            >
              重连
            </el-button>
          </div>
        </header>

        <div class="metrics-grid">
          <div class="metric-item">
            <span>最近心跳</span>
            <strong>{{ formatAgo(bot.lastHeartbeatAt) }}</strong>
          </div>
          <div class="metric-item">
            <span>最近就绪</span>
            <strong>{{ formatTime(bot.lastReadyAt) }}</strong>
          </div>
          <div class="metric-item">
            <span>最近断开</span>
            <strong>{{ formatTime(bot.lastDisconnectAt) }}</strong>
          </div>
          <div class="metric-item">
            <span>重连次数</span>
            <strong>{{ bot.reconnectCount }}</strong>
          </div>
          <div class="metric-item">
            <span>接收消息</span>
            <strong>{{ bot.recvMsgCount }}</strong>
          </div>
          <div class="metric-item">
            <span>群/好友缓存</span>
            <strong>{{ bot.groupCount }} / {{ bot.friendCount }}</strong>
          </div>
        </div>

        <div class="detail-list">
          <div class="detail-row">
            <span>中转站</span>
            <strong>{{ bot.isUsingBus ? "已启用" : "未启用" }}</strong>
          </div>
          <div class="detail-row">
            <span>WS ReadyState</span>
            <strong>{{ formatReadyState(bot.readyState) }}</strong>
          </div>
          <div class="detail-row">
            <span>关闭信息</span>
            <strong>{{ formatClose(bot.closeCode, bot.closeReason) }}</strong>
          </div>
          <div class="detail-row detail-row--full">
            <span>WS 地址</span>
            <code>{{ bot.wsUrl || "--" }}</code>
          </div>
          <div class="detail-row detail-row--full">
            <span>最后错误</span>
            <code>{{ bot.lastError || "--" }}</code>
          </div>
        </div>
      </article>
    </section>

    <div v-else class="empty-shell">
      <el-result icon="warning" title="没有可展示的 QQBot 状态" sub-title="请先连接机器人后再查看状态页" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import message from "@message";

defineOptions({
  name: "status",
});

const props = defineProps({
  request: Function,
});

type StatusBot = {
  uin: string;
  nickname: string;
  avatar: string;
  status: string;
  statusLabel: string;
  startedAt: number | null;
  updatedAt: number | null;
  lastConnectAt: number | null;
  lastReadyAt: number | null;
  lastDisconnectAt: number | null;
  lastHeartbeatAt: number | null;
  heartbeatAge: number | null;
  lastErrorAt: number | null;
  lastError: string;
  reconnectCount: number;
  closeCode: number | null;
  closeReason: string;
  isUsingBus: boolean;
  wsUrl: string;
  readyState: number | null;
  recvMsgCount: number;
  sendMsgCount: number;
  groupCount: number;
  friendCount: number;
};

const bots = ref<StatusBot[]>([]);
const summary = ref({
  total: 0,
  connected: 0,
  reconnecting: 0,
  disconnected: 0,
  error: 0,
});
const loading = ref(false);
const reconnectingUin = ref("");

const getData = () => {
  loading.value = true;
  props
    .request("post", "/get-status-data")
    .then((res) => {
      if (!res.success) return;
      bots.value = res.data.bots || [];
      summary.value = res.data.summary || summary.value;
    })
    .finally(() => {
      loading.value = false;
    });
};

const reconnect = (uin: string) => {
  reconnectingUin.value = uin;
  props
    .request("post", "/reconnect-bot", {
      data: { uin },
    })
    .then((res) => {
      message(res.success ? "重连请求已完成" : `重连失败: ${res.message}`, {
        customClass: "el",
        type: res.success ? "success" : "error",
      });
      if (res.success) {
        getData();
      }
    })
    .finally(() => {
      reconnectingUin.value = "";
    });
};

const statusTagType = (status: string) => {
  switch (status) {
    case "connected":
      return "success";
    case "connecting":
    case "reconnecting":
      return "warning";
    case "error":
      return "danger";
    default:
      return "info";
  }
};

const formatTime = (value: number | null) => {
  if (!value) return "--";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
};

const formatAgo = (value: number | null) => {
  if (!value) return "--";
  const diff = Date.now() - value;
  if (diff < 1000) return "刚刚";
  if (diff < 60000) return `${Math.floor(diff / 1000)} 秒前`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
  return `${Math.floor(diff / 3600000)} 小时前`;
};

const formatReadyState = (state: number | null) => {
  if (state === null || state === undefined) return "--";
  return ["CONNECTING", "OPEN", "CLOSING", "CLOSED"][state] || String(state);
};

const formatClose = (code: number | null, reason: string) => {
  if (code === null && !reason) return "--";
  return `${code ?? "--"} ${reason || ""}`.trim();
};

getData();
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Fira+Code:wght@500&family=Fira+Sans:wght@400;500;600;700&display=swap");

.status-page {
  min-height: 100%;
  padding: 24px 16px 36px;
  background:
    radial-gradient(circle at top left, rgba(16, 185, 129, 0.14), transparent 26%),
    radial-gradient(circle at 90% 10%, rgba(59, 130, 246, 0.12), transparent 24%),
    linear-gradient(180deg, #f7fbff 0%, #eef5fb 100%);
  color: #17324f;
}

.hero-panel,
.summary-card,
.bot-card,
.empty-shell {
  border: 1px solid rgba(255, 255, 255, 0.58);
  background: rgba(255, 255, 255, 0.76);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  box-shadow: 0 28px 60px rgba(23, 50, 79, 0.1);
}

.hero-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  padding: 28px;
  border-radius: 28px;
  margin-bottom: 20px;
}

.hero-panel h1,
.bot-card h2 {
  margin: 6px 0 8px;
  font-family: "Fira Sans", sans-serif;
}

.hero-panel p {
  margin: 0;
  max-width: 720px;
  color: #60758f;
}

.eyebrow {
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: #5f7ca0;
  font-size: 12px;
}

.summary-grid,
.bot-grid,
.metrics-grid,
.detail-list {
  display: grid;
  gap: 16px;
}

.summary-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  margin-bottom: 20px;
}

.summary-card {
  padding: 20px;
  border-radius: 22px;
}

.summary-card span,
.metric-item span,
.detail-row span,
.bot-meta p {
  color: #64809d;
}

.summary-card strong {
  display: block;
  margin-top: 10px;
  font-size: 34px;
  font-family: "Fira Code", monospace;
}

.summary-card.ok strong {
  color: #059669;
}

.summary-card.warn strong {
  color: #d97706;
}

.summary-card.danger strong {
  color: #dc2626;
}

.bot-grid {
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
}

.bot-card {
  padding: 22px;
  border-radius: 26px;
}

.bot-card__header,
.bot-actions,
.bot-meta,
.detail-row {
  display: flex;
  align-items: center;
}

.bot-card__header {
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.bot-meta {
  gap: 14px;
}

.bot-meta p {
  margin: 0;
  font-family: "Fira Code", monospace;
  font-size: 13px;
}

.bot-actions {
  gap: 10px;
}

.metrics-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-bottom: 18px;
}

.metric-item,
.detail-row {
  border-radius: 18px;
  background: rgba(244, 248, 252, 0.9);
  padding: 14px 16px;
}

.metric-item strong,
.detail-row strong,
.detail-row code {
  display: block;
  margin-top: 8px;
  color: #17324f;
  word-break: break-all;
}

.detail-list {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.detail-row {
  display: block;
}

.detail-row--full {
  grid-column: 1 / -1;
}

.detail-row code {
  font-family: "Fira Code", monospace;
  font-size: 12px;
  color: #35506f;
}

.refresh-btn {
  flex-shrink: 0;
}

@media (max-width: 960px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .hero-panel,
  .bot-card__header {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 640px) {
  .summary-grid,
  .metrics-grid,
  .detail-list {
    grid-template-columns: 1fr;
  }
}
</style>
