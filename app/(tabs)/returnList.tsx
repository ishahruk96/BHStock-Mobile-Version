import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  FlatList,
  SafeAreaView,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';

const { width } = Dimensions.get('window');

// --- Interfaces ---
interface ReturnItem {
  ReturnId: number;
  OriginalTransactionNumber: string;
  OriginalTransactionId: number | null;
  OriginalProductName: string | null;
  ReturnTransactionNumber: string;
  ProductId: number;
  ProductName: string;
  Category: string;
  Quantity: number;
  UnitPrice: number;
  TotalAmount: number;
  ReturnType: string;
  DisplayType: string | null;
  ReturnDate: string;
  Remarks: string;
  CreatedBy: string;
  OrganizationId: number;
  CustomerName: string;
  CustomerPhone: string;
  IsProcessed: boolean;
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

// API Configuration
const API_BASE = 'http://devmystock.byteheart.com';

export default function ReturnHistoryScreen() {
  const router = useRouter();
  
  // --- States ---
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ReturnItem[]>([]);
  const [apiKey, setApiKey] = useState<string>('');
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [selectedOrgName, setSelectedOrgName] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filterType, setFilterType] = useState<string>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const [categories, setCategories] = useState<string[]>([]);

  // --- Load API Key and Organizations ---
  const loadUserSession = async () => {
    try {
      const session = await AsyncStorage.getItem("user_session");
      if (!session) {
        Alert.alert('Error', 'Session not found. Please login again.');
        setLoading(false);
        return null;
      }

      const userData: UserSession = JSON.parse(session);
      
      // Get organization names from API
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
        
        // Get default organization
        const defaultOrgId = userData.OrganizationId || (orgsWithNames.length > 0 ? orgsWithNames[0].OrganizationId : null);
        
        if (defaultOrgId) {
          const org = orgsWithNames.find((o: any) => o.OrganizationId === defaultOrgId);
          if (org) {
            setSelectedOrgId(defaultOrgId);
            setSelectedOrgName(org.OrganizationName || `Org ${defaultOrgId}`);
            setApiKey(org.ApiKey);
            return org.ApiKey;
          }
        }
        
        return userData.ApiKey || '';
      } catch (error) {
        console.error('Error fetching organization names:', error);
        const orgsWithNames = userData.Organizations.map(org => ({
          ...org,
          OrganizationName: `Organization ${org.OrganizationId}`
        }));
        setOrganizations(orgsWithNames);
        
        const defaultOrgId = userData.OrganizationId || (orgsWithNames.length > 0 ? orgsWithNames[0].OrganizationId : null);
        
        if (defaultOrgId) {
          const org = orgsWithNames.find((o: any) => o.OrganizationId === defaultOrgId);
          if (org) {
            setSelectedOrgId(defaultOrgId);
            setSelectedOrgName(org.OrganizationName || `Org ${defaultOrgId}`);
            setApiKey(org.ApiKey);
            return org.ApiKey;
          }
        }
        
        return userData.ApiKey || '';
      }
    } catch (error) {
      console.error('Error loading session:', error);
      return null;
    }
  };

  // --- Fetch Return History ---
  const fetchReturnHistory = async (key: string, orgId: number) => {
    if (!key || !orgId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      const headers = {
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'API_KEY': key,
      };

      const url = `${API_BASE}/Stock/ReturnList?organizationId=${orgId}`;
      console.log(`📡 Fetching return history for org ${orgId} with API key: ${key.substring(0, 10)}...`);
      
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Unauthorized. Invalid API key for this organization.');
        }
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      const data = await response.json();
      console.log(`📦 Return history response received for org ${orgId}`);
      
      let items: ReturnItem[] = [];
      // Handle the response structure: data.Items
      if (data.data && data.data.Items) {
        items = Array.isArray(data.data.Items) ? data.data.Items : [data.data.Items];
      } else if (data.data && Array.isArray(data.data)) {
        items = data.data;
      } else if (data.result && Array.isArray(data.result)) {
        items = data.result;
      } else if (Array.isArray(data)) {
        items = data;
      } else if (data.Items && Array.isArray(data.Items)) {
        items = data.Items;
      }
      
      console.log(`✅ Found ${items.length} return items for org ${orgId}`);
      
      // Extract categories for filter
      const uniqueCategories = [...new Set(items.map(item => item.Category).filter(Boolean))];
      setCategories(uniqueCategories);
      
      setReturnItems(items);
      setFilteredItems(items);
      
    } catch (error: any) {
      console.error('Error fetching return history:', error);
      Alert.alert('Error', error.message || 'Failed to load return history');
      setReturnItems([]);
      setFilteredItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // --- Load Initial Data ---
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const key = await loadUserSession();
    if (key && selectedOrgId) {
      await fetchReturnHistory(key, selectedOrgId);
    } else {
      setLoading(false);
    }
  };

  // --- Handle Organization Change ---
  const handleOrgChange = (itemValue: number) => {
    if (itemValue === selectedOrgId) return;
    
    const org = organizations.find(o => o.OrganizationId === itemValue);
    if (org) {
      console.log(`🔄 Switching organization from ${selectedOrgId} to ${itemValue}`);
      console.log(`🔑 Using API key: ${org.ApiKey.substring(0, 10)}...`);
      
      setSelectedOrgId(itemValue);
      setSelectedOrgName(org.OrganizationName || `Org ${itemValue}`);
      setApiKey(org.ApiKey);
      
      // Reset data immediately
      setReturnItems([]);
      setFilteredItems([]);
      setCategories([]);
      setSearchQuery('');
      setFilterType('All');
      setFilterCategory('All');
      
      // Fetch new data with the selected organization's API key
      fetchReturnHistory(org.ApiKey, itemValue);
    }
  };

  // --- Handle Refresh ---
  const handleRefresh = () => {
    setRefreshing(true);
    if (apiKey && selectedOrgId) {
      fetchReturnHistory(apiKey, selectedOrgId);
    } else {
      setRefreshing(false);
    }
  };

  // --- Apply Filters ---
  useEffect(() => {
    let filtered = [...returnItems];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(item =>
        item.ProductName?.toLowerCase().includes(query) ||
        item.OriginalTransactionNumber?.toLowerCase().includes(query) ||
        item.ReturnTransactionNumber?.toLowerCase().includes(query) ||
        item.CustomerName?.toLowerCase().includes(query)
      );
    }
    
    // Type filter
    if (filterType !== 'All') {
      filtered = filtered.filter(item => item.ReturnType?.toLowerCase() === filterType.toLowerCase());
    }
    
    // Category filter
    if (filterCategory !== 'All') {
      filtered = filtered.filter(item => item.Category === filterCategory);
    }
    
    setFilteredItems(filtered);
  }, [searchQuery, filterType, filterCategory, returnItems]);

  // --- Format Date ---
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      const match = dateString.match(/\/Date\((\d+)\)\//);
      if (match) {
        const date = new Date(parseInt(match[1]));
        return date.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
      return dateString;
    } catch {
      return dateString;
    }
  };

  // --- Handle Back Press ---
  const handleBackPress = () => {
    router.push('/sales_list');
  };

  // --- Render Return Item ---
  const renderReturnItem = ({ item }: { item: ReturnItem }) => {
    const isExchange = item.ReturnType?.toLowerCase() === 'exchange';
    const isReturn = item.ReturnType?.toLowerCase() === 'return';

    return (
      <View style={styles.itemCard}>
        {/* Row 1: #, Type, Date */}
        <View style={styles.row}>
          <View style={styles.rowLeft}>
            <Text style={styles.idText}>#{item.ReturnId}</Text>
            <View style={[styles.typeBadge, isExchange ? styles.exchangeBadge : styles.returnBadge]}>
              <Text style={styles.typeBadgeText}>{item.ReturnType || 'N/A'}</Text>
            </View>
          </View>
          <Text style={styles.dateText}>{formatDate(item.ReturnDate)}</Text>
        </View>

        {/* Row 2: Original Transaction */}
        <View style={styles.row}>
          <Text style={styles.labelText}>Original TX:</Text>
          <Text style={styles.valueText}>{item.OriginalTransactionNumber || 'N/A'}</Text>
        </View>

        {/* Row 3: Return Transaction */}
        <View style={styles.row}>
          <Text style={styles.labelText}>Return TX:</Text>
          <Text style={styles.valueText}>{item.ReturnTransactionNumber || 'N/A'}</Text>
        </View>

        {/* Row 4: Product & Category */}
        <View style={styles.row}>
          <Text style={styles.labelText}>Product:</Text>
          <Text style={styles.valueText}>{item.ProductName || 'N/A'}</Text>
          <Text style={styles.categoryText}>{item.Category || 'N/A'}</Text>
        </View>

        {/* Row 5: Customer */}
        <View style={styles.row}>
          <Text style={styles.labelText}>Customer:</Text>
          <Text style={styles.valueText}>{item.CustomerName || 'N/A'}</Text>
        </View>

        {/* Row 6: Qty, Unit Price, Total */}
        <View style={styles.footerRow}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Qty</Text>
            <Text style={styles.statValue}>{item.Quantity || 0}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Unit Price</Text>
            <Text style={styles.statValue}>৳{(item.UnitPrice || 0).toFixed(2)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total</Text>
            <Text style={[styles.statValue, styles.totalValue]}>৳{(item.TotalAmount || 0).toFixed(2)}</Text>
          </View>
        </View>
      </View>
    );
  };

  // --- Render Filter Modal ---
  const renderFilterModal = () => {
    return (
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Options</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Type Filter */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Transaction Type</Text>
                <View style={styles.filterOptions}>
                  {['All', 'Exchange', 'Return'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.filterOption,
                        filterType === type && styles.filterOptionActive
                      ]}
                      onPress={() => setFilterType(type)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filterType === type && styles.filterOptionTextActive
                      ]}>
                        {type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Category Filter */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterLabel}>Category</Text>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    style={[
                      styles.filterOption,
                      filterCategory === 'All' && styles.filterOptionActive
                    ]}
                    onPress={() => setFilterCategory('All')}
                  >
                    <Text style={[
                      styles.filterOptionText,
                      filterCategory === 'All' && styles.filterOptionTextActive
                    ]}>
                      All
                    </Text>
                  </TouchableOpacity>
                  {categories.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.filterOption,
                        filterCategory === cat && styles.filterOptionActive
                      ]}
                      onPress={() => setFilterCategory(cat)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        filterCategory === cat && styles.filterOptionTextActive
                      ]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.resetBtn]}
                onPress={() => {
                  setFilterType('All');
                  setFilterCategory('All');
                  setSearchQuery('');
                }}
              >
                <Text style={styles.resetBtnText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.applyBtn]}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.applyBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // --- Loading State ---
  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <Stack.Screen options={{ title: 'Return History' }} />
        <ActivityIndicator size="large" color="#28a745" />
        <Text style={styles.loadingText}>Loading Return History...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <Stack.Screen options={{ 
        title: 'Return History',
        headerBackTitle: 'Back',
        headerLeft: () => (
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Back</Text>
          </TouchableOpacity>
        ),
      }} />
      
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Return History</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.filterBtn}
              onPress={() => setShowFilterModal(true)}
            >
              <Text style={styles.filterBtnText}>⚙️ Filter</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.refreshBtnSmall}
              onPress={handleRefresh}
            >
              <Text style={styles.refreshBtnSmallText}>↻</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Organization Picker - Shows Organization Name */}
        {organizations.length > 0 && (
          <View style={styles.orgPickerContainer}>
            <Picker
              selectedValue={selectedOrgId !== null ? selectedOrgId : organizations[0]?.OrganizationId}
              onValueChange={handleOrgChange}
              style={styles.orgPicker}
              dropdownIconColor="#28a745"
              mode="dropdown"
            >
              {organizations.map((org) => (
                <Picker.Item
                  key={org.OrganizationId}
                  label={org.OrganizationName || `Organization ${org.OrganizationId}`}
                  value={org.OrganizationId}
                />
              ))}
            </Picker>
          </View>
        )}

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search by product, transaction or customer..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Active Filters */}
        {(filterType !== 'All' || filterCategory !== 'All' || searchQuery) && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.activeFilters}>
            {searchQuery && (
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>🔍 {searchQuery}</Text>
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={styles.filterTagRemove}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            {filterType !== 'All' && (
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>Type: {filterType}</Text>
                <TouchableOpacity onPress={() => setFilterType('All')}>
                  <Text style={styles.filterTagRemove}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
            {filterCategory !== 'All' && (
              <View style={styles.filterTag}>
                <Text style={styles.filterTagText}>Category: {filterCategory}</Text>
                <TouchableOpacity onPress={() => setFilterCategory('All')}>
                  <Text style={styles.filterTagRemove}>✕</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}

        {/* Results Count */}
        <View style={styles.resultsCount}>
          <Text style={styles.resultsCountText}>
            Showing {filteredItems.length} of {returnItems.length} returns
          </Text>
        </View>
      </View>

      {/* Return List */}
      {filteredItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>No Return History Found</Text>
          <Text style={styles.emptySubText}>
            {returnItems.length === 0 
              ? 'No return or exchange transactions available for this organization.'
              : 'Try adjusting your filters or search query'}
          </Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
            <Text style={styles.refreshBtnText}>↻ Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item, index) => item.ReturnId ? item.ReturnId.toString() : index.toString()}
          renderItem={renderReturnItem}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#28a745']}
              tintColor="#28a745"
            />
          }
        />
      )}

      {/* Filter Modal */}
      {renderFilterModal()}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#64748b',
    fontSize: 14,
    fontWeight: '600',
  },

  // Header
  headerContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterBtnText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  refreshBtnSmall: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  refreshBtnSmallText: {
    fontSize: 16,
    color: '#475569',
  },

  // Back Button
  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  backButtonText: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '600',
  },

  // Organization Picker
  orgPickerContainer: {
    backgroundColor: '#ffffff',
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  orgPicker: {
    height: 50,
    width: '100%',
    color: '#1e293b',
  },

  // Search
  searchContainer: {
    marginTop: 8,
  },
  searchInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1e293b',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },

  // Active Filters
  activeFilters: {
    flexDirection: 'row',
    paddingVertical: 8,
    maxHeight: 44,
  },
  filterTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f7e6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#b7e6b7',
  },
  filterTagText: {
    fontSize: 11,
    color: '#1e7e34',
    marginRight: 4,
  },
  filterTagRemove: {
    fontSize: 12,
    color: '#1e7e34',
    fontWeight: '700',
    paddingHorizontal: 2,
  },

  // Results Count
  resultsCount: {
    paddingTop: 6,
    paddingBottom: 4,
  },
  resultsCountText: {
    fontSize: 11,
    color: '#64748b',
  },

  // List
  listContainer: {
    padding: 12,
    paddingBottom: 20,
  },

  // Item Card - Table Design
  itemCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    flexWrap: 'wrap',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  idText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748b',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 4,
  },
  exchangeBadge: {
    backgroundColor: '#fff4e0',
  },
  returnBadge: {
    backgroundColor: '#fee9e9',
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1e293b',
  },
  dateText: {
    fontSize: 11,
    color: '#94a3b8',
    marginLeft: 'auto',
  },
  labelText: {
    fontSize: 12,
    color: '#94a3b8',
    width: 100,
  },
  valueText: {
    fontSize: 12,
    color: '#1e293b',
    fontWeight: '500',
    flex: 1,
  },
  categoryText: {
    fontSize: 11,
    color: '#64748b',
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 2,
  },
  totalValue: {
    color: '#28a745',
  },

  // Empty State
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    flex: 1,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  emptySubText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 4,
  },
  refreshBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#28a745',
    borderRadius: 8,
  },
  refreshBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalClose: {
    fontSize: 20,
    color: '#94a3b8',
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },

  // Filter
  filterGroup: {
    marginBottom: 20,
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 10,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterOptionActive: {
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  filterOptionText: {
    fontSize: 13,
    color: '#64748b',
  },
  filterOptionTextActive: {
    color: '#ffffff',
  },

  // Modal Buttons
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetBtn: {
    backgroundColor: '#f1f5f9',
  },
  resetBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  applyBtn: {
    backgroundColor: '#28a745',
  },
  applyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
});