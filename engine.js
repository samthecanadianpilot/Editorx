// EditorX — State & Engine

let _uid = 0;
const genId = () => 'id_' + (++_uid);

// Timeline coordinate system: ruler, clips, playhead all share these constants.
const TIMELINE_OFFSET_X  = 80;       // px gutter before first clip (track header width)
const TIMELINE_PX_PER_S  = 40;       // 1 second == 40 px on the ruler
const PLAYHEAD_MS_PER_PX = 1000 / TIMELINE_PX_PER_S; // 25ms / px

const VIEWER_W = 1920;
const VIEWER_H = 1080;
const VIEWER_FPS = 30;

// ---------- State ----------
const state = {
  projectName: 'Untitled',
  clips: demoClips(),     // pre-seeded for visual continuity until user imports media
  selectedClipId: null,
  media: [],              // {id,name,url,type,duration}
  masks: {},              // clipId -> [{...}]
  selectedMaskId: null,
  tracks: {
    v1: {muted:false, locked:false, visible:true},
    a1: {muted:false, locked:false, visible:true},
    t1: {muted:false, locked:false, visible:true}
  },
  playhead: 0,            // ms
  isPlaying: false,
  snap: true,
  activeTool: 'select',   // select | blade | text | hand
  workspace: 'edit',      // edit | color | effects | export
  history: [],
  historyIndex: -1
};

function demoClips(){
  // A small visual demo so the timeline isn't empty before the user imports media.
  return [
    {id:genId(),type:'video',name:'Welcome.mp4',  track:'v1',x:80, w:240,color:'#1a3a5c',sourceUrl:null,
      transition:null,lutId:null,lutIntensity:1,effectId:null,fxAmount:null,
      opacity:1,scale:1,posX:0,posY:0,rotation:0,
      volume:1,muted:false,speed:1,inS:0},
    {id:genId(),type:'video',name:'B-Roll.mp4',   track:'v1',x:330,w:200,color:'#2a1a0a',sourceUrl:null,
      transition:'fade',lutId:'cineWarm',lutIntensity:0.4,effectId:null,fxAmount:null,
      opacity:1,scale:1,posX:0,posY:0,rotation:0,
      volume:1,muted:false,speed:1,inS:0},
    {id:genId(),type:'audio',name:'Score.wav',    track:'a1',x:80, w:440,color:'#2d1a3e',sourceUrl:null,
      volume:0.7,muted:false,speed:1,inS:0},
    {id:genId(),type:'text', name:'Intro Title', track:'t1',x:80, w:160,color:'#FFFFFF',
      text:'EditorX', font:'Inter', fontWeight:800, opacity:1,scale:1.6,posX:0,posY:0,rotation:0}
  ];
}

// ---------- Mask mutations ----------
function addMask(clipId, typeId){
  const mt = MASK_TYPES.find(m=>m.id===typeId); if(!mt) return null;
  if(!state.masks[clipId]) state.masks[clipId] = [];
  const mask = {
    id: genId(), type: typeId, name: mt.name + ' Mask',
    enabled: true, inverted: typeId==='inverted',
    x: 480, y: 270, w: 600, h: 360,
    rotation: 0, opacity: 1,
    feather: typeId==='feathered' ? 24 : 0,
    blur: 0, cornerRadius: 0,
    gradAngle: 0, gradSpread: 0.5,
    keyframes: []
  };
  state.masks[clipId].push(mask);
  state.selectedMaskId = mask.id;
  return mask;
}
function removeMask(clipId, maskId){
  if(!state.masks[clipId]) return;
  state.masks[clipId] = state.masks[clipId].filter(m=>m.id!==maskId);
  if(state.selectedMaskId===maskId) state.selectedMaskId=null;
}
function duplicateMask(clipId, maskId){
  const arr = state.masks[clipId]; if(!arr) return;
  const orig = arr.find(m=>m.id===maskId); if(!orig) return;
  const copy = {...orig, id: genId(), name: orig.name + ' Copy',
    x: orig.x+24, y: orig.y+24,
    keyframes: orig.keyframes.map(k=>({...k}))};
  arr.push(copy);
  state.selectedMaskId = copy.id;
}
function addKeyframe(mask){
  mask.keyframes.push({time: state.playhead/1000, x:mask.x, y:mask.y, w:mask.w, h:mask.h,
    rot:mask.rotation, op:mask.opacity, feather:mask.feather});
  mask.keyframes.sort((a,b)=>a.time-b.time);
}

// ---------- Clip mutations ----------
function getSelectedClip(){ return state.clips.find(c=>c.id===state.selectedClipId) || null; }
function getClip(id){ return state.clips.find(c=>c.id===id) || null; }

function updateClip(clipId, patch){
  const c = state.clips.find(cl=>cl.id===clipId); if(!c) return;
  Object.assign(c, patch);
}
function deleteClip(clipId){
  state.clips = state.clips.filter(c=>c.id!==clipId);
  delete state.masks[clipId];
  if(state.selectedClipId===clipId) state.selectedClipId=null;
  releaseMediaFor(clipId);
}
function duplicateClip(clipId){
  const c = state.clips.find(cl=>cl.id===clipId); if(!c) return null;
  const copy = {...c, id: genId(), x: c.x + c.w + 4, name: c.name + ' Copy'};
  state.clips.push(copy);
  return copy;
}
function splitClipAtX(clipId, splitX){
  const c = state.clips.find(cl=>cl.id===clipId); if(!c) return null;
  if(splitX<=c.x+4 || splitX>=c.x+c.w-4) return null;
  const leftW = Math.round(splitX - c.x);
  const splitS = leftW / TIMELINE_PX_PER_S;
  const right = {...c, id: genId(), x: Math.round(splitX), w: c.w - leftW,
    inS: (c.inS||0) + splitS};
  c.w = leftW;
  state.clips.push(right);
  return right;
}
function clearTransition(clipId){ const c=getClip(clipId); if(c) c.transition=null; }
function setTransition(clipId, id){ const c=getClip(clipId); if(c) c.transition=id; }
function setLut(clipId, id, intensity){
  const c = getClip(clipId); if(!c) return;
  c.lutId = id; if(intensity!=null) c.lutIntensity = intensity;
}
function clearLut(clipId){ const c=getClip(clipId); if(c){c.lutId=null;c.lutIntensity=1} }
function setEffect(clipId, id, amount){
  const c = getClip(clipId); if(!c) return;
  c.effectId = id;
  const def = (window.EFFECTS||[]).find(e=>e.id===id);
  if(def && def.params && def.params.amount){
    c.fxAmount = (amount!=null) ? amount : def.params.amount.def;
  } else {
    c.fxAmount = null;
  }
}
function clearEffect(clipId){ const c=getClip(clipId); if(c){c.effectId=null;c.fxAmount=null} }

function addTextClipAt(playheadMs, preset){
  const x = Math.round(TIMELINE_OFFSET_X + playheadMs/PLAYHEAD_MS_PER_PX);
  const clip = {
    id: genId(), type:'text', name: preset.name, track:'t1',
    x, w: Math.max(80, Math.round((preset.duration||3)*TIMELINE_PX_PER_S)),
    color: preset.color || '#FFFFFF',
    text: preset.defaultText || preset.name,
    font: preset.font || 'Inter',
    fontWeight: preset.weight || 700,
    opacity: 1, scale: preset.scale||1, posX:0, posY:0, rotation:0
  };
  state.clips.push(clip);
  state.selectedClipId = clip.id;
  return clip;
}
// Append-on-click — places after the rightmost edge of the appropriate track.
function addClipFromMedia(media){
  const trackId = media.type==='audio' ? 'a1' : 'v1';
  const onTrack = state.clips.filter(c=>c.track===trackId);
  const rightEdge = onTrack.reduce((m,c)=>Math.max(m, c.x+c.w), TIMELINE_OFFSET_X);
  return addClipFromMediaAt(media, trackId, Math.round(rightEdge+4));
}

// Drop-target version: place at an explicit timeline x on a chosen track.
// Caller is responsible for snap + collision-clamp before passing x.
function addClipFromMediaAt(media, trackId, x){
  const widthPx = Math.max(60, Math.round((media.duration||4)*TIMELINE_PX_PER_S));
  const clip = {
    id: genId(), type: media.type, name: media.name, track: trackId,
    x: Math.max(TIMELINE_OFFSET_X, Math.round(x)), w: widthPx,
    color: media.type==='audio' ? '#2d1a3e' : '#1a3a5c',
    sourceUrl: media.url, mediaId: media.id,
    transition: null, lutId: null, lutIntensity: 1, effectId: null, fxAmount: null,
    opacity:1, scale:1, posX:0, posY:0, rotation:0,
    volume:1, muted:false, speed:1, inS:0
  };
  state.clips.push(clip);
  state.selectedClipId = clip.id;
  return clip;
}
function clipUnderTimelineX(trackId, x){
  return state.clips.find(c=>c.track===trackId && x>=c.x && x<=c.x+c.w) || null;
}

// Split the audio out of a video clip onto A1, keeping the same timing /
// in-point / source URL. The video clip is muted (audio is now its own clip,
// so playing both at the same volume would double the signal).
function detachAudio(clipId){
  const c = getClip(clipId); if(!c) return null;
  if(c.type !== 'video') return null;
  if(c.audioDetached) return null;
  const audio = {
    id: genId(), type: 'audio', name: c.name + ' (audio)',
    track: 'a1',
    x: c.x, w: c.w,
    color: '#2d1a3e',
    sourceUrl: c.sourceUrl, mediaId: c.mediaId,
    volume: c.volume ?? 1, muted: false, speed: c.speed || 1,
    inS: c.inS || 0,
    detachedFrom: c.id
  };
  // Push it through collision-clamp so it doesn't overlap existing A1 clips.
  // If colliding, place it after the rightmost A1 edge.
  const onA1 = state.clips.filter(cl=>cl.track==='a1');
  const overlap = onA1.some(o => audio.x < o.x + o.w && audio.x + audio.w > o.x);
  if(overlap){
    const rightEdge = onA1.reduce((m,cl)=>Math.max(m, cl.x+cl.w), TIMELINE_OFFSET_X);
    audio.x = Math.round(rightEdge + 4);
  }
  state.clips.push(audio);
  c.muted = true;
  c.audioDetached = true;
  return audio;
}

// ---------- Active-clip lookup (for playback / viewer) ----------
function clipStartS(c){ return (c.x - TIMELINE_OFFSET_X) / TIMELINE_PX_PER_S; }
function clipEndS(c){ return clipStartS(c) + c.w / TIMELINE_PX_PER_S; }
function activeClipsAt(timeS, type){
  return state.clips.filter(c => (!type || c.type===type) && timeS >= clipStartS(c) && timeS <= clipEndS(c));
}
function timelineDurationS(){
  return state.clips.reduce((m,c)=>Math.max(m, clipEndS(c)), 0);
}

// ---------- Media playback (video/audio element pool) ----------
const _mediaPool = {}; // clipId -> HTMLMediaElement
function getMediaElForClip(clip){
  if(!clip.sourceUrl) return null;
  if(_mediaPool[clip.id]) return _mediaPool[clip.id];
  const el = document.createElement(clip.type==='audio' ? 'audio' : 'video');
  el.src = clip.sourceUrl;
  el.preload = 'auto';
  el.crossOrigin = 'anonymous';
  el.playsInline = true;
  el.muted = true; // we manage mixing via .volume so autoplay works
  el.style.cssText = 'position:absolute;left:-99999px;top:-99999px;width:1px;height:1px;visibility:hidden;pointer-events:none';
  document.body.appendChild(el);
  _mediaPool[clip.id] = el;
  return el;
}
function releaseMediaFor(clipId){
  const el = _mediaPool[clipId];
  if(el){ try{ el.pause(); el.src=''; el.remove(); }catch{} delete _mediaPool[clipId]; }
}

// Sync all media elements to the current playhead.
// Tolerance is intentionally loose during playback — re-seeking every RAF
// caused visible stutter as the browser cancelled/re-buffered each request.
// We only force a seek if the drift is large enough to be a real desync.
const SEEK_TOL_PAUSED  = 0.05;  // 50ms — tight while scrubbing
const SEEK_TOL_PLAYING = 0.50;  // 500ms — only catch real desync during playback
function syncMediaToPlayhead(){
  const tS = state.playhead / 1000;
  const tol = state.isPlaying ? SEEK_TOL_PLAYING : SEEK_TOL_PAUSED;
  for(const c of state.clips){
    if(!c.sourceUrl) continue;
    const startS = clipStartS(c), endS = clipEndS(c);
    const el = getMediaElForClip(c);
    if(!el) continue;
    const trackMuted   = state.tracks[c.track] && state.tracks[c.track].muted;
    const trackVisible = state.tracks[c.track] && state.tracks[c.track].visible;
    const inRange = tS >= startS && tS <= endS && trackVisible !== false;
    if(inRange){
      const srcT = (c.inS||0) + (tS - startS) * (c.speed || 1);
      el.muted = !!(c.muted || trackMuted);
      el.volume = Math.min(1, Math.max(0, c.volume ?? 1));
      el.playbackRate = c.speed || 1;
      if(Math.abs(el.currentTime - srcT) > tol){
        try{ el.currentTime = srcT; }catch{}
      }
      if(state.isPlaying){
        if(el.paused){ el.play().catch(()=>{}); }
      } else {
        if(!el.paused) el.pause();
      }
    } else {
      if(!el.paused) el.pause();
    }
  }
}

// ---------- Playback controller ----------
let _rafId = null, _lastT = 0;
function startPlayback(){
  if(state.isPlaying) return;
  state.isPlaying = true;
  _lastT = performance.now();
  // Make sure videos are seeked + playing before we begin driving the playhead
  syncMediaToPlayhead();
  const tick = (now) => {
    if(!state.isPlaying){ _rafId=null; return; }
    const dt = now - _lastT; _lastT = now;

    // SOURCE OF TRUTH during playback: if a video clip is active at the
    // playhead AND the <video> is actually playing, derive the playhead from
    // its currentTime. This eliminates the dt/video drift loop that caused
    // the old re-seeking stutter — the playhead now follows the actual
    // displayed frame instead of fighting it.
    const leader = pickLeaderVideo();
    if(leader){
      const startS = clipStartS(leader.clip);
      const srcT   = leader.el.currentTime;
      const newPh  = (startS + (srcT - (leader.clip.inS||0)) / (leader.clip.speed||1)) * 1000;
      // Only advance forward — don't let small jitter pull playhead backwards
      if(newPh > state.playhead - 50) state.playhead = newPh;
      else                            state.playhead += dt;
    } else {
      state.playhead += dt;
    }

    // Loop / cap at timeline end
    const durMs = timelineDurationS()*1000;
    if(durMs>0 && state.playhead > durMs){ state.playhead = 0; }

    syncMediaToPlayhead();
    if(window.onPlaybackTick) window.onPlaybackTick();
    _rafId = requestAnimationFrame(tick);
  };
  _rafId = requestAnimationFrame(tick);
}

// Pick the active "leader" video clip — the one whose currentTime should
// drive the master playhead during playback. Returns {clip, el} or null.
function pickLeaderVideo(){
  const tS = state.playhead/1000;
  for(const c of state.clips){
    if(c.type !== 'video' || !c.sourceUrl) continue;
    if(tS < clipStartS(c) || tS > clipEndS(c)) continue;
    const el = _mediaPool[c.id];
    if(el && !el.paused && el.readyState >= 2) return {clip:c, el};
  }
  return null;
}
function stopPlayback(){
  state.isPlaying = false;
  if(_rafId){ cancelAnimationFrame(_rafId); _rafId=null; }
  syncMediaToPlayhead();
}
function togglePlayback(){ state.isPlaying ? stopPlayback() : startPlayback(); }
function seekPlayhead(ms){ state.playhead = Math.max(0, ms); syncMediaToPlayhead(); }
function nudgePlayhead(deltaMs){ state.playhead = Math.max(0, state.playhead + deltaMs); syncMediaToPlayhead(); }

// ---------- Font lazy-loader (Google Fonts) ----------
const _loadedFonts = new Set();
function loadFont(family, weights){
  if(!family) return Promise.resolve();
  const key = family + ':' + (weights || 'default');
  if(_loadedFonts.has(key)) return Promise.resolve();
  _loadedFonts.add(key);
  // Build a CSS2 url. Default weight set covers most use cases.
  const fam = family.replace(/ /g,'+');
  const wlist = weights || '400;500;600;700;800;900';
  const href = `https://fonts.googleapis.com/css2?family=${fam}:wght@${wlist}&display=swap`;
  return new Promise(resolve => {
    const link = document.createElement('link');
    link.rel = 'stylesheet'; link.href = href;
    link.onload = () => {
      // Best-effort: trigger document.fonts to load before we draw to canvas
      if(document.fonts && document.fonts.load){
        document.fonts.load(`700 24px "${family}"`).then(()=>resolve()).catch(()=>resolve());
      } else { resolve(); }
    };
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}

// ---------- Undo / Redo + autosave ----------
function snapshotState(){
  return JSON.stringify({
    projectName: state.projectName,
    clips: state.clips,
    masks: state.masks,
    tracks: state.tracks,
    selectedClipId: state.selectedClipId
  });
}
function pushHistory(){
  state.history = state.history.slice(0, state.historyIndex+1);
  state.history.push(snapshotState());
  if(state.history.length > 50) state.history.shift();
  state.historyIndex = state.history.length - 1;
  scheduleAutosave();
}
function applySnapshot(snap){
  const o = JSON.parse(snap);
  state.projectName    = o.projectName;
  state.clips          = o.clips;
  state.masks          = o.masks;
  state.tracks         = o.tracks;
  state.selectedClipId = o.selectedClipId;
}
function undo(){ if(state.historyIndex<=0) return false; state.historyIndex--; applySnapshot(state.history[state.historyIndex]); scheduleAutosave(); return true; }
function redo(){ if(state.historyIndex>=state.history.length-1) return false; state.historyIndex++; applySnapshot(state.history[state.historyIndex]); scheduleAutosave(); return true; }

// ---------- Project persistence (localStorage + .editorx.json) ----------
const SAVE_KEY = 'editorx.project.v1';

function projectDoc(){
  return {
    meta: {app:'EditorX', version:1, savedAt: new Date().toISOString()},
    projectName: state.projectName,
    clips: state.clips, masks: state.masks, tracks: state.tracks,
    selectedClipId: state.selectedClipId,
    playhead: state.playhead
  };
}
function applyProjectDoc(o){
  if(!o) return false;
  state.projectName    = o.projectName || 'Untitled';
  state.clips          = Array.isArray(o.clips)  ? o.clips  : [];
  state.masks          = (o.masks && typeof o.masks==='object') ? o.masks : {};
  state.tracks         = (o.tracks && typeof o.tracks==='object') ? o.tracks : state.tracks;
  state.selectedClipId = o.selectedClipId || null;
  state.playhead       = o.playhead || 0;
  // Imported media (blob: URLs) won't survive a reload — null those out
  state.clips.forEach(c => { if(c.sourceUrl && c.sourceUrl.startsWith && c.sourceUrl.startsWith('blob:')) c.sourceUrl = null; });
  state.history = []; state.historyIndex = -1;
  pushHistoryNoSave(); // seed history once without re-triggering autosave
  return true;
}
function pushHistoryNoSave(){
  state.history = state.history.slice(0, state.historyIndex+1);
  state.history.push(snapshotState());
  if(state.history.length > 50) state.history.shift();
  state.historyIndex = state.history.length - 1;
}

let _autosaveT = null;
function scheduleAutosave(){
  if(_autosaveT) clearTimeout(_autosaveT);
  _autosaveT = setTimeout(()=>{ try{ saveToLocalStorage(); }catch{} }, 600);
}
function saveToLocalStorage(){
  try{
    localStorage.setItem(SAVE_KEY, JSON.stringify(projectDoc()));
    return true;
  }catch(err){
    console.warn('EditorX autosave failed:', err);
    return false;
  }
}
function loadFromLocalStorage(){
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(!raw) return false;
    return applyProjectDoc(JSON.parse(raw));
  }catch{return false;}
}
function clearSavedProject(){ try{ localStorage.removeItem(SAVE_KEY); }catch{} }
function newProject(){
  state.projectName = 'Untitled';
  state.clips = demoClips();
  state.masks = {}; state.selectedClipId = null; state.selectedMaskId = null;
  state.playhead = 0;
  state.tracks = {v1:{muted:false,locked:false,visible:true}, a1:{muted:false,locked:false,visible:true}, t1:{muted:false,locked:false,visible:true}};
  state.history = []; state.historyIndex = -1;
  pushHistoryNoSave();
  scheduleAutosave();
}

pushHistoryNoSave();

// ---------- Globals ----------
window.state = state;
window.TIMELINE_OFFSET_X  = TIMELINE_OFFSET_X;
window.TIMELINE_PX_PER_S  = TIMELINE_PX_PER_S;
window.PLAYHEAD_MS_PER_PX = PLAYHEAD_MS_PER_PX;
window.VIEWER_W = VIEWER_W; window.VIEWER_H = VIEWER_H; window.VIEWER_FPS = VIEWER_FPS;
window.addMask=addMask; window.removeMask=removeMask; window.duplicateMask=duplicateMask; window.addKeyframe=addKeyframe;
window.getSelectedClip=getSelectedClip; window.getClip=getClip;
window.updateClip=updateClip; window.deleteClip=deleteClip; window.duplicateClip=duplicateClip; window.splitClipAtX=splitClipAtX;
window.clearTransition=clearTransition; window.setTransition=setTransition;
window.setLut=setLut; window.clearLut=clearLut;
window.setEffect=setEffect; window.clearEffect=clearEffect;
window.addTextClipAt=addTextClipAt; window.addClipFromMedia=addClipFromMedia; window.addClipFromMediaAt=addClipFromMediaAt;
window.clipUnderTimelineX=clipUnderTimelineX;
window.detachAudio=detachAudio;
window.activeClipsAt=activeClipsAt; window.clipStartS=clipStartS; window.clipEndS=clipEndS; window.timelineDurationS=timelineDurationS;
window.getMediaElForClip=getMediaElForClip; window.releaseMediaFor=releaseMediaFor; window.syncMediaToPlayhead=syncMediaToPlayhead;
window.startPlayback=startPlayback; window.stopPlayback=stopPlayback; window.togglePlayback=togglePlayback;
window.seekPlayhead=seekPlayhead; window.nudgePlayhead=nudgePlayhead;
window.loadFont=loadFont;
window.pushHistory=pushHistory; window.undo=undo; window.redo=redo;
window.saveToLocalStorage=saveToLocalStorage;
window.loadFromLocalStorage=loadFromLocalStorage;
window.clearSavedProject=clearSavedProject;
window.newProject=newProject;
window.applyProjectDoc=applyProjectDoc;
window.projectDoc=projectDoc;
