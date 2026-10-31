let currentUser = JSON.parse(localStorage.getItem('pulse_user')) || null;
let savedPostIds = JSON.parse(localStorage.getItem('pulse_saved_posts')) || [];
let allPosts = [];
let allUsers = [];
let currentFeedMode = 'all'; // 'all' | 'following' | 'saved' | 'profile'
let viewedProfileId = null;
let searchQuery = '';
let activeSharePostId = null;

// Initialize Theme, Accent & Session on Load
window.addEventListener('DOMContentLoaded', () => {
  initAppearance();
  if (currentUser) {
    launchApp();
  }
});

// ================= THEME & LUXURY APPEARANCE ENGINE =================

function initAppearance() {
  const savedTheme = localStorage.getItem('pulse_theme') || 'dark';
  const savedAccent = localStorage.getItem('pulse_accent') || '#6366f1';
  setThemeMode(savedTheme, false);
  setAccentColor(savedAccent, '', false);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'dark' ? 'light' : 'dark';
  setThemeMode(next, true);
}

function setThemeMode(mode, notify = true) {
  document.documentElement.setAttribute('data-theme', mode);
  localStorage.setItem('pulse_theme', mode);

  const icon = document.getElementById('theme-icon');
  if (icon) {
    icon.className = mode === 'dark' ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }

  const darkCard = document.getElementById('mode-card-dark');
  const lightCard = document.getElementById('mode-card-light');
  if (darkCard && lightCard) {
    darkCard.classList.toggle('active', mode === 'dark');
    lightCard.classList.toggle('active', mode === 'light');
  }

  if (notify) {
    showToast(mode === 'dark' ? 'Midnight Obsidian (Night Mode) Activated 🌙' : 'Daylight Alabaster (Day Mode) Activated ☀️');
  }
}

function setAccentColor(hex, label = 'Custom Accent', notify = true) {
  document.documentElement.style.setProperty('--primary', hex);
  document.documentElement.style.setProperty('--primary-glow', `${hex}4d`);
  localStorage.setItem('pulse_accent', hex);

  document.querySelectorAll('.swatch').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('onclick')?.includes(hex));
  });

  if (notify && label) {
    showToast(`Accent switched to ${label} ✨`);
  }
}

function showToast(message) {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<i class="fa-solid fa-circle-check text-primary"></i> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 250);
  }, 2800);
}

// ================= AUTHENTICATION =================

function switchAuthTab(tab) {
  document.getElementById('auth-error').classList.add('hidden');
  document.getElementById('tab-login').classList.toggle('active', tab === 'login');
  document.getElementById('tab-register').classList.toggle('active', tab === 'register');
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
}

function showAuthError(msg) {
  const errEl = document.getElementById('auth-error');
  errEl.textContent = msg;
  errEl.classList.remove('hidden');
}

async function handleLogin(e) {
  e.preventDefault();
  const emailOrUsername = document.getElementById('login-id').value;
  const password = document.getElementById('login-password').value;

  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrUsername, password })
  });
  const data = await res.json();

  if (!res.ok) return showAuthError(data.error || 'Login failed');
  saveSessionAndLaunch(data);
  showToast(`Welcome back, ${data.name}! 🚀`);
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value;
  const username = document.getElementById('reg-username').value;
  const email = document.getElementById('reg-email').value;
  const bio = document.getElementById('reg-bio').value;
  const password = document.getElementById('reg-password').value;

  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, username, email, bio, password })
  });
  const data = await res.json();

  if (!res.ok) return showAuthError(data.error || 'Registration failed');
  saveSessionAndLaunch(data);
  showToast('Luxury Account Created! ✨');
}

async function seedAndLoginDemo() {
  const res = await fetch('/api/seed', { method: 'POST' });
  const data = await res.json();
  if (res.ok && data.demoUser) {
    saveSessionAndLaunch(data.demoUser);
    showToast('Demo Environment Loaded & Logged In! ⚡');
  }
}

function saveSessionAndLaunch(user) {
  currentUser = user;
  localStorage.setItem('pulse_user', JSON.stringify(user));
  launchApp();
}

function logout() {
  localStorage.removeItem('pulse_user');
  currentUser = null;
  document.getElementById('app-view').classList.add('hidden');
  document.getElementById('auth-view').classList.remove('hidden');
  showToast('Signed out safely.');
}

// ================= APP INITIALIZATION =================

async function launchApp() {
  document.getElementById('auth-view').classList.add('hidden');
  document.getElementById('app-view').classList.remove('hidden');
  renderSidebarProfile();
  await Promise.all([fetchPosts(), fetchUsers()]);
}

function renderSidebarProfile() {
  if (!currentUser) return;
  document.getElementById('side-avatar').src = currentUser.avatar;
  document.getElementById('cp-avatar').src = currentUser.avatar;
  document.getElementById('side-name').textContent = currentUser.name;
  document.getElementById('side-username').textContent = `@${currentUser.username}`;
  document.getElementById('side-bio').textContent = currentUser.bio;
  document.getElementById('side-followers').textContent = (currentUser.followers || []).length;
  document.getElementById('side-following').textContent = (currentUser.following || []).length;
  document.getElementById('side-verified').classList.toggle('hidden', currentUser.verified === false);

  if (currentUser.banner) {
    document.getElementById('side-banner').style.backgroundImage = `url('${currentUser.banner}')`;
  }

  const myPostsCount = allPosts.filter(p => p.user && p.user._id === currentUser._id).length;
  document.getElementById('side-posts-count').textContent = myPostsCount;
}

// ================= USERS & FOLLOW SYSTEM =================

async function fetchUsers() {
  const res = await fetch('/api/users');
  allUsers = await res.json();

  const freshMe = allUsers.find(u => u._id === currentUser._id);
  if (freshMe) {
    currentUser = freshMe;
    localStorage.setItem('pulse_user', JSON.stringify(currentUser));
    renderSidebarProfile();
  }
  renderSuggestions();
}

function renderSuggestions() {
  const container = document.getElementById('suggestions-list');
  const others = allUsers.filter(u => u._id !== currentUser._id);

  if (others.length === 0) {
    container.innerHTML = `<p class="text-muted">No other creators yet.</p>`;
    return;
  }

  container.innerHTML = others.map(u => {
    const isFollowing = (currentUser.following || []).some(id => id.toString() === u._id);
    return `
      <div class="suggestion-item">
        <div class="sug-user">
          <img src="${u.avatar}" class="avatar-sm" onclick="viewUserProfile('${u._id}')" />
          <div>
            <h5 class="clickable" onclick="viewUserProfile('${u._id}')">
              ${escapeHtml(u.name)}
              ${u.verified !== false ? '<i class="fa-solid fa-circle-check verified-badge"></i>' : ''}
            </h5>
            <span class="text-muted">@${escapeHtml(u.username)}</span>
          </div>
        </div>
        <button class="btn-follow ${isFollowing ? 'following' : ''}" onclick="toggleFollow('${u._id}')">
          ${isFollowing ? 'Following' : 'Follow'}
        </button>
      </div>
    `;
  }).join('');
}

async function toggleFollow(targetUserId) {
  const res = await fetch(`/api/users/${targetUserId}/follow`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentUserId: currentUser._id })
  });
  const data = await res.json();
  if (res.ok) {
    currentUser = data.currentUser;
    localStorage.setItem('pulse_user', JSON.stringify(currentUser));
    showToast(data.isFollowing ? 'Creator followed! 🤝' : 'Unfollowed creator');
    await fetchUsers();
    if (currentFeedMode === 'profile' && viewedProfileId) {
      viewUserProfile(viewedProfileId);
    } else {
      renderPosts();
    }
  }
}

// ================= PROFILE SHOWCASE & SETTINGS SUITE =================

async function viewUserProfile(userId) {
  currentFeedMode = 'profile';
  viewedProfileId = userId;
  updateNavActive('nav-profile');

  const res = await fetch(`/api/users/${userId}`);
  const data = await res.json();
  if (!res.ok) return;

  const { user, posts } = data;
  document.getElementById('profile-header-card').classList.remove('hidden');
  document.getElementById('create-post-card').classList.toggle('hidden', user._id !== currentUser._id);

  if (user.banner) {
    document.getElementById('pv-banner').style.backgroundImage = `url('${user.banner}')`;
  }
  document.getElementById('pv-avatar').src = user.avatar;
  document.getElementById('pv-name').textContent = user.name;
  document.getElementById('pv-verified').classList.toggle('hidden', user.verified === false);
  document.getElementById('pv-username').textContent = `@${user.username}`;
  document.getElementById('pv-bio').textContent = user.bio;
  document.getElementById('pv-posts-count').textContent = posts.length;
  document.getElementById('pv-followers-count').textContent = user.followers.length;
  document.getElementById('pv-following-count').textContent = user.following.length;

  const actionEl = document.getElementById('pv-action-btn');
  if (user._id === currentUser._id) {
    actionEl.innerHTML = `<button class="btn-outline" onclick="openSettingsModal('profile')"><i class="fa-solid fa-sliders"></i> Edit Profile</button>`;
  } else {
    const isFollowing = (currentUser.following || []).some(id => id.toString() === user._id);
    actionEl.innerHTML = `
      <button class="btn-follow ${isFollowing ? 'following' : ''}" onclick="toggleFollow('${user._id}')">
        ${isFollowing ? 'Following' : 'Follow'}
      </button>
    `;
  }

  renderPostsList(posts);
}

function openSettingsModal(defaultTab = 'profile') {
  document.getElementById('set-name').value = currentUser.name || '';
  document.getElementById('set-bio').value = currentUser.bio || '';
  document.getElementById('set-avatar').value = currentUser.avatar || '';
  document.getElementById('set-banner').value = currentUser.banner || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1000&q=80';
  document.getElementById('set-verified').checked = currentUser.verified !== false;

  switchSettingsTab(defaultTab);
  document.getElementById('settings-modal').classList.remove('hidden');
}

function closeSettingsModal() {
  document.getElementById('settings-modal').classList.add('hidden');
}

function switchSettingsTab(tab) {
  ['profile', 'appearance', 'security'].forEach(t => {
    document.getElementById(`stab-${t}`).classList.toggle('active', t === tab);
    document.getElementById(`settings-pane-${t}`).classList.toggle('hidden', t !== tab);
  });
}

async function saveProfileSettings(e) {
  e.preventDefault();
  const name = document.getElementById('set-name').value;
  const bio = document.getElementById('set-bio').value;
  const avatar = document.getElementById('set-avatar').value;
  const banner = document.getElementById('set-banner').value;
  const verified = document.getElementById('set-verified').checked;

  const res = await fetch(`/api/users/${currentUser._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, bio, avatar, banner, verified })
  });
  const updated = await res.json();
  if (res.ok) {
    currentUser = updated;
    localStorage.setItem('pulse_user', JSON.stringify(currentUser));
    closeSettingsModal();
    renderSidebarProfile();
    await Promise.all([fetchPosts(), fetchUsers()]);
    if (currentFeedMode === 'profile') viewUserProfile(currentUser._id);
    showToast('Profile & Branding Updated! ✨');
  }
}

async function changePassword(e) {
  e.preventDefault();
  const newPassword = document.getElementById('set-new-password').value;
  const res = await fetch(`/api/users/${currentUser._id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newPassword })
  });
  if (res.ok) {
    document.getElementById('set-new-password').value = '';
    closeSettingsModal();
    showToast('Account password updated securely! 🔒');
  }
}

// ================= POSTS, SEARCH, LIKES, SHARES & BOOKMARKS =================

function switchFeed(mode) {
  currentFeedMode = mode;
  viewedProfileId = null;
  document.getElementById('profile-header-card').classList.add('hidden');
  document.getElementById('create-post-card').classList.toggle('hidden', mode === 'saved');

  const navMap = { all: 'nav-all', following: 'nav-following', saved: 'nav-saved' };
  updateNavActive(navMap[mode] || 'nav-all');
  renderPosts();
}

function updateNavActive(activeId) {
  ['nav-all', 'nav-following', 'nav-saved', 'nav-profile'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('active', id === activeId);
  });
}

function handleSearch(e) {
  searchQuery = e.target.value.trim().toLowerCase();
  const banner = document.getElementById('filter-banner');
  if (searchQuery) {
    banner.classList.remove('hidden');
    document.getElementById('filter-text').textContent = `Filtering posts by: "${e.target.value.trim()}"`;
  } else {
    banner.classList.add('hidden');
  }
  renderPosts();
}

function filterByTag(tag) {
  const input = document.getElementById('search-input');
  input.value = tag;
  searchQuery = tag.toLowerCase();
  document.getElementById('filter-banner').classList.remove('hidden');
  document.getElementById('filter-text').textContent = `Showing trending topic: ${tag}`;
  if (currentFeedMode === 'profile') switchFeed('all');
  else renderPosts();
}

function clearSearchFilter() {
  searchQuery = '';
  document.getElementById('search-input').value = '';
  document.getElementById('filter-banner').classList.add('hidden');
  renderPosts();
}

function toggleImageInput() {
  document.getElementById('image-input-wrapper').classList.toggle('hidden');
}

function insertEmoji(emoji) {
  const textarea = document.getElementById('post-content');
  textarea.value += emoji;
  textarea.focus();
}

async function fetchPosts() {
  const res = await fetch('/api/posts');
  allPosts = await res.json();
  renderSidebarProfile();
  if (currentFeedMode !== 'profile') renderPosts();
}

function renderPosts() {
  let filtered = [...allPosts];

  if (currentFeedMode === 'following') {
    const followingIds = (currentUser.following || []).map(id => id.toString());
    filtered = filtered.filter(p => p.user && (followingIds.includes(p.user._id) || p.user._id === currentUser._id));
  } else if (currentFeedMode === 'saved') {
    filtered = filtered.filter(p => savedPostIds.includes(p._id));
  }

  if (searchQuery) {
    filtered = filtered.filter(p =>
      (p.content && p.content.toLowerCase().includes(searchQuery)) ||
      (p.user?.name && p.user.name.toLowerCase().includes(searchQuery)) ||
      (p.user?.username && p.user.username.toLowerCase().includes(searchQuery))
    );
  }

  renderPostsList(filtered);
}

function renderPostsList(posts) {
  const container = document.getElementById('posts-container');
  if (!posts.length) {
    container.innerHTML = `
      <div class="card glass-panel" style="text-align:center; padding: 2.5rem;">
        <i class="fa-solid fa-sparkles text-primary" style="font-size: 2rem; margin-bottom: 0.75rem;"></i>
        <h4>No posts found here yet</h4>
        <p class="text-muted">Publish a new post above or explore other tabs!</p>
      </div>`;
    return;
  }

  container.innerHTML = posts.map(post => {
    const isLiked = (post.likes || []).some(id => id.toString() === currentUser._id);
    const isSaved = savedPostIds.includes(post._id);
    const isOwner = post.user && post.user._id === currentUser._id;
    const comments = post.comments || [];

    return `
      <article class="card glass-panel" id="post-${post._id}">
        <div class="post-header">
          <div class="post-user">
            <img src="${post.user?.avatar || ''}" class="avatar-sm" onclick="viewUserProfile('${post.user?._id}')" />
            <div class="post-meta">
              <h4 onclick="viewUserProfile('${post.user?._id}')">
                ${escapeHtml(post.user?.name || 'User')}
                ${post.user?.verified !== false ? '<i class="fa-solid fa-circle-check verified-badge"></i>' : ''}
              </h4>
              <span class="text-muted">@${escapeHtml(post.user?.username || 'user')} • ${formatTime(post.createdAt)}</span>
            </div>
          </div>
          ${isOwner ? `<button class="action-btn" onclick="deletePost('${post._id}')" title="Delete Post"><i class="fa-regular fa-trash-can"></i></button>` : ''}
        </div>

        <div class="post-content">${formatContentWithHashtags(post.content)}</div>
        ${post.image ? `<img src="${escapeHtml(post.image)}" class="post-image" alt="Post media" />` : ''}

        <div class="post-footer">
          <div class="post-actions-left">
            <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post._id}')">
              <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
              <span>${(post.likes || []).length}</span>
            </button>
            <button class="action-btn" onclick="document.getElementById('comment-input-${post._id}').focus()">
              <i class="fa-regular fa-comment"></i>
              <span>${comments.length}</span>
            </button>
            <button class="action-btn" onclick="openShareModal('${post._id}')">
              <i class="fa-solid fa-share-nodes"></i>
              <span>${post.shares || 0} Share</span>
            </button>
          </div>

          <button class="action-btn ${isSaved ? 'saved' : ''}" onclick="toggleSavePost('${post._id}')" title="Bookmark Post">
            <i class="${isSaved ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i>
          </button>
        </div>

        <div class="comments-section">
          <div id="comments-list-${post._id}">
            ${comments.map(c => `
              <div class="comment-item">
                <img src="${c.user?.avatar || ''}" class="avatar-sm" style="width:30px;height:30px;" onclick="viewUserProfile('${c.user?._id}')" />
                <div class="comment-bubble">
                  <strong onclick="viewUserProfile('${c.user?._id}')">
                    ${escapeHtml(c.user?.name || 'User')}
                    ${c.user?.verified !== false ? '<i class="fa-solid fa-circle-check verified-badge" style="font-size:0.75rem;"></i>' : ''}
                  </strong>
                  <p>${escapeHtml(c.text)}</p>
                </div>
              </div>
            `).join('')}
          </div>

          <form class="comment-form" onsubmit="addComment(event, '${post._id}')">
            <input type="text" id="comment-input-${post._id}" placeholder="Write a thoughtful comment..." required />
            <button type="submit" class="btn-primary">Reply</button>
          </form>
        </div>
      </article>
    `;
  }).join('');
}

async function createPost() {
  const contentEl = document.getElementById('post-content');
  const imageEl = document.getElementById('post-image');
  const content = contentEl.value.trim();
  const image = imageEl.value.trim();

  if (!content) return showToast('Please write something before publishing!');

  const res = await fetch('/api/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: currentUser._id, content, image })
  });

  if (res.ok) {
    contentEl.value = '';
    imageEl.value = '';
    document.getElementById('image-input-wrapper').classList.add('hidden');
    showToast('Post published to your feed! 🚀');
    await fetchPosts();
    if (currentFeedMode === 'profile' && viewedProfileId === currentUser._id) {
      viewUserProfile(currentUser._id);
    }
  }
}

async function deletePost(postId) {
  const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
  if (res.ok) {
    showToast('Post removed.');
    await fetchPosts();
    if (currentFeedMode === 'profile' && viewedProfileId) viewUserProfile(viewedProfileId);
  }
}

async function toggleLike(postId) {
  const res = await fetch(`/api/posts/${postId}/like`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: currentUser._id })
  });
  if (res.ok) {
    await fetchPosts();
    if (currentFeedMode === 'profile' && viewedProfileId) viewUserProfile(viewedProfileId);
  }
}

function toggleSavePost(postId) {
  if (savedPostIds.includes(postId)) {
    savedPostIds = savedPostIds.filter(id => id !== postId);
    showToast('Removed from Saved Bookmarks');
  } else {
    savedPostIds.push(postId);
    showToast('Post saved to Bookmarks! 🔖');
  }
  localStorage.setItem('pulse_saved_posts', JSON.stringify(savedPostIds));
  renderPosts();
}

// ================= SHARE MODAL & LIVE SHARE COUNTER =================

function openShareModal(postId) {
  activeSharePostId = postId;
  const shareUrl = `${window.location.origin}/?post=${postId}`;
  document.getElementById('share-url-input').value = shareUrl;
  document.getElementById('share-modal').classList.remove('hidden');
}

function closeShareModal() {
  document.getElementById('share-modal').classList.add('hidden');
  activeSharePostId = null;
}

async function executeShareAction(platform) {
  if (!activeSharePostId) return;
  const shareUrl = document.getElementById('share-url-input').value;

  if (navigator.clipboard) {
    await navigator.clipboard.writeText(shareUrl).catch(() => {});
  }

  await fetch(`/api/posts/${activeSharePostId}/share`, { method: 'POST' });

  if (platform === 'WhatsApp') {
    window.open(`https://wa.me/?text=${encodeURIComponent('Check out this post on PulseSocial: ' + shareUrl)}`, '_blank');
  } else if (platform === 'X / Twitter') {
    window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent('Exploring PulseSocial Luxe! 🚀')}`, '_blank');
  } else if (platform === 'LinkedIn') {
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, '_blank');
  }

  showToast(`Post shared via ${platform} & link copied! 🔗`);
  closeShareModal();
  await fetchPosts();
  if (currentFeedMode === 'profile' && viewedProfileId) viewUserProfile(viewedProfileId);
}

async function addComment(e, postId) {
  e.preventDefault();
  const input = document.getElementById(`comment-input-${postId}`);
  const text = input.value.trim();
  if (!text) return;

  const res = await fetch(`/api/posts/${postId}/comments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: currentUser._id, text })
  });

  if (res.ok) {
    input.value = '';
    showToast('Comment posted! 💬');
    await fetchPosts();
    if (currentFeedMode === 'profile' && viewedProfileId) viewUserProfile(viewedProfileId);
  }
}

// ================= HELPERS =================

function formatContentWithHashtags(text = '') {
  const escaped = escapeHtml(text);
  return escaped.replace(/(#[a-zA-Z0-9_]+)/g, `<span class="hashtag" onclick="filterByTag('$1')">$1</span>`);
}

function formatTime(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

// ==========================================================
// EXTREME ADD-ON: CHATBOX (DMs + PULSE-AI) & VOICE DICTATION
// ==========================================================

let activeChatTarget = 'pulse_ai'; // 'pulse_ai' or User _id
let aiChatHistory = [
  {
    sender: 'pulse_ai',
    text: 'Hey! 👋 I am @PulseAI, your built-in social co-pilot. Ask me to write a post, or click any creator above to send a Direct Message!'
  }
];

// Automatically inject Chatbox & Voice Dictation button when user logs in
const originalLaunchApp = launchApp;
launchApp = async function () {
  await originalLaunchApp();
  document.getElementById('chat-fab')?.classList.remove('hidden');
  injectVoiceMicButton();
  renderChatContacts();
  renderChatMessages();
};

function injectVoiceMicButton() {
  const tools = document.querySelector('.cp-tools');
  if (tools && !document.getElementById('voice-mic-btn')) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'voice-mic-btn';
    btn.className = 'tool-btn';
    btn.innerHTML = '<i class="fa-solid fa-microphone"></i> Voice Dictate';
    btn.onclick = startVoiceDictation;
    tools.appendChild(btn);
  }
}

function startVoiceDictation() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    return showToast('Voice Dictation works best in Chrome or Edge! 🎙️');
  }
  const recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  const micBtn = document.getElementById('voice-mic-btn');
  micBtn.innerHTML = '<i class="fa-solid fa-circle-dot" style="color:#ef4444;"></i> Listening...';

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    const textarea = document.getElementById('post-content');
    textarea.value += (textarea.value ? ' ' : '') + transcript;
    showToast('Voice transcribed into your post! 🎙️✨');
  };

  recognition.onend = () => {
    micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i> Voice Dictate';
  };

  recognition.start();
}

function toggleChatbox() {
  const drawer = document.getElementById('chatbox-drawer');
  drawer.classList.toggle('hidden');
  if (!drawer.classList.contains('hidden')) {
    renderChatContacts();
    loadActiveChat();
  }
}

function renderChatContacts() {
  const bar = document.getElementById('chat-contacts-bar');
  if (!bar) return;

  const others = allUsers.filter(u => u._id !== currentUser?._id);
  let html = `
    <button class="contact-pill ${activeChatTarget === 'pulse_ai' ? 'active' : ''}" onclick="selectChatTarget('pulse_ai')">
      <i class="fa-solid fa-wand-magic-sparkles"></i> @PulseAI
    </button>
  `;

  html += others.map(u => `
    <button class="contact-pill ${activeChatTarget === u._id ? 'active' : ''}" onclick="selectChatTarget('${u._id}')">
      <span class="online-dot"></span> ${escapeHtml(u.name.split(' ')[0])}
    </button>
  `).join('');

  bar.innerHTML = html;
}

async function selectChatTarget(targetId) {
  activeChatTarget = targetId;
  document.getElementById('ai-quick-chips').classList.toggle('hidden', targetId !== 'pulse_ai');
  renderChatContacts();
  await loadActiveChat();
}

async function loadActiveChat() {
  if (activeChatTarget === 'pulse_ai') {
    renderChatMessages(aiChatHistory);
    return;
  }
  const res = await fetch(`/api/messages/${currentUser._id}/${activeChatTarget}`);
  if (res.ok) {
    const msgs = await res.json();
    renderChatMessages(msgs);
  }
}

function renderChatMessages(list = aiChatHistory) {
  const box = document.getElementById('chat-messages-box');
  if (!box) return;

  if (!list.length) {
    box.innerHTML = `<p class="text-muted" style="text-align:center;margin-top:2rem;">No messages yet. Say hello! 👋</p>`;
    return;
  }

  box.innerHTML = list.map(m => {
    const isMe = m.sender === currentUser?._id;
    const isAi = m.sender === 'pulse_ai';
    return `
      <div class="msg-bubble ${isMe ? 'msg-me' : 'msg-them'}">
        <div>${escapeHtml(m.text)}</div>
        ${isAi && m.canInsert ? `<button class="msg-use-btn" onclick="useAiDraft(${JSON.stringify(m.text).replace(/"/g, '&quot;')})">✨ Insert into Post Box</button>` : ''}
      </div>
    `;
  }).join('');

  box.scrollTop = box.scrollHeight;
}

function sendQuickAiPrompt(promptText) {
  document.getElementById('chat-input').value = promptText;
  handleSendMessage(new Event('submit'));
}

async function handleSendMessage(e) {
  if (e.preventDefault) e.preventDefault();
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  if (activeChatTarget === 'pulse_ai') {
    aiChatHistory.push({ sender: currentUser._id, text });
    renderChatMessages(aiChatHistory);

    setTimeout(() => {
      const reply = generateSmartAiReply(text);
      aiChatHistory.push({ sender: 'pulse_ai', text: reply, canInsert: true });
      renderChatMessages(aiChatHistory);
    }, 450);
    return;
  }

  // Real User DM stored in MongoDB
  await fetch('/api/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ senderId: currentUser._id, receiverId: activeChatTarget, text })
  });
  await loadActiveChat();
}

function generateSmartAiReply(prompt) {
  const p = prompt.toLowerCase();
  if (p.includes('hashtag')) {
    return '#CodeAlpha #FullStackDev #NodeJS #ExpressJS #MongoDB #WebEngineering #UIUX';
  }
  if (p.includes('codealpha') || p.includes('post') || p.includes('write')) {
    return 'Thrilled to unveil my Full-Stack Social Media Platform built for #CodeAlpha! 🚀 Engineered with Node.js, Express, MongoDB, adaptive Day/Night glassmorphism, and a live AI Messenger. #FullStack #WebDev';
  }
  return `Here is a polished post draft for "${prompt}":\n\nBuilding next-generation web experiences with clean architecture and real-time interactivity! 💻✨ #SoftwareEngineering #CodeAlpha`;
}

function useAiDraft(draftText) {
  const textarea = document.getElementById('post-content');
  textarea.value = draftText;
  textarea.focus();
  showToast('AI draft inserted into your Post Composer! 🚀');
}