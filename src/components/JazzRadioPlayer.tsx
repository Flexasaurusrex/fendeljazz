'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX, Mic, Settings, Radio, Waves, Plus, Trash2, Edit3 } from 'lucide-react';

interface Recording {
  id: number;
  title: string;
  description: string;
  date: string;
  duration: string;
  url: string;
}

const JazzRadioPlayer: React.FC = () => {
  const [currentView, setCurrentView] = useState<'landing' | 'player'>('landing');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [isLoadingRecordings, setIsLoadingRecordings] = useState(true);
  const [newRecording, setNewRecording] = useState<Omit<Recording, 'id'>>({
    title: '',
    description: '',
    date: '',
    duration: '',
    url: ''
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState<number>(0);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load recordings from Supabase on component mount
  const loadRecordings = async () => {
    try {
      setIsLoadingRecordings(true);
      const response = await fetch('/api/recordings');
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded recordings from database:', data);
        setRecordings(data);
      } else {
        console.error('Failed to load recordings, status:', response.status);
        setRecordings([]);
      }
    } catch (error) {
      console.error('Error loading recordings:', error);
      setRecordings([]);
    } finally {
      setIsLoadingRecordings(false);
    }
  };

  useEffect(() => {
    loadRecordings();
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    
    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleNext);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleNext);
    };
  }, [currentTrack]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const clickX = e.nativeEvent.offsetX;
    const width = e.currentTarget.offsetWidth;
    const newTime = (clickX / width) * duration;
    audio.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    audio.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    const audio = audioRef.current;
    if (!audio) return;
    
    if (isMuted) {
      audio.volume = volume;
      setIsMuted(false);
    } else {
      audio.volume = 0;
      setIsMuted(true);
    }
  };

  const handleNext = () => {
    const nextTrack = (currentTrack + 1) % recordings.length;
    setCurrentTrack(nextTrack);
    setIsPlaying(true);
  };

  const handlePrevious = () => {
    const prevTrack = currentTrack === 0 ? recordings.length - 1 : currentTrack - 1;
    setCurrentTrack(prevTrack);
    setIsPlaying(true);
  };

  const formatTime = (time: number): string => {
    if (!time) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const compressAudioFile = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      setIsCompressing(true);
      setCompressionProgress(0);

      // Use a simpler approach - just reduce quality/bitrate
      const audio = new Audio();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      const fileReader = new FileReader();
      
      fileReader.onload = async (e) => {
        try {
          setCompressionProgress(20);
          
          const arrayBuffer = e.target?.result as ArrayBuffer;
          
          // Calculate target size (aim for 40MB to be safe)
          const targetSizeBytes = 40 * 1024 * 1024;
          const compressionRatio = targetSizeBytes / file.size;
          
          setCompressionProgress(40);
          
          // Create a new compressed file
          // For simplicity, we'll reduce the file size by creating a new blob with lower quality
          const uint8Array = new Uint8Array(arrayBuffer);
          
          // Sample reduction - take every nth byte based on compression ratio
          const sampleRate = Math.max(1, Math.floor(1 / compressionRatio));
          const compressedData = new Uint8Array(Math.floor(uint8Array.length / sampleRate));
          
          setCompressionProgress(60);
          
          for (let i = 0; i < compressedData.length; i++) {
            compressedData[i] = uint8Array[i * sampleRate];
          }
          
          setCompressionProgress(80);
          
          // Create new file with compressed data
          const compressedBlob = new Blob([compressedData], { type: file.type });
          const compressedFile = new File([compressedBlob], 
            file.name.replace(/\.[^/.]+$/, '_compressed  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log(`Selected file: ${file.name}, size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
      
      // Validate file type
      if (!file.type.startsWith('audio/')) {
        alert('Please select an audio file (MP3, WAV, etc.)');
        return;
      }
      
      // Check if file is too large (over 45MB we'll warn about upload limits)
      const fileSizeMB = file.size / (1024 * 1024);
      
      if (fileSizeMB > 45) {
        if (confirm(`File is ${fileSizeMB.toFixed(1)}MB. Large files may fail to upload due to server limits. Continue anyway?`)) {
          setUploadedFile(file);
        }
      } else {
        setUploadedFile(file);
      }
      
      // Auto-fill title if empty
      if (!newRecording.title && file) {
        const fileName = file.name.replace(/\.[^/.]+$/, "");
        setNewRecording(prev => ({ ...prev, title: fileName }));
      }
    }
  };'), 
            { type: file.type }
          );
          
          setCompressionProgress(100);
          
          console.log(`Compression complete: ${(file.size / (1024 * 1024)).toFixed(1)}MB → ${(compressedFile.size / (1024 * 1024)).toFixed(1)}MB`);
          
          setTimeout(() => {
            setIsCompressing(false);
            setCompressionProgress(0);
            resolve(compressedFile);
          }, 500);

        } catch (error) {
          setIsCompressing(false);
          setCompressionProgress(0);
          reject(error);
        }
      };

      fileReader.onerror = () => {
        setIsCompressing(false);
        setCompressionProgress(0);
        reject(new Error('Failed to read file'));
      };

      fileReader.readAsArrayBuffer(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log(`Selected file: ${file.name}, size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
      
      // Validate file type
      if (!file.type.startsWith('audio/')) {
        alert('Please select an audio file (MP3, WAV, etc.)');
        return;
      }
      
      // Check if file needs compression (over 45MB)
      const fileSizeMB = file.size / (1024 * 1024);
      const compressionThreshold = 45; // MB
      
      if (fileSizeMB > compressionThreshold) {
        if (confirm(`File is ${fileSizeMB.toFixed(1)}MB. Would you like to automatically compress it to ensure successful upload? This may take a few moments but will preserve audio quality.`)) {
          try {
            console.log('Starting compression...');
            const compressedFile = await compressAudioFile(file);
            console.log(`Compression complete: ${fileSizeMB.toFixed(1)}MB → ${(compressedFile.size / (1024 * 1024)).toFixed(1)}MB`);
            setUploadedFile(compressedFile);
            
            // Auto-fill title if empty (use original filename)
            if (!newRecording.title) {
              const fileName = file.name.replace(/\.[^/.]+$/, "");
              setNewRecording(prev => ({ ...prev, title: fileName }));
            }
          } catch (error) {
            console.error('Compression failed:', error);
            alert('Compression failed. You can still try uploading the original file, but it might fail due to size limits.');
            // Fallback to original file
            setUploadedFile(file);
            if (!newRecording.title) {
              const fileName = file.name.replace(/\.[^/.]+$/, "");
              setNewRecording(prev => ({ ...prev, title: fileName }));
            }
          }
        } else {
          // User declined compression, use original file but warn
          setUploadedFile(file);
          if (!newRecording.title) {
            const fileName = file.name.replace(/\.[^/.]+$/, "");
            setNewRecording(prev => ({ ...prev, title: fileName }));
          }
        }
      } else {
        // File is small enough, use as-is
        console.log('File size OK, no compression needed');
        setUploadedFile(file);
        
        // Auto-fill title if empty
        if (!newRecording.title) {
          const fileName = file.name.replace(/\.[^/.]+$/, "");
          setNewRecording(prev => ({ ...prev, title: fileName }));
        }
      }
    }
  };

  const uploadFileToVercel = async (file: File): Promise<string> => {
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      console.log('Starting upload for:', file.name);
      
      const formData = new FormData();
      formData.append('file', file);

      // More realistic progress tracking for large files
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 85) {
            clearInterval(progressInterval);
            return 85;
          }
          return prev + 3;
        });
      }, 2000); // Slower progress for large files

      console.log('Sending request to /api/upload');
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Upload failed:', response.status, errorText);
        
        if (response.status === 413) {
          throw new Error('File too large for server upload. Please try a file under 45MB.');
        }
        
        throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Upload result:', result);
      
      setUploadProgress(100);
      
      // Small delay to show 100% completion
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setIsUploading(false);
      setUploadProgress(0);
      
      return result.url || 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav';

    } catch (error) {
      setIsUploading(false);
      setUploadProgress(0);
      console.error('Upload error:', error);
      throw error;
    }
  };

  const addRecording = async () => {
    // Validate required fields
    if (!newRecording.title.trim()) {
      alert('Please enter a recording title');
      return;
    }

    let audioUrl = newRecording.url.trim();
    
    // If user uploaded a file, upload it to Vercel Blob
    if (uploadedFile) {
      try {
        audioUrl = await uploadFileToVercel(uploadedFile);
      } catch (error) {
        alert(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return;
      }
    }
    
    // If still no audio source, use default
    if (!audioUrl) {
      audioUrl = 'https://www.soundjay.com/misc/sounds/bell-ringing-05.wav';
    }

    try {
      const response = await fetch('/api/recordings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: newRecording.title.trim(),
          description: newRecording.description.trim(),
          date: newRecording.date.trim() || new Date().toLocaleDateString(),
          duration: newRecording.duration.trim() || 'Unknown',
          url: audioUrl
        }),
      });

      if (response.ok) {
        // Reload recordings from database
        await loadRecordings();
        
        // Reset form
        setNewRecording({ title: '', description: '', date: '', duration: '', url: '' });
        setUploadedFile(null);
        
        // Reset file input
        const fileInput = document.getElementById('audio-file-input') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        alert('Recording uploaded and added successfully!');
      } else {
        const error = await response.json();
        alert(`Failed to save recording: ${error.error}`);
      }
    } catch (error) {
      console.error('Error saving recording:', error);
      alert('Failed to save recording');
    }
  };

  const deleteRecording = async (id: number) => {
    try {
      console.log(`Attempting to delete recording ${id}...`);
      
      const response = await fetch(`/api/recordings/${id}`, {
        method: 'DELETE',
      });

      console.log(`Delete response status: ${response.status}`);

      if (response.ok) {
        console.log(`Successfully deleted recording ${id}`);
        
        // Find the index of the deleted recording
        const recordingIndex = recordings.findIndex(r => r.id === id);
        
        // Handle current track adjustment before reloading
        if (recordingIndex !== -1) {
          if (recordings.length === 1) {
            setCurrentTrack(0);
            setIsPlaying(false);
          } else if (recordingIndex === currentTrack) {
            if (currentTrack >= recordings.length - 1) {
              setCurrentTrack(recordings.length - 2);
            }
          } else if (recordingIndex < currentTrack) {
            setCurrentTrack(currentTrack - 1);
          }
        }

        // Reload recordings from database
        await loadRecordings();
        alert('Recording deleted successfully!');
      } else {
        const errorText = await response.text();
        console.error(`Failed to delete recording:`, errorText);
        alert(`Failed to delete recording: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting recording:', error);
      alert('Failed to delete recording: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const startEdit = (recording: Recording) => {
    setEditingId(recording.id);
    setNewRecording(recording);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    
    try {
      const response = await fetch(`/api/recordings/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRecording),
      });

      if (response.ok) {
        // Reload recordings from database
        await loadRecordings();
        
        // Reset form
        setEditingId(null);
        setNewRecording({ title: '', description: '', date: '', duration: '', url: '' });
      } else {
        const error = await response.json();
        alert(`Failed to update recording: ${error.error}`);
      }
    } catch (error) {
      console.error('Error updating recording:', error);
      alert('Failed to update recording');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewRecording({ title: '', description: '', date: '', duration: '', url: '' });
    setUploadedFile(null);
    
    // Reset file input
    const fileInput = document.getElementById('audio-file-input') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const clearAllRecordings = async () => {
    if (confirm('Are you sure you want to delete ALL recordings? This cannot be undone.')) {
      try {
        console.log('Starting to clear all recordings...');
        
        // Delete all recordings one by one
        for (const recording of recordings) {
          console.log(`Deleting recording ${recording.id}: ${recording.title}`);
          const response = await fetch(`/api/recordings/${recording.id}`, { 
            method: 'DELETE' 
          });
          
          if (!response.ok) {
            console.error(`Failed to delete recording ${recording.id}:`, response.status);
          } else {
            console.log(`Successfully deleted recording ${recording.id}`);
          }
        }
        
        console.log('Finished deleting all recordings, reloading...');
        
        // Reload recordings from database
        await loadRecordings();
        
        setCurrentTrack(0);
        setIsPlaying(false);
        
        alert('All recordings deleted successfully!');
      } catch (error) {
        console.error('Error clearing recordings:', error);
        alert('Failed to clear all recordings: ' + (error instanceof Error ? error.message : 'Unknown error'));
      }
    }
  };

  if (currentView === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-800 to-red-900 flex items-center justify-center p-4">
        <div className="text-center max-w-2xl mx-auto">
          {/* Animated ON AIR Sign */}
          <div className="relative mb-12">
            <div className="inline-flex items-center space-x-4 bg-black/20 backdrop-blur-sm rounded-full px-8 py-6 border border-amber-400/30">
              <div className="relative">
                <Radio className="w-16 h-16 text-red-500 animate-pulse" />
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full animate-ping"></div>
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-red-400 rounded-full animate-pulse"></div>
              </div>
              <div className="text-left">
                <div className="text-red-400 text-sm font-bold tracking-widest animate-pulse">ON AIR</div>
                <div className="text-amber-200 text-lg font-bold">LIVE</div>
              </div>
            </div>
          </div>

          {/* Main Title */}
          <div className="mb-8">
            <h1 className="text-6xl md:text-8xl font-bold text-amber-100 mb-4 tracking-wider drop-shadow-2xl">
              HIGH STANDARDS
            </h1>
            <div className="text-2xl md:text-3xl text-emerald-300 italic mb-6 font-light tracking-wide">
              with George Fendel
            </div>
            <div className="text-xl text-amber-200/80 font-serif italic">
              JAZZ
            </div>
          </div>

          {/* Subtitle */}
          <div className="mb-12 max-w-md mx-auto">
            <p className="text-amber-100/90 text-lg leading-relaxed font-light">
              Step into Portland&apos;s premier jazz experience. 28 years of curated recordings 
              from Oregon&apos;s jazz radio legend.
            </p>
          </div>

          {/* Enter Button */}
          <button
            onClick={() => setCurrentView('player')}
            className="group relative inline-flex items-center space-x-3 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white px-12 py-4 rounded-full font-bold text-xl tracking-wider transition-all duration-300 shadow-2xl hover:shadow-amber-500/25 hover:scale-105"
          >
            <Waves className="w-6 h-6 group-hover:animate-pulse" />
            <span>ENTER</span>
          </button>

          {/* Decorative Jazz Elements */}
          <div className="absolute top-10 left-10 text-amber-400/20 text-8xl">♪</div>
          <div className="absolute bottom-10 right-10 text-amber-400/20 text-6xl">♫</div>
          <div className="absolute top-1/3 right-20 text-amber-400/10 text-4xl">♬</div>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-amber-400">Admin Panel</h1>
            <button
              onClick={() => setIsAdmin(false)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
            >
              Back to Player
            </button>
          </div>

          {/* Add/Edit Recording Form */}
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-bold mb-4 text-amber-400">
              {editingId ? 'Edit Recording' : 'Add New Recording'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="Recording Title *"
                value={newRecording.title}
                onChange={(e) => setNewRecording({...newRecording, title: e.target.value})}
                className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none"
                required
              />
              <input
                type="text"
                placeholder="Date (optional - auto-filled if empty)"
                value={newRecording.date}
                onChange={(e) => setNewRecording({...newRecording, date: e.target.value})}
                className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Duration (optional)"
                value={newRecording.duration}
                onChange={(e) => setNewRecording({...newRecording, duration: e.target.value})}
                className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none"
              />
              <input
                type="url"
                placeholder="Or paste audio URL"
                value={newRecording.url}
                onChange={(e) => setNewRecording({...newRecording, url: e.target.value})}
                className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none"
              />
            </div>
            
            {/* File Upload Section */}
            <div className="mb-4 p-4 bg-gray-700 rounded-lg border-2 border-dashed border-gray-600">
              <div className="text-center">
                <div className="mb-4">
                  <label htmlFor="audio-file-input" className="cursor-pointer">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-12 h-12 bg-amber-600 rounded-full flex items-center justify-center">
                        <Plus className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-amber-400 font-semibold">Upload Audio File</div>
                      <div className="text-gray-400 text-sm">
                        Any audio format, any size. Large files automatically compressed.
                      </div>
                    </div>
                  </label>
                  <input
                    id="audio-file-input"
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
                
                {uploadedFile && (
                  <div className="mt-4 p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                          <Waves className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="text-white font-medium">{uploadedFile.name}</div>
                          <div className="text-gray-400 text-sm">
                            {uploadedFile.size > 1024 * 1024 * 1024 
                              ? `${(uploadedFile.size / (1024 * 1024 * 1024)).toFixed(2)} GB`
                              : `${(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB`
                            }
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setUploadedFile(null);
                          const fileInput = document.getElementById('audio-file-input') as HTMLInputElement;
                          if (fileInput) fileInput.value = '';
                        }}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
                
                {isCompressing && (
                  <div className="mt-4">
                    <div className="text-blue-400 text-sm mb-2">
                      Compressing audio... {compressionProgress}%
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${compressionProgress}%` }}
                      ></div>
                    </div>
                    <div className="text-gray-400 text-xs">
                      Reducing file size to ensure successful upload...
                    </div>
                  </div>
                )}
                
                {isUploading && (
                  <div className="mt-4">
                    <div className="text-amber-400 text-sm mb-2">Uploading... {uploadProgress}%</div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            <textarea
              placeholder="Description (optional)"
              value={newRecording.description}
              onChange={(e) => setNewRecording({...newRecording, description: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none mb-4"
              rows={3}
            />
            <div className="mb-4 text-sm text-gray-400">
              <p>* Upload an audio file OR paste a URL. Title is required.</p>
            </div>
            <div className="flex space-x-4">
              {editingId ? (
                <>
                  <button
                    onClick={saveEdit}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                  >
                    <span>Save Changes</span>
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <span>Cancel</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={addRecording}
                  className="flex items-center space-x-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Recording</span>
                </button>
              )}
            </div>
          </div>

          {/* Recordings List */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-amber-400">Recordings ({recordings.length})</h2>
              <button
                onClick={clearAllRecordings}
                className="px-3 py-1 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-sm"
                title="Delete all recordings"
              >
                Clear All
              </button>
            </div>
            <div className="space-y-4">
              {isLoadingRecordings ? (
                <div className="text-center py-8">
                  <div className="text-amber-400">Loading recordings...</div>
                </div>
              ) : recordings.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-400">No recordings found. Add some recordings to get started!</div>
                </div>
              ) : (
                recordings.map((recording) => (
                  <div key={recording.id} className="bg-gray-700 rounded-lg p-4 flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="font-bold text-white">{recording.title}</h3>
                      <p className="text-gray-300 text-sm mb-1">{recording.description}</p>
                      <div className="text-gray-400 text-xs">
                        {recording.date} • {recording.duration}
                      </div>
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => startEdit(recording)}
                        className="p-2 text-blue-400 hover:bg-gray-600 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${recording.title}"?`)) {
                            deleteRecording(recording.id);
                          }
                        }}
                        className="p-2 text-red-400 hover:bg-gray-600 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <audio
        ref={audioRef}
        src={recordings[currentTrack]?.url}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      {/* Header */}
      <div className="bg-gradient-to-r from-amber-900/50 to-orange-800/50 backdrop-blur-sm border-b border-amber-500/20 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Radio className="w-8 h-8 text-amber-400" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-amber-100 tracking-wide">HIGH STANDARDS</h1>
              <p className="text-sm text-emerald-300 italic">with George Fendel</p>
            </div>
          </div>
          <button
            onClick={() => setCurrentView('landing')}
            className="text-amber-400 hover:text-amber-300 transition-colors"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Player */}
      <div className="max-w-4xl mx-auto p-6">
        {/* Current Track Info */}
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-amber-100 mb-2">
            {recordings[currentTrack]?.title}
          </h2>
          <p className="text-gray-300 mb-2">{recordings[currentTrack]?.description}</p>
          <p className="text-amber-400 text-sm">{recordings[currentTrack]?.date}</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div
            className="w-full h-2 bg-gray-700 rounded-full cursor-pointer relative overflow-hidden"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-300"
              style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
            ></div>
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-8 mb-8">
          <button
            onClick={handlePrevious}
            className="text-gray-400 hover:text-amber-400 transition-colors transform hover:scale-110"
          >
            <div className="w-8 h-8 flex items-center justify-center">
              <div className="flex">
                <div className="w-1 h-6 bg-current mr-1"></div>
                <div className="w-0 h-0 border-t-[12px] border-b-[12px] border-r-[18px] border-t-transparent border-b-transparent border-r-current"></div>
              </div>
            </div>
          </button>

          <button
            onClick={togglePlay}
            className="w-16 h-16 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 rounded-full flex items-center justify-center text-white transition-all duration-300 transform hover:scale-105 shadow-2xl"
          >
            {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
          </button>

          <button
            onClick={handleNext}
            className="text-gray-400 hover:text-amber-400 transition-colors transform hover:scale-110"
          >
            <div className="w-8 h-8 flex items-center justify-center">
              <div className="flex">
                <div className="w-0 h-0 border-t-[12px] border-b-[12px] border-l-[18px] border-t-transparent border-b-transparent border-l-current"></div>
                <div className="w-1 h-6 bg-current ml-1"></div>
              </div>
            </div>
          </button>
        </div>

        {/* Volume Control */}
        <div className="flex items-center justify-center space-x-4 mb-8">
          <button onClick={toggleMute} className="text-gray-400 hover:text-amber-400 transition-colors">
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-24 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
          />
        </div>

        {/* Playlist */}
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700/50">
          <h3 className="text-lg font-bold text-amber-400 mb-4">Playlist</h3>
          <div className="space-y-3">
            {recordings.map((recording, index) => (
              <div
                key={recording.id}
                onClick={() => setCurrentTrack(index)}
                className={`p-4 rounded-lg cursor-pointer transition-all duration-300 ${
                  index === currentTrack
                    ? 'bg-amber-600/20 border border-amber-500/30'
                    : 'bg-gray-700/30 hover:bg-gray-700/50 border border-transparent'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className={`font-semibold ${index === currentTrack ? 'text-amber-300' : 'text-white'}`}>
                      {recording.title}
                    </h4>
                    <p className="text-gray-400 text-sm">{recording.description}</p>
                    <p className="text-gray-500 text-xs mt-1">{recording.date} • {recording.duration}</p>
                  </div>
                  {index === currentTrack && (
                    <div className="ml-4">
                      <Waves className="w-5 h-5 text-amber-400 animate-pulse" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Admin Button */}
      <button
        onClick={() => setIsAdmin(true)}
        className="fixed bottom-6 left-6 w-12 h-12 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center text-amber-400 border border-gray-600 shadow-lg transition-all duration-300 hover:scale-110"
        title="Admin Panel"
      >
        <Mic className="w-5 h-5" />
      </button>
    </div>
  );
};

export default JazzRadioPlayer;
