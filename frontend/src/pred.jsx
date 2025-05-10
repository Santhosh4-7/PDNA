import { useState } from "react";
import { useNavigate } from "react-router-dom"; // 👈 Import this
import "./pred.css";
import axios from 'axios';

function Pred() {
  const navigate = useNavigate(); // 👈 Create navigate function

  const [formData, setFormData] = useState({
    missed_period: "",
    nausea_vomiting: "",
    sensitivity_smells: "",
    fatigue: "",
    breast_changes: "",
    food_cravings: "",
    light_spotting: "",
    bloating: "",
    frequent_urination: "",
    mood_swings: "",
    dizziness: "",
    low_grade_fever: "",
    metallic_taste: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const userEmail = localStorage.getItem('userEmail');
    if (!userEmail) {
      alert("You must be logged in to predict.");
      window.location.href = "/signup";
      return;
    }

    const preparedData = [
      Number(formData.missed_period),
      Number(formData.nausea_vomiting),
      Number(formData.sensitivity_smells),
      Number(formData.fatigue),
      Number(formData.breast_changes),
      Number(formData.food_cravings),
      Number(formData.light_spotting),
      Number(formData.bloating),
      Number(formData.frequent_urination),
      Number(formData.mood_swings),
      Number(formData.dizziness),
      Number(formData.low_grade_fever),
      Number(formData.metallic_taste),
    ];

    axios.post('http://localhost:3001/predict', {
      inputArray: preparedData,
      email: userEmail,
    })
    .then((response) => {
      console.log("Prediction result:", response.data);
      // ✅ Redirect to home after prediction
      navigate("/login");
    })
    .catch((error) => {
      console.error("Error:", error);
    });
  };

  return (
    <div className="pred-container">
      <h1 className="title">Pregnancy Prediction</h1>

      <form className="pred-form" onSubmit={handleSubmit}>
        {/* All form fields based on the new symptom questions */}
        <label>Missed period (7+ days late):</label>
        <select name="missed_period" value={formData.missed_period} onChange={handleChange} required>
          <option value="">Select</option>
          <option value="1">Yes</option>
          <option value="0">No</option>
        </select>

        <label>Nausea or vomiting (especially morning):</label>
        <select name="nausea_vomiting" value={formData.nausea_vomiting} onChange={handleChange} required>
          <option value="">Select</option>
          <option value="1">Yes</option>
          <option value="0">No</option>
        </select>

        <label>Increased sensitivity to smells:</label>
        <select name="sensitivity_smells" value={formData.sensitivity_smells} onChange={handleChange} required>
          <option value="">Select</option>
          <option value="1">Yes</option>
          <option value="0">No</option>
        </select>

        <label>Unusual fatigue or sleepiness:</label>
        <select name="fatigue" value={formData.fatigue} onChange={handleChange} required>
          <option value="">Select</option>
          <option value="1">Yes</option>
          <option value="0">No</option>
        </select>

        <label>Breast changes (soreness/fullness/darkened areolas):</label>
        <select name="breast_changes" value={formData.breast_changes} onChange={handleChange} required>
          <option value="">Select</option>
          <option value="1">Yes</option>
          <option value="0">No</option>
        </select>

        <label>Food cravings or aversions:</label>
        <select name="food_cravings" value={formData.food_cravings} onChange={handleChange} required>
          <option value="">Select</option>
          <option value="1">Yes</option>
          <option value="0">No</option>
        </select>

        <label>Light spotting or implantation bleeding:</label>
        <select name="light_spotting" value={formData.light_spotting} onChange={handleChange} required>
          <option value="">Select</option>
          <option value="1">Yes</option>
          <option value="0">No</option>
        </select>

        <label>Abdominal pressure or bloating:</label>
        <select name="bloating" value={formData.bloating} onChange={handleChange} required>
          <option value="">Select</option>
          <option value="1">Yes</option>
          <option value="0">No</option>
        </select>

        <label>Frequent urination:</label>
        <select name="frequent_urination" value={formData.frequent_urination} onChange={handleChange} required>
          <option value="">Select</option>
          <option value="1">Yes</option>
          <option value="0">No</option>
        </select>

        <label>Mood swings or emotional sensitivity:</label>
        <select name="mood_swings" value={formData.mood_swings} onChange={handleChange} required>
          <option value="">Select</option>
          <option value="1">Yes</option>
          <option value="0">No</option>
        </select>

        <label>Dizziness or lightheadedness:</label>
        <select name="dizziness" value={formData.dizziness} onChange={handleChange} required>
          <option value="">Select</option>
          <option value="1">Yes</option>
          <option value="0">No</option>
        </select>

        <label>Low-grade fever (~99°F / 37.2°C):</label>
        <select name="low_grade_fever" value={formData.low_grade_fever} onChange={handleChange} required>
          <option value="">Select</option>
          <option value="1">Yes</option>
          <option value="0">No</option>
        </select>

        <label>Metallic taste in mouth:</label>
        <select name="metallic_taste" value={formData.metallic_taste} onChange={handleChange} required>
          <option value="">Select</option>
          <option value="1">Yes</option>
          <option value="0">No</option>
        </select>

        <button type="submit" className="submit-btn">
          Predict
        </button>
      </form>
    </div>
  );
}

export default Pred;
