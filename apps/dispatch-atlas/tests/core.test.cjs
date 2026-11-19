const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../web/core.js');
const fixtures = require('../web/data.js');
const input = (changes={}) => ({...fixtures.incidents[0],...changes});

test('bundled fixtures validate and remain clearly synthetic', () => {
  const normalized=core.validateImport(fixtures);
  assert.equal(normalized.incidents.length,10);
  assert.equal(normalized.feeds.length,10);
  assert.ok(normalized.incidents.every(i=>i.demo && i.verification==='demo' && /fictional/i.test(i.address)));
  assert.ok(normalized.feeds.every(f=>f.streamUrl===null && !f.connected));
  assert.ok(normalized.calls.every(c=>c.demo && c.audioUrl===null));
});
test('incident import rejects nonfinite, partial and out-of-range coordinates', () => {
  for (const coordinates of [{lat:NaN,lon:0},{lat:Infinity,lon:0},{lat:91,lon:0},{lat:0,lon:181},{lat:'40',lon:-74},{lat:null,lon:-74}]) {
    assert.throws(()=>core.normalizeIncident(input(coordinates)), /latitude/);
  }
  const i=core.normalizeIncident(input({lat:null,lon:null}));
  assert.equal(i.lat,null); assert.equal(i.lon,null);
});
test('sparse import cannot create a geographic location', () => {
  const {lat,lon,...sparse}=input();
  assert.equal(core.normalizeIncident(sparse).lat,null);
});
test('duplicate IDs fail atomically without altering supplied records', () => {
  const a=input(), b=input();
  const original=JSON.stringify(a);
  assert.throws(()=>core.validateImport({incidents:[a,b]}),/Duplicate incidents id/);
  assert.equal(JSON.stringify(a),original);
});
test('invalid input produces field-specific errors and does not accept unsupported values', () => {
  assert.throws(()=>core.validateImport({}),/needs incidents/);
  assert.throws(()=>core.validateImport({incidents:'wrong'}),/array/);
  assert.throws(()=>core.validateImport({incidents:[input({priority:'urgent-ish'})]}),/incidents\[0\].*priority/);
  assert.throws(()=>core.normalizeIncident(input({category:'malicious'})),/category/);
  assert.throws(()=>core.normalizeIncident(input({title:'x'.repeat(241)})),/title/);
  assert.throws(()=>core.normalizeIncident(input({reportedAt:'2026'})),/ISO date-time/);
  assert.throws(()=>core.normalizeIncident(input({reportedAt:'2026-02-31T12:00:00Z'})),/real ISO date-time/);
  assert.throws(()=>core.normalizeIncident(input({reportedAt:'2026-11-19T12:00:00'})),/timezone/);
});
test('unconfirmed is the default; official verification requires provenance', () => {
  const minimal=input({demo:false,verification:undefined});
  assert.equal(core.normalizeIncident(minimal).verification,'unconfirmed');
  assert.throws(()=>core.normalizeIncident({...minimal,verification:'verified'}),/requires source/);
  const verified=core.normalizeIncident({...minimal,verification:'verified',source:'Agency report 123',verifiedBy:'Dispatcher review',verifiedAt:'2026-11-19T12:00:00Z'});
  assert.equal(verified.verification,'verified');
  assert.equal(core.normalizeIncident({...verified,demo:true}).verification,'demo');
});
test('POI risk assertions require explicit source and verification date before verified status', () => {
  const p=fixtures.incidents[0].pois[0];
  assert.equal(core.normalizePOI({...p,verification:undefined,demo:false}).verification,'unconfirmed');
  assert.throws(()=>core.normalizePOI({...p,verification:'verified',demo:false}),/requires source/);
});
test('HTTP URLs are normalized, unsafe schemes and embedded credentials rejected', () => {
  assert.equal(core.safeURL('https://example.com'),'https://example.com/');
  for(const value of ['javascript:alert(1)','data:text/html,x','file:///etc/passwd','https://user:password@example.com','/relative.mp3','']) {
    assert.equal(core.safeURL(value),null);
    if(value) assert.throws(()=>core.normalizeFeed({id:'f',name:'Feed',streamUrl:value}),/HTTP/);
  }
});
test('HTML escaping prevents markup injection', () => {
  assert.equal(core.escapeHTML('<img src=x onerror="alert(1)">\'&'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;&#39;&amp;');
});
test('filters intersect query, category, subtype, geography, priority and favorites', () => {
  const list=fixtures.incidents;
  assert.equal(core.filterIncidents(list,{query:'TRAINING E1',categories:['fire'],area:'Newark, NJ',priority:'high',types:['structure-working'],favorites:['DEMO-001'],favoritesOnly:true}).length,1);
  assert.equal(core.filterIncidents(list,{favoritesOnly:true,favorites:[]}).length,0);
  assert.equal(core.filterIncidents(list,{categories:[],types:[]}).length,10);
  assert.equal(core.filterIncidents(list,{excludeDemo:true}).length,0);
  assert.equal(core.filterIncidents(list,{area:'Unknown County'}).length,0);
});
test('haversine yields correct distance and never treats missing coordinates as origin', () => {
  assert.equal(core.haversine(0,0,0,0),0);
  assert.ok(Math.abs(core.haversine(0,0,0,1)-111195)<2);
  assert.equal(core.haversine(null,null,0,0),null);
  const nearby=core.nearbyPOIs(fixtures.incidents[0],1000);
  assert.equal(nearby.length,4);
  assert.ok(nearby.every((p,i)=>i===0 || p.distanceMeters>=nearby[i-1].distanceMeters));
  assert.equal(core.nearbyPOIs({...fixtures.incidents[0],lat:null,lon:null}).length,0);
});
test('relative time handles invalid and future timestamps', () => {
  const now=Date.parse('2026-11-19T12:00:00Z');
  assert.equal(core.formatAge('2026-11-19T11:57:00Z',now),'3 min ago');
  assert.equal(core.formatAge('2026-11-19T11:00:00Z',now),'1h ago');
  assert.equal(core.formatAge('2026-11-20T12:00:00Z',now),'Future timestamp');
  assert.equal(core.formatAge('invalid',now),'Time unknown');
});
test('merge updates matching ID while retaining unrelated records', () => {
  assert.deepEqual(core.mergeById([{id:'a',value:1},{id:'b',value:2}],[{id:'a',value:3},{id:'c',value:4}]),[{id:'a',value:3},{id:'b',value:2},{id:'c',value:4}]);
});
test('local transcript rules mark training/negation and never automatically publish', () => {
  const candidate=core.transcriptCandidate('Drill: no working fire. This is a training exercise.');
  assert.equal(candidate.isTraining,true); assert.equal(candidate.negated,true);
  assert.equal(candidate.needsReview,true); assert.equal(candidate.publishAutomatically,false);
  assert.equal(candidate.verification,'unconfirmed');
  assert.equal(candidate.candidates[0].typeId,'structure-working');
});
test('schema rejects oversized arrays and invalid call durations', () => {
  assert.throws(()=>core.validateImport({incidents:Array(5001).fill(input())}),/at most 5000/);
  assert.throws(()=>core.normalizeCall({...fixtures.calls[0],duration:-1}),/duration/);
  assert.throws(()=>core.normalizeCall({...fixtures.calls[0],duration:NaN}),/duration/);
});

 test('merging cannot create an unloadable workspace beyond collection limits', () => {
  const records=Array.from({length:5000},(_,n)=>({id:String(n)}));
  assert.equal(core.mergeById(records,[{id:'0',updated:true}]).length,5000);
  assert.throws(()=>core.mergeById(records,[{id:'new'}]),/workspace limit/);
  assert.equal(records.length,5000);
});
test('candidate flags recognize retrospective cancellation and negated CPR', () => {
  assert.equal(core.transcriptCandidate('Working fire report cancelled by command.').negated,true);
  assert.equal(core.transcriptCandidate('No CPR in progress.').negated,true);
  assert.equal(core.transcriptCandidate('No injuries. Working fire on arrival.').negated,false);
});
