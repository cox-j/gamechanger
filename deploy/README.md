# GAMECHANGER Docker Compose Module
The set of scripts and configuration in this directory enables users to deploy a single-node and standalone instance of the GAMECHANGER application. Note that our intent with this module is to support proof of concept and demonstration efforts, and does not scale or otherwise accurately reflect the developer, operator, or user experience of GAMECHANGER in production. Use at your own risk.

## System Requirements
1. Software 
    1. Container runtime 
        1. Supported runtimes include [Docker](https://docs.docker.com/get-docker/)
        2. containerd support is currently in development 
    2. Container and Compose CLI 
        1. Supported CLIs include [Docker CLI](https://github.com/docker/cli) and [Docker compose](https://github.com/docker/compose)
        2. Nerdctl support is currently in development 
    3. Bash  
        1. GNU bash version >= 5.1.12 
2. Hardware  
    1. 4+ CPUs 
    2. 8+ GB RAM 
    3. 20+ GB Storage 
    4. 1+ Gbps Network 

## Startup Instructions

0. Join the [dod-advana](https://github.com/orgs/dod-advana) GitHub Organization and become a member of the [GAMECHANGER-GUESTS](https://github.com/orgs/dod-advana/teams/gamechanger-guests) team.
1. Clone the GAMECHANGER repository.
```shell
git clone git@github.com:dod-advana/gamechanger.git
```
2. Change directories to `gamechanger/deploy`
```shell
cd gamechanger/deploy
```
3. Create a [GitHub Personal Access Token (PAT)](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token) and ensure it is saved as an environment variable in your current session called `NPM_AUTH_TOKEN`.
```shell
export NPM_AUTH_TOKEN=TOKEN-GOES-HERE
```
4. Run `pull.sh`. This will retrieve or update the latest GAMECHANGER sub-component git repositories into `deploy/docker-compose/build`.
```shell
./pull.sh
```
5. Run `build.sh`. This will build GAMECHANGER sub-component images.
```shell
./build.sh
```
6. Run start.sh. This will start GAMECHANGER sub-components using Compose.
```shell
./start.sh
```
7. Using a web browser, navigate to your machine's IP address (ie 127.0.0.1) or hostname (ie localhost) on port 8080 or 8443.

## Populating GAMECHANGER data store with local files
[GAMECHANGER crawlers](https://github.com/dod-advana/gamechanger-crawlers) run periodically to retrieve source content. Additional ingest components may be found in the [GAMECHANGERS data](https://github.com/dod-advana/gamechanger-data) project. An image to support ingest operations is built during the `build.sh` script's execution, but crawling is left as an exercise for prospective users.

To demonstrate ingest, you may use the `gamechanger/deploy/local-ingest.sh` script with a directory containing raw files for ingest. 
```shell
./local-ingest.sh /path/to/raw/files 
```  
