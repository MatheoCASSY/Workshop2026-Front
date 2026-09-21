import mysql from "mysql2/promise";
import { getEnv } from "./env";

const globalForDb = globalThis as unknown as { mysqlPool?: mysql.Pool };

export function getDb(): mysql.Pool {
  if (!globalForDb.mysqlPool) {
    const env = getEnv();
    globalForDb.mysqlPool = mysql.createPool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      connectionLimit: 10,
    });
  }
  return globalForDb.mysqlPool;
}
