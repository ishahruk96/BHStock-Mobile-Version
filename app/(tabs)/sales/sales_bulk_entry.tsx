import React, { useState } from "react";
import { StyleSheet, View, ScrollView, TextInput, TouchableOpacity, SafeAreaView } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";

export default function SalesBulkEntryMobile() {
  // ডেমো ডাটা যা ইমেজের কলামগুলোর সাথে মিল রেখে তৈরি
  const [items, setItems] = useState([
    { id: 1, category: "Dal", product: "Test", stock: 25, buyPrice: 50, salePrice: 90, qty: 0 },
    { id: 2, category: "Fish", product: "Rui-Dhaka", stock: 99, buyPrice: 300, salePrice: 600, qty: 0 },
    { id: 3, category: "Marine Fish", product: "Loitta", stock: 2.8, buyPrice: 400, salePrice: 480, qty: 0 },
  ]);

  const [paymentMethod, setPaymentMethod] = useState("Cash");

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollBody}>
        
        {/* Header Area */}
        <View style={styles.header}>
          <ThemedText style={styles.title}>Sales Bulk Entry</ThemedText>
          <TouchableOpacity style={styles.backBtn}><ThemedText>← Back</ThemedText></TouchableOpacity>
        </View>

        {/* Organization Info */}
        <View style={styles.infoNote}>
          <Ionicons name="business" size={16} color="#007BFF" />
          <ThemedText style={styles.infoText}>BH Fish Mart (Primary)</ThemedText>
        </View>

        {/* Customer & Payment Info Cards */}
        <View style={styles.card}>
          <ThemedText style={styles.cardHeader}>Customer Details</ThemedText>
          <TextInput style={styles.input} placeholder="Name" />
          <TextInput style={[styles.input, {marginTop: 10}]} placeholder="Phone" keyboardType="phone-pad" />
        </View>

        <View style={styles.card}>
          <ThemedText style={styles.cardHeader}>Payment Information</ThemedText>
          <View style={styles.row}>
            <View style={{flex: 1, marginRight: 8}}>
              <ThemedText style={styles.label}>Amount (৳)</ThemedText>
              <TextInput style={styles.input} placeholder="0" keyboardType="numeric" />
            </View>
            <View style={{flex: 1}}>
              <ThemedText style={styles.label}>Method</ThemedText>
              <View style={styles.pickerBox}>
                <Picker selectedValue={paymentMethod} onValueChange={(val) => setPaymentMethod(val)}>
                  <Picker.Item label="Cash" value="Cash" />
                  <Picker.Item label="Bkash" value="Bkash" />
                </Picker>
              </View>
            </View>
          </View>
        </View>

        {/* Product Items Table (Mobile Optimized Cards) */}
        <ThemedText style={styles.sectionLabel}>Bulk Items List</ThemedText>
        {items.map((item, index) => {
          const totalAmount = item.qty * item.salePrice;
          const profit = (item.salePrice - item.buyPrice) * item.qty;
          const profitPerItem = item.salePrice - item.buyPrice;
          const profitPercent = ((profitPerItem / item.buyPrice) * 100).toFixed(1);
          const isLowStock = item.stock < 10;

          return (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View>
                  <ThemedText style={styles.itemCategory}>{item.category}</ThemedText>
                  <ThemedText style={styles.itemName}>{item.product}</ThemedText>
                </View>
                <View style={[styles.stockBadge, { backgroundColor: isLowStock ? '#FFF3CD' : '#E8F5E9' }]}>
                  <ThemedText style={[styles.stockText, { color: isLowStock ? '#856404' : '#2E7D32' }]}>
                    Stock: {item.stock} {isLowStock ? '(Low)' : ''}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.divider} />

              {/* PC version fields layout */}
              <View style={styles.row}>
                <View style={styles.fieldBox}>
                  <ThemedText style={styles.label}>Qty</ThemedText>
                  <TextInput 
                    style={styles.input} 
                    placeholder="0" 
                    keyboardType="numeric"
                    onChangeText={(val) => {
                      const newItems = [...items];
                      newItems[index].qty = Number(val);
                      setItems(newItems);
                    }}
                  />
                </View>
                <View style={styles.fieldBox}>
                  <ThemedText style={styles.label}>Buy Price</ThemedText>
                  <TextInput style={[styles.input, styles.readOnly]} value={item.buyPrice.toString()} editable={false} />
                </View>
                <View style={styles.fieldBox}>
                  <ThemedText style={styles.label}>Sale Price</ThemedText>
                  <TextInput style={styles.input} value={item.salePrice.toString()} keyboardType="numeric" />
                </View>
              </View>

              {/* Calculations Row */}
              <View style={styles.calcRow}>
                <View style={styles.amountArea}>
                  <ThemedText style={styles.amountLabel}>Amount (৳)</ThemedText>
                  <ThemedText style={styles.amountVal}>{totalAmount.toFixed(2)}</ThemedText>
                </View>
                <View style={styles.profitArea}>
                  <ThemedText style={styles.profitVal}>Profit: {profit.toFixed(2)}</ThemedText>
                  <ThemedText style={styles.profitSub}>{profitPerItem}tk, {profitPercent}%</ThemedText>
                </View>
                <TouchableOpacity style={styles.resetBtn}>
                   <MaterialCommunityIcons name="undo-variant" size={18} color="#666" />
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {/* Final Summary Card (Green Box) */}
        <View style={styles.summaryContainer}>
          <ThemedText style={styles.summaryTitle}>SALES SUMMARY - BH Fish Mart</ThemedText>
          <SummaryRow label="Total Items" value="0" />
          <SummaryRow label="Total Quantity" value="0.00 pcs" />
          <SummaryRow label="Total Sales Amount" value="৳0.00" />
          <SummaryRow label="Net Profit" value="৳0.00" isBold />
        </View>

        {/* Footer Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#f8d7da'}]}><ThemedText style={{color: '#721c24'}}>Clear All</ThemedText></TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#17A2B8', flex: 1.5}]}><ThemedText style={{color: 'white', fontWeight: 'bold'}}>Print Invoice</ThemedText></TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#28A745'}]}><ThemedText style={{color: 'white', fontWeight: 'bold'}}>Save</ThemedText></TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const SummaryRow = ({ label, value, isBold }: any) => (
  <View style={styles.sumRow}>
    <ThemedText style={styles.sumLabel}>{label}:</ThemedText>
    <ThemedText style={[styles.sumVal, isBold && {fontWeight: '900', color: '#155724'}]}>{value}</ThemedText>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  scrollBody: { padding: 15, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 20, fontWeight: 'bold' },
  backBtn: { backgroundColor: '#eee', padding: 8, borderRadius: 5 },
  
  infoNote: { backgroundColor: '#E7F3FF', padding: 10, borderRadius: 8, flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  infoText: { marginLeft: 8, fontSize: 13, color: '#0056b3', fontWeight: 'bold' },

  card: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 15, elevation: 1 },
  cardHeader: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 5 },
  label: { fontSize: 11, color: '#666', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 8, borderRadius: 8, backgroundColor: '#FAFBFD', fontSize: 13 },
  readOnly: { backgroundColor: '#f0f0f0', color: '#888' },
  pickerBox: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, height: 40, justifyContent: 'center' },
  row: { flexDirection: 'row' },

  sectionLabel: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#1A1A1A' },
  itemCard: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#007BFF' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemCategory: { fontSize: 10, color: '#007BFF', fontWeight: 'bold' },
  itemName: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  stockBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  stockText: { fontSize: 10, fontWeight: 'bold' },
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 },
  
  fieldBox: { flex: 1, marginRight: 5 },
  calcRow: { flexDirection: 'row', marginTop: 15, alignItems: 'center', backgroundColor: '#F8F9FA', padding: 10, borderRadius: 8 },
  amountArea: { flex: 1 },
  amountLabel: { fontSize: 10, color: '#777' },
  amountVal: { fontSize: 14, fontWeight: '800', color: '#333' },
  profitArea: { flex: 1, alignItems: 'flex-end' },
  profitVal: { fontSize: 12, fontWeight: 'bold', color: '#28A745' },
  profitSub: { fontSize: 9, color: '#666' },
  resetBtn: { marginLeft: 15, padding: 5 },

  summaryContainer: { backgroundColor: '#E9F7EF', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#D1E7DD', marginBottom: 20 },
  summaryTitle: { fontSize: 12, fontWeight: 'bold', color: '#155724', textAlign: 'center', marginBottom: 10 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  sumLabel: { fontSize: 13, color: '#555' },
  sumVal: { fontSize: 13, fontWeight: 'bold' },

  actionRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: { flex: 1, height: 48, justifyContent: 'center', alignItems: 'center', borderRadius: 10 }
});