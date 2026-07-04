import GreekChart from './GreekChart';

interface Props {
  currency: string;
  selectedExpiry: string | null;
}

export default function ThetaPanel({ currency, selectedExpiry }: Props) {
  return (
    <GreekChart
      greek="theta"
      label="THETA"
      color="#ff6b6b"
      currency={currency}
      selectedExpiry={selectedExpiry}
      valueFmt={(v) => v.toFixed(2)}
    />
  );
}
