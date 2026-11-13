export type SampleBillItem = {
  id: string;
  description: string;
  dateAndQuantity: string;
  quantity: number;
  unitPrice: number;
  total: number;
  possibleRepeat?: boolean;
};

export const sampleBillItems: readonly SampleBillItem[] = [
  {
    id: "room-charges",
    description: "Room charges",
    dateAndQuantity: "10–12 May 2025 · 2 nights",
    quantity: 2,
    unitPrice: 9000,
    total: 18000,
  },
  {
    id: "lab-panel-a",
    description: "Lab panel",
    dateAndQuantity: "12 May 2025 · 1 × ₹4,800",
    quantity: 1,
    unitPrice: 4800,
    total: 4800,
    possibleRepeat: true,
  },
  {
    id: "lab-panel-b",
    description: "Lab panel",
    dateAndQuantity: "12 May 2025 · 1 × ₹4,800",
    quantity: 1,
    unitPrice: 4800,
    total: 4800,
    possibleRepeat: true,
  },
  {
    id: "medicines",
    description: "Medicines & supplies",
    dateAndQuantity: "12 May 2025 · 5 units",
    quantity: 5,
    unitPrice: 1250,
    total: 6250,
  },
  {
    id: "consultation",
    description: "Consultation",
    dateAndQuantity: "12 May 2025 · 1 visit",
    quantity: 1,
    unitPrice: 3000,
    total: 3000,
  },
];

export const sampleBillTotal = sampleBillItems.reduce((sum, item) => sum + item.total, 0);
export const sampleBillLinesToVerify = sampleBillItems.filter((item) => item.possibleRepeat).length;

export function formatRupees(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}
