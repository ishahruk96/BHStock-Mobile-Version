import React from "react";
import { StyleSheet, View, FlatList, TouchableOpacity, TextInput } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

// আপনার প্রোভাইড করা ইমেজ অনুযায়ী ডাটা
const salesData = [
  { id: "1", date: "16-Apr-2026", time: "01:40 PM", product: "Test-02", txn: "#BHF000032", qty: "1", amount: "150.00", profit: "50.00", status: "Partial" },
  { id: "2", date: "16-Apr-2026", time: "03:04 AM", product: "Test-Fish", txn: "#BHF000033", qty: "1", amount: "120.00", profit: "20.00", status: "Paid" },
  { id: "3", date: "16-Apr-2026", time: "03:01 AM", product: "Test-02", txn: "#BHF000023", qty: "2", amount: "304.00", profit: "104.00", status: "Partial" },
  { id: "4", date: "30-Mar-2026", time: "09:51 AM", product: "Bo Hardin", txn: "#BHF000031", qty: "5", amount: "600.00", profit: "80.00", status: "Unpaid" },
  { id: "5", date: "30-Mar-2026", time: "09:51 AM", product: "Rupchanda", txn: "#BHF000031", qty: "0.25", amount: "412.50", profit: "87.50", status: "Unpaid" },
  { id: "6", date: "25-Mar-2026", time: "12:50 AM", product: "Bo Hardin", txn: "#BHF000030", qty: "3", amount: "360.00", profit: "48.00", status: "Partial" },
  { id: "7", date: "24-Mar-2026", time: "11:12 PM", product: "koi", txn: "#BHF000029", qty: "2", amount: "840.00", profit: "340.00", status: "Paid" },
  { id: "8", date: "24-Mar-2026", time: "11:00 PM", product: "Test-Fish", txn: "#BHF000029", qty: "2", amount: "240.00", profit: "40.00", status: "Paid" },
  { id: "9", date: "20-Mar-2026", time: "03:16 PM", product: "Rui-Dhaka", txn: "#BHF000027", qty: "1", amount: "600.00", profit: "300.00", status: "Partial" },
  { id: "10", date: "20-Mar-2026", time: "03:16 PM", product: "Hilsa choto", txn: "#BHF000027", qty: "1", amount: "120.00", profit: "40.00", status: "Partial" },
];

export default function SalesListScreen() {
  
  // স্ট্যাটাস অনুযায়ী কালার নির্ধারণ
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Paid": return { bg: "#d4edda", text: "#155724" };
      case "Partial": return { bg: "#e1bee7", text: "#4a148c" };
      case "Unpaid": return { bg: "#f8d7da", text: "#721c24" };
      default: return { bg: "#eee", text: "#333" };
    }
  };

  const renderItem = ({ item }: any) => {
    const statusColor = getStatusStyle(item.status);

    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View>
            <ThemedText style={styles.itemDate}>{item.date}</ThemedText>
            <ThemedText style={styles.itemTime}>{item.time}</ThemedText>
          </View>
          <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
            <ThemedText style={[styles.badgeText, { color: statusColor.text }]}>{item.status}</ThemedText>
          </View>
        </View>

        <View style={styles.cardBody}>
          <ThemedText style={styles.productName}>{item.product}</ThemedText>
          <ThemedText style={styles.txnNo}>{item.txn}</ThemedText>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <View style={styles.footerCol}>
            <ThemedText style={styles.footerLabel}>Qty</ThemedText>
            <ThemedText style={styles.footerVal}>{item.qty}</ThemedText>
          </View>
          <View style={styles.footerCol}>
            <ThemedText style={styles.footerLabel}>Amount</ThemedText>
            <ThemedText style={[styles.footerVal, { color: "#d97706", fontWeight: "bold" }]}>৳{item.amount}</ThemedText>
          </View>
          <View style={styles.footerCol}>
            <ThemedText style={styles.footerLabel}>Profit</ThemedText>
            <ThemedText style={[styles.footerVal, { color: "#16a34a", fontWeight: "bold" }]}>৳{item.profit}</ThemedText>
          </View>
          <View style={styles.actionIcons}>
            <TouchableOpacity style={styles.editBtn}>
              <MaterialIcons name="edit" size={16} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.retBtn}>
              <MaterialIcons name="swap-horiz" size={16} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <>
            {/* Header Section */}
            <View style={styles.headerRow}>
              <ThemedText style={styles.title}>📜 Sales List</ThemedText>
              <View style={styles.headerBtns}>
                <TouchableOpacity style={[styles.headBtn, { backgroundColor: '#17a2b8' }]}>
                  <ThemedText style={styles.btnText}>Print Report</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.headBtn, { backgroundColor: '#ffc107' }]}>
                  <ThemedText style={styles.btnText}>Print Summary</ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {/* Filter Section */}
            <View style={styles.filterCard}>
              <View style={styles.filterRow}>
                <TextInput style={[styles.input, { flex: 2 }]} placeholder="Search product..." />
                <View style={[styles.input, { flex: 1.2, justifyContent: 'center' }]}>
                  <ThemedText style={styles.dropdownText}>Category ▾</ThemedText>
                </View>
              </View>
              <View style={[styles.filterRow, { marginTop: 10 }]}>
                <View style={[styles.input, { flex: 1, justifyContent: 'center' }]}>
                  <ThemedText style={styles.dropdownText}>Status ▾</ThemedText>
                </View>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Start Date" />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="End Date" />
              </View>
              <View style={styles.actionBtnRow}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#007bff' }]}>
                  <ThemedText style={styles.actionBtnText}>Search</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#6c757d' }]}>
                  <ThemedText style={styles.actionBtnText}>Reset</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#28a745' }]}>
                  <ThemedText style={styles.actionBtnText}>All Data</ThemedText>
                </TouchableOpacity>
              </View>
            </View>

            {/* Summary Section */}
            <View style={styles.summarySection}>
              <ThemedText style={styles.summaryTitle}>Sells Summary - BH Fish Mart</ThemedText>
              <View style={styles.summaryGrid}>
                <SummaryStat label="Total Transactions:" value="12" />
                <SummaryStat label="Total Quantity:" value="19.75 pcs" />
                <SummaryStat label="Total Amount:" value="৳ 4441.50" />
                <SummaryStat label="Total Profit:" value="৳ 1379.50" />
                <SummaryStat label="NET PROFIT:" value="৳ 1379.50" isBold />
              </View>
            </View>
          </>
        }
        data={salesData}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const SummaryStat = ({ label, value, isBold }: any) => (
  <View style={styles.summaryRow}>
    <ThemedText style={styles.summaryLabel}>{label}</ThemedText>
    <ThemedText style={[styles.summaryValue, isBold && { fontWeight: 'bold', color: '#2e7d32' }]}>{value}</ThemedText>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f2f5", padding: 12 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  headerBtns: { flexDirection: 'row' },
  headBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 5, marginLeft: 6 },
  btnText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  
  filterCard: { backgroundColor: 'white', padding: 12, borderRadius: 10, elevation: 3, marginBottom: 15 },
  filterRow: { flexDirection: 'row', gap: 8 },
  input: { height: 38, borderWidth: 1, borderColor: '#e1e4e8', borderRadius: 6, paddingHorizontal: 10, fontSize: 13, backgroundColor: '#fff' },
  dropdownText: { fontSize: 12, color: '#666' },
  actionBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, marginTop: 12 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6 },
  actionBtnText: { color: 'white', fontSize: 12, fontWeight: 'bold' },

  summarySection: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#c8e6c9', marginBottom: 15, overflow: 'hidden', elevation: 2 },
  summaryTitle: { backgroundColor: '#e8f5e9', padding: 10, fontSize: 14, fontWeight: 'bold', color: '#2e7d32', textAlign: 'center' },
  summaryGrid: { padding: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  summaryLabel: { fontSize: 12, color: '#555' },
  summaryValue: { fontSize: 12, color: '#333' },

  // Card Design
  card: { backgroundColor: 'white', borderRadius: 12, padding: 14, marginBottom: 12, elevation: 3 },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemDate: { fontSize: 13, fontWeight: 'bold', color: '#333' },
  itemTime: { fontSize: 11, color: '#777' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: 'bold' },
  cardBody: { marginTop: 10 },
  productName: { fontSize: 16, fontWeight: 'bold', color: '#1a1a1a' },
  txnNo: { fontSize: 12, color: '#007bff', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerCol: { alignItems: 'center' },
  footerLabel: { fontSize: 10, color: '#888', marginBottom: 2 },
  footerVal: { fontSize: 13, color: '#333' },
  actionIcons: { flexDirection: 'row', gap: 8 },
  editBtn: { backgroundColor: '#ffc107', padding: 7, borderRadius: 6 },
  retBtn: { backgroundColor: '#17a2b8', padding: 7, borderRadius: 6 },
});