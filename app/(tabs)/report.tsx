import React, { useState, useEffect, useRef } from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  Linking,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import * as Sharing from 'expo-sharing';

interface Organization {
  OrganizationId: number;
  ApiKey: string;
  OrganizationName?: string;
}

interface UserSession {
  Success: boolean;
  Message: string;
  Token: string | null;
  UserId: string;
  UserName: string;
  RoleName: string;
  OrganizationId: number;
  OrganizationName: string;
  ApiKey: string;
  Organizations: Organization[];
}

export default function StockReportScreen() {
  // Organization States
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const [organizationName, setOrganizationName] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [orgLoading, setOrgLoading] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState("Stock Report");
  const [reportPeriod, setReportPeriod] = useState("daily");
  
  const [singleDate, setSingleDate] = useState(new Date());
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  
  const [showSinglePicker, setShowSinglePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  
  const [stockData, setStockData] = useState<any[]>([]);
  const [transactionData, setTransactionData] = useState<any[]>([]);
  const [paymentSummaryData, setPaymentSummaryData] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [apiError, setApiError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  
  const [shopName, setShopName] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [reportPeriodText, setReportPeriodText] = useState("");
  const [reportDate, setReportDate] = useState("");
  
  const searchInputRef = useRef<TextInput>(null);

  const BASE_URL = "http://devmystock.byteheart.com";
  
  // Load user session on mount
  useEffect(() => {
    loadUserSession();
  }, []);

  // Fetch data when organization changes
  useEffect(() => {
    if (organizationId && apiKey) {
      loadData();
    }
  }, [organizationId, apiKey, activeTab, reportPeriod, singleDate, startDate, endDate]);

  const loadUserSession = async () => {
    try {
      const session = await AsyncStorage.getItem("user_session");
      if (!session) {
        Alert.alert("Error", "Session not found. Please login again.");
        setOrgLoading(false);
        setLoading(false);
        return;
      }

      const userData: UserSession = JSON.parse(session);
      
      if (userData.Organizations && userData.Organizations.length > 0) {
        try {
          const headers = {
            Authorization: `Bearer ${userData.ApiKey}`,
            "Content-Type": "application/json",
          };
          const orgUrl = `http://devmystock.byteheart.com/Dashboard/GetAllOrganization?userId=${userData.UserId}`;
          const orgResponse = await fetch(orgUrl, { headers });
          const orgData = await orgResponse.json();
          
          const orgNameMap = new Map();
          if (orgData && orgData.success && Array.isArray(orgData.data)) {
            orgData.data.forEach((org: any) => {
              const id = org.organizationId || org.id;
              const name = org.organizationName || org.name;
              if (id && name) {
                orgNameMap.set(id, name);
              }
            });
          }
          
          const orgsWithNames = userData.Organizations.map(org => ({
            ...org,
            OrganizationName: orgNameMap.get(org.OrganizationId) || `Organization ${org.OrganizationId}`
          }));
          setOrganizations(orgsWithNames);
          
          const defaultOrg = orgsWithNames.find(
            org => org.OrganizationId === userData.OrganizationId
          );
          
          if (defaultOrg) {
            setOrganizationId(defaultOrg.OrganizationId);
            setOrganizationName(defaultOrg.OrganizationName || userData.OrganizationName);
            setApiKey(defaultOrg.ApiKey);
          } else {
            const firstOrg = orgsWithNames[0];
            setOrganizationId(firstOrg.OrganizationId);
            setOrganizationName(firstOrg.OrganizationName || `Organization ${firstOrg.OrganizationId}`);
            setApiKey(firstOrg.ApiKey);
          }
        } catch (error) {
          console.error("Error fetching organization names:", error);
          Alert.alert("Error", "Failed to load organization information");
          const orgsWithNames = userData.Organizations.map(org => ({
            ...org,
            OrganizationName: `Organization ${org.OrganizationId}`
          }));
          setOrganizations(orgsWithNames);
          
          const defaultOrg = orgsWithNames.find(
            org => org.OrganizationId === userData.OrganizationId
          );
          
          if (defaultOrg) {
            setOrganizationId(defaultOrg.OrganizationId);
            setOrganizationName(defaultOrg.OrganizationName);
            setApiKey(defaultOrg.ApiKey);
          }
        }
      } else {
        Alert.alert("Error", "No organizations found for this user");
        setOrgLoading(false);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error loading session:", error);
      Alert.alert("Error", "Failed to load user session");
      setOrgLoading(false);
      setLoading(false);
    } finally {
      setOrgLoading(false);
    }
  };

  const handleOrgChange = (orgId: number) => {
    if (orgId === 0) return;
    
    const selectedOrg = organizations.find(org => org.OrganizationId === orgId);
    if (selectedOrg) {
      setOrganizationId(selectedOrg.OrganizationId);
      setOrganizationName(selectedOrg.OrganizationName || `Organization ${selectedOrg.OrganizationId}`);
      setApiKey(selectedOrg.ApiKey);
      // Reset data when organization changes
      setStockData([]);
      setTransactionData([]);
      setPaymentSummaryData([]);
      setSearchQuery("");
      setShopName("");
      setShopAddress("");
    }
  };

  const getHeaders = () => ({
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  });

  const formatDateForAPI = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateForDisplay = (date: Date) => {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const convertJsonDate = (jsonDate: string): string => {
    if (!jsonDate) return "N/A";
    const match = jsonDate.match(/\/Date\((\d+)\)\//);
    if (match) {
      const date = new Date(parseInt(match[1]));
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
    return jsonDate;
  };

  const getCurrentDateRange = () => {
    if (reportPeriod === "daily") {
      const date = formatDateForAPI(singleDate);
      return { startDate: date, endDate: date };
    } else {
      return {
        startDate: formatDateForAPI(startDate),
        endDate: formatDateForAPI(endDate),
      };
    }
  };

  // Download file helper function
  const downloadAndShareFile = async (url: string, fileName: string, fileType: string) => {
    try {
      setDownloading(true);
      const { startDate, endDate } = getCurrentDateRange();
      const fullUrl = `${BASE_URL}${url}?startDate=${startDate}&endDate=${endDate}&organizationId=${organizationId}`;
      
      console.log("Downloading from:", fullUrl);
      
      const response = await fetch(fullUrl, {
        method: "GET",
        headers: getHeaders(),
      });
      
      const result = await response.json();
      console.log("Download response:", result);
      
      if (result.success && result.filePath) {
        const fileUrl = `${BASE_URL}${result.filePath}`;
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUrl, {
            mimeType: fileType === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                     fileType === 'csv' ? 'text/csv' :
                     'application/pdf',
            dialogTitle: `Save ${fileName}`,
          });
          Alert.alert("Success", `${fileName} downloaded successfully!`);
        } else {
          await Linking.openURL(fileUrl);
          Alert.alert("Success", `${fileName} is being downloaded in your browser`);
        }
      } else {
        Alert.alert("Error", result.message || "Failed to generate file");
      }
    } catch (error) {
      console.error("Download error:", error);
      Alert.alert("Error", "Failed to download file. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  // Export functions
  const exportToExcel = async () => {
    await downloadAndShareFile("/Report/ExportToExcel", "Stock_Report", "excel");
  };

  const exportSummary = async () => {
    await downloadAndShareFile("/Report/ExportSummary", "Summary_Report", "excel");
  };

  const exportToCSV = async () => {
    await downloadAndShareFile("/Report/ExportCSV", "Stock_Report", "csv");
  };

  const exportToPDF = async () => {
    await downloadAndShareFile("/Report/ExportPDF", "Stock_Report", "pdf");
  };

  // Print Report
  const printReport = async () => {
    try {
      setDownloading(true);
      const { startDate, endDate } = getCurrentDateRange();
      const fullUrl = `${BASE_URL}/Report/Print?startDate=${startDate}&endDate=${endDate}&organizationId=${organizationId}`;
      
      console.log("Printing from:", fullUrl);
      
      const response = await fetch(fullUrl, {
        method: "GET",
        headers: getHeaders(),
      });
      
      const result = await response.json();
      console.log("Print response:", result);
      
      if (result.success && result.isData && result.data) {
        const summary = result.data.Summary;
        const printData = {
          shopName: result.data.ShopName || organizationName,
          address: result.data.Address || "",
          reportPeriod: result.data.ReportPeriod,
          summary: summary
        };
        
        Alert.alert(
          "Print Report Summary",
          `Shop: ${printData.shopName}\n` +
          `Address: ${printData.address}\n` +
          `Period: ${printData.reportPeriod}\n\n` +
          `📊 SUMMARY:\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Total Sales: $${summary.TotalSales?.toFixed(2) || '0.00'}\n` +
          `Total Profit: $${summary.TotalProfit?.toFixed(2) || '0.00'}\n` +
          `Total Expense: $${summary.TotalExpense?.toFixed(2) || '0.00'}\n` +
          `Net Profit: $${summary.NetProfit?.toFixed(2) || '0.00'}\n` +
          `Total Stock Value: $${summary.TotalStockValue?.toFixed(2) || '0.00'}\n\n` +
          `📦 Products Status:\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Total Products: ${summary.TotalProducts || 0}\n` +
          `Available: ${summary.AvailableCount || 0}\n` +
          `Out of Stock: ${summary.OutOfStockCount || 0}\n` +
          `Need Reorder: ${summary.ReorderCount || 0}\n\n` +
          `💰 Payment Info:\n` +
          `━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Total Paid: $${summary.TotalPayments?.toFixed(2) || '0.00'}\n` +
          `Total Due: $${summary.TotalDue?.toFixed(2) || '0.00'}\n` +
          `Net Cash Flow: $${summary.NetCashFlow?.toFixed(2) || '0.00'}`,
          [
            { text: "Close", style: "cancel" },
            { 
              text: "Share Report", 
              onPress: () => shareReportData(printData)
            },
            { 
              text: "Open in Browser", 
              onPress: () => Linking.openURL(fullUrl)
            }
          ]
        );
      } else {
        Alert.alert("Error", "Failed to generate print report");
      }
    } catch (error) {
      console.error("Print error:", error);
      Alert.alert("Error", "Failed to print report. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  // Share report data as text
  const shareReportData = async (data: any) => {
    try {
      const reportText = `
STOCK REPORT SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SHOP INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Shop Name: ${data.shopName}
Address: ${data.address}
Report Period: ${data.reportPeriod}
Generated: ${new Date().toLocaleString()}

FINANCIAL SUMMARY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Sales: $${data.summary.TotalSales?.toFixed(2) || '0.00'}
Total Profit: $${data.summary.TotalProfit?.toFixed(2) || '0.00'}
Total Expense: $${data.summary.TotalExpense?.toFixed(2) || '0.00'}
Net Profit: $${data.summary.NetProfit?.toFixed(2) || '0.00'}
Total Stock Value: $${data.summary.TotalStockValue?.toFixed(2) || '0.00'}

PRODUCT STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Products: ${data.summary.TotalProducts || 0}
Available Products: ${data.summary.AvailableCount || 0}
Out of Stock: ${data.summary.OutOfStockCount || 0}
Need Reorder: ${data.summary.ReorderCount || 0}

PAYMENT INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total Paid: $${data.summary.TotalPayments?.toFixed(2) || '0.00'}
Total Refunds: $${data.summary.TotalRefunds?.toFixed(2) || '0.00'}
Total Due: $${data.summary.TotalDue?.toFixed(2) || '0.00'}
Net Cash Flow: $${data.summary.NetCashFlow?.toFixed(2) || '0.00'}

TRANSACTIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Paid Transactions: ${data.summary.PaidTransactions || 0}
Partial Transactions: ${data.summary.PartialTransactions || 0}
Unpaid Transactions: ${data.summary.UnpaidTransactions || 0}
Returns: ${data.summary.ReturnCount || 0}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Report Generated by Stock Management System
      `;
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(reportText, {
          mimeType: 'text/plain',
          dialogTitle: 'Share Stock Report',
        });
      } else {
        Alert.alert("Info", "Sharing is not available on this device");
      }
    } catch (error) {
      console.error("Share error:", error);
      Alert.alert("Error", "Failed to share report");
    }
  };

  const filterReport = async () => {
    try {
      let filterStartDate, filterEndDate;
      
      if (reportPeriod === "daily") {
        filterStartDate = formatDateForAPI(singleDate);
        filterEndDate = formatDateForAPI(singleDate);
      } else {
        filterStartDate = formatDateForAPI(startDate);
        filterEndDate = formatDateForAPI(endDate);
      }
      
      const response = await fetch(`${BASE_URL}/Report/FilterReport`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          StartDate: filterStartDate,
          EndDate: filterEndDate,
          OrganizationId: organizationId,
        }),
      });
      const result = await response.json();
      console.log("Filter Report Result:", result);
    } catch (error) {
      console.error("Filter error:", error);
    }
  };

  const fetchStockReport = async () => {
    try {
      setApiError(null);
      const response = await fetch(`${BASE_URL}/Report/GenerateReport?organizationId=${organizationId}`, {
        method: "GET",
        headers: getHeaders(),
      });
      
      const result = await response.json();
      
      if (result && result.data) {
        if (result.data.ShopName) setShopName(result.data.ShopName);
        if (result.data.Address) setShopAddress(result.data.Address);
        if (result.data.ReportPeriod) setReportPeriodText(result.data.ReportPeriod);
        if (result.data.ReportDate) setReportDate(convertJsonDate(result.data.ReportDate));
        
        if (result.data.Items && Array.isArray(result.data.Items)) {
          setStockData(result.data.Items);
        } else {
          setStockData([]);
        }
      } else {
        setStockData([]);
      }
    } catch (error) {
      console.error("Stock report error:", error);
      setApiError("Failed to fetch stock report");
      setStockData([]);
    }
  };

  const fetchTransactionDetails = async () => {
    try {
      let filterStartDate, filterEndDate;
      
      if (reportPeriod === "daily") {
        filterStartDate = formatDateForAPI(singleDate);
        filterEndDate = formatDateForAPI(singleDate);
      } else {
        filterStartDate = formatDateForAPI(startDate);
        filterEndDate = formatDateForAPI(endDate);
      }
      
      const response = await fetch(
        `${BASE_URL}/Report/GetTransactionDetails?startDate=${filterStartDate}&endDate=${filterEndDate}&organizationId=${organizationId}`,
        { headers: getHeaders() }
      );
      const result = await response.json();
      
      if (Array.isArray(result)) {
        setTransactionData(result);
      } else if (result && result.data && Array.isArray(result.data)) {
        setTransactionData(result.data);
      } else {
        setTransactionData([]);
      }
    } catch (error) {
      console.error("Transaction error:", error);
      setTransactionData([]);
    }
  };

  const fetchPaymentSummary = async () => {
    try {
      let filterStartDate, filterEndDate;
      
      if (reportPeriod === "daily") {
        filterStartDate = formatDateForAPI(singleDate);
        filterEndDate = formatDateForAPI(singleDate);
      } else {
        filterStartDate = formatDateForAPI(startDate);
        filterEndDate = formatDateForAPI(endDate);
      }
      
      const response = await fetch(
        `${BASE_URL}/Report/GetPaymentSummary?startDate=${filterStartDate}&endDate=${filterEndDate}&organizationId=${organizationId}`,
        { headers: getHeaders() }
      );
      const result = await response.json();
      
      if (Array.isArray(result)) {
        setPaymentSummaryData(result);
      } else if (result && result.data && Array.isArray(result.data)) {
        setPaymentSummaryData(result.data);
      } else {
        setPaymentSummaryData([]);
      }
    } catch (error) {
      console.error("Payment summary error:", error);
      setPaymentSummaryData([]);
    }
  };

  const loadData = async () => {
    if (!organizationId || !apiKey) {
      Alert.alert("Error", "Organization or API key not found");
      setLoading(false);
      return;
    }

    setLoading(true);
    await filterReport();
    
    if (activeTab === "Stock Report") {
      await fetchStockReport();
    } else if (activeTab === "Financial") {
      await fetchPaymentSummary();
    } else if (activeTab === "Transaction") {
      await fetchTransactionDetails();
    }
    
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getFilteredData = () => {
    let data: any[] = [];
    if (activeTab === "Stock Report") data = stockData;
    else if (activeTab === "Financial") data = paymentSummaryData;
    else data = transactionData;
    
    if (!searchQuery) return data;
    
    const searchLower = searchQuery.toLowerCase();
    return data.filter((item: any) => {
      return JSON.stringify(item).toLowerCase().includes(searchLower);
    });
  };

  // Table Components
  const StockFullTable = () => {
    const data = getFilteredData();
    
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={true} style={styles.tableScrollView}>
        <View>
          <View style={[styles.tableHeader, styles.border]}>
            <View style={[styles.headerCell, { width: 40 }, styles.borderRight]}><ThemedText style={styles.headerText}>SL</ThemedText></View>
            <View style={[styles.headerCell, { width: 120 }, styles.borderRight]}><ThemedText style={styles.headerText}>Product</ThemedText></View>
            <View style={[styles.headerCell, { width: 70 }, styles.borderRight]}><ThemedText style={styles.headerText}>Opening</ThemedText></View>
            <View style={[styles.headerCell, { width: 90 }, styles.borderRight]}><ThemedText style={styles.headerText}>Purchase Price</ThemedText></View>
            <View style={[styles.headerCell, { width: 90 }, styles.borderRight]}><ThemedText style={styles.headerText}>Selling Price</ThemedText></View>
            <View style={[styles.headerCell, { width: 80 }, styles.borderRight]}><ThemedText style={styles.headerText}>Profit/Unit</ThemedText></View>
            <View style={[styles.headerCell, { width: 70 }, styles.borderRight]}><ThemedText style={styles.headerText}>Profit%</ThemedText></View>
            <View style={[styles.headerCell, { width: 70 }, styles.borderRight]}><ThemedText style={styles.headerText}>Qty Sold</ThemedText></View>
            <View style={[styles.headerCell, { width: 90 }, styles.borderRight]}><ThemedText style={styles.headerText}>Sales Amount</ThemedText></View>
            <View style={[styles.headerCell, { width: 70 }, styles.borderRight]}><ThemedText style={styles.headerText}>Closing</ThemedText></View>
            <View style={[styles.headerCell, { width: 90 }, styles.borderRight]}><ThemedText style={styles.headerText}>Total Profit</ThemedText></View>
            <View style={[styles.headerCell, { width: 90 }, styles.borderRight]}><ThemedText style={styles.headerText}>Stock Value</ThemedText></View>
            <View style={[styles.headerCell, { width: 80 }]}><ThemedText style={styles.headerText}>Status</ThemedText></View>
          </View>
          
          {data.map((item, index) => (
            <View key={index} style={[styles.tableRow, styles.border, index % 2 === 0 ? styles.rowEven : styles.rowOdd]}>
              <View style={[styles.cell, { width: 40 }, styles.borderRight]}><ThemedText>{item.SL || index + 1}</ThemedText></View>
              <View style={[styles.cell, { width: 120 }, styles.borderRight]}><ThemedText numberOfLines={2}>{item.ProductName || "N/A"}</ThemedText></View>
              <View style={[styles.cell, { width: 70 }, styles.borderRight]}><ThemedText>{item.OpeningStock?.toFixed(2) || "0.00"}</ThemedText></View>
              <View style={[styles.cell, { width: 90 }, styles.borderRight]}><ThemedText>{item.UnitPrice?.toFixed(2) || "0.00"}</ThemedText></View>
              <View style={[styles.cell, { width: 90 }, styles.borderRight]}><ThemedText>{item.SalesValue?.toFixed(2) || "0.00"}</ThemedText></View>
              <View style={[styles.cell, { width: 80 }, styles.borderRight]}><ThemedText>{item.Profit?.toFixed(2) || "0.00"}</ThemedText></View>
              <View style={[styles.cell, { width: 70 }, styles.borderRight]}><ThemedText>{item.ProfitPercentage?.toFixed(2) || "0"}%</ThemedText></View>
              <View style={[styles.cell, { width: 70 }, styles.borderRight]}><ThemedText>{item.QtySold?.toFixed(2) || "0.00"}</ThemedText></View>
              <View style={[styles.cell, { width: 90 }, styles.borderRight]}><ThemedText>{item.SoldAmount?.toFixed(2) || "0.00"}</ThemedText></View>
              <View style={[styles.cell, { width: 70 }, styles.borderRight]}><ThemedText>{item.ClosingStock?.toFixed(2) || "0.00"}</ThemedText></View>
              <View style={[styles.cell, { width: 90 }, styles.borderRight]}><ThemedText>{item.TotalProfit?.toFixed(2) || "0.00"}</ThemedText></View>
              <View style={[styles.cell, { width: 90 }, styles.borderRight]}><ThemedText style={{ fontWeight: 'bold', color: '#007bff' }}>{item.StockValue?.toFixed(2) || "0.00"}</ThemedText></View>
              <View style={[styles.cell, { width: 80 }]}>
                <View style={[styles.statusBadge, { backgroundColor: item.Status === "Available" ? "#e8f5e9" : "#fff3e0" }]}>
                  <ThemedText style={[styles.statusText, { color: item.Status === "Available" ? "#2e7d32" : "#ef6c00" }]}>
                    {item.Status || "N/A"}
                  </ThemedText>
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderTable = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0056b3" />
          <ThemedText style={styles.loadingText}>Loading data...</ThemedText>
        </View>
      );
    }
    
    return <StockFullTable />;
  };

  if (orgLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#0056b3" />
        <ThemedText style={{ marginTop: 10, color: '#666' }}>Loading...</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {downloading && (
        <View style={styles.downloadOverlay}>
          <ActivityIndicator size="large" color="#0056b3" />
          <ThemedText style={styles.downloadText}>Processing...</ThemedText>
        </View>
      )}
      
      <ScrollView
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#0056b3"]} />}
        keyboardShouldPersistTaps="handled"
      >
        {/* Blue Header */}
        <View style={styles.blueHeader}>
          <View style={styles.headerTitleRow}>
            <MaterialCommunityIcons name="chart-bar" size={24} color="white" />
            <ThemedText style={styles.headerTitleText}>Stock Report</ThemedText>
          </View>
          {organizationName ? (
            <ThemedText style={styles.headerSubText}>{organizationName}</ThemedText>
          ) : null}
        </View>

        {/* Organization Selector */}
        {organizations.length > 0 && (
          <View style={styles.orgCard}>
            <View style={styles.orgHeader}>
              <Ionicons name="business" size={18} color="#0056b3" />
              <ThemedText style={styles.orgTitle}>Organization</ThemedText>
            </View>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={organizationId || 0}
                onValueChange={handleOrgChange}
                style={styles.picker}
              >
                {/* <Picker.Item label="-- Select Organization --" value={0} /> */}
                {organizations.map((org) => (
                  <Picker.Item
                    key={org.OrganizationId}
                    label={org.OrganizationName || `Organization ${org.OrganizationId}`}
                    value={org.OrganizationId}
                  />
                ))}
              </Picker>
            </View>
            {/* {organizationName ? (
              <ThemedText style={styles.selectedOrgText}>
                Selected: {organizationName}
              </ThemedText>
            ) : null} */}
          </View>
        )}

        {/* Filter Card */}
        <View style={styles.filterCard}>
          <ThemedText style={styles.filterLabel}>Select Report Period</ThemedText>
          <View style={styles.periodBtnRow}>
            <TouchableOpacity
              style={[styles.periodBtn, reportPeriod === "daily" && styles.periodBtnActive]}
              onPress={() => setReportPeriod("daily")}
            >
              <ThemedText style={[styles.periodBtnText, reportPeriod === "daily" && styles.periodBtnTextActive]}>
                Daily Report
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodBtn, reportPeriod === "range" && styles.periodBtnActive]}
              onPress={() => setReportPeriod("range")}
            >
              <ThemedText style={[styles.periodBtnText, reportPeriod === "range" && styles.periodBtnTextActive]}>
                Date Range Report
              </ThemedText>
            </TouchableOpacity>
          </View>

          {reportPeriod === "daily" ? (
            <TouchableOpacity style={styles.dateSelector} onPress={() => setShowSinglePicker(true)}>
              <Ionicons name="calendar-outline" size={18} color="#666" />
              <ThemedText style={styles.dateText}>{formatDateForDisplay(singleDate)}</ThemedText>
            </TouchableOpacity>
          ) : (
            <View style={styles.dateRangeContainer}>
              <TouchableOpacity style={styles.dateSelector} onPress={() => setShowStartPicker(true)}>
                <Ionicons name="calendar-outline" size={18} color="#666" />
                <ThemedText style={styles.dateText}>Start: {formatDateForDisplay(startDate)}</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.dateSelector} onPress={() => setShowEndPicker(true)}>
                <Ionicons name="calendar-outline" size={18} color="#666" />
                <ThemedText style={styles.dateText}>End: {formatDateForDisplay(endDate)}</ThemedText>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.generateBtn} onPress={loadData}>
            <Ionicons name="refresh" size={18} color="white" />
            <ThemedText style={styles.generateBtnText}>Generate Report</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Export Buttons */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.exportRow}>
          <TouchableOpacity style={[styles.exportBtn, { backgroundColor: "#28a745" }]} onPress={exportToExcel}>
            <FontAwesome5 name="file-excel" size={14} color="white" />
            <ThemedText style={styles.exportBtnText}>Excel</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.exportBtn, { backgroundColor: "#28a745" }]} onPress={exportSummary}>
            <FontAwesome5 name="file-excel" size={14} color="white" />
            <ThemedText style={styles.exportBtnText}>Summary</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.exportBtn, { backgroundColor: "#ffc107" }]} onPress={exportToCSV}>
            <FontAwesome5 name="file-csv" size={14} color="white" />
            <ThemedText style={styles.exportBtnText}>CSV</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.exportBtn, { backgroundColor: "#dc3545" }]} onPress={exportToPDF}>
            <FontAwesome5 name="file-pdf" size={14} color="white" />
            <ThemedText style={styles.exportBtnText}>PDF</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.exportBtn, { backgroundColor: "#17a2b8" }]} onPress={printReport}>
            <FontAwesome5 name="print" size={14} color="white" />
            <ThemedText style={styles.exportBtnText}>Print</ThemedText>
          </TouchableOpacity>
        </ScrollView>

        {/* Org Info */}
        {/* <View style={styles.orgInfo}>
          <ThemedText style={styles.orgName}>{shopName || organizationName}</ThemedText>
          <ThemedText style={styles.orgAddress}>{shopAddress}</ThemedText>
          {reportPeriodText && <ThemedText style={styles.reportPeriod}>{reportPeriodText}</ThemedText>}
          <View style={styles.reportTitleBadge}>
            <ThemedText style={styles.reportTitleText}>{activeTab.toUpperCase()}</ThemedText>
          </View>
        </View> */}

        {/* Search Box */}
        <View style={styles.searchBox}>
          <Ionicons name="search" size={18} color="#999" />
          <TextInput
            ref={searchInputRef}
            style={styles.searchInput}
            placeholder="Search..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {apiError && (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>Error: {apiError}</ThemedText>
          </View>
        )}

        {/* Table */}
        {renderTable()}
      </ScrollView>

      {/* Date Pickers */}
      {showSinglePicker && (
        <DateTimePicker
          value={singleDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowSinglePicker(false);
            if (selectedDate) setSingleDate(selectedDate);
          }}
        />
      )}
      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowStartPicker(false);
            if (selectedDate) setStartDate(selectedDate);
          }}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowEndPicker(false);
            if (selectedDate) setEndDate(selectedDate);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f2f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  
  // Blue Header
  blueHeader: { 
    backgroundColor: "#0056b3", 
    padding: 20, 
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    margin: 10,
    marginBottom: 5,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitleText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  headerSubText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 5 },

  // Organization Card
  orgCard: {
    backgroundColor: 'white',
    marginLeft: 15,
    marginRight: 15,
    marginTop: -10,
    borderRadius: 15,
    padding: 15,
    elevation: 3,
  },
  orgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  orgTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  selectedOrgText: {
    fontSize: 12,
    color: '#0056b3',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: 'bold',
  },

  filterCard: { 
    backgroundColor: 'white', 
    margin: 15, 
    borderRadius: 15, 
    padding: 15, 
    elevation: 3,
    marginTop: 15,
  },
  filterLabel: { fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
  periodBtnRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#007bff', alignItems: 'center' },
  periodBtnActive: { backgroundColor: '#007bff' },
  periodBtnText: { color: '#007bff', fontSize: 12 },
  periodBtnTextActive: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  dateRangeContainer: { gap: 10 },
  dateText: { marginLeft: 10, color: '#333' },
  generateBtn: { backgroundColor: '#0056b3', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 8, marginTop: 15 },
  generateBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 8 },
  exportRow: { paddingHorizontal: 15, marginBottom: 15, flexDirection: 'row' },
  exportBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6, marginRight: 8 },
  exportBtnText: { color: 'white', marginLeft: 6, fontSize: 12, fontWeight: 'bold' },
  orgInfo: { alignItems: 'center', marginBottom: 15 },
  orgName: { fontSize: 18, fontWeight: 'bold', color: '#0056b3' },
  orgAddress: { fontSize: 12, color: '#666' },
  reportPeriod: { fontSize: 11, color: '#666', marginTop: 2, fontStyle: 'italic' },
  reportTitleBadge: { backgroundColor: '#eef2f7', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20, marginTop: 8 },
  reportTitleText: { fontSize: 11, fontWeight: 'bold', color: '#333' },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', marginHorizontal: 15, paddingHorizontal: 12, borderRadius: 10, height: 45, marginBottom: 15, borderWidth: 1, borderColor: '#eee' },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, padding: 0 },
  tableScrollView: { marginHorizontal: 15, marginBottom: 10 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#0056b3', paddingVertical: 12, paddingHorizontal: 0, borderRadius: 8, marginBottom: 2 },
  headerCell: { paddingHorizontal: 8, justifyContent: 'center', alignItems: 'center' },
  headerText: { color: 'white', fontSize: 11, fontWeight: 'bold', textAlign: 'center' },
  tableRow: { flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 0, borderRadius: 8, marginBottom: 2 },
  rowEven: { backgroundColor: 'white' },
  rowOdd: { backgroundColor: '#f8f9fa' },
  cell: { paddingHorizontal: 8, justifyContent: 'center' },
  border: { borderWidth: 1, borderColor: '#ddd' },
  borderRight: { borderRightWidth: 1, borderRightColor: '#ddd' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, alignSelf: 'center' },
  statusText: { fontSize: 9, fontWeight: 'bold' },
  loadingContainer: { padding: 40, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666' },
  errorContainer: { backgroundColor: '#ffebee', padding: 10, margin: 15, borderRadius: 8 },
  errorText: { color: '#c62828', fontSize: 12 },
  downloadOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
  downloadText: { color: 'white', marginTop: 10, fontSize: 16 },
});