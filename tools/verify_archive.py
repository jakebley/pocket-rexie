#!/usr/bin/env python3
"""Verifies an unsigned PocketRexie .xcarchive. Usage: verify_archive.py <archive> <expected-build> [team-less]
Prints every problem and exits 1 if any."""
import glob, os, plistlib, struct, sys, zlib, json

arc, expected_build = sys.argv[1], sys.argv[2]
errors = []
def err(m): errors.append(m); print(f"::error::{m}")
def ok(m): print(f"ok   {m}")

app = os.path.join(arc, "Products/Applications/PocketRexie.app")
targets = {
  "iOS app": (app, "com.pocketrexie.app"),
  "iOS widget": (f"{app}/PlugIns/PocketRexieWidget.appex", "com.pocketrexie.app.widget"),
  "watch app": (f"{app}/Watch/PocketRexieWatch.app", "com.pocketrexie.app.watchkitapp"),
  "watch widget": (f"{app}/Watch/PocketRexieWatch.app/PlugIns/PocketRexieWatchWidget.appex", "com.pocketrexie.app.watchkitapp.widget"),
}
def plist(path):
    with open(path, "rb") as f: return plistlib.load(f)

versions = {}
for name, (path, bid) in targets.items():
    if not os.path.isdir(path):
        err(f"{name} missing from archive: {path.replace(arc, '')}"); continue
    ok(f"{name} present")
    ip = os.path.join(path, "Info.plist")
    if not os.path.exists(ip): err(f"{name}: no Info.plist"); continue
    info = plist(ip)
    if info.get("CFBundleIdentifier") != bid:
        err(f"{name}: bundle id {info.get('CFBundleIdentifier')} != {bid}")
    for k in ("CFBundleShortVersionString", "CFBundleVersion", "CFBundleDisplayName", "CFBundleExecutable"):
        if not info.get(k): err(f"{name}: Info.plist key {k} missing or empty")
    for k in ("CFBundleShortVersionString", "CFBundleVersion"):
        v = str(info.get(k, ""))
        if "$(" in v: err(f"{name}: {k} unresolved ({v})")
    versions[name] = (info.get("CFBundleShortVersionString"), info.get("CFBundleVersion"))
    if info.get("CFBundleDisplayName") != "Pocket Rexie":
        err(f"{name}: CFBundleDisplayName is {info.get('CFBundleDisplayName')!r}, expected 'Pocket Rexie'")
    if str(info.get("CFBundleVersion")) != expected_build:
        err(f"{name}: CFBundleVersion {info.get('CFBundleVersion')} != run build number {expected_build}")
    if not os.path.exists(os.path.join(path, "PrivacyInfo.xcprivacy")):
        err(f"{name}: PrivacyInfo.xcprivacy not in bundle")
    else:
        pm = plist(os.path.join(path, "PrivacyInfo.xcprivacy"))
        if pm.get("NSPrivacyTracking") is not False: err(f"{name}: NSPrivacyTracking must be false")
        if not pm.get("NSPrivacyAccessedAPITypes"): err(f"{name}: privacy manifest declares no accessed API types (UserDefaults)")
    if "appex" in path:
        ext = info.get("NSExtension", {}).get("NSExtensionPointIdentifier")
        if ext != "com.apple.widgetkit-extension": err(f"{name}: extension point {ext}")

if len(set(versions.values())) > 1: err(f"version mismatch across targets: {versions}")
elif versions: ok(f"versions consistent: {list(versions.values())[0]}")

if os.path.isdir(app):
    ai = plist(os.path.join(app, "Info.plist"))
    for k in ("UILaunchScreen", "UISupportedInterfaceOrientations", "ITSAppUsesNonExemptEncryption", "CFBundleURLTypes"):
        if k not in ai: err(f"iOS app Info.plist missing {k}")
    if ai.get("ITSAppUsesNonExemptEncryption") is not False: err("ITSAppUsesNonExemptEncryption must be false")
    if ai.get("MinimumOSVersion") != "17.0": err(f"iOS MinimumOSVersion {ai.get('MinimumOSVersion')} != 17.0")
    if ai.get("DTPlatformName") not in (None, "iphoneos"): err(f"iOS app built for {ai.get('DTPlatformName')}")
    if not ai.get("CFBundleIcons", {}).get("CFBundlePrimaryIcon"): err("iOS app Info.plist has no CFBundleIcons (AppIcon not compiled)")
    wp = os.path.join(app, "Watch/PocketRexieWatch.app/Info.plist")
    if os.path.exists(wp):
        wi = plist(wp)
        if wi.get("WKCompanionAppBundleIdentifier") != "com.pocketrexie.app": err("watch WKCompanionAppBundleIdentifier wrong")
        if wi.get("DTPlatformName") not in (None, "watchos"): err(f"watch app built for {wi.get('DTPlatformName')}")
        if wi.get("MinimumOSVersion") != "10.0": err(f"watch MinimumOSVersion {wi.get('MinimumOSVersion')} != 10.0")

# entitlements: an unsigned archive carries none, so check what Xcode will sign with, per target (Release)
import subprocess, re
for tgt in ("PocketRexie", "PocketRexieWidget", "PocketRexieWatch", "PocketRexieWatchWidget"):
    out = subprocess.run(["xcodebuild", "-project", "PocketRexie.xcodeproj", "-target", tgt, "-configuration", "Release", "-showBuildSettings"],
                         capture_output=True, text=True).stdout
    m = re.search(r"^\s*CODE_SIGN_ENTITLEMENTS = (.+)$", out, re.M)
    if not m: err(f"{tgt}: CODE_SIGN_ENTITLEMENTS not set"); continue
    ep = m.group(1).strip()
    if not os.path.exists(ep): err(f"{tgt}: entitlements file {ep} missing"); continue
    groups = plist(ep).get("com.apple.security.application-groups", [])
    if "group.com.pocketrexie.shared" not in groups: err(f"{tgt}: {ep} lacks App Group group.com.pocketrexie.shared (has {groups})")
    else: ok(f"{tgt}: App Group group.com.pocketrexie.shared in {ep}")
    pid = re.search(r"^\s*PRODUCT_BUNDLE_IDENTIFIER = (.+)$", out, re.M)
    ok(f"{tgt}: bundle id {pid.group(1).strip() if pid else '?'}")

# icons: source catalogs (alpha, size) and compiled Assets.car
def png_info(p):
    d = open(p, "rb").read()
    assert d[:8] == b"\x89PNG\r\n\x1a\n", "not a PNG"
    w, h, bd, ct = struct.unpack(">IIBB", d[16:26])
    return w, h, ct, (b"tRNS" in d)
for cat, plat in (("iOS", "ios"), ("Watch", "watchos")):
    base = f"{cat}/Assets.xcassets/AppIcon.appiconset"
    cj = json.load(open(f"{base}/Contents.json"))
    if not any(i.get("size") == "1024x1024" and "appearances" not in i for i in cj["images"]):
        err(f"{cat} AppIcon has no plain 1024x1024 marketing icon")
    for i in cj["images"]:
        fn = i.get("filename")
        if not fn or not os.path.exists(f"{base}/{fn}"): err(f"{cat} AppIcon: file missing for {i}"); continue
        w, h, ct, trns = png_info(f"{base}/{fn}")
        if (w, h) != (1024, 1024): err(f"{cat} {fn}: {w}x{h}, needs 1024x1024")
        if ct in (4, 6) or trns: err(f"{cat} {fn}: has an alpha channel (App Store rejects it)")
    ok(f"{cat} source icons are 1024 px without alpha ({len(cj['images'])} images)")
for name, path in (("iOS app", app), ("watch app", f"{app}/Watch/PocketRexieWatch.app")):
    if os.path.isdir(path) and not glob.glob(os.path.join(path, "AppIcon*.png")) and not os.path.exists(os.path.join(path, "Assets.car")):
        err(f"{name}: no compiled icons (Assets.car or AppIcon*.png) in bundle")
    elif os.path.isdir(path):
        ok(f"{name}: compiled asset catalog present")
# watch app: iPhone-embedded watch app must not itself embed an iOS-only plist key etc. (checked above)

print()
if errors:
    print(f"{len(errors)} problem(s) found"); sys.exit(1)
print("archive verified")
