// EditorX — UI rendering

// ---------- Small helpers ----------
function escapeHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}

function flash(msg){
  let bar = document.getElementById('flash-bar');
  if(!bar){
    bar = document.createElement('div'); bar.id = 'flash-bar';
    document.body.appendChild(bar);
  }
  bar.textContent = msg;
  bar.classList.add('visible');
  clearTimeout(bar._t);
  bar._t = setTimeout(()=>bar.classList.remove('visible'), 1600);
}

// ---------- Speech APIs (browser-native) ----------
// Speech-to-text dictation. While the mic is active the button glows red.
// Recognized phrases stream into the selected clip's text field live.
let _activeRecognition = null;
function startDictation(clip, btn){
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ flash('Speech recognition not supported in this browser'); return; }
  if(_activeRecognition){
    try{ _activeRecognition.stop(); }catch{}
    _activeRecognition = null;
    if(btn) btn.classList.remove('rec');
    return;
  }
  const rec = new SR();
  rec.lang = 'en-US';
  rec.interimResults = true;
  rec.continuous = true;
  let finalTxt = clip.text || '';
  if(finalTxt && !finalTxt.endsWith(' ')) finalTxt += ' ';
  rec.onresult = (ev) => {
    let interim = '';
    for(let i = ev.resultIndex; i < ev.results.length; i++){
      const r = ev.results[i];
      if(r.isFinal) finalTxt += r[0].transcript;
      else interim += r[0].transcript;
    }
    const composed = (finalTxt + interim).trim();
    updateClip(clip.id, {text: composed});
    // Live-update the text input in the inspector without a full re-render
    const inp = document.querySelector('input[type=text][data-prop="text"]');
    if(inp) inp.value = composed;
    renderViewer(); renderTextOverlays(); renderClips();
  };
  rec.onerror = (e) => { flash('Mic: ' + (e.error || 'error')); };
  rec.onend = () => {
    _activeRecognition = null;
    if(btn) btn.classList.remove('rec');
    pushHistory();
  };
  try{
    rec.start();
    _activeRecognition = rec;
    if(btn) btn.classList.add('rec');
    flash('Listening… click Dictate again to stop');
  }catch(err){
    flash('Mic could not start: ' + err.message);
  }
}

// Text-to-speech preview. Uses the platform's voices.
function speakText(text){
  if(!('speechSynthesis' in window)){ flash('TTS not supported'); return; }
  if(!text || !text.trim()){ flash('No text to speak'); return; }
  const u = new SpeechSynthesisUtterance(text);
  // Prefer a high-quality local voice if available
  const voices = speechSynthesis.getVoices() || [];
  const preferred = voices.find(v => /en[-_]US/i.test(v.lang) && /Samantha|Alex|Karen|Google|Apple/i.test(v.name))
                 || voices.find(v => /en/i.test(v.lang)) || voices[0];
  if(preferred) u.voice = preferred;
  u.rate = 1; u.pitch = 1; u.volume = 1;
  speechSynthesis.cancel(); // stop anything already speaking
  speechSynthesis.speak(u);
}
// Some browsers populate voices asynchronously
if(typeof speechSynthesis !== 'undefined') speechSynthesis.onvoiceschanged = ()=>{};

// Stable per-clip waveform (deterministic from id)
const _waveformCache = {};
function _waveformFor(clip){
  if(_waveformCache[clip.id]) return _waveformCache[clip.id];
  let seed = 0; for(const ch of clip.id) seed = (seed*31 + ch.charCodeAt(0))>>>0;
  const rand = ()=>{ seed = (seed*1664525 + 1013904223)>>>0; return seed/0xFFFFFFFF; };
  const numBars = Math.max(8, Math.floor(clip.w/4));
  const bars = new Array(numBars);
  for(let i=0;i<numBars;i++) bars[i] = 18 + rand()*64;
  return _waveformCache[clip.id] = bars;
}
function _invalidateWaveform(id){ delete _waveformCache[id]; }

// ---------- Sidebar panels ----------
function renderClips(){
  ['v1','a1','t1'].forEach(tid=>{
    const lane = document.getElementById('track-'+tid); if(!lane) return;
    lane.innerHTML = '';
    state.clips.filter(c=>c.track===tid).forEach(clip=>{
      const el = document.createElement('div');
      el.className = 'clip ' + clip.type + (state.selectedClipId===clip.id?' selected':'');
      // CSS left is measured inside .track-lane (which already sits after the
      // 80px header), so subtract the header offset to align with the ruler.
      el.style.left  = (clip.x - TIMELINE_OFFSET_X) + 'px';
      el.style.width = clip.w + 'px';
      el.dataset.id = clip.id;
      el.dataset.clipId = clip.id;

      let inner = '<div class="clip-header-stripe"></div>';
      inner += `<div class="clip-name">${escapeHtml(clip.name)}</div>`;
      const dur = (clip.w/TIMELINE_PX_PER_S).toFixed(1)+'s';
      inner += `<div class="clip-duration">${dur}</div>`;

      if(clip.type==='video'){
        inner += '<div class="clip-thumbnails">';
        const n = Math.max(1, Math.floor(clip.w/50));
        for(let i=0;i<n;i++) inner += '<div class="thumb"></div>';
        inner += '</div>';
      } else if(clip.type==='audio'){
        inner += '<div class="clip-waveform">';
        const bars = _waveformFor(clip);
        bars.forEach(h=>{ inner += `<div class="wave-bar" style="height:${h}%"></div>`; });
        inner += '</div>';
      }

      let badges = '';
      if(state.masks[clip.id] && state.masks[clip.id].length>0){
        badges += `<span class="badge badge-mask"><i data-lucide="layers" width="10" height="10"></i>${state.masks[clip.id].length}</span>`;
      }
      if(clip.transition){
        badges += `<span class="badge badge-trans" title="Transition: ${clip.transition}"><i data-lucide="blend" width="10" height="10"></i></span>`;
      }
      if(clip.lutId){
        const lut = (window.LUTS||[]).find(l=>l.id===clip.lutId);
        badges += `<span class="badge badge-lut" title="LUT: ${lut?lut.name:clip.lutId}" style="--swatch:${lut?lut.color:'#888'}"><span class="badge-swatch"></span></span>`;
      }
      if(clip.effectId && clip.effectId!=='none'){
        const fx = (window.EFFECTS||[]).find(e=>e.id===clip.effectId);
        badges += `<span class="badge badge-fx" title="Effect: ${fx?fx.name:clip.effectId}"><i data-lucide="${fx?fx.icon:'sparkles'}" width="10" height="10"></i></span>`;
      }
      if(badges) inner += `<div class="clip-indicators">${badges}</div>`;

      inner += '<div class="trim-handle trim-left"></div><div class="trim-handle trim-right"></div>';
      el.innerHTML = inner;

      el.addEventListener('click', (e)=>{
        if(el.dataset.dragMoved==='1'){ el.dataset.dragMoved='0'; return; }
        if(state.activeTool==='blade'){
          const rect = el.getBoundingClientRect();
          const splitX = clip.x + (e.clientX - rect.left);
          if(window.splitClipAtX(clip.id, splitX)){ pushHistory(); render(); }
          return;
        }
        state.selectedClipId = clip.id;
        state.selectedMaskId = null;
        render();
      });
      el.addEventListener('contextmenu', (e)=>{
        if(window.openClipContextMenu){
          state.selectedClipId = clip.id;
          renderInspector();
          window.openClipContextMenu(e, clip);
        }
      });

      lane.appendChild(el);
      if(window.attachClipInteractions) window.attachClipInteractions(el, clip);
    });
  });
}

function renderMediaList(){
  const list = document.getElementById('media-list');
  const empty = document.getElementById('media-empty');
  if(!list) return;
  list.innerHTML = '';
  if(!state.media || !state.media.length){ if(empty) empty.style.display=''; return; }
  if(empty) empty.style.display='none';
  state.media.forEach(m=>{
    const row = document.createElement('div'); row.className = 'list-card';
    row.draggable = true;
    row.dataset.mediaId = m.id;
    const icon = m.type==='audio' ? 'music' : (m.type==='video' ? 'film' : 'image');
    // Audio gets an icon (no visual makes sense); video & image show real thumbnails
    const visual = (m.thumbnail && m.type !== 'audio')
      ? `<div class="lc-icon lc-thumb" style="background-image:url('${m.thumbnail}')"></div>`
      : `<div class="lc-icon"><i data-lucide="${icon}" width="14" height="14"></i></div>`;
    row.innerHTML = `${visual}
      <div class="lc-body"><div class="lc-name">${escapeHtml(m.name)}</div>
      <div class="lc-meta">${m.type} · ${m.duration?m.duration.toFixed(1)+'s':(m.type==='image'?'image':'…')}</div></div>
      <button class="lc-action" title="Add to timeline"><i data-lucide="plus" width="12" height="12"></i></button>`;
    row.addEventListener('click', ()=>{ addClipFromMedia(m); pushHistory(); render(); flash('Added '+m.name); });
    row.addEventListener('dragstart', e=>{
      e.dataTransfer.effectAllowed = 'copy';
      // Custom MIME for our own drop targets; plain text fallback for cross-target tools
      e.dataTransfer.setData('application/x-editorx-media', m.id);
      e.dataTransfer.setData('text/plain', m.name);
      row.classList.add('dragging');
    });
    row.addEventListener('dragend', ()=>{ row.classList.remove('dragging'); });
    list.appendChild(row);
  });
}

function renderTransitionsList(){
  const list = document.getElementById('transitions-grid'); if(!list) return;
  list.innerHTML = '';
  const sel = getSelectedClip();
  TRANSITIONS.forEach(tr=>{
    const isApplied = sel && sel.transition===tr.id;
    const card = document.createElement('div'); card.className = 'list-card' + (isApplied?' selected':'');
    card.innerHTML = `
      <div class="lc-preview tr-preview tr-${tr.id}">
        <span class="tp-a"></span><span class="tp-b"></span>
      </div>
      <div class="lc-body"><div class="lc-name">${tr.name}</div>
      <div class="lc-meta">${tr.desc} · ${tr.duration}s</div></div>
      <button class="lc-action" title="${isApplied?'Remove':'Apply'}"><i data-lucide="${isApplied?'check':'plus'}" width="12" height="12"></i></button>`;
    card.addEventListener('click', ()=>{
      if(!state.selectedClipId){ flash('Select a clip first'); return; }
      if(isApplied) clearTransition(state.selectedClipId);
      else setTransition(state.selectedClipId, tr.id);
      pushHistory(); render();
    });
    list.appendChild(card);
  });
}

function renderLUTs(){
  const list = document.getElementById('luts-grid'); if(!list) return;
  list.innerHTML = '';
  const sel = getSelectedClip();
  LUTS.forEach(lut=>{
    const isApplied = sel && sel.lutId===lut.id;
    const card = document.createElement('div'); card.className = 'list-card' + (isApplied?' selected':'');
    // Color-graded preview: a sample gradient with the LUT's color blended on top
    // using its declared blend mode and intensity, so each card actually shows
    // what the grade looks like.
    const intensity = (sel && isApplied ? (sel.lutIntensity ?? lut.def) : lut.def) || 0;
    const previewStyle = lut.id === 'none'
      ? ''
      : `--lut-color:${lut.color};--lut-alpha:${intensity};--lut-blend:${lut.blend}`;
    card.innerHTML = `
      <div class="lc-preview lut-preview" style="${previewStyle}">
        <div class="lp-base"></div>
        <div class="lp-grade"></div>
      </div>
      <div class="lc-body"><div class="lc-name">${lut.name}</div>
      <div class="lc-meta">${lut.cat}${isApplied?` · ${Math.round((sel.lutIntensity??lut.def)*100)}%`:''}</div></div>
      <button class="lc-action" title="${isApplied?'Remove':'Apply'}"><i data-lucide="${isApplied?'check':'plus'}" width="12" height="12"></i></button>`;
    card.addEventListener('click', ()=>{
      if(!state.selectedClipId){ flash('Select a clip first'); return; }
      if(lut.id==='none' || isApplied) clearLut(state.selectedClipId);
      else setLut(state.selectedClipId, lut.id, lut.def);
      pushHistory(); render();
    });
    list.appendChild(card);
  });
}

function renderEffects(){
  const list = document.getElementById('effects-grid'); if(!list) return;
  list.innerHTML = '';
  const sel = getSelectedClip();
  EFFECTS.forEach(fx=>{
    const isApplied = sel && sel.effectId===fx.id;
    const card = document.createElement('div'); card.className = 'list-card' + (isApplied?' selected':'');
    card.innerHTML = `<div class="lc-icon"><i data-lucide="${fx.icon}" width="14" height="14"></i></div>
      <div class="lc-body"><div class="lc-name">${fx.name}</div>
      <div class="lc-meta">${fx.cat} · ${fx.desc}</div></div>
      <button class="lc-action" title="${isApplied?'Remove':'Apply'}"><i data-lucide="${isApplied?'check':'plus'}" width="12" height="12"></i></button>`;
    card.addEventListener('click', ()=>{
      if(!state.selectedClipId){ flash('Select a clip first'); return; }
      if(isApplied || fx.id==='none') clearEffect(state.selectedClipId);
      else setEffect(state.selectedClipId, fx.id);
      pushHistory(); render();
    });
    list.appendChild(card);
  });
}

function renderTitles(){
  const list = document.getElementById('titles-grid'); if(!list) return;
  list.innerHTML = '';
  TITLES.forEach(t=>{
    const card = document.createElement('div'); card.className = 'preset-card';
    card.draggable = true;
    card.dataset.titleId = t.id;
    // Static visual preview — renders the title text in its actual font/weight/color
    card.innerHTML = `
      <div class="preset-preview title-preview">
        <span style="font-family:'${t.font}',serif;font-weight:${t.weight};color:${t.color};
          font-size:${Math.min(15, 11 * (t.scale||1))}px;
          letter-spacing:-.3px;line-height:1.15;text-align:center;padding:0 6px;
          text-shadow:0 1px 2px rgba(0,0,0,.6)">${escapeHtml(t.defaultText)}</span>
      </div>
      <div class="preset-name">${t.name}</div>`;
    card.addEventListener('click', ()=>{
      addTextClipAt(state.playhead, t);
      if(window.loadFont) window.loadFont(t.font).then(()=>renderViewer());
      pushHistory(); render();
    });
    card.addEventListener('dragstart', e=>{
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('application/x-editorx-title', t.id);
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', ()=>card.classList.remove('dragging'));
    list.appendChild(card);
  });
}

function renderGraphics(){
  const list = document.getElementById('graphics-grid'); if(!list) return;
  list.innerHTML = '';
  if(!window.GRAPHICS) return;
  GRAPHICS.forEach(g=>{
    const card = document.createElement('div'); card.className = 'preset-card';
    card.draggable = true;
    card.dataset.graphicId = g.id;
    const radius = g.style === 'pill' ? '999px' : g.style === 'badge' ? '4px' : '8px';
    const bgStyle = g.bg.startsWith('linear-gradient')
      ? `background:${g.bg}`
      : `background:${g.bg}`;
    // Mini call-out preview — rounded background + icon + text, matches the canvas render
    card.innerHTML = `
      <div class="preset-preview graphic-preview">
        <div class="gp-pill" style="${bgStyle};border-radius:${radius};color:${g.fg}">
          <i data-lucide="${g.icon}" width="11" height="11" style="color:${g.accent};stroke-width:2.4"></i>
          <span style="font-family:'${g.font}',serif;font-weight:${g.weight};font-size:9px;letter-spacing:-.1px">${escapeHtml(g.defaultText)}</span>
        </div>
      </div>
      <div class="preset-name">${g.name}</div>`;
    card.addEventListener('click', ()=>{
      addGraphicAt(state.playhead, g);
      if(window.loadFont) window.loadFont(g.font).then(()=>renderViewer());
      pushHistory(); render();
    });
    card.addEventListener('dragstart', e=>{
      e.dataTransfer.effectAllowed = 'copy';
      e.dataTransfer.setData('application/x-editorx-graphic', g.id);
      card.classList.add('dragging');
    });
    card.addEventListener('dragend', ()=>card.classList.remove('dragging'));
    list.appendChild(card);
  });
}

function renderMaskTypes(){
  const list = document.getElementById('mask-types-list'); if(!list) return;
  list.innerHTML = '';
  MASK_TYPES.forEach(mt=>{
    const card = document.createElement('div'); card.className = 'mask-type-card';
    card.innerHTML = `<div class="mt-icon" style="background:${mt.color}22;color:${mt.color}"><i data-lucide="${mt.icon}" width="16" height="16"></i></div>
      <div class="mt-body"><div class="mt-name">${mt.name}</div><div class="mt-desc">${mt.desc}</div></div>
      <div class="mt-add"><i data-lucide="plus-circle" width="14" height="14"></i></div>`;
    card.addEventListener('click', ()=>{
      if(!state.selectedClipId){ flash('Select a clip first'); return; }
      addMask(state.selectedClipId, mt.id); pushHistory(); render();
    });
    list.appendChild(card);
  });
}

function renderAppliedMasks(){
  const list = document.getElementById('applied-masks-list'); if(!list) return;
  list.innerHTML = '';
  if(!state.selectedClipId){ list.innerHTML = '<div class="empty-sub" style="padding:12px;text-align:center">Select a clip</div>'; return; }
  const masks = state.masks[state.selectedClipId] || [];
  if(!masks.length){ list.innerHTML = '<div class="empty-sub" style="padding:12px;text-align:center">No masks</div>'; return; }
  masks.forEach(m=>{
    const mt = MASK_TYPES.find(t=>t.id===m.type);
    const el = document.createElement('div'); el.className = 'applied-mask' + (state.selectedMaskId===m.id?' selected':'');
    el.innerHTML = `<div class="am-dot" style="background:${mt?mt.color:'#888'}"></div>
      <span class="am-name">${escapeHtml(m.name)}</span>
      <div class="am-actions">
        <button class="am-btn" data-action="toggle" title="Toggle"><i data-lucide="${m.enabled?'eye':'eye-off'}" width="10" height="10"></i></button>
        <button class="am-btn" data-action="edit" title="Edit"><i data-lucide="edit-2" width="10" height="10"></i></button>
        <button class="am-btn" data-action="delete" title="Delete"><i data-lucide="x" width="10" height="10"></i></button>
      </div>`;
    el.querySelector('[data-action="toggle"]').addEventListener('click', e=>{ e.stopPropagation(); m.enabled = !m.enabled; render(); });
    el.querySelector('[data-action="edit"]').addEventListener('click', e=>{ e.stopPropagation(); state.selectedMaskId = m.id; if(window.openMaskProps) openMaskProps(m); render(); });
    el.querySelector('[data-action="delete"]').addEventListener('click', e=>{ e.stopPropagation(); removeMask(state.selectedClipId, m.id); pushHistory(); render(); });
    el.addEventListener('click', ()=>{ state.selectedMaskId = m.id; render(); });
    list.appendChild(el);
  });
}

// ---------- Inspector ----------
function inspSection(title, open, body){
  return `<div class="insp-section${open?' open':''}">
    <div class="insp-section-header" onclick="this.parentElement.classList.toggle('open')">
      <span class="insp-section-title">${title}</span>
      <span class="insp-section-chevron"><i data-lucide="chevron-right" width="10" height="10"></i></span>
    </div>
    <div class="insp-section-body">${body}</div>
  </div>`;
}
function inspNumRow(label, displayVal, min, max, step, unit, prop, transform){
  const tr = transform ? ` data-transform="${escapeHtml(transform)}"` : '';
  const v = Number(displayVal).toFixed(step<1 ? 2 : 0);
  return `<div class="insp-row"><label>${label}</label>
    <input type="range" min="${min}" max="${max}" step="${step}" value="${displayVal}" data-prop="${prop}" data-unit="${unit}"${tr}>
    <span class="insp-value">${v}${unit}</span></div>`;
}
function inspTextRow(label, prop, value){
  return `<div class="insp-row"><label>${label}</label>
    <input type="text" data-prop="${prop}" value="${escapeHtml(value)}" class="insp-text"></div>`;
}
function inspColorRow(label, prop, value){
  return `<div class="insp-row"><label>${label}</label>
    <input type="color" data-prop="${prop}" value="${value}" class="insp-color"></div>`;
}

function renderInspector(){
  const title = document.getElementById('inspector-title');
  const content = document.getElementById('inspector-content');
  if(!state.selectedClipId){
    title.textContent = 'Inspector';
    content.innerHTML = `<div class="inspector-empty">
      <div class="empty-icon"><i data-lucide="mouse-pointer-click" width="32" height="32"></i></div>
      <div class="empty-title">Nothing selected</div>
      <div class="empty-sub">Click a clip on the timeline to edit it.</div>
      <div class="quick-tips">
        <div class="qt-title">Shortcuts</div>
        <div>Space &nbsp;Play / pause</div>
        <div>J / L &nbsp;Step ±1s</div>
        <div>B &nbsp;Blade</div>
        <div>⌘Z / ⌘⇧Z &nbsp;Undo / redo</div>
        <div>⌫ &nbsp;Delete clip</div>
      </div>
    </div>`;
    return;
  }
  const clip = getSelectedClip();
  if(!clip){ title.textContent='Inspector'; content.innerHTML=''; return; }
  title.textContent = clip.name;

  let html = '';

  // CLIP info
  const startS = (clip.x - TIMELINE_OFFSET_X) / TIMELINE_PX_PER_S;
  const durS = clip.w / TIMELINE_PX_PER_S;
  html += inspSection('CLIP', true,
    `${inspTextRow('Name','name',clip.name)}
     <div class="insp-row"><label>Start</label><span class="insp-value" style="width:auto;text-align:left">${startS.toFixed(2)}s</span></div>
     <div class="insp-row"><label>Duration</label><span class="insp-value" style="width:auto;text-align:left">${durS.toFixed(2)}s</span></div>
     <div class="insp-row"><label>Type</label><span class="insp-value" style="width:auto;text-align:left">${clip.type}</span></div>`);

  // TRANSFORM (video + text)
  if(clip.type==='video' || clip.type==='text'){
    html += inspSection('TRANSFORM', true,
      inspNumRow('Position X', clip.posX??0, -1000, 1000, 1, 'px', 'posX')+
      inspNumRow('Position Y', clip.posY??0, -1000, 1000, 1, 'px', 'posY')+
      inspNumRow('Scale',      (clip.scale??1)*100, 10, 400, 1, '%', 'scale', 'v/100')+
      inspNumRow('Rotation',   clip.rotation??0, -180, 180, 1, '°', 'rotation')+
      inspNumRow('Opacity',    (clip.opacity??1)*100, 0, 100, 1, '%', 'opacity', 'v/100'));
  }

  // AUDIO
  if(clip.type==='video' || clip.type==='audio'){
    html += inspSection('AUDIO', true,
      inspNumRow('Volume', (clip.volume??1)*100, 0, 200, 1, '%', 'volume', 'v/100')+
      `<div class="insp-toggle-row"><label>Muted</label><input type="checkbox" data-toggle="muted" ${clip.muted?'checked':''}></div>`+
      inspNumRow('Speed',  (clip.speed??1)*100, 25, 400, 1, '%', 'speed', 'v/100'));
  }

  // TRANSCRIPT — Whisper-tiny on-device for audio clips with a source URL
  if(clip.type === 'audio'){
    const hasTranscript = clip.transcript && clip.transcript.length;
    const chunks = (clip.transcriptChunks || []).length;
    let trBody = '';
    if(hasTranscript){
      trBody += `<div class="ip-row" style="background:transparent;border-color:var(--accent)">
        <i data-lucide="captions" width="13" height="13" style="color:var(--accent)"></i>
        <span class="ip-name">${chunks} caption${chunks===1?'':'s'} ready</span>
        <button class="ip-rm" data-action="clear-transcript" title="Clear transcript"><i data-lucide="x" width="10" height="10"></i></button>
      </div>`;
      trBody += `<div class="transcript-text">${escapeHtml(clip.transcript)}</div>`;
      trBody += `<button class="anim-btn" data-action="add-captions" style="width:100%;justify-content:center;margin-top:6px">
        <i data-lucide="plus" width="13" height="13"></i><span>Add as Captions on T1</span></button>`;
    } else {
      trBody += '<div class="empty-sub" style="margin-bottom:8px">Transcribe speech to timestamped captions using Whisper-tiny on-device. First run downloads the model (~75MB, cached after).</div>';
    }
    trBody += `<button class="anim-btn" data-action="transcribe" style="width:100%;justify-content:center;margin-top:6px" ${clip.sourceUrl?'':'disabled'}>
      <i data-lucide="mic" width="13" height="13"></i><span>${hasTranscript?'Re-transcribe':'Transcribe Audio'}</span>
    </button>`;
    trBody += `<div class="empty-sub transcript-status" id="transcript-status" style="margin-top:6px;display:none"></div>`;
    if(!clip.sourceUrl){
      trBody += '<div class="empty-sub" style="margin-top:6px">Demo placeholder — import a real audio file to transcribe.</div>';
    }
    html += inspSection('TRANSCRIPT', true, trBody);
  }

  // BEATS — show only for audio clips. Detect → mark beats → optionally use
  // to cut other video clips.
  if(clip.type === 'audio'){
    const hasBeats = clip.beats && clip.beats.length;
    let beatsBody = '';
    if(hasBeats){
      beatsBody += `<div class="ip-row" style="background:transparent;border-color:var(--accent)">
        <i data-lucide="audio-waveform" width="13" height="13" style="color:var(--accent)"></i>
        <span class="ip-name">${clip.beats.length} beats detected${clip.bpm?` · ~${clip.bpm} BPM`:''}</span>
        <button class="ip-rm" data-action="clear-beats" title="Clear beats"><i data-lucide="x" width="10" height="10"></i></button>
      </div>`;
      beatsBody += '<div class="empty-sub" style="margin-bottom:8px">Now select a video clip on V1 and use <b>Cut on Beats</b> to chop it on every beat.</div>';
    } else {
      beatsBody += '<div class="empty-sub" style="margin-bottom:8px">Analyze the audio to find onsets (kicks/snares). Then any video clip can be cut on every beat.</div>';
    }
    beatsBody += `<button class="anim-btn" data-action="detect-beats" style="width:100%;justify-content:center" ${clip.sourceUrl?'':'disabled'}>
      <i data-lucide="activity" width="13" height="13"></i><span>${hasBeats?'Re-analyze beats':'Detect Beats'}</span>
    </button>`;
    if(!clip.sourceUrl){
      beatsBody += '<div class="empty-sub" style="margin-top:6px">Demo placeholder clip — import a real audio file to detect beats.</div>';
    }
    html += inspSection('BEATS', true, beatsBody);
  }

  // BEATS — show for video clips when ANY audio clip has detected beats.
  if(clip.type === 'video'){
    const beatSource = state.clips.find(c => c.type==='audio' && c.beats && c.beats.length);
    if(beatSource){
      const beatsBody = `<div class="empty-sub" style="margin-bottom:8px">Using beats from <b>${escapeHtml(beatSource.name)}</b> · ${beatSource.beats.length} beats${beatSource.bpm?` · ~${beatSource.bpm} BPM`:''}.</div>
        <div class="anim-presets" style="margin-bottom:0">
          <button class="anim-btn" data-action="cut-beats" data-every="1"><i data-lucide="scissors" width="13" height="13"></i><span>Every beat</span></button>
          <button class="anim-btn" data-action="cut-beats" data-every="2"><i data-lucide="scissors" width="13" height="13"></i><span>Every 2nd</span></button>
          <button class="anim-btn" data-action="cut-beats" data-every="4"><i data-lucide="scissors" width="13" height="13"></i><span>Every 4th</span></button>
          <button class="anim-btn" data-action="cut-beats" data-every="8"><i data-lucide="scissors" width="13" height="13"></i><span>Every 8th</span></button>
        </div>`;
      html += inspSection('CUT ON BEATS', true, beatsBody);
    }
  }

  // TEXT (with font picker + speech-to-text + text-to-speech)
  if(clip.type==='text'){
    const fontOpts = (window.FONTS||[]).map(f=>`<option value="${escapeHtml(f)}" ${clip.font===f?'selected':''}>${escapeHtml(f)}</option>`).join('');
    html += inspSection('TEXT', true,
      inspTextRow('Text','text',clip.text||'')+
      `<div class="insp-row"><label></label>
         <div class="insp-actions">
           <button class="ghost-btn small" data-action="dictate" title="Dictate (speech → text)">
             <i data-lucide="mic" width="12" height="12"></i><span>Dictate</span></button>
           <button class="ghost-btn small" data-action="speak" title="Speak this text aloud">
             <i data-lucide="volume-2" width="12" height="12"></i><span>Speak</span></button>
         </div></div>`+
      inspColorRow('Color','color',clip.color||'#FFFFFF')+
      `<div class="insp-row"><label>Font</label>
         <input type="text" class="insp-text" data-font-search list="fontlist-${clip.id}" value="${escapeHtml(clip.font||'Fraunces')}" placeholder="Search Google Fonts…">
         <datalist id="fontlist-${clip.id}">${fontOpts}</datalist></div>`+
      `<div class="insp-row"><label>Weight</label>
        <select data-prop-num="fontWeight" class="insp-select">
          ${[100,200,300,400,500,600,700,800,900].map(w=>`<option value="${w}" ${(clip.fontWeight||700)===w?'selected':''}>${w}</option>`).join('')}
        </select></div>`
    );
  }

  // GRAPHIC — appears only for clips with a graphicStyle (i.e. ones
  // dropped from the Graphics & Call-outs panel). Lets the user edit the
  // pill/card style, background color, accent color, icon, and glass.
  if(clip.graphicStyle){
    const iconList = window.GRAPHIC_ICONS ? Object.keys(window.GRAPHIC_ICONS) : [];
    // The background can be a solid color or a CSS linear-gradient string.
    // We can't show a gradient in a <input type=color>, so we offer either a
    // color picker (solid) or a text field if it's a gradient.
    const isGradient = typeof clip.graphicBg === 'string' && clip.graphicBg.startsWith('linear-gradient');
    const bgRow = isGradient
      ? `<div class="insp-row"><label>Background</label>
           <input type="text" class="insp-text" data-prop="graphicBg" value="${escapeHtml(clip.graphicBg)}" placeholder="linear-gradient(...)"></div>
         <div class="empty-sub" style="margin-bottom:6px">Tip: paste any CSS <code>linear-gradient(…)</code> string, or replace with a solid <code>#hex</code>.</div>`
      : `<div class="insp-row"><label>Background</label>
           <input type="color" data-prop="graphicBg" value="${(clip.graphicBg||'#000000').slice(0,7)}" class="insp-color"></div>`;
    html += inspSection('GRAPHIC', true,
      `<div class="insp-row"><label>Style</label>
         <select class="insp-select" data-prop="graphicStyle">
           <option value="pill"  ${clip.graphicStyle==='pill'?'selected':''}>Pill</option>
           <option value="card"  ${clip.graphicStyle==='card'?'selected':''}>Card</option>
           <option value="badge" ${clip.graphicStyle==='badge'?'selected':''}>Badge</option>
         </select></div>`+
      bgRow+
      `<div class="insp-row"><label>Accent</label>
         <input type="color" data-prop="graphicAccent" value="${(clip.graphicAccent||'#FFFFFF').slice(0,7)}" class="insp-color"></div>`+
      `<div class="insp-row"><label>Icon</label>
         <select class="insp-select" data-prop="graphicIcon">
           ${iconList.map(name => `<option value="${name}" ${clip.graphicIcon===name?'selected':''}>${name}</option>`).join('')}
         </select></div>`+
      `<div class="insp-toggle-row"><label>Glass highlight</label>
         <input type="checkbox" data-toggle="graphicGlass" ${clip.graphicGlass?'checked':''}></div>`
    );
  }

  // TRANSITION
  const tr = clip.transition && (window.TRANSITIONS||[]).find(t=>t.id===clip.transition);
  html += inspSection('TRANSITION', false, tr
    ? `<div class="ip-row"><i data-lucide="${tr.icon}" width="12" height="12"></i><span class="ip-name">${tr.name}</span><button class="ip-rm" data-action="rm-trans"><i data-lucide="x" width="10" height="10"></i></button></div>
       <div class="empty-sub">${tr.desc} · ${tr.duration}s</div>`
    : '<div class="empty-sub">No transition. Apply one from the Transitions tab.</div>');

  // LUT
  const lut = clip.lutId && (window.LUTS||[]).find(l=>l.id===clip.lutId);
  html += inspSection('LUT', false, lut
    ? `<div class="ip-row"><span class="ip-swatch" style="background:${lut.color}"></span><span class="ip-name">${lut.name}</span><button class="ip-rm" data-action="rm-lut"><i data-lucide="x" width="10" height="10"></i></button></div>`+
      inspNumRow('Intensity', (clip.lutIntensity??lut.def)*100, 0, 100, 1, '%', 'lutIntensity', 'v/100')
    : '<div class="empty-sub">No LUT. Apply one from the LUTs tab.</div>');

  // EFFECT
  const fx = clip.effectId && (window.EFFECTS||[]).find(e=>e.id===clip.effectId);
  let fxBody;
  if(fx){
    fxBody = `<div class="ip-row"><i data-lucide="${fx.icon}" width="12" height="12"></i><span class="ip-name">${fx.name}</span><button class="ip-rm" data-action="rm-fx"><i data-lucide="x" width="10" height="10"></i></button></div>`;
    if(fx.params && fx.params.amount){
      const p = fx.params.amount;
      fxBody += inspNumRow('Amount', clip.fxAmount??p.def, p.min, p.max, p.unit==='°'||p.unit==='%'?1:0.1, p.unit||'', 'fxAmount');
    } else {
      fxBody += '<div class="empty-sub">No parameters.</div>';
    }
  } else {
    fxBody = '<div class="empty-sub">No effect. Apply one from the Effects tab.</div>';
  }
  html += inspSection('EFFECT', false, fxBody);

  // ANIMATION — quick presets + keyframe list
  let animBody = `
    <div class="anim-presets">
      <button class="anim-btn" data-anim="zoom" title="Snap-zoom on a beat">
        <i data-lucide="zoom-in" width="13" height="13"></i><span>Zoom Punch</span></button>
      <button class="anim-btn" data-anim="shake" title="Beat-synced shake">
        <i data-lucide="vibrate" width="13" height="13"></i><span>Beat Shake</span></button>
      <button class="anim-btn" data-anim="pan" title="Smooth horizontal pan">
        <i data-lucide="move-horizontal" width="13" height="13"></i><span>Pan</span></button>
      <button class="anim-btn" data-anim="ken" title="Slow continuous zoom (Ken Burns)">
        <i data-lucide="trending-up" width="13" height="13"></i><span>Ken Burns</span></button>
      <button class="anim-btn" data-anim="fadeIn" title="Fade in over 0.4s">
        <i data-lucide="sunrise" width="13" height="13"></i><span>Fade In</span></button>
      <button class="anim-btn" data-anim="fadeOut" title="Fade out over 0.4s">
        <i data-lucide="sunset" width="13" height="13"></i><span>Fade Out</span></button>
    </div>`;
  // Per-property keyframe rows
  const kfMap = clip.keyframes || {};
  const animProps = ['posX','posY','scale','rotation','opacity'];
  const animPropLabels = {posX:'Position X', posY:'Position Y', scale:'Scale', rotation:'Rotation', opacity:'Opacity'};
  let kfRows = '';
  animProps.forEach(p=>{
    const arr = kfMap[p] || [];
    if(arr.length === 0) return;
    kfRows += `<div class="kf-prop">
      <div class="kf-prop-head">
        <span><i data-lucide="diamond" width="9" height="9"></i> ${animPropLabels[p]}</span>
        <button class="kf-clear-btn" data-action="clear-kf" data-prop="${p}" title="Clear all">×</button>
      </div>
      <div class="kf-list">`;
    arr.forEach(kf=>{
      kfRows += `<div class="kf-chip" data-prop="${p}" data-t="${kf.t}">
        <span class="kf-chip-time">${kf.t.toFixed(2)}s</span>
        <span class="kf-chip-val">${typeof kf.v==='number' ? Number(kf.v).toFixed(2) : kf.v}</span>
        <button class="kf-chip-rm" title="Delete"><i data-lucide="x" width="9" height="9"></i></button>
      </div>`;
    });
    kfRows += '</div></div>';
  });
  if(!kfRows) kfRows = '<div class="empty-sub" style="padding:8px 0;text-align:center">No keyframes. Use a preset above or click ◇ next to any transform value to keyframe at the playhead.</div>';
  // Diamond buttons to keyframe individual props at the playhead
  animBody += `<div class="kf-quick">
    ${animProps.map(p=>`<button class="kf-diamond-btn" data-kf-prop="${p}" title="Keyframe ${animPropLabels[p]} at playhead">◇ ${animPropLabels[p]}</button>`).join('')}
  </div>`;
  animBody += kfRows;
  html += inspSection('ANIMATION', true, animBody);

  // MASKS
  const masks = state.masks[clip.id] || [];
  let masksBody = '';
  if(!masks.length){
    masksBody = '<div class="empty-sub" style="text-align:center;padding:8px">No masks</div>';
  } else {
    masks.forEach(m=>{
      const mt = MASK_TYPES.find(t=>t.id===m.type);
      masksBody += `<div class="mask-insp-item${state.selectedMaskId===m.id?' selected':''}" data-mask="${m.id}">
        <div class="mi-dot" style="background:${mt?mt.color:'#888'}22;color:${mt?mt.color:'#888'}">${mt?'<i data-lucide="'+mt.icon+'" width="10" height="10"></i>':'?'}</div>
        <span class="mi-name">${escapeHtml(m.name)}</span>
        <button class="mi-eye"><i data-lucide="${m.enabled?'eye':'eye-off'}" width="10" height="10"></i></button></div>`;
    });
  }
  masksBody += '<button class="ghost-btn" id="insp-add-mask" style="margin-top:8px">+ Add Rectangle Mask</button>';
  html += inspSection('MASKS', false, masksBody);

  content.innerHTML = html;

  // Wire numeric ranges. We deliberately AVOID renderClips() on every input
  // event — slider drags fire dozens of times per second, and rebuilding the
  // timeline DOM each tick is the second-biggest flicker source after
  // overlay-rebuild. Viewer + value label are all that need to update live;
  // the timeline gets one render on release.
  content.querySelectorAll('input[type=range][data-prop]').forEach(inp=>{
    const prop = inp.dataset.prop;
    inp.addEventListener('input', e=>{
      const raw = parseFloat(e.target.value);
      const tr = inp.dataset.transform;
      const v = tr ? new Function('v','return '+tr)(raw) : raw;
      updateClip(clip.id, {[prop]: v});
      const valSpan = inp.parentElement.querySelector('.insp-value');
      if(valSpan) valSpan.textContent = Number(raw).toFixed(0) + (inp.dataset.unit||'');
      renderViewer();
    });
    inp.addEventListener('change', ()=>{ pushHistory(); renderClips(); });
  });

  // Wire text + color
  content.querySelectorAll('input[type=text][data-prop],input[type=color][data-prop]').forEach(inp=>{
    const prop = inp.dataset.prop;
    inp.addEventListener('input', e=>{
      updateClip(clip.id, {[prop]: e.target.value});
      if(prop==='name'){ renderClips(); }
      else { renderViewer(); renderClips(); }
    });
    inp.addEventListener('change', ()=>{
      pushHistory();
      if(prop==='name'){ const t=document.getElementById('inspector-title'); if(t) t.textContent=clip.name; }
    });
  });

  // Wire toggles
  content.querySelectorAll('input[type=checkbox][data-toggle]').forEach(inp=>{
    inp.addEventListener('change', e=>{
      updateClip(clip.id, {[inp.dataset.toggle]: e.target.checked});
      pushHistory(); render();
    });
  });

  // Wire numeric selects (font weight)
  content.querySelectorAll('select[data-prop-num]').forEach(sel=>{
    sel.addEventListener('change', e=>{
      updateClip(clip.id, {[sel.dataset.propNum]: parseInt(e.target.value)});
      pushHistory(); renderViewer();
    });
  });
  // Wire string-valued selects (graphic style, icon, etc.)
  content.querySelectorAll('select[data-prop]').forEach(sel=>{
    sel.addEventListener('change', e=>{
      updateClip(clip.id, {[sel.dataset.prop]: e.target.value});
      pushHistory(); renderViewer(); renderClips();
    });
  });

  // Font search input — load on selection
  const fontInput = content.querySelector('input[data-font-search]');
  if(fontInput){
    fontInput.addEventListener('change', async (e)=>{
      const family = e.target.value.trim();
      if(!family) return;
      updateClip(clip.id, {font: family});
      if(window.loadFont){ await window.loadFont(family); }
      pushHistory(); renderViewer();
    });
  }

  // Section actions
  content.querySelector('[data-action="rm-trans"]')?.addEventListener('click', ()=>{ clearTransition(clip.id); pushHistory(); render(); });
  content.querySelector('[data-action="rm-lut"]')  ?.addEventListener('click', ()=>{ clearLut(clip.id); pushHistory(); render(); });
  content.querySelector('[data-action="rm-fx"]')   ?.addEventListener('click', ()=>{ clearEffect(clip.id); pushHistory(); render(); });
  content.querySelector('#insp-add-mask')          ?.addEventListener('click', ()=>{ addMask(clip.id,'rectangle'); pushHistory(); render(); });
  content.querySelector('[data-action="dictate"]') ?.addEventListener('click', (e)=>{
    const btn = e.currentTarget;
    startDictation(clip, btn);
  });
  content.querySelector('[data-action="speak"]')   ?.addEventListener('click', ()=>{
    speakText(clip.text || clip.name || '');
  });
  // Animation preset buttons
  content.querySelectorAll('.anim-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const kind = btn.dataset.anim;
      switch(kind){
        case 'zoom':    applyZoomPunch(clip.id); break;
        case 'shake':   applyBeatShake(clip.id); break;
        case 'pan':     applyPan(clip.id, 100, 'right'); break;
        case 'ken':     applyKenBurns(clip.id, 1.18); break;
        case 'fadeIn':  applyFadeIn(clip.id, 0.4); break;
        case 'fadeOut': applyFadeOut(clip.id, 0.4); break;
      }
      pushHistory(); renderInspector(); renderViewer();
      flash(btn.textContent.trim() + ' added');
    });
  });
  // Diamond keyframe buttons — snapshot current value at playhead
  content.querySelectorAll('.kf-diamond-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const prop = btn.dataset.kfProp;
      addKeyframeAtPlayhead(clip.id, prop);
      pushHistory(); renderInspector(); renderViewer();
    });
  });
  // Remove a single keyframe chip
  content.querySelectorAll('.kf-chip').forEach(chip=>{
    chip.querySelector('.kf-chip-rm').addEventListener('click', e=>{
      e.stopPropagation();
      removeKeyframe(clip.id, chip.dataset.prop, parseFloat(chip.dataset.t));
      pushHistory(); renderInspector(); renderViewer();
    });
  });
  // Clear all keyframes for a property
  content.querySelectorAll('[data-action="clear-kf"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      clearKeyframes(clip.id, btn.dataset.prop);
      pushHistory(); renderInspector(); renderViewer();
    });
  });

  // Detect beats on the current audio clip
  content.querySelector('[data-action="detect-beats"]')?.addEventListener('click', async (e)=>{
    const btn = e.currentTarget;
    if(btn.disabled) return;
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i data-lucide="loader" width="13" height="13"></i><span>Analyzing…</span>';
    if(window.lucide) lucide.createIcons({root:btn});
    try{
      const r = await analyzeClipBeats(clip.id);
      flash(r && r.beats ? `Found ${r.beats.length} beats${r.bpm?` (~${r.bpm} BPM)`:''}` : 'No beats detected');
      pushHistory(); render();
    }catch(err){
      flash('Beat detection failed: ' + err.message);
      btn.disabled = false;
      btn.innerHTML = orig;
      if(window.lucide) lucide.createIcons({root:btn});
    }
  });
  // Clear beats
  content.querySelector('[data-action="clear-beats"]')?.addEventListener('click', ()=>{
    delete clip.beats; delete clip.bpm;
    pushHistory(); render(); flash('Beats cleared');
  });
  // Transcribe audio (Whisper-tiny in browser)
  content.querySelector('[data-action="transcribe"]')?.addEventListener('click', async (e)=>{
    const btn = e.currentTarget;
    if(btn.disabled) return;
    const status = content.querySelector('#transcript-status');
    btn.disabled = true;
    const origHTML = btn.innerHTML;
    btn.innerHTML = '<i data-lucide="loader" width="13" height="13"></i><span>Working…</span>';
    if(window.lucide) lucide.createIcons({root:btn});
    if(status){ status.style.display='block'; status.textContent='Starting…'; }
    try{
      const result = await transcribeAudioClip(clip.id, (p)=>{
        if(status) status.textContent = p.label || p.status || 'Working…';
      });
      pushHistory(); render();
      flash(result && result.chunks ? `Transcribed ${result.chunks.length} segments` : 'Transcribed');
    }catch(err){
      console.error(err);
      flash('Transcription failed: ' + (err.message || 'unknown'));
      btn.disabled = false;
      btn.innerHTML = origHTML;
      if(window.lucide) lucide.createIcons({root:btn});
      if(status) status.textContent = 'Failed — see console for details.';
    }
  });
  // Clear transcript
  content.querySelector('[data-action="clear-transcript"]')?.addEventListener('click', ()=>{
    delete clip.transcript; delete clip.transcriptChunks;
    pushHistory(); render(); flash('Transcript cleared');
  });
  // Add transcript as captions on T1
  content.querySelector('[data-action="add-captions"]')?.addEventListener('click', ()=>{
    const n = addTranscriptAsCaptions(clip.id);
    pushHistory(); render();
    flash(n > 0 ? `Added ${n} caption${n===1?'':'s'} on T1` : 'No usable captions to add');
  });
  // Cut video on beats (every N-th)
  content.querySelectorAll('[data-action="cut-beats"]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const every = parseInt(btn.dataset.every) || 1;
      const beatSource = state.clips.find(c => c.type==='audio' && c.beats && c.beats.length);
      if(!beatSource){ flash('No beats available'); return; }
      const cuts = cutVideoOnBeats(clip.id, beatSource.id, every);
      pushHistory(); render();
      flash(cuts ? `Made ${cuts} cut${cuts===1?'':'s'}` : 'No beats fell inside this clip');
    });
  });

  // Mask sub-clicks
  content.querySelectorAll('.mask-insp-item').forEach(el=>{
    el.addEventListener('click', ()=>{ state.selectedMaskId = el.dataset.mask; render(); });
    const eye = el.querySelector('.mi-eye');
    if(eye) eye.addEventListener('click', e=>{ e.stopPropagation();
      const m = masks.find(mm=>mm.id===el.dataset.mask);
      if(m){ m.enabled = !m.enabled; render(); }
    });
  });
}

// ---------- Viewer (canvas) ----------
function renderViewer(){
  const c = document.getElementById('viewer-canvas');
  if(!c) return;
  // Honor the project's chosen dimensions (set when the project was created/loaded)
  if(state.canvasW && state.canvasH && (c.width !== state.canvasW || c.height !== state.canvasH)){
    c.width  = state.canvasW;
    c.height = state.canvasH;
  }
  const ctx = c.getContext('2d');

  // Backdrop
  ctx.save();
  ctx.fillStyle = '#000';
  ctx.fillRect(0,0,c.width,c.height);

  // Find active video clip(s) at current playhead
  const tS = state.playhead/1000;
  const activeVids = activeClipsAt(tS, 'video');

  if(activeVids.length === 0){
    // Empty placeholder
    ctx.fillStyle = '#0E0E12';
    ctx.fillRect(0,0,c.width,c.height);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.font = `900 64px Inter, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText('EditorX', c.width/2, c.height/2 - 4);
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.font = `500 16px Inter, sans-serif`;
    ctx.fillText('Drop media into the Library, or pick a clip on the timeline.', c.width/2, c.height/2 + 28);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    for(let x=0;x<c.width;x+=80){ ctx.fillRect(x,0,1,c.height); }
    for(let y=0;y<c.height;y+=80){ ctx.fillRect(0,y,c.width,1); }
  } else {
    // Composite each active video clip
    for(const clip of activeVids){
      drawVideoClip(ctx, c, clip);
    }
  }

  // Text overlays for any active text clip (graphics are text clips with
  // extra styling props — dispatch to drawGraphicClip when graphicStyle is set)
  const activeTexts = activeClipsAt(tS, 'text');
  for(const tc of activeTexts){
    if(tc.graphicStyle) drawGraphicClip(ctx, c, tc);
    else                drawTextClip(ctx, c, tc);
  }

  // (Mask shapes are NOT painted on the canvas — the DOM overlay in
  //  #mask-overlay is the editing affordance and the only visible mask UI.
  //  When real video clipping/masking is wired this is where it'll live.)

  ctx.restore();
}

// Build a Path2D matching the union of all enabled masks on a clip.
// Used by drawVideoClip to actually clip the rendered video to the mask
// shape (or the inverse, for inverted masks).
function buildMaskPath(clip){
  const masks = (state.masks[clip.id] || []).filter(m => m.enabled);
  if(!masks.length) return null;
  const path = new Path2D();
  for(const m of masks){
    if(m.type === 'ellipse'){
      path.ellipse(m.x + m.w/2, m.y + m.h/2, m.w/2, m.h/2, 0, 0, Math.PI*2);
    } else {
      // rectangle / feathered / gradient / animated / inverted all use a rect base
      const r = m.cornerRadius || 0;
      if(path.roundRect) try{ path.roundRect(m.x, m.y, m.w, m.h, r); }catch{ path.rect(m.x, m.y, m.w, m.h); }
      else path.rect(m.x, m.y, m.w, m.h);
    }
  }
  return path;
}

function drawVideoClip(ctx, canvas, clip){
  const el = getMediaElForClip(clip);
  ctx.save();
  // Animated values via keyframes; falls back to the static prop if none
  let opacity = clipPropAt(clip, 'opacity', clip.opacity ?? 1);
  let posX    = clipPropAt(clip, 'posX',    clip.posX    ?? 0);
  let posY    = clipPropAt(clip, 'posY',    clip.posY    ?? 0);
  let scale   = clipPropAt(clip, 'scale',   clip.scale   ?? 1);
  const rot   = clipPropAt(clip, 'rotation',clip.rotation?? 0);

  // Entry transition: modulate the same values during the first N seconds
  const tx = transitionEntry(clip);
  let extraBlur = 0;
  if(tx){
    opacity *= tx.opacity;
    posX    += tx.dx;
    posY    += tx.dy;
    scale   *= tx.dscale;
    extraBlur = tx.blur;
  }
  ctx.globalAlpha = opacity;

  // Effect (CSS filter on context) + transition blur if any
  let filter = 'none';
  if(clip.effectId){
    const fx = (window.EFFECTS||[]).find(e=>e.id===clip.effectId);
    if(fx && fx.cssFilter) filter = fx.cssFilter(clip);
  }
  if(extraBlur){
    filter = (filter === 'none' ? '' : filter + ' ') + `blur(${extraBlur}px)`;
  }
  ctx.filter = filter;

  // Real mask compositing — clip the video to the union of mask shapes
  // (or the INVERSE if any mask is inverted). Mask coordinates are in
  // canvas-pixel space, so we apply the clip BEFORE the transform.
  const maskPath = buildMaskPath(clip);
  const hasInverted = maskPath && (state.masks[clip.id]||[]).some(m => m.enabled && m.inverted);
  if(maskPath){
    if(hasInverted){
      // even-odd fill rule: full-canvas rect XOR'd with the mask path
      // creates a hole the shape of the mask. Anything drawn after is
      // visible everywhere except inside the mask.
      const outer = new Path2D();
      outer.rect(0, 0, canvas.width, canvas.height);
      outer.addPath(maskPath);
      ctx.clip(outer, 'evenodd');
    } else {
      ctx.clip(maskPath);
    }
  }

  // Transform
  const cx = canvas.width/2 + posX;
  const cy = canvas.height/2 + posY;
  ctx.translate(cx, cy);
  ctx.rotate((rot*Math.PI)/180);
  ctx.scale(scale, scale);

  // Draw the video frame (or a placeholder if no source)
  if(el && el.readyState >= 2 && el.videoWidth>0){
    const vw = el.videoWidth, vh = el.videoHeight;
    const cAR = canvas.width/canvas.height, vAR = vw/vh;
    let dw, dh;
    if(vAR > cAR){ dw = canvas.width; dh = canvas.width / vAR; }
    else         { dh = canvas.height; dw = canvas.height * vAR; }
    try{ ctx.drawImage(el, -dw/2, -dh/2, dw, dh); }catch{}
  } else {
    // Placeholder: dark gradient with clip name
    const dw = canvas.width, dh = canvas.height;
    const g = ctx.createLinearGradient(-dw/2, -dh/2, dw/2, dh/2);
    g.addColorStop(0, '#1a1f2c'); g.addColorStop(1, '#0c0f17');
    ctx.fillStyle = g; ctx.fillRect(-dw/2, -dh/2, dw, dh);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '700 42px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(clip.name, 0, 0);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = '500 18px Inter, sans-serif';
    ctx.fillText('Demo placeholder · import a video to see it here', 0, 36);
  }

  ctx.filter = 'none';

  // LUT overlay (composite)
  if(clip.lutId){
    const lut = (window.LUTS||[]).find(l=>l.id===clip.lutId);
    if(lut && lut.id!=='none'){
      ctx.save();
      ctx.globalAlpha = clip.lutIntensity ?? lut.def;
      ctx.globalCompositeOperation = lut.blend || 'multiply';
      ctx.fillStyle = lut.color;
      ctx.fillRect(-canvas.width/2, -canvas.height/2, canvas.width, canvas.height);
      ctx.restore();
    }
  }

  ctx.restore();
}

// Draw a graphic call-out clip (Subscribe / Discord / IG handle / etc.) —
// rounded background + Lucide-style icon + text + soft shadow.
function drawGraphicClip(ctx, canvas, clip){
  ctx.save();
  let opacity = clipPropAt(clip, 'opacity', clip.opacity ?? 1);
  let posX    = clipPropAt(clip, 'posX',    clip.posX    ?? 0);
  let posY    = clipPropAt(clip, 'posY',    clip.posY    ?? 0);
  let scale   = clipPropAt(clip, 'scale',   clip.scale   ?? 1);
  const rot   = clipPropAt(clip, 'rotation',clip.rotation?? 0);

  const tx = transitionEntry(clip);
  let extraBlur = 0;
  if(tx){
    opacity *= tx.opacity;
    posX    += tx.dx;
    posY    += tx.dy;
    scale   *= tx.dscale;
    extraBlur = tx.blur;
  }
  ctx.globalAlpha = opacity;
  if(extraBlur) ctx.filter = `blur(${extraBlur}px)`;

  const cx = canvas.width/2  + posX;
  const cy = canvas.height - 200 + posY;
  ctx.translate(cx, cy);
  ctx.rotate((rot * Math.PI) / 180);
  ctx.scale(scale, scale);

  // Layout metrics
  const text = clip.text || clip.name || '';
  const family = clip.font || 'Fraunces';
  const weight = clip.fontWeight || 700;
  const fontSize = 56;
  ctx.font = `${weight} ${fontSize}px "${family}", serif`;
  ctx.textBaseline = 'middle';

  const textW = ctx.measureText(text).width;
  const iconSize = clip.graphicStyle === 'badge' ? 0 : 44;
  const padX = clip.graphicStyle === 'pill' ? 40 : clip.graphicStyle === 'badge' ? 28 : 36;
  const padY = clip.graphicStyle === 'pill' ? 22 : clip.graphicStyle === 'badge' ? 18 : 28;
  const gap = iconSize ? 18 : 0;
  const totalW = textW + iconSize + gap + padX * 2;
  const totalH = fontSize + padY * 2;
  const radius =
    clip.graphicStyle === 'pill' ? totalH/2 :
    clip.graphicStyle === 'badge' ? 6 : 18;

  // Drop shadow for depth
  ctx.save();
  ctx.shadowColor   = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur    = 32;
  ctx.shadowOffsetY = 12;

  // Background — supports linear-gradient strings, rgba, hex
  const bg = clip.graphicBg || '#0A0A0F';
  ctx.beginPath();
  if(ctx.roundRect) ctx.roundRect(-totalW/2, -totalH/2, totalW, totalH, radius);
  else ctx.rect(-totalW/2, -totalH/2, totalW, totalH);

  if(typeof bg === 'string' && bg.startsWith('linear-gradient')){
    // Parse "linear-gradient(135deg,#aaa,#bbb,…)" — best effort
    const stops = bg.match(/#[0-9a-f]{3,8}|rgba?\([^)]+\)/gi) || ['#000'];
    const angleMatch = bg.match(/(-?\d+)deg/);
    const rad = ((angleMatch ? parseFloat(angleMatch[1]) : 135) - 90) * Math.PI/180;
    const dx = Math.cos(rad), dy = Math.sin(rad);
    const g = ctx.createLinearGradient(
      -totalW/2*dx, -totalH/2*dy,
       totalW/2*dx,  totalH/2*dy);
    stops.forEach((s,i)=> g.addColorStop(i/(stops.length-1||1), s));
    ctx.fillStyle = g;
  } else {
    ctx.fillStyle = bg;
  }
  ctx.fill();
  ctx.restore();

  // Optional glassmorphic highlight stroke
  if(clip.graphicGlass){
    ctx.save();
    ctx.beginPath();
    if(ctx.roundRect) ctx.roundRect(-totalW/2, -totalH/2, totalW, totalH, radius);
    else ctx.rect(-totalW/2, -totalH/2, totalW, totalH);
    ctx.strokeStyle = 'rgba(255,255,255,0.20)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  // Icon (Path2D from data.js's GRAPHIC_ICONS)
  if(iconSize && clip.graphicIcon && window.GRAPHIC_ICONS){
    const def = window.GRAPHIC_ICONS[clip.graphicIcon];
    if(def && def.d){
      ctx.save();
      ctx.translate(-totalW/2 + padX, -iconSize/2);
      ctx.scale(iconSize/24, iconSize/24);
      ctx.strokeStyle = clip.graphicAccent || '#fff';
      ctx.fillStyle   = clip.graphicAccent || '#fff';
      ctx.lineWidth   = 2.2;
      ctx.lineCap     = 'round';
      ctx.lineJoin    = 'round';
      try{
        const p = new Path2D(def.d);
        if(def.kind === 'fill') ctx.fill(p);
        else                    ctx.stroke(p);
      }catch{/* unsupported path */}
      ctx.restore();
    }
  }

  // Text
  ctx.fillStyle = clip.color || '#fff';
  ctx.textAlign = 'left';
  ctx.fillText(text, -totalW/2 + padX + iconSize + gap, 0);

  ctx.restore();
}

function drawTextClip(ctx, canvas, clip){
  ctx.save();
  let opacity = clipPropAt(clip, 'opacity', clip.opacity ?? 1);
  let posX    = clipPropAt(clip, 'posX',    clip.posX    ?? 0);
  let posY    = clipPropAt(clip, 'posY',    clip.posY    ?? 0);
  let scale   = clipPropAt(clip, 'scale',   clip.scale   ?? 1);
  const rot   = clipPropAt(clip, 'rotation',clip.rotation?? 0);

  const tx = transitionEntry(clip);
  let extraBlur = 0;
  if(tx){
    opacity *= tx.opacity;
    posX    += tx.dx;
    posY    += tx.dy;
    scale   *= tx.dscale;
    extraBlur = tx.blur;
  }
  ctx.globalAlpha = opacity;
  if(extraBlur) ctx.filter = `blur(${extraBlur}px)`;

  const cx = canvas.width/2 + posX;
  const cy = canvas.height - 160 + posY;
  ctx.translate(cx, cy);
  ctx.rotate((rot*Math.PI)/180);
  ctx.scale(scale, scale);
  const family = clip.font || 'Inter';
  const weight = clip.fontWeight || 700;
  ctx.font = `${weight} 64px "${family}", Inter, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.65)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 4;
  ctx.fillStyle = clip.color || '#FFFFFF';
  ctx.fillText(clip.text || clip.name, 0, 0);
  ctx.restore();
}

// ---------- Transition entry-animation ----------
// When clip.transition is set we animate the clip's entry over the
// transition's duration (first N seconds of the clip). Returns a
// {opacity, dx, dy, dscale, blur, dipColor} object the drawXxx callers
// fold into their transform. `dipColor` is a non-null value when this
// transition should paint a full-frame flash over the canvas.
function transitionEntry(clip){
  if(!clip.transition) return null;
  const tr = (window.TRANSITIONS || []).find(t => t.id === clip.transition);
  if(!tr) return null;
  const tRel = clipTimeAtPlayhead(clip);
  const dur = tr.duration || 0.5;
  if(tRel >= dur) return null;
  const p = Math.max(0, Math.min(1, tRel / dur));     // 0 → 1
  const ease = 1 - (1-p)*(1-p);                       // easeOut
  const e = {opacity:1, dx:0, dy:0, dscale:1, blur:0, dipColor:null};
  switch(tr.id){
    case 'fade':      e.opacity = ease; break;
    case 'dipBlack':  e.opacity = ease; e.dipColor = `rgba(0,0,0,${1-ease})`; break;
    case 'dipWhite':  e.opacity = ease; e.dipColor = `rgba(255,255,255,${1-ease})`; break;
    case 'wipeL':     e.dx = -(1-ease) * 1200; break;
    case 'wipeR':     e.dx =  (1-ease) * 1200; break;
    case 'slideUp':   e.dy =  (1-ease) * 600;  break;
    case 'slideDown': e.dy = -(1-ease) * 600;  break;
    case 'zoomIn':    e.dscale = 0.2 + ease*0.8; e.opacity = ease; break;
    case 'zoomOut':   e.dscale = 1.6 - ease*0.6; e.opacity = ease; break;
    case 'whip':      e.dx = (1-ease) * 1600; e.blur = (1-ease) * 8; break;
  }
  return e;
}

// ---------- Smart guides (alignment helpers while dragging) ----------
// Snap an object's center (cx, cy) to canvas alignment lines:
//   horizontal: center / left third / right third / left edge / right edge
//   vertical:   center / upper third / lower third / top edge / bottom edge
// Plus the object's own edges to those same horizontal/vertical lines.
// Returns {snapX, snapY, lines:[{kind:'v'|'h', at:number}]}.
function computeSmartGuides(cx, cy, w, h, canvas){
  const SNAP = 10; // snap radius in canvas-space px
  const xs = [
    {at: canvas.width/2,   label:'center'},
    {at: canvas.width/3,   label:'third'},
    {at: canvas.width*2/3, label:'third'},
    {at: 0,                label:'edge'},
    {at: canvas.width,     label:'edge'}
  ];
  const ys = [
    {at: canvas.height/2,   label:'center'},
    {at: canvas.height/3,   label:'third'},
    {at: canvas.height*2/3, label:'third'},
    {at: 0,                 label:'edge'},
    {at: canvas.height,     label:'edge'}
  ];

  let snapX = null, snapY = null;
  const lines = [];

  // X: check the object center + its left + right edges against each target
  const xCandidates = [['c', cx], ['l', cx - w/2], ['r', cx + w/2]];
  for(const t of xs){
    for(const [tag, v] of xCandidates){
      if(Math.abs(v - t.at) < SNAP){
        snapX = cx + (t.at - v); // shift center so the matching point lands on the guide
        lines.push({kind:'v', at: t.at});
        break;
      }
    }
    if(snapX != null) break;
  }
  const yCandidates = [['c', cy], ['t', cy - h/2], ['b', cy + h/2]];
  for(const t of ys){
    for(const [tag, v] of yCandidates){
      if(Math.abs(v - t.at) < SNAP){
        snapY = cy + (t.at - v);
        lines.push({kind:'h', at: t.at});
        break;
      }
    }
    if(snapY != null) break;
  }
  return {snapX, snapY, lines};
}
function drawSmartGuides(guides, canvas, ox, oy, sx, sy){
  const layer = document.getElementById('smart-guides'); if(!layer) return;
  if(!guides || !guides.lines.length){ layer.innerHTML = ''; return; }
  layer.innerHTML = guides.lines.map(l=>{
    if(l.kind === 'v'){
      const x = ox + l.at*sx;
      return `<div class="sg-line sg-v" style="left:${x}px"></div>`;
    } else {
      const y = oy + l.at*sy;
      return `<div class="sg-line sg-h" style="top:${y}px"></div>`;
    }
  }).join('');
}
function clearSmartGuides(){
  const layer = document.getElementById('smart-guides'); if(layer) layer.innerHTML = '';
}

// Compute & apply position/size to an existing text-overlay box element.
// Pulled out so renderTextOverlays can either build new boxes OR re-position
// existing ones without rebuilding the DOM (anti-flicker during playback).
function _positionTextBox(el, clip, canvas, ox, oy, sx, sy){
  const family = clip.font || 'Fraunces';
  const weight = clip.fontWeight || 700;
  const baseSize = 64;
  const measureCtx = canvas.getContext('2d');
  measureCtx.font = `${weight} ${baseSize}px "${family}", serif`;
  const text = clip.text || clip.name || '';
  const metrics = measureCtx.measureText(text);
  const scale = clip.scale ?? 1;
  const w = Math.max(40, metrics.width * scale);
  const h = baseSize * 1.25 * scale;
  const cx = canvas.width/2 + (clip.posX||0);
  const cy = canvas.height - 160 + (clip.posY||0);
  el.style.left   = (ox + (cx - w/2)*sx) + 'px';
  el.style.top    = (oy + (cy - h/2)*sy) + 'px';
  el.style.width  = (w*sx) + 'px';
  el.style.height = (h*sy) + 'px';
  return {w, h};
}

// ---------- Text overlay (DOM, draggable text bounding box) ----------
// Don't rebuild the DOM every playback frame — that's the #1 source of
// flicker during playback. Only tear down + rebuild when the set of
// currently-active text clips changes; otherwise just patch element
// positions in place. This keeps drag interactions intact AND eliminates
// the 60fps DOM churn.
let _lastTextOverlayKey = '';
function _textOverlayKey(active){
  // Key changes when the set of active clip ids changes OR when the
  // selection changes (the selected box renders differently).
  return active.map(c=>c.id).sort().join(',') + '|' + (state.selectedClipId||'') + '|' + (state.activeTool||'');
}
function renderTextOverlays(){
  const overlay = document.getElementById('text-overlay'); if(!overlay) return;
  const canvas = document.getElementById('viewer-canvas');
  const cRect = canvas.getBoundingClientRect();
  const overlayRect = overlay.getBoundingClientRect();
  const ox = cRect.left - overlayRect.left, oy = cRect.top - overlayRect.top;
  const sx = cRect.width / canvas.width, sy = cRect.height / canvas.height;

  const tS = state.playhead/1000;
  const activeTexts = activeClipsAt(tS, 'text');
  const key = _textOverlayKey(activeTexts);

  if(activeTexts.length === 0){
    if(overlay.firstChild) overlay.innerHTML = '';
    _lastTextOverlayKey = '';
    return;
  }

  // If the active set + selection didn't change, just update positions
  // (no DOM teardown → no flicker).
  if(key === _lastTextOverlayKey && overlay.children.length === activeTexts.length){
    activeTexts.forEach(clip=>{
      const el = overlay.querySelector(`[data-clip-id="${clip.id}"]`);
      if(el) _positionTextBox(el, clip, canvas, ox, oy, sx, sy);
    });
    return;
  }
  _lastTextOverlayKey = key;
  overlay.innerHTML = '';

  activeTexts.forEach(clip=>{
    const el = document.createElement('div');
    el.className = 'text-shape-overlay' + (state.selectedClipId===clip.id?' selected':'');
    el.dataset.clipId = clip.id;
    const {w, h} = _positionTextBox(el, clip, canvas, ox, oy, sx, sy);

    // Click selects the text clip
    el.addEventListener('click', e=>{
      e.stopPropagation();
      state.selectedClipId = clip.id;
      state.selectedMaskId = null;
      render();
    });

    // Drag updates posX/posY with smart guides + snap to canvas alignment lines
    el.addEventListener('mousedown', e=>{
      if(e.button !== 0) return;
      e.preventDefault(); e.stopPropagation();
      const startX = e.clientX, startY = e.clientY;
      const origX  = clip.posX || 0, origY = clip.posY || 0;
      let moved = false;
      const onMove = ev=>{
        const dx = (ev.clientX - startX) / sx;
        const dy = (ev.clientY - startY) / sy;
        if(Math.abs(dx)>1 || Math.abs(dy)>1) moved = true;
        // Proposed new center position in canvas coordinates
        const baseCx = canvas.width/2 + (origX + dx);
        const baseCy = (canvas.height - 160) + (origY + dy);
        // Snap to nearest guide
        const guides = computeSmartGuides(baseCx, baseCy, w, h, canvas);
        const newCx = guides.snapX != null ? guides.snapX : baseCx;
        const newCy = guides.snapY != null ? guides.snapY : baseCy;
        clip.posX = Math.round(newCx - canvas.width/2);
        clip.posY = Math.round(newCy - (canvas.height - 160));
        renderTextOverlays();
        drawSmartGuides(guides, canvas, ox, oy, sx, sy);
        renderViewer();
      };
      const onUp = ()=>{
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        clearSmartGuides();
        if(moved){ pushHistory(); renderInspector(); }
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    overlay.appendChild(el);
  });
}

// ---------- Selection brackets (FCPX-style corner markers around the selected video clip) ----------
// Reuse a single DOM container; just update position each tick. Builds the
// child <span> brackets once. Eliminates per-frame DOM churn during playback.
function renderSelectionBrackets(){
  const overlay = document.getElementById('selection-brackets'); if(!overlay) return;
  const sel = getSelectedClip();
  const tS = state.playhead/1000;
  const visible = sel && sel.type === 'video' && tS >= clipStartS(sel) && tS <= clipEndS(sel);
  if(!visible){
    if(overlay.firstChild) overlay.innerHTML = '';
    return;
  }
  let cont = overlay.querySelector('.sel-brackets');
  if(!cont){
    overlay.innerHTML = '';
    cont = document.createElement('div');
    cont.className = 'sel-brackets';
    cont.innerHTML = '<span class="sb tl"></span><span class="sb tr"></span><span class="sb bl"></span><span class="sb br"></span>';
    overlay.appendChild(cont);
  }
  const canvas = document.getElementById('viewer-canvas');
  const cRect = canvas.getBoundingClientRect();
  const overlayRect = overlay.getBoundingClientRect();
  const ox = cRect.left - overlayRect.left, oy = cRect.top - overlayRect.top;
  const sx = cRect.width / canvas.width, sy = cRect.height / canvas.height;
  const scale = sel.scale ?? 1;
  const cx = canvas.width/2  + (sel.posX||0);
  const cy = canvas.height/2 + (sel.posY||0);
  const dw = canvas.width  * scale * 0.9;
  const dh = canvas.height * scale * 0.9;
  cont.style.left   = (ox + (cx - dw/2)*sx) + 'px';
  cont.style.top    = (oy + (cy - dh/2)*sy) + 'px';
  cont.style.width  = (dw*sx) + 'px';
  cont.style.height = (dh*sy) + 'px';
}

// ---------- Mask overlay (DOM, draggable handles) ----------
function renderMaskOverlays(){
  const overlay = document.getElementById('mask-overlay'); if(!overlay) return;
  overlay.innerHTML = '';
  if(!state.selectedClipId) return;
  const masks = state.masks[state.selectedClipId] || [];
  const canvas = document.getElementById('viewer-canvas');
  const cRect = canvas.getBoundingClientRect();
  // Position relative to the overlay's own box (which is inside #viewer-frame).
  // Was previously using viewer-wrapper which has 22px padding — caused drift.
  const overlayRect = overlay.getBoundingClientRect();
  const ox = cRect.left - overlayRect.left, oy = cRect.top - overlayRect.top;
  const sx = cRect.width / canvas.width, sy = cRect.height / canvas.height;
  masks.filter(m=>m.enabled).forEach(m=>{
    const mt = MASK_TYPES.find(t=>t.id===m.type);
    const el = document.createElement('div');
    el.className = 'mask-shape-overlay' + (m.type==='ellipse'?' ellipse':'') + (state.selectedMaskId===m.id?' selected':'');
    el.style.left = (ox + m.x*sx)+'px';
    el.style.top  = (oy + m.y*sy)+'px';
    el.style.width = (m.w*sx)+'px';
    el.style.height = (m.h*sy)+'px';
    el.style.borderColor = mt ? mt.color : '#af52de';
    el.style.background  = (mt?mt.color:'#af52de') + (state.selectedMaskId===m.id?'1f':'0d');
    if(state.selectedMaskId===m.id){
      ['tl','tr','bl','br'].forEach(pos=>{
        const h = document.createElement('div'); h.className = 'mask-handle '+pos; el.appendChild(h);
        if(window.attachMaskHandleResize) window.attachMaskHandleResize(h, m, pos, sx, sy);
      });
      const badge = document.createElement('div'); badge.className = 'mask-badge';
      badge.textContent = Math.round(m.opacity*100)+'%';
      el.appendChild(badge);
    }
    el.addEventListener('click', e=>{ e.stopPropagation(); state.selectedMaskId = m.id; render(); });
    // Drag body to move
    let startX, startY, origX, origY;
    el.addEventListener('mousedown', e=>{
      if(e.target.classList.contains('mask-handle')) return;
      e.preventDefault();
      startX = e.clientX; startY = e.clientY; origX = m.x; origY = m.y;
      const onMove = ev=>{ m.x = origX + (ev.clientX-startX)/sx; m.y = origY + (ev.clientY-startY)/sy; renderMaskOverlays(); renderViewer(); };
      const onUp = ()=>{ document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',onUp); pushHistory(); };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    overlay.appendChild(el);
  });
}

// ---------- Ruler / playhead / timecode ----------
function renderTimecodeRuler(){
  const c = document.getElementById('ruler-canvas'); if(!c) return;
  const ctx = c.getContext('2d');
  c.width = c.parentElement.clientWidth; c.height = 28;
  ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0,0,c.width,c.height);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.font = '9px JetBrains Mono, monospace';
  const maxSec = Math.ceil((c.width-TIMELINE_OFFSET_X)/TIMELINE_PX_PER_S)+1;
  for(let i=0;i<maxSec;i++){
    const x = TIMELINE_OFFSET_X + i*TIMELINE_PX_PER_S; if(x>c.width) break;
    ctx.fillRect(x, 18, 1, 8);
    if(i%5===0){ ctx.fillRect(x, 14, 1, 12); ctx.fillText(i+'s', x+4, 12); }
  }

  // BEAT MARKERS — vertical accent ticks for every detected beat across all
  // audio clips. Drawn after the seconds grid so they sit on top.
  // The ruler's canvas is positioned with padding-left:80px inside its
  // container (see #timeline-ruler CSS). Internally we draw 0..c.width
  // where x=0 == the "0s" mark visually (= TIMELINE_OFFSET_X in clip-coord
  // space). Convert: rulerX = clipX - TIMELINE_OFFSET_X.
  ctx.fillStyle = 'rgba(10,132,255,0.65)';
  for(const ac of state.clips){
    if(ac.type !== 'audio' || !ac.beats || !ac.beats.length) continue;
    for(const t of ac.beats){
      const clipAbsX = ac.x + t * TIMELINE_PX_PER_S;
      const rulerX = clipAbsX - TIMELINE_OFFSET_X;
      if(rulerX < 0 || rulerX > c.width) continue;
      ctx.fillRect(rulerX, 0, 1, 6);
    }
  }
}
function renderPlayhead(){
  const ph = document.getElementById('playhead'); if(!ph) return;
  // translate3d → compositor-only, no layout, smooth at 60fps
  const x = TIMELINE_OFFSET_X + state.playhead/PLAYHEAD_MS_PER_PX;
  ph.style.transform = 'translate3d(' + x + 'px,0,0)';
}
function renderTimecode(){
  const tc = document.getElementById('timecode'); if(!tc) return;
  const totalMs = Math.max(0, state.playhead);
  const totalS  = Math.floor(totalMs/1000);
  const h = Math.floor(totalS/3600);
  const m = Math.floor((totalS%3600)/60);
  const s = totalS%60;
  const f = Math.floor((totalMs%1000)/1000 * VIEWER_FPS);
  const pad = (n,w=2)=>String(n).padStart(w,'0');
  tc.textContent = `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
}

// ---------- Track header state visualization ----------
function renderTrackHeaders(){
  ['v1','a1','t1'].forEach(tid=>{
    const tr = state.tracks[tid]; if(!tr) return;
    const trackEl = document.querySelector(`.track[data-track="${tid}"]`);
    if(!trackEl) return;
    trackEl.classList.toggle('muted', !!tr.muted);
    trackEl.classList.toggle('locked', !!tr.locked);
    trackEl.classList.toggle('hidden-track', tr.visible===false);
  });
}

// ---------- Status bar (bottom of editor) ----------
function renderStatusBar(){
  const proj = document.getElementById('sb-project');
  const meta = document.getElementById('sb-meta');
  const user = document.getElementById('sb-user');
  if(!proj || !meta || !user) return;
  proj.textContent = state.projectName || 'Untitled';
  const dur = timelineDurationS();
  const m = Math.floor(dur/60), s = Math.floor(dur%60);
  meta.textContent = state.clips.length + ' clip' + (state.clips.length===1?'':'s') + ' · ' + m + ':' + String(s).padStart(2,'0');
  // Pull user from local session — show name + tiny "cloud" badge if signed in
  try{
    const ss = JSON.parse(localStorage.getItem('editorx.session.v1') || 'null');
    if(ss && !ss.guest){
      user.textContent = ss.name || ss.login || 'Guest';
      user.title = (ss.email || ss.login || '') + ' · signed in';
      user.classList.add('signed-in');
    } else {
      user.textContent = 'Guest · Local-only';
      user.title = 'Sign in with GitHub to sync projects across devices';
      user.classList.remove('signed-in');
    }
  }catch{ user.textContent = 'Guest'; }
}
window.statusbarSaving = function(){
  const dot = document.getElementById('sb-status-dot');
  const txt = document.getElementById('sb-status');
  if(dot) dot.classList.add('saving');
  if(txt) txt.textContent = 'Saving…';
};
window.statusbarSaved = function(){
  const dot = document.getElementById('sb-status-dot');
  const txt = document.getElementById('sb-status');
  if(dot) dot.classList.remove('saving');
  if(txt) txt.textContent = 'All changes saved';
};

// ---------- Master render ----------
function render(){
  renderClips();
  renderMediaList();
  renderMaskTypes(); renderAppliedMasks();
  renderTransitionsList(); renderLUTs(); renderEffects(); renderTitles(); renderGraphics();
  renderInspector();
  renderViewer();
  renderMaskOverlays(); renderTextOverlays(); renderSelectionBrackets();
  renderTimecodeRuler(); renderPlayhead(); renderTimecode();
  renderTrackHeaders();
  renderStatusBar();
  // Lucide replaces <i data-lucide=...> with inline SVG. Only sweep when
  // unrendered placeholders exist — skipping it on every render eliminates
  // a major source of icon flicker during inspector/timeline updates.
  if(window.lucide && document.querySelector('i[data-lucide]')) lucide.createIcons();
}

// During playback only update the cheap things (not the whole UI tree)
window.onPlaybackTick = function(){
  renderViewer();
  renderPlayhead();
  renderTimecode();
  renderTextOverlays();
  renderSelectionBrackets();
};

window.render               = render;
window.renderViewer         = renderViewer;
window.renderPlayhead       = renderPlayhead;
window.renderTimecode       = renderTimecode;
window.renderTimecodeRuler  = renderTimecodeRuler;
window.renderClips          = renderClips;
window.renderMaskOverlays   = renderMaskOverlays;
window.renderTextOverlays   = renderTextOverlays;
window.renderSelectionBrackets = renderSelectionBrackets;
window.renderTrackHeaders   = renderTrackHeaders;
window.renderInspector      = renderInspector;
window._invalidateWaveform  = _invalidateWaveform;
window.flash                = flash;
