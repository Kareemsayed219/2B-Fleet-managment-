/** Header rows the sheet importers accept, in the order shown to users. */
export const VEHICLE_COLUMNS = [
  "plate", "type", "ownership", "make", "model", "year", "tank_liters",
  "baseline_l_per_100km", "km_source", "gps_provider", "petroapp_card_id",
  "status", "license_expiry", "insurance_expiry", "notes",
] as const;

export const DRIVER_COLUMNS = [
  "full_name", "phone", "kind", "national_id", "license_class", "license_expiry", "status", "notes",
] as const;

/** Plates are stored with single spaces and upper case so one plate can't be entered twice. */
export function normalizePlate(p: string): string {
  return p.replace(/\s+/g, " ").trim().toUpperCase();
}
