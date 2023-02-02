#!/usr/bin/env bash
set -o nounset
set -o errexit

SCRIPT_DIR="$(cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
REPO_DIR="$(cd -- "${SCRIPT_DIR}/../" &> /dev/null && pwd)"
DEPLOY_CONF="${SCRIPT_DIR}/deploy.conf.sh"

# make sure token is passed explicitly
export NPM_AUTH_TOKEN="${NPM_AUTH_TOKEN}"

source "$DEPLOY_CONF"

function main() (
  compose_wrapper build
)

main