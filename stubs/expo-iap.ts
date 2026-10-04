export function useIAP(_secenekler?: any): any {
  return {
    connected: false,
    products: [],
    subscriptions: [],
    availablePurchases: [],
    purchaseHistory: [],
    fetchProducts: async () => [],
    fetchSubscriptions: async () => [],
    getProducts: async () => [],
    getSubscriptions: async () => [],
    requestPurchase: async () => null,
    purchaseProduct: async () => null,
    finishTransaction: async () => true,
    restorePurchases: async () => [],
    clearTransactions: async () => true,
    validateReceipt: async () => ({ isValid: false }),
  };
}

export default { useIAP };