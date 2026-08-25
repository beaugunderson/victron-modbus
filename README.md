Looks like this:

![screenshot.png](screenshot.png)

## Setup

```sh
yarn install
./ssid/build.sh
./ssid/ssid.app/Contents/MacOS/ssid --authorize   # once, click Allow
```

`ssid.app` is not checked in. Without it `state-of-charge.js` shows nothing,
since it cannot tell whether you are on a network with the Victron. See
[ssid/README.md](ssid/README.md).

Symlink `state-of-charge.js` into your SwiftBar plugin directory as
`003-state-of-charge.30s.js`.

## Tests

`yarn test` runs the register decoding and menu bar formatting tests. Register
types and scale factors come from Victron's
[CCGX Modbus TCP register list](https://www.victronenergy.com/upload/documents/CCGX-Modbus-TCP-register-list-3.73.xlsx).
