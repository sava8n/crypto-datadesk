import type { UseQueryResult } from '@tanstack/react-query';
import type { IVCurvesResponse, IVSurfaceResponse } from '../types';
import Header from './Header';
import StatusBar from './StatusBar';
import IVSurfacePanel from './iv/IVSurfacePanel';
import IVCurvesPanel from './iv/IVCurvesPanel';
import GreeksSection from './greeks/GreeksSection';

interface Props {
  currency: string;
  IVSurfaceQuery: UseQueryResult<IVSurfaceResponse, Error>;
  IVCurvesQuery: UseQueryResult<IVCurvesResponse, Error>;
}

export default function Dashboard({ currency, IVSurfaceQuery, IVCurvesQuery }: Props) {
  const { data, isLoading, isError, error, isFetching, dataUpdatedAt } = IVSurfaceQuery;
  const points = data?.points.length ?? 0;

  const curves = IVCurvesQuery.data;
  const curvePoints = curves?.points.length ?? 0;

  return (
    <div className="dashboard">
      <Header currency={currency} data={data} isFetching={isFetching} isError={isError} />

      <GreeksSection currency={currency} />

      <div className="panels">
        <main className="panel">
          <div className="panel__title">
            <span className="panel__title-main">IMPLIED VOLATILITY SURFACE</span>
            <span className="panel__title-sub">3D · DELTA × EXPIRY × IV · SOURCE DERIBIT</span>
          </div>
          <div className="panel__body">
            {isLoading && <div className="panel__msg">LOADING SURFACE…</div>}
            {isError && (
              <div className="panel__msg panel__msg--err">
                ERR · {error?.message ?? 'REQUEST FAILED'}
              </div>
            )}
            {!isLoading && !isError && data && points < 4 && (
              <div className="panel__msg panel__msg--warn">
                INSUFFICIENT DATA · {points} PTS
              </div>
            )}
            {!isLoading && !isError && data && points >= 4 && <IVSurfacePanel data={data} />}
          </div>
        </main>

        <section className="panel">
          <div className="panel__title">
            <span className="panel__title-main">IMPLIED VOLATILITY CURVES</span>
            <span className="panel__title-sub">2D · STRIKE × IV · PER EXPIRY · SOURCE DERIBIT</span>
          </div>
          <div className="panel__body">
            {IVCurvesQuery.isLoading && <div className="panel__msg">LOADING CURVES…</div>}
            {IVCurvesQuery.isError && (
              <div className="panel__msg panel__msg--err">
                ERR · {IVCurvesQuery.error?.message ?? 'REQUEST FAILED'}
              </div>
            )}
            {!IVCurvesQuery.isLoading && !IVCurvesQuery.isError && curves && curvePoints < 4 && (
              <div className="panel__msg panel__msg--warn">
                INSUFFICIENT DATA · {curvePoints} PTS
              </div>
            )}
            {!IVCurvesQuery.isLoading && !IVCurvesQuery.isError && curves && curvePoints >= 4 && (
              <IVCurvesPanel data={curves} />
            )}
          </div>
        </section>
      </div>

      <StatusBar
        data={data}
        isFetching={isFetching}
        isError={isError}
        dataUpdatedAt={dataUpdatedAt}
      />
    </div>
  );
}
