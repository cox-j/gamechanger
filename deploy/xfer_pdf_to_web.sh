#!/usr/bin/env bash

loc_wd="/home/jcox/workspace2/gamechanger/deploy/build/gamechanger-data/common/data/im/raw";
docker_wd='/opt/app-root/src/common/data/im/raw/';

docker exec -i gc-web sh -c "mkdir -p $docker_wd";

for f in $(ls -a $loc_wd | grep .pdf); do
    docker cp $loc_wd/$f gc-web:$docker_wd/$f;
done
