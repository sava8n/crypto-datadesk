import type {
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesApi,
  ISeriesPrimitive,
  SeriesAttachedParameter,
  SeriesType,
  Time,
} from 'lightweight-charts';

import { MONO } from '../../theme/charts';
import { priceWhole } from '../../utils/format';
import type { QuantileBand } from './levels';

const BAND_FILL = 'rgba(200, 208, 208, 0.10)';
const EDGE_LINE = 'rgba(200, 208, 208, 0.5)';
const MID_LINE = 'rgba(200, 208, 208, 0.7)';
const LABEL = 'rgba(200, 208, 208, 0.9)';
// an edge quantile the chain could not resolve: open the band to the pane edge
const OPEN_LINE = 'rgba(200, 208, 208, 0.25)';
const OPEN_LABEL = 'rgba(200, 208, 208, 0.55)';
const LABEL_OFFSET_X = 8;

type DrawTarget = Parameters<IPrimitivePaneRenderer['draw']>[0];

export class QuantileBandPrimitive implements ISeriesPrimitive<Time> {
  private series: ISeriesApi<SeriesType> | null = null;
  private requestUpdate: (() => void) | null = null;
  private band: QuantileBand | null = null;

  private readonly paneView: IPrimitivePaneView = {
    zOrder: () => 'bottom',
    renderer: (): IPrimitivePaneRenderer => ({
      draw: (target: DrawTarget) => this.draw(target),
    }),
  };

  attached({ series, requestUpdate }: SeriesAttachedParameter<Time>): void {
    this.series = series;
    this.requestUpdate = requestUpdate;
  }

  detached(): void {
    this.series = null;
    this.requestUpdate = null;
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return [this.paneView];
  }

  setBand(band: QuantileBand | null): void {
    this.band = band;
    this.requestUpdate?.();
  }

  private draw(target: DrawTarget): void {
    const { series, band } = this;
    if (!series || !band) return;
    target.useMediaCoordinateSpace(({ context, mediaSize }) => {
      const { width, height } = mediaSize;
      const yOf = (p: number | null) => (p == null ? null : series.priceToCoordinate(p));
      const y16 = yOf(band.p16);
      const y50 = yOf(band.p50);
      const y84 = yOf(band.p84);

      // the band is only meaningful once at least one quantile resolves
      if (y16 == null && y50 == null && y84 == null) return;

      const top = y84 != null ? y84 : 0;
      const bottom = y16 != null ? y16 : height;
      const fillTop = Math.max(Math.min(top, bottom), 0);
      const fillBottom = Math.min(Math.max(top, bottom), height);
      if (fillBottom > fillTop) {
        context.fillStyle = BAND_FILL;
        context.fillRect(0, fillTop, width, fillBottom - fillTop);
      }

      context.font = `10px ${MONO}`;
      const mark = (
        y: number | null,
        price: number | null,
        name: string,
        stroke: string,
        dash: number[],
        labelBelow: boolean,
      ) => {
        if (y == null || price == null || y < 0 || y > height) return;
        context.strokeStyle = stroke;
        context.lineWidth = 1;
        context.setLineDash(dash);
        context.beginPath();
        context.moveTo(0, y);
        context.lineTo(width, y);
        context.stroke();
        context.fillStyle = LABEL;
        context.textBaseline = labelBelow ? 'top' : 'bottom';
        context.fillText(`${name} ${priceWhole(price)}`, LABEL_OFFSET_X, labelBelow ? y + 3 : y - 3);
      };

      // a missing edge: a faint dashed rule at the pane edge, flagged 'n/a'
      const markOpen = (edgeY: number, name: string, labelBelow: boolean) => {
        context.strokeStyle = OPEN_LINE;
        context.lineWidth = 1;
        context.setLineDash([2, 3]);
        context.beginPath();
        context.moveTo(0, edgeY);
        context.lineTo(width, edgeY);
        context.stroke();
        context.fillStyle = OPEN_LABEL;
        context.textBaseline = labelBelow ? 'top' : 'bottom';
        context.fillText(`${name} n/a`, LABEL_OFFSET_X, labelBelow ? edgeY + 3 : edgeY - 3);
      };

      if (y84 != null) mark(y84, band.p84, 'P84', EDGE_LINE, [], true);
      else markOpen(1, 'P84', true);
      mark(y50, band.p50, 'P50', MID_LINE, [2, 3], false);
      if (y16 != null) mark(y16, band.p16, 'P16', EDGE_LINE, [], false);
      else markOpen(height - 1, 'P16', false);

      context.setLineDash([]); // restore solid for later bottom-layer primitives
    });
  }
}
