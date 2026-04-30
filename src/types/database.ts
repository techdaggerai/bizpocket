export type NotificationType = 'invoice_overdue' | 'payment_due' | 'tax_deadline' | 'low_balance' | 'expense_reminder' | 'planner_reminder' | 'new_message' | 'new_contact' | 'trial_expiring' | 'limit_reached' | 'system';

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
  address: string | null;
  phone: string | null;
  tax_number: string | null;
  bank_name: string | null;
  bank_branch: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  bank_account_type: string | null;
  logo_url: string | null;
  signup_source: 'bizpocket' | 'pocketchat' | null;
  created_at: string;
}

export interface Profile {
  id: string;
  user_id: string;
  organization_id: string;
  role: UserRole;
  name: string;
  full_name?: string;
  email: string;
  phone?: string | null;
  phone_e164?: string | null;
  verified_at?: string | null;
  verification_method?: 'sms_otp' | 'line' | 'email_magic_link' | null;
  language: string;
  avatar_url?: string | null;
  onboarding_completed?: boolean | null;
  status_message?: string | null;
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
  is_recurring?: boolean;
  recurring_frequency?: string | null;
  recurring_end_date?: string | null;
  parent_recurring_id?: string | null;
  notes?: string | null;
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

export interface InvoiceLineItem {
  id?: string;
  line_number: number;
  description: string;
  chassis_no?: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  tax_amount: number;
  total_price: number;
  discount_percent?: number;
  image_url?: string;
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
  tax_rate?: number;
  tax_amount?: number;
  grand_total?: number;
  notes?: string;
  bank_name?: string;
  bank_branch?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  bank_account_type?: string;
  invoice_prefix?: string;
  sent_at?: string;
  paid_at?: string;
  currency: string;
  status: InvoiceStatus;
  language: string;
  created_by: string;
  pdf_url: string | null;
  chat_token: string | null;
  created_at: string;
}

export interface Customer {
  id: string;
  organization_id: string;
  name: string;
  company?: string;
  address: string;
  phone: string;
  email: string;
  fax?: string;
  notes: string | null;
  created_at: string;
}

export interface ItemTemplate {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  default_price: number;
  default_tax_rate: number;
  created_by: string | null;
  created_at: string;
}

export interface InvoiceChat {
  id: string;
  organization_id: string;
  invoice_id: string;
  sender_type: 'owner' | 'customer';
  sender_name: string | null;
  message: string;
  read_at: string | null;
  created_at: string;
}

export type PlannerEventType = 'incoming_payment' | 'upcoming_expense' | 'meeting' | 'shipment' | 'invoice_due' | 'tax_deadline' | 'recurring' | 'other';

export interface PlannerEvent {
  id: string;
  organization_id: string;
  title: string;
  event_type: PlannerEventType;
  amount: number | null;
  currency: string;
  contact_id: string | null;
  invoice_id: string | null;
  event_date: string;
  event_time: string | null;
  reminder_date: string | null;
  notes: string | null;
  status: string;
  is_recurring: boolean;
  recurring_frequency: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  organization_id: string;
  type: NotificationType;
  title: string;
  body: string;
  action_url: string | null;
  read_at: string | null;
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

export interface PlannedExpense {
  id: string;
  organization_id: string;
  month: string;
  category: string;
  description: string;
  planned_amount: number;
  is_recurring: boolean;
  is_completed: boolean;
  notes: string | null;
  created_by: string;
  created_at: string;
}

export interface PlannedIncome {
  id: string;
  organization_id: string;
  month: string;
  category: string;
  description: string;
  planned_amount: number;
  expected_date: string | null;
  is_completed: boolean;
  notes: string | null;
  created_by: string;
  created_at: string;
}

// ═══ Spaceship Protocol ═══

export interface BusinessCycle {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  business_type: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
}

export interface CycleStage {
  id: string;
  organization_id: string;
  cycle_id: string;
  name: string;
  stage_order: number;
  color: string;
  icon: string | null;
  is_start: boolean;
  is_end: boolean;
  avg_days: number;
  description: string | null;
  created_at: string;
}

export interface CycleItem {
  id: string;
  organization_id: string;
  cycle_id: string;
  item_number: number;
  name: string;
  description: string | null;
  category: string | null;
  reference_id: string | null;
  current_stage_id: string | null;
  entered_current_stage_at: string | null;
  is_bottleneck: boolean;
  bottleneck_days: number;
  purchase_date: string | null;
  purchase_price: number;
  total_cost: number;
  sale_date: string | null;
  sale_price: number;
  profit: number;
  currency: string;
  supplier: string | null;
  customer_id: string | null;
  stakeholder_id: string | null;
  status: 'active' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CycleTransition {
  id: string;
  organization_id: string;
  item_id: string;
  from_stage_id: string | null;
  to_stage_id: string;
  transitioned_at: string;
  days_in_previous_stage: number | null;
  triggered_by: string | null;
  notes: string | null;
  created_at: string;
}

export interface ItemCost {
  id: string;
  organization_id: string;
  item_id: string;
  date: string;
  category: string;
  description: string | null;
  amount: number;
  supplier: string | null;
  receipt_url: string | null;
  cash_flow_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ItemPhoto {
  id: string;
  organization_id: string;
  item_id: string;
  file_url: string;
  thumbnail_url: string | null;
  is_main: boolean;
  stage_id: string | null;
  caption: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface Stakeholder {
  id: string;
  organization_id: string;
  name: string;
  type: 'investor' | 'partner' | 'supplier' | 'client';
  email: string | null;
  phone: string | null;
  company: string | null;
  profit_model: string | null;
  profit_share_pct: number;
  total_invested: number;
  total_returned: number;
  roi: number;
  status: string;
  portal_access: boolean;
  portal_email: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export type InsightType = 'bottleneck' | 'trend' | 'recommendation' | 'anomaly' | 'prediction' | 'pattern';
export type InsightSeverity = 'critical' | 'warning' | 'info' | 'positive';

export interface AiInsight {
  id: string;
  organization_id: string;
  type: InsightType;
  category: string | null;
  severity: InsightSeverity;
  title: string;
  message: string;
  suggestion: string | null;
  item_id: string | null;
  stage_id: string | null;
  stakeholder_id: string | null;
  data_snapshot: Record<string, unknown>;
  confidence: number;
  model_used: string;
  is_read: boolean;
  is_dismissed: boolean;
  is_acted_on: boolean;
  user_feedback: string | null;
  valid_until: string | null;
  created_at: string;
}

export interface AiConversation {
  id: string;
  organization_id: string;
  context: 'onboarding' | 'cycle_setup' | 'weekly_review' | 'daily_briefing' | 'user_question' | 'strategic_analysis';
  role: 'user' | 'assistant';
  content: string;
  metadata: Record<string, unknown>;
  created_by: string | null;
  created_at: string;
}
