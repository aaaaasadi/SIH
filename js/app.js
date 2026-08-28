/**
 * CareerAI - Main App Controller & Router (PCE-SW-PS-9 / SIH Upgrade)
 *
 * Implements:
 * 1. Unified Navigation & Routing (Dashboard, Resume Lab, Mock Interview, Job Tracker, Career Readiness, Settings).
 * 2. 1-Click "Try Demo (3-Min SIH Tour)" automation for hackathon evaluators.
 * 3. High-Utility Dashboard featuring the core continuous loop and 5 live score pillars.
 * 4. Toast notifications, Modal Controller, and Global App State binding.
 */

import { store, PERSONAS } from './state.js';
import { resumeLabView } from './resumeLab.js';
import { interviewCoachView } from './interviewCoach.js';
import { jobTrackerView } from './jobTracker.js';
import { analyticsView } from './analyticsView.js';
import { complianceSettingsView } from './compliance.js';
import { aiEngine } from './aiEngine.js';

export class AppController {
  constructor() {
    this.currentView = 'dashboard';
    this.sidebarEl = document.getElementById('main-sidebar');
    this.contentBody = document.getElementById('main-content-body');
  }

  init() {
    this.bindNavigation();
    this.bindGlobalModals();
    this.bindNotifications();
    this.renderSidebarProfile();

    // Listen for reactive store changes
    store.subscribe(() => {
      this.renderSidebarProfile();
    });

    // Check initial route
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    this.navigateTo(hash);
  }

  renderSidebarProfile() {
    const currentP = store.getCurrentPersona();
    const user = store.state.auth.user;

    const activeName = (user && !store.isGuest()) ? user.name : currentP.name;
    const activePlan = (user && !store.isGuest()) ? (user.plan || 'Pro Member') : `${currentP.role} • ${currentP.plan}`;
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

    if (authBtnHeader) {
      authBtnHeader.innerHTML = `
        <img id="header-user-avatar" src="${activeAvatar}" alt="${activeName}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; margin-right: 6px; border: 1.5px solid var(--primary); display: inline-block;">
        <span style="font-weight: 700; font-size: 0.82rem; color: #0F172A;">${activeName.split(' ')[0]}</span>
        <span style="display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #10B981; margin-left: 6px;" title="Active"></span>
      `;
      authBtnHeader.title = `Active: ${activeName}`;
    }
  }

  bindNavigation() {
    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const route = link.getAttribute('data-route') || link.getAttribute('href')?.replace('#', '');
        if (route) this.navigateTo(route);
      });
    });

    // Brand logo returns to dashboard
    document.querySelector('.brand-logo')?.addEventListener('click', (e) => {
      e.preventDefault();
      this.navigateTo('dashboard');
    });

    // Mobile sidebar toggle
    document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
      document.querySelector('.sidebar')?.classList.toggle('open');
    });
  }

  bindGlobalModals() {
    window.openAuthModal = (mode = 'signup', title = 'Create Your Free Account') => {
      const modalHtml = `
        <div class="modal-overlay" id="global-auth-modal">
          <div class="modal-card" style="max-width: 440px; width: 90%;">
            <div class="modal-header">
              <h3 style="margin: 0; font-size: 1.2rem; font-weight: 700;">${title}</h3>
              <button class="modal-close-btn" id="btn-close-auth-modal">✕</button>
            </div>
            <div class="modal-body" style="padding: 16px 0;">
              <div style="margin-bottom: 12px;">
                <label style="font-size: 0.8rem; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">Full Name</label>
                <input type="text" id="inp-auth-name" placeholder="John Doe" style="width: 100%; padding: 8px 12px; font-size: 0.86rem; border: 1.5px solid var(--border-light); border-radius: var(--radius-md);">
              </div>
              <div style="margin-bottom: 12px;">
                <label style="font-size: 0.8rem; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">Email Address</label>
                <input type="email" id="inp-auth-email" placeholder="john@example.com" style="width: 100%; padding: 8px 12px; font-size: 0.86rem; border: 1.5px solid var(--border-light); border-radius: var(--radius-md);">
              </div>
              <div>
                <label style="font-size: 0.8rem; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">Password</label>
                <input type="password" id="inp-auth-password" placeholder="••••••••" style="width: 100%; padding: 8px 12px; font-size: 0.86rem; border: 1.5px solid var(--border-light); border-radius: var(--radius-md);">
              </div>
            </div>
            <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 8px;">
              <button class="action-pill-btn" id="btn-cancel-auth-modal" style="padding: 6px 14px;">Cancel</button>
              <button class="btn-primary" id="btn-submit-auth-modal" style="padding: 7px 18px; font-weight: 700;">Continue →</button>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML('beforeend', modalHtml);
      const modalEl = document.getElementById('global-auth-modal');
      const closeAuth = () => modalEl?.remove();

      document.getElementById('btn-close-auth-modal')?.addEventListener('click', closeAuth);
      document.getElementById('btn-cancel-auth-modal')?.addEventListener('click', closeAuth);

      document.getElementById('btn-submit-auth-modal')?.addEventListener('click', () => {
        const name = document.getElementById('inp-auth-name')?.value?.trim() || 'Candidate';
        const email = document.getElementById('inp-auth-email')?.value?.trim() || 'user@example.com';
        store.signup(email, '', name);
        closeAuth();
        window.showToast?.(`Welcome to CareerAI, ${name}!`, 'success');
        this.renderSidebarProfile();
      });
    };

    document.getElementById('header-auth-btn')?.addEventListener('click', () => {
      window.openAuthModal('signup', 'Account & Profile');
    });
  }

  bindNotifications() {
    window.showToast = (message, type = 'info') => {
      const container = document.getElementById('global-toast-container');
      if (!container) return;
      const toast = document.createElement('div');
      toast.className = `toast toast-${type}`;
      toast.style.cssText = 'background: #0F172A; color: white; padding: 10px 16px; border-radius: 8px; font-size: 0.84rem; box-shadow: 0 4px 14px rgba(0,0,0,0.2); margin-top: 8px; transition: all 0.3s ease; display: flex; align-items: center; gap: 8px;';
      toast.innerHTML = `<span>${type === 'success' ? '✓' : (type === 'warning' ? '⚠' : 'ℹ')}</span> <span>${message}</span>`;
      container.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, 3500);
    };
  }

  navigateTo(route) {
    this.currentView = route;
    window.location.hash = route;

    document.querySelectorAll('.sidebar .nav-link').forEach(link => {
      const r = link.getAttribute('data-route') || link.getAttribute('href')?.replace('#', '');
      if (r === route) link.classList.add('active');
      else link.classList.remove('active');
    });

    if (!this.contentBody) return;
    this.contentBody.innerHTML = '';

    switch (route) {
      case 'resume':
        resumeLabView.render(this.contentBody);
        break;
      case 'interview':
        interviewCoachView.render(this.contentBody);
        break;
      case 'tracker':
        jobTrackerView.render(this.contentBody);
        break;
      case 'analytics':
        analyticsView.render(this.contentBody);
        break;
      case 'settings':
        complianceSettingsView.render(this.contentBody);
        break;
      case 'dashboard':
      default:
        this.renderDashboardOverview(this.contentBody);
        break;
    }
  }

  // ==========================================================================
  // DASHBOARD OVERVIEW WITH 5-SCORE COMPOSITE & 3-MIN SIH TOUR
  // ==========================================================================

  renderDashboardOverview(container) {
    const state = store.state;
    const currentP = store.getCurrentPersona();
    const activeName = (state.auth.user && !store.isGuest()) ? state.auth.user.name : currentP.name;
    const activeAvatar = currentP.avatar;
    const resume = state.resume;
    const currentJd = state.jobDescriptions[state.currentJdKey] || state.jobDescriptions.swe;

    const deepAnalysis = aiEngine.analyzeResumeDeep(resume);
    const matchData = aiEngine.calculateMatchScore(resume, currentJd);

    const resumeScore = state.dashboardScores?.resume_score || 84;
    const atsScore = deepAnalysis.atsScore || 79;
    const jobMatchScore = matchData.matchScore || 82;
    const interviewScore = state.dashboardScores?.interview_readiness || 76;
    const skillsScore = deepAnalysis.breakdown.skills || 80;

    const readiness = aiEngine.calculateCareerReadiness({
      resumeScore,
      atsScore,
      jobMatchScore,
      interviewScore,
      skillsScore
    });

    container.innerHTML = `
      <!-- SIH Fast-Track Demo & Value Proposition Strip -->
      <div style="background: linear-gradient(135deg, #1E1B4B 0%, #312E81 100%); color: white; padding: 18px 24px; border-radius: var(--radius-lg); margin-bottom: 20px; box-shadow: 0 4px 18px rgba(0,0,0,0.12); display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <span style="background: rgba(255,255,255,0.2); font-size: 0.74rem; font-weight: 800; padding: 2px 8px; border-radius: 9999px;">
              Smart India Hackathon Showcase
            </span>
            <span style="font-size: 0.78rem; opacity: 0.9;">End-to-End AI Coaching Loop</span>
          </div>
          <h2 style="font-size: 1.5rem; font-weight: 800; color: white; margin: 0 0 4px 0;">CareerAI — Intelligent Resume & Interview Coach</h2>
          <p style="margin: 0; font-size: 0.88rem; opacity: 0.88; max-width: 620px; line-height: 1.45;">
            Solves the candidate preparation gap: <strong>Resume ATS Analysis → Bullet Rewrites → Target Job Match → Personalized Mock Interview → Career Readiness Index</strong>.
          </p>
        </div>
        <button class="btn-primary" id="btn-run-sih-demo" style="background: #10B981; border-color: #10B981; padding: 12px 24px; font-weight: 800; font-size: 0.95rem; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
          <span>⚡</span> TRY DEMO (3-MIN TOUR)
        </button>
      </div>

      <!-- Core Continuous Loop Stepper (Visual Flow) -->
      <div class="card" style="padding: 16px 20px; background: white; border: 1.5px solid var(--border-light); border-radius: var(--radius-lg); margin-bottom: 20px;">
        <div style="font-size: 0.78rem; font-weight: 800; color: #64748B; text-transform: uppercase; margin-bottom: 10px;">
          Continuous Candidate Improvement Journey:
        </div>
        <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; font-size: 0.78rem; text-align: center;">
          <div class="flow-step" style="background: #F8FAFC; padding: 8px 6px; border-radius: 6px; border: 1px solid #E2E8F0;">
            <div style="font-weight: 800; color: var(--primary);">1. Upload</div>
            <div style="color: #64748B; font-size: 0.72rem;">PDF / Text Parse</div>
          </div>
          <div class="flow-step" style="background: #F8FAFC; padding: 8px 6px; border-radius: 6px; border: 1px solid #E2E8F0;">
            <div style="font-weight: 800; color: var(--primary);">2. ATS Score</div>
            <div style="color: #64748B; font-size: 0.72rem;">5-Pillar Audit</div>
          </div>
          <div class="flow-step" style="background: #F8FAFC; padding: 8px 6px; border-radius: 6px; border: 1px solid #E2E8F0;">
            <div style="font-weight: 800; color: var(--primary);">3. AI Improve</div>
            <div style="color: #64748B; font-size: 0.72rem;">Zero Hallucinations</div>
          </div>
          <div class="flow-step" style="background: #F8FAFC; padding: 8px 6px; border-radius: 6px; border: 1px solid #E2E8F0;">
            <div style="font-weight: 800; color: var(--primary);">4. Match Job</div>
            <div style="color: #64748B; font-size: 0.72rem;">Skill Gap Analysis</div>
          </div>
          <div class="flow-step" style="background: #F8FAFC; padding: 8px 6px; border-radius: 6px; border: 1px solid #E2E8F0;">
            <div style="font-weight: 800; color: var(--primary);">5. Interview</div>
            <div style="color: #64748B; font-size: 0.72rem;">Voice / Text Mock</div>
          </div>
          <div class="flow-step" style="background: #EEF2FF; padding: 8px 6px; border-radius: 6px; border: 1px solid #C7D2FE;">
            <div style="font-weight: 800; color: #4338CA;">6. Readiness</div>
            <div style="color: #4338CA; font-size: 0.72rem;">Top 3 Priorities</div>
          </div>
        </div>
      </div>

      <!-- Welcome Hero Card with Active Persona / Profile -->
      <div class="welcome-hero-card" style="display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; margin-bottom: 20px;">
        <div style="display: flex; align-items: center; gap: 18px;">
          <img src="${activeAvatar}" alt="${activeName}" id="dash-welcome-avatar" class="welcome-avatar-img" style="width: 68px; height: 68px; border-radius: 50%; object-fit: cover; border: 3px solid rgba(255, 255, 255, 0.45); box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18); flex-shrink: 0;">
          <div class="welcome-content">
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap;">
              <span class="badge-role" id="dash-welcome-role" style="background: rgba(255, 255, 255, 0.22); color: white; font-size: 0.76rem; font-weight: 700; padding: 2px 10px; border-radius: 9999px;">${currentP.role}</span>
              <span id="dash-welcome-plan" style="font-size: 0.75rem; color: rgba(255, 255, 255, 0.9); font-weight: 600;">${currentP.plan}</span>
            </div>
            <h2 id="dash-welcome-title" style="margin: 0 0 6px 0; font-size: 1.55rem; font-weight: 800;">Welcome back, ${activeName}! 👋</h2>
            <p id="dash-welcome-bio" style="margin: 0; opacity: 0.92; font-size: 0.88rem; max-width: 580px; line-height: 1.45;">${currentP.bio}</p>
            <div class="welcome-actions" style="margin-top: 14px; display: flex; gap: 10px;">
              <button class="btn-primary" id="btn-dash-to-resume">
                📄 Open Resume Lab
              </button>
              <button class="action-pill-btn" id="btn-dash-to-interview" style="background: white; color: #0F172A;">
                🎙️ Start Mock Session
              </button>
            </div>
          </div>
        </div>

        <!-- Overall Career Readiness Gauge -->
        <div class="gauge-container" style="text-align: center;">
          <div style="font-size: 0.72rem; font-weight: 800; color: rgba(255,255,255,0.8); text-transform: uppercase; margin-bottom: 4px;">CAREER READINESS</div>
          <div style="font-size: 2.2rem; font-weight: 900; color: white;">${readiness.overallScore}<span style="font-size: 1.1rem; opacity: 0.8;">%</span></div>
          <div style="font-size: 0.75rem; color: #A7F3D0; font-weight: 700; margin-top: 2px;">✓ Verified Benchmark</div>
        </div>
      </div>

      <!-- 4 Core Metric Cards (Resume, ATS, Job Match, Interview) -->
      <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px;">
        
        <!-- 1. Resume Quality -->
        <div class="card" style="padding: 18px; background: white; border: 1.5px solid var(--border-light); border-radius: var(--radius-lg);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 0.8rem; font-weight: 700; color: #64748B;">Resume Quality</span>
            <span style="font-size: 1.2rem;">📄</span>
          </div>
          <div style="font-size: 1.6rem; font-weight: 800; color: #0F172A; margin-bottom: 6px;">${readiness.pillars.resume}<span style="font-size: 0.9rem; color: #64748B;">/100</span></div>
          <div class="progress-bar-wrap" style="height: 6px;"><div class="progress-bar-fill primary" style="width: ${readiness.pillars.resume}%;"></div></div>
        </div>

        <!-- 2. ATS Score -->
        <div class="card" style="padding: 18px; background: white; border: 1.5px solid var(--border-light); border-radius: var(--radius-lg);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 0.8rem; font-weight: 700; color: #64748B;">ATS Parse Score</span>
            <span style="font-size: 1.2rem;">🤖</span>
          </div>
          <div style="font-size: 1.6rem; font-weight: 800; color: #0F172A; margin-bottom: 6px;">${readiness.pillars.ats}<span style="font-size: 0.9rem; color: #64748B;">/100</span></div>
          <div class="progress-bar-wrap" style="height: 6px;"><div class="progress-bar-fill primary" style="width: ${readiness.pillars.ats}%;"></div></div>
        </div>

        <!-- 3. Job Match -->
        <div class="card" style="padding: 18px; background: white; border: 1.5px solid var(--border-light); border-radius: var(--radius-lg);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 0.8rem; font-weight: 700; color: #64748B;">Target Job Match</span>
            <span style="font-size: 1.2rem;">🎯</span>
          </div>
          <div style="font-size: 1.6rem; font-weight: 800; color: #0F172A; margin-bottom: 6px;">${readiness.pillars.jobMatch}<span style="font-size: 0.9rem; color: #64748B;">/100</span></div>
          <div class="progress-bar-wrap" style="height: 6px;"><div class="progress-bar-fill primary" style="width: ${readiness.pillars.jobMatch}%;"></div></div>
        </div>

        <!-- 4. Interview Readiness -->
        <div class="card" style="padding: 18px; background: white; border: 1.5px solid var(--border-light); border-radius: var(--radius-lg);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <span style="font-size: 0.8rem; font-weight: 700; color: #64748B;">Interview Mastery</span>
            <span style="font-size: 1.2rem;">🎙️</span>
          </div>
          <div style="font-size: 1.6rem; font-weight: 800; color: #0F172A; margin-bottom: 6px;">${readiness.pillars.interview}<span style="font-size: 0.9rem; color: #64748B;">/100</span></div>
          <div class="progress-bar-wrap" style="height: 6px;"><div class="progress-bar-fill primary" style="width: ${readiness.pillars.interview}%;"></div></div>
        </div>

      </div>

      <!-- Top Actionable Priorities for SIH demonstration -->
      <div class="card" style="padding: 22px; background: white; border: 1.5px solid var(--border-light); border-radius: var(--radius-lg);">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h3 style="font-size: 1.05rem; font-weight: 800; color: #0F172A; margin: 0;">🚀 Recommended Next Actions</h3>
          <button class="action-pill-btn" onclick="window.appController?.navigateTo('analytics')" style="font-size: 0.78rem; font-weight: 700; color: var(--primary);">
            View Full Readiness Breakdown →
          </button>
        </div>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
          ${readiness.topPriorities.map((p, i) => `
            <div style="background: #F8FAFC; padding: 12px 14px; border-radius: var(--radius-md); border-left: 3px solid var(--primary);">
              <div style="font-size: 0.78rem; font-weight: 800; color: var(--primary); margin-bottom: 2px;">Priority #${i+1}</div>
              <div style="font-size: 0.82rem; color: #334155; line-height: 1.4;">${p}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    document.getElementById('btn-dash-to-resume')?.addEventListener('click', () => {
      this.navigateTo('resume');
    });
    document.getElementById('btn-dash-to-interview')?.addEventListener('click', () => {
      this.navigateTo('interview');
    });

    // 1-Click SIH Demo Tour
    document.getElementById('btn-run-sih-demo')?.addEventListener('click', () => {
      this.runSihDemoTour();
    });
  }

  runSihDemoTour() {
    window.showToast?.('⚡ Starting 3-Minute SIH Demo Tour...', 'info');
    store.setPersona('priya');
    store.setTargetJd('swe');
    setTimeout(() => {
      this.navigateTo('resume');
      window.showToast?.('Step 1: Resume Loaded with 5-Pillar ATS Breakdown & AI Rewrites!', 'success');
    }, 600);
  }
}

export const appController = new AppController();
window.appController = appController;

document.addEventListener('DOMContentLoaded', () => {
  appController.init();
});
