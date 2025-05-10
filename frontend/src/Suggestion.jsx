import React, { useState, useEffect } from "react";
import axios from "axios";
import { useLocation } from "react-router-dom";
import styles from "./Suggestion.module.css"; // Importing CSS module

const Suggestion = () => {
  const location = useLocation();
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const { email } = location.state || {};

  useEffect(() => {
    if (email) {
      const fetchSuggestions = async () => {
        setLoading(true);
        try {
          const response = await axios.post("http://localhost:3001/suggestions", { email });
          setSuggestions(response.data.suggestions);
          setLoading(false);
        } catch (error) {
          console.error("Error fetching suggestions:", error);
          setLoading(false);
        }
      };

      fetchSuggestions();
    }
  }, [email]);

  return (
    <div className={styles.suggestionWrapper}>
      <h2 className={styles.suggestionTitle}>Personalized Nutritional Suggestions</h2>
      {loading ? (
        <p className={styles.loadingText}>Loading...</p>
      ) : (
        <>
          {suggestions.length > 0 ? (
            <div className={styles.suggestionContainer}>
              {suggestions.map((suggestion, index) => (
                <div
                  className={styles.suggestionCard}
                  key={index}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          ) : (
            <p className={styles.loadingText}>No suggestions available.</p>
          )}
        </>
      )}
    </div>
  );
};

export default Suggestion;
