/**
 * Arduino Heart Rate Connector
 * This module integrates with the existing Arduino connection to share the BPM data
 */

const SerialPort = require('serialport').SerialPort;
const ReadlineParser = require('@serialport/parser-readline').ReadlineParser;
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// Create router for Arduino heart rate endpoints
const arduinoRouter = express.Router();
arduinoRouter.use(cors());

// In-memory store for latest BPM value
let latestBPM = 75; // Initial value
const bpmChangeListeners = [];

// Setup for Socket.IO (will be initialized when router is used)
let io = null;

// Initialize the connection to Arduino
function initializeArduinoConnection() {
  try {
    const port = new SerialPort({
      path: 'COM9',
      baudRate: 9600, // match this with your Arduino code
    });
    
    // Create a parser to read lines
    const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));
    
    // Listen for data from Arduino
    parser.on("data", async (line) => {
      const match = line.match(/BPM:\s*(\d+)/);
      if (match) {
        const newBpm = parseInt(match[1]) || 50;
        
        // Only update if BPM actually changed
        if (newBpm !== latestBPM) {
          latestBPM = newBpm;
          console.log("BPM:", latestBPM);
          
          // Notify all listeners about the BPM change
          notifyBpmChange(latestBPM);
        }
      }
    });
    
    // Handle errors
    port.on('error', (err) => {
      console.error('Arduino connection error:', err.message);
    });
    
    console.log('Successfully connected to Arduino on COM9');
    return true;
  } catch (err) {
    console.error('Failed to connect to Arduino:', err.message);
    return false;
  }
}

// Register a listener for BPM changes
function registerBpmChangeListener(callback) {
  bpmChangeListeners.push(callback);
  return bpmChangeListeners.length - 1; // Return index for potential removal
}

// Remove a BPM change listener
function removeBpmChangeListener(index) {
  if (index >= 0 && index < bpmChangeListeners.length) {
    bpmChangeListeners.splice(index, 1);
    return true;
  }
  return false;
}

// Notify all listeners of BPM change
function notifyBpmChange(bpm) {
  bpmChangeListeners.forEach(callback => {
    try {
      callback(bpm);
    } catch (err) {
      console.error("Error in BPM change listener:", err);
    }
  });
  
  // If Socket.IO is initialized, emit to all connected clients
  if (io) {
    io.emit('bpm-update', { bpm });
  }
}

// Routes for heart rate API

// Get current BPM
arduinoRouter.get("/bpm-current", (req, res) => {
  res.json({ bpm: latestBPM });
});

// Check for high BPM
arduinoRouter.post("/checkHighBPM", (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  
  // Define high BPM threshold
  const HIGH_BPM_THRESHOLD = 100;
  
  // Check if BPM is above threshold
  if (latestBPM > HIGH_BPM_THRESHOLD) {
    console.log(`High heart rate alert for ${email}: ${latestBPM} BPM`);
    
    // Here you can add code to send email alerts or save to a database
    
    return res.json({ 
      alert: true, 
      message: `High heart rate detected (${latestBPM} BPM). Please take a moment to rest.` 
    });
  }
  
  return res.json({ alert: false });
});

// Server-sent events for real-time updates
arduinoRouter.get("/bpm-events", (req, res) => {
  // Set headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Send initial data
  res.write(`data: ${JSON.stringify({ bpm: latestBPM })}\n\n`);
  
  // Create listener for BPM changes
  const listenerIndex = registerBpmChangeListener((bpm) => {
    res.write(`data: ${JSON.stringify({ bpm })}\n\n`);
  });
  
  // Handle client disconnect
  req.on('close', () => {
    removeBpmChangeListener(listenerIndex);
  });
});

// Health check
arduinoRouter.get("/status", (req, res) => {
  res.json({
    status: 'running',
    latestBPM: latestBPM,
    timestamp: new Date().toISOString()
  });
});

// Function to integrate with an existing Express app
function integrateWithExpress(app, server) {
  // Add the router to the app
  app.use('/heart-rate', arduinoRouter);
  
  // Setup Socket.IO if a server is provided
  if (server) {
    io = new Server(server, {
      path: '/heart-rate-socket',
      cors: {
        origin: "*",
        methods: ["GET", "POST"]
      }
    });
    
    io.on('connection', (socket) => {
      console.log('New heart rate client connected');
      socket.emit('bpm-update', { bpm: latestBPM });
      
      socket.on('disconnect', () => {
        console.log('Heart rate client disconnected');
      });
    });
  }
  
  // Connect to Arduino if not already connected
  initializeArduinoConnection();
  
  console.log('Heart rate monitoring integrated with existing Express app');
}

module.exports = {
  router: arduinoRouter,
  integrateWithExpress,
  getCurrentBPM: () => latestBPM,
  registerBpmChangeListener,
  removeBpmChangeListener
};