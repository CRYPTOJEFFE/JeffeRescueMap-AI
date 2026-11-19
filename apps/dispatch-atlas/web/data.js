/* Fictional fixtures for demonstration. No incident or property-risk assertion is real. */
(function (root) {
  'use strict';
  const category = (id, label, emoji, description, types) => ({id,label,emoji,description,types:types.map(([id,label,icon])=>({id,label,emoji:icon||emoji}))});
  const categories = [
    category('fire','Fires & Working Fires','🔥','Reported fires, smoke conditions, and working-fire escalations.',[
      ['structure-working','Confirmed / working structure fire (Signal 11)'],['structure-possible','Possible structure fire','💨🔥'],['structure-smoke','Structure fire — smoke showing','💨🔥'],['brush-fire','Brush / grass fire'],['vehicle-fire','Vehicle fire','🚗🔥'],['industrial-fire','Industrial fire','🏭🔥'],['highrise-fire','High-rise fire','🏢🔥'],['dumpster-fire','Dumpster / refuse fire'],['alarm-fire','Automatic fire alarm','🔔']]),
    category('ems','EMS & Medical','🚑','Medical calls and patient care incidents.',[
      ['cardiac-arrest','Cardiac arrest','❤️'],['sick-person','Sick person','🤒'],['breathing','Difficulty breathing','🫁'],['stroke','Possible stroke','🧠'],['trauma','Traumatic injury'],['unconscious','Unconscious person'],['mci','Mass-casualty incident']]),
    category('violence','Mass Violence','⚠️','Shooting, stabbing, and active-threat reports.',[
      ['shooting','Shooting','🔫'],['stabbing','Stabbing','🔪'],['active-threat','Active threat'],['mass-violence','Mass violence']]),
    category('mayday','Responder Down — Mayday','🆘','Firefighter or responder emergency reports.',[
      ['mayday','Firefighter mayday'],['officer-down','Officer down'],['responder-emergency','Responder emergency']]),
    category('aviation','Aviation','✈️','Airport alerts and aircraft emergencies.',[
      ['airport-alert-1','Airport Alert 1'],['airport-alert-2','Airport Alert 2'],['airport-alert-3','Airport Alert 3'],['aircraft-crash','Aircraft crash']]),
    category('rail','Rail','🚆','Rail incidents and derailments.',[
      ['derailment','Train derailment'],['rail-hazmat','Rail hazmat release','☣️'],['rail-collision','Train collision']]),
    category('hazmat','Hazmat','☣️','Chemical spills, releases, and hazardous-material reports.',[
      ['hazmat-release','Hazmat release'],['gas-leak','Gas leak'],['fuel-spill','Fuel spill'],['co-alarm','Carbon monoxide report']]),
    category('marine','Marine','⛵','Water rescues and vessel emergencies.',[
      ['water-rescue','Water rescue','🛟'],['vessel-fire','Vessel fire','🚤🔥'],['vessel-distress','Vessel in distress']]),
    category('mva','Vehicle Crashes','🚗','Crashes by involvement, road context, and reported hazards.',[
      ['mva-single','Traffic accident — single car'],['mva-multiple','Traffic accident — multiple cars','🚗🚙'],['mva-highway','Highway / road over 40 mph'],['mva-rollover','MVA rollover'],['mva-extrication','MVA extrication'],['mva-fluid','MVA with fluid spill','🚗💧'],['mva-major','MVA major damage'],['pedestrian-struck','Pedestrian struck']]),
    category('rescue','Building Collapse & Technical Rescue','🏚️','Collapse, confined-space, and technical-rescue incidents.',[
      ['building-collapse','Building collapse'],['trench-rescue','Trench rescue'],['confined-space','Confined-space rescue'],['elevator-rescue','Elevator rescue'],['rope-rescue','Rope rescue']]),
    category('weather','Weather & Disaster','🌪️','Severe-weather observations and disaster reports.',[
      ['tornado','Tornado report'],['flood','Flooding','🌊'],['storm','Severe storm','⛈️'],['power-lines','Downed power lines','⚡']])
  ];
  const start = Date.now();
  const minutesAgo = n => new Date(start - n * 60000).toISOString();
  const type = id => categories.flatMap(c=>c.types).find(t=>t.id===id);
  const fixture = (n, typeId, categoryId, area, latitude, longitude, priority, units, transcript, pois=[]) => ({
    id:'DEMO-'+String(n).padStart(3,'0'), typeId, title:type(typeId).label,
    category:categoryId, emoji:type(typeId).emoji,
    agency:area==='Newark, NJ'?'Newark training scenario':area==='Manhattan, NY'?'FDNY Manhattan training scenario':area==='Bronx, NY'?'FDNY Bronx training scenario':'FDNY Brooklyn training scenario',
    area, address:'Training block '+String.fromCharCode(64+n)+' — fictional address',
    crossStreets:'Exercise Avenue / Training Street (fictional)',
    lat:latitude,lon:longitude,priority,status:'reported',reportedAt:minutesAgo(n*3),units,
    transcript:'TRAINING EXERCISE — '+transcript,
    trigger:type(typeId).label,source:'Bundled synthetic exercise fixture',sourceUrl:null,
    verification:'demo',verifiedAt:null,verifiedBy:'',demo:true,pois,
    feedId:area==='Newark, NJ'?'newark-fire':area==='Manhattan, NY'?'fdny-mn':area==='Bronx, NY'?'fdny-bx':'fdny-bk',
    audioUrl:null,notes:'Schematic location for interface testing only. Incident, units, cross streets, and property information are fictional.'
  });
  const poi = (id,name,kind,lat,lon,notes)=>({id,name:'Exercise: '+name,kind,lat,lon,source:'Synthetic training fixture; not a verified property record',sourceUrl:null,verifiedAt:null,verification:'demo',demo:true,notes});
  const incidents = [
    fixture(1,'structure-working','fire','Newark, NJ',40.7357,-74.1724,'high',['Training E1','Training L2','Training B1'],'Simulated working structure fire. Exercise companies assigned. No real dispatch.',[
      poi('risk-a','Commercial block','commercial',40.7361,-74.1721,'Fictional mercantile exposure; verify any real preplan independently.'),
      poi('risk-b','High-rise exposure','high-rise',40.7353,-74.1715,'Fictional 14-story exposure; not a claim about a real building.'),
      poi('risk-c','Tire-storage yard','tire-yard',40.7348,-74.1740,'Synthetic hazard for training. No known tire yard asserted at this coordinate.'),
      poi('risk-d','Vacant structure','vacant-structure',40.7371,-74.1735,'Synthetic vacant structure. No actual occupancy or abandonment determination.')]),
    fixture(2,'mva-rollover','mva','Newark, NJ',40.7276,-74.1702,'high',['Training R1','Training EMS2'],'Simulated rollover. Patient count and hazards are exercise details.'),
    fixture(3,'cardiac-arrest','ems','Manhattan, NY',40.7191,-73.9887,'critical',['Training EMS4','Training ALS1'],'Simulated cardiac-arrest response. No patient or real location.'),
    fixture(4,'structure-possible','fire','Bronx, NY',40.8333,-73.9180,'moderate',['Training E5','Training L6'],'Exercise odor of smoke. Working fire not established.'),
    fixture(5,'mva-multiple','mva','Brooklyn, NY',40.6601,-73.9941,'moderate',['Training EMS3','Training E8'],'Simulated collision involving multiple vehicles. No real dispatch.'),
    fixture(6,'hazmat-release','hazmat','Newark, NJ',40.7185,-74.1551,'high',['Training HM1','Training B2'],'Exercise chemical-release scenario. Substance and exposure remain unconfirmed.',[
      poi('risk-e','Industrial training site','industrial',40.7182,-74.1548,'Fictional industrial exposure. A real hazard assessment requires current authoritative records.')]),
    fixture(7,'sick-person','ems','Newark, NJ',40.7421,-74.1810,'low',['Training EMS1'],'Routine sick-person exercise. Patient information omitted.'),
    fixture(8,'highrise-fire','fire','Manhattan, NY',40.7527,-73.9772,'high',['Training E12','Training L9','Training B4'],'Simulated high-rise smoke condition. Floor information is a training assumption.',[
      poi('risk-f','High-rise training tower','high-rise',40.7531,-73.9769,'Fictional tower for preplan UI testing; no real property risk claim.')]),
    fixture(9,'mayday','mayday','Brooklyn, NY',40.6802,-73.9572,'critical',['Training RIT1','Training B6'],'Drill: simulated firefighter mayday. Training traffic only.'),
    fixture(10,'building-collapse','rescue','Bronx, NY',40.8468,-73.8981,'high',['Training Rescue3','Training Squad2'],'Simulated partial collapse. Exercise exclusion zone pending supervisor review.')
  ];
  const feed = (id,name,area,kind,talkgroup='')=>({id,name,area,kind,talkgroup,description:'Connection not configured. Add an authorized audio-stream URL in Settings. No live service is implied.',streamUrl:null,sourceUrl:null,demo:true,connected:false});
  const feeds = [
    feed('newark-remcs-1','Newark REMCS — Channel 1','Newark, NJ','EMS'),
    feed('newark-remcs-2','Newark REMCS — Channel 2','Newark, NJ','EMS'),
    feed('newark-fire','Newark Fire Dispatch','Newark, NJ','Fire'),
    feed('newark-police','Newark Police','Newark, NJ','Police'),
    feed('fdny-mn','FDNY MN Dispatch','Manhattan, NY','Fire'),
    feed('fdny-bx','FDNY BX Dispatch','Bronx, NY','Fire'),
    feed('fdny-bk','FDNY BK Dispatch','Brooklyn, NY','Fire'),
    feed('fdny-qn','FDNY QN Dispatch','Queens, NY','Fire'),
    feed('fdny-si','FDNY SI Dispatch','Staten Island, NY','Fire'),
    feed('fdny-ems-cw1','EMS CW 1 Disp','New York City, NY','EMS')
  ];
  const calls = [
    ['call-1','fdny-mn',1,16,'Training Engine 5, simulated box 467. Exercise companies responding.'],
    ['call-2','fdny-si',2,6,'Training Staten Island dispatch. Exercise roll call.'],
    ['call-3','newark-remcs-1',3,12,'Training REMCS, ambulance exercise at fictional Training Block A.'],
    ['call-4','fdny-bx',4,26,'Exercise odor of smoke, simulated 13th floor. Verify all training details.'],
    ['call-5','newark-fire',5,18,'Drill: simulated working fire. No actual incident or dispatch.'],
    ['call-6','newark-remcs-2',6,9,'Training medical coordination channel. Exercise complete.']
  ].map(([id,feedId,age,duration,transcript])=>({id,feedId,time:minutesAgo(age),duration,transcript,audioUrl:null,demo:true,source:'Synthetic transcript; no recorded radio audio supplied'}));
  const data = {schemaVersion:1,fixtureNotice:'All included incidents, coordinates, transcripts, units, cross streets, and property risks are fictional exercises. Feed names are configuration placeholders, not connected services.',categories,incidents,feeds,calls};
  root.ATLAS_DATA = data;
  if (typeof module==='object' && module.exports) module.exports=data;
})(typeof globalThis!=='undefined'?globalThis:this);
