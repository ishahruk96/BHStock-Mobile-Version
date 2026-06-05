import React, { useEffect, useState } from "react";
import { StyleSheet, View, ScrollView, StatusBar, ActivityIndicator, Alert } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function DashboardScreen() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [latestTransactions, setLatestTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [apiErrors, setApiErrors] = useState<string[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const session = await AsyncStorage.getItem("user_session");
        if (!session) {
          Alert.alert("Error", "Session not found. Please login.");
          setLoading(false);
          return;
        }

        const userData = JSON.parse(session);
        const userId = userData.UserId;
        const apiKey = userData.ApiKey;
        setUserName(userData.UserName || "User");

        console.log("UserId:", userId);
        console.log("ApiKey:", apiKey);

        const headers = { 
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        };

        // API endpoints with proper userId parameter
        const endpoints = {
          organizations: `http://devmystock.byteheart.com/Dashboard/GetAllOrganization?userId=${userId}`,
          summary: `http://devmystock.byteheart.com/Dashboard/GetTransactionSummary?userId=${userId}`,
          lowStock: `http://devmystock.byteheart.com/Dashboard/GetUnavailableProductList?userId=${userId}`,
          latest: `http://devmystock.byteheart.com/Dashboard/LatestTransction?userId=${userId}`
        };

        console.log("Calling APIs:", endpoints);

        // ৪টি API প্যারালালি কল করা হচ্ছে
        const [orgRes, summaryRes, lowStockRes, latestRes] = await Promise.all([
          fetch(endpoints.organizations, { headers }),
          fetch(endpoints.summary, { headers }),
          fetch(endpoints.lowStock, { headers }),
          fetch(endpoints.latest, { headers })
        ]);

        // Check response statuses
        console.log("Org Response Status:", orgRes.status);
        console.log("Summary Response Status:", summaryRes.status);
        console.log("LowStock Response Status:", lowStockRes.status);
        console.log("Latest Response Status:", latestRes.status);

        // Get response texts first to debug
        const orgText = await orgRes.text();
        const summaryText = await summaryRes.text();
        const lowStockText = await lowStockRes.text();
        const latestText = await latestRes.text();

        console.log("Org Response:", orgText.substring(0, 200));
        console.log("Summary Response:", summaryText.substring(0, 200));
        console.log("LowStock Response:", lowStockText.substring(0, 200));
        console.log("Latest Response:", latestText.substring(0, 200));

        // Parse JSON responses
        let orgData = null;
        let summaryData = null;
        let lowStockData = null;
        let latestData = null;

        try {
          orgData = JSON.parse(orgText);
        } catch (e) {
          console.error("Org parse error:", e);
          setApiErrors(prev => [...prev, "Organizations API failed"]);
        }

        try {
          summaryData = JSON.parse(summaryText);
        } catch (e) {
          console.error("Summary parse error:", e);
          setApiErrors(prev => [...prev, "Summary API failed"]);
        }

        try {
          lowStockData = JSON.parse(lowStockText);
        } catch (e) {
          console.error("LowStock parse error:", e);
          setApiErrors(prev => [...prev, "Low Stock API failed"]);
        }

        try {
          latestData = JSON.parse(latestText);
        } catch (e) {
          console.error("Latest parse error:", e);
          setApiErrors(prev => [...prev, "Latest Transactions API failed"]);
        }

        // অর্গানাইজেশন ডাটা সেট করা
        if (orgData && orgData.success && Array.isArray(orgData.data)) {
          setOrganizations(orgData.data);
        } else {
          console.log("Org data structure issue:", orgData);
          setOrganizations([]);
        }
        
        // ট্রানজেকশন সামারি ডাটা সেট করা
        if (summaryData && summaryData.success && Array.isArray(summaryData.data) && summaryData.data.length > 0) {
          const firstOrg = summaryData.data[0];
          setSummary(firstOrg.weeklyTransactionSummary);
        } else {
          setSummary(null);
        }
        
        // লো স্টক প্রোডাক্ট ডাটা সেট করা
        if (lowStockData && lowStockData.success && Array.isArray(lowStockData.data) && lowStockData.data.length > 0) {
          const productsArray = lowStockData.data.flatMap((org: any) => 
            org.products && Array.isArray(org.products) ? org.products : []
          );
          setLowStockProducts(productsArray);
        } else {
          setLowStockProducts([]);
        }
        
        // লেটেস্ট ট্রানজেকশন ডাটা সেট করা - FIXED: checking different possible structures
        if (latestData) {
          console.log("Latest data structure:", Object.keys(latestData));
          
          // Try different possible data structures
          let transactions = [];
          
          if (latestData.success && Array.isArray(latestData.data)) {
            // Case 1: data is an array of organizations with latestTransactions
            transactions = latestData.data.flatMap((org: any) => 
              org.latestTransactions && Array.isArray(org.latestTransactions) ? org.latestTransactions : []
            );
          } else if (Array.isArray(latestData)) {
            // Case 2: data is directly an array of transactions
            transactions = latestData;
          } else if (latestData.data && Array.isArray(latestData.data)) {
            // Case 3: data is directly the transactions array
            transactions = latestData.data;
          }
          
          console.log("Found transactions count:", transactions.length);
          setLatestTransactions(transactions);
        } else {
          setLatestTransactions([]);
        }

        // Show error alert if any API failed
        if (apiErrors.length > 0) {
          Alert.alert("API Warning", `Some data couldn't be loaded:\n${apiErrors.join("\n")}`);
        }

      } catch (error) {
        console.error("Dashboard API Error:", error);
        Alert.alert("Error", "Failed to load dashboard data. Please check your connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <View style={[styles.mainWrapper, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  return (
    <View style={styles.mainWrapper}>
      <StatusBar barStyle="dark-content" backgroundColor="white" translucent={false} />
      
      <ScrollView 
        style={styles.contentContainer} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollPadding}
      >
        {/* Banner */}
        <View style={styles.headerBanner}>
          <ThemedText style={styles.bannerTitle}>📊 Stock Management Dashboard</ThemedText>
          <ThemedText style={styles.bannerSub}>Welcome, {userName}</ThemedText>
        </View>

        {/* 1. All Organizations Section */}
        <SectionHeader title="🏢 All Organizations" />
        {organizations.length > 0 ? (
          organizations.map((org: any, index: number) => (
            <View style={styles.orgCard} key={org.organizationId || index}>
              <ThemedText style={styles.orgName}>{org.organizationName || org.name || "Unknown Org"}</ThemedText>
              <Ionicons name="chevron-forward" size={20} color="#ff8c42" />
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <ThemedText style={styles.emptyText}>No Organization Found</ThemedText>
            <ThemedText style={styles.errorSubText}>Please check API connection</ThemedText>
          </View>
        )}

        {/* 2. Transaction Summary Grid */}
        <SectionHeader title="💰 Transaction Summary" />
        <View style={styles.summaryContainer}>
          <View style={styles.orgHeader}>
            <ThemedText style={styles.orgHeaderText}>
              Weekly Summary
            </ThemedText>
          </View>
          <View style={styles.grid}>
            <StatBox label="Total Trans." value={summary?.TotalTransactions ?? "0"} />
            <StatBox label="Total Qty" value={summary?.TotalQuantity?.toFixed(2) ?? "0.00"} />
            <StatBox label="Total Amount" value={`৳ ${summary?.TotalAmount?.toFixed(2) ?? "0.00"}`} color="#1b5e20" />
            <StatBox label="Total Profit" value={`৳ ${summary?.TotalProfit?.toFixed(2) ?? "0.00"}`} color="#2e7d32" />
            <StatBox label="Total Expense" value={`৳ ${summary?.TotalExpense?.toFixed(2) ?? "0.00"}`} color="#c62828" />
            <StatBox label="Net Profit" value={`৳ ${summary?.NetProfit?.toFixed(2) ?? "0.00"}`} color="#1565c0" />
          </View>
        </View>

        {/* 3. Low Stock Section */}
        <SectionHeader title="⚠️ Low Stock Products" />
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <ThemedText style={[styles.headerText, { flex: 2 }]}>Product Name</ThemedText>
            <ThemedText style={[styles.headerText, { flex: 1.5 }]}>Category</ThemedText>
            <ThemedText style={[styles.headerText, { flex: 1 }]}>Unit Price</ThemedText>
            <ThemedText style={[styles.headerText, { flex: 1 }]}>Stock</ThemedText>
            <ThemedText style={[styles.headerText, { flex: 1 }]}>Reorder Lvl</ThemedText>
            <ThemedText style={[styles.headerText, { flex: 1 }]}>Status</ThemedText>
          </View>
          
          {lowStockProducts.length > 0 ? (
            lowStockProducts.map((product: any, index: number) => (
              <View key={product.ProductId || index} style={styles.tableRow}>
                <ThemedText style={[styles.rowText, { flex: 2 }]} numberOfLines={1}>{product.ProductName || "N/A"}</ThemedText>
                <ThemedText style={[styles.rowText, { flex: 1.5 }]} numberOfLines={1}>{product.Category || "General"}</ThemedText>
                <ThemedText style={[styles.rowText, { flex: 1 }]}>৳{product.UnitPrice?.toFixed(2) ?? "0.00"}</ThemedText>
                <ThemedText style={[styles.rowText, { flex: 1, color: '#c62828', fontWeight: 'bold' }]}>{product.CurrentStock ?? 0}</ThemedText>
                <ThemedText style={[styles.rowText, { flex: 1 }]}>{product.ReorderLevel ?? 0}</ThemedText>
                <View style={{ flex: 1 }}>
                  <View style={[styles.statusBadge, product.Status === "Reorder" && styles.reorderBadge]}>
                    <ThemedText style={styles.statusText}>{product.Status || "N/A"}</ThemedText>
                  </View>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <ThemedText style={styles.emptyText}>All products are well in stock!</ThemedText>
            </View>
          )}
        </View>

        {/* 4. Latest Transactions Section */}
        <SectionHeader title="⏱️ Latest Transactions" />
        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <ThemedText style={[styles.headerText, { flex: 1.5 }]}>Product Name</ThemedText>
            <ThemedText style={[styles.headerText, { flex: 1 }]}>Category</ThemedText>
            <ThemedText style={[styles.headerText, { flex: 0.8 }]}>Unit Price</ThemedText>
            <ThemedText style={[styles.headerText, { flex: 0.8 }]}>Quantity</ThemedText>
            <ThemedText style={[styles.headerText, { flex: 1 }]}>Total Amount</ThemedText>
            <ThemedText style={[styles.headerText, { flex: 1.2 }]}>Date</ThemedText>
          </View>
          
          {latestTransactions.length > 0 ? (
            latestTransactions.map((tx: any, index: number) => {
              // Date formatting
              let formattedDate = tx.TransactionDate || tx.Date || "";
              if (formattedDate && typeof formattedDate === 'string' && formattedDate.startsWith('/Date(')) {
                const timestamp = parseInt(formattedDate.match(/\d+/)?.[0] || '0');
                formattedDate = new Date(timestamp).toLocaleDateString('en-US');
              }
              
              return (
                <View key={tx.TransactionId || tx.id || index} style={styles.tableRow}>
                  <ThemedText style={[styles.rowText, { flex: 1.5 }]} numberOfLines={1}>{tx.ProductName || tx.productName || "N/A"}</ThemedText>
                  <ThemedText style={[styles.rowText, { flex: 1 }]} numberOfLines={1}>{tx.Category || tx.category || "General"}</ThemedText>
                  <ThemedText style={[styles.rowText, { flex: 0.8 }]}>৳{tx.UnitPrice?.toFixed(2) ?? tx.unitPrice?.toFixed(2) ?? "0.00"}</ThemedText>
                  <ThemedText style={[styles.rowText, { flex: 0.8, fontWeight: 'bold' }]}>{tx.Quantity ?? tx.quantity ?? 0}</ThemedText>
                  <ThemedText style={[styles.rowText, { flex: 1, color: "#c62828", fontWeight: 'bold' }]}>
                    ৳{tx.TotalAmount?.toFixed(2) ?? tx.totalAmount?.toFixed(2) ?? "0.00"}
                  </ThemedText>
                  <ThemedText style={[styles.rowText, { flex: 1.2, fontSize: 11 }]} numberOfLines={1}>{formattedDate}</ThemedText>
                </View>
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <ThemedText style={styles.emptyText}>No recent transactions found.</ThemedText>
              <ThemedText style={styles.errorSubText}>API endpoint might be incorrect</ThemedText>
            </View>
          )}
        </View>

      </ScrollView>
    </View>
  );
}

// Reusable Components
const SectionHeader = ({ title }: { title: string }) => (
  <View style={styles.sectionHeader}>
    <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
    <View style={styles.divider} />
  </View>
);

const StatBox = ({ label, value, color = "#333" }: { label: string; value: string | number; color?: string }) => (
  <View style={styles.statBox}>
    <ThemedText style={styles.statLabel}>{label}</ThemedText>
    <ThemedText style={[styles.statValue, { color }]}>{value}</ThemedText>
  </View>
);

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: "#f4f7f4" },
  contentContainer: { flex: 1 },
  scrollPadding: { paddingHorizontal: 15, paddingTop: 15, paddingBottom: 120 },
  
  headerBanner: { backgroundColor: "#2e7d32", padding: 20, borderRadius: 15, marginBottom: 10, elevation: 4 },
  bannerTitle: { color: "white", fontSize: 17, fontWeight: "bold" },
  bannerSub: { color: "#c8e6c9", fontSize: 12, marginTop: 4 },
  
  sectionHeader: { marginTop: 22, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "bold", color: "#2e7d32" },
  divider: { height: 3, backgroundColor: "#81c784", width: 35, marginTop: 4, borderRadius: 2 },
  
  orgCard: { backgroundColor: "#fff", padding: 18, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2, marginBottom: 8 },
  orgName: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  
  summaryContainer: { backgroundColor: "#fff", borderRadius: 15, overflow: 'hidden', elevation: 3, marginBottom: 5 },
  orgHeader: { backgroundColor: "#66bb6a", padding: 12, alignItems: 'center' },
  orgHeaderText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  statBox: { width: '33.33%', paddingVertical: 15, paddingHorizontal: 5, alignItems: 'center', borderRightWidth: 0.5, borderBottomWidth: 0.5, borderColor: '#e0e0e0' },
  statLabel: { fontSize: 10, color: '#777', textAlign: 'center', marginBottom: 4 },
  statValue: { fontSize: 13, fontWeight: 'bold' },
  
  tableContainer: { 
    backgroundColor: "#fff", 
    borderRadius: 15, 
    overflow: 'hidden', 
    elevation: 3,
    marginBottom: 5
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#e8f5e9',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#c8e6c9',
  },
  headerText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#2e7d32',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  rowText: {
    fontSize: 11,
    color: '#333',
    textAlign: 'center',
  },
  
  statusBadge: {
    backgroundColor: '#fff3e0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'center',
  },
  reorderBadge: {
    backgroundColor: '#ffebee',
  },
  statusText: {
    color: '#ff8c42',
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  emptyCard: { 
    backgroundColor: "#fff", 
    padding: 30, 
    borderRadius: 12, 
    alignItems: 'center',
    marginTop: 10
  },
  emptyText: { 
    color: "#888", 
    textAlign: "center", 
    fontSize: 13 
  },
  errorSubText: {
    color: "#c62828",
    textAlign: "center",
    fontSize: 11,
    marginTop: 5
  }
});