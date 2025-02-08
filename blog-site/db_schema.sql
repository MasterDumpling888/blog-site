
-- This makes sure that foreign_key constraints are observed and that errors will be thrown for violations
PRAGMA foreign_keys=ON;

BEGIN TRANSACTION;

-- Create your tables with SQL commands here (watch out for slight syntactical differences with SQLite vs MySQL)

CREATE TABLE IF NOT EXISTS site_details ( -- This table will store the details of the blog site
    site_id INTEGER PRIMARY KEY AUTOINCREMENT, -- Primary key for the site
    blog_title TEXT NOT NULL, -- Title of the blog
    blog_author_id INTEGER, -- The user_id of the author of the blog
    creation_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, -- The date the blog was created
    FOREIGN KEY (blog_author_id) REFERENCES users(user_id)  -- Reference to the users table
);

CREATE TABLE IF NOT EXISTS users ( -- This table will store the details of the users
    user_id INTEGER PRIMARY KEY AUTOINCREMENT, -- Primary key for the user
    username TEXT NOT NULL UNIQUE, -- for name
    email TEXT NOT NULL, -- use for login
    password TEXT NOT NULL, -- store hashed password using bcrypt
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, -- The date the user was created
    UNIQUE(username), -- Ensure username is unique
    UNIQUE(email) -- Ensure email is unique
);

CREATE TABLE IF NOT EXISTS posts ( -- This table will store the details of the posts
    post_id INTEGER PRIMARY KEY AUTOINCREMENT, -- Primary key for the post
    post_title TEXT NOT NULL, -- Title of the post
    post_userId INTEGER NOT NULL, -- The user_id of the author of the post
    post_body TEXT NOT NULL, -- The body of the post
    post_tag TEXT, -- The tag of the post
    post_likes INTEGER DEFAULT 0, -- The number of likes the post has
    post_views INTEGER DEFAULT 0, -- The number of views the post has
    post_creation_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, -- The date the post was created
    post_publish_date DATETIME, -- The date the post was published
    post_modified_date DATETIME, -- The date the post was last modified
    post_isDraft BOOLEAN DEFAULT 1, -- default to true
    FOREIGN KEY (post_userId) REFERENCES users(user_id) -- Reference to the users table
);

CREATE TABLE IF NOT EXISTS comments ( -- This table will store the details of the comments
    comment_id INTEGER PRIMARY KEY AUTOINCREMENT, -- Primary key for the comment
    post_id INTEGER NOT NULL, -- The post_id of the post the comment is on
    user_id INTEGER NOT NULL, -- The user_id of the author of the comment
    alias TEXT NOT NULL, -- The alias of the user who made the comment
    comment TEXT NOT NULL, -- The body of the comment
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, -- The date the comment was created
    FOREIGN KEY (post_id) REFERENCES posts(post_id), -- Reference to the posts table
    FOREIGN KEY (user_id) REFERENCES users(user_id) -- Reference to the users table
);

COMMIT; -- Commit the transaction