import GreekChart from './GreekChart';

interface Props {
  currency: string;
  selectedExpiry: string | null;
}

export default function DeltaPanel({ currency, selectedExpiry }: Props) {
  return (
    <GreekChart
      greek="delta"
      label="DELTA"
      color="#4aa3ff"
      currency={currency}
      selectedExpiry={selectedExpiry}
      valueFmt={(v) => v.toFixed(3)}
    />
  );
}
