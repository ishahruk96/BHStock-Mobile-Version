// product_management.tsx - Complete working solution
import { ThemedText } from "@/components/themed-text";
import { useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";

const { width, height } = Dimensions.get("window");

// API URLs
const PRODUCTS_API_URL = "http://devmystock.byteheart.com/Products/getallproduct";
const ORG_LIST_URL = "http://devmystock.byteheart.com/Dashboard/GetAllOrganization";
const DELETE_PRODUCT_API_URL = "http://devmystock.byteheart.com/Products/Delete";
const UNIT_TYPES_API_URL = "http://devmystock.byteheart.com/Products/GetUnitTypes";
const CREATE_PRODUCT_API_URL = "http://devmystock.byteheart.com/Products/Create";
const UPDATE_PRODUCT_API_URL = "http://devmystock.byteheart.com/Products/Edit";
const GET_PRODUCT_BY_ID_URL = "http://devmystock.byteheart.com/Products/getproductbyid";

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

interface Organization {
  OrganizationId: number;
  ApiKey: string;
  OrganizationName?: string;
  name?: string;
}

interface UnitType {
  UnitTypeId: number;
  UnitTypeName: string;
  Description?: string;
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

// ─── Helper Functions ─────────────────────────────────────────

const getStatusStyle = (status: string) => {
  if (!status) return { bg: "#f0f0f0", text: "#666" };
  switch (status.toLowerCase()) {
    case "available":
      return { bg: "#d4edda", text: "#155724" };
    case "low stock":
      return { bg: "#fff3cd", text: "#856404" };
    case "out of stock":
      return { bg: "#f8d7da", text: "#721c24" };
    default:
      return { bg: "#f0f0f0", text: "#666" };
  }
};

const getStockStatus = (currentStock: number, reorderLevel: number): string => {
  if (currentStock <= 0) return "Out of Stock";
  if (currentStock <= reorderLevel) return "Low Stock";
  return "Available";
};

// ─── Product Form Modal ────────────────────────────────────────────────

interface ProductFormModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
  mode: 'create' | 'edit';
  product?: Product | null;
  organizationId: number;
  organizationName: string;
  apiKey: string;
}

const ProductFormModal = ({ 
  visible, 
  onClose, 
  onSuccess, 
  mode, 
  product, 
  organizationId, 
  organizationName, 
  apiKey 
}: ProductFormModalProps) => {
  const [loading, setLoading] = useState(false);
  const [unitTypes, setUnitTypes] = useState<UnitType[]>([]);
  const [loadingUnitTypes, setLoadingUnitTypes] = useState(true);
  
  // Form fields
  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [buyPrice, setBuyPrice] = useState("");
  const [salesPrice, setSalesPrice] = useState("");
  const [stock, setStock] = useState("");
  const [reorderLevel, setReorderLevel] = useState("");
  const [selectedUnitType, setSelectedUnitType] = useState("");
  
  // Calculated fields
  const [profitPerItem, setProfitPerItem] = useState(0);
  const [profitPercentage, setProfitPercentage] = useState(0);

  // Load unit types when modal opens
  useEffect(() => {
    if (visible && apiKey) {
      loadUnitTypes();
    }
  }, [visible, apiKey]);

  // Load product data when in edit mode
  useEffect(() => {
    if (visible && mode === 'edit' && product && apiKey && organizationId) {
      loadProductData();
    } else if (visible && mode === 'create') {
      resetForm();
    }
  }, [visible, mode, product, apiKey, organizationId]);

  // Calculate profits
  useEffect(() => {
    calculateProfits();
  }, [buyPrice, salesPrice]);

  const loadUnitTypes = async () => {
    try {
      setLoadingUnitTypes(true);
      console.log("Fetching unit types with API Key:", apiKey.substring(0, 20) + "...");
      
      const response = await fetch(UNIT_TYPES_API_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log("Unit types response:", data);
      
      let unitTypesArray: UnitType[] = [];

      // Check if data is an array of strings (like ["Bag", "Bottle", "Box"])
      if (Array.isArray(data)) {
        if (data.length > 0 && typeof data[0] === 'string') {
          // Convert string array to UnitType objects
          unitTypesArray = data.map((unitName: string, index: number) => ({
            UnitTypeId: index + 1,
            UnitTypeName: unitName
          }));
        } else if (typeof data[0] === 'object') {
          unitTypesArray = data;
        }
      } 
      else if (data.data && Array.isArray(data.data)) {
        const responseData = data.data;
        if (responseData.length > 0 && typeof responseData[0] === 'string') {
          unitTypesArray = responseData.map((unitName: string, index: number) => ({
            UnitTypeId: index + 1,
            UnitTypeName: unitName
          }));
        } else {
          unitTypesArray = responseData;
        }
      } 
      else if (data.result && Array.isArray(data.result)) {
        const resultData = data.result;
        if (resultData.length > 0 && typeof resultData[0] === 'string') {
          unitTypesArray = resultData.map((unitName: string, index: number) => ({
            UnitTypeId: index + 1,
            UnitTypeName: unitName
          }));
        } else {
          unitTypesArray = resultData;
        }
      }

      if (unitTypesArray.length > 0) {
        setUnitTypes(unitTypesArray);
        if (!selectedUnitType && unitTypesArray[0]) {
          setSelectedUnitType(unitTypesArray[0].UnitTypeName);
        }
        console.log("✅ Unit types loaded:", unitTypesArray.length);
      } else {
        console.log("⚠️ No unit types found from API");
        setUnitTypes([]);
        setSelectedUnitType("");
      }
    } catch (error) {
      console.error("Error loading unit types:", error);
      setUnitTypes([]);
      setSelectedUnitType("");
    } finally {
      setLoadingUnitTypes(false);
    }
  };

  const loadProductData = async () => {
    if (!product || !apiKey || !organizationId) return;
    
    try {
      setLoading(true);
      const url = `${GET_PRODUCT_BY_ID_URL}?id=${product.ProductId}&organizationId=${organizationId}`;
      console.log("Loading product from:", url);
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const productData = data.data || data;
      
      setProductName(productData.ProductName || "");
      setCategory(productData.Category || "");
      setBuyPrice(productData.UnitPrice?.toString() || "");
      setSalesPrice(productData.SalesValue?.toString() || "");
      setStock(productData.CurrentStock?.toString() || "");
      setReorderLevel(productData.ReorderLevel?.toString() || "");
      setSelectedUnitType(productData.UnitType || "");
    } catch (error) {
      console.error("Error loading product:", error);
      Alert.alert("Error", "Failed to load product data");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setProductName("");
    setCategory("");
    setBuyPrice("");
    setSalesPrice("");
    setStock("");
    setReorderLevel("");
    setProfitPerItem(0);
    setProfitPercentage(0);
    setSelectedUnitType("");
  };

  const calculateProfits = () => {
    const buy = parseFloat(buyPrice) || 0;
    const sell = parseFloat(salesPrice) || 0;
    
    const profit = sell - buy;
    setProfitPerItem(profit);
    
    const percentage = buy > 0 ? (profit / buy) * 100 : 0;
    setProfitPercentage(percentage);
  };

  const validateForm = (): boolean => {
    if (!productName.trim()) {
      Alert.alert("Validation Error", "Product name is required");
      return false;
    }
    if (!category.trim()) {
      Alert.alert("Validation Error", "Category is required");
      return false;
    }
    if (!buyPrice || parseFloat(buyPrice) <= 0) {
      Alert.alert("Validation Error", "Valid buy price is required");
      return false;
    }
    if (!salesPrice || parseFloat(salesPrice) <= 0) {
      Alert.alert("Validation Error", "Valid sales price is required");
      return false;
    }
    if (parseFloat(salesPrice) < parseFloat(buyPrice)) {
      Alert.alert("Validation Error", "Sales price cannot be less than buy price");
      return false;
    }
    if (stock === "" || parseInt(stock) < 0) {
      Alert.alert("Validation Error", "Valid stock quantity is required");
      return false;
    }
    if (reorderLevel === "" || parseInt(reorderLevel) < 0) {
      Alert.alert("Validation Error", "Valid reorder level is required");
      return false;
    }
    if (!selectedUnitType) {
      Alert.alert("Validation Error", "Unit type is required");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    if (!apiKey) {
      Alert.alert("Error", "Authentication key not found");
      return;
    }
    if (!organizationId) {
      Alert.alert("Error", "Organization ID not found");
      return;
    }

    setLoading(true);

    // Calculate profit values
    const buyPriceNum = parseFloat(buyPrice) || 0;
    const salesPriceNum = parseFloat(salesPrice) || 0;
    const profitPerUnit = salesPriceNum - buyPriceNum;
    const profitPercentageValue = buyPriceNum > 0 ? (profitPerUnit / buyPriceNum) * 100 : 0;
    const currentStockNum = parseInt(stock) || 0;
    const reorderLevelNum = parseInt(reorderLevel) || 0;
    
    // Determine status based on stock
    let status = "Available";
    if (currentStockNum <= 0) status = "Out of Stock";
    else if (currentStockNum <= reorderLevelNum) status = "Low Stock";

    const productData = {
      ProductName: productName.trim(),
      Category: category.trim(),
      UnitPrice: buyPriceNum,
      SalesValue: salesPriceNum,
      ProfitPerUnit: profitPerUnit,
      ProfitPercentage: profitPercentageValue,
      CurrentStock: currentStockNum,
      ReorderLevel: reorderLevelNum,
      UnitType: selectedUnitType,
      Status: status,
      OrganizationId: organizationId,
    };

    // For edit mode, add ProductId
    if (mode === 'edit' && product) {
      Object.assign(productData, { ProductId: product.ProductId });
    }

    try {
      let url = '';
      let method = 'POST';
      
      if (mode === 'edit' && product) {
        url = `${UPDATE_PRODUCT_API_URL}/${product.ProductId}`;
      } else {
        url = CREATE_PRODUCT_API_URL;
      }

      console.log("=========================================");
      console.log(`${mode.toUpperCase()} PRODUCT REQUEST:`);
      console.log("URL:", url);
      console.log("Method:", method);
      console.log("Organization ID:", organizationId);
      console.log("API Key:", apiKey.substring(0, 20) + "...");
      console.log("Product Data:", JSON.stringify(productData, null, 2));
      console.log("=========================================");

      const response = await fetch(url, {
        method: method,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(productData),
      });

      console.log("Response Status:", response.status);
      
      // Get the response text
      const responseText = await response.text();
      console.log("Raw Response:", responseText);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`);
      }

      // Try to parse JSON if response is not empty
      let result;
      if (responseText && responseText.trim()) {
        try {
          result = JSON.parse(responseText);
          console.log("Parsed Response:", result);
        } catch (e) {
          console.log("Response is not JSON, treating as success");
          result = { message: responseText };
        }
      }
      
      Alert.alert(
        "Success",
        mode === 'edit' ? "Product updated successfully!" : "Product created successfully!",
        [{ text: "OK", onPress: () => {
          onSuccess();
          onClose();
        }}]
      );
    } catch (error: any) {
      console.error("Error saving product:", error);
      Alert.alert("Error", `Failed to ${mode === 'edit' ? "update" : "create"} product: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStatus = () => {
    const currentStock = parseInt(stock) || 0;
    const reorder = parseInt(reorderLevel) || 0;
    
    if (currentStock <= 0) return "Out of Stock";
    if (currentStock <= reorder) return "Low Stock";
    return "Available";
  };

  const getStatusColor = () => {
    const status = getCurrentStatus();
    switch (status) {
      case "Available": return "#d4edda";
      case "Low Stock": return "#fff3cd";
      case "Out of Stock": return "#f8d7da";
      default: return "#f0f0f0";
    }
  };

  const getStatusTextColor = () => {
    const status = getCurrentStatus();
    switch (status) {
      case "Available": return "#155724";
      case "Low Stock": return "#856404";
      case "Out of Stock": return "#721c24";
      default: return "#666";
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.formModalContainer}>
          <View style={styles.formModalHeader}>
            <ThemedText style={styles.formModalTitle}>
              {mode === 'edit' ? 'Edit Product' : 'Create New Product'}
            </ThemedText>
            <TouchableOpacity onPress={onClose} style={styles.formModalClose}>
              <ThemedText style={styles.formModalCloseText}>✕</ThemedText>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formModalBody} showsVerticalScrollIndicator={false}>
            <View style={styles.orgInfoBox}>
              <ThemedText style={styles.orgInfoText}>
                Organization: {organizationName}
              </ThemedText>
            </View>

            {loadingUnitTypes ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#007bff" />
                <ThemedText style={styles.loadingText}>Loading unit types...</ThemedText>
              </View>
            ) : (
              <>
                {/* Product Name */}
                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Product Name *</ThemedText>
                  <TextInput 
                    style={styles.input} 
                    value={productName} 
                    onChangeText={setProductName} 
                    placeholder="Enter product name" 
                    placeholderTextColor="#999" 
                  />
                </View>

                {/* Category */}
                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Category *</ThemedText>
                  <TextInput 
                    style={styles.input} 
                    value={category} 
                    onChangeText={setCategory} 
                    placeholder="Enter category" 
                    placeholderTextColor="#999" 
                  />
                </View>

                {/* Buy Price */}
                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Buy Price (৳) *</ThemedText>
                  <TextInput 
                    style={styles.input} 
                    value={buyPrice} 
                    onChangeText={setBuyPrice} 
                    placeholder="0.00" 
                    keyboardType="numeric" 
                    placeholderTextColor="#999" 
                  />
                </View>

                {/* Unit Type */}
                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Unit Type *</ThemedText>
                  <View style={styles.pickerContainer}>
                    {unitTypes.length > 0 ? (
                      <Picker 
                        selectedValue={selectedUnitType} 
                        onValueChange={(itemValue) => setSelectedUnitType(itemValue)} 
                        style={styles.picker}
                        dropdownIconColor="#007bff"
                      >
                        <Picker.Item label="Select Unit Type" value="" />
                        {unitTypes.map((unit, index) => (
                          <Picker.Item 
                            key={unit.UnitTypeId || index} 
                            label={unit.UnitTypeName} 
                            value={unit.UnitTypeName} 
                          />
                        ))}
                      </Picker>
                    ) : (
                      <View style={styles.emptyPicker}>
                        <ThemedText style={styles.emptyPickerText}>
                          {loadingUnitTypes ? "Loading unit types..." : "No unit types available"}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                </View>

                {/* Sales Price */}
                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Sales Price (৳) *</ThemedText>
                  <TextInput 
                    style={styles.input} 
                    value={salesPrice} 
                    onChangeText={setSalesPrice} 
                    placeholder="0.00" 
                    keyboardType="numeric" 
                    placeholderTextColor="#999" 
                  />
                </View>

                {/* Current Stock */}
                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Current Stock *</ThemedText>
                  <TextInput 
                    style={styles.input} 
                    value={stock} 
                    onChangeText={setStock} 
                    placeholder="0" 
                    keyboardType="numeric" 
                    placeholderTextColor="#999" 
                  />
                </View>

                {/* Profit Information */}
                {(profitPerItem !== 0 || profitPercentage !== 0) && (
                  <View style={styles.profitContainer}>
                    <View style={styles.profitBox}>
                      <ThemedText style={styles.profitLabel}>Profit Per Item</ThemedText>
                      <ThemedText style={styles.profitValue}>৳ {profitPerItem.toFixed(2)}</ThemedText>
                    </View>
                    <View style={styles.profitBox}>
                      <ThemedText style={styles.profitLabel}>Profit Percentage</ThemedText>
                      <ThemedText style={styles.profitValue}>{profitPercentage.toFixed(2)}%</ThemedText>
                    </View>
                  </View>
                )}

                {/* Reorder Level */}
                <View style={styles.formGroup}>
                  <ThemedText style={styles.label}>Reorder Level *</ThemedText>
                  <TextInput 
                    style={styles.input} 
                    value={reorderLevel} 
                    onChangeText={setReorderLevel} 
                    placeholder="0" 
                    keyboardType="numeric" 
                    placeholderTextColor="#999" 
                  />
                </View>

                {/* Status */}
                {stock !== "" && reorderLevel !== "" && (
                  <View style={styles.statusContainer}>
                    <ThemedText style={styles.statusLabel}>Current Status:</ThemedText>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
                      <ThemedText style={[styles.statusText, { color: getStatusTextColor() }]}>
                        {getCurrentStatus()}
                      </ThemedText>
                    </View>
                  </View>
                )}

                {/* Submit Button */}
                <TouchableOpacity 
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
                  onPress={handleSubmit} 
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <ThemedText style={styles.submitButtonText}>
                      {mode === 'edit' ? 'Update Product' : 'Create Product'}
                    </ThemedText>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ─── Filter Modal ────────────────────────────────────────────────

interface FilterModalProps {
  visible: boolean;
  onClose: () => void;
  categories: string[];
  tempSelectedCategory: string;
  setTempSelectedCategory: (v: string) => void;
  tempSelectedStatus: string;
  setTempSelectedStatus: (v: string) => void;
  onReset: () => void;
  onShowAll: () => void;
  onApply: () => void;
}

const FilterModal = ({
  visible,
  onClose,
  categories,
  tempSelectedCategory,
  setTempSelectedCategory,
  tempSelectedStatus,
  setTempSelectedStatus,
  onReset,
  onShowAll,
  onApply,
}: FilterModalProps) => (
  <Modal
    animationType="slide"
    transparent={true}
    visible={visible}
    onRequestClose={onClose}
  >
    <TouchableWithoutFeedback onPress={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalHeaderTitle}>
                Filter Products
              </ThemedText>
              <TouchableOpacity onPress={onClose}>
                <ThemedText style={styles.modalClose}>✕</ThemedText>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.filterGroup}>
                <ThemedText style={styles.filterLabel}>Category</ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.filterOptions}>
                    <TouchableOpacity
                      style={[
                        styles.filterOption,
                        !tempSelectedCategory && styles.filterOptionActive,
                      ]}
                      onPress={() => setTempSelectedCategory("")}
                    >
                      <ThemedText
                        style={[
                          styles.filterOptionText,
                          !tempSelectedCategory &&
                            styles.filterOptionTextActive,
                        ]}
                      >
                        All
                      </ThemedText>
                    </TouchableOpacity>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.filterOption,
                          tempSelectedCategory === cat &&
                            styles.filterOptionActive,
                        ]}
                        onPress={() => setTempSelectedCategory(cat)}
                      >
                        <ThemedText
                          style={[
                            styles.filterOptionText,
                            tempSelectedCategory === cat &&
                              styles.filterOptionTextActive,
                          ]}
                        >
                          {cat}
                        </ThemedText>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              <View style={styles.filterGroup}>
                <ThemedText style={styles.filterLabel}>Stock Status</ThemedText>
                <View style={styles.filterOptions}>
                  {["", "Available", "Low Stock", "Out of Stock"].map((status) => (
                    <TouchableOpacity
                      key={status || "all"}
                      style={[
                        styles.filterOption,
                        tempSelectedStatus === status &&
                          styles.filterOptionActive,
                      ]}
                      onPress={() => setTempSelectedStatus(status)}
                    >
                      <ThemedText
                        style={[
                          styles.filterOptionText,
                          tempSelectedStatus === status &&
                            styles.filterOptionTextActive,
                        ]}
                      >
                        {status || "All"}
                      </ThemedText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.resetAllBtn} onPress={onReset}>
                <ThemedText style={styles.resetAllBtnText}>Reset</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.showAllBtn} onPress={onShowAll}>
                <ThemedText style={styles.showAllBtnText}>All Data</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyFilterBtn} onPress={onApply}>
                <ThemedText style={styles.applyFilterBtnText}>Apply</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
  </Modal>
);

// ─── Main Screen ─────────────────────────────────────────────────

export default function ProductManagementScreen() {
  const router = useRouter();

  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // User session states
  const [userId, setUserId] = useState<string>("");
  const [userName, setUserName] = useState<string>("");
  
  // Organization selector states
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [selectedOrgName, setSelectedOrgName] = useState<string>("");
  const [selectedOrgApiKey, setSelectedOrgApiKey] = useState<string>("");

  // Temp filter states
  const [tempSelectedCategory, setTempSelectedCategory] = useState("");
  const [tempSelectedStatus, setTempSelectedStatus] = useState("");

  // Applied filter states
  const [appliedSearchText, setAppliedSearchText] = useState("");
  const [appliedSelectedCategory, setAppliedSelectedCategory] = useState("");
  const [appliedSelectedStatus, setAppliedSelectedStatus] = useState("");
  const [appliedShowAllHistory, setAppliedShowAllHistory] = useState(false);

  const [categories, setCategories] = useState<string[]>([]);
  
  const [summary, setSummary] = useState({
    totalProducts: 0,
    totalStock: 0,
    totalValue: 0,
    totalProfit: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });

  // Refresh data when returning from form or switching org
  useFocusEffect(
    useCallback(() => {
      if (selectedOrgApiKey && selectedOrgId) {
        fetchProductsForOrg(selectedOrgApiKey, selectedOrgId);
      }
    }, [selectedOrgApiKey, selectedOrgId])
  );

  // Load user session on mount
  useEffect(() => {
    loadUserSession();
  }, []);

  const loadUserSession = async () => {
    try {
      const session = await AsyncStorage.getItem("user_session");
      if (!session) {
        Alert.alert("Error", "Session not found. Please login again.");
        setLoading(false);
        return;
      }

      const userData: UserSession = JSON.parse(session);
      
      setUserId(userData.UserId);
      setUserName(userData.UserName || "User");

      if (userData.Organizations && userData.Organizations.length > 0) {
        try {
          const headers = {
            Authorization: `Bearer ${userData.ApiKey}`,
            "Content-Type": "application/json",
          };
          const orgUrl = `${ORG_LIST_URL}?userId=${userData.UserId}`;
          const orgResponse = await fetch(orgUrl, { headers });
          const orgData = await orgResponse.json();
          
          if (orgData && orgData.success && Array.isArray(orgData.data)) {
            const orgNameMap = new Map();
            orgData.data.forEach((org: any) => {
              const id = org.organizationId || org.id;
              const name = org.organizationName || org.name;
              if (id && name) {
                orgNameMap.set(id, name);
              }
            });
            
            const orgsWithNames = userData.Organizations.map(org => ({
              ...org,
              OrganizationName: orgNameMap.get(org.OrganizationId) || `Organization ${org.OrganizationId}`
            }));
            setOrganizations(orgsWithNames);
            
            const defaultOrg = orgsWithNames.find(
              org => org.OrganizationId === userData.OrganizationId
            );
            
            if (defaultOrg) {
              setSelectedOrgId(defaultOrg.OrganizationId);
              setSelectedOrgName(defaultOrg.OrganizationName || userData.OrganizationName);
              setSelectedOrgApiKey(defaultOrg.ApiKey);
              await fetchProductsForOrg(defaultOrg.ApiKey, defaultOrg.OrganizationId);
            } else {
              const firstOrg = orgsWithNames[0];
              setSelectedOrgId(firstOrg.OrganizationId);
              setSelectedOrgName(firstOrg.OrganizationName || `Organization ${firstOrg.OrganizationId}`);
              setSelectedOrgApiKey(firstOrg.ApiKey);
              await fetchProductsForOrg(firstOrg.ApiKey, firstOrg.OrganizationId);
            }
          } else {
            const orgsWithNames = userData.Organizations.map(org => ({
              ...org,
              OrganizationName: `Organization ${org.OrganizationId}`
            }));
            setOrganizations(orgsWithNames);
            
            const defaultOrg = orgsWithNames.find(
              org => org.OrganizationId === userData.OrganizationId
            );
            
            if (defaultOrg) {
              setSelectedOrgId(defaultOrg.OrganizationId);
              setSelectedOrgName(defaultOrg.OrganizationName);
              setSelectedOrgApiKey(defaultOrg.ApiKey);
              await fetchProductsForOrg(defaultOrg.ApiKey, defaultOrg.OrganizationId);
            }
          }
        } catch (error) {
          console.error("Error fetching organization names:", error);
          const orgsWithNames = userData.Organizations.map(org => ({
            ...org,
            OrganizationName: `Organization ${org.OrganizationId}`
          }));
          setOrganizations(orgsWithNames);
          
          const defaultOrg = orgsWithNames.find(
            org => org.OrganizationId === userData.OrganizationId
          );
          
          if (defaultOrg) {
            setSelectedOrgId(defaultOrg.OrganizationId);
            setSelectedOrgName(defaultOrg.OrganizationName);
            setSelectedOrgApiKey(defaultOrg.ApiKey);
            await fetchProductsForOrg(defaultOrg.ApiKey, defaultOrg.OrganizationId);
          }
        }
      } else {
        setError("No organizations found for this user");
        setLoading(false);
      }
    } catch (error) {
      console.error("Error loading session:", error);
      Alert.alert("Error", "Failed to load user session");
      setLoading(false);
    }
  };

  const fetchProductsForOrg = async (orgApiKey: string, orgId: number) => {
    if (!orgApiKey || !orgId) {
      setError("Missing authentication or organization information");
      setLoading(false);
      return;
    }

    try {
      setError(null);
      setLoading(true);

      const url = `${PRODUCTS_API_URL}?organizationId=${orgId}`;
      console.log("Fetching products for Organization:", orgId);
      console.log("URL:", url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${orgApiKey}`,
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
        cache: "no-cache",
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized: Invalid API key for this organization");
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();
      if (!text || text.trim() === "") {
        setProducts([]);
        setFilteredProducts([]);
        setCategories([]);
        calculateSummary([]);
        setLoading(false);
        return;
      }

      const data = JSON.parse(text);
      let productsData: Product[] = [];

      if (Array.isArray(data)) productsData = data;
      else if (data.data && Array.isArray(data.data)) productsData = data.data;
      else if (data.result && Array.isArray(data.result)) productsData = data.result;
      else if (data.items && Array.isArray(data.items)) productsData = data.items;
      else {
        for (let key in data) {
          if (Array.isArray(data[key])) {
            productsData = data[key];
            break;
          }
        }
      }

      console.log(`Total products fetched for org ${orgId}: ${productsData.length}`);
      
      const uniqueCategories = [
        ...new Set(productsData.map((i) => i.Category).filter(Boolean)),
      ];
      setCategories(uniqueCategories);
      
      setProducts(productsData);
      
      setTempSelectedCategory("");
      setTempSelectedStatus("");
      setAppliedSearchText("");
      setAppliedSelectedCategory("");
      setAppliedSelectedStatus("");
      setAppliedShowAllHistory(false);
      
      setFilteredProducts(productsData);
      calculateSummary(productsData);
      
    } catch (err: any) {
      console.error("Fetch error:", err);
      setError(err.message || "Failed to fetch products");
      Alert.alert("Error", `Failed to load data: ${err.message}`);
      setProducts([]);
      setFilteredProducts([]);
      setCategories([]);
      calculateSummary([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const calculateSummary = (data: Product[]) => {
    const totalStock = data.reduce((s, i) => s + (i.CurrentStock || 0), 0);
    const totalValue = data.reduce(
      (s, i) => s + (i.SalesValue || 0) * (i.CurrentStock || 0),
      0
    );
    const totalProfit = data.reduce(
      (s, i) => s + (i.ProfitPerUnit || 0) * (i.CurrentStock || 0),
      0
    );
    const lowStockCount = data.filter(
      (i) => i.CurrentStock > 0 && i.CurrentStock <= i.ReorderLevel
    ).length;
    const outOfStockCount = data.filter((i) => i.CurrentStock === 0).length;
    
    setSummary({
      totalProducts: data.length,
      totalStock,
      totalValue,
      totalProfit,
      lowStockCount,
      outOfStockCount,
    });
  };

  const applyModalFilters = useCallback(() => {
    setAppliedSearchText("");
    setAppliedSelectedCategory(tempSelectedCategory);
    setAppliedSelectedStatus(tempSelectedStatus);
    setAppliedShowAllHistory(false);
    setShowFilterModal(false);
    
    let filtered = [...products];
    
    if (tempSelectedCategory) {
      filtered = filtered.filter((i) => i.Category === tempSelectedCategory);
    }
    if (tempSelectedStatus) {
      filtered = filtered.filter((i) => {
        const status = getStockStatus(i.CurrentStock, i.ReorderLevel);
        return status === tempSelectedStatus;
      });
    }
    
    setFilteredProducts(filtered);
    calculateSummary(filtered);
  }, [tempSelectedCategory, tempSelectedStatus, products]);

  const resetFilters = useCallback(() => {
    setTempSelectedCategory("");
    setTempSelectedStatus("");
    setAppliedSearchText("");
    setAppliedSelectedCategory("");
    setAppliedSelectedStatus("");
    setAppliedShowAllHistory(false);
    setShowFilterModal(false);
    
    setFilteredProducts(products);
    calculateSummary(products);
  }, [products]);

  const showAllData = useCallback(() => {
    setTempSelectedCategory("");
    setTempSelectedStatus("");
    setAppliedSearchText("");
    setAppliedSelectedCategory("");
    setAppliedSelectedStatus("");
    setAppliedShowAllHistory(true);
    setShowFilterModal(false);
    
    setFilteredProducts(products);
    calculateSummary(products);
  }, [products]);

  const handleRefresh = () => {
    setRefreshing(true);
    if (selectedOrgApiKey && selectedOrgId) {
      fetchProductsForOrg(selectedOrgApiKey, selectedOrgId);
    } else {
      setRefreshing(false);
      Alert.alert("Error", "Missing API key or organization ID");
    }
  };

  const handleRetry = () => {
    if (selectedOrgApiKey && selectedOrgId) {
      fetchProductsForOrg(selectedOrgApiKey, selectedOrgId);
    }
  };

  const handleAddProduct = () => {
    setFormMode('create');
    setSelectedProduct(null);
    setShowFormModal(true);
  };

  const handleEditProduct = (product: Product) => {
    setFormMode('edit');
    setSelectedProduct(product);
    setShowFormModal(true);
  };

  const handleDeleteProduct = (productId: number, productName: string) => {
    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete "${productName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteProduct(productId),
        },
      ]
    );
  };

  const deleteProduct = async (productId: number) => {
    try {
      const response = await fetch(`${DELETE_PRODUCT_API_URL}?id=${productId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${selectedOrgApiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      Alert.alert("Success", "Product deleted successfully");
      fetchProductsForOrg(selectedOrgApiKey, selectedOrgId!);
    } catch (error: any) {
      console.error("Delete error:", error);
      Alert.alert("Error", `Failed to delete product: ${error.message}`);
    }
  };

  // Apply search filter
  useEffect(() => {
    if (products.length > 0) {
      let filtered = [...products];
      
      if (appliedSearchText && !appliedShowAllHistory) {
        const q = appliedSearchText.toLowerCase();
        filtered = filtered.filter(
          (i) =>
            i.ProductName?.toLowerCase().includes(q) ||
            i.Category?.toLowerCase().includes(q)
        );
      }
      
      if (appliedSelectedCategory && !appliedShowAllHistory) {
        filtered = filtered.filter((i) => i.Category === appliedSelectedCategory);
      }
      
      if (appliedSelectedStatus && !appliedShowAllHistory) {
        filtered = filtered.filter((i) => {
          const status = getStockStatus(i.CurrentStock, i.ReorderLevel);
          return status === appliedSelectedStatus;
        });
      }
      
      if (!appliedShowAllHistory && !appliedSearchText && !appliedSelectedCategory && !appliedSelectedStatus) {
        filtered = products;
      }
      
      setFilteredProducts(filtered);
      calculateSummary(filtered);
    }
  }, [appliedSearchText, appliedSelectedCategory, appliedSelectedStatus, appliedShowAllHistory, products]);

  // Organization change handler
  const handleOrgChange = useCallback(
    (orgIdValue: number) => {
      if (!orgIdValue || orgIdValue === selectedOrgId) return;

      console.log(`Switching organization from ${selectedOrgId} to ${orgIdValue}`);
      
      const selectedOrg = organizations.find(
        (org) => org.OrganizationId === orgIdValue
      );
      
      if (!selectedOrg || !selectedOrg.ApiKey) {
        Alert.alert("Error", "Organization or API key not found");
        return;
      }
      
      setSelectedOrgId(orgIdValue);
      setSelectedOrgApiKey(selectedOrg.ApiKey);
      setSelectedOrgName(selectedOrg.OrganizationName || `Organization ${orgIdValue}`);

      setProducts([]);
      setFilteredProducts([]);
      setCategories([]);
      
      setTempSelectedCategory("");
      setTempSelectedStatus("");
      setAppliedSearchText("");
      setAppliedSelectedCategory("");
      setAppliedSelectedStatus("");
      setAppliedShowAllHistory(false);
      
      fetchProductsForOrg(selectedOrg.ApiKey, orgIdValue);
    },
    [selectedOrgId, organizations]
  );

  const handleFormSuccess = () => {
    if (selectedOrgApiKey && selectedOrgId) {
      fetchProductsForOrg(selectedOrgApiKey, selectedOrgId);
    }
  };

  if (error && !loading) {
    return (
      <View style={styles.centerContainer}>
        <ThemedText style={styles.errorText}>{error}</ThemedText>
        <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
          <ThemedText style={styles.retryBtnText}>Retry</ThemedText>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={true}
      bounces={true}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <ThemedText style={styles.headerTitle}>Products</ThemedText>
          <ThemedText style={styles.headerSubtitle}>
            {userName}
            {selectedOrgName ? ` | ${selectedOrgName}` : ""}
          </ThemedText>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddProduct}
          >
            <ThemedText style={styles.addButtonText}>+ Add</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setShowFilterModal(true)}
          >
            <ThemedText style={styles.filterBtnText}>Filter</ThemedText>
          </TouchableOpacity>
        </View>
      </View>

      {/* Organization Picker */}
      {organizations.length > 0 && selectedOrgId !== null && (
        <View style={styles.orgPickerContainer}>
          <Picker
            selectedValue={selectedOrgId}
            onValueChange={handleOrgChange}
            style={styles.orgPicker}
            dropdownIconColor="#007bff"
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
          placeholder="Search by product name or category..."
          placeholderTextColor="#999"
          value={appliedSearchText}
          onChangeText={setAppliedSearchText}
        />
      </View>

      {/* Active Filters */}
      {(appliedSelectedCategory ||
        appliedSelectedStatus ||
        appliedSearchText) &&
        !appliedShowAllHistory && (
          <View style={styles.activeFilters}>
            {appliedSearchText && (
              <View style={styles.filterTag}>
                <ThemedText style={styles.filterTagText}>
                  Search: {appliedSearchText}
                </ThemedText>
              </View>
            )}
            {appliedSelectedCategory && (
              <View style={styles.filterTag}>
                <ThemedText style={styles.filterTagText}>
                  Category: {appliedSelectedCategory}
                </ThemedText>
              </View>
            )}
            {appliedSelectedStatus && (
              <View style={styles.filterTag}>
                <ThemedText style={styles.filterTagText}>
                  Status: {appliedSelectedStatus}
                </ThemedText>
              </View>
            )}
          </View>
        )}

      {appliedShowAllHistory && (
        <View style={styles.allHistoryBadge}>
          <ThemedText style={styles.allHistoryText}>
            Showing All Products
          </ThemedText>
        </View>
      )}

      {/* Summary Cards */}
      {filteredProducts.length > 0 && (
        <View style={styles.summaryContainer}>
          <View style={styles.summaryHeader}>
            <ThemedText style={styles.summaryTitle}>
              Product Summary {selectedOrgName ? `- ${selectedOrgName}` : ""}
            </ThemedText>
          </View>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryBox}>
              <ThemedText style={styles.summaryLabel}>Total Products</ThemedText>
              <ThemedText style={styles.summaryValue}>
                {summary.totalProducts}
              </ThemedText>
            </View>

            <View style={styles.summaryBox}>
              <ThemedText style={styles.summaryLabel}>Total Stock</ThemedText>
              <ThemedText style={styles.summaryValue}>
                {summary.totalStock.toFixed(2)}
              </ThemedText>
            </View>

            <View style={styles.summaryBox}>
              <ThemedText style={styles.summaryLabel}>Inventory Value</ThemedText>
              <ThemedText style={[styles.summaryValue, styles.greenText]}>
                ৳ {summary.totalValue.toFixed(2)}
              </ThemedText>
            </View>

            <View style={styles.summaryBox}>
              <ThemedText style={styles.summaryLabel}>Potential Profit</ThemedText>
              <ThemedText style={[styles.summaryValue, styles.greenText]}>
                ৳ {summary.totalProfit.toFixed(2)}
              </ThemedText>
            </View>

            <View style={styles.summaryBox}>
              <ThemedText style={styles.summaryLabel}>Low Stock Items</ThemedText>
              <ThemedText style={[styles.summaryValue, styles.warningText]}>
                {summary.lowStockCount}
              </ThemedText>
            </View>

            <View style={styles.summaryBox}>
              <ThemedText style={styles.summaryLabel}>Out of Stock</ThemedText>
              <ThemedText style={[styles.summaryValue, styles.dangerText]}>
                {summary.outOfStockCount}
              </ThemedText>
            </View>
          </View>
        </View>
      )}

      {/* Table */}
      <View style={styles.tableContainer}>
        {filteredProducts.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={true}
            bounces={false}
          >
            <View
              style={{ width: 50 + 180 + 100 + 80 + 80 + 80 + 80 + 80 + 100 + 80 }}
            >
              {/* Header */}
              <View style={styles.headerRow}>
                {[
                  { label: "#", style: styles.cellSn },
                  { label: "Product Name", style: styles.cellProduct },
                  { label: "Category", style: styles.cellCategory },
                  { label: "Unit Type", style: styles.cellUnit },
                  { label: "Stock", style: styles.cellStock },
                  { label: "Buy Price", style: styles.cellBuyPrice },
                  { label: "Sale Price", style: styles.cellSalePrice },
                  { label: "Profit", style: styles.cellProfit },
                  { label: "Status", style: styles.cellStatus },
                  { label: "Actions", style: styles.cellActions },
                ].map(({ label, style }) => (
                  <View key={label} style={[styles.headerCell, style]}>
                    <ThemedText style={styles.headerText}>{label}</ThemedText>
                  </View>
                ))}
              </View>

              {/* Rows */}
              <FlatList
                data={filteredProducts}
                keyExtractor={(item, index) =>
                  item.ProductId
                    ? `${item.ProductId}-${selectedOrgId}`
                    : `${index}-${selectedOrgId}`
                }
                renderItem={({ item, index }) => {
                  const statusColor = getStatusStyle(getStockStatus(item.CurrentStock, item.ReorderLevel));
                  
                  return (
                    <View style={[styles.tableRow, item.CurrentStock <= item.ReorderLevel && styles.lowStockRow]}>
                      <View
                        style={[styles.cell, styles.cellSn, styles.cellBorder]}
                      >
                        <ThemedText style={styles.cellText}>
                          {index + 1}
                        </ThemedText>
                      </View>
                      <View
                        style={[
                          styles.cell,
                          styles.cellProduct,
                          styles.cellBorder,
                        ]}
                      >
                        <TouchableOpacity onPress={() => handleEditProduct(item)}>
                          <ThemedText style={styles.productName}>
                            {item.ProductName || "N/A"}
                          </ThemedText>
                        </TouchableOpacity>
                      </View>
                      <View
                        style={[
                          styles.cell,
                          styles.cellCategory,
                          styles.cellBorder,
                        ]}
                      >
                        <ThemedText style={styles.cellText}>
                          {item.Category || "N/A"}
                        </ThemedText>
                      </View>
                      <View
                        style={[
                          styles.cell,
                          styles.cellUnit,
                          styles.cellBorder,
                        ]}
                      >
                        <ThemedText style={styles.cellText}>
                          {item.UnitType || "Piece"}
                        </ThemedText>
                      </View>
                      <View
                        style={[
                          styles.cell,
                          styles.cellStock,
                          styles.cellBorder,
                        ]}
                      >
                        <ThemedText
                          style={[
                            styles.cellText,
                            item.CurrentStock <= item.ReorderLevel && item.CurrentStock > 0 && styles.lowStockText,
                            item.CurrentStock === 0 && styles.outOfStockText,
                          ]}
                        >
                          {item.CurrentStock || 0}
                        </ThemedText>
                        {item.CurrentStock <= item.ReorderLevel && item.CurrentStock > 0 && (
                          <ThemedText style={styles.reorderText}>
                            Reorder: {item.ReorderLevel}
                          </ThemedText>
                        )}
                      </View>
                      <View
                        style={[
                          styles.cell,
                          styles.cellBuyPrice,
                          styles.cellBorder,
                        ]}
                      >
                        <ThemedText style={styles.cellText}>
                          ৳{(item.UnitPrice || 0).toFixed(2)}
                        </ThemedText>
                      </View>
                      <View
                        style={[
                          styles.cell,
                          styles.cellSalePrice,
                          styles.cellBorder,
                        ]}
                      >
                        <ThemedText style={styles.salePriceText}>
                          ৳{(item.SalesValue || 0).toFixed(2)}
                        </ThemedText>
                      </View>
                      <View
                        style={[
                          styles.cell,
                          styles.cellProfit,
                          styles.cellBorder,
                        ]}
                      >
                        <ThemedText style={styles.profitText}>
                          ৳{(item.ProfitPerUnit || 0).toFixed(2)}
                        </ThemedText>
                        <ThemedText style={styles.profitPercentText}>
                          ({item.ProfitPercentage || 0}%)
                        </ThemedText>
                      </View>
                      <View
                        style={[
                          styles.cell,
                          styles.cellStatus,
                          styles.cellBorder,
                        ]}
                      >
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: statusColor.bg },
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.statusText,
                              { color: statusColor.text },
                            ]}
                          >
                            {getStockStatus(item.CurrentStock, item.ReorderLevel)}
                          </ThemedText>
                        </View>
                      </View>
                      {/* Actions Cell */}
                      <View
                        style={[
                          styles.cell,
                          styles.cellActions,
                          styles.cellBorder,
                        ]}
                      >
                        <View style={styles.actionButtons}>
                          <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => handleEditProduct(item)}
                          >
                            <ThemedText style={styles.editButtonText}>Edit</ThemedText>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => handleDeleteProduct(item.ProductId, item.ProductName)}
                          >
                            <ThemedText style={styles.deleteButtonText}>Delete</ThemedText>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                }}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                  />
                }
                showsVerticalScrollIndicator={true}
              />
            </View>
          </ScrollView>
        ) : loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007bff" />
            <ThemedText style={styles.loadingText}>
              Loading products...
            </ThemedText>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>
              No Products Found for {selectedOrgName}
            </ThemedText>
            <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
              <ThemedText style={styles.retryBtnText}>Refresh</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Filter Modal */}
      <FilterModal
        visible={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        categories={categories}
        tempSelectedCategory={tempSelectedCategory}
        setTempSelectedCategory={setTempSelectedCategory}
        tempSelectedStatus={tempSelectedStatus}
        setTempSelectedStatus={setTempSelectedStatus}
        onReset={resetFilters}
        onShowAll={showAllData}
        onApply={applyModalFilters}
      />

      {/* Product Form Modal */}
      {selectedOrgId && selectedOrgName && selectedOrgApiKey && (
        <ProductFormModal
          visible={showFormModal}
          onClose={() => setShowFormModal(false)}
          onSuccess={handleFormSuccess}
          mode={formMode}
          product={selectedProduct}
          organizationId={selectedOrgId}
          organizationName={selectedOrgName}
          apiKey={selectedOrgApiKey}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#28a745",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    margin: 10,
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#fff" },
  headerSubtitle: { fontSize: 11, color: "#fff", marginTop: 2 },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "bold",
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#007bff",
    borderRadius: 6,
  },
  filterBtnText: { color: "#fff", fontSize: 14, fontWeight: "bold" },

  orgPickerContainer: {
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    overflow: "hidden",
  },
  orgPicker: {
    height: 50,
    width: "100%",
    color: "#333",
  },

  searchContainer: {
    padding: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  searchInput: {
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#333",
  },

  activeFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  filterTag: {
    backgroundColor: "#e7f1ff",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  filterTagText: { fontSize: 11, color: "#007bff" },

  allHistoryBadge: {
    backgroundColor: "#28a745",
    padding: 8,
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 6,
    alignItems: "center",
  },
  allHistoryText: { color: "#fff", fontSize: 12, fontWeight: "bold" },

  summaryContainer: {
    margin: 10,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#fff",
    elevation: 4,
  },

  summaryHeader: {
    backgroundColor: "#67B968",
    paddingVertical: 12,
    alignItems: "center",
  },

  summaryTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  summaryBox: {
    width: "33.33%",
    height: 90,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0.5,
    borderColor: "#E5E5E5",
    backgroundColor: "#FAFAFA",
    paddingHorizontal: 6,
  },

  summaryLabel: {
    fontSize: 11,
    color: "#777",
    textAlign: "center",
    marginBottom: 6,
  },

  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },

  greenText: {
    color: "#2E7D32",
  },
  warningText: { color: "#ff9800" },
  dangerText: { color: "#dc3545" },
  profitText: { fontSize: 15, fontWeight: "700", color: "#4caf50" },
  profitPercentText: { fontSize: 9, color: "#4caf50" },

  tableContainer: { marginHorizontal: 12, marginBottom: 20 },

  headerRow: {
    flexDirection: "row",
    backgroundColor: "#343a40",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    borderColor: "#dee2e6",
  },
  headerCell: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  headerText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
  },

  tableRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: "#dee2e6",
  },
  cell: { justifyContent: "center", paddingHorizontal: 4 },
  cellBorder: { borderRightWidth: 1, borderRightColor: "#dee2e6" },
  cellText: { fontSize: 11, color: "#555" },

  cellSn: { width: 50, alignItems: "center" },
  cellProduct: { width: 160 },
  cellCategory: { width: 100, alignItems: "center" },
  cellUnit: { width: 80, alignItems: "center" },
  cellStock: { width: 80, alignItems: "center" },
  cellBuyPrice: { width: 80, alignItems: "center" },
  cellSalePrice: { width: 80, alignItems: "center" },
  cellProfit: { width: 80, alignItems: "center" },
  cellStatus: { width: 80, alignItems: "center" },
  cellActions: { width: 100, alignItems: "center" },

  productName: { fontSize: 12, fontWeight: "bold", color: "#333" },
  salePriceText: { fontSize: 11, fontWeight: "bold", color: "#28a745" },
  lowStockText: { color: "#ff9800", fontWeight: "bold" },
  outOfStockText: { color: "#dc3545", fontWeight: "bold" },
  reorderText: { fontSize: 9, color: "#ff9800", marginTop: 2 },

  statusBadge: {
    paddingHorizontal: 1,
    paddingVertical: 1,
    borderRadius: 3,
    minWidth: 65,
    alignItems: "center",
  },
  statusText: { fontSize: 10, fontWeight: "bold" },

  actionButtons: {
    flexDirection: "row",
    gap: 6,
  },
  editButton: {
    backgroundColor: "#007bff",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },
  deleteButton: {
    backgroundColor: "#dc3545",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: width * 0.9,
    maxHeight: height * 0.8,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalHeaderTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  modalClose: { fontSize: 20, color: "#999" },
  modalBody: { padding: 20, maxHeight: height * 0.6 },
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },

  filterGroup: { marginBottom: 24 },
  filterLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 12,
  },
  filterOptions: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 6,
  },
  filterOptionActive: { backgroundColor: "#007bff" },
  filterOptionText: { fontSize: 13, color: "#666" },
  filterOptionTextActive: { color: "#fff" },

  resetAllBtn: {
    flex: 1,
    padding: 12,
    backgroundColor: "#6c757d",
    borderRadius: 6,
    alignItems: "center",
  },
  resetAllBtnText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  showAllBtn: {
    flex: 1,
    padding: 12,
    backgroundColor: "#28a745",
    borderRadius: 6,
    alignItems: "center",
  },
  showAllBtnText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
  applyFilterBtn: {
    flex: 1,
    padding: 12,
    backgroundColor: "#007bff",
    borderRadius: 6,
    alignItems: "center",
  },
  applyFilterBtnText: { color: "#fff", fontSize: 14, fontWeight: "bold" },

  // Form Modal Styles
  formModalContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: width * 0.95,
    maxHeight: height * 0.9,
    overflow: "hidden",
  },
  formModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  formModalTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  formModalClose: {
    padding: 4,
  },
  formModalCloseText: { fontSize: 20, color: "#999" },
  formModalBody: {
    padding: 20,
  },
  orgInfoBox: {
    backgroundColor: "#e7f1ff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  orgInfoText: { fontSize: 12, color: "#007bff", textAlign: "center" },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", color: "#333", marginBottom: 8 },
  input: { 
    backgroundColor: "#fff", 
    borderRadius: 8, 
    paddingHorizontal: 12, 
    paddingVertical: 12, 
    fontSize: 14, 
    color: "#333", 
    borderWidth: 1, 
    borderColor: "#e0e0e0" 
  },
  pickerContainer: { 
    backgroundColor: "#fff", 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: "#e0e0e0", 
    overflow: "hidden" 
  },
  picker: { height: 50, width: "100%", color: "#333" },
  emptyPicker: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  emptyPickerText: {
    fontSize: 12,
    color: "#999",
  },
  profitContainer: { 
    flexDirection: "row", 
    justifyContent: "space-between", 
    gap: 12, 
    marginBottom: 20 
  },
  profitBox: { 
    flex: 1, 
    backgroundColor: "#e8f5e9", 
    borderRadius: 8, 
    padding: 12, 
    alignItems: "center" 
  },
  profitLabel: { fontSize: 12, color: "#2e7d32", marginBottom: 4 },
  profitValue: { fontSize: 16, fontWeight: "bold", color: "#2e7d32" },
  statusContainer: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    backgroundColor: "#fff", 
    borderRadius: 8, 
    padding: 12, 
    marginBottom: 24, 
    borderWidth: 1, 
    borderColor: "#e0e0e0" 
  },
  statusLabel: { fontSize: 14, fontWeight: "600", color: "#333" },
  submitButton: { 
    backgroundColor: "#007bff", 
    borderRadius: 8, 
    paddingVertical: 14, 
    alignItems: "center", 
    marginTop: 10, 
    marginBottom: 30 
  },
  submitButtonDisabled: { backgroundColor: "#999" },
  submitButtonText: { color: "#fff", fontSize: 16, fontWeight: "bold" },

  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 12,
  },
  loadingText: { fontSize: 14, color: "#999" },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 60,
    gap: 12,
  },
  emptyText: {
    textAlign: "center",
    marginTop: 12,
    fontSize: 14,
    color: "#999",
  },
  lowStockRow: {
  backgroundColor: "#fff0f0", 
  borderColor: "#ff6b6b", 
  },
  errorText: {
    textAlign: "center",
    marginTop: 12,
    fontSize: 14,
    color: "#dc3545",
  },
  retryBtn: {
    backgroundColor: "#007bff",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  retryBtnText: { color: "#fff", fontSize: 14, fontWeight: "bold" },
});