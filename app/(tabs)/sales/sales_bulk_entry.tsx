import { ThemedText } from "@/components/themed-text";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
} from "react-native";

// API Configuration
const API_KEY = "3A734AC6-A521-4192-984D-08D082B83456";
const BASE_URL = "http://devmystock.byteheart.com";

// Helper function for API calls with authentication
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  return response.json();
};

// Calculate profit using FIFO API
const calculateFIFOProfit = async (
  organizationId: number | null,
  productId: number,
  quantity: number,
  salesPrice: number
) => {
  try {
    const data = await apiRequest("/Stock/CalculateFIFOProfit", {
      method: "POST",
      body: JSON.stringify({
        organizationId: organizationId,
        productId: productId,
        quantity: quantity,
        salesPrice: salesPrice,
      }),
    });

    if (data.success && data.data) {
      return {
        totalProfit: data.data.TotalProfit,
        profitPerUnit: data.data.ProfitPerUnit,
        profitPercentage: data.data.ProfitPercentage,
        averageCostPerUnit: data.data.AverageCostPerUnit,
      };
    }
    return null;
  } catch (error) {
    console.error("Error calculating FIFO profit:", error);
    return null;
  }
};

interface ProductRow {
  id: number;
  productId: number;
  productName: string;
  category: string;
  stock: number;
  buyPrice: number;
  salePrice: number;
  qty: string;
  amount: number;
  profit: number;
  profitPercentage: number;
  unitPrice: number;
  loadingProfit: boolean;
}

export default function BulkSalesEntryScreen() {
  // State declarations
  const [productRows, setProductRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const [searchText, setSearchText] = useState("");
  
  // Customer Info State
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  
  // Payment State
  const [paymentAmount, setPaymentAmount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [transactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyExpense, setDailyExpense] = useState("0");
  
  // Summary State
  const [totalItems, setTotalItems] = useState(0);
  const [totalQty, setTotalQty] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [dueAmount, setDueAmount] = useState(0);
  
  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalTitle, setModalTitle] = useState("");
  const [modalType, setModalType] = useState<"success" | "error" | "warning" | "info">("info");
  
  // Organization Info
  const [organizationName, setOrganizationName] = useState("BH Pharma Distribution");

  // Load products on mount
  useEffect(() => {
    fetchAllProducts();
  }, []);

  const fetchAllProducts = async () => {
    try {
      setLoading(true);
      let url = "/Products/GetAllProduct";
      if (organizationId) {
        url += `?OrganizationId=${organizationId}`;
      }

      console.log("Fetching products from:", url);
      const data = await apiRequest(url);
      console.log("Products loaded:", data?.length || 0);

      let productsList = [];

      if (Array.isArray(data)) {
        productsList = data;
      } else if (data && data.data && Array.isArray(data.data)) {
        productsList = data.data;
      } else if (data && data.products && Array.isArray(data.products)) {
        productsList = data.products;
      } else if (data && data.result && Array.isArray(data.result)) {
        productsList = data.result;
      }

      console.log(`Loaded ${productsList.length} products`);
      
      // Create rows for each product
      const rows: ProductRow[] = productsList.map((product: any, index: number) => ({
        id: index + 1,
        productId: product.ProductId,
        productName: product.ProductName,
        category: product.Category || "",
        stock: product.CurrentStock || 0,
        buyPrice: product.UnitPrice || 0,
        salePrice: product.SalesValue || product.UnitPrice || 0,
        qty: "",
        amount: 0,
        profit: 0,
        profitPercentage: 0,
        unitPrice: product.UnitPrice || 0,
        loadingProfit: false,
      }));
      
      setProductRows(rows);
      
      if (productsList.length === 0) {
        Alert.alert("Warning", "No products found. Please check API connection.");
      }
    } catch (error: any) {
      console.error("Error fetching products:", error);
      Alert.alert("Error", `Failed to fetch products: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerByPhoneNumber = async (phone: string) => {
    if (!phone || phone.length < 6) return;
    
    try {
      const response = await apiRequest(`/Stock/GetByPhoneNumber?phoneNumber=${phone}&orgId=${organizationId}`);
      
      if (response.success && response.isData && response.customer) {
        setCustomerName(response.customer.CustomerName || "");
        setEmail(response.customer.Email || "");
        setAddress(response.customer.Address || "");
      }
    } catch (error) {
      console.error("Error loading customer:", error);
    }
  };

  const calculateProfitForRow = async (rowId: number, quantity: number, salesPrice: number) => {
    const row = productRows.find(r => r.id === rowId);
    if (!row) return;

    setProductRows(prevRows =>
      prevRows.map(r =>
        r.id === rowId ? { ...r, loadingProfit: true } : r
      )
    );

    const profitData = await calculateFIFOProfit(
      organizationId,
      row.productId,
      quantity,
      salesPrice
    );

    const totalAmount = salesPrice * quantity;
    const profit = profitData?.totalProfit || totalAmount - (quantity * (row.unitPrice || 0));
    const profitPercentage = profitData?.profitPercentage || 
      (row.unitPrice > 0 ? ((salesPrice - row.unitPrice) / row.unitPrice) * 100 : 0);

    setProductRows(prevRows =>
      prevRows.map(r =>
        r.id === rowId
          ? {
              ...r,
              amount: totalAmount,
              profit: profit,
              profitPercentage: profitPercentage,
              qty: quantity.toString(),
              salePrice: salesPrice,
              loadingProfit: false,
            }
          : r
      )
    );
    updateSummary();
  };

  const onQuantityChange = (rowId: number, qty: string) => {
    const numQty = parseFloat(qty) || 0;
    const row = productRows.find(r => r.id === rowId);
    
    if (row) {
      if (numQty > row.stock) {
        Alert.alert("Stock Error", `Only ${row.stock} available in stock for ${row.productName}`);
        return;
      }
      if (numQty > 0 && row.salePrice > 0) {
        calculateProfitForRow(rowId, numQty, row.salePrice);
      } else {
        setProductRows(prevRows =>
          prevRows.map(r =>
            r.id === rowId
              ? { ...r, qty: qty, amount: 0, profit: 0, profitPercentage: 0 }
              : r
          )
        );
        updateSummary();
      }
    }
  };

  const onSalePriceChange = (rowId: number, price: string) => {
    const numPrice = parseFloat(price) || 0;
    const row = productRows.find(r => r.id === rowId);
    
    if (row) {
      setProductRows(prevRows =>
        prevRows.map(r =>
          r.id === rowId ? { ...r, salePrice: numPrice } : r
        )
      );
      
      const qty = parseFloat(row.qty) || 0;
      if (qty > 0 && numPrice > 0) {
        calculateProfitForRow(rowId, qty, numPrice);
      }
    }
  };

  const updateSummary = useCallback(() => {
    let items = 0;
    let qty = 0;
    let amount = 0;
    let profit = 0;

    productRows.forEach(row => {
      const rowQty = parseFloat(row.qty) || 0;
      if (rowQty > 0) {
        items++;
        qty += rowQty;
        amount += row.amount;
        profit += row.profit;
      }
    });

    setTotalItems(items);
    setTotalQty(qty);
    setTotalAmount(amount);
    setTotalProfit(profit);
    
    const payment = parseFloat(paymentAmount) || 0;
    setDueAmount(amount - payment);
  }, [productRows, paymentAmount]);

  useEffect(() => {
    updateSummary();
  }, [productRows, paymentAmount, updateSummary]);

  // Filter products based on search
  const filteredProducts = productRows.filter(row =>
    row.productName.toLowerCase().includes(searchText.toLowerCase()) ||
    row.category.toLowerCase().includes(searchText.toLowerCase())
  );

  const getCustomerData = () => {
    if (customerName || phoneNumber || email || address) {
      if (!phoneNumber) {
        Alert.alert("Validation Error", "Phone number is required when customer information is provided");
        return null;
      }
      return {
        customerName: customerName || "",
        phoneNumber: phoneNumber,
        email: email || "",
        address: address || "",
      };
    }
    return null;
  };

  const saveAll = async () => {
    const saleItems: any[] = [];

    const totalSaleAmount = totalAmount;
    const payment = parseFloat(paymentAmount) || 0;
    const due = totalSaleAmount - payment;

    // Validate customer data for due payments
    if (due > 0) {
      if (!phoneNumber) {
        Alert.alert("Validation Error", "Phone number is required for due payment transactions");
        return;
      }
      if (!customerName) {
        Alert.alert("Validation Error", "Customer name is required for due payment transactions");
        return;
      }
    }

    // Validate payment method if payment exists
    if (payment > 0 && !paymentMethod) {
      Alert.alert("Validation Error", "Please select a payment method");
      return;
    }

    // Build sale items
    for (const row of productRows) {
      const qty = parseFloat(row.qty) || 0;
      if (qty > 0) {
        if (row.salePrice <= 0) {
          Alert.alert("Validation Error", `Please enter a valid sale price for product ${row.productName}`);
          return;
        }
        
        saleItems.push({
          productId: row.productId,
          productName: row.productName,
          quantity: qty,
          SalesValue: row.salePrice,
          unitPrice: row.unitPrice,
          totalAmount: row.amount,
          profit: row.profit,
          category: row.category,
          organizationId: organizationId || 0,
        });
      }
    }

    if (saleItems.length === 0) {
      Alert.alert("No Items", "Please enter quantities for at least one product");
      return;
    }

    // Prepare sale data
    const saleData: any = {
      transactionDate: new Date().toISOString(),
      dailyExpense: parseFloat(dailyExpense) || 0,
      TransactionType: "OUT",
      items: saleItems,
      organizationId: organizationId,
      PaymentAmount: payment,
      PaymentMethod: paymentMethod,
      PaymentReference: paymentReference,
    };

    const customerData = getCustomerData();
    if (customerData) {
      saleData.customer = customerData;
    }

    setLoading(true);

    try {
      const response = await apiRequest("/Stock/SaveAPI", {
        method: "POST",
        body: JSON.stringify(saleData),
      });

      if (response.Success) {
        const successMessage = `Sales saved successfully!\nTransaction: #${response.TransactionNumber || ""}${
          due > 0 ? `\nDue Amount: ৳${due.toFixed(2)}` : ""
        }`;
        
        Alert.alert("Success", successMessage, [
          { text: "OK", onPress: () => refreshAll() }
        ]);
      } else {
        Alert.alert("Error", response.message || "Error saving sales");
      }
    } catch (error: any) {
      console.error("Error:", error);
      Alert.alert("Error", `Error saving sales: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = () => {
    // Reset all quantities and payments
    setProductRows(prevRows =>
      prevRows.map(row => ({
        ...row,
        qty: "",
        amount: 0,
        profit: 0,
        profitPercentage: 0,
      }))
    );
    setCustomerName("");
    setPhoneNumber("");
    setEmail("");
    setAddress("");
    setPaymentAmount("0");
    setPaymentMethod("Cash");
    setPaymentReference("");
    setDailyExpense("0");
    setSearchText("");
  };

  const showModal = (title: string, message: string, type: "success" | "error" | "warning" | "info") => {
    setModalTitle(title);
    setModalMessage(message);
    setModalType(type);
    setModalVisible(true);
  };

  const getModalColors = () => {
    switch (modalType) {
      case "success": return { header: "#28a745", body: "#d4edda", text: "#155724" };
      case "error": return { header: "#dc3545", body: "#f8d7da", text: "#721c24" };
      case "warning": return { header: "#ffc107", body: "#fff3cd", text: "#856404" };
      default: return { header: "#17a2b8", body: "#d1ecf1", text: "#0c5460" };
    }
  };

  const getStockColor = (stock: number) => {
    if (stock === 0) return "#dc3545";
    if (stock <= 5) return "#ffc107";
    return "#28a745";
  };

  if (loading && productRows.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#28a745" />
          <ThemedText style={{ marginTop: 10 }}>Loading Products...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: getModalColors().body }]}>
            <View style={[styles.modalHeader, { backgroundColor: getModalColors().header }]}>
              <ThemedText style={styles.modalHeaderText}>{modalTitle}</ThemedText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <ThemedText style={[styles.modalMessage, { color: getModalColors().text }]}>
                {modalMessage}
              </ThemedText>
            </View>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: getModalColors().header }]}
              onPress={() => setModalVisible(false)}
            >
              <ThemedText style={styles.modalButtonText}>OK</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.whiteBtn}>
          <ThemedText style={styles.btnTextBlack}>← Back</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.greenBtn} onPress={saveAll}>
          <ThemedText style={styles.btnTextWhite}>Save All</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <ThemedText style={styles.mainTitle}>Bulk Sales Entry</ThemedText>
        <ThemedText style={styles.subTitle}>
          Total Products: {productRows.length} | Items Sold: {totalItems}
        </ThemedText>

        {/* Date & Search */}
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.label}>Date *</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: "#f9f9f9" }]}
                value={transactionDate}
                editable={false}
              />
            </View>
            <View style={{ flex: 2, marginLeft: 10 }}>
              <ThemedText style={styles.label}>Search Product</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Search by name or category..."
                placeholderTextColor="#999"
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.card}>
          <ThemedText style={styles.sectionTitle}>Customer Information</ThemedText>
          <View style={styles.formGrid}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Name</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Enter Name"
                placeholderTextColor="#999"
                value={customerName}
                onChangeText={setCustomerName}
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Phone Number</ThemedText>
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                placeholder="01XXX..."
                placeholderTextColor="#999"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                onBlur={() => loadCustomerByPhoneNumber(phoneNumber)}
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Email</ThemedText>
              <TextInput
                style={styles.input}
                keyboardType="email-address"
                placeholder="example@mail.com"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Address</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Full Address"
                placeholderTextColor="#999"
                value={address}
                onChangeText={setAddress}
              />
            </View>
          </View>
        </View>

        {/* Payment Information */}
        <View style={[styles.card, { backgroundColor: "#e7f3ff", borderColor: "#b6d4fe" }]}>
          <View style={[styles.row, { marginBottom: 10 }]}>
            <Ionicons name="cash-outline" size={18} color="#0d6efd" />
            <ThemedText style={styles.blueTitle}>Payment Information</ThemedText>
          </View>
          <View style={styles.formGrid}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Payment Amount (৳)</ThemedText>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#999"
                value={paymentAmount}
                onChangeText={(text) => {
                  setPaymentAmount(text);
                  updateSummary();
                }}
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Payment Method</ThemedText>
              <View style={styles.pickerWrapper}>
                {/* Using a simple picker alternative for React Native */}
                <TouchableOpacity style={styles.methodSelector} onPress={() => {
                  Alert.alert(
                    "Payment Method",
                    "Select payment method",
                    [
                      { text: "Cash", onPress: () => setPaymentMethod("Cash") },
                      { text: "Bank Transfer", onPress: () => setPaymentMethod("Bank") },
                      { text: "Mobile Banking", onPress: () => setPaymentMethod("Mobile Banking") },
                      { text: "Check", onPress: () => setPaymentMethod("Check") },
                      { text: "Card", onPress: () => setPaymentMethod("Card") },
                    ]
                  );
                }}>
                  <ThemedText style={styles.methodSelectorText}>{paymentMethod}</ThemedText>
                  <Ionicons name="chevron-down" size={18} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Reference (Optional)</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Check/Transaction No"
                placeholderTextColor="#999"
                value={paymentReference}
                onChangeText={setPaymentReference}
              />
            </View>
          </View>
        </View>

        {/* Products Table */}
        <ScrollView horizontal style={{ marginTop: 10 }}>
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <ThemedText style={[styles.hCell, styles.borderRight, { width: 45 }]}>#</ThemedText>
              <ThemedText style={[styles.hCell, styles.borderRight, { width: 180 }]}>Product Name</ThemedText>
              <ThemedText style={[styles.hCell, styles.borderRight, { width: 100 }]}>Category</ThemedText>
              <ThemedText style={[styles.hCell, styles.borderRight, { width: 70 }]}>Stock</ThemedText>
              <ThemedText style={[styles.hCell, styles.borderRight, { width: 80 }]}>Buy(৳)</ThemedText>
              <ThemedText style={[styles.hCell, styles.borderRight, { width: 100 }]}>Sale(৳)</ThemedText>
              <ThemedText style={[styles.hCell, styles.borderRight, { width: 80 }]}>Qty</ThemedText>
              <ThemedText style={[styles.hCell, styles.borderRight, { width: 100 }]}>Amount(৳)</ThemedText>
              <ThemedText style={[styles.hCell, { width: 110 }]}>Profit</ThemedText>
            </View>

            {filteredProducts.length === 0 ? (
              <View style={styles.emptyRow}>
                <ThemedText style={styles.emptyText}>No products found</ThemedText>
              </View>
            ) : (
              filteredProducts.map((item, index) => (
                <View key={item.id} style={styles.tableRow}>
                  <ThemedText style={[styles.cell, styles.borderRight, { width: 45 }]}>
                    {index + 1}
                  </ThemedText>
                  
                  <ThemedText style={[styles.cell, styles.borderRight, { width: 180, textAlign: "left", paddingLeft: 8 }]}>
                    {item.productName}
                  </ThemedText>
                  
                  <ThemedText style={[styles.cell, styles.borderRight, { width: 100 }]}>
                    {item.category}
                  </ThemedText>
                  
                  <ThemedText
                    style={[
                      styles.cell,
                      styles.borderRight,
                      { width: 70, color: getStockColor(item.stock), fontWeight: "bold" },
                    ]}
                  >
                    {item.stock}
                  </ThemedText>
                  
                  <ThemedText style={[styles.cell, styles.borderRight, { width: 80 }]}>
                    {item.buyPrice.toFixed(2)}
                  </ThemedText>
                  
                  {/* Sale Price Input */}
                  <View style={[styles.borderRight, { width: 100, padding: 4 }]}>
                    <TextInput
                      style={styles.tableInput}
                      keyboardType="numeric"
                      placeholder="0"
                      value={item.salePrice.toString()}
                      onChangeText={(text) => onSalePriceChange(item.id, text)}
                    />
                  </View>
                  
                  {/* Quantity Input */}
                  <View style={[styles.borderRight, { width: 80, padding: 4 }]}>
                    <TextInput
                      style={styles.tableInput}
                      keyboardType="numeric"
                      placeholder="0"
                      value={item.qty}
                      onChangeText={(text) => onQuantityChange(item.id, text)}
                    />
                  </View>
                  
                  {/* Amount Display */}
                  <ThemedText style={[styles.cell, styles.borderRight, { width: 100 }]}>
                    {item.amount.toFixed(2)}
                  </ThemedText>
                  
                  {/* Profit Display with Loading */}
                  <View style={[{ width: 110, padding: 4, justifyContent: "center", alignItems: "center" }]}>
                    {item.loadingProfit ? (
                      <ActivityIndicator size="small" color="#28a745" />
                    ) : (
                      <ThemedText style={[styles.cell, { color: item.profit >= 0 ? "#28a745" : "#dc3545" }]}>
                        {item.profit.toFixed(2)} ({item.profitPercentage.toFixed(1)}%)
                      </ThemedText>
                    )}
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>

        {/* Sales Summary */}
        <View style={styles.summaryCard}>
          <ThemedText style={styles.summaryTitle}>SALES SUMMARY - {organizationName}</ThemedText>
          <View style={styles.sumRow}>
            <ThemedText style={styles.sumLabel}>Total Items Sold:</ThemedText>
            <ThemedText style={styles.sumVal}>{totalItems}</ThemedText>
          </View>
          <View style={styles.sumRow}>
            <ThemedText style={styles.sumLabel}>Total Quantity:</ThemedText>
            <ThemedText style={styles.sumVal}>{totalQty.toFixed(2)} pcs</ThemedText>
          </View>
          <View style={styles.sumRow}>
            <ThemedText style={styles.sumLabel}>Total Sales Amount:</ThemedText>
            <ThemedText style={styles.sumVal}>৳{totalAmount.toFixed(2)}</ThemedText>
          </View>
          <View style={styles.sumRow}>
            <ThemedText style={styles.sumLabel}>Total Profit:</ThemedText>
            <ThemedText style={styles.sumVal}>৳{totalProfit.toFixed(2)}</ThemedText>
          </View>
          <View style={styles.sumRow}>
            <ThemedText style={styles.sumLabel}>Payment Amount:</ThemedText>
            <ThemedText style={styles.sumVal}>৳{(parseFloat(paymentAmount) || 0).toFixed(2)}</ThemedText>
          </View>
          <View style={styles.sumRow}>
            <ThemedText style={[styles.sumLabel, { color: "red" }]}>Due Amount:</ThemedText>
            <ThemedText style={{ color: "red", fontWeight: "bold" }}>৳{dueAmount.toFixed(2)}</ThemedText>
          </View>
          <View style={styles.sumRow}>
            <ThemedText style={styles.netProfitText}>NET PROFIT:</ThemedText>
            <ThemedText style={styles.netProfitText}>৳{(totalProfit - (parseFloat(dailyExpense) || 0)).toFixed(2)}</ThemedText>
          </View>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#f8d7da", borderWidth: 1, borderColor: "#f5c6cb" }]}
            onPress={refreshAll}
          >
            <ThemedText style={{ color: "#721c24", fontWeight: "bold" }}>Clear All</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#17a2b8", borderWidth: 1, borderColor: "#148ea1" }]}
            onPress={saveAll}
          >
            <ThemedText style={{ color: "#fff", fontWeight: "bold" }}>Save & Print Invoice</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#28a745" }]}
            onPress={saveAll}
          >
            <ThemedText style={{ color: "#fff", fontWeight: "bold" }}>Save</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7f6" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  topHeader: { flexDirection: "row", justifyContent: "flex-end", padding: 10, gap: 10, backgroundColor: "#fff" },
  scrollView: { padding: 10 },
  mainTitle: { fontSize: 20, color: "#333", marginBottom: 5, fontWeight: "bold" },
  subTitle: { fontSize: 14, color: "#666", marginBottom: 15 },
  card: { backgroundColor: "#fff", padding: 12, borderRadius: 6, marginBottom: 15, borderWidth: 1, borderColor: "#ddd" },
  sectionTitle: { fontSize: 15, fontWeight: "bold", color: "#444", borderBottomWidth: 1, borderBottomColor: "#eee", paddingBottom: 8, marginBottom: 12 },
  blueTitle: { color: "#0d6efd", fontWeight: "bold", fontSize: 15, marginLeft: 8 },
  label: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 5 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 4, paddingHorizontal: 10, height: 45, backgroundColor: "#fff", color: "#000", fontSize: 15 },
  formGrid: { gap: 12 },
  inputGroup: { width: "100%" },
  row: { flexDirection: "row", alignItems: "center" },
  pickerWrapper: { borderWidth: 1, borderColor: "#ccc", borderRadius: 4, height: 45, backgroundColor: "#fff", justifyContent: "center" },
  methodSelector: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 12, height: 45 },
  methodSelectorText: { fontSize: 15, color: "#000" },
  paymentText: { fontSize: 14, fontWeight: "bold" },
  tableContainer: { borderWidth: 1, borderColor: "#aaa", borderRadius: 4, overflow: "hidden", minWidth: "100%" },
  tableHeader: { flexDirection: "row", backgroundColor: "#d1e7dd" },
  tableRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#aaa" },
  hCell: { paddingVertical: 10, textAlign: "center", fontWeight: "bold", fontSize: 12, color: "#333" },
  cell: { paddingVertical: 10, textAlign: "center", fontSize: 13, color: "#333" },
  borderRight: { borderRightWidth: 1, borderRightColor: "#aaa" },
  tableInput: { borderWidth: 1, borderColor: "#bbb", height: 38, textAlign: "center", borderRadius: 3, backgroundColor: "#fff", color: "#000", fontSize: 13, padding: 0 },
  summaryCard: { backgroundColor: "#d4edda", padding: 15, borderRadius: 6, marginTop: 15, borderWidth: 1, borderColor: "#c3e6cb" },
  summaryTitle: { fontSize: 14, color: "#155724", marginBottom: 12, fontWeight: "bold", borderBottomWidth: 1, borderBottomColor: "#c3e6cb", paddingBottom: 5 },
  sumRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: "#badbcc" },
  sumLabel: { fontSize: 14, color: "#444" },
  sumVal: { fontSize: 14, fontWeight: "600" },
  netProfitText: { fontWeight: "bold", fontSize: 16, color: "#155724", marginTop: 8 },
  bottomBar: { flexDirection: "row", justifyContent: "space-between", gap: 8, paddingVertical: 25, paddingBottom: 40 },
  actionBtn: { flex: 1, height: 45, borderRadius: 4, justifyContent: "center", alignItems: "center", padding: 10 },
  greenBtn: { backgroundColor: "#5cb85c", height: 35, paddingHorizontal: 15, borderRadius: 4, justifyContent: "center" },
  whiteBtn: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ccc", height: 35, paddingHorizontal: 15, borderRadius: 4, justifyContent: "center" },
  btnTextWhite: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  btnTextBlack: { color: "#333", fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "85%", borderRadius: 8, overflow: "hidden", backgroundColor: "#fff" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 15 },
  modalHeaderText: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  modalBody: { padding: 20 },
  modalMessage: { fontSize: 16, textAlign: "center" },
  modalButton: { margin: 15, padding: 10, borderRadius: 4, alignItems: "center" },
  modalButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  emptyRow: { padding: 40, alignItems: "center" },
  emptyText: { fontSize: 16, color: "#999" },
});