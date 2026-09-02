import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET || "dev-only-change-me";

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role || "user" },
    secret,
    { expiresIn: "30d" }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, secret);
}
