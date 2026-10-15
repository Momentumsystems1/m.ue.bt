/* Road Command Center — GEM/PC1512 investor edition.
   Public map and weather data is distinguished from explicitly simulated convoy.
   No key or participant coordinates are saved to persistent browser storage. */
(()=>{'use strict';
const $=id=>document.getElementById(id), esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const cities={barcelona:{lat:41.3874,lng:2.1699},madrid:{lat:40.4168,lng:-3.7038},valencia:{lat:39.4699,lng:-.3763},bilbao:{lat:43.2630,lng:-2.9350}};
const S={city:'barcelona',center:{...cities.barcelona},point:null,monitor:null,select:'start',start:null,end:null,stops:[],route:null,routeSteps:[],routeDistance:0,routeDuration:0,poi:[],incidents:[],live:[],convoy:[],convoyTimer:null,roomId:null,peer:null,conns:[],googleKey:'',tomtomKey:'',provider:'maplibre',gm:null,gmMarkers:[],gmRoute:null,googleTraffic:null,gmReady:false,libre:null,libreMarkers:[],libreRoute:false,flow:false,poistatus:'not-loaded',timeSeen:null,meet:null,roomStatus:'offline'};
const DEG=Math.PI/180, fmt=p=>p?`${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`:'SIN FIJAR';
function log(message){const t=new Date().toLocaleTimeString('es-ES',{hour12:false});const el=document.createElement('div');el.textContent=`${t} · ${message}`;$('logBody').prepend(el);while($('logBody').children.length>30)$('logBody').lastElementChild.remove();}
function say(message){$('mapHint').textContent=message;log(message)}
function alertDialog(html){$('dialogContent').innerHTML=html;$('dialogOverlay').hidden=false;}
function closeDialog(){$('dialogOverlay').hidden=true;}
$('closeDialog').onclick=closeDialog;$('confirmDialog').onclick=closeDialog;$('dialogOverlay').addEventListener('click',e=>{if(e.target===$('dialogOverlay'))closeDialog()});
const fail=(name,e)=>{log(`${name}: ${e?.message||String(e)}`);};
function bbox(){const map=S.provider==='google'?S.gm:S.libre;let b;
 if(S.provider==='google'&&map?.getBounds()){const r=map.getBounds();b={w:r.getSouthWest().lng(),s:r.getSouthWest().lat(),e:r.getNorthEast().lng(),n:r.getNorthEast().lat()};}
 else if(map?.getBounds()){const r=map.getBounds();b={w:r.getWest(),s:r.getSouth(),e:r.getEast(),n:r.getNorth()};}
 if(!b)return [S.center.lng-.16,S.center.lat-.11,S.center.lng+.16,S.center.lat+.11];
 return [Math.max(-180,b.w),Math.max(-85,b.s),Math.min(180,b.e),Math.min(85,b.n)];}
function centerAt(p,zoom=13){if(!p)return;S.center={...p};if(S.provider==='google'&&S.gm){S.gm.setCenter(p);S.gm.setZoom(zoom);}else if(S.libre){S.libre.flyTo({center:[p.lng,p.lat],zoom,duration:700});} $('mapPosition').textContent=fmt(p).replace(',',' ·');updateWeather().catch(e=>fail('Clima',e));}
function markerElement(label,cls='marker-person',title=''){const el=document.createElement('div');el.className=cls;el.textContent=label;el.title=title;return el;}
function mapClick(p){S.point=p;$('coordinateReadout').textContent='POS: '+fmt(p);$('mapPosition').textContent=fmt(p).replace(',',' ·');
 if(S.select==='start'){S.start=p;S.select='end';say('Origen seleccionado. Ahora seleccione el destino en el mapa.');}
 else if(S.select==='end'){S.end=p;S.select='point';say('Destino seleccionado. Pulse calcular ruta o añada paradas.');}
 else if(S.select==='stop'){S.stops.push(p);S.select='point';say('Parada añadida. Recalcule la ruta para incorporarla.');}
 else if(S.select==='meet'){createMeet(p);S.select='point';}
 else{say('Punto seleccionado · '+fmt(p)+' · Pulse VIGILAR o QUEDADA para utilizarlo.');}
 updateLabels();redraw();}
function mapRightClick(p){S.point=p;createMeet(p);updateLabels();redraw();}
function updateLabels(){$('startLabel').textContent=fmt(S.start);$('endLabel').textContent=fmt(S.end);$('stopsList').innerHTML=S.stops.length?S.stops.map((p,i)=>`<div class="stop">${i+1}. ${fmt(p)} <button data-remove-stop="${i}" title="Quitar parada">×</button></div>`).join(''):'Sin paradas.';
 $('monitorBtn').disabled=!S.point;$('copyMeet').disabled=!S.meet;$('mapActionState').textContent='MODO: '+({start:'ORIGEN',end:'DESTINO',stop:'PARADA',meet:'QUEDADA',point:'EXPLORAR'}[S.select]||S.select);
 document.querySelectorAll('[data-remove-stop]').forEach(b=>b.onclick=()=>{S.stops.splice(Number(b.dataset.removeStop),1);S.route=null;updateLabels();redraw()});}
function setMode(mode){S.select=mode;updateLabels();const names={start:'Pulsa en el mapa para fijar el origen.',end:'Pulsa en el mapa para fijar el destino.',stop:'Pulsa en una gasolinera o punto del mapa para añadir una parada.',meet:'Pulsa en el mapa para crear una quedada.'};say(names[mode]||'Mapa operativo.');}
function redraw(){if(S.libre){for(const m of S.libreMarkers)m.remove();S.libreMarkers=[];
 const add=(p,label,cls,detail,click)=>{if(!p||!Number.isFinite(p.lat)||!Number.isFinite(p.lng))return;const el=markerElement(label,cls,detail);if(click)el.addEventListener('click',e=>{e.stopPropagation();click()});const m=new maplibregl.Marker({element:el}).setLngLat([p.lng,p.lat]).addTo(S.libre);S.libreMarkers.push(m);};
 add(S.start,'A','marker-person','Origen');add(S.end,'B','marker-target','Destino');S.stops.forEach((p,i)=>add(p,String(i+1),'marker-poi','Parada '+(i+1)));
 if(S.monitor)add(S.monitor,'◈','marker-meet','Punto vigilado');if(S.meet)add(S.meet,'◎','marker-meet','Quedada activa');
 S.poi.forEach((p,i)=>{if(!$('layer'+({fuel:'Fuel',charge:'Charge',parking:'Parking',health:'Health'}[p.kind]||''))?.checked)return;add(p,p.icon,'marker-poi',p.name,()=>{S.point=p;alertDialog(`<b>${esc(p.name)}</b><p>Origen: OpenStreetMap / Overpass · ubicación real registrada en OSM, sin comprobación de disponibilidad.</p><p>${fmt(p)}</p><button id="addPoiStop">＋ Añadir como parada</button>`);$('addPoiStop').onclick=()=>{S.stops.push({lat:p.lat,lng:p.lng});closeDialog();updateLabels();redraw();say('Parada OSM añadida: '+p.name);};});});
 S.incidents.forEach(p=>add(p,'!','marker-target',p.description,()=>alertDialog(`<strong>TomTom Traffic · incidencia real</strong><p>${esc(p.description)}</p><p>${fmt(p)}</p>`)));
 S.live.forEach((p,i)=>add(p,String(i+1),'marker-person','PERSONA REAL: '+p.name));S.convoy.forEach((p,i)=>add(p,'D'+(i+1),'marker-convoy','SIMULACIÓN · vehículo ficticio'));
 if(S.libre.isStyleLoaded()){const feature={type:'Feature',geometry:{type:'LineString',coordinates:S.route?.coordinates||[]},properties:{}};
 if(S.libre.getSource('routeLine'))S.libre.getSource('routeLine').setData(feature);else{S.libre.addSource('routeLine',{type:'geojson',data:feature});S.libre.addLayer({id:'routeStroke',type:'line',source:'routeLine',paint:{'line-color':'#ffffff','line-width':9,'line-opacity':.8}});S.libre.addLayer({id:'routeLine',type:'line',source:'routeLine',paint:{'line-color':'#343489','line-width':5}});}}
 }
 if(S.gm&&S.provider==='google'){for(const m of S.gmMarkers)m.setMap(null);S.gmMarkers=[];
 const add=(p,label,color,callback)=>{if(!p)return;const m=new google.maps.Marker({map:S.gm,position:p,label:{text:String(label),color:'#fff'},icon:{path:google.maps.SymbolPath.CIRCLE,fillColor:color,fillOpacity:1,strokeColor:'#fff',strokeWeight:2,scale:15}});if(callback)m.addListener('click',callback);S.gmMarkers.push(m);};
 add(S.start,'A','#343489');add(S.end,'B','#742d63');S.stops.forEach((p,i)=>add(p,i+1,'#ad7138'));if(S.meet)add(S.meet,'◎','#35765a');if(S.monitor)add(S.monitor,'◈','#35765a');S.live.forEach((p,i)=>add(p,i+1,'#2b488c'));S.convoy.forEach((p,i)=>add(p,'D'+(i+1),'#b24d2b'));
 S.poi.forEach(p=>{if($('layer'+({fuel:'Fuel',charge:'Charge',parking:'Parking',health:'Health'}[p.kind]||''))?.checked)add(p,p.icon,'#8e672f',()=>{S.point=p;say('POI seleccionado: '+p.name);})});S.incidents.forEach(p=>add(p,'!','#b52d28',()=>alertDialog(`<b>TomTom: ${esc(p.description)}</b>`)));
 if(S.gmRoute)S.gmRoute.setMap(null);if(S.route)S.gmRoute=new google.maps.Polyline({map:S.gm,path:S.route.coordinates.map(p=>({lat:p[1],lng:p[0]})),strokeColor:'#343489',strokeWeight:5,strokeOpacity:.95});}
}
function initLibre(){if(!window.maplibregl){$('mapDataState').textContent='MAPA NO DISPONIBLE · CDN';say('No se pudo descargar MapLibre. Revise Internet.');return;}
 S.libre=new maplibregl.Map({container:'map',style:'https://tiles.openfreemap.org/styles/liberty',center:[S.center.lng,S.center.lat],zoom:11,attributionControl:true,dragRotate:true,pitchWithRotate:true});
 S.libre.addControl(new maplibregl.NavigationControl({showCompass:true}),'bottom-right');
 S.libre.on('load',()=>{$('mapDataState').textContent='OSM: CARTOGRAFÍA OPERATIVA';$('footerLive').textContent='CARTOGRAFÍA: OPENFREEMAP';redraw();log('Cartografía OpenFreeMap cargada');});
 S.libre.on('error',e=>{if(e.error)fail('Mapa base',e.error)});
 S.libre.on('click',e=>mapClick({lat:e.lngLat.lat,lng:e.lngLat.lng}));S.libre.on('contextmenu',e=>mapRightClick({lat:e.lngLat.lat,lng:e.lngLat.lng}));S.libre.on('mousemove',e=>{$('coordinateReadout').textContent='POS: '+e.lngLat.lat.toFixed(5)+', '+e.lngLat.lng.toFixed(5)});
}
function googleInit(){if(S.gmReady)return;S.gmReady=true;S.gm=new google.maps.Map($('googleMap'),{center:S.center,zoom:11,mapTypeControl:false,streetViewControl:false,fullscreenControl:false,mapId:null});S.gm.addListener('click',e=>mapClick({lat:e.latLng.lat(),lng:e.latLng.lng()}));S.gm.addListener('rightclick',e=>mapRightClick({lat:e.latLng.lat(),lng:e.latLng.lng()}));if($('layerTraffic').checked){S.googleTraffic=new google.maps.TrafficLayer();S.googleTraffic.setMap(S.gm);}redraw();}
function loadGoogle(){if(!S.googleKey){alertDialog('<b>Google Maps necesita una clave propia.</b><p>Introduce una clave de Google Maps JavaScript API restringida por dominio en PROVEEDORES / API. Hasta entonces puedes utilizar cartografía real OpenFreeMap y abrir una navegación en Google Maps sin clave.</p>');return;}
 $('map').hidden=true;$('googleMap').hidden=false;S.provider='google';$('btnGoogle').classList.add('selected');$('btnMapLibre').classList.remove('selected');$('mapDataState').textContent='GOOGLE MAPS · MAPA REAL';
 if(window.google?.maps){googleInit();return;}
 window.__rccGoogleInit=googleInit;const sc=document.createElement('script');sc.src='https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(S.googleKey)+'&callback=__rccGoogleInit&v=weekly';sc.async=true;sc.onerror=()=>{say('Error al cargar Google Maps: revisa la clave y su restricción HTTP.');loadLibre()};document.head.appendChild(sc);
}
function loadLibre(){$('googleMap').hidden=true;$('map').hidden=false;S.provider='maplibre';$('btnMapLibre').classList.add('selected');$('btnGoogle').classList.remove('selected');$('mapDataState').textContent='OSM · OPENFREEMAP';S.libre?.resize();redraw();}
async function jsonFetch(url,ms=13000){const ctrl=new AbortController();const t=setTimeout(()=>ctrl.abort(),ms);try{const r=await fetch(url,{signal:ctrl.signal,headers:{'Accept':'application/json'}});if(!r.ok)throw new Error('HTTP '+r.status);return await r.json()}finally{clearTimeout(t)}}
let weatherToken=0;
async function updateWeather(){const tk=++weatherToken,{lat,lng}=S.center;
 try{const [a,b]=await Promise.allSettled([
 jsonFetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m,wind_gusts_10m&timezone=auto&forecast_days=1`),
 jsonFetch(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=european_aqi,pm2_5&timezone=auto`)]);
 if(tk!==weatherToken)return;
 if(a.status==='fulfilled'){const x=a.value.current||{};$('temperature').textContent=Number.isFinite(x.temperature_2m)?`${Math.round(x.temperature_2m)} °C`:'—';$('windGust').textContent=Number.isFinite(x.wind_gusts_10m)?`${Math.round(x.wind_gusts_10m)} km/h`:'—';$('windSpeed').textContent=Number.isFinite(x.wind_speed_10m)?`${Math.round(x.wind_speed_10m)} km/h`:'—';}
 if(b.status==='fulfilled')$('airQuality').textContent=b.value.current?.european_aqi??'—';
 $('weatherState').textContent=`Open-Meteo ${a.status==='fulfilled'?'METEO ✓':'METEO ERROR'} · ${b.status==='fulfilled'?'AQI ✓':'AQI ERROR'} · modelo/estimación, no sensor local`;
 }catch(e){fail('Meteorología',e)} }
async function geocode(){const q=$('address').value.trim();if(q.length<3){say('Escribe una dirección con al menos tres caracteres.');return;}
 $('addressFeedback').textContent='Buscando dirección…';try{const items=await jsonFetch('https://nominatim.openstreetmap.org/search?'+new URLSearchParams({q,format:'json',limit:'3',addressdetails:'1'}));if(!items.length)throw new Error('No se encontró la dirección');
 const x=items[0],p={lat:Number(x.lat),lng:Number(x.lon)};S.point=p;centerAt(p,15);$('addressFeedback').textContent=x.display_name.slice(0,115);redraw();updateLabels();log('Dirección geocodificada con OSM Nominatim: '+q);}
 catch(e){$('addressFeedback').textContent='Geocodificación no disponible: '+e.message;fail('Geocodificación',e)}}
function useGps(){if(!navigator.geolocation){say('GPS no disponible en el navegador');return;}navigator.geolocation.getCurrentPosition(pos=>{const p={lat:pos.coords.latitude,lng:pos.coords.longitude};S.start=p;S.point=p;centerAt(p,15);S.select='end';updateLabels();redraw();say('Origen GPS fijado con permiso del navegador. Selecciona destino.')},e=>say('GPS: '+e.message),{enableHighAccuracy:true,timeout:15000,maximumAge:20000});}
async function calculateRoute(){if(!S.start||!S.end){alertDialog('<b>Ruta incompleta.</b><p>Selecciona primero el origen y el destino en el mapa. Puedes añadir paradas en gasolineras o aparcamientos.</p>');return;}
 const pts=[S.start,...S.stops,S.end];const coords=pts.map(p=>`${p.lng.toFixed(6)},${p.lat.toFixed(6)}`).join(';');$('routeSummary').textContent='CALCULANDO RUTA…';
 try{const d=await jsonFetch(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=true`,19000);if(d.code!=='Ok'||!d.routes?.length)throw new Error(d.message||'Sin recorrido');
 const r=d.routes[0];S.route=r.geometry;S.routeDistance=r.distance;S.routeDuration=r.duration;S.routeSteps=r.legs?.flatMap(l=>l.steps||[])||[];
 $('routeSummary').textContent=`${(r.distance/1000).toFixed(1)} KM · ${Math.round(r.duration/60)} MIN · ${S.stops.length} PARADAS`;
 say('Ruta REAL calculada con OSRM sobre OpenStreetMap. El tiempo NO incluye tráfico TomTom.');redraw();fitRoute(r.geometry.coordinates);
 const list=S.routeSteps.filter(x=>x.maneuver?.type!=='depart').slice(0,5).map(x=>`<li>${esc(x.maneuver?.modifier||x.maneuver?.type||'Continuar')} · ${esc(x.name||'vía sin nombre')} (${Math.round(x.distance)} m)</li>`).join('');
 alertDialog(`<b>Ruta calculada · OpenStreetMap / OSRM</b><p>${(r.distance/1000).toFixed(1)} km · ${Math.round(r.duration/60)} min estimados, sin tráfico.</p>${list?`<ol>${list}</ol>`:''}<p>Usa «Abrir navegación Google» para indicaciones guiadas en la aplicación correspondiente.</p>`);
 }catch(e){$('routeSummary').textContent='RUTA NO DISPONIBLE';alertDialog(`<b>No se pudo calcular la ruta</b><p>${esc(e.message)}</p><p>El servidor público de pruebas OSRM no garantiza disponibilidad para uso comercial.</p>`);fail('Ruta OSRM',e)}}
function fitRoute(coords){if(!coords?.length)return;if(S.provider==='google'&&S.gm){const b=new google.maps.LatLngBounds();coords.forEach(([lng,lat])=>b.extend({lat,lng}));S.gm.fitBounds(b,65)}else if(S.libre){let mins=[Infinity,Infinity],maxs=[-Infinity,-Infinity];coords.forEach(c=>{mins=[Math.min(mins[0],c[0]),Math.min(mins[1],c[1])];maxs=[Math.max(maxs[0],c[0]),Math.max(maxs[1],c[1])]});S.libre.fitBounds([mins,maxs],{padding:65,maxZoom:15,duration:550})}}
function googleRoute(){if(!S.start||!S.end){say('Selecciona origen y destino para abrir navegación.');return;}const p=x=>`${x.lat},${x.lng}`;const u=new URL('https://www.google.com/maps/dir/');u.searchParams.set('api','1');u.searchParams.set('origin',p(S.start));u.searchParams.set('destination',p(S.end));u.searchParams.set('travelmode','driving');if(S.stops.length)u.searchParams.set('waypoints',S.stops.map(p).join('|'));window.open(u.toString(),'_blank','noopener,noreferrer')}
const kindTag={fuel:'amenity=fuel',charge:'amenity=charging_station',parking:'amenity=parking',health:'amenity=hospital'};
const kindIcon={fuel:'⛽',charge:'⚡',parking:'P',health:'+'};
async function loadPoi(){const active=['fuel','charge','parking','health'].filter(k=>$('layer'+({fuel:'Fuel',charge:'Charge',parking:'Parking',health:'Health'}[k])).checked);
 if(!active.length){S.poi=[];redraw();return;}
 const {lat,lng}=S.center;const clause=active.map(k=>`node[${kindTag[k]}](around:4000,${lat},${lng});way[${kindTag[k]}](around:4000,${lat},${lng});`).join('');const query=`[out:json][timeout:15];(${clause});out center 60;`;
 say('Consultando puntos de interés reales en OpenStreetMap…');
 try{const d=await jsonFetch('https://overpass.kumi.systems/api/interpreter?data='+encodeURIComponent(query),25000);
 const items=(d.elements||[]).slice(0,85).map(x=>{let kind=active.find(k=>Object.entries(x.tags||{}).some(([a,b])=>kindTag[k]===a+'='+b));return {id:x.id,name:x.tags?.name||({fuel:'Estación de servicio',charge:'Punto de recarga',parking:'Aparcamiento',health:'Hospital'}[kind]||'Punto de interés'),kind,icon:kindIcon[kind],lat:x.lat??x.center?.lat,lng:x.lon??x.center?.lon};}).filter(x=>Number.isFinite(x.lat)&&Number.isFinite(x.lng)&&x.kind);
 S.poi=items;log(`${items.length} POI OSM cargados (${active.join(', ')})`);redraw();
 }catch(e){S.poi=[];redraw();say('OSM Overpass no respondió; no se muestran puntos inventados. '+e.message);}}
function flattestCoords(c){if(!Array.isArray(c))return null;if(typeof c[0]==='number'&&typeof c[1]==='number')return c;for(const i of c){const f=flattestCoords(i);if(f)return f}return null;}
async function loadTraffic(){if(!S.tomtomKey){$('trafficStatus').textContent='TomTom: requiere clave';$('incidentList').innerHTML='<p class="muted">Introduce una clave TomTom válida y pulsa Aplicar.</p>';S.incidents=[];applyTrafficLayer();redraw();return;}
 $('trafficStatus').textContent='TomTom: actualizando…';const b=bbox();const fields='{incidents{type,geometry{type,coordinates},properties{iconCategory,magnitudeOfDelay,events{description,code},startTime,endTime,from,to,length,delay,roadNumbers}}}';
 const u='https://api.tomtom.com/traffic/services/5/incidentDetails?'+new URLSearchParams({key:S.tomtomKey,bbox:b.join(','),fields,language:'es-ES',timeValidityFilter:'present'});
 try{const data=await jsonFetch(u,15000);S.incidents=(data.incidents||[]).slice(0,100).map((i,n)=>{const pair=flattestCoords(i.geometry?.coordinates);const p=i.properties||{};return pair?{id:n,lat:pair[1],lng:pair[0],description:p.events?.[0]?.description||p.from||'Incidencia de tráfico',severity:p.magnitudeOfDelay??0,from:p.from,to:p.to,road:p.roadNumbers?.join(', ')}:null}).filter(Boolean);
 $('trafficStatus').textContent=`TomTom · ${S.incidents.length} incidencias reales`;drawIncidentList();redraw();applyTrafficLayer();log(`TomTom real: ${S.incidents.length} incidencias en área visible`);}
 catch(e){$('trafficStatus').textContent='TomTom: sin conexión ('+e.message+')';S.incidents=[];drawIncidentList();fail('TomTom Traffic',e)}}
function drawIncidentList(){const incidents=S.monitor?S.incidents.map(i=>({...i,distance:distanceKm(i,S.monitor)})).sort((a,b)=>a.distance-b.distance):S.incidents;
 $('incidentList').innerHTML=incidents.length?incidents.slice(0,18).map((p,i)=>`<div class="event" data-event="${S.incidents.indexOf(incidents[i])>=0?S.incidents.indexOf(incidents[i]):S.incidents.findIndex(x=>x.id===p.id)}"><span class="sev">!</span><div><b>${esc(p.description)}</b><small>${esc(p.road||p.from||'Área del mapa')} ${Number.isFinite(p.distance)?`· ${p.distance.toFixed(1)} km del punto vigilado`:''}</small></div></div>`).join(''):'<p class="muted">No hay incidencias verificadas para mostrar en el área consultada.</p>';
 document.querySelectorAll('[data-event]').forEach(e=>e.onclick=()=>{const p=S.incidents[Number(e.dataset.event)];if(p){centerAt(p,14);S.point=p;redraw();alertDialog(`<b>TomTom · incidencia</b><p>${esc(p.description)}</p><p>${fmt(p)}</p>`)}});
}
function distanceKm(a,b){const dlat=(a.lat-b.lat)*DEG,dlng=(a.lng-b.lng)*DEG,q=Math.sin(dlat/2)**2+Math.cos(a.lat*DEG)*Math.cos(b.lat*DEG)*Math.sin(dlng/2)**2;return 12742*Math.asin(Math.sqrt(q));}
function applyTrafficLayer(){if(S.provider==='google'&&S.gm){if(S.googleTraffic){S.googleTraffic.setMap(null);S.googleTraffic=null;}if($('layerTraffic').checked){S.googleTraffic=new google.maps.TrafficLayer();S.googleTraffic.setMap(S.gm)}return;}
 if(!S.libre?.isStyleLoaded())return;const id='tomtomFlow';if(S.libre.getLayer(id))S.libre.removeLayer(id);if(S.libre.getSource(id))S.libre.removeSource(id);
 if(!$('layerTraffic').checked||!S.tomtomKey)return;
 S.libre.addSource(id,{type:'raster',tiles:[`https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${encodeURIComponent(S.tomtomKey)}`],tileSize:256,attribution:'TomTom Traffic'});S.libre.addLayer({id,type:'raster',source:id,paint:{'raster-opacity':.75}});
}
function monitorPoint(){const p=S.point||S.center;S.monitor={...p};$('monitorBtn').disabled=false;drawIncidentList();redraw();say('Punto vigilado: '+fmt(p)+'. Al actualizar se ordenan incidencias por cercanía.');}
function createMeet(p){S.meet={...p};S.point=p;redraw();updateLabels();say('QUEDADA establecida: '+fmt(p)+' · comparte el enlace para acudir.');}
function copyText(s){return navigator.clipboard?.writeText(s).then(()=>true).catch(()=>fallbackCopy(s))||Promise.resolve(fallbackCopy(s));}
function fallbackCopy(s){const t=document.createElement('textarea');t.value=s;document.body.appendChild(t);t.select();document.execCommand('copy');t.remove();return true;}
function meetLink(){if(!S.meet){createMeet(S.point||S.center)}const p=S.meet;return `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;}
let peerHost=null;
function createCircle(){if(!window.Peer){alertDialog('<b>Conexión en tiempo real no disponible</b><p>PeerJS no se ha cargado. Comprueba Internet y utiliza la demo de convoy simulado.</p>');return;}
 if(peerHost){say('El círculo ya está activo. Comparte las invitaciones con los participantes.');return;}
 const id='rcc-'+Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');S.roomId=id;
 try{peerHost=new Peer(id,{debug:0});S.peer=peerHost;peerHost.on('open',()=>{S.roomStatus='ready';$('circleCode').textContent='CÍRCULO ACTIVO · Invitación temporal lista · 0/2 conectados';say('Círculo de consentimiento activo. Invita hasta dos personas reales.');});
 peerHost.on('connection',conn=>{if(S.conns.length>=2){conn.on('open',()=>conn.close());return;}S.conns.push(conn);conn.on('data',d=>{if(!d||typeof d!=='object')return;const lat=Number(d.lat),lng=Number(d.lng);if(d.type==='location'&&Math.abs(lat)<=90&&Math.abs(lng)<=180&&Number.isFinite(lat)&&Number.isFinite(lng)){
 const ex=S.live.find(p=>p.id===conn.peer);if(ex){ex.lat=lat;ex.lng=lng;ex.updated=Date.now();}else S.live.push({id:conn.peer,name:String(d.name||'Participante').slice(0,24),lat,lng,updated:Date.now()});drawPeople();redraw();}
 if(d.type==='stop'){S.live=S.live.filter(p=>p.id!==conn.peer);drawPeople();redraw();}});
 conn.on('close',()=>{S.conns=S.conns.filter(c=>c!==conn);S.live=S.live.filter(p=>p.id!==conn.peer);drawPeople();redraw();});});
 peerHost.on('error',e=>{say('Círculo: '+e.message);S.roomStatus='error';});
 }catch(e){fail('Círculo',e);alertDialog('<b>No se pudo crear el círculo.</b><p>La conexión privada requiere acceso a la red de señalización.</p>')}
}
function inviteLink(){if(!S.roomId)return null;const url=new URL(window.location.href);url.search='';url.hash='';url.searchParams.set('join',S.roomId);return url.toString();}
function invitePeople(){const link=inviteLink();if(!link){alertDialog('<b>Primero crea un círculo.</b>');return;}copyText(link).then(()=>{alertDialog(`<b>Enlace de invitación copiado.</b><p>Envíalo a un máximo de dos personas. Deben abrirlo en el móvil por HTTPS, aceptar compartir su ubicación y mantener la pestaña abierta.</p><p style="overflow-wrap:anywhere;font-size:10px">${esc(link)}</p><p><strong>REAL Y CONSENTIDO</strong> · sin historial; transmisión peer-to-peer (servicio de señalización de PeerJS).</p>`);});}
function drawPeople(){$('peopleList').innerHTML=S.live.length?S.live.map((p,i)=>`<div class="person"><i></i> ${esc(p.name)} · GPS REAL · ${Math.round((Date.now()-p.updated)/1000)}s</div>`).join(''):'<div class="person"><i class="off"></i> No hay participantes conectados</div>';
 $('circleCode').textContent=S.roomId?`CÍRCULO ACTIVO · ${S.live.length}/2 personas reales`:'Círculo no iniciado.';}
function interpolateRoute(t,off=0){const coords=S.route?.coordinates;if(coords?.length>3){const n=Math.min(coords.length-2,Math.max(0,Math.floor(t*(coords.length-1))));const f=t*(coords.length-1)-n;return{lat:coords[n][1]+(coords[n+1][1]-coords[n][1])*f+off*.0003,lng:coords[n][0]+(coords[n+1][0]-coords[n][0])*f+off*.0004};}const a=S.start||S.center,b=S.end||{lat:a.lat+.023,lng:a.lng+.016};return{lat:a.lat+(b.lat-a.lat)*t+off*.0008,lng:a.lng+(b.lng-a.lng)*t+off*.0008};}
function startConvoy(){if(S.convoyTimer)return;const init=Date.now();$('stopConvoy').disabled=false;$('startConvoy').disabled=true;$('convoyState').textContent='SIMULADO · EN MARCHA';say('Convoy de demostración iniciado · posiciones FICTICIAS.');
 S.convoyTimer=setInterval(()=>{const t=((Date.now()-init)/90000)%1;S.convoy=[interpolateRoute(t),interpolateRoute(Math.max(0,t-.035),1)];redraw();},1000);S.convoy=[interpolateRoute(0),interpolateRoute(0,1)];redraw();drawPeople();}
function stopConvoy(){clearInterval(S.convoyTimer);S.convoyTimer=null;S.convoy=[];$('stopConvoy').disabled=true;$('startConvoy').disabled=false;$('convoyState').textContent='INACTIVO';redraw();say('Convoy simulado detenido.');}
function applyKeys(){S.googleKey=$('googleKey').value.trim();S.tomtomKey=$('tomtomKey').value.trim();$('providerFeedback').textContent=`Google ${S.googleKey?'configurado':'sin clave'} · TomTom ${S.tomtomKey?'configurado':'sin clave'} · memoria de esta pestaña, sin guardar.`;if(S.tomtomKey)loadTraffic();else{S.incidents=[];redraw();}if(S.provider==='google'&&S.googleKey)loadGoogle();applyTrafficLayer();log('Configuración de proveedores aplicada (sin registrar secretos)');}
function bootShare(){const code=new URLSearchParams(location.search).get('join');if(!code||!/^rcc-[a-f0-9]{32}$/.test(code))return false;
 $('app').hidden=true;$('joinView').hidden=false;let p=null,conn=null,watch=null;const state=x=>$('joinStatus').textContent=x;
 const stop=()=>{if(watch!==null)navigator.geolocation.clearWatch(watch);watch=null;try{conn?.send({type:'stop'});conn?.close();p?.destroy();}catch{}conn=null;p=null;state('Has dejado de compartir.');$('joinStart').disabled=false;};
 $('joinStop').onclick=stop;window.addEventListener('beforeunload',stop);
 $('joinStart').onclick=()=>{const name=$('joinName').value.trim();if(!name){state('Introduce tu nombre.');return;}if(!navigator.geolocation||!window.Peer){state('El navegador no permite ubicación/PeerJS. Abre la página por HTTPS.');return;}
 $('joinStart').disabled=true;state('Conectando al círculo…');p=new Peer(undefined,{debug:0});p.on('open',()=>{conn=p.connect(code,{reliable:true});conn.on('open',()=>{state('Conectado. El navegador solicitará autorización GPS.');watch=navigator.geolocation.watchPosition(pos=>{conn?.send({type:'location',name,lat:pos.coords.latitude,lng:pos.coords.longitude});state('Compartiendo ubicación con tu círculo · GPS actualizado '+new Date().toLocaleTimeString());},e=>{state('Ubicación: '+e.message);}, {enableHighAccuracy:true,maximumAge:5000,timeout:15000});});conn.on('close',()=>{state('Organizador desconectado.');if(watch!==null){navigator.geolocation.clearWatch(watch);watch=null}});});p.on('error',e=>{state('Error de conexión: '+e.message);$('joinStart').disabled=false;});};return true;}
function bind(){for(const b of document.querySelectorAll('[data-city]'))b.onclick=()=>{const name=b.dataset.city;S.city=name;document.querySelectorAll('[data-city]').forEach(x=>x.classList.toggle('selected',x===b));centerAt(cities[name],12);if(S.start===null)setMode('start');log('Centro operativo: '+name.toUpperCase());};
 $('searchBtn').onclick=geocode;$('address').addEventListener('keydown',e=>{if(e.key==='Enter')geocode()});$('monitorBtn').onclick=monitorPoint;$('setStart').onclick=()=>setMode('start');$('setEnd').onclick=()=>setMode('end');$('setStop').onclick=()=>setMode('stop');$('useGps').onclick=useGps;$('routeBtn').onclick=calculateRoute;$('openGoogleRoute').onclick=googleRoute;
 $('map2d').onclick=()=>{document.querySelectorAll('#map2d,#map3d').forEach(b=>b.classList.toggle('selected',b.id==='map2d'));if(S.provider==='google'&&S.gm)S.gm.setTilt(0);else S.libre?.easeTo({pitch:0,duration:500})};
 $('map3d').onclick=()=>{document.querySelectorAll('#map2d,#map3d').forEach(b=>b.classList.toggle('selected',b.id==='map3d'));if(S.provider==='google'&&S.gm)S.gm.setTilt(45);else S.libre?.easeTo({pitch:55,duration:500})};
 $('btnMapLibre').onclick=loadLibre;$('btnGoogle').onclick=loadGoogle;$('mapFullscreen').onclick=()=>{$('map').closest('.map-window')?.requestFullscreen?.().then(()=>{S.libre?.resize();if(window.google?.maps&&S.gm)google.maps.event.trigger(S.gm,'resize');}).catch(()=>{})};
 $('refreshLayers').onclick=()=>{loadPoi();if($('layerTraffic').checked)loadTraffic();applyTrafficLayer();};
 for(const key of ['Fuel','Charge','Parking','Health'])$('layer'+key).onchange=loadPoi;$('layerTraffic').onchange=()=>{applyTrafficLayer();if($('layerTraffic').checked)loadTraffic();else{S.incidents=[];drawIncidentList();redraw()}};
 $('reloadTraffic').onclick=loadTraffic;$('applyKeys').onclick=applyKeys;$('createCircle').onclick=createCircle;$('copyInvites').onclick=invitePeople;$('startConvoy').onclick=startConvoy;$('stopConvoy').onclick=stopConvoy;
 $('meetBtn').onclick=()=>{setMode('meet');say('Pulse un punto del mapa para crear una quedada, o use el último punto seleccionado.');};$('copyMeet').onclick=()=>copyText(meetLink()).then(()=>say('Enlace de quedada copiado al portapapeles.'));
 document.querySelectorAll('.file-icon').forEach(b=>b.onclick=()=>{document.querySelectorAll('.file-icon').forEach(x=>x.classList.toggle('active',x===b));if(b.dataset.action==='mode-route')setMode('start');if(b.dataset.action==='mode-monitor'){S.point=S.center;monitorPoint()};if(b.dataset.action==='mode-circle')createCircle();if(b.dataset.action==='show-poi'){$('layerFuel').checked=true;$('layerCharge').checked=true;loadPoi()}});
 document.querySelectorAll('[data-menu]').forEach(b=>b.onclick=()=>{const m=b.dataset.menu;if(m==='desk')alertDialog('<b>AMSTRAD PC1512 · GEM Desktop 2.0</b><p>Inspiración visual: ventanas rectangulares, menús superiores y 16 colores. Motor cartográfico moderno en ventana GEM.</p>');if(m==='file')alertDialog('<b>ROAD COMMAND CENTER</b><p>Usa las herramientas de la izquierda para calcular una ruta, añadir paradas y crear un círculo de consentimiento.</p>');if(m==='view')$('mapFullscreen').click();if(m==='options')document.querySelector('#googleKey').focus();});
 document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDialog();if(e.key==='F3'){e.preventDefault();$('layerFuel').checked=!$('layerFuel').checked;loadPoi()}if(e.key==='F5'){e.preventDefault();updateWeather();loadTraffic()}});
 $('dateClock').textContent=new Date().toLocaleString('es-ES',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).toUpperCase();
}
if(bootShare())return;bind();initLibre();updateLabels();updateWeather();setInterval(()=>{if(S.roomId)drawPeople();},10000);log('Fuentes distinguidas: OSM / Open-Meteo (real) · Convoy (simulado).');
})();