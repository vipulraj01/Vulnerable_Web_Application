# Vulnerable Web Application

A simple web application with user authentication, file uploads, and user posts. This application is intentionally vulnerable for educational purposes.

## Features

- User registration and login
- User profile management
- Password change functionality
- Image upload and gallery view
- Post creation

## Setup Instructions

### Prerequisites

- Node.js (v12 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository or extract the project files
   ```
   git clone https://github.com/vipulraj01/Vulnerable_Web_Application or unzip the project files
   ```

2. Navigate to the project directory
   ```
   cd webapp
   ```

3. Install dependencies
   ```
   npm install
   ```

4. Start the application
   ```
   node server.js
   ```

5. Open your browser and navigate to `http://localhost:3000`

## Security Notice

This application is intentionally vulnerable and contains several security flaws. It is designed for educational purposes only and should not be deployed in a production environment.

Some of the vulnerabilities include:

- No input validation
- SQL injection vulnerabilities
- Insecure file upload
- Plaintext password storage
- No CSRF protection

## Usage

1. Register a new account
2. Log in with your credentials
3. Upload images to your gallery
4. Create text posts
5. View your profile and change your password 
