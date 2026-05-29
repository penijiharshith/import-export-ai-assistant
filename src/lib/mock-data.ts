export type TradeEmail = {
  id: string;
  sender: string;
  company: string;
  subject: string;
  receivedAt: string;
  type: string;
  priority: "High" | "Medium" | "Low";
  status: string;
  body: string;
  extracted: {
    product: string;
    quantity: string;
    incoterm: string;
    destination: string;
    targetPrice: string;
    paymentTerms: string;
  };
  missing: string[];
  risks: string[];
};

export type AiDraft = {
  id: string;
  emailId: string;
  type: string;
  to: string;
  subject: string;
  body: string;
  status: string;
  createdAt: string;
  checks: string[];
};

export const tradeEmails: TradeEmail[] = [
  {
    id: "email-1024",
    sender: "Aarav Mehta",
    company: "Blue Harbor Imports",
    subject: "Request for CIF Dubai quotation - cotton tote bags",
    receivedAt: "Today, 09:42",
    type: "Buyer inquiry",
    priority: "High",
    status: "Draft ready",
    body: "We need 10,000 cotton tote bags shipped to Jebel Ali, Dubai. Please quote CIF with your best delivery time. We prefer natural cotton and simple one-color printing.",
    extracted: {
      product: "Cotton tote bags",
      quantity: "10,000 pcs",
      incoterm: "CIF",
      destination: "Jebel Ali, Dubai",
      targetPrice: "Not provided",
      paymentTerms: "Not provided",
    },
    missing: ["Bag size", "GSM/material weight", "Print artwork", "Required delivery date"],
    risks: ["Price cannot be finalized until freight and print details are confirmed"],
  },
  {
    id: "email-1023",
    sender: "Lina Zhang",
    company: "Ningbo Packwell Co.",
    subject: "Revised FOB quote for bamboo lunch boxes",
    receivedAt: "Yesterday, 16:10",
    type: "Supplier quote",
    priority: "Medium",
    status: "Needs review",
    body: "Our revised price is USD 2.42 per set for 5,000 sets, FOB Ningbo. Lead time is 22 days after deposit. Payment term is 30% advance and 70% before shipment.",
    extracted: {
      product: "Bamboo lunch boxes",
      quantity: "5,000 sets",
      incoterm: "FOB",
      destination: "Not provided",
      targetPrice: "USD 2.42/set",
      paymentTerms: "30% advance, 70% before shipment",
    },
    missing: ["Carton dimensions", "Gross weight", "Certificates", "Quote validity"],
    risks: ["Certificate status is unclear for destination compliance"],
  },
  {
    id: "email-1022",
    sender: "Samira Khan",
    company: "Northline Freight",
    subject: "Container schedule update",
    receivedAt: "May 27, 12:25",
    type: "Shipment",
    priority: "Low",
    status: "Waiting reply",
    body: "The vessel cutoff has moved by one day. We can still load this week if the shipping instruction is shared before 4 PM tomorrow.",
    extracted: {
      product: "Shipment update",
      quantity: "1 container",
      incoterm: "Not applicable",
      destination: "Not provided",
      targetPrice: "Not applicable",
      paymentTerms: "Not applicable",
    },
    missing: ["Shipping instruction confirmation"],
    risks: ["Late shipping instruction may miss the vessel cutoff"],
  },
];

export const selectedEmail = tradeEmails[0];

export const aiDrafts: AiDraft[] = [
  {
    id: "draft-7001",
    emailId: "email-1024",
    type: "Reply",
    to: "Aarav Mehta",
    subject: "Re: Request for CIF Dubai quotation - cotton tote bags",
    body: `Dear Aarav,

Thank you for your inquiry for 10,000 cotton tote bags on CIF Jebel Ali, Dubai basis.

To prepare an accurate quotation, please confirm the bag size, cotton GSM, print artwork, packing requirement, and required delivery timeline.

Once we receive these details, we will share our best CIF quotation with lead time and payment terms.

Best regards,
Export Desk`,
    status: "Needs review",
    createdAt: "Today, 09:48",
    checks: ["Price not committed", "Missing details requested", "Payment terms not changed", "Shipment promise avoided"],
  },
  {
    id: "draft-7002",
    emailId: "email-1023",
    type: "Negotiation",
    to: "Lina Zhang",
    subject: "Request for complete FOB quote details - bamboo lunch boxes",
    body: `Dear Lina,

Thank you for the revised FOB Ningbo quotation.

Before we confirm the next step, please share carton dimensions, gross weight, quote validity, and available compliance certificates for this product.

Best regards,
Export Desk`,
    status: "Needs review",
    createdAt: "Yesterday, 16:22",
    checks: ["Asks for missing certificate details", "No final supplier approval", "No payment commitment"],
  },
  {
    id: "draft-7003",
    emailId: "email-1022",
    type: "Follow-up",
    to: "Samira Khan",
    subject: "Shipping instruction confirmation",
    body: `Dear Samira,

Thank you for the schedule update. We are reviewing the shipping instruction and will share confirmation before the cutoff.

Best regards,
Export Desk`,
    status: "Approved",
    createdAt: "May 27, 12:40",
    checks: ["Acknowledges schedule update", "Avoids shipment guarantee", "Keeps timing clear"],
  },
];

export const draftReply = {
  subject: "Re: Request for CIF Dubai quotation - cotton tote bags",
  body: aiDrafts[0].body,
};

export const stats = [
  { label: "New trade emails", value: "18", tone: "teal" },
  { label: "Drafts ready", value: "7", tone: "blue" },
  { label: "Missing info", value: "5", tone: "amber" },
  { label: "High risk", value: "2", tone: "rose" },
];
