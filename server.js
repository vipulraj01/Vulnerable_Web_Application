const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const expressLayouts = require('express-ejs-layouts');

// Initialize app
const app = express();
const PORT = process.env.PORT || 3000;

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'app/views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'app/public')));
app.use(session({
  secret: 'secretkey', // Not secure, but as per requirements
  resave: false,
  saveUninitialized: true
}));

// Set up database
const db = new sqlite3.Database('./database.db', (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    
    // Create users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      email TEXT,
      password TEXT
    )`);
    
    // Create uploads table
    db.run(`CREATE TABLE IF NOT EXISTS uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT,
      filepath TEXT,
      user_id INTEGER,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);
    
    // Create posts table
    db.run(`CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content TEXT,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )`);
  }
});

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'app/public/uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    // Accept all file types as per requirement to be vulnerable
    cb(null, true);
  }
});

// Make our db accessible to our router
app.use((req, res, next) => {
  req.db = db;
  next();
});

// Route for home page
app.get('/', (req, res) => {
  res.render('index', { user: req.session.user });
});

// Routes for authentication
app.get('/register', (req, res) => {
  res.render('register');
});

app.post('/register', (req, res) => {
  const { username, email, password } = req.body;
  
  // Insert user directly without password hashing (vulnerable by design)
  db.run('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', 
    [username, email, password], 
    function(err) {
      if (err) {
        return res.render('register', { error: 'Registration failed' });
      }
      res.redirect('/login');
    }
  );
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // Vulnerable login query - prone to SQL injection
  db.get(`SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`, (err, user) => {
    if (err) {
      return res.render('login', { error: 'Login failed' });
    }
    
    if (user) {
      req.session.user = user;
      res.redirect('/dashboard');
    } else {
      res.render('login', { error: 'Invalid credentials' });
    }
  });
});

// Dashboard route
app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  // Get user's uploads
  db.all('SELECT * FROM uploads WHERE user_id = ?', [req.session.user.id], (err, uploads) => {
    if (err) {
      return res.render('dashboard', { user: req.session.user, uploads: [], error: 'Failed to load uploads' });
    }
    
    // Get user's posts
    db.all('SELECT * FROM posts WHERE user_id = ? ORDER BY created_at DESC', [req.session.user.id], (err, posts) => {
      res.render('dashboard', { 
        user: req.session.user, 
        uploads: uploads, 
        posts: posts || [] 
      });
    });
  });
});

// Upload route
app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  if (!req.file) {
    return res.redirect('/dashboard');
  }
  
  const filePath = '/uploads/' + req.file.filename;
  
  // Store file info in database
  db.run('INSERT INTO uploads (filename, filepath, user_id) VALUES (?, ?, ?)',
    [req.file.originalname, filePath, req.session.user.id],
    function(err) {
      if (err) {
        console.error('Error saving upload to database', err.message);
      }
      res.redirect('/dashboard');
    }
  );
});

// Post creation route
app.post('/post', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  const { content } = req.body;
  
  db.run('INSERT INTO posts (content, user_id) VALUES (?, ?)',
    [content, req.session.user.id],
    function(err) {
      if (err) {
        console.error('Error creating post', err.message);
      }
      res.redirect('/dashboard');
    }
  );
});

// Profile route
app.get('/profile', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  res.render('profile', { user: req.session.user });
});

// Change password route
app.get('/change-password', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  res.render('change-password', { user: req.session.user });
});

app.post('/change-password', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  const { currentPassword, newPassword } = req.body;
  
  // Verify current password (vulnerable by design)
  db.get('SELECT * FROM users WHERE id = ? AND password = ?', 
    [req.session.user.id, currentPassword], 
    (err, user) => {
      if (err || !user) {
        return res.render('change-password', { 
          user: req.session.user, 
          error: 'Current password is incorrect' 
        });
      }
      
      // Update password
      db.run('UPDATE users SET password = ? WHERE id = ?', 
        [newPassword, req.session.user.id], 
        function(err) {
          if (err) {
            return res.render('change-password', { 
              user: req.session.user, 
              error: 'Failed to update password' 
            });
          }
          
          res.redirect('/profile?success=true');
        }
      );
    }
  );
});

// Gallery route
app.get('/gallery', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  // Get user's uploads
  db.all('SELECT * FROM uploads WHERE user_id = ?', [req.session.user.id], (err, uploads) => {
    if (err) {
      return res.render('gallery', { user: req.session.user, uploads: [], error: 'Failed to load uploads' });
    }
    
    res.render('gallery', { user: req.session.user, uploads: uploads });
  });
});

// Logout route
app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 