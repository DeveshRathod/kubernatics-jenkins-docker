import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

const verifyUser = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  if (!authHeader)
    return res.status(401).json({ message: "Authorization header missing" });

  const token = authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Token missing" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("Error in verifyUser middleware:", err);
    return res.status(403).json({ message: "Invalid token" });
  }
};

export default verifyUser;
