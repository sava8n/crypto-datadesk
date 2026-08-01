// echarts-gl ships no types. These cover only what the IV surface uses and are kept
// narrow on purpose, so a misspelled key is still an error rather than `any`.

import type { EChartsOption, TooltipComponentOption, VisualMapComponentOption } from 'echarts';

interface LineStyle {
  lineStyle: { color: string };
}

export interface Axis3DOption {
  type: 'value';
  name: string;
  nameGap: number;
  nameTextStyle: { color: string; fontFamily: string; fontSize: number };
  min?: number;
  max?: number;
  axisLabel: {
    color: string;
    fontFamily: string;
    fontSize: number;
    formatter: (v: number) => string;
  };
}

/** the camera; roaming writes the user's angles back into it */
export interface ViewControl {
  alpha: number;
  beta: number;
  distance: number;
  autoRotate: boolean;
}

// no viewControl: it is applied once by the wrapper, see EChart3D
export interface Grid3DOption {
  boxWidth: number;
  boxDepth: number;
  boxHeight: number;
  environment: string;
  axisLine: LineStyle;
  axisTick: LineStyle;
  splitLine: LineStyle;
  axisPointer: { show: boolean; lineStyle: { color: string } };
  light: {
    main: { intensity: number; shadow: boolean; alpha: number; beta: number };
    ambient: { intensity: number };
  };
}

export interface Surface3DSeriesOption {
  type: 'surface';
  /** lambert = diffuse lighting, so slopes get depth shading */
  shading: 'color' | 'lambert' | 'realistic';
  wireframe: { show: boolean };
  /** flat list of [x, y, z] over the mesh */
  data: number[][];
}

export type ECharts3DOption = Omit<EChartsOption, 'series' | 'xAxis' | 'yAxis'> & {
  backgroundColor: string;
  tooltip: TooltipComponentOption;
  visualMap: VisualMapComponentOption;
  xAxis3D: Axis3DOption;
  yAxis3D: Axis3DOption;
  zAxis3D: Axis3DOption;
  grid3D: Grid3DOption;
  series: Surface3DSeriesOption[];
};
