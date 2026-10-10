(function () {
  // ── Constants ──────────────────────────────────────────────────────────────
  const DEFAULT_KEY = atob('QVEuQWI4Uk42S1JVS05HUm9qZlpYdnJBV1JiZld1MlNicld3YlZLdTlURnFDMEgwemQ4TWc=');
  const MODEL       = 'gemini-3.5-flash-lite';
  const STORAGE_KEY = 'loomtale_stories';
  const VERSION     = 'v1.2.0';

  // ── DOM ────────────────────────────────────────────────────────────────────
  const sidebarEl       = document.getElementById('sidebar');
  const backdropEl      = document.getElementById('backdrop');
  const sidebarListEl   = document.getElementById('sidebarList');
  const sidebarCloseBtn = document.getElementById('sidebarClose');
  const sidebarNewBtn   = document.getElementById('sidebarNew');
  const burgerBtn       = document.getElementById('burgerBtn');
  const setupBurgerBtn  = document.getElementById('setupBurgerBtn');
  const newStoryBtn     = document.getElementById('newStoryBtn');
  const notebookBtn     = document.getElementById('notebookBtn');
  const versionBtn      = document.getElementById('versionBtn');
  const setupEl         = document.getElementById('setup');
  const appEl           = document.getElementById('app');
  const premiseEl       = document.getElementById('premise');
  const beginBtn        = document.getElementById('beginBtn');
  const logEl           = document.getElementById('log');
  const inputEl         = document.getElementById('input');
  const sendBtn         = document.getElementById('sendBtn');
  const sceneChipEl     = document.getElementById('sceneChip');
  const bgA             = document.getElementById('bgA');
  const bgB             = document.getElementById('bgB');

  // Notebook modal DOM
  const notebookModal   = document.getElementById('notebookModal');
  const nbTitle         = document.getElementById('nbTitle');
  const nbBody          = document.getElementById('nbBody');
  const nbDigestBtn     = document.getElementById('nbDigestBtn');
  const nbCloseBtn      = document.getElementById('nbCloseBtn');

  // Changelog modal DOM
  const changelogModal  = document.getElementById('changelogModal');
  const clCloseBtn      = document.getElementById('clCloseBtn');

  // ── State ──────────────────────────────────────────────────────────────────
  let currentStory = null;
  let bgActiveIsA  = true;
  let isReplaying  = false;

  // ── Mood gradients ─────────────────────────────────────────────────────────
  const moodGradients = {
    calm:       'linear-gradient(160deg, #1b3a4b, #0d1b2a, #08090f)',
    tense:      'linear-gradient(160deg, #4a121a, #2b080c, #08090f)',
    romantic:   'linear-gradient(160deg, #4a1936, #280c1d, #08090f)',
    eerie:      'linear-gradient(160deg, #133320, #0a1f13, #08090f)',
    joyful:     'linear-gradient(160deg, #4a3010, #2b1a08, #08090f)',
    melancholy: 'linear-gradient(160deg, #1e264a, #0f1328, #08090f)',
    mysterious: 'linear-gradient(160deg, #2d164d, #170a2b, #08090f)',
    neutral:    'linear-gradient(160deg, #1f2433, #0d0f1a, #08090f)'
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
      lastDigestedIndex: 0,
      memoryDigest: {
        summary: '',
        keyEvents: [],
        inventory: [],
        charactersMet: []
      },
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
      const story = Storage.get(storyId);
      if (story) { story.title = title; Storage.save(story); }
      if (currentStory && currentStory.id === storyId) currentStory.title = title;
      Sidebar.render();
    } catch { /* fail silently */ }
  }

  // ── Chunked Digest Engine & Safety Backup ─────────────────────────────────────
  async function processDigestChunk(existingMem, turnsChunk, chunkLabel) {
    const existingMemText = JSON.stringify(existingMem || {});
    const turnsText = turnsChunk.map(t => `${t.role.toUpperCase()}: ${t.content}`).join('\n\n');

    const prompt = `Analyze this story context and update the Memory Digest JSON.
EXISTING CUMULATIVE MEMORY DIGEST:
${existingMemText}

NEW TURNS TO INTEGRATE (${chunkLabel}):
${turnsText}

Update and return ONLY a valid JSON object with these 5 keys:
{
  "summary": "Comprehensive narrative summary of plot developments so far (3-6 sentences)",
  "physicalConditions": ["Critical physical states, health conditions, poisons, injuries, or illnesses affecting the main character or NPCs (e.g. Character is poisoned by nightshade, Character has wounded left shoulder)"],
  "keyEvents": ["Bullet point of important event, secret revealed, or decision"],
  "inventory": ["Item name and state (e.g. Broken wooden pencil, Vial of antidote)"],
  "charactersMet": ["Character name, status, and relationship to main character"]
}
CRITICAL RULES:
1. Pay extreme attention to any physical states, health status, poisons, injuries, or medical conditions. Do NOT drop any ongoing condition unless explicitly cured in the new turns.
2. Preserve all important past facts while integrating new developments.
3. Reply with ONLY raw JSON, no markdown codeblocks or extra text.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${getActiveKey()}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 1000 }
        })
      }
    );
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    let rawText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    rawText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/```$/, '').trim();

    const parsed = JSON.parse(rawText);
    if (!parsed || typeof parsed !== 'object') throw new Error("Invalid JSON returned from API");

    return {
      summary: parsed.summary || existingMem.summary || '',
      physicalConditions: Array.isArray(parsed.physicalConditions) ? parsed.physicalConditions : (existingMem.physicalConditions || []),
      keyEvents: Array.isArray(parsed.keyEvents) ? parsed.keyEvents : (existingMem.keyEvents || []),
      inventory: Array.isArray(parsed.inventory) ? parsed.inventory : (existingMem.inventory || []),
      charactersMet: Array.isArray(parsed.charactersMet) ? parsed.charactersMet : (existingMem.charactersMet || [])
    };
  }

  // ── Incremental & Full Memory Digest ──────────────────────────────────────────────
  async function doIncrementalDigest(manualTrigger = false) {
    if (!currentStory) return;
    const startIdx = currentStory.lastDigestedIndex || 0;
    const newTurns = currentStory.history.slice(startIdx);
    if (newTurns.length === 0 && !manualTrigger) return;

    if (manualTrigger) nbDigestBtn.textContent = "⏳ Updating Digest...";
    const backupMem = JSON.parse(JSON.stringify(currentStory.memoryDigest || {}));

    try {
      const CHUNK_SIZE = 250;
      let runningMem = backupMem;

      for (let i = 0; i < newTurns.length; i += CHUNK_SIZE) {
        const chunk = newTurns.slice(i, i + CHUNK_SIZE);
        const fromTurn = startIdx + i + 1;
        const toTurn = startIdx + Math.min(i + CHUNK_SIZE, newTurns.length);
        const chunkLabel = `Turns ${fromTurn} to ${toTurn} (out of ${currentStory.history.length})`;

        if (manualTrigger && newTurns.length > CHUNK_SIZE) {
          nbDigestBtn.textContent = `⏳ Digesting ${fromTurn}-${toTurn}...`;
        }

        runningMem = await processDigestChunk(runningMem, chunk, chunkLabel);
      }

      currentStory.memoryDigest = runningMem;
      currentStory.lastDigestedIndex = currentStory.history.length;
      autosave();
    } catch (e) {
      console.warn('Digest processing warning:', e);
      currentStory.memoryDigest = backupMem;
      if (manualTrigger) alert("Digest update notice: " + (e.message || "Network error") + ". Your previous memory digest has been safely preserved.");
    } finally {
      if (manualTrigger) {
        nbDigestBtn.textContent = "📌 Update New Turns";
        renderNotebookModal();
      }
    }
  }

  async function doFullReDigest() {
    if (!currentStory) return;
    const totalTurns = currentStory.history.length;
    if (totalTurns === 0) return;
    if (!confirm(`Re-digest entire story (${totalTurns} turns)? This will process in 250-turn chunks to ensure no context is missed.`)) return;

    const reBtn = document.getElementById('nbReDigestBtn');
    if (reBtn) reBtn.textContent = "⏳ Re-Digesting All...";

    const backupMem = JSON.parse(JSON.stringify(currentStory.memoryDigest || {}));

    try {
      currentStory.lastDigestedIndex = 0;
      currentStory.memoryDigest = { summary: '', physicalConditions: [], keyEvents: [], inventory: [], charactersMet: [] };

      const CHUNK_SIZE = 250;
      let runningMem = { summary: '', physicalConditions: [], keyEvents: [], inventory: [], charactersMet: [] };

      for (let i = 0; i < totalTurns; i += CHUNK_SIZE) {
        const chunk = currentStory.history.slice(i, i + CHUNK_SIZE);
        const fromTurn = i + 1;
        const toTurn = Math.min(i + CHUNK_SIZE, totalTurns);
        const chunkLabel = `Turns ${fromTurn} to ${toTurn} of ${totalTurns}`;

        if (reBtn) reBtn.textContent = `⏳ Chunk ${fromTurn}-${toTurn}/${totalTurns}...`;

        runningMem = await processDigestChunk(runningMem, chunk, chunkLabel);
      }

      currentStory.memoryDigest = runningMem;
      currentStory.lastDigestedIndex = totalTurns;
      autosave();
    } catch (e) {
      console.warn('Full re-digest error:', e);
      currentStory.memoryDigest = backupMem;
      alert("Re-digest error: " + (e.message || "Failed to process API output") + ". Your previous memory digest has been safely restored.");
    } finally {
      if (reBtn) reBtn.textContent = "🔄 Re-Digest Full Story";
      renderNotebookModal();
    }
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
    if (!currentStory.memoryDigest) {
      currentStory.memoryDigest = { summary: '', keyEvents: [], inventory: [], charactersMet: [] };
    }
    if (typeof currentStory.lastDigestedIndex !== 'number') {
      currentStory.lastDigestedIndex = 0;
    }

    Sidebar.close();
    showScreen('app');

    logEl.innerHTML = '';
    sceneChipEl.textContent = story.lastScene
      ? story.lastMood + ' \u00b7 ' + story.lastScene
      : story.lastMood || '';

    setMood(story.lastMood || 'neutral');

    isReplaying = true;
    story.history.forEach((msg, idx) => {
      if (msg.role === 'user') addYouEntry(msg.content, idx);
      else parseAndRender(msg.content, idx);
    });
    isReplaying = false;

    const wrap = document.querySelector('.log-wrap');
    wrap.scrollTop = wrap.scrollHeight;
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  function init() {
    const all = Storage.getAll().sort((a, b) => b.updatedAt - a.updatedAt);
    if (all.length > 0) loadStory(all[0].id);
    else showScreen('setup');
  }

  // ── Background & UI mood ───────────────────────────────────────────────────
  const moodColors = {
    calm:       { accent: '#5fa3a0', border: 'rgba(95, 163, 160, 0.4)', panel: 'rgba(95, 163, 160, 0.08)', shadow: 'rgba(95, 163, 160, 0.18)' },
    tense:      { accent: '#c97a7a', border: 'rgba(201, 122, 122, 0.4)', panel: 'rgba(201, 122, 122, 0.08)', shadow: 'rgba(201, 122, 122, 0.18)' },
    romantic:   { accent: '#c97a91', border: 'rgba(201, 122, 145, 0.4)', panel: 'rgba(201, 122, 145, 0.08)', shadow: 'rgba(201, 122, 145, 0.18)' },
    eerie:      { accent: '#7fa088', border: 'rgba(127, 160, 136, 0.4)', panel: 'rgba(127, 160, 136, 0.08)', shadow: 'rgba(127, 160, 136, 0.18)' },
    joyful:     { accent: '#cf7a4a', border: 'rgba(207, 122, 74, 0.4)', panel: 'rgba(207, 122, 74, 0.08)', shadow: 'rgba(207, 122, 74, 0.18)' },
    melancholy: { accent: '#7196c9', border: 'rgba(113, 150, 201, 0.4)', panel: 'rgba(113, 150, 201, 0.08)', shadow: 'rgba(113, 150, 201, 0.18)' },
    mysterious: { accent: '#8079c9', border: 'rgba(128, 121, 201, 0.4)', panel: 'rgba(128, 121, 201, 0.08)', shadow: 'rgba(128, 121, 201, 0.18)' },
    neutral:    { accent: '#c9a464', border: 'rgba(201, 164, 100, 0.25)', panel: 'rgba(237, 230, 211, 0.04)', shadow: 'rgba(0, 0, 0, 0.2)' }
  };

  function setMood(mood) {
    if (currentStory) currentStory.lastMood = mood;
    const colors = moodColors[mood] || moodColors.neutral;
    const root = document.documentElement.style;
    root.setProperty('--mood-accent', colors.accent);
    root.setProperty('--mood-border', colors.border);
    root.setProperty('--mood-panel', colors.panel);
    root.setProperty('--mood-shadow', colors.shadow);

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

  function addYouEntry(text, msgIdx) {
    const div = document.createElement('div');
    div.className = 'entry' + (isReplaying ? ' no-anim' : '');
    div.dataset.msgIdx = typeof msgIdx === 'number' ? msgIdx : (currentStory ? currentStory.history.length - 1 : 0);
    div.innerHTML =
      '<div class="you-row">' +
        '<div style="max-width:80%">' +
          '<div class="you-label">You</div>' +
          '<div class="you-bubble"></div>' +
          '<div class="entry-actions" style="justify-content:flex-end;">' +
            '<button class="act-btn copy-btn" title="Copy text">📋 Copy</button>' +
            '<button class="act-btn edit-btn" title="Edit message & regenerate">✏️ Edit</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    div.querySelector('.you-bubble').textContent = text;
    attachEntryEvents(div, text);
    logEl.appendChild(div);
    scrollBottom();
    return div;
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

  function addNarration(text, msgIdx) {
    const div = document.createElement('div');
    div.className = 'entry' + (isReplaying ? ' no-anim' : '');
    div.dataset.msgIdx = typeof msgIdx === 'number' ? msgIdx : (currentStory ? currentStory.history.length - 1 : 0);
    div.innerHTML =
      '<div class="narration"></div>' +
      '<div class="entry-actions">' +
        '<button class="act-btn copy-btn" title="Copy text">📋 Copy</button>' +
        '<button class="act-btn edit-btn" title="Edit text">✏️ Edit</button>' +
      '</div>';
    div.querySelector('.narration').textContent = text;
    attachEntryEvents(div, text);
    logEl.appendChild(div);
    scrollBottom();
    return div;
  }

  function addCharacter(name, text, msgIdx) {
    const color = colorFor(name);
    const div = document.createElement('div');
    div.className = 'entry' + (isReplaying ? ' no-anim' : '');
    div.dataset.msgIdx = typeof msgIdx === 'number' ? msgIdx : (currentStory ? currentStory.history.length - 1 : 0);
    div.innerHTML =
      '<div class="char-row">' +
        '<div class="avatar" style="background:var(--' + color + ')">' + name.charAt(0).toUpperCase() + '</div>' +
        '<div class="char-body">' +
          '<div class="char-name" style="color:var(--' + color + ')">' + escapeHtml(name) + '</div>' +
          '<div class="bubble"></div>' +
          '<div class="entry-actions">' +
            '<button class="act-btn copy-btn" title="Copy text">📋 Copy</button>' +
            '<button class="act-btn edit-btn" title="Edit text">✏️ Edit</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    div.querySelector('.bubble').textContent = text;
    attachEntryEvents(div, text);
    logEl.appendChild(div);
    scrollBottom();
    return div;
  }

  function attachEntryEvents(entryEl, rawText) {
    const copyBtn = entryEl.querySelector('.copy-btn');
    const editBtn = entryEl.querySelector('.edit-btn');

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(rawText).then(() => {
          copyBtn.textContent = '✓ Copied';
          setTimeout(() => { copyBtn.textContent = '📋 Copy'; }, 1500);
        });
      });
    }

    if (editBtn) {
      editBtn.addEventListener('click', () => {
        const msgIdx = parseInt(entryEl.dataset.msgIdx, 10);
        if (isNaN(msgIdx) || !currentStory || !currentStory.history[msgIdx]) return;

        const isUser = currentStory.history[msgIdx].role === 'user';
        const newText = prompt(isUser ? "Edit your response (this will regenerate the story from here):" : "Edit AI text:", currentStory.history[msgIdx].content);

        if (newText === null || newText.trim() === '') return;

        if (isUser) {
          currentStory.history = currentStory.history.slice(0, msgIdx);
          if (currentStory.lastDigestedIndex > msgIdx) {
            currentStory.lastDigestedIndex = msgIdx;
          }
          autosave();
          loadStory(currentStory.id);
          sendTurn(newText.trim());
        } else {
          currentStory.history[msgIdx].content = newText.trim();
          autosave();
          loadStory(currentStory.id);
        }
      });
    }
  }

  let thinkingEl = null;
  function showThinking() {
    thinkingEl = document.createElement('div');
    thinkingEl.className = 'thinking';
    thinkingEl.innerHTML = 'The story continues <span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    logEl.appendChild(thinkingEl); scrollBottom();
  }
  function hideThinking() { if (thinkingEl) { thinkingEl.remove(); thinkingEl = null; } }

  function parseAndRender(raw, msgIdx) {
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
      if (seg.speaker.toUpperCase() === 'NARRATOR') el = addNarration(t, msgIdx);
      else el = addCharacter(seg.speaker, t, msgIdx);
      if (!firstNode) firstNode = el;
    });

    if (!isReplaying && firstNode) {
      setTimeout(() => {
        firstNode.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  }

  // ── Gemini API with Sliding Window & Memory Digest ─────────────────────────
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
    if (!key) {
      const err = new Error("No API key configured");
      err.isQuota = true;
      throw err;
    }

    let contents = [];
    const hist = currentStory.history;
    const mem = currentStory.memoryDigest;

    let sysPrompt = SYSTEM_PROMPT;

    if (mem && (mem.summary || (mem.keyEvents && mem.keyEvents.length) || (mem.physicalConditions && mem.physicalConditions.length))) {
      const memContext =
        `\n\n=== STORY MEMORY DIGEST (CRITICAL FACTS & HISTORY) ===\n` +
        (mem.summary ? `SUMMARY: ${mem.summary}\n` : '') +
        (mem.physicalConditions && mem.physicalConditions.length ? `PHYSICAL/HEALTH/POISON CONDITIONS:\n- ${mem.physicalConditions.join('\n- ')}\n` : '') +
        (mem.keyEvents && mem.keyEvents.length ? `KEY EVENTS & SECRETS:\n- ${mem.keyEvents.join('\n- ')}\n` : '') +
        (mem.inventory && mem.inventory.length ? `INVENTORY/ITEMS:\n- ${mem.inventory.join('\n- ')}\n` : '') +
        (mem.charactersMet && mem.charactersMet.length ? `CHARACTERS MET:\n- ${mem.charactersMet.join('\n- ')}\n` : '');

      sysPrompt += memContext;
    }

    const WINDOW_SIZE = 60;
    const slicedHist = hist.length > WINDOW_SIZE ? hist.slice(hist.length - WINDOW_SIZE) : hist;

    contents = slicedHist.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: sysPrompt }] },
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
      addYouEntry(userText, currentStory.history.length - 1);
    }
    sendBtn.disabled = true; inputEl.disabled = true;
    showThinking();
    try {
      const reply = await callGemini();
      hideThinking();
      currentStory.history.push({ role: 'assistant', content: reply });
      parseAndRender(reply, currentStory.history.length - 1);
      autosave();

      if (currentStory.history.length === 2 && currentStory.title === 'Untitled Story') {
        generateTitle(currentStory.premise, currentStory.id);
      }

      const unDigested = currentStory.history.length - (currentStory.lastDigestedIndex || 0);
      if (unDigested >= 20) {
        doIncrementalDigest(false);
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

  // ── Notebook Modal logic ───────────────────────────────────────────────────
  function renderNotebookModal() {
    if (!currentStory) return;
    const mem = currentStory.memoryDigest || {};
    const unDigested = currentStory.history.length - (currentStory.lastDigestedIndex || 0);

    nbTitle.textContent = `Story Memory & Digest (${currentStory.title})`;

    let html = '';
    html += `<h4>Summary</h4><p>${escapeHtml(mem.summary || 'No summary generated yet.')}</p>`;

    if (mem.physicalConditions && mem.physicalConditions.length) {
      html += `<h4>Health &amp; Physical Conditions</h4><ul>` + mem.physicalConditions.map(p => `<li>${escapeHtml(p)}</li>`).join('') + `</ul>`;
    }

    if (mem.keyEvents && mem.keyEvents.length) {
      html += `<h4>Key Events &amp; Secrets</h4><ul>` + mem.keyEvents.map(e => `<li>${escapeHtml(e)}</li>`).join('') + `</ul>`;
    }

    if (mem.inventory && mem.inventory.length) {
      html += `<h4>Inventory &amp; Items</h4><ul>` + mem.inventory.map(i => `<li>${escapeHtml(i)}</li>`).join('') + `</ul>`;
    }

    if (mem.charactersMet && mem.charactersMet.length) {
      html += `<h4>Characters Met</h4><ul>` + mem.charactersMet.map(c => `<li>${escapeHtml(c)}</li>`).join('') + `</ul>`;
    }

    html += `<p style="font-size:11px; opacity:0.6; margin-top:14px; text-align:center;">Unprocessed new turns: ${unDigested} turn(s)</p>`;

    nbBody.innerHTML = html;
  }

  function openNotebook() {
    if (!currentStory) return;
    renderNotebookModal();
    notebookModal.classList.add('show');
  }

  function closeNotebook() {
    notebookModal.classList.remove('show');
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
  setupBurgerBtn?.addEventListener('click', () => Sidebar.open());
  sidebarCloseBtn.addEventListener('click', () => Sidebar.close());
  backdropEl.addEventListener('click', () => Sidebar.close());
  sidebarNewBtn.addEventListener('click', goToSetup);
  newStoryBtn.addEventListener('click', goToSetup);

  notebookBtn.addEventListener('click', openNotebook);
  nbCloseBtn.addEventListener('click', closeNotebook);
  nbDigestBtn.addEventListener('click', () => doIncrementalDigest(true));
  document.getElementById('nbReDigestBtn')?.addEventListener('click', doFullReDigest);

  versionBtn.addEventListener('click', () => changelogModal.classList.add('show'));
  clCloseBtn.addEventListener('click', () => changelogModal.classList.remove('show'));

  document.getElementById('quotaSaveBtn').addEventListener('click', () => {
    const val = document.getElementById('quotaKeyInput').value.trim();
    if (!val || val.length < 15) {
      document.getElementById('quotaKeyError').textContent = "Please enter a valid Gemini API key.";
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
