import { useState, useEffect } from 'react';
import { useFFmpeg } from './hooks/useFFmpeg';
import { FileUpload } from './components/FileUpload';
import { fetchFile } from '@ffmpeg/util';
import JSZip from 'jszip';
import { Download, Loader2, Music, Trash2, Clock } from 'lucide-react';

export default function App() {
  const { ffmpeg, loaded, load, isLoading, message } = useFFmpeg();
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [segments, setSegments] = useState<{ name: string; url: string }[]>([]);
  const [segmentDuration, setSegmentDuration] = useState(600); // 10 minutes in seconds

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (message) {
      setLogs((prev) => [...prev.slice(-4), message]);
    }
  }, [message]);

  const processAudio = async () => {
    if (!file || !loaded) return;
    setProcessing(true);
    setSegments([]);
    setLogs([]);

    try {
      const ext = file.name.split('.').pop();
      const inputName = `input.${ext}`;

      // Write file to FFmpeg FS
      await ffmpeg.writeFile(inputName, await fetchFile(file));

      // -c copy is fast and preserves quality
      // Map file extension for output, default to mp3 if not recognized but usually safe to copy if container supports it. 
      // Safer: force mp3 output or keep original extension.
      // User asked for "audio", let's name output as .mp3 for simplicity or keep ext.
      // If we use -c copy, the output container must support the codec. 
      // If input is MP3, output MP3 is fine. If input is AAC/M4A, output M4A or MP4 is fine.
      // Let's use the SAME extension for output to ensure compatibility with -c copy.
      const outputPattern = `output_%03d.${ext}`;

      await ffmpeg.exec([
        '-i', inputName,
        '-f', 'segment',
        '-segment_time', segmentDuration.toString(),
        '-c', 'copy',
        outputPattern
      ]);

      // Read output files
      const files = await ffmpeg.listDir('.');
      // files is array of dir entries.
      const outputFiles = files.filter((f) => f.name.startsWith('output_') && f.name.endsWith(`.${ext}`));

      const newSegments = [];
      for (const f of outputFiles) {
        const data = await ffmpeg.readFile(f.name);
        const url = URL.createObjectURL(new Blob([data as any], { type: file!.type }));
        newSegments.push({ name: f.name, url });
      }
      setSegments(newSegments);

      // Clean up input
      await ffmpeg.deleteFile(inputName);
      // Clean up outputs from FS to free memory? 
      // We might need them if we want to re-download. But we have blobs.
      for (const f of outputFiles) {
        await ffmpeg.deleteFile(f.name);
      }

    } catch (e) {
      console.error(e);
      alert('Error processing audio. See console for details.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadAll = async () => {
    const zip = new JSZip();
    for (const segment of segments) {
      const blob = await fetch(segment.url).then(r => r.blob());
      zip.file(segment.name, blob);
    }
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'segments.zip';
    a.click();
  };

  if (isLoading && !loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="text-center">
          <Loader2 className="animate-spin mx-auto mb-4" size={48} />
          <p>Loading FFmpeg Core...</p>
          <p className="text-sm text-gray-500 mt-2">This happens once. Please wait.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-12 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Music size={24} />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Audio Trimmer Pro</h1>
          </div>
          <div className="text-sm text-slate-400">
            {loaded ? <span className="text-green-400">● Core Ready</span> : <span className="text-yellow-400">● Loading Core</span>}
          </div>
        </header>

        <main className="space-y-8">
          {!file ? (
            <FileUpload onFileSelect={setFile} disabled={!loaded} />
          ) : (
            <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700">
              <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-500/20 p-3 rounded-full text-blue-400">
                    <Music size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold">{file.name}</h2>
                    <p className="text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  onClick={() => { setFile(null); setSegments([]); }}
                  className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-red-400 transition-colors"
                  disabled={processing}
                >
                  <Trash2 size={20} />
                </button>
              </div>

              {!processing && segments.length === 0 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">Segment Duration (Minutes)</label>
                    <div className="flex items-center gap-4">
                      <div className="relative flex-1">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                          type="number"
                          value={segmentDuration / 60}
                          onChange={(e) => setSegmentDuration(Math.max(1, parseInt(e.target.value) || 1) * 60)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all"
                        />
                      </div>
                      <span className="text-slate-500">min</span>
                    </div>
                  </div>

                  <button
                    onClick={processAudio}
                    disabled={!loaded}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-4 rounded-xl transition-all shadow-lg shadow-blue-900/20 active:scale-[0.98]"
                  >
                    Start Processing
                  </button>
                </div>
              )}

              {processing && (
                <div className="py-12 text-center space-y-4">
                  <Loader2 className="animate-spin mx-auto text-blue-500" size={48} />
                  <h3 className="text-xl font-semibold">Processing Audio...</h3>
                  <p className="text-slate-400 max-w-md mx-auto">
                    Splitting your file into {segmentDuration / 60}-minute segments. This happens locally in your browser.
                  </p>
                  <div className="mt-4 p-4 bg-slate-900 rounded-lg text-xs font-mono text-slate-500 text-left h-32 overflow-y-auto">
                    {logs.map((log, i) => <div key={i}>{log}</div>)}
                  </div>
                </div>
              )}

              {segments.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Generated Segments ({segments.length})</h3>
                    <button
                      onClick={downloadAll}
                      className="flex items-center gap-2 text-sm bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg transition-colors"
                    >
                      <Download size={16} />
                      Download All (ZIP)
                    </button>
                  </div>

                  <div className="grid gap-3">
                    {segments.map((seg) => (
                      <div key={seg.name} className="flex items-center justify-between bg-slate-900 p-4 rounded-lg border border-slate-700/50">
                        <span className="font-mono text-sm text-slate-300">{seg.name}</span>
                        <div className="flex items-center gap-3">
                          <audio src={seg.url} controls className="h-8 w-64" />
                          <a
                            href={seg.url}
                            download={seg.name}
                            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
                          >
                            <Download size={18} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
