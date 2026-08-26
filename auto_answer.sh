#!/bin/bash
while true; do
  for target in w1:pA w1:pB; do
    state=$(herdr agent explain "$target" --format text | grep "state:" | awk '{print $2}')
    if [ "$state" = "blocked" ]; then
      echo "[$(date)] $target is blocked, sending '2' and 'enter'..."
      herdr agent send-keys "$target" "2" enter
      sleep 1
      herdr agent send-keys "$target" enter
    fi
  done
  sleep 3
done
