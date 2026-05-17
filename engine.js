// EditorX — State & Engine

let _uid = 0;
const genId = () => 'id_' + (++_uid);

// Timeline coordinate system: ruler, clips, playhead all share these constants.
const TIMELINE_OFFSET_X  = 80;       // px gutter before first clip (track header width)
const TIMELINE_PX_PER_S  = 40;       // 1 second == 40 px on the ruler
const PLAYHEAD_MS_PER_PX = 1000 / TIMELINE_PX_PER_S; // 25ms / px

// Default viewer dimensions — overridden by the selected project's preset.
const DEFAULT_VIEWER_W = 1920;
const DEFAULT_VIEWER_H = 1080;
const VIEWER_FPS = 30;
// Kept for back-compat with code that still imports them
const VIEWER_W = DEFAULT_VIEWER_W;
const VIEWER_H = DEFAULT_VIEWER_H;

// Format presets — used by the Dashboard new-project picker and stored on the project.
const PROJECT_PRESETS = [
  {id:'yt-1080',  name:'YouTube 1080p',     w:1920, h:1080, ratio:'16:9', icon:'youtube',  desc:'Widescreen video'},
  {id:'yt-4k',    name:'YouTube 4K',        w:3840, h:2160, ratio:'16:9', icon:'monitor',  desc:'Ultra HD'},
  {id:'tiktok',   name:'TikTok / Shorts',   w:1080, h:1920, ratio:'9:16', icon:'smartphone',desc:'Vertical, full-screen'},
  {id:'reel',     name:'Instagram Reel',    w:1080, h:1920, ratio:'9:16', icon:'video',    desc:'Vertical IG / Reels'},
  {id:'ig-square',name:'Instagram Square',  w:1080, h:1080, ratio:'1:1',  icon:'square',   desc:'Feed post'},
  {id:'ig-4x5',   name:'Instagram 4:5',     w:1080, h:1350, ratio:'4:5',  icon:'rectangle-vertical',desc:'Portrait feed post'},
  {id:'linkedin', name:'LinkedIn Video',    w:1200, h:1200, ratio:'1:1',  icon:'briefcase',desc:'Square feed'},
  {id:'twitter',  name:'X / Twitter',       w:1280, h:720,  ratio:'16:9', icon:'twitter',  desc:'In-feed video'},
  {id:'custom',   name:'Custom Size',       w:1920, h:1080, ratio:'—',    icon:'sliders',  desc:'You pick'}
];

// ---------- State ----------
const state = {
  projectId: null,        // ID into editorx.projects.v1; null = not loaded yet
  projectName: 'Untitled',
  presetId: 'yt-1080',
  canvasW: DEFAULT_VIEWER_W,
  canvasH: DEFAULT_VIEWER_H,
  clips: [],              // populated by openProject / newProject
  selectedClipId: null,
  media: [],              // {id,name,url,type,duration}
  masks: {},              // clipId -> [{...}]
  selectedMaskId: null,
  tracks: {
    v2: {muted:false, locked:false, visible:true, blend:'screen'},
    v1: {muted:false, locked:false, visible:true, blend:'normal'},
    a1: {muted:false, locked:false, visible:true},
    t1: {muted:false, locked:false, visible:true}
  },
  playhead: 0,            // ms
  isPlaying: false,
  snap: true,
  activeTool: 'select',   // select | blade | text | hand
  workspace: 'edit',
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
  let nx = Math.round(TIMELINE_OFFSET_X + playheadMs/PLAYHEAD_MS_PER_PX);
  const w = Math.max(80, Math.round((preset.duration||3)*TIMELINE_PX_PER_S));
  // Collision-clamp on T1: walk forward past anything we'd overlap so
  // repeated clicks add stacked-to-the-right titles instead of piling on
  // top of each other at the playhead.
  const onT1 = state.clips.filter(c => c.track==='t1').sort((a,b)=>a.x-b.x);
  let safe = false, guard = 0;
  while(!safe && guard++ < 100){
    safe = true;
    for(const o of onT1){
      if(nx < o.x + o.w && nx + w > o.x){
        nx = o.x + o.w + 4;
        safe = false;
        break;
      }
    }
  }
  const clip = {
    id: genId(), type:'text', name: preset.name, track:'t1',
    x: nx, w,
    color: preset.color || '#FFFFFF',
    text: preset.defaultText || preset.name,
    font: preset.font || 'Fraunces',
    fontWeight: preset.weight || 700,
    opacity: 1, scale: preset.scale || 1,
    // Honor preset positioning so Left/Right Lower Thirds etc actually
    // land at the right corner instead of all stacking centered.
    posX: preset.posX || 0,
    posY: preset.posY || 0,
    rotation: 0
  };
  state.clips.push(clip);
  state.selectedClipId = clip.id;
  return clip;
}
// Append-on-click — places after the rightmost edge of the appropriate track.
// Add a graphic call-out clip from a preset (Subscribe / Discord / IG handle / etc.).
// Internally a text clip with graphicStyle/graphicBg/graphicIcon properties so
// the canvas renderer composites the rounded background + icon + text.
function addGraphicAt(playheadMs, preset){
  let nx = Math.round(TIMELINE_OFFSET_X + playheadMs/PLAYHEAD_MS_PER_PX);
  const w = Math.max(80, Math.round((preset.duration||3)*TIMELINE_PX_PER_S));
  const onT1 = state.clips.filter(c => c.track==='t1').sort((a,b)=>a.x-b.x);
  let safe = false, guard = 0;
  while(!safe && guard++ < 100){
    safe = true;
    for(const o of onT1){
      if(nx < o.x + o.w && nx + w > o.x){ nx = o.x + o.w + 4; safe = false; break; }
    }
  }
  const clip = {
    id: genId(), type:'text', name: preset.name, track:'t1',
    x: nx, w,
    color: preset.fg,
    text: preset.defaultText,
    font: preset.font || 'Fraunces',
    fontWeight: preset.weight || 700,
    opacity: 1, scale: 1, posX:0, posY:0, rotation:0,
    // Graphic-specific:
    graphicStyle: preset.style,   // 'pill' | 'card' | 'badge'
    graphicBg:    preset.bg,
    graphicIcon:  preset.icon,
    graphicAccent:preset.accent,
    graphicGlass: !!preset.glass,
    presetId:     preset.id
  };
  state.clips.push(clip);
  state.selectedClipId = clip.id;
  return clip;
}

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

// ---------- Keyframes (per-clip animated properties) ----------
//
// Each clip can carry a `keyframes` map keyed by property name:
//   clip.keyframes = {
//     scale:  [{t:0.00, v:1.00, e:'easeOut'}, {t:0.08, v:1.25, e:'easeIn'}, ...],
//     posX:   [...],
//     opacity:[...],
//     rotation: [...],
//   }
// Time `t` is RELATIVE to the clip's start (in seconds), not absolute timeline
// time — so trimming/moving a clip preserves its animation.
//
// Renderers should read animated values via clipPropAt(clip, prop, fallback).

const KF_EASINGS = {
  linear:  u => u,
  ease:    u => u<.5 ? 2*u*u : 1 - 2*(1-u)*(1-u),
  easeIn:  u => u*u,
  easeOut: u => 1 - (1-u)*(1-u)
};

function evalKeyframes(arr, tRel, fallback){
  if(!arr || !arr.length) return fallback;
  // Clip outside the range to the boundary values
  if(tRel <= arr[0].t)              return arr[0].v;
  if(tRel >= arr[arr.length-1].t)   return arr[arr.length-1].v;
  // Linear scan (small arrays). Find the bracketing pair.
  for(let i=0; i<arr.length-1; i++){
    const a = arr[i], b = arr[i+1];
    if(tRel >= a.t && tRel <= b.t){
      const u = (tRel - a.t) / (b.t - a.t || 1);
      const ease = KF_EASINGS[b.e || 'ease'] || KF_EASINGS.ease;
      return a.v + (b.v - a.v) * ease(u);
    }
  }
  return fallback;
}

function clipTimeAtPlayhead(clip){
  const tS = state.playhead / 1000;
  return Math.max(0, tS - clipStartS(clip));
}

// Read a clip property at the current playhead, honoring keyframes if present.
function clipPropAt(clip, prop, fallback){
  if(clip.keyframes && clip.keyframes[prop] && clip.keyframes[prop].length){
    return evalKeyframes(clip.keyframes[prop], clipTimeAtPlayhead(clip), fallback);
  }
  return fallback;
}

function addKeyframeTo(clipId, prop, tRel, value, easing){
  const c = getClip(clipId); if(!c) return null;
  if(!c.keyframes) c.keyframes = {};
  if(!c.keyframes[prop]) c.keyframes[prop] = [];
  // Replace if there's already a kf within 10ms of this time
  c.keyframes[prop] = c.keyframes[prop].filter(k => Math.abs(k.t - tRel) > 0.01);
  const kf = {t: Math.max(0, tRel), v: value, e: easing || 'ease'};
  c.keyframes[prop].push(kf);
  c.keyframes[prop].sort((a,b)=>a.t - b.t);
  return kf;
}
function removeKeyframe(clipId, prop, tRel){
  const c = getClip(clipId); if(!c || !c.keyframes || !c.keyframes[prop]) return;
  c.keyframes[prop] = c.keyframes[prop].filter(k => Math.abs(k.t - tRel) > 0.001);
  if(c.keyframes[prop].length === 0) delete c.keyframes[prop];
  if(c.keyframes && Object.keys(c.keyframes).length === 0) delete c.keyframes;
}
function clearKeyframes(clipId, prop){
  const c = getClip(clipId); if(!c || !c.keyframes) return;
  if(prop) delete c.keyframes[prop];
  else c.keyframes = {};
}

// Snapshot the current static value of a property as a keyframe at the playhead.
function addKeyframeAtPlayhead(clipId, prop){
  const c = getClip(clipId); if(!c) return null;
  const tRel = clipTimeAtPlayhead(c);
  const cur  = clipPropAt(c, prop, c[prop]);
  return addKeyframeTo(clipId, prop, tRel, cur, 'ease');
}

// ---------- Animation presets ----------
// Zoom Punch — snap-zoom on a beat. 3 scale keyframes over ~0.22s.
function applyZoomPunch(clipId, intensity){
  const c = getClip(clipId); if(!c) return;
  const tRel = clipTimeAtPlayhead(c);
  const base = clipPropAt(c, 'scale', c.scale ?? 1);
  const peak = base * (intensity || 1.25);
  addKeyframeTo(clipId, 'scale', tRel,        base, 'easeOut');
  addKeyframeTo(clipId, 'scale', tRel + 0.08, peak, 'easeIn');
  addKeyframeTo(clipId, 'scale', tRel + 0.22, base, 'ease');
}

// Beat Shake — alternating posX/posY pulses over ~0.3s.
function applyBeatShake(clipId, amount){
  const c = getClip(clipId); if(!c) return;
  const tRel = clipTimeAtPlayhead(c);
  const baseX = clipPropAt(c, 'posX', c.posX ?? 0);
  const baseY = clipPropAt(c, 'posY', c.posY ?? 0);
  const A = amount || 28;
  const pattern = [0, 1, -.85, .65, -.5, .3, 0];
  pattern.forEach((m, i) => {
    const t = tRel + i * 0.045;
    addKeyframeTo(clipId, 'posX', t, baseX + A * m,            'linear');
    addKeyframeTo(clipId, 'posY', t, baseY + (i%2 ? A*.3 : -A*.3), 'linear');
  });
}

// Speed Ramp — slow → fast → slow across the clip (TikTok-edit staple).
function applySpeedRamp(clipId, peakMultiplier){
  const c = getClip(clipId); if(!c) return;
  const dur  = c.w / TIMELINE_PX_PER_S;
  const base = clipPropAt(c, 'speed', c.speed ?? 1);
  const peak = peakMultiplier || 2.0;
  if(c.keyframes) delete c.keyframes.speed;
  addKeyframeTo(clipId, 'speed', 0,           base * 0.4, 'easeIn');
  addKeyframeTo(clipId, 'speed', dur * 0.45,  peak,       'easeOut');
  addKeyframeTo(clipId, 'speed', dur,         base * 0.4, 'easeIn');
}

// Smooth Pan — gentle left→right (or right→left) over the full clip.
function applyPan(clipId, distancePx, direction){
  const c = getClip(clipId); if(!c) return;
  const dur = (c.w / TIMELINE_PX_PER_S);
  const baseX = clipPropAt(c, 'posX', c.posX ?? 0);
  const target = baseX + (distancePx || 80) * (direction === 'right' ? 1 : -1);
  addKeyframeTo(clipId, 'posX', 0,    baseX,  'ease');
  addKeyframeTo(clipId, 'posX', dur,  target, 'ease');
}

// Ken Burns — slow continuous scale-up over the full clip.
function applyKenBurns(clipId, endScale){
  const c = getClip(clipId); if(!c) return;
  const dur = (c.w / TIMELINE_PX_PER_S);
  const baseScale = clipPropAt(c, 'scale', c.scale ?? 1);
  addKeyframeTo(clipId, 'scale', 0,    baseScale,                 'ease');
  addKeyframeTo(clipId, 'scale', dur,  baseScale * (endScale || 1.18), 'ease');
}

// Fade In / Out via opacity keyframes.
// IMPORTANT: capture the base value BEFORE adding any keyframes. Otherwise
// the second call to clipPropAt sees the first keyframe (opacity=0) and
// returns that as the "base", so the ramp ends at 0 instead of 1.
function applyFadeIn(clipId, durS){
  const c = getClip(clipId); if(!c) return;
  const d = durS || 0.4;
  const baseOpacity = clipPropAt(c, 'opacity', c.opacity ?? 1);
  // Wipe any existing opacity kfs in our fade window so re-applying is clean
  if(c.keyframes && c.keyframes.opacity){
    c.keyframes.opacity = c.keyframes.opacity.filter(k => k.t > d + 0.01);
    if(!c.keyframes.opacity.length) delete c.keyframes.opacity;
  }
  addKeyframeTo(clipId, 'opacity', 0, 0, 'easeOut');
  addKeyframeTo(clipId, 'opacity', d, baseOpacity, 'easeOut');
}
function applyFadeOut(clipId, durS){
  const c = getClip(clipId); if(!c) return;
  const totalDur = c.w / TIMELINE_PX_PER_S;
  const d = durS || 0.4;
  const baseOpacity = clipPropAt(c, 'opacity', c.opacity ?? 1);
  if(c.keyframes && c.keyframes.opacity){
    c.keyframes.opacity = c.keyframes.opacity.filter(k => k.t < totalDur - d - 0.01);
    if(!c.keyframes.opacity.length) delete c.keyframes.opacity;
  }
  addKeyframeTo(clipId, 'opacity', totalDur - d, baseOpacity, 'easeIn');
  addKeyframeTo(clipId, 'opacity', totalDur,     0, 'easeIn');
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

// ---------- Beat detection (energy-based onset detection) ----------
// Decode the audio file via Web Audio, compute short-window energy, then
// pick peaks that are well above the rolling average AND spaced apart by
// at least a min-beat-interval (so we don't pick up multiple peaks per
// kick). Returns array of beat times in seconds (relative to clip start,
// i.e. start of the audio file).
async function detectBeats(audioUrl, options){
  const opts = Object.assign({
    windowSec:     0.020, // 20ms windows
    minIntervalS:  0.25,  // 240 BPM max — prevents double-counting
    threshold:     1.55,  // peak must exceed (1.55 * moving average)
    avgWindowSec:  0.40   // moving-average window (~400ms)
  }, options || {});

  if(!audioUrl) return [];
  let buf;
  try{
    const resp = await fetch(audioUrl);
    const ab   = await resp.arrayBuffer();
    const Ctx  = window.AudioContext || window.webkitAudioContext;
    const ctx  = new Ctx();
    buf = await ctx.decodeAudioData(ab);
    ctx.close && ctx.close();
  }catch(e){
    console.warn('detectBeats: decode failed', e);
    return [];
  }

  const sr = buf.sampleRate;
  // Mix down all channels to mono
  const len = buf.length;
  const mono = new Float32Array(len);
  for(let ch=0; ch<buf.numberOfChannels; ch++){
    const data = buf.getChannelData(ch);
    for(let i=0; i<len; i++) mono[i] += data[i];
  }
  for(let i=0; i<len; i++) mono[i] /= buf.numberOfChannels;

  // RMS energy per window
  const winSize = Math.max(1, Math.floor(opts.windowSec * sr));
  const numWins = Math.floor(len / winSize);
  const energy  = new Float32Array(numWins);
  for(let w=0; w<numWins; w++){
    const off = w * winSize;
    let sum = 0;
    for(let j=0; j<winSize; j++){ const s = mono[off+j]; sum += s*s; }
    energy[w] = Math.sqrt(sum / winSize);
  }

  // Moving average + variance over avgWindow
  const avgWins = Math.max(2, Math.floor(opts.avgWindowSec / opts.windowSec));
  const avg = new Float32Array(numWins);
  for(let i=0; i<numWins; i++){
    const a = Math.max(0, i - avgWins), b = Math.min(numWins, i + avgWins);
    let s = 0; for(let k=a; k<b; k++) s += energy[k];
    avg[i] = s / (b - a);
  }

  // Local-maxima peak picking
  const beats = [];
  const minWinsBetween = Math.max(1, Math.floor(opts.minIntervalS / opts.windowSec));
  let lastBeatW = -minWinsBetween;
  for(let i=1; i<numWins-1; i++){
    if(i - lastBeatW < minWinsBetween) continue;
    const e = energy[i];
    if(e > avg[i] * opts.threshold && e > energy[i-1] && e > energy[i+1]){
      beats.push(i * opts.windowSec);
      lastBeatW = i;
    }
  }
  return beats;
}

// Save detected beats onto an audio clip and (best-effort) estimate BPM.
async function analyzeClipBeats(clipId){
  const c = getClip(clipId); if(!c) return null;
  if(c.type !== 'audio' && c.type !== 'video') return null;
  if(!c.sourceUrl) return null;
  const beats = await detectBeats(c.sourceUrl);
  c.beats = beats;
  if(beats.length >= 4){
    // Median interval → BPM
    const gaps = [];
    for(let i=1; i<beats.length; i++) gaps.push(beats[i] - beats[i-1]);
    gaps.sort((a,b)=>a-b);
    const median = gaps[Math.floor(gaps.length/2)];
    c.bpm = median > 0 ? Math.round(60 / median) : null;
  }
  return {beats: beats, bpm: c.bpm};
}

// Split a video clip at every beat from the given source audio clip.
// `every` = how many beats to skip between cuts (1 = every beat, 4 = every 4th).
function cutVideoOnBeats(videoClipId, audioClipId, every){
  const v = getClip(videoClipId); if(!v || v.type !== 'video') return 0;
  const a = getClip(audioClipId); if(!a || !a.beats || !a.beats.length) return 0;
  const step = Math.max(1, parseInt(every) || 1);
  // Audio clip's timeline-start in pixels, then beat-relative to that:
  const audioStartPx = a.x;
  const vidStart = v.x, vidEnd = v.x + v.w;
  // Walk beats; compute the absolute timeline X of each beat and split if it
  // falls inside the video clip's current bounds. We must re-fetch the clip
  // because splitting changes its width on each split.
  let cuts = 0;
  for(let i=0; i<a.beats.length; i += step){
    const beatX = audioStartPx + a.beats[i] * TIMELINE_PX_PER_S;
    if(beatX <= vidStart + 8 || beatX >= vidEnd - 8) continue;
    const cur = getClip(videoClipId);
    if(!cur) break;
    if(beatX > cur.x + 8 && beatX < cur.x + cur.w - 8){
      const newRight = splitClipAtX(videoClipId, beatX);
      if(newRight){
        cuts++;
        // After splitting, the right half is a new clip; the next beats may
        // fall into either left or right. We keep cutting on the LEFT clip
        // (videoClipId stays the same — it's now shorter, with beats yet to
        // come within its new bounds — but most likely the next beat sits
        // in the right half). Move our target to the right half so subsequent
        // beats keep cutting "forward" through the original range.
        videoClipId = newRight.id;
      }
    } else if(beatX >= (getClip(videoClipId)?.x || 0) + (getClip(videoClipId)?.w || 0)){
      break;
    }
  }
  return cuts;
}

// ---------- Audio waveform peaks (decoded from the actual audio file) ----------
// Computes peak amplitude per ~4-px-wide bar so the timeline clip shows the
// real audio shape instead of seeded fake bars. Stored on the clip as
// clip.waveformPeaks (Array<Float 0..1>) and consumed by _waveformFor() in
// ui.js. Runs once per imported audio (background, non-blocking).
async function analyzeAudioPeaks(clipOrMedia, targetBars){
  const url = clipOrMedia.sourceUrl || clipOrMedia.url;
  if(!url) return null;
  try{
    const resp = await fetch(url);
    const ab   = await resp.arrayBuffer();
    const Ctx  = window.AudioContext || window.webkitAudioContext;
    const ctx  = new Ctx();
    const buf  = await ctx.decodeAudioData(ab);
    ctx.close && ctx.close();

    // Mix all channels to mono
    const N = buf.length, channels = buf.numberOfChannels;
    const mono = new Float32Array(N);
    for(let ch=0; ch<channels; ch++){
      const data = buf.getChannelData(ch);
      for(let i=0; i<N; i++) mono[i] += data[i];
    }
    for(let i=0; i<N; i++) mono[i] /= channels;

    const bars = targetBars || 320;
    const samplesPerBar = Math.floor(N / bars);
    if(samplesPerBar <= 0) return null;
    const peaks = new Float32Array(bars);
    let globalMax = 0.0001; // avoid div-by-zero on silence
    for(let i=0; i<bars; i++){
      let max = 0;
      const off = i * samplesPerBar;
      const end = Math.min(N, off + samplesPerBar);
      for(let j=off; j<end; j++){
        const v = mono[j] < 0 ? -mono[j] : mono[j];
        if(v > max) max = v;
      }
      peaks[i] = max;
      if(max > globalMax) globalMax = max;
    }
    // Normalize 0..1 against the loudest bar
    const out = new Array(bars);
    for(let i=0; i<bars; i++) out[i] = peaks[i] / globalMax;
    return out;
  }catch(e){
    console.warn('analyzeAudioPeaks failed:', e);
    return null;
  }
}

// ---------- Audio file transcription (Whisper-tiny via transformers.js) ----------
// Loads the ONNX-runtime build of Whisper-tiny in the browser. First call
// downloads the model (~75MB) and caches it in the browser's Cache Storage —
// subsequent runs start instantly. Returns the full text + an array of
// timestamped chunks suitable for auto-captioning.
let _whisperPipeline = null;
async function _loadWhisper(onProgress){
  if(_whisperPipeline) return _whisperPipeline;
  onProgress && onProgress({status:'loading-library', label:'Loading transcription engine…'});
  const mod = await import('https://cdn.jsdelivr.net/npm/@xenova/[email protected]');
  // Tell transformers.js to use the browser-cached model
  mod.env.allowLocalModels = false;
  mod.env.useBrowserCache = true;
  _whisperPipeline = await mod.pipeline(
    'automatic-speech-recognition',
    'Xenova/whisper-tiny.en',
    {
      progress_callback: (p) => {
        if(!onProgress) return;
        if(p.status === 'download' || p.status === 'progress'){
          onProgress({status:'downloading-model', label:`Downloading model… ${Math.round((p.progress||0))}%`, progress:p.progress||0, file:p.file});
        } else if(p.status === 'done'){
          onProgress({status:'model-ready', label:'Model ready'});
        }
      }
    }
  );
  return _whisperPipeline;
}

async function transcribeAudioClip(clipId, onProgress){
  const c = getClip(clipId);
  if(!c || !c.sourceUrl) return null;
  const pipe = await _loadWhisper(onProgress);
  onProgress && onProgress({status:'transcribing', label:'Transcribing audio…'});
  // chunk_length_s=30 splits long audio into 30-second windows so it streams
  // results without OOM-ing on long files. return_timestamps gives us per-
  // chunk start/end times that we can use to auto-caption on the timeline.
  const result = await pipe(c.sourceUrl, {
    return_timestamps: true,
    chunk_length_s:   30,
    stride_length_s:  5
  });
  c.transcript       = (result && result.text)   ? result.text.trim() : '';
  c.transcriptChunks = (result && result.chunks) ? result.chunks       : [];
  return {text: c.transcript, chunks: c.transcriptChunks};
}

// Walk an audio clip's transcript chunks and add a timed text clip on T1 for
// each phrase. Returns the number of caption clips actually added.
function addTranscriptAsCaptions(clipId){
  const c = getClip(clipId);
  if(!c || !c.transcriptChunks || !c.transcriptChunks.length) return 0;
  // Absolute timeline time (ms) of where this audio clip starts:
  const clipStartMs = (c.x - TIMELINE_OFFSET_X) * PLAYHEAD_MS_PER_PX;
  let added = 0;
  for(const chunk of c.transcriptChunks){
    const ts = chunk.timestamp || [0, null];
    const startT = ts[0] || 0;
    const endT   = ts[1] || (startT + 2);
    const text   = (chunk.text || '').trim();
    if(!text) continue;
    const captionStartMs = clipStartMs + startT * 1000;
    const durationS = Math.max(0.6, endT - startT);
    addTextClipAt(captionStartMs, {
      name: 'Caption',
      defaultText: text,
      color: '#FFFFFF',
      duration: durationS,
      scale: 1.0,
      font: 'Fraunces',
      weight: 600
    });
    added++;
  }
  return added;
}

// Generate a small JPEG thumbnail data URL from a media URL.
//   video: seek to ~5% in (or 0.2s, whichever is bigger), grab a frame
//   image: draw directly
//   audio: returns null
async function makeMediaThumbnail(url, type){
  if(type === 'audio') return null;
  return new Promise(resolve => {
    if(type === 'image'){
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => { resolve(_drawToJpeg(img, img.naturalWidth, img.naturalHeight)); };
      img.onerror = () => resolve(null);
      img.src = url;
      return;
    }
    // video
    const v = document.createElement('video');
    v.preload = 'auto'; v.muted = true; v.playsInline = true; v.crossOrigin = 'anonymous';
    v.style.cssText = 'position:absolute;left:-99999px;width:1px;height:1px';
    document.body.appendChild(v);
    let done = false;
    const cleanup = () => { try{ v.remove(); }catch{} };
    const finish = (data) => { if(done) return; done = true; cleanup(); resolve(data); };
    v.onloadeddata = () => {
      const t = Math.min(0.2 + 0.05 * (v.duration||0), Math.max(0.1, (v.duration||1) * 0.05));
      try{ v.currentTime = isFinite(t) ? t : 0.1; }catch{ finish(null); }
    };
    v.onseeked = () => {
      if(!v.videoWidth) return finish(null);
      finish(_drawToJpeg(v, v.videoWidth, v.videoHeight));
    };
    v.onerror = () => finish(null);
    setTimeout(() => finish(null), 5000); // 5s safety timeout
    v.src = url;
  });
}
function _drawToJpeg(source, sw, sh){
  const W = 200;
  const H = Math.max(1, Math.round(W * (sh / sw)));
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  try{
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    ctx.drawImage(source, 0, 0, W, H);
    return c.toDataURL('image/jpeg', 0.6);
  }catch{ return null; }
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
      // Honor keyframes on speed for speed-ramping (slow→fast→slow effects)
      const liveSpeed = (typeof clipPropAt === 'function')
        ? clipPropAt(c, 'speed', c.speed || 1) : (c.speed || 1);
      const srcT = (c.inS||0) + (tS - startS) * liveSpeed;
      el.muted = !!(c.muted || trackMuted);
      el.volume = Math.min(1, Math.max(0, c.volume ?? 1));
      el.playbackRate = Math.max(0.1, Math.min(16, liveSpeed));
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

// ---------- Project persistence — multi-project model ----------
//
// Storage layout:
//   localStorage['editorx.projects.v1']  = [
//     { id, name, presetId, canvasW, canvasH,
//       createdAt, updatedAt, thumbnail, doc:{clips, masks, tracks, ...} },
//     ...
//   ]
//   localStorage['editorx.currentProject.v1'] = projectId
//
// Each project autosaves its own doc into the array on every history push.

const PROJECTS_KEY = 'editorx.projects.v1';
const CURRENT_KEY  = 'editorx.currentProject.v1';

function projectDoc(){
  return {
    clips: state.clips,
    masks: state.masks,
    tracks: state.tracks,
    selectedClipId: state.selectedClipId,
    playhead: state.playhead
  };
}
function applyProjectDoc(o){
  if(!o) return false;
  state.clips          = Array.isArray(o.clips)  ? o.clips  : [];
  state.masks          = (o.masks && typeof o.masks==='object') ? o.masks : {};
  state.tracks         = (o.tracks && typeof o.tracks==='object') ? o.tracks : state.tracks;
  state.selectedClipId = o.selectedClipId || null;
  state.playhead       = o.playhead || 0;
  // Imported media (blob: URLs) don't survive a reload — null them out
  state.clips.forEach(c => { if(c.sourceUrl && typeof c.sourceUrl==='string' && c.sourceUrl.startsWith('blob:')) c.sourceUrl = null; });
  state.history = []; state.historyIndex = -1;
  pushHistoryNoSave();
  return true;
}
function pushHistoryNoSave(){
  state.history = state.history.slice(0, state.historyIndex+1);
  state.history.push(snapshotState());
  if(state.history.length > 50) state.history.shift();
  state.historyIndex = state.history.length - 1;
}

function listProjects(){
  try{ const v = JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]'); return Array.isArray(v) ? v : []; }
  catch{ return []; }
}
function writeProjects(list){
  try{ localStorage.setItem(PROJECTS_KEY, JSON.stringify(list)); return true; }
  catch(err){ console.warn('EditorX writeProjects failed:', err); return false; }
}
function getCurrentProjectId(){
  try{ return localStorage.getItem(CURRENT_KEY); }catch{return null;}
}
function setCurrentProjectId(id){
  try{ if(id) localStorage.setItem(CURRENT_KEY, id); else localStorage.removeItem(CURRENT_KEY); }catch{}
}

// Capture a JPEG thumbnail of the viewer canvas (small + cheap).
function captureThumbnail(){
  const cv = document.getElementById('viewer-canvas');
  if(!cv) return null;
  const tw = 480, th = Math.round(tw * (state.canvasH/state.canvasW));
  const tcv = document.createElement('canvas');
  tcv.width = tw; tcv.height = th;
  const ctx = tcv.getContext('2d');
  ctx.fillStyle = '#000'; ctx.fillRect(0,0,tw,th);
  try{ ctx.drawImage(cv, 0, 0, tw, th); }catch{}
  try{ return tcv.toDataURL('image/jpeg', 0.55); }catch{ return null; }
}

// Save the current in-memory project back into the projects list.
function saveCurrentProject(){
  if(!state.projectId) return false;
  const list = listProjects();
  const idx = list.findIndex(p => p.id === state.projectId);
  const now = new Date().toISOString();
  const meta = {
    id: state.projectId,
    name: state.projectName,
    presetId: state.presetId,
    canvasW: state.canvasW,
    canvasH: state.canvasH,
    updatedAt: now,
    createdAt: (idx >= 0 ? list[idx].createdAt : now),
    thumbnail: captureThumbnail() || (idx >= 0 ? list[idx].thumbnail : null),
    clipCount: state.clips.length,
    durationS: timelineDurationS(),
    doc: projectDoc()
  };
  if(idx >= 0) list[idx] = meta; else list.push(meta);
  return writeProjects(list);
}

let _autosaveT = null;
function scheduleAutosave(){
  if(_autosaveT) clearTimeout(_autosaveT);
  if(window.statusbarSaving) window.statusbarSaving();
  _autosaveT = setTimeout(()=>{
    try{
      saveCurrentProject();
      if(window.statusbarSaved) window.statusbarSaved();
    }catch(e){
      if(window.statusbarSaved) window.statusbarSaved();
    }
  }, 600);
}

// Replace the editor state with the given project (by id).
function openProject(id){
  const list = listProjects();
  const p = list.find(pr => pr.id === id);
  if(!p) return false;
  state.projectId   = p.id;
  state.projectName = p.name || 'Untitled';
  state.presetId    = p.presetId || 'yt-1080';
  state.canvasW     = p.canvasW || DEFAULT_VIEWER_W;
  state.canvasH     = p.canvasH || DEFAULT_VIEWER_H;
  applyProjectDoc(p.doc || {});
  setCurrentProjectId(p.id);
  applyCanvasSize();
  return true;
}

// Create a brand-new project from a preset + name. Returns the new id.
function createProject(name, presetId, customW, customH){
  const preset = PROJECT_PRESETS.find(p=>p.id===presetId) || PROJECT_PRESETS[0];
  const id = 'p_' + Math.random().toString(36).slice(2, 10);
  state.projectId   = id;
  state.projectName = (name && name.trim()) || preset.name;
  state.presetId    = preset.id;
  state.canvasW     = (preset.id==='custom' && customW) ? customW : preset.w;
  state.canvasH     = (preset.id==='custom' && customH) ? customH : preset.h;
  state.clips = []; state.masks = {}; state.selectedClipId = null; state.selectedMaskId = null;
  state.playhead = 0;
  state.tracks = {v1:{muted:false,locked:false,visible:true},
                  a1:{muted:false,locked:false,visible:true},
                  t1:{muted:false,locked:false,visible:true}};
  state.history = []; state.historyIndex = -1;
  pushHistoryNoSave();
  setCurrentProjectId(id);
  applyCanvasSize();
  saveCurrentProject(); // persist immediately so it shows up on the Dashboard
  return id;
}

function deleteProject(id){
  const list = listProjects().filter(p => p.id !== id);
  writeProjects(list);
  if(getCurrentProjectId() === id) setCurrentProjectId(null);
  return true;
}
function renameProject(id, newName){
  const list = listProjects();
  const p = list.find(pr=>pr.id===id);
  if(!p) return false;
  p.name = newName;
  p.updatedAt = new Date().toISOString();
  if(state.projectId === id) state.projectName = newName;
  return writeProjects(list);
}

// Apply state.canvasW/H to the actual <canvas> element so the viewer renders
// at the right resolution for the chosen project.
function applyCanvasSize(){
  const cv = document.getElementById('viewer-canvas');
  if(!cv) return;
  cv.width  = state.canvasW;
  cv.height = state.canvasH;
}

// Demo seed: used by "Add demo project" / first-run if user wants something pre-loaded.
function seedDemoClips(){
  state.clips = [
    {id:genId(),type:'video',name:'Welcome.mp4',  track:'v1',x:80, w:240,color:'#1a3a5c',sourceUrl:null,
      transition:null,lutId:null,lutIntensity:1,effectId:null,fxAmount:null,
      opacity:1,scale:1,posX:0,posY:0,rotation:0,
      volume:1,muted:false,speed:1,inS:0},
    {id:genId(),type:'text', name:'Intro Title', track:'t1',x:80, w:160,color:'#FFFFFF',
      text:'EditorX', font:'Mona Sans', fontWeight:800, opacity:1,scale:1.6,posX:0,posY:0,rotation:0}
  ];
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
window.addGraphicAt=addGraphicAt;
window.clipUnderTimelineX=clipUnderTimelineX;
window.detachAudio=detachAudio;
window.activeClipsAt=activeClipsAt; window.clipStartS=clipStartS; window.clipEndS=clipEndS; window.timelineDurationS=timelineDurationS;
window.clipPropAt=clipPropAt; window.clipTimeAtPlayhead=clipTimeAtPlayhead;
window.addKeyframeTo=addKeyframeTo; window.removeKeyframe=removeKeyframe;
window.clearKeyframes=clearKeyframes; window.addKeyframeAtPlayhead=addKeyframeAtPlayhead;
window.applyZoomPunch=applyZoomPunch; window.applyBeatShake=applyBeatShake;
window.applyPan=applyPan; window.applyKenBurns=applyKenBurns;
window.applyFadeIn=applyFadeIn; window.applyFadeOut=applyFadeOut;
window.applySpeedRamp=applySpeedRamp;
window.detectBeats=detectBeats; window.analyzeClipBeats=analyzeClipBeats;
window.cutVideoOnBeats=cutVideoOnBeats;
window.transcribeAudioClip=transcribeAudioClip;
window.addTranscriptAsCaptions=addTranscriptAsCaptions;
window.analyzeAudioPeaks=analyzeAudioPeaks;
window.getMediaElForClip=getMediaElForClip; window.releaseMediaFor=releaseMediaFor; window.syncMediaToPlayhead=syncMediaToPlayhead;
window.makeMediaThumbnail=makeMediaThumbnail;
window.startPlayback=startPlayback; window.stopPlayback=stopPlayback; window.togglePlayback=togglePlayback;
window.seekPlayhead=seekPlayhead; window.nudgePlayhead=nudgePlayhead;
window.loadFont=loadFont;
window.pushHistory=pushHistory; window.undo=undo; window.redo=redo;
window.applyProjectDoc=applyProjectDoc;
window.projectDoc=projectDoc;
window.PROJECT_PRESETS=PROJECT_PRESETS;
window.listProjects=listProjects;
window.openProject=openProject;
window.createProject=createProject;
window.deleteProject=deleteProject;
window.renameProject=renameProject;
window.saveCurrentProject=saveCurrentProject;
window.applyCanvasSize=applyCanvasSize;
window.getCurrentProjectId=getCurrentProjectId;
window.setCurrentProjectId=setCurrentProjectId;
window.captureThumbnail=captureThumbnail;
window.seedDemoClips=seedDemoClips;
