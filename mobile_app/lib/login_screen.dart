  import 'package:flutter/material.dart';
  import 'auth_service.dart';

  class LoginScreen extends StatefulWidget {
    @override
    _LoginScreenState createState() => _LoginScreenState();
  }

  class _LoginScreenState extends State<LoginScreen> {
    final TextEditingController _emailController = TextEditingController();
    final TextEditingController _passwordController = TextEditingController();
    final AuthService _authService = AuthService();

    void _login() async {
      String? token = await _authService.login(
        _emailController.text,
        _passwordController.text,
      );

      if (token != null && token != "Invalid credentials") {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Login Successful")));
        Navigator.pushReplacementNamed(
      context,
      '/home',
      arguments: _emailController.text, // Pass the email here
    );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text("Login Failed")));
      }
    }

    @override
    Widget build(BuildContext context) {
      return Scaffold(
        appBar: AppBar(title: Text("Login")),
        body: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            children: [
              TextField(
                controller: _emailController,
                decoration: InputDecoration(labelText: "Email"),
              ),
              TextField(
                controller: _passwordController,
                decoration: InputDecoration(labelText: "Password"),
                obscureText: true,
              ),
              SizedBox(height: 20),
              ElevatedButton(
                onPressed: _login,
                child: Text("Login"),
              ),
            ],
          ),
        ),
      );
    }
  }
