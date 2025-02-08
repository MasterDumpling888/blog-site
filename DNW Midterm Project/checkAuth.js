// Description: This file contains the functions from middleware, passport, to check if the user is authenticated or not.

function checkAuthenticated(req, res, next) { // Passport function to check if the user is authenticated
  if (req.isAuthenticated()) {
    return next(); // Proceed to the next middleware or route handler if authenticated
  }

  req.session.returnTo = req.originalUrl; // Save the url the user is trying to get to
  res.redirect('/users/login'); // Redirect the user to the login page
}

function checkNotAuthenticated(req, res, next) { // Passport function to check if the user is not authenticated
  if (req.isAuthenticated()) {
    return res.redirect('/'); // Redirect the user to the home page if not authenticated
  }
  next(); // Proceed to the next middleware or route handler if authenticated
}

function checkIsAuthor(req, res, next) { // Custom middleware to check if the user is the author of the blog post
  if (res.locals.blogDetails.authorId == req.user.user_id) { // Check if the user is the author of the blog post
    next(); // Proceed to the next middleware or route handler
  } else {
    req.session.notAuthor = true; // Set a session variable to indicate the user is not the author
    res.redirect('/'); // Redirect the user to the home page
  }
};

module.exports = { checkAuthenticated, checkNotAuthenticated, checkIsAuthor }; // Export the middleware functions for use in other files