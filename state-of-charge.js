#!/Users/beau/.nvm/versions/node/v20.3.0/bin/node

const Modbus = require('@glanglois/jsmodbus');
const net = require('net');
const path = require('path');
const { promisify } = require('util');

const exec = promisify(require('child_process').exec);

// const BATTERY_ITEMS = [
//   ['battery voltage', 259, 100],
//   ['battery current', 261, 10],
// ];

function fixUnderflow(value) {
  return value >= 60000 ? value - 65535 : value;
}

const VE_BUS_ITEMS = [
  ['grid voltage', 3, (value) => `${value / 10}V`],
  ['grid current', 6, (value) => `${fixUnderflow(value) / 10}A`],
  ['grid frequency', 9, (value) => `${fixUnderflow(value) / 100}hz`],
  ['grid power', 12, (value) => `${fixUnderflow(value) / 0.1}W`]
];

const SOLAR_ITEMS = [
  ['PV voltage', 776, (value) => `${value / 100}V`],
  ['PV current', 777, (value) => `${value / 10}A`],
  ['PV power', 789, (value) => `${value / 10}W`],
];

const SYSTEM_ITEMS = [
  ['battery voltage', 840, (value) => `${value / 10}V`],
  ['battery current', 841, (value) => (fixUnderflow(value) / 10) + 'A'],
  ['battery power', 842, (value) => fixUnderflow(value) + 'W'],
  ['battery SoC', 843, (value) => `${value}%`],
  ['battery state', 844, (value) => value],
  ['battery consumed', 845, (value) => (value / -10) + 'AH'],
  ['battery time to go', 846, (value) => (value / 0.01 / 60 / 60).toFixed(2) + 'h'],
  ['charger power', 855, (value) => value],
  ['DC system power', 860, (value) => fixUnderflow(value) + 'W'],
  ['grid power', 820, (value) => value + 'W']
  // ['VE.Bus charge current', 865, value => fixUnderflow(value) / 10],
  // ['VE.Bus charge power', 866, fixUnderflow],
];

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
        for (const [name, address, fn] of items) {
          try {
            const response = await client.readHoldingRegisters(address, 1);
            const value = fn(response.response.body.valuesAsArray[0]);

            received[name] = value;
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

const SEPARATOR = '·';

const SSID_SCRIPT = path.resolve(__dirname, 'ssid.sh');

(async function main() {
  try {
    const ssid = (await exec(SSID_SCRIPT)).stdout.trim();

    if (ssid !== 'Funkentelechy' && ssid !== 'Panspermia') {
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

    if (parseInt(results['grid voltage'], 10) > 100) {
      console.log(`⚡ ${results['grid voltage']} ${SEPARATOR} ${results['grid current']} ${SEPARATOR} ${results['grid power']}`);
    } else {
      console.log(`🏕 ${results['battery current']} ${SEPARATOR} ${results['battery SoC']} ${SEPARATOR} ${results['battery time to go']}`);
    }

    console.log('---');
    console.log('refresh | refresh=true | font="DejaVuSansMono Nerd Font"');

    for (const key of Object.keys(results)) {
      console.log(`${key}:${spacer(longest - key.length)}${results[key]} | font="DejaVuSansMono Nerd Font"`);
    }
  } catch (e) {
    console.error(`⚠️ ${e.code}`);
    process.exit(0);
  }
})();
