import { ThemedText } from "@/components/themed-text";
import { FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

// API Interface Mappings
interface DueCustomer {
  CustomerId: number;
  CustomerName: string;
  CustomerPhone: string;
  TotalSale: number;
  TotalPaid: number;
  DueAmount: number;
  Status: string;
  LastTransactionDate: string;
}

interface DueSummary {
  TotalSales: number;
  TotalReceived: number;
  TotalDue: number;
  CustomersWithDue: number;
}

export default function CustomerDueListMobile() {
  const apiKey = "3A734AC6-A521-4192-984D-08D082B83456";
  const orgId = 3;

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
  const [paymentModalVisible, setPaymentModalVisible] =
    useState<boolean>(false);
  const [bulkModalVisible, setBulkModalVisible] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Form Fields
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Cash");
  const [referenceNo, setReferenceNo] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);

  const scrollViewRef = useRef<ScrollView>(null);

  // Generate Transaction Number
  const generateTransactionNumber = () => {
    const randomNum = Math.floor(Math.random() * 1000000)
      .toString()
      .padStart(6, "0");
    return `BHP${randomNum}`;
  };

  // Initial Fetch Data
  const fetchDueData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        "http://devmystock.byteheart.com/Due/Index",
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
      if (result.success) {
        setAllCustomers(result.data || []);
        setFilteredCustomers(result.data || []);
        if (result.summary) {
          setSummary(result.summary);
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

  useEffect(() => {
    fetchDueData();
  }, []);

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
        (item) => item.Status.toLowerCase() === selectedStatus.toLowerCase(),
      );
    }
    setFilteredCustomers(result);
  };

  // Format Date for display - Fixed to show properly
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
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

  // POST: Make Single Payment
const handleMakePayment = async () => {
  if (!selectedCustomer) {
    return Alert.alert("Error", "No customer selected");
  }
  
  if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
    return Alert.alert("Validation Error", "Please provide a valid amount");
  }

  // Get fresh customer data to check current due amount
  const currentDue = selectedCustomer.DueAmount;
  
  if (parseFloat(paymentAmount) > currentDue) {
    return Alert.alert(
      "Validation Error", 
      `Payment amount (${paymentAmount}) cannot exceed due amount (${currentDue})`
    );
  }

  setSubmitting(true);

  const transactionNumber = generateTransactionNumber();
  const formattedDate = formatDateForAPI(paymentDate);
  
  // Create payload - match exactly with Postman
  const payload: any = {
    TransactionNumber: transactionNumber,
    PaymentAmount: parseFloat(paymentAmount),
    PaymentDate: formattedDate,
    PaymentMethod: paymentMethod,
    CustomerId: selectedCustomer.CustomerId,
    OrganizationId: orgId,
  };

  // Only add ReferenceNumber if it has value and not empty
  if (referenceNo && referenceNo.trim() !== "") {
    payload.ReferenceNumber = referenceNo.trim();
  }

  // Only add Remarks if it has value and not empty
  if (remarks && remarks.trim() !== "") {
    payload.Remarks = remarks.trim();
  }

  console.log("=== Sending Payment Request ===");
  console.log("Customer:", selectedCustomer.CustomerName);
  console.log("Current Due:", currentDue);
  console.log("Payment Amount:", payload.PaymentAmount);
  console.log("Full Payload:", JSON.stringify(payload, null, 2));

  try {
    const response = await fetch(
      "http://devmystock.byteheart.com/Due/MakePayment",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify(payload),
      },
    );

    const result = await response.json();
    console.log("=== Payment Response ===");
    console.log("Success:", result.Success);
    console.log("Message:", result.Message);
    console.log("Amount Paid:", result.AmountPaid);
    console.log("Remaining Due:", result.RemainingDue);
    console.log("Full Response:", JSON.stringify(result, null, 2));

    if (response.ok && result.Success === true) {
      Alert.alert(
        "Success", 
        `${result.Message}\nAmount Paid: ${result.AmountPaid}\nRemaining Due: ${result.RemainingDue}`
      );
      setPaymentModalVisible(false);
      // Reset form
      setPaymentAmount("");
      setReferenceNo("");
      setRemarks("");
      setPaymentMethod("Cash");
      setPaymentDate(new Date());
      setSelectedCustomer(null);
      // Refresh data to get updated due amounts
      await fetchDueData();
    } else {
      Alert.alert("Payment Failed", result.Message || "Payment could not be processed");
    }
  } catch (err) {
    console.error("Payment error:", err);
    Alert.alert("Error", "Network error occurred. Please check your connection.");
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

    setSubmitting(true);

    const formattedDate = formatDateForAPI(paymentDate);

    const payload: any = {
      CustomerId: selectedCustomer.CustomerId,
      PaymentAmount: parseFloat(paymentAmount),
      PaymentDate: formattedDate,
      PaymentMethod: paymentMethod,
      OrganizationId: orgId,
      PaymentTransactionNumber: `PAY-${Date.now()}`,
      SelectedTransactions: "TXN-1001,TXN-1002",
    };

    // Only add ReferenceNumber if it has value
    if (referenceNo && referenceNo.trim() !== "") {
      payload.ReferenceNumber = referenceNo;
    }

    // Only add Remarks if it has value
    if (remarks && remarks.trim() !== "") {
      payload.Remarks = remarks;
    }

    console.log("Sending bulk payload:", JSON.stringify(payload, null, 2));

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
      console.log("Bulk Response:", result);

      if (response.ok && result.Success) {
        Alert.alert(
          "Bulk Success",
          result.Message || "Bulk payments distributed successfully.",
        );
        setBulkModalVisible(false);
        // Reset form
        setPaymentAmount("");
        setReferenceNo("");
        setRemarks("");
        setPaymentMethod("Cash");
        setPaymentDate(new Date());
        setSelectedCustomer(null);
        fetchDueData();
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

  const openPaymentSetup = async (customer: DueCustomer, isBulk: boolean) => {
  // First refresh the customer data to get latest due amount
  setLoading(true);
  try {
    const response = await fetch(
      "http://devmystock.byteheart.com/Due/Index",
      {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      },
    );
    
    const result = await response.json();
    if (result.success) {
      const updatedCustomer = result.data?.find((c: DueCustomer) => c.CustomerId === customer.CustomerId);
      if (updatedCustomer) {
        setSelectedCustomer(updatedCustomer);
        setPaymentAmount(updatedCustomer.DueAmount.toString());
      } else {
        setSelectedCustomer(customer);
        setPaymentAmount(customer.DueAmount.toString());
      }
    } else {
      setSelectedCustomer(customer);
      setPaymentAmount(customer.DueAmount.toString());
    }
  } catch (error) {
    console.error("Error refreshing customer data:", error);
    setSelectedCustomer(customer);
    setPaymentAmount(customer.DueAmount.toString());
  } finally {
    setLoading(false);
    setReferenceNo("");
    setRemarks("");
    setPaymentMethod("Cash");
    setPaymentDate(new Date());
    if (isBulk) setBulkModalVisible(true);
    else setPaymentModalVisible(true);
  }
};

  if (loading) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color="#093" />
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
          </View>

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

          {filteredCustomers.map((item, index) => (
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
                        item.Status === "Unpaid" ? "#f8d7da" : "#fff3cd",
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.statusText,
                      {
                        color: item.Status === "Unpaid" ? "#721c24" : "#856404",
                      },
                    ]}
                  >
                    {item.Status}
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

              {/* Fixed Last Transaction Date Display */}
              <ThemedText style={styles.lastDate}>
                Last Transaction: {formatDate(item.LastTransactionDate)}
              </ThemedText>

              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#28A745" }]}
                  onPress={() => openPaymentSetup(item, false)}
                >
                  <Ionicons name="download-outline" size={14} color="white" />
                  <ThemedText style={styles.btnTxtWhite}> Receive</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    { backgroundColor: "#6F42C1", marginLeft: 10 },
                  ]}
                  onPress={() => openPaymentSetup(item, true)}
                >
                  <MaterialIcons name="payment" size={14} color="white" />
                  <ThemedText style={styles.btnTxtWhite}> Pay Bulk</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          ))}
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

      {/* Payment Modal */}
      <Modal
        visible={paymentModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalFormContent}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <ThemedText style={styles.formTitle}>
                  Receive Payment
                </ThemedText>

                <View style={styles.customerInfoBox}>
                  <ThemedText style={styles.customerNameLarge}>
                    {selectedCustomer?.CustomerName}
                  </ThemedText>
                  <ThemedText style={styles.customerPhoneLarge}>
                    {selectedCustomer?.CustomerPhone || "No Phone"}
                  </ThemedText>
                </View>

                <ThemedText style={styles.fieldLabel}>Due Amount</ThemedText>
                <View style={[styles.inputField, styles.disabledField]}>
                  <ThemedText style={styles.dueAmountText}>
                    ৳{selectedCustomer?.DueAmount}
                  </ThemedText>
                </View>

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

                <ThemedText style={styles.fieldLabel}>
                  Payment Date *
                </ThemedText>
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

                <ThemedText style={styles.fieldLabel}>
                  Payment Method
                </ThemedText>
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
                  style={[
                    styles.filterRow,
                    { marginTop: 20, marginBottom: 10 },
                  ]}
                >
                  <TouchableOpacity
                    style={[styles.filterBtn, { borderColor: "#dc3545" }]}
                    onPress={() => {
                      setPaymentModalVisible(false);
                      setPaymentAmount("");
                      setReferenceNo("");
                      setRemarks("");
                      setPaymentMethod("Cash");
                      setPaymentDate(new Date());
                    }}
                  >
                    <ThemedText style={{ color: "#dc3545" }}>Cancel</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.searchActionBtn,
                      { backgroundColor: "#28A745" },
                    ]}
                    onPress={handleMakePayment}
                    disabled={submitting}
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
        </TouchableWithoutFeedback>
      </Modal>

      {/* Bulk Payment Modal */}
      <Modal
        visible={bulkModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBulkModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalFormContent}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <ThemedText style={styles.formTitle}>
                  Make Bulk Payment
                </ThemedText>

                <View style={styles.customerInfoBox}>
                  <ThemedText style={styles.customerNameLarge}>
                    {selectedCustomer?.CustomerName}
                  </ThemedText>
                  <ThemedText style={styles.customerPhoneLarge}>
                    {selectedCustomer?.CustomerPhone || "No Phone"}
                  </ThemedText>
                </View>

                <ThemedText style={styles.fieldLabel}>Due Amount</ThemedText>
                <View style={[styles.inputField, styles.disabledField]}>
                  <ThemedText style={styles.dueAmountText}>
                    ৳{selectedCustomer?.DueAmount}
                  </ThemedText>
                </View>

                <ThemedText style={styles.fieldLabel}>Bulk Amount *</ThemedText>
                <TextInput
                  style={styles.inputField}
                  keyboardType="numeric"
                  placeholder="Enter bulk amount"
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                />

                <ThemedText style={styles.fieldLabel}>
                  Payment Date *
                </ThemedText>
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

                <ThemedText style={styles.fieldLabel}>
                  Payment Method
                </ThemedText>
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
                  style={[
                    styles.filterRow,
                    { marginTop: 20, marginBottom: 10 },
                  ]}
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
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <ThemedText style={styles.btnTxtWhite}>
                        Submit Bulk
                      </ThemedText>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </TouchableWithoutFeedback>
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
  },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitleText: { color: "white", fontSize: 18, fontWeight: "bold" },

  container: { flex: 1, backgroundColor: "#F0F2F5" },
  scrollBody: { padding: 15, paddingBottom: 30 },
  centerLoading: { flex: 1, justifyContent: "center", alignItems: "center" },

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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#333",
    textTransform: "capitalize",
  },
  phoneTxt: { fontSize: 12, color: "#666", marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: "bold" },

  divider: { height: 1, backgroundColor: "#F0F0F0", marginVertical: 12 },
  infoGrid: { flexDirection: "row", justifyContent: "space-between" },
  infoBox: { flex: 1 },
  infoLabel: { fontSize: 10, color: "#999" },
  infoVal: { fontSize: 13, fontWeight: "bold", marginTop: 2 },
  lastDate: { fontSize: 11, color: "#888", marginTop: 10, fontStyle: "italic" },

  actionRow: { flexDirection: "row", marginTop: 15 },
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
    marginBottom: 15,
    alignItems: "center",
  },
  customerNameLarge: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#093",
    marginBottom: 4,
  },
  customerPhoneLarge: {
    fontSize: 14,
    color: "#666",
  },
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
  textArea: {
    height: 80,
    paddingTop: 10,
  },
  disabledField: {
    backgroundColor: "#F5F5F5",
    borderColor: "#E0E0E0",
  },
  dueAmountText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#DC3545",
  },
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
});
