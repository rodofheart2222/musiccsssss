import React, { useRef, useEffect } from 'react';

interface CircleVisualizerProps {
  analyser: AnalyserNode | null;
}

const CircleVisualizer: React.FC<CircleVisualizerProps> = ({ analyser }) => {
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
    
    let rotation = 0;
    let hue = 0;
    
    const draw = () => {
      requestAnimationFrame(draw);
      
      analyser.getByteFrequencyData(dataArray);
      
      // Calculate average frequency and bass level
      const average = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength;
      const bassLevel = dataArray.slice(0, 10).reduce((sum, value) => sum + value, 0) / 10 / 255;
      
      // Clear canvas with fade effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Center of the canvas
      const centerX = canvas.clientWidth / 2;
      const centerY = canvas.clientHeight / 2;
      
      // Update rotation and hue
      rotation += 0.005 + (bassLevel * 0.01);
      hue = (hue + 0.5) % 360;
      
      // Draw multiple circles with rotation
      for (let j = 1; j <= 5; j++) { // Increased number of circles
        const circleHue = (hue + j * 30) % 360;
        const circleRotation = rotation * (j % 2 === 0 ? -1 : 1); // Alternate rotation direction
        
        ctx.beginPath();
        ctx.strokeStyle = `hsla(${circleHue}, 100%, 50%, 0.7)`;
        ctx.lineWidth = 2;
        
        // Draw points around a circle
        for (let i = 0; i < bufferLength; i += 2) { // Skip some points for performance
          if (i % (j + 2) !== 0) continue; // Different pattern for each circle
          
          const amplitude = dataArray[i] / 255;
          const radius = (amplitude * canvas.clientHeight / 3) + (j * 20);
          const angle = (i / bufferLength) * Math.PI * 2 + circleRotation;
          
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          
          if (i === 0 || i % (j + 2) !== 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        
        ctx.closePath();
        ctx.stroke();
        
        // Add glow effect
        if (j === 1 || j === 3) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = `hsl(${circleHue}, 100%, 50%)`;
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }
      
      // Draw center circle with pulsing effect
      ctx.beginPath();
      const avgAmplitude = average / 255;
      const pulseEffect = Math.sin(Date.now() * 0.003) * 5;
      const centerRadius = Math.max(1, avgAmplitude * 30 + pulseEffect); // Ensure radius is at least 1
      
      // Create gradient with multiple color stops
      const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, centerRadius);
      gradient.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.9)`);
      gradient.addColorStop(0.5, `hsla(${hue + 60}, 100%, 60%, 0.7)`);
      gradient.addColorStop(1, `hsla(${hue + 120}, 100%, 50%, 0.5)`);
      
      ctx.arc(centerX, centerY, centerRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Add glow effect to center circle
      ctx.shadowBlur = 20;
      ctx.shadowColor = `hsl(${hue}, 100%, 50%)`;
      ctx.fill();
      ctx.shadowBlur = 0;
      
      // Draw frequency dots around the circle
      for (let i = 0; i < bufferLength; i += 8) {
        const amplitude = dataArray[i] / 255;
        if (amplitude < 0.1) continue; // Skip low amplitude dots
        
        const angle = (i / bufferLength) * Math.PI * 2 + rotation;
        const radius = 100 + amplitude * 100;
        
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        const dotSize = amplitude * 5 + 1;
        
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${(hue + i) % 360}, 100%, 50%, ${amplitude})`;
        ctx.fill();
      }
      
      // Draw bass impact ring
      if (bassLevel > 0.6) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, 150 + bassLevel * 100, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${hue + 180}, 100%, 50%, ${bassLevel - 0.6})`;
        ctx.lineWidth = 5 * bassLevel;
        ctx.stroke();
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

export default CircleVisualizer;