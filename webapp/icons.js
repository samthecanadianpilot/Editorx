// EditorX — Lucide → Phosphor drop-in shim
// Exposes window.lucide = { createIcons(opts?) } so existing call sites work
// untouched. Renders Phosphor (regular weight) icons via their CSS-font CDN.
// Phosphor is the closest free, legal approximation of Apple's SF Symbols.
(function () {
  // Lucide → Phosphor name map. Phosphor regular-weight names.
  // Anything not in this map falls back to its Lucide name verbatim (Phosphor
  // may still have it — most overlap is 1:1).
  const MAP = {
    // Transport / playback
    'play': 'play', 'pause': 'pause', 'square': 'square',
    'skip-back': 'skip-back', 'skip-forward': 'skip-forward',
    'rewind': 'rewind', 'fast-forward': 'fast-forward',
    'play-circle': 'play-circle',
    // Edit operations
    'undo-2': 'arrow-counter-clockwise', 'redo-2': 'arrow-clockwise',
    'scissors': 'scissors', 'hand': 'hand', 'magnet': 'magnet',
    'mouse-pointer-2': 'cursor', 'mouse-pointer-click': 'cursor-click',
    'text-cursor': 'text-aa',
    // File / project
    'file-plus': 'file-plus', 'folder': 'folder', 'folder-open': 'folder-open',
    'folder-plus': 'folder-plus', 'save': 'floppy-disk',
    'upload': 'upload-simple', 'upload-cloud': 'cloud-arrow-up',
    // Brand / type
    'hexagon': 'hexagon', 'edit-2': 'pencil-simple', 'edit-3': 'pencil',
    'type': 'text-t',
    // Library categories
    'palette': 'palette', 'sparkles': 'sparkle', 'sparkle': 'sparkle',
    'search': 'magnifying-glass', 'layers': 'stack', 'layers-2': 'stack-simple',
    'clapperboard': 'film-slate', 'film': 'film-strip',
    'sticker': 'sticker', 'video': 'video-camera', 'mic': 'microphone',
    'monitor': 'monitor', 'image': 'image',
    // Plus / minus
    'plus': 'plus', 'plus-circle': 'plus-circle', 'plus-square': 'plus-square',
    'minus': 'minus', 'minus-square': 'minus-square',
    // Auth / session
    'log-out': 'sign-out', 'sign-in': 'sign-in', 'lock': 'lock',
    'unlock': 'lock-open', 'shield': 'shield', 'user': 'user',
    // Modal / dialog
    'x': 'x', 'check': 'check', 'info': 'info',
    'arrow-right': 'arrow-right', 'arrow-left': 'arrow-left',
    'arrow-up': 'arrow-up', 'arrow-down': 'arrow-down',
    'chevron-right': 'caret-right', 'chevron-left': 'caret-left',
    'chevron-up': 'caret-up', 'chevron-down': 'caret-down',
    'arrow-down-up': 'arrows-down-up',
    'move-horizontal': 'arrows-horizontal', 'arrows-horizontal': 'arrows-horizontal',
    // Trash / delete
    'trash-2': 'trash', 'trash': 'trash',
    // Sundry
    'keyboard': 'keyboard', 'loader': 'spinner-gap',
    'circle': 'circle', 'diamond': 'diamond',
    'eye': 'eye', 'eye-off': 'eye-slash',
    'more-horizontal': 'dots-three',
    'volume-2': 'speaker-high', 'audio-waveform': 'waveform',
    'gauge': 'gauge', 'zap': 'lightning',
    'sunrise': 'sun-horizon', 'sunset': 'sun-horizon', 'sun': 'sun', 'moon': 'moon',
    'snowflake': 'snowflake', 'flame': 'flame', 'cloud': 'cloud',
    'circle-dashed': 'circle-dashed', 'circle-slash': 'prohibit',
    'unplug': 'plug', 'tally-3': 'list-bullets', 'pen-tool': 'pen-nib',
    'droplet': 'drop', 'contrast': 'circle-half',
    'blend': 'drop-half-bottom',     // closest visual
    'copy-minus': 'minus-square',
    'zoom-in': 'magnifying-glass-plus', 'zoom-out': 'magnifying-glass-minus',
    'captions': 'closed-captioning', 'caption': 'closed-captioning',
    'trending-up': 'trend-up', 'trend-up': 'trend-up',
    'vibrate': 'vibrate',
    'corner-down-right': 'arrow-bend-down-right',
    // Graphics presets (used in data.js)
    'play-square': 'play', 'thumbs-up': 'thumbs-up', 'bell': 'bell',
    'message-circle': 'chat-circle', 'camera': 'camera', 'music': 'music-note',
    'at-sign': 'at', 'terminal': 'terminal-window', 'link': 'link',
    'hash': 'hash', 'heart': 'heart', 'maximize': 'arrows-out',
    'megaphone': 'megaphone', 'quote': 'quotes',
    'heading-1': 'text-h-one', 'baseline': 'text-aa',
    'align-left': 'text-align-left', 'align-center': 'text-align-center',
    'align-right': 'text-align-right',
    'calendar': 'calendar', 'map-pin': 'map-pin',
    'rss': 'rss', 'bookmark': 'bookmark',
    'snowflake-2': 'snowflake',
  };

  function phName(lucideName) {
    if (!lucideName) return null;
    return MAP[lucideName] || lucideName;
  }

  // Render one <i data-lucide="X"> in place.
  function renderOne(el) {
    const name = el.dataset.lucide || el.getAttribute('data-lucide');
    const ph = phName(name);
    if (!ph) return;
    // Preserve sizing — Lucide called for width/height attrs; map to font-size.
    const w = parseInt(el.getAttribute('width'), 10);
    const size = w > 0 ? w : null;
    // Build the replacement <i class="ph ph-NAME">
    const next = document.createElement('i');
    next.className = 'ph ph-' + ph + ' icon-ph';
    next.setAttribute('aria-hidden', 'true');
    // Carry over existing inline style + any class list (minus the empty data-lucide)
    if (el.className && !/^icon-ph/.test(el.className)) {
      next.className += ' ' + el.className;
    }
    if (size) next.style.fontSize = size + 'px';
    // If the source had an explicit style attribute (e.g. color), keep it.
    const inlineStyle = el.getAttribute('style');
    if (inlineStyle) next.style.cssText += ';' + inlineStyle;
    // Title / id / data-* attributes (except data-lucide)
    for (const a of el.attributes) {
      if (a.name === 'data-lucide' || a.name === 'width' || a.name === 'height' || a.name === 'class' || a.name === 'style') continue;
      next.setAttribute(a.name, a.value);
    }
    el.replaceWith(next);
  }

  function createIcons(opts) {
    opts = opts || {};
    const root = opts.root || document;
    const els = root.querySelectorAll('i[data-lucide]');
    els.forEach(renderOne);
  }

  // Expose Lucide-compatible API so existing code (window.lucide.createIcons)
  // still works.
  window.lucide = { createIcons };

  // Auto-init at DOMContentLoaded as Lucide does.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => createIcons());
  } else {
    createIcons();
  }
})();
