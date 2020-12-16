#!/bin/sh

docker                \
  build               \
  --tag jsdom-driver  \
  .                   \
&&                    \
docker                \
  run                 \
  --rm                \
  --tty               \
  jsdom-driver
