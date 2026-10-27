const TOPICS = [
  'AI Future',
  'Dream Company',
  'Leadership',
  'Teamwork',
  'College Life',
  'Social Media',
  'Productivity',
  'Technology Trends',
  'Startups',
  'Innovation'
];

const MODE_QUESTIONS = {
  hr: [
    'Tell me about yourself in a way that would interest an internship recruiter.',
    'Describe a situation where you handled feedback and improved your work.',
    'Why should a company choose you for this opportunity?'
  ],
  technical: [
    'Explain one technical project you built, including the problem, stack, and your contribution.',
    'How would you debug a feature that works locally but fails in production?',
    'Describe a concept from your core subject and connect it to a real use case.'
  ],
  internship: [
    'Why are you looking for this internship and what do you hope to learn?',
    'Tell me about a college project that shows initiative.',
    'How do you manage deadlines when you are still learning a new skill?'
  ],
  speaking: [
    'Speak for two minutes on AI Future. Use a clear opening, two points, and a confident closing.',
    'Speak about leadership using one real or imagined example.',
    'Explain how social media affects productivity for students.'
  ],
  introduction: [
    'Give your self introduction for a fresher internship interview.',
    'Introduce yourself for a technical panel in under ninety seconds.',
    'Share your background, strengths, and current learning goals.'
  ],
  rapid: [
    'What is your biggest strength?',
    'What is one skill you are improving right now?',
    'What motivates you to keep learning?'
  ],
  gd: [
    'Start a group discussion on whether AI will create more jobs than it removes.',
    'Share your opening view on remote work for freshers.',
    'Respond to a teammate who disagrees with your point about technology in education.'
  ]
};

const DOMAIN_GUIDES = {
  'MERN Stack': ['React state management', 'Node and Express APIs', 'MongoDB schema design', 'authentication', 'deployment'],
  'Web Development': ['frontend fundamentals', 'responsive UI', 'API integration', 'browser debugging', 'deployment'],
  'AI/ML': ['supervised vs unsupervised learning', 'datasets', 'model training', 'overfitting', 'Python libraries'],
  'Data Science': ['data cleaning', 'EDA', 'visualization', 'statistics', 'model evaluation'],
  Cybersecurity: ['OWASP basics', 'authentication security', 'network threats', 'secure coding', 'incident response'],
  'Cloud Computing': ['cloud services', 'deployment', 'scaling', 'storage', 'monitoring'],
  'Android Development': ['activity lifecycle', 'APIs', 'local storage', 'UI layouts', 'debugging'],
  'UI/UX': ['user research', 'wireframes', 'accessibility', 'design systems', 'prototyping'],
  DevOps: ['CI/CD', 'Docker', 'deployment pipelines', 'monitoring', 'cloud basics'],
  'Java Developer': ['OOP', 'collections', 'exception handling', 'JDBC', 'Spring Boot'],
  'Python Developer': ['Python basics', 'APIs', 'automation', 'libraries', 'debugging'],
  'C++/DSA': ['arrays', 'strings', 'recursion', 'complexity', 'problem solving'],
  'Full Stack': ['frontend architecture', 'backend logic', 'database design', 'APIs', 'deployment'],
  Blockchain: ['smart contracts', 'wallets', 'consensus basics', 'security', 'use cases'],
  IoT: ['sensors', 'microcontrollers', 'protocols', 'cloud data', 'device debugging']
};

const SOFTWARE_BRANCHES = ['Computer Science Engineering (CSE)', 'Information Technology (IT)', 'AI & Data Science'];

const SOFTWARE_PLACEMENT_QUESTIONS = [
  q('Introduce yourself and highlight one technical skill that matches this role.', 'Mention branch, skill, project, internship goal, and one strength.', 'Beginner', 'TCS', 'HR Interview'),
  q('Explain the difference between array and linked list with one practical use case.', 'Arrays give indexed access; linked lists help with dynamic insertion and deletion.', 'Beginner', 'Infosys', 'Technical Basics'),
  q('What is object-oriented programming, and where did you use it in a project?', 'OOP organizes code using classes, objects, inheritance, encapsulation, and polymorphism.', 'Beginner', 'Wipro', 'OOP Round'),
  q('How would you design a simple login system for a college project?', 'Use frontend form validation, backend API, hashed password, database user table, and session or JWT.', 'Beginner', 'Accenture', 'Project Questions'),
  q('Explain primary key, foreign key, and indexing in DBMS using a student database example.', 'Primary key uniquely identifies records, foreign key links tables, index improves search.', 'Beginner', 'Cognizant', 'DBMS Round'),
  q('What happens when you type a URL in the browser and press Enter?', 'DNS lookup, TCP/TLS connection, HTTP request, server response, browser rendering.', 'Intermediate', 'Capgemini', 'Computer Networks'),
  q('How do you debug a web application that works locally but fails after deployment?', 'Check environment variables, logs, API URLs, build errors, CORS, database connection, and deployment config.', 'Intermediate', 'Deloitte', 'Real-world Scenario Questions'),
  q('Tell me about one project architecture: frontend, backend, database, APIs, and deployment.', 'Explain modules, data flow, API routes, database choices, hosting, and one challenge solved.', 'Intermediate', 'Amazon', 'Project Questions'),
  q('What is overfitting in machine learning, and how can you reduce it?', 'Overfitting means model memorizes training data; reduce using validation, regularization, pruning, more data.', 'Intermediate', 'Microsoft', 'AI/ML Round'),
  q('How would you secure a REST API used in your internship project?', 'Use authentication, authorization, input validation, rate limiting, HTTPS, and safe error handling.', 'Advanced', 'Google', 'Cybersecurity')
];

const CORE_PLACEMENT_QUESTIONS = [
  q('Introduce yourself and connect your branch knowledge to an industry role.', 'Mention branch, practical skills, project, internship interest, and one strength.', 'Beginner', 'Tata Motors', 'HR Interview'),
  q('Explain one core subject concept from your branch with a real industrial use case.', 'State the concept, explain simply, and connect it to machines, systems, sites, or processes.', 'Beginner', 'L&T', 'Core Subjects'),
  q('Describe a project or lab work where you solved a practical engineering problem.', 'Explain problem, method, tools used, result, and what you personally contributed.', 'Beginner', 'Mahindra', 'Project Questions'),
  q('How would you troubleshoot a machine, circuit, structure, or process that suddenly fails?', 'Observe symptoms, isolate causes, check basics, test safely, document findings, and fix root cause.', 'Intermediate', 'Bosch', 'Troubleshooting'),
  q('What safety precautions are important in your branch during practical work?', 'Mention PPE, SOPs, isolation, load limits, calibration, supervision, and emergency response.', 'Beginner', 'Reliance', 'Safety Questions'),
  q('Explain one manufacturing, design, or maintenance concept that every fresher should know.', 'Give a simple definition, practical example, and why it matters in industry.', 'Intermediate', 'Siemens', 'Industrial Applications'),
  q('If your team disagrees on a design or process decision, how will you handle it?', 'Compare data, constraints, safety, cost, timeline, and choose a justified solution.', 'Intermediate', 'Tech Mahindra', 'Problem Solving'),
  q('What was the most important viva question asked in your recent practical, and how would you answer it?', 'Give the question, concise answer, and practical relevance.', 'Beginner', 'Campus Drive', 'Viva Questions'),
  q('How do quality, cost, and time affect engineering decisions in industry?', 'Engineering decisions balance performance, safety, manufacturability, budget, and deadlines.', 'Intermediate', 'Capgemini Engineering', 'Real-world Scenario Questions'),
  q('Describe one improvement you would make to your final-year project for industry use.', 'Discuss reliability, safety, efficiency, cost, scalability, testing, and user impact.', 'Advanced', 'Deloitte', 'Internship Questions')
];

const HR_MASTER_QUESTIONS = [
  q('Tell me about yourself.', 'Give a short introduction with education, skills, project, goal, and strength.', 'Beginner', 'TCS', 'HR Interview'),
  q('Why should we hire you for this role?', 'Connect skills, learning attitude, projects, teamwork, and company fit.', 'Beginner', 'Infosys', 'HR Interview'),
  q('Describe a challenge you faced and how you handled it.', 'Use situation, action, result, and learning.', 'Beginner', 'Wipro', 'HR Interview'),
  q('Where do you see yourself in five years?', 'Show growth mindset, skill development, and contribution to the company.', 'Beginner', 'Accenture', 'HR Interview'),
  q('Are you comfortable relocating or working in shifts?', 'Answer honestly and professionally with flexibility if possible.', 'Beginner', 'Cognizant', 'HR Interview')
];

const RAPID_MASTER_QUESTIONS = [
  q('One strength?', 'Name one job-relevant strength with a quick example.', 'Beginner', 'TCS', 'Rapid Fire'),
  q('One weakness you are improving?', 'Mention a real but manageable weakness and improvement action.', 'Beginner', 'Infosys', 'Rapid Fire'),
  q('Favorite subject and why?', 'Choose one subject and connect it to practical work.', 'Beginner', 'Campus Drive', 'Rapid Fire'),
  q('Team work or individual work?', 'Prefer both depending on task, with teamwork comfort.', 'Beginner', 'Wipro', 'Rapid Fire'),
  q('What motivates you?', 'Learning, solving problems, building useful work, and career growth.', 'Beginner', 'Accenture', 'Rapid Fire')
];

function fallbackQuestion({ mode = 'hr', difficulty = 'Beginner', answers = [], resumeText = '', topic = '', setup = {} }) {
  const normalizedMode = String(mode || 'hr').toLowerCase();
  const set = MODE_QUESTIONS[normalizedMode] || MODE_QUESTIONS.hr;
  const answerCount = Array.isArray(answers) ? answers.length : 0;
  const previous = answers?.[answerCount - 1]?.answer || '';
  const base = set[answerCount % set.length];
  const branch = setup.branch || 'Computer Science Engineering (CSE)';
  const studentName = setup.studentName || '';
  const placementQuestion = nextPlacementQuestion({ mode: normalizedMode, branch, difficulty, answers, resumeText });
  if (placementQuestion) return formatInterviewQuestion(placementQuestion, studentName, answerCount);

  const domain = setup.domain || topic || 'MERN Stack';
  const technology = setup.technology || '';
  const role = setup.role || 'Software Developer Intern';
  const experience = setup.experience || difficulty;
  const domainTopics = DOMAIN_GUIDES[domain] || DOMAIN_GUIDES['Full Stack'];
  const focus = [technology, domainTopics.slice(0, 3).join(', ')].filter(Boolean).join(', ');

  if (normalizedMode === 'technical') {
    if (answerCount === 0) {
      return `You selected ${domain} for a ${role} role. Tell me about one project or concept where you used ${focus}.`;
    }
    if (mentionsProject(previous)) return `Good explanation. Now go deeper into your project architecture: backend logic, database decisions, APIs used, debugging, deployment, and one security improvement.`;
    if (isWeak(previous)) return `No problem, let us make it simpler. Explain ${domainTopics[0]} in your own words, then give one small example.`;
    if (performsWell(previous, experience)) return `Nice understanding. Let us increase depth: how would you improve scalability, error handling, and maintainability for this ${domain} solution?`;
    return `Can you connect your answer to a real ${role} task using ${technology || domainTopics[answerCount % domainTopics.length]}?`;
  }

  if (normalizedMode === 'internship') {
    if (answerCount === 0) {
      return `For a ${role} internship screening in ${domain}, introduce yourself and explain why your current skills in ${technology || domainTopics[0]} match this role.`;
    }
    if (mentionsProject(previous)) return 'Good. Pick one project from your resume and explain your role, challenges faced, APIs or tools used, and the result.';
    if (isWeak(previous)) return 'That is okay. Give a shorter answer: your current skill, one project, and why you want this internship.';
    if (answerCount % 2 === 1) return `Let us do a technical screening check: explain one ${technology || domainTopics[answerCount % domainTopics.length]} fundamental and where you used it.`;
    return 'Now answer a realistic screening question: describe a time you solved a problem, worked with a team, or learned a new technology quickly.';
  }

  if (normalizedMode === 'speaking') {
    const selectedTopic = topic || TOPICS[answerCount % TOPICS.length];
    return `Speak for 1-3 minutes on ${selectedTopic}. Start with a clear opening, add one example, and finish with a confident takeaway.`;
  }

  if (resumeText && answerCount === 0) {
    return `I noticed your resume context. Can you explain the most relevant project or achievement for this ${labelMode(mode)} round?`;
  }

  if (previous && mentionsProject(previous)) {
    return difficulty === 'Advanced'
      ? 'Good. Now go deeper: what trade-off did you make in that project, and how would you improve it with more time?'
      : 'Nice. What was your exact role in that project, and what did you learn from it?';
  }

  if (previous && /\b(team|lead|group|friend|member)\b/i.test(previous)) {
    return 'That teamwork point is useful. Can you share one specific action you took and the result it created?';
  }

  if (difficulty === 'Advanced' && answerCount > 0) {
    return 'Let me challenge you slightly: give a structured answer with context, action, result, and one measurable impact.';
  }

  return base;
}

function nextPlacementQuestion({ mode, branch, difficulty, answers = [], resumeText = '' }) {
  const asked = new Set((answers || []).map((item) => stripNamePrefix(String(item.question || '')).toLowerCase()));
  const pool = createPlacementPool({ mode, branch, difficulty, resumeText });
  const ordered = [...pool].sort((a, b) => difficultyRank(a.difficulty) - difficultyRank(b.difficulty));
  return ordered.find((item) => !asked.has(formatInterviewQuestion(item).toLowerCase())) || ordered[(answers.length || 0) % ordered.length];
}

function createPlacementPool({ mode = 'technical', branch = 'Computer Science Engineering (CSE)', difficulty = 'Beginner', resumeText = '' }) {
  const normalizedMode = String(mode || 'technical').toLowerCase();
  const software = SOFTWARE_BRANCHES.includes(branch);
  const profile = software ? softwareProfile(branch) : coreProfile(branch);
  const company = software ? ['TCS', 'Infosys', 'Wipro', 'Accenture', 'Cognizant', 'Capgemini', 'Deloitte', 'Microsoft', 'Amazon', 'Google'] : ['Tata Motors', 'L&T', 'Mahindra', 'Reliance', 'Bosch', 'Siemens', 'Deloitte', 'Capgemini Engineering', 'Tech Mahindra', 'Campus Drive'];
  const round = modeRound(normalizedMode);
  const templates = questionTemplates(normalizedMode, difficulty, software);
  const pool = templates.slice(0, 10).map((template, index) => {
    const question = fillTemplate(template[0], { branch, ...profile });
    const answer = fillTemplate(template[1], { branch, ...profile });
    return q(question, answer, difficulty, company[index % company.length], round);
  });

  if (resumeText && ['technical', 'internship', 'hr'].includes(normalizedMode)) {
    pool[0] = q(
      `Pick the most relevant resume project for ${branch} placements and explain your exact contribution, tools used, challenge, and result.`,
      'Explain project context, personal contribution, technical decisions, debugging, outcome, and learning.',
      difficulty,
      'Deloitte',
      'Resume Questions'
    );
  }
  return pool;
}

function softwareProfile(branch) {
  if (branch === 'AI & Data Science') {
    return {
      subject: 'machine learning',
      concept: 'supervised vs unsupervised learning',
      tool: 'Python, pandas, scikit-learn, or TensorFlow',
      project: 'AI or data science project',
      scenario: 'model accuracy drops after deployment'
    };
  }
  return {
    subject: 'software engineering',
    concept: 'DSA, OOP, DBMS, OS, CN, and web APIs',
    tool: 'Java, Python, SQL, React, Node.js, or cloud basics',
    project: 'web or full-stack project',
    scenario: 'application works locally but fails after deployment'
  };
}

function coreProfile(branch) {
  const map = {
    'Electronics & Telecommunication': ['communication systems', 'signal flow, sensors, microcontrollers, and networks', 'multimeter, oscilloscope, Arduino, or simulation tools', 'electronics or IoT project', 'signal noise or device failure in field testing'],
    'Electrical Engineering': ['electrical machines and power systems', 'transformers, motors, protection, and load flow', 'multimeter, relay testing, MATLAB, or PLC basics', 'electrical control or power project', 'motor overheating or voltage fluctuation'],
    'Mechanical Engineering': ['thermodynamics and manufacturing', 'strength of materials, CAD, machining, and maintenance', 'AutoCAD, SolidWorks, CNC, or measuring instruments', 'mechanical design or manufacturing project', 'machine vibration or production downtime'],
    'Civil Engineering': ['structural and construction engineering', 'concrete, surveying, estimation, soil, and safety', 'AutoCAD, STAAD Pro, total station, or estimation tools', 'civil design or site project', 'crack, settlement, or site safety issue'],
    'Chemical Engineering': ['process engineering', 'mass transfer, heat transfer, reactors, and safety', 'process simulation, lab instruments, or P&ID basics', 'chemical process or plant project', 'process deviation or safety risk'],
    'Automobile Engineering': ['automotive systems', 'IC engines, EV basics, transmission, braking, and diagnostics', 'OBD scanner, CAD, or workshop tools', 'automobile design or diagnostics project', 'engine performance or braking issue'],
    'Aerospace Engineering': ['aerodynamics and aircraft systems', 'lift, drag, propulsion, structures, and materials', 'CAD, CFD basics, wind tunnel, or simulation tools', 'aerospace design or analysis project', 'stability or material failure scenario'],
    'Biomedical Engineering': ['biomedical instrumentation', 'sensors, imaging, signal processing, and safety standards', 'biomedical sensors, MATLAB, or calibration tools', 'medical device or healthcare technology project', 'sensor drift or patient safety issue'],
    'Robotics Engineering': ['robotics and automation', 'sensors, actuators, kinematics, control, and embedded systems', 'Arduino, ROS, Python, CAD, or PLC basics', 'robotics or automation project', 'robot path error or sensor failure'],
    'Mechatronics Engineering': ['mechatronics systems', 'mechanics, electronics, control, sensors, and automation', 'PLC, Arduino, sensors, CAD, or simulation tools', 'automation or mechatronics project', 'actuator mismatch or control issue'],
    'Instrumentation Engineering': ['instrumentation and control', 'sensors, calibration, PID, process control, and measurement', 'calibrators, PLC, SCADA, or control valves', 'instrumentation or control project', 'wrong sensor reading or control loop instability'],
    'Production Engineering': ['production and industrial engineering', 'manufacturing, quality, lean, inventory, and maintenance', 'CNC, quality tools, AutoCAD, or process charts', 'production optimization project', 'quality rejection or bottleneck issue']
  };
  const values = map[branch] || map['Mechanical Engineering'];
  return { subject: values[0], concept: values[1], tool: values[2], project: values[3], scenario: values[4] };
}

function questionTemplates(mode, difficulty, software) {
  const sets = {
    hr: {
      Beginner: [
        ['Tell me about yourself as a {branch} student.', 'Cover education, skills, project, strengths, and placement goal.'],
        ['Why should we hire you for an entry-level role related to {subject}?', 'Connect skills, learning ability, projects, and positive attitude.'],
        ['What is your biggest strength with one college example?', 'Mention a real strength and a short example.'],
        ['What is one weakness you are improving?', 'Share a manageable weakness and improvement action.'],
        ['Why did you choose {branch}?', 'Connect interest, aptitude, and future career direction.'],
        ['Tell me about a time you worked in a team.', 'Use situation, task, action, result.'],
        ['How do you handle feedback from teachers or seniors?', 'Show openness, action, and improvement.'],
        ['Are you comfortable learning new tools like {tool}?', 'Say yes with a learning example.'],
        ['What are your short-term career goals?', 'Mention first job, skill building, and contribution.'],
        ['Why are placements important to you?', 'Connect career start, responsibility, learning, and growth.']
      ],
      Intermediate: [
        ['Tell me about yourself with one measurable achievement.', 'Add education, skills, achievement, project impact, and goal.'],
        ['Describe a failure in college and what you changed after it.', 'Show ownership, correction, and learning.'],
        ['How will you handle pressure during campus drives?', 'Mention planning, calm communication, and prioritization.'],
        ['Why are you a good fit for companies hiring {branch} freshers?', 'Map branch knowledge, practical mindset, and adaptability.'],
        ['How do you manage conflict in a team project?', 'Listen, compare facts, divide work, and align on goal.'],
        ['What makes you different from other candidates?', 'Give a specific skill, project, habit, or attitude.'],
        ['How do you stay updated in {subject}?', 'Mention courses, documentation, projects, and practice.'],
        ['Explain a time you solved a problem without direct help.', 'Share problem-solving steps and result.'],
        ['What kind of manager helps you perform best?', 'Mention clarity, feedback, trust, and accountability.'],
        ['Why this company and not only any job?', 'Connect company domain, learning path, and role fit.']
      ],
      Advanced: [
        ['Give a 60-second professional pitch for a top recruiter.', 'Make it crisp, role-focused, evidence-based, and confident.'],
        ['Defend why your profile deserves a higher package shortlist.', 'Use skills, project depth, ownership, and learning speed.'],
        ['How would you handle a situation where your team misses a deadline?', 'Analyze cause, communicate early, re-plan, and prevent repeat.'],
        ['Tell me about a difficult decision in a project.', 'Explain trade-off, reasoning, outcome, and learning.'],
        ['How do you respond if an interviewer challenges your answer?', 'Stay calm, clarify, correct if needed, and reason logically.'],
        ['What leadership example can you prove from college?', 'Show initiative, responsibility, team impact, and result.'],
        ['How will you contribute in your first 90 days?', 'Learn system, take small tasks, document, ask feedback, deliver reliably.'],
        ['What ethical issue can arise in {subject}, and how would you handle it?', 'Mention safety, data, quality, honesty, and escalation.'],
        ['Why should a product or engineering team trust you with real work?', 'Show ownership, testing, communication, and accountability.'],
        ['What is your long-term career strategy?', 'Mention technical depth, domain growth, mentorship, and business impact.']
      ]
    },
    technical: {
      Beginner: software
        ? [
            ['Explain {concept} in simple words.', 'Define the topic and give one practical example.'],
            ['What is the difference between array and linked list?', 'Array has indexed contiguous storage; linked list uses nodes and dynamic links.'],
            ['Explain OOP with one project example.', 'Classes, objects, encapsulation, inheritance, polymorphism with practical use.'],
            ['What is a database primary key?', 'A field that uniquely identifies each record.'],
            ['What is an API?', 'A contract that lets frontend, backend, or services communicate.'],
            ['What is the difference between HTTP GET and POST?', 'GET reads data; POST sends data to create or process.'],
            ['What is an operating system process?', 'A running program with memory, resources, and execution state.'],
            ['What is normalization in DBMS?', 'Organizing tables to reduce redundancy and improve consistency.'],
            ['Explain your {project} architecture.', 'Frontend, backend, database, APIs, and deployment flow.'],
            ['How do you debug a basic coding error?', 'Reproduce, read error, isolate, log, test fix, and verify.']
          ]
        : [
            ['Explain one fundamental concept from {subject}.', 'Define it simply and connect to practical use.'],
            ['What tools have you used in labs or projects: {tool}?', 'Mention tool, purpose, and what you learned.'],
            ['Explain your {project}.', 'Problem, design, method, result, and your contribution.'],
            ['What safety precautions are important in {branch}?', 'PPE, SOP, isolation, calibration, supervision, emergency response.'],
            ['Explain one common material/component used in your branch.', 'Mention property, use, and limitation.'],
            ['What is troubleshooting?', 'Finding root cause by observing symptoms, testing safely, and fixing systematically.'],
            ['What is quality control in engineering work?', 'Checking output against standards to reduce defects.'],
            ['Explain one viva question from your recent practical.', 'Give concise answer and practical relevance.'],
            ['What is preventive maintenance?', 'Regular inspection and service to prevent failure.'],
            ['How do you read or interpret a basic engineering drawing/diagram?', 'Check symbols, dimensions, flow, tolerances, and notes.']
          ],
      Intermediate: [
        ['How would you solve this real scenario: {scenario}?', 'Identify symptoms, probable causes, tests, solution, and prevention.'],
        ['Explain a trade-off you made in your {project}.', 'Discuss options, constraints, chosen approach, and result.'],
        ['How would you improve reliability in a {branch} project?', 'Testing, safety margins, monitoring, documentation, and review.'],
        ['What practical mistake do freshers make in {subject}?', 'Mention a common mistake and prevention method.'],
        ['How do you validate that your solution is working?', 'Use tests, measurements, user checks, logs, or standards.'],
        ['Explain one industry application of {concept}.', 'Connect concept to a real company or plant/project use case.'],
        ['How do cost and time affect engineering decisions?', 'Balance performance, quality, safety, budget, and deadline.'],
        ['What would you document after solving a technical issue?', 'Cause, steps, data, fix, test result, and prevention.'],
        ['How will you learn an unfamiliar tool quickly?', 'Official docs, small practice, mentor help, and apply to task.'],
        ['Explain one project challenge and how you debugged it.', 'Give root cause, debugging steps, and outcome.']
      ],
      Advanced: [
        ['Design a scalable or industry-ready version of your {project}.', 'Discuss architecture, reliability, safety/security, testing, and deployment.'],
        ['How would you present {scenario} to a senior engineer?', 'Share facts, impact, diagnosis, options, recommendation, and risk.'],
        ['What metrics would you track for a {branch} solution?', 'Mention quality, performance, cost, safety, downtime, or accuracy.'],
        ['How would you reduce failure risk before deployment or production?', 'Review, simulation/testing, checklist, monitoring, rollback, safety approval.'],
        ['Explain a complex concept from {subject} to a non-technical manager.', 'Use simple language, analogy, impact, and business relevance.'],
        ['What standards or best practices matter in {branch}?', 'Mention safety, quality, documentation, testing, and compliance.'],
        ['How would you mentor a junior on your project?', 'Explain task, show examples, review work, and give feedback.'],
        ['How do you choose between two technical solutions?', 'Compare requirements, constraints, risks, cost, maintainability, and evidence.'],
        ['What is the most industry-ready part of your profile?', 'Support with project depth, tools, results, and learning.'],
        ['How would you handle a production issue on day one of internship?', 'Stay calm, inform mentor, collect data, avoid unsafe changes, help systematically.']
      ]
    },
    internship: {
      Beginner: [
        ['Why do you want an internship in {branch}?', 'Mention learning, practical exposure, skill growth, and career clarity.'],
        ['What skill from {subject} can you apply during internship?', 'Name one skill and a simple workplace use.'],
        ['Tell me about one project that proves internship readiness.', 'Problem, tools, contribution, result, and learning.'],
        ['How will you handle a task you do not know?', 'Ask clarity, research, try small steps, update mentor.'],
        ['What do you expect from your first internship?', 'Learning, guidance, real tasks, feedback, and discipline.'],
        ['How do you manage college and internship deadlines?', 'Prioritize, plan, communicate early, and track work.'],
        ['What tools are you ready to learn: {tool}?', 'Show willingness and one learning example.'],
        ['How will you communicate daily progress?', 'Short updates: done, blockers, next step.'],
        ['What makes you dependable as an intern?', 'Punctuality, honesty, learning attitude, and follow-through.'],
        ['What is one area you want to improve before internship?', 'Name skill and action plan.']
      ],
      Intermediate: [
        ['Explain how your {project} can be useful in industry.', 'Connect project problem to real users, cost, quality, or efficiency.'],
        ['How would you ask for help without looking unprepared?', 'Explain what you tried, exact blocker, and possible options.'],
        ['What would you do if your assigned task changes suddenly?', 'Clarify priority, adapt plan, update timeline, execute.'],
        ['How will you test your internship work before submission?', 'Use checklist, peer/mentor review, test cases or measurements.'],
        ['Describe a teamwork situation relevant to internship.', 'Use role, coordination, conflict handling, and result.'],
        ['How would you handle feedback that your work is not good enough?', 'Accept, clarify gaps, improve, verify, thank reviewer.'],
        ['What workplace habit will help you most?', 'Documentation, punctual updates, asking good questions.'],
        ['How do you convert classroom theory into practical work?', 'Map concept to task, observe, experiment, and validate.'],
        ['What is one risk in your {branch} internship work?', 'Mention technical/safety/data risk and prevention.'],
        ['Why should a company give you a PPO opportunity?', 'Show ownership, improvement, team fit, and deliverables.']
      ],
      Advanced: [
        ['How would you create a 30-day internship learning plan?', 'Understand domain, learn tools, deliver small tasks, seek review.'],
        ['How would you handle an unclear requirement from a mentor?', 'Ask questions, document assumptions, confirm scope, then execute.'],
        ['What business impact can your {branch} work create?', 'Quality, cost reduction, safety, automation, user value, or reliability.'],
        ['How would you manage a critical mistake during internship?', 'Inform early, stop harm, analyze, fix, document, prevent repeat.'],
        ['How would you improve an existing process or product as an intern?', 'Observe data, find bottleneck, suggest small measurable improvement.'],
        ['Explain your project like you are in a final internship interview.', 'Clear problem, design, personal ownership, result, future scope.'],
        ['What would you do if two seniors give opposite instructions?', 'Clarify priority jointly, document decision, and proceed respectfully.'],
        ['How do you prove you are not only a learner but also a contributor?', 'Deliver reliable work, communicate, improve, and take ownership.'],
        ['What advanced topic in {subject} are you ready to explore?', 'Name topic, why useful, and learning path.'],
        ['How will you measure your internship success?', 'Skills learned, tasks completed, feedback, impact, and confidence growth.']
      ]
    },
    introduction: {
      Beginner: [
        ['Give your self introduction for a fresher placement interview.', 'Name, branch, skills, project, strength, goal.'],
        ['Introduce yourself in 60 seconds for {branch}.', 'Keep it short, structured, and role-focused.'],
        ['Introduce yourself with one project highlight.', 'Add project problem, role, and learning.'],
        ['Introduce yourself for an internship screening.', 'Mention branch, skills, learning goal, and availability.'],
        ['Tell me about your academic background.', 'Branch, year, subjects, practical interest.'],
        ['Share your strengths in your introduction.', 'Use one or two strengths with proof.'],
        ['Introduce yourself without reading from resume.', 'Speak naturally with key points.'],
        ['End your introduction with a confident closing line.', 'Show readiness for role and learning.'],
        ['Introduce yourself for a voice interview.', 'Clear, audible, short, and polite.'],
        ['Introduce yourself to a technical panel.', 'Include technical skill and project.']
      ],
      Intermediate: [
        ['Give a self introduction customized for a top recruiter.', 'Align skills and project with company role.'],
        ['Introduce yourself with measurable project impact.', 'Mention outcome, numbers, or improvement.'],
        ['Give a 90-second profile summary.', 'Education, skills, project, internship goal, strength.'],
        ['Introduce yourself after a gap or low score question.', 'Stay positive and redirect to improvement.'],
        ['Make your introduction sound confident but not memorized.', 'Natural tone, concise flow, real examples.'],
        ['Introduce yourself for a technical plus HR panel.', 'Balance technical skills and personality.'],
        ['Start with your strongest placement point.', 'Lead with relevant achievement.'],
        ['Explain your branch choice inside introduction.', 'Connect interest and career path.'],
        ['Introduce yourself and mention teamwork.', 'Include collaboration example.'],
        ['Close introduction by inviting technical questions.', 'Show confidence and readiness.']
      ],
      Advanced: [
        ['Give an executive-style 45-second pitch.', 'Crisp, evidence-based, role-oriented.'],
        ['Introduce yourself for a product or engineering company.', 'Focus on problem solving and impact.'],
        ['Make your introduction suitable for final HR round.', 'Maturity, clarity, goals, company fit.'],
        ['Introduce yourself with leadership evidence.', 'Show initiative and result.'],
        ['Handle interruption during self introduction.', 'Pause, respond, and continue smoothly.'],
        ['Introduce yourself for a high-pressure interview.', 'Calm tone, strong structure, confident ending.'],
        ['Explain your career story from branch to role.', 'Logical journey and future direction.'],
        ['Position yourself as placement-ready.', 'Skills, proof, attitude, and adaptability.'],
        ['Give a self introduction without generic lines.', 'Use specific project and skill evidence.'],
        ['Give a final-round introduction.', 'Professional identity, contribution, long-term fit.']
      ]
    },
    rapid: {
      Beginner: [
        ['Your strongest subject?', 'Name subject and one reason.'],
        ['One technical skill?', 'Name skill and basic use.'],
        ['One strength?', 'Give strength with quick proof.'],
        ['One weakness?', 'Mention improvement action.'],
        ['Favorite project?', 'Name project and role.'],
        ['Preferred company type?', 'Mention learning and domain.'],
        ['Can you work in a team?', 'Yes, with example.'],
        ['Can you relocate?', 'Answer honestly and professionally.'],
        ['What motivates you?', 'Learning and solving real problems.'],
        ['Why {branch}?', 'Interest and career fit.']
      ],
      Intermediate: [
        ['Best project decision?', 'Mention one decision and why.'],
        ['Biggest learning this year?', 'Give skill and application.'],
        ['How do you handle pressure?', 'Plan, prioritize, communicate.'],
        ['One tool you learned fast?', 'Name tool and how.'],
        ['What is your placement goal?', 'Role, company type, growth.'],
        ['What makes you reliable?', 'Consistency and ownership.'],
        ['One technical mistake?', 'Mistake and fix.'],
        ['Team conflict response?', 'Listen and align on facts.'],
        ['How do you improve communication?', 'Practice, feedback, recording.'],
        ['Why internship before job?', 'Practical exposure.']
      ],
      Advanced: [
        ['One leadership proof?', 'Specific action and result.'],
        ['One metric from your project?', 'Performance, cost, users, accuracy, or quality.'],
        ['One risk in your field?', 'Risk and mitigation.'],
        ['Best recruiter for your profile?', 'Company and reason.'],
        ['How will you add value in 30 days?', 'Learn, deliver, communicate.'],
        ['One advanced topic?', 'Topic and roadmap.'],
        ['How do you handle rejection?', 'Review, improve, continue.'],
        ['Why final shortlist?', 'Skills, proof, attitude.'],
        ['One ethical concern?', 'Safety/data/quality honesty.'],
        ['Your closing statement?', 'Confident fit and readiness.']
      ]
    },
    gd: {
      Beginner: [
        ['Open a GD on technology and jobs for freshers.', 'Give balanced opening and one example.'],
        ['Speak for one minute on teamwork in college.', 'Make clear points and conclusion.'],
        ['Agree politely with a teammate and add a point.', 'Acknowledge and extend idea.'],
        ['Disagree politely on a technical topic.', 'Respect, reason, example.'],
        ['Summarize a GD on internship importance.', 'Cover key points and conclusion.'],
        ['Start a GD on AI in education.', 'Opening, benefit, concern, conclusion.'],
        ['Add a branch-specific point in a GD.', 'Connect {branch} to industry example.'],
        ['Handle interruption in GD.', 'Stay calm and continue.'],
        ['Invite a quiet member to speak.', 'Use inclusive language.'],
        ['Close a GD with confidence.', 'Summarize and final view.']
      ],
      Intermediate: [
        ['Lead a GD on campus placements vs higher studies.', 'Balanced view and data-like reasoning.'],
        ['Respond to a strong opposing view.', 'Acknowledge, counter with logic, stay polite.'],
        ['Give a practical industry example from {branch}.', 'Use relevant branch scenario.'],
        ['Structure a GD point in 30 seconds.', 'Point, reason, example, conclusion.'],
        ['Recover after forgetting a point.', 'Pause, reframe, continue.'],
        ['Bring discussion back on track.', 'Summarize and redirect.'],
        ['Compare startup vs MNC for freshers.', 'Learning, stability, role depth.'],
        ['Discuss automation impact in {branch}.', 'Jobs change, skills upgrade, productivity.'],
        ['Show leadership without dominating.', 'Facilitate and add value.'],
        ['End with action-oriented conclusion.', 'State balanced final recommendation.']
      ],
      Advanced: [
        ['Moderate a GD on AI replacing engineers.', 'Balanced, inclusive, structured.'],
        ['Handle aggressive disagreement professionally.', 'Calm tone, facts, respect.'],
        ['Use data-style reasoning without fake numbers.', 'Use trends and logical evidence.'],
        ['Connect {branch} industry challenges to employability.', 'Skill gaps, industry needs, solutions.'],
        ['Summarize conflicting views into one conclusion.', 'Synthesize and close.'],
        ['Challenge a weak argument politely.', 'Ask clarifying question and reason.'],
        ['Show strategic thinking in GD.', 'Long-term impact and practical constraints.'],
        ['Discuss ethics in technology or industry.', 'Safety, data, quality, fairness.'],
        ['Give a final recommendation to recruiters.', 'Clear, practical, confident.'],
        ['Turn a GD into a collaborative solution.', 'Combine views and propose action.']
      ]
    },
    speaking: {
      Beginner: [
        ['Speak for one minute about your {branch} journey.', 'Clear opening, two points, closing.'],
        ['Speak about your dream company.', 'Company reason, role, preparation.'],
        ['Speak about teamwork.', 'Example and learning.'],
        ['Speak about college life and skills.', 'Experience, skill, growth.'],
        ['Speak about your favorite subject.', 'Subject, reason, use.'],
        ['Speak about technology trends.', 'Trend, benefit, concern.'],
        ['Speak about productivity.', 'Habit, example, result.'],
        ['Speak about leadership.', 'Definition and example.'],
        ['Speak about internships.', 'Need, learning, readiness.'],
        ['Speak about communication skills.', 'Importance and practice.']
      ],
      Intermediate: [
        ['Speak for two minutes about future of {subject}.', 'Structured points and example.'],
        ['Explain your project to a non-technical person.', 'Simple words and impact.'],
        ['Speak about placement preparation strategy.', 'Study, practice, mock interviews.'],
        ['Speak about failure and comeback.', 'Story and learning.'],
        ['Speak about innovation in {branch}.', 'Trend and practical use.'],
        ['Speak about problem-solving mindset.', 'Approach and example.'],
        ['Speak about startups vs MNCs.', 'Compare and conclude.'],
        ['Speak about AI impact on engineers.', 'Balanced view.'],
        ['Speak about time management.', 'Plan and evidence.'],
        ['Speak about professional confidence.', 'Voice, clarity, preparation.']
      ],
      Advanced: [
        ['Deliver a three-minute placement pitch.', 'Professional structure and confident close.'],
        ['Explain an industry problem in {branch} and propose a solution.', 'Problem, causes, solution, impact.'],
        ['Speak like a team lead handling a project delay.', 'Ownership and plan.'],
        ['Present your career roadmap.', 'Short, medium, long term.'],
        ['Explain a technical concept to HR.', 'Simple, relevant, confident.'],
        ['Speak about ethics in engineering.', 'Risk, responsibility, action.'],
        ['Defend why communication matters for engineers.', 'Examples and outcomes.'],
        ['Speak about adaptability in placements.', 'Learning and resilience.'],
        ['Give a final interview closing statement.', 'Thank, fit, readiness.'],
        ['Speak about your value to a company.', 'Skills, proof, attitude.']
      ]
    }
  };
  return sets[mode]?.[difficulty] || sets.technical[difficulty] || sets.technical.Beginner;
}

function modeRound(mode) {
  return {
    hr: 'HR Interview',
    technical: 'Technical Round',
    internship: 'Internship Questions',
    introduction: 'Self Introduction',
    rapid: 'Rapid Fire',
    gd: 'Group Discussion',
    speaking: 'Communication Round'
  }[mode] || 'Placement Round';
}

function fillTemplate(value, data) {
  return String(value).replace(/\{(\w+)\}/g, (_, key) => data[key] || '');
}

function formatInterviewQuestion(item, studentName = '', answerCount = 1) {
  const prefix = studentName && answerCount === 0 ? `${studentName}, ` : '';
  return `${prefix}[${item.company} - ${item.round} - ${item.difficulty}] ${item.question}`;
}

function stripNamePrefix(question = '') {
  return question.replace(/^[^[]{1,40},\s*/, '');
}

function q(question, expected_answer, difficulty, company, round) {
  return { question, expected_answer, difficulty, company, round };
}

function difficultyRank(value = '') {
  return { Beginner: 1, Intermediate: 2, Advanced: 3 }[value] || 1;
}

function localFeedback({ question = '', answer = '', answers = [], metrics = {}, mode = 'hr', difficulty = 'Beginner', setup = {} }) {
  const words = String(answer || '').trim().split(/\s+/).filter(Boolean);
  const fillers = Number(metrics.fillers || 0);
  const wpm = Number(metrics.wpm || 0);
  const eye = Number(metrics.eyeContactScore || 0);
  const confidence = Number(metrics.confidenceScore || 0);
  const technicalMode = String(mode).toLowerCase() === 'technical';
  const internshipMode = String(mode).toLowerCase() === 'internship';
  const projectDepth = /\b(architecture|database|api|backend|debug|deploy|auth|security|scal|schema)\b/i.test(answer) ? 12 : 0;

  const strengths = [];
  if (words.length > 35) strengths.push('Good answer length with enough material to evaluate.');
  if (confidence >= 68) strengths.push('Good confidence overall.');
  if (wpm >= 105 && wpm <= 160) strengths.push('Nice speaking pace for interview listening.');
  if (!strengths.length) strengths.push('You completed the answer and stayed engaged with the practice.');

  const improvements = [];
  if (fillers > 4) improvements.push('Avoid using too many filler words; pause silently before the next point.');
  if (eye < 58) improvements.push('Maintain slightly better eye contact with the camera.');
  if (wpm > 165) improvements.push('Slow down a little after important ideas.');
  if (wpm > 0 && wpm < 95) improvements.push('Add a little more vocal energy and pace.');
  if (words.length < 28) improvements.push('Add one real example to make your answer stronger.');
  if (!improvements.length) improvements.push('Keep practicing with the same structure and add measurable details.');

  return {
    summary: `${strengths[0]} ${improvements[0]}`,
    strengths,
    improvementAreas: improvements,
    scores: {
      communicationScore: bounded(confidence * 0.36 + eye * 0.24 + paceScore(wpm) * 0.24 + Math.max(0, 100 - fillers * 6) * 0.16),
      confidenceScore: bounded(confidence || 64),
      technicalKnowledgeScore: bounded(technicalMode ? 58 + Math.min(28, words.length / 3) : 70),
      bodyLanguageScore: bounded(eye * 0.72 + (confidence || 60) * 0.28),
      fluencyScore: bounded(paceScore(wpm) - fillers * 3),
      speakingConsistency: bounded(76 - Math.min(26, Number(metrics.pauseCount || 0) * 5)),
      grammarScore: bounded(82 - Math.min(20, fillers * 2)),
      clarityScore: bounded(78 - Math.max(0, fillers - 2) * 3),
      energyScore: bounded(Number(metrics.volumeLevel || 38) + 34),
      problemSolvingScore: bounded(technicalMode ? 58 + Math.min(22, words.length / 4) + projectDepth : 68 + projectDepth / 2),
      hrReadinessScore: bounded((confidence || 64) * 0.45 + paceScore(wpm) * 0.25 + (words.length > 24 ? 20 : 10)),
      internshipReadinessScore: bounded((technicalMode || internshipMode ? 62 : 70) + Math.min(18, words.length / 5) + projectDepth / 2),
      overallPerformanceScore: bounded((confidence || 64) * 0.3 + paceScore(wpm) * 0.2 + (technicalMode ? 72 : 68) * 0.25 + Math.max(0, 100 - fillers * 6) * 0.25)
    },
    recommendedTopics: recommendedTopics(mode, difficulty),
    motivationalMessage: 'You are building a real interview habit. Small improvements in clarity, examples, and camera presence will compound quickly.',
    nextQuestion: fallbackQuestion({ mode, difficulty, answers: [...answers, { question, answer }], setup })
  };
}

async function askOpenAI(payload) {
  if (!process.env.OPENAI_API_KEY) return null;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'ai_practice_response',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              summary: { type: 'string' },
              strengths: { type: 'array', items: { type: 'string' } },
              improvementAreas: { type: 'array', items: { type: 'string' } },
              recommendedTopics: { type: 'array', items: { type: 'string' } },
              motivationalMessage: { type: 'string' },
              nextQuestion: { type: 'string' },
              scores: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  communicationScore: { type: 'number' },
                  confidenceScore: { type: 'number' },
                  technicalKnowledgeScore: { type: 'number' },
                  bodyLanguageScore: { type: 'number' },
                  fluencyScore: { type: 'number' },
                  speakingConsistency: { type: 'number' },
                  grammarScore: { type: 'number' },
                  clarityScore: { type: 'number' },
                  energyScore: { type: 'number' },
                  problemSolvingScore: { type: 'number' },
                  hrReadinessScore: { type: 'number' },
                  internshipReadinessScore: { type: 'number' },
                  overallPerformanceScore: { type: 'number' }
                },
                required: ['communicationScore', 'confidenceScore', 'technicalKnowledgeScore', 'bodyLanguageScore', 'fluencyScore', 'speakingConsistency', 'grammarScore', 'clarityScore', 'energyScore', 'problemSolvingScore', 'hrReadinessScore', 'internshipReadinessScore', 'overallPerformanceScore']
              }
            },
            required: ['summary', 'strengths', 'improvementAreas', 'recommendedTopics', 'motivationalMessage', 'nextQuestion', 'scores']
          }
        }
      },
      messages: [
        {
          role: 'system',
          content: 'You are a supportive AI technical interviewer and internship mentor for engineering students, comfortable with Indian English phrasing. Personalize questions to domain, technology interest, role, level, resume, projects, communication quality, and previous answers. Ask realistic fresher internship questions, appreciate good answers, guide weak answers gently, increase depth for strong answers, and produce concise JSON only.'
        },
        {
          role: 'user',
          content: JSON.stringify(payload).slice(0, 12000)
        }
      ]
    })
  });

  if (!response.ok) return null;
  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) return null;
  return JSON.parse(text);
}

async function generatePracticeResponse(payload) {
  try {
    const ai = await askOpenAI(payload);
    if (ai) return normalizeFeedback(ai, payload);
  } catch (error) {
    console.warn('AI practice fallback used:', error.message);
  }
  return normalizeFeedback(localFeedback(payload), payload);
}

function normalizeFeedback(feedback, payload) {
  const fallback = localFeedback(payload);
  const scores = { ...fallback.scores, ...(feedback.scores || {}) };
  Object.keys(scores).forEach((key) => {
    scores[key] = bounded(scores[key]);
  });
  return {
    summary: feedback.summary || fallback.summary,
    strengths: cleanList(feedback.strengths, fallback.strengths),
    improvementAreas: cleanList(feedback.improvementAreas, fallback.improvementAreas),
    recommendedTopics: cleanList(feedback.recommendedTopics, fallback.recommendedTopics),
    motivationalMessage: feedback.motivationalMessage || fallback.motivationalMessage,
    nextQuestion: feedback.nextQuestion || fallbackQuestion(payload),
    scores
  };
}

function recommendedTopics(mode, difficulty) {
  if (String(mode).toLowerCase() === 'technical') return ['Project architecture', 'Debugging approach', 'Data structures', 'API design'];
  if (difficulty === 'Advanced') return ['Leadership', 'Startups', 'Technology Trends', 'Innovation'];
  return ['Self Introduction Practice', 'Teamwork', 'Dream Company', 'College Life'];
}

function mentionsProject(text = '') {
  return /\b(project|built|developed|app|website|system|platform|api|database|deployed)\b/i.test(text);
}

function isWeak(text = '') {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length < 22;
}

function performsWell(text = '', experience = '') {
  const wordCount = String(text || '').trim().split(/\s+/).filter(Boolean).length;
  return wordCount > 55 || /advanced|project-ready|intermediate/i.test(experience);
}

function cleanList(value, fallback) {
  const list = Array.isArray(value) ? value.map((item) => String(item || '').trim()).filter(Boolean) : [];
  return list.length ? list.slice(0, 6) : fallback;
}

function paceScore(wpm) {
  if (!wpm) return 62;
  return Math.max(32, Math.min(100, 100 - Math.abs(132 - Number(wpm)) * 0.85));
}

function bounded(value) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function labelMode(mode = '') {
  return String(mode).replace(/-/g, ' ');
}

module.exports = { TOPICS, fallbackQuestion, generatePracticeResponse };
