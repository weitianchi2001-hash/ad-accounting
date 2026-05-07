import axios from 'axios';
import type {
  ApiResponse, Client, Project, Revenue, Expense,
  ExpenseCategory, DashboardSummary,
  ProfitSummary, ProjectProfit, ClientProfit,
  CategoryBreakdown, ReceivablesAging,
} from '../types';

const api = axios.create({ baseURL: '/api' });

// Dashboard
export async function fetchDashboardSummary() {
  const { data } = await api.get<ApiResponse<DashboardSummary>>('/dashboard/summary');
  return data.data!;
}

// Clients
export async function fetchClients(search?: string) {
  const { data } = await api.get<ApiResponse<Client[]>>('/clients', { params: { search } });
  return data;
}

export async function fetchClient(id: number) {
  const { data } = await api.get<ApiResponse<Client>>(`/clients/${id}`);
  return data.data!;
}

export async function createClient(body: Partial<Client>) {
  const { data } = await api.post<ApiResponse<Client>>('/clients', body);
  return data.data!;
}

export async function updateClient(id: number, body: Partial<Client>) {
  const { data } = await api.put<ApiResponse<Client>>(`/clients/${id}`, body);
  return data.data!;
}

export async function deleteClient(id: number) {
  const { data } = await api.delete<ApiResponse<unknown>>(`/clients/${id}`);
  return data;
}

// Projects
export async function fetchProjects(params?: Record<string, unknown>) {
  const { data } = await api.get<ApiResponse<Project[]>>('/projects', { params });
  return data;
}

export async function fetchProject(id: number) {
  const { data } = await api.get<ApiResponse<Project>>(`/projects/${id}`);
  return data.data!;
}

export async function createProject(body: Partial<Project>) {
  const { data } = await api.post<ApiResponse<Project>>('/projects', body);
  return data.data!;
}

export async function updateProject(id: number, body: Partial<Project>) {
  const { data } = await api.put<ApiResponse<Project>>(`/projects/${id}`, body);
  return data.data!;
}

export async function deleteProject(id: number) {
  const { data } = await api.delete<ApiResponse<unknown>>(`/projects/${id}`);
  return data;
}

// Revenues
export async function fetchRevenues(params?: Record<string, unknown>) {
  const { data } = await api.get<ApiResponse<Revenue[]>>('/revenues', { params });
  return data;
}

export async function createRevenue(body: Partial<Revenue>) {
  const { data } = await api.post<ApiResponse<Revenue>>('/revenues', body);
  return data.data!;
}

export async function updateRevenue(id: number, body: Partial<Revenue>) {
  const { data } = await api.put<ApiResponse<Revenue>>(`/revenues/${id}`, body);
  return data.data!;
}

export async function deleteRevenue(id: number) {
  const { data } = await api.delete<ApiResponse<unknown>>(`/revenues/${id}`);
  return data;
}

// Expenses
export async function fetchExpenses(params?: Record<string, unknown>) {
  const { data } = await api.get<ApiResponse<Expense[]>>('/expenses', { params });
  return data;
}

export async function createExpense(body: Partial<Expense>) {
  const { data } = await api.post<ApiResponse<Expense>>('/expenses', body);
  return data.data!;
}

export async function updateExpense(id: number, body: Partial<Expense>) {
  const { data } = await api.put<ApiResponse<Expense>>(`/expenses/${id}`, body);
  return data.data!;
}

export async function deleteExpense(id: number) {
  const { data } = await api.delete<ApiResponse<unknown>>(`/expenses/${id}`);
  return data;
}

// Categories
export async function fetchCategories() {
  const { data } = await api.get<ApiResponse<ExpenseCategory[]>>('/categories');
  return data.data!;
}

export async function createCategory(body: { name: string; type: string }) {
  const { data } = await api.post<ApiResponse<ExpenseCategory>>('/categories', body);
  return data.data!;
}

// Reports
export async function fetchProfitSummary(params?: Record<string, unknown>) {
  const { data } = await api.get<ApiResponse<ProfitSummary[]>>('/reports/profit-summary', { params });
  return data.data!;
}

export async function fetchReportByProject(params?: Record<string, unknown>) {
  const { data } = await api.get<ApiResponse<ProjectProfit[]>>('/reports/by-project', { params });
  return data.data!;
}

export async function fetchReportByClient(params?: Record<string, unknown>) {
  const { data } = await api.get<ApiResponse<ClientProfit[]>>('/reports/by-client', { params });
  return data.data!;
}

export async function fetchReportByCategory(params?: Record<string, unknown>) {
  const { data } = await api.get<ApiResponse<CategoryBreakdown[]>>('/reports/by-category', { params });
  return data.data!;
}

export async function fetchReceivablesAging() {
  const { data } = await api.get<ApiResponse<ReceivablesAging[]>>('/reports/aging');
  return data.data!;
}
