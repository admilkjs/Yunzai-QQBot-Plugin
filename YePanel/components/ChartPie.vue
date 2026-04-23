<script setup lang="ts">
import { type PropType, useDark, useECharts } from "@pureadmin/utils";
import { computed, nextTick, ref, watch } from "vue";

const props = defineProps({
  chartData: {
    type: Array as PropType<{ value: string | number; name: string }[]>,
    required: true,
  },
});

const chartRef = ref();
const { isDark } = useDark();
const theme = computed(() => (isDark.value ? "dark" : "default"));
const textColor = computed(() => (isDark.value ? "#d8e4f5" : "#4b6580"));

const { setOptions } = useECharts(chartRef, { theme });

watch(
  () => [props.chartData, isDark.value],
  async () => {
    await nextTick();
    setOptions({
      color: ["#3B82F6", "#60A5FA", "#F97316", "#14B8A6", "#8B5CF6", "#F59E0B", "#10B981"],
      tooltip: {
        trigger: "item",
        backgroundColor: isDark.value ? "rgba(11,18,32,0.9)" : "rgba(255,255,255,0.96)",
        textStyle: {
          color: textColor.value,
        },
        formatter: "{b}<br/>{c} 次 ({d}%)",
      },
      legend: {
        bottom: 0,
        type: "scroll",
        icon: "circle",
        textStyle: {
          color: textColor.value,
        },
      },
      series: [
        {
          name: "调用统计",
          type: "pie",
          radius: ["32%", "74%"],
          center: ["50%", "45%"],
          roseType: "radius",
          padAngle: 3,
          itemStyle: {
            borderRadius: 14,
            borderColor: isDark.value ? "#0b1220" : "#ffffff",
            borderWidth: 3,
          },
          label: {
            color: textColor.value,
            formatter: params => {
              const match = /^(.+)\((.+)\)$/.exec(params.name);
              if (!match) return params.name;
              return `${match[1]}\n${match[2]}`;
            },
          },
          labelLine: {
            length: 10,
            length2: 10,
            smooth: true,
          },
          emphasis: {
            scale: true,
            scaleSize: 8,
          },
          data: props.chartData,
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
  min-height: 370px;
}

.chart-canvas {
  width: 100%;
  height: 370px;
}

@media (max-width: 768px) {
  .chart-surface,
  .chart-canvas {
    min-height: 320px;
    height: 320px;
  }
}
</style>
