import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, AlertCircle } from 'lucide-react';
import { fetchRevenues, createRevenue, updateRevenue, deleteRevenue, fetchClients, fetchProjects } from '../api';
import type { Revenue, Client, Project } from '../types';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import StatusBadge from '../components/common/StatusBadge';
import RevenueForm from '../components/Revenue/RevenueForm';

export default function RevenuePage() {
  const qc = useQueryClient();
  const [filterClient, setFilterClient] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Revenue | null>(null);
  const [deleting, setDeleting] = useState<Revenue | null>(null);

  const { data: clientsData } = useQuery({ queryKey: ['clients', ''], queryFn: () => fetchClients('') });
  const clients = (clientsData?.success ? clientsData.data : []) as Client[];

  const { data: projectsData } = useQuery({ queryKey: ['projects', {}], queryFn: () => fetchProjects({}) });
  const projects = (projectsData?.success ? projectsData.data : []) as Project[];

  const params: Record<string, unknown> = { page, page_size: 15 };
  if (filterClient) params.client_id = filterClient;
  if (filterProject) params.project_id = filterProject;
  if (filterStatus) params.status = filterStatus;
  if (filterStart) params.start_date = filterStart;
  if (filterEnd) params.end_date = filterEnd;

  const { data, isLoading } = useQuery({
    queryKey: ['revenues', params],
    queryFn: () => fetchRevenues(params),
  });
  const revenues = (data?.success ? data.data : []) as (Revenue & { client_name?: string; project_name?: string; square_meters?: number })[];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / 15);

  // Also fetch unpaid for summary bar
  const { data: unpaidData } = useQuery({
    queryKey: ['revenues', 'unpaid'],
    queryFn: () => fetchRevenues({ status: '未支付', page_size: 999 }),
  });
  const unpaidRevenues = (unpaidData?.success ? unpaidData.data : []) as (Revenue & { client_name?: string; project_name?: string; square_meters?: number })[];
  const unpaidTotal = useMemo(() => unpaidRevenues.reduce((s, r) => s + r.amount, 0), [unpaidRevenues]);

  const createMut = useMutation({
    mutationFn: (body: Partial<Revenue>) => createRevenue(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['revenues'] }); setModalOpen(false); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<Revenue> }) => updateRevenue(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['revenues'] }); setModalOpen(false); setEditing(null); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteRevenue(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['revenues'] }); setDeleting(null); },
  });

  const formatMoney = (v: number) => v.toLocaleString('zh-CN', { minimumFractionDigits: 2 });

  function quickFilterUnpaid() {
    setFilterStatus(filterStatus === '未支付' ? '' : '未支付');
    setPage(1);
  }

  const columns = ['发票号', '客户', '项目', '描述', '尺寸', '平米', '金额', '日期', '支付方式', '状态', '操作'];

  return (
    <div>
      {/* Unpaid summary bar */}
      {unpaidTotal > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">
              未支付：{unpaidRevenues.length} 笔，共计 ¥{formatMoney(unpaidTotal)}
            </span>
          </div>
          <button
            onClick={quickFilterUnpaid}
            className={`px-3 py-1.5 text-xs rounded-lg font-medium ${
              filterStatus === '未支付' ? 'bg-yellow-500 text-white' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
            }`}
          >
            {filterStatus === '未支付' ? '显示全部' : '只看未支付'}
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          <select value={filterClient} onChange={e => { setFilterClient(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">全部客户</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select value={filterProject} onChange={e => { setFilterProject(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">全部项目</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="">全部状态</option>
            <option value="已支付">已支付</option>
            <option value="未支付">未支付</option>
          </select>
          <input type="date" value={filterStart} onChange={e => { setFilterStart(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          <span className="self-center text-gray-400">—</span>
          <input type="date" value={filterEnd} onChange={e => { setFilterEnd(e.target.value); setPage(1); }} className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <button onClick={() => { setEditing(null); setModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm">
          <Plus size={16} /> 添加收入
        </button>
      </div>

      {isLoading ? <LoadingSpinner /> : revenues.length === 0 ? <EmptyState message="暂无收入记录" /> : (
        <>
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-4">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">客户</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">项目</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">描述</th>
                  <th className="text-left px-3 py-3 text-sm font-medium text-gray-500">尺寸</th>
                  <th className="text-right px-3 py-3 text-sm font-medium text-gray-500">平米</th>
                  <th className="text-right px-3 py-3 text-sm font-medium text-gray-500">单价/㎡</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">金额</th>
                  <th className="text-left px-3 py-3 text-sm font-medium text-gray-500">日期</th>
                  <th className="text-left px-3 py-3 text-sm font-medium text-gray-500">方式</th>
                  <th className="text-left px-3 py-3 text-sm font-medium text-gray-500">状态</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-gray-500">操作</th>
                </tr>
              </thead>
              <tbody>
                {revenues.map(r => {
                  const isUnpaid = r.status === '未支付';
                  return (
                    <tr key={r.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isUnpaid ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3 text-sm">{r.client_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{r.project_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-[120px] truncate">{r.description || '-'}</td>
                      <td className="px-3 py-3 text-sm text-gray-500">{r.size || '-'}</td>
                      <td className="px-3 py-3 text-sm text-right">{r.square_meters ? `${r.square_meters}㎡` : '-'}</td>
                      <td className="px-3 py-3 text-sm text-right text-blue-600 font-medium">
                        {r.square_meters && r.square_meters > 0 ? `¥${formatMoney(r.amount / r.square_meters)}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">{formatMoney(r.amount)}</td>
                      <td className="px-3 py-3 text-sm text-gray-500">{r.payment_date || '-'}</td>
                      <td className="px-3 py-3 text-sm text-gray-500">{r.payment_method || '-'}</td>
                      <td className="px-3 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3 text-sm text-right">
                        <button onClick={() => { setEditing(r); setModalOpen(true); }} className="p-1.5 hover:bg-gray-100 rounded text-blue-500"><Edit size={15} /></button>
                        <button onClick={() => setDeleting(r)} className="p-1.5 hover:bg-gray-100 rounded text-red-500 ml-1"><Trash2 size={15} /></button>
                      </td>
                    </tr>
                  );
                })}
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

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? '编辑收入' : '添加收入'}>
        <RevenueForm
          initial={editing}
          onSubmit={(fd) => {
            const body = { ...fd, client_id: Number(fd.client_id), project_id: fd.project_id ? Number(fd.project_id) : null, amount: Number(fd.amount) };
            if (editing) { updateMut.mutate({ id: editing.id, body }); } else { createMut.mutate(body); }
          }}
          onCancel={() => { setModalOpen(false); setEditing(null); }}
        />
      </Modal>

      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && deleteMut.mutate(deleting.id)} title="删除收入" message="确认删除这条收入记录？" />
    </div>
  );
}
