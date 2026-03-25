import { useState, useEffect } from "react";
import GraphView from "./components/GraphView";
import NodeInspector from "./components/NodeInspector";
import ChatInterface from "./components/ChatInterface";
import { initDB, runSQL } from "./data/database";
import { loadAllData } from "./data/loader";
import { setSAPData } from "./data/graphBuilder";
import "./App.css";

export default function App() {
  const [selectedNode, setSelectedNode] = useState(null);
  const [highlightedIds, setHighlightedIds] = useState([]);
  const [dbReady, setDbReady] = useState(false);
  const [dbError, setDbError] = useState(null);
  const [activePanel, setActivePanel] = useState("chat");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Loading SAP data...");
  const [stats, setStats] = useState({
    customers: 0,
    orders: 0,
    deliveries: 0,
    invoices: 0
  });

  useEffect(() => {
    async function initializeApp() {
      try {
        setLoadingMessage("Fetching SAP O2C data files...");
        const sapData = await loadAllData();
        
        // Calculate stats from loaded data
        setStats({
          customers: sapData.businessPartners?.length || 0,
          orders: sapData.salesOrderHeaders?.length || 0,
          deliveries: sapData.outboundDeliveryHeaders?.length || 0,
          invoices: sapData.billingDocumentHeaders?.length || 0
        });
        
        setLoadingMessage("Initializing database...");
        await initDB(sapData);
        
        setLoadingMessage("Preparing graph visualization...");
        setSAPData(sapData);
        
        setDbReady(true);
      } catch (err) {
        console.error("Initialization error:", err);
        setDbError(err.message || "Failed to initialize application");
      }
    }

    initializeApp();
  }, []);

  const handleNodeSelect = (node) => {
    setSelectedNode(node);
    setActivePanel("inspector");
  };

  const debugDatabase = () => {
    try {
      console.log("🐛 Database Debug Info:");
      const bpCount = runSQL("SELECT COUNT(*) as count FROM business_partners")[0]?.count || 0;
      const soCount = runSQL("SELECT COUNT(*) as count FROM sales_order_headers")[0]?.count || 0;
      const billCount = runSQL("SELECT COUNT(*) as count FROM billing_document_headers")[0]?.count || 0;
      console.log(`  ✅ businessPartners: ${bpCount}`);
      console.log(`  ✅ saltOrderHeaders: ${soCount}`);
      console.log(`  ✅ billingDocumentHeaders: ${billCount}`);
      if (bpCount === 0 || soCount === 0 || billCount === 0) {
        console.warn("  ⚠️ WARNING: Some tables are empty! Check loader.js and manifest.json");
      }
    } catch (err) {
      console.error("Debug error:", err);
    }
  };

  if (dbError) return (
    <div className="loading-screen error">
      <div>Database Error: {dbError}</div>
    </div>
  );

  if (!dbReady) return (
    <div className="loading-screen">
      <div className="loading-spinner" />
      <div className="loading-text">{loadingMessage}</div>
    </div>
  );

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <div className="logo">⬡</div>
          <div className="header-titles">
            <span className="app-name">GraphQuery</span>
            <span className="app-tagline">Business Intelligence Graph</span>
          </div>
        </div>
        <div className="header-stats">
          <StatBadge label="Customers" value={stats.customers.toString()} />
          <StatBadge label="Orders" value={stats.orders.toString()} />
          <StatBadge label="Deliveries" value={stats.deliveries.toString()} />
          <StatBadge label="Invoices" value={stats.invoices.toString()} />
        </div>
        <div className="header-right">
          <button className="sidebar-toggle" title="Debug Database" onClick={debugDatabase} style={{marginRight: "8px", fontSize: "12px", padding: "4px 8px", cursor: "pointer", background: "#333", border: "1px solid #666", borderRadius: "3px", color: "#aaa"}}>
            🐛 Debug
          </button>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            {sidebarOpen ? "⟩⟩" : "⟨⟨"}
          </button>
        </div>
      </header>

      <main className="app-main">
        <div className="graph-panel">
          <GraphView
            selectedNode={selectedNode}
            onNodeSelect={handleNodeSelect}
            highlightedIds={highlightedIds}
            dbReady={dbReady}
          />
        </div>

        {sidebarOpen && (
          <div className="sidebar">
            <div className="sidebar-tabs">
              <button className={`tab-btn ${activePanel === "chat" ? "active" : ""}`} onClick={() => setActivePanel("chat")}>
                ◎ Chat
              </button>
              <button className={`tab-btn ${activePanel === "inspector" ? "active" : ""}`} onClick={() => setActivePanel("inspector")}>
                ⊙ Inspect {selectedNode ? `· ${selectedNode.id}` : ""}
              </button>
            </div>
            <div className="sidebar-content">
              {activePanel === "chat" ? (
                <ChatInterface onHighlight={setHighlightedIds} />
              ) : (
                <NodeInspector node={selectedNode} />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function StatBadge({ label, value }) {
  return (
    <div className="stat-badge">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
