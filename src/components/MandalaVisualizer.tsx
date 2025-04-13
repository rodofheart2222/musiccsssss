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
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const waveformArray = new Uint8Array(analyser.fftSize);
    
    // Mandala configuration
    let hue = 0;
    let rotation = 0;
    let frame = 0;
    let symmetry = 8; // Number of symmetry lines
    let lastSymmetryChange = 0;
    
    // Fractal parameters
    let fractalDepth = 3;
    let fractalScale = 0.7;
    let fractalRotation = 0;
    
    // Pattern generators
    const patterns = [
      drawSpiral,
      drawFlower,
      drawStarburst,
      drawNestedCircles,
      drawFractalTree,
      drawWavePattern,
      drawSymmetricalWeb
    ];
    
    let currentPattern = 0;
    let patternChangeCounter = 0;
    
    // Add a performance config object
    const performanceConfig = {
      qualityLevel: 1.5,          // Higher = more detail, lower = better performance
      drawEveryNthFrame: 1,       // For high refresh rates
      complexityReduction: false,
      useBlur: true               // Enable for more dramatic visuals
    };
    
    // Modify your draw loop
    let frameCounter = 0;
    const draw = () => {
      requestAnimationFrame(draw);
      frameCounter++;
      
      // Skip frames for performance if needed
      if (frameCounter % performanceConfig.drawEveryNthFrame !== 0) return;
      
      analyser.getByteFrequencyData(dataArray);
      analyser.getByteTimeDomainData(waveformArray);
      
      // Calculate audio metrics
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      const bassLevel = dataArray.slice(0, 10).reduce((sum, value) => sum + value, 0) / 10 / 255;
      const midLevel = dataArray.slice(10, 100).reduce((sum, value) => sum + value, 0) / 90 / 255;
      const highLevel = dataArray.slice(100, 200).reduce((sum, value) => sum + value, 0) / 100 / 255;
      
      // Enhanced background effect
      if (performanceConfig.useBlur) {
        ctx.filter = `blur(2px)`;  // Add subtle blur for smoother transitions
      }
      
      // Update canvas clearing for better trails
      ctx.fillStyle = `rgba(0, 0, 0, ${0.1 + (1 - bassLevel) * 0.1})`;
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      ctx.filter = 'none';
      
      // Update hue and rotation based on audio
      hue = (hue + 0.5 + bassLevel * 2) % 360;
      rotation += 0.005 + bassLevel * 0.02;
      
      // Center coordinates
      const centerX = canvas.clientWidth / 2;
      const centerY = canvas.clientHeight / 2;
      
      // Dynamically change symmetry based on beats
      if (frame - lastSymmetryChange > 60 && bassLevel > 0.7) {
        symmetry = 4 + Math.floor(Math.random() * 12) * 2; // Even numbers between 4 and 28
        lastSymmetryChange = frame;
        
        // Also change fractal parameters
        fractalDepth = 2 + Math.floor(Math.random() * 3);
        fractalScale = 0.5 + Math.random() * 0.4;
        fractalRotation = Math.random() * Math.PI * 2;
      }
      
      // Dynamic pattern switching for more mind-blowing transitions
      // Make transitions smoother and more dramatic when bass hits
      patternChangeCounter++;
      if (bassLevel > 0.85 && Math.random() < 0.15 && patternChangeCounter > 60) {
        // Create a more dramatic transition effect
        ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.3)`;
        ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        
        // Choose new pattern with preference for the mind-blowing ones
        const mindBlowingPatterns = [6, 7, 8, 9];  // Indices of the most impressive patterns
        if (Math.random() < 0.7) {
          currentPattern = mindBlowingPatterns[Math.floor(Math.random() * mindBlowingPatterns.length)];
        } else {
          currentPattern = Math.floor(Math.random() * patterns.length);
        }
        patternChangeCounter = 0;
      }
      
      // Save context for transformations
      ctx.save();
      ctx.translate(centerX, centerY);
      
      // Draw background glow
      const glowRadius = 100 + average * 2;
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, glowRadius);
      glow.addColorStop(0, `hsla(${hue}, 100%, 50%, ${bassLevel * 0.3})`);
      glow.addColorStop(0.5, `hsla(${(hue + 60) % 360}, 100%, 50%, ${bassLevel * 0.1})`);
      glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = glow;
      ctx.fillRect(-centerX, -centerY, canvas.clientWidth, canvas.clientHeight);
      
      // Apply global rotation
      ctx.rotate(rotation);
      
      // Adjust complexity based on performance
      const complexity = performanceConfig.complexityReduction ? 
        Math.min(bufferLength/2, 100) : bufferLength;
      
      // Reduce points in paths based on quality setting
      const pathDetail = Math.max(1, Math.floor(1 / performanceConfig.qualityLevel));
      
      // Draw the current pattern with symmetry
      for (let i = 0; i < symmetry; i++) {
        ctx.save();
        ctx.rotate((Math.PI * 2 * i) / symmetry);
        
        // Call the current pattern drawing function
        patterns[currentPattern](ctx, {
          bassLevel,
          midLevel,
          highLevel,
          average,
          frame,
          hue,
          dataArray,
          waveformArray,
          bufferLength,
          fractalDepth,
          fractalScale,
          fractalRotation,
          symmetry
        });
        
        ctx.restore();
      }
      
      // Draw center mandala
      drawCenterMandala(ctx, {
        bassLevel,
        midLevel,
        highLevel,
        average,
        frame,
        hue
      });
      
      // Restore context
      ctx.restore();
      
      // Draw bass impact effect
      if (bassLevel > 0.75) {
        ctx.beginPath();
        ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${bassLevel - 0.75})`;
        ctx.lineWidth = 10 * bassLevel;
        ctx.arc(centerX, centerY, 200 + bassLevel * 200, 0, Math.PI * 2);
        ctx.stroke();
      }
    };
    
    // Pattern drawing functions
    function drawSpiral(ctx: CanvasRenderingContext2D, params: any) {
      const { bassLevel, midLevel, hue, frame, dataArray, bufferLength } = params;
      const maxRadius = 300 + bassLevel * 200;
      const spiralTightness = 0.1 + midLevel * 0.2;
      
      ctx.beginPath();
      ctx.lineWidth = 2 + bassLevel * 5;
      
      for (let i = 0; i < 200; i++) {
        const freqIndex = Math.floor((i / 200) * bufferLength);
        const amplitude = dataArray[freqIndex] / 255;
        
        const angle = spiralTightness * i + frame * 0.01;
        const radius = (i / 200) * maxRadius * (1 + amplitude * 0.5);
        
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        // Add dots at intervals
        if (i % 10 === 0) {
          ctx.save();
          ctx.translate(x, y);
          ctx.fillStyle = `hsla(${(hue + i) % 360}, 100%, 50%, ${amplitude})`;
          ctx.beginPath();
          ctx.arc(0, 0, 2 + amplitude * 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      
      ctx.strokeStyle = `hsla(${hue}, 100%, 50%, 0.5)`;
      ctx.stroke();
    }
    
    function drawFlower(ctx: CanvasRenderingContext2D, params: any) {
      const { bassLevel, midLevel, highLevel, hue, frame } = params;
      const petalCount = 5 + Math.floor(midLevel * 10);
      const innerRadius = 50 + bassLevel * 100;
      const outerRadius = innerRadius + 100 + highLevel * 200;
      
      ctx.beginPath();
      
      for (let i = 0; i < 360; i += 1) {
        const angle = (i * Math.PI) / 180;
        const petalEffect = Math.sin(angle * petalCount + frame * 0.05) * (30 + bassLevel * 50);
        const radius = innerRadius + petalEffect + Math.sin(frame * 0.02) * 10;
        
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      const gradient = ctx.createLinearGradient(-outerRadius, 0, outerRadius, 0);
      gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.7)`);
      gradient.addColorStop(0.5, `hsla(${(hue + 60) % 360}, 100%, 60%, 0.7)`);
      gradient.addColorStop(1, `hsla(${(hue + 120) % 360}, 100%, 50%, 0.7)`);
      
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Add inner details
      ctx.beginPath();
      for (let i = 0; i < 360; i += 2) {
        const angle = (i * Math.PI) / 180;
        const innerEffect = Math.sin(angle * (petalCount * 2) + frame * 0.08) * (10 + midLevel * 30);
        const radius = innerRadius * 0.5 + innerEffect;
        
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.strokeStyle = `hsla(${(hue + 180) % 360}, 100%, 70%, 0.8)`;
      ctx.lineWidth = 2 + bassLevel * 3;
      ctx.stroke();
    }
    
    function drawStarburst(ctx: CanvasRenderingContext2D, params: any) {
      const { bassLevel, midLevel, highLevel, hue, frame, dataArray, bufferLength } = params;
      const rayCount = 20 + Math.floor(midLevel * 30);
      const maxRadius = 250 + bassLevel * 200;
      
      for (let i = 0; i < rayCount; i++) {
        const angle = (i / rayCount) * Math.PI * 2;
        const freqIndex = Math.floor((i / rayCount) * bufferLength);
        const amplitude = dataArray[freqIndex] / 255;
        
        const rayLength = maxRadius * amplitude;
        const thickness = 1 + bassLevel * 5;
        
        const x1 = Math.cos(angle) * 20; // Inner point
        const y1 = Math.sin(angle) * 20;
        const x2 = Math.cos(angle) * rayLength; // Outer point
        const y2 = Math.sin(angle) * rayLength;
        
        // Draw ray
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineWidth = thickness;
        ctx.strokeStyle = `hsla(${(hue + i * 3) % 360}, 100%, 50%, ${0.3 + amplitude * 0.7})`;
        ctx.stroke();
        
        // Draw dot at the end
        ctx.beginPath();
        ctx.arc(x2, y2, thickness * 2, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${(hue + i * 3) % 360}, 100%, 70%, ${amplitude})`;
        ctx.fill();
        
        // Add some connecting lines between rays for web effect
        if (i > 0 && i % 3 === 0) {
          const prevAngle = ((i - 3) / rayCount) * Math.PI * 2;
          const prevFreqIndex = Math.floor(((i - 3) / rayCount) * bufferLength);
          const prevAmplitude = dataArray[prevFreqIndex] / 255;
          const prevRayLength = maxRadius * prevAmplitude;
          
          const px2 = Math.cos(prevAngle) * prevRayLength;
          const py2 = Math.sin(prevAngle) * prevRayLength;
          
          ctx.beginPath();
          ctx.moveTo(x2, y2);
          ctx.lineTo(px2, py2);
          ctx.lineWidth = thickness * 0.5;
          ctx.strokeStyle = `hsla(${(hue + i * 5) % 360}, 100%, 50%, ${0.1 + highLevel * 0.3})`;
          ctx.stroke();
        }
      }
    }
    
    function drawNestedCircles(ctx: CanvasRenderingContext2D, params: any) {
      const { bassLevel, midLevel, highLevel, hue, frame, dataArray } = params;
      const circleCount = 5 + Math.floor(midLevel * 10);
      
      for (let i = 0; i < circleCount; i++) {
        const radius = 20 + i * (20 + bassLevel * 30);
        const freqIndex = Math.floor((i / circleCount) * 100);
        const amplitude = dataArray[freqIndex] / 255;
        
        // Distort circle based on audio
        ctx.beginPath();
        for (let angle = 0; angle < Math.PI * 2; angle += 0.1) {
          const distortionFreq = 3 + Math.floor(midLevel * 10);
          const distortion = Math.sin(angle * distortionFreq + frame * 0.05) * (5 + amplitude * 20);
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
        
        // Create gradient fill
        const circleHue = (hue + i * 30) % 360;
        ctx.strokeStyle = `hsla(${circleHue}, 100%, 50%, ${0.3 + amplitude * 0.7})`;
        ctx.lineWidth = 2 + amplitude * 3;
        ctx.stroke();
        
        // Add some cross lines for complexity
        if (i % 2 === 0) {
          const crossCount = 4 + Math.floor(highLevel * 8);
          for (let j = 0; j < crossCount; j++) {
            const angle1 = (j / crossCount) * Math.PI * 2;
            const angle2 = angle1 + Math.PI;
            
            const x1 = Math.cos(angle1) * radius;
            const y1 = Math.sin(angle1) * radius;
            const x2 = Math.cos(angle2) * radius;
            const y2 = Math.sin(angle2) * radius;
            
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = `hsla(${(circleHue + 180) % 360}, 100%, 70%, ${0.1 + amplitude * 0.3})`;
            ctx.lineWidth = 1 + amplitude * 2;
            ctx.stroke();
          }
        }
      }
    }
    
    function drawFractalTree(ctx: CanvasRenderingContext2D, params: any) {
      const { bassLevel, midLevel, hue, fractalDepth, fractalScale, fractalRotation } = params;
      const length = 100 + bassLevel * 100;
      
      // Draw recursive branches
      function drawBranch(x: number, y: number, length: number, angle: number, depth: number) {
        if (depth === 0) return;
        
        const branchHue = (hue + depth * 30) % 360;
        
        // Calculate end point
        const endX = x + Math.cos(angle) * length;
        const endY = y + Math.sin(angle) * length;
        
        // Draw branch
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = `hsla(${branchHue}, 100%, ${40 + depth * 10}%, ${0.5 + depth * 0.1})`;
        ctx.lineWidth = 1 + depth * 2;
        ctx.stroke();
        
        // Draw leaf/flower at the end of final branches
        if (depth === 1) {
          ctx.beginPath();
          ctx.arc(endX, endY, 3 + midLevel * 10, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${(branchHue + 120) % 360}, 100%, 70%, 0.7)`;
          ctx.fill();
        }
        
        // Calculate new angles and lengths for branches
        const newLength = length * fractalScale;
        const branchAngle = Math.PI / 4 + midLevel * Math.PI / 8; // 45-67.5 degrees
        
        // Draw right branch
        drawBranch(endX, endY, newLength, angle + branchAngle, depth - 1);
        
        // Draw left branch
        drawBranch(endX, endY, newLength, angle - branchAngle, depth - 1);
        
        // Sometimes add a middle branch for more complexity
        if (depth > 1 && Math.random() < 0.5) {
          drawBranch(endX, endY, newLength * 0.8, angle, depth - 1);
        }
      }
      
      // Start the recursive drawing from the bottom
      drawBranch(0, 0, length, -Math.PI / 2 + fractalRotation, fractalDepth);
    }
    
    function drawWavePattern(ctx: CanvasRenderingContext2D, params: any) {
      const { bassLevel, midLevel, highLevel, hue, frame, waveformArray } = params;
      const maxRadius = 200 + bassLevel * 150;
      
      // Draw multiple wave rings
      for (let ring = 0; ring < 5; ring++) {
        const ringRadius = 30 + ring * 40 + midLevel * 50;
        const ringHue = (hue + ring * 40) % 360;
        const waveHeight = 10 + bassLevel * 30 + ring * 5;
        const waveFrequency = 6 + Math.floor(highLevel * 10) + ring;
        
        ctx.beginPath();
        
        for (let i = 0; i < 360; i += 2) {
          const angle = (i * Math.PI) / 180;
          const waveIndex = Math.floor((i / 360) * waveformArray.length);
          const waveValue = waveformArray[waveIndex] / 128 - 1; // -1 to 1
          
          // Create wave effect
          const waveEffect = Math.sin(angle * waveFrequency + frame * 0.05) * waveHeight;
          const radiusOffset = waveValue * waveHeight + waveEffect;
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
        ctx.strokeStyle = `hsla(${ringHue}, 100%, 50%, ${0.3 + (5 - ring) * 0.1})`;
        ctx.lineWidth = 2 + (5 - ring) * 0.5;
        ctx.stroke();
      }
      
      // Add some radial lines for texture
      const lineCount = 12 + Math.floor(midLevel * 24);
      for (let i = 0; i < lineCount; i++) {
        const angle = (i / lineCount) * Math.PI * 2;
        const x1 = Math.cos(angle) * 30;
        const y1 = Math.sin(angle) * 30;
        const x2 = Math.cos(angle) * maxRadius;
        const y2 = Math.sin(angle) * maxRadius;
        
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.strokeStyle = `hsla(${(hue + i * 10) % 360}, 100%, 70%, ${0.1 + highLevel * 0.2})`;
        ctx.lineWidth = 1 + bassLevel * 2;
        ctx.stroke();
      }
    }
    
    function drawSymmetricalWeb(ctx: CanvasRenderingContext2D, params: any) {
      const { bassLevel, midLevel, highLevel, hue, frame, dataArray, bufferLength, symmetry } = params;
      const maxRadius = 250 + bassLevel * 150;
      const webRings = 5 + Math.floor(midLevel * 10);
      
      // Draw web rings
      for (let ring = 0; ring < webRings; ring++) {
        const ringRadius = (ring + 1) * (maxRadius / webRings);
        const ringHue = (hue + ring * 30) % 360;
        
        ctx.beginPath();
        for (let i = 0; i < 360; i += 1) {
          const angle = (i * Math.PI) / 180;
          const freqIndex = Math.floor((i / 360) * bufferLength);
          const amplitude = dataArray[freqIndex] / 255;
          
          // Add some distortion based on audio
          const distortion = Math.sin(angle * symmetry + frame * 0.03) * (5 + amplitude * 20);
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
        ctx.strokeStyle = `hsla(${ringHue}, 100%, 50%, ${0.2 + (webRings - ring) * 0.05})`;
        ctx.lineWidth = 1 + bassLevel * 2;
        ctx.stroke();
      }
      
      // Draw connecting lines between rings
      const lineCount = symmetry * 2;
      for (let i = 0; i < lineCount; i++) {
        const angle = (i / lineCount) * Math.PI * 2;
        const freqIndex = Math.floor((i / lineCount) * bufferLength);
        const amplitude = dataArray[freqIndex] / 255;
        
        // Draw line from center to edge with some curve
        ctx.beginPath();
        ctx.moveTo(0, 0);
        
        // Add control points for curve
        const cp1x = Math.cos(angle + 0.1) * maxRadius * 0.3;
        const cp1y = Math.sin(angle + 0.1) * maxRadius * 0.3;
        const cp2x = Math.cos(angle - 0.1) * maxRadius * 0.6;
        const cp2y = Math.sin(angle - 0.1) * maxRadius * 0.6;
        const endX = Math.cos(angle) * maxRadius;
        const endY = Math.sin(angle) * maxRadius;
        
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, endX, endY);
        
        ctx.strokeStyle = `hsla(${(hue + i * 10) % 360}, 100%, 70%, ${0.2 + amplitude * 0.5})`;
        ctx.lineWidth = 1 + amplitude * 3;
        ctx.stroke();
        
        // Add dots at intersections
        for (let ring = 1; ring < webRings; ring++) {
          const ringRadius = ring * (maxRadius / webRings);
          const dotX = Math.cos(angle) * ringRadius;
          const dotY = Math.sin(angle) * ringRadius;
          
          ctx.beginPath();
          ctx.arc(dotX, dotY, 2 + amplitude * 5, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${(hue + i * 10 + ring * 20) % 360}, 100%, 70%, ${0.5 + amplitude * 0.5})`;
          ctx.fill();
        }
      }
    }
    
    function drawCenterMandala(ctx: CanvasRenderingContext2D, params: any) {
      const { bassLevel, midLevel, highLevel, average, frame, hue } = params;
      
      // Draw center circle with pulsing effect
      const pulseSize = Math.sin(frame * 0.05) * 5;
      const centerSize = 20 + average * 0.3 + pulseSize;
      
      // Create gradient for center
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, centerSize);
      gradient.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.9)`);
      gradient.addColorStop(0.5, `hsla(${(hue + 60) % 360}, 100%, 60%, 0.7)`);
      gradient.addColorStop(1, `hsla(${(hue + 120) % 360}, 100%, 50%, 0.5)`);
      
      ctx.beginPath();
      ctx.arc(0, 0, centerSize, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Add glow effect
      ctx.shadowBlur = 15;
      ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Draw inner details
      const petalCount = 8 + Math.floor(midLevel * 8);
      
      ctx.beginPath();
      for (let i = 0; i < 360; i += 1) {
        const angle = (i * Math.PI) / 180;
        const petalEffect = Math.sin(angle * petalCount + frame * 0.1) * (5 + bassLevel * 10);
        const radius = centerSize * 0.7 + petalEffect;
        
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.fillStyle = `hsla(${(hue + 180) % 360}, 100%, 70%, 0.7)`;
      ctx.fill();
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