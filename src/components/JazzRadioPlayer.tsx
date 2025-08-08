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
  const [recordings, setRecordings] = useState<Recording[]>([
    {
      id: 1,
      title: "High Standards Episode #001",
      description: "Opening show featuring Spike Wilner Trio",
      date: "August 4, 2025",
      duration: "52:14",
      url: "https://example.com/recording1.mp3"
    },
    {
      id: 2,
      title: "High Standards Episode #002", 
      description: "Billie Holiday tribute with special quiz",
      date: "August 2, 2025",
      duration: "48:32",
      url: "https://example.com/recording2.mp3"
    },
    {
      id: 3,
      title: "High Standards Episode #003",
      description: "Gershwin classics and Juliet Ewing interview",
      date: "July 31, 2025", 
      duration: "56:18",
      url: "https://example.com/recording3.mp3"
    }
  ]);
  const [newRecording, setNewRecording] = useState<Omit<Recording, 'id'>>({
    title: '',
    description: '',
    date: '',
    duration: '',
    url: ''
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const audioRef = useRef<HTMLAudioElement>(null);

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

  const addRecording = () => {
    if (newRecording.title && newRecording.url) {
      const recording: Recording = {
        ...newRecording,
        id: Date.now(),
        date: newRecording.date || new Date().toLocaleDateString()
      };
      setRecordings([...recordings, recording]);
      setNewRecording({ title: '', description: '', date: '', duration: '', url: '' });
    }
  };

  const deleteRecording = (id: number) => {
    setRecordings(recordings.filter(r => r.id !== id));
    if (currentTrack >= recordings.length - 1) {
      setCurrentTrack(Math.max(0, recordings.length - 2));
    }
  };

  const startEdit = (recording: Recording) => {
    setEditingId(recording.id);
    setNewRecording(recording);
  };

  const saveEdit = () => {
    if (!editingId) return;
    
    setRecordings(recordings.map(r => 
      r.id === editingId ? { ...newRecording, id: editingId } : r
    ));
    setEditingId(null);
    setNewRecording({ title: '', description: '', date: '', duration: '', url: '' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setNewRecording({ title: '', description: '', date: '', duration: '', url: '' });
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
                placeholder="Recording Title"
                value={newRecording.title}
                onChange={(e) => setNewRecording({...newRecording, title: e.target.value})}
                className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Date (e.g., August 4, 2025)"
                value={newRecording.date}
                onChange={(e) => setNewRecording({...newRecording, date: e.target.value})}
                className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none"
              />
              <input
                type="text"
                placeholder="Duration (e.g., 52:14)"
                value={newRecording.duration}
                onChange={(e) => setNewRecording({...newRecording, duration: e.target.value})}
                className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none"
              />
              <input
                type="url"
                placeholder="Audio URL"
                value={newRecording.url}
                onChange={(e) => setNewRecording({...newRecording, url: e.target.value})}
                className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <textarea
              placeholder="Description"
              value={newRecording.description}
              onChange={(e) => setNewRecording({...newRecording, description: e.target.value})}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:border-amber-500 focus:outline-none mb-4"
              rows={3}
            />
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
            <h2 className="text-xl font-bold mb-4 text-amber-400">Recordings</h2>
            <div className="space-y-4">
              {recordings.map((recording) => (
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
                      onClick={() => deleteRecording(recording.id)}
                      className="p-2 text-red-400 hover:bg-gray-600 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
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
          <div
