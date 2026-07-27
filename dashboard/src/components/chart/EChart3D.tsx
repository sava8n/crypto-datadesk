import ReactECharts from 'echarts-for-react';

// registers the surface series and grid3D component onto echarts
import 'echarts-gl';

import type { ECharts3DOption } from '../../theme/gl';

/**
 * A GL chart.
 *
 * Unlike the 2D wrapper this merges rather than replaces: a full replace re-creates
 * grid3D and throws away viewControl, so the user's camera would snap back to the
 * default angle on every refetch.
 */
export default function EChart3D({ option }: { option: ECharts3DOption }) {
  return (
    <ReactECharts
      option={option}
      notMerge={false}
      lazyUpdate
      style={{ width: '100%', height: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
}
