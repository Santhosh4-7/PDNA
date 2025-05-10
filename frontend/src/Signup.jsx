import { Link } from "react-router-dom";
import { useState } from "react";
import "./Signup.css";  // Import CSS for styling
import axios from 'axios'
import { useNavigate } from "react-router-dom";


function Signup() {
  const [name,setName] = useState()
  const [email,setEmail]  = useState()
  const [pregnancyType,setPtype] = useState("single")
  const [password,setPassword] = useState()
  const [height,setHeight] = useState()
  const [weight,setWeight] = useState()
  const [age,setAge] = useState()
  const navigate = useNavigate()
  const handleSubmit = (e) => {
    e.preventDefault();
    axios.post('http://localhost:3001/register', { name, email, password, pregnancyType, height, weight, age })
      .then(result => {
        console.log(result);
        // 👉 Save email to localStorage
        localStorage.setItem('userEmail', email);
        navigate('/pred'); // move to prediction page
      })
      .catch(err => console.log(err));
  };
  return (
    <div className="signup-container">
      <h2>Sign Up</h2>

      <form className="signup-form" onSubmit={handleSubmit}>
        <input type="text" name="name" placeholder="Full Name" onChange = {(e) => setName(e.target.value)} required />
        <input type="email" name="email" placeholder="Email" onChange = {(e) => setEmail(e.target.value)} required />
        <input type="password" name="password" placeholder="Password" onChange = {(e) => setPassword(e.target.value)} required />
        

        <select name="pregnancyType" onChange = {(e) => setPtype(e.target.value)} required>
          <option value="single">Single</option>
          <option value="twins">Twins</option>
          <option value="triplets">Triplets</option>
          
        </select>

        <input type="number" name="age" placeholder="Age" onChange = {(e) => setAge(e.target.value)} required />
        <input type="number" name="height" placeholder="Height (cm)" onChange = {(e) => setHeight(e.target.value)}required />
        <input type="number" name="weight" placeholder="Weight (kg)" onChange = {(e) => setWeight(e.target.value)}required />

        <button type="submit">Register</button>
      </form>

      <p>Already have an account?</p>
      <Link to="/login" className="login-link">Login</Link>
    </div>
  );
}

export default Signup;
