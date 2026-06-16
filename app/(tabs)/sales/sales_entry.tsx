import { ThemedText } from "@/components/themed-text";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  Modal,
  FlatList,
} from "react-native";

// API Configuration
const BASE_URL = "http://devmystock.byteheart.com";

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

// Helper function for API calls with authentication
const apiRequest = async (endpoint: string, apiKey: string, options: RequestInit = {}) => {
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API Error ${response.status}: ${errorText}`);
  }

  return response.json();
};

// Calculate profit using FIFO API
const calculateFIFOProfit = async (
  organizationId: number | null,
  productId: number,
  quantity: number,
  salesPrice: number,
  apiKey: string
) => {
  try {
    const data = await apiRequest("/Stock/CalculateFIFOProfit", apiKey, {
      method: "POST",
      body: JSON.stringify({
        organizationId: organizationId,
        productId: productId,
        quantity: quantity,
        salesPrice: salesPrice,
      }),
    });

    if (data.success && data.data) {
      return {
        totalProfit: data.data.TotalProfit,
        profitPerUnit: data.data.ProfitPerUnit,
        profitPercentage: data.data.ProfitPercentage,
        averageCostPerUnit: data.data.AverageCostPerUnit,
      };
    }
    return null;
  } catch (error) {
    console.error("Error calculating FIFO profit:", error);
    return null;
  }
};

interface RowData {
  id: number;
  category: string;
  productId: number;
  productName: string;
  stock: number;
  buyPrice: number;
  salePrice: number;
  qty: string;
  amount: number;
  profit: number;
  profitPercentage: number;
  unitPrice: number;
  isPopulated: boolean;
  loadingProfit: boolean;
}

// Searchable Category Modal
const SearchableCategoryModal = ({ 
  visible, 
  onClose, 
  onSelect, 
  categories, 
  title 
}: any) => {
  const [searchText, setSearchText] = useState("");

  const filteredCategories = searchText 
    ? categories.filter((cat: string) => 
        cat.toLowerCase().includes(searchText.toLowerCase())
      )
    : categories;

  const handleSelect = (category: string) => {
    onSelect(category);
    onClose();
    setSearchText("");
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={() => {
        onClose();
        setSearchText("");
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.searchModalContainer}>
          <View style={styles.searchModalHeader}>
            <ThemedText style={styles.searchModalTitle}>{title}</ThemedText>
            <TouchableOpacity onPress={() => {
              onClose();
              setSearchText("");
            }}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search categories..."
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
            />
          </View>
          
          <FlatList
            data={filteredCategories}
            keyExtractor={(item, index) => index.toString()}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.searchModalItem}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <ThemedText style={styles.searchModalItemText}>{item}</ThemedText>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <ThemedText style={styles.emptyText}>No categories found</ThemedText>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
};

// Searchable Product Modal
const SearchableProductModal = ({ 
  visible, 
  onClose, 
  onSelect, 
  products, 
  title,
  selectedCategory 
}: any) => {
  const [searchText, setSearchText] = useState("");
  
  // Filter products by category if category is selected
  const filteredByCategory = selectedCategory 
    ? products.filter((p: any) => p.Category === selectedCategory)
    : products;
  
  const filteredProducts = searchText 
    ? filteredByCategory.filter((product: any) => 
        product.ProductName.toLowerCase().includes(searchText.toLowerCase())
      )
    : filteredByCategory;

  const handleSelect = (product: any) => {
    onSelect(product);
    onClose();
    setSearchText("");
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={() => {
        onClose();
        setSearchText("");
      }}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.searchModalContainer}>
          <View style={styles.searchModalHeader}>
            <ThemedText style={styles.searchModalTitle}>{title}</ThemedText>
            <TouchableOpacity onPress={() => {
              onClose();
              setSearchText("");
            }}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.searchInputContainer}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search products..."
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={setSearchText}
              autoFocus
            />
          </View>
          
          {selectedCategory && (
            <View style={styles.filterBadge}>
              <Ionicons name="filter" size={14} color="#007bff" />
              <ThemedText style={styles.filterBadgeText}>Category: {selectedCategory}</ThemedText>
            </View>
          )}
          
          <FlatList
            data={filteredProducts}
            keyExtractor={(item) => item.ProductId.toString()}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.searchModalItem}
                onPress={() => handleSelect(item)}
                activeOpacity={0.7}
              >
                <View style={styles.productItemContainer}>
                  <View style={{ flex: 1 }}>
                    <ThemedText style={styles.searchModalItemText}>{item.ProductName}</ThemedText>
                    <ThemedText style={styles.productCategoryText}>Category: {item.Category || "N/A"}</ThemedText>
                  </View>
                  <ThemedText style={styles.productStockText}>Stock: {item.CurrentStock || 0}</ThemedText>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <ThemedText style={styles.emptyText}>
                  {selectedCategory ? `No products found in ${selectedCategory} category` : "No products found"}
                </ThemedText>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
};

export default function SalesEntryScreen() {
  const router = useRouter();
  
  // State declarations
  const [rows, setRows] = useState<RowData[]>([]);
  const [nextRowId, setNextRowId] = useState(1);
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const [apiKey, setApiKey] = useState<string>("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [organizationName, setOrganizationName] = useState<string>("");
  
  // Modal states
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [productModalVisible, setProductModalVisible] = useState(false);
  const [currentRowId, setCurrentRowId] = useState<number | null>(null);
  const [tempCategory, setTempCategory] = useState<string>("");
  
  // Customer Info State
  const [customerName, setCustomerName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  
  // Payment State
  const [paymentAmount, setPaymentAmount] = useState("0");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyExpense, setDailyExpense] = useState("0");
  
  // Summary State
  const [totalItems, setTotalItems] = useState(0);
  const [totalQty, setTotalQty] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [dueAmount, setDueAmount] = useState(0);
  
  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalTitle, setModalTitle] = useState("");
  const [modalType, setModalType] = useState<"success" | "error" | "warning" | "info">("info");

  // Load user session on mount
  useEffect(() => {
    loadUserSession();
  }, []);

  // Fetch data when organization changes
  useEffect(() => {
    if (organizationId && apiKey) {
      fetchCategories();
      fetchProducts();
      initializeRows();
    }
  }, [organizationId, apiKey]);

  const loadUserSession = async () => {
    try {
      const session = await AsyncStorage.getItem("user_session");
      if (!session) {
        Alert.alert("Error", "Session not found. Please login again.");
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
      }
    } catch (error) {
      console.error("Error loading session:", error);
      Alert.alert("Error", "Failed to load user session");
    }
  };

  const initializeRows = () => {
    const initialRows: RowData[] = [];
    for (let i = 1; i <= 10; i++) {
      initialRows.push({
        id: i,
        category: "",
        productId: 0,
        productName: "",
        stock: 0,
        buyPrice: 0,
        salePrice: 0,
        qty: "",
        amount: 0,
        profit: 0,
        profitPercentage: 0,
        unitPrice: 0,
        isPopulated: false,
        loadingProfit: false,
      });
    }
    setRows(initialRows);
    setNextRowId(11);
  };

  const fetchCategories = async () => {
    try {
      setLoading(true);
      let url = "/Stock/GetCategories";
      if (organizationId) {
        url += `?OrganizationId=${organizationId}`;
      }

      console.log("Fetching categories from:", url);
      const data = await apiRequest(url, apiKey);
      console.log("Categories API Response:", data);

      let categoriesList: string[] = [];

      if (Array.isArray(data)) {
        if (data.length > 0 && typeof data[0] === 'string') {
          categoriesList = data;
        } else if (data.length > 0 && typeof data[0] === 'object') {
          categoriesList = data.map((item: any) => 
            item.name || item.categoryName || item.Name || item.CategoryName || String(item)
          );
        }
      } else if (data && typeof data === "object") {
        if (data.categories && Array.isArray(data.categories)) {
          categoriesList = data.categories;
        } else if (data.data && Array.isArray(data.data)) {
          categoriesList = data.data;
        } else if (data.result && Array.isArray(data.result)) {
          categoriesList = data.result;
        }
      }

      console.log("Processed categories:", categoriesList);
      setCategories(categoriesList);
      
      if (categoriesList.length === 0) {
        Alert.alert("Warning", "No categories found. Please check API connection.");
      }
    } catch (error: any) {
      console.error("Error fetching categories:", error);
      Alert.alert("Error", `Failed to fetch categories: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      let url = "/Products/GetAllProduct";
      if (organizationId) {
        url += `?OrganizationId=${organizationId}`;
      }

      console.log("Fetching products from:", url);
      const data = await apiRequest(url, apiKey);
      console.log("Products loaded:", data?.length || 0);

      let productsList = [];

      if (Array.isArray(data)) {
        productsList = data;
      } else if (data && data.data && Array.isArray(data.data)) {
        productsList = data.data;
      } else if (data && data.products && Array.isArray(data.products)) {
        productsList = data.products;
      } else if (data && data.result && Array.isArray(data.result)) {
        productsList = data.result;
      }

      console.log(`Loaded ${productsList.length} products`);
      setProducts(productsList);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      Alert.alert("Error", `Failed to fetch products: ${error.message}`);
    }
  };

  const handleOrgChange = (orgId: number) => {
    if (orgId === 0) return;
    
    const selectedOrg = organizations.find(org => org.OrganizationId === orgId);
    if (selectedOrg) {
      setOrganizationId(selectedOrg.OrganizationId);
      setOrganizationName(selectedOrg.OrganizationName || `Organization ${selectedOrg.OrganizationId}`);
      setApiKey(selectedOrg.ApiKey);
      setCategories([]);
      setProducts([]);
      initializeRows();
      setCustomerName("");
      setPhoneNumber("");
      setEmail("");
      setAddress("");
      setPaymentAmount("0");
      setPaymentMethod("Cash");
      setPaymentReference("");
    }
  };

  const onCategorySelect = (rowId: number, category: string) => {
    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id === rowId) {
          return {
            ...row,
            category: category,
            productId: 0,
            productName: "",
            stock: 0,
            buyPrice: 0,
            salePrice: 0,
            qty: "",
            amount: 0,
            profit: 0,
            profitPercentage: 0,
            unitPrice: 0,
            isPopulated: false,
          };
        }
        return row;
      })
    );
  };

  const onProductSelect = (rowId: number, product: any) => {
    setRows(prevRows =>
      prevRows.map(row => {
        if (row.id === rowId) {
          return {
            ...row,
            productId: product.ProductId,
            productName: product.ProductName,
            category: product.Category, // Auto set category from product
            stock: product.CurrentStock || 0,
            buyPrice: product.UnitPrice || 0,
            salePrice: product.SalesValue || product.UnitPrice || 0,
            unitPrice: product.UnitPrice || 0,
            isPopulated: true,
            qty: "",
            amount: 0,
            profit: 0,
            profitPercentage: 0,
          };
        }
        return row;
      })
    );
  };

  const loadCustomerByPhoneNumber = async (phone: string) => {
    if (!phone || phone.length < 6) return;
    
    try {
      const response = await apiRequest(`/Stock/GetByPhoneNumber?phoneNumber=${phone}&orgId=${organizationId}`, apiKey);
      
      if (response.success && response.isData && response.customer) {
        setCustomerName(response.customer.CustomerName || "");
        setEmail(response.customer.Email || "");
        setAddress(response.customer.Address || "");
      }
    } catch (error) {
      console.error("Error loading customer:", error);
    }
  };

  const calculateProfitForRow = async (rowId: number, quantity: number, salesPrice: number) => {
    const row = rows.find(r => r.id === rowId);
    if (!row || !row.productId) return;

    setRows(prevRows =>
      prevRows.map(r =>
        r.id === rowId ? { ...r, loadingProfit: true } : r
      )
    );

    const profitData = await calculateFIFOProfit(
      organizationId,
      row.productId,
      quantity,
      salesPrice,
      apiKey
    );

    const totalAmount = salesPrice * quantity;
    const profit = profitData?.totalProfit || totalAmount - (quantity * (row.unitPrice || 0));
    const profitPercentage = profitData?.profitPercentage || 
      (row.unitPrice > 0 ? ((salesPrice - row.unitPrice) / row.unitPrice) * 100 : 0);

    setRows(prevRows =>
      prevRows.map(r =>
        r.id === rowId
          ? {
              ...r,
              amount: totalAmount,
              profit: profit,
              profitPercentage: profitPercentage,
              qty: quantity.toString(),
              salePrice: salesPrice,
              loadingProfit: false,
            }
          : r
      )
    );
    updateSummary();
  };

  const onQuantityChange = (rowId: number, qty: string) => {
    const numQty = parseFloat(qty) || 0;
    const row = rows.find(r => r.id === rowId);
    
    if (row && row.isPopulated) {
      if (numQty > row.stock) {
        Alert.alert("Stock Error", `Only ${row.stock} available in stock`);
        return;
      }
      if (numQty > 0 && row.salePrice > 0) {
        calculateProfitForRow(rowId, numQty, row.salePrice);
      } else {
        setRows(prevRows =>
          prevRows.map(r =>
            r.id === rowId
              ? { ...r, qty: qty, amount: 0, profit: 0 }
              : r
          )
        );
        updateSummary();
      }
    } else {
      setRows(prevRows =>
        prevRows.map(r =>
          r.id === rowId ? { ...r, qty: qty } : r
        )
      );
    }
  };

  const onSalePriceChange = (rowId: number, price: string) => {
    const numPrice = parseFloat(price) || 0;
    const row = rows.find(r => r.id === rowId);
    
    if (row && row.isPopulated) {
      setRows(prevRows =>
        prevRows.map(r =>
          r.id === rowId ? { ...r, salePrice: numPrice } : r
        )
      );
      
      const qty = parseFloat(row.qty) || 0;
      if (qty > 0 && numPrice > 0) {
        calculateProfitForRow(rowId, qty, numPrice);
      }
    } else {
      setRows(prevRows =>
        prevRows.map(r =>
          r.id === rowId ? { ...r, salePrice: numPrice } : r
        )
      );
    }
  };

  const addEmptyRows = (count: number) => {
    const newRows: RowData[] = [];
    for (let i = 0; i < count; i++) {
      newRows.push({
        id: nextRowId + i,
        category: "",
        productId: 0,
        productName: "",
        stock: 0,
        buyPrice: 0,
        salePrice: 0,
        qty: "",
        amount: 0,
        profit: 0,
        profitPercentage: 0,
        unitPrice: 0,
        isPopulated: false,
        loadingProfit: false,
      });
    }
    setRows([...rows, ...newRows]);
    setNextRowId(nextRowId + count);
  };

  const deleteRow = (rowId: number) => {
    if (rows.length > 1) {
      setRows(rows.filter(row => row.id !== rowId));
      updateSummary();
    } else {
      Alert.alert("Cannot Delete", "At least one row is required");
    }
  };

  const refreshTable = () => {
    initializeRows();
    setCustomerName("");
    setPhoneNumber("");
    setEmail("");
    setAddress("");
    setPaymentAmount("0");
    setPaymentMethod("Cash");
    setPaymentReference("");
    setDailyExpense("0");
  };

  const updateSummary = useCallback(() => {
    let items = 0;
    let qty = 0;
    let amount = 0;
    let profit = 0;

    rows.forEach(row => {
      if (row.isPopulated && parseFloat(row.qty) > 0) {
        items++;
        qty += parseFloat(row.qty);
        amount += row.amount;
        profit += row.profit;
      }
    });

    setTotalItems(items);
    setTotalQty(qty);
    setTotalAmount(amount);
    setTotalProfit(profit);
    
    const payment = parseFloat(paymentAmount) || 0;
    setDueAmount(amount - payment);
  }, [rows, paymentAmount]);

  useEffect(() => {
    updateSummary();
  }, [rows, paymentAmount, updateSummary]);

  const getCustomerData = () => {
    if (customerName || phoneNumber || email || address) {
      if (!phoneNumber) {
        Alert.alert("Validation Error", "Phone number is required when customer information is provided");
        return null;
      }
      return {
        customerName: customerName || "",
        phoneNumber: phoneNumber,
        email: email || "",
        address: address || "",
      };
    }
    return null;
  };

  const saveAll = async () => {
    const saleItems: any[] = [];
    let hasErrors = false;

    const totalSaleAmount = totalAmount;
    const payment = parseFloat(paymentAmount) || 0;
    const due = totalSaleAmount - payment;

    if (due > 0) {
      if (!phoneNumber) {
        Alert.alert("Validation Error", "Phone number is required for due payment transactions");
        return;
      }
      if (!customerName) {
        Alert.alert("Validation Error", "Customer name is required for due payment transactions");
        return;
      }
    }

    if (payment > 0 && !paymentMethod) {
      Alert.alert("Validation Error", "Please select a payment method");
      return;
    }

    for (const row of rows) {
      if (row.isPopulated) {
        const qty = parseFloat(row.qty) || 0;
        if (qty > 0) {
          if (row.salePrice <= 0) {
            Alert.alert("Validation Error", `Please enter a valid sale price for product ${row.productName}`);
            hasErrors = true;
            break;
          }
          
          saleItems.push({
            productId: row.productId,
            productName: row.productName,
            quantity: qty,
            SalesValue: row.salePrice,
            unitPrice: row.unitPrice,
            totalAmount: row.amount,
            profit: row.profit,
            category: row.category,
            organizationId: organizationId || 0,
          });
        }
      }
    }

    if (hasErrors || saleItems.length === 0) {
      if (saleItems.length === 0) {
        Alert.alert("No Items", "Please select products and enter quantities");
      }
      return;
    }

    const saleData: any = {
      transactionDate: new Date().toISOString(),
      dailyExpense: parseFloat(dailyExpense) || 0,
      TransactionType: "OUT",
      items: saleItems,
      organizationId: organizationId,
      PaymentAmount: payment,
      PaymentMethod: paymentMethod,
      PaymentReference: paymentReference,
    };

    const customerData = getCustomerData();
    if (customerData) {
      saleData.customer = customerData;
    }

    setLoading(true);

    try {
      const response = await apiRequest("/Stock/SaveAPI", apiKey, {
        method: "POST",
        body: JSON.stringify(saleData),
      });

      if (response.Success) {
        const successMessage = `Sales saved successfully!\nTransaction: #${response.TransactionNumber || ""}${
          due > 0 ? `\nDue Amount: ৳${due.toFixed(2)}` : ""
        }`;
        
        Alert.alert("Success", successMessage, [
          { text: "OK", onPress: () => refreshTable() }
        ]);
      } else {
        Alert.alert("Error", response.message || "Error saving sales");
      }
    } catch (error: any) {
      console.error("Error:", error);
      Alert.alert("Error", `Error saving sales: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBackPress = () => {
    router.push("/sales_list");
  };

  const openCategoryModal = (rowId: number) => {
    setCurrentRowId(rowId);
    setCategoryModalVisible(true);
  };

  const openProductModal = (rowId: number) => {
    const row = rows.find(r => r.id === rowId);
    setTempCategory(row?.category || "");
    setCurrentRowId(rowId);
    setProductModalVisible(true);
  };

  if (loading && categories.length === 0 && products.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#28a745" />
          <ThemedText style={{ marginTop: 10 }}>Loading...</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Category Modal */}
      <SearchableCategoryModal
        visible={categoryModalVisible}
        onClose={() => {
          setCategoryModalVisible(false);
          setCurrentRowId(null);
        }}
        onSelect={(category: string) => {
          if (currentRowId) {
            onCategorySelect(currentRowId, category);
          }
        }}
        categories={categories}
        title="Select Category"
      />
      
      {/* Product Modal */}
      <SearchableProductModal
        visible={productModalVisible}
        onClose={() => {
          setProductModalVisible(false);
          setCurrentRowId(null);
          setTempCategory("");
        }}
        onSelect={(product: any) => {
          if (currentRowId) {
            onProductSelect(currentRowId, product);
          }
        }}
        products={products}
        title="Select Product"
        selectedCategory={tempCategory}
      />

      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: "#fff" }]}>
            <View style={[styles.modalHeader, { backgroundColor: "#28a745" }]}>
              <ThemedText style={styles.modalHeaderText}>{modalTitle}</ThemedText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <ThemedText style={styles.modalMessage}>{modalMessage}</ThemedText>
            </View>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: "#28a745" }]}
              onPress={() => setModalVisible(false)}
            >
              <ThemedText style={styles.modalButtonText}>OK</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity style={styles.whiteBtn} onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={20} color="#333" />
          <ThemedText style={styles.btnTextBlack}> Back</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.greenBtn} onPress={saveAll}>
          <ThemedText style={styles.btnTextWhite}>Save All</ThemedText>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        <ThemedText style={styles.mainTitle}>Sales Entry</ThemedText>

        {/* Organization Selector */}
        {organizations.length > 0 && (
          <View style={styles.card}>
            <View style={styles.row}>
              <Ionicons name="business" size={18} color="#28a745" />
              <ThemedText style={[styles.sectionTitle, { marginBottom: 0, marginLeft: 8 }]}>Organization</ThemedText>
            </View>
            <View style={styles.pickerWrapper}>
              <Picker
                mode="dropdown"
                style={styles.pickerStyle}
                selectedValue={organizationId || 0}
                onValueChange={handleOrgChange}
              >
                <Picker.Item label="-- Select Organization --" value={0} />
                {organizations.map((org) => (
                  <Picker.Item
                    key={org.OrganizationId}
                    label={org.OrganizationName || `Organization ${org.OrganizationId}`}
                    value={org.OrganizationId}
                  />
                ))}
              </Picker>
            </View>
            {organizationName ? (
              <ThemedText style={styles.selectedOrgText}>
                Selected: {organizationName}
              </ThemedText>
            ) : null}
          </View>
        )}

        {/* Date & Control Buttons */}
        <View style={styles.card}>
          <ThemedText style={styles.label}>Date *</ThemedText>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: "#f9f9f9" }]}
              value={transactionDate}
              editable={false}
            />
            <TouchableOpacity onPress={() => addEmptyRows(5)} style={styles.addBtn}>
              <ThemedText style={styles.btnTextWhite}>+ Add 5 Rows</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity onPress={refreshTable} style={styles.refreshBtn}>
              <Ionicons name="refresh" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.card}>
          <ThemedText style={styles.sectionTitle}>Customer Information</ThemedText>
          <View style={styles.formGrid}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Name</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Enter Name"
                placeholderTextColor="#999"
                value={customerName}
                onChangeText={setCustomerName}
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Phone Number</ThemedText>
              <TextInput
                style={styles.input}
                keyboardType="phone-pad"
                placeholder="01XXX..."
                placeholderTextColor="#999"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                onBlur={() => loadCustomerByPhoneNumber(phoneNumber)}
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Email</ThemedText>
              <TextInput
                style={styles.input}
                keyboardType="email-address"
                placeholder="example@mail.com"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Address</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Full Address"
                placeholderTextColor="#999"
                value={address}
                onChangeText={setAddress}
              />
            </View>
          </View>
        </View>

        {/* Payment Information */}
        <View style={[styles.card, { backgroundColor: "#e7f3ff", borderColor: "#b6d4fe" }]}>
          <View style={[styles.row, { marginBottom: 10 }]}>
            <Ionicons name="person" size={18} color="#0d6efd" />
            <ThemedText style={styles.blueTitle}>Payment Information</ThemedText>
          </View>
          <View style={styles.formGrid}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Payment Amount (৳)</ThemedText>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="0.00"
                placeholderTextColor="#999"
                value={paymentAmount}
                onChangeText={(text) => {
                  setPaymentAmount(text);
                  updateSummary();
                }}
              />
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Payment Method</ThemedText>
              <View style={styles.pickerWrapper}>
                <Picker
                  mode="dropdown"
                  style={styles.pickerStyle}
                  selectedValue={paymentMethod || "Cash"}
                  onValueChange={(itemValue) => setPaymentMethod(itemValue)}
                >
                  <Picker.Item label="Cash" value="Cash" />
                  <Picker.Item label="Bank Transfer" value="Bank" />
                  <Picker.Item label="Mobile Banking" value="Mobile Banking" />
                  <Picker.Item label="Check" value="Check" />
                  <Picker.Item label="Card" value="Card" />
                </Picker>
              </View>
            </View>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Reference (Optional)</ThemedText>
              <TextInput
                style={styles.input}
                placeholder="Check/Transaction No"
                placeholderTextColor="#999"
                value={paymentReference}
                onChangeText={setPaymentReference}
              />
            </View>
          </View>
          <View style={[styles.row, { justifyContent: "space-between", marginTop: 15, paddingHorizontal: 5 }]}>
            <ThemedText style={styles.paymentText}>Total Sale: ৳{totalAmount.toFixed(2)}</ThemedText>
            <ThemedText style={[styles.paymentText, { color: "green" }]}>
              Payment: ৳{(parseFloat(paymentAmount) || 0).toFixed(2)}
            </ThemedText>
            <ThemedText style={[styles.paymentText, { color: "red" }]}>
              Due: ৳{dueAmount.toFixed(2)}
            </ThemedText>
          </View>
        </View>

        {/* Product Table */}
        <ScrollView horizontal style={{ marginTop: 10 }}>
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <ThemedText style={[styles.hCell, styles.borderRight, { width: 40 }]}>#</ThemedText>
              <ThemedText style={[styles.hCell, styles.borderRight, { width: 150 }]}>Category</ThemedText>
              <ThemedText style={[styles.hCell, styles.borderRight, { width: 200 }]}>Product Name</ThemedText>
              <ThemedText style={[styles.hCell, styles.borderRight, { width: 70 }]}>Stock</ThemedText>
              <ThemedText style={[styles.hCell, styles.borderRight, { width: 80 }]}>Qty</ThemedText>
              <ThemedText style={[styles.hCell, styles.borderRight, { width: 100 }]}>Sale Price (৳)</ThemedText>
              <ThemedText style={[styles.hCell, styles.borderRight, { width: 100 }]}>Amount (৳)</ThemedText>
              <ThemedText style={[styles.hCell, { width: 90 }]}>Profit</ThemedText>
              <ThemedText style={[styles.hCell, { width: 70 }]}>Action</ThemedText>
            </View>

            {rows.map((item, index) => (
              <View key={item.id} style={styles.tableRow}>
                <ThemedText style={[styles.cell, styles.borderRight, { width: 40 }]}>
                  {index + 1}
                </ThemedText>
                
                {/* Category Button with Search */}
                <TouchableOpacity
                  style={[styles.borderRight, { width: 150, padding: 5 }]}
                  onPress={() => openCategoryModal(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.searchableField}>
                    <ThemedText style={item.category ? styles.selectedText : styles.placeholderText}>
                      {item.category || "Select Category"}
                    </ThemedText>
                    <Ionicons name="search" size={18} color="#666" />
                  </View>
                </TouchableOpacity>
                
                {/* Product Button with Search */}
                <TouchableOpacity
                  style={[styles.borderRight, { width: 200, padding: 5 }]}
                  onPress={() => openProductModal(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.searchableField}>
                    <ThemedText style={item.productName ? styles.selectedText : styles.placeholderText}>
                      {item.productName || "Select Product"}
                    </ThemedText>
                    <Ionicons name="search" size={18} color="#666" />
                  </View>
                </TouchableOpacity>
                
                {/* Stock Display */}
                <ThemedText
                  style={[
                    styles.cell,
                    styles.borderRight,
                    { width: 70, color: item.stock <= 5 ? "#dc3545" : "#28a745" },
                  ]}
                >
                  {item.stock}
                </ThemedText>
                
                {/* Quantity Input */}
                <View style={[styles.borderRight, { width: 80, padding: 5 }]}>
                  <TextInput
                    style={styles.tableInput}
                    keyboardType="numeric"
                    placeholder="0"
                    value={item.qty}
                    onChangeText={(text) => onQuantityChange(item.id, text)}
                    editable={item.isPopulated}
                  />
                </View>
                
                {/* Sale Price Input */}
                <View style={[styles.borderRight, { width: 100, padding: 5 }]}>
                  <TextInput
                    style={styles.tableInput}
                    keyboardType="numeric"
                    placeholder="0"
                    value={item.salePrice.toString()}
                    onChangeText={(text) => onSalePriceChange(item.id, text)}
                  />
                </View>
                
                {/* Amount Display */}
                <ThemedText style={[styles.cell, styles.borderRight, { width: 100 }]}>
                  {item.amount.toFixed(2)}
                </ThemedText>
                
                {/* Profit Display */}
                <View style={[styles.borderRight, { width: 90, padding: 5 }]}>
                  {item.loadingProfit ? (
                    <ActivityIndicator size="small" color="#28a745" />
                  ) : (
                    <ThemedText style={[styles.cell, { color: item.profit >= 0 ? "#28a745" : "#dc3545" }]}>
                      {item.profit.toFixed(2)} ({item.profitPercentage.toFixed(1)}%)
                    </ThemedText>
                  )}
                </View>
                
                {/* Action Buttons */}
                <View style={[styles.cell, { width: 70, flexDirection: "row", justifyContent: "center", gap: 5 }]}>
                  <TouchableOpacity onPress={() => deleteRow(item.id)}>
                    <Ionicons name="trash" size={22} color="#dc3545" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Sales Summary */}
        <View style={styles.summaryCard}>
          <ThemedText style={styles.summaryTitle}>SALES SUMMARY - {organizationName}</ThemedText>
          <View style={styles.sumRow}>
            <ThemedText style={styles.sumLabel}>Total Items:</ThemedText>
            <ThemedText style={styles.sumVal}>{totalItems}</ThemedText>
          </View>
          <View style={styles.sumRow}>
            <ThemedText style={styles.sumLabel}>Total Quantity:</ThemedText>
            <ThemedText style={styles.sumVal}>{totalQty.toFixed(2)} pcs</ThemedText>
          </View>
          <View style={styles.sumRow}>
            <ThemedText style={styles.sumLabel}>Total Sales Amount:</ThemedText>
            <ThemedText style={styles.sumVal}>৳{totalAmount.toFixed(2)}</ThemedText>
          </View>
          <View style={styles.sumRow}>
            <ThemedText style={styles.sumLabel}>Total Profit:</ThemedText>
            <ThemedText style={styles.sumVal}>৳{totalProfit.toFixed(2)}</ThemedText>
          </View>
          <View style={styles.sumRow}>
            <ThemedText style={styles.sumLabel}>Payment Amount:</ThemedText>
            <ThemedText style={styles.sumVal}>৳{(parseFloat(paymentAmount) || 0).toFixed(2)}</ThemedText>
          </View>
          <View style={styles.sumRow}>
            <ThemedText style={[styles.sumLabel, { color: "red" }]}>Due Amount:</ThemedText>
            <ThemedText style={{ color: "red", fontWeight: "bold" }}>৳{dueAmount.toFixed(2)}</ThemedText>
          </View>
        </View>

        {/* Bottom Actions */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#f8d7da", borderWidth: 1, borderColor: "#f5c6cb" }]}
            onPress={refreshTable}
          >
            <ThemedText style={{ color: "#721c24", fontWeight: "bold" }}>Clear All</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#17a2b8", borderWidth: 1, borderColor: "#148ea1" }]}
            onPress={saveAll}
          >
            <ThemedText style={{ color: "#fff", fontWeight: "bold" }}>Save & Print Invoice</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: "#28a745" }]}
            onPress={saveAll}
          >
            <ThemedText style={{ color: "#fff", fontWeight: "bold" }}>Save</ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f7f6" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  topHeader: { flexDirection: "row", justifyContent: "space-between", padding: 10, gap: 10, backgroundColor: "#fff" },
  scrollView: { padding: 10 },
  mainTitle: { fontSize: 20, color: "#333", marginBottom: 15, fontWeight: "500" },
  card: { backgroundColor: "#fff", padding: 12, borderRadius: 6, marginBottom: 15, borderWidth: 1, borderColor: "#ddd" },
  sectionTitle: { fontSize: 15, fontWeight: "bold", color: "#444", borderBottomWidth: 1, borderBottomColor: "#eee", paddingBottom: 8, marginBottom: 12 },
  blueTitle: { color: "#0d6efd", fontWeight: "bold", fontSize: 15, marginLeft: 8 },
  label: { fontSize: 13, fontWeight: "600", color: "#555", marginBottom: 5 },
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 4, paddingHorizontal: 10, height: 45, backgroundColor: "#fff", color: "#000", fontSize: 15 },
  formGrid: { gap: 12 },
  inputGroup: { width: "100%" },
  row: { flexDirection: "row", alignItems: "center" },
  addBtn: { backgroundColor: "#28a745", height: 45, paddingHorizontal: 15, borderRadius: 4, justifyContent: "center", marginLeft: 10 },
  pickerWrapper: { borderWidth: 1, borderColor: "#ccc", borderRadius: 4, height: 45, backgroundColor: "#fff", justifyContent: "center" },
  pickerStyle: { height: 55, width: "100%" },
  paymentText: { fontSize: 14, fontWeight: "bold" },
  tableContainer: { borderWidth: 1, borderColor: "#aaa", borderRadius: 4, overflow: "hidden", minWidth: "100%" },
  tableHeader: { flexDirection: "row", backgroundColor: "#d1e7dd" },
  tableRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderTopWidth: 1, borderTopColor: "#aaa" },
  hCell: { paddingVertical: 10, textAlign: "center", fontWeight: "bold", fontSize: 12, color: "#333" },
  cell: { paddingVertical: 10, textAlign: "center", fontSize: 13, color: "#333" },
  borderRight: { borderRightWidth: 1, borderRightColor: "#aaa" },
  tableInput: { borderWidth: 1, borderColor: "#bbb", height: 35, textAlign: "center", borderRadius: 3, backgroundColor: "#fff", color: "#000", fontSize: 14, padding: 0 },
  summaryCard: { backgroundColor: "#d4edda", padding: 15, borderRadius: 6, marginTop: 15, borderWidth: 1, borderColor: "#c3e6cb" },
  summaryTitle: { fontSize: 14, color: "#155724", marginBottom: 12, fontWeight: "bold", borderBottomWidth: 1, borderBottomColor: "#c3e6cb", paddingBottom: 5 },
  sumRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: "#badbcc" },
  sumLabel: { fontSize: 14, color: "#444" },
  sumVal: { fontSize: 14, fontWeight: "600" },
  bottomBar: { flexDirection: "row", justifyContent: "space-between", gap: 8, paddingVertical: 25, paddingBottom: 40 },
  actionBtn: { flex: 1, height: 45, borderRadius: 4, justifyContent: "center", alignItems: "center", padding: 10 },
  greenBtn: { backgroundColor: "#5cb85c", height: 35, paddingHorizontal: 15, borderRadius: 4, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  whiteBtn: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#ccc", height: 35, paddingHorizontal: 15, borderRadius: 4, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  btnTextWhite: { color: "#fff", fontWeight: "bold", fontSize: 14 },
  btnTextBlack: { color: "#333", fontSize: 14 },
  refreshBtn: { backgroundColor: "#17a2b8", height: 45, width: 45, borderRadius: 4, justifyContent: "center", alignItems: "center", marginLeft: 10 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "85%", borderRadius: 8, overflow: "hidden", backgroundColor: "#fff" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 15 },
  modalHeaderText: { fontSize: 18, fontWeight: "bold", color: "#fff" },
  modalBody: { padding: 20 },
  modalMessage: { fontSize: 16, textAlign: "center" },
  modalButton: { margin: 15, padding: 10, borderRadius: 4, alignItems: "center" },
  modalButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  selectedOrgText: { fontSize: 12, color: "#28a745", marginTop: 8, textAlign: "center", fontWeight: "bold" },
  
  // Searchable Field Styles
  searchableField: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#bbb",
    borderRadius: 3,
    paddingHorizontal: 8,
    height: 35,
    backgroundColor: "#fff",
  },
  selectedText: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
  placeholderText: {
    fontSize: 13,
    color: "#999",
  },
  
  // Search Modal Styles
  searchModalContainer: {
    backgroundColor: "#fff",
    borderRadius: 12,
    width: "90%",
    maxHeight: "80%",
    overflow: "hidden",
  },
  searchModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#f8f9fa",
  },
  searchModalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    backgroundColor: "#fff",
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 16,
    color: "#333",
  },
  searchModalItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  searchModalItemText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  productCategoryText: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  productItemContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  productStockText: {
    fontSize: 12,
    color: "#28a745",
    fontWeight: "bold",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
  },
  filterBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 15,
    paddingVertical: 8,
    backgroundColor: "#e7f1ff",
    marginHorizontal: 12,
    marginTop: 10,
    borderRadius: 6,
  },
  filterBadgeText: {
    fontSize: 12,
    color: "#007bff",
  },
});