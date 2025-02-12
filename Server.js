require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const RegistrationSchema = new mongoose.Schema({
  serialNumber: String,
  name: String,
  rollNumber: String,
  email: { type: String, unique: true },
  purpose: String,
  photoUrl: String,
  signatureUrl: String,
  entryTimestamps: { type: [Date], default: [] }, // Stores scan timestamps
});

const Registration = mongoose.model("Registration", RegistrationSchema);

// Register New User
app.post("/api/register", async (req, res) => {
  const { name, rollNumber, email, purpose, photoUrl, signatureUrl } = req.body;

  if (!email.endsWith("@bitmesra.ac.in")) {
    return res.status(400).json({ message: "Only college emails are allowed." });
  }

  const existingUser = await Registration.findOne({ email });
  if (existingUser) {
    return res.status(400).json({ message: "This email is already registered." });
  }

  const serialNumber = `AUR-${Math.floor(1000 + Math.random() * 9000)}`;
  const newRegistration = new Registration({
    serialNumber,
    name,
    rollNumber,
    email,
    purpose,
    photoUrl,
    signatureUrl,
  });

  await newRegistration.save();
  res.status(201).json({ message: "Registration successful!", serialNumber });
});

// QR Validation & Entry Tracking
app.post("/api/validate-qr", async (req, res) => {
  const { serialNumber } = req.body;
  const user = await Registration.findOne({ serialNumber });

  if (!user) {
    return res.status(400).json({ message: "Invalid QR Code!" });
  }

  if (user.entryTimestamps.length >= 3) {
    return res.json({
      message: "Entry Limit Reached!",
      previousEntries: user.entryTimestamps,
    });
  }

  const currentTime = new Date();
  user.entryTimestamps.push(currentTime);
  await user.save();

  res.json({
    message: "Entry Granted!",
    previousEntries: user.entryTimestamps,
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
