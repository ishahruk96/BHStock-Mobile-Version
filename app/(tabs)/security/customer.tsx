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
  ScrollView, // স্ক্রল করার জন্য যুক্ত করা হয়েছে
} from 'react-native';
import { MaterialIcons } from "@expo/vector-icons";

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

export default function CustomerListScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [modalVisible, setModalVisible] = useState<boolean>(false);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('http://devmystock.byteheart.com/Customer/FilterCustomer', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer 3A734AC6-A521-4192-984D-08D082B83456', 
        },
      });
      
      const result = await response.json();
      
      if (result.success && Array.isArray(result.data)) {
        setCustomers(result.data);
      } else {
        console.warn('API Response status is not success or data is empty');
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setModalVisible(true);
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#28A745" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Customer Management</Text>
      <View style={styles.titleUnderline} />

      <TextInput
        style={styles.searchBar}
        placeholder="Search by name, phone, email..."
        placeholderTextColor="#94A3B8"
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Horizontal ScrollView: এটি টেবিলটিকে বাম-ডান স্ক্রল করার সুবিধা দেয় */}
      <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
        {/* টেবিলের ফিক্সড উইডথ দেওয়া হয়েছে যেন কলামগুলো ছোট স্ক্রিনেও চ্যাপ্টা না হয়ে যায় */}
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
                  
                  <TouchableOpacity style={styles.actionButtonSky}>
                    <MaterialIcons name="edit" size={16} color="#FFFFFF" />
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.actionButtonRed}>
                    <MaterialIcons name="delete" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            ListEmptyComponent={
              <View style={[styles.center, { width: 600 }]}>
                <Text style={{ marginTop: 40, color: '#64748B', paddingBottom: 20 }}>No entries found</Text>
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
  
  // Table Scroll Wrapper
  tableBorderWrapper: {
    borderWidth: 1,
    borderColor: '#CCCCCC', 
    borderRadius: 4,
    overflow: 'hidden',
    width: 620, // টেবিলের টোটাল ফিক্সড উইডথ (বাম-ডান স্ক্রলের জন্য জরুরি)
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

  // কলামগুলোর নির্দিষ্ট ফিক্সড উইডথ (যাতে স্ক্রল করার সময় কলাম সুন্দর দেখায়)
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
});