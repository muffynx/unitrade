import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";

export const verifyAdmin = async (req: any, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token provided" });

  const token = authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Invalid token" });

  try {
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET as string);
    const user = await User.findById(decoded.id);
    if (!user || user.role?.toLowerCase() !== "admin") {
      return res.status(403).json({ message: "Access denied" });
    }
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token invalid", error: err });
  }
};
