let _db = null;

export async function initDB(sapData = null) {
  if (_db) return _db;

  const SQL = await window.initSqlJs({
    locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${file}`
  });

  const db = new SQL.Database();

  // Create tables with SAP-aligned schema
  db.run(`
    CREATE TABLE business_partners (
      businessPartner TEXT PRIMARY KEY,
      customer TEXT,
      businessPartnerFullName TEXT,
      organizationBpName1 TEXT,
      creationDate TEXT,
      businessPartnerIsBlocked INTEGER
    );
    CREATE TABLE sales_order_headers (
      salesOrder TEXT PRIMARY KEY,
      salesOrderType TEXT,
      soldToParty TEXT,
      creationDate TEXT,
      totalNetAmount REAL,
      overallDeliveryStatus TEXT,
      transactionCurrency TEXT,
      salesOrganization TEXT
    );
    CREATE TABLE sales_order_items (
      salesOrder TEXT,
      salesOrderItem TEXT,
      material TEXT,
      requestedQuantity REAL,
      netAmount REAL,
      plant TEXT,
      PRIMARY KEY (salesOrder, salesOrderItem)
    );
    CREATE TABLE outbound_delivery_headers (
      outboundDelivery TEXT PRIMARY KEY,
      soldToParty TEXT,
      shipToParty TEXT,
      actualGoodsMovementDate TEXT,
      overallPickingStatus TEXT,
      creationDate TEXT
    );
    CREATE TABLE outbound_delivery_items (
      outboundDelivery TEXT,
      outboundDeliveryItem TEXT,
      material TEXT,
      deliveryQuantity REAL,
      PRIMARY KEY (outboundDelivery, outboundDeliveryItem)
    );
    CREATE TABLE billing_document_headers (
      billingDocument TEXT PRIMARY KEY,
      billingDocumentType TEXT,
      billingDocumentDate TEXT,
      totalNetAmount REAL,
      transactionCurrency TEXT,
      companyCode TEXT,
      fiscalYear TEXT,
      accountingDocument TEXT,
      soldToParty TEXT,
      billingDocumentIsCancelled INTEGER
    );
    CREATE TABLE billing_document_items (
      billingDocument TEXT,
      billingDocumentItem TEXT,
      material TEXT,
      billedQuantity REAL,
      netAmount REAL,
      PRIMARY KEY (billingDocument, billingDocumentItem)
    );
    CREATE TABLE products (
      material TEXT PRIMARY KEY,
      materialDescription TEXT,
      productType TEXT,
      baseUnitOfMeasure TEXT,
      materialCategory TEXT
    );
    CREATE TABLE plants (
      plant TEXT PRIMARY KEY,
      plantName TEXT,
      locationCountry TEXT,
      cityName TEXT
    );
    CREATE TABLE journal_entries (
      accountingDocument TEXT,
      companyCode TEXT,
      fiscalYear TEXT,
      glaccount TEXT,
      amountInTransactionCurrency REAL,
      debitCreditCode TEXT,
      postingDate TEXT,
      PRIMARY KEY (accountingDocument, glaccount)
    );
    CREATE TABLE payments (
      accountingDocument TEXT,
      companyCode TEXT,
      fiscalYear TEXT,
      customerPaymentAmount REAL,
      paymentDate TEXT,
      paymentMethod TEXT,
      PRIMARY KEY (accountingDocument)
    );
  `);

  // If data is provided, insert it
  if (sapData) {
    insertSAPData(db, sapData);
  }

  _db = db;
  return db;
}

/**
 * Insert real SAP data into the database
 */
function insertSAPData(db, sapData) {
  const insertAll = (table, rows, cols) => {
    if (!rows || rows.length === 0) return;
    const placeholders = cols.map(() => '?').join(', ');
    const stmt = db.prepare(`INSERT INTO ${table} VALUES (${placeholders})`);
    rows.forEach(row => {
      try {
        stmt.run(cols.map(c => row[c] ?? null));
      } catch (e) {
        console.warn(`Error inserting into ${table}:`, e);
      }
    });
    stmt.free();
  };

  // Insert business partners
  if (sapData.businessPartners && sapData.businessPartners.length > 0) {
    insertAll('business_partners', sapData.businessPartners, [
      'businessPartner',
      'customer',
      'businessPartnerFullName',
      'organizationBpName1',
      'creationDate',
      'businessPartnerIsBlocked'
    ]);
  }

  // Insert sales order headers
  if (sapData.salesOrderHeaders && sapData.salesOrderHeaders.length > 0) {
    insertAll('sales_order_headers', sapData.salesOrderHeaders, [
      'salesOrder',
      'salesOrderType',
      'soldToParty',
      'creationDate',
      'totalNetAmount',
      'overallDeliveryStatus',
      'transactionCurrency',
      'salesOrganization'
    ]);
  }

  // Insert sales order items
  if (sapData.salesOrderItems && sapData.salesOrderItems.length > 0) {
    insertAll('sales_order_items', sapData.salesOrderItems, [
      'salesOrder',
      'salesOrderItem',
      'material',
      'requestedQuantity',
      'netAmount',
      'plant'
    ]);
  }

  // Insert outbound delivery headers
  if (sapData.outboundDeliveryHeaders && sapData.outboundDeliveryHeaders.length > 0) {
    insertAll('outbound_delivery_headers', sapData.outboundDeliveryHeaders, [
      'outboundDelivery',
      'soldToParty',
      'shipToParty',
      'actualGoodsMovementDate',
      'overallPickingStatus',
      'creationDate'
    ]);
  }

  // Insert outbound delivery items
  if (sapData.outboundDeliveryItems && sapData.outboundDeliveryItems.length > 0) {
    insertAll('outbound_delivery_items', sapData.outboundDeliveryItems, [
      'outboundDelivery',
      'outboundDeliveryItem',
      'material',
      'deliveryQuantity'
    ]);
  }

  // Insert billing document headers
  if (sapData.billingDocumentHeaders && sapData.billingDocumentHeaders.length > 0) {
    insertAll('billing_document_headers', sapData.billingDocumentHeaders, [
      'billingDocument',
      'billingDocumentType',
      'billingDocumentDate',
      'totalNetAmount',
      'transactionCurrency',
      'companyCode',
      'fiscalYear',
      'accountingDocument',
      'soldToParty',
      'billingDocumentIsCancelled'
    ]);
  }

  // Insert billing document items
  if (sapData.billingDocumentItems && sapData.billingDocumentItems.length > 0) {
    insertAll('billing_document_items', sapData.billingDocumentItems, [
      'billingDocument',
      'billingDocumentItem',
      'material',
      'billedQuantity',
      'netAmount'
    ]);
  }

  // Insert products
  if (sapData.products && sapData.products.length > 0) {
    insertAll('products', sapData.products, [
      'material',
      'materialDescription',
      'productType',
      'baseUnitOfMeasure',
      'materialCategory'
    ]);
  }

  // Insert plants
  if (sapData.plants && sapData.plants.length > 0) {
    insertAll('plants', sapData.plants, [
      'plant',
      'plantName',
      'locationCountry',
      'cityName'
    ]);
  }

  // Insert journal entries
  if (sapData.journalEntries && sapData.journalEntries.length > 0) {
    insertAll('journal_entries', sapData.journalEntries, [
      'accountingDocument',
      'companyCode',
      'fiscalYear',
      'glaccount',
      'amountInTransactionCurrency',
      'debitCreditCode',
      'postingDate'
    ]);
  }

  // Insert payments
  if (sapData.payments && sapData.payments.length > 0) {
    insertAll('payments', sapData.payments, [
      'accountingDocument',
      'companyCode',
      'fiscalYear',
      'customerPaymentAmount',
      'paymentDate',
      'paymentMethod'
    ]);
  }
}

export function runSQL(sql) {
  if (!_db) throw new Error("Database not initialized");
  try {
    const results = _db.exec(sql);
    if (!results.length) return { columns: [], rows: [] };
    return {
      columns: results[0].columns,
      rows: results[0].values
    };
  } catch (e) {
    throw new Error(`SQL Error: ${e.message}`);
  }
}

export const DB_SCHEMA = `
Database Schema (SQLite) - SAP Order-to-Cash Data:

TABLE business_partners: businessPartner (PK), customer, businessPartnerFullName, organizationBpName1, creationDate, businessPartnerIsBlocked
TABLE sales_order_headers: salesOrder (PK), salesOrderType, soldToParty, creationDate, totalNetAmount, overallDeliveryStatus (C=Complete, D=Delivery Complete, I=In Transit, etc), transactionCurrency, salesOrganization
TABLE sales_order_items: salesOrder, salesOrderItem (PK with salesOrder), material, requestedQuantity, netAmount, plant
TABLE outbound_delivery_headers: outboundDelivery (PK), soldToParty, shipToParty, actualGoodsMovementDate, overallPickingStatus (C=Complete, I=In Process, etc), creationDate
TABLE outbound_delivery_items: outboundDelivery, outboundDeliveryItem (PK with outboundDelivery), material, deliveryQuantity
TABLE billing_document_headers: billingDocument (PK), billingDocumentType (F2=Invoice, etc), billingDocumentDate, totalNetAmount, transactionCurrency, companyCode, fiscalYear, accountingDocument, soldToParty, billingDocumentIsCancelled (boolean)
TABLE billing_document_items: billingDocument, billingDocumentItem (PK with billingDocument), material, billedQuantity, netAmount
TABLE products: material (PK), materialDescription, productType, baseUnitOfMeasure, materialCategory
TABLE plants: plant (PK), plantName, locationCountry, cityName
TABLE journal_entries: accountingDocument (PK with glaccount), companyCode, fiscalYear, glaccount, amountInTransactionCurrency, debitCreditCode (C=Credit, D=Debit), postingDate
TABLE payments: accountingDocument (PK), companyCode, fiscalYear, customerPaymentAmount, paymentDate, paymentMethod

KEY RELATIONSHIPS:
- business_partners.businessPartner → sales_order_headers.soldToParty (customer places order)
- business_partners.businessPartner → outbound_delivery_headers.soldToParty (customer receives delivery)
- business_partners.businessPartner → billing_document_headers.soldToParty (customer gets billed)
- sales_order_headers.salesOrder → sales_order_items.salesOrder (order contains items)
- sales_order_items.material → products.material (item references product)
- sales_order_items.plant → plants.plant (item fulfilled from plant)
- outbound_delivery_headers.outboundDelivery → outbound_delivery_items.outboundDelivery (delivery contains items)
- outbound_delivery_items.material → products.material (delivery item is a product)
- billing_document_headers.billingDocument → billing_document_items.billingDocument (invoice contains items)
- billing_document_items.material → products.material (CRITICAL JOIN: link products to billing documents)
- billing_document_headers.accountingDocument → journal_entries.accountingDocument (invoice recorded in accounting)
- billing_document_headers.accountingDocument → payments.accountingDocument (payment against invoice)

O2C BUSINESS FLOW:
Business Partner (Customer) →
  Sales Order Header (with soldToParty) →
    Sales Order Items (with material, plant, quantity) →
      Outbound Delivery Headers (shipment) →
        Outbound Delivery Items (line items) →
          Billing Document Headers (invoice) →
            Billing Document Items (with material → products join) →
              Journal Entries (accounting records)
              Payments (payment records)

ASSIGNMENT QUERY HINTS:
- Query A: Count billing documents grouped by material (via billing_document_items.material → products.material)
- Query B: Trace multi-table flow starting from a salesOrder (join through soldToParty for related deliveries/billings)
- Query C: Find broken flows using LEFT JOIN with NULL checks (missing delivery or billing)
`;
