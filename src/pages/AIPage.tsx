import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Brain, Send, RefreshCw, KeyRound, X } from 'lucide-react';
import LoadingSpinner from '../components/common/LoadingSpinner';

const API_BASE = '/api/ai';

async function fetchConfig() {
  const r = await fetch(`${API_BASE}/config`);
  return r.json();
}

async function saveApiKey(apiKey: string) {
  const r = await fetch(`${API_BASE}/config`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  });
  return r.json();
}

async function fetchAnalysis() {
  const r = await fetch(`${API_BASE}/analyze`);
  return r.json();
}

async function chatQuery(question: string) {
  const r = await fetch(`${API_BASE}/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });
  return r.json();
}

export default function AIPage() {
  const qc = useQueryClient();

  const [keyModal, setKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);

  const { data: configData } = useQuery({ queryKey: ['ai-config'], queryFn: fetchConfig });
  const hasKey = configData?.data?.hasKey;

  const { data: analysisData, isLoading: analyzing, refetch: doAnalyze } = useQuery({
    queryKey: ['ai-analyze'],
    queryFn: fetchAnalysis,
    enabled: !!hasKey,
  });

  const saveKeyMut = useMutation({
    mutationFn: saveApiKey,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ai-config'] }); setKeyModal(false); setApiKeyInput(''); },
  });

  const chatMut = useMutation({
    mutationFn: chatQuery,
    onSuccess: (data) => {
      if (data.success) {
        setChatHistory(prev => [...prev, { role: 'ai', content: data.data.answer }]);
      } else {
        setChatHistory(prev => [...prev, { role: 'ai', content: `错误：${data.error}` }]);
      }
    },
  });

  function handleChat() {
    if (!chatInput.trim()) return;
    setChatHistory(prev => [...prev, { role: 'user', content: chatInput }]);
    chatMut.mutate(chatInput);
    setChatInput('');
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain size={24} className="text-purple-500" />
          <h2 className="text-lg font-semibold">AI 分析</h2>
        </div>
        <div className="flex gap-2">
          {hasKey && (
            <>
              <button onClick={() => setKeyModal(true)} className="text-sm text-gray-400 hover:text-gray-600">修改 Key</button>
              <button onClick={() => doAnalyze()} disabled={analyzing} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600">
                <RefreshCw size={14} className={analyzing ? 'animate-spin' : ''} /> 刷新分析
              </button>
            </>
          )}
        </div>
      </div>

      {/* No Key View */}
      {!hasKey && (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl shadow-sm">
          <Brain size={64} className="text-gray-300 mb-6" />
          <h2 className="text-xl font-semibold text-gray-600 mb-2">AI 财务分析</h2>
          <p className="text-gray-400 mb-6">设置 DeepSeek API Key 即可使用</p>
          <button onClick={() => setKeyModal(true)} className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 font-medium">
            <KeyRound size={18} /> 设置 API Key
          </button>
        </div>
      )}

      {/* Analysis Result */}
      {hasKey && (
        analyzing ? <LoadingSpinner /> : analysisData?.success ? (
          <div className="bg-white rounded-xl shadow-sm p-6 whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
            {analysisData.data.analysis}
          </div>
        ) : analysisData?.error ? (
          <div className="bg-red-50 text-red-600 rounded-xl p-6 text-sm">{analysisData.error}</div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-400 text-sm">
            点击右上角"刷新分析"开始
          </div>
        )
      )}

      {/* Chat Section */}
      {hasKey && (
        <div className="bg-white rounded-xl shadow-sm">
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">提问</h3>
          </div>
          <div className="p-4 max-h-64 overflow-y-auto space-y-3 min-h-[120px]">
            {chatHistory.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">
                试试问："上个月哪个客户利润最高？"、"哪类支出占比最大？"、"谁欠款最多？"
              </p>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                  msg.role === 'user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700'
                }`}>{msg.content}</div>
              </div>
            ))}
            {chatMut.isPending && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-2 text-sm text-gray-400">思考中...</div>
              </div>
            )}
          </div>
          <div className="p-4 border-t border-gray-100 flex gap-2">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleChat()}
              placeholder="输入问题..."
              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button onClick={handleChat} disabled={chatMut.isPending} className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600">
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* API Key Modal - always rendered */}
      {keyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setKeyModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">设置 API Key</h3>
              <button onClick={() => setKeyModal(false)}><X size={18} /></button>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              在 <a href="https://platform.deepseek.com" target="_blank" className="text-blue-500 underline">platform.deepseek.com</a> 注册获取 Key，新用户送 500 万 tokens 额度
            </p>
            <input
              type="password"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              placeholder="sk-..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setKeyModal(false)} className="px-4 py-2 text-sm border rounded-lg">取消</button>
              <button onClick={() => saveKeyMut.mutate(apiKeyInput)} disabled={!apiKeyInput.trim()} className="px-4 py-2 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
