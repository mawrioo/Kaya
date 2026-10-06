/**
 * The shapes of the app's data. The backend owns them (backend/src/types.ts);
 * this file only re-exports them as types. Nothing from the backend folder is
 * bundled into the frontend, and every import from "@/lib/types" keeps working.
 */
export type * from "../../backend/src/types"
