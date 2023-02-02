#!/usr/bin/env bash
set -o nounset
set -o errexit

SCRIPT_DIR="$(cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
REPO_DIR="$(cd -- "${SCRIPT_DIR}/../" &> /dev/null && pwd)"
DEPLOY_CONF="${SCRIPT_DIR}/deploy.conf.sh"

source "$DEPLOY_CONF"

function main() {
  # start up base services
  compose_wrapper up -d -- postgres redis neo4j elasticsearch kibana s3-server

  # wait until base services are up
  compose_wrapper run -- _s3_server_wait_until_ready
  compose_wrapper run -- _redis_wait_until_ready
  compose_wrapper run -- _postgres_wait_until_ready
  compose_wrapper run -- _elasticsearch_wait_until_ready

  # config utils
  compose_wrapper run -- _render_data_pipeline_config

  # config base services
  compose_wrapper run -- _ensure_s3_server_bucket_exists
  compose_wrapper run -- _postgres_config_step_1_setup_web_schema
  compose_wrapper run -- _postgres_config_step_2_setup_data_schema
  compose_wrapper run -- _postgres_config_step_3_setup_um_schema
  compose_wrapper run -- _postgres_config_step_4_seed_app_tables
  compose_wrapper run -- _ensure_and_populate_basic_es_indices
  compose_wrapper run -- _update_primary_clone_config

  # start up remaining services
  compose_wrapper up -d -- web ml-api
  
  # wait until remaining services are up
  compose_wrapper run -- _web_wait_until_ready
  compose_wrapper run -- _ml_api_wait_until_ready
}

main