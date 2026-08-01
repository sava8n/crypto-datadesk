import { useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsInstance } from 'echarts-for-react';

// registers the surface series and grid3D component onto echarts
import 'echarts-gl';

import type { ECharts3DOption, ViewControl } from '../../theme/gl';
import { useChartOption } from './useChartOption';

// A GL chart. grid3D carries the roamed camera, so nothing is replaced and `viewControl`
// is sent once rather than from the option which would overwrite the roamed angles.
export default function EChart3D({
  option,
  viewControl,
}: {
  option: ECharts3DOption;
  viewControl: ViewControl;
}) {
  const { option: shown, hold, release } = useChartOption(option);

  const applyCamera = useCallback(
    (chart: EChartsInstance) => chart.setOption({ grid3D: { viewControl } }),
    [viewControl],
  );

  return (
    <div onPointerEnter={hold} onPointerLeave={release}>
      <ReactECharts
        option={shown}
        lazyUpdate
        onChartReady={applyCamera}
        style={{ width: '100%', height: '100%' }}
        opts={{ renderer: 'canvas' }}
      />
    </div>
  );
}
