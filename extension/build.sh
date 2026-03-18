#!/usr/bin/env python3
"""Build Chrome and Firefox extension zips. Run with: python3 build.sh"""
import zipfile, os

os.chdir(os.path.dirname(os.path.abspath(__file__)))

FILES = [
    "background/background.js",
    "content_scripts/checkout_detector.js",
    "content_scripts/item_extractor.js",
    "icons/icon128.png",
    "icons/icon16.png",
    "icons/icon48.png",
    "popup/popup.css",
    "popup/popup.html",
    "popup/popup.js",
    "shared/api_client.js",
    "shared/constants.js",
]

def build(out, manifest_src):
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        z.write(manifest_src, "manifest.json")
        for f in FILES:
            z.write(f, f)
    print(f"  -> {out}")

print("Building Chrome zip...")
build("shoppycat-chrome.zip", "manifest.json")

print("Building Firefox zip...")
build("shoppycat-firefox.zip", "manifest.firefox.json")

print("Done.")
