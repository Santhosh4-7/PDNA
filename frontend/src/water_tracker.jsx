import React, { useEffect, useState } from "react";
import axios from "axios";
import "./homes.css"; // Reuse our existing beautiful CSS
import "./water_tracker.css";
import { EnhancedHeartbeatDisplay } from './heartbeat_frontend';
import { useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHome, 
  faUtensils, 
  faChartLine, 
  faLightbulb, 
  faChevronLeft,
  faUser,
  faSignOutAlt,
  faHeart,
  faHeartbeat,
  faWater,
  faPlus,
  faMinus,
  faTint,
  faGlassWhiskey,
  faHistory,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';

const WaterTracker = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [waterIntake, setWaterIntake] = useState(0);
  const [waterGoal, setWaterGoal] = useState(2000); // Default water goal in ml
  const [userName, setUserName] = useState("");
  const [bpm, setBpm] = useState(null);
  const [waterHistory, setWaterHistory] = useState([]);
  const [userInfo, setUserInfo] = useState({});
  const [customAmount, setCustomAmount] = useState(250);

  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  useEffect(() => {
    if (!email) {
      console.log("No email found");
      return;
    }
    
    const fetchBpm = async () => {
      try {
        const res = await axios.post('http://localhost:3001/getBPM', { email });
        
        if (res.data && res.data.bpm) {
          setBpm(res.data.bpm);
        } else {
          console.log("No BPM data found");
        }
      } catch (err) {
        console.error("Error fetching BPM:", err);
      }
    };

    // Fetch BPM every second (1000 ms)
    const intervalId = setInterval(fetchBpm, 1000);

    // Fetch user info
    const fetchUserInfo = async () => {
      try {
        const userRes = await axios.post("http://localhost:3001/getUserInfo", { email });
        const { name, trimester, pregnancyType, weight } = userRes.data;
        setUserName(name);
        
        // Calculate water goal based on pregnancy stage and weight
        // Pregnant women need more water - base calculation on weight and trimester
        let baseWaterIntake = weight * 30; // 30ml per kg of body weight
        
        // Adjust based on pregnancy type and trimester
        if (pregnancyType === "twin" || pregnancyType === "triplet") {
          baseWaterIntake += 300; // Additional water for multiple pregnancy
        }
        
        if (trimester === 2) {
          baseWaterIntake += 200; // Second trimester needs more water
        } else if (trimester === 3) {
          baseWaterIntake += 400; // Third trimester needs even more water
        }
        
        setWaterGoal(baseWaterIntake);
        setUserInfo({ name, trimester, pregnancyType, weight });
        
        // Fetch water intake data
        try {
          const waterRes = await axios.post("http://localhost:3001/getWaterIntake", { email });
          setWaterIntake(waterRes.data.currentIntake || 0);
          setWaterHistory(waterRes.data.history || []);
        } catch (err) {
          // If this endpoint doesn't exist yet or returns an error, we'll use 0 as the default
          console.log("Water intake data not available yet");
          setWaterIntake(0);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching user data:", err);
        setIsLoading(false);
      }
    };
    
    fetchUserInfo();
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [email]);

  const handleAddWater = async (amount) => {
    const newTotal = waterIntake + amount;
    setWaterIntake(newTotal);
    
    try {
      await axios.post("http://localhost:3001/addWaterIntake", { 
        email, 
        amount,
        total: newTotal,
        timestamp: new Date().toISOString()
      });
      
      // Update history with the new entry
      const historyEntry = {
        amount,
        timestamp: new Date().toISOString(),
        total: newTotal
      };
      
      setWaterHistory([...waterHistory, historyEntry]);
    } catch (err) {
      console.error("Error updating water intake:", err);
      // Revert the update if the API call fails
      setWaterIntake(waterIntake);
    }
  };
  
  const resetWaterIntake = async () => {
    if (window.confirm("Are you sure you want to reset your water intake for today?")) {
      try {
        await axios.post("http://localhost:3001/resetWaterIntake", { email });
        setWaterIntake(0);
        // Update water history by keeping entries from previous days
        const todayDate = new Date().toISOString().split("T")[0];
        const previousHistory = waterHistory.filter(entry => {
          const entryDate = new Date(entry.timestamp).toISOString().split("T")[0];
          return entryDate !== todayDate;
        });
        setWaterHistory(previousHistory);
      } catch (err) {
        console.error("Error resetting water intake:", err);
      }
    }
  };

  const WaterProgressBar = () => {
    const percentage = Math.min(100, (waterIntake / waterGoal) * 100);
    
    return (
      <div className="water-progress-container">
        <div className="water-progress-header">
          <span>
            <FontAwesomeIcon icon={faWater} /> Daily Water Intake
          </span>
          <span>
            {waterIntake} / {waterGoal} ml
          </span>
        </div>
        <div className="water-progress-bar-bg">
          <div 
            className="water-progress-bar"
            style={{ width: `${percentage}%` }}
          >
            <div className="water-progress-waves"></div>
          </div>
        </div>
        <div className="water-percentage">
          {percentage.toFixed(0)}% of daily goal
        </div>
      </div>
    );
  };

  const WaterButtons = () => {
    const standardAmounts = [100, 250, 500];
    
    return (
      <div className="water-buttons-container">
        <div className="water-buttons-header">
          <h3>Add Water Intake</h3>
        </div>
        <div className="water-preset-buttons">
          {standardAmounts.map(amount => (
            <button 
              key={amount} 
              className="water-btn"
              onClick={() => handleAddWater(amount)}
            >
              <FontAwesomeIcon icon={faGlassWhiskey} />
              <span>{amount} ml</span>
            </button>
          ))}
        </div>
        <div className="water-custom-input">
          <div className="custom-amount-controls">
            <button 
              className="water-control-btn"
              onClick={() => setCustomAmount(Math.max(50, customAmount - 50))}
            >
              <FontAwesomeIcon icon={faMinus} />
            </button>
            <div className="custom-amount-display">
              <span>{customAmount} ml</span>
            </div>
            <button 
              className="water-control-btn"
              onClick={() => setCustomAmount(customAmount + 50)}
            >
              <FontAwesomeIcon icon={faPlus} />
            </button>
          </div>
          <button 
            className="water-add-custom-btn"
            onClick={() => handleAddWater(customAmount)}
          >
            Add Custom Amount
          </button>
        </div>
        <button 
          className="water-reset-btn"
          onClick={resetWaterIntake}
        >
          Reset Today's Intake
        </button>
      </div>
    );
  };

  const WaterHistory = () => {
    // Sort history by timestamp, most recent first
    const sortedHistory = [...waterHistory].sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    // Group entries by date
    const groupedHistory = sortedHistory.reduce((groups, entry) => {
      const date = new Date(entry.timestamp).toISOString().split('T')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
      return groups;
    }, {});
    
    return (
      <div className="water-history-container">
        <div className="water-history-header">
          <h3>
            <FontAwesomeIcon icon={faHistory} /> Water Intake History
          </h3>
        </div>
        {Object.keys(groupedHistory).length === 0 ? (
          <div className="water-history-empty">
            <p>No water intake recorded yet. Start drinking and tracking!</p>
          </div>
        ) : (
          <div className="water-history-list">
            {Object.entries(groupedHistory).map(([date, entries]) => (
              <div key={date} className="water-history-day">
                <div className="water-history-date">
                  {new Date(date).toLocaleDateString(undefined, { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </div>
                {entries.map((entry, index) => (
                  <div key={index} className="water-history-entry">
                    <div className="water-history-time">
                      {new Date(entry.timestamp).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    <div className="water-history-amount">
                      <FontAwesomeIcon icon={faTint} /> {entry.amount} ml
                    </div>
                    <div className="water-history-total">
                      Total: {entry.total} ml
                    </div>
                  </div>
                ))}
                <div className="water-history-daily-total">
                  Daily Total: {entries.reduce((sum, entry) => sum + entry.amount, 0)} ml
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const WaterTips = () => {
    const pregnancyWaterTips = [
      "Stay hydrated throughout the day—don't wait until you're thirsty.",
      "Drink a glass of water first thing in the morning to kickstart hydration.",
      "Carry a water bottle with you everywhere you go.",
      "Infuse water with fresh fruits or herbs to make it more appealing.",
      "Set reminders to drink water every hour.",
      `For your ${userInfo.trimester === 1 ? "first" : userInfo.trimester === 2 ? "second" : "third"} trimester, aim for at least ${(waterGoal/1000).toFixed(1)} liters daily.`,
      "Good hydration can help reduce pregnancy symptoms like constipation and UTIs.",
      userInfo.pregnancyType !== "single" ? "Multiple pregnancies require extra water intake." : "Water supports amniotic fluid formation and placental health."
    ];
    
    return (
      <div className="water-tips-container">
        <div className="water-tips-header">
          <h3>
            <FontAwesomeIcon icon={faInfoCircle} /> Hydration Tips for Pregnancy
          </h3>
        </div>
        <ul className="water-tips-list">
          {pregnancyWaterTips.map((tip, index) => (
            <li key={index} className="water-tip">
              <FontAwesomeIcon icon={faTint} className="water-tip-icon" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  const logout = () => {
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading your hydration data...</p>
      </div>
    );
  }

  // Get current path for active menu item
  const currentPath = location.pathname.toLowerCase();

  return (
    <div className="container">
      {/* Sidebar - Same as in Home component */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <FontAwesomeIcon icon={faHeartbeat} />
          </div>
          <h2 className="sidebar-title">MomNutrition</h2>
          <div className="sidebar-toggle" onClick={toggleSidebar}>
            <FontAwesomeIcon className="sidebar-toggle-icon" icon={faChevronLeft} />
          </div>
        </div>
        
        {/* User Profile Section */}
        <div className="user-profile">
          <div className="profile-avatar">
            <FontAwesomeIcon icon={faUser} />
          </div>
          <div className="profile-info">
            <div className="profile-name">{userName || "Mom"}</div>
            <div className="profile-status">
              {bpm ? `Heartbeat: ${bpm} BPM` : "Loading..."}
            </div>
          </div>
        </div>
        
        {/* Navigation Items */}
        <ul className="sidebar-nav">
          <li className="nav-item">
            <div 
              onClick={() => navigate('/Dashboard', { state: { email } })}
              className={`nav-link ${currentPath.includes('dashboard') ? 'active' : ''}`}
              style={{ cursor: 'pointer' }}
            >
              <div className="nav-icon">
                <FontAwesomeIcon icon={faHome} />
              </div>
              <span className="nav-text">Dashboard</span>
            </div>
            <span className="nav-tooltip">Dashboard</span>
          </li>
          
          <li className="nav-item">
            <div 
              onClick={() => navigate('/Meals', { state: { email } })}
              className={`nav-link ${currentPath.includes('meals') ? 'active' : ''}`}
              style={{ cursor: 'pointer' }}
            >
              <div className="nav-icon">
                <FontAwesomeIcon icon={faUtensils} />
              </div>
              <span className="nav-text">My Meals</span>
            </div>
            <span className="nav-tooltip">My Meals</span>
          </li>
          
          <li className="nav-item">
            <div 
              onClick={() => navigate('/Water', { state: { email } })}
              className="nav-link active"
              style={{ cursor: 'pointer' }}
            >
              <div className="nav-icon">
                <FontAwesomeIcon icon={faWater} />
              </div>
              <span className="nav-text">Water Tracker</span>
            </div>
            <span className="nav-tooltip">Water Tracker</span>
          </li>
          
          <li className="nav-item">
            <div 
              onClick={() => navigate('/Progress', { state: { email } })}
              className={`nav-link ${currentPath.includes('progress') ? 'active' : ''}`}
              style={{ cursor: 'pointer' }}
            >
              <div className="nav-icon">
                <FontAwesomeIcon icon={faChartLine} />
              </div>
              <span className="nav-text">Progress</span>
            </div>
            <span className="nav-tooltip">Progress</span>
          </li>
          
          <li className="nav-item">
            <div 
              onClick={() => navigate('/Suggestion', { state: { email } })}
              className={`nav-link ${currentPath.includes('suggestion') ? 'active' : ''}`}
              style={{ cursor: 'pointer' }}
            >
              <div className="nav-icon">
                <FontAwesomeIcon icon={faLightbulb} />
              </div>
              <span className="nav-text">Suggestions</span>
            </div>
            <span className="nav-tooltip">Suggestions</span>
          </li>
          
          <li className="nav-item" style={{ marginTop: 'auto' }}>
            <div 
              className="nav-link"
              onClick={logout}
              style={{ cursor: 'pointer' }}
            >
              <div className="nav-icon">
                <FontAwesomeIcon icon={faSignOutAlt} />
              </div>
              <span className="nav-text">Logout</span>
            </div>
            <span className="nav-tooltip">Logout</span>
          </li>
        </ul>
        
        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          Nourishing 
          <FontAwesomeIcon icon={faHeart} className="footer-heart" />
          lives
        </div>
      </aside>

      {/* Main Content */}
      <main className={`main-content ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
        <h1 className="main-title">
          Water Tracker <FontAwesomeIcon icon={faWater} className="water-title-icon" />
        </h1>
        
        <div className="water-tracker-content">
          <div className="water-left-column">
            <WaterProgressBar />
            <WaterButtons />
            <WaterTips />
          </div>
          <div className="water-right-column">
            <WaterHistory />
          </div>
        </div>
      </main>
    </div>
  );
};

export default WaterTracker;