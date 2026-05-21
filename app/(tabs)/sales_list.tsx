// sales_list.tsx
import { ThemedText } from "@/components/themed-text";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

const API_KEY = "3A734AC6-A521-4192-984D-08D082B83456";
const API_URL = "http://devmystock.byteheart.com/Stock/GetTransactionsFilter";

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

// ─── Pure helper functions ─────────────────────────────────────────

const formatDate = (dateString: string): string => {
  try {
    if (!dateString) return "N/A";
    const match = dateString.match(/\/Date\((\d+)\)\//);
    if (match) {
      const date = new Date(parseInt(match[1]));
      return (
        date.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }) +
        " " +
        date.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        })
      );
    }
    return dateString;
  } catch {
    return dateString;
  }
};

const formatDateForPicker = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
};

const parseDateString = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    return new Date(
      parseInt(parts[2]),
      parseInt(parts[1]) - 1,
      parseInt(parts[0]),
    );
  }
  return null;
};

const parseDateFromJson = (dateString: string): Date | null => {
  try {
    if (!dateString) return null;
    const match = dateString.match(/\/Date\((\d+)\)\//);
    return match ? new Date(parseInt(match[1])) : new Date(dateString);
  } catch {
    return null;
  }
};

const isToday = (transactionDate: string): boolean => {
  const parsed = parseDateFromJson(transactionDate);
  if (!parsed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const txDay = new Date(parsed);
  txDay.setHours(0, 0, 0, 0);
  return txDay.getTime() === today.getTime();
};

const getDateRange = (preset: string): { start: Date; end: Date } => {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  switch (preset) {
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
  }
  return { start, end };
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

// ─── Filter Modal ────────────────────────────────────────────────

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  categories: string[];
  tempSelectedCategory: string;
  setTempSelectedCategory: (v: string) => void;
  tempSelectedStatus: string;
  setTempSelectedStatus: (v: string) => void;
  tempStartDate: string;
  tempEndDate: string;
  tempDatePreset: string;
  onDatePreset: (preset: string) => void;
  onStartDatePress: () => void;
  onEndDatePress: () => void;
  onReset: () => void;
  onShowAll: () => void;
  onApply: () => void;
}

const FilterModal = ({
  visible,
  onClose,
  categories,
  tempSelectedCategory,
  setTempSelectedCategory,
  tempSelectedStatus,
  setTempSelectedStatus,
  tempStartDate,
  tempEndDate,
  tempDatePreset,
  onDatePreset,
  onStartDatePress,
  onEndDatePress,
  onReset,
  onShowAll,
  onApply,
}: FilterModalProps) => (
  <Modal
    animationType="slide"
    transparent={true}
    visible={visible}
    onRequestClose={onClose}
  >
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalHeaderTitle}>
                Filter Options
              </ThemedText>
              <TouchableOpacity onPress={onClose}>
                <ThemedText style={styles.modalClose}>✕</ThemedText>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Category */}
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

              {/* Payment Status */}
              <View style={styles.filterGroup}>
                <ThemedText style={styles.filterLabel}>
                  Payment Status
                </ThemedText>
                <View style={styles.filterOptions}>
                  {["", "Paid", "Partial", "Unpaid"].map((status) => (
                    <TouchableOpacity
                      key={status || "all"}
                      style={[
                        styles.filterOption,
                        tempSelectedStatus === status &&
                          styles.filterOptionActive,
                      ]}
                      onPress={() => setTempSelectedStatus(status)}
                    >
                      <ThemedText
                        style={[
                          styles.filterOptionText,
                          tempSelectedStatus === status &&
                            styles.filterOptionTextActive,
                        ]}
                      >
                        {status || "All"}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Quick Date Range */}
              <View style={styles.filterGroup}>
                <ThemedText style={styles.filterLabel}>
                  Quick Date Range
                </ThemedText>
                <View style={styles.filterOptions}>
                  {[
                    { key: "7days", label: "Last 7 Days" },
                    { key: "15days", label: "Last 15 Days" },
                    { key: "30days", label: "Last 30 Days" },
                    { key: "3months", label: "Last 3 Months" },
                  ].map(({ key, label }) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.filterOption,
                        tempDatePreset === key && styles.filterOptionActive,
                      ]}
                      onPress={() => onDatePreset(key)}
                    >
                      <ThemedText
                        style={[
                          styles.filterOptionText,
                          tempDatePreset === key &&
                            styles.filterOptionTextActive,
                        ]}
                      >
                        {label}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Custom Date Range */}
              <View style={styles.filterGroup}>
                <ThemedText style={styles.filterLabel}>
                  Custom Date Range
                </ThemedText>
                <View style={styles.dateRangeContainer}>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={onStartDatePress}
                  >
                    <ThemedText style={styles.datePickerButtonText}>
                      {tempStartDate || "Select Start Date"}
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.datePickerButton}
                    onPress={onEndDatePress}
                  >
                    <ThemedText style={styles.datePickerButtonText}>
                      {tempEndDate || "Select End Date"}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.resetAllBtn} onPress={onReset}>
                <ThemedText style={styles.resetAllBtnText}>Reset</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.showAllBtn} onPress={onShowAll}>
                <ThemedText style={styles.showAllBtnText}>All Data</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyFilterBtn} onPress={onApply}>
                <ThemedText style={styles.applyFilterBtnText}>Apply</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  </Modal>
);

// ─── Main Screen ─────────────────────────────────────────────────

export default function SalesListScreen() {
  const router = useRouter();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    Transaction[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Temp filter states
  const [tempSelectedCategory, setTempSelectedCategory] = useState("");
  const [tempSelectedStatus, setTempSelectedStatus] = useState("");
  const [tempStartDate, setTempStartDate] = useState("");
  const [tempEndDate, setTempEndDate] = useState("");
  const [tempDatePreset, setTempDatePreset] = useState("");

  // Applied filter states
  const [appliedSearchText, setAppliedSearchText] = useState("");
  const [appliedSelectedCategory, setAppliedSelectedCategory] = useState("");
  const [appliedSelectedStatus, setAppliedSelectedStatus] = useState("");
  const [appliedStartDate, setAppliedStartDate] = useState("");
  const [appliedEndDate, setAppliedEndDate] = useState("");
  const [appliedShowAllHistory, setAppliedShowAllHistory] = useState(false);

  const [categories, setCategories] = useState<string[]>([]);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

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
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      let transactionsData: Transaction[] = [];

      if (Array.isArray(data)) transactionsData = data;
      else if (data.data && Array.isArray(data.data))
        transactionsData = data.data;
      else if (data.result && Array.isArray(data.result))
        transactionsData = data.result;
      else if (data.items && Array.isArray(data.items))
        transactionsData = data.items;
      else
        for (let key in data) {
          if (Array.isArray(data[key])) {
            transactionsData = data[key];
            break;
          }
        }

      if (transactionsData.length > 0) {
        setTransactions(transactionsData);
        const todayTxns = transactionsData.filter((item) =>
          isToday(item.TransactionDate),
        );
        setFilteredTransactions(todayTxns);
        calculateSummary(todayTxns);
        setCategories([
          ...new Set(transactionsData.map((i) => i.Category).filter(Boolean)),
        ]);
      } else {
        setTransactions([]);
        setFilteredTransactions([]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch transactions");
      Alert.alert("Error", `Failed to load data: ${err.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateSummary = (data: Transaction[]) => {
    const totalQty = data.reduce((s, i) => s + (i.Quantity || 0), 0);
    const totalAmount = data.reduce(
      (s, i) => s + (i.SalesValue || i.TotalAmount || i.Amount || 0),
      0,
    );
    const totalProfit = data.reduce(
      (s, i) => s + (i.ProfitPerUnit || 0) * (i.Quantity || 0),
      0,
    );
    const totalDue = data.reduce((s, i) => s + (i.DueAmount || 0), 0);
    setSummary({
      totalTxn: data.length,
      totalQty,
      totalAmount,
      totalProfit,
      totalDue,
      avgProfitMargin: totalAmount > 0 ? (totalProfit / totalAmount) * 100 : 0,
    });
  };

  const applyFilters = () => {
    let filtered = [...transactions];

    if (!appliedShowAllHistory) {
      if (appliedSearchText) {
        const q = appliedSearchText.toLowerCase();
        filtered = filtered.filter(
          (i) =>
            i.ProductName?.toLowerCase().includes(q) ||
            i.TransactionNumber?.toLowerCase().includes(q) ||
            i.CustomerName?.toLowerCase().includes(q),
        );
      }
      if (appliedSelectedCategory)
        filtered = filtered.filter(
          (i) => i.Category === appliedSelectedCategory,
        );
      if (appliedSelectedStatus)
        filtered = filtered.filter(
          (i) => i.PaymentStatus === appliedSelectedStatus,
        );

      if (appliedStartDate && appliedEndDate) {
        filtered = filtered.filter((i) => {
          const d = parseDateFromJson(i.TransactionDate);
          if (!d) return false;
          const [sd, sm, sy] = appliedStartDate.split("/");
          const [ed, em, ey] = appliedEndDate.split("/");
          const start = new Date(+sy, +sm - 1, +sd);
          start.setHours(0, 0, 0, 0);
          const end = new Date(+ey, +em - 1, +ed);
          end.setHours(23, 59, 59, 999);
          return d >= start && d <= end;
        });
      }
    }

    setFilteredTransactions(filtered);
    calculateSummary(filtered);
  };

  const handleDatePreset = useCallback((preset: string) => {
    const { start, end } = getDateRange(preset);
    setTempStartDate(formatDateForPicker(start));
    setTempEndDate(formatDateForPicker(end));
    setTempDatePreset(preset);
  }, []);

  const applyModalFilters = useCallback(() => {
    setAppliedSearchText("");
    setAppliedSelectedCategory(tempSelectedCategory);
    setAppliedSelectedStatus(tempSelectedStatus);
    setAppliedStartDate(tempStartDate);
    setAppliedEndDate(tempEndDate);
    setAppliedShowAllHistory(false);
    setShowFilterModal(false);
  }, [tempSelectedCategory, tempSelectedStatus, tempStartDate, tempEndDate]);

  const resetFilters = useCallback(() => {
    setTempSelectedCategory("");
    setTempSelectedStatus("");
    setTempStartDate("");
    setTempEndDate("");
    setTempDatePreset("");
    setAppliedSearchText("");
    setAppliedSelectedCategory("");
    setAppliedSelectedStatus("");
    setAppliedStartDate("");
    setAppliedEndDate("");
    setAppliedShowAllHistory(false);
    setShowFilterModal(false);
  }, []);

  const showAllData = useCallback(() => {
    setTempSelectedCategory("");
    setTempSelectedStatus("");
    setTempStartDate("");
    setTempEndDate("");
    setTempDatePreset("");
    setAppliedSearchText("");
    setAppliedSelectedCategory("");
    setAppliedSelectedStatus("");
    setAppliedStartDate("");
    setAppliedEndDate("");
    setAppliedShowAllHistory(true);
    setShowFilterModal(false);
  }, []);

  const handleStartDatePress = useCallback(
    () => setShowStartDatePicker(true),
    [],
  );
  const handleEndDatePress = useCallback(() => setShowEndDatePicker(true), []);
  const handleCloseModal = useCallback(() => setShowFilterModal(false), []);

  const handleViewDetails = useCallback(
    (transaction: Transaction) => {
      router.push({
        pathname: "/TransactionDetails",
        params: {
          transactionNumber: transaction.TransactionNumber,
          organizationId: transaction.OrganizationId || 3,
        },
      });
    },
    [router],
  );

  const renderTable = () => {
    const totalWidth = 40 + 85 + 140 + 50 + 75 + 85 + 85 + 75 + 80 + 120;
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        bounces={false}
      >
        <View style={{ width: totalWidth }}>
          {/* Header */}
          <View style={styles.headerRow}>
            {[
              { label: "#", style: styles.cellSn },
              { label: "Date", style: styles.cellDate },
              { label: "Product/Invoice", style: styles.cellProduct },
              { label: "Qty", style: styles.cellQty },
              { label: "Unit Price", style: styles.cellPrice },
              { label: "Selling Price", style: styles.cellSales },
              { label: "Amount", style: styles.cellAmount },
              { label: "Profit", style: styles.cellProfit },
              { label: "Status", style: styles.cellStatus },
              { label: "Actions", style: styles.cellAction },
            ].map(({ label, style }) => (
              <View key={label} style={[styles.headerCell, style]}>
                <ThemedText style={styles.headerText}>{label}</ThemedText>
              </View>
            ))}
          </View>

          {/* Rows */}
          <FlatList
            data={filteredTransactions}
            keyExtractor={(item, index) =>
              item.TransactionId
                ? item.TransactionId.toString()
                : index.toString()
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
                        onPress={() => handleViewDetails(item)}
                      >
                        <ThemedText style={styles.actionBtnText}>
                          {item.IsExchangeRelated ? "Exchange" : "Ext/Re"}
                        </ThemedText>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.editBtn]}
                        onPress={() => {
                          Alert.alert(
                            "Edit",
                            `Edit transaction ${item.TransactionNumber}`,
                          );
                        }}
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

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by product, invoice or customer..."
          placeholderTextColor="#999"
          value={appliedSearchText}
          onChangeText={setAppliedSearchText}
        />
      </View>

      {/* Active Filters */}
      {(appliedSelectedCategory ||
        appliedSelectedStatus ||
        appliedStartDate ||
        appliedSearchText) &&
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

      {/* Summary Cards - Box Style - Smaller Font & No Borders */}
      {filteredTransactions.length > 0 && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryHeader}>
            <ThemedText style={styles.summaryTitle}>Sales Summary</ThemedText>
          </View>

          {/* Summary Grid with Boxes - 2 Rows x 3 Columns */}
          <View style={styles.summaryGrid}>
            {/* Row 1 */}
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

            <View style={[styles.summaryCard, styles.summaryCardHighlight]}>
              <ThemedText
                style={[styles.summaryCardValue, styles.highlightText]}
              >
                ৳{summary.totalAmount.toFixed(2)}
              </ThemedText>
              <ThemedText
                style={[styles.summaryCardLabel, styles.highlightLabel]}
              >
                Total Amount
              </ThemedText>
            </View>

            {/* Row 2 */}
            <View style={[styles.summaryCard, styles.summaryCardProfit]}>
              <ThemedText style={[styles.summaryCardValue, styles.profitText]}>
                ৳{summary.totalProfit.toFixed(2)}
              </ThemedText>
              <ThemedText style={[styles.summaryCardLabel, styles.profitLabel]}>
                Total Profit
              </ThemedText>
            </View>

            <View style={[styles.summaryCard, styles.summaryCardDue]}>
              <ThemedText style={[styles.summaryCardValue, styles.dueText]}>
                ৳{summary.totalDue.toFixed(2)}
              </ThemedText>
              <ThemedText style={[styles.summaryCardLabel, styles.dueLabel]}>
                Total Due
              </ThemedText>
            </View>

            <View style={styles.summaryCard}>
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

      {/* Table */}
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
          onChange={(_, selectedDate) => {
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
          onChange={(_, selectedDate) => {
            setShowEndDatePicker(false);
            if (selectedDate) {
              setTempEndDate(formatDateForPicker(selectedDate));
              setTempDatePreset("");
            }
          }}
        />
      )}

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={handleCloseModal}
        categories={categories}
        tempSelectedCategory={tempSelectedCategory}
        setTempSelectedCategory={setTempSelectedCategory}
        tempSelectedStatus={tempSelectedStatus}
        setTempSelectedStatus={setTempSelectedStatus}
        tempStartDate={tempStartDate}
        tempEndDate={tempEndDate}
        tempDatePreset={tempDatePreset}
        onDatePreset={handleDatePreset}
        onStartDatePress={handleStartDatePress}
        onEndDatePress={handleEndDatePress}
        onReset={resetFilters}
        onShowAll={showAllData}
        onApply={applyModalFilters}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

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

  searchContainer: {
    padding: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  searchInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#333",
  },

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

  summaryContainer: {
    backgroundColor: "#fff",
    margin: 12,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  summaryHeader: { padding: 16, backgroundColor: "#007bff" },
  summaryTitle: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  summarySubtitle: { fontSize: 12, color: "#cce5ff", marginTop: 4 },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 12,
    gap: 12,
    justifyContent: "space-between",
  },

  summaryCard: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: "#f8f9fa",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    gap: 6,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },

  summaryCardHighlight: {
    backgroundColor: "#e3f2fd",
  },

  summaryCardProfit: {
    backgroundColor: "#e8f5e9",
  },

  summaryCardDue: {
    backgroundColor: "#fff3e0",
  },

  summaryCardValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },

  summaryCardLabel: {
    fontSize: 10,
    color: "#666",
    fontWeight: "500",
    textAlign: "center",
  },

  highlightText: { color: "#007bff" },
  highlightLabel: { color: "#007bff", fontSize: 10 },
  profitText: { color: "#4caf50" },
  profitLabel: { color: "#4caf50", fontSize: 10 },
  dueText: { color: "#ff9800" },
  dueLabel: { color: "#ff9800", fontSize: 10 },

  tableContainer: { marginHorizontal: 12, marginBottom: 20 },

  headerRow: {
    flexDirection: "row",
    backgroundColor: "#343a40",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    borderColor: "#dee2e6",
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

  tableRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#dee2e6",
  },
  cell: { justifyContent: "center", paddingHorizontal: 4 },
  cellBorder: { borderRightWidth: 1, borderRightColor: "#dee2e6" },
  cellText: { fontSize: 11, color: "#555" },

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
