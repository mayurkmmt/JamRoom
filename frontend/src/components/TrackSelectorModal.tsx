import { useState, useEffect, useRef } from 'react';
import { X, Play, Link as LinkIcon, Music, Upload, FileAudio, Loader2 } from 'lucide-react';
import { useParams } from 'next/navigation';

interface TrackSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (track: any) => void;
}

export function TrackSelectorModal({ isOpen, onClose, onSelect }: TrackSelectorModalProps) {
  const { roomId } = useParams();
  const [apiTracks, setApiTracks] = useState<any[]>([]);
  const [customUrl, setCustomUrl] = useState("");
  const [activeTab, setActiveTab] = useState<"url" | "upload">("url");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // API tracks fetch removed as only Custom Audio URL and File UI is needed now
  }, [isOpen]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleFileUploadAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !roomId) return;
    
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      
      const res = await fetch(`/api/uploads/${roomId}`, {
        method: 'POST',
        body: formData
      });
      
      if (!res.ok) throw new Error("Upload failed");
      
      const data = await res.json();
      onSelect({
        id: `upload_${Date.now()}`,
        provider: "local_upload",
        provider_track_id: `${data.url}#${Date.now()}`,
        title: selectedFile.name,
        artist: "Uploaded Track",
        duration: 0,
        url: data.url
      });
      
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error(err);
      alert("Failed to upload the track.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customUrl) return;
    
    // Add raw url directly
    onSelect({
      id: `custom_${Date.now()}`,
      provider: "external",
      provider_track_id: `${customUrl.substring(0,50)}#${Date.now()}`,
      title: "Audio Stream URL",
      artist: "External Link",
      duration: 0,
      url: customUrl
    });
    setCustomUrl("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0f0f15] border border-white/10 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden">

        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/[0.01]">
          <h2 className="text-xl font-bold flex items-center gap-2"><Music className="w-5 h-5 text-fuchsia-500" /> Add Track
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-neutral-400" />
          </button>
        </div>

        <div className="flex border-b border-white/10">
          <button 
            type="button" 
            onClick={() => setActiveTab("url")} 
            className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 ${activeTab === "url" ? "border-fuchsia-500 text-fuchsia-400" : "border-transparent text-neutral-500 hover:text-white"}`}
          >
            Web URL
          </button>
          <button 
            type="button" 
            onClick={() => setActiveTab("upload")} 
            className={`flex-1 py-3 text-sm font-semibold transition-colors border-b-2 flex items-center justify-center gap-2 ${activeTab === "upload" ? "border-fuchsia-500 text-fuchsia-400" : "border-transparent text-neutral-500 hover:text-white"}`}
          >
            Local File
          </button>
        </div>

        <div className="p-5 max-h-[400px] overflow-y-auto space-y-4">
          <div>
            {activeTab === "url" ? (
            <form onSubmit={handleCustomSubmit} className="flex flex-col gap-3">
              <div className="relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                  type="url"
                  value={customUrl}
                  onChange={e => setCustomUrl(e.target.value)}
                  placeholder="https://example.com/audio.mp3"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-fuchsia-500 transition-colors"
                  required
                />
              </div>
              <button type="submit" disabled={!customUrl} className="w-full h-11 flex items-center justify-center gap-2 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white text-sm font-bold rounded-xl transition-colors shadow-[0_0_20px_rgba(217,70,239,0.3)] disabled:opacity-50 disabled:cursor-not-allowed">
                 Add URL Directly
              </button>
            </form>
            ) : (
             <form onSubmit={handleFileUploadAndSubmit} className="flex flex-col gap-4">
               <div className="flex flex-col items-center justify-center w-full min-h-[120px] p-4 text-center border-2 border-dashed border-white/10 rounded-xl hover:border-fuchsia-500/50 hover:bg-fuchsia-500/5 transition-all text-neutral-400 cursor-pointer relative">
                 <input 
                   ref={fileInputRef}
                   type="file" 
                   accept="audio/*"
                   onChange={handleFileChange}
                   className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                   required
                 />
                 {selectedFile ? (
                   <>
                     <FileAudio className="w-8 h-8 mb-2 text-fuchsia-400" />
                     <p className="text-sm text-white font-medium truncate max-w-[200px]">{selectedFile.name}</p>
                   </>
                 ) : (
                   <>
                     <Upload className="w-8 h-8 mb-2 opacity-50" />
                     <p className="text-sm"><span className="font-semibold text-white">Click to upload</span> or drag and drop</p>
                     <p className="text-xs opacity-70 mt-1">MP3, WAV, FLAC, AAC</p>
                   </>
                 )}
               </div>
               <button type="submit" disabled={isUploading || !selectedFile} className="w-full py-2.5 flex items-center justify-center gap-2 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white text-sm font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)] disabled:opacity-50 disabled:cursor-not-allowed">
                 {isUploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</> : 'Upload & Add to Queue'}
               </button>
             </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
