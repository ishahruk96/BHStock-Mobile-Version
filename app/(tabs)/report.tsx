import React, { useState } from "react";
import { StyleSheet, View, FlatList, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";


const stockData = [
  { id: "1", category: "Fish", name: "Rui-Dhaka", opening: "99.00", purchase: "300.00", sale: "600.00", qtySold: "0.00", closing: "99.00", stockValue: "29,700.00", status: "Available" },
  { id: "2", category: "Marine Fish", name: "Loitta", opening: "2.80", purchase: "400.00", sale: "480.00", qtySold: "0.00", closing: "2.80", stockValue: "1,120.00", status: "Reorder" },
  { id: "3", category: "Marine Fish", name: "Rupchanda", opening: "3.75", purchase: "1,300.00", sale: "1,650.00", qtySold: "0.00", closing: "3.75", stockValue: "4,875.00", status: "Reorder" },
  { id: "4", category: "River", name: "Hilsa", opening: "48.00", purchase: "800.00", sale: "1,200.00", qtySold: "0.00", closing: "48.00", stockValue: "38,400.00", status: "Available" },
  { id: "5", category: "Small Fish", name: "Bacha", opening: "1.10", purchase: "900.00", sale: "1,200.00", qtySold: "0.00", closing: "1.10", stockValue: "990.00", status: "Reorder" },
];

export default function StockReportScreen() {
  const [activeTab, setActiveTab] = useState("Stock Report");

  const renderStockItem = ({ item }: { item: typeof stockData[0] }) => (
    <View style={styles.stockCard}>
      <View style={styles.cardHeader}>
        <View>
          <ThemedText style={styles.categoryBadgeText}>{item.category}</ThemedText>
          <ThemedText style={styles.productName}>{item.name}</ThemedText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === "Available" ? "#e8f5e9" : "#fff3e0" }]}>
          <ThemedText style={[styles.statusText, { color: item.status === "Available" ? "#2e7d32" : "#ef6c00" }]}>{item.status}</ThemedText>
        </View>
      </View>

      <View style={styles.dataGrid}>
        <DataPoint label="Opening" value={item.opening} />
        <DataPoint label="Purchase" value={`৳${item.purchase}`} />
        <DataPoint label="Selling" value={`৳${item.sale}`} />
        <DataPoint label="Qty Sold" value={item.qtySold} />
        <DataPoint label="Closing" value={item.closing} />
        <DataPoint label="Stock Value" value={`৳${item.stockValue}`} isBold />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ListHeaderComponent={
          <>
            {/* Blue Header Section */}
            <View style={styles.blueHeader}>
              <View style={styles.headerTitleRow}>
                <MaterialCommunityIcons name="chart-bar" size={24} color="white" />
                <ThemedText style={styles.headerTitleText}>Stock Report</ThemedText>
              </View>
              <ThemedText style={styles.headerSubText}>Generate stock reports by date or range</ThemedText>
            </View>

            {/* Filter Card */}
            <View style={styles.filterCard}>
              <ThemedText style={styles.filterLabel}>Select Report Period</ThemedText>
              <View style={styles.periodBtnRow}>
                <TouchableOpacity style={[styles.periodBtn, styles.periodBtnActive]}><ThemedText style={styles.periodBtnTextActive}>Daily Report</ThemedText></TouchableOpacity>
                <TouchableOpacity style={styles.periodBtn}><ThemedText style={styles.periodBtnText}>Date Range Report</ThemedText></TouchableOpacity>
              </View>
              
              <View style={styles.dateSelector}>
                <Ionicons name="calendar-outline" size={18} color="#666" />
                <ThemedText style={styles.dateText}>05/04/2026</ThemedText>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickDates}>
                {["Today", "Yesterday", "Last Week", "Last Month"].map((d) => (
                  <TouchableOpacity key={d} style={styles.qDateBtn}><ThemedText style={styles.qDateText}>{d}</ThemedText></TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity style={styles.generateBtn}>
                <Ionicons name="refresh" size={18} color="white" />
                <ThemedText style={styles.generateBtnText}>Generate Report</ThemedText>
              </TouchableOpacity>
            </View>

            {/* Export Buttons */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.exportRow}>
              <ExportBtn icon="file-excel" color="#28a745" label="Excel" />
              <ExportBtn icon="file-csv" color="#ffc107" label="CSV" />
              <ExportBtn icon="file-pdf" color="#dc3545" label="PDF" />
              <ExportBtn icon="print" color="#6c757d" label="Print" />
            </ScrollView>

            {/* Organization Info */}
            <View style={styles.orgInfo}>
              <ThemedText style={styles.orgName}>BH Fish Mart</ThemedText>
              <ThemedText style={styles.orgAddress}>Uttara 1230</ThemedText>
              <View style={styles.reportTitleBadge}>
                <ThemedText style={styles.reportTitleText}>STOCK REPORT (04/05/2026)</ThemedText>
              </View>
            </View>

            {/* Tabs */}
            <View style={styles.tabRow}>
              {["Stock Report", "Financial", "Transaction"].map((tab) => (
                <TouchableOpacity 
                  key={tab} 
                  onPress={() => setActiveTab(tab)}
                  style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
                >
                  <ThemedText style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</ThemedText>
                </TouchableOpacity>
              ))}
            </View>

            {/* Search Bar */}
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#999" />
              <TextInput style={styles.searchInput} placeholder="Search product / category..." />
            </View>
          </>
        }
        data={stockData}
        renderItem={renderStockItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 30 }}
      />
    </View>
  );
}

const DataPoint = ({ label, value, isBold }: any) => (
  <View style={styles.dataPoint}>
    <ThemedText style={styles.dataLabel}>{label}</ThemedText>
    <ThemedText style={[styles.dataValue, isBold && { fontWeight: 'bold', color: '#007bff' }]}>{value}</ThemedText>
  </View>
);

const ExportBtn = ({ icon, color, label }: any) => (
  <TouchableOpacity style={[styles.exportBtn, { backgroundColor: color }]}>
    <FontAwesome5 name={icon} size={14} color="white" />
    <ThemedText style={styles.exportBtnText}>{label}</ThemedText>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f0f2f5" },
  blueHeader: { backgroundColor: "#0056b3", padding: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitleText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  headerSubText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 5 },
  
  filterCard: { backgroundColor: 'white', margin: 15, borderRadius: 15, padding: 15, elevation: 3, marginTop: -20 },
  filterLabel: { fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
  periodBtnRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  periodBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#007bff', alignItems: 'center' },
  periodBtnActive: { backgroundColor: '#007bff' },
  periodBtnText: { color: '#007bff', fontSize: 12 },
  periodBtnTextActive: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  dateSelector: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  dateText: { marginLeft: 10, color: '#333' },
  quickDates: { marginTop: 10, flexDirection: 'row' },
  qDateBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#007bff', marginRight: 8 },
  qDateText: { fontSize: 11, color: '#007bff' },
  generateBtn: { backgroundColor: '#0056b3', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 8, marginTop: 15 },
  generateBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 8 },

  exportRow: { paddingHorizontal: 15, marginBottom: 15 },
  exportBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 6, marginRight: 8 },
  exportBtnText: { color: 'white', marginLeft: 6, fontSize: 12, fontWeight: 'bold' },

  orgInfo: { alignItems: 'center', marginBottom: 15 },
  orgName: { fontSize: 18, fontWeight: 'bold', color: '#0056b3' },
  orgAddress: { fontSize: 12, color: '#666' },
  reportTitleBadge: { backgroundColor: '#eef2f7', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 20, marginTop: 8 },
  reportTitleText: { fontSize: 11, fontWeight: 'bold', color: '#333' },

  tabRow: { flexDirection: 'row', backgroundColor: 'white', padding: 5, marginHorizontal: 15, borderRadius: 10, marginBottom: 15 },
  tabItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  tabItemActive: { backgroundColor: '#007bff' },
  tabText: { fontSize: 12, color: '#666' },
  tabTextActive: { color: 'white', fontWeight: 'bold' },

  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', marginHorizontal: 15, paddingHorizontal: 12, borderRadius: 10, height: 45, marginBottom: 15, borderWidth: 1, borderColor: '#eee' },
  searchInput: { flex: 1, marginLeft: 8 },

  stockCard: { backgroundColor: 'white', marginHorizontal: 15, marginBottom: 12, borderRadius: 12, padding: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  categoryBadgeText: { fontSize: 10, color: '#007bff', fontWeight: 'bold', textTransform: 'uppercase' },
  productName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  dataGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  dataPoint: { width: '30%', marginBottom: 5 },
  dataLabel: { fontSize: 10, color: '#888' },
  dataValue: { fontSize: 12, color: '#333', marginTop: 2 }
});