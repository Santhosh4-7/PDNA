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
    trimester: {               // 🔥 New field added
        type: Number,
        required: false,  
        default:0,
           // Optional (only after prediction)
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
    
});

const EmployeeModel = mongoose.model("Employee", employeeSchema);

module.exports = EmployeeModel;
