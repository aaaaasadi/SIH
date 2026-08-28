import { store } from './state.js';

const formatDate = (value) => {
  if (!value) return 'Recent';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const average = (values) => {
  const usable = values.filter(value => Number.isFinite(Number(value)));
  return usable.length ? Math.round(usable.reduce((sum, value) => sum + Number(value), 0) / usable.length) : null;
};

export class AnalyticsView {
  constructor() {
    this.container = null;
  }

  render(container) {
    this.container = container;
    const state = store.state;
    const resumeHistory = [...(state.resumeScoreHistory || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
    const interviewSessions = [...(state.sessions || [])].sort((a, b) => new Date(a.date || 0) - new Date(b.date || 0));
    const recent = [
      ...resumeHistory.map(item => ({ type: 'Resume Analysis', score: item.resume_score ?? item.score, date: item.date })),
      ...interviewSessions.map(item => ({ type: 'Mock Interview', score: item.overall_score ?? item.score, date: item.date }))
    ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)).slice(0, 8);
    const latestResume = resumeHistory.at(-1);
    const previousResume = resumeHistory.at(-2);
    const latestInterview = interviewSessions.at(-1);
    const previousInterview = interviewSessions.at(-2);
    const overallCurrent = latestInterview?.overall_score ?? latestResume?.resume_score;
    const overallPrevious = latestInterview ? previousInterview?.overall_score : previousResume?.resume_score;
    const metrics = [
      ['Resume Score', latestResume?.resume_score, previousResume?.resume_score, false],
      ['ATS Score', latestResume?.ats_score, previousResume?.ats_score, false],
      ['Skills Score', latestResume?.skills_score, previousResume?.skills_score, false],
      ['Content / Projects', latestResume?.content_projects_score, previousResume?.content_projects_score, false],
      ['Interview Score', latestInterview?.overall_score, previousInterview?.overall_score, false],
      ['Communication', latestInterview?.communication_score, previousInterview?.communication_score, false],
      ['Technical Knowledge', latestInterview?.technical_score, previousInterview?.technical_score, false],
      ['Answer Structure', latestInterview?.structure_score, previousInterview?.structure_score, false],
      ['Relevance', latestInterview?.relevance_score, previousInterview?.relevance_score, false]
    ];
    const latestSpeech = latestInterview?.speech_summary;
    const previousSpeech = previousInterview?.speech_summary;
    const speechMetrics = [
      ['Speaking Speed', latestSpeech?.wpm, previousSpeech?.wpm, false, 'WPM'],
      ['Filler Words', latestSpeech?.filler_count, previousSpeech?.filler_count, true, ''],
      ['Answer Duration', latestSpeech?.duration_seconds, previousSpeech?.duration_seconds, false, 'sec'],
      ['Clarity', latestSpeech?.clarity, previousSpeech?.clarity, false, '/100']
    ];
    const analysis = state.latestAnalysis;
    const skills = [...new Set([...(analysis?.skills || []), ...(analysis?.matching_keywords || [])])].slice(0, 10);
    const missingSkills = analysis?.missing_skills || analysis?.missing_keywords || [];
    const communication = latestInterview?.communication_score;
    const skillRows = skills.map(skill => ({ name: skill, value: (analysis?.matching_keywords || []).includes(skill) ? 100 : (latestResume?.skills_score ?? null) }));
    missingSkills.slice(0, 4).forEach(skill => {
      if (!skillRows.some(item => item.name.toLowerCase() === skill.toLowerCase())) skillRows.push({ name: `${skill} (gap)`, value: 0 });
    });
    if (communication != null) skillRows.push({ name: 'Communication', value: communication });
    const biggestImprovement = this.biggestImprovement(metrics, speechMetrics);
    const biggestWeakness = this.biggestWeakness(metrics, missingSkills);
    const nextAction = biggestWeakness?.label?.includes('Resume') ? 'Complete a resume analysis after addressing the top missing skill.' : biggestWeakness?.label?.includes('Speech') ? 'Complete another voice mock interview and focus on the speech feedback.' : 'Complete a technical mock interview.';

    container.innerHTML = `
      <div class="performance-header">
        <div class="progress-title-row"><div><h2 style="margin: 0;">Progress Tracking</h2><p style="margin-top: 4px;">See how repeated resume reviews and mock interviews improve your readiness.</p></div><span class="mode-tag">Personal Progress</span></div>
      </div>
      ${!recent.length ? this.emptyState() : `
        <section class="progress-overview-grid">
          <div class="readiness-score-card progress-readiness-card"><div class="card-top-row"><strong>Overall Career Readiness</strong><span class="demo-chip-tag">Stored locally</span></div><div class="progress-score-line"><strong>${overallCurrent ?? '—'}</strong><span>/ 100</span></div><div class="progress-bar-wrap"><div class="progress-bar-fill primary" style="width: ${overallCurrent || 0}%;"></div></div><div class="progress-comparison-note">${this.comparison(overallPrevious, overallCurrent, false, 'previous score')}</div></div>
          <div class="card progress-summary-card"><div class="report-section-title">What changed</div><div class="progress-summary-list"><div><strong>${resumeHistory.length}</strong><span>Resume analyses</span></div><div><strong>${interviewSessions.length}</strong><span>Mock interviews</span></div><div><strong>${latestSpeech ? 'Available' : 'Not yet'}</strong><span>Speech data</span></div></div></div>
        </section>
        <section class="progress-section"><div class="progress-section-heading"><h3>Resume Progress</h3><span>Previous → Current</span></div><div class="progress-metric-grid">${metrics.slice(0, 4).map(item => this.metricCard(item)).join('')}</div></section>
        <section class="progress-section"><div class="progress-section-heading"><h3>Interview Progress</h3><span>Previous → Current</span></div><div class="progress-metric-grid">${metrics.slice(4).map(item => this.metricCard(item)).join('')}</div></section>
        <section class="progress-section"><div class="progress-section-heading"><h3>Speech Progress</h3><span>${latestSpeech ? 'Measured from recorded answers' : 'Record a voice answer to begin'}</span></div><div class="progress-metric-grid">${speechMetrics.map(item => this.metricCard(item, true)).join('')}</div></section>
        <section class="progress-section"><div class="progress-section-heading"><h3>Skill Progress</h3><span>Resume coverage and interview signals</span></div>${skillRows.length ? `<div class="skill-progress-list">${skillRows.map(item => `<div class="skill-progress-row"><div><strong>${item.name}</strong><span>${item.value == null ? 'Not scored yet' : `${item.value}%`}</span></div><div class="progress-bar-wrap"><div class="progress-bar-fill primary" style="width: ${item.value || 0}%;"></div></div></div>`).join('')}</div>` : '<div class="progress-empty-inline">Skills will appear after a resume analysis.</div>'}</section>
        <section class="progress-section"><div class="progress-section-heading"><h3>Recent Sessions</h3><span>Saved in this account</span></div><div class="recent-progress-list">${recent.map(item => `<div><span>${formatDate(item.date)}</span><strong>${item.type}</strong><b>${item.score ?? '—'}/100</b></div>`).join('')}</div></section>
        <section class="progress-section ai-progress-summary"><div class="progress-section-heading"><h3>AI Improvement Summary</h3><span>Based on your stored results</span></div><p><strong>Biggest improvement:</strong> ${biggestImprovement?.text || 'Complete another session to identify your biggest improvement.'}</p><p><strong>Biggest weakness:</strong> ${biggestWeakness?.text || 'Complete a resume analysis or interview to identify a weakness.'}</p><p><strong>Recommended next action:</strong> ${nextAction}</p></section>
      `}
    `;
  }

  metricCard([label, current, previous, lowerBetter, unit = ''], speech = false) {
    const hasCurrent = current != null;
    return `<div class="progress-metric-card ${speech ? 'speech-metric-card' : ''}"><span>${label}</span><div class="progress-metric-values"><strong>${hasCurrent ? current : '—'}${hasCurrent ? unit : ''}</strong><small>${previous != null ? `${previous}${unit} →` : 'No previous data'}</small></div><div class="progress-metric-delta">${hasCurrent && previous != null ? this.comparison(previous, current, lowerBetter, 'previous') : (hasCurrent ? 'Complete another session to see progress' : 'Not measured yet')}</div></div>`;
  }

  comparison(previous, current, lowerBetter, suffix) {
    if (previous == null || current == null) return 'No previous data yet';
    const delta = current - previous;
    const improved = lowerBetter ? delta < 0 : delta > 0;
    return `<span class="${improved ? 'progress-positive' : delta === 0 ? '' : 'progress-negative'}">${delta > 0 ? '+' : ''}${delta} ${suffix}</span>`;
  }

  biggestImprovement(metrics, speechMetrics) {
    const all = [...metrics, ...speechMetrics].filter(item => item[1] != null && item[2] != null).map(item => ({ label: item[0], delta: item[3] ? item[2] - item[1] : item[1] - item[2] }));
    const best = all.sort((a, b) => b.delta - a.delta)[0];
    return best && best.delta > 0 ? { text: `${best.label} improved by ${best.delta} points.` } : null;
  }

  biggestWeakness(metrics, missingSkills) {
    const scored = metrics.filter(item => item[1] != null).sort((a, b) => a[1] - b[1])[0];
    if (scored && scored[1] < 70) return { label: scored[0].includes('Resume') || scored[0].includes('ATS') ? 'Resume' : scored[0].includes('Speech') ? 'Speech' : 'Interview', text: `${scored[0]} is currently ${scored[1]}/100.` };
    if (missingSkills.length) return { label: 'Resume', text: `Your resume analysis flagged ${missingSkills[0]} as a skill gap.` };
    return null;
  }

  emptyState() {
    return '<div class="progress-empty-state"><div class="progress-empty-icon">↗</div><h3>Your progress starts here</h3><p>Complete a resume analysis or a five-question mock interview. Your scores, speech metrics, and improvements will appear here automatically.</p></div>';
  }
}

export const analyticsView = new AnalyticsView();
