require("dotenv").config(); // Load environment variables
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// ✅ Log incoming requests for debugging
app.use((req, res, next) => {
  console.log(`Incoming Request: ${req.method} ${req.url}`);
  next();
});

// ✅ Check if .env file is correctly loaded
if (!process.env.MONGO_URI) {
  console.error("❌ MONGO_URI is missing! Check your .env file.");
  process.exit(1);
}

// ✅ Connect to MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
  });

// ✅ Define Schema & Model
const RegistrationSchema = new mongoose.Schema({
  name: String,
  rollNumber: String,
  email: { type: String, unique: true },
  purpose: String,
  serial: String,
  scannedEntries: { type: [Date], default: [] }, // Store scan timestamps
});

const Registration = mongoose.model("Registration", RegistrationSchema);

// ✅ Registration Endpoint
app.post("/api/register", async (req, res) => {
  const { name, rollNumber, email, purpose } = req.body;

  if (!name || !rollNumber || !email || !purpose) {
    return res.status(400).json({ success: false, message: "All fields are required." });
  }

  try {
    // ✅ Check if email is already registered
    const emailExists = await Registration.findOne({ email });
    if (emailExists) {
      return res.status(400).json({ success: false, message: "This email is already registered!" });
    }

    // ✅ Generate unique serial number
    const serialNumber = `AUR-${Math.floor(1000 + Math.random() * 9000)}`;

    // ✅ Save entry in MongoDB
    const newEntry = new Registration({ name, rollNumber, email, purpose, serial: serialNumber });
    await newEntry.save();

    return res.status(201).json({ success: true, entry: newEntry });
  } catch (error) {
    console.error("❌ Registration Error:", error);
    return res.status(500).json({ success: false, message: "Server error. Please try again later." });
  }
});

// ✅ QR Code Verification Endpoint
app.post("/api/verify-entry", async (req, res) => {
  const { serial } = req.body;

  if (!serial) {
    return res.status(400).json({ success: false, message: "QR code serial number is required." });
  }

  try {
    // ✅ Find the entry in MongoDB
    const entry = await Registration.findOne({ serial });

    if (!entry) {
      return res.status(404).json({ success: false, message: "Invalid QR code!" });
    }

    // ✅ Allow only 3 scans
    if (entry.scannedEntries.length >= 3) {
      return res.status(403).json({ 
        success: false,
        message: "Entry already scanned 3 times!",
        scanTimes: entry.scannedEntries
      });
    }

    // ✅ Update scanned entries
    entry.scannedEntries.push(new Date());
    await entry.save();

    return res.status(200).json({
      success: true,
      message: "Entry verified successfully!",
      details: entry,
      scanTimes: entry.scannedEntries
    });

  } catch (error) {
    console.error("❌ Verification Error:", error);
    return res.status(500).json({ success: false, message: "Server error. Please try again later." });
  }
});

// ✅ Start Server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
