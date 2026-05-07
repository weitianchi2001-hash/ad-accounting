import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { fetchClients } from '../../api';
import type { Project, Client } from '../../types';

const schema = z.object({
  client_id: z.string().min(1, '请选择客户'),
  name: z.string().min(1, '项目名称不能为空'),
  description: z.string().optional().or(z.literal('')),
  budget: z.string().optional(),
  start_date: z.string().optional().or(z.literal('')),
  end_date: z.string().optional().or(z.literal('')),
  status: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Props {
  initial?: Project | null;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
}

export default function ProjectForm({ initial, onSubmit, onCancel }: Props) {
  const { data } = useQuery({
    queryKey: ['clients', ''],
    queryFn: () => fetchClients(''),
  });
  const clients = (data?.success ? data.data : []) as Client[];

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      client_id: initial?.client_id ? String(initial.client_id) : '',
      name: initial?.name || '',
      description: initial?.description || '',
      budget: initial?.budget ? String(initial.budget) : '',
      start_date: initial?.start_date || '',
      end_date: initial?.end_date || '',
      status: initial?.status || '进行中',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">客户 *</label>
        <select {...register('client_id')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">请选择客户</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {errors.client_id && <p className="mt-1 text-sm text-red-500">{errors.client_id.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">项目名称 *</label>
        <input {...register('name')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="如：Q1品牌广告投放" />
        {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">预算</label>
          <input type="number" step="0.01" {...register('budget')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
          <select {...register('status')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="进行中">进行中</option>
            <option value="已完成">已完成</option>
            <option value="已取消">已取消</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
          <input type="date" {...register('start_date')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
          <input type="date" {...register('end_date')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
        <textarea {...register('description')} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="项目描述" />
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">取消</button>
        <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
          {initial ? '保存修改' : '添加项目'}
        </button>
      </div>
    </form>
  );
}
