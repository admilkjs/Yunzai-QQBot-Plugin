<script setup lang="ts">
import { useDark, useECharts } from "@pureadmin/utils";
import { type PropType, computed, nextTick, ref, watch } from "vue";

const props = defineProps({
  userData: {
    type: Array as PropType<number[]>,
    default: () => [],
  },
  groupData: {
    type: Array as PropType<number[]>,
    default: () => [],
  },
  receiveMsgData: {
    type: Array as PropType<number[]>,
    default: () => [],
  },
  sendMsgData: {
    type: Array as PropType<number[]>,
    default: () => [],
  },
  weekData: {
    type: Array as PropType<string[]>,
    default: () => [],
  },
});

const chartRef = ref();
const { isDark } = useDark();
const theme = computed(() => (isDark.value ? "dark" : "light"));
const textColor = computed(() => (isDark.value ? "#d8e4f5" : "#4b6580"));
const axisLineColor = computed(() =>
  isDark.value ? "rgba(216, 228, 245, 0.18)" : "rgba(75, 101, 128, 0.14)"
);

const { setOptions } = useECharts(chartRef, { theme });

watch(
  () => [
    props.userData,
    props.groupData,
    props.receiveMsgData,
    props.sendMsgData,
    props.weekData,
    isDark.value,
  ],
  async () => {
    await nextTick();
    setOptions({
      color: ["#3B82F6", "#F97316", "#14B8A6", "#8B5CF6"],
      tooltip: {
        trigger: "axis",
        backgroundColor: isDark.value ? "rgba(11,18,32,0.9)" : "rgba(255,255,255,0.96)",
        borderColor: axisLineColor.value,
        textStyle: {
          color: textColor.value,
        },
      },
      legend: {
        bottom: 0,
        icon: "roundRect",
        itemWidth: 12,
        itemHeight: 12,
        textStyle: {
          color: textColor.value,
          fontSize: 12,
        },
        data: ["上行人数", "上行群数", "上行消息", "下行消息"],
      },
      grid: {
        top: 18,
        left: 18,
        right: 18,
        bottom: 56,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: props.weekData,
        axisTick: {
          show: false,
        },
        axisLine: {
          lineStyle: {
            color: axisLineColor.value,
          },
        },
        axisLabel: {
          color: textColor.value,
          fontSize: 12,
        },
      },
      yAxis: [
        {
          type: "value",
          splitLine: {
            lineStyle: {
              color: axisLineColor.value,
              type: "dashed",
            },
          },
          axisLabel: {
            color: textColor.value,
          },
        },
        {
          type: "value",
          position: "right",
          splitLine: {
            show: false,
          },
          axisLabel: {
            color: textColor.value,
          },
        },
      ],
      series: [
        {
          name: "上行人数",
          type: "bar",
          barWidth: 12,
          itemStyle: {
            borderRadius: [10, 10, 0, 0],
          },
          emphasis: {
            focus: "series",
          },
          data: props.userData,
        },
        {
          name: "上行群数",
          type: "bar",
          barWidth: 12,
          itemStyle: {
            borderRadius: [10, 10, 0, 0],
          },
          emphasis: {
            focus: "series",
          },
          data: props.groupData,
        },
        {
          name: "上行消息",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          symbol: "circle",
          symbolSize: 7,
          lineStyle: {
            width: 3,
          },
          areaStyle: {
            opacity: 0.08,
          },
          data: props.receiveMsgData,
        },
        {
          name: "下行消息",
          type: "line",
          yAxisIndex: 1,
          smooth: true,
          symbol: "circle",
          symbolSize: 7,
          lineStyle: {
            width: 3,
          },
          areaStyle: {
            opacity: 0.08,
          },
          data: props.sendMsgData,
        },
      ],
    });
  },
  {
    deep: true,
    immediate: true,
  }
);
</script>

<template>
  <div class="chart-surface">
    <div ref="chartRef" class="chart-canvas" />
  </div>
</template>

<style scoped>
.chart-surface {
  width: 100%;
  min-height: 380px;
}

.chart-canvas {
  width: 100%;
  height: 380px;
}

@media (max-width: 768px) {
  .chart-surface,
  .chart-canvas {
    min-height: 320px;
    height: 320px;
  }
}
</style>
