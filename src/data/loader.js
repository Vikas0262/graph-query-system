/**
 * Loads SAP O2C JSONL data files from public/sap-o2c-data/ directory
 * Each directory contains one or more part-*.jsonl files with newline-delimited JSON
 */

const DATA_DIR = "/sap-o2c-data";

// Map of folder names to their output property names
const FOLDER_MAPPING = {
  "sales_order_headers": "salesOrderHeaders",
  "sales_order_items": "salesOrderItems",
  "outbound_delivery_headers": "outboundDeliveryHeaders",
  "outbound_delivery_items": "outboundDeliveryItems",
  "billing_document_headers": "billingDocumentHeaders",
  "billing_document_items": "billingDocumentItems",
  "business_partners": "businessPartners",
  "business_partner_addresses": "businessPartnerAddresses",
  "products": "products",
  "product_descriptions": "productDescriptions",
  "plants": "plants",
  "product_plants": "productPlants",
  "product_storage_locations": "productStorageLocations",
  "journal_entry_items_accounts_receivable": "journalEntries",
  "payments_accounts_receivable": "payments",
  "customer_company_assignments": "customerCompanyAssignments",
  "customer_sales_area_assignments": "customerSalesAreaAssignments",
};

/**
 * Parse JSONL content - one JSON object per line
 */
function parseJSONL(content) {
  const lines = content
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const records = [];
  for (const line of lines) {
    try {
      records.push(JSON.parse(line));
    } catch (e) {
      console.warn("Failed to parse JSONL line:", line.substring(0, 100), e);
    }
  }
  return records;
}

/**
 * Fetch a single JSONL file
 */
async function fetchJSONLFile(path) {
  try {
    const response = await fetch(path);
    if (!response.ok) {
      console.warn(`Failed to fetch ${path}: ${response.status}`);
      return [];
    }
    const content = await response.text();
    return parseJSONL(content);
  } catch (error) {
    console.warn(`Error fetching ${path}:`, error);
    return [];
  }
}

/**
 * Fetch manifest of all JSONL files
 */
async function fetchManifest() {
  try {
    const response = await fetch(`${DATA_DIR}/manifest.json`);
    if (!response.ok) {
      console.error("Failed to fetch manifest.json");
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error("Error loading manifest:", error);
    return null;
  }
}

/**
 * Fetch all files for a folder using manifest.json
 */
async function fetchAllFilesFromDirectory(folderName) {
  // First, try to fetch the manifest
  const manifest = await fetchManifest();
  
  if (manifest && manifest[folderName]) {
    const filenames = manifest[folderName];
    const records = [];
    const baseUrl = `${DATA_DIR}/${folderName}`;
    
    for (const filename of filenames) {
      const path = `${baseUrl}/${filename}`;
      const result = await fetchJSONLFile(path);
      records.push(...result);
    }
    
    return records;
  }
  
  // Fallback: try directory patterns if manifest fails
  console.warn(`Manifest entry not found for ${folderName}, trying fallback...`);
  const records = [];
  const baseUrl = `${DATA_DIR}/${folderName}`;

  for (let i = 0; i < 50; i++) {
    const path = `${baseUrl}/part-${String(i).padStart(5, "0")}.jsonl`;
    const result = await fetchJSONLFile(path);
    if (result.length > 0) {
      records.push(...result);
    }
  }

  return records;
}

/**
 * Main data loader function
 * Returns an object with all tables as arrays
 */
export async function loadAllData() {
  const data = {
    salesOrderHeaders: [],
    salesOrderItems: [],
    outboundDeliveryHeaders: [],
    outboundDeliveryItems: [],
    billingDocumentHeaders: [],
    billingDocumentItems: [],
    businessPartners: [],
    businessPartnerAddresses: [],
    products: [],
    productDescriptions: [],
    plants: [],
    productPlants: [],
    productStorageLocations: [],
    journalEntries: [],
    payments: [],
    customerCompanyAssignments: [],
    customerSalesAreaAssignments: [],
  };

  // Load critical tables for the O2C flow
  console.log("Loading SAP O2C data...");

  try {
    // Load business partners
    data.businessPartners = await fetchAllFilesFromDirectory("business_partners");
    console.log(`Loaded ${data.businessPartners.length} business partners`);

    // Load sales order headers
    data.salesOrderHeaders = await fetchAllFilesFromDirectory("sales_order_headers");
    console.log(`Loaded ${data.salesOrderHeaders.length} sales order headers`);

    // Load sales order items
    data.salesOrderItems = await fetchAllFilesFromDirectory("sales_order_items");
    console.log(`Loaded ${data.salesOrderItems.length} sales order items`);

    // Load outbound deliveries
    data.outboundDeliveryHeaders = await fetchAllFilesFromDirectory(
      "outbound_delivery_headers"
    );
    console.log(`Loaded ${data.outboundDeliveryHeaders.length} outbound delivery headers`);

    data.outboundDeliveryItems = await fetchAllFilesFromDirectory(
      "outbound_delivery_items"
    );
    console.log(`Loaded ${data.outboundDeliveryItems.length} outbound delivery items`);

    // Load billing documents
    data.billingDocumentHeaders = await fetchAllFilesFromDirectory(
      "billing_document_headers"
    );
    console.log(`Loaded ${data.billingDocumentHeaders.length} billing document headers`);

    // Load products
    data.products = await fetchAllFilesFromDirectory("products");
    console.log(`Loaded ${data.products.length} products`);

    // Load plants
    data.plants = await fetchAllFilesFromDirectory("plants");
    console.log(`Loaded ${data.plants.length} plants`);

    // Load journal entries
    data.journalEntries = await fetchAllFilesFromDirectory(
      "journal_entry_items_accounts_receivable"
    );
    console.log(`Loaded ${data.journalEntries.length} journal entries`);

    // Load payments
    data.payments = await fetchAllFilesFromDirectory("payments_accounts_receivable");
    console.log(`Loaded ${data.payments.length} payments`);

    // Load other tables
    data.businessPartnerAddresses = await fetchAllFilesFromDirectory(
      "business_partner_addresses"
    );
    data.productDescriptions = await fetchAllFilesFromDirectory("product_descriptions");
    data.productPlants = await fetchAllFilesFromDirectory("product_plants");
    data.productStorageLocations = await fetchAllFilesFromDirectory(
      "product_storage_locations"
    );
    data.customerCompanyAssignments = await fetchAllFilesFromDirectory(
      "customer_company_assignments"
    );
    data.customerSalesAreaAssignments = await fetchAllFilesFromDirectory(
      "customer_sales_area_assignments"
    );

    console.log("Data loading complete!");
    return data;
  } catch (error) {
    console.error("Error loading SAP O2C data:", error);
    throw error;
  }
}

/**
 * Helper function to get unique business partners (customers)
 */
export function getUniqueCustomers(businessPartners) {
  const seen = new Set();
  return businessPartners.filter(bp => {
    if (seen.has(bp.businessPartner)) return false;
    seen.add(bp.businessPartner);
    return true;
  });
}

/**
 * Helper function to create a unique ID from an object
 * Useful for tables that might not have a primary key
 */
export function createId(obj, fields) {
  return fields.map(f => obj[f]).filter(v => v).join("-");
}
