/* Sum — send links here, see the sum of what you've been into.
   Everything is stored on this device (localStorage). No account, no server. */
(() => {
  'use strict';

  const KEY = 'sum.v1';
  const DAY = 864e5;

  const TOPICS = [
    { id: 'food', label: 'Food', emoji: '🍝', kw: 'recipe cook cooking pasta carbonara dinner lunch breakfast brunch bake baking meal chef kitchen food foodtok eat sauce chicken noodle dessert coffee cocktail restaurant airfryer snack' },
    { id: 'pets', label: 'Pets', emoji: '🐶', kw: 'dog puppy cat kitten pet pets vet animal leash grooming dogtok paw bird rescue' },
    { id: 'body', label: 'Body', emoji: '💪', kw: 'workout gym run running lift lifting fitness yoga stretch mobility protein sleep health pilates physio posture cardio' },
    { id: 'mind', label: 'Mind', emoji: '🧠', kw: 'adhd anxiety therapy mental mindful meditation habit focus productivity burnout journal relax relaxation dopamine calm stress' },
    { id: 'home', label: 'Home', emoji: '🪴', kw: 'diy home decor clean cleaning organize garden plant renovation furniture apartment ikea declutter' },
    { id: 'style', label: 'Style', emoji: '👟', kw: 'outfit fashion style skincare makeup hair thrift sneaker ootd beauty wardrobe' },
    { id: 'travel', label: 'Travel', emoji: '✈️', kw: 'travel trip flight hotel itinerary beach roadtrip japan europe airbnb hike hiking camping' },
    { id: 'money', label: 'Money & work', emoji: '💼', kw: 'money invest investing budget career job salary startup business hustle finance stock crypto tax freelance' },
    { id: 'tech', label: 'Tech', emoji: '🤖', kw: 'ai tech code coding app iphone android gadget software programming chatgpt claude robot automation' },
    { id: 'funny', label: 'Funny', emoji: '😂', kw: 'meme funny comedy joke lol prank skit humor' },
    { id: 'music', label: 'Music', emoji: '🎧', kw: 'song music dance cover guitar piano concert dj playlist singing remix' },
    { id: 'art', label: 'Art & design', emoji: '🎨', kw: 'art design draw drawing paint painting photography film architecture typography animation craft pottery' },
    { id: 'learn', label: 'Learning', emoji: '📚', kw: 'history science explained fact facts learn language book books documentary math space psychology philosophy' },
    { id: 'play', label: 'Games & sport', emoji: '🎮', kw: 'game gaming football basketball soccer f1 nba tennis esports minecraft chess' },
  ];

  const PLATFORMS = {
    instagram: { label: 'Instagram', glyph: '📸' },
    tiktok: { label: 'TikTok', glyph: '🎵' },
    youtube: { label: 'YouTube', glyph: '▶️' },
    facebook: { label: 'Facebook', glyph: '👥' },
    x: { label: 'X', glyph: '✖️' },
    reddit: { label: 'Reddit', glyph: '👽' },
    pinterest: { label: 'Pinterest', glyph: '📌' },
    threads: { label: 'Threads', glyph: '🧵' },
    web: { label: 'Web', glyph: '🔗' },
  };

  /* ---------- state ---------- */
  let state = { items: [], topics: [] };
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (saved && Array.isArray(saved.items)) state = { items: saved.items, topics: saved.topics || [] };
  } catch (e) { /* start fresh */ }

  const save = () => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { toast('Could not save — storage is full or blocked'); }
  };

  let tab = 'pulse';
  let libQuery = '';
  let libTopic = '';
  let wrappedYear = null;

  const allTopics = () => TOPICS.concat(state.topics);
  const topicById = (id) => allTopics().find((t) => t.id === id);

  /* ---------- helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = (u) => (/^https?:\/\//i.test(u || '') ? u : '');
  const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => el.classList.remove('show'), 2600);
  }

  function ago(ts) {
    const d = Math.floor((Date.now() - ts) / DAY);
    if (d <= 0) return 'today';
    if (d === 1) return 'yesterday';
    if (d < 7) return `${d} days ago`;
    if (d < 60) return `${Math.floor(d / 7)} wk ago`;
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  }

  /* ---------- links ---------- */
  const TRACKING = /^(utm_.*|igsh|igshid|si|fbclid|gclid|_t|_r|share_id|share_app_id|share_item_id|share_link_id|is_from_webapp|sender_device|mibextid|feature|pp|ref|ref_src|s|t)$/i;

  function parseLink(raw) {
    let u;
    try { u = new URL(raw.trim().replace(/[)\].,!?]+$/, '')); } catch (e) { return null; }
    if (!/^https?:$/.test(u.protocol)) return null;
    const host = u.hostname.replace(/^(www|m|mobile|l)\./, '').toLowerCase();
    const isYouTube = /(^|\.)youtube\.com$|^youtu\.be$/.test(host);
    [...u.searchParams.keys()].forEach((k) => {
      if (isYouTube && (k === 'v' || k === 't')) return;
      if (TRACKING.test(k)) u.searchParams.delete(k);
    });
    u.hash = '';
    const path = u.pathname;
    let platform = 'web', kind = 'link', author = '';
    if (/(^|\.)instagram\.com$/.test(host)) {
      platform = 'instagram';
      kind = /\/reels?\//.test(path) ? 'reel' : /\/p\//.test(path) ? 'post' : /\/stories\//.test(path) ? 'story' : 'link';
      const m = path.match(/^\/([^/]+)\/(reel|p)\//);
      if (m) author = '@' + m[1];
    } else if (/(^|\.)tiktok\.com$/.test(host)) {
      platform = 'tiktok'; kind = 'video';
      const m = path.match(/^\/(@[^/]+)/);
      if (m) author = m[1];
    } else if (isYouTube) {
      platform = 'youtube';
      kind = /\/shorts\//.test(path) ? 'short' : 'video';
    } else if (/(^|\.)(facebook\.com|fb\.watch|fb\.com)$/.test(host)) {
      platform = 'facebook';
      kind = /reel/.test(path) ? 'reel' : /watch|videos|fb\.watch/.test(host + path) ? 'video' : 'post';
    } else if (/(^|\.)(x\.com|twitter\.com)$/.test(host)) { platform = 'x'; kind = 'post'; }
    else if (/(^|\.)(reddit\.com|redd\.it)$/.test(host)) { platform = 'reddit'; kind = 'post'; }
    else if (/(^|\.)(pinterest\.[a-z.]+|pin\.it)$/.test(host)) { platform = 'pinterest'; kind = 'pin'; }
    else if (/(^|\.)threads\.(net|com)$/.test(host)) { platform = 'threads'; kind = 'post'; }
    return { url: u.toString(), host, platform, kind, author };
  }

  function classify(text) {
    const words = (text || '').toLowerCase().match(/[a-z0-9]+/g) || [];
    if (!words.length) return [];
    const scored = allTopics().map((t) => {
      const kws = (t.kw || '').split(/\s+/).filter(Boolean);
      let score = 0;
      for (const w of words) {
        for (const k of kws) {
          if (w === k || w === k + 's' || (k.length >= 4 && w.startsWith(k) && w.length <= k.length + 4)) { score++; break; }
        }
      }
      return { id: t.id, score };
    }).filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
    return scored.slice(0, 2).map((s) => s.id);
  }

  const textOf = (it) => [it.title, it.shared, it.note, it.author].filter(Boolean).join(' ');

  function displayTitle(it) {
    if (it.title) return it.title;
    if (it.note) return it.note;
    if (it.shared) return it.shared;
    const p = PLATFORMS[it.platform] || PLATFORMS.web;
    return it.platform === 'web' ? it.host : `${p.label} ${it.kind}`;
  }

  /* Best-effort title/creator lookup from public oEmbed endpoints.
     Instagram and Facebook don't offer one without an app token, so those stay as-is. */
  async function enrich(it) {
    if (it.platform === 'instagram' || it.platform === 'facebook') return;
    const endpoints = [];
    if (it.platform === 'tiktok') endpoints.push('https://www.tiktok.com/oembed?url=');
    endpoints.push('https://noembed.com/embed?url=');
    for (const ep of endpoints) {
      try {
        const res = await fetch(ep + encodeURIComponent(it.url));
        if (!res.ok) continue;
        const d = await res.json();
        if (!d || d.error || !(d.title || d.author_name)) continue;
        if (d.title && !it.title) it.title = String(d.title).slice(0, 300);
        if (d.author_name && !it.author) it.author = String(d.author_name).slice(0, 80);
        if (safeUrl(d.thumbnail_url)) it.thumb = d.thumbnail_url;
        if (!it.manual) it.topics = classify(textOf(it));
        save(); render(); refreshSheet(it);
        return;
      } catch (e) { /* offline or blocked — fine */ }
    }
  }

  function addLink(raw, extra = {}) {
    const parsed = parseLink(raw);
    if (!parsed) { toast("That doesn't look like a link"); return null; }
    const dupe = state.items.find((i) => i.url === parsed.url);
    if (dupe) {
      dupe.resent = (dupe.resent || 0) + 1;
      save();
      toast(`Already here — you sent this ${ago(dupe.at)}`);
      openSheet(dupe.id, false);
      return dupe;
    }
    const it = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      at: Date.now(),
      ...parsed,
      title: (extra.title || '').slice(0, 300),
      shared: (extra.shared || '').slice(0, 300),
      note: '', thumb: '', topics: [], manual: false,
    };
    it.topics = classify(textOf(it));
    state.items.unshift(it);
    save(); render();
    openSheet(it.id, true);
    enrich(it);
    return it;
  }

  /* Share sheet (Android), iOS Shortcut and bookmarklet all land here as ?url=&text=&title= */
  function captureFromUrl() {
    const p = new URLSearchParams(location.search);
    const title = p.get('title') || '';
    const text = p.get('text') || '';
    const blob = [p.get('url'), text, title].filter(Boolean).join(' ');
    const m = blob.match(/https?:\/\/[^\s]+/);
    if (p.has('url') || p.has('text') || p.has('title')) history.replaceState(null, '', location.pathname);
    if (!m) return;
    const shared = text.replace(/https?:\/\/[^\s]+/g, '').trim();
    addLink(m[0], { title: /^https?:\/\//.test(title) ? '' : title, shared });
  }

  /* ---------- stats ---------- */
  const between = (from, to) => state.items.filter((i) => i.at >= from && i.at < to);

  function topicCounts(items) {
    const c = {};
    items.forEach((i) => (i.topics.length ? i.topics : ['_unsorted']).forEach((t) => { c[t] = (c[t] || 0) + 1; }));
    return c;
  }

  function countBy(items, fn) {
    const c = {};
    items.forEach((i) => { const k = fn(i); if (k) c[k] = (c[k] || 0) + 1; });
    return Object.entries(c).sort((a, b) => b[1] - a[1]);
  }

  /* 0–100: how spread out your topics are (normalised Shannon entropy). */
  function rangeScore(items) {
    const c = topicCounts(items);
    delete c._unsorted;
    const vals = Object.values(c);
    const total = vals.reduce((a, b) => a + b, 0);
    if (total < 5) return null;
    const h = -vals.reduce((a, v) => a + (v / total) * Math.log(v / total), 0);
    return Math.min(100, Math.round((h / Math.log(allTopics().length)) * 100));
  }
  const rangeLabel = (s) => (s < 35 ? 'Deep in one lane' : s < 65 ? 'A few lanes' : 'Wide-ranging');

  function longestStreak(items) {
    const days = [...new Set(items.map((i) => Math.floor((i.at - new Date(i.at).getTimezoneOffset() * 6e4) / DAY)))].sort((a, b) => a - b);
    let best = 0, run = 0, prev = null;
    days.forEach((d) => { run = prev !== null && d === prev + 1 ? run + 1 : 1; best = Math.max(best, run); prev = d; });
    return best;
  }

  const DAYPARTS = [['Morning', 5, 12], ['Afternoon', 12, 17], ['Evening', 17, 22], ['Late night', 22, 29]];
  function dayparts(items) {
    return DAYPARTS.map(([label, a, b]) => [label, items.filter((i) => { let h = new Date(i.at).getHours(); if (h < 5) h += 24; return h >= a && h < b; }).length]);
  }

  const topicName = (id) => { const t = topicById(id); return t ? `${t.emoji} ${t.label}` : id === '_unsorted' ? '❔ Unsorted' : id; };

  /* ---------- views ---------- */
  function bars(rows, max) {
    return rows.map(([name, n, extra]) => `
      <div class="row"><div class="name">${esc(name)}</div>
      <div class="bar"><b style="width:${max ? Math.max(3, (n / max) * 100) : 0}%"></b></div>
      <div class="n">${n}${extra || ''}</div></div>`).join('');
  }

  function viewPulse() {
    if (!state.items.length) {
      return `<div class="hero"><div class="eyebrow">Welcome</div>
        <h1>Send it here. <em>See the sum of you.</em></h1>
        <p class="sub">Every reel, TikTok or video you bother to share is a signal. Share it to Sum instead of your saved folder and it gets sorted, counted and findable.</p></div>
        <div class="card"><h2>Start</h2><div class="btnrow">
          <button class="btn" data-act="add">Paste your first link</button>
          <button class="ghost" data-act="sample">See it with sample data</button>
          <button class="ghost" data-act="goto" data-to="setup">How to share from apps</button></div></div>`;
    }
    const now = Date.now();
    const cur = between(now - 30 * DAY, now + 1);
    const prev = between(now - 60 * DAY, now - 30 * DAY);
    const cc = topicCounts(cur), pc = topicCounts(prev);
    const ranked = Object.entries(cc).filter(([k]) => k !== '_unsorted').sort((a, b) => b[1] - a[1]);

    let headline;
    if (!cur.length) headline = 'Quiet month. <em>Nothing sent yet.</em>';
    else if (!ranked.length) headline = `${plural(cur.length, 'thing')} sent, <em>none sorted yet.</em>`;
    else headline = `Mostly <em>${esc(topicName(ranked[0][0]))}</em>${ranked[1] ? `, then ${esc(topicName(ranked[1][0]))}` : ''}.`;

    const ids = [...new Set(Object.keys(cc).concat(Object.keys(pc)))].filter((k) => k !== '_unsorted');
    const deltas = ids.map((id) => ({ id, c: cc[id] || 0, p: pc[id] || 0 }));
    const lines = [];
    deltas.filter((d) => d.p === 0 && d.c >= 2).sort((a, b) => b.c - a.c).slice(0, 2)
      .forEach((d) => lines.push(`<span class="up">New</span> — ${esc(topicName(d.id))} showed up ${d.c} times. Nothing the month before.`));
    deltas.filter((d) => d.p > 0 && d.c > d.p).sort((a, b) => (b.c - b.p) - (a.c - a.p)).slice(0, 2)
      .forEach((d) => lines.push(`<span class="up">↑</span> More ${esc(topicName(d.id))}: ${d.c}, up from ${d.p}.`));
    deltas.filter((d) => d.c < d.p).sort((a, b) => (b.p - b.c) - (a.p - a.c)).slice(0, 2)
      .forEach((d) => lines.push(`<span class="down">↓</span> Less ${esc(topicName(d.id))}: ${d.c}, down from ${d.p}.`));

    const score = rangeScore(cur);
    const weeks = Array.from({ length: 12 }, (_, i) => between(now - (12 - i) * 7 * DAY, now - (11 - i) * 7 * DAY + (i === 11 ? 1 : 0)).length);
    const wmax = Math.max(1, ...weeks);
    const unsorted = state.items.filter((i) => !i.topics.length).length;
    const plats = countBy(cur, (i) => (PLATFORMS[i.platform] || PLATFORMS.web).label);
    const parts = dayparts(cur);

    return `<div class="hero"><div class="eyebrow">Last 30 days</div><h1>${headline}</h1>
      <p class="sub">${plural(cur.length, 'thing')} sent · ${prev.length} the 30 days before</p></div>
      <input class="field" id="find" type="search" placeholder="Find that thing… carbonara, dog, stretch" enterkeyhint="search">
      <div style="height:12px"></div>
      <div class="two">
        <div class="card"><h2>Range</h2>${score === null
          ? `<div class="big">–</div><div class="cap">Needs 5 sorted sends this month</div>`
          : `<div class="big">${score}<small> /100</small></div><div class="cap">${rangeLabel(score)}</div>`}</div>
        <div class="card"><h2>Sends per week</h2><div class="spark" role="img" aria-label="Sends per week, last 12 weeks: ${weeks.join(', ')}">
          ${weeks.map((n, i) => `<i class="${i === 11 ? 'now' : ''}" style="height:${(n / wmax) * 100}%" title="${n}"></i>`).join('')}</div>
          <div class="cap">12 weeks · this week ${weeks[11]}</div></div>
      </div>
      ${lines.length ? `<div class="card"><h2>What changed</h2><ul class="changes">${lines.map((l) => `<li>${l}</li>`).join('')}</ul></div>` : ''}
      ${ranked.length ? `<div class="card"><h2>Your mix</h2>${bars(ranked.map(([id, n]) => [topicName(id), n, ` <span>· was ${pc[id] || 0}</span>`]), ranked[0][1])}</div>` : ''}
      ${unsorted ? `<div class="card cta"><div><strong>${unsorted} unsorted</strong><div class="cap">One tap each. No folders.</div></div><button class="btn" data-act="unsorted">Sort them</button></div>` : ''}
      ${plats.length ? `<div class="card"><h2>Where from</h2>${bars(plats, plats[0][1])}</div>` : ''}
      ${cur.length ? `<div class="card"><h2>When you send</h2>${bars(parts, Math.max(...parts.map((p) => p[1])))}</div>` : ''}`;
  }

  function itemCard(it) {
    const p = PLATFORMS[it.platform] || PLATFORMS.web;
    const thumb = safeUrl(it.thumb) ? `<img src="${esc(it.thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : p.glyph;
    const chips = it.topics.length
      ? it.topics.map((t) => `<span class="chip mini">${esc(topicName(t))}</span>`).join('')
      : '<span class="chip mini">❔ Unsorted — tap to sort</span>';
    return `<div class="item" data-id="${esc(it.id)}" tabindex="0" role="button">
      <div class="thumb">${thumb}</div>
      <div><div class="title">${esc(displayTitle(it))}</div>
      <div class="meta">${esc(p.label)}${it.author ? ' · ' + esc(it.author) : ''} · ${ago(it.at)}</div>
      ${it.note && it.title ? `<div class="note">${esc(it.note)}</div>` : ''}
      <div class="chips">${chips}</div></div></div>`;
  }

  function libraryList() {
    const q = libQuery.trim().toLowerCase();
    const list = state.items.filter((i) => {
      if (libTopic === '_unsorted' ? i.topics.length : libTopic && !i.topics.includes(libTopic)) return false;
      if (!q) return true;
      const hay = (textOf(i) + ' ' + i.url + ' ' + i.platform + ' ' + i.topics.map((t) => (topicById(t) || {}).label || '').join(' ')).toLowerCase();
      return q.split(/\s+/).every((w) => hay.includes(w));
    });
    if (!list.length) return `<div class="empty">${state.items.length ? 'Nothing matches.' : 'Nothing here yet. Tap + to add a link.'}</div>`;
    return `<div class="cap" style="margin-bottom:4px">${plural(list.length, 'thing')}</div>` + list.slice(0, 300).map(itemCard).join('');
  }

  function viewLibrary() {
    const c = topicCounts(state.items);
    const used = allTopics().filter((t) => c[t.id]).sort((a, b) => c[b.id] - c[a.id]);
    const chip = (id, label) => `<button class="chip ${libTopic === id ? 'on' : ''}" data-act="filter" data-topic="${esc(id)}">${esc(label)}</button>`;
    return `<input class="field" id="q" type="search" placeholder="Search everything you've sent" value="${esc(libQuery)}">
      <div class="chips scroller">${chip('', 'All')}${c._unsorted ? chip('_unsorted', `❔ Unsorted ${c._unsorted}`) : ''}
        ${used.map((t) => chip(t.id, `${t.emoji} ${t.label} ${c[t.id]}`)).join('')}</div>
      <div id="list">${libraryList()}</div>`;
  }

  function viewWrapped() {
    const years = [...new Set(state.items.map((i) => new Date(i.at).getFullYear()))].sort((a, b) => b - a);
    if (!years.length) return `<div class="hero"><div class="eyebrow">Wrapped</div><h1>Your year, <em>once there is one.</em></h1><p class="sub">Send a few things and this fills in.</p></div>`;
    if (!years.includes(wrappedYear)) wrappedYear = years[0];
    const items = state.items.filter((i) => new Date(i.at).getFullYear() === wrappedYear);
    const tc = Object.entries(topicCounts(items)).filter(([k]) => k !== '_unsorted').sort((a, b) => b[1] - a[1]);
    const plats = countBy(items, (i) => (PLATFORMS[i.platform] || PLATFORMS.web).label);
    const creators = countBy(items, (i) => i.author).filter(([, n]) => n > 1).slice(0, 5);
    const months = countBy(items, (i) => new Date(i.at).toLocaleDateString(undefined, { month: 'long' }));
    const part = dayparts(items).sort((a, b) => b[1] - a[1])[0];
    const score = rangeScore(items);
    const total = tc.reduce((a, [, n]) => a + n, 0);
    return `<div class="hero"><div class="eyebrow">Wrapped</div>
      <h1>${wrappedYear} was <em>${tc.length ? esc(topicName(tc[0][0])) : 'still unsorted'}</em>${tc[1] ? ` with a side of ${esc(topicName(tc[1][0]))}` : ''}.</h1></div>
      ${years.length > 1 ? `<div class="chips" style="margin-bottom:12px">${years.map((y) => `<button class="chip ${y === wrappedYear ? 'on' : ''}" data-act="year" data-year="${y}">${y}</button>`).join('')}</div>` : ''}
      <div class="tiles">
        <div class="tile hl"><div class="k">Things you sent</div><div class="v">${items.length}</div></div>
        <div class="tile"><div class="k">Longest streak</div><div class="v">${plural(longestStreak(items), 'day')}</div></div>
        <div class="tile"><div class="k">Main source</div><div class="v">${plats.length ? esc(plats[0][0]) : '–'}</div></div>
        <div class="tile"><div class="k">Busiest month</div><div class="v">${months.length ? esc(months[0][0]) : '–'}</div></div>
        <div class="tile"><div class="k">You send most in the</div><div class="v">${part && part[1] ? esc(part[0].toLowerCase()) : '–'}</div></div>
        <div class="tile"><div class="k">Range</div><div class="v">${score === null ? '–' : `${score} · ${rangeLabel(score)}`}</div></div>
        ${tc.length ? `<div class="tile wide"><div class="k">Top topics</div><div style="margin-top:10px">${bars(tc.slice(0, 6).map(([id, n]) => [topicName(id), n, ` <span>· ${Math.round((n / total) * 100)}%</span>`]), tc[0][1])}</div></div>` : ''}
        ${creators.length ? `<div class="tile wide"><div class="k">Creators you kept coming back to</div><div style="margin-top:10px">${bars(creators, creators[0][1])}</div></div>` : ''}
      </div>`;
  }

  function viewSetup() {
    const base = location.origin + location.pathname;
    const hasSample = state.items.some((i) => i.sample);
    const bm = `javascript:location.href='${base}?url='+encodeURIComponent(location.href)+'&title='+encodeURIComponent(document.title)`;
    return `<div class="hero"><div class="eyebrow">Setup</div><h1>Make sending <em>one tap.</em></h1></div>
      <div class="card"><h2>Android</h2><ol class="steps">
        <li>Open this page in Chrome → menu → <strong>Install app</strong> (or Add to Home screen).</li>
        <li>In Instagram, TikTok, YouTube or Facebook: <strong>Share → Sum</strong>.</li></ol></div>
      <div class="card"><h2>iPhone</h2><ol class="steps">
        <li>Shortcuts app → new shortcut → turn on <strong>Show in Share Sheet</strong>, accepting URLs and text.</li>
        <li>Add action <strong>URL Encode</strong> on the Shortcut Input.</li>
        <li>Add action <strong>Open URLs</strong> with: <code>${esc(base)}?url=</code> followed by the encoded text.</li>
        <li>Name it “Sum”. Now Share → Sum from any app.</li></ol>
        <div class="cap">On iPhone this opens in Safari, so keep using Sum in Safari rather than a Home Screen icon — the two don't share storage.</div></div>
      <div class="card"><h2>Computer</h2><div class="cap" style="margin:0 0 10px">Drag this to your bookmarks bar, then click it on any page.</div>
        <a class="ghost" style="display:inline-block;text-decoration:none" href="${esc(bm)}">Σ Send to Sum</a></div>
      <div class="card"><h2>Your data</h2><div class="cap" style="margin:0 0 12px">${plural(state.items.length, 'item')}, stored only in this browser on this device. Export now and then as a backup.</div>
        <div class="btnrow">
          <button class="ghost" data-act="export">Export</button>
          <button class="ghost" data-act="import">Import</button>
          ${hasSample ? '<button class="ghost" data-act="clearsample">Remove sample data</button>' : '<button class="ghost" data-act="sample">Load sample data</button>'}
          <button class="ghost danger" data-act="wipe">Erase everything</button>
        </div><input type="file" id="importFile" accept="application/json,.json" hidden></div>`;
  }

  function render() {
    const views = { pulse: viewPulse, library: viewLibrary, wrapped: viewWrapped, setup: viewSetup };
    $('#main').innerHTML = views[tab]();
    document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
  }

  function go(t) { tab = t; render(); window.scrollTo(0, 0); }

  /* ---------- sheet (capture / edit / add) ---------- */
  const sheet = $('#sheet');
  let sheetId = null, sheetFresh = false;

  function openSheet(id, fresh) {
    sheetId = id; sheetFresh = fresh;
    drawSheet();
    if (!sheet.open) sheet.showModal();
  }
  function refreshSheet(it) { if (sheet.open && sheetId === it.id) drawSheet(); }

  function drawSheet() {
    const it = state.items.find((i) => i.id === sheetId);
    if (!it) { sheet.close(); return; }
    const p = PLATFORMS[it.platform] || PLATFORMS.web;
    const note = $('#note', sheet);
    const noteVal = note ? note.value : it.note;
    sheet.innerHTML = `
      <p class="eyebrow">${sheetFresh ? 'Caught it ✓' : esc(p.label) + ' · ' + ago(it.at)}</p>
      <h3 class="sheet-h">${esc(displayTitle(it))}</h3>
      <p class="sheet-s">${it.author ? esc(it.author) + ' · ' : ''}<a href="${esc(safeUrl(it.url))}" target="_blank" rel="noopener noreferrer">Open on ${esc(p.label === 'Web' ? it.host : p.label)} ↗</a></p>
      <div class="label">What is it? ${sheetFresh ? '(optional — skip and sort later)' : ''}</div>
      <div class="chips">${allTopics().map((t) => `<button class="chip ${it.topics.includes(t.id) ? 'on' : ''}" data-act="toggle" data-topic="${esc(t.id)}">${esc(t.emoji + ' ' + t.label)}</button>`).join('')}
        <button class="chip" data-act="newtopic">+ New</button></div>
      <div class="label">Note to future you</div>
      <input class="field" id="note" placeholder="e.g. carbonara for Friday" value="${esc(noteVal)}" maxlength="300">
      <div class="sheet-f"><button class="ghost danger" data-act="delete">Delete</button><button class="btn" data-act="done">Done</button></div>`;
  }

  function commitNote() {
    const it = state.items.find((i) => i.id === sheetId);
    const note = $('#note', sheet);
    if (!it || !note) return;
    const v = note.value.trim();
    if (v !== it.note) {
      it.note = v;
      if (!it.manual) it.topics = classify(textOf(it));
      save();
    }
  }

  function openAdd() {
    sheetId = null;
    sheet.innerHTML = `<h3 class="sheet-h">Add a link</h3>
      <p class="sheet-s">Reel, TikTok, Short, video, post — anything with a URL.</p>
      <input class="field" id="addUrl" type="url" inputmode="url" placeholder="https://…" autocomplete="off">
      <div class="sheet-f"><button class="ghost" data-act="paste">Paste from clipboard</button><button class="btn" data-act="addgo">Save</button></div>`;
    if (!sheet.open) sheet.showModal();
    $('#addUrl', sheet).focus();
  }

  sheet.addEventListener('click', async (e) => {
    if (e.target === sheet) { commitNote(); sheet.close(); render(); return; }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const it = state.items.find((i) => i.id === sheetId);
    const act = b.dataset.act;
    if (act === 'toggle' && it) {
      const t = b.dataset.topic;
      it.topics = it.topics.includes(t) ? it.topics.filter((x) => x !== t) : it.topics.concat(t);
      it.manual = true; save(); drawSheet();
    } else if (act === 'newtopic' && it) {
      const label = (prompt('Name the new topic') || '').trim().slice(0, 30);
      if (!label) return;
      let t = allTopics().find((x) => x.label.toLowerCase() === label.toLowerCase());
      if (!t) { t = { id: 'c_' + Date.now().toString(36), label, emoji: '✳️', kw: label.toLowerCase() }; state.topics.push(t); }
      if (!it.topics.includes(t.id)) it.topics.push(t.id);
      it.manual = true; save(); drawSheet();
    } else if (act === 'delete' && it) {
      if (!confirm('Delete this from Sum?')) return;
      state.items = state.items.filter((i) => i.id !== it.id);
      save(); sheet.close(); render();
    } else if (act === 'done') {
      commitNote(); sheet.close(); render();
    } else if (act === 'paste') {
      try { $('#addUrl', sheet).value = (await navigator.clipboard.readText()).trim(); }
      catch (err) { toast('Clipboard blocked — paste it by hand'); }
    } else if (act === 'addgo') {
      const v = $('#addUrl', sheet).value.trim();
      const m = v.match(/https?:\/\/[^\s]+/);
      if (!m) { toast('Paste a link that starts with https://'); return; }
      addLink(m[0], { shared: v.replace(m[0], '').trim() });
    }
  });
  sheet.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (e.target.id === 'addUrl') { e.preventDefault(); $('[data-act="addgo"]', sheet).click(); }
    if (e.target.id === 'note') { e.preventDefault(); $('[data-act="done"]', sheet).click(); }
  });
  sheet.addEventListener('cancel', () => { commitNote(); setTimeout(render); });

  /* ---------- sample data ---------- */
  function loadSample() {
    let seed = 7;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const pick = (a) => a[Math.floor(rnd() * a.length)];
    const pool = {
      food: ['One-pan carbonara, no cream', '15 minute chili oil noodles', 'Crispy smash burger recipe', 'Sourdough for people who gave up', 'Air fryer chicken thighs', 'Cold brew ratio that works'],
      pets: ['Teach your dog to settle on a mat', 'Dog relaxation protocol, day 1', 'Why your puppy bites the leash', 'Cat enrichment on a budget', 'Loose leash walking in 5 minutes'],
      body: ['Hip mobility routine for desk workers', '3 day lifting split for beginners', 'Zone 2 running explained simply', 'Fix your sleep schedule', 'Stretch this before every run'],
      mind: ['ADHD body doubling actually works', 'The 2 minute habit rule', 'Dopamine menu ideas', 'How to calm down fast'],
      tech: ['I automated my inbox with AI', 'Best iPhone settings you never changed', 'Coding setup tour 2026', 'This app replaced five others'],
      funny: ['When the meeting could have been an email (skit)', 'Dog fails compilation, funny', 'Meme review of the week'],
      travel: ['3 days in Lisbon itinerary', 'Japan trip on a budget', 'Carry-on packing for a week'],
      home: ['IKEA hack for a tiny hallway', 'Declutter one drawer a day', 'Plants you cannot kill'],
      money: ['How I budget on an irregular salary', 'Index investing for beginners'],
      music: ['Guitar cover that got me back into playing', 'DJ set for deep focus'],
    };
    const authors = ['@pastaqueen', '@calmdogclub', '@deskmobility', '@tinykitchen', '@buildwithmo', '@slowmornings', '@packlight'];
    // recent month leans food + pets; the month before leaned body + tech
    const recent = ['food', 'food', 'food', 'food', 'pets', 'pets', 'pets', 'mind', 'funny', 'travel', 'home', 'body'];
    const older = ['body', 'body', 'body', 'tech', 'tech', 'tech', 'funny', 'money', 'food', 'music', 'mind', 'home'];
    const plats = [['instagram', 'reel'], ['instagram', 'reel'], ['instagram', 'reel'], ['tiktok', 'video'], ['tiktok', 'video'], ['youtube', 'short'], ['youtube', 'video'], ['facebook', 'reel']];
    const hours = [8, 12, 13, 19, 20, 21, 21, 22, 23, 23, 0, 1];
    const now = Date.now();
    for (let n = 0; n < 96; n++) {
      const daysAgo = Math.floor(rnd() * rnd() * 150);
      const topic = pick(daysAgo < 30 ? recent : older);
      const [platform, kind] = pick(plats);
      const d = new Date(now - daysAgo * DAY);
      d.setHours(pick(hours), Math.floor(rnd() * 60));
      const at = Math.min(d.getTime(), now - 6e4);
      const title = pick(pool[topic]);
      const it = { id: 's' + n, at, url: `https://example.com/sample/${n}`, host: 'example.com', platform, kind, author: pick(authors), title, shared: '', note: '', thumb: '', manual: false, sample: true, topics: [] };
      it.topics = rnd() < 0.1 ? [] : classify(title).slice(0, 1).concat(classify(title).slice(1, 2));
      if (!it.topics.length && rnd() > 0.1) it.topics = [topic];
      state.items.push(it);
    }
    state.items.sort((a, b) => b.at - a.at);
    save(); toast('Sample data loaded — remove it in Setup'); go('pulse');
  }

  /* ---------- events ---------- */
  document.querySelector('.tabs').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.tab === 'add') openAdd(); else go(b.dataset.tab);
  });

  $('#main').addEventListener('click', (e) => {
    const item = e.target.closest('.item');
    if (item) { openSheet(item.dataset.id, false); return; }
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'add') openAdd();
    else if (act === 'sample') loadSample();
    else if (act === 'goto') go(b.dataset.to);
    else if (act === 'unsorted') { libTopic = '_unsorted'; libQuery = ''; go('library'); }
    else if (act === 'filter') { libTopic = b.dataset.topic; render(); }
    else if (act === 'year') { wrappedYear = Number(b.dataset.year); render(); }
    else if (act === 'export') {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }));
      a.download = `sum-${new Date().toISOString().slice(0, 10)}.json`;
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } else if (act === 'import') $('#importFile').click();
    else if (act === 'clearsample') { state.items = state.items.filter((i) => !i.sample); save(); render(); toast('Sample data removed'); }
    else if (act === 'wipe') {
      if (confirm('Erase everything in Sum on this device? This cannot be undone.')) { state = { items: [], topics: [] }; save(); go('pulse'); }
    }
  });

  $('#main').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    if (e.target.id === 'find') { libQuery = e.target.value; libTopic = ''; go('library'); }
    else if (e.target.classList.contains('item')) openSheet(e.target.dataset.id, false);
  });
  $('#main').addEventListener('input', (e) => {
    if (e.target.id === 'q') { libQuery = e.target.value; $('#list').innerHTML = libraryList(); }
  });
  $('#main').addEventListener('change', async (e) => {
    if (e.target.id !== 'importFile' || !e.target.files[0]) return;
    try {
      const data = JSON.parse(await e.target.files[0].text());
      if (!data || !Array.isArray(data.items)) throw new Error('bad file');
      const known = new Set(state.items.map((i) => i.url));
      let added = 0;
      data.items.forEach((raw) => {
        const parsed = raw && typeof raw.url === 'string' && parseLink(raw.url);
        if (!parsed || known.has(raw.url)) return;
        known.add(raw.url);
        state.items.push({
          id: String(raw.id || Date.now().toString(36) + added), at: Number(raw.at) || Date.now(), ...parsed, url: raw.url,
          author: String(raw.author || parsed.author || ''), title: String(raw.title || ''), shared: String(raw.shared || ''), note: String(raw.note || ''),
          thumb: safeUrl(raw.thumb), topics: Array.isArray(raw.topics) ? raw.topics.map(String) : [], manual: !!raw.manual, sample: !!raw.sample,
        });
        added++;
      });
      (Array.isArray(data.topics) ? data.topics : []).forEach((t) => {
        if (t && t.id && t.label && !topicById(String(t.id))) state.topics.push({ id: String(t.id), label: String(t.label), emoji: String(t.emoji || '✳️'), kw: String(t.kw || '') });
      });
      state.items.sort((a, b) => b.at - a.at);
      save(); render(); toast(`Imported ${plural(added, 'item')}`);
    } catch (err) { toast("Couldn't read that file"); }
  });

  let installEvt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installEvt = e; $('#installBtn').hidden = false; });
  $('#installBtn').addEventListener('click', async () => { if (installEvt) { installEvt.prompt(); installEvt = null; $('#installBtn').hidden = true; } });

  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('sw.js').catch(() => {});

  render();
  captureFromUrl();
})();
