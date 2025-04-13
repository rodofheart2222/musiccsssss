import React, { useState, useRef, useEffect } from 'react';
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Settings, 
  RefreshCw, 
  Music, 
  Upload,
  Maximize2,
  SkipForward,
  SkipBack
} from 'lucide-react';
import FrequencyBars from './components/FrequencyBars';
import WaveformVisualizer from './components/WaveformVisualizer';
import CircleVisualizer from './components/CircleVisualizer';
import AudioVisualizer from './components/AudioVisualizer';
import MandalaVisualizer from './components/MandalaVisualizer';

// Sample tracks - using direct MP3 URLs that are known to work
const sampleTracks = [
  { name: 'Electronic Beat', url: 'https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3' },
  { name: 'Ambient Atmosphere', url: 'https://assets.mixkit.co/music/preview/mixkit-dreaming-big-31.mp3' },
  { name: 'Deep Bass', url: 'https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3' },
  { name: 'Drum & Bass', url: 'https://assets.mixkit.co/music/preview/mixkit-driving-ambition-32.mp3' },
  { name: 'Jazz Groove', url: 'https://assets.mixkit.co/music/preview/mixkit-jazzy-lounge-95.mp3' },
  { name: 'Orchestral', url: 'https://assets.mixkit.co/music/preview/mixkit-serene-view-443.mp3' }
];

function App() {
  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTrack, setCurrentTrack] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioReady, setAudioReady] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Visualizer state
  const [visualizerType, setVisualizerType] = useState('frequency');
  const [showSettings, setShowSettings] = useState(false);
  const [fftSize, setFftSize] = useState(2048);
  const [smoothingTimeConstant, setSmoothingTimeConstant] = useState(0.8);
  
  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioSetupCompleteRef = useRef<boolean>(false);
  
  // Initialize audio context and analyser
  useEffect(() => {
    // Create audio element programmatically
    const audioElement = new Audio();
    audioElement.crossOrigin = "anonymous";
    audioElement.preload = "auto";
    audioRef.current = audioElement;
    
    // Create audio context
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    audioContextRef.current = new AudioContext();
    
    // Create analyser node
    const analyser = audioContextRef.current.createAnalyser();
    analyser.fftSize = fftSize;
    analyser.smoothingTimeConstant = smoothingTimeConstant;
    analyserRef.current = analyser;
    
    // Set up audio processing chain
    try {
      sourceRef.current = audioContextRef.current.createMediaElementSource(audioElement);
      sourceRef.current.connect(analyser);
      analyser.connect(audioContextRef.current.destination);
      audioSetupCompleteRef.current = true;
    } catch (error) {
      console.error("Error setting up audio:", error);
      setAudioError("Failed to initialize audio system. Please try refreshing the page.");
    }
    
    // Set up event listeners
    const handleCanPlay = () => {
      setAudioReady(true);
      setAudioError(null);
    };
    
    const handleTimeUpdate = () => {
      setCurrentTime(audioElement.currentTime);
    };
    
    const handleLoadedMetadata = () => {
      setDuration(audioElement.duration);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
    };
    
    const handleError = (e: ErrorEvent) => {
      console.error("Audio error:", e);
      setAudioError("Error loading audio. Please try another track.");
      setIsPlaying(false);
    };
    
    audioElement.addEventListener('canplay', handleCanPlay);
    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    audioElement.addEventListener('ended', handleEnded);
    audioElement.addEventListener('error', handleError as EventListener);
    
    // Auto-play first track after a short delay
    setTimeout(() => {
      playSampleTrack(sampleTracks[0]);
    }, 500);
    
    // Clean up on unmount
    return () => {
      audioElement.pause();
      audioElement.removeEventListener('canplay', handleCanPlay);
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
      audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audioElement.removeEventListener('ended', handleEnded);
      audioElement.removeEventListener('error', handleError as EventListener);
      
      if (sourceRef.current) {
        sourceRef.current.disconnect();
      }
      
      if (analyserRef.current) {
        analyserRef.current.disconnect();
      }
      
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);
  
  // Update analyser settings when changed
  useEffect(() => {
    if (analyserRef.current) {
      analyserRef.current.fftSize = fftSize;
      analyserRef.current.smoothingTimeConstant = smoothingTimeConstant;
    }
  }, [fftSize, smoothingTimeConstant]);
  
  // Update volume when changed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);
  
  // Monitor fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      
      // Show controls briefly when entering/exiting fullscreen
      setShowControls(true);
      resetControlsTimeout();
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  // Handle mouse movement to show/hide controls
  useEffect(() => {
    if (!isFullscreen) return;
    
    const handleMouseMove = () => {
      setShowControls(true);
      resetControlsTimeout();
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
    };
  }, [isFullscreen, controlsTimeout]);
  
  // Reset the controls timeout
  const resetControlsTimeout = () => {
    if (controlsTimeout) {
      clearTimeout(controlsTimeout);
    }
    
    const timeout = setTimeout(() => {
      setShowControls(false);
    }, 3000);
    
    setControlsTimeout(timeout);
  };
  
  // Play sample track
  const playSampleTrack = (track: { name: string, url: string }) => {
    if (!audioRef.current) return;
    
    setAudioError(null);
    setAudioReady(false);
    
    // Resume audio context if suspended
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    // Set track
    audioRef.current.src = track.url;
    setCurrentTrack(track.name);
    
    // Set volume
    audioRef.current.volume = isMuted ? 0 : volume;
    
    // Load and play
    audioRef.current.load();
    
    // Play after a short delay to ensure loading
    setTimeout(() => {
      if (audioRef.current) {
        const playPromise = audioRef.current.play();
        
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
              setAudioReady(true);
            })
            .catch(error => {
              console.error("Error playing audio:", error);
              setAudioError("Playback blocked. Click anywhere to enable audio.");
              
              // Try to play again with user interaction
              const userInteractionPlay = () => {
                if (audioRef.current) {
                  audioRef.current.play()
                    .then(() => {
                      setIsPlaying(true);
                      setAudioReady(true);
                      setAudioError(null);
                      document.removeEventListener('click', userInteractionPlay);
                    })
                    .catch(err => {
                      console.error("Still can't play:", err);
                      setAudioError("Audio format not supported. Try another track.");
                    });
                }
              };
              
              document.addEventListener('click', userInteractionPlay, { once: true });
            });
        }
      }
    }, 300);
  };
  
  // Play/pause audio
  const playAudio = () => {
    if (!audioRef.current || !currentTrack) return;
    
    // Resume audio context if suspended
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    const playPromise = audioRef.current.play();
    
    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          setAudioError(null);
        })
        .catch(error => {
          console.error("Error playing audio:", error);
          setAudioError("Playback blocked. Click anywhere to enable audio.");
        });
    }
  };
  
  const pauseAudio = () => {
    if (!audioRef.current) return;
    
    audioRef.current.pause();
    setIsPlaying(false);
  };
  
  // Toggle mute
  const toggleMute = () => {
    if (!audioRef.current) return;
    
    if (isMuted) {
      audioRef.current.volume = volume;
      setIsMuted(false);
    } else {
      audioRef.current.volume = 0;
      setIsMuted(true);
    }
  };
  
  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    
    if (!audioRef.current) return;
    
    audioRef.current.volume = newVolume;
    if (newVolume > 0 && isMuted) {
      setIsMuted(false);
    }
  };
  
  // Handle seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    
    const seekTime = parseFloat(e.target.value);
    audioRef.current.currentTime = seekTime;
    setCurrentTime(seekTime);
  };
  
  // Format time (seconds to MM:SS)
  const formatTime = (time: number) => {
    if (isNaN(time)) return '0:00';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Reset analyser settings
  const resetAnalyserSettings = () => {
    setFftSize(2048);
    setSmoothingTimeConstant(0.8);
  };
  
  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !audioRef.current) return;
    
    setAudioError(null);
    setAudioReady(false);
    
    // Create object URL for the file
    const objectUrl = URL.createObjectURL(file);
    
    // Set as current track
    audioRef.current.src = objectUrl;
    setCurrentTrack(file.name);
    
    // Load and play
    audioRef.current.load();
    
    // Play after a short delay to ensure loading
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
            setAudioReady(true);
          })
          .catch(error => {
            console.error("Error playing uploaded file:", error);
            setAudioError("Error playing this file. It may be in an unsupported format.");
          });
      }
    }, 300);
  };
  
  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };
  
  // Toggle fullscreen
  const toggleFullscreen = () => {
    const container = canvasContainerRef.current;
    if (!container) return;
    
    if (!document.fullscreenElement) {
      container.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };
  
  // Skip to next/previous track
  const skipToNextTrack = () => {
    if (!currentTrack) {
      playSampleTrack(sampleTracks[0]);
      return;
    }
    
    const currentIndex = sampleTracks.findIndex(track => track.name === currentTrack);
    const nextIndex = (currentIndex + 1) % sampleTracks.length;
    playSampleTrack(sampleTracks[nextIndex]);
  };
  
  const skipToPreviousTrack = () => {
    if (!currentTrack) {
      playSampleTrack(sampleTracks[sampleTracks.length - 1]);
      return;
    }
    
    const currentIndex = sampleTracks.findIndex(track => track.name === currentTrack);
    const prevIndex = (currentIndex - 1 + sampleTracks.length) % sampleTracks.length;
    playSampleTrack(sampleTracks[prevIndex]);
  };
  
  // Force user interaction to enable audio
  const forceUserInteraction = () => {
    if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    
    if (audioRef.current && !isPlaying && currentTrack) {
      playAudio();
    }
    
    setAudioError(null);
  };
  
  // Determine if visualizer should be shown
  const showVisualizer = analyserRef.current !== null && !audioError;
  
  return (
    <div 
      className="min-h-screen bg-black text-white"
      onClick={forceUserInteraction}
    >
      <div 
        ref={canvasContainerRef}
        className="canvas-container w-full h-screen bg-black overflow-hidden relative"
        onDoubleClick={toggleFullscreen}
        onMouseMove={() => {
          if (isFullscreen) {
            setShowControls(true);
            resetControlsTimeout();
          }
        }}
      >
        {/* Visualizer */}
        {showVisualizer && visualizerType === 'frequency' && <FrequencyBars analyser={analyserRef.current} />}
        {showVisualizer && visualizerType === 'waveform' && <WaveformVisualizer analyser={analyserRef.current} />}
        {showVisualizer && visualizerType === 'circle' && <CircleVisualizer analyser={analyserRef.current} />}
        {showVisualizer && visualizerType === 'advanced' && <AudioVisualizer analyser={analyserRef.current} />}
        {showVisualizer && visualizerType === 'mandala' && <MandalaVisualizer analyser={analyserRef.current} />}
        
        {/* Floating controls */}
        <div 
          className={`absolute bottom-0 left-0 right-0 p-4 transition-opacity duration-300 ${
            (isFullscreen && !showControls) ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
        >
          {/* Floating control panel */}
          <div className="max-w-3xl mx-auto bg-black/60 backdrop-blur-md rounded-xl p-4 shadow-xl border border-gray-800/50">
            {/* Track info and time */}
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium truncate flex-1 mr-4">
                {currentTrack || 'No track selected'}
              </div>
               <div className="flex items-center space-x-2 text-xs text-gray-400">
                <span>{formatTime(currentTime)}</span>
                <span>/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
            
            {/* Progress bar */}
            <input 
              type="range"
              min="0"
              max={duration || 0}
              step="0.01"
              value={currentTime}
              onChange={handleSeek}
              className="w-full accent-indigo-600 mb-3"
              disabled={!currentTrack}
            />
            
            {/* Main controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button 
                  onClick={skipToPreviousTrack}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  <SkipBack size={18} />
                </button>
                
                <button 
                  onClick={isPlaying ? pauseAudio : playAudio}
                  className="w-10 h-10 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 rounded-full text-white transition-colors shadow-lg shadow-indigo-600/30"
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>
                
                <button 
                  onClick={skipToNextTrack}
                  className="text-gray-300 hover:text-white transition-colors"
                >
                  <SkipForward size={18} />
                </button>
                
                <button 
                  onClick={toggleMute}
                  className="text-gray-300 hover:text-white transition-colors ml-2"
                >
                  {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                </button>
                
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-20 accent-indigo-600"
                />
              </div>
              
              <div className="flex items-center space-x-3">
                <select 
                  value={visualizerType}
                  onChange={(e) => setVisualizerType(e.target.value)}
                  className="bg-gray-800 text-white text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 border border-gray-700"
                >
                  <option value="frequency">Frequency</option>
                  <option value="waveform">Waveform</option>
                  <option value="circle">Circle</option>
                  <option value="advanced">Advanced</option>
                  <option value="mandala">Mandala</option>
                </select>
                
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className={`text-gray-300 hover:text-white transition-colors ${showSettings ? 'text-indigo-400' : ''}`}
                  title="Visualizer settings"
                >
                  <Settings size={18} />
                </button>
                
                <button 
                  onClick={triggerFileInput}
                  className="text-gray-300 hover:text-white transition-colors"
                  title="Upload your own audio"
                >
                  <Upload size={18} />
                </button>
                
                <button 
                  onClick={toggleFullscreen}
                  className="text-gray-300 hover:text-white transition-colors"
                  title="Toggle fullscreen (or double-click)"
                >
                  <Maximize2 size={18} />
                </button>
                
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="audio/*"
                  className="hidden"
                />
              </div>
            </div>
            
            {/* Settings panel */}
            {showSettings && (
              <div className="w-full mt-4 bg-gray-800/70 rounded-lg p-3 backdrop-blur-sm border border-gray-700/50 animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-white text-sm font-medium flex items-center">
                    <Settings size={14} className="mr-2" />
                    Visualizer Settings
                  </h2>
                  <button 
                    onClick={resetAnalyserSettings}
                    className="text-xs bg-gray-700 hover:bg-gray-600 text-white px-2 py-0.5 rounded flex items-center"
                  >
                    <RefreshCw size={10} className="mr-1" />
                    Reset
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">
                      FFT Size: {fftSize}
                    </label>
                    <select
                      value={fftSize}
                      onChange={(e) => setFftSize(Number(e.target.value))}
                      className="w-full bg-gray-700 text-white text-xs rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 border border-gray-600"
                    >
                      <option value={256}>256 (Low detail)</option>
                      <option value={512}>512</option>
                      <option value={1024}>1024</option>
                      <option value={2048}>2048 (Standard)</option>
                      <option value={4096}>4096</option>
                      <option value={8192}>8192 (High detail)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-300 mb-1">
                      Smoothing: {smoothingTimeConstant.toFixed(2)}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="0.99"
                      step="0.01"
                      value={smoothingTimeConstant}
                      onChange={(e) => setSmoothingTimeConstant(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Error overlay */}
        {(!audioReady || audioError) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-10">
            <div className="text-center p-4">
              {audioError ? (
                <p className="text-red-400 mb-3">{audioError}</p>
              ) : (
                <p className="text-white mb-3">Click to enable audio</p>
              )}
              <button 
                onClick={forceUserInteraction}
                className="px-4 py-2 bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
              >
                Start Audio
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;