import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Music, Upload, Plus, FileMusic, Eye, X, ExternalLink, Link as LinkIcon, Search } from 'lucide-react';
import { API_BASE } from '@/config';
import { syncData, saveLocal } from '@/lib/localStorage';


interface Score {
  id: number;
  title: string;
  composer: string;
  file_path: string | null;
  external_url: string | null;
  midi_parsed: boolean;
  musicxml_parsed: boolean;
  tempo: number;
  key_sig: string;
  time_signature: string;
  total_measures: number;
  created_at: string;
}

export default function ScoreLibrary() {
  const [scores, setScores] = useState<Score[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [preview, setPreview] = useState<Score | null>(null);
  const [title, setTitle] = useState('');
  const [composer, setComposer] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [externalUrl, setExternalUrl] = useState('');
  const [uploadMode, setUploadMode] = useState<'file' | 'link'>('file');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    syncData<Score>('scores',
      () => fetch(`${API_BASE}/api/scores`).then(r => r.json()),
      (items) => fetch(`${API_BASE}/api/scores/sync`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      }).then(() => {})
    ).then(setScores);
  }, []);

  const filteredScores = searchQuery.trim()
    ? scores.filter(s => s.title.toLowerCase().includes(searchQuery.toLowerCase()) || s.composer.toLowerCase().includes(searchQuery.toLowerCase()))
    : scores;

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(',')[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const MAX_FILE_SIZE = 35 * 1024 * 1024;

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setUploading(true);
    setUploadError('');
    try {
      let fileData = null, fileName = null, fileType = null, extUrl = null;
      if (uploadMode === 'file' && file) {
        if (file.size > MAX_FILE_SIZE) { fileName = file.name; fileType = file.type; }
        else { fileData = await fileToBase64(file); fileName = file.name; fileType = file.type; }
      } else if (uploadMode === 'link' && externalUrl.trim()) { extUrl = externalUrl.trim(); }

      const res = await fetch(`${API_BASE}/api/scores`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, composer, fileData, fileName, fileType, externalUrl: extUrl }),
      });
      if (res.status === 413) throw new Error('文件太大。建议用"网盘链接"方式。');
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error(d.error || `上传失败 (${res.status})`); }
      const result = await res.json();
      const updated = [result, ...scores];
      saveLocal('scores', updated); setScores(updated);
      setShowUpload(false); setTitle(''); setComposer(''); setFile(null); setExternalUrl(''); setUploadMode('file');
    } catch (err: any) { setUploadError(err.message || '上传失败'); }
    setUploading(false);
  };

  const isPdf = (path: string | null) => path?.toLowerCase().endsWith('.pdf');
  const isImage = (path: string | null) => path && /\.(png|jpg|jpeg)$/i.test(path);
  const isAudio = (path: string | null) => path && /\.(mp3|wav|m4a)$/i.test(path);

  return (
    <div className="page relative z-10" style={{ maxWidth: '100%' }}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'hsl(var(--text))' }}>我的谱子库</h1>
          <p className="text-xs font-medium mt-1" style={{ color: 'hsl(var(--text-secondary))' }}>上传谱子或直接贴网盘链接</p>
        </div>
        <div className="flex gap-2">
          <Link to="/editor" className="neu neu-hover flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold" style={{ color: 'var(--accent)' }}>
            <Music className="w-4 h-4" />在线打谱
          </Link>
          <button onClick={() => setShowUpload(true)} className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold">
            <Plus className="w-4 h-4" />上传谱子
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="mb-5">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'hsl(var(--text-tertiary))' }} />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索曲目或作曲家..."
            className="w-full neu pl-10 pr-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
            style={{ color: 'hsl(var(--text))', borderRadius: '14px' }} />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'hsl(var(--text-tertiary))' }}>
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Score Grid */}
      {filteredScores.length === 0 ? (
        <div className="neu-inset py-16 rounded-2xl text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-soft)' }}>
            <FileMusic className="w-8 h-8 text-accent" />
          </div>
          {searchQuery ? (
            <><p className="text-base font-bold mb-1" style={{ color: 'hsl(var(--text))' }}>未找到相关谱子</p><p className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>试试其他关键词</p></>
          ) : (
            <><p className="text-base font-bold mb-1" style={{ color: 'hsl(var(--text))' }}>谱子库空空如也</p><p className="text-sm" style={{ color: 'hsl(var(--text-secondary))' }}>上传合唱谱，开始数字化管理</p></>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredScores.map(s => (
            <div key={s.id} className="neu p-5 neu-hover transition-all group" style={{ borderRadius: '20px' }}>
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center neu-sm" style={{ background: 'var(--accent-soft)' }}>
                  <Music className="w-6 h-6 text-accent" />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="neu-sm text-[10px] font-bold px-2 py-1 rounded-lg" style={{ color: 'hsl(var(--text-secondary))' }}>{s.time_signature}</span>
                  {s.midi_parsed && <span className="neu-sm text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ color: 'hsl(270,55%,55%)' }}>MIDI</span>}
                  {s.musicxml_parsed && <span className="neu-sm text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ color: 'hsl(150,50%,40%)' }}>五线谱</span>}
                  {s.external_url && <span className="neu-sm text-[10px] font-bold px-2 py-0.5 rounded-lg" style={{ color: 'hsl(210,60%,55%)' }}>网盘</span>}
                </div>
              </div>
              <h3 className="text-sm font-bold mb-1 group-hover:text-accent transition-colors" style={{ color: 'hsl(var(--text))' }}>{s.title}</h3>
              <p className="text-xs font-medium mb-3" style={{ color: 'hsl(var(--text-tertiary))' }}>{s.composer || '未知作曲家'}</p>
              <div className="flex gap-2">
                {(s.file_path || s.external_url) && (
                  <button onClick={() => setPreview(s)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 neu neu-hover rounded-xl text-xs font-bold" style={{ color: 'hsl(var(--text-secondary))' }}>
                    <Eye className="w-3.5 h-3.5" />预览
                  </button>
                )}
                <Link to={`/sheet/${s.id}`} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 neu neu-hover rounded-xl text-xs font-bold text-center" style={{ color: 'var(--accent)' }}>
                  <Music className="w-3.5 h-3.5" />五线谱
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ========== UPLOAD MODAL - 实底弹窗 ========== */}
      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowUpload(false); }}>
          <div className="neu p-6 w-full max-w-md" style={{ borderRadius: '24px', maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold" style={{ color: 'hsl(var(--text))' }}>上传谱子</h3>
              <button onClick={() => setShowUpload(false)} className="neu neu-hover w-8 h-8 rounded-lg flex items-center justify-center">
                <X className="w-4 h-4" style={{ color: 'hsl(var(--text-tertiary))' }} />
              </button>
            </div>

            {/* Mode toggle */}
            <div className="neu p-1 flex gap-1 mb-5" style={{ borderRadius: '14px' }}>
              <button onClick={() => setUploadMode('file')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${uploadMode === 'file' ? 'neu-inset text-accent' : 'neu-hover'}`}
                style={uploadMode !== 'file' ? { color: 'hsl(var(--text-tertiary))' } : {}}>
                <Upload className="w-3.5 h-3.5 inline mr-1" />上传文件
              </button>
              <button onClick={() => setUploadMode('link')}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${uploadMode === 'link' ? 'neu-inset text-accent' : 'neu-hover'}`}
                style={uploadMode !== 'link' ? { color: 'hsl(var(--text-tertiary))' } : {}}>
                <LinkIcon className="w-3.5 h-3.5 inline mr-1" />网盘链接
              </button>
            </div>

            <form onSubmit={handleUpload} className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: 'hsl(var(--text-secondary))' }}>曲目标题 *</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="例如：送别" required
                  className="w-full neu p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                  style={{ color: 'hsl(var(--text))', borderRadius: '14px' }} />
              </div>

              {/* Composer */}
              <div>
                <label className="block text-xs font-bold mb-2" style={{ color: 'hsl(var(--text-secondary))' }}>作曲家</label>
                <input type="text" value={composer} onChange={e => setComposer(e.target.value)} placeholder="例如：约翰·庞德·奥特威"
                  className="w-full neu p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                  style={{ color: 'hsl(var(--text))', borderRadius: '14px' }} />
              </div>

              {/* File Upload */}
              {uploadMode === 'file' ? (
                <div>
                  <label className="block text-xs font-bold mb-2" style={{ color: 'hsl(var(--text-secondary))' }}>谱子文件（PDF或图片）</label>
                  <label className="neu neu-hover p-6 text-center cursor-pointer block" style={{ borderRadius: '16px', border: '2px dashed hsl(var(--border))' }}>
                    <Upload className="w-6 h-6 mx-auto mb-2" style={{ color: 'hsl(var(--text-tertiary))' }} />
                    <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>{file ? file.name : '点击上传文件'}</p>
                    <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-tertiary))' }}>支持：PDF、图片、MIDI、音频(mp3/wav)</p>
                    <p className="text-xs font-bold mt-1" style={{ color: 'var(--accent)' }}>超过35MB请用网盘链接</p>
                    {file && file.size > MAX_FILE_SIZE && (
                      <p className="text-xs mt-1" style={{ color: 'hsl(0,60%,55%)' }}>此文件 {(file.size / 1024 / 1024).toFixed(1)}MB，需用网盘链接</p>
                    )}
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg,.mp3,.wav,.m4a,.mid,.midi" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" />
                  </label>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold mb-2" style={{ color: 'hsl(var(--text-secondary))' }}>网盘分享链接</label>
                  <input type="text" value={externalUrl} onChange={e => setExternalUrl(e.target.value)}
                    placeholder="粘贴百度网盘/阿里云盘/腾讯微云等分享链接"
                    className="w-full neu p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                    style={{ color: 'hsl(var(--text))', borderRadius: '14px' }} />
                  <p className="text-xs mt-1" style={{ color: 'hsl(var(--text-tertiary))' }}>支持任意网盘链接，点击预览将跳转</p>
                  <p className="text-xs font-bold mt-1" style={{ color: 'hsl(210,60%,55%)' }}>推荐：百度网盘、阿里云盘、腾讯微云</p>
                </div>
              )}

              {/* Error */}
              {uploadError && (
                <div className="neu p-3 rounded-xl text-xs font-bold text-center" style={{ color: 'hsl(0,60%,55%)', background: 'hsla(0,60%,55%,0.08)' }}>
                  {uploadError}
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={uploading || !title || (uploadMode === 'link' && !externalUrl.trim())}
                className="w-full btn-primary py-3 rounded-xl text-sm font-bold disabled:opacity-40">
                {uploading ? '上传中...' : '确认上传'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ========== PREVIEW MODAL ========== */}
      {preview && (preview.file_path || preview.external_url) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setPreview(null); }}>
          <div className="neu w-full max-w-4xl h-[85vh] flex flex-col" style={{ borderRadius: '24px' }}>
            <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <div>
                <h3 className="text-base font-bold" style={{ color: 'hsl(var(--text))' }}>{preview.title}</h3>
                <p className="text-xs font-medium mt-0.5" style={{ color: 'hsl(var(--text-tertiary))' }}>{preview.composer} · {preview.key_sig}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="neu-sm text-[10px] font-bold px-2.5 py-1 rounded-lg" style={{ color: 'hsl(0,60%,55%)' }}>版权保护·禁止外传</span>
                <button onClick={() => setPreview(null)} className="neu neu-hover w-8 h-8 rounded-lg flex items-center justify-center">
                  <X className="w-4 h-4" style={{ color: 'hsl(var(--text-tertiary))' }} />
                </button>
              </div>
            </div>

            {/* Watermark */}
            <div className="flex-1 overflow-auto relative" style={{ background: 'hsl(var(--bg))' }}>
              <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center" style={{ opacity: 0.04 }}>
                  <span className="text-5xl font-bold text-accent rotate-[-30deg] select-none whitespace-nowrap">ChoirAI · 仅供内部使用 · 禁止截图外传</span>
                </div>
              </div>

              <div className="relative z-0 p-4 flex items-center justify-center min-h-full">
                {preview.external_url ? (
                  <div className="flex flex-col items-center justify-center">
                    <LinkIcon className="w-12 h-12 mb-4" style={{ color: 'hsl(210,60%,55%)' }} />
                    <p className="text-sm font-medium mb-2" style={{ color: 'hsl(var(--text-secondary))' }}>文件存储在外部网盘</p>
                    <p className="text-xs mb-6 max-w-md text-center break-all" style={{ color: 'hsl(var(--text-tertiary))' }}>{preview.external_url}</p>
                    <a href={preview.external_url} target="_blank" rel="noopener noreferrer" className="btn-primary flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold">
                      <ExternalLink className="w-4 h-4" />打开网盘链接
                    </a>
                  </div>
                ) : preview.file_path && isPdf(preview.file_path) ? (
                  <iframe src={preview.file_path} className="w-full h-full min-h-[70vh] rounded-xl" style={{ background: '#fff' }} />
                ) : preview.file_path && isImage(preview.file_path) ? (
                  <img src={preview.file_path} alt={preview.title} className="max-w-full max-h-[75vh] object-contain rounded-xl" />
                ) : preview.file_path && isAudio(preview.file_path) ? (
                  <div className="flex flex-col items-center gap-4">
                    <Music className="w-16 h-16" style={{ color: 'var(--accent)' }} />
                    <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>{preview.title}</p>
                    <audio controls src={preview.file_path} className="w-full max-w-md" />
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <FileMusic className="w-12 h-12" style={{ color: 'hsl(var(--text-tertiary))' }} />
                    <p className="text-sm font-medium" style={{ color: 'hsl(var(--text-secondary))' }}>此文件暂不支持预览</p>
                    {preview.file_path && (
                      <a href={preview.file_path} download className="btn-primary flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold">
                        <ExternalLink className="w-4 h-4" />下载文件
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
