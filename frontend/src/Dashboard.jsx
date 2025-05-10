import React, { useState, useEffect } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import "./Dashboard.css"; // 🔥 CSS file import

const User = () => {
  const location = useLocation();
  const email = location.state?.email || "";

  const [user, setUser] = useState({});
  const [age, setAge] = useState("");
  const [weight, setWeight] = useState("");
  const [trimester, setTrimester] = useState("");

  useEffect(() => {
    if (email) {
      axios.post("http://localhost:3001/get-user", { email }).then((res) => {
        setUser(res.data);
        setAge(res.data.age);
        setWeight(res.data.weight);
        setTrimester(res.data.trimester);
      });
    }
  }, [email]);

  const handleUpdate = async () => {
    try {
      const res = await axios.post("http://localhost:3001/update-user", {
        email,
        age,
        weight,
        trimester,
      });
      setUser(res.data);
      alert("Updated successfully");
    } catch (err) {
      alert("Failed to update user");
    }
  };

  return (
    <div className="user-container">
      <h2 className="user-title">User Info: {user.name}</h2>
      <p className="user-info">Email: {user.email}</p>
      <p className="user-info">Pregnancy Type: {user.pregnancyType}</p>

      <div className="input-group">
        <label>Age:</label>
        <input value={age} onChange={(e) => setAge(e.target.value)} />
      </div>

      <div className="input-group">
        <label>Weight:</label>
        <input value={weight} onChange={(e) => setWeight(e.target.value)} />
      </div>

      <div className="input-group">
        <label>Trimester:</label>
        <input value={trimester} onChange={(e) => setTrimester(e.target.value)} />
      </div>

      <button className="update-button" onClick={handleUpdate}>Update Info</button>
    </div>
  );
};

export default User;
