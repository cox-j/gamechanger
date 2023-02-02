#!/usr/bin/env bash

./stop.sh
NPM_AUTH_TOKEN=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 ./build.sh
./start.sh
# ./local-ingest_asrs.sh