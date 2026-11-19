/* Dispatch Atlas map. Independent implementation; no external JavaScript dependencies. */
(function (root) {
  'use strict';

  const MAX_LAT = 85.05112878;
  const TILE = 256;
  const SVG = 'http://www.w3.org/2000/svg';
  const STYLE_ID = 'atlas-map-styles';

  function coordinate(lat, lon) {
    return typeof lat === 'number' && typeof lon === 'number' &&
      Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  }

  // Public OSM browser tiles require a genuine hosted page origin / Referer.
  // Native asset pseudo-origins and standalone file URLs must use a provider
  // authorized for that environment, or the coordinate / imported-data view.
  function streetOriginAllowed(pageURL) {
    try {
      const url = new URL(pageURL);
      const host = url.hostname.toLowerCase().replace(/\.$/, '');
      return (url.protocol === 'https:' || url.protocol === 'http:') &&
        Boolean(host) && host !== 'appassets.androidplatform.net';
    } catch (_) { return false; }
  }

  function project(lat, lon, zoom) {
    if (!coordinate(lat, lon) || !Number.isFinite(zoom)) return null;
    const scale = TILE * Math.pow(2, zoom);
    const clamped = Math.min(MAX_LAT, Math.max(-MAX_LAT, lat));
    const sine = Math.sin(clamped * Math.PI / 180);
    return {
      x: (lon + 180) / 360 * scale,
      y: (0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * scale
    };
  }

  function unproject(x, y, zoom) {
    const scale = TILE * Math.pow(2, zoom);
    const wrappedX = ((x % scale) + scale) % scale;
    const boundedY = Math.max(0, Math.min(scale, y));
    return {
      lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * boundedY / scale))) * 180 / Math.PI,
      lon: wrappedX / scale * 360 - 180
    };
  }

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = String(text);
    return node;
  }

  function style() {
    if (document.getElementById(STYLE_ID)) return;
    const node = document.createElement('style');
    node.id = STYLE_ID;
    node.textContent = `
      .atlas-map{position:relative;isolation:isolate;width:100%;height:100%;min-height:260px;overflow:hidden;background:#0b1829;color:#ece7da;border:1px solid #33456b;border-radius:18px;font-family:inherit;touch-action:none;cursor:grab;user-select:none}
      .atlas-map:focus-visible{outline:3px solid #e8b33c;outline-offset:3px}.atlas-map.atlas-map-dragging{cursor:grabbing}
      .atlas-map-grid{position:absolute;inset:0;background-image:linear-gradient(#20324799 1px,transparent 1px),linear-gradient(90deg,#20324799 1px,transparent 1px);background-size:64px 64px;opacity:.75;pointer-events:none}
      .atlas-map-tiles,.atlas-map-shapes,.atlas-map-markers{position:absolute;inset:0;pointer-events:none}
      .atlas-map-tiles img{position:absolute;width:256px;height:256px;max-width:none;border:0;pointer-events:none;user-select:none}
      .atlas-map-shapes{width:100%;height:100%;overflow:hidden}.atlas-map-parcel{fill:#e8b33c16;stroke:#e8b33c;stroke-width:1.5;vector-effect:non-scaling-stroke}.atlas-map-line{fill:none;stroke:#6fc5df;stroke-width:2;vector-effect:non-scaling-stroke}.atlas-map-feature-point{fill:#6fc5df;stroke:#071022;stroke-width:2}
      .atlas-map-pin,.atlas-map-poi{position:absolute;transform:translate(-50%,-50%);pointer-events:auto;display:grid;place-items:center;border:2px solid #f0cf6d;border-radius:50%;background:#e8b33c;color:#071022;width:35px;height:35px;padding:0;font-size:17px;line-height:1;box-shadow:0 3px 12px #0008;cursor:pointer}
      .atlas-map-pin.atlas-map-selected{width:46px;height:46px;font-size:23px;border:3px solid #f9e5a4;z-index:3;box-shadow:0 0 0 9px #e8b33c20,0 4px 18px #0009}.atlas-map-pin:focus-visible,.atlas-map-poi:focus-visible{outline:3px solid white;outline-offset:5px}
      .atlas-map-poi{width:27px;height:27px;font-size:12px;border:1px solid #9aaeca;background:#1d3552;color:#edf5ff;border-radius:8px}
      .atlas-map-pin-label{position:absolute;top:calc(100% + 9px);left:50%;transform:translateX(-50%);font:600 11px/1.35 system-ui,sans-serif;color:#f7edd2;background:#0b1429ed;border:1px solid #526078;border-radius:6px;max-width:210px;min-width:90px;padding:5px 9px;white-space:normal;text-align:center;pointer-events:none}
      .atlas-map-controls{position:absolute;right:12px;top:12px;display:flex;flex-direction:column;gap:6px;z-index:7}.atlas-map-controls button{display:grid;place-items:center;width:38px;height:38px;border:1px solid #50617e;border-radius:10px;background:#0e1b33ed;color:#ece7da;font:600 22px/1 system-ui;cursor:pointer}.atlas-map-controls button:hover{background:#253b5a}.atlas-map-controls button:focus-visible{outline:3px solid #e8b33c;outline-offset:2px}
      .atlas-map-badge{position:absolute;left:12px;top:12px;right:62px;width:max-content;max-width:calc(100% - 78px);padding:6px 9px;border:1px solid #3e536d;border-radius:7px;background:#071124e8;font:600 10px/1.4 system-ui,sans-serif;letter-spacing:.035em;pointer-events:none;z-index:6}
      .atlas-map-caption{position:absolute;bottom:0;left:0;right:0;padding:8px 12px;background:#071124eb;font:10px/1.45 system-ui,sans-serif;color:#b7c6df;z-index:6;cursor:default;user-select:text}.atlas-map-caption a{color:#e8b33c;text-decoration:underline}.atlas-map-caption-meta{display:block;color:#8da0c6;margin-top:2px}
      .atlas-map-scale{position:absolute;left:12px;bottom:58px;z-index:6;color:#d8e4f4;font:10px/1.2 system-ui;text-shadow:0 1px 2px #000;pointer-events:none}.atlas-map-scale-bar{display:block;border:2px solid #d8e4f4;border-top:0;height:6px;margin-top:4px}
      .atlas-map-empty{height:100%;min-height:260px;display:flex;flex-direction:column;gap:8px;align-items:center;justify-content:center;padding:28px;text-align:center;box-sizing:border-box;background:radial-gradient(ellipse at center,#162744,#0a1429);color:#b7c6df}.atlas-map-empty strong{font-size:18px;color:#ece7da}.atlas-map-empty span{max-width:390px;font-size:13px;line-height:1.6}
      @media(prefers-reduced-motion:no-preference){.atlas-map-pin{transition:box-shadow .15s,background .15s}}
    `;
    document.head.appendChild(node);
  }

  function render(container, options) {
    if (!container || typeof container.appendChild !== 'function') throw new TypeError('Map container is required.');
    options = options || {};
    style();
    if (container.__atlasMap) container.__atlasMap.destroy();
    container.replaceChildren();
    const incidents = Array.isArray(options.incidents) ? options.incidents.slice(0, 1000) : [];
    const selected = options.incident || incidents.find(i => coordinate(i.lat, i.lon));
    const notices = new Set();
    const notice = message => {
      if (!notices.has(message)) {
        notices.add(message);
        if (typeof options.onNotice === 'function') options.onNotice(message);
      }
    };
    const host = el('div', 'atlas-map');
    host.tabIndex = 0;
    host.setAttribute('role', 'region');
    host.setAttribute('aria-label', 'Incident map. Arrow keys pan; plus and minus zoom.');
    container.appendChild(host);
    let alive = true;
    let frame = null;
    const cleanup = [];
    let resizeObserver = null;

    function destroy() {
      if (!alive) return;
      alive = false;
      if (frame !== null) cancelAnimationFrame(frame);
      if (resizeObserver) resizeObserver.disconnect();
      cleanup.forEach(fn => fn());
      if (container.__atlasMap === api) delete container.__atlasMap;
      host.remove();
    }
    const api = { destroy, zoomIn: () => zoomBy(1), zoomOut: () => zoomBy(-1), reset: () => reset() };
    container.__atlasMap = api;

    if (!selected || !coordinate(selected.lat, selected.lon)) {
      const empty = el('div', 'atlas-map-empty');
      empty.append(el('strong', '', 'Location not established'));
      empty.append(el('span', '', 'This record has no valid coordinates. No approximate city pin or parcel location has been substituted.'));
      host.appendChild(empty);
      return api;
    }

    let zoom = 15;
    let center = {lat: Math.max(-MAX_LAT, Math.min(MAX_LAT, selected.lat)), lon: selected.lon};
    let width = 640;
    let height = 360;
    let tileFailure = false;
    const tileNodes = new Map();
    const grid = el('div', 'atlas-map-grid');
    const tiles = el('div', 'atlas-map-tiles');
    const shapes = document.createElementNS(SVG, 'svg');
    shapes.setAttribute('class', 'atlas-map-shapes');
    shapes.setAttribute('aria-hidden', 'true');
    const markers = el('div', 'atlas-map-markers');
    const badge = el('div', 'atlas-map-badge');
    const caption = el('div', 'atlas-map-caption');
    const scale = el('div', 'atlas-map-scale');
    const controls = el('div', 'atlas-map-controls');
    host.append(grid, tiles, shapes, markers, badge, controls, scale, caption);

    function button(label, text, action) {
      const b = el('button', '', text);
      b.type = 'button'; b.title = label; b.setAttribute('aria-label', label);
      b.addEventListener('click', event => {event.stopPropagation(); action();});
      controls.appendChild(b);
    }
    button('Zoom in', '+', () => zoomBy(1));
    button('Zoom out', '−', () => zoomBy(-1));
    button('Center selected incident', '⌖', () => reset());

    const requestedMode = ['street', 'satellite', 'parcel'].includes(options.mode) ? options.mode : 'schematic';
    const features = options.geojson && options.geojson.type === 'FeatureCollection' && Array.isArray(options.geojson.features)
      ? options.geojson.features.slice(0, 2000) : [];
    const publicToken = typeof options.token === 'string' && /^pk\.[A-Za-z0-9._-]+$/.test(options.token) ? options.token : null;
    const streetAllowed = streetOriginAllowed(root.location && root.location.href);
    let mode = requestedMode;
    if (requestedMode === 'street' && !streetAllowed) {
      mode = 'schematic';
      notice('Street tiles require a hosted HTTP(S) page; use external map links or an authorized provider.');
    }
    if (requestedMode === 'satellite' && !publicToken) {
      mode = 'schematic';
      notice('Satellite imagery needs a Mapbox public access token in Settings.');
    }
    function offline() { return typeof navigator !== 'undefined' && navigator.onLine === false; }
    function liveMode() { return !offline() && (mode === 'street' || mode === 'satellite'); }
    function dimensions() {
      width = Math.max(1, host.clientWidth || container.clientWidth || 640);
      height = Math.max(260, host.clientHeight || container.clientHeight || 360);
      shapes.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }
    function position(lat, lon) {
      const p = project(lat, lon, zoom);
      const c = project(center.lat, center.lon, zoom);
      if (!p || !c) return null;
      const world = TILE * Math.pow(2, zoom);
      let delta = p.x - c.x;
      if (delta > world / 2) delta -= world;
      if (delta < -world / 2) delta += world;
      return {x: width / 2 + delta, y: height / 2 + p.y - c.y};
    }
    function requestDraw() {
      if (!alive || frame !== null) return;
      frame = requestAnimationFrame(() => { frame = null; if (alive) draw(); });
    }
    function zoomBy(delta) {
      if (!alive || !selected || !coordinate(selected.lat, selected.lon)) return;
      zoom = Math.max(3, Math.min(19, zoom + delta));
      requestDraw();
    }
    function reset() {
      if (!alive || !selected || !coordinate(selected.lat, selected.lon)) return;
      center = {lat:Math.max(-MAX_LAT, Math.min(MAX_LAT, selected.lat)), lon:selected.lon}; zoom = 15; requestDraw();
    }
    function drawTiles() {
      const needed = new Set();
      if (liveMode()) {
        const c = project(center.lat, center.lon, zoom);
        const n = Math.pow(2, zoom);
        const left = c.x - width / 2, top = c.y - height / 2;
        for (let x = Math.floor(left / TILE); x <= Math.floor((left + width - 1) / TILE); x++) {
          for (let y = Math.floor(top / TILE); y <= Math.floor((top + height - 1) / TILE); y++) {
            if (y < 0 || y >= n) continue;
            const wrappedX = ((x % n) + n) % n;
            const key = `${mode}:${zoom}:${x}:${y}`;
            needed.add(key);
            let tile = tileNodes.get(key);
            if (!tile) {
              tile = document.createElement('img');
              tile.alt = ''; tile.draggable = false;
              tile.decoding = 'async';
              tile.referrerPolicy = 'strict-origin-when-cross-origin';
              tile.addEventListener('error', () => {
                if (!alive || !tile.isConnected) return;
                tileFailure = true; updateCaption();
                notice('Some map tiles could not load. The coordinate markers remain visible; the basemap may be incomplete.');
              }, {once:true});
              tile.src = mode === 'street'
                ? `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${y}.png`
                : `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/256/${zoom}/${wrappedX}/${y}?access_token=${encodeURIComponent(publicToken)}`;
              tiles.appendChild(tile); tileNodes.set(key, tile);
            }
            tile.style.left = `${Math.round(x * TILE - left)}px`;
            tile.style.top = `${Math.round(y * TILE - top)}px`;
          }
        }
      }
      for (const [key, node] of tileNodes) {
        if (!needed.has(key)) {node.remove(); tileNodes.delete(key);}
      }
    }
    function shapePath(coordinates, close) {
      if (!Array.isArray(coordinates) || coordinates.length > 20000) return '';
      let points = [];
      for (const c of coordinates) {
        if (!Array.isArray(c) || !coordinate(c[1], c[0])) return '';
        const p = position(c[1], c[0]);
        points.push(`${points.length ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`);
      }
      return points.length ? points.join(' ') + (close ? ' Z' : '') : '';
    }
    function drawShapes() {
      shapes.replaceChildren();
      let vertexCount = 0;
      let shapeCount = 0;
      function path(coordinates, close, label) {
        if (!Array.isArray(coordinates)) return;
        vertexCount += coordinates.length;
        if (vertexCount > 100000 || shapeCount++ > 5000) return;
        const d = shapePath(coordinates, close);
        if (!d) return;
        const node = document.createElementNS(SVG, 'path');
        node.setAttribute('d', d);
        node.setAttribute('class', close ? 'atlas-map-parcel' : 'atlas-map-line');
        if (label) { const title = document.createElementNS(SVG, 'title'); title.textContent = label; node.appendChild(title); }
        shapes.appendChild(node);
      }
      function geometry(g, label, depth) {
        if (!g || depth > 6) return;
        const c = g.coordinates;
        if (g.type === 'Polygon' && Array.isArray(c)) {
          const rings = c.slice(0,100);
          vertexCount += rings.reduce((sum,ring)=>sum+(Array.isArray(ring)?ring.length:0),0);
          if (vertexCount > 100000 || shapeCount++ > 5000) return;
          const d = rings.map(ring=>shapePath(ring,true)).filter(Boolean).join(' ');
          if (!d) return;
          const node=document.createElementNS(SVG,'path');
          node.setAttribute('d',d);node.setAttribute('class','atlas-map-parcel');node.setAttribute('fill-rule','evenodd');
          if (label) {const title=document.createElementNS(SVG,'title');title.textContent=label;node.appendChild(title);}
          shapes.appendChild(node);
        }
        else if (g.type === 'MultiPolygon' && Array.isArray(c)) c.slice(0,500).forEach(p => geometry({type:'Polygon',coordinates:p},label,depth+1));
        else if (g.type === 'LineString') path(c, false, label);
        else if (g.type === 'MultiLineString' && Array.isArray(c)) c.slice(0,500).forEach(line => path(line,false,label));
        else if (g.type === 'GeometryCollection' && Array.isArray(g.geometries)) g.geometries.slice(0,500).forEach(item => geometry(item,label,depth+1));
        else if (g.type === 'Point' && Array.isArray(c) && coordinate(c[1],c[0]) && shapeCount++ < 5000) {
          const p = position(c[1],c[0]);
          const node = document.createElementNS(SVG,'circle');
          node.setAttribute('cx',p.x); node.setAttribute('cy',p.y); node.setAttribute('r',4);
          node.setAttribute('class','atlas-map-feature-point');
          if (label) {const title=document.createElementNS(SVG,'title'); title.textContent=label; node.appendChild(title);}
          shapes.appendChild(node);
        }
      }
      features.forEach(feature => {
        const props = feature && feature.properties || {};
        geometry(feature && feature.geometry, String(props.name || props.address || props.parcel_id || '').slice(0,200),0);
      });
      if (vertexCount > 100000) notice('This map import is too large to draw completely. Use a smaller local GeoJSON area.');
    }
    function drawMarkers() {
      markers.replaceChildren();
      const unique = new Map();
      incidents.forEach(i => {if (i && coordinate(i.lat,i.lon)) unique.set(i.id,i);});
      unique.set(selected.id, selected);
      unique.forEach(i => {
        const p = position(i.lat,i.lon);
        if (!p || p.x < -50 || p.x > width + 50 || p.y < -50 || p.y > height + 50) return;
        const isSelected = i.id === selected.id;
        const pin = el('button', `atlas-map-pin${isSelected ? ' atlas-map-selected' : ''}`, i.emoji || '●');
        pin.type = 'button';
        const label = `${i.demo ? 'Training: ' : ''}${i.title || 'Incident'}${i.address ? ' — '+i.address : ''}`;
        pin.title = label; pin.setAttribute('aria-label',label);
        pin.style.left = `${p.x}px`; pin.style.top = `${p.y}px`;
        pin.addEventListener('click', event => {event.stopPropagation(); if (typeof options.onSelect === 'function') options.onSelect(i.id);});
        if (isSelected) pin.appendChild(el('span','atlas-map-pin-label',i.demo ? 'TRAINING SCENARIO' : (i.title || 'Selected incident')));
        markers.appendChild(pin);
      });
      const pois = Array.isArray(selected.pois) ? selected.pois.slice(0,200) : [];
      pois.forEach(poi => {
        if (!poi || !coordinate(poi.lat,poi.lon)) return;
        const p = position(poi.lat,poi.lon);
        if (p.x < 0 || p.x > width || p.y < 0 || p.y > height) return;
        const pin = el('button','atlas-map-poi',poi.kind === 'hydrant' ? 'H' : poi.kind === 'hospital' ? '+' : '◆');
        pin.type = 'button';
        const label = `${selected.demo ? 'Training POI: ' : 'Imported POI: '}${poi.name || poi.kind || 'Point'}${poi.notes ? ' — '+poi.notes : ''}`;
        pin.title = label; pin.setAttribute('aria-label',label);
        pin.style.left = `${p.x}px`; pin.style.top = `${p.y}px`;
        pin.addEventListener('click',event => {event.stopPropagation(); notice(label);});
        markers.appendChild(pin);
      });
    }
    function link(label, url) {
      const a = el('a','',label); a.href=url; a.target='_blank'; a.rel='noopener noreferrer'; return a;
    }
    function updateCaption() {
      caption.replaceChildren();
      const isLive = liveMode();
      if (isLive && mode === 'street') {
        caption.append('© ',link('OpenStreetMap contributors','https://www.openstreetmap.org/copyright'));
      } else if (isLive && mode === 'satellite') {
        caption.append(link('© Mapbox','https://www.mapbox.com/about/maps/'),' · ',link('© OpenStreetMap','https://www.openstreetmap.org/copyright'),' · ',link('Improve this map','https://apps.mapbox.com/feedback/'));
      } else {
        caption.append(features.length ? 'Imported geographic overlay — basemap unavailable.' : 'Coordinate overview — no street or parcel basemap loaded.');
      }
      const source = options.geojson && (options.geojson.source || (options.geojson.properties && options.geojson.properties.source));
      let meta = `Center ${center.lat.toFixed(5)}, ${center.lon.toFixed(5)} · zoom ${zoom}`;
      if (features.length) meta += ` · ${features.length} imported features${typeof source === 'string' ? ' · '+source.slice(0,160) : ' · source not supplied'}`;
      if (selected.demo) meta += ' · Fictional training records';
      caption.appendChild(el('span','atlas-map-caption-meta',meta));
      let text = isLive ? (mode === 'street' ? 'STREET MAP' : 'SATELLITE IMAGERY') : (features.length ? 'IMPORTED GEOJSON' : 'COORDINATE OVERVIEW');
      if (requestedMode === 'satellite' && !publicToken) text = 'SATELLITE: ADD MAPBOX TOKEN';
      if (requestedMode === 'street' && !streetAllowed) text = 'STREET: HOSTED PAGE REQUIRED';
      if (offline()) text = 'OFFLINE · '+(features.length ? 'IMPORTED GEOJSON' : 'COORDINATE OVERVIEW');
      if (tileFailure && isLive) text += ' · INCOMPLETE BASEMAP';
      badge.textContent = text;
    }
    function drawScale() {
      const metersPerPixel = 156543.03392804097 * Math.cos(center.lat * Math.PI / 180) / Math.pow(2,zoom);
      const target = metersPerPixel * Math.min(100,width/4);
      const magnitude = Math.pow(10,Math.floor(Math.log10(Math.max(target,.001))));
      let distance = magnitude;
      for (const factor of [1,2,5]) if (factor*magnitude <= target) distance = factor*magnitude;
      scale.replaceChildren(document.createTextNode(distance >= 1000 ? `${distance/1000} km` : `${Math.round(distance)} m`));
      const bar=el('span','atlas-map-scale-bar'); bar.style.width=`${Math.max(1,distance/metersPerPixel)}px`; scale.appendChild(bar);
    }
    function draw() {
      dimensions();
      const c=project(center.lat,center.lon,zoom);
      grid.style.backgroundPosition=`${Math.round(width/2-c.x)%64}px ${Math.round(height/2-c.y)%64}px`;
      drawTiles(); drawShapes(); drawMarkers(); updateCaption(); drawScale();
    }
    function pan(dx,dy) {
      const c=project(center.lat,center.lon,zoom);
      center=unproject(c.x-dx,c.y-dy,zoom); requestDraw();
    }
    let dragging = null;
    function pointerDown(event) {
      if (event.button !== 0 || event.target.closest('button,a')) return;
      dragging={x:event.clientX,y:event.clientY,id:event.pointerId};
      host.setPointerCapture(event.pointerId); host.classList.add('atlas-map-dragging');
    }
    function pointerMove(event) {
      if (!dragging || event.pointerId!==dragging.id) return;
      pan(event.clientX-dragging.x,event.clientY-dragging.y);
      dragging.x=event.clientX;dragging.y=event.clientY;
    }
    function pointerUp(event) {
      if (!dragging || event.pointerId!==dragging.id) return;
      dragging=null; host.classList.remove('atlas-map-dragging');
      if (host.hasPointerCapture(event.pointerId)) host.releasePointerCapture(event.pointerId);
    }
    function keyDown(event) {
      if (event.target!==host) return;
      const moves={ArrowLeft:[60,0],ArrowRight:[-60,0],ArrowUp:[0,60],ArrowDown:[0,-60]};
      if (moves[event.key]) {event.preventDefault();pan(...moves[event.key]);}
      else if (event.key==='+' || event.key==='=') {event.preventDefault();zoomBy(1);}
      else if (event.key==='-') {event.preventDefault();zoomBy(-1);}
      else if (event.key==='Home') {event.preventDefault();reset();}
    }
    function on(target,name,handler,config) {target.addEventListener(name,handler,config);cleanup.push(()=>target.removeEventListener(name,handler,config));}
    on(host,'pointerdown',pointerDown);on(host,'pointermove',pointerMove);on(host,'pointerup',pointerUp);on(host,'pointercancel',pointerUp);on(host,'keydown',keyDown);
    on(window,'online',requestDraw);on(window,'offline',requestDraw);
    if (typeof ResizeObserver!=='undefined') {resizeObserver=new ResizeObserver(requestDraw);resizeObserver.observe(host);} else on(window,'resize',requestDraw);
    draw();
    return api;
  }

  const exported = { render, project, unproject, coordinate, streetOriginAllowed };
  root.AtlasMap = exported;
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
})(typeof window !== 'undefined' ? window : globalThis);
