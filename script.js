"use strict";
const NS = "http://www.w3.org/2000/svg";
const HX = "0123456789abcdef";
const rHex = (n) => {
  let s = "";
  for (let i = 0; i < n; i++) s += HX[Math.floor(Math.random() * 16)];
  return s;
};
const genId = () => rHex(7);
const genCid = () => {
  const v = "aeiou",
    k = "bcdfghjklmnprstvwxyz",
    r = () => Math.floor(Math.random() * k.length),
    rv = () => Math.floor(Math.random() * v.length);
  return (
    k[r()] + v[rv()] + k[r()] + v[rv()] + k[r()] + v[rv()] + k[r()] + v[rv()]
  );
};
const MSGS = [
  "add homepage",
  "fix nav bug",
  "add dark mode",
  "update styles",
  "add auth",
  "setup db",
  "write tests",
  "refactor api",
  "add caching",
  "fix mobile",
  "add logging",
  "seed data",
  "update deps",
  "fix typo",
  "add docs",
  "init layout",
  "add footer",
  "fix routing",
  "cleanup css",
  "add icons",
  "improve perf",
  "remove dead code",
  "add search",
  "setup analytics",
  "improve a11y",
];
let msgIdx = 0;
const nm = () => MSGS[msgIdx++ % MSGS.length];
const LS = ["#9a9280", "#b06848", "#5878a8", "#508860", "#8068b8", "#a89030"];
const LF = ["#f2ede4", "#fce8e0", "#e8eef6", "#eaf3e6", "#f2eef8", "#fdf4e0"];
const LD = ["#6a6058", "#884828", "#385888", "#306848", "#604890", "#887018"];

// ── STATE ─────────────────────────────────────────────────────────────────
function makeFreshState() {
  msgIdx = 0;
  return {
    commits: [],
    bookmarks: {},
    wcId: null,
    opLog: [],
    mode: "none",
    branch: "HEAD",
    branchLanes: {},
    nextLane: 1,
  };
}
let STATE = makeFreshState();
function makeRoot() {
  const rId = genId(),
    wId = genId();
  STATE.commits = [
    {
      id: rId,
      cid: genCid(),
      msg: "root()",
      parents: [],
      isRoot: true,
      isEmpty: false,
      time: "–",
      lane: 0,
    },
    {
      id: wId,
      cid: genCid(),
      msg: "(empty)",
      parents: [rId],
      isRoot: false,
      isEmpty: true,
      time: "just now",
      lane: 0,
    },
  ];
  STATE.wcId = wId;
}
function addC(msg, parent, lane = 0, time = "3 days ago") {
  const id = genId(),
    cid = genCid();
  STATE.commits.push({
    id,
    cid,
    msg,
    parents: Array.isArray(parent) ? parent : [parent],
    isRoot: false,
    isEmpty: false,
    time,
    lane,
  });
  return id;
}
const SCENARIOS = {
  linear() {
    STATE = makeFreshState();
    STATE.mode = "both";
    makeRoot();
    let c = STATE.commits[1].id;
    [
      "init project",
      "add readme",
      "setup ci",
      "first tests",
      "add auth",
      "add api",
      "fix cors bug",
      "add pagination",
      "v1.0 release",
    ].forEach((m) => {
      c = addC(m, c);
    });
    STATE.wcId = c;
    STATE.bookmarks = { main: c };
  },
  feature() {
    STATE = makeFreshState();
    STATE.mode = "both";
    makeRoot();
    const b = STATE.commits[1].id;
    const c1 = addC("init project", b),
      c2 = addC("add readme", c1),
      c3 = addC("setup ci", c2);
    const m1 = addC("add auth", c3),
      m2 = addC("add api", m1, 0, "1 day ago"),
      m3 = addC("v1.0", m2, 0, "1 day ago");
    const f1 = addC("start dark mode", c3, 1, "2 days ago"),
      f2 = addC("add theme toggle", f1, 1, "2 days ago"),
      f3 = addC("fix contrast", f2, 1, "1 day ago");
    STATE.wcId = f3;
    STATE.bookmarks = { main: m3, "dark-mode": f3 };
  },
  cleanup() {
    STATE = makeFreshState();
    STATE.mode = "both";
    makeRoot();
    const b = STATE.commits[1].id;
    const c1 = addC("init", b),
      c2 = addC("add styles", c1),
      c3 = addC("layout done", c2),
      c4 = addC("add nav", c3),
      c5 = addC("nav bugfix", c4);
    const w1 = addC("wip: trying", c3, 1, "3 days ago"),
      w2 = addC("wip: broken", w1, 1, "2 days ago"),
      w3 = addC("wip: maybe?", w2, 1, "yesterday"),
      w4 = addC("wip: giving up", w3, 1, "just now");
    STATE.wcId = w4;
    STATE.bookmarks = { main: c5, experiment: w4 };
  },
  fork() {
    STATE = makeFreshState();
    STATE.mode = "both";
    makeRoot();
    const b = STATE.commits[1].id;
    const u1 = addC("upstream: v1.0", b, 0, "2 weeks ago"),
      u2 = addC("upstream: security fix", u1, 0, "1 week ago"),
      u3 = addC("upstream: perf", u2, 0, "5 days ago"),
      u4 = addC("upstream: v1.2", u3, 0, "2 days ago");
    const f1 = addC("fork: custom branding", u2, 1, "6 days ago"),
      f2 = addC("fork: plugin system", f1, 1, "4 days ago"),
      f3 = addC("fork: api compat", f2, 1, "2 days ago");
    STATE.wcId = f3;
    STATE.bookmarks = { upstream: u4, "our-fork": f3 };
  },
};
window.loadScenario = function (name, btn) {
  document
    .querySelectorAll(".sc-btn")
    .forEach((b) => b.classList.remove("active"));
  if (btn) btn.classList.add("active");
  cleanNodes();
  if (name === "blank") STATE = makeFreshState();
  else if (SCENARIOS[name]) {
    SCENARIOS[name]();
    // init branchLanes from existing commit lanes
    STATE.branchLanes = {};
    STATE.nextLane = 0;
    STATE.commits.forEach((c) => {
      if (c.lane !== undefined && c.lane >= STATE.nextLane)
        STATE.nextLane = c.lane + 1;
    });
    Object.entries(STATE.bookmarks).forEach(([bname, bid]) => {
      const c = STATE.commits.find((x) => x.id === bid);
      if (c) STATE.branchLanes[bname] = c.lane || 0;
    });
    STATE.branchLanes["HEAD"] = 0;
    STATE.branchLanes["main"] = STATE.branchLanes["main"] || 0;
  }
  firstRender = true;
  tBlockCount = 0;
  document.getElementById("tlog").innerHTML = "";
  const overlay = document.getElementById("init-overlay"),
    hud = document.getElementById("ghud");
  if (name === "blank") {
    overlay.style.display = "flex";
    hud.style.display = "none";
  } else {
    overlay.style.display = "none";
    hud.style.display = "";
  }
  emit(
    `scenario: ${name}`,
    "sys",
    `"${name}" loaded — explore the graph, then follow the lessons.`,
  );
  render();
  setTimeout(fitView, 60);
  updateInfoBar();
  updateToolbar();
  updatePrompt();
};

// ── LAYOUT ────────────────────────────────────────────────────────────────
// Vertical layout: newest commits at TOP, oldest at BOTTOM.
// x = lane * CW + PX  (branches spread horizontally)
// y = (maxDepth - depth) * RH + PY  (newer = smaller y = higher)
const NR = 13,
  CW = 110,
  RH = 88,
  PX = 72,
  PY = 72,
  HO = 54;
function computeLayout(commits, wcId) {
  const cm = {};
  commits.forEach((c) => {
    cm[c.id] = [];
  });
  commits.forEach((c) => {
    (Array.isArray(c.parents) ? c.parents : []).forEach((p) => {
      if (cm[p]) cm[p].push(c.id);
    });
  });
  const depth = {};
  commits
    .filter((c) => !c.parents || !c.parents.length)
    .forEach((c) => {
      depth[c.id] = 0;
    });
  const q = commits
    .filter((c) => !c.parents || !c.parents.length)
    .map((c) => c.id);
  while (q.length) {
    const id = q.shift();
    (cm[id] || []).forEach((cid) => {
      const nd = (depth[id] || 0) + 1;
      if (depth[cid] === undefined || depth[cid] < nd) {
        depth[cid] = nd;
        q.push(cid);
      }
    });
  }
  const maxD = Math.max(...Object.values(depth), 0);
  const x = {},
    y = {};
  commits.forEach((c) => {
    x[c.id] = PX + (c.lane || 0) * CW;
    y[c.id] = PY + (maxD - (depth[c.id] || 0)) * RH; // invert: root at bottom, tip at top
  });
  const maxLane = Math.max(...commits.map((c) => c.lane || 0), 0);
  return {
    x,
    y,
    W: Math.max(300, PX * 2 + (maxLane + 1) * CW),
    H: Math.max(200, PY + (maxD + 1) * RH + 60),
  };
}

// ── PAN/ZOOM ──────────────────────────────────────────────────────────────
let vx = 50,
  vy = 40,
  vs = 1,
  panning = false,
  pl = { x: 0, y: 0 },
  firstRender = true,
  curLayout = { x: {}, y: {} };
const applyVP = () =>
  document
    .getElementById("vp")
    .setAttribute("transform", `translate(${vx},${vy}) scale(${vs})`);
function zoomAt(cx, cy, f) {
  const ns = Math.max(0.18, Math.min(4, vs * f));
  vx = cx + (vx - cx) * (ns / vs);
  vy = cy + (vy - cy) * (ns / vs);
  vs = ns;
  applyVP();
}
window.zoomIn = () => {
  const c = document.getElementById("gwrap");
  zoomAt(c.clientWidth / 2, c.clientHeight / 2, 1.18);
};
window.zoomOut = () => {
  const c = document.getElementById("gwrap");
  zoomAt(c.clientWidth / 2, c.clientHeight / 2, 0.85);
};
window.fitView = function () {
  const xs = Object.values(curLayout.x),
    ys = Object.values(curLayout.y);
  if (!xs.length) {
    vx = 80;
    vy = 100;
    vs = 1;
    applyVP();
    return;
  }
  // top: room for HEAD badge (HO) above topmost node; bottom: room for root label; sides: label text
  const pad = { t: HO + 36, b: 52, l: 90, r: 160 };
  const minX = Math.min(...xs) - NR,
    maxX = Math.max(...xs) + NR;
  const minY = Math.min(...ys) - NR,
    maxY = Math.max(...ys) + NR;
  const wrap = document.getElementById("gwrap");
  const w = wrap.clientWidth,
    h = wrap.clientHeight;
  const scaleX = (w - pad.l - pad.r) / Math.max(maxX - minX, 1);
  const scaleY = (h - pad.t - pad.b) / Math.max(maxY - minY, 1);
  vs = Math.min(scaleX, scaleY, 1.3);
  vx = pad.l + (w - pad.l - pad.r - (maxX - minX) * vs) / 2 - minX * vs;
  vy = pad.t + (h - pad.t - pad.b - (maxY - minY) * vs) / 2 - minY * vs;
  applyVP();
};
(() => {
  const svg = document.getElementById("gsvg"),
    wrap = document.getElementById("gwrap");
  wrap.addEventListener("mousedown", (e) => {
    panning = true;
    pl = { x: e.clientX, y: e.clientY };
    wrap.classList.add("panning");
    e.preventDefault();
  });
  window.addEventListener("mousemove", (e) => {
    if (!panning) return;
    vx += e.clientX - pl.x;
    vy += e.clientY - pl.y;
    pl = { x: e.clientX, y: e.clientY };
    applyVP();
  });
  window.addEventListener("mouseup", () => {
    panning = false;
    wrap.classList.remove("panning");
  });
  svg.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const r = svg.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.1 : 0.91);
    },
    { passive: false },
  );
  wrap.addEventListener(
    "touchstart",
    (e) => {
      if (e.touches.length !== 1) return;
      panning = true;
      pl = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    },
    { passive: true },
  );
  wrap.addEventListener(
    "touchmove",
    (e) => {
      if (!panning || e.touches.length !== 1) return;
      vx += e.touches[0].clientX - pl.x;
      vy += e.touches[0].clientY - pl.y;
      pl = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      applyVP();
      e.preventDefault();
    },
    { passive: false },
  );
  wrap.addEventListener("touchend", () => {
    panning = false;
  });
})();

// ── RENDERER ──────────────────────────────────────────────────────────────
const nodeEls = {};
function ensureNode(id) {
  if (nodeEls[id]) return nodeEls[id];
  const g = document.createElementNS(NS, "g");
  g.classList.add("cn", "cn-in");
  document.getElementById("nl").appendChild(g);
  nodeEls[id] = g;
  setTimeout(() => g.classList.remove("cn-in"), 400);
  return g;
}
function cleanNodes() {
  Object.keys(nodeEls).forEach((id) => {
    nodeEls[id] && nodeEls[id].remove();
    delete nodeEls[id];
  });
  document.getElementById("el").innerHTML = "";
  document.getElementById("gl").innerHTML = "";
}
function removeNode(id) {
  const g = nodeEls[id];
  if (!g) return;
  delete nodeEls[id];
  setTimeout(() => g.remove(), 300);
}
function buildNode(c, isWC, isPar, bms) {
  const isGitMode = STATE.mode === "git";
  const showParent = isPar && !isGitMode;
  const fill = isWC ? "#e8f2e4" : LF[c.lane % LF.length],
    stroke = isWC ? "#256030" : LS[c.lane % LS.length],
    dot = isWC ? "#1a5028" : LD[c.lane % LD.length];
  if (c.isRoot) {
    return `<rect x="-9" y="-9" width="18" height="18" rx="2" transform="rotate(45)" fill="#26221a" opacity=".82"/>
      <text font-size="7" font-family="monospace" fill="#f8f4ee" text-anchor="middle" dominant-baseline="central">✦</text>
      <text font-size="8" font-family="sans-serif" fill="#968e7c" x="${NR + 8}" y="4">root</text>`;
  }
  let s = "";
  // Rings
  if (showParent)
    s += `<circle r="${NR + 7}" fill="none" stroke="#c8a840" stroke-width="1.5" stroke-dasharray="4 3" opacity=".5"/>`;
  if (isWC)
    s += `<circle r="${NR + 6}" fill="none" stroke="${stroke}" stroke-width="1" opacity=".18"/>`;
  // Main circle
  s += `<circle r="${NR}" fill="${fill}" stroke="${stroke}" stroke-width="${isWC ? 2.2 : 1.5}"/>`;
  // Inner symbol
  if (isWC) s += `<circle r="4.5" fill="${dot}" opacity=".8"/>`;
  else if (showParent)
    s += `<text font-size="7" font-weight="600" font-family="monospace" fill="#a07010" text-anchor="middle" dominant-baseline="central" opacity=".85"><title>Parent of @ — what diff compares against</title>P</text>`;
  else if (c.isEmpty) s += `<circle r="3" fill="${stroke}" opacity=".35"/>`;
  else s += `<circle r="4" fill="${dot}" opacity=".72"/>`;
  // Labels to the right of node
  const lbl = c.isEmpty ? "(empty)" : c.msg;
  const lx = NR + 10;
  s += `<text font-size="8.5" font-family="monospace" fill="${dot}" opacity=".85" x="${lx}" y="-3">${c.id}</text>`;
  s += `<text font-size="8" font-family="sans-serif" fill="#7a7266" x="${lx}" y="9">${lbl.length > 20 ? lbl.slice(0, 19) + "…" : lbl}</text>`;
  // Bookmark pills — stacked to the right below the label
  const activeBranch = isGitMode ? STATE.branch : null;
  const filteredBms = bms.filter(
    (bm) => !(isGitMode && bm === activeBranch && isWC),
  );
  filteredBms.forEach((bm, i) => {
    const pw = Math.max(36, bm.length * 5.5 + 12),
      bx = lx,
      by = 18 + i * 16;
    s += `<rect x="${bx}" y="${by}" width="${pw}" height="12" rx="6" fill="#eceaf6" stroke="#b0a0d8" stroke-width=".8"/>`;
    s += `<text font-size="7" font-family="sans-serif" font-weight="500" fill="#442080" x="${bx + pw / 2}" text-anchor="middle" y="${by + 8.5}">${bm}</text>`;
  });
  return s;
}
let headBadge = null,
  headRope = null;
(() => {
  const hl = document.getElementById("hl");
  headRope = document.createElementNS(NS, "line");
  headRope.setAttribute("stroke", "#26221a");
  headRope.setAttribute("stroke-width", "1.4");
  headRope.setAttribute("stroke-dasharray", "6 4");
  headRope.setAttribute("opacity", ".35");
  headRope.setAttribute("marker-end", "url(#arr2)");
  hl.appendChild(headRope);
  headBadge = document.createElementNS(NS, "g");
  headBadge.classList.add("cn");
  hl.appendChild(headBadge);
})();
function updateHeadBadge(x, y, show) {
  if (!show) {
    headBadge.style.display = "none";
    headRope.style.display = "none";
    return;
  }
  const isGitMode = STATE.mode === "git";
  const onBranch = STATE.branch && STATE.branch !== "HEAD";
  let inner, r;
  if (isGitMode) {
    if (onBranch) {
      r = 19;
      inner = `<circle r="${r}" fill="#144870" stroke="#2a6090" stroke-width="1.2"/>
        <text font-size="6.5" font-weight="700" font-family="monospace" fill="#f8f4ee" text-anchor="middle" y="-3.5">HEAD</text>
        <text font-size="5.5" font-family="monospace" fill="#7ab4e0" text-anchor="middle" y="6.5">→${STATE.branch.length > 9 ? STATE.branch.slice(0, 8) + "…" : STATE.branch}</text>`;
    } else {
      r = 14;
      inner = `<circle r="${r}" fill="#144870" stroke="#2a6090" stroke-width="1"/>
        <text font-size="6.5" font-weight="700" font-family="monospace" fill="#f8f4ee" text-anchor="middle" dominant-baseline="central">HEAD</text>`;
    }
  } else {
    r = 14;
    inner = `<circle r="${r}" fill="#26221a" stroke="#48443c" stroke-width="1"/>
      <text font-size="9" font-weight="700" font-family="monospace" fill="#f8f4ee" text-anchor="middle" dominant-baseline="central">@</text>`;
  }
  headBadge.innerHTML = inner;
  headBadge.style.display = "";
  headRope.style.display = "";
  const by = y - HO; // badge floats HO pixels above the commit node
  headBadge.style.transform = `translate(${x}px,${by}px)`;
  headRope.setAttribute("x1", x);
  headRope.setAttribute("y1", by + r + 2);
  headRope.setAttribute("x2", x);
  headRope.setAttribute("y2", y - NR - 3);
}
function render() {
  if (STATE.mode === "none") return;
  const { commits, bookmarks, wcId } = STATE;
  const nl = computeLayout(commits, wcId);
  const bmByC = {};
  Object.entries(bookmarks).forEach(([n, id]) => {
    if (!bmByC[id]) bmByC[id] = [];
    bmByC[id].push(n);
  });
  const wcC = commits.find((c) => c.id === wcId),
    parentId = wcC && wcC.parents && wcC.parents[0];
  // In git mode, don't show the P parent indicator at all (git doesn't surface parent visually this way)
  // In jj mode, only show P on real non-root parent commits
  const isGitOnlyMode = STATE.mode === "git";
  const parentC =
    !isGitOnlyMode && parentId ? commits.find((c) => c.id === parentId) : null;
  const showPId =
    !isGitOnlyMode && parentC && !parentC.isEmpty && !parentC.isRoot
      ? parentId
      : null;
  const seen = new Set();
  commits.forEach((c) => {
    seen.add(c.id);
    const g = ensureNode(c.id);
    const x = nl.x[c.id] ?? 0,
      y = nl.y[c.id] ?? 0,
      isWC = c.id === wcId,
      isPar = c.id === showPId,
      bms = bmByC[c.id] || [];
    if (firstRender) {
      g.style.transition = "none";
      g.style.transform = `translate(${x}px,${y}px)`;
      requestAnimationFrame(() => {
        g.style.transition = "";
      });
    } else g.style.transform = `translate(${x}px,${y}px)`;
    g.innerHTML = buildNode(c, isWC, isPar, bms);
    g.style.cursor = c.isRoot ? "default" : "pointer";
    if (!c.isRoot) {
      g.onclick = (e) => {
        e.stopPropagation();
        if (STATE.mode !== "none") moveHead(c.id);
      };
      // Hover tooltip
      const ntip = document.getElementById("ntip");
      const wrap = document.getElementById("gwrap");
      g.onmouseenter = (e) => {
        const r = wrap.getBoundingClientRect();
        const bms2 = (bmByC[c.id] || []).join(", ");
        let tip = `${c.id}  ${c.cid}\n${c.isEmpty ? "(empty commit)" : c.msg}`;
        if (isPar) tip += "\n\n◈ P = parent of @ · diff compares against this";
        if (isWC) tip += "\n\n◈ @ = your working copy";
        if (bms2) tip += `\n◈ bookmarks: ${bms2}`;
        ntip.style.whiteSpace = "pre";
        ntip.textContent = tip;
        ntip.style.display = "block";
      };
      g.onmousemove = (e) => {
        const r = wrap.getBoundingClientRect();
        ntip.style.left = e.clientX - r.left + 12 + "px";
        ntip.style.top = e.clientY - r.top - 8 + "px";
      };
      g.onmouseleave = () => {
        ntip.style.display = "none";
      };
    }
  });
  Object.keys(nodeEls).forEach((id) => {
    if (!seen.has(id)) removeNode(id);
  });
  updateEdges(commits, nl);
  if (wcId && nl.x[wcId] !== undefined) {
    const wx = nl.x[wcId],
      wy = nl.y[wcId];
    if (firstRender) {
      headBadge.style.transition = "none";
      setTimeout(() => {
        headBadge.style.transition = "";
      }, 50);
    }
    updateHeadBadge(wx, wy, true);
  } else {
    updateHeadBadge(0, 0, false);
  }
  updateGuides(nl);
  curLayout = nl;
  if (firstRender) {
    setTimeout(fitView, 80);
    firstRender = false;
  }
  updateInfoBar();
  updateToolbar();
  updatePrompt();
  updateHUD();
}
function updateEdges(commits, nl) {
  const el = document.getElementById("el");
  el.innerHTML = "";
  commits.forEach((c) => {
    if (nl.x[c.id] === undefined) return;
    (c.parents || []).forEach((pid) => {
      const par = commits.find((p) => p.id === pid);
      if (!par || nl.x[par.id] === undefined) return;
      const cx = nl.x[c.id],
        cy = nl.y[c.id]; // child: newer, higher up (smaller y)
      const px = nl.x[par.id],
        py = nl.y[par.id]; // parent: older, lower down (larger y)
      const stroke = LS[c.lane % LS.length];
      const y1 = cy + NR + 1; // bottom edge of child node
      const y2 = py - NR - 1; // top edge of parent node
      if (Math.abs(cx - px) < 2) {
        // Same lane — clean straight vertical line
        const line = document.createElementNS(NS, "line");
        line.setAttribute("x1", cx);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", px);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", stroke);
        line.setAttribute("stroke-width", "2");
        line.setAttribute("stroke-opacity", ".5");
        el.appendChild(line);
      } else {
        // Cross-lane — S-curve: exits child bottom, curves to parent lane, enters parent top
        const my = (y1 + y2) / 2;
        const path = document.createElementNS(NS, "path");
        path.setAttribute(
          "d",
          `M${cx},${y1} C${cx},${my} ${px},${my} ${px},${y2}`,
        );
        path.setAttribute("fill", "none");
        path.setAttribute("stroke", stroke);
        path.setAttribute("stroke-width", "1.8");
        path.setAttribute("stroke-opacity", ".45");
        el.appendChild(path);
      }
    });
  });
}
function updateGuides(nl) {
  const gl = document.getElementById("gl");
  gl.innerHTML = "";
  const xs = new Set(Object.values(nl.x));
  const H = nl.H + 200;
  xs.forEach((x) => {
    const l = document.createElementNS(NS, "line");
    l.setAttribute("x1", x);
    l.setAttribute("y1", -80);
    l.setAttribute("x2", x);
    l.setAttribute("y2", H);
    l.setAttribute("stroke", "#d8d3c8");
    l.setAttribute("stroke-width", ".6");
    l.setAttribute("stroke-dasharray", "2 12");
    l.setAttribute("opacity", ".55");
    gl.appendChild(l);
  });
}

// ── UI UPDATES ────────────────────────────────────────────────────────────
function chip(cls, label, tip) {
  return `<span class="chip ${cls}">${label}<span class="chip-tip">${tip}</span></span>`;
}
function updateHUD() {
  const hud = document.getElementById("ghud");
  if (STATE.mode === "none") {
    hud.style.display = "none";
    return;
  }
  hud.style.display = "";
  const wc = STATE.commits.find((c) => c.id === STATE.wcId);
  if (!wc) return;
  const isGit = STATE.mode === "git";
  document.getElementById("hud-wc").textContent =
    (isGit ? "HEAD" : "@") + " → " + wc.id;
  document.getElementById("hud-msg").textContent = wc.isEmpty
    ? "(empty)"
    : wc.msg;
  document.getElementById("hud-cid").textContent = isGit
    ? "branch: " + (STATE.branch === "HEAD" ? "detached" : STATE.branch)
    : "cid: " + wc.cid;
}
function updateInfoBar() {
  const ib = document.getElementById("infobar");
  if (STATE.mode === "none") {
    ib.innerHTML =
      '<span class="infobar-empty">initialize the repo to see live commit info here</span>';
    return;
  }
  const { commits, bookmarks, wcId, branch } = STATE;
  const wc = commits.find((c) => c.id === wcId),
    par =
      wc && wc.parents && wc.parents[0]
        ? commits.find((c) => c.id === wc.parents[0])
        : null;
  const bms = Object.entries(bookmarks)
    .filter(([, v]) => v === wcId)
    .map(([k]) => k);
  let h = "";
  if (wc) {
    h += chip(
      "g",
      "@ → " + wc.id,
      "Your working copy. Short ID to use in commands like  edit " +
        wc.id.slice(0, 4),
    );
    h += chip(
      "b",
      wc.isEmpty ? "(empty)" : wc.msg,
      wc.isEmpty
        ? "No description. Run  describe  to set one."
        : "The commit description of @.",
    );
    h += chip(
      "p",
      "cid: " + wc.cid,
      "Change ID — stable across rebases. Tracks your intent, not the snapshot.",
    );
    h += chip("n", wc.time, "When @ was last touched.");
  }
  if (bms.length) {
    h += '<div class="isep"></div>';
    bms.forEach(
      (b) =>
        (h += chip(
          "a",
          b,
          "Bookmark on @ — like a git branch, but does not auto-advance on commit.",
        )),
    );
  }
  if (par && !par.isRoot) {
    h += '<div class="isep"></div>';
    h += chip(
      "a",
      "P → " + par.id,
      "Parent of @. This is what diff compares against; squash absorbs @ into this.",
    );
    h += chip("n", par.isEmpty ? "(empty)" : par.msg, "");
  }
  if (STATE.mode === "git" || STATE.mode === "both") {
    h += '<div class="isep"></div>';
    h += chip(
      "b",
      "branch: " + branch,
      branch === "HEAD"
        ? "git HEAD is detached — jj's natural state. Run  git checkout main  to attach."
        : "git HEAD is on this branch.",
    );
  }
  ib.innerHTML = h;
}
function updateToolbar() {
  const init = STATE.mode !== "none",
    bm = document.getElementById("badge-mode");
  bm.textContent =
    STATE.mode === "none"
      ? "not initialized"
      : STATE.mode === "both"
        ? "git + jj"
        : STATE.mode;
  bm.className =
    "badge " +
    (STATE.mode === "none"
      ? "r"
      : STATE.mode === "both"
        ? "p"
        : STATE.mode === "git"
          ? "b"
          : "g");
  document.getElementById("badge-wc").style.display = init ? "" : "none";
  document.getElementById("badge-branch").style.display =
    STATE.mode === "git" || STATE.mode === "both" ? "" : "none";
  document.getElementById("badge-bm").style.display = init ? "" : "none";
  if (init && STATE.wcId) {
    document.getElementById("badge-wc").textContent = "@ → " + STATE.wcId;
    document.getElementById("badge-branch").textContent = STATE.branch;
    const bms = Object.entries(STATE.bookmarks)
      .filter(([, v]) => v === STATE.wcId)
      .map(([k]) => k);
    document.getElementById("badge-bm").textContent = bms.length
      ? bms.join(", ")
      : "no bookmark";
  }
  document.getElementById("btn-new").style.display = init ? "" : "none";
  document.getElementById("btn-undo").style.display = init ? "" : "none";
}
function updatePrompt() {
  const m = STATE.mode,
    lbl = document.getElementById("tplbl"),
    tm = document.getElementById("tmode"),
    pd = document.getElementById("tpd");
  if (m === "none") {
    tm.className = "tmode none";
    tm.textContent = "no repo";
    lbl.textContent = "▸";
    lbl.style.color = "var(--term-ink2)";
  } else if (m === "git") {
    tm.className = "tmode git";
    tm.textContent = "git";
    lbl.textContent = `git:(${STATE.branch}) ▸`;
    lbl.style.color = "var(--term-blue)";
  } else if (m === "jj") {
    tm.className = "tmode jj";
    tm.textContent = "jj";
    lbl.textContent = "jj:(HEAD) ▸";
    lbl.style.color = "var(--term-green)";
  } else {
    tm.className = "tmode both";
    tm.textContent = "git+jj";
    lbl.textContent = `jujutsu:(${STATE.branch}) ▸`;
    lbl.style.color = "var(--term-green)";
  }
  pd.textContent =
    "▸ " +
    (m === "none"
      ? "jujutsu · revision tree"
      : m === "git"
        ? `git · ${STATE.branch}`
        : m === "jj"
          ? "jj · HEAD"
          : "jj+git · " + STATE.branch);
  // keep ghost offset in sync whenever prompt changes
  acUpdate(tinput.value);
}

// ── ACTIONS ───────────────────────────────────────────────────────────────
const canJJ = () => STATE.mode === "jj" || STATE.mode === "both";
const canGit = () => STATE.mode === "git" || STATE.mode === "both";
function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// Returns the correct lane for a new commit parented at parentId.
// If the parent already has children → fork onto a new lane.
// Otherwise → inherit parent's lane.
function laneForNew(parentId) {
  const hasChildren = STATE.commits.some(
    (c) => c.parents && c.parents.includes(parentId),
  );
  if (hasChildren) {
    // Find the next free lane (not used by any existing commit at next depth level)
    const usedLanes = new Set(STATE.commits.map((c) => c.lane || 0));
    let lane = STATE.nextLane;
    while (usedLanes.has(lane)) lane++;
    STATE.nextLane = Math.max(STATE.nextLane, lane + 1);
    return lane;
  }
  // No children yet — stay on parent's lane
  const parent = STATE.commits.find((c) => c.id === parentId);
  return parent ? parent.lane || 0 : 0;
}

function doInit(type) {
  STATE.mode = type;
  STATE.branchLanes = { main: 0, HEAD: 0 };
  STATE.nextLane = 1;
  makeRoot();
  if (type === "git" || type === "both") {
    STATE.branch = "main";
    STATE.bookmarks = { main: STATE.wcId };
    STATE.branchLanes = { main: 0, HEAD: 0 };
  }
  document.getElementById("init-overlay").style.display = "none";
  document.getElementById("ghud").style.display = "";
  firstRender = true;
  const msg =
    type === "git"
      ? "Initialized empty Git repository in .git/\nOn branch main (default branch created)"
      : type === "jj"
        ? "Initialized jj repo in .jj/"
        : "git + jj colocated — both command sets now available.";
  emit(
    type === "git"
      ? "git init"
      : type === "jj"
        ? "jj init"
        : "jj git init --colocate",
    "ok",
    msg,
  );
  render();
  markDone("l0");
}
window.moveHead = function (id) {
  const c = STATE.commits.find((x) => x.id === id);
  if (!c || c.isRoot) return;
  if (!canJJ() && !canGit()) return;
  STATE.opLog.push({ type: "move", from: STATE.wcId });
  STATE.wcId = id;
  markDone("l3");
  render();
  emit(
    "jj edit " + id,
    "ok",
    `Working copy: ${id} — ${c.isEmpty ? "(empty)" : c.msg}`,
  );
};
window.cmdNew = function () {
  if (!canJJ()) {
    emit("jj new", "err", "jj not initialized");
    return;
  }
  const wc = STATE.commits.find((c) => c.id === STATE.wcId);
  if (!wc) return;
  STATE.opLog.push({
    type: "snapshot",
    commits: JSON.parse(JSON.stringify(STATE.commits)),
    wcId: STATE.wcId,
    bookmarks: { ...STATE.bookmarks },
    branchLanes: { ...STATE.branchLanes },
    branch: STATE.branch,
  });
  const msg = nm(),
    nId = genId();
  const lane = laneForNew(STATE.wcId);
  STATE.commits.push({
    id: nId,
    cid: genCid(),
    msg,
    parents: [STATE.wcId],
    isEmpty: false,
    time: "just now",
    lane,
  });
  STATE.wcId = nId;
  STATE.branch = "HEAD";
  markDone("l3");
  render();
  emit("jj new", "ok", `Created: ${nId} — "${msg}"\nWorking copy now: ${nId}`);
};
window.cmdUndo = function () {
  const last = STATE.opLog[STATE.opLog.length - 1];
  if (!last) {
    emit("jj undo", "err", "nothing to undo");
    return;
  }
  STATE.opLog.pop();
  if (last.type === "move") STATE.wcId = last.from;
  else if (last.type === "snapshot") {
    STATE.commits = last.commits;
    STATE.wcId = last.wcId;
    STATE.bookmarks = last.bookmarks;
    if (last.branchLanes) STATE.branchLanes = last.branchLanes;
    if (last.branch) STATE.branch = last.branch;
  }
  markDone("l10");
  render();
  emit("jj undo", "ok", "Undid last operation.");
};
window.doReset = function () {
  cleanNodes();
  STATE = makeFreshState();
  firstRender = true;
  document.getElementById("init-overlay").style.display = "flex";
  document.getElementById("ghud").style.display = "none";
  tBlockCount = 0;
  document.getElementById("tlog").innerHTML = "";
  emit(
    "reset",
    "sys",
    "Repository cleared. Choose initialization mode to start again.",
  );
  updateInfoBar();
  updateToolbar();
  updatePrompt();
};

// ── TERMINAL ──────────────────────────────────────────────────────────────
let tBlockCount = 0;
function emit(cmd, type, output) {
  const log = document.getElementById("tlog");
  if (tBlockCount > 0) {
    const d = document.createElement("div");
    d.className = "tdiv";
    log.appendChild(d);
  }
  tBlockCount++;
  const blk = document.createElement("div");
  blk.className = "tblk";
  const row = document.createElement("div");
  row.className = "tcmd-line";
  row.textContent = "▸ " + cmd;
  blk.appendChild(row);
  if (output) {
    const out = document.createElement("div");
    out.className = "tout";
    String(output)
      .split("\n")
      .forEach((line) => {
        const d = document.createElement("div");
        d.className = "tl " + type;
        d.textContent = line;
        out.appendChild(d);
      });
    blk.appendChild(out);
  }
  log.appendChild(blk);
  log.scrollTop = log.scrollHeight;
}
window.termClear = function () {
  document.getElementById("tlog").innerHTML = "";
  tBlockCount = 0;
};
window.termHelp = function () {
  emit(
    "help",
    "dim",
    `jj + git revision mind tree — all commands

── shorthand (type just the keyword, prefix optional) ──
  new [msg]            jj new with optional description
  describe [msg]       set @ description (random if omitted)
  edit <id>            move @ to a commit
  log                  show revision graph
  status               working copy state
  squash               fold @ into parent
  undo                 undo last operation
  bookmark <sub>       list/create/set/delete
  rebase -d <dest>     move @ to new parent
  diff                 show changes in @
  op log / op undo     operation log

── jj full form ──
  jj log / jj new / jj describe -m "msg" / jj edit <id>
  jj status / jj squash / jj rebase -d <dest>
  jj bookmark list|create|set|delete / jj undo
  jj op log / jj op undo / jj diff / jj restore
  jj git init --colocate

── git ──
  git init / git status / git log / git add .
  git commit [msg] / git branch / git checkout <name>
  git push / git pull / git stash / git diff / git merge

── system ──
  help  clear  reset  history  sandbox  ls  pwd  whoami  date

── easter eggs ──
  jj coffee  jj yolo  jj why  jj panic  jj vibes
  jj blame  jj matrix  jj gm  jj gn  jj ship it
  jj skill issue  jj rizz  jj sudo

  tip: tab/→ to autocomplete · click any node to move @`,
  );
};

// ── AUTOCOMPLETE ──────────────────────────────────────────────────────────
const ALL_CMDS = [
  "git init",
  "git status",
  "git add .",
  "git commit",
  'git commit -m ""',
  "git log",
  "git log --oneline",
  "git branch",
  "git branch -d ",
  "git checkout main",
  "git checkout -b ",
  "git merge",
  "git rebase",
  "git push",
  "git pull",
  "git stash",
  "git stash pop",
  "git diff",
  "jj init",
  "jj git init --colocate",
  "jj log",
  "jj new",
  'jj new -m ""',
  "jj describe",
  'jj describe -m ""',
  "jj edit ",
  "jj status",
  "jj bookmark",
  "jj bookmark list",
  "jj bookmark create ",
  "jj bookmark set ",
  "jj bookmark delete ",
  "jj squash",
  "jj rebase -d ",
  "jj undo",
  "jj op",
  "jj op log",
  "jj op undo",
  "jj diff",
  "jj restore",
  "new",
  "describe",
  "log",
  "status",
  "squash",
  "undo",
  "rebase -d ",
  "bookmark",
  "bookmark list",
  "bookmark create ",
  "bookmark set ",
  "edit ",
  "jj coffee",
  "jj yolo",
  "jj why",
  "jj panic",
  "jj vibes",
  "jj blame",
  "jj matrix",
  "jj gm",
  "jj gn",
  "jj ship it",
  "jj skill issue",
  "jj rizz",
  "jj sudo",
  "help",
  "clear",
  "reset",
  "history",
  "sandbox",
  "ls",
  "pwd",
  "whoami",
  "date",
  "cat readme",
  "echo ",
];
let acSuggestion = "";
const tinput = document.getElementById("tinput"),
  ighost = document.getElementById("ighost"),
  thint = document.getElementById("thint");

function acUpdate(val) {
  if (!val) {
    ighost.innerHTML = "";
    thint.style.display = "none";
    acSuggestion = "";
    return;
  }
  const match = ALL_CMDS.find((c) => c.startsWith(val) && c !== val);
  if (match) {
    acSuggestion = match;
    // Use the typed part (transparent) + suggestion tail (visible)
    ighost.innerHTML = `<span style="color:transparent;user-select:none">${esc(val)}</span><span class="suggestion">${esc(match.slice(val.length))}</span>`;
    thint.style.display = "";
  } else {
    ighost.innerHTML = "";
    thint.style.display = "none";
    acSuggestion = "";
  }
}
tinput.addEventListener("input", () => acUpdate(tinput.value));
tinput.addEventListener("keydown", function (e) {
  if (
    (e.key === "Tab" || e.key === "ArrowRight") &&
    acSuggestion &&
    this.selectionStart === this.value.length
  ) {
    e.preventDefault();
    this.value = acSuggestion;
    acUpdate(this.value);
    return;
  }
  if (e.key !== "Enter") return;
  const raw = this.value.trim();
  if (!raw) return;
  this.value = "";
  acUpdate("");
  handleCmd(raw);
});

// ── EASTER EGGS ───────────────────────────────────────────────────────────
const EASTER = {
  "jj coffee": () =>
    "☕  searching working tree for caffeine...\n\nerror: no caffeine found\nhint: try  describe add coffee",
  "jj git": () =>
    "git? we don't do that here.\njj is the future. please stay hydrated.",
  "jj yolo": () =>
    "🚀 YOLO mode: ENABLED\n\nwarn: flag does not exist in real jj\nbut your energy? immaculate.",
  "jj why": () =>
    "because git needed a better undo button.\njj: same history, fewer regrets.",
  "jj panic": () =>
    "PANIC: everything is on fire\n\n...jk. jj undo exists.\nyou are fine.",
  "jj vibes": () => {
    const v = [
      "stressed",
      "chaotic neutral",
      "actually pretty good ngl",
      "in a flow state",
      "mid",
      "certified fresh",
    ];
    return `vibes check: ${v[Math.floor(Math.random() * v.length)]}\n\ncommits: ${STATE.commits.length}  bookmarks: ${Object.keys(STATE.bookmarks).length}  undos: ${STATE.opLog.length}`;
  },
  "jj blame": () => {
    const c = STATE.commits.filter((x) => !x.isRoot);
    if (!c.length) return "nothing to blame yet.";
    const p = c[Math.floor(Math.random() * c.length)];
    return `blame: ${p.id} — "${p.isEmpty ? "(empty)" : p.msg}"\n\nthis commit is responsible for everything.`;
  },
  "jj matrix": () =>
    "entering the matrix...\n\n01001010 01001010 00100000\n01101001 01110011 00100000\n\nerror: matrix is already a revision tree\nyou are the @ pointer, Neo.",
  "jj gm": () =>
    `good morning.\n\n@ is at: ${STATE.wcId || "nowhere"}\nbookmarks: ${Object.keys(STATE.bookmarks).join(", ") || "none"}\n\nrun  log  to orient yourself.`,
  "jj gn": () =>
    `good night.\n\ncommits created: ${STATE.commits.filter((c) => !c.isRoot).length}\nbookmarks: ${Object.keys(STATE.bookmarks).join(", ") || "none"}\nops logged: ${STATE.opLog.length}\n\ngo rest. nothing is lost.`,
  "jj ship it": () =>
    "deploying to production...\n\nerror: no production found\nbut your confidence? LGTM ✓\nmerge approved by vibes.",
  "jj skill issue": () => {
    const u = STATE.opLog.filter((o) => o.type === "snapshot").length;
    return u > 2
      ? `diagnosis: ${u} snapshots recorded\n\n💡 skill issue (mild)\nhint: plan commits before creating them`
      : ` ${STATE.opLog.length} ops recorded\n\nno skill issues. you are doing great.`;
  },
  "jj rizz": () => {
    const s = Math.floor(Math.random() * 40 + 60);
    return `rizz score: ${s}/100\n${s > 80 ? "certified sigma commit 😤" : "solid commit energy"}`;
  },
  "jj sudo": () =>
    "sudo: permission denied\n\nwith great commits comes great responsibility.\nalso: jj already has  undo. you don't need root.",
};

// ── SMART ARGUMENT PARSER ─────────────────────────────────────────────────
// Extracts -m "msg" or bare words as message from args array
function extractMsg(args, fallbackToRandom = true) {
  const mi = args.indexOf("-m");
  if (mi >= 0) {
    const m = args
      .slice(mi + 1)
      .join(" ")
      .replace(/^["']|["']$/g, "")
      .trim();
    return m || nm();
  }
  // bare words after command are treated as the message
  const bare = args
    .filter((a) => !a.startsWith("-"))
    .join(" ")
    .trim();
  return bare || (fallbackToRandom ? nm() : null);
}

// ── COMMAND HANDLER ───────────────────────────────────────────────────────
function handleCmd(raw) {
  // system
  if (raw === "clear") {
    termClear();
    return;
  }
  if (raw === "reset") {
    doReset();
    return;
  }
  if (raw === "history") {
    emit(
      "history",
      "dim",
      STATE.opLog.length
        ? STATE.opLog
            .slice()
            .reverse()
            .map((o, i) => `${i + 1}  ${o.type}`)
            .join("\n")
        : "(no ops recorded)",
    );
    return;
  }
  if (raw === "sandbox" || raw === "sandbox off") {
    emit(
      raw,
      "sys",
      raw === "sandbox"
        ? "sandbox: ALWAYS ON\n\nno real files, no real git. go wild."
        : "nice try. the sandbox cannot be disabled.",
    );
    return;
  }
  if (raw === "kill") {
    emit(
      "kill",
      "sys",
      "sending SIGTERM...\nerror: no process to kill.\nhint: try  reset  or  clear",
    );
    return;
  }
  if (raw === "ls" || raw === "ls -la") {
    emit(
      raw,
      "dim",
      "drwxr-xr-x  src/\ndrwxr-xr-x  tests/\n-rw-r--r--  README.md\n-rw-r--r--  package.json" +
        (STATE.mode !== "none"
          ? "\ndrwxr-xr-x  .git/" + (canJJ() ? "\ndrwxr-xr-x  .jj/" : "")
          : ""),
    );
    return;
  }
  if (raw === "pwd") {
    emit("pwd", "dim", "/home/user/my-project");
    return;
  }
  if (raw === "whoami") {
    emit("whoami", "dim", "developer (human, probably)");
    return;
  }
  if (raw === "date") {
    emit("date", "dim", new Date().toString());
    return;
  }
  if (raw === "cat readme" || raw === "cat README.md") {
    emit(
      raw,
      "dim",
      "# my-project\n\na work in progress.\nbut the commits are immaculate.",
    );
    return;
  }
  if (raw.startsWith("echo ")) {
    emit(raw, "dim", raw.slice(5));
    return;
  }
  if (raw === "help" || raw === "jj help" || raw === "git help") {
    termHelp();
    return;
  }

  // Normalize: expand bare keywords to jj/git prefix
  const JJ_BARE = [
    "log",
    "new",
    "describe",
    "edit",
    "status",
    "bookmark",
    "squash",
    "rebase",
    "undo",
    "op",
    "diff",
    "restore",
  ];
  const GIT_BARE = [
    "add",
    "commit",
    "branch",
    "checkout",
    "merge",
    "push",
    "pull",
    "stash",
    "fetch",
  ];

  let full = raw;
  if (!raw.startsWith("jj ") && !raw.startsWith("git ")) {
    const word = raw.split(/\s+/)[0];
    if (JJ_BARE.includes(word)) full = "jj " + raw;
    else if (GIT_BARE.includes(word)) full = "git " + raw;
  }

  const parts = full.split(/\s+/),
    base = parts.slice(0, 2).join(" "),
    args = parts.slice(2);

  // Easter eggs
  const eggKey = Object.keys(EASTER).find(
    (k) => full === k || full.startsWith(k + " "),
  );
  if (eggKey) {
    emit(raw, "egg", EASTER[eggKey]());
    return;
  }

  // Init
  if (full === "git init") {
    doInit("git");
    return;
  }
  if (full === "jj init" || full === "jj git init --colocate") {
    doInit(full === "jj init" ? "jj" : "both");
    return;
  }

  // Guard: repo not initialized
  if (STATE.mode === "none") {
    emit(
      raw,
      "err",
      "initialize first: git init | jj init | jj git init --colocate",
    );
    return;
  }

  // Find command definition
  const def = CMDS[base];
  if (!def) {
    emit(raw, "err", `unknown command: ${raw}\ntype  help  for all commands`);
    return;
  }
  if (def.needsJJ && !canJJ()) {
    emit(
      raw,
      "err",
      "jj not initialized — run  jj init  or  jj git init --colocate",
    );
    return;
  }
  if (def.needsGit && !canGit()) {
    emit(
      raw,
      "err",
      "git not initialized — run  git init  or  jj git init --colocate",
    );
    return;
  }

  const result = def.action(args);
  emit(raw, result.type, result.output);

  // Mark lessons
  const ldm = {
    "jj log": ["l1", "l2"],
    "jj new": ["l3"],
    "jj describe": ["l4"],
    "jj edit": ["l5"],
    "jj bookmark": ["l6"],
    "jj squash": ["l9"],
    "jj rebase": ["l8"],
    "jj undo": ["l10"],
    "jj op": ["l10", "l13"],
    "jj diff": ["l14"],
    "jj status": ["l12"],
    "git checkout": ["l7", "lg4"],
    "git commit": ["lg1"],
    "git stash": ["lg3"],
    "git merge": ["lg2"],
    "git init": ["lg0"],
    "git status": ["lg5"],
    "git add": ["lg6"],
    "git log": ["lg8"],
  };
  (ldm[base] || []).forEach((id) => markDone(id));
  if (base === "jj log") markDone("l1", "l2");
}

// ── COMMAND DEFINITIONS ───────────────────────────────────────────────────
const CMDS = {
  "jj log": {
    needsJJ: true,
    action() {
      const { commits, bookmarks, wcId } = STATE;
      const bmByC = {};
      Object.entries(bookmarks).forEach(([n, id]) => {
        if (!bmByC[id]) bmByC[id] = [];
        bmByC[id].push(n);
      });
      const lines = [...commits].reverse().map((c) => {
        const sym = c.id === wcId ? "@" : c.isRoot ? "◆" : "○";
        const bm = (bmByC[c.id] || []).map((b) => `[${b}]`).join(" ");
        return `${sym} ${c.id}  ${c.cid}  ${c.time.padEnd(9)} ${(c.isEmpty ? "(empty)" : c.msg).padEnd(18)} ${bm}`;
      });
      markDone("l1");
      markDone("l2");
      return { type: "ok", output: lines.join("\n") };
    },
  },
  "jj new": {
    needsJJ: true,
    action(a) {
      const wc = STATE.commits.find((c) => c.id === STATE.wcId);
      if (!wc) return { type: "err", output: "no working copy" };
      STATE.opLog.push({
        type: "snapshot",
        commits: JSON.parse(JSON.stringify(STATE.commits)),
        wcId: STATE.wcId,
        bookmarks: { ...STATE.bookmarks },
        branchLanes: { ...STATE.branchLanes },
        branch: STATE.branch,
      });
      const msg = extractMsg(a);
      const nId = genId();
      const lane = laneForNew(STATE.wcId);
      STATE.commits.push({
        id: nId,
        cid: genCid(),
        msg,
        parents: [STATE.wcId],
        isEmpty: false,
        time: "just now",
        lane,
      });
      STATE.wcId = nId;
      STATE.branch = "HEAD";
      markDone("l3");
      render();
      return {
        type: "ok",
        output: `Created: ${nId} — "${msg}"\nWorking copy now: ${nId}`,
      };
    },
  },
  "jj describe": {
    needsJJ: true,
    action(a) {
      const msg = extractMsg(a, true);
      const wc = STATE.commits.find((c) => c.id === STATE.wcId);
      if (!wc) return { type: "err", output: "no working copy" };
      STATE.opLog.push({
        type: "snapshot",
        commits: JSON.parse(JSON.stringify(STATE.commits)),
        wcId: STATE.wcId,
        bookmarks: { ...STATE.bookmarks },
        branchLanes: { ...STATE.branchLanes },
        branch: STATE.branch,
      });
      wc.msg = msg;
      wc.isEmpty = false;
      markDone("l4");
      render();
      return {
        type: "ok",
        output: `Working copy now has description: "${msg}"`,
      };
    },
  },
  "jj edit": {
    needsJJ: true,
    action(a) {
      const rev = a.filter((x) => !x.startsWith("-"))[0];
      if (!rev)
        return {
          type: "err",
          output:
            "usage: jj edit <rev-id>\n(or click any graph node to move @ instantly)",
        };
      const c = STATE.commits.find(
        (x) => x.id.startsWith(rev) || x.cid === rev,
      );
      if (!c)
        return {
          type: "err",
          output: `not found: ${rev}\nrun  log  to see all IDs`,
        };
      if (c.isRoot) return { type: "err", output: "cannot edit root commit" };
      STATE.opLog.push({ type: "move", from: STATE.wcId });
      STATE.wcId = c.id;
      markDone("l5");
      render();
      return {
        type: "ok",
        output: `Working copy: ${c.id} — ${c.isEmpty ? "(empty)" : c.msg}`,
      };
    },
  },
  "jj status": {
    needsJJ: true,
    action() {
      const wc = STATE.commits.find((c) => c.id === STATE.wcId);
      if (!wc) return { type: "err", output: "no working copy" };
      const par = STATE.commits.find((c) => c.id === wc.parents[0]);
      const bms = Object.entries(STATE.bookmarks)
        .filter(([, v]) => v === STATE.wcId)
        .map(([k]) => k);
      return {
        type: "ok",
        output: `Working copy  : ${wc.id}  ${wc.cid}\nDescription   : ${wc.isEmpty ? "(no description)" : wc.msg}\nParent commit : ${par ? par.id + " — " + (par.isRoot ? "root()" : par.msg) : "none"}\nBookmarks     : ${bms.length ? bms.join(", ") : "none"}\nHEAD          : ${STATE.branch === "HEAD" ? "detached (jj native)" : STATE.branch}`,
      };
    },
  },
  "jj bookmark": {
    needsJJ: true,
    action(a) {
      const sub = a[0];
      if (!sub || sub === "list") {
        const lines = Object.entries(STATE.bookmarks).map(([n, id]) => {
          const c = STATE.commits.find((x) => x.id === id);
          return `${n.padEnd(14)} ${id}  ${c ? c.msg : "?"}${id === STATE.wcId ? " ← @" : ""}`;
        });
        markDone("l6");
        return {
          type: "ok",
          output: lines.join("\n") || "(no bookmarks yet)",
        };
      }
      if (sub === "create" || sub === "set") {
        const name = a[1];
        if (!name)
          return { type: "err", output: `usage: bookmark ${sub} <name>` };
        STATE.opLog.push({
          type: "snapshot",
          commits: JSON.parse(JSON.stringify(STATE.commits)),
          wcId: STATE.wcId,
          bookmarks: { ...STATE.bookmarks },
          branchLanes: { ...STATE.branchLanes },
          branch: STATE.branch,
        });
        STATE.bookmarks[name] = STATE.wcId;
        render();
        markDone("l6");
        markDone("l11");
        return {
          type: "ok",
          output: `Bookmark "${name}" → ${STATE.wcId}`,
        };
      }
      if (sub === "delete") {
        const name = a[1];
        if (!STATE.bookmarks[name])
          return { type: "err", output: `not found: ${name}` };
        STATE.opLog.push({
          type: "snapshot",
          commits: JSON.parse(JSON.stringify(STATE.commits)),
          wcId: STATE.wcId,
          bookmarks: { ...STATE.bookmarks },
          branchLanes: { ...STATE.branchLanes },
          branch: STATE.branch,
        });
        delete STATE.bookmarks[name];
        render();
        return { type: "ok", output: `Deleted bookmark "${name}"` };
      }
      return {
        type: "err",
        output: `unknown: ${sub}. usage: bookmark list|create|set|delete`,
      };
    },
  },
  "jj squash": {
    needsJJ: true,
    action() {
      const wc = STATE.commits.find((c) => c.id === STATE.wcId);
      if (!wc || !wc.parents || !wc.parents.length)
        return { type: "err", output: "no parent" };
      const par = STATE.commits.find((c) => c.id === wc.parents[0]);
      if (!par || par.isRoot)
        return { type: "err", output: "cannot squash into root" };
      STATE.opLog.push({
        type: "snapshot",
        commits: JSON.parse(JSON.stringify(STATE.commits)),
        wcId: STATE.wcId,
        bookmarks: { ...STATE.bookmarks },
        branchLanes: { ...STATE.branchLanes },
        branch: STATE.branch,
      });
      if (!wc.isEmpty) par.msg = par.msg + " + " + wc.msg;
      STATE.commits
        .filter((c) => c.parents && c.parents.includes(wc.id))
        .forEach((c) => {
          c.parents = c.parents.map((p) => (p === wc.id ? par.id : p));
        });
      STATE.commits = STATE.commits.filter((c) => c.id !== wc.id);
      STATE.wcId = par.id;
      markDone("l9");
      render();
      return {
        type: "ok",
        output: `Squashed into: ${par.id} — "${par.msg}"`,
      };
    },
  },
  "jj rebase": {
    needsJJ: true,
    action(a) {
      const di = a.indexOf("-d");
      if (di === -1)
        return {
          type: "err",
          output:
            "usage: jj rebase -d <dest>\ndest can be a bookmark name or commit ID",
        };
      const dv = a[di + 1];
      if (!dv) return { type: "err", output: "provide destination after -d" };
      const dest =
        STATE.commits.find((c) => c.id.startsWith(dv) || c.cid === dv) ||
        (STATE.bookmarks[dv]
          ? STATE.commits.find((c) => c.id === STATE.bookmarks[dv])
          : null);
      if (!dest)
        return {
          type: "err",
          output: `not found: "${dv}"\nrun  log  or  bookmark list  to see valid IDs`,
        };
      const wc = STATE.commits.find((c) => c.id === STATE.wcId);
      if (!wc) return { type: "err", output: "no working copy" };
      if (dest.id === wc.id)
        return { type: "err", output: "cannot rebase onto self" };
      STATE.opLog.push({
        type: "snapshot",
        commits: JSON.parse(JSON.stringify(STATE.commits)),
        wcId: STATE.wcId,
        bookmarks: { ...STATE.bookmarks },
        branchLanes: { ...STATE.branchLanes },
        branch: STATE.branch,
      });
      wc.parents = [dest.id];
      wc.lane = dest.lane;
      markDone("l8");
      render();
      return {
        type: "ok",
        output: `Rebased ${wc.id} onto ${dest.id}\nNew parent: "${dest.isEmpty ? "(empty)" : dest.msg}"`,
      };
    },
  },
  "jj undo": {
    needsJJ: true,
    action() {
      const last = STATE.opLog[STATE.opLog.length - 1];
      if (!last) return { type: "err", output: "nothing to undo" };
      STATE.opLog.pop();
      if (last.type === "move") STATE.wcId = last.from;
      else if (last.type === "snapshot") {
        STATE.commits = last.commits;
        STATE.wcId = last.wcId;
        STATE.bookmarks = last.bookmarks;
        if (last.branchLanes) STATE.branchLanes = last.branchLanes;
        if (last.branch) STATE.branch = last.branch;
      }
      markDone("l10");
      render();
      return { type: "ok", output: "Undid last operation." };
    },
  },
  "jj op": {
    needsJJ: true,
    action(a) {
      if (a[0] === "log") {
        if (!STATE.opLog.length)
          return { type: "ok", output: "(no operations recorded yet)" };
        return {
          type: "ok",
          output: STATE.opLog
            .slice()
            .reverse()
            .map(
              (op, i) =>
                `${i}  ${op.type === "move" ? "jj edit (move @)" : "commit / rebase / bookmark"}`,
            )
            .join("\n"),
        };
      }
      if (a[0] === "undo") {
        const last = STATE.opLog[STATE.opLog.length - 1];
        if (!last) return { type: "err", output: "nothing to undo" };
        STATE.opLog.pop();
        if (last.type === "move") STATE.wcId = last.from;
        else if (last.type === "snapshot") {
          STATE.commits = last.commits;
          STATE.wcId = last.wcId;
          STATE.bookmarks = last.bookmarks;
        }
        render();
        return { type: "ok", output: "Undid." };
      }
      return {
        type: "ok",
        output: `${STATE.opLog.length} ops · usage: op log | op undo`,
      };
    },
  },
  "jj diff": {
    needsJJ: true,
    action() {
      const wc = STATE.commits.find((c) => c.id === STATE.wcId);
      return {
        type: "ok",
        output:
          wc && !wc.isEmpty
            ? `Changes in ${wc.id}: "${wc.msg}"\n\nModified files: (simulated — no real filesystem)\nuse  jj status  to see commit metadata`
            : "@ is empty — no changes yet.\nRun  describe  to set a message, then  new  to commit.",
      };
    },
  },
  "jj restore": {
    needsJJ: true,
    action() {
      return {
        type: "ok",
        output: "(simulated restore — no real filesystem)",
      };
    },
  },
  "git status": {
    needsGit: true,
    action() {
      const wc = STATE.commits.find((c) => c.id === STATE.wcId);
      return {
        type: "git",
        output: `On branch ${STATE.branch === "HEAD" ? "(HEAD detached at " + (wc ? wc.id : "?") + ")" : STATE.branch}\nnothing to commit (simulated)`,
      };
    },
  },
  "git log": {
    needsGit: true,
    action() {
      return {
        type: "git",
        output: [...STATE.commits]
          .reverse()
          .map(
            (c) =>
              `${c.id}${STATE.wcId === c.id ? " (HEAD)" : ""} ${c.isEmpty ? "(empty)" : c.msg}`,
          )
          .join("\n"),
      };
    },
  },
  "git branch": {
    needsGit: true,
    action(a) {
      if (!a.length || a[0] === "--list") {
        const bms = Object.keys(STATE.bookmarks);
        return {
          type: "git",
          output:
            (bms
              .map((b) => `${b === STATE.branch ? "* " : "  "}${b}`)
              .join("\n") || "(no branches)") +
            `\n${STATE.branch === "HEAD" ? "* (HEAD detached)" : ""}`,
        };
      }
      if (a[0] === "-d" || a[0] === "--delete") {
        const n = a[1];
        if (!n) return { type: "err", output: "provide branch name" };
        if (!STATE.bookmarks[n])
          return { type: "err", output: `branch not found: ${n}` };
        delete STATE.bookmarks[n];
        render();
        return { type: "git", output: `Deleted branch '${n}'.` };
      }
      return {
        type: "git",
        output: `Branch '${a[0]}' created (use git checkout ${a[0]} to switch)`,
      };
    },
  },
  "git checkout": {
    needsGit: true,
    action(a) {
      const isNew = a.includes("-b");
      const target = a.filter((x) => !x.startsWith("-"))[0];
      if (!target)
        return {
          type: "err",
          output: "usage: git checkout [-b] <branch>",
        };
      if (isNew) {
        STATE.opLog.push({
          type: "snapshot",
          commits: JSON.parse(JSON.stringify(STATE.commits)),
          wcId: STATE.wcId,
          bookmarks: { ...STATE.bookmarks },
          branchLanes: { ...STATE.branchLanes },
          branch: STATE.branch,
        });
        if (STATE.branchLanes[target] === undefined) {
          STATE.branchLanes[target] = STATE.nextLane++;
        }
        STATE.bookmarks[target] = STATE.wcId;
        STATE.branch = target;
        render();
        markDone("l7", "lg4");
        return {
          type: "git",
          output: `Switched to a new branch '${target}'\n\nCommits on this branch will appear on a new row.\nRun  git commit  to start building on this branch.`,
        };
      }
      if (target === "-") {
        const prev = STATE._prevBranch || "HEAD";
        STATE._prevBranch = STATE.branch;
        STATE.branch = prev;
        const bm = STATE.bookmarks[prev];
        if (bm) STATE.wcId = bm;
        render();
        return {
          type: "git",
          output: `Switched back to branch '${prev}'`,
        };
      }
      STATE._prevBranch = STATE.branch;
      const bm = STATE.bookmarks[target];
      if (bm) {
        STATE.branch = target;
        STATE.wcId = bm;
        if (STATE.branchLanes[target] === undefined)
          STATE.branchLanes[target] = STATE.nextLane++;
        render();
        markDone("l7", "lg4");
        return { type: "git", output: `Switched to branch '${target}'` };
      }
      // auto-create branch at current position
      STATE.opLog.push({
        type: "snapshot",
        commits: JSON.parse(JSON.stringify(STATE.commits)),
        wcId: STATE.wcId,
        bookmarks: { ...STATE.bookmarks },
        branchLanes: { ...STATE.branchLanes },
        branch: STATE.branch,
      });
      STATE.branch = target;
      if (STATE.branchLanes[target] === undefined)
        STATE.branchLanes[target] = STATE.nextLane++;
      STATE.bookmarks[target] = STATE.wcId;
      render();
      markDone("l7");
      return {
        type: "git",
        output: `Switched to (new) branch '${target}'`,
      };
    },
  },
  "git add": {
    needsGit: true,
    action() {
      return {
        type: "git",
        output: "(simulated staging — no real files)",
      };
    },
  },
  "git commit": {
    needsGit: true,
    action(a) {
      const wc = STATE.commits.find((c) => c.id === STATE.wcId);
      if (!wc) return { type: "err", output: "no working copy" };
      STATE.opLog.push({
        type: "snapshot",
        commits: JSON.parse(JSON.stringify(STATE.commits)),
        wcId: STATE.wcId,
        bookmarks: { ...STATE.bookmarks },
        branchLanes: { ...STATE.branchLanes },
        branch: STATE.branch,
      });
      const msg = extractMsg(a, true);
      const nId = genId();
      // If we ARE on a named branch and wcId IS that branch's tip → stay on same lane (linear extension)
      // Only fork if we're committing from a detached / behind-tip position
      const onTip =
        STATE.branch !== "HEAD" && STATE.bookmarks[STATE.branch] === STATE.wcId;
      const lane = onTip
        ? (STATE.branchLanes[STATE.branch] ?? 0)
        : laneForNew(STATE.wcId);
      STATE.commits.push({
        id: nId,
        cid: genCid(),
        msg,
        parents: [STATE.wcId],
        isEmpty: false,
        time: "just now",
        lane,
      });
      STATE.wcId = nId;
      if (STATE.branch !== "HEAD") STATE.bookmarks[STATE.branch] = nId;
      render();
      markDone("lg1");
      return {
        type: "git",
        output: `[${STATE.branch} ${nId}] ${msg}\n1 file changed (simulated)`,
      };
    },
  },
  "git push": {
    needsGit: true,
    action() {
      return {
        type: "git",
        output: "(simulated — no remote in sandbox)",
      };
    },
  },
  "git pull": {
    needsGit: true,
    action() {
      return { type: "git", output: "Already up to date. (simulated)" };
    },
  },
  "git fetch": {
    needsGit: true,
    action() {
      return {
        type: "git",
        output: "Fetching origin... (simulated)\nAlready up to date.",
      };
    },
  },
  "git stash": {
    needsGit: true,
    action(a) {
      if (a[0] === "pop")
        return { type: "git", output: "Restored stash@{0}. (simulated)" };
      if (a[0] === "list")
        return {
          type: "git",
          output: "stash@{0}: WIP on " + STATE.branch + " (simulated)",
        };
      markDone("lg3");
      return {
        type: "git",
        output: "Saved working directory state. (simulated)",
      };
    },
  },
  "git diff": {
    needsGit: true,
    action() {
      return {
        type: "git",
        output: "(simulated diff — no real filesystem)",
      };
    },
  },
  "git merge": {
    needsGit: true,
    action(a) {
      markDone("lg2");
      const target = a.filter((x) => !x.startsWith("-"))[0];
      if (!target) return { type: "err", output: "usage: git merge <branch>" };
      const bm = STATE.bookmarks[target];
      if (!bm)
        return {
          type: "git",
          output: `Merge: branch '${target}' not found locally (simulated)`,
        };
      const src = STATE.commits.find((c) => c.id === bm);
      if (src) {
        STATE.opLog.push({
          type: "snapshot",
          commits: JSON.parse(JSON.stringify(STATE.commits)),
          wcId: STATE.wcId,
          bookmarks: { ...STATE.bookmarks },
          branchLanes: { ...STATE.branchLanes },
          branch: STATE.branch,
        });
        const nId = genId();
        STATE.commits.push({
          id: nId,
          cid: genCid(),
          msg: `Merge branch '${target}'`,
          parents: [STATE.wcId, bm],
          isEmpty: false,
          time: "just now",
          lane: 0,
        });
        STATE.wcId = nId;
        if (STATE.branch !== "HEAD") STATE.bookmarks[STATE.branch] = nId;
        render();
        return {
          type: "git",
          output: `Merge made by the 'recursive' strategy.\nMerge commit: ${nId}`,
        };
      }
      return { type: "git", output: `(simulated merge of '${target}')` };
    },
  },
  "git rebase": {
    needsGit: true,
    action() {
      return { type: "git", output: "(simulated rebase)" };
    },
  },
};

// ── REFERENCE DATA ────────────────────────────────────────────────────────
// markDone is intentionally a no-op — goal tracking is handled by checkGoals() after every command
function markDone() {}

const REF_CMDS = [
  {
    cmd: "jj new",
    desc: "Create a new commit on top of @. Moves @ forward.",
    tag: "jj",
  },
  {
    cmd: 'jj new -m "msg"',
    desc: "Create a new commit with a specific message.",
    tag: "jj",
  },
  {
    cmd: "jj describe",
    desc: "Set the description of the current commit (@).",
    tag: "jj",
  },
  {
    cmd: "jj edit <id>",
    desc: "Move @ to any existing commit. No stash needed.",
    tag: "jj",
  },
  {
    cmd: "jj log",
    desc: "Show the revision graph with all commits and bookmarks.",
    tag: "jj",
  },
  {
    cmd: "jj status",
    desc: "Show working copy ID, parent, description, bookmarks.",
    tag: "jj",
  },
  { cmd: "jj squash", desc: "Fold @ into its parent commit.", tag: "jj" },
  {
    cmd: "jj rebase -d <dest>",
    desc: "Move @ onto a new parent commit or bookmark.",
    tag: "jj",
  },
  {
    cmd: "jj undo",
    desc: "Roll back the last operation (any kind).",
    tag: "jj",
  },
  {
    cmd: "jj op log",
    desc: "Show the full operation history — every action logged.",
    tag: "jj",
  },
  {
    cmd: "jj diff",
    desc: "Show what changed in @ vs its parent.",
    tag: "jj",
  },
  {
    cmd: "jj bookmark list",
    desc: "List all bookmarks (jj's version of branches).",
    tag: "jj",
  },
  {
    cmd: "jj bookmark create <n>",
    desc: "Place a new bookmark at @.",
    tag: "jj",
  },
  {
    cmd: "jj bookmark set <n>",
    desc: "Move an existing bookmark to @.",
    tag: "jj",
  },
  {
    cmd: "jj bookmark delete <n>",
    desc: "Remove a bookmark.",
    tag: "jj",
  },
  {
    cmd: "git init",
    desc: "Initialize an empty git repository.",
    tag: "git",
  },
  {
    cmd: "git status",
    desc: "Show branch, staged, unstaged, and untracked files.",
    tag: "git",
  },
  {
    cmd: "git add .",
    desc: "Stage all changes for the next commit.",
    tag: "git",
  },
  {
    cmd: "git commit",
    desc: "Create a commit from staged changes.",
    tag: "git",
  },
  {
    cmd: "git log",
    desc: "Show commit history. Use --oneline --graph for visual.",
    tag: "git",
  },
  {
    cmd: "git checkout -b <n>",
    desc: "Create a new branch and switch to it.",
    tag: "git",
  },
  {
    cmd: "git checkout <n>",
    desc: "Switch to an existing branch.",
    tag: "git",
  },
  {
    cmd: "git merge <branch>",
    desc: "Merge a branch into the current branch.",
    tag: "git",
  },
  {
    cmd: "git stash",
    desc: "Save uncommitted changes aside temporarily.",
    tag: "git",
  },
  {
    cmd: "git stash pop",
    desc: "Restore the most recent stash.",
    tag: "git",
  },
];

// ── GOAL-BASED LEVELS ─────────────────────────────────────────────────────
// Goal validators — each returns {met: bool, label: string}
const VALIDATORS = {
  commit_count: (n) => ({
    label: `make ${n} commit${n > 1 ? "s" : ""}`,
    met: () => STATE.commits.filter((c) => !c.isRoot && !c.isEmpty).length >= n,
  }),
  head_not_at_root: () => ({
    label: "move away from the initial empty commit",
    met: () => {
      const wc = STATE.commits.find((c) => c.id === STATE.wcId);
      return wc && !wc.isEmpty;
    },
  }),
  has_description: () => ({
    label: "give @ a description (not empty)",
    met: () => {
      const wc = STATE.commits.find((c) => c.id === STATE.wcId);
      return wc && !wc.isEmpty && wc.msg && wc.msg !== "(empty)";
    },
  }),
  head_behind_tip: () => ({
    label: "move @ back to an earlier commit",
    met: () => {
      const wc = STATE.commits.find((c) => c.id === STATE.wcId);
      if (!wc) return false;
      return STATE.commits.some(
        (c) => c.parents && c.parents.includes(STATE.wcId),
      );
    },
  }),
  fork_exists: () => ({
    label: "create a fork — two children from the same parent",
    met: () =>
      STATE.commits.some((c) => {
        const children = STATE.commits.filter(
          (x) => x.parents && x.parents.includes(c.id),
        );
        return children.length >= 2;
      }),
  }),
  bookmark_exists: (name) => ({
    label: name
      ? `create a bookmark named "${name}"`
      : "create at least one bookmark",
    met: () =>
      name ? !!STATE.bookmarks[name] : Object.keys(STATE.bookmarks).length > 0,
  }),
  bookmark_count: (n) => ({
    label: `create ${n} or more bookmarks`,
    met: () => Object.keys(STATE.bookmarks).length >= n,
  }),
  commit_count_decreased: (startN) => ({
    label: "reduce the number of commits (squash)",
    met: () => STATE.commits.filter((c) => !c.isRoot).length < startN,
  }),
  rebase_done: (targetBm) => ({
    label: `rebase @ onto "${targetBm}"`,
    met: () => {
      const wc = STATE.commits.find((c) => c.id === STATE.wcId);
      const dest = STATE.bookmarks[targetBm]
        ? STATE.commits.find((c) => c.id === STATE.bookmarks[targetBm])
        : null;
      if (!wc || !dest) return false;
      return wc.parents && wc.parents.includes(dest.id);
    },
  }),
  undo_done: (startOpCount) => ({
    label: "make at least one operation, then undo it",
    met: () => {
      // User must have done something (opLog grew) and then undone it (opLog shrank back)
      // We track the peak via a closure variable updated in checkGoals
      return (
        _undoPeakOpCount > _startOpCount &&
        STATE.opLog.length < _undoPeakOpCount
      );
    },
  }),
  merge_exists: () => ({
    label: "create a merge commit (two parents)",
    met: () => STATE.commits.some((c) => c.parents && c.parents.length >= 2),
  }),
  mode_initialized: (mode) => ({
    label:
      mode === "any" ? "initialize a repository" : "initialize with " + mode,
    met: () =>
      mode === "any"
        ? STATE.mode !== "none"
        : STATE.mode === mode || STATE.mode === "both",
  }),
  branch_has_commits: (bm, n) => ({
    label: `make ${n} commit${n > 1 ? "s" : ""} on branch "${bm}"`,
    met: () => {
      const tip = STATE.bookmarks[bm];
      if (!tip) return false;
      let c = STATE.commits.find((x) => x.id === tip),
        count = 0;
      while (c && !c.isRoot && !c.isEmpty) {
        count++;
        const par = STATE.commits.find((x) => x.id === c.parents[0]);
        c = par;
      }
      return count >= n;
    },
  }),
};

// Helper to build a validator object from a spec
function makeGoal(type, ...args) {
  const v = VALIDATORS[type](...args);
  return { type, args, label: v.label, met: v.met };
}

// Level definitions
const LEVELS = [
  {
    id: 0,
    title: "Hello, Repository",
    goal: "Initialize your first repository",
    desc: "Every project starts with <code>git init</code> or <code>jj init</code>. This creates the hidden structures that track your history. Try typing <b>git init</b> in the terminal below.",
    hint: "Type: <code>git init</code> or <code>jj init</code> or <code>jj git init --colocate</code>",
    startState: () => {},
    goals: [makeGoal("mode_initialized", "any")],
    successExplain:
      "The repository is born. You now have a root commit — the anchor of all future history.",
    tryCmd: "git init",
  },
  {
    id: 1,
    title: "Your First Commit",
    goal: "Create 2 commits",
    desc: "In git you need <code>git add</code> then <code>git commit</code>. In jj just type <code>new</code> — no staging needed. Watch the graph grow each time.",
    hint: "Type <code>git commit first change</code> then <code>git commit second change</code>",
    startState: () => {
      window._levelSetup && window._levelSetup("git");
    },
    goals: [makeGoal("commit_count", 2)],
    successExplain:
      "Each commit is a permanent snapshot. The graph shows the chain of history growing downward.",
    tryCmd: "git commit first change",
    needsMode: "git",
  },
  {
    id: 2,
    title: "Name Your Work",
    goal: "Give your commit a description",
    desc: "In jj, commits start empty — no staged files. Use <code>describe</code> to name what you're working on. The description is separate from the snapshot.",
    hint: "Type: <code>describe add login page</code>",
    startState: () => {
      window._levelSetup && window._levelSetup("jj");
    },
    goals: [makeGoal("has_description")],
    successExplain:
      "The description lives on the commit, not in a file. You can change it any time — even after rebasing.",
    tryCmd: "describe add login page",
    needsMode: "jj",
  },
  {
    id: 3,
    title: "Travel in Time",
    goal: "Move @ back to an earlier commit",
    desc: "In git you'd need <code>git checkout</code> or worry about detached HEAD. In jj just click any node, or type <code>edit &lt;id&gt;</code>. @ moves cleanly — no warnings.",
    hint: "Click any older commit in the graph, or type <code>edit</code> followed by the first 4 chars of an ID",
    startState: () => {
      window._levelSetup && window._levelSetup("jj", 3);
    },
    goals: [makeGoal("head_behind_tip")],
    successExplain:
      "@ is now on an older commit. Nothing is lost — you can always move forward again. This is jj's killer UX: movement is free.",
    tryCmd: "",
    needsMode: "jj",
  },
  {
    id: 4,
    title: "Fork the Timeline",
    goal: "Create a branch — two lines from the same parent",
    desc: "When you run <code>jj new</code> or <code>git commit</code> from a commit that already has children, history forks. This is how branches are born: two separate routes through time.",
    hint: "First use <code>jj edit</code> or click an earlier commit, then run <code>new</code>",
    startState: () => {
      window._levelSetup && window._levelSetup("jj", 3);
    },
    goals: [makeGoal("fork_exists")],
    successExplain:
      "Two routes diverge from the same parent. Each can evolve independently. This is the core of version control.",
    tryCmd: "new",
    needsMode: "jj",
  },
  {
    id: 5,
    title: "Label Your Branch",
    goal: 'Create a bookmark named "feature"',
    desc: "Bookmarks are jj's named pointers — like git branches, but they <b>don't auto-advance</b> when you commit. Use them to mark a specific line of work.",
    hint: "Type: <code>bookmark create feature</code>",
    startState: () => {
      window._levelSetup && window._levelSetup("jj", 3);
    },
    goals: [makeGoal("bookmark_exists", "feature")],
    successExplain:
      "The purple pill now marks your feature line. Unlike git branches, this won't move unless you explicitly call bookmark set.",
    tryCmd: "bookmark create feature",
    needsMode: "jj",
  },
  {
    id: 6,
    title: "Clean Up: Squash",
    goal: "Squash @ into its parent",
    desc: 'You\'ve made a "wip" commit you want to fold into the previous one. <code>squash</code> absorbs @ upward — the two commits become one, and the graph gets shorter.',
    hint: "Type: <code>squash</code>",
    startState: () => {
      window._levelSetup && window._levelSetup("jj", 3);
    },
    goals: [], // validated dynamically via startCommitCount
    successExplain:
      "Two commits became one. The change IDs are preserved — jj tracks intent, not just snapshots.",
    tryCmd: "squash",
    needsMode: "jj",
    dynamicGoal: "squash",
  },
  {
    id: 7,
    title: "Rebase: Replay on Main",
    goal: 'Rebase @ onto the "main" bookmark',
    desc: "Rebasing moves a commit to a new parent. In git this often means scary conflict hell. In jj, <code>rebase -d main</code> just rewires the parent pointer — conflicts stay inline.",
    hint: "Type: <code>rebase -d main</code>",
    startState: () => {
      window._levelSetup && window._levelSetup("jj-fork");
    },
    goals: [makeGoal("rebase_done", "main")],
    successExplain:
      "The commit is now parented to main. The graph rewired cleanly. No forced push, no scary warnings.",
    tryCmd: "rebase -d main",
    needsMode: "jj",
  },
  {
    id: 8,
    title: "Undo Everything",
    goal: "Make a commit, then undo it",
    desc: "The operation log records every mutation — commits, rebases, bookmark moves. <code>undo</code> reverses the last one. Run it multiple times to step back through history.",
    hint: "First run <code>new</code> to create a commit, then run <code>undo</code> to reverse it.",
    startState: () => {
      window._levelSetup && window._levelSetup("jj", 2);
    },
    goals: [],
    successExplain:
      "Nothing is ever truly lost in jj. The operation log is your safety net for everything.",
    tryCmd: "undo",
    needsMode: "jj",
    dynamicGoal: "undo",
  },
  {
    id: 9,
    title: "Git Branching Flow",
    goal: "Create a branch, make 2 commits, merge back",
    desc: "The classic git workflow: branch off, work, merge. Use <code>git checkout -b feature</code>, make commits, then <code>git checkout main</code> and <code>git merge feature</code>.",
    hint: "Step 1: <code>git checkout -b feature</code> → Step 2: commit twice → Step 3: <code>git checkout main</code> → Step 4: <code>git merge feature</code>",
    startState: () => {
      window._levelSetup && window._levelSetup("git");
    },
    goals: [
      makeGoal("bookmark_exists", "feature"),
      makeGoal("branch_has_commits", "feature", 2),
      makeGoal("merge_exists"),
    ],
    successExplain:
      "That's the full git flow. Compare: in jj you'd use bookmark create, jj new twice, rebase -d main. No merge commit needed.",
    tryCmd: "git checkout -b feature",
    needsMode: "git",
  },
];

// ── LEVEL STATE ───────────────────────────────────────────────────────────
let curLevel = 0,
  levelDone = [],
  hintShown = false,
  _dynamicGoalMet = false,
  _startCommitCount = 0,
  _startOpCount = 0,
  _undoPeakOpCount = 0;

// Setup helpers — prepare STATE for each level
window._levelSetup = function (mode, numCommits = 2) {
  cleanNodes();
  STATE = makeFreshState();
  firstRender = true;
  tBlockCount = 0;
  const log = document.getElementById("tlog");
  if (log) log.innerHTML = "";
  const overlay = document.getElementById("init-overlay"),
    hud = document.getElementById("ghud");
  if (mode === "jj-fork") {
    STATE.mode = "both";
    STATE.branchLanes = { main: 0, HEAD: 0, feature: 1 };
    STATE.nextLane = 2;
    makeRoot();
    let c = STATE.commits[1].id;
    ["init project", "add styles", "setup ci"].forEach((m) => {
      c = addC(m, c, 0);
      STATE.bookmarks.main = c;
    });
    const fork = addC(
      "start feature",
      STATE.commits.find((x) => x.msg === "setup ci").id,
      1,
      "2 days ago",
    );
    addC("add component", fork, 1, "1 day ago");
    const forkTip = STATE.commits[STATE.commits.length - 1].id;
    STATE.wcId = forkTip;
    STATE.bookmarks.feature = forkTip;
    STATE.branch = "HEAD";
    overlay.style.display = "none";
    hud.style.display = "";
    render();
    setTimeout(fitView, 60);
    return;
  }
  if (mode.startsWith("git")) {
    doInit("git");
    overlay.style.display = "none";
    hud.style.display = "";
    render();
    setTimeout(fitView, 60);
    return;
  }
  if (mode.startsWith("jj")) {
    doInit("both");
    let c = STATE.wcId;
    for (let i = 0; i < numCommits; i++) {
      const nId = genId();
      const msg = nm();
      STATE.commits.push({
        id: nId,
        cid: genCid(),
        msg,
        parents: [c],
        isEmpty: false,
        time: "just now",
        lane: 0,
      });
      c = nId;
    }
    STATE.wcId = c;
    STATE.bookmarks.main = c;
    overlay.style.display = "none";
    hud.style.display = "";
    render();
    setTimeout(fitView, 60);
    return;
  }
};

// ── LEVEL UI ──────────────────────────────────────────────────────────────
function renderLevelMap() {
  const map = document.getElementById("level-map");
  if (!map) return;
  let h = "";
  LEVELS.forEach((lv, i) => {
    const done = levelDone.includes(i),
      active = i === curLevel,
      locked = i > 0 && !levelDone.includes(i - 1) && i !== curLevel;
    if (i > 0)
      h += `<div class="level-line${levelDone.includes(i - 1) ? " done" : ""}"></div>`;
    h += `<div class="level-row">
      <div class="level-dot${done ? " done" : active ? " active" : locked ? " locked" : ""}" onclick="${locked ? "" : "levelGo(" + i + ")"}" title="${lv.title}">${done ? "✓" : i + 1}</div>
      <div class="level-info">
        <div class="level-title" style="color:${active ? "var(--ink)" : locked ? "var(--ink3)" : "var(--ink2)"}">${lv.title}</div>
        <div class="level-sub">${lv.goal}</div>
      </div>
    </div>`;
  });
  map.innerHTML = h;
  const fill = document.getElementById("level-progress-fill");
  if (fill)
    fill.style.width = `${Math.round((levelDone.length / LEVELS.length) * 100)}%`;
}

function renderLevelDetail() {
  const det = document.getElementById("level-detail");
  if (!det) return;
  const lv = LEVELS[curLevel];
  if (!lv) return;
  const done = levelDone.includes(curLevel);
  hintShown = false;
  const goals = getLevelGoals();
  const checksHtml = goals
    .map((g) => {
      const met = g.met();
      return `<div class="goal-check${met ? " met" : ""}">
      <div class="gc-icon">${met ? "✓" : "·"}</div>
      <span>${g.label}</span>
    </div>`;
    })
    .join("");
  det.innerHTML = `
    <div class="ld-badge${done ? " done" : " active"}">${done ? "✓ completed" : "▶ active — level " + (curLevel + 1) + " of " + LEVELS.length}</div>
    <div class="ld-title">${lv.title}</div>
    <div class="ld-goal-box">
      <div class="ld-goal-label">goal</div>
      <div class="ld-goal-text">${lv.goal}</div>
    </div>
    <div class="ld-desc">${lv.desc}</div>
    <div class="goal-checks" id="goal-checks">${checksHtml}</div>
    <div class="hint-row">
      <button class="hint-btn" onclick="toggleHint()">💡 hint</button>
      <div class="hint-text" id="hint-text">${lv.hint}</div>
    </div>`;
  const prog = document.getElementById("lf-prog");
  if (prog) prog.textContent = `${levelDone.length} / ${LEVELS.length}`;
  const fill = document.getElementById("level-progress-fill");
  if (fill)
    fill.style.width = `${Math.round((levelDone.length / LEVELS.length) * 100)}%`;
  document.getElementById("level-success").classList.remove("show");
}

function getLevelGoals() {
  const lv = LEVELS[curLevel];
  let goals = [...lv.goals];
  if (lv.dynamicGoal === "squash") {
    goals = [makeGoal("commit_count_decreased", _startCommitCount)];
  } else if (lv.dynamicGoal === "undo") {
    goals = [makeGoal("undo_done", _startOpCount)];
  }
  return goals;
}

window.levelGo = function (i) {
  if (i > 0 && !levelDone.includes(i - 1) && i !== curLevel) return; // locked
  curLevel = i;
  hintShown = false;
  _dynamicGoalMet = false;
  _undoPeakOpCount = 0;
  const lv = LEVELS[curLevel];
  // setup state for this level FIRST, then capture baselines after setup
  if (lv.startState) lv.startState();
  // capture dynamic baseline AFTER setup so user must actually do something to change them
  _startCommitCount = STATE.commits.filter((c) => !c.isRoot).length;
  _startOpCount = STATE.opLog.length;
  renderLevelMap();
  renderLevelDetail();
};

window.levelNext = function () {
  if (curLevel < LEVELS.length - 1) {
    levelGo(curLevel + 1);
  }
};
window.levelSkip = function () {
  if (!levelDone.includes(curLevel)) levelDone.push(curLevel);
  if (curLevel < LEVELS.length - 1) levelGo(curLevel + 1);
  else {
    renderLevelMap();
    renderLevelDetail();
  }
};
window.levelTryIt = function () {
  const lv = LEVELS[curLevel];
  if (lv.tryCmd) {
    tinput.value = lv.tryCmd;
    tinput.focus();
    acUpdate(lv.tryCmd);
  }
};
window.toggleHint = function () {
  hintShown = !hintShown;
  const el = document.getElementById("hint-text");
  if (el) el.classList.toggle("show", hintShown);
};

function checkGoals() {
  const lv = LEVELS[curLevel];
  if (!lv) return;
  if (levelDone.includes(curLevel)) return;
  // Track peak opLog for undo level
  if (STATE.opLog.length > _undoPeakOpCount)
    _undoPeakOpCount = STATE.opLog.length;
  const goals = getLevelGoals();
  const allMet = goals.length === 0 ? false : goals.every((g) => g.met());
  // refresh checklist
  const checks = document.querySelectorAll(".goal-check");
  goals.forEach((g, i) => {
    if (checks[i]) {
      const met = g.met();
      checks[i].className = "goal-check" + (met ? " met" : "");
      const icon = checks[i].querySelector(".gc-icon");
      if (icon) icon.textContent = met ? "✓" : "·";
    }
  });
  if (allMet) {
    levelDone.push(curLevel);
    const succ = document.getElementById("level-success");
    document.getElementById("ls-title").textContent = lv.title + " — complete!";
    document.getElementById("ls-explain").textContent = lv.successExplain;
    succ.classList.add("show");
    renderLevelMap();
    const prog = document.getElementById("lf-prog");
    if (prog) prog.textContent = `${levelDone.length} / ${LEVELS.length}`;
    const fill = document.getElementById("level-progress-fill");
    if (fill)
      fill.style.width = `${Math.round((levelDone.length / LEVELS.length) * 100)}%`;
    // hide next button if last level — show all-done overlay instead
    const nextBtn = succ.querySelector(".ls-next");
    if (nextBtn)
      nextBtn.style.display = curLevel === LEVELS.length - 1 ? "none" : "";
    if (curLevel === LEVELS.length - 1) {
      setTimeout(() => {
        succ.classList.remove("show");
        document.getElementById("alldone-overlay").classList.add("show");
      }, 2200);
    }
  }
}

// ── REFERENCE PANEL ───────────────────────────────────────────────────────
function renderRefList(filter = "") {
  const list = document.getElementById("ref-list");
  if (!list) return;
  const q = filter.toLowerCase().trim();
  const items = q
    ? REF_CMDS.filter(
        (r) =>
          r.cmd.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q),
      )
    : REF_CMDS;
  list.innerHTML =
    items
      .map(
        (
          r,
        ) => `<div class="ref-item" onclick="refTryCmd('${r.cmd.replace(/'/g, "\\'").split(" ")[0]} ')">
    <div class="ref-cmd">${r.cmd}<span class="ref-tag">${r.tag}</span></div>
    <div class="ref-desc">${r.desc}</div>
  </div>`,
      )
      .join("") ||
    '<div style="padding:20px;font-size:12px;color:var(--ink3);text-align:center">no matches</div>';
}
window.refSearch = function (q) {
  renderRefList(q);
};
window.refTryCmd = function (cmd) {
  tinput.value = cmd;
  tinput.focus();
  acUpdate(cmd);
};

// ── MODE TOGGLE ───────────────────────────────────────────────────────────
window.lpSetMode = function (mode) {
  document.getElementById("lp-levels-view").style.display =
    mode === "levels" ? "flex" : "none";
  document.getElementById("lp-ref-view").style.display =
    mode === "ref" ? "flex" : "none";
  document
    .getElementById("mode-levels")
    .classList.toggle("active", mode === "levels");
  document
    .getElementById("mode-ref")
    .classList.toggle("active", mode === "ref");
  if (mode === "ref") renderRefList();
};

// ── POST-COMMAND ANNOTATION ───────────────────────────────────────────────
let _annoTimer = null;
function showAnnotation(html) {
  const el = document.getElementById("cmd-annotation");
  if (!el) return;
  el.innerHTML = html;
  el.classList.add("show");
  if (_annoTimer) clearTimeout(_annoTimer);
  _annoTimer = setTimeout(() => el.classList.remove("show"), 3500);
}

function annotateCmd(raw, prevState, newState) {
  const prevCommits = prevState.commits.filter((c) => !c.isRoot);
  const newCommits = newState.commits.filter((c) => !c.isRoot);
  const added = newCommits.filter(
    (c) => !prevCommits.find((p) => p.id === c.id),
  );
  const removed = prevCommits.filter(
    (c) => !newCommits.find((n) => n.id === c.id),
  );
  const prevWc = prevState.wcId,
    newWc = newState.wcId;
  const wcMoved = prevWc !== newWc;
  const commitCountDiff = newCommits.length - prevCommits.length;
  const prevBms = prevState.bookmarks,
    newBms = newState.bookmarks;
  const bmsAdded = Object.keys(newBms).filter((k) => !prevBms[k]);
  const bmsMoved = Object.keys(newBms).filter(
    (k) => prevBms[k] && prevBms[k] !== newBms[k],
  );
  const parts = [];
  if (added.length === 1) {
    const c = added[0];
    const laneLabel =
      c.lane > 0
        ? ` <span class="ca-dim">(new branch — lane ${c.lane})</span>`
        : "";
    parts.push(
      `<span class="ca-action">new commit</span> ${c.id} — "${c.isEmpty ? "(empty)" : c.msg}"${laneLabel}`,
    );
  } else if (added.length > 1) {
    parts.push(`<span class="ca-action">${added.length} commits added</span>`);
  }
  if (removed.length === 1) {
    parts.push(
      `<span class="ca-action">squashed</span> ${removed[0].id} into parent`,
    );
  }
  if (wcMoved && !added.length && !removed.length) {
    const dest = newState.commits.find((c) => c.id === newWc);
    parts.push(
      `<span class="ca-action">@ moved</span> to ${newWc} — "${dest ? dest.msg : "?"}"`,
    );
  }
  if (bmsAdded.length) {
    parts.push(
      `<span class="ca-action">bookmark created</span> "${bmsAdded.join('", "')}"`,
    );
  }
  if (bmsMoved.length) {
    parts.push(
      `<span class="ca-action">bookmark moved</span> "${bmsMoved.join('", "')}" → ${newBms[bmsMoved[0]]}`,
    );
  }
  if (prevState.branch !== newState.branch) {
    parts.push(
      `<span class="ca-action">branch</span> ${prevState.branch} → ${newState.branch}`,
    );
  }
  if (parts.length) showAnnotation(parts.join("<br>"));
}

// Wrap handleCmd to capture before/after state and show annotation
const _origHandleCmd = handleCmd;
window.handleCmd = function (raw) {
  const before = JSON.parse(
    JSON.stringify({
      commits: STATE.commits,
      wcId: STATE.wcId,
      bookmarks: { ...STATE.bookmarks },
      branch: STATE.branch,
    }),
  );
  _origHandleCmd(raw);
  const after = {
    commits: STATE.commits,
    wcId: STATE.wcId,
    bookmarks: STATE.bookmarks,
    branch: STATE.branch,
  };
  annotateCmd(raw, before, after);
  checkGoals();
};

// Wrap render to auto-check goals after every graph update
const _origRender = render;
window.render = function () {
  _origRender();
  checkGoals();
};

// ── BOOT ──────────────────────────────────────────────────────────────────
renderLevelMap();
levelGo(0);
renderRefList();
updateToolbar();
updatePrompt();
updateInfoBar();
emit(
  "jj revision mind tree",
  "dim",
  "simulator v6 · goal-based levels active\ntype commands or press ▸ try it · click any node · 🎯 follow the levels panel",
);
