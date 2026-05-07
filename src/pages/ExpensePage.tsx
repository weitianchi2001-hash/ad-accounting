import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { fetchExpenses, createExpense, updateExpense, deleteExpense, fetchCategories, fetchProjects } from '../api';
import type { Expense, ExpenseCategory, Project } from '../types';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import ExpenseForm from '../components/Expense/ExpenseForm';

export default function ExpensePage() {
  const qc = useQueryClient();
  const [filterProject, setFilterProject] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);

  const { data: catData } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });
  const categories = catData || [];

  const { data: projData } = useQuery({ queryKey: ['projects', {}], queryFn: () => fetchProjects({}) });
  const projects = (projData?.success ? projData.data : []) as Project[];

  const params: Record<string, unknown> = { page, page_size: 15 };
  if (filterProject) params.project_id = filterProject;
  if (filterCategory) params.category_id = filterCategory;
  if (filterStart) params.start_date = filterStart;
  if (filterEnd) params.end_date = filterEnd;

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', params],
    queryFn: () => fetchExpenses(params),
  });
  const expenses = (data?.success ? data.data : []) as (Expense & { category_name?: string; project_name?: string })[];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 15);

  const createMut = useMutation({
    mutationFn: (body: Partial<Expense>) => createExpense(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); setModalOpen(false); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<Expense> }) => updateExpense(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); setModalOpen(false); setEditing(null); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteExpense(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expenses'] }); setDeleting(null); },
  });

  const formatMoney = (v: number) => v.toLocaleString('zh-CN', { minimumFractionDigits: 2 });

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          <select value={filterProject} onChange={e => { setFilterProject(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">全部项目</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filterCategory} onChange={e => { setFilterCategory(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">全部类别</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="date" value={filterStart} onChange={e => { setFilterStart(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <span className="self-center text-gray-400">—</span>
          <input type="date" value={filterEnd} onChange={e => { setFilterEnd(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm">
          <Plus size={16} /> 添加支出
        </button>
      </div>

      {isLoading ? <LoadingSpinner /> : expenses.length === 0 ? <EmptyState message="暂无支出记录" /> : (
        <>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-4">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">日期</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">类别</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">项目</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">供应商</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">描述</th>
                  <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">尺寸</th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">平米</th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">金额</th>
                  <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-500">{e.expense_date || '-'}</td>
                    <td className="px-6 py-3 text-sm">{e.category_name || '-'}</td>
                    <td className="px-6 py-3 text-sm text-gray-500">{e.project_name || '-'}</td>
                    <td className="px-6 py-3 text-sm text-gray-500">{e.vendor || '-'}</td>
                    <td className="px-6 py-3 text-sm text-gray-500">{e.description || '-'}</td>
                    <td className="px-6 py-3 text-sm text-gray-500">{e.size || '-'}</td>
                    <td className="px-6 py-3 text-sm text-right text-gray-500">{e.square_meters ? `${e.square_meters}㎡` : '-'}</td>
                    <td className="px-6 py-3 text-sm text-right text-red-500 font-medium">{formatMoney(e.amount)}</td>
                    <td className="px-6 py-3 text-sm text-right">
                      <button onClick={() => { setEditing(e); setModalOpen(true); }} className="p-1.5 hover:bg-gray-100 rounded text-blue-500"><Edit size={15} /></button>
                      <button onClick={() => setDeleting(e)} className="p-1.5 hover:bg-gray-100 rounded text-red-500 ml-1"><Trash2 size={15} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-30">上一页</button>
              <span className="text-sm text-gray-500">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-30">下一页</button>
            </div>
          )}
        </>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? '编辑支出' : '添加支出'}>
        <ExpenseForm
          initial={editing}
          onSubmit={(fd) => {
            const body = { ...fd, category_id: Number(fd.category_id), project_id: fd.project_id ? Number(fd.project_id) : null, amount: Number(fd.amount) };
            if (editing) { updateMut.mutate({ id: editing.id, body }); } else { createMut.mutate(body); }
          }}
          onCancel={() => { setModalOpen(false); setEditing(null); }}
        />
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteMut.mutate(deleting.id)} title="删除支出" message="确认删除这条支出记录？" />
    </div>
  );
}
