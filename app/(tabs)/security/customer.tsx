import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  SafeAreaView,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import { ThemedText } from "@/components/themed-text";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface Customer {
  CustomerId: number;
  CustomerName: string;
  PhoneNumber: string;
  Email: string;
  Address: string;
  OrganizationId: number;
  OrganizationName: string;
  DisplayText: string;
  CreatedDate: string;
  UpdatedDate: string | null;
}

interface Organization {
  OrganizationId: number;
  ApiKey: string;
  OrganizationName?: string;
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

export default function CustomerListScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  
  // Edit Customer States
  const [editModalVisible, setEditModalVisible] = useState<boolean>(false);
  const [editCustomer, setEditCustomer] = useState<Customer | null>(null);
  const [editName, setEditName] = useState<string>("");
  const [editPhone, setEditPhone] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");
  const [editAddress, setEditAddress] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Organization States
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const [organizationName, setOrganizationName] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [orgLoading, setOrgLoading] = useState<boolean>(true);

  // Load user session on mount
  useEffect(() => {
    loadUserSession();
  }, []);

  // Fetch customers when organization changes
  useEffect(() => {
    if (organizationId && apiKey) {
      fetchCustomers();
    }
  }, [organizationId, apiKey]);

  const loadUserSession = async () => {
    try {
      const session = await AsyncStorage.getItem("user_session");
      if (!session) {
        Alert.alert("Error", "Session not found. Please login again.");
        setOrgLoading(false);
        setLoading(false);
        return;
      }

      const userData: UserSession = JSON.parse(session);
      
      if (userData.Organizations && userData.Organizations.length > 0) {
        try {
          const headers = {
            Authorization: `Bearer ${userData.ApiKey}`,
            "Content-Type": "application/json",
          };
          const orgUrl = `http://devmystock.byteheart.com/Dashboard/GetAllOrganization?userId=${userData.UserId}`;
          const orgResponse = await fetch(orgUrl, { headers });
          const orgData = await orgResponse.json();
          
          const orgNameMap = new Map();
          if (orgData && orgData.success && Array.isArray(orgData.data)) {
            orgData.data.forEach((org: any) => {
              const id = org.organizationId || org.id;
              const name = org.organizationName || org.name;
              if (id && name) {
                orgNameMap.set(id, name);
              }
            });
          }
          
          const orgsWithNames = userData.Organizations.map(org => ({
            ...org,
            OrganizationName: orgNameMap.get(org.OrganizationId) || `Organization ${org.OrganizationId}`
          }));
          setOrganizations(orgsWithNames);
          
          const defaultOrg = orgsWithNames.find(
            org => org.OrganizationId === userData.OrganizationId
          );
          
          if (defaultOrg) {
            setOrganizationId(defaultOrg.OrganizationId);
            setOrganizationName(defaultOrg.OrganizationName || userData.OrganizationName);
            setApiKey(defaultOrg.ApiKey);
          } else {
            const firstOrg = orgsWithNames[0];
            setOrganizationId(firstOrg.OrganizationId);
            setOrganizationName(firstOrg.OrganizationName || `Organization ${firstOrg.OrganizationId}`);
            setApiKey(firstOrg.ApiKey);
          }
        } catch (error) {
          console.error("Error fetching organization names:", error);
          Alert.alert("Error", "Failed to load organization information");
          const orgsWithNames = userData.Organizations.map(org => ({
            ...org,
            OrganizationName: `Organization ${org.OrganizationId}`
          }));
          setOrganizations(orgsWithNames);
          
          const defaultOrg = orgsWithNames.find(
            org => org.OrganizationId === userData.OrganizationId
          );
          
          if (defaultOrg) {
            setOrganizationId(defaultOrg.OrganizationId);
            setOrganizationName(defaultOrg.OrganizationName);
            setApiKey(defaultOrg.ApiKey);
          }
        }
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

  const handleOrgChange = (orgId: number) => {
    if (orgId === 0) return;
    
    const selectedOrg = organizations.find(org => org.OrganizationId === orgId);
    if (selectedOrg) {
      setOrganizationId(selectedOrg.OrganizationId);
      setOrganizationName(selectedOrg.OrganizationName || `Organization ${selectedOrg.OrganizationId}`);
      setApiKey(selectedOrg.ApiKey);
      // Reset data when organization changes
      setCustomers([]);
      setSearchQuery("");
    } else {
      Alert.alert("Error", "Organization not found");
    }
  };

  const fetchCustomers = async () => {
    if (!organizationId || !apiKey) {
      Alert.alert("Error", "Organization or API key not found");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `http://devmystock.byteheart.com/Customer/FilterCustomer?organizationId=${organizationId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
        }
      );
      
      if (!response.ok) {
        if (response.status === 401) {
          Alert.alert("Error", "Unauthorized. Invalid API key for this organization.");
          setLoading(false);
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log("=== Customer API Response ===");
      console.log("Full Response:", JSON.stringify(result, null, 2));
      
      if (result.success && Array.isArray(result.data)) {
        setCustomers(result.data);
        if (result.data.length === 0) {
          Alert.alert("Info", "No customers found for this organization");
        }
      } else {
        console.warn('API Response status is not success or data is empty');
        setCustomers([]);
        Alert.alert("Error", result.message || "Failed to fetch customers");
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      Alert.alert("Error", `Failed to fetch customers: ${error.message || "Network error"}`);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setModalVisible(true);
  };

  // Open Edit Modal
  const openEditModal = (customer: Customer) => {
    setEditCustomer(customer);
    setEditName(customer.CustomerName || "");
    setEditPhone(customer.PhoneNumber || "");
    setEditEmail(customer.Email || "");
    setEditAddress(customer.Address || "");
    setEditModalVisible(true);
  };

  // EDIT: Edit Customer
  const handleEditCustomer = async () => {
    if (!editCustomer) return;

    if (!editName.trim()) {
      return Alert.alert("Validation Error", "Customer name is required");
    }

    if (!editPhone.trim()) {
      return Alert.alert("Validation Error", "Phone number is required");
    }

    setSubmitting(true);

    const payload = {
      CustomerId: editCustomer.CustomerId,
      CustomerName: editName.trim(),
      PhoneNumber: editPhone.trim(),
      Email: editEmail.trim() || "",
      Address: editAddress.trim() || "",
    };

    console.log("=== Sending Edit Customer Request ===");
    console.log("Payload:", JSON.stringify(payload, null, 2));

    try {
      const response = await fetch(
        `http://devmystock.byteheart.com/Customer/Edit/${editCustomer.CustomerId}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const result = await response.json();
      console.log("=== Edit Customer Response ===");
      console.log("Full Response:", JSON.stringify(result, null, 2));

      if (result.success === true) {
        Alert.alert("Success", "Customer updated successfully");
        setEditModalVisible(false);
        setEditCustomer(null);
        setEditName("");
        setEditPhone("");
        setEditEmail("");
        setEditAddress("");
        await fetchCustomers();
      } else {
        Alert.alert("Error", result.message || "Failed to update customer");
      }
    } catch (err) {
      console.error("Edit customer error:", err);
      Alert.alert("Error", "Network error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  // DELETE: Delete Customer
  const handleDeleteCustomer = async (customerId: number, customerName: string) => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete "${customerName}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await fetch(
                `http://devmystock.byteheart.com/Customer/Delete?id=${customerId}`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                  },
                },
              );

              const result = await response.json();
              console.log("=== Delete Customer Response ===");
              console.log("Full Response:", JSON.stringify(result, null, 2));

              if (result.success === true) {
                Alert.alert("Success", "Customer deleted successfully");
                await fetchCustomers();
              } else {
                Alert.alert("Error", result.message || "Failed to delete customer");
              }
            } catch (err) {
              console.error("Delete customer error:", err);
              Alert.alert("Error", "Network error occurred");
            }
          },
        },
      ],
    );
  };

  const parseJsonDate = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      const timestamp = parseInt(dateStr.replace(/\/Date\((\d+)\)\//, '$1'));
      if (!isNaN(timestamp)) {
        return new Date(timestamp).toLocaleDateString('en-GB'); 
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const filteredCustomers = customers.filter(customer => 
    customer.CustomerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    customer.PhoneNumber?.includes(searchQuery) ||
    customer.Email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (orgLoading || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#28A745" />
        <Text style={{ marginTop: 10, color: '#666' }}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* <Text style={styles.title}>Customer Management</Text>
      <View style={styles.titleUnderline} /> */}
      <View style={styles.blueHeader}>
          <View style={styles.headerTitleRow}>
            <MaterialCommunityIcons name="chart-bar" size={24} color="white" />
            <ThemedText style={styles.headerTitleText}>Customer Management</ThemedText>
          </View>
          {organizationName ? (
            <ThemedText style={styles.headerSubText}>{organizationName}</ThemedText>
          ) : null}
        </View>

      {/* Organization Selector */}
      {organizations.length > 0 && (
        <View style={styles.orgCard}>
          <View style={styles.orgHeader}>
            <MaterialIcons name="business" size={18} color="#28A745" />
            <Text style={styles.orgTitle}>Organization</Text>
          </View>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={organizationId || 0}
              onValueChange={handleOrgChange}
              style={styles.picker}
            >
              {/* <Picker.Item label="-- Select Organization --" value={0} /> */}
              {organizations.map((org) => (
                <Picker.Item
                  key={org.OrganizationId}
                  label={org.OrganizationName || `Organization ${org.OrganizationId}`}
                  value={org.OrganizationId}
                />
              ))}
            </Picker>
          </View>
          {/* {organizationName ? (
            <Text style={styles.selectedOrgText}>
              Selected: {organizationName}
            </Text>
          ) : null} */}
        </View>
      )}

      <TextInput
        style={styles.searchBar}
        placeholder="Search by name, phone, email..."
        placeholderTextColor="#94A3B8"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Horizontal ScrollView */}
      <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
        <View style={styles.tableBorderWrapper}>
          
          {/* Table Header */}
          <View style={[styles.row, styles.header]}>
            <Text style={[styles.cell, styles.headerText, styles.rightBorder, styles.colSl]}>SL</Text>
            <Text style={[styles.cell, styles.headerText, styles.rightBorder, styles.colName]}>Customer Name</Text>
            <Text style={[styles.cell, styles.headerText, styles.rightBorder, styles.colPhone]}>Phone Number</Text>
            <Text style={[styles.cell, styles.headerText, styles.rightBorder, styles.colEmail]}>Email</Text>
            <Text style={[styles.cell, styles.headerText, styles.colActions, { textAlign: 'center' }]}>Actions</Text>
          </View>

          {/* Table Body */}
          <FlatList
            data={filteredCustomers}
            keyExtractor={(item) => item.CustomerId.toString()}
            renderItem={({ item, index }) => (
              <View style={[styles.row, index % 2 === 1 && styles.alternateRow]}>
                <Text style={[styles.cell, styles.rightBorder, styles.colSl, { color: '#475569', textAlign: 'center' }]}>
                  {index + 1}
                </Text>
                <Text style={[styles.cell, styles.rightBorder, styles.colName, { fontWeight: '500' }]} numberOfLines={1}>
                  {item.CustomerName}
                </Text>
                <Text style={[styles.cell, styles.rightBorder, styles.colPhone, { color: '#475569' }]} numberOfLines={1}>
                  {item.PhoneNumber}
                </Text>
                <Text style={[styles.cell, styles.rightBorder, styles.colEmail, { color: '#475569' }]} numberOfLines={1}>
                  {item.Email || 'N/A'}
                </Text>
                
                {/* Actions Buttons Container */}
                <View style={[styles.cell, styles.colActions, { flexDirection: 'row', justifyContent: 'center', gap: 6 }]}>
                  <TouchableOpacity style={styles.actionButtonBlue} onPress={() => handleDetails(item)}>
                    <MaterialIcons name="visibility" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.actionButtonSky} onPress={() => openEditModal(item)}>
                    <MaterialIcons name="edit" size={16} color="#FFFFFF" />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionButtonRed} onPress={() => handleDeleteCustomer(item.CustomerId, item.CustomerName)}>
                    <MaterialIcons name="delete" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={[styles.center, { width: 620, paddingVertical: 40 }]}>
                <Text style={{ color: '#64748B' }}>No customers found</Text>
              </View>
            }
          />
        </View>
      </ScrollView>

      {/* Details Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Customer Details</Text>
            
            {selectedCustomer && (
              <View style={styles.detailsContainer}>
                <DetailRow label="Customer ID" value={selectedCustomer.CustomerId.toString()} />
                <DetailRow label="Customer Name" value={selectedCustomer.CustomerName} />
                <DetailRow label="Phone Number" value={selectedCustomer.PhoneNumber} />
                <DetailRow label="Email" value={selectedCustomer.Email || 'N/A'} />
                <DetailRow label="Address" value={selectedCustomer.Address || 'N/A'} />
                <DetailRow label="Organization" value={selectedCustomer.OrganizationName} />
                <DetailRow label="Display Text" value={selectedCustomer.DisplayText} />
                <DetailRow label="Created Date" value={parseJsonDate(selectedCustomer.CreatedDate)} />
                <DetailRow label="Updated Date" value={parseJsonDate(selectedCustomer.UpdatedDate)} />
              </View>
            )}

            <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setEditModalVisible(false);
          setEditCustomer(null);
          setEditName("");
          setEditPhone("");
          setEditEmail("");
          setEditAddress("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '85%' }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>Edit Customer</Text>

              <View style={styles.editFieldContainer}>
                <Text style={styles.editLabel}>Customer Name *</Text>
                <TextInput
                  style={styles.editInput}
                  placeholder="Enter customer name"
                  value={editName}
                  onChangeText={setEditName}
                />
              </View>

              <View style={styles.editFieldContainer}>
                <Text style={styles.editLabel}>Phone Number *</Text>
                <TextInput
                  style={styles.editInput}
                  placeholder="Enter phone number"
                  value={editPhone}
                  onChangeText={setEditPhone}
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.editFieldContainer}>
                <Text style={styles.editLabel}>Email (Optional)</Text>
                <TextInput
                  style={styles.editInput}
                  placeholder="Enter email address"
                  value={editEmail}
                  onChangeText={setEditEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.editFieldContainer}>
                <Text style={styles.editLabel}>Address (Optional)</Text>
                <TextInput
                  style={[styles.editInput, styles.textArea]}
                  placeholder="Enter address"
                  value={editAddress}
                  onChangeText={setEditAddress}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              <View style={styles.editButtonRow}>
                <TouchableOpacity
                  style={[styles.editButton, { backgroundColor: '#6B7280' }]}
                  onPress={() => {
                    setEditModalVisible(false);
                    setEditCustomer(null);
                    setEditName("");
                    setEditPhone("");
                    setEditEmail("");
                    setEditAddress("");
                  }}
                >
                  <Text style={styles.editButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.editButton, { backgroundColor: '#28A745' }]}
                  onPress={handleEditCustomer}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text style={styles.editButtonText}>Update Customer</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const DetailRow = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}:</Text>
    <Text style={styles.detailValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333333',
    marginTop: 16,
    marginBottom: 6,
  },
  titleUnderline: {
    height: 3,
    backgroundColor: '#28A745', 
    marginBottom: 16,
    width: '100%',
  },
  searchBar: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#333333',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Organization Styles
  orgCard: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  orgHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  orgTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    backgroundColor: '#FAFAFA',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  selectedOrgText: {
    fontSize: 12,
    color: '#28A745',
    marginTop: 8,
    textAlign: 'center',
    fontWeight: 'bold',
  },

  // Table Styles
  tableBorderWrapper: {
    borderWidth: 1,
    borderColor: '#CCCCCC', 
    borderRadius: 4,
    overflow: 'hidden',
    width: 620,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#CCCCCC', 
  },
  alternateRow: {
    backgroundColor: '#F9FAFB', 
  },
  header: {
    backgroundColor: '#28A745', 
    borderBottomWidth: 2,
    borderBottomColor: '#1E7E34',
  },
  cell: {
    fontSize: 12,
    color: '#1F2937',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  rightBorder: {
    borderRightWidth: 1,
    borderRightColor: '#CCCCCC', 
  },
  headerText: {
    fontWeight: '600',
    color: '#FFFFFF',
    borderRightColor: 'rgba(255, 255, 255, 0.3)', 
  },

  // Column Widths
  colSl: { width: 45 },
  colName: { width: 150 },
  colPhone: { width: 130 },
  colEmail: { width: 175 },
  colActions: { width: 120 },

  // Button Styles
  actionButtonBlue: {
    backgroundColor: '#3182CE',
    width: 28,
    height: 28,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonSky: {
    backgroundColor: '#4299E1', 
    width: 28,
    height: 28,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonRed: {
    backgroundColor: '#E53E3E', 
    width: 28,
    height: 28,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    padding: 20,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#28A745',
    paddingBottom: 6,
  },
  detailsContainer: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  detailLabel: {
    flex: 1.2,
    fontWeight: '600',
    color: '#4B5563',
    fontSize: 14,
  },
  detailValue: {
    flex: 2,
    color: '#111827',
    fontSize: 14,
  },
  closeButton: {
    backgroundColor: '#6B7280',
    paddingVertical: 10,
    borderRadius: 4,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },

  // Edit Modal Styles
  editFieldContainer: {
    marginBottom: 16,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 6,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#333333',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 80,
    paddingTop: 10,
    textAlignVertical: 'top',
  },
  editButtonRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    marginBottom: 5,
  },
  editButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  editButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
   blueHeader: { 
    backgroundColor: "#093", 
    padding: 20, 
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    margin: 10,
    marginBottom: 5,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  headerTitleText: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  headerSubText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 5 },
});