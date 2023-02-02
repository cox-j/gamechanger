#!/usr/bin/env bash
set -o nounset
set -o errexit

SCRIPT_DIR="$(cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
REPO_DIR="$(cd -- "${SCRIPT_DIR}/../" &> /dev/null && pwd)"
DEPLOY_CONF="${SCRIPT_DIR}/deploy.conf.sh"

source "$DEPLOY_CONF"

function main() (
  # shut down everything
  compose_wrapper down "$@"

  >&2 echo "[INFO] Shutdown finished."
)

main "$@"