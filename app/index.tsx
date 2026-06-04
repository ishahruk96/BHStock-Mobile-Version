import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useRouter } from "expo-router";
// AsyncStorage ইমপোর্ট করুন
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
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
        // ১. API রেসপন্স থেকে প্রয়োজনীয় তথ্যগুলো স্ট্রাকচার করে নিন
        // (আপনার API এর রেসপন্স কী (Key) অনুযায়ী এগুলো একটু মিলিয়ে নিবেন, যেমন: data.UserId বা data.data.UserId)
        const userInfo = {
          UserId: data.UserId,
          UserName: data.UserName,
          RoleName: data.RoleName,
          OrganizationName: data.OrganizationName,
          ApiKey: data.ApiKey, 
        };

        // ২. AsyncStorage-এ স্ট্রিং হিসেবে সেভ করুন
        await AsyncStorage.setItem("user_session", JSON.stringify(userInfo));

        Alert.alert("Success", data.Message || "Login successful.");
        
        // ড্যাশবোর্ডে রিডাইরেক্ট
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
      <Text style={styles.logo}>My Stock</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Username / Email"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.loginText}>LOGIN</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  logo: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#2e7d32",
    marginBottom: 40,
  },
  input: {
    width: "100%",
    backgroundColor: "#f5f5f5",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  loginBtn: {
    width: "100%",
    backgroundColor: "#2e7d32",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  loginText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});