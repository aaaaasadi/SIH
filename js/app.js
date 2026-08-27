/**
 * CareerAI - Main Application Controller & Router (PCE-SW-PS-9 - v2.1)
 * Implements: Global Auth Modal (PRD 13.2), Save-Triggered Signup Prompts (PRD 7.3 & 13.3),
 * Guest Mode State Management & Dynamic Top/Sidebar UI.
 */

import { store, PERSONAS } from './state.js';
import { aiEngine } from './aiEngine.js';
import { resumeLabView } from './resumeLab.js';
import { interviewCoachView } from './interviewCoach.js';
import { analyticsView } from './analyticsView.js';
import { jobTrackerView } from './jobTracker.js';
import { complianceSettingsView } from './compliance.js';

// Global Toast Notification Helper
window.showToast = function(message, type = 'info') {
  const container = document.getElementById('global-toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${message}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
};

// Global Target Job Description Modal Helper
window.openJdModal = function() {
  const modalOverlay = document.getElementById('global-modal-overlay');
  const modalContent = document.getElementById('global-modal-content');
  if (!modalOverlay || !modalContent) return;

  const currentJd = store.state.hasActiveJd && store.state.currentJdKey ? store.state.jobDescriptions[store.state.currentJdKey] : null;

  modalContent.innerHTML = `
    <div class="modal-header">
      <div>
        <h3 style="margin: 0;">Target Job Description</h3>
        <span style="font-size: 0.78rem; color: #64748B;">Add a job description to calibrate match score and unlock AI bullet rewrites.</span>
      </div>
      <button class="btn-close-modal" id="btn-close-jd-modal">&times;</button>
    </div>

    <div style="display: flex; flex-direction: column; gap: 14px;">
      <!-- Quick Presets -->
      <div style="font-size: 0.78rem; color: #475569; font-weight: 600;">
        Quick Role Presets:
        <div style="display: flex; gap: 8px; margin-top: 6px;">
          <button class="action-pill-btn btn-preset-jd-modal" data-title="Senior Product Manager" data-text="Senior Product Manager role requiring 5+ years experience, SQL, A/B Testing, Roadmapping, GTM, and Kubernetes.">Senior Product Manager</button>
          <button class="action-pill-btn btn-preset-jd-modal" data-title="Full Stack Software Engineer" data-text="Software Engineer role requiring TypeScript, Node.js, Python, PostgreSQL, CI/CD, and Docker microservices.">Software Engineer</button>
        </div>
      </div>

      <div>
        <label style="font-size: 0.8rem; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">Job Title / Role</label>
        <input type="text" id="inp-jd-title" value="${currentJd?.title || 'Senior Product Manager'}" style="width: 100%; padding: 8px 12px; border: 1px solid #CBD5E1; border-radius: 6px; font-family: inherit;">
      </div>

      <div>
        <label style="font-size: 0.8rem; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">Paste Job Description or URL</label>
        <textarea id="inp-jd-text" rows="6" style="width: 100%; padding: 10px 12px; border: 1px solid #CBD5E1; border-radius: 6px; font-family: inherit; font-size: 0.85rem;" placeholder="Paste the complete job requirements text or LinkedIn/Indeed posting URL...">${currentJd?.rawText || ''}</textarea>
      </div>

      <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 6px;">
        <button class="action-pill-btn" id="btn-cancel-jd">Cancel</button>
        <button class="btn-primary" id="btn-save-jd">Unlock & Recalibrate →</button>
      </div>
    </div>
  `;

  modalOverlay.classList.add('active');

  document.getElementById('btn-close-jd-modal')?.addEventListener('click', () => modalOverlay.classList.remove('active'));
  document.getElementById('btn-cancel-jd')?.addEventListener('click', () => modalOverlay.classList.remove('active'));

  modalOverlay.querySelectorAll('.btn-preset-jd-modal').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.getElementById('inp-jd-title').value = e.currentTarget.getAttribute('data-title');
      document.getElementById('inp-jd-text').value = e.currentTarget.getAttribute('data-text');
    });
  });

  document.getElementById('btn-save-jd')?.addEventListener('click', () => {
    const title = document.getElementById('inp-jd-title').value.trim() || 'Target Role';
    const rawText = document.getElementById('inp-jd-text').value.trim();
    store.setTargetJobDescription(title, rawText);
    modalOverlay.classList.remove('active');
    window.showToast?.('Target Job Description calibrated! AI Optimization unlocked.', 'success');
    appController.renderCurrentView();
  });
};

// Global Auth Modal Helper (PRD Section 13.2 - Login Screen)
window.openAuthModal = function(initialTab = 'login', notice = '') {
  const modalOverlay = document.getElementById('global-modal-overlay');
  const modalContent = document.getElementById('global-modal-content');
  if (!modalOverlay || !modalContent) return;

  modalContent.innerHTML = `
    <div class="auth-modal-card">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px;">
        <div>
          <div style="font-size: 1.35rem; font-weight: 800; color: var(--text-main); display: flex; align-items: center; gap: 8px;">
            <div class="brand-icon-wrap" style="width: 28px; height: 28px; font-size: 0.9rem;">C</div>
            CareerAI
          </div>
          <span style="font-size: 0.8rem; color: var(--text-muted);">AI-Powered Career & Interview Coach</span>
        </div>
        <button class="btn-close-modal" id="btn-close-auth-modal">&times;</button>
      </div>

      ${notice ? `
        <div class="auth-session-notice">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>
          <span>${notice}</span>
        </div>
      ` : ''}

      <!-- Auth Tab Switcher -->
      <div class="auth-tabs">
        <button class="auth-tab-btn ${initialTab === 'login' ? 'active' : ''}" data-tab="login">Log In</button>
        <button class="auth-tab-btn ${initialTab === 'signup' ? 'active' : ''}" data-tab="signup">Create Account</button>
      </div>

      <!-- Auth Form -->
      <form id="form-auth" onsubmit="return false;">
        <div class="auth-form-fields">
          <div id="signup-name-field" style="display: ${initialTab === 'signup' ? 'block' : 'none'}; margin-bottom: 10px;">
            <label style="font-size: 0.78rem; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">Full Name</label>
            <input type="text" id="auth-inp-name" placeholder="e.g. Priya Sharma" class="field-input">
          </div>

          <div style="margin-bottom: 10px;">
            <label style="font-size: 0.78rem; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">Email Address</label>
            <input type="email" id="auth-inp-email" placeholder="name@example.com" value="${store.state.resume.candidate?.email || 'priya.sharma@email.com'}" class="field-input" required>
          </div>

          <div style="margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <label style="font-size: 0.78rem; font-weight: 700; color: #475569;">Password</label>
              <a href="#" id="link-forgot-pw" style="font-size: 0.75rem; color: var(--primary); text-decoration: none;">Forgot password?</a>
            </div>
            <input type="password" id="auth-inp-pw" placeholder="••••••••" value="password123" class="field-input" required>
          </div>

          <label style="display: flex; align-items: flex-start; gap: 8px; font-size: 0.75rem; color: #64748B; margin-bottom: 14px; cursor: pointer;">
            <input type="checkbox" id="auth-chk-consent" checked style="margin-top: 2px; accent-color: var(--primary);">
            <span>I agree to the <a href="#" style="color: var(--primary);">Terms of Service</a> & <a href="#" style="color: var(--primary);">GDPR/CCPA Privacy Policy</a></span>
          </label>

          <button type="submit" class="btn-primary" id="btn-submit-auth" style="width: 100%; justify-content: center; padding: 10px;">
            ${initialTab === 'signup' ? 'Create Free Account' : 'Log In'}
          </button>
        </div>
      </form>

      <div class="auth-divider">
        <span>or</span>
      </div>

      <!-- OAuth Google Button -->
      <button class="btn-oauth-google" id="btn-auth-google">
        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.97 0 12s.45 3.83 1.25 5.42l4.03-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg>
        Continue with Google
      </button>

      <!-- Prominent "Continue as Guest" Button (PRD Section 7.4 & 13.2) -->
      <button class="btn-continue-guest" id="btn-continue-guest-modal">
        Continue as Guest →
      </button>
    </div>
  `;

  modalOverlay.classList.add('active');

  document.getElementById('btn-close-auth-modal')?.addEventListener('click', () => modalOverlay.classList.remove('active'));

  // Tab switching (Log In vs Sign Up)
  modalOverlay.querySelectorAll('.auth-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      modalOverlay.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      const tab = e.currentTarget.getAttribute('data-tab');
      const nameField = document.getElementById('signup-name-field');
      const submitBtn = document.getElementById('btn-submit-auth');
      if (tab === 'signup') {
        nameField.style.display = 'block';
        submitBtn.textContent = 'Create Free Account';
      } else {
        nameField.style.display = 'none';
        submitBtn.textContent = 'Log In';
      }
    });
  });

  // Submit handler
  document.getElementById('form-auth')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-inp-email').value.trim();
    const pw = document.getElementById('auth-inp-pw').value;
    const name = document.getElementById('auth-inp-name')?.value.trim();
    const isSignup = document.querySelector('.auth-tab-btn.active')?.getAttribute('data-tab') === 'signup';

    if (isSignup) {
      store.signup(email, pw, name);
      window.showToast?.(`Welcome to CareerAI, ${store.state.auth.user.name}! Session progress saved.`, 'success');
    } else {
      store.login(email, pw);
      window.showToast?.(`Welcome back, ${store.state.auth.user.name}!`, 'success');
    }

    modalOverlay.classList.remove('active');
    appController.renderSidebarProfile();
    appController.renderCurrentView();
  });

  // Google OAuth
  document.getElementById('btn-auth-google')?.addEventListener('click', () => {
    store.loginWithGoogle();
    modalOverlay.classList.remove('active');
    window.showToast?.('Signed in with Google! In-progress work preserved.', 'success');
    appController.renderSidebarProfile();
    appController.renderCurrentView();
  });

  // Continue as Guest
  document.getElementById('btn-continue-guest-modal')?.addEventListener('click', () => {
    store.continueAsGuest();
    modalOverlay.classList.remove('active');
    window.showToast?.('Exploring CareerAI in Guest Mode (No login required)', 'info');
    appController.renderSidebarProfile();
    appController.renderCurrentView();
  });

  // Forgot password
  document.getElementById('link-forgot-pw')?.addEventListener('click', (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-inp-email')?.value || 'your email';
    window.showToast?.(`Password reset link sent to ${email}`, 'info');
  });
};

// Global Contextual Save-Triggered Signup Prompt (PRD Section 7.3 & 13.3)
window.openSaveSignupPrompt = function(actionType = 'generic', onDismiss = null, onSuccess = null) {
  const modalOverlay = document.getElementById('global-modal-overlay');
  const modalContent = document.getElementById('global-modal-content');
  if (!modalOverlay || !modalContent) return;

  const copyConfig = {
    upload_resume: {
      title: 'Save your uploaded resume?',
      body: 'Create a free account to save your custom resume profile, track multiple versions, and get personalized ATS feedback next time.',
      cta: 'Sign Up & Save Resume'
    },
    job_tracker: {
      title: 'Start tracking your applications?',
      body: 'Create a free account to add real job cards, set priority tags, and link role-tailored resumes to each application stage.',
      cta: 'Create Free Account'
    },
    end_interview: {
      title: 'Save your interview session?',
      body: 'Sign up to store this feedback report, track your STAR improvement over time, and compare retries across sessions.',
      cta: 'Sign Up & Save Progress'
    },
    rate_limit_interview: {
      title: 'Free Guest Session Completed!',
      body: 'You have completed your 1 free guest mock interview session for today. Create a free account to unlock unlimited practice, role-tailored questions, and speech analytics.',
      cta: 'Sign Up for Unlimited Practice'
    },
    rate_limit_resume: {
      title: 'Free Daily Analysis Limit Reached',
      body: 'You have used your 1 free guest resume analysis. Sign up for free to unlock unlimited AI suggestions, ATS linting, and 1-click bullet point rewrites.',
      cta: 'Unlock Unlimited AI Coach'
    },
    dashboard: {
      title: 'Unlock Your Personal Progress Dashboard',
      body: 'Your historical readiness score and skill breakdown charts will appear here once you create an account and complete your sessions.',
      cta: 'Sign Up Free'
    },
    generic: {
      title: 'Save your progress?',
      body: 'Create a free account to save this session and get personalized suggestions next time.',
      cta: 'Create Free Account'
    }
  };

  const config = copyConfig[actionType] || copyConfig.generic;

  modalContent.innerHTML = `
    <div class="save-prompt-card">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div class="save-icon-badge">💾</div>
          <h3 style="margin: 0; font-size: 1.15rem; color: var(--text-main);">${config.title}</h3>
        </div>
        <button class="btn-close-modal" id="btn-close-save-prompt">&times;</button>
      </div>

      <p style="font-size: 0.86rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 18px;">
        ${config.body}
      </p>

      <div class="auth-session-notice" style="margin-bottom: 18px;">
        <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
        <span>We'll preserve your current in-progress edits and attach them to your new account.</span>
      </div>

      <!-- Dual Equal-Weighted Actions: Sign Up vs Not Now (PRD Section 7.3) -->
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button class="action-pill-btn" id="btn-save-dismiss" style="padding: 9px 16px;">
          Not now
        </button>
        <button class="btn-primary" id="btn-save-signup" style="padding: 9px 18px;">
          ${config.cta} →
        </button>
      </div>
    </div>
  `;

  modalOverlay.classList.add('active');

  document.getElementById('btn-close-save-prompt')?.addEventListener('click', () => {
    modalOverlay.classList.remove('active');
    if (onDismiss) onDismiss();
  });

  document.getElementById('btn-save-dismiss')?.addEventListener('click', () => {
    modalOverlay.classList.remove('active');
    if (onDismiss) onDismiss();
  });

  document.getElementById('btn-save-signup')?.addEventListener('click', () => {
    modalOverlay.classList.remove('active');
    window.openAuthModal('signup', 'Sign up below to preserve your current work:');
    if (onSuccess) onSuccess();
  });
};

class AppController {
  constructor() {
    this.contentBody = null;
    this.currentView = 'dashboard';
    this.init();
  }

  init() {
    const setup = () => {
      this.contentBody = document.getElementById('main-content-body');
      this.bindNavigation();
      this.renderSidebarProfile();
      this.renderCurrentView();

      store.subscribe(() => {
        this.renderSidebarProfile();
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', setup);
    } else {
      setup();
    }
  }

  renderCurrentView() {
    this.navigateTo(this.currentView || 'dashboard');
  }

  renderSidebarProfile() {
    const nameEl = document.getElementById('sidebar-user-name');
    const planEl = document.getElementById('sidebar-user-plan');
    const avatarEl = document.getElementById('sidebar-user-avatar');
    const authBtnHeader = document.getElementById('header-auth-btn');

    if (store.isGuest()) {
      if (nameEl) nameEl.textContent = 'Guest Explorer';
      if (planEl) planEl.textContent = 'Guest Mode';
      if (avatarEl) avatarEl.src = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80';
      if (authBtnHeader) {
        authBtnHeader.innerHTML = `
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>
          Sign In / Register
        `;
      }
    } else {
      const user = store.state.auth.user;
      if (nameEl) nameEl.textContent = user.name;
      if (planEl) planEl.textContent = user.plan || 'Pro Member';
      if (avatarEl) avatarEl.src = user.avatar || PERSONAS.priya.avatar;
      if (authBtnHeader) {
        authBtnHeader.innerHTML = `
          <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10B981; margin-right: 4px;"></span>
          ${user.name.split(' ')[0]}
        `;
      }
    }
  }

  bindNavigation() {
    // Sidebar nav links
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const view = link.getAttribute('data-view');
        if (view) this.navigateTo(view);
      });
    });

    // Top Header Nav Tabs
    document.querySelectorAll('.header-nav-tabs .tab-link').forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.preventDefault();
        const view = tab.getAttribute('data-view');
        if (view) this.navigateTo(view);
      });
    });

    // User Profile click in sidebar
    document.getElementById('user-profile-widget')?.addEventListener('click', () => {
      if (store.isGuest()) {
        window.openAuthModal('login', 'Sign in to save your sessions and customize settings:');
      } else {
        this.navigateTo('settings');
      }
    });

    // Top Header Auth Button
    document.getElementById('header-auth-btn')?.addEventListener('click', () => {
      if (store.isGuest()) {
        window.openAuthModal('login');
      } else {
        this.navigateTo('settings');
      }
    });

    // Sidebar Logo
    document.querySelector('.sidebar-logo')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.navigateTo('dashboard');
    });

    // Upgrade to Pro Button
    document.getElementById('btn-upgrade-pro')?.addEventListener('click', () => {
      window.showToast?.('🚀 You are on the Pro Coach Tier with unlimited AI resume tailoring & mock interviews!', 'success');
    });

    // Help Center Link
    document.getElementById('link-help')?.addEventListener('click', (e) => {
      e.preventDefault();
      window.showToast?.('💡 Tip: Use Resume Lab to analyze your resume against any job description, then start Mock Interviews for adaptive coaching!', 'info');
    });

    // Global Search
    const searchInput = document.getElementById('global-search-input');
    searchInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const q = searchInput.value.trim();
        if (q) {
          window.showToast?.(`Searching for "${q}" across resumes and interview banks...`, 'info');
        }
      }
    });
  }

  navigateTo(viewName) {
    this.currentView = viewName;
    store.setActiveView(viewName);

    // Update Sidebar active state
    document.querySelectorAll('.sidebar .nav-link').forEach(l => {
      l.classList.toggle('active', l.getAttribute('data-view') === viewName);
    });

    // Update Header tab active state
    document.querySelectorAll('.header-nav-tabs .tab-link').forEach(t => {
      t.classList.toggle('active', t.getAttribute('data-view') === viewName);
    });

    // Clear content body
    if (!this.contentBody) return;
    this.contentBody.innerHTML = '';

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Render corresponding view
    switch (viewName) {
      case 'dashboard':
      case 'overview':
        this.renderDashboardOverview(this.contentBody);
        break;
      case 'resume-builder':
      case 'resume-lab':
        resumeLabView.render(this.contentBody);
        break;
      case 'interview-prep':
      case 'mock-interviews':
        interviewCoachView.render(this.contentBody);
        break;
      case 'job-tracker':
      case 'applications':
        jobTrackerView.render(this.contentBody);
        break;
      case 'analytics':
      case 'performance':
      case 'market-trends':
        analyticsView.render(this.contentBody);
        break;
      case 'settings':
        complianceSettingsView.render(this.contentBody);
        break;
      default:
        this.renderDashboardOverview(this.contentBody);
        break;
    }
  }

  /**
   * Render Dashboard Overview (Screenshot 2 / PRD 13.1)
   */
  renderDashboardOverview(container) {
    const state = store.state;
    const isGuest = store.isGuest();
    const displayName = isGuest ? 'Guest' : (state.auth.user?.name.split(' ')[0] || 'Priya');
    const currentJd = state.jobDescriptions[state.currentJdKey] || state.jobDescriptions.swe;

    container.innerHTML = `
      ${isGuest ? `
        <!-- Guest Welcome Banner (Low Friction Entry - PRD Section 7) -->
        <div class="guest-mode-welcome-strip">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span class="guest-badge-pill">👤 Guest Mode</span>
            <span>You are exploring CareerAI. Try out the <strong>Resume Lab</strong> or complete a <strong>Mock Interview</strong> below!</span>
          </div>
          <button class="action-pill-btn" onclick="window.openAuthModal('signup', 'Create a free account to save your progress:')" style="font-size: 0.78rem;">
            Create Free Account
          </button>
        </div>
      ` : ''}

      <!-- Quick Action Controls (PRD Section 13.1) -->
      <div class="dash-quick-actions-bar" style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
        <button class="btn-primary" id="btn-dash-upload-resume" style="padding: 9px 18px; font-weight: 700; display: flex; align-items: center; gap: 6px;">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
          Upload Resume
        </button>
        <button class="action-pill-btn" id="btn-dash-start-interview" style="padding: 9px 18px; font-weight: 600; display: flex; align-items: center; gap: 6px;">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z"></path></svg>
          Start Mock Interview
        </button>
        <button class="action-pill-btn" id="btn-dash-sample-resume" style="padding: 9px 18px; font-weight: 600; display: flex; align-items: center; gap: 6px; background: #F1F5F9; color: var(--text-main);">
          <span>📄</span> Try with Sample Resume
        </button>
      </div>

      <!-- Welcome Banner Card -->
      <div class="welcome-hero-card">
        <div class="welcome-content">
          <h2>Welcome back, ${displayName}! 👋</h2>
          <p>
            ${isGuest 
              ? 'You are viewing sample metrics. Upload your resume or start a personalized mock interview to get tailored real-time AI feedback.' 
              : 'Your resume has been optimized with 94% ATS compatibility. Ready for your next technical interview?'}
          </p>
          <div class="welcome-actions">
            <button class="btn-primary" id="btn-welcome-start-interview">
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              Start AI Mock Session
            </button>
            <button class="action-pill-btn" id="btn-welcome-view-resume">
              View & Edit Resume
            </button>
          </div>
        </div>

        <!-- Circular Score Gauge -->
        <div class="gauge-container">
          <svg class="gauge-svg" viewBox="0 0 100 100">
            <circle class="gauge-bg" cx="50" cy="50" r="40"></circle>
            <circle class="gauge-fill" cx="50" cy="50" r="40"
              stroke-dasharray="251.2"
              stroke-dashoffset="${251.2 - (251.2 * (state.dashboardScores?.resume_score || state.resume?.matchScore || 94)) / 100}">
            </circle>
          </svg>
          <div class="gauge-text">
            <div class="gauge-value">${state.dashboardScores?.resume_score || state.resume?.matchScore || 94}<span>%</span></div>
            <div class="gauge-label">STRENGTH</div>
          </div>
        </div>
      </div>

      <!-- 2. Metric Trio Cards -->
      <div class="metric-trio">
        <!-- ATS Compatibility -->
        <div class="metric-card">
          <div>
            <div class="metric-header">
              <div class="metric-icon-box">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
              </div>
              <span class="metric-title">ATS COMPATIBILITY</span>
            </div>
            <div class="metric-value">
              ${(state.dashboardScores?.ats_score || 94) >= 80 ? 'High' : ((state.dashboardScores?.ats_score || 94) >= 60 ? 'Moderate' : 'Needs Fix')} 
              <span style="font-size: 0.85rem; color: #64748B; font-weight: 500;">(${state.dashboardScores?.ats_score || 94}%)</span>
            </div>
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill ${(state.dashboardScores?.ats_score || 94) >= 80 ? 'primary' : 'warning'}" style="width: ${state.dashboardScores?.ats_score || 94}%;"></div>
          </div>
        </div>

        <!-- Keyword Alignment -->
        <div class="metric-card">
          <div>
            <div class="metric-header">
              <div class="metric-icon-box" style="background: #FFFBEB; color: #D97706;">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"></path></svg>
              </div>
              <span class="metric-title">KEYWORD ALIGNMENT</span>
            </div>
            <div class="metric-value">${state.dashboardScores?.keyword_alignment || 90}%</div>
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill ${(state.dashboardScores?.keyword_alignment || 90) >= 70 ? 'warning' : 'danger'}" style="width: ${state.dashboardScores?.keyword_alignment || 90}%;"></div>
          </div>
        </div>

        <!-- Interview Readiness -->
        <div class="metric-card">
          <div>
            <div class="metric-header">
              <div class="metric-icon-box" style="background: #FEF2F2; color: #DC2626;">
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z"></path></svg>
              </div>
              <span class="metric-title">INTERVIEW READINESS</span>
            </div>
            <div class="metric-value" style="color: #0F172A;">
              ${(state.dashboardScores?.interview_readiness || 88) >= 75 ? 'Ready' : 'Needs Work'}
              <span style="font-size: 0.85rem; color: #64748B; font-weight: 500;">(${state.dashboardScores?.interview_readiness || 88}%)</span>
            </div>
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill ${(state.dashboardScores?.interview_readiness || 88) >= 75 ? 'primary' : 'danger'}" style="width: ${state.dashboardScores?.interview_readiness || 88}%;"></div>
          </div>
        </div>
      </div>

      <!-- 3. Dashboard 2-Column Split Grid -->
      <div class="dashboard-grid">
        <!-- Left: Keyword Match Card -->
        <div class="card">
          <div class="section-card-title">Keyword Match</div>
          <div class="section-card-subtitle">Based on target role: ${currentJd.title}</div>

          <!-- Found in Resume -->
          <div class="keyword-group-title">FOUND IN RESUME</div>
          <div class="tags-container">
            ${(currentJd.keywordsFound || ['Python', 'Java', 'Django', 'AWS', 'Docker']).map(kw => `<span class="tag-pill found">${kw}</span>`).join('')}
          </div>

          <!-- Recommended Additions -->
          <div class="keyword-group-title">RECOMMENDED ADDITIONS</div>
          <div class="tags-container">
            ${(currentJd.keywordsMissing || ['GraphQL', 'Terraform', 'Kafka']).map(kw => `
              <span class="tag-pill recommended btn-dash-add-kw" data-kw="${kw}">
                <span class="add-icon">+</span> ${kw}
              </span>
            `).join('')}
          </div>
        </div>

        <!-- Right: Interview Prep Quick Launch Card -->
        <div class="card">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <div class="section-card-title" style="margin-bottom: 0;">Interview Prep</div>
            <span style="color: #94A3B8; font-weight: 700; cursor: pointer;">•••</span>
          </div>

          <!-- Scheduled Upcoming Session Box -->
          <div class="prep-session-box">
            <div class="prep-info">
              <div class="prep-calendar-icon">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              </div>
              <div>
                <div class="prep-title">Mock Behavioral & Technical Interview</div>
                <div class="prep-time">5 Adaptive Questions • Voice & Video Ready</div>
              </div>
            </div>
            <button class="btn-join" id="btn-dash-join-interview">Start Practice</button>
          </div>

          <!-- Recent Feedback Box with AI Avatar -->
          <div style="font-size: 0.72rem; font-weight: 700; color: #64748B; text-transform: uppercase; margin-bottom: 8px;">COACHING INSIGHT</div>
          <div class="recent-feedback-box">
            <div class="ai-avatar-badge">AI</div>
            <div class="feedback-text">
              ${state.latestAnalysis?.recommendations?.[0] || 'Always anchor answers with the <strong>STAR method</strong> (Situation → Task → Action → Result) with quantified numbers to maximize confidence.'}
            </div>
          </div>
        </div>
      </div>

      <!-- 4. ATS Critical Issues Alert Banner -->
      <div class="ats-alert-card">
        <div class="ats-alert-left">
          <span class="ats-badge-count" style="${(state.latestAnalysis?.ats_issues?.length || 0) === 0 ? 'background: #ECFDF5; color: #047857;' : ''}">
            ${state.latestAnalysis?.ats_issues?.length ? `${state.latestAnalysis.ats_issues.length} Issues` : '✓ 0 Issues'}
          </span>
          <div>
            <div class="ats-alert-title">ATS Health & Formatting</div>
            <div class="ats-alert-desc">
              ${state.latestAnalysis?.ats_issues?.length 
                ? state.latestAnalysis.ats_issues.slice(0, 2).join(' • ') 
                : 'Your resume passes standard ATS parsing algorithms (Standard section headings, single-column flow, quantified impact).'}
            </div>
          </div>
        </div>

        <button class="action-pill-btn" id="btn-review-ats-issues">
          Review in Resume Lab →
        </button>
      </div>
    `;

    this.attachDashboardEvents(container);
  }

  attachDashboardEvents(container) {
    document.getElementById('btn-dash-upload-resume')?.addEventListener('click', () => {
      this.navigateTo('resume-builder');
      setTimeout(() => resumeLabView.openUploadModal(), 100);
    });

    document.getElementById('btn-dash-start-interview')?.addEventListener('click', () => {
      this.navigateTo('interview-prep');
    });

    document.getElementById('btn-welcome-start-interview')?.addEventListener('click', () => {
      this.navigateTo('interview-prep');
    });

    document.getElementById('btn-welcome-view-resume')?.addEventListener('click', () => {
      this.navigateTo('resume-builder');
    });

    document.getElementById('btn-dash-paste-resume')?.addEventListener('click', () => {
      this.navigateTo('resume-builder');
      setTimeout(() => {
        resumeLabView.openUploadModal();
        document.getElementById('tab-paste-btn')?.click();
      }, 100);
    });

    document.getElementById('btn-dash-sample-resume')?.addEventListener('click', () => {
      this.navigateTo('resume-builder');
      setTimeout(() => {
        resumeLabView.openUploadModal();
        document.querySelector('.upload-tab-btn[data-tab="sample"]')?.click();
      }, 100);
    });

    document.getElementById('btn-dash-blank-resume')?.addEventListener('click', () => {
      store.startBlankResume();
      this.navigateTo('resume-builder');
      window.showToast?.('Started new blank resume draft!', 'success');
    });

    document.getElementById('btn-hero-improve-resume')?.addEventListener('click', () => {
      this.navigateTo('resume-builder');
    });

    document.getElementById('btn-hero-quick-interview')?.addEventListener('click', () => {
      this.navigateTo('interview-prep');
    });

    document.getElementById('btn-dash-join-interview')?.addEventListener('click', () => {
      this.navigateTo('interview-prep');
    });

    document.getElementById('btn-review-ats-issues')?.addEventListener('click', () => {
      this.navigateTo('resume-builder');
    });

    container.querySelectorAll('.btn-dash-add-kw').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const kw = e.currentTarget.getAttribute('data-kw');
        store.addSkillToResume(kw);
        window.showToast?.(`Added "${kw}" to resume skills!`, 'success');
        this.renderDashboardOverview(container);
      });
    });
  }
}

export const appController = new AppController();
