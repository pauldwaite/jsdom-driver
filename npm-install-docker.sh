#!/bin/sh

# Run npm install in a Docker container built from the same base image as our app's Docker container (see app/Dockerfile), and mount our app folder as a volume in that container so that our local package-lock.json file is updated.

# This package-lock.json file is then used in our app's Docker container when we run npm ci (which requires a package-lock.json file that matches the package.json file, and runs more quickly than a regular npm install).

# Doing npm install only in this Docker container should mean the resulting package-lock.json file always works reliably in our app's Docker container. (Well, as reliably as possible, given the limits of npm.)

docker                                         \
  run                                          \
  --rm                                         \
  --tty                                        \
  --volume "$(pwd)/src:/workdir"               \
  --volume             /workdir/node_modules   \
  --workdir            /workdir                \
  node:18-alpine                               \
    /bin/sh -c "npm install --no-optional --loglevel error; npm outdated"
