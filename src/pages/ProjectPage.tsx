import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { fetchProjects, createProject, updateProject, deleteProject } from '../api';
import type { Project } from '../types';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import LoadingSpinner from '../components/common/LoadingSpinner';
import EmptyState from '../components/common/EmptyState';
import ProjectForm from '../components/Project/ProjectForm';
import InlineEdit from '../components/common/InlineEdit';

const STATUS_OPTIONS = [
  { label: '进行中', value: '进行中' },
  { label: '已完成', value: '已完成' },
  { label: '已取消', value: '已取消' },
];

export default function ProjectPage() {
  const qc = useQueryClient();
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleting, setDeleting] = useState<Project | null>(null);

  const params: Record<string, unknown> = {};
  if (filterStatus) params.status = filterStatus;

  const { data, isLoading } = useQuery({
    queryKey: ['projects', params],
    queryFn: () => fetchProjects(params),
  });
  const projects = (data?.success ? data.data : []) as Project[];

  const createMut = useMutation({
    mutationFn: (body: Partial<Project>) => createProject(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); setModalOpen(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<Project> }) => updateProject(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => deleteProject(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); setDeleting(null); },
  });

  function handleFieldSave(project: Project, field: string, value: string) {
    const body: Record<string, unknown> = { [field]: value };
    if (field === 'budget') body.budget = Number(value) || 0;
    updateMut.mutate({ id: project.id, body });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-3">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">全部状态</option>
            <option value="进行中">进行中</option>
            <option value="已完成">已完成</option>
            <option value="已取消">已取消</option>
          </select>
        </div>
        <button onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm">
          <Plus size={16} /> 添加项目
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : projects.length === 0 ? (
        <EmptyState message="暂无项目" />
      ) : (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">项目名称</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">状态</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">预算</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500 w-16">操作</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-3 text-sm font-medium text-gray-800">
                    <InlineEdit value={p.name} onSave={v => handleFieldSave(p, 'name', v)} />
                  </td>
                  <td className="px-6 py-3">
                    <InlineEdit value={p.status} onSave={v => handleFieldSave(p, 'status', v)} type="select" options={STATUS_OPTIONS} />
                  </td>
                  <td className="px-6 py-3 text-sm text-right">
                    <InlineEdit value={String(p.budget)} onSave={v => handleFieldSave(p, 'budget', v)} />
                  </td>
                  <td className="px-6 py-3 text-sm text-right">
                    <button onClick={() => setDeleting(p)} className="p-1.5 hover:bg-gray-100 rounded text-red-500"><Trash2 size={15} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="添加项目">
        <ProjectForm
          initial={null}
          onSubmit={(formData) => {
            createMut.mutate({ ...formData, client_id: Number(formData.client_id), budget: Number(formData.budget) || 0 });
          }}
          onCancel={() => setModalOpen(false)}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && deleteMut.mutate(deleting.id)}
        title="删除项目"
        message={`确认删除项目「${deleting?.name}」？`}
      />
    </div>
  );
}
