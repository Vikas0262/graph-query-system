/**
 * Graph builder for SAP O2C data visualization
 * Transforms relational data into graph nodes and edges for visualization
 */

let _cachedData = null;

export function setSAPData(sapData) {
  _cachedData = sapData;
}

export function buildGraphElements(focusId = null, expandedNodes = new Set()) {
  if (!_cachedData) {
    console.warn("SAP data not loaded yet");
    return { nodes: [], edges: [] };
  }

  const nodes = [];
  const edges = [];
  
  const {
    businessPartners = [],
    salesOrderHeaders = [],
    salesOrderItems = [],
    outboundDeliveryHeaders = [],
    outboundDeliveryItems = [],
    billingDocumentHeaders = [],
    products = [],
    plants = [],
    journalEntries = [],
  } = _cachedData;

  const addNode = (id, type, label, data) => {
    nodes.push({
      data: { id, type, label, ...data },
      classes: type
    });
  };

  const addEdge = (source, target, label) => {
    edges.push({
      data: { id: `${source}-${target}-${label}`, source, target, label }
    });
  };

  // Debug log: data availability
  console.log("📊 buildGraphElements - Data available:", {
    businessPartners: businessPartners.length,
    salesOrderHeaders: salesOrderHeaders.length,
    outboundDeliveryHeaders: outboundDeliveryHeaders.length,
    billingDocumentHeaders: billingDocumentHeaders.length,
    focusId: focusId
  });

  if (!focusId) {
    const bps = (_cachedData?.businessPartners || []).slice(0, 15);
    const sos = (_cachedData?.salesOrderHeaders || []).slice(0, 25);
    const dels = (_cachedData?.outboundDeliveryHeaders || []).slice(0, 20);
    const bills = (_cachedData?.billingDocumentHeaders || []).slice(0, 20);

    bps.forEach(bp => {
      nodes.push({ data: { id: bp.businessPartner, type: 'BusinessPartner', 
        label: bp.organizationBpName1 || bp.businessPartner, ...bp }, 
        classes: 'BusinessPartner' });
    });

    sos.forEach(so => {
      nodes.push({ data: { id: so.salesOrder, type: 'SalesOrder', 
        label: so.salesOrder, ...so }, classes: 'SalesOrder' });
      if (so.soldToParty) {
        edges.push({ data: { id: `${so.soldToParty}-${so.salesOrder}`, 
          source: so.soldToParty, target: so.salesOrder, label: 'PLACED_ORDER' }});
      }
    });

    dels.forEach(d => {
      nodes.push({ data: { id: d.outboundDelivery, type: 'OutboundDelivery', 
        label: d.outboundDelivery, ...d }, classes: 'OutboundDelivery' });
    });

    bills.forEach(b => {
      nodes.push({ data: { id: b.billingDocument, type: 'BillingDocument', 
        label: b.billingDocument, ...b }, classes: 'BillingDocument' });
      if (b.soldToParty) {
        edges.push({ data: { id: `${b.soldToParty}-${b.billingDocument}-billed`, 
          source: b.soldToParty, target: b.billingDocument, label: 'BILLED_AS' }});
      }
    });

    // Validate edges: only include edges where both source and target nodes exist
    const nodeIds = new Set(nodes.map(n => n.data.id));
    const safeEdges = edges.filter(e => 
      nodeIds.has(e.data.source) && nodeIds.has(e.data.target)
    );

    console.log(`✅ Overview: ${nodes.length} nodes, ${safeEdges.length} edges (validated)`);
    return { nodes, edges: safeEdges };
  }

  // Focused expansion
  const visited = new Set();
  const queue = [focusId];

  const expandNode = (id) => {
    if (visited.has(id)) return;
    visited.add(id);

    // Business Partner (Customer)
    const bp = businessPartners.find(p => p.businessPartner === id);
    if (bp) {
      addNode(id, 'BusinessPartner', bp.organizationBpName1 || bp.businessPartnerFullName, bp);
      
      // Find all sales orders for this customer
      salesOrderHeaders.filter(so => so.soldToParty === id).forEach(so => {
        addNode(so.salesOrder, 'SalesOrder', so.salesOrder, so);
        addEdge(id, so.salesOrder, 'PLACED_ORDER');
        if (expandedNodes.has(so.salesOrder)) expandNode(so.salesOrder);
      });
      
      // Find all deliveries for this customer
      outboundDeliveryHeaders.filter(d => d.soldToParty === id).forEach(d => {
        addNode(d.outboundDelivery, 'OutboundDelivery', d.outboundDelivery, d);
        addEdge(id, d.outboundDelivery, 'DELIVERY_FOR');
      });
      
      // Find all billing docs for this customer
      billingDocumentHeaders.filter(b => b.soldToParty === id).forEach(b => {
        addNode(b.billingDocument, 'BillingDocument', b.billingDocument, b);
        addEdge(id, b.billingDocument, 'BILLED_TO');
      });
      
      return;
    }

    // Sales Order Header
    const so = salesOrderHeaders.find(s => s.salesOrder === id);
    if (so) {
      addNode(id, 'SalesOrder', id, so);
      
      // Sales Order Items
      salesOrderItems.filter(i => i.salesOrder === id).forEach(item => {
        const itemId = `${item.salesOrder}-${item.salesOrderItem}`;
        addNode(itemId, 'SalesOrderItem', `Item ${item.salesOrderItem}`, item);
        addEdge(id, itemId, 'CONTAINS_ITEM');
        
        // Product
        const prod = products.find(p => p.material === item.material);
        if (prod) {
          if (!visited.has(prod.material)) {
            addNode(prod.material, 'Product', prod.materialDescription || prod.material, prod);
            visited.add(prod.material);
          }
          addEdge(itemId, prod.material, 'REFERENCES_PRODUCT');
        }
        
        // Plant
        if (item.plant) {
          const plant = plants.find(p => p.plant === item.plant);
          if (plant && !visited.has(plant.plant)) {
            addNode(plant.plant, 'Plant', plant.plantName || plant.plant, plant);
            visited.add(plant.plant);
            addEdge(itemId, plant.plant, 'FROM_PLANT');
          }
        }
      });
      
      // Outbound Deliveries (related to this SO via sold-to party logic)
      const relatedDeliveries = outboundDeliveryHeaders.filter(d => d.soldToParty === so.soldToParty);
      relatedDeliveries.forEach(d => {
        addNode(d.outboundDelivery, 'OutboundDelivery', d.outboundDelivery, d);
        addEdge(id, d.outboundDelivery, 'FULFILLED_BY');
        
        // Delivery Items
        outboundDeliveryItems.filter(di => di.outboundDelivery === d.outboundDelivery).forEach(di => {
          const diId = `${di.outboundDelivery}-${di.outboundDeliveryItem}`;
          addNode(diId, 'DeliveryItem', `Item ${di.outboundDeliveryItem}`, di);
          addEdge(d.outboundDelivery, diId, 'CONTAINS_ITEM');
          
          // Product
          const prod = products.find(p => p.material === di.material);
          if (prod && !visited.has(prod.material)) {
            addNode(prod.material, 'Product', prod.materialDescription || prod.material, prod);
            visited.add(prod.material);
            addEdge(diId, prod.material, 'REFERENCES_PRODUCT');
          }
        });
      });
      
      // Billing Documents
      billingDocumentHeaders.filter(b => b.soldToParty === so.soldToParty).forEach(b => {
        addNode(b.billingDocument, 'BillingDocument', b.billingDocument, b);
        addEdge(id, b.billingDocument, 'BILLED_AS');
        
        // Journal Entries
        journalEntries.filter(je => je.accountingDocument === b.accountingDocument).forEach(je => {
          const jeId = `${je.accountingDocument}-${je.glaccount}`;
          addNode(jeId, 'JournalEntry', `Account ${je.glaccount}`, je);
          addEdge(b.billingDocument, jeId, 'RECORDED_IN');
        });
      });
      
      return;
    }

    // Product
    const prod = products.find(p => p.material === id);
    if (prod) {
      addNode(id, 'Product', prod.materialDescription || prod.material, prod);
      
      // Find in sales order items
      salesOrderItems.filter(i => i.material === id).forEach(item => {
        const itemId = `${item.salesOrder}-${item.salesOrderItem}`;
        addNode(itemId, 'SalesOrderItem', `Item ${item.salesOrderItem}`, item);
        addEdge(itemId, id, 'REFERENCES_PRODUCT');
        
        const so2 = salesOrderHeaders.find(s => s.salesOrder === item.salesOrder);
        if (so2) {
          addNode(so2.salesOrder, 'SalesOrder', so2.salesOrder, so2);
          addEdge(so2.salesOrder, itemId, 'CONTAINS_ITEM');
        }
      });
      
      return;
    }

    // Outbound Delivery
    const del = outboundDeliveryHeaders.find(d => d.outboundDelivery === id);
    if (del) {
      addNode(id, 'OutboundDelivery', id, del);
      
      // Delivery Items
      outboundDeliveryItems.filter(di => di.outboundDelivery === id).forEach(di => {
        const diId = `${di.outboundDelivery}-${di.outboundDeliveryItem}`;
        addNode(diId, 'DeliveryItem', `Item ${di.outboundDeliveryItem}`, di);
        addEdge(id, diId, 'CONTAINS_ITEM');
        
        const prod = products.find(p => p.material === di.material);
        if (prod) {
          addNode(prod.material, 'Product', prod.materialDescription || prod.material, prod);
          addEdge(diId, prod.material, 'REFERENCES_PRODUCT');
        }
      });
      
      // Billing Documents related to this delivery
      billingDocumentHeaders.forEach(b => {
        if (b.soldToParty === del.soldToParty) {
          addNode(b.billingDocument, 'BillingDocument', b.billingDocument, b);
          addEdge(id, b.billingDocument, 'BILLED_FROM');
        }
      });
      
      return;
    }

    // Billing Document
    const bill = billingDocumentHeaders.find(b => b.billingDocument === id);
    if (bill) {
      addNode(id, 'BillingDocument', id, bill);
      
      // Journal Entries
      journalEntries.filter(je => je.accountingDocument === bill.accountingDocument).forEach(je => {
        const jeId = `${je.accountingDocument}-${je.glaccount}`;
        addNode(jeId, 'JournalEntry', `Account ${je.glaccount}`, je);
        addEdge(id, jeId, 'RECORDED_IN');
      });
      
      return;
    }
  };

  expandNode(focusId);
  expandedNodes.forEach(n => { if (n !== focusId) expandNode(n); });

  return { nodes, edges };
}

export function getAllNodeIds() {
  if (!_cachedData) return [];
  
  const {
    businessPartners = [],
    salesOrderHeaders = [],
    products = [],
    outboundDeliveryHeaders = [],
    billingDocumentHeaders = [],
  } = _cachedData;
  
  const ids = [];
  
  businessPartners.forEach(bp => 
    ids.push({ id: bp.businessPartner, type: 'BusinessPartner', label: bp.organizationBpName1 || bp.businessPartnerFullName })
  );
  
  salesOrderHeaders.forEach(so => 
    ids.push({ id: so.salesOrder, type: 'SalesOrder', label: so.salesOrder })
  );
  
  products.forEach(p => 
    ids.push({ id: p.material, type: 'Product', label: p.materialDescription || p.material })
  );
  
  outboundDeliveryHeaders.forEach(d => 
    ids.push({ id: d.outboundDelivery, type: 'OutboundDelivery', label: d.outboundDelivery })
  );
  
  billingDocumentHeaders.forEach(b => 
    ids.push({ id: b.billingDocument, type: 'BillingDocument', label: b.billingDocument })
  );
  
  return ids;
}

// Node type definitions for graph visualization
export const nodeTypes = {
  BusinessPartner: { color: "#4f46e5", icon: "👤", label: "Customer" },
  SalesOrder: { color: "#0891b2", icon: "📋", label: "Sales Order" },
  SalesOrderItem: { color: "#0284c7", icon: "📦", label: "SO Item" },
  Product: { color: "#7c3aed", icon: "🔧", label: "Product" },
  OutboundDelivery: { color: "#059669", icon: "🚚", label: "Delivery" },
  DeliveryItem: { color: "#16a34a", icon: "📫", label: "Delivery Item" },
  BillingDocument: { color: "#d97706", icon: "🧾", label: "Invoice" },
  JournalEntry: { color: "#dc2626", icon: "📒", label: "Journal Entry" },
  Plant: { color: "#065f46", icon: "🏭", label: "Plant" },
};
