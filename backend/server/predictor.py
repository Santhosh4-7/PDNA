# predictor.py
import sys
import json
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

# Define the symptom questions
symptom_questions = [
    "Missed period (7+ days late)?",
    "Nausea or vomiting (especially morning)?",
    "Increased sensitivity to smells?",
    "Unusual fatigue or sleepiness?",
    "Breast changes (soreness/fullness/darkened areolas)?",
    "Food cravings or aversions?",
    "Light spotting or implantation bleeding?",
    "Abdominal pressure or bloating?",
    "Frequent urination?",
    "Mood swings or emotional sensitivity?",
    "Dizziness or lightheadedness?",
    "Low-grade fever (~99°F / 37.2°C)?",
    "Metallic taste in mouth?"
]

# Sample data with [13 symptoms + Pregnancy Status, Trimester]
data = [
    [1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 0, 0, 1, 1, 1],  # Pregnant, 1st Trimester
    [1, 1, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 2],  # Pregnant, 2nd Trimester
    [1, 0, 0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 0, 1, 3],  # Pregnant, 3rd Trimester
    [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1],  # Pregnant, 1st Trimester
    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],  # Not Pregnant
]

# Create DataFrame
df = pd.DataFrame(data, columns=symptom_questions + ['Pregnancy_Status', 'Trimester'])

# Features and labels
X = df[symptom_questions]
y_pregnancy = df['Pregnancy_Status']
y_trimester = df['Trimester']

# Scale features
scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

# Train models
X_train, _, y_preg_train, _, y_trim_train, _ = train_test_split(X_scaled, y_pregnancy, y_trimester, test_size=0.2, random_state=42)

model_preg = RandomForestClassifier(random_state=42)
model_preg.fit(X_train, y_preg_train)

model_trim = RandomForestClassifier(random_state=42)
model_trim.fit(X_train, y_trim_train)

# Prediction function
def predict(input_data):
    input_scaled = scaler.transform([input_data])
    pregnancy_pred = model_preg.predict(input_scaled)[0]
    trimester_pred = model_trim.predict(input_scaled)[0]

    pregnancy_status = "Pregnant" if pregnancy_pred == 1 else "Not Pregnant"
    trimester = (
        "1st Trimester" if trimester_pred == 1 else
        "2nd Trimester" if trimester_pred == 2 else
        "3rd Trimester" if trimester_pred == 3 else
        "N/A"
    )

    return pregnancy_status, trimester

# If running from Node.js
if __name__ == "__main__":
    input_json = sys.argv[1]
    input_array = json.loads(input_json)  # Expecting 13 symptom values
    print("Received input array:", input_array, file=sys.stderr)

    pregnancy_status, trimester = predict(input_array)
    

    print(trimester) # Output to Node.ajs
