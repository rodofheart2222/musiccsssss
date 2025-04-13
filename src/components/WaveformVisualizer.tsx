import React, { useRef, useEffect } from 'react';

interface WaveformVisualizerProps {
  analyser: AnalyserNode | null;
}

const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({ analyser }) => {
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
    
    const bufferLength = analyser.fftSize;
    const dataArray = new Uint8Array(bufferLength);
    const frequencyData = new Uint8Array(analyser.frequencyBinCount);
    
    // Store previous waveform data for smooth transitions
    const prevWaveform = new Uint8Array(bufferLength).fill(128);
    
    let hue = 0;
    let phase = 0;
    
    const draw = () => {
      requestAnimationFrame(draw);
      
      analyser.getByteTimeDomainData(dataArray);
      analyser.getByteFrequencyData(frequencyData);
      
      // Calculate bass level for effects
      const bassLevel = frequencyData.slice(0, 10).reduce((sum, value) => sum + value, 0) / 10 / 255;
      
      // Clear canvas with fade effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Update hue and phase
      hue = (hue + 0.5) % 360;
      phase += 0.03;
      
      // Draw background glow based on bass
      if (bassLevel > 0.6) {
        const glow = ctx.createRadialGradient(
          canvas.clientWidth / 2, canvas.clientHeight / 2, 0,
          canvas.clientWidth / 2, canvas.clientHeight / 2, canvas.clientWidth / 2
        );
        glow.addColorStop(0, `hsla(${hue + 180}, 100%, 50%, ${(bassLevel - 0.6) * 0.3})`);
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      }
      
      // Smooth the waveform data
      for (let i = 0; i < bufferLength; i++) {
        prevWaveform[i] = prevWaveform[i] * 0.7 + dataArray[i] * 0.3;
      }
      
      // Draw multiple waveforms with different styles
      for (let j = 0; j < 3; j++) {
        const waveHue = (hue + j * 120) % 360;
        const yOffset = (j - 1) * 20; // Offset each waveform
        
        // Draw filled waveform
        if (j === 1) {
          ctx.beginPath();
          ctx.fillStyle = `hsla(${waveHue}, 100%, 50%, 0.2)`;
          
          const sliceWidth = canvas.clientWidth / bufferLength;
          let x = 0;
          
          // Draw bottom half of filled waveform
          ctx.moveTo(0, canvas.clientHeight / 2);
          
          for (let i = 0; i < bufferLength; i++) {
            const v = prevWaveform[i] / 128.0;
            const y = (v * canvas.clientHeight) / 2 + yOffset;
            
            ctx.lineTo(x, y);
            x += sliceWidth;
          }
          
          ctx.lineTo(canvas.clientWidth, canvas.clientHeight / 2);
          ctx.closePath();
          ctx.fill();
        }
        
        // Draw line waveform
        ctx.beginPath();
        ctx.strokeStyle = `hsla(${waveHue}, 100%, ${50 + j * 10}%, ${0.7 + j * 0.1})`;
        ctx.lineWidth = 2 + j * 0.5;
        
        if (j === 0) {
          // Add glow effect to main waveform
          ctx.shadowBlur = 10;
          ctx.shadowColor = `hsl(${waveHue}, 100%, 50%)`;
        } else {
          ctx.shadowBlur = 0;
        }
        
        const sliceWidth = canvas.clientWidth / bufferLength;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i++) {
          const v = prevWaveform[i] / 128.0;
          
          // Add some oscillation to the waveform
          const oscillation = j === 2 ? Math.sin(i * 0.01 + phase) * 10 : 0;
          const y = (v * canvas.clientHeight) / 2 + yOffset + oscillation;
          
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            // Use quadratic curves for smoother waveform
            const prevX = x - sliceWidth;
            const prevY = (prevWaveform[i-1] / 128.0) * (canvas.clientHeight / 2) + yOffset + 
                         (j === 2 ? Math.sin((i-1) * 0.01 + phase) * 10 : 0);
            
            ctx.quadraticCurveTo(
              prevX + sliceWidth / 2, 
              prevY, 
              x, 
              y
            );
          }
          
          x += sliceWidth;
        }
        
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      
      // Draw center line
      ctx.beginPath();
      ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 0.3)`;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.moveTo(0, canvas.clientHeight / 2);
      ctx.lineTo(canvas.clientWidth, canvas.clientHeight / 2);
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Draw frequency dots along the waveform
      if (bassLevel > 0.5) {
        for (let i = 0; i < frequencyData.length; i += 10) {
          const amplitude = frequencyData[i] / 255;
          if (amplitude < 0.3) continue;
          
          const x = (i / frequencyData.length) * canvas.clientWidth;
          const y = canvas.clientHeight / 2 + Math.sin(x * 0.05 + phase) * 30;
          
          ctx.beginPath();
          ctx.arc(x, y, amplitude * 5, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${(hue + i) % 360}, 100%, 50%, ${amplitude})`;
          ctx.fill();
        }
      }
      
      // Draw bass impact effect
      if (bassLevel > 0.75) {
        ctx.beginPath();
        ctx.strokeStyle = `hsla(${hue}, 100%, 50%, ${bassLevel - 0.75})`;
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      }
    };
    
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

export default WaveformVisualizer;