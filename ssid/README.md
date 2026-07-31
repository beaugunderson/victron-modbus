# ssid

Prints the SSID of the Wi-Fi network you are currently joined to, which
`state-of-charge.js` uses to decide whether the Victron is worth polling.

macOS redacts the SSID from every unprivileged API — `ipconfig getsummary`,
`scutil`, `networksetup -getairportnetwork` all return `<redacted>`. The value
is only visible to a caller holding a Location Services grant, and that grant is
only issued to a signed app bundle declaring a location usage string. Hence a
bundle rather than a plain CLI.

## Build

```sh
./build.sh
```

Signs with `Developer ID Application: Beau Gunderson (D7UFB67V5Z)`. TCC keys the
grant to that signing identity, so rebuilds keep it; an ad-hoc signature would
be a new principal on every recompile.

## Authorize

Once, after the first build:

```sh
./ssid.app/Contents/MacOS/ssid --authorize
```

This is the only mode that becomes a foreground app, so a Dock icon appears
while the prompt is up. Click Allow. Ordinary runs read the SSID directly and
exit in ~10ms without an NSApplication.

## Usage

```sh
./ssid.app/Contents/MacOS/ssid            # -> Sir Nose
./ssid.app/Contents/MacOS/ssid --status   # authorization + SSID diagnostics
```

Exit codes: 0 SSID on stdout, 1 Wi-Fi off or unassociated, 2 not authorized,
3 timed out waiting on the prompt.

## Gotchas

The hardened runtime (`--options runtime`) requires an explicit
`com.apple.security.personal-information.location` entitlement. Without it
locationd refuses to hand the prompt to CoreLocationAgent and denies the
request with no dialog shown and no entry in System Settings — it logs
`Client has supported the hardened runtime but doesn't have the entitlement`.

The grant records the bundle's absolute path, so moving or renaming this repo
requires re-running `--authorize`.

A freshly created `CLLocationManager` reports `notDetermined` until it syncs
with locationd. A readable SSID is the reliable proof of authorization, so that
is what the default path checks.
