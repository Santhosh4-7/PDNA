import React, { useEffect, useState } from "react";
import axios from "axios";
import "./homes.css"; // Reuse our existing beautiful CSS
import { useLocation, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import "./food_favourites.css"
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
  faSearch,
  faStar,
  faTrashAlt,
  faPlus,
  faFilter,
  faSortAmountDown,
  faSortAmountUp,
  faCheck
} from '@fortawesome/free-solid-svg-icons';

const FoodFavorites = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [bpm, setBpm] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredFavorites, setFilteredFavorites] = useState([]);
  const [sortBy, setSortBy] = useState("name");
  const [sortDirection, setSortDirection] = useState("asc");
  const [selectedMeal, setSelectedMeal] = useState("all");
  const [addingToMeal, setAddingToMeal] = useState(null);

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

    // Fetch user info and favorites
    const fetchData = async () => {
      try {
        // Fetch user info
        const userRes = await axios.post("http://localhost:3001/getUserInfo", { email });
        setUserName(userRes.data.name);
        
        // Fetch favorites
        try {
          const favRes = await axios.post("http://localhost:3001/getFavorites", { email });
          setFavorites(favRes.data || []);
          setFilteredFavorites(favRes.data || []);
        } catch (err) {
          console.log("Favorites data not available yet");
          setFavorites([]);
          setFilteredFavorites([]);
        }
        
        setIsLoading(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        setIsLoading(false);
      }
    };
    
    fetchData();
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [email]);

  // Apply filters and sorting whenever dependencies change
  useEffect(() => {
    let result = [...favorites];
    
    // Apply meal filter
    if (selectedMeal !== 'all') {
      result = result.filter(food => food.mealType === selectedMeal);
    }
    
    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(food => 
        food.name.toLowerCase().includes(term)
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let valueA, valueB;
      
      // Get the values to compare based on sortBy
      switch (sortBy) {
        case 'name':
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
          break;
        case 'calories':
        case 'protein':
        case 'carbs':
        case 'fats':
          valueA = a[sortBy];
          valueB = b[sortBy];
          break;
        default:
          valueA = a.name.toLowerCase();
          valueB = b.name.toLowerCase();
      }
      
      // Compare the values based on sort direction
      if (sortDirection === 'asc') {
        return valueA > valueB ? 1 : -1;
      } else {
        return valueA < valueB ? 1 : -1;
      }
    });
    
    setFilteredFavorites(result);
  }, [favorites, searchTerm, sortBy, sortDirection, selectedMeal]);

  const handleAddToFavorites = async (food) => {
    try {
      await axios.post("http://localhost:3001/addFavorite", { 
        email,
        food: {
          ...food,
          mealType: food.mealType || 'breakfast' // Default to breakfast if not specified
        }
      });
      
      // Update local state
      setFavorites([...favorites, {
        ...food,
        mealType: food.mealType || 'breakfast'
      }]);
      
      alert(`${food.name} added to favorites!`);
    } catch (err) {
      console.error("Error adding to favorites:", err);
    }
  };

  const handleRemoveFavorite = async (foodId) => {
    try {
      await axios.post("http://localhost:3001/removeFavorite", { 
        email,
        foodId
      });
      
      // Update local state
      const updatedFavorites = favorites.filter(food => food._id !== foodId);
      setFavorites(updatedFavorites);
    } catch (err) {
      console.error("Error removing favorite:", err);
    }
  };

  const handleAddToMeal = async (food) => {
    if (!addingToMeal) return;
    
    try {
      // Using the existing additem endpoint
      await axios.post("http://localhost:3001/additem", { 
        foods: { ...food, mealType: addingToMeal },
        email
      });
      
      alert(`${food.name} added to your ${addingToMeal} meal!`);
      setAddingToMeal(null);
    } catch (err) {
      console.error("Error adding to meal:", err);
    }
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      // If already sorting by this field, toggle direction
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Otherwise, sort by the new field in ascending order
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const SearchAndFilter = () => {
    return (
      <div className="favorites-search-filter">
        <div className="favorites-search">
          <input
            type="text"
            placeholder="Search favorites..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="favorites-search-input"
          />
          <FontAwesomeIcon icon={faSearch} className="favorites-search-icon" />
        </div>
        
        <div className="favorites-filters">
          <div className="favorites-filter-item">
            <label>Meal Type:</label>
            <select 
              value={selectedMeal}
              onChange={(e) => setSelectedMeal(e.target.value)}
              className="favorites-select"
            >
              <option value="all">All Meals</option>
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
            </select>
          </div>
          
          <div className="favorites-filter-item">
            <button 
              className={`favorites-sort-btn ${sortBy === 'name' ? 'active' : ''}`}
              onClick={() => handleSort('name')}
            >
              Name
              {sortBy === 'name' && (
                <FontAwesomeIcon 
                  icon={sortDirection === 'asc' ? faSortAmountUp : faSortAmountDown} 
                />
              )}
            </button>
            
            <button 
              className={`favorites-sort-btn ${sortBy === 'calories' ? 'active' : ''}`}
              onClick={() => handleSort('calories')}
            >
              Calories
              {sortBy === 'calories' && (
                <FontAwesomeIcon 
                  icon={sortDirection === 'asc' ? faSortAmountUp : faSortAmountDown} 
                />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const NoFavorites = () => {
    return (
      <div className="no-favorites">
        <div className="no-favorites-icon">
          <FontAwesomeIcon icon={faStar} />
        </div>
        <h3>No Favorite Foods Yet</h3>
        <p>Add foods you eat regularly to your favorites for quick access.</p>
      </div>
    );
  };

  const FavoritesList = () => {
    if (filteredFavorites.length === 0) {
      if (searchTerm || selectedMeal !== 'all') {
        return (
          <div className="no-favorites">
            <p>No favorites match your search criteria.</p>
          </div>
        );
      }
      return <NoFavorites />;
    }
    
    return (
      <div className="favorites-list">
        {filteredFavorites.map((food, index) => (
          <div key={food._id || index} className="favorite-card">
            <div className="favorite-header">
              <div className="favorite-img-container">
                {food.image ? (
                  <img src={food.image} alt={food.name} className="favorite-img" />
                ) : (
                  <div className="favorite-img-placeholder">
                    <FontAwesomeIcon icon={faUtensils} />
                  </div>
                )}
              </div>
              <div className="favorite-info">
                <h3 className="favorite-name">{food.name}</h3>
                <div className="favorite-meal-type">
                  {food.mealType || 'Any meal'}
                </div>
              </div>
              <div className="favorite-actions">
                <button 
                  className="favorite-action-btn remove"
                  onClick={() => handleRemoveFavorite(food._id)}
                  title="Remove from favorites"
                >
                  <FontAwesomeIcon icon={faTrashAlt} />
                </button>
              </div>
            </div>
            
            <div className="favorite-nutrients">
              <div className="favorite-nutrient">
                <div className="favorite-nutrient-label">Calories</div>
                <div className="favorite-nutrient-value">{food.calories} kcal</div>
              </div>
              <div className="favorite-nutrient">
                <div className="favorite-nutrient-label">Protein</div>
                <div className="favorite-nutrient-value">{food.protein}g</div>
              </div>
              <div className="favorite-nutrient">
                <div className="favorite-nutrient-label">Carbs</div>
                <div className="favorite-nutrient-value">{food.carbs}g</div>
              </div>
              <div className="favorite-nutrient">
                <div className="favorite-nutrient-label">Fats</div>
                <div className="favorite-nutrient-value">{food.fats}g</div>
              </div>
            </div>
            
            <div className="favorite-footer">
              {addingToMeal === food._id ? (
                <div className="add-to-meal-select">
                  <div className="add-to-meal-options">
                    {['breakfast', 'lunch', 'dinner', 'snack'].map(meal => (
                      <button 
                        key={meal} 
                        className="meal-option-btn"
                        onClick={() => {
                          handleAddToMeal({...food, mealType: meal});
                        }}
                      >
                        {meal}
                      </button>
                    ))}
                  </div>
                  <button 
                    className="cancel-meal-btn"
                    onClick={() => setAddingToMeal(null)}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button 
                  className="add-to-meal-btn"
                  onClick={() => setAddingToMeal(food._id)}
                >
                  <FontAwesomeIcon icon={faPlus} /> Add to Today's Meals
                </button>
              )}
            </div>
          </div>
        ))}
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
        <p className="loading-text">Loading your favorite foods...</p>
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
              className="nav-link active"
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
          Favorite Foods <FontAwesomeIcon icon={faStar} className="favorites-title-icon" />
        </h1>
        
        <div className="favorites-explainer">
          <p>Save your most commonly eaten foods here for quick access. Add any food to your daily meals with just one click.</p>
        </div>
        
        <SearchAndFilter />
        
        <FavoritesList />
      </main>
    </div>
  );
};

export default FoodFavorites;