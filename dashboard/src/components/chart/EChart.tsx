import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';

export default function EChart({ option }: { option: EChartsOption }) {
  return (
    <ReactECharts
      option={option}
      notMerge
      lazyUpdate
      style={{ width: '100%', height: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
}
