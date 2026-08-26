#!/bin/bash
while true; do
  state=$(herdr agent explain w1:pC --format text | grep "state:" | awk '{print $2}')
  if [ "$state" = "blocked" ]; then
    echo "[$(date)] w1:pC is blocked, sending '2' and 'enter'..."
    herdr agent send-keys w1:pC "2" enter
    sleep 1
    herdr agent send-keys w1:pC enter
  fi
  sleep 3
done
