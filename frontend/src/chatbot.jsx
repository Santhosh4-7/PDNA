import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./homes.css";
import "./chatbot.css";
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
  faStar,
  faRobot,
  faPaperPlane,
  faInfoCircle,
  faSpinner,
  faArrowRight,
  faTimes,
  faClock,
  faAppleAlt,
  faBaby
} from '@fortawesome/free-solid-svg-icons';

// Preset questions that users can quickly select
const PRESET_QUESTIONS = [
  "What foods should I eat more of in my trimester?",
  "How can I manage morning sickness with diet?",
  "What nutrients are most important during pregnancy?",
  "How much water should I drink daily?",
  "Are there foods I should avoid while pregnant?",
  "What snacks are healthy for pregnancy cravings?",
  "How can I get more iron in my diet?",
  "What helps with pregnancy heartburn?",
  "How to maintain healthy weight during pregnancy?",
  "What foods help with pregnancy constipation?"
];

// Time-based greeting for the bot
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

const NutritionChatbot = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [bpm, setBpm] = useState(null);
  const [userInfo, setUserInfo] = useState({});
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showPresets, setShowPresets] = useState(true);
  
  const chatEndRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  // Initial data loading
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
        const res = await axios.post("http://localhost:3001/getUserInfo", { email });
        const { name, trimester, pregnancyType, weight, height, age } = res.data;
        setUserName(name);
        setUserInfo({ name, trimester, pregnancyType, weight, height, age });
        
        // Add initial greeting message
        const welcomeMessage = {
          type: "bot",
          content: `${getGreeting()}, ${name}! I'm your pregnancy nutrition assistant. I'm here to provide guidance specific to your ${pregnancyType} pregnancy, currently in trimester ${trimester}. How can I help you today?`,
          timestamp: new Date()
        };
        
        setChatHistory([welcomeMessage]);
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching user data:", err);
        setIsLoading(false);
        
        // Fallback greeting if user data couldn't be loaded
        const fallbackMessage = {
          type: "bot",
          content: "Hello! I'm your pregnancy nutrition assistant. How can I help you today?",
          timestamp: new Date()
        };
        setChatHistory([fallbackMessage]);
      }
    };
    
    fetchUserInfo();
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [email]);

  // Auto-scroll to bottom of chat when history updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  // Handle user message submission
  const handleSubmit = async (e) => {
    e?.preventDefault(); // Handle form submission
    
    if (!userInput.trim() && !e?.currentTarget?.dataset?.preset) return;
    
    // Get message from input or preset
    const messageText = e?.currentTarget?.dataset?.preset || userInput;
    
    // Add user message to chat
    const userMessage = {
      type: "user",
      content: messageText,
      timestamp: new Date()
    };
    
    setChatHistory(prev => [...prev, userMessage]);
    setUserInput(""); // Clear input
    setIsTyping(true); // Show typing indicator
    setShowPresets(false); // Hide preset questions after user sends message
    
    try {
      // Make API request to get bot response
      // In a production app, this would connect to your backend chatbot API
      // For this demo, we'll simulate with local responses
      await generateBotResponse(messageText);
    } catch (err) {
      console.error("Error getting chatbot response:", err);
      const errorMessage = {
        type: "bot",
        content: "I'm sorry, I had trouble processing your question. Please try again.",
        timestamp: new Date()
      };
      setChatHistory(prev => [...prev, errorMessage]);
    }
    
    setIsTyping(false);
  };

  // Generate bot response based on user input and user data
  const generateBotResponse = async (userMessage) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    // Convert message to lowercase for easier matching
    const message = userMessage.toLowerCase();
    
    // Personalized responses based on user's pregnancy data
    let response;
    const trimester = userInfo.trimester;
    const pregnancyType = userInfo.pregnancyType;
    
    // Match different topics in the user's message
    if (message.includes("trimester") && message.includes("eat")) {
      if (trimester === 1) {
        response = "In your first trimester, focus on foods that help with nausea like ginger, small frequent meals, and easy-to-digest carbs. Folate-rich foods are crucial now: leafy greens, citrus fruits, and fortified grains. Even small nutrient-dense meals help when appetite is low.";
      } else if (trimester === 2) {
        response = "For your second trimester, you need more calcium, magnesium and vitamin D for your baby's developing bones. Include dairy products, fortified plant milks, leafy greens, and small fatty fish. Your appetite may improve now, so focus on quality protein and complex carbohydrates.";
      } else {
        response = "In your third trimester, focus on iron-rich foods to prevent anemia: lean meats, beans, spinach, and fortified cereals. Omega-3 fatty acids from fish, walnuts, and flaxseeds help with your baby's brain development. Small, frequent meals can help with limited stomach space.";
      }
      
      if (pregnancyType !== "single") {
        response += " With a multiple pregnancy, you'll need about 300 extra calories per baby, with extra protein and iron. Stay well-hydrated and consider smaller, more frequent meals as space gets tight.";
      }
    }
    else if (message.includes("morning sickness") || message.includes("nausea")) {
      response = "To manage morning sickness, try eating small, frequent meals and snacks rather than large meals. Ginger in various forms (tea, candies, capsules) can help reduce nausea. Keep plain crackers by your bed to eat before getting up. Stay hydrated with small sips throughout the day. Cold, tart foods like lemonade or watermelon can sometimes help. Avoid trigger smells and fatty, spicy foods.";
    }
    else if (message.includes("nutrients") || message.includes("vitamins")) {
      response = "Key nutrients during pregnancy include:\n• Folate/Folic Acid: prevents neural tube defects\n• Iron: supports increased blood volume\n• Calcium: builds baby's bones and teeth\n• Vitamin D: helps calcium absorption\n• DHA/Omega-3: supports baby's brain development\n• Iodine: essential for thyroid and brain development\n• Choline: important for baby's brain\n\nYour prenatal vitamin helps, but food sources are also important!";
    }
    else if (message.includes("water") || message.includes("drink")) {
      let waterAmount = Math.round(userInfo.weight * 30/1000 * 10)/10; // 30ml per kg, converted to liters
      
      if (trimester === 2) {
        waterAmount += 0.3; // Additional 300ml in second trimester
      } else if (trimester === 3) {
        waterAmount += 0.5; // Additional 500ml in third trimester
      }
      
      if (pregnancyType !== "single") {
        waterAmount += 0.4; // Additional for multiple pregnancy
      }
      
      response = `You should aim for about ${waterAmount} liters of water daily. Water supports amniotic fluid, increased blood volume, and helps prevent constipation and UTIs. Hydration needs increase throughout pregnancy, especially in the later trimesters. Carry a water bottle and track your intake throughout the day.`;
    }
    else if (message.includes("avoid") || message.includes("shouldn't eat")) {
      response = "Foods to avoid during pregnancy include:\n• Raw or undercooked meat, fish, and eggs\n• Unpasteurized dairy products\n• High-mercury fish (shark, swordfish, king mackerel, tilefish)\n• Raw sprouts\n• Excess caffeine (limit to 200mg daily)\n• Alcohol (no safe amount)\n• Processed deli meats unless heated\n• Unpasteurized juices\n\nAlways wash fruits and vegetables thoroughly.";
    }
    else if (message.includes("snacks") || message.includes("craving")) {
      response = "Healthy pregnancy snack ideas:\n• Greek yogurt with berries and granola\n• Apple slices with peanut butter\n• Hummus with vegetable sticks\n• Trail mix with nuts and dried fruits\n• Cheese and whole grain crackers\n• Hard-boiled eggs\n• Avocado toast\n• Smoothies with yogurt and fruit\n• Cottage cheese with fruit\n• Edamame\n\nThese provide protein, healthy fats, and complex carbs to maintain energy and blood sugar.";
    }
    else if (message.includes("iron")) {
      response = "To boost iron intake:\n• Eat lean red meat 1-2 times weekly\n• Include plant sources like lentils, beans, tofu, spinach, and fortified cereals\n• Pair with vitamin C foods to improve absorption (citrus, strawberries, bell peppers)\n• Cook in cast iron pots\n• Avoid consuming iron foods with calcium or coffee/tea (they inhibit absorption)\n• Consider a separate iron supplement if advised by your doctor, especially if you're anemic";
      
      if (pregnancyType !== "single") {
        response += "\n\nWith your multiple pregnancy, iron needs are higher to support increased blood volume and prevent anemia.";
      }
    }
    else if (message.includes("heartburn")) {
      response = "For pregnancy heartburn relief:\n• Eat smaller, more frequent meals\n• Avoid spicy, greasy, or acidic foods\n• Don't lie down for 2-3 hours after eating\n• Sleep with your upper body elevated\n• Avoid tight clothing\n• Yogurt, milk, or a small amount of almonds can help neutralize stomach acid\n• Ginger tea may help (also good for nausea)\n• Papaya (not papaya seeds) can be soothing\n• Consult your doctor before taking any antacids";
    }
    else if (message.includes("weight") || message.includes("gaining")) {
      let recommendedGain;
      
      const bmi = userInfo.weight / ((userInfo.height/100) * (userInfo.height/100));
      
      if (pregnancyType === "single") {
        if (bmi < 18.5) recommendedGain = "12.5-18 kg (28-40 lbs)";
        else if (bmi < 25) recommendedGain = "11.5-16 kg (25-35 lbs)";
        else if (bmi < 30) recommendedGain = "7-11.5 kg (15-25 lbs)";
        else recommendedGain = "5-9 kg (11-20 lbs)";
      } else if (pregnancyType === "twin") {
        if (bmi < 18.5) recommendedGain = "22.7-28.1 kg (50-62 lbs)";
        else if (bmi < 25) recommendedGain = "16.8-24.5 kg (37-54 lbs)";
        else if (bmi < 30) recommendedGain = "14.1-22.7 kg (31-50 lbs)";
        else recommendedGain = "11.3-19.1 kg (25-42 lbs)";
      } else { // triplets or more
        recommendedGain = "consult with your healthcare provider for specific guidelines, but typically 23-36 kg (50-80 lbs)";
      }
      
      response = `With your current metrics (${pregnancyType} pregnancy, BMI around ${Math.round(bmi)}), the recommended weight gain is ${recommendedGain}. Focus on quality of food rather than quantity. Aim for nutrient-dense foods, regular physical activity as approved by your doctor, and consistent, gradual weight gain throughout pregnancy.`;
    }
    else if (message.includes("constipation")) {
      response = "Foods that help with pregnancy constipation:\n• High-fiber fruits like prunes, pears, apples with skin, berries\n• Vegetables, especially leafy greens, broccoli, and Brussels sprouts\n• Whole grains like oatmeal, brown rice, whole wheat bread\n• Beans and lentils\n• Chia and flax seeds\n• Plenty of water (dehydration worsens constipation)\n• Moderate physical activity\n\nIncrease fiber gradually to avoid gas and bloating. Talk to your doctor before taking any fiber supplements.";
    }
    else {
      // General response for unmatched messages
      response = "Thanks for your question about " + userMessage + ". Nutrition during pregnancy is very important, especially during your " + 
        (trimester === 1 ? "first" : trimester === 2 ? "second" : "third") + 
        " trimester. I recommend discussing specific dietary concerns with your healthcare provider, who can give personalized advice for your " + 
        pregnancyType + " pregnancy. Would you like to know more about recommended foods, nutrients, or meal planning?";
    }
    
    // Add bot response to chat history
    const botMessage = {
      type: "bot",
      content: response,
      timestamp: new Date()
    };
    
    setChatHistory(prev => [...prev, botMessage]);
  };

  // Handling preset question selection
  const handlePresetQuestion = (question) => {
    // Create synthetic event with dataset property
    const syntheticEvent = {
      preventDefault: () => {},
      currentTarget: {
        dataset: { preset: question }
      }
    };
    
    handleSubmit(syntheticEvent);
  };

  // Format date for chat timestamp
  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const logout = () => {
    navigate('/login');
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading your nutrition assistant...</p>
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
              onClick={() => navigate('/Favorites', { state: { email } })}
              className={`nav-link ${currentPath.includes('favorites') ? 'active' : ''}`}
              style={{ cursor: 'pointer' }}
            >
              <div className="nav-icon">
                <FontAwesomeIcon icon={faStar} />
              </div>
              <span className="nav-text">Favorites</span>
            </div>
            <span className="nav-tooltip">Favorites</span>
          </li>
          
          <li className="nav-item">
            <div 
              onClick={() => navigate('/Water', { state: { email } })}
              className={`nav-link ${currentPath.includes('water') ? 'active' : ''}`}
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
              onClick={() => navigate('/Chatbot', { state: { email } })}
              className="nav-link active"
              style={{ cursor: 'pointer' }}
            >
              <div className="nav-icon">
                <FontAwesomeIcon icon={faRobot} />
              </div>
              <span className="nav-text">Nutrition AI</span>
            </div>
            <span className="nav-tooltip">Nutrition AI</span>
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
          Nutrition Assistant <FontAwesomeIcon icon={faRobot} className="chatbot-title-icon" />
        </h1>
        
        <div className="chatbot-container">
          <div className="chatbot-header">
            <div className="chatbot-header-icon">
              <FontAwesomeIcon icon={faBaby} />
            </div>
            <div className="chatbot-header-title">
              <h2>Pregnancy Nutrition Guide</h2>
              <p>Ask me anything about your pregnancy nutrition needs</p>
            </div>
          </div>
          
          <div className="chat-messages">
            {chatHistory.map((message, index) => (
              <div 
                key={index} 
                className={`chat-message ${message.type === 'user' ? 'user-message' : 'bot-message'}`}
              >
                <div className="message-content">
                  {message.type === 'user' ? (
                    <div className="user-avatar">
                      <FontAwesomeIcon icon={faUser} />
                    </div>
                  ) : (
                    <div className="bot-avatar">
                      <FontAwesomeIcon icon={faAppleAlt} />
                    </div>
                  )}
                  <div className="message-bubble">
                    <div className="message-text">{message.content}</div>
                    <div className="message-time">{formatTime(message.timestamp)}</div>
                  </div>
                </div>
              </div>
            ))}
            
            {isTyping && (
              <div className="chat-message bot-message">
                <div className="message-content">
                  <div className="bot-avatar">
                    <FontAwesomeIcon icon={faAppleAlt} />
                  </div>
                  <div className="message-bubble typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>
          
          {showPresets && (
            <div className="preset-questions">
              <div className="preset-header">
                <h3>
                  <FontAwesomeIcon icon={faClock} /> Quick Questions
                </h3>
                <button 
                  className="close-presets-btn"
                  onClick={() => setShowPresets(false)}
                >
                  <FontAwesomeIcon icon={faTimes} />
                </button>
              </div>
              <div className="preset-buttons">
                {PRESET_QUESTIONS.map((question, index) => (
                  <button 
                    key={index}
                    className="preset-btn"
                    onClick={() => handlePresetQuestion(question)}
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <form className="chat-input-form" onSubmit={handleSubmit}>
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Ask about pregnancy nutrition..."
              disabled={isTyping}
              className="chat-input"
            />
            <button 
              type="submit" 
              className="chat-submit-btn"
              disabled={isTyping || !userInput.trim()}
            >
              <FontAwesomeIcon icon={faPaperPlane} />
            </button>
          </form>
          
          <div className="chatbot-footer">
            <div className="chatbot-footer-info">
              <FontAwesomeIcon icon={faInfoCircle} />
              <span>
                This assistant provides general nutrition information. Always consult your healthcare provider for medical advice.
              </span>
            </div>
            
            {!showPresets && (
              <button 
                className="show-presets-btn"
                onClick={() => setShowPresets(true)}
              >
                <FontAwesomeIcon icon={faArrowRight} /> Show Quick Questions
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default NutritionChatbot;