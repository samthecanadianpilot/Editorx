// EditorX — Data
// Static catalogs: masks, effects, transitions, LUTs, titles, fonts.

const MASK_TYPES = [
  {id:'rectangle',name:'Rectangle',icon:'square',color:'#3478f6',desc:'Rect with optional rounded corners'},
  {id:'ellipse',  name:'Ellipse',  icon:'circle',           color:'#af52de',desc:'Circular / oval mask'},
  {id:'bezier',   name:'Bezier',   icon:'pen-tool',         color:'#ff9500',desc:'Custom curved path'},
  {id:'gradient', name:'Gradient', icon:'contrast',         color:'#30d158',desc:'Fade visible to invisible'},
  {id:'feathered',name:'Feathered',icon:'cloud',            color:'#64d2ff',desc:'Soft-edged mask'},
  {id:'animated', name:'Animated', icon:'play-circle',      color:'#ff375f',desc:'Animates over time'},
  {id:'inverted', name:'Inverted', icon:'copy-minus',       color:'#ffd60a',desc:'Hide inside / show outside'}
];

// Effects are now applied directly to clips (single effect per clip).
// Each effect's `cssFilter(clip)` returns a CSS filter() string used when rendering the clip's video frame.
const EFFECTS = [
  {id:'none',     name:'None',     icon:'circle-slash',  cat:'none',     desc:'No effect',           cssFilter:()=>'none'},
  {id:'blur',     name:'Blur',     icon:'droplet',       cat:'blur',     desc:'Gaussian blur',       params:{amount:{min:0,max:20,def:5,unit:'px'}}, cssFilter:c=>`blur(${c.fxAmount??5}px)`},
  {id:'sharpen',  name:'Sharpen',  icon:'sparkles',      cat:'detail',   desc:'Crispen edges',       params:{amount:{min:0,max:200,def:50,unit:'%'}}, cssFilter:c=>`contrast(${100+(c.fxAmount??50)/2}%) saturate(${100+(c.fxAmount??50)/4}%)`},
  {id:'bw',       name:'Black & White', icon:'film',     cat:'color',    desc:'Desaturate to mono',  cssFilter:()=>'grayscale(100%)'},
  {id:'sepia',    name:'Sepia',    icon:'image',         cat:'color',    desc:'Warm vintage tint',   cssFilter:()=>'sepia(80%)'},
  {id:'invert',   name:'Invert',   icon:'arrow-down-up', cat:'color',    desc:'Invert colors',       cssFilter:()=>'invert(100%)'},
  {id:'hue',      name:'Hue Shift',icon:'palette',       cat:'color',    desc:'Rotate hue',          params:{amount:{min:-180,max:180,def:30,unit:'°'}}, cssFilter:c=>`hue-rotate(${c.fxAmount??30}deg)`},
  {id:'sat',      name:'Saturation',icon:'droplet',      cat:'color',    desc:'Boost or mute color', params:{amount:{min:0,max:300,def:150,unit:'%'}}, cssFilter:c=>`saturate(${c.fxAmount??150}%)`},
  {id:'contrast', name:'Contrast', icon:'contrast',      cat:'color',    desc:'Punch the curve',     params:{amount:{min:50,max:200,def:130,unit:'%'}}, cssFilter:c=>`contrast(${c.fxAmount??130}%)`},
  {id:'bright',   name:'Brightness',icon:'sun',          cat:'color',    desc:'Lighten / darken',    params:{amount:{min:25,max:200,def:120,unit:'%'}}, cssFilter:c=>`brightness(${c.fxAmount??120}%)`},
  {id:'warm',     name:'Warm',     icon:'flame',         cat:'mood',     desc:'Warm color cast',     cssFilter:()=>'sepia(30%) saturate(140%)'},
  {id:'cool',     name:'Cool',     icon:'snowflake',     cat:'mood',     desc:'Cool color cast',     cssFilter:()=>'hue-rotate(-15deg) saturate(120%) brightness(95%)'},
  {id:'dream',    name:'Dream',    icon:'moon',          cat:'mood',     desc:'Soft dreamy haze',    cssFilter:()=>'blur(0.6px) brightness(108%) saturate(115%)'}
];

// LUTs — each maps to a tint color + multiply blend mode for canvas-side overlay rendering.
const LUTS = [
  {id:'none',       name:'None',             cat:'none',      color:'#888888',blend:'source-over',def:0},
  {id:'cineWarm',   name:'Cinematic Warm',   cat:'cinematic', color:'#ffb87a',blend:'multiply',   def:0.35},
  {id:'cineCool',   name:'Cinematic Cool',   cat:'cinematic', color:'#7aaeff',blend:'multiply',   def:0.35},
  {id:'tealOrange', name:'Teal & Orange',    cat:'cinematic', color:'#3fa9a9',blend:'overlay',    def:0.45},
  {id:'vintage',    name:'Vintage Film',     cat:'retro',     color:'#caa46a',blend:'multiply',   def:0.40},
  {id:'bleach',     name:'Bleach Bypass',    cat:'cinematic', color:'#a9a9a9',blend:'overlay',    def:0.30},
  {id:'fade',       name:'Faded',            cat:'aesthetic', color:'#e6e6cc',blend:'screen',     def:0.25},
  {id:'moody',      name:'Moody Blue',       cat:'cinematic', color:'#3a4060',blend:'multiply',   def:0.45},
  {id:'glow',       name:'Warm Glow',        cat:'aesthetic', color:'#ffcc99',blend:'soft-light', def:0.50},
  {id:'noir',       name:'Noir',             cat:'retro',     color:'#5a5a5a',blend:'multiply',   def:0.55},
  {id:'summer',     name:'Summer',           cat:'aesthetic', color:'#ccdfb3',blend:'soft-light', def:0.40},
  {id:'neon',       name:'Neon',             cat:'creative',  color:'#e64d99',blend:'overlay',    def:0.35},
  {id:'forest',     name:'Forest',           cat:'cinematic', color:'#66b380',blend:'multiply',   def:0.40},
  {id:'pastel',     name:'Pastel',           cat:'aesthetic', color:'#ccb3e6',blend:'screen',     def:0.30},
  {id:'hdr',        name:'HDR Pop',          cat:'creative',  color:'#ffb34d',blend:'overlay',    def:0.40},
  {id:'crimson',    name:'Crimson',          cat:'mood',      color:'#9a2233',blend:'multiply',   def:0.40},
  {id:'cyberpunk',  name:'Cyberpunk',        cat:'creative',  color:'#a040ff',blend:'overlay',    def:0.45}
];

const TRANSITIONS = [
  {id:'fade',       name:'Cross Dissolve', icon:'blend',          desc:'Smooth opacity fade',      duration:0.5},
  {id:'dipBlack',   name:'Dip to Black',   icon:'moon',           desc:'Fade through black',       duration:0.5},
  {id:'dipWhite',   name:'Dip to White',   icon:'sun',            desc:'Fade through white',       duration:0.5},
  {id:'wipeL',      name:'Wipe Left',      icon:'arrow-right',    desc:'Wipe left to right',       duration:0.5},
  {id:'wipeR',      name:'Wipe Right',     icon:'arrow-left',     desc:'Wipe right to left',       duration:0.5},
  {id:'slideUp',    name:'Slide Up',       icon:'arrow-up',       desc:'Slide upward',             duration:0.5},
  {id:'slideDown',  name:'Slide Down',     icon:'arrow-down',     desc:'Slide downward',           duration:0.5},
  {id:'zoomIn',     name:'Zoom In',        icon:'zoom-in',        desc:'Punch-in zoom',            duration:0.4},
  {id:'zoomOut',    name:'Zoom Out',       icon:'zoom-out',       desc:'Pull-back zoom',           duration:0.4},
  {id:'whip',       name:'Whip Pan',       icon:'fast-forward',   desc:'Quick directional blur',   duration:0.3}
];

// Title presets — modelled after DaVinci Resolve's Titles catalog.
// Each can carry posX/posY to land the text at a specific viewer position
// (lower thirds, corners, watermarks, etc.). addTextClipAt() applies these
// when creating the clip.
const TITLES = [
  // Originals (cleaned up)
  {id:'simple',  name:'Simple Title', defaultText:'Title',           color:'#FFFFFF', duration:3, scale:1.6, font:'Fraunces',        weight:800, icon:'type'},
  {id:'callout', name:'Callout',      defaultText:'CALLOUT',         color:'#FFD60A', duration:2.5,scale:1.2, font:'Bebas Neue',     weight:400, icon:'megaphone'},
  {id:'credits', name:'Credits',      defaultText:'Directed By',     color:'#EFEFEF', duration:5, scale:1.1, font:'Playfair Display',weight:700, icon:'film'},
  {id:'bigQuote',name:'Big Quote',    defaultText:'“All you need…”', color:'#FFFFFF',duration:5,scale:1.4,font:'Playfair Display',weight:900,icon:'quote'},
  {id:'tag',     name:'Tag Pill',     defaultText:'#tag',            color:'#0A84FF', duration:3, scale:0.8, font:'JetBrains Mono', weight:700, icon:'hash'},

  // Lower thirds (DaVinci-style — name + role line, positioned at lower frame)
  {id:'lt-left',   name:'Left Lower Third',   defaultText:'Speaker Name',     color:'#FFFFFF', duration:4, scale:1.0, font:'Fraunces', weight:600, icon:'align-left',   posX:-540, posY:300},
  {id:'lt-middle', name:'Middle Lower Third', defaultText:'Speaker Name',     color:'#FFFFFF', duration:4, scale:1.0, font:'Fraunces', weight:600, icon:'align-center', posX:0,    posY:300},
  {id:'lt-right',  name:'Right Lower Third',  defaultText:'Speaker Name',     color:'#FFFFFF', duration:4, scale:1.0, font:'Fraunces', weight:600, icon:'align-right',  posX:540,  posY:300},

  // DaVinci core
  {id:'basic',     name:'Basic Title',        defaultText:'Basic Title',      color:'#FFFFFF', duration:3, scale:1.4, font:'Fraunces', weight:700, icon:'type'},
  {id:'text',      name:'Text',               defaultText:'Sample Text',      color:'#FFFFFF', duration:3, scale:1.0, font:'Fraunces', weight:500, icon:'baseline'},
  {id:'big',       name:'Big Headline',       defaultText:'BIG HEADLINE',     color:'#FFFFFF', duration:3, scale:2.2, font:'Fraunces', weight:800, icon:'heading-1'},
  {id:'sub',       name:'Subtitle',           defaultText:'Subtitle line',    color:'#EFEFEF', duration:3, scale:0.75,font:'Fraunces', weight:500, icon:'captions',     posY:360},

  // Editorial extras
  {id:'date',      name:'Date Stamp',         defaultText:'MAR 14, 2026',     color:'#FFD60A', duration:3, scale:0.7, font:'JetBrains Mono', weight:700, icon:'calendar', posX:-720, posY:-440},
  {id:'loc',       name:'Location',           defaultText:'LOS ANGELES, CA',  color:'#FFFFFF', duration:3, scale:0.7, font:'Fraunces',       weight:600, icon:'map-pin',  posX:-540, posY:420},
  {id:'watermark', name:'Watermark',          defaultText:'@yourhandle',      color:'#FFFFFF', duration:5, scale:0.55,font:'JetBrains Mono', weight:600, icon:'shield',   posX:720,  posY:-460},
  {id:'cta-bot',   name:'CTA (Bottom)',       defaultText:'WATCH UNTIL THE END', color:'#FFD60A', duration:3, scale:0.95,font:'Fraunces',     weight:800, icon:'arrow-down', posY:420},
  {id:'chapter',   name:'Chapter Mark',       defaultText:'01 — CHAPTER',     color:'#FFFFFF', duration:3, scale:1.1, font:'Fraunces', weight:300, icon:'bookmark'},
  {id:'banner',    name:'News Banner',        defaultText:'BREAKING NEWS',    color:'#FF375F', duration:4, scale:1.3, font:'Oswald',          weight:700, icon:'rss'},
  {id:'caption',   name:'Caption (Inline)',   defaultText:'A short caption.', color:'#FFFFFF', duration:3, scale:0.85,font:'Fraunces',       weight:500, icon:'captions',  posY:360}
];

// Curated subset of Google Fonts — ~250 of the most-used families.
// Loaded on demand via FontLoader (lazy <link> injection).
const FONTS = [
  'Inter','Roboto','Open Sans','Lato','Montserrat','Poppins','Source Sans 3','Raleway','Nunito','Ubuntu',
  'Playfair Display','Merriweather','PT Sans','PT Serif','Roboto Condensed','Noto Sans','Noto Serif','Roboto Mono','Roboto Slab','Oswald',
  'Bebas Neue','Mukti','Mukta','Mulish','Work Sans','Karla','Quicksand','Rubik','Hind','Inconsolata',
  'Fira Sans','Fira Code','Fira Mono','JetBrains Mono','Source Code Pro','IBM Plex Sans','IBM Plex Serif','IBM Plex Mono','Manrope','DM Sans',
  'DM Serif Display','DM Serif Text','DM Mono','Outfit','Plus Jakarta Sans','Space Grotesk','Space Mono','Sora','Archivo','Archivo Black',
  'Archivo Narrow','Cabin','Comfortaa','Lora','Bitter','Crimson Text','Crimson Pro','Cormorant Garamond','Cormorant','Libre Baskerville',
  'Libre Caslon Text','Libre Franklin','EB Garamond','Spectral','Vollkorn','Bree Serif','Domine','Old Standard TT','Tinos','Cardo',
  'Alegreya','Alegreya Sans','Alegreya SC','Vesper Libre','Yeseva One','Abril Fatface','Lobster','Lobster Two','Pacifico','Dancing Script',
  'Great Vibes','Sacramento','Satisfy','Caveat','Kalam','Indie Flower','Shadows Into Light','Permanent Marker','Marck Script','Cookie',
  'Allura','Parisienne','Berkshire Swash','Tangerine','Pinyon Script','Yellowtail','Kaushan Script','Patrick Hand','Architects Daughter','Gloria Hallelujah',
  'Reenie Beanie','Amatic SC','Special Elite','Cinzel','Cinzel Decorative','Fjalla One','Anton','Russo One','Bowlby One','Bowlby One SC',
  'Squada One','Staatliches','Six Caps','Black Ops One','Faster One','Bungee','Bungee Shade','Monoton','Rubik Mono One','Press Start 2P',
  'VT323','Major Mono Display','Share Tech Mono','Major Tom','Audiowide','Orbitron','Exo','Exo 2','Aldrich','Michroma',
  'Quantico','Iceberg','Ravi Prakash','Saira','Saira Condensed','Saira Stencil One','Stick No Bills','Stardos Stencil','Allerta Stencil','Big Shoulders Display',
  'Big Shoulders Inline Display','Big Shoulders Stencil Display','Big Shoulders Text','Bungee Inline','Bungee Outline','Climate Crisis','Codystar','Combo','Conthrax','Days One',
  'Faustina','Forum','Fraunces','Fredericka the Great','Frijole','Geo','Goblin One','Gravitas One','Gugi','Hanalei',
  'Hanalei Fill','Hubballi','Iceland','Inter Tight','Italianno','Jacques Francois','Josefin Sans','Josefin Slab','Joti One','Jura',
  'Kanit','Kdam Thmor Pro','Khand','Khula','Kiwi Maru','Kufam','Kumbh Sans','Kumar One','Kurale','Lalezar',
  'Lateef','League Gothic','League Script','League Spartan','Lemon','Lemonada','Lexend','Lexend Deca','Lexend Mega','Lexend Zetta',
  'Libre Bodoni','Libre Caslon Display','Libre Heebo','Limelight','Linden Hill','Lisu Bosa','Literata','Loved by the King','Lovers Quarrel','Luckiest Guy',
  'Macondo','Macondo Swash Caps','Mada','Magra','Maitree','Maven Pro','Mate','Mate SC','Material Icons','Maven',
  'Meddon','MedievalSharp','Megrim','Mervale Script','Metal','Metamorphous','Metrophobic','Michroma','Milonga','Miltonian',
  'Mina','Miniver','Miriam Libre','Mirza','Miss Fajardose','Mochiy Pop One','Mochiy Pop P One','Modak','Mogra','Molengo',
  'Molle','Monda','Monoton','Monsieur La Doulaise','Montaga','MonteCarlo','Montez','Montserrat Alternates','Montserrat Subrayada','Moo Lah Lah',
  'Mooli','Moon Dance','Moul','Moulpali','Mountains of Christmas','Mouse Memoirs','Mr Bedfort','Mr Dafoe','Mr De Haviland','Mrs Saint Delafield',
  'Mrs Sheppards','Ms Madi','Mukta','Mulish','Murecho','MuseoModerno','My Soul','Mystery Quest','Nabla','Nanum Brush Script',
  'Nanum Gothic','Nanum Gothic Coding','Nanum Myeongjo','Nanum Pen Script','Neonderthaw','Nerko One','Neucha','Neuton','New Rocker','News Cycle',
  'Newsreader','Niconne','Niramit','Nixie One','Nobile','Nokora','Norican','Nosifer','Notable','Nothing You Could Do',
  'Noticia Text','Numans','Nunito Sans','Nuosu SIL','Odibee Sans','Odor Mean Chey','Offside','Oi','Old Standard TT','Oldenburg',
  'Oleo Script','Oleo Script Swash Caps','Oooh Baby','Open Sans Condensed','Opium','Oranienbaum','Orbit','Orelega One','Original Surfer','Ovo'
];

// ----------- Backwards-compat shims (unused stacks/presets removed) -----------
// Tool-builder removed entirely. No PRESET_TOOLS export.

// ----------- GRAPHICS -----------
// Pre-designed call-out overlays — the polished "Subscribe / Discord /
// Sub to my YT" graphics that feel native to creator videos. Each preset
// is rendered on the canvas as: rounded background + icon + text, with a
// soft shadow for depth. Styles: 'pill' | 'card' | 'badge'.
const GRAPHICS = [
  {id:'g-yt-sub',     name:'Subscribe',          defaultText:'Subscribe',         icon:'youtube',  accent:'#FF0033', bg:'#FFFFFF', fg:'#0A0A0F', style:'pill',  font:'Fraunces', weight:700, duration:3.0},
  {id:'g-like-sub',   name:'Like & Subscribe',   defaultText:'Like & Subscribe',  icon:'thumbs-up',accent:'#FF0033', bg:'#0A0A0F', fg:'#FFFFFF', style:'pill',  font:'Fraunces', weight:700, duration:3.0},
  {id:'g-bell',       name:'Hit the Bell',       defaultText:'Hit the bell',      icon:'bell',     accent:'#0084FF', bg:'#FFFFFF', fg:'#0A0A0F', style:'pill',  font:'Fraunces', weight:700, duration:2.5},
  {id:'g-discord',    name:'Join Discord',       defaultText:'Join my Discord',   icon:'message-circle', accent:'#FFFFFF', bg:'#5865F2', fg:'#FFFFFF', style:'card', font:'Fraunces', weight:700, duration:3.5},
  {id:'g-ig',         name:'Instagram Handle',   defaultText:'@yourhandle',       icon:'instagram',accent:'#FFFFFF', bg:'linear-gradient(135deg,#FF6E40,#D63384,#7B1FA2)', fg:'#FFFFFF', style:'card', font:'Fraunces', weight:700, duration:3.0},
  {id:'g-tiktok',     name:'TikTok Handle',      defaultText:'@yourhandle',       icon:'music',    accent:'#FFFFFF', bg:'#0A0A0F', fg:'#FFFFFF', style:'card', font:'Fraunces', weight:700, duration:3.0},
  {id:'g-x',          name:'X / Twitter Handle', defaultText:'@yourhandle',       icon:'twitter',  accent:'#FFFFFF', bg:'#000000', fg:'#FFFFFF', style:'card', font:'Fraunces', weight:600, duration:3.0},
  {id:'g-github',     name:'GitHub Handle',      defaultText:'github.com/you',    icon:'github',   accent:'#FFFFFF', bg:'#161B22', fg:'#FFFFFF', style:'card', font:'Fraunces', weight:600, duration:3.0},
  {id:'g-link-bio',   name:'Link in Bio',        defaultText:'Link in bio',       icon:'link',     accent:'#0084FF', bg:'rgba(255,255,255,0.92)', fg:'#0A0A0F', style:'pill', font:'Fraunces', weight:700, duration:2.5, glass:true},
  {id:'g-lower-3rd',  name:'Lower Third Name',   defaultText:'Sam Balouch · Pilot', icon:'user', accent:'#0084FF', bg:'rgba(10,10,15,0.7)', fg:'#FFFFFF', style:'card', font:'Fraunces', weight:700, duration:4.0, glass:true},
  {id:'g-tag',        name:'Hashtag Pill',       defaultText:'#trending',         icon:'hash',     accent:'#FFFFFF', bg:'#0084FF', fg:'#FFFFFF', style:'pill', font:'JetBrains Mono', weight:700, duration:3.0},
  {id:'g-ep',         name:'Episode Badge',      defaultText:'EP 01',             icon:'film',     accent:'#FFD60A', bg:'#0A0A0F', fg:'#FFD60A', style:'badge',font:'JetBrains Mono', weight:800, duration:3.0},
  {id:'g-watch-next', name:'Watch Next',         defaultText:'Watch next →',      icon:'play-circle', accent:'#FFFFFF', bg:'rgba(0,132,255,0.92)', fg:'#FFFFFF', style:'pill', font:'Fraunces', weight:700, duration:3.0},
  {id:'g-heart',      name:'Drop a Heart',       defaultText:'Tap the heart',     icon:'heart',    accent:'#FF375F', bg:'#FFFFFF', fg:'#0A0A0F', style:'pill', font:'Fraunces', weight:700, duration:2.5}
];

// 24x24 SVG path data for icons we draw on the canvas via Path2D.
// Stroked outlines (Lucide-style) + a few filled brand shapes.
const GRAPHIC_ICONS = {
  bell:           {kind:'stroke', d:'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.94 1.94 0 0 0 3.4 0'},
  'thumbs-up':    {kind:'stroke', d:'M7 10v12M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H7'},
  heart:          {kind:'stroke', d:'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z'},
  youtube:        {kind:'stroke', d:'M2.5 17a24 24 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.5 49.5 0 0 1 16.2 0 2 2 0 0 1 1.4 1.4 24 24 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.5 49.5 0 0 1-16.2 0A2 2 0 0 1 2.5 17M10 15l5-3-5-3z'},
  instagram:      {kind:'stroke', d:'M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37M17.5 6.5h.01M3 7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v10a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z'},
  music:          {kind:'stroke', d:'M9 18V5l12-2v13M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6M18 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6'},
  twitter:        {kind:'stroke', d:'M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z'},
  github:         {kind:'stroke', d:'M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.4.5-.7 1.1-.8 1.7-.1.6-.1 1.2 0 1.8v4M9 18c-4.5 2-5-2-7-2'},
  link:           {kind:'stroke', d:'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7.1l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7.1l1.7-1.7'},
  user:           {kind:'stroke', d:'M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z'},
  hash:           {kind:'stroke', d:'M4 9h16M4 15h16M10 3 8 21M16 3l-2 18'},
  film:           {kind:'stroke', d:'M2 3h20v18H2z M7 3v18 M17 3v18 M2 12h20 M2 7.5h5 M17 7.5h5 M2 16.5h5 M17 16.5h5'},
  'message-circle':{kind:'stroke', d:'M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z'},
  'play-circle':  {kind:'stroke', d:'M12 22c5.5 0 10-4.5 10-10S17.5 2 12 2 2 6.5 2 12s4.5 10 10 10z M10 8l6 4-6 4z'}
};

window.MASK_TYPES   = MASK_TYPES;
window.EFFECTS      = EFFECTS;
window.LUTS         = LUTS;
window.TRANSITIONS  = TRANSITIONS;
window.TITLES       = TITLES;
window.FONTS        = FONTS;
window.GRAPHICS     = GRAPHICS;
window.GRAPHIC_ICONS= GRAPHIC_ICONS;
