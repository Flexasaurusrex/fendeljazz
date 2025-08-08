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
    if (file) {
      console.log(`Selected file: ${file.name}, size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
      
      // Auto-fill title from filename
      if (!newTitle) {
        setNewTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
      
      setUploadFile(file);
    }
  };

  // Direct upload to Vercel Blob
  const uploadToBlob = async (file: File): Promise<string> => {
    const filename = `jazz-recordings/${Date.now()}-${file.name}`;
    
    console.log(`Uploading ${file.name} directly to Vercel Blob...`);
    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Upload directly to Vercel Blob
      const blob = await upload(filename, file, {
        access: 'public',
        handleUploadUrl: '/api/upload-url',
        onUploadProgress: (progress) => {
          const percentage = Math.round((progress.loaded / progress.total) * 100);
          setUploadProgress(percentage);
          console.log(`Upload progress: ${percentage}%`);
        }
      });

      console.log('Upload completed successfully:', blob.url);
      return blob.url;
    } catch (error) {
      console.error('Upload failed:', error);
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Add new recording
  const addRecording = async () => {
    if (!newTitle.trim()) {
      alert('Please enter a title for the recording');
      return;
    }

    if (!uploadFile) {
      alert('Please select an audio file to upload');
      return;
    }

    try {
      // Upload file to Vercel Blob
      const fileUrl = await uploadToBlob(uploadFile);

      // Save recording metadata to database
      const newRecording = {
        title: newTitle,
        description: newDescription,
        date: newDate,
        duration: 'Unknown', // We could calculate this if needed
        url: fileUrl,
      };

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
        throw new Error(errorData.error ||
