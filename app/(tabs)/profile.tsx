import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, TouchableOpacity, TextInput, Image, ActivityIndicator } from "react-native";
import { ThemedText } from "@/components/themed-text";
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from "@expo/vector-icons";

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch("http://devmystock.byteheart.com/UserManagement/GetUsersJson", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer 3A734AC6-A521-4192-984D-08D082B83456"
        }
      });
      
      const result = await response.json();
      
      if (result.Success && result.Data && result.Data.length > 0) {
        const user = result.Data[0];
        setUserData(user);
        setFullName(user.FullName || "");
        setEmail(user.Email || "");
        setPhone(user.Phone || "");
      } else {
        setError("Failed to load user data");
      }
    } catch (err) {
      setError("Network error. Please try again.");
      console.error(err);
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

  const handleSave = () => {
    // Handle save logic here
    console.log("Save changes:", { fullName, email, phone, currentPassword, newPassword, confirmPassword });
  };

  const handleRefresh = () => {
    fetchUserProfile();
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  if (loading) {
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
          <TouchableOpacity style={styles.backBtn}>
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

        {/* Personal Information Card */}
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
              Enter your current password and a new password if you want to change it.
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
                <ThemedText style={styles.orgName}>{org.OrganizationName}</ThemedText>
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

        {/* Action Buttons */}
        <View style={styles.footerBtns}>
          <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
            <Ionicons name="refresh" size={18} color="#333" />
            <ThemedText style={styles.refreshText}>Refresh</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Ionicons name="save" size={18} color="white" />
            <ThemedText style={styles.saveText}>Save Changes</ThemedText>
          </TouchableOpacity>
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
  headerArea: { backgroundColor: "#2e7d32", paddingTop: 20, paddingBottom: 60, paddingHorizontal: 15 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 5 },
  backBtnText: { color: 'white', fontSize: 12 },
  content: { marginTop: -40, paddingHorizontal: 15, paddingBottom: 30 },
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
  orgName: { fontWeight: 'bold', color: '#2e7d32' },
  primaryBadge: { backgroundColor: '#2e7d32', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  primaryText: { color: 'white', fontSize: 10, marginLeft: 4 },
  noOrgText: { textAlign: 'center', color: '#666', padding: 10 },
  footerBtns: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  refreshBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', borderWidth: 1, borderColor: '#ddd', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8 },
  refreshText: { marginLeft: 8, fontWeight: 'bold', color: '#333' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#28a745', paddingVertical: 12, paddingHorizontal: 25, borderRadius: 8 },
  saveText: { marginLeft: 8, fontWeight: 'bold', color: 'white' },
});