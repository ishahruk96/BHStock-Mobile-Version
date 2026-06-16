import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

// --- Interfaces & Types ---
interface TransactionDetails {
  TransactionId: number;
  ProductId: number;
  TransactionType: string;
  Quantity: number;
  UnitPrice: number;
  TotalAmount: number;
  TransactionDate: string;
  Remarks: string;
  TransactionNumber: string;
  ProductName: string;
  Category: string;
  SalesValue: number;
  OrganizationId: number;
  PaymentStatus: string;
  Amount: number;
  DueAmount: number;
  PaymentAmount: number;
  CustomerId: number;
  IsAvailableForExchange?: boolean;
}

interface CustomerDetails {
  CustomerId: number;
  CustomerName: string;
  PhoneNumber: string;
  Email: string;
  Address: string;
  OrganizationId: number;
  OrganizationName: string;
}

interface ProductDetails {
  ProductId: number;
  ProductName: string;
  Category: string;
  UnitPrice: number;
  SalesValue: number;
  CurrentStock: number;
  UnitType: string;
}

// Per-item action state
interface ItemAction {
  type: 'Exchange' | 'Return' | 'None';
  qty: number;
  newProductId?: number; // for Exchange: which new product
}

const API_BASE = 'http://devmystock.byteheart.com';
const API_KEY = '3A734AC6-A521-4192-984D-08D082B83456';

const authHeader = {
  Authorization: `Bearer ${API_KEY}`,
  'Content-Type': 'application/json',
};

export default function RetExTransactionScreen() {
  const router = useRouter();
  const { transactionId } = useLocalSearchParams<{ transactionId: string }>();

  // --- States ---
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [remarks, setRemarks] = useState('');

  const [transactions, setTransactions] = useState<TransactionDetails[]>([]);
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [allProducts, setAllProducts] = useState<ProductDetails[]>([]);

  // itemActions: key = TransactionId, value = ItemAction
  const [itemActions, setItemActions] = useState<Record<number, ItemAction>>({});

  // For Exchange product picker modal (simple inline dropdown)
  const [exchangePickerFor, setExchangePickerFor] = useState<number | null>(null);

  // --- Fetch Data ---
  useEffect(() => {
    if (transactionId) {
      loadInitialData();
    } else {
      Alert.alert('Error', 'No Transaction ID provided.');
      router.back();
    }
  }, [transactionId]);

  const loadInitialData = async () => {
    try {
      setLoading(true);

      // 1. Fetch main transaction
      const txRes = await fetch(
        `${API_BASE}/Stock/GetTranscationById?id=${transactionId}`,
        { headers: authHeader }
      );
      if (!txRes.ok) throw new Error('Failed to fetch transaction.');
      const txJson = await txRes.json();
      const mainTx: TransactionDetails = txJson.data || txJson.result || txJson;

      // The API returns one transaction; we display it (and it covers all items in
      // the same TransactionNumber). Here we treat it as a list of one item.
      // If your API returns an array, change this line accordingly.
      const txList: TransactionDetails[] = Array.isArray(mainTx) ? mainTx : [mainTx];
      setTransactions(txList);

      // 2. Customer
      const custRes = await fetch(
        `${API_BASE}/Stock/GetCustomerByTransId?id=${transactionId}`,
        { headers: authHeader }
      );
      if (custRes.ok) {
        const custJson = await custRes.json();
        setCustomer(custJson.data || custJson.result || custJson);
      }

      // 3. All products (for exchange new-product selection)
      const prodRes = await fetch(`${API_BASE}/Products/GetAllProduct`, {
        headers: authHeader,
      });
      if (prodRes.ok) {
        const prodJson = await prodRes.json();
        const products: ProductDetails[] = prodJson.data || prodJson.result || prodJson;
        setAllProducts(Array.isArray(products) ? products : []);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // --- Action Helpers ---
  const getAction = (txId: number): ItemAction =>
    itemActions[txId] || { type: 'None', qty: 0 };

  const setAction = (txId: number, update: Partial<ItemAction>) => {
    setItemActions(prev => ({
      ...prev,
      [txId]: { ...getAction(txId), ...update },
    }));
  };

  const toggleAction = (tx: TransactionDetails, type: 'Exchange' | 'Return') => {
    const current = getAction(tx.TransactionId);
    if (current.type === type) {
      setAction(tx.TransactionId, { type: 'None', qty: 0, newProductId: undefined });
      setExchangePickerFor(null);
    } else {
      setAction(tx.TransactionId, {
        type,
        qty: tx.Quantity,
        newProductId: type === 'Exchange' ? tx.ProductId : undefined,
      });
      if (type === 'Return') setExchangePickerFor(null);
    }
  };

  // --- Calculations ---
  const originalTotal = transactions.reduce((s, t) => s + t.TotalAmount, 0);

  // originalPaid: Amount - DueAmount (DueAmount can be negative = overpaid)
  const firstTx = transactions[0];
  const originalPaid = firstTx
    ? firstTx.Amount - (firstTx.DueAmount < 0 ? firstTx.DueAmount : firstTx.DueAmount)
    : 0;

  // Simpler: paid = Amount + abs(DueAmount) if due is negative (overpayment scenario)
  // Based on sample data: Amount=150, DueAmount=-720 means customer paid extra
  // We'll just use Amount as what was paid for this item
  const totalPaid = firstTx ? firstTx.Amount : 0;

  const totalRefund = transactions.reduce((sum, tx) => {
    const act = getAction(tx.TransactionId);
    if (act.type === 'None') return sum;
    return sum + tx.UnitPrice * act.qty;
  }, 0);

  const newTotalAmount = originalTotal - totalRefund;
  const netRefund = totalPaid > newTotalAmount ? totalPaid - newTotalAmount : 0;
  const newPayment = newTotalAmount > totalPaid ? newTotalAmount - totalPaid : 0;

  // --- Submit ---
  const handleProcess = async () => {
    const selectedItems = transactions.filter(
      tx => getAction(tx.TransactionId).type !== 'None'
    );

    if (selectedItems.length === 0) {
      Alert.alert('Warning', 'Please select Exchange or Return for at least one product.');
      return;
    }

    setSubmitLoading(true);

    const items = selectedItems.map(tx => {
      const act = getAction(tx.TransactionId);
      const isExchange = act.type === 'Exchange';
      const newProd = allProducts.find(p => p.ProductId === act.newProductId);

      return {
        OriginalTransactionId: tx.TransactionId,
        ProductId: tx.ProductId,
        Quantity: act.qty,
        UnitPrice: tx.UnitPrice,
        SellPrice: tx.SalesValue || tx.UnitPrice,
        TotalAmount: tx.TotalAmount,
        Action: act.type, // "Exchange" or "Return"
        NewProductId: isExchange ? (act.newProductId || tx.ProductId) : null,
        NewQuantity: isExchange ? act.qty : 0,
        NewUnitPrice: isExchange ? (newProd?.UnitPrice || tx.UnitPrice) : 0,
        NewSellPrice: isExchange ? (newProd?.SalesValue || tx.SalesValue || tx.UnitPrice) : 0,
        Remarks: `Product ${act.type.toLowerCase()} - ${remarks || 'N/A'}`,
        PaymentAmount: isExchange ? 0 : tx.UnitPrice * act.qty,
        PaymentMethod: 'Cash',
        PaymentReference: `PAY-${Date.now()}`,
        OriginalPaidAmount: totalPaid,
        OriginalDueAmount: firstTx?.DueAmount || 0,
      };
    });

    const payload = {
      TransactionNumber: firstTx?.TransactionNumber || '',
      OrganizationId: firstTx?.OrganizationId || 3,
      ExchangeDate: new Date().toISOString(),
      Remarks: remarks || `Exchange/Return via Mobile App`,
      CreatedBy: 'API User',
      TotalPaymentAmount: totalRefund,
      TotalPaymentMethod: 'Cash',
      Items: items,
    };

    try {
      const res = await fetch(`${API_BASE}/Stock/ProcessExchangeReturn`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          API_KEY: API_KEY,
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (res.ok) {
        Alert.alert('Success', 'Exchange/Return processed successfully!', [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Failed', result.message || 'Server rejected the request.');
      }
    } catch {
      Alert.alert('Error', 'Network error. Could not connect to server.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // --- Render Product Row ---
  const renderProductRow = (tx: TransactionDetails) => {
    const act = getAction(tx.TransactionId);
    const isExchange = act.type === 'Exchange';
    const isReturn = act.type === 'Return';
    const showPicker = isExchange && exchangePickerFor === tx.TransactionId;

    return (
      <View key={tx.TransactionId} style={styles.productCard}>
        {/* Product Header */}
        <View style={styles.productMainInfo}>
          <View style={{ flex: 1 }}>
            <Text style={styles.productName}>{tx.ProductName}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{tx.Category}</Text>
            </View>
          </View>
          <Text style={styles.totalText}>৳{tx.TotalAmount.toFixed(2)}</Text>
        </View>

        {/* Qty / Price row */}
        <View style={styles.productDetailsRow}>
          <Text style={styles.detailsData}>Qty: {tx.Quantity}</Text>
          <Text style={styles.detailsData}>Unit: ৳{tx.UnitPrice.toFixed(2)}</Text>
          <Text style={styles.detailsData}>Total: ৳{(tx.UnitPrice * tx.Quantity).toFixed(2)}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtonRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.exchangeBtn, isExchange && styles.activeExchange]}
            onPress={() => {
              toggleAction(tx, 'Exchange');
              if (act.type !== 'Exchange') setExchangePickerFor(tx.TransactionId);
              else setExchangePickerFor(null);
            }}
          >
            <Text style={[styles.actionBtnText, { color: isExchange ? '#fff' : '#d97706' }]}>
              🔄 Exchange
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.returnBtn, isReturn && styles.activeReturn]}
            onPress={() => toggleAction(tx, 'Return')}
          >
            <Text style={[styles.actionBtnText, { color: isReturn ? '#fff' : '#dc2626' }]}>
              ↩ Return
            </Text>
          </TouchableOpacity>
        </View>

        {/* Quantity Selector */}
        {act.type !== 'None' && (
          <View style={styles.quantityCounterRow}>
            <Text style={styles.counterLabel}>Qty to {act.type}:</Text>
            <View style={styles.counterControls}>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() =>
                  setAction(tx.TransactionId, { qty: Math.max(1, act.qty - 1) })
                }
              >
                <Text style={styles.counterBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.counterValue}>{act.qty}</Text>
              <TouchableOpacity
                style={styles.counterBtn}
                onPress={() =>
                  setAction(tx.TransactionId, {
                    qty: Math.min(tx.Quantity, act.qty + 1),
                  })
                }
              >
                <Text style={styles.counterBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Exchange: New Product Picker */}
        {isExchange && (
          <View style={styles.newProductSection}>
            <Text style={styles.newProductLabel}>New Product for Exchange:</Text>
            <TouchableOpacity
              style={styles.pickerToggle}
              onPress={() =>
                setExchangePickerFor(showPicker ? null : tx.TransactionId)
              }
            >
              <Text style={styles.pickerToggleText}>
                {allProducts.find(p => p.ProductId === act.newProductId)?.ProductName ||
                  'Select Product'}{' '}
                ▾
              </Text>
            </TouchableOpacity>
            {showPicker && (
              <View style={styles.productPickerList}>
                {allProducts.map(prod => (
                  <TouchableOpacity
                    key={prod.ProductId}
                    style={[
                      styles.pickerItem,
                      act.newProductId === prod.ProductId && styles.pickerItemActive,
                    ]}
                    onPress={() => {
                      setAction(tx.TransactionId, { newProductId: prod.ProductId });
                      setExchangePickerFor(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        act.newProductId === prod.ProductId && { color: '#fff' },
                      ]}
                    >
                      {prod.ProductName}
                    </Text>
                    <Text
                      style={[
                        styles.pickerItemSub,
                        act.newProductId === prod.ProductId && { color: '#dbeafe' },
                      ]}
                    >
                      ৳{prod.UnitPrice} · Stock: {prod.CurrentStock}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  // --- Loading / Error States ---
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.loadingText}>Loading Transaction...</Text>
      </View>
    );
  }

  if (transactions.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>No Transaction Found.</Text>
      </View>
    );
  }

  const txNumber = firstTx?.TransactionNumber || '';
  const txDate = firstTx?.TransactionDate
    ? new Date(
        parseInt(firstTx.TransactionDate.replace(/\/Date\((\d+)\)\//, '$1'))
      ).toLocaleDateString('en-BD', { day: '2-digit', month: 'short', year: 'numeric' })
    : '';

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 48 }}>
      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>🔄 Exchange/Return</Text>
          <Text style={styles.headerTitle}>Transaction</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.historyBtn}>
            <Text style={styles.historyBtnText}>≡ Return History</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.txNumberRow}>
        <View style={styles.greenAccent} />
        <Text style={styles.txNumber}>Transaction #: {txNumber}</Text>
      </View>

      {/* ── Info Cards ── */}
      <View style={styles.infoGrid}>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>TRANSACTION DATE</Text>
          <Text style={styles.infoValue}>{txDate}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>CUSTOMER NAME</Text>
          <Text style={styles.infoValue}>{customer?.CustomerName || 'Walk-in'}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>PHONE</Text>
          <Text style={styles.infoValue}>{customer?.PhoneNumber || 'N/A'}</Text>
        </View>
        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>ORGANIZATION ID</Text>
          <Text style={styles.infoValue}>{firstTx?.OrganizationId}</Text>
        </View>
      </View>

      {/* ── Products ── */}
      <View style={styles.sectionHeader}>
        <View style={styles.greenAccent} />
        <Text style={styles.sectionTitle}>Products in this Transaction</Text>
      </View>

      {transactions.map(renderProductRow)}

      {/* ── Settlement Overview ── */}
      <View style={styles.summaryContainer}>
        <View style={styles.sectionHeader}>
          <View style={styles.greenAccent} />
          <Text style={styles.sectionTitle}>Exchange/Return Items</Text>
        </View>

        {/* Top 3 stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>ORIGINAL TOTAL</Text>
            <Text style={styles.statVal}>৳{originalTotal.toFixed(2)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>ORIGINAL PAID</Text>
            <Text style={styles.statVal}>৳{totalPaid.toFixed(2)}</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxGreen]}>
            <Text style={[styles.statLabel, { color: '#15803d' }]}>FINAL DUE / REFUND</Text>
            <Text style={[styles.statVal, { color: '#15803d' }]}>৳{netRefund.toFixed(2)}</Text>
          </View>
        </View>

        {/* New Total / New Payment */}
        <View style={styles.newAmountRow}>
          <View style={[styles.newAmountBox, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}>
            <Text style={styles.newAmountLabel}>NEW TOTAL AMOUNT</Text>
            <Text style={[styles.newAmountVal, { color: '#15803d' }]}>
              ৳{newTotalAmount.toFixed(2)}
            </Text>
          </View>
          <View style={[styles.newAmountBox, { backgroundColor: '#f0fdf4', borderColor: '#86efac' }]}>
            <Text style={styles.newAmountLabel}>NEW PAYMENT</Text>
            <Text style={[styles.newAmountVal, { color: '#15803d' }]}>
              ৳{newPayment.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Refund Summary */}
        <View style={styles.refundBanner}>
          <Text style={styles.refundBannerTitle}>💰 Refund Summary</Text>
          <View style={styles.refundRow}>
            <View>
              <Text style={styles.refundRowLabel}>Total Refund:</Text>
              <Text style={styles.refundRowVal}>৳{totalRefund.toFixed(2)}</Text>
            </View>
            <View>
              <Text style={styles.refundRowLabel}>New Payment:</Text>
              <Text style={styles.refundRowVal}>৳{newPayment.toFixed(2)}</Text>
            </View>
            <View>
              <Text style={styles.refundRowLabel}>Net Refund:</Text>
              <Text style={styles.refundRowVal}>৳{netRefund.toFixed(2)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Remarks ── */}
      <Text style={styles.remarksLabel}>Remarks</Text>
      <TextInput
        style={styles.textInput}
        placeholder="Enter remarks for this exchange/return..."
        placeholderTextColor="#94a3b8"
        value={remarks}
        onChangeText={setRemarks}
        multiline
      />

      {/* ── Submit ── */}
      <TouchableOpacity
        style={[
          styles.submitButton,
          Object.values(itemActions).every(a => a.type === 'None') && styles.disabledButton,
        ]}
        onPress={handleProcess}
        disabled={
          submitLoading || Object.values(itemActions).every(a => a.type === 'None')
        }
      >
        {submitLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.submitButtonText}>✓ Process Exchange/Return</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', paddingHorizontal: 16 },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },
  errorText: { color: '#dc2626', fontSize: 15, fontWeight: '600' },

  // Header
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 16,
    marginBottom: 4,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', lineHeight: 26 },
  headerActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  backBtn: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  backBtnText: { fontSize: 13, color: '#475569', fontWeight: '600' },
  historyBtn: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  historyBtnText: { fontSize: 13, color: '#2563eb', fontWeight: '600' },

  txNumberRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  greenAccent: {
    width: 3,
    height: 16,
    backgroundColor: '#16a34a',
    borderRadius: 2,
    marginRight: 8,
  },
  txNumber: { fontSize: 14, color: '#16a34a', fontWeight: '600' },

  // Info Cards
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 8,
  },
  infoCard: {
    backgroundColor: '#fff',
    width: '48%',
    margin: '1%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '700', letterSpacing: 0.5 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#334155', marginTop: 4 },

  // Section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#0f172a' },

  // Product Card
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  productMainInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productName: { fontSize: 15, fontWeight: '700', color: '#1e293b', flex: 1 },
  badge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  badgeText: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  totalText: { fontSize: 15, fontWeight: '700', color: '#1e293b' },
  productDetailsRow: {
    flexDirection: 'row',
    marginTop: 10,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  detailsData: { fontSize: 12, color: '#64748b' },

  // Action buttons
  actionButtonRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 8 },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  exchangeBtn: { borderColor: '#fcd34d', backgroundColor: '#fff7ed' },
  returnBtn: { borderColor: '#fca5a5', backgroundColor: '#fef2f2' },
  activeExchange: { backgroundColor: '#d97706', borderColor: '#d97706' },
  activeReturn: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  actionBtnText: { fontSize: 13, fontWeight: '600' },

  // Quantity counter
  quantityCounterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  counterLabel: { fontSize: 13, fontWeight: '600', color: '#334155' },
  counterControls: { flexDirection: 'row', alignItems: 'center' },
  counterBtn: {
    backgroundColor: '#e2e8f0',
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterBtnText: { fontSize: 18, fontWeight: '700', color: '#334155' },
  counterValue: {
    fontSize: 16,
    fontWeight: '700',
    paddingHorizontal: 16,
    color: '#1e293b',
  },

  // Exchange product picker
  newProductSection: { marginTop: 10 },
  newProductLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 6 },
  pickerToggle: {
    backgroundColor: '#eff6ff',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  pickerToggleText: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  productPickerList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 4,
    maxHeight: 200,
    overflow: 'hidden',
  },
  pickerItem: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  pickerItemActive: { backgroundColor: '#2563eb' },
  pickerItemText: { fontSize: 13, fontWeight: '600', color: '#1e293b' },
  pickerItemSub: { fontSize: 11, color: '#64748b', marginTop: 2 },

  // Summary
  summaryContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  statsRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  statBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  statBoxGreen: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  statLabel: { fontSize: 9, color: '#64748b', fontWeight: '700', textAlign: 'center', letterSpacing: 0.3 },
  statVal: { fontSize: 14, fontWeight: '700', color: '#334155', marginTop: 4 },

  newAmountRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  newAmountBox: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  newAmountLabel: { fontSize: 10, color: '#64748b', fontWeight: '700', textAlign: 'center' },
  newAmountVal: { fontSize: 20, fontWeight: '800', marginTop: 4 },

  refundBanner: {
    backgroundColor: '#fef9c3',
    borderColor: '#fef08a',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  refundBannerTitle: { fontSize: 13, fontWeight: '700', color: '#854d0e', marginBottom: 8 },
  refundRow: { flexDirection: 'row', justifyContent: 'space-between' },
  refundRowLabel: { fontSize: 11, color: '#92400e', fontWeight: '600' },
  refundRowVal: { fontSize: 14, fontWeight: '700', color: '#854d0e', marginTop: 2 },

  // Remarks
  remarksLabel: { fontSize: 14, fontWeight: '600', color: '#475569', marginTop: 16, marginBottom: 6 },
  textInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    height: 72,
    textAlignVertical: 'top',
    color: '#334155',
    fontSize: 14,
  },

  // Submit
  submitButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: { backgroundColor: '#94a3b8' },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});