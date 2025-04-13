import React, { useRef, useEffect } from 'react';

interface FrequencyBarsProps {
  analyser: AnalyserNode | null;
}

const FrequencyBars: React.FC<FrequencyBarsProps> = ({ analyser }) => {
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
    
    // Create an array to store the previous bar heights for smooth transitions
    const prevBarHeights = new Array(bufferLength).fill(0);
    let hue = 0;
    
    const draw = () => {
      requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);
      
      // Clear canvas with slight fade for trailing effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Update hue for color cycling
      hue = (hue + 0.5) % 360;
      
      // Calculate bass level for effects
      const bassLevel = dataArray.slice(0, 10).reduce((sum, value) => sum + value, 0) / 10 / 255;
      
      // Draw reflection surface
      ctx.fillStyle = 'rgba(20, 20, 30, 0.4)';
      ctx.fillRect(0, canvas.clientHeight / 2, canvas.clientWidth, canvas.clientHeight / 2);
      
      // Calculate bar width based on available frequencies
      const usableFrequencies = Math.min(bufferLength, 256); // Limit to visible range
      const barWidth = (canvas.clientWidth / usableFrequencies) * 1.5;
      const barSpacing = barWidth * 0.2;
      let x = 0;
      
      // Draw bars with smooth transitions
      for (let i = 0; i < usableFrequencies; i++) {
        // Apply smoothing to bar heights
        const targetHeight = (dataArray[i] / 255) * (canvas.clientHeight / 2);
        prevBarHeights[i] = prevBarHeights[i] * 0.8 + targetHeight * 0.2;
        const barHeight = prevBarHeights[i];
        
        // Skip very low frequencies for cleaner visualization
        if (i < 2) {
          x += barWidth + barSpacing;
          continue;
        }
        
        // Create gradient for each bar
        const barHue = (hue + i) % 360;
        const gradient = ctx.createLinearGradient(0, canvas.clientHeight / 2, 0, canvas.clientHeight / 2 - barHeight);
        gradient.addColorStop(0, `hsla(${barHue}, 100%, 50%, 0.8)`);
        gradient.addColorStop(0.5, `hsla(${barHue + 30}, 100%, 60%, 0.9)`);
        gradient.addColorStop(1, `hsla(${barHue + 60}, 100%, 70%, 1.0)`);
        
        // Draw main bar
        ctx.fillStyle = gradient;
        
        // Add glow effect on strong beats
        if (bassLevel > 0.7 && i < 20) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = `hsl(${barHue}, 100%, 50%)`;
        } else {
          ctx.shadowBlur = 0;
        }
        
        // Draw rounded top for bars
        const barX = x;
        const barY = canvas.clientHeight / 2 - barHeight;
        const barW = barWidth;
        
        // Draw bar with rounded top
        ctx.beginPath();
        ctx.moveTo(barX, canvas.clientHeight / 2);
        ctx.lineTo(barX, barY + barWidth / 2);
        ctx.arc(barX + barW / 2, barY + barW / 2, barW / 2, Math.PI, 0, true);
        ctx.lineTo(barX + barW, canvas.clientHeight / 2);
        ctx.closePath();
        ctx.fill();
        
        // Reset shadow for reflection
        ctx.shadowBlur = 0;
        
        // Draw reflection with reduced opacity
        const reflectionGradient = ctx.createLinearGradient(0, canvas.clientHeight / 2, 0, canvas.clientHeight / 2 + barHeight * 0.7);
        reflectionGradient.addColorStop(0, `hsla(${barHue}, 100%, 50%, 0.5)`);
        reflectionGradient.addColorStop(1, `hsla(${barHue + 30}, 100%, 60%, 0)`);
        
        ctx.fillStyle = reflectionGradient;
        ctx.beginPath();
        ctx.moveTo(barX, canvas.clientHeight / 2);
        ctx.lineTo(barX, canvas.clientHeight / 2 + barHeight * 0.7);
        ctx.lineTo(barX + barW, canvas.clientHeight / 2 + barHeight * 0.7);
        ctx.lineTo(barX + barW, canvas.clientHeight / 2);
        ctx.closePath();
        ctx.fill();
        
        x += barWidth + barSpacing;
      }
      
      // Draw horizontal line at the middle
      ctx.beginPath();
      ctx.strokeStyle = `hsla(${hue}, 100%, 70%, ${0.3 + bassLevel * 0.5})`;
      ctx.lineWidth = 2;
      ctx.moveTo(0, canvas.clientHeight / 2);
      ctx.lineTo(canvas.clientWidth, canvas.clientHeight / 2);
      ctx.stroke();
      
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

export default FrequencyBars;