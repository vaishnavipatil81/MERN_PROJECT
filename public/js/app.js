const App = (() => {
  const root = document.getElementById('app');
  const toast = document.getElementById('toast');
  let progressChart;
  let fillerChart;

  const routes = {
    home: renderHome,
    login: renderLogin,
    register: renderRegister,
    dashboard: renderDashboard,
    admin: renderAdminDashboard,
    practice: renderPractice,
    upload: renderUpload,
    community: renderCommunity,
    'add-review': renderReviewPage,
    history: renderHistory,
    profile: renderProfile
  };

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3200);
  }

  function go(route) {
    window.location.hash = route;
  }

  function currentRoute() {
    const route = window.location.hash.replace('#', '') || (API.getToken() ? 'dashboard' : 'home');
    if (API.getUser()?.isAdmin && !['home', 'login', 'register', 'admin'].includes(route)) return 'admin';
    return API.getToken() || ['home', 'login', 'register'].includes(route) ? route : 'home';
  }

  function siteFooter() {
    return `
      <footer class="site-footer">
        <div class="footer-grid">
          <div class="footer-brand">
            <span class="brand-mark small">SF</span>
            <strong>SpeakFlow AI</strong>
            <p>Realtime interview coaching, public speaking practice, progress analytics, and peer learning for confident speakers.</p>
          </div>
          <div class="footer-column">
            <h3>Links</h3>
            <button data-route="home">Home</button>
            <button data-route="practice">AI Practice</button>
            <button data-route="history">Reports</button>
            <button data-route="community">Community</button>
          </div>
          <div class="footer-column">
            <h3>Stay tuned</h3>
            <p>Connect with us and keep improving your interview presence.</p>
            <div class="footer-socials">
              <button type="button" aria-label="Twitter">T</button>
              <button type="button" aria-label="LinkedIn">in</button>
              <button type="button" aria-label="YouTube">YT</button>
            </div>
          </div>
          <form class="footer-column footer-subscribe">
            <h3>Email updates</h3>
            <p>Be the first to hear about new coaching features and practice tips.</p>
            <label>
              <span class="sr-only">Email</span>
              <input type="email" placeholder="email" />
            </label>
            <button class="footer-email-btn" type="submit">Subscribe</button>
          </form>
          <div class="footer-column">
            <h3>Contact us</h3>
            <p>Questions? We have answers. Try AI Practice or update your speaking profile.</p>
            <button class="footer-email-btn" data-route="profile">Profile</button>
          </div>
        </div>
        <div class="footer-bottom">
          <span class="footer-bot">SF</span>
          <small>Copyright © ${new Date().getFullYear()} SpeakFlow AI. Built for confident communication.</small>
        </div>
      </footer>
    `;
  }

  function chatbotWidget() {
    return `
      <aside class="chatbot-widget" aria-label="SpeakFlow chatbot">
        <button class="chatbot-toggle" type="button" aria-expanded="false" aria-controls="chatbotPanel">
          <span>AI</span>
          <strong>Ask SpeakFlow</strong>
        </button>
        <section id="chatbotPanel" class="chatbot-panel" hidden>
          <div class="chatbot-head">
            <div>
              <strong>SpeakFlow Assistant</strong>
              <small>Trained on this website</small>
            </div>
            <button type="button" class="chatbot-close" aria-label="Close chatbot">x</button>
          </div>
          <div class="chatbot-messages" data-chatbot-messages>
            <div class="bot-message">Hi, I can help with practice, uploads, reports, community, reviews, password reset, and admin dashboard questions.</div>
          </div>
          <form class="chatbot-form" data-chatbot-form>
            <input class="input" name="question" autocomplete="off" placeholder="Ask about SpeakFlow AI..." />
            <button class="btn" type="submit">Send</button>
          </form>
        </section>
      </aside>
    `;
  }

  function shell(content, active = 'dashboard') {
    const user = API.getUser() || {};
    const navItems = ['home', 'dashboard', 'practice', 'upload', 'community', 'add-review', 'history', 'profile'];
    if (user.isAdmin) navItems.splice(1, 0, 'admin');
    return `
      <header class="topbar app-topbar">
        <div style="display:flex;align-items:center;gap:12px">
          <span class="brand-mark">SF</span>
          <div>
            <strong>SpeakFlow AI</strong>
            <div class="muted">Realtime public speaking trainer</div>
          </div>
        </div>
        <nav class="nav app-nav">
          ${navItems
            .map((item) => `<button class="${active === item ? 'active' : ''}" data-route="${item}">${label(item)}</button>`)
            .join('')}
          <button data-route="community" data-community-target="connections" class="notification-btn">Connections <span id="notificationBadge" class="badge"></span></button>
          <button id="logoutBtn">Logout</button>
        </nav>
      </header>
      ${content}
      ${siteFooter()}
      ${chatbotWidget()}
    `;
  }

  function adminShell(content, active = 'overview') {
    return `
      <header class="topbar admin-topbar">
        <div style="display:flex;align-items:center;gap:12px">
          <span class="brand-mark">SF</span>
          <div>
            <strong>SpeakFlow Admin</strong>
            <div class="muted">Students, sessions, and groups</div>
          </div>
        </div>
        <nav class="nav">
          ${['overview', 'users', 'sessions', 'groups', 'reviews']
            .map((item) => `<button class="${active === item ? 'active' : ''}" data-admin-jump="${item}">${label(item)}</button>`)
            .join('')}
          <button id="logoutBtn">Logout</button>
        </nav>
      </header>
      ${content}
      ${chatbotWidget()}
    `;
  }

  function label(route) {
    if (route === 'community') return 'Community';
    if (route === 'practice') return 'AI Practice';
    if (route === 'admin') return 'Admin';
    if (route === 'overview') return 'Overview';
    if (route === 'users') return 'Users';
    if (route === 'sessions') return 'Sessions';
    if (route === 'groups') return 'Groups';
    if (route === 'alerts') return 'Alerts';
    if (route === 'connections') return 'Connections';
    if (route === 'add-review') return 'Add Review';
    if (route === 'home') return 'Home';
    return route.charAt(0).toUpperCase() + route.slice(1);
  }

  function navIcon(route) {
    return {
      home: 'H',
      dashboard: 'D',
      practice: 'P',
      upload: 'U',
      community: 'C',
      'add-review': 'R',
      history: 'T',
      profile: 'Me',
      admin: 'A'
    }[route] || route.charAt(0).toUpperCase();
  }

  function authLayout(mode) {
    const isLogin = mode === 'login';
    return `
      <header class="topbar auth-topbar">
        <div style="display:flex;align-items:center;gap:12px">
          <span class="brand-mark">SF</span>
          <strong>SpeakFlow AI</strong>
        </div>
        <nav class="nav">
          <button data-route="home">Home</button>
          <button class="${isLogin ? 'active' : ''}" data-route="login">Login</button>
          <button class="${isLogin ? '' : 'active'}" data-route="register">Register</button>
        </nav>
      </header>
      <section class="auth-layout auth-page ${isLogin ? 'login-auth' : 'register-auth'}">
        <div class="auth-copy auth-visual">
          <span class="status-pill"><span class="dot live"></span>${isLogin ? 'Welcome back coach-ready workspace' : 'Start with a guided speaking profile'}</span>
          <h1>${isLogin ? 'Continue your speaking streak.' : 'Build your confident speaking habit.'}</h1>
          <p>${isLogin ? 'Jump back into live practice, progress charts, and your recent coaching history without losing momentum.' : 'Create a workspace that tracks confidence, fillers, pace, eye contact, and practice reports from day one.'}</p>
          <div class="auth-preview ${isLogin ? 'login-preview' : 'register-preview'}">
            <div class="preview-header">
              <span class="brand-mark small">SF</span>
              <strong>${isLogin ? "Today's practice" : 'New learner setup'}</strong>
            </div>
            <div class="preview-meter">
              <span>${isLogin ? '86%' : 'Ready'}</span>
            </div>
            <div class="preview-bars">
              <span style="--w:82%"></span>
              <span style="--w:64%"></span>
              <span style="--w:74%"></span>
            </div>
            <div class="preview-note">${isLogin ? 'Next: improve eye contact by 8%' : 'Goal: interviews, GD, presentations'}</div>
          </div>
          <div class="auth-benefits">
            <span>Live coaching</span>
            <span>Progress reports</span>
            <span>Community practice</span>
          </div>
        </div>
        <form id="authForm" class="panel auth-card">
          <span class="form-eyebrow">${isLogin ? 'Secure sign in' : 'Student onboarding'}</span>
          <h2>${isLogin ? 'Welcome back' : 'Create account'}</h2>
          <p class="muted">${isLogin ? 'Choose your role and enter your credentials.' : 'Set up your account to unlock live practice rooms.'}</p>
          ${
            isLogin
              ? `<div class="role-choice" role="radiogroup" aria-label="Login role">
                <label><input type="radio" name="role" value="student" checked /> Student</label>
                <label><input type="radio" name="role" value="admin" /> Admin</label>
              </div>`
              : ''
          }
          ${isLogin ? '' : '<label class="field"><span>Name</span><input class="input" name="name" required /></label>'}
          <label class="field"><span>Email</span><input class="input" name="email" type="email" required /></label>
          <label class="field"><span>Password</span><input class="input" name="password" type="password" minlength="6" required /></label>
          <button class="btn" style="width:100%" type="submit">${isLogin ? 'Login' : 'Register'}</button>
          <p class="muted">
            ${isLogin ? 'No account?' : 'Already registered?'}
            <button class="link-btn" type="button" data-route="${isLogin ? 'register' : 'login'}">${isLogin ? 'Register' : 'Login'}</button>
          </p>
          ${
            isLogin
              ? `<div class="auth-reset-tools">
                  <button class="link-btn" type="button" id="forgotBtn">Forgot password?</button>
                  <div id="resetPanel" class="reset-panel" hidden>
                    <strong>Reset password</strong>
                    <p class="muted">Generate a secure reset token, then set a new password and log in instantly.</p>
                    <label class="field"><span>Reset token</span><input class="input" name="resetToken" placeholder="Token appears here" /></label>
                    <label class="field"><span>New password</span><input class="input" name="newPassword" type="password" minlength="6" placeholder="New password" /></label>
                    <button class="btn secondary" type="button" id="resetPasswordBtn">Reset and login</button>
                  </div>
                </div>`
              : ''
          }
        </form>
      </section>
      ${chatbotWidget()}
    `;
  }

  async function renderHome() {
    const data = await safeLoad(() => API.request('/api/reviews'), { reviews: [] });
    root.innerHTML = `
      <header class="topbar landing-nav">
        <div style="display:flex;align-items:center;gap:12px">
          <span class="brand-mark">SF</span>
          <strong>SpeakFlow AI</strong>
        </div>
        <nav class="nav">
          <button class="active" data-route="home">Home</button>
          ${
            API.getToken()
              ? `<button data-route="${API.getUser()?.isAdmin ? 'admin' : 'dashboard'}">${API.getUser()?.isAdmin ? 'Admin' : 'Dashboard'}</button>`
              : '<button data-route="login">Login</button><button data-route="register">Register</button>'
          }
        </nav>
      </header>
      <section class="home-hero">
        <div class="hero-copy">
          <span class="status-pill"><span class="dot live"></span>Realtime speech intelligence</span>
          <h1>Train your voice while you speak.</h1>
          <p>SpeakFlow AI listens, scores, and coaches your public speaking with live transcription, filler detection, pacing, eye-contact signals, and progress reports.</p>
          <div class="hero-actions">
            <button class="btn" data-route="register">Start training</button>
            <button class="btn secondary" data-route="login">I already have an account</button>
          </div>
        </div>
        <div class="speech-lab" id="speechLab">
          <div class="voice-ring">
            <span></span><span></span><span></span><span></span>
          </div>
          <div class="live-card">
            <div class="stat-row"><span>Confidence</span><strong id="heroConfidence">86%</strong></div>
            <div class="stat-row"><span>Speed</span><strong id="heroSpeed">Normal</strong></div>
            <div class="stat-row"><span>Fillers</span><strong id="heroFillers">2</strong></div>
            <div class="stat-row"><span>Eye contact</span><strong id="heroEye">78%</strong></div>
          </div>
        </div>
      </section>
      <section class="feature-strip">
        ${[
          ['Live Practice', 'Webcam, microphone, transcript, and coaching update while you speak.'],
          ['Upload Reports', 'Upload a video, preview it, analyze transcript quality, and save history.'],
          ['Progress Charts', 'Track confidence, fillers, speed, and eye contact across sessions.']
        ]
          .map(([title, text]) => `<article class="metric-card"><h3>${title}</h3><p class="muted">${text}</p></article>`)
          .join('')}
      </section>
      <section class="panel reviews-showcase">
        <div class="section-head">
          <div>
            <h2>What Students Say</h2>
            <p class="muted">Verified feedback from learners using SpeakFlow AI.</p>
          </div>
          <span class="status-pill">Verified Students</span>
        </div>
        <div class="review-grid stable-reviews">
            ${reviewCards(data.reviews).join('') || '<article class="review-card"><strong>No reviews yet</strong><p class="muted">Student reviews will appear here after submission.</p></article>'}
        </div>
      </section>
      ${siteFooter()}
      ${chatbotWidget()}
    `;
    bindLanding();
    animateHero();
  }

  function reviewCards(reviews = []) {
    return reviews.map((review) => {
      const person = {
        name: review.name || 'Student',
        avatarUrl: review.avatarUrl || '',
        skillLevel: review.skillLevel || 'Student',
        language: review.language || 'English'
      };
      const bio = review.bio || 'Practicing interviews and confident communication with SpeakFlow AI.';
      return `
      <article class="review-card testimonial-card">
        <div class="quote-mark" aria-hidden="true">“</div>
        <div class="review-profile">
          <img class="review-avatar" src="${Community.avatar(person)}" alt="" />
          <div>
            <strong>${escapeHtml(person.name)}</strong>
            <small>${escapeHtml(person.skillLevel)} · ${escapeHtml(person.language)} speaker</small>
          </div>
          <span class="verified-badge">Verified</span>
        </div>
        <p class="review-bio">${escapeHtml(bio)}</p>
        <div class="stars" aria-label="${review.rating} star rating">${'★'.repeat(review.rating || 0)}${'☆'.repeat(5 - Number(review.rating || 0))}</div>
        <p class="review-quote">${escapeHtml(review.comment || '')}</p>
        <div class="review-foot">
          <span>Student review</span>
          <time>${new Date(review.createdAt || Date.now()).toLocaleDateString()}</time>
        </div>
      </article>
    `;
    });
  }

  function renderLogin() {
    root.innerHTML = authLayout('login');
    bindAuth('login');
    bindChatbot();
  }

  function renderRegister() {
    root.innerHTML = authLayout('register');
    bindAuth('register');
    bindChatbot();
  }

  function bindAuth(mode) {
    root.querySelectorAll('[data-route]').forEach((button) => {
      button.addEventListener('click', () => go(button.dataset.route));
    });

    document.getElementById('authForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      try {
        if (mode === 'login') {
          await Auth.login(form.get('email'), form.get('password'), form.get('role') || 'student');
        } else {
          await Auth.register(form.get('name'), form.get('email'), form.get('password'));
        }
        showToast('You are in. Let’s practice.');
        go(API.getUser()?.isAdmin ? 'admin' : 'dashboard');
      } catch (error) {
        showToast(error.message);
      }
    });

    const forgotBtn = document.getElementById('forgotBtn');
    if (forgotBtn) {
      forgotBtn.addEventListener('click', async () => {
        const email = root.querySelector('[name="email"]').value;
        if (!email) return showToast('Enter your email first.');
        forgotBtn.disabled = true;
        const resetPanel = document.getElementById('resetPanel');
        try {
          const data = await Auth.forgotPassword(email);
          resetPanel.hidden = false;
          if (data.resetToken) root.querySelector('[name="resetToken"]').value = data.resetToken;
          showToast(data.resetToken ? 'Reset token generated. Add a new password.' : data.message);
        } catch (error) {
          showToast(error.message);
        } finally {
          forgotBtn.disabled = false;
        }
      });
    }

    document.getElementById('resetPasswordBtn')?.addEventListener('click', async () => {
      const token = root.querySelector('[name="resetToken"]')?.value.trim();
      const password = root.querySelector('[name="newPassword"]')?.value;
      if (!token) return showToast('Reset token is required.');
      if (!password || password.length < 6) return showToast('New password must be at least 6 characters.');
      try {
        await Auth.resetPassword(token, password);
        showToast('Password reset. You are logged in.');
        go(API.getUser()?.isAdmin ? 'admin' : 'dashboard');
      } catch (error) {
        showToast(error.message);
      }
    });
  }

  async function renderDashboard() {
    const data = await safeLoad(() => API.request('/api/sessions/dashboard'), { stats: {}, progress: [] });
    const stats = data.stats || {};
    root.innerHTML = shell(
      `
      <section class="grid dashboard-grid">
        <article class="metric-card"><span class="muted">Total speeches</span><strong>${stats.totalSpeeches || 0}</strong></article>
        <article class="metric-card"><span class="muted">Average confidence</span><strong>${stats.averageConfidence || 0}%</strong></article>
        <article class="metric-card"><span class="muted">Filler words</span><strong>${stats.totalFillers || 0}</strong></article>
        <article class="metric-card"><span class="muted">Eye contact</span><strong>${stats.averageEyeContact || 0}%</strong></article>
      </section>
      <section class="content-grid" style="margin-top:16px">
        <div class="panel"><h2>Performance progress</h2><canvas id="progressChart"></canvas></div>
        <div class="panel"><h2>Recent pattern</h2><canvas id="fillerChart"></canvas></div>
      </section>
      `,
      'dashboard'
    );
    bindShell();
    drawCharts(data.progress || []);
  }

  function renderPractice() {
    root.innerHTML = shell(
      `
      <section class="ai-practice-hero">
        <div class="ai-practice-copy">
          <span class="status-pill"><span id="liveDot" class="dot"></span><span id="practiceStatus">AI mentor ready</span></span>
          <h1>AI Practice Coach</h1>
          <p>Technical interviews, internship screening, HR, speaking, rapid fire, and GD practice with adaptive questions and supportive feedback.</p>
          <div class="ai-hero-actions">
            <button id="startPractice" class="btn" type="button">Start Session</button>
            <button id="stopPractice" class="btn danger" type="button" disabled>End Session</button>
            <button id="fullscreenPractice" class="btn secondary" type="button">Fullscreen</button>
            <button id="themeToggle" class="btn secondary" type="button">Light Mode</button>
          </div>
        </div>
        <div class="ai-assistant-panel">
          <div class="ai-avatar" aria-hidden="true">
            <span></span><span></span><span></span>
          </div>
          <div>
            <strong>SpeakFlow Mentor</strong>
            <p id="coachMessage">Choose a mode and difficulty. I will ask one question at a time, listen patiently, and give feedback only after your answer.</p>
          </div>
        </div>
      </section>

      <section id="aiPracticeWorkspace" class="ai-practice-workspace">
        <aside class="panel ai-control-panel">
          <div class="section-head">
            <div>
              <span class="form-eyebrow">Setup</span>
              <h2>Mode</h2>
            </div>
          </div>
          <div class="ai-mode-grid" role="radiogroup" aria-label="AI practice modes">
            ${[
              ['hr', 'HR Interview', 'Behavioral confidence and personality rounds'],
              ['technical', 'Technical Interview', 'Projects, concepts, debugging, trade-offs'],
              ['internship', 'Internship Screening', 'Fresher-ready recruiter conversations'],
              ['speaking', 'Speaking Practice', '1-3 minute topic speaking confidence'],
              ['introduction', 'Self Introduction', 'Short, clear, memorable intro'],
              ['rapid', 'Rapid Fire', 'Fast answers with crisp structure'],
              ['gd', 'Group Discussion', 'Opening views, disagreement, conclusion']
            ]
              .map(
                ([value, title, text], index) => `
                <button class="ai-mode-card ${value === 'technical' ? 'active' : ''}" type="button" data-mode="${value}">
                  <strong>${title}</strong>
                  <small>${text}</small>
                </button>`
              )
              .join('')}
          </div>

          <div class="ai-difficulty-row" role="radiogroup" aria-label="Difficulty">
            ${['Beginner', 'Intermediate', 'Advanced'].map((level, index) => `<button class="${index === 0 ? 'active' : ''}" type="button" data-difficulty="${level}">${level}</button>`).join('')}
          </div>

          <div id="technicalSetup" class="technical-setup">
            <label class="field">
              <span>Your name</span>
              <input id="studentName" class="input" placeholder="Enter your name before starting" />
            </label>
            <label class="field">
              <span>Engineering Branch</span>
              <select id="engineeringBranch" class="input">
                ${['Computer Science Engineering (CSE)', 'Information Technology (IT)', 'AI & Data Science', 'Electronics & Telecommunication', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering', 'Chemical Engineering', 'Automobile Engineering', 'Aerospace Engineering', 'Biomedical Engineering', 'Robotics Engineering', 'Mechatronics Engineering', 'Instrumentation Engineering', 'Production Engineering'].map((item) => `<option>${item}</option>`).join('')}
              </select>
            </label>
          </div>

          <label class="field">
            <span>Topic or role target</span>
            <input id="practiceTopic" class="input" placeholder="Optional: Dream Company, React internship, GD topic..." />
          </label>
          <label class="field">
            <span>Resume context</span>
            <textarea id="resumeContext" rows="5" placeholder="Paste key resume points for resume-based interview questions."></textarea>
          </label>
          <div class="ai-challenge-card">
            <span>Daily challenge</span>
            <strong id="dailyChallenge">Speak for two minutes on AI Future with one example.</strong>
          </div>
          <div class="ai-streak-card">
            <div><strong id="practiceStreak">0</strong><span>day streak</span></div>
            <div><strong id="practiceRank">Rising</strong><span>mentor rank</span></div>
          </div>
        </aside>

        <div class="ai-practice-main-column">
        <main class="panel ai-interview-stage">
          <div class="practice-question-strip">
            <div>
              <span class="muted">Question <span id="questionCounter">1</span> of <span id="questionLimit">10</span></span>
              <strong id="questionText">[TCS - HR Interview - Beginner] Tell me about yourself.</strong>
            </div>
            <span id="timer" class="practice-timer">00:00</span>
          </div>

          <div class="ai-stage-grid">
            <div class="video-wrap practice-video-wrap">
              <video id="webcam" autoplay muted playsinline></video>
              <canvas id="practiceVisionCanvas" width="320" height="180" hidden></canvas>
              <div id="cameraPlaceholder" class="camera-placeholder">Webcam preview appears here</div>
              <div id="coachHint" class="coach-hint" aria-live="polite"></div>
              <div class="camera-health">
                <span id="cameraStatus">Camera idle</span>
                <span id="audioStatus">Mic idle</span>
              </div>
            </div>
            <div class="ai-live-panel">
              <div id="confidenceMeter" class="meter" data-score="0" style="--score:0"></div>
              <div class="waveform" id="micWaveform" aria-label="Live microphone waveform">
                ${Array.from({ length: 24 }, (_, index) => `<span style="--i:${index}"></span>`).join('')}
              </div>
              <div class="voice-meter-row">
                <span>Voice level</span>
                <meter id="voiceLevel" min="0" max="100" value="0"></meter>
              </div>
              <div class="stat-row"><span>WPM</span><strong id="wpm">0</strong></div>
              <div class="stat-row"><span>Speed</span><strong id="speedLabel">Ready</strong></div>
              <div class="stat-row"><span>Filler words</span><strong id="fillerTotal">0</strong></div>
              <div class="stat-row"><span>Eye contact</span><strong id="eyeContact">0%</strong></div>
              <div class="stat-row"><span>Long pauses</span><strong id="pauseTotal">0</strong></div>
            </div>
          </div>

          <form id="answerForm" class="answer-console">
            <label class="field">
              <span>Your answer</span>
              <textarea id="answerInput" rows="5" placeholder="Speak using the microphone or type your answer here."></textarea>
            </label>
            <div class="ai-answer-actions">
              <button id="submitAnswer" class="btn" type="submit">Finish Answer</button>
              <button id="nextQuestion" class="btn secondary" type="button" disabled>Next Question</button>
            </div>
          </form>
        </main>

      <section class="content-grid practice-report-grid">
        <div class="panel practice-memory-panel">
          <div class="section-head">
            <div>
              <h2>Conversation Memory</h2>
              <p class="muted">Questions and answers stay in context during this session.</p>
            </div>
            <span id="wordTotal" class="status-pill">0 words</span>
          </div>
          <div id="transcript" class="transcript muted">Your answer transcript and session memory will appear here.</div>
        </div>
        <div class="panel practice-session-report-panel">
          <div class="section-head">
            <div>
              <h2>End Session Report</h2>
              <p class="muted">Strengths first, then focused improvements and next practice topics.</p>
            </div>
            <button id="downloadReport" class="btn secondary" type="button" disabled>Download</button>
          </div>
          <div id="report" class="grid practice-summary"></div>
        </div>
      </section>
        </div>
      </section>
      <section class="panel ai-analytics-panel">
        <div class="section-head">
          <h2>Analytics Dashboard</h2>
          <span id="coachMode" class="status-pill">Ready</span>
        </div>
        <div class="ai-chart-grid">
          <canvas id="practiceRadarChart"></canvas>
          <div id="roadmapList" class="ai-roadmap">
            <strong>Improvement roadmap</strong>
            <p class="muted">Complete a session to generate your roadmap.</p>
          </div>
        </div>
      </section>
      `,
      'practice'
    );
    window.scrollTo({ top: 0, behavior: 'auto' });
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'auto' }), 0);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'auto' }), 250);
    bindShell();
    Practice.init(showToast);
  }

  function renderUpload() {
    root.innerHTML = shell(
      `
      <section class="content-grid">
        <div class="panel">
          <h2>Upload analysis</h2>
          <form id="uploadForm" class="grid">
            <label class="field"><span>Speech title</span><input class="input" name="title" required /></label>
            <label class="field"><span>Video file</span><input class="input" name="video" type="file" accept="video/*" required /></label>
            <div class="upload-preview">
              <video id="uploadPreview" controls playsinline></video>
              <div id="uploadEmpty" class="muted">Choose a video to preview it here.</div>
            </div>
            <label class="field"><span>Transcript for realtime analysis</span><textarea name="transcript" rows="7" placeholder="Paste or type the speech transcript. Metrics update instantly."></textarea></label>
            <div class="two-col">
              <label class="field"><span>WPM</span><input class="input" name="wpm" type="number" value="0" min="0" /></label>
              <label class="field"><span>Eye contact score</span><input class="input" name="eyeContactScore" type="number" value="0" min="0" max="100" /></label>
            </div>
            <button id="uploadSubmit" class="btn" type="submit">Upload and save report</button>
          </form>
        </div>
        <aside class="panel">
          <h2>Realtime upload score</h2>
          <div id="uploadMeter" class="meter" data-score="0" style="--score:0"></div>
          <div class="stat-row"><span>WPM</span><strong id="uploadWpm">0</strong></div>
          <div class="stat-row"><span>Speed</span><strong id="uploadSpeed">Ready</strong></div>
          <div class="stat-row"><span>Filler words</span><strong id="uploadFillers">0</strong></div>
          <div class="stat-row"><span>Eye contact</span><strong id="uploadEye">0%</strong></div>
          <h3>Suggestions</h3>
          <p id="uploadSuggestions" class="muted">Upload a video and add a transcript to start realtime analysis.</p>
        </aside>
      </section>
      <section class="panel" style="margin-top:16px">
        <h2>Highlighted transcript</h2>
        <div id="uploadTranscriptPreview" class="transcript muted">Detected filler words will be highlighted here in realtime.</div>
      </section>
      `,
      'upload'
    );
    bindShell();
    bindUploadRealtime();
    document.getElementById('uploadForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const transcript = form.get('transcript') || '';
      if (!form.get('video')?.name) {
        showToast('Please choose a video first.');
        return;
      }
      if (!transcript.trim()) {
        showToast('Please add a transcript for analysis.');
        return;
      }
      const fillerCounts = Analytics.countFillers(transcript);
      const confidenceScore = Analytics.confidence({
        fillerCounts,
        wpm: Number(form.get('wpm') || 0),
        eyeContactScore: Number(form.get('eyeContactScore') || 0),
        pauseCount: 0
      });
      form.set('confidenceScore', confidenceScore);
      form.set('durationSeconds', Math.round(document.getElementById('uploadPreview').duration || 0));
      const submit = document.getElementById('uploadSubmit');
      submit.disabled = true;
      submit.textContent = 'Saving report...';
      try {
        const result = await API.request('/api/uploads/video', { method: 'POST', body: form });
        showToast(result.uploadMode === 'cloudinary' ? 'Video uploaded and report saved.' : 'Report saved locally. Add Cloudinary keys for cloud video storage.');
        go('history');
      } catch (error) {
        try {
          await saveUploadReportFallback(form, confidenceScore, fillerCounts);
          showToast('Report saved. Cloud video upload is not configured.');
          go('history');
        } catch (fallbackError) {
          showToast(fallbackError.message || error.message);
        }
      } finally {
        submit.disabled = false;
        submit.textContent = 'Upload and save report';
      }
    });
  }

  function bindUploadRealtime() {
    const form = document.getElementById('uploadForm');
    const fileInput = form.elements.video;
    const preview = document.getElementById('uploadPreview');
    const empty = document.getElementById('uploadEmpty');
    const sync = () => updateUploadMetrics(form);

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      preview.src = URL.createObjectURL(file);
      preview.classList.add('show');
      empty.style.display = 'none';
      if (!form.elements.title.value.trim()) {
        form.elements.title.value = file.name.replace(/\.[^.]+$/, '');
      }
      sync();
    });

    form.elements.transcript.addEventListener('input', sync);
    form.elements.wpm.addEventListener('input', sync);
    form.elements.eyeContactScore.addEventListener('input', sync);
    sync();
  }

  function updateUploadMetrics(form) {
    const transcript = form.elements.transcript.value || '';
    const hasVideo = Boolean(form.elements.video.files[0]);
    const hasTranscript = transcript.trim().length > 0;
    const hasInput = hasVideo || hasTranscript;
    const wpm = Number(form.elements.wpm.value || 0);
    const eyeContactScore = Number(form.elements.eyeContactScore.value || 0);
    const fillerCounts = Analytics.countFillers(transcript);
    const confidenceScore = hasInput
      ? Analytics.confidence({ fillerCounts, wpm, eyeContactScore, pauseCount: 0 })
      : 0;
    const speed = hasInput && wpm > 0 ? Analytics.speedLabel(wpm) : 'Ready';
    const suggestions = hasInput
      ? Analytics.suggestions({ fillerCounts, wpm, eyeContactScore, confidenceScore })
      : ['Upload a video and add a transcript to start realtime analysis.'];
    const meter = document.getElementById('uploadMeter');

    meter.dataset.score = confidenceScore;
    meter.style.setProperty('--score', confidenceScore);
    document.getElementById('uploadWpm').textContent = wpm;
    document.getElementById('uploadSpeed').textContent = speed;
    document.getElementById('uploadFillers').textContent = Analytics.totalFillers(fillerCounts);
    document.getElementById('uploadEye').textContent = `${eyeContactScore}%`;
    document.getElementById('uploadSuggestions').textContent = suggestions.join(' ');
    document.getElementById('uploadTranscriptPreview').classList.toggle('muted', !transcript);
    document.getElementById('uploadTranscriptPreview').innerHTML = transcript
      ? Analytics.highlightFillers(escapeHtml(transcript))
      : 'Detected filler words will be highlighted here in realtime.';
  }

  async function saveUploadReportFallback(form, confidenceScore, fillerCounts) {
    const transcript = form.get('transcript') || '';
    const wpm = Number(form.get('wpm') || 0);
    const eyeContactScore = Number(form.get('eyeContactScore') || 0);
    return API.request('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({
        title: form.get('title') || 'Uploaded speech',
        source: 'upload',
        videoUrl: `local-upload://${form.get('video')?.name || 'video'}`,
        transcript,
        durationSeconds: Math.round(document.getElementById('uploadPreview').duration || 0),
        wpm,
        speedLabel: Analytics.speedLabel(wpm),
        confidenceScore,
        eyeContactScore,
        fillerCounts,
        suggestions: Analytics.suggestions({ fillerCounts, wpm, eyeContactScore, confidenceScore })
      })
    });
  }

  async function renderCommunity() {
    const data = await safeLoad(() => Community.load(), {
      suggestions: { suggestions: [] },
      connections: { incoming: [], outgoing: [], accepted: [], counts: {} },
      chats: { chats: [], unread: [] },
      groups: { groups: [] },
      notifications: { notifications: [] },
      rooms: { rooms: [] }
    });
    const me = API.getUser() || {};
    const requestedTab = sessionStorage.getItem('community_tab') || 'people';
    const initialTab = requestedTab === 'alerts' ? 'connections' : requestedTab;
    const unreadByChat = new Map((data.chats.unread || []).map((item) => [String(item._id), Number(item.count || 0)]));
    const totalUnreadChats = Array.from(unreadByChat.values()).reduce((sum, count) => sum + count, 0);
    sessionStorage.removeItem('community_tab');
    root.innerHTML = shell(
      `
      <section class="community-layout">
        <aside class="community-sidebar panel">
          <div class="profile-chip large">
            <img class="avatar" src="${Community.avatar(me)}" alt="" />
            <div>
              <strong>${escapeHtml(me.name || 'Speaker')}</strong>
              <p class="muted">${escapeHtml(me.skillLevel || 'Beginner')} · ${escapeHtml(me.language || 'English')}</p>
            </div>
          </div>
          <div class="mini-stats">
            <div><strong>${data.connections.counts?.followers || 0}</strong><span>Followers</span></div>
            <div><strong>${data.connections.counts?.following || 0}</strong><span>Following</span></div>
            <div><strong>${data.notifications.notifications.filter((n) => !n.read).length}</strong><span>Alerts</span></div>
          </div>
          <h3>Notifications</h3>
          <div class="stack compact">
            ${
              data.notifications.notifications.length
                ? data.notifications.notifications.slice(0, 6).map((item) => `<div class="notice ${item.read ? '' : 'unread'}">${escapeHtml(item.text)}</div>`).join('')
                : '<p class="muted">No notifications yet.</p>'
            }
          </div>
        </aside>
        <main class="community-main grid">
          <section class="panel">
            <div class="section-head">
              <h2>People You Can Practice With</h2>
              <span class="status-pill"><span class="dot live"></span>JWT protected</span>
            </div>
            <div class="suggestion-grid">
              ${
                data.suggestions.suggestions.length
                  ? data.suggestions.suggestions.map(({ user, score }) => userCard(user, score)).join('')
                  : '<p class="muted">Complete your profile goals and interests to get better matches.</p>'
              }
            </div>
          </section>

          <section class="two-col">
            <div class="panel">
              <h2>Connection Requests</h2>
              <div class="stack">
                ${
                  data.connections.incoming.length
                    ? data.connections.incoming.map((item) => requestCard(item)).join('')
                    : '<p class="muted">No pending requests.</p>'
                }
              </div>
            </div>
            <div class="panel">
              <h2>Direct Chat</h2>
              <div class="chat-shell">
                <div class="chat-list">
                  ${
                    data.chats.chats.length
                      ? data.chats.chats.map((chat) => chatRow(chat, me)).join('')
                      : '<p class="muted">Open a chat from a suggestion or connection.</p>'
                  }
                </div>
                <div id="chatMessages" class="message-box"><p class="muted">Select a chat to begin.</p></div>
                <div id="typingIndicator" class="muted"></div>
                <form id="chatForm" class="inline-form">
                  <input id="chatMessageInput" class="input" name="message" placeholder="Type a realtime message" />
                  <button class="btn" type="submit">Send</button>
                </form>
              </div>
            </div>
          </section>

          <section class="two-col">
            <div class="panel">
              <h2>Practice Groups</h2>
              <form id="groupForm" class="grid compact-form">
                <input class="input" name="name" placeholder="Group name" required />
                <input class="input" name="topic" placeholder="Topic" />
                <input class="input" name="description" placeholder="Description" />
                <button class="btn" type="submit">Create group</button>
              </form>
              <div class="suggestion-grid">
                ${data.groups.groups.map((group) => groupCard(group, me)).join('') || '<p class="muted">No groups yet.</p>'}
              </div>
            </div>
            <div class="panel">
              <h2>Group Chat</h2>
              <div id="groupMessages" class="message-box"><p class="muted">Open a group to chat.</p></div>
              <form id="groupChatForm" class="inline-form">
                <input class="input" name="message" placeholder="Message your group" />
                <button class="btn" type="submit">Send</button>
              </form>
            </div>
          </section>

          <section class="panel">
            <div class="section-head">
              <h2>Realtime Practice Rooms</h2>
              <span class="muted">Socket.IO + WebRTC signaling channel</span>
            </div>
            <div class="two-col">
              <form id="roomCreateForm" class="inline-form">
                <input class="input" name="title" placeholder="Room title" />
                <button class="btn" type="submit">Create room</button>
              </form>
              <form id="roomJoinForm" class="inline-form">
                <input class="input" name="code" placeholder="Room code" />
                <button class="btn secondary" type="submit">Join room</button>
              </form>
            </div>
            <div id="roomStatus" class="room-status muted">Create or join a room to start peer practice.</div>
            <div class="room-video-grid">
              <div>
                <span class="muted">You</span>
                <video id="localRoomVideo" autoplay muted playsinline></video>
              </div>
              <div>
                <span class="muted">Peer</span>
                <video id="remoteRoomVideo" autoplay playsinline></video>
              </div>
            </div>
            <div id="roomEvents" class="message-box compact"><p class="muted">Room events will appear here.</p></div>
            <form id="peerFeedbackForm" class="inline-form">
              <input class="input" name="feedback" placeholder="Give peer feedback in realtime" />
              <button class="btn" type="submit">Send feedback</button>
            </form>
          </section>
        </main>
      </section>
      `,
      'community'
    );
    bindShell();
    Community.bind(showToast);
  }

  function userCard(user, score) {
    return `
      <article class="person-card">
        <img class="avatar" src="${Community.avatar(user)}" alt="" />
        <div>
          <h3>${escapeHtml(user.name)}</h3>
          <p class="muted">${escapeHtml(user.skillLevel)} · ${escapeHtml(user.language)}</p>
          <p>${escapeHtml((user.communicationGoals || []).slice(0, 2).join(', ') || 'Communication practice')}</p>
          <span class="status-pill">Match ${score}</span>
        </div>
        <div class="card-actions">
          <button class="btn secondary" data-follow="${user._id}">Follow</button>
          <button class="btn" data-connect="${user._id}">Connect</button>
          <button class="btn secondary" data-chat-user="${user._id}">Chat</button>
        </div>
      </article>
    `;
  }

  function requestCard(item) {
    const user = item.requester;
    return `
      <article class="request-card">
        <img class="avatar tiny" src="${Community.avatar(user)}" alt="" />
        <div><strong>${escapeHtml(user.name)}</strong><p class="muted">wants to practice with you</p></div>
        <button class="btn" data-respond="${item._id}" data-status="accepted">Accept</button>
        <button class="btn secondary" data-respond="${item._id}" data-status="rejected">Reject</button>
      </article>
    `;
  }

  function chatRow(chat, me) {
    const other = chat.participants.find((user) => user._id !== me.id) || chat.participants[0] || {};
    return `
      <button class="chat-row" data-open-chat="${chat._id}">
        <img class="avatar tiny" src="${Community.avatar(other)}" alt="" />
        <span>${escapeHtml(other.name || 'Chat')}</span>
      </button>
    `;
  }

  function groupCard(group, me) {
    const isMember = group.members.some((user) => user._id === me.id);
    return `
      <article class="group-card">
        <h3>${escapeHtml(group.name)}</h3>
        <p class="muted">${escapeHtml(group.topic || 'Practice')}</p>
        <p>${escapeHtml(group.description || 'Practice discussion group')}</p>
        <div class="card-actions">
          <span class="status-pill">${group.members.length} members</span>
          ${
            isMember
              ? `<button class="btn" data-open-group="${group._id}">Open chat</button>`
              : `<button class="btn secondary" data-join-group="${group._id}">Join</button>`
          }
        </div>
      </article>
    `;
  }

  async function renderCommunityV2() {
    const data = await safeLoad(() => Community.load(), {
      suggestions: { suggestions: [] },
      connections: { incoming: [], outgoing: [], accepted: [], counts: {} },
      social: { followers: [], following: [], counts: {} },
      chats: { chats: [], unread: [] },
      groups: { groups: [] },
      notifications: { notifications: [] },
      rooms: { rooms: [] }
    });
    const me = API.getUser() || {};
    const requestedTab = sessionStorage.getItem('community_tab') || 'people';
    const initialTab = requestedTab === 'alerts' ? 'connections' : requestedTab;
   sessionStorage.removeItem('community_tab');
   const unreadByChat = new Map((data.chats.unread || []).map((item) => [String(item._id), Number(item.count || 0)]));
   const totalUnreadChats = Array.from(unreadByChat.values()).reduce((sum, count) => sum + count, 0);
  root.innerHTML = shell(
      `
      <section class="community-layout upgraded-community">
        <aside class="community-sidebar panel">
          <div class="profile-chip large">
            <img class="avatar" src="${Community.avatar(me)}" alt="" />
            <div>
              <strong>${escapeHtml(me.name || 'Speaker')}</strong>
              <p class="muted">${escapeHtml(me.skillLevel || 'Beginner')} - ${escapeHtml(me.language || 'English')}</p>
            </div>
          </div>
          <div class="mini-stats clickable-stats">
            <button type="button" data-social-list="followers"><strong id="followersCount">${data.social.counts?.followers || data.connections.counts?.followers || 0}</strong><span>Followers</span></button>
            <button type="button" data-social-list="following"><strong id="followingCount">${data.social.counts?.following || data.connections.counts?.following || 0}</strong><span>Following</span></button>
            <button type="button" data-community-tab="connections"><strong>${data.connections.incoming.length}</strong><span>Requests</span></button>
          </div>
          <div class="community-tabs">
            ${['people', 'chat', 'groups', 'rooms', 'connections']
              .map((tab) => `<button class="${initialTab === tab ? 'active' : ''}" data-community-tab="${tab}">
                ${tab === 'chat' ? `Chats${totalUnreadChats ? ` <span id="chatUnreadTotal" class="message-count">+${totalUnreadChats} messages</span>` : ''}` : label(tab)}
              </button>`)
              .join('')}
          </div>
          <div class="alert-teaser">
            <strong>Connection hub</strong>
            <p class="muted">Requests are handled from the navbar connection view.</p>
          </div>
        </aside>

        <main class="community-main">
          <section class="panel" data-community-panel="people" ${initialTab === 'people' ? '' : 'hidden'}>
            <div class="section-head">
              <div>
                <h2>People You Can Practice With</h2>
                <p class="muted">Follow speakers, connect with partners, and open realtime chats.</p>
              </div>
              <span class="status-pill"><span class="dot live"></span>Live social graph</span>
            </div>
            <div class="suggestion-grid">
              ${
                data.suggestions.suggestions.length
                  ? data.suggestions.suggestions.map((item) => socialUserCard(item)).join('')
                  : '<p class="muted">Complete your profile goals and interests to get better matches.</p>'
              }
            </div>
          </section>

          <section class="panel" data-community-panel="chat" ${initialTab === 'chat' ? '' : 'hidden'}>
            <div class="section-head">
              <div>
                <h2>Realtime Direct Chat</h2>
                <p class="muted">One-to-one messages with typing indicators and instant delivery.</p>
              </div>
            </div>
            <div class="messenger-layout">
              <aside id="chatList" class="chat-list vertical">
                ${
                  data.chats.chats.length
                    ? data.chats.chats.map((chat) => socialChatRow(chat, me, unreadByChat.get(String(chat._id)) || 0)).join('')
                    : '<p class="muted">Open a chat from a speaker card.</p>'
                }
              </aside>
              <section class="conversation-panel">
                <div class="conversation-head">
                  <div>
                    <strong id="activeChatTitle">Select a chat</strong>
                    <span id="typingIndicator" class="muted"></span>
                  </div>
                  <div class="conversation-actions">
                    <button class="icon-btn" type="button" data-clear-chat title="Clear chat">Clear</button>
                    <button class="icon-btn danger" type="button" data-delete-chat title="Delete chat">Delete</button>
                  </div>
                </div>
                <div id="chatMessages" class="message-box tall"><p class="muted">Select a chat to begin.</p></div>
                <form id="chatForm" class="inline-form composer">
                  <div id="chatReplyPreview" class="reply-preview" hidden></div>
                  <input id="chatMessageInput" class="input" name="message" placeholder="Message..." />
                  <input id="chatAttachmentInput" class="sr-only" name="attachment" type="file" accept="image/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt" />
                  <button class="icon-btn" type="button" data-pick-attachment="chat" title="Share photo or file">File</button>
                  <button class="icon-btn" type="button" data-record-voice="chat" title="Record voice">Voice</button>
                  <span id="chatAttachmentPreview" class="attachment-preview" hidden></span>
                  <button class="btn" type="submit">Send</button>
                </form>
              </section>
            </div>
          </section>

          <section class="panel" data-community-panel="groups" ${initialTab === 'groups' ? '' : 'hidden'}>
            <div class="section-head">
              <div>
                <h2>Practice Groups</h2>
                <p class="muted">Create topic groups and chat with every member in realtime.</p>
              </div>
              <button class="btn" type="button" data-toggle-group-form>Create group</button>
            </div>
            <div class="groups-layout">
              <aside id="groupColumn">
                <form id="groupForm" class="grid compact-form group-create-form" hidden>
                  <input class="input" name="name" placeholder="Group name" required />
                  <input class="input" name="topic" placeholder="Topic" />
                  <input class="input" name="description" placeholder="Description" />
                  <button class="btn" type="submit">Create group</button>
                </form>
                <div id="groupGrid" class="group-list group-scroll">
                  ${data.groups.groups.map((group) => socialGroupCard(group, me)).join('') || '<p class="muted">No groups yet.</p>'}
                </div>
                ${groupInfoPanel(data.groups.groups, me)}
              </aside>
              <section class="conversation-panel">
                <div class="conversation-head">
                  <strong id="activeGroupTitle">Open a group</strong>
                  <div class="conversation-actions">
                    <button class="icon-btn" type="button" data-group-members title="View group members">Members</button>
                    <button class="icon-btn danger" type="button" data-clear-group title="Clear group chat">Clear</button>
                  </div>
                </div>
                <div id="groupMessages" class="message-box tall"><p class="muted">Open a group to chat.</p></div>
                <form id="groupChatForm" class="inline-form composer">
                  <div id="groupReplyPreview" class="reply-preview" hidden></div>
                  <input class="input" name="message" placeholder="Message your group" />
                  <input id="groupAttachmentInput" class="sr-only" name="attachment" type="file" accept="image/*,audio/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt" />
                  <button class="icon-btn" type="button" data-pick-attachment="group" title="Share photo or file">File</button>
                  <button class="icon-btn" type="button" data-record-voice="group" title="Record voice">Voice</button>
                  <span id="groupAttachmentPreview" class="attachment-preview" hidden></span>
                  <button class="btn" type="submit">Send</button>
                </form>
              </section>
            </div>
          </section>

          <section class="panel" data-community-panel="rooms" ${initialTab === 'rooms' ? '' : 'hidden'}>
            <div id="practiceHubEntry" class="practice-hub-entry">
            <div class="practice-hub-head">
              <div>
                <span class="form-eyebrow">Practice Hub</span>
                <h2>Find your speaking partner</h2>
                <p class="muted">Start instantly with a random online student, invite a friend, or join a private session with a code.</p>
              </div>
              <div class="practice-hub-stats">
                <span><strong id="practiceOnlineCount">0</strong><small>Available students</small></span>
                <span><strong id="practiceActiveCount">0</strong><small>Active sessions</small></span>
              </div>
            </div>
            <div class="practice-choice-grid">
              <article class="practice-choice-card random-match-card">
                <span class="choice-icon">&#127919;</span>
                <h3>&#127919; Start Random Practice</h3>
                <p>Get instantly matched with an online student for live video practice.</p>
                <button class="btn" type="button" data-random-practice>Start Practice</button>
                <small id="practiceMatchStatus" class="muted">Ready when you are.</small>
              </article>
              <article class="practice-choice-card">
                <span class="choice-icon">&#128101;</span>
                <h3>&#128101; Practice With Friend</h3>
                <p>Invite a specific student to practice together privately.</p>
                <input id="practiceStudentSearch" class="input" type="search" placeholder="Search online students..." />
              </article>
            </div>
            <form id="roomJoinForm" class="practice-code-form">
              <input class="input" name="code" placeholder="Enter private room code" />
              <button class="btn secondary" type="submit">Join Room</button>
            </form>
            <section class="practice-hub-section">
              <div class="section-head compact-head">
                <h3>Available Students</h3>
                <span class="status-pill"><span class="dot live"></span>Online</span>
              </div>
              <div id="availableStudents" class="available-student-list">
                <p class="muted">Checking who is online...</p>
              </div>
            </section>
            </div>
            <section id="practiceRoomStage" class="practice-room-stage" hidden>
            <div class="practice-room-stage-head">
              <div id="roomStatus" class="room-status muted">Create or join a room to start peer practice.</div>
              <div class="room-controls">
                <button id="muteRoomBtn" class="btn secondary" type="button">Mute</button>
                <button id="cameraRoomBtn" class="btn secondary" type="button">Camera</button>
                <button id="leaveRoomBtn" class="btn danger" type="button">Leave room</button>
              </div>
            </div>
            <div id="roomParticipants" class="room-participants"><span class="muted">Participants will appear here.</span></div>
            <div class="room-video-grid">
              <div>
                <span class="muted">You</span>
                <video id="localRoomVideo" autoplay muted playsinline></video>
              </div>
              <div>
                <span class="muted">Peer</span>
                <video id="remoteRoomVideo" autoplay playsinline></video>
              </div>
            </div>
            <div id="roomAiPanel" class="room-ai-panel">
              <span><strong id="roomFluencyScore">0</strong><small>Fluency</small></span>
              <span><strong id="roomPronunciationScore">0</strong><small>Pronunciation</small></span>
              <span><strong id="roomGrammarScore">0</strong><small>Grammar</small></span>
              <span><strong id="roomFillerCount">0</strong><small>Filler words</small></span>
            </div>
            <div id="roomTranscript" class="message-box compact"><p class="muted">Live transcript and AI feedback will appear here.</p></div>
            <div id="roomEvents" class="message-box compact"><p class="muted">Room events will appear here.</p></div>
            <form id="peerFeedbackForm" class="inline-form">
              <input class="input" name="feedback" placeholder="Give peer feedback in realtime" />
              <button class="btn" type="submit">Send feedback</button>
            </form>
            </section>
          </section>

          <section class="panel" data-community-panel="connections" ${initialTab === 'connections' ? '' : 'hidden'}>
            <div class="section-head">
              <div>
                <h2>Connection Requests</h2>
                <p class="muted">Review every pending request from one place.</p>
              </div>
              <button class="btn secondary" type="button" data-mark-alerts-read>Mark read</button>
            </div>
            <div class="stack connection-request-list">
              ${
                data.connections.incoming.length
                  ? data.connections.incoming.map((item) => requestCard(item)).join('')
                  : '<p class="muted">No pending requests.</p>'
              }
            </div>
            <div id="noticeStack" class="alert-list">
              ${
                data.notifications.notifications.length
                  ? data.notifications.notifications.map((item) => `
                    <article class="alert-item ${item.read ? '' : 'unread'}">
                      <span class="alert-dot"></span>
                      <div>
                        <strong>${escapeHtml(item.type || 'alert').replace(/_/g, ' ')}</strong>
                        <p>${escapeHtml(item.text)}</p>
                        <small class="muted">${new Date(item.createdAt || Date.now()).toLocaleString()}</small>
                      </div>
                      <button class="icon-btn danger" type="button" data-delete-alert="${item._id}" title="Delete alert">Delete</button>
                    </article>
                  `).join('')
                  : '<p class="muted">No alerts yet.</p>'
              }
            </div>
          </section>
        </main>
        <div id="socialModal" class="modal" hidden></div>
      </section>
      `,
      'community'
    );
    bindShell();
    Community.bind(showToast);
  }

  function socialUserCard({ user, score, isFollowing, connectionStatus }) {
    const connectionLabel =
      connectionStatus === 'accepted' ? 'Connected' : connectionStatus === 'pending_sent' ? 'Requested' : connectionStatus === 'pending_received' ? 'Respond' : 'Connect';
    const connectionDisabled = ['accepted', 'pending_sent', 'pending_received'].includes(connectionStatus);
    return `
      <article class="person-card">
        <img class="avatar" src="${Community.avatar(user)}" alt="" />
        <div>
          <h3>${escapeHtml(user.name)}</h3>
          <p class="muted">${escapeHtml(user.skillLevel || 'Beginner')} - ${escapeHtml(user.language || 'English')}</p>
          <p>${escapeHtml((user.communicationGoals || []).slice(0, 2).join(', ') || 'Communication practice')}</p>
          <span class="status-pill">Match ${score}</span>
        </div>
        <div class="card-actions">
          <button class="btn secondary ${isFollowing ? 'is-following' : ''}" data-follow="${user._id}" data-following="${Boolean(isFollowing)}">${isFollowing ? 'Following' : 'Follow'}</button>
          <button class="btn" data-connect="${user._id}" ${connectionDisabled ? 'disabled' : ''}>${connectionLabel}</button>
          <button class="btn secondary" data-chat-user="${user._id}" data-chat-name="${escapeAttr(user.name)}">Chat</button>
        </div>
      </article>
    `;
  }

  function socialChatRow(chat, me, unreadCount = 0) {
    const other = chat.participants.find((user) => user._id !== me.id) || chat.participants[0] || {};
    return `
      <button class="chat-row" data-open-chat="${chat._id}" data-chat-name="${escapeAttr(other.name || 'Chat')}">
        <img class="avatar tiny" src="${Community.avatar(other)}" alt="" />
        <span>${escapeHtml(other.name || 'Chat')}</span>
        <span class="chat-row-meta">
          ${unreadCount ? `<strong class="message-count" data-chat-unread="${chat._id}">+${unreadCount} messages</strong>` : ''}
        </span>
      </button>
    `;
  }

  function groupInfoPanel(groups = [], me = {}) {
    const safeGroups = Array.isArray(groups) ? groups : [];
    const memberIds = new Set();
    safeGroups.forEach((group) => (group.members || []).forEach((member) => memberIds.add(String(member._id || member))));
    const myGroups = safeGroups.filter((group) => (group.members || []).some((member) => String(member._id || member) === String(me.id)));
    const topics = [...new Set(safeGroups.map((group) => group.topic).filter(Boolean))].slice(0, 4);
    const latestGroups = safeGroups.slice(0, 3);
    return `
      <section class="group-info-panel" aria-label="Group information">
        <div class="group-summary-grid">
          <span><strong>${safeGroups.length}</strong><small>Groups</small></span>
          <span><strong>${memberIds.size}</strong><small>Members</small></span>
          <span><strong>${myGroups.length}</strong><small>Joined</small></span>
        </div>
        <div class="group-info-block">
          <strong>Topics</strong>
          <div class="group-topic-list">
            ${topics.length ? topics.map((topic) => `<span>${escapeHtml(topic)}</span>`).join('') : '<small class="muted">Create groups around interview practice, English speaking, GD rounds, or presentations.</small>'}
          </div>
        </div>
        <div class="group-info-block">
          <strong>Recent groups</strong>
          <div class="group-mini-list">
            ${
              latestGroups.length
                ? latestGroups
                    .map(
                      (group) => `
                        <div class="group-mini-item">
                          <span>${escapeHtml(group.name)}</span>
                          <small>${escapeHtml(group.topic || 'Practice')} - ${(group.members || []).length} members</small>
                        </div>
                      `
                    )
                    .join('')
                : '<small class="muted">Group details will appear here after you create or join groups.</small>'
            }
          </div>
        </div>
      </section>
    `;
  }

  function socialGroupCard(group, me) {
    const isMember = group.members.some((user) => user._id === me.id);
    const ownerId = String(group.owner?._id || group.owner || '');
    const isOwner = ownerId === String(me.id);
    return `
      <article class="group-card">
        <div class="group-card-top">
          <h3>${escapeHtml(group.name)}</h3>
          ${isOwner ? '<span class="status-pill owner-pill">Creator</span>' : ''}
        </div>
        <p class="muted">${escapeHtml(group.topic || 'Practice')}</p>
        <p>${escapeHtml(group.description || 'Practice discussion group')}</p>
        <div class="card-actions">
          <span class="status-pill">${group.members.length} members</span>
          ${
            isMember
              ? `<button class="btn" data-open-group="${group._id}" data-group-name="${escapeAttr(group.name)}">Open chat</button>`
              : `<button class="btn secondary" data-join-group="${group._id}">Join</button>`
          }
          ${isOwner ? `<button class="btn danger" data-delete-group="${group._id}" data-group-name="${escapeAttr(group.name)}">Delete</button>` : ''}
        </div>
      </article>
    `;
  }

  function roomCard(room) {
    const count = room.liveCount ?? room.participants?.length ?? 0;
    return `
      <button class="room-card" type="button" data-join-room="${room.code}">
        <strong>${escapeHtml(room.title)}</strong>
        <span class="status-pill">${escapeHtml(room.code)}</span>
        <small>${count} practicing</small>
      </button>
    `;
  }

  routes.community = renderCommunityV2;

  async function renderAdminDashboard() {
    const user = API.getUser() || {};
    if (!user.isAdmin) {
      showToast('Admin access required.');
      return go('dashboard');
    }
    const data = await safeLoad(() => API.request('/api/admin/overview'), {
      stats: {},
      users: [],
      sessions: [],
      groups: [],
      reviews: []
    });
    const adminStats = buildAdminStats(data);
    root.innerHTML = adminShell(
      `
      <section class="admin-hero" id="admin-overview">
        <div>
          <span class="status-pill"><span class="dot live"></span>Live admin console</span>
          <h1>Control center</h1>
          <p class="muted">Monitor learners, practice activity, community groups, and homepage reviews from one operational workspace.</p>
        </div>
        <div class="admin-hero-actions">
          <button class="btn secondary" type="button" data-admin-refresh>Refresh</button>
          <span class="admin-sync">Updated ${new Date().toLocaleTimeString()}</span>
        </div>
      </section>

      <section class="admin-overview-grid">
        ${[
          ['Users', data.stats.users || 0, `${adminStats.activeUsers} active profiles`],
          ['Sessions', data.stats.sessions || 0, `${adminStats.avgConfidence}% avg confidence`],
          ['Groups', data.stats.groups || 0, `${adminStats.groupMembers} total members`],
          ['Reviews', data.stats.reviews || 0, `${adminStats.avgRating} avg rating`]
        ].map(([title, value, detail]) => adminMetricCard(title, value, detail)).join('')}
      </section>

      <section class="admin-command-panel">
        <div class="admin-search">
          <span>Search</span>
          <input class="input" type="search" data-admin-search placeholder="Find users, sessions, groups, reviews..." />
        </div>
        <div class="admin-signal-grid">
          <div>
            <small class="muted">Database status</small>
            <strong>${data.meta?.mode === 'local' ? 'Local store' : 'Connected'}</strong>
          </div>
          <div>
            <small class="muted">Latest session</small>
            <strong>${adminStats.latestSession}</strong>
          </div>
          <div>
            <small class="muted">Review health</small>
            <strong>${adminStats.reviewHealth}</strong>
          </div>
        </div>
      </section>

      <section class="panel admin-section" id="admin-users">
        <div class="section-head">
          <div>
            <h2>Students and Users</h2>
            <p class="muted">Review account details, protect admins, and remove inactive student accounts with their related data.</p>
          </div>
          <span class="admin-count" data-admin-count="users">${data.users.length} shown</span>
        </div>
        <div class="admin-table">${data.users.map(adminUserRow).join('') || adminEmptyState('No users yet.')}</div>
      </section>

      <section class="panel admin-section" id="admin-sessions">
        <div class="section-head">
          <div>
            <h2>Recent Sessions</h2>
            <p class="muted">Inspect practice quality, speech pace, fillers, transcripts, and saved AI coaching suggestions.</p>
          </div>
          <span class="admin-count" data-admin-count="sessions">${data.sessions.length} shown</span>
        </div>
        <div class="admin-table">${data.sessions.map(adminSessionRow).join('') || adminEmptyState('No sessions yet.')}</div>
      </section>

      <section class="panel admin-section" id="admin-groups">
        <div class="section-head">
          <div>
            <h2>Groups</h2>
            <p class="muted">Track community rooms, ownership, member counts, and active speaking topics.</p>
          </div>
          <span class="admin-count" data-admin-count="groups">${data.groups.length} shown</span>
        </div>
        <div class="admin-table">${data.groups.map(adminGroupRow).join('') || adminEmptyState('No groups yet.')}</div>
      </section>

      <section class="panel admin-section" id="admin-reviews">
        <div class="section-head">
          <div>
            <h2>Reviews</h2>
            <p class="muted">Moderate homepage testimonials and keep public proof fresh and trustworthy.</p>
          </div>
          <span class="admin-count" data-admin-count="reviews">${data.reviews.length} shown</span>
        </div>
        <div class="admin-table">${data.reviews.map(adminReviewRowV2).join('') || adminEmptyState('No reviews yet.')}</div>
      </section>

      `,
      'overview'
    );
    bindAdminShell();
  }

  function buildAdminStats(data) {
    const sessions = data.sessions || [];
    const reviews = data.reviews || [];
    const groups = data.groups || [];
    const avgConfidence = sessions.length
      ? Math.round(sessions.reduce((sum, session) => sum + Number(session.confidenceScore || 0), 0) / sessions.length)
      : 0;
    const avgRating = reviews.length
      ? (reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length).toFixed(1)
      : '0.0';
    const activeUsers = (data.users || []).filter((adminUser) => adminUser.email || adminUser.createdAt).length;
    const latestSession = sessions[0]?.createdAt ? new Date(sessions[0].createdAt).toLocaleDateString() : 'No activity';
    const groupMembers = groups.reduce((sum, group) => sum + Number(group.members?.length || 0), 0);
    return {
      activeUsers,
      avgConfidence,
      avgRating,
      groupMembers,
      latestSession,
      reviewHealth: reviews.length ? `${reviews.filter((review) => Number(review.rating || 0) >= 4).length} positive` : 'No reviews'
    };
  }

  function adminMetricCard(title, value, detail) {
    return `
      <article class="metric-card admin-metric-card">
        <span class="muted">${escapeHtml(title)}</span>
        <strong>${escapeHtml(String(value))}</strong>
        <small>${escapeHtml(detail)}</small>
      </article>
    `;
  }

  function adminEmptyState(message) {
    return `<div class="admin-empty"><strong>${escapeHtml(message)}</strong><span class="muted">New activity will appear here automatically after users interact with the app.</span></div>`;
  }

  function adminInitial(name = 'U') {
    return escapeHtml(String(name || 'U').trim().charAt(0).toUpperCase() || 'U');
  }

  function adminUserRow(user) {
    const me = API.getUser() || {};
    const protectedUser = user.email === me.email || user.isAdmin;
    const role = protectedUser ? 'Admin' : 'Student';
    return `<div class="admin-row admin-row-actions" data-admin-row data-admin-type="users" data-admin-search-text="${escapeAttr(`${user.name || ''} ${user.email || ''} ${user.skillLevel || ''} ${user.language || ''}`)}">
      <div class="admin-user-cell">
        <span class="admin-avatar">${adminInitial(user.name || user.email)}</span>
        <div>
          <strong>${escapeHtml(user.name || 'User')}</strong>
          <span>${escapeHtml(user.email || '')}</span>
          <small class="muted">${escapeHtml(user.skillLevel || 'Beginner')} - ${escapeHtml(user.language || 'English')} - Joined ${new Date(user.createdAt || Date.now()).toLocaleDateString()}</small>
        </div>
      </div>
      <div class="admin-row-tools">
        <span class="status-pill">${role}</span>
        <button class="btn danger" type="button" data-admin-delete-user="${user._id}" ${protectedUser ? 'disabled' : ''}>Remove</button>
      </div>
    </div>`;
  }

  function adminSessionRow(session) {
    const fillers = Object.values(session.fillerCounts || {}).reduce((sum, value) => sum + Number(value || 0), 0);
    return `<details class="admin-row admin-detail" data-admin-row data-admin-type="sessions" data-admin-search-text="${escapeAttr(`${session.title || ''} ${session.user?.name || ''} ${session.user?.email || ''} ${session.source || ''} ${session.speedLabel || ''}`)}">
      <summary>
        <div>
          <strong>${escapeHtml(session.title || 'Session')}</strong>
          <span>${escapeHtml(session.user?.name || session.user?.email || 'User')} - ${new Date(session.createdAt || Date.now()).toLocaleString()}</span>
        </div>
        <div class="admin-score-strip">
          <span>${session.confidenceScore || 0}% confidence</span>
          <span>${session.wpm || 0} WPM</span>
        </div>
      </summary>
      <div class="admin-detail-grid">
        <span>Source: <strong>${escapeHtml(session.source || 'live')}</strong></span>
        <span>Confidence: <strong>${session.confidenceScore || 0}%</strong></span>
        <span>WPM: <strong>${session.wpm || 0}</strong></span>
        <span>Speed: <strong>${escapeHtml(session.speedLabel || 'Normal')}</strong></span>
        <span>Eye contact: <strong>${session.eyeContactScore || 0}%</strong></span>
        <span>Fillers: <strong>${fillers}</strong></span>
      </div>
      <p>${escapeHtml((session.suggestions || []).join(' ') || 'No suggestions recorded.')}</p>
      <p class="muted">${escapeHtml((session.transcript || 'No transcript saved.').slice(0, 360))}</p>
    </details>`;
  }

  function adminGroupRow(group) {
    return `<details class="admin-row admin-detail" data-admin-row data-admin-type="groups" data-admin-search-text="${escapeAttr(`${group.name || ''} ${group.topic || ''} ${group.owner?.name || ''}`)}">
      <summary>
        <div>
          <strong>${escapeHtml(group.name || 'Group')}</strong>
          <span>${escapeHtml(group.topic || 'Communication Practice')} - ${group.members?.length || 0} members</span>
        </div>
        <span class="status-pill">${escapeHtml(group.topic || 'Practice')}</span>
      </summary>
      <p>${escapeHtml(group.description || 'No description.')}</p>
      <div class="admin-detail-grid">
        <span>Owner: <strong>${escapeHtml(group.owner?.name || 'Unknown')}</strong></span>
        <span>Created: <strong>${new Date(group.createdAt || Date.now()).toLocaleDateString()}</strong></span>
      </div>
      <div class="admin-member-list">
        ${(group.members || []).map((member) => `<span>${escapeHtml(member.name || member.email || 'Member')}</span>`).join('') || '<span class="muted">No members</span>'}
      </div>
    </details>`;
  }

  function adminReviewRowV2(review) {
    const rating = Math.max(0, Math.min(5, Number(review.rating || 0)));
    return `<div class="admin-row admin-row-actions review-admin-row" data-admin-row data-admin-type="reviews" data-admin-search-text="${escapeAttr(`${review.name || ''} ${review.userId?.email || ''} ${review.comment || ''}`)}">
      <div>
        <strong>${escapeHtml(review.name || 'Student')}</strong>
        <span class="stars">${'&#9733;'.repeat(rating)}${'&#9734;'.repeat(5 - rating)}</span>
        <small class="muted">${escapeHtml(review.userId?.email || 'Verified student')} - ${new Date(review.createdAt || Date.now()).toLocaleString()}</small>
        <p>${escapeHtml(review.comment || '')}</p>
      </div>
      <button class="btn danger" type="button" data-admin-delete-review="${review._id}">Delete</button>
    </div>`;
  }

  function adminReviewRow(review) {
    return `<div class="admin-row admin-row-actions review-admin-row">
      <div>
        <strong>${escapeHtml(review.name || 'Student')}</strong>
        <span class="stars">${'★'.repeat(review.rating || 0)}${'☆'.repeat(5 - Number(review.rating || 0))}</span>
        <small class="muted">${escapeHtml(review.userId?.email || 'Verified student')} - ${new Date(review.createdAt || Date.now()).toLocaleString()}</small>
        <p>${escapeHtml(review.comment || '')}</p>
      </div>
      <button class="btn danger" type="button" data-admin-delete-review="${review._id}">Delete</button>
    </div>`;
  }

  async function renderReviewPage() {
    const data = await safeLoad(() => API.request('/api/reviews/me'), { review: null });
    const review = data.review;
    root.innerHTML = shell(
      `
      <section class="panel review-manager">
        <div class="section-head">
          <div>
            <h2>${review ? 'Your Review' : 'Add Review'}</h2>
            <p class="muted">${review ? 'Update or remove your homepage testimonial.' : 'Share your SpeakFlow AI learning experience.'}</p>
          </div>
          <button class="btn secondary" type="button" data-route="home">Home Page</button>
        </div>
        <div class="review-editor-layout">
          <form id="reviewForm" class="review-form">
            <label class="field">
              <span>Star Rating</span>
              <div class="star-input" role="radiogroup" aria-label="Star rating">
                ${[5, 4, 3, 2, 1].map((value) => `
                  <label>
                    <input type="radio" name="rating" value="${value}" ${Number(review?.rating) === value ? 'checked' : ''} required />
                    <span>★</span>
                  </label>
                `).join('')}
              </div>
            </label>
            <label class="field">
              <span>Comment</span>
              <textarea class="input" name="comment" rows="6" placeholder="Write your review..." required>${escapeHtml(review?.comment || '')}</textarea>
            </label>
            <div class="card-actions">
              <button class="btn" type="submit">${review ? 'Update Review' : 'Submit Review'}</button>
              ${review ? '<button class="btn danger" type="button" id="deleteReviewBtn">Delete Review</button>' : ''}
            </div>
          </form>
          <article class="review-card live-review-preview">
            <div class="review-card-head">
              <div>
                <strong>${escapeHtml(API.getUser()?.name || 'Student')}</strong>
                <small class="muted">${new Date(review?.createdAt || Date.now()).toLocaleDateString()}</small>
              </div>
              <span class="verified-badge">Verified Student</span>
            </div>
            <div id="reviewPreviewStars" class="stars">${'★'.repeat(review?.rating || 5)}${'☆'.repeat(5 - Number(review?.rating || 5))}</div>
            <p id="reviewPreviewText">${escapeHtml(review?.comment || 'Your review preview appears here.')}</p>
          </article>
        </div>
      </section>
      `,
      'add-review'
    );
    bindShell();
    bindReviewForm(Boolean(review));
  }

  function bindReviewForm(hasReview) {
    root.querySelectorAll('[data-route]').forEach((button) => {
      button.addEventListener('click', () => go(button.dataset.route));
    });
    const form = document.getElementById('reviewForm');
    const previewStars = document.getElementById('reviewPreviewStars');
    const previewText = document.getElementById('reviewPreviewText');
    form?.addEventListener('input', () => {
      const rating = Number(new FormData(form).get('rating') || 0);
      const comment = form.elements.comment.value.trim();
      if (previewStars && rating) previewStars.textContent = '★'.repeat(rating) + '☆'.repeat(5 - rating);
      if (previewText) previewText.textContent = comment || 'Your review preview appears here.';
    });
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      const rating = Number(formData.get('rating'));
      const comment = String(formData.get('comment') || '').trim();
      if (!rating) return showToast('Rating is required.');
      if (!comment) return showToast('Review comment is required.');
      try {
        await API.request(hasReview ? '/api/reviews/me' : '/api/reviews', {
          method: hasReview ? 'PATCH' : 'POST',
          body: JSON.stringify({ rating, comment })
        });
        showToast(hasReview ? 'Review updated.' : 'Review submitted.');
        renderReviewPage();
      } catch (error) {
        showToast(error.message);
      }
    });
    document.getElementById('deleteReviewBtn')?.addEventListener('click', async () => {
      if (!confirm('Delete your review?')) return;
      await API.request('/api/reviews/me', { method: 'DELETE' });
      showToast('Review deleted.');
      renderReviewPage();
    });
  }

  async function renderHistory() {
    const data = await safeLoad(() => API.request('/api/sessions'), { sessions: [] });
    root.innerHTML = shell(
      `
      <section class="panel history-panel">
        <div class="section-head">
          <div>
            <h2>Speech history</h2>
            <p class="muted">Saved practice and upload reports. Delete old reports anytime.</p>
          </div>
        </div>
        <div class="grid">
          ${
            data.sessions.length
              ? data.sessions.map(historyCard).join('')
              : '<p class="muted">No saved sessions yet. Start a live practice to create your first report.</p>'
          }
        </div>
      </section>
      `,
      'history'
    );
    bindShell();
    bindHistoryActions();
  }

  function historyCard(session) {
    const fillers = Object.values(session.fillerCounts || {}).reduce((a, b) => a + b, 0);
    return `
      <article class="history-item report-card" data-session-card="${escapeAttr(session._id || session.id || '')}">
        <div class="history-card-head">
          <div>
            <h3>${escapeHtml(session.title || 'Practice session')}</h3>
            <p class="muted">${new Date(session.createdAt).toLocaleString()} · ${escapeHtml(session.source || 'live')}</p>
          </div>
          <button class="btn danger report-delete-btn" type="button" data-delete-session="${escapeAttr(session._id || session.id || '')}">Delete</button>
        </div>
        <div class="two-col">
          <div class="stat-row"><span>Confidence</span><strong>${session.confidenceScore}%</strong></div>
          <div class="stat-row"><span>WPM</span><strong>${session.wpm}</strong></div>
          <div class="stat-row"><span>Fillers</span><strong>${fillers}</strong></div>
          <div class="stat-row"><span>Eye contact</span><strong>${session.eyeContactScore}%</strong></div>
        </div>
        <p>${(session.suggestions || []).join(' ')}</p>
      </article>
    `;
  }

  function bindHistoryActions() {
    root.querySelectorAll('[data-delete-session]').forEach((button) => {
      button.addEventListener('click', async () => {
        const id = button.dataset.deleteSession;
        if (!id || !confirm('Delete this saved report?')) return;
        button.disabled = true;
        button.textContent = 'Deleting...';
        try {
          try {
            await API.request(`/api/sessions/${id}`, { method: 'DELETE' });
          } catch (deleteError) {
            if (!/not found/i.test(deleteError.message || '')) throw deleteError;
            await API.request(`/api/sessions/${id}/delete`, { method: 'POST' });
          }
          showToast('Report deleted.');
          renderHistory();
        } catch (error) {
          button.disabled = false;
          button.textContent = 'Delete';
          showToast(error.message);
        }
      });
    });
  }

  function renderProfile() {
    const user = API.getUser() || {};
    root.innerHTML = shell(
      `
      <section class="profile-layout">
        <aside class="panel profile-preview">
          <img id="profileAvatarPreview" class="avatar hero-avatar" src="${Community.avatar(user)}" alt="" />
          <h2>${escapeHtml(user.name || 'Your profile')}</h2>
          <p class="muted">${escapeHtml(user.bio || 'Add a short speaker bio.')}</p>
          <div class="mini-stats">
            <div><strong>${escapeHtml(user.skillLevel || 'Beginner')}</strong><span>Level</span></div>
            <div><strong>${escapeHtml(user.language || 'English')}</strong><span>Language</span></div>
          </div>
          <button class="btn secondary" data-route="community">View community profile</button>
        </aside>
        <section class="panel">
          <div class="section-head">
            <h2>Update Profile</h2>
            <span class="status-pill">Shown across Community</span>
          </div>
          <form id="profileForm" class="grid">
            <div class="two-col">
              <label class="field"><span>Name</span><input class="input" name="name" value="${escapeHtml(user.name || '')}" /></label>
              <label class="field"><span>Language</span><input class="input" name="language" value="${escapeHtml(user.language || 'English')}" /></label>
            </div>
            <label class="field"><span>Profile photo</span><input class="input" id="profilePhotoInput" name="photo" type="file" accept="image/*" /></label>
            <label class="field"><span>Avatar URL or uploaded photo data</span><input class="input" id="avatarUrlInput" name="avatarUrl" value="${escapeHtml(user.avatarUrl || '')}" /></label>
            <label class="field"><span>Bio</span><textarea name="bio" rows="4" placeholder="Tell practice partners what you are working on">${escapeHtml(user.bio || '')}</textarea></label>
            <div class="two-col">
              <label class="field">
                <span>Skill level</span>
                <select class="input" name="skillLevel">
                  ${['Beginner', 'Intermediate', 'Advanced'].map((level) => `<option ${user.skillLevel === level ? 'selected' : ''}>${level}</option>`).join('')}
                </select>
              </label>
              <label class="field"><span>Communication goals</span><input class="input" name="communicationGoals" value="${escapeHtml((user.communicationGoals || []).join(', '))}" placeholder="Public speaking, interviews" /></label>
            </div>
            <label class="field"><span>Interests</span><input class="input" name="interests" value="${escapeHtml((user.interests || []).join(', '))}" placeholder="Startups, English fluency, GD" /></label>
            <label style="display:flex;align-items:center;gap:10px">
              <input type="checkbox" name="voiceFeedback" ${user.preferences?.voiceFeedback === false ? '' : 'checked'} />
              Voice feedback
            </label>
            <button class="btn" type="submit">Update profile</button>
          </form>
        </section>
      </section>
      `,
      'profile'
    );
    bindShell();
    bindProfilePhotoPreview();
    document.getElementById('profileForm').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      try {
        await Auth.updateProfile({
          name: form.get('name'),
          avatarUrl: form.get('avatarUrl'),
          bio: form.get('bio'),
          language: form.get('language'),
          skillLevel: form.get('skillLevel'),
          communicationGoals: parseTags(form.get('communicationGoals')),
          interests: parseTags(form.get('interests')),
          preferences: { voiceFeedback: form.get('voiceFeedback') === 'on', darkMode: true }
        });
        showToast('Profile updated.');
        renderProfile();
      } catch (error) {
        showToast(error.message);
      }
    });
  }

  function bindProfilePhotoPreview() {
    const input = document.getElementById('profilePhotoInput');
    const avatarInput = document.getElementById('avatarUrlInput');
    const preview = document.getElementById('profileAvatarPreview');
    input?.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        avatarInput.value = reader.result;
        preview.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
    avatarInput?.addEventListener('input', () => {
      if (avatarInput.value.trim()) preview.src = avatarInput.value.trim();
    });
  }

  function bindChatbot() {
    const widget = root.querySelector('.chatbot-widget');
    if (!widget) return;
    const toggle = widget.querySelector('.chatbot-toggle');
    const panel = widget.querySelector('.chatbot-panel');
    const close = widget.querySelector('.chatbot-close');
    const messages = widget.querySelector('[data-chatbot-messages]');
    const form = widget.querySelector('[data-chatbot-form]');

    toggle?.addEventListener('click', () => {
      const willOpen = panel.hidden;
      panel.hidden = !willOpen;
      toggle.setAttribute('aria-expanded', String(willOpen));
      if (willOpen) form?.elements.question?.focus();
    });
    close?.addEventListener('click', () => {
      panel.hidden = true;
      toggle?.setAttribute('aria-expanded', 'false');
    });
    form?.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = form.elements.question;
      const question = input.value.trim();
      if (!question) return;
      appendChatMessage(messages, question, 'user-message');
      input.value = '';
      appendChatMessage(messages, chatbotAnswer(question), 'bot-message');
      messages.scrollTop = messages.scrollHeight;
    });

    root.querySelectorAll('.footer-subscribe').forEach((formElement) => {
      formElement.addEventListener('submit', (event) => {
        event.preventDefault();
        showToast('Thanks. Email updates are enabled for this demo.');
        formElement.reset();
      });
    });
  }

  function appendChatMessage(container, text, className) {
    const item = document.createElement('div');
    item.className = className;
    item.textContent = text;
    container.appendChild(item);
  }

  function chatbotAnswer(question) {
    const text = question.toLowerCase();
    if (text.includes('password') || text.includes('reset') || text.includes('forgot')) {
      return 'Open Login, enter your email, choose Forgot password, then use the generated reset token to set a new password. After reset, SpeakFlow logs you in automatically.';
    }
    if (text.includes('practice') || text.includes('camera') || text.includes('microphone') || text.includes('interview')) {
      return 'Use AI Practice to start webcam, microphone, text-answer, interview, speaking, rapid-fire, and group-discussion coaching. It tracks transcript, fillers, confidence, pace, eye-contact signals, and saves your report.';
    }
    if (text.includes('upload') || text.includes('video')) {
      return 'Use Upload to add a speech video and transcript. SpeakFlow analyzes the speech and saves a report in your history.';
    }
    if (text.includes('report') || text.includes('history') || text.includes('progress') || text.includes('chart')) {
      return 'Dashboard and History show your saved sessions, progress charts, confidence, WPM, filler words, and eye-contact performance over time.';
    }
    if (text.includes('community') || text.includes('group') || text.includes('chat')) {
      return 'Community lets students follow, connect, chat one-to-one, join groups, and practice together in speaking rooms.';
    }
    if (text.includes('admin')) {
      return 'Admins can monitor users, sessions, groups, reviews, live stats, search records, refresh data, and remove student accounts or reviews.';
    }
    if (text.includes('review') || text.includes('testimonial')) {
      return 'Students can add or update a verified review. Admins can manage homepage testimonials from the admin dashboard.';
    }
    return 'SpeakFlow AI helps with public speaking and interviews using live practice, uploads, AI reports, progress analytics, community groups, reviews, admin tools, and password reset.';
  }

  function parseTags(value) {
    return String(value || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function bindShell() {
    root.querySelectorAll('[data-route]').forEach((button) => {
      button.addEventListener('click', () => {
        if (button.dataset.communityTarget) sessionStorage.setItem('community_tab', button.dataset.communityTarget);
        if (button.dataset.communityTarget && window.location.hash.replace('#', '') === button.dataset.route) {
          return (routes[button.dataset.route] || routes.home)();
        }
        go(button.dataset.route);
      });
    });
    const logout = document.getElementById('logoutBtn');
    if (logout) {
      logout.addEventListener('click', () => {
        Practice.stop?.();
        Community.disconnect?.();
        API.clearSession();
        go('login');
      });
    }
    if (!API.getUser()?.isAdmin) {
      Community.connect?.((message) => {
        if (message) showToast(message);
        Community.refreshBadges?.();
      });
      Community.refreshBadges?.();
      Community.flushPendingPracticeInvites?.((message) => {
        if (message) showToast(message);
      });
    }
    bindChatbot();
  }

  function bindAdminShell() {
    root.querySelectorAll('[data-admin-jump]').forEach((button) => {
      button.addEventListener('click', () => {
        root.querySelectorAll('[data-admin-jump]').forEach((item) => item.classList.remove('active'));
        button.classList.add('active');
        const target = button.dataset.adminJump === 'overview' ? document.getElementById('admin-overview') : document.getElementById(`admin-${button.dataset.adminJump}`);
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });

    root.querySelector('[data-admin-refresh]')?.addEventListener('click', () => {
      showToast('Dashboard refreshed.');
      renderAdminDashboard();
    });

    const search = root.querySelector('[data-admin-search]');
    search?.addEventListener('input', () => {
      const query = search.value.trim().toLowerCase();
      const visibleByType = { users: 0, sessions: 0, groups: 0, reviews: 0 };
      root.querySelectorAll('[data-admin-row]').forEach((row) => {
        const text = String(row.dataset.adminSearchText || row.textContent || '').toLowerCase();
        const isVisible = query ? text.includes(query) : true;
        row.hidden = !isVisible;
        if (isVisible && row.dataset.adminType) visibleByType[row.dataset.adminType] = (visibleByType[row.dataset.adminType] || 0) + 1;
      });
      root.querySelectorAll('[data-admin-count]').forEach((count) => {
        const type = count.dataset.adminCount;
        count.textContent = `${visibleByType[type] || 0} shown`;
      });
    });

    root.querySelectorAll('[data-admin-delete-user]').forEach((button) => {
      button.addEventListener('click', async () => {
        const row = button.closest('.admin-row');
        const name = row?.querySelector('strong')?.textContent || 'this user';
        if (!confirm(`Remove ${name} and related data?`)) return;
        button.disabled = true;
        try {
          await API.request(`/api/admin/users/${button.dataset.adminDeleteUser}`, { method: 'DELETE' });
          showToast('User removed.');
          renderAdminDashboard();
        } catch (error) {
          button.disabled = false;
          showToast(error.message);
        }
      });
    });

    root.querySelectorAll('[data-admin-delete-review]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!confirm('Delete this review from the homepage?')) return;
        button.disabled = true;
        try {
          await API.request(`/api/admin/reviews/${button.dataset.adminDeleteReview}`, { method: 'DELETE' });
          showToast('Review deleted.');
          renderAdminDashboard();
        } catch (error) {
          button.disabled = false;
          showToast(error.message);
        }
      });
    });

    const logout = document.getElementById('logoutBtn');
    if (logout) {
      logout.addEventListener('click', () => {
        Community.disconnect?.();
        API.clearSession();
        go('login');
      });
    }
    bindChatbot();
  }

  function bindLanding() {
    root.querySelectorAll('[data-route]').forEach((button) => {
      button.addEventListener('click', () => go(button.dataset.route));
    });
    bindChatbot();
  }

  function animateHero() {
    const samples = [
      { confidence: '86%', speed: 'Normal', fillers: '2', eye: '78%' },
      { confidence: '91%', speed: 'Normal', fillers: '1', eye: '84%' },
      { confidence: '74%', speed: 'Too Fast', fillers: '5', eye: '68%' }
    ];
    let index = 0;
    setInterval(() => {
      if (!document.getElementById('heroConfidence')) return;
      index = (index + 1) % samples.length;
      const sample = samples[index];
      document.getElementById('heroConfidence').textContent = sample.confidence;
      document.getElementById('heroSpeed').textContent = sample.speed;
      document.getElementById('heroFillers').textContent = sample.fillers;
      document.getElementById('heroEye').textContent = sample.eye;
    }, 2200);
  }

  function drawCharts(progress) {
    if (!window.Chart) return;
    progressChart?.destroy();
    fillerChart?.destroy();
    const labels = progress.map((item) => new Date(item.date).toLocaleDateString());
    const chartText = '#c8d4ec';
    const chartGrid = 'rgba(148, 163, 184, 0.12)';
    progressChart = new Chart(document.getElementById('progressChart'), {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Confidence', data: progress.map((item) => item.confidenceScore), borderColor: '#36f2c9', backgroundColor: 'rgba(54, 242, 201, 0.12)', pointBackgroundColor: '#36f2c9', pointBorderColor: '#06111b', pointRadius: 4, borderWidth: 3, tension: 0.35 },
          { label: 'Eye contact', data: progress.map((item) => item.eyeContactScore), borderColor: '#ffb86b', backgroundColor: 'rgba(255, 184, 107, 0.12)', pointBackgroundColor: '#ffb86b', pointBorderColor: '#06111b', pointRadius: 4, borderWidth: 3, tension: 0.35 }
        ]
      },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: chartText, boxWidth: 34, font: { weight: '700' } } } },
        scales: {
          x: { ticks: { color: chartText }, grid: { color: chartGrid } },
          y: { beginAtZero: true, max: 100, ticks: { color: chartText }, grid: { color: chartGrid } }
        }
      }
    });
    fillerChart = new Chart(document.getElementById('fillerChart'), {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Fillers', data: progress.map((item) => item.fillers), backgroundColor: '#ff7a59', borderRadius: 6 }] },
      options: {
        responsive: true,
        plugins: { legend: { labels: { color: chartText, boxWidth: 34, font: { weight: '700' } } } },
        scales: {
          x: { ticks: { color: chartText }, grid: { color: chartGrid } },
          y: { ticks: { color: chartText }, grid: { color: chartGrid } }
        }
      }
    });
  }

  async function safeLoad(loader, fallback) {
    try {
      return await loader();
    } catch (error) {
      showToast(error.message);
      return fallback;
    }
  }

  function escapeHtml(value = '') {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }

  function escapeAttr(value = '') {
    return escapeHtml(value).replace(/"/g, '&quot;');
  }

  function start() {
    window.addEventListener('hashchange', () => (routes[currentRoute()] || routes.home)());
    (routes[currentRoute()] || routes.home)();
  }

  return { start, go, showToast };
})();

document.addEventListener('DOMContentLoaded', App.start);
