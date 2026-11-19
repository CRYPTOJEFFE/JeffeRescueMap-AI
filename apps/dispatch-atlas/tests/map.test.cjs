'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const map = require('../web/map.js');

test('Web Mercator preserves local incident coordinates in round trips', () => {
  const coordinates = [[40.7357,-74.1724],[-33.86,151.2],[0,0],[85,179.99],[-85,-179.99]];
  for (const [lat,lon] of coordinates) {
    for (const zoom of [3,15,19]) {
      const xy = map.project(lat,lon,zoom);
      const result = map.unproject(xy.x,xy.y,zoom);
      assert.ok(Math.abs(result.lat-lat) < 1e-7);
      assert.ok(Math.abs(result.lon-lon) < 1e-7);
    }
  }
});

test('invalid coordinates never yield a substitute map pin', () => {
  for (const [lat,lon] of [[null,0],['40',-74],[91,0],[-91,0],[40,181],[40,-181],[NaN,0],[40,Infinity]]) {
    assert.equal(map.coordinate(lat,lon),false);
    assert.equal(map.project(lat,lon,15),null);
  }
  assert.equal(map.project(40,-74,Infinity),null);
});

test('equator uses the expected tile center and poles clamp to Mercator bounds', () => {
  assert.deepEqual(map.project(0,0,0),{x:128,y:128});
  for (const lat of [-90,90]) {
    const xy = map.project(lat,0,10);
    assert.ok(Number.isFinite(xy.x) && Number.isFinite(xy.y));
    const result = map.unproject(xy.x,xy.y,10);
    assert.ok(Math.abs(Math.abs(result.lat)-85.05112878) < 1e-7);
  }
});

test('horizontal pan wraps the antimeridian while vertical pan remains bounded', () => {
  const world = 256 * 2 ** 15;
  assert.equal(map.unproject(world+world/2,world/2,15).lon,0);
  assert.equal(map.unproject(-world/2,world/2,15).lon,0);
  assert.ok(map.unproject(world/2,-1000,15).lat <= 85.05112878);
  assert.ok(map.unproject(world/2,world+1000,15).lat >= -85.05112878);
});

test('public OSM tiles permit hosted HTTP(S) pages', () => {
  for (const url of ['https://dispatch.example.com/','https://dispatch.example.com/map?view=station','http://localhost:8787/','http://127.0.0.1:8787/']) {
    assert.equal(map.streetOriginAllowed(url),true,url);
  }
});

test('public OSM tiles reject standalone files and native asset pseudo-origins', () => {
  for (const url of [
    'file:///Users/jeff/Dispatch_Atlas.html','atlas://app/index.html','capacitor://localhost/',
    'https://appassets.androidplatform.net/assets/index.html',
    'http://appassets.androidplatform.net/assets/index.html',
    'https://APPASSETS.ANDROIDPLATFORM.NET./assets/index.html',
    'about:blank','data:text/html,hello','javascript:alert(1)','not a URL','',undefined,null
  ]) assert.equal(map.streetOriginAllowed(url),false,String(url));
});
