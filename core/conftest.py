"""Put ``core/`` on ``sys.path`` so tests import modules regardless of the pytest invocation's pwd."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# the suite runs without a database; test_storage_db.py points at one explicitly
os.environ.setdefault("DATADESK_SERVICE_PERSISTENCE_ENABLED", "false")
