// TransactionDetails.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

const API_KEY = "3A734AC6-A521-4192-984D-08D082B83456";
const BASE_URL = "http://devmystock.byteheart.com/Stock";

// Types
interface ExchangeItem {
  OriginalTransactionId: number;
  ProductId: number;
  Quantity: number;
  UnitPrice: number;
  SellPrice: number;
  TotalAmount: number;
  Action: string;
  NewProductId: number;
  NewQuantity: number;
  NewUnitPrice: number;
  NewSellPrice: number;
  Remarks: string;
  PaymentAmount: number;
  PaymentMethod: string;
  PaymentReference: string;
  OriginalPaidAmount: number;
  OriginalDueAmount: number;
}

interface TransactionDetailsData {
  TransactionNumber: string;
  OrganizationId: number;
  ExchangeDate: string;
  Remarks: string;
  CreatedBy: string;
  TotalPaymentAmount: number;
  TotalPaymentMethod: string;
  Items: ExchangeItem[];
}

// Helper Functions
const formatDateTime = (dateString: string): string => {
  try {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${day}-${month}-${year}  ${hours}:${minutes} ${ampm}`;
  } catch {
    return dateString;
  }
};

const getActionStyle = (action: string) => {
  switch (action?.toLowerCase()) {
    case 'exchange': return { bg: '#fff3cd', text: '#856404', icon: '↺' };
    case 'return': return { bg: '#f8d7da', text: '#721c24', icon: '↩' };
    default: return { bg: '#e2e3e5', text: '#383d41', icon: '•' };
  }
};

// Header Component
const Header = ({ onBack, transactionNumber }: { onBack: () => void; transactionNumber: string }) => (
  <View style={styles.header}>
    <TouchableOpacity style={styles.backBtn} onPress={onBack}>
      <Text style={styles.backIcon}>←</Text>
    </TouchableOpacity>
    <View style={styles.headerCenter}>
      <Text style={styles.headerText}>Transaction Details</Text>
    </View>
    <View style={styles.placeholder} />
  </View>
);

// Edit Transaction Modal
const EditTransactionModal = ({
  visible,
  onClose,
  transaction,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  transaction: TransactionDetailsData | null;
  onSave: (data: any) => void;
}) => {
  const [remarks, setRemarks] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [paymentReference, setPaymentReference] = useState('');

  useEffect(() => {
    if (transaction) {
      setRemarks(transaction.Remarks || '');
      setPaymentAmount(transaction.TotalPaymentAmount?.toString() || '');
      setPaymentMethod(transaction.TotalPaymentMethod || 'Cash');
      setPaymentReference('');
    }
  }, [transaction]);

  const handleSave = () => {
    const editData = {
      TransactionNumber: transaction?.TransactionNumber,
      OrganizationId: transaction?.OrganizationId,
      Remarks: remarks,
      TotalPaymentAmount: parseFloat(paymentAmount) || 0,
      TotalPaymentMethod: paymentMethod,
      PaymentReference: paymentReference,
    };
    onSave(editData);
  };

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalHeaderTitle}>Edit Transaction</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Remarks</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={remarks}
                onChangeText={setRemarks}
                placeholder="Enter remarks"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Payment Amount</Text>
              <TextInput
                style={styles.input}
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                placeholder="Enter payment amount"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Payment Method</Text>
              <TextInput
                style={styles.input}
                value={paymentMethod}
                onChangeText={setPaymentMethod}
                placeholder="Cash/Bkash/Nagad"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Payment Reference (Optional)</Text>
              <TextInput
                style={styles.input}
                value={paymentReference}
                onChangeText={setPaymentReference}
                placeholder="Transaction reference"
              />
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Info Card Component
const InfoCard = ({ transaction }: { transaction: TransactionDetailsData | null }) => {
  if (!transaction) return null;
  
  return (
    <View style={styles.card}>
      <View style={styles.txnHeader}>
        <Text style={styles.txnNo}>Transaction # {transaction.TransactionNumber}</Text>
      </View>
      
      <View style={styles.infoRow}>
        <View style={[styles.infoCell, { marginRight: 8 }]}>
          <Text style={styles.infoLabel}>EXCHANGE DATE</Text>
          <Text style={styles.infoValue}>{formatDateTime(transaction.ExchangeDate)}</Text>
        </View>
        <View style={styles.infoCell}>
          <Text style={styles.infoLabel}>ORGANIZATION ID</Text>
          <Text style={styles.infoValue}>{transaction.OrganizationId}</Text>
        </View>
      </View>
      
      <View style={styles.infoRow}>
        <View style={[styles.infoCell, { marginRight: 8 }]}>
          <Text style={styles.infoLabel}>CREATED BY</Text>
          <Text style={styles.infoValue}>{transaction.CreatedBy || 'N/A'}</Text>
        </View>
        <View style={styles.infoCell}>
          <Text style={styles.infoLabel}>PAYMENT METHOD</Text>
          <Text style={styles.infoValue}>{transaction.TotalPaymentMethod || 'N/A'}</Text>
        </View>
      </View>
    </View>
  );
};

// Exchange/Return Items Table Component
const ItemsTable = ({ items }: { items: ExchangeItem[] }) => {
  const totalWidth = 50 + 100 + 80 + 100 + 100 + 100 + 100;
  
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Exchange/Return Items</Text>
      <View style={styles.sectionDivider} />
      
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View style={{ width: totalWidth }}>
          {/* Header */}
          <View style={styles.tableHeader}>
            <View style={[styles.th, { width: 50 }]}><Text style={styles.thText}>#</Text></View>
            <View style={[styles.th, { width: 100 }]}><Text style={styles.thText}>Action</Text></View>
            <View style={[styles.th, { width: 80 }]}><Text style={styles.thText}>Product ID</Text></View>
            <View style={[styles.th, { width: 100 }]}><Text style={styles.thText}>Quantity</Text></View>
            <View style={[styles.th, { width: 100 }]}><Text style={styles.thText}>Unit Price</Text></View>
            <View style={[styles.th, { width: 100 }]}><Text style={styles.thText}>Sell Price</Text></View>
            <View style={[styles.th, { width: 100 }]}><Text style={styles.thText}>Total</Text></View>
          </View>
          
          {/* Rows */}
          {items.map((item, index) => {
            const actionStyle = getActionStyle(item.Action);
            return (
              <View key={index} style={styles.tableRow}>
                <View style={[styles.td, { width: 50 }]}><Text style={styles.tdText}>{index + 1}</Text></View>
                <View style={[styles.td, { width: 100 }]}>
                  <View style={[styles.actionBadge, { backgroundColor: actionStyle.bg }]}>
                    <Text style={[styles.actionText, { color: actionStyle.text }]}>
                      {actionStyle.icon} {item.Action}
                    </Text>
                  </View>
                </View>
                <View style={[styles.td, { width: 80 }]}><Text style={styles.tdText}>{item.ProductId}</Text></View>
                <View style={[styles.td, { width: 100 }]}><Text style={styles.tdText}>{item.Quantity}</Text></View>
                <View style={[styles.td, { width: 100 }]}><Text style={styles.tdText}>৳{item.UnitPrice.toFixed(2)}</Text></View>
                <View style={[styles.td, { width: 100 }]}><Text style={styles.tdText}>৳{item.SellPrice.toFixed(2)}</Text></View>
                <View style={[styles.td, { width: 100 }]}><Text style={styles.amountText}>৳{item.TotalAmount.toFixed(2)}</Text></View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

// New Products Table
const NewProductsTable = ({ items }: { items: ExchangeItem[] }) => {
  const exchangeItems = items.filter(item => item.Action?.toLowerCase() === 'exchange' && item.NewProductId > 0);
  
  if (exchangeItems.length === 0) return null;
  
  const totalWidth = 50 + 100 + 80 + 100 + 100 + 100;
  
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>New Products (Exchange)</Text>
      <View style={styles.sectionDivider} />
      
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View style={{ width: totalWidth }}>
          <View style={styles.tableHeader}>
            <View style={[styles.th, { width: 50 }]}><Text style={styles.thText}>#</Text></View>
            <View style={[styles.th, { width: 100 }]}><Text style={styles.thText}>Product ID</Text></View>
            <View style={[styles.th, { width: 80 }]}><Text style={styles.thText}>Quantity</Text></View>
            <View style={[styles.th, { width: 100 }]}><Text style={styles.thText}>Unit Price</Text></View>
            <View style={[styles.th, { width: 100 }]}><Text style={styles.thText}>Sell Price</Text></View>
            <View style={[styles.th, { width: 100 }]}><Text style={styles.thText}>Total</Text></View>
          </View>
          
          {exchangeItems.map((item, index) => {
            const total = item.NewQuantity * item.NewSellPrice;
            return (
              <View key={index} style={styles.tableRow}>
                <View style={[styles.td, { width: 50 }]}><Text style={styles.tdText}>{index + 1}</Text></View>
                <View style={[styles.td, { width: 100 }]}><Text style={styles.tdText}>{item.NewProductId}</Text></View>
                <View style={[styles.td, { width: 80 }]}><Text style={styles.tdText}>{item.NewQuantity}</Text></View>
                <View style={[styles.td, { width: 100 }]}><Text style={styles.tdText}>৳{item.NewUnitPrice.toFixed(2)}</Text></View>
                <View style={[styles.td, { width: 100 }]}><Text style={styles.tdText}>৳{item.NewSellPrice.toFixed(2)}</Text></View>
                <View style={[styles.td, { width: 100 }]}><Text style={styles.amountText}>৳{total.toFixed(2)}</Text></View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

// Payment Summary Component
const PaymentSummary = ({ transaction }: { transaction: TransactionDetailsData | null }) => {
  if (!transaction) return null;
  
  const totalOriginalAmount = transaction.Items.reduce((sum, item) => sum + item.TotalAmount, 0);
  const totalNewAmount = transaction.Items
    .filter(item => item.Action?.toLowerCase() === 'exchange')
    .reduce((sum, item) => sum + (item.NewQuantity * item.NewSellPrice), 0);
  const totalRefundAmount = transaction.Items
    .filter(item => item.Action?.toLowerCase() === 'return')
    .reduce((sum, item) => sum + item.TotalAmount, 0);
  const totalPayment = transaction.TotalPaymentAmount;
  const netAmount = totalNewAmount - totalOriginalAmount + totalRefundAmount;
  
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Payment Summary</Text>
      <View style={styles.sectionDivider} />
      
      <View style={styles.summaryGrid}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Original Total</Text>
          <Text style={styles.summaryValue}>৳{totalOriginalAmount.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>New Total</Text>
          <Text style={styles.summaryValue}>৳{totalNewAmount.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Refund Amount</Text>
          <Text style={[styles.summaryValue, { color: '#dc3545' }]}>৳{totalRefundAmount.toFixed(2)}</Text>
        </View>
      </View>
      
      <View style={styles.summaryGrid}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Payment Received</Text>
          <Text style={[styles.summaryValue, { color: '#28a745' }]}>৳{totalPayment.toFixed(2)}</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Net Amount</Text>
          <Text style={[styles.summaryValue, { color: netAmount >= 0 ? '#28a745' : '#dc3545' }]}>
            ৳{Math.abs(netAmount).toFixed(2)} {netAmount >= 0 ? '(Due)' : '(Refund)'}
          </Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryLabel}>Payment Method</Text>
          <Text style={styles.summaryValue}>{transaction.TotalPaymentMethod}</Text>
        </View>
      </View>
    </View>
  );
};

// Remarks Component
const Remarks = ({ remarks }: { remarks: string }) => {
  if (!remarks) return null;
  
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Remarks</Text>
      <View style={styles.sectionDivider} />
      <Text style={styles.remarksText}>{remarks}</Text>
    </View>
  );
};

// Main Component
export default function TransactionDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { transactionNumber, organizationId } = params;
  
  const [transaction, setTransaction] = useState<TransactionDetailsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (transactionNumber) {
      fetchTransactionDetails();
    }
  }, [transactionNumber]);

  // API 1: GetTransactionByNumber
  const fetchTransactionDetails = async () => {
    try {
      setError(null);
      const orgId = organizationId || 3;
      const url = `${BASE_URL}/GetTransactionByNumber?transactionNumber=${transactionNumber}&orgId=${orgId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      setTransaction(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load transaction details');
      Alert.alert('Error', `Failed to load data: ${err.message}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // API 2: EditTransaction
  const handleEditTransaction = async (editData: any) => {
    setSubmitting(true);
    try {
      const response = await fetch(`${BASE_URL}/EditTransaction`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editData),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();
      Alert.alert('Success', 'Transaction updated successfully');
      setShowEditModal(false);
      fetchTransactionDetails(); // Refresh data
    } catch (err: any) {
      Alert.alert('Error', `Failed to update: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  // API 3: ProcessExchangeReturn
  const handleProcessExchangeReturn = async () => {
    if (!transaction) return;
    
    setSubmitting(true);
    try {
      const payload = {
        TransactionNumber: transaction.TransactionNumber,
        OrganizationId: transaction.OrganizationId,
        ExchangeDate: new Date().toISOString(),
        Remarks: transaction.Remarks,
        CreatedBy: "API User",
        TotalPaymentAmount: transaction.TotalPaymentAmount,
        TotalPaymentMethod: transaction.TotalPaymentMethod,
        Items: transaction.Items,
      };

      const response = await fetch(`${BASE_URL}/ProcessExchangeReturn`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();
      Alert.alert('Success', 'Exchange/Return processed successfully');
      fetchTransactionDetails(); // Refresh data
    } catch (err: any) {
      Alert.alert('Error', `Failed to process: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTransactionDetails();
  };

  const handleGoBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Header onBack={handleGoBack} transactionNumber="" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1B8A5A" />
          <Text style={styles.loadingText}>Loading transaction details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Header onBack={handleGoBack} transactionNumber="" />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchTransactionDetails}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!transaction) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <Header onBack={handleGoBack} transactionNumber="" />
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No transaction found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <Header onBack={handleGoBack} transactionNumber={transaction.TransactionNumber} />
      
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        <InfoCard transaction={transaction} />
        
        {transaction.Items && transaction.Items.length > 0 && (
          <>
            <ItemsTable items={transaction.Items} />
            <NewProductsTable items={transaction.Items} />
          </>
        )}
        
        <PaymentSummary transaction={transaction} />
        <Remarks remarks={transaction.Remarks} />
        
        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity 
            style={styles.editBtn} 
            onPress={() => setShowEditModal(true)}
            disabled={submitting}
          >
            <Text style={styles.editBtnText}>✎ Edit Transaction</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.exchangeBtn} 
            onPress={handleProcessExchangeReturn}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.exchangeBtnText}>↺ Process Exchange/Return</Text>
            )}
          </TouchableOpacity>
        </View>
        
        <View style={{ height: 30 }} />
      </ScrollView>

      {/* Edit Transaction Modal */}
      <EditTransactionModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        transaction={transaction}
        onSave={handleEditTransaction}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f5f5' },
  scroll: { flex: 1 },
  scrollContent: { padding: 12, gap: 12 },
  
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    elevation: 2,
  },
  backBtn: { padding: 8, backgroundColor: '#f5f5f5', borderRadius: 8 },
  backIcon: { fontSize: 18, color: '#333' },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  placeholder: { width: 40 },
  
  // Card
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  
  // Transaction Header
  txnHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  txnNo: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  
  // Info Rows
  infoRow: { flexDirection: 'row', marginBottom: 12 },
  infoCell: { flex: 1, backgroundColor: '#f8f9fa', borderRadius: 8, padding: 10 },
  infoLabel: { fontSize: 10, fontWeight: 'bold', color: '#666', letterSpacing: 0.5, marginBottom: 4 },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#333' },
  
  // Section
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  sectionDivider: { height: 2, width: 40, backgroundColor: '#1B8A5A', borderRadius: 2, marginBottom: 12 },
  
  // Table
  tableHeader: { flexDirection: 'row', backgroundColor: '#343a40', paddingVertical: 10, borderRadius: 8, marginBottom: 6 },
  th: { justifyContent: 'center', alignItems: 'center' },
  thText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  tableRow: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  td: { justifyContent: 'center', paddingHorizontal: 4 },
  tdText: { fontSize: 12, color: '#555' },
  amountText: { fontSize: 12, fontWeight: 'bold', color: '#b8860b' },
  
  // Action Badge
  actionBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  actionText: { fontSize: 11, fontWeight: 'bold' },
  
  // Summary
  summaryGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  summaryItem: { flex: 1, alignItems: 'center', padding: 12, backgroundColor: '#f8f9fa', borderRadius: 8 },
  summaryLabel: { fontSize: 11, color: '#666', marginBottom: 4, textAlign: 'center' },
  summaryValue: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  
  // Remarks
  remarksText: { fontSize: 13, color: '#555', lineHeight: 20 },
  
  // Action Buttons
  actionContainer: { gap: 12, marginTop: 8 },
  editBtn: { backgroundColor: '#ffc107', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  editBtnText: { color: '#333', fontSize: 14, fontWeight: 'bold' },
  exchangeBtn: { backgroundColor: '#1B8A5A', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  exchangeBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, width: '90%', maxHeight: '80%', overflow: 'hidden' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#e0e0e0' },
  modalHeaderTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  modalClose: { fontSize: 20, color: '#999' },
  modalBody: { padding: 16, maxHeight: '70%' },
  modalFooter: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: '#e0e0e0' },
  
  // Inputs
  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: 'bold', color: '#333', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, backgroundColor: '#fff' },
  textArea: { height: 80, textAlignVertical: 'top' },
  
  cancelBtn: { flex: 1, padding: 12, backgroundColor: '#6c757d', borderRadius: 8, alignItems: 'center' },
  cancelBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  saveBtn: { flex: 1, padding: 12, backgroundColor: '#28a745', borderRadius: 8, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  
  // Loading & Error States
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 14, color: '#999' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, gap: 16 },
  errorText: { fontSize: 14, color: '#dc3545', textAlign: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#999' },
  retryBtn: { backgroundColor: '#1B8A5A', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});