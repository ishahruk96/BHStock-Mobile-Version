import React from "react";
import { StyleSheet, View, FlatList, TouchableOpacity, TextInput, ScrollView } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

// আপনার ইমেজ অনুযায়ী ডাটা
const transactionData = [
  { id: "1", date: "16-Apr-2026", type: "Profit-A", txn: "Debit", amount: "55.00", remarks: "55-1", createdBy: "Sujon Mia" },
  { id: "2", date: "16-Apr-2026", type: "Profit-A", txn: "Debit", amount: "55.00", remarks: "55", createdBy: "Sujon Mia" },
  { id: "3", date: "03-Mar-2026", type: "Profit-A", txn: "Debit", amount: "120.00", remarks: "120", createdBy: "Sujon Mia" },
];

export default function TransactionManagementScreen() {
  const renderItem = ({ item }: { item: typeof transactionData[0] }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <ThemedText style={styles.dateTxt}>{item.date}</ThemedText>
          <ThemedText style={styles.typeTxt}>{item.type}</ThemedText>
        </View>
        <View style={[styles.txnBadge, { backgroundColor: '#dc3545' }]}>
          <ThemedText style={styles.txnBadgeText}>{item.txn}</ThemedText>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.infoRow}>
          <ThemedText style={styles.label}>Amount:</ThemedText>
          <ThemedText style={styles.amountVal}>৳{item.amount}</ThemedText>
        </View>
        <View style={styles.infoRow}>
          <ThemedText style={styles.label}>Remarks:</ThemedText>
          <ThemedText style={styles.val}>{item.remarks}</ThemedText>
        </View>
        <View style={styles.infoRow}>
          <ThemedText style={styles.label}>Created By:</ThemedText>
          <ThemedText style={styles.val}>{item.createdBy}</ThemedText>
        </View>
      </View>

      <TouchableOpacity style={styles.editBtn}>
        <MaterialCommunityIcons name="pencil" size={14} color="white" />
        <ThemedText style={styles.editBtnText}>Edit</ThemedText>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <>
            {/* Header Area */}
            <View style={styles.header}>
              <ThemedText style={styles.headerTitle}>💰 Transaction Management</ThemedText>
              <TouchableOpacity style={styles.addBtn}>
                <ThemedText style={styles.addBtnText}>+ Add New Transaction</ThemedText>
              </TouchableOpacity>
            </View>

            {/* Filter Section */}
            <View style={styles.filterSection}>
              <View style={styles.row}>
                <View style={[styles.input, { flex: 1 }]}><ThemedText style={styles.dropTxt}>3 Months ▾</ThemedText></View>
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="Start Date" />
                <TextInput style={[styles.input, { flex: 1 }]} placeholder="End Date" />
              </View>
              <View style={[styles.row, { marginTop: 8 }]}>
                <View style={[styles.input, { flex: 1 }]}><ThemedText style={styles.dropTxt}>All Types ▾</ThemedText></View>
                <View style={[styles.input, { flex: 1 }]}><ThemedText style={styles.dropTxt}>All ▾</ThemedText></View>
                <TouchableOpacity style={styles.searchBtn}><ThemedText style={styles.searchBtnText}>Search</ThemedText></TouchableOpacity>
              </View>
            </View>

            {/* Summary Cards */}
            <View style={styles.summaryContainer}>
              <ThemedText style={styles.summaryTitle}>📊 Transaction Summary</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.summaryScroll}>
                <SummaryBox label="Total Transactions" value="3" color="#333" />
                <SummaryBox label="Total Credit" value="৳0.00" color="#28a745" />
                <SummaryBox label="Total Debit" value="৳230.00" color="#dc3545" />
                <SummaryBox label="Net Balance" value="৳-230.00" color="#007bff" />
              </ScrollView>
            </View>
          </>
        }
        data={transactionData}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const SummaryBox = ({ label, value, color }: any) => (
  <View style={styles.summaryBox}>
    <ThemedText style={styles.summaryLabel}>{label}</ThemedText>
    <ThemedText style={[styles.summaryValue, { color }]}>{value}</ThemedText>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9', padding: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  addBtn: { backgroundColor: '#28a745', padding: 8, borderRadius: 6 },
  addBtnText: { color: 'white', fontSize: 11, fontWeight: 'bold' },
  
  filterSection: { backgroundColor: 'white', padding: 10, borderRadius: 8, marginBottom: 15, elevation: 2 },
  row: { flexDirection: 'row', gap: 6 },
  input: { height: 35, borderWidth: 1, borderColor: '#ddd', borderRadius: 4, paddingHorizontal: 6, justifyContent: 'center' },
  dropTxt: { fontSize: 10, color: '#666' },
  searchBtn: { backgroundColor: '#007bff', flex: 1, height: 35, borderRadius: 4, justifyContent: 'center', alignItems: 'center' },
  searchBtnText: { color: 'white', fontWeight: 'bold', fontSize: 12 },

  summaryContainer: { backgroundColor: '#e8f5e9', padding: 12, borderRadius: 10, marginBottom: 15 },
  summaryTitle: { fontSize: 13, fontWeight: 'bold', color: '#2e7d32', marginBottom: 10 },
  summaryScroll: { flexDirection: 'row' },
  summaryBox: { backgroundColor: 'white', padding: 10, borderRadius: 8, marginRight: 10, width: 120, alignItems: 'center', elevation: 1 },
  summaryLabel: { fontSize: 10, color: '#666', marginBottom: 5 },
  summaryValue: { fontSize: 14, fontWeight: 'bold' },

  card: { backgroundColor: 'white', borderRadius: 10, padding: 12, marginBottom: 10, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 8 },
  dateTxt: { fontSize: 12, fontWeight: 'bold', color: '#444' },
  typeTxt: { fontSize: 10, color: '#888' },
  txnBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
  txnBadgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  cardBody: { paddingVertical: 10 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { fontSize: 11, color: '#777' },
  amountVal: { fontSize: 12, fontWeight: 'bold', color: '#dc3545' },
  val: { fontSize: 12, color: '#333' },
  editBtn: { backgroundColor: '#007bff', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 6, borderRadius: 4, alignSelf: 'flex-end' },
  editBtnText: { color: 'white', fontSize: 11, marginLeft: 4 }
});