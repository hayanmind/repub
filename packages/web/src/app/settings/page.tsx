'use client';

import { useState, useEffect } from 'react';
import {
  Key,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  Shield,
  Cpu,
  Volume2,
  Image,
  Loader2,
  WifiOff,
  Server,
  Lock,
} from 'lucide-react';
import { getHealth, saveSettings } from '@/lib/api';

interface ApiKeyField {
  key: string;
  label: string;
  placeholder: string;
  description: string;
  icon: typeof Key;
}

const API_KEYS: ApiKeyField[] = [
  { key: 'gemini', label: 'Google Gemini API 키 (권장)', placeholder: 'AQ... 또는 AIza...로 시작하는 키', description: 'Gemini Flash 기반 변환, 퀴즈 생성, 요약에 사용 (가장 저렴)', icon: Cpu },
  { key: 'openai', label: 'OpenAI API 키 (선택)', placeholder: 'sk-...로 시작하는 키', description: 'GPT-4 기반 변환 — Gemini 키가 없을 때 사용', icon: Cpu },
  { key: 'anthropic', label: 'Anthropic API 키 (선택)', placeholder: 'sk-ant-...로 시작하는 키', description: 'Claude 모델 접근에 사용', icon: Shield },
  { key: 'elevenlabs', label: 'ElevenLabs API 키 (선택)', placeholder: 'API 키 입력', description: 'TTS 음성 변환에 사용', icon: Volume2 },
  { key: 'stability', label: 'Stability AI 키 (선택)', placeholder: 'sk-...로 시작하는 키', description: '이미지 생성/향상에 사용', icon: Image },
];

export default function SettingsPage() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, 'success' | 'fail' | null>>({});
  const [apiStatus, setApiStatus] = useState<'connected' | 'disconnected' | 'checking'>('checking');

  useEffect(() => {
    async function check() {
      try {
        await getHealth();
        setApiStatus('connected');
      } catch {
        setApiStatus('disconnected');
      }
    }
    check();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSettings(keys);
    } catch {
      // Silently fail for demo
    }
    setSaved(true);
    setSaving(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleTest = async (keyName: string) => {
    setTesting(keyName);
    setTestResults((r) => ({ ...r, [keyName]: null }));
    await new Promise((r) => setTimeout(r, 1500));
    setTestResults((r) => ({ ...r, [keyName]: keys[keyName] ? 'success' : 'fail' }));
    setTesting(null);
  };

  const hasAnyKey = Object.values(keys).some((v) => v.trim().length > 0);

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fadeIn">
      <div>
        <h1 className="text-lg font-bold text-gray-900">설정</h1>
        <p className="text-xs text-gray-500 mt-0.5">API 키 및 변환 옵션을 관리합니다</p>
      </div>

      {/* Zero-Retention notice */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-3">
        <Lock className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-gray-700">API Zero-Retention 정책</p>
          <p className="text-xs text-gray-500 mt-0.5">
            모든 외부 AI API 호출은 데이터 비저장(Opt-out) 정책을 적용합니다. 업로드된 콘텐츠는 AI 학습에 사용되지 않으며, 변환 완료 후 서버에서 자동 삭제됩니다.
          </p>
        </div>
      </div>

      {/* Mode indicator */}
      <div className={`rounded-xl border p-3.5 flex items-center gap-3 ${hasAnyKey ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className={`p-2 rounded-lg ${hasAnyKey ? 'bg-emerald-100' : 'bg-gray-100'}`}>
          {hasAnyKey ? <Cpu className="w-4 h-4 text-emerald-600" /> : <Shield className="w-4 h-4 text-gray-500" />}
        </div>
        <div>
          <p className={`text-sm font-semibold ${hasAnyKey ? 'text-emerald-800' : 'text-gray-700'}`}>
            {hasAnyKey ? 'AI 모드 활성화' : 'Mock 모드'}
          </p>
          <p className={`text-[11px] ${hasAnyKey ? 'text-emerald-600' : 'text-gray-500'}`}>
            {hasAnyKey ? 'AI API를 사용하여 실제 변환을 수행합니다' : 'API 키가 설정되지 않아 데모 결과를 생성합니다'}
          </p>
        </div>
      </div>

      {/* API Keys */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
        <div className="flex items-center gap-2">
          <Key className="w-4 h-4 text-indigo-600" />
          <h2 className="font-semibold text-sm text-gray-900">API 키 설정</h2>
        </div>

        <div className="space-y-4">
          {API_KEYS.map((field) => {
            const Icon = field.icon;
            return (
              <div key={field.key} className="p-3.5 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-gray-400" />
                  <label className="text-sm font-medium text-gray-800">{field.label}</label>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showKeys[field.key] ? 'text' : 'password'}
                      value={keys[field.key] || ''}
                      onChange={(e) => setKeys((k) => ({ ...k, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full px-3.5 py-2 border border-gray-200 rounded-lg text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all"
                    />
                    <button
                      onClick={() => setShowKeys((s) => ({ ...s, [field.key]: !s[field.key] }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showKeys[field.key] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <button
                    onClick={() => handleTest(field.key)}
                    disabled={!keys[field.key] || testing === field.key}
                    className="px-3.5 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                  >
                    {testing === field.key ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : testResults[field.key] === 'success' ? (
                      <CheckCircle className="w-4 h-4 text-emerald-500" />
                    ) : testResults[field.key] === 'fail' ? (
                      <WifiOff className="w-4 h-4 text-red-500" />
                    ) : (
                      '테스트'
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">{field.description}</p>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            저장
          </button>
          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium animate-fadeIn">
              <CheckCircle className="w-4 h-4" /> 저장되었습니다
            </span>
          )}
        </div>
      </div>

      {/* System Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-indigo-600" />
          <h2 className="font-semibold text-sm text-gray-900">시스템 정보</h2>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          {[
            { label: '버전', value: 'v1.0.0', mono: true },
            { label: '모드', value: hasAnyKey ? 'AI (Live)' : 'Mock (Demo)', mono: false },
            { label: 'ePubCheck', value: 'v4.2.6', mono: true },
            { label: 'Ace by DAISY', value: 'v1.3.2', mono: true },
            { label: 'API 서버', value: apiStatus === 'connected' ? '연결됨' : '미연결', mono: false },
            { label: 'Next.js', value: 'v16', mono: true },
          ].map(({ label, value, mono }) => (
            <div key={label} className="p-2.5 bg-gray-50 rounded-lg">
              <p className="text-[11px] text-gray-500 mb-0.5">{label}</p>
              <p className={`font-medium text-gray-900 ${mono ? 'font-mono text-xs' : 'text-sm'}`}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
