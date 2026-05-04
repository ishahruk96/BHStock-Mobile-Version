import React from "react";
import { StyleSheet, View, ScrollView, TextInput, TouchableOpacity, SafeAreaView } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Ionicons, FontAwesome5, MaterialIcons } from "@expo/vector-icons";

export default function CustomerDueListMobile() {
  
  const customers = [
    { id: 1, name: "hasan", phone: "01862086965", total: 8744, paid: 274, due: 8470, status: "Partial", date: "16/04/2026" },
    { id: 2, name: "Samiul Islam", phone: "01937084464", total: 1013, paid: 0, due: 1013, status: "Unpaid", date: "30/03/2026" },
    { id: 3, name: "Shimul", phone: "11", total: 720, paid: 20, due: 700, status: "Partial", date: "20/03/2026" },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollBody}>

        <View style={styles.blueHeader}>
              <View style={styles.headerTitleRow}>
                <ThemedText style={styles.headerTitleText}>Due</ThemedText>
              </View>
            </View>
        
        {/* Top Search & Filters */}
        <View style={styles.filterCard}>
          <View style={styles.searchBox}>
            <Ionicons name="search" size={18} color="#999" />
            <TextInput style={styles.searchInput} placeholder="Search Customer..." />
          </View>
          <View style={styles.filterRow}>
             <TouchableOpacity style={styles.filterBtn}><ThemedText style={styles.filterText}>Status: All</ThemedText></TouchableOpacity>
             <TouchableOpacity style={styles.searchActionBtn}><ThemedText style={styles.btnTxtWhite}>Search</ThemedText></TouchableOpacity>
          </View>
        </View>

        {/* Stats Cards Row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll}>
          <StatsCard title="Total Sales" value="11,444" icon="shopping-cart" color="#007BFF" />
          <StatsCard title="Total Received" value="637" icon="hand-holding-usd" color="#28A745" />
          <StatsCard title="Total Due" value="10,807" icon="exclamation-triangle" color="#FFC107" />
          <StatsCard title="Customers" value="8" icon="users" color="#6F42C1" />
        </ScrollView>

        {/* Customer List */}
        <ThemedText style={styles.sectionTitle}>Customer Due Details</ThemedText>
        {customers.map((item) => (
          <View key={item.id} style={styles.customerCard}>
            <View style={styles.cardHeader}>
              <View>
                <ThemedText style={styles.customerName}>{item.name}</ThemedText>
                <ThemedText style={styles.phoneTxt}>{item.phone}</ThemedText>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: item.status === 'Unpaid' ? '#f8d7da' : '#fff3cd' }]}>
                <ThemedText style={[styles.statusText, { color: item.status === 'Unpaid' ? '#721c24' : '#856404' }]}>
                  {item.status}
                </ThemedText>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Financial Info */}
            <View style={styles.infoGrid}>
              <View style={styles.infoBox}>
                <ThemedText style={styles.infoLabel}>Total Sale</ThemedText>
                <ThemedText style={styles.infoVal}>৳{item.total}</ThemedText>
              </View>
              <View style={styles.infoBox}>
                <ThemedText style={styles.infoLabel}>Total Paid</ThemedText>
                <ThemedText style={styles.infoVal}>৳{item.paid}</ThemedText>
              </View>
              <View style={styles.infoBox}>
                <ThemedText style={styles.infoLabel}>Due Amount</ThemedText>
                <ThemedText style={[styles.infoVal, {color: '#DC3545'}]}>৳{item.due}</ThemedText>
              </View>
            </View>

            <ThemedText style={styles.lastDate}>Last Transaction: {item.date}</ThemedText>

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#28A745'}]}>
                <Ionicons name="download-outline" size={16} color="white" />
                <ThemedText style={styles.btnTxtWhite}> Receive</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, {backgroundColor: '#28A745', marginLeft: 10}]}>
                <MaterialIcons name="payment" size={16} color="white" />
                <ThemedText style={styles.btnTxtWhite}> Pay Due</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

// Stats Card Component
const StatsCard = ({ title, value, icon, color }: any) => (
  <View style={[styles.statsCard, { borderLeftColor: color }]}>
    <View >
      <ThemedText style={styles.statsVal}>{value}</ThemedText>
      <ThemedText style={styles.statsTitle}>{title}</ThemedText>
    </View>
    <FontAwesome5 name={icon} size={20} color={color} opacity={0.3} />
  </View>
);

const styles = StyleSheet.create({
  blueHeader: { backgroundColor: "#093", padding: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitleText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  headerSubText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 5 },

  container: { flex: 1, backgroundColor: "#F0F2F5" },
  scrollBody: { padding: 15 },
  
  filterCard: { backgroundColor: 'white', padding: 15, borderRadius: 12, marginBottom: 20, elevation: 2 },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: '#EEE' },
  searchInput: { flex: 1, height: 40, marginLeft: 8, fontSize: 14 },
  filterRow: { flexDirection: 'row', marginTop: 10, gap: 10 },
  filterBtn: { flex: 1, borderWidth: 1, borderColor: '#DDD', borderRadius: 8, justifyContent: 'center', alignItems: 'center', height: 40 },
  filterText: { fontSize: 13, color: '#666' },
  searchActionBtn: { backgroundColor: '#007BFF', paddingHorizontal: 20, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

  statsScroll: { marginBottom: 20 },
  statsCard: { backgroundColor: 'white', width: 150, padding: 15, borderRadius: 12, marginRight: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderLeftWidth: 5 },
  statsVal: { fontSize: 18, fontWeight: 'bold' },
  statsTitle: { fontSize: 11, color: '#888' },

  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12, color: '#333' },
  customerCard: { backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 15, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  customerName: { fontSize: 16, fontWeight: 'bold', color: '#333', textTransform: 'capitalize' },
  phoneTxt: { fontSize: 12, color: '#666' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusText: { fontSize: 10, fontWeight: 'bold' },
  
  divider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 },
  infoGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  infoBox: { flex: 1 },
  infoLabel: { fontSize: 10, color: '#999' },
  infoVal: { fontSize: 14, fontWeight: 'bold' },
  lastDate: { fontSize: 11, color: '#888', marginTop: 10, fontStyle: 'italic' },

  actionRow: { flexDirection: 'row', marginTop: 15 },
  actionBtn: { flex: 1, flexDirection: 'row', height: 40, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  btnTxtWhite: { color: 'white', fontSize: 13, fontWeight: 'bold' }
});
