#!/usr/bin/env python3
"""Zip dist-mac/ + packaging/mac/* into CyberLab-Mac/ inside cyberlab-mac.zip.

Unix permissions are stored (create_system=3, external_attr) so macOS Archive
Utility restores the executable bit on "Lancer CyberLab.command".
"""
import os
import sys
import time
import zipfile

root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
build = os.path.join(root, sys.argv[1] if len(sys.argv) > 1 else "dist-mac")
out = os.path.abspath(sys.argv[2] if len(sys.argv) > 2 else os.path.join(root, "release", "cyberlab-mac.zip"))
pkg = os.path.join(root, "packaging", "mac")
top = "CyberLab-Mac"

if not os.path.isfile(os.path.join(build, "index.html")):
    sys.exit(f"missing build: {build}/index.html (run npm run build:mac)")

os.makedirs(os.path.dirname(out), exist_ok=True)
now = time.localtime()[:6]


def add(zf, arcname, data, mode):
    info = zipfile.ZipInfo(arcname, date_time=now)
    info.create_system = 3  # Unix
    info.external_attr = (0o100000 | mode) << 16  # regular file + permissions
    info.compress_type = zipfile.ZIP_DEFLATED
    zf.writestr(info, data)


count = 0
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as zf:
    for name in sorted(os.listdir(pkg)):
        path = os.path.join(pkg, name)
        with open(path, "rb") as f:
            data = f.read()
        if name.endswith(".command"):
            data = data.replace(b"\r\n", b"\n")
            add(zf, f"{top}/{name}", data, 0o755)
        else:
            add(zf, f"{top}/{name}", data, 0o644)
        count += 1
    for dirpath, _, files in os.walk(build):
        for fn in sorted(files):
            if fn == ".DS_Store":
                continue
            full = os.path.join(dirpath, fn)
            rel = os.path.relpath(full, build).replace(os.sep, "/")
            with open(full, "rb") as f:
                add(zf, f"{top}/app/{rel}", f.read(), 0o644)
            count += 1

print(f"wrote {out} ({count} files, {os.path.getsize(out) / 1024:.0f} KB)")
