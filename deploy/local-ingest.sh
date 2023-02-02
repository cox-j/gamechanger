#!/usr/bin/env bash
set -o nounset
set -o errexit

SCRIPT_DIR="$(cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
REPO_DIR="$(cd -- "${SCRIPT_DIR}/../" &> /dev/null && pwd)"
DEPLOY_CONF="${SCRIPT_DIR}/deploy.conf.sh"

source "$DEPLOY_CONF"

function main() (
  local bucket_name=${S3_BUCKET_NAME:-advana-data-zone}
  local es_index_name=${ES_INDEX_NAME:-gamechanger_original}
  local es_alias_name=${ES_ALIAS_NAME:-gamechanger}

  local raw_doc_dir=${1}
  local parsed_doc_dir=${2:-}
  local container_raw_doc_dir=/tmp/raw
  local container_parsed_doc_dir=/tmp/parsed

  compose_wrapper run \
    ${bucket_name:+-e S3_BUCKET_NAME=${bucket_name}} \
    ${ES_INDEX_NAME:+-e ES_INDEX_NAME=${ES_INDEX_NAME}} \
    ${ES_ALIAS_NAME:+-e ES_ALIAS_NAME=${ES_ALIAS_NAME}} \
    ${raw_doc_dir:+-v "${raw_doc_dir}:${container_raw_doc_dir}"} \
    ${parsed_doc_dir:+-v "${parsed_doc_dir}:${container_parsed_doc_dir}"} \
    -- _data_pipelines_cmd ./dataPipelines/scripts/local_ingest.sh \
      ${raw_doc_dir:+"${container_raw_doc_dir}"} \
      ${parsed_doc_dir:+"${container_parsed_doc_dir}"}
)

main "$@"