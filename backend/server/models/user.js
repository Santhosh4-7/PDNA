// Updated Employee Model Schema with new fields for Water Tracking and Favorites
const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
        required: true,
    },
    pregnancyType: {
        type: String,
        required: true,
    },
    trimester: {               
        type: Number,
        required: false,  
        default: 0,
    },
    age: {
        type: Number,
        required: true,
    },
    height: {
        type: Number,
        required: true,
    },
    weight: {
        type: Number,
        required: true,
    },
    foods: [{ 
        name: String,
        calories: Number,
        protein: Number,
        carbs: Number,
        fats: Number,
        image: String,
    }],
    
    // New fields for water intake tracking
    waterIntake: {
        currentIntake: {
            type: Number,
            default: 0
        },
        history: [{ 
            amount: Number,
            timestamp: Date,
            total: Number
        }],
        lastReset: {
            type: Date,
            default: Date.now
        }
    },
    
    // New field for food favorites
    favorites: [{ 
        name: String,
        calories: Number,
        protein: Number,
        carbs: Number,
        fats: Number,
        image: String,
        mealType: {
            type: String,
            enum: ['breakfast', 'lunch', 'dinner', 'snack'],
            default: 'breakfast'
        },
        addedOn: {
            type: Date,
            default: Date.now
        }
    
    }],
    chatbot: {
        history: [{
            message: String,
            response: String,
            timestamp: { type: Date, default: Date.now }
        }],
        savedQuestions: [{
            question: String,
            saved: { type: Date, default: Date.now }
        }]
    },
    medicalHistory: [{
        type: String,
        value: Number,
        timestamp: Date,
        notes: String
      }]
});

const EmployeeModel = mongoose.model("Employee", employeeSchema);

module.exports = EmployeeModel;