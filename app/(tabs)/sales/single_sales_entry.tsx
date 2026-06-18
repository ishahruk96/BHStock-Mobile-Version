import { ThemedText } from "@/components/themed-text";
import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState, useRef } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Modal,
  FlatList,
} from "react-native";

const BASE_URL = "http://devmystock.byteheart.com";

const SAVE_API_ENDPOINTS = [
  "/Stock/SaveAPI",
  "/api/Stock/SaveAPI",
  "/SaveAPI",
  "/products/Stock/SaveAPI",
  "/api/products/Stock/SaveAPI",
];

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

interface Customer {
  CustomerId?: number;
  CustomerName: string;
  PhoneNumber: string;
  Email: string;
  Address: string;
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
    throw new Error(
      `API Error ${response.status}: ${errorText.substring(0, 200)}`,
    );
  }

  return response.json();
};

// Calculate profit using FIFO API
const calculateFIFOProfit = async (
  organizationId: number | null,
  productId: number,
  quantity: number,
  salesPrice: number,
  apiKey: string,
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

// Generate print receipt content
const generateReceipt = (
  transactionNumber: string,
  cart: any[],
  totalAmount: number,
  paidAmount: number,
  dueAmount: number,
  paymentMethod: string,
  reference: string,
  customerName: string,
  customerPhone: string,
  date: string,
) => {
  const receipt = `
╔════════════════════════════════════╗
║         SALES RECEIPT              ║
╠════════════════════════════════════╣
║ Transaction #: ${transactionNumber}
║ Date: ${date}
║ Time: ${new Date().toLocaleTimeString()}
╠════════════════════════════════════╣
║ CUSTOMER DETAILS                   ║
║ Name: ${customerName || "Walk-in Customer"}
║ Phone: ${customerPhone || "N/A"}
╠════════════════════════════════════╣
║ ITEMS                              ║
${cart
  .map(
    (item) => `║ ${item.productName.substring(0, 30)}
║   Qty: ${item.quantity} × ৳${item.salePrice.toFixed(2)} = ৳${item.total.toFixed(2)}
║   Profit: ৳${item.profit.toFixed(2)} (${item.profitPercentage.toFixed(1)}%)
`,
  )
  .join("║ ────────────────────────────────\n")}
╠════════════════════════════════════╣
║ SUMMARY                            ║
║ Total Amount: ৳${totalAmount.toFixed(2)}
║ Payment: ৳${paidAmount.toFixed(2)}
║ Due: ৳${dueAmount.toFixed(2)}
║ Payment Method: ${paymentMethod}
║ Reference: ${reference || "N/A"}
╠════════════════════════════════════╣
║         THANK YOU!                 ║
╚════════════════════════════════════╝
  `;
  return receipt;
};

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
    console.log("Product selected from modal:", product);
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

export default function SingleSalesEntry() {
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [reference, setReference] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [cart, setCart] = useState<any[]>([]);
  const [loadingProfit, setLoadingProfit] = useState<number | null>(null);
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const [organizationName, setOrganizationName] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [debugInfo, setDebugInfo] = useState("");
  const [isCustomerLoading, setIsCustomerLoading] = useState(false);
  const [customerLookupAttempted, setCustomerLookupAttempted] = useState(false);
  
  // Modal states
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [productModalVisible, setProductModalVisible] = useState(false);
  
  const scrollViewRef = useRef<ScrollView>(null);

  const [date] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  // Load user session on mount
  useEffect(() => {
    loadUserSession();
  }, []);

  // Fetch data when organization changes
  useEffect(() => {
    if (organizationId && apiKey) {
      fetchCategories();
      fetchProducts();
    }
  }, [organizationId, apiKey]);

  // Filter products when category changes
  useEffect(() => {
    if (selectedCategory) {
      const filtered = products.filter(
        (p) => p.Category === selectedCategory
      );
      setFilteredProducts(filtered);
    } else {
      setFilteredProducts([]);
    }
  }, [selectedCategory, products]);

  // Customer phone lookup
  useEffect(() => {
    const lookupCustomer = async () => {
      if (customerPhone && customerPhone.length >= 3) {
        setCustomerLookupAttempted(true);
        const customer = await fetchCustomerByPhone(customerPhone);
        if (customer) {
          // Auto-fill customer information
          setCustomerName(customer.CustomerName || "");
          setCustomerEmail(customer.Email || "");
          setCustomerAddress(customer.Address || "");
        } else {
          // Clear customer fields if not found (but keep phone number)
          if (!customerName) {
            setCustomerName("");
          }
          setCustomerEmail("");
          setCustomerAddress("");
        }
      } else {
        setCustomerLookupAttempted(false);
      }
    };

    // Debounce the API call
    const timer = setTimeout(() => {
      lookupCustomer();
    }, 600);

    return () => clearTimeout(timer);
  }, [customerPhone, organizationId]);

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
          
          // Find default organization
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

  const fetchCategories = async () => {
    try {
      setLoading(true);
      let url = "/Stock/GetCategories";
      if (organizationId) {
        url += `?OrganizationId=${organizationId}`;
      }

      console.log("Fetching categories from:", url);
      const data = await apiRequest(url, apiKey);
      console.log("Categories API Response:", JSON.stringify(data, null, 2));

      let categoriesList: string[] = [];

      if (Array.isArray(data)) {
        if (data.length > 0 && typeof data[0] === "string") {
          categoriesList = data;
        } else if (data.length > 0 && typeof data[0] === "object") {
          categoriesList = data.map(
            (item: any) =>
              item.name ||
              item.categoryName ||
              item.Name ||
              item.CategoryName ||
              item.title ||
              String(item),
          );
        }
      } else if (data && typeof data === "object") {
        if (data.categories && Array.isArray(data.categories)) {
          categoriesList = data.categories;
        } else if (data.data && Array.isArray(data.data)) {
          categoriesList = data.data;
        } else if (data.result && Array.isArray(data.result)) {
          categoriesList = data.result;
        } else {
          for (let key in data) {
            if (Array.isArray(data[key])) {
              categoriesList = data[key];
              break;
            }
          }
        }
      }

      console.log("Processed categories:", categoriesList);
      setCategories(categoriesList);
      setDebugInfo(
        `Categories loaded: ${categoriesList.length}\n${categoriesList.join(", ")}`,
      );

      if (categoriesList.length === 0) {
        console.warn("No categories found in response");
      }
    } catch (error: any) {
      console.error("Error fetching categories:", error);
      setDebugInfo(`Error: ${error.message}`);
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
      console.log(
        "Products API Response (first item):",
        JSON.stringify(data?.[0] || data?.data?.[0], null, 2),
      );

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
      setDebugInfo(
        (prev) => prev + `\nProducts loaded: ${productsList.length}`,
      );
    } catch (error: any) {
      console.error("Error fetching products:", error);
      Alert.alert("Error", `Failed to fetch products: ${error.message}`);
    }
  };

  // Fetch customer by phone number
  const fetchCustomerByPhone = async (phoneNumber: string) => {
    if (!phoneNumber || phoneNumber.length < 3 || !organizationId) {
      return null;
    }

    try {
      setIsCustomerLoading(true);
      const url = `/Customer/GetByPhoneNumber?phoneNumber=${encodeURIComponent(phoneNumber)}&orgId=${organizationId}`;
      const data = await apiRequest(url, apiKey);
      
      if (data.success && data.isData && data.customer) {
        return data.customer;
      }
      return null;
    } catch (error) {
      console.error("Error fetching customer:", error);
      return null;
    } finally {
      setIsCustomerLoading(false);
    }
  };

  // Create new customer
  const createCustomer = async (customerData: Customer) => {
    try {
      const data = await apiRequest("/Customer/Create", apiKey, {
        method: "POST",
        body: JSON.stringify({
          CustomerName: customerData.CustomerName,
          PhoneNumber: customerData.PhoneNumber,
          Email: customerData.Email || "",
          Address: customerData.Address || "",
          OrganizationId: organizationId
        }),
      });

      if (data.success && data.customer) {
        return data.customer;
      }
      return null;
    } catch (error) {
      console.error("Error creating customer:", error);
      return null;
    }
  };

  const handleCategorySelect = (category: string) => {
    console.log("Category selected:", category);
    setSelectedCategory(category);
    // Clear product selection when category changes
    setSelectedProductId(null);
    setSelectedProduct(null);
    setQuantity("");
    setSalePrice("");
  };

  const handleProductSelect = (product: any) => {
    console.log("Product selected:", product);
    // Immediately set the product
    setSelectedProduct(product);
    setSelectedProductId(product.ProductId);
    setSalePrice(String(product.SalesValue || product.UnitPrice || 0));
    // Auto-set category from product
    if (product.Category) {
      setSelectedCategory(product.Category);
    }
    // Clear quantity when product changes
    setQuantity("");
  };

  const handleAddToCart = async () => {
    const qty = parseFloat(quantity);
    const price = parseFloat(salePrice);

    if (!selectedProduct) {
      Alert.alert("Error", "Please select a product");
      return;
    }

    if (isNaN(qty) || qty <= 0) {
      Alert.alert("Error", "Please enter valid quantity");
      return;
    }

    if (isNaN(price) || price <= 0) {
      Alert.alert("Error", "Please enter valid sale price");
      return;
    }

    if (qty > (selectedProduct.CurrentStock || 0)) {
      Alert.alert(
        "Error",
        `Insufficient stock! Available: ${selectedProduct.CurrentStock}`,
      );
      return;
    }

    setLoadingProfit(selectedProduct.ProductId);

    const profitData = await calculateFIFOProfit(
      organizationId,
      selectedProduct.ProductId,
      qty,
      price,
      apiKey,
    );

    setLoadingProfit(null);

    const total = qty * price;
    const profit =
      profitData?.totalProfit || total - qty * (selectedProduct.UnitPrice || 0);
    const profitPercentage = profitData?.profitPercentage || 0;

    setCart([
      ...cart,
      {
        productId: selectedProduct.ProductId,
        productName: selectedProduct.ProductName,
        quantity: qty,
        salePrice: price,
        buyPrice: selectedProduct.UnitPrice,
        total: total,
        profit: profit,
        profitPercentage: profitPercentage,
        averageCostPerUnit: profitData?.averageCostPerUnit,
        currentStock: selectedProduct.CurrentStock,
      },
    ]);

    // Reset after adding to cart
    setSelectedProductId(null);
    setSelectedProduct(null);
    setQuantity("");
    setSalePrice("");
    setSelectedCategory(null);

    Alert.alert("Success", "Product added to cart");
  };

  const saveSale = async (shouldPrint: boolean = false) => {
    if (cart.length === 0) {
      Alert.alert("Error", "Please add at least one product to cart");
      return;
    }

    const totalAmount = cart.reduce((sum, item) => sum + item.total, 0);
    const paidAmount = parseFloat(paymentAmount) || 0;
    const dueAmount = totalAmount - paidAmount;

    if (!paymentMethod) {
      Alert.alert("Error", "Please select a payment method");
      return;
    }

    if (dueAmount > 0 && (!customerName || !customerPhone)) {
      Alert.alert(
        "Error",
        "Customer name and phone are required when there's a due amount"
      );
      return;
    }

    setLoading(true);

    // Check if customer exists or needs to be created
    let customerId = null;
    let customerData = null;
    
    if (customerPhone && customerPhone.length >= 3) {
      try {
        // Try to find existing customer
        const existingCustomer = await fetchCustomerByPhone(customerPhone);
        if (existingCustomer && existingCustomer.CustomerId) {
          customerId = existingCustomer.CustomerId;
          customerData = existingCustomer;
        } else if (customerName) {
          // Create new customer if phone exists but customer not found
          const newCustomer = await createCustomer({
            CustomerName: customerName,
            PhoneNumber: customerPhone,
            Email: customerEmail || "",
            Address: customerAddress || ""
          });
          if (newCustomer && newCustomer.CustomerId) {
            customerId = newCustomer.CustomerId;
            customerData = newCustomer;
          }
        }
      } catch (error) {
        console.error("Error handling customer:", error);
      }
    }

    const saleData: any = {
      TransactionType: "OUT",
      TransactionDate: new Date().toISOString(),
      Remarks: "",
      DailyExpense: 0,
      PaymentStatus: dueAmount > 0 ? "Partial" : "Paid",
      OrganizationId: organizationId,
      PaymentAmount: paidAmount,
      PaymentMethod: paymentMethod,
      PaymentReference: reference || "",
      Items: cart.map((item) => ({
        ProductId: item.productId,
        Quantity: item.quantity,
        UnitPrice: item.buyPrice,
        SalesValue: item.salePrice,
        TotalAmount: item.total,
        PaymentStatus: dueAmount > 0 ? "Partial" : "Paid",
        OrganizationId: organizationId,
      })),
    };

    // Add customer information if available
    if (customerId) {
      saleData.CustomerId = customerId;
    } else if (customerName || customerPhone) {
      saleData.Customer = {
        CustomerName: customerName || "",
        PhoneNumber: customerPhone || "",
        Email: customerEmail || "",
        Address: customerAddress || "",
      };
    }

    try {
      let responseData = null;
      let lastError = null;

      for (const endpoint of SAVE_API_ENDPOINTS) {
        try {
          console.log(`Trying endpoint: ${endpoint}`);
          const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(saleData),
          });

          if (response.ok) {
            responseData = await response.json();
            console.log(`Success with endpoint: ${endpoint}`);
            break;
          } else {
            console.log(`Failed with endpoint ${endpoint}: ${response.status}`);
            lastError = new Error(`HTTP ${response.status}`);
          }
        } catch (error) {
          console.log(`Error with endpoint ${endpoint}:`, error);
          lastError = error;
        }
      }

      if (responseData && (responseData.Success || responseData.success)) {
        const transactionNumber =
          responseData.TransactionNumber ||
          responseData.transactionNumber ||
          `INV-${Date.now()}`;

        let successMessage = `Sales saved successfully!\nTransaction: #${transactionNumber}`;
        if (dueAmount > 0) {
          successMessage += `\nDue Amount: ৳${dueAmount.toFixed(2)}`;
        }
        if (customerData) {
          successMessage += `\nCustomer: ${customerData.CustomerName}`;
        }

        Alert.alert("Success", successMessage, [
          {
            text: "OK",
            onPress: () => {
              if (shouldPrint) {
                handlePrintReceipt(transactionNumber);
              }
              resetForm();
            },
          },
        ]);
      } else {
        throw lastError || new Error("Failed to save sale with all endpoints");
      }
    } catch (error: any) {
      console.error("Save error:", error);
      Alert.alert(
        "Error",
        `Failed to save sale. Please check:\n\n` +
          `1. Server is running\n` +
          `2. API endpoint is correct\n` +
          `3. Network connection\n\n` +
          `Error: ${error.message}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePrintReceipt = async (transactionNumber: string) => {
    const totalAmount = cart.reduce((sum, item) => sum + item.total, 0);
    const paidAmount = parseFloat(paymentAmount) || 0;
    const dueAmount = totalAmount - paidAmount;

    const receipt = generateReceipt(
      transactionNumber,
      cart,
      totalAmount,
      paidAmount,
      dueAmount,
      paymentMethod,
      reference,
      customerName,
      customerPhone,
      date,
    );

    if (Platform.OS === "web") {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
        <html>
          <head>
            <title>Sales Receipt</title>
            <style>
              body { font-family: monospace; padding: 20px; }
              pre { font-size: 14px; }
            </style>
          </head>
          <body>
            <pre>${receipt}</pre>
            <script>window.print();<\/script>
          </body>
        </html>
      `);
        printWindow.document.close();
      }
    } else {
      try {
        await Share.share({
          message: receipt,
          title: "Sales Receipt",
        });
      } catch (error) {
        console.error("Error sharing receipt:", error);
      }
    }
  };

  const resetForm = () => {
    setCart([]);
    setSelectedProductId(null);
    setSelectedProduct(null);
    setSelectedCategory(null);
    setQuantity("");
    setSalePrice("");
    setPaymentAmount("");
    setPaymentMethod("Cash");
    setReference("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setCustomerAddress("");
    setCustomerLookupAttempted(false);
  };

  const handleSaveSale = () => {
    saveSale(false);
  };

  const handleSaveAndPrint = () => {
    saveSale(true);
  };

  const handleOrgChange = (orgId: number | null) => {
    if (!orgId) return;
    
    const selectedOrg = organizations.find(org => org.OrganizationId === orgId);
    if (selectedOrg) {
      setOrganizationId(selectedOrg.OrganizationId);
      setOrganizationName(selectedOrg.OrganizationName || `Organization ${selectedOrg.OrganizationId}`);
      setApiKey(selectedOrg.ApiKey);
      // Reset form when organization changes
      resetForm();
      setCategories([]);
      setProducts([]);
      setFilteredProducts([]);
    }
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.total, 0);
  const totalPaid = parseFloat(paymentAmount) || 0;
  const dueAmount = totalAmount - totalPaid;

  if (loading && categories.length === 0 && products.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#28A745" />
          <ThemedText style={{ marginTop: 10 }}>Loading...</ThemedText>
          {debugInfo ? (
            <ThemedText style={{ fontSize: 10, marginTop: 20, color: "#666" }}>
              {debugInfo}
            </ThemedText>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Category Modal */}
      <SearchableCategoryModal
        visible={categoryModalVisible}
        onClose={() => setCategoryModalVisible(false)}
        onSelect={handleCategorySelect}
        categories={categories}
        title="Select Category"
      />
      
      {/* Product Modal */}
      <SearchableProductModal
        visible={productModalVisible}
        onClose={() => setProductModalVisible(false)}
        onSelect={handleProductSelect}
        products={products}
        title="Select Product"
        selectedCategory={selectedCategory}
      />

      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            <View style={styles.header}>
              <TouchableOpacity>
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
              <ThemedText style={styles.headerTitle}>Single Sales Entry</ThemedText>
              <TouchableOpacity style={styles.saveTopBtn} onPress={handleSaveSale}>
                <ThemedText style={styles.saveTopText}>Save</ThemedText>
              </TouchableOpacity>
            </View>

            <ScrollView 
              ref={scrollViewRef}
              contentContainerStyle={styles.scrollBody}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {/* Organization Selector */}
              {organizations.length > 0 && (
                <View style={styles.sectionCard}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="business" size={18} color="#28A745" />
                    <ThemedText style={styles.cardTitle}>Organization</ThemedText>
                  </View>
                  <View style={styles.pickerContainer}>
                    <Picker
                      selectedValue={organizationId}
                      onValueChange={handleOrgChange}
                      style={styles.picker}
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
                  {organizationName ? (
                    <ThemedText style={styles.selectedOrgText}>
                      Selected: {organizationName}
                    </ThemedText>
                  ) : null}
                </View>
              )}

              {/* Date Section */}
              <View style={styles.sectionCard}>
                <ThemedText style={styles.label}>Date *</ThemedText>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    value={date}
                    editable={false}
                  />
                  <Ionicons
                    name="calendar"
                    size={20}
                    color="#666"
                    style={styles.iconInside}
                  />
                </View>
                <ThemedText style={styles.noteText}>
                  Note: Select product to auto-fill category. Or select category to filter products.
                </ThemedText>
              </View>

              {/* Product Selection Area */}
              <View style={styles.sectionCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="cart" size={18} color="#28A745" />
                  <ThemedText style={styles.cardTitle}>Product Selection</ThemedText>
                </View>

                {/* Product Selection with Search */}
                <ThemedText style={styles.label}>Product *</ThemedText>
                <TouchableOpacity
                  style={styles.searchableField}
                  onPress={() => setProductModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <ThemedText style={selectedProduct ? styles.selectedText : styles.placeholderText}>
                    {selectedProduct ? selectedProduct.ProductName : "Search and select product..."}
                  </ThemedText>
                  <Ionicons name="search" size={20} color="#28A745" />
                </TouchableOpacity>

                {/* Category Selection with Search */}
                <ThemedText style={[styles.label, { marginTop: 12 }]}>Category</ThemedText>
                <TouchableOpacity
                  style={styles.searchableField}
                  onPress={() => setCategoryModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <ThemedText style={selectedCategory ? styles.selectedText : styles.placeholderText}>
                    {selectedCategory || "Search and select category..."}
                  </ThemedText>
                  <Ionicons name="search" size={20} color="#28A745" />
                </TouchableOpacity>

                {categories.length === 0 && !loading && (
                  <ThemedText style={styles.errorText}>
                    No categories available. Please check API connection.
                  </ThemedText>
                )}

                {/* Product Details (when product selected) */}
                {selectedProduct && (
                  <>
                    <View style={styles.row}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <ThemedText style={styles.label}>Current Stock</ThemedText>
                        <TextInput
                          style={[styles.input, styles.disabledInput]}
                          value={String(selectedProduct.CurrentStock || 0)}
                          editable={false}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.label}>Quantity *</ThemedText>
                        <TextInput
                          style={styles.input}
                          placeholder="Enter quantity"
                          keyboardType="numeric"
                          value={quantity}
                          onChangeText={setQuantity}
                        />
                      </View>
                    </View>

                    <View style={styles.row}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <ThemedText style={styles.label}>Buy Price</ThemedText>
                        <TextInput
                          style={[styles.input, styles.disabledInput]}
                          value={String(selectedProduct.UnitPrice || 0)}
                          editable={false}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <ThemedText style={styles.label}>Sale Price *</ThemedText>
                        <TextInput
                          style={styles.input}
                          placeholder="Enter sale price"
                          keyboardType="numeric"
                          value={salePrice}
                          onChangeText={setSalePrice}
                        />
                      </View>
                    </View>

                    {quantity && salePrice && (
                      <View style={styles.row}>
                        <View style={{ flex: 1, marginRight: 10 }}>
                          <ThemedText style={styles.label}>Total</ThemedText>
                          <TextInput
                            style={[styles.input, styles.disabledInput]}
                            value={(
                              parseFloat(quantity) * parseFloat(salePrice)
                            ).toFixed(2)}
                            editable={false}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <ThemedText style={styles.label}>Profit</ThemedText>
                          {loadingProfit === selectedProduct.ProductId ? (
                            <ActivityIndicator
                              size="small"
                              color="#28A745"
                              style={{ marginTop: 10 }}
                            />
                          ) : (
                            <TextInput
                              style={[
                                styles.input,
                                styles.disabledInput,
                                styles.profitInput,
                              ]}
                              value={(
                                parseFloat(quantity) * parseFloat(salePrice) -
                                parseFloat(quantity) *
                                  (selectedProduct.UnitPrice || 0)
                              ).toFixed(2)}
                              editable={false}
                            />
                          )}
                        </View>
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.addToCartBtn}
                      onPress={handleAddToCart}
                      disabled={loadingProfit !== null}
                    >
                      <Ionicons name="add-circle" size={20} color="#fff" />
                      <ThemedText style={styles.addToCartText}>
                        Add to Cart
                      </ThemedText>
                    </TouchableOpacity>
                  </>
                )}
              </View>

              {/* Cart Items */}
              {cart.length > 0 && (
                <View style={styles.sectionCard}>
                  <View style={styles.cardHeader}>
                    <Ionicons name="cart" size={18} color="#28A745" />
                    <ThemedText style={styles.cardTitle}>
                      Cart Items ({cart.length})
                    </ThemedText>
                  </View>
                  {cart.map((item, index) => (
                    <View key={index} style={styles.cartItem}>
                      <View style={styles.cartItemInfo}>
                        <ThemedText style={styles.cartItemName}>
                          {item.productName}
                        </ThemedText>
                        <ThemedText style={styles.cartItemDetails}>
                          Qty: {item.quantity} × ৳{item.salePrice.toFixed(2)} = ৳
                          {item.total.toFixed(2)}
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.cartItemProfit,
                            item.profitPercentage >= 0
                              ? styles.profitPositive
                              : styles.profitNegative,
                          ]}
                        >
                          Profit: ৳{item.profit.toFixed(2)} (
                          {item.profitPercentage.toFixed(1)}%)
                        </ThemedText>
                      </View>
                      <TouchableOpacity
                        onPress={() => setCart(cart.filter((_, i) => i !== index))}
                      >
                        <Ionicons name="trash-outline" size={22} color="#DC3545" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <View style={styles.cartTotal}>
                    <ThemedText style={styles.cartTotalLabel}>Cart Total:</ThemedText>
                    <ThemedText style={styles.cartTotalValue}>
                      ৳{totalAmount.toFixed(2)}
                    </ThemedText>
                  </View>
                </View>
              )}

              {/* Payment Information */}
              <View style={styles.sectionCard}>
                <View style={styles.cardHeader}>
                  <FontAwesome5 name="credit-card" size={16} color="#28A745" />
                  <ThemedText style={styles.cardTitle}>
                    Payment Information
                  </ThemedText>
                </View>

                <ThemedText style={styles.label}>Payment Amount (৳) *</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  value={paymentAmount}
                  onChangeText={setPaymentAmount}
                />

                <ThemedText style={styles.label}>Payment Method</ThemedText>
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={paymentMethod}
                    onValueChange={(item) => setPaymentMethod(item)}
                  >
                    <Picker.Item label="Cash" value="Cash" />
                    <Picker.Item label="Bank" value="Bank" />
                    <Picker.Item label="Mobile Banking" value="Mobile Banking" />
                    <Picker.Item label="Check" value="Check" />
                    <Picker.Item label="Card" value="Card" />
                  </Picker>
                </View>

                <ThemedText style={styles.label}>Reference (Optional)</ThemedText>
                <TextInput
                  style={styles.input}
                  placeholder="Check/Transaction No"
                  value={reference}
                  onChangeText={setReference}
                />

                <ThemedText style={styles.label}>Due Amount</ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    styles.disabledInput,
                    {
                      color: dueAmount > 0 ? "#DC3545" : "#28A745",
                      fontWeight: "bold",
                    },
                  ]}
                  value={`${dueAmount.toFixed(2)} ৳`}
                  editable={false}
                />

                <View style={styles.summaryTable}>
                  <SummaryRow
                    label="Total Sale:"
                    value={`৳${totalAmount.toFixed(2)}`}
                    color="#28A745"
                  />
                  <SummaryRow
                    label="Payment:"
                    value={`৳${totalPaid.toFixed(2)}`}
                    color="#28A745"
                  />
                  <SummaryRow
                    label="Due:"
                    value={`৳${dueAmount.toFixed(2)}`}
                    color={dueAmount > 0 ? "#DC3545" : "#28A745"}
                  />
                </View>
              </View>

              {/* Customer Information */}
              <View style={styles.sectionCard}>
                <View style={styles.cardHeader}>
                  <Ionicons name="person" size={18} color="#28A745" />
                  <ThemedText style={styles.cardTitle}>
                    Customer Information
                  </ThemedText>
                </View>

                <View style={{ marginBottom: 12 }}>
                  <View style={styles.labelRow}>
                    <Ionicons name="call-outline" size={14} color="#666" />
                    <ThemedText style={[styles.label, { marginBottom: 0, marginLeft: 5 }]}>
                      Phone Number
                    </ThemedText>
                    {isCustomerLoading && (
                      <ActivityIndicator size="small" color="#28A745" style={{ marginLeft: 8 }} />
                    )}
                  </View>
                  <View style={styles.phoneInputContainer}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="Enter phone number to lookup"
                      keyboardType="phone-pad"
                      value={customerPhone}
                      onChangeText={setCustomerPhone}
                    />
                    {customerPhone && customerPhone.length >= 3 && !isCustomerLoading && (
                      <TouchableOpacity 
                        onPress={async () => {
                          const customer = await fetchCustomerByPhone(customerPhone);
                          if (customer) {
                            setCustomerName(customer.CustomerName || "");
                            setCustomerEmail(customer.Email || "");
                            setCustomerAddress(customer.Address || "");
                          }
                        }}
                        style={styles.searchButton}
                      >
                        <Ionicons name="search" size={20} color="#28A745" />
                      </TouchableOpacity>
                    )}
                  </View>
                  {customerPhone && customerPhone.length >= 3 && !isCustomerLoading && customerLookupAttempted && (
                    <ThemedText style={[
                      styles.hintText,
                      customerName || customerEmail || customerAddress ? styles.successText : styles.warningText
                    ]}>
                      {customerName || customerEmail || customerAddress ? 
                        "✓ Customer found! Information auto-filled." : 
                        "No customer found. New customer will be created on save."}
                    </ThemedText>
                  )}
                </View>

                <View style={{ marginBottom: 12 }}>
                  <View style={styles.labelRow}>
                    <Ionicons name="person-outline" size={14} color="#666" />
                    <ThemedText style={[styles.label, { marginBottom: 0, marginLeft: 5 }]}>
                      Customer Name {customerPhone && customerPhone.length >= 3 && !customerName && customerLookupAttempted && "*"}
                    </ThemedText>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Customer name (required for new customers)"
                    value={customerName}
                    onChangeText={setCustomerName}
                  />
                </View>

                <View style={{ marginBottom: 12 }}>
                  <View style={styles.labelRow}>
                    <Ionicons name="mail-outline" size={14} color="#666" />
                    <ThemedText style={[styles.label, { marginBottom: 0, marginLeft: 5 }]}>
                      Email
                    </ThemedText>
                  </View>
                  <TextInput
                    style={styles.input}
                    placeholder="Optional"
                    keyboardType="email-address"
                    value={customerEmail}
                    onChangeText={setCustomerEmail}
                  />
                </View>

                <View style={{ marginBottom: 12 }}>
                  <View style={styles.labelRow}>
                    <Ionicons name="location-outline" size={14} color="#666" />
                    <ThemedText style={[styles.label, { marginBottom: 0, marginLeft: 5 }]}>
                      Address
                    </ThemedText>
                  </View>
                  <TextInput
                    style={[styles.input, { minHeight: 45 }]}
                    placeholder="Optional"
                    multiline
                    value={customerAddress}
                    onChangeText={setCustomerAddress}
                  />
                </View>
              </View>

              {/* Action Buttons */}
              <View style={styles.footerAction}>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#6C757D" }]}
                  onPress={resetForm}
                >
                  <ThemedText style={styles.btnText}>Clear All</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.actionBtn,
                    { backgroundColor: "#17A2B8", flex: 1.5 },
                  ]}
                  onPress={handleSaveAndPrint}
                >
                  <ThemedText style={styles.btnText}>Save & Print</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: "#28A745" }]}
                  onPress={handleSaveSale}
                >
                  <ThemedText style={styles.btnText}>Save</ThemedText>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Reusable Components
const SummaryRow = ({ label, value, color }: any) => (
  <View style={styles.summaryRow}>
    <ThemedText style={styles.summaryLabel}>{label}</ThemedText>
    <ThemedText style={[styles.summaryValue, { color }]}>{value}</ThemedText>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    backgroundColor: "white",
    elevation: 2,
    zIndex: 1,
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  saveTopBtn: {
    backgroundColor: "#28A745",
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saveTopText: { color: "white", fontWeight: "bold" },

  scrollBody: { padding: 12, paddingBottom: 40 },
  sectionCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 15,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    paddingBottom: 8,
  },
  cardTitle: { fontSize: 15, fontWeight: "bold", marginLeft: 8, color: "#333" },

  label: { fontSize: 13, color: "#555", marginBottom: 6, fontWeight: "500" },
  input: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 45,
    fontSize: 14,
    backgroundColor: "#FAFAFA",
  },
  disabledInput: { backgroundColor: "#F5F5F5", color: "#888" },
  profitInput: { color: "#28A745", fontWeight: "600" },
  inputRow: { flexDirection: "row", alignItems: "center" },
  iconInside: { position: "absolute", right: 12 },

  noteText: {
    fontSize: 11,
    color: "#007BFF",
    backgroundColor: "#E7F3FF",
    padding: 8,
    borderRadius: 6,
    marginTop: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: "#FAFAFA",
  },
  picker: {
    height: 50,
    width: "100%",
  },

  row: { flexDirection: "row", marginBottom: 12, gap: 10 },
  addToCartBtn: {
    flexDirection: "row",
    backgroundColor: "#28A745",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  addToCartText: { color: "white", fontWeight: "bold", marginLeft: 8 },

  summaryTable: {
    backgroundColor: "#F8F9FA",
    padding: 12,
    borderRadius: 10,
    marginTop: 15,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  summaryLabel: { fontSize: 12, fontWeight: "bold", color: "#555" },
  summaryValue: { fontSize: 13, fontWeight: "800" },

  labelRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  footerAction: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    marginBottom: 20,
  },
  actionBtn: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  btnText: { color: "white", fontWeight: "bold", fontSize: 13 },

  cartItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontSize: 14, fontWeight: "500", color: "#333" },
  cartItemDetails: { fontSize: 12, color: "#666", marginTop: 4 },
  cartItemProfit: { fontSize: 11, marginTop: 2 },
  profitPositive: { color: "#28A745" },
  profitNegative: { color: "#DC3545" },
  cartTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#DDD",
  },
  cartTotalLabel: { fontSize: 16, fontWeight: "bold", color: "#333" },
  cartTotalValue: { fontSize: 16, fontWeight: "bold", color: "#28A745" },
  errorText: { fontSize: 12, color: "red", marginTop: 4, textAlign: "center" },
  selectedOrgText: {
    fontSize: 12,
    color: "#28A745",
    marginTop: 8,
    textAlign: "center",
    fontWeight: "bold",
  },
  phoneInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchButton: {
    padding: 10,
    backgroundColor: "#F0F8F0",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#28A745",
  },
  hintText: {
    fontSize: 11,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  successText: {
    color: "#28A745",
  },
  warningText: {
    color: "#FF6B35",
  },
  // Searchable Field Styles
  searchableField: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 45,
    backgroundColor: "#FAFAFA",
    marginBottom: 4,
  },
  selectedText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  placeholderText: {
    fontSize: 14,
    color: "#999",
  },
  // Search Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
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