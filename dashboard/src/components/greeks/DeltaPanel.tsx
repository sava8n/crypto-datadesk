import GreekChart from './GreekChart';

export default function DeltaPanel({ currency }: { currency: string }) {
  return (
    <GreekChart
      greek="delta"
      label="DELTA"
      color="#4aa3ff"
      currency={currency}
      valueFmt={(v) => v.toFixed(3)}
    />
  );
}
