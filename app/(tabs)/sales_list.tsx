import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Dimensions,
  Alert,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import DateTimePicker from "@react-native-community/datetimepicker";

const { width, height } = Dimensions.get("window");

// API Configuration
const API_KEY = "3A734AC6-A521-4192-984D-08D082B83456";
const API_URL = "http://devmystock.byteheart.com/Stock/GetTransactionsFilter";

// Transaction interface
interface Transaction {
  TransactionId: number;
  ProductId: number;
  TransactionType: string;
  Quantity: number;
  UnitPrice: number;
  TotalAmount: number;
  TransactionDate: string;
  Remarks: string;
  DailyExpense: number;
  CreatedBy: string;
  TransactionNumber: string;
  ProductName: string;
  Category: string;
  SalesValue: number;
  ProfitPerUnit: number;
  CurrentStock: number | null;
  PaymentStatus: string;
  OrganizationId: number;
  IsProcessed: boolean;
  EntryType: string | null;
  Amount: number;
  DueAmount: number | null;
  PaymentAmount: number;
  PaymentMethod: string | null;
  PaymentReference: string | null;
  RefTxnNumber: string | null;
  IsExchangeRelated: boolean;
  CustomerId: number;
  CustomerName: string;
  CustomerPhone: string;
  DisplayQuantity: number;
  DisplayAmount: number;
  DisplayStatus: string | null;
  IsValidSale: boolean;
  IsAvailableForExchange: boolean;
}

// Format date
const formatDate = (dateString: string): string => {
  try {
    if (!dateString) return "N/A";
    const match = dateString.match(/\/Date\((\d+)\)\//);
    if (match) {
      const timestamp = parseInt(match[1]);
      const date = new Date(timestamp);
      return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }) + " " + date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    }
    return dateString;
  } catch {
    return dateString;
  }
};

// Format date for display
const formatDateForPicker = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

// Parse date string to Date object
const parseDateString = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1;
    const year = parseInt(parts[2]);
    return new Date(year, month, day);
  }
  return null;
};

// Helper function to get today's date at start of day
const getStartOfToday = (): Date => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

// Helper function to check if a transaction is from today
const isToday = (transactionDate: string): boolean => {
  const parsedDate = parseDateFromJson(transactionDate);
  if (!parsedDate) return false;
  
  const today = getStartOfToday();
  const transactionDay = new Date(parsedDate);
  transactionDay.setHours(0, 0, 0, 0);
  
  return transactionDay.getTime() === today.getTime();
};

// Parse date from JSON format
const parseDateFromJson = (dateString: string): Date | null => {
  try {
    if (!dateString) return null;
    const match = dateString.match(/\/Date\((\d+)\)\//);
    if (match) {
      const timestamp = parseInt(match[1]);
      return new Date(timestamp);
    }
    return new Date(dateString);
  } catch {
    return null;
  }
};

// Get date range based on preset
const getDateRange = (preset: string): { start: Date; end: Date } => {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  
  switch(preset) {
    case "7days":
      start.setDate(start.getDate() - 6);
      break;
    case "15days":
      start.setDate(start.getDate() - 14);
      break;
    case "30days":
      start.setDate(start.getDate() - 29);
      break;
    case "3months":
      start.setMonth(start.getMonth() - 3);
      break;
    default:
      return { start, end };
  }
  
  return { start, end };
};

export default function SalesListScreen() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [originalTransactions, setOriginalTransactions] = useState<
    Transaction[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Filter states (temporary for modal - no reload on change)
  const [tempSearchText, setTempSearchText] = useState("");
  const [tempSelectedCategory, setTempSelectedCategory] = useState("");
  const [tempSelectedStatus, setTempSelectedStatus] = useState("");
  const [tempStartDate, setTempStartDate] = useState("");
  const [tempEndDate, setTempEndDate] = useState("");
  const [tempDatePreset, setTempDatePreset] = useState("");

  // Applied filter states (only updates when Apply is clicked)
  const [appliedSearchText, setAppliedSearchText] = useState("");
  const [appliedSelectedCategory, setAppliedSelectedCategory] = useState("");
  const [appliedSelectedStatus, setAppliedSelectedStatus] = useState("");
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");
  const [appliedShowAllHistory, setAppliedShowAllHistory] = useState(false);

  const [categories, setCategories] = useState<string[]>([]);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Summary States
  const [summary, setSummary] = useState({
    totalTxn: 0,
    totalQty: 0,
    totalAmount: 0,
    totalProfit: 0,
    totalDue: 0,
    avgProfitMargin: 0,
  });

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Apply filters only when applied states change
  useEffect(() => {
    applyFilters();
  }, [
    appliedSearchText,
    appliedSelectedCategory,
    appliedSelectedStatus,
    appliedStartDate,
    appliedEndDate,
    appliedShowAllHistory,
    transactions,
  ]);

  const fetchTransactions = async () => {
    try {
      setError(null);
      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data && typeof data === "object") {
        let transactionsData: Transaction[] = [];

        if (Array.isArray(data)) {
          transactionsData = data;
        } else if (data.data && Array.isArray(data.data)) {
          transactionsData = data.data;
        } else if (data.result && Array.isArray(data.result)) {
          transactionsData = data.result;
        } else if (data.items && Array.isArray(data.items)) {
          transactionsData = data.items;
        } else {
          for (let key in data) {
            if (Array.isArray(data[key])) {
              transactionsData = data[key];
              break;
            }
          }
        }

        if (transactionsData && transactionsData.length > 0) {
          setTransactions(transactionsData);
          setOriginalTransactions(transactionsData);
          
          // Filter to show only today's data by default
          const todayTransactions = transactionsData.filter(item => isToday(item.TransactionDate));
          setFilteredTransactions(todayTransactions);
          calculateSummary(todayTransactions);

          const uniqueCategories = [
            ...new Set(
              transactionsData
                .map((item) => item.Category)
                .filter((cat) => cat && cat !== ""),
            ),
          ];
          setCategories(uniqueCategories);
        } else {
          setTransactions([]);
          setFilteredTransactions([]);
        }
      }
    } catch (error: any) {
      console.error("Fetch Error:", error);
      setError(error.message || "Failed to fetch transactions");
      Alert.alert("Error", `Failed to load data: ${error.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateSummary = (data: Transaction[]) => {
    const totalQty = data.reduce((sum, item) => sum + (item.Quantity || 0), 0);
    const totalAmount = data.reduce(
      (sum, item) =>
        sum + (item.SalesValue || item.TotalAmount || item.Amount || 0),
      0,
    );
    const totalProfit = data.reduce(
      (sum, item) => sum + (item.ProfitPerUnit || 0) * (item.Quantity || 0),
      0,
    );
    const totalDue = data.reduce((sum, item) => sum + (item.DueAmount || 0), 0);
    const avgProfitMargin =
      totalAmount > 0 ? (totalProfit / totalAmount) * 100 : 0;

    setSummary({
      totalTxn: data.length,
      totalQty,
      totalAmount,
      totalProfit,
      totalDue,
      avgProfitMargin,
    });
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    // Only apply filters if not showing all history
    if (!appliedShowAllHistory) {
      // Search filter
      if (appliedSearchText) {
        filtered = filtered.filter(
          (item) =>
            (item.ProductName &&
              item.ProductName.toLowerCase().includes(
                appliedSearchText.toLowerCase(),
              )) ||
            (item.TransactionNumber &&
              item.TransactionNumber.toLowerCase().includes(
                appliedSearchText.toLowerCase(),
              )) ||
            (item.CustomerName &&
              item.CustomerName.toLowerCase().includes(
                appliedSearchText.toLowerCase(),
              )),
        );
      }

      // Category filter
      if (appliedSelectedCategory) {
        filtered = filtered.filter(
          (item) => item.Category === appliedSelectedCategory,
        );
      }

      // Status filter
      if (appliedSelectedStatus) {
        filtered = filtered.filter(
          (item) => item.PaymentStatus === appliedSelectedStatus,
        );
      }

      // Date range filter
      if (appliedStartDate && appliedEndDate) {
        filtered = filtered.filter((item) => {
          const itemDateObj = parseDateFromJson(item.TransactionDate);
          if (!itemDateObj) return false;
          
          const [startDay, startMonth, startYear] = appliedStartDate.split("/");
          const startDateObj = new Date(parseInt(startYear), parseInt(startMonth) - 1, parseInt(startDay));
          startDateObj.setHours(0, 0, 0, 0);
          
          const [endDay, endMonth, endYear] = appliedEndDate.split("/");
          const endDateObj = new Date(parseInt(endYear), parseInt(endMonth) - 1, parseInt(endDay));
          endDateObj.setHours(23, 59, 59, 999);
          
          return itemDateObj >= startDateObj && itemDateObj <= endDateObj;
        });
      }
    }

    setFilteredTransactions(filtered);
    calculateSummary(filtered);
  };

  const handleDatePreset = (preset: string) => {
    const { start, end } = getDateRange(preset);
    setTempStartDate(formatDateForPicker(start));
    setTempEndDate(formatDateForPicker(end));
    setTempDatePreset(preset);
  };

  const applyModalFilters = () => {
    // Only update applied states when Apply is clicked
    setAppliedSearchText(tempSearchText);
    setAppliedSelectedCategory(tempSelectedCategory);
    setAppliedSelectedStatus(tempSelectedStatus);
    setAppliedStartDate(tempStartDate);
    setAppliedEndDate(tempEndDate);
    setAppliedShowAllHistory(false);
    setShowFilterModal(false);
  };

  const resetFilters = () => {
    // Reset temporary states
    setTempSearchText("");
    setTempSelectedCategory("");
    setTempSelectedStatus("");
    setTempStartDate("");
    setTempEndDate("");
    setTempDatePreset("");
    
    // Reset applied states
    setAppliedSearchText("");
    setAppliedSelectedCategory("");
    setAppliedSelectedStatus("");
    setAppliedStartDate("");
    setAppliedEndDate("");
    setAppliedShowAllHistory(false);
    
    setShowFilterModal(false);
  };

  const showAllData = () => {
    // Reset all temporary states
    setTempSearchText("");
    setTempSelectedCategory("");
    setTempSelectedStatus("");
    setTempStartDate("");
    setTempEndDate("");
    setTempDatePreset("");
    
    // Set applied states to show all data
    setAppliedSearchText("");
    setAppliedSelectedCategory("");
    setAppliedSelectedStatus("");
    setAppliedStartDate("");
    setAppliedEndDate("");
    setAppliedShowAllHistory(true);
    
    setShowFilterModal(false);
  };

  const getStatusStyle = (status: string) => {
    if (!status) return { bg: "#f0f0f0", text: "#666" };
    switch (status.toLowerCase()) {
      case "paid":
        return { bg: "#d4edda", text: "#155724" };
      case "partial":
        return { bg: "#fff3cd", text: "#856404" };
      case "unpaid":
        return { bg: "#f8d7da", text: "#721c24" };
      default:
        return { bg: "#f0f0f0", text: "#666" };
    }
  };

  const FilterModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showFilterModal}
      onRequestClose={() => setShowFilterModal(false)}
    >
      <TouchableWithoutFeedback onPress={() => setShowFilterModal(true)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <ThemedText style={styles.modalHeaderTitle}>
                  Filter Options
                </ThemedText>
                <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                  <ThemedText style={styles.modalClose}>✕</ThemedText>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {/* Search */}
                {/* <View style={styles.filterGroup}>
                  <ThemedText style={styles.filterLabel}>Search</ThemedText>
                  <TextInput
                    style={styles.searchInputModal}
                    placeholder="Search by product, invoice or customer..."
                    placeholderTextColor="#999"
                    value={tempSearchText}
                    onChangeText={setTempSearchText}
                  />
                </View> */}

                {/* Category Selection */}
                <View style={styles.filterGroup}>
                  <ThemedText style={styles.filterLabel}>Category</ThemedText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.filterOptions}>
                      <TouchableOpacity
                        style={[
                          styles.filterOption,
                          !tempSelectedCategory && styles.filterOptionActive,
                        ]}
                        onPress={() => setTempSelectedCategory("")}
                      >
                        <ThemedText
                          style={[
                            styles.filterOptionText,
                            !tempSelectedCategory &&
                              styles.filterOptionTextActive,
                          ]}
                        >
                          All
                        </ThemedText>
                      </TouchableOpacity>
                      {categories.map((cat) => (
                        <TouchableOpacity
                          key={cat}
                          style={[
                            styles.filterOption,
                            tempSelectedCategory === cat &&
                              styles.filterOptionActive,
                          ]}
                          onPress={() => setTempSelectedCategory(cat)}
                        >
                          <ThemedText
                            style={[
                              styles.filterOptionText,
                              tempSelectedCategory === cat &&
                                styles.filterOptionTextActive,
                            ]}
                          >
                            {cat}
                          </ThemedText>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                {/* Status Selection */}
                <View style={styles.filterGroup}>
                  <ThemedText style={styles.filterLabel}>
                    Payment Status
                  </ThemedText>
                  <View style={styles.filterOptions}>
                    <TouchableOpacity
                      style={[
                        styles.filterOption,
                        !tempSelectedStatus && styles.filterOptionActive,
                      ]}
                      onPress={() => setTempSelectedStatus("")}
                    >
                      <ThemedText
                        style={[
                          styles.filterOptionText,
                          !tempSelectedStatus && styles.filterOptionTextActive,
                        ]}
                      >
                        All
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.filterOption,
                        tempSelectedStatus === "Paid" &&
                          styles.filterOptionActive,
                      ]}
                      onPress={() => setTempSelectedStatus("Paid")}
                    >
                      <ThemedText
                        style={[
                          styles.filterOptionText,
                          tempSelectedStatus === "Paid" &&
                            styles.filterOptionTextActive,
                        ]}
                      >
                        Paid
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.filterOption,
                        tempSelectedStatus === "Partial" &&
                          styles.filterOptionActive,
                      ]}
                      onPress={() => setTempSelectedStatus("Partial")}
                    >
                      <ThemedText
                        style={[
                          styles.filterOptionText,
                          tempSelectedStatus === "Partial" &&
                            styles.filterOptionTextActive,
                        ]}
                      >
                        Partial
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.filterOption,
                        tempSelectedStatus === "Unpaid" &&
                          styles.filterOptionActive,
                      ]}
                      onPress={() => setTempSelectedStatus("Unpaid")}
                    >
                      <ThemedText
                        style={[
                          styles.filterOptionText,
                          tempSelectedStatus === "Unpaid" &&
                            styles.filterOptionTextActive,
                        ]}
                      >
                        Unpaid
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Date Range Presets */}
                <View style={styles.filterGroup}>
                  <ThemedText style={styles.filterLabel}>Quick Date Range</ThemedText>
                  <View style={styles.filterOptions}>
                    <TouchableOpacity
                      style={[
                        styles.filterOption,
                        tempDatePreset === "7days" && styles.filterOptionActive,
                      ]}
                      onPress={() => handleDatePreset("7days")}
                    >
                      <ThemedText
                        style={[
                          styles.filterOptionText,
                          tempDatePreset === "7days" && styles.filterOptionTextActive,
                        ]}
                      >
                        Last 7 Days
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.filterOption,
                        tempDatePreset === "15days" && styles.filterOptionActive,
                      ]}
                      onPress={() => handleDatePreset("15days")}
                    >
                      <ThemedText
                        style={[
                          styles.filterOptionText,
                          tempDatePreset === "15days" && styles.filterOptionTextActive,
                        ]}
                      >
                        Last 15 Days
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.filterOption,
                        tempDatePreset === "30days" && styles.filterOptionActive,
                      ]}
                      onPress={() => handleDatePreset("30days")}
                    >
                      <ThemedText
                        style={[
                          styles.filterOptionText,
                          tempDatePreset === "30days" && styles.filterOptionTextActive,
                        ]}
                      >
                        Last 30 Days
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.filterOption,
                        tempDatePreset === "3months" && styles.filterOptionActive,
                      ]}
                      onPress={() => handleDatePreset("3months")}
                    >
                      <ThemedText
                        style={[
                          styles.filterOptionText,
                          tempDatePreset === "3months" && styles.filterOptionTextActive,
                        ]}
                      >
                        Last 3 Months
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Date Range */}
                <View style={styles.filterGroup}>
                  <ThemedText style={styles.filterLabel}>Custom Date Range</ThemedText>
                  <View style={styles.dateRangeContainer}>
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => setShowStartDatePicker(true)}
                    >
                      <ThemedText style={styles.datePickerButtonText}>
                        {tempStartDate || "Select Start Date"}
                      </ThemedText>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.datePickerButton}
                      onPress={() => setShowEndDatePicker(true)}
                    >
                      <ThemedText style={styles.datePickerButtonText}>
                        {tempEndDate || "Select End Date"}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.resetAllBtn}
                  onPress={resetFilters}
                >
                  <ThemedText style={styles.resetAllBtnText}>Reset</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.showAllBtn}
                  onPress={showAllData}
                >
                  <ThemedText style={styles.showAllBtnText}>
                    All Data
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.applyFilterBtn}
                  onPress={applyModalFilters}
                >
                  <ThemedText style={styles.applyFilterBtnText}>
                    Apply
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  // Render the entire table with single horizontal scroll
  const renderTable = () => {
    // Calculate total width including action buttons
    const totalWidth = 40 + 85 + 140 + 50 + 75 + 85 + 85 + 75 + 80 + 120;

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        bounces={false}
      >
        <View style={{ width: totalWidth }}>
          {/* Table Header */}
          <View style={styles.headerRow}>
            <View style={[styles.headerCell, styles.cellSn]}>
              <ThemedText style={styles.headerText}>#</ThemedText>
            </View>
            <View style={[styles.headerCell, styles.cellDate]}>
              <ThemedText style={styles.headerText}>Date</ThemedText>
            </View>
            <View style={[styles.headerCell, styles.cellProduct]}>
              <ThemedText style={styles.headerText}>Product/Invoice</ThemedText>
            </View>
            <View style={[styles.headerCell, styles.cellQty]}>
              <ThemedText style={styles.headerText}>Qty</ThemedText>
            </View>
            <View style={[styles.headerCell, styles.cellPrice]}>
              <ThemedText style={styles.headerText}>Unit Price</ThemedText>
            </View>
            <View style={[styles.headerCell, styles.cellSales]}>
              <ThemedText style={styles.headerText}>Selling Price</ThemedText>
            </View>
            <View style={[styles.headerCell, styles.cellAmount]}>
              <ThemedText style={styles.headerText}>Amount</ThemedText>
            </View>
            <View style={[styles.headerCell, styles.cellProfit]}>
              <ThemedText style={styles.headerText}>Profit</ThemedText>
            </View>
            <View style={[styles.headerCell, styles.cellStatus]}>
              <ThemedText style={styles.headerText}>Status</ThemedText>
            </View>
            <View style={[styles.headerCell, styles.cellAction]}>
              <ThemedText style={styles.headerText}>Actions</ThemedText>
            </View>
          </View>

          {/* Table Body - Now with proper key */}
          <FlatList
            data={filteredTransactions}
            keyExtractor={(item, index) => 
              item.TransactionId ? item.TransactionId.toString() : index.toString()
            }
            renderItem={({ item, index }) => {
              const statusColor = getStatusStyle(item.PaymentStatus);
              const profit = (item.ProfitPerUnit || 0) * (item.Quantity || 0);
              const amount =
                item.SalesValue || item.TotalAmount || item.Amount || 0;

              return (
                <View style={styles.tableRow}>
                  <View style={[styles.cell, styles.cellSn, styles.cellBorder]}>
                    <ThemedText style={styles.cellText}>{index + 1}</ThemedText>
                  </View>
                  <View
                    style={[styles.cell, styles.cellDate, styles.cellBorder]}
                  >
                    <ThemedText style={styles.cellText}>
                      {formatDate(item.TransactionDate)}
                    </ThemedText>
                  </View>
                  <View
                    style={[styles.cell, styles.cellProduct, styles.cellBorder]}
                  >
                    <ThemedText style={styles.productName}>
                      {item.ProductName || "N/A"}
                    </ThemedText>
                    <ThemedText style={styles.txnNumber}>
                      {item.TransactionNumber || "N/A"}
                    </ThemedText>
                  </View>
                  <View
                    style={[styles.cell, styles.cellQty, styles.cellBorder]}
                  >
                    <ThemedText style={styles.cellText}>
                      {item.Quantity || 0}
                    </ThemedText>
                  </View>
                  <View
                    style={[styles.cell, styles.cellPrice, styles.cellBorder]}
                  >
                    <ThemedText style={styles.cellText}>
                      {(item.UnitPrice || 0).toFixed(2)}
                    </ThemedText>
                  </View>
                  <View
                    style={[styles.cell, styles.cellSales, styles.cellBorder]}
                  >
                    <ThemedText style={styles.cellText}>
                      {(item.SalesValue || 0).toFixed(2)}
                    </ThemedText>
                  </View>
                  <View
                    style={[styles.cell, styles.cellAmount, styles.cellBorder]}
                  >
                    <ThemedText style={styles.amountText}>
                      {amount.toFixed(2)}
                    </ThemedText>
                  </View>
                  <View
                    style={[styles.cell, styles.cellProfit, styles.cellBorder]}
                  >
                    <ThemedText style={styles.profitText}>
                      {profit.toFixed(2)}
                    </ThemedText>
                  </View>
                  <View
                    style={[styles.cell, styles.cellStatus, styles.cellBorder]}
                  >
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: statusColor.bg },
                      ]}
                    >
                      <ThemedText
                        style={[styles.statusText, { color: statusColor.text }]}
                      >
                        {item.PaymentStatus || "Unknown"}
                      </ThemedText>
                    </View>
                  </View>
                  <View
                    style={[styles.cell, styles.cellAction, styles.cellBorder]}
                  >
                    <View style={styles.actionButtons}>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.returnBtn]}
                      >
                        <ThemedText style={styles.actionBtnText}>
                          {item.IsExchangeRelated ? "Exchange" : "Ext/Re"}
                        </ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.editBtn]}
                      >
                        <ThemedText style={styles.actionBtnText}>
                          Edit
                        </ThemedText>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchTransactions();
                }}
              />
            }
            showsVerticalScrollIndicator={true}
          />
        </View>
      </ScrollView>
    );
  };

  if (error && !loading) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchTransactions}>
          <ThemedText style={styles.retryBtnText}>Retry</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={true}
      bounces={true}
    >
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Sales List</ThemedText>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setShowFilterModal(true)}
        >
          <ThemedText style={styles.filterBtnText}>Filter</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Active Filters Display */}
      {(appliedSelectedCategory || appliedSelectedStatus || appliedStartDate || appliedSearchText) &&
        !appliedShowAllHistory && (
          <View style={styles.activeFilters}>
            {appliedSearchText && (
              <View style={styles.filterTag}>
                <ThemedText style={styles.filterTagText}>
                  Search: {appliedSearchText}
                </ThemedText>
              </View>
            )}

            {appliedSelectedCategory && (
              <View style={styles.filterTag}>
                <ThemedText style={styles.filterTagText}>
                  Category: {appliedSelectedCategory}
                </ThemedText>
              </View>
            )}

            {appliedSelectedStatus && (
              <View style={styles.filterTag}>
                <ThemedText style={styles.filterTagText}>
                  Status: {appliedSelectedStatus}
                </ThemedText>
              </View>
            )}

            {appliedStartDate && appliedEndDate && (
              <View style={styles.filterTag}>
                <ThemedText style={styles.filterTagText}>
                  {appliedStartDate} - {appliedEndDate}
                </ThemedText>
              </View>
            )}
          </View>
        )}

      {appliedShowAllHistory && (
        <View style={styles.allHistoryBadge}>
          <ThemedText style={styles.allHistoryText}>
            Showing All History
          </ThemedText>
        </View>
      )}

      {/* Summary Section */}
      {filteredTransactions.length > 0 && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryHeader}>
            <ThemedText style={styles.summaryTitle}>Sales Summary</ThemedText>
            <ThemedText style={styles.summarySubtitle}>
              Based on {filteredTransactions.length} transactions
            </ThemedText>
          </View>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <ThemedText style={styles.summaryCardValue}>
                {summary.totalTxn}
              </ThemedText>
              <ThemedText style={styles.summaryCardLabel}>
                Transactions
              </ThemedText>
            </View>

            <View style={styles.summaryCard}>
              <ThemedText style={styles.summaryCardValue}>
                {summary.totalQty}
              </ThemedText>
              <ThemedText style={styles.summaryCardLabel}>
                Total Quantity
              </ThemedText>
            </View>

            <View style={styles.summaryCard}>
              <ThemedText style={styles.summaryCardValue}>
                ৳{summary.totalAmount.toFixed(2)}
              </ThemedText>
              <ThemedText style={styles.summaryCardLabel}>
                Total Amount
              </ThemedText>
            </View>

            <View style={styles.summaryCard}>
              <ThemedText style={styles.summaryCardValue}>
                ৳{summary.totalProfit.toFixed(2)}
              </ThemedText>
              <ThemedText style={styles.summaryCardLabel}>
                Total Profit
              </ThemedText>
            </View>

            <View style={styles.summaryCard}>
              <ThemedText style={styles.summaryCardValue}>
                ৳{summary.totalDue.toFixed(2)}
              </ThemedText>
              <ThemedText style={styles.summaryCardLabel}>Total Due</ThemedText>
            </View>

            <View style={[styles.summaryCard, styles.profitCard]}>
              <ThemedText style={styles.summaryCardValue}>
                {summary.avgProfitMargin.toFixed(1)}%
              </ThemedText>
              <ThemedText style={styles.summaryCardLabel}>
                Avg Profit Margin
              </ThemedText>
            </View>
          </View>
        </View>
      )}

      {/* Table Section */}
      <View style={styles.tableContainer}>
        {filteredTransactions.length > 0 ? (
          renderTable()
        ) : loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007bff" />
            <ThemedText style={styles.loadingText}>
              Loading transactions...
            </ThemedText>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>
              No Transactions Found
            </ThemedText>
            <TouchableOpacity
              style={styles.retryBtn}
              onPress={fetchTransactions}
            >
              <ThemedText style={styles.retryBtnText}>Refresh</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={parseDateString(tempStartDate) || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowStartDatePicker(false);
            if (selectedDate) {
              setTempStartDate(formatDateForPicker(selectedDate));
              setTempDatePreset("");
            }
          }}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={parseDateString(tempEndDate) || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowEndDatePicker(false);
            if (selectedDate) {
              setTempEndDate(formatDateForPicker(selectedDate));
              setTempDatePreset("");
            }
          }}
        />
      )}

      <FilterModal />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#333" },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#007bff",
    borderRadius: 6,
  },
  filterBtnText: { color: "#fff", fontSize: 14, fontWeight: "bold" },

  // Active Filters
  activeFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  filterTag: {
    backgroundColor: "#e7f1ff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  filterTagText: { fontSize: 11, color: "#007bff" },

  allHistoryBadge: {
    backgroundColor: "#28a745",
    padding: 8,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  allHistoryText: { color: "#fff", fontSize: 12, fontWeight: "bold" },

  // Summary
  summaryContainer: {
    backgroundColor: "#fff",
    margin: 12,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 2,
  },
  summaryHeader: { padding: 16, backgroundColor: "#007bff" },
  summaryTitle: { fontSize: 16, fontWeight: "bold", color: "#fff" },
  summarySubtitle: { fontSize: 11, color: "#cce5ff", marginTop: 4 },
  summaryGrid: { flexDirection: "row", flexWrap: "wrap", padding: 12, gap: 12 },
  summaryCard: {
    flex: 1,
    minWidth: "28%",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    gap: 6,
  },
  summaryCardValue: { fontSize: 16, fontWeight: "bold", color: "#333" },
  summaryCardLabel: { fontSize: 10, color: "#666" },
  profitCard: { backgroundColor: "#e8f5e9" },

  // Table Container
  tableContainer: { 
    marginHorizontal: 12,
    marginBottom: 20,
  },

  // Table Header
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#343a40",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  headerCell: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  headerText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
  },

  // Table Row
  tableRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 6,
    borderRadius: 8,
    elevation: 1,
  },
  cell: { justifyContent: "center", paddingHorizontal: 4 },
  cellBorder: { borderRightWidth: 1, borderRightColor: "#e0e0e0" },
  cellText: { fontSize: 11, color: "#555" },

  // Column Widths
  cellSn: { width: 40, alignItems: "center" },
  cellDate: { width: 85, alignItems: "center" },
  cellProduct: { width: 140 },
  cellQty: { width: 50, alignItems: "center" },
  cellPrice: { width: 75, alignItems: "center" },
  cellSales: { width: 85, alignItems: "center" },
  cellAmount: { width: 85, alignItems: "center" },
  cellProfit: { width: 75, alignItems: "center" },
  cellStatus: { width: 80, alignItems: "center" },
  cellAction: { width: 120, alignItems: "center" },

  productName: { fontSize: 12, fontWeight: "bold", color: "#333" },
  txnNumber: { fontSize: 10, color: "#666", marginTop: 2 },
  amountText: { fontSize: 11, fontWeight: "bold", color: "#b8860b" },
  profitText: { fontSize: 11, fontWeight: "bold", color: "#2e7d32" },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    minWidth: 65,
    alignItems: "center",
  },
  statusText: { fontSize: 10, fontWeight: "bold" },

  actionButtons: { flexDirection: "row", gap: 6 },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
    minWidth: 50,
    alignItems: "center",
  },
  returnBtn: { backgroundColor: "#17a2b8" },
  editBtn: { backgroundColor: "#ffc107" },
  actionBtnText: { color: "#fff", fontSize: 10, fontWeight: "bold" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: width * 0.9,
    maxHeight: height * 0.8,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalHeaderTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  modalClose: { fontSize: 20, color: "#999" },
  modalBody: { padding: 20, maxHeight: height * 0.6 },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },

  filterGroup: { marginBottom: 24 },
  filterLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  filterOptions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 6,
  },
  filterOptionActive: { backgroundColor: "#007bff" },
  filterOptionText: { fontSize: 13, color: "#666" },
  filterOptionTextActive: { color: "#fff" },

  searchInputModal: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 12,
    fontSize: 14,
    backgroundColor: "#fff",
  },

  dateRangeContainer: { gap: 10 },
  datePickerButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    padding: 12,
    backgroundColor: "#fff",
  },
  datePickerButtonText: { fontSize: 14, color: "#333" },

  resetAllBtn: {
    flex: 1,
    padding: 12,
    backgroundColor: "#6c757d",
    borderRadius: 6,
    alignItems: "center",
  },
  resetAllBtnText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  showAllBtn: {
    flex: 1,
    padding: 12,
    backgroundColor: "#28a745",
    borderRadius: 6,
    alignItems: "center",
  },
  showAllBtnText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  applyFilterBtn: {
    flex: 1,
    padding: 12,
    backgroundColor: "#007bff",
    borderRadius: 6,
    alignItems: "center",
  },
  applyFilterBtnText: { color: "#fff", fontSize: 14, fontWeight: "bold" },

  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 12,
  },
  loadingText: { fontSize: 14, color: "#999" },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 60,
    gap: 12,
  },
  emptyText: { fontSize: 14, color: "#999" },
  errorText: {
    textAlign: "center",
    marginTop: 12,
    fontSize: 14,
    color: "#dc3545",
  },
  retryBtn: {
    backgroundColor: "#007bff",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
});