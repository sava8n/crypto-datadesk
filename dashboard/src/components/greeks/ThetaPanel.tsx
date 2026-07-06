import GreekChart from './GreekChart';

export default function ThetaPanel({ currency }: { currency: string }) {
  return (
    <GreekChart
      greek="theta"
      label="THETA"
      color="#ff6b6b"
      currency={currency}
      valueFmt={(v) => v.toFixed(2)}
    />
  );
}
