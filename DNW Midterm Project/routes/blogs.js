
const express = require("express"); // Import the express module
const router = express.Router(); // Create a new router using express
const { checkAuthenticated, checkNotAuthenticated, checkIsAuthor } = require('../checkAuth'); // Import the checkAuthenticated function

// GET request to the /blogs route
router.get('/create', checkAuthenticated, (req, res) => {
  res.render('create.ejs');
});


// GET request to the /blogs route
router.post('/create', checkAuthenticated, (req, res) => {
  const { post_title, post_body, post_tag } = req.body;
  const query = "INSERT INTO posts (post_title, post_body, post_tag, post_userId) VALUES(?, ?, ? , ?);";
  const query_parameters = [post_title, post_body, post_tag, req.user.user_id];

  global.db.run(query, query_parameters, function (err) {
    if (err) {
      console.error(err.message);
      res.render('error', { error: "Error creating post" });
    } else {
      res.redirect('/authorHome');
    }
  });
});

// GET request to the /blogs route
router.post('/publish', (req, res) => {
  const postId = req.body.post_id;
  const query = `
UPDATE posts
SET post_isDraft = 0, -- Set to FALSE
    post_publish_date = CURRENT_TIMESTAMP
WHERE post_id = ?;
`;
  const query_parameters = [postId];

  global.db.run(query, query_parameters, function (error) {
    if (error) {
      console.error('Error updating post:', error);
      res.status(500).send('An error occurred');
    } else {
      if (this.changes > 0) {
        res.redirect('/authorHome');
      } else {
        res.status(404).send('Post not found');
      }
    }
  });
});

// GET request to the /blogs route
router.get('/:id', (req, res) => {
  // Modified to also fetch the author_id
  const postQuery = "SELECT * FROM posts WHERE post_id = ?";
  const commentsQuery = `
    SELECT comments.*, users.username 
    FROM comments 
    JOIN users ON comments.user_id = users.user_id 
    WHERE comments.post_id = ? 
    ORDER BY comments.created_at DESC`;

  global.db.get(postQuery, [req.params.id], (err, post) => {
    if (err) {
      console.error(err.message);
      res.render('error', { error: "Error fetching post" });
    } else {
      const currentUserID = req.user ? req.user.user_id : null;
      if (!currentUserID || post.userId !== res.locals.blogDetails.authorId) {
        // No logged user or user is not the author, update the view count
        const updateViewCountQuery = "UPDATE posts SET post_views = post_views + 1 WHERE post_id = ?";
        global.db.run(updateViewCountQuery, [req.params.id], (err) => {
          if (err) {
            console.error("Error updating view count:", err.message);
            // Proceed to render the page even if view coßunt update fails
          }
        });
      }

      global.db.all(commentsQuery, [req.params.id], (err, comments) => {
        if (err) {
          console.error(err.message);
          res.render('error', { error: "Error fetching comments" });
        } else {
          res.render('blog', { post: post, comments: comments });
        }
      });
    }
  });
});

// Render the edit page with the post data
router.get('/edit/:id', checkAuthenticated, checkIsAuthor, (req, res) => {
  const postQuery = "SELECT * FROM posts WHERE post_id = ?";
  global.db.get(postQuery, [req.params.id], (err, post) => {
    if (err) {
      console.error(err.message);
      res.render('error', { error: "Error fetching post" });
    } else {
      res.render('edit', { post: post });
    }
  });
});

// Update the post with the new data and redirect to authorHome
router.post('/edit/:id', checkAuthenticated, checkIsAuthor, (req, res) => {
  const { post_title, post_body, post_tag } = req.body;
  const query = "UPDATE posts SET post_title = ?, post_body = ?, post_tag = ?, post_modified_date = CURRENT_TIMESTAMP WHERE post_id = ?";
  const query_parameters = [post_title, post_body, post_tag, req.params.id];

  global.db.run(query, query_parameters, function (err) {
    if (err) {
      console.error(err.message);
      res.render('error', { error: "Error updating post" });
    } else {
      res.redirect('/authorHome');
    }
  });
});

// Delete the post and redirect to authorHome
router.delete('/:id', checkAuthenticated, checkIsAuthor, (req, res) => {
  const deleteQuery = "DELETE FROM posts WHERE post_id = ?";
  const deleteQueryParameters = [req.params.id];

  global.db.run(deleteQuery, deleteQueryParameters, (err) => {
    if (err) {
      console.error(err.message);
      res.render('error', { error: "Error deleting post" });
    } else {
      res.redirect('/authorHome');
    }
  });
});

// POST request to the /blogs route
router.post('/comment/:id', (req, res) => {
  const insertQuery = `
      INSERT INTO comments (post_id, user_id, comment, alias) 
      VALUES (?, ?, ?, ?)`;

  const insertQueryParameters = [req.params.id, req.user.user_id, req.body.comment, req.body.alias];

  global.db.run(insertQuery, insertQueryParameters, function (err) {
    if (err) {
      console.error(err.message);
      res.render('error', { error: "Error creating comment" });
    } else {
      res.redirect('/blogs/' + req.params.id);
    }
  });

});

// POST request to the /blogs route
router.post('/like/', checkAuthenticated, (req, res) => {
  const query = "UPDATE posts SET post_likes = post_likes + 1 WHERE post_id = ?";
  const post_id = [req.body.post_id];

  global.db.run(query, post_id, function (err) {
    if (err) {
      console.error(err.message);
      res.status(500).send('An error occurred');
    } else {
      res.redirect('/readerHome');
    }
  });
});

module.exports = router; // Export the router