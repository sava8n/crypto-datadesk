"""Put ``core/`` on ``sys.path`` so tests import modules whatever the pytest invocation's pwd."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# clean sourced env vars to not interfere with tests
for _k in [k for k in os.environ if k.startswith("DATADESK_SERVICE_")]:
    del os.environ[_k]
