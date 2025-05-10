import pandas as pd
import numpy as np
import random
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.ensemble import RandomForestClassifier
from xgboost import XGBClassifier
from sklearn.metrics import classification_report, confusion_matrix
import seaborn as sns
import matplotlib.pyplot as plt

# Symptom checklist
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
    "Metallic taste in mouth?",
    "Headaches?",
    "Sleep disturbances?",
    "Back or pelvic pain?"
]


symptom_weights = {
    "pregnant": [0.9, 0.85, 0.7, 0.85, 0.8, 0.6, 0.6, 0.7, 0.75, 0.65, 0.6, 0.4, 0.35, 0.7, 0.75, 0.7],
    "not_pregnant": [0.1, 0.15, 0.2, 0.2, 0.2, 0.4, 0.1, 0.3, 0.3, 0.3, 0.2, 0.2, 0.15, 0.2, 0.3, 0.25]
}

def generate_realistic_data(n_samples=500):
    data = []
    for _ in range(n_samples):
        is_pregnant = 1 if random.random() < 0.5 else 0
        symptoms = [
            1 if random.random() < symptom_weights["pregnant" if is_pregnant else "not_pregnant"][i] else 0
            for i in range(len(symptom_questions))
        ]
        data.append(symptoms + [is_pregnant])
    columns = [f"Q{i+1}" for i in range(len(symptom_questions))] + ["pregnant"]
    return pd.DataFrame(data, columns=columns)

# Generate the dataset
df = generate_realistic_data()

X = df.drop("pregnant", axis=1)
y = df["pregnant"]

X_train, X_test, y_train, y_test = train_test_split(X, y, stratify=y, test_size=0.2, random_state=42)

# Initialize models
models = {
    "MLPClassifier": MLPClassifier(hidden_layer_sizes=(20, 10), activation='relu', max_iter=500, random_state=42),
    "Random Forest": RandomForestClassifier(n_estimators=100, random_state=42),
    "XGBoost": XGBClassifier(use_label_encoder=False, eval_metric='logloss', random_state=42)
}

results = {}

# Train and evaluate each model
for name, model in models.items():
    model.fit(X_train, y_train)
    y_pred = model.predict(X_test)

    accuracy = model.score(X_test, y_test)
    report = classification_report(y_test, y_pred, output_dict=True)

    results[name] = {
        "accuracy": accuracy,
        "classification_report": report,
        "confusion_matrix": confusion_matrix(y_test, y_pred)
    }

    print(f"\n--- {name} Results ---")
    print(f"Accuracy: {accuracy:.2f}")
    print("Classification Report:")
    print(classification_report(y_test, y_pred))

    cm = results[name]["confusion_matrix"]
    sns.heatmap(cm, annot=True, fmt='d', cmap='Purples', xticklabels=["Not Pregnant", "Pregnant"], yticklabels=["Not Pregnant", "Pregnant"])
    plt.title(f"{name} - Confusion Matrix")
    plt.xlabel("Predicted")
    plt.ylabel("Actual")
    plt.show()

# Choose best model
best_model_name = max(results, key=lambda x: results[x]["accuracy"])
best_model = models[best_model_name]
print(f"\nBest Model: {best_model_name} with Accuracy {results[best_model_name]['accuracy']:.2f}")

# Symptom checker assistant
def pregnancy_assistant():
    print("\n--- Pregnancy Symptom Checker ---")
    answers = []
    for q in symptom_questions:
        while True:
            a = input(q + " (yes/no): ").strip().lower()
            if a in ["yes", "no"]:
                answers.append(1 if a == "yes" else 0)
                break
            else:
                print("Please enter 'yes' or 'no'.")


    pred = best_model.predict([answers])[0]
    prob = best_model.predict_proba([answers])[0][1]

   
    print("\n🩺 Prediction Result:")
    print("🔴 Likely NOT pregnant." if pred == 0 else "🟢 Likely PREGNANT.")
    print(f"Confidence: {prob * 100:.2f}%")

