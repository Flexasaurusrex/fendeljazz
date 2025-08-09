'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Mic, Plus, Edit, Trash2, X, Upload, FileAudio } from 'lucide-react';
import { upload } from '@vercel/blob/client';

interface Recording {
  id: number;
  title: string;
  description: string;
  date: string;
  duration: string;
  url: string;
}

const JazzRadioPlayer: React.FC = () => {
  const [currentView, setCurrentView] = useState<'landing' | 'player' | 'admin'>('landing');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState(0);
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [volume, setVolume] = useState(0.7);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  
  // Form states
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [editingRecording, setEditingRecording] = useState<Recording | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);

  // Load recordings from database on mount
  useEffect(() => {
    loadRecordings();
  }, []);

  const loadRecordings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/recordings');
      if (response.ok) {
        const data = await response.json();
        console.log('Loaded recordings from database:', data);
        setRecordings(data);
      } else {
        console.error('Failed to load recordings');
        setRecordings([]);
      }
    } catch (error) {
      console.error('Error loading recordings:', error);
      setRecordings([]);
    } finally {
      setLoading(false);
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
        setCurrentTrack(prev => prev + 1);
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
    const audio = audioRef.current;
    if (audio && recordings[currentTrack]) {
      audio.src = recordings[currentTrack].url;
      if (isPlaying) {
        audio.play().catch(console.error);
      }
    }
  }, [currentTrack, recordings, isPlaying]);

  // Audio controls
  const togglePlayPause = () => {
    const audio = audioRef.current;
    if (!audio || recordings.length === 0) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
    setIsPlaying(!isPlaying);
  };

  const skipTrack = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentTrack > 0) {
      setCurrentTrack(prev => prev - 1);
    } else if (direction === 'next' && currentTrack < recordings.length - 1) {
      setCurrentTrack(prev => prev + 1);
    }
  };

  const seekTo = (time: number) => {
    const audio = audioRef.current;
    if (audio) {
      audio.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  // File upload handling with direct client upload to Vercel Blob
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log('File selected:', file);
    
    if (file) {
      console.log(`Selected file: ${file.name}, size: ${(file.size / (1024 * 1024)).toFixed(2)}MB, type: ${file.type}`);
      
      // Auto-fill title from filename
      if (!newTitle) {
        const titleFromFile = file.name.replace(/\.[^/.]+$/, '');
        setNewTitle(titleFromFile);
        console.log('Auto-filled title:', titleFromFile);
      }
      
      setUploadFile(file);
      console.log('Upload file state updated');
    } else {
      console.log('No file selected');
      setUploadFile(null);
    }
  };

  // Direct upload to Vercel Blob
  const uploadToBlob = async (file: File): Promise<string> => {
    const filename = `jazz-recordings/${Date.now()}-${file.name}`;
    
    console.log(`Uploading ${file.name} directly to Vercel Blob...`);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate progress for user feedback
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 90) return prev + 10;
          return prev;
        });
      }, 200);

      // Upload directly to Vercel Blob
      const blob = await upload(filename, file, {
        access: 'public',
        handleUploadUrl: '/api/upload-url'
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      console.log('Upload completed successfully:', blob.url);
      return blob.url;
    } catch (error) {
      console.error('Upload failed:', error);
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 1000); // Reset progress after a delay
    }
  };

  // Add new recording
  const addRecording = async () => {
    console.log('Add Recording clicked!');
    console.log('Title:', newTitle);
    console.log('File:', uploadFile);
    console.log('Is uploading:', isUploading);

    if (!newTitle.trim()) {
      alert('Please enter a title for the recording');
      return;
    }

    if (!uploadFile) {
      alert('Please select an audio file to upload');
      return;
    }

    try {
      console.log('Starting upload process...');
      // Upload file to Vercel Blob
      const fileUrl = await uploadToBlob(uploadFile);
      console.log('File uploaded, URL:', fileUrl);

      // Save recording metadata to database
      const newRecording = {
        title: newTitle,
        description: newDescription,
        date: newDate,
        duration: 'Unknown', // We could calculate this if needed
        url: fileUrl,
      };

      console.log('Saving to database:', newRecording);
      const response = await fetch('/api/recordings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRecording),
      });

      if (response.ok) {
        console.log('Recording added successfully');
        await loadRecordings(); // Reload the list
        
        // Clear form
        setNewTitle('');
        setNewDescription('');
        setNewDate(new Date().toISOString().split('T')[0]);
        setUploadFile(null);
        
        // Reset file input
        const fileInput = document.getElementById('audio-file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
        
        alert('Recording added successfully!');
      } else {
        const errorData = await response.json();
        console.error('Database save failed:', errorData);
        throw new Error(errorData.error || 'Failed to save recording');
      }
    } catch (error) {
      console.error('Error adding recording:', error);
      alert(`Failed to add recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Delete recording
  const deleteRecording = async (id: number) => {
    if (!confirm('Are you sure you want to delete this recording?')) return;

    try {
      console.log(`Deleting recording with ID: ${id}`);
      const response = await fetch(`/api/recordings/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        console.log('Recording deleted successfully');
        await loadRecordings(); // Reload the list
        
        // Adjust current track if necessary
        if (currentTrack >= recordings.length - 1) {
          setCurrentTrack(Math.max(0, recordings.length - 2));
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete recording');
      }
    } catch (error) {
      console.error('Error deleting recording:', error);
      alert(`Failed to delete recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Clear all recordings
  const clearAllRecordings = async () => {
    if (!confirm('Are you sure you want to delete ALL recordings? This cannot be undone.')) return;

    try {
      console.log('Clearing all recordings...');
      const deletePromises = recordings.map(recording => 
        fetch(`/api/recordings/${recording.id}`, { method: 'DELETE' })
      );
      
      await Promise.all(deletePromises);
      console.log('All recordings cleared');
      await loadRecordings(); // Reload the list
      setCurrentTrack(0);
      alert('All recordings have been cleared.');
    } catch (error) {
      console.error('Error clearing recordings:', error);
      alert(`Failed to clear recordings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Update recording
  const updateRecording = async () => {
    if (!editingRecording) return;

    try {
      const response = await fetch(`/api/recordings/${editingRecording.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRecording),
      });

      if (response.ok) {
        await loadRecordings();
        setEditingRecording(null);
        alert('Recording updated successfully!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update recording');
      }
    } catch (error) {
      console.error('Error updating recording:', error);
      alert(`Failed to update recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
                <div className="w-8 h-8 bg-red-500 rounded-full animate-pulse"></div>
                <div className="absolute inset-0 w-8 h-8 bg-red-400 rounded-full animate-ping"></div>
              </div>
              <span className="text-4xl font-bold text-amber-400 tracking-wider animate-pulse">
                ON AIR
              </span>
            </div>
          </div>

          {/* Main Title */}
          <h1 className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-amber-300 mb-4 font-serif">
            High Standards
          </h1>
          
          {/* Subtitle */}
          <p className="text-2xl md:text-3xl text-amber-200 mb-2 font-light">
            with George Fendel
          </p>
          
          {/* Description */}
          <p className="text-lg text-amber-100/80 mb-12 max-w-xl mx-auto leading-relaxed">
            Step into the golden age of jazz radio. Experience the finest recordings 
            from years of broadcast excellence.
          </p>

          {/* Enter Button */}
          <button
            onClick={() => setCurrentView('player')}
            className="group relative inline-flex items-center justify-center px-12 py-4 text-xl font-semibold text-amber-900 bg-gradient-to-r from-amber-400 to-orange-400 rounded-full shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-amber-300/50"
          >
            <span className="relative z-10">Enter the Studio</span>
            <div className="absolute inset-0 bg-gradient-to-r from-amber-300 to-orange-300 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
        </div>
      </div>
    );
  }

  if (currentView === 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black p-6">
        <div className="max-w-6xl mx-auto">
          {/* Admin Header */}
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-amber-400">Admin Panel</h1>
            <div className="flex space-x-4">
              <button
                onClick={() => setCurrentView('player')}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-amber-400"
              >
                Back to Player
              </button>
              {recordings.length > 0 && (
                <button
                  onClick={clearAllRecordings}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors text-white"
                  title="Clear all recordings"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="text-center text-amber-400 text-xl">Loading recordings...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Add New Recording */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                <h2 className="text-xl font-bold text-amber-400 mb-6 flex items-center">
                  <Plus className="w-5 h-5 mr-2" />
                  Add New Recording
                </h2>
                
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Recording Title"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-amber-400 focus:outline-none"
                  />
                  
                  <textarea
                    placeholder="Description (optional)"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-amber-400 focus:outline-none resize-none h-24"
                  />
                  
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-amber-400 focus:outline-none"
                  />
                  
                  {/* File Upload */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-amber-400">
                      Audio File (Up to 5TB supported!)
                    </label>
                    <div className="relative">
                      <input
                        id="audio-file"
                        type="file"
                        accept="audio/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <label
                        htmlFor="audio-file"
                        className="flex items-center justify-center w-full px-4 py-6 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-amber-400 transition-colors group"
                      >
                        <div className="text-center">
                          <Upload className="w-8 h-8 text-gray-400 group-hover:text-amber-400 mx-auto mb-2" />
                          <p className="text-gray-400 group-hover:text-amber-400">
                            {uploadFile ? uploadFile.name : 'Click to upload audio file'}
                          </p>
                          {uploadFile && (
                            <p className="text-sm text-gray-500 mt-1">
                              Size: {(uploadFile.size / (1024 * 1024)).toFixed(2)} MB
                            </p>
                          )}
                        </div>
                      </label>
                    </div>

                    {/* Upload Progress */}
                    {isUploading && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-amber-400">
                          <span>Uploading to Vercel Blob...</span>
                          <span>{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <div
                            className="bg-gradient-to-r from-blue-500 to-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button
                    onClick={addRecording}
                    disabled={!newTitle.trim() || !uploadFile || isUploading}
                    className="w-full px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-600 rounded-lg font-semibold text-white transition-all duration-300 disabled:cursor-not-allowed"
                  >
                    {isUploading ? 'Uploading...' : 'Add Recording'}
                  </button>

                  {/* Debug Info */}
                  <div className="text-xs text-gray-500 mt-2">
                    <p>Title: {newTitle ? '✅' : '❌'} {newTitle || 'No title entered'}</p>
                    <p>File: {uploadFile ? '✅' : '❌'} {uploadFile ? uploadFile.name : 'No file selected'}</p>
                    <p>Button enabled: {!newTitle.trim() || !uploadFile || isUploading ? '❌' : '✅'}</p>
                  </div>
                </div>
              </div>

              {/* Recordings List */}
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
                <h2 className="text-xl font-bold text-amber-400 mb-6 flex items-center justify-between">
                  <span className="flex items-center">
                    <FileAudio className="w-5 h-5 mr-2" />
                    Recordings ({recordings.length})
                  </span>
                </h2>
                
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {recordings.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">
                      No recordings yet. Add your first recording above!
                    </p>
                  ) : (
                    recordings.map((recording) => (
                      <div
                        key={recording.id}
                        className="bg-gray-700/50 rounded-lg p-4 border border-gray-600"
                      >
                        {editingRecording?.id === recording.id ? (
                          <div className="space-y-3">
                            <input
                              type="text"
                              value={editingRecording.title}
                              onChange={(e) => setEditingRecording({...editingRecording, title: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
                            />
                            <textarea
                              value={editingRecording.description}
                              onChange={(e) => setEditingRecording({...editingRecording, description: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white h-20 resize-none"
                            />
                            <input
                              type="date"
                              value={editingRecording.date}
                              onChange={(e) => setEditingRecording({...editingRecording, date: e.target.value})}
                              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded text-white"
                            />
                            <div className="flex space-x-2">
                              <button
                                onClick={updateRecording}
                                className="px-3 py-1 bg-green-600 hover:bg-green-700 rounded text-white text-sm"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setEditingRecording(null)}
                                className="px-3 py-1 bg-gray-600 hover:bg-gray-700 rounded text-white text-sm"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className="font-semibold text-amber-400 mb-1">{recording.title}</h3>
                                {recording.description && (
                                  <p className="text-gray-300 text-sm mb-2">{recording.description}</p>
                                )}
                                <p className="text-gray-400 text-xs">
                                  {recording.date} • {recording.duration}
                                </p>
                              </div>
                              <div className="flex space-x-2 ml-4">
                                <button
                                  onClick={() => setEditingRecording(recording)}
                                  className="p-1 text-gray-400 hover:text-amber-400 transition-colors"
                                  title="Edit recording"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => deleteRecording(recording.id)}
                                  className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                                  title="Delete recording"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Player View
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <audio ref={audioRef} preload="metadata" />
      
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 mb-2 font-serif">
            High Standards
          </h1>
          <p className="text-xl text-amber-200 font-light">with George Fendel</p>
        </div>

        {loading ? (
          <div className="text-center text-amber-400 text-xl">Loading recordings...</div>
        ) : recordings.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-6">🎷</div>
            <h2 className="text-2xl text-amber-400 mb-4">No recordings available</h2>
            <p className="text-gray-400 mb-8">Upload some jazz recordings in the admin panel to get started.</p>
            <button
              onClick={() => setIsAdmin(true)}
              className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-lg font-semibold transition-all duration-300"
            >
              Go to Admin Panel
            </button>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* Now Playing */}
            <div className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm rounded-2xl p-8 mb-8 border border-gray-600">
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold text-amber-400 mb-2">
                  {recordings[currentTrack]?.title || 'No recording selected'}
                </h2>
                {recordings[currentTrack]?.description && (
                  <p className="text-gray-300 mb-2">{recordings[currentTrack].description}</p>
                )}
                <p className="text-gray-400">
                  {recordings[currentTrack]?.date} • {recordings[currentTrack]?.duration}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-400 mb-2">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
                <div className="relative">
                  <div className="w-full h-2 bg-gray-600 rounded-full">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full transition-all duration-300"
                      style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max={duration || 0}
                    value={currentTime}
                    onChange={(e) => seekTo(Number(e.target.value))}
                    className="absolute inset-0 w-full h-2 opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center space-x-6 mb-6">
                <button
                  onClick={() => skipTrack('prev')}
                  className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
                  disabled={currentTrack === 0}
                >
                  <SkipBack className="w-5 h-5" />
                </button>
                
                <button
                  onClick={togglePlayPause}
                  className="p-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 rounded-full transition-all duration-300 transform hover:scale-105"
                >
                  {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                </button>
                
                <button
                  onClick={() => skipTrack('next')}
                  className="p-3 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors"
                  disabled={currentTrack === recordings.length - 1}
                >
                  <SkipForward className="w-5 h-5" />
                </button>
              </div>

              {/* Volume Control */}
              <div className="flex items-center justify-center space-x-4">
                <Volume2 className="w-5 h-5 text-gray-400" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => {
                    const newVolume = Number(e.target.value);
                    setVolume(newVolume);
                    if (audioRef.current) {
                      audioRef.current.volume = newVolume;
                    }
                  }}
                  className="w-32 h-2 bg-gray-600 rounded-full appearance-none cursor-pointer slider"
                />
                <span className="text-sm text-gray-400 w-12">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </div>

            {/* Playlist */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
              <h3 className="text-xl font-bold text-amber-400 mb-6 flex items-center">
                <FileAudio className="w-5 h-5 mr-2" />
                Playlist ({recordings.length} recordings)
              </h3>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {recordings.map((recording, index) => (
                  <div
                    key={recording.id}
                    onClick={() => setCurrentTrack(index)}
                    className={`p-4 rounded-lg cursor-pointer transition-all duration-300 ${
                      index === currentTrack
                        ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50'
                        : 'bg-gray-700/30 hover:bg-gray-600/50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className={`font-semibold ${index === currentTrack ? 'text-amber-400' : 'text-white'}`}>
                          {recording.title}
                        </h4>
                        <p className="text-sm text-gray-400">
                          {recording.date} • {recording.duration}
                        </p>
                      </div>
                      {index === currentTrack && isPlaying && (
                        <div className="flex space-x-1">
                          <div className="w-1 h-4 bg-amber-400 animate-pulse"></div>
                          <div className="w-1 h-4 bg-amber-400 animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-1 h-4 bg-amber-400 animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
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
