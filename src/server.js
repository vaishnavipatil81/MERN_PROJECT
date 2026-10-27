const http = require('http');
const app = require('./app');
const connectDB = require('./config/db');
const { configureSocket } = require('./sockets');

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();

  const server = http.createServer(app);
  configureSocket(server);

  server.listen(PORT, () => {
    console.log(`SpeakFlow AI running on http://localhost:${PORT}`);
  });
}

startServer();
