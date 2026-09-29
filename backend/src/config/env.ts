import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Variable de entorno faltante: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: required("NODE_ENV", "development"),
  port: Number(required("PORT", "3000")),
  databaseUrl: required("DATABASE_URL"),
  jwtAccessSecret: required("JWT_ACCESS_SECRET"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
  jwtAccessExpiresIn: required("JWT_ACCESS_EXPIRES_IN", "8h"),
  jwtRefreshExpiresIn: required("JWT_REFRESH_EXPIRES_IN", "30d"),
};
