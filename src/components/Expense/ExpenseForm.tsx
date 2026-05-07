import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { fetchCategories, fetchProjects } from '../../api';
import type { Expense, ExpenseCategory, Project } from '../../types';

const schema = z.object({
  category_id: z.string().min(1, '请选择支出类别'),
  project_id: z.string().optional().or(z.literal('')),
  amount: z.string().min(1, '金额不能为空'),
  description: z.string().optional().or(z.literal('')),
  expense_date: z.string().optional().or(z.literal('')),
  vendor: z.string().optional().or(z.literal('')),
  payment_method: z.string().optional().or(z.literal('')),
  size: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

type FormData = z.infer<typeof schema>;

interface Props {
  initial?: Expense | null;
  onSubmit: (data: FormData) => void;
  onCancel: () => void;
}

export default function ExpenseForm({ initial, onSubmit, onCancel }: Props) {
  const { data: catData } = useQuery({ queryKey: ['categories'], queryFn: fetchCategories });
  const categories = catData || [];

  const { data: projData } = useQuery({ queryKey: ['projects', {}], queryFn: () => fetchProjects({}) });
  const projects = (projData?.success ? projData.data : []) as Project[];

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      category_id: initial?.category_id ? String(initial.category_id) : '',
      project_id: initial?.project_id ? String(initial.project_id) : '',
      amount: initial?.amount ? String(initial.amount) : '',
      description: initial?.description || '',
      expense_date: initial?.expense_date || '',
      vendor: initial?.vendor || '',
      payment_method: initial?.payment_method || '',
      size: initial?.size || '',
      notes: initial?.notes || '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">支出类别 *</label>
        <select {...register('category_id')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">请选择类别</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        {errors.category_id && <p className="mt-1 text-sm text-red-500">{errors.category_id.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">关联项目</label>
        <select {...register('project_id')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">无关联项目</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">金额 *</label>
          <input type="number" step="0.01" {...register('amount')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00" />
          {errors.amount && <p className="mt-1 text-sm text-red-500">{errors.amount.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">供应商/收款方</label>
          <input {...register('vendor')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="如：某媒体平台" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">尺寸</label>
          <input {...register('size')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="如：300x250" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">支出日期</label>
          <input type="date" {...register('expense_date')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">支付方式</label>
          <select {...register('payment_method')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">不限</option>
            <option value="银行转账">银行转账</option>
            <option value="现金">现金</option>
            <option value="微信">微信</option>
            <option value="支付宝">支付宝</option>
            <option value="其他">其他</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">描述</label>
          <input {...register('description')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="支出描述" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
          <input {...register('notes')} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="备注" />
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <button type="button" onClick={onCancel} className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">取消</button>
        <button type="submit" disabled={isSubmitting} className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50">
          {initial ? '保存修改' : '添加支出'}
        </button>
      </div>
    </form>
  );
}
