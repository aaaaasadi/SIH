/**
 * CareerAI - Central Reactive State Store & Data Models (PCE-SW-PS-9 - v2.1)
 * Supports: Guest Access, Rate Limiting, Ephemeral Storage Separation, Isolated Demo Datasets,
 * Session Handoff & Migration, Generic vs Personalized Mock Question Banks.
 */

import { aiEngine } from './aiEngine.js';

const STORAGE_KEY = 'career_ai_state_v2';
const GUEST_STORAGE_KEY = 'career_ai_guest_session_v2';

// Unified AI profile used across the product. The app only exposes one adaptive coach.
export const CAREERAI_PROFILE = {
  id: 'careerai',
  name: 'CareerAI',
  avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
  role: 'Adaptive AI Career Coach',
  plan: 'Unified AI',
  bio: 'An adaptive AI career coach that combines recruiter, technical interviewer, behavioral interviewer, career coach, and hiring-manager perspectives into one intelligent interview experience.',
  targetCompany: 'Any target role',
  experienceYears: 0,
  interviewReadiness: 92,
  atsScore: 95,
  keywordAlignment: 94
};

export const PERSONAS = {
  careerai: CAREERAI_PROFILE
};

export const USER_PROFILE = {
  name: 'Your Name',
  email: 'you@example.com',
  phone: '(555) 000-0000',
  location: 'City, Country',
  linkedin: 'linkedin.com/in/yourprofile',
  github: 'github.com/yourprofile'
};

// The app does not ship with demo candidate identities. It starts from a clean blank profile.
export const DEFAULT_RESUME = {
  id: 'res-user-blank',
  title: 'My Resume (Draft)',
  targetRole: 'Target Role',
  matchScore: 50,
  lastSaved: 'Just now',
  candidate: { ...USER_PROFILE },
  sections: [
    {
      id: 'summary',
      title: 'Professional Summary',
      content: 'Results-driven professional with a strong focus on delivering measurable business outcomes, solving complex problems, and collaborating effectively across teams.'
    },
    {
      id: 'experience',
      title: 'Professional Experience',
      items: [
        {
          id: 'exp-user-1',
          role: 'Your Role',
          company: 'Company Name',
          location: 'Location',
          dates: 'Year - Present',
          bullets: [
            {
              id: 'b-user-1',
              text: 'Led or contributed to impactful work using measurable results and clear business outcomes.',
              hasSuggestion: false
            }
          ]
        }
      ]
    },
    {
      id: 'skills',
      title: 'Skills',
      content: 'Communication, Problem Solving, Collaboration, Leadership, Domain Tools, Data Analysis'
    },
    {
      id: 'education',
      title: 'Education',
      content: 'Degree / Program — Institution (Year)'
    }
  ]
};

// Blank Resume Template for "Start from Scratch" (FR-1.12)
export const BLANK_RESUME_TEMPLATE = {
  id: 'res-blank-01',
  title: 'My Resume (Draft)',
  targetRole: 'Target Role',
  matchScore: 50,
  lastSaved: 'Just now',
  candidate: {
    name: USER_PROFILE.name,
    email: USER_PROFILE.email,
    phone: USER_PROFILE.phone,
    location: USER_PROFILE.location,
    linkedin: USER_PROFILE.linkedin,
    github: USER_PROFILE.github
  },
  sections: [
    {
      id: 'summary',
      title: 'Professional Summary',
      content: 'Results-driven professional with expertise in delivering cross-functional outcomes. Skilled at solving complex challenges and collaborating across engineering, product, and business domains.'
    },
    {
      id: 'experience',
      title: 'Experience',
      items: [
        {
          id: 'exp-b1',
          role: 'Job Title / Position',
          company: 'Company or Organization',
          location: 'Location or Remote',
          dates: '2023 - Present',
          bullets: [
            {
              id: 'b-blank-1',
              text: 'Key accomplishment describing how you led or built a solution, including metrics and impact.',
              hasSuggestion: false
            },
            {
              id: 'b-blank-2',
              text: 'Collaborated with cross-functional stakeholders to deliver project milestones on schedule.',
              hasSuggestion: true,
              suggestionType: 'verb',
              suggestionTitle: 'Stronger Verbs',
              impactScore: 90,
              suggestionDesc: 'Replace passive phrasing with active leadership and cross-functional ownership.',
              suggestedRewrite: 'Orchestrated cross-functional stakeholder collaboration to consistently deliver core project milestones on schedule.'
            }
          ]
        }
      ]
    },
    {
      id: 'skills',
      title: 'Skills & Competencies',
      content: 'Project Leadership, Agile, Problem Solving, Communication, Data Analysis, Strategic Planning'
    },
    {
      id: 'education',
      title: 'Education',
      content: 'Degree Name, Major — University / College (Graduation Year)'
    }
  ]
};

// No sample candidate library remains. Real users start from their own resume or a blank template.
export const SAMPLE_RESUMES = {};

// Target Job Descriptions
export const DEFAULT_JDS = {
  swe: {
    id: 'jd-swe',
    title: 'Software Engineer (Backend)',
    company: 'Infosys / Cloud Enterprise',
    roleTag: 'Software Engineer',
    rawText: `Seeking a Software Engineer with 3-5+ years experience in Python, Java, Django, Spring Boot, AWS, Docker, Kubernetes, MySQL/PostgreSQL, Redis, CI/CD pipelines, and REST API design. Must have strong understanding of microservices architecture, system design, and Agile methodologies.`,
    keywordsFound: ['Python', 'Java', 'Django', 'Spring Boot', 'AWS', 'Docker', 'Kubernetes', 'MySQL', 'PostgreSQL', 'Redis', 'CI/CD', 'REST API Design', 'Microservices Architecture', 'Agile', 'Unit Testing', 'System Design'],
    keywordsMissing: ['GraphQL', 'Terraform', 'Kafka'],
    sectionBreakdown: {
      skills: 18,
      experience: 16,
      formatting: 10,
      keywords: 15
    },
    qualitativeSummary: 'Exceptional match with 94%+ ATS alignment across backend frameworks, cloud infrastructure, and database optimization.',
    atsIssues: []
  },
  pm: {
    id: 'jd-pm',
    title: 'Senior Technical Product Manager',
    company: 'TechNova Solutions',
    roleTag: 'Sr. PM',
    rawText: `We are looking for a Technical Product Manager to lead cloud backend services. Requirements: Strong background in software engineering, API architecture, AWS cloud services, and Agile scrum leadership.`,
    keywordsFound: ['Python', 'Java', 'AWS', 'REST API', 'Agile/Scrum', 'System Design', 'Microservices Architecture'],
    keywordsMissing: ['Product Strategy', 'Roadmapping', 'A/B Testing', 'GTM'],
    sectionBreakdown: {
      skills: 10,
      experience: 12,
      formatting: 10,
      keywords: -8
    },
    qualitativeSummary: 'Solid engineering depth for technical leadership roles; add product roadmapping keywords for pure PM positions.',
    atsIssues: []
  },
  pa: {
    id: 'jd-pa',
    title: 'Product Analyst',
    company: 'FinTech / Growth Labs',
    roleTag: 'Product Analyst',
    rawText: `Seeking a Product Analyst with 2-4 years experience in SQL, Python, conversion funnels, A/B testing, cohort retention analysis, and product metrics telemetry. Experience collaborating with engineering and product teams to translate data into feature recommendations.`,
    keywordsFound: ['SQL', 'Python', 'Product Analytics', 'Data Modeling', 'A/B Testing', 'Funnel Analysis', 'Tableau', 'Agile'],
    keywordsMissing: ['Mixpanel', 'Amplitude', 'Statistical Significance'],
    sectionBreakdown: {
      skills: 15,
      experience: 14,
      formatting: 10,
      keywords: 12
    },
    qualitativeSummary: 'Strong data foundation; highlights transferable ETL and telemetry skills for product analytics.',
    atsIssues: []
  }
};

// Generic Behavioral Question Bank (FR-2.8 - Zero Gating)
export const GENERIC_BEHAVIORAL_QUESTIONS = [
  {
    id: 'q-gen-1',
    category: 'Behavioral',
    mode: 'generic',
    role: 'Standard Behavioral',
    question: 'Tell me about a time you had to handle conflicting priorities under a tight deadline.',
    recommendedDuration: 90,
    keyCriteria: ['Situation context', 'Task prioritization framework', 'Action steps taken', 'Measurable result'],
    sampleGoodAnswer: 'In my previous project, two major release deadlines coincided. I mapped the tasks using the Eisenhower Matrix, aligned with our product manager on trade-offs, and delegated secondary tasks. We shipped the core deliverable on time with zero bugs.'
  },
  {
    id: 'q-gen-2',
    category: 'Leadership & Teamwork',
    mode: 'generic',
    role: 'Standard Behavioral',
    question: 'Describe a situation where you had a disagreement with a team member. How did you resolve it?',
    recommendedDuration: 90,
    keyCriteria: ['Active listening', 'Objective data usage', 'Empathy', 'Constructive outcome'],
    sampleGoodAnswer: 'When a teammate and I differed on technical implementation, I organized a 30-minute sync to evaluate both approaches against latency benchmarks. We agreed on a hybrid solution that improved performance by 20%.'
  },
  {
    id: 'q-gen-3',
    category: 'Problem Solving',
    mode: 'generic',
    role: 'Standard Behavioral',
    question: 'Tell me about a time you failed or made a mistake on a project. What did you learn?',
    recommendedDuration: 90,
    keyCriteria: ['Accountability', 'Root-cause analysis', 'Corrective action', 'Long-term prevention'],
    sampleGoodAnswer: 'Early in my career, an unverified configuration change caused minor latency in production. I immediately alerted the team, rolled back the change, and wrote automated pre-deployment sanity checks.'
  },
  {
    id: 'q-gen-4',
    category: 'Adaptability',
    mode: 'generic',
    role: 'Standard Behavioral',
    question: 'How do you approach learning a completely new tool, framework, or process quickly?',
    recommendedDuration: 90,
    keyCriteria: ['Learning strategy', 'Application to real projects', 'Knowledge sharing'],
    sampleGoodAnswer: 'I start by reading official documentation and building a minimal proof-of-concept. Within two weeks of adopting a new analytics stack, I built our team’s automated dashboard and held a knowledge-share workshop.'
  },
  {
    id: 'q-gen-5',
    category: 'Impact & Results',
    mode: 'generic',
    role: 'Standard Behavioral',
    question: 'What is an accomplishment you are proud of, and what was your specific contribution to the outcome?',
    recommendedDuration: 90,
    keyCriteria: ['Scope of ownership', 'Personal initiative', 'Quantified impact'],
    sampleGoodAnswer: 'I initiated an internal optimization drive that reduced build times by 35%, saving our engineering department over 10 developer hours each week.'
  }
];

// Personalized Role-Specific Question Bank (FR-2.9)
export const PERSONALIZED_QUESTIONS = [
  {
    id: 'q-pers-1',
    category: 'Role Strategy & Leadership',
    mode: 'personalized',
    role: 'Senior Product Manager',
    question: 'Tell me about a time you led a cross-functional team through a challenging product launch.',
    recommendedDuration: 90,
    keyCriteria: ['Situation clarity', 'Task ownership', 'Decisive leadership action', 'Measurable business outcome'],
    sampleGoodAnswer: 'At TechNova, we were tasked with launching a new feature for the mobile app within three weeks before our major summit (Situation). As Lead PM, I aligned two engineers, a designer, and a marketer (Task). I set up a shared Notion board for asynchronous updates and daily 15-minute triage standups (Action). As a result, we delivered 2 days ahead of schedule, with zero rollbacks and a 15% increase in customer adoption (Result).'
  },
  {
    id: 'q-pers-2',
    category: 'Technical Communication',
    mode: 'personalized',
    role: 'Senior Product Manager',
    question: 'How do you prioritize competing requests from Sales, Engineering, and Executive leadership when resources are limited?',
    recommendedDuration: 90,
    keyCriteria: ['Framework usage (e.g. RICE/MoSCoW)', 'Data-driven rationale', 'Stakeholder empathy', 'Communication rhythm'],
    sampleGoodAnswer: 'I rely on a modified RICE framework combined with strategic alignment tiers. First, I map every request against our quarterly North Star metric—such as enterprise net retention. Second, I calculate Reach and Impact with the requesting leads, while Engineering estimates Confidence and Effort. For executive escalations, I present transparent trade-off matrices showing what gets deprioritized so decisions remain objective.'
  },
  {
    id: 'q-pers-3',
    category: 'Conflict & Roadmap Alignment',
    mode: 'personalized',
    role: 'Senior Product Manager',
    question: 'Describe a situation where an engineering lead strongly disagreed with your product roadmap. How did you resolve it?',
    recommendedDuration: 90,
    keyCriteria: ['Active listening', 'Technical empathy', 'Shared goal alignment', 'Constructive consensus'],
    sampleGoodAnswer: 'When planning our Q3 roadmap, the Lead Architect wanted to dedicate 100% of the sprint cycle to technical debt refactoring, whereas I had scheduled two critical customer retention features. Rather than overriding the team, I scheduled a joint workshop to quantify the exact business cost of the technical debt—namely 450ms of query latency causing a 4% drop in funnel conversion. We co-created a balanced 60/40 allocation that resolved the high-risk database bottlenecks while shipping the top-requested customer export feature.'
  },
  {
    id: 'q-pers-4',
    category: 'Product & Data Translation',
    mode: 'personalized',
    role: 'Product Analyst',
    question: 'How do you translate complex technical data engineering insights into actionable product recommendations for non-technical stakeholders?',
    recommendedDuration: 90,
    keyCriteria: ['Stakeholder empathy', 'Data storytelling', 'Business impact framing', 'Actionable takeaway'],
    sampleGoodAnswer: 'When analyzing user drop-off in our onboarding funnel, our telemetry data revealed unindexed event queries causing latency. Rather than presenting raw query logs, I built a visual funnel dashboard showing that a 400ms delay correlated with a 12% drop in conversion. I framed the finding as an opportunity for immediate revenue lift, which helped product and engineering prioritize the fix.'
  },
  {
    id: 'q-pers-5',
    category: 'Experimentation & A/B Testing',
    mode: 'personalized',
    role: 'Product Analyst',
    question: 'Describe how you would design and evaluate an A/B test for a new product feature with low initial sample size.',
    recommendedDuration: 90,
    keyCriteria: ['Hypothesis definition', 'Statistical power & sample size', 'Primary vs guardrail metrics', 'Decision framework'],
    sampleGoodAnswer: 'I start by defining a clear hypothesis with one primary success metric—such as Day-7 feature retention—alongside guardrail metrics like error rates. With low sample size, I calculate Minimum Detectable Effect (MDE) in advance and focus the experiment on high-intent user cohorts or sequential testing methodologies.'
  }
];

// Read-Only Isolated Demo Applications (for Guest Mode - Section 7.2)
export const DEMO_JOB_APPLICATIONS = [
  {
    id: 'demo-app-stripe',
    company: 'Stripe',
    location: 'San Francisco, CA',
    role: 'Product Designer',
    stage: 'wishlist',
    priority: 'high',
    priorityLabel: 'High Priority',
    appliedDate: '2w ago',
    stageProgress: null,
    nextStep: 'Submit referral application',
    logoLetter: 'S',
    accentColor: '#6366F1',
    isDemo: true
  },
  {
    id: 'demo-app-airbnb',
    company: 'Airbnb',
    location: 'Remote',
    role: 'UX Researcher',
    stage: 'wishlist',
    priority: 'medium',
    priorityLabel: 'Medium',
    appliedDate: '1m ago',
    stageProgress: null,
    nextStep: 'Tailor portfolio case study',
    logoLetter: 'A',
    accentColor: '#F43F5E',
    isDemo: true
  },
  {
    id: 'demo-app-google',
    company: 'Google',
    location: 'Mountain View, CA',
    role: 'Senior Product Designer',
    stage: 'applied',
    priority: 'referral',
    priorityLabel: 'Referral',
    appliedDate: 'Applied 2d ago',
    stageProgress: 'Stage 2 of 4',
    progressPercent: 50,
    nextStep: 'Recruiter Screening Call',
    logoLetter: 'G',
    accentColor: '#3B82F6',
    isDemo: true
  },
  {
    id: 'demo-app-netflix',
    company: 'Netflix',
    location: 'Los Gatos, CA',
    role: 'Lead UI Designer',
    stage: 'interviewing',
    priority: 'high',
    priorityLabel: 'Round 2 / 4',
    appliedDate: '1w ago',
    stageProgress: 'Round 2 of 4',
    nextInterview: 'Tomorrow, 10:00 AM',
    nextStep: 'Mock Behavioral Session',
    logoLetter: 'N',
    accentColor: '#EF4444',
    isDemo: true
  }
];

// Historical Sessions for Authenticated Users
export const DEFAULT_SESSIONS = [
  {
    id: 'sess-01',
    role: 'Software Engineer II - Infosys',
    category: 'Technical (Backend & AWS)',
    date: 'Aug 27, 2026',
    score: 94,
    starScore: { situation: 95, task: 92, action: 94, result: 92 },
    pacingWpm: 142,
    fillerWords: { um: 1, like: 1 },
    summary: 'Outstanding technical depth in Django, Redis caching, and AWS microservices migration.'
  },
  {
    id: 'sess-02',
    role: 'Backend Developer - Wipro',
    category: 'System Design & APIs',
    date: 'Aug 24, 2026',
    score: 88,
    starScore: { situation: 90, task: 88, action: 86, result: 84 },
    pacingWpm: 148,
    fillerWords: { um: 2, like: 2 },
    summary: 'Strong explanation of MySQL indexing, JUnit testing, and Spring Boot order processing.'
  },
  {
    id: 'sess-03',
    role: 'Software Engineer - TCS',
    category: 'Behavioral & Leadership',
    date: 'Aug 18, 2026',
    score: 85,
    starScore: { situation: 88, task: 84, action: 85, result: 82 },
    pacingWpm: 152,
    fillerWords: { um: 3, like: 1 },
    summary: 'Solid STAR structure demonstrating Agile collaboration, code review mentoring, and CI/CD automation.'
  }
];

// State Manager Class
class StateStore {
  constructor() {
    this.listeners = [];
    this.undoStack = [];
    this.undoTimeoutTimer = null;
    this.state = this.loadInitialState();
    this.initEphemeralCleanup();
  }

  loadInitialState() {
    // 1. Check Authenticated State in localStorage
    try {
      const savedAuth = localStorage.getItem(STORAGE_KEY);
      if (savedAuth) {
        const parsed = JSON.parse(savedAuth);
        if (parsed.auth?.isAuthenticated && parsed.auth?.user) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Could not load auth state:', e);
    }

    // 2. Check Guest Session in sessionStorage (Ephemeral)
    let guestSession = null;
    try {
      const savedGuest = sessionStorage.getItem(GUEST_STORAGE_KEY);
      if (savedGuest) guestSession = JSON.parse(savedGuest);
    } catch (e) {}

    const isGuestActive = true;
    const workingResume = guestSession?.workingResume || DEFAULT_RESUME;

    return {
      auth: {
        isAuthenticated: false,
        isGuest: isGuestActive,
        user: null,
        guestQuota: guestSession?.quota || {
          resumeAnalysesCount: 0,
          interviewSessionsCount: 0,
          lastResetTimestamp: Date.now()
        }
      },
      dashboardScores: {
        resume_score: 94,
        ats_score: 94,
        keyword_alignment: 90,
        interview_readiness: 88
      },
      latestAnalysis: null,
      resumeScoreHistory: [],
      roadmapTasks: {},
      currentPersona: 'careerai',
      personas: PERSONAS,
      resume: workingResume,
      resumeProfiles: [workingResume],
      jobDescriptions: DEFAULT_JDS,
      currentJdKey: 'swe',
      hasActiveJd: true,
      fallbackMode: false,
      interviewMode: 'generic', // 'generic' | 'personalized' (FR-2.8, FR-2.9)
      resolvedSuggestions: [],
      applications: [], // User's private applications
      sessions: isGuestActive ? [] : DEFAULT_SESSIONS, // Empty for guests
      activeView: 'dashboard',
      complianceConsent: {
        voiceStorageOptIn: true,
        aiAnalyticsOptIn: true,
        telemetryOptIn: false,
        lastAgreedDate: '2026-08-26'
      },
      settings: {
        speechRecognitionEnabled: true,
        webcamEnabled: true,
        aiModelProvider: 'built-in-heuristic-gemini',
        geminiApiKey: ''
      }
    };
  }

  initEphemeralCleanup() {
    // PRD Section 10.1: Auto-discard guest data on session close
    window.addEventListener('beforeunload', () => {
      if (this.isGuest()) {
        try {
          // Keep minimal quota in sessionStorage for the tab, but never persist to localStorage
          sessionStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({
            quota: this.state.auth.guestQuota,
            workingResume: this.state.resume
          }));
        } catch (e) {}
      }
    });
  }

  saveState() {
    try {
      if (this.state.auth.isAuthenticated) {
        // Persistent storage for signed-in users
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
      } else {
        // Ephemeral storage for guest exploration
        sessionStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify({
          quota: this.state.auth.guestQuota,
          workingResume: this.state.resume
        }));
      }
    } catch (e) {
      console.error('Error saving state:', e);
    }
    this.notify();
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    this.listeners.forEach(listener => {
      try {
        listener(this.state);
      } catch (err) {
        console.error('Error in state listener:', err);
      }
    });
  }

  // --- Auth & Guest Model (PRD Section 7 & 13.2) ---
  isGuest() {
    return !this.state.auth.isAuthenticated || this.state.auth.isGuest;
  }

  getCurrentPersona() {
    return PERSONAS[this.state.currentPersona] || PERSONAS.careerai;
  }

  login(email, password = '') {
    const name = email.split('@')[0].replace('.', ' ') || USER_PROFILE.name;
    const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
    
    this.state.auth = {
      isAuthenticated: true,
      isGuest: false,
      user: {
        email,
        name: capitalized,
        plan: 'Pro Edition',
        avatar: PERSONAS.careerai.avatar
      },
      guestQuota: { resumeAnalysesCount: 0, interviewSessionsCount: 0, lastResetTimestamp: Date.now() }
    };
    
    if (this.state.applications.length === 0) {
      this.state.applications = JSON.parse(JSON.stringify(DEMO_JOB_APPLICATIONS.map(a => ({ ...a, isDemo: false }))));
    }

    this.saveState();
  }

  signup(email, password = '', name = '') {
    const displayName = name || email.split('@')[0] || USER_PROFILE.name;
    this.state.auth = {
      isAuthenticated: true,
      isGuest: false,
      user: {
        email,
        name: displayName,
        plan: 'Pro Edition',
        avatar: PERSONAS.careerai.avatar
      },
      guestQuota: { resumeAnalysesCount: 0, interviewSessionsCount: 0, lastResetTimestamp: Date.now() }
    };

    // FR-4.10: Session Handoff - in-progress resume and transcript are preserved
    this.state.resume.candidate.name = displayName;
    this.state.resume.candidate.email = email;
    if (this.state.applications.length === 0) {
      this.state.applications = JSON.parse(JSON.stringify(DEMO_JOB_APPLICATIONS.map(a => ({ ...a, isDemo: false }))));
    }

    sessionStorage.removeItem(GUEST_STORAGE_KEY);
    this.saveState();
  }

  loginWithGoogle() {
    this.signup('you@gmail.com', '', 'Your Name');
  }

  continueAsGuest() {
    this.state.auth.isAuthenticated = false;
    this.state.auth.isGuest = true;
    this.state.auth.user = null;
    this.saveState();
  }

  logout() {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(GUEST_STORAGE_KEY);
    this.state = this.loadInitialState();
    this.notify();
  }

  // --- Rate Limiting & Quota Engine (PRD Section 8 & 9) ---
  checkGuestQuota(type) {
    if (!this.isGuest()) return { allowed: true };

    const quota = this.state.auth.guestQuota || { resumeAnalysesCount: 0, interviewSessionsCount: 0, lastResetTimestamp: Date.now() };
    const oneDayMs = 24 * 60 * 60 * 1000;

    // Reset quota after 24 hours
    if (Date.now() - quota.lastResetTimestamp > oneDayMs) {
      quota.resumeAnalysesCount = 0;
      quota.interviewSessionsCount = 0;
      quota.lastResetTimestamp = Date.now();
      this.state.auth.guestQuota = quota;
    }

    if (type === 'resume') {
      const allowed = quota.resumeAnalysesCount < 1; // 1 free resume analysis per 24h
      return { allowed, used: quota.resumeAnalysesCount, limit: 1 };
    }

    if (type === 'interview') {
      const allowed = quota.interviewSessionsCount < 1; // 1 free generic interview session per 24h
      return { allowed, used: quota.interviewSessionsCount, limit: 1 };
    }

    return { allowed: true };
  }

  incrementGuestQuota(type) {
    if (!this.isGuest()) return;
    const quota = this.state.auth.guestQuota || { resumeAnalysesCount: 0, interviewSessionsCount: 0, lastResetTimestamp: Date.now() };
    if (type === 'resume') quota.resumeAnalysesCount++;
    if (type === 'interview') quota.interviewSessionsCount++;
    this.state.auth.guestQuota = quota;
    this.saveState();
  }

  // --- Snapshot & 30-Second Undo Engine ---
  pushUndoSnapshot(label = 'Action') {
    const snapshot = {
      label,
      timestamp: Date.now(),
      resume: JSON.parse(JSON.stringify(this.state.resume)),
      resolvedSuggestions: [...(this.state.resolvedSuggestions || [])]
    };
    this.undoStack.push(snapshot);
    if (this.undoStack.length > 10) this.undoStack.shift();

    if (this.undoTimeoutTimer) clearTimeout(this.undoTimeoutTimer);
    this.undoTimeoutTimer = setTimeout(() => {
      this.undoStack = [];
      this.notify();
    }, 30000);
  }

  undoLastAction() {
    if (this.undoStack.length === 0) return false;
    const lastSnap = this.undoStack.pop();
    this.state.resume = lastSnap.resume;
    this.state.resolvedSuggestions = lastSnap.resolvedSuggestions;
    this.state.resume.lastSaved = 'Restored just now';
    this.saveState();
    return true;
  }

  hasUndo() {
    return this.undoStack.length > 0;
  }

  // --- Resume Profiles & Blank Builder (FR-1.12) ---
  createResumeProfile(parsedData, targetRole = '') {
    const newId = 'res-' + Date.now();
    const roleTitle = targetRole || parsedData.targetRole || 'Untitled Resume';
    const newProfile = {
      id: newId,
      title: `${parsedData.candidate?.name || 'Resume'} — ${roleTitle}`,
      targetRole: roleTitle,
      matchScore: parsedData.matchScore || 70,
      lastSaved: 'Just now',
      candidate: parsedData.candidate || {
        name: 'Your Name',
        email: 'you@example.com',
        phone: '(555) 000-0000',
        location: 'City, Country',
        linkedin: 'linkedin.com/in/yourprofile',
        github: 'github.com/yourprofile'
      },
      sections: parsedData.sections || []
    };

    this.state.resumeProfiles.push(newProfile);
    this.state.resume = newProfile;
    this.state.resolvedSuggestions = [];
    this.saveState();
    return newProfile;
  }

  startBlankResume() {
    const blank = JSON.parse(JSON.stringify(BLANK_RESUME_TEMPLATE));
    blank.id = 'res-blank-' + Date.now();
    this.state.resume = blank;
    this.state.resumeProfiles.unshift(blank);
    this.state.resolvedSuggestions = [];
    this.saveState();
    return blank;
  }

  switchResumeProfile(profileId) {
    const profile = this.state.resumeProfiles.find(p => p.id === profileId);
    if (profile) {
      this.state.resume = profile;
      this.state.resolvedSuggestions = [];
      this.saveState();
    }
  }

  loadSampleResume(sampleKey = '') {
    const base = JSON.parse(JSON.stringify(DEFAULT_RESUME));
    this.state.resume = base;
    this.state.resolvedSuggestions = [];
    this.saveState();
    this.notify();
  }

  // --- Backend AI Analysis Integration ---
  applyAnalysisResult(result) {
    this.pushUndoSnapshot('Backend AI Analysis');
    this.state.latestAnalysis = result;
    this.state.resumeScoreHistory = this.state.resumeScoreHistory || [];
    this.state.resumeScoreHistory.push({
      score: result.resume_score,
      resume_score: result.resume_score,
      ats_score: result.ats_score,
      keyword_alignment: result.keyword_alignment,
      skills_score: this.calculateSkillsScore(result),
      content_projects_score: this.calculateContentScore(result),
      date: new Date().toISOString()
    });
    this.state.dashboardScores = {
      resume_score: result.resume_score,
      ats_score: result.ats_score,
      keyword_alignment: result.keyword_alignment,
      interview_readiness: result.interview_readiness
    };

    if (result.parsed_resume) {
      this.state.resume = result.parsed_resume;
      if (!this.state.resumeProfiles.some(p => p.id === result.parsed_resume.id)) {
        this.state.resumeProfiles.unshift(result.parsed_resume);
      }
    }

    // Calibrate current JD with backend keywords & ATS issues
    const currentJd = this.state.jobDescriptions[this.state.currentJdKey];
    if (currentJd) {
      currentJd.keywordsFound = result.matching_keywords || result.skills || [];
      currentJd.keywordsMissing = result.missing_keywords || result.missing_skills || [];
      currentJd.atsIssues = (result.ats_issues || []).map((issue, idx) => ({
        id: `ats-live-${idx + 1}`,
        severity: idx === 0 ? 'warning' : 'info',
        title: issue,
        fix: result.recommendations?.[idx] || 'Follow standard ATS readability guidelines.'
      }));
      currentJd.qualitativeSummary = result.weaknesses?.[0] || 'Resume analyzed with AI backend.';
    }

    this.state.resolvedSuggestions = [];
    this.saveState();
  }

  calculateSkillsScore(result) {
    const skills = result.skills || result.matching_keywords || [];
    const missing = result.missing_skills || result.missing_keywords || [];
    const total = skills.length + missing.length;
    return total ? Math.round((skills.length / total) * 100) : null;
  }

  calculateContentScore(result) {
    const strengths = result.strengths || [];
    const weaknesses = result.weaknesses || [];
    const total = strengths.length + weaknesses.length;
    return total ? Math.round((strengths.length / total) * 100) : null;
  }

  // --- Target Job Description Mutators ---
  setTargetJobDescription(title, rawText = '') {
    const key = 'custom-' + Date.now();
    const newJd = {
      id: key,
      title: title || 'Target Role',
      roleTag: (title || 'Target Role').slice(0, 16),
      company: 'Target Company',
      rawText: rawText || `Target requirements for ${title}`,
      keywordsFound: ['Product Strategy', 'Roadmapping', 'Agile'],
      keywordsMissing: ['Kubernetes', 'SQL', 'Stakeholder Management', 'A/B Testing'],
      sectionBreakdown: { skills: -10, experience: 10, formatting: 5, keywords: -8 },
      qualitativeSummary: 'Role match calibrated. Address missing skills to boost score.',
      atsIssues: []
    };
    this.state.jobDescriptions[key] = newJd;
    this.state.currentJdKey = key;
    this.state.hasActiveJd = true;
    if (this.state.resume) {
      this.state.resume.targetRole = title;
    }
    this.saveState();
  }

  clearTargetJobDescription() {
    this.state.currentJdKey = null;
    this.state.hasActiveJd = false;
    this.saveState();
  }

  // --- Unified AI Coach Profile ---
  setPersona(personaId) {
    if (!PERSONAS[personaId]) return;

    this.state.currentPersona = 'careerai';
    const p = PERSONAS.careerai;

    if (this.state.auth?.user) {
      this.state.auth.user.name = p.name;
      this.state.auth.user.plan = p.plan;
      this.state.auth.user.avatar = p.avatar;
    }

    this.state.dashboardScores = {
      resume_score: p.atsScore,
      ats_score: p.atsScore,
      keyword_alignment: p.keywordAlignment,
      interview_readiness: p.interviewReadiness
    };

    this.state.resolvedSuggestions = [];
    this.saveState();
    this.notify();
  }

  updateResume(updater) {
    this.state.resume = typeof updater === 'function' ? updater(this.state.resume) : { ...this.state.resume, ...updater };
    this.state.resume.lastSaved = 'Just now';
    this.saveState();
  }

  updateBulletRewrite(bulletId, newText) {
    this.pushUndoSnapshot('Apply AI Rewrite');
    let updated = false;

    this.state.resume.sections?.forEach(sec => {
      if (sec.items) {
        sec.items.forEach(item => {
          if (item.bullets) {
            item.bullets.forEach(b => {
              if (b.id === bulletId) {
                b.text = newText;
                b.hasSuggestion = false;
                updated = true;
              }
            });
          }
        });
      } else if (sec.id === bulletId || (bulletId === 'sec-summary' && sec.id === 'summary')) {
        sec.content = newText;
        updated = true;
      }
    });

    if (!this.state.resolvedSuggestions.includes(bulletId)) {
      this.state.resolvedSuggestions.push(bulletId);
    }

    // Dynamic Recalculation of Scores: ATS Score, Keyword Coverage, Role Match Score
    const jd = this.state.jobDescriptions[this.state.currentJdKey];
    const scores = aiEngine.recalculateScoresAfterUpdate(this.state.resume, jd);
    this.state.resume.matchScore = scores.matchScore;
    if (this.state.dashboardScores) {
      this.state.dashboardScores.ats_score = scores.atsScore;
      this.state.dashboardScores.keyword_alignment = scores.keywordCoverage;
      this.state.dashboardScores.resume_score = scores.matchScore;
    }

    this.saveState();
    return scores;
  }

  dismissSuggestion(bulletId) {
    if (!this.state.resolvedSuggestions.includes(bulletId)) {
      this.state.resolvedSuggestions.push(bulletId);
      this.saveState();
    }
  }

  optimizeAllSuggestions() {
    this.pushUndoSnapshot('Bulk AI Optimization');
    let count = 0;
    const existingRewrites = [];
    const targetRole = this.state.resume.targetRole || 'Software Engineer';

    this.state.resume.sections?.forEach(sec => {
      const sectionName = sec.id || 'experience';
      if (sec.items) {
        sec.items.forEach(item => {
          const company = item.company || '';
          const role = item.role || '';
          const surrounding = (item.bullets || []).map(b => b.text);

          if (item.bullets) {
            item.bullets.forEach(b => {
              if (!this.state.resolvedSuggestions.includes(b.id)) {
                // Generate a unique, fact-checked, context-aware rewrite
                const rewriteData = aiEngine.generateContextualRewrite({
                  originalText: b.text,
                  sectionName: 'experience',
                  company,
                  role,
                  surroundingBullets: surrounding,
                  targetRole,
                  existingRewrites
                });

                if (rewriteData && rewriteData.rewrite && rewriteData.rewrite !== b.text) {
                  b.text = rewriteData.rewrite;
                  b.hasSuggestion = false;
                  existingRewrites.push(rewriteData.rewrite);
                  if (!this.state.resolvedSuggestions.includes(b.id)) {
                    this.state.resolvedSuggestions.push(b.id);
                  }
                  count++;
                }
              }
            });
          }
        });
      }
    });

    // Dynamic Recalculation of Scores: ATS Score, Keyword Coverage, Role Match Score
    const jd = this.state.jobDescriptions[this.state.currentJdKey];
    const scores = aiEngine.recalculateScoresAfterUpdate(this.state.resume, jd);
    this.state.resume.matchScore = scores.matchScore;
    if (this.state.dashboardScores) {
      this.state.dashboardScores.ats_score = scores.atsScore;
      this.state.dashboardScores.keyword_alignment = scores.keywordCoverage;
      this.state.dashboardScores.resume_score = scores.matchScore;
    }

    this.saveState();
    return { count, scores };
  }

  addSkillToResume(skill, contextualSentence = '') {
    this.pushUndoSnapshot(`Add Skill ${skill}`);
    const skillsSec = this.state.resume.sections.find(s => s.id === 'skills');
    if (skillsSec && !skillsSec.content.toLowerCase().includes(skill.toLowerCase())) {
      skillsSec.content += `, ${skill}`;
    }

    if (contextualSentence) {
      const expSec = this.state.resume.sections.find(s => s.id === 'experience');
      if (expSec && expSec.items && expSec.items[0]) {
        expSec.items[0].bullets.push({
          id: 'b-skill-' + Date.now(),
          text: contextualSentence,
          hasSuggestion: false
        });
      }
    }

    const currentJd = this.state.jobDescriptions[this.state.currentJdKey];
    if (currentJd && currentJd.keywordsMissing) {
      currentJd.keywordsMissing = currentJd.keywordsMissing.filter(k => k.toLowerCase() !== skill.toLowerCase());
      if (!currentJd.keywordsFound.some(k => k.toLowerCase() === skill.toLowerCase())) {
        currentJd.keywordsFound.push(skill);
      }
    }

    this.state.resume.matchScore = Math.min(98, (this.state.resume.matchScore || 75) + 3);
    this.saveState();
  }

  // --- Job Tracker & Interview Session Mutators ---
  addJobApplication(appData) {
    const newApp = {
      id: 'app-' + Date.now(),
      logoLetter: (appData.company || 'C').charAt(0).toUpperCase(),
      accentColor: '#4F46E5',
      priorityLabel: appData.priority === 'high' ? 'High Priority' : 'Normal',
      appliedDate: 'Just now',
      isDemo: false,
      ...appData
    };
    this.state.applications.push(newApp);
    this.saveState();
  }

  moveApplication(appId, newStage) {
    const app = this.state.applications.find(a => a.id === appId);
    if (app) {
      app.stage = newStage;
      this.saveState();
    }
  }

  addInterviewSession(sessionData) {
    const newSession = {
      id: 'sess-' + Date.now(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      ...sessionData
    };
    this.state.sessions.unshift(newSession);
    this.saveState();
  }

  setRoadmapTaskStatus(taskId, completed) {
    this.state.roadmapTasks = this.state.roadmapTasks || {};
    this.state.roadmapTasks[taskId] = completed;
    this.saveState();
    this.notify();
  }

  setInterviewMode(mode) {
    this.state.interviewMode = mode; // 'generic' | 'personalized'
    this.saveState();
  }

  setActiveView(viewId) {
    this.state.activeView = viewId;
    this.saveState();
  }

  resetAllData() {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(GUEST_STORAGE_KEY);
    this.state = this.loadInitialState();
    this.notify();
  }
}

export const store = new StateStore();
