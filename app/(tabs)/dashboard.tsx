import React, { useEffect, useState, useCallback } from "react";
import { StyleSheet, View, ScrollView, StatusBar, ActivityIndicator, Alert, TouchableOpacity } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";

export default function DashboardScreen() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [latestTransactions, setLatestTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [organizationId, setOrganizationId] = useState<string>("");
  const [selectedOrgName, setSelectedOrgName] = useState<string>("");
  const [sessionData, setSessionData] = useState<any>(null);

  // Helper function to parse /Date(timestamp)/ format
  const parseTransactionDate = (dateValue: string): Date | null => {
    if (!dateValue) return null;
    
    const matches = dateValue.match(/\/Date\((\d+)\)\//);
    if (matches && matches[1]) {
      const timestamp = parseInt(matches[1]);
      return new Date(timestamp);
    }
    
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? null : parsed;
  };

  // Filter transactions for last 7 days and limit to 5
  const filterLast7DaysTransactions = (transactions: any[]): any[] => {
    if (!Array.isArray(transactions) || transactions.length === 0) return [];
    
    const now = new Date();
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 7);
    
    const recentTransactions = transactions.filter(tx => {
      const txDate = parseTransactionDate(tx.TransactionDate);
      return txDate && txDate >= sevenDaysAgo;
    });
    
    return recentTransactions
      .sort((a, b) => {
        const dateA = parseTransactionDate(a.TransactionDate);
        const dateB = parseTransactionDate(b.TransactionDate);
        return (dateB?.getTime() || 0) - (dateA?.getTime() || 0);
      })
      .slice(0, 5);
  };

  // Initialize dashboard
  useEffect(() => {
    const initDashboard = async () => {
      try {
        const session = await AsyncStorage.getItem("user_session");
        if (!session) {
          Alert.alert("Error", "Session not found. Please login.");
          setLoading(false);
          return;
        }

        const userData = JSON.parse(session);
        setUserName(userData.UserName || "User");
        setSessionData(userData);

        const userId = userData.UserId;
        const apiKey = userData.ApiKey;
        const defaultOrgId = userData.OrganizationId || userData.orgId;

        const headers = {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        };

        const orgUrl = `http://devmystock.byteheart.com/Dashboard/GetAllOrganization?userId=${userId}`;
        const response = await fetch(orgUrl, { headers });
        const orgText = await response.text();
        const orgData = JSON.parse(orgText);

        if (orgData && orgData.success && Array.isArray(orgData.data) && orgData.data.length > 0) {
          setOrganizations(orgData.data);
          
          const hasDefaultOrg = orgData.data.some((o: any) => (o.organizationId || o.id) === defaultOrgId);
          const initialOrg = hasDefaultOrg 
            ? orgData.data.find((o: any) => (o.organizationId || o.id) === defaultOrgId)
            : orgData.data[0];
          
          const initialOrgId = initialOrg.organizationId || initialOrg.id;
          const initialOrgName = initialOrg.organizationName || initialOrg.name || "Unknown Org";

          setOrganizationId(initialOrgId?.toString());
          setSelectedOrgName(initialOrgName);
          
          fetchDetails(userId, apiKey, initialOrgId);
        } else {
          setOrganizations([]);
          setLoading(false);
        }

      } catch (error) {
        console.error("Dashboard Init Error:", error);
        Alert.alert("Error", "Failed to load organizations.");
        setLoading(false);
      }
    };

    initDashboard();
  }, []);

  // Fetch details for specific organization
  const fetchDetails = async (userId: string, apiKey: string, orgId: string) => {
    setDetailsLoading(true);
    try {
      const headers = {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      };

      const endpoints = {
        summary: `http://devmystock.byteheart.com/Dashboard/GetTransactionSummary?userId=${userId}&organizationId=${orgId}`,
        lowStock: `http://devmystock.byteheart.com/Dashboard/GetUnavailableProductList?userId=${userId}`,
        latest: `http://devmystock.byteheart.com/Dashboard/LatestTransction?userId=${userId}`
      };

      const [summaryRes, lowStockRes, latestRes] = await Promise.all([
        fetch(endpoints.summary, { headers }),
        fetch(endpoints.lowStock, { headers }),
        fetch(endpoints.latest, { headers })
      ]);

      const summaryData = JSON.parse(await summaryRes.text());
      const lowStockData = JSON.parse(await lowStockRes.text());
      const latestData = JSON.parse(await latestRes.text());

      // Transaction summary setup
      if (summaryData && summaryData.success && Array.isArray(summaryData.data)) {
        const orgSummary = summaryData.data.find((item: any) => (item.organizationId || item.id)?.toString() === orgId?.toString());
        setSummary(orgSummary?.weeklyTransactionSummary || null);
      } else {
        setSummary(null);
      }
      
      // Low stock products setup - Fixed to handle the nested structure
      if (lowStockData && lowStockData.success && Array.isArray(lowStockData.data)) {
        const userOrgLowStock = lowStockData.data.find((org: any) => (org.organizationId || org.id)?.toString() === orgId?.toString());
        setLowStockProducts(userOrgLowStock?.products && Array.isArray(userOrgLowStock.products) ? userOrgLowStock.products : []);
      } else {
        setLowStockProducts([]);
      }
      
      // Latest transactions setup - Fixed for nested structure
      let allTransactions: any[] = [];
      
      if (latestData && latestData.success && Array.isArray(latestData.data)) {
        const orgTransactionData = latestData.data.find((org: any) => {
          const orgIdentifier = org.organizationId || org.id;
          return orgIdentifier?.toString() === orgId?.toString();
        });
        
        if (orgTransactionData && orgTransactionData.Transactions && orgTransactionData.Transactions.Items) {
          allTransactions = orgTransactionData.Transactions.Items;
        } else if (orgTransactionData && Array.isArray(orgTransactionData.transactions)) {
          allTransactions = orgTransactionData.transactions;
        }
      }
      
      const filteredTransactions = filterLast7DaysTransactions(allTransactions);
      setLatestTransactions(filteredTransactions);

    } catch (e) {
      console.error("Fetch Details Error:", e);
      Alert.alert("Error", "Failed to update organization data.");
    } finally {
      setLoading(false);
      setDetailsLoading(false);
    }
  };

  // Handle organization change
  const handleOrgChange = (itemValue: string) => {
    if (!itemValue || itemValue === organizationId) return;
    
    setOrganizationId(itemValue);
    
    const currentOrg = organizations.find((org: any) => (org.organizationId || org.id)?.toString() === itemValue);
    setSelectedOrgName(currentOrg?.organizationName || currentOrg?.name || "Unknown Org");
    
    if (sessionData) {
      fetchDetails(sessionData.UserId, sessionData.ApiKey, itemValue);
    }
  };

  // Navigate to sales list
  const navigateToSalesList = () => {
    router.push({
      pathname: "/sales_list",
      params: { organizationId: organizationId, organizationName: selectedOrgName }
    });
  };

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
        {/* Banner with Organization Info */}
        <View style={styles.headerBanner}>
          <ThemedText style={styles.bannerTitle}>📊 Stock Management Dashboard</ThemedText>
          <ThemedText style={styles.bannerSub}>Welcome, {userName}</ThemedText>
        </View>

        {/* Dropdown Section */}
        <SectionHeader title="🏢 Select Organization" />
        {organizations.length > 0 ? (
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={organizationId}
              onValueChange={(itemValue) => handleOrgChange(itemValue)}
              style={styles.picker}
              dropdownIconColor="#2e7d32"
            >
              {organizations.map((org: any, index: number) => {
                const id = (org.organizationId || org.id)?.toString();
                const name = org.organizationName || org.name || "Unknown Org";
                return (
                  <Picker.Item key={id || index} label={name} value={id} />
                );
              })}
            </Picker>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <ThemedText style={styles.emptyText}>No Organization Found</ThemedText>
          </View>
        )}

        {/* Loading state for details */}
        {detailsLoading ? (
          <View style={{ padding: 20, alignItems: "center" }}>
            <ActivityIndicator size="small" color="#2e7d32" />
            <ThemedText style={{ fontSize: 12, color: "#666", marginTop: 5 }}>Updating Data...</ThemedText>
          </View>
        ) : (
          <>
            {/* Transaction Summary Grid */}
            <SectionHeader title="💰 Transaction Summary" />
            <View style={styles.summaryContainer}>
              <View style={styles.orgHeader}>
                <ThemedText style={styles.orgHeaderText}>
                  Weekly Summary {selectedOrgName ? `- ${selectedOrgName}` : ''}
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

            {/* Low Stock Section - Enhanced */}
            <SectionHeader title="⚠️ Low Stock Products" />
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <ThemedText style={[styles.headerText, { flex: 2 }]}>Product Name</ThemedText>
                <ThemedText style={[styles.headerText, { flex: 1.5 }]}>Category</ThemedText>
                <ThemedText style={[styles.headerText, { flex: 1 }]}>Price</ThemedText>
                <ThemedText style={[styles.headerText, { flex: 1 }]}>Stock Qty</ThemedText>
                {/* <ThemedText style={[styles.headerText, { flex: 1 }]}>Reorder</ThemedText> */}
                <ThemedText style={[styles.headerText, { flex: 1 }]}>Status</ThemedText>
              </View>
              
              {lowStockProducts.length > 0 ? (
                lowStockProducts.map((product: any, index: number) => {
                  const isCritical = product.CurrentStock <= (product.ReorderLevel * 0.5);
                  
                  return (
                    <View key={product.ProductId || index} style={styles.tableRow}>
                      <ThemedText style={[styles.rowText, { flex: 2, fontWeight: '500' }]} numberOfLines={1}>
                        {product.ProductName || "N/A"}
                      </ThemedText>
                      <ThemedText style={[styles.rowText, { flex: 1.5 }]} numberOfLines={1}>
                        {product.Category || "General"}
                      </ThemedText>
                      <ThemedText style={[styles.rowText, { flex: 1 }]}>
                        ৳{product.UnitPrice?.toFixed(2) ?? "0.00"}
                      </ThemedText>
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <View style={[styles.stockIndicator, { 
                          backgroundColor: isCritical ? '#ffebee' : '#fff3e0',
                          borderColor: isCritical ? '#c62828' : '#ff9800'
                        }]}>
                          <ThemedText style={[styles.rowText, { 
                            color: isCritical ? '#c62828' : '#ff9800',
                            fontWeight: 'bold',
                            fontSize: 11
                          }]}>
                            {product.CurrentStock ?? 0} {product.UnitType || ''}
                          </ThemedText>
                        </View>
                      </View>
                      {/* <ThemedText style={[styles.rowText, { flex: 1 }]}>
                        {product.ReorderLevel ?? 0}
                      </ThemedText> */}
                      <View style={{ flex: 1 }}>
                        <View style={[
                           
                          product.Status === "Reorder" && styles.reorderBadge,
                          isCritical && styles.criticalBadge
                        ]}>
                          <ThemedText style={[
                            styles.statusText,
                            isCritical && styles.criticalText
                          ]}>
                            {product.Status === "Reorder" ? "⚠️ Reorder" : (product.Status || "Low Stock")}
                          </ThemedText>
                        </View>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyCard}>
                  <Ionicons name="checkmark-circle" size={40} color="#4caf50" />
                  <ThemedText style={styles.emptyText}>All products are well in stock!</ThemedText>
                  <ThemedText style={styles.emptySubText}>No items need reordering at this time</ThemedText>
                </View>
              )}
            </View>

            {/* Latest Transactions Section with View All button */}
            <View style={styles.latestSectionHeader}>
              <SectionHeader title="⏱️ Latest Transactions" />
              <TouchableOpacity onPress={navigateToSalesList} style={styles.viewAllButton}>
                <ThemedText style={styles.viewAllText}>View All</ThemedText>
                <Ionicons name="arrow-forward" size={14} color="#2e7d32" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <ThemedText style={[styles.headerText, { flex: 1.5 }]}>Product Name</ThemedText>
                <ThemedText style={[styles.headerText, { flex: 1 }]}>Category</ThemedText>
                <ThemedText style={[styles.headerText, { flex: 0.8 }]}>Price</ThemedText>
                <ThemedText style={[styles.headerText, { flex: 0.8 }]}>Quantity</ThemedText>
                <ThemedText style={[styles.headerText, { flex: 1 }]}>Total Amount</ThemedText>
                <ThemedText style={[styles.headerText, { flex: 1.2 }]}>Date</ThemedText>
              </View>
              
              {latestTransactions.length > 0 ? (
                latestTransactions.map((tx: any, index: number) => {
                  const txDate = parseTransactionDate(tx.TransactionDate);
                  const formattedDate = txDate ? txDate.toLocaleDateString('en-US') : "N/A";
                  
                  return (
                    <View key={tx.TransactionId || tx.id || index} style={styles.tableRow}>
                      <ThemedText style={[styles.rowText, { flex: 1.5 }]} numberOfLines={1}>
                        {tx.ProductName || tx.productName || "N/A"}
                      </ThemedText>
                      <ThemedText style={[styles.rowText, { flex: 1 }]} numberOfLines={1}>
                        {tx.Category || tx.category || "General"}
                      </ThemedText>
                      <ThemedText style={[styles.rowText, { flex: 0.8 }]}>
                        ৳{tx.UnitPrice?.toFixed(2) ?? tx.unitPrice?.toFixed(2) ?? "0.00"}
                      </ThemedText>
                      <ThemedText style={[styles.rowText, { flex: 0.8, fontWeight: 'bold' }]}>
                        {tx.Quantity ?? tx.quantity ?? 0}
                      </ThemedText>
                      <ThemedText style={[styles.rowText, { flex: 1, color: (tx.TotalAmount ?? tx.totalAmount ?? 0) < 0 ? "#c62828" : "#1b5e20", fontWeight: 'bold' }]}>
                        ৳{Math.abs(tx.TotalAmount ?? tx.totalAmount ?? 0).toFixed(2)}
                      </ThemedText>
                      <ThemedText style={[styles.rowText, { flex: 1.2, fontSize: 11 }]} numberOfLines={1}>
                        {formattedDate}
                      </ThemedText>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyCard}>
                  <Ionicons name="document-text" size={40} color="#999" />
                  <ThemedText style={styles.emptyText}>No transactions in the last 7 days</ThemedText>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// Sub-components
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
  
  pickerContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#c8e6c9",
    overflow: "hidden",
    elevation: 2,
    marginBottom: 10
  },
  picker: {
    height: 55,
    width: "100%",
    color: "#333",
  },
  
  sectionHeader: { marginTop: 22, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "bold", color: "#2e7d32" },
  divider: { height: 3, backgroundColor: "#81c784", width: 35, marginTop: 4, borderRadius: 2 },
  
  latestSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 22,
    marginBottom: 10,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e8f5e9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  viewAllText: {
    fontSize: 12,
    color: "#2e7d32",
    fontWeight: "500",
  },
  
  summaryContainer: { backgroundColor: "#fff", borderRadius: 15, overflow: 'hidden', elevation: 3, marginBottom: 5 },
  orgHeader: { backgroundColor: "#66bb6a", padding: 12, alignItems: 'center' },
  orgHeaderText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  statBox: { width: '33.33%', paddingVertical: 15, paddingHorizontal: 5, alignItems: 'center', borderRightWidth: 0.5, borderBottomWidth: 0.5, borderColor: '#e0e0e0' },
  statLabel: { fontSize: 10, color: '#777', textAlign: 'center', marginBottom: 4 },
  statValue: { fontSize: 13, fontWeight: 'bold' },
  
  tableContainer: { backgroundColor: "#fff", borderRadius: 15, overflow: 'hidden', elevation: 3, marginBottom: 5 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#e8f5e9', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#c8e6c9' },
  headerText: { fontSize: 11, fontWeight: 'bold', color: '#2e7d32', textAlign: 'center' },
  tableRow: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', backgroundColor: '#fff' },
  rowText: { fontSize: 11, color: '#333', textAlign: 'center' },
  
  stockIndicator: {
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'center',
  },
  
  statusBadge: { backgroundColor: '#fff3e0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'center' },
  reorderBadge: { backgroundColor: '#ffebee' },
  criticalBadge: { backgroundColor: '#ffebee', borderWidth: 1, borderColor: '#c62828' },
  statusText: { color: '#ff9800', fontSize: 10, fontWeight: 'bold', textAlign: 'center' },
  criticalText: { color: '#c62828' },
  
  emptyCard: { backgroundColor: "#fff", padding: 25, borderRadius: 12, alignItems: 'center', marginTop: 5, gap: 8 },
  emptyText: { color: "#666", textAlign: "center", fontSize: 14, fontWeight: '500' },
  emptySubText: { color: "#999", textAlign: "center", fontSize: 12 },
});