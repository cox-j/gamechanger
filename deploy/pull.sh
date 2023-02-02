#!/usr/bin/env bash
set -o nounset
set -o errexit

SCRIPT_DIR="$(cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
REPO_DIR="$(cd -- "${SCRIPT_DIR}/../" &> /dev/null && pwd)"
DEPLOY_CONF="${SCRIPT_DIR}/deploy.conf.sh"

source "$DEPLOY_CONF"

# <OPT> PULL_MODE
#   replace - repo directory is completely replaced
#   refresh - ensures repo dir exists and is up to date
PULL_MODE="${PULL_MODE:-refresh}"

function setup_repo() (
  local repo_name="$1"
  local repo_dir="${REPO_DIR_MAP[$repo_name]}"
  local repo_url="${REPO_URL_MAP[$repo_name]}"
  local repo_tag="${REPO_TAG_MAP[$repo_name]}"
  
  echo "[INFO] Setting up dir for repo: ${repo_name}@${repo_tag} - ${repo_dir} ..." 

  [[ -d "$repo_dir" ]] || git clone "$repo_url" "$repo_dir"
  
  cd "$repo_dir"
  git checkout "$repo_tag"
  git pull

  echo -e "---\n"
)


function main() (
  local repo

  [[ -d "$DEPLOY_BUILD_DIR" ]] || mkdir -p "$DEPLOY_BUILD_DIR"

  echo ">>>>>>>> PULL MODE IS $PULL_MODE"

  for repo in ${REPO_NAMES[@]}; do
    case "$PULL_MODE" in
      replace)
        rm -rf "${REPO_DIR_MAP[$repo]}"
        setup_repo "$repo"
        ;;
      refresh)
        setup_repo "$repo"
        ;;
      *)
        >&2 echo "[ERROR] Invalid PULL_MODE specified: ${PULL_MODE}"
        exit 1
        ;;
    esac
  done
)

main