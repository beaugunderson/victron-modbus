#!/Users/beau/.volta/bin/volta run node --node=v22.5.1

const Modbus = require('@glanglois/jsmodbus');
const net = require('net');
const path = require('path');
const { promisify } = require('util');

const { SOLAR_ITEMS, SYSTEM_ITEMS, VE_BUS_ITEMS, decode, title } = require('./registers');

const execFile = promisify(require('child_process').execFile);

function getItems(unitId, items) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const client = new Modbus.client.TCP(socket, unitId);

    const options = {
      'host': 'venus.local',
      'port': 502,
    };

    let received = {};

    socket.on('error', (e) => {
      socket.end();
      reject(e);
    });

    socket.on('connect', async () => {
      try {
        for (const [name, address, type, scale, format] of items) {
          try {
            const response = await client.readHoldingRegisters(address, 1);
            const value = decode(response.response.body.valuesAsArray[0], type, scale);

            received[name] = { value, text: format(value) };
          } catch (e) {
            return reject(e);
          }
        }

        socket.end();

        if (Object.keys(received).length === items.length) {
          return resolve(received);
        } else {
          return reject(new Error(`incorrect number of items received: ${received.length} vs. ${items.length} expected`));
        }
      } catch (e) {
        socket.end();
        return reject(e);
      }
    });

    try {
      socket.connect(options);
    } catch (e) {
      reject(e);
    }
  });
}

function spacer(count) {
  let spacer = '';

  for (let i = 0; i < count; i++) {
    spacer += ' ';
  }

  return spacer;
}

// A signed helper that holds the Location Services grant macOS requires before
// it will report the SSID. See ssid/README.md.
const SSID_BIN = path.resolve(__dirname, 'ssid/ssid.app/Contents/MacOS/ssid');

(async function main() {
  try {
    const ssid = (await execFile(SSID_BIN)).stdout.trim();

    if (ssid !== 'Placebo Syndrome' &&
        ssid !== 'Funkentelechy' &&
        ssid !== 'Panspermia' &&
        ssid !== 'Abiogenesis' &&
        ssid !== 'Sir Nose' &&
        !ssid.startsWith('Winegard')) {
      console.log('');
      process.exit(0);
    }
  } catch (e) {
    console.log('');
    process.exit(0);
  }

  try {
    const results = {
      ...(await getItems(100, SYSTEM_ITEMS)),
      ...(await getItems(224, SOLAR_ITEMS)),
      ...(await getItems(227, VE_BUS_ITEMS)),
    };

    const longest = Math.max(...(Object.keys(results).map(item => item.length))) + 1;

    console.log(`${title(results)} | ansi=true`);

    console.log('---');
    console.log('refresh | refresh=true | font="DejaVuSansMono Nerd Font"');

    for (const key of Object.keys(results)) {
      console.log(`${key}:${spacer(longest - key.length)}${results[key].text} | font="DejaVuSansMono Nerd Font"`);
    }
  } catch (e) {
    console.error(`⚠️ ${e.code}`);
    process.exit(0);
  }
})();
