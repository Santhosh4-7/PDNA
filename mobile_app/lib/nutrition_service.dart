import 'dart:convert';
import 'package:http/http.dart' as http;

const baseUrl = 'http://localhost:3001/api/auth'; // <- change to your backend base URL

Future<Map<String, dynamic>?> fetchSummary(String email) async {
  final response = await http.post(
    Uri.parse('$baseUrl/getNutritionSummary'),
    headers: {"Content-Type": "application/json"},
    body: jsonEncode({"email": email}),
  );

  if (response.statusCode == 200) {
    return jsonDecode(response.body);
  } else {
    print('Error: ${response.body}');
    return null;
  }
}
