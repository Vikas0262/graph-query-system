import { useEffect, useRef, useState, useCallback } from "react";
import cytoscape from "cytoscape";
import fcose from "cytoscape-fcose";
import { buildGraphElements, nodeTypes } from "../data/graphBuilder";
import { runSQL } from "../data/database";

cytoscape.use(fcose);

const NODE_COLORS = {
  BusinessPartner: "#4f46e5",
  SalesOrder: "#0891b2",
  SalesOrderItem: "#0284c7",
  Product: "#7c3aed",
  OutboundDelivery: "#059669",
  DeliveryItem: "#16a34a",
  BillingDocument: "#d97706",
  JournalEntry: "#dc2626",
  Plant: "#065f46",
  // Legacy names for backward compatibility:
  Customer: "#4f46e5",
  Delivery: "#059669"
};

const TYPE_SIZES = {
  BusinessPartner: 52,
  SalesOrder: 44,
  SalesOrderItem: 36,
  Product: 44,
  OutboundDelivery: 44,
  DeliveryItem: 36,
  BillingDocument: 44,
  JournalEntry: 36,
  Plant: 40,
  // Legacy sizes:
  Customer: 52,
  Delivery: 44
};

export default function GraphView({ selectedNode, onNodeSelect, highlightedIds = [], dbReady = false }) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [expandedNodes, setExpandedNodes] = useState(new Set());
  const [focusId, setFocusId] = useState(null);
  const [viewMode, setViewMode] = useState("overview"); // overview | focused
  
  // Feature 1: Tooltip on hover
  const [tooltip, setTooltip] = useState(null);
  
  // Feature 2: Flow highlighting
  const [flowMode, setFlowMode] = useState(false);
  const [flowNodeId, setFlowNodeId] = useState(null);
  
  // Feature 3: Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  
  // Feature 4: Stats
  const [stats, setStats] = useState({
    completeFlows: 0,
    missingDelivery: 0,
    missingBilling: 0,
    cancelledInvoices: 0
  });

  const buildStylesheet = useCallback(() => [
    {
      selector: "node",
      style: {
        "background-color": (ele) => NODE_COLORS[ele.data("type")] || "#6b7280",
        "label": "data(label)",
        "color": "#fff",
        "font-size": "10px",
        "font-family": "'IBM Plex Mono', monospace",
        "text-valign": "bottom",
        "text-halign": "center",
        "text-margin-y": 4,
        "width": (ele) => TYPE_SIZES[ele.data("type")] || 40,
        "height": (ele) => TYPE_SIZES[ele.data("type")] || 40,
        "border-width": 2,
        "border-color": "#1e1e2e",
        "text-background-color": "#0d0d1a",
        "text-background-opacity": 0.7,
        "text-background-padding": "3px",
        "text-background-shape": "roundrectangle",
        "transition-property": "background-color, border-width, border-color",
        "transition-duration": "0.2s",
      }
    },
    {
      selector: "node:selected",
      style: {
        "border-width": 4,
        "border-color": "#f0f",
        "background-color": "#fff",
        "color": "#0d0d1a",
      }
    },
    {
      selector: "node.highlighted",
      style: {
        "border-width": 4,
        "border-color": "#fbbf24",
        "box-shadow": "0 0 20px #fbbf24",
      }
    },
    {
      selector: "edge",
      style: {
        "width": 1.5,
        "line-color": "#2a2a4a",
        "target-arrow-color": "#4a4a7a",
        "target-arrow-shape": "triangle",
        "curve-style": "bezier",
        "label": "data(label)",
        "font-size": "8px",
        "color": "#888",
        "font-family": "'IBM Plex Mono', monospace",
        "text-rotation": "autorotate",
        "text-background-color": "#0d0d1a",
        "text-background-opacity": 0.6,
        "text-background-padding": "2px",
        "opacity": 0.7,
      }
    },
    {
      selector: "edge:selected",
      style: { "line-color": "#a855f7", "opacity": 1, "width": 2.5 }
    }
  ], []);

  const initCy = useCallback((elements) => {
    if (!containerRef.current) return;
    if (cyRef.current) cyRef.current.destroy();

    // Check if we have any data to display
    const elementCount = Array.isArray(elements) ? elements.length : (elements?.nodes?.length || 0);
    if (elementCount === 0) {
      containerRef.current.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:100%;color:#5555aa;font-family:monospace;flex-direction:column;gap:12px">
          <div style="font-size:32px">⬡</div>
          <div>No graph data loaded yet</div>
          <div style="font-size:11px">Check browser console for errors</div>
        </div>`;
      return;
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: buildStylesheet(),
      layout: {
        name: "fcose",
        quality: "proof",
        randomize: true,
        animate: true,
        animationDuration: 600,
        nodeRepulsion: 8000,
        idealEdgeLength: 120,
        edgeElasticity: 0.45,
        nestingFactor: 0.1,
        gravity: 0.25,
        numIter: 2500,
        tile: true,
        tilingPaddingVertical: 10,
        tilingPaddingHorizontal: 10,
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      autoungrabify: false,
    });

    cy.on("tap", "node", (evt) => {
      const node = evt.target;
      const data = node.data();
      
      // Feature 2: Highlight flow on click
      if (flowMode && flowNodeId === data.id) {
        // Toggle off
        clearFlowHighlight(cy);
        setFlowMode(false);
        setFlowNodeId(null);
      } else {
        // Highlight this node's flow
        clearFlowHighlight(cy);
        highlightNodeFlow(cy, node);
        setFlowMode(true);
        setFlowNodeId(data.id);
      }
      
      onNodeSelect(data);
    });
    
    // Feature 1: Tooltip on hover
    cy.on("mouseover", "node", (evt) => {
      const node = evt.target;
      const data = node.data();
      const pos = node.renderedPosition();
      
      const keyFields = getKeyFields(data);
      setTooltip({
        x: pos.x,
        y: pos.y,
        type: data.type,
        id: data.id,
        label: data.label,
        fields: keyFields
      });
    });
    
    cy.on("mouseout", "node", () => {
      setTooltip(null);
    });
    
    cy.on("mousemove", (evt) => {
      if (tooltip && evt.target === cy) {
        // Keep tooltip visible but update follows better positioning
        const pos = evt.renderedPosition || { x: evt.clientX, y: evt.clientY };
      }
    });

    cy.on("dblclick", "node", (evt) => {
      const id = evt.target.data("id");
      setFocusId(id);
      setViewMode("focused");
      setExpandedNodes(new Set([id]));
    });

    // Fit graph to viewport after layout completes
    const layout = cy.layout(cy._private.options.layout);
    layout.on("layoutstop", () => {
      console.log("✅ Layout complete, fitting graph to viewport", { nodesCount: cy.nodes().length });
      cy.fit(undefined, 40);
    });
    layout.run();

    cyRef.current = cy;
  }, [buildStylesheet, onNodeSelect, flowMode, flowNodeId]);

  useEffect(() => {
    const { nodes, edges } = buildGraphElements(
      viewMode === "focused" ? focusId : null,
      expandedNodes
    );
    initCy([...nodes, ...edges]);
  }, [focusId, expandedNodes, viewMode, initCy]);

  // Highlight nodes from chat
  // Feature 5: Chat response highlights
  useEffect(() => {
    if (!cyRef.current) return;
    cyRef.current.nodes().removeClass("highlighted");
    highlightedIds.forEach(id => {
      const node = cyRef.current.$(`#${id}`);
      if (node.length > 0) {
        node.addClass("highlighted");
      }
    });
  }, [highlightedIds]);
  
  // Feature 4: Load stats on component mount
  useEffect(() => {
    if (!dbReady) return;
    
    const timer = setTimeout(() => calculateFlowStats(), 100);
    return () => clearTimeout(timer);
  }, [dbReady]);

  const resetView = () => {
    setFocusId(null);
    setViewMode("overview");
    setExpandedNodes(new Set());
  };

  const fitGraph = () => cyRef.current?.fit(undefined, 40);

  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (query.trim().length === 0) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }
    
    // If graph is not ready, show message
    if (!cyRef.current) {
      console.log("Graph not loaded yet, waiting for initialization...");
      return;
    }
    
    try {
      const allNodes = cyRef.current.nodes();
      const q = query.toLowerCase();
      
      const matches = allNodes.filter(node => {
        const data = node.data();
        const id = (data.id || "").toString().toLowerCase();
        const label = (data.label || "").toString().toLowerCase();
        
        return id.includes(q) || label.includes(q);
      });
      
      const results = matches.slice(0, 15).map(n => ({
        id: n.data("id"),
        label: n.data("label") || n.data("id"),
        type: n.data("type")
      }));
      
      console.log(`🔍 Search found ${results.length} results for "${query}"`);
      setSearchResults(results);
      setShowSearchDropdown(results.length > 0);
    } catch (err) {
      console.error("Search error:", err);
    }
  };
  
  const selectSearchResult = (nodeId) => {
    if (!cyRef.current || !nodeId) {
      console.warn("Invalid selection or graph not loaded");
      return;
    }
    
    try {
      // Escape special characters in ID for selector
      const escapedId = String(nodeId).replace(/([!"#$%&'()*+,.\/:;?@[\\\]^`{|}~])/g, '\\$1');
      const node = cyRef.current.$id(nodeId) || cyRef.current.$(`[id='${escapedId}']`);
      
      if (node.length === 0) {
        console.warn("Node not found:", nodeId);
        return;
      }
      
      // Select the node
      cyRef.current.elements().unselect();
      node.select();
      
      // Animate to center the node
      cyRef.current.animate({
        fit: { eles: node, padding: 100 },
        duration: 500
      });
      
      // Trigger selection callback
      onNodeSelect(node.data());
      
      // Clear search
      setSearchQuery("");
      setSearchResults([]);
      setShowSearchDropdown(false);
      
      console.log("✅ Selected node:", nodeId);
    } catch (err) {
      console.error("Error selecting node:", err);
    }
  };
  
  const calculateFlowStats = () => {
    try {
      // DEBUG: Check table contents and column names
      console.log("🔍 DEBUG: Starting Flow Health statistics calculation...");
      
      try {
        const t1 = runSQL("SELECT COUNT(*) as c FROM sales_order_headers");
        const t2 = runSQL("SELECT COUNT(*) as c FROM outbound_delivery_headers");
        const t3 = runSQL("SELECT COUNT(*) as c FROM billing_document_headers");
        console.log("📊 TABLE COUNTS:", {
          sales_orders: t1.rows[0]?.[0] || 0,
          deliveries: t2.rows[0]?.[0] || 0,
          billings: t3.rows[0]?.[0] || 0
        });

        // Check actual column names
        const s1 = runSQL("SELECT * FROM sales_order_headers LIMIT 1");
        const s2 = runSQL("SELECT * FROM outbound_delivery_headers LIMIT 1");
        const s3 = runSQL("SELECT * FROM billing_document_headers LIMIT 1");
        console.log("SO columns:", s1.columns);
        console.log("DEL columns:", s2.columns);
        console.log("BILL columns:", s3.columns);
        
        // Check the join key
        const joinTest = runSQL(`
          SELECT soh.salesOrder, odh.outboundDelivery 
          FROM sales_order_headers soh
          LEFT JOIN outbound_delivery_headers odh 
            ON odh.soldToParty = soh.soldToParty
          LIMIT 3
        `);
        console.log("📌 Join test (SO to Delivery):", joinTest.rows);
      } catch(e) {
        console.error("❌ Debug error:", e);
      }

      // Complete flows: has order + delivery + billing (and not cancelled)
      const completeFlows = runSQL(`
        SELECT COUNT(DISTINCT soh.salesOrder) as count
        FROM sales_order_headers soh
        INNER JOIN outbound_delivery_headers odh ON odh.soldToParty = soh.soldToParty
        INNER JOIN billing_document_headers bdh ON bdh.soldToParty = soh.soldToParty
        WHERE bdh.billingDocumentIsCancelled = 0 OR bdh.billingDocumentIsCancelled = 'false'
      `)?.rows[0]?.[0] || 0;
      
      // No delivery: sales orders without outbound deliveries
      const missingDelivery = runSQL(`
        SELECT COUNT(*) as count FROM sales_order_headers soh
        LEFT JOIN outbound_delivery_headers odh ON odh.soldToParty = soh.soldToParty
        WHERE odh.outboundDelivery IS NULL
      `)?.rows[0]?.[0] || 0;
      
      // No billing: sales orders without billing documents
      const missingBilling = runSQL(`
        SELECT COUNT(*) as count FROM sales_order_headers soh
        LEFT JOIN billing_document_headers bdh ON bdh.soldToParty = soh.soldToParty
        WHERE bdh.billingDocument IS NULL
      `)?.rows[0]?.[0] || 0;
      
      // Cancelled: billing documents marked as cancelled
      const cancelledInvoices = runSQL(`
        SELECT COUNT(*) as count FROM billing_document_headers
        WHERE billingDocumentIsCancelled = 1 
        OR billingDocumentIsCancelled = 'true'
        OR billingDocumentIsCancelled = true
      `)?.rows[0]?.[0] || 0;
      
      console.log("✅ Flow Health Stats Calculated:", {
        completeFlows,
        missingDelivery,
        missingBilling,
        cancelledInvoices
      });
      
      setStats({
        completeFlows: completeFlows,
        missingDelivery: missingDelivery,
        missingBilling: missingBilling,
        cancelledInvoices: cancelledInvoices
      });
    } catch (e) {
      console.error("❌ Could not calculate flow stats:", e);
    }
  };
  
  const clearFlowHighlight = (cy) => {
    if (!cy) return;
    cy.nodes().style('opacity', 1);
    cy.edges().style('opacity', 0.7);
  };
  
  const highlightNodeFlow = (cy, node) => {
    if (!cy) return;
    
    // Dim all nodes
    cy.nodes().style('opacity', 0.2);
    cy.edges().style('opacity', 0.1);
    
    // Highlight clicked node
    node.style({
      'opacity': 1,
      'border-color': '#fff',
      'border-width': 4,
      'z-index': 100
    });
    
    // Highlight neighbors
    node.neighborhood().forEach(elem => {
      if (elem.isNode()) {
        elem.style({
          'opacity': 1,
          'border-color': '#fbbf24',
          'border-width': 3
        });
      } else {
        elem.style('opacity', 1);
      }
    });
  };
  
  const getKeyFields = (data) => {
    const keys = Object.keys(data);
    const fieldsToShow = ['amount', 'status', 'date', 'name', 'salesOrder', 'billingDocument', 'outboundDelivery', 'businessPartner'];
    const result = {};
    
    fieldsToShow.forEach(key => {
      if (data[key] && data[key].toString().length < 50) {
        result[key] = data[key];
      }
    });
    
    return Object.entries(result).slice(0, 5);
  };
  
  return (
    <div className="graph-container">
      <div className="graph-toolbar">
        <div className="toolbar-left">
          <button
            className={`tb-btn ${viewMode === "overview" ? "active" : ""}`}
            onClick={resetView}
          >⬡ Overview</button>
          {viewMode === "focused" && (
            <span className="focus-badge">Focused: {focusId}</span>
          )}
        </div>
        
        {/* Feature 3: Search bar */}
        <div className="toolbar-center" style={{flex: 1, maxWidth: "300px", position: "relative", marginLeft: "12px"}}>
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            onFocus={() => searchQuery && setShowSearchDropdown(searchResults.length > 0)}
            onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                setSearchQuery("");
                setSearchResults([]);
                setShowSearchDropdown(false);
              }
              if (e.key === "Enter" && searchResults.length > 0) {
                selectSearchResult(searchResults[0].id);
              }
            }}
            style={{
              width: "100%",
              padding: "6px 10px",
              background: "#1a1a2e",
              border: searchQuery ? "1px solid #10b981" : "1px solid #444",
              borderRadius: "4px",
              color: "#ccc",
              fontSize: "12px",
              fontFamily: "monospace",
              transition: "border-color 0.2s"
            }}
          />
          {searchQuery && (
            <span 
              style={{
                position: "absolute",
                right: "8px",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: "10px",
                color: "#666",
                cursor: "pointer"
              }}
              onClick={() => {
                setSearchQuery("");
                setSearchResults([]);
                setShowSearchDropdown(false);
              }}
            >
              ✕
            </span>
          )}
          {showSearchDropdown && searchResults.length > 0 && (
            <div style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "#0d0d1a",
              border: "1px solid #10b981",
              borderRadius: "4px",
              marginTop: "2px",
              zIndex: 1000,
              maxHeight: "240px",
              overflow: "auto",
              boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
            }}>
              {searchResults.map((result, i) => (
                <div
                  key={i}
                  onClick={() => selectSearchResult(result.id)}
                  style={{
                    padding: "8px 12px",
                    borderBottom: i < searchResults.length - 1 ? "1px solid #222" : "none",
                    cursor: "pointer",
                    fontSize: "11px",
                    color: "#aaa",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#1a1a2e"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  title={result.id}
                >
                  <span style={{color: NODE_COLORS[result.type] || "#888", fontSize: "12px"}}>●</span>
                  <span style={{flex: 1, overflow: "hidden", textOverflow: "ellipsis"}}>
                    {result.label}
                  </span>
                  <span style={{fontSize: "9px", color: "#555", whiteSpace: "nowrap"}}>
                    {result.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="toolbar-right">
          <button className="tb-btn" onClick={fitGraph}>⊞ Fit</button>
          {flowMode && (
            <button
              className="tb-btn"
              onClick={() => {
                clearFlowHighlight(cyRef.current);
                setFlowMode(false);
                setFlowNodeId(null);
              }}
              style={{background: "#d97706"}}
            >
              ✕ Clear highlight
            </button>
          )}
          <span className="hint">Double-click to expand · Click for flow</span>
        </div>
      </div>

      <div ref={containerRef} className="cy-canvas" />
      
      {/* Feature 1: Tooltip on hover */}
      {tooltip && (
        <div
          style={{
            position: "absolute",
            left: `${tooltip.x + 15}px`,
            top: `${tooltip.y + 15}px`,
            background: "#0d0d1a",
            border: "1px solid #444",
            borderRadius: "6px",
            padding: "8px 12px",
            fontSize: "11px",
            color: "#ccc",
            fontFamily: "monospace",
            pointerEvents: "none",
            zIndex: 999,
            maxWidth: "200px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
          }}
        >
          <div style={{color: NODE_COLORS[tooltip.type] || "#888", fontWeight: "bold", marginBottom: "4px"}}>
            {tooltip.type}
          </div>
          <div style={{fontSize: "10px", color: "#666", marginBottom: "4px"}}>{tooltip.id}</div>
          {tooltip.fields.map(([key, value], i) => (
            <div key={i} style={{fontSize: "10px", color: "#999", marginBottom: "2px"}}>
              <span style={{color: "#666"}}>{key}:</span> {JSON.stringify(value)}
            </div>
          ))}
          <div style={{fontSize: "9px", color: "#555", marginTop: "6px", fontStyle: "italic"}}>Click to inspect</div>
        </div>
      )}
      
      {/* Feature 4: Stats panel */}
      <div
        style={{
          position: "absolute",
          bottom: "16px",
          right: "16px",
          background: "#0d0d1a",
          border: "1px solid #444",
          borderRadius: "6px",
          padding: "12px",
          fontSize: "11px",
          color: "#ccc",
          fontFamily: "monospace",
          maxWidth: "220px",
          zIndex: 100
        }}
      >
        <div style={{fontWeight: "bold", marginBottom: "8px", color: "#10b981"}}>Flow Health</div>
        <div style={{marginBottom: "4px"}}>✓ Complete: <span style={{color: "#059669"}}>{stats.completeFlows}</span></div>
        <div style={{marginBottom: "4px"}}>✗ No delivery: <span style={{color: "#d97706"}}>{stats.missingDelivery}</span></div>
        <div style={{marginBottom: "4px"}}>✗ No billing: <span style={{color: "#dc2626"}}>{stats.missingBilling}</span></div>
        <div>⊘ Cancelled: <span style={{color: "#ef4444"}}>{stats.cancelledInvoices}</span></div>
      </div>

      <div className="graph-legend">
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <div key={type} className="legend-item">
            <div className="legend-dot" style={{ background: color }} />
            <span>{type.replace(/([A-Z])/g, ' $1').trim()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
