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
          <h2 style="font-size: 1.65rem; font-weight: 700; color: var(--text-main);">Settings</h2>
          <p style="color: var(--text-muted); font-size: 0.95rem;">Manage your active persona profile and AI coaching preferences.</p>
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

  }
}

export const complianceSettingsView = new ComplianceSettingsView();


