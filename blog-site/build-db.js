const fs = require('fs').promises; // Use the Promise-based version of the fs module

// Open a database connection - same as index.js
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.db', sqlite3.OPEN_READWRITE, (err) => { // Open the database in read-write mode
  if (err) { // Handle errors opening the database
    return console.error('Error opening database', err.message);
  }
  console.log('Database connected'); // Confirm the database connection
  db.run('PRAGMA foreign_keys=ON'); // Enable foreign key constraints
});

// Async function to import JSON data into a specific table
async function importJSON(filePath, tableName) { // Accept a file path and table name as arguments
  try {
    const data = await fs.readFile(filePath, 'utf8'); // Read the JSON file
    const records = JSON.parse(data); // Parse the JSON data
    for (const record of records) { // Iterate over the records
      const columns = Object.keys(record).join(', '); // Get the column names
      const placeholders = Object.keys(record).map(() => '?').join(', '); // Create placeholders for the values
      const query = `INSERT INTO ${tableName} (${columns}) VALUES (${placeholders})`; // Create the SQL query
      const values = Object.values(record); // Get the record values
      await new Promise((resolve, reject) => { // Wrap the database operation in a Promise
        db.run(query, values, (err) => { // Run the query with the record values
          if (err) { // Handle errors
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }
    console.log('All records inserted successfully');
  } catch (err) { // Handle errors reading the file or inserting records
    console.error('Error processing JSON file or inserting records', err);
  }
}