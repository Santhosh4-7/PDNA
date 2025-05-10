import { useState } from "react";
import "./Login.css";
import { Link, useNavigate } from "react-router-dom";   
import axios from 'axios';

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    axios.post('http://localhost:3001/login', { email, password })
      .then(result => {
        console.log("hi" + result.data);

        if (result.data == "Success")  {
          console.log(email);
          // ✅ Simple redirect if login successful
          navigate('/home',{state:{email}});
        } else {
          alert("Invalid email or password.");
        }
      })
      .catch(error => {
        console.error("Login failed:", error);
        alert("Login failed. Please try again.");
      });
  };

  return (
    <div className="login-container">
      <h2>Login</h2>

      <form className="login-form" onSubmit={handleSubmit}>
        <input
          type="email"
          name="email"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">Login</button>
      </form>

      <p>Don't have an account?</p>
      <Link to="/register" className="signup-link">Sign Up</Link>
    </div>
  );
}

export default Login;