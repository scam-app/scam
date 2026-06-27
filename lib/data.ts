import type {
  Supplier,
  Customer,
  InventoryItem,
  Request,
  RequestContext,
  RouteEval,
  TraceEntry,
} from "./types";
import { point } from "./geo";
import { computeMetrics } from "./routing";

import suppliers from "../data/suppliers.json";
import customers from "../data/customers.json";
import inventory from "../data/inventory.json";

const SUPPLIERS = suppliers as Record<string, Supplier>;
const CUSTOMERS = customers as Record<string, Customer>;
const INVENTORY = inventory as Record<string, InventoryItem>;

export function getSupplier(id: string): Supplier | null {
  return SUPPLIERS[id] ?? null;
}
export function getCustomer(id: string): Customer | null {
  return CUSTOMERS[id] ?? null;
}
export function getItem(sku: string): InventoryItem | null {
  return INVENTORY[sku] ?? null;
}

export function buildContext(req: Request): {
  context: RequestContext;
  trace: TraceEntry[];
} {
  const trace: TraceEntry[] = [];

  const supplier = getSupplier(req.supplierId);
  trace.push({
    kind: "lookup",
    label: "getSupplier",
    detail: supplier
      ? `${supplier.name} — origin ${supplier.coo}, ★${supplier.rating}${supplier.flags.length ? `, flags: ${supplier.flags.join(", ")}` : ""}`
      : `No supplier for ${req.supplierId}`,
    data: supplier,
  });

  const customer = getCustomer(req.customerId);
  trace.push({
    kind: "lookup",
    label: "getCustomer",
    detail: customer
      ? `${customer.name} — deliver to ${customer.country}${customer.riskFlags.length ? `, flags: ${customer.riskFlags.join(", ")}` : ""}`
      : `No customer for ${req.customerId}`,
    data: customer,
  });

  const item = getItem(req.sku);
  const destination = point(customer?.country);
  trace.push({
    kind: "lookup",
    label: "getItem",
    detail: item
      ? `${item.name} (${req.sku}) — stocked in ${item.locations.map((l) => l.loc).join(", ")}`
      : `No item for ${req.sku}`,
    data: item,
  });

  return {
    context: { request: req, supplier, customer, item, destination },
    trace,
  };
}

// Build the fully-evaluated candidate routes (metrics computed once).
export function buildRoutes(ctx: RequestContext): RouteEval[] {
  const { request: req, item, supplier, destination } = ctx;
  if (!item) return [];
  return item.locations.map((loc) => {
    const source = point(loc.loc);
    const { metrics, distanceKm, blocked, blockReason } = computeMetrics(
      loc,
      source,
      destination,
      req,
      supplier
    );
    return {
      loc: loc.loc,
      source,
      destination,
      available: loc.available,
      leadTimeDays: loc.leadTimeDays,
      distanceKm,
      feasible: loc.available >= req.qty,
      blocked,
      blockReason,
      metrics,
      score: 0,            // filled by rankAndDecide
      isProposed: loc.loc === req.preferredLoc,
      isRecommended: false,
    };
  });
}
