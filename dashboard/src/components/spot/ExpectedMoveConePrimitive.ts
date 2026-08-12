import type {
  IChartApi,
  IPrimitivePaneRenderer,
  IPrimitivePaneView,
  ISeriesApi,
  ISeriesPrimitive,
  SeriesAttachedParameter,
  SeriesType,
  Time,
} from 'lightweight-charts';

import { CONE_EDGE, CONE_FILL, CONE_LABEL, CONE_MID, MONO } from '../../theme/charts';
import { priceWhole } from '../../utils/format';
import type { ConePoint } from './cone';

type DrawTarget = Parameters<IPrimitivePaneRenderer['draw']>[0];

export interface Cone {
  expiry: string;
  points: ConePoint[];
}

// one cone step in pane coordinates, keeping its source point for the terminal labels;
// a null edge did not resolve or is off-scale
interface Step {
  x: number;
  lo: number | null;
  mid: number | null;
  hi: number | null;
  at: ConePoint;
}

type EdgeOf = (s: Step) => number | null;

const LABEL_GAP = 6;

const quantileLabel = (name: string, price: number | null) =>
  price == null ? name : `${name} ${priceWhole(price)}`;

const sameCone = (a: Cone | null, b: Cone | null): boolean =>
  a === b ||
  (a != null &&
    b != null &&
    a.expiry === b.expiry &&
    a.points.length === b.points.length &&
    a.points.every((p, i) => {
      const q = b.points[i];
      return p.time === q.time && p.lo === q.lo && p.mid === q.mid && p.hi === q.hi;
    }));

/** The implied expected move drawn forward from the last candle to the anchor expiry. */
export class ExpectedMoveConePrimitive implements ISeriesPrimitive<Time> {
  // biome-ignore-start lint/correctness/noUnusedPrivateClassMembers: read via `const { chart, series } = this` in draw()
  private chart: IChartApi | null = null;
  private series: ISeriesApi<SeriesType> | null = null;
  // biome-ignore-end lint/correctness/noUnusedPrivateClassMembers: read in draw()
  private requestUpdate: (() => void) | null = null;
  private cone: Cone | null = null;

  private readonly paneView: IPrimitivePaneView = {
    zOrder: () => 'bottom',
    renderer: (): IPrimitivePaneRenderer => ({
      draw: (target: DrawTarget) => this.draw(target),
    }),
  };

  attached({ chart, series, requestUpdate }: SeriesAttachedParameter<Time>): void {
    this.chart = chart;
    this.series = series;
    this.requestUpdate = requestUpdate;
  }

  detached(): void {
    this.chart = null;
    this.series = null;
    this.requestUpdate = null;
  }

  paneViews(): readonly IPrimitivePaneView[] {
    return [this.paneView];
  }

  // the section rebuilds the cone on every poll, so an unchanged one must not repaint
  setCone(cone: Cone | null): void {
    if (sameCone(this.cone, cone)) return;
    this.cone = cone;
    this.requestUpdate?.();
  }

  private draw(target: DrawTarget): void {
    const { chart, series, cone } = this;
    if (!chart || !series || !cone || cone.points.length < 2) return;

    const timeScale = chart.timeScale();

    // biome-ignore lint/correctness/useHookAtTopLevel: lightweight-charts canvas API, not a React hook
    target.useMediaCoordinateSpace(({ context, mediaSize }) => {
      const y = (price: number | null): number | null =>
        price == null ? null : series.priceToCoordinate(price);

      // a bar the time scale has not been given yet has no x, so its whole step is skipped
      const steps: Step[] = [];
      for (const p of cone.points) {
        const x = timeScale.timeToCoordinate(p.time as Time);
        if (x != null) steps.push({ x, lo: y(p.lo), mid: y(p.mid), hi: y(p.hi), at: p });
      }
      if (steps.length < 2) return;

      const path = (pick: EdgeOf) => {
        const pts = steps.filter((s) => pick(s) != null);
        return pts.length >= 2 ? pts : null;
      };
      const hiPath = path((s) => s.hi);
      const loPath = path((s) => s.lo);
      const midPath = path((s) => s.mid);

      const trace = (pts: Step[], pick: EdgeOf) => {
        pts.forEach((s, i) => {
          const v = pick(s) as number;
          if (i === 0) context.moveTo(s.x, v);
          else context.lineTo(s.x, v);
        });
      };

      // the envelope: down the upper edge and back along the lower one
      if (hiPath && loPath) {
        context.fillStyle = CONE_FILL;
        context.beginPath();
        trace(hiPath, (s) => s.hi);
        for (const s of [...loPath].reverse()) context.lineTo(s.x, s.lo as number);
        context.closePath();
        context.fill();
      }

      const stroke = (pts: Step[] | null, pick: EdgeOf, color: string, dash: number[]) => {
        if (!pts) return;
        context.strokeStyle = color;
        context.lineWidth = 1;
        context.setLineDash(dash);
        context.beginPath();
        trace(pts, pick);
        context.stroke();
      };

      stroke(hiPath, (s) => s.hi, CONE_EDGE, []);
      stroke(loPath, (s) => s.lo, CONE_EDGE, []);
      stroke(midPath, (s) => s.mid, CONE_MID, [2, 3]);

      // the settlement rule, spanning whatever part of the cone resolved
      const last = steps[steps.length - 1];
      const ends = [last.hi, last.mid, last.lo].filter((c): c is number => c != null);
      if (ends.length) {
        context.strokeStyle = CONE_EDGE;
        context.setLineDash([2, 3]);
        context.beginPath();
        context.moveTo(last.x, Math.min(...ends));
        context.lineTo(last.x, Math.max(...ends));
        context.stroke();
      }
      context.setLineDash([]); // restore solid for later bottom-layer primitives

      context.font = `12px ${MONO}`;
      context.fillStyle = CONE_LABEL;

      const texts: [number | null, string][] = [
        [last.hi, quantileLabel('P84', last.at.hi)],
        [last.mid, quantileLabel('P50', last.at.mid)],
        [last.lo, quantileLabel('P16', last.at.lo)],
      ];
      const widest = Math.max(...texts.map(([, t]) => context.measureText(t).width));

      // past the settlement rule, clear of the cone; only a pane with no room left
      // out there flips them back inside, so a scrolled-to-the-edge chart still reads
      const outside = last.x + LABEL_GAP + widest <= mediaSize.width;
      const textX = outside ? last.x + LABEL_GAP : last.x - LABEL_GAP;
      context.textAlign = outside ? 'left' : 'right';
      context.textBaseline = 'middle';

      for (const [c, text] of texts) {
        if (c != null && c >= 0 && c <= mediaSize.height) context.fillText(text, textX, c);
      }
      context.textAlign = 'left'; // canvas state is shared with later primitives
    });
  }
}
