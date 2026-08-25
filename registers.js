// Register types and scale factors come from Victron's CCGX Modbus TCP
// register list, v3.73:
// https://www.victronenergy.com/upload/documents/CCGX-Modbus-TCP-register-list-3.73.xlsx

const INT16 = 'int16';
const UINT16 = 'uint16';

// A register arrives as a raw 16-bit word. int16 registers carry their sign in
// the top half of that range, and every register is scaled by a fixed factor.
function decode(raw, type, scale) {
  const signed = type === INT16 && raw >= 0x8000 ? raw - 0x10000 : raw;

  return signed / scale;
}

// Venus OS reports a flat 864000 seconds, rather than an estimate, once the
// drain is small enough that the runtime is effectively indefinite.
const TIME_TO_GO_CEILING = 864000;

function timeToGo(seconds) {
  return seconds >= TIME_TO_GO_CEILING ? '∞' : `${(seconds / 60 / 60).toFixed(2)}h`;
}

// [name, address, type, scale, format]
const VE_BUS_ITEMS = [
  ['grid voltage', 3, UINT16, 10, (value) => `${value}V`],
  ['grid current', 6, INT16, 10, (value) => `${value}A`],
  ['grid frequency', 9, INT16, 100, (value) => `${value}hz`],
  ['grid power', 12, INT16, 0.1, (value) => `${value}W`],
];

const SOLAR_ITEMS = [
  ['PV voltage', 776, UINT16, 100, (value) => `${value}V`],
  ['PV current', 777, INT16, 10, (value) => `${value}A`],
  ['PV power', 789, UINT16, 10, (value) => `${value}W`],
];

const SYSTEM_ITEMS = [
  ['battery voltage', 840, UINT16, 10, (value) => `${value}V`],
  ['battery current', 841, INT16, 10, (value) => `${value}A`],
  ['battery power', 842, INT16, 1, (value) => `${value}W`],
  ['battery SoC', 843, UINT16, 1, (value) => `${value}%`],
  ['battery state', 844, UINT16, 1, (value) => `${value}`],
  ['battery consumed', 845, UINT16, -10, (value) => `${value}AH`],
  ['battery time to go', 846, UINT16, 0.01, timeToGo],
  ['charger power', 855, UINT16, 1, (value) => `${value}W`],
  ['DC system power', 860, INT16, 1, (value) => `${value}W`],
];

const SEPARATOR = '·';

const RED = '\u001b[31m';
const RESET = '\u001b[0m';

// Amperage carries its sign as color rather than as a minus sign.
function amperage(value) {
  return value < 0 ? `${RED}${Math.abs(value)}A${RESET}` : `${value}A`;
}

// `results` maps an item name to its decoded `value` and formatted `text`.
function title(results) {
  const value = (name) => results[name].value;
  const text = (name) => results[name].text;

  if (value('grid voltage') > 100) {
    const segments = [text('grid voltage'), amperage(value('grid current')), text('grid power')];

    return `⚡ ${segments.join(` ${SEPARATOR} `)}`;
  }

  const current = value('battery current');
  const segments = [amperage(current), text('battery SoC')];

  // Time to go only means something while the battery is draining, and Venus OS
  // reports 0 seconds rather than an estimate while it is charging.
  if (current < 0 && value('battery time to go') > 0) {
    segments.push(text('battery time to go'));
  }

  return `🏕 ${segments.join(` ${SEPARATOR} `)}`;
}

module.exports = {
  INT16,
  SOLAR_ITEMS,
  SYSTEM_ITEMS,
  UINT16,
  VE_BUS_ITEMS,
  amperage,
  decode,
  title,
};
