'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Upload,
  RefreshCw,
  CheckCircle,
  FileText,
  ArrowRight,
  Shield,
  Clock,
  XCircle,
  BookOpen,
  Play,
  Zap,
  Volume2,
  HelpCircle,
  Accessibility,
  Loader2,
} from 'lucide-react';
import { getJobs, uploadFile, startConversion, type JobStatus } from '@/lib/api';
import { DEMO_JOBS, DEMO_STATS } from '@/lib/demo-data';
import { useDemoFlow } from '@/lib/demo-flow';

export default function Dashboard() {
  const router = useRouter();
  const [jobs, setJobs] = useState<JobStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragOver, setDragOver] = useState(false);
  const [converting, setConverting] = useState(false);
  const { startDemoFlow, isRunning } = useDemoFlow();

  useEffect(() => {
    async function load() {
      try {
        const data = await getJobs();
        setJobs(data.length > 0 ? data : DEMO_JOBS);
      } catch {
        setJobs(DEMO_JOBS);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const completedJobs = jobs.filter((j) => j.status === 'completed');
  const hasRealJobs = jobs.length > 0 && !jobs[0]?.jobId.startsWith('demo-');
  const successRate = jobs.length > 0 ? Math.round((completedJobs.length / jobs.length) * 100) : 0;

  const stats = hasRealJobs
    ? {
        totalConversions: jobs.length,
        successRate,
        avgTime: completedJobs.length > 0 ? '~8초' : '-',
        accessibilityScore: completedJobs.length > 0 ? '92%' : '-',
      }
    : DEMO_STATS;

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (!f || !f.name.endsWith('.epub')) return;
    setConverting(true);
    try {
      const uploadResult = await uploadFile(f);
      const convResult = await startConversion(uploadResult.id, {
        enableQuiz: true,
        enableTts: true,
        enableSummary: true,
      });
      router.push(`/convert?job=${convResult.jobId}`);
    } catch {
      router.push('/upload');
    } finally {
      setConverting(false);
    }
  }, [router]);

  const statCards = [
    { label: '총 변환 수', value: String(stats.totalConversions), icon: RefreshCw, color: 'text-indigo-600' },
    { label: '성공률', value: `${stats.successRate}%`, icon: CheckCircle, color: 'text-emerald-600' },
    { label: '평균 소요시간', value: stats.avgTime, icon: Clock, color: 'text-gray-600' },
    { label: '접근성 점수', value: stats.accessibilityScore, icon: Shield, color: 'text-indigo-600' },
  ];

  const features = [
    { icon: Zap, title: 'ePub 3.0 자동 변환', desc: 'HTML5/CSS3 시맨틱 마크업으로 구조 자동 변환' },
    { icon: HelpCircle, title: 'AI 퀴즈 생성', desc: 'LLM 기반 챕터별 퀴즈 자동 생성' },
    { icon: Volume2, title: 'TTS 음성 변환', desc: 'SMIL 미디어 오버레이 싱크 지원' },
    { icon: Accessibility, title: '접근성 자동 적용', desc: 'KWCAG 2.1 / EPUB Accessibility 1.1 준수' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fadeIn">
      {/* Hero — Quick Upload */}
      <div
        onDrop={handleFileDrop}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`relative rounded-xl border-2 border-dashed p-8 text-center transition-all ${
          dragOver ? 'border-indigo-400 bg-indigo-50/50' : 'border-gray-200 bg-white'
        }`}
      >
        {converting ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
            <p className="text-sm font-medium text-gray-700">변환 중...</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center gap-3">
              <div className="p-3 bg-indigo-50 rounded-xl">
                <Upload className="w-7 h-7 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  ePub 2.0 → 3.0 인터랙티브 변환
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  ePub 파일을 여기에 드래그하거나,{' '}
                  <Link href="/upload" className="text-indigo-600 hover:text-indigo-700 font-medium">
                    업로드 페이지
                  </Link>
                  에서 시작하세요
                </p>
              </div>
            </div>
            <div className="flex gap-2.5 justify-center mt-4">
              <Link
                href="/upload"
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                <Upload className="w-4 h-4" /> 파일 업로드
              </Link>
              <button
                onClick={startDemoFlow}
                disabled={isRunning}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4" /> 데모 체험
              </button>
            </div>
          </>
        )}
      </div>

      {/* Features */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {features.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-white rounded-xl border border-gray-200 p-4">
            <Icon className="w-5 h-5 text-indigo-600 mb-2" />
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <Icon className={`w-4 h-4 ${color}`} />
              {!hasRealJobs && (
                <span className="text-[10px] text-gray-400">데모</span>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent Jobs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-sm text-gray-900">최근 변환 작업</h2>
          <Link href="/upload" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
            새 변환 →
          </Link>
        </div>
        {loading ? (
          <div className="p-10 text-center text-gray-500">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
            <p className="text-xs">불러오는 중...</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {jobs.slice(0, 5).map((job) => {
              const displayName = job.result?.filename || `작업 ${job.jobId.slice(0, 8)}...`;
              return (
                <div key={job.jobId} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
                      <FileText className="w-4 h-4 text-gray-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{displayName}</p>
                      <p className="text-[11px] text-gray-400">
                        {new Date(job.createdAt).toLocaleDateString('ko-KR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {job.status === 'completed' ? (
                      <span className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md font-medium">
                        <CheckCircle className="w-3 h-3" /> 완료
                      </span>
                    ) : job.status === 'processing' ? (
                      <span className="flex items-center gap-1 text-[11px] text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md font-medium">
                        <RefreshCw className="w-3 h-3 animate-spin" /> 변환 중
                      </span>
                    ) : job.status === 'failed' ? (
                      <span className="flex items-center gap-1 text-[11px] text-red-700 bg-red-50 px-2.5 py-1 rounded-md font-medium">
                        <XCircle className="w-3 h-3" /> 실패
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md font-medium">
                        대기
                      </span>
                    )}
                    <Link
                      href={`/preview?job=${job.jobId}`}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      상세
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
