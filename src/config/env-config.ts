import { config } from "dotenv";
import { createHttpClient } from "../adapters/http";

config();

const { BACKEND_URL } = process.env;
const { PREFIX } = process.env;

if (!BACKEND_URL || BACKEND_URL.length === 0)
    throw new Error("Url do backend não definida");

export const api = createHttpClient(BACKEND_URL);
export const prefix = PREFIX || "/";
