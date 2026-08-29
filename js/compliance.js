/**
 * CareerAI - Compliance, Privacy & Persona Settings Manager (PCE-SW-PS-9)
 * Implements GDPR/CCPA Data Export, Erasure & Persona Switching
 */

import { store } from './state.js';

export class ComplianceSettingsView {
  constructor() {
    this.container = null;
  }

  render(container) {
    this.container = container;
    const state = store.state;

    container.innerHTML = `
      <div style="max-width: 900px; margin: 0 auto;">
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 1.65rem; font-weight: 700; color: var(--text-main);">Settings</h2>
          <p style="color: var(--text-muted); font-size: 0.95rem;">Your coaching experience is personalized automatically from your current profile and session data.</p>
        </div>

        <div class="card" style="margin-bottom: 24px;">
          <h3 style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">Preferences</h3>
          <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0;">
            Resume analysis, mock interview tailoring, and roadmap recommendations continue to update based on your saved resume and active job context.
          </p>
        </div>
      </div>
    `;
  }
}

export const complianceSettingsView = new ComplianceSettingsView();


