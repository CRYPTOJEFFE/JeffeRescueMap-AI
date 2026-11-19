/* Dispatch Atlas · independent implementation · no remote dependencies */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.AtlasCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const CATEGORIES = new Set(['fire', 'ems', 'violence', 'mayday', 'aviation', 'rail', 'hazmat', 'marine', 'mva', 'rescue', 'weather']);
  const PRIORITIES = new Set(['critical', 'high', 'moderate', 'low']);
  const VERIFICATIONS = new Set(['demo', 'unconfirmed', 'reported', 'verified']);
  const MAX_ITEMS = 5000;

  function escapeHTML(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function safeURL(value) {
    if (typeof value !== 'string' || !value.trim() || value.length > 4096) return null;
    try {
      const u = new URL(value);
      if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) return null;
      return u.href;
    } catch (_) { return null; }
  }
  function plain(value, field, max = 500, required = false) {
    if (value == null && !required) return '';
    if (typeof value !== 'string') throw new TypeError(field + ' must be text');
    const s = value.trim();
    if ((required && !s) || s.length > max) throw new RangeError(field + ' must contain ' + (required ? '1–' : '0–') + max + ' characters');
    return s;
  }
  function record(value, field) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new TypeError(field + ' must be an object');
    return value;
  }
  function date(value, field, required = false) {
    if (value == null || value === '') {
      if (required) throw new TypeError(field + ' is required');
      return null;
    }
    const parts = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(Z|[+-]\d{2}:\d{2})$/);
    if (!parts || !Number.isFinite(Date.parse(value))) throw new TypeError(field + ' must be an ISO date-time with timezone');
    const year=Number(parts[1]), month=Number(parts[2]), day=Number(parts[3]);
    const leap=year%4===0 && (year%100!==0 || year%400===0);
    const days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
    if (month<1 || month>12 || day<1 || day>days[month-1] || Number(parts[4])>23 || Number(parts[5])>59 || Number(parts[6]||0)>59) throw new TypeError(field + ' must be a real ISO date-time');
    return new Date(value).toISOString();
  }
  function coordinates(lat, lon, field) {
    if ((lat == null || lat === '') && (lon == null || lon === '')) return {lat:null, lon:null};
    if (typeof lat !== 'number' || typeof lon !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      throw new RangeError(field + ' requires numeric latitude −90…90 and longitude −180…180, or both null');
    }
    return {lat, lon};
  }
  function url(value, field) {
    if (value == null || value === '') return null;
    const normalized = safeURL(value);
    if (!normalized) throw new TypeError(field + ' must be an absolute HTTP(S) URL without embedded credentials');
    return normalized;
  }
  function id(value, field) {
    const s = plain(value, field, 120, true);
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$/.test(s)) throw new TypeError(field + ' contains unsupported characters');
    return s;
  }
  function stringList(value, field, maxItems = 50) {
    if (value == null) return [];
    if (!Array.isArray(value) || value.length > maxItems) throw new TypeError(field + ' must be an array with at most ' + maxItems + ' items');
    return [...new Set(value.map((x, i) => plain(x, field + '[' + i + ']', 180, true)))];
  }
  function normalizePOI(input, index = 0) {
    const p = record(input, 'POI ' + index);
    const point = coordinates(p.lat, p.lon, 'POI location');
    const verification = p.verification == null ? 'unconfirmed' : plain(p.verification, 'POI verification', 30);
    if (!VERIFICATIONS.has(verification)) throw new TypeError('Unsupported POI verification');
    const verifiedAt = date(p.verifiedAt, 'POI verifiedAt');
    const source = plain(p.source, 'POI source', 500);
    if (verification === 'verified' && (!source || !verifiedAt)) throw new TypeError('A verified POI requires source and verifiedAt');
    return {
      id: p.id == null ? 'poi-' + index : id(p.id, 'POI id'),
      name: plain(p.name, 'POI name', 240, true),
      kind: plain(p.kind || 'poi', 'POI kind', 80, true),
      ...point, source, sourceUrl: url(p.sourceUrl, 'POI sourceUrl'),
      verifiedAt, verification,
      notes: plain(p.notes, 'POI notes', 2000),
      demo: p.demo === true || verification === 'demo'
    };
  }
  function normalizeIncident(input) {
    const i = record(input, 'incident');
    const category = plain(i.category, 'incident category', 30, true);
    if (!CATEGORIES.has(category)) throw new TypeError('Unsupported incident category: ' + category);
    const priority = i.priority == null ? 'moderate' : plain(i.priority, 'incident priority', 30);
    if (!PRIORITIES.has(priority)) throw new TypeError('Unsupported incident priority: ' + priority);
    const demo = i.demo === true || i.verification === 'demo';
    const verification = demo ? 'demo' : (i.verification || 'unconfirmed');
    if (!VERIFICATIONS.has(verification)) throw new TypeError('Unsupported incident verification');
    const source = plain(i.source, 'incident source', 500);
    const verifiedAt = date(i.verifiedAt, 'incident verifiedAt');
    const verifiedBy = plain(i.verifiedBy, 'incident verifiedBy', 180);
    if (verification === 'verified' && (!source || !verifiedAt || !verifiedBy)) throw new TypeError('A verified incident requires source, verifiedBy, and verifiedAt');
    if (i.pois != null && (!Array.isArray(i.pois) || i.pois.length > 300)) throw new TypeError('pois must be an array with at most 300 entries');
    return {
      id: id(i.id, 'incident id'), typeId: id(i.typeId, 'incident typeId'),
      title: plain(i.title, 'incident title', 240, true), category,
      emoji: plain(i.emoji || '⚠️', 'incident emoji', 20),
      agency: plain(i.agency, 'incident agency', 200),
      area: plain(i.area, 'incident area', 180),
      address: plain(i.address, 'incident address', 500),
      crossStreets: Array.isArray(i.crossStreets) ? stringList(i.crossStreets, 'cross streets', 10).join(' / ') : plain(i.crossStreets, 'cross streets', 500),
      ...coordinates(i.lat, i.lon, 'incident location'),
      priority, status: plain(i.status || 'reported', 'incident status', 60),
      reportedAt: date(i.reportedAt, 'incident reportedAt', true),
      units: stringList(i.units, 'incident units'),
      transcript: plain(i.transcript, 'incident transcript', 20000),
      trigger: plain(i.trigger, 'incident trigger', 2000),
      source, sourceUrl: url(i.sourceUrl, 'incident sourceUrl'),
      verification, verifiedAt, verifiedBy, demo,
      audioUrl: url(i.audioUrl, 'incident audioUrl'),
      feedId: i.feedId == null ? null : id(i.feedId, 'incident feedId'),
      pois: (i.pois || []).map(normalizePOI),
      notes: plain(i.notes, 'incident notes', 5000)
    };
  }
  function normalizeFeed(input) {
    const f = record(input, 'feed');
    return {
      id:id(f.id, 'feed id'), name:plain(f.name, 'feed name', 240, true),
      area:plain(f.area, 'feed area', 180), kind:plain(f.kind || 'Public safety', 'feed kind', 80),
      talkgroup: f.talkgroup == null ? '' : plain(String(f.talkgroup), 'talkgroup', 100),
      description:plain(f.description, 'feed description', 2000),
      streamUrl:url(f.streamUrl, 'feed streamUrl'), sourceUrl:url(f.sourceUrl, 'feed sourceUrl'),
      demo:f.demo === true, connected:!!safeURL(f.streamUrl)
    };
  }
  function normalizeCall(input) {
    const c = record(input, 'call');
    if (typeof c.duration !== 'number' || !Number.isFinite(c.duration) || c.duration < 0 || c.duration > 86400) throw new RangeError('Call duration must be seconds from 0 to 86400');
    return {
      id:id(c.id, 'call id'), feedId:id(c.feedId, 'call feedId'), time:date(c.time, 'call time', true),
      duration:c.duration, transcript:plain(c.transcript, 'call transcript', 20000),
      audioUrl:url(c.audioUrl, 'call audioUrl'), demo:c.demo === true,
      source:plain(c.source, 'call source', 500)
    };
  }
  function normalizeCollection(value, name, normalize) {
    if (value == null) return [];
    if (!Array.isArray(value) || value.length > MAX_ITEMS) throw new TypeError(name + ' must be an array with at most ' + MAX_ITEMS + ' items');
    const ids = new Set();
    return value.map((item, index) => {
      let normalized;
      try { normalized = normalize(item); } catch (e) { throw new TypeError(name + '[' + index + ']: ' + e.message); }
      if (ids.has(normalized.id)) throw new TypeError('Duplicate ' + name + ' id: ' + normalized.id);
      ids.add(normalized.id);
      return normalized;
    });
  }
  function validateImport(input) {
    const data = record(input, 'import');
    const allowed = ['incidents', 'feeds', 'calls'];
    if (!allowed.some(key => Object.prototype.hasOwnProperty.call(data, key))) throw new TypeError('Import needs incidents, feeds, or calls');
    return {
      incidents:normalizeCollection(data.incidents, 'incidents', normalizeIncident),
      feeds:normalizeCollection(data.feeds, 'feeds', normalizeFeed),
      calls:normalizeCollection(data.calls, 'calls', normalizeCall)
    };
  }
  function set(value) {
    if (value instanceof Set) return value;
    if (Array.isArray(value)) return new Set(value);
    if (typeof value === 'string' && value) return new Set([value]);
    return new Set();
  }
  function filterIncidents(incidents, filters = {}) {
    const categories = set(filters.categories), types = set(filters.types), favorites = set(filters.favorites);
    const query = String(filters.query || '').toLocaleLowerCase().trim();
    return incidents.filter(i => {
      if (categories.size && !categories.has(i.category)) return false;
      if (types.size && !types.has(i.typeId)) return false;
      if (filters.area && filters.area !== 'all' && filters.area !== 'All areas' && i.area !== filters.area) return false;
      if (filters.priority && filters.priority !== 'all' && i.priority !== filters.priority) return false;
      if (filters.favoritesOnly && !favorites.has(i.id)) return false;
      if (filters.excludeDemo && i.demo) return false;
      if (query && ![i.title, i.agency, i.address, i.area, i.crossStreets, i.id, ...(i.units || [])].join(' ').toLocaleLowerCase().includes(query)) return false;
      return true;
    });
  }
  function haversine(lat1, lon1, lat2, lon2) {
    const a = coordinates(lat1, lon1, 'first point'), b = coordinates(lat2, lon2, 'second point');
    if (a.lat == null || b.lat == null) return null;
    const r = Math.PI / 180;
    const dlat = (lat2 - lat1) * r, dlon = (lon2 - lon1) * r;
    const h = Math.sin(dlat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dlon / 2) ** 2;
    return 6371008.8 * 2 * Math.atan2(Math.sqrt(Math.min(1,h)), Math.sqrt(Math.max(0,1-h)));
  }
  function nearbyPOIs(incident, radiusMeters = 1000) {
    if (!Number.isFinite(radiusMeters) || radiusMeters < 0) throw new RangeError('Radius must be a nonnegative number');
    if (!incident || incident.lat == null || incident.lon == null) return [];
    return (incident.pois || []).map(p => ({...p, distanceMeters:haversine(incident.lat, incident.lon, p.lat, p.lon)}))
      .filter(p => p.distanceMeters !== null && p.distanceMeters <= radiusMeters)
      .sort((a,b) => a.distanceMeters - b.distanceMeters);
  }
  function formatAge(timestamp, now = Date.now()) {
    const time = Date.parse(timestamp);
    if (!Number.isFinite(time)) return 'Time unknown';
    const seconds = Math.floor((now - time) / 1000);
    if (seconds < -60) return 'Future timestamp';
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return Math.floor(seconds / 60) + ' min ago';
    if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
    return Math.floor(seconds / 86400) + 'd ago';
  }
  function mergeById(existing, incoming) {
    if (!Array.isArray(existing) || !Array.isArray(incoming)) throw new TypeError('Merge requires two arrays');
    const out = new Map(existing.map(item => [item.id, item]));
    incoming.forEach(item => out.set(item.id, item));
    if (out.size > MAX_ITEMS) throw new RangeError('Merged collection exceeds the ' + MAX_ITEMS + '-record workspace limit');
    return [...out.values()];
  }
  function transcriptCandidate(text) {
    const input = plain(text, 'transcript', 20000);
    const training = /\b(training|exercise|drill|simulation|simulated|test alert)\b/i.test(input);
    const eventTerms = '(?:fire|smoke|shooting|cardiac arrest|CPR in progress|hazmat|rollover|mayday)';
    const before = new RegExp('\\b(?:no|negative|not|without|cancel|cancelled|canceled|unfounded)\\b[^.!?;]{0,50}\\b' + eventTerms + '\\b', 'i');
    const after = new RegExp('\\b' + eventTerms + '\\b[^.!?;]{0,50}\\b(?:cancelled|canceled|unfounded|ruled out|not confirmed)\\b', 'i');
    const negated = before.test(input) || after.test(input);
    const rules = [
      ['mayday','mayday','🆘',/\bmayday\b/i],
      ['cardiac-arrest','ems','❤️',/\b(cardiac arrest|not breathing|CPR in progress)\b/i],
      ['structure-working','fire','🔥',/\b(working fire|signal\s*11|10[ -]75)\b/i],
      ['structure-possible','fire','💨🔥',/\b(smoke|possible structure fire|odor of smoke)\b/i],
      ['mva-rollover','mva','🚗',/\brollover\b/i],
      ['hazmat-release','hazmat','☣️',/\b(hazmat|chemical release)\b/i],
      ['shooting','violence','⚠️',/\bshooting\b/i]
    ];
    const matches = rules.filter(rule => rule[3].test(input)).map(rule => ({typeId:rule[0],category:rule[1],emoji:rule[2],matched:input.match(rule[3])[0]}));
    return {engine:'local rules', isTraining:training, negated, needsReview:true, verification:'unconfirmed', candidates:matches, publishAutomatically:false};
  }
  return Object.freeze({escapeHTML, safeURL, normalizeIncident, normalizeFeed, normalizeCall, normalizePOI, validateImport, filterIncidents, haversine, nearbyPOIs, formatAge, mergeById, transcriptCandidate});
});
