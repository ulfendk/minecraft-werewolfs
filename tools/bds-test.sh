#!/usr/bin/env bash
# Smoke test: load the packs into a Bedrock Dedicated Server (Docker), summon
# werewolves by day and by night, and fail if they don't change form or the
# content log reports errors.
# Usage: tools/bds-test.sh   (run `npm run build` first)
set -euo pipefail

cd "$(dirname "$0")/.."
NAME=werewolf-bds-test
DATA="$PWD/build/bds"
LEVEL=werewolf_test
IMAGE=${BDS_IMAGE:-itzg/minecraft-bedrock-server:latest}
TIMEOUT=${BDS_TIMEOUT:-600}

uuid() { node -e "console.log(require('./build/$1/manifest.json').header.uuid)"; }
version() { node -e "console.log(JSON.stringify(require('./build/$1/manifest.json').header.version))"; }

docker rm -f "$NAME" >/dev/null 2>&1 || true
rm -rf "$DATA"
mkdir -p "$DATA/behavior_packs" "$DATA/resource_packs" "$DATA/worlds/$LEVEL"
cp -R build/behavior_pack "$DATA/behavior_packs/werewolf_bp"
cp -R build/resource_pack "$DATA/resource_packs/werewolf_rp"
echo "[{\"pack_id\":\"$(uuid behavior_pack)\",\"version\":$(version behavior_pack)}]" > "$DATA/worlds/$LEVEL/world_behavior_packs.json"
echo "[{\"pack_id\":\"$(uuid resource_pack)\",\"version\":$(version resource_pack)}]" > "$DATA/worlds/$LEVEL/world_resource_packs.json"

docker run -d --name "$NAME" --cap-add SYS_PTRACE \
  -e EULA=TRUE \
  -e LEVEL_NAME="$LEVEL" \
  -e LEVEL_TYPE=FLAT \
  -e GAMEMODE=creative \
  -e CONTENT_LOG_FILE_ENABLED=true \
  -e CONTENT_LOG_CONSOLE_OUTPUT_ENABLED=true \
  -e CONTENT_LOG_LEVEL=info \
  -v "$DATA:/data" \
  "$IMAGE" >/dev/null

cleanup() { docker rm -f "$NAME" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "Waiting for server (timeout ${TIMEOUT}s)..."
start=$(date +%s)
until docker logs "$NAME" 2>&1 | grep -q "Server started"; do
  if ! docker ps -q -f name="$NAME" | grep -q .; then
    docker logs "$NAME" 2>&1 | tail -50
    echo "Server container exited early"; exit 1
  fi
  if (( $(date +%s) - start > TIMEOUT )); then
    docker logs "$NAME" 2>&1 | tail -50
    echo "Timed out waiting for server"; exit 1
  fi
  sleep 5
done

send() { docker exec -u 0 "$NAME" send-command "$@"; }
send tickingarea add circle 0 0 0 3 werewolf_test true
send gamerule dodaylightcycle false
send time set noon
sleep 5
for i in 0 1 2; do send summon werewolf:werewolf $((i * 4)) -60 2; done
sleep 5
send scriptevent werewolf:selftest wolf
send time set midnight
sleep 10
send scriptevent werewolf:selftest beast
send time set noon
sleep 10
send scriptevent werewolf:selftest wolf
sleep 3

LOG=$(docker logs "$NAME" 2>&1)
echo "$LOG" | grep -iE "werewol|error|warn|\[Scripting\]" | grep -vE "send-command|^\s*$" | tail -100 || true

if ! echo "$LOG" | grep -q "\[Werewolves\] loaded"; then
  echo "FAIL: add-on script did not report loading"; exit 1
fi
passes=$(echo "$LOG" | grep -c "selftest PASS" || true)
if echo "$LOG" | grep -q "selftest FAIL" || [ "$passes" -lt 3 ]; then
  echo "FAIL: werewolves did not change form with the time of day ($passes of 3 checks passed)"; exit 1
fi
if echo "$LOG" | grep -E "ERROR|\[error\]|Error\]" | grep -viE "Failed to connect|network|telemetry" | grep -q .; then
  echo "FAIL: content log has errors"; exit 1
fi
echo "PASS: Bedrock Dedicated Server loaded the packs without errors"
