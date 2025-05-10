import 'package:flutter/material.dart';
import 'auth_service.dart';
import 'package:pdna/nutrition_service.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';
import 'theme.dart';
import 'heart_rate_monitor.dart';

// Main HomeScreen class
class HomeScreen extends StatefulWidget {
  final String email;

  HomeScreen({required this.email});

  @override
  _HomeScreenState createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  Map<String, dynamic>? summary;

  @override
  void initState() {
    super.initState();
    fetchData();
  }

  void fetchData() async {
    final data = await fetchSummary(widget.email);
    if (data != null) {
      setState(() {
        summary = data['summary'];
      });
    }
  }

  Widget _buildNutritionBar(String label, double value, double max, Color color) {
    final double percentage = (value / max).clamp(0.0, 1.0);
    final String displayValue = value.toStringAsFixed(1);
    final String unit = label == "Calories" ? "kcal" : "g";
    
    return Padding(
      padding: const EdgeInsets.only(bottom: 20.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: AppTheme.textPrimaryColor,
                ),
              ),
              Text(
                "$displayValue $unit",
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w500,
                  color: AppTheme.textSecondaryColor,
                ),
              ),
            ],
          ),
          SizedBox(height: 8),
          Container(
            height: 12,
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(6),
              color: Colors.grey[200],
            ),
            child: Stack(
              children: [
                FractionallySizedBox(
                  widthFactor: percentage,
                  child: Container(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(6),
                      gradient: LinearGradient(
                        colors: [
                          color.withOpacity(0.7),
                          color,
                        ],
                        begin: Alignment.centerLeft,
                        end: Alignment.centerRight,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.end,
            children: [
              Text(
                "${(percentage * 100).toStringAsFixed(0)}% of $max $unit",
                style: TextStyle(
                  fontSize: 12,
                  color: AppTheme.textSecondaryColor,
                  fontWeight: FontWeight.w400,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Future<void> _addFood(String email, String food, String meal) async {
    final response = await http.post(
      Uri.parse("http://localhost:3001/api/auth/add_Food4"), // Update with your API URL
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({
        "email": email,
        "food": food,
        "meal": meal,
      }),
    );

    if (response.statusCode == 200) {
      print("Food added");
    } else {
      print("Failed to add food");
    }
  }

  void _addFoodDialog(String meal) {
    TextEditingController foodController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(
          "Add Food to $meal",
          style: TextStyle(
            fontWeight: FontWeight.w600,
            color: AppTheme.textPrimaryColor,
          ),
        ),
        content: TextField(
          controller: foodController,
          decoration: InputDecoration(
            hintText: "Enter food name",
            prefixIcon: Icon(Icons.restaurant_menu, color: AppTheme.accentColor),
          ),
          autofocus: true,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: Text("Cancel"),
          ),
          ElevatedButton.icon(
            onPressed: () async {
              String food = foodController.text.trim();
              if (food.isNotEmpty) {
                await _addFood(widget.email, food, meal);
                Navigator.pop(context);
                fetchData(); // refresh the data
              }
            },
            icon: Icon(Icons.add, size: 18),
            label: Text("Add"),
          ),
        ],
      ),
    );
  }

  Widget _mealSection(String meal, IconData mealIcon) {
    // Define different colors for different meals
    Color mealColor;
    switch (meal.toLowerCase()) {
      case 'breakfast':
        mealColor = Colors.orange;
        break;
      case 'lunch':
        mealColor = Colors.green;
        break;
      case 'dinner':
        mealColor = Colors.purple;
        break;
      default:
        mealColor = AppTheme.accentColor;
    }

    return Card(
      elevation: 3,
      margin: const EdgeInsets.symmetric(vertical: 10),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Container(
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: mealColor.withOpacity(0.3), width: 1),
        ),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            children: [
              Row(
                children: [
                  Container(
                    padding: EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: mealColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      mealIcon,
                      color: mealColor,
                      size: 24,
                    ),
                  ),
                  SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      meal,
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w600,
                        color: AppTheme.textPrimaryColor,
                      ),
                    ),
                  ),
                  ElevatedButton.icon(
                    onPressed: () => _addFoodDialog(meal),
                    icon: Icon(Icons.add, size: 18),
                    label: Text("Add Food"),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: mealColor,
                      foregroundColor: Colors.white,
                      elevation: 0,
                      padding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    ),
                  ),
                ],
              ),
              // Here you could add a list of foods for this meal
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: AppTheme.lightTheme,
      child: Scaffold(
        appBar: AppBar(
          title: Text("Nutrition Dashboard"),
          actions: [
            IconButton(
              icon: Icon(Icons.refresh),
              onPressed: fetchData,
              tooltip: "Refresh data",
            ),
          ],
        ),
        body: summary == null
            ? Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    CircularProgressIndicator(color: AppTheme.primaryColor),
                    SizedBox(height: 16),
                    Text(
                      "Loading your nutrition data...",
                      style: TextStyle(
                        color: AppTheme.textSecondaryColor,
                        fontSize: 16,
                      ),
                    ),
                  ],
                ),
              )
            : SafeArea(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(20.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Header section with greeting
                      Container(
                        padding: EdgeInsets.all(20),
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              AppTheme.primaryColor,
                              AppTheme.primaryLightColor,
                            ],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                          borderRadius: BorderRadius.circular(16),
                          boxShadow: [
                            BoxShadow(
                              color: AppTheme.primaryColor.withOpacity(0.3),
                              blurRadius: 10,
                              offset: Offset(0, 4),
                            ),
                          ],
                        ),
                        child: Row(
                          children: [
                            CircleAvatar(
                              backgroundColor: Colors.white,
                              radius: 30,
                              child: Icon(
                                Icons.person,
                                size: 36,
                                color: AppTheme.primaryColor,
                              ),
                            ),
                            SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    "Hi, ${widget.email.split('@').first}",
                                    style: TextStyle(
                                      fontSize: 24,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.white,
                                    ),
                                  ),
                                  SizedBox(height: 4),
                                  Text(
                                    "Your nutrition summary for today",
                                    style: TextStyle(
                                      fontSize: 14,
                                      color: Colors.white.withOpacity(0.9),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      
                      SizedBox(height: 24),
                      
                      // Heart Rate Monitor Widget
                      HeartRateWidget(
                        email: widget.email,
                        accentColor: AppTheme.primaryColor,
                      ),
                      
                      SizedBox(height: 24),
                      
                      // Nutrition summary section
                      Card(
                        elevation: 3,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(20.0),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                "Today's Nutrition",
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.textPrimaryColor,
                                ),
                              ),
                              SizedBox(height: 20),
                              _buildNutritionBar(
                                "Calories", 
                                summary!['calories'], 
                                2000, 
                                AppTheme.caloriesColor
                              ),
                              _buildNutritionBar(
                                "Protein", 
                                summary!['protein'], 
                                100, 
                                AppTheme.proteinColor
                              ),
                              _buildNutritionBar(
                                "Carbs", 
                                summary!['carbs'], 
                                300, 
                                AppTheme.carbsColor
                              ),
                              _buildNutritionBar(
                                "Fats", 
                                summary!['fats'], 
                                70, 
                                AppTheme.fatsColor
                              ),
                            ],
                          ),
                        ),
                      ),
                      
                      SizedBox(height: 24),
                      
                      // Meals section
                      Text(
                        "Meals",
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: AppTheme.textPrimaryColor,
                        ),
                      ),
                      SizedBox(height: 12),
                      _mealSection("Breakfast", Icons.wb_sunny),
                      _mealSection("Lunch", Icons.restaurant),
                      _mealSection("Dinner", Icons.nights_stay),
                    ],
                  ),
                ),
              ),
      ),
    );
  }
}