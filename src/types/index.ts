export interface ExpenseCategory {
  id: number;
  name: string;
  type: 'media_buying' | 'production' | 'outsourcing' | 'other';
  created_at: string;
}

export interface Client {
  id: number;
  name: string;
  contact_info: string | null;
  notes: string | null;
  created_at: string;
}

export interface Project {
  id: number;
  client_id: number | null;
  name: string;
  description: string | null;
  budget: number;
  start_date: string | null;
  end_date: string | null;
  status: string;
  created_at: string;
  client_name?: string;
  actual_income?: number;
  actual_expense?: number;
}

export interface Revenue {
  id: number;
  project_id: number | null;
  client_id: number;
  amount: number;
  description: string | null;
  invoice_number: string | null;
  payment_date: string | null;
  payment_method: string | null;
  size: string | null;
  square_meters: number;
  status: string;
  notes: string | null;
  created_at: string;
  client_name?: string;
  project_name?: string;
}

export interface Expense {
  id: number;
  project_id: number | null;
  category_id: number;
  amount: number;
  description: string | null;
  expense_date: string | null;
  vendor: string | null;
  payment_method: string | null;
  size: string | null;
  square_meters: number;
  notes: string | null;
  created_at: string;
  category_name?: string;
  project_name?: string;
}

export interface DashboardSummary {
  monthly_income: number;
  monthly_expense: number;
  net_profit: number;
  unpaid_receivables: number;
  monthly_income_trend: { month: string; income: number; expense: number }[];
  category_breakdown: { name: string; amount: number }[];
}

export interface ProfitSummary {
  month: string;
  income: number;
  expense: number;
  profit: number;
}

export interface ProjectProfit {
  project_id: number;
  project_name: string;
  client_name: string;
  participant_clients: string | null;
  income: number;
  expense: number;
  profit: number;
}

export interface ClientProfit {
  client_id: number;
  client_name: string;
  income: number;
  expense: number;
  profit: number;
}

export interface CategoryBreakdown {
  category_id: number;
  category_name: string;
  amount: number;
  percentage: number;
}

export interface ReceivablesAging {
  invoice_id: number;
  invoice_number: string;
  client_name: string;
  project_name: string;
  amount: number;
  payment_date: string;
  days_overdue: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  total?: number;
  page?: number;
  page_size?: number;
}
