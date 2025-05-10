import json
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.neural_network import MLPClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import sys

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

def generate_weighted_data(n_samples=1000):
    data = []
    for _ in range(n_samples):
        symptoms = np.random.binomial(1, 0.5, len(symptom_questions))
        score = sum(symptoms)
        fatigue = symptoms[3]
        breast = symptoms[4]
        back_pain = symptoms[7]
        sleep = symptoms[3]
        headaches = symptoms[10]

        if score >= 8 or (fatigue and breast):
            pregnant = 1
            if fatigue and breast and not back_pain:
                trimester = 1
            elif back_pain and not headaches:
                trimester = 2
            elif sleep and headaches:
                trimester = 3
            else:
                trimester = np.random.choice([1, 2, 3])
        else:
            pregnant = 0
            trimester = 0

        data.append(list(symptoms) + [pregnant, trimester])
    return pd.DataFrame(data, columns=symptom_questions + ['Pregnancy_Status', 'Trimester'])

df = generate_weighted_data()
X = df[symptom_questions]
y_pregnancy = df['Pregnancy_Status']
y_trimester = df['Trimester']

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

X_train, _, y_preg_train, _, y_trim_train, _ = train_test_split(X_scaled, y_pregnancy, y_trimester, test_size=0.2, random_state=42)

model_preg = RandomForestClassifier(random_state=42)
model_preg.fit(X_train, y_preg_train)

model_trim = MLPClassifier(hidden_layer_sizes=(32, 16), activation='relu', max_iter=500, random_state=42)
model_trim.fit(X_train, y_trim_train)

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

if __name__ == "__main__":
    input_json = sys.argv[1]
    input_array = json.loads(input_json)
    pregnancy_status, trimester = predict(input_array)
    print(trimester)
