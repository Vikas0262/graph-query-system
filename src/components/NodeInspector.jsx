import { useState } from "react";

const NODE_ICONS = {
  BusinessPartner: "👤", SalesOrder: "📋", SalesOrderItem: "📦",
  Product: "🔧", OutboundDelivery: "🚚", DeliveryItem: "📫",
  BillingDocument: "🧾", JournalEntry: "📒", Plant: "🏭",
  // Legacy names for backward compatibility
  Customer: "👤", Delivery: "🚚"
};

const STATUS_COLORS = {
  C: "#10b981", D: "#10b981", I: "#f59e0b", // Delivery statuses
  Paid: "#10b981", Outstanding: "#ef4444", "Credit Memo": "#6366f1"
};

function FieldRow({ label, value, highlight }) {
  if (value === null || value === undefined || value === "") return null;
  
  let displayValue = value;
  if (typeof value === "object") {
    displayValue = JSON.stringify(value);
  } else if (typeof value === "boolean") {
    displayValue = value ? "Yes" : "No";
  }
  
  return (
    <div className="field-row">
      <span className="field-label">{label}</span>
      <span className={`field-value ${highlight ? "highlight-value" : ""}`}>
        {String(displayValue).substring(0, 100)}
      </span>
    </div>
  );
}

function StatusBadge({ status }) {
  if (!status) return null;
  return (
    <span className="status-badge" style={{ background: STATUS_COLORS[status] || "#6b7280" }}>
      {status}
    </span>
  );
}

export default function NodeInspector({ node }) {
  const [expandedFields, setExpandedFields] = useState({});

  if (!node) return (
    <div className="inspector empty-inspector">
      <div className="empty-icon">◉</div>
      <p>Select a node to inspect</p>
      <p className="hint-text">Click any node in the graph to view its details and relationships</p>
    </div>
  );

  const data = node.data || node;
  if (!data) return <div className="inspector"><p>Data not found.</p></div>;

  // Extract key fields for display based on type
  const typeIcon = NODE_ICONS[data.type] || "●";
  const typeLabel = data.type?.replace(/([A-Z])/g, ' $1').trim() || "Entity";

  // Get status field if available
  let statusField = null;
  if (data.overallDeliveryStatus) statusField = data.overallDeliveryStatus;
  else if (data.status) statusField = data.status;

  // Build field list based on type
  const getFieldsForType = (type) => {
    switch (type) {
      case "BusinessPartner":
        return [
          ["Business Partner", data.businessPartner],
          ["Name", data.organizationBpName1 || data.businessPartnerFullName],
          ["Full Name", data.businessPartnerFullName],
          ["Customer Code", data.customer],
          ["Created", data.creationDate],
          ["Blocked", data.businessPartnerIsBlocked ? "Yes" : "No"]
        ];
      case "SalesOrder":
        return [
          ["Sales Order", data.salesOrder],
          ["Type", data.salesOrderType],
          ["Customer", data.soldToParty],
          ["Created", data.creationDate],
          ["Amount", data.totalNetAmount],
          ["Currency", data.transactionCurrency],
          ["Delivery Status", data.overallDeliveryStatus],
          ["Organization", data.salesOrganization]
        ];
      case "SalesOrderItem":
        return [
          ["Sales Order", data.salesOrder],
          ["Item", data.salesOrderItem],
          ["Product", data.material],
          ["Quantity", data.requestedQuantity],
          ["Amount", data.netAmount],
          ["Plant", data.plant]
        ];
      case "Product":
        return [
          ["Material Code", data.material],
          ["Description", data.materialDescription],
          ["Type", data.productType],
          ["Unit", data.baseUnitOfMeasure],
          ["Category", data.materialCategory]
        ];
      case "OutboundDelivery":
        return [
          ["Delivery", data.outboundDelivery],
          ["Customer", data.soldToParty],
          ["Ship To", data.shipToParty],
          ["Goods Movement", data.actualGoodsMovementDate],
          ["Picking Status", data.overallPickingStatus],
          ["Created", data.creationDate]
        ];
      case "DeliveryItem":
        return [
          ["Delivery", data.outboundDelivery],
          ["Item", data.outboundDeliveryItem],
          ["Product", data.material],
          ["Quantity", data.deliveryQuantity]
        ];
      case "BillingDocument":
        return [
          ["Billing Document", data.billingDocument],
          ["Type", data.billingDocumentType],
          ["Date", data.billingDocumentDate],
          ["Customer", data.soldToParty],
          ["Amount", data.totalNetAmount],
          ["Currency", data.transactionCurrency],
          ["Company", data.companyCode],
          ["Fiscal Year", data.fiscalYear],
          ["Cancelled", data.billingDocumentIsCancelled ? "Yes" : "No"]
        ];
      case "JournalEntry":
        return [
          ["Accounting Doc", data.accountingDocument],
          ["Company", data.companyCode],
          ["Fiscal Year", data.fiscalYear],
          ["GL Account", data.glaccount],
          ["Amount", data.amountInTransactionCurrency],
          ["DC Code", data.debitCreditCode],
          ["Posting Date", data.postingDate]
        ];
      case "Plant":
        return [
          ["Plant", data.plant],
          ["Name", data.plantName],
          ["Country", data.locationCountry],
          ["City", data.cityName]
        ];
      default:
        // Generic display of all fields
        return Object.entries(data)
          .filter(([k, v]) => k !== "id" && k !== "type" && k !== "label" && v !== undefined)
          .map(([k, v]) => [k.charAt(0).toUpperCase() + k.slice(1), v]);
    }
  };

  const fields = getFieldsForType(data.type);

  return (
    <div className="inspector">
      <div className="inspector-header">
        <span className="node-icon-large">{typeIcon}</span>
        <div>
          <div className="node-type-label">{typeLabel}</div>
          <div className="node-id">{data.id || data.businessPartner || data.salesOrder || data.material || data.outboundDelivery || data.billingDocument}</div>
        </div>
      </div>

      <div className="inspector-body">
        {fields.map(([label, value], idx) => (
          <FieldRow key={idx} label={label} value={value} />
        ))}
      </div>
    </div>
  );
}
