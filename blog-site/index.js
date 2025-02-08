/**
* index.js
* This is the main app entry point
*/

// Load process.env values from the .env file
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config(); // Load the .env file into process.env
}

// Set up express, bodyparser and EJS
const express = require('express'); // Import the express module
const app = express(); // Create an express app
const port = 3000; // Set the port number
var bodyParser = require("body-parser"); // Import the body-parser module
app.use(bodyParser.urlencoded({ extended: true })); // Use the body-parser middleware
app.set('view engine', 'ejs'); // set the app to use ejs for rendering
app.use(express.static(__dirname + '/public')); // set location of static files

// Set up express-session, bcrypt and passport
// Reference: https://youtu.be/zW_tZR0Ir3Q?si=3FPV3ldlr7gzXU11
const session = require('express-session'); // Import the express-session module
const flash = require('express-flash'); // Import the express-flash module
const passport = require('passport'); // Import the passport module
const bcrypt = require('bcrypt'); // Import the bcrypt module
const methodOverride = require('method-override'); // Import the method-override module
const initializePassport = require('./passport-config'); // Import the passport-config module
const { checkAuthenticated, checkNotAuthenticated, checkIsAuthor } = require('./checkAuth'); // Import the checkAuth module

// Set up flash, session, passport, and method-override
app.use(flash()); // Use the express-flash middleware
app.use(session({ // Use the express-session middleware
    secret: process.env.SESSION_SECRET, // Set the session secret
    resave: false, // Do not save the session if nothing has changed
    saveUninitialized: true // Save the session even if it is new
}));

// Set up passport
initializePassport( // Initialize passport with the following functions
    passport,
    email => users.find(user => user.email === email),
    id => users.find(user => user.id === id)
);

app.use(passport.initialize()); // Use the passport middleware
app.use(passport.session()); // Use the passport session middleware
app.use(methodOverride('_method')); // Use the method-override middleware

// Set up SQLite
// Items in the global namespace are accessible throught out the node application
const sqlite3 = require('sqlite3').verbose();
global.db = new sqlite3.Database('./database.db', function (err) { // Open the database in read-write mode
    if (err) {
        console.error(err);
        process.exit(1); // bail out we can't connect to the DB
    } else {
        console.log("Database connected");
        global.db.run("PRAGMA foreign_keys=ON"); // tell SQLite to pay attention to foreign key constraints
    }
});


// Pass user data and blog details to all views
app.use((req, res, next) => {
    res.locals.user = req.user || null; // Set the user data to be available in all views

    // Fetch blog_title, blog_author_id, and associated username from the database
    db.get("SELECT blog_title, blog_author_id, (SELECT username FROM users WHERE user_id = blog_author_id) AS author_username FROM site_details", [], (err, row) => {
        if (err) {
            console.error(err.message);
            // Setting default values in case of error
            res.locals.blogDetails = {
                title: "Blog",
                authorId: null,
                authorUsername: null
            };
        } else {
            // If the query was successful and the details were found, set them
            if (row) {
                res.locals.blogDetails = {
                    title: row.blog_title,
                    authorId: row.blog_author_id,
                    authorUsername: row.author_username
                };
            } else {
                // Handle case where details are not set in the database
                res.locals.blogDetails = {
                    title: "Blog",
                    authorId: null,
                    authorUsername: null
                };
            }
        }
        next(); // Proceed to the next middleware or route handler
    });
});

app.get('/', async (req, res) => {
    let isSiteDetailsEmpty = true; // Assume empty until proven otherwise

    global.db.get("SELECT COUNT(*) AS count FROM site_details", [], (err, row) => { // Check if the site details table is empty
        if (err) {
            console.error(err.message);
        } else {
            isSiteDetailsEmpty = row.count === 0; // If count is 0, then table is empty
            const notAuthor = req.session.notAuthor;
            res.render('index', { isSiteDetailsEmpty, notAuthor });
        }
    });
});

// Initial setup of the blog site - create the first user and set the blog title
app.post('/setup', async (req, res) => {
    const { blog_title, username, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10); // Hash the password

    db.serialize(() => { // Serialize the database operations
        // Insert the user data into the users table
        db.run(`INSERT INTO users (username, email, password) VALUES (?, ?, ?)`, [username, email, hashedPassword], function (err) {
            if (err) {
                console.error(err.message);
                return res.render('error', { error: "Error creating user" });
            }

            const userId = this.lastID; // Get the last inserted user ID

            // Insert the blog title and author ID into the site_details table
            db.run(`INSERT INTO site_details (blog_title, blog_author_id) VALUES (?, ?)`, [blog_title, userId], (err) => {
                if (err) {
                    console.error(err.message);
                    return res.render('error', { error: "Error setting up site details" });
                }
                res.redirect('/'); // Redirect to the home page
            });
        });
    });
});

// Route handlers for the author home
app.get('/authorHome', checkAuthenticated, checkIsAuthor, (req, res) => {
    const publishQuery = `
    SELECT * FROM posts
    WHERE post_isDraft = 0 
    ORDER BY post_publish_date DESC
    `;

    const draftQuery = `
    SELECT * FROM posts
    WHERE post_isDraft = 1
    ORDER BY post_modified_date DESC
    `;

    // Function to get all published posts
    const getPublishedPosts = () => new Promise((resolve, reject) => {
        db.all(publishQuery, [], (err, publishedPosts) => { // Fetch all published posts
            if (err) reject(err);
            else resolve(publishedPosts);
        });
    });

    // Function to get all draft posts
    const getDraftPosts = () => new Promise((resolve, reject) => {
        db.all(draftQuery, [], (err, draftPosts) => { // Fetch all draft posts
            if (err) reject(err);
            else resolve(draftPosts);
        });
    });

    // Fetch all published and draft posts
    Promise.all([getPublishedPosts(), getDraftPosts()])
        .then(([publishedPosts, draftPosts]) => { // Render the author home page with the posts
            res.render('authorHome', { publishedPosts, draftPosts });
        })
        .catch((err) => { // Handle errors fetching posts
            console.error(err.message);
            res.render('error', { error: "Error fetching posts from the database" });
        });
});

app.get('/authorSettings', checkAuthenticated, checkIsAuthor, (req, res) => {
    const query = `
        SELECT sd.blog_title, sd.blog_author_id, u.username AS author_username
        FROM site_details sd
        JOIN users u ON sd.blog_author_id = u.user_id
    `;
    db.get(query, [], (err, settings) => {
        if (err) {
            console.error(err.message);
            res.render('error', { error: "Error fetching site details" });
        } else {
            res.render('authorSettings', { settings });
        }
    })
});

app.post('/authorSettings', checkAuthenticated, checkIsAuthor, (req, res) => {
    const { blog_title, username } = req.body;
    const userId = req.user.user_id;
    db.serialize(() => {
        // Step 1: Update the username in the users table
        const updateUserQuery = `UPDATE users SET username = ? WHERE user_id = ?;`;
        db.run(updateUserQuery, [username, userId], function (err) {
            if (err) {
                console.error(err.message);
                return res.render('error', { error: "Error updating username" });
            }

            // Step 2: Update the blog title in the site_details table
            const updateSiteQuery = `UPDATE site_details SET blog_title = ? WHERE blog_author_id = ?;`;
            db.run(updateSiteQuery, [blog_title, userId], function (err) {
                if (err) {
                    console.error(err.message);
                    return res.render('error', { error: "Error updating site details" });
                }
                res.redirect('/authorHome');
            });
        });
    });
});

// Route handler for the reader home
app.get('/readerHome', (req, res) => {
    const query = `
    SELECT * FROM posts
    WHERE post_isDraft = 0
    ORDER BY post_publish_date DESC
    `;

    db.all(query, [], (err, publishedPosts) => { // Fetch all published posts
        if (err) {
            console.error(err.message);
            res.render('error', { error: "Error fetching posts from the database" });
        } else {
            res.render('readerHome', { publishedPosts });
        }
    });
});

// Logout using method-override
app.delete('/logout', function (req, res) {
    req.logout(function (err) {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

// Add all the route handlers in blogRoutes to the app under the path /blogs
const blogRoutes = require('./routes/blogs');
app.use('/blogs', blogRoutes);

// Add all the route handlers in usersRoutes to the app under the path /users
const usersRoutes = require('./routes/users');
app.use('/users', usersRoutes);

// Handle 404 errors
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Make the web application listen for HTTP requests
app.listen(port, () => {
    console.log(`Listening on port ${port}`)
});