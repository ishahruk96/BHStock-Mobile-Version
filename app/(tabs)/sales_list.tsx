// sales_list.tsx
import { ThemedText } from "@/components/themed-text";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState, useMemo, useRef } from "react";
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
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";

const { width, height } = Dimensions.get("window");

// API URL
const API_URL = "http://devmystock.byteheart.com/Stock/GetTransactionsForReport";
const ORG_LIST_URL = "http://devmystock.byteheart.com/Dashboard/GetAllOrganization";

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

const parseDateFromJson = (dateString: string): Date | null => {
  try {
    if (!dateString) return null;
    const match = dateString.match(/\/Date\((\d+)\)\//);
    return match ? new Date(parseInt(match[1])) : new Date(dateString);
  } catch {
    return null;
  }
};

// ✅ Sort transactions by date (newest first)
const sortTransactionsByDate = (transactions: Transaction[]): Transaction[] => {
  return [...transactions].sort((a, b) => {
    const dateA = parseDateFromJson(a.TransactionDate);
    const dateB = parseDateFromJson(b.TransactionDate);
    
    if (!dateA && !dateB) return 0;
    if (!dateA) return 1;
    if (!dateB) return -1;
    
    return dateB.getTime() - dateA.getTime();
  });
};

const formatDate = (dateString: string): string => {
  try {
    if (!dateString) return "N/A";
    const match = dateString.match(/\/Date\((\d+)\)\//);
    if (match) {
      const date = new Date(parseInt(match[1]));
      const day = date.getDate().toString().padStart(2, '0');
      const month = date.toLocaleString('default', { month: 'short' });
      const year = date.getFullYear();
      const time = date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
      return `${day} ${month} ${year} ${time}`;
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

  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // User session states
  const [apiKey, setApiKey] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const [userName, setUserName] = useState<string>("");

  // Organization selector states
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgName, setSelectedOrgName] = useState<string>("");
  
  // ✅ Store API keys for each organization from session
  const [orgApiKeys, setOrgApiKeys] = useState<Record<number, string>>({});
  // ✅ Store organization names from API
  const [orgNames, setOrgNames] = useState<Record<number, string>>({});

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

  const currentOrgRef = useRef<number | null>(null);

  useEffect(() => {
    loadUserSession();
  }, []);

  const loadUserSession = async () => {
    try {
      const session = await AsyncStorage.getItem("user_session");
      if (!session) {
        Alert.alert("Error", "Session not found. Please login again.");
        setLoading(false);
        return;
      }

      const userData = JSON.parse(session);
      
      const mainApiKey = userData.ApiKey || "";
      const uid = userData.UserId;
      const defaultOrgId = userData.OrganizationId || null;
      const defaultOrgName = userData.OrganizationName || "Unknown Org";

      console.log("Loaded session - Main ApiKey:", mainApiKey);
      console.log("Loaded session - UserId:", uid);
      console.log("Loaded session - Default OrganizationId:", defaultOrgId);
      console.log("Loaded session - Default OrganizationName:", defaultOrgName);

      setApiKey(mainApiKey);
      setUserId(uid);
      setUserName(userData.UserName || "User");

      // ✅ Get organizations with their API keys from session
      const orgsFromSession = userData.Organizations || [];
      
      if (orgsFromSession.length > 0) {
        console.log(`✅ Found ${orgsFromSession.length} organizations in session`);
        
        // ✅ Build API keys map from session data
        const keysMap: Record<number, string> = {};
        orgsFromSession.forEach((org: any) => {
          const orgId = org.OrganizationId;
          const orgApiKey = org.ApiKey;
          if (orgId && orgApiKey) {
            keysMap[orgId] = orgApiKey;
            console.log(`📌 Org ${orgId} has API Key: ${orgApiKey.substring(0, 20)}...`);
          }
        });
        setOrgApiKeys(keysMap);

        // ✅ Fetch organization names from API
        await fetchOrganizationNames(uid, mainApiKey, defaultOrgId, defaultOrgName, orgsFromSession, keysMap);
      } else {
        console.log("No organizations in session");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error loading session:", error);
      Alert.alert("Error", "Failed to load user session");
      setLoading(false);
    }
  };

  // ✅ Fetch organization names from API
  const fetchOrganizationNames = async (
    uid: string, 
    apiKey: string, 
    defaultOrgId: number | null,
    defaultOrgName: string,
    sessionOrgs: any[],
    keysMap: Record<number, string>
  ) => {
    try {
      const headers = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };

      const orgUrl = `${ORG_LIST_URL}?userId=${uid}`;
      const orgResponse = await fetch(orgUrl, { headers });
      const orgText = await orgResponse.text();
      const orgData = JSON.parse(orgText);

      let orgNamesMap: Record<number, string> = {};
      let combinedOrgs: any[] = [];

      if (orgData && orgData.success && Array.isArray(orgData.data) && orgData.data.length > 0) {
        console.log("✅ Organization names fetched from API:", orgData.data.length);
        
        // Build organization names map from API response
        orgData.data.forEach((org: any) => {
          const orgId = org.organizationId || org.id;
          const orgName = org.organizationName || org.name || `Organization ${orgId}`;
          orgNamesMap[orgId] = orgName;
        });
        
        setOrgNames(orgNamesMap);

        // Combine session orgs with API names
        combinedOrgs = sessionOrgs.map((sessionOrg: any) => {
          const orgId = sessionOrg.OrganizationId;
          return {
            OrganizationId: orgId,
            ApiKey: sessionOrg.ApiKey,
            OrganizationName: orgNamesMap[orgId] || `Organization ${orgId}`
          };
        });
      } else {
        // Fallback: Use session orgs with default name
        combinedOrgs = sessionOrgs.map((org: any) => ({
          ...org,
          OrganizationName: defaultOrgName
        }));
      }

      setOrganizations(combinedOrgs);

      // Find the default organization
      let initialOrg = combinedOrgs.find((o: any) => o.OrganizationId === defaultOrgId);
      if (!initialOrg && combinedOrgs.length > 0) {
        initialOrg = combinedOrgs[0];
      }

      if (initialOrg) {
        const initialOrgId = initialOrg.OrganizationId;
        const initialOrgApiKey = keysMap[initialOrgId] || apiKey;
        const initialOrgName = initialOrg.OrganizationName || defaultOrgName;
        
        console.log(`🔑 Initial Organization - ID: ${initialOrgId}, Name: "${initialOrgName}"`);

        setOrganizationId(initialOrgId);
        setSelectedOrgName(initialOrgName);
        setApiKey(initialOrgApiKey);
        currentOrgRef.current = initialOrgId;

        if (initialOrgApiKey && initialOrgId) {
          await fetchTransactionsForOrg(initialOrgApiKey, initialOrgId);
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error fetching organization names:", error);
      
      // Fallback: Use session orgs with default name
      const combinedOrgs = sessionOrgs.map((org: any) => ({
        ...org,
        OrganizationName: defaultOrgName
      }));
      setOrganizations(combinedOrgs);

      let initialOrg = combinedOrgs.find((o: any) => o.OrganizationId === defaultOrgId);
      if (!initialOrg && combinedOrgs.length > 0) {
        initialOrg = combinedOrgs[0];
      }

      if (initialOrg) {
        const initialOrgId = initialOrg.OrganizationId;
        const initialOrgApiKey = keysMap[initialOrgId] || apiKey;
        
        setOrganizationId(initialOrgId);
        setSelectedOrgName(defaultOrgName);
        setApiKey(initialOrgApiKey);
        currentOrgRef.current = initialOrgId;

        if (initialOrgApiKey && initialOrgId) {
          await fetchTransactionsForOrg(initialOrgApiKey, initialOrgId);
        } else {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    }
  };

  const fetchTransactionsForOrg = async (key: string, orgId: number) => {
    if (!key) {
      setError("Authentication key not found");
      setLoading(false);
      return;
    }

    if (!orgId) {
      setError("Organization ID not found");
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);

      const url = `${API_URL}?organizationId=${orgId}`;
      console.log("=========================================");
      console.log("Fetching transactions for Organization:", orgId);
      console.log("URL:", url);
      console.log("API Key:", key.substring(0, 20) + "...");
      console.log("=========================================");

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
        cache: "no-cache",
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const text = await response.text();
      if (!text || text.trim() === "") {
        console.log("Empty response received");
        setFilteredTransactions([]);
        setCategories([]);
        calculateSummary([]);
        setLoading(false);
        return;
      }

      const data = JSON.parse(text);
      let transactionsData: Transaction[] = [];

      if (Array.isArray(data)) transactionsData = data;
      else if (data.data && Array.isArray(data.data))
        transactionsData = data.data;
      else if (data.result && Array.isArray(data.result))
        transactionsData = data.result;
      else if (data.items && Array.isArray(data.items))
        transactionsData = data.items;
      else {
        for (let key in data) {
          if (Array.isArray(data[key])) {
            transactionsData = data[key];
            break;
          }
        }
      }

      transactionsData = sortTransactionsByDate(transactionsData);

      console.log(`✅ Total transactions fetched for org ${orgId}: ${transactionsData.length}`);
      
      const uniqueCategories = [
        ...new Set(transactionsData.map((i) => i.Category).filter(Boolean)),
      ];
      setCategories(uniqueCategories);
      
      let filtered = [...transactionsData];
      
      if (!appliedShowAllHistory) {
        if (appliedSearchText) {
          const q = appliedSearchText.toLowerCase();
          filtered = filtered.filter(
            (i) =>
              i.ProductName?.toLowerCase().includes(q) ||
              i.TransactionNumber?.toLowerCase().includes(q) ||
              i.CustomerName?.toLowerCase().includes(q)
          );
        }
        if (appliedSelectedCategory) {
          filtered = filtered.filter(
            (i) => i.Category === appliedSelectedCategory
          );
        }
        if (appliedSelectedStatus) {
          filtered = filtered.filter(
            (i) => i.PaymentStatus === appliedSelectedStatus
          );
        }
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
      
      console.log(`📊 After filters: ${filtered.length} transactions`);
      setFilteredTransactions(filtered);
      calculateSummary(filtered);
      
    } catch (err: any) {
      console.error("Fetch error:", err);
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
      0
    );
    const totalProfit = data.reduce(
      (s, i) => s + (i.ProfitPerUnit || 0) * (i.Quantity || 0),
      0
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

  const applyFiltersToCurrentData = useCallback(() => {
    if (apiKey && organizationId) {
      fetchTransactionsForOrg(apiKey, organizationId);
    }
  }, [apiKey, organizationId, appliedSearchText, appliedSelectedCategory, appliedSelectedStatus, appliedStartDate, appliedEndDate, appliedShowAllHistory]);

  useEffect(() => {
    if (apiKey && organizationId && !loading) {
      applyFiltersToCurrentData();
    }
  }, [
    appliedSearchText,
    appliedSelectedCategory,
    appliedSelectedStatus,
    appliedStartDate,
    appliedEndDate,
    appliedShowAllHistory,
  ]);

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

  const handleStartDatePress = useCallback(() => setShowStartDatePicker(true), []);
  const handleEndDatePress = useCallback(() => setShowEndDatePicker(true), []);
  const handleCloseModal = useCallback(() => setShowFilterModal(false), []);

  const handleRefresh = () => {
    setRefreshing(true);
    if (apiKey && organizationId) {
      fetchTransactionsForOrg(apiKey, organizationId);
    }
  };

  const handleRetry = () => {
    if (apiKey && organizationId) {
      fetchTransactionsForOrg(apiKey, organizationId);
    }
  };

  // ✅ Organization change handler
  const handleOrgChange = useCallback(
    async (itemValue: any) => {
      if (itemValue === undefined || itemValue === null) return;
      const orgIdValue = Number(itemValue);
      if (orgIdValue === organizationId) return;

      console.log(`🔄 Switching organization from ${organizationId} to ${orgIdValue}`);
      
      const orgApiKey = orgApiKeys[orgIdValue];
      if (!orgApiKey) {
        console.error(`❌ No API key found for organization ${orgIdValue}`);
        Alert.alert("Error", "API key not found for this organization");
        return;
      }
      
      console.log(`🔑 Using API key for org ${orgIdValue}: ${orgApiKey.substring(0, 20)}...`);
      
      setOrganizationId(orgIdValue);
      setApiKey(orgApiKey);
      currentOrgRef.current = orgIdValue;

      const currentOrg = organizations.find(
        (org: any) => org.OrganizationId === orgIdValue
      );
      
      const orgName = currentOrg?.OrganizationName || `Organization ${orgIdValue}`;
      console.log(`📌 Selected Organization: "${orgName}" (ID: ${orgIdValue})`);
      setSelectedOrgName(orgName);

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

      setFilteredTransactions([]);
      await fetchTransactionsForOrg(orgApiKey, orgIdValue);
    },
    [organizationId, organizations, orgApiKeys]
  );

  const isReturnOrExchange = (transaction: Transaction): boolean => {
    return transaction.TransactionType?.toLowerCase() === 'return' || 
           transaction.TransactionType?.toLowerCase() === 'exchange' ||
           transaction.IsExchangeRelated === true;
  };

  const isUnpaid = (transaction: Transaction): boolean => {
    return transaction.PaymentStatus?.toLowerCase() === 'unpaid';
  };

  const isFullyPaid = (transaction: Transaction): boolean => {
    return transaction.PaymentStatus?.toLowerCase() === 'paid';
  };

  if (error && !loading) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
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
      <View style={styles.header}>
        <View>
          <ThemedText style={styles.headerTitle}>Sales List</ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            Welcome, {userName}
            {selectedOrgName ? ` | ${selectedOrgName}` : ""}
          </ThemedText>
        </View>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setShowFilterModal(true)}
        >
          <ThemedText style={styles.filterBtnText}>Filter</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Organization Picker - shows unique names for each org */}
      {organizations.length > 0 && (
        <View style={styles.orgPickerContainer}>
          <Picker
            selectedValue={organizationId ?? undefined}
            onValueChange={handleOrgChange}
            style={styles.orgPicker}
            dropdownIconColor="#007bff"
          >
            {organizations.map((org: any, index: number) => {
              const id = org.OrganizationId;
              // Use the organization name from the combined data
              const name = org.OrganizationName || `Organization ${id}`;
              console.log(`Picker item ${index}: ID=${id}, Name="${name}"`);
              return <Picker.Item key={id || index} label={name} value={id} />;
            })}
          </Picker>
        </View>
      )}

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by product, invoice or customer..."
          placeholderTextColor="#999"
          value={appliedSearchText}
          onChangeText={setAppliedSearchText}
        />
      </View>

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

      {filteredTransactions.length > 0 && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryHeader}>
            <ThemedText style={styles.summaryTitle}>
              Sales Summary {selectedOrgName ? `- ${selectedOrgName}` : ""}
            </ThemedText>
          </View>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryBox}>
              <ThemedText style={styles.summaryLabel}>Transactions</ThemedText>
              <ThemedText style={styles.summaryValue}>
                {summary.totalTxn}
              </ThemedText>
            </View>

            <View style={styles.summaryBox}>
              <ThemedText style={styles.summaryLabel}>Total Quantity</ThemedText>
              <ThemedText style={styles.summaryValue}>
                {summary.totalQty}
              </ThemedText>
            </View>

            <View style={styles.summaryBox}>
              <ThemedText style={styles.summaryLabel}>Total Amount</ThemedText>
              <ThemedText style={[styles.summaryValue, styles.greenText]}>
                ৳{summary.totalAmount.toFixed(2)}
              </ThemedText>
            </View>

            <View style={styles.summaryBox}>
              <ThemedText style={styles.summaryLabel}>Total Profit</ThemedText>
              <ThemedText style={[styles.summaryValue, styles.profitText]}>
                ৳{summary.totalProfit.toFixed(2)}
              </ThemedText>
            </View>

            <View style={styles.summaryBox}>
              <ThemedText style={styles.summaryLabel}>Total Due</ThemedText>
              <ThemedText style={[styles.summaryValue, styles.dueText]}>
                ৳{summary.totalDue.toFixed(2)}
              </ThemedText>
            </View>

            <View style={styles.summaryBox}>
              <ThemedText style={styles.summaryLabel}>
                Avg Profit Margin
              </ThemedText>
              <ThemedText style={[styles.summaryValue, styles.blueText]}>
                {summary.avgProfitMargin.toFixed(1)}%
              </ThemedText>
            </View>
          </View>
        </View>
      )}

      <View style={styles.tableContainer}>
        {filteredTransactions.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            bounces={false}
          >
            <View
              style={{ width: 40 + 85 + 140 + 50 + 75 + 85 + 85 + 75 + 80 + 120 }}
            >
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

              <FlatList
                data={filteredTransactions}
                keyExtractor={(item, index) =>
                  item.TransactionId
                    ? `${item.TransactionId}-${organizationId}`
                    : `${index}-${organizationId}`
                }
                renderItem={({ item, index }) => {
                  const statusColor = getStatusStyle(item.PaymentStatus);
                  const profit =
                    (item.ProfitPerUnit || 0) * (item.Quantity || 0);
                  const amount =
                    item.SalesValue || item.TotalAmount || item.Amount || 0;
                  
                  const isReturn = isReturnOrExchange(item);
                  const isUnpaidStatus = isUnpaid(item);
                  const isPaid = isFullyPaid(item);
                  
                  let rowBgColor = '#fff';
                  if (isUnpaidStatus) {
                    rowBgColor = '#ffebee';
                  } else if (isReturn) {
                    rowBgColor = '#fff3e0';
                  } else if (isPaid) {
                    rowBgColor = '#e8f5e9';
                  }

                  return (
                    <View style={[styles.tableRow, { backgroundColor: rowBgColor }]}>
                      <View
                        style={[styles.cell, styles.cellSn, styles.cellBorder]}
                      >
                        <ThemedText style={styles.cellText}>
                          {index + 1}
                        </ThemedText>
                      </View>
                      <View
                        style={[styles.cell, styles.cellDate, styles.cellBorder]}
                      >
                        <ThemedText style={styles.cellText}>
                          {formatDate(item.TransactionDate)}
                        </ThemedText>
                      </View>
                      <View
                        style={[
                          styles.cell,
                          styles.cellProduct,
                          styles.cellBorder,
                        ]}
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
                        <ThemedText style={[styles.profitText, { fontWeight: 'bold' }]}>
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
                            style={[
                              styles.statusText,
                              { color: statusColor.text },
                            ]}
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
                            onPress={() => {
                              router.push({
                                pathname: "/ret_ex_transaction",
                                params: {
                                  transactionNumber: item.TransactionNumber,
                                  organizationId: organizationId,
                                  transactionId: item.TransactionId,
                                },
                              });
                            }}
                          >
                            <ThemedText style={styles.actionBtnText}>
                              Ret/Ex
                            </ThemedText>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.editBtn]}
                            onPress={() => {
                              router.push({
                                pathname: "/Edit_Transaction",
                                params: {
                                  transactionId: item.TransactionId,
                                  organizationId: organizationId,
                                },
                              });
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
                    onRefresh={handleRefresh}
                  />
                }
                showsVerticalScrollIndicator={true}
              />
            </View>
          </ScrollView>
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
              No Transactions Found for {selectedOrgName}
            </ThemedText>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
              <ThemedText style={styles.retryBtnText}>Refresh</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </View>

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
  headerSubtitle: { fontSize: 11, color: "#666", marginTop: 2 },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#007bff",
    borderRadius: 6,
  },
  filterBtnText: { color: "#fff", fontSize: 14, fontWeight: "bold" },

  orgPickerContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    overflow: "hidden",
  },
  orgPicker: {
    height: 50,
    width: "100%",
    color: "#333",
  },

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
    marginHorizontal: 12,
    marginVertical: 10,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  summaryHeader: {
    backgroundColor: "#67B968",
    paddingVertical: 10,
    paddingHorizontal: 12,
  },

  summaryTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center",
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  summaryBox: {
    width: "33.33%",
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 4,
  },

  summaryLabel: {
    fontSize: 10,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 4,
  },

  summaryValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
  },

  greenText: {
    color: "#2E7D32",
  },

  blueText: {
    color: "#2563EB",
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
  emptyText: {
    textAlign: "center",
    marginTop: 12,
    fontSize: 14,
    color: "#999",
  },
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