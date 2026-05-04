import React, { useState } from "react";
import { StyleSheet, View, ScrollView, TextInput, TouchableOpacity, SafeAreaView, FlatList } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Ionicons, FontAwesome5 } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";

export default function MultiSalesEntry() {
  const [rows, setRows] = useState([{ id: Date.now() }]); // মাল্টিপল রো স্টেট
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  const addRow = () => {
    setRows([...rows, { id: Date.now() }]);
  };

  const removeRow = (id: number) => {
    if (rows.length > 1) {
      setRows(rows.filter(row => row.id !== id));
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <ThemedText style={styles.headerTitle}>Sales Entry</ThemedText>
        <TouchableOpacity style={styles.saveAllBtn}>
          <ThemedText style={styles.saveAllTxt}>Save All</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Date & Add Rows */}
        <View style={styles.topSection}>
          <View style={{ flex: 1 }}>
            <ThemedText style={styles.label}>Date *</ThemedText>
            <View style={styles.dateBox}>
              <ThemedText>05/04/2026</ThemedText>
              <Ionicons name="calendar" size={18} color="#666" />
            </View>
          </View>
          <TouchableOpacity style={styles.addRowsBtn} onPress={addRow}>
            <Ionicons name="add-circle" size={20} color="white" />
            <ThemedText style={styles.addRowsTxt}>Add Rows</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Customer Info Card */}
        <View style={styles.sectionCard}>
          <ThemedText style={styles.sectionTitle}>Customer Information</ThemedText>
          <View style={styles.rowLayout}>
             <InputSmall label="Name" placeholder="Customer Name" />
             <InputSmall label="Phone" placeholder="017..." keyboardType="phone-pad" />
          </View>
          <View style={styles.rowLayout}>
             <InputSmall label="Email" placeholder="Email Address" />
             <InputSmall label="Address" placeholder="Full Address" />
          </View>
        </View>

        {/* Payment Info Card */}
        <View style={styles.sectionCard}>
          <ThemedText style={styles.sectionTitle}>Payment Information</ThemedText>
          <View style={styles.rowLayout}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <ThemedText style={styles.label}>Amount (৳)</ThemedText>
              <TextInput style={styles.input} placeholder="0" keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <ThemedText style={styles.label}>Method</ThemedText>
              <View style={styles.pickerBox}>
                <Picker 
                  selectedValue={paymentMethod} 
                  onValueChange={(val) => setPaymentMethod(val)}
                  style={{ height: 45 }}
                >
                  <Picker.Item label="Cash" value="Cash" />
                  <Picker.Item label="Bkash" value="Bkash" />
                </Picker>
              </View>
            </View>
          </View>
          <View style={styles.paymentSummary}>
             <ThemedText style={styles.summaryText}>Total Sale: <ThemedText style={styles.bold}>৳0.00</ThemedText></ThemedText>
             <ThemedText style={styles.summaryText}>Payment: <ThemedText style={[styles.bold, {color: '#28A745'}]}>৳0.00</ThemedText></ThemedText>
             <ThemedText style={styles.summaryText}>Due: <ThemedText style={[styles.bold, {color: '#DC3545'}]}>৳0.00</ThemedText></ThemedText>
          </View>
        </View>

        {/* Dynamic Product Rows */}
        <ThemedText style={styles.listHeader}>Items to Sell</ThemedText>
        {rows.map((row, index) => (
          <View key={row.id} style={styles.productCard}>
            <View style={styles.productCardHeader}>
              <ThemedText style={styles.rowNumber}>Row #{index + 1}</ThemedText>
              <TouchableOpacity onPress={() => removeRow(row.id)}>
                <Ionicons name="trash-outline" size={20} color="#DC3545" />
              </TouchableOpacity>
            </View>

            <View style={styles.rowLayout}>
              <View style={{ flex: 1.5, marginRight: 8 }}>
                <ThemedText style={styles.label}>Category</ThemedText>
                <TextInput style={styles.input} placeholder="Select..." />
              </View>
              <View style={{ flex: 1.5 }}>
                <ThemedText style={styles.label}>Product</ThemedText>
                <TextInput style={styles.input} placeholder="Select..." />
              </View>
            </View>

            <View style={styles.rowLayout}>
               <InputSmall label="Qty" placeholder="0" keyboardType="numeric" />
               <InputSmall label="Price" placeholder="0.00" keyboardType="numeric" />
               <InputSmall label="Total" placeholder="0.00" editable={false} />
            </View>
            
            <View style={styles.profitBadge}>
               <ThemedText style={styles.profitTxt}>Profit: 0.00tk (0%)</ThemedText>
            </View>
          </View>
        ))}

        {/* Final Sales Summary */}
        <View style={styles.finalSummaryCard}>
          <ThemedText style={styles.finalTitle}>SALES SUMMARY - BH Fish Mart</ThemedText>
          <SummaryItem label="Total Items" value="0" />
          <SummaryItem label="Total Quantity" value="0 pcs" />
          <SummaryItem label="Total Sales" value="৳0.00" />
          <SummaryItem label="Net Profit" value="৳0.00" isBold />
          
          <View style={styles.statusRow}>
             <ThemedText style={styles.label}>Transaction Status:</ThemedText>
             <View style={styles.paidBadge}><ThemedText style={styles.paidTxt}>Paid</ThemedText></View>
          </View>
        </View>
      </ScrollView>

      {/* Fixed Footer Buttons */}
      <View style={styles.footer}>
         <TouchableOpacity style={[styles.fBtn, {backgroundColor: '#6c757d'}]}>
           <ThemedText style={styles.fBtnTxt}>Clear</ThemedText>
         </TouchableOpacity>
         <TouchableOpacity style={[styles.fBtn, {backgroundColor: '#17A2B8', flex: 1.5}]}>
           <ThemedText style={styles.fBtnTxt}>Print Invoice</ThemedText>
         </TouchableOpacity>
         <TouchableOpacity style={[styles.fBtn, {backgroundColor: '#28A745'}]}>
           <ThemedText style={styles.fBtnTxt}>Save</ThemedText>
         </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Helper Components
const InputSmall = ({ label, ...props }: any) => (
  <View style={{ flex: 1, marginRight: 5 }}>
    <ThemedText style={styles.label}>{label}</ThemedText>
    <TextInput style={styles.input} {...props} />
  </View>
);

const SummaryItem = ({ label, value, isBold }: any) => (
  <View style={styles.sumRow}>
    <ThemedText style={styles.sumLabel}>{label}:</ThemedText>
    <ThemedText style={[styles.sumVal, isBold && {fontWeight: '900', color: '#28A745'}]}>{value}</ThemedText>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F4F7FA" },
  header: { flexDirection: 'row', padding: 16, backgroundColor: 'white', justifyContent: 'space-between', alignItems: 'center', elevation: 2 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  saveAllBtn: { backgroundColor: '#28A745', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6 },
  saveAllTxt: { color: 'white', fontWeight: 'bold', fontSize: 12 },

  scrollContent: { padding: 15 },
  topSection: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 15 },
  dateBox: { borderWidth: 1, borderColor: '#DDD', padding: 10, borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'white', marginTop: 5 },
  addRowsBtn: { backgroundColor: '#28A745', flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginLeft: 10 },
  addRowsTxt: { color: 'white', marginLeft: 5, fontWeight: 'bold' },

  sectionCard: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 1 },
  sectionTitle: { fontSize: 15, fontWeight: 'bold', color: '#007BFF', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#EEE', paddingBottom: 5 },
  rowLayout: { flexDirection: 'row', marginBottom: 10 },
  label: { fontSize: 12, color: '#666', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#EEE', padding: 10, borderRadius: 8, backgroundColor: '#FAFBFD', fontSize: 13 },
  pickerBox: { borderWidth: 1, borderColor: '#EEE', borderRadius: 8, backgroundColor: '#FAFBFD', height: 45, justifyContent: 'center' },

  paymentSummary: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#EEE' },
  summaryText: { fontSize: 11, color: '#555' },
  bold: { fontWeight: 'bold' },

  listHeader: { fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  productCard: { backgroundColor: 'white', borderRadius: 12, padding: 15, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: '#007BFF' },
  productCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  rowNumber: { fontWeight: 'bold', color: '#666' },
  profitBadge: { backgroundColor: '#E7F3FF', alignSelf: 'flex-end', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 5, marginTop: 5 },
  profitTxt: { fontSize: 10, color: '#007BFF', fontWeight: 'bold' },

  finalSummaryCard: { backgroundColor: '#E9F7EF', borderRadius: 12, padding: 15, marginBottom: 80, borderWidth: 1, borderColor: '#D1E7DD' },
  finalTitle: { fontSize: 13, fontWeight: 'bold', color: '#155724', marginBottom: 10, textAlign: 'center' },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  sumLabel: { fontSize: 13, color: '#555' },
  sumVal: { fontSize: 13, fontWeight: 'bold' },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, borderTopWidth: 1, borderTopColor: '#BADBCC', paddingTop: 10 },
  paidBadge: { backgroundColor: '#28A745', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 5, marginLeft: 10 },
  paidTxt: { color: 'white', fontSize: 12, fontWeight: 'bold' },

  footer: { position: 'absolute', bottom: 0, width: '100%', flexDirection: 'row', padding: 15, backgroundColor: 'white', gap: 8, borderTopWidth: 1, borderTopColor: '#EEE' },
  fBtn: { flex: 1, height: 45, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  fBtnTxt: { color: 'white', fontWeight: 'bold', fontSize: 14 }
});