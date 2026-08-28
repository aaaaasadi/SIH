/**
 * CareerAI - Compliance, Privacy & Persona Settings Manager (PCE-SW-PS-9)
 * Implements GDPR/CCPA Data Export, Erasure & Persona Switching
 */

import { store, PERSONAS } from './state.js';

export class ComplianceSettingsView {
  constructor() {
    this.container = null;
  }

  render(container) {
    this.container = container;
    const state = store.state;
    const currentPersona = PERSONAS[state.currentPersona] || PERSONAS.priya;

    container.innerHTML = `
      <div style="max-width: 900px; margin: 0 auto;">
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 1.65rem; font-weight: 700; color: var(--text-main);">Settings & Compliance</h2>
          <p style="color: var(--text-muted); font-size: 0.95rem;">Manage your active persona profile, GDPR/CCPA privacy controls, and AI coaching preferences.</p>
        </div>

        <!-- 1. Active Persona Selector (PRD Section 4) -->
        <div class="card" style="margin-bottom: 24px;">
          <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">Target User Persona</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 18px;">Switch test personas to evaluate tailored scoring and interview rubrics across different career stages.</p>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">
            ${Object.keys(PERSONAS).map(k => {
              const p = PERSONAS[k];
              const isActive = p.id === state.currentPersona;
              return `
                <div class="persona-card-item ${isActive ? 'active' : ''}" data-persona-id="${p.id}" 
                  style="border: 2px solid ${isActive ? 'var(--primary)' : 'var(--border-light)'}; border-radius: var(--radius-lg); padding: 14px; background: ${isActive ? 'var(--primary-light)' : 'white'}; cursor: pointer; transition: all 0.2s ease;">
                  <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                    <img src="${p.avatar}" alt="${p.name}" style="width: 42px; height: 42px; border-radius: 9999px; object-fit: cover; border: 1.5px solid #E2E8F0;">
                    <div>
                      <div style="font-weight: 700; font-size: 0.92rem; color: #0F172A;">${p.name}</div>
                      <div style="font-size: 0.72rem; color: var(--primary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em;">${p.plan}</div>
                    </div>
                  </div>
                  <div style="font-size: 0.8rem; font-weight: 600; color: #1E293B; margin-bottom: 4px;">
                    ${p.title ? `<span style="color: var(--primary); font-weight: 700;">${p.role}:</span> ${p.title}` : p.role}
                  </div>
                  <div style="font-size: 0.74rem; color: #64748B; line-height: 1.4;">${p.bio}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- 2. GDPR & CCPA Compliance Center (PRD Section 9.1) -->
        <div class="card" style="margin-bottom: 24px;">
          <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">Privacy & Data Control (GDPR / CCPA)</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 18px;">Under GDPR Article 15/17 & CCPA, you retain 100% ownership over your uploaded resumes, interview transcripts, and AI coaching reports.</p>

          <div style="display: flex; flex-direction: column; gap: 16px;">
            <!-- Data Export (JSON DSAR) -->
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px; background: #F8FAFC; border-radius: var(--radius-md);">
              <div>
                <div style="font-weight: 600; font-size: 0.9rem; color: #0F172A;">Export Personal Data Archive</div>
                <div style="font-size: 0.78rem; color: #64748B;">Download full machine-readable JSON containing your resume versions, interview scores, and application tracking history.</div>
              </div>
              <button class="btn-primary" id="btn-export-dsar" style="font-size: 0.82rem; padding: 8px 16px; white-space: nowrap;">
                Download Data (.json)
              </button>
            </div>

            <!-- Granular Consent Toggles -->
            <div style="padding: 14px; background: #F8FAFC; border-radius: var(--radius-md);">
              <div style="font-weight: 600; font-size: 0.9rem; color: #0F172A; margin-bottom: 10px;">Consent & Processing Preferences</div>
              
              <label style="display: flex; align-items: center; gap: 10px; font-size: 0.84rem; color: #334155; margin-bottom: 8px; cursor: pointer;">
                <input type="checkbox" id="chk-voice-storage" ${state.complianceConsent?.voiceStorageOptIn ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--primary);">
                Allow temporary storage of mock interview voice recordings for coaching playback
              </label>

              <label style="display: flex; align-items: center; gap: 10px; font-size: 0.84rem; color: #334155; cursor: pointer;">
                <input type="checkbox" id="chk-ai-optin" ${state.complianceConsent?.aiAnalyticsOptIn ? 'checked' : ''} style="width: 16px; height: 16px; accent-color: var(--primary);">
                Enable longitudinal interview confidence score tracking
              </label>
            </div>

            <!-- Immediate Data Deletion (Right to Erasure) -->
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 14px; background: #FEF2F2; border: 1px solid #FECACA; border-radius: var(--radius-md);">
              <div>
                <div style="font-weight: 600; font-size: 0.9rem; color: #991B1B;">Right to Erasure (Purge All Data)</div>
                <div style="font-size: 0.78rem; color: #7F1D1D;">Permanently delete all stored resumes, mock session logs, and tracking cards from local storage.</div>
              </div>
              <button class="btn-end-session" id="btn-purge-all" style="font-size: 0.82rem; padding: 8px 16px; white-space: nowrap;">
                Purge All Data
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    // Persona Switcher
    this.container.querySelectorAll('.persona-card-item').forEach(card => {
      card.addEventListener('click', (e) => {
        const pId = e.currentTarget.getAttribute('data-persona-id');
        store.setPersona(pId);
        window.showToast?.(`Switched active persona to ${PERSONAS[pId].name}!`, 'success');
        this.render(this.container);
      });
    });

    // GDPR Export
    document.getElementById('btn-export-dsar')?.addEventListener('click', () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(store.state, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `career_ai_user_archive_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      window.showToast?.('GDPR data export downloaded successfully!', 'success');
    });

    // Right to Erasure / Purge
    document.getElementById('btn-purge-all')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to permanently delete and reset all user session data? This cannot be undone.')) {
        store.resetAllData();
        window.showToast?.('All data successfully purged under GDPR/CCPA Right to Erasure.', 'info');
        this.render(this.container);
      }
    });

    // Consent toggles
    document.getElementById('chk-voice-storage')?.addEventListener('change', (e) => {
      store.state.complianceConsent.voiceStorageOptIn = e.target.checked;
      store.saveState();
      window.showToast?.('Privacy preferences updated.', 'info');
    });

    document.getElementById('chk-ai-optin')?.addEventListener('change', (e) => {
      store.state.complianceConsent.aiAnalyticsOptIn = e.target.checked;
      store.saveState();
      window.showToast?.('Privacy preferences updated.', 'info');
    });
  }
}

export const complianceSettingsView = new ComplianceSettingsView();

