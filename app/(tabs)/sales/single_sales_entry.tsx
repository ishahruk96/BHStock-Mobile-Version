import React, { useState } from "react";
import { StyleSheet, View, ScrollView, TextInput, TouchableOpacity, SafeAreaView } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker"; 

export default function SingleSalesEntry() {
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
         <TouchableOpacity>
            <Ionicons name="arrow-back" size={24} color="#333" />
         </TouchableOpacity>
         <ThemedText style={styles.headerTitle}>Single Sales Entry</ThemedText>
         <TouchableOpacity style={styles.saveTopBtn}>
            <ThemedText style={styles.saveTopText}>Save</ThemedText>
         </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollBody}>
        {/* Date Picker Section */}
        <View style={styles.sectionCard}>
          <ThemedText style={styles.label}>Date *</ThemedText>
          <View style={styles.inputRow}>
            <TextInput style={[styles.input, { flex: 1 }]} value="05/04/2026" editable={false} />
            <Ionicons name="calendar" size={20} color="#666" style={styles.iconInside} />
          </View>
          <ThemedText style={styles.noteText}>
            Note: Select category and product from dropdowns. Enter quantity to calculate totals.
          </ThemedText>
        </View>

        {/* Payment Information */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="credit-card" size={16} color="#007BFF" />
            <ThemedText style={styles.cardTitle}>Payment Information</ThemedText>
          </View>
          
          <ThemedText style={styles.label}>Payment Amount (৳) *</ThemedText>
          <TextInput style={styles.input} placeholder="0" keyboardType="numeric" />

          <ThemedText style={styles.label}>Payment Method</ThemedText>
          <View style={styles.pickerContainer}>
            <Picker selectedValue={paymentMethod} onValueChange={(item) => setPaymentMethod(item)}>
              <Picker.Item label="Cash" value="Cash" />
              <Picker.Item label="Bkash" value="Bkash" />
              <Picker.Item label="Card" value="Card" />
            </Picker>
          </View>

          <ThemedText style={styles.label}>Reference (Optional)</ThemedText>
          <TextInput style={styles.input} placeholder="Check/Transaction No" />

          <ThemedText style={styles.label}>Due Amount</ThemedText>
          <TextInput style={[styles.input, { color: 'red' }]} value="0.00 ৳" editable={false} />

          {/* Payment Summary Table */}
          <View style={styles.summaryTable}>
            <SummaryRow label="Total Sale:" value="৳0.00" color="#28A745" />
            <SummaryRow label="Payment:" value="৳0.00" color="#28A745" />
            <SummaryRow label="Due:" value="৳0.00" color="#DC3545" />
          </View>
        </View>

        {/* Product Details Area */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeader}>
             <Ionicons name="cart" size={18} color="#007BFF" />
             <ThemedText style={styles.cardTitle}>Product Selection</ThemedText>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
               <ThemedText style={styles.label}>Category</ThemedText>
               <TextInput style={styles.input} placeholder="Search..." />
            </View>
            <View style={{ flex: 1 }}>
               <ThemedText style={styles.label}>Product</ThemedText>
               <TextInput style={styles.input} placeholder="Search..." />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
               <ThemedText style={styles.label}>Current Stock</ThemedText>
               <TextInput style={[styles.input, styles.disabledInput]} value="-" editable={false} />
            </View>
            <View style={{ flex: 1 }}>
               <ThemedText style={styles.label}>Quantity</ThemedText>
               <TextInput style={styles.input} placeholder="0" keyboardType="numeric" />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
               <ThemedText style={styles.label}>Buy Price</ThemedText>
               <TextInput style={[styles.input, styles.disabledInput]} value="0.00" editable={false} />
            </View>
            <View style={{ flex: 1 }}>
               <ThemedText style={styles.label}>Sale Price</ThemedText>
               <TextInput style={styles.input} placeholder="0" keyboardType="numeric" />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 10 }}>
               <ThemedText style={styles.label}>Total</ThemedText>
               <TextInput style={[styles.input, styles.disabledInput]} value="0.00" editable={false} />
            </View>
            <View style={{ flex: 1 }}>
               <ThemedText style={styles.label}>Profit</ThemedText>
               <TextInput style={[styles.input, styles.disabledInput]} value="0.00" editable={false} />
               <ThemedText style={styles.profitSub}>0.00tk, 0%</ThemedText>
            </View>
          </View>
          
          <TouchableOpacity style={styles.resetBtn}>
            <Ionicons name="refresh" size={16} color="#333" />
            <ThemedText style={styles.resetTxt}>Reset Product</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Customer Information */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeader}>
             <Ionicons name="person" size={18} color="#007BFF" />
             <ThemedText style={styles.cardTitle}>Customer Information</ThemedText>
          </View>
          
          <LabelInput label="Customer Name" icon="person-outline" />
          <LabelInput label="Phone Number" icon="call-outline" keyboardType="phone-pad" />
          <LabelInput label="Email" icon="mail-outline" keyboardType="email-address" />
          <LabelInput label="Address" icon="location-outline" multiline />
        </View>

        {/* Action Buttons */}
        <View style={styles.footerAction}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#E02B2B' }]}>
            <ThemedText style={styles.btnText}>Clear All</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#17A2B8', flex: 1.5 }]}>
            <ThemedText style={styles.btnText}>Save & Print</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#28A745' }]}>
            <ThemedText style={styles.btnText}>Save</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Reusable Components
const SummaryRow = ({ label, value, color }: any) => (
  <View style={styles.summaryRow}>
    <ThemedText style={styles.summaryLabel}>{label}</ThemedText>
    <ThemedText style={[styles.summaryValue, { color }]}>{value}</ThemedText>
  </View>
);

const LabelInput = ({ label, icon, ...props }: any) => (
  <View style={{ marginBottom: 12 }}>
    <View style={styles.labelRow}>
      <Ionicons name={icon} size={14} color="#666" />
      <ThemedText style={[styles.label, { marginBottom: 0, marginLeft: 5 }]}>{label}</ThemedText>
    </View>
    <TextInput style={styles.input} {...props} />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0F2F5" },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: 'white', elevation: 2 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  saveTopBtn: { backgroundColor: '#28A745', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 6 },
  saveTopText: { color: 'white', fontWeight: 'bold' },

  scrollBody: { padding: 12, paddingBottom: 40 },
  sectionCard: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 15, elevation: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: 'bold', marginLeft: 8, color: '#333' },

  label: { fontSize: 13, color: '#555', marginBottom: 6, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, paddingHorizontal: 12, height: 45, fontSize: 14, backgroundColor: '#FAFAFA' },
  disabledInput: { backgroundColor: '#F0F0F0', color: '#888' },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  iconInside: { position: 'absolute', right: 12 },
  
  noteText: { fontSize: 11, color: '#007BFF', backgroundColor: '#E7F3FF', padding: 8, borderRadius: 6, marginTop: 12 },
  pickerContainer: { borderWidth: 1, borderColor: '#DDD', borderRadius: 8, marginBottom: 12, backgroundColor: '#FAFAFA' },

  row: { flexDirection: 'row', marginBottom: 12 },
  profitSub: { fontSize: 10, color: '#666', marginTop: 2, textAlign: 'right' },
  resetBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', padding: 5 },
  resetTxt: { fontSize: 12, marginLeft: 5, color: '#333' },

  summaryTable: { backgroundColor: '#F8F9FA', padding: 12, borderRadius: 10, marginTop: 15, borderStyle: 'dashed', borderWidth: 1, borderColor: '#CCC' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  summaryLabel: { fontSize: 12, fontWeight: 'bold' },
  summaryValue: { fontSize: 13, fontWeight: '800' },

  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  footerAction: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionBtn: { flex: 1, height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 13 }
});