"""Current DVOL level and its rank within the trailing history window."""

from __future__ import annotations


def dvol_stats(candles: list[list[float]]) -> tuple[float | None, float | None]:
    """(DVOL as a decimal, rank of the last close in the window's close range [0, 1])."""
    closes = [float(c[4]) for c in candles if len(c) >= 5]
    if not closes:
        return None, None
    current = closes[-1]
    lo, hi = min(closes), max(closes)
    rank = (current - lo) / (hi - lo) if hi > lo else None
    return current / 100.0, rank
