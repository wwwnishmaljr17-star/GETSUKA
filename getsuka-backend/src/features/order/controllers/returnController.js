/**
 * Return Controller
 *
 * All admin return management endpoints are consolidated in orderController.js
 * as the single source of truth.
 *
 * This re-export ensures backward compatibility and eliminates duplicate logic.
 */
export { getAdminReturns } from "./orderController.js";