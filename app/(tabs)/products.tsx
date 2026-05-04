import React from "react";
import { StyleSheet, View, FlatList, TouchableOpacity, TextInput } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

// ইমেজ অনুযায়ী ১০টি প্রোডাক্ট ডাটা
const productData = [
  { id: "1", category: "Test", name: "Test-02", stock: "100.00", buy: "101.00", sale: "152.00", profit: "5100", status: "Available" },
  { id: "2", category: "w", name: "Virginia Hahn", stock: "50.00", buy: "50.00", sale: "100.00", profit: "2500", status: "Available" },
  { id: "3", category: "Dal", name: "Test", stock: "25.00", buy: "50.00", sale: "90.00", profit: "1000", status: "Available" },
  { id: "4", category: "Fish", name: "Rui-Dhaka", stock: "99.00", buy: "300.00", sale: "600.00", profit: "29700", status: "Available" },
  { id: "5", category: "Ipsum minus", name: "Bo Hardin", stock: "81.00", buy: "104.00", sale: "120.00", profit: "1296", status: "Available" },
  { id: "6", category: "Test", name: "Test-Fish", stock: "46.00", buy: "100.00", sale: "120.00", profit: "920", status: "Available" },
  { id: "7", category: "River", name: "Hilsa choto", stock: "48.00", buy: "80.00", sale: "120.00", profit: "1920", status: "Available" },
  { id: "8", category: "River", name: "koi", stock: "46.00", buy: "250.00", sale: "420.00", profit: "7820", status: "Available" },
  { id: "9", category: "River", name: "Hilsa", stock: "48.00", buy: "800.00", sale: "1200.00", profit: "19200", status: "Available" },
  { id: "10", category: "Test", name: "Test-012", stock: "10.70", buy: "11.00", sale: "17.00", profit: "118.2", status: "Available" },
];

export default function ProductsScreen() {
  const renderItem = ({ item }: { item: typeof productData[0] }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <ThemedText style={styles.categoryTxt}>{item.category}</ThemedText>
          <ThemedText style={styles.productTitle}>{item.name}</ThemedText>
        </View>
        <View style={styles.statusBadge}>
          <ThemedText style={styles.statusTxt}>{item.status}</ThemedText>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <InfoBlock label="Stock" value={item.stock} />
        <InfoBlock label="Buy (৳)" value={item.buy} />
        <InfoBlock label="Sale (৳)" value={item.sale} />
        <InfoBlock label="Profit" value={`৳${item.profit}`} isProfit />
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#007bff' }]}>
          <MaterialIcons name="edit" size={16} color="white" />
          <ThemedText style={styles.actionTxt}>Edit</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#dc3545' }]}>
          <MaterialIcons name="delete" size={16} color="white" />
          <ThemedText style={styles.actionTxt}>Delete</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.screenHeader}>
        <ThemedText style={styles.headerTitle}>📦 Products</ThemedText>
        <TouchableOpacity style={styles.addBtn}>
          <ThemedText style={styles.addBtnTxt}>+ Add Product</ThemedText>
        </TouchableOpacity>
      </View>

      {/* Filter Section (PC Style) */}
      <View style={styles.filterBox}>
        <View style={styles.row}>
          <TextInput style={[styles.input, { flex: 2 }]} placeholder="Search product..." />
          <View style={[styles.input, { flex: 1, justifyContent: 'center' }]}><ThemedText style={styles.dropTxt}>Category ▾</ThemedText></View>
        </View>
        <View style={[styles.row, { marginTop: 8 }]}>
          <View style={[styles.input, { flex: 1, justifyContent: 'center' }]}><ThemedText style={styles.dropTxt}>Status ▾</ThemedText></View>
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="Start Date" />
          <TextInput style={[styles.input, { flex: 1 }]} placeholder="End Date" />
        </View>
        <View style={styles.filterActionRow}>
          <TouchableOpacity style={[styles.fBtn, { backgroundColor: '#007bff' }]}><ThemedText style={styles.fBtnTxt}>Search</ThemedText></TouchableOpacity>
          <TouchableOpacity style={[styles.fBtn, { backgroundColor: '#6c757d' }]}><ThemedText style={styles.fBtnTxt}>Reset</ThemedText></TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={productData}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const InfoBlock = ({ label, value, isProfit }: any) => (
  <View style={styles.infoCol}>
    <ThemedText style={styles.infoLabel}>{label}</ThemedText>
    <ThemedText style={[styles.infoValue, isProfit && { color: '#28a745', fontWeight: 'bold' }]}>{value}</ThemedText>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa', padding: 12 },
  screenHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  addBtn: { backgroundColor: '#28a745', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  addBtnTxt: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  filterBox: { backgroundColor: 'white', padding: 10, borderRadius: 8, marginBottom: 15, elevation: 2 },
  row: { flexDirection: 'row', gap: 6 },
  input: { height: 36, borderWidth: 1, borderColor: '#ddd', borderRadius: 4, paddingHorizontal: 8, fontSize: 12 },
  dropTxt: { fontSize: 11, color: '#666' },
  filterActionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 6, marginTop: 10 },
  fBtn: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 4 },
  fBtnTxt: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  card: { backgroundColor: 'white', borderRadius: 10, padding: 15, marginBottom: 12, elevation: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f0f0f0', paddingBottom: 10 },
  categoryTxt: { fontSize: 10, color: '#007bff', fontWeight: 'bold' },
  productTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  statusBadge: { backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  statusTxt: { fontSize: 10, color: '#28a745', fontWeight: 'bold' },
  infoGrid: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 15 },
  infoCol: { alignItems: 'center' },
  infoLabel: { fontSize: 10, color: '#999', marginBottom: 2 },
  infoValue: { fontSize: 13, color: '#333' },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 4 },
  actionTxt: { color: 'white', fontSize: 11, fontWeight: 'bold', marginLeft: 4 }
});