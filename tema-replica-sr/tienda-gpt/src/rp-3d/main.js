// ReliefPath · modelo 3D interactivo en tiempo real.
// Se empaqueta con esbuild en assets/rp-3d.js (ver build.sh) y expone window.RP3D.mount(el).
// Todo el modelo es geometría procedural (sin archivos .glb): cuerpo tipo «puck» negro y rojo,
// panel superior con iconos, copa de cristal y anillo de luz roja dentro de la copa.
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, LatheGeometry, Vector2, Vector3, Color,
  MeshPhysicalMaterial, MeshStandardMaterial, MeshBasicMaterial, PMREMGenerator, ACESFilmicToneMapping,
  SRGBColorSpace, PointLight, DirectionalLight, CanvasTexture, Shape, ExtrudeGeometry, CylinderGeometry,
  TorusGeometry, PlaneGeometry, CircleGeometry, RingGeometry, SphereGeometry, Points, BufferGeometry,
  Float32BufferAttribute, PointsMaterial, AdditiveBlending, Sprite, SpriteMaterial, DoubleSide, MathUtils, BackSide
} from 'three';

const MODES = {
  // color: tono del anillo, partículas y reflejos · cam: posición de cámara · look: punto al que mira
  idle:   { color: '#d9b97f', cam: [0, 2.3, 6.1], look: [0, 0.05, 0] },
  succion:{ color: '#cfe3b4', cam: [1.2, 0.35, 6.0], look: [0, -0.12, 0] },
  calor:  { color: '#f08a43', cam: [-0.9, 2.6, 5.2], look: [0, 0.1, 0] },
  luz:    { color: '#ff3b30', cam: [0, -2.3, 5.2], look: [0, -0.1, 0] }
};
const CYCLE = ['succion', 'calor', 'luz'];

// Estudio fotográfico: fondo negro y softboxes en tira. Da reflejos limpios de producto
// (negro profundo con líneas de luz) en lugar de un entorno gris.
function studioEnv(renderer) {
  const sc = new Scene();
  sc.add(new Mesh(new SphereGeometry(20, 32, 16), new MeshBasicMaterial({ color: '#060707', side: BackSide })));
  const box = (w, h, pos, col, k) => {
    const m = new MeshBasicMaterial({ color: new Color(col).multiplyScalar(k), side: DoubleSide });
    const pl = new Mesh(new PlaneGeometry(w, h), m); pl.position.set(...pos); pl.lookAt(0, 0, 0); sc.add(pl);
  };
  box(6, 1.1, [0, 7, 2], '#ffffff', 2.4);       // cenital
  box(1.0, 6, [-7, 1.5, 3], '#ffffff', 3.2);    // tira izquierda
  box(0.8, 6, [7, 1, -3], '#e8c88f', 3.0);      // contraluz dorado
  box(5, 0.6, [0, -2, 7], '#ffffff', 0.9);      // relleno frontal bajo
  const pm = new PMREMGenerator(renderer); const tex = pm.fromScene(sc, 0.02).texture; pm.dispose(); return tex;
}

function radial(size, stops) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const t = new CanvasTexture(c); t.colorSpace = SRGBColorSpace; return t;
}

// Iconos del panel: encendido, succión, calor y luz. El activo se ilumina con el color del modo.
function drawPanel(canvas, mode, color) {
  const g = canvas.getContext('2d'); const W = canvas.width, H = canvas.height;
  g.clearRect(0, 0, W, H);
  const icons = ['power', 'succion', 'calor', 'luz'];
  icons.forEach((name, i) => {
    const x = W * (0.14 + i * 0.24), y = H / 2, on = name === mode || (name === 'power' && mode !== 'idle');
    g.save(); g.translate(x, y);
    g.strokeStyle = on ? color : 'rgba(240,230,210,.9)'; g.fillStyle = g.strokeStyle;
    g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round'; g.scale(1.75, 1.75);
    if (on) { g.shadowColor = color; g.shadowBlur = 26; }
    g.beginPath(); g.arc(0, 0, 40, 0, Math.PI * 2); g.globalAlpha = on ? 0.95 : 0.4; g.lineWidth = 3; g.stroke();
    g.globalAlpha = 1; g.lineWidth = 7; g.beginPath();
    if (name === 'power') { g.arc(0, 4, 20, -Math.PI * 0.32, Math.PI * 1.32); g.moveTo(0, -22); g.lineTo(0, 2); }
    if (name === 'succion') { for (let k = -1; k <= 1; k += 2) { g.moveTo(-22, k * 9); g.bezierCurveTo(-11, k * 9 - 12, -3, k * 9 + 12, 6, k * 9); g.bezierCurveTo(13, k * 9 - 10, 18, k * 9 - 4, 22, k * 9); } }
    if (name === 'calor') { g.moveTo(0, 24); g.bezierCurveTo(-20, 22, -22, 2, -8, -10); g.bezierCurveTo(-6, -2, -2, 0, 0, 2); g.bezierCurveTo(-2, -12, 4, -20, 6, -26); g.bezierCurveTo(14, -12, 22, 0, 18, 12); g.bezierCurveTo(16, 20, 8, 24, 0, 24); }
    if (name === 'luz') { g.arc(0, 0, 9, 0, Math.PI * 2); for (let a = 0; a < 8; a++) { const r = a * Math.PI / 4; g.moveTo(Math.cos(r) * 16, Math.sin(r) * 16); g.lineTo(Math.cos(r) * 25, Math.sin(r) * 25); } }
    g.stroke(); g.restore();
  });
}

function buildDevice(env) {
  const device = new Group();
  const seg = 96;
  // Cuerpo rojo (banda lateral)
  const band = new LatheGeometry([
    new Vector2(0.90, 0.0), new Vector2(0.955, 0.012), new Vector2(0.99, 0.06), new Vector2(1.0, 0.14),
    new Vector2(1.0, 0.42), new Vector2(0.992, 0.5), new Vector2(0.975, 0.545)
  ], seg);
  const red = new MeshPhysicalMaterial({ color: '#a10d18', roughness: 0.34, clearcoat: 1, clearcoatRoughness: 0.08, envMapIntensity: 1 });
  device.add(new Mesh(band, red));
  // Junta entre banda y tapa
  const seamMat = new MeshStandardMaterial({ color: '#050505', roughness: 0.6 });
  const seam = new Mesh(new TorusGeometry(0.975, 0.012, 12, seg), seamMat); seam.rotation.x = Math.PI / 2; seam.position.y = 0.55; device.add(seam);
  // Tapa negra brillante
  const top = new LatheGeometry([
    new Vector2(0.975, 0.556), new Vector2(0.986, 0.6), new Vector2(0.976, 0.66), new Vector2(0.945, 0.718),
    new Vector2(0.87, 0.768), new Vector2(0.72, 0.794), new Vector2(0.45, 0.805), new Vector2(0.001, 0.809)
  ], seg);
  const black = new MeshPhysicalMaterial({ color: '#050506', roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1 });
  device.add(new Mesh(top, black));
  // Base inferior (dentro de la copa)
  const base = new Mesh(new CircleGeometry(0.92, seg), new MeshStandardMaterial({ color: '#141414', roughness: 0.7 }));
  base.rotation.x = Math.PI / 2; base.position.y = 0.001; device.add(base);

  // Panel de control: placa ahumada redondeada + iconos en una textura de canvas
  const s = new Shape(); const pw = 0.92, pd = 0.34, r = 0.15;
  s.moveTo(-pw / 2 + r, -pd / 2); s.lineTo(pw / 2 - r, -pd / 2); s.quadraticCurveTo(pw / 2, -pd / 2, pw / 2, -pd / 2 + r);
  s.lineTo(pw / 2, pd / 2 - r); s.quadraticCurveTo(pw / 2, pd / 2, pw / 2 - r, pd / 2); s.lineTo(-pw / 2 + r, pd / 2);
  s.quadraticCurveTo(-pw / 2, pd / 2, -pw / 2, pd / 2 - r); s.lineTo(-pw / 2, -pd / 2 + r); s.quadraticCurveTo(-pw / 2, -pd / 2, -pw / 2 + r, -pd / 2);
  const plate = new Mesh(new ExtrudeGeometry(s, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.008, bevelSegments: 3, curveSegments: 18 }),
    new MeshPhysicalMaterial({ color: '#0c0c0e', roughness: 0.3, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.1, envMapIntensity: 0.7 }));
  plate.rotation.x = -Math.PI / 2; plate.position.set(0, 0.796, 0.02); device.add(plate);
  const panelCanvas = document.createElement('canvas'); panelCanvas.width = 1024; panelCanvas.height = 300;
  drawPanel(panelCanvas, 'idle', '#ffffff');
  const panelTex = new CanvasTexture(panelCanvas); panelTex.colorSpace = SRGBColorSpace; panelTex.anisotropy = 4;
  const glyphs = new Mesh(new PlaneGeometry(0.9, 0.264), new MeshBasicMaterial({ map: panelTex, transparent: true, depthWrite: false, toneMapped: false }));
  glyphs.rotation.x = -Math.PI / 2; glyphs.position.set(0, 0.8285, 0.02); device.add(glyphs);

  // Copa de cristal (perfil cerrado: cara exterior e interior)
  const cupGeo = new LatheGeometry([
    new Vector2(0.6, 0.0), new Vector2(0.612, -0.06), new Vector2(0.64, -0.37), new Vector2(0.662, -0.418),
    new Vector2(0.64, -0.428), new Vector2(0.612, -0.39), new Vector2(0.578, -0.06), new Vector2(0.566, 0.0)
  ], seg);
  const glass = new MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.08, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 1.6, side: DoubleSide, depthWrite: false, ior: 1.5, specularIntensity: 1 });
  const cup = new Mesh(cupGeo, glass); cup.renderOrder = 2; device.add(cup);
  const rim = new Mesh(new TorusGeometry(0.652, 0.011, 12, seg), new MeshPhysicalMaterial({ color: '#e9eef2', roughness: 0.1, metalness: 0.6, clearcoat: 1, envMapIntensity: 2 }));
  rim.rotation.x = Math.PI / 2; rim.position.y = -0.421; device.add(rim);
  // Toma central de succión
  const port = new Mesh(new CylinderGeometry(0.09, 0.1, 0.05, 32), new MeshPhysicalMaterial({ color: '#2a2a2a', roughness: 0.3, metalness: 0.7 }));
  port.position.y = -0.024; device.add(port);
  // Anillo de LEDs de luz roja
  const ledMat = new MeshStandardMaterial({ color: '#3a0d0d', emissive: new Color('#ff2a1f'), emissiveIntensity: 0.05, roughness: 0.4 });
  const ledGeo = new SphereGeometry(0.024, 12, 8);
  for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; const led = new Mesh(ledGeo, ledMat); led.position.set(Math.cos(a) * 0.43, -0.012, Math.sin(a) * 0.43); led.scale.y = 0.55; device.add(led); }
  // Resplandor interior de la copa (luz roja / calor)
  const glowTex = radial(256, [[0, 'rgba(255,255,255,1)'], [0.35, 'rgba(255,255,255,.45)'], [1, 'rgba(255,255,255,0)']]);
  const glow = new Sprite(new SpriteMaterial({ map: glowTex, color: '#ff3b30', transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false }));
  glow.scale.set(1.9, 1.3, 1); glow.position.y = -0.2; device.add(glow);
  // Anillos de «succión» que se expanden desde el borde de la copa
  const pulses = [];
  for (let i = 0; i < 3; i++) {
    const m = new Mesh(new RingGeometry(0.64, 0.665, 96), new MeshBasicMaterial({ color: '#cfe3b4', transparent: true, opacity: 0, side: DoubleSide, depthWrite: false, blending: AdditiveBlending }));
    m.rotation.x = -Math.PI / 2; m.position.y = -0.43; device.add(m); pulses.push(m);
  }
  [red, black, glass].forEach(mt => { mt.envMap = env; mt.needsUpdate = true; });
  return { device, panelCanvas, panelTex, ledMat, glow, pulses, glass };
}

function makeParticles(n) {
  const pos = [], spd = [];
  for (let i = 0; i < n; i++) { pos.push((Math.random() - 0.5) * 4.6, Math.random() * 3.4 - 1.6, (Math.random() - 0.6) * 2.6); spd.push(0.08 + Math.random() * 0.22); }
  const geo = new BufferGeometry(); geo.setAttribute('position', new Float32BufferAttribute(pos, 3));
  const mat = new PointsMaterial({ size: 0.045, map: radial(64, [[0, 'rgba(255,255,255,1)'], [0.4, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']]), color: '#d9b97f', transparent: true, opacity: 0.85, depthWrite: false, blending: AdditiveBlending, sizeAttenuation: true });
  const pts = new Points(geo, mat); pts.userData.speed = spd; return pts;
}

function mount(root, opts = {}) {
  if (root.__rp3d) return root.__rp3d;
  const canvas = root.querySelector('[data-rp3d-canvas]'); if (!canvas) return null;
  const reduce = opts.still || (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const poster = !!opts.poster;
  let renderer;
  try { renderer = new WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: poster, powerPreference: 'high-performance' }); }
  catch (e) { root.classList.add('is-3d-failed'); return null; }
  const mobile = Math.min(window.innerWidth, window.innerHeight) < 750;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, poster ? 2 : (mobile ? 1.6 : 2)));
  renderer.toneMapping = ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; renderer.outputColorSpace = SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new Scene();
  const env = studioEnv(renderer); scene.environment = env;
  const camera = new PerspectiveCamera(30, 1, 0.1, 50);
  const look = new Vector3(...MODES.idle.look); camera.position.set(...MODES.idle.cam);

  const key = new DirectionalLight('#fff4e2', 2.2); key.position.set(-3, 4, 3); scene.add(key);
  const rimL = new DirectionalLight('#d9b97f', 2.4); rimL.position.set(3, 1.5, -3); scene.add(rimL);
  const fill = new DirectionalLight('#9fb6a5', 0.5); fill.position.set(2, -2, 3); scene.add(fill);
  const inner = new PointLight('#ff3b30', 0, 3, 1.6); inner.position.set(0, -0.2, 0);

  const holder = new Group(); scene.add(holder);
  const { device, panelCanvas, panelTex, ledMat, glow, pulses, glass } = buildDevice(env);
  device.add(inner); holder.add(device); holder.rotation.x = 0.1;

  // Sombra de contacto y charco de luz bajo el aparato
  const shadow = new Mesh(new PlaneGeometry(2.6, 2.6), new MeshBasicMaterial({ map: radial(256, [[0, 'rgba(0,0,0,.75)'], [0.5, 'rgba(0,0,0,.28)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.05; scene.add(shadow);
  const pool = new Mesh(new PlaneGeometry(3.4, 3.4), new MeshBasicMaterial({ map: radial(256, [[0, 'rgba(255,255,255,.55)'], [0.45, 'rgba(255,255,255,.12)'], [1, 'rgba(255,255,255,0)']]), color: '#d9b97f', transparent: true, depthWrite: false, blending: AdditiveBlending, opacity: 0.55 }));
  pool.rotation.x = -Math.PI / 2; pool.position.y = -1.06; scene.add(pool);

  const particles = poster ? null : makeParticles(mobile ? 70 : 130); if (particles) scene.add(particles);

  // Estado
  const state = { mode: 'idle', color: new Color(MODES.idle.color), target: new Color(MODES.idle.color), rotY: -0.5, velY: 0, start: performance.now(), tiltX: 0, tiltY: 0,
    dragging: false, lastX: 0, lastY: 0, userAt: 0, cycleAt: performance.now() + 2500, cycleIdx: -1, p: 0, visible: true, t: 0, intro: poster || opts.seamless ? 1 : 0 };
  const camTarget = new Vector3(...MODES.idle.cam), lookTarget = new Vector3(...MODES.idle.look);

  function setMode(m, fromUser) {
    if (!MODES[m]) m = 'idle';
    state.mode = m; state.target.set(MODES[m].color); camTarget.set(...MODES[m].cam); lookTarget.set(...MODES[m].look);
    drawPanel(panelCanvas, m, MODES[m].color); panelTex.needsUpdate = true;
    root.dataset.mode = m;
    if (fromUser) state.userAt = performance.now();
    root.dispatchEvent(new CustomEvent('rp3d:mode', { detail: { mode: m, user: !!fromUser } }));
  }

  // Tamaño
  function resize() {
    const w = canvas.clientWidth || 600, h = canvas.clientHeight || 600;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.fov = w / h < 0.9 ? 36 : 30; camera.updateProjectionMatrix();
  }
  resize();
  const ro = 'ResizeObserver' in window ? new ResizeObserver(resize) : null; if (ro) ro.observe(canvas); else addEventListener('resize', resize);

  // Arrastrar para girar (en móvil el scroll vertical sigue funcionando: touch-action pan-y)
  const surface = root.querySelector('[data-rp3d-surface]') || canvas;
  surface.addEventListener('pointerdown', e => { if (e.target.closest && e.target.closest('button,a')) return; state.dragging = true; state.lastX = e.clientX; state.lastY = e.clientY; state.userAt = performance.now(); root.classList.add('is-grabbing'); try { surface.setPointerCapture(e.pointerId); } catch (_) {} });
  surface.addEventListener('pointermove', e => {
    const rect = surface.getBoundingClientRect();
    if (state.dragging) { const dx = e.clientX - state.lastX; state.velY = dx * 0.0075; state.rotY += dx * 0.0075; state.lastX = e.clientX; state.userAt = performance.now(); root.classList.add('was-dragged'); }
    else if (e.pointerType === 'mouse') { state.tiltY = ((e.clientX - rect.left) / rect.width - 0.5) * 0.35; state.tiltX = ((e.clientY - rect.top) / rect.height - 0.5) * 0.18; }
  });
  const up = () => { state.dragging = false; root.classList.remove('is-grabbing'); };
  surface.addEventListener('pointerup', up); surface.addEventListener('pointercancel', up);
  surface.addEventListener('pointerleave', () => { state.tiltX = state.tiltY = 0; });
  surface.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); state.velY += e.key === 'ArrowLeft' ? -0.09 : 0.09; state.userAt = performance.now(); }
  });

  // Puntos de interés (hotspots) anclados al modelo
  const spots = [...root.querySelectorAll('[data-rp3d-spot]')].map(el => {
    const k = el.dataset.rp3dSpot;
    const p = k === 'panel' ? [0, 0.84, 0.05] : k === 'cup' ? [0, -0.28, 0.64] : [0.72, 0.3, 0.72];
    const n = k === 'panel' ? [0, 1, 0.35] : k === 'cup' ? [0, -0.2, 1] : [0.7, 0, 0.7];
    return { el, p: new Vector3(...p), n: new Vector3(...n).normalize() };
  });
  const tmp = new Vector3(), nrm = new Vector3(), toCam = new Vector3();
  function placeSpots() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    spots.forEach(s => {
      tmp.copy(s.p).applyMatrix4(device.matrixWorld);
      nrm.copy(s.n).transformDirection(device.matrixWorld);
      toCam.copy(camera.position).sub(tmp).normalize();
      const facing = nrm.dot(toCam);
      tmp.project(camera);
      s.el.style.transform = `translate(${(tmp.x * 0.5 + 0.5) * w}px, ${(-tmp.y * 0.5 + 0.5) * h}px)`;
      s.el.classList.toggle('is-hidden', facing < 0.05 || state.intro < 0.95);
    });
  }

  // Bucle
  let raf = 0, last = performance.now();
  function frame(now) {
    raf = 0; const dt = Math.min(0.05, (now - last) / 1000); last = now; state.t += dt;
    const idle = now - state.userAt > 12000;
    // Ciclo automático de funciones mientras nadie toca
    if (!poster && !reduce && idle && opts.autoCycle !== false) {
      if (now - state.cycleAt > 3800) { state.cycleAt = now; state.cycleIdx = (state.cycleIdx + 1) % (CYCLE.length + 1); setMode(state.cycleIdx === CYCLE.length ? 'idle' : CYCLE[state.cycleIdx]); }
    }
    // Entrada: el aparato aparece desde abajo y gira
    if (state.intro < 1) state.intro = Math.min(1, (now - state.start) / 1300);
    const ease = 1 - Math.pow(1 - state.intro, 3);
    // Giro: inercia + autogiro suave
    if (!state.dragging) { state.rotY += state.velY; state.velY *= 0.94; if (!reduce && !poster) state.rotY += dt * (idle ? 0.22 : 0.06); }
    const float = reduce || poster ? 0 : Math.sin(state.t * 1.3) * 0.045;
    const suck = state.mode === 'succion' && !reduce ? Math.max(0, Math.sin(state.t * 2.4)) * 0.025 : 0;
    holder.rotation.y = state.rotY + state.p * 1.4 + (1 - ease) * -1.2;
    holder.rotation.x = 0.1 + state.tiltX + state.p * 0.25;
    holder.rotation.z = -state.tiltY * 0.3;
    holder.position.y = float - suck - (1 - ease) * 0.8 - state.p * 0.25;
    holder.scale.setScalar(0.85 + ease * 0.15);
    // Cámara suave hacia la vista del modo
    camera.position.lerp(camTarget, poster ? 1 : 1 - Math.pow(0.02, dt)); look.lerp(lookTarget, poster ? 1 : 1 - Math.pow(0.02, dt)); camera.lookAt(look);
    // Color del modo
    state.color.lerp(state.target, poster ? 1 : 1 - Math.pow(0.03, dt));
    pool.material.color.copy(state.color); rimL.color.copy(state.color);
    if (particles) {
      particles.material.color.copy(state.color);
      const a = particles.geometry.attributes.position, sp = particles.userData.speed, boost = state.mode === 'calor' ? 2.4 : 1;
      if (!reduce) for (let i = 0; i < a.count; i++) { let y = a.getY(i) + sp[i] * dt * boost; if (y > 1.9) y = -1.6; a.setY(i, y); }
      a.needsUpdate = true;
    }
    // Efectos por función
    const redOn = state.mode === 'luz', heatOn = state.mode === 'calor';
    const pulse = reduce ? 1 : 0.85 + Math.sin(state.t * 3.2) * 0.15;
    ledMat.emissiveIntensity = MathUtils.lerp(ledMat.emissiveIntensity, redOn ? 4.5 * pulse : 0.05, 1 - Math.pow(0.01, dt));
    inner.intensity = MathUtils.lerp(inner.intensity, redOn ? 6 * pulse : heatOn ? 2.5 : 0, 1 - Math.pow(0.01, dt));
    inner.color.set(heatOn ? '#ff7a2a' : '#ff3b30');
    glow.material.color.set(heatOn ? '#ff8a3d' : '#ff3b30');
    glow.material.opacity = MathUtils.lerp(glow.material.opacity, redOn ? 0.95 * pulse : heatOn ? 0.55 * pulse : 0, 1 - Math.pow(0.01, dt));
    glass.color.set(redOn ? '#ffd6d2' : heatOn ? '#ffe2c8' : '#ffffff');
    pulses.forEach((m, i) => {
      if (state.mode === 'succion' && !reduce) { const k = ((state.t * 0.55 + i / 3) % 1); m.scale.setScalar(1 + k * 1.1); m.material.opacity = (1 - k) * 0.55; }
      else { m.material.opacity = MathUtils.lerp(m.material.opacity, 0, 1 - Math.pow(0.002, dt)); }
    });
    renderer.render(scene, camera);
    placeSpots();
    if (state.visible && !document.hidden && !poster) raf = requestAnimationFrame(frame);
  }
  function play() { if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  const io = new IntersectionObserver(es => { state.visible = es[0].isIntersecting; if (state.visible) play(); }, { rootMargin: '120px' });
  io.observe(root);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) play(); });
  // Avance del scroll de la sección (0 arriba del todo, 1 cuando sale)
  addEventListener('scroll', () => { const r = root.getBoundingClientRect(); state.p = Math.min(1, Math.max(0, -r.top / Math.max(1, r.height))); }, { passive: true });

  setMode(opts.mode || 'idle');
  if (poster) { frame(performance.now()); }
  else { play(); requestAnimationFrame(() => root.classList.add('is-3d-ready')); }
  const api = { setMode: m => setMode(m, true), renderer, state };
  root.__rp3d = api; return api;
}

window.RP3D = { mount };
