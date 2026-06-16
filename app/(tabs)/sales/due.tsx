import { ThemedText } from "@/components/themed-text";
import { FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Checkbox from "expo-checkbox";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";

// API Interface Mappings
interface DueCustomer {
  CustomerId: number;
  CustomerName: string;
  CustomerPhone: string;
  TotalSale: number;
  TotalPaid: number;
  DueAmount: number;
  PaymentStatus: string;
  LastTransactionDate: string;
}

interface DueSummary {
  TotalSales: number;
  TotalReceived: number;
  TotalDue: number;
  CustomersWithDue: number;
}

interface Product {
  ProductId: number;
  ProductName: string;
  SaleAmount: number;
  PaidAmount: number;
  DueAmount: number;
  RefundAmount: number;
  NetSale: number;
  EffectivePayment: number;
}

interface Transaction {
  TransactionNumber: string;
  TransactionDate: string;
  TotalSale: number;
  TotalPaid: number;
  DueAmount: number;
  TotalRefund: number;
  NetSale: number;
  EffectivePayment: number;
  PaymentStatus: string;
  IsSelected: boolean;
  products: Product[];
}

interface CustomerDetails {
  success: boolean;
  customer: {
    CustomerId: number;
    CustomerName: string;
    CustomerPhone: string;
    TotalDue: number;
  };
  dueSummary: {
    TotalSale: number;
    TotalPaid: number;
    TotalDue: number;
    TotalRefund: number;
  };
  transactions: Transaction[];
}

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

export default function CustomerDueListMobile() {
  // Organization States
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const [organizationName, setOrganizationName] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [orgLoading, setOrgLoading] = useState<boolean>(true);

  // Data Loading States
  const [loading, setLoading] = useState<boolean>(true);
  const [allCustomers, setAllCustomers] = useState<DueCustomer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<DueCustomer[]>([]);
  const [summary, setSummary] = useState<DueSummary>({
    TotalSales: 0,
    TotalReceived: 0,
    TotalDue: 0,
    CustomersWithDue: 0,
  });

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [statusModalVisible, setStatusModalVisible] = useState<boolean>(false);

  // Form & Action Modal States
  const [selectedCustomer, setSelectedCustomer] = useState<DueCustomer | null>(
    null,
  );
  const [selectedTransactionsForReceive, setSelectedTransactionsForReceive] =
    useState<string[]>([]);
  const [receiveModalVisible, setReceiveModalVisible] =
    useState<boolean>(false);
  const [bulkModalVisible, setBulkModalVisible] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Bulk Payment Specific States
  const [customerDetails, setCustomerDetails] =
    useState<CustomerDetails | null>(null);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>(
    [],
  );
  const [loadingDetails, setLoadingDetails] = useState<boolean>(false);
  const [expandedTransactions, setExpandedTransactions] = useState<Set<string>>(
    new Set(),
  );

  // Form Fields
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [referenceNo, setReferenceNo] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  const scrollViewRef = useRef<ScrollView>(null);

  // Generate Payment Transaction Number
  const generatePaymentTransactionNumber = () => {
    return `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  };

  // Load User Session
  useEffect(() => {
    loadUserSession();
  }, []);

  // Fetch data when organization changes
  useEffect(() => {
    if (organizationId && apiKey) {
      fetchDueData();
    }
  }, [organizationId, apiKey]);

  const loadUserSession = async () => {
    try {
      const session = await AsyncStorage.getItem("user_session");
      if (!session) {
        Alert.alert("Error", "Session not found. Please login again.");
        setOrgLoading(false);
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
      }
    } catch (error) {
      console.error("Error loading session:", error);
      Alert.alert("Error", "Failed to load user session");
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
      setAllCustomers([]);
      setFilteredCustomers([]);
      setSummary({
        TotalSales: 0,
        TotalReceived: 0,
        TotalDue: 0,
        CustomersWithDue: 0,
      });
      setSearchQuery("");
      setSelectedStatus("All");
    }
  };

  // Update the fetchDueData function
const fetchDueData = async () => {
  setLoading(true);
  try {
    const response = await fetch(
      `http://devmystock.byteheart.com/Due/Index?organizationId=${organizationId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      },
    );

    const result = await response.json();
    console.log("=== Due API Response ===");
    console.log("Full Response:", JSON.stringify(result, null, 2));
    
    if (result.success) {
      setAllCustomers(result.data || []);
      setFilteredCustomers(result.data || []);
      
      // Handle summary with different possible property names
      if (result.summary) {
        const summaryData = result.summary;
        setSummary({
          TotalSales: summaryData.TotalSales || 
                      summaryData.totalSales || 
                      summaryData.total_sales || 
                      summaryData.TotalSale || 
                      0,
          TotalReceived: summaryData.TotalReceived || 
                         summaryData.totalReceived || 
                         summaryData.total_received || 
                         summaryData.TotalPaid || 
                         summaryData.TotalReceive || 
                         0,
          TotalDue: summaryData.TotalDue || 
                    summaryData.totalDue || 
                    summaryData.total_due || 
                    summaryData.DueAmount || 
                    0,
          CustomersWithDue: summaryData.CustomersWithDue || 
                           summaryData.customersWithDue || 
                           summaryData.customers_with_due || 
                           summaryData.TotalCustomers || 
                           summaryData.CustomerCount || 
                           0,
        });
      } else {
        // If summary is not provided, calculate from data
        calculateSummaryFromData(result.data || []);
      }
    } else {
      Alert.alert("Error", result.message || "Failed to fetch data");
    }
  } catch (error) {
    console.error("Error fetching due list:", error);
    Alert.alert("Error", "Network error occurred");
  } finally {
    setLoading(false);
  }
};

// Add this helper function to calculate summary from data
const calculateSummaryFromData = (data: DueCustomer[]) => {
  let totalSales = 0;
  let totalReceived = 0;
  let totalDue = 0;
  
  data.forEach((customer) => {
    totalSales += customer.TotalSale || 0;
    totalReceived += customer.TotalPaid || 0;
    totalDue += customer.DueAmount || 0;
  });
  
  setSummary({
    TotalSales: totalSales,
    TotalReceived: totalReceived,
    TotalDue: totalDue,
    CustomersWithDue: data.filter(c => c.DueAmount > 0).length,
  });
};

  // Search Action Controller
  const handleSearchAction = () => {
    let result = [...allCustomers];
    if (searchQuery.trim() !== "") {
      result = result.filter(
        (item) =>
          item.CustomerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.CustomerPhone.includes(searchQuery),
      );
    }
    if (selectedStatus !== "All") {
      result = result.filter(
        (item) =>
          item.PaymentStatus.toLowerCase() === selectedStatus.toLowerCase(),
      );
    }
    setFilteredCustomers(result);
  };

  // Format Date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      if (dateString.startsWith("/Date(")) {
        const timestamp = parseInt(
          dateString.replace("/Date(", "").replace(")/", ""),
        );
        const date = new Date(timestamp);
        return date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        });
      }
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  // Format date for API (YYYY-MM-DDTHH:MM:SS)
  const formatDateForAPI = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}T00:00:00`;
  };

  // Fetch Customer Details
  const fetchCustomerDetails = async (customerId: number) => {
    setLoadingDetails(true);
    try {
      const response = await fetch(
        `http://devmystock.byteheart.com/Due/CustomerDue?customerId=${customerId}&organizationId=${organizationId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        },
      );

      const result = await response.json();
      console.log(
        "Customer Details Response:",
        JSON.stringify(result, null, 2),
      );

      if (result.success) {
        setCustomerDetails(result);
        // Filter only unpaid or partial transactions where due amount > 0
        const unpaidTransactions =
          result.transactions
            ?.filter(
              (t: Transaction) =>
                (t.PaymentStatus === "Unpaid" ||
                  t.PaymentStatus === "Partial") &&
                t.DueAmount > 0,
            )
            .map((t: Transaction) => t.TransactionNumber) || [];
        return result;
      } else {
        Alert.alert("Error", "Failed to fetch customer details");
        return null;
      }
    } catch (error) {
      console.error("Error fetching customer details:", error);
      Alert.alert("Error", "Network error occurred");
      return null;
    } finally {
      setLoadingDetails(false);
    }
  };

  // POST: Receive Payment
  const handleReceivePayment = async () => {
    if (!selectedCustomer) {
      return Alert.alert("Error", "No customer selected");
    }

    if (selectedTransactionsForReceive.length === 0) {
      return Alert.alert(
        "Validation Error",
        "Please select at least one transaction",
      );
    }

    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      return Alert.alert("Validation Error", "Please provide a valid amount");
    }

    // Calculate total due of selected transactions
    let totalDue = 0;
    customerDetails?.transactions.forEach((transaction) => {
      if (
        selectedTransactionsForReceive.includes(transaction.TransactionNumber)
      ) {
        totalDue += transaction.DueAmount;
      }
    });

    if (parseFloat(paymentAmount) > totalDue) {
      return Alert.alert(
        "Validation Error",
        `Payment amount (${paymentAmount}) cannot exceed total due amount (${totalDue.toFixed(2)})`,
      );
    }

    setSubmitting(true);

    const formattedDate = formatDateForAPI(paymentDate);
    const paymentTransactionNumber = generatePaymentTransactionNumber();
    const selectedTransactionsString = selectedTransactionsForReceive.join(",");

    const payload: any = {
      CustomerId: selectedCustomer.CustomerId,
      PaymentAmount: parseFloat(paymentAmount),
      PaymentDate: formattedDate,
      PaymentMethod: paymentMethod,
      OrganizationId: organizationId,
      PaymentTransactionNumber: paymentTransactionNumber,
      SelectedTransactions: selectedTransactionsString,
    };

    if (referenceNo && referenceNo.trim() !== "") {
      payload.ReferenceNumber = referenceNo.trim();
    }

    if (remarks && remarks.trim() !== "") {
      payload.Remarks = remarks.trim();
    }

    console.log("=== Sending Receive Payment Request ===");
    console.log("Selected Transactions:", selectedTransactionsString);
    console.log("Full Payload:", JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(
        "http://devmystock.byteheart.com/Due/MakeBulkPayment",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();
      console.log("=== Receive Payment Response ===");
      console.log("Full Response:", JSON.stringify(result, null, 2));

      if (response.ok && result.Success === true) {
        Alert.alert(
          "Success",
          `${result.Message}\nAmount Paid: ${result.TotalPaid}\nRemaining Due: ${result.TotalDue}`,
        );
        setReceiveModalVisible(false);
        setPaymentAmount("");
        setReferenceNo("");
        setRemarks("");
        setPaymentMethod("Cash");
        setPaymentDate(new Date());
        setSelectedCustomer(null);
        setSelectedTransactionsForReceive([]);
        setCustomerDetails(null);
        setExpandedTransactions(new Set());
        await fetchDueData();
      } else {
        Alert.alert(
          "Payment Failed",
          result.Message || "Payment could not be processed",
        );
      }
    } catch (err) {
      console.error("Payment error:", err);
      Alert.alert(
        "Error",
        "Network error occurred. Please check your connection.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // POST: Make Bulk Payment
  const handleMakeBulkPayment = async () => {
    if (!selectedCustomer) {
      return Alert.alert("Error", "No customer selected");
    }

    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      return Alert.alert(
        "Validation Error",
        "Please provide a valid bulk amount",
      );
    }

    if (selectedTransactions.length === 0) {
      return Alert.alert(
        "Validation Error",
        "Please select at least one transaction for bulk payment",
      );
    }

    setSubmitting(true);

    const formattedDate = formatDateForAPI(paymentDate);
    const paymentTransactionNumber = generatePaymentTransactionNumber();
    const selectedTransactionsString = selectedTransactions.join(",");

    const payload: any = {
      CustomerId: selectedCustomer.CustomerId,
      PaymentAmount: parseFloat(paymentAmount),
      PaymentDate: formattedDate,
      PaymentMethod: paymentMethod,
      OrganizationId: organizationId,
      PaymentTransactionNumber: paymentTransactionNumber,
      SelectedTransactions: selectedTransactionsString,
    };

    if (referenceNo && referenceNo.trim() !== "") {
      payload.ReferenceNumber = referenceNo.trim();
    }

    if (remarks && remarks.trim() !== "") {
      payload.Remarks = remarks.trim();
    }

    console.log("=== Sending Bulk Payment Request ===");
    console.log("Payment Transaction Number:", paymentTransactionNumber);
    console.log("Selected Transactions:", selectedTransactionsString);
    console.log("Full Payload:", JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(
        "http://devmystock.byteheart.com/Due/MakeBulkPayment",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();
      console.log("=== Bulk Payment Response ===");
      console.log("Full Response:", JSON.stringify(result, null, 2));

      if (response.ok && result.Success === true) {
        Alert.alert(
          "Bulk Payment Success",
          `${result.Message}\nTotal Paid: ${result.TotalPaid}\nTotal Due: ${result.TotalDue}`,
        );
        setBulkModalVisible(false);
        setPaymentAmount("");
        setReferenceNo("");
        setRemarks("");
        setPaymentMethod("Cash");
        setPaymentDate(new Date());
        setSelectedCustomer(null);
        setSelectedTransactions([]);
        setCustomerDetails(null);
        setExpandedTransactions(new Set());
        await fetchDueData();
      } else {
        Alert.alert("Error", result.Message || "Bulk payment failed");
      }
    } catch (err) {
      console.error("Bulk payment error:", err);
      Alert.alert("Error", "Network error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle transaction selection for receive
  const toggleReceiveTransactionSelection = (transactionNumber: string) => {
    setSelectedTransactionsForReceive((prev) => {
      if (prev.includes(transactionNumber)) {
        return prev.filter((t) => t !== transactionNumber);
      } else {
        return [...prev, transactionNumber];
      }
    });
  };

  // Toggle transaction selection for bulk
  const toggleTransactionSelection = (transactionNumber: string) => {
    setSelectedTransactions((prev) => {
      if (prev.includes(transactionNumber)) {
        return prev.filter((t) => t !== transactionNumber);
      } else {
        return [...prev, transactionNumber];
      }
    });
  };

  // Select/Deselect All for receive
  const toggleSelectAllReceive = () => {
    if (!customerDetails?.transactions) return;

    const unpaidTransactions = customerDetails.transactions
      .filter(
        (t) =>
          (t.PaymentStatus === "Unpaid" || t.PaymentStatus === "Partial") &&
          t.DueAmount > 0,
      )
      .map((t) => t.TransactionNumber);

    if (selectedTransactionsForReceive.length === unpaidTransactions.length) {
      setSelectedTransactionsForReceive([]);
    } else {
      setSelectedTransactionsForReceive(unpaidTransactions);
    }
  };

  // Select/Deselect All for bulk
  const toggleSelectAll = () => {
    if (!customerDetails?.transactions) return;

    const unpaidTransactions = customerDetails.transactions
      .filter(
        (t) =>
          (t.PaymentStatus === "Unpaid" || t.PaymentStatus === "Partial") &&
          t.DueAmount > 0,
      )
      .map((t) => t.TransactionNumber);

    if (selectedTransactions.length === unpaidTransactions.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(unpaidTransactions);
    }
  };

  // Toggle transaction expand/collapse
  const toggleTransactionExpand = (transactionNumber: string) => {
    setExpandedTransactions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(transactionNumber)) {
        newSet.delete(transactionNumber);
      } else {
        newSet.add(transactionNumber);
      }
      return newSet;
    });
  };

  const openReceivePayment = async (customer: DueCustomer) => {
    setSelectedCustomer(customer);
    setPaymentAmount("");
    setReferenceNo("");
    setRemarks("");
    setPaymentMethod("Cash");
    setPaymentDate(new Date());

    const details = await fetchCustomerDetails(customer.CustomerId);
    if (details) {
      // Auto select all unpaid/partial transactions
      const unpaidTransactions =
        details.transactions
          ?.filter(
            (t: Transaction) =>
              (t.PaymentStatus === "Unpaid" || t.PaymentStatus === "Partial") &&
              t.DueAmount > 0,
          )
          .map((t: Transaction) => t.TransactionNumber) || [];
      setSelectedTransactionsForReceive(unpaidTransactions);
      setReceiveModalVisible(true);
    }
  };

  const openBulkPayment = async (customer: DueCustomer) => {
    setSelectedCustomer(customer);
    setPaymentAmount("");
    setReferenceNo("");
    setRemarks("");
    setPaymentMethod("Cash");
    setPaymentDate(new Date());

    const details = await fetchCustomerDetails(customer.CustomerId);
    if (details) {
      setSelectedTransactions([]);
      setBulkModalVisible(true);
    }
  };

  // Calculate total selected amount for receive
  const calculateTotalSelectedAmountReceive = () => {
    if (!customerDetails?.transactions) return 0;
    let total = 0;
    customerDetails.transactions.forEach((transaction) => {
      if (
        selectedTransactionsForReceive.includes(transaction.TransactionNumber)
      ) {
        total += transaction.DueAmount;
      }
    });
    return total;
  };

  // Calculate total selected amount for bulk
  const calculateTotalSelectedAmount = () => {
    if (!customerDetails?.transactions) return 0;
    let total = 0;
    customerDetails.transactions.forEach((transaction) => {
      if (selectedTransactions.includes(transaction.TransactionNumber)) {
        total += transaction.DueAmount;
      }
    });
    return total;
  };

  if (loading || orgLoading) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color="#093" />
        <ThemedText style={{ marginTop: 10 }}>Loading...</ThemedText>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollViewRef}
          contentContainerStyle={styles.scrollBody}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={true}
        >
          {/* Header */}
          <View style={styles.blueHeader}>
            <View style={styles.headerTitleRow}>
              <ThemedText style={styles.headerTitleText}>
                Due Portfolio
              </ThemedText>
            </View>
            {organizationName ? (
              <ThemedText style={styles.headerSubtitle}>
                {organizationName}
              </ThemedText>
            ) : null}
          </View>

          {/* Organization Selector */}
          {organizations.length > 0 && (
            <View style={styles.orgCard}>
              <View style={styles.orgHeader}>
                <Ionicons name="business" size={18} color="#093" />
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
            </View>
          )}

          {/* Search & Filter */}
          <View style={styles.filterCard}>
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search Customer..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                onSubmitEditing={handleSearchAction}
              />
            </View>
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={styles.filterBtn}
                onPress={() => setStatusModalVisible(true)}
              >
                <ThemedText style={styles.filterText}>
                  Status: {selectedStatus}
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.searchActionBtn}
                onPress={handleSearchAction}
              >
                <ThemedText style={styles.btnTxtWhite}>Search</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsContainer}>
            <View style={styles.statsCard}>
              <View style={[styles.statsIcon, { backgroundColor: "#E3F2FD" }]}>
                <FontAwesome5 name="shopping-cart" size={20} color="#007BFF" />
              </View>
              <View>
                <ThemedText style={styles.statsVal}>
                  ৳{summary.TotalSales}
                </ThemedText>
                <ThemedText style={styles.statsTitle}>Total Sales</ThemedText>
              </View>
            </View>

            <View style={styles.statsCard}>
              <View style={[styles.statsIcon, { backgroundColor: "#E8F5E9" }]}>
                <FontAwesome5
                  name="hand-holding-usd"
                  size={20}
                  color="#28A745"
                />
              </View>
              <View>
                <ThemedText style={styles.statsVal}>
                  ৳{summary.TotalReceived}
                </ThemedText>
                <ThemedText style={styles.statsTitle}>
                  Total Received
                </ThemedText>
              </View>
            </View>

            <View style={styles.statsCard}>
              <View style={[styles.statsIcon, { backgroundColor: "#FFEBEE" }]}>
                <FontAwesome5
                  name="exclamation-triangle"
                  size={20}
                  color="#DC3545"
                />
              </View>
              <View>
                <ThemedText style={styles.statsVal}>
                  ৳{summary.TotalDue}
                </ThemedText>
                <ThemedText style={styles.statsTitle}>Total Due</ThemedText>
              </View>
            </View>

            <View style={styles.statsCard}>
              <View style={[styles.statsIcon, { backgroundColor: "#F3E5F5" }]}>
                <FontAwesome5 name="users" size={20} color="#6F42C1" />
              </View>
              <View>
                <ThemedText style={styles.statsVal}>
                  {summary.CustomersWithDue}
                </ThemedText>
                <ThemedText style={styles.statsTitle}>Customers</ThemedText>
              </View>
            </View>
          </View>

          {/* Customer List */}
          <ThemedText style={styles.sectionTitle}>
            Customer Due Details
          </ThemedText>

          {filteredCustomers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialIcons name="info" size={50} color="#ccc" />
              <ThemedText style={styles.emptyText}>
                No customers found
              </ThemedText>
            </View>
          ) : (
            filteredCustomers.map((item) => (
              <View key={item.CustomerId} style={styles.customerCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.customerInfo}>
                    <ThemedText style={styles.customerName}>
                      {item.CustomerName}
                    </ThemedText>
                    <ThemedText style={styles.phoneTxt}>
                      {item.CustomerPhone || "No Phone"}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          item.PaymentStatus === "Unpaid" ? "#f8d7da" : "#fff3cd",
                      },
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.statusText,
                        {
                          color:
                            item.PaymentStatus === "Unpaid"
                              ? "#721c24"
                              : "#856404",
                        },
                      ]}
                    >
                      {item.PaymentStatus}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.infoGrid}>
                  <View style={styles.infoBox}>
                    <ThemedText style={styles.infoLabel}>Total Sale</ThemedText>
                    <ThemedText style={styles.infoVal}>
                      ৳{item.TotalSale}
                    </ThemedText>
                  </View>
                  <View style={styles.infoBox}>
                    <ThemedText style={styles.infoLabel}>Total Paid</ThemedText>
                    <ThemedText style={styles.infoVal}>
                      ৳{item.TotalPaid}
                    </ThemedText>
                  </View>
                  <View style={styles.infoBox}>
                    <ThemedText style={styles.infoLabel}>Due Amount</ThemedText>
                    <ThemedText style={[styles.infoVal, { color: "#DC3545" }]}>
                      ৳{item.DueAmount}
                    </ThemedText>
                  </View>
                </View>

                <ThemedText style={styles.lastDate}>
                  Last Transaction: {formatDate(item.LastTransactionDate)}
                </ThemedText>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: "#28A745" }]}
                    onPress={() => openReceivePayment(item)}
                  >
                    <Ionicons name="download-outline" size={14} color="white" />
                    <ThemedText style={styles.btnTxtWhite}> Receive</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionBtn,
                      { backgroundColor: "#6F42C1", marginLeft: 10 },
                    ]}
                    onPress={() => openBulkPayment(item)}
                  >
                    <MaterialIcons name="payment" size={14} color="white" />
                    <ThemedText style={styles.btnTxtWhite}> Pay Bulk</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Status Modal */}
      <Modal visible={statusModalVisible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setStatusModalVisible(false)}
        >
          <View style={styles.modalMenu}>
            {["All", "Partial", "Unpaid"].map((status) => (
              <TouchableOpacity
                key={status}
                style={styles.menuItem}
                onPress={() => {
                  setSelectedStatus(status);
                  setStatusModalVisible(false);
                  handleSearchAction();
                }}
              >
                <ThemedText>{status}</ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Receive Payment Modal */}
      <Modal
        visible={receiveModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setReceiveModalVisible(false);
          setCustomerDetails(null);
          setSelectedTransactionsForReceive([]);
          setExpandedTransactions(new Set());
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalFormContent, { maxHeight: "90%" }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <ThemedText style={styles.formTitle}>Receive Payment</ThemedText>

              <View style={styles.customerInfoBox}>
                <ThemedText style={styles.customerNameLarge}>
                  {selectedCustomer?.CustomerName}
                </ThemedText>
                <ThemedText style={styles.customerPhoneLarge}>
                  {selectedCustomer?.CustomerPhone || "No Phone"}
                </ThemedText>
              </View>

              {customerDetails?.dueSummary && (
                <View style={styles.dueSummaryBox}>
                  <View style={styles.dueSummaryRow}>
                    <ThemedText style={styles.dueSummaryLabel}>
                      Total Sale:
                    </ThemedText>
                    <ThemedText style={styles.dueSummaryValue}>
                      ৳{customerDetails.dueSummary.TotalSale}
                    </ThemedText>
                  </View>
                  <View style={styles.dueSummaryRow}>
                    <ThemedText style={styles.dueSummaryLabel}>
                      Total Paid:
                    </ThemedText>
                    <ThemedText style={styles.dueSummaryValue}>
                      ৳{customerDetails.dueSummary.TotalPaid}
                    </ThemedText>
                  </View>
                  <View style={styles.dueSummaryRow}>
                    <ThemedText style={styles.dueSummaryLabel}>
                      Total Due:
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.dueSummaryValue,
                        { color: "#DC3545", fontWeight: "bold" },
                      ]}
                    >
                      ৳{customerDetails.dueSummary.TotalDue}
                    </ThemedText>
                  </View>
                </View>
              )}

              {loadingDetails ? (
                <ActivityIndicator
                  size="large"
                  color="#093"
                  style={{ marginVertical: 20 }}
                />
              ) : (
                <>
                  {(!customerDetails?.transactions ||
                    customerDetails.transactions.filter(
                      (t) =>
                        (t.PaymentStatus === "Unpaid" ||
                          t.PaymentStatus === "Partial") &&
                        t.DueAmount > 0,
                    ).length === 0) && (
                    <View style={styles.noTransactionsCard}>
                      <MaterialIcons name="info" size={40} color="#999" />
                      <ThemedText style={styles.noTransactionsText}>
                        No unpaid or partial transactions found
                      </ThemedText>
                    </View>
                  )}

                  <View style={styles.selectedSummary}>
                    <View style={styles.selectedInfo}>
                      <MaterialIcons
                        name="check-circle"
                        size={16}
                        color="#28A745"
                      />
                      <ThemedText style={styles.selectedCountText}>
                        Selected: {selectedTransactionsForReceive.length}
                      </ThemedText>
                    </View>
                    <View style={styles.selectedTotalInfo}>
                      <ThemedText style={styles.selectedTotalLabel}>
                        Total Due:
                      </ThemedText>
                      <ThemedText style={styles.selectedTotalValue}>
                        ৳{calculateTotalSelectedAmountReceive().toFixed(2)}
                      </ThemedText>
                    </View>
                  </View>
                </>
              )}

              <ThemedText style={styles.fieldLabel}>
                Payment Amount *
              </ThemedText>
              <TextInput
                style={styles.inputField}
                keyboardType="numeric"
                placeholder="Enter payment amount"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
              />

              <ThemedText style={styles.fieldLabel}>Payment Date *</ThemedText>
              <TouchableOpacity
                style={styles.inputField}
                onPress={() => setShowDatePicker(true)}
              >
                <ThemedText>{paymentDate.toLocaleDateString()}</ThemedText>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={paymentDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setPaymentDate(selectedDate);
                    }
                  }}
                />
              )}

              <ThemedText style={styles.fieldLabel}>Payment Method</ThemedText>
              <View style={styles.methodContainer}>
                {["Cash", "Bank", "bKash"].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.methodTab,
                      paymentMethod === m && styles.methodTabActive,
                    ]}
                    onPress={() => setPaymentMethod(m)}
                  >
                    <ThemedText
                      style={
                        paymentMethod === m
                          ? { color: "#fff" }
                          : { color: "#333" }
                      }
                    >
                      {m}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText style={styles.fieldLabel}>
                Reference ID (Optional)
              </ThemedText>
              <TextInput
                style={styles.inputField}
                placeholder="Enter reference number"
                value={referenceNo}
                onChangeText={setReferenceNo}
              />

              <ThemedText style={styles.fieldLabel}>
                Remarks (Optional)
              </ThemedText>
              <TextInput
                style={[styles.inputField, styles.textArea]}
                placeholder="Add specific note..."
                value={remarks}
                onChangeText={setRemarks}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <View
                style={[styles.filterRow, { marginTop: 20, marginBottom: 10 }]}
              >
                <TouchableOpacity
                  style={[styles.filterBtn, { borderColor: "#dc3545" }]}
                  onPress={() => {
                    setReceiveModalVisible(false);
                    setPaymentAmount("");
                    setReferenceNo("");
                    setRemarks("");
                    setPaymentMethod("Cash");
                    setPaymentDate(new Date());
                    setSelectedCustomer(null);
                    setCustomerDetails(null);
                    setSelectedTransactionsForReceive([]);
                    setExpandedTransactions(new Set());
                  }}
                >
                  <ThemedText style={{ color: "#dc3545" }}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.searchActionBtn,
                    { backgroundColor: "#28A745" },
                  ]}
                  onPress={handleReceivePayment}
                  disabled={
                    submitting ||
                    loadingDetails ||
                    selectedTransactionsForReceive.length === 0
                  }
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <ThemedText style={styles.btnTxtWhite}>
                      Submit Payment
                    </ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bulk Payment Modal */}
      <Modal
        visible={bulkModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setBulkModalVisible(false);
          setCustomerDetails(null);
          setSelectedTransactions([]);
          setExpandedTransactions(new Set());
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalFormContent, { maxHeight: "90%" }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <ThemedText style={styles.formTitle}>Bulk Payment</ThemedText>

              <View style={styles.customerInfoBox}>
                <ThemedText style={styles.customerNameLarge}>
                  {selectedCustomer?.CustomerName}
                </ThemedText>
                <ThemedText style={styles.customerPhoneLarge}>
                  {selectedCustomer?.CustomerPhone || "No Phone"}
                </ThemedText>
              </View>

              {customerDetails?.dueSummary && (
                <View style={styles.dueSummaryBox}>
                  <View style={styles.dueSummaryRow}>
                    <ThemedText style={styles.dueSummaryLabel}>
                      Total Sale:
                    </ThemedText>
                    <ThemedText style={styles.dueSummaryValue}>
                      ৳{customerDetails.dueSummary.TotalSale}
                    </ThemedText>
                  </View>
                  <View style={styles.dueSummaryRow}>
                    <ThemedText style={styles.dueSummaryLabel}>
                      Total Paid:
                    </ThemedText>
                    <ThemedText style={styles.dueSummaryValue}>
                      ৳{customerDetails.dueSummary.TotalPaid}
                    </ThemedText>
                  </View>
                  <View style={styles.dueSummaryRow}>
                    <ThemedText style={styles.dueSummaryLabel}>
                      Total Due:
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.dueSummaryValue,
                        { color: "#DC3545", fontWeight: "bold" },
                      ]}
                    >
                      ৳{customerDetails.dueSummary.TotalDue}
                    </ThemedText>
                  </View>
                </View>
              )}

              <ThemedText style={[styles.fieldLabel, { marginTop: 10 }]}>
                Select Transactions
              </ThemedText>

              {loadingDetails ? (
                <ActivityIndicator
                  size="large"
                  color="#093"
                  style={{ marginVertical: 20 }}
                />
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.selectAllBtn}
                    onPress={toggleSelectAll}
                  >
                    <ThemedText style={styles.selectAllText}>
                      {selectedTransactions.length > 0 &&
                      customerDetails?.transactions?.filter(
                        (t) =>
                          (t.PaymentStatus === "Unpaid" ||
                            t.PaymentStatus === "Partial") &&
                          t.DueAmount > 0,
                      ).length === selectedTransactions.length
                        ? "Deselect All"
                        : "Select All"}
                    </ThemedText>
                  </TouchableOpacity>

                  <View style={styles.transactionsList}>
                    {customerDetails?.transactions
                      ?.filter(
                        (t) =>
                          (t.PaymentStatus === "Unpaid" ||
                            t.PaymentStatus === "Partial") &&
                          t.DueAmount > 0,
                      )
                      .map((transaction) => (
                        <View
                          key={transaction.TransactionNumber}
                          style={styles.transactionItem}
                        >
                          <View style={styles.transactionCheckboxRow}>
                            <Checkbox
                              value={selectedTransactions.includes(
                                transaction.TransactionNumber,
                              )}
                              onValueChange={() =>
                                toggleTransactionSelection(
                                  transaction.TransactionNumber,
                                )
                              }
                              color={
                                selectedTransactions.includes(
                                  transaction.TransactionNumber,
                                )
                                  ? "#28A745"
                                  : undefined
                              }
                            />
                            <TouchableOpacity
                              style={styles.transactionInfoArea}
                              onPress={() =>
                                toggleTransactionExpand(
                                  transaction.TransactionNumber,
                                )
                              }
                            >
                              <View style={styles.transactionHeaderInfo}>
                                <ThemedText style={styles.transactionNumber}>
                                  {transaction.TransactionNumber}
                                </ThemedText>
                                <View
                                  style={[
                                    styles.statusBadgeSmall,
                                    {
                                      backgroundColor:
                                        transaction.PaymentStatus === "Unpaid"
                                          ? "#f8d7da"
                                          : "#fff3cd",
                                    },
                                  ]}
                                >
                                  <ThemedText
                                    style={[
                                      styles.statusTextSmall,
                                      {
                                        color:
                                          transaction.PaymentStatus === "Unpaid"
                                            ? "#721c24"
                                            : "#856404",
                                      },
                                    ]}
                                  >
                                    {transaction.PaymentStatus}
                                  </ThemedText>
                                </View>
                              </View>
                              <ThemedText style={styles.transactionDate}>
                                {formatDate(transaction.TransactionDate)}
                              </ThemedText>
                              <View style={styles.transactionAmounts}>
                                <ThemedText
                                  style={styles.transactionTotalAmount}
                                >
                                  Total: ৳{transaction.TotalSale}
                                </ThemedText>
                                <ThemedText style={styles.transactionDueAmount}>
                                  Due: ৳{transaction.DueAmount}
                                </ThemedText>
                              </View>
                              <View style={styles.expandIcon}>
                                <Ionicons
                                  name={
                                    expandedTransactions.has(
                                      transaction.TransactionNumber,
                                    )
                                      ? "chevron-up"
                                      : "chevron-down"
                                  }
                                  size={20}
                                  color="#666"
                                />
                              </View>
                            </TouchableOpacity>
                          </View>

                          {expandedTransactions.has(
                            transaction.TransactionNumber,
                          ) &&
                            transaction.products &&
                            transaction.products.length > 0 && (
                              <View style={styles.productsSection}>
                                <View style={styles.productsHeader}>
                                  <MaterialIcons
                                    name="shopping-bag"
                                    size={16}
                                    color="#093"
                                  />
                                  <ThemedText style={styles.productsTitle}>
                                    Products
                                  </ThemedText>
                                </View>
                                {transaction.products.map((product) => (
                                  <View
                                    key={product.ProductId}
                                    style={styles.productCard}
                                  >
                                    <ThemedText style={styles.productName}>
                                      {product.ProductName}
                                    </ThemedText>
                                    <View style={styles.productStats}>
                                      <View style={styles.productStat}>
                                        <ThemedText
                                          style={styles.productStatLabel}
                                        >
                                          Amount:
                                        </ThemedText>
                                        <ThemedText
                                          style={styles.productStatValue}
                                        >
                                          ৳{product.SaleAmount}
                                        </ThemedText>
                                      </View>
                                      <View style={styles.productStat}>
                                        <ThemedText
                                          style={styles.productStatLabel}
                                        >
                                          Paid:
                                        </ThemedText>
                                        <ThemedText
                                          style={styles.productStatValue}
                                        >
                                          ৳{product.PaidAmount}
                                        </ThemedText>
                                      </View>
                                      <View style={styles.productStat}>
                                        <ThemedText
                                          style={styles.productStatLabel}
                                        >
                                          Due:
                                        </ThemedText>
                                        <ThemedText
                                          style={[
                                            styles.productStatValue,
                                            { color: "#DC3545" },
                                          ]}
                                        >
                                          ৳{product.DueAmount.toFixed(2)}
                                        </ThemedText>
                                      </View>
                                    </View>
                                  </View>
                                ))}
                              </View>
                            )}
                        </View>
                      ))}
                  </View>

                  {(!customerDetails?.transactions ||
                    customerDetails.transactions.filter(
                      (t) =>
                        (t.PaymentStatus === "Unpaid" ||
                          t.PaymentStatus === "Partial") &&
                        t.DueAmount > 0,
                    ).length === 0) && (
                    <View style={styles.noTransactionsCard}>
                      <MaterialIcons name="info" size={40} color="#999" />
                      <ThemedText style={styles.noTransactionsText}>
                        No unpaid or partial transactions found
                      </ThemedText>
                    </View>
                  )}

                  <View style={styles.selectedSummary}>
                    <View style={styles.selectedInfo}>
                      <MaterialIcons
                        name="check-circle"
                        size={16}
                        color="#28A745"
                      />
                      <ThemedText style={styles.selectedCountText}>
                        Selected: {selectedTransactions.length}
                      </ThemedText>
                    </View>
                    <View style={styles.selectedTotalInfo}>
                      <ThemedText style={styles.selectedTotalLabel}>
                        Total Due:
                      </ThemedText>
                      <ThemedText style={styles.selectedTotalValue}>
                        ৳{calculateTotalSelectedAmount().toFixed(2)}
                      </ThemedText>
                    </View>
                  </View>
                </>
              )}

              <ThemedText style={styles.fieldLabel}>
                Payment Amount *
              </ThemedText>
              <TextInput
                style={styles.inputField}
                keyboardType="numeric"
                placeholder="Enter payment amount"
                value={paymentAmount}
                onChangeText={setPaymentAmount}
              />

              <ThemedText style={styles.fieldLabel}>Payment Date *</ThemedText>
              <TouchableOpacity
                style={styles.inputField}
                onPress={() => setShowDatePicker(true)}
              >
                <ThemedText>{paymentDate.toLocaleDateString()}</ThemedText>
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={paymentDate}
                  mode="date"
                  display="default"
                  onChange={(event, selectedDate) => {
                    setShowDatePicker(false);
                    if (selectedDate) {
                      setPaymentDate(selectedDate);
                    }
                  }}
                />
              )}

              <ThemedText style={styles.fieldLabel}>Payment Method</ThemedText>
              <View style={styles.methodContainer}>
                {["Cash", "Bank", "bKash"].map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.methodTab,
                      paymentMethod === m && styles.methodTabActive,
                    ]}
                    onPress={() => setPaymentMethod(m)}
                  >
                    <ThemedText
                      style={
                        paymentMethod === m
                          ? { color: "#fff" }
                          : { color: "#333" }
                      }
                    >
                      {m}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>

              <ThemedText style={styles.fieldLabel}>
                Reference ID (Optional)
              </ThemedText>
              <TextInput
                style={styles.inputField}
                placeholder="Enter reference number"
                value={referenceNo}
                onChangeText={setReferenceNo}
              />

              <ThemedText style={styles.fieldLabel}>
                Remarks (Optional)
              </ThemedText>
              <TextInput
                style={[styles.inputField, styles.textArea]}
                placeholder="Add specific note..."
                value={remarks}
                onChangeText={setRemarks}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              <View
                style={[styles.filterRow, { marginTop: 20, marginBottom: 10 }]}
              >
                <TouchableOpacity
                  style={[styles.filterBtn, { borderColor: "#dc3545" }]}
                  onPress={() => {
                    setBulkModalVisible(false);
                    setPaymentAmount("");
                    setReferenceNo("");
                    setRemarks("");
                    setPaymentMethod("Cash");
                    setPaymentDate(new Date());
                    setSelectedCustomer(null);
                    setCustomerDetails(null);
                    setSelectedTransactions([]);
                    setExpandedTransactions(new Set());
                  }}
                >
                  <ThemedText style={{ color: "#dc3545" }}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.searchActionBtn,
                    { backgroundColor: "#28A745" },
                  ]}
                  onPress={handleMakeBulkPayment}
                  disabled={
                    submitting ||
                    loadingDetails ||
                    selectedTransactions.length === 0
                  }
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <ThemedText style={styles.btnTxtWhite}>
                      Submit Payment
                    </ThemedText>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  blueHeader: {
    backgroundColor: "#093",
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    marginBottom: 20,
  },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitleText: { color: "white", fontSize: 18, fontWeight: "bold" },
  headerSubtitle: { color: "white", fontSize: 12, marginTop: 4, opacity: 0.9 },

  container: { flex: 1, backgroundColor: "#F0F2F5" },
  scrollBody: { padding: 15, paddingBottom: 30 },
  centerLoading: { flex: 1, justifyContent: "center", alignItems: "center" },

  orgCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
  },
  orgHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  orgTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginLeft: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    backgroundColor: "#FAFAFA",
    overflow: "hidden",
  },
  picker: {
    height: 50,
    width: "100%",
  },

  filterCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  searchInput: { flex: 1, height: 40, marginLeft: 8, fontSize: 14 },
  filterRow: { flexDirection: "row", marginTop: 10, gap: 10 },
  filterBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    height: 40,
    backgroundColor: "#fff",
  },
  filterText: { fontSize: 13, color: "#666" },
  searchActionBtn: {
    flex: 1,
    backgroundColor: "#007BFF",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    height: 40,
  },

  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statsCard: {
    backgroundColor: "white",
    width: "48%",
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },
  statsIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  statsVal: { fontSize: 16, fontWeight: "bold", color: "#333" },
  statsTitle: { fontSize: 11, color: "#888", marginTop: 2 },

  sectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  customerCard: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  customerInfo: { flex: 1 },
  customerName: { fontSize: 15, fontWeight: "bold", color: "#333" },
  phoneTxt: { fontSize: 12, color: "#666", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: "bold" },

  divider: { height: 1, backgroundColor: "#F0F0F0", marginVertical: 12 },
  infoGrid: { flexDirection: "row", justifyContent: "space-between" },
  infoBox: { flex: 1 },
  infoLabel: { fontSize: 10, color: "#999" },
  infoVal: { fontSize: 13, fontWeight: "bold", marginTop: 2 },
  lastDate: { fontSize: 11, color: "#888", marginTop: 10, fontStyle: "italic" },

  actionRow: { flexDirection: "row", marginTop: 15, gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    height: 38,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  btnTxtWhite: {
    color: "white",
    fontSize: 13,
    fontWeight: "bold",
    marginLeft: 5,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalMenu: {
    backgroundColor: "#fff",
    width: "70%",
    borderRadius: 8,
    padding: 10,
  },
  menuItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    alignItems: "center",
  },

  modalFormContent: {
    backgroundColor: "#fff",
    width: "90%",
    maxHeight: "85%",
    borderRadius: 12,
    padding: 20,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
    textAlign: "center",
  },
  customerInfoBox: {
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  customerNameLarge: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#093",
    marginBottom: 4,
  },
  customerPhoneLarge: { fontSize: 14, color: "#666" },
  fieldLabel: {
    fontSize: 13,
    color: "#555",
    marginTop: 10,
    marginBottom: 5,
    fontWeight: "500",
  },
  inputField: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    height: 44,
    paddingHorizontal: 12,
    fontSize: 14,
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  textArea: { height: 80, paddingTop: 10 },
  disabledField: { backgroundColor: "#F5F5F5", borderColor: "#E0E0E0" },
  dueAmountText: { fontSize: 16, fontWeight: "bold", color: "#DC3545" },
  methodContainer: { flexDirection: "row", gap: 8, marginVertical: 5 },
  methodTab: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ccc",
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  methodTabActive: { backgroundColor: "#28A745", borderColor: "#28A745" },

  dueSummaryBox: {
    backgroundColor: "#E8F5E9",
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
  },
  dueSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  dueSummaryLabel: { fontSize: 13, color: "#555" },
  dueSummaryValue: { fontSize: 13, fontWeight: "bold", color: "#333" },
  selectAllBtn: {
    backgroundColor: "#007BFF",
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 12,
  },
  selectAllText: { color: "white", fontSize: 13, fontWeight: "bold" },

  transactionsList: {
    marginBottom: 10,
  },
  transactionItem: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 10,
    marginBottom: 10,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  transactionCheckboxRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  transactionInfoArea: {
    flex: 1,
  },
  transactionHeaderInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    flexWrap: "wrap",
    gap: 8,
  },
  transactionNumber: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
  },
  statusBadgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusTextSmall: {
    fontSize: 10,
    fontWeight: "bold",
  },
  transactionDate: {
    fontSize: 11,
    color: "#666",
    marginBottom: 4,
  },
  transactionAmounts: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  transactionTotalAmount: {
    fontSize: 12,
    fontWeight: "500",
    color: "#093",
  },
  transactionDueAmount: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#DC3545",
  },
  expandIcon: {
    position: "absolute",
    right: 0,
    top: 44,
  },
  productsSection: {
    padding: 12,
    backgroundColor: "#F8F9FA",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  productsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  productsTitle: {
    fontSize: 13,
    fontWeight: "bold",
    color: "#093",
  },
  productCard: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E8E8E8",
  },
  productName: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  productStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  productStat: {
    flex: 1,
    minWidth: 80,
  },
  productStatLabel: {
    fontSize: 10,
    color: "#666",
  },
  productStatValue: {
    fontSize: 12,
    fontWeight: "500",
    color: "#333",
    marginTop: 2,
  },
  noTransactionsCard: {
    alignItems: "center",
    padding: 30,
    backgroundColor: "#F8F9FA",
    borderRadius: 8,
  },
  noTransactionsText: {
    textAlign: "center",
    color: "#999",
    marginTop: 10,
  },
  selectedSummary: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#E8F5E9",
    borderRadius: 8,
    marginBottom: 10,
    marginTop: 5,
    flexWrap: "wrap",
    gap: 8,
  },
  selectedInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  selectedCountText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#093",
  },
  selectedTotalInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  selectedTotalLabel: {
    fontSize: 12,
    color: "#555",
  },
  selectedTotalValue: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#DC3545",
  },
  emptyContainer: {
    padding: 50,
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 15,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    marginTop: 10,
  },
});