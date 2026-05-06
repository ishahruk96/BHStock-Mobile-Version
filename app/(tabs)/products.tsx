import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
  Modal,
  ScrollView,
  Dimensions
} from "react-native";
import { ThemedText } from "@/components/themed-text";
import { MaterialIcons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

interface Product {
  ProductId: number;
  ProductName: string;
  Category: string;
  UnitPrice: number;
  SalesValue: number;
  ProfitPerUnit: number;
  ProfitPercentage: number;
  CurrentStock: number;
  ReorderLevel: number;
  Status: string;
  UnitType: string;
  OrganizationId: number;
}

const API_KEY = "3A734AC6-A521-4192-984D-08D082B83456";
const API_URL = "http://devmystock.byteheart.com/Products/getallproduct";

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [statuses] = useState<string[]>(["Available", "Low Stock", "Out of Stock"]);

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [searchQuery, selectedCategory, selectedStatus, products]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: Failed to fetch products`);
      }
      
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setProducts(data);
        setFilteredProducts(data);
        const uniqueCategories = [...new Set(data.map((p: Product) => p.Category).filter(Boolean))];
        setCategories(uniqueCategories);
      } else {
        throw new Error("Invalid response format");
      }
      
    } catch (err: any) {
      setError(err.message);
      console.error("Fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  };

  const applyFilters = () => {
    let filtered = [...products];
    
    if (searchQuery) {
      filtered = filtered.filter(p =>
        p.ProductName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.Category?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedCategory) {
      filtered = filtered.filter(p => p.Category === selectedCategory);
    }
    
    if (selectedStatus) {
      filtered = filtered.filter(p => p.Status === selectedStatus);
    }
    
    setFilteredProducts(filtered);
  };

  const resetFilters = () => {
    setSearchQuery("");
    setSelectedCategory("");
    setSelectedStatus("");
    setShowFilterModal(false);
  };

  const calculateTotalProfit = (item: Product) => {
    return item.ProfitPerUnit * item.CurrentStock;
  };

  const handleEdit = (product: Product) => {
    Alert.alert("Edit Product", `Editing ${product.ProductName}`);
  };

  const handleDelete = (product: Product) => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete ${product.ProductName}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: () => Alert.alert("Deleted", `${product.ProductName} has been deleted`)
        }
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case "Available": return { bg: '#d4edda', text: '#155724', icon: '#28a745' };
      case "Low Stock": return { bg: '#fff3cd', text: '#856404', icon: '#ffc107' };
      case "Out of Stock": return { bg: '#f8d7da', text: '#721c24', icon: '#dc3545' };
      default: return { bg: '#e9ecef', text: '#495057', icon: '#6c757d' };
    }
  };

  const ProductCard = ({ item }: { item: Product }) => {
    const totalProfit = calculateTotalProfit(item);
    const isLowStock = item.CurrentStock <= item.ReorderLevel;
    const stockStatus = isLowStock && item.CurrentStock > 0 ? "Low Stock" : 
                       item.CurrentStock === 0 ? "Out of Stock" : "Available";
    const statusColor = getStatusColor(stockStatus);
    const profitPercentage = item.CurrentStock > 0 ? ((item.ProfitPerUnit / item.UnitPrice) * 100).toFixed(1) : "0";

    return (
      <TouchableOpacity 
        activeOpacity={0.9}
        onPress={() => handleEdit(item)}
      >
        <View style={styles.card}>
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.productInfo}>
              <View style={styles.categoryWrapper}>
                <View style={styles.categoryIcon}>
                  <MaterialIcons name="category" size={12} color="#fff" />
                </View>
                <ThemedText style={styles.categoryText}>{item.Category}</ThemedText>
              </View>
              <ThemedText style={styles.productName}>{item.ProductName}</ThemedText>
              {item.UnitType && (
                <View style={styles.unitInfo}>
                  <MaterialIcons name="straighten" size={12} color="#999" />
                  <ThemedText style={styles.unitText}>Unit: {item.UnitType}</ThemedText>
                </View>
              )}
            </View>
            
            <View style={[styles.statusContainer, { backgroundColor: statusColor.bg }]}>
              <MaterialIcons name="circle" size={8} color={statusColor.icon} />
              <ThemedText style={[styles.statusText, { color: statusColor.text }]}>
                {stockStatus}
              </ThemedText>
            </View>
          </View>

          {/* Stock Info with Progress Bar */}
          <View style={styles.stockSection}>
            <View style={styles.stockHeader}>
              <View style={styles.stockLabel}>
                <MaterialIcons name="inventory" size={16} color="#28a745" />
                <ThemedText style={styles.stockTitle}>Current Stock</ThemedText>
              </View>
              <ThemedText style={styles.stockValue}>{item.CurrentStock.toFixed(2)}</ThemedText>
            </View>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${Math.min((item.CurrentStock / (item.ReorderLevel * 2)) * 100, 100)}%`,
                    backgroundColor: item.CurrentStock <= item.ReorderLevel ? '#ffc107' : '#28a745'
                  }
                ]} 
              />
            </View>
            {item.CurrentStock <= item.ReorderLevel && item.CurrentStock > 0 && (
              <View style={styles.reorderAlert}>
                <MaterialIcons name="warning" size={12} color="#ff9800" />
                <ThemedText style={styles.reorderText}>Reorder at {item.ReorderLevel} units</ThemedText>
              </View>
            )}
          </View>

          {/* Price Grid */}
          <View style={styles.priceGrid}>
            <View style={styles.priceCard}>
              {/* <MaterialIcons name="shopping-cart" size={18} color="#6c757d" /> */}
              <ThemedText style={styles.priceLabel}>Buy Price</ThemedText>
              <ThemedText style={styles.priceValue}>৳{item.UnitPrice.toFixed(2)}</ThemedText>
            </View>
            
            <View style={styles.priceDivider} />
            
            <View style={styles.priceCard}>
              {/* <MaterialIcons name="attach-money" size={18} color="#28a745" /> */}
              <ThemedText style={styles.priceLabel}>Sale Price</ThemedText>
              <ThemedText style={[styles.priceValue, { color: '#28a745' }]}>৳{item.SalesValue.toFixed(2)}</ThemedText>
            </View>
          </View>

          {/* Profit Details */}
          <View style={styles.profitContainer}>
            <View style={styles.profitLeft}>
              <View style={styles.profitIconCircle}>
                <MaterialIcons name="trending-up" size={20} color="#28a745" />
              </View>
              <View>
                <ThemedText style={styles.profitTitle}>Profit Margin</ThemedText>
                <ThemedText style={styles.profitPercent}>{profitPercentage}%</ThemedText>
              </View>
            </View>
            
            <View style={styles.profitDivider} />
            
            <View style={styles.profitRight}>
              <View>
                <ThemedText style={styles.profitSubLabel}>Per Unit</ThemedText>
                <ThemedText style={styles.profitAmount}>+৳{item.ProfitPerUnit.toFixed(2)}</ThemedText>
              </View>
              <View>
                <ThemedText style={styles.profitSubLabel}>Total Profit</ThemedText>
                <ThemedText style={styles.totalProfitAmount}>+৳{totalProfit.toFixed(2)}</ThemedText>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.editBtn]} 
              onPress={() => handleEdit(item)}
            >
              <MaterialIcons name="edit" size={16} color="#fff" />
              <ThemedText style={styles.actionBtnText}>Edit</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionBtn, styles.deleteBtn]} 
              onPress={() => handleDelete(item)}
            >
              <MaterialIcons name="delete" size={16} color="#fff" />
              <ThemedText style={styles.actionBtnText}>Delete</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const FilterModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={showFilterModal}
      onRequestClose={() => setShowFilterModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <ThemedText style={styles.modalTitle}>Filter Products</ThemedText>
            <TouchableOpacity onPress={() => setShowFilterModal(false)}>
              <MaterialIcons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.filterGroup}>
              {/* <ThemedText style={styles.filterLabel}>Search Product</ThemedText>
              <View style={styles.searchInputContainer}>
                <MaterialIcons name="search" size={20} color="#999" />
                <TextInput 
                  style={styles.filterInput}
                  placeholder="Enter product name..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#999"
                />
              </View> */}
            </View>

            <View style={styles.filterGroup}>
              <ThemedText style={styles.filterLabel}>Category</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <TouchableOpacity
                  style={[styles.chip, !selectedCategory && styles.chipActive]}
                  onPress={() => setSelectedCategory("")}
                >
                  <ThemedText style={[styles.chipText, !selectedCategory && styles.chipTextActive]}>
                    All
                  </ThemedText>
                </TouchableOpacity>
                {categories.map((cat, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.chip, selectedCategory === cat && styles.chipActive]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <ThemedText style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
                      {cat}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <View style={styles.filterGroup}>
              <ThemedText style={styles.filterLabel}>Status</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
                <TouchableOpacity
                  style={[styles.chip, !selectedStatus && styles.chipActive]}
                  onPress={() => setSelectedStatus("")}
                >
                  <ThemedText style={[styles.chipText, !selectedStatus && styles.chipTextActive]}>
                    All
                  </ThemedText>
                </TouchableOpacity>
                {statuses.map((status, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[styles.chip, selectedStatus === status && styles.chipActive]}
                    onPress={() => setSelectedStatus(status)}
                  >
                    <ThemedText style={[styles.chipText, selectedStatus === status && styles.chipTextActive]}>
                      {status}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </ScrollView>

          <View style={styles.modalButtons}>
            <TouchableOpacity style={[styles.modalBtn, styles.resetModalBtn]} onPress={resetFilters}>
              <MaterialIcons name="refresh" size={20} color="#fff" />
              <ThemedText style={styles.modalBtnText}>Reset All</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.modalBtn, styles.applyModalBtn]} 
              onPress={() => {
                applyFilters();
                setShowFilterModal(false);
              }}
            >
              <MaterialIcons name="check" size={20} color="#fff" />
              <ThemedText style={styles.modalBtnText}>Apply Filters</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#28a745" />
        <ThemedText style={styles.loadingText}>Loading Products...</ThemedText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <MaterialIcons name="error-outline" size={50} color="#dc3545" />
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchProducts}>
          <ThemedText style={styles.retryBtnText}>Retry</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <ThemedText style={styles.headerTitle}>Products</ThemedText>
            <ThemedText style={styles.headerSubtitle}>
              {filteredProducts.length} {filteredProducts.length === 1 ? 'Product' : 'Products'} Available
            </ThemedText>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.filterButton} 
              onPress={() => setShowFilterModal(true)}
            >
              <MaterialIcons name="filter-list" size={22} color="#28a745" />
              {(searchQuery || selectedCategory || selectedStatus) && (
                <View style={styles.activeDot} />
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.addButton}>
              <MaterialIcons name="add" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {(searchQuery || selectedCategory || selectedStatus) && (
        <View style={styles.activeFiltersBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.activeFiltersContainer}>
              {searchQuery && (
                <View style={styles.filterChip}>
                  <ThemedText style={styles.filterChipText}>Search: {searchQuery}</ThemedText>
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <MaterialIcons name="close" size={14} color="#666" />
                  </TouchableOpacity>
                </View>
              )}
              {selectedCategory && (
                <View style={styles.filterChip}>
                  <ThemedText style={styles.filterChipText}>Category: {selectedCategory}</ThemedText>
                  <TouchableOpacity onPress={() => setSelectedCategory("")}>
                    <MaterialIcons name="close" size={14} color="#666" />
                  </TouchableOpacity>
                </View>
              )}
              {selectedStatus && (
                <View style={styles.filterChip}>
                  <ThemedText style={styles.filterChipText}>Status: {selectedStatus}</ThemedText>
                  <TouchableOpacity onPress={() => setSelectedStatus("")}>
                    <MaterialIcons name="close" size={14} color="#666" />
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity onPress={resetFilters} style={styles.clearAllChip}>
                <MaterialIcons name="clear" size={14} color="#dc3545" />
                <ThemedText style={styles.clearAllText}>Clear All</ThemedText>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      )}

      <View style={styles.searchBar}>
        <MaterialIcons name="search" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor="#999"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <MaterialIcons name="close" size={20} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={filteredProducts}
        renderItem={({ item }) => <ProductCard item={item} />}
        keyExtractor={(item) => item.ProductId.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#28a745"]} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="inbox" size={60} color="#ccc" />
            <ThemedText style={styles.emptyText}>No products found</ThemedText>
            <TouchableOpacity style={styles.resetEmptyBtn} onPress={resetFilters}>
              <ThemedText style={styles.resetEmptyBtnText}>Reset Filters</ThemedText>
            </TouchableOpacity>
          </View>
        }
      />

      <FilterModal />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#f8f9fa' },
  
  header: { paddingTop: Platform.OS === 'ios' ? 50 : 20, paddingBottom: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#333' },
  headerSubtitle: { fontSize: 12, color: '#666', marginTop: 2 },
  headerActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  filterButton: { padding: 8, backgroundColor: '#f0f0f0', borderRadius: 10, position: 'relative' },
  activeDot: { position: 'absolute', top: 4, right: 4, width: 8, height: 8, borderRadius: 4, backgroundColor: '#dc3545' },
  addButton: { backgroundColor: '#28a745', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#28a745', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  
  activeFiltersBar: { paddingVertical: 8, paddingHorizontal: 16, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  activeFiltersContainer: { flexDirection: 'row', gap: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e9ecef', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 6 },
  filterChipText: { fontSize: 12, color: '#495057' },
  clearAllChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 6, borderWidth: 1, borderColor: '#dc3545' },
  clearAllText: { fontSize: 11, color: '#dc3545' },
  
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', margin: 16, marginTop: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 6, color: '#333' },
  
  listContainer: { padding: 12, paddingTop: 0, paddingBottom: 20 },
  
  card: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 4 },
  
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  productInfo: { flex: 1, marginRight: 12 },
  categoryWrapper: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  categoryIcon: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#28a745', justifyContent: 'center', alignItems: 'center' },
  categoryText: { fontSize: 11, color: '#28a745', fontWeight: '600', textTransform: 'uppercase' },
  productName: { fontSize: 17, fontWeight: 'bold', color: '#333', marginBottom: 6, lineHeight: 22 },
  unitInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  unitText: { fontSize: 11, color: '#999' },
  
  statusContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: '600' },
  
  stockSection: { marginBottom: 16 },
  stockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  stockLabel: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  stockTitle: { fontSize: 12, color: '#666' },
  stockValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  progressBar: { height: 6, backgroundColor: '#e9ecef', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  reorderAlert: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, backgroundColor: '#fff3cd', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' },
  reorderText: { fontSize: 10, color: '#ff9800' },
  
  priceGrid: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginBottom: 16, paddingVertical: 12, backgroundColor: '#f8f9fa', borderRadius: 12 },
  priceCard: { flex: 1, alignItems: 'center', gap: 6 },
  priceLabel: { fontSize: 11, color: '#666' },
  priceValue: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  priceDivider: { width: 1, height: 30, backgroundColor: '#dee2e6' },
  
  profitContainer: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 16, backgroundColor: '#f8f9fa' },
  profitLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  profitIconCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#d4edda', justifyContent: 'center', alignItems: 'center' },
  profitTitle: { fontSize: 11, color: '#666' },
  profitPercent: { fontSize: 18, fontWeight: 'bold', color: '#28a745' },
  profitDivider: { width: 1, height: 40, backgroundColor: '#dee2e6', marginHorizontal: 12 },
  profitRight: { flexDirection: 'row', flex: 1.5, justifyContent: 'space-around' },
  profitSubLabel: { fontSize: 10, color: '#999' },
  profitAmount: { fontSize: 14, fontWeight: 'bold', color: '#28a745' },
  totalProfitAmount: { fontSize: 14, fontWeight: 'bold', color: '#ff9800' },
  
  actionButtons: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  editBtn: { backgroundColor: '#007bff' },
  deleteBtn: { backgroundColor: '#dc3545' },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  
  filterGroup: { marginBottom: 24 },
  filterLabel: { fontSize: 14, fontWeight: '500', marginBottom: 10, color: '#555' },
  searchInputContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ddd', borderRadius: 12, paddingHorizontal: 12, gap: 8, backgroundColor: '#fafafa' },
  filterInput: { flex: 1, paddingVertical: 12, fontSize: 14 },
  chipScroll: { flexDirection: 'row' },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', marginRight: 8, borderWidth: 1, borderColor: '#e0e0e0' },
  chipActive: { backgroundColor: '#28a745', borderColor: '#28a745' },
  chipText: { fontSize: 13, color: '#666' },
  chipTextActive: { color: '#fff' },
  
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, gap: 8 },
  resetModalBtn: { backgroundColor: '#6c757d' },
  applyModalBtn: { backgroundColor: '#28a745' },
  modalBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  
  loadingText: { marginTop: 12, fontSize: 14, color: '#666' },
  errorText: { fontSize: 14, color: '#dc3545', textAlign: 'center', marginBottom: 8, marginTop: 12 },
  retryBtn: { marginTop: 16, backgroundColor: '#28a745', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  retryBtnText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  
  emptyContainer: { alignItems: 'center', paddingTop: 60, paddingBottom: 40 },
  emptyText: { fontSize: 16, color: '#999', marginTop: 12 },
  resetEmptyBtn: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: '#28a745', borderRadius: 10 },
  resetEmptyBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' }
});