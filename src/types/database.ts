export type UserRole = 'owner' | 'staff' | 'accountant';
export type FlowType = 'IN' | 'OUT';
export type ClassifyAs = 'expense' | 'investment' | 'cash_flow_only';
export type InvoiceStatus = 'draft' | 'sent' | 'paid';
export type PlanTier = 'free' | 'pro' | 'team';

export interface Organization {
  id: string;
  name: string;
  business_type: string;
  language: string;
  currency: string;
  created_by: string;
  plan: PlanTier;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  organization_id: string;
  role: UserRole;
  name: string;
  email: string;
  language: string;
  created_at: string;
}

export interface CashFlow {
  id: string;
  organization_id: string;
  date: string;
  flow_type: FlowType;
  amount: number;
  currency: string;
  category: string;
  from_to: string;
  description: string | null;
  status: string;
  classify_as: ClassifyAs;
  created_by: string;
  created_at: string;
}

export interface Expense {
  id: string;
  organization_id: string;
  cash_flow_id: string | null;
  category: string;
  amount: number;
  date: string;
  status: string;
  notes: string | null;
  receipt_url: string | null;
  created_at: string;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface Invoice {
  id: string;
  organization_id: string;
  invoice_number: string;
  customer_id: string | null;
  customer_name: string;
  customer_address: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  status: InvoiceStatus;
  language: string;
  created_by: string;
  pdf_url: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  organization_id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  notes: string | null;
  created_at: string;
}

export interface Document {
  id: string;
  organization_id: string;
  file_url: string;
  thumbnail_url: string | null;
  title: string;
  category: string;
  ocr_text: string | null;
  amount_detected: number | null;
  date: string;
  uploaded_by: string;
  created_at: string;
}
