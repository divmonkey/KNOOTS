import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Table2, HardDrive, RefreshCw } from 'lucide-react';
import { getAccessToken, loginWithGoogle } from '../lib/firebase';

interface GoogleWorkspacePickerProps {
  onClose: () => void;
  onSelect: (url: string, title: string, type: 'doc' | 'sheet' | 'drive') => void;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
}

export default function GoogleWorkspacePicker({ onClose, onSelect }: GoogleWorkspacePickerProps) {
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    try {
      let token = await getAccessToken();
      if (!token) {
        // We might not have token or need a re-auth since scopes were just added
        const authResult = await loginWithGoogle();
        if (authResult?.accessToken) {
          token = authResult.accessToken;
        } else {
          throw new Error('Failed to retrieve Google access token.');
        }
      }

      const q = "mimeType='application/vnd.google-apps.document' or mimeType='application/vnd.google-apps.spreadsheet'";

      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,webViewLink)&pageSize=20`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (!res.ok) {
         if(res.status === 401 || res.status === 403) {
            // Token might be expired or missing scopes, try to re-authenticate
            const authResult = await loginWithGoogle();
            if (authResult?.accessToken) {
              const resRetry = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name,mimeType,webViewLink)&pageSize=20`, {
                headers: { Authorization: `Bearer ${authResult.accessToken}` }
              });
              if(!resRetry.ok){
                 throw new Error('Google Workspace APIs Error. Ensure you have documents / spreadsheets / drive permissions enabled and try again.');
              }
              const data = await resRetry.json();
              setFiles(data.files || []);
              setLoading(false);
              return;
            }
         }
         throw new Error('Failed to fetch Google Drive files.');
      }

      const data = await res.json();
      setFiles(data.files || []);

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred fetching files.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const getFileIcon = (mimeType: string) => {
    if (mimeType === 'application/vnd.google-apps.document') return <FileText className="text-blue-500" size={18} />;
    if (mimeType === 'application/vnd.google-apps.spreadsheet') return <Table2 className="text-green-500" size={18} />;
    return <HardDrive className="text-slate-500" size={18} />;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-6 relative flex flex-col"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <h3 className="text-xl font-bold text-slate-800 dark:text-zinc-100 mb-2 font-condensed tracking-tight">Select Google Workspace File</h3>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mb-6">Choose a Google Doc or Google Sheet to embed directly into this note.</p>

        {error && (
           <div className="mb-4 text-xs font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 rounded-xl p-3 border border-rose-100 dark:border-rose-900 flex justify-between items-center">
             <span>{error}</span>
             <button onClick={fetchFiles} className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900 rounded-lg cursor-pointer"><RefreshCw size={14} /></button>
           </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-indigo-500">
            <RefreshCw size={24} className="animate-spin mb-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Loading Files...</span>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto max-h-[60vh] -mx-4 px-4 space-y-2">
            {files.length === 0 && !error ? (
               <div className="text-center py-12 text-slate-400 text-sm italic font-medium">No Google Docs or Sheets found in your drive.</div>
            ) : (
               files.map(f => {
                   const isDoc = f.mimeType === 'application/vnd.google-apps.document';
                   const type = isDoc ? 'doc' : 'sheet';
                   return (
                     <button
                       key={f.id}
                       onClick={() => onSelect(f.webViewLink, f.name, type)}
                       className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-zinc-800/80 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-zinc-800 cursor-pointer text-left"
                     >
                       <div className="shrink-0 p-2 bg-white dark:bg-zinc-950 rounded-xl shadow-xs border border-slate-100 dark:border-zinc-800 pointer-events-none">
                         {getFileIcon(f.mimeType)}
                       </div>
                       <div className="flex-1 min-w-0">
                         <div className="text-sm font-bold text-slate-800 dark:text-zinc-200 truncate">{f.name}</div>
                         <div className="text-[10px] uppercase font-black tracking-widest text-slate-400 dark:text-zinc-500 mt-1">
                           {isDoc ? 'Google Doc' : 'Google Sheet'}
                         </div>
                       </div>
                     </button>
                   );
               })
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
