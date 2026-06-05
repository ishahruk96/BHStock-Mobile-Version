// edit_transaction.tsx
// Route: /EditTransaction
// Usage from sales_list.tsx Edit button:
//   router.push({ pathname: "/EditTransaction", params: { transactionId: item.TransactionId } });

import { ThemedText } from "@/components/themed-text";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

const API_KEY = "3A734AC6-A521-4192-984D-08D082B83456";
const GET_URL = "http://devmystock.byteheart.com/Stock/GetTranscationById";
const UPDATE_URL = "http://devmystock.byteheart.com/Stock/EditTransaction";
const PRODUCTS_URL = "http://devmystock.byteheart.com/Products/GetAllProduct";

// ─── Types ──────────────────────────────────────────────────────

interface TransactionDetail {
  TransactionId: number;
  ProductId: number;
  ProductName: string;
  Category: string;
  TransactionType: string;
  Quantity: number;
  UnitPrice: number;
  TotalAmount: number;
  SalesValue: number;
  CurrentStock: number | null;
  PaymentStatus: string;
  PaymentAmount: number;
  DueAmount: number | null;
  PaymentMethod: string | null;
  PaymentReference: string | null;
  TransactionDate: string;
  TransactionNumber: string;
  Remarks: string;
  OrganizationId: number;
}

interface Product {
  ProductId: number;
  ProductName: string;
  Category: string;
  UnitPrice: number;
  SalesValue: number;
  ProfitPerUnit: number;
  ProfitPercentage: number;
  CurrentStock: number;
  ReorderLevel: number;
  Status: string;
  UnitType: string;
  CreatedDate: string;
  UpdatedDate: string;
  OrganizationId: number;
  ApplyPriceToAllStock: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────

const parseDate = (ds: string): string => {
  try {
    const m = ds?.match(/\/Date\((\d+)\)\//);
    if (m) {
      const d = new Date(parseInt(m[1]));
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    return ds ?? "";
  } catch {
    return ds ?? "";
  }
};

const PAYMENT_STATUSES = ["Paid", "Partial", "Unpaid"];
const PAYMENT_METHODS = [
  "Cash",
  "Bank Transfer",
  "Mobile Banking",
  "Cheque",
  "Card",
];

// ─── Section Header ───────────────────────────────────────────────

const SectionHeader = ({
  icon,
  title,
  color,
}: {
  icon: string;
  title: string;
  color: string;
}) => (
  <View style={[styles.sectionHeader, { borderLeftColor: color }]}>
    <ThemedText style={styles.sectionIcon}>{icon}</ThemedText>
    <ThemedText style={[styles.sectionTitle, { color }]}>{title}</ThemedText>
  </View>
);

// ─── Field ───────────────────────────────────────────────────────

const Field = ({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  hint,
  editable = true,
  required = false,
}: {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  keyboardType?: "default" | "numeric" | "decimal-pad";
  hint?: string;
  editable?: boolean;
  required?: boolean;
}) => (
  <View style={styles.field}>
    <ThemedText style={styles.fieldLabel}>
      {label}
      {required && <ThemedText style={styles.required}> *</ThemedText>}
    </ThemedText>
    <TextInput
      style={[styles.input, !editable && styles.inputDisabled]}
      value={value}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
      editable={editable}
      placeholderTextColor="#aaa"
    />
    {hint && <ThemedText style={styles.fieldHint}>{hint}</ThemedText>}
  </View>
);

// ─── Pill Selector ───────────────────────────────────────────────

const PillSelector = ({
  label,
  options,
  selected,
  onSelect,
  required = false,
}: {
  label: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  required?: boolean;
}) => (
  <View style={styles.field}>
    <ThemedText style={styles.fieldLabel}>
      {label}
      {required && <ThemedText style={styles.required}> *</ThemedText>}
    </ThemedText>
    <View style={styles.pillRow}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          style={[styles.pill, selected === opt && styles.pillActive]}
          onPress={() => onSelect(opt)}
        >
          <ThemedText
            style={[styles.pillText, selected === opt && styles.pillTextActive]}
          >
            {opt}
          </ThemedText>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

// ─── Product Selector Modal ─────────────────────────────────────

const ProductSelectorModal = ({
  visible,
  products,
  onClose,
  onSelect,
  loading,
}: {
  visible: boolean;
  products: Product[];
  onClose: () => void;
  onSelect: (product: Product) => void;
  loading: boolean;
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredProducts = products.filter(
    (product) =>
      product.ProductName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.Category.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <ThemedText style={styles.modalTitle}>Select Product</ThemedText>
          <TouchableOpacity onPress={onClose} style={styles.modalCloseBtn}>
            <ThemedText style={styles.modalCloseText}>✕</ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by product name or category..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#aaa"
          />
        </View>

        {loading ? (
          <View style={styles.modalCentered}>
            <ActivityIndicator size="large" color="#2d6a4f" />
          </View>
        ) : (
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.ProductId.toString()}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.productItem}
                onPress={() => {
                  onSelect(item);
                  onClose();
                }}
              >
                <View style={styles.productInfo}>
                  <ThemedText style={styles.productName}>
                    {item.ProductName}
                  </ThemedText>
                  <ThemedText style={styles.productCategory}>
                    {item.Category}
                  </ThemedText>
                </View>
                <View style={styles.productStats}>
                  <ThemedText style={styles.productPrice}>
                    ৳{item.SalesValue.toFixed(2)}
                  </ThemedText>
                  <ThemedText style={styles.productStock}>
                    Stock: {item.CurrentStock.toFixed(2)} {item.UnitType}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.productList}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </Modal>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────

export default function EditTransactionScreen() {
  const router = useRouter();
  const { transactionId } = useLocalSearchParams<{ transactionId: string }>();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [txn, setTxn] = useState<TransactionDetail | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productModalVisible, setProductModalVisible] = useState(false);

  // Editable fields
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("Paid");
  const [paidAmount, setPaidAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [remarks, setRemarks] = useState("");

  // Original transaction data for calculations
  const [originalAmount, setOriginalAmount] = useState(0);
  const [originalPaidAmount, setOriginalPaidAmount] = useState(0);
  const [originalDueAmount, setOriginalDueAmount] = useState(0);
  const [oldProductPrice, setOldProductPrice] = useState(0);

  // Computed
  const unitPrice = selectedProduct?.UnitPrice || 0;
  const newTotalAmount =
    (parseFloat(quantity) || 0) * (parseFloat(salePrice) || 0);

  // Payment calculation logic:
  // Due Amount = API DueAmount (from original) + (New Total - Original Total)
  // Paid Amount = New Total - Due Amount
  const originalTotal = txn?.TotalAmount || 0;
  const totalDifference = newTotalAmount - originalTotal;
  const calculatedDueAmount = originalDueAmount + totalDifference;
  const calculatedPaidAmount = newTotalAmount - calculatedDueAmount;

  // Use manual paid amount if entered, otherwise use calculated
  const finalPaidAmount =
    paidAmount !== "" ? parseFloat(paidAmount) || 0 : calculatedPaidAmount;
  const finalDueAmount = newTotalAmount - finalPaidAmount;

  const profitPerItem = (parseFloat(salePrice) || 0) - unitPrice;
  const profitPct = unitPrice ? (profitPerItem / unitPrice) * 100 : 0;
  const updatedStock =
    (selectedProduct?.CurrentStock ?? 0) +
    (txn?.Quantity ?? 0) -
    (parseFloat(quantity) || 0);

  const isLowStock = (selectedProduct?.CurrentStock ?? 0) < 5;
  const insufficientStock =
    parseFloat(quantity) >
    (selectedProduct?.CurrentStock ?? 0) + (txn?.Quantity ?? 0);

  useEffect(() => {
    fetchTransaction();
    fetchProducts();
  }, [transactionId]);

  const fetchTransaction = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${GET_URL}?id=${transactionId}`, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: TransactionDetail = await res.json();
      setTxn(data);
      setQuantity(String(data.Quantity ?? ""));
      setSalePrice(String(data.SalesValue ?? data.UnitPrice ?? ""));
      setPaymentStatus(data.PaymentStatus ?? "Paid");
      setPaidAmount(String(data.PaymentAmount ?? ""));
      setPaymentMethod(data.PaymentMethod ?? "Cash");
      setPaymentReference(data.PaymentReference ?? "");
      setRemarks(data.Remarks ?? "");

      // Store original amounts for calculation
      setOriginalAmount(data.TotalAmount);
      setOriginalPaidAmount(data.PaymentAmount);
      setOriginalDueAmount(data.DueAmount || 0);
      setOldProductPrice(data.UnitPrice);

      // Create temporary product object from transaction
      const tempProduct: Product = {
        ProductId: data.ProductId,
        ProductName: data.ProductName,
        Category: data.Category,
        UnitPrice: data.UnitPrice,
        SalesValue: data.SalesValue,
        ProfitPerUnit: data.SalesValue - data.UnitPrice,
        ProfitPercentage:
          ((data.SalesValue - data.UnitPrice) / data.UnitPrice) * 100,
        CurrentStock: data.CurrentStock || 0,
        ReorderLevel: 0,
        Status: "Available",
        UnitType: "Pcs",
        CreatedDate: "",
        UpdatedDate: "",
        OrganizationId: data.OrganizationId,
        ApplyPriceToAllStock: false,
      };
      setSelectedProduct(tempProduct);
    } catch (e: any) {
      Alert.alert("Error", `Failed to load: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      setProductsLoading(true);
      const res = await fetch(PRODUCTS_URL, {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: Product[] = await res.json();
      setProducts(data);
    } catch (e: any) {
      Alert.alert("Error", `Failed to load products: ${e.message}`);
    } finally {
      setProductsLoading(false);
    }
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setSalePrice(product.SalesValue.toString());

    // If product is different from old one, reset payment logic
    if (txn && txn.ProductId !== product.ProductId) {
      // Reset paid amount to 0 when product changes
      setPaidAmount("");

      // Calculate new due amount based on new total minus original paid amount
      const newQuantity = parseFloat(quantity) || txn.Quantity;
      const newTotal = newQuantity * product.SalesValue;
      const newDueAmount = newTotal - originalPaidAmount; // Original paid from old transaction

      Alert.alert(
        "Product Changed",
        `Product changed from ${txn.ProductName} to ${product.ProductName}\n\n` +
          `Original paid amount: ৳${originalPaidAmount.toFixed(2)}\n` +
          `New total amount: ৳${newTotal.toFixed(2)}\n` +
          `New due amount: ৳${newDueAmount.toFixed(2)}\n\n` +
          `Previous due (${originalDueAmount.toFixed(2)}) is discarded as it belongs to old product.`,
        [{ text: "OK" }],
      );
    }
  };

  // Update payment status based on paid amount
  useEffect(() => {
    if (finalDueAmount <= 0) {
      setPaymentStatus("Paid");
    } else if (finalPaidAmount > 0 && finalDueAmount > 0) {
      setPaymentStatus("Partial");
    } else if (finalPaidAmount === 0) {
      setPaymentStatus("Unpaid");
    }
  }, [finalPaidAmount, finalDueAmount]);

  const handleUpdate = async () => {
  if (!txn || !selectedProduct) return;

  if (!quantity || parseFloat(quantity) <= 0) {
    Alert.alert("Validation", "Quantity must be greater than 0");
    return;
  }
  if (!salePrice || parseFloat(salePrice) <= 0) {
    Alert.alert("Validation", "Sale price must be greater than 0");
    return;
  }

  if (finalDueAmount < 0) {
    Alert.alert("Validation", "Paid amount cannot exceed total amount");
    return;
  }

  try {
    setSaving(true);

    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 19);

    const body = {
      TransactionId: txn.TransactionId,
      ProductId: selectedProduct.ProductId,
      TransactionType: "OUT",
      Quantity: parseFloat(quantity),
      UnitPrice: unitPrice,
      TotalAmount: newTotalAmount,
      TransactionDate: formattedDate,
      Remarks: remarks,
      DailyExpense: 0,
      CreatedBy: "API User",
      TransactionNumber: txn.TransactionNumber,
      ProductName: selectedProduct.ProductName,
      Category: selectedProduct.Category,
      SalesValue: parseFloat(salePrice),
      ProfitPerUnit: profitPerItem,
      CurrentStock: updatedStock,
      PaymentStatus: paymentStatus,
      OrganizationId: txn.OrganizationId,
      IsProcessed: false,
      EntryType: "Debit",
      Amount: newTotalAmount,
      DueAmount: finalDueAmount,
      PaymentAmount: finalPaidAmount,
      PaymentMethod: paymentMethod || null,
      PaymentReference: paymentReference || null,
      RefTxnNumber: null,
      CustomerId: 1,
      CustomerName: "Customer",
      CustomerPhone: "01700000000",
    };

    const res = await fetch(UPDATE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    Alert.alert("Success", "Transaction updated successfully!", [
      { 
        text: "OK", 
        onPress: () => {
          // Use replace instead of push to prevent going back to edit screen
          router.replace({
            pathname: "/(tabs)/sales_list",
            // Add a refresh parameter to trigger data reload
            params: { refresh: Date.now().toString() }
          });
        }
      },
    ]);
  } catch (e: any) {
    Alert.alert("Error", `Update failed: ${e.message}`);
  } finally {
    setSaving(false);
  }
};

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2d6a4f" />
        <ThemedText style={styles.loadingText}>
          Loading transaction...
        </ThemedText>
      </View>
    );
  }

  if (!txn) {
    return (
      <View style={styles.centered}>
        <ThemedText style={styles.errorText}>Transaction not found.</ThemedText>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push("/(tabs)/sales_list")}
        >
          <ThemedText style={styles.backBtnText}>Go Back</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Page Header */}
        <View style={styles.pageHeader}>
          <ThemedText style={styles.pageTitle}>
            ✏️ Edit Stock Transaction
          </ThemedText>
          <View style={styles.divider} />
        </View>

        {/* ── Section 1: Transaction Info ── */}
        <View style={styles.card}>
          <SectionHeader
            icon="📋"
            title="Transaction Information"
            color="#1565c0"
          />

          {/* Product Selection */}
          <View style={styles.field}>
            <ThemedText style={styles.fieldLabel}>Select Product *</ThemedText>
            <TouchableOpacity
              style={styles.productSelector}
              onPress={() => setProductModalVisible(true)}
            >
              <ThemedText style={styles.productSelectorText}>
                {selectedProduct?.ProductName || "Tap to select product..."}
              </ThemedText>
              <ThemedText style={styles.productSelectorIcon}>🔽</ThemedText>
            </TouchableOpacity>
          </View>

          <View style={styles.twoCol}>
            <View style={styles.colHalf}>
              <ThemedText style={styles.fieldLabel}>Category</ThemedText>
              <View style={styles.inputDisabled}>
                <ThemedText style={styles.disabledText}>
                  {selectedProduct?.Category || txn.Category}
                </ThemedText>
              </View>
            </View>
            <View style={styles.colHalf}>
              <ThemedText style={styles.fieldLabel}>Unit Type</ThemedText>
              <View style={styles.inputDisabled}>
                <ThemedText style={styles.disabledText}>
                  {selectedProduct?.UnitType || "Pcs"}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.twoCol}>
            <View style={styles.colHalf}>
              <ThemedText style={styles.fieldLabel}>Date</ThemedText>
              <View style={styles.inputDisabled}>
                <ThemedText style={styles.disabledText}>
                  {parseDate(txn.TransactionDate)}
                </ThemedText>
              </View>
            </View>
            <View style={styles.colHalf}>
              <ThemedText style={styles.fieldLabel}>Invoice #</ThemedText>
              <View style={styles.inputDisabled}>
                <ThemedText style={styles.disabledText}>
                  {txn.TransactionNumber}
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.twoCol}>
            <View style={styles.colHalf}>
              <ThemedText style={styles.fieldLabel}>Unit Price (৳)</ThemedText>
              <View style={styles.inputDisabled}>
                <ThemedText style={styles.disabledText}>
                  {unitPrice.toFixed(2)}
                </ThemedText>
              </View>
            </View>
            <View style={styles.colHalf}>
              <ThemedText style={styles.fieldLabel}>Current Stock</ThemedText>
              <View style={styles.inputDisabled}>
                <ThemedText style={styles.disabledText}>
                  {selectedProduct?.CurrentStock?.toFixed(2) || "0"}{" "}
                  {selectedProduct?.UnitType || "pcs"}
                </ThemedText>
              </View>
              {isLowStock && (
                <View style={styles.lowStockBadge}>
                  <ThemedText style={styles.lowStockText}>
                    ⚠️ Low Stock
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── Section 2: Edit Details ── */}
        <View style={[styles.card, styles.cardGreen]}>
          <SectionHeader
            icon="✏️"
            title="Edit Transaction Details"
            color="#2d6a4f"
          />

          {insufficientStock && (
            <View style={styles.alertBox}>
              <ThemedText style={styles.alertText}>
                ⚠️ Stock Alert: Insufficient stock for this quantity! Available
                stock:{" "}
                {((selectedProduct?.CurrentStock ?? 0) + txn.Quantity).toFixed(
                  2,
                )}{" "}
                {selectedProduct?.UnitType || "pcs"}
              </ThemedText>
            </View>
          )}

          <View style={styles.twoCol}>
            <View style={styles.colHalf}>
              <Field
                label="Quantity"
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="decimal-pad"
                hint={`Changing quantity will affect stock levels (Max: ${((selectedProduct?.CurrentStock ?? 0) + txn.Quantity).toFixed(2)})`}
                required
              />
            </View>
            <View style={styles.colHalf}>
              <Field
                label="Sale Price (৳)"
                value={salePrice}
                onChangeText={setSalePrice}
                keyboardType="decimal-pad"
                hint="৳ Price per unit"
                required
              />
            </View>
          </View>

          <PillSelector
            label="Payment Status"
            options={PAYMENT_STATUSES}
            selected={paymentStatus}
            onSelect={setPaymentStatus}
            required
          />

          {/* Payment Summary */}
          <View style={styles.paymentSummary}>
            <ThemedText style={styles.summaryTitle}>
              💳 Payment Summary
            </ThemedText>

            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>
                Original Total:
              </ThemedText>
              <ThemedText style={styles.summaryValue}>
                ৳{newTotalAmount.toFixed(2)}
              </ThemedText>
            </View>

            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>
                Original Paid:
              </ThemedText>
              <ThemedText style={styles.summaryValue}>
                ৳{calculatedPaidAmount.toFixed(2)}
              </ThemedText>
            </View>

            {/* <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Original Due:</ThemedText>
              <ThemedText style={[styles.summaryValue, styles.dueValue]}>৳{originalDueAmount.toFixed(2)}</ThemedText>
            </View> */}

            <View style={styles.dividerLine} />

            {/* <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>New Total Amount:</ThemedText>
              <ThemedText style={styles.summaryValue}>৳{newTotalAmount.toFixed(2)}</ThemedText>
            </View>

            <View style={styles.summaryRow}>
              <ThemedText style={styles.summaryLabel}>Total Difference:</ThemedText>
              <ThemedText style={styles.summaryValue}>৳{totalDifference.toFixed(2)}</ThemedText>
            </View> */}

            <View style={[styles.summaryRow, styles.summaryRowAlt]}>
              <ThemedText style={styles.summaryLabel}>Paid Amount:</ThemedText>
              <View style={styles.paidAmountRow}>
                <TextInput
                  style={styles.paidInput}
                  value={paidAmount}
                  onChangeText={(value) => {
                    setPaidAmount(value);
                    if (parseFloat(value) > newTotalAmount) {
                      Alert.alert(
                        "Warning",
                        "Paid amount cannot exceed total amount",
                      );
                    }
                  }}
                  keyboardType="decimal-pad"
                  placeholder={calculatedPaidAmount.toFixed(2)}
                  placeholderTextColor="#aaa"
                />
                <ThemedText style={styles.paidHint}>
                  Leave empty for auto-calculated: ৳
                  {calculatedPaidAmount.toFixed(2)}
                </ThemedText>
              </View>
            </View>

            <View style={[styles.summaryRow, styles.summaryRowDue]}>
              <ThemedText style={[styles.summaryLabel, styles.dueLabel]}>
                Due Amount:
              </ThemedText>
              <ThemedText style={[styles.summaryValue, styles.dueValue]}>
                ৳{originalDueAmount.toFixed(2)}
              </ThemedText>
            </View>

            {totalDifference !== 0 && (
              <View style={styles.infoBox}>
                <ThemedText style={styles.infoText}>
                  ℹ️ Due amount automatically adjusted based on price/quantity
                  change
                </ThemedText>
              </View>
            )}
          </View>

          {/* Payment Method */}
          <View style={styles.twoCol2}>
            <View style={styles.colHalf}>
              <ThemedText style={styles.fieldLabel}>Payment Method:</ThemedText>
              <PillSelector
                label=""
                options={PAYMENT_METHODS}
                selected={paymentMethod}
                onSelect={setPaymentMethod}
              />
            </View>
            <View style={styles.colHalf}>
              <Field
                label="Reference:"
                value={paymentReference}
                onChangeText={setPaymentReference}
                hint="Reference number (optional)"
              />
            </View>
          </View>
        </View>

        {/* ── Section 3: Calculations ── */}
        <View style={styles.card}>
          <SectionHeader icon="🧮" title="Calculations" color="#5c4a1e" />

          <View style={styles.calcRow}>
            <ThemedText style={styles.calcLabel}>
              Updated Stock After Transaction:
            </ThemedText>
            <ThemedText style={styles.calcValue}>
              {updatedStock.toFixed(2)} {selectedProduct?.UnitType || "pcs"}
            </ThemedText>
          </View>
          <ThemedText style={styles.calcHint}>
            Current stock will be updated based on quantity change
          </ThemedText>

          <View style={[styles.calcRow, { marginTop: 12 }]}>
            <ThemedText style={styles.calcLabel}>Total Amount:</ThemedText>
            <ThemedText style={styles.calcValue}>
              ৳{newTotalAmount.toFixed(2)}
            </ThemedText>
          </View>
          <ThemedText style={styles.calcHint}>Quantity × Sale Price</ThemedText>

          <View style={[styles.calcRow, { marginTop: 12 }]}>
            <ThemedText style={styles.calcLabelProfit}>
              Profit Per Item:
            </ThemedText>
            <ThemedText
              style={[
                styles.calcValue,
                profitPerItem >= 0 ? styles.profitPos : styles.profitNeg,
              ]}
            >
              {profitPerItem.toFixed(2)} ৳
            </ThemedText>
          </View>
          <ThemedText style={styles.calcHint}>
            Sale Price − Unit Price
          </ThemedText>

          <View style={[styles.calcRow, { marginTop: 12 }]}>
            <ThemedText style={styles.calcLabelProfit}>
              Profit Percentage:
            </ThemedText>
            <ThemedText
              style={[
                styles.calcValue,
                profitPct >= 0 ? styles.profitPos : styles.profitNeg,
              ]}
            >
              {profitPct.toFixed(2)}%
            </ThemedText>
          </View>
          <ThemedText style={styles.calcHint}>
            ((Sale Price − Unit Price) / Unit Price) × 100
          </ThemedText>
        </View>

        {/* ── Remarks ── */}
        {/* <View style={styles.card}>
          <ThemedText style={styles.fieldLabel}>Remarks</ThemedText>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={remarks}
            onChangeText={setRemarks}
            multiline
            numberOfLines={3}
            placeholderTextColor="#aaa"
            placeholder="Optional remarks..."
          />
        </View> */}

        {/* ── Action Buttons ── */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.updateBtn, saving && styles.btnDisabled]}
            onPress={handleUpdate}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <ThemedText style={styles.updateBtnText}>
                ✓ Update Transaction
              </ThemedText>
            )}
          </TouchableOpacity>
          <TouchableOpacity
  style={styles.backBtnOutline}
  onPress={() => {
    // Use replace instead of push and add refresh param
    router.replace({
      pathname: "/(tabs)/sales_list",
      params: { refresh: Date.now().toString() }
    });
  }}
>
  <ThemedText style={styles.backBtnOutlineText}>
    ← Back to List
  </ThemedText>
</TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Product Selector Modal */}
      <ProductSelectorModal
        visible={productModalVisible}
        products={products}
        onClose={() => setProductModalVisible(false)}
        onSelect={handleProductSelect}
        loading={productsLoading}
      />
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6f8" },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  loadingText: { marginTop: 12, fontSize: 14, color: "#666" },
  errorText: { fontSize: 14, color: "#dc3545", textAlign: "center" },

  pageHeader: { backgroundColor: "#fff", padding: 20, paddingBottom: 12 },
  pageTitle: { fontSize: 20, fontWeight: "700", color: "#1a1a1a" },
  divider: {
    height: 3,
    backgroundColor: "#2d6a4f",
    marginTop: 10,
    borderRadius: 2,
  },
  dividerLine: { height: 1, backgroundColor: "#e0e0e0", marginVertical: 12 },

  card: {
    backgroundColor: "#fff",
    margin: 12,
    marginBottom: 0,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardGreen: { backgroundColor: "#f0faf4" },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    paddingLeft: 10,
    marginBottom: 16,
  },
  sectionIcon: { fontSize: 16, marginRight: 6 },
  sectionTitle: { fontSize: 15, fontWeight: "700" },

  twoCol: { flexDirection: "row", gap: 12, marginBottom: 4 },
  twoCol2: { flexDirection: "column", gap: 12, marginBottom: 4 },
  colHalf: { flex: 1 },

  field: { marginBottom: 14 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#444",
    marginBottom: 6,
  },
  required: { color: "#dc3545" },
  input: {
    borderWidth: 1,
    borderColor: "#dde2e8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#333",
    backgroundColor: "#fff",
  },
  inputDisabled: {
    borderWidth: 1,
    borderColor: "#e8ecf0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f0f2f5",
    marginBottom: 6,
  },
  disabledText: { fontSize: 14, color: "#555" },
  textArea: { minHeight: 80, textAlignVertical: "top" },
  fieldHint: { fontSize: 11, color: "#888", marginTop: 4 },

  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#eef0f3",
    borderWidth: 1,
    borderColor: "#dde2e8",
  },
  pillActive: { backgroundColor: "#2d6a4f", borderColor: "#2d6a4f" },
  pillText: { fontSize: 13, color: "#555" },
  pillTextActive: { color: "#fff", fontWeight: "600" },

  lowStockBadge: {
    backgroundColor: "#fff3cd",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  lowStockText: { fontSize: 11, color: "#856404", fontWeight: "600" },

  alertBox: {
    backgroundColor: "#fff3cd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 14,
    borderLeftWidth: 4,
    borderLeftColor: "#ffc107",
  },
  alertText: { fontSize: 12, color: "#856404" },

  paymentSummary: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#d4edda",
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2d6a4f",
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  summaryRowAlt: { backgroundColor: "#f8f9fa" },
  summaryRowDue: { backgroundColor: "#fff5f5" },
  summaryLabel: { fontSize: 13, color: "#555" },
  summaryValue: { fontSize: 14, fontWeight: "700", color: "#333" },
  dueLabel: { color: "#dc3545" },
  dueValue: { color: "#dc3545" },
  paidAmountRow: { alignItems: "flex-end" },
  paidInput: {
    borderWidth: 1,
    borderColor: "#dde2e8",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    color: "#333",
    backgroundColor: "#fff",
    width: 120,
    textAlign: "right",
  },
  paidHint: { fontSize: 11, color: "#2d6a4f", marginTop: 4 },
  infoBox: {
    backgroundColor: "#e3f2fd",
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
  },
  infoText: { fontSize: 11, color: "#1565c0", textAlign: "center" },

  calcRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  calcLabel: { fontSize: 13, color: "#555", flex: 1 },
  calcLabelProfit: { fontSize: 13, fontWeight: "600", color: "#333", flex: 1 },
  calcValue: { fontSize: 14, fontWeight: "700", color: "#333" },
  calcHint: { fontSize: 11, color: "#999", marginBottom: 4, marginTop: 2 },
  profitPos: { color: "#2d6a4f" },
  profitNeg: { color: "#dc3545" },

  actionRow: {
    flexDirection: "row",
    gap: 12,
    margin: 16,
    marginTop: 20,
  },
  updateBtn: {
    flex: 2,
    backgroundColor: "#2d6a4f",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    elevation: 2,
  },
  updateBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  btnDisabled: { opacity: 0.6 },
  backBtn: {
    backgroundColor: "#444",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  backBtnText: { color: "#fff", fontSize: 14 },
  backBtnOutline: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#444",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  backBtnOutlineText: { color: "#444", fontSize: 14, fontWeight: "600" },

  // Product Selector Styles
  productSelector: {
    borderWidth: 1,
    borderColor: "#dde2e8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productSelectorText: { fontSize: 14, color: "#333", flex: 1 },
  productSelectorIcon: { fontSize: 16, color: "#666" },

  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: "#fff" },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#f8f9fa",
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#333" },
  modalCloseBtn: { padding: 8 },
  modalCloseText: { fontSize: 20, color: "#666" },
  modalCentered: { flex: 1, justifyContent: "center", alignItems: "center" },
  searchContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#dde2e8",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#fff",
  },
  productList: { padding: 12 },
  productItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  productInfo: { flex: 1 },
  productName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  productCategory: { fontSize: 12, color: "#666" },
  productStats: { alignItems: "flex-end" },
  productPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2d6a4f",
    marginBottom: 4,
  },
  productStock: { fontSize: 11, color: "#666" },
});
