import React, { useRef, useEffect } from 'react';

interface MandalaVisualizerProps {
  analyser: AnalyserNode | null;
}

const MandalaVisualizer: React.FC<MandalaVisualizerProps> = ({ analyser }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    if (!analyser || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set canvas dimensions
    const resizeCanvas = () => {
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Get audio data arrays with proper size
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const waveformArray = new Uint8Array(analyser.fftSize);
    
    // Audio state tracking for transitions
    const audioState = {
      lastBassImpact: 0,
      bassImpactThreshold: 0.8,
      midTransition: 0, 
      highTransition: 0,
      energyHistory: new Array(8).fill(0.5),
      energyTrend: 0,
      beatDetector: {
        history: new Array(5).fill(0),
        threshold: 0.7,
        lastBeat: 0,
        confidence: 0
      }
    };
    
    // Mandala configuration
    let hue = 0;
    let rotation = 0;
    let rotationSpeed = 0.004;
    let rotationDirection = 1;
    let frame = 0;
    let symmetry = 8; // Number of symmetry lines
    let lastSymmetryChange = 0;
    let targetSymmetry = symmetry;
    let symmetryTransition = 1; // 1 = fully transitioned
    
    // Fractal parameters
    let fractalDepth = 3; 
    let fractalScale = 0.7;
    let fractalRotation = 0;
    let targetFractalRotation = 0;
    
    // Visualizer state
    let currentPattern = 1; // Start with flower
    let targetPattern = currentPattern;
    let patternTransition = 1; // 1 = fully transitioned
    let patternChangeCounter = 0;
    
    // Pattern indices
    const SPIRAL = 0;
    const FLOWER = 1;
    const STARBURST = 2;
    const NESTED_CIRCLES = 3;
    const FRACTAL_TREE = 4;  
    const WAVE_PATTERN = 5;
    const SYMMETRICAL_WEB = 6;
    
    // Performance configuration - optimized for smoother performance
    const performanceConfig = {
      qualityLevel: 2.2,          // Higher value = less detail but better performance
      drawEveryNthFrame: 2,       // Skip every other frame for better performance
      complexityReduction: true,  // Enable detail reduction
      maxPoints: 120,             // Reduced detail limit
      useBlur: false,             // Disable blur for better performance
      maxSymmetry: 10,            // Lower symmetry limit for performance
      enableAdvancedEffects: true, // Keep some advanced effects
      useGradients: false         // Use solid colors when false (better performance)
    };
    
    // Pre-calculate constants
    const TWO_PI = Math.PI * 2;
    
    // Detect device performance - with more aggressive optimization
    const detectPerformance = () => {
      // Try to detect device capability
      const isLowEnd = window.navigator.hardwareConcurrency <= 4;
      const isMidRange = window.navigator.hardwareConcurrency > 4 && window.navigator.hardwareConcurrency < 8;
      const isHighEnd = window.navigator.hardwareConcurrency >= 8;
      
      if (isLowEnd) {
        // Low-end device settings - very minimal
        performanceConfig.qualityLevel = 4.0;
        performanceConfig.drawEveryNthFrame = 3;  // Skip more frames
        performanceConfig.maxPoints = 60;
        performanceConfig.maxSymmetry = 6;
        performanceConfig.useBlur = false;
        performanceConfig.enableAdvancedEffects = false;
        performanceConfig.useGradients = false;
        fractalDepth = 1;
      } else if (isMidRange) {
        // Mid-range device settings - balanced
        performanceConfig.qualityLevel = 2.8;
        performanceConfig.drawEveryNthFrame = 2;
        performanceConfig.maxPoints = 90;
        performanceConfig.maxSymmetry = 8;
        performanceConfig.useBlur = false;
        performanceConfig.enableAdvancedEffects = true;
        performanceConfig.useGradients = false;
        fractalDepth = 2;
      } else if (isHighEnd) {
        // High-end device settings - still optimized
        performanceConfig.qualityLevel = 2.2;
        performanceConfig.drawEveryNthFrame = 2;
        performanceConfig.maxPoints = 120; 
        performanceConfig.maxSymmetry = 10;
        performanceConfig.useBlur = false;  // Disable blur even on high-end
        performanceConfig.enableAdvancedEffects = true;
        performanceConfig.useGradients = true;
        fractalDepth = 2;
      }
      
      // Override for mobile devices regardless of CPU cores
      if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        performanceConfig.qualityLevel = 4.0;
        performanceConfig.drawEveryNthFrame = 3;
        performanceConfig.maxPoints = 50;
        performanceConfig.maxSymmetry = 4;
        performanceConfig.useBlur = false;
        performanceConfig.enableAdvancedEffects = false;
        performanceConfig.useGradients = false;
        fractalDepth = 1;
      }
    };
    
    detectPerformance();
    
    // Draw loop with frame skipping
    let frameCounter = 0;
    const draw = () => {
      requestAnimationFrame(draw);
      frameCounter++;
      
      // Skip frames for performance if needed
      if (frameCounter % performanceConfig.drawEveryNthFrame !== 0) return;
      
      frame++;
      
      // Get audio data
      analyser.getByteFrequencyData(dataArray);
      analyser.getByteTimeDomainData(waveformArray);
      
      // Calculate audio metrics more efficiently
      let bassSum = 0, lowMidSum = 0, highMidSum = 0, trebleSum = 0, totalSum = 0;
      
      // Divide frequency spectrum into regions
      const bassRange = Math.min(10, bufferLength);
      const lowMidRange = Math.min(40, bufferLength);
      const highMidRange = Math.min(100, bufferLength);
      const trebleRange = Math.min(200, bufferLength);
      
      // Process each frequency region
      for (let i = 0; i < Math.min(200, bufferLength); i++) {
        const value = dataArray[i];
        totalSum += value;
        
        if (i < bassRange) bassSum += value;
        if (i >= bassRange && i < lowMidRange) lowMidSum += value; 
        if (i >= lowMidRange && i < highMidRange) highMidSum += value;
        if (i >= highMidRange && i < trebleRange) trebleSum += value;
      }
      
      // Calculate energy levels for each frequency band
      const average = totalSum / Math.min(200, bufferLength) / 255;
      const bassLevel = bassSum / bassRange / 255;
      const lowMidLevel = lowMidSum / Math.max(1, (lowMidRange - bassRange)) / 255;
      const highMidLevel = highMidSum / Math.max(1, (highMidRange - lowMidRange)) / 255;
      const trebleLevel = trebleSum / Math.max(1, (trebleRange - highMidRange)) / 255;
      
      // Track energy history for detecting trends
      audioState.energyHistory.shift();
      audioState.energyHistory.push(average);
      
      // Calculate energy trend (rising or falling energy)
      const recentAvg = audioState.energyHistory.slice(-3).reduce((sum, val) => sum + val, 0) / 3;
      const olderAvg = audioState.energyHistory.slice(0, 3).reduce((sum, val) => sum + val, 0) / 3;
      audioState.energyTrend = recentAvg - olderAvg; // Positive = rising energy, negative = falling
      
      // Beat detection based on bass frequency
      audioState.beatDetector.history.shift();
      audioState.beatDetector.history.push(bassLevel);
      
      const beatAvg = audioState.beatDetector.history.reduce((sum, val) => sum + val, 0) / 
                     audioState.beatDetector.history.length;
      
      // Detect beat when bass exceeds average by threshold
      const isBeat = (bassLevel > beatAvg * 1.2) && 
                    (bassLevel > audioState.beatDetector.threshold) && 
                    (frame - audioState.beatDetector.lastBeat > 10);
      
      if (isBeat) {
        audioState.beatDetector.lastBeat = frame;
        audioState.beatDetector.confidence = Math.min(1, audioState.beatDetector.confidence + 0.1);
      } else {
        audioState.beatDetector.confidence = Math.max(0, audioState.beatDetector.confidence - 0.01);
      }
      
      // Update rotation speed based on music dynamics
      let targetRotationSpeed = 0.001 + (lowMidLevel * 0.01) + (bassLevel * 0.005);
      
      // Add occasional direction changes based on treble hits
      if (trebleLevel > 0.8 && Math.random() < 0.1 && frame % 60 === 0) {
        rotationDirection = -rotationDirection;
      }
      
      // Sharp beats temporarily boost rotation
      if (isBeat && bassLevel > 0.8) {
        targetRotationSpeed += 0.01;
      }
      
      // Gradually change rotation speed for smoothness
      rotationSpeed = rotationSpeed * 0.95 + targetRotationSpeed * 0.05;
      rotation += rotationSpeed * rotationDirection;
      
      // Detect significant bass impact
      const bassImpact = bassLevel > audioState.bassImpactThreshold && 
                      (frame - audioState.lastBassImpact > 30);
      
      if (bassImpact) {
        audioState.lastBassImpact = frame;
      }
      
      // Add selective blur for transitions and bass impacts
      if (performanceConfig.useBlur) {
        if (bassImpact) {
          ctx.filter = `blur(${Math.min(3, bassLevel * 3)}px)`;
        } else if (patternTransition < 1) {
          // Add blur during pattern transitions
          ctx.filter = `blur(${(1 - patternTransition) * 2}px)`;
        } else {
          ctx.filter = 'none';
        }
      }
      
      // Clear canvas with fade effect based on intensity
      const fadeOpacity = 0.1 + (1 - average) * 0.05; // Lower opacity (more trails) for higher energy
      ctx.fillStyle = `rgba(0, 0, 0, ${fadeOpacity})`;
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      ctx.filter = 'none';
      
      // Update hue based on audio characteristics
      // Shift hue at different rates depending on which frequencies are dominant
      if (bassLevel > lowMidLevel && bassLevel > highMidLevel) {
        // Bass dominant - slower hue shifts
        hue = (hue + 0.3 + bassLevel * 0.7) % 360;
      } else if (lowMidLevel > highMidLevel) {
        // Mid dominant - medium hue shifts
        hue = (hue + 0.5 + lowMidLevel * 1.0) % 360;
      } else {
        // High frequencies dominant - faster hue shifts
        hue = (hue + 0.7 + trebleLevel * 1.5) % 360;
      }
      
      // Center coordinates
      const centerX = canvas.clientWidth / 2;
      const centerY = canvas.clientHeight / 2;
      
      // Detect musical transitions for pattern changes
      const energyChange = Math.abs(audioState.energyTrend) > 0.07;
      const frequencyShift = Math.abs(bassLevel - trebleLevel) > 0.3 && 
                          Math.abs(bassLevel - audioState.beatDetector.history[0]) > 0.2;
      
      // Pattern transition logic based on musical cues
      patternChangeCounter++;
      const minPatternDuration = 180; // Minimum frames before pattern change
      
      if ((bassImpact || (energyChange && frequencyShift)) && 
          patternChangeCounter > minPatternDuration && 
          patternTransition === 1) { // Only change when previous transition completed
        
        // Create a transition effect
        ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.15)`;
        ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        
        // Select next pattern based on music characteristics
        let availablePatterns = [];
        
        if (performanceConfig.enableAdvancedEffects) {
          // Full pattern selection for capable devices
          availablePatterns = [SPIRAL, FLOWER, STARBURST, NESTED_CIRCLES, FRACTAL_TREE, WAVE_PATTERN, SYMMETRICAL_WEB];
        } else {
          // Limited pattern selection for less capable devices
          availablePatterns = [SPIRAL, FLOWER, STARBURST, NESTED_CIRCLES];
        }
        
        // Choose pattern based on dominant frequency
        if (bassLevel > 0.8 && bassLevel > highMidLevel) {
          // Bass-heavy music - prefer geometric patterns
          availablePatterns = [STARBURST, NESTED_CIRCLES, SYMMETRICAL_WEB];
        } else if (highMidLevel > 0.7 && highMidLevel > bassLevel) {
          // Mid-heavy music - prefer flowing patterns
          availablePatterns = [SPIRAL, WAVE_PATTERN, FLOWER];
        } else if (trebleLevel > 0.7) {
          // Treble-heavy - prefer detailed patterns
          availablePatterns = [FRACTAL_TREE, NESTED_CIRCLES, FLOWER];
        }
        
        // Filter out current pattern to ensure change
        availablePatterns = availablePatterns.filter(p => p !== currentPattern);
        
        // Choose random pattern from filtered list
        targetPattern = availablePatterns[Math.floor(Math.random() * availablePatterns.length)];
        patternTransition = 0; // Start transition
        patternChangeCounter = 0;
      }
      
      // Update pattern transition progress
      if (patternTransition < 1) {
        patternTransition = Math.min(1, patternTransition + 0.025);
        
        // When transition completes, set current pattern
        if (patternTransition === 1) {
          currentPattern = targetPattern;
        }
      }
      
      // Symmetry change logic - tied to music sections
      if ((bassImpact && audioState.beatDetector.confidence > 0.6) || 
          (frame - lastSymmetryChange > 120 && Math.abs(audioState.energyTrend) > 0.15)) {
        
        // Choose symmetry based on music characteristics
        const minSymmetry = 4;
        const maxSymm = performanceConfig.maxSymmetry;
        
        if (bassLevel > 0.7 && bassLevel > highMidLevel) {
          // Bass dominant - lower symmetry (4-8)
          targetSymmetry = minSymmetry + Math.floor(Math.random() * 4) * 2;
        } else if (lowMidLevel > 0.6) {
          // Mid dominant - medium symmetry (6-12)
          targetSymmetry = minSymmetry + 2 + Math.floor(Math.random() * 4) * 2;
        } else {
          // Balanced or high frequencies - higher symmetry (8-16)
          targetSymmetry = minSymmetry + 4 + Math.floor(Math.random() * (maxSymm-8)/2) * 2;
        }
        
        // Ensure symmetry is within bounds
        targetSymmetry = Math.min(maxSymm, Math.max(minSymmetry, targetSymmetry));
        
        // Also change fractal parameters
        fractalDepth = 2 + Math.floor(average * 2);
        fractalScale = 0.5 + average * 0.3;
        targetFractalRotation = Math.random() * TWO_PI;
        
        lastSymmetryChange = frame;
        symmetryTransition = 0;
      }
      
      // Update symmetry transition smoothly
      if (symmetryTransition < 1) {
        symmetryTransition = Math.min(1, symmetryTransition + 0.02);
        
        // Interpolate between current and target symmetry
        symmetry = Math.round(symmetry * (1 - symmetryTransition) + targetSymmetry * symmetryTransition);
      }
      
      // Smoothly update fractal rotation
      fractalRotation = fractalRotation * 0.95 + targetFractalRotation * 0.05;
      
      // Draw background glow proportional to energy
      const glowRadius = 80 + average * 170;
      const glow = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, glowRadius);
      
      // Adjust glow color based on energy distribution
      if (bassLevel > highMidLevel && bassLevel > trebleLevel) {
        // Bass dominant - deep, intense colors
        glow.addColorStop(0, `hsla(${hue}, 100%, 50%, ${bassLevel * 0.3})`);
        glow.addColorStop(0.5, `hsla(${(hue + 30) % 360}, 100%, 40%, ${bassLevel * 0.15})`);
      } else if (highMidLevel > trebleLevel) {
        // Mid dominant - balanced colors
        glow.addColorStop(0, `hsla(${hue}, 100%, 60%, ${highMidLevel * 0.25})`);
        glow.addColorStop(0.5, `hsla(${(hue + 60) % 360}, 100%, 50%, ${highMidLevel * 0.12})`);
      } else {
        // Treble dominant - bright, light colors
        glow.addColorStop(0, `hsla(${hue}, 90%, 70%, ${trebleLevel * 0.2})`);
        glow.addColorStop(0.5, `hsla(${(hue + 90) % 360}, 90%, 60%, ${trebleLevel * 0.1})`);
      }
      
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      
      // Save context for transformations
      ctx.save();
      ctx.translate(centerX, centerY);
      
      // Apply global rotation
      ctx.rotate(rotation);
      
      // Calculate point count based on music energy
      const energyFactor = Math.pow(average, 1.5); // More exponential response to energy
      const baseComplexity = performanceConfig.complexityReduction ? 
        Math.min(bufferLength/3, performanceConfig.maxPoints) : 
        Math.min(bufferLength, performanceConfig.maxPoints);
      
      // Scale complexity with energy
      const complexity = Math.max(50, Math.floor(baseComplexity * energyFactor));
      
      // Draw the current pattern with symmetry
      const actualSymmetry = Math.min(symmetry, performanceConfig.maxSymmetry);
      
      // When transitioning between patterns, crossfade them
      if (patternTransition < 1) {
        // First draw the old pattern with fading opacity
        const oldOpacity = 1 - patternTransition;
        
        for (let i = 0; i < actualSymmetry; i++) {
          ctx.save();
          ctx.rotate((TWO_PI * i) / actualSymmetry);
          
          // Draw fading current pattern
          ctx.globalAlpha = oldOpacity;
          drawPattern(currentPattern, ctx, {
            bassLevel, lowMidLevel, highMidLevel, trebleLevel, 
            average, frame, hue, complexity, 
            dataArray, waveformArray, bufferLength,
            fractalDepth, fractalScale, fractalRotation, 
            actualSymmetry, energyFactor
          });
          
          ctx.restore();
        }
        
        // Then draw the new pattern with increasing opacity
        for (let i = 0; i < actualSymmetry; i++) {
          ctx.save();
          ctx.rotate((TWO_PI * i) / actualSymmetry);
          
          // Draw emerging target pattern
          ctx.globalAlpha = patternTransition;
          drawPattern(targetPattern, ctx, {
            bassLevel, lowMidLevel, highMidLevel, trebleLevel, 
            average, frame, hue, complexity, 
            dataArray, waveformArray, bufferLength,
            fractalDepth, fractalScale, fractalRotation, 
            actualSymmetry, energyFactor
          });
          
          ctx.restore();
        }
        
        ctx.globalAlpha = 1;
      } else {
        // Normal rendering of current pattern
        for (let i = 0; i < actualSymmetry; i++) {
          ctx.save();
          ctx.rotate((TWO_PI * i) / actualSymmetry);
          
          drawPattern(currentPattern, ctx, {
            bassLevel, lowMidLevel, highMidLevel, trebleLevel, 
            average, frame, hue, complexity, 
            dataArray, waveformArray, bufferLength,
            fractalDepth, fractalScale, fractalRotation, 
            actualSymmetry, energyFactor
          });
          
          ctx.restore();
        }
      }
      
      // Draw center mandala
      drawCenterMandala(ctx, {
        bassLevel, lowMidLevel, highMidLevel, trebleLevel,
        average, frame, hue, isBeat
      });
      
      // Restore context
      ctx.restore();
      
      // Simplified bass impact effect - just one ring instead of multiple
      if (bassImpact) {
        const impactStrength = bassLevel - audioState.bassImpactThreshold;
        
        // Single ring for better performance
        ctx.beginPath();
        ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${impactStrength * 0.8})`;
        ctx.lineWidth = 4 * bassLevel;
        ctx.arc(centerX, centerY, 100 + (bassLevel * 150), 0, TWO_PI);
        ctx.stroke();
      }
      
      // Only draw beat pulse on strong beats
      if (isBeat && bassLevel > 0.75 && audioState.beatDetector.confidence > 0.6) {
        ctx.beginPath();
        ctx.strokeStyle = `hsla(${(hue + 180) % 360}, 100%, 70%, ${0.3})`;
        ctx.lineWidth = 2;
        ctx.arc(centerX, centerY, 50 + (average * 80), 0, TWO_PI);
        ctx.stroke();
      }
    };
    
    // Pattern router function
    function drawPattern(patternIndex: number, ctx: CanvasRenderingContext2D, params: any) {
      switch(patternIndex) {
        case SPIRAL:
          drawSpiral(ctx, params);
          break;
        case FLOWER:
          drawFlower(ctx, params);
          break;
        case STARBURST:
          drawStarburst(ctx, params);
          break;
        case NESTED_CIRCLES:
          drawNestedCircles(ctx, params);
          break;
        case FRACTAL_TREE:
          drawFractalTree(ctx, params);
          break;
        case WAVE_PATTERN:
          drawWavePattern(ctx, params);
          break;
        case SYMMETRICAL_WEB:
          drawSymmetricalWeb(ctx, params);
          break;
        default:
          drawFlower(ctx, params);
      }
    }
    
    // Pattern drawing functions - enhanced and tied to music dynamics
    
    // Spiral pattern
    function drawSpiral(ctx: CanvasRenderingContext2D, params: any) {
      const { bassLevel, lowMidLevel, highMidLevel, trebleLevel, 
              hue, frame, dataArray, complexity, energyFactor } = params;
      
      // Make spiral characteristics respond to music
      const maxRadius = 200 + (bassLevel * 120) + (highMidLevel * 100);
      
      // Spiral tightness follows mid-range frequencies
      const spiralTightness = 0.08 + lowMidLevel * 0.25;
      
      // Rotation offset follows high frequencies
      const rotationOffset = frame * 0.01 + (trebleLevel * 0.2);
      
      ctx.beginPath();
      ctx.lineWidth = 1.5 + bassLevel * 3;
      
      // Use larger step size for better performance
      const step = Math.max(4, Math.floor(200 / (complexity * 0.3)));
      
      // Draw spiral with fewer points
      const maxPoints = Math.min(200, complexity * 3);
      
      for (let i = 0; i < maxPoints; i += step) {
        const freqIndex = Math.floor((i / maxPoints) * Math.min(64, dataArray.length));
        const amplitude = dataArray[freqIndex] / 255;
        
        // Angle changes with rotation offset and energy
        const angle = spiralTightness * i + rotationOffset;
        
        // Simpler radius calculation
        const radius = (i / maxPoints) * maxRadius * (1 + amplitude * 0.4);
        
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      // Add just a few dots at strategic points rather than many
      if (trebleLevel > 0.5 && performanceConfig.enableAdvancedEffects) {
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * TWO_PI;
          const radius = maxRadius * (0.3 + (i / 5) * 0.5);
          
          const x = Math.cos(angle + rotationOffset) * radius;
          const y = Math.sin(angle + rotationOffset) * radius;
          
          ctx.beginPath();
          ctx.arc(x, y, 2 + trebleLevel * 4, 0, TWO_PI);
          ctx.fillStyle = `hsla(${(hue + i * 30) % 360}, 100%, 50%, ${0.7})`;
          ctx.fill();
        }
      }
      
      // Gradient color responds to frequency balance
      const colorBalance = bassLevel > highMidLevel ? 
                        bassLevel / (bassLevel + highMidLevel) : 
                        highMidLevel / (bassLevel + highMidLevel);
      
      const gradient = ctx.createLinearGradient(-maxRadius, 0, maxRadius, 0);
      gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, ${0.4 + colorBalance * 0.3})`);
      gradient.addColorStop(0.5, `hsla(${(hue + 120 * colorBalance) % 360}, 100%, 60%, ${0.4 + colorBalance * 0.3})`);
      gradient.addColorStop(1, `hsla(${(hue + 240) % 360}, 100%, 50%, ${0.4 + colorBalance * 0.3})`);
      
      ctx.strokeStyle = gradient;
      ctx.stroke();
    }
    
    // Flower pattern
    function drawFlower(ctx: CanvasRenderingContext2D, params: any) {
      const { bassLevel, lowMidLevel, highMidLevel, trebleLevel, hue, frame } = params;
      
      // Petal count follows mid frequencies
      const petalCount = 5 + Math.floor(lowMidLevel * 12);
      
      // Radius follows bass and treble
      const innerRadius = 40 + (bassLevel * 80);
      const outerRadius = innerRadius + 60 + (highMidLevel * 120) + (trebleLevel * 100);
      
      // Animation speed follows energy level
      const animSpeed = 0.02 + (bassLevel * 0.03) + (highMidLevel * 0.01);
      
      ctx.beginPath();
      
      // Step size varies with treble detail
      const step = Math.max(2, 6 - Math.floor(trebleLevel * 4));
      
      for (let i = 0; i < 360; i += step) {
        const angle = (i * Math.PI) / 180;
        
        // Petal shape affected by frequencies
        const petalEffect = Math.sin(angle * petalCount + frame * animSpeed) * 
                          (20 + (bassLevel * 30) + (lowMidLevel * 25));
        
        // Add secondary ripple from high frequencies
        const trebleRipple = trebleLevel > 0.4 ? 
                          Math.sin(angle * (petalCount * 2) + frame * (animSpeed * 1.5)) * 
                          (trebleLevel * 15) : 0;
        
        const radius = innerRadius + petalEffect + trebleRipple + 
                     (Math.sin(frame * 0.015) * 8 * lowMidLevel);
        
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      // Gradient colors follow frequency balance
      const colorShift = (lowMidLevel + trebleLevel) / 2;
      
      const gradient = ctx.createLinearGradient(-outerRadius, 0, outerRadius, 0);
      gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, ${0.5 + bassLevel * 0.3})`);
      gradient.addColorStop(0.5, `hsla(${(hue + 60 + colorShift * 60) % 360}, 100%, 60%, ${0.5 + lowMidLevel * 0.3})`);
      gradient.addColorStop(1, `hsla(${(hue + 120 + colorShift * 120) % 360}, 100%, 50%, ${0.5 + trebleLevel * 0.3})`);
      
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Inner details that respond to mid frequencies
      if (lowMidLevel > 0.3) {
        ctx.beginPath();
        
        // Detail level follows mid and high frequency content
        const detailStep = Math.max(3, 10 - Math.floor((lowMidLevel + trebleLevel) * 5));
        
        for (let i = 0; i < 360; i += detailStep) {
          const angle = (i * Math.PI) / 180;
          const innerEffect = Math.sin(angle * (petalCount * 2) + frame * (animSpeed * 1.5)) * 
                            (5 + (lowMidLevel * 15) + (trebleLevel * 10));
          
          const radius = innerRadius * (0.4 + lowMidLevel * 0.2) + innerEffect;
          
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        // Inner detail color shifts with high frequencies
        ctx.strokeStyle = `hsla(${(hue + 180 + trebleLevel * 60) % 360}, 100%, 70%, ${0.6 + lowMidLevel * 0.4})`;
        ctx.lineWidth = 1.5 + bassLevel * 2 + (lowMidLevel * 2);
        ctx.stroke();
      }
      
      // Add petal highlights that respond to high frequencies
      if (trebleLevel > 0.4) {
        for (let i = 0; i < petalCount; i++) {
          const petalAngle = (i / petalCount) * TWO_PI;
          
          // Highlight position follows mid energy
          const highlightPos = 0.5 + (lowMidLevel * 0.5);
          const x = Math.cos(petalAngle) * (innerRadius * highlightPos);
          const y = Math.sin(petalAngle) * (innerRadius * highlightPos);
          
          // Highlight size and brightness follow treble
          ctx.beginPath();
          ctx.arc(x, y, 3 + highMidLevel * 6 + (trebleLevel * 6), 0, TWO_PI);
          ctx.fillStyle = `hsla(${(hue + i * 30 + trebleLevel * 90) % 360}, 100%, 80%, ${0.3 + trebleLevel * 0.5})`;
          ctx.fill();
        }
      }
    }
    
    // Starburst pattern
    function drawStarburst(ctx: CanvasRenderingContext2D, params: any) {
      const { bassLevel, lowMidLevel, highMidLevel, trebleLevel, 
              hue, dataArray, complexity, energyFactor } = params;
      
      // Ray count follows overall energy and complexity
      const rayCount = Math.min(40, 15 + Math.floor(complexity / 8) * energyFactor);
      
      // Radius follows bass
      const maxRadius = 220 + (bassLevel * 150) + (lowMidLevel * 80);
      
      // Draw rays with varied opacity
      for (let i = 0; i < rayCount; i++) {
        const angle = (i / rayCount) * TWO_PI;
        const freqIndex = Math.floor((i / rayCount) * Math.min(128, dataArray.length));
        const amplitude = dataArray[freqIndex] / 255;
        
        // Skip very low amplitude rays
        if (amplitude < 0.15) continue; 
        
        // Ray length follows frequency amplitude and bass
        const rayLength = maxRadius * amplitude * (0.8 + bassLevel * 0.4);
        
        // Ray thickness follows bass and amplitude
        const thickness = 1.5 + (bassLevel * 3) + (amplitude * 2) * energyFactor;
        
        const x1 = Math.cos(angle) * 20; // Inner point
        const y1 = Math.sin(angle) * 20;
        const x2 = Math.cos(angle) * rayLength; // Outer point
        const y2 = Math.sin(angle) * rayLength;
        
        // Ray color shifts with frequency
        const rayHue = (hue + i * 3 + (amplitude * 30)) % 360;
        
        // Draw ray with gradient for more depth
        const rayGradient = ctx.createLinearGradient(x1, y1, x2, y2);
        rayGradient.addColorStop(0, `hsla(${rayHue}, 100%, 60%, ${0.4 + amplitude * 0.6})`);
        rayGradient.addColorStop(1, `hsla(${(rayHue + 30) % 360}, 100%, 50%, ${0.2 + amplitude * 0.8})`);
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = thickness;
        ctx.strokeStyle = rayGradient;
        ctx.stroke();
        
        // Draw dot at the end - size follows energy
        const dotSize = thickness * (1.5 + energyFactor);
        ctx.beginPath();
        ctx.arc(x2, y2, dotSize, 0, TWO_PI);
        ctx.fillStyle = `hsla(${rayHue}, 100%, 70%, ${amplitude})`;
        ctx.fill();
        
            // Instead of connecting lines, just add subtle dots at the end of rays
        // for better performance while maintaining visual interest
        if (highMidLevel > 0.6 && trebleLevel > 0.5 && i % 3 === 0) {
          // Draw a smaller secondary dot
          const smallDotSize = thickness * 0.8;
          ctx.beginPath();
          ctx.arc(x2 * 0.85, y2 * 0.85, smallDotSize, 0, TWO_PI);
          ctx.fillStyle = `hsla(${(rayHue + 60) % 360}, 100%, 70%, ${amplitude * 0.7})`;
          ctx.fill();
        }
      }
      
      // Draw center burst effect - size and intensity follow bass
      if (bassLevel > 0.4) {
        ctx.beginPath();
        const burstRadius = 20 + (bassLevel * 60);
        const burstGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, burstRadius);
        
        // Color intensity follows bass vs high balance
        const colorIntensity = bassLevel / (bassLevel + highMidLevel + 0.1);
        
        burstGradient.addColorStop(0, `hsla(${hue}, 100%, 70%, ${bassLevel * 0.8})`);
        burstGradient.addColorStop(0.6, `hsla(${(hue + 60 * colorIntensity) % 360}, 100%, 60%, ${bassLevel * 0.4})`);
        burstGradient.addColorStop(1, `hsla(${(hue + 120 * colorIntensity) % 360}, 100%, 50%, 0)`);
        
        ctx.fillStyle = burstGradient;
        ctx.arc(0, 0, burstRadius, 0, TWO_PI);
        ctx.fill();
      }
    }
    
    // Nested circles pattern
    function drawNestedCircles(ctx: CanvasRenderingContext2D, params: any) {
      const { bassLevel, lowMidLevel, highMidLevel, trebleLevel, 
              hue, frame, dataArray, energyFactor } = params;
      
      // Circle count follows mid and high balance
      const circleCount = 3 + Math.floor((lowMidLevel + highMidLevel) * 5);
      
      for (let i = 0; i < circleCount; i++) {
        // Circle spacing varies with bass
        const circleSpacing = 20 + (bassLevel * 30);
        const radius = 20 + i * circleSpacing;
        
        const freqIndex = Math.floor((i / circleCount) * Math.min(100, dataArray.length));
        const amplitude = dataArray[freqIndex] / 255;
        
        // Distortion frequency follows mid frequencies
        const distortionFreq = 3 + Math.floor(lowMidLevel * 8);
        
        // Distortion amount follows high frequencies and amplitude
        const distortionAmount = 3 + (amplitude * 15) + (trebleLevel * 10);
        
        // Animation speed follows overall energy
        const animSpeed = 0.03 + (energyFactor * 0.03);
        
        // Distort circle based on audio
        ctx.beginPath();
        
        // Detail level follows energy and treble
        const angleStep = Math.max(0.1, 0.2 - (trebleLevel * 0.1) - (energyFactor * 0.05));
        
        for (let angle = 0; angle < TWO_PI; angle += angleStep) {
          const distortion = Math.sin(angle * distortionFreq + frame * animSpeed) * distortionAmount;
          const r = radius + distortion;
          
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          
          if (angle === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.closePath();
        
        // Circle color shifts with frequency
        const circleHue = (hue + i * 30 + (amplitude * 40)) % 360;
        
        // Opacity follows amplitude
        const opacity = 0.2 + (amplitude * 0.8);
        
        ctx.strokeStyle = `hsla(${circleHue}, 100%, 50%, ${opacity})`;
        ctx.lineWidth = 1.5 + (amplitude * 3) * energyFactor;
        ctx.stroke();
        
        // Add cross lines when significant energy detected
        if (i % 2 === 0 && amplitude > 0.5) {
          // Cross count follows high frequencies
          const crossCount = 4 + Math.floor(highMidLevel * 8);
          
          for (let j = 0; j < crossCount; j++) {
            const angle1 = (j / crossCount) * TWO_PI;
            const angle2 = angle1 + Math.PI;
            
            // Point coordinates
            const x1 = Math.cos(angle1) * radius;
            const y1 = Math.sin(angle1) * radius;
            const x2 = Math.cos(angle2) * radius;
            const y2 = Math.sin(angle2) * radius;
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            
            // Cross color follows high frequencies
            ctx.strokeStyle = `hsla(${(circleHue + 180) % 360}, 100%, 70%, ${0.1 + (highMidLevel * 0.3) + (amplitude * 0.2)})`;
            ctx.lineWidth = 1 + (amplitude * 2) * energyFactor;
            ctx.stroke();
          }
        }
      }
    }
    
    // Fractal tree pattern
    function drawFractalTree(ctx: CanvasRenderingContext2D, params: any) {
      const { bassLevel, lowMidLevel, highMidLevel, 
              hue, fractalDepth, fractalScale, fractalRotation } = params;
      
      // Trunk length follows bass
      const length = 70 + (bassLevel * 70) + (lowMidLevel * 30);
      
      // Recursive branch drawing
      function drawBranch(x: number, y: number, length: number, angle: number, depth: number) {
        if (depth === 0) return;
        
        // Branch color shifts with depth
        const branchHue = (hue + depth * 30) % 360;
        
        // Calculate end point
        const endX = x + Math.cos(angle) * length;
        const endY = y + Math.sin(angle) * length;
        
        // Draw branch - thickness follows bass and depth
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = `hsla(${branchHue}, 100%, ${40 + depth * 10}%, ${0.4 + depth * 0.15})`;
        ctx.lineWidth = (1 + depth * 1.5) * (0.7 + bassLevel * 0.6);
        ctx.stroke();
        
        // Draw leaf/flower at the end of final branches - responds to high frequencies
        if (depth === 1) {
          const leafSize = 2 + (highMidLevel * 6) + (depth * 2);
          ctx.beginPath();
          ctx.arc(endX, endY, leafSize, 0, TWO_PI);
          ctx.fillStyle = `hsla(${(branchHue + 120) % 360}, 100%, 70%, ${0.6 + highMidLevel * 0.4})`;
          ctx.fill();
        }
        
        // Calculate new angles and lengths for branches
        const newLength = length * fractalScale;
        
        // Branch angle varies with mid frequencies
        const branchAngle = Math.PI / 4 + (lowMidLevel * Math.PI / 8);
        
        // Draw right branch
        drawBranch(endX, endY, newLength, angle + branchAngle, depth - 1);
        
        // Draw left branch
        drawBranch(endX, endY, newLength, angle - branchAngle, depth - 1);
        
        // Add middle branch when energy is high
        if (depth > 1 && (bassLevel > 0.6 || lowMidLevel > 0.7)) {
          drawBranch(endX, endY, newLength * 0.8, angle, depth - 1);
        }
      }
      
      // Start recursive drawing from the bottom
      drawBranch(0, 0, length, -Math.PI / 2 + fractalRotation, fractalDepth);
    }
    
    // Wave pattern
    function drawWavePattern(ctx: CanvasRenderingContext2D, params: any) {
      const { bassLevel, lowMidLevel, highMidLevel, trebleLevel, 
              hue, frame, waveformArray } = params;
      
      // Radius follows overall energy
      const maxRadius = 180 + (bassLevel * 120) + (lowMidLevel * 80);
      
      // Draw wave rings - count follows mid frequencies
      const ringCount = 3 + Math.floor(lowMidLevel * 3);
      
      for (let ring = 0; ring < ringCount; ring++) {
        // Ring spacing follows bass
        const ringSpacing = 30 + (bassLevel * 40);
        const ringRadius = 30 + ring * ringSpacing;
        
        // Ring color shifts with frequency and ring index
        const ringHue = (hue + ring * 40 + (highMidLevel * 60)) % 360;
        
        // Wave height follows bass and treble
        const waveHeight = 8 + (bassLevel * 20) + (trebleLevel * 15) + (ring * 4);
        
        // Wave frequency follows high frequencies
        const waveFrequency = 5 + Math.floor(highMidLevel * 6) + Math.floor(trebleLevel * 6) + ring;
        
        // Animation speed follows overall energy
        const animSpeed = 0.04 + ((bassLevel + trebleLevel) * 0.03);
        
        ctx.beginPath();
        
        // Detail level follows high frequencies
        const angleStep = Math.max(2, 5 - Math.floor(trebleLevel * 3));
        
        for (let i = 0; i < 360; i += angleStep) {
          const angle = (i * Math.PI) / 180;
          const waveIndex = Math.floor((i / 360) * waveformArray.length);
          
          // Use waveform data for dynamic effect
          const waveValue = waveformArray[waveIndex] / 128 - 1; // -1 to 1
          
          // Create wave effect with multiple frequencies
          const waveEffect = Math.sin(angle * waveFrequency + frame * animSpeed) * waveHeight;
          
          // Add secondary ripple from bass
          const bassRipple = bassLevel > 0.6 ? 
                          Math.sin(angle * (waveFrequency * 0.5) + frame * animSpeed * 0.7) * 
                          (bassLevel * 15) : 0;
          
          const radiusOffset = waveValue * waveHeight + waveEffect + bassRipple;
          const radius = ringRadius + radiusOffset;
          
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.closePath();
        
        // Ring opacity follows its own amplitude
        const ringOpacity = 0.2 + ((ringCount - ring) * 0.1) + (bassLevel * 0.2);
        
        ctx.strokeStyle = `hsla(${ringHue}, 100%, 50%, ${ringOpacity})`;
        ctx.lineWidth = 1.5 + ((ringCount - ring) * 0.5) + (bassLevel * 2);
        ctx.stroke();
      }
      
      // Replace radial lines with particle effects for better performance
      if ((bassLevel > 0.5 || highMidLevel > 0.7) && performanceConfig.enableAdvancedEffects) {
        // Use fewer particles for better performance
        const particleCount = Math.min(8, 4 + Math.floor(highMidLevel * 6));
        
        for (let i = 0; i < particleCount; i++) {
          const angle = (i / particleCount) * TWO_PI;
          
          // Particle positioned at mid radius
          const radius = maxRadius * (0.3 + Math.random() * 0.4);
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          // Particle size follows energy level but is capped
          const particleSize = Math.min(8, 3 + (bassLevel * 4) + (highMidLevel * 3));
          
          // Color shifts with angle
          const particleHue = (hue + i * 20 + (trebleLevel * 90)) % 360;
          
          ctx.beginPath();
          ctx.arc(x, y, particleSize, 0, TWO_PI);
          ctx.fillStyle = `hsla(${particleHue}, 100%, 70%, ${0.3 + highMidLevel * 0.4})`;
          ctx.fill();
        }
      }
    }
    
    // Symmetrical Web pattern
    function drawSymmetricalWeb(ctx: CanvasRenderingContext2D, params: any) {
      const { bassLevel, lowMidLevel, highMidLevel, trebleLevel, 
              hue, frame, dataArray, bufferLength, actualSymmetry, energyFactor } = params;
      
      // Web size follows overall energy
      const maxRadius = 200 + (bassLevel * 100) + (lowMidLevel * 80);
      
      // Web ring count follows mid frequencies
      const webRings = 3 + Math.floor((lowMidLevel + highMidLevel) * 6);
      
      // Draw web rings
      for (let ring = 0; ring < webRings; ring++) {
        const ringRadius = (ring + 1) * (maxRadius / webRings);
        
        // Ring color shifts with frequency
        const ringHue = (hue + ring * 30 + (trebleLevel * 60)) % 360;
        
        ctx.beginPath();
        
        // Detail level follows high frequencies
        const angleStep = Math.max(2, 5 - Math.floor(trebleLevel * 4));
        
        for (let i = 0; i < 360; i += angleStep) {
          const angle = (i * Math.PI) / 180;
          const freqIndex = Math.floor((i / 360) * bufferLength);
          const amplitude = dataArray[freqIndex] / 255;
          
          // Distortion factors follow frequencies
          const distortionFreq = actualSymmetry * (0.8 + highMidLevel * 0.4);
          const distortionAmount = (3 + amplitude * 12 + (trebleLevel * 10)) * energyFactor;
          
          // Animation speed follows energy
          const animSpeed = 0.02 + (energyFactor * 0.02);
          
          // Add distortion based on audio
          const distortion = Math.sin(angle * distortionFreq + frame * animSpeed) * distortionAmount;
          const radius = ringRadius + distortion;
          
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.closePath();
        
        // Ring opacity follows position and bass
        const ringOpacity = 0.15 + ((webRings - ring) * 0.05) + (bassLevel * 0.15);
        
        ctx.strokeStyle = `hsla(${ringHue}, 100%, 50%, ${ringOpacity})`;
        ctx.lineWidth = 1 + (bassLevel * 1.5) * energyFactor;
        ctx.stroke();
      }
      
      // Draw only intersection dots at web points without connecting lines from center
      if (energyFactor > 0.5 && (highMidLevel > 0.5 || trebleLevel > 0.6)) {
        // Only draw a limited number of dots for performance
        const dotCount = Math.min(actualSymmetry * 2, 16);
        
        for (let i = 0; i < dotCount; i++) {
          const angle = (i / dotCount) * TWO_PI;
          const freqIndex = Math.floor((i / dotCount) * bufferLength);
          const amplitude = dataArray[freqIndex] / 255;
          
          // Skip low amplitude points
          if (amplitude < 0.4) continue;
          
          // Color shifts with angle and high frequencies
          const dotHue = (hue + i * 10 + (trebleLevel * 90)) % 360;
          
          // Draw dots at ring intersections
          const ringStep = Math.max(1, Math.floor(webRings / 3));
          const maxRings = Math.min(webRings, 5); // Limit max rings for performance
          
          for (let ring = ringStep; ring < maxRings; ring += ringStep) {
            const ringRadius = ring * (maxRadius / webRings);
            const dotX = Math.cos(angle) * ringRadius;
            const dotY = Math.sin(angle) * ringRadius;
            
            // Dot size follows high frequencies but is capped for performance
            const dotSize = Math.min(6, (1.5 + amplitude * 2.5 + (trebleLevel * 1.5)) * energyFactor);
            
            ctx.beginPath();
            ctx.arc(dotX, dotY, dotSize, 0, TWO_PI);
            ctx.fillStyle = `hsla(${(dotHue + ring * 20) % 360}, 100%, 70%, ${0.4 + amplitude * 0.3})`;
            ctx.fill();
          }
        }
      }
    }
    
    // Center mandala
    function drawCenterMandala(ctx: CanvasRenderingContext2D, params: any) {
      const { bassLevel, lowMidLevel, highMidLevel, trebleLevel, 
              average, frame, hue, isBeat } = params;
      
      // Center size follows overall energy with pulse on beats
      const beatPulse = isBeat ? (bassLevel * 6) : 0;
      const pulseSize = Math.sin(frame * 0.04) * 3;
      const centerSize = 15 + (average * 20) + pulseSize + beatPulse;
      
      ctx.beginPath();
      ctx.arc(0, 0, centerSize, 0, TWO_PI);
      
      // Use simpler coloring technique for better performance
      if (performanceConfig.useGradients) {
        // Create gradient for center
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, centerSize);
        
        // Simplified gradient with fewer color stops
        if (bassLevel > highMidLevel) {
          // Bass dominant
          gradient.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.9)`);
          gradient.addColorStop(1, `hsla(${(hue + 60) % 360}, 100%, 50%, 0.5)`);
        } else {
          // Mid/Treble dominant
          gradient.addColorStop(0, `hsla(${hue}, 100%, 75%, 0.9)`);
          gradient.addColorStop(1, `hsla(${(hue + 120) % 360}, 100%, 55%, 0.5)`);
        }
        
        ctx.fillStyle = gradient;
      } else {
        // Use solid color for better performance
        ctx.fillStyle = `hsla(${hue}, 100%, 65%, 0.9)`;
      }
      
      ctx.fill();
      
      // Add glow effect that intensifies with bass
      const glowIntensity = 8 + (bassLevel * 10);
      ctx.shadowBlur = glowIntensity;
      ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Draw inner details
      const petalCount = 6 + Math.floor((lowMidLevel + highMidLevel) * 10);
      
      ctx.beginPath();
      
      // Detail level follows high frequencies
      const angleStep = Math.max(3, 6 - Math.floor(trebleLevel * 4));
      
      for (let i = 0; i < 360; i += angleStep) {
        const angle = (i * Math.PI) / 180;
        
        // Petal effect follows frequencies and animation speed
        const animSpeed = 0.06 + ((bassLevel + highMidLevel) * 0.04);
        const petalEffect = Math.sin(angle * petalCount + frame * animSpeed) * 
                          (3 + (bassLevel * 6) + (lowMidLevel * 4));
        
        // Ripple effect from high frequencies
        const trebleRipple = trebleLevel > 0.5 ? 
                          Math.sin(angle * (petalCount * 2) + frame * (animSpeed * 1.5)) * 
                          (trebleLevel * 4) : 0;
        
        const radius = centerSize * 0.65 + petalEffect + trebleRipple;
        
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      // Inner color shifts with frequency balance
      const innerHue = (hue + 180 + (trebleLevel * 60)) % 360;
      ctx.fillStyle = `hsla(${innerHue}, 100%, 70%, ${0.6 + lowMidLevel * 0.4})`;
      ctx.fill();
      
      // Add center detail points on high energy
      if (trebleLevel > 0.4 || highMidLevel > 0.6) {
        // Point count follows high frequencies
        const dotCount = 5 + Math.floor(trebleLevel * 8);
        
        for (let i = 0; i < dotCount; i++) {
          const dotAngle = (i / dotCount) * TWO_PI;
          
          // Position follows mid frequencies
          const dotRadius = centerSize * (0.3 + lowMidLevel * 0.3);
          const dotX = Math.cos(dotAngle) * dotRadius;
          const dotY = Math.sin(dotAngle) * dotRadius;
          
          // Size follows high frequencies
          const dotSize = 1 + (highMidLevel * 2) + (trebleLevel * 3);
          
          ctx.beginPath();
          ctx.arc(dotX, dotY, dotSize, 0, TWO_PI);
          ctx.fillStyle = `hsla(${(innerHue + i * 45) % 360}, 100%, 80%, ${0.6 + trebleLevel * 0.4})`;
          ctx.fill();
        }
      }
      
      // Add pulsing ring on beat
      if (isBeat && bassLevel > 0.6) {
        ctx.beginPath();
        ctx.arc(0, 0, centerSize * 1.2, 0, TWO_PI);
        ctx.strokeStyle = `hsla(${hue}, 100%, 60%, ${0.3 + bassLevel * 0.4})`;
        ctx.lineWidth = 2 + bassLevel * 3;
        ctx.stroke();
      }
    }
    
    draw();
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [analyser]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="visualizer-canvas w-full h-full rounded-lg"
    />
  );
};

export default MandalaVisualizer;
