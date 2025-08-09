'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Upload, Edit, Trash2, Mic, X } from 'lucide-react';

interface Recording {
  id: number;
  title: string;
  description: string;
  date: string;
  duration: string;
  url: string;
  created_at?: string;
  updated_at?: string;
}

const JazzRadioPlayer: React.FC = () => {
  // State management
  const [currentView, setCurrentView] = useState<'landing' | 'player' | 'admin'>('landing');
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Admin form state
  const [newRecording, setNewRecording] = useState({
    title: '',
    description: '',
    date: '',
    duration: '',
    url: ''
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);

  // Audio ref
  const audioRef = useRef<HTMLAudioElement>(null);

  // Load recordings from database on component mount
  useEffect(() => {
    loadRecordings();
  }, []);

  // Load recordings from database
  const loadRecordings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/recordings');
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded recordings from database:', data);
        setRecordings(data);
      } else {
        console.error('Failed to load recordings from database');
        setRecordings([]);
      }
    } catch (error) {
      console.error('Error loading recordings:', error);
      setRecordings([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Audio event handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => {
      if (currentTrack < recordings.length - 1) {
        setCurrentTrack(currentTrack + 1);
      } else {
        setIsPlaying(false);
      }
    };

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrack, recordings.length]);

  // Update audio source when track changes
  useEffect(() => {
    if (audioRef.current && recordings[currentTrack]) {
      audioRef.current.src = recordings[currentTrack].url;
      audioRef.current.volume = volume;
    }
  }, [currentTrack, recordings, volume]);

  // Audio compression function
  const compressAudioFile = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          
          // Create audio context
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          
          // Decode audio data
          setCompressionProgress(25);
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          // Create a new buffer with reduced sample rate and bit depth
          setCompressionProgress(50);
          const targetSampleRate = 22050; // Reduced from typical 44100
          const channels = Math.min(audioBuffer.numberOfChannels, 1); // Convert to mono
          const length = Math.floor(audioBuffer.duration * targetSampleRate);
          
          const compressedBuffer = audioContext.createBuffer(channels, length, targetSampleRate);
          
          // Copy and downsample audio data
          setCompressionProgress(75);
          for (let channel = 0; channel < channels; channel++) {
            const originalData = audioBuffer.getChannelData(channel);
            const compressedData = compressedBuffer.getChannelData(channel);
            
            for (let i = 0; i < length; i++) {
              const originalIndex = Math.floor(i * (audioBuffer.length / length));
              compressedData[i] = originalData[originalIndex];
            }
          }
          
          // Convert to WAV format
          setCompressionProgress(90);
          const wavData = audioBufferToWav(compressedBuffer);
          const compressedBlob = new Blob([wavData], { type: 'audio/wav' });
          
          const compressedFile = new File(
            [compressedBlob], 
            file.name.replace(/\.[^/.]+$/, '_compressed.wav'),
            { type: 'audio/wav' }
          );
          
          setCompressionProgress(100);
          resolve(compressedFile);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // Helper function to convert AudioBuffer to WAV
  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;
    
    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = buffer.length * blockAlign;
    const bufferSize = 44 + dataSize;
    
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Convert audio data
    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return arrayBuffer;
  };

  // File upload handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log(`Selected file: ${file.name}, size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
      
      const maxSize = 500 * 1024 * 1024; // 500MB limit
      
      if (file.size > maxSize) {
        const shouldCompress = window.confirm(
          `File size is ${(file.size / (1024 * 1024)).toFixed(2)}MB. ` +
          `Would you like to automatically compress it to a smaller size for faster upload?`
        );
        
        if (shouldCompress) {
          try {
            setIsCompressing(true);
            setCompressionProgress(0);
            const compressedFile = await compressAudioFile(file);
            setUploadedFile(compressedFile);
            setNewRecording(prev => ({
              ...prev,
              title: prev.title || compressedFile.name.replace(/\.[^/.]+$/, ''),
              duration: 'Unknown'
            }));
            setIsCompressing(false);
            alert(`File compressed successfully! New size: ${(compressedFile.size / (1024 * 1024)).toFixed(2)}MB`);
          } catch (error) {
            setIsCompressing(false);
            console.error('Compression failed:', error);
            alert('Compression failed. You can still try uploading the original file.');
            setUploadedFile(file);
            setNewRecording(prev => ({
              ...prev,
              title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
              duration: 'Unknown'
            }));
          }
        } else {
          setUploadedFile(file);
          setNewRecording(prev => ({
            ...prev,
            title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
            duration: 'Unknown'
          }));
        }
      } else {
        setUploadedFile(file);
        setNewRecording(prev => ({
          ...prev,
          title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
          duration: 'Unknown'
        }));
      }
    }
  };

  // Add recording to database
  const addRecording = async () => {
    try {
      setIsUploading(true);
      let fileUrl = newRecording.url;

      // Upload file if one was selected
      if (uploadedFile) {
        const formData = new FormData();
        formData.append('file', uploadedFile);

        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadResponse.ok) {
          const errorText = await uploadResponse.text();
          throw new Error(`Upload failed: ${errorText}`);
        }

        const uploadResult = await uploadResponse.json();
        fileUrl = uploadResult.url;
      }

      // Add recording to database
      const recordingData = {
        title: newRecording.title || 'Untitled Recording',
        description: newRecording.description || '',
        date: newRecording.date || new Date().toISOString().split('T')[0],
        duration: newRecording.duration || 'Unknown',
        url: fileUrl || 'https://www2.cs.uic.edu/~i101/SoundFiles/BabyElephantWalk60.wav'
      };

      const response = await fetch('/api/recordings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(recordingData),
      });

      if (response.ok) {
        await loadRecordings(); // Reload from database
        setNewRecording({ title: '', description: '', date: '', duration: '', url: '' });
        setUploadedFile(null);
        alert('Recording added successfully!');
      } else {
        throw new Error('Failed to add recording to database');
      }
    } catch (error) {
      console.error('Error adding recording:', error);
      alert(`Failed to add recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Delete recording from database
  const deleteRecording = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this recording?')) {
      return;
    }

    try {
      console.log(`Deleting recording with ID: ${id}`);
      const response = await fetch(`/api/recordings/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        console.log('Successfully deleted from database');
        await loadRecordings(); // Reload from database
        
        // Adjust current track if necessary
        if (currentTrack >= recordings.length - 1) {
          setCurrentTrack(Math.max(0, recordings.length - 2));
        }
      } else {
        const errorText = await response.text();
        throw new Error(`Delete failed: ${errorText}`);
      }
    } catch (error) {
      console.error('Error deleting recording:', error);
      alert(`Failed to delete recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Clear all recordings
  const clearAllRecordings = async () => {
    if (!window.confirm('Are you sure you want to delete ALL recordings? This cannot be undone.')) {
      return;
    }

    try {
      console.log('Clearing all recordings...');
      const deletePromises = recordings.map(recording => 
        fetch(`/api/recordings/${recording.id}`, { method: 'DELETE' })
      );
      
      await Promise.all(deletePromises);
      console.log('All recordings deleted');
      
      await loadRecordings(); // Reload from database
      setCurrentTrack(0);
      setIsPlaying(false);
    } catch (error) {
      console.error('Error clearing recordings:', error);
      alert(`Failed to clear recordings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Edit recording
  const startEditing = (recording: Recording) => {
    setEditingId(recording.id);
    setNewRecording({
      title: recording.title,
      description: recording.description,
      date: recording.date,
      duration: recording.duration,
      url: recording.url
    });
  };

  const saveEdit = async () => {
    if (editingId === null) return;

    try {
      const response = await fetch(`/api/recordings/${editingId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRecording),
      });

      if (response.ok) {
        await loadRecordings(); // Reload from database
        setEditingId(null);
        setNewRecording({ title: '', description: '', date: '', duration: '', url: '' });
      } else {
        throw new Error('Failed to update recording');
      }
    } catch (error) {
      console.error('Error updating recording:', error);
      alert('Failed to update recording');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewRecording({ title: '', description: '', date: '', duration: '', url: '' });
  };

  // Player controls
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const previousTrack = () => {
    setCurrentTrack(currentTrack > 0 ? currentTrack - 1 : recordings.length - 1);
  };

  const nextTrack = () => {
    setCurrentTrack(currentTrack < recordings.length - 1 ? currentTrack + 1 : 0);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (currentView === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-900 via-orange-800 to-red-900 flex items-center justify-center p-4">
        <div className="text-center max-w-2xl mx-auto">
          {/* Animated ON AIR Sign */}
          <div className="relative mb-12">
            <div className="inline-flex items-center space-x-4 bg-black/20 backdrop-blur-sm rounded-full px-8 py-6 border border-amber-400/30">
              <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/50"></div>
              <span className="text-amber-300 text-2xl font-bold tracking-wider">ON AIR</span>
              <div className="w-8 h-8 bg-amber-400 rounded-full flex items-center justify-center animate-bounce">
                <div className="w-3 h-3 bg-amber-900 rounded-full"></div>
              </div>
            </div>
          </div>

          {/* Main Title */}
          <div className="mb-8">
            <h1 className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-400 to-amber-500 mb-4 tracking-tight">
              HIGH
            </h1>
            <h2 className="text-5xl md:text-7xl font-light text-amber-200 mb-2 tracking-wider">
              STANDARDS
            </h2>
            <p className="text-amber-300/80 text-xl md:text-2xl font-light tracking-wide">
              with George Fendel
            </p>
          </div>

          {/* Subtitle */}
          <div className="mb-12">
            <p className="text-amber-200/70 text-lg md:text-xl max-w-lg mx-auto leading-relaxed">
              Step into the golden age of jazz radio. Experience the timeless recordings and sophisticated sounds that defined an era.
            </p>
          </div>

          {/* Enter Button */}
          <button
            onClick={() => setCurrentView('player')}
            className="group relative px-12 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white text-xl font-semibold rounded-full shadow-2xl hover:shadow-amber-500/25 transform hover:scale-105 transition-all duration-300 border border-amber-400/30"
          >
            <span className="relative z-10">ENTER THE STUDIO</span>
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </div>
      </div>
    );
  }

  if (isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-amber-900 to-orange-900 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-amber-300">Admin Panel</h1>
            <button
              onClick={() => setIsAdmin(false)}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Add/Edit Recording Form */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 mb-8 border border-gray-700">
            <h2 className="text-xl font-semibold text-amber-300 mb-4">
              {editingId ? 'Edit Recording' : 'Add New Recording'}
            </h2>
            
            {/* File Upload Area */}
            {!editingId && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Upload Audio File (Max 500MB)
                </label>
                <div className="relative">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="audio-upload"
                  />
                  <label
                    htmlFor="audio-upload"
                    className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer bg-gray-700/30 hover:bg-gray-700/50 transition-colors"
                  >
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-400">
                      Click to upload or drag and drop
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      MP3, WAV, M4A, etc.
                    </span>
                  </label>
                </div>
                
                {/* Compression Progress */}
                {isCompressing && (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-sm text-gray-300 mb-2">
                      <span>Compressing audio...</span>
                      <span>{compressionProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div 
                        className="h-full bg-blue-500 rounded-full transition-all duration-300"
                        style={{ width: `${compressionProgress}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                {/* Uploaded File Info */}
                {uploadedFile && (
                  <div className="mt-4 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-300">{uploadedFile.name}</p>
                        <p className="text-xs text-gray-500">
                          {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB
                        </p>
                      </div>
                      <button
                        onClick={() => setUploadedFile(null)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
                <input
                  type="text"
                  value={newRecording.title}
                  onChange={(e) => setNewRecording(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Recording title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Date</label>
                <input
                  type="date"
                  value={newRecording.date}
                  onChange={(e) => setNewRecording(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
              <textarea
                value={newRecording.description}
                onChange={(e) => setNewRecording(prev => ({ ...prev, description: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                rows={3}
                placeholder="Recording description"
              />
            </div>

            {editingId && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">URL</label>
                <input
                  type="url"
                  value={newRecording.url}
                  onChange={(e) => setNewRecording(prev => ({ ...prev, url: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  placeholder="Audio file URL"
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-4">
              {editingId ? (
                <>
                  <button
                    onClick={saveEdit}
                    className="px-6 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-white transition-colors"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="px-6 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={addRecording}
                  disabled={isUploading || isCompressing}
                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-600 rounded-lg text-white transition-colors"
                >
                  {isUploading ? 'Adding...' : 'Add Recording'}
                </button>
              )}
            </div>
          </div>

          {/* Recordings List */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-amber-300">
                Recordings ({recordings.length})
              </h2>
              {recordings.length > 0 && (
                <button
                  onClick={clearAllRecordings}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors text-sm"
                >
                  Clear All
                </button>
              )}
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="text-gray-400">Loading recordings...</div>
              </div>
            ) : recordings.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400">No recordings yet. Add your first recording above!</div>
              </div>
            ) : (
              <div className="space-y-3">
                {recordings.map((recording) => (
                  <div key={recording.id} className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                    <div className="flex-1">
                      <h3 className="font-medium text-white">{recording.title}</h3>
                      <p className="text-sm text-gray-400">{recording.description}</p>
                      <p className="text-xs text-gray-500">{recording.date} • {recording.duration}</p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => startEditing(recording)}
                        className="p-2 text-blue-400 hover:text-blue-300 transition-colors"
                        title="Edit recording"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteRecording(recording.id)}
                        className="p-2 text-red-400 hover:text-red-300 transition-colors"
                        title="Delete recording"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-amber-900 to-orange-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-orange-400 mb-2">
            HIGH STANDARDS
          </h1>
          <p className="text-amber-200/80 text-lg">with George Fendel</p>
        </div>

        {/* Audio Element */}
        <audio ref={audioRef} />

        {/* Main Player */}
        <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-8 border border-amber-400/20 shadow-2xl mb-8">
          {/* Current Track Info */}
          {recordings.length > 0 && recordings[currentTrack] && (
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-amber-300 mb-2">
                {recordings[currentTrack].title}
              </h2>
              <p className="text-amber-200/70 mb-1">{recordings[currentTrack].description}</p>
              <p className="text-amber-200/50 text-sm">
                {recordings[currentTrack].date} • {recordings[currentTrack].duration}
              </p>
            </div>
          )}

          {/* Progress Bar */}
          {recordings.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm text-amber-200/70 mb-2">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <div 
                  className="absolute top-0 left-0 h-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg pointer-events-none"
                  style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Control Buttons */}
          {recordings.length > 0 ? (
            <div className="flex items-center justify-center space-x-6 mb-6">
              <button
                onClick={previousTrack}
                className="w-12 h-12 bg-amber-600 hover:bg-amber-700 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110"
              >
                <SkipBack className="w-5 h-5" />
              </button>
              
              <button
                onClick={togglePlayPause}
                className="w-16 h-16 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110 shadow-lg"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
              </button>
              
              <button
                onClick={nextTrack}
                className="w-12 h-12 bg-amber-600 hover:bg-amber-700 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-110"
              >
                <SkipForward className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-amber-200/70 text-lg">No recordings available</p>
              <p className="text-amber-200/50 text-sm">Check back soon for new content!</p>
            </div>
          )}

          {/* Volume Control */}
          {recordings.length > 0 && (
            <div className="flex items-center justify-center space-x-4">
              <Volume2 className="w-5 h-5 text-amber-400" />
              <div className="relative w-32">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <div 
                  className="absolute top-0 left-0 h-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg pointer-events-none"
                  style={{ width: `${volume * 100}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Playlist */}
        {recordings.length > 0 && (
          <div className="bg-black/20 backdrop-blur-sm rounded-xl p-6 border border-amber-400/10">
            <h3 className="text-xl font-semibold text-amber-300 mb-4">Playlist</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recordings.map((recording, index) => (
                <div
                  key={recording.id}
                  onClick={() => setCurrentTrack(index)}
                  className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                    index === currentTrack
                      ? 'bg-amber-500/20 border border-amber-400/40'
                      : 'bg-gray-800/30 hover:bg-gray-700/40 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-white">{recording.title}</h4>
                      <p className="text-sm text-amber-200/70">{recording.date}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-amber-200/50">{recording.duration}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Admin Button */}
        <button
          onClick={() => setIsAdmin(true)}
          className="fixed bottom-6 left-6 w-12 h-12 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center text-amber-400 border border-gray-600 shadow-lg transition-all duration-300 hover:scale-110"
          title="Admin Panel"
        >
          <Mic className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default JazzRadioPlayer;
