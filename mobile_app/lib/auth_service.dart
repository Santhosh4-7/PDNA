import 'dart:convert';
import 'package:http/http.dart' as http;

class AuthService {
  static const String baseUrl = "http://localhost:3001/api/auth"; // Backend URL

  // Login function
  Future<String?> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$baseUrl/loginUser'),
      headers: {"Content-Type": "application/json"},
      body: jsonEncode({"email": email, "password": password}),
    );
    print('Response body: ${response.body}');
    if (response.statusCode == 200) {
      final responseData = jsonDecode(response.body);
      
      return responseData['user'];  // Returns the user's name
    } else {
      return jsonDecode(response.body)['message']; // Returns error message
    }
  }
} 
