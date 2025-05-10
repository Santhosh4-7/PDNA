import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import "./heartbeat.css"
// Heartbeat related components and utilities for your app
// Include these in your relevant components

// 1. Use this in your Home.jsx or similar component to show high BPM alerts
const HighHeartbeatAlert = ({ bpm, threshold, onClose }) => {
  return (
    <div className="high-bpm-alert">
      <div className="alert-content">
        <div className="alert-header">
          <h3>High Heartbeat Detected</h3>
          <button className="close-alert" onClick={onClose}>×</button>
        </div>
        <div className="alert-body">
          <p>Your current heartbeat reading is <strong>{bpm} BPM</strong>, which is above the recommended threshold of {threshold} BPM.</p>
          <p>Recommendations:</p>
          <ul>
            <li>Sit down and rest for a few minutes</li>
            <li>Take slow, deep breaths</li>
            <li>Stay hydrated</li>
            <li>If high heartbeat persists or you feel unwell, contact your healthcare provider</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// 2. Enhanced BPM display component with real-time updates
const EnhancedHeartbeatDisplay = ({ email }) => {
  const [bpm, setBpm] = useState(null);
  const [isHighBpm, setIsHighBpm] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [lastAlertTime, setLastAlertTime] = useState(0);
  
  const HIGH_BPM_THRESHOLD = 100; // Should match the server setting
  const ALERT_INTERVAL = 60 * 60 * 1000; // 1 hour in milliseconds
  
  // Function to fetch BPM once
  const fetchBpm = useCallback(async () => {
    try {
      const res = await axios.post('http://localhost:3001/getBPM', { email });
      
      if (res.data && res.data.bpm) {
        const newBpm = res.data.bpm;
        setBpm(newBpm);
        
        // Check if BPM is high
        if (newBpm > HIGH_BPM_THRESHOLD) {
          setIsHighBpm(true);
          
          // Only show alert once per hour
          const now = Date.now();
          if (now - lastAlertTime > ALERT_INTERVAL) {
            setShowAlert(true);
            setLastAlertTime(now);
            
            // Also trigger server-side check for email alert
            await axios.post('http://localhost:3001/checkHighBPM', { email });
          }
        } else {
          setIsHighBpm(false);
        }
      }
    } catch (err) {
      console.error("Error fetching BPM:", err);
    }
  }, [email, lastAlertTime]);
  
  // Function to setup SSE for real-time updates
  const setupBpmEventSource = useCallback(() => {
    const eventSource = new EventSource('http://localhost:3001/bpm-events');
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data && data.bpm) {
        const newBpm = data.bpm;
        setBpm(newBpm);
        
        // Check if BPM is high
        if (newBpm > HIGH_BPM_THRESHOLD) {
          setIsHighBpm(true);
          
          // Only show alert once per hour
          const now = Date.now();
          if (now - lastAlertTime > ALERT_INTERVAL) {
            setShowAlert(true);
            setLastAlertTime(now);
            
            // Also trigger server-side check for email alert
            axios.post('http://localhost:3001/checkHighBPM', { email })
              .catch(err => console.error("Error checking high BPM:", err));
          }
        } else {
          setIsHighBpm(false);
        }
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      eventSource.close();
      
      // Fall back to polling if SSE fails
      console.log('Falling back to polling for BPM updates');
    };
    
    return eventSource;
  }, [email, lastAlertTime]);
  
  useEffect(() => {
    if (!email) return;
    
    // First, get the initial BPM value
    fetchBpm();
    
    // Try to use SSE for real-time updates first
    let eventSource;
    try {
      eventSource = setupBpmEventSource();
    } catch (err) {
      console.error("Error setting up EventSource:", err);
    }
    
    // Fallback to polling if SSE isn't supported or fails
    let intervalId;
    if (!eventSource || eventSource.readyState === 2) {
      intervalId = setInterval(fetchBpm, 1000);
    }
    
    // Cleanup function
    return () => {
      if (eventSource) eventSource.close();
      if (intervalId) clearInterval(intervalId);
    };
  }, [email, fetchBpm, setupBpmEventSource]);
  
  const closeAlert = () => {
    setShowAlert(false);
  };
  
  return (
    <div className={`heartbeat-container ${isHighBpm ? 'high-bpm' : ''}`}>
      <p className="heartbeat-text">
        Heartbeat: <span className="heartbeat">💓</span> 
        {bpm ? (
          <span className={isHighBpm ? 'high-bpm-text' : ''}>
            {bpm} BPM {isHighBpm && <span className="warning-icon">⚠️</span>}
          </span>
        ) : "Loading..."}
      </p>
      
      {showAlert && (
        <HighHeartbeatAlert 
          bpm={bpm}
          threshold={HIGH_BPM_THRESHOLD}
          onClose={closeAlert}
        />
      )}
    </div>
  );
};

// 3. Redux-compatible reducer for BPM state management (if using Redux)
const bpmReducer = (state = { value: null, isHigh: false, lastAlert: 0 }, action) => {
  switch (action.type) {
    case 'SET_BPM':
      return {
        ...state,
        value: action.payload,
        isHigh: action.payload > 100
      };
    case 'ALERT_SHOWN':
      return {
        ...state,
        lastAlert: Date.now()
      };
    default:
      return state;
  }
};

// 4. Custom hook for BPM data - use this in any component that needs BPM data
const useHeartbeatData = (email) => {
  const [bpmData, setBpmData] = useState({
    bpm: null,
    isHigh: false,
    loading: true,
    error: null
  });
  
  useEffect(() => {
    if (!email) {
      setBpmData(prev => ({ ...prev, error: 'Email is required' }));
      return;
    }
    
    const fetchBpm = async () => {
      try {
        const res = await axios.post('http://localhost:3001/getBPM', { email });
        if (res.data && res.data.bpm) {
          setBpmData({
            bpm: res.data.bpm,
            isHigh: res.data.bpm > 100,
            loading: false,
            error: null
          });
        } else {
          setBpmData({
            bpm: null, 
            isHigh: false,
            loading: false,
            error: 'No BPM data available'
          });
        }
      } catch (err) {
        setBpmData({
          bpm: null,
          isHigh: false,
          loading: false,
          error: err.message || 'Error fetching BPM'
        });
      }
    };
    
    fetchBpm();
    const intervalId = setInterval(fetchBpm, 1000);
    
    return () => clearInterval(intervalId);
  }, [email]);
  
  return bpmData;
};

export { 
  HighHeartbeatAlert,
  EnhancedHeartbeatDisplay,
  bpmReducer,
  useHeartbeatData
};