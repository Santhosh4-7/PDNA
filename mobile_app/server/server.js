const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();


// Middleware
app.use(cors());
app.use(bodyParser.json());

// Sample user data for validation (usually you'd query a database)
const users = [
  { email: 'test@example.com', password: 'password123', name: 'Test User' }
];

// Login endpoint
app.post('/api/auth/loginUser', (req, res) => {
  const { email, password } = req.body;
  
  const user = users.find(user => user.email === email && user.password === password);

  if (user) {
    res.status(200).json({
      message: 'Login successful',
      user: user.name
    });
  } else {
    res.status(401).json({
      message: 'Invalid email or password'
    });
  }
});

app.listen(5001, () => {
  console.log(`Server is running on port 5001`);
});
