import { store } from './state.js';

const VIEW_LABELS = {
  dashboard: 'Overview',
  'resume-builder': 'Resume Coach',
  'interview-prep': 'Mock Interview',
  'job-tracker': 'Job Tracker',
  performance: 'Performance',
  roadmap: 'My Roadmap',
  settings: 'Settings'
};

class CareerAiAssistant {
  constructor() {
    this.root = null;
    this.messages = [];
    this.isOpen = false;
    this.isMinimized = false;
  }

  init() {
    this.root = document.getElementById('careerai-assistant-root');
    if (!this.root || this.root.dataset.initialized) return;
    this.root.dataset.initialized = 'true';
    this.messages = [{
      role: 'assistant',
      text: 'Hi! I can help you understand this page and decide what to do next.'
    }];
    this.render();
    store.subscribe(() => {
      if (this.isOpen) this.renderMessages();
    });
  }

  render() {
    this.root.innerHTML = `
      <button class="careerai-assistant-launcher" id="careerai-assistant-launcher" aria-label="Open CareerAI Assistant" title="CareerAI Assistant">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 1.35 5.65L19 9l-5.65 1.35L12 16l-1.35-5.65L5 9l5.65-1.35L12 2Zm7 13 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15ZM5 15l.55 1.45L7 17l-1.45.55L5 19l-.55-1.45L3 17l1.45-.55L5 15Z"/></svg>
      </button>
      <section class="careerai-assistant-panel" id="careerai-assistant-panel" aria-label="CareerAI Assistant" ${this.isOpen ? '' : 'hidden'}>
        <header class="careerai-assistant-header">
          <div class="careerai-assistant-title"><span class="careerai-assistant-spark">✦</span><div><strong>CareerAI Assistant</strong><small>Page-aware guidance</small></div></div>
          <div class="careerai-assistant-controls"><button id="careerai-assistant-minimize" aria-label="Minimize assistant" title="Minimize">−</button><button id="careerai-assistant-close" aria-label="Close assistant" title="Close">×</button></div>
        </header>
        <div class="careerai-assistant-context" id="careerai-assistant-context"></div>
        <div class="careerai-assistant-messages" id="careerai-assistant-messages"></div>
        <div class="careerai-assistant-quick-actions" id="careerai-assistant-quick-actions">
          <button data-action="resume">Analyze my resume</button><button data-action="interview">Prepare for interview</button><button data-action="score">Explain my score</button><button data-action="roadmap">Explain my roadmap</button>
        </div>
        <form class="careerai-assistant-form" id="careerai-assistant-form"><input id="careerai-assistant-input" aria-label="Ask CareerAI Assistant" placeholder="Ask about this page..." autocomplete="off"><button type="submit" aria-label="Send question">➤</button></form>
      </section>
    `;
    this.bindEvents();
    this.renderMessages();
  }

  bindEvents() {
    this.root.querySelector('#careerai-assistant-launcher')?.addEventListener('click', () => {
      this.isOpen = true;
      this.isMinimized = false;
      this.render();
      this.root.querySelector('#careerai-assistant-input')?.focus();
    });
    this.root.querySelector('#careerai-assistant-close')?.addEventListener('click', () => {
      this.isOpen = false;
      this.render();
    });
    this.root.querySelector('#careerai-assistant-minimize')?.addEventListener('click', () => {
      this.isMinimized = !this.isMinimized;
      this.root.querySelector('#careerai-assistant-panel')?.classList.toggle('is-minimized', this.isMinimized);
    });
    this.root.querySelector('#careerai-assistant-form')?.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = this.root.querySelector('#careerai-assistant-input');
      const question = input.value.trim();
      if (!question) return;
      input.value = '';
      this.ask(question);
    });
    this.root.querySelectorAll('[data-action]').forEach(button => {
      button.addEventListener('click', () => this.ask(button.dataset.action));
    });
  }

  ask(question) {
    this.messages.push({ role: 'user', text: this.labelForQuestion(question) });
    this.messages.push({ role: 'assistant', text: this.getResponse(question) });
    this.renderMessages();
  }

  labelForQuestion(question) {
    return { resume: 'Analyze my resume', interview: 'Prepare for interview', score: 'Explain my score', roadmap: 'Explain my roadmap' }[question] || question;
  }

  getResponse(question) {
    const state = store.state;
    const view = window.appController?.currentView || state.activeView || 'dashboard';
    const lowerQuestion = question.toLowerCase();
    const resume = state.resume || {};
    const analysis = state.latestAnalysis;
    const score = analysis?.overall_score ?? analysis?.match_score ?? resume.matchScore;
    const currentPage = VIEW_LABELS[view] || 'this page';

    if (question === 'resume' || lowerQuestion.includes('resume')) {
      if (view !== 'resume-builder') return 'Open Resume Coach from the sidebar to upload or review your resume. I can then help interpret its ATS match and improvement areas.';
      if (!analysis && score == null) return 'No resume analysis is available yet. Upload or paste your own resume in Resume Coach to generate one.';
      const weakness = analysis?.weaknesses?.[0];
      return `Your available resume score is ${score != null ? `${score}/100` : 'not available'}. ${weakness ? `A current improvement area is: ${weakness}` : 'Review the weaknesses and keyword gaps shown in the analysis panel, then prioritize the highest-impact items.'}`;
    }
    if (question === 'interview' || lowerQuestion.includes('interview')) {
      if (view !== 'interview-prep') return 'Open Mock Interview from the sidebar to choose a role and start a tailored practice session using your resume and job description.';
      return 'Choose a target role, enable the resume or job-description context when available, and answer the current question with Situation, Task, Action, and Result. Feedback appears after submission.';
    }
    if (question === 'roadmap' || lowerQuestion.includes('roadmap') || lowerQuestion.includes('priority')) {
      if (view !== 'roadmap') return 'Open My Roadmap from the sidebar to see recommended tasks based on your resume, interview performance, and skill gaps.';
      return 'Your roadmap prioritizes the areas with the clearest skill gaps or readiness impact. Start with the first high-priority task, complete it in a small focused step, then return to update your progress.';
    }
    if (question === 'score' || lowerQuestion.includes('score') || lowerQuestion.includes('ats')) {
      if (score == null) return `There is no score available on ${currentPage} yet. Complete the relevant resume analysis or interview activity first.`;
      return `The available score is ${score}/100. Use the detailed breakdown beside it to see what contributed to the result; I will not infer scores or weaknesses that are not present in your saved analysis.`;
    }
    if (lowerQuestion.includes('how') || lowerQuestion.includes('help') || lowerQuestion.includes('use')) {
      return `${currentPage} is the best place to work on this step. Use the visible primary action on the page, and I can explain any score, feedback, or recommendation that is available there.`;
    }
    return `I can explain ${currentPage}, resume analysis, interview feedback, performance metrics, or roadmap priorities. Ask about one of those areas and I will use the data currently available.`;
  }

  renderMessages() {
    if (!this.root) return;
    const messages = this.root.querySelector('#careerai-assistant-messages');
    const context = this.root.querySelector('#careerai-assistant-context');
    if (!messages || !context) return;
    const view = window.appController?.currentView || store.state.activeView || 'dashboard';
    context.textContent = `Viewing ${VIEW_LABELS[view] || 'CareerAI'}`;
    messages.replaceChildren(...this.messages.map(message => {
      const bubble = document.createElement('div');
      bubble.className = `careerai-assistant-message ${message.role}`;
      bubble.textContent = message.text;
      return bubble;
    }));
    messages.scrollTop = messages.scrollHeight;
  }
}

export const careerAiAssistant = new CareerAiAssistant();