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
import { roadmapView } from './roadmapView.js';
import { careerAiAssistant } from './assistant.js';

// Expose store globally for runtime access & testing
window.store = store;
window.__careerAiStore = store;

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
            <input type="text" id="auth-inp-name" placeholder="e.g. Your Name" class="field-input">
          </div>

          <div style="margin-bottom: 10px;">
            <label style="font-size: 0.78rem; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">Email Address</label>
            <input type="email" id="auth-inp-email" placeholder="name@example.com" value="${store.state.resume.candidate?.email || 'you@example.com'}" class="field-input" required>
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
      this.bindGlobalInteractions();
      this.renderSidebarProfile();
      this.renderCurrentView();
      careerAiAssistant.init();

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
    const currentP = store.getCurrentPersona();
    const user = store.state.auth.user;

    // Unified AI interviewer profile
    const activeName = (user && !store.isGuest()) ? user.name : currentP.name;
    const activePlan = (user && !store.isGuest()) ? (user.plan || 'Pro Member') : `${currentP.role}`;
    const activeAvatar = currentP.avatar;

    const nameEl = document.getElementById('sidebar-user-name');
    const planEl = document.getElementById('sidebar-user-plan');
    const avatarEl = document.getElementById('sidebar-user-avatar');
    const authBtnHeader = document.getElementById('header-auth-btn');

    if (nameEl) nameEl.textContent = activeName;
    if (planEl) planEl.textContent = activePlan;
    if (avatarEl) {
      avatarEl.src = activeAvatar;
      avatarEl.alt = activeName;
    }

    // Top-Right Header User Profile & Avatar Pill
    if (authBtnHeader) {
      if (user && !store.isGuest()) {
        authBtnHeader.innerHTML = `
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin-right: 6px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>
          <span style="font-weight: 700; font-size: 0.82rem; color: #0F172A;">Logout</span>
        `;
        authBtnHeader.title = 'Log out of CareerAI';
      } else {
        authBtnHeader.innerHTML = `
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="margin-right: 6px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"></path></svg>
          <span style="font-weight: 700; font-size: 0.82rem; color: var(--primary);">Sign In / Register</span>
        `;
        authBtnHeader.title = 'Sign in or register';
      }
    }

    // Live Dashboard Welcome Hero Card Synchronization
    const dashWelcomeAvatar = document.getElementById('dash-welcome-avatar');
    const dashWelcomeTitle = document.getElementById('dash-welcome-title');
    const dashWelcomeBio = document.getElementById('dash-welcome-bio');
    const dashWelcomeRole = document.getElementById('dash-welcome-role');
    const dashWelcomePlan = document.getElementById('dash-welcome-plan');

    if (dashWelcomeAvatar) {
      dashWelcomeAvatar.src = activeAvatar;
      dashWelcomeAvatar.alt = activeName;
    }
    if (dashWelcomeTitle) {
      dashWelcomeTitle.textContent = `Welcome back, ${activeName}! 👋`;
    }
    if (dashWelcomeBio) {
      dashWelcomeBio.textContent = currentP.bio;
    }
    if (dashWelcomeRole) {
      dashWelcomeRole.textContent = currentP.role;
    }
    if (dashWelcomePlan) {
      dashWelcomePlan.textContent = currentP.plan;
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
        window.openAuthModal('login', 'Sign in to save your sessions and personalize your coaching:');
      } else {
        window.showToast?.('Your profile is already active for resume and interview coaching.', 'info');
      }
    });

    // Top Header Auth Button
    document.getElementById('header-auth-btn')?.addEventListener('click', () => {
      if (store.isGuest()) {
        window.openAuthModal('login');
      } else {
        store.logout();
        window.showToast?.('Logged out successfully. You are back in guest mode.', 'info');
        appController.renderSidebarProfile();
        appController.renderCurrentView();
      }
    });

    // Sidebar Logo
    document.querySelector('.sidebar-logo')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.navigateTo('dashboard');
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
    this.contentBody.classList.remove('view-transition-enter');
    this.contentBody.innerHTML = '';
    requestAnimationFrame(() => this.contentBody?.classList.add('view-transition-enter'));

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
        analyticsView.render(this.contentBody);
        break;
      case 'roadmap':
      case 'my-roadmap':
        roadmapView.render(this.contentBody);
        break;
      default:
        this.renderDashboardOverview(this.contentBody);
        break;
    }
  }

  bindGlobalInteractions() {
    document.addEventListener('pointerdown', (event) => {
      const button = event.target.closest('button');
      if (!button || button.disabled || button.classList.contains('btn-close-modal')) return;

      button.classList.add('is-pressed');
      window.setTimeout(() => button.classList.remove('is-pressed'), 180);

      const rect = button.getBoundingClientRect();
      const ripple = document.createElement('span');
      ripple.className = 'button-ripple';
      ripple.style.left = `${event.clientX - rect.left}px`;
      ripple.style.top = `${event.clientY - rect.top}px`;
      button.appendChild(ripple);
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
    });
  }

  getResumeBuilderState() {
    try {
      const saved = localStorage.getItem('careerai_resume_generator_state');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn('Unable to read resume builder state:', e);
    }

    return {
      form: {
        basic: {
          fullName: '',
          email: '',
          phone: '',
          location: '',
          linkedin: '',
          github: '',
          portfolio: ''
        },
        career: {
          targetRole: '',
          careerObjective: '',
          professionalSummary: '',
          currentCareerStage: 'Working Professional'
        },
        education: [{
          degree: '',
          college: '',
          location: '',
          startYear: '',
          graduationYear: '',
          cgpa: '',
          coursework: ''
        }],
        skills: {
          technicalSkills: [],
          programmingLanguages: [],
          frameworks: [],
          tools: [],
          softSkills: []
        },
        projects: [{
          name: '',
          description: '',
          technologies: '',
          role: '',
          contributions: '',
          projectLink: '',
          githubLink: ''
        }],
        experience: [{
          company: '',
          title: '',
          location: '',
          startDate: '',
          endDate: '',
          responsibilities: '',
          achievements: ''
        }],
        achievements: [{
          title: '',
          detail: ''
        }],
        certifications: [{
          name: '',
          issuer: '',
          date: '',
          url: ''
        }],
        extra: {
          extracurricular: '',
          leadership: '',
          volunteer: '',
          positions: '',
          publications: '',
          languages: '',
          interests: ''
        }
      },
      generated: null
    };
  }

  saveResumeBuilderState(data) {
    try {
      localStorage.setItem('careerai_resume_generator_state', JSON.stringify(data));
    } catch (e) {
      console.warn('Unable to save resume builder state:', e);
    }
  }

  getMultiValueList(list) {
    return Array.isArray(list) ? list.filter(Boolean) : [];
  }

  renderBuilderFieldList(values, placeholder, key, sectionName) {
    const items = this.getMultiValueList(values);
    if (!items.length) items.push('');

    return `
      <div class="resume-generator-list" data-key="${key}" data-section="${sectionName}">
        ${items.map((item, index) => `
          <div class="resume-generator-inline-row" data-index="${index}">
            <input type="text" value="${item}" placeholder="${placeholder}" data-role="list-item" data-key="${key}" data-index="${index}" />
            <button type="button" class="action-pill-btn btn-remove-builder-item" data-key="${key}" data-index="${index}">Remove</button>
          </div>
        `).join('')}
        <button type="button" class="action-pill-btn btn-add-builder-item" data-key="${key}">+ Add</button>
      </div>
    `;
  }

  generateResumeFromBuilder(builder) {
    const info = builder.form;
    const fullName = info.basic.fullName?.trim();
    const summaryText = (info.career.professionalSummary || info.career.careerObjective || '').trim();
    const objectiveText = (info.career.careerObjective || '').trim();
    const skillSections = [
      ['Technical Skills', this.getMultiValueList(info.skills.technicalSkills)],
      ['Programming Languages', this.getMultiValueList(info.skills.programmingLanguages)],
      ['Frameworks / Libraries', this.getMultiValueList(info.skills.frameworks)],
      ['Tools & Technologies', this.getMultiValueList(info.skills.tools)],
      ['Soft Skills', this.getMultiValueList(info.skills.softSkills)]
    ].filter(([, list]) => list.length);

    const educationEntries = this.getMultiValueList(info.education).filter(entry => entry && (entry.degree || entry.college || entry.cgpa || entry.graduationYear));
    const projectEntries = this.getMultiValueList(info.projects).filter(entry => entry && (entry.name || entry.description || entry.role));
    const experienceEntries = this.getMultiValueList(info.experience).filter(entry => entry && (entry.company || entry.title || entry.responsibilities || entry.achievements));
    const achievementEntries = this.getMultiValueList(info.achievements).filter(entry => entry && (entry.title || entry.detail));
    const certificationEntries = this.getMultiValueList(info.certifications).filter(entry => entry && (entry.name || entry.issuer || entry.date));

    const sections = [];

    if (fullName || info.basic.email || info.basic.phone || info.basic.location || info.basic.linkedin || info.basic.github || info.basic.portfolio) {
      const contactParts = [
        info.basic.email,
        info.basic.phone,
        info.basic.location,
        info.basic.linkedin,
        info.basic.github,
        info.basic.portfolio
      ].filter(Boolean);

      sections.push({
        id: 'header',
        title: 'Contact',
        content: `${fullName || 'Professional Candidate'}${contactParts.length ? '\n' + contactParts.join(' | ') : ''}`
      });
    }

    const summaryContent = [objectiveText, summaryText].filter(Boolean).join('\n\n');
    if (summaryContent) {
      sections.push({ id: 'summary', title: 'Professional Summary', content: summaryContent });
    }

    if (educationEntries.length) {
      const educationText = educationEntries.map(entry => {
        const line = [entry.degree, entry.college, entry.location].filter(Boolean).join(' • ');
        const years = [entry.startYear, entry.graduationYear].filter(Boolean).join(' - ');
        const extra = [entry.cgpa ? `CGPA / Percentage: ${entry.cgpa}` : '', entry.coursework ? `Relevant Coursework: ${entry.coursework}` : ''].filter(Boolean).join(' | ');
        return [line, years, extra].filter(Boolean).join('\n');
      }).join('\n\n');

      sections.push({ id: 'education', title: 'Education', content: educationText });
    }

    if (skillSections.length) {
      const skillText = skillSections.map(([label, list]) => `${label}: ${list.join(', ')}`).join('\n');
      sections.push({ id: 'skills', title: 'Skills', content: skillText });
    }

    if (projectEntries.length) {
      const projectText = projectEntries.map(project => {
        const lines = [project.name, project.description, `Technologies: ${project.technologies || 'Not specified'}`, `Role: ${project.role || 'Team Member'}`].filter(Boolean);
        if (project.contributions) lines.push(`Key Contributions: ${project.contributions}`);
        if (project.projectLink) lines.push(`Project Link: ${project.projectLink}`);
        if (project.githubLink) lines.push(`GitHub: ${project.githubLink}`);
        return lines.join('\n');
      }).join('\n\n');
      sections.push({ id: 'projects', title: 'Projects', content: projectText });
    }

    if (experienceEntries.length) {
      const experienceItems = experienceEntries.map(entry => ({
        id: `exp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role: entry.title || 'Professional Experience',
        company: entry.company || 'Organization',
        location: entry.location || '',
        dates: [entry.startDate, entry.endDate].filter(Boolean).join(' - ') || 'Present',
        bullets: [
          ...(entry.responsibilities ? entry.responsibilities.split(/\n|\r|•|;|\./).filter(Boolean).map(item => ({
            id: `resp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            text: item.trim(),
            hasSuggestion: false
          })) : []),
          ...(entry.achievements ? entry.achievements.split(/\n|\r|•|;|\./).filter(Boolean).map(item => ({
            id: `ach-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            text: item.trim(),
            hasSuggestion: false
          })) : [])
        ]
      }));

      sections.push({ id: 'experience', title: 'Experience', items: experienceItems });
    }

    if (achievementEntries.length) {
      const achievementsText = achievementEntries.map(item => [item.title, item.detail].filter(Boolean).join(' — ')).join('\n');
      sections.push({ id: 'achievements', title: 'Achievements', content: achievementsText });
    }

    if (certificationEntries.length) {
      const certText = certificationEntries.map(cert => [cert.name, cert.issuer, cert.date, cert.url].filter(Boolean).join(' • ')).join('\n');
      sections.push({ id: 'certifications', title: 'Certifications', content: certText });
    }

    const extras = [
      ['Extracurricular Activities', info.extra.extracurricular],
      ['Leadership', info.extra.leadership],
      ['Volunteer Experience', info.extra.volunteer],
      ['Positions of Responsibility', info.extra.positions],
      ['Publications', info.extra.publications],
      ['Languages', info.extra.languages],
      ['Interests', info.extra.interests]
    ].filter(([, value]) => value && value.trim());

    if (extras.length) {
      sections.push({
        id: 'extra',
        title: 'Additional Information',
        content: extras.map(([label, value]) => `${label}: ${value}`).join('\n')
      });
    }

    const resume = {
      id: `resume-generated-${Date.now()}`,
      title: fullName || 'Generated Resume',
      targetRole: info.career.targetRole || 'Professional Role',
      candidate: {
        name: fullName || 'Professional Candidate',
        email: info.basic.email || '',
        phone: info.basic.phone || '',
        location: info.basic.location || '',
        linkedin: info.basic.linkedin || '',
        github: info.basic.github || '',
        portfolio: info.basic.portfolio || ''
      },
      sections,
      lastSaved: 'Just now',
      matchScore: 82,
      atsScore: 88,
      keywordAlignment: 84,
      interviewReadiness: 80
    };

    store.state.resume = resume;
    store.state.resumeProfiles = Array.isArray(store.state.resumeProfiles) ? [resume, ...store.state.resumeProfiles.filter(item => item && item.id !== resume.id)] : [resume];
    store.saveState();

    return resume;
  }

  renderDashboardOverview(container) {
    const builderState = this.getResumeBuilderState();
    const generatedResume = builderState.generated || null;
    const hasAnyData = !!(builderState.form.basic.fullName || builderState.form.career.targetRole || builderState.form.career.professionalSummary || builderState.form.education.some(item => Object.values(item).some(Boolean)) || builderState.form.projects.some(item => Object.values(item).some(Boolean)) || builderState.form.experience.some(item => Object.values(item).some(Boolean)) || builderState.form.achievements.some(item => Object.values(item).some(Boolean)) || builderState.form.certifications.some(item => Object.values(item).some(Boolean)) || Object.values(builderState.form.extra).some(Boolean));

    container.innerHTML = `
      <div class="resume-generator-shell">
        <div class="welcome-hero-card" style="padding: 24px 26px; margin-bottom: 18px;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 18px; flex-wrap: wrap;">
            <div>
              <div style="font-size: 0.72rem; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.8);">AI RESUME GENERATOR</div>
              <h2 style="margin: 8px 0 6px 0; font-size: 2rem; font-weight: 800; color: white;">AI Resume Generator</h2>
              <p style="margin: 0; color: rgba(255,255,255,0.9); font-size: 0.96rem;">Build a professional, ATS-friendly resume tailored to your career goals.</p>
            </div>
            <button class="action-pill-btn" id="btn-builder-empty-state" style="background: rgba(255,255,255,0.12); color: white; border-color: rgba(255,255,255,0.35);">${hasAnyData ? 'Update Resume' : 'Build My Resume'}</button>
          </div>
        </div>

        ${!hasAnyData ? `
          <div class="card" style="padding: 28px; text-align: center; margin-bottom: 22px;">
            <div style="font-size: 2.4rem; margin-bottom: 12px;">✦</div>
            <h3 style="margin: 0 0 8px 0; font-size: 1.5rem; color: var(--text-main);">Don't have a resume yet?</h3>
            <p style="margin: 0 0 18px 0; color: var(--text-muted); max-width: 640px; margin-left: auto; margin-right: auto; line-height: 1.6;">Create a professional resume from your career information in a few simple steps.</p>
            <button class="btn-primary" id="btn-open-builder-form">Build My Resume</button>
          </div>
        ` : ''}

        <div class="resume-builder-layout" style="display: grid; grid-template-columns: 1.25fr 0.95fr; gap: 22px; align-items: start;">
          <div class="card" style="padding: 22px;">
            <form id="resume-generator-form" class="resume-generator-form">
              <div class="resume-generator-section">
                <div class="section-card-title">STEP 1 — BASIC INFORMATION</div>
                <div class="resume-generator-grid">
                  <label><span>Full Name</span><input type="text" name="fullName" value="${builderState.form.basic.fullName || ''}" /></label>
                  <label><span>Professional Email</span><input type="email" name="email" value="${builderState.form.basic.email || ''}" /></label>
                  <label><span>Phone Number</span><input type="tel" name="phone" value="${builderState.form.basic.phone || ''}" /></label>
                  <label><span>City / Location</span><input type="text" name="location" value="${builderState.form.basic.location || ''}" /></label>
                  <label><span>LinkedIn URL</span><input type="url" name="linkedin" value="${builderState.form.basic.linkedin || ''}" /></label>
                  <label><span>GitHub URL</span><input type="url" name="github" value="${builderState.form.basic.github || ''}" /></label>
                  <label style="grid-column: 1 / -1;"><span>Portfolio / Personal Website</span><input type="url" name="portfolio" value="${builderState.form.basic.portfolio || ''}" /></label>
                </div>
              </div>

              <div class="resume-generator-section">
                <div class="section-card-title">STEP 2 — CAREER INFORMATION</div>
                <div class="resume-generator-grid">
                  <label><span>Target Job Role</span><input type="text" name="targetRole" value="${builderState.form.career.targetRole || ''}" /></label>
                  <label><span>Current Career Stage</span>
                    <select name="currentCareerStage">
                      ${['Student','Fresher','Working Professional'].map(option => `<option value="${option}" ${builderState.form.career.currentCareerStage === option ? 'selected' : ''}>${option}</option>`).join('')}
                    </select>
                  </label>
                  <label style="grid-column: 1 / -1;"><span>Career Objective</span><textarea name="careerObjective" rows="3">${builderState.form.career.careerObjective || ''}</textarea></label>
                  <label style="grid-column: 1 / -1;"><span>Professional Summary</span><textarea name="professionalSummary" rows="4">${builderState.form.career.professionalSummary || ''}</textarea></label>
                </div>
              </div>

              <div class="resume-generator-section">
                <div class="section-card-title">STEP 3 — EDUCATION</div>
                <div id="education-list" class="resume-generator-dynamic-list">
                  ${(builderState.form.education || [{ degree: '', college: '', location: '', startYear: '', graduationYear: '', cgpa: '', coursework: '' }]).map((entry, index) => `
                    <div class="resume-generator-entry" data-entry-type="education" data-index="${index}">
                      <div class="resume-generator-grid">
                        <label><span>Degree / Course</span><input type="text" name="education-degree-${index}" value="${entry.degree || ''}" /></label>
                        <label><span>College / University</span><input type="text" name="education-college-${index}" value="${entry.college || ''}" /></label>
                        <label><span>Location</span><input type="text" name="education-location-${index}" value="${entry.location || ''}" /></label>
                        <label><span>Start Year</span><input type="text" name="education-start-${index}" value="${entry.startYear || ''}" /></label>
                        <label><span>Graduation Year</span><input type="text" name="education-grad-${index}" value="${entry.graduationYear || ''}" /></label>
                        <label><span>CGPA / Percentage</span><input type="text" name="education-cgpa-${index}" value="${entry.cgpa || ''}" /></label>
                        <label style="grid-column: 1 / -1;"><span>Relevant Coursework (optional)</span><input type="text" name="education-coursework-${index}" value="${entry.coursework || ''}" /></label>
                      </div>
                      <div class="resume-generator-entry-actions"><button type="button" class="action-pill-btn btn-remove-entry" data-entry-type="education" data-index="${index}">Remove</button></div>
                    </div>
                  `).join('')}
                </div>
                <button type="button" class="action-pill-btn btn-add-entry" data-entry-type="education">+ Add Education</button>
              </div>

              <div class="resume-generator-section">
                <div class="section-card-title">STEP 4 — SKILLS</div>
                <div class="resume-generator-grid skills-grid">
                  <div class="skill-column"><label><span>Technical Skills</span>${this.renderBuilderFieldList(builderState.form.skills.technicalSkills, 'e.g. Data Analysis', 'technicalSkills', 'skills')}</label></div>
                  <div class="skill-column"><label><span>Programming Languages</span>${this.renderBuilderFieldList(builderState.form.skills.programmingLanguages, 'e.g. Python', 'programmingLanguages', 'skills')}</label></div>
                  <div class="skill-column"><label><span>Frameworks / Libraries</span>${this.renderBuilderFieldList(builderState.form.skills.frameworks, 'e.g. React', 'frameworks', 'skills')}</label></div>
                  <div class="skill-column"><label><span>Tools & Technologies</span>${this.renderBuilderFieldList(builderState.form.skills.tools, 'e.g. Git', 'tools', 'skills')}</label></div>
                  <div class="skill-column"><label><span>Soft Skills</span>${this.renderBuilderFieldList(builderState.form.skills.softSkills, 'e.g. Communication', 'softSkills', 'skills')}</label></div>
                </div>
              </div>

              <div class="resume-generator-section">
                <div class="section-card-title">STEP 5 — PROJECTS</div>
                <div id="projects-list" class="resume-generator-dynamic-list">
                  ${(builderState.form.projects || [{ name: '', description: '', technologies: '', role: '', contributions: '', projectLink: '', githubLink: '' }]).map((entry, index) => `
                    <div class="resume-generator-entry" data-entry-type="projects" data-index="${index}">
                      <div class="resume-generator-grid">
                        <label><span>Project Name</span><input type="text" name="project-name-${index}" value="${entry.name || ''}" /></label>
                        <label><span>Technologies Used</span><input type="text" name="project-tech-${index}" value="${entry.technologies || ''}" /></label>
                        <label><span>User's Role</span><input type="text" name="project-role-${index}" value="${entry.role || ''}" /></label>
                        <label><span>Project Link</span><input type="url" name="project-link-${index}" value="${entry.projectLink || ''}" /></label>
                        <label><span>GitHub Link</span><input type="url" name="project-github-${index}" value="${entry.githubLink || ''}" /></label>
                        <label style="grid-column: 1 / -1;"><span>Description</span><textarea name="project-description-${index}" rows="3">${entry.description || ''}</textarea></label>
                        <label style="grid-column: 1 / -1;"><span>Key Contributions</span><textarea name="project-contributions-${index}" rows="3">${entry.contributions || ''}</textarea></label>
                      </div>
                      <div class="resume-generator-entry-actions"><button type="button" class="action-pill-btn btn-remove-entry" data-entry-type="projects" data-index="${index}">Remove</button></div>
                    </div>
                  `).join('')}
                </div>
                <button type="button" class="action-pill-btn btn-add-entry" data-entry-type="projects">+ Add Project</button>
              </div>

              <div class="resume-generator-section">
                <div class="section-card-title">STEP 6 — EXPERIENCE</div>
                <div id="experience-list" class="resume-generator-dynamic-list">
                  ${(builderState.form.experience || [{ company: '', title: '', location: '', startDate: '', endDate: '', responsibilities: '', achievements: '' }]).map((entry, index) => `
                    <div class="resume-generator-entry" data-entry-type="experience" data-index="${index}">
                      <div class="resume-generator-grid">
                        <label><span>Company / Organization</span><input type="text" name="exp-company-${index}" value="${entry.company || ''}" /></label>
                        <label><span>Job Title</span><input type="text" name="exp-title-${index}" value="${entry.title || ''}" /></label>
                        <label><span>Location</span><input type="text" name="exp-location-${index}" value="${entry.location || ''}" /></label>
                        <label><span>Start Date</span><input type="text" name="exp-start-${index}" value="${entry.startDate || ''}" /></label>
                        <label><span>End Date</span><input type="text" name="exp-end-${index}" value="${entry.endDate || ''}" /></label>
                        <label style="grid-column: 1 / -1;"><span>Responsibilities</span><textarea name="exp-responsibilities-${index}" rows="3">${entry.responsibilities || ''}</textarea></label>
                        <label style="grid-column: 1 / -1;"><span>Achievements</span><textarea name="exp-achievements-${index}" rows="3">${entry.achievements || ''}</textarea></label>
                      </div>
                      <div class="resume-generator-entry-actions"><button type="button" class="action-pill-btn btn-remove-entry" data-entry-type="experience" data-index="${index}">Remove</button></div>
                    </div>
                  `).join('')}
                </div>
                <button type="button" class="action-pill-btn btn-add-entry" data-entry-type="experience">+ Add Experience</button>
              </div>

              <div class="resume-generator-section">
                <div class="section-card-title">STEP 7 — ACHIEVEMENTS</div>
                <div id="achievements-list" class="resume-generator-dynamic-list">
                  ${(builderState.form.achievements || [{ title: '', detail: '' }]).map((entry, index) => `
                    <div class="resume-generator-entry" data-entry-type="achievements" data-index="${index}">
                      <div class="resume-generator-grid">
                        <label style="grid-column: 1 / -1;"><span>Achievement</span><input type="text" name="achievement-title-${index}" value="${entry.title || ''}" /></label>
                        <label style="grid-column: 1 / -1;"><span>Details</span><textarea name="achievement-detail-${index}" rows="2">${entry.detail || ''}</textarea></label>
                      </div>
                      <div class="resume-generator-entry-actions"><button type="button" class="action-pill-btn btn-remove-entry" data-entry-type="achievements" data-index="${index}">Remove</button></div>
                    </div>
                  `).join('')}
                </div>
                <button type="button" class="action-pill-btn btn-add-entry" data-entry-type="achievements">+ Add Achievement</button>
              </div>

              <div class="resume-generator-section">
                <div class="section-card-title">STEP 8 — CERTIFICATIONS</div>
                <div id="certifications-list" class="resume-generator-dynamic-list">
                  ${(builderState.form.certifications || [{ name: '', issuer: '', date: '', url: '' }]).map((entry, index) => `
                    <div class="resume-generator-entry" data-entry-type="certifications" data-index="${index}">
                      <div class="resume-generator-grid">
                        <label><span>Certification Name</span><input type="text" name="cert-name-${index}" value="${entry.name || ''}" /></label>
                        <label><span>Issuing Organization</span><input type="text" name="cert-issuer-${index}" value="${entry.issuer || ''}" /></label>
                        <label><span>Date</span><input type="text" name="cert-date-${index}" value="${entry.date || ''}" /></label>
                        <label><span>Credential URL (optional)</span><input type="url" name="cert-url-${index}" value="${entry.url || ''}" /></label>
                      </div>
                      <div class="resume-generator-entry-actions"><button type="button" class="action-pill-btn btn-remove-entry" data-entry-type="certifications" data-index="${index}">Remove</button></div>
                    </div>
                  `).join('')}
                </div>
                <button type="button" class="action-pill-btn btn-add-entry" data-entry-type="certifications">+ Add Certification</button>
              </div>

              <div class="resume-generator-section">
                <div class="section-card-title">STEP 9 — EXTRA ACTIVITIES</div>
                <div class="resume-generator-grid">
                  <label><span>Extracurricular Activities</span><textarea name="extracurricular" rows="2">${builderState.form.extra.extracurricular || ''}</textarea></label>
                  <label><span>Leadership</span><textarea name="leadership" rows="2">${builderState.form.extra.leadership || ''}</textarea></label>
                  <label><span>Volunteer Experience</span><textarea name="volunteer" rows="2">${builderState.form.extra.volunteer || ''}</textarea></label>
                  <label><span>Positions of Responsibility</span><textarea name="positions" rows="2">${builderState.form.extra.positions || ''}</textarea></label>
                  <label><span>Publications</span><textarea name="publications" rows="2">${builderState.form.extra.publications || ''}</textarea></label>
                  <label><span>Languages</span><textarea name="languages" rows="2">${builderState.form.extra.languages || ''}</textarea></label>
                  <label style="grid-column: 1 / -1;"><span>Interests</span><textarea name="interests" rows="2">${builderState.form.extra.interests || ''}</textarea></label>
                </div>
              </div>

              <div class="resume-generator-actions" style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 18px;">
                <button type="submit" class="btn-primary">Generate Resume</button>
                <button type="button" class="action-pill-btn" id="btn-builder-regenerate">Regenerate</button>
                <button type="button" class="action-pill-btn" id="btn-builder-edit">Edit Resume</button>
                <button type="button" class="action-pill-btn" id="btn-builder-download">Download PDF</button>
                <button type="button" class="action-pill-btn" id="btn-builder-analysis">Start Resume Analysis</button>
              </div>
            </form>
          </div>

          <div class="card" style="padding: 18px; position: sticky; top: 20px;">
            <div class="section-card-title" style="margin-bottom: 12px;">Resume Preview</div>
            <div class="resume-preview" style="background: #fff; border: 1px solid #E2E8F0; border-radius: 16px; padding: 18px; min-height: 760px;">
              ${generatedResume ? `
                <div class="resume-paper" style="background: transparent; min-height: 0; padding: 0;">
                  <div style="text-align: center; margin-bottom: 12px;">
                    <div style="font-size: 1.8rem; font-weight: 800; color: #0F172A;">${generatedResume.candidate.name}</div>
                    <div style="font-size: 0.82rem; color: #64748B;">${[generatedResume.candidate.email, generatedResume.candidate.phone, generatedResume.candidate.location].filter(Boolean).join(' • ')}</div>
                    <div style="font-size: 0.76rem; color: #64748B;">${[generatedResume.candidate.linkedin, generatedResume.candidate.github, generatedResume.candidate.portfolio].filter(Boolean).join(' • ')}</div>
                  </div>
                  ${generatedResume.sections.map(section => {
                    if (section.id === 'header') return ``;
                    if (section.items) {
                      return `<div style="margin-bottom: 18px;"><div style="font-size: 0.95rem; font-weight: 800; color: var(--primary); border-bottom: 2px solid #EEF2FF; padding-bottom: 4px; margin-bottom: 8px;">${section.title}</div>${section.items.map(item => `<div style="margin-bottom: 12px;"><div style="display: flex; justify-content: space-between; gap: 8px; font-size: 0.86rem; margin-bottom: 4px;"><strong>${item.role}</strong><span style="color: #64748B;">${item.company}</span></div>${item.dates ? `<div style="font-size: 0.72rem; color: #64748B; margin-bottom: 6px;">${item.dates} • ${item.location || ''}</div>` : ''}${item.bullets && item.bullets.length ? `<ul style="margin: 0; padding-left: 18px; font-size: 0.78rem; color: #334155; line-height: 1.5;">${item.bullets.map(b => `<li>${b.text}</li>`).join('')}</ul>` : ''}</div>`).join('')}</div>`;
                    }
                    return `<div style="margin-bottom: 18px;"><div style="font-size: 0.95rem; font-weight: 800; color: var(--primary); border-bottom: 2px solid #EEF2FF; padding-bottom: 4px; margin-bottom: 8px;">${section.title}</div><div style="font-size: 0.8rem; color: #334155; line-height: 1.55; white-space: pre-line;">${section.content || ''}</div></div>`;
                  }).join('')}
                </div>
              ` : `
                <div style="display: flex; align-items: center; justify-content: center; min-height: 240px; color: var(--text-muted); text-align: center; line-height: 1.6;">
                  <div>
                    <div style="font-size: 2rem; margin-bottom: 12px;">📄</div>
                    <div style="font-weight: 700; color: var(--text-main); margin-bottom: 6px;">Resume preview will appear here</div>
                    <div>Generate a resume from your details to see a polished, ATS-friendly layout.</div>
                  </div>
                </div>
              `}
            </div>

            ${generatedResume ? `
              <div style="margin-top: 16px; display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px;">
                <div class="metric-card" style="padding: 12px 14px; min-height: 90px;">
                  <div class="metric-title" style="font-size: 0.7rem;">Resume Quality Score</div>
                  <div class="metric-value" style="font-size: 1.2rem;">${generatedResume.matchScore || 82}%</div>
                </div>
                <div class="metric-card" style="padding: 12px 14px; min-height: 90px;">
                  <div class="metric-title" style="font-size: 0.7rem;">ATS Compatibility</div>
                  <div class="metric-value" style="font-size: 1.2rem;">${generatedResume.atsScore || 88}%</div>
                </div>
                <div class="metric-card" style="padding: 12px 14px; min-height: 90px;">
                  <div class="metric-title" style="font-size: 0.7rem;">Missing Information</div>
                  <div class="metric-value" style="font-size: 0.85rem;">${generatedResume.sections.length >= 2 ? 'Low' : 'Review'}</div>
                </div>
                <div class="metric-card" style="padding: 12px 14px; min-height: 90px;">
                  <div class="metric-title" style="font-size: 0.7rem;">AI-Optimized</div>
                  <div class="metric-value" style="font-size: 1.2rem;">ATS-Friendly</div>
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    this.attachDashboardEvents(container);
  }

  attachDashboardEvents(container) {
    const builderState = this.getResumeBuilderState();

    document.getElementById('btn-open-builder-form')?.addEventListener('click', () => {
      const form = document.getElementById('resume-generator-form');
      form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    document.getElementById('btn-builder-empty-state')?.addEventListener('click', () => {
      const form = document.getElementById('resume-generator-form');
      form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    document.getElementById('resume-generator-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const payload = this.getResumeBuilderState();
      const form = event.currentTarget;

      payload.form.basic.fullName = form.querySelector('input[name="fullName"]').value.trim();
      payload.form.basic.email = form.querySelector('input[name="email"]').value.trim();
      payload.form.basic.phone = form.querySelector('input[name="phone"]').value.trim();
      payload.form.basic.location = form.querySelector('input[name="location"]').value.trim();
      payload.form.basic.linkedin = form.querySelector('input[name="linkedin"]').value.trim();
      payload.form.basic.github = form.querySelector('input[name="github"]').value.trim();
      payload.form.basic.portfolio = form.querySelector('input[name="portfolio"]').value.trim();
      payload.form.career.targetRole = form.querySelector('input[name="targetRole"]').value.trim();
      payload.form.career.careerObjective = form.querySelector('textarea[name="careerObjective"]').value.trim();
      payload.form.career.professionalSummary = form.querySelector('textarea[name="professionalSummary"]').value.trim();
      payload.form.career.currentCareerStage = form.querySelector('select[name="currentCareerStage"]').value;

      payload.form.education = Array.from(document.querySelectorAll('[data-entry-type="education"]')).map((entry, index) => ({
        degree: entry.querySelector('input[name^="education-degree-"]')?.value || '',
        college: entry.querySelector('input[name^="education-college-"]')?.value || '',
        location: entry.querySelector('input[name^="education-location-"]')?.value || '',
        startYear: entry.querySelector('input[name^="education-start-"]')?.value || '',
        graduationYear: entry.querySelector('input[name^="education-grad-"]')?.value || '',
        cgpa: entry.querySelector('input[name^="education-cgpa-"]')?.value || '',
        coursework: entry.querySelector('input[name^="education-coursework-"]')?.value || ''
      }));

      payload.form.skills.technicalSkills = Array.from(document.querySelectorAll('[data-key="technicalSkills"] [data-role="list-item"]')).map(item => item.value.trim()).filter(Boolean);
      payload.form.skills.programmingLanguages = Array.from(document.querySelectorAll('[data-key="programmingLanguages"] [data-role="list-item"]')).map(item => item.value.trim()).filter(Boolean);
      payload.form.skills.frameworks = Array.from(document.querySelectorAll('[data-key="frameworks"] [data-role="list-item"]')).map(item => item.value.trim()).filter(Boolean);
      payload.form.skills.tools = Array.from(document.querySelectorAll('[data-key="tools"] [data-role="list-item"]')).map(item => item.value.trim()).filter(Boolean);
      payload.form.skills.softSkills = Array.from(document.querySelectorAll('[data-key="softSkills"] [data-role="list-item"]')).map(item => item.value.trim()).filter(Boolean);

      payload.form.projects = Array.from(document.querySelectorAll('[data-entry-type="projects"]')).map((entry, index) => ({
        name: entry.querySelector('input[name^="project-name-"]')?.value || '',
        description: entry.querySelector('textarea[name^="project-description-"]')?.value || '',
        technologies: entry.querySelector('input[name^="project-tech-"]')?.value || '',
        role: entry.querySelector('input[name^="project-role-"]')?.value || '',
        contributions: entry.querySelector('textarea[name^="project-contributions-"]')?.value || '',
        projectLink: entry.querySelector('input[name^="project-link-"]')?.value || '',
        githubLink: entry.querySelector('input[name^="project-github-"]')?.value || ''
      }));

      payload.form.experience = Array.from(document.querySelectorAll('[data-entry-type="experience"]')).map((entry) => ({
        company: entry.querySelector('input[name^="exp-company-"]')?.value || '',
        title: entry.querySelector('input[name^="exp-title-"]')?.value || '',
        location: entry.querySelector('input[name^="exp-location-"]')?.value || '',
        startDate: entry.querySelector('input[name^="exp-start-"]')?.value || '',
        endDate: entry.querySelector('input[name^="exp-end-"]')?.value || '',
        responsibilities: entry.querySelector('textarea[name^="exp-responsibilities-"]')?.value || '',
        achievements: entry.querySelector('textarea[name^="exp-achievements-"]')?.value || ''
      }));

      payload.form.achievements = Array.from(document.querySelectorAll('[data-entry-type="achievements"]')).map((entry) => ({
        title: entry.querySelector('input[name^="achievement-title-"]')?.value || '',
        detail: entry.querySelector('textarea[name^="achievement-detail-"]')?.value || ''
      }));

      payload.form.certifications = Array.from(document.querySelectorAll('[data-entry-type="certifications"]')).map((entry) => ({
        name: entry.querySelector('input[name^="cert-name-"]')?.value || '',
        issuer: entry.querySelector('input[name^="cert-issuer-"]')?.value || '',
        date: entry.querySelector('input[name^="cert-date-"]')?.value || '',
        url: entry.querySelector('input[name^="cert-url-"]')?.value || ''
      }));

      payload.form.extra.extracurricular = form.querySelector('textarea[name="extracurricular"]').value.trim();
      payload.form.extra.leadership = form.querySelector('textarea[name="leadership"]').value.trim();
      payload.form.extra.volunteer = form.querySelector('textarea[name="volunteer"]').value.trim();
      payload.form.extra.positions = form.querySelector('textarea[name="positions"]').value.trim();
      payload.form.extra.publications = form.querySelector('textarea[name="publications"]').value.trim();
      payload.form.extra.languages = form.querySelector('textarea[name="languages"]').value.trim();
      payload.form.extra.interests = form.querySelector('textarea[name="interests"]').value.trim();

      this.saveResumeBuilderState(payload);
      payload.generated = this.generateResumeFromBuilder(payload);
      this.saveResumeBuilderState(payload);
      this.renderDashboardOverview(container);
      window.showToast?.('Resume generated successfully.', 'success');
    });

    document.getElementById('btn-builder-regenerate')?.addEventListener('click', () => {
      const payload = this.getResumeBuilderState();
      payload.generated = this.generateResumeFromBuilder(payload);
      this.saveResumeBuilderState(payload);
      this.renderDashboardOverview(container);
      window.showToast?.('Resume regenerated with your latest details.', 'success');
    });

    document.getElementById('btn-builder-edit')?.addEventListener('click', () => {
      const form = document.getElementById('resume-generator-form');
      form?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    document.getElementById('btn-builder-download')?.addEventListener('click', () => {
      window.print();
    });

    document.getElementById('btn-builder-analysis')?.addEventListener('click', () => {
      const payload = this.getResumeBuilderState();
      if (payload.generated) {
        store.state.resume = payload.generated;
        store.saveState();
      }
      this.navigateTo('resume-builder');
    });

    container.querySelectorAll('.btn-add-entry').forEach(button => {
      button.addEventListener('click', () => {
        const entryType = button.getAttribute('data-entry-type');
        const current = this.getResumeBuilderState();
        if (entryType === 'education') current.form.education.push({ degree: '', college: '', location: '', startYear: '', graduationYear: '', cgpa: '', coursework: '' });
        if (entryType === 'projects') current.form.projects.push({ name: '', description: '', technologies: '', role: '', contributions: '', projectLink: '', githubLink: '' });
        if (entryType === 'experience') current.form.experience.push({ company: '', title: '', location: '', startDate: '', endDate: '', responsibilities: '', achievements: '' });
        if (entryType === 'achievements') current.form.achievements.push({ title: '', detail: '' });
        if (entryType === 'certifications') current.form.certifications.push({ name: '', issuer: '', date: '', url: '' });
        this.saveResumeBuilderState(current);
        this.renderDashboardOverview(container);
      });
    });

    container.querySelectorAll('.btn-remove-entry').forEach(button => {
      button.addEventListener('click', () => {
        const entryType = button.getAttribute('data-entry-type');
        const index = Number(button.getAttribute('data-index'));
        const current = this.getResumeBuilderState();
        if (entryType === 'education') current.form.education = current.form.education.filter((_, i) => i !== index);
        if (entryType === 'projects') current.form.projects = current.form.projects.filter((_, i) => i !== index);
        if (entryType === 'experience') current.form.experience = current.form.experience.filter((_, i) => i !== index);
        if (entryType === 'achievements') current.form.achievements = current.form.achievements.filter((_, i) => i !== index);
        if (entryType === 'certifications') current.form.certifications = current.form.certifications.filter((_, i) => i !== index);
        this.saveResumeBuilderState(current);
        this.renderDashboardOverview(container);
      });
    });

    container.querySelectorAll('.btn-add-builder-item').forEach(button => {
      button.addEventListener('click', () => {
        const key = button.getAttribute('data-key');
        const current = this.getResumeBuilderState();
        current.form.skills[key] = [...(current.form.skills[key] || []), ''];
        this.saveResumeBuilderState(current);
        this.renderDashboardOverview(container);
      });
    });

    container.querySelectorAll('.btn-remove-builder-item').forEach(button => {
      button.addEventListener('click', () => {
        const key = button.getAttribute('data-key');
        const index = Number(button.getAttribute('data-index'));
        const current = this.getResumeBuilderState();
        current.form.skills[key] = (current.form.skills[key] || []).filter((_, i) => i !== index);
        this.saveResumeBuilderState(current);
        this.renderDashboardOverview(container);
      });
    });

    container.querySelectorAll('[data-role="list-item"]').forEach(input => {
      input.addEventListener('input', () => {
        const key = input.getAttribute('data-key');
        const index = Number(input.getAttribute('data-index'));
        const current = this.getResumeBuilderState();
        const arr = [...(current.form.skills[key] || [])];
        arr[index] = input.value;
        current.form.skills[key] = arr;
        this.saveResumeBuilderState(current);
      });
    });

    const existingGenerated = builderState.generated;
    if (existingGenerated && document.getElementById('resume-generator-form')) {
      document.getElementById('resume-generator-form').scrollIntoView({ behavior: 'auto', block: 'nearest' });
    }
  }
}

export const appController = new AppController();
window.appController = appController;
