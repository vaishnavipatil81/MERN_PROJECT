const Practice = (() => {
  let stream;
  let recognition;
  let socket;
  let audioContext;
  let analyser;
  let faceMesh;
  let animationId;
  let metricsTimer;
  let startedAt = 0;
  let answerStartedAt = 0;
  let transcript = '';
  let finalTranscript = '';
  let interimTranscript = '';
  let toast = () => {};
  let lastAudioAt = 0;
  let countedPauseAt = 0;
  let pauseCount = 0;
  let eyeSamples = 0;
  let eyeContactSamples = 0;
  let faceMissingSamples = 0;
  let volumeSamples = [];
  let radarChart;
  let selectedMode = 'technical';
  let selectedDifficulty = 'Beginner';
  let currentQuestion = '[TCS - HR Interview - Beginner] Tell me about yourself.';
  let lastFeedback;
  let savedReport;
  let recognitionPaused = false;
  let restartingRecognition = false;
  let aiSpeechUntil = 0;
  let resizeBound = false;
  const questionLimit = 10;
  const answers = [];

  const state = {
    fillerCounts: Analytics.countFillers(''),
    wpm: 0,
    speedLabel: 'Ready',
    confidenceScore: 0,
    eyeContactScore: 0,
    volumeLevel: 0
  };

  const modeLabels = {
    hr: 'HR Interview',
    technical: 'Technical Interview',
    internship: 'Internship Screening',
    speaking: 'Speaking Practice',
    introduction: 'Self Introduction Practice',
    rapid: 'Rapid Fire Round',
    gd: 'Group Discussion Practice'
  };

  function init(showToast) {
    toast = showToast;
    const nameInput = document.getElementById('studentName');
    if (nameInput && !nameInput.value.trim()) nameInput.value = API.getUser()?.name || '';
    bindSetup();
    bindControls();
    bindResizeSync();
    restoreStreak();
    reset();
    renderMetrics();
    loadQuestion(true);
  }

  function bindSetup() {
    document.querySelectorAll('[data-mode]').forEach((button) => {
      button.addEventListener('click', async () => {
        selectedMode = button.dataset.mode;
        document.querySelectorAll('[data-mode]').forEach((item) => item.classList.toggle('active', item === button));
        toggleTechnicalSetup();
        await loadQuestion(true);
        setCoach('Mode updated', `${modeLabels[selectedMode]} is ready. I will adapt the next question to your answers.`);
      });
    });

    document.querySelectorAll('[data-difficulty]').forEach((button) => {
      button.addEventListener('click', async () => {
        selectedDifficulty = button.dataset.difficulty;
        document.querySelectorAll('[data-difficulty]').forEach((item) => item.classList.toggle('active', item === button));
        await loadQuestion(true);
      });
    });

    ['studentName', 'engineeringBranch', 'practiceTopic', 'resumeContext'].forEach((id) => {
      const input = document.getElementById(id);
      input?.addEventListener('change', () => loadQuestion(true));
      input?.addEventListener('input', debounce(() => loadQuestion(true), 350));
    });
    toggleTechnicalSetup();
  }

  function bindControls() {
    document.getElementById('startPractice')?.addEventListener('click', start);
    document.getElementById('stopPractice')?.addEventListener('click', stopAndSave);
    document.getElementById('nextQuestion')?.addEventListener('click', nextQuestion);
    document.getElementById('fullscreenPractice')?.addEventListener('click', () => {
      document.getElementById('aiPracticeWorkspace')?.requestFullscreen?.();
    });
    document.getElementById('themeToggle')?.addEventListener('click', () => {
      const enabled = document.body.classList.toggle('light-mode');
      setText('themeToggle', enabled ? 'Dark Mode' : 'Light Mode');
    });
    document.getElementById('downloadReport')?.addEventListener('click', downloadReport);
    document.getElementById('answerForm')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      await finishAnswer();
    });
  }

  function bindResizeSync() {
    if (resizeBound) return;
    resizeBound = true;
    window.addEventListener('resize', debounce(syncReportMemoryHeight, 120));
  }

  async function start() {
    const nameInput = document.getElementById('studentName');
    if (!nameInput?.value.trim()) {
      toast('Please enter your name before starting the interview.');
      nameInput?.focus();
      return;
    }
    reset();
    await loadQuestion(true);
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      const video = document.getElementById('webcam');
      video.srcObject = stream;
      await video.play();
      document.getElementById('cameraPlaceholder')?.classList.add('hidden');
      setupAudio();
      startSocket();
      startSpeechRecognition();
      startEyeTracking(video);
      startedAt = Date.now();
      answerStartedAt = Date.now();
      lastAudioAt = Date.now();
      metricsTimer = setInterval(updateMetrics, 1000);
      animationId = requestAnimationFrame(analyzeFrame);
      setLive(true);
      speak(`Welcome to ${modeLabels[selectedMode]}. I will ask one question at a time. Take your time.`);
      setCoach(
        'Listening',
        `Personalized for ${interviewSetup().studentName}, ${interviewSetup().branch}, ${selectedDifficulty}. I will ask 10 realistic placement questions one by one.`
      );
      toast('AI Practice started.');
    } catch (error) {
      setCoach('Permission needed', 'Camera or microphone access was blocked. You can still type answers and submit feedback.');
      setLive(true, true);
      startedAt = Date.now();
      answerStartedAt = Date.now();
      metricsTimer = setInterval(updateMetrics, 1000);
      toast(error.message || 'Camera or microphone permission was blocked.');
    }
  }

  function reset() {
    stop(false);
    answers.length = 0;
    transcript = '';
    finalTranscript = '';
    interimTranscript = '';
    lastFeedback = undefined;
    savedReport = undefined;
    startedAt = 0;
    answerStartedAt = 0;
    pauseCount = 0;
    countedPauseAt = 0;
    eyeSamples = 0;
    eyeContactSamples = 0;
    faceMissingSamples = 0;
    volumeSamples = [];
    Object.assign(state, {
      fillerCounts: Analytics.countFillers(''),
      wpm: 0,
      speedLabel: 'Ready',
      confidenceScore: 0,
      eyeContactScore: 0,
      volumeLevel: 0
    });
    setText('questionCounter', '1');
    setText('questionLimit', questionLimit);
    setText('timer', '00:00');
    setText('wordTotal', '0 words');
    setText('transcript', 'Your answer transcript and session memory will appear here.');
    syncReportMemoryHeight();
    const input = document.getElementById('answerInput');
    if (input) input.value = '';
    const report = document.getElementById('report');
    if (report) report.innerHTML = '';
    const roadmap = document.getElementById('roadmapList');
    if (roadmap) roadmap.innerHTML = '<strong>Improvement roadmap</strong><p class="muted">Complete a session to generate your roadmap.</p>';
    document.getElementById('downloadReport')?.setAttribute('disabled', '');
    drawRadar(defaultScores());
    renderMetrics();
    setLive(false);
  }

  async function loadQuestion(force = false) {
    if (!force && answers.length) return;
    try {
      const data = await API.request('/api/ai-practice/question', {
        method: 'POST',
        body: JSON.stringify(questionPayload())
      });
      currentQuestion = data.question || currentQuestion;
    } catch (error) {
      currentQuestion = fallbackQuestion();
    }
    setText('questionText', currentQuestion);
  }

  function setupAudio() {
    audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
  }

  function startSocket() {
    socket = io({ auth: { token: API.getToken() } });
    socket.on('practice:feedback', (serverMetrics) => {
      Object.assign(state, serverMetrics);
      renderMetrics();
    });
  }

  function startSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setCoach('Text mode available', 'Speech recognition is not available in this browser. You can type your answer and still use camera analysis.');
      return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';
    recognition.onresult = (event) => {
      interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const text = cleanText(event.results[i][0].transcript);
        if (!text) continue;
        if (recognitionPaused || Date.now() < aiSpeechUntil || isLikelyAiSpeech(text)) continue;
        if (event.results[i].isFinal) finalTranscript = cleanText(finalTranscript + ' ' + text);
        else interimTranscript = cleanText(interimTranscript + ' ' + text);
      }
      transcript = cleanText(finalTranscript + ' ' + interimTranscript);
      if (transcript) lastAudioAt = Date.now();
      const input = document.getElementById('answerInput');
      if (input && document.activeElement !== input) input.value = transcript;
      renderTranscript();
      updateMetrics();
    };
    recognition.onerror = (event) => {
      if (event.error !== 'no-speech') toast('Speech recognition: ' + event.error);
    };
    recognition.onend = () => {
      if (stream && recognition && !recognitionPaused) {
        try {
          restartingRecognition = true;
          recognition.start();
          setTimeout(() => {
            restartingRecognition = false;
          }, 250);
        } catch (error) {
          if (!restartingRecognition) console.warn('Speech recognition restart skipped', error);
        }
      }
    };
    recognition.start();
  }

  async function startEyeTracking(video) {
    if (!window.FaceMesh) {
      state.eyeContactScore = 65;
      setText('cameraStatus', 'Camera active');
      return;
    }
    faceMesh = new FaceMesh({
      locateFile: (file) => 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/' + file
    });
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });
    faceMesh.onResults(onFaceResults);
  }

  async function analyzeFrame() {
    if (!stream) return;
    readVolume();
    const video = document.getElementById('webcam');
    if (faceMesh && video?.readyState >= 2) {
      try {
        await faceMesh.send({ image: video });
      } catch (error) {
        console.warn('Face tracking skipped', error);
      }
    }
    animationId = requestAnimationFrame(analyzeFrame);
  }

  function onFaceResults(results) {
    eyeSamples += 1;
    const landmarks = results.multiFaceLandmarks?.[0];
    if (!landmarks) {
      faceMissingSamples += 1;
      state.eyeContactScore = Math.round((eyeContactSamples / Math.max(eyeSamples, 1)) * 100);
      setText('cameraStatus', 'Face not clear');
      return;
    }
    faceMissingSamples = 0;
    setText('cameraStatus', 'Camera active');
    const nose = landmarks[1];
    const shoulderProxy = landmarks[152];
    const lookingForward = nose.x > 0.38 && nose.x < 0.62 && nose.y > 0.22 && nose.y < 0.72;
    const upright = !shoulderProxy || shoulderProxy.y > nose.y + 0.16;
    if (lookingForward && upright) eyeContactSamples += 1;
    state.eyeContactScore = Math.round((eyeContactSamples / Math.max(eyeSamples, 1)) * 100);
  }

  function readVolume() {
    if (!analyser) return 0;
    const data = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (const value of data) {
      const normalized = (value - 128) / 128;
      sum += normalized * normalized;
    }
    const rms = Math.sqrt(sum / data.length);
    const level = Math.min(100, Math.round(rms * 340));
    state.volumeLevel = level;
    volumeSamples.push(level);
    if (volumeSamples.length > 500) volumeSamples.shift();
    if (level > 8) lastAudioAt = Date.now();
    const meter = document.getElementById('voiceLevel');
    if (meter) meter.value = level;
    document.getElementById('micWaveform')?.style.setProperty('--level', Math.max(8, level));
    setText('audioStatus', level > 14 ? 'Audio clear' : level > 5 ? 'Audio low' : 'Audio quiet');
    return level;
  }

  function updateMetrics() {
    if (!startedAt) return;
    const answerText = currentAnswerText();
    const silenceMs = Date.now() - lastAudioAt;
    if (silenceMs > 5500 && Date.now() - countedPauseAt > 6000) {
      pauseCount += 1;
      countedPauseAt = Date.now();
    }
    state.fillerCounts = Analytics.countFillers(answerText);
    state.wpm = Analytics.calculateWpm(answerText, answerStartedAt || startedAt);
    state.speedLabel = Analytics.speedLabel(state.wpm);
    state.confidenceScore = Analytics.confidence({
      fillerCounts: state.fillerCounts,
      wpm: state.wpm,
      eyeContactScore: state.eyeContactScore,
      pauseCount
    });
    socket?.emit('practice:metrics', {
      transcript: answerText,
      fillerCounts: state.fillerCounts,
      wpm: state.wpm,
      eyeContactScore: state.eyeContactScore,
      pauseCount
    });
    renderMetrics();
    renderTranscript();
  }

  async function finishAnswer() {
    if (!startedAt) {
      startedAt = Date.now();
      answerStartedAt = Date.now() - 45000;
      setLive(true, true);
    }
    const answer = currentAnswerText();
    if (!answer || answer.split(/\s+/).length < 4) {
      toast('Add a little more to your answer before finishing.');
      return;
    }
    document.getElementById('submitAnswer').disabled = true;
    setCoach('Analyzing answer', 'I am reviewing strengths first, then one or two focused improvements.');
    const metrics = currentMetrics();
    try {
      const data = await API.request('/api/ai-practice/feedback', {
        method: 'POST',
        body: JSON.stringify({
          ...questionPayload(),
          question: currentQuestion,
          answer,
          metrics
        })
      });
      lastFeedback = data.feedback;
    } catch (error) {
      lastFeedback = localFeedback(answer, metrics);
      toast('Using offline mentor feedback.');
    }
    answers.push({
      question: currentQuestion,
      answer,
      metrics,
      feedback: lastFeedback,
      createdAt: new Date().toISOString()
    });
    renderTranscript();
    renderReport(buildReport(false));
    setCoach('Feedback ready', lastFeedback.summary);
    speak(lastFeedback.summary);
    document.getElementById('nextQuestion').disabled = answers.length >= questionLimit;
    document.getElementById('submitAnswer').disabled = false;
    if (answers.length >= questionLimit) await stopAndSave(true, true);
  }

  async function nextQuestion() {
    if (!lastFeedback?.nextQuestion) await loadQuestion(true);
    currentQuestion = lastFeedback?.nextQuestion || fallbackQuestion();
    finalTranscript = '';
    interimTranscript = '';
    transcript = '';
    answerStartedAt = Date.now();
    pauseCount = 0;
    countedPauseAt = 0;
    const input = document.getElementById('answerInput');
    if (input) input.value = '';
    setText('questionCounter', Math.min(answers.length + 1, questionLimit));
    setText('questionText', currentQuestion);
    document.getElementById('nextQuestion').disabled = true;
    setCoach('Next question', 'Take a breath, answer naturally, and use a real example if possible.');
    speak(currentQuestion);
  }

  async function stopAndSave(save = true, clearAfterSave = false) {
    if (!startedAt && save !== false) return;
    const report = buildReport(true);
    stop(false);
    setLive(false);
    renderReport(report);
    savedReport = report;
    document.getElementById('downloadReport')?.removeAttribute('disabled');
    if (!save) return;
    try {
      await API.request('/api/sessions', {
        method: 'POST',
        body: JSON.stringify(report)
      });
      updateStreak();
      toast('AI Practice report saved.');
      if (clearAfterSave) resetAfterSavedInterview();
    } catch (error) {
      toast(error.message);
    }
  }

  function resetAfterSavedInterview() {
    const name = document.getElementById('studentName')?.value || '';
    const branch = document.getElementById('engineeringBranch')?.value || '';
    reset();
    if (document.getElementById('studentName')) document.getElementById('studentName').value = name;
    if (branch && document.getElementById('engineeringBranch')) document.getElementById('engineeringBranch').value = branch;
    setCoach('Interview saved', 'Your 10-question report is saved in History. Start again when you are ready.');
    loadQuestion(true);
  }

  function stop(updateUi = true) {
    clearInterval(metricsTimer);
    metricsTimer = undefined;
    cancelAnimationFrame(animationId);
    socket?.disconnect();
    socket = undefined;
    faceMesh = undefined;
    const activeRecognition = recognition;
    recognition = undefined;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = undefined;
    }
    if (audioContext) {
      audioContext.close();
      audioContext = undefined;
    }
    activeRecognition?.stop();
    window.speechSynthesis?.cancel();
    if (updateUi) {
      document.getElementById('cameraPlaceholder')?.classList.remove('hidden');
      setText('cameraStatus', 'Camera idle');
      setText('audioStatus', 'Mic idle');
    }
  }

  function buildReport(final = false) {
    const answerText = answers.map((item, index) => `Q${index + 1}: ${item.question}\nA: ${item.answer}`).join('\n\n') || currentAnswerText();
    const latest = lastFeedback || localFeedback(answerText, currentMetrics());
    const scores = latest.scores || defaultScores();
    const durationSeconds = startedAt ? Math.round((Date.now() - startedAt) / 1000) : 0;
    const fillerCounts = answers.reduce((acc, item) => mergeFillers(acc, item.metrics.fillerCounts), Analytics.countFillers(currentAnswerText()));
    const roadmap = [
      'Practice one structured answer daily using situation, action, result, learning.',
      'Record one 90-second self introduction and compare confidence and filler count.',
      'Add one project or real example to every interview answer.',
      'Review eye contact and pace after each saved session.'
    ];
    return {
      title: `${modeLabels[selectedMode]} - ${selectedDifficulty} AI Practice`,
      source: selectedMode === 'speaking' ? 'speaking-practice' : 'ai-practice',
      mode: modeLabels[selectedMode],
      difficulty: selectedDifficulty,
      transcript: answerText,
      durationSeconds,
      questionCount: answers.length || 1,
      wpm: state.wpm,
      speedLabel: state.speedLabel === 'Ready' ? 'Normal' : state.speedLabel,
      confidenceScore: scores.confidenceScore,
      eyeContactScore: state.eyeContactScore || scores.bodyLanguageScore,
      communicationScore: scores.communicationScore,
      technicalKnowledgeScore: scores.technicalKnowledgeScore,
      bodyLanguageScore: scores.bodyLanguageScore,
      fluencyScore: scores.fluencyScore,
      speakingConsistency: scores.speakingConsistency,
      grammarScore: scores.grammarScore,
      clarityScore: scores.clarityScore,
      energyScore: scores.energyScore,
      problemSolvingScore: scores.problemSolvingScore,
      hrReadinessScore: scores.hrReadinessScore,
      internshipReadinessScore: scores.internshipReadinessScore,
      overallPerformanceScore: scores.overallPerformanceScore,
      fillerCounts,
      strengths: latest.strengths || [],
      improvementAreas: latest.improvementAreas || [],
      recommendedTopics: latest.recommendedTopics || [],
      motivationalMessage: latest.motivationalMessage || '',
      roadmap,
      suggestions: [
        `Strengths: ${(latest.strengths || []).join(' ')}`,
        `Improvement areas: ${(latest.improvementAreas || []).join(' ')}`,
        latest.motivationalMessage || ''
      ].filter(Boolean),
      aiPracticeMeta: {
        mode: selectedMode,
        setup: interviewSetup(),
        final,
        answers,
        progressComparison: progressComparison(scores.communicationScore)
      }
    };
  }

  function renderReport(report) {
    const el = document.getElementById('report');
    if (!el) return;
    const scores = defaultScores(report);
    el.innerHTML = `
      ${scoreTile('Communication Score', scores.communicationScore)}
      ${scoreTile('Confidence Score', scores.confidenceScore)}
      ${scoreTile('Technical Knowledge', scores.technicalKnowledgeScore)}
      ${scoreTile('Problem Solving', scores.problemSolvingScore)}
      ${scoreTile('HR Readiness', scores.hrReadinessScore)}
      ${scoreTile('Internship Readiness', scores.internshipReadinessScore)}
      ${scoreTile('Overall Performance', scores.overallPerformanceScore)}
      <div class="summary-tile wide"><span>Strengths</span><p>${escapeHtml((report.strengths || []).join(' ') || 'Good confidence overall.')}</p></div>
      <div class="summary-tile wide"><span>Improvement Areas</span><p>${escapeHtml((report.improvementAreas || []).join(' ') || 'Add real examples and maintain slightly better eye contact.')}</p></div>
      <div class="summary-tile wide"><span>Recommended Topics</span><p>${escapeHtml((report.recommendedTopics || []).join(', ') || 'Self Introduction, Teamwork, Dream Company')}</p></div>
      <div class="summary-tile wide"><span>AI Mentor Message</span><p>${escapeHtml(report.motivationalMessage || 'You are improving through repetition. Keep going with steady practice.')}</p></div>
      <div class="summary-tile wide"><span>Progress Comparison</span><p>${escapeHtml(report.aiPracticeMeta?.progressComparison || progressComparison(scores.communicationScore))}</p></div>
    `;
    drawRadar(scores);
    renderRoadmap(report.roadmap || []);
    syncReportMemoryHeight();
  }

  function renderRoadmap(roadmap) {
    const el = document.getElementById('roadmapList');
    if (!el) return;
    el.innerHTML = `
      <strong>Improvement roadmap</strong>
      ${roadmap.map((item, index) => `<div class="roadmap-step"><span>${index + 1}</span><p>${escapeHtml(item)}</p></div>`).join('')}
    `;
  }

  function drawRadar(scores) {
    if (!window.Chart || !document.getElementById('practiceRadarChart')) return;
    radarChart?.destroy();
    radarChart = new Chart(document.getElementById('practiceRadarChart'), {
      type: 'radar',
      data: {
        labels: ['Technical', 'Communication', 'Confidence', 'Problem Solving', 'HR Ready', 'Intern Ready'],
        datasets: [{
          label: 'AI Practice score',
          data: [
            scores.technicalKnowledgeScore,
            scores.communicationScore,
            scores.confidenceScore,
            scores.problemSolvingScore,
            scores.hrReadinessScore,
            scores.internshipReadinessScore
          ],
          borderColor: '#36f2c9',
          backgroundColor: 'rgba(54, 242, 201, 0.18)',
          pointBackgroundColor: '#ff7a59'
        }]
      },
      options: {
        scales: {
          r: {
            min: 0,
            max: 100,
            ticks: { color: '#b6c4df', backdropColor: 'transparent' },
            grid: { color: 'rgba(148, 163, 184, 0.2)' },
            pointLabels: { color: '#f7fbff' }
          }
        },
        plugins: { legend: { labels: { color: '#c8d4ec' } } }
      }
    });
  }

  function renderTranscript() {
    const live = currentAnswerText();
    const memory = answers
      .map((item, index) => `<article class="memory-item"><strong>Q${index + 1}. ${escapeHtml(item.question)}</strong><p>${escapeHtml(item.answer)}</p><small>${escapeHtml(item.feedback?.summary || '')}</small></article>`)
      .join('');
    setHtml('transcript', `${memory}${live ? `<article class="memory-item active"><strong>Current answer</strong><p>${highlightFillers(live)}</p></article>` : answers.length ? '' : 'Your answer transcript and session memory will appear here.'}`);
    setText('wordTotal', `${live.split(/\s+/).filter(Boolean).length} words`);
    syncReportMemoryHeight();
  }

  function syncReportMemoryHeight() {
    requestAnimationFrame(() => {
      const grid = document.querySelector('.practice-report-grid');
      const panels = grid ? Array.from(grid.querySelectorAll(':scope > .panel')) : [];
      panels.forEach((panel) => {
        panel.style.height = '';
        panel.style.minHeight = '';
      });
    });
  }

  function renderMetrics() {
    setText('wpm', state.wpm);
    setText('speedLabel', state.speedLabel);
    setText('fillerTotal', Analytics.totalFillers(state.fillerCounts));
    setText('eyeContact', state.eyeContactScore + '%');
    setText('pauseTotal', pauseCount);
    setText('timer', startedAt ? formatTime(Date.now() - startedAt) : '00:00');
    const meter = document.getElementById('confidenceMeter');
    if (meter) {
      meter.dataset.score = state.confidenceScore;
      meter.style.setProperty('--score', state.confidenceScore);
    }
  }

  function currentAnswerText() {
    return cleanText(document.getElementById('answerInput')?.value || transcript);
  }

  function currentMetrics() {
    updateMetrics();
    return {
      fillerCounts: state.fillerCounts,
      fillers: Analytics.totalFillers(state.fillerCounts),
      wpm: state.wpm,
      speedLabel: state.speedLabel,
      confidenceScore: state.confidenceScore,
      eyeContactScore: state.eyeContactScore,
      pauseCount,
      volumeLevel: Math.round(average(volumeSamples)),
      faceMissingSamples
    };
  }

  function questionPayload() {
    return {
      mode: selectedMode,
      difficulty: selectedDifficulty,
      answers,
      topic: document.getElementById('practiceTopic')?.value.trim(),
      resumeText: document.getElementById('resumeContext')?.value.trim(),
      setup: interviewSetup()
    };
  }

  function fallbackQuestion() {
    if (selectedMode === 'speaking') return `Speak for 1-3 minutes on ${document.getElementById('practiceTopic')?.value.trim() || 'AI Future'}. Use one example and a confident conclusion.`;
    if (selectedMode === 'technical') return `For ${interviewSetup().domain}, explain one project or concept that matches a ${interviewSetup().role} interview. Include your logic and one challenge.`;
    if (selectedMode === 'internship') return `For a ${interviewSetup().role} screening, introduce your strongest project and explain why you are ready for this internship.`;
    if (selectedMode === 'gd') return 'Start a group discussion with a clear opening view and one supporting example.';
    return 'Tell me about yourself in a way that would interest an internship recruiter.';
  }

  function localFeedback(answer, metrics) {
    const fillers = Number(metrics.fillers || 0);
    const strengths = [
      metrics.confidenceScore >= 65 ? 'Good confidence overall.' : 'You completed the answer with a clear attempt.',
      answer.split(/\s+/).length > 35 ? 'Nice explanation structure.' : 'Your answer has a simple, easy-to-follow start.'
    ];
    const improvementAreas = [
      metrics.eyeContactScore < 60 ? 'Maintain slightly better eye contact.' : 'Keep the same camera presence.',
      fillers > 3 ? 'Avoid using too many filler words.' : 'Adding real examples would improve your answer.'
    ];
    return {
      summary: `${strengths[0]} ${improvementAreas[0]}`,
      strengths,
      improvementAreas,
      recommendedTopics: ['Self Introduction Practice', 'Teamwork', 'Dream Company'],
      motivationalMessage: 'You are getting more interview-ready with every completed answer.',
      nextQuestion: answer.length > 80 ? smartLocalFollowUp(answer) : fallbackQuestion(),
      scores: defaultScores()
    };
  }

  function defaultScores(report = {}) {
    const technicalBase = Number(report.technicalKnowledgeScore || lastFeedback?.scores?.technicalKnowledgeScore || (selectedMode === 'technical' ? 66 : 72));
    const communicationBase = Number(report.communicationScore || lastFeedback?.scores?.communicationScore || state.confidenceScore || 62);
    const confidenceBase = Number(report.confidenceScore || lastFeedback?.scores?.confidenceScore || state.confidenceScore || 62);
    const problemBase = Number(report.problemSolvingScore || lastFeedback?.scores?.problemSolvingScore || Math.round((technicalBase + communicationBase) / 2));
    const hrBase = Number(report.hrReadinessScore || lastFeedback?.scores?.hrReadinessScore || Math.round((communicationBase + confidenceBase) / 2));
    const internBase = Number(report.internshipReadinessScore || lastFeedback?.scores?.internshipReadinessScore || Math.round((technicalBase + hrBase + problemBase) / 3));
    return {
      communicationScore: communicationBase,
      confidenceScore: confidenceBase,
      technicalKnowledgeScore: technicalBase,
      bodyLanguageScore: Number(report.bodyLanguageScore || lastFeedback?.scores?.bodyLanguageScore || state.eyeContactScore || 60),
      fluencyScore: Number(report.fluencyScore || lastFeedback?.scores?.fluencyScore || 64),
      speakingConsistency: Number(report.speakingConsistency || lastFeedback?.scores?.speakingConsistency || 68),
      grammarScore: Number(report.grammarScore || lastFeedback?.scores?.grammarScore || 76),
      clarityScore: Number(report.clarityScore || lastFeedback?.scores?.clarityScore || 72),
      energyScore: Number(report.energyScore || lastFeedback?.scores?.energyScore || 70),
      problemSolvingScore: problemBase,
      hrReadinessScore: hrBase,
      internshipReadinessScore: internBase,
      overallPerformanceScore: Number(report.overallPerformanceScore || lastFeedback?.scores?.overallPerformanceScore || Math.round((technicalBase + communicationBase + confidenceBase + problemBase + hrBase + internBase) / 6))
    };
  }

  function interviewSetup() {
    const isTechnicalFlow = selectedMode === 'technical' || selectedMode === 'internship';
    const branch = document.getElementById('engineeringBranch')?.value || 'Computer Science Engineering (CSE)';
    const softwareBranch = /computer|information|ai & data/i.test(branch);
    return {
      isTechnicalFlow,
      studentName: document.getElementById('studentName')?.value.trim() || API.getUser()?.name || 'Student',
      branch,
      domain: softwareBranch ? 'Placement Software Fundamentals' : 'Core Engineering Fundamentals',
      technology: softwareBranch ? 'Programming, DSA, DBMS, OOP, OS, CN, Web, Projects' : 'Core fundamentals, industrial applications, troubleshooting, safety, projects',
      role: selectedMode === 'internship' ? 'Engineering Intern' : 'Placement Candidate',
      experience: selectedDifficulty
    };
  }

  function toggleTechnicalSetup() {
    const setup = document.getElementById('technicalSetup');
    if (setup) setup.hidden = false;
  }

  function smartLocalFollowUp(answer) {
    const setup = interviewSetup();
    if (/\b(project|built|developed|app|platform|website)\b/i.test(answer)) {
      return 'Good. Now explain the architecture of that project: frontend, backend, database decisions, APIs used, and one challenge you debugged.';
    }
    if (/mern|react|node|express|mongo|api/i.test(`${setup.domain} ${answer}`)) {
      return 'Nice. How did you handle API calls, authentication, state management, and error handling in your MERN project?';
    }
    if (/ai|ml|machine|model|dataset|python/i.test(`${setup.domain} ${answer}`)) {
      return 'Good start. Explain your dataset, model choice, training process, and how you handled overfitting or evaluation.';
    }
    if (/java|spring|oop|collection|thread/i.test(`${setup.domain} ${answer}`)) {
      return 'Good. Explain one OOP concept with a Java example, then connect it to a real project or Spring Boot use case.';
    }
    return `Good. Can you explain this with a real ${setup.role} project example and one decision you personally made?`;
  }

  function debounce(callback, wait) {
    let timer;
    return () => {
      clearTimeout(timer);
      timer = setTimeout(callback, wait);
    };
  }

  function scoreTile(label, score) {
    return `<div class="summary-tile"><span>${escapeHtml(label)}</span><strong>${Math.round(Number(score) || 0)}%</strong><div class="progress-line"><i style="width:${Math.round(Number(score) || 0)}%"></i></div></div>`;
  }

  function setLive(isLive, textOnly = false) {
    document.getElementById('liveDot')?.classList.toggle('live', isLive);
    setText('practiceStatus', isLive ? (textOnly ? 'Text mode active' : 'Listening and analyzing') : 'AI mentor ready');
    const startBtn = document.getElementById('startPractice');
    const stopBtn = document.getElementById('stopPractice');
    if (startBtn) startBtn.disabled = isLive;
    if (stopBtn) stopBtn.disabled = !isLive;
  }

  function setCoach(mode, message) {
    setText('coachMode', mode);
    setText('coachMessage', message);
  }

  function speak(message) {
    if (!window.speechSynthesis || API.getUser()?.preferences?.voiceFeedback === false) return;
    pauseRecognition();
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    const voices = window.speechSynthesis.getVoices?.() || [];
    utterance.voice = voices.find((voice) => /en-IN/i.test(voice.lang)) || voices.find((voice) => /India|Indian/i.test(voice.name)) || null;
    utterance.lang = utterance.voice?.lang || 'en-IN';
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 0.9;
    aiSpeechUntil = Date.now() + Math.max(1800, message.length * 65);
    utterance.onend = () => {
      aiSpeechUntil = Date.now() + 650;
      setTimeout(resumeRecognition, 700);
    };
    utterance.onerror = () => {
      aiSpeechUntil = Date.now() + 400;
      setTimeout(resumeRecognition, 450);
    };
    window.speechSynthesis.speak(utterance);
  }

  function pauseRecognition() {
    if (!recognition) return;
    recognitionPaused = true;
    try {
      recognition.stop();
    } catch (error) {
      console.warn('Speech recognition pause skipped', error);
    }
  }

  function resumeRecognition() {
    if (!stream || !recognition) return;
    recognitionPaused = false;
    try {
      recognition.start();
    } catch (error) {
      console.warn('Speech recognition resume skipped', error);
    }
  }

  function updateStreak() {
    const key = `speakflow_streak_${API.getUser()?._id || 'guest'}`;
    const today = new Date().toDateString();
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    const streak = data.date === today ? data.streak || 1 : data.date === yesterday ? Number(data.streak || 0) + 1 : 1;
    localStorage.setItem(key, JSON.stringify({ date: today, streak }));
    restoreStreak();
  }

  function restoreStreak() {
    const key = `speakflow_streak_${API.getUser()?._id || 'guest'}`;
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    const streak = data.date === new Date().toDateString() ? Number(data.streak || 0) : 0;
    setText('practiceStreak', streak);
    setText('practiceRank', streak >= 7 ? 'Focused' : streak >= 3 ? 'Building' : 'Rising');
    setText('dailyChallenge', dailyChallenge());
  }

  function dailyChallenge() {
    const topics = ['AI Future', 'Dream Company', 'Leadership', 'Teamwork', 'Technology Trends', 'Innovation'];
    return `Speak for two minutes on ${topics[new Date().getDate() % topics.length]} with one real example.`;
  }

  function progressComparison(score) {
    const previous = Number(localStorage.getItem('speakflow_last_ai_score') || 0);
    localStorage.setItem('speakflow_last_ai_score', String(Math.round(score || 0)));
    if (!previous) return 'This is your first AI Practice baseline. Future reports will compare against it.';
    const diff = Math.round(score - previous);
    if (diff > 0) return `Improved by ${diff} points compared with your previous AI Practice session.`;
    if (diff < 0) return `Down by ${Math.abs(diff)} points from the previous session. Use the roadmap and try again tomorrow.`;
    return 'Stable compared with your previous session. Aim for one clearer example next time.';
  }

  function downloadReport() {
    if (!savedReport) savedReport = buildReport(true);
    const text = [
      savedReport.title,
      `Mode: ${savedReport.mode}`,
      `Difficulty: ${savedReport.difficulty}`,
      `Communication Score: ${savedReport.communicationScore}%`,
      `Confidence Score: ${savedReport.confidenceScore}%`,
      `Technical Knowledge Score: ${savedReport.technicalKnowledgeScore}%`,
      `Body Language Score: ${savedReport.bodyLanguageScore}%`,
      '',
      'Strengths:',
      ...(savedReport.strengths || []),
      '',
      'Improvement Areas:',
      ...(savedReport.improvementAreas || []),
      '',
      'Recommended Topics:',
      ...(savedReport.recommendedTopics || []),
      '',
      'Transcript:',
      savedReport.transcript
    ].join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ai-practice-report-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  function mergeFillers(a, b = {}) {
    const result = { ...a };
    Object.keys(b).forEach((key) => {
      result[key] = Number(result[key] || 0) + Number(b[key] || 0);
    });
    return result;
  }

  function highlightFillers(value) {
    return escapeHtml(value).replace(/\b(um|uh|like|aaa|basically|literally)\b/gi, '<span class="filler">$1</span>');
  }

  function average(values) {
    if (!values.length) return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
  }

  function formatTime(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    return String(Math.floor(total / 60)).padStart(2, '0') + ':' + String(total % 60).padStart(2, '0');
  }

  function cleanText(value = '') {
    return value.replace(/\s+/g, ' ').trim();
  }

  function isLikelyAiSpeech(text = '') {
    const normalized = cleanText(text).toLowerCase();
    const question = cleanText(currentQuestion).toLowerCase();
    const feedback = cleanText(lastFeedback?.summary || '').toLowerCase();
    if (!normalized) return false;
    if (question && (question.includes(normalized) || normalized.includes(question.slice(0, 50)))) return true;
    if (feedback && (feedback.includes(normalized) || normalized.includes(feedback.slice(0, 45)))) return true;
    return /^(welcome to|take your time|good explanation|nice understanding|next question|good confidence|maintain slightly better eye contact)/i.test(normalized);
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function setHtml(id, value) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = value;
  }

  function escapeHtml(value = '') {
    const div = document.createElement('div');
    div.textContent = value;
    return div.innerHTML;
  }

  return { init, stop };
})();
