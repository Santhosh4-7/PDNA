import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import "./Meals.css";  // Make sure this CSS file is in the same folder or update the path accordingly.

const Meals = () => {
  const location = useLocation();
  const email = location.state?.email;
  const [foods, setFoods] = useState([]);

  useEffect(() => {
    if (!email) {
      console.error("No email provided.");
      return;
    }

    axios
      .post("http://localhost:3001/getitems", { email })
      .then((res) => {
        console.log("Foods retrieved:", res.data);
        setFoods(res.data);
      })
      .catch((err) => {
        console.error("Error fetching foods:", err);
      });
  }, [email]);

  return (
    <div className="meals-container">
      <h1 className="meals-header">My Meals</h1>
      {foods.length > 0 ? (
        <table className="meals-table animated fadeIn">
          <thead>
            <tr>
             
              <th>Food Name</th>
              <th>Calories</th>
              <th>Protein (g)</th>
              <th>Carbs (g)</th>
              <th>Fats (g)</th>
            </tr>
          </thead>
          <tbody>
            {foods.map((food, index) => (
              <tr key={index} className="animated slideInUp">
                
                <td>{food.name}</td>
                <td>{food.calories}</td>
                <td>{food.protein}</td>
                <td>{food.carbs}</td>
                <td>{food.fats}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="no-foods-message">No food records found.</p>
      )}
    </div>
  );
};

export default Meals;
