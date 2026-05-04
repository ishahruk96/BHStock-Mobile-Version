import { Tabs, useRouter } from "expo-router";
import React, { useState } from "react";
import { View, Pressable, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabLayout() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("dashboard");
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const go = (path: string) => {
    setMenuVisible(false);
    router.push(path as any);
  };

  const handleTabPress = (tabName: string, route: string) => {
    setActiveTab(tabName);
    router.push(route as any);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#f5f5f5" }}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Main content - Added bottom padding so content doesn't hide behind navbar */}
      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: 75 }}>
        <Tabs screenOptions={{ headerShown: false, tabBarStyle: { display: "none" } }}>
          <Tabs.Screen name="dashboard" />
          <Tabs.Screen name="sales_list" />
          <Tabs.Screen name="products" />
          <Tabs.Screen name="profile" />
        </Tabs>
      </View>

      {/* Fixed Navbar */}
      <View style={[styles.navbar, { paddingBottom: insets.bottom }]}>
        <Pressable 
          onPress={() => handleTabPress("dashboard", "/(tabs)/dashboard")} 
          style={styles.navItem}
        >
          <Ionicons 
            name={activeTab === "dashboard" ? "home" : "home-outline"} 
            size={24} 
            color={activeTab === "dashboard" ? "#2e7d32" : "#666"} 
            style={activeTab === "dashboard" && styles.activeIcon}
          />
          <Text style={[styles.navText, activeTab === "dashboard" && styles.activeNavText]}>
            Home
          </Text>
        </Pressable>

        <Pressable 
          onPress={() => handleTabPress("sales_list", "/(tabs)/sales_list")} 
          style={styles.navItem}
        >
          <Ionicons 
            name={activeTab === "sales_list" ? "cart" : "cart-outline"} 
            size={24} 
            color={activeTab === "sales_list" ? "#2e7d32" : "#666"}
            style={activeTab === "sales_list" && styles.activeIcon}
          />
          <Text style={[styles.navText, activeTab === "sales_list" && styles.activeNavText]}>
            Sales
          </Text>
        </Pressable>

        <View style={styles.centerBtnWrapper}>
          <Pressable style={styles.centerBtn} onPress={() => setMenuVisible(true)}>
            <Ionicons name="grid-outline" size={28} color="#fff" />
          </Pressable>
        </View>

        <Pressable 
          onPress={() => handleTabPress("products", "/(tabs)/products")} 
          style={styles.navItem}
        >
          <Ionicons 
            name={activeTab === "products" ? "cube" : "cube-outline"} 
            size={24} 
            color={activeTab === "products" ? "#2e7d32" : "#666"}
            style={activeTab === "products" && styles.activeIcon}
          />
          <Text style={[styles.navText, activeTab === "products" && styles.activeNavText]}>
            Products
          </Text>
        </Pressable>

        <Pressable 
          onPress={() => handleTabPress("profile", "/(tabs)/profile")} 
          style={styles.navItem}
        >
          <Ionicons 
            name={activeTab === "profile" ? "person" : "person-outline"} 
            size={24} 
            color={activeTab === "profile" ? "#2e7d32" : "#666"}
            style={activeTab === "profile" && styles.activeIcon}
          />
          <Text style={[styles.navText, activeTab === "profile" && styles.activeNavText]}>
            Profile
          </Text>
        </Pressable>
      </View>

      {/* Menu Modal */}
      <Modal visible={menuVisible} animationType="slide" transparent onRequestClose={() => setMenuVisible(false)}>
        <TouchableOpacity 
          style={styles.overlay} 
          activeOpacity={1} 
          onPressOut={() => setMenuVisible(false)}
        >
          <View style={styles.menuBox}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* SALES */}
              <Text style={styles.title}>Sales</Text>
              <View style={styles.grid}>
                <MenuItem label="Single Entry" icon="add-circle" onPress={() => go("/sales/single_sales_entry")} />
                <MenuItem label="Sales Entry" icon="create" onPress={() => go("/sales/sales_entry")} />
                <MenuItem label="Bulk Entry" icon="layers" onPress={() => go("/sales/sales_bulk_entry")} />
                <MenuItem label="Restock" icon="refresh" onPress={() => go("/sales/restock_entry_history")} />
                <MenuItem label="Due" icon="cash" onPress={() => go("/sales/due")} />
              </View>

              {/* SECURITY */}
              <Text style={styles.title}>Security</Text>
              <View style={styles.grid}>
                <MenuItem label="Register" icon="person-add" onPress={() => go("/security/register")} />
                <MenuItem label="Users" icon="people" onPress={() => go("/security/user_management")} />
                <MenuItem label="Permissions" icon="lock-closed" onPress={() => go("/security/permissions")} />
                <MenuItem label="Organization" icon="business" onPress={() => go("/security/organization")} />
                <MenuItem label="Customer" icon="person" onPress={() => go("/security/customer")} />
                <MenuItem label="Access Control" icon="key" onPress={() => go("/security/access_control")} />
              </View>

              {/* OTHERS */}
              <Text style={styles.title}>Others</Text>
              <View style={styles.grid}>
                <MenuItem label="Expense" icon="card" onPress={() => go("/expense")} />
                <MenuItem label="Report" icon="bar-chart" onPress={() => go("/report")} />
                <MenuItem label="Help" icon="help-circle" onPress={() => go("/help")} />
              </View>
            </ScrollView>

            <TouchableOpacity style={styles.closeBtn} onPress={() => setMenuVisible(false)}>
              <Text style={{ color: "#fff", fontWeight: 'bold', fontSize: 16 }}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const MenuItem = ({ label, icon, onPress }: any) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <Ionicons name={icon} size={24} color="#2e7d32" style={styles.menuIcon} />
    <Text style={styles.cardText}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  navbar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    height: 70,
    elevation: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  navItem: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center" 
  },
  navText: { 
    fontSize: 11, 
    marginTop: 2, 
    color: "#666",
    fontWeight: "500"
  },
  activeNavText: {
    color: "#2e7d32",
    fontWeight: "700",
  },
  activeIcon: {
    fontWeight: "bold",
  },
  centerBtnWrapper: {
    width: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerBtn: {
    backgroundColor: "#2e7d32",
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginTop: -35,
    elevation: 8,
    shadowColor: "#2e7d32",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  overlay: { 
    flex: 1, 
    backgroundColor: "rgba(0,0,0,0.4)", 
    justifyContent: "flex-end" 
  },
  menuBox: { 
    backgroundColor: "#fff", 
    padding: 25, 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30, 
    maxHeight: "80%" 
  },
  title: { 
    fontSize: 20, 
    fontWeight: "bold", 
    marginBottom: 20, 
    color: '#2e7d32',
    marginTop: 10
  },
  grid: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    justifyContent: "space-between",
    marginBottom: 10
  },
  card: { 
    width: "30%", 
    backgroundColor: "#f9f9f9", 
    padding: 15, 
    borderRadius: 15, 
    alignItems: "center", 
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  cardText: { 
    fontSize: 12, 
    marginTop: 8, 
    textAlign: "center", 
    color: '#444',
    fontWeight: "500"
  },
  closeBtn: { 
    marginTop: 10, 
    backgroundColor: "#2e7d32", 
    padding: 16, 
    borderRadius: 12, 
    alignItems: "center",
    shadowColor: "#2e7d32",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  menuIcon: {
    fontWeight: "bold",
  }
});