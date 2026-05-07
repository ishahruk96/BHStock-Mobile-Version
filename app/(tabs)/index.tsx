import React, { useEffect, useState } from "react";
import { StyleSheet, View, ScrollView, TouchableOpacity, SafeAreaView, StatusBar, Platform } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Ionicons } from "@expo/vector-icons";

export default function DashboardScreen() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://mystock.byteheart.com/Dashboard/GetAllOrganization", {
      headers: { "apikey": "3A734AC6-A521-4192-984D-08D082B83456" }
    })
    .then(res => res.json())
    .then(data => { setOrganizations(data); setLoading(false); })
    .catch(() => setLoading(false));
  }, []);

  return (
    <View style={styles.mainWrapper}>
      {/* 🟢 Android Status Bar Fix */}
      <StatusBar barStyle="dark-content" backgroundColor="white" translucent={false} />
      
      <ScrollView 
        style={styles.contentContainer} 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollPadding}
      >
        {/* Banner - Your Style */}
        <View style={styles.headerBanner}>
          <ThemedText style={styles.bannerTitle}>📊 Stock Management Dashboard</ThemedText>
          <ThemedText style={styles.bannerSub}>User Panel - Complete Overview</ThemedText>
        </View>

        {/* 1. All Organizations Section */}
        <SectionHeader title="🏢 All Organizations" />
        <View style={styles.orgCard}>
          <ThemedText style={styles.orgName}>BH Fish Mart</ThemedText>
          <Ionicons name="chevron-forward" size={20} color="#ff8c42" />
        </View>

        {/* 2. Transaction Summary Grid */}
        <SectionHeader title="💰 Transaction Summary" />
        <View style={styles.summaryContainer}>
          <View style={styles.orgHeader}><ThemedText style={styles.orgHeaderText}>BH Fish Mart</ThemedText></View>
          <View style={styles.grid}>
            <StatBox label="Total Trans." value="0" />
            <StatBox label="Total Qty" value="0.00" />
            <StatBox label="Total Amount" value="৳ 0.00" color="#1b5e20" />
            <StatBox label="Total Profit" value="৳ 0.00" color="#2e7d32" />
            <StatBox label="Total Expense" value="৳ 0.00" color="#c62828" />
            <StatBox label="Net Profit" value="৳ 0.00" color="#1565c0" />
          </View>
        </View>

        {/* 3. Low Stock Section */}
        <SectionHeader title="⚠️ Low Stock Products" />
        <View style={styles.tableCard}>
          <ProductRow name="Bacha" category="Small Fish" stock="1.10" status="Reorder" />
          <ProductRow name="Loitta" category="Marine Fish" stock="2.80" status="Reorder" />
        </View>

        {/* <ThemedText style={styles.footerText}>© 2026 - Powered by Byteheart</ThemedText> */}
      </ScrollView>
    </View>
  );
}

// Reusable Components
const SectionHeader = ({ title }: any) => (
  <View style={styles.sectionHeader}>
    <ThemedText style={styles.sectionTitle}>{title}</ThemedText>
    <View style={styles.divider} />
  </View>
);

const StatBox = ({ label, value, color = "#333" }: any) => (
  <View style={styles.statBox}>
    <ThemedText style={styles.statLabel}>{label}</ThemedText>
    <ThemedText style={[styles.statValue, { color }]}>{value}</ThemedText>
  </View>
);

const ProductRow = ({ name, category, stock, status }: any) => (
  <View style={styles.row}>
    <View>
      <ThemedText style={styles.rowName}>{name}</ThemedText>
      <ThemedText style={styles.rowSub}>{category}</ThemedText>
    </View>
    <View style={{ alignItems: 'flex-end' }}>
      <ThemedText style={styles.rowStock}>Stock: {stock}</ThemedText>
      <View style={styles.badge}><ThemedText style={styles.badgeText}>{status}</ThemedText></View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: "#f4f7f4" },
  contentContainer: { flex: 1 },
  scrollPadding: { 
    paddingHorizontal: 15, 
    paddingTop: 15,
    paddingBottom: 120 // 🔥 bottom navbar
  },
  headerBanner: { 
    backgroundColor: "#2e7d32", 
    padding: 20, 
    borderRadius: 15, 
    marginBottom: 10,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  bannerTitle: { color: "white", fontSize: 17, fontWeight: "bold" },
  bannerSub: { color: "#c8e6c9", fontSize: 12, marginTop: 4 },
  sectionHeader: { marginTop: 22, marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: "bold", color: "#2e7d32" },
  divider: { height: 3, backgroundColor: "#81c784", width: 35, marginTop: 4, borderRadius: 2 },
  orgCard: { backgroundColor: "#fff", padding: 18, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2, shadowColor: "#000", shadowOpacity: 0.05 },
  orgName: { fontWeight: 'bold', fontSize: 16, color: '#333' },
  summaryContainer: { backgroundColor: "#fff", borderRadius: 15, overflow: 'hidden', elevation: 3, shadowColor: "#000", shadowOpacity: 0.1 },
  orgHeader: { backgroundColor: "#66bb6a", padding: 12, alignItems: 'center' },
  orgHeaderText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 5 },
  statBox: { width: '33.33%', paddingVertical: 15, paddingHorizontal: 5, alignItems: 'center', borderRightWidth: 0.5, borderBottomWidth: 0.5, borderColor: '#f0f0f0' },
  statLabel: { fontSize: 10, color: '#777', textAlign: 'center', marginBottom: 4 },
  statValue: { fontSize: 13, fontWeight: 'bold' },
  tableCard: { backgroundColor: '#fff', borderRadius: 15, paddingHorizontal: 15, paddingVertical: 5, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#f9f9f9' },
  rowName: { fontWeight: 'bold', fontSize: 14, color: '#333' },
  rowSub: { fontSize: 12, color: '#999', marginTop: 2 },
  rowStock: { fontSize: 12, fontWeight: '700', color: '#c62828' },
  badge: { backgroundColor: '#fff3e0', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 6, marginTop: 5 },
  badgeText: { color: '#ff8c42', fontSize: 10, fontWeight: 'bold' },
  footerText: { textAlign: 'center', marginTop: 40, fontSize: 11, color: '#bbb', marginBottom: 10 }
});