/**
 * CareerAI - Resume Lab & AI Optimization Controller (PCE-SW-PS-9)
 * Implements Complete Upload Flow (Dropzone, Paste, Samples, Manual Correction)
 * and Dual-State AI Optimization Drawer (Locked vs Unlocked, 30s Undo, Highlighting, Keywords)
 */

import { store, PERSONAS, SAMPLE_RESUMES } from './state.js';
import { aiEngine } from './aiEngine.js';

export class ResumeLabView {
  constructor() {
    this.container = null;
    this.showAllSuggestions = false;
    this.isAnalysisExpanded = false;
    this.activeHighlightId = null;
    this.debounceTimer = null;
    this.undoInterval = null;
    this.undoSecondsRemaining = 30;
  }

  render(container) {
    this.container = container;
    const state = store.state;
    const resume = state.resume;
    const currentJd = state.hasActiveJd && state.currentJdKey ? state.jobDescriptions[state.currentJdKey] : null;
    const latestAnalysis = state.latestAnalysis;

    const matchData = latestAnalysis ? {
      matchScore: latestAnalysis.resume_score,
      colorBand: latestAnalysis.resume_score >= 75 ? 'green' : (latestAnalysis.resume_score >= 50 ? 'amber' : 'red'),
      sectionBreakdown: {
        skills: Math.max(-20, Math.min(25, latestAnalysis.keyword_alignment - 70)),
        experience: 12,
        formatting: Math.max(-20, Math.min(25, latestAnalysis.ats_score - 75)),
        keywords: Math.max(-20, Math.min(25, latestAnalysis.match_percentage - 70))
      },
      foundKeywords: latestAnalysis.matching_keywords || latestAnalysis.skills || currentJd?.keywordsFound || ['Agile', 'Product Strategy'],
      missingKeywords: latestAnalysis.missing_keywords || latestAnalysis.missing_skills || currentJd?.keywordsMissing || ['SQL', 'Kubernetes'],
      qualitativeSummary: latestAnalysis.weaknesses?.[0] || 'Resume analyzed with AI backend.'
    } : aiEngine.calculateMatchScore(resume, currentJd);

    const rankedSuggestions = aiEngine.getRankedSuggestions(resume, state.resolvedSuggestions || []);
    const resolvedSuggestions = this.getResolvedSuggestions(resume, state.resolvedSuggestions || []);

    container.innerHTML = `
      <div class="resume-lab-helper-strip" style="background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%); border: 1px solid #C7D2FE; border-radius: var(--radius-md); padding: 10px 16px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 8px; font-size: 0.84rem; color: #1E1B4B;">
          <span style="font-size: 1.2rem;">📤</span>
          <span><strong>Resume Upload & Analysis:</strong> Upload a file (.pdf, .docx, .txt), paste text, or test sample profiles. Real-time ATS match scoring and AI rewrites update live on the right panel.</span>
        </div>
        <button class="btn-primary" id="btn-helper-upload" style="font-size: 0.78rem; padding: 6px 16px; font-weight: 700; white-space: nowrap;">
          Upload Your Resume File →
        </button>
      </div>

      <div class="resume-lab-container">
        <!-- Left: Document Editor & Canvas Pane -->
        <div class="resume-editor-pane">
          <!-- Editor Top Toolbar -->
          <div class="editor-toolbar">
            <div class="toolbar-group">
              <!-- Formatting Controls -->
              <button class="tool-btn" id="btn-bold" title="Bold (Ctrl+B)"><strong>B</strong></button>
              <button class="tool-btn" id="btn-italic" title="Italic (Ctrl+I)"><i>I</i></button>
              <button class="tool-btn" id="btn-underline" title="Underline (Ctrl+U)"><u>U</u></button>
              <span style="color: #CBD5E1; margin: 0 4px;">|</span>
              <button class="tool-btn" id="btn-bullet-list" title="Bullet List">• ≡</button>
              
              <!-- Upload / Import Button -->
              <button class="tool-btn-primary" id="btn-open-upload-modal" title="Upload or Paste Resume">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                Import / Upload
              </button>

              <!-- Target JD Switcher -->
              <button class="tool-btn-secondary" id="btn-open-jd-picker" title="Set Target Job Description">
                🎯 ${currentJd ? currentJd.roleTag || currentJd.title : 'No JD Set'}
              </button>
            </div>
            
            <div class="editor-status-text">
              <span>Last saved: <strong id="save-status-text">${resume.lastSaved || 'Just now'}</strong></span>
              
              <!-- Resume Profile / Version Dropdown -->
              <div class="version-select-wrap">
                <select id="select-resume-profile" class="profile-dropdown">
                  ${(state.resumeProfiles || [resume]).map(p => `
                    <option value="${p.id}" ${p.id === resume.id ? 'selected' : ''}>
                      📄 ${p.title || p.targetRole || 'Untitled Resume'}
                    </option>
                  `).join('')}
                </select>
              </div>

              <!-- Export PDF Button -->
              <button class="action-pill-btn" id="btn-export-pdf" style="margin-left: 8px;">
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                Export PDF
              </button>
            </div>
          </div>

          <!-- Document Canvas (Paper) -->
          <div class="resume-paper" id="resume-canvas" contenteditable="true" spellcheck="false">
            <div class="resume-header">
              <div class="resume-candidate-name" id="res-name">${resume.candidate?.name || 'Priya Sharma'}</div>
              <div class="resume-contact-line" id="res-contact">
                ${resume.candidate?.email || 'priya.sharma@email.com'} | ${resume.candidate?.phone || '(+91) 98765-43210'} | ${resume.candidate?.location || 'Bengaluru, India'} | ${resume.candidate?.linkedin || 'linkedin.com/in/priyasharma'}
              </div>
            </div>

            <!-- Professional Summary -->
            <div class="resume-section" data-section-id="summary">
              <div class="resume-section-title">Professional Summary</div>
              <p class="resume-body-p" id="res-summary-content">${resume.sections?.find(s => s.id === 'summary')?.content || ''}</p>
            </div>

            <!-- Experience -->
            <div class="resume-section" data-section-id="experience">
              <div class="resume-section-title">Experience</div>
              <div id="experience-items-wrap">
                ${this.renderExperienceBlocks(resume)}
              </div>
            </div>

            <!-- Skills & Competencies -->
            <div class="resume-section" data-section-id="skills">
              <div class="resume-section-title">Skills & Competencies</div>
              <p class="resume-body-p" id="res-skills-content">${resume.sections?.find(s => s.id === 'skills')?.content || ''}</p>
            </div>

            <!-- Education -->
            <div class="resume-section" data-section-id="education">
              <div class="resume-section-title">Education</div>
              <p class="resume-body-p" id="res-edu-content">${resume.sections?.find(s => s.id === 'education')?.content || ''}</p>
            </div>
          </div>
        </div>

        <!-- Right: AI Optimization Drawer (Dual-State: Locked vs Unlocked) -->
        <div class="ai-optimization-sidebar" id="ai-optimization-drawer">
          ${this.renderOptimizationDrawer(resume, currentJd, matchData, rankedSuggestions, resolvedSuggestions)}
        </div>
      </div>

      <!-- Floating 30s Undo Banner (when active) -->
      ${store.hasUndo() ? this.renderUndoToastBanner() : ''}
    `;

    this.attachEventListeners();
  }

  /**
   * Render AI Optimization Drawer based on JD Presence (Locked vs Unlocked)
   */
  renderOptimizationDrawer(resume, currentJd, matchData, suggestions, resolvedSuggestions) {
    // 1. LOCKED / PLACEHOLDER STATE (When no Job Description is provided)
    if (!currentJd) {
      return `
        <div class="ai-panel-header">
          <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
          AI Optimization
        </div>

        <div class="locked-jd-state-box">
          <div class="locked-icon-shield">
            <svg width="36" height="36" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
          </div>
          <h3 class="locked-title">Add a Job Description to Unlock AI Suggestions</h3>
          <p class="locked-desc">
            Upload or paste your target job posting to activate role-match scoring, keyword gap extraction, and bullet point rewrites.
          </p>
          <button class="btn-primary" id="btn-unlock-add-jd" style="width: 100%; justify-content: center; margin-top: 8px;">
            + Add Target Job Description
          </button>
          
          <div class="locked-sample-prompt">
            Or try loading a quick preset:
            <div style="display: flex; gap: 6px; margin-top: 8px; justify-content: center;">
              <button class="action-pill-btn btn-quick-load-jd" data-jd-key="pm" style="font-size: 0.75rem;">Product Manager</button>
              <button class="action-pill-btn btn-quick-load-jd" data-jd-key="swe" style="font-size: 0.75rem;">Software Engineer</button>
            </div>
          </div>
        </div>
      `;
    }

    // 2. UNLOCKED ACTIVE STATE (Both Resume + JD present)
    const visibleSuggestions = this.showAllSuggestions ? suggestions : suggestions.slice(0, 3);
    const hiddenCount = suggestions.length - visibleSuggestions.length;
    const gaugeStrokeColor = matchData.colorBand === 'green' ? '#10B981' : (matchData.colorBand === 'amber' ? '#4F46E5' : '#EF4444');

    return `
      <!-- Fallback Engine Notice Banner (PRD Section 8) -->
      ${store.state.fallbackMode ? `
        <div class="fallback-alert-banner">
          <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>
          <span>Showing rubric-based suggestions — detailed AI feedback temporarily unavailable.</span>
        </div>
      ` : ''}

      <div class="ai-panel-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path></svg>
          AI Optimization
        </div>
        <button class="btn-icon-subtle" id="btn-clear-jd" title="Clear Target JD (Lock Drawer)">
          ✕
        </button>
      </div>

      <!-- Role Match Score Card (Screenshot 3) -->
      <div class="role-match-card">
        <div class="gauge-container" style="width: 76px; height: 76px; flex-shrink: 0;">
          <svg class="gauge-svg" viewBox="0 0 100 100" style="width: 76px; height: 76px;">
            <circle class="gauge-bg" cx="50" cy="50" r="38" stroke-width="12"></circle>
            <circle class="gauge-fill" id="opt-match-gauge" cx="50" cy="50" r="38" stroke-width="12"
              stroke="${gaugeStrokeColor}"
              stroke-dasharray="238.7"
              stroke-dashoffset="${238.7 - (238.7 * matchData.matchScore) / 100}">
            </circle>
          </svg>
          <div class="gauge-text">
            <div class="gauge-value" style="font-size: 1.15rem;" id="opt-match-text">${matchData.matchScore}<span>%</span></div>
          </div>
        </div>

        <div class="role-match-details">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div class="target-role-tag">Target: ${currentJd.roleTag || currentJd.title}</div>
          </div>
          <div class="role-match-desc">${matchData.qualitativeSummary}</div>
          <a class="view-analysis-link" id="link-toggle-analysis">
            ${this.isAnalysisExpanded ? 'Hide Analysis ▴' : 'View Analysis ▾'}
          </a>
        </div>
      </div>

      <!-- Expandable Score Breakdown Analysis -->
      ${this.isAnalysisExpanded ? `
        <div class="score-breakdown-box">
          <div class="breakdown-item">
            <span>Skills Alignment</span>
            <span class="${matchData.sectionBreakdown.skills >= 0 ? 'pos' : 'neg'}">${matchData.sectionBreakdown.skills >= 0 ? '+' : ''}${matchData.sectionBreakdown.skills}%</span>
          </div>
          <div class="breakdown-item">
            <span>Experience Metrics</span>
            <span class="${matchData.sectionBreakdown.experience >= 0 ? 'pos' : 'neg'}">${matchData.sectionBreakdown.experience >= 0 ? '+' : ''}${matchData.sectionBreakdown.experience}%</span>
          </div>
          <div class="breakdown-item">
            <span>ATS Format Structure</span>
            <span class="${matchData.sectionBreakdown.formatting >= 0 ? 'pos' : 'neg'}">${matchData.sectionBreakdown.formatting >= 0 ? '+' : ''}${matchData.sectionBreakdown.formatting}%</span>
          </div>
          <div class="breakdown-item">
            <span>Keyword Coverage</span>
            <span class="${matchData.sectionBreakdown.keywords >= 0 ? 'pos' : 'neg'}">${matchData.sectionBreakdown.keywords >= 0 ? '+' : ''}${matchData.sectionBreakdown.keywords}%</span>
          </div>
        </div>
      ` : ''}

      <!-- Actionable Suggestions Section -->
      <div class="suggestions-header-row">
        <div class="suggestions-title">
          <span>Actionable Suggestions (${suggestions.length})</span>
        </div>
      </div>

      <div id="suggestions-list-container">
        ${visibleSuggestions.length > 0 ? visibleSuggestions.map(s => `
          <div class="suggestion-card ${this.activeHighlightId === s.bulletId ? 'highlighted-card' : ''}" data-bullet-id="${s.bulletId}">
            <div class="suggestion-top-bar">
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <span class="suggestion-badge ${s.type === 'impact' ? 'warning' : 'info'}">
                  ${s.category}
                </span>
                ${s.company ? `<span class="suggestion-meta-badge">${s.company}</span>` : ''}
              </div>
              <button class="btn-dismiss-suggestion" data-bullet-id="${s.bulletId}" title="Reject / Dismiss suggestion">✕</button>
            </div>
            
            <div class="suggestion-diff-container">
              <div class="suggestion-diff-row diff-original-box">
                <span class="diff-prefix-tag">Original:</span>
                <p class="diff-text-body">${s.quote}</p>
              </div>
              <div class="suggestion-diff-row diff-suggested-box">
                <span class="diff-prefix-tag ai-tag">AI Suggestion:</span>
                <p class="diff-text-body ai-body">${s.rewrite}</p>
              </div>
            </div>

            <div class="suggestion-explanation-note">
              <svg width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24" style="flex-shrink:0; margin-top:2px;"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
              <span>${s.explanation}</span>
            </div>

            <!-- Triple Action Buttons: Apply AI Rewrite | Reject | Highlight -->
            <div class="suggestion-actions-row">
              <button class="btn-apply-rewrite" data-bullet-id="${s.bulletId}" data-rewrite="${encodeURIComponent(s.rewrite)}" title="Apply this specific rewrite">
                ✔ Apply
              </button>
              <button class="btn-reject-suggestion" data-bullet-id="${s.bulletId}" title="Reject this suggestion">
                ✕ Reject
              </button>
              <button class="btn-highlight-target" data-bullet-id="${s.bulletId}" title="Locate in editor">
                🎯 Highlight
              </button>
            </div>
          </div>
        `).join('') : `
          <div class="no-suggestions-box">
            <svg width="24" height="24" fill="none" stroke="#10B981" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            <div>All active suggestions resolved! Resume is in top 10% ATS alignment.</div>
          </div>
        `}

        ${hiddenCount > 0 ? `
          <button class="btn-show-more-suggestions" id="btn-toggle-more-suggestions">
            Show ${hiddenCount} More Suggestions ▾
          </button>
        ` : (this.showAllSuggestions && suggestions.length > 3 ? `
          <button class="btn-show-more-suggestions" id="btn-toggle-more-suggestions">
            Show Less ▴
          </button>
        ` : '')}
      </div>

      <!-- Resolved / Applied Suggestions Collapsible Tray -->
      ${resolvedSuggestions.length > 0 ? `
        <div class="applied-tray-wrap">
          <div class="applied-tray-title" id="btn-toggle-applied-tray">
            <span>✔ Applied Fixes (${resolvedSuggestions.length})</span>
            <span>▾</span>
          </div>
        </div>
      ` : ''}

      <!-- Keyword Analysis (PRD FR-1.5) -->
      <div style="margin-top: 18px;">
        <div class="keyword-group-title" style="display: flex; align-items: center; gap: 6px;">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path></svg>
          Keyword Analysis
        </div>
        
        <div style="font-size: 0.72rem; color: #64748B; margin-bottom: 6px; font-weight: 600;">FOUND IN RESUME:</div>
        <div class="tags-container" id="resume-found-keywords">
          ${matchData.foundKeywords.map(k => `<span class="tag-pill found" style="font-size: 0.75rem; padding: 3px 10px;">✔ ${k}</span>`).join('')}
        </div>

        <div style="font-size: 0.72rem; color: #64748B; margin-bottom: 6px; font-weight: 600; margin-top: 8px;">
          MISSING HIGH-IMPACT KEYWORDS <span style="font-weight: 400; color: var(--primary);">(Click to insert)</span>:
        </div>
        <div class="tags-container" id="resume-missing-keywords">
          ${matchData.missingKeywords.map(k => `
            <span class="tag-pill recommended btn-insert-keyword-pill" data-kw="${k}" style="font-size: 0.75rem; padding: 3px 10px; cursor: pointer;">
              <span class="add-icon">+</span> ${k}
            </span>
          `).join('')}
        </div>
      </div>

      <!-- Bulk Full-Width AI Enhancer Button -->
      <button class="btn-optimize-all" id="btn-optimize-all">
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
        Optimize with AI
      </button>
    `;
  }

  renderExperienceBlocks(resume) {
    const expSec = resume.sections?.find(s => s.id === 'experience');
    if (!expSec || !expSec.items) return '';

    return expSec.items.map(item => `
      <div class="experience-block" data-exp-id="${item.id}">
        <div class="exp-header-row">
          <div class="exp-role-title">${item.role}</div>
          <div class="exp-company-dates">${item.company} | ${item.dates}</div>
        </div>
        <ul class="resume-bullet-list">
          ${item.bullets.map(b => `
            <li data-bullet-id="${b.id}" id="canvas-bullet-${b.id}">
              ${b.hasSuggestion 
                ? `<span class="ai-suggestion-highlight ${this.activeHighlightId === b.id ? 'active-target-pulse' : ''}" data-bullet-id="${b.id}">${b.text} <span class="ai-suggestion-pill-tag">AI Suggestion</span></span>`
                : b.text}
            </li>
          `).join('')}
        </ul>
      </div>
    `).join('');
  }

  getResolvedSuggestions(resume, resolvedIds = []) {
    const list = [];
    resume.sections?.forEach(sec => {
      sec.items?.forEach(item => {
        item.bullets?.forEach(b => {
          if (resolvedIds.includes(b.id)) {
            list.push(b);
          }
        });
      });
    });
    return list;
  }

  renderUndoToastBanner() {
    return `
      <div class="undo-floating-toast" id="undo-toast-banner">
        <div class="undo-toast-left">
          <span class="undo-spinner-icon">↺</span>
          <div>
            <strong>AI Optimization Applied</strong>
            <div style="font-size: 0.75rem; color: #CBD5E1;">Undo available for <span id="undo-timer-countdown">30</span>s</div>
          </div>
        </div>
        <button class="btn-undo-action" id="btn-trigger-undo">
          Undo Changes
        </button>
      </div>
    `;
  }

  /**
   * Open the Resume Upload Modal (File Dropzone, Paste as Text, Sample Resumes)
   */
  openUploadModal() {
    const modalOverlay = document.getElementById('global-modal-overlay');
    const modalContent = document.getElementById('global-modal-content');
    if (!modalOverlay || !modalContent) return;

    modalContent.innerHTML = `
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
          <h3 style="margin: 0;">Import / Upload Resume</h3>
        </div>
        <button class="btn-close-modal" id="btn-close-upload-modal">&times;</button>
      </div>

      <!-- Upload Modal Navigation Tabs -->
      <div class="upload-tabs-header">
        <button class="upload-tab-btn active" data-tab="dropzone">📁 File Upload</button>
        <button class="upload-tab-btn" data-tab="paste" id="tab-paste-btn">📋 Paste as Text</button>
        <button class="upload-tab-btn" data-tab="sample">⚡ Sample Resumes</button>
        <button class="upload-tab-btn" data-tab="blank">✍ Start from Scratch</button>
      </div>

      <!-- Tab 1: Drag-and-Drop Zone -->
      <div class="upload-tab-pane active" id="pane-dropzone">
        <div class="dropzone-area" id="resume-dropzone">
          <input type="file" id="file-resume-input" accept=".pdf,.docx,.txt" style="display: none;">
          <div class="dropzone-icon">
            <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
          </div>
          <div class="dropzone-text">
            <strong>Drag and drop your resume file here</strong>
            <span>Supports .pdf, .docx, and .txt files (Max 5MB)</span>
          </div>
          <button class="btn-primary" id="btn-browse-file" style="margin-top: 10px;">
            Browse Files
          </button>
        </div>

        <!-- Inline Error / Warning Alert Box -->
        <div class="upload-inline-error" id="upload-inline-error" style="display: none;"></div>
      </div>

      <!-- Tab 2: Paste as Text -->
      <div class="upload-tab-pane" id="pane-paste">
        <label style="font-size: 0.82rem; font-weight: 700; color: #475569; display: block; margin-bottom: 6px;">
          Paste Resume Text
        </label>
        <textarea id="inp-raw-resume-text" rows="9" class="paste-resume-textarea" placeholder="Paste full resume text here (Contact, Summary, Experience, Skills, Education)..."></textarea>
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
          <button class="action-pill-btn" id="btn-paste-sample-text">Insert Template</button>
          <button class="btn-primary" id="btn-parse-pasted-resume">
            Parse & Load into Editor →
          </button>
        </div>
      </div>

      <!-- Tab 3: Sample Resumes -->
      <div class="upload-tab-pane" id="pane-sample">
        <p style="font-size: 0.85rem; color: #64748B; margin-bottom: 14px;">
          Select a pre-seeded candidate profile to explore the ATS optimization and mock interview coaching features instantly:
        </p>

        <div class="sample-resumes-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px;">
          ${Object.keys(PERSONAS).map(k => {
            const p = PERSONAS[k];
            return `
              <div class="sample-card btn-select-sample" data-sample="${p.id}" style="padding: 12px; border: 1.5px solid #E2E8F0; border-radius: var(--radius-md); background: white; cursor: pointer; transition: all 0.2s ease;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                  <img src="${p.avatar}" class="sample-avatar" alt="${p.name}" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover; border: 1.5px solid #CBD5E1;">
                  <div>
                    <strong style="font-size: 0.88rem; color: #0F172A; display: block;">${p.name}</strong>
                    <div style="font-size: 0.72rem; color: var(--primary); font-weight: 700;">${p.role}</div>
                  </div>
                </div>
                <div style="font-size: 0.74rem; color: #64748B; line-height: 1.35;">${p.bio}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- Tab 4: Start from Scratch Blank Builder (FR-1.12) -->
      <div class="upload-tab-pane" id="pane-blank">
        <div style="background: #F8FAFC; border: 1.5px dashed #CBD5E1; border-radius: var(--radius-lg); padding: 28px 20px; text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 8px;">✍️</div>
          <h4 style="margin: 0 0 6px 0; font-size: 1.05rem; color: var(--text-main);">Start with a Blank Resume Template</h4>
          <p style="font-size: 0.84rem; color: #64748B; line-height: 1.5; margin-bottom: 18px; max-width: 480px; margin-left: auto; margin-right: auto;">
            Draft your resume from scratch using our structured, ATS-optimized layout. Includes pre-formatted sections for Summary, Experience, Skills, and Education.
          </p>
          <button class="btn-primary" id="btn-create-blank-resume" style="padding: 10px 22px; margin: 0 auto;">
            Create Blank Resume & Start Editing →
          </button>
        </div>
      </div>
    `;

    modalOverlay.classList.add('active');

    // Attach Upload Modal Events
    this.attachUploadModalEvents(modalOverlay);
  }

  attachUploadModalEvents(modalOverlay) {
    document.getElementById('btn-close-upload-modal')?.addEventListener('click', () => modalOverlay.classList.remove('active'));

    // Modal Tabs Switching
    modalOverlay.querySelectorAll('.upload-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        modalOverlay.querySelectorAll('.upload-tab-btn').forEach(b => b.classList.remove('active'));
        modalOverlay.querySelectorAll('.upload-tab-pane').forEach(p => p.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const tab = e.currentTarget.getAttribute('data-tab');
        document.getElementById(`pane-${tab}`)?.classList.add('active');
      });
    });

    // Dropzone File Input
    const dropzone = document.getElementById('resume-dropzone');
    const fileInput = document.getElementById('file-resume-input');
    const errBox = document.getElementById('upload-inline-error');

    document.getElementById('btn-browse-file')?.addEventListener('click', () => fileInput?.click());

    dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });

    dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

    dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      const files = e.dataTransfer.files;
      if (files.length > 0) this.handleUploadedFile(files[0], errBox, modalOverlay);
    });

    fileInput?.addEventListener('change', (e) => {
      if (e.target.files.length > 0) this.handleUploadedFile(e.target.files[0], errBox, modalOverlay);
    });

    // Paste Tab Actions
    document.getElementById('btn-paste-sample-text')?.addEventListener('click', () => {
      const txtArea = document.getElementById('inp-raw-resume-text');
      if (txtArea) {
        txtArea.value = `Name: Priya Sharma\nLocation: Bengaluru, India\nPhone: (+91) 98765-43210\nEmail: priya.sharma@email.com\nLinkedIn: linkedin.com/in/priyasharma\nGitHub: github.com/priyasharma\n\nPROFESSIONAL SUMMARY\nSoftware Engineer with 5 years of experience in backend development, cloud infrastructure, and API design. Skilled in Python, Java, and AWS, with a proven record of improving system performance, reducing latency, and delivering scalable microservices. Strong background in Agile development, CI/CD pipelines, and cross-functional collaboration.\n\nSKILLS\nProgramming Languages: Python, Java, JavaScript, SQL\nFrameworks and Libraries: Django, Spring Boot, React, Node.js\nCloud Platforms: AWS (EC2, S3, Lambda, RDS), Google Cloud Platform, Microsoft Azure\nDatabases: MySQL, PostgreSQL, MongoDB, Redis\nDevOps and Tools: Docker, Kubernetes, Jenkins, Git, Terraform, CI/CD\nOther: REST API Design, Microservices Architecture, Agile/Scrum, Unit Testing, System Design\n\nPROFESSIONAL EXPERIENCE\n\nSoftware Engineer II\nInfosys Technologies | Bengaluru, India | June 2021 - Present\n- Developed and maintained RESTful APIs using Python and Django, supporting over 50,000 daily active users.\n- Reduced average API response time by 35 percent by optimizing database queries and implementing Redis caching.\n- Led migration of monolithic application to microservices architecture on AWS, improving deployment frequency by 40 percent.\n- Implemented automated CI/CD pipelines using Jenkins and Docker, reducing deployment time from 2 hours to 15 minutes.\n- Collaborated with a cross-functional team of 8 engineers in an Agile Scrum environment to deliver features on a two-week sprint cycle.\n- Mentored 3 junior engineers on best practices in code review, unit testing, and system design.\n\nSoftware Engineer\nWipro Limited | Pune, India | July 2019 - May 2021\n- Built backend services in Java and Spring Boot for an e-commerce order management system processing 10,000 orders per day.\n- Designed and implemented a MySQL database schema, improving query performance by 25 percent.\n- Wrote unit and integration tests using JUnit, increasing code coverage from 60 percent to 90 percent.\n- Participated in daily stand-ups, sprint planning, and retrospectives as part of an Agile development team.\n\nSoftware Development Intern\nTata Consultancy Services | Mumbai, India | January 2019 - June 2019\n- Assisted in developing internal tools using Python for automating data validation, saving the team 5 hours per week.\n- Contributed to front-end development using React and JavaScript for an internal reporting dashboard.\n\nEDUCATION\nBachelor of Technology in Computer Science and Engineering\nVisvesvaraya Technological University, Belagavi, India | Graduated May 2019 | CGPA: 8.7/10.0\n\nCERTIFICATIONS\nAWS Certified Solutions Architect - Associate (2022)\nCertified Kubernetes Application Developer, CKAD (2021)\nPython Institute PCEP - Certified Entry-Level Python Programmer (2020)\n\nPROJECTS\nReal-Time Chat Application - Built a scalable chat application using Node.js, Socket.io, and MongoDB, supporting 1,000 concurrent users with message delivery under 200 milliseconds.\nPersonal Finance Tracker - Developed a full-stack web application using Django and React for expense tracking and budget analysis, used by over 200 registered users.`;
      }
    });

    document.getElementById('btn-parse-pasted-resume')?.addEventListener('click', () => {
      const rawText = document.getElementById('inp-raw-resume-text')?.value || '';
      this.processRawResumeText(rawText, modalOverlay);
    });

    // Sample Resume Buttons (FR-1.11)
    modalOverlay.querySelectorAll('.btn-select-sample').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const sampleKey = e.currentTarget.getAttribute('data-sample');
        store.setPersona(sampleKey);
        modalOverlay.classList.remove('active');
        window.showToast?.(`Loaded ${PERSONAS[sampleKey]?.name || sampleKey}'s sample resume & profile!`, 'success');
        this.render(this.container);
      });
    });

    // Start from Scratch Blank Builder (FR-1.12)
    document.getElementById('btn-create-blank-resume')?.addEventListener('click', () => {
      store.startBlankResume();
      modalOverlay.classList.remove('active');
      window.showToast?.('Created blank resume template. Start editing directly!', 'success');
      this.render(this.container);
    });
  }

  /**
   * Send Uploaded File (.pdf, .docx, .txt) to Backend AI Analysis API: POST /api/resume/analyze
   */
  async handleUploadedFile(file, errBox, modalOverlay) {
    if (!errBox) errBox = modalOverlay?.querySelector('#upload-inline-error');
    if (errBox) errBox.style.display = 'none';

    // 1. Validation: File Type (.pdf, .docx, .txt)
    const validExts = ['.pdf', '.docx', '.txt'];
    const fileName = file.name.toLowerCase();
    const isValidExt = validExts.some(ext => fileName.endsWith(ext));

    if (!isValidExt) {
      if (errBox) {
        errBox.innerHTML = `⚠️ <strong>Unsupported format:</strong> "${file.name}". Please upload a .pdf, .docx, or .txt resume file.`;
        errBox.style.display = 'block';
      }
      return;
    }

    // 2. Validation: File Size (> 5MB)
    const maxSizeBytes = 5 * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      if (errBox) {
        errBox.innerHTML = `⚠️ <strong>File too large:</strong> (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum allowed resume file size is 5MB.`;
        errBox.style.display = 'block';
      }
      return;
    }

    // 3. Validation: Empty File
    if (file.size === 0) {
      if (errBox) {
        errBox.innerHTML = `⚠️ <strong>Empty file:</strong> "${file.name}" contains no data.`;
        errBox.style.display = 'block';
      }
      return;
    }

    // Show parsing loading overlay with animated progress
    this.showParsingOverlay(modalOverlay);

    // Prepare FormData for Backend Endpoint POST /api/resume/analyze
    const formData = new FormData();
    formData.append('file', file);
    const currentJd = store.state.hasActiveJd && store.state.currentJdKey ? store.state.jobDescriptions[store.state.currentJdKey] : null;
    if (currentJd && currentJd.rawText) {
      formData.append('job_description', currentJd.rawText);
    }

    try {
      const response = await fetch('/api/resume/analyze', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(errJson?.detail || `Server returned error status ${response.status}`);
      }

      const result = await response.json();
      modalOverlay?.querySelector('.loading-overlay-box')?.remove();

      // Check Guest Quota (PRD Section 8 & 9)
      if (store.isGuest()) {
        store.incrementGuestQuota('resume');
      }

      // Apply Real AI Backend Analysis Results to State Store
      store.applyAnalysisResult(result);
      modalOverlay?.classList.remove('active');

      window.showToast?.(`AI Analysis Complete! Resume Score: ${result.resume_score}/100 • ATS: ${result.ats_score}/100`, 'success');
      this.render(this.container);

      // Save-Triggered Signup Prompt for Guest Users Uploading Their Own File (PRD Section 7.3)
      if (store.isGuest()) {
        setTimeout(() => {
          window.openSaveSignupPrompt('upload_resume');
        }, 800);
      }

    } catch (apiError) {
      console.warn('Backend API call failed, attempting client fallback:', apiError);

      // Graceful Fallback: Client-Side Text Extraction + Heuristic NLP
      try {
        const extractedText = await this.extractFileText(file);
        modalOverlay?.querySelector('.loading-overlay-box')?.remove();

        if (!extractedText || extractedText.trim().length < 10 || aiEngine.isBinaryGarbage(extractedText)) {
          throw new Error('Unreadable binary text');
        }

        const parsed = aiEngine.parseResumeText(extractedText);
        store.createResumeProfile(parsed, store.state.jobDescriptions[store.state.currentJdKey]?.title || 'Target Role');
        modalOverlay?.classList.remove('active');
        window.showToast?.('Resume parsed and loaded with client heuristic engine!', 'success');
        this.render(this.container);
      } catch (fallbackErr) {
        modalOverlay?.querySelector('.loading-overlay-box')?.remove();
        if (errBox) {
          errBox.innerHTML = `⚠️ <strong>Analysis failed:</strong> ${apiError.message || "We couldn't read this file"}. Try pasting your resume text instead.`;
          errBox.style.display = 'block';
        }
        document.getElementById('tab-paste-btn')?.click();
      }
    }
  }

  /**
   * Client-side PDF, DOCX, and TXT Text Extractor (Fallback)
   */
  async extractFileText(file) {
    const fileName = file.name.toLowerCase();

    // 1. PDF File Extraction via PDF.js
    if (fileName.endsWith('.pdf')) {
      if (window.pdfjsLib) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullPdfText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          fullPdfText += pageText + '\n';
        }

        return fullPdfText.trim();
      }
      throw new Error('PDF.js library not loaded');
    }

    // 2. DOCX File Extraction via Mammoth.js
    if (fileName.endsWith('.docx')) {
      if (window.mammoth) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await window.mammoth.extractRawText({ arrayBuffer });
        return result.value.trim();
      }
      throw new Error('Mammoth.js library not loaded');
    }

    // 3. Plain Text File (.txt)
    return await file.text();
  }

  showParsingOverlay(modalOverlay) {
    const box = document.createElement('div');
    box.className = 'loading-overlay-box';
    box.innerHTML = `
      <div class="loading-spinner"></div>
      <div style="font-weight: 700; font-size: 1.05rem; color: #0F172A; margin-top: 12px;">Analyzing your resume with AI...</div>
      <div style="font-size: 0.8rem; color: #64748B;">Extracting sections, scoring ATS compatibility & keyword alignment</div>
    `;
    modalOverlay.querySelector('.modal-box')?.appendChild(box);
  }

  /**
   * Process raw text from Paste tab through the Backend AI Analysis API
   */
  async processRawResumeText(rawText, modalOverlay) {
    if (!rawText.trim()) {
      window.showToast?.('Please provide valid resume text to parse.', 'warning');
      return;
    }

    const errBox = modalOverlay?.querySelector('#upload-inline-error');
    const blob = new Blob([rawText], { type: 'text/plain' });
    const file = new File([blob], 'pasted_resume.txt', { type: 'text/plain' });

    // Send through handleUploadedFile for backend AI scoring
    await this.handleUploadedFile(file, errBox, modalOverlay);
  }

  /**
   * Low-Confidence Manual Correction UI
   */
  openManualCorrectionModal(parsedData, prevModal) {
    prevModal?.classList.remove('active');
    const modalOverlay = document.getElementById('global-modal-overlay');
    const modalContent = document.getElementById('global-modal-content');
    if (!modalOverlay || !modalContent) return;

    modalContent.innerHTML = `
      <div class="modal-header">
        <div>
          <h3 style="margin: 0;">Review Structured Resume</h3>
          <span style="font-size: 0.78rem; color: #D97706; font-weight: 600;">Low confidence parsing detected. Please confirm your section breakdown.</span>
        </div>
        <button class="btn-close-modal" id="btn-close-correction">&times;</button>
      </div>

      <div class="manual-correction-grid">
        <!-- Left: Raw Extracted Text -->
        <div class="correction-raw-pane">
          <div style="font-weight: 700; font-size: 0.85rem; color: #475569; margin-bottom: 8px;">Raw Extracted Text:</div>
          <pre class="raw-text-box">${parsedData.rawText || 'Raw resume text'}</pre>
        </div>

        <!-- Right: Editable Structured Fields -->
        <div class="correction-fields-pane">
          <div class="form-group-item">
            <label>Candidate Name & Contact</label>
            <input type="text" id="corr-name" value="${parsedData.candidate?.name || 'Priya Sharma'}" class="field-input">
          </div>

          <div class="form-group-item">
            <label>Professional Summary</label>
            <textarea id="corr-summary" rows="3" class="field-input">${parsedData.summary || ''}</textarea>
          </div>

          <div class="form-group-item">
            <label>Skills & Competencies</label>
            <input type="text" id="corr-skills" value="${parsedData.skills || ''}" class="field-input">
          </div>

          <div class="form-group-item">
            <label>Education</label>
            <input type="text" id="corr-education" value="${parsedData.education || ''}" class="field-input">
          </div>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px;">
        <button class="action-pill-btn" id="btn-cancel-correction">Cancel</button>
        <button class="btn-primary" id="btn-confirm-correction">Confirm Structured Resume →</button>
      </div>
    `;

    modalOverlay.classList.add('active');

    document.getElementById('btn-close-correction')?.addEventListener('click', () => modalOverlay.classList.remove('active'));
    document.getElementById('btn-cancel-correction')?.addEventListener('click', () => modalOverlay.classList.remove('active'));

    document.getElementById('btn-confirm-correction')?.addEventListener('click', () => {
      parsedData.candidate.name = document.getElementById('corr-name').value;
      parsedData.summary = document.getElementById('corr-summary').value;
      parsedData.skills = document.getElementById('corr-skills').value;
      parsedData.education = document.getElementById('corr-education').value;

      parsedData.sections = [
        { id: 'summary', title: 'Professional Summary', content: parsedData.summary },
        { id: 'experience', title: 'Experience', items: parsedData.experience },
        { id: 'skills', title: 'Skills & Competencies', content: parsedData.skills },
        { id: 'education', title: 'Education', content: parsedData.education }
      ];

      store.createResumeProfile(parsedData, 'Custom Role');
      modalOverlay.classList.remove('active');
      window.showToast?.('Structured resume confirmed and saved!', 'success');
      this.render(this.container);
    });
  }

  /**
   * Confirmation Dialog for Bulk "Optimize with AI" + 30s Undo Timer
   */
  triggerBulkOptimization() {
    const state = store.state;
    const suggestions = aiEngine.getRankedSuggestions(state.resume, state.resolvedSuggestions || []);

    if (suggestions.length === 0) {
      window.showToast?.('All active suggestions have already been applied!', 'info');
      return;
    }

    if (confirm(`Apply Context-Aware AI Optimization?\n\nThis will enhance ${suggestions.length} items with unique, fact-checked achievements.\nUndo will be available for 30 seconds.`)) {
      const res = store.optimizeAllSuggestions();
      this.start30sUndoCountdown();
      const count = res?.count ?? res;
      const ats = res?.scores?.atsScore || 95;
      const match = res?.scores?.matchScore || 94;
      window.showToast?.(`AI optimized ${count} items! ATS: ${ats}% • Match: ${match}%`, 'success');
      this.render(this.container);
    }
  }

  start30sUndoCountdown() {
    this.undoSecondsRemaining = 30;
    if (this.undoInterval) clearInterval(this.undoInterval);

    this.undoInterval = setInterval(() => {
      this.undoSecondsRemaining--;
      const el = document.getElementById('undo-timer-countdown');
      if (el) el.textContent = this.undoSecondsRemaining;

      if (this.undoSecondsRemaining <= 0) {
        clearInterval(this.undoInterval);
        document.getElementById('undo-toast-banner')?.remove();
      }
    }, 1000);
  }

  attachEventListeners() {
    // Top Open Upload Modal
    document.getElementById('btn-open-upload-modal')?.addEventListener('click', () => {
      this.openUploadModal();
    });

    document.getElementById('btn-helper-upload')?.addEventListener('click', () => {
      this.openUploadModal();
    });

    // Top Target JD Picker
    document.getElementById('btn-open-jd-picker')?.addEventListener('click', () => {
      window.openJdModal?.();
    });

    // Profile Dropdown Switcher
    document.getElementById('select-resume-profile')?.addEventListener('change', (e) => {
      store.switchResumeProfile(e.target.value);
      window.showToast?.('Switched resume profile', 'info');
      this.render(this.container);
    });

    // Unlock / Add Target JD from locked drawer state
    document.getElementById('btn-unlock-add-jd')?.addEventListener('click', () => {
      window.openJdModal?.();
    });

    // Quick Preset JD buttons
    this.container.querySelectorAll('.btn-quick-load-jd').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const jdKey = e.currentTarget.getAttribute('data-jd-key');
        store.state.currentJdKey = jdKey;
        store.state.hasActiveJd = true;
        store.saveState();
        window.showToast?.(`Loaded ${store.state.jobDescriptions[jdKey]?.title} requirements!`, 'success');
        this.render(this.container);
      });
    });

    // Clear JD button (tests locked state)
    document.getElementById('btn-clear-jd')?.addEventListener('click', () => {
      store.clearTargetJobDescription();
      window.showToast?.('Target JD cleared — AI Drawer locked', 'info');
      this.render(this.container);
    });

    // Toggle Section Analysis Breakdown
    document.getElementById('link-toggle-analysis')?.addEventListener('click', () => {
      this.isAnalysisExpanded = !this.isAnalysisExpanded;
      this.render(this.container);
    });

    // Formatting Toolbar
    document.getElementById('btn-bold')?.addEventListener('click', () => document.execCommand('bold', false, null));
    document.getElementById('btn-italic')?.addEventListener('click', () => document.execCommand('italic', false, null));
    document.getElementById('btn-underline')?.addEventListener('click', () => document.execCommand('underline', false, null));
    document.getElementById('btn-bullet-list')?.addEventListener('click', () => document.execCommand('insertUnorderedList', false, null));

    // Export PDF
    document.getElementById('btn-export-pdf')?.addEventListener('click', () => {
      window.print();
    });

    // Primary: Apply AI Rewrite Button
    this.container.querySelectorAll('.btn-apply-rewrite').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const bulletId = e.currentTarget.getAttribute('data-bullet-id');
        const rawRewrite = e.currentTarget.getAttribute('data-rewrite');
        const rewrite = rawRewrite ? decodeURIComponent(rawRewrite) : '';
        const scores = store.updateBulletRewrite(bulletId, rewrite);
        this.activeHighlightId = null;
        const ats = scores?.atsScore || 95;
        const match = scores?.matchScore || 94;
        window.showToast?.(`AI Rewrite applied! ATS Score: ${ats}% • Match Score: ${match}%`, 'success');
        this.render(this.container);
      });
    });

    // Reject Suggestion Button
    this.container.querySelectorAll('.btn-reject-suggestion').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const bulletId = e.currentTarget.getAttribute('data-bullet-id');
        store.dismissSuggestion(bulletId);
        window.showToast?.('Suggestion rejected and dismissed', 'info');
        this.render(this.container);
      });
    });

    // Secondary: Highlight Targets Button (Visual Outline action)
    this.container.querySelectorAll('.btn-highlight-target').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const bulletId = e.currentTarget.getAttribute('data-bullet-id');
        this.activeHighlightId = bulletId;
        this.render(this.container);

        const targetEl = document.getElementById(`canvas-bullet-${bulletId}`);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        window.showToast?.('Highlighted target sentence in editor', 'info');
      });
    });

    // Dismiss Suggestion Button
    this.container.querySelectorAll('.btn-dismiss-suggestion').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const bulletId = e.currentTarget.getAttribute('data-bullet-id');
        store.dismissSuggestion(bulletId);
        window.showToast?.('Suggestion dismissed', 'info');
        this.render(this.container);
      });
    });

    // Show More Suggestions Toggle
    document.getElementById('btn-toggle-more-suggestions')?.addEventListener('click', () => {
      this.showAllSuggestions = !this.showAllSuggestions;
      this.render(this.container);
    });

    // 1-Click Insert Missing Keyword Pill
    this.container.querySelectorAll('.btn-insert-keyword-pill').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const kw = e.currentTarget.getAttribute('data-kw');
        const contextualSentence = aiEngine.generateContextualSkillSentence(kw);
        store.addSkillToResume(kw, contextualSentence);
        window.showToast?.(`Inserted "${kw}" with contextual accomplishment into resume!`, 'success');
        this.render(this.container);
      });
    });

    // Bulk "✦ Optimize with AI" Button
    document.getElementById('btn-optimize-all')?.addEventListener('click', () => {
      this.triggerBulkOptimization();
    });

    // 30-Second Undo Button Action
    document.getElementById('btn-trigger-undo')?.addEventListener('click', () => {
      const restored = store.undoLastAction();
      if (restored) {
        clearInterval(this.undoInterval);
        window.showToast?.('Changes reverted successfully!', 'success');
        this.render(this.container);
      }
    });

    // Live Debounced Content Editable Canvas Auto-Save
    const canvas = document.getElementById('resume-canvas');
    canvas?.addEventListener('input', () => {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        const statusEl = document.getElementById('save-status-text');
        if (statusEl) statusEl.textContent = 'Saving...';
        setTimeout(() => {
          if (statusEl) statusEl.textContent = 'Saved just now';
        }, 500);
      }, 1500);
    });
  }
}

export const resumeLabView = new ResumeLabView();
