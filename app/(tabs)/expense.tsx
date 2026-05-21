import { ThemedText } from "@/components/themed-text";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import {
  FlatList,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  Alert,
  Platform,
} from "react-native";
import DateTimePicker from '@react-native-community/datetimepicker';

interface ExpenseData {
  Id: number;
  ExpenseDate: string;
  ExpenseType: string;
  Amount: number;
  TransactionType: string;
  Remarks: string;
  CreatedDate: string;
  CreatedBy: string;
  OrganizationId: number;
}

interface SummaryData {
  TotalAmount: number;
  TotalDebit: number;
  TotalCredit: number;
  TotalTransactions: number;
  OrganizationId: number;
}

export default function TransactionManagementScreen() {
  // Data and loading states
  const [allExpenses, setAllExpenses] = useState<ExpenseData[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<ExpenseData[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<string[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Filter states
  const [dateRange, setDateRange] = useState<string>("All"); 
  const [startDate, setStartDate] = useState<Date | null>(null); 
  const [endDate, setEndDate] = useState<Date | null>(null); 
  const [selectedType, setSelectedType] = useState<string>("All");
  const [selectedTxn, setSelectedTxn] = useState<string>("All");

  // Date picker states
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date>(new Date());
  const [tempEndDate, setTempEndDate] = useState<Date>(new Date());

  // Dropdown modal control states
  const [rangeModal, setRangeModal] = useState(false);
  const [typeModal, setTypeModal] = useState(false);
  const [txnModal, setTxnModal] = useState(false);

  // Create and edit modal states
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Form field states
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [formType, setFormType] = useState("Transport");
  const [formAmount, setFormAmount] = useState("");
  const [formTxn, setFormTxn] = useState("DEBIT");
  const [formRemarks, setFormRemarks] = useState("");
  const [formExpenseDate, setFormExpenseDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const apiKey = "3A734AC6-A521-4192-984D-08D082B83456";

  // Get Bangladesh time
  const getBangladeshTime = (): Date => {
    const now = new Date();
    const bangladeshOffset = 6 * 60 * 60 * 1000; // UTC+6
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utcTime + bangladeshOffset);
  };

  // Get today's date in Bangladesh timezone (start of day)
  const getTodayBangladesh = (): Date => {
    const bangladeshDate = getBangladeshTime();
    bangladeshDate.setHours(0, 0, 0, 0);
    return bangladeshDate;
  };

  // Format date to YYYY-MM-DD for API
  const formatDateForAPI = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://devmystock.byteheart.com/Expense/Index', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        setAllExpenses(result.data || []);
        setFilteredExpenses(result.data || []);
        setExpenseTypes(result.expenseTypes || []);
        setSummary(result.summary || null);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleRangeSelect = (range: string) => {
    setDateRange(range);
    setRangeModal(false);
    if (range === "All") {
      setStartDate(null);
      setEndDate(null);
      return;
    }

    const end = getBangladeshTime();
    end.setHours(23, 59, 59, 999);
    
    const start = new Date(end);

    if (range === "7 Days") start.setDate(end.getDate() - 7);
    else if (range === "15 Days") start.setDate(end.getDate() - 15);
    else if (range === "30 Days") start.setDate(end.getDate() - 30);
    else if (range === "3 Months") start.setMonth(end.getMonth() - 3);

    // Set time to start of day for start date
    start.setHours(0, 0, 0, 0);

    setStartDate(start);
    setEndDate(end);
  };

  const formatDateForDisplay = (date: Date | null) => {
    if (!date) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const handleStartDateConfirm = (selectedDate: Date) => {
    setShowStartPicker(false);
    // Set time to start of day
    selectedDate.setHours(0, 0, 0, 0);
    setStartDate(selectedDate);
    setDateRange("Custom");
    
    // If end date exists and is before start date, reset end date
    if (endDate && endDate < selectedDate) {
      setEndDate(null);
      Alert.alert("Info", "End date has been reset as it was before the start date");
    }
  };

  const handleEndDateConfirm = (selectedDate: Date) => {
    setShowEndPicker(false);
    
    // Validate end date is not before start date
    if (startDate && selectedDate < startDate) {
      Alert.alert("Invalid Date Range", "End date cannot be before start date");
      return;
    }
    
    // Validate end date is not in future
    const today = getBangladeshTime();
    today.setHours(23, 59, 59, 999);
    
    if (selectedDate > today) {
      Alert.alert("Invalid Date", "End date cannot be in the future");
      return;
    }
    
    // Set time to end of day
    selectedDate.setHours(23, 59, 59, 999);
    setEndDate(selectedDate);
    setDateRange("Custom");
  };

  const handleSearchFilters = () => {
    let temp = [...allExpenses];

    if (startDate && endDate) {
      const start = startDate.getTime();
      const end = endDate.getTime();

      temp = temp.filter(item => {
        const itemTime = parseInt(item.ExpenseDate.replace(/\/Date\((\d+)\)\//, '$1'));
        return itemTime >= start && itemTime <= end;
      });
    }

    if (selectedType !== "All") {
      temp = temp.filter(item => item.ExpenseType === selectedType);
    }

    if (selectedTxn !== "All") {
      temp = temp.filter(item => item.TransactionType === selectedTxn.toUpperCase());
    }

    setFilteredExpenses(temp);
  };

  const handleCreateExpense = async () => {
    if (!formAmount) return Alert.alert("Error", "Amount is required");
    
    try {
      const formattedDate = formatDateForAPI(formExpenseDate);
      
      const response = await fetch("http://devmystock.byteheart.com/Expense/Create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          "ExpenseDate": formattedDate,
          "ExpenseType": formType,
          "Amount": parseFloat(formAmount),
          "TransactionType": formTxn,
          "Remarks": formRemarks,
          "CreatedBy": "API User",
          "OrganizationId": 13
        })
      });

      const result = await response.json();
      if (result.success) {
        Alert.alert("Success", "Transaction Created Successfully");
        setActionModalVisible(false);
        fetchExpenses();
        resetForm();
      } else {
        Alert.alert("Error", result.message || "Failed to create transaction");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Network error occurred");
    }
  };

  const handleEditExpense = async () => {
    if (!formAmount) return Alert.alert("Error", "Amount is required");

    try {
      const formattedDate = formatDateForAPI(formExpenseDate);
      
      const response = await fetch("http://devmystock.byteheart.com/Expense/Edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          "Id": selectedId,
          "ExpenseDate": formattedDate,
          "ExpenseType": formType,
          "Amount": parseFloat(formAmount),
          "TransactionType": formTxn,
          "Remarks": formRemarks,
          "CreatedDate": formattedDate,
          "CreatedBy": "Admin",
          "OrganizationId": 13
        })
      });

      const result = await response.json();
      if (result.success) {
        Alert.alert("Success", "Transaction Updated Successfully");
        setActionModalVisible(false);
        fetchExpenses();
        resetForm();
      } else {
        Alert.alert("Error", result.message || "Failed to update transaction");
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Network error occurred");
    }
  };

  const handleDeleteExpense = (id: number) => {
    Alert.alert("Delete", "Are you sure you want to delete this?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const response = await fetch(`http://devmystock.byteheart.com/Expense/DeleteConfirmed?id=${id}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
              }
            });
            const result = await response.json();
            if (result.success) {
              Alert.alert("Success", "Transaction deleted successfully");
              fetchExpenses();
            } else {
              Alert.alert("Error", "Failed to delete transaction");
            }
          } catch (error) {
            console.error(error);
            Alert.alert("Error", "Network error occurred");
          }
        }
      }
    ]);
  };

  const openEditModal = (item: ExpenseData) => {
    setSelectedId(item.Id);
    setFormType(item.ExpenseType);
    setFormAmount(item.Amount.toString());
    setFormTxn(item.TransactionType);
    setFormRemarks(item.Remarks);
    
    // Parse the date from the item
    const timestamp = parseInt(item.ExpenseDate.replace(/\/Date\((\d+)\)\//, '$1'));
    const expenseDate = new Date(timestamp);
    setFormExpenseDate(expenseDate);
    
    setIsEditMode(true);
    setActionModalVisible(true);
  };

  const openCreateModal = () => {
    resetForm();
    setIsEditMode(false);
    setActionModalVisible(true);
  };

  const resetForm = () => {
    setSelectedId(null);
    setFormType("Transport");
    setFormAmount("");
    setFormTxn("DEBIT");
    setFormRemarks("");
    setFormExpenseDate(getBangladeshTime());
  };

  const resetFilters = () => {
    setDateRange("All");
    setStartDate(null);
    setEndDate(null);
    setSelectedType("All");
    setSelectedTxn("All");
    setFilteredExpenses(allExpenses);
  };

  const parseJsonDate = (dateStr: string) => {
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#28a745" />
      </View>
    );
  }

  const netBalance = (summary?.TotalCredit || 0) - (summary?.TotalDebit || 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Date Pickers for Filters - Android */}
      {showStartPicker && (
        <DateTimePicker
          value={tempStartDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowStartPicker(false);
            if (selectedDate) {
              handleStartDateConfirm(selectedDate);
            }
          }}
        />
      )}
      
      {showEndPicker && (
        <DateTimePicker
          value={tempEndDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowEndPicker(false);
            if (selectedDate) {
              handleEndDateConfirm(selectedDate);
            }
          }}
          maximumDate={getBangladeshTime()}
          minimumDate={startDate || undefined}
        />
      )}

      {/* Date Picker for Create/Edit Form */}
      {showDatePicker && (
        <DateTimePicker
          value={formExpenseDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              if (selectedDate <= getBangladeshTime()) {
                setFormExpenseDate(selectedDate);
              } else {
                Alert.alert("Invalid Date", "You cannot select a future date");
              }
            }
          }}
          maximumDate={getBangladeshTime()}
        />
      )}

      <FlatList
        ListHeaderComponent={
          <>
            {/* Header Area */}
            <View style={styles.header}>
              <ThemedText style={styles.headerTitle}>Transaction Management</ThemedText>
              <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
                <ThemedText style={styles.addBtnText}>+ Add New</ThemedText>
              </TouchableOpacity>
            </View>

            {/* Filter Section */}
            <View style={styles.filterSection}>
              <View style={styles.row}>
                {/* Date Range Selector Button */}
                <TouchableOpacity style={[styles.input, { flex: 1 }]} onPress={() => setRangeModal(true)}>
                  <ThemedText style={styles.dropTxt}>{dateRange} ▾</ThemedText>
                </TouchableOpacity>
                
                {/* Start Date Picker Button */}
                <TouchableOpacity 
                  style={[styles.input, { flex: 1, justifyContent: 'center' }]} 
                  onPress={() => {
                    setTempStartDate(startDate || getBangladeshTime());
                    setShowStartPicker(true);
                  }}>
                  <ThemedText style={[styles.dropTxt, !startDate && styles.placeholderText]}>
                    {startDate ? formatDateForDisplay(startDate) : "Start Date"}
                  </ThemedText>
                </TouchableOpacity>
                
                {/* End Date Picker Button */}
                <TouchableOpacity 
                  style={[styles.input, { flex: 1, justifyContent: 'center' }]} 
                  onPress={() => {
                    setTempEndDate(endDate || getBangladeshTime());
                    setShowEndPicker(true);
                  }}>
                  <ThemedText style={[styles.dropTxt, !endDate && styles.placeholderText]}>
                    {endDate ? formatDateForDisplay(endDate) : "End Date"}
                  </ThemedText>
                </TouchableOpacity>
              </View>
              
              <View style={[styles.row, { marginTop: 8 }]}>
                {/* Expense Type Selector Button */}
                <TouchableOpacity style={[styles.input, { flex: 1 }]} onPress={() => setTypeModal(true)}>
                  <ThemedText style={styles.dropTxt}>{selectedType} ▾</ThemedText>
                </TouchableOpacity>
                
                {/* Txn Type Selector Button */}
                <TouchableOpacity style={[styles.input, { flex: 1 }]} onPress={() => setTxnModal(true)}>
                  <ThemedText style={styles.dropTxt}>{selectedTxn} ▾</ThemedText>
                </TouchableOpacity>
                
                {/* Action Buttons: Search & Reset */}
                <View style={{ flex: 1.2, flexDirection: 'row', gap: 6 }}>
                  <TouchableOpacity style={styles.resetBtn} onPress={resetFilters}>
                    <ThemedText style={styles.resetBtnText}>Reset</ThemedText>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.searchBtn} onPress={handleSearchFilters}>
                    <ThemedText style={styles.searchBtnText}>Search</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Summary Grid Layout */}
            <View style={styles.summaryContainer}>
              <ThemedText style={styles.summaryTitle}>Transaction Summary</ThemedText>
              <View style={styles.gridRow}>
                <SummaryBox label="Total Transactions" value={summary?.TotalTransactions?.toString() || "0"} color="#333" />
                <SummaryBox label="Total Credit" value={`৳${summary?.TotalCredit?.toFixed(2) || "0.00"}`} color="#28a745" />
              </View>
              <View style={[styles.gridRow, { marginTop: 8 }]}>
                <SummaryBox label="Total Debit" value={`৳${summary?.TotalDebit?.toFixed(2) || "0.00"}`} color="#dc3545" />
                <SummaryBox label="Net Balance" value={`৳${netBalance.toFixed(2)}`} color={netBalance >= 0 ? "#28a745" : "#dc3545"} />
              </View>
            </View>

            {/* Table Horizontal Scroll */}
            <ScrollView horizontal={true} showsHorizontalScrollIndicator={true}>
              <View style={styles.tableBorderWrapper}>
                <View style={[styles.tableRow, styles.tableHeader]}>
                  <ThemedText style={[styles.cell, styles.headerText, styles.rightBorder, styles.colSl]}>#</ThemedText>
                  <ThemedText style={[styles.cell, styles.headerText, styles.rightBorder, styles.colDate]}>Date</ThemedText>
                  <ThemedText style={[styles.cell, styles.headerText, styles.rightBorder, styles.colType]}>Type</ThemedText>
                  <ThemedText style={[styles.cell, styles.headerText, styles.rightBorder, styles.colTxn]}>Transaction</ThemedText>
                  <ThemedText style={[styles.cell, styles.headerText, styles.rightBorder, styles.colAmount]}>Amount</ThemedText>
                  <ThemedText style={[styles.cell, styles.headerText, styles.rightBorder, styles.colRemarks]}>Remarks</ThemedText>
                  <ThemedText style={[styles.cell, styles.headerText, styles.rightBorder, styles.colUser]}>Created By</ThemedText>
                  <ThemedText style={[styles.cell, styles.headerText, styles.colActions, { textAlign: 'center' }]}>Actions</ThemedText>
                </View>

                <FlatList
                  data={filteredExpenses}
                  keyExtractor={(item) => item.Id.toString()}
                  renderItem={({ item, index }) => {
                    const isDebit = item.TransactionType === 'DEBIT';
                    return (
                      <View style={[styles.tableRow, index % 2 === 1 && styles.alternateRow]}>
                        <ThemedText style={[styles.cell, styles.rightBorder, styles.colSl, { textAlign: 'center' }]}>{index + 1}</ThemedText>
                        <ThemedText style={[styles.cell, styles.rightBorder, styles.colDate]}>{parseJsonDate(item.ExpenseDate)}</ThemedText>
                        <ThemedText style={[styles.cell, styles.rightBorder, styles.colType]} numberOfLines={1}>{item.ExpenseType}</ThemedText>
                        <View style={[styles.cell, styles.rightBorder, styles.colTxn]}>
                          <View style={[styles.badge, { backgroundColor: isDebit ? '#FEE2E2' : '#D1FAE5' }]}>
                            <ThemedText style={[styles.badgeText, { color: isDebit ? '#EF4444' : '#10B981' }]}>{item.TransactionType}</ThemedText>
                          </View>
                        </View>
                        <ThemedText style={[styles.cell, styles.rightBorder, styles.colAmount, { color: isDebit ? '#EF4444' : '#10B981', fontWeight: '600' }]}>৳{item.Amount.toFixed(2)}</ThemedText>
                        <ThemedText style={[styles.cell, styles.rightBorder, styles.colRemarks]} numberOfLines={1}>{item.Remarks || 'N/A'}</ThemedText>
                        <ThemedText style={[styles.cell, styles.rightBorder, styles.colUser]} numberOfLines={1}>{item.CreatedBy}</ThemedText>
                        
                        <View style={[styles.cell, styles.colActions, { flexDirection: 'row', gap: 6, justifyContent: 'center' }]}>
                          <TouchableOpacity style={styles.actionEdit} onPress={() => openEditModal(item)}>
                            <MaterialCommunityIcons name="pencil" size={12} color="white" />
                          </TouchableOpacity>
                          <TouchableOpacity style={styles.actionDelete} onPress={() => handleDeleteExpense(item.Id)}>
                            <MaterialCommunityIcons name="delete" size={12} color="white" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  }}
                  ListEmptyComponent={
                    <View style={[styles.center, { width: 770 }]}>
                      <ThemedText style={{ color: '#666' }}>No transactions found</ThemedText>
                    </View>
                  }
                />
              </View>
            </ScrollView>
          </>
        }
        data={[]}
        renderItem={null}
      />

      {/* Filter Dropdown Modals */}
      <FilterSelectModal visible={rangeModal} onClose={() => setRangeModal(false)} data={["All", "7 Days", "15 Days", "30 Days", "3 Months"]} onSelect={handleRangeSelect} />
      <FilterSelectModal visible={typeModal} onClose={() => setTypeModal(false)} data={["All", ...expenseTypes]} onSelect={(val: string) => { setSelectedType(val); setTypeModal(false); }} />
      <FilterSelectModal visible={txnModal} onClose={() => setTxnModal(false)} data={["All", "Debit", "Credit"]} onSelect={(val: string) => { setSelectedTxn(val); setTxnModal(false); }} />

      {/* Create/Edit Form Modal */}
      <Modal visible={actionModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>{isEditMode ? "Edit Transaction" : "Add New Transaction"}</ThemedText>
            
            <ThemedText style={styles.formLabel}>Expense Date</ThemedText>
            <TouchableOpacity style={styles.formInput} onPress={() => setShowDatePicker(true)}>
              <ThemedText style={{ color: '#333' }}>
                {formatDateForDisplay(formExpenseDate)}
              </ThemedText>
            </TouchableOpacity>

            <ThemedText style={styles.formLabel}>Expense Type</ThemedText>
            <TextInput style={styles.formInput} value={formType} onChangeText={setFormType} />

            <ThemedText style={styles.formLabel}>Amount</ThemedText>
            <TextInput style={styles.formInput} keyboardType="numeric" value={formAmount} onChangeText={setFormAmount} placeholder="e.g. 500" />

            <ThemedText style={styles.formLabel}>Transaction Type</ThemedText>
            <View style={styles.formRow}>
              <TouchableOpacity style={[styles.radioBtn, formTxn === "DEBIT" && styles.radioActive]} onPress={() => setFormTxn("DEBIT")}>
                <ThemedText style={formTxn === "DEBIT" ? styles.radioActiveTxt : styles.radioTxt}>DEBIT</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.radioBtn, formTxn === "CREDIT" && styles.radioActive]} onPress={() => setFormTxn("CREDIT")}>
                <ThemedText style={formTxn === "CREDIT" ? styles.radioActiveTxt : styles.radioTxt}>CREDIT</ThemedText>
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.formLabel}>Remarks</ThemedText>
            <TextInput style={styles.formInput} value={formRemarks} onChangeText={setFormRemarks} placeholder="Enter notes..." />

            <View style={[styles.row, { marginTop: 15 }]}>
              <TouchableOpacity style={[styles.searchBtn, { backgroundColor: "#6c757d" }]} onPress={() => setActionModalVisible(false)}>
                <ThemedText style={styles.searchBtnText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.searchBtn} onPress={isEditMode ? handleEditExpense : handleCreateExpense}>
                <ThemedText style={styles.searchBtnText}>Save</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const FilterSelectModal = ({ visible, onClose, data, onSelect }: any) => (
  <Modal visible={visible} transparent={true} animationType="fade">
    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
      <View style={styles.dropdownListContainer}>
        <FlatList
          data={data}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.dropdownOption} onPress={() => onSelect(item)}>
              <ThemedText style={styles.dropdownOptionTxt}>{item}</ThemedText>
            </TouchableOpacity>
          )}
        />
      </View>
    </TouchableOpacity>
  </Modal>
);

const SummaryBox = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <View style={styles.summaryBox}>
    <ThemedText style={styles.summaryLabel}>{label}</ThemedText>
    <ThemedText style={[styles.summaryValue, { color }]}>{value}</ThemedText>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6f9", paddingHorizontal: 12, paddingTop: 12 },
  center: { flex: 1, justifyContent: "center", alignItems: "center", paddingVertical: 40 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 15 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  addBtn: { backgroundColor: "#28a745", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 6 },
  addBtnText: { color: "white", fontSize: 12, fontWeight: "bold" },

  filterSection: { backgroundColor: "white", padding: 10, borderRadius: 8, marginBottom: 15, elevation: 2 },
  row: { flexDirection: "row", gap: 6 },
  input: { height: 35, borderWidth: 1, borderColor: "#ddd", borderRadius: 4, paddingHorizontal: 6, justifyContent: "center", backgroundColor: '#fff' },
  dropTxt: { fontSize: 11, color: "#333" },
  placeholderText: { color: "#999" },
  searchBtn: { backgroundColor: "#007bff", flex: 1, height: 35, borderRadius: 4, justifyContent: "center", alignItems: "center" },
  searchBtnText: { color: "white", fontWeight: "bold", fontSize: 12 },

  summaryContainer: { backgroundColor: "#e8f5e9", padding: 12, borderRadius: 10, marginBottom: 20 },
  summaryTitle: { fontSize: 14, fontWeight: "bold", color: "#2e7d32", marginBottom: 10 },
  gridRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  summaryBox: { backgroundColor: "white", padding: 10, borderRadius: 8, flex: 1, alignItems: "center", elevation: 1 },
  summaryLabel: { fontSize: 11, color: "#666", marginBottom: 4 },
  summaryValue: { fontSize: 14, fontWeight: "bold" },

  tableBorderWrapper: { borderWidth: 1, borderColor: '#CCCCCC', borderRadius: 6, overflow: 'hidden', backgroundColor: '#FFFFFF', width: 770, marginBottom: 20 },
  tableRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#CCCCCC' },
  alternateRow: { backgroundColor: '#F9FAFB' },
  tableHeader: { backgroundColor: '#28a745', borderBottomWidth: 2, borderBottomColor: '#1E7E34' },
  cell: { fontSize: 12, color: '#1F2937', paddingVertical: 10, paddingHorizontal: 8 },
  rightBorder: { borderRightWidth: 1, borderRightColor: '#CCCCCC' },
  headerText: { fontWeight: '600', color: '#FFFFFF', borderRightColor: 'rgba(255, 255, 255, 0.3)' },

  colSl: { width: 40 }, colDate: { width: 105 }, colType: { width: 120 }, colTxn: { width: 100 }, colAmount: { width: 100 }, colRemarks: { width: 135 }, colUser: { width: 110 }, colActions: { width: 60 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { fontSize: 10, fontWeight: '600' },

  actionEdit: { backgroundColor: "#007bff", padding: 5, borderRadius: 4 },
  actionDelete: { backgroundColor: "#dc3545", padding: 5, borderRadius: 4 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  dropdownListContainer: { backgroundColor: 'white', width: '80%', borderRadius: 8, maxHeight: 300, padding: 10 },
  dropdownOption: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  dropdownOptionTxt: { fontSize: 14, color: '#333' },

  modalContent: { backgroundColor: '#fff', width: '90%', borderRadius: 10, padding: 20, elevation: 5 },
  modalTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5 },
  formLabel: { fontSize: 12, color: '#555', marginTop: 10, marginBottom: 4 },
  formInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, height: 40, paddingHorizontal: 10, fontSize: 14, justifyContent: 'center' },
  formRow: { flexDirection: 'row', gap: 10, marginTop: 5 },
  radioBtn: { flex: 1, borderWidth: 1, borderColor: '#ccc', height: 35, borderRadius: 6, justifyContent: 'center', alignItems: 'center' },
  radioActive: { backgroundColor: '#007bff', borderColor: '#007bff' },
  radioTxt: { color: '#333' }, radioActiveTxt: { color: '#fff', fontWeight: 'bold' },

  resetBtn: { backgroundColor: "#6c757d", flex: 1, height: 35, borderRadius: 4, justifyContent: "center", alignItems: "center" },
  resetBtnText: { color: "white", fontWeight: "bold", fontSize: 12 },
});