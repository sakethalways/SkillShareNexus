import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || "your_secret_key";

export function generateToken(payload: object) {
    return jwt.sign(payload, SECRET_KEY, { expiresIn: "7d" });
}

export function verifyToken(token: string) {
    try {
        return jwt.verify(token, SECRET_KEY);
    } catch (error) {
        return null;
    }
}
