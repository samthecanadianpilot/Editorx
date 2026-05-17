// EditorX — Wiring, modals, interactions
// (Tool Builder removed — effects are now standalone, applied directly to clips.)

// ---------- Mask Properties Modal ----------
function openMaskProps(mask){
  const modal = document.getElementById('mask-props-modal');
  if(!modal) return;
  modal.classList.remove('hidden');
  document.getElementById('mask-props-title').textContent = mask.name + ' Properties';
  renderMaskPropsBody(mask);
  if(window.lucide) lucide.createIcons({root:modal});
}
function closeMaskProps(){ document.getElementById('mask-props-modal')?.classList.add('hidden'); }

function renderMaskPropsBody(mask){
  const body = document.getElementById('mask-props-body'); if(!body) return;
  let html = `
    <div class="mp-section"><div class="mp-section-title">GEOMETRY</div>
      ${maskRow('Position X',mask,'x',-2000,2000,1,'')}
      ${maskRow('Position Y',mask,'y',-2000,2000,1,'')}
      ${maskRow('Width',mask,'w',1,4000,1,'')}
      ${maskRow('Height',mask,'h',1,4000,1,'')}
      ${maskRow('Rotation',mask,'rotation',-180,180,1,'°')}
    </div>
    <div class="mp-section"><div class="mp-section-title">APPEARANCE</div>
      ${maskRow('Opacity',mask,'opacity',0,1,0.05,'')}
      ${maskRow('Feather',mask,'feather',0,200,1,'px')}
      ${maskRow('Blur',mask,'blur',0,100,1,'px')}
      ${mask.type==='rectangle' ? maskRow('Corners',mask,'cornerRadius',0,200,1,'px') : ''}
    </div>
    <div class="mp-section"><div class="mp-section-title">OPTIONS</div>
      <div class="insp-toggle-row"><label>Inverted</label>
        <input type="checkbox" id="mp-inv" ${mask.inverted?'checked':''}></div>
    </div>`;
  if(mask.type==='gradient'){
    html += `<div class="mp-section"><div class="mp-section-title">GRADIENT</div>
      ${maskRow('Angle',mask,'gradAngle',0,360,1,'°')}
      ${maskRow('Spread',mask,'gradSpread',0,1,0.05,'')}
    </div>`;
  }
  html += `<div class="mp-section"><div class="mp-section-title">ANIMATION</div>`;
  if(!mask.keyframes.length){
    html += '<div class="empty-sub" style="padding:8px 0">No keyframes yet — use “+ Add Keyframe” to capture the current state.</div>';
  } else {
    mask.keyframes.forEach((kf,i)=>{
      html += `<div class="kf-row" data-kf="${i}">
        <span class="kf-diamond"><i data-lucide="diamond" width="8" height="8"></i></span>
        <span class="kf-time">${kf.time.toFixed(2)}s</span>
        <button class="kf-remove" title="Remove"><i data-lucide="x" width="10" height="10"></i></button></div>`;
    });
  }
  html += `</div>`;
  body.innerHTML = html;

  body.querySelectorAll('input[type=range][data-prop]').forEach(inp=>{
    const prop = inp.dataset.prop;
    inp.addEventListener('input', e=>{
      const v = parseFloat(e.target.value);
      mask[prop] = v;
      const span = inp.parentElement.querySelector('.mp-value');
      if(span) span.textContent = (v.toString().includes('.') ? v.toFixed(2) : v) + (inp.dataset.unit||'');
      renderMaskOverlays(); renderViewer();
    });
    inp.addEventListener('change', ()=>pushHistory());
  });
  const inv = body.querySelector('#mp-inv');
  if(inv) inv.addEventListener('change', e=>{ mask.inverted = e.target.checked; pushHistory(); render(); });
  body.querySelectorAll('.kf-remove').forEach((btn)=>{
    btn.addEventListener('click', e=>{
      e.stopPropagation();
      const i = parseInt(btn.parentElement.dataset.kf);
      mask.keyframes.splice(i,1); pushHistory(); openMaskProps(mask);
    });
  });
}
function maskRow(label, mask, prop, min, max, step, unit){
  const v = mask[prop] ?? 0;
  return `<div class="mp-row"><label>${label}</label>
    <input type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-prop="${prop}" data-unit="${unit}">
    <span class="mp-value">${(v.toString().includes('.') ? Number(v).toFixed(2) : v)}${unit}</span></div>`;
}
window.openMaskProps = openMaskProps;

// ---------- Export Modal ----------
// Probe what MediaRecorder MIMEs the browser actually supports.
// Each entry: {mime, label, ext}. We always include a project-file option.
function detectExportFormats(){
  const candidates = [
    {mime:'video/mp4;codecs=avc1',  label:'MP4 (H.264)',     ext:'mp4'},
    {mime:'video/mp4',              label:'MP4',             ext:'mp4'},
    {mime:'video/webm;codecs=vp9',  label:'WebM (VP9)',      ext:'webm'},
    {mime:'video/webm;codecs=vp8',  label:'WebM (VP8)',      ext:'webm'},
    {mime:'video/webm',             label:'WebM',            ext:'webm'},
    {mime:'video/x-matroska;codecs=avc1', label:'MKV (H.264)', ext:'mkv'}
  ];
  const supported = [];
  if(typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported){
    for(const c of candidates){
      try{ if(MediaRecorder.isTypeSupported(c.mime)) supported.push(c); }catch{}
    }
  }
  // Always offer the project file
  supported.push({mime:'application/json', label:'Project file (.editorx.json)', ext:'editorx.json', project:true});
  return supported;
}

function ensureExportModal(){
  let m = document.getElementById('export-modal');
  if(m) return m;
  m = document.createElement('div'); m.id = 'export-modal'; m.className = 'modal hidden';
  const formats = detectExportFormats();
  const fmtOptions = formats.map((f,i)=>`<option value="${i}">${f.label}</option>`).join('');
  // Note about MOV / true cross-browser MP4: needs ffmpeg.wasm in pure-JS land
  const movNote = formats.some(f=>f.ext==='mp4')
    ? `Browser-native MP4/H.264 detected. MOV is not natively writable in the browser without ffmpeg.wasm.`
    : `This browser cannot natively encode MP4 from canvas. WebM is provided. For MP4/MOV add ffmpeg.wasm.`;
  m.innerHTML = `<div class="modal-overlay"></div>
    <div class="modal-content" style="width:540px;max-width:92vw">
      <div class="modal-header"><span class="modal-icon"><i data-lucide="upload"></i></span>
        <span class="modal-title">Export</span>
        <button class="modal-close" id="btn-close-export"><i data-lucide="x"></i></button></div>
      <div class="modal-body" style="display:flex;flex-direction:column;gap:14px;padding:18px">
        <div class="form-row"><label>Filename</label><input id="exp-name" type="text" value="EditorX_Export"></div>
        <div class="form-row"><label>Format</label><select id="exp-fmt">${fmtOptions}</select></div>
        <div class="form-row"><label>Resolution</label>
          <select id="exp-res"><option value="1920x1080">1920×1080 (1080p)</option><option value="3840x2160">3840×2160 (4K)</option><option value="1280x720">1280×720 (720p)</option></select></div>
        <div class="form-row"><label>Frame rate</label>
          <select id="exp-fps"><option>30</option><option>60</option><option>24</option></select></div>
        <div class="form-row"><label>Bitrate</label>
          <select id="exp-bitrate"><option value="8">High (8 Mbps)</option><option value="16">Very High (16 Mbps)</option><option value="4">Medium (4 Mbps)</option></select></div>
        <div class="hint"><i data-lucide="info" width="11" height="11"></i> ${movNote}</div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" id="btn-export-cancel">Cancel</button>
        <button class="btn-primary" id="btn-export-go">Export</button>
      </div>
    </div>`;
  document.body.appendChild(m);
  // Cache formats for the doExport handler
  m._formats = formats;
  m.querySelector('.modal-overlay').addEventListener('click', ()=>m.classList.add('hidden'));
  m.querySelector('#btn-close-export').addEventListener('click', ()=>m.classList.add('hidden'));
  m.querySelector('#btn-export-cancel').addEventListener('click', ()=>m.classList.add('hidden'));
  m.querySelector('#btn-export-go').addEventListener('click', doExport);
  if(window.lucide) lucide.createIcons({root:m});
  return m;
}
function openExport(){ ensureExportModal().classList.remove('hidden'); }

async function doExport(){
  const m = document.getElementById('export-modal');
  const name = m.querySelector('#exp-name').value || 'EditorX_Export';
  const fmtIdx = parseInt(m.querySelector('#exp-fmt').value);
  const fmt = m._formats[fmtIdx];
  if(!fmt) return;

  // Project export
  if(fmt.project){
    const project = projectDoc();
    project.meta.resolution = m.querySelector('#exp-res').value;
    project.meta.fps = parseInt(m.querySelector('#exp-fps').value);
    const blob = new Blob([JSON.stringify(project,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name+'.editorx.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
    m.classList.add('hidden');
    flash('Saved '+name+'.editorx.json');
    return;
  }

  // Video export via MediaRecorder + canvas.captureStream
  const canvas = document.getElementById('viewer-canvas');
  if(!canvas || !canvas.captureStream){
    flash('Canvas capture not supported in this browser');
    return;
  }
  const fps = parseInt(m.querySelector('#exp-fps').value) || 30;
  const bitrate = parseInt(m.querySelector('#exp-bitrate').value) * 1_000_000;
  const stream = canvas.captureStream(fps);
  let recorder;
  try{
    recorder = new MediaRecorder(stream, {mimeType: fmt.mime, videoBitsPerSecond: bitrate});
  }catch(err){
    flash('Cannot start recorder: ' + err.message);
    return;
  }
  const chunks = [];
  recorder.ondataavailable = e=>{ if(e.data && e.data.size) chunks.push(e.data); };
  const finish = () => new Promise(res=>{ recorder.onstop = res; });
  recorder.start();
  m.classList.add('hidden');
  flash('Recording '+fmt.label+'…');

  seekPlayhead(0); renderViewer();
  startPlayback();
  const totalMs = Math.max(2000, timelineDurationS()*1000);
  await new Promise(r=>setTimeout(r, totalMs+200));
  stopPlayback();
  recorder.stop();
  await finish();
  const blob = new Blob(chunks, {type: fmt.mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = name + '.' + fmt.ext;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
  flash('Exported '+name+'.'+fmt.ext);
}
window.openExport = openExport;

// ---------- Open project from .editorx.json ----------
function pickProjectFile(){
  const inp = document.createElement('input');
  inp.type='file'; inp.accept='.json,.editorx';
  inp.onchange = e=>{
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const doc = JSON.parse(reader.result);
        applyProjectDoc(doc);
        render(); flash('Loaded '+f.name);
      }catch(err){ flash('Could not parse project: '+err.message); }
    };
    reader.readAsText(f);
  };
  inp.click();
}
window.pickProjectFile = pickProjectFile;

// ---------- Workspace tabs ----------
const WORKSPACE_PANELS = { edit:'media', color:'luts', effects:'effects', export:null };
function setWorkspace(name){
  state.workspace = name;
  document.querySelectorAll('.ws-tab').forEach(t=>t.classList.toggle('active', t.dataset.tab===name));
  if(name==='export'){ openExport(); return; }
  const targetPanel = WORKSPACE_PANELS[name]; if(!targetPanel) return;
  const stab = document.querySelector('.stab[data-panel="'+targetPanel+'"]');
  if(stab) stab.click();
}

// ---------- Media file picker ----------
function pickMedia(){
  const inp = document.createElement('input');
  inp.type='file'; inp.multiple=true;
  inp.accept='video/*,audio/*,image/*';
  inp.onchange = e=>{
    const files = Array.from(e.target.files||[]);
    if(!files.length) return;
    files.forEach(f=>{
      const url = URL.createObjectURL(f);
      // Preserve real type so we know to extract image-vs-video thumbnails
      const type = f.type.startsWith('audio') ? 'audio'
                 : f.type.startsWith('image') ? 'image'
                 : 'video';
      const item = {id:'m_'+Math.random().toString(36).slice(2,9), name:f.name, url, type, duration:0, thumbnail:null};
      state.media.push(item);
      // Probe duration (audio/video only; images are instantaneous on the timeline)
      if(type !== 'image'){
        const probe = document.createElement(type==='audio' ? 'audio' : 'video');
        probe.preload='metadata';
        probe.onloadedmetadata = ()=>{ item.duration = probe.duration; render(); };
        probe.src = url;
      }
      // Extract thumbnail (skips audio)
      if(window.makeMediaThumbnail){
        window.makeMediaThumbnail(url, type).then(thumb=>{
          if(thumb){ item.thumbnail = thumb; render(); }
        });
      }
    });
    pushHistory(); render();
    flash(files.length+' file'+(files.length===1?'':'s')+' added');
  };
  inp.click();
}

// ---------- Snap helper ----------
function snapToCandidates(x, ignoreClipId){
  if(!state.snap) return x;
  const candidates = [];
  candidates.push(TIMELINE_OFFSET_X + state.playhead/PLAYHEAD_MS_PER_PX);
  state.clips.forEach(c=>{
    if(c.id===ignoreClipId) return;
    candidates.push(c.x); candidates.push(c.x+c.w);
  });
  for(let s=0;s<600;s++) candidates.push(TIMELINE_OFFSET_X + s*TIMELINE_PX_PER_S);
  let best=x, bestDist=6;
  for(const cx of candidates){ const d=Math.abs(cx-x); if(d<bestDist){ bestDist=d; best=cx; } }
  return best;
}

// ---------- Collision-aware placement ----------
// Find a legal x for `clip` near `proposedX` such that [x, x+clip.w] doesn't
// overlap any other clip on the same track. Pushes against the nearest blocker.
function clampClipNoOverlap(clip, proposedX, proposedW){
  const w = proposedW != null ? proposedW : clip.w;
  let nx = Math.max(TIMELINE_OFFSET_X, proposedX);
  const others = state.clips.filter(c => c.track === clip.track && c.id !== clip.id);
  // Iterate a few times — handles being squeezed between two clips
  for(let pass=0; pass<6; pass++){
    let collided = false;
    for(const o of others){
      const oL = o.x, oR = o.x + o.w;
      if(nx < oR && nx + w > oL){
        collided = true;
        // Push to whichever side has less penetration
        const overlapRight = oR - nx;
        const overlapLeft  = nx + w - oL;
        if(overlapLeft <= overlapRight) nx = oL - w;
        else                            nx = oR;
      }
    }
    if(!collided) break;
  }
  return Math.max(TIMELINE_OFFSET_X, nx);
}

// Bounds for the *left edge* of the dragged clip, given trim side.
// For trim-left: left can go as far left as the previous neighbour's right edge.
// For trim-right: returns the max right edge allowed (= next neighbour's left edge).
function trimBounds(clip, side){
  const others = state.clips.filter(c => c.track === clip.track && c.id !== clip.id);
  if(side==='left'){
    // Previous neighbour: largest oR <= clip.x (treat strictly < to allow current pos)
    const prevR = others.filter(o => o.x + o.w <= clip.x + clip.w - 20)
                        .reduce((m,o)=>Math.max(m, o.x + o.w), TIMELINE_OFFSET_X);
    return prevR;
  } else {
    const nextL = others.filter(o => o.x >= clip.x + 20)
                        .reduce((m,o)=>Math.min(m, o.x), Infinity);
    return nextL;
  }
}

// ---------- Command Palette (⌘K) ----------
// A searchable index of every meaningful action the user can take from
// anywhere in the editor. Fuzzy-ish substring matching, keyboard nav.
function commandList(){
  const sel = (typeof getSelectedClip === 'function') ? getSelectedClip() : null;
  const hasSel = !!sel;
  return [
    // Files & projects
    {kw:'new project',     label:'New Project',                icon:'plus-square', group:'Project', run:()=>{ saveCurrentProject(); showDashboard(); openNewProjectModal(); }},
    {kw:'open project file', label:'Open Project File',        icon:'folder-open', group:'Project', run:()=> pickProjectFile()},
    {kw:'save',            label:'Save Project',               icon:'save',        group:'Project', shortcut:'⌘S', run:()=> document.getElementById('btn-save')?.click()},
    {kw:'export',          label:'Export Video',               icon:'upload',      group:'Project', shortcut:'⌘E', run:()=> openExport()},
    {kw:'dashboard',       label:'Back to Dashboard',          icon:'layout-grid', group:'Project', run:()=>{ saveCurrentProject(); showDashboard(); }},
    {kw:'sign out',        label:'Sign Out',                   icon:'log-out',     group:'Account', run:async()=>{ try{await fetch('/api/auth/signout',{method:'POST'});}catch{} clearSession(); showStarter(); }},

    // Transport
    {kw:'play pause',      label:'Play / Pause',               icon:'play',        group:'Transport', shortcut:'Space', run:()=> document.getElementById('btn-play')?.click()},
    {kw:'jump start',      label:'Jump to Start',              icon:'skip-back',   group:'Transport', run:()=> document.getElementById('btn-home')?.click()},
    {kw:'jump end',        label:'Jump to End',                icon:'skip-forward',group:'Transport', run:()=> document.getElementById('btn-end')?.click()},
    {kw:'rewind',          label:'Rewind 1s',                  icon:'rewind',      group:'Transport', shortcut:'J', run:()=> document.getElementById('btn-rewind')?.click()},
    {kw:'forward',         label:'Forward 1s',                 icon:'fast-forward',group:'Transport', shortcut:'L', run:()=> document.getElementById('btn-forward')?.click()},

    // Edit (only enabled when there's a selected clip)
    {kw:'duplicate clip',  label:'Duplicate Selected Clip',    icon:'copy',        group:'Edit', shortcut:'⌘D', disabled:!hasSel, run:()=>{ const c=duplicateClip(state.selectedClipId); if(c){state.selectedClipId=c.id;pushHistory();render();} }},
    {kw:'delete clip',     label:'Delete Selected Clip',       icon:'trash-2',     group:'Edit', shortcut:'⌫', disabled:!hasSel, run:()=>{ if(state.selectedClipId){deleteClip(state.selectedClipId);pushHistory();render();} }},
    {kw:'undo',            label:'Undo',                       icon:'undo-2',      group:'Edit', shortcut:'⌘Z', run:()=>{ if(undo()) render(); }},
    {kw:'redo',            label:'Redo',                       icon:'redo-2',      group:'Edit', shortcut:'⌘⇧Z', run:()=>{ if(redo()) render(); }},
    {kw:'snap toggle',     label:'Toggle Snap',                icon:'magnet',      group:'Edit', shortcut:'N', run:()=> document.getElementById('btn-snap')?.click()},
    {kw:'detach audio',    label:'Detach Audio from Video',    icon:'scissors-line-dashed', group:'Edit', disabled:!(hasSel && sel.type==='video'), run:()=>{ const a=detachAudio(state.selectedClipId); if(a){state.selectedClipId=a.id;pushHistory();render();flash('Audio detached');} }},

    // Animation presets — operate on selected clip
    {kw:'zoom punch',      label:'Add Zoom Punch',             icon:'zoom-in',     group:'Animation', disabled:!hasSel, run:()=>{ applyZoomPunch(state.selectedClipId); pushHistory(); render(); flash('Zoom Punch added'); }},
    {kw:'beat shake',      label:'Add Beat Shake',             icon:'vibrate',     group:'Animation', disabled:!hasSel, run:()=>{ applyBeatShake(state.selectedClipId); pushHistory(); render(); flash('Beat Shake added'); }},
    {kw:'pan',             label:'Add Pan',                    icon:'move-horizontal', group:'Animation', disabled:!hasSel, run:()=>{ applyPan(state.selectedClipId, 100, 'right'); pushHistory(); render(); flash('Pan added'); }},
    {kw:'ken burns',       label:'Add Ken Burns',              icon:'trending-up', group:'Animation', disabled:!hasSel, run:()=>{ applyKenBurns(state.selectedClipId, 1.18); pushHistory(); render(); flash('Ken Burns added'); }},
    {kw:'fade in',         label:'Add Fade In',                icon:'sunrise',     group:'Animation', disabled:!hasSel, run:()=>{ applyFadeIn(state.selectedClipId, 0.4); pushHistory(); render(); flash('Fade In added'); }},
    {kw:'fade out',        label:'Add Fade Out',               icon:'sunset',      group:'Animation', disabled:!hasSel, run:()=>{ applyFadeOut(state.selectedClipId, 0.4); pushHistory(); render(); flash('Fade Out added'); }},
    {kw:'speed ramp',      label:'Add Speed Ramp',             icon:'gauge',       group:'Animation', disabled:!hasSel, run:()=>{ applySpeedRamp(state.selectedClipId, 2.0); pushHistory(); render(); flash('Speed Ramp added'); }},

    // Effects (apply by name)
    {kw:'vignette',        label:'Apply Vignette Effect',      icon:'circle-dashed', group:'Effects', disabled:!hasSel, run:()=>{ setEffect(state.selectedClipId,'vignette'); pushHistory(); render(); flash('Vignette applied'); }},
    {kw:'glitch rgb split',label:'Apply Glitch / RGB Split',   icon:'unplug',      group:'Effects', disabled:!hasSel, run:()=>{ setEffect(state.selectedClipId,'glitch'); pushHistory(); render(); flash('Glitch applied'); }},
    {kw:'grain',           label:'Apply Film Grain',           icon:'tally-3',     group:'Effects', disabled:!hasSel, run:()=>{ setEffect(state.selectedClipId,'grainOv'); pushHistory(); render(); flash('Film Grain applied'); }},
    {kw:'blur',            label:'Apply Blur Effect',          icon:'droplet',     group:'Effects', disabled:!hasSel, run:()=>{ setEffect(state.selectedClipId,'blur'); pushHistory(); render(); flash('Blur applied'); }},
    {kw:'black white bw',  label:'Apply Black & White',        icon:'film',        group:'Effects', disabled:!hasSel, run:()=>{ setEffect(state.selectedClipId,'bw'); pushHistory(); render(); flash('B&W applied'); }},
    {kw:'clear effect',    label:'Clear Effect from Clip',     icon:'circle-slash',group:'Effects', disabled:!hasSel, run:()=>{ clearEffect(state.selectedClipId); pushHistory(); render(); flash('Effect cleared'); }},

    // Help
    {kw:'shortcuts help',  label:'Show Keyboard Shortcuts',    icon:'keyboard',    group:'Help', shortcut:'?', run:()=> openShortcutsOverlay()},
  ];
}

function openCommandPalette(){
  const modal = document.getElementById('command-palette'); if(!modal) return;
  const input = document.getElementById('cmdk-input');
  modal.classList.remove('hidden');
  input.value = '';
  renderCommandResults('');
  setTimeout(()=> input.focus(), 10);
  if(window.lucide) lucide.createIcons({root:modal});
}
function closeCommandPalette(){
  document.getElementById('command-palette')?.classList.add('hidden');
}
function renderCommandResults(query){
  const list = document.getElementById('cmdk-results'); if(!list) return;
  const q = (query || '').trim().toLowerCase();
  const all = commandList();
  let filtered = q
    ? all.filter(c => c.kw.includes(q) || c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q))
    : all;
  if(!filtered.length){
    list.innerHTML = `<div class="cmdk-empty">No commands match "${query}"</div>`;
    return;
  }
  // Group by group
  const groups = {};
  for(const c of filtered){ (groups[c.group] = groups[c.group] || []).push(c); }
  let html = '';
  for(const g of Object.keys(groups)){
    html += `<div class="cmdk-group-head">${g}</div>`;
    for(const c of groups[g]){
      html += `<button class="cmdk-row${c.disabled?' is-disabled':''}" data-idx="${all.indexOf(c)}" ${c.disabled?'disabled':''}>
        <i data-lucide="${c.icon || 'corner-down-right'}" width="14" height="14"></i>
        <span class="cmdk-label">${c.label}</span>
        ${c.shortcut?`<kbd>${c.shortcut}</kbd>`:''}
      </button>`;
    }
  }
  list.innerHTML = html;
  // Auto-highlight first enabled row
  const first = list.querySelector('.cmdk-row:not(.is-disabled)');
  if(first) first.classList.add('cmdk-active');
  list.querySelectorAll('.cmdk-row').forEach(row=>{
    row.addEventListener('mouseenter', ()=>{
      list.querySelectorAll('.cmdk-row').forEach(r=>r.classList.remove('cmdk-active'));
      row.classList.add('cmdk-active');
    });
    row.addEventListener('click', ()=>{
      const cmd = commandList()[parseInt(row.dataset.idx)];
      if(cmd && !cmd.disabled){ closeCommandPalette(); cmd.run(); }
    });
  });
  if(window.lucide) lucide.createIcons({root:list});
}
function cmdkRunActive(){
  const active = document.querySelector('#cmdk-results .cmdk-row.cmdk-active:not(.is-disabled)');
  if(!active) return;
  const cmd = commandList()[parseInt(active.dataset.idx)];
  if(cmd && !cmd.disabled){ closeCommandPalette(); cmd.run(); }
}
function cmdkNavigate(dir){
  const rows = Array.from(document.querySelectorAll('#cmdk-results .cmdk-row:not(.is-disabled)'));
  if(!rows.length) return;
  let idx = rows.findIndex(r => r.classList.contains('cmdk-active'));
  if(idx < 0) idx = 0;
  idx = (idx + dir + rows.length) % rows.length;
  rows.forEach(r => r.classList.remove('cmdk-active'));
  rows[idx].classList.add('cmdk-active');
  rows[idx].scrollIntoView({block:'nearest'});
}
window.openCommandPalette = openCommandPalette;
window.closeCommandPalette = closeCommandPalette;

// ---------- Keyboard shortcuts overlay ----------
function openShortcutsOverlay(){
  const m = document.getElementById('shortcuts-overlay'); if(!m) return;
  m.classList.remove('hidden');
  if(window.lucide) lucide.createIcons({root:m});
}
function closeShortcutsOverlay(){ document.getElementById('shortcuts-overlay')?.classList.add('hidden'); }
window.openShortcutsOverlay = openShortcutsOverlay;

// ---------- Right-click context menu on a clip ----------
function openClipContextMenu(e, clip){
  e.preventDefault(); e.stopPropagation();
  const menu = document.getElementById('clip-ctx-menu'); if(!menu) return;
  // Build items based on clip type
  const items = [];
  if(clip.type === 'video' && !clip.audioDetached){
    items.push({label:'Detach Audio', icon:'scissors-line-dashed', action:()=>{
      const a = detachAudio(clip.id);
      if(a){ state.selectedClipId = a.id; pushHistory(); render(); flash('Audio detached'); }
    }});
    items.push({separator:true});
  }
  items.push({label:'Duplicate',  icon:'copy',     action:()=>{
    const c = duplicateClip(clip.id);
    if(c){ state.selectedClipId = c.id; pushHistory(); render(); flash('Duplicated'); }
  }});
  items.push({label:'Select',     icon:'mouse-pointer-2', action:()=>{
    state.selectedClipId = clip.id; state.selectedMaskId = null; render();
  }});
  items.push({separator:true});
  items.push({label:'Delete',     icon:'trash-2', danger:true, action:()=>{
    deleteClip(clip.id); pushHistory(); render(); flash('Deleted');
  }});

  menu.innerHTML = items.map((it,i)=>{
    if(it.separator) return '<div class="ctx-sep"></div>';
    return `<button class="ctx-item${it.danger?' danger':''}" data-idx="${i}">
      <i data-lucide="${it.icon}" width="13" height="13"></i><span>${it.label}</span></button>`;
  }).join('');

  // Position the menu, keeping it inside the viewport
  menu.classList.remove('hidden');
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  const vw = window.innerWidth, vh = window.innerHeight;
  const x = Math.min(e.clientX, vw - mw - 6);
  const y = Math.min(e.clientY, vh - mh - 6);
  menu.style.left = x + 'px';
  menu.style.top  = y + 'px';

  menu.querySelectorAll('.ctx-item').forEach(btn=>{
    btn.addEventListener('click', ev=>{
      ev.stopPropagation();
      const it = items[parseInt(btn.dataset.idx)];
      closeClipContextMenu();
      if(it && it.action) it.action();
    });
  });
  if(window.lucide) lucide.createIcons({root:menu});
}
function closeClipContextMenu(){
  document.getElementById('clip-ctx-menu')?.classList.add('hidden');
}
document.addEventListener('mousedown', e=>{
  const menu = document.getElementById('clip-ctx-menu');
  if(menu && !menu.classList.contains('hidden') && !menu.contains(e.target)){
    closeClipContextMenu();
  }
});
document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeClipContextMenu(); });
window.openClipContextMenu = openClipContextMenu;

// ---------- Clip drag / trim ----------
function attachClipInteractions(el, clip){
  const cssLeft = (x) => (x - TIMELINE_OFFSET_X);

  // Body drag
  el.addEventListener('mousedown', e=>{
    if(e.button!==0) return;
    if(e.target.classList.contains('trim-handle')) return;
    if(state.activeTool==='blade') return;
    if(state.tracks[clip.track] && state.tracks[clip.track].locked) return;
    const startX = e.clientX, origX = clip.x;
    let moved = false;
    const onMove = ev=>{
      const dx = ev.clientX - startX;
      if(Math.abs(dx)>2) moved = true;
      let nx = origX + dx;
      const sl = snapToCandidates(nx, clip.id);
      if(Math.abs(sl-nx)<3) nx = sl;
      else {
        const sr = snapToCandidates(nx+clip.w, clip.id);
        if(Math.abs(sr-(nx+clip.w))<3) nx = sr - clip.w;
      }
      // Collision protection: don't allow overlap with siblings on the same track
      nx = clampClipNoOverlap(clip, nx);
      clip.x = Math.round(nx);
      el.style.left = cssLeft(clip.x) + 'px';
    };
    const onUp = ()=>{
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      if(moved){ el.dataset.dragMoved='1'; pushHistory(); render(); }
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
  // Trim handles
  const trim = side => e=>{
    e.stopPropagation();
    if(state.tracks[clip.track] && state.tracks[clip.track].locked) return;
    const startX = e.clientX;
    const origX = clip.x, origW = clip.w;
    const bound = trimBounds(clip, side);
    const onMove = ev=>{
      const dx = ev.clientX - startX;
      if(side==='left'){
        let nx = snapToCandidates(origX + dx, clip.id);
        // Can't pass right side, can't go before the previous clip's right edge
        nx = Math.max(bound, Math.min(origX+origW-20, nx));
        clip.w = Math.round(origW - (nx-origX));
        clip.x = Math.round(nx);
      } else {
        let edge = snapToCandidates(origX + origW + dx, clip.id);
        // Can't pass next clip's left edge
        edge = Math.min(bound, Math.max(origX+20, edge));
        clip.w = Math.round(edge - origX);
      }
      el.style.left  = cssLeft(clip.x) + 'px';
      el.style.width = clip.w + 'px';
      _invalidateWaveform(clip.id);
    };
    const onUp = ()=>{
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      pushHistory(); render();
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };
  el.querySelector('.trim-left')?.addEventListener('mousedown', trim('left'));
  el.querySelector('.trim-right')?.addEventListener('mousedown', trim('right'));
}
window.attachClipInteractions = attachClipInteractions;
window.clampClipNoOverlap = clampClipNoOverlap;

// ---------- Mask handle resize ----------
function attachMaskHandleResize(handle, mask, pos, sx, sy){
  handle.addEventListener('mousedown', e=>{
    e.stopPropagation(); e.preventDefault();
    const startX = e.clientX, startY = e.clientY;
    const ox = mask.x, oy = mask.y, ow = mask.w, oh = mask.h;
    const onMove = ev=>{
      const dx = (ev.clientX-startX)/sx, dy = (ev.clientY-startY)/sy;
      if(pos==='br'){ mask.w = Math.max(8, ow+dx); mask.h = Math.max(8, oh+dy); }
      else if(pos==='bl'){ mask.x = ox+dx; mask.w = Math.max(8, ow-dx); mask.h = Math.max(8, oh+dy); }
      else if(pos==='tr'){ mask.y = oy+dy; mask.w = Math.max(8, ow+dx); mask.h = Math.max(8, oh-dy); }
      else if(pos==='tl'){ mask.x = ox+dx; mask.y = oy+dy; mask.w = Math.max(8, ow-dx); mask.h = Math.max(8, oh-dy); }
      renderMaskOverlays(); renderViewer();
    };
    const onUp = ()=>{ document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',onUp); pushHistory(); render(); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}
window.attachMaskHandleResize = attachMaskHandleResize;

// ---------- Library → Timeline drag-drop ----------
function wireTrackDropTargets(){
  ['v2','v1','a1','t1'].forEach(tid=>{
    const lane = document.getElementById('track-'+tid); if(!lane) return;

    lane.addEventListener('dragover', e=>{
      const types = (e.dataTransfer && e.dataTransfer.types) || [];
      const accepted = ['application/x-editorx-media','application/x-editorx-title','application/x-editorx-graphic','Files'];
      if(!accepted.some(t => types.indexOf(t) >= 0)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      lane.classList.add('drop-target');
    });
    lane.addEventListener('dragleave', e=>{
      // Only clear when leaving the lane element itself
      if(e.target === lane) lane.classList.remove('drop-target');
    });
    lane.addEventListener('drop', async e=>{
      e.preventDefault();
      lane.classList.remove('drop-target');

      const rect = lane.getBoundingClientRect();
      // Lane left == ruler "0s" tick == TIMELINE_OFFSET_X in clip-coord space
      const dropX = (e.clientX - rect.left) + TIMELINE_OFFSET_X;

      // (1) Library item drag
      const mediaId = e.dataTransfer.getData('application/x-editorx-media');
      if(mediaId){
        const m = state.media.find(x=>x.id===mediaId);
        if(!m) return;
        placeMediaAt(m, tid, dropX);
        return;
      }
      // (1b) Title preset drag — always lands on T1, at drop X
      const titleId = e.dataTransfer.getData('application/x-editorx-title');
      if(titleId && window.TITLES){
        const t = window.TITLES.find(x => x.id === titleId);
        if(!t) return;
        const ms = Math.max(0, (dropX - TIMELINE_OFFSET_X) * PLAYHEAD_MS_PER_PX);
        window.addTextClipAt(ms, t);
        if(window.loadFont) window.loadFont(t.font).then(()=>renderViewer());
        pushHistory(); render();
        flash('Added ' + t.name);
        return;
      }
      // (1c) Graphic preset drag — same treatment
      const graphicId = e.dataTransfer.getData('application/x-editorx-graphic');
      if(graphicId && window.GRAPHICS){
        const g = window.GRAPHICS.find(x => x.id === graphicId);
        if(!g) return;
        const ms = Math.max(0, (dropX - TIMELINE_OFFSET_X) * PLAYHEAD_MS_PER_PX);
        window.addGraphicAt(ms, g);
        if(window.loadFont) window.loadFont(g.font).then(()=>renderViewer());
        pushHistory(); render();
        flash('Added ' + g.name);
        return;
      }

      // (2) OS file drop — import then place at the drop position
      const files = e.dataTransfer.files ? Array.from(e.dataTransfer.files) : [];
      if(files.length){
        let firstX = dropX;
        for(const f of files){
          const url = URL.createObjectURL(f);
          const type = f.type.startsWith('audio') ? 'audio'
                     : f.type.startsWith('image') ? 'image' : 'video';
          const item = {id:'m_'+Math.random().toString(36).slice(2,9), name:f.name, url, type, duration:0, thumbnail:null};
          state.media.push(item);
          if(type !== 'image'){
            await new Promise(res=>{
              const probe = document.createElement(type==='audio' ? 'audio' : 'video');
              probe.preload='metadata';
              probe.onloadedmetadata = ()=>{ item.duration = probe.duration; res(); };
              probe.onerror = ()=>res();
              probe.src = url;
            });
          }
          // Extract a thumbnail in the background (don't block placement)
          if(window.makeMediaThumbnail){
            window.makeMediaThumbnail(url, type).then(thumb=>{
              if(thumb){ item.thumbnail = thumb; render(); }
            });
          }
          placeMediaAt(item, tid, firstX);
          const w = Math.max(60, Math.round((item.duration||4)*TIMELINE_PX_PER_S));
          firstX += w + 4;
        }
        flash(files.length+' file'+(files.length===1?'':'s')+' added');
      }
    });
  });
}
function placeMediaAt(media, trackId, dropX){
  const widthPx = Math.max(60, Math.round((media.duration||4)*TIMELINE_PX_PER_S));
  // Snap drop position to existing clip edges, the playhead, and second marks
  let x = snapToCandidates(dropX);
  // Collision-avoid: clamp into nearest free space on the chosen track
  const tmp = {id:'__drop__', track:trackId, w:widthPx};
  x = clampClipNoOverlap(tmp, x, widthPx);
  addClipFromMediaAt(media, trackId, x);
  pushHistory(); render();
  flash('Added '+media.name);
}
window.wireTrackDropTargets = wireTrackDropTargets;

// ---------- Blade cut-line indicator ----------
// While the Blade tool is active, a thin vertical line follows the cursor over
// the timeline so the user can see exactly where a click will split the clip.
function wireCutIndicator(){
  const wrap      = document.getElementById('timeline-wrapper');
  const indicator = document.getElementById('cut-indicator');
  if(!wrap || !indicator) return;
  wrap.addEventListener('mousemove', e=>{
    if(state.activeTool !== 'blade'){
      indicator.classList.remove('visible');
      return;
    }
    const rect = wrap.getBoundingClientRect();
    indicator.style.transform = 'translate3d(' + (e.clientX - rect.left) + 'px,0,0)';
    indicator.classList.add('visible');
  });
  wrap.addEventListener('mouseleave', ()=>indicator.classList.remove('visible'));
}
window.wireCutIndicator = wireCutIndicator;

// ---------- Track header controls ----------
function wireTrackHeaders(){
  document.querySelectorAll('.track').forEach(trackEl=>{
    const tid = trackEl.dataset.track; if(!tid || !state.tracks[tid]) return;
    trackEl.querySelectorAll('.track-ctrl').forEach(btn=>{
      const action = btn.dataset.action;
      btn.addEventListener('click', e=>{
        e.stopPropagation();
        const tr = state.tracks[tid];
        if(action==='mute'){ tr.muted = !tr.muted; }
        else if(action==='lock'){ tr.locked = !tr.locked; }
        else if(action==='visibility'){ tr.visible = !(tr.visible !== false); }
        renderTrackHeaders();
        syncMediaToPlayhead();
        flash(`${tid.toUpperCase()}: ${action} ${tr[action===''?'':action] || (action==='visibility'? (tr.visible?'on':'off') : 'toggled')}`);
      });
    });
  });
}

// ---------- Boot ----------
document.addEventListener('DOMContentLoaded', ()=>{
  // Sidebar tabs
  document.querySelectorAll('.stab').forEach(tab=>{
    tab.addEventListener('click', ()=>{
      document.querySelectorAll('.stab').forEach(t=>t.classList.remove('active'));
      document.querySelectorAll('.sidebar-content .panel').forEach(p=>p.classList.remove('active'));
      tab.classList.add('active');
      const p = document.getElementById('panel-'+tab.dataset.panel); if(p) p.classList.add('active');
    });
  });
  // Workspace tabs
  document.querySelectorAll('.ws-tab').forEach(tab=>{
    tab.addEventListener('click', ()=>setWorkspace(tab.dataset.tab));
  });
  // Edit tools
  document.querySelectorAll('.tool-btn[data-tool]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.tool-btn[data-tool]').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      state.activeTool = btn.dataset.tool;
      // Toggle a body-level class so a custom cursor (defined in CSS) applies
      // anywhere the tool is meaningful — timeline tracks, clips, etc.
      document.body.classList.toggle('tool-blade', state.activeTool==='blade');
      document.body.classList.toggle('tool-hand',  state.activeTool==='hand');
      document.body.classList.toggle('tool-text',  state.activeTool==='text');
    });
  });
  // Snap
  const snapBtn = document.getElementById('btn-snap');
  if(snapBtn){
    snapBtn.addEventListener('click', ()=>{
      state.snap = !state.snap;
      snapBtn.classList.toggle('active', state.snap);
      flash('Snap '+(state.snap?'on':'off'));
    });
  }
  // Transport
  const playBtn = document.getElementById('btn-play');
  const refreshPlayIcon = ()=>{
    playBtn.innerHTML = state.isPlaying ? '<i data-lucide="pause"></i>' : '<i data-lucide="play"></i>';
    if(window.lucide) lucide.createIcons({root:playBtn});
  };
  playBtn?.addEventListener('click', ()=>{ togglePlayback(); refreshPlayIcon(); });
  document.getElementById('btn-rewind')?.addEventListener('click', ()=>{ nudgePlayhead(-1000); renderPlayhead(); renderTimecode(); renderViewer(); });
  document.getElementById('btn-forward')?.addEventListener('click', ()=>{ nudgePlayhead(1000); renderPlayhead(); renderTimecode(); renderViewer(); });
  document.getElementById('btn-home')?.addEventListener('click', ()=>{ seekPlayhead(0); renderPlayhead(); renderTimecode(); renderViewer(); });
  document.getElementById('btn-end')?.addEventListener('click', ()=>{ seekPlayhead(timelineDurationS()*1000); renderPlayhead(); renderTimecode(); renderViewer(); });
  document.getElementById('btn-stop')?.addEventListener('click', ()=>{ stopPlayback(); seekPlayhead(0); renderPlayhead(); renderTimecode(); renderViewer(); refreshPlayIcon(); });
  document.getElementById('btn-undo')?.addEventListener('click', ()=>{ if(undo()) render(); });
  document.getElementById('btn-redo')?.addEventListener('click', ()=>{ if(redo()) render(); });
  // Hook engine.stopPlayback to also refresh icon
  const _stop = window.stopPlayback;
  window.stopPlayback = function(){ _stop(); refreshPlayIcon(); };

  // Library + export buttons
  document.getElementById('btn-add-media')?.addEventListener('click', pickMedia);
  document.getElementById('btn-add-media-empty')?.addEventListener('click', pickMedia);
  document.getElementById('btn-export')?.addEventListener('click', openExport);

  // Project file buttons
  document.getElementById('btn-save')?.addEventListener('click', ()=>{
    saveCurrentProject(); // persist to projects list
    // Also offer a download of the project JSON
    const doc = {
      meta:{app:'EditorX', version:2, savedAt:new Date().toISOString(),
            projectName:state.projectName, presetId:state.presetId,
            canvasW:state.canvasW, canvasH:state.canvasH},
      ...projectDoc()
    };
    const blob = new Blob([JSON.stringify(doc,null,2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = (state.projectName||'EditorX')+'.editorx.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
    flash('Saved');
  });
  document.getElementById('btn-open')?.addEventListener('click', pickProjectFile);
  document.getElementById('btn-new')?.addEventListener('click', ()=>{
    // Save the current project first so its progress isn't lost,
    // then jump back to the Dashboard and open the new-project modal.
    saveCurrentProject();
    showDashboard();
    openNewProjectModal();
  });

  // Mask props modal close buttons
  document.getElementById('btn-close-mask-props')?.addEventListener('click', closeMaskProps);
  document.getElementById('btn-close-mask-done')?.addEventListener('click', closeMaskProps);
  document.querySelector('#mask-props-modal .modal-overlay')?.addEventListener('click', closeMaskProps);
  document.getElementById('btn-add-keyframe')?.addEventListener('click', ()=>{
    if(!state.selectedClipId || !state.selectedMaskId) return;
    const mask = (state.masks[state.selectedClipId]||[]).find(m=>m.id===state.selectedMaskId);
    if(mask){ addKeyframe(mask); openMaskProps(mask); pushHistory(); render(); }
  });
  document.getElementById('btn-delete-mask')?.addEventListener('click', ()=>{
    if(state.selectedClipId && state.selectedMaskId){
      removeMask(state.selectedClipId, state.selectedMaskId);
      closeMaskProps(); pushHistory(); render();
    }
  });

  // Viewer overlays
  document.getElementById('toggle-safe')?.addEventListener('change', e=>{
    document.getElementById('viewer-safe-zones')?.classList.toggle('hidden', !e.target.checked);
  });
  document.getElementById('toggle-cross')?.addEventListener('change', e=>{
    document.getElementById('viewer-crosshair')?.classList.toggle('hidden', !e.target.checked);
  });
  document.getElementById('toggle-grid')?.addEventListener('change', e=>{
    document.getElementById('viewer-grid')?.classList.toggle('hidden', !e.target.checked);
  });

  // Ruler scrubbing
  const ruler = document.getElementById('timeline-ruler');
  if(ruler){
    const seekFromEvent = ev=>{
      const rect = ruler.getBoundingClientRect();
      const x = ev.clientX - rect.left;
      const ms = Math.max(0, (x - TIMELINE_OFFSET_X) * PLAYHEAD_MS_PER_PX);
      seekPlayhead(ms);
      renderPlayhead(); renderTimecode(); renderViewer();
    };
    ruler.addEventListener('mousedown', e=>{
      seekFromEvent(e);
      const onMove = ev=>seekFromEvent(ev);
      const onUp = ()=>{ document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',onUp); };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    ruler.style.cursor = 'ew-resize';
  }

  // Track header controls
  wireTrackHeaders();
  // Drop targets: drag library cards (or OS files) onto any track lane
  wireTrackDropTargets();
  // Viewer drop-zone: click opens file picker, drag-drop imports + places
  const dz = document.getElementById('viewer-dropzone');
  if(dz){
    dz.addEventListener('click', pickMedia);
    dz.addEventListener('dragover', e=>{
      const types = (e.dataTransfer && e.dataTransfer.types) || [];
      if(types.indexOf('Files') < 0) return;
      e.preventDefault(); e.dataTransfer.dropEffect = 'copy';
      dz.classList.add('drop-active');
    });
    dz.addEventListener('dragleave', ()=>dz.classList.remove('drop-active'));
    dz.addEventListener('drop', async e=>{
      e.preventDefault(); dz.classList.remove('drop-active');
      const files = Array.from(e.dataTransfer.files || []);
      if(!files.length) return;
      for(const f of files){
        const url = URL.createObjectURL(f);
        const type = f.type.startsWith('audio') ? 'audio'
                   : f.type.startsWith('image') ? 'image' : 'video';
        const item = {id:'m_'+Math.random().toString(36).slice(2,9), name:f.name, url, type, duration:0, thumbnail:null};
        state.media.push(item);
        if(type !== 'image'){
          await new Promise(res=>{
            const probe = document.createElement(type==='audio' ? 'audio' : 'video');
            probe.preload='metadata';
            probe.onloadedmetadata = ()=>{ item.duration = probe.duration; res(); };
            probe.onerror = ()=>res();
            probe.src = url;
          });
        }
        if(window.makeMediaThumbnail){
          window.makeMediaThumbnail(url, type).then(thumb=>{
            if(thumb){ item.thumbnail = thumb; render(); }
          });
        }
        addClipFromMedia(item);
      }
      pushHistory(); render();
      flash(files.length+' file'+(files.length===1?'':'s')+' added');
    });
  }
  // Blade tool — vertical cut-line indicator that follows the cursor over the timeline
  wireCutIndicator();

  // Click empty viewer area deselects mask
  document.getElementById('viewer-canvas')?.addEventListener('click', ()=>{ state.selectedMaskId=null; render(); });

  // Window resize
  window.addEventListener('resize', ()=>{ renderTimecodeRuler(); renderMaskOverlays(); renderPlayhead(); });

  // Keyboard
  document.addEventListener('keydown', e=>{
    const inField = e.target && (e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA'||e.target.tagName==='SELECT'||e.target.isContentEditable);
    if(inField) return;
    const k = e.key.toLowerCase();
    const meta = e.metaKey || e.ctrlKey;
    if(meta){
      if(k==='z' && !e.shiftKey){ e.preventDefault(); if(undo()) render(); return; }
      if((k==='z' && e.shiftKey) || k==='y'){ e.preventDefault(); if(redo()) render(); return; }
      if(k==='d'){ e.preventDefault();
        if(state.selectedClipId){ const c=duplicateClip(state.selectedClipId); if(c){ state.selectedClipId=c.id; pushHistory(); render(); } }
        return;
      }
      if(k==='e'){ e.preventDefault(); openExport(); return; }
      if(k==='k'){ e.preventDefault(); openCommandPalette(); return; }
      if(k==='s'){ e.preventDefault(); document.getElementById('btn-save')?.click(); return; }
      return;
    }
    // Plain "?" opens the shortcut help (handles shift on US keyboards too)
    if(k==='?' || (k==='/' && e.shiftKey)){ e.preventDefault(); openShortcutsOverlay(); return; }
    switch(k){
      case ' ': e.preventDefault(); document.getElementById('btn-play').click(); break;
      case 'v': document.querySelector('[data-tool="select"]').click(); break;
      case 'b': document.querySelector('[data-tool="blade"]').click(); break;
      case 't': document.querySelector('[data-tool="text"]').click(); break;
      case 'h': document.querySelector('[data-tool="hand"]').click(); break;
      case 'n': document.getElementById('btn-snap').click(); break;
      case 'j': nudgePlayhead(-1000); renderPlayhead(); renderTimecode(); renderViewer(); break;
      case 'k': stopPlayback(); break;
      case 'l': nudgePlayhead(1000); renderPlayhead(); renderTimecode(); renderViewer(); break;
      case 'arrowleft':  e.preventDefault(); nudgePlayhead(e.shiftKey?-1000:-100); renderPlayhead(); renderTimecode(); renderViewer(); break;
      case 'arrowright': e.preventDefault(); nudgePlayhead(e.shiftKey? 1000: 100); renderPlayhead(); renderTimecode(); renderViewer(); break;
      case 'delete': case 'backspace':
        e.preventDefault();
        if(state.selectedMaskId && state.selectedClipId){ removeMask(state.selectedClipId, state.selectedMaskId); pushHistory(); render(); }
        else if(state.selectedClipId){ deleteClip(state.selectedClipId); pushHistory(); render(); }
        break;
    }
  });

  // Command Palette wiring
  document.getElementById('cmdk-input')?.addEventListener('input', e=>{
    renderCommandResults(e.target.value);
  });
  document.getElementById('cmdk-input')?.addEventListener('keydown', e=>{
    if(e.key === 'ArrowDown'){ e.preventDefault(); cmdkNavigate(1); }
    else if(e.key === 'ArrowUp'){ e.preventDefault(); cmdkNavigate(-1); }
    else if(e.key === 'Enter'){ e.preventDefault(); cmdkRunActive(); }
    else if(e.key === 'Escape'){ e.preventDefault(); closeCommandPalette(); }
  });
  document.querySelector('#command-palette .modal-overlay')?.addEventListener('click', closeCommandPalette);
  document.getElementById('btn-close-shortcuts')?.addEventListener('click', closeShortcutsOverlay);
  document.querySelector('#shortcuts-overlay .modal-overlay')?.addEventListener('click', closeShortcutsOverlay);
  // ESC closes either modal
  document.addEventListener('keydown', e=>{
    if(e.key === 'Escape'){
      if(!document.getElementById('command-palette')?.classList.contains('hidden')) closeCommandPalette();
      if(!document.getElementById('shortcuts-overlay')?.classList.contains('hidden')) closeShortcutsOverlay();
    }
  });

  // Pre-load Mona Sans (the UI font) + a few popular text-title fonts.
  if(window.loadFont){
    ['Mona Sans','Playfair Display','Bebas Neue','Oswald','JetBrains Mono'].forEach(f=>window.loadFont(f));
  }

  // Dashboard buttons
  document.getElementById('btn-new-project')?.addEventListener('click', openNewProjectModal);
  document.getElementById('btn-back-dash')?.addEventListener('click', ()=>{
    saveCurrentProject(); // make sure the latest is captured before leaving
    showDashboard();
  });
  document.getElementById('btn-signout')?.addEventListener('click', async ()=>{
    try{ await fetch('/api/auth/signout', {method:'POST', headers:{Accept:'application/json'}}); }catch{}
    clearSession();
    showStarter();
  });

  // ----- Boot flow -----
  //   1. If we just came back from /api/auth/github/callback (?signed_in=1),
  //      strip the param and hit /api/me to read the cookie session.
  //   2. Otherwise check for an existing cookie session OR a local guest session.
  //   3. session → Dashboard.  no session → Starter.
  bootBootBoot();
});

async function bootBootBoot(){
  const params = new URLSearchParams(location.search);
  if(params.has('signed_in')){
    history.replaceState({}, '', location.pathname);
  }
  // Try the server-side cookie session first (real GitHub login).
  let session = await fetchServerSession();
  // Otherwise fall back to a local guest session.
  if(!session) session = readSession();

  if(session){
    writeSession(session);
    showDashboard();
  } else {
    showStarter();
  }
}

async function fetchServerSession(){
  try{
    const r = await fetch('/api/me', {credentials:'include'});
    if(!r.ok) return null;
    const j = await r.json();
    // New format: { signedIn: false } for guests; only return a session if true.
    if(j && j.signedIn === false) return null;
    return j;
  }catch{return null;}
}

// ---------- Auth + screen routing ----------
const SESSION_KEY = 'editorx.session.v1';
function readSession(){ try{ return JSON.parse(localStorage.getItem(SESSION_KEY)||'null'); }catch{return null;} }
function writeSession(s){ try{ localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }catch{} }
function clearSession(){ try{ localStorage.removeItem(SESSION_KEY); }catch{} }

function hideAllScreens(){
  document.getElementById('starter')?.classList.add('hidden');
  document.getElementById('dashboard')?.classList.add('hidden');
  document.getElementById('app')?.classList.add('hidden');
}
function showStarter(){
  hideAllScreens();
  document.getElementById('starter')?.classList.remove('hidden');
  if(window.lucide) lucide.createIcons();
}
function showDashboard(){
  hideAllScreens();
  document.getElementById('dashboard')?.classList.remove('hidden');
  renderDashboard();
  // Pull this user's projects from the cloud and merge in the background.
  // If signed in as a real user AND Vercel KV is enabled, this is where
  // cross-device projects show up. Silently no-ops for guests / no-KV.
  if(window.cloudHydrateDashboard) window.cloudHydrateDashboard();
  if(window.lucide) lucide.createIcons();
}
function enterEditor(){
  hideAllScreens();
  document.getElementById('app')?.classList.remove('hidden');
  render();
}
window.showStarter   = showStarter;
window.showDashboard = showDashboard;
window.enterEditor   = enterEditor;
window.readSession   = readSession;
window.writeSession  = writeSession;
window.clearSession  = clearSession;

// ---------- Dashboard render ----------
function relativeTime(iso){
  if(!iso) return 'just now';
  const t = new Date(iso).getTime();
  if(isNaN(t)) return 'recently';
  const s = Math.max(1, Math.floor((Date.now() - t)/1000));
  if(s < 60)     return s + 's ago';
  const m = Math.floor(s/60);
  if(m < 60)     return m + (m===1?' minute':' minutes') + ' ago';
  const h = Math.floor(m/60);
  if(h < 24)     return h + (h===1?' hour':' hours') + ' ago';
  const d = Math.floor(h/24);
  if(d < 30)     return d + (d===1?' day':' days') + ' ago';
  return new Date(iso).toLocaleDateString();
}

function renderDashboard(){
  const root = document.getElementById('dashboard'); if(!root) return;
  // User card
  const session = readSession();
  const nameEl = root.querySelector('#dash-name');
  const avEl   = root.querySelector('#dash-avatar');
  if(nameEl) nameEl.textContent = session?.name || session?.login || 'Guest';
  if(avEl){
    if(session?.avatar){ avEl.src = session.avatar; avEl.hidden = false; }
    else                { avEl.hidden = true; }
  }

  // Project grid
  const grid  = root.querySelector('#dash-projects');
  const empty = root.querySelector('#dash-empty');
  if(!grid || !empty) return;
  const projects = listProjects();
  if(!projects.length){
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');
  // Sort: most recently edited first
  projects.sort((a,b)=> new Date(b.updatedAt||0) - new Date(a.updatedAt||0));
  grid.innerHTML = projects.map(p=>{
    const preset = (PROJECT_PRESETS.find(pr=>pr.id===p.presetId)?.name) || 'Project';
    const thumb = p.thumbnail
      ? `<img src="${p.thumbnail}" alt="" loading="lazy">`
      : `<div class="dash-thumb-fallback"><i data-lucide="film"></i></div>`;
    const duration = p.durationS ? formatDuration(p.durationS) : '0:00';
    return `<article class="dash-card" data-id="${p.id}">
      <div class="dash-thumb" style="aspect-ratio:${p.canvasW||16}/${p.canvasH||9}">
        ${thumb}
        <span class="dash-duration">${duration}</span>
      </div>
      <div class="dash-card-body">
        <div class="dash-card-name" title="${escapeAttr(p.name)}">${escapeHtml(p.name)}</div>
        <div class="dash-card-meta">${preset} · ${p.clipCount||0} clips · edited ${relativeTime(p.updatedAt)}</div>
      </div>
      <button class="dash-card-menu" data-act="menu" title="More"><i data-lucide="more-horizontal" width="14" height="14"></i></button>
    </article>`;
  }).join('');

  grid.querySelectorAll('.dash-card').forEach(card=>{
    const id = card.dataset.id;
    card.addEventListener('click', e=>{
      if(e.target.closest('[data-act="menu"]')) return;
      if(openProject(id)){ enterEditor(); flash('Opened ' + (getCurrentProjectName()||'project')); }
    });
    card.querySelector('[data-act="menu"]').addEventListener('click', e=>{
      e.stopPropagation();
      openProjectCardMenu(e, id);
    });
  });
}
function getCurrentProjectName(){ return state.projectName; }
function formatDuration(s){
  s = Math.max(0, Math.floor(s));
  const m = Math.floor(s/60), ss = s%60;
  return m + ':' + String(ss).padStart(2,'0');
}
function escapeAttr(s){return String(s||'').replace(/"/g,'&quot;');}
function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

function openProjectCardMenu(e, projectId){
  const items = [
    {label:'Open',     icon:'play',     action:()=>{ if(openProject(projectId)){ enterEditor(); }}},
    {label:'Rename',   icon:'edit-3',   action:()=>{
      const cur = listProjects().find(p=>p.id===projectId);
      const nn = prompt('Rename project', cur?.name || '');
      if(nn && nn.trim()){ renameProject(projectId, nn.trim()); renderDashboard(); }
    }},
    {separator:true},
    {label:'Delete',   icon:'trash-2',  danger:true, action:()=>{
      if(confirm('Delete this project? Cannot be undone.')){ deleteProject(projectId); renderDashboard(); }
    }}
  ];
  // Reuse the editor's context-menu styling
  const menu = document.getElementById('clip-ctx-menu'); if(!menu) return;
  menu.innerHTML = items.map((it,i)=>{
    if(it.separator) return '<div class="ctx-sep"></div>';
    return `<button class="ctx-item${it.danger?' danger':''}" data-idx="${i}">
      <i data-lucide="${it.icon}" width="13" height="13"></i><span>${it.label}</span></button>`;
  }).join('');
  menu.classList.remove('hidden');
  const mw = menu.offsetWidth, mh = menu.offsetHeight;
  const vw = window.innerWidth, vh = window.innerHeight;
  menu.style.left = Math.min(e.clientX, vw - mw - 6) + 'px';
  menu.style.top  = Math.min(e.clientY, vh - mh - 6) + 'px';
  menu.querySelectorAll('.ctx-item').forEach(btn=>{
    btn.addEventListener('click', ev=>{
      ev.stopPropagation();
      const it = items[parseInt(btn.dataset.idx)];
      closeClipContextMenu();
      if(it && it.action) it.action();
    });
  });
  if(window.lucide) lucide.createIcons({root:menu});
}

// ---------- New-project modal ----------
function openNewProjectModal(){
  const m = document.getElementById('new-project-modal'); if(!m) return;
  const grid = m.querySelector('#np-presets');
  const custom = m.querySelector('#np-custom');
  let selected = 'yt-1080';
  grid.innerHTML = PROJECT_PRESETS.map(p=>`
    <button class="np-card${p.id===selected?' selected':''}" data-id="${p.id}">
      <div class="np-card-frame" style="aspect-ratio:${p.w}/${p.h}"><div></div></div>
      <div class="np-card-body">
        <div class="np-card-name">${p.name}</div>
        <div class="np-card-meta">${p.w}×${p.h} · ${p.ratio}</div>
      </div>
    </button>`).join('');
  custom.classList.add('hidden');
  m.querySelector('#np-name').value = '';
  grid.querySelectorAll('.np-card').forEach(b=>{
    b.addEventListener('click', ()=>{
      grid.querySelectorAll('.np-card').forEach(x=>x.classList.remove('selected'));
      b.classList.add('selected');
      selected = b.dataset.id;
      custom.classList.toggle('hidden', selected !== 'custom');
    });
  });
  m.querySelector('#btn-np-cancel').onclick = ()=>m.classList.add('hidden');
  m.querySelector('#btn-close-newproj').onclick = ()=>m.classList.add('hidden');
  m.querySelector('.modal-overlay').onclick = ()=>m.classList.add('hidden');
  m.querySelector('#btn-np-create').onclick = ()=>{
    const name = m.querySelector('#np-name').value.trim();
    const cw = parseInt(m.querySelector('#np-cw').value)||1920;
    const ch = parseInt(m.querySelector('#np-ch').value)||1080;
    const id = createProject(name, selected, cw, ch);
    m.classList.add('hidden');
    enterEditor();
    flash('Created “' + state.projectName + '”');
  };
  m.classList.remove('hidden');
  if(window.lucide) lucide.createIcons({root:m});
}
window.openNewProjectModal = openNewProjectModal;

// ----- Starter screen wiring (real GitHub OAuth + guest fallback) -----
document.addEventListener('DOMContentLoaded', ()=>{
  const starter = document.getElementById('starter'); if(!starter) return;
  const skip    = starter.querySelector('#starter-skip');
  const msg     = starter.querySelector('#starter-msg');
  const ghBtn   = starter.querySelector('#starter-github');

  // If OAuth isn't deployed yet (e.g. opening index.html via file://), hitting
  // /api/auth/github/start gives a 404. Detect that and show a clear message
  // instead of redirecting to a broken URL.
  if(ghBtn){
    ghBtn.addEventListener('click', (e)=>{
      const isFile = location.protocol === 'file:';
      if(isFile){
        e.preventDefault();
        msg.innerHTML = 'GitHub sign-in only works on a deployed origin (Vercel) — not <code>file://</code>. Use “Continue as guest” for now, or deploy first.';
      }
    });
  }

  if(skip){
    skip.addEventListener('click', ()=>{
      writeSession({email:null, name:'Guest', login:'guest', guest:true, provider:'guest', signedInAt:new Date().toISOString()});
      enterEditor(true);
    });
  }
});
