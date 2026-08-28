import { store } from './state.js';

const clamp = (value) => Math.max(0, Math.min(100, Math.round(Number(value))));
const dateValue = (value) => {
  const parsed = new Date(value || 0).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

export class RoadmapView {
  constructor() {
    this.container = null;
  }

  render(container) {
    this.container = container;
    const state = store.state;
    const analysis = state.latestAnalysis;
    const resumeHistory = [...(state.resumeScoreHistory || [])].sort((a, b) => dateValue(a.date) - dateValue(b.date));
    const interviews = [...(state.sessions || [])].sort((a, b) => dateValue(a.date) - dateValue(b.date));
    const latestResume = resumeHistory.at(-1);
    const previousResume = resumeHistory.at(-2);
    const latestInterview = interviews.at(-1);
    const previousInterview = interviews.at(-2);
    const hasData = Boolean(latestResume || latestInterview || analysis);
    const role = latestInterview?.role || state.resume?.targetRole || state.resume?.title?.split(' — ')[1] || 'Target role';

    if (!hasData) {
      container.innerHTML = this.emptyState();
      this.attachEvents();
      return;
    }

    const gaps = this.getGaps(analysis, latestResume, latestInterview, previousInterview);
    const priorities = gaps.slice(0, 5);
    const tasks = this.buildTasks(role, gaps, analysis);
    const completed = tasks.filter(task => state.roadmapTasks?.[task.id]).length;
    const progress = Math.round((completed / tasks.length) * 100);
    const nextAction = this.nextAction(priorities, role);

    container.innerHTML = `
      <div class="roadmap-page">
        <div class="roadmap-header">
          <div><span class="roadmap-eyebrow">PERSONALIZED CAREER ROADMAP</span><h2>My Roadmap</h2><p>Your personalized plan based on your resume, interview performance, and skill gaps.</p></div>
          <div class="roadmap-role-badge"><span>Target Role</span><strong>${role}</strong></div>
        </div>

        <section class="roadmap-next-action"><div><span class="roadmap-eyebrow">YOUR NEXT BEST ACTION</span><strong>${nextAction}</strong></div><button class="btn-primary" id="btn-roadmap-action">${priorities[0]?.type === 'resume' ? 'Analyze Resume' : 'Start Interview'} →</button></section>

        <section class="roadmap-section"><div class="roadmap-section-heading"><h3>Current Status</h3><span>Based on your latest stored results</span></div><div class="roadmap-status-grid">
          ${this.statusCard('Resume Score', latestResume?.resume_score, previousResume?.resume_score)}
          ${this.statusCard('Interview Score', latestInterview?.overall_score, previousInterview?.overall_score)}
          ${this.statusCard('Career Readiness', latestInterview?.overall_score ?? latestResume?.resume_score, previousInterview?.overall_score ?? previousResume?.resume_score)}
          <div class="roadmap-status-card"><span>Top Skill Gap</span><strong>${analysis?.missing_skills?.[0] || analysis?.missing_keywords?.[0] || 'Not identified yet'}</strong></div>
          <div class="roadmap-status-card"><span>Top Improvement Area</span><strong>${priorities[0]?.label || 'Complete another session to identify this'}</strong></div>
        </div></section>

        <section class="roadmap-section"><div class="roadmap-section-heading"><h3>Priority Areas</h3><span>Updated from current weaknesses</span></div><div class="roadmap-priority-list">${priorities.length ? priorities.map((item, index) => `<div class="roadmap-priority-item"><b>${String(index + 1).padStart(2, '0')}</b><div><strong>${item.label}</strong><span class="roadmap-priority-level ${item.priority.toLowerCase().replace(' ', '-')}">${item.priority}</span><p>${item.detail}</p></div></div>`).join('') : '<div class="progress-empty-inline">No weakness detected yet. Complete another analysis or interview to make the roadmap more specific.</div>'}</div></section>

        <section class="roadmap-section"><div class="roadmap-section-heading"><h3>Roadmap Progress</h3><strong>${completed} of ${tasks.length} tasks completed (${progress}%)</strong></div><div class="progress-bar-wrap roadmap-progress-bar"><div class="progress-bar-fill primary" style="width: ${progress}%;"></div></div><div class="roadmap-timeline">${[1, 2, 3, 4].map(week => `<div class="roadmap-week-block"><div class="roadmap-week-marker">W${week}</div><div class="roadmap-week-content"><h4>Week ${week} — ${this.weekTitle(week)}</h4><div class="roadmap-task-list">${tasks.filter(task => task.week === week).map(task => this.taskHtml(task)).join('')}</div></div></div>`).join('')}</div></section>
      </div>
    `;
    this.attachEvents();
  }

  statusCard(label, current, previous) {
    return `<div class="roadmap-status-card"><span>${label}</span><strong>${current == null ? '—' : `${current}/100`}</strong><small>${previous == null ? 'No previous score' : `${previous} → ${current} (${current - previous >= 0 ? '+' : ''}${current - previous})`}</small></div>`;
  }

  getGaps(analysis, resume, interview, previousInterview) {
    const gaps = [];
    const missing = analysis?.missing_skills || analysis?.missing_keywords || [];
    missing.slice(0, 3).forEach(skill => gaps.push({ label: skill, type: 'resume', priority: 'Medium Priority', detail: `Strengthen ${skill} because it was identified as missing from your target-role analysis.` }));
    const interviewMetrics = [
      ['Answer Structure', interview?.structure_score, 'Practice Situation, Task, Action, Result stories.'],
      ['Communication', interview?.communication_score, 'Use shorter sentences and lead with the outcome.'],
      ['Technical Knowledge', interview?.technical_score, 'Review the technical concepts missed in your latest interview.'],
      ['Relevance', interview?.relevance_score, 'Answer the prompt directly before adding context.']
    ];
    interviewMetrics.forEach(([label, value, detail]) => {
      if (value != null && value < 75) {
        const improved = previousInterview?.[label.toLowerCase().replace(' ', '_') + '_score'] < value;
        gaps.push({ label, type: 'interview', priority: value < 60 ? 'High Priority' : improved ? 'Low Priority' : 'Medium Priority', detail });
      }
    });
    const speech = interview?.speech_summary;
    if (speech?.filler_count > 0) gaps.push({ label: 'Filler Words', type: 'speech', priority: speech.filler_count > 5 ? 'High Priority' : 'Medium Priority', detail: `Reduce ${speech.filler_count} filler words across your latest recorded session.` });
    if (speech?.wpm > 175) gaps.push({ label: 'Speaking Pace', type: 'speech', priority: 'Medium Priority', detail: `Slow your latest average pace of ${speech.wpm} WPM to make key points easier to follow.` });
    return gaps;
  }

  buildTasks(role, gaps, analysis) {
    const topSkill = gaps.find(item => item.type === 'resume')?.label || analysis?.skills?.[0] || 'your target-role skills';
    const topWeakness = gaps[0]?.label || 'answer structure';
    return [
      { id: 'roadmap-summary', week: 1, title: 'Refresh your professional summary', detail: `Align your summary with the ${role} target and your latest analysis.`, priority: gaps.some(item => item.label === 'Resume Score') ? 'High' : 'Medium' },
      { id: `roadmap-skill-${topSkill.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, week: 2, title: `Practice ${topSkill}`, detail: `Study and apply this skill in one small project or technical explanation.`, priority: gaps.find(item => item.label === topSkill)?.priority || 'Medium Priority' },
      { id: `roadmap-interview-${topWeakness.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, week: 3, title: `Practice ${topWeakness}`, detail: gaps[0]?.detail || 'Use a focused mock interview to turn the latest weakness into a repeatable skill.', priority: gaps[0]?.priority || 'Medium Priority' },
      { id: 'roadmap-retry', week: 4, title: 'Repeat and compare', detail: 'Run a new resume analysis or five-question mock interview and compare the stored scores.', priority: 'High Priority' }
    ];
  }

  taskHtml(task) {
    const checked = Boolean(store.state.roadmapTasks?.[task.id]);
    return `<label class="roadmap-task ${checked ? 'completed' : ''}"><input type="checkbox" class="roadmap-task-checkbox" data-task-id="${task.id}" ${checked ? 'checked' : ''}><span><strong>${task.title}</strong><small>${task.detail}</small></span><em>${task.priority}</em></label>`;
  }

  weekTitle(week) {
    return ['Resume Improvement', 'Technical Skills', 'Interview Practice', 'Final Preparation'][week - 1];
  }

  nextAction(priorities, role) {
    if (!priorities.length) return `Complete a ${role} mock interview to identify your first improvement area.`;
    const item = priorities[0];
    return item.type === 'resume' ? `Analyze your resume after addressing ${item.label}.` : `Complete a ${role} mock interview focused on ${item.label}.`;
  }

  emptyState() {
    return `<div class="roadmap-empty-state"><div class="progress-empty-icon">↗</div><h2>Personalized Career Roadmap</h2><p>Complete your resume analysis or first mock interview to generate your personalized roadmap.</p><div><button class="btn-primary" id="btn-roadmap-analyze">Analyze Resume</button><button class="action-pill-btn" id="btn-roadmap-interview">Start Interview</button></div></div>`;
  }

  attachEvents() {
    document.querySelectorAll('.roadmap-task-checkbox').forEach(input => input.addEventListener('change', event => {
      store.setRoadmapTaskStatus(event.currentTarget.dataset.taskId, event.currentTarget.checked);
      this.render(this.container);
    }));
    document.getElementById('btn-roadmap-analyze')?.addEventListener('click', () => window.appController?.navigateTo('resume-builder'));
    document.getElementById('btn-roadmap-interview')?.addEventListener('click', () => window.appController?.navigateTo('interview-prep'));
    document.getElementById('btn-roadmap-action')?.addEventListener('click', () => window.appController?.navigateTo(this.getGaps(store.state.latestAnalysis, store.state.resumeScoreHistory?.at(-1), store.state.sessions?.at(-1), null)[0]?.type === 'resume' ? 'resume-builder' : 'interview-prep'));
  }
}

export const roadmapView = new RoadmapView();
