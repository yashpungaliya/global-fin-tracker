    // server.js
    // Updated Node.js Express server with port checking/killing.
    // Uses 'kill-port'. Adjusted detectPort usage.

    const express = require('express');
    const path = require('path');
    // Import detect-port - might be default export or direct function
    const detectPortImport = require('detect-port');
    const kill = require('kill-port'); // Correct package name!

    // Determine the actual function to use (handles different export styles)
    const detectPort = typeof detectPortImport === 'function' ? detectPortImport : detectPortImport.default;

    const app = express();
    const desiredPort = 3000; // The target port

    // Define the directory for static files
    const publicDirectoryPath = path.join(__dirname, 'public');

    // Serve static files from the 'public' directory
    app.use(express.static(publicDirectoryPath));

    // Basic route for the homepage
    app.get('/', (req, res) => {
      res.sendFile(path.join(publicDirectoryPath, 'index.html'));
    });

    // Function to start the server
    const startServer = (port) => {
      app.listen(port, () => {
        console.log(`\n🚀 Server successfully started on http://localhost:${port}`);
        console.log(`   Serving files from: ${publicDirectoryPath}`);
        // Use a dynamic timestamp with timezone
        console.log(`   Timestamp: ${new Date().toLocaleString("en-US", { timeZone: "America/Los_Angeles" })} PDT`);
      }).on('error', (err) => {
        // This catches errors *after* the server starts (less common)
        console.error(`Server error after start on port ${port}:`, err);
        process.exit(1); // Exit if server encounters an error after starting
      });
    };

    // --- Port Checking and Server Startup Logic ---
    console.log(`Checking if port ${desiredPort} is available...`);

    // Use the determined detectPort function
    // Note: detect-port >= 1.5.0 returns a Promise, so we need to use .then()
    // If using an older version (< 1.5.0), the callback style might work, but Promise is safer.
    Promise.resolve(detectPort(desiredPort)) // Wrap in Promise.resolve for compatibility
      .then(availablePort => {
          if (desiredPort === availablePort) {
            // Port is available, start the server directly
            console.log(`Port ${desiredPort} is available.`);
            startServer(desiredPort);
          } else {
            // Port is occupied
            console.warn(`Port ${desiredPort} is currently in use by another process (found on port ${availablePort}).`);
            console.log(`Attempting to free up port ${desiredPort}...`);

            // Attempt to kill the process using the desired port using 'kill-port'
            kill(desiredPort, 'tcp') // Use the correct kill function
              .then(() => {
                console.log(`Successfully killed process on port ${desiredPort}.`);
                // Short delay to ensure port is released before restarting
                setTimeout(() => {
                  console.log(`Retrying to start server on port ${desiredPort}...`);
                  startServer(desiredPort);
                }, 1000); // Wait 1 second
              })
              .catch((killError) => {
                console.error(`Failed to kill process on port ${desiredPort}. Error: ${killError.message || killError}`); // Log the actual error
                console.error("Please close the application using the port manually or choose a different port.");
                process.exit(1); // Exit if killing the process fails
              });
          }
      })
      .catch(err => {
          // Catch errors from detectPort itself
          console.error("Error detecting port:", err);
          process.exit(1); // Exit if port detection fails
      });

    