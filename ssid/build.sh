#!/bin/sh

# Builds ssid.app, the Location Services-authorized SSID reader used by
# state-of-charge.js. Signed with a Developer ID so the TCC grant survives
# rebuilds; an ad-hoc signature would be revoked on every recompile.

set -eu

here="$(cd "$(dirname "$0")" && pwd)"
app="$here/ssid.app"
identity="Developer ID Application: Beau Gunderson (D7UFB67V5Z)"

mkdir -p "$app/Contents/MacOS"

cp "$here/Info.plist" "$app/Contents/Info.plist"

# The Info.plist is embedded in the executable as well as placed in the bundle:
# CoreLocation reads the __info_plist section when the binary is run directly
# rather than launched through LaunchServices.
swiftc -O -o "$app/Contents/MacOS/ssid" "$here/main.swift" \
  -Xlinker -sectcreate -Xlinker __TEXT -Xlinker __info_plist -Xlinker "$here/Info.plist"

# The hardened runtime requires an explicit location entitlement: without it
# locationd refuses to hand the authorization prompt to CoreLocationAgent, and
# the request is denied with no dialog shown.
codesign --force --options runtime --timestamp=none \
  --entitlements "$here/ssid.entitlements" \
  --identifier com.beaugunderson.victron-ssid \
  --sign "$identity" "$app"

echo "built $app"
