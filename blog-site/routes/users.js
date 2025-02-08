/**
 * users.js
 * These are example routes for user management
 * This shows how to correctly structure your routes for the project
 * and the suggested pattern for retrieving data by executing queries
 *
 * NB. it's better NOT to use arrow functions for callbacks with the SQLite library
* 
 */

const express = require("express");
const router = express.Router();
const bcrypt = require('bcrypt');
const passport = require('passport');

const { checkAuthenticated, checkNotAuthenticated } = require('../checkAuth');

/**
 * @desc Display all the users
 */
router.get("/list-users", checkAuthenticated, (req, res, next) => {
    // Define the query
    query = "SELECT * FROM users"

    // Execute the query and render the page with the results
    global.db.all(query,
        function (err, rows) {
            if (err) {
                next(err); //send the error on to the error handler
            } else {
                res.json(rows); // render page as simple json
            }
        }
    );
});

/**
 * @desc Displays a page with a form for creating a user record
 */
router.get("/register", checkNotAuthenticated, (req, res) => {
    res.render("register");
});

/**
 * @desc Add a new user to the database based on data from the submitted form
 */
router.post("/register", (req, res, next) => {
    // Define the query
    const { username, email, password } = req.body;
    bcrypt.hash(password, 10, function (err, hash) {
        // First, check if there are any users in the database
        const checkUsersQuery = "SELECT COUNT(*) AS count FROM users;";
        global.db.get(checkUsersQuery, [], (err, row) => {
            if (err) {
                next(err); // Send the error on to the error handler
            } else {
                // Determine isAuthor based on the existence of users
                const insertQuery = "INSERT INTO users (username, email, password) VALUES(?, ?, ? );";
                const queryParameters = [username, email, hash];

                // Execute the insert query with isAuthor value
                global.db.run(insertQuery, queryParameters, function (err) {
                    if (err) {
                        next(err); // Send the error on to the error handler
                    } else {
                        next();
                        res.redirect("/users/login");
                    }
                });
            }
        });
    });
});

router.get("/login", checkNotAuthenticated, (req, res) => {
    res.render("login");
});

router.post("/login", passport.authenticate('local', {
    failureRedirect: '/users/login',
    failureFlash: true
}), (req, res) => {
    // Redirect to the original URL or the default route
    const redirectUrl = req.session.returnTo || '/';
    delete req.session.returnTo; // Remove the stored URL from the session
    res.redirect(redirectUrl);
});

// Export the router object so index.js can access it
module.exports = router;