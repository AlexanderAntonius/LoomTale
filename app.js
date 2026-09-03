(function () {
  // ── Constants ──────────────────────────────────────────────────────────────
  const MODEL       = 'gemini-3.5-flash-lite';
  const STORAGE_KEY = 'loomtale_stories';

  // ── DOM ────────────────────────────────────────────────────────────────────
  const sidebarEl    = document.getElementById('sidebar');
  const backdropEl   = document.getElementById('backdrop');
  const sidebarListEl= document.getElementById('sidebarList');
  const sidebarCloseBtn = document.getElementById('sidebarClose');
  const sidebarNewBtn   = document.getElementById('sidebarNew');
  const burgerBtn    = document.getElementById('burgerBtn');
  const newStoryBtn  = document.getElementById('newStoryBtn');
  const setupEl      = document.getElementById('setup');
  const appEl        = document.getElementById('app');
  const premiseEl    = document.getElementById('premise');
  const beginBtn     = document.getElementById('beginBtn');
  const logEl        = document.getElementById('log');
  const inputEl      = document.getElementById('input');
  const sendBtn      = document.getElementById('sendBtn');
  const sceneChipEl  = document.getElementById('sceneChip');
  const bgA          = document.getElementById('bgA');
  const bgB          = document.getElementById('bgB');

  // ── State ──────────────────────────────────────────────────────────────────
  let currentStory = null;
  let bgActiveIsA  = true;
  let isReplaying  = false;

  // ── Mood gradients ─────────────────────────────────────────────────────────
  const moodGradients = {
    calm:       'linear-gradient(160deg, #16222a, #08090f)',
    tense:      'linear-gradient(160deg, #2a1414, #08090f)',
    romantic:   'linear-gradient(160deg, #2a1522, #100a12)',
    eerie:      'linear-gradient(160deg, #131f18, #06090a)',
    joyful:     'linear-gradient(160deg, #2a2013, #14100a)',
    melancholy: 'linear-gradient(160deg, #141626, #08090f)',
    mysterious: 'linear-gradient(160deg, #1c1430, #08090f)',
    neutral:    'linear-gradient(160deg, #161822, #08090f)'
  };

  // ── System prompt ──────────────────────────────────────────────────────────
  const SYSTEM_PROMPT = `You are the Narrator / Game Master for an immersive interactive roleplay fiction session.
The user is the main character and controls their character entirely. You control the world, environment, NPCs, and all other characters.

=== MANDATORY UI FORMATTING RULES ===
Follow these formatting rules on EVERY response so the interface renders correctly:

1. SCENE TAG: If the mood or setting changes (and ALWAYS at the very start of a story), begin your response on line 1 with:
[SCENE: mood, brief setting description]
Where mood is EXACTLY one of: calm, tense, romantic, eerie, joyful, melancholy, mysterious, neutral.
Omit this line if mood/setting has not changed.

2. SPEAKER LABELS: Every paragraph MUST start on its own line with a label followed by a colon:
- NARRATOR: for all description, environment, atmosphere, actions, and consequences.
- CharacterName: for spoken dialogue by an NPC/character (always spell names identically).
Never combine narration and dialogue under the same label.

=== MASTER ROLEPLAY & STORYTELLING RULES ===

1. CHARACTER AGENCY (CRITICAL & NON-NEGOTIABLE):
Never take over the player's character. You must NEVER dictate:
- Player's dialogue or words
- Player's actions, movement, or gestures
- Player's thoughts, feelings, emotions, or inner reactions
- Player's decisions or responses to an event/NPC.
If an NPC speaks or interacts with the player, STOP and leave space for the player to respond.

2. WORLD & NPC CONTROL:
You control all NPCs, environment, atmosphere, events, conflicts, and consequences. NPCs must have independent agency — they can agree, disagree, tease, hide secrets, leave, or act on their own goals without waiting for the player.

3. COLLABORATIVE STORYTELLING & NO FORCED PLOT:
This is a two-way game. Do not force the story toward romance, confession, fight, or specific events unless it evolves naturally. Follow the player's lead if they take the story in a new direction.

4. CINEMATIC & IMMERSIVE WRITING (SHOW, DON'T TELL):
Write like a rich interactive novel. Focus on sensory details, atmosphere, voice tone, and small body language. Use subtext, natural pauses, banter, and realistic pacing. Do not rush emotional payoffs or major plot turns.

5. CONTINUITY & CONSEQUENCES:
Remember past events, relationships, secrets, and promises. Player choices must have logical consequences — the world reacts realistically to mistakes and successes.

6. PHYSICAL INTERACTION & HOOKS:
Describe physical proximity or NPC actions naturally, then STOP so the player decides how their character reacts. End each response with an open hook (an NPC asking something, a situational shift, or an event) that gives the player a clear door to respond.

7. NO A/B/C CHOICES & NO META:
Never give multiple-choice menus (A/B/C). Never break character or explain storytelling techniques as an AI.

8. RESPONSE LENGTH & LANGUAGE MATCHING:
Write 3 to 7 paragraphs per response. Match the language used by the player (if they write in Indonesian, reply in natural, atmospheric Indonesian; if in English, reply in English).`;

  // ── Storage ────────────────────────────────────────────────────────────────
  const Storage = {
    getAll() {
      try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
      catch { return []; }
    },
    save(story) {
      const all = this.getAll();
      story.updatedAt = Date.now();
      const idx = all.findIndex(s => s.id === story.id);
      if (idx >= 0) all[idx] = story; else all.unshift(story);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    },
    delete(id) {
      const all = this.getAll().filter(s => s.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    },
    get(id) { return this.getAll().find(s => s.id === id) || null; }
  };

  // ── Story helpers ──────────────────────────────────────────────────────────
  function createStory(premise) {
    return {
      id: Date.now().toString(),
      title: 'Untitled Story',
      premise,
      history: [],
      charColors: {},
      colorIdx: 0,
      lastMood: 'neutral',
      lastScene: '',
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
  }

  function autosave() {
    if (!currentStory) return;
    Storage.save(currentStory);
    Sidebar.render();
  }

  async function generateTitle(premise, storyId) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${getActiveKey()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: `Generate a single evocative title for a story with this premise: "${premise}". The title should sound like a real published novel or short story — 2-5 words, atmospheric and intriguing. Reply with ONLY the title, no quotes, no explanation, no period at the end.` }] }],
            generationConfig: { maxOutputTokens: 20 }
          })
        }
      );
      const data = await res.json();
      const title = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!title) return;
      // Update in storage regardless of which story is active now
      const story = Storage.get(storyId);
      if (story) { story.title = title; Storage.save(story); }
      if (currentStory && currentStory.id === storyId) currentStory.title = title;
      Sidebar.render();
    } catch { /* silently fail, title stays Untitled */ }
  }

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const Sidebar = {
    open()  { sidebarEl.classList.add('open'); backdropEl.classList.add('show'); this.render(); },
    close() { sidebarEl.classList.remove('open'); backdropEl.classList.remove('show'); },
    render() {
      const all = Storage.getAll().sort((a, b) => b.updatedAt - a.updatedAt);
      sidebarListEl.innerHTML = '';
      if (all.length === 0) {
        sidebarListEl.innerHTML = '<div class="sidebar-empty">No stories yet.<br>Start one to see it here.</div>';
        return;
      }
      all.forEach(story => {
        const turns = Math.floor(story.history.length / 2);
        const card = document.createElement('div');
        card.className = 'story-card' + (currentStory && story.id === currentStory.id ? ' active' : '');
        card.innerHTML =
          '<div class="story-info">' +
            '<div class="story-name">' + escapeHtml(story.title) + '</div>' +
            '<div class="story-meta">' + timeAgo(story.updatedAt) + ' &middot; ' + turns + ' turn' + (turns !== 1 ? 's' : '') + '</div>' +
          '</div>' +
          '<button class="story-del" title="Delete story">🗑</button>';
        card.querySelector('.story-info').addEventListener('click', () => loadStory(story.id));
        card.querySelector('.story-del').addEventListener('click', e => {
          e.stopPropagation();
          if (!confirm('Delete "' + story.title + '"? This cannot be undone.')) return;
          Storage.delete(story.id);
          if (currentStory && story.id === currentStory.id) {
            const remaining = Storage.getAll();
            if (remaining.length > 0) {
              loadStory(remaining.sort((a,b) => b.updatedAt - a.updatedAt)[0].id);
            } else {
              currentStory = null;
              goToSetup();
            }
          }
          this.render();
        });
        sidebarListEl.appendChild(card);
      });
    }
  };

  // ── Screen helpers ─────────────────────────────────────────────────────────
  function showScreen(name) {
    setupEl.classList.remove('show');
    appEl.classList.remove('show');
    if (name === 'setup') setupEl.classList.add('show');
    if (name === 'app')   appEl.classList.add('show');
  }

  function goToSetup() {
    premiseEl.value = '';
    Sidebar.close();
    showScreen('setup');
  }

  // ── Load a saved story ─────────────────────────────────────────────────────
  function loadStory(id) {
    const story = Storage.get(id);
    if (!story) return;
    currentStory = story;
    Sidebar.close();
    showScreen('app');

    // Clear log and restore scene chip
    logEl.innerHTML = '';
    sceneChipEl.textContent = story.lastScene
      ? story.lastMood + ' \u00b7 ' + story.lastScene
      : story.lastMood || '';

    // Restore background (instant, no transition)
    const gradient = moodGradients[story.lastMood] || moodGradients.neutral;
    const incoming = bgActiveIsA ? bgB : bgA;
    const outgoing = bgActiveIsA ? bgA : bgB;
    incoming.style.background = gradient;
    incoming.style.transition = 'none';
    incoming.classList.add('active');
    outgoing.classList.remove('active');
    bgActiveIsA = !bgActiveIsA;
    setTimeout(() => { incoming.style.transition = ''; }, 50);

    // Replay history without animations
    isReplaying = true;
    story.history.forEach(msg => {
      if (msg.role === 'user') addYouEntry(msg.content);
      else parseAndRender(msg.content);
    });
    isReplaying = false;

    // Scroll to bottom
    const wrap = document.querySelector('.log-wrap');
    wrap.scrollTop = wrap.scrollHeight;
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    const all = Storage.getAll().sort((a, b) => b.updatedAt - a.updatedAt);
    if (all.length > 0) loadStory(all[0].id);
    else showScreen('setup');
  }

  // ── Background mood ────────────────────────────────────────────────────────
  function setMood(mood) {
    if (currentStory) currentStory.lastMood = mood;
    if (isReplaying) return;
    const gradient = moodGradients[mood] || moodGradients.neutral;
    const incoming = bgActiveIsA ? bgB : bgA;
    const outgoing = bgActiveIsA ? bgA : bgB;
    incoming.style.background = gradient;
    incoming.classList.add('active');
    outgoing.classList.remove('active');
    bgActiveIsA = !bgActiveIsA;
  }

  // ── Render helpers ─────────────────────────────────────────────────────────
  const PALETTE = ['c-rose','c-sage','c-dusk','c-teal','c-amber','c-peri'];

  function colorFor(name) {
    const key = name.toLowerCase();
    if (!currentStory.charColors[key]) {
      currentStory.charColors[key] = PALETTE[currentStory.colorIdx % PALETTE.length];
      currentStory.colorIdx++;
    }
    return currentStory.charColors[key];
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function timeAgo(ts) {
    const m = Math.floor((Date.now() - ts) / 60000);
    if (m < 1)  return 'just now';
    if (m < 60) return m + 'm ago';
    const h = Math.floor(m / 60);
    if (h < 24) return h + 'h ago';
    return Math.floor(h / 24) + 'd ago';
  }

  function scrollBottom() {
    if (isReplaying) return;
    const w = document.querySelector('.log-wrap');
    w.scrollTop = w.scrollHeight;
  }

  function addYouEntry(text) {
    const div = document.createElement('div');
    div.className = 'entry' + (isReplaying ? ' no-anim' : '');
    div.innerHTML = '<div class="you-row"><div style="max-width:80%"><div class="you-label">You</div><div class="you-bubble"></div></div></div>';
    div.querySelector('.you-bubble').textContent = text;
    logEl.appendChild(div); scrollBottom();
  }

  function addSceneMarker(mood, setting) {
    const div = document.createElement('div');
    div.className = 'scene-marker' + (isReplaying ? ' no-anim' : '');
    div.textContent = setting ? mood + ' \u00b7 ' + setting : mood;
    logEl.appendChild(div);
    if (!isReplaying) sceneChipEl.textContent = div.textContent;
    if (currentStory) { currentStory.lastMood = mood; currentStory.lastScene = setting || ''; }
    scrollBottom();
    return div;
  }

  function addNarration(text) {
    const div = document.createElement('div');
    div.className = 'entry' + (isReplaying ? ' no-anim' : '');
    div.innerHTML = '<div class="narration"></div>';
    div.querySelector('.narration').textContent = text;
    logEl.appendChild(div); scrollBottom();
    return div;
  }

  function addCharacter(name, text) {
    const color = colorFor(name);
    const div = document.createElement('div');
    div.className = 'entry' + (isReplaying ? ' no-anim' : '');
    div.innerHTML = '<div class="char-row"><div class="avatar" style="background:var(--' + color + ')">' + name.charAt(0).toUpperCase() + '</div><div class="char-body"><div class="char-name" style="color:var(--' + color + ')">' + escapeHtml(name) + '</div><div class="bubble"></div></div></div>';
    div.querySelector('.bubble').textContent = text;
    logEl.appendChild(div); scrollBottom();
    return div;
  }

  let thinkingEl = null;
  function showThinking() {
    thinkingEl = document.createElement('div');
    thinkingEl.className = 'thinking';
    thinkingEl.innerHTML = 'The story continues <span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    logEl.appendChild(thinkingEl); scrollBottom();
  }
  function hideThinking() { if (thinkingEl) { thinkingEl.remove(); thinkingEl = null; } }

  function parseAndRender(raw) {
    let firstNode = null;
    let text = raw.trim();
    const sm = text.match(/^\[SCENE:\s*([^,\]]+)\s*(?:,\s*([^\]]+))?\]\s*/i);
    if (sm) {
      const mood = sm[1].trim().toLowerCase();
      const setting = sm[2] ? sm[2].trim() : '';
      const el = addSceneMarker(mood, setting);
      if (!firstNode) firstNode = el;
      setMood(mood);
      text = text.slice(sm[0].length);
    }
    const lines = text.split('\n');
    let segments = [], cur = null;
    lines.forEach(line => {
      const lm = line.match(/^([A-Za-z][A-Za-z0-9 '\-]{0,28}):\s*(.*)$/);
      if (lm) { if (cur) segments.push(cur); cur = { speaker: lm[1].trim(), text: lm[2] }; }
      else if (cur) { cur.text += (line.trim() ? ' ' + line.trim() : ''); }
      else if (line.trim()) { cur = { speaker: 'NARRATOR', text: line.trim() }; }
    });
    if (cur) segments.push(cur);
    segments.forEach(seg => {
      const t = seg.text.trim();
      if (!t) return;
      let el;
      if (seg.speaker.toUpperCase() === 'NARRATOR') el = addNarration(t);
      else el = addCharacter(seg.speaker, t);
      if (!firstNode) firstNode = el;
    });

    if (!isReplaying && firstNode) {
      setTimeout(() => {
        firstNode.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }

  // ── Gemini API ─────────────────────────────────────────────────────────────
  const DEFAULT_KEY = atob('QVEuQWI4Uk42S1JVS05HUm9qZlpYdnJBV1JiZld1MlNicld3YlZLdTlURnFDMEgwemQ4TWc=');

  function getActiveKey() {
    const k = localStorage.getItem('loomtale_user_key');
    return (k && k.trim()) ? k.trim() : DEFAULT_KEY;
  }

  function isQuotaError(msg) {
    return msg && (msg.includes('quota') || msg.includes('RESOURCE_EXHAUSTED') ||
      msg.includes('limit') || msg.includes('429') || msg.includes('exhausted'));
  }

  async function callGemini() {
    const key = getActiveKey();
    const contents = currentStory.history.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: { maxOutputTokens: 1000 }
        })
      }
    );
    const data = await res.json();
    if (data.error) {
      const err = new Error(data.error.message);
      err.isQuota = isQuotaError(data.error.message) || res.status === 429 || res.status === 403;
      throw err;
    }
    return data.candidates[0].content.parts[0].text;
  }

  // ── Turn logic ─────────────────────────────────────────────────────────────
  async function sendTurn(userText) {
    if (userText) {
      currentStory.history.push({ role: 'user', content: userText });
      addYouEntry(userText);
    }
    sendBtn.disabled = true; inputEl.disabled = true;
    showThinking();
    try {
      const reply = await callGemini();
      hideThinking();
      currentStory.history.push({ role: 'assistant', content: reply });
      parseAndRender(reply);
      autosave();
      // Generate AI title after first exchange
      if (currentStory.history.length === 2 && currentStory.title === 'Untitled Story') {
        generateTitle(currentStory.premise, currentStory.id);
      }
    } catch (err) {
      hideThinking();
      if (err.isQuota) {
        showQuotaModal();
      } else {
        addNarration('(The thread frayed — something went wrong. Try again.)');
      }
      console.error(err);
    }
    sendBtn.disabled = false; inputEl.disabled = false;
  }

  // ── Quota modal ────────────────────────────────────────────────────────────
  function showQuotaModal() {
    document.getElementById('quotaModal').classList.add('show');
    document.getElementById('quotaKeyInput').value = '';
    setTimeout(() => document.getElementById('quotaKeyInput').focus(), 100);
  }
  function hideQuotaModal() {
    document.getElementById('quotaModal').classList.remove('show');
  }

  // ── Events ─────────────────────────────────────────────────────────────────
  burgerBtn.addEventListener('click', () => Sidebar.open());
  document.getElementById('setupBurgerBtn')?.addEventListener('click', () => Sidebar.open());
  sidebarCloseBtn.addEventListener('click', () => Sidebar.close());
  backdropEl.addEventListener('click', () => Sidebar.close());
  sidebarNewBtn.addEventListener('click', goToSetup);
  newStoryBtn.addEventListener('click', goToSetup);

  document.getElementById('quotaSaveBtn').addEventListener('click', () => {
    const val = document.getElementById('quotaKeyInput').value.trim();
    if (!val.startsWith('AIza')) {
      document.getElementById('quotaKeyError').textContent = "Google AI keys start with AIza — check and try again.";
      return;
    }
    localStorage.setItem('loomtale_user_key', val);
    hideQuotaModal();
    addNarration('(Your key was saved. The story can now continue — send your next message.)');
  });

  document.getElementById('quotaCancelBtn').addEventListener('click', () => {
    hideQuotaModal();
    addNarration('(Free story limit reached. Add your own free Gemini API key to keep going.)');
  });

  beginBtn.addEventListener('click', () => {
    const premise = premiseEl.value.trim();
    if (!premise) { premiseEl.focus(); return; }
    logEl.innerHTML = '';
    sceneChipEl.textContent = '';
    currentStory = createStory(premise);
    Storage.save(currentStory);
    showScreen('app');
    sendTurn(premise);
  });

  sendBtn.addEventListener('click', () => {
    const text = inputEl.value.trim();
    if (!text) return;
    inputEl.value = '';
    inputEl.style.height = 'auto';
    inputEl.blur();
    sendTurn(text);
  });

  inputEl.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendBtn.click(); }
  });

  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 140) + 'px';
  });

  init();
})();
