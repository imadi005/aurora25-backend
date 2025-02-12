const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();

app.use(cors());
app.use(bodyParser.json());

let registeredEntries = []; // Store registered entries
let scannedEntries = new Set(); // Track scanned entries

// Registration endpoint
app.post("/api/register", (req, res) => {
  const { name, rollNumber, email, purpose } = req.body;

  if (!name || !rollNumber || !email || !purpose) {
    return res.status(400).json({ message: "All fields are required." });
  }

  // Duplicate email check
  const emailExists = registeredEntries.some((entry) => entry.email === email);
  if (emailExists) {
    return res.status(400).json({ message: "This email is already registered!" });
  }

  // Generate a unique serial number
  const serialNumber = `AUR-${Math.floor(1000 + Math.random() * 9000)}`;

  // Save the new entry
  const newEntry = { name, rollNumber, email, purpose, serial: serialNumber };
  registeredEntries.push(newEntry);

  return res.status(201).json(newEntry);
});

// QR code verification endpoint
app.post("/api/verify-entry", (req, res) => {
  const { serial } = req.body;

  if (!serial) {
    return res.status(400).json({ message: "QR code serial number is required." });
  }

  // Check if the serial exists in the registered entries
  const entry = registeredEntries.find((entry) => entry.serial === serial);
  if (!entry) {
    return res.status(404).json({ message: "Invalid QR code!" });
  }

  // Check if the QR code has already been scanned
  if (scannedEntries.has(serial)) {
    return res.status(403).json({ message: "Entry already scanned!" });
  }

  // Mark the QR code as scanned
  scannedEntries.add(serial);

  return res.status(200).json({
    message: "Entry verified successfully!",
    details: entry,
  });
});

// Start server
app.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});
