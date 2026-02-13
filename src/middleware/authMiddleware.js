const jwt = require("jsonwebtoken");
const User = require("../models/UserModel"); // optional but recommended

/*
========================================
AUTH MIDDLEWARE
========================================
*/
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    // 1️⃣ Check header exists
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authorization token missing",
      });
    }

    // 2️⃣ Extract token
    const token = authHeader.split(" ")[1];

    // 3️⃣ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4️⃣ Attach user to request
    // minimal (fastest)
    req.user = { _id: decoded.userId };

    // OPTIONAL (recommended for real apps)
    // fetch full user
    // const user = await User.findById(decoded.userId).select("-password");
    // if (!user) return res.status(401).json({ message: "User not found" });
    // req.user = user;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};

module.exports = authMiddleware;
