import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

interface Organization {
  OrganizationId: number;
  ApiKey: string;
  OrganizationName?: string;
  IsPrimary?: boolean;
  IsActive?: boolean;
}

interface UserSession {
  Success: boolean;
  Message: string;
  Token: string | null;
  UserId: string;
  UserName: string;
  RoleName: string;
  OrganizationId: number;
  OrganizationName: string;
  ApiKey: string;
  Organizations: Organization[];
}

interface UserData {
  UserId: string;
  UserName: string;
  FullName: string;
  Email: string;
  Phone: string;
  RoleName: string;
  IsApproved: boolean;
  IsLockedOut: boolean;
  CreatedDate: string;
  LastLoginDate: string;
  Organizations: Organization[];
}

export default function ProfileScreen() {
  const router = useRouter();
  
  // Organization States
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [apiKey, setApiKey] = useState<string>("");
  const [orgLoading, setOrgLoading] = useState<boolean>(true);
  const [sessionUserId, setSessionUserId] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Load user session on mount
  useEffect(() => {
    loadUserSession();
  }, []);

  // Fetch user profile when API key is available
  useEffect(() => {
    if (apiKey && sessionUserId) {
      fetchUserProfile();
    }
  }, [apiKey, sessionUserId]);

  const loadUserSession = async () => {
    try {
      const session = await AsyncStorage.getItem("user_session");
      if (!session) {
        Alert.alert("Error", "Session not found. Please login again.");
        setOrgLoading(false);
        setLoading(false);
        return;
      }

      const sessionData: UserSession = JSON.parse(session);
      setSessionUserId(sessionData.UserId);
      setApiKey(sessionData.ApiKey);
      
      if (sessionData.Organizations && sessionData.Organizations.length > 0) {
        setOrganizations(sessionData.Organizations);
      } else {
        Alert.alert("Error", "No organizations found for this user");
        setOrgLoading(false);
        setLoading(false);
      }
    } catch (error) {
      console.error("Error loading session:", error);
      Alert.alert("Error", "Failed to load user session");
      setOrgLoading(false);
      setLoading(false);
    } finally {
      setOrgLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    if (!apiKey) {
      setError("API key not available");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch("http://devmystock.byteheart.com/UserManagement/GetUsersJson", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized. Invalid API key.");
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      const result = await response.json();
      console.log("=== Profile API Response ===");
      console.log("Full Response:", JSON.stringify(result, null, 2));
      
      if (result.Success && result.Data && result.Data.length > 0) {
        // Find the logged-in user by matching UserId
        const loggedInUser = result.Data.find((user: any) => user.UserId === sessionUserId);
        
        if (loggedInUser) {
          setUserData(loggedInUser);
          setFullName(loggedInUser.FullName || "");
          setEmail(loggedInUser.Email || "");
          setPhone(loggedInUser.Phone || "");
          
          // Update organizations from API response
          if (loggedInUser.Organizations && loggedInUser.Organizations.length > 0) {
            const orgsWithKeys = loggedInUser.Organizations.map((org: any) => {
              const sessionOrg = organizations.find(o => o.OrganizationId === org.OrganizationId);
              return {
                ...org,
                ApiKey: sessionOrg?.ApiKey || ""
              };
            });
            setOrganizations(orgsWithKeys);
          }
        } else {
          setError("Logged-in user not found in the response");
          Alert.alert("Error", "Logged-in user not found");
        }
      } else {
        setError("Failed to load user data");
        Alert.alert("Error", result.Message || "Failed to load user data");
      }
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(err.message || "Network error. Please try again.");
      Alert.alert("Error", err.message || "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const match = dateString.match(/\/Date\((\d+)\)\//);
    if (match) {
      const timestamp = parseInt(match[1]);
      const date = new Date(timestamp);
      return date.toLocaleDateString() + " " + date.toLocaleTimeString();
    }
    return dateString;
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleSave = async () => {
    // Validate
    if (!fullName) {
      Alert.alert("Error", "Full name is required");
      return;
    }
    
    if (!email) {
      Alert.alert("Error", "Email is required");
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    try {
      setLoading(true);
      
      const updateData = {
        UserId: sessionUserId,
        FullName: fullName,
        Email: email,
        Phone: phone,
      };

      const response = await fetch("http://devmystock.byteheart.com/UserManagement/UpdateProfile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();
      
      if (result.Success) {
        Alert.alert("Success", "Profile updated successfully!");
        fetchUserProfile(); // Refresh data
      } else {
        Alert.alert("Error", result.Message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Update error:", error);
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    // Validate passwords
    if (!currentPassword) {
      Alert.alert("Error", "Please enter your current password");
      return;
    }
    
    if (!newPassword) {
      Alert.alert("Error", "Please enter a new password");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New password and confirm password do not match");
      return;
    }
    
    if (newPassword.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      
      const updateData = {
        UserId: sessionUserId,
        CurrentPassword: currentPassword,
        NewPassword: newPassword,
      };

      const response = await fetch("http://devmystock.byteheart.com/UserManagement/ChangePassword", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify(updateData)
      });

      const result = await response.json();
      
      if (result.Success) {
        Alert.alert("Success", "Password updated successfully!");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        Alert.alert("Error", result.Message || "Failed to update password");
      }
    } catch (error) {
      console.error("Update error:", error);
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDashboard = () => {
    router.push("/dashboard");
  };

  if (orgLoading || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2e7d32" />
        <ThemedText style={styles.loadingText}>Loading profile...</ThemedText>
      </View>
    );
  }

  if (error || !userData) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={50} color="#dc3545" />
        <ThemedText style={styles.errorText}>{error || "Failed to load profile"}</ThemedText>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchUserProfile}>
          <ThemedText style={styles.retryText}>Retry</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Green Header Area */}
      <View style={styles.headerArea}>
        <View style={styles.headerTop}>
          <ThemedText style={styles.headerTitle}>My Profile</ThemedText>
          <TouchableOpacity style={styles.backBtn} onPress={handleBackToDashboard}>
            <ThemedText style={styles.backBtnText}>← Back to Dashboard</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {/* Account Summary Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle" size={20} color="#2e7d32" />
            <ThemedText style={styles.cardHeaderText}>Account Information</ThemedText>
          </View>
          <View style={styles.profileInfoCenter}>
            <View style={styles.avatarPlaceholder}>
              <ThemedText style={styles.avatarText}>{getInitials(fullName)}</ThemedText>
            </View>
            <ThemedText style={styles.userName}>{fullName}</ThemedText>
            <View style={styles.roleBadge}>
              <ThemedText style={styles.roleText}>{userData.RoleName?.toUpperCase() || "USER"}</ThemedText>
            </View>
          </View>
          <View style={styles.statsRow}>
            <StatItem icon="calendar" label="Account Created" value={formatDate(userData.CreatedDate)} />
            <StatItem icon="login" label="Last Login" value={formatDate(userData.LastLoginDate)} />
          </View>
        </View>

        {/* Personal Information Card - Editable */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person" size={20} color="#2e7d32" />
            <ThemedText style={styles.cardHeaderText}>Personal Information</ThemedText>
          </View>
          
          <InputLabel label="Username" value={userData.UserName} editable={false} />
          <ThemedText style={styles.subHint}>Username cannot be changed</ThemedText>
          
          <InputLabel 
            label="Full Name *" 
            value={fullName} 
            onChangeText={setFullName}
          />
          <InputLabel 
            label="Email *" 
            value={email} 
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <InputLabel 
            label="Phone Number" 
            value={phone} 
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <InputLabel label="Role" value={userData.RoleName} editable={false} />
          
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Ionicons name="save" size={18} color="white" />
            <ThemedText style={styles.saveText}>Save Changes</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Change Password Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="key" size={20} color="#2e7d32" />
            <ThemedText style={styles.cardHeaderText}>Change Password</ThemedText>
          </View>
          <View style={styles.infoAlert}>
            <Ionicons name="information-circle" size={16} color="#004085" />
            <ThemedText style={styles.alertText}>
              Enter your current password and a new password to update.
            </ThemedText>
          </View>
          <InputLabel 
            label="Current Password" 
            placeholder="Current password" 
            secure 
            value={currentPassword}
            onChangeText={setCurrentPassword}
          />
          <InputLabel 
            label="New Password" 
            placeholder="New password" 
            secure 
            value={newPassword}
            onChangeText={setNewPassword}
          />
          <ThemedText style={styles.subHint}>Minimum 6 characters</ThemedText>
          <InputLabel 
            label="Confirm Password" 
            placeholder="Confirm new password" 
            secure 
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <TouchableOpacity style={styles.updatePasswordBtn} onPress={handleUpdatePassword}>
            <Ionicons name="key-outline" size={18} color="white" />
            <ThemedText style={styles.updatePasswordText}>Update Password</ThemedText>
          </TouchableOpacity>
        </View>

        {/* My Organizations Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <FontAwesome5 name="building" size={18} color="#2e7d32" />
            <ThemedText style={styles.cardHeaderText}>My Organizations</ThemedText>
          </View>
          {userData.Organizations && userData.Organizations.length > 0 ? (
            userData.Organizations.map((org: any, index: number) => (
              <View key={index} style={styles.orgRow}>
                <View style={styles.orgInfo}>
                  <ThemedText style={styles.orgName}>{org.OrganizationName}</ThemedText>
                  <ThemedText style={styles.orgIdText}>ID: {org.OrganizationId}</ThemedText>
                </View>
                {org.IsPrimary && (
                  <View style={styles.primaryBadge}>
                    <Ionicons name="star" size={12} color="white" />
                    <ThemedText style={styles.primaryText}>Primary</ThemedText>
                  </View>
                )}
              </View>
            ))
          ) : (
            <ThemedText style={styles.noOrgText}>No organizations assigned</ThemedText>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

// Sub-components
const InputLabel = ({ label, value, placeholder, editable = true, secure = false, onChangeText, keyboardType = "default" }: any) => (
  <View style={styles.inputGroup}>
    <ThemedText style={styles.label}>{label}</ThemedText>
    <TextInput
      style={[styles.input, !editable && styles.disabledInput]}
      value={value}
      placeholder={placeholder}
      editable={editable}
      secureTextEntry={secure}
      onChangeText={onChangeText}
      keyboardType={keyboardType}
    />
  </View>
);

const StatItem = ({ icon, label, value }: any) => (
  <View style={styles.statItem}>
    <View style={styles.statTop}>
      <MaterialCommunityIcons name={icon} size={16} color="#2e7d32" />
      <ThemedText style={styles.statLabel}>{label}</ThemedText>
    </View>
    <ThemedText style={styles.statValue}>{value}</ThemedText>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6f9" },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: "#f4f6f9" },
  loadingText: { marginTop: 10, fontSize: 14, color: '#666' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: "#f4f6f9", padding: 20 },
  errorText: { marginTop: 10, fontSize: 14, color: '#dc3545', textAlign: 'center' },
  retryBtn: { marginTop: 15, backgroundColor: '#2e7d32', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 5 },
  retryText: { color: 'white', fontWeight: 'bold' },
  
  headerArea: { 
    backgroundColor: "#2e7d32", 
    paddingTop: 20, 
    paddingBottom: 20, 
    paddingHorizontal: 15,
  },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 5 },
  backBtnText: { color: 'white', fontSize: 12 },

  content: { paddingHorizontal: 15, paddingBottom: 30, marginTop: 15 },
  card: { backgroundColor: 'white', borderRadius: 10, padding: 15, marginBottom: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10, marginBottom: 15 },
  cardHeaderText: { marginLeft: 10, fontSize: 16, fontWeight: 'bold', color: '#333' },
  profileInfoCenter: { alignItems: 'center', marginBottom: 20 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e8f5e9', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#2e7d32' },
  avatarText: { fontSize: 24, fontWeight: 'bold', color: '#2e7d32' },
  userName: { fontSize: 18, fontWeight: 'bold', marginTop: 10 },
  roleBadge: { backgroundColor: '#ffc107', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 15, marginTop: 5 },
  roleText: { fontSize: 10, fontWeight: 'bold', color: '#000' },
  statsRow: { borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 15, flexDirection: 'row', justifyContent: 'space-between' },
  statItem: { flex: 1 },
  statTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  statLabel: { fontSize: 11, color: '#666', marginLeft: 5 },
  statValue: { fontSize: 12, fontWeight: 'bold', color: '#333' },
  
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#555', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, fontSize: 14, color: '#333' },
  disabledInput: { backgroundColor: '#f9f9f9', color: '#888' },
  subHint: { fontSize: 10, color: '#999', marginTop: -10, marginBottom: 10 },
  infoAlert: { backgroundColor: '#e7f3ff', padding: 10, borderRadius: 6, flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  alertText: { fontSize: 11, color: '#004085', marginLeft: 8, flex: 1 },
  
  orgRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f1f8e9', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#c8e6c9', marginBottom: 8 },
  orgInfo: { flex: 1 },
  orgName: { fontWeight: 'bold', color: '#2e7d32' },
  orgIdText: { fontSize: 10, color: '#666', marginTop: 2 },
  primaryBadge: { backgroundColor: '#2e7d32', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  primaryText: { color: 'white', fontSize: 10, marginLeft: 4 },
  noOrgText: { textAlign: 'center', color: '#666', padding: 10 },
  
  // Save Button
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 10,
  },
  saveText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  },
  
  // Update Password Button
  updatePasswordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2e7d32',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 10,
  },
  updatePasswordText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 8,
  },
});