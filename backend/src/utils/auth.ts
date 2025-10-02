import jwt, { SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

export class AuthUtils {
  static generateTokens(payload: TokenPayload) {
    const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
      expiresIn: "1h",
    });

    const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
      expiresIn: "7d",
    });

    return { accessToken, refreshToken };
  }

  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  static async comparePassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  static verifyToken(token: string, isRefreshToken = false): TokenPayload {
    const secret = isRefreshToken
      ? process.env.JWT_REFRESH_SECRET!
      : process.env.JWT_SECRET!;

    return jwt.verify(token, secret) as TokenPayload;
  }

  static generateRandomCode(length = 6): string {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}
