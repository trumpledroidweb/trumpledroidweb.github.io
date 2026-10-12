/**
 * noyes Web Application
 * Complete implementation with:
 * - Deterministic native JavaScript calculations
 * - Generic backend authentication & persistent /data CRUD
 * - Private Image Worker integration with client-side canvas compression
 * - OTP password reset workflow
 */

// Global State
let APP_ID = 'noyes_decision_hub';
let API_BASE_URL = 'https://trumpledroid-api.cloudbeta28624.workers.dev';
const IMAGE_WORKER_URL = 'https://trumpledroid-image.cloudbeta28624.workers.dev';

let currentUser = null;
let authToken = localStorage.getItem('noyes_auth_token') || null;
let userEmail = localStorage.getItem('noyes_user_email') || null;

let allPolls = [];
let userVotes = {}; // Key: poll_id, Value: { choice: 'yes'|'no', vote_record_id: '...' }
let activeCategory = 'all';
let searchQuery = '';
let showingMyPollsOnly = false;
let pendingImageBlob = null;
let pendingImageBase64 = null;

// Fallback high-quality curated images for categories if no custom photo uploaded
const FALLBACK_CATEGORY_IMAGES = {
  'Lifestyle': 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80',
  'Tech': 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80',
  'Fashion': 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=800&q=80',
  'Dilemmas': 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=800&q=80',
  'Entertainment': 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=800&q=80',
  'Default': 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=800&q=80'
};

// =====================================================================
// 1. DETERMINISTIC OFFLINE CALCULATIONS ENGINE
// All calculations run purely in client-side native JavaScript
// =====================================================================

const Calculations = {
  // Calculate total votes cast
  calculateTotalVotes(yesVotes, noVotes) {
    const y = Number(yesVotes) || 0;
    const n = Number(noVotes) || 0;
    return y + n;
  },

  // Calculate percentage of Yes votes: (yes / total) * 100
  calculateYesPercentage(yesVotes, noVotes) {
    const total = this.calculateTotalVotes(yesVotes, noVotes);
    if (total === 0) return 50; // Neutral 50/50 baseline
    return Math.round((Number(yesVotes) / total) * 100);
  },

  // Calculate percentage of No votes: (no / total) * 100
  calculateNoPercentage(yesVotes, noVotes) {
    const total = this.calculateTotalVotes(yesVotes, noVotes);
    if (total === 0) return 50;
    return Math.round((Number(noVotes) / total) * 100);
  },

  // Aggregate grand total votes across an entire array of records
  calculateGrandTotalVotes(records) {
    if (!Array.isArray(records)) return 0;
    return records.reduce((acc, r) => {
      const data = r.data || {};
      return acc + (Number(data.yes_votes) || 0) + (Number(data.no_votes) || 0);
    }, 0);
  },

  // Deterministic consensus status
  getConsensusStatus(yesVotes, noVotes) {
    const total = this.calculateTotalVotes(yesVotes, noVotes);
    if (total === 0) return { label: 'Awaiting Votes', color: 'slate' };
    const yesPct = this.calculateYesPercentage(yesVotes, noVotes);
    if (yesPct > 55) return { label: 'Strong YES', color: 'emerald' };
    if (yesPct < 45) return { label: 'Strong NO', color: 'rose' };
    return { label: 'Tied Consensus', color: 'amber' };
  }
};

// =====================================================================
// 2. BACKEND API CLIENT
// Adheres strictly to backend request/response contracts
// =====================================================================

const ApiClient = {
  // Generic headers generator
  headers(withAuth = false, isJson = true) {
    const h = {};
    if (isJson) h['Content-Type'] = 'application/json';
    if (withAuth && authToken) {
      h['Authorization'] = `Bearer ${authToken}`;
    }
    return h;
  },

  // Account Registration (POST /register)
  async register(email, password) {
    const res = await fetch(`${API_BASE_URL}/register`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        app_id: APP_ID,
        email: email.trim(),
        password: password
      })
    });
    const json = await res.json();
    if (!res.ok || json.success === false) {
      throw new Error(json.error || json.message || 'Registration failed');
    }
    return json;
  },

  // Login (POST /login) -> Extracts Token
  async login(email, password) {
    const res = await fetch(`${API_BASE_URL}/login`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        app_id: APP_ID,
        email: email.trim(),
        password: password
      })
    });
    const json = await res.json();
    if (!res.ok || json.success === false) {
      throw new Error(json.error || json.message || 'Login failed');
    }
    return json;
  },

  // Logout (POST /logout)
  async logout() {
    if (!authToken) return;
    try {
      await fetch(`${API_BASE_URL}/logout`, {
        method: 'POST',
        headers: this.headers(true)
      });
    } catch (e) {
      console.warn('Logout notice:', e);
    }
  },

  // Password Reset: Request OTP (POST /request-otp)
  async requestOtp(email) {
    const res = await fetch(`${API_BASE_URL}/request-otp`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        app_id: APP_ID,
        email: email.trim()
      })
    });
    const json = await res.json();
    if (!res.ok || json.success === false) {
      throw new Error(json.error || json.message || 'Could not send OTP');
    }
    return json;
  },

  // Password Reset: Reset with OTP (POST /reset-password)
  async resetPassword(email, otp, newPassword) {
    const res = await fetch(`${API_BASE_URL}/reset-password`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({
        app_id: APP_ID,
        email: email.trim(),
        otp: otp.trim(),
        new_password: newPassword
      })
    });
    const json = await res.json();
    if (!res.ok || json.success === false) {
      throw new Error(json.error || json.message || 'Password reset failed');
    }
    return json;
  },

  // Generic CREATE (POST /data)
  async createData(collection, data) {
    const res = await fetch(`${API_BASE_URL}/data`, {
      method: 'POST',
      headers: this.headers(true),
      body: JSON.stringify({
        collection,
        data
      })
    });
    const json = await res.json();
    if (!res.ok || !json.success || !json.record) {
      throw new Error(json.error || json.message || 'Failed to create record');
    }
    return json.record;
  },

  // Generic READ (GET /data?collection=...)
  async readData(collection) {
    const res = await fetch(`${API_BASE_URL}/data?collection=${encodeURIComponent(collection)}`, {
      method: 'GET',
      headers: this.headers(true)
    });
    const json = await res.json();
    if (!res.ok || !json.success || !Array.isArray(json.records)) {
      throw new Error(json.error || json.message || 'Failed to retrieve records');
    }
    return json.records;
  },

  // Generic UPDATE (PUT /data)
  async updateData(id, data) {
    const res = await fetch(`${API_BASE_URL}/data`, {
      method: 'PUT',
      headers: this.headers(true),
      body: JSON.stringify({
        id,
        data
      })
    });
    const json = await res.json();
    if (!res.ok || !json.success || !json.id) {
      throw new Error(json.error || json.message || 'Failed to update record');
    }
    return json;
  },

  // Generic DELETE (DELETE /data?id=...)
  async deleteData(id) {
    const res = await fetch(`${API_BASE_URL}/data?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: this.headers(true)
    });
    const json = await res.json();
    if (!res.ok || !json.success || !json.id) {
      throw new Error(json.error || json.message || 'Failed to delete record');
    }
    return json;
  }
};

// =====================================================================
// 3. PRIVATE IMAGE WORKER & COMPRESSION CLIENT
// Compresses locally < 200KB via canvas before uploading
// =====================================================================

const ImageWorkerClient = {
  // Compress image client-side to ensure file size <= 200KB
  async compressImage(file, maxDimension = 1200, targetMaxBytes = 195000) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Progressive quality reduction loop
          let quality = 0.85;
          const attemptCompression = () => {
            canvas.toBlob(
              (blob) => {
                if (!blob) return reject(new Error('Canvas compression failed'));
                if (blob.size <= targetMaxBytes || quality <= 0.25) {
                  resolve(blob);
                } else {
                  quality -= 0.15;
                  attemptCompression();
                }
              },
              'image/jpeg',
              quality
            );
          };
          attemptCompression();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  },

  // Upload to Image Worker (POST /upload)
  async upload(blob) {
    if (!authToken) {
      throw new Error('Please sign in to upload images');
    }
    const formData = new FormData();
    formData.append('image', blob, 'dilemma.jpg');

    const res = await fetch(`${IMAGE_WORKER_URL}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.error || json.message || 'Image upload failed');
    }

    // Safely extract the real image id
    const imageId = json.id || json.image_id || (json.image && json.image.id);
    if (!imageId) {
      throw new Error('Image Worker did not return image ID');
    }
    return imageId;
  },

  // Get image URL with fallback to public mock or private retrieval url
  getImageUrl(imageId, category) {
    if (!imageId) {
      return FALLBACK_CATEGORY_IMAGES[category] || FALLBACK_CATEGORY_IMAGES['Default'];
    }
    if (imageId.startsWith('http://') || imageId.startsWith('https://')) {
      return imageId;
    }
    return `${IMAGE_WORKER_URL}/image?id=${encodeURIComponent(imageId)}`;
  }
};

// =====================================================================
// 4. UI NOTIFICATIONS & HELPERS
// =====================================================================

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  const colorMap = {
    success: 'bg-emerald-500 text-slate-950 border-emerald-400',
    error: 'bg-rose-500 text-white border-rose-400',
    info: 'bg-slate-800 text-white border-slate-700'
  };
  toast.className = `px-4 py-3 rounded-xl border text-xs font-bold shadow-xl pointer-events-auto transform translate-y-2 opacity-0 transition-all duration-300 flex items-center gap-2 ${colorMap[type] || colorMap.info}`;
  toast.innerHTML = `<span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// =====================================================================
// 5. APPLICATION INITIALIZATION & AUTH STATE
// =====================================================================

async function initApp() {
  // Load app metadata dynamically
  try {
    const metaRes = await fetch('app-meta.json');
    if (metaRes.ok) {
      const meta = await metaRes.json();
      if (meta.app_id) APP_ID = meta.app_id;
    }
  } catch (err) {
    console.log('Using default App ID');
  }

  // Load api schema dynamically
  try {
    const schemaRes = await fetch('api_schema.json');
    if (schemaRes.ok) {
      const schema = await schemaRes.json();
      if (schema.api_base_url) API_BASE_URL = schema.api_base_url;
    }
  } catch (err) {
    console.log('Using default API Base URL');
  }

  updateAuthUI();
  setupEventListeners();
  await loadData();
}

function updateAuthUI() {
  const loggedOutNav = document.getElementById('loggedOutNav');
  const loggedInNav = document.getElementById('loggedInNav');
  const userEmailNav = document.getElementById('userEmailNav');
  const userAvatarText = document.getElementById('userAvatarText');

  if (authToken && userEmail) {
    loggedOutNav.classList.add('hidden');
    loggedInNav.classList.remove('hidden');
    userEmailNav.textContent = userEmail;
    userAvatarText.textContent = userEmail.charAt(0).toUpperCase();
  } else {
    loggedOutNav.classList.remove('hidden');
    loggedInNav.classList.add('hidden');
  }
}

// =====================================================================
// 6. DATA FETCHING & VOTING OPERATIONS
// =====================================================================

async function loadData() {
  try {
    // 1. Fetch Polls
    const pollRecords = await ApiClient.readData('polls');
    allPolls = pollRecords || [];

    // 2. Fetch User Votes if logged in
    userVotes = {};
    if (authToken && userEmail) {
      try {
        const voteRecords = await ApiClient.readData('votes');
        if (Array.isArray(voteRecords)) {
          voteRecords.forEach((rec) => {
            if (rec.data && rec.data.user_email === userEmail) {
              userVotes[rec.data.poll_id] = {
                choice: rec.data.choice,
                voteRecordId: rec.id
              };
            }
          });
        }
      } catch (err) {
        console.warn('Votes fetch:', err.message);
      }
    }

    renderPolls();
    updateGlobalMetrics();
  } catch (err) {
    console.error('Data load error:', err);
    // If unauthorized or expired token, clear and prompt
    if (err.message && err.message.toLowerCase().includes('unauthorized')) {
      handleLogout(false);
    }
    renderPolls();
  }
}

// Calculate summary numbers across fetched data using native JS
function updateGlobalMetrics() {
  const totalCommunityVotes = Calculations.calculateGrandTotalVotes(allPolls);
  document.getElementById('totalCommunityVotes').textContent = totalCommunityVotes.toLocaleString();
  document.getElementById('totalQuestionsCount').textContent = allPolls.length.toLocaleString();
}

// Render Poll Cards with Deterministic Calculation Output
function renderPolls() {
  const container = document.getElementById('pollsGrid');
  const emptyState = document.getElementById('emptyState');
  container.innerHTML = '';

  // Filter based on active category, search query, and user view
  let filtered = allPolls.filter((item) => {
    const data = item.data || {};
    // Category match
    if (activeCategory !== 'all' && (data.category || '').toLowerCase() !== activeCategory.toLowerCase()) {
      return false;
    }
    // Search match
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const inTitle = (data.title || '').toLowerCase().includes(q);
      const inDesc = (data.description || '').toLowerCase().includes(q);
      if (!inTitle && !inDesc) return false;
    }
    // My polls only
    if (showingMyPollsOnly) {
      if (data.author_email !== userEmail) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  } else {
    emptyState.classList.add('hidden');
  }

  // Generate cards
  filtered.forEach((poll) => {
    const d = poll.data || {};
    const pollId = poll.id;
    const yesCount = Number(d.yes_votes) || 0;
    const noCount = Number(d.no_votes) || 0;

    // LOCAL DETERMINISTIC CALCULATIONS
    const totalVotes = Calculations.calculateTotalVotes(yesCount, noCount);
    const yesPct = Calculations.calculateYesPercentage(yesCount, noCount);
    const noPct = Calculations.calculateNoPercentage(yesCount, noCount);
    const consensus = Calculations.getConsensusStatus(yesCount, noCount);

    // User's own voting status on this poll
    const currentVote = userVotes[pollId]?.choice; // 'yes' or 'no' or undefined
    const isAuthor = (d.author_email && d.author_email === userEmail);

    const imageUrl = ImageWorkerClient.getImageUrl(d.image_id, d.category);

    const card = document.createElement('div');
    card.className = 'poll-card bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-xl hover:border-slate-700 transition duration-300 relative';
    card.setAttribute('data-poll-id', pollId);

    card.innerHTML = `
      <!-- Card Image -->
      <div class="poll-image-container h-52 w-full bg-slate-950 relative">
        <img src="${imageUrl}" alt="${escapeHtml(d.title)}" 
          class="w-full h-full object-cover" 
          onerror="this.src='${FALLBACK_CATEGORY_IMAGES['Default']}';">
        <div class="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/30"></div>
        
        <!-- Category & Consensus Badges -->
        <div class="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap">
          <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-900/80 backdrop-blur-md text-teal-300 border border-teal-500/30">
            ${escapeHtml(d.category || 'General')}
          </span>
          <span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-900/80 backdrop-blur-md text-${consensus.color}-400 border border-${consensus.color}-500/30">
            ${consensus.label}
          </span>
        </div>

        ${isAuthor ? `
          <button data-action="delete-poll" data-id="${pollId}" class="absolute top-3 right-3 p-1.5 rounded-full bg-rose-500/80 hover:bg-rose-600 text-white transition shadow" title="Delete your dilemma">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
          </button>
        ` : ''}

        <!-- Total tally floating at bottom of image -->
        <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs font-semibold text-slate-300">
          <span class="flex items-center gap-1">
            <svg class="w-3.5 h-3.5 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
            ${totalVotes} total votes
          </span>
          <span class="text-[11px] text-slate-400">by ${escapeHtml((d.author_email || 'anon').split('@')[0])}</span>
        </div>
      </div>

      <!-- Card Body Content -->
      <div class="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h4 class="text-base font-extrabold text-white leading-snug mb-1.5">${escapeHtml(d.title)}</h4>
          ${d.description ? `<p class="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">${escapeHtml(d.description)}</p>` : '<div class="mb-4"></div>'}
        </div>

        <!-- Live Deterministic Percentage Comparison Bar -->
        <div class="space-y-2 mb-5">
          <div class="flex items-center justify-between text-xs font-bold">
            <span class="text-emerald-400 flex items-center gap-1">
              <span>YES</span> <span class="font-mono text-white text-sm">${yesPct}%</span> <span class="text-[10px] text-slate-400 font-normal">(${yesCount})</span>
            </span>
            <span class="text-rose-400 flex items-center gap-1">
              <span class="text-[10px] text-slate-400 font-normal">(${noCount})</span> <span class="font-mono text-white text-sm">${noPct}%</span> <span>NO</span>
            </span>
          </div>

          <!-- Dual Ratio Bar -->
          <div class="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex p-0.5 gap-0.5">
            <div class="ratio-bar h-full rounded-l-full bg-gradient-to-r from-emerald-500 to-teal-400" style="width: ${yesPct}%"></div>
            <div class="ratio-bar h-full rounded-r-full bg-gradient-to-r from-rose-500 to-rose-600" style="width: ${noPct}%"></div>
          </div>
        </div>

        <!-- Interactive YES / NO Action Buttons -->
        <div class="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
          <button data-action="vote" data-choice="yes" data-id="${pollId}" 
            class="py-2.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
              currentVote === 'yes'
                ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-300 shadow-lg shadow-emerald-500/20'
                : 'bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-800/50'
            }">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path></svg>
            <span>${currentVote === 'yes' ? 'VOTED YES' : 'VOTE YES'}</span>
          </button>

          <button data-action="vote" data-choice="no" data-id="${pollId}" 
            class="py-2.5 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer ${
              currentVote === 'no'
                ? 'bg-rose-500 text-white ring-2 ring-rose-300 shadow-lg shadow-rose-500/20'
                : 'bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border border-rose-800/50'
            }">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
            <span>${currentVote === 'no' ? 'VOTED NO' : 'VOTE NO'}</span>
          </button>
        </div>
      </div>
    `;

    container.appendChild(card);
  });
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

// =====================================================================
// 7. VOTE CASTING & LOCAL RE-CALCULATION
// =====================================================================

async function handleVote(pollId, chosenChoice) {
  if (!authToken || !userEmail) {
    showToast('Please sign in to cast your Yes/No vote', 'info');
    openAuthModal('login');
    return;
  }

  const pollIndex = allPolls.findIndex((p) => p.id === pollId);
  if (pollIndex === -1) return;

  const currentPoll = allPolls[pollIndex];
  const pollData = { ...currentPoll.data };
  let yesVotes = Number(pollData.yes_votes) || 0;
  let noVotes = Number(pollData.no_votes) || 0;

  const previousVote = userVotes[pollId];

  // Already voted the exact same choice
  if (previousVote && previousVote.choice === chosenChoice) {
    showToast(`You already voted ${chosenChoice.toUpperCase()}`, 'info');
    return;
  }

  // Deterministically adjust vote numbers in memory
  if (previousVote) {
    // Changing choice: decrement previous, increment new
    if (previousVote.choice === 'yes') yesVotes = Math.max(0, yesVotes - 1);
    if (previousVote.choice === 'no') noVotes = Math.max(0, noVotes - 1);
  }

  if (chosenChoice === 'yes') {
    yesVotes += 1;
  } else {
    noVotes += 1;
  }

  // Update memory state immediately for instant responsive UI
  pollData.yes_votes = yesVotes;
  pollData.no_votes = noVotes;
  allPolls[pollIndex].data = pollData;
  userVotes[pollId] = {
    choice: chosenChoice,
    voteRecordId: previousVote ? previousVote.voteRecordId : null
  };

  renderPolls();
  updateGlobalMetrics();

  // Persist the updated count to backend /data
  try {
    await ApiClient.updateData(pollId, {
      yes_votes: yesVotes,
      no_votes: noVotes
    });

    // Record the user vote
    if (previousVote && previousVote.voteRecordId) {
      await ApiClient.updateData(previousVote.voteRecordId, {
        poll_id: pollId,
        choice: chosenChoice,
        user_email: userEmail
      });
    } else {
      const voteRecord = await ApiClient.createData('votes', {
        poll_id: pollId,
        choice: chosenChoice,
        user_email: userEmail
      });
      userVotes[pollId].voteRecordId = voteRecord.id;
    }

    showToast(`Voted ${chosenChoice.toUpperCase()} successfully!`, 'success');
  } catch (err) {
    console.error('Vote sync error:', err);
    showToast('Error syncing vote to cloud: ' + err.message, 'error');
  }
}

// =====================================================================
// 8. POLL CREATION & IMAGE UPLOAD WORKFLOW
// =====================================================================

async function handleCreatePollSubmit(e) {
  e.preventDefault();
  if (!authToken) {
    showToast('Please sign in to publish a question', 'error');
    openAuthModal('login');
    return;
  }

  const title = document.getElementById('pollTitleInput').value.trim();
  const description = document.getElementById('pollDescInput').value.trim();
  const category = document.getElementById('pollCategoryInput').value;
  const submitBtn = document.getElementById('submitPollBtn');

  if (!title) {
    showToast('Please provide a question title', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = `
    <span class="inline-block animate-spin mr-2">⏳</span> Publishing...
  `;

  try {
    let uploadedImageId = '';

    // If an image was selected, compress and upload to private Image Worker
    if (pendingImageBlob) {
      showToast('Compressing & uploading visual photo...', 'info');
      uploadedImageId = await ImageWorkerClient.upload(pendingImageBlob);
    }

    // Persist to generic backend /data
    const newRecord = await ApiClient.createData('polls', {
      title,
      description,
      category,
      image_id: uploadedImageId,
      yes_votes: 0,
      no_votes: 0,
      author_email: userEmail
    });

    // Prepend locally & re-render
    allPolls.unshift(newRecord);
    renderPolls();
    updateGlobalMetrics();

    // Close & reset modal
    closeModal('createModal');
    resetCreateForm();
    showToast('Your question is live for voting!', 'success');
  } catch (err) {
    console.error('Publish error:', err);
    showToast('Failed to publish dilemma: ' + err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = 'Publish Question';
  }
}

function resetCreateForm() {
  document.getElementById('createPollForm').reset();
  pendingImageBlob = null;
  pendingImageBase64 = null;
  document.getElementById('dropZonePrompt').classList.remove('hidden');
  document.getElementById('dropZonePreview').classList.add('hidden');
  document.getElementById('previewImg').src = '';
}

// Handle file selection and canvas compression
async function handleImageFileSelect(file) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('Please select a valid image file', 'error');
    return;
  }

  try {
    showToast('Compressing image (< 200KB)...', 'info');
    const compressedBlob = await ImageWorkerClient.compressImage(file, 1200, 195000);
    pendingImageBlob = compressedBlob;

    // Display preview
    const previewUrl = URL.createObjectURL(compressedBlob);
    document.getElementById('previewImg').src = previewUrl;
    document.getElementById('previewName').textContent = file.name;
    document.getElementById('previewSize').textContent = `${(compressedBlob.size / 1024).toFixed(1)} KB (Ready)`;
    document.getElementById('dropZonePrompt').classList.add('hidden');
    document.getElementById('dropZonePreview').classList.remove('hidden');
  } catch (err) {
    console.error('Compression error:', err);
    showToast('Image processing failed: ' + err.message, 'error');
  }
}

// Delete user's own dilemma
async function handleDeletePoll(pollId) {
  if (!confirm('Are you sure you want to permanently delete this dilemma?')) return;
  try {
    await ApiClient.deleteData(pollId);
    allPolls = allPolls.filter((p) => p.id !== pollId);
    delete userVotes[pollId];
    renderPolls();
    updateGlobalMetrics();
    showToast('Dilemma deleted successfully', 'success');
  } catch (err) {
    showToast('Failed to delete: ' + err.message, 'error');
  }
}

// =====================================================================
// 9. AUTHENTICATION & PASSWORD RESET HANDLERS
// =====================================================================

let activeAuthMode = 'login'; // 'login' or 'register'

function openAuthModal(mode = 'login') {
  activeAuthMode = mode;
  const tabLogin = document.getElementById('tabLogin');
  const tabRegister = document.getElementById('tabRegister');
  const title = document.getElementById('authModalTitle');
  const submitBtn = document.getElementById('authSubmitBtn');
  const forgotWrap = document.getElementById('forgotPasswordWrap');

  if (mode === 'login') {
    tabLogin.className = 'flex-1 py-2 text-xs font-bold rounded-lg bg-teal-500 text-slate-950 transition';
    tabRegister.className = 'flex-1 py-2 text-xs font-bold rounded-lg text-slate-300 hover:text-white transition';
    title.textContent = 'Welcome back to noyes';
    submitBtn.textContent = 'Sign In';
    forgotWrap.classList.remove('hidden');
  } else {
    tabRegister.className = 'flex-1 py-2 text-xs font-bold rounded-lg bg-teal-500 text-slate-950 transition';
    tabLogin.className = 'flex-1 py-2 text-xs font-bold rounded-lg text-slate-300 hover:text-white transition';
    title.textContent = 'Create your noyes Account';
    submitBtn.textContent = 'Create Account';
    forgotWrap.classList.add('hidden');
  }

  document.getElementById('authModal').classList.remove('hidden');
}

async function handleAuthSubmit(e) {
  e.preventDefault();
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const submitBtn = document.getElementById('authSubmitBtn');

  submitBtn.disabled = true;
  submitBtn.innerHTML = 'Please wait...';

  try {
    if (activeAuthMode === 'register') {
      // 1. Call POST /register
      await ApiClient.register(email, password);
      showToast('Account created! Logging in...', 'success');

      // 2. Critical rule: /register doesn't return token; call POST /login
      const loginRes = await ApiClient.login(email, password);
      if (!loginRes.token) {
        throw new Error('Authentication token not received upon login');
      }
      setAuthSession(loginRes.token, email);
    } else {
      // Direct login
      const loginRes = await ApiClient.login(email, password);
      if (!loginRes.token) {
        throw new Error('No authentication token returned');
      }
      setAuthSession(loginRes.token, email);
    }

    closeModal('authModal');
    showToast('Signed in successfully!', 'success');
    await loadData();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = activeAuthMode === 'login' ? 'Sign In' : 'Create Account';
  }
}

function setAuthSession(token, email) {
  authToken = token;
  userEmail = email;
  localStorage.setItem('noyes_auth_token', token);
  localStorage.setItem('noyes_user_email', email);
  updateAuthUI();
}

async function handleLogout(callApi = true) {
  if (callApi) {
    await ApiClient.logout();
  }
  authToken = null;
  userEmail = null;
  localStorage.removeItem('noyes_auth_token');
  localStorage.removeItem('noyes_user_email');
  userVotes = {};
  showingMyPollsOnly = false;
  document.getElementById('filterBanner').classList.add('hidden');
  updateAuthUI();
  showToast('Logged out', 'info');
  await loadData();
}

// Password Reset Step 1: Request OTP
async function handleRequestOtp(e) {
  e.preventDefault();
  const email = document.getElementById('forgotEmail').value.trim();
  const btn = document.getElementById('requestOtpBtn');
  btn.disabled = true;
  btn.innerHTML = 'Sending OTP...';

  try {
    await ApiClient.requestOtp(email);
    showToast('OTP sent to your email. Check your inbox!', 'success');
    document.getElementById('resetPasswordForm').classList.remove('hidden');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Send OTP Code';
  }
}

// Password Reset Step 2: Confirm OTP & New Password
async function handleResetPassword(e) {
  e.preventDefault();
  const email = document.getElementById('forgotEmail').value.trim();
  const otp = document.getElementById('otpCode').value.trim();
  const newPass = document.getElementById('newPassword').value;
  const btn = document.getElementById('resetPasswordBtn');

  btn.disabled = true;
  btn.innerHTML = 'Resetting...';

  try {
    await ApiClient.resetPassword(email, otp, newPass);
    showToast('Password reset successfully! You can now log in.', 'success');
    closeModal('forgotModal');
    openAuthModal('login');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.innerHTML = 'Confirm New Password';
  }
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.add('hidden');
}

// =====================================================================
// 10. EVENT LISTENERS SETUP
// =====================================================================

function setupEventListeners() {
  // Navigation Auth Buttons
  document.getElementById('navLoginBtn')?.addEventListener('click', () => openAuthModal('login'));
  document.getElementById('navRegisterBtn')?.addEventListener('click', () => openAuthModal('register'));
  document.getElementById('createPollBtn')?.addEventListener('click', () => {
    if (!authToken) {
      showToast('Please sign in first', 'info');
      openAuthModal('login');
      return;
    }
    document.getElementById('createModal').classList.remove('hidden');
  });

  // Empty state button
  document.getElementById('emptyCreateBtn')?.addEventListener('click', () => {
    if (!authToken) {
      openAuthModal('login');
    } else {
      document.getElementById('createModal').classList.remove('hidden');
    }
  });

  // User Profile Dropdown
  const userProfileBtn = document.getElementById('userProfileBtn');
  const userDropdown = document.getElementById('userDropdown');
  userProfileBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    userDropdown.classList.toggle('hidden');
  });
  document.addEventListener('click', () => {
    userDropdown?.classList.add('hidden');
  });

  // My Polls Filter
  document.getElementById('viewMyPollsBtn')?.addEventListener('click', () => {
    showingMyPollsOnly = true;
    document.getElementById('filterBanner').classList.remove('hidden');
    renderPolls();
  });
  document.getElementById('resetFilterBtn')?.addEventListener('click', () => {
    showingMyPollsOnly = false;
    document.getElementById('filterBanner').classList.add('hidden');
    renderPolls();
  });

  // Logout
  document.getElementById('logoutBtn')?.addEventListener('click', () => handleLogout(true));

  // Modal Closures
  document.getElementById('closeAuthModal')?.addEventListener('click', () => closeModal('authModal'));
  document.getElementById('closeForgotModal')?.addEventListener('click', () => closeModal('forgotModal'));
  document.getElementById('closeCreateModal')?.addEventListener('click', () => closeModal('createModal'));

  // Auth Switcher Tabs
  document.getElementById('tabLogin')?.addEventListener('click', () => openAuthModal('login'));
  document.getElementById('tabRegister')?.addEventListener('click', () => openAuthModal('register'));

  // Forgot Password trigger
  document.getElementById('openForgotBtn')?.addEventListener('click', () => {
    closeModal('authModal');
    document.getElementById('forgotModal').classList.remove('hidden');
  });

  // Forms
  document.getElementById('authForm')?.addEventListener('submit', handleAuthSubmit);
  document.getElementById('requestOtpForm')?.addEventListener('submit', handleRequestOtp);
  document.getElementById('resetPasswordForm')?.addEventListener('submit', handleResetPassword);
  document.getElementById('createPollForm')?.addEventListener('submit', handleCreatePollSubmit);

  // Search input with debounce
  let searchTimeout;
  document.getElementById('searchInput')?.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchQuery = e.target.value.trim();
      renderPolls();
    }, 250);
  });

  // Category Filtering
  const catButtons = document.querySelectorAll('.category-btn');
  catButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      catButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      activeCategory = btn.getAttribute('data-cat') || 'all';
      renderPolls();
    });
  });

  // Image Drag & Drop and Upload Selection
  const dropZone = document.getElementById('dropZone');
  const imageFileInput = document.getElementById('imageFileInput');
  dropZone?.addEventListener('click', () => imageFileInput.click());
  imageFileInput?.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageFileSelect(e.target.files[0]);
    }
  });

  dropZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-teal-500');
  });
  dropZone?.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-teal-500');
  });
  dropZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-teal-500');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFileSelect(e.dataTransfer.files[0]);
    }
  });

  document.getElementById('removeImgBtn')?.addEventListener('click', (e) => {
    e.stopPropagation();
    pendingImageBlob = null;
    imageFileInput.value = '';
    document.getElementById('dropZonePrompt').classList.remove('hidden');
    document.getElementById('dropZonePreview').classList.add('hidden');
    document.getElementById('previewImg').src = '';
  });

  // Event Delegation for Polls Grid (Vote & Delete)
  document.getElementById('pollsGrid')?.addEventListener('click', (e) => {
    const voteBtn = e.target.closest('[data-action="vote"]');
    if (voteBtn) {
      const pollId = voteBtn.getAttribute('data-id');
      const choice = voteBtn.getAttribute('data-choice');
      handleVote(pollId, choice);
      return;
    }

    const deleteBtn = e.target.closest('[data-action="delete-poll"]');
    if (deleteBtn) {
      const pollId = deleteBtn.getAttribute('data-id');
      handleDeletePoll(pollId);
      return;
    }
  });
}

// Kick off when DOM is ready
document.addEventListener('DOMContentLoaded', initApp);