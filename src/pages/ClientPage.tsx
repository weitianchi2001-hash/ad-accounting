import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Trash2 } from 'lucide-react';
import { fetchClients, createClient, updateClient, deleteClient } from '../api';
import type { Client } from '../types';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import ClientForm from '../components/Client/ClientForm';
import InlineEdit from '../components/common/InlineEdit';

export default function ClientPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<Client | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['clients', search],
    queryFn: () => fetchClients(search),
  });
  const clients = (data?.success ? data.data : []) as Client[];

  const createMut = useMutation({
    mutationFn: (body: Partial<Client>) => createClient(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['clients'] }); setModalOpen(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<Client> }) => updateClient(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteClient(id),
    onSuccess: (res) => {
      if (!res.success) alert(res.error);
      qc.invalidateQueries({ queryKey: ['clients'] });
      setDeleting(null);
    },
  });

  function handleFieldSave(client: Client, field: string, value: string) {
    updateMut.mutate({ id: client.id, body: { [field]: value } });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索客户..."
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm">
          <Plus size={16} /> 添加客户
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : clients.length === 0 ? (
        <EmptyState message="暂无客户" />
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 w-1/3">客户名称</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500 w-1/3">联系方式</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">备注</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500 w-16">操作</th>
              </tr>
            </thead>
            <tbody>
              {clients.map(c => (
                <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-medium text-gray-800">
                    <InlineEdit value={c.name} onSave={v => handleFieldSave(c, 'name', v)} />
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500">
                    <InlineEdit value={c.contact_info || ''} onSave={v => handleFieldSave(c, 'contact_info', v)} />
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500">
                    <InlineEdit value={c.notes || ''} onSave={v => handleFieldSave(c, 'notes', v)} />
                  </td>
                  <td className="px-6 py-3 text-sm text-right">
                    <button onClick={() => setDeleting(c)} className="p-1.5 hover:bg-gray-100 rounded text-red-500"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="添加客户">
        <ClientForm
          initial={null}
          onSubmit={(formData) => createMut.mutate(formData)}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMut.mutate(deleting.id)}
        title="删除客户"
        message={`确认删除客户「${deleting?.name}」？`}
      />
    </div>
  );
}
