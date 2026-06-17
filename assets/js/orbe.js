/* ═══════════════════════════════════════════════════════════════
   MOMENTUM SYSTEMS — ORBE OS v1.0
   Sistema operativo gestual para pilot1
   ═══════════════════════════════════════════════════════════════ */

class OrbeOS {
  constructor() {
    this.state = 'idle';
    this.rings = { 1: false, 2: false };
    this.activeSatellites = new Set();
    this.currentMode = null;
    this.dialogOpen = false;
    this.friendData = null;
    this.decretos = null;
    this.measureState = { active: false, points: [] };

    this.satelliteConfigs = {
      default: [
        { id: 'measure', icon: '📏', label: 'Medir', angle: 0 },
        { id: 'layers', icon: '🗂️', label: 'Capas', angle: 72 },
        { id: 'route', icon: '🛣️', label: 'Ruta', angle: 144 },
        { id: 'report', icon: '📊', label: 'Informe', angle: 216 },
        { id: 'view3d', icon: '▧', label: '3D', angle: 288 }
      ],
      measure: [
        { id: 'pointStart', icon: '◉', label: 'Inicio', angle: 0 },
        { id: 'pointEnd', icon: '◉', label: 'Final', angle: 90 },
        { id: 'leaveMap', icon: '📍', label: 'En mapa', angle: 180 },
        { id: 'denunciar', icon: '🚨', label: 'Denunciar', angle: 270 }
      ],
      denunciar: [
        { id: 'barrera', icon: '🚧', label: 'Barrera', angle: 0 },
        { id: 'noInclusiva', icon: '♿', label: 'No inclusiva', angle: 72 },
        { id: 'cocheAcera', icon: '🚗', label: 'Coche acera', angle: 144 },
        { id: 'obstaculo', icon: '🛑', label: 'Obstáculo', angle: 216 },
        { id: 'iluminacion', icon: '💡', label: 'Iluminación', angle: 288 },
        { id: 'bache', icon: '🕳️', label: 'Bache', angle: 360 }
      ]
    };

    this.init();
  }

  async init() {
    this.createDOM();
    this.bindEvents();
    await this.loadDecretos();
    this.startFriendSimulation();
    this.showToast('Orbe OS activado · Click para explorar');
  }

  createDOM() {
    const container = document.createElement('div');
    container.className = 'orbe-container';
    container.id = 'orbeOS';

    const ring2 = document.createElement('div');
    ring2.className = 'orbe-ring orbe-ring-2';
    ring2.id = 'orbeRing2';
    container.appendChild(ring2);

    const ring1 = document.createElement('div');
    ring1.className = 'orbe-ring orbe-ring-1';
    ring1.id = 'orbeRing1';
    container.appendChild(ring1);

    const core = document.createElement('div');
    core.className = 'orbe-core';
    core.id = 'orbeCore';
    core.innerHTML = 'M';
    core.title = 'Momentum Orbe OS · Click para menú · Click derecho para opciones';
    container.appendChild(core);

    const overlay = document.createElement('div');
    overlay.className = 'orbe-overlay';
    overlay.id = 'orbeOverlay';
    document.body.appendChild(overlay);

    const dialog = document.createElement('div');
    dialog.className = 'orbe-dialog';
    dialog.id = 'orbeDialog';
    document.body.appendChild(dialog);

    const toast = document.createElement('div');
    toast.className = 'orbe-toast';
    toast.id = 'orbeToast';
    document.body.appendChild(toast);

    const friendPanel = document.createElement('div');
    friendPanel.className = 'friend-activity-panel';
    friendPanel.id = 'friendActivityPanel';
    friendPanel.innerHTML = `
      <div class="friend-activity-header">
        <div class="friend-dot"></div>
        <h4>Amigo conectado</h4>
      </div>
      <div class="friend-activity-content" id="friendActivityContent">
        Esperando actividad...
      </div>
    `;
    document.body.appendChild(friendPanel);

    document.body.appendChild(container);
  }

  bindEvents() {
    const core = document.getElementById('orbeCore');
    const overlay = document.getElementById('orbeOverlay');

    core.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleRing(1);
    });

    core.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.showContextMenu(e);
    });

    overlay.addEventListener('click', () => {
      this.closeAll();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeAll();
    });
  }

  toggleRing(ringNum) {
    const ring = document.getElementById(`orbeRing${ringNum}`);
    const core = document.getElementById('orbeCore');
    const overlay = document.getElementById('orbeOverlay');

    if (this.rings[ringNum]) {
      this.closeRing(ringNum);
      core.classList.remove('active');
      overlay.classList.remove('visible');
      this.rings[ringNum] = false;
      this.currentMode = null;
    } else {
      this.closeAll();
      ring.classList.add('visible', 'spin-slow');
      core.classList.add('active');
      overlay.classList.add('visible');
      this.rings[ringNum] = true;
      this.currentMode = 'default';
      this.spawnSatellites(ringNum, this.satelliteConfigs.default);
    }
  }

  closeRing(ringNum) {
    const ring = document.getElementById(`orbeRing${ringNum}`);
    ring.classList.remove('visible', 'spin-slow', 'spin-fast');

    const satellites = ring.querySelectorAll('.orbe-satellite');
    satellites.forEach(sat => {
      sat.style.opacity = '0';
      sat.style.transform = 'scale(0)';
      setTimeout(() => sat.remove(), 300);
    });
    this.activeSatellites.clear();
  }

  closeAll() {
    this.closeRing(1);
    this.closeRing(2);
    document.getElementById('orbeCore').classList.remove('active');
    document.getElementById('orbeOverlay').classList.remove('visible');
    this.closeDialog();
    this.rings = { 1: false, 2: false };
    this.currentMode = null;
  }

  spawnSatellites(ringNum, config) {
    const ring = document.getElementById(`orbeRing${ringNum}`);
    const ringSize = ringNum === 1 ? 70 : 130;
    const containerSize = 120;
    const center = containerSize / 2;

    config.forEach((sat, i) => {
      const el = document.createElement('div');
      el.className = 'orbe-satellite entering';
      el.dataset.id = sat.id;
      el.innerHTML = `
        ${sat.icon}
        <span class="sat-label">${sat.label}</span>
      `;

      const angleRad = (sat.angle * Math.PI) / 180;
      const x = center + ringSize * Math.cos(angleRad) - 24;
      const y = center + ringSize * Math.sin(angleRad) - 24;

      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.animationDelay = (i * 0.05) + 's';

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleSatelliteClick(sat.id);
      });

      ring.appendChild(el);
      this.activeSatellites.add(sat.id);

      setTimeout(() => el.classList.add('visible'), 50 + i * 50);
    });
  }

  handleSatelliteClick(id) {
    document.querySelectorAll('.orbe-satellite').forEach(s => s.classList.remove('active'));
    document.querySelector(`[data-id="${id}"]`)?.classList.add('active');

    switch(id) {
      case 'measure':
        this.switchMode('measure');
        break;
      case 'layers':
        this.showToast('Capas: Usa el panel izquierdo');
        this.triggerExisting('layers');
        break;
      case 'route':
        this.showToast('Ruta: Panel izquierdo activado');
        this.triggerExisting('route');
        break;
      case 'report':
        this.showToast('Informe operativo generado');
        this.triggerExisting('report');
        break;
      case 'view3d':
        this.showToast('Vista 3D activada');
        this.triggerExisting('view3d');
        break;
      case 'pointStart':
        this.startMeasure('start');
        break;
      case 'pointEnd':
        this.startMeasure('end');
        break;
      case 'leaveMap':
        this.showDialog('leaveMap');
        break;
      case 'denunciar':
        this.switchMode('denunciar');
        break;
      case 'barrera':
      case 'noInclusiva':
      case 'cocheAcera':
      case 'obstaculo':
      case 'iluminacion':
      case 'bache':
        this.showDenunciaDetail(id);
        break;
      default:
        this.showToast(`Acción: ${id}`);
    }
  }

  switchMode(mode) {
    this.closeRing(1);
    this.rings[1] = false;

    const ring2 = document.getElementById('orbeRing2');
    ring2.classList.add('visible', 'spin-slow');
    this.rings[2] = true;
    this.currentMode = mode;

    if (this.satelliteConfigs[mode]) {
      this.spawnSatellites(2, this.satelliteConfigs[mode]);
    }

    this.showToast(`Modo: ${mode.toUpperCase()}`);
  }

  startMeasure(phase) {
    if (phase === 'start') {
      this.measureState.active = true;
      this.measureState.points = [];
      this.showDialog('measureStart');
    } else if (phase === 'end') {
      if (this.measureState.points.length < 1) {
        this.showToast('Primero marca el punto de inicio');
        return;
      }
      this.showDialog('measureEnd');
    }
  }

  showDialog(type, data = {}) {
    const dialog = document.getElementById('orbeDialog');
    let content = '';

    switch(type) {
      case 'measureStart':
        content = `
          <div class="orbe-dialog-header">
            <h4>📏 Medir calle</h4>
            <button class="orbe-dialog-close" onclick="orbe.closeDialog()">✕</button>
          </div>
          <div class="orbe-dialog-body">
            <p>Haz click en el mapa para marcar el <b>punto de inicio</b> de la medición.</p>
            <p style="color:rgba(255,255,255,0.5);font-size:11px;">El sistema calculará distancia, calle y coordenadas automáticamente.</p>
          </div>
          <div class="orbe-dialog-actions">
            <button class="orbe-dialog-btn" onclick="orbe.closeDialog()">Cancelar</button>
            <button class="orbe-dialog-btn primary" onclick="orbe.simulateMapClick('start')">Simular click</button>
          </div>
        `;
        break;

      case 'measureEnd':
        content = `
          <div class="orbe-dialog-header">
            <h4>📏 Finalizar medición</h4>
            <button class="orbe-dialog-close" onclick="orbe.closeDialog()">✕</button>
          </div>
          <div class="orbe-dialog-body">
            <p>Haz click en el mapa para marcar el <b>punto final</b>.</p>
            <p>¿Qué quieres hacer con esta medición?</p>
          </div>
          <div class="orbe-dialog-actions">
            <button class="orbe-dialog-btn" onclick="orbe.closeDialog()">Cancelar</button>
            <button class="orbe-dialog-btn primary" onclick="orbe.simulateMapClick('end')">Marcar final</button>
          </div>
        `;
        break;

      case 'leaveMap':
        content = `
          <div class="orbe-dialog-header">
            <h4>📍 Guardar en mapa</h4>
            <button class="orbe-dialog-close" onclick="orbe.closeDialog()">✕</button>
          </div>
          <div class="orbe-dialog-body">
            <p>La medición se guardará como marcador permanente en el mapa.</p>
            <p style="color:rgba(255,255,255,0.5);font-size:11px;">Visible para todos los usuarios de la sesión.</p>
          </div>
          <div class="orbe-dialog-actions">
            <button class="orbe-dialog-btn" onclick="orbe.closeDialog()">Cancelar</button>
            <button class="orbe-dialog-btn primary" onclick="orbe.saveToMap(); orbe.closeDialog()">Guardar</button>
          </div>
        `;
        break;

      case 'denunciaDetail':
        const den = data.denuncia;
        content = `
          <div class="orbe-dialog-header">
            <h4>${den.icono} ${den.nombre}</h4>
            <button class="orbe-dialog-close" onclick="orbe.closeDialog()">✕</button>
          </div>
          <div class="orbe-dialog-body">
            <p><b>Competencia:</b> ${den.competencia}</p>
            <p><b>Plazo respuesta:</b> ${den.plazo_respuesta}</p>
            <p><b>Sanción:</b> ${den.sancion}</p>
            <p style="margin-top:12px"><b>Base legal:</b></p>
            ${den.decretos.map(d => `
              <p style="font-size:11px;color:rgba(255,255,255,0.6);margin:4px 0;padding-left:12px;border-left:2px solid rgba(0,229,255,0.3)">
                <b>${d.ref}</b> · ${d.titulo}<br>
                <span style="color:rgba(255,255,255,0.4)">${d.articulo}</span>
              </p>
            `).join('')}
          </div>
          <div class="orbe-dialog-actions">
            <button class="orbe-dialog-btn" onclick="orbe.closeDialog()">Cerrar</button>
            <button class="orbe-dialog-btn primary" onclick="orbe.generateDenunciaReport('${den.id}')">Generar informe</button>
            <button class="orbe-dialog-btn danger" onclick="orbe.submitDenuncia('${den.id}')">Denunciar</button>
          </div>
        `;
        break;

      case 'contextMenu':
        content = `
          <div class="orbe-dialog-header">
            <h4>⚙️ Opciones Orbe</h4>
            <button class="orbe-dialog-close" onclick="orbe.closeDialog()">✕</button>
          </div>
          <div class="orbe-dialog-body">
            <p>Configuración rápida del sistema operativo.</p>
          </div>
          <div class="orbe-dialog-actions">
            <button class="orbe-dialog-btn" onclick="orbe.togglePresentationMode(); orbe.closeDialog()">🎬 Modo presentación</button>
            <button class="orbe-dialog-btn" onclick="orbe.showToast('Debug: ON'); orbe.closeDialog()">🔧 Debug</button>
            <button class="orbe-dialog-btn danger" onclick="orbe.closeDialog()">Cerrar</button>
          </div>
        `;
        break;
    }

    dialog.innerHTML = content;
    dialog.classList.add('visible');
    this.dialogOpen = true;

    const orbeRect = document.getElementById('orbeOS').getBoundingClientRect();
    dialog.style.left = (orbeRect.left - 320) + 'px';
    dialog.style.top = (orbeRect.top - 100) + 'px';

    if (orbeRect.left < 400) {
      dialog.style.left = (orbeRect.right + 20) + 'px';
    }
    if (orbeRect.top < 200) {
      dialog.style.top = '120px';
    }
  }

  closeDialog() {
    document.getElementById('orbeDialog').classList.remove('visible');
    this.dialogOpen = false;
  }

  showDenunciaDetail(id) {
    const denuncia = this.decretos?.categorias.find(c => c.id === id);
    if (denuncia) {
      this.showDialog('denunciaDetail', { denuncia });
    }
  }

  showContextMenu(e) {
    this.showDialog('contextMenu');
    const dialog = document.getElementById('orbeDialog');
    dialog.style.left = e.clientX + 'px';
    dialog.style.top = e.clientY + 'px';
  }

  simulateMapClick(phase) {
    this.closeDialog();

    if (phase === 'start') {
      this.measureState.points.push({ lat: 40.4168, lng: -3.7038, type: 'start' });
      this.showToast('✓ Punto de inicio marcado · Ahora marca el final');
      setTimeout(() => {
        this.updateFriendActivity('Ha marcado un punto de inicio cerca de tu ubicación');
      }, 2000);
    } else {
      this.measureState.points.push({ lat: 40.4180, lng: -3.7050, type: 'end' });
      this.showMeasurementResult();
    }
  }

  showMeasurementResult() {
    const [start, end] = this.measureState.points;
    const report = document.getElementById('report');
    if (report) {
      report.innerHTML = `
        <div style="padding:12px">
          <h4 style="color:#00e5ff;margin:0 0 8px">📏 Medición completada</h4>
          <p style="margin:4px 0;font-size:12px"><b>Desde:</b> Calle Alcalá 50, Madrid<br>
          <b>Hasta:</b> Gran Vía 1, Madrid</p>
          <p style="margin:4px 0;font-size:12px"><b>Distancia:</b> 1.2 km<br>
          <b>Tiempo estimado:</b> 4 min<br>
          <b>CO₂ evitado:</b> 180g</p>
          <p style="margin:8px 0 0;font-size:11px;color:rgba(255,255,255,0.5)">
            Haz click en "Denunciar" si detectas incidencias en esta ruta.
          </p>
        </div>
      `;
    }
    this.showToast('✓ Medición completada · Ver panel de informe');
    this.closeAll();
  }

  saveToMap() {
    this.showToast('📍 Medición guardada en el mapa');
  }

  generateDenunciaReport(id) {
    const den = this.decretos?.categorias.find(c => c.id === id);
    if (!den) return;

    const report = document.getElementById('report');
    if (report) {
      report.innerHTML = `
        <div style="padding:12px">
          <h4 style="color:#ff5252;margin:0 0 8px">🚨 Informe de denuncia</h4>
          <p style="margin:4px 0;font-size:12px"><b>Tipo:</b> ${den.nombre}</p>
          <p style="margin:4px 0;font-size:12px"><b>Ubicación:</b> Calle detectada, Madrid</p>
          <p style="margin:4px 0;font-size:12px"><b>Competencia:</b> ${den.competencia}</p>
          <p style="margin:4px 0;font-size:11px;color:rgba(255,255,255,0.6)">
            <b>Base legal aplicable:</b><br>
            ${den.decretos.map(d => `• ${d.ref}: ${d.articulo}`).join('<br>')}
          </p>
          <p style="margin:8px 0 0;font-size:11px;color:rgba(255,255,255,0.5)">
            Este informe puede presentarse ante ${den.competencia}.
            Plazo de respuesta: ${den.plazo_respuesta}.
          </p>
        </div>
      `;
    }
    this.closeAll();
    this.showToast('📋 Informe generado · Revisa el panel de informe');
  }

  submitDenuncia(id) {
    this.showToast('🚨 Denuncia enviada · Ref: #' + Math.random().toString(36).substr(2, 6).toUpperCase());
    this.closeAll();
  }

  triggerExisting(action) {
    const map = window.map;
    switch(action) {
      case 'layers':
        document.getElementById('layers')?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'route':
        document.getElementById('routeFrom')?.focus();
        break;
      case 'view3d':
        if (map) {
          map.easeTo({ pitch: 60, bearing: 30, duration: 1500 });
        }
        break;
      case 'report':
        document.getElementById('report')?.scrollIntoView({ behavior: 'smooth' });
        break;
    }
    this.closeAll();
  }

  startFriendSimulation() {
    this.friendData = {
      name: 'Raül',
      color: '#ff9100',
      position: { lat: 40.4175, lng: -3.7045 },
      activity: 'Explorando el mapa'
    };

    this.createMiniOrbe();

    setTimeout(() => {
      document.getElementById('friendActivityPanel')?.classList.add('visible');
    }, 3000);

    setInterval(() => {
      this.simulateFriendMovement();
    }, 8000);
  }

  createMiniOrbe() {
    const el = document.createElement('div');
    el.className = 'mini-orbe';
    el.id = 'miniOrbeFriend';
    el.innerHTML = `
      <div class="mini-ring"></div>
      <span style="z-index:2">R</span>
    `;
    el.title = 'Raül está aquí · Click para ver su actividad';

    if (window.map && window.mapboxgl) {
      new window.mapboxgl.Marker({ element: el })
        .setLngLat([this.friendData.position.lng, this.friendData.position.lat])
        .addTo(window.map);
    } else {
      el.style.position = 'fixed';
      el.style.left = '60%';
      el.style.top = '40%';
      document.body.appendChild(el);
    }
  }

  simulateFriendMovement() {
    const activities = [
      'Explorando restaurantes cerca de Sol',
      'Midiendo distancia a parking',
      'Consultando tráfico en Gran Vía',
      'Revisando capas de incidencias',
      'Marcando punto de interés'
    ];

    const activity = activities[Math.floor(Math.random() * activities.length)];
    this.friendData.activity = activity;
    this.updateFriendActivity(activity);
  }

  updateFriendActivity(text) {
    const content = document.getElementById('friendActivityContent');
    if (content) {
      content.innerHTML = `
        <span class="activity-action">${this.friendData.name}</span> está ahora:<br>
        ${text}
      `;
    }

    const detail = document.getElementById('detail');
    if (detail && text.includes('restaurantes')) {
      detail.innerHTML = `
        <div style="padding:8px">
          <p style="color:#ff9100;font-weight:600;margin:0 0 8px">👤 Actividad de ${this.friendData.name}</p>
          <p style="font-size:12px;margin:4px 0">${text}</p>
          <p style="font-size:11px;color:rgba(255,255,255,0.5);margin:8px 0 0">
            Puedes ver su ubicación en el mapa (mini-orbe naranja)
          </p>
        </div>
      `;
    }
  }

  showToast(message) {
    const toast = document.getElementById('orbeToast');
    toast.textContent = message;
    toast.classList.add('visible');

    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
    }, 3000);
  }

  togglePresentationMode() {
    document.body.classList.toggle('presentation-mode');
    this.showToast(document.body.classList.contains('presentation-mode') 
      ? '🎬 Modo presentación activado' 
      : '🎬 Modo presentación desactivado');
  }

  async loadDecretos() {
    try {
      const res = await fetch('assets/data/decretos.json');
      this.decretos = await res.json();
    } catch(e) {
      console.log('Orbe: usando decretos de fallback');
      this.decretos = { categorias: [] };
    }
  }
}

let orbe;
document.addEventListener('DOMContentLoaded', () => {
  orbe = new OrbeOS();
});
