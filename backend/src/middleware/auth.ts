import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({
        success: false,
        error: "Access token required",
      });
      return;
    }

    // Clean token (remove any extra whitespace or characters)
    const cleanToken = token.trim();

    // Verify JWT token
    const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET!) as any;

    // Get user from Supabase
    const { data: user, error } = await supabase
      .from("users")
      .select("id, email, role, name")
      .eq("id", decoded.userId)
      .single();

    if (error || !user) {
      res.status(401).json({
        success: false,
        error: "Invalid token",
      });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);

    // Handle specific JWT errors
    if (error instanceof jwt.JsonWebTokenError) {
      if (error.name === "TokenExpiredError") {
        res.status(401).json({
          success: false,
          error: "Token expired",
          code: "TOKEN_EXPIRED",
        });
      } else if (error.name === "JsonWebTokenError") {
        res.status(401).json({
          success: false,
          error: "Invalid token format",
          code: "TOKEN_MALFORMED",
        });
      } else {
        res.status(401).json({
          success: false,
          error: "Invalid token",
          code: "TOKEN_INVALID",
        });
      }
    } else {
      res.status(500).json({
        success: false,
        error: "Authentication failed",
        code: "AUTH_ERROR",
      });
    }
  }
};

export const requireRole = (roles: string[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: "Authentication required",
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: "Insufficient permissions",
      });
      return;
    }

    next();
  };
};

// Middleware to require organizer role
export const requireOrganizer = requireRole(["organizer", "admin"]);

// Middleware to require admin role
export const requireAdmin = requireRole(["admin"]);
