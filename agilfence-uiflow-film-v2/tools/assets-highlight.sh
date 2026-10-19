#!/usr/bin/env bash
# Cut B (highlight) assets, run by build.sh after tools/assets.sh when CUT=highlight: the fence beat uses the AF-01
# fence-bay crop, made (with the lavender scan) by the story cut's asset step. Env: AF_ILLUS, as tools/assets-story.sh.
set -euo pipefail
exec "$(dirname "$0")/assets-story.sh"
