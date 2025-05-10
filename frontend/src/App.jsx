import { BrowserRouter, Routes, Route } from "react-router-dom";
import Signup from "./Signup";  // ✅ Import the Signup component
import { useState } from "react";
import { Navigate } from "react-router-dom";
import Login from "./Login"
import Home from "./home"
import Dashboard from "./Dashboard";
import Pred from "./pred";
import Meals from "./Meals";
import Progress from "./Progress";
import Suggestion from "./Suggestion";
import WaterTracker from './water_tracker';
import FoodFavorites from "./food_favourties";
import NutritionChatbot from "./chatbot";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<Navigate to='/login'/>}></Route>
        <Route path ='/register' element={<Signup />}></Route>
        <Route path="/home" element={<Home />} />
        <Route path ='/login' element = {<Login />}></Route>
        <Route path ='/Dashboard' element = {<Dashboard />}></Route>
        <Route path ='/pred' element = {<Pred />}></Route>
        <Route path ='/Meals' element = {<Meals />}></Route>
        <Route path="/Water" element={<WaterTracker />} />
        <Route path="/Favorites" element={<FoodFavorites />} />
        <Route path ='/Progress' element = {<Progress />}></Route>
        <Route path ='/Suggestion' element = {<Suggestion />}></Route>
        <Route path="/chatbot" element={<NutritionChatbot />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
