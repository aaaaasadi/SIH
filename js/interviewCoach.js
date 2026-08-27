/**
 * CareerAI - Upgraded Live Mock Interview Simulator & Personalized AI Coach (PCE-SW-PS-9 - v2.2)
 *
 * Implements:
 * 1. Interview Setup Screen: Target Role, Type (Technical/HR/Mixed), Difficulty, Num Questions, Resume & JD toggles, Zero-prerequisite Generic mode.
 * 2. Personalized AI Question Generation: Tailored to Resume + JD + Role + Difficulty with real backend AI / fallback.
 * 3. Interactive Interview Screen: Progress Stepper, AI Interviewer Card, Dual Answer (🎤 Voice recording with Web Speech API & ⌨️ Text answer).
 * 4. Multi-Criteria Answer Evaluation: 6 dimensions (Relevance, Technical Accuracy, Communication, Completeness, Problem Solving, Confidence) + Dynamic Overall Score.
 * 5. Actionable AI Feedback: "What you did well", "What could be improved", "AI Recommendation" (STAR method).
 * 6. Model Answer Coaching: "Show Better Answer" demonstrating one possible strong coaching approach.
 * 7. Adaptive Flow: Question difficulty adjusts based on previous answers.
 * 8. Final Interview Report Dashboard: Performance Breakdown, Strengths, Areas to Improve, 3-Tier Personalized Practice Plan.
 * 9. Interview History: History table for signed-in users, save-triggered signup prompt for guests.
 * 10. Robust Guest Mode & Quota integration with state.js.
 */

import { store } from './state.js';
import { speechEngine } from './speechEngine.js';

export class InterviewCoachView {
  constructor() {
    this.container = null;
    this.activeTab = 'setup'; // 'setup' | 'history'
    this.isSessionActive = false; // false (Setup) | true (Live Room) | 'report' (Final Dashboard)

    // Interview Setup Configuration (PRD Section 1)
    this.config = {
      targetRole: 'Software Developer',
      customRole: '',
      interviewType: 'Mixed', // 'Technical' | 'HR / Behavioral' | 'Mixed'
      difficulty: 'Intermediate', // 'Beginner' | 'Intermediate' | 'Advanced'
      numQuestions: 5, // 5 | 10 | 15
      useResume: true,
      useJd: true
    };

    // Live Session State
    this.session = {
      sessionId: null,
      currentQuestionIndex: 0,
      totalQuestions: 5,
      currentQuestion: null,
      allQuestions: [],
      answers: [], // Array of evaluated answer objects
      currentEvaluation: null, // Holds latest answer evaluation
      isEvaluating: false,
      answerMethod: 'voice', // 'voice' | 'text'
      isRecording: false,
      recordingSeconds: 0,
      recordingInterval: null,
      voiceTranscript: '',
      textAnswer: '',
      timerSeconds: 0,
      timerInterval: null,
      waveformInterval: null,
      isPaused: false,
      showModelAnswer: false,
      finalReport: null
    };

    this.simulatedVideoUrl = 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=80';
  }

  render(container) {
    this.container = container;

    // 0. Check Guest Quota before launching (PRD Section 8 & 9: 1 interview session per 24h)
    if (store.isGuest()) {
      const quota = store.checkGuestQuota('interview');
      if (!quota.allowed) {
        this.renderQuotaExceededView(container);
        return;
      }
    }

    if (this.isSessionActive === 'report') {
      this.renderFinalReport(container);
    } else if (this.isSessionActive === true) {
      this.renderActiveRoom(container);
    } else {
      this.renderSetupLobby(container);
    }
  }

  // ==========================================================================
  // 1. INTERVIEW SETUP & READINESS LOBBY
  // ==========================================================================

  renderSetupLobby(container) {
    if (this.session.timerInterval) clearInterval(this.session.timerInterval);
    if (this.session.waveformInterval) clearInterval(this.session.waveformInterval);
    if (this.session.recordingInterval) clearInterval(this.session.recordingInterval);

    const isGuest = store.isGuest();
    const resume = store.state.resume;
    const currentJd = store.state.hasActiveJd && store.state.currentJdKey ? store.state.jobDescriptions[store.state.currentJdKey] : null;
    const hasResume = Boolean(resume && resume.candidate && resume.candidate.name);
    const hasJd = Boolean(currentJd && currentJd.title);

    const rolesList = [
      'Software Developer',
      'Full Stack Developer',
      'Data Analyst',
      'AI/ML Engineer',
      'Java Developer',
      'Senior Product Manager'
    ];

    container.innerHTML = `
      <div class="interview-lobby-container">
        <!-- Top Nav Tabs: Setup vs Past History -->
        <div class="interview-nav-tabs">
          <button class="interview-nav-tab ${this.activeTab === 'setup' ? 'active' : ''}" id="tab-nav-setup">
            <span>🚀</span> Setup & Launch Interview
          </button>
          <button class="interview-nav-tab ${this.activeTab === 'history' ? 'active' : ''}" id="tab-nav-history">
            <span>📜</span> Previous Interview History
            ${isGuest ? `<span class="demo-chip-tag" style="margin-left: 4px;">Demo</span>` : ''}
          </button>
        </div>

        ${this.activeTab === 'history' ? this.renderHistoryTabHtml(isGuest) : `
          <!-- Top Hero Card -->
          <div class="lobby-hero-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px;">
              <div>
                <div style="display: flex; align-items: center; gap: 10px;">
                  <h2 style="font-size: 1.6rem; font-weight: 800; color: var(--text-main); margin: 0;">AI Mock Interview Coach</h2>
                  ${isGuest ? `<span class="guest-badge-pill">1 Free Guest Session</span>` : `<span class="demo-chip-tag" style="background: #ECFDF5; color: #059669; border-color: #A7F3D0;">Pro Mode</span>`}
                </div>
                <p style="color: var(--text-muted); font-size: 0.92rem; margin-top: 6px; max-width: 680px; line-height: 1.5;">
                  Experience realistic, AI-generated technical and behavioral interviews tailored directly to your <strong>uploaded resume</strong> and <strong>target job description</strong>.
                </p>
              </div>

              <button class="btn-primary" id="btn-start-interview-hero" style="padding: 12px 28px; font-size: 1rem; font-weight: 800; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);">
                <span>🚀</span> START INTERVIEW →
              </button>
            </div>
          </div>

          <!-- 2-Column Setup Grid -->
          <div class="lobby-grid">
            <!-- Left Column: Parameters & Personalization -->
            <div class="lobby-col-left">
              
              <!-- 1. Target Job Role -->
              <div class="card" style="padding: 20px; margin-bottom: 18px;">
                <div style="font-size: 0.92rem; font-weight: 800; color: var(--text-main); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                  <span>💼</span> 1. Target Job Role
                </div>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                  <select id="select-target-role" class="form-select" style="flex: 1; min-width: 220px; padding: 10px 14px; border: 1.5px solid #CBD5E1; border-radius: var(--radius-md); font-size: 0.88rem; font-weight: 600; color: var(--text-main); background: white;">
                    ${rolesList.map(r => `<option value="${r}" ${this.config.targetRole === r ? 'selected' : ''}>${r}</option>`).join('')}
                    <option value="custom" ${!rolesList.includes(this.config.targetRole) ? 'selected' : ''}>+ Custom Job Role...</option>
                  </select>
                  <input type="text" id="input-custom-role" placeholder="e.g. Cloud Security Architect" value="${!rolesList.includes(this.config.targetRole) ? this.config.targetRole : ''}" style="display: ${!rolesList.includes(this.config.targetRole) ? 'block' : 'none'}; flex: 1; min-width: 200px; padding: 10px 14px; border: 1.5px solid var(--primary); border-radius: var(--radius-md); font-size: 0.88rem;" />
                </div>
              </div>

              <!-- 2. Interview Type & Difficulty -->
              <div class="card" style="padding: 20px; margin-bottom: 18px;">
                <div style="font-size: 0.92rem; font-weight: 800; color: var(--text-main); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                  <span>⚡</span> 2. Format & Difficulty
                </div>

                <div style="margin-bottom: 16px;">
                  <div style="font-size: 0.78rem; font-weight: 700; color: #64748B; text-transform: uppercase; margin-bottom: 8px;">Interview Type</div>
                  <div class="pill-options-row">
                    <button class="pill-option-btn ${this.config.interviewType === 'Technical' ? 'selected' : ''}" data-type="Technical">💻 Technical</button>
                    <button class="pill-option-btn ${this.config.interviewType === 'HR / Behavioral' ? 'selected' : ''}" data-type="HR / Behavioral">🤝 HR / Behavioral</button>
                    <button class="pill-option-btn ${this.config.interviewType === 'Mixed' ? 'selected' : ''}" data-type="Mixed">⚡ Mixed</button>
                  </div>
                </div>

                <div style="margin-bottom: 16px;">
                  <div style="font-size: 0.78rem; font-weight: 700; color: #64748B; text-transform: uppercase; margin-bottom: 8px;">Difficulty Level</div>
                  <div class="pill-options-row">
                    <button class="pill-option-btn ${this.config.difficulty === 'Beginner' ? 'selected' : ''}" data-diff="Beginner">🟢 Beginner</button>
                    <button class="pill-option-btn ${this.config.difficulty === 'Intermediate' ? 'selected' : ''}" data-diff="Intermediate">🟡 Intermediate</button>
                    <button class="pill-option-btn ${this.config.difficulty === 'Advanced' ? 'selected' : ''}" data-diff="Advanced">🔴 Advanced</button>
                  </div>
                </div>

                <div>
                  <div style="font-size: 0.78rem; font-weight: 700; color: #64748B; text-transform: uppercase; margin-bottom: 8px;">Number of Questions</div>
                  <div class="pill-options-row">
                    <button class="pill-option-btn ${this.config.numQuestions === 5 ? 'selected' : ''}" data-num="5">5 Questions (~8 min)</button>
                    <button class="pill-option-btn ${this.config.numQuestions === 10 ? 'selected' : ''}" data-num="10">10 Questions (~15 min)</button>
                    <button class="pill-option-btn ${this.config.numQuestions === 15 ? 'selected' : ''}" data-num="15">15 Questions (~25 min)</button>
                  </div>
                </div>
              </div>

              <!-- 3. Personalization Controls (Zero Gating) -->
              <div class="card" style="padding: 20px;">
                <div style="font-size: 0.92rem; font-weight: 800; color: var(--text-main); margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                  <span>🎯</span> 3. AI Personalization Engine
                </div>

                <div class="personalization-cards-row">
                  <!-- Use My Resume Switch -->
                  <div class="personalization-switch-card ${this.config.useResume ? 'active' : ''}">
                    <div>
                      <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-main);">Use My Resume</div>
                      <div style="font-size: 0.75rem; color: #64748B;">
                        ${hasResume ? `📄 ${resume.candidate?.name || 'Resume'} (Loaded)` : 'No resume uploaded yet'}
                      </div>
                    </div>
                    <span class="personalization-toggle-badge ${this.config.useResume ? 'on' : 'off'}" id="toggle-use-resume">
                      ${this.config.useResume ? 'ON' : 'OFF'}
                    </span>
                  </div>

                  <!-- Use Job Description Switch -->
                  <div class="personalization-switch-card ${this.config.useJd ? 'active' : ''}">
                    <div>
                      <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-main);">Use Job Description</div>
                      <div style="font-size: 0.75rem; color: #64748B;">
                        ${hasJd ? `🎯 ${currentJd.title}` : 'No JD connected'}
                      </div>
                    </div>
                    <span class="personalization-toggle-badge ${this.config.useJd ? 'on' : 'off'}" id="toggle-use-jd">
                      ${this.config.useJd ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>

                ${!hasResume && !hasJd ? `
                  <div style="margin-top: 12px; font-size: 0.78rem; color: #059669; background: #ECFDF5; padding: 8px 12px; border-radius: var(--radius-sm); border: 1px solid #A7F3D0; display: flex; align-items: center; gap: 6px;">
                    <span>✨</span> <strong>Generic Mode Active:</strong> You can practice immediately using the standard high-yield question bank with zero setup required!
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- Right Column: Camera/Mic Device Readiness & Launch -->
            <div class="lobby-col-right">
              <div class="card" style="padding: 22px;">
                <div style="font-size: 0.95rem; font-weight: 800; color: var(--text-main); margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
                  <span>📹</span> Camera & Mic Readiness
                </div>

                <!-- Camera Preview Box -->
                <div class="lobby-camera-preview-box">
                  <video id="lobby-webcam-preview" autoplay playsinline muted style="display: none; width: 100%; height: 180px; object-fit: cover; border-radius: var(--radius-md);"></video>
                  <img id="lobby-simulated-preview" src="${this.simulatedVideoUrl}" alt="Camera Feed" style="width: 100%; height: 180px; object-fit: cover; border-radius: var(--radius-md);">
                  <div class="lobby-cam-overlay-badge">
                    <span class="pulse-indicator"></span> Ready
                  </div>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin: 12px 0;">
                  <button class="action-pill-btn" id="btn-lobby-toggle-cam" style="font-size: 0.76rem;">
                    📹 Use Live Webcam
                  </button>
                  <span style="font-size: 0.75rem; color: #10B981; font-weight: 700;">🎤 Mic Connected</span>
                </div>

                <!-- Session Summary Box -->
                <div class="session-quick-meta-box">
                  <div class="meta-row">
                    <span>Target Role:</span>
                    <strong>${this.config.targetRole}</strong>
                  </div>
                  <div class="meta-row">
                    <span>Format:</span>
                    <strong>${this.config.interviewType} • ${this.config.difficulty}</strong>
                  </div>
                  <div class="meta-row">
                    <span>Questions:</span>
                    <strong>${this.config.numQuestions} Questions</strong>
                  </div>
                  <div class="meta-row">
                    <span>Personalization:</span>
                    <strong style="color: ${this.config.useResume || this.config.useJd ? '#4F46E5' : '#059669'};">
                      ${this.config.useResume || this.config.useJd ? 'Resume + JD Tailored' : 'Standard Generic'}
                    </strong>
                  </div>
                </div>

                <!-- Big Launch Button -->
                <button class="btn-primary" id="btn-start-interview-main" style="width: 100%; justify-content: center; padding: 14px; font-size: 1.05rem; font-weight: 800; margin-top: 18px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);">
                  START INTERVIEW →
                </button>
              </div>
            </div>
          </div>
        `}
      </div>
    `;

    this.attachSetupEvents(container);
  }

  renderHistoryTabHtml(isGuest) {
    const sessions = store.state.sessions || [];

    return `
      <div class="card" style="padding: 24px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap: wrap; gap: 10px;">
          <div>
            <h3 style="font-size: 1.2rem; margin: 0; color: var(--text-main);">Interview Performance History</h3>
            <p style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
              Review past mock sessions, overall scores, and deep-dive question analytics.
            </p>
          </div>

          ${isGuest ? `
            <button class="btn-primary" onclick="window.openAuthModal('signup', 'Sign up to permanently save your interview history:')" style="font-size: 0.8rem; padding: 8px 16px;">
              Create Account to Save History →
            </button>
          ` : ''}
        </div>

        ${isGuest ? `
          <div class="guest-summary-banner" style="margin-bottom: 16px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.1rem;">💡</span>
              <span><strong>Guest Mode Notice:</strong> Showing demo interview sessions. Create a free account to track your continuous progress over time.</span>
            </div>
          </div>
        ` : ''}

        <div style="overflow-x: auto;">
          <table class="history-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Target Role</th>
                <th>Type</th>
                <th>Difficulty</th>
                <th>Score</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${sessions.length > 0 ? sessions.map(s => `
                <tr>
                  <td><strong>${s.formatted_date || s.date || 'Recent'}</strong></td>
                  <td>${s.role}</td>
                  <td><span class="mode-tag">${s.interview_type || s.category || 'Mixed'}</span></td>
                  <td><span class="demo-chip-tag">${s.difficulty || 'Intermediate'}</span></td>
                  <td>
                    <strong style="color: ${(s.overall_score || s.score) >= 75 ? '#16A34A' : '#D97706'}; font-size: 1.05rem;">
                      ${s.overall_score || s.score}
                    </strong> / 100
                  </td>
                  <td>
                    <button class="action-pill-btn btn-view-history-detail" data-sess-id="${s.id}" style="font-size: 0.76rem; padding: 4px 10px;">
                      View Report →
                    </button>
                  </td>
                </tr>
              `).join('') : `
                <tr>
                  <td colspan="6" style="text-align: center; padding: 30px; color: #94A3B8;">
                    No past interview sessions logged yet. Launch an interview session above to get started!
                  </td>
                </tr>
              `}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  attachSetupEvents(container) {
    // Nav Tab Switcher
    document.getElementById('tab-nav-setup')?.addEventListener('click', () => {
      this.activeTab = 'setup';
      this.render(container);
    });

    document.getElementById('tab-nav-history')?.addEventListener('click', () => {
      this.activeTab = 'history';
      this.render(container);
    });

    // Target Role select
    const roleSelect = document.getElementById('select-target-role');
    const customRoleInput = document.getElementById('input-custom-role');

    roleSelect?.addEventListener('change', (e) => {
      if (e.target.value === 'custom') {
        if (customRoleInput) customRoleInput.style.display = 'block';
        this.config.targetRole = customRoleInput?.value || 'Custom Role';
      } else {
        if (customRoleInput) customRoleInput.style.display = 'none';
        this.config.targetRole = e.target.value;
      }
      this.render(container);
    });

    customRoleInput?.addEventListener('input', (e) => {
      this.config.targetRole = e.target.value || 'Custom Role';
    });

    // Interview Type Buttons
    container.querySelectorAll('.pill-option-btn[data-type]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.config.interviewType = e.currentTarget.getAttribute('data-type');
        this.render(container);
      });
    });

    // Difficulty Buttons
    container.querySelectorAll('.pill-option-btn[data-diff]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.config.difficulty = e.currentTarget.getAttribute('data-diff');
        this.render(container);
      });
    });

    // Number of Questions
    container.querySelectorAll('.pill-option-btn[data-num]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.config.numQuestions = parseInt(e.currentTarget.getAttribute('data-num'), 10);
        this.render(container);
      });
    });

    // Personalization Toggles
    document.getElementById('toggle-use-resume')?.addEventListener('click', () => {
      this.config.useResume = !this.config.useResume;
      window.showToast?.(`Use Resume: ${this.config.useResume ? 'ON' : 'OFF'}`, 'info');
      this.render(container);
    });

    document.getElementById('toggle-use-jd')?.addEventListener('click', () => {
      this.config.useJd = !this.config.useJd;
      window.showToast?.(`Use Job Description: ${this.config.useJd ? 'ON' : 'OFF'}`, 'info');
      this.render(container);
    });

    // Camera Toggle in Lobby
    document.getElementById('btn-lobby-toggle-cam')?.addEventListener('click', async () => {
      const webcamEl = document.getElementById('lobby-webcam-preview');
      const simEl = document.getElementById('lobby-simulated-preview');
      const btn = document.getElementById('btn-lobby-toggle-cam');
      if (!webcamEl || !simEl) return;

      if (speechEngine.isWebcamActive) {
        speechEngine.stopWebcam(webcamEl);
        webcamEl.style.display = 'none';
        simEl.style.display = 'block';
        if (btn) btn.textContent = '📹 Use Live Webcam';
        window.showToast?.('Switched to simulated avatar feed', 'info');
      } else {
        const success = await speechEngine.startWebcam(webcamEl);
        if (success) {
          simEl.style.display = 'none';
          webcamEl.style.display = 'block';
          if (btn) btn.textContent = '📹 Use Simulated Avatar';
          window.showToast?.('Live webcam connected!', 'success');
        } else {
          window.showToast?.('Webcam unavailable. Using high-fidelity simulated stream.', 'warning');
        }
      }
    });

    // View History Detail Button
    container.querySelectorAll('.btn-view-history-detail').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const sessId = e.currentTarget.getAttribute('data-sess-id');
        this.openHistoryReportModal(sessId);
      });
    });

    // START INTERVIEW ACTION
    const launchHandler = () => this.handleStartInterview();
    document.getElementById('btn-start-interview-hero')?.addEventListener('click', launchHandler);
    document.getElementById('btn-start-interview-main')?.addEventListener('click', launchHandler);
  }

  async handleStartInterview() {
    window.showToast?.('Initializing AI Interview Session & generating tailored questions...', 'info');

    // Build Start Request payload
    const resume = store.state.resume;
    const currentJd = store.state.hasActiveJd && store.state.currentJdKey ? store.state.jobDescriptions[store.state.currentJdKey] : null;

    let resumeText = '';
    if (this.config.useResume && resume && resume.sections) {
      resumeText = `${resume.candidate?.name || ''} | ${resume.candidate?.email || ''}\n` +
        resume.sections.map(s => `${s.title}: ${s.content || ''} ${s.items?.map(it => it.bullets?.map(b => b.text).join(' ')).join(' ') || ''}`).join('\n');
    }

    let jdText = '';
    if (this.config.useJd && currentJd) {
      jdText = `${currentJd.title} - ${currentJd.rawText || ''}`;
    }

    const payload = {
      target_role: this.config.targetRole,
      interview_type: this.config.interviewType,
      difficulty: this.config.difficulty,
      num_questions: this.config.numQuestions,
      use_resume: this.config.useResume && Boolean(resumeText),
      use_jd: this.config.useJd && Boolean(jdText),
      resume_text: resumeText,
      job_description: jdText,
      candidate_name: resume?.candidate?.name || 'Candidate'
    };

    try {
      const res = await fetch('/api/interview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('API start failed');
      const startData = await res.json();

      // Set session state
      this.session.sessionId = startData.session_id;
      this.session.currentQuestionIndex = 0;
      this.session.totalQuestions = startData.total_questions;
      this.session.currentQuestion = startData.first_question;
      this.session.allQuestions = startData.all_questions_preview || [startData.first_question];
      this.session.answers = [];
      this.session.currentEvaluation = null;
      this.session.voiceTranscript = '';
      this.session.textAnswer = '';
      this.session.timerSeconds = 0;
      this.session.isPaused = false;
      this.session.showModelAnswer = false;

      this.isSessionActive = true;
      window.showToast?.(`Question 1 of ${this.session.totalQuestions} ready!`, 'success');
      this.render(this.container);

    } catch (err) {
      console.warn('Backend /api/interview/start fallback triggered:', err);
      // Client-side fallback initialization
      this.session.sessionId = 'sess-' + Date.now();
      this.session.currentQuestionIndex = 0;
      this.session.totalQuestions = this.config.numQuestions;
      this.session.currentQuestion = {
        id: 'q-fb-1',
        question_index: 0,
        total_questions: this.config.numQuestions,
        category: `Technical (${this.config.targetRole})`,
        role: this.config.targetRole,
        difficulty: this.config.difficulty,
        question: `Tell me about a challenging project where you built a core system for ${this.config.targetRole}, and how you handled key architectural trade-offs.`,
        context_reason: 'Generated from role criteria (Rubric engine fallback).',
        recommended_duration_sec: 90,
        expected_criteria: ['System architecture', 'Technical trade-offs', 'STAR structure', 'Outcome metric'],
        sample_model_answer: 'In our system redesign, I implemented asynchronous worker queues and connection pooling, reducing response latency by 28% with zero downtime.'
      };
      this.session.allQuestions = [this.session.currentQuestion];
      this.session.answers = [];
      this.session.currentEvaluation = null;
      this.session.timerSeconds = 0;
      this.isSessionActive = true;
      this.render(this.container);
    }
  }

  // ==========================================================================
  // 2. ACTIVE LIVE INTERVIEW ROOM
  // ==========================================================================

  renderActiveRoom(container) {
    const q = this.session.currentQuestion;
    const qIndex = this.session.currentQuestionIndex;
    const totalQ = this.session.totalQuestions;
    const isEvaluated = Boolean(this.session.currentEvaluation);
    const evalData = this.session.currentEvaluation;
    const isGuest = store.isGuest();

    container.innerHTML = `
      <!-- Top Status & Progress Bar -->
      <div class="interview-header-controls">
        <div class="interview-room-title">
          <div style="display: flex; align-items: center; gap: 8px;">
            <h2 style="font-size: 1.35rem; margin: 0; color: var(--text-main);">${this.config.targetRole}</h2>
            <span class="mode-tag" style="background: #EEF2FF; color: var(--primary);">${this.config.interviewType} • ${this.config.difficulty}</span>
            ${isGuest ? `<span class="guest-badge-pill" style="font-size: 0.68rem;">Guest Session</span>` : ''}
          </div>
          <div style="display: flex; align-items: center; gap: 12px; margin-top: 6px;">
            <span style="font-size: 0.82rem; font-weight: 700; color: #64748B;">Question ${qIndex + 1} of ${totalQ}</span>
            <!-- Progress Stepper Indicator -->
            <div class="question-stepper-bar">
              ${Array.from({ length: totalQ }).map((_, idx) => {
                const isDone = idx < qIndex || (idx === qIndex && isEvaluated);
                const isActive = idx === qIndex && !isEvaluated;
                return `
                  <span class="step-dot ${isDone ? 'done' : (isActive ? 'active' : '')}">
                    Q${idx + 1} ${isDone ? '✓' : (isActive ? '●' : '○')}
                  </span>
                `;
              }).join('')}
            </div>
          </div>
        </div>

        <div class="interview-controls-top">
          <!-- Exit to Setup -->
          <button class="action-pill-btn" id="btn-exit-to-setup" title="Exit to Setup Lobby" style="font-size: 0.76rem;">
            ← Exit to Setup
          </button>

          <!-- Pause / Resume -->
          <button class="btn-pause" id="btn-pause-toggle">
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            <span id="pause-btn-text">${this.session.isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          <!-- Timer Badge -->
          <div class="timer-badge">
            <div class="timer-dot"></div>
            <span id="session-timer-text">${this.formatTime(this.session.timerSeconds)}</span>
          </div>

          <!-- End Session Early -->
          <button class="btn-end-session" id="btn-end-session-early">End & Report</button>
        </div>
      </div>

      <!-- Main Live Grid -->
      <div class="interview-main-grid">
        <!-- Left: Candidate Video / Audio Stream -->
        <div class="video-frame-box">
          <video id="webcam-stream" class="video-stream-element" autoplay playsinline muted style="display: none;"></video>
          <img id="simulated-feed" src="${this.simulatedVideoUrl}" alt="Candidate Stream" class="simulated-candidate-video">

          <!-- Video Framing & Enhancement Toolbar -->
          <div class="video-bottom-toolbar">
            <button class="video-tool-btn" id="btn-auto-frame">Auto-Framing</button>
            <button class="video-tool-btn active" id="btn-lighting">Lighting</button>
            <button class="video-tool-btn" id="btn-virtual-bg">Virtual BG</button>
            <button class="video-tool-btn" id="btn-toggle-cam">📹 Cam</button>
          </div>

          <!-- Live Audio Waveform Bars -->
          <div class="waveform-container" id="audio-waveform-bars" style="position: absolute; bottom: 50px; left: 14px; right: 14px; height: 28px; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px); border-radius: var(--radius-sm); padding: 4px 8px;">
            ${Array.from({ length: 24 }).map((_, i) => `<div class="wave-bar" style="height: ${Math.max(15, Math.sin(i) * 80 + 20)}%;"></div>`).join('')}
          </div>
        </div>

        <!-- Right: AI Interviewer Question & Dual Answer Input -->
        <div class="interview-feedback-column">
          
          <!-- 1. AI Interviewer Prominent Question Card -->
          <div class="card" style="padding: 20px; margin-bottom: 14px; border-left: 4px solid var(--primary);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 6px; font-size: 0.75rem; font-weight: 800; color: var(--primary); text-transform: uppercase;">
                <span>🤖</span> AI Interviewer • ${q.category || 'Core Question'}
              </div>
              <span class="demo-chip-tag" style="font-size: 0.68rem;">Target: ~90 sec</span>
            </div>

            ${q.context_reason ? `
              <div style="font-size: 0.72rem; color: #4338CA; background: #EEF2FF; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-bottom: 8px;">
                💡 ${q.context_reason}
              </div>
            ` : ''}

            <div style="font-size: 1.08rem; font-weight: 700; color: #0F172A; line-height: 1.45;">
              "${q.question}"
            </div>
          </div>

          <!-- 2. Dual Answer Mode (Voice / Text) if NOT evaluated yet -->
          ${!isEvaluated ? `
            <div class="card" style="padding: 18px;">
              <!-- Sub-tabs: Voice vs Text Answer -->
              <div class="answer-method-tabs">
                <button class="answer-tab-btn ${this.session.answerMethod === 'voice' ? 'active' : ''}" id="tab-answer-voice">
                  🎤 Voice Answer
                </button>
                <button class="answer-tab-btn ${this.session.answerMethod === 'text' ? 'active' : ''}" id="tab-answer-text">
                  ⌨️ Text Answer
                </button>
              </div>

              <!-- A: Voice Answer Flow -->
              ${this.session.answerMethod === 'voice' ? `
                <div class="voice-record-panel ${this.session.isRecording ? 'recording' : ''}">
                  <div style="margin-bottom: 12px;">
                    <button class="btn-record-main ${this.session.isRecording ? 'recording' : ''}" id="btn-toggle-recording">
                      <span>${this.session.isRecording ? '⏹ STOP RECORDING' : '🎙 START RECORDING'}</span>
                    </button>
                  </div>

                  <div style="font-size: 0.8rem; font-weight: 700; color: ${this.session.isRecording ? '#E11D48' : '#64748B'}; margin-bottom: 8px;">
                    ${this.session.isRecording ? `🔴 Recording Live: ${this.formatTime(this.session.recordingSeconds)}` : 'Click to start speaking your answer'}
                  </div>

                  ${this.session.voiceTranscript ? `
                    <div style="display: flex; justify-content: flex-end; margin-bottom: 4px;">
                      <button class="action-pill-btn" id="btn-rerecord-voice" style="font-size: 0.72rem; padding: 2px 8px;">
                        🔄 Re-record
                      </button>
                    </div>
                  ` : ''}

                  <!-- Live Transcription Box -->
                  <div style="background: white; border: 1px solid #E2E8F0; border-radius: var(--radius-sm); padding: 10px 12px; text-align: left; min-height: 70px; max-height: 140px; overflow-y: auto; font-size: 0.85rem; color: #1E293B; line-height: 1.45;">
                    ${this.session.voiceTranscript ? `
                      <span>"${this.session.voiceTranscript}"</span> ${this.session.isRecording ? '<span class="blinking-cursor"></span>' : ''}
                    ` : `
                      <span style="color: #94A3B8; font-style: italic;">Your spoken words will transcribe here in real-time...</span>
                    `}
                  </div>
                </div>
              ` : `
                <!-- B: Text Answer Flow -->
                <div style="margin-bottom: 14px;">
                  <textarea id="textarea-user-answer" class="answer-textarea" placeholder="Type your answer here...&#10;&#10;Tip: Follow the STAR structure (Situation → Task → Action → Result).">${this.session.textAnswer}</textarea>
                  <div style="display: flex; justify-content: space-between; font-size: 0.75rem; color: #64748B; margin-top: 4px;">
                    <span>STAR Method recommended</span>
                    <span id="text-word-counter">${(this.session.textAnswer.trim() ? this.session.textAnswer.trim().split(/\s+/).length : 0)} words</span>
                  </div>
                </div>
              `}

              <!-- Submit Answer Button -->
              <button class="btn-primary" id="btn-submit-user-answer" style="width: 100%; justify-content: center; padding: 12px; font-weight: 800; font-size: 0.95rem;">
                ${this.session.isEvaluating ? 'Evaluating with AI Coach...' : 'SUBMIT ANSWER →'}
              </button>
            </div>
          ` : `
            <!-- 3. Real-Time AI Answer Evaluation Feedback Card -->
            <div class="card" style="padding: 20px; animation: fadeIn 0.3s ease;">
              <div class="eval-card-header">
                <div>
                  <div style="font-size: 0.75rem; font-weight: 800; color: var(--primary); text-transform: uppercase;">
                    Answer Evaluation Feedback
                  </div>
                  <div style="font-size: 0.82rem; margin-top: 4px;">
                    ${(evalData.evaluation_mode === 'google_gemini' || evalData.evaluation_mode === 'openai_gpt')
                      ? `<span style="display: inline-flex; align-items: center; gap: 4px; color: #047857; font-weight: 700; font-size: 0.78rem; background: #ECFDF5; padding: 2px 8px; border-radius: 4px; border: 1px solid #A7F3D0;">
                          ✨ Live AI Evaluation (${evalData.evaluation_mode === 'google_gemini' ? 'Gemini Flash' : 'OpenAI GPT'})
                        </span>`
                      : `<span style="display: inline-flex; align-items: center; gap: 4px; color: #B45309; font-weight: 600; font-size: 0.76rem; background: #FFFBEB; padding: 2px 8px; border-radius: 4px; border: 1px solid #FDE68A;">
                          ⚠️ Using backup scoring — AI feedback temporarily limited
                        </span>`
                    }
                  </div>
                </div>
                <div class="eval-score-badge">
                  ${evalData.overall_score} <span style="font-size: 0.9rem; color: #64748B;">/ 100</span>
                </div>
              </div>

              <!-- 6-Dimensional Score Grid (Relevance, Technical, Comm, Completeness, Problem Solving, Confidence) -->
              <div class="eval-six-grid">
                <div class="eval-metric-chip">
                  <span>Relevance:</span>
                  <strong>${evalData.scores_breakdown.relevance}/10</strong>
                </div>
                <div class="eval-metric-chip">
                  <span>Tech Accuracy:</span>
                  <strong>${evalData.scores_breakdown.technical_accuracy}/10</strong>
                </div>
                <div class="eval-metric-chip">
                  <span>Communication:</span>
                  <strong>${evalData.scores_breakdown.communication}/10</strong>
                </div>
                <div class="eval-metric-chip">
                  <span>Completeness:</span>
                  <strong>${evalData.scores_breakdown.completeness}/10</strong>
                </div>
                <div class="eval-metric-chip">
                  <span>Problem Solving:</span>
                  <strong>${evalData.scores_breakdown.problem_solving}/10</strong>
                </div>
                <div class="eval-metric-chip">
                  <span>Confidence:</span>
                  <strong>${evalData.scores_breakdown.confidence}/10</strong>
                </div>
              </div>

              <!-- What you did well -->
              <div class="feedback-box-success">
                <strong>✔ What you did well:</strong>
                <div>${evalData.what_you_did_well}</div>
              </div>

              <!-- What could be improved -->
              <div class="feedback-box-warning">
                <strong>⚠ What could be improved:</strong>
                <div>${evalData.what_could_be_improved}</div>
              </div>

              <!-- AI Recommendation -->
              <div class="feedback-box-rec">
                <strong>💡 AI Recommendation:</strong>
                <div>${evalData.ai_recommendation}</div>
              </div>

              <!-- Model Answer Accordion -->
              <div style="margin-bottom: 16px;">
                <button class="action-pill-btn" id="btn-toggle-model-answer" style="width: 100%; justify-content: center; font-size: 0.8rem; padding: 8px;">
                  <span>${this.session.showModelAnswer ? 'Hide Coaching Example ▴' : '💡 SHOW BETTER ANSWER (COACHING EXAMPLE) ▾'}</span>
                </button>

                ${this.session.showModelAnswer ? `
                  <div class="model-answer-drawer" style="margin-top: 8px;">
                    <div style="font-size: 0.72rem; font-weight: 800; text-transform: uppercase; color: #7E22CE; margin-bottom: 4px;">
                      One Possible Strong Coaching Approach (Not an answer key)
                    </div>
                    <div>${evalData.model_answer}</div>
                  </div>
                ` : ''}
              </div>

              <!-- Next Question / Finish Action -->
              <button class="btn-primary" id="btn-proceed-next-q" style="width: 100%; justify-content: center; padding: 12px; font-weight: 800; font-size: 0.95rem; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35);">
                ${qIndex >= totalQ - 1 ? 'FINISH INTERVIEW & VIEW PERFORMANCE REPORT →' : 'NEXT QUESTION →'}
              </button>
            </div>
          `}
        </div>
      </div>
    `;

    this.startTimer();
    this.startWaveformAnimation();
    this.attachActiveRoomEvents();
  }

  attachActiveRoomEvents() {
    const container = this.container;

    // Exit to Setup
    document.getElementById('btn-exit-to-setup')?.addEventListener('click', () => {
      if (confirm('Exit interview and return to setup lobby? Current progress will pause.')) {
        this.isSessionActive = false;
        this.render(container);
      }
    });

    // Pause / Resume
    document.getElementById('btn-pause-toggle')?.addEventListener('click', () => {
      this.session.isPaused = !this.session.isPaused;
      const btnText = document.getElementById('pause-btn-text');
      if (btnText) btnText.textContent = this.session.isPaused ? 'Resume' : 'Pause';
      window.showToast?.(this.session.isPaused ? 'Session Paused' : 'Session Resumed', 'info');
    });

    // End Early & Go to Report
    document.getElementById('btn-end-session-early')?.addEventListener('click', () => {
      if (confirm('End interview session now and generate your performance report?')) {
        this.handleFinishInterview();
      }
    });

    // Sub-tabs: Voice vs Text Answer
    document.getElementById('tab-answer-voice')?.addEventListener('click', () => {
      this.session.answerMethod = 'voice';
      this.render(container);
    });

    document.getElementById('tab-answer-text')?.addEventListener('click', () => {
      this.session.answerMethod = 'text';
      this.render(container);
    });

    // Textarea input watcher
    const textarea = document.getElementById('textarea-user-answer');
    textarea?.addEventListener('input', (e) => {
      this.session.textAnswer = e.target.value;
      const wordCount = e.target.value.trim() ? e.target.value.trim().split(/\s+/).length : 0;
      const counterEl = document.getElementById('text-word-counter');
      if (counterEl) counterEl.textContent = `${wordCount} words`;
    });

    // Voice Recording Toggle (Start/Stop)
    document.getElementById('btn-toggle-recording')?.addEventListener('click', () => {
      this.toggleVoiceRecording();
    });

    // Re-record Voice
    document.getElementById('btn-rerecord-voice')?.addEventListener('click', () => {
      speechEngine.stopListening();
      this.session.isRecording = false;
      if (this.session.recordingInterval) clearInterval(this.session.recordingInterval);
      this.session.recordingSeconds = 0;
      this.session.voiceTranscript = '';
      window.showToast?.('Voice recording reset. Ready to speak.', 'info');
      this.render(container);
    });

    // Submit Answer Action
    document.getElementById('btn-submit-user-answer')?.addEventListener('click', () => {
      this.handleSubmitAnswer();
    });

    // Show/Hide Model Answer Accordion
    document.getElementById('btn-toggle-model-answer')?.addEventListener('click', () => {
      this.session.showModelAnswer = !this.session.showModelAnswer;
      this.render(container);
    });

    // Next Question Action
    document.getElementById('btn-proceed-next-q')?.addEventListener('click', () => {
      this.handleProceedNextQuestion();
    });

    // Video Toolbar buttons
    document.getElementById('btn-auto-frame')?.addEventListener('click', (e) => {
      const feed = document.getElementById('simulated-feed') || document.getElementById('webcam-stream');
      const active = speechEngine.toggleFilter('autoFraming', feed);
      e.currentTarget.classList.toggle('active', active);
    });

    document.getElementById('btn-lighting')?.addEventListener('click', (e) => {
      const feed = document.getElementById('simulated-feed') || document.getElementById('webcam-stream');
      const active = speechEngine.toggleFilter('lighting', feed);
      e.currentTarget.classList.toggle('active', active);
    });

    document.getElementById('btn-virtual-bg')?.addEventListener('click', (e) => {
      const feed = document.getElementById('simulated-feed') || document.getElementById('webcam-stream');
      const active = speechEngine.toggleFilter('virtualBackground', feed);
      e.currentTarget.classList.toggle('active', active);
    });

    document.getElementById('btn-toggle-cam')?.addEventListener('click', async () => {
      const webcamEl = document.getElementById('webcam-stream');
      const simEl = document.getElementById('simulated-feed');
      if (!webcamEl || !simEl) return;

      if (speechEngine.isWebcamActive) {
        speechEngine.stopWebcam(webcamEl);
        webcamEl.style.display = 'none';
        simEl.style.display = 'block';
        window.showToast?.('Using simulated avatar feed', 'info');
      } else {
        const success = await speechEngine.startWebcam(webcamEl);
        if (success) {
          simEl.style.display = 'none';
          webcamEl.style.display = 'block';
          window.showToast?.('Connected to live webcam', 'success');
        } else {
          window.showToast?.('Webcam unavailable. Using simulated stream.', 'warning');
        }
      }
    });
  }

  toggleVoiceRecording() {
    if (!this.session.isRecording) {
      // Start Recording
      this.session.isRecording = true;
      this.session.recordingSeconds = 0;
      if (this.session.recordingInterval) clearInterval(this.session.recordingInterval);

      this.session.recordingInterval = setInterval(() => {
        this.session.recordingSeconds++;
      }, 1000);

      speechEngine.startListening((text, isFinal) => {
        this.session.voiceTranscript = text;
        const box = this.container?.querySelector('.voice-record-panel span:first-child');
        if (box) {
          this.render(this.container);
        }
      });

      window.showToast?.('Listening... Speak clearly into your microphone.', 'info');
      this.render(this.container);
    } else {
      // Stop Recording
      speechEngine.stopListening();
      this.session.isRecording = false;
      if (this.session.recordingInterval) clearInterval(this.session.recordingInterval);
      window.showToast?.('Recording captured. Click Submit Answer to evaluate.', 'success');
      this.render(this.container);
    }
  }

  async handleSubmitAnswer() {
    // Stop recording if active
    if (this.session.isRecording) {
      speechEngine.stopListening();
      this.session.isRecording = false;
      if (this.session.recordingInterval) clearInterval(this.session.recordingInterval);
    }

    // Always fetch latest text from DOM if text area exists
    const textInputEl = document.getElementById('textarea-user-answer');
    if (textInputEl && textInputEl.value) {
      this.session.textAnswer = textInputEl.value;
    }

    let answerText = '';
    if (this.session.answerMethod === 'voice') {
      answerText = this.session.voiceTranscript.trim();
      // If voice transcript is empty but textarea has text, take textarea
      if (!answerText && textInputEl && textInputEl.value.trim()) {
        answerText = textInputEl.value.trim();
      }
    } else {
      answerText = textInputEl ? textInputEl.value.trim() : this.session.textAnswer.trim();
      // If textarea is empty but voice was recorded, fallback to voice transcript
      if (!answerText && this.session.voiceTranscript.trim()) {
        answerText = this.session.voiceTranscript.trim();
      }
    }

    if (!answerText) {
      window.showToast?.('Please provide an answer using voice or text before submitting.', 'warning');
      return;
    }

    this.session.isEvaluating = true;
    this.render(this.container);

    const q = this.session.currentQuestion;
    const payload = {
      session_id: this.session.sessionId,
      question_index: this.session.currentQuestionIndex,
      question: q.question,
      category: q.category,
      answer_text: answerText,
      target_role: this.config.targetRole,
      difficulty: this.config.difficulty,
      time_taken_sec: this.session.recordingSeconds || 45
    };

    console.log('[Interview Coach] Submitting answer evaluation payload:', {
      question: q.question,
      category: q.category,
      answer_length: answerText.length,
      answer_snippet: answerText.substring(0, 100)
    });

    try {
      const res = await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error(`Evaluation request failed (status ${res.status})`);
      const evalResult = await res.json();

      this.session.isEvaluating = false;
      this.session.currentEvaluation = evalResult;
      this.session.showModelAnswer = false;

      // Save to completed answers list
      this.session.answers.push({
        question_index: q.question_index,
        question: q.question,
        category: q.category,
        answer_text: answerText,
        overall_score: evalResult.overall_score,
        scores_breakdown: evalResult.scores_breakdown,
        what_you_did_well: evalResult.what_you_did_well,
        what_could_be_improved: evalResult.what_could_be_improved,
        ai_recommendation: evalResult.ai_recommendation,
        model_answer: evalResult.model_answer,
        evaluation_mode: evalResult.evaluation_mode
      });

      window.showToast?.(`Answer Evaluated! Score: ${evalResult.overall_score}/100`, 'success');
      this.render(this.container);

    } catch (err) {
      console.warn('[Interview Coach] Evaluation fallback triggered:', err);
      // Dynamic local rubric evaluation if backend network fails
      const fallbackEval = this.evaluateLocally(q, answerText, this.config.targetRole);

      this.session.isEvaluating = false;
      this.session.currentEvaluation = fallbackEval;
      this.session.answers.push({
        question_index: q.question_index,
        question: q.question,
        category: q.category,
        answer_text: answerText,
        ...fallbackEval
      });
      window.showToast?.(`Evaluated in local backup mode (${fallbackEval.overall_score}/100)`, 'info');
      this.render(this.container);
    }
  }

  evaluateLocally(q, answerText, role) {
    const text = (answerText || '').trim();
    const words = text.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const textLower = text.toLowerCase();

    const hasIrrelevant = /pizza|burger|hiking|video game|movie|song|vacation|weather|football|cricket|weekend|dog|cat/.test(textLower);
    const hasMetrics = /\d+%|\$\d+|\d+\s*(?:users|ms|seconds|rps|dau|qps|requests|orders|hours|days|weeks)/.test(textLower);
    const hasStar = /when|during|in a project|we were|responsible|i built|i implemented|i designed|i led|result|reduced|improved/.test(textLower);
    const hasTech = /api|database|sql|performance|latency|async|testing|architecture|microservice|docker|cloud|cache|redis|spring|java|python|aws|kafka/.test(textLower);

    let rel = 5, tech = 5, comm = 6, comp = 3, prob = 3, conf = 5;

    if (hasIrrelevant) {
      rel = 1; tech = 1; comm = 3;
    } else {
      if (wordCount >= 45) { rel = 8; comm = 9; }
      else if (wordCount >= 20) { rel = 6; comm = 6; }
      else { rel = 3; comm = 3; }
      
      if (hasTech) tech = 8;
      if (hasStar) comp = 7;
      if (hasMetrics) { comp = Math.min(10, comp + 2); prob = 7; }
    }

    let overall;
    if (wordCount < 8) overall = Math.min(25, wordCount * 3);
    else if (hasIrrelevant) overall = 12;
    else if (wordCount < 20) overall = Math.min(45, 25 + wordCount);
    else {
      overall = Math.round((rel * 0.25 + tech * 0.25 + comp * 0.20 + comm * 0.15 + prob * 0.10 + conf * 0.05) * 10);
      if (hasMetrics) overall = Math.min(96, overall + 5);
    }
    overall = Math.max(10, Math.min(98, overall));

    let whatWell, whatImprove, aiRec;
    if (hasIrrelevant) {
      whatWell = "You submitted a response.";
      whatImprove = "The answer appears off-topic relative to the interview question.";
      aiRec = "Answer the question directly using technical examples from your projects.";
    } else if (wordCount < 20) {
      whatWell = "You initiated a brief answer.";
      whatImprove = `Your response is very short (${wordCount} words). Expand on your implementation actions and results.`;
      aiRec = "Use the STAR method: Situation → Task → Action → Result.";
    } else if (overall >= 85) {
      whatWell = "Strong STAR response with quantified results and technical precision.";
      whatImprove = "Elaborate on production observability and recovery strategies.";
      aiRec = "Maintain this executive-level structured communication.";
    } else {
      whatWell = "Clear technical framing of the scenario.";
      whatImprove = "Add measurable outcome metrics to prove the impact of your actions.";
      aiRec = "Quantify your achievements with percentage improvements or user scale.";
    }

    return {
      success: true,
      overall_score: overall,
      scores_breakdown: {
        relevance: rel,
        technical_accuracy: tech,
        communication: comm,
        completeness: comp,
        problem_solving: prob,
        confidence: conf
      },
      what_you_did_well: whatWell,
      what_could_be_improved: whatImprove,
      ai_recommendation: aiRec,
      model_answer: q.sample_model_answer || `In our project, I architected the solution, implemented automated tests, and reduced latency by 28% with zero downtime.`,
      evaluation_mode: "rubric_fallback"
    };
  }

  async handleProceedNextQuestion() {
    const nextIdx = this.session.currentQuestionIndex + 1;

    // If all questions answered -> Finish Interview
    if (nextIdx >= this.session.totalQuestions) {
      this.handleFinishInterview();
      return;
    }

    window.showToast?.(`Generating adaptive Question ${nextIdx + 1}...`, 'info');

    const prevEval = this.session.currentEvaluation;
    const prevQ = this.session.currentQuestion;
    const prevAns = this.session.answers[this.session.answers.length - 1]?.answer_text || '';

    // Reset current question answer state
    this.session.currentQuestionIndex = nextIdx;
    this.session.currentEvaluation = null;
    this.session.voiceTranscript = '';
    this.session.textAnswer = '';
    this.session.showModelAnswer = false;

    // Fetch next adaptive question from backend
    try {
      const res = await fetch('/api/interview/question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: this.session.sessionId,
          current_question_index: nextIdx,
          total_questions: this.session.totalQuestions,
          target_role: this.config.targetRole,
          interview_type: this.config.interviewType,
          difficulty: this.config.difficulty,
          previous_score: prevEval?.overall_score || 75,
          previous_question: prevQ.question,
          previous_answer: prevAns
        })
      });

      if (!res.ok) throw new Error('Adaptive question fetch failed');
      const nextQ = await res.json();
      this.session.currentQuestion = nextQ;
      this.render(this.container);

    } catch (err) {
      console.warn('Next question fallback triggered:', err);
      this.session.currentQuestion = {
        id: `q-fb-${nextIdx + 1}`,
        question_index: nextIdx,
        total_questions: this.session.totalQuestions,
        category: `System Design & Problem Solving`,
        role: this.config.targetRole,
        difficulty: this.config.difficulty,
        question: `How do you approach error handling, logging, and performance monitoring when deploying a ${this.config.targetRole} service?`,
        context_reason: 'Evaluating operational robustness and reliability engineering.',
        recommended_duration_sec: 90,
        expected_criteria: ['Logging frameworks', 'Error boundaries', 'Alerting & latency monitoring'],
        sample_model_answer: 'I set up structured JSON logging, distributed tracing with OpenTelemetry, and alert thresholds on p99 latency.'
      };
      this.render(this.container);
    }
  }

  async handleFinishInterview() {
    window.showToast?.('Synthesizing your full interview performance report...', 'info');

    const isGuest = store.isGuest();

    // Increment guest quota if in guest mode
    if (isGuest) {
      store.incrementGuestQuota('interview');
    }

    try {
      const res = await fetch('/api/interview/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: this.session.sessionId,
          target_role: this.config.targetRole,
          interview_type: this.config.interviewType,
          difficulty: this.config.difficulty,
          answers: this.session.answers,
          is_guest: isGuest
        })
      });

      if (!res.ok) throw new Error('Finish report failed');
      const report = await res.json();

      this.session.finalReport = report;
      this.isSessionActive = 'report';

      // Also log session into state store
      store.addInterviewSession({
        id: report.session_id,
        role: report.target_role,
        interview_type: report.interview_type,
        difficulty: report.difficulty,
        overall_score: report.overall_score,
        score: report.overall_score,
        date: report.date,
        report_json: JSON.stringify(report)
      });

      this.render(this.container);

    } catch (err) {
      console.warn('Final report fallback:', err);
      // Construct fallback report
      this.session.finalReport = {
        session_id: this.session.sessionId,
        target_role: this.config.targetRole,
        interview_type: this.config.interviewType,
        difficulty: this.config.difficulty,
        overall_score: 76,
        performance_breakdown: {
          technical_knowledge: 80,
          communication: 78,
          relevance: 82,
          problem_solving: 70,
          confidence: 72
        },
        strengths: [
          'Solid technical fundamentals and domain knowledge',
          'Clear, professional communication style'
        ],
        areas_to_improve: [
          'Structure all answers using the STAR format (Situation, Task, Action, Result)',
          'Add quantifiable metrics (latency, percentages, users) to project accomplishments'
        ],
        personalized_practice_plan: [
          { priority: 1, topic: `${this.config.targetRole} Architecture`, reason: 'Core technical requirement' },
          { priority: 2, topic: 'STAR Method Outcomes', reason: 'Improve conclusion metrics' },
          { priority: 3, topic: 'Behavioral Leadership', reason: 'Strengthen conflict resolution answers' }
        ],
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        total_questions_answered: this.session.answers.length,
        detailed_answers: this.session.answers
      };

      this.isSessionActive = 'report';
      this.render(this.container);
    }
  }

  // ==========================================================================
  // 3. FINAL INTERVIEW PERFORMANCE DASHBOARD (PRD Section 8 - 11)
  // ==========================================================================

  renderFinalReport(container) {
    const report = this.session.finalReport;
    const isGuest = store.isGuest();
    const baseScore = report.overall_score || 70;
    const perf = report.performance_breakdown || {
      technical_knowledge: Math.min(98, Math.max(20, baseScore + 2)),
      communication: Math.min(98, Math.max(20, baseScore - 2)),
      relevance: Math.min(98, Math.max(20, baseScore + 1)),
      problem_solving: Math.min(98, Math.max(20, baseScore - 4)),
      confidence: Math.min(98, Math.max(20, baseScore))
    };

    container.innerHTML = `
      <div class="interview-lobby-container" style="animation: fadeIn 0.3s ease;">
        
        <!-- Header Report Banner -->
        <div class="report-header-banner">
          <div>
            <div style="font-size: 0.78rem; font-weight: 800; color: var(--primary); text-transform: uppercase; letter-spacing: 0.05em;">
              INTERVIEW PERFORMANCE REPORT
            </div>
            <h2 style="font-size: 1.6rem; color: var(--text-main); margin: 4px 0 6px 0;">
              ${report.target_role} — ${report.interview_type}
            </h2>
            <div style="font-size: 0.84rem; color: #64748B;">
              ${report.difficulty} Level • ${report.total_questions_answered || report.detailed_answers?.length || 5} Questions Answered • Completed on ${report.date}
            </div>
          </div>

          <!-- Overall Score Badge -->
          <div style="text-align: center; background: #EEF2FF; border: 2px solid #C7D2FE; border-radius: var(--radius-lg); padding: 12px 24px;">
            <div style="font-size: 0.72rem; font-weight: 800; color: #4338CA; text-transform: uppercase;">Overall Score</div>
            <div style="font-size: 2.5rem; font-weight: 900; color: var(--primary); margin: 2px 0;">
              ${report.overall_score} <span style="font-size: 1.1rem; color: #64748B; font-weight: 600;">/ 100</span>
            </div>
            <div style="font-size: 0.75rem; color: #059669; font-weight: 700;">
              ${report.overall_score >= 75 ? 'Ready for Job Applications' : 'Needs Practice on Key Areas'}
            </div>
          </div>
        </div>

        ${isGuest ? `
          <!-- Guest Session Summary Notice (FR-3.4 / Section 0) -->
          <div class="guest-summary-banner" style="margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.2rem;">📋</span>
              <div>
                <strong>Guest Session Summary:</strong> This detailed report is temporary and will be cleared when you close the tab.
              </div>
            </div>
            <button class="btn-primary" id="btn-guest-save-report" style="font-size: 0.8rem; padding: 8px 16px;">
              Save to History →
            </button>
          </div>
        ` : ''}

        <!-- 2-Column Breakdown & Practice Plan -->
        <div class="report-breakdown-grid">
          
          <!-- Left: Performance Breakdown Bars -->
          <div class="card" style="padding: 22px;">
            <div style="font-size: 0.95rem; font-weight: 800; color: var(--text-main); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <span>📊</span> Performance Breakdown
            </div>

            <!-- Technical Knowledge -->
            <div style="margin-bottom: 14px;">
              <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 700; margin-bottom: 4px;">
                <span>Technical Knowledge</span>
                <strong style="color: var(--primary);">${perf.technical_knowledge}/100</strong>
              </div>
              <div class="progress-bar-wrap"><div class="progress-bar-fill primary" style="width: ${perf.technical_knowledge}%;"></div></div>
            </div>

            <!-- Communication -->
            <div style="margin-bottom: 14px;">
              <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 700; margin-bottom: 4px;">
                <span>Communication</span>
                <strong style="color: #059669;">${perf.communication}/100</strong>
              </div>
              <div class="progress-bar-wrap"><div class="progress-bar-fill success" style="width: ${perf.communication}%;"></div></div>
            </div>

            <!-- Relevance -->
            <div style="margin-bottom: 14px;">
              <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 700; margin-bottom: 4px;">
                <span>Relevance</span>
                <strong style="color: var(--primary);">${perf.relevance}/100</strong>
              </div>
              <div class="progress-bar-wrap"><div class="progress-bar-fill primary" style="width: ${perf.relevance}%;"></div></div>
            </div>

            <!-- Problem Solving -->
            <div style="margin-bottom: 14px;">
              <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 700; margin-bottom: 4px;">
                <span>Problem Solving</span>
                <strong style="color: #D97706;">${perf.problem_solving}/100</strong>
              </div>
              <div class="progress-bar-wrap"><div class="progress-bar-fill warning" style="width: ${perf.problem_solving}%;"></div></div>
            </div>

            <!-- Confidence -->
            <div>
              <div style="display: flex; justify-content: space-between; font-size: 0.82rem; font-weight: 700; margin-bottom: 4px;">
                <span>Confidence</span>
                <strong style="color: #4F46E5;">${perf.confidence}/100</strong>
              </div>
              <div class="progress-bar-wrap"><div class="progress-bar-fill primary" style="width: ${perf.confidence}%;"></div></div>
            </div>
          </div>

          <!-- Right: Strengths & Areas to Improve -->
          <div class="card" style="padding: 22px;">
            <div style="font-size: 0.95rem; font-weight: 800; color: var(--text-main); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
              <span>⭐</span> Strengths & Areas to Improve
            </div>

            <!-- Strengths -->
            <div style="margin-bottom: 16px;">
              <div style="font-size: 0.78rem; font-weight: 800; color: #166534; text-transform: uppercase; margin-bottom: 6px;">
                Your Strengths
              </div>
              ${report.strengths.map(s => `
                <div style="display: flex; align-items: flex-start; gap: 8px; font-size: 0.84rem; color: #1E293B; margin-bottom: 6px;">
                  <span style="color: #16A34A; font-weight: 800;">✔</span>
                  <span>${s}</span>
                </div>
              `).join('')}
            </div>

            <!-- Areas to Improve -->
            <div>
              <div style="font-size: 0.78rem; font-weight: 800; color: #9A3412; text-transform: uppercase; margin-bottom: 6px;">
                Areas to Improve
              </div>
              ${report.areas_to_improve.map(a => `
                <div style="display: flex; align-items: flex-start; gap: 8px; font-size: 0.84rem; color: #1E293B; margin-bottom: 6px;">
                  <span style="color: #D97706; font-weight: 800;">⚠</span>
                  <span>${a}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- 3. Personalized Practice Plan (PRD Section 11) -->
        <div class="card" style="padding: 22px; margin-bottom: 24px;">
          <div style="font-size: 0.95rem; font-weight: 800; color: var(--text-main); margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
            <span>🎯</span> Personalized Practice Plan
          </div>

          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px;">
            ${(report.personalized_practice_plan || []).map(plan => `
              <div class="practice-plan-card">
                <span class="practice-priority-badge">Priority ${plan.priority}</span>
                <div>
                  <strong style="font-size: 0.9rem; color: var(--text-main); display: block; margin-bottom: 2px;">${plan.topic}</strong>
                  <div style="font-size: 0.78rem; color: #64748B; line-height: 1.4;">${plan.reason}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Bottom Action Bar -->
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; background: white; border: 1px solid var(--border-light); border-radius: var(--radius-md); padding: 16px 20px;">
          <button class="action-pill-btn" id="btn-return-lobby-action" style="font-weight: 700;">
            ← Return to Setup
          </button>

          <div style="display: flex; gap: 10px;">
            <button class="btn-primary" id="btn-practice-again-main" style="padding: 10px 22px; font-weight: 800;">
              🔄 PRACTICE AGAIN
            </button>
          </div>
        </div>
      </div>
    `;

    this.attachReportEvents(container);
  }

  attachReportEvents(container) {
    // Practice Again
    const practiceAgainHandler = () => {
      this.isSessionActive = false;
      this.activeTab = 'setup';
      this.render(container);
    };

    document.getElementById('btn-practice-again-main')?.addEventListener('click', practiceAgainHandler);
    document.getElementById('btn-return-lobby-action')?.addEventListener('click', practiceAgainHandler);

    // Guest Save Report Trigger (Section 0 & 12)
    document.getElementById('btn-guest-save-report')?.addEventListener('click', () => {
      window.openSaveSignupPrompt('end_interview', () => {
        window.showToast?.('Session saved to your account history!', 'success');
        this.render(container);
      });
    });
  }

  // ==========================================================================
  // 4. MODALS & HISTORY VIEWER
  // ==========================================================================

  async openHistoryReportModal(sessionId) {
    const modalOverlay = document.getElementById('global-modal-overlay');
    const modalContent = document.getElementById('global-modal-content');
    if (!modalOverlay || !modalContent) return;

    modalContent.innerHTML = `
      <div style="text-align: center; padding: 40px;">
        <div class="loading-spinner"></div>
        <div style="margin-top: 12px; font-weight: 700; color: #64748B;">Loading interview report...</div>
      </div>
    `;
    modalOverlay.classList.add('active');

    try {
      const res = await fetch(`/api/interview/report/${sessionId}`);
      if (!res.ok) throw new Error('Report not found');
      const report = await res.json();

      modalContent.innerHTML = `
        <div class="modal-header">
          <div>
            <div style="font-size: 0.75rem; font-weight: 800; color: var(--primary); text-transform: uppercase;">Detailed Interview Report</div>
            <h3 style="margin-top: 2px;">${report.target_role || 'Interview Session'}</h3>
          </div>
          <button class="btn-close-modal" id="btn-close-hist-modal">&times;</button>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px;">
          <div style="background: #EEF2FF; border-radius: var(--radius-md); padding: 14px; text-align: center;">
            <div style="font-size: 0.72rem; font-weight: 700; color: #4338CA;">OVERALL SCORE</div>
            <div style="font-size: 2rem; font-weight: 900; color: var(--primary);">${report.overall_score}/100</div>
          </div>
          <div style="background: #F8FAFC; border-radius: var(--radius-md); padding: 14px;">
            <div style="font-size: 0.72rem; font-weight: 700; color: #64748B;">FORMAT</div>
            <div style="font-size: 0.9rem; font-weight: 700; margin-top: 4px;">${report.interview_type} • ${report.difficulty}</div>
            <div style="font-size: 0.75rem; color: #64748B;">Date: ${report.date}</div>
          </div>
        </div>

        <!-- Strengths & Areas to Improve -->
        <div style="margin-bottom: 16px;">
          <strong style="font-size: 0.85rem; color: #166534; display: block; margin-bottom: 4px;">Key Strengths:</strong>
          <ul style="margin: 0; padding-left: 18px; font-size: 0.82rem; color: #334155;">
            ${(report.strengths || []).map(s => `<li>${s}</li>`).join('')}
          </ul>
        </div>

        <div style="margin-bottom: 20px;">
          <strong style="font-size: 0.85rem; color: #9A3412; display: block; margin-bottom: 4px;">Recommended Improvements:</strong>
          <ul style="margin: 0; padding-left: 18px; font-size: 0.82rem; color: #334155;">
            ${(report.areas_to_improve || []).map(a => `<li>${a}</li>`).join('')}
          </ul>
        </div>

        <div style="display: flex; justify-content: flex-end;">
          <button class="btn-primary" id="btn-close-hist-modal-action" style="font-size: 0.82rem; padding: 8px 18px;">
            Close Report
          </button>
        </div>
      `;

      document.getElementById('btn-close-hist-modal')?.addEventListener('click', () => modalOverlay.classList.remove('active'));
      document.getElementById('btn-close-hist-modal-action')?.addEventListener('click', () => modalOverlay.classList.remove('active'));

    } catch (e) {
      modalContent.innerHTML = `
        <div class="modal-header">
          <h3>Interview Report</h3>
          <button class="btn-close-modal" onclick="document.getElementById('global-modal-overlay').classList.remove('active')">&times;</button>
        </div>
        <p style="color: #64748B; font-size: 0.88rem;">Could not load session details. This may have been a temporary guest session.</p>
      `;
    }
  }

  renderQuotaExceededView(container) {
    container.innerHTML = `
      <div style="max-width: 600px; margin: 40px auto; text-align: center; background: white; border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 36px 24px; box-shadow: var(--shadow-sm);">
        <div style="font-size: 3rem; margin-bottom: 12px;">🎯</div>
        <h3 style="font-size: 1.35rem; color: var(--text-main); margin-bottom: 8px;">Free Guest Session Completed</h3>
        <p style="font-size: 0.9rem; color: var(--text-muted); line-height: 1.5; margin-bottom: 24px;">
          You've completed your 1 free guest mock interview session for today. Create a free account to unlock unlimited mock interviews, speech analysis, and role-tailored questions!
        </p>
        <div style="display: flex; gap: 12px; justify-content: center;">
          <button class="action-pill-btn" onclick="appController.navigate('dashboard');">
            Return to Dashboard
          </button>
          <button class="btn-primary" onclick="window.openAuthModal('signup', 'Sign up to unlock unlimited mock interviews:')">
            Create Free Account →
          </button>
        </div>
      </div>
    `;
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  startTimer() {
    if (this.session.timerInterval) clearInterval(this.session.timerInterval);
    this.session.timerInterval = setInterval(() => {
      if (!this.session.isPaused && this.isSessionActive === true) {
        this.session.timerSeconds++;
        const el = document.getElementById('session-timer-text');
        if (el) el.textContent = this.formatTime(this.session.timerSeconds);
      }
    }, 1000);
  }

  startWaveformAnimation() {
    if (this.session.waveformInterval) clearInterval(this.session.waveformInterval);
    this.session.waveformInterval = setInterval(() => {
      if (!this.session.isPaused && this.isSessionActive === true) {
        const bars = document.querySelectorAll('.wave-bar');
        bars.forEach(bar => {
          const randomH = Math.floor(Math.random() * 75) + 15;
          bar.style.height = `${randomH}%`;
        });
      }
    }, 120);
  }
}

export const interviewCoachView = new InterviewCoachView();
