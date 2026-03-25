// Synthetic dataset mirroring the SAP-like business flow:
// Customer → Sales Order → Sales Order Item → Delivery → Billing → Journal Entry
// Also: Product/Material, Plant, Address

export const customers = [
  { id: "C001", name: "Acme Corp", segment: "Enterprise", region: "North", address_id: "A001", credit_limit: 500000 },
  { id: "C002", name: "Global Tech Ltd", segment: "SMB", region: "West", address_id: "A002", credit_limit: 100000 },
  { id: "C003", name: "Pinnacle Industries", segment: "Enterprise", region: "East", address_id: "A003", credit_limit: 750000 },
  { id: "C004", name: "Sunrise Retail", segment: "SMB", region: "South", address_id: "A004", credit_limit: 50000 },
  { id: "C005", name: "Nexus Solutions", segment: "Mid-Market", region: "North", address_id: "A005", credit_limit: 200000 },
  { id: "C006", name: "Orbit Manufacturing", segment: "Enterprise", region: "West", address_id: "A006", credit_limit: 900000 },
];

export const addresses = [
  { id: "A001", street: "123 Industrial Blvd", city: "Chicago", state: "IL", country: "USA", zip: "60601" },
  { id: "A002", street: "456 Tech Park", city: "San Francisco", state: "CA", country: "USA", zip: "94105" },
  { id: "A003", street: "789 Commerce Dr", city: "New York", state: "NY", country: "USA", zip: "10001" },
  { id: "A004", street: "321 Retail Row", city: "Dallas", state: "TX", country: "USA", zip: "75201" },
  { id: "A005", street: "654 Innovation Way", city: "Boston", state: "MA", country: "USA", zip: "02101" },
  { id: "A006", street: "987 Factory Ln", city: "Detroit", state: "MI", country: "USA", zip: "48201" },
];

export const products = [
  { id: "P001", name: "Industrial Pump XL", category: "Machinery", unit: "EA", base_price: 4500, weight: 85 },
  { id: "P002", name: "Control Panel Pro", category: "Electronics", unit: "EA", base_price: 1200, weight: 12 },
  { id: "P003", name: "Steel Pipe 10m", category: "Raw Material", unit: "M", base_price: 45, weight: 50 },
  { id: "P004", name: "Hydraulic Valve Set", category: "Components", unit: "SET", base_price: 890, weight: 8 },
  { id: "P005", name: "Safety Helmet Grade A", category: "Safety", unit: "EA", base_price: 75, weight: 0.8 },
  { id: "P006", name: "Conveyor Belt 5m", category: "Machinery", unit: "EA", base_price: 3200, weight: 120 },
  { id: "P007", name: "Digital Pressure Gauge", category: "Electronics", unit: "EA", base_price: 320, weight: 1.2 },
  { id: "P008", name: "Lubricant Oil 20L", category: "Consumables", unit: "L", base_price: 180, weight: 18 },
];

export const plants = [
  { id: "PL01", name: "Chicago Plant", city: "Chicago", state: "IL", capacity: 5000 },
  { id: "PL02", name: "LA Distribution Center", city: "Los Angeles", state: "CA", capacity: 8000 },
  { id: "PL03", name: "East Coast Hub", city: "Newark", state: "NJ", capacity: 6000 },
];

export const salesOrders = [
  { id: "SO1001", customer_id: "C001", date: "2024-01-10", status: "Completed", payment_terms: "Net30", total_amount: 18900 },
  { id: "SO1002", customer_id: "C002", date: "2024-01-15", status: "Completed", payment_terms: "Net60", total_amount: 5340 },
  { id: "SO1003", customer_id: "C003", date: "2024-01-20", status: "Partial", payment_terms: "Net30", total_amount: 32400 },
  { id: "SO1004", customer_id: "C001", date: "2024-02-01", status: "Completed", payment_terms: "Net30", total_amount: 9600 },
  { id: "SO1005", customer_id: "C004", date: "2024-02-10", status: "Open", payment_terms: "Net15", total_amount: 2250 },
  { id: "SO1006", customer_id: "C005", date: "2024-02-14", status: "Completed", payment_terms: "Net30", total_amount: 14560 },
  { id: "SO1007", customer_id: "C006", date: "2024-02-20", status: "Completed", payment_terms: "Net60", total_amount: 45000 },
  { id: "SO1008", customer_id: "C003", date: "2024-03-01", status: "Open", payment_terms: "Net30", total_amount: 8900 },
  { id: "SO1009", customer_id: "C002", date: "2024-03-05", status: "Completed", payment_terms: "Net60", total_amount: 6400 },
  { id: "SO1010", customer_id: "C006", date: "2024-03-10", status: "Completed", payment_terms: "Net60", total_amount: 28800 },
];

export const salesOrderItems = [
  { id: "SOI001", so_id: "SO1001", product_id: "P001", quantity: 2, unit_price: 4500, total: 9000 },
  { id: "SOI002", so_id: "SO1001", product_id: "P002", quantity: 3, unit_price: 1200, total: 3600 },
  { id: "SOI003", so_id: "SO1001", product_id: "P004", quantity: 7, unit_price: 890, total: 6230 }, // note: intentional rounding difference
  { id: "SOI004", so_id: "SO1002", product_id: "P005", quantity: 20, unit_price: 75, total: 1500 },
  { id: "SOI005", so_id: "SO1002", product_id: "P007", quantity: 12, unit_price: 320, total: 3840 },
  { id: "SOI006", so_id: "SO1003", product_id: "P001", quantity: 4, unit_price: 4500, total: 18000 },
  { id: "SOI007", so_id: "SO1003", product_id: "P006", quantity: 4, unit_price: 3200, total: 12800 }, // partial - only 2 delivered
  { id: "SOI008", so_id: "SO1004", product_id: "P002", quantity: 8, unit_price: 1200, total: 9600 },
  { id: "SOI009", so_id: "SO1005", product_id: "P005", quantity: 30, unit_price: 75, total: 2250 },
  { id: "SOI010", so_id: "SO1006", product_id: "P004", quantity: 10, unit_price: 890, total: 8900 },
  { id: "SOI011", so_id: "SO1006", product_id: "P007", quantity: 18, unit_price: 320, total: 5760 },
  { id: "SOI012", so_id: "SO1007", product_id: "P001", quantity: 10, unit_price: 4500, total: 45000 },
  { id: "SOI013", so_id: "SO1008", product_id: "P003", quantity: 100, unit_price: 45, total: 4500 },
  { id: "SOI014", so_id: "SO1008", product_id: "P008", quantity: 24, unit_price: 180, total: 4320 },
  { id: "SOI015", so_id: "SO1009", product_id: "P002", quantity: 4, unit_price: 1200, total: 4800 },
  { id: "SOI016", so_id: "SO1009", product_id: "P007", quantity: 5, unit_price: 320, total: 1600 },
  { id: "SOI017", so_id: "SO1010", product_id: "P006", quantity: 9, unit_price: 3200, total: 28800 },
];

export const deliveries = [
  { id: "DEL001", so_id: "SO1001", plant_id: "PL01", date: "2024-01-18", status: "Delivered", carrier: "FedEx", tracking: "FX123456" },
  { id: "DEL002", so_id: "SO1002", plant_id: "PL02", date: "2024-01-25", status: "Delivered", carrier: "UPS", tracking: "UP789012" },
  { id: "DEL003", so_id: "SO1003", plant_id: "PL03", date: "2024-02-01", status: "Partial", carrier: "DHL", tracking: "DH345678" },
  { id: "DEL004", so_id: "SO1004", plant_id: "PL01", date: "2024-02-10", status: "Delivered", carrier: "FedEx", tracking: "FX234567" },
  // SO1005 has NO delivery (Open order)
  { id: "DEL005", so_id: "SO1006", plant_id: "PL02", date: "2024-02-22", status: "Delivered", carrier: "UPS", tracking: "UP890123" },
  { id: "DEL006", so_id: "SO1007", plant_id: "PL01", date: "2024-03-01", status: "Delivered", carrier: "FedEx", tracking: "FX345678" },
  // SO1008 has NO delivery yet (Open order)
  { id: "DEL007", so_id: "SO1009", plant_id: "PL03", date: "2024-03-12", status: "Delivered", carrier: "DHL", tracking: "DH456789" },
  { id: "DEL008", so_id: "SO1010", plant_id: "PL01", date: "2024-03-18", status: "Delivered", carrier: "FedEx", tracking: "FX456789" },
];

export const deliveryItems = [
  { id: "DI001", delivery_id: "DEL001", soi_id: "SOI001", quantity: 2 },
  { id: "DI002", delivery_id: "DEL001", soi_id: "SOI002", quantity: 3 },
  { id: "DI003", delivery_id: "DEL001", soi_id: "SOI003", quantity: 7 },
  { id: "DI004", delivery_id: "DEL002", soi_id: "SOI004", quantity: 20 },
  { id: "DI005", delivery_id: "DEL002", soi_id: "SOI005", quantity: 12 },
  { id: "DI006", delivery_id: "DEL003", soi_id: "SOI006", quantity: 4 },
  { id: "DI007", delivery_id: "DEL003", soi_id: "SOI007", quantity: 2 }, // only 2 of 4 delivered
  { id: "DI008", delivery_id: "DEL004", soi_id: "SOI008", quantity: 8 },
  { id: "DI009", delivery_id: "DEL005", soi_id: "SOI010", quantity: 10 },
  { id: "DI010", delivery_id: "DEL005", soi_id: "SOI011", quantity: 18 },
  { id: "DI011", delivery_id: "DEL006", soi_id: "SOI012", quantity: 10 },
  { id: "DI012", delivery_id: "DEL007", soi_id: "SOI015", quantity: 4 },
  { id: "DI013", delivery_id: "DEL007", soi_id: "SOI016", quantity: 5 },
  { id: "DI014", delivery_id: "DEL008", soi_id: "SOI017", quantity: 9 },
];

export const billingDocuments = [
  { id: "BILL001", so_id: "SO1001", delivery_id: "DEL001", date: "2024-01-22", amount: 18900, status: "Paid", type: "Invoice" },
  { id: "BILL002", so_id: "SO1002", delivery_id: "DEL002", date: "2024-01-28", amount: 5340, status: "Paid", type: "Invoice" },
  { id: "BILL003", so_id: "SO1003", delivery_id: "DEL003", date: "2024-02-05", amount: 18000, status: "Outstanding", type: "Invoice" }, // partial bill, only for delivered items
  { id: "BILL004", so_id: "SO1004", delivery_id: "DEL004", date: "2024-02-15", amount: 9600, status: "Paid", type: "Invoice" },
  // SO1005 - no billing (no delivery)
  { id: "BILL005", so_id: "SO1006", delivery_id: "DEL005", date: "2024-02-28", amount: 14560, status: "Paid", type: "Invoice" },
  { id: "BILL006", so_id: "SO1007", delivery_id: "DEL006", date: "2024-03-05", amount: 45000, status: "Outstanding", type: "Invoice" },
  // SO1008 - no billing (no delivery)
  { id: "BILL007", so_id: "SO1009", delivery_id: "DEL007", date: "2024-03-15", amount: 6400, status: "Paid", type: "Invoice" },
  { id: "BILL008", so_id: "SO1010", delivery_id: "DEL008", date: "2024-03-22", amount: 28800, status: "Outstanding", type: "Invoice" },
  // Billing without delivery (anomaly for SO1003 remaining items) - demonstrates broken flow
  { id: "BILL009", so_id: "SO1001", delivery_id: null, date: "2024-01-22", amount: 0, status: "Credit Memo", type: "Credit Memo" },
];

export const journalEntries = [
  { id: "JE001", billing_id: "BILL001", date: "2024-01-22", debit_account: "AR", credit_account: "Revenue", amount: 18900, description: "Revenue recognition SO1001" },
  { id: "JE002", billing_id: "BILL001", date: "2024-01-30", debit_account: "Cash", credit_account: "AR", amount: 18900, description: "Payment received SO1001" },
  { id: "JE003", billing_id: "BILL002", date: "2024-01-28", debit_account: "AR", credit_account: "Revenue", amount: 5340, description: "Revenue recognition SO1002" },
  { id: "JE004", billing_id: "BILL002", date: "2024-02-27", debit_account: "Cash", credit_account: "AR", amount: 5340, description: "Payment received SO1002" },
  { id: "JE005", billing_id: "BILL003", date: "2024-02-05", debit_account: "AR", credit_account: "Revenue", amount: 18000, description: "Revenue recognition SO1003 partial" },
  { id: "JE006", billing_id: "BILL004", date: "2024-02-15", debit_account: "AR", credit_account: "Revenue", amount: 9600, description: "Revenue recognition SO1004" },
  { id: "JE007", billing_id: "BILL004", date: "2024-03-15", debit_account: "Cash", credit_account: "AR", amount: 9600, description: "Payment received SO1004" },
  { id: "JE008", billing_id: "BILL005", date: "2024-02-28", debit_account: "AR", credit_account: "Revenue", amount: 14560, description: "Revenue recognition SO1006" },
  { id: "JE009", billing_id: "BILL005", date: "2024-03-29", debit_account: "Cash", credit_account: "AR", amount: 14560, description: "Payment received SO1006" },
  { id: "JE010", billing_id: "BILL006", date: "2024-03-05", debit_account: "AR", credit_account: "Revenue", amount: 45000, description: "Revenue recognition SO1007" },
  { id: "JE011", billing_id: "BILL007", date: "2024-03-15", debit_account: "AR", credit_account: "Revenue", amount: 6400, description: "Revenue recognition SO1009" },
  { id: "JE012", billing_id: "BILL007", date: "2024-04-14", debit_account: "Cash", credit_account: "AR", amount: 6400, description: "Payment received SO1009" },
  { id: "JE013", billing_id: "BILL008", date: "2024-03-22", debit_account: "AR", credit_account: "Revenue", amount: 28800, description: "Revenue recognition SO1010" },
];

// Graph schema definition for the UI
export const nodeTypes = {
  Customer: { color: "#4f46e5", icon: "👤", label: "Customer" },
  SalesOrder: { color: "#0891b2", icon: "📋", label: "Sales Order" },
  SalesOrderItem: { color: "#0284c7", icon: "📦", label: "SO Item" },
  Product: { color: "#7c3aed", icon: "🔧", label: "Product" },
  Delivery: { color: "#059669", icon: "🚚", label: "Delivery" },
  BillingDocument: { color: "#d97706", icon: "🧾", label: "Billing" },
  JournalEntry: { color: "#dc2626", icon: "📒", label: "Journal Entry" },
  Plant: { color: "#065f46", icon: "🏭", label: "Plant" },
  Address: { color: "#6b7280", icon: "📍", label: "Address" },
};

export const relationships = [
  // Customer → SalesOrder
  ...salesOrders.map(so => ({ source: so.customer_id, target: so.id, label: "PLACED" })),
  // Customer → Address
  ...customers.map(c => ({ source: c.id, target: c.address_id, label: "LOCATED_AT" })),
  // SalesOrder → SalesOrderItem
  ...salesOrderItems.map(soi => ({ source: soi.so_id, target: soi.id, label: "CONTAINS" })),
  // SalesOrderItem → Product
  ...salesOrderItems.map(soi => ({ source: soi.id, target: soi.product_id, label: "REFERENCES" })),
  // SalesOrder → Delivery
  ...deliveries.map(d => ({ source: d.so_id, target: d.id, label: "FULFILLED_BY" })),
  // Delivery → Plant
  ...deliveries.map(d => ({ source: d.id, target: d.plant_id, label: "SHIPS_FROM" })),
  // Delivery → BillingDocument
  ...billingDocuments.filter(b => b.delivery_id).map(b => ({ source: b.delivery_id, target: b.id, label: "TRIGGERS" })),
  // SalesOrder → BillingDocument
  ...billingDocuments.map(b => ({ source: b.so_id, target: b.id, label: "BILLED_AS" })),
  // BillingDocument → JournalEntry
  ...journalEntries.map(je => ({ source: je.billing_id, target: je.id, label: "RECORDED_IN" })),
];
