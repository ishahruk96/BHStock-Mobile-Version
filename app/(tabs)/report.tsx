import { ThemedText } from "@/components/themed-text";
import {
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const API_KEY = "3A734AC6-A521-4192-984D-08D082B83456";
const BASE_URL = "http://devmystock.byteheart.com";

interface StockReportItem {
  SL: number;
  Category: string;
  ProductName: string;
  OpeningStock: number;
  UnitPrice: number;
  SalesValue: number;
  Profit: number;
  ProfitPercentage: number;
  QtySold: number;
  SoldAmount: number;
  ClosingStock: number;
  TotalProfit: number;
  DailyExpense: number;
  StockValue: number;
  Status: string;
  ProductId: number;
}

interface TransactionDetail {
  TransactionId: number;
  TransactionNumber: string;
  TransactionType: string;
  TransactionDate: string;
  ProductName: string | null;
  Quantity: number;
  Amount: number;
  DueAmount: number | null;
  PaymentStatus: string;
  CustomerName: string;
  EntryType: string;
}

interface PaymentSummary {
  TransactionNumber: string;
  TransactionDate: string;
  CustomerName: string;
  TotalSale: number;
  TotalPaid: number;
  TotalRefund: number;
  TotalDue: number;
  PaymentStatus: string;
}

export default function StockReportScreen() {
  const [activeTab, setActiveTab] = useState("Stock Report");
  const [reportPeriod, setReportPeriod] = useState("daily"); // daily or range

  // Date states
  const [singleDate, setSingleDate] = useState(new Date());
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  // Picker states
  const [showSinglePicker, setShowSinglePicker] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Data states
  const [stockData, setStockData] = useState<StockReportItem[]>([]);
  const [transactionData, setTransactionData] = useState<TransactionDetail[]>(
    [],
  );
  const [paymentSummaryData, setPaymentSummaryData] = useState<
    PaymentSummary[]
  >([]);

  // UI states
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Format date for API (yyyy-mm-dd)
  const formatDateForAPI = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Format date for display (dd/mm/yyyy)
  const formatDateForDisplay = (date: Date) => {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Convert JSON date to readable format
  const convertJsonDate = (jsonDate: string): string => {
    if (!jsonDate) return "N/A";
    const match = jsonDate.match(/\/Date\((\d+)\)\//);
    if (match) {
      const date = new Date(parseInt(match[1]));
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    }
    return jsonDate;
  };

  // Fetch Stock Report with date filter
  const fetchStockReport = async () => {
    try {
      let filterStartDate, filterEndDate;

      if (reportPeriod === "daily") {
        filterStartDate = formatDateForAPI(singleDate);
        filterEndDate = formatDateForAPI(singleDate);
      } else {
        filterStartDate = formatDateForAPI(startDate);
        filterEndDate = formatDateForAPI(endDate);
      }

      const response = await fetch(`${BASE_URL}/Report/GenerateReport`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: API_KEY,
        },
        body: JSON.stringify({
          StartDate: filterStartDate,
          EndDate: filterEndDate,
        }),
      });
      const result = await response.json();
      console.log("Stock report response:", result);

      if (Array.isArray(result)) {
        setStockData(result);
      } else if (result && result.data && Array.isArray(result.data)) {
        setStockData(result.data);
      } else {
        setStockData([]);
      }
    } catch (error) {
      console.error("Stock report error:", error);
      setStockData([]);
    }
  };

  // Fetch Transaction Details with date filter
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

      const url = `${BASE_URL}/Report/GetTransactionDetails?startDate=${filterStartDate}&endDate=${filterEndDate}`;
      console.log("Transaction URL:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: { apikey: API_KEY },
      });
      const result = await response.json();
      console.log("Transaction response:", result);

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

  // Fetch Payment Summary with date filter
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

      const url = `${BASE_URL}/Report/GetPaymentSummary?startDate=${filterStartDate}&endDate=${filterEndDate}`;
      console.log("Payment summary URL:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: { apikey: API_KEY },
      });
      const result = await response.json();
      console.log("Payment summary response:", result);

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
    setLoading(true);

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

  useEffect(() => {
    loadData();
  }, [activeTab, reportPeriod, singleDate, startDate, endDate]);

  const getCurrentData = () => {
    if (activeTab === "Stock Report") return stockData;
    if (activeTab === "Financial") return paymentSummaryData;
    return transactionData;
  };

  const getFilteredData = () => {
    const data = getCurrentData();
    if (!searchQuery) return data;

    const searchLower = searchQuery.toLowerCase();
    return data.filter((item: any) => {
      return JSON.stringify(item).toLowerCase().includes(searchLower);
    });
  };

  // Render Stock Item
  const renderStockItem = ({ item }: { item: StockReportItem }) => (
    <View style={styles.stockCard}>
      <View style={styles.cardHeader}>
        <View>
          <ThemedText style={styles.categoryBadgeText}>
            {item.Category}
          </ThemedText>
          <ThemedText style={styles.productName}>{item.ProductName}</ThemedText>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.Status === "Available" ? "#e8f5e9" : "#fff3e0",
            },
          ]}
        >
          <ThemedText
            style={[
              styles.statusText,
              { color: item.Status === "Available" ? "#2e7d32" : "#ef6c00" },
            ]}
          >
            {item.Status}
          </ThemedText>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={styles.dataGrid}>
          <DataPoint label="SL" value={item.SL?.toString()} />
          <DataPoint label="Product" value={item.ProductName} />
          <DataPoint label="Opening" value={item.OpeningStock?.toFixed(2)} />
          <DataPoint
            label="Purchase Price"
            value={`৳${item.UnitPrice?.toFixed(2)}`}
          />
          <DataPoint
            label="Selling Price"
            value={`৳${item.SalesValue?.toFixed(2)}`}
          />
          <DataPoint
            label="Profit/Unit"
            value={`৳${item.Profit?.toFixed(2)}`}
          />
          <DataPoint
            label="Profit %"
            value={`${item.ProfitPercentage?.toFixed(2)}%`}
          />
          <DataPoint label="Qty Sold" value={item.QtySold?.toFixed(2)} />
          <DataPoint
            label="Sales Amount"
            value={`৳${item.SoldAmount?.toFixed(2)}`}
          />
          <DataPoint label="Closing" value={item.ClosingStock?.toFixed(2)} />
          <DataPoint
            label="Total Profit"
            value={`৳${item.TotalProfit?.toFixed(2)}`}
          />
          <DataPoint
            label="Stock Value"
            value={`৳${item.StockValue?.toFixed(2)}`}
          />
          <DataPoint
            label="Daily Expense"
            value={`৳${item.DailyExpense?.toFixed(2)}`}
          />
        </View>
      </ScrollView>
    </View>
  );

  // Render Transaction Item
  const renderTransactionItem = ({ item }: { item: TransactionDetail }) => (
    <View style={styles.stockCard}>
      <View style={styles.cardHeader}>
        <View>
          <ThemedText style={styles.transactionNumber}>
            {item.TransactionNumber}
          </ThemedText>
          <ThemedText style={styles.transactionType}>
            {item.TransactionType}
          </ThemedText>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.PaymentStatus === "Paid" ? "#e8f5e9" : "#fff3e0",
            },
          ]}
        >
          <ThemedText
            style={[
              styles.statusText,
              { color: item.PaymentStatus === "Paid" ? "#2e7d32" : "#ef6c00" },
            ]}
          >
            {item.PaymentStatus}
          </ThemedText>
        </View>
      </View>

      <View style={styles.transactionGrid}>
        <View style={styles.transactionRow}>
          <ThemedText style={styles.transactionLabel}>Date & Time:</ThemedText>
          <ThemedText style={styles.transactionValue}>
            {convertJsonDate(item.TransactionDate)}
          </ThemedText>
        </View>
        <View style={styles.transactionRow}>
          <ThemedText style={styles.transactionLabel}>
            Transaction #:
          </ThemedText>
          <ThemedText style={styles.transactionValue}>
            {item.TransactionNumber}
          </ThemedText>
        </View>
        <View style={styles.transactionRow}>
          <ThemedText style={styles.transactionLabel}>Type:</ThemedText>
          <ThemedText style={styles.transactionValue}>
            {item.TransactionType} ({item.EntryType})
          </ThemedText>
        </View>
        <View style={styles.transactionRow}>
          <ThemedText style={styles.transactionLabel}>Product:</ThemedText>
          <ThemedText style={styles.transactionValue}>
            {item.ProductName || "N/A"}
          </ThemedText>
        </View>
        <View style={styles.transactionRow}>
          <ThemedText style={styles.transactionLabel}>Qty:</ThemedText>
          <ThemedText style={styles.transactionValue}>
            {item.Quantity?.toFixed(2)}
          </ThemedText>
        </View>
        <View style={styles.transactionRow}>
          <ThemedText style={styles.transactionLabel}>Amount:</ThemedText>
          <ThemedText style={styles.transactionValue}>
            ৳{item.Amount?.toFixed(2)}
          </ThemedText>
        </View>
        <View style={styles.transactionRow}>
          <ThemedText style={styles.transactionLabel}>Due:</ThemedText>
          <ThemedText style={styles.transactionValue}>
            ৳{item.DueAmount?.toFixed(2) || "0.00"}
          </ThemedText>
        </View>
        <View style={styles.transactionRow}>
          <ThemedText style={styles.transactionLabel}>Customer:</ThemedText>
          <ThemedText style={styles.transactionValue}>
            {item.CustomerName}
          </ThemedText>
        </View>
      </View>
    </View>
  );

  // Render Payment Summary Item
  const renderPaymentSummaryItem = ({ item }: { item: PaymentSummary }) => (
    <View style={styles.stockCard}>
      <View style={styles.cardHeader}>
        <View>
          <ThemedText style={styles.transactionNumber}>
            {item.TransactionNumber}
          </ThemedText>
          <ThemedText style={styles.customerName}>
            {item.CustomerName}
          </ThemedText>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                item.PaymentStatus === "Paid" ? "#e8f5e9" : "#fff3e0",
            },
          ]}
        >
          <ThemedText
            style={[
              styles.statusText,
              { color: item.PaymentStatus === "Paid" ? "#2e7d32" : "#ef6c00" },
            ]}
          >
            {item.PaymentStatus}
          </ThemedText>
        </View>
      </View>

      <View style={styles.transactionGrid}>
        <View style={styles.transactionRow}>
          <ThemedText style={styles.transactionLabel}>Date & Time:</ThemedText>
          <ThemedText style={styles.transactionValue}>
            {convertJsonDate(item.TransactionDate)}
          </ThemedText>
        </View>
        <View style={styles.transactionRow}>
          <ThemedText style={styles.transactionLabel}>
            Transaction #:
          </ThemedText>
          <ThemedText style={styles.transactionValue}>
            {item.TransactionNumber}
          </ThemedText>
        </View>
        <View style={styles.transactionRow}>
          <ThemedText style={styles.transactionLabel}>Customer:</ThemedText>
          <ThemedText style={styles.transactionValue}>
            {item.CustomerName}
          </ThemedText>
        </View>
        <View style={styles.transactionRow}>
          <ThemedText style={styles.transactionLabel}>Total Sale:</ThemedText>
          <ThemedText style={styles.transactionValue}>
            ৳{item.TotalSale?.toFixed(2)}
          </ThemedText>
        </View>
        <View style={styles.transactionRow}>
          <ThemedText style={styles.transactionLabel}>Total Paid:</ThemedText>
          <ThemedText style={styles.transactionValue}>
            ৳{item.TotalPaid?.toFixed(2)}
          </ThemedText>
        </View>
        <View style={styles.transactionRow}>
          <ThemedText style={styles.transactionLabel}>Total Refund:</ThemedText>
          <ThemedText style={styles.transactionValue}>
            ৳{item.TotalRefund?.toFixed(2)}
          </ThemedText>
        </View>
        <View style={styles.transactionRow}>
          <ThemedText style={styles.transactionLabel}>Due:</ThemedText>
          <ThemedText
            style={[
              styles.transactionValue,
              { color: item.TotalDue > 0 ? "#dc3545" : "#28a745" },
            ]}
          >
            ৳{item.TotalDue?.toFixed(2)}
          </ThemedText>
        </View>
      </View>
    </View>
  );

  const HeaderComponent = () => (
    <>
      <View style={styles.blueHeader}>
        <View style={styles.headerTitleRow}>
          <MaterialCommunityIcons name="chart-bar" size={24} color="white" />
          <ThemedText style={styles.headerTitleText}>Stock Report</ThemedText>
        </View>
        <ThemedText style={styles.headerSubText}>
          Generate stock reports by date or range
        </ThemedText>
      </View>

      <View style={styles.filterCard}>
        <ThemedText style={styles.filterLabel}>Select Report Period</ThemedText>
        <View style={styles.periodBtnRow}>
          <TouchableOpacity
            style={[
              styles.periodBtn,
              reportPeriod === "daily" && styles.periodBtnActive,
            ]}
            onPress={() => setReportPeriod("daily")}
          >
            <ThemedText
              style={[
                styles.periodBtnText,
                reportPeriod === "daily" && styles.periodBtnTextActive,
              ]}
            >
              Daily Report
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.periodBtn,
              reportPeriod === "range" && styles.periodBtnActive,
            ]}
            onPress={() => setReportPeriod("range")}
          >
            <ThemedText
              style={[
                styles.periodBtnText,
                reportPeriod === "range" && styles.periodBtnTextActive,
              ]}
            >
              Date Range Report
            </ThemedText>
          </TouchableOpacity>
        </View>

        {reportPeriod === "daily" ? (
          <TouchableOpacity
            style={styles.dateSelector}
            onPress={() => setShowSinglePicker(true)}
          >
            <Ionicons name="calendar-outline" size={18} color="#666" />
            <ThemedText style={styles.dateText}>
              {formatDateForDisplay(singleDate)}
            </ThemedText>
          </TouchableOpacity>
        ) : (
          <View style={styles.dateRangeContainer}>
            <TouchableOpacity
              style={styles.dateSelector}
              onPress={() => setShowStartPicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color="#666" />
              <ThemedText style={styles.dateText}>
                Start: {formatDateForDisplay(startDate)}
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.dateSelector}
              onPress={() => setShowEndPicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color="#666" />
              <ThemedText style={styles.dateText}>
                End: {formatDateForDisplay(endDate)}
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={styles.generateBtn} onPress={loadData}>
          <Ionicons name="refresh" size={18} color="white" />
          <ThemedText style={styles.generateBtnText}>
            Generate Report
          </ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.exportRow}
      >
        <ExportBtn icon="file-excel" color="#28a745" label="Excel" />
        <ExportBtn icon="file-csv" color="#ffc107" label="CSV" />
        <ExportBtn icon="file-pdf" color="#dc3545" label="PDF" />
        <ExportBtn icon="print" color="#6c757d" label="Print" />
      </ScrollView>

      <View style={styles.orgInfo}>
        <View style={styles.reportTitleBadge}>
          <ThemedText style={styles.reportTitleText}>
            {activeTab.toUpperCase()} REPORT (
            {reportPeriod === "daily"
              ? formatDateForDisplay(singleDate)
              : `${formatDateForDisplay(startDate)} - ${formatDateForDisplay(endDate)}`}
            )
          </ThemedText>
        </View>
      </View>

      <View style={styles.tabRow}>
        {["Stock Report", "Financial", "Transaction"].map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
          >
            <ThemedText
              style={[
                styles.tabText,
                activeTab === tab && styles.tabTextActive,
              ]}
            >
              {tab}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search product / category..."
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={getFilteredData()}
        renderItem={({ item }) => {
          if (activeTab === "Stock Report") {
            return renderStockItem({ item: item as StockReportItem });
          } else if (activeTab === "Financial") {
            return renderPaymentSummaryItem({ item: item as PaymentSummary });
          } else {
            return renderTransactionItem({ item: item as TransactionDetail });
          }
        }}
        keyExtractor={(item: any, index: number) => {
          if (item?.TransactionId) return `txn-${item.TransactionId}`;
          if (item?.SL) return `stock-${item.SL}`;
          if (item?.TransactionNumber)
            return `summary-${item.TransactionNumber}`;
          return `item-${index}`;
        }}
        ListHeaderComponent={HeaderComponent}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyContainer}>
              <ActivityIndicator size="large" color="#0056b3" />
              <ThemedText style={styles.emptyText}>Loading...</ThemedText>
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="document-text-outline" size={48} color="#ccc" />
              <ThemedText style={styles.emptyText}>No data found</ThemedText>
              <ThemedText style={styles.emptySubText}>
                Tap Generate Report to load data
              </ThemedText>
            </View>
          )
        }
        contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#0056b3"]}
          />
        }
      />

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

const DataPoint = ({ label, value, isBold }: any) => (
  <View style={styles.dataPoint}>
    <ThemedText style={styles.dataLabel}>{label}</ThemedText>
    <ThemedText
      style={[
        styles.dataValue,
        isBold && { fontWeight: "bold", color: "#007bff" },
      ]}
    >
      {value || "N/A"}
    </ThemedText>
  </View>
);

const ExportBtn = ({ icon, color, label }: any) => (
  <TouchableOpacity style={[styles.exportBtn, { backgroundColor: color }]}>
    <FontAwesome5 name={icon} size={14} color="white" />
    <ThemedText style={styles.exportBtnText}>{label}</ThemedText>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f2f5" },
  blueHeader: {
    backgroundColor: "#0056b3",
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitleText: { color: "white", fontSize: 20, fontWeight: "bold" },
  headerSubText: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 5 },

  filterCard: {
    backgroundColor: "white",
    margin: 15,
    borderRadius: 15,
    padding: 15,
    elevation: 3,
    marginTop: -20,
  },
  filterLabel: { fontSize: 14, fontWeight: "bold", marginBottom: 10 },
  periodBtnRow: { flexDirection: "row", gap: 10, marginBottom: 15 },
  periodBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#007bff",
    alignItems: "center",
  },
  periodBtnActive: { backgroundColor: "#007bff" },
  periodBtnText: { color: "#007bff", fontSize: 12 },
  periodBtnTextActive: { color: "white", fontSize: 12, fontWeight: "bold" },

  dateSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  dateRangeContainer: { gap: 10 },
  dateText: { marginLeft: 10, color: "#333" },

  generateBtn: {
    backgroundColor: "#0056b3",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    marginTop: 15,
  },
  generateBtnText: { color: "white", fontWeight: "bold", marginLeft: 8 },

  exportRow: { paddingHorizontal: 15, marginBottom: 15 },
  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  exportBtnText: {
    color: "white",
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "bold",
  },

  orgInfo: { alignItems: "center", marginBottom: 15 },
  orgName: { fontSize: 18, fontWeight: "bold", color: "#0056b3" },
  orgAddress: { fontSize: 12, color: "#666" },
  reportTitleBadge: {
    backgroundColor: "#eef2f7",
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 8,
  },
  reportTitleText: { fontSize: 11, fontWeight: "bold", color: "#333" },

  tabRow: {
    flexDirection: "row",
    backgroundColor: "white",
    padding: 5,
    marginHorizontal: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  tabItemActive: { backgroundColor: "#007bff" },
  tabText: { fontSize: 12, color: "#666" },
  tabTextActive: { color: "white", fontWeight: "bold" },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    marginHorizontal: 15,
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 45,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#eee",
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },

  stockCard: {
    backgroundColor: "white",
    marginHorizontal: 15,
    marginBottom: 12,
    borderRadius: 12,
    padding: 15,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 15,
  },
  categoryBadgeText: {
    fontSize: 10,
    color: "#007bff",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  productName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginTop: 2,
  },
  transactionNumber: { fontSize: 15, fontWeight: "bold", color: "#333" },
  transactionType: { fontSize: 11, color: "#666", marginTop: 2 },
  customerName: { fontSize: 13, color: "#555", marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: "bold" },

  dataGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingBottom: 5,
  },
  dataPoint: { width: 100, marginBottom: 5 },
  dataLabel: { fontSize: 10, color: "#888" },
  dataValue: { fontSize: 12, color: "#333", marginTop: 2 },

  transactionGrid: { gap: 8 },
  transactionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  transactionLabel: { fontSize: 12, color: "#666", flex: 1 },
  transactionValue: {
    fontSize: 12,
    color: "#333",
    flex: 2,
    textAlign: "right",
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: { fontSize: 16, color: "#666", marginTop: 10 },
  emptySubText: { fontSize: 12, color: "#999", marginTop: 5 },
});
