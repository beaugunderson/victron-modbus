# victron-modbus

SwiftBar plugins that read a Victron Cerbo/Venus GX over Modbus TCP.

## Layout

- `state-of-charge.js` — the menu bar plugin. Symlinked into
  `~/Documents/SwiftBar` as `003-state-of-charge.30s.js`, so it runs every 30s.
- `turn-on-inverter.js` / `turn-off-inverter.js` — one-shot register writes.
- `ssid/` — signed helper bundle that reports the current Wi-Fi SSID. See
  `ssid/README.md`.

## Notes

- The Victron is at `venus.local:502`. Unit IDs: 100 system, 224 solar,
  227 VE.Bus.
- `state-of-charge.js` prints an empty line and exits 0 whenever it should show
  nothing; SwiftBar renders a blank menu bar item for that.
- The SSID allowlist in `state-of-charge.js` gates polling to networks the
  Victron is on. macOS only reveals the SSID to a Location Services-authorized
  signed bundle, which is why `ssid/` exists rather than a shell one-liner.
- Anything invoking a helper from the plugin should use `execFile`, not `exec`,
  so no shell is involved.
