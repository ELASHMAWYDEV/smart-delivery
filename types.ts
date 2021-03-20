//Order Request

export type OrderRequest = {
  master: {
    receiverName: string;
    receiverMobile: string;
    receiverAddress: string;
    receiverLocation: Array<2>;
    branchLocation: Array<2>;
    branchId: number | null;
    storeCost: number;
    receiverCollected: number;
    isPaid: boolean;
    discount: number;
    tax: number;
    deliveryCost: number;
  };
  items: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
};
