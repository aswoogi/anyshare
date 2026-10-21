'use client';

export const runtime = 'edge';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { 
  FileIcon, 
  Download, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  ShieldCheck, 
  Sparkles,
  ExternalLink,
  ImageIcon,
  Maximize2
} from 'lucide-react';
import { formatBytes, isImageFile } from '@/lib/utils';
import { ImageLightboxModal, LightboxImage } from '@/components/ImageLightboxModal';

interface SharedFile {
  name: string;
  size: number;
  storagePath: string;
  downloadUrl: string | null;
}

interface ShareData {
  valid: boolean;
  title: string;
  files: SharedFile[];
  exp: number;
  remainingSeconds: number;
}

export default function ShareDownloadPage() {
  const params = useParams();
  const token = params?.token as string;

  const [loading, setLoading] = useState(true);
  const [errorType, setErrorType] = useState<'EXPIRED' | 'INVALID' | 'NETWORK' | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [shareData, setShareData] = useState<ShareData | null>(null);

  // Remaining seconds for countdown
  const [remainingSec, setRemainingSec] = useState<number>(0);
  const [downloadingPath, setDownloadingPath] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  // Lightbox State
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  // Fetch verified data from API
  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    async function loadShareData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/share?token=${encodeURIComponent(token)}`);
        const json = await res.json();

        if (!isMounted) return;

        if (!res.ok) {
          if (json.error === 'EXPIRED') {
            setErrorType('EXPIRED');
            setErrorMessage('⏱️ 공유 링크의 유효 기간(10분)이 만료되었습니다.');
          } else {
            setErrorType('INVALID');
            setErrorMessage(json.message || '유효하지 않거나 손상된 공유 링크입니다.');
          }
          return;
        }

        setShareData(json);
        setRemainingSec(json.remainingSeconds || 0);
      } catch (err) {
        if (!isMounted) return;
        setErrorType('NETWORK');
        setErrorMessage('데이터를 불러오는 중 네트워크 오류가 발생했습니다.');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadShareData();

    return () => {
      isMounted = false;
    };
  }, [token]);

  // Live countdown timer (every second)
  useEffect(() => {
    if (!shareData || remainingSec <= 0) return;

    const timer = setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setErrorType('EXPIRED');
          setErrorMessage('⏱️ 공유 링크의 유효 기간(10분)이 만료되었습니다.');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [shareData, remainingSec]);

  // Format MM:SS
  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Trigger individual file download
  const handleDownloadFile = async (file: SharedFile) => {
    if (!file.downloadUrl || remainingSec <= 0) return;
    setDownloadingPath(file.storagePath);

    try {
      const link = document.createElement('a');
      link.href = file.downloadUrl;
      link.download = file.name;
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setTimeout(() => setDownloadingPath(null), 500);
    }
  };

  // Trigger all files download
  const handleDownloadAll = async () => {
    if (!shareData || shareData.files.length === 0 || downloadingAll || remainingSec <= 0) return;
    setDownloadingAll(true);

    try {
      for (let i = 0; i < shareData.files.length; i++) {
        const file = shareData.files[i];
        if (file.downloadUrl) {
          const link = document.createElement('a');
          link.href = file.downloadUrl;
          link.download = file.name;
          link.target = '_blank';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        if (i < shareData.files.length - 1) {
          await new Promise((r) => setTimeout(r, 400));
        }
      }
    } finally {
      setDownloadingAll(false);
    }
  };

  const totalBytes = shareData?.files?.reduce((acc, f) => acc + (f.size || 0), 0) || 0;
  const imageFiles = (shareData?.files || []).filter((f) => isImageFile(f.name));
  const lightboxImages: LightboxImage[] = imageFiles.map((f) => ({
    name: f.name,
    url: f.downloadUrl || '',
    storagePath: f.storagePath,
  }));

  const openLightbox = (file: SharedFile) => {
    const idx = imageFiles.findIndex((img) => img.storagePath === file.storagePath);
    if (idx !== -1) {
      setLightboxIndex(idx);
      setLightboxOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-surface-950 text-gray-900 dark:text-gray-100 flex flex-col justify-between py-12 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100/70 dark:bg-amber-950/40 border border-amber-300/60 dark:border-amber-800/60 rounded-full text-xs font-semibold text-amber-800 dark:text-amber-300 shadow-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>10분 일회성 안전 공유</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            AnyShare 파일 전달
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            링크 생성 시점부터 10분 동안만 다운로드가 허용되며, 이후 즉시 파기됩니다.
          </p>
        </div>

        {/* Loading View */}
        {loading && (
          <div className="bg-white dark:bg-surface-900 rounded-2xl p-8 border border-gray-200 dark:border-surface-700 shadow-md text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
            <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
              안전한 공유 파일 정보를 확인하는 중...
            </p>
          </div>
        )}

        {/* Error / Expired View */}
        {!loading && errorType && (
          <div className="bg-white dark:bg-surface-900 rounded-2xl p-7 border border-red-200 dark:border-red-900/50 shadow-md text-center space-y-4 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                {errorType === 'EXPIRED' ? '공유 링크 만료됨' : '접근 불가'}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">
                {errorMessage}
              </p>
            </div>
            <div className="pt-2">
              <a
                href="/"
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-semibold hover:opacity-90 transition shadow-sm"
              >
                <span>AnyShare 바로가기</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        )}

        {/* Success View */}
        {!loading && !errorType && shareData && (
          <div className="bg-white dark:bg-surface-900 rounded-2xl p-5 sm:p-6 border border-gray-200 dark:border-surface-700 shadow-md space-y-5 animate-fade-in">
            {/* Live Timer Pill */}
            <div className="flex items-center justify-between p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded-xl text-xs">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-medium">
                <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
                <span>남은 유효 시간</span>
              </div>
              <div className="font-mono text-sm font-bold text-amber-700 dark:text-amber-400 tracking-wider">
                {formatTimer(remainingSec)}
              </div>
            </div>

            {/* Title / Description */}
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                전달된 파일
              </span>
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100 leading-snug">
                {shareData.title}
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                총 {shareData.files.length}개 ({formatBytes(totalBytes)})
              </p>
            </div>

            {/* Image Preview Box (If image exists) */}
            {imageFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium">
                  <span className="flex items-center gap-1">
                    <ImageIcon className="w-3.5 h-3.5 text-blue-500" />
                    <span>이미지 미리보기 ({imageFiles.length}장)</span>
                  </span>
                  <span className="text-gray-400">클릭하여 원본 확대</span>
                </div>

                {shareData.files.length === 1 ? (
                  // Single Image Large Preview
                  <div
                    onClick={() => openLightbox(imageFiles[0])}
                    className="relative group rounded-xl overflow-hidden border border-gray-200 dark:border-surface-700 bg-gray-100 dark:bg-surface-800 cursor-pointer max-h-56 flex items-center justify-center transition-all hover:border-blue-400 hover:shadow-md"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageFiles[0].downloadUrl || ''}
                      alt={imageFiles[0].name}
                      className="w-full h-auto max-h-56 object-contain rounded-xl"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-semibold backdrop-blur-[1px]">
                      <Maximize2 className="w-4 h-4" />
                      <span>크게 보기</span>
                    </div>
                  </div>
                ) : (
                  // Multi Image Grid Preview
                  <div className="grid grid-cols-3 gap-2">
                    {imageFiles.slice(0, 3).map((img, idx) => (
                      <div
                        key={img.storagePath}
                        onClick={() => openLightbox(img)}
                        className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-surface-700 bg-gray-100 dark:bg-surface-800 cursor-pointer hover:border-blue-400 transition hover:shadow-sm"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.downloadUrl || ''}
                          alt={img.name}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                        />
                        {idx === 2 && imageFiles.length > 3 && (
                          <div className="absolute inset-0 bg-black/60 text-white font-bold text-sm flex items-center justify-center backdrop-blur-xs">
                            +{imageFiles.length - 3}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Maximize2 className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* File List */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {shareData.files.map((file, idx) => {
                const isImg = isImageFile(file.name);
                return (
                  <div
                    key={`${file.storagePath}-${idx}`}
                    className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-surface-800 rounded-xl border border-gray-200/60 dark:border-surface-700 text-xs hover:border-amber-300 dark:hover:border-amber-700/60 transition"
                  >
                    <div 
                      className="flex items-center gap-2.5 min-w-0 cursor-pointer"
                      onClick={() => isImg && openLightbox(file)}
                    >
                      {isImg && file.downloadUrl ? (
                        <div className="relative w-9 h-9 rounded-lg overflow-hidden bg-gray-100 dark:bg-surface-700 border border-gray-200 dark:border-surface-600 shrink-0 group">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={file.downloadUrl}
                            alt={file.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Maximize2 className="w-3 h-3" />
                          </div>
                        </div>
                      ) : (
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded-lg shrink-0">
                          <FileIcon className="w-4 h-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-800 dark:text-gray-200 truncate" title={file.name}>
                          {file.name}
                        </p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                          {formatBytes(file.size)}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDownloadFile(file)}
                      disabled={downloadingPath === file.storagePath || !file.downloadUrl || remainingSec <= 0}
                      className="px-3 py-1.5 bg-white dark:bg-surface-700 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg border border-gray-300 dark:border-surface-600 shadow-xs transition flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                    >
                      {downloadingPath === file.storagePath ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      <span>다운로드</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Action Buttons: Download All */}
            {shareData.files.length > 1 && (
              <button
                type="button"
                onClick={handleDownloadAll}
                disabled={downloadingAll || remainingSec <= 0}
                className="w-full py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl text-xs font-semibold hover:opacity-90 transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {downloadingAll ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>모든 파일 일괄 다운로드 ({shareData.files.length}개)</span>
              </button>
            )}

            {/* Security Notice */}
            <div className="pt-2 border-t border-gray-100 dark:border-surface-800 flex items-center justify-center gap-1.5 text-[11px] text-gray-400 text-center">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>암호화 서명 링크를 통해 10분간만 안전하게 전달됩니다.</span>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal for Shared Images */}
      {lightboxImages.length > 0 && (
        <ImageLightboxModal
          isOpen={lightboxOpen}
          images={lightboxImages}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onDownload={(img) => {
            const target = shareData?.files.find(
              (f) => f.name === img.name || f.storagePath === img.storagePath
            );
            if (target) {
              handleDownloadFile(target);
            }
          }}
        />
      )}

      {/* Footer */}
      <footer className="text-center text-xs text-gray-400 mt-8">
        <p>AnyShare • Fast & Minimal Capture & Share</p>
      </footer>
    </div>
  );
}
