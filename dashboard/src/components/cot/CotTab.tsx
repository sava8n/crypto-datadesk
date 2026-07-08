import { useState } from 'react';

import type { CotMethod, CotWindow } from '../../api/client';
import CotControls from './CotControls';
import CotFlowSection from './CotFlowSection';
import CotIndexSection from './CotIndexSection';
import CotNetHistorySection from './CotNetHistorySection';
import CotReportSection from './CotReportSection';

export default function CotTab() {
  const [window, setWindow] = useState<CotWindow>(52);
  const [method, setMethod] = useState<CotMethod>('rank');
  const [flowWeeks, setFlowWeeks] = useState(12);

  return (
    <>
      <CotControls
        window={window}
        method={method}
        flowWeeks={flowWeeks}
        onWindow={setWindow}
        onMethod={setMethod}
        onFlowWeeks={setFlowWeeks}
      />
      <CotReportSection window={window} method={method} />
      <div className="panels">
        <CotFlowSection weeks={flowWeeks} />
        <CotIndexSection window={window} method={method} />
      </div>
      <CotNetHistorySection />
    </>
  );
}
