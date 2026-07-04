import { useSummary } from '../hooks/useSummary';

function formatSpot(spot?: number): string {
  if (spot == null) return '—';
  return spot.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatAsOf(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
}

function Field({ k, v, amber }: { k: string; v: string; amber?: boolean }) {
  return (
    <div className="field">
      <span className="field__k">{k}</span>
      <span className={`field__v${amber ? ' field__v--amber' : ''}`}>{v}</span>
    </div>
  );
}

export default function Header({ currency }: { currency: string }) {
  const { data, isFetching, isError } = useSummary(currency);
  const status = isError ? 'OFFLINE' : isFetching ? 'SYNC' : 'LIVE';
  const statusClass = isError ? 'tag--err' : isFetching ? 'tag--warn' : 'tag--ok';

  return (
    <header className="header">
      <div className="header__brand">◆ OPTIONS&nbsp;DASHBOARD</div>
      <div className="header__fields">
        <Field k="SYM" v={`${currency}-USD`} />
        <Field k="SPOT" v={`$${formatSpot(data?.spot)}`} amber />
        <Field k="AS OF" v={formatAsOf(data?.as_of)} />
        <Field k="SRC" v="DERIBIT" />
      </div>
      <div className={`tag ${statusClass}`}>
        <span className="tag__dot" />
        {status}
      </div>
    </header>
  );
}
