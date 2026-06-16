import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, StatusBar } from "react-native";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons"; // আইকন ব্যবহারের জন্য ইমপোর্ট করা হয়েছে

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // পাসওয়ার্ড হাইড/শো করার স্টেট
  const router = useRouter();

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://devmystock.byteheart.com/Auth/LoginAPI", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Username: username, 
          Password: password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.Success === true) { 
        const userInfo = {
          UserId: data.UserId,
          UserName: data.UserName,
          RoleName: data.RoleName,
          OrganizationName: data.OrganizationName,
          ApiKey: data.ApiKey, 
          Organizations: data.Organizations
        };

        await AsyncStorage.setItem("user_session", JSON.stringify(userInfo));
        Alert.alert("Success", data.Message || "Login successful.");
        router.replace("/(tabs)/dashboard");
      } else {
        Alert.alert("Login Failed", data.Message || "Invalid credentials");
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong. Please try again.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* হেডার ও লোগো সেকশন */}
      <View style={styles.headerContainer}>
        <View style={styles.logoCircle}>
          <Ionicons name="trending-up" size={40} color="#2e7d32" />
        </View>
        <Text style={styles.logoText}>Stock Management</Text>
        <Text style={styles.subTitle}>Manage your inventory smarter and faster</Text>
      </View>
      
      {/* ইনপুট ফর্ম সেকশন */}
      <View style={styles.formContainer}>
        
        {/* ইউজারনেম ইনপুট */}
        <Text style={styles.inputLabel}>Username / Email</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="person-outline" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter your username or email"
            placeholderTextColor="#aaa"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
        </View>

        {/* পাসওয়ার্ড ইনপুট */}
        <Text style={styles.inputLabel}>Password</Text>
        <View style={styles.inputWrapper}>
          <Ionicons name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Enter your password"
            placeholderTextColor="#aaa"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity 
            style={styles.eyeIcon} 
            onPress={() => setShowPassword(!showPassword)}
          >
            <Ionicons 
              name={showPassword ? "eye-off-outline" : "eye-outline"} 
              size={20} 
              color="#666" 
            />
          </TouchableOpacity>
        </View>

        {/* লগইন বাটন */}
        <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <View style={styles.btnContent}>
              <Text style={styles.loginText}>Sign In</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 5 }} />
            </View>
          )}
        </TouchableOpacity>
        
      </View>
      
      {/* ফুটার সেকশন */}
      <Text style={styles.footerText}>Powered by ByteHeart</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 24,
    justifyContent: "center",
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#e8f5e9",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  logoText: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1b5e20",
    letterSpacing: 0.5,
  },
  subTitle: {
    fontSize: 13,
    color: "#666",
    marginTop: 5,
    textAlign: "center",
  },
  formContainer: {
    width: "100%",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    marginBottom: 6,
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
    marginBottom: 20,
    paddingHorizontal: 15,
    height: 54,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: "#333",
    fontSize: 15,
    height: "100%",
  },
  eyeIcon: {
    padding: 5,
  },
  loginBtn: {
    width: "100%",
    backgroundColor: "#2e7d32",
    height: 54,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#2e7d32",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 3, 
  },
  btnContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  loginText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  footerText: {
    position: "absolute",
    bottom: 25,
    alignSelf: "center",
    color: "#aaa",
    fontSize: 11,
    letterSpacing: 0.5,
  },
});