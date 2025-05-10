import React, { useEffect, useState } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";
import './Progress.module.css';

function Progress() {
  const location = useLocation();
  const email = location.state?.email;

  const [progressData, setProgressData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!email) return;

    axios
      .post("http://localhost:3001/getProgressData", { email })
      .then((res) => {
        console.log("Progress data", res.data);
        setProgressData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching progress data:", err);
        setLoading(false);
      });
  }, [email]);

  if (loading) return <p>Loading progress...</p>;
  if (!progressData || progressData.length === 0) return <p>No progress found.</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h2>Calorie Progress Chart for {email}</h2>

      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={progressData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis label={{ value: 'Calories', angle: -90, position: 'insideLeft' }} />
          <Tooltip />
          <Bar dataKey="calories" fill="#FFB6C1" /> {/* Light pink color */}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export default Progress;
