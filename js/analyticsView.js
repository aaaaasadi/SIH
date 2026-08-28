/**
 * CareerAI - Interview Performance & Coaching Analytics View (PCE-SW-PS-9 - v2.1)
 * Matches Screenshot 1 & PRD Section 7.2 (Clear "Demo Preview" Badges for Guests)
 */

import { store, DEFAULT_SESSIONS } from './state.js';

export class AnalyticsView {
  constructor() {
    this.container = null;
  }

  render(container) {
    this.container = container;
    const isGuest = store.isGuest();
    const sessions = isGuest ? DEFAULT_SESSIONS : (store.state.sessions || []);

    container.innerHTML = `
      ${isGuest ? `
        <!-- Demo Analytics Banner (PRD Section 7.2 & 7.3) -->
        <div class="guest-analytics-notice">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 1.2rem;">📊</span>
            <div>
              <strong>Sample Performance Trends (Priya Sharma):</strong>
              <span style="color: #475569;"> The charts below display demo data. Create a free account to unlock your personal interview analytics, speech pacing history, and STAR growth charts.</span>
            </div>
          </div>
          <button class="btn-primary" id="btn-analytics-guest-signup" style="font-size: 0.76rem; padding: 5px 14px;">
            Sign Up to Track Your Trends →
          </button>
        </div>
      ` : ''}

      <div class="performance-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <h2 style="margin: 0;">Interview Performance</h2>
          ${isGuest ? `<span class="guest-badge-pill">Sample Data Preview</span>` : ''}
        </div>
        <p style="margin-top: 4px;">Review your mock interview analytics, pacing, and AI coaching insights over time.</p>
      </div>

      <div class="performance-grid">
        <!-- Left Column: Readiness Score & Skill Breakdown -->
        <div>
          <!-- Readiness Score Card -->
          <div class="readiness-score-card">
            <div class="card-top-row">
              <div style="font-size: 1.15rem; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
                Readiness Score
                ${isGuest ? `<span class="demo-chip-tag">Demo Benchmark</span>` : ''}
              </div>
              <span class="badge-top-percent">TOP 15%</span>
            </div>

            <div class="readiness-body">
              <!-- Radial Gauge -->
              <div class="gauge-container">
                <svg class="gauge-svg" viewBox="0 0 100 100">
                  <circle class="gauge-bg" cx="50" cy="50" r="40"></circle>
                  <circle class="gauge-fill" cx="50" cy="50" r="40"
                    stroke-dasharray="251.2"
                    stroke-dashoffset="${251.2 - (251.2 * 82) / 100}">
                  </circle>
                </svg>
                <div class="gauge-text">
                  <div class="gauge-value">82<span>%</span></div>
                </div>
              </div>

              <!-- Growth Sparkline Box -->
              <div class="trend-spark-box">
                <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path></svg>
                <span>+12% over last 5 sessions</span>
              </div>
            </div>
          </div>

          <!-- Skill Breakdown Card -->
          <div class="skill-breakdown-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              <div style="font-size: 1.15rem; font-weight: 700; color: var(--text-main);">Skill Breakdown</div>
              ${isGuest ? `<span class="demo-chip-tag">Sample Profile</span>` : ''}
            </div>

            <!-- Behavioral -->
            <div class="skill-bar-row">
              <div class="skill-bar-header">
                <span>Behavioral (STAR Method)</span>
                <span>88%</span>
              </div>
              <div class="progress-bar-wrap" style="height: 8px;">
                <div class="progress-bar-fill primary" style="width: 88%;"></div>
              </div>
            </div>

            <!-- Technical Communication -->
            <div class="skill-bar-row">
              <div class="skill-bar-header">
                <span>Technical Communication</span>
                <span>75%</span>
              </div>
              <div class="progress-bar-wrap" style="height: 8px;">
                <div class="progress-bar-fill primary" style="width: 75%;"></div>
              </div>
            </div>

            <!-- Confidence & Tone -->
            <div class="skill-bar-row">
              <div class="skill-bar-header">
                <span>Confidence & Tone</span>
                <span>62%</span>
              </div>
              <div class="progress-bar-wrap" style="height: 8px;">
                <div class="progress-bar-fill warning" style="width: 62%;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Column: AI Coach Insights & Recent Sessions -->
        <div class="insights-column">
          <!-- AI Coach Insights Card -->
          <div class="card" style="padding: 24px;">
            <div class="ai-panel-header" style="margin-bottom: 16px;">
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
              AI Coach Insights
            </div>

            <!-- Strengths -->
            <div class="insight-block">
              <div class="insight-label strengths">👍 STRENGTHS</div>
              <div class="insight-text">
                Strong structural answers in technical questions. Good eye contact and concise framing maintained.
              </div>
            </div>

            <!-- Area for Growth -->
            <div class="insight-block">
              <div class="insight-label growth">📈 AREA FOR GROWTH</div>
              <div class="insight-text">
                Work on quantifying the Result in the STAR method for leadership questions.
              </div>
            </div>
          </div>

          <!-- Recent Sessions Card -->
          <div class="recent-sessions-card">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
              <div style="font-size: 1.15rem; font-weight: 700; color: var(--text-main);">Recent Sessions</div>
              ${isGuest ? `<span class="demo-chip-tag">Sample Logs</span>` : ''}
            </div>

            <div class="session-list">
              ${sessions.map(s => `
                <div class="session-list-item">
                  <div>
                    <div class="session-name">${s.role}</div>
                    <div class="session-meta">${s.category} • ${s.date}</div>
                  </div>
                  <span class="session-score-pill">${s.score}%</span>
                </div>
              `).join('')}
            </div>

            <button class="btn-view-all" id="btn-view-all-history">View All History</button>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    document.getElementById('btn-analytics-guest-signup')?.addEventListener('click', () => {
      window.openSaveSignupPrompt('dashboard');
    });

    document.getElementById('btn-view-all-history')?.addEventListener('click', () => {
      if (store.isGuest()) {
        window.openSaveSignupPrompt('dashboard');
      } else {
        window.showToast?.('Displaying historical mock interview logs', 'info');
      }
    });
  }
}

export const analyticsView = new AnalyticsView();
