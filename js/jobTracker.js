/**
 * CareerAI - Job Application Kanban Board Controller (PCE-SW-PS-9 - v2.1)
 * Matches Screenshot 4 & PRD Section 7.2 (Isolated Static Demo Board for Guests, Save-Triggered Signup Prompts)
 */

import { store, DEMO_JOB_APPLICATIONS } from './state.js';

export class JobTrackerView {
  constructor() {
    this.container = null;
  }

  render(container) {
    this.container = container;
    const isGuest = store.isGuest();
    
    // PRD Section 7.2: Guests see isolated read-only sample cards; signed-in users see private board
    const apps = isGuest ? DEMO_JOB_APPLICATIONS : (store.state.applications || []);

    const wishlistApps = apps.filter(a => a.stage === 'wishlist');
    const appliedApps = apps.filter(a => a.stage === 'applied');
    const interviewingApps = apps.filter(a => a.stage === 'interviewing');
    const offerApps = apps.filter(a => a.stage === 'offer');
    const activeApps = appliedApps.length + interviewingApps.length;

    container.innerHTML = `
      ${isGuest ? `
        <!-- Demo Board Banner (PRD Section 7.2 & 7.3) -->
        <div class="demo-board-banner">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.2rem;">📌</span>
            <div>
              <strong>Sample Demo Board:</strong>
              <span style="color: #475569;"> Preview how CareerAI tracks application stages, recruiter screenings, and tailored resumes.</span>
            </div>
          </div>
          <button class="btn-primary" id="btn-demo-board-signup" style="font-size: 0.76rem; padding: 5px 12px;">
            Sign Up to Track Applications →
          </button>
        </div>
      ` : ''}

      <div class="job-tracker-header">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <h2 style="font-size: 1.65rem; font-weight: 700; color: var(--text-main); margin: 0;">Job Tracker</h2>
            ${isGuest ? `<span class="guest-badge-pill">Demo Mode</span>` : ''}
          </div>
          <p style="color: var(--text-muted); font-size: 0.95rem; margin-top: 4px;">Manage and track your active job applications across interview rounds.</p>
        </div>

        <button class="btn-primary" id="btn-add-application">
          + New Application
        </button>
      </div>

      <div class="job-tracker-summary" aria-label="Application summary">
        <div><strong>${apps.length}</strong><span>Total tracked</span></div>
        <div><strong>${activeApps}</strong><span>In progress</span></div>
        <div><strong>${interviewingApps.length}</strong><span>Interviewing</span></div>
        <div><strong>${offerApps.length}</strong><span>Offers</span></div>
      </div>

      <div class="kanban-board">
        <!-- Column 1: Wishlist -->
        <div class="kanban-col" data-stage="wishlist">
          <div class="kanban-col-header">
            <div class="col-title-group">
              <span class="col-title" style="color: var(--primary);">Wishlist</span>
              <span class="col-count">${wishlistApps.length}</span>
            </div>
            <button class="btn-add-card" data-stage="wishlist" title="Add Wishlist Role">+</button>
          </div>

          <div class="kanban-cards-wrap" id="col-wrap-wishlist">
            ${wishlistApps.map(app => this.renderCard(app)).join('')}
          </div>
        </div>

        <!-- Column 2: Applied -->
        <div class="kanban-col" data-stage="applied">
          <div class="kanban-col-header">
            <div class="col-title-group">
              <span class="col-title" style="color: #D97706;">Applied</span>
              <span class="col-count">${appliedApps.length}</span>
            </div>
            <button class="btn-add-card" data-stage="applied" title="Add Applied Role">+</button>
          </div>

          <div class="kanban-cards-wrap" id="col-wrap-applied">
            ${appliedApps.map(app => this.renderCard(app)).join('')}
            ${appliedApps.length === 0 ? '<div class="drag-placeholder">Drop applied roles here</div>' : ''}
          </div>
        </div>

        <!-- Column 3: Interviewing -->
        <div class="kanban-col" data-stage="interviewing">
          <div class="kanban-col-header">
            <div class="col-title-group">
              <span class="col-title" style="color: var(--primary);">Interviewing</span>
              <span class="col-count">${interviewingApps.length}</span>
            </div>
            <button class="btn-add-card" data-stage="interviewing" title="Add Interviewing Role">+</button>
          </div>

          <div class="kanban-cards-wrap" id="col-wrap-interviewing">
            ${interviewingApps.map(app => this.renderCard(app)).join('')}
            ${interviewingApps.length === 0 ? '<div class="drag-placeholder">Drop active interviews here</div>' : ''}
          </div>
        </div>

        <!-- Column 4: Offer -->
        <div class="kanban-col" data-stage="offer">
          <div class="kanban-col-header">
            <div class="col-title-group">
              <span class="col-title" style="color: #166534;">Offer</span>
              <span class="col-count">${offerApps.length}</span>
            </div>
            <button class="btn-add-card" data-stage="offer" title="Add Offer">+</button>
          </div>

          <div class="kanban-cards-wrap" id="col-wrap-offer">
            ${offerApps.map(app => this.renderCard(app)).join('')}
            ${offerApps.length === 0 ? '<div class="drag-placeholder">Drop offers here 🎉</div>' : ''}
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  renderCard(app) {
    const isDemo = app.isDemo;

    return `
      <div class="kanban-card" data-app-id="${app.id}" draggable="${!isDemo}">
        <div class="card-top-row">
          <div class="company-brand">
            <div class="company-logo-badge" style="background: ${app.accentColor || '#4F46E5'};">
              ${app.logoLetter || app.company.charAt(0)}
            </div>
            <div>
              <div class="company-name">${app.company}</div>
              <div class="job-role-title">${app.role}</div>
            </div>
          </div>
          <span style="color: #94A3B8; font-weight: 700; cursor: pointer;">•••</span>
        </div>

        <div style="font-size: 0.75rem; color: #64748B; margin-bottom: 8px;">
          📍 ${app.location} • <span style="color: #0F172A; font-weight: 600;">${app.appliedDate}</span>
        </div>

        ${app.stageProgress ? `
          <div style="margin-bottom: 8px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.72rem; color: #64748B; margin-bottom: 3px;">
              <span>${app.stageProgress}</span>
              ${app.nextInterview ? `<span style="color: #DC2626; font-weight: 700;">${app.nextInterview}</span>` : ''}
            </div>
            ${app.progressPercent ? `
              <div style="height: 4px; background: #E2E8F0; border-radius: 2px; overflow: hidden;">
                <div style="width: ${app.progressPercent}%; height: 100%; background: #3B82F6;"></div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; padding-top: 8px; border-top: 1px solid #F1F5F9;">
          <span style="font-size: 0.72rem; color: #64748B; font-weight: 600;">${app.nextStep || 'Follow up'}</span>
          <span class="priority-tag-pill ${app.priority === 'high' ? 'danger' : 'primary'}">
            ${app.priorityLabel || 'Normal'}
          </span>
        </div>

        ${!isDemo ? `
          <label class="card-stage-control">
            <span>Move to</span>
            <select class="app-stage-select" data-app-id="${app.id}" aria-label="Move ${app.company} application">
              <option value="wishlist" ${app.stage === 'wishlist' ? 'selected' : ''}>Wishlist</option>
              <option value="applied" ${app.stage === 'applied' ? 'selected' : ''}>Applied</option>
              <option value="interviewing" ${app.stage === 'interviewing' ? 'selected' : ''}>Interviewing</option>
              <option value="offer" ${app.stage === 'offer' ? 'selected' : ''}>Offer</option>
            </select>
          </label>
        ` : ''}
      </div>
    `;
  }

  attachEventListeners() {
    // Save-Triggered Signup Prompts in Guest Mode (PRD Section 7.3 & FR-4.6)
    document.getElementById('btn-demo-board-signup')?.addEventListener('click', () => {
      window.openSaveSignupPrompt('job_tracker');
    });

    document.getElementById('btn-add-application')?.addEventListener('click', () => {
      if (store.isGuest()) {
        window.openSaveSignupPrompt('job_tracker');
      } else {
        this.openAddApplicationModal();
      }
    });

    document.querySelectorAll('.btn-add-card').forEach(btn => {
      btn.addEventListener('click', (e) => {
        if (store.isGuest()) {
          window.openSaveSignupPrompt('job_tracker');
        } else {
          const stage = e.currentTarget.getAttribute('data-stage');
          this.openAddApplicationModal(stage);
        }
      });
    });

    document.querySelectorAll('.app-stage-select').forEach(select => {
      select.addEventListener('change', (e) => {
        const appId = e.currentTarget.getAttribute('data-app-id');
        const newStage = e.currentTarget.value;
        store.moveApplication(appId, newStage);
        window.showToast?.(`Application moved to ${newStage.toUpperCase()}!`, 'success');
        this.render(this.container);
      });
    });

    // Drag and Drop (Only for authenticated users)
    if (!store.isGuest()) {
      this.initDragAndDrop();
    }
  }

  initDragAndDrop() {
    const cards = document.querySelectorAll('.kanban-card');
    const cols = document.querySelectorAll('.kanban-cards-wrap');

    cards.forEach(card => {
      card.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', card.getAttribute('data-app-id'));
        card.classList.add('dragging');
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
      });
    });

    cols.forEach(col => {
      col.addEventListener('dragover', (e) => {
        e.preventDefault();
        col.classList.add('drag-over');
      });

      col.addEventListener('dragleave', () => {
        col.classList.remove('drag-over');
      });

      col.addEventListener('drop', (e) => {
        e.preventDefault();
        col.classList.remove('drag-over');
        const appId = e.dataTransfer.getData('text/plain');
        const stage = col.closest('.kanban-col')?.getAttribute('data-stage');
        if (appId && stage) {
          store.moveApplication(appId, stage);
          window.showToast?.(`Application moved to ${stage.toUpperCase()}!`, 'success');
          this.render(this.container);
        }
      });
    });
  }

  openAddApplicationModal(defaultStage = 'wishlist') {
    const modalOverlay = document.getElementById('global-modal-overlay');
    const modalContent = document.getElementById('global-modal-content');
    if (!modalOverlay || !modalContent) return;

    modalContent.innerHTML = `
      <div class="modal-header">
        <div>
          <h3 style="margin: 0;">Add New Job Application</h3>
          <span style="font-size: 0.78rem; color: #64748B;">Track a new role and connect your tailored resume.</span>
        </div>
        <button class="btn-close-modal" id="btn-close-app-modal">&times;</button>
      </div>

      <div style="display: flex; flex-direction: column; gap: 12px;">
        <div>
          <label style="font-size: 0.78rem; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">Company Name</label>
          <input type="text" id="inp-app-company" placeholder="e.g. Stripe, Apple, Figma" class="field-input">
        </div>

        <div>
          <label style="font-size: 0.78rem; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">Job Title / Role</label>
          <input type="text" id="inp-app-role" placeholder="e.g. Senior Product Manager" class="field-input">
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
          <div>
            <label style="font-size: 0.78rem; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">Stage</label>
            <select id="inp-app-stage" class="field-input">
              <option value="wishlist" ${defaultStage === 'wishlist' ? 'selected' : ''}>Wishlist</option>
              <option value="applied" ${defaultStage === 'applied' ? 'selected' : ''}>Applied</option>
              <option value="interviewing" ${defaultStage === 'interviewing' ? 'selected' : ''}>Interviewing</option>
              <option value="offer" ${defaultStage === 'offer' ? 'selected' : ''}>Offer</option>
            </select>
          </div>

          <div>
            <label style="font-size: 0.78rem; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">Priority</label>
            <select id="inp-app-priority" class="field-input">
              <option value="high">High Priority</option>
              <option value="medium" selected>Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <div>
          <label style="font-size: 0.78rem; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">Location / Remote</label>
          <input type="text" id="inp-app-location" placeholder="e.g. San Francisco, CA / Remote" class="field-input">
        </div>

        <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 10px;">
          <button class="action-pill-btn" id="btn-cancel-add-app">Cancel</button>
          <button class="btn-primary" id="btn-save-new-app">Save Application</button>
        </div>
      </div>
    `;

    modalOverlay.classList.add('active');

    document.getElementById('btn-close-app-modal')?.addEventListener('click', () => modalOverlay.classList.remove('active'));
    document.getElementById('btn-cancel-add-app')?.addEventListener('click', () => modalOverlay.classList.remove('active'));

    document.getElementById('btn-save-new-app')?.addEventListener('click', () => {
      const company = document.getElementById('inp-app-company').value.trim() || 'New Company';
      const role = document.getElementById('inp-app-role').value.trim() || 'Software Engineer';
      const stage = document.getElementById('inp-app-stage').value;
      const priority = document.getElementById('inp-app-priority').value;
      const location = document.getElementById('inp-app-location').value.trim() || 'Remote';

      store.addJobApplication({ company, role, stage, priority, location });
      modalOverlay.classList.remove('active');
      window.showToast?.(`Added ${company} (${role}) to ${stage.toUpperCase()}!`, 'success');
      this.render(this.container);
    });
  }
}

export const jobTrackerView = new JobTrackerView();
