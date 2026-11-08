import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { CSV_HEADER, keep, parseAdmin1, parseGeonamesLine, toCsvRow } from '../scripts/places-lib.mjs';

const linea = (o) => {
  const c = Array(19).fill('');
  Object.assign(c, { 0: o.id, 1: o.name, 2: o.ascii ?? '', 4: o.lat ?? '-24.18', 5: o.lon ?? '-65.33', 6: o.fc ?? 'P', 8: o.cc, 10: o.a1 ?? '10', 14: o.pop ?? '0', 17: o.tz ?? 'America/Argentina/Jujuy' });
  return c.join('\t');
};

describe('places-lib', () => {
  test('parsea una fila y usa la provincia de admin1CodesASCII', () => {
    const row = parseGeonamesLine(linea({ id: '3841500', name: 'Purmamarca', ascii: 'Purmamarca', cc: 'AR', pop: '388' }));
    assert.deepEqual([row.id, row.name, row.countryCode, row.population, row.timezone], [3841500, 'Purmamarca', 'AR', 388, 'America/Argentina/Jujuy']);
    const admin1 = parseAdmin1('AR.10\tJujuy\tJujuy\t3853404\n');
    assert.equal(toCsvRow(row, admin1), '3841500,Purmamarca,Purmamarca,Jujuy,AR,-24.18,-65.33,America/Argentina/Jujuy,388');
  });

  test('filtra por fuente: AR solo clase P, cities1000 hispanos+BR+US, cities15000 el resto, nunca AR fuera de AR.zip', () => {
    const p = (o) => parseGeonamesLine(linea(o));
    assert.equal(keep(p({ id: '1', name: 'X', cc: 'AR' }), 'AR'), true);
    assert.equal(keep(p({ id: '2', name: 'Cerro', cc: 'AR', fc: 'T' }), 'AR'), false);
    assert.equal(keep(p({ id: '3', name: 'Y', cc: 'UY' }), 'cities1000'), true);
    assert.equal(keep(p({ id: '4', name: 'Z', cc: 'FR' }), 'cities1000'), false);
    assert.equal(keep(p({ id: '5', name: 'Z', cc: 'FR' }), 'cities15000'), true);
    assert.equal(keep(p({ id: '6', name: 'Y', cc: 'UY' }), 'cities15000'), false);
    assert.equal(keep(p({ id: '7', name: 'X', cc: 'AR' }), 'cities1000'), false);
    assert.equal(keep(p({ id: '8', name: 'Sin zona', cc: 'AR', tz: '' }), 'AR'), false);
    assert.equal(keep(parseGeonamesLine('basura'), 'AR'), false);
  });

  test('CSV: comillas para comas y comillas; sin asciiname usa el nombre sin tildes; provincia vacía = NULL', () => {
    const row = parseGeonamesLine(linea({ id: '9', name: 'Villa "La" Angostura, Sur', ascii: '', cc: 'AR', a1: '99' }));
    assert.equal(row.asciiName, 'Villa "La" Angostura, Sur');
    const sinTilde = parseGeonamesLine(linea({ id: '10', name: 'Tafí del Valle', ascii: '', cc: 'AR' }));
    assert.equal(sinTilde.asciiName, 'Tafi del Valle');
    assert.match(toCsvRow(row, new Map()), /^9,"Villa ""La"" Angostura, Sur","Villa ""La"" Angostura, Sur",,AR,/);
    assert.equal(CSV_HEADER, 'id,name,ascii_name,admin1,country_code,lat,lon,timezone,population');
  });
});
