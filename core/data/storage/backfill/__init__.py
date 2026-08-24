"""One-shot, operator-run backfills over the archive; the service never schedules them.

``derived`` restores the book-derived scalars and CM grid, ``tape`` fetches historical
prints from Deribit's history host, ``gex`` re-signs the gex scalars from the tape.
"""
