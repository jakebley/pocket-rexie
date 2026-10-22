#!/usr/bin/env python3
"""Turn an .xcresult from the UI test run into ::notice:: / ::error:: annotations.

usage: uitest_report.py <label> <path.xcresult>
Exits 0 always; the caller decides pass/fail from xcodebuild's own status.
"""
import json
import subprocess
import sys

label, bundle = sys.argv[1], sys.argv[2]


def esc(text):
    return text.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")[:900]


try:
    raw = subprocess.run(
        ["xcrun", "xcresulttool", "get", "test-results", "tests", "--path", bundle],
        capture_output=True, text=True, check=True).stdout
    tree = json.loads(raw)
except Exception as exc:  # noqa: BLE001
    print(f"::warning title=uitest {label}::could not read {bundle}: {esc(str(exc))}")
    sys.exit(0)

counts = {"Passed": 0, "Failed": 0, "Skipped": 0}
failures = []


def walk(node, case=None):
    kind = node.get("nodeType")
    if kind == "Test Case":
        result = node.get("result", "")
        if result in counts:
            counts[result] += 1
        case = node.get("name", case)
    if kind == "Failure Message":
        failures.append((case or "?", node.get("name", "")))
    for child in node.get("children", []) or []:
        walk(child, case)


for root in tree.get("testNodes", []):
    walk(root)

total = sum(counts.values())
print(f"::notice title=uitest {label}::{counts['Passed']}/{total} passed, "
      f"{counts['Failed']} failed, {counts['Skipped']} skipped")
for case, message in failures[:15]:
    print(f"::error title=uitest {label}::{esc(case + ': ' + message)}")
