# SpeakFlow AI

SpeakFlow AI is a full-stack realtime public speaking trainer built with vanilla HTML, CSS, JavaScript, Node.js, Express.js, MongoDB, JWT, Socket.io, Chart.js, Cloudinary, Web Speech API, SpeechSynthesis API, and MediaPipe Face Mesh.

## Features

- JWT signup, login, profile updates, and forgot password token flow
- MongoDB storage for users, preferences, uploads, and speech history
- Dark responsive AI-themed dashboard with Chart.js progress charts
- Live practice room with webcam and microphone access
- Realtime speech-to-text using the Web Speech API
- Realtime filler detection for `um`, `uh`, `like`, `aaa`, `basically`, and `literally`
- Spoken coaching using browser SpeechSynthesis
- WPM analyzer with Too Slow, Normal, and Too Fast labels
- MediaPipe Face Mesh eye-contact estimate
- Animated circular confidence meter
- Detailed saved speech report after each practice session
- AI Practice Coach for HR, technical, internship, self-introduction, rapid-fire, speaking, and group discussion rounds
- Adaptive AI interview questions based on branch, domain, role, difficulty, resume context, previous answers, and speaking metrics
- AI feedback reports with communication, confidence, body language, fluency, grammar, clarity, energy, problem-solving, HR readiness, internship readiness, and overall performance scores
- Optional OpenAI-powered feedback with a local rule-based fallback when no API key is configured
- Cloudinary video upload endpoint for uploaded speech analysis
- Socket.io realtime metric feedback between frontend and backend
- Authenticated community with smart suggestions, follow/connect, realtime chat, groups, notifications, and WebRTC practice rooms

## Folder Structure

```txt
speakflow-ai/
  public/
    css/styles.css
    js/api.js
    js/auth.js
    js/analytics.js
    js/app.js
    js/community.js
    js/practice.js
    index.html
  src/
    config/cloudinary.js
    config/db.js
    controllers/authController.js
    controllers/sessionController.js
    controllers/uploadController.js
    controllers/userController.js
    middleware/authMiddleware.js
    middleware/errorMiddleware.js
    models/SpeechSession.js
    models/User.js
    routes/authRoutes.js
    routes/aiPracticeRoutes.js
    routes/sessionRoutes.js
    routes/uploadRoutes.js
    routes/userRoutes.js
    services/aiPracticeService.js
    sockets/index.js
    utils/analysis.js
    utils/seed.js
    utils/token.js
    app.js
    server.js
  package.json
```

## Live Demo Link
https://speakerflow-ai.onrender.com

## Installation

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root:

```powershell
type nul > .env
```

3. Fill `.env`:

```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/speakflow_ai
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5000
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4.1-mini
```

`OPENAI_API_KEY` is optional. If it is not set, AI Practice still works with the built-in local feedback engine.

4. Start MongoDB locally or use MongoDB Atlas.

5. Run the app:

```bash
npm run dev
```

6. Open:

```txt
http://localhost:5000
```

Optional demo data:

```bash
npm run seed
```

Demo account:

```txt
demo@speakflow.ai
password123
```

## Module Guide

### 1. Project Setup

- `package.json` defines Express, Mongoose, JWT, Socket.io, Cloudinary, Multer, security middleware, and Nodemon.
- `src/server.js` starts the HTTP server and attaches Socket.io.
- `src/app.js` mounts APIs and serves the vanilla frontend from `public/`.

### 2. Authentication System

- `src/models/User.js` hashes passwords with bcrypt.
- `src/controllers/authController.js` handles register, login, current user, forgot password, and reset password.
- `src/middleware/authMiddleware.js` protects private routes with JWT.

### 3. Frontend Pages

- `public/js/app.js` implements hash-based routing for Login, Register, Dashboard, Practice Room, Upload Analysis, History, and Profile.
- `public/css/styles.css` provides responsive dark glassmorphism styling and smooth transitions.

### 4. Webcam and Microphone

- `public/js/practice.js` calls `navigator.mediaDevices.getUserMedia({ video: true, audio: true })`.
- The webcam stream is shown in the `#webcam` video element.

### 5. Realtime Speech Recognition

- `SpeechRecognition` or `webkitSpeechRecognition` continuously captures interim and final text.
- The live transcript is updated while the user speaks.

### 6. Filler Word Detection

- `public/js/analytics.js` counts filler words in realtime.
- The transcript renderer wraps fillers in `<span class="filler">`.

### 7. Voice Feedback

- `SpeechSynthesisUtterance` speaks coaching such as “Avoid filler words”, “Speak more confidently”, “Slow down slightly”, and “Maintain eye contact”.
- Feedback is throttled to avoid interrupting the speaker too often.

### 8. AI Practice Coach

- `public/js/practice.js` powers the AI Practice workspace with camera, microphone, transcript, timer, text-answer mode, fullscreen mode, report download, and saved practice sessions.
- Learners can choose HR, technical, internship, self-introduction, rapid-fire, speaking, and group discussion practice modes.
- Practice setup supports student name, engineering branch, domain, technology, target role, difficulty, topic, and resume context.
- `src/routes/aiPracticeRoutes.js` exposes authenticated AI Practice APIs for topics, next questions, and feedback.
- `src/services/aiPracticeService.js` generates adaptive placement-style questions and structured feedback. It can call OpenAI when `OPENAI_API_KEY` is available, then falls back to local scoring if the API is unavailable.
- AI Practice reports include strengths, improvement areas, recommended topics, motivational coaching, next question, progress comparison, and radar-chart scores.

### 9. Dashboard and Analytics

- `/api/sessions/dashboard` returns aggregate stats and progress data.
- Chart.js draws confidence, eye-contact, and filler trends.

### 10. Backend APIs

```txt
POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET  /api/ai-practice/topics
POST /api/ai-practice/question
POST /api/ai-practice/feedback
GET  /api/sessions
POST /api/sessions
GET  /api/sessions/dashboard
GET  /api/sessions/:id
POST /api/uploads/video
PATCH /api/users/me
GET  /api/community/suggestions
POST /api/community/follow/:userId
DELETE /api/community/follow/:userId
POST /api/community/connections/:userId
PATCH /api/community/connections/:id
GET  /api/community/chats
GET  /api/community/groups
POST /api/community/groups
GET  /api/community/notifications
POST /api/community/rooms
```

All community APIs and Socket.io connections require JWT authentication. Non-logged-in users receive `401` and cannot access community data, chats, groups, rooms, profiles, or notifications.

### 11. Deployment

- Use MongoDB Atlas for `MONGO_URI`.
- Use Cloudinary credentials for uploads.
- Add `OPENAI_API_KEY` and `OPENAI_MODEL` on the hosting platform if you want OpenAI-generated AI Practice feedback.
- Set `JWT_SECRET` to a strong random value.
- Deploy the Node app to Render, Railway, Fly.io, or an equivalent Node host.
- Set `CLIENT_URL` to your production domain.
- Because the frontend uses camera, microphone, and SpeechRecognition APIs, production must run over HTTPS.

## Browser Notes

Chrome and Edge provide the most reliable Web Speech API support. MediaPipe and Chart.js load from CDN, so the client needs internet access for those browser libraries unless you self-host them.
