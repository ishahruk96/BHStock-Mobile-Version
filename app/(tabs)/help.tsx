import React from "react";
import { StyleSheet, View, TouchableOpacity, ScrollView } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";

export default function HelpScreen() {
  return (
    <View style={styles.container}>
      {/* Header Area */}
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="help-circle" size={30} color="white" />
        </View>
        <ThemedText style={styles.title}>Need Help?</ThemedText>
        <ThemedText style={styles.subtitle}>Access our guides and support center below</ThemedText>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.scrollContent}>
        {/* Help Options Based on Image */}
        <HelpItem 
          icon="file-pdf-box" 
          title="Download PDF Guide" 
          desc="Offline access to the complete user manual"
          iconColor="#E02B2B" 
        />
        
        <HelpItem 
          icon="eye-outline" 
          title="View PDF Online" 
          desc="Read the guide directly in your browser"
          iconColor="#007BFF" 
        />

        <HelpItem 
          icon="help-network-outline" 
          title="Help Center" 
          desc="Browse FAQs and common troubleshooting"
          iconColor="#28A745" 
        />

        {/* Extra Support (Mobile Optimized Addition) */}
        <View style={styles.supportBox}>
          <ThemedText style={styles.supportTitle}>Still stuck?</ThemedText>
          <TouchableOpacity style={styles.contactBtn}>
            <Ionicons name="chatbubble-ellipses" size={20} color="white" />
            <ThemedText style={styles.contactText}>Chat with Support</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// Sub-component for individual items
const HelpItem = ({ icon, title, desc, iconColor }: any) => (
  <TouchableOpacity style={styles.card}>
    <View style={[styles.iconBox, { backgroundColor: iconColor + '15' }]}>
      <MaterialCommunityIcons name={icon} size={24} color={iconColor} />
    </View>
    <View style={styles.textDetails}>
      <ThemedText style={styles.itemTitle}>{title}</ThemedText>
      <ThemedText style={styles.itemDesc}>{desc}</ThemedText>
    </View>
    <Ionicons name="chevron-forward" size={18} color="#CCC" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FD' },
  header: { 
    backgroundColor: '#1E293B', // ডার্ক থিম ইমেজের মেনু ব্যাকগ্রাউন্ডের সাথে মিল রেখে
    paddingTop: 60, 
    paddingBottom: 40, 
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30
  },
  iconCircle: { 
    backgroundColor: '#28A745', 
    width: 60, 
    height: 60, 
    borderRadius: 30, 
    justifyContent: 'center', 
    alignItems: 'center',
    marginBottom: 15
  },
  title: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  subtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 13, marginTop: 5 },
  
  body: { flex: 1, marginTop: -20 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 30 },
  
  card: { 
    backgroundColor: 'white', 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16, 
    borderRadius: 16, 
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10
  },
  iconBox: { width: 45, height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  textDetails: { flex: 1, marginLeft: 15 },
  itemTitle: { fontSize: 15, fontWeight: '700', color: '#333' },
  itemDesc: { fontSize: 12, color: '#777', marginTop: 2 },
  
  supportBox: { marginTop: 20, alignItems: 'center', backgroundColor: '#E7F3FF', padding: 20, borderRadius: 20 },
  supportTitle: { fontSize: 15, fontWeight: 'bold', color: '#0056B3', marginBottom: 12 },
  contactBtn: { 
    backgroundColor: '#007BFF', 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 12, 
    borderRadius: 12,
    elevation: 2
  },
  contactText: { color: 'white', fontWeight: 'bold', marginLeft: 8 }
});