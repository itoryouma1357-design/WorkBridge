// サイドバー開閉機能
document.addEventListener('DOMContentLoaded', function() {
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebarCloseBtn = document.getElementById('sidebar-close');
  const sidebar = document.getElementById('sidebar');
  const header = document.querySelector('header');
  const main = document.querySelector('main');
  
  // サイドバーをトグルする関数
  function toggleSidebar() {
    sidebar.classList.toggle('closed');
    header.classList.toggle('sidebar-closed');
    if (main) {
      main.classList.toggle('sidebar-closed');
    }
    
    // ローカルストレージに状態を保存（PC版のみ）
    const isMobile = window.innerWidth <= 900;
    if (!isMobile) {
      const isClosed = sidebar.classList.contains('closed');
      localStorage.setItem('sidebarClosed', isClosed);
    }
  }
  
  if (sidebar && header) {
    // ヘッダーのメニューボタンクリック時の処理
    if (sidebarToggle) {
      sidebarToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        toggleSidebar();
      });
    }
    
    // サイドバーの閉じるボタンクリック時の処理
    if (sidebarCloseBtn) {
      sidebarCloseBtn.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        sidebar.classList.add('closed');
        header.classList.add('sidebar-closed');
        if (main) {
          main.classList.add('sidebar-closed');
        }
        
        // ローカルストレージに状態を保存（PC版のみ）
        const isMobile = window.innerWidth <= 900;
        if (!isMobile) {
          localStorage.setItem('sidebarClosed', 'true');
        }
      });
    }
    
    // ページロード時に前回の状態を復元またはモバイルサイズは初期状態で閉じる
    const isMobile = window.innerWidth <= 900;
    
    if (isMobile) {
      // モバイルサイズは必ず初期状態で閉じる
      sidebar.classList.add('closed');
      header.classList.add('sidebar-closed');
      if (main) {
        main.classList.add('sidebar-closed');
      }
    } else {
      // PC版は前回の保存状態を復元
      const wasClosed = localStorage.getItem('sidebarClosed') === 'true';
      if (wasClosed) {
        sidebar.classList.add('closed');
        header.classList.add('sidebar-closed');
        if (main) {
          main.classList.add('sidebar-closed');
        }
      }
    }
    
    // ウィンドウリサイズ時の処理
    let resizeTimer;
    window.addEventListener('resize', function() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function() {
        const isNowMobile = window.innerWidth <= 900;
        const isSidebarClosed = sidebar.classList.contains('closed');
        
        if (isNowMobile && !isSidebarClosed) {
          // モバイルサイズになったらサイドバーを自動で閉じる
          sidebar.classList.add('closed');
          header.classList.add('sidebar-closed');
          if (main) {
            main.classList.add('sidebar-closed');
          }
        }
      }, 250);
    });
  }
});

// ユーティリティ
function getToken() {
  return localStorage.getItem('token');
}

function decodeJWT(token) {
  if (!token) return null;
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decodeURIComponent(escape(json)));
  } catch {
    return null;
  }
}

function authHeaders() {
  const token = getToken();
  const h = { 'Content-Type': 'application/json' };
  if (token) h['Authorization'] = 'Bearer ' + token;
  return h;
}

// simple HTML escaper for preview
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"]+/g, function (s) {
    return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[s];
  });
}

// generate dummy jobs for initial worker view
function generateDummyJobs(n = 20) {
  const categories = ['Web制作','デザイン','ライティング','翻訳','動画編集','アプリ開発','データ解析','マーケティング','イラスト','音声/ナレーション'];
  const formats = ['Figma','HTML/CSS','PDF','MP4','PNG','PSD'];
  const now = new Date();
  const jobs = [];
  for (let i = 1; i <= n; i++) {
    const start = new Date(now);
    start.setDate(now.getDate() + (i % 7));
    const end = new Date(start);
    end.setDate(start.getDate() + (7 + (i % 10)));
    jobs.push({
      _id: 'dummy-' + i,
      title: `サンプル依頼 #${i} - ${categories[i % categories.length]}`,
      category: categories[i % categories.length],
      description: `これはダミーの依頼です。詳細説明のサンプル文章（ID: ${i}）。要件や期待する成果物をここに記載します。`,
      deliverableFormat: formats[i % formats.length],
      requirements: '実務経験2年以上、ポートフォリオ必須',
      price: (i * 5000),
      recruitmentStart: start.toISOString().split('T')[0],
      recruitmentEnd: end.toISOString().split('T')[0],
      positions: (i % 3) + 1,
      contactMethod: (i % 2 === 0) ? 'プラットフォーム内メッセージ' : 'メール',
      status: 'open',
      clientId: null,
      applicants: []
    });
  }
  return jobs;
}

// fetch jobs for worker page; if none exist, show dummy jobs
async function fetchJobsWorker() {
  const container = document.getElementById('worker_jobs');
  if (!container) return;
  container.innerHTML = '';
  let jobs = [];
  try {
    const res = await fetch('/api/jobs');
    if (res.ok) jobs = await res.json();
  } catch (err) {
    console.error('fetchJobsWorker error', err);
  }

  if (!jobs || jobs.length === 0) {
    jobs = generateDummyJobs(20);
  }

  jobs.forEach((job) => {
    const li = document.createElement('li');
    // mark as job list item and attach job object for later lookup
    li.classList.add('job-list-item');
    li.jobData = job;
    li.dataset.jobId = job._id || '';
    li.style.marginBottom = '1rem';
    li.style.listStyle = 'none';
    li.style.background = 'var(--card-bg)';
    li.style.padding = '1rem';
    li.style.borderRadius = '8px';
    li.style.border = '1px solid rgba(63,95,85,0.06)';
    const priceText = job.price ? (job.price + ' JPY') : '未設定';
    const dates = (job.recruitmentStart || job.recruitmentEnd) ? `${job.recruitmentStart || ''} ～ ${job.recruitmentEnd || ''}` : '未設定';
    li.innerHTML = `
      <strong>${escapeHtml(job.title)}</strong>
      <div style="margin-top:0.5rem"><em>カテゴリ: ${escapeHtml(job.category || '')}</em> ・ <small>状態: ${escapeHtml(job.status || 'open')}</small></div>
      <p style="margin-top:0.6rem">${escapeHtml(job.description || '')}</p>
      <div style="font-size:0.95rem; color:var(--dark); display:flex; gap:1rem; flex-wrap:wrap;">
        <div><strong>納品形式:</strong> ${escapeHtml(job.deliverableFormat || '指定なし')}</div>
        <div><strong>金額:</strong> ${escapeHtml(priceText)}</div>
        <div><strong>募集期間:</strong> ${escapeHtml(dates)}</div>
        <div><strong>募集人数:</strong> ${escapeHtml(String(job.positions || 1))}</div>
        <div><strong>連絡手段:</strong> ${escapeHtml(job.contactMethod || '未指定')}</div>
      </div>
    `;
    // click to toggle detail panel (more explicit than hover)
    li.addEventListener('click', (e) => {
      e.stopPropagation();
      const panel = document.getElementById('job_detail_panel');
      const jobId = li.dataset.jobId || '';
      const currentId = panel?.dataset.currentJobId || '';
      if (panel && currentId === jobId && panel.classList.contains('panel-visible')) {
        hideJobDetail();
        if (panel) panel.dataset.currentJobId = '';
      } else {
        showJobDetail(job);
        if (panel) panel.dataset.currentJobId = jobId;
      }
    });

    container.appendChild(li);
  });
}

function showJobDetail(job) {
  const panel = document.getElementById('job_detail_panel');
  if (!panel) return;
  panel.classList.add('panel-visible');
  panel.style.display = 'block';
  panel.innerHTML = `
    <div class="job-detail-title">${escapeHtml(job.title || '無題')}</div>
    <div class="job-detail-meta">カテゴリ: ${escapeHtml(job.category || '')} ・ 金額: ${escapeHtml(job.price ? job.price + ' JPY' : '未設定')}</div>
    <div class="job-detail-body">${escapeHtml(job.description || '').replace(/\n/g,'<br/>')}</div>
    <hr style="margin:0.8rem 0">
    <div style="font-size:0.95rem; color:var(--slate)">
      <p><strong>納品形式:</strong> ${escapeHtml(job.deliverableFormat || '指定なし')}</p>
      <p><strong>応募条件:</strong> ${escapeHtml(job.requirements || '')}</p>
      <p><strong>募集期間:</strong> ${escapeHtml(job.recruitmentStart || '')} ～ ${escapeHtml(job.recruitmentEnd || '')}</p>
      <p><strong>募集人数:</strong> ${escapeHtml(String(job.positions || 1))}</p>
      <p><strong>連絡手段:</strong> ${escapeHtml(job.contactMethod || '')}</p>
    </div>
    <div style="margin-top:0.8rem; text-align:right">
      <button id="closePanelBtn" class="small-btn">閉じる</button>
    </div>
  `;
  const closeBtn = document.getElementById('closePanelBtn');
  if (closeBtn) closeBtn.onclick = () => { panel.style.display = 'none'; panel.classList.remove('panel-visible'); };
  // keep panel visible while hovered; hide shortly after pointer leaves panel
  let hideTimeout = null;
  panel.addEventListener('pointerenter', () => { if (hideTimeout) { clearTimeout(hideTimeout); hideTimeout = null; } });
  panel.addEventListener('pointerleave', () => {
    hideTimeout = setTimeout(() => { hideJobDetail(); }, 250);
  });
}

function hideJobDetail() {
  const panel = document.getElementById('job_detail_panel');
  if (!panel) return;
  panel.style.display = 'none';
  panel.classList.remove('panel-visible');
}

async function login(mail, password) {
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: mail, password })
  });
  const data = await res.json();
  if (data.token) {
    localStorage.setItem('token', data.token);
    setCurrentUserUI();
    fetchJobs();
    hideForms();
  } else {
    alert(data.error || 'ログインに失敗しました');
  }
}

function calcAge(birthdate) {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - b.getFullYear();
  const m = today.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age--;
  return age;
}

async function register(name, mail, password, phone, username, birthdate, parentalConsent, termsAccepted, role = 'worker', extraFields = {}) {
  // client-side check: if under 18 require parentalConsent
  const age = calcAge(birthdate);
  if (age !== null && age < 18 && !parentalConsent) {
    alert('未成年の場合は保護者の同意が必要です');
    return;
  }

  // terms must be accepted
  if (!termsAccepted) {
    alert('利用規約に同意してください');
    return;
  }

  const body = Object.assign({ name, email: mail, password, phone, username, birthdate, parentalConsent, termsAccepted, role }, extraFields || {});
  const res = await fetch('/api/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  // handle network / parsing errors separately for clearer messages
  let data = null;
  let text = null;
  try {
    // try to get JSON
    data = await res.json();
  } catch (err) {
    // fallback: try to read as text
    try { text = await res.text(); } catch (e) { /* ignore */ }
    console.error('register response parse error', err, 'text:', text);
  }

  console.log('register response', res.status, data || text || res.statusText);

  if (!res.ok) {
    const serverMsg = (data && data.error) || text || res.statusText || '登録に失敗しました';
    alert(serverMsg);
    return;
  }

  // success
  if (data && data.token) {
    localStorage.setItem('token', data.token);
    setCurrentUserUI();
    window.location.href = '/profile.html';
    return;
  }

  // success but no token
  alert('登録しました。ログインしてください。');
  hideForms();
}

// fetch my profile
async function fetchMe() {
  try {
    const res = await fetch('/api/me', { headers: authHeaders() });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

// Render a public profile view for the current user
async function renderProfileView() {
  const container = document.getElementById('profile_view');
  if (!container) return;
  container.innerHTML = '<p>読み込み中…</p>';
  const me = await fetchMe();
  const tokenInfo = decodeJWT(getToken()) || {};

  const username = (me && (me.username || me.name)) || tokenInfo.name || 'ユーザー名未設定';
  const bio = (me && me.bio) || '自己紹介はまだ設定されていません。スキルやアピールポイントを入力しましょう。';
  const achievements = (me && me.achievements) || '実績はまだ登録されていません。過去の仕事やポートフォリオを追加しましょう。';
  const availability = (me && me.availability) || '稼働時間は未設定です。';
  const rating = (me && (me.rating !== undefined)) ? (me.rating + ' / 5') : 'まだ評価がありません。';

  // try to fetch jobs and infer past work (where user was applicant)
  let pastJobs = [];
  try {
    const res = await fetch('/api/jobs');
    if (res.ok) {
      const all = await res.json();
      const myId = me?.id || tokenInfo.id || null;
      if (myId) {
        pastJobs = all.filter(j => Array.isArray(j.applicants) && j.applicants.includes(myId));
      }
    }
  } catch (e) {
    // ignore
  }

  // prepare past jobs HTML (use dummy if none)
  let pastHtml = '';
  if (!pastJobs || pastJobs.length === 0) {
    pastHtml = `<ul class="past-jobs">
      <li>まだ仕事を受けた記録がありません。最初の仕事に応募して実績を作りましょう。</li>
      <li>例: サンプル翻訳案件 — 依頼主: サンプル社 — 完了</li>
      <li>例: サンプルデザイン案件 — 依頼主: デザイン屋 — 完了</li>
    </ul>`;
  } else {
    pastHtml = '<ul class="past-jobs">' + pastJobs.map(j => `<li><strong>${escapeHtml(j.title || '無題')}</strong> — ${escapeHtml(j.clientName || j.clientId || '不明')} — ${escapeHtml(j.status || '完了')}</li>`).join('') + '</ul>';
  }

  // compute trust score (安心スコア)
  const trust = computeTrustScore(me || {}, pastJobs || []);

  // compact top summary with collapsible details
  const shortBio = (bio.length > 160) ? (escapeHtml(bio.slice(0, 156)) + '...') : escapeHtml(bio);
  container.innerHTML = `
    <section class="profile-card">
      <div class="profile-top">
        <div class="profile-avatar">${escapeHtml((username||'U').slice(0,2))}</div>
        <div class="profile-main">
          <h2 style="margin:0">${escapeHtml(username)}</h2>
          <div class="badges">${trust.badges.map(b=>`<span class="badge">${escapeHtml(b)}</span>`).join('')}</div>
          <div class="profile-summary">${shortBio}</div>
          <div class="info-grid">
            <div class="info-item"><strong>${escapeHtml(rating)}</strong><span>評価</span></div>
            <div class="info-item"><strong>${me?.completionRate ? (me.completionRate + '%') : '--'}</strong><span>完了率</span></div>
            <div class="info-item"><strong>${pastJobs.length}</strong><span>受注数</span></div>
            <div class="info-item"><strong>${me?.reportsCount || 0}</strong><span>通報数</span></div>
          </div>
        </div>
        <div class="score-block">
          <div style="font-size:1rem; color:var(--slate)">安心スコア</div>
          <div class="score-number">${trust.score}</div>
          <div class="score-bar"><div id="scoreFill" class="score-fill" style="width:${trust.score}%"></div></div>
          <div style="font-size:0.95rem; color:var(--slate)">${escapeHtml(trust.label)}</div>
        </div>
      </div>

      <div class="details-collapse">
        <button id="toggleDetails" class="small-btn">詳細を表示</button>
        <div id="profileDetails" class="details-hidden">
          <hr style="margin-top:0.8rem">
          <h3>スコア内訳</h3>
          <div style="display:flex; gap:1rem; flex-wrap:wrap">
            <div style="flex:1; min-width:160px"><strong>Identity</strong><div>${trust.breakdown.identity}%</div></div>
            <div style="flex:1; min-width:160px"><strong>Behavior</strong><div>${trust.breakdown.behavior}%</div></div>
            <div style="flex:1; min-width:160px"><strong>Clarity</strong><div>${trust.breakdown.clarity}%</div></div>
            <div style="flex:1; min-width:160px"><strong>Safety</strong><div>${trust.breakdown.safety}%</div></div>
          </div>
          <h3 style="margin-top:0.8rem">スコアの理由</h3>
          <ul style="color:var(--slate)">${trust.reasons.map(r=>`<li>${escapeHtml(r)}</li>`).join('')}</ul>
          <h3 style="margin-top:0.8rem">これまで受けてきた仕事</h3>
          ${pastHtml}
        </div>
      </div>
    </section>
  `;

  // attach toggle handler for details
  const toggle = document.getElementById('toggleDetails');
  const detailsDiv = document.getElementById('profileDetails');
  if (toggle && detailsDiv) {
    toggle.addEventListener('click', () => {
      if (detailsDiv.classList.contains('details-hidden')) {
        detailsDiv.classList.remove('details-hidden');
        toggle.textContent = '詳細を非表示';
      } else {
        detailsDiv.classList.add('details-hidden');
        toggle.textContent = '詳細を表示';
      }
    });
  }
  // animate score fill
  const fill = document.getElementById('scoreFill'); if (fill) { setTimeout(()=>{ fill.style.width = trust.score + '%'; }, 80); }
}

// Compute a simple trust score (安心スコア) based on available fields and jobs.
function computeTrustScore(me, pastJobs) {
  // Identity
  let idRaw = 0; let idMax = 75; // sum of weights below
  if (me.emailVerified) idRaw += 5;
  if (me.phoneVerified) idRaw += 10;
  if (me.idVerified) idRaw += 20;
  if (me.companyName || me.isCorporate || me.clientType === 'corporation') idRaw += 30;
  if ((me.reportsCount || 0) === 0) idRaw += 10;
  const identity = Math.round(Math.max(0, Math.min(100, (idRaw / idMax) * 100)));

  // Behavior
  // completionRate: 0-100
  const completionRate = (typeof me.completionRate === 'number') ? me.completionRate : null;
  const avgRating = (typeof me.rating === 'number') ? me.rating : ((me.avgRating) ? me.avgRating : null);
  let behaviorRaw = 0; let behaviorMax = 100;
  if (completionRate !== null) behaviorRaw += Math.min(30, (completionRate / 100) * 30);
  if ((me.unpaidReports || 0) === 0) behaviorRaw += 20; // no unpaid reports
  if (avgRating !== null) behaviorRaw += Math.min(30, (avgRating / 5) * 30);
  if (!me.suspiciousFlags) behaviorRaw += 10;
  // penalize reports
  const reports = me.reportsCount || 0;
  if (reports >= 3) behaviorRaw -= Math.min(80, reports * 20);
  const behavior = Math.round(Math.max(0, Math.min(100, (behaviorRaw / behaviorMax) * 100)));

  // Clarity (for clients: their posted jobs clarity; for workers: average clarity of jobs they applied to)
  let clarityScore = 60; // default neutral
  try {
    if (Array.isArray(pastJobs) && pastJobs.length > 0) {
      let total = 0;
      pastJobs.forEach(j => {
        let s = 50;
        if (j.description && j.description.length > 120) s += 20;
        if (j.price && j.price > 0) s += 15;
        if (j.recruitmentStart && j.recruitmentEnd) s += 10;
        if (j.attachments || j.hasAttachments) s += 5;
        if (j.suspicious) s -= 80;
        total += Math.max(0, Math.min(100, s));
      });
      clarityScore = Math.round(total / pastJobs.length);
    }
  } catch (e) { clarityScore = 60; }

  // Safety
  let safetyRaw = 50;
  if (me.politeScore) safetyRaw += Math.min(20, me.politeScore);
  if (!me.externalLinks) safetyRaw += 10;
  if (!me.requestsPersonalInfo) safetyRaw += 10;
  if (me.inappropriateCount && me.inappropriateCount > 0) safetyRaw -= Math.min(100, me.inappropriateCount * 40);
  const safety = Math.round(Math.max(0, Math.min(100, safetyRaw)));

  // Weighted total
  const total = Math.round(
    identity * 0.25 +
    behavior * 0.35 +
    clarityScore * 0.20 +
    safety * 0.20
  );

  // label
  let label = '不明';
  if (total >= 90) label = '非常に安全';
  else if (total >= 75) label = '安全';
  else if (total >= 60) label = 'やや注意';
  else if (total >= 40) label = '注意';
  else label = '危険';

  // reasons and badges (simple rules)
  const reasons = [];
  const badges = [];
  // Always state phone and ID verification presence explicitly
  if (me.phoneVerified) {
    reasons.push('電話番号認証: あり');
    badges.push('電話認証');
  } else {
    reasons.push('電話番号認証: 未実施');
  }
  if (me.idVerified) {
    reasons.push('身分証明書（本人確認）: あり');
    badges.push('本人確認');
  } else {
    reasons.push('身分証明書（本人確認）: 未実施');
  }
  // other reasons/badges
  if (me.emailVerified) { reasons.push('メール認証済み'); badges.push('メール認証'); }
  if (me.companyName || me.isCorporate) { reasons.push('法人アカウント'); badges.push('法人'); }
  if ((me.reportsCount || 0) === 0) reasons.push('通報ゼロ');
  if ((me.unpaidReports || 0) === 0) reasons.push('未払い報告なし');
  if (avgRating) reasons.push(`平均評価: ${avgRating} / 5`);
  if ((me.inappropriateCount || 0) > 0) reasons.push('不適切発言あり（詳細確認推奨）');
  if ((me.suspiciousFlags || 0) > 0) reasons.push('不審な行動の疑いあり');

  // if reasons empty, add generic hint
  if (reasons.length === 0) reasons.push('プロファイルを充実させるとスコアが向上します');

  return {
    score: total,
    label,
    breakdown: { identity, behavior, clarity: clarityScore, safety },
    reasons,
    badges
  };
}

// save profile
async function saveProfile({ username, bio, achievements, availability }) {
  const res = await fetch('/api/profile', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ username, bio, achievements, availability })
  });
  return res;
}

function setCurrentUserUI() {
  const token = getToken();
  const info = decodeJWT(token);
  const el = document.getElementById('currentUser');
  const logoutBtn = document.getElementById('logoutBtn');
  if (info) {
    if (el) el.textContent = info.role + '：' + (info.id || 'ユーザー');
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
  } else {
    if (el) el.textContent = '';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
  try { updateSidebarProfile(); } catch (e) { /* ignore */ }
}

// sidebar のプロフィール領域を localStorage / JWT から埋める
function updateSidebarProfile() {
  const avatarEl = document.querySelector('.profile-avatar');
  const nameEl = document.querySelector('.profile-name');
  if (!avatarEl && !nameEl) return;
  const token = getToken();
  const info = decodeJWT(token) || {};
  const storedName = localStorage.getItem('userName');
  const storedAvatar = localStorage.getItem('userAvatarUrl');
  const name = storedName || info.name || info.username || 'ゲストさん';
  if (nameEl) nameEl.textContent = name;
  const avatarUrl = storedAvatar || info.picture || info.avatarUrl || null;
  if (avatarUrl) {
    if (avatarEl) avatarEl.innerHTML = `<img src="${avatarUrl}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:8px">`;
  } else {
    const initials = (name && name.trim()) ? name.trim().slice(0,2) : 'G';
    if (avatarEl) avatarEl.textContent = initials;
  }
}

function hideForms() {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'none';
}

async function fetchUser(id) {
  try {
    const res = await fetch('/api/users/' + id, { headers: authHeaders() });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fetchJobs() {
  const res = await fetch('/api/jobs');
  const jobs = await res.json();
  const list = document.getElementById('jobs');
  list.innerHTML = '';
  const token = getToken();
  const me = decodeJWT(token);

  jobs.forEach(async (job) => {
    const li = document.createElement('li');
    const priceText = job.price ? (job.price + ' JPY') : '未設定';
    const dates = (job.recruitmentStart || job.recruitmentEnd) ? `${job.recruitmentStart || ''} ～ ${job.recruitmentEnd || ''}` : '未設定';
    li.innerHTML = `
      <strong>${job.title}</strong>
      <div style="margin-top:0.5rem"><em>カテゴリ: ${job.category || '未設定'}</em> ・ <small>状態: ${job.status || 'open'}</small></div>
      <p style="margin-top:0.6rem">${job.description || ''}</p>
      <div style="font-size:0.95rem; color:var(--dark); display:flex; gap:1rem; flex-wrap:wrap;">
        <div><strong>納品形式:</strong> ${job.deliverableFormat || '指定なし'}</div>
        <div><strong>金額:</strong> ${priceText}</div>
        <div><strong>募集期間:</strong> ${dates}</div>
        <div><strong>募集人数:</strong> ${job.positions || 1}</div>
        <div><strong>連絡手段:</strong> ${job.contactMethod || '未指定'}</div>
      </div>
    `;

    // 応募者数表示
    const applicantsCount = document.createElement('div');
    applicantsCount.textContent = '応募者数: ' + (job.applicants?.length || 0);
    li.appendChild(applicantsCount);

    // ボタン群
    const actions = document.createElement('div');
    actions.style.marginTop = '0.5rem';

    // 受注者は応募ボタンを表示
    if (me?.role === 'worker' && job.status === 'open') {
      const applyBtn = document.createElement('button');
      applyBtn.textContent = '応募する';
      applyBtn.onclick = () => apply(job._id);
      actions.appendChild(applyBtn);
    }

    // 発注者で自分の仕事なら応募者一覧と承認を表示
    if (me?.role === 'client' && job.clientId === me.id) {
      const showApplicantsBtn = document.createElement('button');
      showApplicantsBtn.textContent = '応募者を表示';
      showApplicantsBtn.onclick = async () => {
        const ul = document.createElement('ul');
        for (const userId of job.applicants || []) {
          const user = await fetchUser(userId);
          const item = document.createElement('li');
          item.textContent = (user?.name || userId) + ' (' + userId + ')';
          const acceptBtn = document.createElement('button');
          acceptBtn.textContent = '承認する';
          acceptBtn.onclick = () => acceptApplicant(job._id, userId);
          item.appendChild(acceptBtn);
          ul.appendChild(item);
        }
        // 既に表示されている応募者リストをトグル
        const existing = li.querySelector('ul');
        if (existing) existing.remove(); else li.appendChild(ul);
      };
      actions.appendChild(showApplicantsBtn);
    }

    li.appendChild(actions);
    list.appendChild(li);
  });
}

async function apply(jobId) {
  const res = await fetch(`/api/jobs/${jobId}/apply`, { method: 'POST', headers: authHeaders() });
  const data = await res.json();
  if (res.ok) {
    alert('応募しました');
    fetchJobs();
  } else {
    alert(data.error || '応募に失敗しました');
  }
}

async function postJob(title, description) {
  const res = await fetch('/api/jobs', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ title, description })
  });
  const data = await res.json();
  if (res.ok) {
    alert('投稿しました');
    document.getElementById('postJobForm').reset();
    fetchJobs();
  } else {
    alert(data.error || '投稿に失敗しました');
  }
}

// Post job from client post.html with expanded fields
async function postJobClient(fields) {
  const res = await fetch('/api/jobs', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(fields)
  });
  let data = null;
  try { data = await res.json(); } catch {}
  if (res.ok) {
    alert('依頼を投稿しました');
    window.location.href = '/index.html';
  } else {
    alert((data && data.error) || '依頼の投稿に失敗しました');
  }
}

async function acceptApplicant(jobId, userId) {
  const res = await fetch(`/api/jobs/${jobId}/accept`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ userId })
  });
  const data = await res.json();
  if (res.ok) {
    alert('承認しました');
    fetchJobs();
  } else {
    alert(data.error || '承認に失敗しました');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  setCurrentUserUI();
  fetchJobs();
  // if on worker page, load worker jobs (real or dummy)
  const workerContainer = document.getElementById('worker_jobs');
  if (workerContainer) {
    fetchJobsWorker();

    // Click-to-open behavior: toggle panel when a job item is clicked,
    // and close when clicking outside the panel or another item.
    document.addEventListener('click', (e) => {
      const li = e.target && e.target.closest ? e.target.closest('li[data-job-id]') : null;
      const panel = document.getElementById('job_detail_panel');
      if (li) {
        e.stopPropagation();
        const jobId = li.dataset.jobId || '';
        const currentId = panel?.dataset.currentJobId || '';
        if (panel && currentId === jobId && panel.classList.contains('panel-visible')) {
          hideJobDetail();
          if (panel) panel.dataset.currentJobId = '';
        } else {
          const job = li.jobData || null;
          if (job) {
            showJobDetail(job);
            if (panel) panel.dataset.currentJobId = jobId;
          }
        }
        return;
      }

      // clicked outside any job item: close panel if click is outside panel
      if (panel && !panel.contains(e.target)) {
        hideJobDetail();
        if (panel) panel.dataset.currentJobId = '';
      }
    });
  }
  // UI トグル（要素がある場合のみ設定）
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  if (loginBtn) {
    loginBtn.onclick = () => {
      const lf = document.getElementById('loginForm'); if (lf) lf.style.display = 'block';
      const rf = document.getElementById('registerForm'); if (rf) rf.style.display = 'none';
    };
  }
  if (registerBtn) {
    registerBtn.onclick = () => {
      const rf = document.getElementById('registerForm'); if (rf) rf.style.display = 'block';
      const lf = document.getElementById('loginForm'); if (lf) lf.style.display = 'none';
    };
  }
  if (logoutBtn) {
    logoutBtn.onclick = () => {
      localStorage.removeItem('token');
      setCurrentUserUI();
    };
  }

  // フォーム処理（存在確認）
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      login(f.mail.value, f.password.value);
    });
  }

  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    // Elements for parental consent UI
    const birthdateInput = document.getElementById('birthdate');
    const parentalCheckbox = document.getElementById('parentalConsent');
    const parentalLabel = document.getElementById('parentalConsentLabel');

    function updateParentalConsentUI() {
      const bd = birthdateInput?.value;
      const age = calcAge(bd);
      if (age !== null && age < 18) {
        if (parentalLabel) parentalLabel.classList.add('needs-parental');
        if (parentalCheckbox) parentalCheckbox.required = true;
        if (!parentalCheckbox?.checked) {
          if (parentalLabel) parentalLabel.classList.add('label-error');
        } else {
          if (parentalLabel) parentalLabel.classList.remove('label-error');
        }
      } else {
        if (parentalLabel) parentalLabel.classList.remove('needs-parental', 'label-error');
        if (parentalCheckbox) parentalCheckbox.required = false;
      }
    }

    birthdateInput?.addEventListener('change', updateParentalConsentUI);
    parentalCheckbox?.addEventListener('change', () => {
      if (parentalCheckbox.checked && parentalLabel) parentalLabel.classList.remove('label-error');
    });

    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      // ensure UI is updated before validation
      updateParentalConsentUI();
      const f = e.target;
      const parental = f.parentalConsent?.checked || false;
      const terms = f.terms?.checked || false;
      const age = calcAge(f.birthdate?.value || '');

      if (age !== null && age < 18 && !parental) {
        if (parentalLabel) parentalLabel.classList.add('label-error');
        alert('未成年の場合は保護者の同意が必要です');
        return;
      }

      if (!terms) {
        alert('利用規約に同意してください');
        return;
      }

      register(
        f.name.value,
        f.mail.value,
        f.password.value,
        f.phone?.value || '',
        f.username?.value || '',
        f.birthdate?.value || '',
        parental,
        terms,
        { emailOptIn: !!f.emailOptIn?.checked }
      );
    });
  }

  // client (individual) registration form handling
  const clientRegisterForm = document.getElementById('clientRegisterForm');
  if (clientRegisterForm) {
    clientRegisterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      const terms = f.terms?.checked || false;
      if (!terms) { alert('利用規約に同意してください'); return; }
      const name = f.contactName?.value || f.companyName?.value || '発注者';
      const email = f.mail?.value || '';
      const password = f.password?.value || '';
      const phone = f.phone?.value || '';
      const extra = { clientType: 'individual', companyName: f.companyName?.value || '' };
      register(name, email, password, phone, '', '', false, terms, 'client', extra);
    });
  }

  // corporate registration form handling
  const corpRegisterForm = document.getElementById('corpRegisterForm');
  if (corpRegisterForm) {
    corpRegisterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      const terms = f.terms?.checked || false;
      if (!terms) { alert('利用規約に同意してください'); return; }
      const companyName = f.companyName?.value || '';
      const name = f.contactName?.value || companyName || '法人担当者';
      const email = f.mail?.value || '';
      const password = f.password?.value || '';
      const phone = f.phone?.value || '';
      const extra = { clientType: 'corporation', companyName, corporateNumber: f.corporateNumber?.value || '' };
      register(name, email, password, phone, '', '', false, terms, 'client', extra);
    });
  }

  const postJobForm = document.getElementById('postJobForm');
  if (postJobForm) {
    postJobForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      postJob(f.title.value, f.description.value);
    });
  }

  // profile page handling
  const saveProfileBtn = document.getElementById('saveProfileBtn');
  if (saveProfileBtn) {
    // prefill if logged in
    fetchMe().then((me) => {
      if (me) {
        const u = document.getElementById('pf_username'); if (u) u.value = me.username || '';
        const b = document.getElementById('pf_bio'); if (b) b.value = me.bio || '';
        const a = document.getElementById('pf_achievements'); if (a) a.value = me.achievements || '';
        const av = document.getElementById('pf_availability'); if (av) av.value = me.availability || '';
      }
    });

    saveProfileBtn.onclick = async () => {
      const username = document.getElementById('pf_username')?.value || '';
      const bio = document.getElementById('pf_bio')?.value || '';
      const achievements = document.getElementById('pf_achievements')?.value || '';
      const availability = document.getElementById('pf_availability')?.value || '';
      const res = await saveProfile({ username, bio, achievements, availability });
      const data = await res.json();
      if (res.ok) {
        alert(data.message || 'プロフィールを保存しました');
        window.location.href = 'index.html';
      } else {
        alert(data.error || '保存に失敗しました');
      }
    };
  }

  // post.html handling (client-side post page)
  const postJobBtn = document.getElementById('postJobBtn');
  const previewJobBtn = document.getElementById('previewJobBtn');
  if (postJobBtn) {
    postJobBtn.onclick = async () => {
      const title = document.getElementById('job_title')?.value || '';
      const category = document.getElementById('job_category')?.value || '';
      const description = document.getElementById('job_description')?.value || '';
      const deliverableFormat = document.getElementById('job_deliverable')?.value || '';
      const requirements = document.getElementById('job_requirements')?.value || '';
      const price = Number(document.getElementById('job_price')?.value || 0);
      const recruitmentStart = document.getElementById('job_recruit_start')?.value || null;
      const recruitmentEnd = document.getElementById('job_recruit_end')?.value || null;
      const positions = Number(document.getElementById('job_positions')?.value || 1);
      const contactMethod = document.getElementById('job_contact')?.value || '';

      // check role: only clients can post
      const me = decodeJWT(getToken());
      if (!me || me.role !== 'client') {
        alert('発注するには発注者（client）アカウントでログインしてください');
        return;
      }

      // basic validation: title, category, description, price
      if (!title || !category || !description) {
        alert('タイトル・カテゴリ・依頼内容は必須です');
        return;
      }

      await postJobClient({
        title,
        category,
        description,
        deliverableFormat,
        requirements,
        price,
        recruitmentStart,
        recruitmentEnd,
        positions,
        contactMethod
      });
    };
  }

  if (previewJobBtn) {
    previewJobBtn.onclick = () => {
      const title = document.getElementById('job_title')?.value || '';
      const category = document.getElementById('job_category')?.value || '';
      const description = document.getElementById('job_description')?.value || '';
      const deliverableFormat = document.getElementById('job_deliverable')?.value || '';
      const requirements = document.getElementById('job_requirements')?.value || '';
      const price = document.getElementById('job_price')?.value || '';
      const recruitmentStart = document.getElementById('job_recruit_start')?.value || '';
      const recruitmentEnd = document.getElementById('job_recruit_end')?.value || '';
      const positions = document.getElementById('job_positions')?.value || '';
      const contactMethod = document.getElementById('job_contact')?.value || '';

      const w = window.open('', '_blank');
      w.document.write(`<h2>${escapeHtml(title)}</h2><p><strong>カテゴリ:</strong> ${escapeHtml(category)}</p><p>${escapeHtml(description).replace(/\n/g,'<br/>')}</p><p><strong>納品形式:</strong> ${escapeHtml(deliverableFormat)}</p><p><strong>応募条件:</strong> ${escapeHtml(requirements)}</p><p><strong>金額:</strong> ${escapeHtml(price)}</p><p><strong>募集期間:</strong> ${escapeHtml(recruitmentStart)} ～ ${escapeHtml(recruitmentEnd)}</p><p><strong>募集人数:</strong> ${escapeHtml(positions)}</p><p><strong>連絡手段:</strong> ${escapeHtml(contactMethod)}</p>`);
    };
  }
});
