// ============================================================
// THE CONTRACT — route-decisioning model.
// The engine evaluates candidate shipping ROUTES and recommends one.
// ============================================================

export type Dimension =
  | "reliability"   // carrier / supplier on-time track record (LLM)
  | "cost"          // route cost vs order value (LLM)
  | "service"       // stock + lead-time feasibility (LLM)
  | "geo"           // transit distance / region exposure (deterministic)
  | "compliance";   // sanctions / export controls (deterministic)

// Route decision the engine outputs.
export type RouteAction = "OPTIMAL" | "REROUTE" | "REVIEW" | "BLOCKED";

export interface Supplier {
  id: string;
  name: string;
  coo: string;           // country of origin / manufacture
  ageMonths: number;
  rating: number;        // 0–5
  flags: string[];       // e.g. ["late_delivery", "disputed_invoice"]
}

export interface StockLocation {
  loc: string;           // location code stock ships from
  available: number;
  leadTimeDays: number;
}

export interface InventoryItem {
  sku: string;
  name: string;
  locations: StockLocation[];   // every place this SKU is stocked
}

export interface Customer {
  id: string;
  name: string;
  country: string;       // destination country
  creditLimit: number;
  outstandingBalance: number;
  riskFlags: string[];
  orderCount: number;
}

export interface Request {
  id: string;
  sku: string;
  qty: number;
  supplierId: string;
  customerId: string;
  preferredLoc: string;  // the route the operator/ERP initially proposed
  amount: number;        // order value USD
  expedite: boolean;
  createdAt: string;
  summary?: string;
}

// A located place on the map.
export interface GeoPoint {
  code: string;
  name: string;
  lat: number;
  lng: number;
}

// The intrinsic, weight-independent metrics for one candidate route (0–100 risk).
export interface RouteMetrics {
  geo: number;
  compliance: number;
  cost: number;
  speed: number;        // lead-time risk
}

// A live logistics signal an ERP's static data wouldn't have.
export interface RouteSignal {
  kind: "disruption" | "surcharge" | "weather" | "capacity";
  label: string;
  source: string;
  costDelta: number;
  speedDelta: number;
  geoDelta: number;
}

// One candidate route fully evaluated.
export interface RouteEval {
  loc: string;
  source: GeoPoint | null;
  destination: GeoPoint | null;
  available: number;
  leadTimeDays: number;
  distanceKm: number;
  feasible: boolean;        // enough stock for the order
  blocked: boolean;         // sanctioned / not allowed
  blockReason: string | null;
  signal: RouteSignal | null;   // live disruption / rate signal on this lane
  metrics: RouteMetrics;
  score: number;            // weighted total (lower = better); Infinity if unusable
  isProposed: boolean;
  isRecommended: boolean;
}

// A specialist's qualitative read on the recommended route.
export interface Verdict {
  dimension: Dimension;
  score: number;         // 0–100, higher = more risk
  rationale: string;
  evidence: string[];
  confidence: number;    // 0–1
}

// Editable policy — steering mutates this.
export interface Policy {
  weights: {
    geo: number;
    compliance: number;
    cost: number;
    speed: number;
  };
  thresholds: {
    reviewAbove: number;        // recommended route score >= this -> REVIEW
    improvementMargin: number;  // alt must beat proposed by this to REROUTE
  };
  constraint?: string;          // free-text steering, injected into specialists
}

// Context for the request being decided.
export interface RequestContext {
  request: Request;
  supplier: Supplier | null;
  customer: Customer | null;
  item: InventoryItem | null;
  destination: GeoPoint | null;
}

// One line in the trace panel.
export interface TraceEntry {
  kind: "lookup" | "route" | "specialist" | "decide";
  label: string;
  detail: string;
  data?: unknown;
}

// The full decision record rendered by the UI.
export interface DecisionTrace {
  requestId: string;
  itemName: string;
  qty: number;
  destination: GeoPoint | null;
  expedite: boolean;
  routes: RouteEval[];          // every candidate, scored
  proposedLoc: string;
  recommendedLoc: string | null;
  action: RouteAction;
  weightedRisk: number;         // recommended route score (for display)
  routerExplanation: string;
  verdicts: Verdict[];          // specialist reads on the recommended route
  trace: TraceEntry[];
  path: "fast" | "deep";
}
