/**
 * ZenithNotes Full-Stack Frontend Engine
 * Includes:
 * 1. Offline Deterministic Calculations (word count, reading time, averages)
 * 2. Generic Backend API Integration (/register, /login, /logout, /data, /request-otp, /reset-password)
 * 3. Dynamic Filtering, Live Search, Pinning, and Tag Categories
 */

// Application State
const state = {
  appId: 'zenithnotes',
  apiBaseUrl: 'https://trumpledroid-api.cloudbeta28624.workers.dev',
  token: localStorage.getItem('zenithnotes_token') || null,
  userEmail: localStorage.getItem('zenithnotes_user_email') || null,
  notes: [],
  activeFilter: 'all', // 'all', 'pinned', 'archived', or specific category
  activeCategory: null,
  searchQuery: '',
  selectedColor: 'white',
  isPinnedDraft: false,
  authMode: 'login' // 'login' or 'register'
};

// DOM Cache
const dom = {
  syncBadge: document.getElementById('syncStatusBadge'),
  searchInput: document.getElementById('searchInput'),
  clearSearchBtn: document.getElementById('clearSearchBtn'),
  openNewNoteBtn: document.getElementById('openNewNoteBtn'),
  authActionBtn: document.getElementById('authActionBtn'),
  userProfileSection: document.getElementById('userProfileSection'),
  authAccountCard: document.getElementById('authAccountCard'),
  authUserEmail: document.getElementById('authUserEmail'),
  logoutBtn: document.getElementById('logoutBtn'),
  categoryListContainer: document.getElementById('categoryListContainer'),
  filterTabs: document.querySelectorAll('.filter-tab'),
  pinnedSection: document.getElementById('pinnedSection'),
  pinnedGrid: document.getElementById('pinnedGrid'),
  notesGrid: document.getElementById('notesGrid'),
  notesSectionTitle: document.getElementById('notesSectionTitle'),
  activeFilterBadge: document.getElementById('activeFilterBadge'),
  emptyNotesState: document.getElementById('emptyNotesState'),
  emptyStateNewNoteBtn: document.getElementById('emptyStateNewNoteBtn'),
  // Stats
  statTotalWords: document.getElementById('statTotalWords'),
  statTotalChars: document.getElementById('statTotalChars'),
  statEstReadTime: document.getElementById('statEstReadTime'),
  statAvgWords: document.getElementById('statAvgWords'),
  metricAllCount: document.getElementById('metricAllCount'),
  metricPinnedCount: document.getElementById('metricPinnedCount'),
  metricArchivedCount: document.getElementById('metricArchivedCount'),
  // Note Modal
  noteModal: document.getElementById('noteModal'),
  modalTitle: document.getElementById('modalTitle'),
  noteForm: document.getElementById('noteForm'),
  editingNoteId: document.getElementById('editingNoteId'),
  noteTitleInput: document.getElementById('noteTitleInput'),
  noteContentInput: document.getElementById('noteContentInput'),
  noteCategoryInput: document.getElementById('noteCategoryInput'),
  modalPinBtn: document.getElementById('modalPinBtn'),
  modalPinIcon: document.getElementById('modalPinIcon'),
  deleteNoteBtn: document.getElementById('deleteNoteBtn'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  cancelNoteModalBtn: document.getElementById('cancelNoteModalBtn'),
  colorPickerDots: document.querySelectorAll('.color-picker-dot'),
  editorLiveWords: document.getElementById('editorLiveWords'),
  editorLiveChars: document.getElementById('editorLiveChars'),
  editorLiveReadTime: document.getElementById('editorLiveReadTime'),
  // Auth Modal
  authModal: document.getElementById('authModal'),
  authModalTitle: document.getElementById('authModalTitle'),
  authModalSub: document.getElementById('authModalSub'),
  authAlert: document.getElementById('authAlert'),
  authForm: document.getElementById('authForm'),
  authEmail: document.getElementById('authEmail'),
  authPassword: document.getElementById('authPassword'),
  authSubmitBtn: document.getElementById('authSubmitBtn'),
  authTogglePrompt: document.getElementById('authTogglePrompt'),
  toggleAuthModeBtn: document.getElementById('toggleAuthModeBtn'),
  closeAuthModalBtn: document.getElementById('closeAuthModalBtn'),
  openForgotBtn: document.getElementById('openForgotBtn'),
  // OTP Modal
  otpModal: document.getElementById('otpModal'),
  otpAlert: document.getElementById('otpAlert'),
  requestOtpForm: document.getElementById('requestOtpForm'),
  verifyOtpForm: document.getElementById('verifyOtpForm'),
  otpRequestEmail: document.getElementById('otpRequestEmail'),
  otpCodeInput: document.getElementById('otpCodeInput'),
  otpNewPassword: document.getElementById('otpNewPassword'),
  closeOtpModalBtn: document.getElementById('closeOtpModalBtn'),
  backToSignInBtn: document.getElementById('backToSignInBtn'),
  toastContainer: document.getElementById('toastContainer')
};

// ==========================================
// 1. MANDATORY LOCAL DETERMINISTIC CALCULATIONS
// ==========================================

/**
 * Calculates raw word count cleanly without regex overhead.
 */
function calculateWords(text) {
  if (!text) return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/**
 * Calculates total character count excluding trailing edge padding.
 */
function calculateChars(text) {
  if (!text) return 0;
  return text.length;
}

/**
 * Calculates estimated reading time (formula: words / 200 wpm)
 * Deterministic business logic executed inside the browser.
 */
function calculateReadingDuration(wordCount) {
  if (wordCount <= 0) return { minutes: 0, text: '0 min' };
  const minutes = wordCount / 200;
  if (minutes < 1) {
    const seconds = Math.ceil((wordCount / 200) * 60);
    return { minutes: Math.round(minutes * 10) / 10, text: `${seconds} sec` };
  }
  const rounded = Math.ceil(minutes);
  return { minutes: rounded, text: `${rounded} min` };
}

/**
 * Aggregates statistics across all records loaded in JavaScript.
 * Runs locally without making remote calculation requests.
 */
function recalculateGlobalMetrics() {
  const activeNotes = state.notes.filter(n => !n.is_archived);
  let totalWords = 0;
  let totalChars = 0;
  let pinnedCount = 0;
  let archivedCount = 0;

  state.notes.forEach(note => {
    if (note.is_archived) {
      archivedCount++;
    } else {
      if (note.is_pinned) pinnedCount++;
    }
    const words = typeof note.word_count === 'number' ? note.word_count : calculateWords(note.content);
    const chars = typeof note.char_count === 'number' ? note.char_count : calculateChars(note.content);
    totalWords += words;
    totalChars += chars;
  });

  const readTime = calculateReadingDuration(totalWords);
  const avgWords = activeNotes.length > 0 ? Math.round(totalWords / activeNotes.length) : 0;

  // Update UI stats
  dom.statTotalWords.textContent = totalWords.toLocaleString();
  dom.statTotalChars.textContent = totalChars.toLocaleString();
  dom.statEstReadTime.textContent = readTime.text;
  dom.statAvgWords.textContent = avgWords.toLocaleString();

  dom.metricAllCount.textContent = activeNotes.length;
  dom.metricPinnedCount.textContent = pinnedCount;
  dom.metricArchivedCount.textContent = archivedCount;
}

/**
 * Recalculates modal live metrics on typing
 */
function updateModalLiveCalculations() {
  const content = dom.noteContentInput.value;
  const words = calculateWords(content);
  const chars = calculateChars(content);
  const read = calculateReadingDuration(words);

  dom.editorLiveWords.textContent = words;
  dom.editorLiveChars.textContent = chars;
  dom.editorLiveReadTime.textContent = read.text;
}

// ==========================================
// 2. BACKEND API CLIENT
// ==========================================

const API = {
  async register(email, password) {
    const res = await fetch(`${state.apiBaseUrl}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: state.appId,
        email,
        password
      })
    });
    const data = await res.json();
    return { status: res.status, data };
  },

  async login(email, password) {
    const res = await fetch(`${state.apiBaseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: state.appId,
        email,
        password
      })
    });
    const data = await res.json();
    return { status: res.status, data };
  },

  async logout() {
    if (!state.token) return;
    try {
      await fetch(`${state.apiBaseUrl}/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`
        }
      });
    } catch (e) {
      console.warn('Logout API ping failed, continuing local teardown', e);
    }
  },

  async requestOtp(email) {
    const res = await fetch(`${state.apiBaseUrl}/request-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: state.appId,
        email
      })
    });
    return await res.json();
  },

  async resetPassword(email, otp, new_password) {
    const res = await fetch(`${state.apiBaseUrl}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: state.appId,
        email,
        otp,
        new_password
      })
    });
    return await res.json();
  },

  async getNotes() {
    if (!state.token) return null;
    const res = await fetch(`${state.apiBaseUrl}/data?collection=notes`, {
      headers: {
        'Authorization': `Bearer ${state.token}`
      }
    });
    const json = await res.json();
    if (json.success && Array.isArray(json.records)) {
      return json.records.map(r => ({
        id: r.id,
        ...r.data
      }));
    }
    return [];
  },

  async createNote(noteData) {
    if (!state.token) return null;
    const res = await fetch(`${state.apiBaseUrl}/data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({
        collection: 'notes',
        data: noteData
      })
    });
    const json = await res.json();
    if (json.success && json.record) {
      return {
        id: json.record.id,
        ...json.record.data
      };
    }
    throw new Error(json.message || json.error || 'Failed to create note');
  },

  async updateNote(id, noteData) {
    if (!state.token) return null;
    const res = await fetch(`${state.apiBaseUrl}/data`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.token}`
      },
      body: JSON.stringify({
        id,
        data: noteData
      })
    });
    const json = await res.json();
    if (json.success && json.id) {
      return json.id;
    }
    throw new Error(json.message || json.error || 'Failed to update note');
  },

  async deleteNote(id) {
    if (!state.token) return null;
    const res = await fetch(`${state.apiBaseUrl}/data?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${state.token}`
      }
    });
    const json = await res.json();
    if (json.success && json.id) {
      return json.id;
    }
    throw new Error(json.message || json.error || 'Failed to delete note');
  }
};

// ==========================================
// 3. STORAGE & SYNC ENGINE
// ==========================================

const LOCAL_STORAGE_KEY = 'zenithnotes_local_guest_notes';

function loadGuestNotes() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : getSampleInitialNotes();
  } catch (e) {
    return getSampleInitialNotes();
  }
}

function saveGuestNotes(notes) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(notes));
  } catch (e) {
    console.error('Local storage full or inaccessible', e);
  }
}

function getSampleInitialNotes() {
  return [
    {
      id: 'local_1',
      title: 'Welcome to ZenithNotes ⚡',
      content: 'ZenithNotes is built for high-speed idea capture. It includes offline calculation of words, characters, and reading time, tags, color-coding, and cloud syncing.',
      category: 'General',
      color: 'amber',
      is_pinned: true,
      is_archived: false,
      word_count: 28,
      char_count: 172,
      read_time_seconds: 9
    },
    {
      id: 'local_2',
      title: 'Design System Principles',
      content: '1. Keep typography legible\n2. Use soft natural borders and contrast\n3. Instant responsive calculation without server roundtrips\n4. Respect user data privacy.',
      category: 'Work',
      color: 'sky',
      is_pinned: false,
      is_archived: false,
      word_count: 24,
      char_count: 153,
      read_time_seconds: 7
    }
  ];
}

async function refreshAllNotes() {
  if (state.token) {
    try {
      dom.syncBadge.textContent = 'Syncing...';
      dom.syncBadge.className = 'hidden sm:inline-flex ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 animate-pulse';
      const remoteNotes = await API.getNotes();
      if (remoteNotes) {
        state.notes = remoteNotes;
      }
      dom.syncBadge.textContent = 'Cloud Synced';
      dom.syncBadge.className = 'hidden sm:inline-flex ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200';
    } catch (err) {
      console.warn('Could not fetch cloud notes, using local cache:', err);
      dom.syncBadge.textContent = 'Cloud Offline';
      dom.syncBadge.className = 'hidden sm:inline-flex ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200';
      if (!state.notes.length) {
        state.notes = loadGuestNotes();
      }
    }
  } else {
    state.notes = loadGuestNotes();
    dom.syncBadge.textContent = 'Offline Mode';
    dom.syncBadge.className = 'hidden sm:inline-flex ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200';
  }

  recalculateGlobalMetrics();
  renderCategories();
  renderNotes();
}

// ==========================================
// 4. RENDERING ENGINE
// ==========================================

function renderCategories() {
  const categoryCounts = {};
  state.notes.forEach(note => {
    if (note.category && !note.is_archived) {
      const clean = note.category.trim();
      if (clean) {
        categoryCounts[clean] = (categoryCounts[clean] || 0) + 1;
      }
    }
  });

  const categories = Object.keys(categoryCounts).sort();
  dom.categoryListContainer.innerHTML = '';

  if (categories.length === 0) {
    dom.categoryListContainer.innerHTML = `<span class="text-xs text-stone-400 italic">No categories yet</span>`;
    return;
  }

  categories.forEach(cat => {
    const isSelected = state.activeCategory === cat;
    const btn = document.createElement('button');
    btn.className = `w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition ${
      isSelected ? 'bg-amber-100/70 text-amber-900 font-bold' : 'text-stone-600 hover:bg-stone-50'
    }`;
    btn.innerHTML = `
      <span class="truncate"># ${escapeHtml(cat)}</span>
      <span class="font-mono text-[10px] text-stone-400 ml-2">${categoryCounts[cat]}</span>
    `;
    btn.addEventListener('click', () => {
      if (state.activeCategory === cat) {
        state.activeCategory = null;
        state.activeFilter = 'all';
      } else {
        state.activeCategory = cat;
        state.activeFilter = 'category';
      }
      updateActiveFilterUI();
      renderNotes();
    });
    dom.categoryListContainer.appendChild(btn);
  });
}

function updateActiveFilterUI() {
  dom.filterTabs.forEach(tab => {
    const f = tab.getAttribute('data-filter');
    if (state.activeCategory) {
      tab.classList.remove('bg-stone-100', 'text-stone-900');
      tab.classList.add('text-stone-600');
    } else if (f === state.activeFilter) {
      tab.classList.add('bg-stone-100', 'text-stone-900');
      tab.classList.remove('text-stone-600');
    } else {
      tab.classList.remove('bg-stone-100', 'text-stone-900');
      tab.classList.add('text-stone-600');
    }
  });

  if (state.activeCategory) {
    dom.activeFilterBadge.textContent = `Filtered by #${state.activeCategory}`;
  } else if (state.activeFilter === 'pinned') {
    dom.activeFilterBadge.textContent = 'Filtered: Pinned Only';
  } else if (state.activeFilter === 'archived') {
    dom.activeFilterBadge.textContent = 'Archive View';
  } else {
    dom.activeFilterBadge.textContent = '';
  }
}

function renderNotes() {
  const query = state.searchQuery.toLowerCase().trim();

  // Filter notes
  const filtered = state.notes.filter(note => {
    // Search match
    if (query) {
      const matchTitle = (note.title || '').toLowerCase().includes(query);
      const matchContent = (note.content || '').toLowerCase().includes(query);
      const matchCat = (note.category || '').toLowerCase().includes(query);
      if (!matchTitle && !matchContent && !matchCat) return false;
    }

    // Category match
    if (state.activeCategory) {
      return !note.is_archived && (note.category || '').toLowerCase() === state.activeCategory.toLowerCase();
    }

    // Tab filter
    if (state.activeFilter === 'pinned') {
      return note.is_pinned && !note.is_archived;
    }
    if (state.activeFilter === 'archived') {
      return !!note.is_archived;
    }

    // Default 'all' filter excludes archived
    return !note.is_archived;
  });

  // Separate pinned vs standard when on 'all' view
  const isDefaultAllView = state.activeFilter === 'all' && !state.activeCategory && !query;

  let pinnedList = [];
  let otherList = [];

  if (isDefaultAllView) {
    pinnedList = filtered.filter(n => n.is_pinned);
    otherList = filtered.filter(n => !n.is_pinned);
  } else {
    otherList = filtered;
  }

  // Render pinned section if available
  if (pinnedList.length > 0) {
    dom.pinnedSection.classList.remove('hidden');
    dom.pinnedGrid.innerHTML = '';
    pinnedList.forEach(note => {
      dom.pinnedGrid.appendChild(createNoteCardElement(note));
    });
  } else {
    dom.pinnedSection.classList.add('hidden');
    dom.pinnedGrid.innerHTML = '';
  }

  // Render main section
  dom.notesGrid.innerHTML = '';
  if (otherList.length > 0) {
    dom.emptyNotesState.classList.add('hidden');
    otherList.forEach(note => {
      dom.notesGrid.appendChild(createNoteCardElement(note));
    });
  } else if (pinnedList.length === 0) {
    dom.emptyNotesState.classList.remove('hidden');
  } else {
    dom.emptyNotesState.classList.add('hidden');
  }
}

function createNoteCardElement(note) {
  const card = document.createElement('div');
  const colorClass = `note-bg-${note.color || 'white'}`;
  card.className = `note-card relative flex flex-col justify-between p-5 rounded-3xl border shadow-xs hover:border-stone-300 transition-all cursor-pointer group ${colorClass}`;
  
  const words = typeof note.word_count === 'number' ? note.word_count : calculateWords(note.content);
  const readDuration = calculateReadingDuration(words);

  card.innerHTML = `
    <div>
      <div class="flex items-start justify-between gap-3 mb-2">
        <h3 class="font-bold text-stone-900 text-base leading-snug line-clamp-2">${escapeHtml(note.title || 'Untitled')}</h3>
        <button 
          data-action="toggle-pin" 
          class="shrink-0 p-1.5 -mr-1.5 -mt-1.5 rounded-lg text-stone-300 hover:text-amber-600 transition ${note.is_pinned ? 'text-amber-500 !opacity-100' : 'opacity-0 group-hover:opacity-100'}"
          title="${note.is_pinned ? 'Unpin' : 'Pin'}"
        >
          <svg class="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v8l3 3v1H2v-1l3-3V4z"></path></svg>
        </button>
      </div>

      <p class="text-xs text-stone-600 leading-relaxed line-clamp-4 whitespace-pre-line font-normal mb-4">${escapeHtml(note.content || '')}</p>
    </div>

    <div>
      ${note.category ? `
        <div class="mb-3">
          <span class="inline-block text-[10px] font-bold px-2 py-0.5 bg-stone-900/5 text-stone-700 rounded-md">
            #${escapeHtml(note.category)}
          </span>
        </div>
      ` : ''}

      <div class="flex items-center justify-between text-[11px] text-stone-400 border-t border-stone-900/5 pt-2.5">
        <span class="font-mono">${words} words &bull; ${readDuration.text}</span>
        
        <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
          <button data-action="toggle-archive" class="p-1 hover:text-stone-700 rounded transition" title="${note.is_archived ? 'Unarchive' : 'Archive'}">
            ${note.is_archived ? '📥' : '📦'}
          </button>
          <button data-action="quick-delete" class="p-1 hover:text-rose-600 rounded transition" title="Delete">
            🗑️
          </button>
        </div>
      </div>
    </div>
  `;

  // Click card to edit
  card.addEventListener('click', (e) => {
    const actionBtn = e.target.closest('[data-action]');
    if (actionBtn) {
      e.stopPropagation();
      const action = actionBtn.getAttribute('data-action');
      if (action === 'toggle-pin') handleTogglePin(note);
      if (action === 'toggle-archive') handleToggleArchive(note);
      if (action === 'quick-delete') handleDeleteNote(note.id);
      return;
    }
    openEditNoteModal(note);
  });

  return card;
}

// ==========================================
// 5. NOTE OPERATIONS
// ==========================================

function openNewNoteModal() {
  dom.editingNoteId.value = '';
  dom.modalTitle.textContent = 'Create Note';
  dom.noteTitleInput.value = '';
  dom.noteContentInput.value = '';
  dom.noteCategoryInput.value = state.activeCategory || '';
  state.selectedColor = 'white';
  state.isPinnedDraft = false;
  updateColorDotSelection();
  updateModalPinUI();
  updateModalLiveCalculations();
  dom.deleteNoteBtn.classList.add('hidden');
  dom.noteModal.classList.remove('hidden');
  dom.noteTitleInput.focus();
}

function openEditNoteModal(note) {
  dom.editingNoteId.value = note.id;
  dom.modalTitle.textContent = 'Edit Note';
  dom.noteTitleInput.value = note.title || '';
  dom.noteContentInput.value = note.content || '';
  dom.noteCategoryInput.value = note.category || '';
  state.selectedColor = note.color || 'white';
  state.isPinnedDraft = !!note.is_pinned;
  updateColorDotSelection();
  updateModalPinUI();
  updateModalLiveCalculations();
  dom.deleteNoteBtn.classList.remove('hidden');
  dom.noteModal.classList.remove('hidden');
}

function closeNoteModal() {
  dom.noteModal.classList.add('hidden');
}

function updateColorDotSelection() {
  dom.colorPickerDots.forEach(dot => {
    const color = dot.getAttribute('data-color');
    if (color === state.selectedColor) {
      dot.classList.add('ring-2', 'ring-amber-500', 'ring-offset-1');
    } else {
      dot.classList.remove('ring-2', 'ring-amber-500', 'ring-offset-1');
    }
  });
}

function updateModalPinUI() {
  if (state.isPinnedDraft) {
    dom.modalPinIcon.setAttribute('fill', 'currentColor');
    dom.modalPinBtn.classList.add('text-amber-500');
    dom.modalPinBtn.classList.remove('text-stone-400');
  } else {
    dom.modalPinIcon.setAttribute('fill', 'none');
    dom.modalPinBtn.classList.remove('text-amber-500');
    dom.modalPinBtn.classList.add('text-stone-400');
  }
}

async function handleNoteFormSubmit(e) {
  e.preventDefault();
  const title = dom.noteTitleInput.value.trim();
  const content = dom.noteContentInput.value.trim();
  const category = dom.noteCategoryInput.value.trim();
  const editingId = dom.editingNoteId.value;

  if (!title && !content) {
    showToast('Please enter a title or content for your note', 'error');
    return;
  }

  // Mandatory local calculations
  const wordCount = calculateWords(content);
  const charCount = calculateChars(content);
  const readingDuration = calculateReadingDuration(wordCount);
  const readTimeSeconds = Math.round((wordCount / 200) * 60);

  const payload = {
    title: title || 'Untitled Note',
    content: content,
    category: category,
    color: state.selectedColor || 'white',
    is_pinned: state.isPinnedDraft,
    is_archived: false,
    word_count: wordCount,
    char_count: charCount,
    read_time_seconds: readTimeSeconds
  };

  try {
    if (state.token) {
      if (editingId) {
        await API.updateNote(editingId, payload);
        const idx = state.notes.findIndex(n => n.id === editingId);
        if (idx !== -1) {
          state.notes[idx] = { id: editingId, ...payload };
        }
        showToast('Note updated successfully');
      } else {
        const created = await API.createNote(payload);
        state.notes.unshift(created);
        showToast('Note created in cloud');
      }
    } else {
      // Guest mode storage
      if (editingId) {
        const idx = state.notes.findIndex(n => n.id === editingId);
        if (idx !== -1) {
          state.notes[idx] = { id: editingId, ...payload };
        }
      } else {
        const guestNote = {
          id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          ...payload
        };
        state.notes.unshift(guestNote);
      }
      saveGuestNotes(state.notes);
      showToast('Note saved locally');
    }

    closeNoteModal();
    recalculateGlobalMetrics();
    renderCategories();
    renderNotes();
  } catch (err) {
    showToast(err.message || 'Operation failed', 'error');
  }
}

async function handleTogglePin(note) {
  const newPinState = !note.is_pinned;
  note.is_pinned = newPinState;

  if (state.token) {
    try {
      await API.updateNote(note.id, { is_pinned: newPinState });
    } catch (e) {
      showToast('Failed to update pin on server', 'error');
      note.is_pinned = !newPinState;
    }
  } else {
    saveGuestNotes(state.notes);
  }
  recalculateGlobalMetrics();
  renderNotes();
}

async function handleToggleArchive(note) {
  const newArchiveState = !note.is_archived;
  note.is_archived = newArchiveState;

  if (state.token) {
    try {
      await API.updateNote(note.id, { is_archived: newArchiveState });
      showToast(newArchiveState ? 'Note archived' : 'Note unarchived');
    } catch (e) {
      showToast('Failed to update archive on server', 'error');
      note.is_archived = !newArchiveState;
    }
  } else {
    saveGuestNotes(state.notes);
    showToast(newArchiveState ? 'Note archived' : 'Note unarchived');
  }
  recalculateGlobalMetrics();
  renderCategories();
  renderNotes();
}

async function handleDeleteNote(id) {
  if (!confirm('Are you sure you want to delete this note?')) return;

  try {
    if (state.token) {
      await API.deleteNote(id);
    }
    state.notes = state.notes.filter(n => n.id !== id);
    if (!state.token) {
      saveGuestNotes(state.notes);
    }
    showToast('Note deleted');
    closeNoteModal();
    recalculateGlobalMetrics();
    renderCategories();
    renderNotes();
  } catch (err) {
    showToast(err.message || 'Failed to delete note', 'error');
  }
}

// ==========================================
// 6. AUTHENTICATION & OTP PASSWORD WORKFLOW
// ==========================================

function updateAuthUI() {
  if (state.token && state.userEmail) {
    dom.authActionBtn.textContent = 'Account';
    dom.authAccountCard.classList.remove('hidden');
    dom.authUserEmail.textContent = state.userEmail;
  } else {
    dom.authActionBtn.textContent = 'Sign In';
    dom.authAccountCard.classList.add('hidden');
  }
}

function openAuthModal(mode = 'login') {
  state.authMode = mode;
  dom.authAlert.className = 'hidden mb-4 p-3 rounded-xl text-xs font-medium';
  dom.authAlert.textContent = '';
  
  if (mode === 'login') {
    dom.authModalTitle.textContent = 'Sign in to ZenithNotes';
    dom.authModalSub.textContent = 'Access your notes anywhere with cloud sync';
    dom.authSubmitBtn.textContent = 'Sign In';
    dom.authTogglePrompt.textContent = "Don't have an account?";
    dom.toggleAuthModeBtn.textContent = 'Sign Up';
    dom.openForgotBtn.classList.remove('hidden');
  } else {
    dom.authModalTitle.textContent = 'Create an Account';
    dom.authModalSub.textContent = 'Start organizing with unlimited sync';
    dom.authSubmitBtn.textContent = 'Create Account';
    dom.authTogglePrompt.textContent = 'Already have an account?';
    dom.toggleAuthModeBtn.textContent = 'Sign In';
    dom.openForgotBtn.classList.add('hidden');
  }

  dom.authModal.classList.remove('hidden');
  dom.authEmail.focus();
}

function closeAuthModal() {
  dom.authModal.classList.add('hidden');
}

async function handleAuthFormSubmit(e) {
  e.preventDefault();
  const email = dom.authEmail.value.trim();
  const password = dom.authPassword.value;

  dom.authAlert.className = 'hidden mb-4 p-3 rounded-xl text-xs font-medium';
  dom.authSubmitBtn.disabled = true;
  dom.authSubmitBtn.textContent = 'Processing...';

  try {
    if (state.authMode === 'register') {
      // 1. Call POST /register
      const regRes = await API.register(email, password);
      if (regRes.status !== 200 && !regRes.data.success) {
        throw new Error(regRes.data.message || regRes.data.error || 'Registration failed');
      }

      // 2. CRITICAL AUTH RULE: POST /register does NOT return token.
      // Call POST /login using the same email & password to retrieve token.
      const loginRes = await API.login(email, password);
      if (!loginRes.data.success || !loginRes.data.token) {
        throw new Error(loginRes.data.message || loginRes.data.error || 'Account created, please sign in.');
      }

      state.token = loginRes.data.token;
      state.userEmail = email;
      localStorage.setItem('zenithnotes_token', state.token);
      localStorage.setItem('zenithnotes_user_email', state.userEmail);
      showToast('Account registered and logged in!');
    } else {
      // Login flow
      const loginRes = await API.login(email, password);
      if (!loginRes.data.success || !loginRes.data.token) {
        throw new Error(loginRes.data.message || loginRes.data.error || 'Invalid credentials');
      }

      state.token = loginRes.data.token;
      state.userEmail = email;
      localStorage.setItem('zenithnotes_token', state.token);
      localStorage.setItem('zenithnotes_user_email', state.userEmail);
      showToast('Logged in successfully!');
    }

    closeAuthModal();
    updateAuthUI();
    await refreshAllNotes();
  } catch (err) {
    dom.authAlert.textContent = err.message;
    dom.authAlert.className = 'mb-4 p-3 rounded-xl text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 block';
  } finally {
    dom.authSubmitBtn.disabled = false;
    dom.authSubmitBtn.textContent = state.authMode === 'register' ? 'Create Account' : 'Sign In';
  }
}

async function handleLogout() {
  await API.logout();
  state.token = null;
  state.userEmail = null;
  localStorage.removeItem('zenithnotes_token');
  localStorage.removeItem('zenithnotes_user_email');
  updateAuthUI();
  showToast('Logged out. Switched to offline storage.');
  await refreshAllNotes();
}

// Password Reset OTP Flow
function openOtpModal() {
  closeAuthModal();
  dom.otpAlert.className = 'hidden mb-4 p-3 rounded-xl text-xs font-medium';
  dom.requestOtpForm.classList.remove('hidden');
  dom.verifyOtpForm.classList.add('hidden');
  dom.otpRequestEmail.value = dom.authEmail.value || '';
  dom.otpModal.classList.remove('hidden');
}

function closeOtpModal() {
  dom.otpModal.classList.add('hidden');
}

async function handleRequestOtp(e) {
  e.preventDefault();
  const email = dom.otpRequestEmail.value.trim();
  dom.otpAlert.className = 'hidden mb-4 p-3 rounded-xl text-xs font-medium';

  const btn = document.getElementById('sendOtpBtn');
  btn.disabled = true;
  btn.textContent = 'Sending...';

  try {
    const res = await API.requestOtp(email);
    if (res.success) {
      dom.otpAlert.textContent = 'OTP sent! Please check your Gmail/inbox.';
      dom.otpAlert.className = 'mb-4 p-3 rounded-xl text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 block';
      dom.requestOtpForm.classList.add('hidden');
      dom.verifyOtpForm.classList.remove('hidden');
    } else {
      throw new Error(res.message || res.error || 'Failed to request OTP');
    }
  } catch (err) {
    dom.otpAlert.textContent = err.message;
    dom.otpAlert.className = 'mb-4 p-3 rounded-xl text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Send Verification Code';
  }
}

async function handleVerifyOtpAndReset(e) {
  e.preventDefault();
  const email = dom.otpRequestEmail.value.trim();
  const otp = dom.otpCodeInput.value.trim();
  const newPassword = dom.otpNewPassword.value;

  const btn = document.getElementById('resetPassSubmitBtn');
  btn.disabled = true;
  btn.textContent = 'Resetting...';

  try {
    const res = await API.resetPassword(email, otp, newPassword);
    if (res.success) {
      showToast('Password reset successfully! Please sign in.');
      closeOtpModal();
      openAuthModal('login');
      dom.authEmail.value = email;
    } else {
      throw new Error(res.message || res.error || 'Reset failed');
    }
  } catch (err) {
    dom.otpAlert.textContent = err.message;
    dom.otpAlert.className = 'mb-4 p-3 rounded-xl text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 block';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Update Password';
  }
}

// ==========================================
// 7. UTILITIES & TOASTS
// ==========================================

function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  const bg = type === 'error' ? 'bg-rose-900 text-white' : 'bg-stone-900 text-white';
  toast.className = `toast-message pointer-events-auto px-4 py-2.5 rounded-2xl shadow-xl text-xs font-semibold flex items-center gap-2 ${bg}`;
  toast.innerHTML = `
    <span>${type === 'error' ? '⚠️' : '✓'}</span>
    <span>${escapeHtml(message)}</span>
  `;
  dom.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => toast.remove(), 200);
  }, 3200);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ==========================================
// 8. EVENT BINDINGS & INIT
// ==========================================

function setupEventListeners() {
  // New Note
  dom.openNewNoteBtn.addEventListener('click', openNewNoteModal);
  dom.emptyStateNewNoteBtn.addEventListener('click', openNewNoteModal);

  // Note Modal actions
  dom.closeModalBtn.addEventListener('click', closeNoteModal);
  dom.cancelNoteModalBtn.addEventListener('click', closeNoteModal);
  dom.noteForm.addEventListener('submit', handleNoteFormSubmit);
  dom.deleteNoteBtn.addEventListener('click', () => {
    const id = dom.editingNoteId.value;
    if (id) handleDeleteNote(id);
  });

  // Modal Color picking
  dom.colorPickerDots.forEach(dot => {
    dot.addEventListener('click', () => {
      state.selectedColor = dot.getAttribute('data-color');
      updateColorDotSelection();
    });
  });

  // Modal Pin toggle
  dom.modalPinBtn.addEventListener('click', () => {
    state.isPinnedDraft = !state.isPinnedDraft;
    updateModalPinUI();
  });

  // Live modal metric calculation
  dom.noteContentInput.addEventListener('input', updateModalLiveCalculations);

  // Search input
  dom.searchInput.addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    if (state.searchQuery) {
      dom.clearSearchBtn.classList.remove('hidden');
    } else {
      dom.clearSearchBtn.classList.add('hidden');
    }
    renderNotes();
  });

  dom.clearSearchBtn.addEventListener('click', () => {
    dom.searchInput.value = '';
    state.searchQuery = '';
    dom.clearSearchBtn.classList.add('hidden');
    renderNotes();
  });

  // Navigation Filter Tabs
  dom.filterTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      state.activeFilter = tab.getAttribute('data-filter');
      state.activeCategory = null;
      updateActiveFilterUI();
      renderCategories();
      renderNotes();
    });
  });

  // Auth Modals
  dom.authActionBtn.addEventListener('click', () => {
    if (state.token) {
      dom.authAccountCard.classList.toggle('hidden');
    } else {
      openAuthModal('login');
    }
  });

  dom.closeAuthModalBtn.addEventListener('click', closeAuthModal);
  dom.authForm.addEventListener('submit', handleAuthFormSubmit);
  dom.toggleAuthModeBtn.addEventListener('click', () => {
    openAuthModal(state.authMode === 'login' ? 'register' : 'login');
  });
  dom.logoutBtn.addEventListener('click', handleLogout);

  // OTP Modals
  dom.openForgotBtn.addEventListener('click', openOtpModal);
  dom.closeOtpModalBtn.addEventListener('click', closeOtpModal);
  dom.backToSignInBtn.addEventListener('click', () => {
    closeOtpModal();
    openAuthModal('login');
  });
  dom.requestOtpForm.addEventListener('submit', handleRequestOtp);
  dom.verifyOtpForm.addEventListener('submit', handleVerifyOtpAndReset);

  // Close modals on background click
  window.addEventListener('click', (e) => {
    if (e.target === dom.noteModal) closeNoteModal();
    if (e.target === dom.authModal) closeAuthModal();
    if (e.target === dom.otpModal) closeOtpModal();
  });

  // Keyboard shortcut: Esc closes modals
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeNoteModal();
      closeAuthModal();
      closeOtpModal();
    }
  });
}

// Bootstrap
window.addEventListener('DOMContentLoaded', async () => {
  setupEventListeners();
  updateAuthUI();
  await refreshAllNotes();
});