const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const {
  INT16,
  SOLAR_ITEMS,
  SYSTEM_ITEMS,
  UINT16,
  VE_BUS_ITEMS,
  amperage,
  decode,
  title,
} = require('./registers');

const RED = '\u001b[31m';
const RESET = '\u001b[0m';

const ITEMS = [...SYSTEM_ITEMS, ...SOLAR_ITEMS, ...VE_BUS_ITEMS];

function item(name) {
  const found = ITEMS.find(([itemName]) => itemName === name);

  assert.ok(found, `no such item: ${name}`);

  return found;
}

// Decodes a register through the same table the plugin uses, so a wrong type or
// scale in the table fails the test.
function read(name, raw) {
  const [, , type, scale, format] = item(name);
  const value = decode(raw, type, scale);

  return { value, text: format(value) };
}

function results(overrides) {
  const base = {
    'grid voltage': read('grid voltage', 0),
    'grid current': read('grid current', 0),
    'grid power': read('grid power', 0),
    'battery current': read('battery current', 0),
    'battery SoC': read('battery SoC', 71),
    'battery time to go': read('battery time to go', 0),
  };

  return { ...base, ...overrides };
}

describe('decode', () => {
  it('passes an unsigned register through', () => {
    assert.equal(decode(0, UINT16, 1), 0);
    assert.equal(decode(40000, UINT16, 1), 40000);
    assert.equal(decode(65535, UINT16, 1), 65535);
  });

  it('reads the top half of an int16 range as negative', () => {
    assert.equal(decode(65535, INT16, 1), -1);
    assert.equal(decode(65534, INT16, 1), -2);
    assert.equal(decode(32768, INT16, 1), -32768);
  });

  it('keeps the bottom half of an int16 range positive', () => {
    assert.equal(decode(0, INT16, 1), 0);
    assert.equal(decode(32767, INT16, 1), 32767);
  });

  it('divides by the scale factor', () => {
    assert.equal(decode(1312, UINT16, 100), 13.12);
    assert.equal(decode(2500, INT16, 0.1), 25000);
    assert.equal(decode(1169, UINT16, -10), -116.9);
  });

  it('scales a negative int16', () => {
    assert.equal(decode(65535, INT16, 10), -0.1);
    assert.equal(decode(64366, INT16, 1), -1170);
  });
});

describe('register table', () => {
  it('declares every register that can go negative as int16', () => {
    for (const name of ['battery current', 'battery power', 'DC system power',
                        'PV current', 'grid current', 'grid frequency', 'grid power']) {
      assert.equal(item(name)[2], INT16, `${name} should be int16`);
    }
  });

  it('reads a discharging battery as negative amps', () => {
    assert.equal(read('battery current', 65531).value, -0.5);
    assert.equal(read('battery current', 65531).text, '-0.5A');
  });

  it('reads PV current flowing backwards as negative amps', () => {
    assert.equal(read('PV current', 65526).value, -1);
  });

  it('reads a large negative DC system power without wrapping positive', () => {
    assert.equal(read('DC system power', 59536).value, -6000);
  });

  it('renders time to go in hours', () => {
    assert.equal(read('battery time to go', 36).text, '1.00h');
    assert.equal(read('battery time to go', 90).text, '2.50h');
  });

  it('renders an indefinite time to go as infinity', () => {
    // 864000s is Venus OS's flat "effectively indefinite" value.
    assert.equal(read('battery time to go', 8640).text, '∞');
    assert.equal(read('battery time to go', 8639).text, '239.97h');
  });
});

describe('amperage', () => {
  it('shows a positive value plainly', () => {
    assert.equal(amperage(1.4), '1.4A');
  });

  it('shows zero plainly', () => {
    assert.equal(amperage(0), '0A');
    assert.equal(amperage(-0), '0A');
  });

  it('drops the minus sign and turns red when negative', () => {
    assert.equal(amperage(-1.4), `${RED}1.4A${RESET}`);
  });
});

describe('title', () => {
  it('hides time to go while charging', () => {
    const line = title(results({ 'battery current': read('battery current', 14) }));

    assert.equal(line, '🏕 1.4A · 71%');
  });

  it('hides time to go at zero amps', () => {
    const line = title(results({ 'battery current': read('battery current', 0) }));

    assert.equal(line, '🏕 0A · 71%');
  });

  it('shows time to go in red while discharging', () => {
    const line = title(results({
      'battery current': read('battery current', 65522),
      'battery time to go': read('battery time to go', 36),
    }));

    assert.equal(line, `🏕 ${RED}1.4A${RESET} · 71% · 1.00h`);
  });

  it('hides the charging sentinel even when the current reads negative', () => {
    const line = title(results({
      'battery current': read('battery current', 65535),
      'battery time to go': read('battery time to go', 0),
    }));

    assert.equal(line, `🏕 ${RED}0.1A${RESET} · 71%`);
  });

  it('shows infinity in place of an indefinite time to go', () => {
    const line = title(results({
      'battery current': read('battery current', 65530),
      'battery time to go': read('battery time to go', 8640),
    }));

    assert.equal(line, `🏕 ${RED}0.6A${RESET} · 71% · ∞`);
  });

  it('switches to the grid line on shore power', () => {
    const line = title(results({
      'grid voltage': read('grid voltage', 1204),
      'grid current': read('grid current', 32),
      'grid power': read('grid power', 38),
    }));

    assert.equal(line, '⚡ 120.4V · 3.2A · 380W');
  });

  it('colors grid amperage the same way when it is negative', () => {
    const line = title(results({
      'grid voltage': read('grid voltage', 1204),
      'grid current': read('grid current', 65504),
      'grid power': read('grid power', 65498),
    }));

    assert.equal(line, `⚡ 120.4V · ${RED}3.2A${RESET} · -380W`);
  });
});
