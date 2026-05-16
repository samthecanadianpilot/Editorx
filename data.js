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

const TITLES = [
  {id:'simple',  name:'Simple Title', defaultText:'Title',           color:'#FFFFFF', duration:3, scale:1.6, font:'Inter',          weight:800, icon:'type'},
  {id:'lower',   name:'Lower Third',  defaultText:'Speaker Name',    color:'#FFFFFF', duration:4, scale:1.0, font:'Inter',          weight:600, icon:'baseline'},
  {id:'callout', name:'Callout',      defaultText:'CALLOUT',         color:'#FFD60A', duration:2.5,scale:1.2,font:'Bebas Neue',     weight:400, icon:'megaphone'},
  {id:'sub',     name:'Subtitle',     defaultText:'Subtitle text',   color:'#EFEFEF', duration:3, scale:0.9, font:'Inter',          weight:500, icon:'captions'},
  {id:'credits', name:'Credits',      defaultText:'Directed By',     color:'#EFEFEF', duration:5, scale:1.1, font:'Playfair Display',weight:700,icon:'film'},
  {id:'banner',  name:'News Banner',  defaultText:'BREAKING NEWS',   color:'#FF375F', duration:4, scale:1.3, font:'Oswald',         weight:700, icon:'rss'},
  {id:'bigQuote',name:'Big Quote',    defaultText:'"All you need..."',color:'#FFFFFF',duration:5, scale:1.4, font:'Playfair Display',weight:900,icon:'quote'},
  {id:'tag',     name:'Tag Pill',     defaultText:'#tag',            color:'#0A7FF5', duration:3, scale:0.8, font:'JetBrains Mono', weight:700, icon:'hash'}
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

window.MASK_TYPES = MASK_TYPES;
window.EFFECTS    = EFFECTS;
window.LUTS       = LUTS;
window.TRANSITIONS= TRANSITIONS;
window.TITLES     = TITLES;
window.FONTS      = FONTS;
