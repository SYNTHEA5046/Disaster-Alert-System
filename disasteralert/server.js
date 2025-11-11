const express = require("express");
const fs = require("fs");
const http = require("http");
const { Server } = require("socket.io");
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server);

app.get("/alerts", (req, res) => {
  const alerts = JSON.parse(fs.readFileSync("alerts.json"));
  res.json(alerts);
});

// Locations endpoints for map-based monitoring (stored in locations.json)
app.get('/locations', (req, res) => {
  let locs = [];
  try { locs = JSON.parse(fs.readFileSync('locations.json')); } catch (e) { locs = []; }
  res.json(locs);
});

app.post('/locations', (req, res) => {
  const { lat, lon, name } = req.body;
  if (!lat || !lon) return res.status(400).json({ error: 'lat and lon required' });
  let locs = [];
  try { locs = JSON.parse(fs.readFileSync('locations.json')); if (!Array.isArray(locs)) locs = []; } catch (e) { locs = []; }
  const newLoc = { lat: Number(lat), lon: Number(lon), name: name || `Point ${locs.length + 1}` };
  locs.push(newLoc);
  fs.writeFileSync('locations.json', JSON.stringify(locs, null, 2));
  // emit to clients
  io.emit('locations', newLoc);
  res.status(201).json(newLoc);
});

app.post("/send", (req, res) => {
  const { message, priority } = req.body;

  // Read current alerts
  let alerts = [];
  try {
    alerts = JSON.parse(fs.readFileSync("alerts.json"));
    if (!Array.isArray(alerts)) alerts = [];
  } catch (e) {
    alerts = [];
  }

  // Add new alert
  const newAlert = {
    type: priority.charAt(0).toUpperCase() + priority.slice(1) + " Alert",
    message,
    priority
  };
  alerts.push(newAlert);

  // Save alerts
  fs.writeFileSync("alerts.json", JSON.stringify(alerts, null, 2));

  // Emit to connected clients
  io.emit('alert', newAlert);

  // Simulate delay-tolerant logic
  const delay = priority === "high" ? 1000 : priority === "medium" ? 3000 : 5000;
  setTimeout(() => {
    console.log(`Delivered [${priority}] message: ${message}`);
  }, delay);

  res.status(200).send("Message queued and saved");
});

// Start weather checker (will emit alerts via Socket.IO)
try {
  const weatherChecker = require('./weather-checker');
  weatherChecker.start(io);
} catch (e) {
  console.log('weather-checker not available or failed to start:', e.message);
}

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});