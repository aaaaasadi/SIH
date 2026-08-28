/**
 * CareerAI - Upgraded Live Mock Interview Simulator & Personalized AI Coach (PCE-SW-PS-9 / SIH Upgrade)
 *
 * Implements:
 * 1. Personalized Question Generator based on Resume projects, skills, experience, and target JD.
 * 2. 6-Dimension Multi-Criteria Evaluation: Relevance, Clarity, Technical Accuracy, Confidence, Structure, Conciseness.
 * 3. Detailed Actionable AI Feedback: "What you did well", "What could improve", "Better Structure (STAR method)".
 * 4. Dual Answer Modalities: Live Speech-to-Text (Web Speech API) & Keyboard typing.
 * 5. Comprehensive Final Interview Report & Career Readiness synchronizer.
 */

import { store, PERSONAS } from './state.js';
import { speechEngine } from './speechEngine.js';
import { aiEngine } from './aiEngine.js';

export class InterviewCoachView {
  constructor() {
    this.container = null;
    this.isSessionActive = false; // false (Setup Lobby) | true (Active Session) | 'report' (Final Report)
    this.activeTab = 'setup';

    this.config = {
      targetRole: 'Software Developer',
      interviewType: 'Mixed', // 'Technical' | 'Behavioral' | 'Project-based' | 'Mixed'
      difficulty: 'Medium', // 'Easy' | 'Medium' | 'Hard'
      numQuestions: 5
    };

    this.session = {
      sessionId: null,
      currentQuestionIndex: 0,
      totalQuestions: 5,
      allQuestions: [],
      currentQuestion: null,
      answers: [],
      currentEvaluation: null,
      isEvaluating: false,
      isRecording: false,
      voiceTranscript: '',
      textAnswer: '',
      timerSeconds: 0,
      timerInterval: null,
      waveformInterval: null
    };

    this.simulatedVideoUrl = store.getCurrentPersona()?.avatar || PERSONAS.priya.avatar;
  }

  render(container) {
    this.container = container;
    this.simulatedVideoUrl = store.getCurrentPersona()?.avatar || PERSONAS.priya.avatar;

    if (this.isSessionActive === 'report') {
      this.renderFinalReport(container);
    } else if (this.isSessionActive === true) {
      this.renderActiveRoom(container);
    } else {
      this.renderSetupLobby(container);
    }
  }

  // ==========================================================================
  // 1. SETUP & READINESS LOBBY
  // ==========================================================================

  renderSetupLobby(container) {
    if (this.session.timerInterval) clearInterval(this.session.timerInterval);
    if (this.session.waveformInterval) clearInterval(this.session.waveformInterval);

    const resume = store.state.resume;
    const currentJd = store.state.hasActiveJd && store.state.currentJdKey ? store.state.jobDescriptions[store.state.currentJdKey] : null;

    // Extract real projects from resume
    const projSection = resume.sections?.find(s => s.id === 'projects');
    const detectedProjects = (projSection?.items || []).map(p => p.title).filter(Boolean);

    container.innerHTML = `
      <div class="interview-lobby-container" style="max-width: 960px; margin: 0 auto;">
        
        <!-- Hero Card -->
        <div class="card" style="padding: 24px; margin-bottom: 20px; background: linear-gradient(135deg, #1E1B4B 0%, #312E81 100%); color: white; border-radius: var(--radius-lg); box-shadow: 0 4px 20px rgba(0,0,0,0.12);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;">
            <div>
              <span class="guest-badge-pill" style="background: rgba(255,255,255,0.2); color: white; margin-bottom: 6px; display: inline-block;">
                🎯 AI Personalized Simulator
              </span>
              <h2 style="font-size: 1.65rem; font-weight: 800; margin: 4px 0 6px 0; color: white;">AI Mock Interview Coach</h2>
              <p style="margin: 0; opacity: 0.9; font-size: 0.9rem; max-width: 600px; line-height: 1.45;">
                Conduct realistic voice or text mock sessions tailored directly to your <strong>resume projects</strong> and <strong>target job description</strong>.
              </p>
            </div>
            <button class="btn-primary" id="btn-start-interview-hero" style="background: #10B981; border-color: #10B981; padding: 12px 28px; font-size: 1rem; font-weight: 800; display: flex; align-items: center; gap: 8px; box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);">
              <span>🚀</span> START INTERVIEW NOW
            </button>
          </div>
        </div>

        <!-- Setup Configuration Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px; margin-bottom: 20px;">
          
          <!-- Column 1: Parameters -->
          <div class="card" style="padding: 20px; border: 1.5px solid var(--border-light); border-radius: var(--radius-lg); background: white;">
            <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-main); margin-bottom: 14px;">Interview Configuration</h3>

            <!-- Role Selector -->
            <div style="margin-bottom: 14px;">
              <label style="font-size: 0.8rem; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">Target Role</label>
              <select id="sel-target-role" style="width: 100%; padding: 8px 12px; font-size: 0.86rem; border: 1.5px solid var(--border-light); border-radius: var(--radius-md);">
                <option value="Software Developer" ${this.config.targetRole === 'Software Developer' ? 'selected' : ''}>Software Engineer (Full Stack / Java / Python)</option>
                <option value="Product Analyst" ${this.config.targetRole === 'Product Analyst' ? 'selected' : ''}>Product Analyst (SQL / Analytics)</option>
                <option value="Product Manager" ${this.config.targetRole === 'Product Manager' ? 'selected' : ''}>Product Manager (Strategy / Agile)</option>
                <option value="AI/ML Engineer" ${this.config.targetRole === 'AI/ML Engineer' ? 'selected' : ''}>AI/ML Engineer (Python / PyTorch)</option>
              </select>
            </div>

            <!-- Category / Type -->
            <div style="margin-bottom: 14px;">
              <label style="font-size: 0.8rem; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">Interview Type</label>
              <div style="display: flex; gap: 8px;">
                ${['Mixed', 'Technical', 'Behavioral', 'Project-based'].map(t => `
                  <button class="action-pill-btn btn-cfg-type ${this.config.interviewType === t ? 'active' : ''}" data-type="${t}" style="flex: 1; text-align: center; font-size: 0.76rem; padding: 6px 4px; font-weight: 700;">
                    ${t}
                  </button>
                `).join('')}
              </div>
            </div>

            <!-- Difficulty -->
            <div>
              <label style="font-size: 0.8rem; font-weight: 700; color: #475569; display: block; margin-bottom: 4px;">Difficulty Level</label>
              <div style="display: flex; gap: 8px;">
                ${['Easy', 'Medium', 'Hard'].map(d => `
                  <button class="action-pill-btn btn-cfg-diff ${this.config.difficulty === d ? 'active' : ''}" data-diff="${d}" style="flex: 1; text-align: center; font-size: 0.78rem; padding: 6px 8px; font-weight: 700;">
                    ${d}
                  </button>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Column 2: Personalization & Real Context Sources -->
          <div class="card" style="padding: 20px; border: 1.5px solid var(--border-light); border-radius: var(--radius-lg); background: white;">
            <h3 style="font-size: 1.05rem; font-weight: 700; color: var(--text-main); margin-bottom: 14px;">Context Personalization</h3>
            
            <!-- Resume Context Indicator -->
            <div style="padding: 10px 14px; background: #F8FAFC; border-radius: var(--radius-md); border: 1px solid #E2E8F0; margin-bottom: 12px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 0.82rem; font-weight: 700; color: #0F172A;">📄 Active Resume Profile</span>
                <span style="font-size: 0.74rem; background: #ECFDF5; color: #059669; font-weight: 700; padding: 2px 6px; border-radius: 4px;">Connected</span>
              </div>
              <div style="font-size: 0.78rem; color: #64748B;">
                Candidate: <strong>${resume.candidate?.name || 'Candidate'}</strong>
                ${detectedProjects.length > 0 ? `<br>Detected Project: <em>"${detectedProjects[0]}"</em>` : ''}
              </div>
            </div>

            <!-- Job Description Indicator -->
            <div style="padding: 10px 14px; background: #F8FAFC; border-radius: var(--radius-md); border: 1px solid #E2E8F0; margin-bottom: 14px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                <span style="font-size: 0.82rem; font-weight: 700; color: #0F172A;">🎯 Target Job Description</span>
                <span style="font-size: 0.74rem; background: #EEF2FF; color: var(--primary); font-weight: 700; padding: 2px 6px; border-radius: 4px;">
                  ${currentJd ? 'Active' : 'Default'}
                </span>
              </div>
              <div style="font-size: 0.78rem; color: #64748B;">
                ${currentJd ? (currentJd.roleTag || currentJd.title) : 'Software Engineer Standard Rubric'}
              </div>
            </div>

            <div style="font-size: 0.78rem; color: #64748B; line-height: 1.4;">
              💡 <em>AI questions will quote your exact resume projects and test core competencies required for the target role.</em>
            </div>
          </div>

        </div>

      </div>
    `;

    this.attachLobbyListeners();
  }

  attachLobbyListeners() {
    document.getElementById('btn-start-interview-hero')?.addEventListener('click', () => {
      this.startInterviewSession();
    });

    this.container.querySelectorAll('.btn-cfg-type').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.config.interviewType = e.currentTarget.getAttribute('data-type');
        this.render(this.container);
      });
    });

    this.container.querySelectorAll('.btn-cfg-diff').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.config.difficulty = e.currentTarget.getAttribute('data-diff');
        this.render(this.container);
      });
    });

    document.getElementById('sel-target-role')?.addEventListener('change', (e) => {
      this.config.targetRole = e.target.value;
    });
  }

  // ==========================================================================
  // 2. ACTIVE INTERVIEW ROOM
  // ==========================================================================

  startInterviewSession() {
    const resume = store.state.resume;
    const currentJd = store.state.hasActiveJd && store.state.currentJdKey ? store.state.jobDescriptions[store.state.currentJdKey] : null;

    // Generate personalized questions
    const generated = aiEngine.generatePersonalizedQuestions(resume, currentJd, this.config);

    this.session = {
      sessionId: 'sess-' + Date.now(),
      currentQuestionIndex: 0,
      totalQuestions: generated.length,
      allQuestions: generated,
      currentQuestion: generated[0],
      answers: [],
      currentEvaluation: null,
      isEvaluating: false,
      isRecording: false,
      voiceTranscript: '',
      textAnswer: '',
      timerSeconds: 0,
      timerInterval: null
    };

    this.isSessionActive = true;
    this.startTimer();
    this.render(this.container);
    window.showToast?.('Mock interview started! Read question and speak or type your answer.', 'info');
  }

  startTimer() {
    if (this.session.timerInterval) clearInterval(this.session.timerInterval);
    this.session.timerSeconds = 0;
    this.session.timerInterval = setInterval(() => {
      this.session.timerSeconds++;
      const timerEl = document.getElementById('session-timer-display');
      if (timerEl) {
        const m = String(Math.floor(this.session.timerSeconds / 60)).padStart(2, '0');
        const s = String(this.session.timerSeconds % 60).padStart(2, '0');
        timerEl.textContent = `${m}:${s}`;
      }
    }, 1000);
  }

  renderActiveRoom(container) {
    const q = this.session.currentQuestion;
    const qIdx = this.session.currentQuestionIndex + 1;
    const totalQ = this.session.totalQuestions;
    const evalData = this.session.currentEvaluation;

    container.innerHTML = `
      <div class="interview-room-container" style="max-width: 980px; margin: 0 auto;">
        
        <!-- Header Bar with Timer & End Session -->
        <div style="display: flex; justify-content: space-between; align-items: center; background: white; padding: 12px 20px; border-radius: var(--radius-md); border: 1.5px solid var(--border-light); margin-bottom: 16px;">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span style="font-weight: 800; font-size: 0.95rem; color: #0F172A;">Question ${qIdx} of ${totalQ}</span>
            <span class="badge-role" style="font-size: 0.74rem; padding: 2px 8px; background: #EEF2FF; color: var(--primary); font-weight: 700;">${q.category}</span>
            <span class="demo-chip-tag" style="font-size: 0.72rem;">Difficulty: ${q.difficulty}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="font-weight: 700; font-size: 0.92rem; color: #1E293B; display: flex; align-items: center; gap: 6px;">
              <span>⏱</span> <span id="session-timer-display">00:00</span>
            </div>
            <button class="action-pill-btn" id="btn-abort-session" style="font-size: 0.78rem; padding: 6px 12px; color: #EF4444; border-color: #FCA5A5;">
              End Session
            </button>
          </div>
        </div>

        <!-- Main Interview Grid: AI Interviewer Card + Candidate Answer Area -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 18px; align-items: start;">
          
          <!-- Left: AI Interviewer Card -->
          <div class="card" style="padding: 22px; background: white; border: 1.5px solid var(--border-light); border-radius: var(--radius-lg);">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 14px;">
              <div style="width: 44px; height: 44px; border-radius: 50%; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem;">
                🤖
              </div>
              <div>
                <div style="font-weight: 700; font-size: 0.95rem; color: #0F172A;">AI Interview Coach</div>
                <div style="font-size: 0.75rem; color: #64748B;">Context Focus: ${q.focus || 'Technical Competence'}</div>
              </div>
            </div>

            <!-- Question Box -->
            <div style="background: #F8FAFC; border-left: 4px solid var(--primary); padding: 14px 16px; border-radius: 4px; margin-bottom: 16px;">
              <p style="font-size: 0.95rem; font-weight: 600; color: #1E293B; line-height: 1.5; margin: 0;">
                "${q.text}"
              </p>
            </div>

            <div style="font-size: 0.8rem; color: #64748B; line-height: 1.4;">
              💡 <em>Tip: Structure your answer using the STAR method (Situation, Task, Action, Result). State concrete technical actions you took.</em>
            </div>
          </div>

          <!-- Right: Candidate Response & Recording Area -->
          <div class="card" style="padding: 22px; background: white; border: 1.5px solid var(--border-light); border-radius: var(--radius-lg);">
            
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span style="font-size: 0.84rem; font-weight: 700; color: #0F172A;">Your Response:</span>
              <button class="action-pill-btn" id="btn-toggle-mic" style="font-size: 0.78rem; padding: 6px 14px; font-weight: 700; display: flex; align-items: center; gap: 6px; ${this.session.isRecording ? 'background: #EF4444; color: white; border-color: #EF4444;' : 'background: #EEF2FF; color: var(--primary);'}">
                <span>${this.session.isRecording ? '⏹ Stop Mic' : '🎤 Speak (STT)'}</span>
              </button>
            </div>

            <!-- Text Input / Transcript Area -->
            <textarea id="inp-answer-text" placeholder="Speak via microphone above or type your detailed answer here..." style="width: 100%; min-height: 140px; font-size: 0.88rem; padding: 12px; border: 1.5px solid var(--border-light); border-radius: var(--radius-md); font-family: inherit; line-height: 1.45; margin-bottom: 14px;">${this.session.textAnswer || this.session.voiceTranscript}</textarea>

            <!-- Evaluate Button -->
            <div style="display: flex; justify-content: flex-end; gap: 10px;">
              <button class="btn-primary" id="btn-submit-eval-answer" style="padding: 9px 22px; font-weight: 700; font-size: 0.88rem;">
                Analyze Answer →
              </button>
            </div>

          </div>

        </div>

        <!-- Bottom Feedback Panel (When Answer is Analyzed) -->
        ${evalData ? this.renderAnswerEvaluationPanel(evalData) : ''}

      </div>
    `;

    this.attachActiveRoomListeners();
  }

  renderAnswerEvaluationPanel(evalData) {
    const d = evalData.dimensions;
    const score = evalData.overallScore;
    const scoreColor = score >= 7.5 ? '#10B981' : (score >= 5.5 ? '#4F46E5' : '#EF4444');

    return `
      <div class="card" style="margin-top: 20px; padding: 22px; background: white; border: 1.5px solid var(--border-light); border-radius: var(--radius-lg); box-shadow: 0 4px 14px rgba(0,0,0,0.04);">
        
        <!-- Score Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1.5px solid #F1F5F9;">
          <div>
            <div style="font-size: 0.76rem; font-weight: 800; color: var(--text-muted); text-transform: uppercase;">AI Evaluation Results</div>
            <div style="font-size: 1.4rem; font-weight: 800; color: var(--text-main); margin-top: 2px;">
              Overall Score: <span style="color: ${scoreColor};">${evalData.scoreFormatted}</span>
            </div>
          </div>
          <button class="btn-primary" id="btn-next-question" style="padding: 10px 24px; font-weight: 800; font-size: 0.88rem;">
            ${this.session.currentQuestionIndex + 1 < this.session.totalQuestions ? 'Next Question →' : 'View Final Performance Report →'}
          </button>
        </div>

        <!-- 6-Dimension Grid Breakdown -->
        <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 10px; margin-bottom: 20px; text-align: center;">
          <div style="background: #F8FAFC; padding: 10px 6px; border-radius: var(--radius-md); border: 1px solid #E2E8F0;">
            <div style="font-size: 0.72rem; color: #64748B; font-weight: 700;">Relevance</div>
            <div style="font-size: 1.05rem; font-weight: 800; color: #0F172A; margin-top: 2px;">${d.relevance}/10</div>
          </div>
          <div style="background: #F8FAFC; padding: 10px 6px; border-radius: var(--radius-md); border: 1px solid #E2E8F0;">
            <div style="font-size: 0.72rem; color: #64748B; font-weight: 700;">Clarity</div>
            <div style="font-size: 1.05rem; font-weight: 800; color: #0F172A; margin-top: 2px;">${d.clarity}/10</div>
          </div>
          <div style="background: #F8FAFC; padding: 10px 6px; border-radius: var(--radius-md); border: 1px solid #E2E8F0;">
            <div style="font-size: 0.72rem; color: #64748B; font-weight: 700;">Tech Accuracy</div>
            <div style="font-size: 1.05rem; font-weight: 800; color: #0F172A; margin-top: 2px;">${d.technicalAccuracy}/10</div>
          </div>
          <div style="background: #F8FAFC; padding: 10px 6px; border-radius: var(--radius-md); border: 1px solid #E2E8F0;">
            <div style="font-size: 0.72rem; color: #64748B; font-weight: 700;">Confidence</div>
            <div style="font-size: 1.05rem; font-weight: 800; color: #0F172A; margin-top: 2px;">${d.confidence}/10</div>
          </div>
          <div style="background: #F8FAFC; padding: 10px 6px; border-radius: var(--radius-md); border: 1px solid #E2E8F0;">
            <div style="font-size: 0.72rem; color: #64748B; font-weight: 700;">Structure</div>
            <div style="font-size: 1.05rem; font-weight: 800; color: #0F172A; margin-top: 2px;">${d.structure}/10</div>
          </div>
          <div style="background: #F8FAFC; padding: 10px 6px; border-radius: var(--radius-md); border: 1px solid #E2E8F0;">
            <div style="font-size: 0.72rem; color: #64748B; font-weight: 700;">Conciseness</div>
            <div style="font-size: 1.05rem; font-weight: 800; color: #0F172A; margin-top: 2px;">${d.conciseness}/10</div>
          </div>
        </div>

        <!-- 3 Pillars: What You Did Well, What Could Improve, Better Structure -->
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px;">
          
          <!-- What You Did Well -->
          <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: var(--radius-md); padding: 14px;">
            <div style="font-size: 0.82rem; font-weight: 700; color: #065F46; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
              <span>✓</span> What You Did Well
            </div>
            <ul style="margin: 0; padding-left: 16px; font-size: 0.78rem; color: #064E3B; line-height: 1.45;">
              ${evalData.whatYouDidWell.map(w => `<li style="margin-bottom: 4px;">${w}</li>`).join('')}
            </ul>
          </div>

          <!-- What Could Improve -->
          <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: var(--radius-md); padding: 14px;">
            <div style="font-size: 0.82rem; font-weight: 700; color: #991B1B; margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
              <span>⚠</span> What Could Improve
            </div>
            <ul style="margin: 0; padding-left: 16px; font-size: 0.78rem; color: #7F1D1D; line-height: 1.45;">
              ${evalData.whatCouldImprove.map(i => `<li style="margin-bottom: 4px;">${i}</li>`).join('')}
            </ul>
          </div>

          <!-- Better Structure (STAR) -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: var(--radius-md); padding: 14px;">
            <div style="font-size: 0.82rem; font-weight: 700; color: var(--primary); margin-bottom: 6px; display: flex; align-items: center; gap: 6px;">
              <span>⭐</span> Recommended Structure (STAR)
            </div>
            <div style="font-size: 0.76rem; color: #475569; line-height: 1.4; white-space: pre-line;">
              ${evalData.betterStructure}
            </div>
          </div>

        </div>

      </div>
    `;
  }

  attachActiveRoomListeners() {
    // Abort session
    document.getElementById('btn-abort-session')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to exit this mock interview session?')) {
        this.isSessionActive = false;
        this.render(this.container);
      }
    });

    // Voice STT Toggle
    document.getElementById('btn-toggle-mic')?.addEventListener('click', () => {
      if (!this.session.isRecording) {
        // Start recording
        speechEngine.startListening(
          (transcript) => {
            this.session.voiceTranscript = transcript;
            const textEl = document.getElementById('inp-answer-text');
            if (textEl) textEl.value = transcript;
          },
          (err) => console.warn('STT warning:', err)
        );
        this.session.isRecording = true;
        this.renderActiveRoom(this.container);
      } else {
        // Stop recording
        speechEngine.stopListening();
        this.session.isRecording = false;
        this.renderActiveRoom(this.container);
      }
    });

    // Submit Answer for Evaluation
    document.getElementById('btn-submit-eval-answer')?.addEventListener('click', () => {
      const text = document.getElementById('inp-answer-text')?.value?.trim();
      if (!text) {
        window.showToast?.('Please speak or type your answer before analyzing.', 'warning');
        return;
      }
      this.session.textAnswer = text;
      const evaluation = aiEngine.evaluateAnswerDetailed(this.session.currentQuestion.text, text, this.session.timerSeconds);
      this.session.currentEvaluation = evaluation;
      this.session.answers.push({
        question: this.session.currentQuestion,
        answerText: text,
        evaluation
      });

      this.render(this.container);
    });

    // Next Question or Final Report
    document.getElementById('btn-next-question')?.addEventListener('click', () => {
      if (this.session.currentQuestionIndex + 1 < this.session.totalQuestions) {
        this.session.currentQuestionIndex++;
        this.session.currentQuestion = this.session.allQuestions[this.session.currentQuestionIndex];
        this.session.currentEvaluation = null;
        this.session.voiceTranscript = '';
        this.session.textAnswer = '';
        this.render(this.container);
      } else {
        this.isSessionActive = 'report';
        this.render(this.container);
      }
    });
  }

  // ==========================================================================
  // 3. FINAL INTERVIEW PERFORMANCE REPORT
  // ==========================================================================

  renderFinalReport(container) {
    if (this.session.timerInterval) clearInterval(this.session.timerInterval);

    const answers = this.session.answers;
    const avgScore = answers.length > 0
      ? Math.round((answers.reduce((acc, a) => acc + a.evaluation.overallScore, 0) / answers.length) * 10) / 10
      : 8.0;

    // Synchronize to global readiness score in state
    store.state.dashboardScores.interview_readiness = Math.round(avgScore * 10);
    store.saveState();

    container.innerHTML = `
      <div class="interview-report-container" style="max-width: 900px; margin: 0 auto;">
        
        <div class="card" style="padding: 26px; background: white; border: 1.5px solid var(--border-light); border-radius: var(--radius-lg); margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1.5px solid #F1F5F9;">
            <div>
              <span class="guest-badge-pill" style="margin-bottom: 6px; display: inline-block;">Final Report Complete</span>
              <h2 style="font-size: 1.6rem; font-weight: 800; color: #0F172A; margin: 0;">Mock Interview Performance Summary</h2>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.76rem; color: #64748B; font-weight: 700;">AVERAGE INTERVIEW SCORE</div>
              <div style="font-size: 1.8rem; font-weight: 800; color: #10B981;">${avgScore} / 10</div>
            </div>
          </div>

          <!-- Question-by-Question Breakdown -->
          <div style="display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px;">
            ${answers.map((a, idx) => `
              <div style="padding: 14px; background: #F8FAFC; border-radius: var(--radius-md); border: 1px solid #E2E8F0;">
                <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px;">
                  <span style="font-size: 0.84rem; font-weight: 700; color: #0F172A;">Q${idx + 1}: ${a.question.text}</span>
                  <span style="font-weight: 800; font-size: 0.88rem; color: var(--primary);">${a.evaluation.overallScore}/10</span>
                </div>
                <div style="font-size: 0.78rem; color: #475569; margin-top: 4px;">
                  <strong>Feedback:</strong> ${a.evaluation.whatYouDidWell[0] || 'Good attempt.'}
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Action Buttons -->
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <button class="action-pill-btn" id="btn-retake-interview" style="font-weight: 700; padding: 10px 20px;">
              🔄 Start New Session
            </button>
            <button class="btn-primary" id="btn-go-career-readiness" style="font-weight: 800; padding: 10px 24px;">
              View Career Readiness Dashboard →
            </button>
          </div>
        </div>

      </div>
    `;

    document.getElementById('btn-retake-interview')?.addEventListener('click', () => {
      this.isSessionActive = false;
      this.render(this.container);
    });

    document.getElementById('btn-go-career-readiness')?.addEventListener('click', () => {
      window.appController?.navigateTo('analytics');
    });
  }
}

export const interviewCoachView = new InterviewCoachView();
