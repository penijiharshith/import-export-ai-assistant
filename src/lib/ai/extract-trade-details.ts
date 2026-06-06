import type { EmailCategory } from "@/lib/ai/classify-email";
import { chat } from "@/lib/ai/groq";

export type ExtractTradeDetailsInput = {
  subject: string | null;
  body: string | null;
  sender: string | null;
  category: EmailCategory | string | null;
};

export type ExtractedTradeDetails = {
  product: string | null;
  quantity: string | null;
  price: string | null;
  incoterm: string | null;
  origin_country: string | null;
  destination_country: string | null;
  delivery_date: string | null;
  payment_terms: string | null;
  missing_fields: string[];
  risk_notes: string[];
  supplier_name?: string | null;
  currency?: string | null;
  moq?: string | null;
  lead_time?: string | null;
  packaging?: string | null;
};

type TradeField =
  | "product"
  | "quantity"
  | "price"
  | "incoterm"
  | "origin_country"
  | "destination_country"
  | "delivery_date"
  | "payment_terms";

type ParsedTradeDetails = Partial<Record<TradeField, string | null>> & {
  supplier_name?: string | null;
  currency?: string | null;
  moq?: string | null;
  lead_time?: string | null;
  packaging?: string | null;
  risk_notes: string[];
};

type GroqFallbackDetails = Partial<Record<TradeField | "supplier_name" | "currency" | "moq" | "lead_time" | "packaging", string | null>>;

type ValidationResult = {
  name: string;
  passed: boolean;
  details: ParsedTradeDetails;
};

export const FIELD_LABELS = [
  "product",
  "item",
  "description",
  "quantity",
  "qty",
  "units",
  "no. of units",
  "price",
  "unit price",
  "target price",
  "indicative price",
  "rate",
  "cost",
  "incoterm",
  "incoterms",
  "shipping terms",
  "terms",
  "moq",
  "minimum order",
  "lead time",
  "payment terms",
  "payment",
  "packaging",
  "packing",
  "origin",
  "destination",
  "port",
  "deliver to",
  "ship to",
  "delivery",
  "required delivery",
  "delivery date",
  "ship by",
  "shipment",
  "quotation validity",
  "validity",
] as const;

const tradeFields: TradeField[] = [
  "product",
  "quantity",
  "price",
  "incoterm",
  "origin_country",
  "destination_country",
  "delivery_date",
  "payment_terms",
];

const emptyDetails: ExtractedTradeDetails = {
  product: null,
  quantity: null,
  price: null,
  incoterm: null,
  origin_country: null,
  destination_country: null,
  delivery_date: null,
  payment_terms: null,
  missing_fields: [],
  risk_notes: [],
};

const knownLocations = [
  "Jebel Ali",
  "Nhava Sheva",
  "Singapore",
  "Shenzhen",
  "Shanghai",
  "Guangzhou",
  "Germany",
  "Ningbo",
  "Mumbai",
  "Chennai",
  "Mundra",
  "Dubai",
  "China",
  "India",
  "UAE",
];

const incotermCodes = ["EXW", "FOB", "CIF", "CFR", "DDP", "DAP", "FCA", "CPT", "CIP", "DAT", "FAS", "DES", "DDU", "CNF"];

function nullableString(value: unknown, maxLength = 220) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim();

  if (!cleaned || /^(not provided|n\/a|na|none|null|unknown)$/i.test(cleaned)) {
    return null;
  }

  return cleaned.slice(0, maxLength);
}

function compactValue(value: string) {
  return nullableString(value.replace(/\s+/g, " ").replace(/^[\s:=-]+/, "").replace(/[.;,\s]+$/g, ""));
}

function normalizeGroqFallbackDetails(value: unknown): GroqFallbackDetails {
  const candidate = value && typeof value === "object" ? (value as GroqFallbackDetails) : {};

  return {
    product: nullableString(candidate.product),
    quantity: nullableString(candidate.quantity),
    price: nullableString(candidate.price),
    incoterm: nullableString(candidate.incoterm),
    origin_country: nullableString(candidate.origin_country),
    destination_country: nullableString(candidate.destination_country),
    delivery_date: nullableString(candidate.delivery_date),
    payment_terms: nullableString(candidate.payment_terms),
    supplier_name: nullableString(candidate.supplier_name),
    currency: nullableString(candidate.currency),
    moq: nullableString(candidate.moq),
    lead_time: nullableString(candidate.lead_time),
    packaging: nullableString(candidate.packaging),
  };
}

export function normalizeTradeText(text: string) {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \f\v]+/g, " ")
    .replace(/[ \f\v]*\n[ \f\v]*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeLabel(label: string) {
  return label.toLowerCase().replaceAll(/[^a-z0-9]+/g, " ").trim();
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dedupeStrings(values: string[]) {
  const seen = new Set<string>();

  return values.filter((value) => {
    const key = value.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function getLabelMatches(text: string) {
  const labelPattern = [...FIELD_LABELS]
    .sort((first, second) => second.length - first.length)
    .map(escapeRegExp)
    .join("|");
  const regex = new RegExp(`(^|[^A-Za-z0-9])(${labelPattern})\\s*[:=\\-]`, "gi");
  const matches: Array<{ label: string; start: number; valueStart: number }> = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    matches.push({
      label: normalizeLabel(match[2]),
      start: match.index + match[1].length,
      valueStart: regex.lastIndex,
    });
  }

  return matches.sort((first, second) => first.start - second.start);
}

export function extractLabeledField(text: string, labels: string[]) {
  const normalizedText = normalizeTradeText(text);
  const acceptedLabels = new Set(labels.map(normalizeLabel));
  const matches = getLabelMatches(normalizedText);
  const matchIndex = matches.findIndex((match) => acceptedLabels.has(match.label));

  if (matchIndex === -1) {
    return null;
  }

  const currentMatch = matches[matchIndex];
  const nextMatch = matches[matchIndex + 1];
  const nextLineBreak = normalizedText.indexOf("\n", currentMatch.valueStart);
  const nextBoundary = nextMatch?.start ?? normalizedText.length;
  const end = nextLineBreak !== -1 && nextLineBreak < nextBoundary ? nextLineBreak : nextBoundary;

  return compactValue(normalizedText.slice(currentMatch.valueStart, end));
}

function extractStructuredLineField(text: string, labels: string[]) {
  const lines = normalizeTradeText(text).split("\n");

  for (const label of labels) {
    const regex = new RegExp(`^\\s*(?:[-*•]\\s*)?${escapeRegExp(label)}\\s*[:=\\-]\\s*(.+?)\\s*$`, "i");

    for (const line of lines) {
      const value = compactValue(line.match(regex)?.[1] ?? "");

      if (value) {
        return value;
      }
    }
  }

  return null;
}

function extractStructuredValue(text: string, labels: string[]) {
  return extractStructuredLineField(text, labels) ?? extractLabeledField(text, labels);
}

export function inferCountryFromText(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const text = value.toLowerCase();

  if (/\b(dubai|jebel ali|uae|united arab emirates)\b/.test(text)) {
    return "UAE";
  }

  if (/\bsingapore\b/.test(text)) {
    return "Singapore";
  }

  if (/\bgermany\b/.test(text)) {
    return "Germany";
  }

  if (/\b(ningbo|shenzhen|shanghai|guangzhou|china)\b/.test(text)) {
    return "China";
  }

  if (/\b(mumbai|nhava sheva|chennai|mundra|india)\b/.test(text)) {
    return "India";
  }

  return null;
}

function locationPattern() {
  return knownLocations.map(escapeRegExp).join("|");
}

function inferCurrencyFromText(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const match = value.match(/\b(USD|EUR|GBP|INR|CNY|AED)\b/i);

  if (match) {
    return match[1].toUpperCase();
  }

  return value.includes("$") ? "USD" : null;
}

function inferSupplierName(sender: string | null | undefined) {
  if (!sender) {
    return null;
  }

  const displayName = sender.split("<")[0]?.trim().replace(/^["']|["']$/g, "");

  return nullableString(displayName) ?? nullableString(sender);
}

function parseIncoterm(text: string) {
  const match = normalizeTradeText(text).match(
    new RegExp(`\\b(${incotermCodes.join("|")})(?:\\s+(${locationPattern()}))?(?=\\b|[,.;\\n]|$)`, "i")
  );

  if (!match) {
    return null;
  }

  return match[2] ? `${match[1].toUpperCase()} ${match[2].trim()}` : match[1].toUpperCase();
}

function applyIncotermCountry(details: ParsedTradeDetails) {
  const incoterm = details.incoterm?.toUpperCase();
  const country = inferCountryFromText(details.incoterm);

  if (!incoterm || !country) {
    return;
  }

  if (/^(CIF|CNF|CFR|DAP|DDP|CPT|CIP|DAT|DES|DDU)\b/.test(incoterm)) {
    details.destination_country = details.destination_country ?? country;
  }

  if (/^(FOB|EXW|FCA|FAS)\b/.test(incoterm)) {
    details.origin_country = details.origin_country ?? country;
  }
}

export function parseStructuredFields(text: string): ParsedTradeDetails {
  const normalizedText = normalizeTradeText(text);
  const origin = extractStructuredValue(normalizedText, ["origin"]);
  const destination = extractStructuredValue(normalizedText, ["destination", "port", "deliver to", "ship to"]);
  const details: ParsedTradeDetails = {
    product: extractStructuredValue(normalizedText, ["product", "item", "description"]),
    quantity: extractStructuredValue(normalizedText, ["quantity", "qty", "units", "no. of units"]),
    price: extractStructuredValue(normalizedText, ["unit price", "target price", "indicative price", "price", "rate", "cost"]),
    incoterm: extractStructuredValue(normalizedText, ["incoterm", "incoterms", "shipping terms"]),
    origin_country: origin ? inferCountryFromText(origin) ?? origin : null,
    destination_country: destination ? inferCountryFromText(destination) ?? destination : null,
    delivery_date: extractStructuredValue(normalizedText, ["required delivery", "delivery date", "delivery", "lead time", "ship by", "shipment"]),
    payment_terms: extractStructuredValue(normalizedText, ["payment terms", "payment", "terms"]),
    moq: extractStructuredValue(normalizedText, ["moq", "minimum order"]),
    lead_time: extractStructuredValue(normalizedText, ["lead time"]),
    packaging: extractStructuredValue(normalizedText, ["packaging", "packing"]),
    risk_notes: [],
  };

  details.incoterm = details.incoterm ?? parseIncoterm(normalizedText);
  details.currency = inferCurrencyFromText(details.price);
  applyIncotermCountry(details);

  return details;
}

function firstMatch(text: string, patterns: RegExp[]) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = compactValue(match?.[1] ?? "");

    if (value) {
      return value;
    }
  }

  return null;
}

function parseMessyProduct(text: string) {
  return firstMatch(text, [
    /\b(?:need|require|looking for|quote for|inquiry for)\s+(?:around\s+)?(?:\d[\d,]*(?:\.\d+)?|[1-9]\d*(?:\.\d+)?k)\s*(?:pcs|pc|pieces|units|sets)?\s+(.+?)(?=\s+\b(?:CIF|FOB|EXW|CNF|CFR|DAP|DDP)\b|,|\.|\n|$)/i,
    /\b(?:we can offer|can offer|offer)\s+(.+?)\s+at\s+(?:USD|INR|EUR|GBP|AED|\$)\s*\d/i,
    /\b(?:for|quote for|quotation for)\s+(.+?)(?=\s+(?:at|CIF|FOB|EXW|CNF|CFR|DAP|DDP)\b|,|\.|\n|$)/i,
  ]);
}

function parseMessyQuantity(text: string) {
  return firstMatch(text, [
    /\b(?:qty|quantity|no\.?\s+of\s+units)\s*(?:is|:|=|-)?\s*(?:around|approx|about)?\s*((?:\d[\d,]*(?:\.\d+)?|[1-9]\d*(?:\.\d+)?k)\s*(?:pcs|pc|pieces|units|sets|cartons|boxes))\b/i,
    /\b(?:for|need|require|required|order)\s+((?:\d[\d,]*(?:\.\d+)?|[1-9]\d*(?:\.\d+)?k)\s*(?:pcs|pc|pieces|units|sets|cartons|boxes))\b/i,
    /\b((?:\d[\d,]*(?:\.\d+)?|[1-9]\d*(?:\.\d+)?k)\s*(?:pcs|pc|pieces|units|sets|cartons|boxes))\b/i,
    /\b(?:need|require|required)\s+(\d[\d,]*(?:\.\d+)?|[1-9]\d*(?:\.\d+)?k)\b/i,
  ]);
}

function parseMessyPrice(text: string) {
  return firstMatch(text, [
    /\b((?:USD|INR|EUR|GBP|CNY|AED|\$)\s*\d[\d,]*(?:\.\d+)?\s*(?:per\s+(?:piece|unit|pc)|\/(?:unit|pc)|each)?)\b/i,
    /\b(?:target|target price|price is|price|rate|cost)\s*(?:is|around|at)?\s*((?:USD|INR|EUR|GBP|CNY|AED|\$)\s*\d[\d,]*(?:\.\d+)?\s*(?:per\s+(?:piece|unit|pc)|\/(?:unit|pc)|each)?)\b/i,
    /\b(?:target|target price)\s*(?:is|around|at)?\s*(\d[\d,]*(?:\.\d+)?\s*(?:USD|INR|EUR|GBP|CNY|AED)\s*(?:per\s+(?:piece|unit|pc)|\/(?:unit|pc)|each)?)\b/i,
    /\b(\d[\d,]*(?:\.\d+)?\s*dollars?\s*(?:per\s+(?:piece|unit|pc)|\/pc|each)?)\b/i,
  ]);
}

function parseMessyPaymentTerms(text: string) {
  return firstMatch(text, [
    /\b(\d{1,3}\s*\/\s*\d{1,3}\s*TT)\b/i,
    /\b((?:T\/T|TT)\s*[^.;\n]*(?:balance against\s+B\/?L copy|before shipment|$))/i,
    /\b((?:L\/C|LC)\s*(?:at\s+sight|sight|\d+\s*days?)?)\b/i,
    /\b(sight\s+(?:L\/C|LC))\b/i,
    /\b((?:DP|DA|CAD)(?:\s+\d+\s*days?)?)\b/i,
    /\b(telegraphic transfer(?:\s+\d+\s*days?)?)\b/i,
    /\b(\d{1,3}%\s*(?:advance|before shipment)[^.;\n]*)/i,
    /\b(balance against\s+B\/?L copy)\b/i,
  ]);
}

function parseMessyLeadTime(text: string) {
  return firstMatch(text, [
    /\b(\d{1,3}\s*(?:-|to)\s*\d{1,3}\s*days?)\s*(?:lead time|production)?\b/i,
    /\b(\d{1,3}\s*days?)\s*(?:lead time|production)\b/i,
    /\b(?:lead time|production)\s*(?:is|around|approx)?\s*(\d{1,3}\s*(?:-|to)?\s*\d{0,3}\s*days?)\b/i,
    /\bdelivery\s+in\s+(\d{1,3}\s*days?)\b/i,
  ]);
}

function parseMessyDeliveryDate(text: string) {
  return firstMatch(text, [
    /\b(required\s+before\s+\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\s+\d{4})\b/i,
    /\b((?:before|by|on)\s+\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\s+\d{4})\b/i,
    /\b(before\s+[A-Za-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s*\d{4})?)\b/i,
    /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/i,
    /\b(delivery\s+[A-Za-z]+\s+(?:first|second|third|last)\s+week)\b/i,
  ]);
}

function parseMessyDestination(text: string, incoterm: string | null | undefined) {
  const incotermCountry = incoterm && /^(CIF|CNF|CFR|DAP|DDP|CPT|CIP|DAT|DES|DDU)\b/i.test(incoterm)
    ? inferCountryFromText(incoterm)
    : null;
  const explicitDestination = firstMatch(text, [
    new RegExp(`\\b(?:to|for|destination)\\s+(${locationPattern()})(?=\\b|[,.;\\n]|$)`, "i"),
  ]);

  return incotermCountry ?? inferCountryFromText(explicitDestination) ?? explicitDestination;
}

function parseMessyOrigin(text: string, incoterm: string | null | undefined) {
  const incotermCountry = incoterm && /^(FOB|EXW|FCA|FAS)\b/i.test(incoterm)
    ? inferCountryFromText(incoterm)
    : null;
  const explicitOrigin = firstMatch(text, [
    new RegExp(`\\bfrom\\s+(${locationPattern()})(?=\\b|[,.;\\n]|$)`, "i"),
  ]);

  return incotermCountry ?? inferCountryFromText(explicitOrigin) ?? explicitOrigin;
}

export function parseMessyPatterns(text: string): ParsedTradeDetails {
  const normalizedText = normalizeTradeText(text);
  const incoterm = parseIncoterm(normalizedText);
  const details: ParsedTradeDetails = {
    product: parseMessyProduct(normalizedText),
    quantity: parseMessyQuantity(normalizedText),
    price: parseMessyPrice(normalizedText),
    incoterm,
    origin_country: parseMessyOrigin(normalizedText, incoterm),
    destination_country: parseMessyDestination(normalizedText, incoterm),
    delivery_date: parseMessyDeliveryDate(normalizedText),
    payment_terms: parseMessyPaymentTerms(normalizedText),
    moq: firstMatch(normalizedText, [/\bMOQ\s*[:=\-]?\s*((?:\d[\d,]*(?:\.\d+)?|[1-9]\d*(?:\.\d+)?k)\s*(?:pcs|pc|pieces|units|sets))\b/i]),
    lead_time: parseMessyLeadTime(normalizedText),
    packaging: firstMatch(normalizedText, [/\b(?:packaging|packing)\s*(?:is|:|=|-)?\s*([^.;\n]+)/i]),
    currency: null,
    risk_notes: [],
  };

  details.currency = inferCurrencyFromText(details.price);
  addRiskNotes(normalizedText, details);

  return details;
}

function addRiskNotes(text: string, details: ParsedTradeDetails) {
  if (/\b100\s*%\s*advance\b/i.test(text)) {
    details.risk_notes.push("100% advance payment requested");
  } else if (/\badvance\b/i.test(text)) {
    details.risk_notes.push("100% advance not present, but advance payment exists");
  }

  if (/raw material pricing may increase|raw material.*increase|pricing may increase|price.*increase next week/i.test(text)) {
    details.risk_notes.push("Price validity pressure due to raw material increase");
  }

  if (/\b(confirm immediately|urgent confirmation|valid for\s*(?:24|48)\s*hours?)\b/i.test(text)) {
    details.risk_notes.push("Short decision pressure in supplier communication");
  }
}

function mergeParsedDetails(
  structured: ParsedTradeDetails,
  messy: ParsedTradeDetails,
  aiDetails: GroqFallbackDetails | null
): ExtractedTradeDetails {
  const merged: ExtractedTradeDetails = { ...emptyDetails };

  tradeFields.forEach((field) => {
    merged[field] = nullableString(structured[field]) ?? nullableString(messy[field]) ?? aiDetails?.[field] ?? null;
  });

  merged.risk_notes = dedupeStrings([
    ...structured.risk_notes,
    ...messy.risk_notes,
  ]).slice(0, 12);

  return merged;
}

function hasPaymentSignal(text: string) {
  return /\b(l\/c|lc|letter of credit|t\/t|tt|advance|balance against\s+b\/?l|before shipment)\b/i.test(text);
}

function hasQuantitySignal(text: string) {
  return /\b(?:\d[\d,]*(?:\.\d+)?|[1-9]\d*(?:\.\d+)?k)\s*(?:pcs|pc|pieces|units|sets|cartons|boxes)\b/i.test(text)
    || /\b(?:need|require|required)\s+\d[\d,]*(?:\.\d+)?\b/i.test(text);
}

function hasPriceSignal(text: string) {
  return /\b(?:USD|INR|EUR|GBP|CNY|AED|\$)\s*\d[\d,]*(?:\.\d+)?\b/i.test(text)
    || /\btarget price\b/i.test(text);
}

function computeMissingFields(details: ExtractedTradeDetails, sourceText: string) {
  const requiredFields: TradeField[] = ["product", "quantity", "price", "payment_terms", "delivery_date"];

  return requiredFields.filter((field) => {
    if (details[field]) {
      return false;
    }

    if (field === "payment_terms" && hasPaymentSignal(sourceText)) {
      return false;
    }

    if (field === "quantity" && hasQuantitySignal(sourceText)) {
      return false;
    }

    if (field === "price" && hasPriceSignal(sourceText)) {
      return false;
    }

    return true;
  });
}

async function extractGroqFallback({
  subject,
  body,
  sender,
  category,
  currentDetails,
  missingFields,
}: ExtractTradeDetailsInput & {
  currentDetails: ExtractedTradeDetails & { moq?: string | null };
  missingFields: string[];
}) {
  const content = await chat(
    [
      {
        role: "system",
        content: [
          "You are a trade document parser. Extract the requested missing fields from this email body.",
          "Return ONLY a valid JSON object with these keys: product, quantity, price, incoterm, origin_country, destination_country, payment_terms, delivery_date, supplier_name, currency, moq, lead_time, packaging.",
          "Use null for any field that is genuinely not mentioned.",
          "Do NOT invent values. Do NOT explain anything.",
          "Fill only fields that are still missing. Do not replace current extraction values.",
        ].join("\n"),
      },
      {
        role: "user",
        content: JSON.stringify({
          sender: sender ?? "",
          subject: subject ?? "",
          body: body ?? "",
          category: category ?? "",
          current_extraction: currentDetails,
          missing_fields_to_fill: missingFields,
        }),
      },
    ],
    { temperature: 0.05, json: true }
  );

  try {
    return normalizeGroqFallbackDetails(JSON.parse(content));
  } catch {
    return {};
  }
}

function buildFinalDetails(
  structured: ParsedTradeDetails,
  messy: ParsedTradeDetails,
  aiDetails: GroqFallbackDetails | null,
  sourceText: string
) {
  const merged = mergeParsedDetails(structured, messy, aiDetails);
  merged.missing_fields = computeMissingFields(merged, sourceText);
  merged.supplier_name = nullableString(structured.supplier_name) ?? nullableString(messy.supplier_name) ?? aiDetails?.supplier_name ?? null;
  merged.currency = nullableString(structured.currency) ?? nullableString(messy.currency) ?? aiDetails?.currency ?? inferCurrencyFromText(merged.price) ?? "USD";
  merged.moq = nullableString(structured.moq) ?? nullableString(messy.moq) ?? aiDetails?.moq ?? null;
  merged.lead_time = nullableString(structured.lead_time) ?? nullableString(messy.lead_time) ?? aiDetails?.lead_time ?? null;
  merged.packaging = nullableString(structured.packaging) ?? nullableString(messy.packaging) ?? aiDetails?.packaging ?? null;

  return merged;
}

function parseValidationDetails(text: string): ParsedTradeDetails {
  const normalizedText = normalizeTradeText(text);
  const structured = parseStructuredFields(normalizedText);
  const messy = parseMessyPatterns(normalizedText);
  const dbDetails = buildFinalDetails(structured, messy, null, normalizedText);

  return {
    ...dbDetails,
    moq: structured.moq ?? messy.moq ?? null,
    lead_time: structured.lead_time ?? messy.lead_time ?? null,
    packaging: structured.packaging ?? messy.packaging ?? null,
  };
}

export function validateExtractionExamples(): ValidationResult[] {
  const examples: Array<{
    name: string;
    text: string;
    category: EmailCategory | string;
    assert: (details: ParsedTradeDetails) => boolean;
  }> = [
    {
      name: "structured_supplier_quote",
      category: "supplier_quote",
      text: `Product: Stainless steel bottles 750ml
Quantity: 5,000 pcs
Unit price: USD 4.80 per piece
Incoterm: FOB Ningbo
MOQ: 5,000 pcs
Lead time: 28 days
Payment terms: T/T 30% advance, balance against BL copy`,
      assert: (details) =>
        details.product === "Stainless steel bottles 750ml"
        && details.quantity === "5,000 pcs"
        && details.price === "USD 4.80 per piece"
        && details.incoterm === "FOB Ningbo"
        && details.origin_country === "China"
        && details.moq === "5,000 pcs"
        && details.lead_time === "28 days"
        && details.payment_terms === "T/T 30% advance, balance against BL copy",
    },
    {
      name: "messy_buyer_inquiry",
      category: "buyer_inquiry",
      text: "Need 12,000 LED panel lights CIF Singapore, target price USD 6.50 per unit, delivery before 15 July 2026, payment LC 30 days.",
      assert: (details) =>
        Boolean(details.product?.toLowerCase().includes("led panel lights"))
        && details.quantity === "12,000"
        && details.price === "USD 6.50 per unit"
        && details.incoterm === "CIF Singapore"
        && details.destination_country === "Singapore"
        && details.delivery_date === "before 15 July 2026"
        && details.payment_terms === "LC 30 days",
    },
    {
      name: "messy_supplier_offer",
      category: "supplier_quote",
      text: "We can offer bottles at USD 4.8/pc FOB Ningbo for 5k pcs, 28 days lead time, 30/70 TT.",
      assert: (details) =>
        Boolean(details.product?.toLowerCase().includes("bottles"))
        && details.quantity === "5k pcs"
        && details.price === "USD 4.8/pc"
        && details.incoterm === "FOB Ningbo"
        && details.origin_country === "China"
        && details.lead_time === "28 days"
        && details.payment_terms === "30/70 TT",
    },
  ];

  return examples.map((example) => {
    const details = parseValidationDetails(example.text);

    return {
      name: example.name,
      passed: example.assert(details),
      details,
    };
  });
}

export function validateStructuredTradeExtractionExample() {
  return validateExtractionExamples();
}

export async function extractTradeDetails({
  subject,
  body,
  sender,
  category,
}: ExtractTradeDetailsInput): Promise<ExtractedTradeDetails> {
  const sourceText = normalizeTradeText([subject, body, sender].filter(Boolean).join("\n"));
  const structured = parseStructuredFields(sourceText);
  const messy = parseMessyPatterns(sourceText);
  structured.supplier_name = inferSupplierName(sender);
  const preAiDetails = buildFinalDetails(structured, messy, null, sourceText);
  const currentDetails = { ...preAiDetails };
  const fallbackFields: Array<TradeField | "supplier_name" | "currency" | "moq" | "lead_time" | "packaging"> = [
    ...tradeFields,
    "supplier_name",
    "currency",
    "moq",
    "lead_time",
    "packaging",
  ];
  const missingFields = fallbackFields.filter((field) => !currentDetails[field]);
  const aiDetails = missingFields.length > 0
    ? await extractGroqFallback({
      subject,
      body,
      sender,
      category,
      currentDetails,
      missingFields,
    })
    : null;

  return buildFinalDetails(structured, messy, aiDetails, sourceText);
}
