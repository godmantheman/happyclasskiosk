export interface Product {
  id: string;
  name: string;
  price: number;
  image: string;
  category: "food" | "drink" | "dessert";
  description: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface PaymentHistory {
  id: string;
  customerName: string;
  timestamp: string;
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
  totalPrice: number;
  paidAmount: number;
  method: "cash" | "card";
  change: number;
}

export interface DetectedCoin {
  type: "coin" | "bill";
  value: number;
  orientation: string;
}

export interface DetectionResult {
  detected: DetectedCoin[];
  total: number;
  explanation: string;
}
