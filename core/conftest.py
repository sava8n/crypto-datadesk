"""Put ``core/`` on ``sys.path`` so tests import modules whatever the pytest invocation's pwd."""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
