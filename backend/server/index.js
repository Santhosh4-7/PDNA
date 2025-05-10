const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const EmployeeModel = require("./models/user");
const bcrypt = require("bcrypt");
const { spawn } = require('child_process');  
const jwt = require("jsonwebtoken");
const cron = require('node-cron');
const fs = require('fs');
const { Server } = require("socket.io");
const http = require("http");
const axios  = require("axios");
const path = require('path');
const SerialPort = require('serialport').SerialPort;
const ReadlineParser = require('@serialport/parser-readline').ReadlineParser;
const app = express();
const nodemailer = require('nodemailer');
app.use(express.json());
app.use(cors());
const bodyParser = require('body-parser');

mongoose.connect("mongodb://localhost:27017/preg");

app.post("/get-user", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await EmployeeModel.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found!" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});

// Update user details
app.post("/update-user", async (req, res) => {
  const { email, age, weight, trimester } = req.body;

  try {
    const updatedUser = await EmployeeModel.findOneAndUpdate(
      { email },
      {
        $set: {
          age,
          weight,
          trimester,
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ error: "User not found for update!" });
    }

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: "Failed to update user" });
  }
});


const calculateBMI = (weight, height) => {
  const heightInMeters = height / 100;
  return (weight / (heightInMeters * heightInMeters)).toFixed(1);
};
const server = http.createServer(app);
const io = new Server(server, {
  
  cors: {
    origin: "http://localhost:5173", // allow your frontend URL
    methods: ["GET", "POST"],
  },
});
// Heartbeat Monitor for MomNutrition App
// Add these functions to your existing index.js file



// Configuration values
const HIGH_BPM_THRESHOLD = 100; // Threshold for high BPM alert (customize as needed)
const EMAIL_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds

// Track when we last sent an alert for each user
const lastAlertSent = new Map();

// In-memory tracking for BPM change events
let bpmChangeListeners = [];

// Setup nodemailer transporter (using Gmail as an example)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'dhenustar@gmail.com', // Use environment variable
    pass: process.env.EMAIL_PASSWORD || '123' // Use environment variable 
  }
});

// Send email alert for high heartbeat
async function sendHighHeartbeatAlert(user, bpm) {
  try {
    // Check if we've sent an alert within the last hour for this user
    const lastAlert = lastAlertSent.get("dhenustar@gmail.com");
    const now = Date.now();
    
    if (lastAlert && (now - lastAlert < EMAIL_INTERVAL)) {
      console.log(`Skipping alert for ${user.email} - already sent in the last hour`);
      return;
    }
    
    // Prepare email content
    const mailOptions = {
      from: process.env.EMAIL_USER || 'santhosh2210471@ssn.edu.in',
      to: "dhenustar@gmail.com",
      subject: 'MomNutrition - High Heartbeat Alert',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 10px;">
          <h2 style="color: #d55093;">MomNutrition Health Alert</h2>
          <p>Hello ${user.name},</p>
          <p>We've detected an elevated heartbeat reading in your recent monitoring:</p>
          <div style="background-color: #fff5f5; padding: 15px; border-left: 4px solid #ff6b6b; margin: 20px 0;">
            <p style="font-size: 18px; margin: 0;">Current BPM: <strong>${bpm}</strong></p>
            <p style="margin: 10px 0 0 0; color: #666;">Threshold: ${HIGH_BPM_THRESHOLD} BPM</p>
          </div>
          <p>While this could be normal due to activity or other factors, we recommend:</p>
          <ul>
            <li>Take a few minutes to sit down and rest</li>
            <li>Take slow, deep breaths</li>
            <li>Stay hydrated</li>
            <li>Contact your healthcare provider if high heartbeat persists or if you experience any discomfort</li>
          </ul>
          <p>This is an automated alert from your MomNutrition app. Your health and your baby's health are our priority.</p>
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #f0f0f0; font-size: 14px; color: #666;">
            <p>If you have any concerns, please consult your healthcare provider immediately.</p>
          </div>
        </div>
      `
    };
    
    // Send the email
    await transporter.sendMail(mailOptions);
    console.log(`High heartbeat alert sent to ${user.email}`);
    
    // Update last alert timestamp
    lastAlertSent.set("dhenustar@gmail.com", now);
  } catch (err) {
    console.error("Error sending heartbeat alert email:", err);
  }
}

// Check heartbeat and trigger alerts if needed
async function checkHeartbeat(bpm, email) {
  // Skip if no BPM data or email
  if (!bpm || !email) return;
  
  try {
    // Check if BPM is above threshold
    if (bpm > HIGH_BPM_THRESHOLD) {
      // Find the user
      const user = await EmployeeModel.findOne({ email });
      if (!user) {
        console.log(`User not found for email: ${email}`);
        return;
      }
      
      // Send email alert
      await sendHighHeartbeatAlert(user, bpm);
      
      // Save high BPM event in user's medical history
      if (!user.medicalHistory) {
        user.medicalHistory = [];
      }
      
      user.medicalHistory.push({
        type: 'high_bpm',
        value: bpm,
        timestamp: new Date()
      });
      
      await user.save();
      
      return { alert: true, message: 'High heartbeat detected. Alert sent.' };
    }
    
    return { alert: false };
  } catch (err) {
    console.error("Error checking heartbeat:", err);
    return { alert: false, error: err.message };
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
}

// Modify the existing parser.on("data") handler in your index.js
// Replace it with this version:
/*
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
*/

// New route to check and alert on high BPM
app.post("/checkHighBPM", async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  
  if (!latestBPM) {
    return res.status(404).json({ error: "BPM data not available" });
  }
  
  try {
    const result = await checkHeartbeat(latestBPM, email);
    return res.json(result);
  } catch (err) {
    console.error("Error in high BPM check:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// New endpoint to register for server-side events for real-time updates
app.get("/bpm-events", (req, res) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Send initial data
  if (latestBPM) {
    res.write(`data: ${JSON.stringify({ bpm: latestBPM })}\n\n`);
  }
  
  // Create listener for BPM changes
  const listenerIndex = registerBpmChangeListener((bpm) => {
    res.write(`data: ${JSON.stringify({ bpm })}\n\n`);
  });
  
  // Handle client disconnect
  req.on('close', () => {
    removeBpmChangeListener(listenerIndex);
  });
});

// Update your app schema to include medical history
/*
const employeeSchema = new mongoose.Schema({
  // Other fields...
  
  medicalHistory: [{
    type: String,
    value: Number,
    timestamp: Date,
    notes: String
  }]
});
*/
let latestBPM;


// Updated Backend Routes for MomNutrition App
// Add these routes to your existing index.js file


// Update your Employee model schema with water intake and favorites
// Add this to your EmployeeModel schema
/*
const employeeSchema = new mongoose.Schema({
    // Existing fields...
    
    // Water intake tracking
    waterIntake: {
        currentIntake: {
            type: Number,
            default: 0
        },
        history: [{ 
            amount: Number,
            timestamp: Date,
            total: Number
        }],
        lastReset: {
            type: Date,
            default: Date.now
        }
    },
    
    // Food favorites
    favorites: [{ 
        name: String,
        calories: Number,
        protein: Number,
        carbs: Number,
        fats: Number,
        image: String,
        mealType: {
            type: String,
            enum: ['breakfast', 'lunch', 'dinner', 'snack'],
            default: 'breakfast'
        },
        addedOn: {
            type: Date,
            default: Date.now
        }
    }]
});
*/

// Water Intake Routes

// Get the current water intake and history
app.post("/getWaterIntake", async (req, res) => {
  const { email } = req.body;
  
  try {
    const user = await EmployeeModel.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Check if waterIntake exists, if not, initialize it
    if (!user.waterIntake) {
      user.waterIntake = {
        currentIntake: 0,
        history: [],
        lastReset: new Date()
      };
      await user.save();
    }
    
    // Check if we need to reset (it's a new day)
    const today = new Date().setHours(0, 0, 0, 0);
    const lastReset = new Date(user.waterIntake.lastReset).setHours(0, 0, 0, 0);
    
    if (today > lastReset) {
      // It's a new day, reset the counter but keep history
      user.waterIntake.currentIntake = 0;
      user.waterIntake.lastReset = new Date();
      await user.save();
    }
    
    return res.json({
      currentIntake: user.waterIntake.currentIntake,
      history: user.waterIntake.history,
      lastReset: user.waterIntake.lastReset
    });
    
  } catch (err) {
    console.error("Error getting water intake:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Add water intake
app.post("/addWaterIntake", async (req, res) => {
  const { email, amount, total, timestamp } = req.body;
  
  if (!email || !amount || amount <= 0) {
    return res.status(400).json({ message: "Invalid request data" });
  }
  
  try {
    const user = await EmployeeModel.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Initialize waterIntake if it doesn't exist
    if (!user.waterIntake) {
      user.waterIntake = {
        currentIntake: 0,
        history: [],
        lastReset: new Date()
      };
    }
    
    // Update the current intake
    user.waterIntake.currentIntake += amount;
    
    // Add to history
    user.waterIntake.history.push({
      amount,
      timestamp: timestamp || new Date(),
      total: total || user.waterIntake.currentIntake
    });
    
    await user.save();
    
    return res.json({
      message: "Water intake updated successfully",
      currentIntake: user.waterIntake.currentIntake,
      history: user.waterIntake.history
    });
    
  } catch (err) {
    console.error("Error adding water intake:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Reset water intake
app.post("/resetWaterIntake", async (req, res) => {
  const { email } = req.body;
  
  try {
    const user = await EmployeeModel.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Reset current intake but keep history
    if (user.waterIntake) {
      user.waterIntake.currentIntake = 0;
      user.waterIntake.lastReset = new Date();
    } else {
      user.waterIntake = {
        currentIntake: 0,
        history: [],
        lastReset: new Date()
      };
    }
    
    await user.save();
    
    return res.json({
      message: "Water intake reset successfully",
      currentIntake: user.waterIntake.currentIntake,
      lastReset: user.waterIntake.lastReset
    });
    
  } catch (err) {
    console.error("Error resetting water intake:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Food Favorites Routes

// Get all favorites
app.post("/getFavorites", async (req, res) => {
  const { email } = req.body;
  
  try {
    const user = await EmployeeModel.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    return res.json(user.favorites || []);
    
  } catch (err) {
    console.error("Error getting favorites:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Add a favorite
app.post("/addFavorite", async (req, res) => {
  const { email, food } = req.body;
  
  if (!email || !food || !food.name) {
    return res.status(400).json({ message: "Invalid request data" });
  }
  
  try {
    const user = await EmployeeModel.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Initialize favorites array if it doesn't exist
    if (!user.favorites) {
      user.favorites = [];
    }
    
    // Check if this food is already in favorites (by name)
    const existingIndex = user.favorites.findIndex(
      item => item.name.toLowerCase() === food.name.toLowerCase()
    );
    
    if (existingIndex !== -1) {
      // Update the existing favorite
      user.favorites[existingIndex] = {
        ...user.favorites[existingIndex],
        ...food,
        addedOn: new Date()
      };
    } else {
      // Add as a new favorite
      user.favorites.push({
        ...food,
        addedOn: new Date()
      });
    }
    
    await user.save();
    
    return res.json({
      message: "Favorite added successfully",
      favorites: user.favorites
    });
    
  } catch (err) {
    console.error("Error adding favorite:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Remove a favorite
app.post("/removeFavorite", async (req, res) => {
  const { email, foodId } = req.body;
  
  if (!email || !foodId) {
    return res.status(400).json({ message: "Invalid request data" });
  }
  
  try {
    const user = await EmployeeModel.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Remove the favorite by ID
    if (user.favorites && user.favorites.length > 0) {
      user.favorites = user.favorites.filter(
        item => item._id.toString() !== foodId
      );
    }
    
    await user.save();
    
    return res.json({
      message: "Favorite removed successfully",
      favorites: user.favorites
    });
    
  } catch (err) {
    console.error("Error removing favorite:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Add direct "Add to Favorites" functionality for foods being added to meals
app.post("/addToFavorites", async (req, res) => {
  const { email, food, mealType } = req.body;
  
  try {
    // First, add the food to the user's meals (reusing existing endpoint)
    await axios.post("http://localhost:3001/additem", { 
      foods: food,
      email
    });
    
    // Then add to favorites with the meal type
    const favoriteData = {
      ...food,
      mealType: mealType || 'breakfast'
    };
    
    const user = await EmployeeModel.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Initialize favorites if needed
    if (!user.favorites) {
      user.favorites = [];
    }
    
    // Add to favorites
    user.favorites.push(favoriteData);
    await user.save();
    
    return res.json({
      message: "Food added to meals and favorites",
      favorite: favoriteData
    });
    
  } catch (err) {
    console.error("Error adding to favorites:", err);
    return res.status(500).json({ message: "Server error" });
  }
});
// Setup serial communication with Arduino

// // Create SerialPort instance for COM9

  
  // Chatbot Routes for MomNutrition App
// Add these to your existing index.js

// Update your Employee schema model to include chat history
/*
const employeeSchema = new mongoose.Schema({
    // Existing fields...

    // Chatbot history and saved questions
    chatbot: {
        history: [{
            message: String,
            response: String,
            timestamp: {
                type: Date,
                default: Date.now
            }
        }],
        savedQuestions: [{
            question: String,
            saved: {
                type: Date,
                default: Date.now
            }
        }]
    }
});
*/

// Simple route for the chatbot - for the local version
app.post("/chatbot", async (req, res) => {
  const { email, message } = req.body;
  
  if (!email || !message) {
    return res.status(400).json({ message: "Email and message are required" });
  }
  
  try {
    const user = await EmployeeModel.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Generate a response based on the user's message and profile
    // This is a simple implementation. In production, you would:
    // 1. Call a real NLP service or AI API
    // 2. Process the results
    // 3. Return a more sophisticated response
    let response = "";
    const lowerMsg = message.toLowerCase();
    
    // Match different topics in the user's message
    if (lowerMsg.includes("trimester") && lowerMsg.includes("eat")) {
      if (user.trimester === 1) {
        response = "In your first trimester, focus on folate-rich foods like leafy greens, citrus fruits, and fortified grains. Small, frequent meals can help with nausea.";
      } else if (user.trimester === 2) {
        response = "For your second trimester, increase calcium intake with dairy products or fortified plant milks. Add more iron-rich foods like lean meats and beans.";
      } else {
        response = "In your third trimester, focus on omega-3 fatty acids for brain development, and continue with iron-rich foods to prevent anemia.";
      }
      
      if (user.pregnancyType !== "single") {
        response += " With your multiple pregnancy, you'll need extra calories and nutrients. Consider speaking with a nutritionist for a personalized plan.";
      }
    }
    else if (lowerMsg.includes("morning sickness") || lowerMsg.includes("nausea")) {
      response = "To manage morning sickness, try eating small, frequent meals rather than large meals. Ginger tea or candies may help. Keep plain crackers by your bed to eat before getting up. Stay hydrated with small sips of water throughout the day.";
    }
    else if (lowerMsg.includes("water") || lowerMsg.includes("hydration")) {
      response = "Staying hydrated is crucial during pregnancy. Aim for at least 8-10 glasses of water daily, more in hot weather or if you're active. Adequate hydration supports amniotic fluid, increased blood volume, and can help prevent constipation and UTIs.";
    }
    else {
      // General response for unmatched messages
      response = "Thank you for your question. Proper nutrition during pregnancy is very important. I recommend discussing your specific dietary needs with your healthcare provider, especially for your " + user.pregnancyType + " pregnancy in trimester " + user.trimester + ".";
    }
    
    // Save the conversation in the user's history
    if (!user.chatbot) {
      user.chatbot = {
        history: [],
        savedQuestions: []
      };
    }
    
    user.chatbot.history.push({
      message,
      response,
      timestamp: new Date()
    });
    
    // Limit history size to prevent excessive DB growth
    if (user.chatbot.history.length > 50) {
      user.chatbot.history = user.chatbot.history.slice(-50);
    }
    
    await user.save();
    
    return res.status(200).json({
      response,
      timestamp: new Date()
    });
    
  } catch (err) {
    console.error("Chatbot error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get chat history
app.post("/getChatHistory", async (req, res) => {
  const { email } = req.body;
  
  try {
    const user = await EmployeeModel.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    if (!user.chatbot || !user.chatbot.history) {
      return res.json([]);
    }
    
    return res.json(user.chatbot.history);
    
  } catch (err) {
    console.error("Error getting chat history:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Save a question for later reference
app.post("/saveQuestion", async (req, res) => {
  const { email, question } = req.body;
  
  try {
    const user = await EmployeeModel.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    // Initialize chatbot if not exists
    if (!user.chatbot) {
      user.chatbot = {
        history: [],
        savedQuestions: []
      };
    }
    
    // Add question to saved questions
    user.chatbot.savedQuestions.push({
      question,
      saved: new Date()
    });
    
    await user.save();
    
    return res.status(200).json({
      message: "Question saved successfully",
      savedQuestions: user.chatbot.savedQuestions
    });
    
  } catch (err) {
    console.error("Error saving question:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get saved questions
app.post("/getSavedQuestions", async (req, res) => {
  const { email } = req.body;
  
  try {
    const user = await EmployeeModel.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    if (!user.chatbot || !user.chatbot.savedQuestions) {
      return res.json([]);
    }
    
    return res.json(user.chatbot.savedQuestions);
    
  } catch (err) {
    console.error("Error getting saved questions:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Delete a saved question
app.post("/deleteSavedQuestion", async (req, res) => {
  const { email, questionId } = req.body;
  
  try {
    const user = await EmployeeModel.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    
    if (!user.chatbot || !user.chatbot.savedQuestions) {
      return res.status(404).json({ message: "No saved questions found" });
    }
    
    // Remove the question by ID
    user.chatbot.savedQuestions = user.chatbot.savedQuestions.filter(
      q => q._id.toString() !== questionId
    );
    
    await user.save();
    
    return res.status(200).json({
      message: "Question deleted successfully",
      savedQuestions: user.chatbot.savedQuestions
    });
    
  } catch (err) {
    console.error("Error deleting saved question:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

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
      const newBpm = parseInt(match[1]) || 75;
      
      // Only update if BPM actually changed
      if (newBpm !== latestBPM) {
        latestBPM = newBpm;
        console.log("BPM:", latestBPM);
        
        // Notify all listeners about the BPM change
        notifyBpmChange(latestBPM);
      }
    }
  });

  // Handle connection errors
  port.on('error', (err) => {
    console.error('Error with Arduino port COM9:', err.message);
    console.log('Will continue with simulated heart rate data');
    startHeartRateSimulation();
  });

  console.log('Connected to Arduino on COM9');
} catch (err) {
  console.error('Failed to connect to Arduino:', err.message);
  console.log('Starting heart rate simulation instead');
  startHeartRateSimulation();
}

function startHeartRateSimulation() {
  // Randomly fluctuate heart rate between 60-110 BPM
  setInterval(() => {
    // Random walk algorithm to simulate more realistic heart rate changes
    const change = Math.floor(Math.random() * 5) - 2; // Random value between -2 and 2
    latestBPM += change;
    
    // Keep within reasonable bounds
    if (latestBPM < 60) latestBPM = 60;
    if (latestBPM > 110) latestBPM = 110;
    
    // Log BPM changes
    console.log(`Heart Rate (Simulated): ${latestBPM} BPM`);
    
    // Notify all listeners about the BPM change
    notifyBpmChange(latestBPM);
  }, 3000); // Update every 3 seconds
}

  app.post("/getBPM", (req, res) => {
    console.log(latestBPM);
    if (latestBPM !== null) {
      console.log("Latest"+latestBPM);
      return res.status(200).json({ bpm: latestBPM });
    } else {
      return res.status(404).json({ error: "BPM not available yet" });
    }
  });



app.post("/suggestions", async (req, res) => {
  const { email } = req.body;
  console.log("Suggest" + email);
  try {
    // Find the user by email
    const user = await EmployeeModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const {
      name,
      age,
      height,
      weight,
      pregnancyType,
      trimester,
      foods = [],
    } = user;

    // Calculate BMI
    const bmi = calculateBMI(weight, height);

    // Calculate total nutrients consumed today
    let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFats = 0;

    foods.forEach(food => {
      totalCalories += food.calories || 0;
      totalProtein += food.protein || 0;
      totalCarbs += food.carbs || 0;
      totalFats += food.fats || 0;
    });

    // Ideal daily targets based on pregnancy type and trimester
    let baseCalories = 2000;
    if (pregnancyType === "twin") baseCalories += 400;
    else if (pregnancyType === "triplet") baseCalories += 600;

    if (trimester === 2) baseCalories += 300;
    else if (trimester === 3) baseCalories += 450;

    const recommendedProtein = Math.round(weight * 1.1); // in grams
    const recommendedCarbs = Math.round((baseCalories * 0.5) / 4); // carbs in grams (1g = 4 calories)
    const recommendedFats = Math.round((baseCalories * 0.3) / 9); // fats in grams (1g = 9 calories)

    // Suggestions array to hold nutritional advice
    let suggestions = [];

    // Check calorie intake
    if (totalCalories < baseCalories * 0.85) {
      suggestions.push("🍽️ You're below your daily calorie goal — consider adding a snack or nutrient-rich meal.");
    } else if (totalCalories > baseCalories * 1.1) {
      suggestions.push("⚖️ You've exceeded your ideal calorie intake — avoid high-fat or sugary foods for the rest of the day.");
    } else {
      suggestions.push("👏 Great job meeting your daily calorie goal!");
    }

    // Check protein intake
    if (totalProtein < recommendedProtein * 0.8) {
      suggestions.push("💪 Try adding more protein-rich foods like lentils, eggs, dairy, or lean meat.");
    }

    // Check carbs intake
    if (totalCarbs < recommendedCarbs * 0.7) {
      suggestions.push("🍞 You may need more complex carbs — consider adding whole grains like brown rice or oats.");
    }

    // Check fats intake
    if (totalFats < recommendedFats * 0.7) {
      suggestions.push("🥑 Make sure you're getting enough healthy fats — include sources like avocado, nuts, or olive oil.");
    }

    // Check BMI
    if (bmi < 18.5) {
      suggestions.push("⚖️ You are underweight — it's important to gain weight for a healthy pregnancy.");
    } else if (bmi >= 25) {
      suggestions.push("⚖️ You are overweight — try to maintain a balanced diet and avoid excess fats.");
    }

    return res.status(200).json({
      message: "Nutritional suggestions generated successfully",
      suggestions,
      user: {
        name,
        bmi,
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFats,
      },
    });
  } catch (error) {
    console.error("Error generating suggestions:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});


app.post('/getProgressData', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email is required' });

  console.log("📧 The email:", email);
  const sanitizedEmail = email.replace(/[@.]/g, '_');
  const folderPath = path.join(__dirname, "dailyHistory");

  try {
    const files = fs.readdirSync(folderPath);
    const userFiles = files.filter(file => file.startsWith(sanitizedEmail));

    const progressData = userFiles.map(filename => {
      const filePath = path.join(folderPath, filename);
      console.log("path", filePath);
      const fileContent = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

      // Initialize an empty array to store date and calories pairs
      const calorieData = [];

      // Loop through fileContent and extract date and calories
      fileContent.forEach(item => {
        const date = item.date || "Unknown";
        const calories = item.calories || 0;
        
        // Push the date and calories as an object into the array
        calorieData.push({ date, calories });
      });

      // Return the array of date and calories
      return calorieData;
    });

    // Flatten the progressData array and sort by date
    const flattenedProgressData = [].concat(...progressData);
    flattenedProgressData.sort((a, b) => new Date(a.date) - new Date(b.date));

    console.log("Progress Data:", flattenedProgressData);
    res.json(flattenedProgressData);

  } catch (err) {
    console.error("❌ Error reading progress files:", err);
    res.status(500).json({ error: 'Error fetching progress data' });
  }
});


//add item
app.post("/additem", async (req,res) => {
    console.log(req.body.foods);
    const foods = req.body.foods;
    const email = req.body.email;
    console.log("HEYY "+email);
    await EmployeeModel.updateOne(
        {email},
        {$push: {foods:foods}}
    )

    res.json("saved successfully");
})
app.post("/getUserInfo", async (req, res) => {
  const { email } = req.body;
  
  try {
    const user = await EmployeeModel.findOne({ email });
    console.log("USER DATA"+user.trimester+"USER WEIGHT"+user.weight);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return relevant info
    console.log(user.pregnancyType);
    res.json({
      trimester: user.trimester,
      weight: user.weight,
      pregnancyType: user.pregnancyType,
      name: user.name,
    });
  } catch (err) {
    console.error("Error fetching user info:", err);
    res.status(500).json({ message: "Server error" });
  }
}); 

cron.schedule('0 0 * * *', async () => {
  console.log('⏰ Running daily food summary job...');

  const users = await EmployeeModel.find();

  for (let user of users) {
    const foodArray = user.foods || [];

    if (foodArray.length === 0) {
      console.log(`⏭️ Skipping ${user.email} - no food entries`);
      continue;
    }

    const today = new Date().toISOString().split('T')[0];
    const totalCalories = foodArray.reduce((sum, item) => sum + (item.calories || 0), 0);

    const historyData = {
      date: today,
      calories: totalCalories,
      foodItems: foodArray,
    };

    const filename = `${user.email.replace(/[@.]/g, '_')}_${today}_${Date.now()}.json`;
    const filePath = path.join(__dirname, 'dailyHistory', filename);

    // Save history summary to file
    fs.writeFileSync(filePath, JSON.stringify(historyData, null, 2));
    console.log(`✅ Saved file: ${filename}`);

    // Store calories summary in user.dailyHistory
    user.dailyHistory = user.dailyHistory || [];
    user.dailyHistory.push({ date: today, calories: totalCalories });

    // Reset user foods & fill default values
    user.foods = [];
    user.age = user.age || 25;
    user.pregnancyType = user.pregnancyType || "single";
    user.height = user.height || 160;
    user.weight = user.weight || 60;
    user.trimester = user.trimester || 1;

    try {
      await user.save();
      console.log(`✅ Data saved & cleared for ${user.email}`);
    } catch (err) {
      console.error(`❌ Error saving ${user.email}:`, err);
    }
  }
});

app.post('/predict', (req, res) => {
    const { inputArray, email } = req.body;
    console.log("Hi"+inputArray);
    if (!inputArray || !email) {
      return res.status(400).json({ error: 'Input array and email are required' });
    }
  
    const pythonProcess = spawn('python', ['predictor.py', JSON.stringify(inputArray)]);
  
    let result = '';
  
    pythonProcess.stdout.on('data', (data) => {
      result += data.toString();
    });
  
    pythonProcess.stderr.on('data', (data) => {
      console.error(`Python error: ${data}`);
    });
  
    pythonProcess.on('close', async (code) => {
      if (code !== 0) {
        return res.status(500).json({ error: 'Python script error' });
      }
  
      const predictedTrimester = parseInt(result.trim(), 10); // Convert string to integer
      console.log(`Predicted Trimester (Number): ${predictedTrimester}`);
  
      if (![1, 2, 3].includes(predictedTrimester)) {
        return res.status(400).json({ error: 'Invalid trimester value from prediction' });
      }
  
      try {
        console.log("TRIMMMMM"+predictedTrimester);
        // 🔥 Update both pregnancyType (string) and trimester (integer)
        const updatedUser = await EmployeeModel.findOneAndUpdate(
          { email: email },
          { trimester: predictedTrimester},
            
          
    
          { new: true } // Return the updated document
        );
        
        if (!updatedUser) {
          return res.status(404).json({ error: 'User not found' });
        }
  
        res.json({ 
          message: 'Prediction saved successfully', 
          trimesterText: `Trimester ${predictedTrimester}`,
          trimesterNumber: predictedTrimester
        });
      } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ error: 'Database update failed' });
      }
    });
  });

   app.post('/getitems', async (req, res) => {
    const email = req.body.email;
    console.log("Hello"+email);
    try {
      const user = await EmployeeModel.findOne({ email });
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      console.log(user.foods);

      res.json(user.foods); // send only the foods array
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
// Login Route
app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await EmployeeModel.findOne({ email });

        if (!user) {
            return res.status(404).json("No records existed");
        }

        if (user.password === password) {
            return res.json("Success");
        } else {
            return res.status(401).json("Incorrect password");
        }
    } catch (error) {
        console.error("Login Error:", error);
        return res.status(500).json("Internal Server Error");
    }
});

// Register Route
app.post("/register", async (req, res) => {
    try {
        const newUser = await EmployeeModel.create({
            name: req.body.name,
            email: req.body.email,
            password: req.body.password, // Store the plain text password directly
            pregnancyType: req.body.pregnancyType,
            age: req.body.age,
            height: req.body.height,
            weight: req.body.weight // fixed typo, previously it was using height for weight
        });

        res.status(201).json({ message: "Signup successful", user: newUser });
    } catch (error) {
        console.error("Signup Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Fetch Employee Data
app.post("/api/employees", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const user = await EmployeeModel.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        console.log("User found:", user.name);
        res.json({
            name: user.name,
            email: user.email,
            weight: user.weight || Math.floor(Math.random() * 30) + 50,
            height: user.height || Math.floor(Math.random() * 30) + 150,
        });
    } catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});
app.post("/api/add-food", async (req, res) => {
    try {
        const { userId, food } = req.body; // userId: the logged-in user's id, food: food item object

        // Find the user by userId and update their food list
        const updatedUser = await EmployeeModel.findByIdAndUpdate(
            userId, // Use the user ID to find the user
            {
                $push: { foods: food }, // Add the new food item to the foods array
            },
            { new: true } // Return the updated user document
        );

        res.status(200).json({ message: "Food added successfully", user: updatedUser });
    } catch (error) {
        console.error("Add Food Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// ✅ Fix: Use the router properly
const router = express.Router();

const users = [
  { email: 'test@example.com', password: 'password123', name: 'Test User' }
];

// Login endpoint
app.post("/api/auth/loginUser", async (req, res) => {
  const { email } = req.body;

  console.log(email);
  try {
    const user = await EmployeeModel.findOne({ email: email });
    console.log(user.name);
    if (user.name != null) {
      console.log("HI");
      res.status(200).json({
      message: 'Login successful',
      user: user.name
    });
    } else {
      res.status(401).json({
        message: 'Login unsuccessful',
       
      });
    }
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
});


app.post('/api/auth/getNutritionSummary', async (req, res) => {
  const { email } = req.body;

  try {
    const user = await EmployeeModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    console.log("Hi"+user.name);
    const foods = user.foods; // assuming it's an array of food objects
   
    let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFats = 0;

    foods.forEach(food => {
     
      totalCalories += food.calories || 0;
      totalProtein += food.protein || 0;
      totalCarbs += food.carbs || 0;
      totalFats += food.fats || 0;
    });
    
    return res.status(200).json({
      message: "Summary fetched successfully",
      name: user.name,
      foods,
      summary: {
        calories: totalCalories,
        protein: totalProtein,
        carbs: totalCarbs,
        fats: totalFats
      }
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 🔽 Route to add food
const SPOONACULAR_API_KEY = '160d9a92cd474e7685d28c220f891c67';

// Your POST route to add food
app.post('/api/auth/add_Food4', async (req, res) => {
  const { email, food, meal } = req.body;

  try {
    const user = await EmployeeModel.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Step 1: Search food item
    const searchRes = await axios.get("https://api.spoonacular.com/food/ingredients/search", {
      params: { query: food, apiKey: "160d9a92cd474e7685d28c220f891c67" },
    });

    const item = searchRes.data.results[0];
    if (!item) return res.status(404).json({ message: "Food not found" });

    // Step 2: Get nutrition information
    const infoRes = await axios.get(
      `https://api.spoonacular.com/food/ingredients/${item.id}/information`,
      {
        params: {
          amount: 100,
          unit: "grams",
          apiKey: "160d9a92cd474e7685d28c220f891c67",
        },
      }
    );

    const nutData = infoRes.data.nutrition.nutrients;
    const foodData = {
      name: item.name,
      meal,
      calories: nutData.find(n => n.name === "Calories")?.amount || 0,
      protein: nutData.find(n => n.name === "Protein")?.amount || 0,
      carbs: nutData.find(n => n.name === "Carbohydrates")?.amount || 0,
      fats: nutData.find(n => n.name === "Fat")?.amount || 0,
    };
    console.log(food)
    // Step 3: Save the food data
    user.foods.push(foodData);
    await user.save();

    return res.status(200).json({ message: "Food added", food: foodData });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
});


/**
 * Heart Rate Monitoring Server for Flutter
 * Backend service for the MomNutrition Flutter app to process and serve heart rate data
 */
app.post("api/auth/bpm-current", (req, res) => {
  console.log("hello"+latestBPM);
  res.json({ bpm: latestBPM });
});

// Check for high BPM and generate alert if needed
app.post("/heart-rate/checkHighBPM", async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }
  
  try {
    const result = await checkHeartbeat(latestBPM, email);
    return res.json(result);
  } catch (err) {
    console.error("Error in high BPM check:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// Server-side events endpoint for real-time updates
app.get("/heart-rate/bpm-events", (req, res) => {
  // Set headers for Server-Sent Events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Send initial data
  if (latestBPM) {
    res.write(`data: ${JSON.stringify({ bpm: latestBPM })}\n\n`);
  }
  
  // Create listener for BPM changes
  const listenerIndex = registerBpmChangeListener((bpm) => {
    res.write(`data: ${JSON.stringify({ bpm })}\n\n`);
  });
  
  // Handle client disconnect
  req.on('close', () => {
    removeBpmChangeListener(listenerIndex);
  });
});

// Heart rate monitor status endpoint
app.get('/heart-rate/status', (req, res) => {
  res.json({
    status: 'running',
    heartRate: {
      current: latestBPM,
      threshold: HIGH_BPM_THRESHOLD,
      updated: new Date().toISOString()
    }
  });
});


app.listen(3001, () => {
    console.log("Server is running on port 3001");
});
