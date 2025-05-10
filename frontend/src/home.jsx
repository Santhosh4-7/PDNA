import React, { useEffect, useState } from "react";
import axios from "axios";
import { EnhancedHeartbeatDisplay } from './heartbeat_frontend';
import "./homes.css"; // Import the enhanced CSS
import { useLocation, Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStar, faWater,faRobot } from '@fortawesome/free-solid-svg-icons';
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
  faSun,
  faCoffee,
  faMoon,
  faSearch,
  faFire,
  faDrumstickBite,
  faBreadSlice,
  faOilCan,
  faPlus,
  faTimes
} from '@fortawesome/free-solid-svg-icons';

const baseTargets = {
  single: { calories: 2200, protein: 71, carbs: 175, fats: 77 },
  twin: { calories: 2600, protein: 85, carbs: 200, fats: 90 },
  triplet: { calories: 3000, protein: 95, carbs: 220, fats: 100 },
};

// Get meal icon based on meal type
const getMealIcon = (meal) => {
  switch(meal) {
    case 'breakfast':
      return faSun;
    case 'lunch':
      return faCoffee;
    case 'dinner':
      return faMoon;
    default:
      return faUtensils;
  }
};

// Get nutrient icon based on nutrient type
const getNutrientIcon = (nutrient) => {
  switch(nutrient) {
    case 'calories':
      return faFire;
    case 'protein':
      return faDrumstickBite;
    case 'carbs':
      return faBreadSlice;
    case 'fats':
      return faOilCan;
    default:
      return faFire;
  }
};

const Home = () => {
  const [bpm, setBpm] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [animateProgress, setAnimateProgress] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;
  console.log("Email in Home:", email);

  const [nutrients, setNutrients] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
  });
  const [userName, setUserName] = useState("");
  const [targets, setTargets] = useState(null);
  const [foodResult, setFoodResult] = useState(null);
  const [selectedMeal, setSelectedMeal] = useState(null);

  const [searchQuery, setSearchQuery] = useState({
    breakfast: "",
    lunch: "",
    dinner: "",
  });

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };
  const handleAddToFavorites = async () => {
    if (!foodResult) return;
    
    // Create favorite food object with meal type
    const favorite = {
      name: foodResult.name,
      image: foodResult.image,
      calories: foodResult.nutrients.calories,
      protein: foodResult.nutrients.protein,
      carbs: foodResult.nutrients.carbs,
      fats: foodResult.nutrients.fats,
      mealType: selectedMeal || 'breakfast'
    };
    
    try {
      await axios.post("http://localhost:3001/addFavorite", { 
        email,
        food: favorite
      });
      
      alert(`${foodResult.name} added to favorites!`);
    } catch (err) {
      console.error("Error adding to favorites:", err);
      alert("Failed to add to favorites");
    }
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

    // Load user data and nutrients
    Promise.all([
      axios.post("http://localhost:3001/getUserInfo", { email }),
      axios.post("http://localhost:3001/getitems", { email })
    ])
    .then(([userInfoRes, itemsRes]) => {
      // Process user info
      const { trimester, pregnancyType, name } = userInfoRes.data;
      setUserName(name);

      const base = baseTargets[pregnancyType];
      let calMult, mult;

      if (trimester === 1) {
        calMult = 1;
        mult = 1;
      } else if (trimester === 2) {
        calMult = 1.2;
        mult = 1.1;
      } else {
        calMult = 1.5;
        mult = 1.3;
      }

      const targetValues = {
        calories: base.calories * calMult,
        protein: base.protein * mult,
        carbs: base.carbs * mult,
        fats: base.fats * mult,
      };

      setTargets(targetValues);
      
      // Process items/food data
      let total = { calories: 0, protein: 0, carbs: 0, fats: 0 };
      itemsRes.data.forEach((food) => {
        total.calories += food.calories;
        total.protein += food.protein;
        total.carbs += food.carbs;
        total.fats += food.fats;
      });
      
      setNutrients(total);
      setIsLoading(false);
      
      // Delay progress bar animation for a visual effect
      setTimeout(() => {
        setAnimateProgress(true);
      }, 500);
    })
    .catch((err) => {
      console.error("Error fetching data:", err);
      setIsLoading(false);
    });
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [email]);

  const handleSearch = async (mealType) => {
    setSelectedMeal(mealType);
    const query = searchQuery[mealType];
    if (!query) return;

    try {
      const res = await axios.get(
        "https://api.spoonacular.com/food/ingredients/search",
        {
          params: { query, apiKey: "160d9a92cd474e7685d28c220f891c67" },
        }
      );
      const item = res.data.results[0];
      if (!item) return alert("Food not found");

      const nutRes = await axios.get(
        `https://api.spoonacular.com/food/ingredients/${item.id}/information`,
        {
          params: {
            amount: 100,
            unit: "grams",
            apiKey: "160d9a92cd474e7685d28c220f891c67",
          },
        }
      );

      const nutData = nutRes.data.nutrition.nutrients;
      const info = {
        name: item.name,
        image: `https://spoonacular.com/cdn/ingredients_100x100/${item.image}`,
        nutrients: {
          calories: nutData.find((n) => n.name === "Calories")?.amount || 0,
          protein: nutData.find((n) => n.name === "Protein")?.amount || 0,
          carbs: nutData.find((n) => n.name === "Carbohydrates")?.amount || 0,
          fats: nutData.find((n) => n.name === "Fat")?.amount || 0,
        },
      };

      setFoodResult(info);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdd = () => {
    const { name, image, nutrients: added } = foodResult;
    const obj = {
      name,
      image,
      calories: added.calories,
      protein: added.protein,
      carbs: added.carbs,
      fats: added.fats,
    };

    axios
      .post("http://localhost:3001/additem", { foods: obj, email })
      .then((res) => console.log(res))
      .catch((err) => console.log(err));

    // Update local state with new values
    setNutrients((prev) => ({
      calories: prev.calories + added.calories,
      protein: prev.protein + added.protein,
      carbs: prev.carbs + added.carbs,
      fats: prev.fats + added.fats,
    }));

    // Reset food result and search query
    setFoodResult(null);
    setSearchQuery({ ...searchQuery, [selectedMeal]: "" });
  };

  const handleCancel = () => {
    setFoodResult(null);
  };

  const logout = () => {
    // Clear any stored user state or tokens
    navigate('/login');
  };

  const ProgressBar = ({ label, value, total, color }) => {
    const percentage = Math.min(100, (value / total) * 100);
    const animatedWidth = animateProgress ? `${percentage}%` : '0%';
    
    return (
      <div className="progress-bar-container">
        <div className="progress-bar-header">
          <span>{label}</span>
          <span>
            {Math.min(value, total).toFixed(0)} / {total.toFixed(0)}
          </span>
        </div>
        <div className="progress-bar-bg">
          <div
            className={`progress-bar ${color}`}
            style={{ width: animatedWidth }}
          />
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading your nutrition data...</p>
      </div>
    );
  }

  if (!targets) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading target values...</p>
      </div>
    );
  }

  // Get current path for active menu item
  const currentPath = location.pathname.toLowerCase();

  return (
    <div className="container">
      {/* Enhanced Sidebar */}
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
            <Link 
              to="/Favorites" 
              state={{ email }} 
              className={`nav-link ${currentPath.includes('favorites') ? 'active' : ''}`}
            >
              <div className="nav-icon">
                <FontAwesomeIcon icon={faStar} />
              </div>
              <span className="nav-text">Favorites</span>
            </Link>
            <span className="nav-tooltip">Favorites</span>
          </li>

          <li className="nav-item">
            <Link 
              to="/Water" 
              state={{ email }} 
              className={`nav-link ${currentPath.includes('water') ? 'active' : ''}`}
            >
              <div className="nav-icon">
                <FontAwesomeIcon icon={faWater} />
              </div>
              <span className="nav-text">Water Tracker</span>
            </Link>
            <span className="nav-tooltip">Water Tracker</span>
          </li>                      
          <li className="nav-item">
            <Link 
              to="/Dashboard" 
              state={{ email }} 
              className={`nav-link ${currentPath.includes('dashboard') ? 'active' : ''}`}
            >
              <div className="nav-icon">
                <FontAwesomeIcon icon={faHome} />
              </div>
              <span className="nav-text">Dashboard</span>
            </Link>
            <span className="nav-tooltip">Dashboard</span>
          </li>
          <li className="nav-item">
            <Link 
              to="/Chatbot" 
              state={{ email }} 
              className={`nav-link ${currentPath.includes('chatbot') ? 'active' : ''}`}
            >
              <div className="nav-icon">
                <FontAwesomeIcon icon={faRobot} />
              </div>
              <span className="nav-text">Nutrition AI</span>
            </Link>
            <span className="nav-tooltip">Nutrition AI</span>
          </li>
          <li className="nav-item">
            <Link 
              to="/Meals" 
              state={{ email }} 
              className={`nav-link ${currentPath.includes('meals') ? 'active' : ''}`}
            >
              <div className="nav-icon">
                <FontAwesomeIcon icon={faUtensils} />
              </div>
              <span className="nav-text">My Meals</span>
            </Link>
            <span className="nav-tooltip">My Meals</span>
          </li>
          
          <li className="nav-item">
            <Link 
              to="/Progress" 
              state={{ email }} 
              className={`nav-link ${currentPath.includes('progress') ? 'active' : ''}`}
            >
              <div className="nav-icon">
                <FontAwesomeIcon icon={faChartLine} />
              </div>
              <span className="nav-text">Progress</span>
            </Link>
            <span className="nav-tooltip">Progress</span>
          </li>
          
          <li className="nav-item">
            <Link 
              to="/Suggestion" 
              state={{ email }} 
              className={`nav-link ${currentPath.includes('suggestion') ? 'active' : ''}`}
            >
              <div className="nav-icon">
                <FontAwesomeIcon icon={faLightbulb} />
              </div>
              <span className="nav-text">Suggestions</span>
            </Link>
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
          Welcome, {userName || "Mommy"} <span className="main-heart">❤️</span>
        </h1>

        {/* Heartbeat Animation */}
        <EnhancedHeartbeatDisplay email={email} />

        {/* Enhanced Nutrition Progress Bars */}
        <div className="progress-bars">
          <ProgressBar label="Calories" value={nutrients.calories} total={targets.calories} color="blue" />
          <ProgressBar label="Protein" value={nutrients.protein} total={targets.protein} color="green" />
          <ProgressBar label="Carbs" value={nutrients.carbs} total={targets.carbs} color="yellow" />
          <ProgressBar label="Fats" value={nutrients.fats} total={targets.fats} color="red" />
        </div>

        {/* Enhanced Meal Input Cards */}
        <div className="meal-inputs">
          {["breakfast", "lunch", "dinner"].map((meal) => (
            <div key={meal} className="meal-input-card">
              <h2 className="meal-title">
                <div className={`meal-icon ${meal}`}>
                  <FontAwesomeIcon icon={getMealIcon(meal)} />
                </div>
                {meal}
              </h2>
              <input
                className="meal-input"
                placeholder={`Add ${meal} item...`}
                value={searchQuery[meal]}
                onChange={(e) =>
                  setSearchQuery({ ...searchQuery, [meal]: e.target.value })
                }
              />
              <button
                onClick={() => handleSearch(meal)}
                className={`meal-search-btn ${meal}`}
              >
                <FontAwesomeIcon icon={faSearch} /> Search
              </button>
            </div>
          ))}
        </div>

        {/* Enhanced Food Preview Card */}
        {foodResult && (
          <div className="food-preview-card">
            <div className="food-preview-header">
              <img src={foodResult.image} alt={foodResult.name} className="food-image" />
              <div>
                <h3 className="food-name">{foodResult.name}</h3>
                <p className="food-serving">100g serving</p>
              </div>
            </div>
            
            <div className="food-nutrients">
              {/* Calories */}
              <div className="food-nutrient-item">
                <div className="nutrient-icon calories">
                  <FontAwesomeIcon icon={getNutrientIcon('calories')} />
                </div>
                <div className="nutrient-info">
                  <div className="nutrient-name">Calories</div>
                  <div className="nutrient-value">{foodResult.nutrients.calories.toFixed(1)} kcal</div>
                </div>
              </div>
              
              {/* Protein */}
              <div className="food-nutrient-item">
                <div className="nutrient-icon protein">
                  <FontAwesomeIcon icon={getNutrientIcon('protein')} />
                </div>
                <div className="nutrient-info">
                  <div className="nutrient-name">Protein</div>
                  <div className="nutrient-value">{foodResult.nutrients.protein.toFixed(1)}g</div>
                </div>
              </div>
              
              {/* Carbs */}
              <div className="food-nutrient-item">
                <div className="nutrient-icon carbs">
                  <FontAwesomeIcon icon={getNutrientIcon('carbs')} />
                </div>
                <div className="nutrient-info">
                  <div className="nutrient-name">Carbohydrates</div>
                  <div className="nutrient-value">{foodResult.nutrients.carbs.toFixed(1)}g</div>
                </div>
              </div>
              
              {/* Fats */}
              <div className="food-nutrient-item">
                <div className="nutrient-icon fats">
                  <FontAwesomeIcon icon={getNutrientIcon('fats')} />
                </div>
                <div className="nutrient-info">
                  <div className="nutrient-name">Fats</div>
                  <div className="nutrient-value">{foodResult.nutrients.fats.toFixed(1)}g</div>
                </div>
              </div>
            </div>
            
            <div className="food-buttons">
              <button onClick={handleCancel} className="cancel-btn">
                <FontAwesomeIcon icon={faTimes} /> Cancel
              </button>
              <button onClick={handleAdd} className="add-btn">
                <FontAwesomeIcon icon={faPlus} /> Add
              </button>

              <button onClick={() => handleAddToFavorites(foodResult)} className="favorite-btn">
               <FontAwesomeIcon icon={faStar} /> Favorite
               </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Home;