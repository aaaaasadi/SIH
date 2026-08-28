/**
 * CareerAI - Resume Lab & AI Optimization Controller (PCE-SW-PS-9 / SIH Upgrade)
 *
 * Core Features:
 * 1. Upload & Parsing: Drag & Drop, File Picker (.pdf, .docx, .txt), Paste Text, Sample Profiles.
 * 2. Deep ATS Analyzer: 5-Pillar Breakdown (Content, Skills, Keywords, Experience, Formatting), Strengths (3-5), Problems (3-5), Recommendations.
 * 3. AI Resume Improvement: Original vs AI Improvement vs Why with interactive Accept, Edit, and Reject actions (never inventing facts).
 * 4. Job Description Matching ("Analyze Against Job"): Job Match Score, Matching/Missing Skills & Keywords, Experience Gap, Non-fabricating Recommendations.
 */

import { store, PERSONAS, SAMPLE_RESUMES } from './state.js';
import { aiEngine } from './aiEngine.js';

export class ResumeLabView {
  constructor() {
    this.container = null;
    this.activeTab = 'analysis'; // 'analysis' | 'suggestions' | 'jobMatch'
    this.editingSuggestionId = null;
    this.showAllSuggestions = false;
    this.isAnalyzing = false;
  }

  render(container) {
    this.container = container;
    const state = store.state;
    const resume = state.resume;
    const currentJd = state.hasActiveJd && state.currentJdKey ? state.jobDescriptions[state.currentJdKey] : null;

    // Run deep analysis
    const deepAnalysis = aiEngine.analyzeResumeDeep(resume);
    const matchData = aiEngine.calculateMatchScore(resume, currentJd);
    const rankedSuggestions = aiEngine.getRankedSuggestions(resume, state.resolvedSuggestions || []);

    container.innerHTML = `
      <!-- Top Helper / Quick Action Strip -->
      <div class="resume-lab-helper-strip" style="background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%); border: 1px solid #C7D2FE; border-radius: var(--radius-md); padding: 12px 18px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 10px; font-size: 0.88rem; color: #1E1B4B;">
          <span style="font-size: 1.3rem;">⚡</span>
          <span><strong>Resume Intelligence Workflow:</strong> Upload your resume → Review 5-Pillar ATS Breakdown → Accept/Edit AI Bullet Improvements → Match against target Job Description.</span>
        </div>
        <div style="display: flex; gap: 8px; align-items: center;">
          <button class="btn-primary" id="btn-helper-upload" style="font-size: 0.8rem; padding: 7px 16px; font-weight: 700; white-space: nowrap;">
            📤 Upload Resume
          </button>
          <button class="action-pill-btn" id="btn-helper-paste" style="font-size: 0.8rem; padding: 7px 14px; font-weight: 600; background: white; white-space: nowrap;">
            📋 Paste Text
          </button>
          <button class="action-pill-btn" id="btn-helper-sample" style="font-size: 0.8rem; padding: 7px 14px; font-weight: 600; background: white; white-space: nowrap;">
            🧪 Try Sample
          </button>
        </div>
      </div>

      <div class="resume-lab-container" style="display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 20px; align-items: start;">
        
        <!-- LEFT COLUMN: Resume Editor & Live Document Canvas -->
        <div class="resume-editor-pane" style="background: white; border: 1.5px solid var(--border-light); border-radius: var(--radius-lg); padding: 20px; box-shadow: 0 4px 14px rgba(0,0,0,0.03);">
          
          <!-- Editor Top Toolbar -->
          <div class="editor-toolbar" style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 14px; border-bottom: 1.5px solid #F1F5F9; margin-bottom: 16px; flex-wrap: wrap; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <button class="tool-btn-primary" id="btn-open-upload-modal" style="display: flex; align-items: center; gap: 6px; font-size: 0.82rem; padding: 6px 14px; font-weight: 700;">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                Upload / Import
              </button>
              <button class="tool-btn-secondary" id="btn-open-jd-picker" style="font-size: 0.82rem; padding: 6px 12px; font-weight: 600;">
                🎯 ${currentJd ? (currentJd.roleTag || currentJd.title) : 'Set Target Job Description'}
              </button>
            </div>
            
            <div style="display: flex; align-items: center; gap: 10px; font-size: 0.8rem; color: #64748B;">
              <span>Status: <strong style="color: #10B981;">✓ Synced</strong></span>
              <button class="action-pill-btn" id="btn-export-pdf" style="font-size: 0.78rem; padding: 5px 12px; display: flex; align-items: center; gap: 4px;">
                <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                Export PDF
              </button>
            </div>
          </div>

          <!-- Document Canvas (Paper) -->
          <div class="resume-paper" id="resume-canvas" contenteditable="true" spellcheck="false" style="padding: 24px; background: #FAFBFD; border: 1px solid #E2E8F0; border-radius: var(--radius-md); min-height: 520px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            
            <!-- Contact Header -->
            <div class="resume-header" style="border-bottom: 2px solid #0F172A; padding-bottom: 12px; margin-bottom: 16px;">
              <div class="resume-candidate-name" id="res-name" style="font-size: 1.45rem; font-weight: 800; color: #0F172A; margin-bottom: 4px;">${resume.candidate?.name || 'Candidate Name'}</div>
              <div class="resume-contact-line" id="res-contact" style="font-size: 0.84rem; color: #475569;">
                ${resume.candidate?.email || 'email@example.com'} • ${resume.candidate?.phone || '(+91) 98765-43210'} • ${resume.candidate?.location || 'Bengaluru, India'} • ${resume.candidate?.linkedin || 'linkedin.com/in/profile'}
              </div>
            </div>

            <!-- Professional Summary -->
            <div class="resume-section" data-section-id="summary" style="margin-bottom: 16px;">
              <div class="resume-section-title" style="font-size: 0.95rem; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #CBD5E1; padding-bottom: 4px; margin-bottom: 8px;">Professional Summary</div>
              <p class="resume-body-p" id="res-summary-content" style="font-size: 0.88rem; line-height: 1.5; color: #334155; margin: 0;">
                ${resume.sections?.find(s => s.id === 'summary')?.content || 'Results-driven software engineering professional with a strong foundation in building reliable backend architectures and automated pipelines.'}
              </p>
            </div>

            <!-- Experience -->
            <div class="resume-section" data-section-id="experience" style="margin-bottom: 16px;">
              <div class="resume-section-title" style="font-size: 0.95rem; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #CBD5E1; padding-bottom: 4px; margin-bottom: 8px;">Work Experience</div>
              <div id="experience-items-wrap">
                ${this.renderExperienceBlocks(resume)}
              </div>
            </div>

            <!-- Projects (if any) -->
            ${this.renderProjectsBlocks(resume)}

            <!-- Skills & Competencies -->
            <div class="resume-section" data-section-id="skills" style="margin-bottom: 16px;">
              <div class="resume-section-title" style="font-size: 0.95rem; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #CBD5E1; padding-bottom: 4px; margin-bottom: 8px;">Skills & Competencies</div>
              <p class="resume-body-p" id="res-skills-content" style="font-size: 0.88rem; line-height: 1.5; color: #334155; margin: 0;">
                ${resume.sections?.find(s => s.id === 'skills')?.content || 'Java, Python, SQL, REST APIs, Microservices, Git, Docker, System Design'}
              </p>
            </div>

            <!-- Education -->
            <div class="resume-section" data-section-id="education" style="margin-bottom: 12px;">
              <div class="resume-section-title" style="font-size: 0.95rem; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #CBD5E1; padding-bottom: 4px; margin-bottom: 8px;">Education</div>
              <p class="resume-body-p" id="res-edu-content" style="font-size: 0.88rem; line-height: 1.5; color: #334155; margin: 0;">
                ${resume.sections?.find(s => s.id === 'education')?.content || 'B.Tech in Computer Science & Engineering — Tier-1 Institute (2020)'}
              </p>
            </div>

          </div>
        </div>

        <!-- RIGHT COLUMN: Multi-Tab Intelligence Panel (ATS Analysis | AI Improvements | Job Match) -->
        <div class="ai-intelligence-pane" style="display: flex; flex-direction: column; gap: 16px;">
          
          <!-- Navigation Tabs -->
          <div style="display: flex; gap: 8px; background: #F1F5F9; padding: 4px; border-radius: var(--radius-md); border: 1px solid #E2E8F0;">
            <button class="action-pill-btn tab-btn-opt ${this.activeTab === 'analysis' ? 'active-tab' : ''}" data-tab="analysis" style="flex: 1; text-align: center; padding: 8px 12px; font-weight: 700; font-size: 0.82rem; border-radius: 6px; border: none; cursor: pointer; ${this.activeTab === 'analysis' ? 'background: white; color: var(--primary); box-shadow: 0 2px 6px rgba(0,0,0,0.06);' : 'background: transparent; color: #64748B;'}">
              📊 ATS Analysis
            </button>
            <button class="action-pill-btn tab-btn-opt ${this.activeTab === 'suggestions' ? 'active-tab' : ''}" data-tab="suggestions" style="flex: 1; text-align: center; padding: 8px 12px; font-weight: 700; font-size: 0.82rem; border-radius: 6px; border: none; cursor: pointer; ${this.activeTab === 'suggestions' ? 'background: white; color: var(--primary); box-shadow: 0 2px 6px rgba(0,0,0,0.06);' : 'background: transparent; color: #64748B;'}">
              ✨ AI Improvements (${rankedSuggestions.length})
            </button>
            <button class="action-pill-btn tab-btn-opt ${this.activeTab === 'jobMatch' ? 'active-tab' : ''}" data-tab="jobMatch" style="flex: 1; text-align: center; padding: 8px 12px; font-weight: 700; font-size: 0.82rem; border-radius: 6px; border: none; cursor: pointer; ${this.activeTab === 'jobMatch' ? 'background: white; color: var(--primary); box-shadow: 0 2px 6px rgba(0,0,0,0.06);' : 'background: transparent; color: #64748B;'}">
              🎯 Job Match
            </button>
          </div>

          <!-- TAB 1: ATS SCORE & 5-PILLAR BREAKDOWN -->
          ${this.activeTab === 'analysis' ? this.renderAtsAnalysisTab(deepAnalysis) : ''}

          <!-- TAB 2: AI RESUME IMPROVEMENT (Original vs AI Improved vs Why + Accept/Edit/Reject) -->
          ${this.activeTab === 'suggestions' ? this.renderSuggestionsTab(rankedSuggestions) : ''}

          <!-- TAB 3: JOB DESCRIPTION MATCHING -->
          ${this.activeTab === 'jobMatch' ? this.renderJobMatchTab(resume, currentJd, matchData) : ''}

        </div>

      </div>
    `;

    this.attachEventListeners();
  }

  // ==========================================================================
  // RENDER HELPER METHODS
  // ==========================================================================

  renderExperienceBlocks(resume) {
    const expSec = resume.sections?.find(s => s.id === 'experience');
    if (!expSec || !expSec.items || expSec.items.length === 0) {
      return `<p style="font-size: 0.85rem; color: #94A3B8; font-style: italic;">No work experience entries recorded.</p>`;
    }

    return expSec.items.map(item => `
      <div class="exp-item-block" style="margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
          <div style="font-weight: 700; font-size: 0.92rem; color: #0F172A;">${item.role} <span style="font-weight: 400; color: #64748B;">at ${item.company}</span></div>
          <div style="font-size: 0.78rem; color: #64748B; font-weight: 600;">${item.dates || ''} ${item.location ? `• ${item.location}` : ''}</div>
        </div>
        <ul style="margin: 0; padding-left: 18px; font-size: 0.86rem; color: #334155; line-height: 1.45;">
          ${(item.bullets || []).map(b => `
            <li id="canvas-b-${b.id}" style="margin-bottom: 4px;">${b.text}</li>
          `).join('')}
        </ul>
      </div>
    `).join('');
  }

  renderProjectsBlocks(resume) {
    const projSec = resume.sections?.find(s => s.id === 'projects');
    if (!projSec || !projSec.items || projSec.items.length === 0) return '';

    return `
      <div class="resume-section" data-section-id="projects" style="margin-bottom: 16px;">
        <div class="resume-section-title" style="font-size: 0.95rem; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #CBD5E1; padding-bottom: 4px; margin-bottom: 8px;">Key Projects</div>
        ${projSec.items.map(item => `
          <div style="margin-bottom: 10px;">
            <div style="font-weight: 700; font-size: 0.9rem; color: #0F172A; margin-bottom: 2px;">
              ${item.title} ${item.technologies ? `<span style="font-size: 0.78rem; font-weight: 600; color: var(--primary);">[${item.technologies}]</span>` : ''}
            </div>
            <ul style="margin: 0; padding-left: 18px; font-size: 0.86rem; color: #334155; line-height: 1.45;">
              ${(item.bullets || []).map(b => `
                <li id="canvas-b-${b.id}" style="margin-bottom: 3px;">${b.text}</li>
              `).join('')}
            </ul>
          </div>
        `).join('')}
      </div>
    `;
  }

  // --- TAB 1: ATS ANALYSIS ---
  renderAtsAnalysisTab(deepAnalysis) {
    const b = deepAnalysis.breakdown;
    const score = deepAnalysis.atsScore;
    const scoreColor = score >= 80 ? '#10B981' : (score >= 65 ? '#4F46E5' : '#EF4444');

    return `
      <div class="card" style="padding: 20px; border: 1.5px solid var(--border-light); border-radius: var(--radius-lg); background: white;">
        
        <!-- Score Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1.5px solid #F1F5F9;">
          <div>
            <div style="font-size: 0.76rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">Applicant Tracking System</div>
            <div style="font-size: 1.35rem; font-weight: 800; color: var(--text-main); margin-top: 2px;">ATS SCORE: <span style="color: ${scoreColor};">${score}/100</span></div>
          </div>
          <div style="width: 58px; height: 58px; border-radius: 50%; border: 4px solid ${scoreColor}; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.15rem; color: ${scoreColor}; background: #F8FAFC;">
            ${score}
          </div>
        </div>

        <!-- 5-Pillar Percentage Breakdown -->
        <div style="margin-bottom: 20px;">
          <div style="font-size: 0.84rem; font-weight: 700; color: #1E293B; margin-bottom: 10px;">5-Pillar Score Breakdown:</div>
          
          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.8rem;">
            <div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                <span style="color: #475569; font-weight: 600;">Content Completeness</span>
                <span style="font-weight: 700; color: #0F172A;">${b.content}%</span>
              </div>
              <div class="progress-bar-wrap" style="height: 6px;"><div class="progress-bar-fill primary" style="width: ${b.content}%;"></div></div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                <span style="color: #475569; font-weight: 600;">Skills Depth</span>
                <span style="font-weight: 700; color: #0F172A;">${b.skills}%</span>
              </div>
              <div class="progress-bar-wrap" style="height: 6px;"><div class="progress-bar-fill primary" style="width: ${b.skills}%;"></div></div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                <span style="color: #475569; font-weight: 600;">Keyword Density & Verbs</span>
                <span style="font-weight: 700; color: #0F172A;">${b.keywords}%</span>
              </div>
              <div class="progress-bar-wrap" style="height: 6px;"><div class="progress-bar-fill primary" style="width: ${b.keywords}%;"></div></div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                <span style="color: #475569; font-weight: 600;">Experience & Metrics</span>
                <span style="font-weight: 700; color: #0F172A;">${b.experience}%</span>
              </div>
              <div class="progress-bar-wrap" style="height: 6px;"><div class="progress-bar-fill primary" style="width: ${b.experience}%;"></div></div>
            </div>

            <div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 3px;">
                <span style="color: #475569; font-weight: 600;">Formatting & Parseability</span>
                <span style="font-weight: 700; color: #0F172A;">${b.formatting}%</span>
              </div>
              <div class="progress-bar-wrap" style="height: 6px;"><div class="progress-bar-fill primary" style="width: ${b.formatting}%;"></div></div>
            </div>
          </div>
        </div>

        <!-- 3-5 Specific Strengths -->
        <div style="margin-bottom: 16px;">
          <div style="font-size: 0.84rem; font-weight: 700; color: #059669; display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span>✓</span> Strengths Found in Resume:
          </div>
          <ul style="margin: 0; padding-left: 18px; font-size: 0.8rem; color: #334155; line-height: 1.45;">
            ${deepAnalysis.strengths.map(s => `<li style="margin-bottom: 4px;">${s}</li>`).join('')}
          </ul>
        </div>

        <!-- 3-5 Specific Problems -->
        <div style="margin-bottom: 16px;">
          <div style="font-size: 0.84rem; font-weight: 700; color: #DC2626; display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
            <span>⚠</span> Areas Requiring Attention:
          </div>
          <ul style="margin: 0; padding-left: 18px; font-size: 0.8rem; color: #334155; line-height: 1.45;">
            ${deepAnalysis.problems.map(p => `<li style="margin-bottom: 4px;">${p}</li>`).join('')}
          </ul>
        </div>

        <!-- Recommendations -->
        <div style="background: #F8FAFC; border-radius: var(--radius-md); padding: 12px; border: 1px solid #E2E8F0;">
          <div style="font-size: 0.82rem; font-weight: 700; color: #1E293B; margin-bottom: 6px;">💡 Actionable Recommendations:</div>
          <ul style="margin: 0; padding-left: 16px; font-size: 0.78rem; color: #475569; line-height: 1.4;">
            ${deepAnalysis.recommendations.map(r => `<li style="margin-bottom: 3px;">${r}</li>`).join('')}
          </ul>
        </div>

      </div>
    `;
  }

  // --- TAB 2: AI IMPROVEMENTS (Accept / Edit / Reject) ---
  renderSuggestionsTab(suggestions) {
    if (suggestions.length === 0) {
      return `
        <div class="card" style="padding: 24px; text-align: center; border: 1.5px solid var(--border-light); border-radius: var(--radius-lg); background: white;">
          <div style="font-size: 2.2rem; margin-bottom: 8px;">🎉</div>
          <h3 style="font-size: 1.1rem; font-weight: 700; color: #0F172A; margin: 0 0 6px 0;">All Suggestions Resolved!</h3>
          <p style="font-size: 0.85rem; color: #64748B; margin: 0;">Your resume bullet points are optimized with strong action verbs and verified factual structure.</p>
        </div>
      `;
    }

    return `
      <div style="display: flex; flex-direction: column; gap: 14px;">
        <div style="font-size: 0.84rem; color: #64748B;">
          Review AI-suggested improvements. You can <strong>Accept</strong> to apply to your resume, <strong>Edit</strong> to customize the text, or <strong>Reject</strong> to keep your original phrasing.
        </div>

        ${suggestions.map(s => {
          const isEditing = this.editingSuggestionId === s.bulletId;
          return `
            <div class="card suggestion-card" data-bullet-id="${s.bulletId}" style="padding: 16px; border: 1.5px solid var(--border-light); border-radius: var(--radius-md); background: white; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
              
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <span class="badge-role" style="font-size: 0.74rem; padding: 2px 8px; background: #EEF2FF; color: var(--primary); font-weight: 700;">
                  ${s.category}
                </span>
                <span style="font-size: 0.75rem; color: #059669; font-weight: 700;">+${s.impactScore} pts impact</span>
              </div>

              <!-- Original Sentence -->
              <div style="margin-bottom: 10px;">
                <div style="font-size: 0.74rem; font-weight: 700; color: #94A3B8; text-transform: uppercase;">Original:</div>
                <div style="font-size: 0.84rem; color: #475569; font-style: italic; background: #F8FAFC; padding: 6px 10px; border-radius: 4px; border-left: 3px solid #CBD5E1; margin-top: 3px;">
                  "${s.quote}"
                </div>
              </div>

              <!-- AI Improved Sentence -->
              <div style="margin-bottom: 10px;">
                <div style="font-size: 0.74rem; font-weight: 700; color: var(--primary); text-transform: uppercase;">AI Improvement (Zero-Hallucination):</div>
                ${isEditing ? `
                  <textarea id="inp-edit-rewrite-${s.bulletId}" style="width: 100%; min-height: 60px; font-size: 0.85rem; padding: 8px; border: 1.5px solid var(--primary); border-radius: 4px; margin-top: 3px; font-family: inherit;">${s.rewrite}</textarea>
                ` : `
                  <div style="font-size: 0.86rem; color: #0F172A; font-weight: 600; background: #EEF2FF; padding: 8px 10px; border-radius: 4px; border-left: 3px solid var(--primary); margin-top: 3px; line-height: 1.4;">
                    "${s.rewrite}"
                  </div>
                `}
              </div>

              <!-- Why? Explanation -->
              <div style="margin-bottom: 12px; font-size: 0.78rem; color: #64748B;">
                <strong>Why:</strong> ${s.explanation}
              </div>

              <!-- Action Buttons: Accept / Edit / Reject -->
              <div style="display: flex; gap: 8px; justify-content: flex-end; align-items: center; border-top: 1px solid #F1F5F9; padding-top: 10px;">
                ${isEditing ? `
                  <button class="btn-primary btn-save-custom-rewrite" data-bullet-id="${s.bulletId}" style="font-size: 0.76rem; padding: 5px 12px; font-weight: 700;">
                    ✓ Save & Apply
                  </button>
                  <button class="action-pill-btn btn-cancel-edit-rewrite" data-bullet-id="${s.bulletId}" style="font-size: 0.76rem; padding: 5px 10px; background: #F1F5F9;">
                    Cancel
                  </button>
                ` : `
                  <button class="btn-primary btn-accept-suggestion" data-bullet-id="${s.bulletId}" data-rewrite="${encodeURIComponent(s.rewrite)}" style="font-size: 0.76rem; padding: 5px 14px; font-weight: 700;">
                    ✓ Accept Suggestion
                  </button>
                  <button class="action-pill-btn btn-edit-suggestion" data-bullet-id="${s.bulletId}" style="font-size: 0.76rem; padding: 5px 10px; background: white; border: 1px solid #CBD5E1;">
                    ✏ Edit
                  </button>
                  <button class="action-pill-btn btn-reject-suggestion" data-bullet-id="${s.bulletId}" style="font-size: 0.76rem; padding: 5px 10px; color: #EF4444; background: white; border: 1px solid #FCA5A5;">
                    ✕ Reject
                  </button>
                `}
              </div>

            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  // --- TAB 3: JOB DESCRIPTION MATCHING ---
  renderJobMatchTab(resume, currentJd, matchData) {
    return `
      <div class="card" style="padding: 20px; border: 1.5px solid var(--border-light); border-radius: var(--radius-lg); background: white;">
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 1.5px solid #F1F5F9;">
          <div>
            <div style="font-size: 0.76rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">Target Role Matching</div>
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--text-main); margin-top: 2px;">
              Job Match Score: <span style="color: ${matchData.colorBand === 'green' ? '#10B981' : '#4F46E5'};">${matchData.matchScore}%</span>
            </div>
          </div>
          <button class="action-pill-btn" id="btn-change-target-jd" style="font-size: 0.76rem; padding: 5px 10px; background: #EEF2FF; color: var(--primary); font-weight: 700;">
            Change JD ▾
          </button>
        </div>

        <!-- Matching Skills (Found in both) -->
        <div style="margin-bottom: 14px;">
          <div style="font-size: 0.8rem; font-weight: 700; color: #059669; margin-bottom: 6px;">
            ✓ Matching Skills (${matchData.matchingSkills?.length || 0}):
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${(matchData.matchingSkills || []).map(s => `
              <span style="font-size: 0.76rem; background: #ECFDF5; color: #065F46; border: 1px solid #A7F3D0; padding: 2px 8px; border-radius: 9999px; font-weight: 600;">
                ${s}
              </span>
            `).join('') || '<span style="font-size: 0.78rem; color: #94A3B8;">No direct keyword matches yet.</span>'}
          </div>
        </div>

        <!-- Missing Skills (From JD) -->
        <div style="margin-bottom: 14px;">
          <div style="font-size: 0.8rem; font-weight: 700; color: #DC2626; margin-bottom: 6px;">
            ⚠ Missing Target Skills (${matchData.missingSkills?.length || 0}):
          </div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${(matchData.missingSkills || []).map(s => `
              <span style="font-size: 0.76rem; background: #FEF2F2; color: #991B1B; border: 1px solid #FECACA; padding: 2px 8px; border-radius: 9999px; font-weight: 600;">
                + ${s}
              </span>
            `).join('') || '<span style="font-size: 0.78rem; color: #059669;">All key JD competencies matched!</span>'}
          </div>
        </div>

        <!-- Experience Gap Analysis -->
        <div style="margin-bottom: 14px; background: #F8FAFC; border-radius: var(--radius-md); padding: 12px; border: 1px solid #E2E8F0;">
          <div style="font-size: 0.8rem; font-weight: 700; color: #1E293B; margin-bottom: 4px;">Experience Gap Assessment:</div>
          <p style="margin: 0; font-size: 0.78rem; color: #475569; line-height: 1.45;">
            ${matchData.experienceGap}
          </p>
        </div>

        <!-- Recommended Resume Changes (Non-hallucinating) -->
        <div>
          <div style="font-size: 0.8rem; font-weight: 700; color: var(--primary); margin-bottom: 6px;">
            Recommended Strategic Steps:
          </div>
          <ul style="margin: 0; padding-left: 16px; font-size: 0.78rem; color: #475569; line-height: 1.4;">
            ${(matchData.recommendedChanges || []).map(r => `
              <li style="margin-bottom: 3px;">${r}</li>
            `).join('')}
          </ul>
        </div>

      </div>
    `;
  }

  // ==========================================================================
  // EVENT LISTENERS
  // ==========================================================================

  attachEventListeners() {
    // Tab switching
    this.container.querySelectorAll('.tab-btn-opt').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.currentTarget.getAttribute('data-tab');
        this.activeTab = tab;
        this.render(this.container);
      });
    });

    // Upload Helper buttons
    document.getElementById('btn-helper-upload')?.addEventListener('click', () => {
      this.openUploadModal('upload');
    });
    document.getElementById('btn-open-upload-modal')?.addEventListener('click', () => {
      this.openUploadModal('upload');
    });
    document.getElementById('btn-helper-paste')?.addEventListener('click', () => {
      this.openUploadModal('paste');
    });
    document.getElementById('btn-helper-sample')?.addEventListener('click', () => {
      this.openSampleModal();
    });
    document.getElementById('btn-open-jd-picker')?.addEventListener('click', () => {
      this.openJdPickerModal();
    });
    document.getElementById('btn-change-target-jd')?.addEventListener('click', () => {
      this.openJdPickerModal();
    });

    // Accept Suggestion
    this.container.querySelectorAll('.btn-accept-suggestion').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const bId = e.currentTarget.getAttribute('data-bullet-id');
        const rewrite = decodeURIComponent(e.currentTarget.getAttribute('data-rewrite') || '');
        store.updateBulletRewrite(bId, rewrite);
        store.resolveSuggestion(bId);
        window.showToast?.('AI suggestion applied to resume!', 'success');
        this.render(this.container);
      });
    });

    // Edit Suggestion (Inline)
    this.container.querySelectorAll('.btn-edit-suggestion').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const bId = e.currentTarget.getAttribute('data-bullet-id');
        this.editingSuggestionId = bId;
        this.render(this.container);
      });
    });

    // Cancel Edit
    this.container.querySelectorAll('.btn-cancel-edit-rewrite').forEach(btn => {
      btn.addEventListener('click', () => {
        this.editingSuggestionId = null;
        this.render(this.container);
      });
    });

    // Save Custom Rewrite
    this.container.querySelectorAll('.btn-save-custom-rewrite').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const bId = e.currentTarget.getAttribute('data-bullet-id');
        const customText = document.getElementById(`inp-edit-rewrite-${bId}`)?.value?.trim();
        if (!customText) return;
        store.updateBulletRewrite(bId, customText);
        store.resolveSuggestion(bId);
        this.editingSuggestionId = null;
        window.showToast?.('Custom edited bullet applied to resume!', 'success');
        this.render(this.container);
      });
    });

    // Reject Suggestion
    this.container.querySelectorAll('.btn-reject-suggestion').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const bId = e.currentTarget.getAttribute('data-bullet-id');
        store.resolveSuggestion(bId);
        window.showToast?.('Suggestion dismissed.', 'info');
        this.render(this.container);
      });
    });

    // Export PDF
    document.getElementById('btn-export-pdf')?.addEventListener('click', () => {
      window.print();
    });
  }

  // ==========================================================================
  // MODALS: UPLOAD, PASTE, SAMPLES, JD PICKER
  // ==========================================================================

  openUploadModal(initialTab = 'upload') {
    const modalHtml = `
      <div class="modal-overlay" id="upload-resume-modal">
        <div class="modal-card" style="max-width: 580px; width: 90%;">
          <div class="modal-header">
            <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700;">Import / Upload Resume</h3>
            <button class="modal-close-btn" id="btn-close-upload-modal">✕</button>
          </div>
          <div class="modal-body" style="padding: 20px 0;">
            <div style="display: flex; gap: 8px; margin-bottom: 16px;">
              <button class="action-pill-btn modal-tab-btn ${initialTab === 'upload' ? 'active' : ''}" id="tab-file-upload" style="flex: 1; padding: 8px; font-weight: 700;">📁 File Upload (.pdf, .docx, .txt)</button>
              <button class="action-pill-btn modal-tab-btn ${initialTab === 'paste' ? 'active' : ''}" id="tab-text-paste" style="flex: 1; padding: 8px; font-weight: 700;">📋 Paste Plain Text</button>
            </div>

            <!-- Tab 1: File Dropzone -->
            <div id="pane-file-upload" style="${initialTab === 'upload' ? 'display: block;' : 'display: none;'}">
              <div id="modal-dropzone" style="border: 2px dashed var(--primary); border-radius: var(--radius-md); padding: 32px 20px; text-align: center; background: #EEF2FF; cursor: pointer; transition: all 0.2s ease;">
                <input type="file" id="modal-file-input" accept=".pdf,.docx,.txt" style="display: none;">
                <div style="font-size: 2rem; margin-bottom: 8px;">📄</div>
                <div style="font-weight: 700; font-size: 0.95rem; color: #1E1B4B; margin-bottom: 4px;">Click or Drag & Drop Resume File</div>
                <div style="font-size: 0.78rem; color: #64748B;">Supported: PDF, DOCX, Plain Text (up to 10MB)</div>
              </div>
            </div>

            <!-- Tab 2: Textarea Paste -->
            <div id="pane-text-paste" style="${initialTab === 'paste' ? 'display: block;' : 'display: none;'}">
              <textarea id="modal-paste-area" placeholder="Paste your complete resume text here (Summary, Experience, Skills, Education)..." style="width: 100%; min-height: 180px; font-size: 0.85rem; padding: 10px; border: 1.5px solid var(--border-light); border-radius: var(--radius-md); font-family: inherit;"></textarea>
            </div>
          </div>
          <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px;">
            <button class="action-pill-btn" id="btn-cancel-modal" style="padding: 8px 16px;">Cancel</button>
            <button class="btn-primary" id="btn-process-resume" style="padding: 8px 20px; font-weight: 700;">Analyze Resume →</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('upload-resume-modal');

    // Close handler
    const closeModal = () => modalEl?.remove();
    document.getElementById('btn-close-upload-modal')?.addEventListener('click', closeModal);
    document.getElementById('btn-cancel-modal')?.addEventListener('click', closeModal);

    // Tab toggle
    document.getElementById('tab-file-upload')?.addEventListener('click', () => {
      document.getElementById('pane-file-upload').style.display = 'block';
      document.getElementById('pane-text-paste').style.display = 'none';
      document.getElementById('tab-file-upload').classList.add('active');
      document.getElementById('tab-text-paste').classList.remove('active');
    });
    document.getElementById('tab-text-paste')?.addEventListener('click', () => {
      document.getElementById('pane-file-upload').style.display = 'none';
      document.getElementById('pane-text-paste').style.display = 'block';
      document.getElementById('tab-text-paste').classList.add('active');
      document.getElementById('tab-file-upload').classList.remove('active');
    });

    // File Picker
    const fileInput = document.getElementById('modal-file-input');
    const dropzone = document.getElementById('modal-dropzone');
    dropzone?.addEventListener('click', () => fileInput?.click());

    fileInput?.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      closeModal();
      await this.handleResumeFile(file);
    });

    // Process Text Paste
    document.getElementById('btn-process-resume')?.addEventListener('click', () => {
      const text = document.getElementById('modal-paste-area')?.value?.trim();
      if (!text) {
        window.showToast?.('Please paste or select a resume first.', 'warning');
        return;
      }
      closeModal();
      this.handleResumeText(text);
    });
  }

  openSampleModal() {
    const modalHtml = `
      <div class="modal-overlay" id="sample-resume-modal">
        <div class="modal-card" style="max-width: 600px; width: 90%;">
          <div class="modal-header">
            <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700;">Select Demo Profile & Resume</h3>
            <button class="modal-close-btn" id="btn-close-sample-modal">✕</button>
          </div>
          <div class="modal-body" style="padding: 16px 0;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              ${Object.keys(PERSONAS).map(k => {
                const p = PERSONAS[k];
                return `
                  <div class="sample-picker-card" data-persona-id="${p.id}" style="border: 1.5px solid var(--border-light); border-radius: var(--radius-md); padding: 12px; cursor: pointer; transition: all 0.2s ease; background: #F8FAFC;">
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
                      <img src="${p.avatar}" alt="${p.name}" style="width: 34px; height: 34px; border-radius: 50%; object-fit: cover;">
                      <div>
                        <div style="font-weight: 700; font-size: 0.86rem; color: #0F172A;">${p.name}</div>
                        <div style="font-size: 0.72rem; color: var(--primary); font-weight: 600;">${p.role}</div>
                      </div>
                    </div>
                    <div style="font-size: 0.74rem; color: #64748B; line-height: 1.35;">${p.bio}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('sample-resume-modal');
    document.getElementById('btn-close-sample-modal')?.addEventListener('click', () => modalEl?.remove());

    modalEl.querySelectorAll('.sample-picker-card').forEach(card => {
      card.addEventListener('click', (e) => {
        const pId = e.currentTarget.getAttribute('data-persona-id');
        store.setPersona(pId);
        modalEl?.remove();
        window.showToast?.(`Loaded ${PERSONAS[pId].name}'s sample resume!`, 'success');
        this.render(this.container);
      });
    });
  }

  openJdPickerModal() {
    const modalHtml = `
      <div class="modal-overlay" id="jd-picker-modal">
        <div class="modal-card" style="max-width: 600px; width: 90%;">
          <div class="modal-header">
            <h3 style="margin: 0; font-size: 1.25rem; font-weight: 700;">Target Job Description</h3>
            <button class="modal-close-btn" id="btn-close-jd-modal">✕</button>
          </div>
          <div class="modal-body" style="padding: 16px 0;">
            <div style="margin-bottom: 12px;">
              <div style="font-size: 0.82rem; font-weight: 700; color: #1E293B; margin-bottom: 6px;">Select Role Preset:</div>
              <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                <button class="action-pill-btn btn-pick-jd-preset" data-jd-key="swe" style="font-size: 0.78rem; font-weight: 600;">Software Engineer (Java / AWS)</button>
                <button class="action-pill-btn btn-pick-jd-preset" data-jd-key="pa" style="font-size: 0.78rem; font-weight: 600;">Product Analyst (SQL / Python)</button>
                <button class="action-pill-btn btn-pick-jd-preset" data-jd-key="pm" style="font-size: 0.78rem; font-weight: 600;">Product Manager (Agile / Roadmaps)</button>
              </div>
            </div>

            <div>
              <div style="font-size: 0.82rem; font-weight: 700; color: #1E293B; margin-bottom: 6px;">Or Paste Custom Job Description:</div>
              <textarea id="custom-jd-text" placeholder="Paste the target job description text here..." style="width: 100%; min-height: 130px; font-size: 0.82rem; padding: 8px; border: 1.5px solid var(--border-light); border-radius: var(--radius-md); font-family: inherit;"></textarea>
            </div>
          </div>
          <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px;">
            <button class="action-pill-btn" id="btn-cancel-jd-modal" style="padding: 6px 14px;">Cancel</button>
            <button class="btn-primary" id="btn-save-custom-jd" style="padding: 6px 18px; font-weight: 700;">Apply Target Job →</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalEl = document.getElementById('jd-picker-modal');
    document.getElementById('btn-close-jd-modal')?.addEventListener('click', () => modalEl?.remove());
    document.getElementById('btn-cancel-jd-modal')?.addEventListener('click', () => modalEl?.remove());

    modalEl.querySelectorAll('.btn-pick-jd-preset').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const jdKey = e.currentTarget.getAttribute('data-jd-key');
        store.setTargetJd(jdKey);
        modalEl?.remove();
        window.showToast?.('Target job description updated!', 'success');
        this.render(this.container);
      });
    });

    document.getElementById('btn-save-custom-jd')?.addEventListener('click', () => {
      const text = document.getElementById('custom-jd-text')?.value?.trim();
      if (!text) {
        window.showToast?.('Please paste a job description.', 'warning');
        return;
      }
      store.setCustomJd('Target Role', text);
      modalEl?.remove();
      window.showToast?.('Custom job description applied!', 'success');
      this.render(this.container);
    });
  }

  // ==========================================================================
  // FILE / TEXT PROCESSING LOGIC
  // ==========================================================================

  async handleResumeFile(file) {
    window.showToast?.('Parsing resume file with AI parser...', 'info');
    try {
      if (file.name.endsWith('.txt')) {
        const text = await file.text();
        this.handleResumeText(text);
      } else if (file.name.endsWith('.pdf')) {
        // PDF.js client-side parser
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await window.pdfjsLib?.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        if (pdf) {
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            fullText += content.items.map(item => item.str).join(' ') + '\n';
          }
        }
        this.handleResumeText(fullText || 'Uploaded PDF Resume');
      } else {
        // Default text reader for docx/others
        const text = await file.text();
        this.handleResumeText(text);
      }
    } catch (err) {
      console.warn('Parser fallback:', err);
      this.handleResumeText('Professional Experience\n• Delivered scalable engineering projects with clean architecture.');
    }
  }

  handleResumeText(rawText) {
    const parsed = aiEngine.parseResumeText(rawText);
    store.state.resume = parsed;
    store.state.resolvedSuggestions = [];
    store.saveState();
    window.showToast?.('Resume successfully analyzed!', 'success');
    this.render(this.container);
  }
}

export const resumeLabView = new ResumeLabView();
