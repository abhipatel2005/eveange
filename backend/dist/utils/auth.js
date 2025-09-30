import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
export class AuthUtils {
    static generateTokens(payload) {
        const accessToken = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRE || "1h",
        });
        const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
            expiresIn: process.env.JWT_REFRESH_EXPIRE || "7d",
        });
        return { accessToken, refreshToken };
    }
    static async hashPassword(password) {
        const saltRounds = 12;
        return bcrypt.hash(password, saltRounds);
    }
    static async comparePassword(password, hashedPassword) {
        return bcrypt.compare(password, hashedPassword);
    }
    static verifyToken(token, isRefreshToken = false) {
        const secret = isRefreshToken
            ? process.env.JWT_REFRESH_SECRET
            : process.env.JWT_SECRET;
        return jwt.verify(token, secret);
    }
    static generateRandomCode(length = 6) {
        const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let result = "";
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}
