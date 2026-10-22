#!/usr/bin/env bash
# usage: run_uitests.sh "<device name>" <udid>
# Runs the already built UI tests on one simulator and annotates the outcome.
set +e
name="$1"
udid="$2"
label=$(echo "$name" | tr -c 'A-Za-z0-9\n' '-')
mkdir -p "${RESULTS_DIR:-uitest-results}" /tmp/ui-shots
bundle="${RESULTS_DIR:-uitest-results}/${label}.xcresult"
log="uitest-${label}.log"
rm -rf "$bundle"

xcrun simctl boot "$udid" 2>/dev/null
xcrun simctl bootstatus "$udid" -b >/dev/null 2>&1

set -o pipefail
xcodebuild -project PocketRexie.xcodeproj -scheme PocketRexieUITests \
  -destination "platform=iOS Simulator,id=${udid}" -derivedDataPath build/dd \
  -resultBundlePath "$bundle" \
  CODE_SIGNING_ALLOWED=NO DEVELOPMENT_TEAM= test-without-building 2>&1 | tee "$log" | tail -n 40
status=${PIPESTATUS[0]}
set +o pipefail

summary=$(grep -E "Executed [0-9]+ tests" "$log" | tail -1)
echo "::notice title=uitest ${name}::${summary:-no test summary} (xcodebuild exit ${status})"
python3 .github/scripts/uitest_report.py "$name" "$bundle"
if [ "$status" -ne 0 ]; then
  grep -h -E "error:|Test Case .* failed|XCTAssert" "$log" | sort -u | head -12 | cut -c1-900 \
    | while IFS= read -r line; do echo "::error title=uitest-log ${name}::${line//%/%25}"; done
fi
exit "$status"
