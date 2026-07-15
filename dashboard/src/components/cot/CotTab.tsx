import CotControls from './CotControls';
import CotFlowSection from './CotFlowSection';
import CotIndexSection from './CotIndexSection';
import CotNetHistorySection from './CotNetHistorySection';
import CotReportSection from './CotReportSection';
import { useCotControls } from './useCotControls';

export default function CotTab({ currency }: { currency: string }) {
  const [{ window, method, flowWeeks }, setControls] = useCotControls();

  return (
    <>
      <CotControls
        window={window}
        method={method}
        flowWeeks={flowWeeks}
        onWindow={(window) => setControls((s) => ({ ...s, window }))}
        onMethod={(method) => setControls((s) => ({ ...s, method }))}
        onFlowWeeks={(flowWeeks) => setControls((s) => ({ ...s, flowWeeks }))}
      />
      <CotReportSection currency={currency} window={window} method={method} />
      <div className="panels">
        <CotFlowSection currency={currency} weeks={flowWeeks} />
        <CotIndexSection currency={currency} window={window} method={method} />
      </div>
      <CotNetHistorySection currency={currency} />
    </>
  );
}
