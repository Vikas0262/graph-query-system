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
 * Fetch all files for a folder using manifest.json - OPTIMIZED FOR PARALLEL LOADING
 */
async function fetchAllFilesFromDirectory(folderName) {
  // First, try to fetch the manifest
  const manifest = await fetchManifest();
  
  if (manifest && manifest[folderName]) {
    const filenames = manifest[folderName];
    const baseUrl = `${DATA_DIR}/${folderName}`;
    
    // PARALLEL LOAD: Fetch all files concurrently instead of sequentially
    const fetchPromises = filenames.map(filename => 
      fetchJSONLFile(`${baseUrl}/${filename}`)
    );
    
    const results = await Promise.all(fetchPromises);
    const records = results.flat(); // Flatten all arrays into one
    
    return records;
  }
  
  // Fallback: try directory patterns if manifest fails
  console.warn(`⚠️ Manifest entry not found for ${folderName}, trying fallback...`);
  const records = [];
  const baseUrl = `${DATA_DIR}/${folderName}`;

  // Try to fetch up to 50 part files in parallel
  const attempts = Array.from({ length: 50 }, (_, i) => 
    fetchJSONLFile(`${baseUrl}/part-${String(i).padStart(5, "0")}.jsonl`)
  );
  
  const results = await Promise.all(attempts);
  return results.flat().filter(r => r.length > 0).flat();
}

/**
 * Main data loader function
 * Returns an object with all tables as arrays
 * Optimized: Loads all critical tables IN PARALLEL using Promise.all()
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
  console.log("⏳ Loading SAP O2C data in parallel...");
  const startTime = performance.now();

  try {
    // PARALLEL LOAD: Load all critical tables at once instead of sequentially
    const [bps, soHeaders, soItems, delHeaders, delItems, billHeaders, products, plants, journalEnt, payments] = await Promise.all([
      fetchAllFilesFromDirectory("business_partners"),
      fetchAllFilesFromDirectory("sales_order_headers"),
      fetchAllFilesFromDirectory("sales_order_items"),
      fetchAllFilesFromDirectory("outbound_delivery_headers"),
      fetchAllFilesFromDirectory("outbound_delivery_items"),
      fetchAllFilesFromDirectory("billing_document_headers"),
      fetchAllFilesFromDirectory("products"),
      fetchAllFilesFromDirectory("plants"),
      fetchAllFilesFromDirectory("journal_entry_items_accounts_receivable"),
      fetchAllFilesFromDirectory("payments_accounts_receivable"),
    ]);

    data.businessPartners = bps;
    data.salesOrderHeaders = soHeaders;
    data.salesOrderItems = soItems;
    data.outboundDeliveryHeaders = delHeaders;
    data.outboundDeliveryItems = delItems;
    data.billingDocumentHeaders = billHeaders;
    data.products = products;
    data.plants = plants;
    data.journalEntries = journalEnt;
    data.payments = payments;

    console.log(`✅ Loaded ${data.businessPartners.length} business partners`);
    console.log(`✅ Loaded ${data.salesOrderHeaders.length} sales order headers`);
    console.log(`✅ Loaded ${data.salesOrderItems.length} sales order items`);
    console.log(`✅ Loaded ${data.outboundDeliveryHeaders.length} outbound delivery headers`);
    console.log(`✅ Loaded ${data.outboundDeliveryItems.length} outbound delivery items`);
    console.log(`✅ Loaded ${data.billingDocumentHeaders.length} billing document headers`);
    console.log(`✅ Loaded ${data.products.length} products`);
    console.log(`✅ Loaded ${data.plants.length} plants`);
    console.log(`✅ Loaded ${data.journalEntries.length} journal entries`);
    console.log(`✅ Loaded ${data.payments.length} payments`);

    // Load other secondary tables in parallel
    const [bpAddresses, billItems] = await Promise.all([
      fetchAllFilesFromDirectory("business_partner_addresses"),
      fetchAllFilesFromDirectory("billing_document_items"),
    ]);

    data.businessPartnerAddresses = bpAddresses;
    data.billingDocumentItems = billItems;

    console.log(`✅ Loaded ${data.businessPartnerAddresses.length} business partner addresses`);
    console.log(`✅ Loaded ${data.billingDocumentItems.length} billing document items`);

    const loadTime = ((performance.now() - startTime) / 1000).toFixed(2);
    console.log(`🚀 All data loaded in ${loadTime}s | 📊 Total: ${
      data.businessPartners.length + 
      data.salesOrderHeaders.length + 
      data.billingDocumentHeaders.length +
      data.outboundDeliveryHeaders.length
    } key records`);

    return data;
  } catch (error) {
    console.error("❌ Error loading SAP O2C data:", error);
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
