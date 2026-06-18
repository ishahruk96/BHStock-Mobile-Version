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
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Interfaces & Types ---
interface TransactionItem {
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
  ProfitPerUnit: number | null;
  CurrentStock: number;
  PaymentStatus: string;
  OrganizationId: number;
  IsProcessed: boolean;
  EntryType: string;
  Amount: number;
  DueAmount: number;
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

interface CustomerDetails {
  CustomerId: number;
  CustomerName: string;
  PhoneNumber: string;
  Email: string;
  Address: string;
  CreatedDate: string;
  UpdatedDate: string | null;
  OrganizationId: number;
  OrganizationName: string;
}

interface ProductOption {
  ProductId: number;
  ProductName: string;
  OrganizationId: number;
  UnitPrice?: number;
  SalesValue?: number;
  CurrentStock?: number;
}

interface ExchangeItem {
  id: number;
  originalTransactionId: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  action: 'Exchange' | 'Return';
  newProductId?: number | null;
  newProductName?: string;
  newQuantity?: number;
  newUnitPrice?: number;
  newSellPrice?: number;
  currentStock?: number;
  stockError?: string;
  profitData?: {
    TotalProfit: number;
    ProfitPerUnit: number;
    ProfitPercentage: number;
  } | null;
}

// API Configuration
const API_BASE = 'http://devmystock.byteheart.com';

export default function RetExTransactionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const transactionNumber = params.transactionNumber as string || params.transactionId as string || '';
  const organizationId = params.organizationId as string || params.orgId as string || '';

  // --- States ---
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [transactionItems, setTransactionItems] = useState<TransactionItem[]>([]);
  const [processedItems, setProcessedItems] = useState<TransactionItem[]>([]);
  const [customer, setCustomer] = useState<CustomerDetails | null>(null);
  const [allProducts, setAllProducts] = useState<ProductOption[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<ProductOption[]>([]);
  const [apiKey, setApiKey] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [exchangeItems, setExchangeItems] = useState<ExchangeItem[]>([]);
  const [showProductPicker, setShowProductPicker] = useState<number | null>(null);
  
  // Payment Information States
  const [paymentAmount, setPaymentAmount] = useState<string>('0');
  const [paymentMethod, setPaymentMethod] = useState<string>('Cash');
  const [paymentReference, setPaymentReference] = useState<string>('');
  
  // Summary calculations
  const [originalTotal, setOriginalTotal] = useState(0);
  const [originalPaid, setOriginalPaid] = useState(0);
  const [originalDue, setOriginalDue] = useState(0);
  const [newTotalAmount, setNewTotalAmount] = useState(0);
  const [newPayment, setNewPayment] = useState(0);
  const [totalRefund, setTotalRefund] = useState(0);
  const [finalDue, setFinalDue] = useState(0);
  const [netRefund, setNetRefund] = useState(0);

  // --- Load API Key from storage based on organization ---
  const loadApiKey = async () => {
    try {
      const session = await AsyncStorage.getItem("user_session");
      if (session) {
        const userData = JSON.parse(session);
        const orgIdNum = parseInt(organizationId);
        let key = userData.ApiKey || "";
        
        if (userData.Organizations && Array.isArray(userData.Organizations)) {
          const org = userData.Organizations.find((o: any) => o.OrganizationId === orgIdNum);
          if (org && org.ApiKey) {
            key = org.ApiKey;
            console.log(`✅ Using API Key for Organization ${orgIdNum}: ${key.substring(0, 20)}...`);
          }
        }
        
        setApiKey(key);
        return key;
      }
    } catch (error) {
      console.error('Error loading API key:', error);
    }
    return '';
  };

  // --- Fetch Data ---
  useEffect(() => {
    if (transactionNumber) {
      loadInitialData();
    } else {
      Alert.alert('Error', 'No Transaction Number provided.');
      router.back();
    }
  }, [transactionNumber]);

  useEffect(() => {
    calculateSummary();
  }, [exchangeItems, paymentAmount, transactionItems]);

  // Filter products when search query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = allProducts.filter(product =>
        product.ProductName.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts(allProducts);
    }
  }, [searchQuery, allProducts]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      const key = await loadApiKey();
      if (!key) {
        Alert.alert('Error', 'API Key not found. Please login again.');
        setLoading(false);
        return;
      }

      const headers = {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'API_KEY': key,
      };

      console.log(`📡 Fetching transaction: ${transactionNumber} for org: ${organizationId}`);

      // 1. Fetch transaction by number
      const url = `${API_BASE}/Stock/GetTransactionByNumber?transactionNumber=${transactionNumber}&orgId=${organizationId}`;
      
      const txRes = await fetch(url, { headers });
      
      if (!txRes.ok) {
        throw new Error(`Failed to fetch transaction: ${txRes.status}`);
      }
      
      const txJson = await txRes.json();
      
      let items: TransactionItem[] = [];
      if (txJson.data) {
        items = Array.isArray(txJson.data) ? txJson.data : [txJson.data];
      } else if (txJson.result) {
        items = Array.isArray(txJson.result) ? txJson.result : [txJson.result];
      } else if (Array.isArray(txJson)) {
        items = txJson;
      } else {
        items = [txJson];
      }
      
      // Log first item for debugging
      if (items.length > 0) {
        const item = items[0];
        console.log(`📝 Transaction Data:`);
        console.log(`  - Amount: ${item.Amount}`);
        console.log(`  - DueAmount: ${item.DueAmount}`);
        console.log(`  - Paid (Amount - DueAmount): ${item.Amount - item.DueAmount}`);
        console.log(`  - TotalAmount: ${item.TotalAmount}`);
        console.log(`  - IsProcessed: ${item.IsProcessed}`);
        console.log(`  - TransactionType: ${item.TransactionType}`);
      }
      
      // Separate processed and unprocessed items
      const unprocessed = items.filter(item => 
        item && item.ProductName && 
        item.ProductName !== 'Unknown' && 
        item.ProductName !== 'N/A' &&
        !item.IsProcessed && 
        (item.TransactionType?.toLowerCase() === 'out' || item.TransactionType?.toLowerCase() === 'ex-out')
      );
      
      const processed = items.filter(item => 
        item && item.ProductName && 
        item.ProductName !== 'Unknown' && 
        item.ProductName !== 'N/A' &&
        item.IsProcessed && 
        item.TransactionType?.toLowerCase() !== 'return' && 
        item.TransactionType?.toLowerCase() !== 'payment' && 
        item.TransactionType?.toLowerCase() !== 'refund'
      );
      
      console.log(`✅ Unprocessed items: ${unprocessed.length}, Processed items: ${processed.length}`);
      
      // Calculate totals from unprocessed items
      const total = unprocessed.reduce((sum, item) => sum + (item.Amount || 0), 0);
      const due = unprocessed.reduce((sum, item) => sum + (item.DueAmount || 0), 0);
      const paid = total - due;
      
      console.log(`💰 Calculated: Total=${total}, Due=${due}, Paid=${paid}`);
      
      setOriginalTotal(total);
      setOriginalPaid(paid);
      setOriginalDue(due);
      
      setTransactionItems(unprocessed);
      setProcessedItems(processed);

      // 2. Fetch customer by transaction number
      try {
        const custRes = await fetch(
          `${API_BASE}/Stock/GetCustomerByTransNumber?transactionNumber=${transactionNumber}`,
          { headers }
        );
        if (custRes.ok) {
          const custJson = await custRes.json();
          if (custJson.data) {
            setCustomer(custJson.data);
          }
        }
      } catch (custErr) {
        console.log('Customer fetch failed:', custErr);
      }

      // 3. Fetch all products for exchange dropdown
      try {
        const prodRes = await fetch(`${API_BASE}/Products/GetAllProduct`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
            'API_KEY': key,
          },
        });
        
        if (prodRes.ok) {
          const prodJson = await prodRes.json();
          
          let products: ProductOption[] = [];
          if (prodJson.data) {
            products = Array.isArray(prodJson.data) ? prodJson.data : [prodJson.data];
          } else if (prodJson.result) {
            products = Array.isArray(prodJson.result) ? prodJson.result : [prodJson.result];
          } else if (Array.isArray(prodJson)) {
            products = prodJson;
          }
          
          const orgIdNum = parseInt(organizationId);
          products = products.filter(p => p.OrganizationId === orgIdNum);
          
          setAllProducts(products);
          setFilteredProducts(products);
        }
      } catch (prodErr) {
        console.log('Products fetch error:', prodErr);
      }

    } catch (err: any) {
      console.error('Error loading data:', err);
      Alert.alert('Error', err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // --- Calculate Summary ---
  const calculateSummary = () => {
    // Original Total from unprocessed items (use Amount from API)
    const total = transactionItems.reduce((sum, item) => sum + (item.Amount || 0), 0);
    setOriginalTotal(total);

    // Original Due from API
    const due = transactionItems.reduce((sum, item) => sum + (item.DueAmount || 0), 0);
    setOriginalDue(due);
    
    // Original Paid = Total - Due
    const paid = total - due;
    setOriginalPaid(paid);

    console.log(`📊 Summary: Total=${total}, Due=${due}, Paid=${paid}`);

    // Calculate exchange/return adjustments
    let totalAdjustment = 0;
    let refundAmount = 0;
    let additionalPayment = 0;

    exchangeItems.forEach(item => {
      if (item.action === 'Return') {
        refundAmount += item.totalAmount;
        totalAdjustment -= item.totalAmount;
      } else if (item.action === 'Exchange' && item.newProductId && !item.stockError) {
        const newQty = item.newQuantity || item.quantity;
        const newPrice = item.newSellPrice || 0;
        const newTotal = newQty * newPrice;
        const difference = newTotal - item.totalAmount;
        totalAdjustment += difference;
        
        if (difference > 0) {
          additionalPayment += difference;
        } else if (difference < 0) {
          refundAmount += Math.abs(difference);
        }
      }
    });

    const newTotal = total + totalAdjustment;
    setNewTotalAmount(newTotal);

    // Get payment amount
    const paymentAmt = parseFloat(paymentAmount) || 0;
    const totalPaidWithNew = paid + paymentAmt;

    // Calculate final due/refund
    if (newTotal > totalPaidWithNew) {
      // Customer needs to pay more
      const dueAmount = newTotal - totalPaidWithNew;
      setFinalDue(dueAmount);
      setNetRefund(0);
      setNewPayment(paymentAmt);
    } else if (newTotal < totalPaidWithNew) {
      // Customer gets refund
      const refundAmt = totalPaidWithNew - newTotal;
      setFinalDue(0);
      setNetRefund(refundAmt);
      setNewPayment(paymentAmt);
    } else {
      // Exactly equal
      setFinalDue(0);
      setNetRefund(0);
      setNewPayment(paymentAmt);
    }

    setTotalRefund(refundAmount);
    
    console.log('📊 Summary Updated:', {
      originalTotal: total,
      originalPaid: paid,
      originalDue: due,
      newTotal,
      finalDue: finalDue > 0 ? finalDue : 0,
      netRefund: netRefund > 0 ? netRefund : 0,
      newPayment: paymentAmt,
      refundAmount
    });
  };

  // --- Exchange/Return Functions ---
  const addExchangeItem = (item: TransactionItem) => {
    const existing = exchangeItems.find(
      i => i.action === 'Exchange' && i.productId === item.ProductId
    );
    if (existing) {
      Alert.alert('Warning', `Product "${item.ProductName}" already has an exchange entry.`);
      return;
    }

    const newItem: ExchangeItem = {
      id: Date.now(),
      originalTransactionId: item.TransactionId,
      productId: item.ProductId,
      productName: item.ProductName,
      quantity: item.Quantity,
      unitPrice: item.UnitPrice,
      totalAmount: item.TotalAmount,
      action: 'Exchange',
      newProductId: null,
      newQuantity: item.Quantity,
      newUnitPrice: 0,
      newSellPrice: 0,
      currentStock: 0,
      stockError: '',
      profitData: null,
    };

    setExchangeItems(prev => [...prev, newItem]);
  };

  const addReturnItem = (item: TransactionItem) => {
    const existing = exchangeItems.find(
      i => i.action === 'Return' && i.productId === item.ProductId
    );
    if (existing) {
      Alert.alert('Warning', `Product "${item.ProductName}" is already in the return list.`);
      return;
    }

    const newItem: ExchangeItem = {
      id: Date.now(),
      originalTransactionId: item.TransactionId,
      productId: item.ProductId,
      productName: item.ProductName,
      quantity: item.Quantity,
      unitPrice: item.UnitPrice,
      totalAmount: item.TotalAmount,
      action: 'Return',
    };

    setExchangeItems(prev => [...prev, newItem]);
  };

  const removeExchangeItem = (id: number) => {
    setExchangeItems(prev => prev.filter(item => item.id !== id));
  };

  const selectProductForExchange = (itemId: number, product: ProductOption) => {
    const existing = exchangeItems.find(
      i => i.id !== itemId && i.action === 'Exchange' && i.newProductId === product.ProductId
    );
    if (existing) {
      Alert.alert('Warning', 'This product is already selected in another exchange item.');
      return;
    }

    setExchangeItems(prev => prev.map(item => {
      if (item.id === itemId && item.action === 'Exchange') {
        const unitPrice = product.UnitPrice || 0;
        const sellPrice = product.SalesValue || unitPrice;
        const currentStock = product.CurrentStock || 0;
        
        const profitPerUnit = sellPrice - unitPrice;
        const totalProfit = profitPerUnit * (item.newQuantity || item.quantity);
        const profitPercentage = unitPrice > 0 ? (profitPerUnit / unitPrice) * 100 : 0;

        return {
          ...item,
          newProductId: product.ProductId,
          newProductName: product.ProductName,
          newUnitPrice: unitPrice,
          newSellPrice: sellPrice,
          currentStock: currentStock,
          profitData: {
            TotalProfit: totalProfit,
            ProfitPerUnit: profitPerUnit,
            ProfitPercentage: profitPercentage,
          },
          stockError: currentStock < (item.newQuantity || item.quantity) ? 
            `Insufficient stock! Available: ${currentStock}` : '',
        };
      }
      return item;
    }));
    setShowProductPicker(null);
    setSearchQuery('');
  };

  const updateExchangeQuantity = (itemId: number, qty: number) => {
    setExchangeItems(prev => prev.map(item => {
      if (item.id === itemId && item.action === 'Exchange') {
        const newQty = Math.max(1, qty);
        let stockError = '';
        
        if (item.currentStock !== undefined && newQty > item.currentStock) {
          stockError = `Insufficient stock! Available: ${item.currentStock}`;
        }

        const sellPrice = item.newSellPrice || 0;
        const unitPrice = item.newUnitPrice || 0;
        const profitPerUnit = sellPrice - unitPrice;
        const totalProfit = profitPerUnit * newQty;
        const profitPercentage = unitPrice > 0 ? (profitPerUnit / unitPrice) * 100 : 0;

        return {
          ...item,
          newQuantity: newQty,
          stockError: stockError,
          profitData: {
            TotalProfit: totalProfit,
            ProfitPerUnit: profitPerUnit,
            ProfitPercentage: profitPercentage,
          },
        };
      }
      return item;
    }));
  };

  const updateExchangeSellPrice = (itemId: number, priceText: string) => {
    const price = parseFloat(priceText) || 0;
    
    setExchangeItems(prev => prev.map(item => {
      if (item.id === itemId && item.action === 'Exchange') {
        const sellPrice = Math.max(0, price);
        const unitPrice = item.newUnitPrice || 0;
        const qty = item.newQuantity || item.quantity || 1;
        
        const profitPerUnit = sellPrice - unitPrice;
        const totalProfit = profitPerUnit * qty;
        const profitPercentage = unitPrice > 0 ? (profitPerUnit / unitPrice) * 100 : 0;

        return {
          ...item,
          newSellPrice: sellPrice,
          profitData: {
            TotalProfit: totalProfit,
            ProfitPerUnit: profitPerUnit,
            ProfitPercentage: profitPercentage,
          },
        };
      }
      return item;
    }));
  };

  // --- Submit Exchange/Return ---
  const handleProcess = async () => {
    if (exchangeItems.length === 0) {
      Alert.alert('Warning', 'Please add items to exchange or return');
      return;
    }

    const incomplete = exchangeItems.some(
      item => item.action === 'Exchange' && !item.newProductId
    );
    if (incomplete) {
      Alert.alert('Warning', 'Please select new products for all exchange items');
      return;
    }

    const hasError = exchangeItems.some(item => item.stockError);
    if (hasError) {
      Alert.alert('Warning', 'Please fix stock errors before processing');
      return;
    }

    for (const item of exchangeItems) {
      if (item.action === 'Exchange') {
        if (item.newSellPrice === undefined || item.newSellPrice <= 0) {
          Alert.alert('Warning', 'Please enter sell price for exchange item');
          return;
        }
        if (!item.newQuantity || item.newQuantity <= 0) {
          Alert.alert('Warning', 'Please enter quantity for exchange item');
          return;
        }
      }
    }

    const paymentAmt = parseFloat(paymentAmount) || 0;
    if (paymentAmt > 0 && !paymentMethod) {
      Alert.alert('Warning', 'Please select payment method');
      return;
    }

    setSubmitLoading(true);

    const items = exchangeItems.map(item => ({
      OriginalTransactionId: item.originalTransactionId,
      ProductId: item.productId,
      Quantity: item.quantity,
      UnitPrice: item.unitPrice,
      SellPrice: item.unitPrice,
      TotalAmount: item.totalAmount,
      Action: item.action,
      NewProductId: item.newProductId || null,
      NewQuantity: item.newQuantity || item.quantity,
      NewUnitPrice: item.newUnitPrice || 0,
      NewSellPrice: item.newSellPrice || 0,
      PaymentAmount: paymentAmt,
      PaymentMethod: paymentMethod,
      PaymentReference: paymentReference || `PAY-${Date.now()}`,
    }));

    // Build payload - only include Remarks if it has content
    const payload: any = {
      TransactionNumber: transactionNumber,
      OrganizationId: parseInt(organizationId),
      ExchangeDate: new Date().toISOString(),
      TotalPaymentAmount: paymentAmt,
      TotalPaymentMethod: paymentMethod,
      TotalPaymentReference: paymentReference || `PAY-${Date.now()}`,
      Items: items,
    };

    // Only add Remarks if it has content
    if (remarks && remarks.trim().length > 0) {
      payload.Remarks = remarks.trim();
    }

    console.log('📤 Submitting payload:', JSON.stringify(payload, null, 2));

    try {
      const headers = {
        'Content-Type': 'application/json',
        'API_KEY': apiKey,
        'Authorization': `Bearer ${apiKey}`,
      };

      const res = await fetch(`${API_BASE}/Stock/ProcessExchangeReturn`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      console.log('📥 Response:', JSON.stringify(result, null, 2));

      if (res.ok && result.success !== false) {
        const successMsg = result.message || 'Exchange/Return processed successfully!';
        let summary = `${successMsg}\n\nTransaction Summary:\n`;
        summary += `Original Total: ৳${originalTotal.toFixed(2)}\n`;
        summary += `Original Paid: ৳${originalPaid.toFixed(2)}\n`;
        summary += `Original Due: ৳${originalDue.toFixed(2)}\n`;
        summary += `New Total: ৳${newTotalAmount.toFixed(2)}\n`;
        if (netRefund > 0) {
          summary += `Refund Amount: ৳${netRefund.toFixed(2)}`;
        } else {
          summary += `Due Amount: ৳${finalDue.toFixed(2)}`;
        }

        Alert.alert('Success!', summary, [
          { 
            text: 'OK', 
            onPress: () => {
              // Navigate back to sales_list with refresh parameter
              router.push({
                pathname: '/sales_list',
                params: { refresh: Date.now().toString() }
              });
            } 
          },
        ]);
      } else {
        Alert.alert('Error', result.message || result.error || 'Server rejected the request.');
      }
    } catch (err) {
      console.error('Submit error:', err);
      Alert.alert('Error', 'Network error. Could not connect to server.');
    } finally {
      setSubmitLoading(false);
    }
  };

  // --- Render Product Card ---
  const renderProductCard = (item: TransactionItem) => {
    const hasExchange = exchangeItems.some(
      i => i.action === 'Exchange' && i.productId === item.ProductId
    );
    const hasReturn = exchangeItems.some(
      i => i.action === 'Return' && i.productId === item.ProductId
    );

    return (
      <View key={item.TransactionId} style={styles.productCard}>
        <View style={styles.productRow}>
          <View style={styles.productLeft}>
            <Text style={styles.productName}>{item.ProductName}</Text>
            <Text style={styles.productCategory}>{item.Category || 'N/A'}</Text>
          </View>
          <View style={styles.productRight}>
            <Text style={styles.productStat}>Qty: {item.Quantity}</Text>
            <Text style={styles.productStat}>Price: ৳{item.UnitPrice.toFixed(2)}</Text>
            <Text style={styles.productTotal}>Total: ৳{item.TotalAmount.toFixed(2)}</Text>
          </View>
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.exchangeBtn, hasExchange && styles.actionBtnActive]}
            onPress={() => addExchangeItem(item)}
            disabled={hasExchange}
          >
            <Text style={[styles.actionBtnText, hasExchange && styles.actionBtnTextActive]}>
              Exchange
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.returnBtn, hasReturn && styles.actionBtnActive]}
            onPress={() => addReturnItem(item)}
            disabled={hasReturn}
          >
            <Text style={[styles.actionBtnText, hasReturn && styles.actionBtnTextActive]}>
              Return
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // --- Render Processed Product Card ---
  const renderProcessedProductCard = (item: TransactionItem) => {
    return (
      <View key={item.TransactionId} style={styles.processedProductCard}>
        <View style={styles.productRow}>
          <View style={styles.productLeft}>
            <Text style={styles.productName}>{item.ProductName}</Text>
            <Text style={styles.productCategory}>{item.Category || 'N/A'}</Text>
          </View>
          <View style={styles.productRight}>
            <Text style={styles.productStat}>Qty: {item.Quantity}</Text>
            <Text style={styles.productStat}>Price: ৳{item.UnitPrice.toFixed(2)}</Text>
            <Text style={styles.productTotal}>Total: ৳{item.TotalAmount.toFixed(2)}</Text>
          </View>
        </View>
      </View>
    );
  };

  // --- Render Exchange Item ---
  const renderExchangeItem = (item: ExchangeItem) => {
    const isExchange = item.action === 'Exchange';
    const isReturn = item.action === 'Return';

    return (
      <View key={item.id} style={styles.exchangeItemCard}>
        <View style={styles.exchangeHeader}>
          <View style={[styles.exchangeBadge, isExchange ? styles.exchangeBadgeGreen : styles.exchangeBadgeRed]}>
            <Text style={styles.exchangeBadgeText}>{item.action}</Text>
          </View>
          <Text style={styles.exchangeProductName}>{item.productName}</Text>
          <Text style={styles.exchangeOriginalQty}>Original Qty: {item.quantity}</Text>
        </View>

        {isExchange && (
          <View style={styles.exchangeDetails}>
            <View style={styles.exchangeRow}>
              <Text style={styles.exchangeLabel}>New Product</Text>
              <TouchableOpacity
                style={styles.exchangeProductSelect}
                onPress={() => setShowProductPicker(item.id)}
              >
                <Text style={styles.exchangeProductSelectText}>
                  {item.newProductName || 'Select New Product'}
                </Text>
                <Text style={styles.exchangeProductSelectArrow}>▾</Text>
              </TouchableOpacity>
            </View>

            {item.newProductId && (
              <>
                <View style={styles.exchangeFields}>
                  <View style={styles.exchangeField}>
                    <Text style={styles.exchangeFieldLabel}>Stock</Text>
                    <Text style={styles.exchangeFieldValue}>{item.currentStock || 0}</Text>
                  </View>
                  <View style={styles.exchangeField}>
                    <Text style={styles.exchangeFieldLabel}>Qty</Text>
                    <View style={styles.qtyControls}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateExchangeQuantity(item.id, (item.newQuantity || 1) - 1)}
                      >
                        <Text style={styles.qtyBtnText}>−</Text>
                      </TouchableOpacity>
                      <Text style={styles.qtyValue}>{item.newQuantity || 0}</Text>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateExchangeQuantity(item.id, (item.newQuantity || 1) + 1)}
                      >
                        <Text style={styles.qtyBtnText}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.exchangeField}>
                    <Text style={styles.exchangeFieldLabel}>Buy Price</Text>
                    <Text style={styles.exchangeFieldValue}>৳{(item.newUnitPrice || 0).toFixed(2)}</Text>
                  </View>
                  <View style={styles.exchangeField}>
                    <Text style={styles.exchangeFieldLabel}>Sell Price</Text>
                    <TextInput
                      style={styles.exchangeSellInput}
                      value={(item.newSellPrice || 0).toString()}
                      onChangeText={(text) => updateExchangeSellPrice(item.id, text)}
                      keyboardType="numeric"
                      placeholder="0.00"
                      placeholderTextColor="#94a3b8"
                    />
                  </View>
                </View>

                {item.stockError && (
                  <Text style={styles.stockError}>{item.stockError}</Text>
                )}

                {item.profitData && (
                  <View style={styles.profitContainer}>
                    <Text style={[styles.profitMain, { color: item.profitData.TotalProfit >= 0 ? '#065f46' : '#dc3545' }]}>
                      Profit: {item.profitData.TotalProfit >= 0 ? '+' : ''}৳{item.profitData.TotalProfit.toFixed(2)}
                    </Text>
                    <Text style={styles.profitDetails}>
                      Per unit: ৳{item.profitData.ProfitPerUnit.toFixed(2)} · ({item.profitData.ProfitPercentage.toFixed(1)}%)
                    </Text>
                  </View>
                )}

                <View style={styles.newTotalContainer}>
                  <Text style={styles.newTotalLabel}>New:</Text>
                  <Text style={styles.newTotalValue}>
                    ৳{((item.newSellPrice || 0) * (item.newQuantity || item.quantity)).toFixed(2)}
                  </Text>
                </View>
              </>
            )}

            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => removeExchangeItem(item.id)}
            >
              <Text style={styles.removeBtnText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}

        {isReturn && (
          <View style={styles.returnDetails}>
            <View style={styles.returnInfo}>
              <Text style={styles.returnInfoText}>Qty: {item.quantity}</Text>
              <Text style={styles.returnInfoText}>Price: ৳{item.unitPrice.toFixed(2)}</Text>
              <Text style={styles.returnInfoText}>Total: ৳{item.totalAmount.toFixed(2)}</Text>
            </View>
            <TouchableOpacity
              style={styles.removeBtn}
              onPress={() => removeExchangeItem(item.id)}
            >
              <Text style={styles.removeBtnText}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // --- Render Product Picker Modal ---
  const renderProductPickerModal = () => {
    const currentItemId = showProductPicker;
    if (!currentItemId) return null;

    const currentItem = exchangeItems.find(i => i.id === currentItemId);
    const selectedIds = exchangeItems
      .filter(i => i.id !== currentItemId && i.action === 'Exchange' && i.newProductId)
      .map(i => i.newProductId);

    return (
      <Modal
        visible={showProductPicker !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowProductPicker(null);
          setSearchQuery('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Search product...</Text>
              <TouchableOpacity onPress={() => {
                setShowProductPicker(null);
                setSearchQuery('');
              }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalSearchContainer}>
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search product..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
            </View>

            {currentItem && (
              <View style={styles.modalCurrentProduct}>
                <Text style={styles.modalCurrentLabel}>Current:</Text>
                <Text style={styles.modalCurrentValue}>{currentItem.productName}</Text>
                <Text style={styles.modalCurrentQty}>Qty: {currentItem.quantity}</Text>
              </View>
            )}

            <FlatList
              data={filteredProducts.filter(p => !selectedIds.includes(p.ProductId) && p.ProductId !== currentItem?.productId)}
              keyExtractor={(item) => item.ProductId.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalProductItem}
                  onPress={() => selectProductForExchange(currentItemId, item)}
                >
                  <View style={styles.modalProductItemLeft}>
                    <Text style={styles.modalProductName}>{item.ProductName}</Text>
                    <Text style={styles.modalProductStock}>Stock: {item.CurrentStock || 0}</Text>
                  </View>
                  <View style={styles.modalProductItemRight}>
                    <Text style={styles.modalProductPrice}>Buy: ৳{(item.UnitPrice || 0).toFixed(2)}</Text>
                    <Text style={styles.modalProductPrice}>Sell: ৳{(item.SalesValue || 0).toFixed(2)}</Text>
                  </View>
                </TouchableOpacity>
              )}
              ListEmptyComponent={() => (
                <Text style={styles.modalEmpty}>No products available</Text>
              )}
            />
            
            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => {
                setShowProductPicker(null);
                setSearchQuery('');
              }}
            >
              <Text style={styles.modalCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // --- Loading State ---
  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Stack.Screen options={{ title: 'Exchange/Return' }} />
        <ActivityIndicator size="large" color="#28a745" />
        <Text style={styles.loadingText}>Loading Transaction...</Text>
      </SafeAreaView>
    );
  }

  // --- Empty State ---
  if (transactionItems.length === 0 && processedItems.length === 0) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Stack.Screen options={{ title: 'Exchange/Return' }} />
        <Text style={styles.errorText}>No Transaction Found.</Text>
        <TouchableOpacity style={styles.backBtnLarge} onPress={() => router.back()}>
          <Text style={styles.backBtnLargeText}>← Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const firstItem = transactionItems[0] || processedItems[0];
  const txNumber = firstItem?.TransactionNumber || transactionNumber;
  
  let txDate = 'N/A';
  if (firstItem?.TransactionDate) {
    try {
      const match = firstItem.TransactionDate.match(/\/Date\((\d+)\)\//);
      if (match) {
        const date = new Date(parseInt(match[1]));
        txDate = date.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    } catch (e) {
      console.log('Date parsing error:', e);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ 
        title: 'Exchange/Return',
        headerBackTitle: 'Back',
      }} />
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Transaction Header */}
        <View style={styles.headerCard}>
          <View style={styles.headerTopRow}>
            <Text style={styles.headerTitle}>Exchange/Return Transaction</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.headerActionBtn} 
                onPress={() => router.push('/(tabs)/sales_list')}
              >
                <Text style={styles.headerActionBtnText}>Back</Text>
              </TouchableOpacity>
                  
              <TouchableOpacity 
                style={styles.headerActionBtn} 
                onPress={() => router.push('/returnList')}
              >
                <Text style={styles.headerActionBtnText}>Return History</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.headerTxNumber}>Transaction #: {txNumber}</Text>
        </View>

        {/* Info Grid */}
        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Transaction Date</Text>
            <Text style={styles.infoValue}>{txDate}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Customer Name</Text>
            <Text style={styles.infoValue}>{customer?.CustomerName || firstItem?.CustomerName || 'Walk-in'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{customer?.PhoneNumber || firstItem?.CustomerPhone || 'N/A'}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Organization ID</Text>
            <Text style={styles.infoValue}>{firstItem?.OrganizationId || organizationId}</Text>
          </View>
        </View>

        {/* Products in this Transaction */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Products in this Transaction</Text>
        </View>
        {transactionItems.map(renderProductCard)}

        {/* Products Exchange History */}
        {processedItems.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Products Exchange History</Text>
            </View>
            {processedItems.map(renderProcessedProductCard)}
          </>
        )}

        {/* Exchange/Return Items */}
        {exchangeItems.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Exchange/Return Items</Text>
            </View>
            {exchangeItems.map(renderExchangeItem)}
          </>
        )}

        {/* Summary Section */}
        <View style={styles.summaryContainer}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>ORIGINAL TOTAL</Text>
              <Text style={styles.statValue}>৳{originalTotal.toFixed(2)}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>ORIGINAL PAID</Text>
              <Text style={styles.statValue}>৳{originalPaid.toFixed(2)}</Text>
            </View>
            <View style={[styles.statBox, styles.statBoxGreen]}>
              <Text style={[styles.statLabel, styles.statLabelGreen]}>FINAL DUE / REFUND</Text>
              <Text style={[styles.statValue, styles.statValueGreen]}>
                ৳{finalDue > 0 ? finalDue.toFixed(2) : netRefund > 0 ? netRefund.toFixed(2) : originalDue.toFixed(2)}
              </Text>
            </View>
          </View>

          <View style={styles.newAmountRow}>
            <View style={[styles.newAmountBox, styles.newAmountBoxGreen]}>
              <Text style={styles.newAmountLabel}>NEW TOTAL AMOUNT</Text>
              <Text style={[styles.newAmountValue, styles.newAmountValueGreen]}>
                ৳{newTotalAmount.toFixed(2)}
              </Text>
            </View>
            <View style={[styles.newAmountBox, styles.newAmountBoxGreen]}>
              <Text style={styles.newAmountLabel}>NEW PAYMENT</Text>
              <Text style={[styles.newAmountValue, styles.newAmountValueGreen]}>
                ৳{newPayment.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Payment Information */}
          {(exchangeItems.length > 0) && (
            <View style={styles.paymentInfoContainer}>
              <Text style={styles.paymentInfoTitle}>Payment Information</Text>
              
              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Payment Amount (৳):</Text>
                <TextInput
                  style={styles.paymentInput}
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                  keyboardType="numeric"
                  placeholder="0"
                />
              </View>

              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Payment Method:</Text>
                <View style={styles.paymentMethodContainer}>
                  {['Cash', 'Card', 'Mobile Banking', 'Bank Transfer'].map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={[
                        styles.paymentMethodBtn,
                        paymentMethod === method && styles.paymentMethodBtnActive
                      ]}
                      onPress={() => setPaymentMethod(method)}
                    >
                      <Text style={[
                        styles.paymentMethodText,
                        paymentMethod === method && styles.paymentMethodTextActive
                      ]}>
                        {method}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.paymentRow}>
                <Text style={styles.paymentLabel}>Reference (Optional):</Text>
                <TextInput
                  style={styles.paymentInput}
                  value={paymentReference}
                  onChangeText={setPaymentReference}
                  placeholder="Check/Transaction No"
                  placeholderTextColor="#94a3b8"
                />
              </View>
            </View>
          )}
        </View>

        {/* Remarks */}
        <View style={styles.remarksContainer}>
          <Text style={styles.remarksLabel}>Remarks (Optional)</Text>
          <TextInput
            style={styles.remarksInput}
            placeholder="Enter remarks for this exchange/return (optional)..."
            placeholderTextColor="#94a3b8"
            value={remarks}
            onChangeText={setRemarks}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            exchangeItems.length === 0 && styles.submitButtonDisabled,
          ]}
          onPress={handleProcess}
          disabled={submitLoading || exchangeItems.length === 0}
        >
          {submitLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.submitButtonText}>✓ Process Exchange/Return</Text>
          )}
        </TouchableOpacity>

        {/* Product Picker Modal */}
        {renderProductPickerModal()}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#dc2626',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },

  // Header Card
  headerCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#edf2f7',
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  headerActionBtnText: {
    fontSize: 12,
    color: '#475569',
  },
  headerTxNumber: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '600',
    marginTop: 8,
  },

  // Info Grid
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginBottom: 12,
  },
  infoItem: {
    backgroundColor: '#ffffff',
    width: '48%',
    margin: '1%',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  infoLabel: {
    fontSize: 10,
    color: '#64748b',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 2,
  },

  // Section
  sectionHeader: {
    marginTop: 16,
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: '#e9ecef',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a2639',
  },

  // Product Card
  productCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  processedProductCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  productLeft: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
  },
  productCategory: {
    fontSize: 11,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    fontWeight: '500',
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  productRight: {
    alignItems: 'flex-end',
  },
  productStat: {
    fontSize: 12,
    color: '#64748b',
  },
  productTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },

  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 8,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1.5,
  },
  exchangeBtn: {
    borderColor: '#ffd966',
    backgroundColor: '#fff4e0',
  },
  returnBtn: {
    borderColor: '#fbc4c4',
    backgroundColor: '#fee9e9',
  },
  actionBtnActive: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b85e00',
  },
  actionBtnTextActive: {
    color: '#ffffff',
  },

  // Exchange Item Card
  exchangeItemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  exchangeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  exchangeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 10,
  },
  exchangeBadgeGreen: {
    backgroundColor: '#28a745',
  },
  exchangeBadgeRed: {
    backgroundColor: '#dc3545',
  },
  exchangeBadgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  exchangeProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  exchangeOriginalQty: {
    fontSize: 12,
    color: '#64748b',
  },

  // Exchange Details
  exchangeDetails: {
    marginTop: 12,
  },
  exchangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  exchangeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    width: 80,
  },
  exchangeProductSelect: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  exchangeProductSelectText: {
    fontSize: 13,
    color: '#1e293b',
  },
  exchangeProductSelectArrow: {
    fontSize: 14,
    color: '#64748b',
  },
  exchangeFields: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  exchangeField: {
    flex: 1,
    minWidth: 60,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  exchangeFieldLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  exchangeFieldValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  exchangeSellInput: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    padding: 2,
    minWidth: 50,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 4,
    backgroundColor: '#ffffff',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },

  // Quantity Controls
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyBtn: {
    backgroundColor: '#e2e8f0',
    width: 28,
    height: 28,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
  },
  qtyValue: {
    fontSize: 14,
    fontWeight: '700',
    paddingHorizontal: 10,
    color: '#1e293b',
  },

  // Stock Error
  stockError: {
    fontSize: 11,
    color: '#dc3545',
    marginBottom: 6,
  },

  // Profit Container
  profitContainer: {
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
  },
  profitMain: {
    fontSize: 14,
    fontWeight: '700',
  },
  profitDetails: {
    fontSize: 11,
    color: '#64748b',
  },

  // New Total
  newTotalContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  newTotalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
    marginRight: 8,
  },
  newTotalValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#28a745',
  },

  // Remove Button
  removeBtn: {
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#fee9e9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#fbc4c4',
  },
  removeBtnText: {
    fontSize: 12,
    color: '#dc3545',
    fontWeight: '600',
  },

  // Return Details
  returnDetails: {
    marginTop: 12,
  },
  returnInfo: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  returnInfoText: {
    fontSize: 13,
    color: '#1e293b',
  },

  // Summary
  summaryContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  statBoxGreen: {
    backgroundColor: '#f0fdf4',
    borderColor: '#bbf7d0',
  },
  statLabel: {
    fontSize: 8,
    color: '#64748b',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  statLabelGreen: {
    color: '#15803d',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
  },
  statValueGreen: {
    color: '#15803d',
  },

  newAmountRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  newAmountBox: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
  },
  newAmountBoxGreen: {
    backgroundColor: '#e6f7e6',
    borderColor: '#28a745',
  },
  newAmountLabel: {
    fontSize: 9,
    color: '#64748b',
    fontWeight: '700',
    textAlign: 'center',
  },
  newAmountValue: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  newAmountValueGreen: {
    color: '#1e293b',
  },

  // Payment Information
  paymentInfoContainer: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  paymentInfoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0066cc',
    marginBottom: 10,
  },
  paymentRow: {
    marginBottom: 10,
  },
  paymentLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 4,
  },
  paymentInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: '#1e293b',
  },
  paymentMethodContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  paymentMethodBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  paymentMethodBtnActive: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  paymentMethodText: {
    fontSize: 12,
    color: '#475569',
  },
  paymentMethodTextActive: {
    color: '#ffffff',
  },

  // Remarks
  remarksContainer: {
    marginTop: 16,
  },
  remarksLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
    marginBottom: 6,
  },
  remarksInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    color: '#1e293b',
    fontSize: 14,
  },

  // Submit
  submitButton: {
    backgroundColor: '#28a745',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  // Back Button
  backBtnLarge: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backBtnLargeText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    maxHeight: '80%',
    minHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  modalClose: {
    fontSize: 20,
    color: '#64748b',
    padding: 4,
  },
  modalSearchContainer: {
    paddingVertical: 10,
  },
  modalSearchInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modalCurrentProduct: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  modalCurrentLabel: {
    fontSize: 12,
    color: '#64748b',
    marginRight: 4,
  },
  modalCurrentValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  modalCurrentQty: {
    fontSize: 12,
    color: '#64748b',
  },
  modalProductItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalProductItemLeft: {
    flex: 1,
  },
  modalProductName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  modalProductStock: {
    fontSize: 11,
    color: '#64748b',
  },
  modalProductItemRight: {
    alignItems: 'flex-end',
  },
  modalProductPrice: {
    fontSize: 11,
    color: '#64748b',
  },
  modalEmpty: {
    textAlign: 'center',
    color: '#94a3b8',
    padding: 20,
  },
  modalCancelBtn: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  modalCancelBtnText: {
    fontSize: 15,
    color: '#475569',
    fontWeight: '600',
  },
});