<template>
  <div v-if="uin && activeBot" class="dau-page">
    <div class="dau-glow dau-glow-left" />
    <div class="dau-glow dau-glow-right" />

    <section class="hero-panel">
      <div class="hero-main">
        <div class="bot-profile">
          <el-avatar :size="88" :src="activeBot.avatar" class="bot-avatar" />
          <div class="bot-meta">
            <span class="eyebrow">QQBot Analytics</span>
            <h1>{{ activeBot.nickname || activeBot.uin }}</h1>
            <p>
              聚合展示当前机器人的活跃用户、群聊、消息吞吐与调用分布，
              方便快速定位高频使用场景与活跃趋势。
            </p>
          </div>
        </div>
        <div class="bot-switcher">
          <span class="switcher-label">当前账号</span>
          <el-select
            v-model="uin"
            class="switcher-select"
            placeholder="选择机器人"
            @change="handleSelectChange"
          >
            <el-option
              v-for="item in botOptions"
              :key="item.uin"
              :label="item.uin"
              :value="item.uin"
            />
          </el-select>
        </div>
      </div>
    </section>

    <section class="stats-grid">
      <article
        v-for="(item, index) in chartData"
        :key="item.name || index"
        v-motion
        class="stat-card"
      >
        <el-skeleton :loading="!item.name" animated :rows="2">
          <template #default>
            <div class="stat-card__head">
              <span class="stat-title">{{ item.name }}</span>
              <span class="stat-pill" :class="`tone-${index % 4}`">
                {{ item.total ? "总量" : "实时" }}
              </span>
            </div>
            <div class="stat-card__body">
              <strong class="stat-value">{{ item.value ?? "--" }}</strong>
              <span v-if="item.total !== undefined" class="stat-total">
                / {{ item.total }}
              </span>
            </div>
          </template>
        </el-skeleton>
      </article>
    </section>

    <section class="chart-grid">
      <article v-motion class="chart-panel chart-panel--wide">
        <div class="panel-header">
          <div>
            <span class="eyebrow">Trend View</span>
            <h2>最近活跃趋势</h2>
          </div>
          <el-segmented
            v-model="curWeek"
            :options="[
              { label: '7天', value: 0 },
              { label: '30天', value: 1 }
            ]"
          />
        </div>
        <el-skeleton :loading="!weekChartData.length" animated>
          <template #default>
            <ChartBar
              :userData="weekChartData[curWeek]?.userData"
              :groupData="weekChartData[curWeek]?.groupData"
              :weekData="weekChartData[curWeek]?.weekData"
              :receiveMsgData="weekChartData[curWeek]?.receiveMsgData"
              :sendMsgData="weekChartData[curWeek]?.sendMsgData"
            />
          </template>
          <template #template>
            <el-skeleton-item variant="text" class="skeleton-title" />
            <el-skeleton-item variant="rect" class="skeleton-chart" />
          </template>
        </el-skeleton>
      </article>

      <article v-motion class="chart-panel">
        <div class="panel-header">
          <div>
            <span class="eyebrow">Distribution</span>
            <h2>调用占比</h2>
          </div>
          <span class="panel-hint">按功能聚合统计</span>
        </div>
        <el-skeleton v-if="!callStat.length" animated>
          <template #template>
            <el-skeleton-item variant="text" class="skeleton-title" />
            <el-skeleton-item variant="circle" class="skeleton-pie" />
          </template>
        </el-skeleton>
        <ChartPie v-else :chartData="callStat" />
      </article>
    </section>
  </div>

  <div v-else class="empty-shell">
    <el-result icon="warning" title="没有找到QQBot数据" sub-title="请先确认机器人已连接并产生统计数据" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import ChartBar from "ChartBar.vue";
import ChartPie from "ChartPie.vue";

const props = defineProps({
  request: Function,
});

type StatCard = {
  name?: string;
  value?: number | string;
  total?: number | string;
};

type WeekChart = {
  userData: number[];
  groupData: number[];
  weekData: string[];
  receiveMsgData: number[];
  sendMsgData: number[];
};

type BotInfo = {
  nickname: string;
  uin: string;
  avatar: string;
};

const chartData = ref<StatCard[]>(Array.from({ length: 6 }, () => ({})));
const weekChartData = ref<WeekChart[]>([]);
const callStat = ref([]);
const QQBotMap = ref<Record<string, BotInfo>>({});
const uin = ref<string | null>(null);
const curWeek = ref(0);

const activeBot = computed(() => (uin.value ? QQBotMap.value[uin.value] : null));
const botOptions = computed(() => Object.values(QQBotMap.value));

const getData = () => {
  props
    .request("post", `/get-home-data`, {
      data: {
        uin: uin.value,
      },
    })
    .then((res) => {
      if (!res.success) return;
      QQBotMap.value = res.data.QQBotMap || {};
      uin.value = res.data.uin;
      chartData.value = res.data.chartData || [];
      weekChartData.value = res.data.weekData || [];
      callStat.value = res.data.callStat || [];
    });
};

getData();

const handleSelectChange = () => {
  getData();
};

defineOptions({
  name: "Welcome",
});
</script>

<style scoped>
@import url("https://fonts.googleapis.com/css2?family=Fira+Code:wght@500;600&family=Fira+Sans:wght@400;500;600;700&display=swap");

.dau-page {
  --panel-bg: rgba(255, 255, 255, 0.7);
  --panel-border: rgba(255, 255, 255, 0.52);
  --panel-shadow: 0 30px 60px rgba(59, 130, 246, 0.12);
  --text-main: #18324f;
  --text-soft: #60758f;
  --line-soft: rgba(96, 125, 159, 0.18);
  min-height: 100%;
  padding: 24px 16px 36px;
  position: relative;
  background:
    radial-gradient(circle at top left, rgba(59, 130, 246, 0.16), transparent 26%),
    radial-gradient(circle at 90% 10%, rgba(249, 115, 22, 0.14), transparent 22%),
    linear-gradient(180deg, #f8fbff 0%, #f1f6fc 100%);
  overflow: hidden;
}

.dau-glow {
  position: absolute;
  width: 300px;
  height: 300px;
  border-radius: 50%;
  filter: blur(34px);
  opacity: 0.45;
  pointer-events: none;
}

.dau-glow-left {
  top: -120px;
  left: -100px;
  background: rgba(59, 130, 246, 0.18);
}

.dau-glow-right {
  top: 180px;
  right: -120px;
  background: rgba(249, 115, 22, 0.14);
}

.hero-panel,
.stat-card,
.chart-panel,
.empty-shell {
  position: relative;
  border: 1px solid var(--panel-border);
  background: var(--panel-bg);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  box-shadow: var(--panel-shadow);
}

.hero-panel {
  margin-bottom: 20px;
  padding: 28px;
  border-radius: 28px;
}

.hero-main {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-start;
}

.bot-profile {
  display: flex;
  gap: 18px;
  align-items: center;
}

.bot-avatar {
  border: 3px solid rgba(255, 255, 255, 0.75);
  box-shadow: 0 18px 32px rgba(59, 130, 246, 0.18);
}

.eyebrow {
  display: inline-flex;
  min-height: 30px;
  padding: 0 12px;
  align-items: center;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.18);
  color: #2b6de4;
  font-family: "Fira Code", monospace;
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.bot-meta h1,
.panel-header h2 {
  margin: 14px 0 10px;
  color: var(--text-main);
  font-family: "Fira Sans", sans-serif;
  font-size: clamp(28px, 4vw, 38px);
  line-height: 1.08;
}

.panel-header h2 {
  font-size: 22px;
}

.bot-meta p,
.panel-hint,
.switcher-label,
.stat-title,
.stat-total {
  color: var(--text-soft);
  font-family: "Fira Sans", sans-serif;
}

.bot-meta p {
  margin: 0;
  max-width: 60ch;
  line-height: 1.7;
}

.bot-switcher {
  min-width: 220px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.switcher-label {
  font-size: 13px;
  font-weight: 600;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  padding: 20px;
  border-radius: 22px;
}

.stat-card__head,
.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.stat-title {
  font-size: 14px;
  font-weight: 600;
}

.stat-pill {
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  font-size: 12px;
  font-weight: 600;
}

.tone-0 {
  background: rgba(59, 130, 246, 0.1);
  color: #2563eb;
}

.tone-1 {
  background: rgba(14, 165, 233, 0.1);
  color: #0284c7;
}

.tone-2 {
  background: rgba(249, 115, 22, 0.12);
  color: #c2410c;
}

.tone-3 {
  background: rgba(16, 185, 129, 0.12);
  color: #0f766e;
}

.stat-card__body {
  margin-top: 18px;
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.stat-value {
  font-family: "Fira Code", monospace;
  font-size: 32px;
  color: var(--text-main);
  line-height: 1.1;
}

.chart-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.65fr) minmax(320px, 1fr);
  gap: 18px;
}

.chart-panel {
  padding: 22px;
  border-radius: 26px;
}

.panel-hint {
  font-size: 13px;
}

.skeleton-title {
  width: 140px;
  margin-bottom: 24px;
}

.skeleton-chart {
  width: 100%;
  height: 380px;
  border-radius: 22px;
}

.skeleton-pie {
  width: 280px;
  height: 280px;
  margin: 24px auto 0;
}

.empty-shell {
  padding: 36px;
  border-radius: 28px;
  margin: 24px 16px;
}

:deep(.switcher-select .el-select__wrapper) {
  min-height: 46px;
  border-radius: 16px;
}

:deep(.el-segmented) {
  border-radius: 999px;
  padding: 4px;
  background: rgba(255, 255, 255, 0.7);
}

@media (max-width: 1180px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .chart-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .dau-page {
    padding: 18px 12px 28px;
  }

  .hero-main,
  .bot-profile,
  .panel-header {
    flex-direction: column;
  }

  .hero-panel,
  .chart-panel {
    padding: 18px;
    border-radius: 24px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .bot-switcher {
    width: 100%;
  }
}
</style>
