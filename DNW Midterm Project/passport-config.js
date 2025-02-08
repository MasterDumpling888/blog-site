// Reference: https://github.com/WebDevSimplified/Nodejs-Passport-Login
// This implementation is based on the tutorial from WebDevSimplified, with some modifications to fit the project requirements.
const LocalStrategy = require('passport-local').Strategy; // Import the LocalStrategy module
const bcrypt = require('bcrypt'); // Import the bcrypt module

function findUserByEmail(email) { // Function to find a user by email
  const query = "SELECT * FROM users WHERE email = ?"; // SQL query to find a user by email
  return new Promise((resolve, reject) => { // Wrap the database operation in a Promise
    global.db.get(query, [email], (err, row) => { // Run the query with the email
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function findUserById(id) { // Function to find a user by id
  const query = "SELECT * FROM users WHERE user_id = ?"; // SQL query to find a user by id
  return new Promise((resolve, reject) => { // Wrap the database operation in a Promise
    global.db.get(query, [id], (err, row) => { // Run the query with the id
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function initialize(passport) { // Function to initialize passport
  const authenticateUser = async (email, password, done) => { // Function to authenticate a user
    try { // Try to authenticate the user
      const user = await findUserByEmail(email); // Correctly await the promise
      if (user == null) { // Check if the user exists
        return done(null, false, { message: 'No user with that email' });
      }

      if (await bcrypt.compare(password, user.password)) {  // Check if the password is correct
        console.log("User authenticated");
        return done(null, user); // Return the user if authenticated
      } else {
        return done(null, false, { message: 'Password incorrect' }); // Return an error if the password is incorrect
      }
    } catch (e) { // Handle errors 
      return done(e);
    }
  };

  passport.use(new LocalStrategy({ usernameField: 'email' }, authenticateUser)); // Use the LocalStrategy with the authenticateUser function
  passport.serializeUser((user, done) => done(null, user.user_id)); // Serialize the user
  passport.deserializeUser((id, done) => { // Deserialize the user
    findUserById(id).then(user => done(null, user)).catch(err => done(err)); // Find the user by id
  });
}

module.exports = initialize; // Export the initialize function for use in other files