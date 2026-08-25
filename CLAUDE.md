# victron-modbus

SwiftBar plugins that read a Victron Cerbo/Venus GX over Modbus TCP.

## Layout

- `state-of-charge.js` — the menu bar plugin. Symlinked into
  `~/Documents/SwiftBar` as `003-state-of-charge.30s.js`, so it runs every 30s.
  Holds the Modbus and SwiftBar I/O only.
- `registers.js` — the register table plus the pure decoding and title
  formatting the plugin renders. `registers.test.js` covers it; `yarn test`.
- `turn-on-inverter.js` / `turn-off-inverter.js` — one-shot register writes.
- `ssid/` — signed helper bundle that reports the current Wi-Fi SSID. See
  `ssid/README.md`.

## Notes

- The Victron is at `venus.local:502`. Unit IDs: 100 system, 224 solar,
  227 VE.Bus.
- Each entry in `registers.js` carries the register's type and scale factor
  straight from Victron's CCGX Modbus TCP register list, and `decode()` is the
  one place that interprets them. Add a register by copying its row from that
  spreadsheet rather than by inferring the units from a reading.
- `int16` registers arrive as a raw 16-bit word, so half the range is negative.
  Getting the threshold or the offset wrong reads a small negative as a small
  positive, or a large negative as a large positive.
- Venus OS reports a flat 864000s time to go once the drain is negligible; the
  menu bar shows `∞` for it.
- The menu bar title colors negative amperage red instead of printing a minus
  sign, which needs `| ansi=true` on that line.
- `state-of-charge.js` prints an empty line and exits 0 whenever it should show
  nothing; SwiftBar renders a blank menu bar item for that.
- The SSID allowlist in `state-of-charge.js` gates polling to networks the
  Victron is on. macOS only reveals the SSID to a Location Services-authorized
  signed bundle, which is why `ssid/` exists rather than a shell one-liner.
- Anything invoking a helper from the plugin should use `execFile`, not `exec`,
  so no shell is involved.
