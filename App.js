import React, { useState, useCallback, useRef } from "react";

/* ─── UNIVERSAL DEGREE COLORS ────────────────────────────────────────────────
   Same color = same function, regardless of shape or key.
   b3 and b6 are new — only appear in minor mode.
   ──────────────────────────────────────────────────────────────────────────*/
const DC = {
  1:    "#E53935",  // root         — red
  2:    "#37474F",  // 2nd          — dark grey (passing — subdued)
  3:    "#1E88E5",  // maj 3rd      — blue
  "b3": "#F9A825",  // min 3rd      — amber  (minor only)
  4:    "#37474F",  // 4th          — dark grey (passing — subdued)
  5:    "#43A047",  // 5th          — green
  6:    "#8E24AA",  // maj 6th      — purple
  "b6": "#00838F",  // min 6th      — teal   (minor only)
  7:    "#37474F",  // maj 7th      — dark grey (passing — subdued)
  "b7": "#FB8C00",  // flat 7th     — orange
};

const DEGREE_INFO = {
  1:    { label:"1",   name:"Root",       desc:"Home. Everything resolves here.",              priority:"ROOT"    },
  2:    { label:"2",   name:"2nd",        desc:"Passing — don't land, move through.",           priority:"PASSING" },
  3:    { label:"3",   name:"Maj 3rd",    desc:"Defines major. Most expressive landing.",       priority:"CHORD"   },
  "b3": { label:"b3",  name:"Min 3rd",    desc:"Defines minor. The dark, characteristic note.", priority:"CHORD"   },
  4:    { label:"4",   name:"4th",        desc:"In minor penta. Suspension, resolves to b3.",   priority:"PASSING" },
  5:    { label:"5",   name:"5th",        desc:"Stable power. Safe landing, never wrong.",       priority:"CHORD"   },
  6:    { label:"6",   name:"Maj 6th",    desc:"Dorian brightness. Soulful lift over minor.",   priority:"COLOR"   },
  "b6": { label:"b6",  name:"Min 6th",    desc:"Aeolian darkness. The minor color note.",        priority:"COLOR"   },
  7:    { label:"7",   name:"Maj 7th",    desc:"Half step below root. Wants to resolve up.",     priority:"PASSING" },
  "b7": { label:"b7",  name:"Flat 7th",   desc:"Rock note. In natural minor scale. Mixolydian in major.", priority:"MIXO" },
};

/* ─── SCALE-AWARE FILTER GROUPS ──────────────────────────────────────────────
   Each scale has its own filter set. Pentatonic = one-tap preset per scale.
   Major penta:  1 · 2 · 3 · 5 · 6
   Minor penta:  1 · b3 · 4 · 5 · b7
   ──────────────────────────────────────────────────────────────────────────*/
const FILTER_GROUPS = {
  major: [
    { key:"ROOT",    label:"Root",    color:"#E53935", degrees:[1],        penta:true  },
    { key:"CHORD",   label:"3 & 5",   color:"#1E88E5", degrees:[3,5],      penta:true  },
    { key:"TWO",     label:"2",       color:"#546E7A", degrees:[2],        penta:true  },
    { key:"COLOR",   label:"6",       color:"#8E24AA", degrees:[6],        penta:true  },
    { key:"MIXO",    label:"b7",      color:"#FB8C00", degrees:["b7"],     penta:false },
    { key:"PASSING", label:"4 & 7",   color:"#546E7A", degrees:[4,7],      penta:false },
  ],
  minor: [
    { key:"ROOT",    label:"Root",    color:"#E53935", degrees:[1],        penta:true  },
    { key:"CHORD",   label:"b3 & 5",  color:"#F9A825", degrees:["b3",5],   penta:true  },
    { key:"FOUR",    label:"4",       color:"#546E7A", degrees:[4],        penta:true  },
    { key:"B7",      label:"b7",      color:"#FB8C00", degrees:["b7"],     penta:true  },
    { key:"COLOR",   label:"b6",      color:"#00838F", degrees:["b6"],     penta:false },
    { key:"PASSING", label:"Passing", color:"#546E7A", degrees:[2],        penta:false },
  ],
};

function getActiveFilterGroups(scaleMode) {
  return FILTER_GROUPS[scaleMode];
}

function isDegreeVisible(degree, activeFilters, scaleMode) {
  const groups = getActiveFilterGroups(scaleMode);
  for (const key of activeFilters) {
    const g = groups.find(f => f.key === key);
    if (g && g.degrees.includes(degree)) return true;
  }
  return false;
}

function allFilterKeys(scaleMode) {
  return new Set(getActiveFilterGroups(scaleMode).map(g => g.key));
}

/* ─── SHAPE COLORS — buttons and fret-range backgrounds only ─────────────────*/
const SHAPE_COLOR = { E:"#C62828", D:"#E65100", C:"#2E7D32", A:"#1565C0", G:"#6A1B9A" };
const SHAPE_ACCENT = "#00BCD4";  // single bright teal — all shape buttons share this
const SHAPE_ORDER = ["C","A","G","E","D"];

/* ─── SHAPES BASE — defined in G major, verified ────────────────────────────*/
const SHAPES_BASE = {
  E: { name:"E Shape", color:SHAPE_COLOR.E, anchorFret:3,
    notes:[
      {s:6,f:3,d:1},{s:6,f:5,d:2},
      {s:5,f:2,d:3},{s:5,f:3,d:4},{s:5,f:5,d:5},
      {s:4,f:2,d:6},{s:4,f:3,d:"b7"},{s:4,f:4,d:7},{s:4,f:5,d:1},
      {s:3,f:2,d:2},{s:3,f:4,d:3},{s:3,f:5,d:4},
      {s:2,f:3,d:5},{s:2,f:5,d:6},
      {s:1,f:2,d:7},{s:1,f:3,d:1},{s:1,f:5,d:2},
    ]},
  D: { name:"D Shape", color:SHAPE_COLOR.D, anchorFret:5,
    notes:[
      {s:6,f:5,d:2},{s:6,f:7,d:3},{s:6,f:8,d:4},
      {s:5,f:5,d:5},{s:5,f:7,d:6},{s:5,f:8,d:"b7"},
      {s:4,f:5,d:1},{s:4,f:7,d:2},
      {s:3,f:4,d:3},{s:3,f:5,d:4},{s:3,f:7,d:5},
      {s:2,f:5,d:6},{s:2,f:6,d:"b7"},{s:2,f:7,d:7},{s:2,f:8,d:1},
      {s:1,f:5,d:2},{s:1,f:7,d:3},{s:1,f:8,d:4},
    ]},
  C: { name:"C Shape", color:SHAPE_COLOR.C, anchorFret:10,
    notes:[
      {s:6,f:7,d:3},{s:6,f:8,d:4},{s:6,f:10,d:5},
      {s:5,f:7,d:6},{s:5,f:8,d:"b7"},{s:5,f:9,d:7},{s:5,f:10,d:1},
      {s:4,f:7,d:2},{s:4,f:9,d:3},{s:4,f:10,d:4},
      {s:3,f:7,d:5},{s:3,f:9,d:6},{s:3,f:10,d:"b7"},
      {s:2,f:8,d:1},{s:2,f:10,d:2},
      {s:1,f:7,d:3},{s:1,f:8,d:4},{s:1,f:10,d:5},
    ]},
  A: { name:"A Shape", color:SHAPE_COLOR.A, anchorFret:10,
    notes:[
      {s:6,f:10,d:5},{s:6,f:12,d:6},
      {s:5,f:10,d:1},{s:5,f:12,d:2},
      {s:4,f:9,d:3},{s:4,f:10,d:4},{s:4,f:12,d:5},
      {s:3,f:9,d:6},{s:3,f:10,d:"b7"},{s:3,f:11,d:7},{s:3,f:12,d:1},
      {s:2,f:10,d:2},{s:2,f:12,d:3},
      {s:1,f:10,d:5},{s:1,f:12,d:6},
    ]},
  G: { name:"G Shape", color:SHAPE_COLOR.G, anchorFret:15,
    notes:[
      {s:6,f:12,d:6},{s:6,f:13,d:"b7"},{s:6,f:14,d:7},{s:6,f:15,d:1},
      {s:5,f:12,d:2},{s:5,f:14,d:3},{s:5,f:15,d:4},
      {s:4,f:12,d:5},{s:4,f:14,d:6},{s:4,f:15,d:"b7"},
      {s:3,f:12,d:1},{s:3,f:14,d:2},
      {s:2,f:12,d:3},{s:2,f:13,d:4},{s:2,f:15,d:5},
      {s:1,f:12,d:6},{s:1,f:13,d:"b7"},{s:1,f:14,d:7},{s:1,f:15,d:1},
    ]},
};

/* ─── KEY SYSTEM ─────────────────────────────────────────────────────────────*/
const CHROMATIC    = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
const ROOT_OPTIONS = [
  {value:"C",  label:"C"},          {value:"C#", label:"C# / Db"},
  {value:"D",  label:"D"},          {value:"D#", label:"D# / Eb"},
  {value:"E",  label:"E"},          {value:"F",  label:"F"},
  {value:"F#", label:"F# / Gb"},    {value:"G",  label:"G"},
  {value:"G#", label:"G# / Ab"},    {value:"A",  label:"A"},
  {value:"A#", label:"A# / Bb"},    {value:"B",  label:"B"},
];
const G_IDX = CHROMATIC.indexOf("G");

function getRootOffset(root) {
  const idx = CHROMATIC.indexOf(root);
  let off = idx - G_IDX;
  if (off > 6)  off -= 12;
  if (off < -6) off += 12;
  return off;
}

function getMajorScale(root) {
  const idx = CHROMATIC.indexOf(root);
  return [0,2,4,5,7,9,11].map(s => CHROMATIC[(idx+s)%12]);
}

function getNaturalMinorScale(root) {
  const idx = CHROMATIC.indexOf(root);
  return [0,2,3,5,7,8,10].map(s => CHROMATIC[(idx+s)%12]);
}

function getScaleNotes(root, scaleMode) {
  return scaleMode === 'major' ? getMajorScale(root) : getNaturalMinorScale(root);
}

// Degree labels per scale position for the header strip
const MAJOR_DEGREE_LABELS = ["1","2","3","4","5","6","7"];
const MINOR_DEGREE_LABELS = ["1","2","b3","4","5","b6","b7"];

/* ─── LAYOUT ─────────────────────────────────────────────────────────────────*/
const CELL_W    = 50;
const CELL_H    = 46;
const OPEN_W    = 44;
const LEFT      = 44;
const TOP       = 42;
const S_COUNT   = 6;
const FRET_MAX  = 24;
const NUT_X     = LEFT + OPEN_W;
const SVG_W     = NUT_X + FRET_MAX * CELL_W + 14;
const SVG_H     = TOP + S_COUNT * CELL_H + 40;  // extra space for bottom fret numbers
const STR_LABELS = ["e","B","G","D","A","E"];
const OCTAVE_SHIFTS = [-12, 0, 12, 24];

function noteX(fret) {
  if (fret === 0) return NUT_X - OPEN_W / 2;
  return NUT_X + fret * CELL_W - CELL_W / 2;
}
function noteY(string) {
  return TOP + (string - 1) * CELL_H + CELL_H / 2;
}

/* ─── POSITION MAP ───────────────────────────────────────────────────────────
   scaleMode='minor': degree 3 → b3 (fret-1), degree 6 → b6 (fret-1),
                      degree 7 skipped (not in natural minor).
   Every shape rendered at all valid octave positions across 0–24.
   ──────────────────────────────────────────────────────────────────────────*/
function buildPositionMap(activeShapes, offset, scaleMode) {
  const map = {};
  for (const key of activeShapes) {
    for (const n of SHAPES_BASE[key].notes) {
      let degree    = n.d;
      let fretDelta = 0;

      if (scaleMode === 'minor') {
        if (degree === 3)  { degree = "b3"; fretDelta = -1; }
        else if (degree === 6)  { degree = "b6"; fretDelta = -1; }
        else if (degree === 7)  { continue; } // not in natural minor
        // 1, 2, 4, 5, b7 stay as-is; b7 is in-scale for minor
      }

      for (const shift of OCTAVE_SHIFTS) {
        const f = n.f + fretDelta + offset + shift;
        if (f < 0 || f > FRET_MAX) continue;
        const pos = `${n.s}-${f}`;
        if (!map[pos]) map[pos] = { s:n.s, f, degree, shapeKeys:[] };
        if (!map[pos].shapeKeys.includes(key)) map[pos].shapeKeys.push(key);
      }
    }
  }
  return map;
}

/* buildShapeRanges — returns the BASE position range only (octave shift = 0).
   This is what goes on the shape buttons: the primary fret cluster, not the
   full 0–24 span which would be misleading (e.g. E shape f2–17 is wrong). */
function buildShapeRanges(offset, scaleMode) {
  return Object.fromEntries(
    SHAPE_ORDER.map(k => {
      const ns = [];
      for (const n of SHAPES_BASE[k].notes) {
        let fDelta = 0;
        if (scaleMode === 'minor') {
          if (n.d === 3) fDelta = -1;
          else if (n.d === 6) fDelta = -1;
          else if (n.d === 7) continue;
        }
        // Only shift=0: the primary/base position for this key
        const f = n.f + fDelta + offset;
        if (f >= 0 && f <= FRET_MAX) ns.push(f);
      }
      return [k, ns.length ? [Math.min(...ns), Math.max(...ns)] : null];
    })
  );
}

/* ─── PIE DOT ────────────────────────────────────────────────────────────────*/
function PieDot({ cx, cy, r, degColor, label, isRoot, isHov, onEnter, onLeave }) {
  return (
    <g onMouseEnter={onEnter} onMouseLeave={onLeave} style={{cursor:"pointer"}}>
      {isHov && <circle cx={cx} cy={cy} r={r+5} fill={degColor} opacity={0.2}/>}
      <circle cx={cx} cy={cy} r={r} fill={degColor}
        stroke={isRoot?"rgba(255,255,255,0.35)":"none"}
        strokeWidth={isRoot?2:0}
      />
      <text x={cx} y={cy+4} textAnchor="middle"
        fontSize={r>12?11:10} fontWeight="bold" fill="white"
        fontFamily="Georgia,serif" style={{pointerEvents:"none"}}>
        {label}
      </text>
    </g>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────────────*/
export default function CAGEDMap() {
  const [scaleMode,     setScaleMode]     = useState("major");
  const [activeShapes,  setActiveShapes]  = useState(new Set(["E"]));
  const [rootNote,      setRootNote]      = useState("G");
  const [activeFilters, setActiveFilters] = useState(() => allFilterKeys("major"));
  const [hovered,       setHovered]       = useState(null);
  const fretboardRef = useRef(null);

  const offset    = getRootOffset(rootNote);
  const scaleNotes = getScaleNotes(rootNote, scaleMode);
  const degLabels  = scaleMode === 'major' ? MAJOR_DEGREE_LABELS : MINOR_DEGREE_LABELS;
  const activeArr  = SHAPE_ORDER.filter(k => activeShapes.has(k));
  const filterGroups = getActiveFilterGroups(scaleMode);

  /* switch scale mode — reset filters so no stale major/minor degrees linger */
  const switchScaleMode = (mode) => {
    setScaleMode(mode);
    setActiveFilters(allFilterKeys(mode));
    setHovered(null);
  };

  /* shape toggles */
  const toggleShape = useCallback((key) => {
    setActiveShapes(prev => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size===1) return prev; next.delete(key); }
      else next.add(key);
      return next;
    });
    setHovered(null);
  }, []);
  const soloShape = (key) => { setActiveShapes(new Set([key])); setHovered(null); };
  const selectAll  = ()    => { setActiveShapes(new Set(SHAPE_ORDER)); setHovered(null); };

  /* filter toggles — also clear hover so stale position doesn't persist */
  const toggleFilter = (key) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
    setHovered(null);
  };

  /* pentatonic preset — show only penta degrees; tap again to restore full scale */
  const activatePentatonic = () => {
    const pentaKeys = filterGroups.filter(g => g.penta).map(g => g.key);
    if (isPentaActive) {
      setActiveFilters(allFilterKeys(scaleMode)); // restore full scale
    } else {
      setActiveFilters(new Set(pentaKeys));       // narrow to pentatonic
    }
    setHovered(null);
  };

  const pentaDegrees = filterGroups.filter(g => g.penta).flatMap(g => g.degrees);
  const isPentaActive = pentaDegrees.length > 0 &&
    activeFilters.size === filterGroups.filter(g=>g.penta).length &&
    filterGroups.filter(g=>g.penta).every(g => activeFilters.has(g.key));

  const posMap    = buildPositionMap(activeArr, offset, scaleMode);
  const positions = Object.values(posMap).filter(p => isDegreeVisible(p.degree, activeFilters, scaleMode));
  const shapeRanges = buildShapeRanges(offset, scaleMode);
  const hovEntry  = hovered ? positions.find(p => p.s===hovered.s && p.f===hovered.f) : null;

  const scrollToFret = (fret) => {
    if (!fretboardRef.current) return;
    fretboardRef.current.scrollLeft = Math.max(0, NUT_X + fret * CELL_W - 60);
  };

  /* active filter label string for note counter */
  const allOn = activeFilters.size === allFilterKeys(scaleMode).size;
  const activeFilterLabels = filterGroups.filter(g => activeFilters.has(g.key)).map(g => g.label);

  return (
    <div style={{minHeight:"100vh", background:"#0C0C14", color:"#D8D0C4", fontFamily:"'Georgia',serif"}}>

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <div style={{
        background:"linear-gradient(160deg,#111128 0%,#1A1A3A 100%)",
        borderBottom:"1px solid #22223A", padding:"16px 24px 14px",
      }}>
        <div style={{maxWidth:1080, margin:"0 auto"}}>

          {/* Title + scale mode toggle */}
          <div style={{display:"flex", alignItems:"center", gap:16, flexWrap:"wrap", marginBottom:10}}>
            <h1 style={{margin:0, fontSize:21, fontWeight:"bold", color:"#EEE8D8", letterSpacing:"0.07em"}}>
              CAGED FRETBOARD MAP
            </h1>

            {/* ── MAJOR / MINOR TOGGLE — prominent pill ── */}
            <div style={{
              display:"flex", borderRadius:8, overflow:"hidden",
              border:"1px solid #33334A", flexShrink:0,
            }}>
              {["major","minor"].map(mode => {
                const on = scaleMode === mode;
                const accent = mode === 'major' ? "#1E88E5" : "#F9A825";
                return (
                  <button key={mode} onClick={() => switchScaleMode(mode)} style={{
                    padding:"7px 18px",
                    background: on ? accent : "#111128",
                    color: on ? "#fff" : "#445566",
                    border:"none", cursor:"pointer",
                    fontSize:13, fontWeight:"bold",
                    fontFamily:"Georgia,serif",
                    letterSpacing:"0.06em",
                    transition:"all 0.15s",
                    textTransform:"capitalize",
                  }}>
                    {mode}
                  </button>
                );
              })}
            </div>

            <span style={{fontSize:11, color:"#445566", fontStyle:"italic"}}>
              Key of {rootNote} {scaleMode === 'major' ? 'Major' : 'Natural Minor'}
            </span>
          </div>


        </div>
      </div>

      <div style={{maxWidth:1080, margin:"0 auto", padding:"14px 24px"}}>

        {/* ── ROOT SELECTOR ── */}
        <div style={{display:"flex", alignItems:"center", gap:12, marginBottom:14, flexWrap:"wrap"}}>
          <label style={{fontSize:10, color:"#445566", textTransform:"uppercase", letterSpacing:"0.12em"}}>
            Key / Root
          </label>
          <div style={{position:"relative"}}>
            <select value={rootNote} onChange={e => { setRootNote(e.target.value); setHovered(null); }}
              style={{
                appearance:"none", background:"#1A1A30", border:"1px solid #33334A",
                borderRadius:5, color:"#EEE8D8", fontSize:14,
                fontFamily:"Georgia,serif", fontWeight:"bold",
                padding:"7px 36px 7px 14px", cursor:"pointer", outline:"none", minWidth:140,
              }}>
              {ROOT_OPTIONS.map(o => (<option key={o.value} value={o.value}>{o.label} {scaleMode}</option>))}
            </select>
            <div style={{position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", color:"#6677AA", fontSize:10}}>▼</div>
          </div>
          <div style={{padding:"5px 12px", borderRadius:12, background:DC[1]+"22", border:`1px solid ${DC[1]}44`}}>
            <span style={{fontSize:11, color:DC[1], fontWeight:"bold"}}>{rootNote}</span>
            <span style={{fontSize:11, color:"#8899AA"}}> = root</span>
          </div>
        </div>

        {/* ── SHAPE SELECTOR ── */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:10, color:"#445566", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:8}}>
            Shapes &nbsp;·&nbsp;
            <span style={{color:"#334455", fontStyle:"italic", textTransform:"none", letterSpacing:0, fontSize:10}}>
              click = toggle · shift+click = solo
            </span>
          </div>
          <div style={{display:"flex", gap:6, flexWrap:"wrap", alignItems:"center"}}>
            {SHAPE_ORDER.map(key => {
              const on  = activeShapes.has(key);
              const rng = shapeRanges[key];
              const lbl = rng ? `f${rng[0]}–${rng[1]}` : "off-neck";
              return (
                <button key={key} onClick={e => e.shiftKey ? soloShape(key) : toggleShape(key)}
                  style={{
                    padding:"6px 0", width:62, borderRadius:5,
                    border: on ? `2px solid ${SHAPE_ACCENT}` : "1px solid #2A2A3A",
                    background: "#111128",
                    color: on ? SHAPE_ACCENT : "#334455",
                    fontSize:13, fontWeight:"bold", cursor:"pointer",
                    fontFamily:"Georgia,serif", transition:"all 0.14s",
                  }}>
                  {key}
                  <div style={{fontSize:9, color:on?"rgba(0,188,212,0.6)":"#334455", fontWeight:"normal", marginTop:1}}>{lbl}</div>
                </button>
              );
            })}
            <div style={{width:1, height:30, background:"#22223A", margin:"0 3px"}}/>
            <button onClick={selectAll} style={{padding:"6px 11px", borderRadius:5, border:"1px solid #22223A", background:"#111128", color:"#8899BB", fontSize:11, cursor:"pointer", fontFamily:"Georgia,serif"}}>All 5</button>
            {SHAPE_ORDER.map(k => (
              <button key={k} onClick={() => soloShape(k)} style={{padding:"4px 8px", borderRadius:4, border:"1px solid #1A1A2E", background:"#111128", color:"#445566", fontSize:10, cursor:"pointer", fontFamily:"Georgia,serif"}}>Solo {k}</button>
            ))}
          </div>
          {activeArr.length > 1 && (
            <div style={{marginTop:6}}>
              <span style={{fontSize:9, color:"#334455", fontStyle:"italic"}}>Shift+click a button to solo that shape</span>
            </div>
          )}
        </div>

        {/* ── FILTER BUTTONS ── */}
        <div style={{marginBottom:14}}>
          <div style={{fontSize:10, color:"#445566", textTransform:"uppercase", letterSpacing:"0.12em", marginBottom:8}}>
            Show &nbsp;·&nbsp;
            <span style={{color:"#334455", fontStyle:"italic", textTransform:"none", letterSpacing:0, fontSize:10}}>
              all on by default · tap to remove degree groups
            </span>
          </div>
          <div style={{display:"flex", gap:6, flexWrap:"wrap", alignItems:"center"}}>

            {/* Pentatonic preset */}
            <button onClick={activatePentatonic} style={{
              display:"flex", alignItems:"center", gap:7,
              padding:"6px 13px", borderRadius:5,
              border: isPentaActive ? `2px solid #AABBCC` : "1px solid #33334A",
              background: isPentaActive ? "#AABBCC22" : "#1A1A2E",
              color: isPentaActive ? "#CCDDEE" : "#6677AA",
              fontSize:12, cursor:"pointer", fontFamily:"Georgia,serif",
              transition:"all 0.13s",
              boxShadow: isPentaActive ? `0 0 10px #AABBCC33` : "none",
            }}>
              <div style={{width:10, height:10, borderRadius:"50%", background: isPentaActive?"#CCDDEE":"#445566", flexShrink:0}}/>
              Pentatonic
            </button>

            <div style={{width:1, height:24, background:"#22223A"}}/>

            {/* Individual degree filters */}
            {filterGroups.map(g => {
              const on = activeFilters.has(g.key);
              return (
                <button key={g.key} onClick={() => toggleFilter(g.key)} style={{
                  display:"flex", alignItems:"center", gap:7,
                  padding:"6px 13px", borderRadius:5,
                  border: on ? `2px solid ${g.color}` : "1px solid #22223A",
                  background: on ? g.color+"22" : "#111128",
                  color: on ? g.color : "#556677",
                  fontSize:12, cursor:"pointer", fontFamily:"Georgia,serif",
                  transition:"all 0.13s",
                  boxShadow: on ? `0 0 10px ${g.color}33` : "none",
                }}>
                  <div style={{width:10, height:10, borderRadius:"50%", background:on?g.color:"#334455", flexShrink:0}}/>
                  {g.label}
                </button>
              );
            })}

            {!allOn && (
              <>
                <div style={{width:1, height:24, background:"#22223A", margin:"0 2px"}}/>
                <button onClick={() => { setActiveFilters(allFilterKeys(scaleMode)); setHovered(null); }} style={{padding:"5px 11px", borderRadius:5, border:"1px solid #33445A", background:"#111128", color:"#7799BB", fontSize:11, cursor:"pointer", fontFamily:"Georgia,serif"}}>Full scale</button>
              </>
            )}
            <span style={{marginLeft:"auto", fontSize:10, color:"#334455"}}>
              {positions.length} note{positions.length!==1?"s":""} visible
              {!allOn && <span style={{color:"#445566"}}> · {activeFilterLabels.join(" + ")}</span>}
            </span>
          </div>
        </div>

        {/* ── HOVER DETAIL ── */}
        <div style={{
          minHeight:50, marginBottom:12,
          background: hovEntry?"#111128":"transparent",
          border: hovEntry?"1px solid #33334A":"1px solid transparent",
          borderRadius:5, padding: hovEntry?"9px 14px":"0",
          display:"flex", alignItems:"center", gap:12,
          transition:"all 0.14s",
        }}>
          {hovEntry ? (() => {
            const deg = DEGREE_INFO[hovEntry.degree];
            const dc  = DC[hovEntry.degree];
            if (!deg) return null;
            return (
              <>
                <div style={{width:36, height:36, borderRadius:"50%", flexShrink:0, background:dc, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:"bold", color:"white"}}>{deg.label}</div>
                <div style={{flex:1}}>
                  <div style={{display:"flex", alignItems:"center", gap:7, marginBottom:2}}>
                    <span style={{fontSize:13, fontWeight:"bold", color:"#EEE8D8"}}>{deg.name}</span>
                    <span style={{fontSize:9, padding:"1px 7px", borderRadius:8, background:dc+"28", color:dc, border:`1px solid ${dc}44`, textTransform:"uppercase", letterSpacing:"0.1em"}}>{deg.priority}</span>
                  </div>
                  <div style={{fontSize:11, color:"#7788AA"}}>{deg.desc}</div>
                </div>
                <div style={{textAlign:"right", flexShrink:0}}>
                  <div style={{fontSize:11, color:"#C0B8A8", marginBottom:4}}>
                    String {hovEntry.s} ({STR_LABELS[hovEntry.s-1]}) · {hovEntry.f===0?"Open":"Fret "+hovEntry.f}
                  </div>
                  <div style={{display:"flex", gap:4, justifyContent:"flex-end", flexWrap:"wrap"}}>
                    {hovEntry.shapeKeys.map(k => (
                      <span key={k} style={{fontSize:9, padding:"1px 7px", borderRadius:8, background:"#1A1A2E", color:"#8899AA", border:"1px solid #33334A", fontWeight:"bold"}}>{SHAPES_BASE[k].name}</span>
                    ))}
                  </div>
                </div>
              </>
            );
          })() : (
            <div style={{fontSize:11, color:"#334455", fontStyle:"italic", padding:"0 4px"}}>
              Hover any dot → degree name, string, fret, shape membership
            </div>
          )}
        </div>

        {/* ── VIEWPORT JUMP ── */}
        <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:8, flexWrap:"wrap"}}>
          <span style={{fontSize:10, color:"#445566", textTransform:"uppercase", letterSpacing:"0.12em"}}>Jump to:</span>
          {[
            {label:"Open (0–8)",   fret:0},
            {label:"5th pos (5–13)", fret:5},
            {label:"12th fret (12–20)", fret:12},
          ].map(({label,fret}) => (
            <button key={fret} onClick={() => scrollToFret(fret)} style={{
              padding:"4px 11px", borderRadius:5, border:"1px solid #22223A",
              background:"#111128", color:"#7788AA", fontSize:11, cursor:"pointer",
              fontFamily:"Georgia,serif",
            }}>{label}</button>
          ))}
          <span style={{fontSize:10, color:"#334455", fontStyle:"italic", marginLeft:4}}>
            Each shape appears at every octave — frets 0–24
          </span>
        </div>

        {/* ── FRETBOARD ── */}
        <div ref={fretboardRef} style={{
          background:"#0F0F20", border:"1px solid #22223A",
          borderRadius:8, padding:"10px 6px",
          overflowX:"auto", marginBottom:18,
        }}>
          <svg width={SVG_W} height={SVG_H} style={{display:"block"}}>

            {/* OPEN label top + bottom */}
            <text x={NUT_X-OPEN_W/2} y={TOP-10} textAnchor="middle" fontSize={9} fill="#445566" fontFamily="Georgia,serif">OPEN</text>
            <text x={NUT_X-OPEN_W/2} y={TOP+S_COUNT*CELL_H+18} textAnchor="middle" fontSize={9} fill="#445566" fontFamily="Georgia,serif">OPEN</text>

            {/* Fret numbers — ALL frets, top AND bottom */}
            {Array.from({length:FRET_MAX},(_,i) => {
              const f=i+1;
              const dbl=[12,24].includes(f);
              const inlay=[3,5,7,9,12,15,17,19,21,24].includes(f);
              const clr=dbl?"#AABBCC":inlay?"#7788AA":"#556677";
              const wt=dbl?"bold":"normal";
              const x=NUT_X+f*CELL_W-CELL_W/2;
              return (
                <g key={f}>
                  <text x={x} y={TOP-10} textAnchor="middle" fontSize={9} fill={clr} fontWeight={wt} fontFamily="Georgia,serif">{f}</text>
                  <text x={x} y={TOP+S_COUNT*CELL_H+18} textAnchor="middle" fontSize={9} fill={clr} fontWeight={wt} fontFamily="Georgia,serif">{f}</text>
                </g>
              );
            })}

            {[3,5,7,9,15,17,19,21].map(f => (
              <circle key={f} cx={NUT_X+f*CELL_W-CELL_W/2} cy={TOP+S_COUNT*CELL_H/2} r={3} fill="#1A1A2E"/>
            ))}
            {[12,24].map(f => (
              <g key={f}>
                <circle cx={NUT_X+f*CELL_W-CELL_W/2} cy={TOP+CELL_H*1.5} r={3} fill="#252540"/>
                <circle cx={NUT_X+f*CELL_W-CELL_W/2} cy={TOP+CELL_H*4.5} r={3} fill="#252540"/>
              </g>
            ))}

            <line x1={NUT_X+12*CELL_W} y1={TOP} x2={NUT_X+12*CELL_W} y2={TOP+S_COUNT*CELL_H} stroke="#2A2A50" strokeWidth={2}/>

            {Array.from({length:FRET_MAX},(_,i) => {
              const f=i+1;
              return <line key={f} x1={NUT_X+f*CELL_W} y1={TOP} x2={NUT_X+f*CELL_W} y2={TOP+S_COUNT*CELL_H} stroke="#1E1E32" strokeWidth={1}/>;
            })}

            <line x1={NUT_X} y1={TOP} x2={NUT_X} y2={TOP+S_COUNT*CELL_H} stroke="#7788AA" strokeWidth={3.5}/>
            <line x1={LEFT} y1={TOP} x2={LEFT} y2={TOP+S_COUNT*CELL_H} stroke="#22223A" strokeWidth={1}/>

            {/* Shape background bands removed — degree colors carry all information */}

            {STR_LABELS.map((lbl,i) => (
              <g key={i}>
                <text x={LEFT-7} y={noteY(i+1)+4} textAnchor="end" fontSize={10} fontStyle="italic" fill="#445566" fontFamily="Georgia,serif">{lbl}</text>
                <line x1={LEFT} y1={noteY(i+1)} x2={NUT_X+FRET_MAX*CELL_W} y2={noteY(i+1)} stroke="#1E1E32" strokeWidth={i===0||i===5?1.8:1.1}/>
              </g>
            ))}

            {positions.map(({s,f,degree,shapeKeys}) => {
              const deg=DEGREE_INFO[degree];
              if (!deg) return null;
              const cx=noteX(f), cy=noteY(s), dc=DC[degree];
              const r=degree===1?14:11;
              const isHov=hovered?.s===s&&hovered?.f===f;
              return (
                <PieDot key={`${s}-${f}`}
                  cx={cx} cy={cy} r={r}
                  degColor={dc}
                  label={deg.label}
                  isRoot={degree===1}
                  isHov={isHov}
                  onEnter={()=>setHovered({s,f})}
                  onLeave={()=>setHovered(null)}
                />
              );
            })}
          </svg>
        </div>

        {/* ── COMPACT LEGEND ── */}
        <div style={{
          display:"flex", gap:14, flexWrap:"wrap", alignItems:"center",
          padding:"10px 14px", background:"#111128",
          borderRadius:6, border:"1px solid #22223A", marginBottom:8,
        }}>
          <span style={{fontSize:10, color:"#445566", textTransform:"uppercase", letterSpacing:"0.1em", flexShrink:0}}>
            Degree colors:
          </span>
          {Object.entries(DC).map(([key, color]) => {
            const info = DEGREE_INFO[key];
            if (!info) return null;
            // In major mode, hide b3/b6. In minor mode, hide 3/6/7.
            if (scaleMode==='major' && (key==="b3"||key==="b6")) return null;
            if (scaleMode==='minor' && (key==="3"||key==="6"||key==="7")) return null;
            return (
              <div key={key} style={{display:"flex", alignItems:"center", gap:5}}>
                <div style={{width:20, height:20, borderRadius:"50%", background:color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:"bold", color:"white", flexShrink:0}}>{info.label}</div>
                <span style={{fontSize:10, color:"#778899"}}>{info.name}</span>
              </div>
            );
          })}
          <span style={{fontSize:10, color:"#334455", fontStyle:"italic", marginLeft:"auto"}}>
            Numbers = scale degrees from root · universal across all shapes & keys
          </span>
        </div>



      </div>
    </div>
  );
}
